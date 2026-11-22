import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companyUsers, userModulePermissions } from "@/db/schema";
import { apiError, requireCompanyAccess } from "@/lib/tenant";

async function requireAdmin(companyId: string) {
  const access = await requireCompanyAccess(companyId, true);
  if (!["super_admin", "company_admin"].includes(access.membership.role))
    throw new Response("Somente administradores podem definir permissões", {
      status: 403,
    });
  return access;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      companyId = url.searchParams.get("companyId") || "",
      companyUserId = url.searchParams.get("companyUserId") || "";
    await requireAdmin(companyId);
    const rows = await getDb()
      .select()
      .from(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.companyId, companyId),
          eq(userModulePermissions.companyUserId, companyUserId),
        ),
      );
    return Response.json({ permissions: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      companyId?: string;
      companyUserId?: string;
      permissions?: {
        module: string;
        canView: boolean;
        canCreate: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canApprove: boolean;
        canCancel: boolean;
        canReopen: boolean;
        canReport: boolean;
      }[];
    };
    const companyId = body.companyId || "";
    await requireAdmin(companyId);
    const db = getDb();
    const [target] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.id, body.companyUserId || ""),
          eq(companyUsers.companyId, companyId),
        ),
      )
      .limit(1);
    if (!target)
      return Response.json(
        { error: "Usuário não pertence a esta empresa." },
        { status: 400 },
      );
    const permissions = body.permissions || [];
    await db
      .delete(userModulePermissions)
      .where(
        and(
          eq(userModulePermissions.companyId, companyId),
          eq(userModulePermissions.companyUserId, target.id),
        ),
      );
    if (permissions.length)
      await db
        .insert(userModulePermissions)
        .values(
          permissions.map((p) => ({
            id: crypto.randomUUID(),
            companyId,
            companyUserId: target.id,
            module: p.module,
            canView: !!p.canView,
            canCreate: !!p.canCreate,
            canUpdate: !!p.canUpdate,
            canDelete: !!p.canDelete,
            canApprove: !!p.canApprove,
            canCancel: !!p.canCancel,
            canReopen: !!p.canReopen,
            canReport: !!p.canReport,
          })),
        );
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
