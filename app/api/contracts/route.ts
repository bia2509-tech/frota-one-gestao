import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { contractDocuments, contracts } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const contractId = url.searchParams.get("contractId") || "";
    const fileId = url.searchParams.get("fileId") || "";
    await requirePermission(companyId, "contracts", "view");
    const db = getDb();

    if (fileId) {
      const [file] = await db.select().from(contractDocuments).where(and(
        eq(contractDocuments.id, fileId),
        eq(contractDocuments.companyId, companyId),
      )).limit(1);
      if (!file) return Response.json({ error: "Documento não encontrado." }, { status: 404 });
      const object = await env.BUCKET.get(file.objectKey);
      if (!object) return Response.json({ error: "Arquivo indisponível no armazenamento." }, { status: 404 });
      return new Response(object.body, {
        headers: {
          "content-type": file.contentType,
          "content-length": String(file.sizeBytes),
          "content-disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(file.fileName),
          "cache-control": "private, no-store",
        },
      });
    }

    if (!contractId) return Response.json({ error: "Contrato não informado." }, { status: 400 });
    const [contract] = await db.select({ id: contracts.id }).from(contracts).where(and(
      eq(contracts.id, contractId),
      eq(contracts.companyId, companyId),
    )).limit(1);
    if (!contract) return Response.json({ error: "Contrato não encontrado." }, { status: 404 });
    const documents = await db.select().from(contractDocuments).where(and(
      eq(contractDocuments.companyId, companyId),
      eq(contractDocuments.contractId, contractId),
    )).orderBy(desc(contractDocuments.uploadedAt));
    return Response.json({ documents });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  let storedKey = "";
  try {
    const form = await request.formData();
    const companyId = String(form.get("companyId") || "");
    const contractId = String(form.get("contractId") || "");
    const documentType = String(form.get("documentType") || "").trim();
    const entry = form.get("file");
    const access = await requirePermission(companyId, "contracts", "create");
    if (!contractId || !documentType || !(entry instanceof File)) {
      return Response.json({ error: "Informe contrato, tipo de documento e arquivo." }, { status: 400 });
    }
    if (entry.size < 1 || entry.size > MAX_FILE_BYTES) {
      return Response.json({ error: "O arquivo deve ter até 20 MB." }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(entry.type)) {
      return Response.json({ error: "Formato não permitido. Use PDF, XLSX, DOCX, JPG ou PNG." }, { status: 415 });
    }
    const db = getDb();
    const [contract] = await db.select({ id: contracts.id }).from(contracts).where(and(
      eq(contracts.id, contractId),
      eq(contracts.companyId, companyId),
    )).limit(1);
    if (!contract) return Response.json({ error: "Contrato não encontrado nesta empresa." }, { status: 404 });

    const id = crypto.randomUUID();
    const cleanName = entry.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 160) || "documento";
    const objectKey = "contracts/" + companyId + "/" + contractId + "/" + id + "-" + cleanName;
    storedKey = objectKey;
    const uploadedAt = new Date().toISOString();
    await env.BUCKET.put(objectKey, entry.stream(), {
      httpMetadata: { contentType: entry.type },
      customMetadata: { companyId, contractId, documentType, uploadedBy: access.user.userId, uploadedAt },
    });
    const row = {
      id, companyId, contractId, documentType, fileName: cleanName, objectKey,
      contentType: entry.type, sizeBytes: entry.size, uploadedBy: access.user.userId, uploadedAt,
    };
    await db.insert(contractDocuments).values(row);
    return Response.json({ document: row }, { status: 201 });
  } catch (error) {
    if (storedKey && env.BUCKET) await env.BUCKET.delete(storedKey).catch(() => undefined);
    return apiError(error);
  }
}
