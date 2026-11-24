import { and, desc, eq, gte, lt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { appropriationAdjustments, contractEquipmentItems, contracts, dailyPartEntries, equipment, maintenanceOrderItems, maintenanceOrders, quickServiceEntries, suppliers } from "@/db/schema";
import { calculateAppropriation } from "@/lib/appropriation";
import { getMaintenanceGraceDays } from "@/lib/maintenance-rule";
import { calculateContractMonthlyCents } from "@/lib/contracts-finance";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", supplierName = url.searchParams.get("supplierName") || "", referenceMonth = url.searchParams.get("referenceMonth") || "", periodStart = url.searchParams.get("periodStart") || "", periodEnd = url.searchParams.get("periodEnd") || "";
    await requirePermission(companyId, "appropriation", "view");
    if (!supplierName || !/^\d{4}-\d{2}$/.test(referenceMonth) || !periodStart || !periodEnd) return Response.json({ error: "Informe locador, competência e período." }, { status: 400 });
    const db = getDb(), maintenanceGraceDays = await getMaintenanceGraceDays(companyId), end = new Date(`${periodEnd}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 1); const nextDay = end.toISOString().slice(0, 10);
    const contractRows = await db.select({ contractId: contracts.id, contractNumber: contracts.number, supplierName: contracts.supplierName, supplierId: contracts.supplierId, equipmentId: equipment.id, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description, equipmentType: equipment.equipmentType, brand: equipment.brand, model: equipment.model, startsAt: contractEquipmentItems.startsAt, endsAt: contractEquipmentItems.endsAt, monthlyEquipmentCents: contractEquipmentItems.monthlyEquipmentCents, monthlyOperatorCents: contractEquipmentItems.monthlyOperatorCents, mobilizationCents: contractEquipmentItems.mobilizationCents, demobilizationCents: contractEquipmentItems.demobilizationCents }).from(contractEquipmentItems).innerJoin(contracts, eq(contractEquipmentItems.contractId, contracts.id)).innerJoin(equipment, eq(contractEquipmentItems.equipmentId, equipment.id)).where(and(eq(contractEquipmentItems.companyId, companyId), eq(contracts.supplierName, supplierName), lte(contractEquipmentItems.startsAt, periodEnd), gte(contractEquipmentItems.endsAt, periodStart))).orderBy(desc(contractEquipmentItems.startsAt));
    const supplierId = contractRows[0]?.supplierId;
    const [supplier] = supplierId ? await db.select({ taxId: suppliers.taxId }).from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.companyId, companyId))).limit(1) : [];
    const items = [];
    for (const row of contractRows) {
      const daily = await db.select({ entryDate: dailyPartEntries.entryDate, status: dailyPartEntries.status, maintenanceOrderId: dailyPartEntries.maintenanceOrderId, orderNumber: maintenanceOrders.orderNumber }).from(dailyPartEntries).leftJoin(maintenanceOrders, eq(dailyPartEntries.maintenanceOrderId, maintenanceOrders.id)).where(and(eq(dailyPartEntries.companyId, companyId), eq(dailyPartEntries.equipmentId, row.equipmentId)));
      const monthlyCents = calculateContractMonthlyCents(row);
      const ap = calculateAppropriation(daily, referenceMonth, monthlyCents, periodStart, periodEnd, maintenanceGraceDays);
      const osItems = await db.select({ totalCents: maintenanceOrderItems.totalCents, paymentResponsibility: maintenanceOrderItems.paymentResponsibility }).from(maintenanceOrderItems).innerJoin(maintenanceOrders, eq(maintenanceOrderItems.maintenanceOrderId, maintenanceOrders.id)).where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrders.equipmentId, row.equipmentId), eq(maintenanceOrders.status, "closed"), gte(maintenanceOrders.closedAt, periodStart), lt(maintenanceOrders.closedAt, nextDay)));
      const quick = await db.select({ totalCents: quickServiceEntries.totalCents, paymentResponsibility: quickServiceEntries.paymentResponsibility }).from(quickServiceEntries).where(and(eq(quickServiceEntries.companyId, companyId), eq(quickServiceEntries.equipmentId, row.equipmentId), eq(quickServiceEntries.status, "confirmed"), gte(quickServiceEntries.entryDate, periodStart), lt(quickServiceEntries.entryDate, nextDay)));
      const reimbursementCents = [...osItems, ...quick].filter((entry) => entry.paymentResponsibility === "lessor").reduce((sum, entry) => sum + entry.totalCents, 0);
      const lessorChargeCents = osItems.filter((entry) => entry.paymentResponsibility === "company_charge_lessor").reduce((sum, entry) => sum + entry.totalCents, 0);
      const mobilizationCents = row.startsAt >= periodStart && row.startsAt <= periodEnd ? row.mobilizationCents : 0;
      const demobilizationCents = row.endsAt >= periodStart && row.endsAt <= periodEnd ? row.demobilizationCents : 0;
      items.push({ id: `${row.contractId}:${row.equipmentId}`, contractNumber: row.contractNumber, equipmentId: row.equipmentId, equipmentType: row.equipmentType || row.description, description: [row.brand, row.model, row.description].filter(Boolean).join(" - "), fleetNumber: row.fleetNumber, plate: row.plate, monthlyCents, workedDays: Math.max(0, ap.paidDays), measuredCents: ap.payableCents, mobilizationCents, demobilizationCents, reimbursementCents, discountCents: ap.discountCents + lessorChargeCents, totalCents: Math.max(0, ap.payableCents + mobilizationCents + demobilizationCents + reimbursementCents - lessorChargeCents), observation: lessorChargeCents ? `Desconto de peças/serviços pagos pela empresa: ${(lessorChargeCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "" });
    }
    const history = await db.select().from(appropriationAdjustments).where(and(
      eq(appropriationAdjustments.companyId, companyId),
      eq(appropriationAdjustments.scope, "measurement"),
      eq(appropriationAdjustments.referenceMonth, referenceMonth),
      eq(appropriationAdjustments.periodStart, periodStart),
      eq(appropriationAdjustments.periodEnd, periodEnd),
      eq(appropriationAdjustments.supplierName, supplierName),
    )).orderBy(appropriationAdjustments.createdAt);
    const adjustedItems = items.map((item: any) => {
      const next = { ...item };
      for (const adjustment of history) {
        if (adjustment.itemId !== item.id) continue;
        next[adjustment.fieldName] = adjustment.fieldName === "observation" ? adjustment.newValue : Number(adjustment.newValue || 0);
      }
      next.totalCents = Number(next.measuredCents || 0) + Number(next.mobilizationCents || 0) + Number(next.demobilizationCents || 0) + Number(next.reimbursementCents || 0) - Number(next.discountCents || 0);
      return next;
    });
    return Response.json({ supplier: { name: supplierName, taxId: supplier?.taxId || "" }, period: { referenceMonth, start: periodStart, end: periodEnd }, items: adjustedItems, history });
  } catch (error) { return apiError(error); }
}
