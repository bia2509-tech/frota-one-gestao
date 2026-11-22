import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { masterData } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { ensureSepcoVmeProfessionals } from "@/lib/sepco-vme-bootstrap";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const type = url.searchParams.get("type") || "";
    const access = await requirePermission(companyId, "master_data", "view");
    if (type === "checklist_item") return Response.json({ error: "O cadastro de itens de checklist foi removido do sistema." }, { status: 410 });
    if (type === "profissional") await ensureSepcoVmeProfessionals(companyId, access.user.userId);
    const rows = await getDb().select().from(masterData)
      .where(and(eq(masterData.companyId, companyId), eq(masterData.type, type)))
      .orderBy(asc(masterData.name));
    return Response.json({ records: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; type?: string; code?: string; name?: string; description?: string; records?: Array<{ code?: string; name?: string; description?: string; active?: boolean }> };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "master_data", "create");
    if (body.type === "profissional" && Array.isArray(body.records)) {
      const incoming = body.records
        .filter((row) => row.name?.trim())
        .filter((row) => { try { const job = JSON.parse(row.description || "{}").job || ""; return /MECANIC|SUPERVISOR.*TRANSPORTE|ENCARREGADO.*TRANSPORTE/i.test(job); } catch { return false; } })
        .slice(0, 2500);
      const now = new Date().toISOString();
      for (let index = 0; index < incoming.length; index += 80) {
        const statements = incoming.slice(index, index + 80).map((row) =>
          getDb().insert(masterData).values({
            id: crypto.randomUUID(), companyId, type: "profissional",
            code: row.code?.trim() || null, name: row.name!.trim(),
            description: row.description?.trim() || null, active: row.active ?? true,
            createdBy: access.user.userId, createdAt: now, updatedAt: now,
          }).onConflictDoUpdate({
            target: [masterData.companyId, masterData.type, masterData.code, masterData.name],
            set: { code: row.code?.trim() || null, description: row.description?.trim() || null, active: row.active ?? true, updatedAt: now },
          })
        );
        await getDb().batch(statements as [typeof statements[number], ...typeof statements[number][]]);
      }
      return Response.json({ imported: incoming.length, ignored: body.records.length - incoming.length });
    }
    if (!body.type?.trim() || !body.name?.trim()) return Response.json({ error: "Tipo e nome são obrigatórios." }, { status: 400 });
    if (body.type === "checklist_item") return Response.json({ error: "O cadastro de itens de checklist foi removido do sistema." }, { status: 410 });
    const code = body.code?.trim() || "";
    if (code) {
      const [duplicate] = await getDb().select({ id: masterData.id, name: masterData.name }).from(masterData)
        .where(and(eq(masterData.companyId, companyId), eq(masterData.type, body.type.trim()), eq(masterData.code, code))).limit(1);
      if (duplicate) return Response.json({ error: `O código ${code} já está cadastrado em “${duplicate.name}”. Informe um código diferente.` }, { status: 409 });
    }
    const now = new Date().toISOString();
    const record = { id: crypto.randomUUID(), companyId, type: body.type.trim(), code: code || null, name: body.name.trim(), description: body.description?.trim() || null, active: true, createdBy: access.user.userId, createdAt: now, updatedAt: now };
    await getDb().insert(masterData).values(record);
    return Response.json({ record }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; id?: string; code?: string; name?: string; description?: string; active?: boolean };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "master_data", "update");
    if (!body.id || !body.name?.trim()) return Response.json({ error: "Registro e nome são obrigatórios." }, { status: 400 });
    const [current] = await getDb().select({ type: masterData.type }).from(masterData).where(and(eq(masterData.id, body.id), eq(masterData.companyId, companyId))).limit(1);
    if (!current) return Response.json({ error: "Cadastro não encontrado." }, { status: 404 });
    if (current.type === "checklist_item") return Response.json({ error: "O cadastro de itens de checklist foi removido do sistema." }, { status: 410 });
    const code = body.code?.trim() || "";
    if (code) {
      const [duplicate] = await getDb().select({ id: masterData.id, name: masterData.name }).from(masterData)
        .where(and(eq(masterData.companyId, companyId), eq(masterData.type, current.type), eq(masterData.code, code), ne(masterData.id, body.id))).limit(1);
      if (duplicate) return Response.json({ error: `O código ${code} já está cadastrado em “${duplicate.name}”. Informe um código diferente.` }, { status: 409 });
    }
    await getDb().update(masterData).set({ code: code || null, name: body.name.trim(), description: body.description?.trim() || null, active: body.active ?? true, updatedAt: new Date().toISOString() })
      .where(and(eq(masterData.id, body.id), eq(masterData.companyId, companyId)));
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const id = url.searchParams.get("id") || "";
    await requirePermission(companyId, "master_data", "delete");
    await getDb().delete(masterData).where(and(eq(masterData.id, id), eq(masterData.companyId, companyId)));
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
