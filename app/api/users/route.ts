import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, companyUsers } from "@/db/schema";
import { apiError, requireCompanyAccess } from "@/lib/tenant";

const roles = ["super_admin", "company_admin", "manager", "operator", "viewer"] as const;
type Role = (typeof roles)[number];

async function requireAdmin(companyId: string) {
  const access = await requireCompanyAccess(companyId, true);
  if (!['super_admin', 'company_admin'].includes(access.membership.role))
    throw new Response("Somente administradores podem gerenciar usuários.", { status: 403 });
  return access;
}

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") || "";
    await requireAdmin(companyId);
    const users = await getDb().select().from(companyUsers).where(eq(companyUsers.companyId, companyId));
    return Response.json({ users });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; name?: string; email?: string; role?: Role };
    const companyId = body.companyId || "", name = body.name?.trim() || "", email = body.email?.trim().toLowerCase() || "", role = body.role || "viewer";
    const access = await requireAdmin(companyId);
    if (!name || !email || !email.includes("@") || !roles.includes(role)) return Response.json({ error: "Nome, e-mail e perfil são obrigatórios." }, { status: 400 });
    if (role === "super_admin" && access.membership.role !== "super_admin") return Response.json({ error: "Somente o administrador geral pode conceder este perfil." }, { status: 403 });
    const id = crypto.randomUUID(), now = new Date().toISOString(), db = getDb();
    await db.batch([
      db.insert(companyUsers).values({ id, companyId, userId: `pending:${email}`, displayName: name, email, role, active: true }),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "user.created", entity: "company_user", entityId: id, createdAt: now }),
    ]);
    return Response.json({ id, displayName: name, email, role, active: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; companyUserId?: string; role?: Role; active?: boolean };
    const companyId = body.companyId || "", companyUserId = body.companyUserId || "";
    const access = await requireAdmin(companyId);
    const db = getDb();
    const [target] = await db.select().from(companyUsers).where(and(eq(companyUsers.id, companyUserId), eq(companyUsers.companyId, companyId))).limit(1);
    if (!target) return Response.json({ error: "Usuário não encontrado nesta empresa." }, { status: 404 });
    if (body.role === "super_admin" && access.membership.role !== "super_admin") return Response.json({ error: "Somente o administrador geral pode conceder este perfil." }, { status: 403 });
    const changes: { role?: Role; active?: boolean } = {};
    if (body.role && roles.includes(body.role)) changes.role = body.role;
    if (typeof body.active === "boolean") changes.active = body.active;
    await db.batch([
      db.update(companyUsers).set(changes).where(eq(companyUsers.id, target.id)),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "user.updated", entity: "company_user", entityId: target.id, createdAt: new Date().toISOString() }),
    ]);
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}
