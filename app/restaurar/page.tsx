"use client";

import { useState } from "react";

const ORDERED_TABLES = [
  "companies", "company_users", "user_module_permissions", "master_data",
  "suppliers", "products", "contracts", "contract_documents", "contract_equipment_items",
  "measurements", "equipment", "equipment_documents", "equipment_checklists",
  "maintenance_orders", "maintenance_order_items", "fiscal_invoices", "fiscal_invoice_items",
  "fiscal_invoice_payments", "fiscal_credit_notes", "fuel_convoys", "fuel_convoy_sequences",
  "fuel_entries", "fuel_credit_usages", "fuel_stock_movements", "daily_part_entries",
  "quick_service_entries", "quotation_maps", "quotation_options",
  "appropriation_adjustments", "deletion_requests", "email_notifications", "audit_log",
];

export default function RestaurarBackupPage() {
  const [status, setStatus] = useState("Selecione o arquivo de backup (.json) da pasta Downloads.");
  const [working, setWorking] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setWorking(true);
    setStatus("Lendo arquivo de backup...");

    try {
      const text = await file.text();
      const backupPayload = JSON.parse(text);
      const dataObj = backupPayload?.data;

      if (!dataObj || typeof dataObj !== "object") {
        setWorking(false);
        return setStatus("Arquivo inválido: estrutura de backup não encontrada.");
      }

      const allTables = Array.from(new Set([...ORDERED_TABLES, ...Object.keys(dataObj)]));
      let totalRestored = 0;

      for (const tableName of allTables) {
        const rows = dataObj[tableName];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        for (let start = 0; start < rows.length; start += 40) {
          const chunk = rows.slice(start, start + 40);
          setStatus(`Restaurando ${tableName} (${Math.min(start + 40, rows.length)}/${rows.length})...`);

          const response = await fetch("/api/backups", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "import",
              companyId: backupPayload.companyId || "",
              backupPayload: {
                format: backupPayload.format || "frota-one-backup-v1",
                companyId: backupPayload.companyId || "",
                data: { [tableName]: chunk },
              },
            }),
          });

          const rawText = await response.text();
          let resData: { ok?: boolean; restoredCount?: number; error?: string; erro?: string } = {};
          try {
            resData = JSON.parse(rawText);
          } catch {
            setWorking(false);
            return setStatus(`Falha na tabela ${tableName} (HTTP ${response.status}): ${rawText.slice(0, 120)}`);
          }

          if (!response.ok) {
            setWorking(false);
            return setStatus(resData.error || resData.erro || `Erro ao restaurar ${tableName}.`);
          }

          totalRestored += resData.restoredCount ?? 0;
        }
      }

      setWorking(false);
      setStatus(`Concluído com sucesso! ${totalRestored} registros restaurados.`);
    } catch (err) {
      setWorking(false);
      setStatus(`Erro ao ler arquivo: ${err instanceof Error ? err.message : "arquivo inválido"}`);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold">Restaurar Backup (.json)</h1>
        <p className="text-sm text-gray-600">{status}</p>
        <div className="flex items-center gap-3">
          <label className={`cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white ${working ? "opacity-50 pointer-events-none" : ""}`}>
            {working ? "Importando..." : "Selecionar arquivo .json"}
            <input type="file" accept=".json,application/json" className="hidden" disabled={working} onChange={handleFileChange} />
          </label>
          <a href="/" className="rounded-lg border px-4 py-2 text-sm font-medium">
            Voltar ao sistema
          </a>
        </div>
      </div>
    </main>
  );
}
