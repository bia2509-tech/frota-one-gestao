import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, contractDocuments, contractEquipmentItems, contracts, equipment, masterData, measurements, suppliers } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { calculateEquipmentCommitmentCents } from "@/lib/contracts-finance";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", contractId = url.searchParams.get("contractId") || "";
    await requirePermission(companyId, "contracts", "view");
    const db = getDb();
    if (contractId) {
      const [contract] = await db.select().from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId))).limit(1);
      if (!contract) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });
      const [items, history, documents] = await Promise.all([
        db.select({ id: contractEquipmentItems.id, equipmentId: contractEquipmentItems.equipmentId, startsAt: contractEquipmentItems.startsAt, endsAt: contractEquipmentItems.endsAt, billingMode: contractEquipmentItems.billingMode, monthlyEquipmentCents: contractEquipmentItems.monthlyEquipmentCents, monthlyOperatorCents: contractEquipmentItems.monthlyOperatorCents, mobilizationCents: contractEquipmentItems.mobilizationCents, demobilizationCents: contractEquipmentItems.demobilizationCents, quantityMilli: contractEquipmentItems.quantityMilli, status: contractEquipmentItems.status, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description, equipmentType: equipment.equipmentType, brand: equipment.brand, model: equipment.model }).from(contractEquipmentItems).innerJoin(equipment, eq(contractEquipmentItems.equipmentId, equipment.id)).where(and(eq(contractEquipmentItems.companyId, companyId), eq(contractEquipmentItems.contractId, contractId))),
        db.select().from(auditLog).where(and(eq(auditLog.companyId, companyId), eq(auditLog.entity, "contract"), eq(auditLog.entityId, contractId))).orderBy(desc(auditLog.createdAt)).limit(50),
        db.select().from(contractDocuments).where(and(eq(contractDocuments.companyId, companyId), eq(contractDocuments.contractId, contractId))).orderBy(desc(contractDocuments.uploadedAt)),
      ]);
      return Response.json({ contract, items, history, documents });
    }
    if (url.searchParams.get("options") === "1") {
      const [supplierRows, supplierMasterRows, equipmentRows, contractRows] = await Promise.all([
        db.select().from(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.active, true))),
        db.select({ id: masterData.id, name: masterData.name }).from(masterData).where(and(eq(masterData.companyId, companyId), eq(masterData.type, "fornecedor"), eq(masterData.active, true))),
        db.select().from(equipment).where(eq(equipment.companyId, companyId)),
        db.select({ id: contracts.id, number: contracts.number, object: contracts.object, supplierName: contracts.supplierName }).from(contracts).where(and(eq(contracts.companyId, companyId), eq(contracts.documentKind, "initial"))).orderBy(desc(contracts.startsAt)),
      ]);
      const supplierMap = new Map([...supplierRows, ...supplierMasterRows].map((row) => [row.name.toLowerCase(), row]));
      return Response.json({ suppliers: [...supplierMap.values()], equipment: equipmentRows, initialContracts: contractRows });
    }
    const rows = await db
      .select({
        id: contracts.id,
        number: contracts.number,
        object: contracts.object,
        contractType: contracts.contractType,
        documentKind: contracts.documentKind,
        parentContractId: contracts.parentContractId,
        amendmentNumber: contracts.amendmentNumber,
        supplierName: contracts.supplierName,
        projectName: contracts.projectName,
        startsAt: contracts.startsAt,
        endsAt: contracts.endsAt,
        totalCents: contracts.totalCents,
        monthlyRentCents: contracts.monthlyRentCents,
        monthlyLaborCents: contracts.monthlyLaborCents,
        monthlyAmountCents: contracts.monthlyAmountCents,
        status: contracts.status,
        formalizationStatus: contracts.formalizationStatus,
        formalizationNote: contracts.formalizationNote,
        supplierId: contracts.supplierId,
        measuredCents: sql<number>`coalesce(sum(case when ${measurements.status} = 'approved' then ${measurements.amountCents} else 0 end), 0)`,
        equipmentCount: sql<number>`(select count(*) from contract_equipment_items cei where cei.contract_id = ${contracts.id})`,
      })
      .from(contracts)
      .leftJoin(measurements, eq(measurements.contractId, contracts.id))
      .where(eq(contracts.companyId, companyId))
      .groupBy(contracts.id);
    return Response.json({
      contracts: rows.map((r) => ({
        ...r,
        balanceCents: r.totalCents - Number(r.measuredCents),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

async function recalculateContract(companyId: string, contractId: string) {
  const db = getDb();
  const allItems = await db.select().from(contractEquipmentItems).where(and(eq(contractEquipmentItems.companyId, companyId), eq(contractEquipmentItems.contractId, contractId)));
  if (!allItems.length) return;
  const totalCents = allItems.reduce((sum, row) => sum + calculateEquipmentCommitmentCents(row), 0);
  const starts = allItems.map((row) => row.startsAt).sort(), ends = allItems.map((row) => row.endsAt).sort();
  await db.update(contracts).set({ startsAt: starts[0], endsAt: ends.at(-1)!, totalCents, monthlyRentCents: allItems.reduce((sum, row) => sum + row.monthlyEquipmentCents, 0), monthlyLaborCents: allItems.reduce((sum, row) => sum + row.monthlyOperatorCents, 0), monthlyAmountCents: allItems.reduce((sum, row) => sum + row.monthlyEquipmentCents + row.monthlyOperatorCents, 0) }).where(and(eq(contracts.id, contractId), eq(contracts.companyId, companyId)));
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; contractId?: string; action?: "add_equipment" | "update_contract" | "update_equipment"; itemId?: string; contract?: { number?: string; object?: string; supplierName?: string; projectName?: string; status?: string; formalizationStatus?: string; formalizationNote?: string }; item?: { equipmentId?: string; startsAt?: string; endsAt?: string; billingMode?: string; monthlyEquipment?: number; monthlyOperator?: number; mobilization?: number; demobilization?: number; quantity?: number; status?: string } };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "contracts", body.action === "add_equipment" ? "create" : "update");
    if (!body.contractId) return Response.json({ error: "Contrato não informado." }, { status: 400 });
    const db = getDb();
    const log = async (action: string) => db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action, entity: "contract", entityId: body.contractId!, createdAt: new Date().toISOString() });
    if (body.action === "update_contract") {
      const current = await db.select().from(contracts).where(and(eq(contracts.id, body.contractId), eq(contracts.companyId, companyId))).limit(1);
      if (!current[0]) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });
      const next = body.contract || {};
      const allowedFormalizationStatuses = ["not_informed", "in_preparation", "pending_legal", "pending_documents", "pending_signature", "completed"];
      if (next.formalizationStatus !== undefined && !allowedFormalizationStatuses.includes(next.formalizationStatus)) return Response.json({ error: "Situação de formalização inválida." }, { status: 400 });
      await db.update(contracts).set({ number: next.number?.trim() || current[0].number, object: next.object?.trim() || current[0].object, supplierName: next.supplierName?.trim() || current[0].supplierName, projectName: next.projectName?.trim() || null, status: next.status || current[0].status, formalizationStatus: next.formalizationStatus ?? current[0].formalizationStatus, formalizationNote: next.formalizationNote !== undefined ? (next.formalizationNote.trim() || null) : current[0].formalizationNote }).where(and(eq(contracts.id, body.contractId), eq(contracts.companyId, companyId)));
      await log(`Contrato editado | antes=${JSON.stringify({ number: current[0].number, object: current[0].object, supplierName: current[0].supplierName, projectName: current[0].projectName, status: current[0].status })} | depois=${JSON.stringify(next)}`);
      return Response.json({ updated: true });
    }
    if (body.action === "update_equipment") {
      if (!body.itemId || !body.item?.startsAt || !body.item.endsAt) return Response.json({ error: "Informe o item, a data de entrada e a data final." }, { status: 400 });
      const current = await db.select().from(contractEquipmentItems).where(and(eq(contractEquipmentItems.id, body.itemId), eq(contractEquipmentItems.contractId, body.contractId), eq(contractEquipmentItems.companyId, companyId))).limit(1);
      if (!current[0]) return Response.json({ error: "Equipamento do contrato não encontrado." }, { status: 404 });
      const item = body.item;
      const values = { startsAt: item.startsAt, endsAt: item.endsAt, billingMode: item.billingMode || "Mensal", monthlyEquipmentCents: Math.round(Number(item.monthlyEquipment || 0) * 100), monthlyOperatorCents: Math.round(Number(item.monthlyOperator || 0) * 100), mobilizationCents: Math.round(Number(item.mobilization || 0) * 100), demobilizationCents: Math.round(Number(item.demobilization || 0) * 100), quantityMilli: Math.round(Number(item.quantity || 1) * 1000), status: item.status || "mobilized" };
      await db.update(contractEquipmentItems).set(values).where(and(eq(contractEquipmentItems.id, body.itemId), eq(contractEquipmentItems.companyId, companyId)));
      await recalculateContract(companyId, body.contractId);
      await log(`Equipamento do contrato editado (${body.itemId}) | antes=${JSON.stringify(current[0])} | depois=${JSON.stringify(values)}`);
      return Response.json({ updated: true });
    }
    if (body.action !== "add_equipment" || !body.item?.equipmentId || !body.item.startsAt || !body.item.endsAt) return Response.json({ error: "Informe contrato, equipamento, data de entrada e data final." }, { status: 400 });
    const [[contract], [asset], [duplicate]] = await Promise.all([
      db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.id, body.contractId), eq(contracts.companyId, companyId))).limit(1),
      db.select({ id: equipment.id }).from(equipment).where(and(eq(equipment.id, body.item.equipmentId), eq(equipment.companyId, companyId))).limit(1),
      db.select({ id: contractEquipmentItems.id }).from(contractEquipmentItems).where(and(eq(contractEquipmentItems.contractId, body.contractId), eq(contractEquipmentItems.equipmentId, body.item.equipmentId))).limit(1),
    ]);
    if (!contract || !asset) return Response.json({ error: "Contrato ou equipamento não pertence à empresa." }, { status: 404 });
    if (duplicate) return Response.json({ error: "Este equipamento já está vinculado ao contrato." }, { status: 409 });
    const item = body.item;
    await db.insert(contractEquipmentItems).values({ id: crypto.randomUUID(), companyId, contractId: contract.id, equipmentId: asset.id, startsAt: item.startsAt, endsAt: item.endsAt, billingMode: item.billingMode || "Mensal", monthlyEquipmentCents: Math.round(Number(item.monthlyEquipment || 0) * 100), monthlyOperatorCents: Math.round(Number(item.monthlyOperator || 0) * 100), mobilizationCents: Math.round(Number(item.mobilization || 0) * 100), demobilizationCents: Math.round(Number(item.demobilization || 0) * 100), quantityMilli: Math.round(Number(item.quantity || 1) * 1000), status: item.status || "mobilized" });
    await recalculateContract(companyId, contract.id);
    await log(`Equipamento adicionado ao contrato (${asset.id})`);
    return Response.json({ added: true });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyId?: string;
      number?: string;
      object?: string;
      startsAt?: string;
      endsAt?: string;
      totalCents?: number;
      contractType?: string;
      monthlyRentCents?: number;
      monthlyLaborCents?: number;
      monthlyAmountCents?: number;
      documentKind?: "initial" | "amendment";
      parentContractId?: string;
      amendmentNumber?: number;
      supplierName?: string;
      supplierId?: string;
      projectName?: string;
      items?: Array<{ equipmentId?: string; startsAt?: string; endsAt?: string; billingMode?: string; monthlyEquipment?: number; monthlyOperator?: number; mobilization?: number; demobilization?: number; quantity?: number; status?: string }>;
    };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "contracts", "create");
    if (
      !body.number?.trim() ||
      !body.object?.trim() ||
      !body.supplierName?.trim() ||
      !body.startsAt ||
      !body.endsAt ||
      !body.items?.length
    )
      return Response.json(
        { error: "Preencha número, objeto, locador, vigência e pelo menos um equipamento." },
        { status: 400 },
      );
    if (body.documentKind === "amendment" && !body.parentContractId) return Response.json({ error: "Selecione o contrato inicial ao cadastrar um aditivo." }, { status: 400 });
    if (body.documentKind === "amendment") {
      const [parent] = await getDb().select({ id: contracts.id, documentKind: contracts.documentKind, supplierName: contracts.supplierName }).from(contracts).where(and(eq(contracts.id, body.parentContractId || ""), eq(contracts.companyId, companyId))).limit(1);
      if (!parent || parent.documentKind !== "initial") return Response.json({ error: "O aditivo deve estar vinculado a um contrato inicial da mesma empresa." }, { status: 400 });
      if (!body.supplierName?.trim()) body.supplierName = parent.supplierName || "";
    }
    const validTypes = ["Locação com mão de obra", "Locação sem mão de obra"];
    if (!body.contractType || !validTypes.includes(body.contractType)) return Response.json({ error: "Selecione uma das duas modalidades de locação." }, { status: 400 });
    if (body.contractType === "Locação sem mão de obra" && body.items.some((item) => Number(item.monthlyOperator || 0) > 0)) return Response.json({ error: "A modalidade sem mão de obra não pode ter valor de operador." }, { status: 400 });
    if (new Set(body.items.map((item) => item.equipmentId)).size !== body.items.length) return Response.json({ error: "Há equipamento repetido na lista deste contrato." }, { status: 409 });
    if (body.supplierId) {
      const [supplier] = await getDb().select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(and(eq(suppliers.id, body.supplierId), eq(suppliers.companyId, companyId), eq(suppliers.active, true))).limit(1);
      if (!supplier) return Response.json({ error: "O fornecedor selecionado não pertence à empresa ativa." }, { status: 400 });
      body.supplierName = supplier.name;
    }
    for (const item of body.items) {
      if (!item.equipmentId || !item.startsAt || !item.endsAt) return Response.json({ error: "Todos os equipamentos precisam de data de entrada e data final." }, { status: 400 });
      const [asset] = await getDb().select({ id: equipment.id }).from(equipment).where(and(eq(equipment.id, item.equipmentId), eq(equipment.companyId, companyId))).limit(1);
      if (!asset) return Response.json({ error: "Um dos equipamentos não pertence à empresa selecionada." }, { status: 400 });
    }
    const contractId = crypto.randomUUID();
    const row = {
      id: contractId,
      companyId,
      number: body.number.trim(),
      object: body.object.trim(),
      contractType: body.contractType?.trim() || null,
      documentKind: body.documentKind || "initial",
      parentContractId: body.documentKind === "amendment" ? body.parentContractId || null : null,
      amendmentNumber: body.documentKind === "amendment" ? Math.max(1, Number(body.amendmentNumber) || 1) : null,
      supplierName: body.supplierName.trim(),
      supplierId: body.supplierId || null,
      projectName: body.projectName?.trim() || null,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      totalCents: Math.max(0, Math.round(body.totalCents || 0)),
      monthlyRentCents: Math.max(0, Math.round(body.monthlyRentCents || 0)),
      monthlyLaborCents: Math.max(0, Math.round(body.monthlyLaborCents || 0)),
      monthlyAmountCents: Math.max(0, Math.round(body.monthlyAmountCents || 0)),
      status: "active",
    };
    const itemRows = body.items.map((item) => ({ id: crypto.randomUUID(), companyId, contractId, equipmentId: item.equipmentId!, startsAt: item.startsAt!, endsAt: item.endsAt!, billingMode: item.billingMode || "Mensal", monthlyEquipmentCents: Math.round(Number(item.monthlyEquipment || 0) * 100), monthlyOperatorCents: Math.round(Number(item.monthlyOperator || 0) * 100), mobilizationCents: Math.round(Number(item.mobilization || 0) * 100), demobilizationCents: Math.round(Number(item.demobilization || 0) * 100), quantityMilli: Math.round(Number(item.quantity || 1) * 1000), status: item.status || "mobilized" }));
    row.totalCents = itemRows.reduce((sum, item) => sum + calculateEquipmentCommitmentCents(item), 0);
    row.monthlyRentCents = itemRows.reduce((sum, item) => sum + item.monthlyEquipmentCents, 0);
    row.monthlyLaborCents = itemRows.reduce((sum, item) => sum + item.monthlyOperatorCents, 0);
    row.monthlyAmountCents = row.monthlyRentCents + row.monthlyLaborCents;
    await getDb().batch([getDb().insert(contracts).values(row), ...itemRows.map((item) => getDb().insert(contractEquipmentItems).values(item))]);
    return Response.json({ contract: row }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
