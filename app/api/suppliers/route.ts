import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { equipment, fiscalInvoices, suppliers } from "@/db/schema";
import { apiError, requireCompanyAccess, requirePermission } from "@/lib/tenant";
import { ensureSepcoRentalPayments } from "@/lib/sepco-rental-payments-bootstrap";

const fields = (body: any) => ({ name: body.name?.trim() || "", tradeName: body.tradeName?.trim() || null, taxId: body.taxId?.trim() || null, stateRegistration: body.stateRegistration?.trim() || null, address: body.address?.trim() || null, district: body.district?.trim() || null, zipCode: body.zipCode?.trim() || null, city: body.city?.trim() || null, state: body.state?.trim()?.toUpperCase() || null, contactName: body.contactName?.trim() || null, phone: body.phone?.trim() || null, fax: body.fax?.trim() || null, email: body.email?.trim() || null, freightType: body.freightType?.trim() || null, simpleNational: body.simpleNational?.trim() || null, paymentMethod: body.paymentMethod?.trim() || null, pixKey: body.pixKey?.trim() || null, accountHolder: body.accountHolder?.trim() || null, accountType: body.accountType?.trim() || null, bank: body.bank?.trim() || null, bankAgency: body.bankAgency?.trim() || null, bankAccount: body.bankAccount?.trim() || null, financialContact: body.financialContact?.trim() || null, active: body.active ?? true });
const supplierCode = (id: string) => `FOR-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

export async function GET(request: Request) {
  try { const companyId = new URL(request.url).searchParams.get("companyId") || ""; const access = await requirePermission(companyId, "master_data", "view"); try { await ensureSepcoRentalPayments(companyId, access.user.userId); } catch (error) { console.error("Carga opcional de pagamentos ignorada", error); } const rows = await getDb().select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(asc(suppliers.name)); return Response.json({ suppliers: rows.map((row) => ({ ...row, code: supplierCode(row.id) })), canDelete: access.membership.role === "super_admin" }); } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try { const body = await request.json(), companyId = body.companyId || ""; await requirePermission(companyId, "master_data", "create"); const data = fields(body); if (!data.name) return Response.json({ error: "Razão social é obrigatória." }, { status: 400 }); const row = { id: crypto.randomUUID(), companyId, ...data }; await getDb().insert(suppliers).values(row); return Response.json({ supplier: { ...row, code: supplierCode(row.id) } }, { status: 201 }); } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try { const body = await request.json(), companyId = body.companyId || ""; await requirePermission(companyId, "master_data", "update"); if (!body.id) return Response.json({ error: "Fornecedor não informado." }, { status: 400 }); const data = fields(body); if (!data.name) return Response.json({ error: "Razão social é obrigatória." }, { status: 400 }); await getDb().update(suppliers).set(data).where(and(eq(suppliers.id, body.id), eq(suppliers.companyId, companyId))); return Response.json({ updated: true }); } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", id = url.searchParams.get("id") || "";
    const access = await requireCompanyAccess(companyId, true);
    if (access.membership.role !== "super_admin") return Response.json({ error: "Somente o administrador master pode excluir fornecedores." }, { status: 403 });
    const [[invoiceUse], [equipmentUse]] = await Promise.all([
      getDb().select({ id: fiscalInvoices.id }).from(fiscalInvoices).where(and(eq(fiscalInvoices.companyId, companyId), eq(fiscalInvoices.supplierId, id))).limit(1),
      getDb().select({ id: equipment.id }).from(equipment).where(and(eq(equipment.companyId, companyId), eq(equipment.lessorId, id))).limit(1),
    ]);
    if (invoiceUse || equipmentUse) return Response.json({ error: "Este fornecedor possui nota fiscal ou equipamento vinculado e não pode ser excluído. Mantenha-o para preservar o histórico." }, { status: 409 });
    await getDb().delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)));
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
