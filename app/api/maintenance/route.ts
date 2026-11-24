import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import {
  dailyPartEntries,
  emailNotifications,
  equipment,
  maintenanceOrders,
  maintenanceOrderItems,
  quotationMaps,
  suppliers,
} from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const companyId = new URL(request.url).searchParams.get("companyId") || "";
    await requirePermission(companyId, "maintenance", "view");
    const rows = await getDb().select({ id: maintenanceOrders.id, equipmentId: maintenanceOrders.equipmentId, orderNumber: maintenanceOrders.orderNumber, orderKind: maintenanceOrders.orderKind, originMaintenanceOrderId: maintenanceOrders.originMaintenanceOrderId, quotationMapId: maintenanceOrders.quotationMapId, startedAt: maintenanceOrders.startedAt, closedAt: maintenanceOrders.closedAt, maintenanceType: maintenanceOrders.maintenanceType, maintenanceStatus: maintenanceOrders.maintenanceStatus, maintenanceFormType: maintenanceOrders.maintenanceFormType, serviceType: maintenanceOrders.serviceType, description: maintenanceOrders.description, status: maintenanceOrders.status, requestApprovalStatus: maintenanceOrders.requestApprovalStatus, requestPrintedAt: maintenanceOrders.requestPrintedAt, approvalRequestedAt: maintenanceOrders.approvalRequestedAt, approvedAt: maintenanceOrders.approvedAt, requestedBy: maintenanceOrders.requestedBy, preparedBy: maintenanceOrders.preparedBy, maintenanceLocation: maintenanceOrders.maintenanceLocation, costCenter: maintenanceOrders.costCenter, kilometer: maintenanceOrders.kilometer, hourmeter: maintenanceOrders.hourmeter, fleetNumber: equipment.fleetNumber, plate: equipment.plate, equipmentDescription: equipment.description, equipmentModel: equipment.model, lessorName: equipment.lessorName, frontName: equipment.frontName, operatorName: equipment.operatorName }).from(maintenanceOrders).innerJoin(equipment, eq(maintenanceOrders.equipmentId, equipment.id)).where(eq(maintenanceOrders.companyId, companyId)).orderBy(desc(maintenanceOrders.startedAt));
    const highestNumber = rows.reduce((highest, row) => { const digits = row.orderNumber.match(/\d+/g)?.at(-1); return Math.max(highest, digits ? Number(digits) : 0); }, 0);
    return Response.json({ orders: rows, nextOrderNumber: String(highestNumber + 1).padStart(4, "0") });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyId?: string;
      equipmentId?: string;
      orderNumber?: string;
      maintenanceType?: string;
      maintenanceStatus?: string;
      maintenanceFormType?: "normal_repair" | "accident_repair" | "maintenance";
      orderKind?: "daily_maintenance" | "purchase_service";
      originMaintenanceOrderId?: string | null;
      quotationMapId?: string | null;
      description?: string;
      startedAt?: string;
      notifyLessor?: boolean;
      requestedBy?: string;
      preparedBy?: string;
      maintenanceLocation?: string;
      costCenter?: string;
      serviceType?: string;
      kilometer?: number | null;
      hourmeter?: number | null;
    };
    const companyId = body.companyId || "";
    await requirePermission(companyId, "maintenance", "create");
    const db = getDb();
    const [asset] = await db
      .select({
        id: equipment.id,
        fleetNumber: equipment.fleetNumber,
        plate: equipment.plate,
        description: equipment.description,
        lessorId: equipment.lessorId,
        lessorName: suppliers.name,
        lessorEmail: suppliers.email,
      })
      .from(equipment)
      .leftJoin(suppliers, eq(equipment.lessorId, suppliers.id))
      .where(
        and(
          eq(equipment.id, body.equipmentId || ""),
          eq(equipment.companyId, companyId),
        ),
      )
      .limit(1);
    if (!asset)
      return Response.json(
        { error: "Equipamento não pertence à empresa selecionada." },
        { status: 400 },
      );
    if (
      !body.maintenanceType ||
      !body.serviceType?.trim() ||
      !body.description ||
      !body.startedAt
    )
      return Response.json(
        { error: "Preencha o tipo de manutenção, o tipo de serviço, a data e a descrição." },
        { status: 400 },
      );
    const orderId = crypto.randomUUID();
    const orderKind = body.orderKind || "daily_maintenance";
    const existingNumbers = await db.select({ orderNumber: maintenanceOrders.orderNumber }).from(maintenanceOrders).where(eq(maintenanceOrders.companyId, companyId));
    const highestNumber = existingNumbers.reduce((highest, row) => { const digits = row.orderNumber.match(/\d+/g)?.at(-1); return Math.max(highest, digits ? Number(digits) : 0); }, 0);
    const orderNumber = String(highestNumber + 1).padStart(4, "0");
    if (body.originMaintenanceOrderId) {
      const [origin] = await db.select({ id: maintenanceOrders.id }).from(maintenanceOrders).where(and(
        eq(maintenanceOrders.id, body.originMaintenanceOrderId),
        eq(maintenanceOrders.companyId, companyId),
        eq(maintenanceOrders.equipmentId, asset.id),
        eq(maintenanceOrders.orderKind, "daily_maintenance"),
      )).limit(1);
      if (!origin) return Response.json({ error: "A O.S. operacional de origem não pertence a este equipamento." }, { status: 400 });
    }
    if (body.quotationMapId) {
      const [quotation] = await db.select({ id: quotationMaps.id }).from(quotationMaps).where(and(eq(quotationMaps.id, body.quotationMapId), eq(quotationMaps.companyId, companyId), eq(quotationMaps.status, "approved"))).limit(1);
      if (!quotation) return Response.json({ error: "Mapa de cotação aprovado não encontrado." }, { status: 400 });
    }
    await db.insert(maintenanceOrders).values({
          id: orderId,
          companyId,
          equipmentId: asset.id,
          orderNumber,
          orderKind,
          originMaintenanceOrderId: body.originMaintenanceOrderId || null,
          quotationMapId: body.quotationMapId || null,
          maintenanceType: body.maintenanceType,
          maintenanceStatus: body.maintenanceStatus?.trim() || "Em lançamento",
          maintenanceFormType: body.maintenanceFormType || "normal_repair",
          description: body.description,
          startedAt: body.startedAt,
          status: "open",
          requestedBy: body.requestedBy?.trim() || null,
          preparedBy: body.preparedBy?.trim() || null,
          maintenanceLocation: body.maintenanceLocation?.trim() || null,
          costCenter: body.costCenter?.trim() || null,
          serviceType: body.serviceType?.trim() || null,
          kilometer: body.kilometer == null ? null : Number(body.kilometer),
          hourmeter: body.hourmeter == null ? null : Number(body.hourmeter),
          notifyLessor: body.notifyLessor !== false,
        });
    if (orderKind === "daily_maintenance") {
      await db.update(equipment).set({ status: "maintenance" }).where(eq(equipment.id, asset.id));
    }
    let emailDraft = null;
    if (orderKind === "daily_maintenance" && body.notifyLessor !== false && asset.lessorEmail) {
      const subject = `Aviso de manutenção - Frota ${asset.fleetNumber}${asset.plate ? ` - ${asset.plate}` : ""}`;
      const mailBody = `Prezado(a) ${asset.lessorName || "locador"},\n\nInformamos que o equipamento ${asset.description}, frota ${asset.fleetNumber}${asset.plate ? `, placa ${asset.plate}` : ""}, entrou em manutenção em ${body.startedAt}.\n\nOrdem de serviço: ${orderNumber}\nTipo: ${body.maintenanceType}\nDescrição: ${body.description}\n\nAtenciosamente,\nSetor de Transporte`;
      const notificationId = crypto.randomUUID();
      await db
        .insert(emailNotifications)
        .values({
          id: notificationId,
          companyId,
          maintenanceOrderId: orderId,
          recipient: asset.lessorEmail,
          subject,
          body: mailBody,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      emailDraft = {
        id: notificationId,
        recipient: asset.lessorEmail,
        subject,
        body: mailBody,
        mailto: `mailto:${encodeURIComponent(asset.lessorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`,
      };
    }
    return Response.json(
      { maintenanceOrderId: orderId, orderNumber, emailDraft },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; maintenanceOrderId?: string; action?: "update" | "close" | "mark_printed" | "request_approval" | "approve"; closedAt?: string; equipmentId?: string; maintenanceType?: string; maintenanceStatus?: string; maintenanceFormType?: "normal_repair" | "accident_repair" | "maintenance"; description?: string; startedAt?: string; requestedBy?: string; preparedBy?: string; maintenanceLocation?: string; costCenter?: string; serviceType?: string; kilometer?: number | null; hourmeter?: number | null };
    const companyId = body.companyId || "";
    const access = await requirePermission(companyId, "maintenance", body.action === "approve" ? "approve" : "update");
    const db = getDb();
    const [order] = await db.select().from(maintenanceOrders).where(and(eq(maintenanceOrders.id, body.maintenanceOrderId || ""), eq(maintenanceOrders.companyId, companyId))).limit(1);
    if (!order) return Response.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
    if (body.action === "update") {
      if (order.status === "closed") return Response.json({ error: "O.S. concluída não pode ser alterada sem reabertura." }, { status: 400 });
      if (!body.equipmentId || !body.maintenanceType?.trim() || !body.serviceType?.trim() || !body.description?.trim() || !body.startedAt) return Response.json({ error: "Preencha equipamento, data, tipo de manutenção, tipo de serviço e descrição." }, { status: 400 });
      const [asset] = await db.select({ id: equipment.id }).from(equipment).where(and(eq(equipment.id, body.equipmentId), eq(equipment.companyId, companyId))).limit(1);
      if (!asset) return Response.json({ error: "Equipamento não pertence à empresa." }, { status: 400 });
      const maintenanceStatus = body.maintenanceStatus?.trim() || order.maintenanceStatus;
      await db.update(maintenanceOrders).set({ equipmentId: asset.id, maintenanceType: body.maintenanceType.trim(), maintenanceStatus, maintenanceFormType: body.maintenanceFormType || order.maintenanceFormType, description: body.description.trim(), startedAt: body.startedAt, requestedBy: body.requestedBy?.trim() || null, preparedBy: body.preparedBy?.trim() || null, maintenanceLocation: body.maintenanceLocation?.trim() || null, costCenter: body.costCenter?.trim() || null, serviceType: body.serviceType?.trim() || null, kilometer: body.kilometer == null ? null : Number(body.kilometer), hourmeter: body.hourmeter == null ? null : Number(body.hourmeter), requestApprovalStatus: "draft", requestPrintedAt: null, requestPrintedBy: null, approvalRequestedAt: null, approvalRequestedBy: null, approvedAt: null, approvedBy: null }).where(eq(maintenanceOrders.id, order.id));
      return Response.json({ updated: true, status: order.status });
    }
    const orderItems = await db.select().from(maintenanceOrderItems).where(eq(maintenanceOrderItems.maintenanceOrderId, order.id));
    if (body.action === "mark_printed") {
      if (order.orderKind !== "purchase_service") return Response.json({ error: "A Ficha de Pedido é utilizada na O.S. de compras e serviços." }, { status: 400 });
      if (!orderItems.length) return Response.json({ error: "Lance todos os produtos e serviços antes de imprimir a Ficha." }, { status: 400 });
      if (orderItems.some((item) => item.itemOrigin !== "stock_withdrawal" && !item.supplierName?.trim())) return Response.json({ error: "Informe o fornecedor de cada item comprado antes de imprimir a Ficha." }, { status: 400 });
      const now = new Date().toISOString();
      await db.update(maintenanceOrders).set({ maintenanceStatus: "Aguardando assinatura da Ficha", requestPrintedAt: now, requestPrintedBy: access.user.userId }).where(eq(maintenanceOrders.id, order.id));
      return Response.json({ requestPrintedAt: now });
    }
    if (body.action === "request_approval") {
      if (order.orderKind !== "purchase_service") return Response.json({ error: "A Ficha de Pedido é utilizada na O.S. de compras e serviços." }, { status: 400 });
      if (!orderItems.length) return Response.json({ error: "Lance todos os produtos e serviços antes de solicitar a Ficha." }, { status: 400 });
      if (orderItems.some((item) => item.itemOrigin !== "stock_withdrawal" && !item.supplierName?.trim())) return Response.json({ error: "Informe o fornecedor de cada produto ou serviço comprado antes de solicitar a Ficha." }, { status: 400 });
      if (!order.requestPrintedAt) return Response.json({ error: "Imprima e confira a Ficha antes de solicitar a aprovação." }, { status: 400 });
      const now = new Date().toISOString();
      await db.update(maintenanceOrders).set({ maintenanceStatus: "Aguardando aprovação da Ficha", requestApprovalStatus: "pending", approvalRequestedAt: now, approvalRequestedBy: access.user.userId, approvedAt: null, approvedBy: null }).where(eq(maintenanceOrders.id, order.id));
      return Response.json({ requestApprovalStatus: "pending", requestedAt: now });
    }
    if (body.action === "approve") {
      if (order.requestApprovalStatus !== "pending") return Response.json({ error: "A Ficha precisa estar aguardando aprovação." }, { status: 400 });
      const now = new Date().toISOString();
      await db.update(maintenanceOrders).set({ maintenanceStatus: "Ficha aprovada", requestApprovalStatus: "approved", approvedAt: now, approvedBy: access.user.userId }).where(eq(maintenanceOrders.id, order.id));
      return Response.json({ requestApprovalStatus: "approved", approvedAt: now });
    }
    if (order.orderKind === "purchase_service" && !orderItems.length) return Response.json({ error: "Inclua ao menos uma peça ou serviço antes de concluir a O.S. de compra e serviços." }, { status: 400 });
    if (order.orderKind === "purchase_service" && order.requestApprovalStatus !== "approved") return Response.json({ error: "A Ficha de Pedido precisa ser solicitada e aprovada antes de concluir a O.S." }, { status: 400 });
    if (!body.closedAt || !/^\d{4}-\d{2}-\d{2}$/.test(body.closedAt)) return Response.json({ error: "Informe a data real de encerramento da O.S." }, { status: 400 });
    const closedAt = body.closedAt;
    if (closedAt < order.startedAt) return Response.json({ error: "A data de encerramento não pode ser anterior à abertura da O.S." }, { status: 400 });
    await db.update(maintenanceOrders).set({ status: "closed", maintenanceStatus: "Concluída", closedAt }).where(eq(maintenanceOrders.id, order.id));
    if (order.orderKind === "purchase_service") {
      await db.update(maintenanceOrderItems).set({ appropriationPosted: true }).where(eq(maintenanceOrderItems.maintenanceOrderId, order.id));
    } else {
      await db.update(equipment).set({ status: "available" }).where(eq(equipment.id, order.equipmentId));
    }
    return Response.json({ status: "closed", closedAt, appropriationPosted: order.orderKind === "purchase_service" });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const id = url.searchParams.get("id") || "";
    await requirePermission(companyId, "maintenance", "delete");
    const db = getDb();
    const [order] = await db.select().from(maintenanceOrders).where(and(eq(maintenanceOrders.id, id), eq(maintenanceOrders.companyId, companyId))).limit(1);
    if (!order) return Response.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
    await db.update(dailyPartEntries).set({ maintenanceOrderId: null }).where(eq(dailyPartEntries.maintenanceOrderId, order.id));
    await db.update(maintenanceOrders).set({ originMaintenanceOrderId: null }).where(and(eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.originMaintenanceOrderId, order.id)));
    await db.delete(emailNotifications).where(eq(emailNotifications.maintenanceOrderId, order.id));
    await db.delete(maintenanceOrderItems).where(eq(maintenanceOrderItems.maintenanceOrderId, order.id));
    await db.delete(maintenanceOrders).where(and(eq(maintenanceOrders.id, order.id), eq(maintenanceOrders.companyId, companyId)));
    if (order.orderKind === "daily_maintenance") {
      const [anotherOpenOrder] = await db.select({ id: maintenanceOrders.id }).from(maintenanceOrders).where(and(eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.equipmentId, order.equipmentId), eq(maintenanceOrders.orderKind, "daily_maintenance"), eq(maintenanceOrders.status, "open"), ne(maintenanceOrders.id, order.id))).limit(1);
      if (!anotherOpenOrder) await db.update(equipment).set({ status: "available" }).where(and(eq(equipment.id, order.equipmentId), eq(equipment.companyId, companyId)));
    }
    return Response.json({ deleted: true, orderNumber: order.orderNumber });
  } catch (error) { return apiError(error); }
}
