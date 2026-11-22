import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { quotationMaps, quotationOptions } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") || "";
    await requirePermission(companyId, "maintenance", "view");
    const maps = await getDb().select().from(quotationMaps).where(eq(quotationMaps.companyId, companyId)).orderBy(desc(quotationMaps.createdAt));
    const options = await getDb().select().from(quotationOptions).where(eq(quotationOptions.companyId, companyId));
    return Response.json({ quotations: maps.map((map) => ({ ...map, options: options.filter((row) => row.quotationMapId === map.id) })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; number?: string; description?: string; costCenter?: string; options?: Array<{ supplierName?: string; total?: number; paymentTerms?: string; deliveryDays?: number; validityDate?: string; selected?: boolean }> };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "maintenance", "create");
    const options = (body.options || []).filter((row) => row.supplierName?.trim() && Number(row.total) >= 0);
    if (!body.number?.trim() || !body.description?.trim() || !body.costCenter?.trim()) return Response.json({ error: "Número, objeto da cotação e centro de custo são obrigatórios." }, { status: 400 });
    if (options.length < 2) return Response.json({ error: "Inclua pelo menos duas propostas para comparação." }, { status: 400 });
    if (options.filter((row) => row.selected).length < 1) return Response.json({ error: "Selecione pelo menos um fornecedor premiado." }, { status: 400 });
    const id = crypto.randomUUID(), db = getDb();
    await db.batch([
      db.insert(quotationMaps).values({ id, companyId, number: body.number.trim(), description: body.description.trim(), costCenter: body.costCenter.trim(), status: "approved", createdAt: new Date().toISOString() }),
      ...options.map((row) => db.insert(quotationOptions).values({ id: crypto.randomUUID(), companyId, quotationMapId: id, supplierName: row.supplierName!.trim(), totalCents: Math.round(Number(row.total) * 100), paymentTerms: row.paymentTerms?.trim() || null, deliveryDays: Number(row.deliveryDays) || null, validityDate: row.validityDate || null, selected: Boolean(row.selected) })),
    ]);
    return Response.json({ quotationId: id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
