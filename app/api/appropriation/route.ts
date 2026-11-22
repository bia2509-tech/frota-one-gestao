import { and, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { contractEquipmentItems, contracts, dailyPartEntries, equipment, fuelEntries, maintenanceOrderItems, maintenanceOrders, measurements, quickServiceEntries } from "@/db/schema";
import { calculateAppropriation } from "@/lib/appropriation";
import { getMaintenanceGraceDays } from "@/lib/maintenance-rule";
import { calculateContractMonthlyCents } from "@/lib/contracts-finance";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      companyId = url.searchParams.get("companyId") || "",
      equipmentId = url.searchParams.get("equipmentId") || "",
      referenceMonth = url.searchParams.get("referenceMonth") || "",
      periodStart = url.searchParams.get("periodStart") || `${referenceMonth}-01`,
      periodEnd = url.searchParams.get("periodEnd") || `${referenceMonth}-31`,
      movementType = url.searchParams.get("movementType") || "normal";
    await requirePermission(companyId, "appropriation", "view");
    if (!/^\d{4}-\d{2}$/.test(referenceMonth))
      return Response.json({ error: "Competência inválida." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || periodStart > periodEnd)
      return Response.json({ error: "Período inicial e final inválido." }, { status: 400 });
    if (!["normal", "mobilization", "demobilization"].includes(movementType))
      return Response.json({ error: "Tipo de movimentação inválido." }, { status: 400 });
    const db = getDb();
    const [asset] = await db
      .select()
      .from(equipment)
      .where(
        and(eq(equipment.id, equipmentId), eq(equipment.companyId, companyId)),
      )
      .limit(1);
    if (!asset)
      return Response.json(
        { error: "Equipamento não pertence à empresa." },
        { status: 404 },
      );
    const [contractItem] = await db.select({ contractId: contracts.id, contractNumber: contracts.number, supplierName: contracts.supplierName, contractTotalCents: contracts.totalCents, monthlyEquipmentCents: contractEquipmentItems.monthlyEquipmentCents, monthlyOperatorCents: contractEquipmentItems.monthlyOperatorCents, mobilizationCents: contractEquipmentItems.mobilizationCents, demobilizationCents: contractEquipmentItems.demobilizationCents, itemStartsAt: contractEquipmentItems.startsAt, itemEndsAt: contractEquipmentItems.endsAt }).from(contractEquipmentItems).innerJoin(contracts, eq(contractEquipmentItems.contractId, contracts.id)).where(and(eq(contractEquipmentItems.companyId, companyId), eq(contractEquipmentItems.equipmentId, equipmentId), lte(contractEquipmentItems.startsAt, periodEnd), gte(contractEquipmentItems.endsAt, periodStart))).orderBy(desc(contractEquipmentItems.startsAt)).limit(1);
    const [approvedMeasurement] = contractItem
      ? await db.select({ total: sql<number>`coalesce(sum(${measurements.amountCents}), 0)` }).from(measurements).where(and(eq(measurements.companyId, companyId), eq(measurements.contractId, contractItem.contractId), eq(measurements.status, "approved")))
      : [{ total: 0 }];
    const approvedMeasuredCents = Number(approvedMeasurement?.total || 0);
    const contractualMonthlyCents = contractItem ? calculateContractMonthlyCents(contractItem) : asset.monthlyRentCents;
    const movementCents = movementType === "mobilization" ? (contractItem?.mobilizationCents || 0) : movementType === "demobilization" ? (contractItem?.demobilizationCents || 0) : 0;
    if (movementType !== "normal" && !contractItem)
      return Response.json({ error: "Este equipamento não possui contrato vigente no período informado." }, { status: 404 });
    if (movementType !== "normal" && movementCents <= 0)
      return Response.json({ error: `O valor de ${movementType === "mobilization" ? "mobilização" : "desmobilização"} não foi cadastrado para este equipamento no contrato.` }, { status: 400 });
    const entries = await db
      .select({
        entryDate: dailyPartEntries.entryDate,
        status: dailyPartEntries.status,
        maintenanceOrderId: dailyPartEntries.maintenanceOrderId,
        orderNumber: maintenanceOrders.orderNumber,
        hourmeterStart: dailyPartEntries.hourmeterStart,
        hourmeterEnd: dailyPartEntries.hourmeterEnd,
        kilometerStart: dailyPartEntries.kilometerStart,
        kilometerEnd: dailyPartEntries.kilometerEnd,
        observation: dailyPartEntries.observation,
      })
      .from(dailyPartEntries)
      .leftJoin(
        maintenanceOrders,
        eq(dailyPartEntries.maintenanceOrderId, maintenanceOrders.id),
      )
      .where(
        and(
          eq(dailyPartEntries.companyId, companyId),
          eq(dailyPartEntries.equipmentId, equipmentId),
        ),
      );
    const maintenanceGraceDays = await getMaintenanceGraceDays(companyId);
    const result = calculateAppropriation(
      entries,
      referenceMonth,
      contractualMonthlyCents,
      periodStart,
      periodEnd,
      maintenanceGraceDays,
    );
    const periodEndExclusive = new Date(`${periodEnd}T00:00:00Z`); periodEndExclusive.setUTCDate(periodEndExclusive.getUTCDate() + 1);
    const nextDay = periodEndExclusive.toISOString().slice(0, 10);
    const serviceItemRows = await db.select({ orderNumber: maintenanceOrders.orderNumber, orderStatus: maintenanceOrders.status, maintenanceStatus: maintenanceOrders.maintenanceStatus, startedAt: maintenanceOrders.startedAt, closedAt: maintenanceOrders.closedAt, productService: maintenanceOrderItems.productService, serviceClass: maintenanceOrderItems.serviceClass, paymentResponsibility: maintenanceOrderItems.paymentResponsibility, invoiceNumber: maintenanceOrderItems.invoiceNumber, supplierName: maintenanceOrderItems.supplierName, totalCents: maintenanceOrderItems.totalCents }).from(maintenanceOrderItems).innerJoin(maintenanceOrders, eq(maintenanceOrderItems.maintenanceOrderId, maintenanceOrders.id)).where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrders.equipmentId, equipmentId)));
    const serviceItems = serviceItemRows.filter((item) => {
      const concluded = item.orderStatus === "closed" && Boolean(item.closedAt);
      return concluded && item.closedAt! >= periodStart && item.closedAt! < nextDay;
    });
    const financial = serviceItems.reduce((sum, item) => {
      if (item.paymentResponsibility === "lessor") sum.reimbursementCents += item.totalCents;
      else if (item.paymentResponsibility === "company_charge_lessor") sum.lessorChargeCents += item.totalCents;
      else if (/borracharia|lava.?jato|lubrifica/i.test(item.serviceClass)) sum.tireWashLubricationCents += item.totalCents;
      else sum.partsServicesCents += item.totalCents;
      return sum;
    }, { reimbursementCents: 0, lessorChargeCents: 0, tireWashLubricationCents: 0, partsServicesCents: 0 });
    const fuels = await db.select({ entryDate: fuelEntries.entryDate, litersMilli: fuelEntries.litersMilli, totalCents: fuelEntries.totalCents, station: fuelEntries.station, product: fuelEntries.product })
      .from(fuelEntries).where(and(eq(fuelEntries.companyId, companyId), eq(fuelEntries.equipmentId, equipmentId), ne(fuelEntries.transactionType, "stock_receipt"), gte(fuelEntries.entryDate, periodStart), lt(fuelEntries.entryDate, nextDay)));
    const quickServices = await db.select().from(quickServiceEntries).where(and(eq(quickServiceEntries.companyId, companyId), eq(quickServiceEntries.equipmentId, equipmentId), eq(quickServiceEntries.status, "confirmed"), gte(quickServiceEntries.entryDate, periodStart), lt(quickServiceEntries.entryDate, nextDay)));
    const fuelCents = fuels.reduce((sum, item) => sum + item.totalCents, 0);
    const quick = quickServices.reduce((sum, item) => {
      if (item.paymentResponsibility === "lessor") sum.reimbursementCents += item.totalCents;
      else if (/borracharia/i.test(item.category)) sum.tireCents += item.totalCents;
      else if (/lava.?jato/i.test(item.category)) sum.washCents += item.totalCents;
      else sum.otherCents += item.totalCents;
      return sum;
    }, { reimbursementCents: 0, tireCents: 0, washCents: 0, otherCents: 0 });
    return Response.json({
      equipment: {
        id: asset.id,
        fleetNumber: asset.fleetNumber,
        plate: asset.plate,
        description: asset.description,
        model: asset.model,
        fuelType: asset.fuelType,
        projectName: asset.projectName,
        frontName: asset.frontName,
        costCenter: asset.costCenter,
        operatorName: asset.operatorName,
        lessorName: asset.lessorName,
      },
      period: { referenceMonth, start: periodStart, end: periodEnd },
      movement: { type: movementType, valueCents: movementCents },
      contract: contractItem ? { ...contractItem, approvedMeasuredCents, balanceBeforeCents: Math.max(0, contractItem.contractTotalCents - approvedMeasuredCents) } : null,
      appropriation: result,
      dailyEntries: entries.filter((entry) => entry.entryDate >= periodStart && entry.entryDate <= periodEnd),
      maintenanceFinancial: { ...financial, items: serviceItems },
      fuel: { totalCents: fuelCents, entries: fuels },
      quickServices: { ...quick, entries: quickServices },
      totals: {
        lessorInvoiceCents: Math.max(0, result.payableCents + movementCents + financial.reimbursementCents + quick.reimbursementCents - financial.lessorChargeCents),
        contractBalanceAfterCents: contractItem ? Math.max(0, contractItem.contractTotalCents - approvedMeasuredCents - Math.max(0, result.payableCents + movementCents + financial.reimbursementCents + quick.reimbursementCents - financial.lessorChargeCents)) : null,
        companyCostCents: financial.partsServicesCents + financial.tireWashLubricationCents + financial.lessorChargeCents + fuelCents + quick.tireCents + quick.washCents + quick.otherCents,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
