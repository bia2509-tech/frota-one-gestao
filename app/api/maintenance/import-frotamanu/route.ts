import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyPartEntries, equipment, maintenanceOrders } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

type ImportRow = {
  itemNumber?: string;
  fleetNumber?: string;
  plate?: string;
  entryDate?: string;
  actualExitDate?: string;
  isClosed?: boolean;
  worksite?: string;
  maintenanceType?: string;
  maintenanceStatus?: string;
  cause?: string;
  description?: string;
  totalHours?: number | null;
};

const clean = (value = "") => value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
const validDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));

function listInclusiveDates(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startIso.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endIso.slice(0, 10).split("-").map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return dates;
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  let guard = 0;
  while (cur <= end && guard < 366) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return dates;
}

async function syncDailyPartsForMaintenance(
  db: any,
  companyId: string,
  equipmentId: string,
  maintenanceOrderId: string,
  startIso: string,
  endIso: string | null,
  description: string
) {
  const effectiveEnd = endIso || new Date().toISOString().slice(0, 10);
  const days = listInclusiveDates(startIso, effectiveEnd);
  for (const day of days) {
    const existing = await db
      .select({ id: dailyPartEntries.id })
      .from(dailyPartEntries)
      .where(and(eq(dailyPartEntries.companyId, companyId), eq(dailyPartEntries.equipmentId, equipmentId), eq(dailyPartEntries.entryDate, day)))
      .limit(1);
    if (existing[0]) {
      await db
        .update(dailyPartEntries)
        .set({
          status: "maintenance",
          maintenanceOrderId,
          observation: description,
        })
        .where(eq(dailyPartEntries.id, existing[0].id));
    } else {
      await db.insert(dailyPartEntries).values({
        id: crypto.randomUUID(),
        companyId,
        equipmentId,
        entryDate: day,
        status: "maintenance",
        maintenanceOrderId,
        entryChecklistStatus: "pending",
        observation: description,
      });
    }
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; rows?: ImportRow[] };
    const companyId = body.companyId || "";
    const syncKeyHeader = request.headers.get("x-frotamanu-key"); const validApiKey = Boolean(process.env.FROTAMANU_SYNC_KEY && syncKeyHeader === process.env.FROTAMANU_SYNC_KEY); const access = validApiKey ? { user: { userId: null } } : await requirePermission(companyId, "maintenance", "create");
    if (!Array.isArray(body.rows) || !body.rows.length)
      return Response.json({ error: "A planilha não contém linhas de manutenção para importar." }, { status: 400 });

    const db = getDb();
    const [assets, existingOrders] = await Promise.all([
      db.select().from(equipment).where(eq(equipment.companyId, companyId)),
      db.select().from(maintenanceOrders).where(eq(maintenanceOrders.companyId, companyId)),
    ]);
    let nextNumber = existingOrders.reduce((highest, row) => {
      const digits = row.orderNumber.match(/\d+/g)?.at(-1);
      return Math.max(highest, digits ? Number(digits) : 0);
    }, 0);
    const seenKeys = new Set<string>();
    const result = { created: 0, updated: 0, duplicates: 0, rejected: [] as { row: number; reason: string }[] }; const batchOps: any[] = [];

    for (let index = 0; index < body.rows.length; index++) {
      const source = body.rows[index];
      const rowNumber = Number(source.itemNumber) || index + 1;
      const fleet = clean(source.fleetNumber || "");
      const plate = clean(source.plate || "").replace(/[^A-Z0-9]/g, "");
      const asset = assets.find((candidate) => clean(candidate.fleetNumber) === fleet || (!!plate && clean(candidate.plate || "").replace(/[^A-Z0-9]/g, "") === plate));
      if (!asset) { result.rejected.push({ row: rowNumber, reason: `Equipamento não encontrado: ${source.fleetNumber || source.plate || "sem ID/placa"}.` }); continue; }
      const start = source.entryDate || "";
      const actualEnd = source.actualExitDate || "";
      if (!validDate(start)) { result.rejected.push({ row: rowNumber, reason: "Data de entrada inválida." }); continue; }
      if (actualEnd && !validDate(actualEnd)) { result.rejected.push({ row: rowNumber, reason: "Data de saída real inválida." }); continue; }
      if (actualEnd && actualEnd < start) { result.rejected.push({ row: rowNumber, reason: "A data de saída é anterior à entrada." }); continue; }
      const description = ([source.cause, source.description].filter(Boolean).join(" — ").trim() || "Manutenção operacional importada do FrotaManu.com").replace(/local:[a-f0-9-]{8,}/gi, "FrotaManu.com");
      const type = source.maintenanceType?.trim() || "Manutenção operacional";
      const key = `${asset.id}|${start}|${clean(description)}`;
      if (seenKeys.has(key)) { result.duplicates++; continue; }
      seenKeys.add(key);
      const incomingOrderNum = String((source as any).orderNumber || "").trim(); const existing = existingOrders.find((candidate) => candidate.equipmentId === asset.id && candidate.orderKind === "daily_maintenance" && candidate.startedAt.slice(0, 10) === start && clean(candidate.description) === clean(description));
      const rawSt = String((source as any).status || (source as any).maintenanceStatus || (source as any).situacao || "").toLowerCase(); const isDoneSt = /conclu|finalizad|encerrad/.test(rawSt); const closed = Boolean(actualEnd) || isDoneSt || Boolean((source as any).isClosed); const closedAt = actualEnd || (isDoneSt ? start : null); if (existing) {
  const wasAlreadyCompletedLabel = /conclu[ií]d|finalizad|encerrad/i.test(String(existing.maintenanceStatus || "")); if ((closed || wasAlreadyCompletedLabel) && existing.status !== "closed") {
    await db
      .update(maintenanceOrders)
      .set({
        status: "closed",
        orderNumber: incomingOrderNum || existing.orderNumber, maintenanceType, maintenanceStatus: "Encerrada",
        closedAt: closedAt || existing.startedAt || start,
        description,
      })
      .where(eq(maintenanceOrders.id, existing.id));
    await db
      .update(equipment)
      .set({ status: "active" })
      .where(and(eq(equipment.id, asset.id), eq(equipment.companyId, companyId)));
    result.updated = (result.updated || 0) + 1;
  } else {
    result.duplicates++;
  }
  continue;
}

      nextNumber++;
      const orderId = crypto.randomUUID();
      // PREV. SAÍDA ATUAL is the source of truth for the actual close date.
      // A completion label alone is not enough to close an imported order.
  
  
      const orderNumber = incomingOrderNum || String(nextNumber).padStart(4, "0");
      batchOps.push(db.insert(maintenanceOrders).values({
        id: orderId, companyId, equipmentId: asset.id, orderNumber, orderKind: "daily_maintenance",
        maintenanceType: type, maintenanceStatus: [closed ? "Encerrada" : "Em andamento", source.totalHours != null ? `Total de horas: ${source.totalHours}` : "", "Importada do FrotaManu.com"].filter(Boolean).join("  ·  "),
        maintenanceFormType: "maintenance", description, startedAt: start, closedAt,
        status: closed ? "closed" : "open", maintenanceLocation: source.worksite?.trim() || asset.projectName || null,
        costCenter: asset.costCenter || null, serviceType: "Manutenção operacional (FrotaManu.com)",
        kilometer: null, hourmeter: null, requestedBy: access.user.userId, preparedBy: access.user.userId, notifyLessor: false,
      }));
      existingOrders.push({ id: orderId, companyId, equipmentId: asset.id, orderNumber, orderKind: "daily_maintenance", status: closed ? "closed" : "open", startedAt: start, closedAt, maintenanceStatus: closed ? "Encerrada" : "Em andamento", description } as any);
      batchOps.push(db.update(equipment).set({ status: closed ? "active" : "maintenance" }).where(and(eq(equipment.id, asset.id), eq(equipment.companyId, companyId)))); result.created++;
    }
    for (let i = 0; i < batchOps.length; i += 40) { await (db as any).batch(batchOps.slice(i, i + 40)); } return Response.json({ result });
  } catch (error: any) { return Response.json({ error: error?.message || "Erro ao importar planilha FrotaManu." }, { status: 500 }); }
}
