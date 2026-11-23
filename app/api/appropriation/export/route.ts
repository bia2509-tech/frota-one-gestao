import { and, desc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import {
  companies,
  contractEquipmentItems,
  contracts,
  dailyPartEntries,
  equipment,
  fuelEntries,
  maintenanceOrderItems,
  maintenanceOrders,
  measurements,
  quickServiceEntries,
} from "@/db/schema";
import { calculateAppropriation } from "@/lib/appropriation";
import { getMaintenanceGraceDays } from "@/lib/maintenance-rule";
import { calculateContractMonthlyCents } from "@/lib/contracts-finance";
import { apiError, requirePermission } from "@/lib/tenant";

const norm = (val: unknown) =>
  String(val ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const equipmentId = url.searchParams.get("equipmentId") || "";
    const referenceMonth = url.searchParams.get("referenceMonth") || "";
    const periodStart = url.searchParams.get("periodStart") || `${referenceMonth}-01`;
    const periodEnd = url.searchParams.get("periodEnd") || `${referenceMonth}-31`;
    const movementType = url.searchParams.get("movementType") || "normal";
    const generalObservation = url.searchParams.get("observation") || "";

    await requirePermission(companyId, "appropriation", "view");

    const db = getDb();
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const [asset] = await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.id, equipmentId), eq(equipment.companyId, companyId)))
      .limit(1);

    if (!asset) {
      return Response.json({ error: "Equipamento não encontrado." }, { status: 404 });
    }

    const [contractItem] = await db
      .select({
        contractId: contracts.id,
        contractNumber: contracts.number,
        supplierName: contracts.supplierName,
        contractTotalCents: contracts.totalCents,
        monthlyEquipmentCents: contractEquipmentItems.monthlyEquipmentCents,
        monthlyOperatorCents: contractEquipmentItems.monthlyOperatorCents,
        mobilizationCents: contractEquipmentItems.mobilizationCents,
        demobilizationCents: contractEquipmentItems.demobilizationCents,
        itemStartsAt: contractEquipmentItems.startsAt,
        itemEndsAt: contractEquipmentItems.endsAt,
      })
      .from(contractEquipmentItems)
      .innerJoin(contracts, eq(contractEquipmentItems.contractId, contracts.id))
      .where(
        and(
          eq(contractEquipmentItems.companyId, companyId),
          eq(contractEquipmentItems.equipmentId, equipmentId),
          lte(contractEquipmentItems.startsAt, periodEnd),
          gte(contractEquipmentItems.endsAt, periodStart)
        )
      )
      .orderBy(desc(contractEquipmentItems.startsAt))
      .limit(1);

    const [approvedMeasurement] = contractItem
      ? await db
          .select({ total: sql<number>`coalesce(sum(${measurements.amountCents}), 0)` })
          .from(measurements)
          .where(
            and(
              eq(measurements.companyId, companyId),
              eq(measurements.contractId, contractItem.contractId),
              eq(measurements.status, "approved")
            )
          )
      : [{ total: 0 }];

    const approvedMeasuredCents = Number(approvedMeasurement?.total || 0);
    const contractualMonthlyCents = contractItem
      ? calculateContractMonthlyCents(contractItem)
      : asset.monthlyRentCents;
    const movementCents =
      movementType === "mobilization"
        ? contractItem?.mobilizationCents || 0
        : movementType === "demobilization"
          ? contractItem?.demobilizationCents || 0
          : 0;

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
      .leftJoin(maintenanceOrders, eq(dailyPartEntries.maintenanceOrderId, maintenanceOrders.id))
      .where(and(eq(dailyPartEntries.companyId, companyId), eq(dailyPartEntries.equipmentId, equipmentId)));

    const maintenanceGraceDays = await getMaintenanceGraceDays(companyId);
    const ap = calculateAppropriation(
      entries,
      referenceMonth,
      contractualMonthlyCents,
      periodStart,
      periodEnd,
      maintenanceGraceDays
    );

    const periodEndExclusive = new Date(`${periodEnd}T00:00:00Z`);
    periodEndExclusive.setUTCDate(periodEndExclusive.getUTCDate() + 1);
    const nextDay = periodEndExclusive.toISOString().slice(0, 10);

    const serviceItemRows = await db
      .select({
        orderNumber: maintenanceOrders.orderNumber,
        orderStatus: maintenanceOrders.status,
        closedAt: maintenanceOrders.closedAt,
        productService: maintenanceOrderItems.productService,
        serviceClass: maintenanceOrderItems.serviceClass,
        paymentResponsibility: maintenanceOrderItems.paymentResponsibility,
        invoiceNumber: maintenanceOrderItems.invoiceNumber,
        totalCents: maintenanceOrderItems.totalCents,
      })
      .from(maintenanceOrderItems)
      .innerJoin(maintenanceOrders, eq(maintenanceOrderItems.maintenanceOrderId, maintenanceOrders.id))
      .where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrders.equipmentId, equipmentId)));

    const serviceItems = serviceItemRows.filter(
      (item) => item.orderStatus === "closed" && Boolean(item.closedAt) && item.closedAt! >= periodStart && item.closedAt! < nextDay
    );

    const financial = serviceItems.reduce(
      (sum, item) => {
        if (item.paymentResponsibility === "lessor") sum.reimbursementCents += item.totalCents;
        else if (item.paymentResponsibility === "company_charge_lessor") sum.lessorChargeCents += item.totalCents;
        else if (/borracharia|lava.?jato|lubrifica/i.test(item.serviceClass)) sum.tireWashLubricationCents += item.totalCents;
        else sum.partsServicesCents += item.totalCents;
        return sum;
      },
      { reimbursementCents: 0, lessorChargeCents: 0, tireWashLubricationCents: 0, partsServicesCents: 0 }
    );

    const fuels = await db
      .select({
        entryDate: fuelEntries.entryDate,
        litersMilli: fuelEntries.litersMilli,
        totalCents: fuelEntries.totalCents,
        station: fuelEntries.station,
        product: fuelEntries.product,
      })
      .from(fuelEntries)
      .where(
        and(
          eq(fuelEntries.companyId, companyId),
          eq(fuelEntries.equipmentId, equipmentId),
          ne(fuelEntries.transactionType, "stock_receipt"),
          gte(fuelEntries.entryDate, periodStart),
          lt(fuelEntries.entryDate, nextDay)
        )
      );

    const quickServices = await db
      .select()
      .from(quickServiceEntries)
      .where(
        and(
          eq(quickServiceEntries.companyId, companyId),
          eq(quickServiceEntries.equipmentId, equipmentId),
          eq(quickServiceEntries.status, "confirmed"),
          gte(quickServiceEntries.entryDate, periodStart),
          lt(quickServiceEntries.entryDate, nextDay)
        )
      );

    const quick = quickServices.reduce(
      (sum, item) => {
        if (item.paymentResponsibility === "lessor") sum.reimbursementCents += item.totalCents;
        else if (/borracharia/i.test(item.category)) sum.tireCents += item.totalCents;
        else if (/lava.?jato/i.test(item.category)) sum.washCents += item.totalCents;
        else sum.otherCents += item.totalCents;
        return sum;
      },
      { reimbursementCents: 0, tireCents: 0, washCents: 0, otherCents: 0 }
    );

    const lessorInvoiceCents = Math.max(
      0,
      ap.payableCents + movementCents + financial.reimbursementCents + quick.reimbursementCents - financial.lessorChargeCents
    );
    const contractBalanceAfterCents = contractItem
      ? Math.max(0, contractItem.contractTotalCents - approvedMeasuredCents - lessorInvoiceCents)
      : null;

    const templateUrl = new URL("/templates/modelo-apropriacao.xlsx", url.origin);
    const assetsBinding = (env as unknown as { ASSETS?: { fetch: (req: Request) => Promise<Response> } }).ASSETS;
    const templateRes = assetsBinding
      ? await assetsBinding.fetch(new Request(templateUrl.toString()))
      : await fetch(templateUrl.toString());

    if (!templateRes.ok) {
      return Response.json({ error: "Molde modelo-apropriacao.xlsx não encontrado." }, { status: 404 });
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(await templateRes.arrayBuffer());
    const sheet = workbook.worksheets[0];

    const setNextValueCell = (row: any, labelCol: number, value: any) => {
      const targetMerge = row.getCell(labelCol).master;
      for (let c = labelCol + 1; c <= 20; c++) {
        const cell = row.getCell(c);
        if (cell.master !== targetMerge) {
          cell.master.value = value;
          return;
        }
      }
    };

    const companyName = asset.projectName || company?.tradeName || "—";
    const periodLabel = `${periodStart.split("-").reverse().join("/")} a ${periodEnd.split("-").reverse().join("/")}`;
    const printDate = new Date().toLocaleDateString("pt-BR");

    let headerRow = 0;
    let totalKmRow = 0;

    sheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
      for (let c = 1; c <= 18; c++) {
        const cell = row.getCell(c);
