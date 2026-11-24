import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, companyUsers, userModulePermissions } from "@/db/schema";
import { apiError, requireCompanyAccess } from "@/lib/tenant";
import { hashPassword, randomSecret, sha256 } from "@/lib/auth";

async function requireAdmin(companyId: string) {
  const access = await requireCompanyAccess(companyId, true);
  if (!["super_admin", "company_admin"].includes(access.membership.role)) throw new Response("Somente administradores podem convidar usuários.", { status: 403 });
  return access;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; companyUserId?: string };
    const companyId = body.companyId || "", companyUserId = body.companyUserId || "", access = await requireAdmin(companyId), db = getDb();
    const [user] = await db.select().from(companyUsers).where(and(eq(companyUsers.id, companyUserId), eq(companyUsers.companyId, companyId), eq(companyUsers.active, true))).limit(1);
    if (!user?.email) return Response.json({ error: "Usuário ativo não encontrado." }, { status: 404 });
    if (user.role === "super_admin") return Response.json({ error: "O perfil de administrador geral deve usar o acesso institucional." }, { status: 409 });
    if (user.role !== "company_admin") {
      const [approvedModule] = await db.select({ id: userModulePermissions.id }).from(userModulePermissions).where(and(eq(userModulePermissions.companyUserId, user.id), eq(userModulePermissions.canView, true))).limit(1);
      if (!approvedModule) return Response.json({ error: "Aprove pelo menos um módulo e salve as permissões antes de gerar o convite." }, { status: 409 });
    }
    const token = randomSecret(), tokenHash = await sha256(token), now = new Date(), expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    await db.batch([
      db.update(companyUsers).set({ inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt }).where(eq(companyUsers.id, user.id)),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "user.invitation.created", entity: "company_user", entityId: user.id, createdAt: now.toISOString() }),
    ]);
    return Response.json({ invitationUrl: `/create-password?token=${encodeURIComponent(token)}`, expiresAt, email: user.email });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    const token = body.token || "", password = body.password || "";
    if (!/^[a-f0-9]{64}$/i.test(token)) return Response.json({ error: "Convite inválido ou expirado." }, { status: 400 });
    if (password.length < 12) return Response.json({ error: "A senha precisa ter pelo menos 12 caracteres." }, { status: 400 });
    const db = getDb(), tokenHash = await sha256(token), now = new Date().toISOString();
    const [user] = await db.select().from(companyUsers).where(and(eq(companyUsers.inviteTokenHash, tokenHash), gt(companyUsers.inviteExpiresAt, now), eq(companyUsers.active, true))).limit(1);
    if (!user) return Response.json({ error: "Convite inválido ou expirado. Peça ao administrador para gerar outro." }, { status: 400 });
    await db.update(companyUsers).set({ passwordHash: await hashPassword(password), inviteTokenHash: null, inviteExpiresAt: null }).where(eq(companyUsers.id, user.id));
    await db.insert(auditLog).values({ id: crypto.randomUUID(), companyId: user.companyId, userId: `local:${user.id}`, action: "user.password.created", entity: "company_user", entityId: user.id, createdAt: now });
    return Response.json({ passwordCreated: true });
  } catch (error) { return apiError(error); }
}
