import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { backupSnapshots } from "@/db/schema";
import { apiError, requireCompanyAccess } from "@/lib/tenant";

const COMPANY_TABLES = [
  "companies", "company_users", "contracts", "contract_documents", "contract_equipment_items", "measurements", "audit_log",
  "appropriation_adjustments", "deletion_requests", "user_module_permissions", "suppliers", "products", "equipment", "equipment_documents", "equipment_checklists", "maintenance_orders",
  "maintenance_order_items", "fiscal_invoices", "fiscal_invoice_items",
  "fiscal_invoice_payments", "fiscal_credit_notes", "fuel_credit_usages", "daily_part_entries", "fuel_entries", "fuel_convoys", "fuel_convoy_sequences", "fuel_stock_movements", "quick_service_entries", "email_notifications", "quotation_maps", "quotation_options",
  "master_data",
];

async function requireBackupAdmin(companyId: string) {
  const access = await requireCompanyAccess(companyId, true);
  if (!['super_admin', 'company_admin'].includes(access.membership.role)) {
    throw new Response("Somente administradores podem acessar backups.", { status: 403 });
  }
  return access;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    await requireBackupAdmin(companyId);
    const id = url.searchParams.get("id");
    if (id) {
      const [snapshot] = await getDb().select().from(backupSnapshots)
        .where(eq(backupSnapshots.id, id)).limit(1);
      if (!snapshot || snapshot.companyId !== companyId) {
        return Response.json({ error: "Backup não encontrado." }, { status: 404 });
      }
      const object = await env.BUCKET.get(snapshot.objectKey);
      if (!object) return Response.json({ error: "Arquivo de backup indisponível." }, { status: 404 });
      return new Response(object.body, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${snapshot.fileName}"`,
          "cache-control": "private, no-store",
        },
      });
    }
    const backups = await getDb().select().from(backupSnapshots)
      .where(eq(backupSnapshots.companyId, companyId))
      .orderBy(desc(backupSnapshots.createdAt)).limit(50);
    return Response.json({ backups });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      companyId?: string;
      action?: string;
      backupPayload?: {
        format?: string;
        companyId?: string;
        data?: Record<string, Record<string, unknown>[]>;
      };
    };

    if (body.action === "import" && body.backupPayload?.data) {
      const payload = body.backupPayload;
      if (payload.format && payload.format !== "frota-one-backup-v1") {
        return Response.json({ error: "Formato de arquivo de backup inválido." }, { status: 400 });
      }
      const targetCompanyId = payload.companyId || body.companyId || "";
      if (!targetCompanyId) {
        return Response.json({ error: "Empresa do backup não identificada." }, { status: 400 });
      }
      await requireBackupAdmin(targetCompanyId);

      let restoredCount = 0;
      await env.DB.prepare("PRAGMA foreign_keys = OFF").run();

      for (const table of COMPANY_TABLES) {
        const rows = payload.data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const statements = [];
        for (const row of rows) {
          const cols = Object.keys(row).filter((k) => /^[a-zA-Z0-9_]+$/.test(k));
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => "?").join(", ");
          const values = cols.map((col) => (row[col] === undefined ? null : row[col]));
          statements.push(
            env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`).bind(...values)
          );
          restoredCount++;
        }

        for (let i = 0; i < statements.length; i += 50) {
          await env.DB.batch(statements.slice(i, i + 50));
        }
      }

      await env.DB.prepare("PRAGMA foreign_keys = ON").run();
      return Response.json({ ok: true, restoredCount, companyId: targetCompanyId });
    }

    const companyId = body.companyId || "";
    const access = await requireBackupAdmin(companyId);
    const data: Record<string, unknown[]> = {};
    let recordCount = 0;
    for (const table of COMPANY_TABLES) {
      const result = table === "companies"
        ? await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(companyId).all()
        : await env.DB.prepare(`SELECT * FROM ${table} WHERE company_id = ?`).bind(companyId).all();
      data[table] = result.results as unknown[];
      recordCount += result.results.length;
    }
    const createdAt = new Date().toISOString();
    const safeStamp = createdAt.replace(/[:.]/g, "-");
    const id = crypto.randomUUID();
    const fileName = `frota-one-backup-${safeStamp}.json`;
    const objectKey = `backups/${companyId}/${fileName}`;
    const payload = JSON.stringify({
      format: "frota-one-backup-v1", companyId, createdAt,
      createdBy: access.user.userId, recordCount, data,
    }, null, 2);
    await env.BUCKET.put(objectKey, payload, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { companyId, createdAt },
    });
    const snapshot = {
      id, companyId, objectKey, fileName, recordCount,
      sizeBytes: new TextEncoder().encode(payload).byteLength,
      createdBy: access.user.userId, createdAt,
    };
    await getDb().insert(backupSnapshots).values(snapshot);
    return Response.json({ backup: snapshot }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
