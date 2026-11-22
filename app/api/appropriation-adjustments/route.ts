import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appropriationAdjustments } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

const allowedFields = new Set([
  "monthlyCents", "workedDays", "measuredCents", "mobilizationCents",
  "demobilizationCents", "reimbursementCents", "discountCents", "observation",
]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const referenceMonth = url.searchParams.get("referenceMonth") || "";
    const periodStart = url.searchParams.get("periodStart") || "";
    const periodEnd = url.searchParams.get("periodEnd") || "";
    await requirePermission(companyId, "appropriation", "view");
    const filters = [eq(appropriationAdjustments.companyId, companyId)];
    if (referenceMonth) filters.push(eq(appropriationAdjustments.referenceMonth, referenceMonth));
    if (periodStart) filters.push(eq(appropriationAdjustments.periodStart, periodStart));
    if (periodEnd) filters.push(eq(appropriationAdjustments.periodEnd, periodEnd));
    const history = await getDb().select().from(appropriationAdjustments)
      .where(and(...filters)).orderBy(asc(appropriationAdjustments.createdAt));
    return Response.json({ history });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "");
    const access = await requirePermission(companyId, "appropriation", "update");
    const justification = String(body.justification || "").trim();
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (justification.length < 5) return Response.json({ error: "Informe uma justificativa com pelo menos 5 caracteres." }, { status: 400 });
    if (!/^\d{4}-\d{2}$/.test(body.referenceMonth || "") || !body.periodStart || !body.periodEnd)
      return Response.json({ error: "Competência e período são obrigatórios." }, { status: 400 });
    if (!changes.length) return Response.json({ error: "Nenhuma alteração foi identificada." }, { status: 400 });
    if (changes.some((change: any) => !change.itemId || !allowedFields.has(change.fieldName) || String(change.oldValue) === String(change.newValue)))
      return Response.json({ error: "A correção contém campos inválidos ou sem alteração." }, { status: 400 });
    const correctionId = crypto.randomUUID(), createdAt = new Date().toISOString();
    const rows = changes.map((change: any) => ({
      id: crypto.randomUUID(), correctionId, companyId,
      equipmentId: change.equipmentId || null, itemId: String(change.itemId),
      scope: body.scope === "appropriation" ? "appropriation" as const : "measurement" as const,
      referenceMonth: body.referenceMonth, periodStart: body.periodStart, periodEnd: body.periodEnd,
      supplierName: body.supplierName ? String(body.supplierName) : null,
      fieldName: String(change.fieldName), oldValue: String(change.oldValue ?? ""), newValue: String(change.newValue ?? ""),
      justification, createdBy: access.user.userId,
      createdByName: access.user.displayName || access.user.email || "Usuário administrador", createdAt,
    }));
    await getDb().insert(appropriationAdjustments).values(rows);
    return Response.json({ correctionId, saved: rows.length, createdAt }, { status: 201 });
  } catch (error) { return apiError(error); }
}
