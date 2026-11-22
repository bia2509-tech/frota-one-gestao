import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, contractEquipmentItems, contracts, deletionRequests, dailyPartEntries, emailNotifications, equipment, fiscalInvoiceItems, fiscalInvoicePayments, fiscalInvoices, fuelEntries, maintenanceOrderItems, maintenanceOrders, masterData, measurements, quickServiceEntries, suppliers } from "@/db/schema";
import { apiError, requireCompanyAccess, requirePermission } from "@/lib/tenant";

const allowedEntities = new Set(["equipment", "maintenance_order", "fiscal_invoice", "daily_part", "measurement", "supplier", "master_data", "contract", "fuel_entry", "quick_service", "reopen_maintenance_order", "reopen_fuel_entry", "reopen_quick_service"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "";
    const access = await requireCompanyAccess(companyId);
    if (!['super_admin', 'company_admin'].includes(access.membership.role)) return Response.json({ error: "Somente administradores podem consultar as solicitações." }, { status: 403 });
    const requests = await getDb().select().from(deletionRequests).where(eq(deletionRequests.companyId, companyId)).orderBy(desc(deletionRequests.requestedAt));
    return Response.json({ requests, canApprove: access.membership.role === "super_admin" });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; module?: string; entityType?: string; entityId?: string; entityLabel?: string; reason?: string; snapshot?: unknown };
    const companyId = body.companyId || "", entityType = body.entityType || "", reason = body.reason?.trim() || "";
    const permissionModule = body.module === "quick_services" ? "maintenance" : body.module || "master_data";
    const access = await requirePermission(companyId, permissionModule, "update");
    if (!allowedEntities.has(entityType) || !body.entityId || !body.entityLabel?.trim()) return Response.json({ error: "Registro inválido para exclusão." }, { status: 400 });
    if (reason.length < 10) return Response.json({ error: "Informe uma justificativa com pelo menos 10 caracteres." }, { status: 400 });
    const existing = await getDb().select({ id: deletionRequests.id }).from(deletionRequests).where(and(eq(deletionRequests.companyId, companyId), eq(deletionRequests.entityType, entityType), eq(deletionRequests.entityId, body.entityId), eq(deletionRequests.status, "pending"))).limit(1);
    if (existing.length) return Response.json({ error: "Já existe uma solicitação de exclusão pendente para este registro." }, { status: 409 });
    const now = new Date().toISOString(), id = crypto.randomUUID();
    const isReopen = entityType.startsWith("reopen_");
    const masterDirect = access.membership.role === "super_admin";
    if (masterDirect) await deleteApproved(companyId, entityType, body.entityId);
    await getDb().insert(deletionRequests).values({ id, companyId, module: body.module || "master_data", entityType, entityId: body.entityId, entityLabel: body.entityLabel.trim(), reason, snapshotJson: JSON.stringify(body.snapshot ?? null), status: masterDirect ? "approved" : "pending", requestedBy: access.user.userId, requestedByName: access.membership.displayName || access.user.email || "Usuário", requestedAt: now, reviewedBy: masterDirect ? access.user.userId : null, reviewedByName: masterDirect ? access.membership.displayName || access.user.email || "Administrador Master" : null, reviewedAt: masterDirect ? now : null });
    await getDb().insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: `${masterDirect ? "Executou" : "Solicitou"} ${isReopen ? "reabertura" : "exclusão"}: ${reason}`, entity: entityType, entityId: body.entityId, createdAt: now });
    return Response.json({ id, status: masterDirect ? "approved" : "pending", message: masterDirect ? `${isReopen ? "Reabertura" : "Exclusão"} concluída e registrada na auditoria.` : `Solicitação de ${isReopen ? "reabertura" : "exclusão"} enviada para aprovação do Administrador Master.` }, { status: 201 });
  } catch (error) { return apiError(error); }
}

async function deleteApproved(companyId: string, entityType: string, entityId: string) {
  const db = getDb();
  if (entityType === "supplier") return db.delete(suppliers).where(and(eq(suppliers.id, entityId), eq(suppliers.companyId, companyId)));
  if (entityType === "master_data") return db.delete(masterData).where(and(eq(masterData.id, entityId), eq(masterData.companyId, companyId)));
  if (entityType === "daily_part") return db.delete(dailyPartEntries).where(and(eq(dailyPartEntries.id, entityId), eq(dailyPartEntries.companyId, companyId)));
  if (entityType === "measurement") return db.delete(measurements).where(and(eq(measurements.id, entityId), eq(measurements.companyId, companyId)));
  if (entityType === "fuel_entry") return db.delete(fuelEntries).where(and(eq(fuelEntries.id, entityId), eq(fuelEntries.companyId, companyId)));
  if (entityType === "quick_service") return db.delete(quickServiceEntries).where(and(eq(quickServiceEntries.id, entityId), eq(quickServiceEntries.companyId, companyId)));
  if (entityType === "reopen_maintenance_order") return db.update(maintenanceOrders).set({ status: "open", closedAt: null }).where(and(eq(maintenanceOrders.id, entityId), eq(maintenanceOrders.companyId, companyId)));
  if (entityType === "reopen_fuel_entry") return db.update(fuelEntries).set({ status: "draft" }).where(and(eq(fuelEntries.id, entityId), eq(fuelEntries.companyId, companyId)));
  if (entityType === "reopen_quick_service") return db.update(quickServiceEntries).set({ status: "draft" }).where(and(eq(quickServiceEntries.id, entityId), eq(quickServiceEntries.companyId, companyId)));
  if (entityType === "contract") {
    const linkedMeasurements = await db.select({ id: measurements.id }).from(measurements).where(and(eq(measurements.contractId, entityId), eq(measurements.companyId, companyId))).limit(1);
    if (linkedMeasurements.length) throw new Error("Contrato possui medições vinculadas.");
    await db.delete(contractEquipmentItems).where(and(eq(contractEquipmentItems.contractId, entityId), eq(contractEquipmentItems.companyId, companyId)));
    return db.delete(contracts).where(and(eq(contracts.id, entityId), eq(contracts.companyId, companyId)));
  }
  if (entityType === "fiscal_invoice") {
    await db.delete(fiscalInvoicePayments).where(and(eq(fiscalInvoicePayments.invoiceId, entityId), eq(fiscalInvoicePayments.companyId, companyId)));
    await db.delete(fiscalInvoiceItems).where(and(eq(fiscalInvoiceItems.invoiceId, entityId), eq(fiscalInvoiceItems.companyId, companyId)));
    return db.delete(fiscalInvoices).where(and(eq(fiscalInvoices.id, entityId), eq(fiscalInvoices.companyId, companyId)));
  }
  if (entityType === "maintenance_order") {
    const [order] = await db.select().from(maintenanceOrders).where(and(eq(maintenanceOrders.id, entityId), eq(maintenanceOrders.companyId, companyId))).limit(1);
    if (!order) return;
    await db.update(dailyPartEntries).set({ maintenanceOrderId: null }).where(and(eq(dailyPartEntries.companyId, companyId), eq(dailyPartEntries.maintenanceOrderId, entityId)));
    await db.update(maintenanceOrders).set({ originMaintenanceOrderId: null }).where(and(eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.originMaintenanceOrderId, entityId)));
    await db.delete(emailNotifications).where(and(eq(emailNotifications.companyId, companyId), eq(emailNotifications.maintenanceOrderId, entityId)));
    await db.delete(maintenanceOrderItems).where(and(eq(maintenanceOrderItems.maintenanceOrderId, entityId), eq(maintenanceOrderItems.companyId, companyId)));
    await db.delete(maintenanceOrders).where(and(eq(maintenanceOrders.id, entityId), eq(maintenanceOrders.companyId, companyId)));
    if (order.orderKind === "daily_maintenance") {
      const [anotherOpenOrder] = await db.select({ id: maintenanceOrders.id }).from(maintenanceOrders).where(and(eq(maintenanceOrders.companyId, companyId), eq(maintenanceOrders.equipmentId, order.equipmentId), eq(maintenanceOrders.orderKind, "daily_maintenance"), eq(maintenanceOrders.status, "open"), ne(maintenanceOrders.id, entityId))).limit(1);
      if (!anotherOpenOrder) await db.update(equipment).set({ status: "available" }).where(and(eq(equipment.id, order.equipmentId), eq(equipment.companyId, companyId)));
    }
    return;
  }
  return db.delete(equipment).where(and(eq(equipment.id, entityId), eq(equipment.companyId, companyId)));
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { companyId?: string; id?: string; decision?: "approved" | "rejected"; note?: string };
    const companyId = body.companyId || ""; const access = await requireCompanyAccess(companyId, true);
    if (access.membership.role !== "super_admin") return Response.json({ error: "Somente o Administrador Master pode aprovar exclusões." }, { status: 403 });
    const [record] = await getDb().select().from(deletionRequests).where(and(eq(deletionRequests.id, body.id || ""), eq(deletionRequests.companyId, companyId))).limit(1);
    if (!record || record.status !== "pending") return Response.json({ error: "Solicitação pendente não encontrada." }, { status: 404 });
    const now = new Date().toISOString(), decision = body.decision === "approved" ? "approved" : "rejected";
    if (decision === "approved") {
      try { await deleteApproved(companyId, record.entityType, record.entityId); }
      catch { await getDb().update(deletionRequests).set({ status: "failed", reviewedBy: access.user.userId, reviewedByName: access.membership.displayName || access.user.email || "Administrador Master", reviewedAt: now, reviewNote: "Exclusão bloqueada porque o registro possui vínculos com outros lançamentos." }).where(eq(deletionRequests.id, record.id)); return Response.json({ error: "Exclusão bloqueada: o registro possui vínculos. Cancele ou corrija os lançamentos relacionados antes de excluir." }, { status: 409 }); }
    }
    await getDb().update(deletionRequests).set({ status: decision, reviewedBy: access.user.userId, reviewedByName: access.membership.displayName || access.user.email || "Administrador Master", reviewedAt: now, reviewNote: body.note?.trim() || null }).where(eq(deletionRequests.id, record.id));
    const actionName = record.entityType.startsWith("reopen_") ? "reabertura" : "exclusão";
    await getDb().insert(auditLog).values({ id: crypto.randomUUID(), companyId, userId: access.user.userId, action: `${decision === "approved" ? "Aprovou" : "Rejeitou"} ${actionName}${body.note ? `: ${body.note}` : ""}`, entity: record.entityType, entityId: record.entityId, createdAt: now });
    return Response.json({ status: decision });
  } catch (error) { return apiError(error); }
}
