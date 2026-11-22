import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { fiscalInvoiceItems, fiscalInvoices, products, suppliers } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", productId = url.searchParams.get("productId") || "";
    await requirePermission(companyId, "master_data", "view");
    const db = getDb();
    const rows = await db.select().from(products).where(eq(products.companyId, companyId)).orderBy(asc(products.name));
    const history = productId ? await db.select({ invoiceNumber: fiscalInvoices.invoiceNumber, purchaseDate: fiscalInvoices.issueDate, supplierName: suppliers.name, quantityMilli: fiscalInvoiceItems.quantityMilli, unitPriceCents: fiscalInvoiceItems.unitPriceCents, totalCents: fiscalInvoiceItems.totalCents }).from(fiscalInvoiceItems).innerJoin(fiscalInvoices, eq(fiscalInvoiceItems.invoiceId, fiscalInvoices.id)).innerJoin(suppliers, eq(fiscalInvoices.supplierId, suppliers.id)).where(and(eq(fiscalInvoiceItems.companyId, companyId), eq(fiscalInvoiceItems.productId, productId))) : [];
    const sorted = [...history].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    const minimum = [...history].sort((a, b) => a.unitPriceCents - b.unitPriceCents)[0] || null;
    return Response.json({ products: rows, history: sorted, summary: { minimumPriceCents: minimum?.unitPriceCents ?? null, minimumSupplier: minimum?.supplierName ?? null, minimumPurchaseDate: minimum?.purchaseDate ?? null, lastPurchaseDate: sorted[0]?.purchaseDate ?? null, lastPriceCents: sorted[0]?.unitPriceCents ?? null, lastSupplier: sorted[0]?.supplierName ?? null } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; code?: string; name?: string; unit?: string; category?: string; itemType?: "product"|"service"; application?: string; manufacturerReference?: string };
    const companyId = body.companyId || ""; await requirePermission(companyId, "master_data", "create");
    if (!body.code?.trim() || !body.name?.trim() || !body.unit?.trim() || !body.category?.trim()) return Response.json({ error: "Código, nome, unidade e categoria são obrigatórios." }, { status: 400 });
    const code = body.code.trim();
    const [duplicate] = await getDb().select({ name: products.name }).from(products).where(and(eq(products.companyId, companyId), eq(products.code, code))).limit(1);
    if (duplicate) return Response.json({ error: `O código ${code} já está cadastrado no produto “${duplicate.name}”. Informe um código diferente.` }, { status: 409 });
    const now = new Date().toISOString(), row = { id: crypto.randomUUID(), companyId, code, name: body.name.trim().toLocaleUpperCase("pt-BR"), unit: body.unit.trim(), category: body.category.trim(), itemType: body.itemType || "product" as const, application: body.application?.trim() || null, manufacturerReference: body.manufacturerReference?.trim() || null, active: true, createdAt: now, updatedAt: now };
    await getDb().insert(products).values(row); return Response.json({ product: row }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; id?: string; code?: string; name?: string; unit?: string; category?: string; itemType?: "product"|"service"; application?: string; manufacturerReference?: string; active?: boolean };
    const companyId = body.companyId || ""; await requirePermission(companyId, "master_data", "update");
    if (!body.id || !body.code?.trim() || !body.name?.trim() || !body.unit?.trim() || !body.category?.trim()) return Response.json({ error: "Código, nome, unidade e categoria são obrigatórios." }, { status: 400 });
    const code = body.code.trim();
    const [duplicate] = await getDb().select({ name: products.name }).from(products).where(and(eq(products.companyId, companyId), eq(products.code, code), ne(products.id, body.id))).limit(1);
    if (duplicate) return Response.json({ error: `O código ${code} já está cadastrado no produto “${duplicate.name}”. Informe um código diferente.` }, { status: 409 });
    await getDb().update(products).set({ code, name: body.name.trim().toLocaleUpperCase("pt-BR"), unit: body.unit.trim(), category: body.category.trim(), itemType: body.itemType || "product", application: body.application?.trim() || null, manufacturerReference: body.manufacturerReference?.trim() || null, active: body.active ?? true, updatedAt: new Date().toISOString() }).where(and(eq(products.id, body.id), eq(products.companyId, companyId)));
    return Response.json({ updated: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", id = url.searchParams.get("id") || "";
    await requirePermission(companyId, "master_data", "delete");
    if (!id) return Response.json({ error: "Produto não informado." }, { status: 400 });
    const db = getDb();
    const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.companyId, companyId))).limit(1);
    if (!product) return Response.json({ error: "Produto ou serviço não encontrado." }, { status: 404 });
    const [invoiceUse] = await db.select({ id: fiscalInvoiceItems.id }).from(fiscalInvoiceItems).where(and(eq(fiscalInvoiceItems.companyId, companyId), eq(fiscalInvoiceItems.productId, id))).limit(1);
    if (invoiceUse) {
      await db.update(products).set({ active: false, updatedAt: new Date().toISOString() }).where(eq(products.id, id));
      return Response.json({ deleted: false, deactivated: true, message: "Produto utilizado em nota fiscal. O cadastro foi inativado para preservar o histórico." });
    }
    await db.delete(products).where(and(eq(products.id, id), eq(products.companyId, companyId)));
    return Response.json({ deleted: true, deactivated: false, message: "Produto excluído definitivamente." });
  } catch (error) { return apiError(error); }
}
