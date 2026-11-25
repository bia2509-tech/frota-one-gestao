import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { equipment, suppliers } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { ensureSepcoVmeEquipment } from "@/lib/sepco-vme-bootstrap";

function normalizePlate(value = "") {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const fleetNumber = url.searchParams.get("fleetNumber")?.trim() || "";
    const plate = normalizePlate(url.searchParams.get("plate") || "");
    const dailyList = url.searchParams.get("dailyList") === "1";
    const consumer = url.searchParams.get("consumer") || "";
    const permission = consumer === "fuel" ? "fuel" : consumer === "reports" ? "reports" : fleetNumber || plate || dailyList ? "daily_parts" : "equipment";
    const access = await requirePermission(companyId, permission, consumer === "reports" ? "report" : "view");
    try {
      await ensureSepcoVmeEquipment(companyId, access.user.userId);
    } catch (bootstrapError) {
      console.error("A carga automática dos equipamentos não pôde ser concluída", bootstrapError);
    }
    if (!fleetNumber && !plate) {
      const rows = await getDb().select().from(equipment).where(and(eq(equipment.companyId, companyId), ne(equipment.status, "demo")));
      const naturalKey = (value: string | null) => String(value || "").toUpperCase().replace(/\d+/g, (digits) => digits.padStart(12, "0"));
      const sortedRows = [...rows].sort((a, b) => {
        const left = naturalKey(a.fleetNumber), right = naturalKey(b.fleetNumber);
        return left < right ? -1 : left > right ? 1 : 0;
      });
      return Response.json({ equipment: dailyList ? sortedRows.map((row) => ({ id: row.id, fleetNumber: row.fleetNumber, plate: row.plate, description: row.description, equipmentType: row.equipmentType, serialNumber: row.serialNumber, ownerName: row.ownerName, projectName: row.projectName, frontName: row.frontName, costCenter: row.costCenter, status: row.status, operatorName: row.operatorName, currentKilometer: row.currentKilometer, currentHourmeter: row.currentHourmeter })) : sortedRows });
    }

    let found;
    if (fleetNumber) {
      [found] = await getDb().select().from(equipment).where(and(
        eq(equipment.companyId, companyId),
        eq(equipment.fleetNumber, fleetNumber),
      )).limit(1);
    } else {
      const rows = await getDb().select().from(equipment)
        .where(eq(equipment.companyId, companyId));
      found = rows.find((row) => normalizePlate(row.plate || "") === plate);
    }
    if (!found) return Response.json({ error: "Equipamento não encontrado." }, { status: 404 });
    return Response.json({ equipment: { id: found.id, fleetNumber: found.fleetNumber, plate: found.plate, description: found.description, operatorName: found.operatorName, currentKilometer: found.currentKilometer, currentHourmeter: found.currentHourmeter } });
  } catch (error) { return apiError(error); }
}

type EquipmentInput = {
  companyId?: string; id?: string; fleetNumber?: string; plate?: string;
  description?: string; equipmentType?: string; brand?: string; model?: string;
  manufactureYear?: number | null; chassis?: string; renavam?: string; color?: string;
  fuelType?: string; serialNumber?: string; ownerName?: string; ownerTaxId?: string;
  lessorId?: string | null; lessorName?: string; lessorTaxId?: string; ownershipType?: string; isCommodatum?: boolean;
  commodatumName?: string; commodatumTaxId?: string; status?: string; monthlyRentCents?: number;
  arrivalDate?: string; departureDate?: string; registrationDate?: string;
  crlvExpiryDate?: string; tachographCalibrationDate?: string; tachographExpiryDate?: string;
  tachographNumber?: string; insuranceProvider?: string; insurancePolicyNumber?: string;
  insuranceStartDate?: string; insuranceExpiryDate?: string; projectName?: string;
  frontName?: string; costCenter?: string; operatorName?: string; measurementType?: string;
  currentKilometer?: number | null; currentHourmeter?: number | null;
  entryChecklistStatus?: string; observation?: string;
};

function values(body: EquipmentInput) {
  return {
    fleetNumber: body.fleetNumber?.trim() || "",
    plate: normalizePlate(body.plate || "") || null,
    description: body.description?.trim() || "",
    equipmentType: body.equipmentType?.trim() || null,
    brand: body.brand?.trim() || null,
    model: body.model?.trim() || null,
    manufactureYear: body.manufactureYear || null,
    chassis: body.chassis?.trim() || null,
    renavam: body.renavam?.trim() || null,
    color: body.color?.trim() || null,
    fuelType: body.fuelType?.trim() || null,
    serialNumber: body.serialNumber?.trim() || null,
    ownerName: body.ownershipType === "owned" ? body.ownerName?.trim() || null : null,
    ownerTaxId: body.ownershipType === "owned" ? body.ownerTaxId?.trim() || null : null,
    lessorId: body.ownershipType !== "owned" ? body.lessorId || null : null,
    lessorName: body.ownershipType !== "owned" ? body.lessorName?.trim() || null : null,
    lessorTaxId: body.ownershipType !== "owned" ? body.lessorTaxId?.trim() || null : null,
    ownershipType: body.ownershipType || null,
    isCommodatum: Boolean(body.isCommodatum),
    commodatumName: body.isCommodatum ? body.commodatumName?.trim() || null : null,
    commodatumTaxId: body.isCommodatum ? body.commodatumTaxId?.trim() || null : null,
    status: body.status || "available",
    monthlyRentCents: Number(body.monthlyRentCents) || 0,
    arrivalDate: body.arrivalDate || null,
    departureDate: body.departureDate || null,
    registrationDate: body.registrationDate || null,
    crlvExpiryDate: body.crlvExpiryDate || null,
    tachographCalibrationDate: body.tachographCalibrationDate || null,
    tachographExpiryDate: body.tachographExpiryDate || null,
    tachographNumber: body.tachographNumber?.trim() || null,
    insuranceProvider: body.insuranceProvider?.trim() || null,
    insurancePolicyNumber: body.insurancePolicyNumber?.trim() || null,
    insuranceStartDate: body.insuranceStartDate || null,
    insuranceExpiryDate: body.insuranceExpiryDate || null,
    projectName: body.projectName?.trim() || null,
    frontName: body.frontName?.trim() || null,
    costCenter: body.costCenter?.trim() || null,
    operatorName: body.operatorName?.trim() || null,
    measurementType: body.measurementType || null,
    currentKilometer: body.currentKilometer ?? null,
    currentHourmeter: body.currentHourmeter ?? null,
    entryChecklistStatus: body.entryChecklistStatus || "pending",
    observation: body.observation?.trim() || null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as EquipmentInput;
    const companyId = body.companyId || "";
    await requirePermission(companyId, "equipment", "create");
    const row = values(body);
    if (!row.fleetNumber || !row.description) return Response.json({ error: "Número da frota e descrição são obrigatórios." }, { status: 400 });
    const [duplicate] = await getDb().select({ description: equipment.description }).from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.fleetNumber, row.fleetNumber))).limit(1);
    if (duplicate) return Response.json({ error: `O código/ID ${row.fleetNumber} já está cadastrado no equipamento “${duplicate.description}”. Informe um código diferente.` }, { status: 409 });
    if (row.lessorId) {
      const [lessor] = await getDb().select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, row.lessorId), eq(suppliers.companyId, companyId))).limit(1);
      if (!lessor) return Response.json({ error: "Locador/fornecedor não pertence à empresa selecionada." }, { status: 400 });
    }
    const record = { id: crypto.randomUUID(), companyId, ...row };
    await getDb().insert(equipment).values(record);
    return Response.json({ equipment: record }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as EquipmentInput;
    const companyId = body.companyId || "";
    await requirePermission(companyId, "equipment", "update");
    if (!body.id) return Response.json({ error: "Equipamento não informado." }, { status: 400 });
    const row = values(body);
    if (!row.fleetNumber || !row.description) return Response.json({ error: "Número da frota e descrição são obrigatórios." }, { status: 400 });
    const [duplicate] = await getDb().select({ description: equipment.description }).from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.fleetNumber, row.fleetNumber), ne(equipment.id, body.id))).limit(1);
    if (duplicate) return Response.json({ error: `O código/ID ${row.fleetNumber} já está cadastrado no equipamento “${duplicate.description}”. Informe um código diferente.` }, { status: 409 });
    if (row.lessorId) {
      const [lessor] = await getDb().select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, row.lessorId), eq(suppliers.companyId, companyId))).limit(1);
      if (!lessor) return Response.json({ error: "Locador/fornecedor não pertence à empresa selecionada." }, { status: 400 });
    }
    await getDb().update(equipment).set(row).where(and(eq(equipment.id, body.id), eq(equipment.companyId, companyId)));
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}
