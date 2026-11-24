import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contracts, measurements } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      companyId = url.searchParams.get("companyId") || "",
      contractId = url.searchParams.get("contractId") || "";
    await requirePermission(companyId, "appropriation", "view");
    const rows = await getDb()
      .select()
      .from(measurements)
      .where(
        and(
          eq(measurements.companyId, companyId),
          eq(measurements.contractId, contractId),
        ),
      );
    return Response.json({ measurements: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyId?: string;
      contractId?: string;
      referenceMonth?: string;
      amountCents?: number;
      status?: string;
    };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "appropriation", body.status === "approved" ? "approve" : "create");
    const db = getDb();
    const [contract] = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, body.contractId || ""),
          eq(contracts.companyId, companyId),
        ),
      )
      .limit(1);
    if (!contract)
      return Response.json(
        { error: "Contrato não pertence à empresa selecionada." },
        { status: 400 },
      );
    const existing = await db
      .select()
      .from(measurements)
      .where(eq(measurements.contractId, contract.id));
    const row = {
      id: crypto.randomUUID(),
      companyId,
      contractId: contract.id,
      referenceMonth: body.referenceMonth || "",
      sequence: existing.length + 1,
      amountCents: Math.max(0, Math.round(body.amountCents || 0)),
      status: body.status === "approved" ? "approved" : "draft",
      approvedAt: body.status === "approved" ? new Date().toISOString() : null,
    };
    await db.insert(measurements).values(row);
    return Response.json({ measurement: row }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
