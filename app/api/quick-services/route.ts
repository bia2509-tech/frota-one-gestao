import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, equipment, quickServiceEntries } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

async function findEquipment(companyId: string, equipmentId?: string, fleetNumber?: string, plate?: string) {
  const db = getDb();
  if (equipmentId) return (await db.select().from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.id, equipmentId))).limit(1))[0];
  if (fleetNumber) return (await db.select().from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.fleetNumber, fleetNumber))).limit(1))[0];
  if (plate) return (await db.select().from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.plate, plate.toUpperCase()))).limit(1))[0];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "";
    await requirePermission(companyId, "maintenance", "view");
    const from = url.searchParams.get("from"), to = url.searchParams.get("to");
    const filters = [eq(quickServiceEntries.companyId, companyId)];
    if (from) filters.push(gte(quickServiceEntries.entryDate, from));
    if (to) filters.push(lt(quickServiceEntries.entryDate, `${to}T23:59:59`));
    const entries = await getDb().select({
      id: quickServiceEntries.id, systemNumber: quickServiceEntries.systemNumber, entryDate: quickServiceEntries.entryDate, category: quickServiceEntries.category,
      serviceDescription: quickServiceEntries.serviceDescription, supplierName: quickServiceEntries.supplierName,
      driverName: quickServiceEntries.driverName, quantityMilli: quickServiceEntries.quantityMilli,
      unitPriceCents: quickServiceEntries.unitPriceCents, totalCents: quickServiceEntries.totalCents,
      kilometer: quickServiceEntries.kilometer, hourmeter: quickServiceEntries.hourmeter,
      costCenter: quickServiceEntries.costCenter, requisitionNumber: quickServiceEntries.requisitionNumber,
      paymentResponsibility: quickServiceEntries.paymentResponsibility, invoiceNumber: quickServiceEntries.invoiceNumber,
      status: quickServiceEntries.status, source: quickServiceEntries.source, observation: quickServiceEntries.observation,
      equipmentId: equipment.id, fleetNumber: equipment.fleetNumber, plate: equipment.plate, equipmentDescription: equipment.description, ownerName: equipment.ownerName,
    }).from(quickServiceEntries).innerJoin(equipment, eq(quickServiceEntries.equipmentId, equipment.id))
      .where(and(...filters)).orderBy(asc(quickServiceEntries.systemNumber), desc(quickServiceEntries.entryDate));
    return Response.json({ entries });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as any, companyId = body.companyId || "";
    const access = await requirePermission(companyId, "maintenance", "create");
    const source = body.source === "spreadsheet" ? "spreadsheet" : "manual";
    const rawEntries = Array.isArray(body.entries) ? body.entries : [body];
    const inserted: any[] = [], errors: any[] = [];
    const [sequence] = await getDb().select({ value: sql<number>`coalesce(max(${quickServiceEntries.systemNumber}), 0)` }).from(quickServiceEntries).where(eq(quickServiceEntries.companyId, companyId));
    let nextSystemNumber = Number(sequence?.value || 0) + 1;
    for (let index = 0; index < rawEntries.length; index++) {
      const row = rawEntries[index];
      const asset = await findEquipment(companyId, row.equipmentId, String(row.fleetNumber || "").trim(), String(row.plate || "").trim());
      if (!asset) { errors.push({ row: index + 2, error: "Equipamento não localizado por ID/frota ou placa." }); continue; }
      if (!row.entryDate || !row.category || !row.serviceDescription || Number(row.quantity || 0) <= 0 || Number(row.unitPrice || 0) < 0) {
        errors.push({ row: index + 2, error: "Data, categoria, serviço, quantidade e valor são obrigatórios." }); continue;
      }
      const quantity = Number(row.quantity), unitPrice = Number(row.unitPrice);
      const entry = { id: crypto.randomUUID(), companyId, equipmentId: asset.id, systemNumber: nextSystemNumber++, entryDate: row.entryDate,
        category: String(row.category).trim(), serviceDescription: String(row.serviceDescription).trim(), supplierName: row.supplierName?.trim() || null,
        driverName: row.driverName?.trim() || asset.operatorName || null, quantityMilli: Math.round(quantity * 1000), unitPriceCents: Math.round(unitPrice * 100),
        totalCents: Math.round(quantity * unitPrice * 100), kilometer: row.kilometer === "" || row.kilometer == null ? null : Number(row.kilometer),
        hourmeter: row.hourmeter === "" || row.hourmeter == null ? null : Number(row.hourmeter), costCenter: row.costCenter?.trim() || asset.costCenter || null,
        requisitionNumber: row.requisitionNumber?.trim() || null, paymentResponsibility: row.paymentResponsibility === "lessor" ? "lessor" as const : "company" as const,
        invoiceNumber: row.invoiceNumber?.trim() || null, status: "confirmed" as const, source, importFileName: body.fileName?.trim() || null,
        observation: row.observation?.trim() || null, createdBy: access.user.userId, createdAt: new Date().toISOString() };
      await getDb().insert(quickServiceEntries).values(entry); inserted.push(entry);
    }
    return Response.json({ inserted: inserted.length, errors, entries: inserted }, { status: inserted.length ? 201 : 400 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as any, companyId = body.companyId || "";
    const access = await requirePermission(companyId, "maintenance", "update");
    const [current] = await getDb().select().from(quickServiceEntries).where(and(eq(quickServiceEntries.id, body.id || ""), eq(quickServiceEntries.companyId, companyId))).limit(1);
    if (!current) return Response.json({ error: "Serviço rápido não encontrado." }, { status: 404 });
    if (current.status !== "draft") return Response.json({ error: "Solicite a reabertura antes de alterar este serviço." }, { status: 409 });
    const asset = await findEquipment(companyId, body.equipmentId, body.fleetNumber, body.plate);
    if (!asset) return Response.json({ error: "Equipamento não localizado." }, { status: 400 });
    if (!body.entryDate || !body.category || !body.serviceDescription || Number(body.quantity || 0) <= 0 || Number(body.unitPrice || 0) < 0) return Response.json({ error: "Data, categoria, serviço, quantidade e valor são obrigatórios." }, { status: 400 });
    const quantity = Number(body.quantity), unitPrice = Number(body.unitPrice);
    await getDb().update(quickServiceEntries).set({ equipmentId: asset.id, entryDate: body.entryDate, category: String(body.category).trim(), serviceDescription: String(body.serviceDescription).trim(), supplierName: body.supplierName?.trim() || null, driverName: body.driverName?.trim() || asset.operatorName || null, quantityMilli: Math.round(quantity * 1000), unitPriceCents: Math.round(unitPrice * 100), totalCents: Math.round(quantity * unitPrice * 100), kilometer: body.kilometer === "" ? null : Number(body.kilometer), hourmeter: body.hourmeter === "" ? null : Number(body.hourmeter), costCenter: body.costCenter?.trim() || null, requisitionNumber: body.requisitionNumber?.trim() || null, paymentResponsibility: body.paymentResponsibility === "lessor" ? "lessor" : "company", invoiceNumber: body.invoiceNumber?.trim() || null, observation: body.observation?.trim() || null, status: "confirmed" }).where(eq(quickServiceEntries.id, current.id));
    await getDb().insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "Alterou e reconcluiu serviço rápido reaberto", entity: "quick_service", entityId: current.id, createdAt: new Date().toISOString() });
    return Response.json({ status: "confirmed" });
  } catch (error) { return apiError(error); }
}
