import { and, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { auditLog, authSessions, companyUsers } from "@/db/schema";
import { apiError } from "@/lib/tenant";
import { hashPassword, randomSecret, sha256, LOCAL_SESSION_COOKIE } from "@/lib/auth";

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function POST(request: Request) {
  try {
    const bootstrapToken = env.MASTER_BOOTSTRAP_TOKEN || "";
    if (!bootstrapToken) return Response.json({ error: "A configuração inicial do administrador ainda não foi habilitada no Cloudflare." }, { status: 503 });
    const body = await request.json() as { email?: string; token?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || "", suppliedToken = body.token || "", password = body.password || "";
    if (!email || !suppliedToken || !password) return Response.json({ error: "Informe o e-mail master, o código de configuração e a nova senha." }, { status: 400 });
    if (!constantTimeEqual(await sha256(suppliedToken), await sha256(bootstrapToken))) return Response.json({ error: "Código de configuração inválido." }, { status: 401 });
    if (password.length < 12) return Response.json({ error: "A senha precisa ter pelo menos 12 caracteres." }, { status: 400 });

    const db = getDb();
    const [account] = await db.select().from(companyUsers).where(and(
      eq(companyUsers.email, email), eq(companyUsers.role, "super_admin"), eq(companyUsers.active, true), isNull(companyUsers.passwordHash),
    )).limit(1);
    if (!account) return Response.json({ error: "Não encontrei uma conta master ativa, sem senha local, com esse e-mail." }, { status: 404 });

    const passwordHash = await hashPassword(password), now = new Date().toISOString();
    const changed = await db.update(companyUsers).set({ passwordHash, inviteTokenHash: null, inviteExpiresAt: null })
      .where(and(eq(companyUsers.id, account.id), eq(companyUsers.role, "super_admin"), eq(companyUsers.active, true), isNull(companyUsers.passwordHash)))
      .returning({ id: companyUsers.id });
    if (!changed.length) return Response.json({ error: "A conta master já foi configurada. Use o login por e-mail e senha." }, { status: 409 });

    const token = randomSecret(), expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await db.batch([
      db.insert(authSessions).values({ id: crypto.randomUUID(), companyUserId: account.id, tokenHash: await sha256(token), expiresAt, createdAt: now, revokedAt: null }),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId: account.companyId, userId: `bootstrap:${account.email}`, action: "user.master_password.created", entity: "company_user", entityId: account.id, createdAt: now }),
    ]);
    return Response.json({ authenticated: true }, { headers: { "Set-Cookie": `${LOCAL_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` } });
  } catch (error) { return apiError(error); }
}
