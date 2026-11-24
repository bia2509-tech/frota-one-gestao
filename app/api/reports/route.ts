import { and, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { appropriationAdjustments, contractEquipmentItems, contracts, dailyPartEntries, equipment, fiscalInvoicePayments, fiscalInvoices, fuelEntries, maintenanceOrderItems, maintenanceOrders, quickServiceEntries, suppliers } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { calculateAppropriation } from "@/lib/appropriation";
import { getMaintenanceGraceDays } from "@/lib/maintenance-rule";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const from = url.searchParams.get("from") || "1900-01-01";
    const to = url.searchParams.get("to") || "2999-12-31";
    await requirePermission(companyId, "reports", "report");
    const db = getDb();

    const [assets, parts, fuel, quick, orderItems, rents, invoices, payments, maintenanceHistory, measurementAdjustments] = await Promise.all([
      db.select().from(equipment).where(and(eq(equipment.companyId, companyId), ne(equipment.status, "demo"))),
      db.select({ entryDate: dailyPartEntries.entryDate, status: dailyPartEntries.status, equipmentId: dailyPartEntries.equipmentId, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description, equipmentType: equipment.equipmentType, costCenter: equipment.costCenter, projectName: equipment.projectName })
        .from(dailyPartEntries).innerJoin(equipment, eq(dailyPartEntries.equipmentId, equipment.id))
        .where(and(eq(dailyPartEntries.companyId, companyId), gte(dailyPartEntries.entryDate, from), lte(dailyPartEntries.entryDate, to))),
      db.select({ equipmentId: fuelEntries.equipmentId, totalCents: fuelEntries.totalCents, litersMilli: fuelEntries.litersMilli, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description })
        .from(fuelEntries).innerJoin(equipment, eq(fuelEntries.equipmentId, equipment.id))
        .where(and(eq(fuelEntries.companyId, companyId), gte(fuelEntries.entryDate, from), lte(fuelEntries.entryDate, to), eq(fuelEntries.status, "confirmed"))),
      db.select({ equipmentId: quickServiceEntries.equipmentId, category: quickServiceEntries.category, totalCents: quickServiceEntries.totalCents, paymentResponsibility: quickServiceEntries.paymentResponsibility, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description })
        .from(quickServiceEntries).innerJoin(equipment, eq(quickServiceEntries.equipmentId, equipment.id))
        .where(and(eq(quickServiceEntries.companyId, companyId), gte(quickServiceEntries.entryDate, from), lte(quickServiceEntries.entryDate, to), eq(quickServiceEntries.status, "confirmed"))),
      db.select({ item: maintenanceOrderItems, orderNumber: maintenanceOrders.orderNumber, startedAt: maintenanceOrders.startedAt, closedAt: maintenanceOrders.closedAt, orderStatus: maintenanceOrders.status, equipmentId: maintenanceOrders.equipmentId, fleetNumber: equipment.fleetNumber, plate: equipment.plate, equipmentDescription: equipment.description })
        .from(maintenanceOrderItems).innerJoin(maintenanceOrders, eq(maintenanceOrderItems.maintenanceOrderId, maintenanceOrders.id)).innerJoin(equipment, eq(maintenanceOrders.equipmentId, equipment.id))
        .where(and(eq(maintenanceOrderItems.companyId, companyId), gte(maintenanceOrders.startedAt, from), lte(maintenanceOrders.startedAt, to))),
      db.select({ item: contractEquipmentItems, contractNumber: contracts.number, contractObject: contracts.object, supplierName: contracts.supplierName, projectName: contracts.projectName }).from(contractEquipmentItems).innerJoin(contracts, eq(contractEquipmentItems.contractId, contracts.id)).where(eq(contractEquipmentItems.companyId, companyId)),
      db.select({ id: fiscalInvoices.id, supplierId: fiscalInvoices.supplierId, supplierName: suppliers.name, invoiceNumber: fiscalInvoices.invoiceNumber, issueDate: fiscalInvoices.issueDate, dueDate: fiscalInvoices.dueDate, costCenter: fiscalInvoices.costCenter, totalCents: fiscalInvoices.totalCents, status: fiscalInvoices.status }).from(fiscalInvoices).innerJoin(suppliers, eq(fiscalInvoices.supplierId, suppliers.id)).where(and(eq(fiscalInvoices.companyId, companyId), gte(fiscalInvoices.issueDate, from), lte(fiscalInvoices.issueDate, to))),
      db.select().from(fiscalInvoicePayments).where(eq(fiscalInvoicePayments.companyId, companyId)),
      db.select({ entryDate: dailyPartEntries.entryDate, status: dailyPartEntries.status, equipmentId: dailyPartEntries.equipmentId, maintenanceOrderId: dailyPartEntries.maintenanceOrderId, orderNumber: maintenanceOrders.orderNumber })
        .from(dailyPartEntries).leftJoin(maintenanceOrders, eq(dailyPartEntries.maintenanceOrderId, maintenanceOrders.id))
        .where(eq(dailyPartEntries.companyId, companyId)),
      db.select().from(appropriationAdjustments).where(and(eq(appropriationAdjustments.companyId, companyId), eq(appropriationAdjustments.scope, "measurement"), eq(appropriationAdjustments.periodStart, from), eq(appropriationAdjustments.periodEnd, to))).orderBy(appropriationAdjustments.createdAt),
    ]);

    const directMaintenanceCents = orderItems.filter((r) => r.item.paymentResponsibility === "company").reduce((s, r) => s + r.item.totalCents, 0);
    const lessorReimbursementCents = orderItems.filter((r) => r.item.paymentResponsibility === "lessor").reduce((s, r) => s + r.item.totalCents, 0) + quick.filter((r) => r.paymentResponsibility === "lessor").reduce((s, r) => s + r.totalCents, 0);
    const lessorDiscountCents = orderItems.filter((r) => r.item.paymentResponsibility === "company_charge_lessor").reduce((s, r) => s + r.item.totalCents, 0);
    const fuelCents = fuel.reduce((s, r) => s + r.totalCents, 0);
    const quickCompanyCents = quick.filter((r) => r.paymentResponsibility === "company").reduce((s, r) => s + r.totalCents, 0);
    const maintenanceGraceDays = await getMaintenanceGraceDays(companyId);
    const maintenanceByEquipment = new Map<string, any[]>();
    for (const entry of maintenanceHistory) maintenanceByEquipment.set(entry.equipmentId, [...(maintenanceByEquipment.get(entry.equipmentId) || []), entry]);
    const measuredOverrides = new Map<string, number>();
    for (const adjustment of measurementAdjustments) if (adjustment.fieldName === "measuredCents") measuredOverrides.set(adjustment.itemId, Math.max(0, Number(adjustment.newValue || 0)));
    const measuredRentByItem = new Map<string, number>();
    for (const row of rents.filter((r) => r.item.status !== "demobilized" && r.item.startsAt <= to && r.item.endsAt >= from)) {
      const monthlyCents = Math.max(0, row.item.monthlyEquipmentCents) + Math.max(0, row.item.monthlyOperatorCents);
      const referenceMonth = from.slice(0, 7);
      const itemKey = `${row.item.contractId}:${row.item.equipmentId}`;
      const calculatedMeasurement = calculateAppropriation(maintenanceByEquipment.get(row.item.equipmentId) || [], referenceMonth, monthlyCents, from, to, maintenanceGraceDays).payableCents;
      const measuredCents = measuredOverrides.get(itemKey) ?? calculatedMeasurement;
      measuredRentByItem.set(row.item.id, measuredCents);
    }
    const rentCents = [...measuredRentByItem.values()].reduce((sum, value) => sum + value, 0);
    const worked = parts.filter((r) => r.status === "T").length, idle = parts.filter((r) => r.status === "D").length, maintenance = parts.filter((r) => r.status === "M").length, allowance = parts.filter((r) => r.status === "AB").length;
    const efficiencyBase = worked + idle + maintenance;

    const costMap = new Map<string, any>();
    for (const asset of assets) costMap.set(asset.id, { equipmentId: asset.id, fleetNumber: asset.fleetNumber, plate: asset.plate, description: asset.description, equipmentType: asset.equipmentType, rentCents: 0, fuelCents: 0, quickCents: 0, directMaintenanceCents: 0, totalCents: 0 });
    for (const row of fuel) { const target = costMap.get(row.equipmentId); if (target) target.fuelCents += row.totalCents; }
    for (const row of quick) { const target = costMap.get(row.equipmentId); if (target) target.quickCents += row.totalCents; }
    for (const row of orderItems) if (row.item.paymentResponsibility === "company") { const target = costMap.get(row.equipmentId); if (target) target.directMaintenanceCents += row.item.totalCents; }
    for (const row of rents) if (measuredRentByItem.has(row.item.id) && costMap.has(row.item.equipmentId)) costMap.get(row.item.equipmentId)!.rentCents += measuredRentByItem.get(row.item.id) || 0;
    const vehicleCosts = [...costMap.values()].map((r) => ({ ...r, totalCents: r.rentCents + r.fuelCents + r.quickCents + r.directMaintenanceCents })).filter((r) => r.totalCents > 0).sort((a, b) => b.totalCents - a.totalCents);

    const paymentByInvoice = new Map<string, any[]>();
    for (const payment of payments) paymentByInvoice.set(payment.invoiceId, [...(paymentByInvoice.get(payment.invoiceId) || []), payment]);
    const invoiceDetails = invoices.map((invoice) => { const rows = paymentByInvoice.get(invoice.id) || []; const paidCents = rows.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountCents, 0); const payableCents = rows.filter((p) => p.status === "payable").reduce((sum, p) => sum + p.amountCents, 0); return { ...invoice, paidCents, payableCents, paymentStatus: invoice.status === "cancelled" ? "Cancelada" : paidCents >= invoice.totalCents && invoice.totalCents > 0 ? "Paga" : paidCents > 0 ? "Parcialmente paga" : "A pagar", payments: rows.map((p) => ({ installment: p.installment, amountCents: p.amountCents, dueDate: p.dueDate, paymentMethod: p.paymentMethod, status: p.status })) }; });
    const supplierMap = new Map<string, any>();
    for (const invoice of invoiceDetails) { const row = supplierMap.get(invoice.supplierId) || { supplierId: invoice.supplierId, supplierName: invoice.supplierName, invoiceCount: 0, totalCents: 0, paidCents: 0, payableCents: 0 }; row.invoiceCount++; row.totalCents += invoice.totalCents; row.paidCents += invoice.paidCents; row.payableCents += Math.max(invoice.payableCents, invoice.totalCents - invoice.paidCents); supplierMap.set(invoice.supplierId, row); }
    const supplierSpending = [...supplierMap.values()].sort((a, b) => b.totalCents - a.totalCents);
    const contractMap = new Map<string, any>();
    for (const row of rents.filter((r) => r.item.startsAt <= to && r.item.endsAt >= from)) { const current = contractMap.get(row.item.contractId) || { contractId: row.item.contractId, contractNumber: row.contractNumber, contractObject: row.contractObject, supplierName: row.supplierName, projectName: row.projectName, contractCents: 0, expenseCents: 0, balanceCents: 0 }; current.contractCents += row.item.monthlyEquipmentCents + row.item.monthlyOperatorCents; current.expenseCents += costMap.get(row.item.equipmentId)?.totalCents || 0; current.balanceCents = current.contractCents - current.expenseCents; contractMap.set(row.item.contractId, current); }
    const contractExpenses = [...contractMap.values()].sort((a, b) => b.expenseCents - a.expenseCents);

    const efficiencyMap = new Map<string, any>();
    for (const row of parts) { const current = efficiencyMap.get(row.equipmentId) || { equipmentId: row.equipmentId, fleetNumber: row.fleetNumber, plate: row.plate, description: row.description, equipmentType: row.equipmentType, worked: 0, idle: 0, maintenance: 0, allowance: 0 }; current[row.status === "T" ? "worked" : row.status === "D" ? "idle" : row.status === "M" ? "maintenance" : "allowance"]++; efficiencyMap.set(row.equipmentId, current); }
    const efficiency = [...efficiencyMap.values()].map((r) => {
      const denominator = r.worked + r.idle + r.maintenance;
      const efficiencyDays = r.worked + r.idle;
      const unproductive = r.idle + r.maintenance;
      return { ...r, efficiencyDays, unproductive, total: denominator, efficiency: efficiencyDays / Math.max(1, denominator), productiveRate: r.worked / Math.max(1, denominator), unproductiveRate: unproductive / Math.max(1, denominator) };
    }).sort((a, b) => a.efficiency - b.efficiency);

    const tires = orderItems.filter((r) => r.item.tireCurrentIdentification || r.item.tirePreviousIdentification || r.item.tireDot).map((r) => ({ orderNumber: r.orderNumber, date: r.closedAt || r.startedAt, fleetNumber: r.fleetNumber, plate: r.plate, description: r.equipmentDescription, previousIdentification: r.item.tirePreviousIdentification, currentIdentification: r.item.tireCurrentIdentification, dot: r.item.tireDot, condition: r.item.tireCondition, destination: r.item.tireRemovedDestination, supplier: r.item.supplierName, valueCents: r.item.totalCents, observation: r.item.observation }));
    const batteries = orderItems.filter((r) => r.item.batteryCertificateNumber || r.item.batteryInvoiceNumber).map((r) => ({ orderNumber: r.orderNumber, date: r.closedAt || r.startedAt, fleetNumber: r.fleetNumber, plate: r.plate, description: r.equipmentDescription, certificate: r.item.batteryCertificateNumber, invoice: r.item.batteryInvoiceNumber || r.item.invoiceNumber, supplier: r.item.supplierName, valueCents: r.item.totalCents, observation: r.item.observation }));

    const productivityTypeMap = new Map<string, any>();
    for (const row of parts) {
      const type = row.equipmentType || row.description || "Não informado";
      const current = productivityTypeMap.get(type) || { equipmentType: type, worked: 0, idle: 0, maintenance: 0, allowance: 0 };
      if (row.status === "T") current.worked++; else if (row.status === "D") current.idle++; else if (row.status === "M") current.maintenance++; else current.allowance++;
      productivityTypeMap.set(type, current);
    }
    const productivityByType = [...productivityTypeMap.values()].map((row) => {
      const total = row.worked + row.idle + row.maintenance;
      const unproductive = row.idle + row.maintenance;
      return { ...row, total, unproductive, productiveRate: row.worked / Math.max(1, total), unproductiveRate: unproductive / Math.max(1, total), idleRate: row.idle / Math.max(1, total), maintenanceRate: row.maintenance / Math.max(1, total) };
    }).sort((a, b) => b.unproductiveRate - a.unproductiveRate);
    const productivityByEquipment = [...efficiencyMap.values()].map((row) => {
      const total = row.worked + row.idle + row.maintenance;
      const unproductive = row.idle + row.maintenance;
      const efficiencyDays = row.worked + row.idle;
      return { ...row, equipmentType: row.equipmentType || "Não informado", total, unproductive, efficiencyDays, efficiency: efficiencyDays / Math.max(1, total), productiveRate: row.worked / Math.max(1, total), unproductiveRate: unproductive / Math.max(1, total) };
    }).sort((a, b) => a.fleetNumber.localeCompare(b.fleetNumber, "pt-BR", { numeric: true }));

    const countMap = (values: string[]) => [...values.reduce((map, value) => map.set(value || "Não informado", (map.get(value || "Não informado") || 0) + 1), new Map<string, number>())].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    const equipmentByType = countMap(assets.map((row) => row.equipmentType || row.description || "Não informado"));
    const equipmentByLessor = countMap(assets.map((row) => row.lessorName || "Próprio / não informado"));
    const lessorExpenseMap = new Map<string, number>();
    for (const row of rents.filter((r) => measuredRentByItem.has(r.item.id))) lessorExpenseMap.set(row.supplierName || "Não informado", (lessorExpenseMap.get(row.supplierName || "Não informado") || 0) + (measuredRentByItem.get(row.item.id) || 0));
    const expensesByLessor = [...lessorExpenseMap].map(([name, totalCents]) => ({ name, totalCents })).sort((a, b) => b.totalCents - a.totalCents);
    const maintenanceTypeMap = new Map<string, number>();
    for (const row of orderItems.filter((r) => r.item.paymentResponsibility === "company")) maintenanceTypeMap.set(row.item.serviceClass || "Não informado", (maintenanceTypeMap.get(row.item.serviceClass || "Não informado") || 0) + row.item.totalCents);
    const maintenanceByType = [...maintenanceTypeMap].map(([name, totalCents]) => ({ name, totalCents })).sort((a, b) => b.totalCents - a.totalCents);
    const maintenanceEntries = orderItems.map((row) => ({
      date: row.closedAt || row.startedAt,
      orderNumber: row.orderNumber,
      fleetNumber: row.fleetNumber,
      plate: row.plate,
      equipment: row.equipmentDescription,
      service: row.item.productService,
      serviceClass: row.item.serviceClass || "Não informado",
      supplier: row.item.supplierName || "",
      paymentResponsibility: row.item.paymentResponsibility,
      totalCents: row.item.totalCents,
    }));
    const monthlyPanel = { equipmentByType, equipmentByLessor, expensesByLessor, maintenanceByType, topEquipment: vehicleCosts.slice(0, 4), efficiency91to100: efficiency.filter((row) => row.efficiency >= .91 && row.efficiency <= 1).length };

    return Response.json({ period: { from, to }, summary: { equipmentTotal: assets.length, activeEquipment: assets.filter((r) => r.status !== "demobilized").length, demobilizedEquipment: assets.filter((r) => r.status === "demobilized").length, worked, idle, maintenance, allowance, efficiency: (worked + idle) / Math.max(1, efficiencyBase), rentCents, fuelCents, quickCompanyCents, directMaintenanceCents, lessorReimbursementCents, lessorDiscountCents, invoiceTotalCents: invoices.reduce((s, r) => s + r.totalCents, 0), invoicePaidCents: invoiceDetails.reduce((s, r) => s + r.paidCents, 0), companyOperatingCostCents: fuelCents + quickCompanyCents + directMaintenanceCents, totalCompanyCostCents: rentCents + fuelCents + quickCompanyCents + directMaintenanceCents }, vehicleCosts, efficiency, productivityByType, productivityByEquipment, monthlyPanel, maintenanceEntries, tires, batteries, supplierSpending, invoiceDetails, contractExpenses });
  } catch (error) { return apiError(error); }
}
