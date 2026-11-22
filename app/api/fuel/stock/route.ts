import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLog,
  equipment,
  fiscalCreditNotes,
  fuelConvoySequences,
  fuelConvoys,
  fuelEntries,
  fuelStockMovements,
  masterData,
  suppliers,
} from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isComboio = (row: { equipmentType?: string | null; description?: string | null }) =>
  /COMBOIO/i.test(`${row.equipmentType || ""} ${row.description || ""}`);

async function nextConvoyNumber(companyId: string) {
  const [sequence] = await getDb().insert(fuelConvoySequences)
    .values({ companyId, lastNumber: 1 })
    .onConflictDoUpdate({
      target: fuelConvoySequences.companyId,
      set: { lastNumber: sql`${fuelConvoySequences.lastNumber} + 1` },
    })
    .returning({ lastNumber: fuelConvoySequences.lastNumber });
  return String(sequence?.lastNumber || 1).padStart(4, "0");
}

async function createOrGetConvoy(input: {
  companyId: string; equipmentId: string; maintenanceLocationId?: string | null;
  maintenanceLocation?: string | null; costCenter?: string | null; supplierId?: string | null;
  capacityMilli?: number; openingBalanceMilli?: number; userId: string;
}) {
  const db = getDb();
  const [existing] = await db.select().from(fuelConvoys)
    .where(and(eq(fuelConvoys.companyId, input.companyId), eq(fuelConvoys.equipmentId, input.equipmentId))).limit(1);
  if (existing) return existing;
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(), companyId: input.companyId, equipmentId: input.equipmentId,
    convoyNumber: await nextConvoyNumber(input.companyId),
    maintenanceLocationId: input.maintenanceLocationId || null,
    maintenanceLocation: input.maintenanceLocation || null, costCenter: input.costCenter || null,
    supplierId: input.supplierId || null, capacityMilli: input.capacityMilli || 0,
    openingBalanceMilli: input.openingBalanceMilli || 0, status: "active" as const,
    createdBy: input.userId, createdAt: now, updatedAt: now,
  };
  try {
    await db.insert(fuelConvoys).values(record);
    return record;
  } catch {
    const [concurrent] = await db.select().from(fuelConvoys)
      .where(and(eq(fuelConvoys.companyId, input.companyId), eq(fuelConvoys.equipmentId, input.equipmentId))).limit(1);
    if (concurrent) return concurrent;
    throw new Error("Não foi possível registrar o comboio. Tente novamente.");
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    await requirePermission(companyId, url.searchParams.get("mode") === "credits" ? "invoices" : "fuel", "view");
    const db = getDb();
    const [convoyRows, movementTotals, credits, history] = await Promise.all([
      db.select({
        id: fuelConvoys.id, equipmentId: fuelConvoys.equipmentId, convoyNumber: fuelConvoys.convoyNumber,
        maintenanceLocationId: fuelConvoys.maintenanceLocationId, maintenanceLocation: fuelConvoys.maintenanceLocation,
        costCenter: fuelConvoys.costCenter, supplierId: fuelConvoys.supplierId, capacityMilli: fuelConvoys.capacityMilli,
        openingBalanceMilli: fuelConvoys.openingBalanceMilli, status: fuelConvoys.status,
        fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description,
        supplierName: suppliers.name,
      }).from(fuelConvoys)
        .innerJoin(equipment, eq(fuelConvoys.equipmentId, equipment.id))
        .leftJoin(suppliers, eq(fuelConvoys.supplierId, suppliers.id))
        .where(eq(fuelConvoys.companyId, companyId)).orderBy(fuelConvoys.convoyNumber),
      db.select({
        convoyId: fuelStockMovements.convoyId,
        deltaMilli: sql<number>`coalesce(sum(${fuelStockMovements.deltaMilli}), 0)`,
        valueCents: sql<number>`coalesce(sum(case when ${fuelStockMovements.movementType} = 'receipt' then ${fuelStockMovements.totalCents} when ${fuelStockMovements.movementType} = 'distribution' then -${fuelStockMovements.totalCents} else 0 end), 0)`,
      }).from(fuelStockMovements).where(eq(fuelStockMovements.companyId, companyId)).groupBy(fuelStockMovements.convoyId),
      db.select({
        id: fiscalCreditNotes.id, supplierId: fiscalCreditNotes.supplierId, supplierName: suppliers.name,
        creditNumber: fiscalCreditNotes.creditNumber, issueDate: fiscalCreditNotes.issueDate,
        originalCents: fiscalCreditNotes.originalCents, remainingCents: fiscalCreditNotes.remainingCents,
      }).from(fiscalCreditNotes).innerJoin(suppliers, eq(fiscalCreditNotes.supplierId, suppliers.id))
        .where(and(eq(fiscalCreditNotes.companyId, companyId), eq(fiscalCreditNotes.status, "available"))),
      db.select({
        id: fuelStockMovements.id, convoyId: fuelStockMovements.convoyId,
        convoyNumber: fuelConvoys.convoyNumber, movementType: fuelStockMovements.movementType,
        movementDate: fuelStockMovements.movementDate, quantityMilli: fuelStockMovements.quantityMilli,
        deltaMilli: fuelStockMovements.deltaMilli, totalCents: fuelStockMovements.totalCents,
        supplierName: suppliers.name, destinationEquipment: equipment.fleetNumber,
        observation: fuelStockMovements.observation,
      }).from(fuelStockMovements).innerJoin(fuelConvoys, eq(fuelStockMovements.convoyId, fuelConvoys.id))
        .leftJoin(suppliers, eq(fuelStockMovements.supplierId, suppliers.id))
        .leftJoin(equipment, eq(fuelStockMovements.destinationEquipmentId, equipment.id))
        .where(eq(fuelStockMovements.companyId, companyId)).orderBy(desc(fuelStockMovements.createdAt)).limit(200),
    ]);
    const totals = new Map(movementTotals.map((row) => [row.convoyId, row]));
    const convoys = convoyRows.map((row) => {
      const movement = totals.get(row.id);
      const balanceMilli = Math.max(0, row.openingBalanceMilli + Number(movement?.deltaMilli || 0));
      const percent = row.capacityMilli > 0 ? balanceMilli / row.capacityMilli * 100 : 0;
      return { ...row, balanceMilli, stockValueCents: Math.max(0, Number(movement?.valueCents || 0)), percent };
    });
    return Response.json({ convoys, credits, history });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      companyId?: string; action?: string; equipmentId?: string; maintenanceLocationId?: string;
      costCenter?: string; supplierId?: string; capacity?: number; openingBalance?: number;
      creditNumber?: string; issueDate?: string; originalAmount?: number; fiscalInvoiceId?: string;
      convoyId?: string; quantity?: number; movementDate?: string; destinationEquipmentId?: string;
      observation?: string; delta?: number; referenceKey?: string;
    };
    const companyId = body.companyId || "";
    const action = body.action || "";
    const db = getDb();

    if (action === "register-credit") {
      const access = await requirePermission(companyId, "invoices", "create");
      if (!body.supplierId || !body.creditNumber?.trim() || !isDate(body.issueDate) || !(Number(body.originalAmount) > 0))
        return Response.json({ error: "Fornecedor, número, data e valor original do crédito são obrigatórios." }, { status: 400 });
      const [supplier] = await db.select({ id: suppliers.id }).from(suppliers)
        .where(and(eq(suppliers.id, body.supplierId), eq(suppliers.companyId, companyId))).limit(1);
      if (!supplier) return Response.json({ error: "O fornecedor do crédito não pertence à empresa selecionada." }, { status: 400 });
      const credit = { id: crypto.randomUUID(), companyId, supplierId: supplier.id,
        fiscalInvoiceId: body.fiscalInvoiceId || null, creditNumber: body.creditNumber.trim(), issueDate: body.issueDate,
        originalCents: Math.round(Number(body.originalAmount) * 100), remainingCents: Math.round(Number(body.originalAmount) * 100),
        status: "available" as const, createdBy: access.user.userId, createdAt: new Date().toISOString() };
      try { await db.insert(fiscalCreditNotes).values(credit); }
      catch { return Response.json({ error: "Já existe um crédito com esse fornecedor, número e data." }, { status: 409 }); }
      return Response.json({ credit }, { status: 201 });
    }

    if (action === "configure-convoy") {
      const access = await requirePermission(companyId, "fuel", "update");
      if (!body.equipmentId || !body.maintenanceLocationId || !(Number(body.capacity) > 0) || Number(body.openingBalance || 0) < 0)
        return Response.json({ error: "Comboio, local e capacidade válida são obrigatórios." }, { status: 400 });
      const [asset] = await db.select().from(equipment).where(and(eq(equipment.id, body.equipmentId), eq(equipment.companyId, companyId))).limit(1);
      if (!asset || !isComboio(asset)) return Response.json({ error: "Selecione um equipamento cadastrado como comboio." }, { status: 400 });
      const [location] = await db.select().from(masterData).where(and(eq(masterData.id, body.maintenanceLocationId), eq(masterData.companyId, companyId), eq(masterData.type, "local_manutencao"), eq(masterData.active, true))).limit(1);
      if (!location) return Response.json({ error: "O local de manutenção não pertence à lista ativa da empresa." }, { status: 400 });
      const capacityMilli = Math.round(Number(body.capacity) * 1000), openingBalanceMilli = Math.round(Number(body.openingBalance || 0) * 1000);
      if (openingBalanceMilli > capacityMilli) return Response.json({ error: "O saldo inicial não pode superar a capacidade cadastrada." }, { status: 400 });
      const [existing] = await db.select().from(fuelConvoys).where(and(eq(fuelConvoys.companyId, companyId), eq(fuelConvoys.equipmentId, asset.id))).limit(1);
      if (existing) {
        const [movement] = await db.select({ id: fuelStockMovements.id }).from(fuelStockMovements).where(and(eq(fuelStockMovements.companyId, companyId), eq(fuelStockMovements.convoyId, existing.id))).limit(1);
        const updated = { ...existing, maintenanceLocationId: location.id, maintenanceLocation: location.name, costCenter: body.costCenter?.trim() || asset.costCenter || asset.projectName || null, supplierId: body.supplierId || null, capacityMilli, openingBalanceMilli: movement ? existing.openingBalanceMilli : openingBalanceMilli, updatedAt: new Date().toISOString() };
        await db.update(fuelConvoys).set(updated).where(and(eq(fuelConvoys.id, existing.id), eq(fuelConvoys.companyId, companyId)));
        return Response.json({ convoy: { ...updated, fleetNumber: asset.fleetNumber, plate: asset.plate, description: asset.description } });
      }
      const convoy = await createOrGetConvoy({ companyId, equipmentId: asset.id, maintenanceLocationId: location.id, maintenanceLocation: location.name, costCenter: body.costCenter?.trim() || asset.costCenter || asset.projectName || null, supplierId: body.supplierId || null, capacityMilli, openingBalanceMilli, userId: access.user.userId });
      return Response.json({ convoy }, { status: 201 });
    }

    if (action === "distribution" || action === "adjustment") {
      const access = await requirePermission(companyId, "fuel", action === "distribution" ? "create" : "update");
      if (!body.convoyId || !isDate(body.movementDate)) return Response.json({ error: "Comboio e data são obrigatórios." }, { status: 400 });
      const [convoy] = await db.select().from(fuelConvoys).where(and(eq(fuelConvoys.id, body.convoyId), eq(fuelConvoys.companyId, companyId), eq(fuelConvoys.status, "active"))).limit(1);
      if (!convoy) return Response.json({ error: "Comboio ativo não encontrado." }, { status: 404 });
      const [balanceRow] = await db.select({ value: sql<number>`coalesce(sum(${fuelStockMovements.deltaMilli}), 0)` }).from(fuelStockMovements).where(and(eq(fuelStockMovements.companyId, companyId), eq(fuelStockMovements.convoyId, convoy.id)));
      const balance = convoy.openingBalanceMilli + Number(balanceRow?.value || 0);
      const quantityMilli = Math.round(Math.abs(Number(body.quantity || body.delta || 0)) * 1000);
      if (!quantityMilli) return Response.json({ error: "Informe uma quantidade maior que zero." }, { status: 400 });
      const deltaMilli = action === "distribution" ? -quantityMilli : Math.round(Number(body.delta) * 1000);
      if (action === "adjustment" && !body.observation?.trim()) return Response.json({ error: "Informe o motivo do ajuste autorizado." }, { status: 400 });
      if (balance + deltaMilli < 0) return Response.json({ error: "A movimentação supera o saldo disponível do comboio." }, { status: 409 });
      if (convoy.capacityMilli > 0 && balance + deltaMilli > convoy.capacityMilli) return Response.json({ error: "A movimentação supera a capacidade cadastrada do comboio." }, { status: 409 });
      const movementId = crypto.randomUUID(), now = new Date().toISOString();
      let destination: typeof equipment.$inferSelect | undefined;
      let fuelEntry: typeof fuelEntries.$inferInsert | undefined;
      if (action === "distribution") {
        if (!body.destinationEquipmentId) return Response.json({ error: "Selecione o equipamento de destino." }, { status: 400 });
        [destination] = await db.select().from(equipment).where(and(eq(equipment.id, body.destinationEquipmentId), eq(equipment.companyId, companyId))).limit(1);
        if (!destination) return Response.json({ error: "Equipamento de destino não pertence à empresa." }, { status: 400 });
        const [valueRow] = await db.select({ value: sql<number>`coalesce(sum(case when ${fuelStockMovements.movementType} = 'receipt' then ${fuelStockMovements.totalCents} when ${fuelStockMovements.movementType} = 'distribution' then -${fuelStockMovements.totalCents} else 0 end), 0)` }).from(fuelStockMovements).where(and(eq(fuelStockMovements.companyId, companyId), eq(fuelStockMovements.convoyId, convoy.id)));
        const remainingValue = Math.max(0, Number(valueRow?.value || 0));
        const unitPriceMilli = balance > 0 ? Math.round(remainingValue * 10000 / balance) : 0;
        const totalCents = Math.round(quantityMilli * unitPriceMilli / 10000);
        const [sequence] = await db.select({ value: sql<number>`coalesce(max(${fuelEntries.systemNumber}), 0)` }).from(fuelEntries).where(eq(fuelEntries.companyId, companyId));
        fuelEntry = { id: crypto.randomUUID(), companyId, equipmentId: destination.id, systemNumber: Number(sequence?.value || 0) + 1, entryDate: body.movementDate, rn: null, station: `Comboio ${convoy.convoyNumber}`, maintenanceLocation: convoy.maintenanceLocation, driverName: null, product: "COMBUSTÍVEL", productCode: null, litersMilli: quantityMilli, unitPriceMilli, totalCents, kilometer: null, hourmeter: null, status: "confirmed", source: "manual", importFileName: null, entryTime: null, requisitionCoupon: null, supplierId: convoy.supplierId, invoiceId: null, fuelConvoyId: convoy.id, costCenter: convoy.costCenter, receiptObjectKey: null, originalExternalId: null, sourceFingerprint: body.referenceKey || null, transactionType: "distribution", createdBy: access.user.userId, createdAt: now };
      }
      const movement = { id: movementId, companyId, convoyId: convoy.id, movementType: action === "distribution" ? "distribution" as const : "adjustment" as const, movementDate: body.movementDate, quantityMilli, deltaMilli, unitPriceMilli: fuelEntry?.unitPriceMilli || 0, totalCents: fuelEntry?.totalCents || 0, supplierId: fuelEntry?.supplierId || convoy.supplierId, invoiceId: null, invoiceItemId: null, fuelEntryId: fuelEntry?.id || null, destinationEquipmentId: destination?.id || null, maintenanceLocation: convoy.maintenanceLocation, costCenter: convoy.costCenter, referenceKey: body.referenceKey?.trim() || null, observation: body.observation?.trim() || null, createdBy: access.user.userId, createdAt: now };
      try {
        await db.batch([
          db.insert(fuelStockMovements).values(movement),
          ...(fuelEntry ? [db.insert(fuelEntries).values(fuelEntry)] : []),
        ] as [any, ...any[]]);
      } catch (error) {
        if (body.referenceKey) return Response.json({ error: "Esta movimentação já foi registrada." }, { status: 409 });
        throw error;
      }
      await db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: action === "distribution" ? "fuel.convoy.distribution" : "fuel.convoy.adjustment", entity: "fuel_convoy", entityId: convoy.id, createdAt: now });
      return Response.json({ movement, fuelEntry }, { status: 201 });
    }

    return Response.json({ error: "Ação de estoque inválida." }, { status: 400 });
  } catch (error) { return apiError(error); }
}
