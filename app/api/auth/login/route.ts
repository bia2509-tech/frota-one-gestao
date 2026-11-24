import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, companyUsers, userModulePermissions } from "@/db/schema";
import { apiError } from "@/lib/tenant";
import { LOCAL_SESSION_COOKIE, randomSecret, sha256, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "", password = body.password || "";
    if (!email || !password) return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
    const candidates = await getDb().select().from(companyUsers).where(and(eq(companyUsers.email, email), eq(companyUsers.active, true)));
    let account = null as (typeof candidates)[number] | null;
    for (const candidate of candidates) if (candidate.passwordHash && await verifyPassword(password, candidate.passwordHash)) { account = candidate; break; }
    if (!account) return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    if (!["super_admin", "company_admin"].includes(account.role)) {
      const [permission] = await getDb().select({ id: userModulePermissions.id }).from(userModulePermissions)
        .where(and(eq(userModulePermissions.companyUserId, account.id), eq(userModulePermissions.canView, true))).limit(1);
      if (!permission) return Response.json({ error: "Seu acesso ainda não foi autorizado para nenhum módulo." }, { status: 403 });
    }
    const token = randomSecret(), now = new Date(), expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    await getDb().insert(authSessions).values({ id: crypto.randomUUID(), companyUserId: account.id, tokenHash: await sha256(token), expiresAt, createdAt: now.toISOString(), revokedAt: null });
    return Response.json({ authenticated: true, user: { name: account.displayName || email, email } }, { headers: { "Set-Cookie": `${LOCAL_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` } });
  } catch (error) { return apiError(error); }
}
