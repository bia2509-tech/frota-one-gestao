import { and, desc, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { equipment, equipmentDocuments } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedDocuments = new Set(["crlv", "tachograph", "insurance"]);

async function validateEquipment(companyId: string, equipmentId: string) {
  const [record] = await getDb().select({ id: equipment.id }).from(equipment)
    .where(and(eq(equipment.id, equipmentId), eq(equipment.companyId, companyId))).limit(1);
  if (!record) throw new Response("Equipamento não encontrado.", { status: 404 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "";
    const equipmentId = url.searchParams.get("equipmentId") || "", id = url.searchParams.get("id");
    await requirePermission(companyId, "equipment", "view");
    if (id) {
      const [document] = await getDb().select().from(equipmentDocuments)
        .where(and(eq(equipmentDocuments.id, id), eq(equipmentDocuments.companyId, companyId))).limit(1);
      if (!document) return Response.json({ error: "Documento não encontrado." }, { status: 404 });
      const object = await env.BUCKET.get(document.objectKey);
      if (!object) return Response.json({ error: "Arquivo indisponível." }, { status: 404 });
      return new Response(object.body, { headers: { "content-type": document.contentType, "content-disposition": `inline; filename="${document.fileName}"`, "cache-control": "private, no-store" } });
    }
    await validateEquipment(companyId, equipmentId);
    const documents = await getDb().select().from(equipmentDocuments)
      .where(and(eq(equipmentDocuments.companyId, companyId), eq(equipmentDocuments.equipmentId, equipmentId)))
      .orderBy(desc(equipmentDocuments.uploadedAt));
    return Response.json({ documents });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const companyId = String(form.get("companyId") || ""), equipmentId = String(form.get("equipmentId") || "");
    const documentType = String(form.get("documentType") || ""), file = form.get("file");
    const access = await requirePermission(companyId, "equipment", "update");
    await validateEquipment(companyId, equipmentId);
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024)
      return Response.json({ error: "Envie um PDF, JPG ou PNG de até 10 MB." }, { status: 400 });
    if (!allowedDocuments.has(documentType)) return Response.json({ error: "Tipo de documento inválido." }, { status: 400 });
    const id = crypto.randomUUID(), safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `equipment-documents/${companyId}/${equipmentId}/${documentType}/${id}-${safeName}`;
    await env.BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { companyId, equipmentId, documentType } });
    const document = { id, companyId, equipmentId, documentType, fileName: file.name, objectKey, contentType: file.type, sizeBytes: file.size, readingStatus: "stored", uploadedBy: access.user.userId, uploadedAt: new Date().toISOString() };
    await getDb().run(sql`INSERT INTO equipment_documents
      (id, company_id, equipment_id, document_type, file_name, object_key,
       content_type, size_bytes, reading_status, uploaded_by, uploaded_at)
      VALUES (${document.id}, ${document.companyId}, ${document.equipmentId}, ${document.documentType},
       ${document.fileName}, ${document.objectKey}, ${document.contentType}, ${document.sizeBytes},
       ${document.readingStatus}, ${document.uploadedBy}, ${document.uploadedAt})`);
    const previous = await getDb().select().from(equipmentDocuments).where(and(
      eq(equipmentDocuments.companyId, companyId), eq(equipmentDocuments.equipmentId, equipmentId),
      eq(equipmentDocuments.documentType, documentType),
    )).orderBy(desc(equipmentDocuments.uploadedAt));
    for (const old of previous.slice(1)) {
      await env.BUCKET.delete(old.objectKey);
      await getDb().delete(equipmentDocuments).where(eq(equipmentDocuments.id, old.id));
    }
    return Response.json({ document }, { status: 201 });
  } catch (error) { return apiError(error); }
}
