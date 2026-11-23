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
import { MODELO_APROPRIACAO_BASE64 } from "@/lib/modelo-apropriacao-template";
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

        const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(Buffer.from(MODELO_APROPRIACAO_BASE64, "base64"));

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
    let dayCol = 1;
    let totalKmRow = 0;

    sheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
      for (let c = 1; c <= 18; c++) {
        const cell = row.getCell(c);
        if (cell.master && cell.master !== cell) continue;
        const txt = norm(cell.value);
        if (!txt) continue;

        if (txt.startsWith("OBRA")) setNextValueCell(row, c, companyName);
        else if (txt.startsWith("FRENTE DE TRABALHO")) setNextValueCell(row, c, asset.frontName || "—");
        else if (txt.startsWith("DESCRICAO DO EQUIPAMENTO")) setNextValueCell(row, c, asset.description || "—");
        else if (txt.startsWith("VALOR DA LOCACAO")) setNextValueCell(row, c, Number(ap.monthlyRentCents || 0) / 100);
        else if (txt.startsWith("VALOR UNI")) setNextValueCell(row, c, Number(ap.dailyValueCents || 0) / 100);
        else if (txt.startsWith("PLACA")) setNextValueCell(row, c, asset.plate || "—");
        else if (txt.startsWith("VALOR S. COMPRA") || txt.startsWith("VALOR S.COMPRA")) setNextValueCell(row, c, lessorInvoiceCents / 100);
        else if (txt.startsWith("LOCADOR")) setNextValueCell(row, c, contractItem?.supplierName || asset.lessorName || "—");
        else if (txt.startsWith("N FROTA") || txt.startsWith("Nº FROTA") || txt.includes("FROTA")) setNextValueCell(row, c, asset.fleetNumber || "—");
        else if (txt.startsWith("CANTEIRO")) setNextValueCell(row, c, asset.costCenter || "—");
        else if (txt.startsWith("MOTORISTA")) setNextValueCell(row, c, asset.operatorName || "—");
        else if (txt.startsWith("INICIO CONTRATO")) setNextValueCell(row, c, contractItem?.itemStartsAt?.split("-").reverse().join("/") || "—");
        else if (txt.startsWith("RESC. CONTRATO") || txt.startsWith("RESC CONTRATO")) setNextValueCell(row, c, contractItem?.itemEndsAt?.split("-").reverse().join("/") || "—");
        else if (txt.startsWith("COMB. TIPO") || txt.startsWith("COMB.TIPO")) cell.value = `COMB. TIPO 燃料类型\n${asset.fuelType || "—"}`;
        else if (txt.startsWith("PERIODO")) cell.value = `PERÍODO 月份\n${periodLabel}`;
        else if (txt.startsWith("DATA")) cell.value = `DATA 打印日期\n${printDate}`;
        else if (txt === "DIA" || txt.startsWith("DIA\n") || txt.startsWith("DIA ")) {
          headerRow = rowNumber;
          dayCol = c;
        } else if (txt.includes("TOTAL KM") || txt.includes("TOTAL HR") || txt.startsWith("COD:")) {
          totalKmRow = rowNumber;
        }
      }
    });

    const dates: string[] = [];
    const cursor = new Date(`${periodStart}T00:00:00Z`);
    const last = new Date(`${periodEnd}T00:00:00Z`);
    while (cursor <= last) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const dailyByDate = new Map(entries.map((row) => [row.entryDate, row]));
    const fuelsByDate = new Map<string, { litersMilli: number; totalCents: number; stations: string[] }>();
    for (const row of fuels) {
      const current = fuelsByDate.get(row.entryDate) || { litersMilli: 0, totalCents: 0, stations: [] };
      current.litersMilli += Number(row.litersMilli || 0);
      current.totalCents += Number(row.totalCents || 0);
      if (row.station && !current.stations.includes(row.station)) current.stations.push(row.station);
      fuelsByDate.set(row.entryDate, current);
    }
    const servicesByDate = new Map<string, typeof serviceItems>();
    for (const row of serviceItems) {
      if (!row.closedAt) continue;
      servicesByDate.set(row.closedAt, [...(servicesByDate.get(row.closedAt) || []), row]);
    }

    let firstDayRow = headerRow > 0 ? headerRow + 2 : 12;
    while (firstDayRow < (totalKmRow || 50)) {
      const probe = norm(sheet.getRow(firstDayRow).getCell(dayCol + 3).value);
      if (!probe.includes("INICIAL") && !probe.includes("FINAL")) break;
      firstDayRow++;
    }
    const maxDaySlots = totalKmRow > firstDayRow ? totalKmRow - firstDayRow : 31;
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

    let totalKm = 0;
    let totalLiters = 0;
    let totalFuel = 0;
    let totalServices = 0;

    for (let i = 0; i < maxDaySlots; i++) {
      const r = sheet.getRow(firstDayRow + i);
      const day = dates[i];
      if (!day) {
        for (let c = dayCol; c <= dayCol + 13; c++) r.getCell(c).master.value = null;
        continue;
      }

      const entry = dailyByDate.get(day);
      const fuel = fuelsByDate.get(day);
      const services = servicesByDate.get(day) || [];

      const start = entry?.kilometerStart ?? entry?.hourmeterStart;
      const end = entry?.kilometerEnd ?? entry?.hourmeterEnd;
      const distance = start != null && end != null ? Math.round((Number(end) - Number(start)) * 100) / 100 : 0;
      const liters = Math.round((Number(fuel?.litersMilli || 0) / 1000) * 1000) / 1000;
      const fuelValue = Math.round((Number(fuel?.totalCents || 0) / 100) * 100) / 100;
      const serviceValue = Math.round((services.reduce((sum, item) => sum + Number(item.totalCents || 0), 0) / 100) * 100) / 100;

      totalKm = Math.round((totalKm + distance) * 100) / 100;
      totalLiters = Math.round((totalLiters + liters) * 1000) / 1000;
      totalFuel = Math.round((totalFuel + fuelValue) * 100) / 100;
      totalServices = Math.round((totalServices + serviceValue) * 100) / 100;

      r.getCell(dayCol).master.value = `${day.slice(8, 10)}/${day.slice(5, 7)}`;
      r.getCell(dayCol + 1).master.value = weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()];
      r.getCell(dayCol + 2).master.value = entry?.status || "";
      r.getCell(dayCol + 3).master.value = start != null ? Number(start) : null;
      r.getCell(dayCol + 4).master.value = end != null ? Number(end) : null;
      r.getCell(dayCol + 5).master.value = distance || null;
      r.getCell(dayCol + 6).master.value = liters || null;
      r.getCell(dayCol + 7).master.value = liters ? Math.round((fuelValue / liters) * 1000) / 1000 : null;
      r.getCell(dayCol + 8).master.value = fuelValue || null;
      r.getCell(dayCol + 9).master.value = fuel?.stations?.join(", ") || "";
      r.getCell(dayCol + 10).master.value = services.map((item) => `${item.orderNumber} ${item.productService}`).join("; ");
      r.getCell(dayCol + 11).master.value = serviceValue || null;
      r.getCell(dayCol + 12).master.value = services.map((item) => item.invoiceNumber).filter(Boolean).join(", ");
      r.getCell(dayCol + 13).master.value = services.some((item) => item.paymentResponsibility === "lessor")
        ? "LOCADOR"
        : services.some((item) => item.paymentResponsibility === "company_charge_lessor")
          ? "DESCONTO LOCADOR"
          : services.length
            ? "POWERCHINA"
            : "";
    }

    if (totalKmRow > 0) {
      const tr = sheet.getRow(totalKmRow);
      tr.getCell(dayCol).master.value = `CÓD: ${asset.fleetNumber}`;
      tr.getCell(dayCol + 5).master.value = totalKm;
      tr.getCell(dayCol + 6).master.value = totalLiters;
      tr.getCell(dayCol + 8).master.value = totalFuel;
      tr.getCell(dayCol + 11).master.value = totalServices;
    }

    const reimbursement = (financial.reimbursementCents + quick.reimbursementCents) / 100;
    const osDiscount = financial.lessorChargeCents / 100;
    const maintenanceDiscount = ap.discountCents / 100;
    const tireWashLub = (financial.tireWashLubricationCents + quick.tireCents + quick.washCents) / 100;
    const mobilization = movementCents / 100;
    const partsServices = financial.partsServicesCents / 100;
    const totalDiscounts = maintenanceDiscount + osDiscount;
    const netInvoice = lessorInvoiceCents / 100;
    const totalGross = netInvoice + totalDiscounts;

    sheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
      if (rowNumber <= totalKmRow) return;
      for (let c = 1; c <= 14; c++) {
        const cell = row.getCell(c);
        if (cell.master && cell.master !== cell) continue;
        const txt = norm(cell.value);
        if (!txt) continue;

        if (txt.startsWith("DIAS TRABALHADOS")) { row.getCell(4).value = ap.counts.T; row.getCell(5).value = (ap.counts.T * ap.dailyValueCents) / 100; }
        else if (txt.startsWith("DIAS A DISPOSICAO")) { row.getCell(4).value = ap.counts.D; row.getCell(5).value = (ap.counts.D * ap.dailyValueCents) / 100; }
        else if (txt.startsWith("DIAS EM MANUTENCAO")) { row.getCell(4).value = ap.counts.M; row.getCell(5).value = maintenanceDiscount; }
        else if (txt.startsWith("TOTAL DE DIAS")) { row.getCell(4).value = ap.paidDays; row.getCell(5).value = ap.payableCents / 100; }
        else if (txt.startsWith("REEMBOLSO DE AVARIAS")) { row.getCell(5).value = reimbursement; }
        else if (txt.startsWith("MAO DE OBRA")) { row.getCell(5).value = 0; }
        else if (txt.startsWith("BORRACHARIA")) { row.getCell(5).value = tireWashLub; }
        else if (txt.startsWith("MOBILIZACAO")) { row.getCell(5).value = mobilization; }
        else if (txt.startsWith("OUTROS DESCONTOS")) { row.getCell(5).value = osDiscount; }
        else if (txt.startsWith("PECAS / SERVICOS")) { row.getCell(5).value = partsServices; }
        else if (txt.startsWith("TOTAL DE DESCONTOS")) { row.getCell(5).value = totalDiscounts; }
        else if (txt.startsWith("TOTAL BRUTO")) { row.getCell(5).value = totalGross; }
        else if (txt.startsWith("TOTAL LIQUIDO")) { row.getCell(5).value = netInvoice; }
        else if (txt.startsWith("QUILOMETRAGEM MES")) { row.getCell(13).value = totalKm; }
        else if (txt.startsWith("COMBUSTIVEL / LITRO")) { row.getCell(13).value = totalLiters; }
        else if (txt.startsWith("MEDIA HO / KM")) { row.getCell(13).value = totalLiters ? Math.round((totalKm / totalLiters) * 100) / 100 : 0; }
        else if (txt.startsWith("VL CONSUMO COMBUSTIVEL")) { row.getCell(13).value = totalFuel; }
        else if (txt.startsWith("MEDIA LITRO COMBUSTIVEL")) { row.getCell(13).value = totalLiters ? Math.round((totalFuel / totalLiters) * 100) / 100 : 0; }
        else if (txt.startsWith("CUSTO MEDIO DIARIO")) { row.getCell(13).value = ap.paidDays ? Math.round((netInvoice / ap.paidDays) * 100) / 100 : 0; }
        else if (txt.startsWith("OBSERVACOES GERAIS")) { row.getCell(10).value = generalObservation || ""; }
        else if (txt.startsWith("VALOR TOTAL DO CONTRATO")) { row.getCell(13).value = contractItem ? Number(contractItem.contractTotalCents || 0) / 100 : "—"; }
        else if (txt.startsWith("SALDO DO CONTRATO")) { row.getCell(13).value = contractBalanceAfterCents != null ? contractBalanceAfterCents / 100 : "—"; }
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="Apropriacao_${asset.fleetNumber}_${referenceMonth}.xlsx"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}


