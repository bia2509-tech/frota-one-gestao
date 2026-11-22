import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLog, equipment, fiscalCreditNotes, fiscalInvoices, fuelConvoySequences, fuelConvoys,
  fuelCreditUsages, fuelEntries, fuelStockMovements, masterData, suppliers,
} from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { fuelEntryFingerprint } from "@/lib/fuel-domain";

type FuelInput = {
  entryDate?: string; entryTime?: string; rn?: string; requisitionCoupon?: string;
  fleetNumber?: string; plate?: string; station?: string; supplierId?: string;
  maintenanceLocation?: string; maintenanceLocationId?: string; costCenter?: string;
  driverName?: string; product?: string; productCode?: string; liters?: number;
  unitPrice?: number; total?: number; kilometer?: number | null; hourmeter?: number | null;
  invoiceId?: string; creditNoteId?: string; creditAmount?: number; receiptObjectKey?: string;
  originalExternalId?: string; externalIdentifier?: string;
};

function normalizedPlate(value = "") { return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(); }
function isConvoy(row: { equipmentType?: string | null; description?: string | null }) { return /COMBOIO/i.test(`${row.equipmentType || ""} ${row.description || ""}`); }

async function resolveEquipment(companyId: string, row: FuelInput) {
  const fleet = row.fleetNumber?.trim();
  const plate = normalizedPlate(row.plate);
  if (!fleet && !plate) throw new Error("Informe a frota/ID ou a placa.");
  const candidates = await getDb().select().from(equipment).where(and(
    eq(equipment.companyId, companyId),
    or(fleet ? eq(equipment.fleetNumber, fleet) : undefined, plate ? eq(equipment.plate, plate) : undefined),
  ));
  const byFleet = fleet && candidates.find((item) => item.fleetNumber === fleet);
  const byPlate = plate && candidates.find((item) => normalizedPlate(item.plate || "") === plate);
  if (fleet && plate && byFleet?.id !== byPlate?.id) throw new Error(`Frota ${fleet} e placa ${row.plate} pertencem a equipamentos diferentes.`);
  const match = byFleet || byPlate;
  if (!match) throw new Error(`Equipamento não encontrado: ${fleet || row.plate}.`);
  return match;
}

async function resolveSupplier(companyId: string, row: FuelInput, required: boolean) {
  const db = getDb();
  let supplierId = row.supplierId?.trim() || "";
  if (!supplierId && row.station?.trim()) {
    const [supplier] = await db.select({ id: suppliers.id }).from(suppliers)
      .where(and(eq(suppliers.companyId, companyId), eq(suppliers.name, row.station.trim()))).limit(1);
    supplierId = supplier?.id || "";
  }
  if (!supplierId) {
    if (required) throw new Error("Selecione um fornecedor cadastrado.");
    return null;
  }
  const [supplier] = await db.select().from(suppliers)
    .where(and(eq(suppliers.companyId, companyId), eq(suppliers.id, supplierId), eq(suppliers.active, true))).limit(1);
  if (!supplier) throw new Error("Fornecedor não encontrado ou inativo para esta empresa.");
  return supplier;
}

async function resolveLocation(companyId: string, row: FuelInput, required: boolean) {
  const id = row.maintenanceLocationId?.trim() || "";
  const name = row.maintenanceLocation?.trim() || "";
  if (!id && !name) {
    if (required) throw new Error("Local de manutenção é obrigatório.");
    return null;
  }
  const [location] = await getDb().select().from(masterData).where(and(
    eq(masterData.companyId, companyId), eq(masterData.type, "local_manutencao"), eq(masterData.active, true),
    id ? eq(masterData.id, id) : eq(masterData.name, name),
  )).limit(1);
  if (!location) throw new Error("Selecione um local de manutenção cadastrado e ativo.");
  return location;
}

async function ensureConvoy(companyId: string, asset: typeof equipment.$inferSelect, userId: string, location: typeof masterData.$inferSelect | null, costCenter: string | null, supplierId: string | null) {
  const db = getDb();
  const [existing] = await db.select().from(fuelConvoys).where(and(eq(fuelConvoys.companyId, companyId), eq(fuelConvoys.equipmentId, asset.id))).limit(1);
  if (existing) return existing;
  const [sequence] = await db.insert(fuelConvoySequences).values({ companyId, lastNumber: 1 })
    .onConflictDoUpdate({ target: fuelConvoySequences.companyId, set: { lastNumber: sql`${fuelConvoySequences.lastNumber} + 1` } })
    .returning({ lastNumber: fuelConvoySequences.lastNumber });
  const now = new Date().toISOString();
  const convoy = {
    id: crypto.randomUUID(), companyId, equipmentId: asset.id,
    convoyNumber: String(sequence?.lastNumber || 1).padStart(4, "0"),
    maintenanceLocationId: location?.id || null, maintenanceLocation: location?.name || null,
    costCenter: costCenter || asset.costCenter || asset.projectName || null,
    supplierId, capacityMilli: 0, openingBalanceMilli: 0, status: "active" as const,
    createdBy: userId, createdAt: now, updatedAt: now,
  };
  try { await db.insert(fuelConvoys).values(convoy); return convoy; }
  catch {
    const [concurrent] = await db.select().from(fuelConvoys).where(and(eq(fuelConvoys.companyId, companyId), eq(fuelConvoys.equipmentId, asset.id))).limit(1);
    if (concurrent) return concurrent;
    throw new Error("Não foi possível gerar a identificação do comboio. Tente novamente.");
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "";
    const from = url.searchParams.get("from"), to = url.searchParams.get("to");
    const supplierId = url.searchParams.get("supplierId"), convoyId = url.searchParams.get("convoyId");
    const equipmentId = url.searchParams.get("equipmentId");
    await requirePermission(companyId, "fuel", "view");
    const conditions = [eq(fuelEntries.companyId, companyId)];
    if (from) conditions.push(gte(fuelEntries.entryDate, from));
    if (to) conditions.push(lte(fuelEntries.entryDate, to));
    if (supplierId) conditions.push(eq(fuelEntries.supplierId, supplierId));
    if (convoyId) conditions.push(eq(fuelEntries.fuelConvoyId, convoyId));
    if (equipmentId) conditions.push(eq(fuelEntries.equipmentId, equipmentId));
    const [rows, usageRows] = await Promise.all([
      getDb().select({
        id: fuelEntries.id, systemNumber: fuelEntries.systemNumber, entryDate: fuelEntries.entryDate,
        entryTime: fuelEntries.entryTime, rn: fuelEntries.rn, requisitionCoupon: fuelEntries.requisitionCoupon,
        fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description,
        station: fuelEntries.station, supplierId: fuelEntries.supplierId, supplierName: suppliers.name,
        maintenanceLocation: fuelEntries.maintenanceLocation, costCenter: fuelEntries.costCenter,
        driverName: fuelEntries.driverName, product: fuelEntries.product, productCode: fuelEntries.productCode,
        litersMilli: fuelEntries.litersMilli, unitPriceMilli: fuelEntries.unitPriceMilli, totalCents: fuelEntries.totalCents,
        kilometer: fuelEntries.kilometer, hourmeter: fuelEntries.hourmeter, status: fuelEntries.status,
        source: fuelEntries.source, transactionType: fuelEntries.transactionType, fuelConvoyId: fuelEntries.fuelConvoyId,
        invoiceId: fuelEntries.invoiceId, receiptObjectKey: fuelEntries.receiptObjectKey,
        originalExternalId: fuelEntries.originalExternalId,
      }).from(fuelEntries).innerJoin(equipment, eq(fuelEntries.equipmentId, equipment.id))
        .leftJoin(suppliers, eq(fuelEntries.supplierId, suppliers.id))
        .where(and(...conditions)).orderBy(asc(fuelEntries.systemNumber), asc(fuelEntries.createdAt)),
      getDb().select({ fuelEntryId: fuelCreditUsages.fuelEntryId, amountCents: sql<number>`coalesce(sum(${fuelCreditUsages.amountCents}),0)` })
        .from(fuelCreditUsages).where(eq(fuelCreditUsages.companyId, companyId)).groupBy(fuelCreditUsages.fuelEntryId),
    ]);
    const usageMap = new Map(usageRows.map((row) => [row.fuelEntryId, row.amountCents]));
    return Response.json({ entries: rows.map((row) => ({ ...row, creditUsedCents: Number(usageMap.get(row.id) || 0) })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; source?: "manual" | "spreadsheet"; fileName?: string; strict?: boolean; entries?: FuelInput[]; idempotencyKey?: string } & FuelInput;
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "fuel", "create");
    const inputs = body.entries || [body];
    if (!inputs.length) return Response.json({ error: "A planilha não possui lançamentos." }, { status: 400 });
    const db = getDb();
    const prepared: Array<{ entry: typeof fuelEntries.$inferInsert; creditNoteId: string | null; creditAmountCents: number; stockReceipt: boolean }> = [];
    const errors: { row: number; error: string }[] = [];
    const [sequence] = await db.select({ value: sql<number>`coalesce(max(${fuelEntries.systemNumber}), 0)` }).from(fuelEntries).where(eq(fuelEntries.companyId, companyId));
    let nextSystemNumber = Number(sequence?.value || 0) + 1;
    const batchRns = new Set<string>(), batchFingerprints = new Set<string>();
    for (let index = 0; index < inputs.length; index++) {
      const input = inputs[index];
      try {
        if (!input.entryDate || !input.product || !(Number(input.liters) > 0) || !(Number(input.unitPrice) > 0)) throw new Error("Data, produto, litros e preço por litro são obrigatórios.");
        const required = body.strict === true;
        const location = await resolveLocation(companyId, input, required);
        const supplier = await resolveSupplier(companyId, input, required);
        const matched = await resolveEquipment(companyId, input);
        const litersMilli = Math.round(Number(input.liters) * 1000);
        const unitPriceMilli = Math.round(Number(input.unitPrice) * 1000);
        const calculated = Number(input.liters) * Number(input.unitPrice), total = Number(input.total) || calculated;
        if (Math.abs(total - calculated) > 0.05) throw new Error("Valor total diverge de litros vezes preço por litro.");
        const totalCents = Math.round(total * 100);
        const requisition = input.requisitionCoupon?.trim() || input.rn?.trim() || "";
        if (requisition) {
          if (batchRns.has(requisition)) throw new Error(`A requisição/cupom ${requisition} está repetida nesta importação.`);
          const [duplicate] = await db.select({ systemNumber: fuelEntries.systemNumber }).from(fuelEntries)
            .where(and(eq(fuelEntries.companyId, companyId), eq(fuelEntries.rn, requisition))).limit(1);
          if (duplicate) throw new Error(`A requisição/cupom ${requisition} já foi lançada no registro ${String(duplicate.systemNumber || 0).padStart(6, "0")}.`);
          batchRns.add(requisition);
        }
        const fingerprintRaw = fuelEntryFingerprint({ date: input.entryDate, equipmentId: matched.id, supplierId: supplier?.id || "", requisitionCoupon: requisition, litersMilli, totalCents });
        const fingerprint = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprintRaw)).then((buffer) => Array.from(new Uint8Array(buffer)).map((x) => x.toString(16).padStart(2, "0")).join(""));
        if (batchFingerprints.has(fingerprint)) throw new Error("Lançamento repetido nesta planilha.");
        const [duplicateFingerprint] = await db.select({ id: fuelEntries.id }).from(fuelEntries).where(and(eq(fuelEntries.companyId, companyId), eq(fuelEntries.sourceFingerprint, fingerprint))).limit(1);
        if (duplicateFingerprint) throw new Error("Possível duplicidade: mesma data, equipamento, fornecedor, requisição/cupom, litros e valor já lançados.");
        batchFingerprints.add(fingerprint);

        let convoyId: string | null = null;
        let stockReceipt = false;
        if (isConvoy(matched)) {
          const convoy = await ensureConvoy(companyId, matched, access.user.userId, location, input.costCenter?.trim() || null, supplier?.id || null);
          convoyId = convoy.id; stockReceipt = true;
          if (!(convoy.capacityMilli > 0)) throw new Error(`Configure a capacidade do comboio ${convoy.convoyNumber} antes de registrar entradas de estoque.`);
        }
        if (body.strict && !location) throw new Error("Local de manutenção é obrigatório.");
        if (input.invoiceId) {
          const [invoice] = await db.select({ id: fiscalInvoices.id, supplierId: fiscalInvoices.supplierId }).from(fiscalInvoices)
            .where(and(eq(fiscalInvoices.id, input.invoiceId), eq(fiscalInvoices.companyId, companyId))).limit(1);
          if (!invoice || (supplier && invoice.supplierId !== supplier.id)) throw new Error("A nota fiscal não pertence ao fornecedor selecionado.");
        }
        let creditNoteId: string | null = null, creditAmountCents = 0;
        if (input.creditNoteId) {
          if (!supplier) throw new Error("Selecione o fornecedor antes de usar uma nota de crédito.");
          creditAmountCents = Math.round(Number(input.creditAmount || 0) * 100);
          const [credit] = await db.select().from(fiscalCreditNotes).where(and(
            eq(fiscalCreditNotes.id, input.creditNoteId), eq(fiscalCreditNotes.companyId, companyId),
            eq(fiscalCreditNotes.supplierId, supplier.id), eq(fiscalCreditNotes.status, "available"),
          )).limit(1);
          if (!credit) throw new Error("A nota de crédito não está disponível para este fornecedor.");
          if (!(creditAmountCents > 0) || creditAmountCents > credit.remainingCents || creditAmountCents > totalCents) throw new Error("O valor do crédito deve ser positivo, não pode superar o saldo disponível nem o total deste abastecimento.");
          creditNoteId = credit.id;
        }
        const now = new Date().toISOString();
        const entry: typeof fuelEntries.$inferInsert = {
          id: crypto.randomUUID(), companyId, equipmentId: matched.id, systemNumber: nextSystemNumber++,
          entryDate: input.entryDate, rn: requisition || null, station: supplier?.name || input.station?.trim() || null,
          maintenanceLocation: location?.name || input.maintenanceLocation?.trim() || null,
          driverName: input.driverName?.trim() || matched.operatorName || null,
          product: input.product.trim(), productCode: input.productCode?.trim() || null,
          litersMilli, unitPriceMilli, totalCents, kilometer: input.kilometer ?? null, hourmeter: input.hourmeter ?? null,
          source: body.source || "manual", status: "confirmed", importFileName: body.fileName?.trim() || null,
          entryTime: input.entryTime?.trim() || null, requisitionCoupon: requisition || null,
          supplierId: supplier?.id || null, invoiceId: input.invoiceId || null, fuelConvoyId: convoyId,
          costCenter: input.costCenter?.trim() || matched.costCenter || matched.projectName || null,
          receiptObjectKey: input.receiptObjectKey || null,
          originalExternalId: input.originalExternalId?.trim() || input.externalIdentifier?.trim() || null,
          sourceFingerprint: fingerprint, transactionType: stockReceipt ? "stock_receipt" : "consumption",
          createdBy: access.user.userId, createdAt: now,
        };
        prepared.push({ entry, creditNoteId, creditAmountCents, stockReceipt });
      } catch (error) { errors.push({ row: index + 2, error: error instanceof Error ? error.message : "Linha inválida." }); }
    }
    if (errors.length) return Response.json({ error: inputs.length === 1 ? errors[0].error : "Importação não realizada. Corrija as linhas indicadas.", errors, imported: 0, rejected: errors.length, duplicates: errors.filter((row) => /duplicad|repetid/i.test(row.error)).length }, { status: 400 });
    const statements = prepared.flatMap(({ entry, creditNoteId, creditAmountCents, stockReceipt }) => [
      db.insert(fuelEntries).values(entry),
      ...(stockReceipt && entry.fuelConvoyId ? [db.insert(fuelStockMovements).values({ id: crypto.randomUUID(), companyId, convoyId: entry.fuelConvoyId, movementType: "receipt", movementDate: entry.entryDate, quantityMilli: entry.litersMilli, deltaMilli: entry.litersMilli, unitPriceMilli: entry.unitPriceMilli, totalCents: entry.totalCents, supplierId: entry.supplierId || null, invoiceId: entry.invoiceId || null, invoiceItemId: null, fuelEntryId: entry.id, destinationEquipmentId: null, maintenanceLocation: entry.maintenanceLocation || null, costCenter: entry.costCenter || null, referenceKey: `fuel-entry:${entry.id}`, observation: null, createdBy: access.user.userId, createdAt: entry.createdAt })] : []),
      ...(creditNoteId ? [db.insert(fuelCreditUsages).values({ id: crypto.randomUUID(), companyId, creditNoteId, fuelEntryId: entry.id, amountCents: creditAmountCents, idempotencyKey: body.idempotencyKey ? `${body.idempotencyKey}:${entry.id}` : entry.id, createdBy: access.user.userId, createdAt: entry.createdAt })] : []),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "fuel.created", entity: "fuel_entry", entityId: entry.id, createdAt: entry.createdAt }),
    ]);
    try { await db.batch(statements as [any, ...any[]]); }
    catch (error) { return Response.json({ error: error instanceof Error && /credito/i.test(error.message) ? "Saldo do crédito alterado. Atualize a tela e tente novamente." : "Não foi possível gravar o abastecimento. Verifique duplicidade, capacidade e saldo do comboio.", imported: 0 }, { status: 409 }); }
    return Response.json({ imported: prepared.length, rejected: 0, duplicates: 0, entries: prepared.map((row) => row.entry) }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as FuelInput & { companyId?: string; id?: string };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "fuel", "update");
    const db = getDb();
    const [current] = await db.select().from(fuelEntries).where(and(eq(fuelEntries.id, body.id || ""), eq(fuelEntries.companyId, companyId))).limit(1);
    if (!current) return Response.json({ error: "Abastecimento não encontrado." }, { status: 404 });
    if (current.status !== "draft") return Response.json({ error: "Solicite a reabertura antes de alterar este abastecimento." }, { status: 409 });
    if (!body.entryDate || !body.product || !(Number(body.liters) > 0) || !(Number(body.unitPrice) > 0)) return Response.json({ error: "Data, produto, litros e preço por litro são obrigatórios." }, { status: 400 });
    const requisition = body.requisitionCoupon?.trim() || body.rn?.trim() || "";
    if (requisition) {
      const [duplicate] = await db.select({ id: fuelEntries.id, systemNumber: fuelEntries.systemNumber }).from(fuelEntries).where(and(eq(fuelEntries.companyId, companyId), eq(fuelEntries.rn, requisition))).limit(1);
      if (duplicate && duplicate.id !== current.id) return Response.json({ error: `A requisição/cupom ${requisition} já foi lançada no registro ${String(duplicate.systemNumber || 0).padStart(6, "0")}.` }, { status: 409 });
    }
    const [location] = await db.select().from(masterData).where(and(eq(masterData.companyId, companyId), eq(masterData.type, "local_manutencao"), eq(masterData.active, true), body.maintenanceLocationId ? eq(masterData.id, body.maintenanceLocationId) : eq(masterData.name, body.maintenanceLocation || ""))).limit(1);
    if (!location) return Response.json({ error: "Local de manutenção é obrigatório e deve estar cadastrado." }, { status: 400 });
    const supplier = await resolveSupplier(companyId, body, true), matched = await resolveEquipment(companyId, body);
    const totalCents = Math.round(Number(body.liters) * Number(body.unitPrice) * 100);
    await db.update(fuelEntries).set({ equipmentId: matched.id, entryDate: body.entryDate, entryTime: body.entryTime || null, rn: requisition || null, requisitionCoupon: requisition || null, supplierId: supplier?.id || null, station: supplier?.name || null, maintenanceLocation: location.name, costCenter: body.costCenter?.trim() || matched.costCenter || matched.projectName || null, driverName: body.driverName?.trim() || null, product: body.product.trim(), productCode: body.productCode?.trim() || null, litersMilli: Math.round(Number(body.liters) * 1000), unitPriceMilli: Math.round(Number(body.unitPrice) * 1000), totalCents, kilometer: body.kilometer ?? null, hourmeter: body.hourmeter ?? null, status: "confirmed" }).where(eq(fuelEntries.id, current.id));
    await db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "fuel.reopened-entry-confirmed", entity: "fuel_entry", entityId: current.id, createdAt: new Date().toISOString() });
    return Response.json({ status: "confirmed" });
  } catch (error) { return apiError(error); }
}
