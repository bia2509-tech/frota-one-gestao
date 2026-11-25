"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Fuel, Plus, Upload, FileSpreadsheet, Search, Truck, X, CheckCircle2, Download, Clock3, Printer } from "lucide-react";
import { offlineRequest } from "@/lib/offline";

type Equipment = { id: string; fleetNumber: string; plate: string | null; description: string; equipmentType?: string | null; serialNumber?: string | null; projectName?: string | null; costCenter?: string | null; operatorName?: string | null; ownerName?: string | null };
type EquipmentOption = Pick<Equipment, "id" | "fleetNumber" | "plate" | "description">;
type Supplier = { id: string; name: string; active?: boolean };
type Location = { id: string; name: string; description?: string | null };
type Credit = { id: string; supplierId: string; supplierName: string; creditNumber: string; issueDate: string; originalCents: number; remainingCents: number };
type Convoy = { id: string; equipmentId: string; convoyNumber: string; maintenanceLocation: string | null; costCenter: string | null; supplierName: string | null; fleetNumber: string; plate: string | null; description: string; capacityMilli: number; openingBalanceMilli: number; balanceMilli: number; percent: number; status: string };
type FuelEntry = { id: string; equipmentId: string | null; systemNumber: number; entryDate: string; entryTime?: string | null; requisitionCoupon?: string | null; rn?: string | null; fleetNumber: string; plate: string | null; description: string; externalIdentifier?: string | null; externalAssetType?: string | null; externalCompanyName?: string | null; externalCompanySupplierId?: string; externalDescription?: string | null; observation?: string | null; driverName?: string | null; kilometer?: number | null; station: string | null; supplierId?: string | null; supplierName?: string | null; maintenanceLocation: string | null; costCenter?: string | null; product: string; litersMilli: number; unitPriceMilli: number; totalCents: number; status: string; transactionType?: string; fuelConvoyId?: string | null; receiptObjectKey?: string | null; creditUsedCents?: number };
type StockMovement = { id: string; convoyId: string; convoyNumber: string; movementType: string; movementDate: string; quantityMilli: number; deltaMilli: number; totalCents: number; supplierName: string | null; destinationEquipment: string | null; observation: string | null };

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;
const externalAssetTypes = ["Motosserra", "Motor vibrador", "Equipamento de empresa terceirizada", "Prensa", "Roçadeira", "Motor bomba", "Motores - oficina / almoxarifado", "Compactador", "Outro equipamento externo"];
const emptyForm = () => ({ assetKind: "fleet" as "fleet" | "external", externalAssetType: "", externalIdentifier: "", externalCompanyName: "", externalCompanySupplierId: "", externalDescription: "", observation: "", entryDate: today, entryTime: "", requisitionCoupon: "", equipmentId: "", supplierId: "", maintenanceLocationId: "", costCenter: "", product: "ÓLEO DIESEL S10", productCode: "000002", liters: "", unitPrice: "", invoiceId: "", creditNoteId: "", creditAmount: "", receiptObjectKey: "" });
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((Number(cents) || 0) / 100);
const liters = (milli: number) => `${(Number(milli || 0) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} L`;
const isConvoyAsset = (e: Equipment) => /COMBOIO/i.test(`${e.equipmentType || ""} ${e.description || ""}`);
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export default function FuelManagementPage() {
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [costCenters, setCostCenters] = useState<{ id: string; name: string; active?: boolean }[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [convoys, setConvoys] = useState<Convoy[]>([]);
  const [movementHistory, setMovementHistory] = useState<StockMovement[]>([]);
  const [history, setHistory] = useState<FuelEntry[]>([]);
  const [nextSystemNumber, setNextSystemNumber] = useState(1);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [openForm, setOpenForm] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [creditAnswer, setCreditAnswer] = useState<"yes" | "no" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ from: monthStart, to: today, supplierId: "", convoyId: "", equipmentId: "", costCenter: "" });
  const [assetSearchFilter, setAssetSearchFilter] = useState("");
  const [detail, setDetail] = useState<Convoy | null>(null);
  const [openConvoyList, setOpenConvoyList] = useState(false);
  const [alertList, setAlertList] = useState(false);
  const [showCreditDetails, setShowCreditDetails] = useState(false);
  const [configureEquipmentId, setConfigureEquipmentId] = useState("");
  const [configure, setConfigure] = useState({ locationId: "", capacity: "", openingBalance: "", supplierId: "", costCenter: "" });
  const [movement, setMovement] = useState({ type: "distribution", equipmentId: "", date: today, liters: "", adjustment: "", reason: "" });
  const [importReport, setImportReport] = useState<{ imported: number; rejected: number; duplicates: number; errors: { row: number; error: string }[] } | null>(null);

  async function load(id = companyId) {
    if (!id) return;
    const params = new URLSearchParams({ companyId: id, from: filters.from, to: filters.to });
    if (filters.supplierId) params.set("supplierId", filters.supplierId);
    if (filters.convoyId) params.set("convoyId", filters.convoyId);
    if (filters.equipmentId) params.set("equipmentId", filters.equipmentId);
    const [fuelRes, stockRes, equipmentRes, supplierRes, locationRes, invoiceRes, costCenterRes] = await Promise.all([
      fetch(`/api/fuel?${params}`), fetch(`/api/fuel/stock?companyId=${encodeURIComponent(id)}`),
      fetch(`/api/equipment?companyId=${encodeURIComponent(id)}&dailyList=1&consumer=fuel`), fetch(`/api/suppliers?companyId=${encodeURIComponent(id)}&purpose=fuel`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=local_manutencao`), fetch(`/api/invoices?companyId=${encodeURIComponent(id)}`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=centro_custo`),
    ]);
    const [fuelData, stockData, equipmentData, supplierData, locationData, invoiceData, costCenterData] = await Promise.all([fuelRes.json(), stockRes.json(), equipmentRes.json(), supplierRes.json(), locationRes.json(), invoiceRes.json(), costCenterRes.json()]);
    if (!equipmentRes.ok) { setError(true); setMessage(equipmentData.error || "Não foi possível carregar os equipamentos da frota."); return; }
    if (!supplierRes.ok) { setError(true); setMessage(supplierData.error || "Não foi possível carregar os fornecedores cadastrados."); return; }
    if (!fuelRes.ok) { setError(true); setMessage(fuelData.error || "Não foi possível consultar os abastecimentos."); return; }
    setHistory(fuelData.entries || []); setNextSystemNumber(Number(fuelData.nextSystemNumber || 1)); setConvoys(stockData.convoys || []); setCredits(stockData.credits || []); setMovementHistory(stockData.history || []);
    setEquipment(equipmentData.equipment || []); setSuppliers((supplierData.suppliers || []).filter((s: Supplier) => s.active !== false));
    setLocations((locationData.records || []).filter((x: Location & { active?: boolean }) => x.active !== false)); setInvoices(invoiceData.invoices || []); setCostCenters((costCenterData.records || []).filter((x: any) => x.active !== false));
  }

  function changeCompany(id: string) {
    setError(false); setMessage(""); setCompanyId(id); setForm(emptyForm()); setCreditAnswer("");
    setFilters((current) => ({ ...current, supplierId: "", convoyId: "", equipmentId: "", costCenter: "" }));
    setAssetSearchFilter("");
    setConfigureEquipmentId(""); setDetail(null);
  }

  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); const id = rows[0]?.id || ""; setCompanyId(id); }).catch(() => { setError(true); setMessage("Não foi possível carregar as empresas."); });
  }, []);
  useEffect(() => { if (companyId) load(); }, [filters.from, filters.to, filters.supplierId, filters.convoyId, filters.equipmentId, companyId]);

  const filteredHistory = useMemo(() => {
    const query = assetSearchFilter.trim().toLocaleLowerCase("pt-BR");
    return history.filter((row) => {
      if (filters.costCenter && row.costCenter !== filters.costCenter) return false;
      if (!query) return true;
      return [row.fleetNumber, row.plate, row.externalIdentifier, row.externalAssetType, row.externalCompanyName, row.externalDescription, row.description]
        .some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(query));
    });
  }, [history, filters.costCenter, assetSearchFilter]);
  const purchases = filteredHistory.filter((x) => x.transactionType !== "distribution");
  const totalLiters = purchases.reduce((s, x) => s + x.litersMilli, 0);
  const totalValue = purchases.reduce((s, x) => s + x.totalCents, 0);
  const alertConvoys = convoys.filter((x) => x.capacityMilli > 0 && x.percent < 40);
  const costRows = useMemo(() => {
    const map = new Map<string, number>();
    filteredHistory.filter((x) => x.transactionType !== "stock_receipt").forEach((x) => map.set(x.costCenter || x.maintenanceLocation || "Sem canteiro", (map.get(x.costCenter || x.maintenanceLocation || "Sem canteiro") || 0) + x.totalCents));
    return [...map].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredHistory]);
  const equipmentRows = useMemo(() => {
    const map = new Map<string, { label: string; total: number }>();
    filteredHistory.filter((x) => x.transactionType !== "stock_receipt").forEach((x) => { const key = x.equipmentId || `external:${x.externalIdentifier || x.id}`; const current = map.get(key); map.set(key, { label: x.equipmentId ? `${x.fleetNumber} ${x.plate || x.description}` : `${x.externalIdentifier || x.fleetNumber} · ${x.externalAssetType || x.externalDescription || "Externo"}`, total: (current?.total || 0) + x.totalCents }); });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredHistory]);
  const monthlyRows = useMemo(() => {
    const map = new Map<string, { value: number; volume: number }>();
    purchases.forEach((x) => { const key = x.entryDate.slice(0, 7); const old = map.get(key) || { value: 0, volume: 0 }; map.set(key, { value: old.value + x.totalCents, volume: old.volume + x.litersMilli }); });
    return [...map].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [purchases]);
  const supplierCredits = credits.filter((x) => x.supplierId === form.supplierId && x.remainingCents > 0);
  const selectedCredit = supplierCredits.find((x) => x.id === form.creditNoteId);
  const selectedEquipment = equipment.find((x) => x.id === form.equipmentId);
  const comboioCandidates = equipment.filter(isConvoyAsset);
  const costCenterOptions = [...new Set([...costCenters.map((row) => row.name), ...equipment.map((row) => row.costCenter || row.projectName).filter(Boolean) as string[]])].sort((a, b) => a.localeCompare(b, "pt-BR"));

  function selectEquipment(id: string) {
    const found = equipment.find((e) => e.id === id);
    setForm((current) => ({ ...current, equipmentId: id, costCenter: found?.costCenter || found?.projectName || current.costCenter, maintenanceLocationId: current.maintenanceLocationId || "" }));
  }

  function printFuelReport() {
    const companyName = companies.find((company) => company.id === companyId)?.tradeName || "SEPCO1";
    const totalAmount = filteredHistory.reduce((sum, row) => sum + row.totalCents, 0);
    const fuelGroup = (product: string) => /gasolina/i.test(product) ? 2 : /s10/i.test(product) ? 1 : 0;
    const rows = filteredHistory.map((row) => {
      const asset = equipment.find((item) => item.id === row.equipmentId), external = !row.equipmentId;
      const values = [0,1,2].map((group) => group === fuelGroup(row.product) ? `<td class="num">${escapeHtml(liters(row.litersMilli))}</td><td class="num">${escapeHtml(currency(Math.round(row.unitPriceMilli / 10)))}</td><td class="num">${escapeHtml(currency(row.totalCents))}</td>` : "<td></td><td></td><td></td>").join("");
      return `<tr><td>${escapeHtml(external ? row.externalIdentifier || "" : row.fleetNumber)}</td><td>${escapeHtml(external ? "" : row.plate || "")}</td><td>${escapeHtml(asset?.serialNumber || "")}</td><td>${escapeHtml(row.driverName || asset?.operatorName || "")}</td><td>${escapeHtml(external ? row.externalCompanyName || "" : asset?.ownerName || "")}</td><td>${escapeHtml(external ? row.externalAssetType || "" : asset?.equipmentType || row.description)}</td><td>${escapeHtml(row.entryDate.split("-").reverse().join("/"))}</td><td>${escapeHtml(String(row.systemNumber || ""))}</td><td>${escapeHtml(row.requisitionCoupon || row.rn || "")}</td><td>${escapeHtml(row.kilometer ?? "")}</td><td>${escapeHtml(companyName)}</td>${values}<td class="num">${escapeHtml(currency(row.totalCents))}</td><td>${escapeHtml(row.costCenter || row.maintenanceLocation || "")}</td></tr>`;
    }).join("");
    const popup = window.open("", "_blank");
    if (!popup) { setError(true); setMessage("O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir o relatório."); return; }
    const supplier = filters.supplierId ? suppliers.find((item) => item.id === filters.supplierId)?.name || "" : "Todos";
    const from = filters.from.split("-").reverse().join("/"), to = filters.to.split("-").reverse().join("/");
    const totalVolume = filteredHistory.reduce((sum, row) => sum + row.litersMilli, 0);
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fornecimento de combustível</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font:8px Arial,sans-serif;color:#111;margin:0}header{display:flex;justify-content:space-between}header img{width:105px;max-height:34px;object-fit:contain}.number{text-align:right}h1{text-align:center;font-size:13px;margin:4px 0 7px}.project{text-align:center;font-weight:bold;margin-bottom:6px}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 10px;border:1px solid #222;padding:5px;margin-bottom:7px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #333;padding:3px 2px;vertical-align:middle;overflow-wrap:anywhere}thead th{text-align:center;font-size:7px}.num{text-align:right;white-space:nowrap}.total{text-align:right;font-weight:bold;margin-top:6px}.approval{margin-top:15px}.approval-title{text-align:center;font-weight:bold;margin-bottom:20px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;text-align:center}.signatures div{border-top:1px solid #222;padding-top:3px}.cn{display:block;font-size:7px}</style></head><body><header><img src="/assets/sepco1-logo-template.png" alt="SEPCO1"><div class="number"><b>RELATÓRIO Nº</b> ${escapeHtml(filteredHistory[0]?.systemNumber || "")} &nbsp; <b>DATA:</b> ${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</div></header><h1>RELATÓRIO DE FORNECIMENTO DE COMBUSTÍVEL</h1><div class="project">TRECHO 3 - LT 800 kV GRAÇA ARANHA SILVÂNIA</div><div class="meta"><span><b>FORNECEDOR Nº / NOME:</b> ${escapeHtml(supplier)}</span><span><b>CENTRO DE CUSTO:</b> ${escapeHtml(filters.costCenter || "Todos")}</span><span><b>MEDIÇÃO GERAL:</b> ${escapeHtml(from)} a ${escapeHtml(to)}</span><span><b>TOTAL R$:</b> ${escapeHtml(currency(totalAmount))}</span><span><b>EMPRESA:</b> ${escapeHtml(companyName)}</span><span><b>LANÇAMENTOS:</b> ${filteredHistory.length}</span><span><b>VOLUME:</b> ${escapeHtml(liters(totalVolume))}</span></div><table><thead><tr><th colspan="11">VEÍCULO / USUÁRIO</th><th colspan="3">ÓLEO DIESEL COMUM</th><th colspan="3">ÓLEO DIESEL S10</th><th colspan="3">GASOLINA</th><th rowspan="2">TOTAL</th><th rowspan="2">C. CUSTO</th></tr><tr><th>GS TAG</th><th>Placa</th><th>Série</th><th>Motorista</th><th>Proprietário</th><th>Tipo Equipamento</th><th>Data</th><th>O.S.</th><th>Requisição</th><th>Total KM</th><th>Empresa</th><th>Quant.</th><th>Preço Unit.</th><th>Valor</th><th>Quant.</th><th>Preço Unit.</th><th>Valor</th><th>Quant.</th><th>Preço Unit.</th><th>Valor</th></tr></thead><tbody>${rows || `<tr><td colspan="22">Nenhum abastecimento no período.</td></tr>`}</tbody></table><div class="total">TOTAL GERAL: ${escapeHtml(currency(totalAmount))}</div><div class="approval"><div class="approval-title">CONFERIDO E APROVADO POR:</div><div class="signatures"><div>Gerente</div><div>Subgerente</div><div>Verificador</div></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }
  async function attachReceipt(file?: File) {
    if (!file || !companyId) return;
    const payload = new FormData(); payload.set("companyId", companyId); payload.set("file", file);
    setBusy(true);
    try { const res = await fetch("/api/fuel/receipt", { method: "POST", body: payload }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Falha ao anexar o comprovante."); setForm((current) => ({ ...current, receiptObjectKey: data.objectKey })); setMessage(`Comprovante anexado: ${data.fileName}`); setError(false); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao anexar o comprovante."); setError(true); }
    setBusy(false);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!companyId) return;
    setBusy(true); setMessage(""); setError(false);
    const payload = { ...form, companyId, strict: true, source: "manual", liters: Number(form.liters), unitPrice: Number(form.unitPrice), total: Number(form.liters) * Number(form.unitPrice), creditAmount: creditAnswer === "yes" ? Number(form.creditAmount || 0) : 0, creditNoteId: creditAnswer === "yes" ? form.creditNoteId : "" };
    const res = await offlineRequest("/api/fuel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setError(true); setMessage(data.error || "Não foi possível salvar o abastecimento."); return; }
    const savedNumber = Number(data.entries?.[0]?.systemNumber || 0);
    if (savedNumber > 0) setNextSystemNumber(savedNumber + 1);
    setMessage(data.queued ? data.message : `Abastecimento ${String(savedNumber || nextSystemNumber).padStart(6, "0")} registrado e integrado ao histórico.`); setOpenForm(false); setForm(emptyForm()); setCreditAnswer("");
    if (!data.queued) load();
  }

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setImportReport(null); setMessage(""); setError(false);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames.find((n) => n.toUpperCase().includes("ABASTEC")) || workbook.SheetNames[0];
      const matrix = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
      const headerIndex = matrix.findIndex((row) => row.some((v) => /^data$/i.test(String(v).trim())) && row.some((v) => /placa|id/i.test(String(v).trim())));
      if (headerIndex < 0) throw new Error("Cabeçalho padrão não encontrado. Baixe e use o modelo do sistema.");
      const headers = matrix[headerIndex].map((v) => String(v).trim().toLocaleLowerCase("pt-BR"));
      const pick = (row: any[], aliases: string[]) => { const i = headers.findIndex((h) => aliases.some((name) => h === name.toLocaleLowerCase("pt-BR"))); return i < 0 ? "" : row[i]; };
      const toDate = (value: any) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).includes("/") ? String(value).split("/").reverse().join("-") : String(value).slice(0, 10);
      const rows = matrix.slice(headerIndex + 1).filter((r) => r.some(Boolean)).map((row, i) => ({
        entryDate: toDate(pick(row, ["Data"])), entryTime: String(pick(row, ["Hora"])),
        requisitionCoupon: String(pick(row, ["Requisição", "Requisicao", "Cupom", "Requisição / Cupom"])),
        fleetNumber: String(pick(row, ["ID", "Frota"])), plate: String(pick(row, ["Placa"])),
        station: String(pick(row, ["Posto", "Fornecedor", "Posto / Fornecedor"])),
        maintenanceLocation: String(pick(row, ["Local de manutenção", "Local de manutencao"])),
        costCenter: String(pick(row, ["Canteiro", "Centro de custo"])),
        product: String(pick(row, ["Produto", "Combustível", "Combustivel"]) || "ÓLEO DIESEL S10"),
        productCode: String(pick(row, ["Código", "Codigo"])),
        liters: Number(pick(row, ["Litros abastecidos", "Litros"])),
        unitPrice: Number(pick(row, ["Preço por litro", "Preco por litro", "Valor por litro"])),
        total: Number(pick(row, ["Custo total R$", "Valor total", "Total"])),
        kilometer: Number(pick(row, ["Km Atual", "KM"])) || null,
        hourmeter: Number(pick(row, ["Horímetro Atual", "Horimetro", "Horímetro"])) || null,
        originalExternalId: String(pick(row, ["Nº Comboio", "ID externo", "Identificação externa"])),
        observation: String(pick(row, ["Observação", "Observacao"])),
        rowNumber: i + headerIndex + 2,
      }));
      const res = await offlineRequest("/api/fuel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, source: "spreadsheet", strict: true, fileName: file.name, entries: rows }) });
      const data = await res.json();
      if (!res.ok) { const errors = data.errors || [{ row: 0, error: data.error || "Importação rejeitada." }]; const duplicates = errors.filter((x: any) => /duplicad|repetid/i.test(x.error)).length; setImportReport({ imported: 0, rejected: rows.length, duplicates, errors }); setError(true); setMessage("A planilha não foi gravada. Revise as linhas rejeitadas."); }
      else { setImportReport({ imported: data.imported, rejected: 0, duplicates: 0, errors: [] }); setMessage(`${data.imported} abastecimento(s) importado(s).`); load(); }
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : "Planilha inválida."); }
    setBusy(false);
  }

  async function configureConvoy(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(false);
    const res = await fetch("/api/fuel/stock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, action: "configure-convoy", equipmentId: configureEquipmentId, maintenanceLocationId: configure.locationId, capacity: Number(configure.capacity), openingBalance: Number(configure.openingBalance), supplierId: configure.supplierId || undefined, costCenter: configure.costCenter }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setError(true); setMessage(data.error || "Não foi possível configurar o comboio."); return; }
    setMessage(`Comboio ${data.convoy.convoyNumber} configurado. A identificação foi gerada e não pode ser alterada manualmente.`); setConfigureEquipmentId(""); setConfigure({ locationId: "", capacity: "", openingBalance: "", supplierId: "", costCenter: "" }); load();
  }

  async function saveMovement(event: React.FormEvent) {
    event.preventDefault(); if (!detail) return; setBusy(true); setError(false);
    const action = movement.type === "distribution" ? "distribution" : "adjustment";
    const res = await fetch("/api/fuel/stock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, action, convoyId: detail.id, destinationEquipmentId: movement.equipmentId, movementDate: movement.date, quantity: Number(movement.liters), delta: Number(movement.adjustment), observation: movement.reason, referenceKey: crypto.randomUUID() }) });
    const data = await res.json(); setBusy(false);
    if (!res.ok) { setError(true); setMessage(data.error || "Movimentação não realizada."); return; }
    setMessage(action === "distribution" ? "Distribuição registrada; o saldo do comboio e a apropriação foram atualizados." : "Ajuste autorizado registrado no histórico do comboio."); setMovement({ type: "distribution", equipmentId: "", date: today, liters: "", adjustment: "", reason: "" }); setDetail(null); load();
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-900">Painel de abastecimento</h2><p className="text-sm text-slate-500">Compras, estoque individual dos comboios e histórico rastreável.</p></div>
      <div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => { setForm(emptyForm()); setCreditAnswer(""); setOpenForm(true); }}><Plus size={16}/> Novo abastecimento</button><button className="btn-secondary" onClick={() => setOpenImport((x) => !x)}><Upload size={16}/> Importar planilha</button><a className="btn-secondary" href="/templates/modelo-abastecimento.xlsx" download="1.CONTROLE_DE_ABASTECIMENTO.xlsx"><FileSpreadsheet size={16}/> Planilha padrão</a></div>
    </div>

    {message && <div className={`rounded-xl border p-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div>}

    <section className="panel grid items-end gap-3 border-blue-200 bg-blue-50/60 p-4 md:grid-cols-[minmax(16rem,24rem)_1fr]">
      <label className="text-sm font-bold text-slate-700">Empresa ativa no Abastecimento<select required className="input mt-1 bg-white" value={companyId} onChange={(e) => changeCompany(e.target.value)}><option value="">Selecione a empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select></label>
      <p className="text-sm text-slate-600">Os cadastros e lançamentos exibidos abaixo pertencem à empresa selecionada.</p>
    </section>

    <section className="panel grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
      <label className="text-xs font-semibold text-slate-600">Período inicial<input className="input mt-1" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}/></label>
      <label className="text-xs font-semibold text-slate-600">Período final<input className="input mt-1" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}/></label>
      <label className="text-xs font-semibold text-slate-600">Fornecedor<select className="input mt-1" value={filters.supplierId} onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}><option value="">Todos</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Comboio<select className="input mt-1" value={filters.convoyId} onChange={(e) => setFilters({ ...filters, convoyId: e.target.value })}><option value="">Todos</option>{convoys.map((c) => <option key={c.id} value={c.id}>Comboio {c.convoyNumber} · {c.fleetNumber}</option>)}</select></label>
      <div><label className="text-xs font-semibold text-slate-600">Equipamento da frota</label><EquipmentPicker items={equipment} value={filters.equipmentId} onChange={(value) => setFilters({ ...filters, equipmentId: value })} emptyLabel="Todos" className="input mt-1" /></div>
      <label className="text-xs font-semibold text-slate-600">Centro de custo / Canteiro<select className="input mt-1" value={filters.costCenter} onChange={(e) => setFilters({ ...filters, costCenter: e.target.value })}><option value="">Todos</option>{costCenterOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
    </section>

    <section className="panel flex flex-wrap items-end justify-between gap-3 p-4"><label className="min-w-64 flex-1 text-sm font-semibold">Buscar equipamento / maquinário por ID, placa ou tipo<input className="input mt-1" value={assetSearchFilter} onChange={(e) => setAssetSearchFilter(e.target.value)} placeholder="Ex.: placa, Motosserra, Roçadeira ou empresa terceirizada"/></label><button type="button" className="btn-secondary" onClick={printFuelReport} disabled={!filteredHistory.length}><Printer size={16}/>Imprimir relatório</button></section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-sm font-semibold text-blue-900">VOLUME TOTAL (LT)</div><div className="mt-2 text-2xl font-black text-blue-950">{liters(totalLiters)}</div><div className="mt-1 text-xs text-blue-700">Entradas de combustível no período</div></div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-sm font-semibold text-blue-900">VALOR TOTAL (R$)</div><div className="mt-2 text-2xl font-black text-blue-950">{currency(totalValue)}</div><div className="mt-1 text-xs text-blue-700">Compras sem somar distribuições novamente</div></div>
      <button className="rounded-xl border border-red-200 bg-red-50 p-4 text-left" onClick={() => setOpenConvoyList(true)}><div className="text-sm font-semibold text-red-800">TOTAL COMBOIO (SALDO ATUAL)</div><div className="mt-2 text-2xl font-black text-red-900">{liters(convoys.reduce((s, c) => s + c.balanceMilli, 0))}</div><div className="mt-1 text-xs text-red-700">Clique para detalhar os comboios</div></button>
      <button className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left" onClick={() => setAlertList(true)}><div className="text-sm font-semibold text-amber-900">SALDO EM ALERTA</div><div className="mt-2 text-2xl font-black text-amber-950">{alertConvoys.length}</div><div className="mt-1 text-xs text-amber-800">Comboios abaixo de 40% da capacidade</div></button>
    </div>

    {configureEquipmentId && <section className="panel p-4"><div className="mb-3 flex justify-between"><div><h3 className="font-bold">Configurar comboio</h3><p className="text-sm text-slate-500">A identificação é criada pelo sistema e preservada no cadastro.</p></div><button className="btn-secondary" onClick={() => setConfigureEquipmentId("")}><X size={16}/></button></div><form onSubmit={configureConvoy} className="grid gap-3 md:grid-cols-5">
      <div><label className="text-sm font-semibold">Equipamento</label><EquipmentPicker items={comboioCandidates} value={configureEquipmentId} onChange={setConfigureEquipmentId} required placeholder="Digite ID ou placa do comboio" className="input mt-1" /></div>
      <label className="text-sm font-semibold">Local de manutenção<select required className="input mt-1" value={configure.locationId} onChange={(e) => setConfigure({ ...configure, locationId: e.target.value })}><option value="">Selecione</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Capacidade (L)<input required min="0.001" step="0.001" type="number" className="input mt-1" value={configure.capacity} onChange={(e) => setConfigure({ ...configure, capacity: e.target.value })}/></label>
      <label className="text-sm font-semibold">Saldo inicial (L)<input min="0" step="0.001" type="number" className="input mt-1" value={configure.openingBalance} onChange={(e) => setConfigure({ ...configure, openingBalance: e.target.value })}/></label>
      <div className="flex items-end"><button disabled={busy} className="btn-primary w-full">Salvar comboio</button></div>
    </form></section>}

    {openImport && <section className="panel p-4"><div className="flex items-center justify-between"><div><h3 className="font-bold">Importar abastecimentos</h3><p className="text-sm text-slate-500">Todas as linhas são validadas antes da gravação; números externos de comboio ficam apenas para rastreabilidade.</p></div><label className="btn-secondary cursor-pointer"><Upload size={16}/>Escolher XLSX/CSV<input className="hidden" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(e) => importFile(e.target.files?.[0])}/></label></div>{importReport && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><div>Importados: {importReport.imported} · Rejeitados: {importReport.rejected} · Possíveis duplicidades: {importReport.duplicates}</div>{importReport.errors.map((x, i) => <div key={i} className="text-red-700">Linha {x.row}: {x.error}</div>)}</div>}</section>}

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Chart title="Gastos por canteiro" rows={costRows.map(([label, value]) => ({ label, value }))}/>
          <Chart title="Equipamentos com maior gasto" rows={equipmentRows}/>
          <Chart title="Evolução mensal · compras" rows={monthlyRows.map(([label, v]) => ({ label, value: v.value, sub: liters(v.volume) }))}/>
        </div>
        <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Histórico de abastecimentos</h3><p>{filteredHistory.length} lançamento(s) · integra com a apropriação</p></div><Search size={18}/></div><div className="overflow-x-auto"><table className="min-w-[1100px]"><thead><tr><th>Código</th><th>Data / Hora</th><th>ID / Placa</th><th>Origem</th><th>Litros</th><th>Valor</th><th>Req. / Cupom</th><th>Observação</th><th>Situação</th><th>Comprovante</th></tr></thead><tbody>{filteredHistory.length ? filteredHistory.map((e) => <tr key={e.id}><td className="font-bold text-blue-800">{String(e.systemNumber || "-").padStart(6, "0")}</td><td>{e.entryDate?.split("-").reverse().join("/")}{e.entryTime ? ` · ${e.entryTime}` : ""}</td><td><div>{e.fleetNumber} · {e.plate || "-"}</div>{!e.equipmentId && <div className="text-xs text-slate-500">{e.externalAssetType}{e.externalCompanyName ? ` · ${e.externalCompanyName}` : ""}</div>}</td><td>{e.transactionType === "stock_receipt" ? `Comboio ${convoys.find((c) => c.id === e.fuelConvoyId)?.convoyNumber || ""}` : e.station || e.maintenanceLocation || "-"}</td><td>{liters(e.litersMilli)}</td><td>{currency(e.totalCents)}</td><td>{e.requisitionCoupon || e.rn || "-"}</td><td className="max-w-56 whitespace-normal">{e.observation || "-"}</td><td>{e.status === "confirmed" ? "Confirmado" : e.status}</td><td>{e.receiptObjectKey ? <a className="text-blue-700 underline" target="_blank" href={`/api/fuel/receipt?companyId=${encodeURIComponent(companyId)}&key=${encodeURIComponent(e.receiptObjectKey)}`}>Baixar</a> : "-"}</td></tr>) : <tr><td colSpan={10} className="py-8 text-center text-slate-500">Nenhum lançamento no período selecionado.</td></tr>}</tbody></table></div></section>
      </div>
      <aside className="space-y-4">
        <section className="panel p-4"><div className="flex items-center justify-between"><div><h3 className="font-bold">Comboios</h3><p className="text-xs text-slate-500">Saldo calculado por movimentação</p></div><button className="btn-secondary" onClick={() => setConfigureEquipmentId(comboioCandidates[0]?.id || "")} disabled={!comboioCandidates.length}><Truck size={15}/>Configurar</button></div><div className="mt-3 space-y-2">{convoys.map((c) => <button key={c.id} onClick={() => { setDetail(c); setAlertList(false); }} className="w-full rounded-lg border p-3 text-left hover:bg-slate-50"><div className="flex justify-between"><span className="font-bold">Comboio {c.convoyNumber} · {c.fleetNumber}</span><span className={`font-bold ${c.percent <= 20 ? "text-red-700" : c.percent < 40 ? "text-amber-700" : "text-emerald-700"}`}>{c.capacityMilli ? `${c.percent.toFixed(1)}%` : "Configurar capacidade"}</span></div><div className="mt-1 flex justify-between text-sm text-slate-600"><span>{c.maintenanceLocation || "Local não definido"}</span><span>{liters(c.balanceMilli)}</span></div></button>)}{!convoys.length && <p className="py-4 text-center text-sm text-slate-500">Nenhum comboio configurado.</p>}</div></section>
        {openForm && <form onSubmit={save} className="panel space-y-3 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Novo abastecimento</h3><button type="button" onClick={() => setOpenForm(false)}><X size={18}/></button></div>
          <label className="block text-sm font-semibold">Código automático<input readOnly inputMode="numeric" className="input mt-1 bg-slate-50 font-bold text-blue-900" value={String(nextSystemNumber).padStart(6, "0")}/><span className="mt-1 block text-xs font-normal text-slate-500">Prévia do próximo número; o código confirmado aparece no histórico.</span></label>
          <label className="block text-sm font-semibold">Requisição / Cupom<input className="input mt-1" value={form.requisitionCoupon} onChange={(e) => setForm({ ...form, requisitionCoupon: e.target.value })}/></label>
          <label className="block text-sm font-semibold">Local de manutenção<select required className="input mt-1" value={form.maintenanceLocationId} onChange={(e) => setForm({ ...form, maintenanceLocationId: e.target.value })}><option value="">Selecione</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Data<input required type="date" className="input mt-1" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })}/></label><label className="text-sm font-semibold">Hora<input type="time" className="input mt-1" value={form.entryTime} onChange={(e) => setForm({ ...form, entryTime: e.target.value })}/></label></div>
          <label className="block text-sm font-semibold">Origem do equipamento<select className="input mt-1" value={form.assetKind} onChange={(e) => setForm((current) => ({ ...current, assetKind: e.target.value as "fleet" | "external", equipmentId: "", externalIdentifier: "", externalAssetType: "", externalCompanyName: "", externalCompanySupplierId: "", externalDescription: "" }))}><option value="fleet">Equipamento da frota</option><option value="external">Equipamento / veículo externo autorizado</option></select></label>
          {form.assetKind === "fleet" ? <div><label className="block text-sm font-semibold">ID / Placa da frota</label><EquipmentPicker items={equipment} value={form.equipmentId} onChange={selectEquipment} required placeholder="Digite o ID ou a placa" className="input mt-1" /></div> : <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3"><p className="text-xs text-blue-900">Este lançamento fica separado do cadastro e do quantitativo da frota.</p><label className="block text-sm font-semibold">Tipo do equipamento externo<select required className="input mt-1 bg-white" value={form.externalAssetType} onChange={(e) => setForm({ ...form, externalAssetType: e.target.value, externalCompanyName: "", externalCompanySupplierId: "" })}><option value="">Selecione</option>{externalAssetTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="block text-sm font-semibold">Identificação (ID, placa ou patrimônio)<input required className="input mt-1 bg-white" value={form.externalIdentifier} onChange={(e) => setForm({ ...form, externalIdentifier: e.target.value })} placeholder="Ex.: placa, patrimônio ou código interno"/></label><label className="block text-sm font-semibold">Descrição / modelo<input required className="input mt-1 bg-white" value={form.externalDescription} onChange={(e) => setForm({ ...form, externalDescription: e.target.value })} placeholder="Ex.: Motosserra Stihl MS 250"/></label>{form.externalAssetType === "Equipamento de empresa terceirizada" && <label className="block text-sm font-semibold">Empresa terceirizada (fornecedor cadastrado)<select required className="input mt-1 bg-white" value={form.externalCompanySupplierId || ""} onChange={(e) => { const selected = suppliers.find((item) => item.id === e.target.value); setForm({ ...form, externalCompanySupplierId: e.target.value, externalCompanyName: selected?.name || "" }); }}><option value="">Selecione o fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>}</div>}
          <label className="block text-sm font-semibold">Obra / canteiro (centro de custo)<select required className="input mt-1" value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })}><option value="">Selecione</option>{costCenterOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label className="block text-sm font-semibold">Observação<textarea rows={3} className="input mt-1 min-h-20 resize-y" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} placeholder="Informe detalhes importantes do abastecimento"/></label>

          <label className="block text-sm font-semibold">Posto / Fornecedor<select required className="input mt-1" value={form.supplierId} onChange={(e) => { setForm({ ...form, supplierId: e.target.value, creditNoteId: "", creditAmount: "" }); setCreditAnswer(""); }}><option value="">Selecione</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          {supplierCredits.length > 0 && <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3 text-sm text-red-900"><div className="font-bold">Há nota(s) de crédito disponível(is) para {supplierCredits[0].supplierName}.</div><button type="button" className="mt-1 font-bold underline" onClick={() => setShowCreditDetails(true)}>Ver detalhes</button><p className="mt-1">Deseja utilizar uma Nota de Crédito neste abastecimento?</p><div className="mt-2 flex gap-2"><button type="button" className="btn-primary" onClick={() => { setCreditAnswer("yes"); setForm({ ...form, creditNoteId: supplierCredits[0].id, creditAmount: ((supplierCredits[0].remainingCents / 100)).toFixed(2) }); }}>Sim</button><button type="button" className="btn-secondary" onClick={() => { setCreditAnswer("no"); setForm({ ...form, creditNoteId: "", creditAmount: "" }); }}>Não</button></div>{creditAnswer === "yes" && <div className="mt-2 space-y-2"><select required className="input" value={form.creditNoteId} onChange={(e) => setForm({ ...form, creditNoteId: e.target.value, creditAmount: ((supplierCredits.find((c) => c.id === e.target.value)?.remainingCents || 0) / 100).toFixed(2) })}>{supplierCredits.map((c) => <option key={c.id} value={c.id}>NF {c.creditNumber} · disponível {currency(c.remainingCents)}</option>)}</select><div className="text-xs">Valor original: {currency(selectedCredit?.originalCents || 0)} · já usado: {currency((selectedCredit?.originalCents || 0) - (selectedCredit?.remainingCents || 0))} · saldo: {currency(selectedCredit?.remainingCents || 0)}</div><label className="block text-xs font-semibold">Valor a utilizar<input required min="0.01" step="0.01" type="number" className="input mt-1" value={form.creditAmount} onChange={(e) => setForm({ ...form, creditAmount: e.target.value })}/></label></div>}</div>}
          <label className="block text-sm font-semibold">Nota fiscal existente (opcional)<select className="input mt-1" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}><option value="">Sem vínculo</option>{invoices.filter((i) => !form.supplierId || i.supplierId === form.supplierId).map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.supplierName}</option>)}</select></label>
          <label className="block text-sm font-semibold">Combustível<select className="input mt-1" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}><option>ÓLEO DIESEL S10</option><option>ÓLEO DIESEL S500</option><option>GASOLINA</option><option>ARLA 32</option></select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Litros<input required min="0.001" step="0.001" type="number" className="input mt-1" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })}/></label><label className="text-sm font-semibold">Valor por litro<input required min="0.001" step="0.001" type="number" className="input mt-1" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}/></label></div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm font-bold">Valor total: {currency(Math.round(Number(form.liters || 0) * Number(form.unitPrice || 0) * 100))}</div>
          <label className="block text-sm font-semibold">Anexar comprovante<input className="input mt-1" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={(e) => attachReceipt(e.target.files?.[0])}/><span className="text-xs font-normal text-slate-500">PDF ou imagem até 15 MB.</span></label>
          <button disabled={busy || !companyId} className="btn-primary w-full">{busy ? "Salvando..." : "Salvar abastecimento"}</button>
        </form>}
      </aside>
    </div>

    {showCreditDetails && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="max-h-[80vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">Créditos disponíveis · {supplierCredits[0]?.supplierName}</h3><button onClick={() => setShowCreditDetails(false)}><X/></button></div><div className="mt-4 space-y-2">{supplierCredits.map((c) => <div key={c.id} className="rounded-lg border border-red-200 bg-red-50 p-3"><b>Nota {c.creditNumber}</b><div className="mt-1 text-sm">Emissão: {c.issueDate} · Original: {currency(c.originalCents)} · Utilizado: {currency(c.originalCents - c.remainingCents)} · Saldo disponível: {currency(c.remainingCents)}</div></div>)}</div></section></div>}
    {openConvoyList && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">Detalhamento dos comboios</h3><button onClick={() => setOpenConvoyList(false)}><X/></button></div><div className="mt-4 space-y-2">{convoys.map((c) => <button key={c.id} onClick={() => { setOpenConvoyList(false); setDetail(c); }} className="w-full rounded-lg border p-3 text-left hover:bg-slate-50"><div className="flex flex-wrap justify-between gap-2"><b>Comboio {c.convoyNumber} / {c.fleetNumber}</b><b className={c.percent <= 20 ? "text-red-700" : c.percent < 40 ? "text-amber-700" : "text-emerald-700"}>{c.percent.toFixed(1)}% / {liters(c.balanceMilli)}</b></div><div className="mt-1 text-sm text-slate-600">Local: {c.maintenanceLocation || "não definido"} / Canteiro: {c.costCenter || "não definido"} / Fornecedor: {c.supplierName || "não definido"} / Capacidade: {liters(c.capacityMilli)}</div></button>)}{!convoys.length && <p className="py-6 text-center text-slate-500">Nenhum comboio cadastrado.</p>}</div></section></div>}
    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><div><h3 className="text-xl font-black">Comboio {detail.convoyNumber} · {detail.fleetNumber}</h3><p className="text-sm text-slate-500">{detail.maintenanceLocation} · {detail.costCenter || "Canteiro não definido"} · Fornecedor: {detail.supplierName || "não definido"}</p></div><button onClick={() => setDetail(null)}><X/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><Mini label="Capacidade" value={liters(detail.capacityMilli)}/><Mini label="Saldo atual" value={liters(detail.balanceMilli)}/><Mini label="Saldo percentual" value={detail.capacityMilli ? `${detail.percent.toFixed(1)}%` : "Sem capacidade"}/><Mini label="Situação" value={detail.percent <= 20 ? "Crítico" : detail.percent < 40 ? "Atenção" : "Normal"}/></div><form onSubmit={saveMovement} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"><label className="text-sm font-semibold">Movimentação<select className="input mt-1" value={movement.type} onChange={(e) => setMovement({ ...movement, type: e.target.value })}><option value="distribution">Distribuição para equipamento</option><option value="adjustment">Ajuste autorizado</option></select></label><label className="text-sm font-semibold">Data<input required type="date" className="input mt-1" value={movement.date} onChange={(e) => setMovement({ ...movement, date: e.target.value })}/></label>{movement.type === "distribution" ? <label className="text-sm font-semibold">Equipamento destino<select required className="input mt-1" value={movement.equipmentId} onChange={(e) => setMovement({ ...movement, equipmentId: e.target.value })}><option value="">Selecione</option>{equipment.filter((x) => x.id !== detail.equipmentId).map((e) => <option key={e.id} value={e.id}>{e.fleetNumber} · {e.plate || e.description}</option>)}</select></label> : <label className="text-sm font-semibold">Variação (L, + ou −)<input required type="number" step="0.001" className="input mt-1" value={movement.adjustment} onChange={(e) => setMovement({ ...movement, adjustment: e.target.value })}/></label>}{movement.type === "distribution" && <label className="text-sm font-semibold">Litros<input required min="0.001" step="0.001" type="number" className="input mt-1" value={movement.liters} onChange={(e) => setMovement({ ...movement, liters: e.target.value })}/></label>}<label className="text-sm font-semibold md:col-span-2">Motivo / observação<input required={movement.type === "adjustment"} className="input mt-1" value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })}/></label><div className="flex items-end"><button disabled={busy} className="btn-primary w-full">Registrar movimentação</button></div></form><h4 className="mt-5 font-bold">Movimentações recentes</h4><div className="mt-2 max-h-56 overflow-auto"><table className="w-full text-sm"><thead><tr><th>Data</th><th>Tipo</th><th>Quantidade</th><th>Valor</th><th>Destino / fornecedor</th></tr></thead><tbody>{movementHistory.filter((h) => h.convoyId === detail.id).map((h) => <tr key={h.id}><td>{h.movementDate}</td><td>{h.movementType}</td><td>{liters(h.quantityMilli)}</td><td>{currency(h.totalCents)}</td><td>{h.destinationEquipment || h.supplierName || "-"}</td></tr>)}</tbody></table></div></section></div>}
    {alertList && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">Comboios em atenção ou situação crítica</h3><button onClick={() => setAlertList(false)}><X/></button></div><div className="mt-4 space-y-2">{alertConvoys.map((c) => <button key={c.id} onClick={() => { setAlertList(false); setDetail(c); }} className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-left"><b>Comboio {c.convoyNumber} · {c.fleetNumber}</b><span className="float-right">{c.percent.toFixed(1)}% · {liters(c.balanceMilli)}</span><div className="text-sm">{c.maintenanceLocation} · {c.costCenter}</div></button>)}{!alertConvoys.length && <div className="p-4 text-center text-slate-500">Nenhum comboio abaixo de 40%.</div>}</div></section></div>}
  </div>;
}

function EquipmentPicker({ items, value, onChange, required = false, placeholder = "Digite o ID ou a placa", className = "", emptyLabel }: { items: EquipmentOption[]; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; className?: string; emptyLabel?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === value);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const matches = items.filter((item) => normalize(`${item.fleetNumber} ${item.plate || ""} ${item.description}`).includes(normalize(query.trim()))).slice(0, 80);

  useEffect(() => {
    if (selected) setQuery(`${selected.fleetNumber} • ${selected.plate || selected.description}`);
  }, [value, selected?.id, items]);

  function choose(item: EquipmentOption) {
    onChange(item.id);
    setQuery(`${item.fleetNumber} • ${item.plate || item.description}`);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  }

  return <div className="relative">
    <input ref={inputRef} required={required} className={className} value={query} placeholder={placeholder} autoComplete="off" onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); inputRef.current?.setCustomValidity(required && event.target.value ? "Selecione um equipamento da lista." : ""); }} onKeyDown={(event) => { if (event.key === "Enter" && open) { event.preventDefault(); if (matches[0]) choose(matches[0]); } if (event.key === "Escape") setOpen(false); }} />
    {open && <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
      {emptyLabel && <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(""); setQuery(""); setOpen(false); }}>{emptyLabel}</button>}
      {matches.map((item) => <button type="button" key={item.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><span className="font-semibold">{item.fleetNumber}</span><span> • {item.plate || item.description}</span>{item.plate && <span className="block pl-1 text-xs text-slate-500">{item.description}</span>}</button>)}
      {!matches.length && <div className="px-3 py-2 text-sm text-slate-500">Nenhum equipamento encontrado.</div>}
    </div>}
  </div>;
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border p-3"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 font-bold">{value}</div></div>; }
function Chart({ title, rows }: { title: string; rows: { label: string; value: number; sub?: string }[] }) { const max = Math.max(1, ...rows.map((r) => r.value)); return <section className="panel p-4"><h3 className="font-bold">{title}</h3><div className="mt-3 space-y-3">{rows.length ? rows.map((r) => <div key={r.label}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate">{r.label}</span><b>{currency(r.value)}{r.sub ? ` · ${r.sub}` : ""}</b></div><div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-700" style={{ width: `${Math.max(4, r.value / max * 100)}%` }}/></div></div>) : <p className="py-3 text-sm text-slate-500">Sem dados no período.</p>}</div></section>; }
