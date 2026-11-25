import { env } from "cloudflare:workers";
import { apiError, requirePermission } from "@/lib/tenant";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const companyId = String(form.get("companyId") || "");
    await requirePermission(companyId, "fuel", "create");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return Response.json({ error: "Selecione um comprovante." }, { status: 400 });
    if (!allowedTypes.has(file.type) || file.size > maxBytes) return Response.json({ error: "O comprovante deve ser PDF ou imagem (JPG, PNG, WEBP) de até 15 MB." }, { status: 400 });
    const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-100) || "comprovante";
    const objectKey = `fuel-receipts/${companyId}/${crypto.randomUUID()}/${safeName}`;
    await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    return Response.json({ objectKey, fileName: file.name, sizeBytes: file.size, contentType: file.type }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), companyId = url.searchParams.get("companyId") || "", objectKey = url.searchParams.get("key") || "";
    await requirePermission(companyId, "fuel", "view");
    if (!objectKey.startsWith(`fuel-receipts/${companyId}/`)) return Response.json({ error: "Comprovante não encontrado." }, { status: 404 });
    const object = await env.BUCKET.get(objectKey);
    if (!object) return Response.json({ error: "Comprovante indisponível." }, { status: 404 });
    const contentType = object.httpMetadata?.contentType || "application/octet-stream";
    const inlineImage = url.searchParams.get("inline") === "1" && contentType.startsWith("image/");
    return new Response(object.body, { headers: {
      "content-type": contentType,
      "content-disposition": inlineImage ? "inline" : "attachment",
      "cache-control": "private, no-store",
    } });
  } catch (error) { return apiError(error); }
}
