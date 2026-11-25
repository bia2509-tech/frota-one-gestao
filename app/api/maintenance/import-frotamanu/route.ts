import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { equipment, maintenanceOrders } from "@/db/schema";
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

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; rows?: ImportRow[] };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "maintenance", "create");
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
    const result = { created: 0, duplicates: 0, rejected: [] as { row: number; reason: string }[] };

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
      const description = [source.cause, source.description].filter(Boolean).join(" — ").trim() || "Manutenção operacional importada do FrotaManu.com";
      const type = source.maintenanceType?.trim() || "Manutenção operacional";
      const key = `${asset.id}|${start}|${clean(description)}`;
      if (seenKeys.has(key)) { result.duplicates++; continue; }
      seenKeys.add(key);
      const existing = existingOrders.find((candidate) => candidate.equipmentId === asset.id && candidate.orderKind === "daily_maintenance" && candidate.startedAt.slice(0, 10) === start && clean(candidate.description) === clean(description));
      if (existing) { result.duplicates++; continue; }

      nextNumber++;
      const orderId = crypto.randomUUID();
      // PREV. SAÍDA ATUAL is the source of truth for the actual close date.
      // A completion label alone is not enough to close an imported order.
      const closed = Boolean(actualEnd);
      const closedAt = actualEnd || null;
      const orderNumber = String(nextNumber).padStart(4, "0");
      await db.insert(maintenanceOrders).values({
        id: orderId, companyId, equipmentId: asset.id, orderNumber, orderKind: "daily_maintenance",
        maintenanceType: type, maintenanceStatus: [closed ? "Encerrada" : "Em andamento", source.totalHours != null ? `Total de horas: ${source.totalHours}` : "", "Importada do FrotaManu.com"].filter(Boolean).join("  ·  "),
        maintenanceFormType: "maintenance", description, startedAt: start, closedAt,
        status: closed ? "closed" : "open", maintenanceLocation: source.worksite?.trim() || asset.projectName || null,
        costCenter: asset.costCenter || null, serviceType: "Manutenção operacional (FrotaManu.com)",
        kilometer: null, hourmeter: null, requestedBy: access.user.userId, preparedBy: access.user.userId, notifyLessor: false,
      });
      existingOrders.push({ id: orderId, companyId, equipmentId: asset.id, orderNumber, orderKind: "daily_maintenance", startedAt: start, closedAt, description } as typeof existingOrders[number]);
      if (!closed) await db.update(equipment).set({ status: "maintenance" }).where(and(eq(equipment.id, asset.id), eq(equipment.companyId, companyId)));
      result.created++;
    }
    return Response.json({ result });
  } catch (error) { return apiError(error); }
}
