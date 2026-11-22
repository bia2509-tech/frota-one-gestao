import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, equipment, fiscalInvoiceItems, fiscalInvoicePayments, fiscalInvoices, maintenanceOrderItems, maintenanceOrders, masterData, products, suppliers } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";
import { ensureSepcoRentalPayments } from "@/lib/sepco-rental-payments-bootstrap";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "";
    const access = await requirePermission(companyId, "invoices", "view");
    await ensureSepcoRentalPayments(companyId, access.user.userId);
    const invoiceId = url.searchParams.get("invoiceId") || "";
    if (invoiceId) {
      const [invoice] = await getDb().select({ id: fiscalInvoices.id, supplierId: fiscalInvoices.supplierId, supplierName: suppliers.name, invoiceNumber: fiscalInvoices.invoiceNumber, accessKey: fiscalInvoices.accessKey, documentModel: fiscalInvoices.documentModel, series: fiscalInvoices.series, issueDate: fiscalInvoices.issueDate, entryDate: fiscalInvoices.entryDate, dueDate: fiscalInvoices.dueDate, purchaseOrder: fiscalInvoices.purchaseOrder, costCenter: fiscalInvoices.costCenter, observation: fiscalInvoices.observation, pickedUp: fiscalInvoices.pickedUp, stockUpdated: fiscalInvoices.stockUpdated, status: fiscalInvoices.status }).from(fiscalInvoices).innerJoin(suppliers, eq(fiscalInvoices.supplierId, suppliers.id)).where(and(eq(fiscalInvoices.id, invoiceId), eq(fiscalInvoices.companyId, companyId))).limit(1);
      if (!invoice) return Response.json({ error: "Nota fiscal não encontrada." }, { status: 404 });
      const [itemRows, paymentRows] = await Promise.all([
        getDb().select().from(fiscalInvoiceItems).where(and(eq(fiscalInvoiceItems.invoiceId, invoiceId), eq(fiscalInvoiceItems.companyId, companyId))),
        getDb().select().from(fiscalInvoicePayments).where(and(eq(fiscalInvoicePayments.invoiceId, invoiceId), eq(fiscalInvoicePayments.companyId, companyId))),
      ]);
      return Response.json({ invoice, items: itemRows.map((row) => ({ id: row.id, productId: row.productId || "", description: row.description, category: row.category, ncm: row.ncm || "", cfop: row.cfop || "", cst: row.cst || "", quantity: row.quantityMilli / 1000, unitPrice: row.unitPriceCents / 100, discount: row.discountCents / 100, freight: row.freightCents / 100, ipi: row.ipiCents / 100, icms: row.icmsCents / 100, equipmentId: row.equipmentId || "", maintenanceOrderId: row.maintenanceOrderId || null, serviceDescription: row.serviceDescription || "", stockEntry: row.stockEntry })), payments: paymentRows.map((row) => ({ amount: row.amountCents / 100, dueDate: row.dueDate, paymentMethod: row.paymentMethod })) });
    }
    const orderId = url.searchParams.get("orderId") || "";
    if (orderId) {
      const [order] = await getDb().select({ id: maintenanceOrders.id, orderNumber: maintenanceOrders.orderNumber, equipmentId: maintenanceOrders.equipmentId, fleetNumber: equipment.fleetNumber, plate: equipment.plate }).from(maintenanceOrders).innerJoin(equipment, eq(maintenanceOrders.equipmentId, equipment.id)).where(and(eq(maintenanceOrders.id, orderId), eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.orderKind, "purchase_service"))).limit(1);
      if (!order) return Response.json({ error: "O.S. de compra e serviços não encontrada." }, { status: 404 });
      const rows = await getDb().select().from(maintenanceOrderItems).where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrderItems.maintenanceOrderId, order.id)));
      return Response.json({ order, items: rows.map((row) => ({ id: row.id, description: row.productService, category: row.serviceClass, quantity: row.quantityMilli / 1000, unitPrice: row.unitPriceCents / 100, equipmentId: order.equipmentId, equipmentLabel: `${order.fleetNumber} • ${order.plate || "Sem placa"}`, maintenanceOrderId: order.id, orderNumber: order.orderNumber, serviceDescription: row.observation || "" })) });
    }
    if (url.searchParams.get("options") === "1") {
      const [supplierRows, supplierMasterRows, orderRows, equipmentRows, productRows] = await Promise.all([
        getDb().select().from(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.active, true))),
        getDb().select({ id: masterData.id, name: masterData.name }).from(masterData).where(and(eq(masterData.companyId, companyId), eq(masterData.type, "fornecedor"), eq(masterData.active, true))),
        getDb().select({ id: maintenanceOrders.id, orderNumber: maintenanceOrders.orderNumber, equipmentId: maintenanceOrders.equipmentId, fleetNumber: equipment.fleetNumber, plate: equipment.plate }).from(maintenanceOrders).innerJoin(equipment, eq(maintenanceOrders.equipmentId, equipment.id)).where(and(eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.orderKind, "purchase_service"))).orderBy(desc(maintenanceOrders.startedAt)),
        getDb().select({ id: equipment.id, fleetNumber: equipment.fleetNumber, plate: equipment.plate, description: equipment.description }).from(equipment).where(eq(equipment.companyId, companyId)),
        getDb().select().from(products).where(and(eq(products.companyId, companyId), eq(products.active, true))),
      ]);
      const supplierMap = new Map([...supplierRows, ...supplierMasterRows].map((row) => [row.name.toLowerCase(), row]));
      return Response.json({ suppliers: [...supplierMap.values()], orders: orderRows, equipment: equipmentRows, products: productRows });
    }
    const invoices = await getDb().select({ id: fiscalInvoices.id, invoiceNumber: fiscalInvoices.invoiceNumber, issueDate: fiscalInvoices.issueDate, entryDate: fiscalInvoices.entryDate, dueDate: fiscalInvoices.dueDate, purchaseOrder: fiscalInvoices.purchaseOrder, costCenter: fiscalInvoices.costCenter, totalCents: fiscalInvoices.totalCents, status: fiscalInvoices.status, accountingChecked: fiscalInvoices.accountingChecked, pickedUp: fiscalInvoices.pickedUp, stockUpdated: fiscalInvoices.stockUpdated, supplierId: fiscalInvoices.supplierId, supplierName: suppliers.name }).from(fiscalInvoices).innerJoin(suppliers, eq(fiscalInvoices.supplierId, suppliers.id)).where(eq(fiscalInvoices.companyId, companyId)).orderBy(desc(fiscalInvoices.entryDate));
    return Response.json({ invoices });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; supplierId?: string; supplierName?: string; invoiceNumber?: string; accessKey?: string; documentModel?: string; series?: string; issueDate?: string; entryDate?: string; dueDate?: string; purchaseOrder?: string; costCenter?: string; observation?: string; pickedUp?: boolean; stockUpdated?: boolean; maintenanceOrderId?: string | null; payments?: Array<{ amount?: number; dueDate?: string; paymentMethod?: string }>; items?: Array<{ productId?: string | null; description?: string; category?: string; ncm?: string; cfop?: string; cst?: string; quantity?: number; unitPrice?: number; discount?: number; freight?: number; ipi?: number; icms?: number; pis?: number; cofins?: number; iss?: number; cbs?: number; ibs?: number; selectiveTax?: number; equipmentId?: string | null; maintenanceOrderId?: string | null; serviceDescription?: string; stockEntry?: boolean }> };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "invoices", "create");
    if ((!body.supplierId && !body.supplierName?.trim()) || !body.invoiceNumber?.trim() || !body.issueDate || !body.entryDate || !body.costCenter?.trim()) return Response.json({ error: "Fornecedor, número, emissão, entrada e centro de custo são obrigatórios." }, { status: 400 });
    const db = getDb();
    let [supplier] = body.supplierId ? await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, body.supplierId), eq(suppliers.companyId, companyId))).limit(1) : [];
    if (!supplier && body.supplierName?.trim()) {
      [supplier] = await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.name, body.supplierName.trim()))).limit(1);
      if (!supplier) { supplier = { id: crypto.randomUUID() }; await db.insert(suppliers).values({ id: supplier.id, companyId, name: body.supplierName.trim(), email: null, active: true }); }
    }
    if (!supplier) return Response.json({ error: "Fornecedor não pertence à empresa selecionada." }, { status: 400 });
    const [duplicate] = await db.select({ id: fiscalInvoices.id }).from(fiscalInvoices).where(and(eq(fiscalInvoices.companyId, companyId), eq(fiscalInvoices.supplierId, supplier.id), eq(fiscalInvoices.invoiceNumber, body.invoiceNumber.trim()), eq(fiscalInvoices.issueDate, body.issueDate))).limit(1);
    if (duplicate) return Response.json({ error: "Esta nota fiscal já foi lançada para o fornecedor e data de emissão informados." }, { status: 409 });
    let sourceItems = body.items || [];
    if (body.maintenanceOrderId) {
      const [order] = await db.select({ id: maintenanceOrders.id, equipmentId: maintenanceOrders.equipmentId }).from(maintenanceOrders).where(and(eq(maintenanceOrders.id, body.maintenanceOrderId), eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.orderKind, "purchase_service"))).limit(1);
      if (!order) return Response.json({ error: "O.S. de compra e serviços não encontrada para esta empresa." }, { status: 400 });
      const orderItems = await db.select().from(maintenanceOrderItems).where(and(eq(maintenanceOrderItems.companyId, companyId), eq(maintenanceOrderItems.maintenanceOrderId, order.id)));
      sourceItems = orderItems.map((row) => ({ description: row.productService, category: row.serviceClass, quantity: row.quantityMilli / 1000, unitPrice: row.unitPriceCents / 100, discount: row.discountCents / 100, equipmentId: order.equipmentId, maintenanceOrderId: order.id, serviceDescription: row.observation || undefined, stockEntry: false }));
    }
    if (!sourceItems.length) return Response.json({ error: "A O.S. selecionada não possui itens para carregar." }, { status: 400 });
    for (const item of sourceItems) {
      if (!item.description?.trim() || !item.category?.trim() || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0) return Response.json({ error: "Revise descrição, categoria, quantidade e preço dos itens." }, { status: 400 });
      if (item.equipmentId) {
        const [asset] = await db.select({ id: equipment.id }).from(equipment).where(and(eq(equipment.id, item.equipmentId), eq(equipment.companyId, companyId))).limit(1);
        if (!asset) return Response.json({ error: "Um dos equipamentos informados não pertence à empresa." }, { status: 400 });
      }
      if (item.maintenanceOrderId) {
        const [order] = await db.select({ id: maintenanceOrders.id }).from(maintenanceOrders).where(and(eq(maintenanceOrders.id, item.maintenanceOrderId), eq(maintenanceOrders.companyId, companyId))).limit(1);
        if (!order) return Response.json({ error: "Uma das O.S. informadas não pertence à empresa." }, { status: 400 });
      }
    }
    const invoiceId = crypto.randomUUID(), now = new Date().toISOString();
    const rows = sourceItems.map((item) => {
      const quantity = Number(item.quantity), unit = Number(item.unitPrice), discount = Number(item.discount || 0), freight = Number(item.freight || 0), ipi = Number(item.ipi || 0), icms = Number(item.icms || 0), pis = Number(item.pis || 0), cofins = Number(item.cofins || 0), iss = Number(item.iss || 0), cbs = Number(item.cbs || 0), ibs = Number(item.ibs || 0), selectiveTax = Number(item.selectiveTax || 0);
      return { id: crypto.randomUUID(), companyId, invoiceId, productId: item.productId || null, description: item.description!.trim(), category: item.category!.trim(), ncm: item.ncm?.trim() || null, cfop: item.cfop?.trim() || null, cst: item.cst?.trim() || null, quantityMilli: Math.round(quantity * 1000), unitPriceCents: Math.round(unit * 100), discountCents: Math.round(discount * 100), freightCents: Math.round(freight * 100), ipiCents: Math.round(ipi * 100), icmsCents: Math.round(icms * 100), pisCents: Math.round(pis * 100), cofinsCents: Math.round(cofins * 100), issCents: Math.round(iss * 100), cbsCents: Math.round(cbs * 100), ibsCents: Math.round(ibs * 100), selectiveTaxCents: Math.round(selectiveTax * 100), totalCents: Math.round((quantity * unit - discount + freight + ipi + selectiveTax) * 100), equipmentId: item.equipmentId || null, maintenanceOrderId: item.maintenanceOrderId || null, serviceDescription: item.serviceDescription?.trim() || null, stockEntry: !!item.stockEntry, createdAt: now };
    });
    const totalCents = rows.reduce((sum, item) => sum + item.totalCents, 0);
    await db.batch([
      db.insert(fiscalInvoices).values({ id: invoiceId, companyId, supplierId: supplier.id, invoiceNumber: body.invoiceNumber.trim(), accessKey: body.accessKey?.replace(/\D/g, "") || null, documentModel: body.documentModel?.trim() || null, series: body.series?.trim() || null, issueDate: body.issueDate, entryDate: body.entryDate, dueDate: body.dueDate || null, purchaseOrder: body.purchaseOrder?.trim() || null, costCenter: body.costCenter.trim(), totalCents, status: "pending_review", accountingChecked: false, pickedUp: !!body.pickedUp, stockUpdated: !!body.stockUpdated, observation: body.observation?.trim() || null, createdBy: access.user.userId, createdAt: now }),
      ...rows.map((row) => db.insert(fiscalInvoiceItems).values(row)),
      ...(body.payments || []).filter((p) => Number(p.amount) > 0 && p.dueDate && p.paymentMethod).map((p, index) => db.insert(fiscalInvoicePayments).values({ id: crypto.randomUUID(), companyId, invoiceId, installment: index + 1, amountCents: Math.round(Number(p.amount) * 100), dueDate: p.dueDate!, paymentMethod: p.paymentMethod!.trim(), status: "payable" })),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "invoice.created", entity: "fiscal_invoice", entityId: invoiceId, createdAt: now }),
    ]);
    return Response.json({ id: invoiceId, totalCents, status: "pending_review" }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as any;
    const companyId = body.companyId || "", action = body.action;
    if (action === "update") {
      const access = await requirePermission(companyId, "invoices", "update"), db = getDb();
      const [invoice] = await db.select().from(fiscalInvoices).where(and(eq(fiscalInvoices.id, body.invoiceId || ""), eq(fiscalInvoices.companyId, companyId))).limit(1);
      if (!invoice) return Response.json({ error: "Nota fiscal não encontrada." }, { status: 404 });
      if ((!body.supplierId && !body.supplierName?.trim()) || !body.invoiceNumber?.trim() || !body.issueDate || !body.entryDate || !body.costCenter?.trim()) return Response.json({ error: "Fornecedor, número, emissão, entrada e centro de custo são obrigatórios." }, { status: 400 });
      let [supplier] = body.supplierId ? await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, body.supplierId), eq(suppliers.companyId, companyId))).limit(1) : [];
      if (!supplier && body.supplierName?.trim()) [supplier] = await db.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.name, body.supplierName.trim()))).limit(1);
      if (!supplier) return Response.json({ error: "Fornecedor não pertence à empresa selecionada." }, { status: 400 });
      const sourceItems = body.items || []; if (!sourceItems.length) return Response.json({ error: "Inclua ao menos um item na nota fiscal." }, { status: 400 });
      const now = new Date().toISOString();
      const rows = sourceItems.map((item: any) => { const quantity = Number(item.quantity), unit = Number(item.unitPrice), discount = Number(item.discount || 0), freight = Number(item.freight || 0), ipi = Number(item.ipi || 0), icms = Number(item.icms || 0), pis = Number(item.pis || 0), cofins = Number(item.cofins || 0), iss = Number(item.iss || 0), cbs = Number(item.cbs || 0), ibs = Number(item.ibs || 0), selectiveTax = Number(item.selectiveTax || 0); return { id: crypto.randomUUID(), companyId, invoiceId: invoice.id, productId: item.productId || null, description: item.description.trim(), category: item.category.trim(), ncm: item.ncm?.trim() || null, cfop: item.cfop?.trim() || null, cst: item.cst?.trim() || null, quantityMilli: Math.round(quantity * 1000), unitPriceCents: Math.round(unit * 100), discountCents: Math.round(discount * 100), freightCents: Math.round(freight * 100), ipiCents: Math.round(ipi * 100), icmsCents: Math.round(icms * 100), pisCents: Math.round(pis * 100), cofinsCents: Math.round(cofins * 100), issCents: Math.round(iss * 100), cbsCents: Math.round(cbs * 100), ibsCents: Math.round(ibs * 100), selectiveTaxCents: Math.round(selectiveTax * 100), totalCents: Math.round((quantity * unit - discount + freight + ipi + selectiveTax) * 100), equipmentId: item.equipmentId || null, maintenanceOrderId: item.maintenanceOrderId || null, serviceDescription: item.serviceDescription?.trim() || null, stockEntry: !!item.stockEntry, createdAt: now }; });
      const totalCents = rows.reduce((sum: number, item: any) => sum + item.totalCents, 0);
      await db.batch([
        db.update(fiscalInvoices).set({ supplierId: supplier.id, invoiceNumber: body.invoiceNumber.trim(), accessKey: body.accessKey?.replace(/\D/g, "") || null, documentModel: body.documentModel?.trim() || null, series: body.series?.trim() || null, issueDate: body.issueDate, entryDate: body.entryDate, dueDate: body.dueDate || null, purchaseOrder: body.purchaseOrder?.trim() || null, costCenter: body.costCenter.trim(), totalCents, pickedUp: !!body.pickedUp, stockUpdated: !!body.stockUpdated, observation: body.observation?.trim() || null }).where(eq(fiscalInvoices.id, invoice.id)),
        db.delete(fiscalInvoiceItems).where(eq(fiscalInvoiceItems.invoiceId, invoice.id)), db.delete(fiscalInvoicePayments).where(eq(fiscalInvoicePayments.invoiceId, invoice.id)),
        ...rows.map((row: any) => db.insert(fiscalInvoiceItems).values(row)),
        ...(body.payments || []).filter((p: any) => Number(p.amount) > 0 && p.dueDate && p.paymentMethod).map((p: any, index: number) => db.insert(fiscalInvoicePayments).values({ id: crypto.randomUUID(), companyId, invoiceId: invoice.id, installment: index + 1, amountCents: Math.round(Number(p.amount) * 100), dueDate: p.dueDate, paymentMethod: p.paymentMethod.trim(), status: "payable" })),
        db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: "invoice.updated", entity: "fiscal_invoice", entityId: invoice.id, createdAt: now }),
      ]);
      return Response.json({ id: invoice.id, totalCents, status: invoice.status, updated: true });
    }
    if (!action) return Response.json({ error: "Ação inválida." }, { status: 400 });
    const access = await requirePermission(companyId, "invoices", action);
    const db = getDb();
    const [invoice] = await db.select().from(fiscalInvoices).where(and(eq(fiscalInvoices.id, body.invoiceId || ""), eq(fiscalInvoices.companyId, companyId))).limit(1);
    if (!invoice) return Response.json({ error: "Nota fiscal não encontrada." }, { status: 404 });
    const status = action === "approve" ? "approved" : action === "cancel" ? "cancelled" : "pending_review";
    await db.batch([
      db.update(fiscalInvoices).set({ status, accountingChecked: action === "approve" }).where(eq(fiscalInvoices.id, invoice.id)),
      db.insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: `invoice.${action}`, entity: "fiscal_invoice", entityId: invoice.id, createdAt: new Date().toISOString() }),
    ]);
    return Response.json({ status });
  } catch (error) { return apiError(error); }
}
