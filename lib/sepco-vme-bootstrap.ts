import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, equipment, masterData } from "@/db/schema";
import sepcoVmeImport from "@/app/data/sepco-vme-import.json";

const SEPCO_TAX_ID = "14139738002001";
// v3 reaplica a carga porque a tentativa anterior podia registrar a importação
// sem deixar os equipamentos disponíveis na base definitiva.
const EQUIPMENT_MARKER = "importacao-relacao-vme-equipamentos-2026-11-20-v3";
const PROFESSIONAL_MARKER = "importacao-relacao-vme-profissionais-2026-11-19-v2";

async function isSepco1(companyId: string) {
  const [company] = await getDb().select({ taxId: companies.taxId }).from(companies)
    .where(eq(companies.id, companyId)).limit(1);
  return company?.taxId === SEPCO_TAX_ID;
}

async function hasMarker(companyId: string, name: string) {
  const [marker] = await getDb().select({ id: masterData.id }).from(masterData).where(and(
    eq(masterData.companyId, companyId), eq(masterData.type, "sistema"), eq(masterData.name, name),
  )).limit(1);
  return Boolean(marker);
}

export async function ensureSepcoVmeEquipment(companyId: string, userId: string) {
  if (!companyId || !await isSepco1(companyId)) return;
  const db = getDb();
  const now = new Date().toISOString();
  const currentEquipment = await db.select({ id: equipment.id, fleetNumber: equipment.fleetNumber }).from(equipment).where(eq(equipment.companyId, companyId));
  if (await hasMarker(companyId, EQUIPMENT_MARKER) && currentEquipment.length >= sepcoVmeImport.equipment.length) return;
  const operations = sepcoVmeImport.equipment.map((row) => {
    const values = {
      id: crypto.randomUUID(), companyId, fleetNumber: row.fleetNumber,
      plate: row.plate, description: row.description, equipmentType: row.equipmentType,
      brand: row.brand, model: row.model, manufactureYear: row.manufactureYear,
      chassis: row.chassis, renavam: row.renavam, crlvExpiryDate: row.crlvExpiryDate,
      status: row.status, ownershipType: row.ownershipType, operatorName: row.operatorName,
      projectName: row.projectName, costCenter: row.costCenter, frontName: row.frontName,
      lessorName: row.lessorName, lessorTaxId: row.lessorTaxId,
      arrivalDate: row.arrivalDate, registrationDate: row.registrationDate,
      departureDate: row.departureDate, monthlyRentCents: row.monthlyRentCents,
      measurementType: row.measurementType, observation: row.observation,
      entryChecklistStatus: "approved",
    };
    const current = currentEquipment.find((item) => item.fleetNumber.trim().toUpperCase() === row.fleetNumber.trim().toUpperCase());
    return current
      ? db.update(equipment).set({
        plate: values.plate, description: values.description, equipmentType: values.equipmentType,
        brand: values.brand, model: values.model, manufactureYear: values.manufactureYear,
        chassis: values.chassis, renavam: values.renavam, crlvExpiryDate: values.crlvExpiryDate,
        status: values.status, ownershipType: values.ownershipType, operatorName: values.operatorName,
        projectName: values.projectName, costCenter: values.costCenter, frontName: values.frontName,
        lessorName: values.lessorName, lessorTaxId: values.lessorTaxId,
        arrivalDate: values.arrivalDate, registrationDate: values.registrationDate,
        departureDate: values.departureDate, monthlyRentCents: values.monthlyRentCents,
        measurementType: values.measurementType, observation: values.observation,
        entryChecklistStatus: values.entryChecklistStatus,
      }).where(eq(equipment.id, current.id))
      : db.insert(equipment).values(values);
  });
  for (let index = 0; index < operations.length; index += 15) {
    await db.batch(operations.slice(index, index + 15) as [typeof operations[number], ...typeof operations[number][]]);
  }
  if (!await hasMarker(companyId, EQUIPMENT_MARKER)) await db.insert(masterData).values({
    id: crypto.randomUUID(), companyId, type: "sistema", code: "IMPORT-VME-EQ-20261120-V3",
    name: EQUIPMENT_MARKER, description: `${sepcoVmeImport.equipment.length} equipamentos importados da relação VME`,
    active: true, createdBy: userId, createdAt: now, updatedAt: now,
  });
}

export async function ensureSepcoVmeProfessionals(companyId: string, userId: string) {
  if (!companyId || !await isSepco1(companyId) || await hasMarker(companyId, PROFESSIONAL_MARKER)) return;
  const db = getDb();
  const now = new Date().toISOString();
  const current = await db.select().from(masterData).where(and(
    eq(masterData.companyId, companyId), eq(masterData.type, "profissional"),
  ));
  const normalize = (value: string | null | undefined) => (value || "").trim().toLocaleUpperCase("pt-BR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  const operations = sepcoVmeImport.professionals.map((professional) => {
    const existing = current.find((row) => row.code === professional.code || normalize(row.name) === normalize(professional.name));
    const description = JSON.stringify(professional);
    return existing
      ? db.update(masterData).set({ code: professional.code, name: professional.name, description, active: true, updatedAt: now }).where(eq(masterData.id, existing.id))
      : db.insert(masterData).values({
          id: crypto.randomUUID(), companyId, type: "profissional", code: professional.code,
          name: professional.name, description, active: true, createdBy: userId, createdAt: now, updatedAt: now,
        });
  });
  for (let index = 0; index < operations.length; index += 15) {
    await db.batch(operations.slice(index, index + 15) as [typeof operations[number], ...typeof operations[number][]]);
  }
  await db.insert(masterData).values({
    id: crypto.randomUUID(), companyId, type: "sistema", code: "IMPORT-VME-PRO-20261119",
    name: PROFESSIONAL_MARKER, description: `${sepcoVmeImport.professionals.length} profissionais importados das abas PROFISSIONAIS e CNH`,
    active: true, createdBy: userId, createdAt: now, updatedAt: now,
  });
}
