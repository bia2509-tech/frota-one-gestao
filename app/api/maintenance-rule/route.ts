import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { masterData } from "@/db/schema";
import { getMaintenanceGraceDays, MAINTENANCE_GRACE_CODE, MAINTENANCE_RULE_TYPE } from "@/lib/maintenance-rule";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") || "";
    await requirePermission(companyId, "appropriation", "view");
    const graceDays = await getMaintenanceGraceDays(companyId);
    return Response.json({ graceDays, discountStartsOnDay: graceDays + 1 });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; graceDays?: number };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "appropriation", "update");
    const graceDays = Number(body.graceDays);
    if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 30)
      return Response.json({ error: "Informe um prazo de abono entre 0 e 30 dias." }, { status: 400 });
    const db = getDb();
    const [existing] = await db.select({ id: masterData.id }).from(masterData).where(and(
      eq(masterData.companyId, companyId),
      eq(masterData.type, MAINTENANCE_RULE_TYPE),
      eq(masterData.code, MAINTENANCE_GRACE_CODE),
    )).limit(1);
    const now = new Date().toISOString();
    if (existing) await db.update(masterData).set({ name: String(graceDays), description: `Abono de manutenção: ${graceDays} dia(s). Desconto a partir do ${graceDays + 1}º dia contínuo, incluindo todo o período.`, updatedAt: now }).where(eq(masterData.id, existing.id));
    else await db.insert(masterData).values({ id: crypto.randomUUID(), companyId, type: MAINTENANCE_RULE_TYPE, code: MAINTENANCE_GRACE_CODE, name: String(graceDays), description: `Abono de manutenção: ${graceDays} dia(s). Desconto a partir do ${graceDays + 1}º dia contínuo, incluindo todo o período.`, active: true, createdBy: access.user.userId, createdAt: now, updatedAt: now });
    return Response.json({ graceDays, discountStartsOnDay: graceDays + 1, message: "Regra de manutenção atualizada." });
  } catch (error) { return apiError(error); }
}
