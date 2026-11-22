import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { maintenanceOrderItems, maintenanceOrders } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", orderId = url.searchParams.get("orderId") || "";
    await requirePermission(companyId, "maintenance", "view");
    const items = await getDb().select().from(maintenanceOrderItems).where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrderItems.maintenanceOrderId, orderId)));
    return Response.json({ items });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; maintenanceOrderId?: string; itemType?: "part"|"service"; productService?: string; quantity?: number; unitPrice?: number; discount?: number; status?: string; situation?: string; model?: string; invoiceNumber?: string; manufacturer?: string; supplierName?: string; paymentResponsibility?: "company"|"lessor"|"company_charge_lessor"; itemOrigin?: "direct_purchase"|"stock_withdrawal"|"lessor_purchase"; serviceClass?: string; tirePreviousIdentification?: string; tireCurrentIdentification?: string; tireDot?: string; tireCondition?: "new"|"retreaded"|"used"; tireRemovedDestination?: "stock"|"discard"|"supplier_return"|"lessor_return"; batteryCertificateNumber?: string; batteryInvoiceNumber?: string; observation?: string };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "maintenance", "create");
    const [order] = await getDb().select().from(maintenanceOrders).where(and(eq(maintenanceOrders.id, body.maintenanceOrderId || ""), eq(maintenanceOrders.companyId, companyId))).limit(1);
    if (!order) return Response.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
    if (order.orderKind !== "purchase_service") return Response.json({ error: "Peças e serviços financeiros devem ser lançados em uma O.S. de compra e serviços." }, { status: 400 });
    if (order.status === "closed") return Response.json({ error: "Não é possível incluir itens em uma O.S. concluída." }, { status: 400 });
    if (!body.productService || !Number(body.quantity) || Number(body.unitPrice) < 0 || (body.itemOrigin !== "stock_withdrawal" && !body.supplierName?.trim()) || !body.paymentResponsibility || !body.serviceClass)
      return Response.json({ error: "Produto/serviço, fornecedor, quantidade, preço, pagamento e classe são obrigatórios." }, { status: 400 });
    const discountCents = Math.max(0, Math.round(Number(body.discount || 0) * 100));
    const grossCents = Math.round(Number(body.quantity) * Number(body.unitPrice) * 100);
    const item = { id: crypto.randomUUID(), companyId, maintenanceOrderId: order.id, itemType: body.itemType || "part" as const, productService: body.productService.trim(), quantityMilli: Math.round(Number(body.quantity) * 1000), unitPriceCents: Math.round(Number(body.unitPrice) * 100), discountCents, totalCents: Math.max(0, grossCents - discountCents), status: body.status?.trim() || null, situation: body.situation?.trim() || null, model: body.model?.trim() || null, invoiceNumber: body.invoiceNumber?.trim() || null, manufacturer: body.manufacturer?.trim() || null, supplierName: body.supplierName?.trim() || null, paymentResponsibility: body.paymentResponsibility, itemOrigin: body.itemOrigin || (body.paymentResponsibility === "lessor" ? "lessor_purchase" : "direct_purchase"), serviceClass: body.serviceClass, tirePreviousIdentification: body.tirePreviousIdentification?.trim() || null, tireCurrentIdentification: body.tireCurrentIdentification?.trim() || null, tireDot: body.tireDot?.trim() || null, tireCondition: body.tireCondition || null, tireRemovedDestination: body.tireRemovedDestination || null, batteryCertificateNumber: body.batteryCertificateNumber?.trim() || null, batteryInvoiceNumber: body.batteryInvoiceNumber?.trim() || null, observation: body.observation?.trim() || null, appropriationPosted: false, createdAt: new Date().toISOString() };
    await getDb().insert(maintenanceOrderItems).values(item);
    await getDb().update(maintenanceOrders).set({ requestApprovalStatus: "draft", requestPrintedAt: null, requestPrintedBy: null, approvalRequestedAt: null, approvalRequestedBy: null, approvedAt: null, approvedBy: null }).where(eq(maintenanceOrders.id, order.id));
    return Response.json({ item, appropriationDestination: item.paymentResponsibility === "lessor" ? "Reembolso de avarias" : item.serviceClass }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; id?: string; productService?: string; itemType?: "part"|"service"; quantity?: number; unitPrice?: number; discount?: number; supplierName?: string; invoiceNumber?: string; paymentResponsibility?: "company"|"lessor"|"company_charge_lessor"; itemOrigin?: "direct_purchase"|"stock_withdrawal"|"lessor_purchase"; serviceClass?: string; tirePreviousIdentification?: string; tireCurrentIdentification?: string; tireDot?: string; tireCondition?: "new"|"retreaded"|"used"; tireRemovedDestination?: "stock"|"discard"|"supplier_return"|"lessor_return"; batteryCertificateNumber?: string; batteryInvoiceNumber?: string; observation?: string };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "maintenance", "update");
    const [current] = await getDb().select({ item: maintenanceOrderItems, orderStatus: maintenanceOrders.status }).from(maintenanceOrderItems).innerJoin(maintenanceOrders, eq(maintenanceOrderItems.maintenanceOrderId, maintenanceOrders.id)).where(and(eq(maintenanceOrderItems.id, body.id || ""), eq(maintenanceOrderItems.companyId, companyId))).limit(1);
    if (!current) return Response.json({ error: "Item da O.S. não encontrado." }, { status: 404 });
    if (current.orderStatus === "closed") return Response.json({ error: "Solicite a reabertura da O.S. antes de alterar seus itens." }, { status: 400 });
    if (!body.productService || !Number(body.quantity) || Number(body.unitPrice) < 0 || (body.itemOrigin !== "stock_withdrawal" && !body.supplierName?.trim()) || !body.paymentResponsibility || !body.serviceClass)
      return Response.json({ error: "Produto/serviço, fornecedor, quantidade, preço, pagamento e categoria são obrigatórios." }, { status: 400 });
    const discountCents = Math.max(0, Math.round(Number(body.discount || 0) * 100));
    const values = { itemType: body.itemType || "part" as const, productService: body.productService.trim(), quantityMilli: Math.round(Number(body.quantity) * 1000), unitPriceCents: Math.round(Number(body.unitPrice) * 100), discountCents, totalCents: Math.max(0, Math.round(Number(body.quantity) * Number(body.unitPrice) * 100) - discountCents), supplierName: body.supplierName?.trim() || null, invoiceNumber: body.invoiceNumber?.trim() || null, paymentResponsibility: body.paymentResponsibility, itemOrigin: body.itemOrigin || (body.paymentResponsibility === "lessor" ? "lessor_purchase" : "direct_purchase"), serviceClass: body.serviceClass, tirePreviousIdentification: body.tirePreviousIdentification?.trim() || null, tireCurrentIdentification: body.tireCurrentIdentification?.trim() || null, tireDot: body.tireDot?.trim() || null, tireCondition: body.tireCondition || null, tireRemovedDestination: body.tireRemovedDestination || null, batteryCertificateNumber: body.batteryCertificateNumber?.trim() || null, batteryInvoiceNumber: body.batteryInvoiceNumber?.trim() || null, observation: body.observation?.trim() || null, appropriationPosted: false };
    await getDb().update(maintenanceOrderItems).set(values).where(eq(maintenanceOrderItems.id, current.item.id));
    await getDb().update(maintenanceOrders).set({ requestApprovalStatus: "draft", requestPrintedAt: null, requestPrintedBy: null, approvalRequestedAt: null, approvalRequestedBy: null, approvedAt: null, approvedBy: null }).where(eq(maintenanceOrders.id, current.item.maintenanceOrderId));
    return Response.json({ item: { ...current.item, ...values } });
  } catch (error) { return apiError(error); }
}
