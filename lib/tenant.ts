import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { companyUsers, userModulePermissions } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getLocalSessionUser } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getLocalSessionUser() || await getChatGPTUser();
  if (!user) throw new Response("Não autenticado", { status: 401 });
  return user;
}

export async function requireCompanyAccess(companyId: string, write = false) {
  const user = await requireApiUser();
  const db = getDb();
  const [membership] = await db
    .select()
    .from(companyUsers)
    .where(
      and(
        eq(companyUsers.companyId, companyId),
        or(
          eq(companyUsers.userId, user.userId),
          user.email ? eq(companyUsers.email, user.email.toLowerCase()) : undefined,
        ),
        eq(companyUsers.active, true),
      ),
    )
    .limit(1);
  if (!membership)
    throw new Response("Acesso negado para esta empresa", { status: 403 });
  if (write && membership.role === "viewer")
    throw new Response("Usuário sem permissão de alteração", { status: 403 });
  return { user, membership };
}

export async function requirePermission(
  companyId: string,
  module: string,
  action: "view" | "create" | "update" | "delete" | "approve" | "cancel" | "reopen" | "report",
) {
  const access = await requireCompanyAccess(companyId, action !== "view");
  if (
    access.membership.role === "super_admin" ||
    access.membership.role === "company_admin"
  )
    return access;
  const [permission] = await getDb()
    .select()
    .from(userModulePermissions)
    .where(
      and(
        eq(userModulePermissions.companyUserId, access.membership.id),
        eq(userModulePermissions.module, module),
      ),
    )
    .limit(1);
  const allowed =
    action === "view"
      ? permission?.canView
      : action === "create"
        ? permission?.canCreate
        : action === "update"
          ? permission?.canUpdate
          : action === "delete"
            ? permission?.canDelete
            : action === "approve"
              ? permission?.canApprove
              : action === "cancel"
                ? permission?.canCancel
                : action === "reopen"
                  ? permission?.canReopen
                  : permission?.canReport;
  if (!allowed)
    throw new Response("Usuário sem permissão para esta operação", {
      status: 403,
    });
  return access;
}

export function apiError(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  return Response.json(
    { error: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
