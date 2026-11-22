async function importBackupFile(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  setWorking(true);
  setMessage("Lendo arquivo de backup...");
  try {
    const text = await file.text();
    const backupPayload = JSON.parse(text);
    const tables = Object.keys(backupPayload?.data || {});
    if (tables.length === 0) {
      setWorking(false);
      return setMessage("O arquivo selecionado não possui registros para importar.");
    }

    let totalRestored = 0;
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];
      const rows = backupPayload.data[tableName];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      setMessage(`Restaurando ${tableName} (${i + 1}/${tables.length})...`);
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "import",
          companyId: backupPayload.companyId || companyId,
          backupPayload: {
            format: backupPayload.format,
            companyId: backupPayload.companyId || companyId,
            data: { [tableName]: rows },
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setWorking(false);
        return setMessage(data.error || data.erro || `Erro ao restaurar tabela ${tableName}.`);
      }
      totalRestored += data.restoredCount ?? 0;
    }

    setWorking(false);
    setMessage(`Backup restaurado com sucesso! ${totalRestored} registros importados.`);
    if (backupPayload.companyId) {
      setCompanyId(backupPayload.companyId);
      await loadBackups(backupPayload.companyId);
    }
    setTimeout(() => window.location.reload(), 1200);
  } catch {
    setWorking(false);
    setMessage("Arquivo de backup inválido. Selecione o arquivo .json gerado pelo sistema.");
  }
}
