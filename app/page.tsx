"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import FuelManagementPage from "@/components/fuel-management-page";
import { countContractMonthsInclusive } from "@/lib/contracts-finance";
import {
  BarChart3,
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gauge,
  HardHat,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Package,
  Tags,
  MapPin,
  Users,
  Pencil,
  Trash2,
  ShieldCheck,
  Truck,
  Upload,
  Mail,
  Printer,
  Wrench,
  DatabaseBackup,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

function downloadStandardTemplate(path: string, fileName: string) {
  const link = document.createElement("a");
  link.href = path;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function chineseUppercaseMoney(cents: number) {
  const digits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const units = ["", "拾", "佰", "仟"];
  const groups = ["", "万", "亿", "兆"];
  const integerToChinese = (value: number) => {
    if (value === 0) return "零";
    let result = "", groupIndex = 0, pendingZero = false;
    while (value > 0) {
      const group = value % 10000;
      if (group) {
        let text = "", localZero = false;
        for (let index = 0, part = group; index < 4; index += 1, part = Math.floor(part / 10)) {
          const digit = part % 10;
          if (digit) { text = digits[digit] + units[index] + (localZero ? "零" : "") + text; localZero = false; }
          else if (text) localZero = true;
        }
        result = text.replace(/零+$/g, "") + groups[groupIndex] + (pendingZero && result ? "零" : "") + result;
        pendingZero = group < 1000;
      } else if (result) pendingZero = true;
      value = Math.floor(value / 10000); groupIndex += 1;
    }
    return result.replace(/零+/g, "零").replace(/零$/g, "");
  };
  const safe = Math.max(0, Math.round(Number(cents) || 0));
  const integer = Math.floor(safe / 100), jiao = Math.floor((safe % 100) / 10), fen = safe % 10;
  return `人民币${integerToChinese(integer)}元${jiao ? `${digits[jiao]}角` : fen ? "零" : "整"}${fen ? `${digits[fen]}分` : ""}`;
}
import { flushOfflineQueue, offlineQueueCount, offlineRequest } from "@/lib/offline";
type Screen =
  | "Visão geral"
  | "Contratos"
  | "Equipamentos"
  | "Manutenção"
  | "Ordens de Serviço"
  | "Serviços rápidos"
  | "Partes diárias"
  | "Abastecimento"
  | "Notas fiscais"
  | "Apropriação"
  | "Relatórios"
  | "Obras e serviços"
  | "Empresas"
  | "Central administrativa"
  | "Usuários e permissões"
  | "Backup e sincronização"
  | "Cadastros";
type Language = "pt" | "zh" | "bilingual";

const zh: Record<string, string> = {
  "Visão geral": "总览",
  Contratos: "合同",
  Equipamentos: "设备",
  Manutenção: "维修",
  "Ordens de Serviço": "工单",
  "Serviços rápidos": "快捷服务",
  "Partes diárias": "每日记录",
  Abastecimento: "加油管理",
  "Notas fiscais": "发票管理",
  Apropriação: "设备计量",
  Relatórios: "报表中心",
  "Obras e serviços": "工程与服务",
  Empresas: "公司",
  "Central administrativa": "管理中心",
  "Usuários e permissões": "用户与权限",
  "Backup e sincronização": "备份与同步",
  Cadastros: "基础资料",
  OPERAÇÃO: "运营",
  ADMINISTRAÇÃO: "管理",
  "Gestão integrada": "综合管理",
  Administrador: "管理员",
  "Ambiente multiempresa": "多公司环境",
  "Bom dia, João": "早上好，João",
  "Acompanhe as pendências e a operação da frota em tempo real.":
    "实时查看待办事项和车队运营情况。",
  "Importar planilha": "导入表格",
  "Novo equipamento": "新增设备",
  "Equipamentos ativos": "在用设备",
  "Contratos ativos": "有效合同",
  "O.S. em andamento": "进行中的工单",
  "Apropriação do mês": "本月设备计量",
  "Contratos próximos do vencimento": "即将到期的合同",
  "Prioridade para renovação ou encerramento": "优先续签或终止",
  "Ver todos": "查看全部",
  "Alertas operacionais": "运营提醒",
  "Exigem atenção hoje": "今日需关注",
  "Situação da frota": "车队状态",
  "Ações rápidas": "快捷操作",
  "Lançar parte diária": "填写每日记录",
  "Abrir ordem de serviço": "新建工单",
  "Importar abastecimento": "导入加油记录",
  "Novo abastecimento": "新增加油记录",
  "Lançamento manual": "手工录入",
  "Baixar planilha padrão": "下载标准表格",
  "Histórico de abastecimentos": "加油记录",
  "Preço por litro": "每升价格",
  Litros: "升数",
  Posto: "加油站",
  Produto: "燃料",
  Motorista: "驾驶员",
  "Gerar apropriação": "生成设备计量",
  "Novo contrato": "新增合同",
  "Nova O.S.": "新增工单",
  "Nova obra": "新增工程",
  "Nova empresa": "新增公司",
  "Novo usuário": "新增用户",
  "Novo cadastro": "新增资料",
  "Buscar número, fornecedor ou objeto...": "搜索编号、供应商或合同标的…",
  "Todos os status": "所有状态",
  Exportar: "导出",
  Número: "编号",
  "Objeto / fornecedor": "合同标的 / 供应商",
  Vigência: "有效期",
  "Saldo disponível": "可用余额",
  Status: "状态",
  Detalhes: "详情",
  Abrir: "打开",
  Ativo: "有效",
  "A vencer": "即将到期",
  "Permissões por usuário e módulo": "按用户和模块设置权限",
  Módulo: "模块",
  Visualizar: "查看",
  Incluir: "新增",
  Alterar: "修改",
  Excluir: "删除",
  "Salvar permissões": "保存权限",
  Data: "日期",
  "Salvar lançamentos": "保存记录",
  Equipamento: "设备",
  "Horím. inicial": "初始小时表",
  "Horím. final": "最终小时表",
  Total: "总计",
  "KM inicial": "初始里程",
  "KM final": "最终里程",
  Situação: "状态",
  "T • Trabalhando": "T • 工作中",
  "D • À disposição": "D • 待命",
  "M • Manutenção": "M • 维修",
  "AB • Abono": "AB • 豁免",
  "Prévia da apropriação": "设备计量预览",
  Excel: "Excel",
  "PDF A4": "A4 PDF",
  "APROPRIAÇÃO DE EQUIPAMENTO": "设备计量报表",
  "Valor mensal": "月租金额",
  Descontos: "扣款",
  "Total medido": "计量总额",
  "Fontes consolidadas": "汇总来源",
  "Contrato e medição": "合同与计量",
  "Gerar relatório final": "生成最终报告",
  Confirmar: "确认",
  Cancelar: "取消",
  "Preencha ou revise as informações abaixo.": "请填写或检查以下信息。",
  Identificação: "标识",
  Observação: "备注",
  "Escolher arquivo": "选择文件",
  "Enviar ao jurídico": "发送至法务部",
  Concluído: "已完成",
  Pendente: "待处理",
  "Notas registradas": "已登记发票",
  "Entrada de nota fiscal": "录入进项发票",
  "Localizador de notas fiscais lançadas": "已录入发票查询",
  "Notas fiscais de entrada": "进项发票",
  "Cadastro de Nota Fiscal de Entrada": "进项发票登记",
  "Dados da NFe, itens, O.S. e parcelamento.": "发票信息、项目、工单和分期付款。",
  "Número da nota": "发票号码",
  Emissão: "开票日期",
  Fornecedor: "供应商",
  "Centro de custo": "成本中心",
  Pedido: "采购单",
  "Aguardando conferência": "等待审核",
  Aprovada: "已批准",
  Cancelada: "已取消",
  "Nenhuma nota fiscal registrada.": "尚无发票记录。",
  "Nenhuma nota encontrada com este filtro.": "未找到符合筛选条件的发票。",
  "Dados do fornecedor": "供应商资料",
  "Dados financeiros": "财务资料",
  "Fornecedores e locadores": "供应商与出租方",
  "Fornecedores cadastrados": "已登记供应商",
  "Dados cadastrais, contatos e informações financeiras.": "登记资料、联系人和财务信息。",
  "Razão social": "公司法定名称",
  "Nome fantasia": "商业名称",
  "CNPJ / CPF": "税号 CNPJ / CPF",
  "Inscrição estadual": "州税登记号",
  Endereço: "地址",
  Bairro: "街区",
  CEP: "邮政编码",
  Cidade: "城市",
  UF: "州",
  "Nome do contato": "联系人姓名",
  Telefone: "电话",
  "E-mail": "电子邮箱",
  "Tipo de frete": "运费类型",
  "Sem frete": "无运费",
  Outro: "其他",
  "Simples Nacional": "简易税制",
  "Não optante": "非简易税制",
  Optante: "简易税制企业",
  "Forma de pagamento": "付款方式",
  "Crédito em conta própria": "转入本人账户",
  PIX: "PIX 即时支付",
  Boleto: "银行票据",
  "Transferência / TED": "银行转账 / TED",
  "Chave PIX": "PIX 密钥",
  "Titular da conta": "账户持有人",
  "Tipo de conta": "账户类型",
  "Conta Corrente": "活期账户",
  "Conta Poupança": "储蓄账户",
  "Conta Pagamento": "支付账户",
  Banco: "银行",
  Agência: "支行",
  "Número da conta": "账号",
  "Contato financeiro": "财务联系人",
  "Cadastrar fornecedor": "登记供应商",
  "Atualizar fornecedor": "更新供应商",
  "Nenhum fornecedor cadastrado.": "尚无供应商记录。",
  Editar: "编辑",
  "Tipo de equipamento": "设备类型",
  "Equipamentos cadastrados": "已登记设备",
  "Cadastrar equipamento": "登记设备",
  "Fechar cadastro": "关闭登记",
  Descrição: "说明",
  Marca: "品牌",
  Modelo: "型号",
  "Ano de fabricação": "制造年份",
  Cor: "颜色",
  Combustível: "燃料类型",
  Chassi: "车架号",
  Renavam: "RENAVAM 登记号",
  "Número de série": "序列号",
  "Propriedade e contrato": "所有权与合同",
  "Próprio?": "自有设备？",
  Sim: "是",
  Não: "否",
  Proprietário: "所有人",
  "CPF/CNPJ do proprietário": "所有人 CPF/CNPJ",
  "Locador/fornecedor": "出租方/供应商",
  "CPF/CNPJ do locador": "出租方 CPF/CNPJ",
  "Comodato?": "借用合同？",
  "Empresa locadora (comodato)": "借用设备出租公司",
  "CNPJ da empresa locadora": "出租公司 CNPJ",
  "Em cadastramento": "登记中",
  Disponível: "可用",
  Desmobilizado: "已退场",
  "Data de chegada": "到场日期",
  "Data de saída": "离场日期",
  "Checklist de entrada": "进场检查表",
  Aprovado: "已批准",
  Reprovado: "未通过",
  "Aprovado com ressalva": "有条件批准",
  "Documentação e guia do tacógrafo": "证件与行车记录仪检定文件",
  "Data do cadastro": "登记日期",
  "Vencimento CRLV": "CRLV 到期日",
  "Número do tacógrafo": "行车记录仪编号",
  "Emissão/aferição do tacógrafo": "行车记录仪检定日期",
  "Vencimento do tacógrafo": "行车记录仪到期日",
  "Apólice de seguro": "保险单",
  "Seguradora/segurado": "保险公司/被保险人",
  "Número da apólice": "保险单号",
  "Início do seguro": "保险生效日期",
  "Vencimento do seguro": "保险到期日",
  "Anexar e consultar documentos": "上传和查看文件",
  "Checklist de entrada e inspeção": "进场检查与检验",
  "Item da inspeção": "检查项目",
  Resultado: "结果",
  Conforme: "合格",
  "Não conforme": "不合格",
  "Não se aplica": "不适用",
  "Observação geral": "总体备注",
  "Resultado final": "最终结果",
  Rascunho: "草稿",
  "Salvar checklist": "保存检查表",
  "Alocação atual": "当前配置",
  Obra: "工程",
  Frente: "作业面",
  "Condutor/operador": "驾驶员/操作员",
  "Medição e período": "计量与周期",
  "Tipo de medição": "计量方式",
  Quilômetro: "公里",
  Horímetro: "小时表",
  Diária: "日租",
  Mensal: "月租",
  "KM atual": "当前公里数",
  "Horímetro atual": "当前小时表",
  Observações: "备注",
  "Salvar equipamento": "保存设备",
  "Produtos e serviços": "产品与服务",
  "Produto / serviço": "产品 / 服务",
  Categoria: "类别",
  Tipo: "类型",
  Unidade: "单位",
  "Aplicação / equipamento compatível": "适用设备",
  "Referência do fabricante": "制造商参考号",
  Cadastrar: "登记",
  Atualizar: "更新",
  "Histórico de compra": "采购历史",
  "Menor preço": "最低价格",
  "Preço unitário": "单价",
  Quantidade: "数量",
  "Catálogo cadastrado": "已登记目录",
  "Todos os cadastros": "全部基础资料",
  "Cadastros principais": "主要基础资料",
  "Cadastros administrativos": "管理基础资料",
  "Base de dados utilizada por todos os módulos do sistema.": "系统所有模块使用的基础数据库。",
  "Registros cadastrados": "已登记记录",
  Código: "代码",
  Nome: "名称",
  Pesquisar: "搜索",
  "Salvar cadastro": "保存资料",
  "Parte diária": "每日记录",
  "Novo lançamento manual": "新增手工记录",
  "Ver lançamentos do dia": "查看当日记录",
  "Cadastrar uma parte diária sem planilha": "无需表格，手工填写每日记录",
  "Localize o equipamento pelo número da frota ou pela placa": "按车队编号或车牌查找设备",
  "Nº da frota / ID": "车队编号 / ID",
  Placa: "车牌",
  "Horímetro inicial": "初始小时表",
  "Horímetro final": "最终小时表",
  "Total horímetro": "小时表合计",
  "Total KM": "公里数合计",
  "Número da O.S.": "工单编号",
  "Salvar parte diária": "保存每日记录",
  "Importar abastecimentos": "导入加油记录",
  "Escolher planilha": "选择表格",
  "Validação por frota/ID e/ou placa": "按车队编号/ID 和/或车牌验证",
  RN: "RN",
  "Motorista / operador": "驾驶员 / 操作员",
  "Valor total": "总金额",
  "Salvar abastecimento": "保存加油记录",
  "Histórico de abastecimentos": "加油历史",
  "Ordens de serviço": "工单",
  "O.S. Mecânica diária": "每日机械维修工单",
  "O.S. Compra e serviços": "采购与服务工单",
  "Operacional — mecânicos": "运营类 — 维修人员",
  "Financeira / ADM — compras e serviços": "财务 / 行政类 — 采购与服务",
  "Nova ordem de serviço": "新增工单",
  "Número da O.S.": "工单编号",
  Abertura: "开单日期",
  Requisitante: "申请人",
  Elaborador: "编制人",
  "Defeito informado": "故障描述",
  "Local de manutenção": "维修地点",
  "Tipo de manutenção": "维修类型",
  "Tipo de serviço": "服务类型",
  Preventiva: "预防性维修",
  Corretiva: "纠正性维修",
  "Reparação de acidente": "事故维修",
  "Peças e serviços": "配件与服务",
  Peça: "配件",
  Serviço: "服务",
  "Serviço terceirizado": "外包服务",
  Borracharia: "轮胎维修",
  "Lava-jato": "洗车",
  Lubrificação: "润滑",
  Pagamento: "付款",
  "PowerChina — pagamento direto": "PowerChina — 直接付款",
  "Locador — reembolso": "出租方 — 报销",
  "Concluir O.S.": "完成工单",
  "Mapa de cotação": "报价比较表",
  "Novo mapa de cotação": "新建报价比较表",
  "Adicionar proposta": "添加报价",
  "Condição de pagamento": "付款条件",
  "Prazo de entrega": "交货期限",
  Validade: "有效期",
  Escolhida: "已选择",
  "Aprovar mapa de cotação": "批准报价比较表",
  "Ocorrências de manutenção": "维修事件",
  "Dias reais": "实际天数",
  Tolerância: "宽限期",
  Descontados: "扣除天数",
  Desconto: "扣款",
  "Resumo da medição": "计量汇总",
  "Locação após descontos": "扣款后租金",
  "Reembolso ao locador": "出租方报销",
  "Total a faturar pelo locador": "出租方应开票总额",
  "Custos pagos pela PowerChina": "PowerChina 支付的费用",
  "Despesas da frota": "车队费用",
  Locação: "租赁",
  "Custos da obra": "工程成本",
  "Manutenção PowerChina": "PowerChina 维修费",
  "Despesa total": "总费用",
  Período: "期间",
  Aplicar: "应用",
  Imprimir: "打印",
  Baixar: "下载",
  "Perfil do usuário": "用户角色",
  "Nome completo": "姓名",
  Perfil: "角色",
  Gestor: "主管",
  Operador: "操作员",
  "Administrador geral": "总管理员",
  "Salvar usuário": "保存用户",
  "Gerar backup": "生成备份",
  "Situação da sincronização": "同步状态",
  "Sincronizar agora": "立即同步",
  "Backups por empresa": "按公司备份",
  "Nenhum backup encontrado para esta empresa.": "该公司尚无备份。",
  Fechar: "关闭",
  Voltar: "返回",
  Selecionar: "选择",
  Selecione: "请选择",
  Aprovar: "批准",
  Reabrir: "重新打开",
  Remover: "移除",
  "Adicionar item": "添加项目",
  "Adicionar equipamento": "添加设备",
  "Adicionar parcela": "添加分期",
  Parcelamento: "分期付款",
  Frete: "运费",
  IPI: "IPI 税",
  ICMS: "ICMS 税",
  "Total NFe": "发票总额",
  "Salvar e enviar para conferência": "保存并提交审核",
  "16 em manutenção": "16 台维修中",
  "3 vencem em até 30 dias": "3 份合同将在30天内到期",
  "6 aguardando aprovação": "6 项等待批准",
  "246 de 301 conferidas": "301 项中已核对 246 项",
  "Acompanhe as pendências e a operação da frota em tempo real.": "实时查看车队待办事项和运营情况。",
  "Solicitações, anexos, aditivos, medições e saldo contratual.": "合同申请、附件、补充协议、计量和合同余额。",
  "Cadastro, documentos, checklist e histórico de alocação.": "设备登记、文件、检查表和配置历史。",
  "Ordens de serviço, peças, fornecedores e manutenção preventiva.": "工单、配件、供应商和预防性维修。",
  "Produção diária por equipamento e operador, com importação por planilha.": "按设备和操作员登记每日作业，并支持表格导入。",
  "Consumo por frota ou placa integrado à apropriação.": "按车队编号或车牌统计消耗，并纳入设备计量。",
  "Entrada, conferência e apropriação de notas fiscais de peças e serviços.": "配件与服务发票的录入、审核及计量归集。",
  "Consolidação de partes, combustível, manutenção e contrato.": "汇总每日记录、燃料、维修和合同数据。",
  "Despesas operacionais e financeiras consolidadas, sem tratar locação como receita.": "汇总运营和财务费用，不将租赁视为收入。",
  "Obras, frentes, ordens de trabalho, propostas e medições.": "工程、作业面、工作单、报价和计量。",
  "Empresas administradas com contratos, medições e operação totalmente separados.": "各管理公司之间的合同、计量和运营数据完全独立。",
  "Acesso rápido às empresas, usuários, permissões e cadastros do sistema.": "快速访问公司、用户、权限和系统基础资料。",
  "Defina exatamente o que cada usuário pode visualizar, incluir, alterar ou excluir.": "精确设置每位用户可查看、新增、修改或删除的内容。",
  "Backups separados por empresa e lançamentos offline com sincronização automática.": "按公司分别备份，离线记录恢复联网后自动同步。",
  "Base administrativa e parâmetros usados em todos os processos.": "所有流程使用的管理基础资料和参数。",
  "Dados confirmados na base": "数据已在数据库中确认",
  "Online • dados confirmados na base": "在线 • 数据已在数据库中确认",
  "Offline": "离线",
  "Regra multiempresa:": "多公司规则：",
  "as funcionalidades são iguais para todas as empresas administradas. Os equipamentos e demais dados permanecem separados pela empresa selecionada.": "所有管理公司的功能相同；设备及其他数据按当前所选公司分别保存。",
  "Identificação, contrato, documentos e controle do tacógrafo": "设备标识、合同、文件及行车记录仪管理",
  "Formatos aceitos: PDF, JPG ou PNG, até 10 MB.": "支持 PDF、JPG 或 PNG，最大 10 MB。",
  "Nenhum arquivo anexado": "尚未上传文件",
  Anexar: "上传",
  Substituir: "替换",
  "Leitura do documento:": "文件读取：",
  "os arquivos ficam guardados e disponíveis para consulta. O preenchimento automático por OCR será ativado quando o serviço de leitura estiver configurado.": "文件将安全保存并可随时查看；配置识别服务后将启用 OCR 自动填写。",
  "Os itens são carregados conforme o tipo do equipamento.": "检查项目根据设备类型加载。",
  "Carregar itens do tipo": "加载该设备类型的项目",
  "Salve o equipamento primeiro para liberar o envio dos documentos.": "请先保存设备，然后才能上传文件。",
  "Salve o equipamento primeiro para liberar o checklist.": "请先保存设备，然后才能填写检查表。",
  "Descreva a irregularidade": "请说明不合格情况",
  Opcional: "选填",
  "Nenhum checklist registrado.": "尚无检查表记录。",
  "Nenhum equipamento cadastrado nesta empresa.": "该公司尚无设备记录。",
  "Tipo não informado": "未填写设备类型",
  "Proprietário/Locador": "所有人/出租方",
  "Categoria, unidade, aplicação e histórico real das notas fiscais.": "产品类别、单位、适用范围及真实发票采购历史。",
  "Produto / serviço cadastrado": "已登记产品 / 服务",
  "Referência do fabricante": "制造商参考号",
  "Histórico desta compra:": "本产品采购历史：",
  "Histórico": "历史",
  "Comparação somente da mesma aplicação, especificação e unidade.": "仅比较相同用途、规格和单位的采购。",
  "Fornecedor do menor preço": "最低价供应商",
  "Último fornecedor": "最近供应商",
  "Sem compras": "无采购记录",
  "Sem histórico": "无历史记录",
  "Cadastre o primeiro produto acima.": "请在上方登记第一个产品。",
  "O histórico será formado automaticamente pelas próximas notas fiscais vinculadas a este produto.": "此产品的采购历史将根据后续关联发票自动生成。",
  "Os registros pertencem somente à empresa selecionada.": "这些记录仅属于当前所选公司。",
  "Selecione para consultar ou incluir": "选择要查看或新增的资料",
  "Nenhum registro cadastrado. Use o formulário acima para testar.": "尚无记录，请使用上方表单新增。",
  Cargos: "岗位",
  "Categorias de produtos": "产品类别",
  "Centros de custo": "成本中心",
  "Locais de manutenção": "维修地点",
  "Marcas de equipamentos": "设备品牌",
  "Modelos de equipamentos": "设备型号",
  "Tipos de equipamentos": "设备类型",
  "Tipos de manutenção": "维修类型",
  "Status de manutenção": "维修状态",
  "Tipos de contratos": "合同类型",
  Treinamentos: "培训",
  "Itens e modelos de checklist": "检查表项目与模板",
  "Obras/Projetos": "工程/项目",
  "Frentes de trabalho": "作业面",
  Profissionais: "专业人员",
  "Data de emissão": "开票日期",
  "Data de entrada": "入账日期",
  "Nº pedido / requisição": "采购单 / 申请编号",
  "Fornecedor (Razão Social)": "供应商（公司法定名称）",
  Vencimento: "到期日",
  "Nº da O.S.": "工单编号",
  "Chave de acesso NF-e": "电子发票访问密钥",
  Retirada: "自提",
  "Atualizar estoque": "更新库存",
  "Itens da O.S.:": "工单项目：",
  "ao escolher uma ordem de compra e serviços, os itens cadastrados nela são carregados automaticamente.": "选择采购与服务工单后，其中登记的项目会自动加载。",
  "Lançamento direto": "直接录入",
  "Despesa geral da obra": "工程一般费用",
  NCM: "NCM 商品编码",
  CFOP: "CFOP 税务代码",
  CST: "CST 税务代码",
  "Desc.": "折扣",
  "Qtde.": "数量",
  "Preço unit.": "单价",
  "Selecione uma O.S. ou adicione os itens manualmente.": "请选择工单或手工添加项目。",
  "Empresa selecionada": "所选公司",
  "Origem: Central administrativa → Empresas": "来源：管理中心 → 公司",
  "Escolha primeiro se o controle será operacional ou financeiro.": "请先选择运营类或财务类管理。",
  "Registro operacional aberto pelos mecânicos.": "由维修人员创建的日常运营记录。",
  "Compra de peças, serviços e despesas vinculadas à obra.": "采购与工程相关的配件、服务和费用。",
  "Ordens registradas": "已登记工单",
  "Nenhuma ordem de serviço cadastrada nesta empresa.": "该公司尚无工单。",
  "Fluxo obrigatório": "必经流程",
  "Regra financeira": "财务规则",
  "Resumo do módulo": "模块汇总",
  "Central de relatórios": "报表中心",
  "Regime de despesas": "费用管理模式",
  "Medição dos equipamentos locados": "租赁设备计量",
  "Abastecimento + borracharia + lava-jato": "燃料 + 轮胎维修 + 洗车",
  "Pagamento direto da empresa": "公司直接付款",
  "Sem duplicar reembolsos da medição": "不重复计算计量中的报销",
  Grupo: "分组",
  Composição: "构成",
  Tratamento: "处理方式",
  "Despesa contratual": "合同费用",
  "Despesa operacional": "运营费用",
  "Despesa direta": "直接费用",
  "Manutenção geral": "维修总额",
  "Indicador gerencial": "管理指标",
  "Todos os canteiros": "全部工地",
  "Todos os status": "全部状态",
  "Buscar número, fornecedor ou objeto...": "搜索编号、供应商或合同标的…",
  "Buscar número, locador ou objeto...": "搜索编号、出租方或合同标的…",
  "NF, fornecedor, centro de custo ou pedido": "发票号、供应商、成本中心或采购单",
  "ID, placa, marca ou modelo": "ID、车牌、品牌或型号",
  "Digite ou selecione": "输入或选择",
  "Selecione ou informe": "选择或填写",
  "Detalhes ou observação": "详情或备注",
  "Nome do usuário": "用户姓名",
  "Obra / canteiro": "工程 / 工地",
  "44 dígitos": "44 位数字",
  Administrativo: "管理后台",
  Contrato: "合同",
  "Fornecedor / objeto": "供应商 / 标的",
  "Fornecedor / Objeto": "供应商 / 标的",
  Saldo: "余额",
  "Contrato vence em 9 dias": "合同将在9天后到期",
  "Preventiva próxima": "预防性维修临近",
  "Tacógrafo vence em 12 dias": "行车记录仪将在12天后到期",
  "Parte diária pendente": "每日记录待处理",
  "6 registros aguardam conferência": "6 条记录等待审核",
  "Distribuição atual dos 403 equipamentos": "403 台设备的当前分布",
  Trabalhando: "工作中",
  Disponíveis: "可用设备",
  "Acesse os processos mais usados": "快速进入常用流程",
  "Produtos e cadastros": "产品与基础资料",
  "Cadastrar e selecionar empresas administradas.": "登记并选择所管理的公司。",
  "Definir módulos e ações permitidas por usuário.": "设置每位用户可使用的模块和操作。",
  "Produtos, categorias, centros de custo, fornecedores e parâmetros.": "产品、类别、成本中心、供应商和系统参数。",
  "Criar cópias por empresa e acompanhar lançamentos offline.": "按公司创建备份并跟踪离线记录。",
  Acessar: "进入",
  Obras: "工程",
  "Frentes de serviço": "作业面",
  "Contratos de obra, cliente, localização e vigência.": "工程合同、客户、地点和有效期。",
  "Frentes vinculadas às obras.": "与工程关联的作业面。",
  "Centros de custo por obra.": "按工程设置成本中心。",
  "Pessoa física ou jurídica e dados de pagamento.": "个人或企业资料及付款信息。",
  "Condutores, operadores, admissões, integrações e CNH.": "驾驶员、操作员、入职、培训和驾驶证。",
  "Peças, pneus, filtros, lubrificantes e serviços.": "配件、轮胎、滤芯、润滑油和服务。",
  "Categorias de produtos": "产品类别",
  "Centros de custos": "成本中心",
  Fornecedores: "供应商",
  "Distribuição atual": "当前分布",
  "Ações rápidas": "快捷操作",
  "Abrir ordem de serviço": "新建工单",
  "Frota 408 • faltam 320 km": "车队 408 • 还差 320 公里",
  "Frota 244 • placa SOU-0648": "车队 244 • 车牌 SOU-0648",
  Empresa: "公司",
  Competência: "计量月份",
  "Mês de referência": "参考月份",
  "Tipo de período": "周期类型",
  "Período inicial": "开始日期",
  "Período final": "结束日期",
  Movimentação: "计量类型",
  "Apropriação normal": "正常计量",
  "Observações gerais da apropriação": "计量总体备注",
  "Digite aqui as observações que devem aparecer no PDF e no Excel": "请输入需要显示在 PDF 和 Excel 中的备注",
  "Ajuste manual da medição": "手动调整计量",
  "Selecione o equipamento e a competência": "请选择设备和计量月份",
  "A apropriação será formada pelas partes diárias e pelas O.S. concluídas no período.": "计量将根据该期间的每日记录和已完成工单生成。",
  "Gerar medição": "生成设备计量",
  "Gerar relatório": "生成报表",
  "Relatórios financeiros e operacionais formados pelos lançamentos reais do sistema.": "根据系统真实记录生成财务和运营报表。",
  "Notas fiscais no período": "期间发票",
  "Notas pagas": "已付款发票",
  "Custo operacional": "运营成本",
  "Custo total da empresa": "公司总成本",
  "Selecione o relatório": "请选择报表",
  "Clique em uma opção e depois em Gerar relatório.": "请选择一个报表，然后点击生成报表。",
  "Produtivo X Improdutivo": "生产与非生产对比",
  "Produtividade, disposição, manutenção e ranking por equipamento": "按设备统计生产率、待命、维修及排名",
  "Dashboard mensal de frota": "车队月度看板",
  "Frota, locadores, custos e manutenção no período": "期间车队、出租方、成本和维修情况",
  "Painel mensal de gestão": "月度管理看板",
  "Resumo executivo bilíngue de custos e desempenho": "成本与绩效双语管理摘要",
  "Gastos por fornecedor e notas pagas": "供应商支出与已付发票",
  "Notas fiscais pagas, parciais e pendentes": "已付、部分支付及待付发票",
  "Controle de pneus": "轮胎管理",
  "Identificação, DOT, condição, estoque e descarte": "标识、DOT、状态、库存和报废",
  "Controle de baterias": "蓄电池管理",
  "Certificado, nota fiscal e aplicação": "证书、发票和使用设备",
  "Custo de veículos": "车辆成本",
  "Locação, combustível, serviços e manutenção": "租赁、燃料、服务和维修",
  "Contrato x despesas": "合同与支出对比",
  "Valor contratual, despesas vinculadas e saldo": "合同金额、关联支出和余额",
  "Total por dia": "每日汇总",
  "Quantidade de partes diárias lançadas": "每日记录数量",
  "Enviar vários equipamentos de uma vez": "一次导入多台设备",
  "Importar planilha padrão": "导入标准表格",
  "Baixar modelo padrão": "下载标准模板",
  "Baixar modelo": "下载模板",
  "Importação de Parte Diária": "每日记录表格导入",
  "Selecionar a planilha preenchida": "选择已填写的表格",
  "Voltar ao lançamento manual": "返回手工录入",
  "Fila de Ordens de Serviço": "工单队列",
  "A tela inicia mostrando somente as O.S. que ainda precisam de ação.": "页面默认仅显示仍需处理的工单。",
  "Buscar O.S., ID/frota ou placa": "搜索工单、车队编号或车牌",
  "Somente pendências": "仅显示待办",
  "Todas as O.S.": "全部工单",
  "Em lançamento": "录入中",
  "Aguardando assinatura da Ficha": "等待表单签字",
  "Aguardando aprovação da Ficha": "等待表单审批",
  "Ficha aprovada": "表单已批准",
  "Operacional em andamento": "运营处理中",
  Concluídas: "已完成",
  Operacional: "运营类",
  "Compras e serviços": "采购与服务",
  "Status da O.S.": "工单状态",
  Fluxo: "流程",
  "Nenhuma O.S. encontrada para este filtro.": "此筛选条件下未找到工单。",
  "Operação, compras, serviços, documentos e apropriação no mesmo fluxo.": "在同一流程中管理运营、采购、服务、文件和计量。",
  "Solicitação e orçamento": "申请与报价",
  "Ficha aprovada": "表单已批准",
  "O.S. e execução": "工单与执行",
  Obrigatória: "必需",
  Registrar: "登记",
  "Empresa ou locador": "公司或出租方",
  "Após concluir": "完成后",
  "Novo serviço": "新增服务",
  "Nenhum serviço rápido lançado.": "尚无快捷服务记录。",
  "Consulta rápida dos lançamentos que alimentam a apropriação.": "快速查询纳入设备计量的记录。",
  "Nº registro": "记录编号",
  Requisição: "申请单",
  "Nº ID": "ID 编号",
  Ações: "操作",
  "Nenhum abastecimento registrado nesta empresa.": "该公司尚无加油记录。",
  "Histórico de abastecimento": "加油历史",
  "Lançar nota fiscal": "录入发票",
  "Entrada de nota fiscal": "录入进项发票",
  "Consulta de notas fiscais lançadas": "已录入发票查询",
  "Após cada lançamento, a FATURA é gerada automaticamente para assinatura.": "每次录入后，系统会自动生成“发票审批单”供签字。",
  "Nenhuma fatura registrada.": "尚无发票记录。",
  "Nenhum lançamento encontrado neste período.": "该期间未找到记录。",
  "Nenhum contrato cadastrado nesta empresa.": "该公司尚无合同记录。",
  "Nenhum contrato real vence nos próximos 30 dias.": "未来 30 天内没有真实合同到期。",
  Documento: "文件",
  "Contrato / aditivo": "合同 / 补充协议",
  "Locador / objeto": "出租方 / 标的",
  "Vigência geral": "总有效期",
  "Contrato inicial": "初始合同",
  "Locador não informado": "未填写出租方",
  "Abrir / Detalhes": "打开 / 详情",
  "Histórico de movimentações": "变更历史",
  "Alterações do contrato e dos equipamentos vinculados": "合同及关联设备的变更记录",
  "Data e hora": "日期和时间",
  Usuário: "用户",
  "Nenhuma alteração registrada ainda.": "尚无变更记录。",
  "Obra / projeto": "工程 / 项目",
  Cliente: "客户",
  Localização: "地点",
  "Nenhuma obra cadastrada nesta empresa.": "该公司尚无工程记录。",
  "Usuários e permissões": "用户与权限",
  "Defina exatamente o que cada usuário pode visualizar, incluir, alterar ou excluir.": "精确设置每位用户可查看、新增、修改或删除的内容。",
  Função: "角色",
  "Aprovação de exclusões": "删除审批",
  "Histórico permanente de solicitações, motivos e decisões do Administrador Master.": "永久保存删除申请、原因及总管理员的决定。",
  Registro: "记录",
  Solicitante: "申请人",
  Motivo: "原因",
  Decisão: "决定",
  Rejeitar: "拒绝",
  "Aguardando Master": "等待总管理员",
  Concluída: "已完成",
  "Nenhuma solicitação de exclusão registrada.": "尚无删除申请。",
  "Status de sincronização": "同步状态",
  "Conectado à base online": "已连接在线数据库",
  "Criar backup agora": "立即创建备份",
  "Cópias completas separadas e disponíveis para download": "按公司保存完整副本，可供下载",
  "Esta empresa ainda não possui backup.": "该公司尚无备份。",
  "Sem internet, os lançamentos compatíveis ficam protegidos neste aparelho. Não limpe os dados do navegador antes da confirmação da sincronização.": "无网络时，兼容记录会安全保存在本设备。同步确认前请勿清除浏览器数据。",
  "Ordenar: ID": "排序：ID",
  "Ordenar: Código": "排序：代码",
  "Ordenar: Nome": "排序：名称",
  "Ordenar: Descrição": "排序：说明",
  "Ordenar: Status": "排序：状态",
  "Ordenar: Categoria": "排序：类别",
  "Ordenar: Unidade": "排序：单位",
  "Ordenar: Tipo": "排序：类型",
  "↑ Crescente": "↑ 升序",
  "↓ Decrescente": "↓ 降序",
  "Todos": "全部",
  Ativos: "有效",
  Inativos: "停用",
  Inativo: "停用",
  "Filtrar status": "筛选状态",
  "Ordenar registros": "记录排序",
  "Alternar ordem": "切换排序方向",
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();

function dynamicChinese(value: string) {
  return value
    .replace(/Contrato vence em (\d+) dias/gi, "合同将在 $1 天后到期")
    .replace(/Tacógrafo vence em (\d+) dias/gi, "行车记录仪将在 $1 天后到期")
    .replace(/(\d+)\s+registro\(s\)/gi, "$1 条记录")
    .replace(/(\d+)\s+resultado\(s\)/gi, "$1 个结果")
    .replace(/(\d+)\s+equipamento\(s\) disponível\(is\)/gi, "$1 台设备可用")
    .replace(/(\d+)\s+produto\(s\) e serviço\(s\)/gi, "$1 项产品和服务")
    .replace(/(\d+)\s+lançamento\(s\) salvo\(s\) neste aparelho e ainda não confirmado\(s\) na base/gi, "$1 条记录保存在本设备，尚未写入数据库")
    .replace(/(\d+)\s+lançamento\(s\) aguardando sincronização/gi, "$1 条记录等待同步")
    .replace(/Offline\s*•\s*(\d+)\s+lançamento\(s\) salvo\(s\) neste aparelho/gi, "离线 • $1 条记录已保存在本设备")
    .replace(/(\d+)\s+resultado\(s\)/gi, "$1 个结果")
    .replace(/(\d+)\s+item\(ns\)/gi, "$1 个项目")
    .replace(/(\d+)\s+checklist\(s\) registrado\(s\)/gi, "$1 份检查表已登记")
    .replace(/(\d+)\s+dias restantes/gi, "$1 天后到期")
    .replace(/(\d+)\s+dia\(s\)/gi, "$1 天")
    .replace(/(\d+)\s+dias?/gi, "$1 天")
    .replace(/(\d+)\s+alertas?/gi, "$1 条提醒")
    .replace(/(\d+)\s+registros aguardam conferência/gi, "$1 条记录等待审核")
    .replace(/faltam\s+(\d+)\s+km/gi, "还差 $1 公里")
    .replace(/\bFrota\b/gi, "车队")
    .replace(/\bplaca\b/gi, "车牌")
    .replace(/\bjan\b/gi, "1月")
    .replace(/\bfev\b/gi, "2月")
    .replace(/\bmar\b/gi, "3月")
    .replace(/\babr\b/gi, "4月")
    .replace(/\bmai\b/gi, "5月")
    .replace(/\bjun\b/gi, "6月")
    .replace(/\bjul\b/gi, "7月")
    .replace(/\bago\b/gi, "8月")
    .replace(/\bset\b/gi, "9月")
    .replace(/\bout\b/gi, "10月")
    .replace(/\bnov\b/gi, "11月")
    .replace(/\bdez\b/gi, "12月")
    .replace(/dias restantes/gi, "天后到期")
    .replace(/Vencido/gi, "已到期");
}

function translatedValue(value: string, language: Language) {
  const chinese = zh[value] || dynamicChinese(value);
  if (language === "pt" || chinese === value) return value;
  return language === "zh" ? chinese : `${value} / ${chinese}`;
}

function applyLanguage(root: HTMLElement, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.parentElement?.closest("[data-no-translate]")) continue;
    const current = (node.nodeValue || "").trim();
    if (!current) continue;
    const detected = Object.keys(zh).find(
      (k) =>
        current === k || current === zh[k] || current === `${k} / ${zh[k]}`,
    );
    const stored = originalText.get(node);
    const lastRendered = stored ? translatedValue(stored, language) : "";
    if (!stored || (detected && detected !== stored) || (current !== lastRendered && language === "pt"))
      originalText.set(node, detected || current);
    const pt = originalText.get(node)!;
    const translated = translatedValue(pt, language);
    const before = (node.nodeValue || "").match(/^\s*/)?.[0] || "",
      after = (node.nodeValue || "").match(/\s*$/)?.[0] || "";
    if (current !== translated)
      node.nodeValue = `${before}${translated}${after}`;
  }
  root.querySelectorAll("[placeholder], [title], [aria-label]").forEach((element) => {
    const saved = originalAttributes.get(element) || {};
    ["placeholder", "title", "aria-label"].forEach((attribute) => {
      const current = element.getAttribute(attribute);
      if (!current) return;
      if (!saved[attribute]) saved[attribute] = current;
      element.setAttribute(attribute, translatedValue(saved[attribute], language));
    });
    originalAttributes.set(element, saved);
  });
  document.documentElement.lang = language === "zh" ? "zh-CN" : "pt-BR";
}
const nav = [
  {
    group: "OPERAÇÃO",
    items: [
      { label: "Visão geral" as Screen, icon: LayoutDashboard },
      { label: "Contratos" as Screen, icon: FileText },
      { label: "Equipamentos" as Screen, icon: Truck },
      { label: "Ordens de Serviço" as Screen, icon: Wrench },
      { label: "Serviços rápidos" as Screen, icon: Gauge },
      { label: "Partes diárias" as Screen, icon: ClipboardCheck },
      { label: "Abastecimento" as Screen, icon: Fuel },
      { label: "Notas fiscais" as Screen, icon: FileText },
      { label: "Apropriação" as Screen, icon: BarChart3 },
      { label: "Relatórios" as Screen, icon: FileSpreadsheet },
      { label: "Obras e serviços" as Screen, icon: HardHat },
    ],
  },
  {
    group: "ADMINISTRAÇÃO",
    items: [
      { label: "Central administrativa" as Screen, icon: Settings },
      { label: "Empresas" as Screen, icon: Building2 },
      { label: "Usuários e permissões" as Screen, icon: ShieldCheck },
      { label: "Backup e sincronização" as Screen, icon: DatabaseBackup },
      { label: "Cadastros" as Screen, icon: Settings },
    ],
  },
];
const contracts = [
  {
    number: "CTR-2026-018",
    object: "Caminhões e máquinas",
    supplier: "EMB Construções",
    end: "03 out 2026",
    days: 9,
    balance: "R$ 186.420",
    status: "A vencer",
  },
  {
    number: "CTR-2026-021",
    object: "Caminhão Munck",
    supplier: "F. Pereira Transportes",
    end: "08 out 2026",
    days: 14,
    balance: "R$ 54.380",
    status: "Ativo",
  },
  {
    number: "CTR-2026-013",
    object: "Perfuratriz com operador",
    supplier: "Cedro Locações",
    end: "17 out 2026",
    days: 23,
    balance: "R$ 31.500",
    status: "Ativo",
  },
];
function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const t: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${t[tone]}`}
    >
      {children}
    </span>
  );
}
export default function Home() {
  const [screen, setScreen] = useState<Screen>("Visão geral"),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [company, setCompany] = useState("SEPCO1"),
    [companyOptions, setCompanyOptions] = useState<any[]>([]),
    [currentUser, setCurrentUser] = useState({ name: "EUZEBIA FRAGA", email: "", role: "Administrador geral" }),
    [language, setLanguage] = useState<Language>("pt"),
    [online, setOnline] = useState(true),
    [pendingSync, setPendingSync] = useState(0),
    [notificationCount, setNotificationCount] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem("frota-language") as Language | null;
    if (saved) setLanguage(saved);
    fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanyOptions(rows); if (rows[0]) setCompany(rows[0].tradeName); if (data.currentUser) setCurrentUser({ name: data.currentUser.name || "Usuário administrador", email: data.currentUser.email || "", role: "Administrador geral" }); }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    const update = async () => {
      setOnline(navigator.onLine);
      setPendingSync(await offlineQueueCount().catch(() => 0));
    };
    const reconnect = async () => { await flushOfflineQueue(); await update(); };
    update();
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", update);
    window.addEventListener("frota-sync-change", update);
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", update);
      window.removeEventListener("frota-sync-change", update);
    };
  }, []);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-i18n-root]");
    if (!root) return;
    applyLanguage(root, language);
    localStorage.setItem("frota-language", language);
    const observer = new MutationObserver(() => applyLanguage(root, language));
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language, screen, modal]);
  const selectedCompanyId = companyOptions.find((row) => row.tradeName === company)?.id || companyOptions[0]?.id || "";
  useEffect(() => {
    if (!selectedCompanyId || !navigator.onLine) return;
    let active = true;
    const refreshNotifications = async () => {
      try {
        const fresh = { cache: "no-store" as RequestCache };
        const [deletionResponse, contractResponse, equipmentResponse, orderResponse] = await Promise.all([
          fetch(`/api/deletion-requests?companyId=${encodeURIComponent(selectedCompanyId)}`, fresh),
          fetch(`/api/contracts?companyId=${encodeURIComponent(selectedCompanyId)}`, fresh),
          fetch(`/api/equipment?companyId=${encodeURIComponent(selectedCompanyId)}`, fresh),
          fetch(`/api/maintenance?companyId=${encodeURIComponent(selectedCompanyId)}`, fresh),
        ]);
        const [deletionData, contractData, equipmentData, orderData] = await Promise.all([deletionResponse.json(), contractResponse.json(), equipmentResponse.json(), orderResponse.json()]);
        const now = new Date(), inThirtyDays = new Date(now.getTime() + 30 * 86400000);
        const pending = (deletionData.requests || []).filter((row: any) => row.status === "pending").length;
        const contractsDue = (contractData.contracts || []).filter((row: any) => { if (!row.endsAt) return false; const date = new Date(`${row.endsAt}T23:59:59`); return date >= now && date <= inThirtyDays; }).length;
        const tachographsDue = (equipmentData.equipment || []).filter((row: any) => { if (!row.tachographExpiryDate) return false; const date = new Date(`${row.tachographExpiryDate}T23:59:59`); return date >= now && date <= inThirtyDays; }).length;
        const open = (orderData.orders || []).filter((row: any) => { const status = String(row.status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); const maintenanceStatus = String(row.maintenanceStatus || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); return !row.closedAt && !["closed", "concluido", "concluida"].includes(status) && !maintenanceStatus.includes("concluid"); }).length;
        if (active) setNotificationCount(pending + contractsDue + tachographsDue + open);
      } catch {}
    };
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 30000);
    window.addEventListener("focus", refreshNotifications);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refreshNotifications); };
  }, [selectedCompanyId, screen, modal]);
  const filtered = useMemo(
    () =>
      contracts.filter((c) =>
        Object.values(c).join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <div data-i18n-root className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0b1930] text-white transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-4">
          <img src="/assets/sepco1-logo.svg" alt="SEPCO1 Construções do Brasil Ltda" className="h-14 min-w-0 flex-1 rounded-md bg-white object-contain px-2"/>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-4 pb-6">
          {nav.map((g) => (
            <div key={g.group} className="mb-7">
              <div className="mb-2 px-3 text-[11px] font-bold tracking-[.13em] text-slate-500">
                {g.group}
              </div>
              <div className="space-y-1">
                {g.items.map((item) => {
                  const I = item.icon,
                    a = screen === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setScreen(item.label);
                        setMobile(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${a ? "bg-[#ef2028] text-white shadow-lg shadow-red-950/20" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}
                    >
                      <I size={18} />
                      {item.label}
                      {a && <ChevronRight className="ml-auto" size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-white/10 bg-[#0b1930] p-4">
          <label
            data-no-translate
            className="mb-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm"
          >
            <span>🌐</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="min-w-0 flex-1 bg-transparent text-white outline-none"
            >
              <option className="text-slate-900" value="pt">
                🇧🇷 Português
              </option>
              <option className="text-slate-900" value="zh">
                🇨🇳 中文（简体）
              </option>
              <option className="text-slate-900" value="bilingual">
                🇧🇷 PT - 🇨🇳 中文
              </option>
            </select>
          </label>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold">
              {currentUser.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold">{currentUser.name}</div>
              <div className="text-xs text-slate-400">{currentUser.role}</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <button
            onClick={() => setMobile(true)}
            className="mr-3 rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          >
            <Menu />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Base definitiva • SEPCO1
            </div>
            <h1 className="text-xl font-bold md:text-2xl">{screen}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setScreen("Central administrativa")} className="hidden items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 xl:flex">
              <Settings size={17} />Administrativo
            </button>
            <label
              data-no-translate
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex"
            >
              <span aria-hidden="true">🌐</span>
              <span className="sr-only">Idioma / 语言</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="max-w-[210px] bg-transparent text-sm font-semibold outline-none"
                aria-label="Selecionar idioma / 选择语言"
              >
                <option value="pt">🇧🇷 Português</option>
                <option value="zh">🇨🇳 中文（简体）</option>
                <option value="bilingual">
                  🇧🇷 Português - 🇨🇳 中文（简体）
                </option>
              </select>
            </label>
            <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Building2 size={17} className="text-blue-700" />
              <span className="sr-only">Empresa ativa</span>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="max-w-[250px] bg-transparent text-sm font-semibold outline-none"
              >
                {companyOptions.length ? companyOptions.map((row) => <option key={row.id} value={row.tradeName}>{row.tradeName}</option>) : <option>SEPCO1</option>}
              </select>
            </label>
            <button
              onClick={() => setModal("alertas")}
              className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
            >
              <Bell size={19} />
              {notificationCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>}
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1520px] p-4 md:p-8">
          <button
            onClick={() => setScreen("Backup e sincronização")}
            className={`mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${online ? (pendingSync ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800") : "border-red-200 bg-red-50 text-red-800"}`}
          >
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}
            {online ? (pendingSync ? `${pendingSync} lançamento(s) aguardando sincronização` : "Online • dados confirmados na base") : `Offline • ${pendingSync} lançamento(s) salvo(s) neste aparelho`}
            <ChevronRight size={17} className="ml-auto" />
          </button>
          {screen === "Visão geral" ? (
            <Dashboard companyId={selectedCompanyId} setScreen={setScreen} setModal={setModal} />
          ) : (
            <ModulePage
              screen={screen}
              query={query}
              setQuery={setQuery}
              contracts={filtered}
              setModal={setModal}
              setScreen={setScreen}
            />
          )}
        </main>
      </div>
      {mobile && (
        <div
          onClick={() => setMobile(false)}
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
        />
      )}
      {modal && <Modal kind={modal} close={() => setModal(null)} />}
    </div>
  );
}
function Dashboard({
  companyId,
  setScreen,
  setModal,
}: {
  companyId: string;
  setScreen: (s: Screen) => void;
  setModal: (s: string) => void;
}) {
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [approvalLoaded, setApprovalLoaded] = useState(false);
  const [dashboardData, setDashboardData] = useState<{equipment:any[];contracts:any[];orders:any[]}>({equipment:[],contracts:[],orders:[]});
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!companyId) return;
        const response = await fetch(`/api/deletion-requests?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) setPendingApprovals((data.requests || []).filter((row: any) => row.status === "pending").sort((a: any, b: any) => String(b.requestedAt).localeCompare(String(a.requestedAt))));
      } catch {} finally { if (active) setApprovalLoaded(true); }
    })();
    return () => { active = false; };
  }, [companyId]);
  useEffect(() => { (async()=>{ try { if(!companyId)return; const fresh={cache:"no-store" as RequestCache}; const [equipmentResponse,contractResponse,orderResponse]=await Promise.all([fetch(`/api/equipment?companyId=${encodeURIComponent(companyId)}`,fresh),fetch(`/api/contracts?companyId=${encodeURIComponent(companyId)}`,fresh),fetch(`/api/maintenance?companyId=${encodeURIComponent(companyId)}`,fresh)]); const [equipmentData,contractData,orderData]=await Promise.all([equipmentResponse.json(),contractResponse.json(),orderResponse.json()]); setDashboardData({equipment:(equipmentData.equipment||[]).filter((row:any)=>row.status!=="demo"),contracts:contractData.contracts||[],orders:orderData.orders||[]}); } catch{} })(); },[companyId]);
  const activeEquipment=dashboardData.equipment.filter((row:any)=>row.status!=="demobilized").length, demobilizedEquipment=dashboardData.equipment.filter((row:any)=>row.status==="demobilized").length, maintenanceEquipment=dashboardData.equipment.filter((row:any)=>/maintenance|manuten/i.test(row.status)).length;
  const openOrders=dashboardData.orders.filter((row:any)=>{
    const status=String(row.status||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const maintenanceStatus=String(row.maintenanceStatus||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    return !row.closedAt && !["closed","concluido","concluida"].includes(status) && !maintenanceStatus.includes("concluid");
  });
  const now=new Date(), in30=new Date(now); in30.setDate(in30.getDate()+30);
  const expiringContracts=dashboardData.contracts.filter((row:any)=>row.endsAt&&new Date(`${row.endsAt}T00:00:00`)>=now&&new Date(`${row.endsAt}T00:00:00`)<=in30).sort((a:any,b:any)=>String(a.endsAt).localeCompare(String(b.endsAt)));
  const tachographAlerts=dashboardData.equipment.filter((row:any)=>row.tachographExpiryDate&&new Date(`${row.tachographExpiryDate}T00:00:00`)>=now&&new Date(`${row.tachographExpiryDate}T00:00:00`)<=in30);
  const cards = [
    {
      label: "Equipamentos ativos",
      value: String(activeEquipment),
      detail: `${maintenanceEquipment} em manutenção • ${demobilizedEquipment} desmobilizados`,
      icon: Truck,
      color: "blue",
    },
    {
      label: "Contratos ativos",
      value: String(dashboardData.contracts.filter((row:any)=>row.status!=="closed"&&row.status!=="cancelled").length),
      detail: `${expiringContracts.length} vencem em até 30 dias`,
      icon: FileText,
      color: "red",
    },
    {
      label: "O.S. em andamento",
      value: String(openOrders.length),
      detail: `${openOrders.filter((row:any)=>/aprova/i.test(row.requestApprovalStatus||row.flowStatus||"")).length} aguardando aprovação`,
      icon: Wrench,
      color: "amber",
    },
    {
      label: "Apropriação do mês",
      value: "—",
      detail: "Calculada somente após os lançamentos reais da competência",
      icon: BarChart3,
      color: "green",
    },
  ];
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Painel operacional SEPCO1</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe as pendências e a operação da frota em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal("importar planilha")}
            className="btn-secondary"
          >
            <Upload size={17} />
            Importar planilha
          </button>
          <button
            onClick={() => setModal("novo equipamento")}
            className="btn-primary"
          >
            <Plus size={17} />
            Novo equipamento
          </button>
        </div>
      </div>
      {approvalLoaded && pendingApprovals.length > 0 && <section className="mb-6 overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-red-700"><ShieldCheck size={22}/></div><div><h3 className="font-black text-red-900">{pendingApprovals.length} aprovação(ões) de exclusão pendente(s)</h3><p className="text-sm text-red-700">Ação exclusiva do Administrador Master</p></div></div><button onClick={() => setScreen("Usuários e permissões")} className="btn-primary"><ShieldCheck size={17}/>Analisar solicitações</button></div><div className="divide-y divide-red-100">{pendingApprovals.slice(0, 4).map((row) => <button key={row.id} onClick={() => setScreen("Usuários e permissões")} className="grid w-full gap-1 px-5 py-3 text-left hover:bg-red-100/60 md:grid-cols-[180px_1fr_180px]"><span className="text-sm font-bold text-red-900">{row.companyName}</span><span><span className="block text-sm font-semibold text-slate-900">{row.entityLabel}</span><span className="block truncate text-xs text-slate-600">Motivo: {row.reason}</span></span><span className="text-xs text-slate-500 md:text-right">{row.requestedByName || "Usuário"}<br/>{new Date(row.requestedAt).toLocaleString("pt-BR")}</span></button>)}</div>{pendingApprovals.length > 4 && <div className="border-t border-red-200 px-5 py-2 text-center text-xs font-bold text-red-700">Mais {pendingApprovals.length - 4} solicitação(ões) aguardando análise</div>}</section>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className="panel p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    {c.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold">{c.value}</div>
                </div>
                <div className={`iconbox ${c.color}`}>
                  <I size={21} />
                </div>
              </div>
              <div className="mt-4 text-xs font-medium text-slate-500">
                {c.detail}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <section className="panel overflow-hidden">
          <div className="panel-head">
            <div>
              <h3>Contratos próximos do vencimento</h3>
              <p>Prioridade para renovação ou encerramento</p>
            </div>
            <button
              onClick={() => setScreen("Contratos")}
              className="text-sm font-semibold text-blue-700"
            >
              Ver todos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Fornecedor / objeto</th>
                  <th>Vencimento</th>
                  <th>Saldo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expiringContracts.map((c:any) => (
                  <tr key={c.id||c.number}>
                    <td className="font-semibold">{c.number}</td>
                    <td>
                      <div className="font-medium">{c.supplierName||"—"}</div>
                      <div className="text-xs text-slate-400">{c.object}</div>
                    </td>
                    <td>
                      <div>{String(c.endsAt).split("-").reverse().join("/")}</div>
                      <div
                        className={
                          Math.ceil((new Date(`${c.endsAt}T00:00:00`).getTime()-now.getTime())/86400000) <= 10
                            ? "text-xs font-semibold text-red-600"
                            : "text-xs text-slate-400"
                        }
                      >
                        {Math.max(0,Math.ceil((new Date(`${c.endsAt}T00:00:00`).getTime()-now.getTime())/86400000))} dias
                      </div>
                    </td>
                    <td>{(Number(c.balanceCents||0)/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                    <td>
                      <button
                        onClick={() => setScreen("Contratos")}
                        className="row-action"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}{!expiringContracts.length&&<tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhum contrato real vence nos próximos 30 dias.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Alertas operacionais</h3>
              <p className="text-sm text-slate-500">Exigem atenção hoje</p>
            </div>
            <Badge tone="red">{pendingApprovals.length+expiringContracts.length+tachographAlerts.length+openOrders.length} alertas</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {pendingApprovals.length > 0 && <button onClick={() => setScreen("Usuários e permissões")} className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100"><div className="iconbox red"><ShieldCheck size={18}/></div><div><div className="text-sm font-bold text-red-900">Exclusões aguardando aprovação</div><div className="text-xs text-red-700">{pendingApprovals.length} solicitação(ões) para o Master analisar</div></div><ChevronRight className="ml-auto text-red-600" size={17}/></button>}
            {expiringContracts.length>0&&<AlertItem icon={CalendarClock} color="red" title={`${expiringContracts.length} contrato(s) próximo(s) do vencimento`} text="Consulte a lista de contratos reais ao lado."/>}
            {tachographAlerts.length>0&&<AlertItem icon={ShieldCheck} color="amber" title={`${tachographAlerts.length} tacógrafo(s) vence(m) em até 30 dias`} text={tachographAlerts.slice(0,3).map((row:any)=>`${row.fleetNumber} • ${row.plate||"sem placa"}`).join(", ")}/>} 
            {openOrders.length>0&&<AlertItem icon={Wrench} color="amber" title={`${openOrders.length} O.S. em andamento`} text="Valores calculados exclusivamente pelas ordens reais cadastradas."/>}
            {pendingApprovals.length+expiringContracts.length+tachographAlerts.length+openOrders.length===0&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Nenhum alerta real identificado.</div>}
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Situação da frota</h3>
              <p className="text-sm text-slate-500">
                Distribuição atual dos {dashboardData.equipment.length} equipamentos reais
              </p>
            </div>
            <CarFront className="text-slate-400" />
          </div>
          <div className="mt-6 flex h-4 overflow-hidden rounded-full">
            <div style={{width:`${dashboardData.equipment.length?activeEquipment/dashboardData.equipment.length*100:0}%`}} className="bg-emerald-500" />
            <div style={{width:`${dashboardData.equipment.length?maintenanceEquipment/dashboardData.equipment.length*100:0}%`}} className="bg-amber-400" />
            <div style={{width:`${dashboardData.equipment.length?demobilizedEquipment/dashboardData.equipment.length*100:0}%`}} className="bg-slate-300" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Legend value={String(activeEquipment)} label="Mobilizados" color="bg-emerald-500" />
            <Legend value={String(maintenanceEquipment)} label="Manutenção" color="bg-amber-400" />
            <Legend value={String(demobilizedEquipment)} label="Desmobilizados" color="bg-slate-300" />
          </div>
        </section>
        <section className="panel p-5">
          <h3 className="font-bold">Ações rápidas</h3>
          <p className="text-sm text-slate-500">
            Acesse os processos mais usados
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Quick
              icon={ClipboardCheck}
              label="Lançar parte diária"
              onClick={() => setScreen("Partes diárias")}
            />
            <Quick
              icon={Wrench}
              label="Abrir ordem de serviço"
              onClick={() => setScreen("Ordens de Serviço")}
            />
            <Quick
              icon={Fuel}
              label="Importar abastecimento"
              onClick={() => setModal("importar abastecimento")}
            />
            <Quick
              icon={Printer}
              label="Gerar apropriação"
              onClick={() => setScreen("Apropriação")}
            />
          </div>
        </section>
      </div>
    </>
  );
}
function ModulePage({
  screen,
  query,
  setQuery,
  contracts,
  setModal,
  setScreen,
}: {
  screen: Screen;
  query: string;
  setQuery: (s: string) => void;
  contracts: any[];
  setModal: (s: string) => void;
  setScreen: (s: Screen) => void;
}) {
  const meta: Record<string, { desc: string; action: string; icon: any }> = {
    Contratos: {
      desc: "Solicitações, anexos, aditivos, medições e saldo contratual.",
      action: "Novo contrato",
      icon: FileText,
    },
    Equipamentos: {
      desc: "Cadastro, documentos e histórico de alocação.",
      action: "Novo equipamento",
      icon: Truck,
    },
    Manutenção: {
      desc: "Ordens de serviço, peças, fornecedores e manutenção preventiva.",
      action: "Nova O.S.",
      icon: Wrench,
    },
    "Ordens de Serviço": {
      desc: "Operação, compras, serviços, documentos e aprovações no mesmo fluxo.",
      action: "Nova O.S.",
      icon: Wrench,
    },
    "Serviços rápidos": {
      desc: "Borracharia, lava-jato e serviços recorrentes com lançamento manual ou importação.",
      action: "Novo serviço",
      icon: Gauge,
    },
    "Partes diárias": {
      desc: "Produção diária por equipamento e operador, com importação por planilha.",
      action: "Importar planilha",
      icon: ClipboardCheck,
    },
    Abastecimento: {
      desc: "Consumo por frota ou placa integrado à apropriação.",
      action: "Importar abastecimento",
      icon: Fuel,
    },
    "Notas fiscais": {
      desc: "Entrada, conferência e apropriação de notas fiscais de peças e serviços.",
      action: "Nova nota fiscal",
      icon: FileText,
    },
    Apropriação: {
      desc: "Consolidação de partes, combustível, manutenção e contrato.",
      action: "Gerar apropriação",
      icon: BarChart3,
    },
    Relatórios: {
      desc: "Despesas operacionais e financeiras consolidadas, sem tratar locação como receita.",
      action: "Exportar relatório",
      icon: FileSpreadsheet,
    },
    "Obras e serviços": {
      desc: "Obras, frentes, ordens de trabalho, propostas e medições.",
      action: "Nova obra",
      icon: HardHat,
    },
    Empresas: {
      desc: "Empresas administradas com contratos, medições e operação totalmente separados.",
      action: "Nova empresa",
      icon: Building2,
    },
    "Central administrativa": {
      desc: "Acesso rápido às empresas, usuários, permissões e cadastros do sistema.",
      action: "Novo cadastro",
      icon: Settings,
    },
    "Usuários e permissões": {
      desc: "Defina exatamente o que cada usuário pode visualizar, incluir, alterar ou excluir.",
      action: "Novo usuário",
      icon: ShieldCheck,
    },
    "Backup e sincronização": {
      desc: "Backups separados por empresa e lançamentos offline com sincronização automática.",
      action: "Gerar backup",
      icon: DatabaseBackup,
    },
    Cadastros: {
      desc: "Base administrativa e parâmetros usados em todos os processos.",
      action: "Novo cadastro",
      icon: Settings,
    },
  };
  const m = meta[screen],
    I = m.icon;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{screen}</h2>
          <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
        </div>
        {screen === "Contratos" && (
          <button
            onClick={() => setModal(m.action.toLowerCase())}
            className="btn-primary"
          >
            <Plus size={17} />
            {m.action}
          </button>
        )}
      </div>
      {screen === "Contratos" ? (
        <Contracts
          query={query}
          setQuery={setQuery}
          contracts={contracts}
          setModal={setModal}
        />
      ) : screen === "Equipamentos" ? (
        <EquipmentPage />
      ) : screen === "Partes diárias" ? (
        <PartDailyPage setModal={setModal} />
      ) : screen === "Abastecimento" ? (
        <FuelManagementPage />
      ) : screen === "Serviços rápidos" ? (
        <QuickServicesPage />
      ) : screen === "Notas fiscais" ? (
        <InvoicePage />
      ) : screen === "Manutenção" || screen === "Ordens de Serviço" ? (
        <MaintenancePage setModal={setModal} />
      ) : screen === "Apropriação" ? (
        <Appropriation setModal={setModal} />
      ) : screen === "Relatórios" ? (
        <ReportsPage />
      ) : screen === "Obras e serviços" ? (
        <WorksPage />
      ) : screen === "Usuários e permissões" ? (
        <PermissionsPage />
      ) : screen === "Backup e sincronização" ? (
        <BackupSyncPage />
      ) : screen === "Central administrativa" ? (
        <CentralAdminPage setScreen={setScreen} />
      ) : screen === "Cadastros" ? (
        <MasterDataPage />
      ) : screen === "Empresas" ? (
        <CompaniesPage setModal={setModal} />
      ) : (
        <GenericModule screen={screen} icon={I} setModal={setModal} />
      )}
    </>
  );
}

type FuelForm = {
  entryDate: string;
  rn: string;
  fleetNumber: string;
  plate: string;
  station: string;
  maintenanceLocation: string;
  driverName: string;
  product: string;
  productCode: string;
  liters: number;
  unitPrice: number;
  total: number;
  kilometer: number | null;
  hourmeter: number | null;
};

const emptyFuel = (): FuelForm => ({
  entryDate: new Date().toISOString().slice(0, 10), rn: "", fleetNumber: "", plate: "",
  station: "", maintenanceLocation: "ABASTECIMENTO", driverName: "", product: "ÓLEO DIESEL S10", productCode: "000002",
  liters: 0, unitPrice: 0, total: 0, kilometer: null, hourmeter: null,
});

function FuelPage() {
  const [mode, setMode] = useState<"manual" | "import" | null>(null);
  const [form, setForm] = useState<FuelForm>(emptyFuel);
  const [companyId, setCompanyId] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState<{ id: string; fleetNumber: string; plate: string | null; description: string; operatorName: string | null }[]>([]);
  const [fuelProfessionals, setFuelProfessionals] = useState<any[]>([]);
  const [fuelSuppliers, setFuelSuppliers] = useState<any[]>([]);
  const [fuelMaintenanceLocations, setFuelMaintenanceLocations] = useState<any[]>([]);

  async function load(id?: string) {
    const selected = id || companyId;
    if (!selected) return;
    const response = await fetch(`/api/fuel?companyId=${encodeURIComponent(selected)}`);
    const data = await response.json();
    if (response.ok) setEntries(data.entries || []);
  }
  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const id = data.companies?.[0]?.id || "";
      setCompanyId(id);
      if (id) { load(id); loadEquipmentOptions(id); }
    }).catch(() => setMessage("Não foi possível carregar a empresa ativa."));
  }, []);
  function change<K extends keyof FuelForm>(key: K, value: FuelForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "liters" || key === "unitPrice")
        next.total = Number((Number(next.liters) * Number(next.unitPrice)).toFixed(2));
      return next;
    });
  }
  async function loadEquipmentOptions(id = companyId) {
    if (!id) return;
    const [equipmentResponse, professionalsResponse, suppliersResponse, locationsResponse] = await Promise.all([
      fetch(`/api/equipment?companyId=${encodeURIComponent(id)}&dailyList=1`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=profissional`),
      fetch(`/api/suppliers?companyId=${encodeURIComponent(id)}`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=local_manutencao`),
    ]);
    const [equipmentData, professionalsData, suppliersData, locationsData] = await Promise.all([equipmentResponse.json(), professionalsResponse.json(), suppliersResponse.json(), locationsResponse.json()]);
    if (equipmentResponse.ok) setEquipmentOptions(equipmentData.equipment || []);
    if (professionalsResponse.ok) setFuelProfessionals((professionalsData.records || []).filter((row: any) => row.active !== false));
    if (suppliersResponse.ok) setFuelSuppliers((suppliersData.suppliers || []).filter((row: any) => row.active !== false));
    if (locationsResponse.ok) {
      const rows = (locationsData.records || []).filter((row: any) => row.active !== false);
      setFuelMaintenanceLocations(rows);
      const abastecimento = rows.find((row: any) => /ABASTECIMENTO/i.test(`${row.name} ${row.description || ""}`));
      if (abastecimento) setForm((current) => ({ ...current, maintenanceLocation: abastecimento.name }));
    }
  }
  function selectFuelEquipment(field: "fleetNumber" | "plate", value: string) {
    const normalized = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const found = equipmentOptions.find((row) => field === "fleetNumber" ? row.fleetNumber === value : (row.plate || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === normalized);
    setForm((current) => ({ ...current, [field]: field === "plate" ? value.toUpperCase() : value, ...(found ? { fleetNumber: found.fleetNumber, plate: found.plate || "", driverName: found.operatorName || current.driverName } : {}) }));
    if (found) setMessage(`Equipamento ${found.fleetNumber} localizado. Motorista preenchido automaticamente e liberado para alteração.`);
  }
  async function saveManual(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setMessageIsError(false); setErrors([]);
    const response = await offlineRequest("/api/fuel", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, id: editingId || undefined, companyId, source: "manual" }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setMessageIsError(true); setMessage(data.error || "Não foi possível salvar."); setErrors(data.errors || []); return; }
    setMode(null); setForm(emptyFuel()); setEditingId("");
    if (data.queued) setMessage(data.message);
    else { setMessage(editingId ? "Abastecimento corrigido e concluído novamente." : "Abastecimento registrado com sucesso."); load(); }
  }
  function editFuel(row: any) {
    setEditingId(row.id); setForm({ entryDate: row.entryDate, rn: row.rn || "", fleetNumber: row.fleetNumber, plate: row.plate || "", station: row.station || "", maintenanceLocation: row.maintenanceLocation || "ABASTECIMENTO", driverName: row.driverName || "", product: row.product, productCode: row.productCode || "", liters: row.litersMilli / 1000, unitPrice: row.unitPriceMilli / 1000, total: row.totalCents / 100, kilometer: row.kilometer, hourmeter: row.hourmeter }); setMode("manual");
  }
  function checkFuelRequisition(value: string) {
    const requisition = value.trim();
    if (!requisition) return;
    const duplicate = entries.find((row) => String(row.rn || "").trim() === requisition && row.id !== editingId);
    if (duplicate) { setMessageIsError(true); setMessage(`A requisição ${requisition} já foi lançada no registro ${String(duplicate.systemNumber || 0).padStart(6, "0")}.`); }
  }
  async function downloadTemplate() {
    downloadStandardTemplate("/templates/modelo-abastecimento.xlsx", "1.CONTROLE_DE_ABASTECIMENTO.xlsx");
  }
  async function importFile(file?: File) {
    if (!file) return; setBusy(true); setMessage(""); setMessageIsError(false); setErrors([]);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const preferred = book.SheetNames.find((name) => name.toUpperCase().includes("ABASTEC")) || book.SheetNames[0];
      const matrix = XLSX.utils.sheet_to_json<any[]>(book.Sheets[preferred], { header: 1, defval: "", raw: true });
      const headerIndex = matrix.findIndex((row) => row.some((value) => String(value).trim().toLowerCase() === "data") && row.some((value) => String(value).trim().toLowerCase() === "placa"));
      if (headerIndex < 0) throw new Error("Cabeçalho padrão não encontrado. Baixe e use o modelo do sistema.");
      const headers = matrix[headerIndex].map((v) => String(v).trim());
      const pick = (row: any[], name: string) => row[headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())];
      const dateValue = (value: any) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).includes("/") ? String(value).split("/").reverse().join("-") : String(value).slice(0, 10);
      const rows = matrix.slice(headerIndex + 1).filter((row) => row.some(Boolean)).map((row) => ({
        entryDate: dateValue(pick(row, "Data")), rn: String(pick(row, "Requisição") || pick(row, "RN") || ""),
        fleetNumber: String(pick(row, "ID") || ""), plate: String(pick(row, "Placa") || ""),
        driverName: String(pick(row, "Motorista/Operador") || ""), station: String(pick(row, "Posto") || ""), maintenanceLocation: String(pick(row, "Local de manutenção") || "ABASTECIMENTO"),
        total: Number(pick(row, "Custo total R$") || 0), unitPrice: Number(pick(row, "Preço por litro") || 0),
        liters: Number(pick(row, "Litros abastecidos") || 0), product: String(pick(row, "Produto") || ""),
        kilometer: Number(pick(row, "Km Atual") || 0), hourmeter: Number(pick(row, "Horimetro Atual") || 0),
        productCode: String(pick(row, "Código") || ""),
      }));
      const response = await offlineRequest("/api/fuel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, source: "spreadsheet", fileName: file.name, entries: rows }) });
      const data = await response.json();
      if (!response.ok) { setMessageIsError(true); setMessage(data.error || "Importação não realizada."); setErrors(data.errors || []); }
      else { setMessage(`${data.imported} abastecimento(s) importado(s) com sucesso.`); setMode(null); load(); }
    } catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : "Arquivo inválido."); }
    setBusy(false);
  }
  const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => { setEditingId(""); setForm(emptyFuel()); setMode("manual"); }}><Plus size={17}/>Novo abastecimento</button>
        <button className="btn-secondary" onClick={() => setMode("import")}><Upload size={17}/>Importar planilha padrão</button>
        <button className="btn-secondary" onClick={downloadTemplate}><FileSpreadsheet size={17}/>Baixar planilha padrão</button>
      </div>
      {message && <div className={`rounded-xl border p-4 text-sm font-semibold ${messageIsError || errors.length ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}{errors.slice(0, 8).map((e) => <div key={`${e.row}-${e.error}`} className="mt-1 font-normal">Linha {e.row}: {e.error}</div>)}</div>}
      {mode === "import" && <section className="panel p-5"><h3 className="font-bold">Importar abastecimentos</h3><p className="mt-1 text-sm text-slate-500">Aceita XLSX ou CSV no padrão do sistema. A importação só é gravada se todas as linhas forem válidas.</p><label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center"><Upload className="text-blue-700"/><span className="mt-2 font-semibold">Escolher planilha</span><span className="text-xs text-slate-500">Validação por frota/ID e/ou placa</span><input disabled={busy} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importFile(e.target.files?.[0])}/></label><button className="btn-secondary mt-3" onClick={() => setMode(null)}>Cancelar</button></section>}
      {mode === "manual" && <form onSubmit={saveManual} className="panel p-5"><h3 className="font-bold">Lançamento manual</h3><div className="mt-4 grid gap-4 md:grid-cols-4 xl:grid-cols-5">
        <FuelField label="Nº do registro"><input readOnly className="input mt-1 bg-slate-100 font-semibold text-slate-500" value={editingId ? "Registro preservado" : "Automático ao salvar"}/></FuelField>
        <FuelField label="Data"><input required type="date" className="input mt-1" value={form.entryDate} onChange={(e) => change("entryDate", e.target.value)}/></FuelField>

        <FuelField label="Requisição"><input className="input mt-1" value={form.rn} onChange={(e) => { change("rn", e.target.value); setMessage(""); setMessageIsError(false); }} onBlur={(e) => checkFuelRequisition(e.target.value)}/><span className="mt-1 block text-xs font-normal text-slate-500">Número do bloco encaminhado ao posto.</span></FuelField>

        <FuelField label="Frota / ID"><input list="fuel-fleet-options" className="input mt-1" value={form.fleetNumber} onChange={(e) => selectFuelEquipment("fleetNumber", e.target.value)} placeholder="Digite ou selecione"/><datalist id="fuel-fleet-options">{equipmentOptions.map((row) => <option key={row.id} value={row.fleetNumber}>{row.plate || "Sem placa"} • {row.description}</option>)}</datalist></FuelField>

        <FuelField label="Placa"><input list="fuel-plate-options" className="input mt-1 uppercase" value={form.plate} onChange={(e) => selectFuelEquipment("plate", e.target.value)} placeholder="Digite ou selecione"/><datalist id="fuel-plate-options">{equipmentOptions.filter((row) => row.plate).map((row) => <option key={row.id} value={row.plate || ""}>{row.fleetNumber} • {row.description}</option>)}</datalist></FuelField>

        <FuelField label="Motorista / operador"><input list="fuel-professional-options" className="input mt-1" value={form.driverName} onChange={(e) => change("driverName", e.target.value)} placeholder="Digite ou selecione"/><datalist id="fuel-professional-options">{fuelProfessionals.map((row) => <option key={row.id} value={row.name}>{row.code || "Profissional cadastrado"}</option>)}</datalist><span className="mt-1 block text-xs font-normal text-slate-500">Preenchido pelo equipamento, mas pode ser alterado pela lista.</span></FuelField>

        <FuelField label="Posto / fornecedor"><input list="fuel-supplier-options" className="input mt-1" value={form.station} onChange={(e) => change("station", e.target.value)} placeholder="Digite ou selecione"/><datalist id="fuel-supplier-options">{fuelSuppliers.map((row) => <option key={row.id} value={row.name}>{row.taxId || "Fornecedor cadastrado"}</option>)}</datalist></FuelField>

        <FuelField label="Local de manutenção"><select required className="input mt-1" value={form.maintenanceLocation} onChange={(e) => change("maintenanceLocation", e.target.value)}><option value="">Selecione</option>{fuelMaintenanceLocations.map((row) => <option key={row.id} value={row.name}>{row.name}{row.description ? ` • ${row.description}` : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Usa o cadastro existente de Locais de manutenção.</span></FuelField>

        <FuelField label="Produto"><select className="input mt-1" value={form.product} onChange={(e) => change("product", e.target.value)}><option>ÓLEO DIESEL S10</option><option>ÓLEO DIESEL S500</option><option>GASOLINA</option><option>ARLA 32</option></select></FuelField>

        <FuelField label="Código"><input className="input mt-1" value={form.productCode} onChange={(e) => change("productCode", e.target.value)}/></FuelField>

        <FuelField label="Litros"><input required min="0.001" step="0.001" type="number" className="input mt-1" value={form.liters} onChange={(e) => change("liters", Number(e.target.value))}/></FuelField>

        <FuelField label="Preço por litro"><input required min="0.001" step="0.001" type="number" className="input mt-1" value={form.unitPrice} onChange={(e) => change("unitPrice", Number(e.target.value))}/></FuelField>

        <FuelField label="Valor total"><input readOnly type="text" className="input mt-1 bg-slate-50 font-semibold" value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(form.total || 0))}/></FuelField>

        <FuelField label="KM atual"><input min="0" type="number" className="input mt-1" value={form.kilometer ?? ""} onChange={(e) => change("kilometer", e.target.value ? Number(e.target.value) : null)}/></FuelField>

        <FuelField label="Horímetro atual"><input min="0" type="number" className="input mt-1" value={form.hourmeter ?? ""} onChange={(e) => change("hourmeter", e.target.value ? Number(e.target.value) : null)}/></FuelField>

      </div><div className="mt-5 flex gap-2"><button disabled={busy || !companyId} className="btn-primary">{busy ? "Salvando..." : "Salvar abastecimento"}</button><button type="button" className="btn-secondary" onClick={() => setMode(null)}>Cancelar</button></div></form>}
      <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Histórico de abastecimentos</h3><p>Consulta rápida dos lançamentos que alimentam a apropriação.</p></div></div><div className="overflow-x-auto"><table className="min-w-[1050px]"><thead><tr><th>Nº registro</th><th>Requisição</th><th>Data</th><th>Nº ID</th><th>Placa</th><th>Litros</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{entries.length ? entries.map((e) => <tr key={e.id}><td className="font-bold text-blue-800">{String(e.systemNumber || "—").padStart(6, "0")}</td><td>{e.rn || "—"}</td><td>{e.entryDate?.split("-").reverse().join("/")}</td><td className="font-semibold">{e.fleetNumber}</td><td>{e.plate || "Sem placa"}</td><td>{(e.litersMilli / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} L</td><td className="font-semibold">{money(e.totalCents)}</td><td><Badge tone={e.status === "draft" ? "amber" : "green"}>{e.status === "draft" ? "Reaberto" : "Concluído"}</Badge></td><td><div className="flex flex-wrap gap-2">{e.status === "draft" ? <button onClick={() => editFuel(e)} className="row-action"><Pencil size={14}/>Alterar</button> : <ReopenRequestButton companyId={companyId} module="fuel" entityType="fuel_entry" entityId={e.id} label={`Abastecimento ${e.fleetNumber} • ${e.entryDate}`} snapshot={e} onSent={setMessage}/>}<DeletionRequestButton companyId={companyId} module="fuel" entityType="fuel_entry" entityId={e.id} label={`Abastecimento ${e.fleetNumber} • ${e.entryDate}`} snapshot={e} onSent={(text) => { setMessage(text); load(); }}/></div></td></tr>) : <tr><td colSpan={9} className="py-10 text-center text-slate-500">Nenhum abastecimento registrado nesta empresa.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function FuelField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}{children}</label>;
}

function InvoicePage() {
  const today = new Date().toISOString().slice(0, 10);
  const emptyHeader = { invoiceNumber: "", series: "", documentModel: "55", issueDate: today, entryDate: today, dueDate: "", purchaseOrder: "", costCenter: "", supplierId: "", supplierName: "", accessKey: "", observation: "", pickedUp: false, stockUpdated: false };
  const [mode, setMode] = useState<"list" | "form">("list");
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showQuotation, setShowQuotation] = useState(false);
  const [equipmentOptions, setEquipmentOptions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSummary, setProductSummary] = useState<any>(null);
  const [header, setHeader] = useState(emptyHeader);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [item, setItem] = useState({ productId: "", description: "", category: "Peças de manutenção", quantity: 1, unitPrice: 0, equipmentId: "", ncm: "", cfop: "", cst: "", freight: 0, discount: 0, ipi: 0, icms: 0, stockEntry: false });
  const [payments, setPayments] = useState([{ amount: 0, dueDate: "", paymentMethod: "Boleto" }]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState("");
  const total = items.reduce((sum, row) => sum + Number(row.quantity) * Number(row.unitPrice) - Number(row.discount || 0) + Number(row.freight || 0) + Number(row.ipi || 0), 0);
  async function load(id = companyId) {
    if (!id) return;
    const [listResponse, optionsResponse] = await Promise.all([fetch(`/api/invoices?companyId=${encodeURIComponent(id)}`), fetch(`/api/invoices?companyId=${encodeURIComponent(id)}&options=1`)]);
    const list = await listResponse.json(), options = await optionsResponse.json();
    if (listResponse.ok) setInvoices(list.invoices || []); else setNotice(list.error || "Não foi possível carregar as notas.");
    if (optionsResponse.ok) { setSuppliers(options.suppliers || []); setOrders(options.orders || []); setEquipmentOptions(options.equipment || []); setProducts(options.products || []); }
  }
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) { setCompanyId(rows[0].id); load(rows[0].id); } }).catch(() => setNotice("Não foi possível carregar as empresas.")); }, []);
  async function selectOrder(orderId: string) {
    setSelectedOrderId(orderId); if (!orderId) return;
    const response = await fetch(`/api/invoices?companyId=${encodeURIComponent(companyId)}&orderId=${encodeURIComponent(orderId)}`), data = await response.json();
    if (!response.ok) return setNotice(data.error || "Não foi possível carregar os itens da O.S.");
    setItems(data.items || []); setNotice(`${data.items?.length || 0} item(ns) carregado(s) da O.S. ${data.order.orderNumber}. Confira os preços e impostos.`);
  }
  async function selectProduct(productId: string) {
    const product = products.find((row) => row.id === productId);
    setItem((current) => ({ ...current, productId, description: product?.name || "", category: product?.category || current.category }));
    if (!productId) return setProductSummary(null);
    const response = await fetch(`/api/products?companyId=${encodeURIComponent(companyId)}&productId=${encodeURIComponent(productId)}`);
    const data = await response.json();
    setProductSummary(response.ok ? data.summary : null);
  }
  function addItem(event: React.FormEvent) {
    event.preventDefault(); if (!item.description.trim() || item.quantity <= 0) return setNotice("Informe o produto/serviço e a quantidade.");
    const asset = equipmentOptions.find((row) => row.id === item.equipmentId);
    setItems((rows) => [...rows, { ...item, id: crypto.randomUUID(), equipmentLabel: asset ? `${asset.fleetNumber} • ${asset.plate || "Sem placa"}` : "Despesa geral da obra", maintenanceOrderId: selectedOrderId || null, orderNumber: orders.find((row) => row.id === selectedOrderId)?.orderNumber || "" }]);
    setItem((current) => ({ ...current, productId: "", description: "", quantity: 1, unitPrice: 0, freight: 0, discount: 0, ipi: 0, icms: 0, stockEntry: false }));
    setProductSummary(null);
  }
  function updatePayment(index: number, key: string, value: string | number) { setPayments((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  async function editInvoice(invoiceId: string) {
    setBusy(true); setNotice("Carregando nota fiscal...");
    const response = await fetch(`/api/invoices?companyId=${encodeURIComponent(companyId)}&invoiceId=${encodeURIComponent(invoiceId)}`), data = await response.json();
    setBusy(false); if (!response.ok) return setNotice(data.error || "Não foi possível carregar a nota fiscal.");
    setEditingInvoiceId(invoiceId);
    setHeader({ ...emptyHeader, ...data.invoice, supplierId: data.invoice.supplierId || "", supplierName: data.invoice.supplierName || "" });
    setItems(data.items || []); setPayments(data.payments?.length ? data.payments : [{ amount: 0, dueDate: "", paymentMethod: "Boleto" }]); setSelectedOrderId(data.invoice.maintenanceOrderId || ""); setMode("form"); setNotice("Nota fiscal aberta para alteração. Confira os dados e salve.");
  }
  async function generateInvoiceForm(invoice: any, automatic = false) {
    setBusy(true); setNotice(automatic ? "Nota fiscal salva. Gerando a FATURA para impressão..." : "Gerando a FATURA bilíngue no modelo padrão...");
    try {
      const [templateResponse, detailResponse] = await Promise.all([fetch("/templates/modelo-fatura-nota-fiscal.xlsx"), fetch(`/api/invoices?companyId=${encodeURIComponent(companyId)}&invoiceId=${encodeURIComponent(invoice.id)}`)]);
      if (!templateResponse.ok) throw new Error("O modelo padrão da ficha não foi encontrado.");
      const detail: any = await detailResponse.json();
      if (!detailResponse.ok) throw new Error(detail.error || "Não foi possível carregar a nota fiscal.");
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await templateResponse.arrayBuffer());
      const sheet = workbook.worksheets[0], totalCents = Number(detail.invoice.totalCents || 0);
      const issue = String(detail.invoice.issueDate || "").split("-");
      sheet.getCell("B3").value = `单位/部门：\nEntidade/Departamento\n${detail.invoice.costCenter || "SEPCO1"}`;
      sheet.getCell("N3").value = `${issue[0] || ""} 年 ${issue[1] || ""} 月 ${issue[2] || ""} 日\n${issue[2] || ""}/${issue[1] || ""}/${issue[0] || ""}`;
      sheet.getCell("B4").value = `事由 / Assunto: NF ${detail.invoice.invoiceNumber} • ${detail.invoice.supplierName}`;
      (detail.items || []).slice(0, 6).forEach((row: any, index: number) => {
        const line = 7 + index, lineCents = Number(row.totalCents || (Number(row.quantity || 0) * Number(row.unitPriceCents || 0)));
        sheet.getCell(`B${line}`).value = row.description || ""; sheet.getCell(`E${line}`).value = Number(row.quantity || 0);
        sheet.getCell(`F${line}`).value = lineCents / 100; sheet.getCell(`N${line}`).value = lineCents / 100;
      });
      sheet.getCell("F13").value = totalCents / 100; sheet.getCell("N13").value = totalCents / 100;
      sheet.getCell("D14").value = chineseUppercaseMoney(totalCents);
      sheet.getCell("D14").alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      sheet.getCell("O6").value = detail.invoice.observation || "";
      const output = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(output)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `FATURA_NF_${detail.invoice.invoiceNumber}.xlsx`; link.click(); URL.revokeObjectURL(url);
      setNotice(`FATURA da NF ${detail.invoice.invoiceNumber} gerada no modelo padrão e pronta para impressão e assinatura.`);
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível gerar a FATURA."); return false; }
    finally { setBusy(false); }
  }
  async function saveInvoice() {
    setBusy(true); setNotice("");
    const response = await offlineRequest("/api/invoices", { method: editingInvoiceId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, invoiceId: editingInvoiceId || undefined, action: editingInvoiceId ? "update" : undefined, ...header, maintenanceOrderId: selectedOrderId || null, payments, items }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setNotice(data.error || "Não foi possível salvar a nota fiscal.");
    setNotice(data.queued ? data.message : `Nota fiscal salva e enviada para conferência. Total: ${(data.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
    if (!data.queued) {
      const savedInvoice = { id: data.id, invoiceNumber: header.invoiceNumber };
      setHeader(emptyHeader); setItems([]); setPayments([{ amount: 0, dueDate: "", paymentMethod: "Boleto" }]); setSelectedOrderId(""); setEditingInvoiceId("");
      await load(); setMode("list");
      await generateInvoiceForm(savedInvoice, true);
    }
  }
  const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const filteredInvoices = invoices.filter((row) => `${row.invoiceNumber || ""} ${row.supplierName || ""} ${row.costCenter || ""} ${row.purchaseOrder || ""} ${row.issueDate || ""} ${row.entryDate || ""}`.toLowerCase().includes(invoiceSearch.toLowerCase()));
  return <div className="space-y-5">
    <FuelCreditNotesManager companyId={companyId} suppliers={suppliers} />
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap gap-2"><button onClick={() => { setMode("list"); setEditingInvoiceId(""); }} className={mode === "list" ? "btn-primary" : "btn-secondary"}>Notas registradas</button><button onClick={() => { setEditingInvoiceId(""); setHeader(emptyHeader); setItems([]); setPayments([{ amount: 0, dueDate: "", paymentMethod: "Boleto" }]); setMode("form"); }} className={mode === "form" ? "btn-primary" : "btn-secondary"}><Plus size={17}/>Entrada de nota fiscal</button><button onClick={() => downloadStandardTemplate("/templates/modelo-fatura-nota-fiscal.xlsx", "3.MODELO DE ANEXO PARA FATURAS E NOTAS FISCAIS.xlsx")} className="btn-secondary"><Download size={17}/>Baixar modelo padrão</button></div><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); load(e.target.value); }}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Origem: Central administrativa → Empresas</span></label></div>
    {notice && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div>}
    {mode === "list" ? <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Localizador de notas fiscais lançadas</h3><p>{filteredInvoices.length} de {invoices.length} registro(s) na empresa selecionada. Após cada lançamento, a FATURA é gerada automaticamente para assinatura.</p></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search size={16} className="text-slate-400"/><input className="w-72 max-w-full bg-transparent text-sm outline-none" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="NF, fornecedor, centro de custo ou pedido"/></label></div><div className="overflow-x-auto"><table><thead><tr><th>NF</th><th>Emissão</th><th>Fornecedor</th><th>Centro de custo</th><th>Pedido</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filteredInvoices.map((row) => <tr key={row.id}><td className="font-bold">{row.invoiceNumber}</td><td>{row.issueDate?.split("-").reverse().join("/")}</td><td>{row.supplierName}</td><td>{row.costCenter}</td><td>{row.purchaseOrder || "—"}</td><td className="font-semibold">{money(row.totalCents)}</td><td><Badge tone={row.status === "approved" ? "green" : row.status === "cancelled" ? "red" : "amber"}>{row.status === "approved" ? "Aprovada" : row.status === "cancelled" ? "Cancelada" : "Aguardando conferência"}</Badge></td><td><div className="flex flex-wrap gap-2"><button onClick={() => generateInvoiceForm(row)} disabled={busy} className="row-action"><FileSpreadsheet size={14}/>Imprimir FATURA</button><button onClick={() => editInvoice(row.id)} className="row-action"><Pencil size={14}/>Editar</button><DeletionRequestButton companyId={companyId} module="invoices" entityType="fiscal_invoice" entityId={row.id} label={`NF ${row.invoiceNumber} • ${row.supplierName}`} snapshot={row} onSent={setNotice}/></div></td></tr>)}{!filteredInvoices.length && <tr><td colSpan={8} className="py-10 text-center text-slate-500">{invoices.length ? "Nenhuma nota encontrada com este filtro." : "Nenhuma nota fiscal registrada."}</td></tr>}</tbody></table></div></section> : <section className="panel overflow-hidden">
      <div className="panel-head"><div><h3>{editingInvoiceId ? "Alterar Nota Fiscal de Entrada" : "Cadastro de Nota Fiscal de Entrada"}</h3><p>{editingInvoiceId ? "Edite os dados, itens e parcelas da nota fiscal." : "Dados da NFe, itens, O.S. e parcelamento."}</p></div><div className="text-right"><div className="text-xs text-slate-500">Total NFe</div><div className="text-xl font-black">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div></div>
      <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-4"><FuelField label="Número"><input required className="input mt-1" value={header.invoiceNumber} onChange={(e) => setHeader({ ...header, invoiceNumber: e.target.value })}/></FuelField>
<FuelField label="Série"><input className="input mt-1" value={header.series} onChange={(e) => setHeader({ ...header, series: e.target.value })}/></FuelField>
<FuelField label="Modelo"><input className="input mt-1" value={header.documentModel} onChange={(e) => setHeader({ ...header, documentModel: e.target.value })}/></FuelField>
<FuelField label="Data de emissão"><input required type="date" className="input mt-1" value={header.issueDate} onChange={(e) => setHeader({ ...header, issueDate: e.target.value })}/></FuelField>
<FuelField label="Data de entrada"><input required type="date" className="input mt-1" value={header.entryDate} onChange={(e) => setHeader({ ...header, entryDate: e.target.value })}/></FuelField>
<FuelField label="Nº pedido / requisição"><input className="input mt-1" value={header.purchaseOrder} onChange={(e) => setHeader({ ...header, purchaseOrder: e.target.value })}/></FuelField>
<FuelField label="Fornecedor (Razão Social)"><input list="invoice-suppliers" required className="input mt-1" value={header.supplierName} onChange={(e) => { const supplier = suppliers.find((row) => row.name === e.target.value); setHeader({ ...header, supplierName: e.target.value, supplierId: supplier?.id || "" }); }}/><datalist id="invoice-suppliers">{suppliers.map((row) => <option key={row.id} value={row.name}/>)}</datalist></FuelField>
<FuelField label="Centro de custo"><input required className="input mt-1" value={header.costCenter} onChange={(e) => setHeader({ ...header, costCenter: e.target.value })} placeholder="Obra / canteiro"/></FuelField>
<FuelField label="Vencimento"><input type="date" className="input mt-1" value={header.dueDate} onChange={(e) => setHeader({ ...header, dueDate: e.target.value })}/></FuelField>
<FuelField label="Nº da O.S."><select className="input mt-1" value={selectedOrderId} onChange={(e) => selectOrder(e.target.value)}><option value="">Sem O.S. / lançamento direto</option>{orders.map((row) => <option key={row.id} value={row.id}>{row.orderNumber} • {row.fleetNumber} • {row.plate || "Sem placa"}</option>)}</select></FuelField>
<FuelField label="Chave de acesso NF-e"><input className="input mt-1" maxLength={44} value={header.accessKey} onChange={(e) => setHeader({ ...header, accessKey: e.target.value.replace(/\D/g, "") })} placeholder="44 dígitos"/></FuelField>
<FuelField label="Observação"><input className="input mt-1" value={header.observation} onChange={(e) => setHeader({ ...header, observation: e.target.value })}/></FuelField>
<div className="flex items-end gap-4 pb-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={header.pickedUp} onChange={(e) => setHeader({ ...header, pickedUp: e.target.checked })}/>Retirada</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={header.stockUpdated} onChange={(e) => setHeader({ ...header, stockUpdated: e.target.checked })}/>Atualizar estoque</label></div></div>
      <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900"><strong>Itens da O.S.:</strong> ao escolher uma ordem de compra e serviços, os itens cadastrados nela são carregados automaticamente.</div>
      <form onSubmit={addItem} className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-4 xl:grid-cols-6"><FuelField label="Produto / serviço cadastrado"><select className="input mt-1" value={item.productId} onChange={(e) => selectProduct(e.target.value)}><option value="">Lançamento manual</option>{products.map((row) => <option key={row.id} value={row.id}>{row.code} • {row.name}</option>)}</select></FuelField>
<FuelField label="Descrição"><input required className="input mt-1" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })}/></FuelField>
<FuelField label="Categoria"><input required list="invoice-categories" className="input mt-1" value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}/><datalist id="invoice-categories">{[...new Set(products.map((row) => row.category))].map((value) => <option key={value} value={value}/>)}</datalist></FuelField>
<FuelField label="Quantidade"><input type="number" min="0.001" step="0.001" className="input mt-1" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: Number(e.target.value) })}/></FuelField>
<FuelField label="Preço unitário"><input type="number" min="0" step="0.01" className="input mt-1" value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: Number(e.target.value) })}/></FuelField>
<FuelField label="Equipamento"><select className="input mt-1" value={item.equipmentId} onChange={(e) => setItem({ ...item, equipmentId: e.target.value })}><option value="">Despesa geral da obra</option>{equipmentOptions.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"}</option>)}</select></FuelField>
{productSummary && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm xl:col-span-6"><strong>Histórico desta compra:</strong> menor preço {productSummary.minimumPriceCents == null ? "ainda não registrado" : money(productSummary.minimumPriceCents)}{productSummary.minimumSupplier ? ` • ${productSummary.minimumSupplier}` : ""}; última compra {productSummary.lastPurchaseDate ? productSummary.lastPurchaseDate.split("-").reverse().join("/") : "não registrada"}{productSummary.lastSupplier ? ` • ${productSummary.lastSupplier}` : ""}.</div>}<FuelField label="NCM"><input className="input mt-1" value={item.ncm} onChange={(e) => setItem({ ...item, ncm: e.target.value })}/></FuelField>
<FuelField label="CFOP"><input className="input mt-1" value={item.cfop} onChange={(e) => setItem({ ...item, cfop: e.target.value })}/></FuelField>
<FuelField label="CST"><input className="input mt-1" value={item.cst} onChange={(e) => setItem({ ...item, cst: e.target.value })}/></FuelField>
<FuelField label="Frete"><input type="number" step="0.01" className="input mt-1" value={item.freight} onChange={(e) => setItem({ ...item, freight: Number(e.target.value) })}/></FuelField>
<FuelField label="IPI"><input type="number" step="0.01" className="input mt-1" value={item.ipi} onChange={(e) => setItem({ ...item, ipi: Number(e.target.value) })}/></FuelField>
<FuelField label="ICMS"><input type="number" step="0.01" className="input mt-1" value={item.icms} onChange={(e) => setItem({ ...item, icms: Number(e.target.value) })}/></FuelField>
<FuelField label="Desconto"><input type="number" step="0.01" className="input mt-1" value={item.discount} onChange={(e) => setItem({ ...item, discount: Number(e.target.value) })}/></FuelField>
<FuelField label="Destino desta compra"><select className="input mt-1" value={item.stockEntry ? "stock" : "direct"} onChange={(e) => setItem({ ...item, stockEntry: e.target.value === "stock" })}><option value="direct">Uso direto / vinculado à O.S.</option><option value="stock">Entrada no estoque</option></select></FuelField>
<div className="xl:col-span-6"><button className="btn-secondary"><Plus size={17}/>Adicionar item</button></div></form>
      <div className="overflow-x-auto"><table className="min-w-[1050px]"><thead><tr><th>Produto / serviço</th><th>Categoria</th><th>Equipamento</th><th>O.S.</th><th>Qtde.</th><th>Preço unit.</th><th>Frete</th><th>IPI</th><th>ICMS</th><th>Desc.</th><th>Total</th><th></th></tr></thead><tbody>{items.map((row) => <tr key={row.id}><td className="font-semibold">{row.description}</td><td>{row.category}</td><td>{row.equipmentLabel || "Despesa geral"}</td><td>{row.orderNumber || "—"}</td><td>{row.quantity}</td><td>{Number(row.unitPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{Number(row.freight || 0).toFixed(2)}</td><td>{Number(row.ipi || 0).toFixed(2)}</td><td>{Number(row.icms || 0).toFixed(2)}</td><td>{Number(row.discount || 0).toFixed(2)}</td><td className="font-bold">{(Number(row.quantity) * Number(row.unitPrice) - Number(row.discount || 0) + Number(row.freight || 0) + Number(row.ipi || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><button onClick={() => setItems((current) => current.filter((currentRow) => currentRow.id !== row.id))} className="row-action text-red-700"><Trash2 size={14}/></button></td></tr>)}{!items.length && <tr><td colSpan={12} className="py-8 text-center text-slate-500">Selecione uma O.S. ou adicione os itens manualmente.</td></tr>}</tbody></table></div>
      <div className="border-t border-slate-200 p-5"><div className="flex items-center justify-between"><h4 className="font-bold">Parcelamento</h4><button type="button" onClick={() => setPayments((rows) => [...rows, { amount: 0, dueDate: "", paymentMethod: "Boleto" }])} className="btn-secondary"><Plus size={15}/>Adicionar parcela</button></div><div className="mt-3 space-y-2">{payments.map((payment, index) => <div key={index} className="grid gap-2 md:grid-cols-[80px_1fr_1fr_1fr_auto]"><div className="self-center text-sm font-bold">{index + 1}ª</div><input type="number" step="0.01" className="input" value={payment.amount} onChange={(e) => updatePayment(index, "amount", Number(e.target.value))} placeholder="Valor"/><input type="date" className="input" value={payment.dueDate} onChange={(e) => updatePayment(index, "dueDate", e.target.value)}/><select className="input" value={payment.paymentMethod} onChange={(e) => updatePayment(index, "paymentMethod", e.target.value)}><option>Boleto</option><option>PIX</option><option>Transferência / TED</option><option>Cartão</option></select><button type="button" onClick={() => setPayments((rows) => rows.filter((_, i) => i !== index))} className="row-action text-red-700"><Trash2 size={15}/></button></div>)}</div></div>
      <div className="flex justify-end border-t border-slate-200 p-5"><button disabled={busy || !companyId || !items.length} onClick={saveInvoice} className="btn-primary disabled:opacity-50"><CheckCircle2 size={17}/>{busy ? "Salvando..." : editingInvoiceId ? "Salvar alterações e gerar FATURA" : "Salvar NF e gerar FATURA"}</button></div>
    </section>}
  </div>;
}

function InvoicePageLegacy() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState("OS-26005");
  const [items, setItems] = useState([{ id: "1", description: "Filtro de óleo", category: "Peças de manutenção", quantity: 2, unit: 185, equipment: "208 • PDS-4E66", order: "OS-26005" }]);
  const [item, setItem] = useState({ description: "", category: "Peças de manutenção", quantity: 1, unit: 0, equipment: "", order: "" });
  const [notice, setNotice] = useState("");
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) setCompanyId(rows[0].id); }).catch(() => setNotice("Não foi possível carregar as empresas.")); }, []);
  const total = items.reduce((sum, row) => sum + row.quantity * row.unit, 0);
  function addInvoiceItem(event: React.FormEvent) {
    event.preventDefault();
    if (!item.description || item.quantity <= 0) return setNotice("Informe a descrição e a quantidade do item.");
    setItems((rows) => [...rows, { ...item, order: selectedOrder, id: crypto.randomUUID() }]);
    setItem((row) => ({ ...row, description: "", quantity: 1, unit: 0 }));
    setNotice("Item incluído na nota fiscal.");
  }
  function selectOrder(order: string) {
    setSelectedOrder(order);
    if (!order) {
      setItems([]);
      return setNotice("Selecione uma O.S. para carregar os itens automaticamente.");
    }
    const orderItems = order === "OS-26005"
      ? [
          { id: crypto.randomUUID(), description: "Filtro de óleo", category: "Peças de manutenção", quantity: 2, unit: 185, equipment: "208 • PDS-4E66", order },
          { id: crypto.randomUUID(), description: "Serviço de revisão preventiva", category: "Serviço terceirizado", quantity: 1, unit: 740, equipment: "208 • PDS-4E66", order },
        ]
      : [
          { id: crypto.randomUUID(), description: "Barra de nylon", category: "Peças de manutenção", quantity: 1, unit: 14.52, equipment: "372 • OUU-9I25", order },
          { id: crypto.randomUUID(), description: "Porca 12 mm", category: "Peças de manutenção", quantity: 4, unit: 0.25, equipment: "372 • OUU-9I25", order },
          { id: crypto.randomUUID(), description: "Arruela", category: "Peças de manutenção", quantity: 4, unit: 1.30, equipment: "372 • OUU-9I25", order },
        ];
    setItems(orderItems);
    setNotice(`${orderItems.length} item(ns) carregado(s) automaticamente da ${order}. Confira os valores da nota fiscal.`);
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex flex-wrap gap-2"><button onClick={() => setMode("list")} className={mode === "list" ? "btn-primary" : "btn-secondary"}>Notas registradas</button><button onClick={() => setMode("form")} className={mode === "form" ? "btn-primary" : "btn-secondary"}><Plus size={17}/>Entrada de nota fiscal</button></div><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Origem: Central administrativa → Empresas</span></label></div>
    {mode === "list" ? <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Notas fiscais de entrada</h3><p>Compra de peças, serviços e despesas vinculadas à obra.</p></div><button className="btn-secondary"><FileSpreadsheet size={17}/>Exportar</button></div><div className="overflow-x-auto"><table className="min-w-[900px]"><thead><tr><th>NF</th><th>Emissão</th><th>Fornecedor</th><th>Centro de custo</th><th>Pedido</th><th className="text-right">Total</th><th>Status</th><th></th></tr></thead><tbody>
      <tr><td className="font-semibold">2580</td><td>23/09/2026</td><td>ACN Roberto Peças</td><td>Canto do Buriti</td><td>052311</td><td className="text-right font-semibold">R$ 1.480,00</td><td><Badge tone="amber">Aguardando conferência</Badge></td><td><button className="row-action" onClick={() => setMode("form")}>Abrir</button></td></tr>
      <tr><td className="font-semibold">10459</td><td>21/09/2026</td><td>Resolve BGR Ltda.</td><td>Ribeiro Gonçalves</td><td>052247</td><td className="text-right font-semibold">R$ 3.275,60</td><td><Badge tone="green">Aprovada</Badge></td><td><button className="row-action">Abrir</button></td></tr>
    </tbody></table></div></section> : <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
      <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Entrada de nota fiscal</h3><p>Cabeçalho, itens e vínculo financeiro em uma única rotina.</p></div><div className="text-right"><div className="text-xs text-slate-500">Total calculado</div><div className="text-xl font-bold">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div></div>
        <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-4">
          <FuelField label="Número da NF"><input className="input mt-1" defaultValue="2580"/></FuelField>
<FuelField label="Série"><input className="input mt-1" defaultValue="1"/></FuelField>
<FuelField label="Data de emissão"><input type="date" className="input mt-1" defaultValue="2026-09-23"/></FuelField>
<FuelField label="Data de entrada"><input type="date" className="input mt-1" defaultValue="2026-09-25"/></FuelField>

          <FuelField label="Fornecedor (Razão Social)"><select className="input mt-1"><option>ACN Roberto Peças</option><option>Resolve BGR Ltda.</option></select></FuelField>
<FuelField label="Nome fantasia"><input className="input mt-1" defaultValue="ACN Peças"/></FuelField>
<FuelField label="Endereço"><input className="input mt-1"/></FuelField>
<FuelField label="Bairro"><input className="input mt-1"/></FuelField>
<FuelField label="Cidade"><input className="input mt-1"/></FuelField>
<FuelField label="UF"><input className="input mt-1 uppercase" maxLength={2}/></FuelField>
<FuelField label="Contato"><input className="input mt-1"/></FuelField>
<FuelField label="Vencimento"><input type="date" className="input mt-1" defaultValue="2026-10-23"/></FuelField>
<FuelField label="Pedido / requisição"><input className="input mt-1" defaultValue="052311"/></FuelField>
<FuelField label="Centro de custo"><select className="input mt-1"><option>Canto do Buriti</option><option>Colônia do Gurgueia</option><option>Uruçuí</option><option>Ribeiro Gonçalves</option></select></FuelField>

          <FuelField label="Nº da Ordem de Serviço"><select className="input mt-1" value={selectedOrder} onChange={(e) => selectOrder(e.target.value)}><option value="">Selecione a O.S.</option><option value="OS-26005">OS-26005 • Frota 208</option><option value="OS-27992">OS-27992 • Frota 372</option></select></FuelField>

          <FuelField label="Observação"><input className="input mt-1" defaultValue="Aquisição de peças para manutenção"/></FuelField>
<FuelField label="Forma de pagamento"><select className="input mt-1"><option>Transferência / TED</option><option>Boleto</option><option>PIX</option></select></FuelField>
<FuelField label="Valor da parcela"><input type="number" className="input mt-1" value={total} readOnly/></FuelField>
<div className="flex items-end gap-4 pb-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-blue-700"/>Retirada</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-blue-700"/>Atualizar estoque</label></div>
        </div>
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-end gap-3"><FuelField label="Chave de acesso da NF-e"><input className="input mt-1 min-w-[330px]" placeholder="44 dígitos"/></FuelField>
<button className="btn-secondary"><Upload size={17}/>Ler XML da NF-e</button><span className="pb-2 text-sm text-slate-500">Fornecedor, produtos, NCM, CFOP, CST, valores e tributos serão preenchidos pelo XML.</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{["ICMS", "IPI", "PIS/COFINS", "ISS", "CBS 2026", "IBS 2026"].map((tax) => <div key={tax} className="rounded-lg border border-slate-200 p-3"><div className="text-xs font-bold uppercase text-slate-500">{tax}</div><div className="mt-1 font-semibold">Conforme XML</div></div>)}</div>
          <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Regra fiscal:</strong> o sistema registra os tributos informados na nota e valida NCM, CFOP e CST. Não aplica uma alíquota fixa nem soma novamente tributos já incluídos no valor do item. CBS e IBS ficam destacados separadamente durante a transição de 2026.</div>
        </div>
        <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900"><strong>Carregamento automático:</strong> ao selecionar a O.S., todos os itens vinculados a ela são trazidos para a nota fiscal. Não é necessário importar novamente.</div>
        <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-5"><FuelField label="Total frete"><input type="number" step="0.01" className="input mt-1" defaultValue="0"/></FuelField>
<FuelField label="Desconto"><input type="number" step="0.01" className="input mt-1" defaultValue="0"/></FuelField>
<FuelField label="Total IPI"><input type="number" step="0.01" className="input mt-1" defaultValue="0"/></FuelField>
<FuelField label="Total ICMS"><input type="number" step="0.01" className="input mt-1" defaultValue="0"/></FuelField>
<FuelField label="Total da NFe"><input readOnly className="input mt-1 bg-slate-50 font-bold" value={total.toFixed(2)}/></FuelField>
</div>
        <form onSubmit={addInvoiceItem} className="grid gap-3 bg-slate-50 p-4 md:grid-cols-4"><FuelField label="Produto / serviço adicional"><input className="input mt-1" value={item.description} onChange={(e) => setItem({...item, description: e.target.value})} placeholder="Somente se não estiver na O.S."/></FuelField>
<FuelField label="Categoria"><select className="input mt-1" value={item.category} onChange={(e) => setItem({...item, category: e.target.value})}><option>Peças de manutenção</option><option>Serviço terceirizado</option><option>Borracharia</option><option>Lava-jato</option><option>Lubrificação</option><option>Abastecimento</option></select></FuelField>
<FuelField label="Quantidade"><input type="number" min="0.001" step="0.001" className="input mt-1" value={item.quantity} onChange={(e) => setItem({...item, quantity: Number(e.target.value)})}/></FuelField>
<FuelField label="Preço unitário"><input type="number" min="0" step="0.01" className="input mt-1" value={item.unit} onChange={(e) => setItem({...item, unit: Number(e.target.value)})}/></FuelField>
<FuelField label="Equipamento (ID ou placa)"><input className="input mt-1" value={item.equipment} onChange={(e) => setItem({...item, equipment: e.target.value})} placeholder="Preenchido pela O.S."/></FuelField>
<div className="flex items-end md:col-span-3"><button className="btn-secondary"><Plus size={17}/>Adicionar item fora da O.S.</button></div></form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div className="text-sm font-semibold">Itens carregados da {selectedOrder || "O.S."}</div><Badge tone="green">Automático</Badge></div>
        <div className="overflow-x-auto"><table className="min-w-[1050px]"><thead><tr><th>Produto / serviço</th><th>Categoria</th><th>Equipamento</th><th>O.S.</th><th>Qtde.</th><th>Preço unit.</th><th>Frete</th><th>IPI</th><th>ICMS</th><th>Desconto</th><th className="text-right">Total</th></tr></thead><tbody>{items.map((row) => <tr key={row.id}><td className="font-semibold">{row.description}</td><td>{row.category}</td><td>{row.equipment || "Despesa geral da obra"}</td><td>{row.order || "—"}</td><td>{row.quantity}</td><td>{row.unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>R$ 0,00</td><td>R$ 0,00</td><td>R$ 0,00</td><td>R$ 0,00</td><td className="text-right font-semibold">{(row.quantity * row.unit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>)}</tbody></table></div>
        {notice && <div className="border-t border-slate-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800">{notice}</div>}
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 p-4"><span className="text-sm text-slate-500">O sistema bloqueará NF duplicada pelo fornecedor, número e data de emissão.</span><div className="flex gap-2"><button className="btn-secondary">Salvar rascunho</button><button className="btn-primary" onClick={() => setNotice("Nota enviada para conferência. Após aprovação, os valores alimentarão os relatórios financeiros.")}><CheckCircle2 size={17}/>Enviar para conferência</button></div></div>
      </section>
      <aside className="space-y-4"><div className="panel p-5"><h3 className="font-bold">Fluxo da nota</h3><div className="mt-4 space-y-3"><Progress label="1. Entrada" value="Concluída"/><Progress label="2. Itens e vínculos" value={`${items.length} item(ns)`}/><Progress label="3. Conferência" value="Pendente"/><Progress label="4. Financeiro" value="Após aprovação"/></div></div><div className="rounded-2xl bg-[#0b1930] p-5 text-white"><h3 className="font-bold">Integração automática</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">Cada item pode ser apropriado por obra, centro de custo, equipamento e O.S. Isso evita lançar a mesma despesa novamente em outro módulo.</p></div></aside>
    </div>}
  </div>;
}

function MaintenancePage({ setModal: _setModal }: { setModal: (s: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [equipmentRows, setEquipmentRows] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showQuotation, setShowQuotation] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [mode, setMode] = useState<"list" | "new">("list");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("pending_actions");
  const [editingItemId, setEditingItemId] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [orderDetailTab, setOrderDetailTab] = useState<"order" | "items">("order");
  const [nextOrderNumber, setNextOrderNumber] = useState("0001"), [editingOrderId, setEditingOrderId] = useState("");
  const emptyOrder = { orderKind: "daily_maintenance", equipmentId: "", orderNumber: "", originMaintenanceOrderId: "", quotationMapId: "", startedAt: new Date().toISOString().slice(0, 10), maintenanceType: "Corretiva", maintenanceStatus: "Em lançamento", maintenanceFormType: "normal_repair", serviceType: "", description: "", requestedBy: "", preparedBy: "", maintenanceLocation: "", costCenter: "", kilometer: "", hourmeter: "", notifyLessor: true };
  const emptyItem = { itemType: "part", productService: "", quantity: 1, unitPrice: 0, discount: 0, supplierName: "", invoiceNumber: "", paymentResponsibility: "company", itemOrigin: "direct_purchase", serviceClass: "Corretiva", tirePreviousIdentification: "", tireCurrentIdentification: "", tireDot: "", tireCondition: "new", tireRemovedDestination: "stock", batteryCertificateNumber: "", batteryInvoiceNumber: "", observation: "" };
  const [orderForm, setOrderForm] = useState<any>(emptyOrder);
  const [itemForm, setItemForm] = useState<any>(emptyItem);
  const emptyQuotation = { number: "", needs: [{ description: "", quantity: 1, unit: "UN" }], observation: "", costCenter: "", options: [{ supplierName: "", total: 0, paymentTerms: "", deliveryDays: 0, validityDate: "", selected: true }, { supplierName: "", total: 0, paymentTerms: "", deliveryDays: 0, validityDate: "", selected: false }] };
  const [quotationForm, setQuotationForm] = useState<any>(emptyQuotation);
  const [maintenanceSuppliers, setMaintenanceSuppliers] = useState<any[]>([]), [maintenanceProducts, setMaintenanceProducts] = useState<any[]>([]), [maintenanceProfessionals, setMaintenanceProfessionals] = useState<any[]>([]), [maintenanceCosts, setMaintenanceCosts] = useState<any[]>([]), [maintenanceTypes, setMaintenanceTypes] = useState<any[]>([]), [maintenanceServiceTypes, setMaintenanceServiceTypes] = useState<any[]>([]), [maintenanceLocations, setMaintenanceLocations] = useState<any[]>([]), [maintenanceStatuses, setMaintenanceStatuses] = useState<any[]>([]), [productCategories, setProductCategories] = useState<any[]>([]);

  async function loadCompany(id: string) {
    if (!id) return;
    const [assetsResponse, ordersResponse, quotationsResponse, supplierResponse, productResponse, professionalResponse, costResponse, typeResponse, serviceTypeResponse, locationResponse, statusResponse, categoryResponse] = await Promise.all([fetch(`/api/equipment?companyId=${encodeURIComponent(id)}`), fetch(`/api/maintenance?companyId=${encodeURIComponent(id)}`), fetch(`/api/quotations?companyId=${encodeURIComponent(id)}`), fetch(`/api/suppliers?companyId=${encodeURIComponent(id)}`), fetch(`/api/products?companyId=${encodeURIComponent(id)}`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=profissional`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=centro_custo`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=tipo_manutencao`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=tipo_servico_manutencao`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=local_manutencao`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=status_manutencao`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=categoria_produto`)]);
    const assetsData = await assetsResponse.json(), ordersData = await ordersResponse.json(), quotationsData = await quotationsResponse.json(), supplierData = await supplierResponse.json(), productData = await productResponse.json(), professionalData = await professionalResponse.json(), costData = await costResponse.json(), typeData = await typeResponse.json(), serviceTypeData = await serviceTypeResponse.json(), locationData = await locationResponse.json(), statusData = await statusResponse.json(), categoryData = await categoryResponse.json();
    setEquipmentRows(assetsData.equipment || []); setOrders(ordersData.orders || []); setNextOrderNumber(ordersData.nextOrderNumber || "0001"); setQuotations(quotationsData.quotations || []); setSelected(null); setItems([]);
    setMaintenanceSuppliers((supplierData.suppliers || []).filter((row: any) => row.active !== false)); setMaintenanceProducts((productData.products || []).filter((row: any) => row.active !== false)); setMaintenanceProfessionals((professionalData.records || []).filter((row: any) => row.active)); setMaintenanceCosts((costData.records || []).filter((row: any) => row.active)); setMaintenanceTypes((typeData.records || []).filter((row: any) => row.active)); setMaintenanceServiceTypes((serviceTypeData.records || []).filter((row: any) => row.active)); setMaintenanceLocations((locationData.records || []).filter((row: any) => row.active)); setMaintenanceStatuses((statusData.records || []).filter((row: any) => row.active)); setProductCategories((categoryData.records || []).filter((row: any) => row.active));
  }
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) { setCompanyId(rows[0].id); loadCompany(rows[0].id); } }); }, []);
  async function openOrder(order: any) {
    setSelected(order); setClosingDate(order.closedAt || ""); setOrderDetailTab("order"); setMode("list"); setMessage(""); setEditingItemId(""); setItemForm(emptyItem);
    if (order.orderKind === "purchase_service") { const response = await fetch(`/api/maintenance/items?companyId=${encodeURIComponent(companyId)}&orderId=${encodeURIComponent(order.id)}`), data = await response.json(); setItems(data.items || []); } else setItems([]);
  }
  async function createOrder(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    setSaving(true);
    const response = await offlineRequest("/api/maintenance", { method: editingOrderId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, ...orderForm, maintenanceOrderId: editingOrderId || undefined, action: editingOrderId ? "update" : undefined, kilometer: orderForm.kilometer === "" ? null : Number(orderForm.kilometer), hourmeter: orderForm.hourmeter === "" ? null : Number(orderForm.hourmeter) }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível abrir a O.S.");
    setMessage(editingOrderId ? "O.S. atualizada com sucesso." : orderForm.orderKind === "daily_maintenance" ? "O.S. operacional aberta. O equipamento entrou em manutenção." : "O.S. Financeira / ADM aberta e pronta para receber peças e serviços.");
    if (data.emailDraft?.mailto) window.location.href = data.emailDraft.mailto;
    const createdId = data.maintenanceOrderId;
    const createdKind = orderForm.orderKind;
    setOrderForm(emptyOrder); setEditingOrderId(""); setMode("list"); await loadCompany(companyId);
    if (!editingOrderId && createdId) {
      const refreshedResponse = await fetch(`/api/maintenance?companyId=${encodeURIComponent(companyId)}`);
      const refreshedData = await refreshedResponse.json();
      const createdOrder = (refreshedData.orders || []).find((row: any) => row.id === createdId);
      if (createdOrder) {
        await openOrder(createdOrder);
        setOrderDetailTab(createdKind === "purchase_service" ? "items" : "order");
        setMessage(createdKind === "purchase_service" ? `O.S. ${data.orderNumber} aberta. Lance agora os produtos e serviços.` : `O.S. ${data.orderNumber} aberta com sucesso.`);
      }
    }
  }
  function editOrder(order: any) { setEditingOrderId(order.id); setOrderForm({ ...emptyOrder, ...order, kilometer: order.kilometer ?? "", hourmeter: order.hourmeter ?? "" }); setSelected(null); setShowQuotation(false); setMode("new"); setMessage(""); }
  async function addItem(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return;
    const response = await offlineRequest("/api/maintenance/items", { method: editingItemId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, id: editingItemId || undefined, maintenanceOrderId: selected.id, ...itemForm }) });
    const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível incluir o item.");
    setItemForm(emptyItem); setEditingItemId(""); setMessage(editingItemId ? "Item e valores atualizados com sucesso. A Ficha deverá ser impressa novamente." : data.appropriationDestination === "Reembolso de avarias" ? "Item incluído. Ao concluir a O.S., o valor seguirá para Reembolso ao locador." : "Item incluído. O valor seguirá para o custo da obra após a conclusão."); await openOrder({ ...selected, requestApprovalStatus: "draft", requestPrintedAt: null });
  }
  function editItem(row: any) { setEditingItemId(row.id); setItemForm({ ...emptyItem, itemType: row.itemType, productService: row.productService, quantity: Number(row.quantityMilli) / 1000, unitPrice: Number(row.unitPriceCents) / 100, discount: Number(row.discountCents || 0) / 100, supplierName: row.supplierName || "", invoiceNumber: row.invoiceNumber || "", paymentResponsibility: row.paymentResponsibility, itemOrigin: row.itemOrigin || "direct_purchase", serviceClass: row.serviceClass, tirePreviousIdentification: row.tirePreviousIdentification || "", tireCurrentIdentification: row.tireCurrentIdentification || "", tireDot: row.tireDot || "", tireCondition: row.tireCondition || "new", tireRemovedDestination: row.tireRemovedDestination || "stock", batteryCertificateNumber: row.batteryCertificateNumber || "", batteryInvoiceNumber: row.batteryInvoiceNumber || "", observation: row.observation || "" }); setMessage("Altere os dados do item e confirme."); }
  async function finishOrder() {
    if (!selected) return;
    const effectiveClosingDate = closingDate || selected.startedAt;
    const response = await offlineRequest("/api/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, maintenanceOrderId: selected.id, action: "close", closedAt: effectiveClosingDate }) });
    const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível concluir a O.S.");
    setMessage(selected.orderKind === "purchase_service" ? "O.S. concluída. Custos enviados para a apropriação." : "O.S. concluída. Equipamento liberado e período de manutenção encerrado."); await loadCompany(companyId);
  }
  async function printRequestSheet() {
    if (!selected || !items.length) return setMessage("Lance todos os produtos e serviços antes de imprimir a Ficha.");
    if (items.some((row) => row.itemOrigin !== "stock_withdrawal" && !row.supplierName)) return setMessage("Informe o fornecedor de cada item comprado antes de imprimir a Ficha.");
    const printWindow = window.open("", "_blank", "width=1200,height=850");
    if (!printWindow) return setMessage("Permita a abertura da janela de impressão no navegador.");
    const response = await offlineRequest("/api/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, maintenanceOrderId: selected.id, action: "mark_printed" }) });
    const data = await response.json();
    if (!response.ok) { printWindow.close(); return setMessage(data.error || "Não foi possível gerar a Ficha."); }
    const esc = (value: any) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
    const money = (cents: number) => (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const checked = (condition: boolean) => condition ? "☒" : "☐";
    const itemRows = items.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.productService)}${row.observation ? `<br><b>Observação:</b> ${esc(row.observation)}` : ""}${row.tireDot ? `<br>DOT: ${esc(row.tireDot)}` : ""}${row.batteryCertificateNumber ? `<br>Certificado: ${esc(row.batteryCertificateNumber)}` : ""}</td><td>${esc(row.supplierName || (row.itemOrigin === "stock_withdrawal" ? "ESTOQUE" : "—"))}</td><td>${Number(row.quantityMilli) / 1000}</td><td>${money(row.unitPriceCents)}</td><td>${money(row.discountCents || 0)}</td><td>${money(row.totalCents)}</td><td>${checked(row.paymentResponsibility === "lessor")} Reembolso<br>${checked(row.paymentResponsibility === "company_charge_lessor")} Desconto locador<br>${checked(row.paymentResponsibility === "company")} Custo obra</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ficha de Pedido - O.S. ${esc(selected.orderNumber)}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10px}h1{font-size:18px;margin:0;text-align:center}.cn{text-align:center;font-weight:bold;margin:2px 0 8px}.top,.grid,table{width:100%;border-collapse:collapse}.top td,.grid td,th,td{border:1px solid #111;padding:5px;vertical-align:middle}.label{font-size:8px;font-weight:bold;text-transform:uppercase;color:#333}.value{font-size:11px;font-weight:bold;margin-top:2px}.types{font-size:12px;word-spacing:3px;text-align:center}th{background:#eee;font-size:9px}td:nth-child(1){text-align:center}.desc{height:46px}.sign{height:58px;text-align:center;vertical-align:bottom!important}.obs{height:38px}.footer{margin-top:4px;font-size:8px;color:#555}.no{font-size:14px;font-weight:bold;text-align:right}</style></head><body><table class="top"><tr><td style="width:20%"><b>POWERCHINA</b><br>Gestão de Frota</td><td><h1>Pedido de Manutenção e Reparação de Veículos</h1><div class="cn">车辆保养维修申请表</div></td><td style="width:20%" class="no">O.S. Nº ${esc(selected.orderNumber)}</td></tr></table><table class="grid"><tr><td><div class="label">Data da aplicação / 申请日期</div><div class="value">${esc(selected.startedAt)}</div></td><td><div class="label">Frota / ID / 车队编号</div><div class="value">${esc(selected.fleetNumber)}</div></td><td><div class="label">Placa / 车牌</div><div class="value">${esc(selected.plate || "—")}</div></td><td><div class="label">Locador / 出租方</div><div class="value">${esc(selected.lessorName || "—")}</div></td><td><div class="label">Status da O.S. / 工单状态</div><div class="value">${esc(selected.maintenanceStatus || orderWorkflowStatus(selected).label)}</div></td></tr><tr><td colspan="2"><div class="label">Modelo / 型号</div><div class="value">${esc(selected.equipmentModel || selected.equipmentDescription)}</div></td><td colspan="2"><div class="label">Motorista / operador / 驾驶员</div><div class="value">${esc(selected.operatorName || "—")}</div></td><td><div class="label">KM / Horímetro / 公里·小时</div><div class="value">${esc(selected.kilometer ?? "—")} / ${esc(selected.hourmeter ?? "—")}</div></td></tr><tr><td colspan="5" class="types">${checked(selected.maintenanceFormType === "normal_repair")} Reparo normal / 正常维修 &nbsp;&nbsp; ${checked(selected.maintenanceFormType === "accident_repair")} Reparação de acidentes / 事故维修 &nbsp;&nbsp; ${checked(selected.maintenanceFormType === "maintenance")} Manutenção / 保养</td></tr><tr><td colspan="5" class="desc"><div class="label">Descrição / 情况描述</div><div class="value">${esc(selected.description)}</div></td></tr></table><table><thead><tr><th>Item / 项目</th><th>Detalhar / 说明</th><th>Fornecedor / 供应商</th><th>Qtde. / 数量</th><th>Valor unit. / 单价</th><th>Desconto / 折扣</th><th>Total / 总额</th><th>Destino / 费用归属</th></tr></thead><tbody>${itemRows}<tr><td colspan="6" style="text-align:right;font-weight:bold">PREÇO FINAL / 最终价格</td><td colspan="2" style="font-size:13px;font-weight:bold">${money(items.reduce((sum, row) => sum + Number(row.totalCents || 0), 0))}</td></tr></tbody></table><table class="grid"><tr><td class="sign">Gerente<br>经理</td><td class="sign">Subgerente<br>副经理</td><td class="sign">Verificador / Aprovação<br>审批</td><td class="sign">Requerente / 申请人<br>${esc(selected.requestedBy || "—")}</td></tr><tr><td colspan="4" class="obs"><b>OBSERVAÇÃO / 备注:</b></td></tr></table><div class="footer">Ficha gerada pelo Frota One. Os campos marcados refletem os dados lançados na O.S. ${esc(selected.orderNumber)}. Conferir antes de solicitar aprovação.</div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
    setSelected({ ...selected, maintenanceStatus: "Aguardando assinatura da Ficha", requestPrintedAt: data.requestPrintedAt });
    setMessage("Ficha impressa/gerada. Confira os campos e então solicite a aprovação.");
  }
  async function approvalAction(action: "request_approval" | "approve") { if (!selected) return; const response = await offlineRequest("/api/maintenance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, maintenanceOrderId: selected.id, action }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível atualizar a Ficha."); const nextStatus = action === "approve" ? "approved" : "pending"; setSelected({ ...selected, maintenanceStatus: action === "approve" ? "Ficha aprovada" : "Aguardando aprovação da Ficha", requestApprovalStatus: nextStatus }); setMessage(action === "approve" ? "Ficha de Pedido aprovada. A O.S. já pode ser concluída." : "Ficha enviada para aprovação com todos os itens e fornecedores informados."); }
  async function saveQuotation(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const description = JSON.stringify({ needs: quotationForm.needs.filter((row:any)=>row.description.trim()), observation: quotationForm.observation.trim() });
    const response = await offlineRequest("/api/quotations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, ...quotationForm, description }) });
    const data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível salvar o mapa de cotação.");
    setQuotationForm(emptyQuotation); setShowQuotation(false); setMessage("Mapa de cotação aprovado e disponível para vincular à O.S. Financeira / ADM."); await loadCompany(companyId);
  }
  function updateQuotationOption(index: number, key: string, value: any) { setQuotationForm((current: any) => ({ ...current, options: current.options.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, [key]: value } : row) })); }
  const operationalOrders = orders.filter((row) => row.orderKind === "daily_maintenance");
  function registeredStatusName(key: string, fallback: string) {
    return maintenanceStatuses.find((row) => registeredWorkflowKey(row) === key)?.name || fallback;
  }
  function orderWorkflowStatus(row: any) {
    if (row.status === "closed") return { key: "closed", label: registeredStatusName("closed", "Concluída"), tone: "green" as const };
    if (row.orderKind === "daily_maintenance") return { key: "operational", label: registeredStatusName("operational", "Em andamento"), tone: "blue" as const };
    if (row.requestApprovalStatus === "approved") return { key: "approved", label: registeredStatusName("approved", "Ficha aprovada"), tone: "green" as const };
    if (row.requestApprovalStatus === "pending") return { key: "pending_approval", label: registeredStatusName("pending_approval", "Aguardando aprovação da Ficha"), tone: "amber" as const };
    if (row.requestPrintedAt) return { key: "awaiting_signature", label: registeredStatusName("awaiting_signature", "Aguardando assinatura da Ficha"), tone: "amber" as const };
    return { key: "entry", label: registeredStatusName("entry", "Em lançamento"), tone: "slate" as const };
  }
  function maintenanceStatusTone(value: string) {
    const normalized = String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes("concl") || normalized.includes("aprov")) return "green" as const;
    if (normalized.includes("cancel") || normalized.includes("reprov")) return "red" as const;
    if (normalized.includes("aguard") || normalized.includes("pend")) return "amber" as const;
    if (normalized.includes("andamento") || normalized.includes("execucao")) return "blue" as const;
    return "slate" as const;
  }
  const normalizedOrderSearch = orderSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleOrders = orders.filter((row) => {
    const workflow = orderWorkflowStatus(row);
    const matchesSearch = !normalizedOrderSearch || [row.orderNumber, row.fleetNumber, row.plate, row.equipmentDescription].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(normalizedOrderSearch));
    if (!matchesSearch) return false;
    if (normalizedOrderSearch && orderStatusFilter === "pending_actions") return true;
    if (orderStatusFilter === "all") return true;
    if (orderStatusFilter === "pending_actions") return workflow.key !== "approved" && workflow.key !== "closed";
    return workflow.key === orderStatusFilter;
  });
  const defaultWorkflowStatusOptions = [
    { key: "entry", label: "Em lançamento" },
    { key: "awaiting_signature", label: "Aguardando assinatura da Ficha" },
    { key: "pending_approval", label: "Aguardando aprovação da Ficha" },
    { key: "approved", label: "Ficha aprovada" },
    { key: "operational", label: "Operacional em andamento" },
    { key: "closed", label: "Concluídas" },
  ];
  function registeredWorkflowKey(row: any) {
    const value = `${row.code || ""} ${row.name || ""}`.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (value.includes("assinatura")) return "awaiting_signature";
    if (value.includes("aguard") && value.includes("aprov")) return "pending_approval";
    if (value.includes("aprov")) return "approved";
    if (value.includes("concl") || value.includes("encerr")) return "closed";
    if (value.includes("andamento") || value.includes("operacional")) return "operational";
    if (value.includes("lancamento") || value.includes("abert")) return "entry";
    return "";
  }
  const registeredStatusOptions = maintenanceStatuses.map((row) => ({ key: registeredWorkflowKey(row), label: row.name })).filter((row) => row.key);
  const workflowStatusOptions = registeredStatusOptions.length ? registeredStatusOptions : defaultWorkflowStatusOptions;
  const selectedTotal = items.reduce((sum, row) => sum + Number(row.totalCents || 0), 0) / 100;
  const itemClassificationText = `${itemForm.productService || ""} ${itemForm.serviceClass || ""}`.toLocaleLowerCase("pt-BR");
  const isTireItem = /pneu|borracharia/.test(itemClassificationText);
  const isBatteryItem = /bateria/.test(itemClassificationText);
  return <div className="space-y-5">
    <datalist id="maintenance-suppliers">{maintenanceSuppliers.map((row) => <option key={row.id} value={row.name}>{row.taxId || "Fornecedor cadastrado"}</option>)}</datalist>
    <datalist id="maintenance-products">{maintenanceProducts.map((row) => <option key={row.id} value={row.name}>{row.category || "Produto ou serviço"}</option>)}</datalist>
    <datalist id="maintenance-professionals">{maintenanceProfessionals.map((row) => <option key={row.id} value={row.name}>{row.code || "Profissional cadastrado"}</option>)}</datalist>
    <datalist id="maintenance-costs">{maintenanceCosts.map((row) => <option key={row.id} value={row.name}>{row.code || "Centro de custo"}</option>)}</datalist>
    <datalist id="maintenance-locations">{maintenanceLocations.map((row) => <option key={row.id} value={row.name}>{row.code || "Local de manutenção"}</option>)}</datalist>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Ordens de serviço</h2><p className="text-sm text-slate-500">Operação, compras, serviços, documentos e apropriação no mesmo fluxo.</p></div><div className="flex flex-wrap items-end gap-2"><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); loadCompany(e.target.value); }}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></label><button onClick={() => { setShowQuotation(!showQuotation); setMode("list"); setSelected(null); }} className="btn-secondary"><FileSpreadsheet size={17}/>Mapa de cotação</button><button onClick={() => { setMode("new"); setShowQuotation(false); setSelected(null); setMessage(""); }} className="btn-primary"><Plus size={17}/>Nova ordem de serviço</button></div></div>
    {showQuotation && <section className="panel overflow-hidden"><form onSubmit={saveQuotation}><div className="panel-head"><div><h3>Novo mapa de cotação</h3><p>Inclua todos os objetos e marque um ou mais fornecedores premiados.</p></div><button type="button" onClick={() => setShowQuotation(false)} className="btn-secondary">Fechar</button></div><div className="grid gap-3 p-5 md:grid-cols-2"><FuelField label="Número do mapa"><input required className="input mt-1" value={quotationForm.number} onChange={(e) => setQuotationForm({ ...quotationForm, number: e.target.value })}/></FuelField><FuelField label="Centro de custo"><input required className="input mt-1" value={quotationForm.costCenter} onChange={(e) => setQuotationForm({ ...quotationForm, costCenter: e.target.value })}/></FuelField></div><div className="border-t border-slate-200 p-5"><div className="mb-3 flex items-center justify-between"><div><h4 className="font-bold">Objetos / necessidades a cotar</h4><p className="text-sm text-slate-500">O mesmo mapa pode reunir vários materiais ou serviços.</p></div><button type="button" onClick={()=>setQuotationForm((c:any)=>({...c,needs:[...c.needs,{description:"",quantity:1,unit:"UN"}]}))} className="btn-secondary"><Plus size={16}/>Adicionar objeto</button></div><div className="space-y-2">{quotationForm.needs.map((need:any,index:number)=><div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_100px_44px]"><input required className="input" placeholder="Descrição do material, serviço ou necessidade" value={need.description} onChange={(e)=>setQuotationForm((c:any)=>({...c,needs:c.needs.map((r:any,i:number)=>i===index?{...r,description:e.target.value}:r)}))}/><input required type="number" min="0.001" step="0.001" className="input" value={need.quantity} onChange={(e)=>setQuotationForm((c:any)=>({...c,needs:c.needs.map((r:any,i:number)=>i===index?{...r,quantity:Number(e.target.value)}:r)}))}/><input required className="input" placeholder="UN" value={need.unit} onChange={(e)=>setQuotationForm((c:any)=>({...c,needs:c.needs.map((r:any,i:number)=>i===index?{...r,unit:e.target.value}:r)}))}/>{quotationForm.needs.length>1?<button type="button" onClick={()=>setQuotationForm((c:any)=>({...c,needs:c.needs.filter((_:any,i:number)=>i!==index)}))} className="row-action text-red-700"><Trash2 size={16}/></button>:<span/>}</div>)}</div></div><div className="border-t border-slate-200 p-5"><FuelField label="Observações do mapa"><textarea className="input mt-1 min-h-24" placeholder="Condições especiais, escopo, justificativas ou informações para a aprovação" value={quotationForm.observation} onChange={(e)=>setQuotationForm({...quotationForm,observation:e.target.value})}/></FuelField></div><div className="overflow-x-auto"><table className="min-w-[900px]"><thead><tr><th>Premiado</th><th>Fornecedor</th><th>Valor total</th><th>Condição de pagamento</th><th>Prazo de entrega</th><th>Validade</th><th></th></tr></thead><tbody>{quotationForm.options.map((row: any, index: number) => <tr key={index}><td><input type="checkbox" checked={row.selected} onChange={(e) => updateQuotationOption(index, "selected", e.target.checked)} className="h-4 w-4 accent-blue-700"/></td><td><input required className="input" value={row.supplierName} onChange={(e) => updateQuotationOption(index, "supplierName", e.target.value)}/></td><td><input required type="number" min="0" step="0.01" className="input" value={row.total} onChange={(e) => updateQuotationOption(index, "total", Number(e.target.value))}/></td><td><input className="input" value={row.paymentTerms} onChange={(e) => updateQuotationOption(index, "paymentTerms", e.target.value)}/></td><td><input type="number" min="0" className="input" value={row.deliveryDays} onChange={(e) => updateQuotationOption(index, "deliveryDays", Number(e.target.value))}/></td><td><input type="date" className="input" value={row.validityDate} onChange={(e) => updateQuotationOption(index, "validityDate", e.target.value)}/></td><td>{quotationForm.options.length > 2 && <button type="button" onClick={() => setQuotationForm((current: any) => ({ ...current, options: current.options.filter((_: any, i: number) => i !== index) }))} className="row-action text-red-700"><Trash2 size={15}/></button>}</td></tr>)}</tbody></table></div><div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => setQuotationForm((current: any) => ({ ...current, options: [...current.options, { supplierName: "", total: 0, paymentTerms: "", deliveryDays: 0, validityDate: "", selected: false }] }))} className="btn-secondary"><Plus size={16}/>Adicionar proposta</button><button disabled={saving} className="btn-primary"><CheckCircle2 size={17}/>Aprovar mapa de cotação</button></div></form></section>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="panel overflow-hidden">
        {mode === "new" ? <form onSubmit={createOrder}>
          <div className="panel-head"><div><h3>{editingOrderId ? "Editar ordem de serviço" : "Abertura da ordem de serviço"}</h3><p>{editingOrderId ? "Altere os dados da O.S. aberta e confirme para salvar." : "Escolha primeiro se o controle será operacional ou financeiro."}</p></div><button type="button" onClick={() => { setEditingOrderId(""); setMode("list"); }} className="btn-secondary">Voltar</button></div>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <FuelField label="Número da O.S."><input readOnly className="input mt-1 bg-slate-100 font-bold" value={orderForm.orderNumber || nextOrderNumber}/><span className="mt-1 block text-xs text-slate-500">Gerado automaticamente pelo sistema</span></FuelField>

            <FuelField label="Data de abertura"><input required type="date" className="input mt-1" value={orderForm.startedAt} onChange={(e) => setOrderForm({ ...orderForm, startedAt: e.target.value })}/></FuelField>

            <FuelField label="Tipo da O.S."><select className="input mt-1" value={orderForm.orderKind} onChange={(e) => setOrderForm({ ...orderForm, orderKind: e.target.value, originMaintenanceOrderId: "" })}><option value="daily_maintenance">Operacional — mecânicos</option><option value="purchase_service">Financeira / ADM — compras e serviços</option></select></FuelField>

            <FuelField label="Equipamento"><select required className="input mt-1" value={orderForm.equipmentId} onChange={(e) => setOrderForm({ ...orderForm, equipmentId: e.target.value })}><option value="">Selecione ID ou placa</option>{equipmentRows.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"} • {row.description}</option>)}</select></FuelField>

            {orderForm.orderKind === "purchase_service" && <FuelField label="O.S. operacional de origem"><select className="input mt-1" value={orderForm.originMaintenanceOrderId} onChange={(e) => setOrderForm({ ...orderForm, originMaintenanceOrderId: e.target.value })}><option value="">Compra direta — sem origem</option>{operationalOrders.filter((row) => !orderForm.equipmentId || row.equipmentId === orderForm.equipmentId).map((row) => <option key={row.id} value={row.id}>{row.orderNumber} • {row.fleetNumber} • {row.maintenanceType}</option>)}</select></FuelField>
}
            {orderForm.orderKind === "purchase_service" && <FuelField label="Mapa de cotação aprovado"><select className="input mt-1" value={orderForm.quotationMapId} onChange={(e) => setOrderForm({ ...orderForm, quotationMapId: e.target.value })}><option value="">Sem mapa — justificar no processo</option>{quotations.map((row) => { const chosen = row.options?.filter((option: any) => option.selected) || []; return <option key={row.id} value={row.id}>{row.number} • {chosen.map((option:any)=>option.supplierName).join(", ") || "Sem fornecedor premiado"} • {(chosen.reduce((sum:number,option:any)=>sum+Number(option.totalCents||0),0)/100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</option>; })}</select></FuelField>
}
            <FuelField label="Tipo de manutenção"><select required className="input mt-1" value={orderForm.maintenanceType} onChange={(e) => setOrderForm({ ...orderForm, maintenanceType: e.target.value })}>{maintenanceTypes.length ? maintenanceTypes.map((row) => <option key={row.id} value={row.name}>{row.name}</option>) : <><option>Corretiva</option><option>Preventiva</option><option>Preditiva</option><option>Reparação de acidente</option></>}</select><span className="mt-1 block text-xs text-slate-500">Define por que a manutenção está sendo realizada.</span></FuelField>

            <FuelField label="Status da O.S."><select className="input mt-1" value={orderForm.maintenanceStatus} onChange={(e) => setOrderForm({ ...orderForm, maintenanceStatus: e.target.value })}>{maintenanceStatuses.length ? maintenanceStatuses.map((row) => <option key={row.id} value={row.name}>{row.name}</option>) : <><option>Em lançamento</option><option>Aguardando assinatura da Ficha</option><option>Aguardando aprovação da Ficha</option><option>Ficha aprovada</option><option>Em andamento</option><option>Concluída</option></>}</select><span className="mt-1 block text-xs text-slate-500">As opções vêm do cadastro de Status de manutenção.</span></FuelField>

            <FuelField label="Tipo de serviço"><select required className="input mt-1" value={orderForm.serviceType} onChange={(e) => setOrderForm({ ...orderForm, serviceType: e.target.value })}><option value="">Selecione o sistema afetado</option>{maintenanceServiceTypes.length ? maintenanceServiceTypes.map((row) => <option key={row.id} value={row.name}>{row.name}</option>) : <><option>Motor e alimentação</option><option>Transmissão e embreagem</option><option>Freios</option><option>Suspensão e direção</option><option>Elétrica e eletrônica</option><option>Sistema hidráulico</option><option>Pneus</option><option>Ar-condicionado</option><option>Carroceria e estrutura</option><option>Lubrificação</option><option>Outros</option></>}</select><span className="mt-1 block text-xs text-slate-500">Classifica o sistema afetado; peças e mão de obra são lançadas depois nos itens da O.S.</span></FuelField>

            <FuelField label="Centro de custo"><input required list="maintenance-costs" className="input mt-1" value={orderForm.costCenter} onChange={(e) => setOrderForm({ ...orderForm, costCenter: e.target.value })} placeholder="Selecione um cadastro"/></FuelField>

            <FuelField label="Requisitante"><input list="maintenance-professionals" className="input mt-1" value={orderForm.requestedBy} onChange={(e) => setOrderForm({ ...orderForm, requestedBy: e.target.value })} placeholder="Selecione um profissional"/></FuelField>

            <FuelField label="Elaborador / mecânico"><input list="maintenance-professionals" className="input mt-1" value={orderForm.preparedBy} onChange={(e) => setOrderForm({ ...orderForm, preparedBy: e.target.value })} placeholder="Selecione um profissional"/></FuelField>

            <FuelField label="Local da manutenção"><input list="maintenance-locations" className="input mt-1" value={orderForm.maintenanceLocation} onChange={(e) => setOrderForm({ ...orderForm, maintenanceLocation: e.target.value })} placeholder="Selecione um local"/></FuelField>

            <FuelField label="KM atual"><input type="number" min="0" className="input mt-1" value={orderForm.kilometer} onChange={(e) => setOrderForm({ ...orderForm, kilometer: e.target.value })}/></FuelField>

            <FuelField label="Horímetro atual"><input type="number" min="0" className="input mt-1" value={orderForm.hourmeter} onChange={(e) => setOrderForm({ ...orderForm, hourmeter: e.target.value })}/></FuelField>

            <div className="md:col-span-2 xl:col-span-4"><div className="text-sm font-semibold">Classificação para a Ficha / 申请表分类</div><div className="mt-2 grid gap-2 md:grid-cols-3">{[{ value: "normal_repair", pt: "Reparo normal", cn: "正常维修" }, { value: "accident_repair", pt: "Reparação de acidentes", cn: "事故维修" }, { value: "maintenance", pt: "Manutenção", cn: "保养" }].map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${orderForm.maintenanceFormType === option.value ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><input type="radio" name="maintenance-form-type" className="h-4 w-4 accent-blue-700" checked={orderForm.maintenanceFormType === option.value} onChange={() => setOrderForm({ ...orderForm, maintenanceFormType: option.value })}/><span><span className="block font-bold">{option.pt}</span><span className="text-xs text-slate-500">{option.cn}</span></span></label>)}</div></div>

            <div className="md:col-span-2 xl:col-span-3"><FuelField label="Observação / descrição da necessidade ou defeito"><textarea required className="input mt-1 min-h-24" value={orderForm.description} onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })} placeholder="Informe a observação geral da ordem de serviço"/></FuelField>
</div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5">{orderForm.orderKind === "purchase_service" ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Ficha de Pedido:</strong> abra a O.S. primeiro, lance todos os produtos e serviços com seus respectivos fornecedores e somente depois solicite a aprovação da Ficha.</div> : <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={orderForm.notifyLessor} onChange={(e) => setOrderForm({ ...orderForm, notifyLessor: e.target.checked })}/>Preparar aviso por e-mail ao locador</label>}</div>
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button type="button" onClick={() => { setEditingOrderId(""); setMode("list"); }} className="btn-secondary">Cancelar</button><button disabled={saving} className="btn-primary"><CheckCircle2 size={17}/>{saving ? "Salvando..." : editingOrderId ? "Salvar alterações" : "Abrir O.S."}</button></div>
        </form> : selected ? <div>
          <div className="panel-head"><div><h3>{selected.orderNumber} • {selected.orderKind === "daily_maintenance" ? "O.S. operacional" : "O.S. Financeira / ADM"}</h3><p>{selected.fleetNumber} • {selected.plate || "Sem placa"} • {selected.equipmentDescription}</p></div><div className="flex items-center gap-2">{selected.status !== "closed" && <button onClick={() => editOrder(selected)} className="btn-secondary"><Pencil size={16}/>Alterar / editar</button>}<Badge tone={maintenanceStatusTone(selected.maintenanceStatus)}>{selected.maintenanceStatus || orderWorkflowStatus(selected).label}</Badge></div></div>
          <div className="flex border-y border-slate-200 bg-slate-50 px-5 pt-3"><button onClick={() => setOrderDetailTab("order")} className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-bold ${orderDetailTab === "order" ? "border-red-300 bg-white text-red-700" : "border-transparent text-slate-500"}`}>Ordem de Serviços</button>{selected.orderKind === "purchase_service" && <button onClick={() => setOrderDetailTab("items")} className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-bold ${orderDetailTab === "items" ? "border-red-300 bg-white text-red-700" : "border-transparent text-slate-500"}`}>Peças e Serviços</button>}</div>
          {orderDetailTab === "order" && <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><MaintenanceInfo label="Número da O.S." value={selected.orderNumber}/><MaintenanceInfo label="Abertura" value={selected.startedAt}/><MaintenanceInfo label="Encerramento" value={selected.closedAt || "Em aberto"}/><MaintenanceInfo label="Status da O.S." value={selected.maintenanceStatus || orderWorkflowStatus(selected).label}/><MaintenanceInfo label="Situação do fluxo" value={orderWorkflowStatus(selected).label}/><MaintenanceInfo label="Tipo de manutenção" value={selected.maintenanceType}/><MaintenanceInfo label="Tipo de serviço" value={selected.serviceType || "—"}/><MaintenanceInfo label="Classificação da Ficha" value={selected.maintenanceFormType === "accident_repair" ? "Reparação de acidentes / 事故维修" : selected.maintenanceFormType === "maintenance" ? "Manutenção / 保养" : "Reparo normal / 正常维修"}/><MaintenanceInfo label="Centro de custo" value={selected.costCenter || "—"}/><MaintenanceInfo label="Responsável" value={selected.preparedBy || "—"}/><MaintenanceInfo label="KM" value={selected.kilometer?.toString() || "—"}/><MaintenanceInfo label="Horímetro" value={selected.hourmeter?.toString() || "—"}/><div className="sm:col-span-2"><MaintenanceInfo label="Descrição" value={selected.description}/></div></div>}
          {selected.orderKind === "purchase_service" && orderDetailTab === "items" && <><div className="border-t border-slate-200 px-5 py-3"><h4 className="font-bold">Peças e serviços</h4><p className="text-sm text-slate-500">Você pode lançar os itens imediatamente após abrir a O.S.; a conclusão será feita somente ao final do processo.</p></div>{selected.status !== "closed" && <form onSubmit={addItem} className="grid gap-3 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Tipo"><select className="input mt-1" value={itemForm.itemType} onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}><option value="part">Peça</option><option value="service">Serviço</option></select></FuelField>
<FuelField label="Produto / serviço"><select required className="input mt-1" value={itemForm.productService} onChange={(e) => { const product = maintenanceProducts.find((row) => row.name === e.target.value); setItemForm({ ...itemForm, productService: e.target.value, serviceClass: product?.category || itemForm.serviceClass }); }}><option value="">Selecione um produto cadastrado</option>{maintenanceProducts.filter((row) => itemForm.itemType === "service" ? row.itemType === "service" : row.itemType !== "service").map((row) => <option key={row.id} value={row.name}>{row.code} • {row.name} • {row.category}</option>)}</select></FuelField>
<FuelField label="Quantidade"><input required type="number" min="0.001" step="0.001" className="input mt-1" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}/></FuelField>
<FuelField label="Valor unitário"><input required type="number" min="0" step="0.01" className="input mt-1" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}/></FuelField>
<FuelField label="Desconto do item"><input type="number" min="0" step="0.01" className="input mt-1" value={itemForm.discount} onChange={(e) => setItemForm({ ...itemForm, discount: Number(e.target.value) })}/><span className="mt-1 block text-xs font-normal text-slate-500">Total: {(Math.max(0, Number(itemForm.quantity) * Number(itemForm.unitPrice) - Number(itemForm.discount || 0))).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></FuelField>
<FuelField label="Origem / movimento do item"><select className="input mt-1" value={itemForm.itemOrigin} onChange={(e) => { const origin = e.target.value; setItemForm({ ...itemForm, itemOrigin: origin, paymentResponsibility: origin === "lessor_purchase" ? "lessor" : itemForm.paymentResponsibility, supplierName: origin === "stock_withdrawal" ? "" : itemForm.supplierName }); }}><option value="direct_purchase">Compra direta para esta O.S.</option><option value="stock_withdrawal">Retirada do estoque</option><option value="lessor_purchase">Compra pelo locador • reembolso</option></select></FuelField>
<FuelField label="Fornecedor deste item"><select required={itemForm.itemOrigin !== "stock_withdrawal"} disabled={itemForm.itemOrigin === "stock_withdrawal"} className="input mt-1 disabled:bg-slate-100" value={itemForm.supplierName} onChange={(e) => setItemForm({ ...itemForm, supplierName: e.target.value })}><option value="">{itemForm.itemOrigin === "stock_withdrawal" ? "Saída do estoque interno" : "Selecione o fornecedor deste produto/serviço"}</option>{maintenanceSuppliers.map((row) => <option key={row.id} value={row.name}>{row.name}{row.taxId ? ` • ${row.taxId}` : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Cada item comprado pode ter um fornecedor diferente.</span></FuelField>
<FuelField label="Pagamento / responsabilidade"><select className="input mt-1" value={itemForm.paymentResponsibility} onChange={(e) => setItemForm({ ...itemForm, paymentResponsibility: e.target.value })}><option value="company">Empresa paga • custo da obra</option><option value="lessor">Locador paga • reembolso na medição</option><option value="company_charge_lessor">Empresa paga • descontar do locador</option></select></FuelField>
<FuelField label="Categoria"><select className="input mt-1" value={itemForm.serviceClass} onChange={(e) => setItemForm({ ...itemForm, serviceClass: e.target.value })}>{productCategories.length ? productCategories.map((row) => <option key={row.id} value={row.name}>{row.name}</option>) : <><option>Preventiva</option><option>Corretiva</option><option>Avaria</option><option>Borracharia</option><option>Lava-jato</option><option>Lubrificação</option></>}</select></FuelField>
{isTireItem && <><FuelField label="Identificação do pneu anterior"><input className="input mt-1" value={itemForm.tirePreviousIdentification} onChange={(e) => setItemForm({ ...itemForm, tirePreviousIdentification: e.target.value })} placeholder="Número / fogo / patrimônio"/></FuelField><FuelField label="Identificação do pneu atual"><input className="input mt-1" value={itemForm.tireCurrentIdentification} onChange={(e) => setItemForm({ ...itemForm, tireCurrentIdentification: e.target.value })} placeholder="Número / fogo / patrimônio"/></FuelField><FuelField label="DOT do pneu atual"><input className="input mt-1" value={itemForm.tireDot} onChange={(e) => setItemForm({ ...itemForm, tireDot: e.target.value })} placeholder="Ex.: 3526"/></FuelField><FuelField label="Condição do pneu"><select className="input mt-1" value={itemForm.tireCondition} onChange={(e) => setItemForm({ ...itemForm, tireCondition: e.target.value })}><option value="new">Novo</option><option value="retreaded">Recapado</option><option value="used">Usado</option></select></FuelField><FuelField label="Destino do pneu retirado"><select className="input mt-1" value={itemForm.tireRemovedDestination} onChange={(e) => setItemForm({ ...itemForm, tireRemovedDestination: e.target.value })}><option value="stock">Retornar ao estoque</option><option value="discard">Descarte</option><option value="supplier_return">Devolver ao fornecedor</option><option value="lessor_return">Devolver ao locador</option></select></FuelField></>}
{isBatteryItem && <><FuelField label="Certificado da bateria"><input className="input mt-1" value={itemForm.batteryCertificateNumber} onChange={(e) => setItemForm({ ...itemForm, batteryCertificateNumber: e.target.value })}/></FuelField><FuelField label="Nota fiscal da bateria"><input className="input mt-1" value={itemForm.batteryInvoiceNumber} onChange={(e) => setItemForm({ ...itemForm, batteryInvoiceNumber: e.target.value })}/></FuelField></>}
<div className="md:col-span-2 xl:col-span-3"><FuelField label="Observação do produto / serviço"><textarea className="input mt-1 min-h-20" value={itemForm.observation} onChange={(e) => setItemForm({ ...itemForm, observation: e.target.value })} placeholder="Detalhes do item, justificativa, aplicação ou informação adicional"/></FuelField></div>
<div className="flex items-end gap-2"><button className="btn-primary">{editingItemId ? <Pencil size={17}/> : <Plus size={17}/>} {editingItemId ? "Salvar alteração" : "Incluir item"}</button>{editingItemId && <button type="button" onClick={() => { setEditingItemId(""); setItemForm(emptyItem); }} className="btn-secondary">Cancelar</button>}</div></form>}
<div className="overflow-x-auto"><table className="min-w-[1400px]"><thead><tr><th>Produto / serviço</th><th>Observação</th><th>Fornecedor</th><th>Quantidade</th><th>Unitário</th><th>Desconto</th><th>Total</th><th>Origem</th><th>Pagamento</th><th>Dados especiais</th><th>Ações</th></tr></thead><tbody>{items.length ? items.map((row) => <tr key={row.id}><td className="font-semibold">{row.productService}<div className="text-xs font-normal text-slate-500">{row.serviceClass}</div></td><td>{row.observation || "—"}</td><td>{row.supplierName || (row.itemOrigin === "stock_withdrawal" ? "Estoque interno" : "—")}</td><td>{Number(row.quantityMilli) / 1000}</td><td>{(Number(row.unitPriceCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{(Number(row.discountCents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="font-semibold">{(Number(row.totalCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{row.itemOrigin === "stock_withdrawal" ? "Saída do estoque" : row.itemOrigin === "lessor_purchase" ? "Compra do locador" : "Compra direta"}</td><td><Badge tone={row.paymentResponsibility === "company" ? "blue" : "amber"}>{row.paymentResponsibility === "lessor" ? "Locador • reembolso" : row.paymentResponsibility === "company_charge_lessor" ? "Empresa • descontar do locador" : "Empresa • custo da obra"}</Badge></td><td><div className="text-xs">{row.tireDot ? `Pneu DOT ${row.tireDot}` : row.batteryCertificateNumber ? `Bateria • Cert. ${row.batteryCertificateNumber}` : "—"}</div></td><td>{selected.status !== "closed" ? <button onClick={() => editItem(row)} className="row-action"><Pencil size={14}/>Editar valores</button> : <span className="text-xs text-slate-400">Solicite reabertura</span>}</td></tr>) : <tr><td colSpan={11} className="py-8 text-center text-slate-500">Nenhum item lançado.</td></tr>}</tbody></table></div></>}
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4"><div><div className="text-xs text-slate-500">Total da O.S.</div><div className="text-lg font-black">{selectedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>{selected.orderKind === "purchase_service" && <div className="mt-1 text-xs font-semibold text-blue-800">Ficha: {selected.requestApprovalStatus === "approved" ? "Aprovada" : selected.requestApprovalStatus === "pending" ? "Aguardando aprovação" : selected.requestPrintedAt ? "Impressa e pronta para solicitar" : "Aguardando impressão"}</div>}</div><div className="flex flex-wrap items-end gap-2"><button onClick={() => setSelected(null)} className="btn-secondary">Voltar à lista</button>{selected.status !== "closed" && selected.orderKind === "purchase_service" && selected.requestApprovalStatus !== "pending" && selected.requestApprovalStatus !== "approved" && <button disabled={!items.length} onClick={printRequestSheet} className="btn-secondary disabled:opacity-50"><Printer size={17}/>{selected.requestPrintedAt ? "Imprimir Ficha novamente" : "Imprimir Ficha"}</button>}{selected.status !== "closed" && selected.orderKind === "purchase_service" && selected.requestApprovalStatus !== "pending" && selected.requestApprovalStatus !== "approved" && <button disabled={!items.length || !selected.requestPrintedAt} onClick={() => approvalAction("request_approval")} className="btn-primary disabled:opacity-50"><ClipboardCheck size={17}/>Solicitar aprovação da Ficha</button>}{selected.status !== "closed" && selected.orderKind === "purchase_service" && selected.requestApprovalStatus === "pending" && <button onClick={() => approvalAction("approve")} className="btn-primary"><CheckCircle2 size={17}/>Aprovar Ficha</button>}{selected.status !== "closed" && (selected.orderKind !== "purchase_service" || selected.requestApprovalStatus === "approved") && <><label className="text-xs font-semibold text-slate-600">Data de encerramento (opcional)<input type="date" min={selected.startedAt} className="input mt-1 block" value={closingDate} onChange={(e) => setClosingDate(e.target.value)}/><span className="mt-1 block font-normal text-slate-500">Em branco: usa a data de abertura.</span></label><button onClick={finishOrder} className="btn-primary"><CheckCircle2 size={17}/>Encerrar O.S.</button></>}</div></div>
        </div> : <><div className="panel-head items-end"><div><h3>Fila de Ordens de Serviço</h3><p>{visibleOrders.length} registro(s). A tela inicia mostrando somente as O.S. que ainda precisam de ação.</p></div><div className="flex flex-wrap gap-2"><label className="flex min-w-72 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><Search size={16}/><input className="w-full bg-transparent text-sm outline-none" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Buscar O.S., ID/frota ou placa"/></label><select className="input min-w-64" value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}><option value="pending_actions">Somente pendências</option><option value="all">Todas as O.S.</option><option value="entry">Em lançamento</option><option value="awaiting_signature">Aguardando assinatura da Ficha</option><option value="pending_approval">Aguardando aprovação da Ficha</option><option value="approved">Ficha aprovada</option><option value="operational">Operacional em andamento</option><option value="closed">Concluídas</option></select></div></div><div className="overflow-x-auto"><table className="min-w-[1050px]"><thead><tr><th>Número</th><th>Tipo</th><th>Equipamento</th><th>Abertura</th><th>Manutenção</th><th>Centro de custo</th><th>Status da O.S.</th><th>Ações</th></tr></thead><tbody>{visibleOrders.length ? visibleOrders.map((row) => { const workflow = orderWorkflowStatus(row); return <tr key={row.id}><td className="font-semibold">{row.orderNumber}</td><td><Badge tone={row.orderKind === "daily_maintenance" ? "blue" : "amber"}>{row.orderKind === "daily_maintenance" ? "Operacional" : "Compras e serviços"}</Badge></td><td><div className="font-semibold">ID {row.fleetNumber}</div><div className="text-xs text-slate-500">{row.plate || "Sem placa"}</div></td><td>{row.startedAt}</td><td>{row.maintenanceType}</td><td>{row.costCenter || "—"}</td><td><Badge tone={maintenanceStatusTone(row.maintenanceStatus)}>{row.maintenanceStatus || workflow.label}</Badge><div className="mt-1 text-xs text-slate-500">Fluxo: {workflow.label}</div></td><td><div className="flex flex-wrap gap-2"><button onClick={() => openOrder(row)} className="row-action">{row.status === "closed" ? "Visualizar" : "Abrir"}</button>{row.status === "closed" && <ReopenRequestButton companyId={companyId} module="maintenance" entityType="maintenance_order" entityId={row.id} label={`O.S. ${row.orderNumber}`} snapshot={row} onSent={setMessage}/>}<DeletionRequestButton companyId={companyId} module="maintenance" entityType="maintenance_order" entityId={row.id} label={`O.S. ${row.orderNumber}`} snapshot={row} onSent={setMessage}/></div></td></tr>; }) : <tr><td colSpan={8} className="py-10 text-center text-slate-500">Nenhuma O.S. encontrada para este filtro.</td></tr>}</tbody></table></div></>}
        {message && <div className="border-t border-slate-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-900">{message}</div>}
      </section>
      <aside className="space-y-4"><div className="panel p-5"><h3 className="font-bold">Fluxo obrigatório</h3><div className="mt-4 space-y-3"><Progress label="1. Solicitação e orçamento" value="Conferir"/><Progress label="2. Ficha aprovada" value="Obrigatória"/><Progress label="3. O.S. e execução" value="Registrar"/><Progress label="4. Pagamento" value="Empresa ou locador"/><Progress label="5. Apropriação" value="Após concluir"/></div></div><div className="rounded-2xl bg-[#0b1930] p-5 text-white"><h3 className="font-bold">Regra financeira</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">Pagamento direto pela empresa exige Nota Fiscal vinculada à O.S. Pagamento pelo locador entra como reembolso somente depois da conferência e conclusão.</p></div></aside>
    </div>
  </div>;
}

function MaintenancePageLegacy({ setModal }: { setModal: (s: string) => void }) {
  const [orderKind, setOrderKind] = useState<"daily" | "purchase">("purchase");
  const [tab, setTab] = useState<"order" | "items">("order");
  const [closed, setClosed] = useState(false);
  const [originOrder, setOriginOrder] = useState("OS-MEC-02601");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([
    { id: "1", type: "Peça", name: "FILTRO AR APE7590", quantity: 1, unit: 250, invoice: "2580", supplier: "ACN ROBERTO", payment: "PowerChina", category: "Preventiva" },
  ]);
  const [item, setItem] = useState({ type: "Peça", name: "", quantity: 1, unit: 0, invoice: "", supplier: "", payment: "PowerChina", category: "Preventiva" });
  const total = items.reduce((sum, current) => sum + current.quantity * current.unit, 0);
  function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (!item.name || item.quantity <= 0) return setMessage("Informe a peça ou serviço e a quantidade.");
    setItems((current) => [...current, { ...item, id: crypto.randomUUID() }]);
    setItem((current) => ({ ...current, name: "", quantity: 1, unit: 0, invoice: "" }));
    setMessage("Item incluído na O.S. A apropriação será atualizada somente após a conclusão.");
  }
  function finish() {
    if (!items.length) return setMessage("Inclua pelo menos uma peça ou serviço antes de concluir.");
    setClosed(true);
    setMessage("O.S. concluída. Peças e serviços enviados para a apropriação.");
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <button onClick={() => setOrderKind("daily")} className={orderKind === "daily" ? "btn-primary" : "btn-secondary"}><Wrench size={17}/>O.S. Mecânica diária</button>
        <button onClick={() => setOrderKind("purchase")} className={orderKind === "purchase" ? "btn-primary" : "btn-secondary"}><FileText size={17}/>O.S. Compra e serviços</button>
      </div>
      {orderKind === "daily" ? <DailyMaintenanceOrder setModal={setModal}/> : <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <button onClick={() => setTab("order")} className={tab === "order" ? "btn-primary" : "btn-secondary"}>Ordem de serviço</button>
          <button onClick={() => setTab("items")} className={tab === "items" ? "btn-primary" : "btn-secondary"}>Peças e serviços</button>
          <div className="ml-auto text-right"><div className="text-xs text-slate-500">Total da O.S.</div><div className="text-lg font-bold">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
        </div>
        {tab === "order" ? <div className="p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <MaintenanceInfo label="Número" value="OS-26005"/><MaintenanceInfo label="Data de emissão" value="24/09/2026"/><MaintenanceInfo label="Requisitante" value="Adaildo da Silva"/><MaintenanceInfo label="Elaborador" value="Júlia"/>
            <MaintenanceInfo label="Equipamento" value="001 - QWJ-9994"/><MaintenanceInfo label="Marca" value="VW Amarok"/><MaintenanceInfo label="Tipo" value="Pick-up 4x4"/><MaintenanceInfo label="Requisição" value="052311"/>
            <MaintenanceInfo label="Tipo de manutenção" value="Preventiva"/><MaintenanceInfo label="Local" value="Terceirizado"/><MaintenanceInfo label="Centro de custos" value="Canto do Buriti"/><MaintenanceInfo label="Tipo de serviço" value="Preventiva"/>
            <MaintenanceInfo label="KM atual" value="123.456"/><MaintenanceInfo label="Horímetro" value="—"/><MaintenanceInfo label="Status" value={closed ? "Concluída" : "Aberta"}/><MaintenanceInfo label="Data de encerramento" value={closed ? "24/09/2026" : "—"}/>
          </div>
          <div className="mt-4 grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-[1fr_2fr]">
            <FuelField label="O.S. operacional de origem">
              <select disabled={closed} className="input mt-1 bg-white" value={originOrder} onChange={(e) => setOriginOrder(e.target.value)}>
                <option value="">Abertura direta — sem O.S. operacional</option>
                <option value="OS-MEC-02601">OS-MEC-02601 — Frota 208 — Motor</option>
                <option value="OS-MEC-02598">OS-MEC-02598 — Frota 208 — Sistema elétrico</option>
              </select>
            </FuelField>

            <div className="self-end pb-2 text-sm text-blue-800">{originOrder ? <>Vinculada à manutenção <strong>{originOrder}</strong>. Os custos seguem para a apropriação, mas a situação operacional continua controlada pela O.S. mecânica.</> : <>Compra ou serviço direto, sem alterar a situação operacional do equipamento.</>}</div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase text-slate-500">Observação</div><p className="mt-1 text-sm">Revisão preventiva e substituição de filtros.</p></div>
          <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setTab("items")} className="btn-primary">Adicionar peças e serviços</button><button onClick={() => setModal("nova o.s.")} className="btn-secondary"><Plus size={17}/>Nova O.S.</button></div>
        </div> : <div>
          <form onSubmit={addItem} className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <FuelField label="Tipo"><select disabled={closed} className="input mt-1" value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}><option>Peça</option><option>Serviço</option></select></FuelField>

            <FuelField label="Produto / serviço"><input disabled={closed} className="input mt-1" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Selecione ou descreva"/></FuelField>

            <FuelField label="Quantidade"><input disabled={closed} type="number" min="0.001" step="0.001" className="input mt-1" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: Number(e.target.value) })}/></FuelField>

            <FuelField label="Preço unitário"><input disabled={closed} type="number" min="0" step="0.01" className="input mt-1" value={item.unit} onChange={(e) => setItem({ ...item, unit: Number(e.target.value) })}/></FuelField>

            <FuelField label="Nota fiscal"><input disabled={closed} className="input mt-1" value={item.invoice} onChange={(e) => setItem({ ...item, invoice: e.target.value })}/></FuelField>

            <FuelField label="Fornecedor"><input disabled={closed} className="input mt-1" value={item.supplier} onChange={(e) => setItem({ ...item, supplier: e.target.value })}/></FuelField>

            <FuelField label="Pagamento"><select disabled={closed} className="input mt-1" value={item.payment} onChange={(e) => setItem({ ...item, payment: e.target.value })}><option>PowerChina</option><option>Locador</option></select></FuelField>

            <FuelField label="Classe / categoria"><select disabled={closed} className="input mt-1" value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}><option>Preventiva</option><option>Corretiva</option><option>Avaria</option><option>Borracharia</option><option>Lava-jato</option><option>Lubrificação</option></select></FuelField>

            <div className="md:col-span-4"><button disabled={closed} className="btn-primary"><Plus size={17}/>Incluir item</button></div>
          </form>
          <div className="overflow-x-auto"><table className="min-w-[950px]"><thead><tr><th>Produto / serviço</th><th>Tipo</th><th>Qtde.</th><th>Preço unit.</th><th>Total</th><th>NF</th><th>Fornecedor</th><th>Pagamento</th><th>Destino na apropriação</th></tr></thead><tbody>{items.map((row) => <tr key={row.id}><td className="font-semibold">{row.name}</td><td>{row.type}</td><td>{row.quantity}</td><td>{row.unit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="font-semibold">{(row.quantity * row.unit).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{row.invoice || "—"}</td><td>{row.supplier || "—"}</td><td>{row.payment}</td><td><Badge tone={row.payment === "Locador" ? "amber" : "blue"}>{row.payment === "Locador" ? "Reembolso de avarias" : row.category}</Badge></td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4"><span className="text-sm text-slate-500">Itens da O.S. aberta não entram na apropriação.</span><button disabled={closed} onClick={finish} className="btn-primary"><CheckCircle2 size={17}/>{closed ? "O.S. concluída" : "Concluir O.S. e alimentar apropriação"}</button></div>
        </div>}
        {message && <div className="border-t border-slate-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      </section>
      <aside className="space-y-4"><div className="panel p-5"><h3 className="font-bold">Fluxo financeiro</h3><div className="mt-4 space-y-3"><Progress label="Origem operacional" value={originOrder || "Abertura direta"}/><Progress label="Peças e serviços" value={`${items.length} item(ns)`}/><Progress label="Valor total" value={total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/><Progress label="Apropriação" value={closed ? "Alimentada" : "Aguardando conclusão"}/></div></div><div className="rounded-2xl bg-[#0b1930] p-5 text-white"><h3 className="font-bold">Regra do locador</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">Quando o pagamento estiver como Locador, o valor será lançado automaticamente em Reembolso de avarias após a conclusão da O.S.</p></div></aside>
    </div>}
    </div>
  );
}

function DailyMaintenanceOrder({ setModal }: { setModal: (s: string) => void }) {
  const [closed, setClosed] = useState(false);
  return <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
    <section className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">O.S. Mecânica diária</h3><p className="text-sm text-slate-500">Registro operacional aberto pelos mecânicos.</p></div><Badge tone={closed ? "green" : "amber"}>{closed ? "Concluída" : "Em andamento"}</Badge></div>
      <div className="mt-5 grid gap-4 md:grid-cols-4"><MaintenanceInfo label="Número" value="OS-MEC-02601"/><MaintenanceInfo label="Data de abertura" value="24/09/2026"/><MaintenanceInfo label="Mecânico" value="Carlos Souza"/><MaintenanceInfo label="Requisitante" value="Supervisor Transporte"/><MaintenanceInfo label="Equipamento" value="208 - PDS-4E66"/><MaintenanceInfo label="KM atual" value="55.204"/><MaintenanceInfo label="Horímetro" value="1.848"/><MaintenanceInfo label="Local" value="Oficina do canteiro"/><MaintenanceInfo label="Tipo" value="Corretiva"/><MaintenanceInfo label="Sistema" value="Motor"/><MaintenanceInfo label="Centro de custos" value="Canto do Buriti"/><MaintenanceInfo label="Situação" value={closed ? "Liberado" : "Em manutenção"}/></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase text-slate-400">Defeito informado</div><p className="mt-2 text-sm">Perda de potência e ruído no motor.</p></div><div className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-semibold uppercase text-slate-400">Serviço executado</div><p className="mt-2 text-sm">Diagnóstico, reaperto e teste operacional.</p></div></div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={closed} onClick={() => setClosed(true)} className="btn-primary"><CheckCircle2 size={17}/>{closed ? "Equipamento liberado" : "Concluir serviço e liberar equipamento"}</button><button onClick={() => setModal("nova o.s.")} className="btn-secondary"><Plus size={17}/>Nova O.S. diária</button></div>
    </section>
    <aside className="space-y-4"><div className="panel p-5"><h3 className="font-bold">Integração operacional</h3><div className="mt-4 space-y-3"><Progress label="Histórico do equipamento" value="Atualizado"/><Progress label="Parte diária" value={closed ? "Período encerrado" : "Status M"}/><Progress label="Dias parados" value={closed ? "Calculados" : "Em contagem"}/><Progress label="Apropriação financeira" value="Sem valor direto"/></div></div><div className="rounded-2xl bg-blue-700 p-5 text-white"><h3 className="font-bold">Quando houver compra</h3><p className="mt-2 text-sm leading-relaxed text-blue-100">Peças compradas ou serviços terceirizados devem ser registrados na O.S. Compra e serviços, vinculada a esta manutenção.</p></div></aside>
  </div>;
}

function MaintenanceInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><div className="text-xs font-semibold uppercase text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}
function Contracts({ query, setQuery, setModal: _setModal }: { query: string; setQuery: (s: string) => void; contracts: any[]; setModal: (s: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<any[]>([]), [detail, setDetail] = useState<any | null>(null), [equipmentOptions, setEquipmentOptions] = useState<any[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]), [activeTab, setActiveTab] = useState("Contratos"), [showCreate, setShowCreate] = useState(false), [documentType, setDocumentType] = useState("Contrato original");
  const [createDraft, setCreateDraft] = useState<any>({ number: "", object: "", contractType: "Locação sem mão de obra", documentKind: "initial", parentContractId: "", amendmentNumber: 0, supplierId: "", projectName: "", startsAt: "", endsAt: "", equipmentId: "", monthlyEquipment: "", monthlyOperator: "", mobilization: "", demobilization: "" });
  const [message, setMessage] = useState(""), [adding, setAdding] = useState(false), [saving, setSaving] = useState(false);
  const [editingContract, setEditingContract] = useState(false), [contractDraft, setContractDraft] = useState<any>({});
  const [editingItemId, setEditingItemId] = useState(""), [itemDraft, setItemDraft] = useState<any>({});
  const emptyItem = { equipmentId: "", startsAt: "", endsAt: "", billingMode: "Mensal", monthlyEquipment: 0, monthlyOperator: 0, mobilization: 0, demobilization: 0, quantity: 1, status: "mobilized" };
  const [item, setItem] = useState<any>(emptyItem);
  async function load(id = companyId) { if (!id) return; const [response, optionsResponse] = await Promise.all([fetch(`/api/contracts?companyId=${encodeURIComponent(id)}`), fetch(`/api/contracts?companyId=${encodeURIComponent(id)}&options=1`)]), data = await response.json(), options = await optionsResponse.json(); if (response.ok) setRows(data.contracts || []); else setMessage(data.error || "Não foi possível carregar os contratos."); if (optionsResponse.ok) { setEquipmentOptions(options.equipment || []); setSupplierOptions((options.suppliers || []).filter((row: any) => row.id && row.name && Object.prototype.hasOwnProperty.call(row, "tradeName"))); } }
  async function createContract(event: React.FormEvent) {
    event.preventDefault();
    const parent = createDraft.documentKind === "amendment" ? rows.find((row: any) => row.id === createDraft.parentContractId) : null;   const supplier = supplierOptions.find((row: any) => row.id === (parent?.supplierId || createDraft.supplierId));
    if (createDraft.documentKind === "amendment" && !parent) return setMessage("Selecione o contrato inicial para este aditivo.");   if (!supplier && !parent?.supplierName) return setMessage("Selecione uma locadora/fornecedora cadastrada.");
    if (!createDraft.equipmentId) return setMessage("Selecione o equipamento já cadastrado na Frota.");
    setSaving(true); setMessage("");
    const normalizedType = /com.*(mão|operador)/i.test(String(parent?.contractType || createDraft.contractType)) ? "Locação com mão de obra" : "Locação sem mão de obra";
    const response = await offlineRequest("/api/contracts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      companyId, number: createDraft.number, object: createDraft.object, contractType: normalizedType,
      documentKind: createDraft.documentKind, parentContractId: parent?.id || undefined, amendmentNumber: createDraft.amendmentNumber,
      supplierId: supplier?.id || parent?.supplierId || undefined, supplierName: supplier?.name || parent?.supplierName || "", projectName: createDraft.projectName,
      startsAt: createDraft.startsAt, endsAt: createDraft.endsAt,
      items: [{ equipmentId: createDraft.equipmentId, startsAt: createDraft.startsAt, endsAt: createDraft.endsAt,
        monthlyEquipment: Number(createDraft.monthlyEquipment || 0),
        monthlyOperator: normalizedType === "Locação com mão de obra" ? Number(createDraft.monthlyOperator || 0) : 0,
        mobilization: Number(createDraft.mobilization || 0), demobilization: Number(createDraft.demobilization || 0), quantity: 1, billingMode: "Mensal" }]
    }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível cadastrar o contrato.");
    setShowCreate(false);
    setCreateDraft({ number: "", object: "", contractType: "Locação sem mão de obra", documentKind: "initial", parentContractId: "", amendmentNumber: 0, supplierId: "", projectName: "", startsAt: "", endsAt: "", equipmentId: "", monthlyEquipment: "", monthlyOperator: "", mobilization: "", demobilization: "" });
    await load(companyId); setMessage("Contrato cadastrado; valores e período individual já podem alimentar a Apropriação.");
  }  async function uploadContractDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!detail) return;
    const formElement = event.currentTarget, form = new FormData(formElement);
    form.set("companyId", companyId); form.set("contractId", detail.contract.id); form.set("documentType", documentType);
    setSaving(true); setMessage("");
    const response = await fetch("/api/contract-documents", { method: "POST", body: form });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível anexar o documento.");
    await openContract(detail.contract.id); setMessage("Documento anexado ao contrato. O histórico permanece vinculado.");
  }  async function openContract(contractId: string) { const response = await fetch(`/api/contracts?companyId=${encodeURIComponent(companyId)}&contractId=${encodeURIComponent(contractId)}`), data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível abrir o contrato."); setDetail(data); setAdding(false); setEditingContract(false); setEditingItemId(""); setItem(emptyItem); setMessage(""); }
  async function addEquipment(event: React.FormEvent) { event.preventDefault(); if (!detail) return; setSaving(true); setMessage(""); const response = await offlineRequest("/api/contracts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, contractId: detail.contract.id, action: "add_equipment", item }) }), data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível adicionar o equipamento."); setAdding(false); setItem(emptyItem); await openContract(detail.contract.id); await load(companyId); setMessage("Equipamento adicionado ao contrato. O histórico das medições foi preservado."); }
  function startContractEdit() { setContractDraft({ number: detail.contract.number, object: detail.contract.object, supplierName: detail.contract.supplierName || "", projectName: detail.contract.projectName || "", status: detail.contract.status || "active" }); setEditingContract(true); }
  async function saveContract(event: React.FormEvent) { event.preventDefault(); setSaving(true); const response = await offlineRequest("/api/contracts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, contractId: detail.contract.id, action: "update_contract", contract: contractDraft }) }), data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível alterar o contrato."); await openContract(detail.contract.id); await load(companyId); setMessage("Contrato alterado. A movimentação foi registrada no histórico."); }
  function startItemEdit(row: any) { setItemDraft({ startsAt: row.startsAt, endsAt: row.endsAt, billingMode: row.billingMode, monthlyEquipment: Number(row.monthlyEquipmentCents || 0) / 100, monthlyOperator: Number(row.monthlyOperatorCents || 0) / 100, mobilization: Number(row.mobilizationCents || 0) / 100, demobilization: Number(row.demobilizationCents || 0) / 100, quantity: Number(row.quantityMilli || 1000) / 1000, status: row.status }); setEditingItemId(row.id); }
  async function saveItem(event: React.FormEvent) { event.preventDefault(); setSaving(true); const response = await offlineRequest("/api/contracts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, contractId: detail.contract.id, action: "update_equipment", itemId: editingItemId, item: itemDraft }) }), data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível alterar o equipamento."); await openContract(detail.contract.id); await load(companyId); setMessage("Dados do equipamento alterados. A movimentação foi registrada no histórico."); }
  function printContractAnnex() {
    if (!detail) return;
    const contract = detail.contract;
    const equipmentRows = (detail.items || []).map((row: any, index: number) => `<tr><td>${index + 1}</td><td>${row.fleetNumber || "—"}</td><td>${row.plate || "—"}</td><td>${row.description || "—"}<br><small>${[row.brand, row.model].filter(Boolean).join(" / ")}</small></td><td>${row.startsAt.split("-").reverse().join("/")} a ${row.endsAt.split("-").reverse().join("/")}</td><td>${row.billingMode}</td><td>${money(row.monthlyEquipmentCents)}</td><td>${money(row.monthlyOperatorCents)}</td><td>${money(row.mobilizationCents)}</td><td>${money(row.demobilizationCents)}</td></tr>`).join("");
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return setMessage("O navegador bloqueou a impressão. Permita pop-ups para imprimir o Anexo do Contrato.");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Anexo do Contrato ${contract.number}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;font-size:11px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #ed1c24;padding-bottom:10px;margin-bottom:14px}h1{font-size:20px;margin:0;color:#0b1930}.logo{font-weight:900;color:#ed1c24;font-size:18px}.info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.box{border:1px solid #b8c2d0;padding:8px;min-height:42px}.label{font-size:9px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:4px}table{width:100%;border-collapse:collapse}th{background:#0b1930;color:white;font-size:9px;padding:7px;border:1px solid #536176}td{padding:7px;border:1px solid #aab3c0;vertical-align:top}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:55px;text-align:center}.line{border-top:1px solid #111;padding-top:7px}.footer{margin-top:20px;color:#64748b;font-size:9px;text-align:center}</style></head><body><header><div><h1>ANEXO DO CONTRATO / 合同附件</h1><div>Relação de equipamentos vinculados / 关联设备清单</div></div><div class="logo">POWERCHINA</div></header><section class="info"><div class="box"><div class="label">Contrato / 合同</div><strong>${contract.number}</strong></div><div class="box"><div class="label">Locador / 出租方</div><strong>${contract.supplierName || "—"}</strong></div><div class="box"><div class="label">Obra / 项目</div><strong>${contract.projectName || "—"}</strong></div><div class="box"><div class="label">Vigência / 有效期</div><strong>${contract.startsAt.split("-").reverse().join("/")} a ${contract.endsAt.split("-").reverse().join("/")}</strong></div><div class="box" style="grid-column:span 2"><div class="label">Objeto / 合同标的</div><strong>${contract.object}</strong></div><div class="box"><div class="label">Valor total / 总金额</div><strong>${money(contract.totalCents)}</strong></div><div class="box"><div class="label">Valor mensal / 月金额</div><strong>${money(contract.monthlyAmountCents)}</strong></div></section><table><thead><tr><th>ITEM</th><th>ID</th><th>PLACA<br>车牌</th><th>EQUIPAMENTO<br>设备</th><th>PERÍODO<br>期间</th><th>MODALIDADE<br>方式</th><th>VALOR EQUIP.<br>设备金额</th><th>OPERADOR<br>操作员</th><th>MOBILIZAÇÃO<br>进场</th><th>DESMOBILIZAÇÃO<br>退场</th></tr></thead><tbody>${equipmentRows || '<tr><td colspan="10" style="text-align:center">Nenhum equipamento vinculado.</td></tr>'}</tbody></table><div class="signatures"><div class="line">CONTRATANTE / 承租方</div><div class="line">LOCADOR / 出租方</div></div><div class="footer">Anexo emitido pelo sistema Frota One em ${new Date().toLocaleDateString("pt-BR")}</div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
    popup.document.close();
  }
  function printContractAnnexModel() {
    if (!detail) return;
    const contract = detail.contract;
    const fmt = (cents = 0) => (Number(cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const months = countContractMonthsInclusive;
    const equipmentRows = (detail.items || []).map((row: any, index: number) => { const qty = months(row.startsAt, row.endsAt), mob = Number(row.mobilizationCents || 0), demob = Number(row.demobilizationCents || 0), monthly = Number(row.monthlyEquipmentCents || 0), operator = Number(row.monthlyOperatorCents || 0), subtotal = monthly * qty, contractTotal = subtotal + mob + demob + operator * qty; return `<tr><td>${index + 1}</td><td class="desc">${row.plate || "—"} - ${row.description || "—"}${[row.brand,row.model].filter(Boolean).length ? ` - ${[row.brand,row.model].filter(Boolean).join(" / ")}` : ""}</td><td>${row.billingMode}</td><td>${row.startsAt.split("-").reverse().join("/")}</td><td>${row.endsAt.split("-").reverse().join("/")}</td><td>${mob ? "1,00" : ""}</td><td>${mob ? fmt(mob) : ""}</td><td>${mob ? fmt(mob) : ""}</td><td>${demob ? "1,00" : ""}</td><td>${demob ? fmt(demob) : ""}</td><td>${demob ? fmt(demob) : ""}</td><td>${fmt(mob + demob)}</td><td>${qty.toFixed(2).replace(".",",")}</td><td>${fmt(operator)}</td><td>${fmt(monthly)}</td><td>${fmt(subtotal)}</td><td>${fmt(contractTotal)}</td><td></td><td></td><td></td><td></td><td>${qty.toFixed(2).replace(".",",")}</td><td>${fmt(monthly)}</td><td>${fmt(mob + demob)}</td><td>${fmt(contractTotal)}</td></tr>`; }).join("");
    const isWithOperator = (detail.items || []).some((row: any) => Number(row.monthlyOperatorCents || 0) > 0);
    const totalMob = (detail.items || []).reduce((s: number, r: any) => s + Number(r.mobilizationCents || 0), 0), totalDemob = (detail.items || []).reduce((s: number, r: any) => s + Number(r.demobilizationCents || 0), 0), totalContract = (detail.items || []).reduce((s: number, r: any) => { const q = months(r.startsAt,r.endsAt); return s + (Number(r.monthlyEquipmentCents || 0) + Number(r.monthlyOperatorCents || 0)) * q + Number(r.mobilizationCents || 0) + Number(r.demobilizationCents || 0); }, 0);
    const popup = window.open("", "_blank", "width=1400,height=900");
    if (!popup) return setMessage("O navegador bloqueou a impressão. Permita pop-ups para imprimir o Anexo I.");
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Anexo I - ${contract.number}</title><style>@page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:7px}header{height:64px;border-top:1px solid #111;border-bottom:3px double #111;display:grid;grid-template-columns:180px 1fr 120px;align-items:center}header img{width:145px;max-height:55px;object-fit:contain}h1{font-size:16px;font-weight:500;text-align:center;line-height:1.25;margin:0}.ct{text-align:right;font-size:13px;font-weight:bold;padding-right:8px}.type{display:grid;grid-template-columns:180px 1fr 40px 2.7fr;border-bottom:1px solid #111;min-height:54px;align-items:center}.type>div{padding:5px}.type-title{text-align:center;font-size:9px;font-weight:bold}.check{border:1px solid #111;text-align:center;font-size:16px;font-weight:bold;padding:2px!important}.supplier{text-align:center;font-size:10px;font-weight:bold}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;text-align:center;padding:3px 2px;vertical-align:middle}thead th{background:#bfbfbf;font-weight:bold;line-height:1.15}thead .group{font-size:7px}tbody td{height:27px}.desc{text-align:left;color:#e11;font-weight:bold;font-size:6.5px;line-height:1.15}tfoot td{background:#d9e2f3;font-weight:bold;font-size:8px;height:25px}.w-item{width:3.2%}.w-desc{width:13.2%}.w-mode{width:5%}.w-date{width:5%}.notes{margin-top:8px;border:1px solid #777;min-height:38px;padding:5px;font-size:8px}.global{margin-left:auto;margin-top:8px;width:310px;border:1px solid #333;display:grid;grid-template-columns:2fr 1fr;font-size:10px;font-weight:bold}.global div{padding:7px;border-right:1px solid #333;text-align:center}.global div:last-child{border:0}@media print{button{display:none}}</style></head><body><header><img src="${location.origin}/assets/powerchina-logo-000.jpg"><h1>Anexo I - Contrato ${contract.number}<br>Planilha de Quantidades e Preços 数量和价格电子表格</h1><div class="ct">Nº CT<br>${contract.number}</div></header><section class="type"><div class="type-title">1. TIPO DE CONTRATO :</div><div>LOCAÇÃO DE EQUIPAMENTO SEM OPERADOR<br>无操作员的设备租赁<br><br>LOCAÇÃO DE EQUIPAMENTO COM OPERADOR<br>带操作员的设备租赁</div><div><div class="check">${isWithOperator ? "" : "X"}</div><div class="check" style="margin-top:6px">${isWithOperator ? "X" : ""}</div></div><div class="supplier">${contract.supplierName || "—"}</div></section><table><thead><tr><th rowspan="2" class="w-item">Item</th><th rowspan="2" class="w-desc">Descrição 描述</th><th rowspan="2" class="w-mode">Modalidade de cobrança</th><th colspan="2">Período 时期</th><th colspan="3">Mobilização 动员</th><th colspan="3">Desmobilização 复员</th><th rowspan="2">Total Geral<br>累计:</th><th colspan="5" class="group">CONTRATO</th><th colspan="4" class="group">ADITIVO I</th><th colspan="4" class="group">TOTAL GERAL 累计</th></tr><tr><th class="w-date">Data Início<br>开始日期</th><th class="w-date">Data de Término<br>结束日期</th><th>Quant.<br>数量</th><th>Valor Unitário<br>单位价值</th><th>Total<br>全部的</th><th>Quant.<br>数量</th><th>Valor Unitário<br>单位价值</th><th>Total<br>全部的</th><th>Tempo de Contrato<br>合同期 QUANT.</th><th>Valor Operador</th><th>Valor Unitário<br>单位价值</th><th>Sub-Total<br>全部的</th><th>Total Geral<br>全部的</th><th>Tempo Aditivo<br>添加时间 QUANT.</th><th>Valor Unitário<br>单位价值</th><th>Sub-Total<br>全部的</th><th>Total Geral<br>全部的</th><th>Quant. Total<br>数量</th><th>Valor Unitário<br>单位价值</th><th>Valor Un+mob/desmob</th><th>Total<br>全部的</th></tr></thead><tbody>${equipmentRows || '<tr><td colspan="25">Nenhum equipamento vinculado.</td></tr>'}</tbody><tfoot><tr><td colspan="5">TOTAL GERAL 累计:</td><td></td><td></td><td>${fmt(totalMob)}</td><td></td><td></td><td>${fmt(totalDemob)}</td><td></td><td colspan="5">R$ ${fmt(totalContract)}</td><td colspan="4">R$ -</td><td colspan="4">R$ ${fmt(totalContract)}</td></tr></tfoot></table><div class="notes"><strong>Observações / 备注:</strong><br>${contract.object || ""}</div><div class="global"><div>VALOR TOTAL GLOBAL : R$</div><div>R$ ${fmt(totalContract)}</div></div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    popup.document.close();
  }
  async function exportAnexoExcel() {
    if (!detail) return;
    setSaving(true); setMessage("");
    try {
      const templateResponse = await fetch("/templates/anexo-i-modelo.xlsx");
      if (!templateResponse.ok) throw new Error("Não foi possível abrir o modelo oficial do Anexo I.");
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await templateResponse.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("O modelo do Anexo I não contém uma planilha.");
      const sourceItems = detail.items || [];
      const extraRows = Math.max(0, sourceItems.length - 37);
      if (extraRows) {
        worksheet.spliceRows(50, 0, ...Array.from({ length: extraRows }, () => []));
        const styleSource = worksheet.getRow(49);
        for (let r = 50; r < 50 + extraRows; r++) {
          const row = worksheet.getRow(r); row.height = styleSource.height;
          for (let c = 1; c <= 25; c++) row.getCell(c).style = JSON.parse(JSON.stringify(styleSource.getCell(c).style));
        }
      }
      const totalRow = 50 + extraRows;
      const dataEnd = 12 + sourceItems.length;
      for (let r = 13; r < totalRow; r++) for (let c = 1; c <= 25; c++) worksheet.getRow(r).getCell(c).value = null;
      worksheet.getCell("A3").value = "Anexo I - " + (detail.contract.documentKind === "amendment" ? "Aditivo" : "Contrato") + " " + detail.contract.number + "
Planilha de Quantidades e Preços";
      worksheet.getCell("Y3").value = detail.contract.number;
      worksheet.getCell("M7").value = detail.contract.supplierName || "";
      const withLabor = sourceItems.some((row: any) => Number(row.monthlyOperatorCents || 0) > 0);
      worksheet.getCell("F7").value = withLabor ? "" : "X";
      worksheet.getCell("F9").value = withLabor ? "X" : "";
      const excelDate = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
      sourceItems.forEach((item: any, index: number) => {
        const r = 13 + index;
        const months = countContractMonthsInclusive(item.startsAt, item.endsAt);
        const equipmentRate = Number(item.monthlyEquipmentCents || 0) / 100;
        const operatorRate = Number(item.monthlyOperatorCents || 0) / 100;
        const mobilization = Number(item.mobilizationCents || 0) / 100;
        const demobilization = Number(item.demobilizationCents || 0) / 100;
        const amendment = detail.contract.documentKind === "amendment";
        const set = (col: number, value: unknown) => { worksheet.getRow(r).getCell(col).value = value as any; };
        set(1, index + 1);
        set(2, [item.plate, item.description, item.brand, item.model, item.manufactureYear].filter(Boolean).join(" - "));
        set(3, item.billingMode || "Mensal"); set(4, excelDate(item.startsAt)); set(5, excelDate(item.endsAt));
        set(6, mobilization ? 1 : 0); set(7, mobilization); set(8, { formula: "F" + r + "*G" + r });
        set(9, demobilization ? 1 : 0); set(10, demobilization); set(11, { formula: "I" + r + "*J" + r });
        set(12, { formula: "H" + r + "+K" + r });
        if (amendment) {
          set(18, months); set(19, equipmentRate + operatorRate); set(20, { formula: "R" + r + "*S" + r }); set(21, { formula: "T" + r + "+L" + r });
        } else {
          set(13, months); set(14, operatorRate); set(15, equipmentRate); set(16, { formula: "M" + r + "*O" + r });
          set(17, { formula: "P" + r + "+M" + r + "*N" + r + "+L" + r });
        }
        set(22, months); set(23, equipmentRate + operatorRate); set(24, { formula: "L" + r });
        set(25, { formula: "V" + r + "*W" + r + "+X" + r });
      });
      const lastData = Math.max(13, dataEnd);
      for (const col of ["H", "K", "Y"]) worksheet.getCell(col + totalRow).value = { formula: "SUM(" + col + "13:" + col + lastData + ")" };
      worksheet.getCell("Q" + totalRow).value = detail.contract.documentKind === "amendment" ? null : { formula: "SUM(Q13:Q" + lastData + ")" };
      worksheet.getCell("U" + totalRow).value = detail.contract.documentKind === "amendment" ? { formula: "SUM(U13:U" + lastData + ")" } : null;
      worksheet.getCell("Y" + (totalRow + 2)).value = { formula: "Y" + totalRow };
      const bytes = await workbook.xlsx.writeBuffer();
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = "Anexo_I_" + String(detail.contract.number).replace(/[^A-Za-z0-9_-]/g, "_") + ".xlsx";
      link.click(); URL.revokeObjectURL(url);
      setMessage("Anexo I Excel gerado para conferência. A emissão não altera o saldo oficial do contrato.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o Anexo I Excel.");
    } finally { setSaving(false); }
  }  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const list = data.companies || []; setCompanies(list); if (list[0]) { setCompanyId(list[0].id); load(list[0].id); } }); }, []);
  const filtered = rows.filter((row) => `${row.number} ${row.object} ${row.supplierName || ""}`.toLowerCase().includes(query.toLowerCase()));
  const money = (cents = 0) => (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const in30Date = new Date(today); in30Date.setDate(in30Date.getDate() + 30);
  const in30 = in30Date.toISOString().slice(0, 10);
  const activeCount = rows.filter((row) => row.documentKind !== "amendment" && row.status !== "closed" && row.status !== "cancelled" && row.endsAt >= isoToday).length;
  const dueCount = rows.filter((row) => row.status !== "closed" && row.status !== "cancelled" && row.endsAt >= isoToday && row.endsAt <= in30).length;
  const overdueCount = rows.filter((row) => row.status !== "closed" && row.status !== "cancelled" && row.endsAt < isoToday).length;
  const totalContractCents = rows.reduce((sum, row) => sum + Number(row.totalCents || 0), 0);
  const totalMeasuredCents = rows.reduce((sum, row) => sum + Number(row.measuredCents || 0), 0);
  const totalBalanceCents = rows.reduce((sum, row) => sum + Number(row.balanceCents || 0), 0);
  const tabRows = filtered.filter((row) => activeTab === "Aditivos" ? row.documentKind === "amendment" : activeTab === "Contratos" ? row.documentKind !== "amendment" : true);
  if (detail) return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Contrato {detail.contract.number}</h2><p className="text-sm text-slate-500">Edição liberada a qualquer momento, com histórico de todas as movimentações.</p></div><div className="flex flex-wrap gap-2"><button onClick={printContractAnnexModel} className="btn-secondary"><Printer size={17}/>Imprimir Anexo I</button><button onClick={exportAnexoExcel} disabled={saving} className="btn-secondary"><FileSpreadsheet size={17}/>Baixar Excel</button><button onClick={startContractEdit} className="btn-primary"><Pencil size={17}/>Editar contrato</button><button onClick={() => { setDetail(null); setMessage(""); }} className="btn-secondary"><ChevronLeft size={17}/>Voltar aos contratos</button></div></div>
    {message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</div>}
    {editingContract ? <form onSubmit={saveContract} className="panel p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><FuelField label="Número"><input required className="input mt-1" value={contractDraft.number} onChange={(e) => setContractDraft({ ...contractDraft, number: e.target.value })}/></FuelField><FuelField label="Locador"><input required className="input mt-1" value={contractDraft.supplierName} onChange={(e) => setContractDraft({ ...contractDraft, supplierName: e.target.value })}/></FuelField><FuelField label="Objeto"><input required className="input mt-1" value={contractDraft.object} onChange={(e) => setContractDraft({ ...contractDraft, object: e.target.value })}/></FuelField><FuelField label="Obra"><input className="input mt-1" value={contractDraft.projectName} onChange={(e) => setContractDraft({ ...contractDraft, projectName: e.target.value })}/></FuelField><FuelField label="Status"><select className="input mt-1" value={contractDraft.status} onChange={(e) => setContractDraft({ ...contractDraft, status: e.target.value })}><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="closed">Encerrado</option></select></FuelField></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditingContract(false)} className="btn-secondary">Cancelar</button><button disabled={saving} className="btn-primary"><CheckCircle2 size={17}/>{saving ? "Salvando..." : "Salvar alterações"}</button></div></form> : <section className="panel p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><MaintenanceInfo label="Documento" value={detail.contract.documentKind === "amendment" ? `Aditivo ${detail.contract.amendmentNumber || ""}` : "Contrato inicial"}/><MaintenanceInfo label="Locador" value={detail.contract.supplierName || "—"}/><MaintenanceInfo label="Objeto" value={detail.contract.object}/><MaintenanceInfo label="Obra" value={detail.contract.projectName || "—"}/><MaintenanceInfo label="Vigência geral" value={`${detail.contract.startsAt.split("-").reverse().join("/")} a ${detail.contract.endsAt.split("-").reverse().join("/")}`}/><MaintenanceInfo label="Valor total" value={money(detail.contract.totalCents)}/><MaintenanceInfo label="Valor mensal" value={money(detail.contract.monthlyAmountCents)}/><MaintenanceInfo label="Status" value={detail.contract.status === "active" ? "Ativo" : detail.contract.status === "suspended" ? "Suspenso" : "Encerrado"}/></div></section>}
    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Equipamentos do contrato</h3><p>{detail.items.length} equipamento(s) vinculado(s)</p></div><button onClick={() => setAdding(!adding)} className="btn-primary"><Plus size={17}/>{adding ? "Fechar inclusão" : "Adicionar equipamento"}</button></div>
      {adding && <form onSubmit={addEquipment} className="grid gap-3 border-b border-slate-200 bg-blue-50 p-4 md:grid-cols-2 xl:grid-cols-5"><FuelField label="Equipamento"><select required className="input mt-1 bg-white" value={item.equipmentId} onChange={(e) => setItem({ ...item, equipmentId: e.target.value })}><option value="">Selecione ID ou placa</option>{equipmentOptions.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"} • {row.description}</option>)}</select></FuelField><FuelField label="Data de entrada"><input required type="date" className="input mt-1 bg-white" value={item.startsAt} onChange={(e) => setItem({ ...item, startsAt: e.target.value })}/></FuelField><FuelField label="Data final"><input required type="date" className="input mt-1 bg-white" value={item.endsAt} onChange={(e) => setItem({ ...item, endsAt: e.target.value })}/></FuelField><FuelField label="Valor equipamento"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={item.monthlyEquipment} onChange={(e) => setItem({ ...item, monthlyEquipment: Number(e.target.value) })}/></FuelField><FuelField label="Valor operador / mão de obra"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={item.monthlyOperator} onChange={(e) => setItem({ ...item, monthlyOperator: Number(e.target.value) })}/></FuelField><FuelField label="Modalidade"><select className="input mt-1 bg-white" value={item.billingMode} onChange={(e) => setItem({ ...item, billingMode: e.target.value })}><option>Mensal</option><option>Diária</option><option>Horímetro</option><option>Quilômetro</option></select></FuelField><FuelField label="Mobilização"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={item.mobilization} onChange={(e) => setItem({ ...item, mobilization: Number(e.target.value) })}/></FuelField><FuelField label="Desmobilização"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={item.demobilization} onChange={(e) => setItem({ ...item, demobilization: Number(e.target.value) })}/></FuelField><div className="flex items-end xl:col-span-2"><button disabled={saving} className="btn-primary w-full justify-center"><CheckCircle2 size={17}/>{saving ? "Salvando..." : "Confirmar inclusão"}</button></div></form>}
      {editingItemId && <form onSubmit={saveItem} className="grid gap-3 border-b border-slate-200 bg-amber-50 p-4 md:grid-cols-2 xl:grid-cols-5"><FuelField label="Data de entrada"><input required type="date" className="input mt-1 bg-white" value={itemDraft.startsAt} onChange={(e) => setItemDraft({ ...itemDraft, startsAt: e.target.value })}/></FuelField><FuelField label="Data final"><input required type="date" className="input mt-1 bg-white" value={itemDraft.endsAt} onChange={(e) => setItemDraft({ ...itemDraft, endsAt: e.target.value })}/></FuelField><FuelField label="Modalidade"><select className="input mt-1 bg-white" value={itemDraft.billingMode} onChange={(e) => setItemDraft({ ...itemDraft, billingMode: e.target.value })}><option>Mensal</option><option>Diária</option><option>Horímetro</option><option>Quilômetro</option></select></FuelField><FuelField label="Valor equipamento"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={itemDraft.monthlyEquipment} onChange={(e) => setItemDraft({ ...itemDraft, monthlyEquipment: Number(e.target.value) })}/></FuelField><FuelField label="Valor operador"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={itemDraft.monthlyOperator} onChange={(e) => setItemDraft({ ...itemDraft, monthlyOperator: Number(e.target.value) })}/></FuelField><FuelField label="Mobilização"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={itemDraft.mobilization} onChange={(e) => setItemDraft({ ...itemDraft, mobilization: Number(e.target.value) })}/></FuelField><FuelField label="Desmobilização"><input type="number" min="0" step="0.01" className="input mt-1 bg-white" value={itemDraft.demobilization} onChange={(e) => setItemDraft({ ...itemDraft, demobilization: Number(e.target.value) })}/></FuelField><FuelField label="Situação"><select className="input mt-1 bg-white" value={itemDraft.status} onChange={(e) => setItemDraft({ ...itemDraft, status: e.target.value })}><option value="mobilized">Mobilizado</option><option value="demobilized">Desmobilizado</option></select></FuelField><div className="flex items-end gap-2 xl:col-span-2"><button type="button" onClick={() => setEditingItemId("")} className="btn-secondary flex-1 justify-center">Cancelar</button><button disabled={saving} className="btn-primary flex-1 justify-center"><CheckCircle2 size={17}/>{saving ? "Salvando..." : "Salvar item"}</button></div></form>}
      <div className="overflow-x-auto"><table className="min-w-[1200px]"><thead><tr><th>ID / placa</th><th>Equipamento</th><th>Período individual</th><th>Modalidade</th><th>Equipamento</th><th>Operador</th><th>Mobilização</th><th>Desmobilização</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{detail.items.map((row: any) => <tr key={row.id}><td className="font-bold">{row.fleetNumber} • {row.plate || "—"}</td><td>{row.description}<div className="text-xs text-slate-500">{[row.brand, row.model].filter(Boolean).join(" / ") || row.equipmentType || "—"}</div></td><td>{row.startsAt.split("-").reverse().join("/")} a {row.endsAt.split("-").reverse().join("/")}</td><td>{row.billingMode}</td><td>{money(row.monthlyEquipmentCents)}</td><td>{money(row.monthlyOperatorCents)}</td><td>{money(row.mobilizationCents)}</td><td>{money(row.demobilizationCents)}</td><td><Badge tone={row.status === "mobilized" ? "green" : "slate"}>{row.status === "mobilized" ? "Mobilizado" : "Desmobilizado"}</Badge></td><td><button onClick={() => startItemEdit(row)} className="row-action"><Pencil size={15}/>Editar</button></td></tr>)}</tbody></table></div>
    </section>
    <section className="panel space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Documentos do contrato</h3><p className="text-sm text-slate-500">Arquivos ficam vinculados ao contrato ou aditivo selecionado.</p></div><Badge tone="blue">{detail.documents?.length || 0} documento(s)</Badge></div><form onSubmit={uploadContractDocument} className="flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Tipo<select className="input mt-1" value={documentType} onChange={(e) => setDocumentType(e.target.value)}><option>Contrato original</option><option>Aditivo</option><option>Anexo I</option><option>Termo de encerramento</option><option>Mobilização</option><option>Desmobilização</option><option>Nota fiscal</option><option>Outro</option></select></label><label className="text-sm font-semibold">Arquivo<input required name="file" type="file" accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png" className="input mt-1" /></label><button disabled={saving} className="btn-primary">{saving ? "Enviando..." : "Anexar documento"}</button></form><div className="overflow-x-auto"><table><thead><tr><th>Documento</th><th>Tipo</th><th>Enviado em</th><th>Responsável</th><th></th></tr></thead><tbody>{(detail.documents || []).map((doc: any) => <tr key={doc.id}><td className="font-semibold">{doc.fileName}</td><td>{doc.documentType}</td><td>{new Date(doc.uploadedAt).toLocaleString("pt-BR")}</td><td>{doc.uploadedBy}</td><td><a className="row-action" href={"/api/contract-documents?companyId=" + encodeURIComponent(companyId) + "&fileId=" + encodeURIComponent(doc.id)}>Baixar</a></td></tr>)}{!detail.documents?.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Nenhum documento anexado a este contrato.</td></tr>}</tbody></table></div></section>    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Histórico de movimentações</h3><p>Alterações do contrato e dos equipamentos vinculados</p></div><Badge tone="blue">{detail.history?.length || 0} registro(s)</Badge></div><div className="overflow-x-auto"><table className="min-w-[820px]"><thead><tr><th>Data e hora</th><th>Usuário</th><th>Movimentação</th></tr></thead><tbody>{(detail.history || []).map((entry: any) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString("pt-BR")}</td><td className="font-semibold">{entry.userId}</td><td className="max-w-3xl break-words text-sm">{String(entry.action).split(" | antes=")[0]}</td></tr>)}{!detail.history?.length && <tr><td colSpan={3} className="py-8 text-center text-slate-500">Nenhuma alteração registrada ainda.</td></tr>}</tbody></table></div></section>
  </div>;
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
    <button onClick={() => setActiveTab("Contratos")} className="rounded-xl bg-[#0b3b70] p-4 text-left text-white shadow-sm"><span className="text-sm font-semibold">Contratos ativos</span><strong className="mt-2 block text-3xl">{activeCount}</strong><span className="text-xs text-blue-100">Vigências atuais</span></button>
    <button onClick={() => setActiveTab("Vigências")} className="rounded-xl bg-amber-100 p-4 text-left text-amber-950 shadow-sm"><span className="text-sm font-semibold">Próximos do vencimento</span><strong className="mt-2 block text-3xl">{dueCount}</strong><span className="text-xs">Até 30 dias</span></button>
    <button onClick={() => setActiveTab("Vigências")} className="rounded-xl bg-red-600 p-4 text-left text-white shadow-sm"><span className="text-sm font-semibold">Contratos vencidos</span><strong className="mt-2 block text-3xl">{overdueCount}</strong><span className="text-xs text-red-100">Revisar situação</span></button>
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm font-semibold text-slate-700">Valor contratado</span><strong className="mt-2 block text-xl">{money(totalContractCents)}</strong></div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm font-semibold text-slate-700">Valor realizado</span><strong className="mt-2 block text-xl text-emerald-700">{money(totalMeasuredCents)}</strong></div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-sm font-semibold text-slate-700">Saldo contratual</span><strong className="mt-2 block text-xl">{money(totalBalanceCents)}</strong></div>
  </div><div className="panel flex gap-2 overflow-x-auto p-2" role="tablist">{["Contratos", "Aditivos", "Vigências", "Financeiro", "Documentos", "Histórico"].map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === tab ? "bg-blue-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>{tab}</button>)}</div>{message &&  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}{showCreate && <form onSubmit={createContract} className="panel space-y-4 p-5"><div><h3 className="text-lg font-bold text-slate-900">{createDraft.documentKind === "amendment" ? "Novo aditivo" : "Novo contrato"}</h3><p className="text-sm text-slate-500">Use os cadastros existentes da empresa e da Frota. Outros equipamentos podem ser vinculados depois, com seus próprios períodos e valores.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <label className="text-sm font-semibold">{createDraft.documentKind === "amendment" ? "Nº do aditivo" : "Nº do contrato"}<input required readOnly={createDraft.documentKind === "amendment"} className="input mt-1" value={createDraft.number} onChange={(e) => setCreateDraft({ ...createDraft, number: e.target.value })}/></label>
  <label className="text-sm font-semibold">{createDraft.documentKind === "amendment" ? "Contrato principal" : "Modalidade"}{createDraft.documentKind === "amendment" ? <select required className="input mt-1" value={createDraft.parentContractId} onChange={(e) => { const parent = rows.find((row: any) => row.id === e.target.value); const nextNo = rows.filter((row: any) => row.parentContractId === e.target.value).length + 1; setCreateDraft({ ...createDraft, parentContractId: e.target.value, amendmentNumber: nextNo, number: parent ? parent.number + "-A" + nextNo : "", contractType: parent?.contractType || createDraft.contractType }); }}><option value="">Selecione</option>{rows.filter((row: any) => row.documentKind !== "amendment").map((row: any) => <option key={row.id} value={row.id}>{row.number} · {row.supplierName} · {row.object}</option>)}</select> : <select required className="input mt-1" value={createDraft.contractType} onChange={(e) => setCreateDraft({ ...createDraft, contractType: e.target.value, monthlyOperator: "" })}><option>Locação sem mão de obra</option><option>Locação com mão de obra</option></select>}</label>
  {createDraft.documentKind !== "amendment" && <label className="text-sm font-semibold">Locadora / fornecedora<select required className="input mt-1" value={createDraft.supplierId} onChange={(e) => setCreateDraft({ ...createDraft, supplierId: e.target.value })}><option value="">Selecione</option>{supplierOptions.map((row: any) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
  <label className="text-sm font-semibold">Obra / projeto<input className="input mt-1" value={createDraft.projectName} onChange={(e) => setCreateDraft({ ...createDraft, projectName: e.target.value })}/></label>
  <label className="text-sm font-semibold sm:col-span-2">Objeto<input required className="input mt-1" value={createDraft.object} onChange={(e) => setCreateDraft({ ...createDraft, object: e.target.value })}/></label>
  <label className="text-sm font-semibold">Início da vigência<input required type="date" className="input mt-1" value={createDraft.startsAt} onChange={(e) => setCreateDraft({ ...createDraft, startsAt: e.target.value })}/></label>
  <label className="text-sm font-semibold">Fim da vigência<input required type="date" min={createDraft.startsAt || undefined} className="input mt-1" value={createDraft.endsAt} onChange={(e) => setCreateDraft({ ...createDraft, endsAt: e.target.value })}/></label>
  <label className="text-sm font-semibold sm:col-span-2">Equipamento cadastrado na Frota<select required className="input mt-1" value={createDraft.equipmentId} onChange={(e) => setCreateDraft({ ...createDraft, equipmentId: e.target.value })}><option value="">Selecione</option>{equipmentOptions.map((row: any) => <option key={row.id} value={row.id}>{row.fleetNumber} · {row.plate || row.description} · {row.description}</option>)}</select></label>
  <label className="text-sm font-semibold">Valor mensal do equipamento<input required type="number" min="0" step="0.01" className="input mt-1" value={createDraft.monthlyEquipment} onChange={(e) => setCreateDraft({ ...createDraft, monthlyEquipment: e.target.value })}/></label>
  {createDraft.contractType === "Locação com mão de obra" && <label className="text-sm font-semibold">Valor mensal do operador<input type="number" min="0" step="0.01" className="input mt-1" value={createDraft.monthlyOperator} onChange={(e) => setCreateDraft({ ...createDraft, monthlyOperator: e.target.value })}/></label>}
  <label className="text-sm font-semibold">Mobilização (uma vez)<input type="number" min="0" step="0.01" className="input mt-1" value={createDraft.mobilization} onChange={(e) => setCreateDraft({ ...createDraft, mobilization: e.target.value })}/></label>
  <label className="text-sm font-semibold">Desmobilização (uma vez)<input type="number" min="0" step="0.01" className="input mt-1" value={createDraft.demobilization} onChange={(e) => setCreateDraft({ ...createDraft, demobilization: e.target.value })}/></label>
</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button><button disabled={saving} className="btn-primary"><Plus size={16}/>{saving ? "Salvando..." : createDraft.documentKind === "amendment" ? "Cadastrar aditivo" : "Cadastrar contrato"}</button></div></form>}<section className="panel overflow-hidden"><div className="flex flex-wrap gap-3 border-b border-slate-200 p-4"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar número, locador ou objeto..." className="input pl-10"/></div><select className="input w-auto" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setDetail(null); load(e.target.value); }}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select><button onClick={() => { setCreateDraft({ ...createDraft, documentKind: "initial", parentContractId: "", amendmentNumber: 0, number: "" }); setShowCreate(!showCreate); }} className="btn-primary"><Plus size={16}/>Novo contrato</button><button onClick={() => { setCreateDraft({ ...createDraft, documentKind: "amendment", parentContractId: "", amendmentNumber: 0, number: "", supplierId: "" }); setActiveTab("Aditivos"); setShowCreate(true); }} className="btn-secondary"><Plus size={16}/>Novo aditivo</button><button onClick={() => load()} className="btn-secondary"><RefreshCw size={16}/>Atualizar</button></div><div className="overflow-x-auto"><table className="min-w-[1100px]"><thead><tr><th>Documento</th><th>Contrato / aditivo</th><th>Locador / objeto</th><th>Obra</th><th>Equipamentos</th><th>Vigência geral</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{tabRows.map((row) => { const days = Math.ceil((new Date(`${row.endsAt}T12:00:00`).getTime() - today.getTime()) / 86400000); return <tr key={row.id}><td><Badge tone={row.documentKind === "amendment" ? "blue" : "green"}>{row.documentKind === "amendment" ? `Aditivo ${row.amendmentNumber || ""}` : "Contrato inicial"}</Badge></td><td className="font-bold text-blue-800">{row.number}</td><td><div className="font-semibold">{row.supplierName || "Locador não informado"}</div><div className="text-xs text-slate-500">{row.object}</div></td><td>{row.projectName || "—"}</td><td>{row.equipmentCount || 0}</td><td>{row.startsAt?.split("-").reverse().join("/")} a {row.endsAt?.split("-").reverse().join("/")}<div className={`text-xs ${days <= 10 ? "font-bold text-red-700" : "text-slate-500"}`}>{days >= 0 ? `${days} dias restantes` : "Vencido"}</div></td><td className="font-semibold">{money(row.balanceCents)}</td><td><Badge tone={days < 0 ? "red" : days <= 10 ? "amber" : "green"}>{days < 0 ? "Vencido" : days <= 10 ? "A vencer" : "Ativo"}</Badge></td><td><div className="flex flex-wrap gap-2"><button onClick={() => openContract(row.id)} className="row-action"><FileText size={15}/>Abrir / Detalhes</button><DeletionRequestButton companyId={companyId} module="contracts" entityType="contract" entityId={row.id} label={`Contrato ${row.number} • ${row.supplierName || row.object}`} snapshot={row} onSent={setMessage}/></div></td></tr>; })}{!tabRows.length && <tr><td colSpan={9} className="py-10 text-center text-slate-500">Nenhum contrato cadastrado nesta empresa.</td></tr>}</tbody></table></div></section></div>;
}

function ContractsOld({ query, setQuery, setModal }: { query: string; setQuery: (s: string) => void; contracts: any[]; setModal: (s: string) => void }) {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  async function load(id = companyId) { if (!id) return; const response = await fetch(`/api/contracts?companyId=${encodeURIComponent(id)}`), data = await response.json(); if (response.ok) setRows(data.contracts || []); else setMessage(data.error || "Não foi possível carregar os contratos."); }
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const list = data.companies || []; setCompanies(list); if (list[0]) { setCompanyId(list[0].id); load(list[0].id); } }); }, []);
  const filtered = rows.filter((row) => `${row.number} ${row.object} ${row.supplierName || ""}`.toLowerCase().includes(query.toLowerCase()));
  const today = new Date();
  return <div className="space-y-4">{message && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}<section className="panel overflow-hidden"><div className="flex flex-wrap gap-3 border-b border-slate-200 p-4"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar número, locador ou objeto..." className="input pl-10"/></div><select className="input w-auto" value={companyId} onChange={(e) => { setCompanyId(e.target.value); load(e.target.value); }}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select><button onClick={() => load()} className="btn-secondary"><RefreshCw size={16}/>Atualizar</button></div><div className="overflow-x-auto"><table className="min-w-[1000px]"><thead><tr><th>Documento</th><th>Contrato / aditivo</th><th>Locador / objeto</th><th>Obra</th><th>Equipamentos</th><th>Vigência geral</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{filtered.map((row) => { const days = Math.ceil((new Date(`${row.endsAt}T12:00:00`).getTime() - today.getTime()) / 86400000); return <tr key={row.id}><td><Badge tone={row.documentKind === "amendment" ? "blue" : "green"}>{row.documentKind === "amendment" ? `Aditivo ${row.amendmentNumber || ""}` : "Contrato inicial"}</Badge></td><td className="font-bold text-blue-800">{row.number}</td><td><div className="font-semibold">{row.supplierName || "Locador não informado"}</div><div className="text-xs text-slate-500">{row.object}</div></td><td>{row.projectName || "—"}</td><td>{row.equipmentCount || 0}</td><td>{row.startsAt?.split("-").reverse().join("/")} a {row.endsAt?.split("-").reverse().join("/")}<div className={`text-xs ${days <= 10 ? "font-bold text-red-700" : "text-slate-500"}`}>{days >= 0 ? `${days} dias restantes` : "Vencido"}</div></td><td className="font-semibold">{((row.balanceCents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><Badge tone={days < 0 ? "red" : days <= 10 ? "amber" : "green"}>{days < 0 ? "Vencido" : days <= 10 ? "A vencer" : "Ativo"}</Badge></td></tr>; })}{!filtered.length && <tr><td colSpan={8} className="py-10 text-center text-slate-500">Nenhum contrato cadastrado nesta empresa.</td></tr>}</tbody></table></div></section><div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">O botão <strong>Novo contrato</strong> permite escolher entre primeiro contrato ou aditivo e incluir vários equipamentos com datas e valores individuais.</div></div>;
}

function ContractsLegacy({
  query,
  setQuery,
  contracts,
  setModal,
}: {
  query: string;
  setQuery: (s: string) => void;
  contracts: any[];
  setModal: (s: string) => void;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar número, fornecedor ou objeto..."
            className="input pl-10"
          />
        </div>
        <select className="input w-auto">
          <option>Todos os status</option>
          <option>Ativo</option>
          <option>A vencer</option>
        </select>
        <button className="btn-secondary">
          <FileSpreadsheet size={17} />
          Exportar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Objeto / fornecedor</th>
              <th>Vigência</th>
              <th>Saldo disponível</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.number}>
                <td className="font-semibold text-blue-700">{c.number}</td>
                <td>
                  <div className="font-medium">{c.object}</div>
                  <div className="text-xs text-slate-400">{c.supplier}</div>
                </td>
                <td>
                  {c.end}
                  <div className="text-xs text-slate-400">
                    {c.days} dias restantes
                  </div>
                </td>
                <td className="font-semibold">{c.balance}</td>
                <td>
                  <Badge tone={c.status === "A vencer" ? "red" : "green"}>
                    {c.status}
                  </Badge>
                </td>
                <td>
                  <button
                    className="row-action"
                    onClick={() => setModal("contrato")}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function GenericModule({
  screen,
  icon: Icon,
  setModal,
}: {
  screen: Screen;
  icon: any;
  setModal: (s: string) => void;
}) {
  const rows: Record<string, string[][]> = {
    Equipamentos: [
      ["408", "MIC-7J49", "Carreta graneleira", "Trabalhando"],
      ["208", "PDS-4E66", "Caminhão cabine dupla", "Manutenção"],
      ["300", "RGM-2J25", "Caminhonete 4x4", "Trabalhando"],
      ["244", "SOU-0648", "Caminhão Munck", "Disponível"],
    ],
    Manutenção: [
      ["OS-25997", "Frota 408", "Borracharia", "Em aprovação"],
      ["OS-25998", "Frota 208", "Corretiva", "Em andamento"],
      ["OS-25999", "Frota 300", "Preventiva", "Programada"],
      ["OS-26000", "Frota 244", "Lava-jato", "Concluída"],
    ],
    "Partes diárias": [
      ["23/09/2026", "96 registros", "92 conferidos", "4 pendentes"],
      ["22/09/2026", "101 registros", "101 conferidos", "Concluído"],
      ["21/09/2026", "88 registros", "88 conferidos", "Concluído"],
    ],
    Abastecimento: [
      ["23/09/2026", "Frota 408", "178,4 L", "R$ 1.047,21"],
      ["23/09/2026", "PDS-4E66", "62,8 L", "R$ 368,64"],
      ["22/09/2026", "Frota 300", "54,2 L", "R$ 318,15"],
    ],
    "Obras e serviços": [
      ["OBR-014", "PI • Canto do Buriti", "3 frentes", "Ativa"],
      ["OBR-019", "MA • Balsas", "2 frentes", "Ativa"],
      ["OBR-023", "PI • Ribeiro Gonçalves", "1 frente", "Mobilização"],
    ],
    Empresas: [
      ["SEPCO1", "SEPCO1 Construções do Brasil Ltda.", "4 canteiros", "Base definitiva"],
    ],
    Cadastros: [
      ["Fornecedores", "126 registros", "Atualizado hoje", "Abrir"],
      ["Profissionais", "284 registros", "Atualizado ontem", "Abrir"],
      ["Produtos e serviços", "1.248 registros", "23 set 2026", "Abrir"],
      ["Centros de custos", "18 registros", "20 set 2026", "Abrir"],
    ],
  };
  const data = rows[screen] || [];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <section className="panel overflow-hidden">
        <div className="flex gap-3 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              className="input pl-10"
              placeholder={`Buscar em ${screen.toLowerCase()}...`}
            />
          </div>
          <button className="btn-secondary">Filtros</button>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Identificação</th>
                <th>Referência</th>
                <th>Informação</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} className={j === 0 ? "font-semibold" : ""}>
                      {v}
                    </td>
                  ))}
                  <td>
                    <button
                      className="row-action"
                      onClick={() => setModal(`${screen} • detalhes`)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="panel p-5">
          <div className="iconbox blue">
            <Icon size={22} />
          </div>
          <h3 className="mt-4 font-bold">Resumo do módulo</h3>
          <div className="mt-4 space-y-3">
            <Stat
              label="Registros ativos"
              value={screen === "Equipamentos" ? "403" : "128"}
            />
            <Stat label="Pendências" value="6" />
            <Stat label="Atualizados hoje" value="24" />
          </div>
        </div>
        <div className="rounded-2xl bg-[#0b1930] p-5 text-white">
          <h3 className="font-bold">
            {screen === "Empresas" ? "Separação garantida" : "Integração ativa"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {screen === "Empresas"
              ? "Cada empresa possui usuários, contratos, medições, equipamentos e documentos próprios. Somente o administrador geral pode alternar entre empresas."
              : "As informações deste módulo alimentam automaticamente a apropriação e os relatórios gerenciais."}
          </p>
        </div>
      </aside>
    </div>
  );
}
const emptyEquipmentForm = () => ({ id: "", fleetNumber: "", plate: "", description: "", equipmentType: "", brand: "", model: "", manufactureYear: "", chassis: "", renavam: "", color: "", fuelType: "", serialNumber: "", ownerName: "", ownerTaxId: "", lessorId: "", lessorName: "", lessorTaxId: "", ownershipType: "leased", isCommodatum: "no", commodatumName: "", commodatumTaxId: "", status: "registering", monthlyRent: "", arrivalDate: "", departureDate: "", registrationDate: "", crlvExpiryDate: "", tachographNumber: "", tachographCalibrationDate: "", tachographExpiryDate: "", insuranceProvider: "", insurancePolicyNumber: "", insuranceStartDate: "", insuranceExpiryDate: "", projectName: "", frontName: "", costCenter: "", operatorName: "", measurementType: "kilometer", currentKilometer: "", currentHourmeter: "", observation: "" });
// Mantido apenas para compatibilidade com versões antigas do componente móvel,
// que não é mais exibido nem aceita gravações no sistema.
const newEntryChecklist = () => [] as Array<{ label: string; result: string; observation: string; photoName?: string }>;

function DeletionRequestButton({ companyId, module, entityType, entityId, label, snapshot, onSent }: { companyId: string; module: string; entityType: string; entityId: string; label: string; snapshot?: unknown; onSent?: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function requestDeletion() {
    const reason = window.prompt(`Informe o motivo para solicitar a exclusão de “${label}”.\n\nA justificativa é obrigatória e ficará no histórico de auditoria.`);
    if (reason === null) return;
    if (reason.trim().length < 10) return onSent?.("Informe uma justificativa com pelo menos 10 caracteres.");
    setBusy(true);
    const response = await fetch("/api/deletion-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, module, entityType, entityId, entityLabel: label, reason, snapshot }) });
    const data = await response.json(); setBusy(false);
    onSent?.(response.ok ? data.message : data.error || "Não foi possível solicitar a exclusão.");
  }
  return <button type="button" disabled={busy} onClick={requestDeletion} className="row-action text-red-700 disabled:opacity-50"><Trash2 size={14}/>{busy ? "Enviando..." : "Solicitar exclusão"}</button>;
}

function ReopenRequestButton({ companyId, module, entityType, entityId, label, snapshot, onSent }: { companyId: string; module: string; entityType: "maintenance_order" | "fuel_entry" | "quick_service"; entityId: string; label: string; snapshot?: unknown; onSent?: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function requestReopening() {
    const reason = window.prompt(`Informe por que “${label}” precisa ser reaberto.\n\nA justificativa é obrigatória e ficará no histórico de auditoria.`);
    if (reason === null) return;
    if (reason.trim().length < 10) return onSent?.("Informe uma justificativa com pelo menos 10 caracteres.");
    setBusy(true);
    const response = await fetch("/api/deletion-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, module, entityType: `reopen_${entityType}`, entityId, entityLabel: `Reabertura • ${label}`, reason, snapshot }) });
    const data = await response.json(); setBusy(false);
    onSent?.(response.ok ? data.message : data.error || "Não foi possível solicitar a reabertura.");
  }
  return <button type="button" disabled={busy} onClick={requestReopening} className="row-action text-blue-700 disabled:opacity-50"><RefreshCw size={14}/>{busy ? "Enviando..." : "Solicitar reabertura"}</button>;
}

function DeletionApprovalPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<any[]>([]), [canApprove, setCanApprove] = useState(false), [message, setMessage] = useState("");
  async function load() { if (!companyId) return; const response = await fetch(`/api/deletion-requests?companyId=${encodeURIComponent(companyId)}`), data = await response.json(); if (response.ok) { setRows(data.requests || []); setCanApprove(Boolean(data.canApprove)); } else setMessage(data.error || "Não foi possível carregar as solicitações."); }
  useEffect(() => { load(); }, [companyId]);
  async function decide(id: string, decision: "approved" | "rejected") {
    const note = decision === "approved" ? "" : window.prompt("Informe o motivo da rejeição:") ?? "";
    if (decision === "rejected" && note.trim().length < 5) return setMessage("Informe o motivo da rejeição.");
    const response = await fetch("/api/deletion-requests", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, id, decision, note }) }), data = await response.json();
    setMessage(response.ok ? (decision === "approved" ? "Solicitação aprovada e registrada na auditoria." : "Solicitação rejeitada e mantida no histórico.") : data.error || "Não foi possível concluir a análise.");
    await load();
  }
  const statusLabel: Record<string,string> = { pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada", failed: "Bloqueada por vínculo" };
  const moduleLabel: Record<string,string> = { contracts: "Contratos", maintenance: "Manutenção", equipment: "Equipamentos", invoices: "Notas fiscais", daily_parts: "Partes diárias", measurements: "Medições", suppliers: "Fornecedores", master_data: "Cadastros gerais", fuel: "Abastecimento", quick_services: "Serviços rápidos" };
  return <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Aprovação de exclusões</h3><p>Histórico permanente de solicitações, motivos e decisões do Administrador Master.</p></div><button onClick={load} className="btn-secondary"><RefreshCw size={16}/>Atualizar</button></div>{message && <div className="border-b border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</div>}<div className="overflow-x-auto"><table className="min-w-[1100px]"><thead><tr><th>Data</th><th>Módulo</th><th>Registro</th><th>Solicitante</th><th>Motivo</th><th>Status</th><th>Decisão</th><th>Ações</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{new Date(row.requestedAt).toLocaleString("pt-BR")}</td><td>{moduleLabel[row.module] || row.module}</td><td className="font-semibold">{row.entityLabel}</td><td>{row.requestedByName || row.requestedBy}</td><td className="max-w-xs whitespace-normal">{row.reason}</td><td><Badge tone={row.status === "approved" ? "green" : row.status === "rejected" || row.status === "failed" ? "red" : "amber"}>{statusLabel[row.status] || row.status}</Badge></td><td className="text-xs">{row.reviewedByName ? <>{row.reviewedByName}<br/>{row.reviewedAt ? new Date(row.reviewedAt).toLocaleString("pt-BR") : ""}<br/>{row.reviewNote || ""}</> : "—"}</td><td>{row.status === "pending" && canApprove ? <div className="flex gap-2"><button onClick={() => decide(row.id, "approved")} className="row-action text-emerald-700"><CheckCircle2 size={14}/>Aprovar</button><button onClick={() => decide(row.id, "rejected")} className="row-action text-red-700"><X size={14}/>Rejeitar</button></div> : row.status === "pending" ? "Aguardando Master" : "Concluída"}</td></tr>)}{!rows.length && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Nenhuma solicitação de exclusão registrada.</td></tr>}</tbody></table></div></section>;
}

function EquipmentPage() {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState(emptyEquipmentForm);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [equipmentSortBy, setEquipmentSortBy] = useState("fleetNumber");
  const [equipmentSortDirection, setEquipmentSortDirection] = useState<"asc" | "desc">("asc");
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState("");
  const [equipmentTab, setEquipmentTab] = useState<"data" | "maintenance">("data");
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<any[]>([]);
  const [equipmentBrands, setEquipmentBrands] = useState<any[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<any[]>([]);
  const [lessors, setLessors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]), [fronts, setFronts] = useState<any[]>([]), [costCenters, setCostCenters] = useState<any[]>([]), [professionals, setProfessionals] = useState<any[]>([]);
  function change(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function load(id = companyId) {
    if (!id) return;
    const [response, typeResponse, brandResponse, modelResponse, supplierResponse, projectResponse, frontResponse, costResponse, professionalResponse] = await Promise.all([
      fetch(`/api/equipment?companyId=${encodeURIComponent(id)}`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=tipo_equipamento`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=marca_equipamento`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=modelo_equipamento`),
      fetch(`/api/suppliers?companyId=${encodeURIComponent(id)}`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=obra`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=frente`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=centro_custo`),
      fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=profissional`),
    ]);
    const data = await response.json();
    if (response.ok) setRecords(data.equipment || []); else setMessage(data.error || "Não foi possível carregar os equipamentos.");
    const [typeData, brandData, modelData, supplierData, projectData, frontData, costData, professionalData] = await Promise.all([typeResponse.json(), brandResponse.json(), modelResponse.json(), supplierResponse.json(), projectResponse.json(), frontResponse.json(), costResponse.json(), professionalResponse.json()]);
    if (typeResponse.ok) setEquipmentTypes((typeData.records || []).filter((row: any) => row.active));
    if (brandResponse.ok) setEquipmentBrands((brandData.records || []).filter((row: any) => row.active));
    if (modelResponse.ok) setEquipmentModels((modelData.records || []).filter((row: any) => row.active));
    if (supplierResponse.ok) setLessors((supplierData.suppliers || []).filter((row: any) => row.active !== false));
    if (projectResponse.ok) setProjects((projectData.records || []).filter((row: any) => row.active));
    if (frontResponse.ok) setFronts((frontData.records || []).filter((row: any) => row.active));
    if (costResponse.ok) setCostCenters((costData.records || []).filter((row: any) => row.active));
    if (professionalResponse.ok) setProfessionals((professionalData.records || []).filter((row: any) => row.active));
  }
  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const rows = data.companies || []; setCompanies(rows);
      if (rows[0]) { setCompanyId(rows[0].id); load(rows[0].id); }
    }).catch(() => setMessage("Não foi possível carregar as empresas."));
  }, []);
  function edit(record: any) {
    const matchedLessor = lessors.find((row) => row.id === record.lessorId || (record.lessorTaxId && row.taxId === record.lessorTaxId) || (!record.lessorId && row.name === record.lessorName));
    setForm({ ...emptyEquipmentForm(), ...record, lessorId: record.lessorId || matchedLessor?.id || "", lessorName: record.lessorName || matchedLessor?.name || "", lessorTaxId: record.lessorTaxId || matchedLessor?.taxId || "", isCommodatum: record.isCommodatum ? "yes" : "no", manufactureYear: record.manufactureYear?.toString() || "", monthlyRent: ((record.monthlyRentCents || 0) / 100).toFixed(2).replace(".", ","), currentKilometer: record.currentKilometer?.toString() || "", currentHourmeter: record.currentHourmeter?.toString() || "" });
    setEquipmentTab("data"); setOpen(true); loadDocuments(record.id); loadMaintenanceHistory(record.id); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function loadMaintenanceHistory(equipmentId: string) {
    const response = await fetch(`/api/maintenance?companyId=${encodeURIComponent(companyId)}`), data = await response.json();
    if (!response.ok) return setMaintenanceHistory([]);
    const equipmentOrders = (data.orders || []).filter((row: any) => row.equipmentId === equipmentId);
    const enriched = await Promise.all(equipmentOrders.map(async (order: any) => { if (order.orderKind !== "purchase_service") return { ...order, items: [], totalCents: 0 }; const itemResponse = await fetch(`/api/maintenance/items?companyId=${encodeURIComponent(companyId)}&orderId=${encodeURIComponent(order.id)}`), itemData = await itemResponse.json(); const orderItems = itemResponse.ok ? itemData.items || [] : []; return { ...order, items: orderItems, totalCents: orderItems.reduce((sum: number, item: any) => sum + Number(item.totalCents || 0), 0) }; }));
    setMaintenanceHistory(enriched);
  }
  async function loadDocuments(equipmentId: string) {
    if (!companyId || !equipmentId) return setDocuments([]);
    const response = await fetch(`/api/equipment/documents?companyId=${encodeURIComponent(companyId)}&equipmentId=${encodeURIComponent(equipmentId)}`);
    const data = await response.json(); if (response.ok) setDocuments(data.documents || []);
  }
  function valueAfterLabel(text: string, labels: string[], pattern = "[^\\n]{2,80}") {
    for (const label of labels) {
      const match = text.match(new RegExp(`(?:${label})\\s*[:\\-]?\\s*(${pattern})`, "i"));
      if (match?.[1]) return match[1].trim().replace(/\s{2,}.*/, "");
    }
    return "";
  }
  function documentFields(text: string, documentType: string) {
    const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
    const dateToIso = (value: string) => { const match = value.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/); return match ? `${match[3]}-${match[2]}-${match[1]}` : ""; };
    if (documentType === "crlv") {
      const plate = (clean.match(/\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/i)?.[0] || "").toUpperCase();
      const renavam = valueAfterLabel(clean, ["RENAVAM"], "[0-9.\\- ]{9,16}").replace(/\D/g, "");
      const chassis = valueAfterLabel(clean, ["CHASSI"], "[A-Z0-9]{11,20}").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const ownerName = valueAfterLabel(clean, ["NOME(?: DO PROPRIETÁRIO)?", "PROPRIETÁRIO", "PROPRIETARIO"]);
      const ownerTaxId = valueAfterLabel(clean, ["CPF\\s*[/\\-]?\\s*CNPJ", "CPF", "CNPJ"], "[0-9.\\/\\-]{11,18}");
      const model = valueAfterLabel(clean, ["MARCA\\s*[/\\-]?\\s*MODELO", "MARCA/MODELO", "MODELO"]);
      const year = valueAfterLabel(clean, ["ANO FABRICAÇÃO", "ANO FABRICACAO", "ANO FAB\\.?"], "(?:19|20)\\d{2}");
      const color = valueAfterLabel(clean, ["COR PREDOMINANTE", "COR"], "[A-ZÁÉÍÓÚÃÕÇ ]{3,30}");
      const fuelType = valueAfterLabel(clean, ["COMBUSTÍVEL", "COMBUSTIVEL"], "[A-ZÁÉÍÓÚÃÕÇ0-9 /-]{3,30}");
      return { plate, renavam, chassis, ownerName, ownerTaxId, model, manufactureYear: year, color, fuelType, ownershipType: ownerName ? "owned" : undefined };
    }
    if (documentType === "tachograph") {
      const dates = [...clean.matchAll(/\d{2}[\/.\-]\d{2}[\/.\-]\d{4}/g)].map((match) => dateToIso(match[0]));
      return { tachographNumber: valueAfterLabel(clean, ["NÚMERO", "NUMERO", "Nº"], "[A-Z0-9.\\/-]{3,30}"), tachographCalibrationDate: dates[0] || "", tachographExpiryDate: dates[1] || "" };
    }
    const dates = [...clean.matchAll(/\d{2}[\/.\-]\d{2}[\/.\-]\d{4}/g)].map((match) => dateToIso(match[0]));
    return { insuranceProvider: valueAfterLabel(clean, ["SEGURADORA", "SEGURADO"]), insurancePolicyNumber: valueAfterLabel(clean, ["APÓLICE", "APOLICE"], "[A-Z0-9.\\/-]{3,40}"), insuranceStartDate: dates[0] || "", insuranceExpiryDate: dates[1] || "" };
  }
  async function readDocument(file: File, documentType: string) {
    let text = "";
    if (file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 3); pageNumber += 1) {
        const page = await pdf.getPage(pageNumber); const content = await page.getTextContent();
        text += `${content.items.map((item: any) => item.str || "").join(" ")}\n`;
      }
    } else {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const result = await worker.recognize(file); text = result.data.text || ""; await worker.terminate();
    }
    if (!text.trim()) throw new Error("O documento não possui texto legível. Envie uma foto nítida ou um PDF pesquisável.");
    const values = documentFields(text, documentType); const found = Object.entries(values).filter(([, value]) => Boolean(value));
    if (!found.length) throw new Error("O arquivo foi lido, mas os campos não foram identificados. Confira a qualidade e o tipo do documento.");
    setForm((current) => ({ ...current, ...Object.fromEntries(found) }));
    return found.length;
  }
  async function uploadDocument(documentType: string, file?: File) {
    if (!file) return;
    setUploadingDocument(documentType); setMessage("");
    let equipmentId = form.id;
    if (!equipmentId) {
      if (!navigator.onLine) { setUploadingDocument(""); return setMessage("Conecte-se à internet para salvar o equipamento e enviar o documento."); }
      if (!form.fleetNumber.trim() || !form.description.trim()) { setUploadingDocument(""); return setMessage("Informe o Nº da frota/ID e o Equipamento antes de anexar o documento."); }
      const createResponse = await fetch("/api/equipment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(equipmentPayload()) });
      const createData = await createResponse.json();
      if (!createResponse.ok || !createData.equipment?.id) { setUploadingDocument(""); return setMessage(createData.error || "Não foi possível salvar o equipamento para liberar o anexo."); }
      equipmentId = createData.equipment.id;
      setForm((current) => ({ ...current, id: equipmentId }));
      setMessage("Equipamento salvo como Em cadastramento. Enviando documento...");
      await load();
    }
    const payload = new FormData(); payload.append("companyId", companyId); payload.append("equipmentId", equipmentId); payload.append("documentType", documentType); payload.append("file", file);
    const response = await fetch("/api/equipment/documents", { method: "POST", body: payload });
    const data = await response.json(); setUploadingDocument("");
    if (!response.ok) return setMessage(data.error || "Não foi possível enviar o documento.");
    setMessage("Documento anexado. Lendo os dados para preencher o cadastro..."); await loadDocuments(equipmentId);
    try {
      const total = await readDocument(file, documentType);
      setMessage(`Documento anexado e lido. ${total} campo(s) preenchido(s) automaticamente; confira antes de salvar.`);
    } catch (error) {
      setMessage(`Documento anexado, mas a leitura automática não foi concluída: ${error instanceof Error ? error.message : "erro de leitura"}`);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await offlineRequest("/api/equipment", { method: form.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(equipmentPayload()) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível salvar o equipamento.");
    setMessage(data.queued ? data.message : form.id ? "Equipamento atualizado." : "Equipamento cadastrado. Agora você pode anexar os documentos.");
    if (!data.queued && !form.id && data.equipment?.id) setForm((current) => ({ ...current, id: data.equipment.id }));
    if (!data.queued) await load();
  }
  function equipmentPayload() {
    const monthlyRentCents = Math.round((Number(form.monthlyRent.replace(/\./g, "").replace(",", ".")) || 0) * 100);
    return { ...form, companyId, status: form.status || "registering", isCommodatum: form.isCommodatum === "yes", monthlyRentCents, manufactureYear: form.manufactureYear ? Number(form.manufactureYear) : null, currentKilometer: form.currentKilometer === "" ? null : Number(form.currentKilometer), currentHourmeter: form.currentHourmeter === "" ? null : Number(form.currentHourmeter) };
  }
  const normalizeEquipmentSearch = (value: unknown) => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const searchTerms = normalizeEquipmentSearch(search).split(" ").filter(Boolean);
  const isEquipmentStatusMatch = (status: string) => {
    if (equipmentStatusFilter === "all") return true;
    if (equipmentStatusFilter === "active") return ["active", "available", "mobilized", "registering"].includes(status);
    if (equipmentStatusFilter === "maintenance") return status === "maintenance";
    if (equipmentStatusFilter === "demobilized") return status === "demobilized";
    return status === equipmentStatusFilter;
  };
  const filtered = records.filter((record) => {
    const searchable = normalizeEquipmentSearch([
      record.fleetNumber, record.plate, record.description, record.equipmentType,
      record.brand, record.model, record.lessorName, record.ownerName,
      record.projectName, record.costCenter, record.operatorName,
    ].filter(Boolean).join(" "));
    return searchTerms.every((term) => searchable.includes(term));
  }).filter((record) => isEquipmentStatusMatch(record.status)).sort((a, b) => {
    const result = String(a[equipmentSortBy] || "").localeCompare(String(b[equipmentSortBy] || ""), "pt-BR", { numeric: true, sensitivity: "base" });
    return equipmentSortDirection === "asc" ? result : -result;
  });
  return <div className="space-y-5">
      <section className="panel p-5"><div className="flex flex-wrap items-end justify-between gap-3"><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); load(e.target.value); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select></label><button onClick={() => { setForm(emptyEquipmentForm()); setDocuments([]); setOpen(!open); }} className="btn-primary"><Plus size={17} />{open ? "Fechar cadastro" : "Cadastrar equipamento"}</button></div></section>
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><strong>Regra multiempresa:</strong> as funcionalidades são iguais para todas as empresas administradas. Os equipamentos e demais dados permanecem separados pela empresa selecionada.</div>
    {open && <section className="panel overflow-hidden"><div className="panel-head"><div><h3>{form.id ? "Editar equipamento" : "Novo equipamento"}</h3><p>Dados cadastrais e histórico completo da manutenção</p></div><div className="flex gap-2"><button type="button" onClick={() => setEquipmentTab("data")} className={equipmentTab === "data" ? "btn-primary" : "btn-secondary"}>Dados do equipamento</button><button type="button" disabled={!form.id} onClick={() => setEquipmentTab("maintenance")} className={equipmentTab === "maintenance" ? "btn-primary" : "btn-secondary"}>Manutenção preventiva e corretiva</button></div></div><form onSubmit={save} className={`${equipmentTab === "data" ? "space-y-5 p-5" : "hidden"}`}>
      <div><h4 className="font-bold text-blue-900">Identificação</h4><div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <label className="text-sm font-semibold">Nº da frota / ID<input required className="input mt-1" value={form.fleetNumber} onChange={(e) => change("fleetNumber", e.target.value)} /></label>
        <label className="text-sm font-semibold">Placa<input className="input mt-1 uppercase" value={form.plate} onChange={(e) => change("plate", e.target.value.toUpperCase())} /></label>
        <label className="text-sm font-semibold">Tipo de equipamento<select className="input mt-1" value={form.equipmentType} onChange={(e) => change("equipmentType", e.target.value)}><option value="">Selecione</option>{equipmentTypes.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Equipamento<input required list="equipment-description-options" className="input mt-1" value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="Selecione ou informe"/><datalist id="equipment-description-options">{[...new Set([...equipmentModels.map((row) => row.name), ...records.map((row) => row.description)])].filter(Boolean).map((value) => <option key={value} value={value}/>)}</datalist></label>
        <label className="text-sm font-semibold">Marca<select className="input mt-1" value={form.brand} onChange={(e) => change("brand", e.target.value)}><option value="">Selecione</option>{equipmentBrands.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Modelo<select className="input mt-1" value={form.model} onChange={(e) => change("model", e.target.value)}><option value="">Selecione</option>{equipmentModels.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Ano de fabricação<input type="number" className="input mt-1" value={form.manufactureYear} onChange={(e) => change("manufactureYear", e.target.value)} /></label>
        <label className="text-sm font-semibold">Cor<input className="input mt-1" value={form.color} onChange={(e) => change("color", e.target.value)} /></label>
        <label className="text-sm font-semibold">Combustível<select className="input mt-1" value={form.fuelType} onChange={(e) => change("fuelType", e.target.value)}><option value="">Selecione</option><option>Diesel S10</option><option>Diesel S500</option><option>Gasolina</option><option>Etanol</option><option>Flex</option><option>Elétrico</option><option>Híbrido</option><option>GNV</option><option>Não se aplica</option></select></label>
        <label className="text-sm font-semibold">Chassi<input className="input mt-1 uppercase" value={form.chassis} onChange={(e) => change("chassis", e.target.value.toUpperCase())} /></label>
        <label className="text-sm font-semibold">Renavam<input className="input mt-1" value={form.renavam} onChange={(e) => change("renavam", e.target.value)} /></label>
        <label className="text-sm font-semibold">Número de série<input className="input mt-1" value={form.serialNumber} onChange={(e) => change("serialNumber", e.target.value)} /></label>
      </div></div>
      <div><h4 className="font-bold text-blue-900">Propriedade e contrato</h4><div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <label className="text-sm font-semibold">Próprio?<select className="input mt-1" value={form.ownershipType} onChange={(e) => change("ownershipType", e.target.value)}><option value="owned">Sim</option><option value="leased">Não</option></select></label>
        {form.ownershipType === "owned" ? <>
          <label className="text-sm font-semibold">Proprietário<input required className="input mt-1" value={form.ownerName} onChange={(e) => change("ownerName", e.target.value)} /></label>
          <label className="text-sm font-semibold">CPF/CNPJ do proprietário<input required className="input mt-1" value={form.ownerTaxId} onChange={(e) => change("ownerTaxId", e.target.value)} /></label>
        </> : <>
          <label className="text-sm font-semibold">Locador/fornecedor<select required className="input mt-1" value={form.lessorId} onChange={(e) => { const supplier = lessors.find((row) => row.id === e.target.value); setForm((current) => ({ ...current, lessorId: e.target.value, lessorName: supplier?.name || "", lessorTaxId: supplier?.taxId || "" })); }}><option value="">Selecione um fornecedor cadastrado</option>{lessors.map((row) => <option key={row.id} value={row.id}>{row.name}{row.tradeName ? ` • ${row.tradeName}` : ""}{row.taxId ? ` • ${row.taxId}` : ""}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Lista da empresa selecionada • {lessors.length} fornecedor(es)</span></label>
          <label className="text-sm font-semibold">CPF/CNPJ do locador<input readOnly className="input mt-1 bg-slate-50" value={form.lessorTaxId} /></label>
        </>}
        <label className="text-sm font-semibold">Comodato?<select className="input mt-1" value={form.isCommodatum} onChange={(e) => change("isCommodatum", e.target.value)}><option value="no">Não</option><option value="yes">Sim</option></select></label>
        {form.isCommodatum === "yes" && <><label className="text-sm font-semibold">Empresa locadora (comodato)<input required className="input mt-1" value={form.commodatumName} onChange={(e) => change("commodatumName", e.target.value)} /></label><label className="text-sm font-semibold">CNPJ da empresa locadora<input required className="input mt-1" value={form.commodatumTaxId} onChange={(e) => change("commodatumTaxId", e.target.value)} /></label></>}
        <label className="text-sm font-semibold">Status<select className="input mt-1" value={form.status} onChange={(e) => change("status", e.target.value)}><option value="registering">Em cadastramento</option><option value="available">Disponível</option><option value="active">Ativo</option><option value="maintenance">Manutenção</option><option value="demobilized">Desmobilizado</option></select></label>
        <label className="text-sm font-semibold">Data de chegada<input type="date" className="input mt-1" value={form.arrivalDate} onChange={(e) => change("arrivalDate", e.target.value)} /></label>
        <label className="text-sm font-semibold">Data de saída<input type="date" className="input mt-1" value={form.departureDate} onChange={(e) => change("departureDate", e.target.value)} /></label>
      </div></div>
      <div><h4 className="font-bold text-blue-900">Documentação e guia do tacógrafo</h4><div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <label className="text-sm font-semibold">Data do cadastro<input type="date" className="input mt-1" value={form.registrationDate} onChange={(e) => change("registrationDate", e.target.value)} /></label>
        <label className="text-sm font-semibold">Vencimento CRLV<input type="date" className="input mt-1" value={form.crlvExpiryDate} onChange={(e) => change("crlvExpiryDate", e.target.value)} /></label>
        <label className="text-sm font-semibold">Número do tacógrafo<input className="input mt-1" value={form.tachographNumber} onChange={(e) => change("tachographNumber", e.target.value)} /></label>
        <label className="text-sm font-semibold">Emissão/aferição do tacógrafo<input type="date" className="input mt-1" value={form.tachographCalibrationDate} onChange={(e) => change("tachographCalibrationDate", e.target.value)} /></label>
        <label className="text-sm font-semibold">Vencimento do tacógrafo<input type="date" className="input mt-1" value={form.tachographExpiryDate} onChange={(e) => change("tachographExpiryDate", e.target.value)} /></label>
      </div></div>
      <div><h4 className="font-bold text-blue-900">Apólice de seguro</h4><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Seguradora/segurado<input className="input mt-1" value={form.insuranceProvider} onChange={(e) => change("insuranceProvider", e.target.value)} /></label>
        <label className="text-sm font-semibold">Número da apólice<input className="input mt-1" value={form.insurancePolicyNumber} onChange={(e) => change("insurancePolicyNumber", e.target.value)} /></label>
        <label className="text-sm font-semibold">Início do seguro<input type="date" className="input mt-1" value={form.insuranceStartDate} onChange={(e) => change("insuranceStartDate", e.target.value)} /></label>
        <label className="text-sm font-semibold">Vencimento do seguro<input type="date" className="input mt-1" value={form.insuranceExpiryDate} onChange={(e) => change("insuranceExpiryDate", e.target.value)} /></label>
      </div></div>
      <div><h4 className="font-bold text-blue-900">Anexar e consultar documentos</h4><p className="mt-1 text-sm text-slate-500">Formatos aceitos: PDF, JPG ou PNG, até 10 MB.</p>
        {!form.id && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">Os anexos estão liberados. Ao escolher o primeiro arquivo, o sistema salvará automaticamente o equipamento como <strong>Em cadastramento</strong>. Informe antes o Nº da frota/ID e o Equipamento.</div>}
        <div className="mt-3 grid gap-3 md:grid-cols-3">{[["crlv", "CRLV"], ["tachograph", "Guia do tacógrafo"], ["insurance", "Apólice de seguro"]].map(([type, label]) => {
          const current = documents.find((document) => document.documentType === type);
          return <div key={type} className="rounded-xl border border-slate-200 p-4"><div className="font-bold">{label}</div><div className="mt-1 min-h-8 truncate text-xs text-slate-500">{current?.fileName || "Nenhum arquivo anexado"}</div><div className="mt-3 flex flex-wrap gap-2"><label className={`btn-secondary ${uploadingDocument ? "pointer-events-none opacity-60" : ""}`}><Upload size={16} />{uploadingDocument === type ? "Enviando..." : current ? "Substituir" : "Anexar"}<input disabled={Boolean(uploadingDocument)} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => uploadDocument(type, e.target.files?.[0])} /></label>{current && <a className="btn-secondary" target="_blank" rel="noreferrer" href={`/api/equipment/documents?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(current.id)}`}><FileText size={16} />Abrir</a>}</div></div>;
        })}</div>
        <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><strong>Leitura automática:</strong> após anexar, o sistema lê PDFs pesquisáveis e imagens, preenche os campos identificados e mantém o arquivo disponível para consulta. Confira os dados antes de salvar.</div>
      </div>
      <div><h4 className="font-bold text-blue-900">Alocação atual</h4><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Obra<select className="input mt-1" value={form.projectName} onChange={(e) => change("projectName", e.target.value)}><option value="">Selecione uma obra cadastrada</option>{projects.map((row) => <option key={row.id} value={row.name}>{row.code ? `${row.code} • ` : ""}{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Frente de serviço<select className="input mt-1" value={form.frontName} onChange={(e) => change("frontName", e.target.value)}><option value="">Selecione uma frente cadastrada</option>{fronts.map((row) => <option key={row.id} value={row.name}>{row.code ? `${row.code} • ` : ""}{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Centro de custo<select className="input mt-1" value={form.costCenter} onChange={(e) => change("costCenter", e.target.value)}><option value="">Selecione um centro de custo</option>{costCenters.map((row) => <option key={row.id} value={row.name}>{row.code ? `${row.code} • ` : ""}{row.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Condutor/operador<select className="input mt-1" value={form.operatorName} onChange={(e) => change("operatorName", e.target.value)}><option value="">Selecione um profissional cadastrado</option>{professionals.map((row) => <option key={row.id} value={row.name}>{row.code ? `${row.code} • ` : ""}{row.name}</option>)}</select></label>
      </div></div>
      <div><h4 className="font-bold text-blue-900">Medição e período</h4><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Tipo de medição<select className="input mt-1" value={form.measurementType} onChange={(e) => change("measurementType", e.target.value)}><option value="kilometer">Quilômetro</option><option value="hourmeter">Horímetro</option><option value="daily">Diária</option><option value="monthly">Mensal</option></select></label>
        <label className="text-sm font-semibold">KM atual<input type="number" className="input mt-1" value={form.currentKilometer} onChange={(e) => change("currentKilometer", e.target.value)} /></label>
        <label className="text-sm font-semibold">Horímetro atual<input type="number" className="input mt-1" value={form.currentHourmeter} onChange={(e) => change("currentHourmeter", e.target.value)} /></label>
      </div></div>
      <label className="block text-sm font-semibold">Observações<textarea className="input mt-1 min-h-20" value={form.observation} onChange={(e) => change("observation", e.target.value)} /></label>
      {message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setOpen(false); setForm(emptyEquipmentForm()); }} className="btn-secondary">Cancelar</button><button disabled={busy || !companyId} className="btn-primary"><CheckCircle2 size={17} />{busy ? "Salvando..." : "Salvar equipamento"}</button></div>
    </form>{equipmentTab === "maintenance" && <div className="p-5"><div className="mb-4 grid gap-3 sm:grid-cols-3"><Mini value={String(maintenanceHistory.length)} label="Ordens de serviço"/><Mini value={String(maintenanceHistory.filter((row: any) => row.maintenanceType?.toLowerCase().includes("prevent")).length)} label="Preventivas"/><Mini value={String(maintenanceHistory.filter((row: any) => row.maintenanceType?.toLowerCase().includes("corret")).length)} label="Corretivas"/></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[1050px]"><thead><tr><th>O.S.</th><th>Abertura</th><th>Encerramento</th><th>Tipo</th><th>Natureza</th><th>Descrição</th><th>KM/Horímetro</th><th>Peças e serviços</th><th>Total</th><th>Status</th></tr></thead><tbody>{maintenanceHistory.length ? maintenanceHistory.map((row: any) => <tr key={row.id}><td className="font-bold text-blue-800">{row.orderNumber}</td><td>{row.startedAt?.split("-").reverse().join("/")}</td><td>{row.closedAt ? String(row.closedAt).slice(0,10).split("-").reverse().join("/") : "—"}</td><td>{row.maintenanceType}</td><td>{row.orderKind === "daily_maintenance" ? "Operacional" : "Compras/serviços"}</td><td>{row.description}</td><td>{row.kilometer != null ? `${row.kilometer} km` : row.hourmeter != null ? `${row.hourmeter} h` : "—"}</td><td>{row.items.length ? row.items.map((item: any) => item.productService).join(", ") : "—"}</td><td className="font-semibold">{(Number(row.totalCents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td><Badge tone={row.status === "closed" ? "green" : "amber"}>{row.status === "closed" ? "Concluída" : "Aberta"}</Badge></td></tr>) : <tr><td colSpan={10} className="py-10 text-center text-slate-500">Nenhuma manutenção registrada para este equipamento.</td></tr>}</tbody></table></div></div>}</section>}
    {!open && message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}
    <section className="panel overflow-hidden"><div className="panel-head flex-wrap"><div><h3>Equipamentos cadastrados</h3><p>{records.length} registro(s) nesta empresa • {filtered.length} exibido(s)</p></div><div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search size={16} /><input className="w-48 bg-transparent text-sm outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID, placa, equipamento, marca, modelo, locador, obra ou operador" /></label><select className="input w-auto" value={equipmentStatusFilter} onChange={(e) => setEquipmentStatusFilter(e.target.value)}><option value="all">Todos os status</option><option value="active">Ativos</option><option value="maintenance">Em manutenção</option><option value="demobilized">Desmobilizados</option></select><select className="input w-auto" value={equipmentSortBy} onChange={(e) => setEquipmentSortBy(e.target.value)}><option value="fleetNumber">Ordenar: ID</option><option value="plate">Ordenar: Placa</option><option value="description">Ordenar: Equipamento</option><option value="brand">Ordenar: Marca</option><option value="status">Ordenar: Status</option></select><button className="btn-secondary" onClick={() => setEquipmentSortDirection((value) => value === "asc" ? "desc" : "asc")}>{equipmentSortDirection === "asc" ? "↑ Crescente" : "↓ Decrescente"}</button></div></div><div className="overflow-x-auto"><table><thead><tr><th>ID</th><th>Placa</th><th>Equipamento</th><th>Marca/Modelo</th><th>Proprietário/Locador</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td className="font-bold">{record.fleetNumber}</td><td>{record.plate || "—"}</td><td><div className="font-semibold">{record.description}</div><div className="text-xs text-slate-500">{record.equipmentType || "Tipo não informado"}</div></td><td>{[record.brand, record.model].filter(Boolean).join(" / ") || "—"}</td><td>{record.lessorName || record.ownerName || "—"}</td><td><Badge tone={record.status === "maintenance" ? "amber" : record.status === "demobilized" ? "slate" : "green"}>{record.status === "maintenance" ? "Manutenção" : record.status === "demobilized" ? "Desmobilizado" : record.status === "mobilized" ? "Mobilizado" : record.status === "registering" ? "Em cadastramento" : record.status === "active" ? "Ativo" : "Disponível"}</Badge></td><td><div className="flex flex-wrap gap-2"><button onClick={() => edit(record)} className="row-action"><Pencil size={14} /> Editar</button><DeletionRequestButton companyId={companyId} module="equipment" entityType="equipment" entityId={record.id} label={`Equipamento ${record.fleetNumber} • ${record.plate || record.description}`} snapshot={record} onSent={setMessage}/></div></td></tr>)}{!filtered.length && <tr><td colSpan={7} className="py-10 text-center text-slate-500">{records.length ? "Nenhum equipamento encontrado com os filtros informados." : "Nenhum equipamento cadastrado nesta empresa."}</td></tr>}</tbody></table></div></section>
  </div>;
}

function PartDailyPage({ setModal }: { setModal: (s: string) => void }) {
  const companiesCacheKey = "frota-offline-companies";
  const selectedCompanyCacheKey = "frota-offline-selected-company";
  const equipmentCacheKey = (id: string) => `frota-offline-equipment-${id}`;
  const maintenanceCacheKey = (id: string) => `frota-offline-maintenance-${id}`;
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"manual" | "history" | "import">("history");
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [historyFrom, setHistoryFrom] = useState(today.slice(0, 8) + "01");
  const [historyTo, setHistoryTo] = useState(today);
  const [historyDetailDate, setHistoryDetailDate] = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState<{ id: string; fleetNumber: string; plate: string | null; description: string; currentKilometer?: number | null; currentHourmeter?: number | null }[]>([]);
  const [operationalOrders, setOperationalOrders] = useState<any[]>([]);
  const [editingDailyId, setEditingDailyId] = useState("");
  const [form, setForm] = useState({ entryDate: today, fleetNumber: "", plate: "", status: "T", maintenanceOrderNumber: "", hourmeterStart: "", hourmeterEnd: "", kilometerStart: "", kilometerEnd: "", observation: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const day31 = form.entryDate.endsWith("-31");
  const totalHourmeter = form.hourmeterStart !== "" && form.hourmeterEnd !== "" ? Number(form.hourmeterEnd) - Number(form.hourmeterStart) : 0;
  const totalKilometer = form.kilometerStart !== "" && form.kilometerEnd !== "" ? Number(form.kilometerEnd) - Number(form.kilometerStart) : 0;
  const historyDays = Object.entries(history.reduce((groups: Record<string, any[]>, row) => { (groups[row.entryDate] ||= []).push(row); return groups; }, {})).sort(([a], [b]) => b.localeCompare(a)) as [string, any[]][];

  async function identifyEquipment(field: "fleetNumber" | "plate") {
    const value = form[field].trim();
    if (!value || !companyId || !navigator.onLine) return;
    const response = await fetch(`/api/equipment?companyId=${encodeURIComponent(companyId)}&${field}=${encodeURIComponent(value)}`);
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Equipamento não encontrado.");
    await applyLastReading(data.equipment);
  }
  async function applyLastReading(asset: any) {
    let last: any = null;
    const selectedDate = new Date(`${form.entryDate}T12:00:00Z`);
    selectedDate.setUTCDate(selectedDate.getUTCDate() - 1);
    const previousDate = selectedDate.toISOString().slice(0, 10);
    try { const response=await fetch(`/api/daily-parts?companyId=${encodeURIComponent(companyId)}&equipmentId=${encodeURIComponent(asset.id)}&to=${encodeURIComponent(previousDate)}`), data=await response.json(); if(response.ok) last=(data.entries||[])[0]||null; } catch {}
    const lastHourmeter = last?.hourmeterEnd ?? last?.hourmeterStart ?? asset.currentHourmeter ?? "";
    const lastKilometer = last?.kilometerEnd ?? last?.kilometerStart ?? asset.currentKilometer ?? "";
    setForm((current) => current.fleetNumber !== asset.fleetNumber ? current : ({ ...current, plate: asset.plate || "", hourmeterStart: current.hourmeterStart === "" && lastHourmeter !== null ? String(lastHourmeter) : current.hourmeterStart, kilometerStart: current.kilometerStart === "" && lastKilometer !== null ? String(lastKilometer) : current.kilometerStart }));
    await loadOperationalOrders(asset, form.entryDate);
    setMessage(`${asset.fleetNumber} • ${asset.description} selecionado. Última leitura carregada automaticamente.`);
  }
  async function loadOperationalOrders(asset: any, date: string) {
    let rows: any[] = [];
    try {
      const cached = JSON.parse(localStorage.getItem(maintenanceCacheKey(companyId)) || "[]");
      if (Array.isArray(cached)) rows = cached;
    } catch {}
    if (navigator.onLine) {
      try {
        const response = await fetch(`/api/maintenance?companyId=${encodeURIComponent(companyId)}`);
        const data = await response.json();
        if (response.ok) {
          rows = data.orders || [];
          localStorage.setItem(maintenanceCacheKey(companyId), JSON.stringify(rows));
        }
      } catch {}
    }
    setOperationalOrders(rows.filter((order) =>
      order.equipmentId === asset.id &&
      order.orderKind === "daily_maintenance" &&
      order.startedAt <= date &&
      (!order.closedAt || order.closedAt >= date)
    ));
  }
  async function loadEquipmentOptions(id = companyId) {
    if (!id) return;
    try {
      const cached = JSON.parse(localStorage.getItem(equipmentCacheKey(id)) || "[]");
      if (Array.isArray(cached) && cached.length) setEquipmentOptions(cached);
    } catch {}
    if (!navigator.onLine) return;
    const response = await fetch(`/api/equipment?companyId=${encodeURIComponent(id)}&dailyList=1`);
    const data = await response.json();
    if (response.ok) {
      const sorted = [...(data.equipment || [])].sort((a, b) =>
        String(a.fleetNumber || "").localeCompare(String(b.fleetNumber || ""), "pt-BR", { numeric: true, sensitivity: "base" })
      );
      setEquipmentOptions(sorted);
      localStorage.setItem(equipmentCacheKey(id), JSON.stringify(sorted));
    }
    else { setEquipmentOptions([]); setMessage(data.error || "Não foi possível carregar os equipamentos cadastrados."); }
  }
  function selectRegisteredEquipment(field: "fleetNumber" | "plate", value: string) {
    const normalized = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const found = equipmentOptions.find((item) => field === "fleetNumber" ? item.fleetNumber === value : (item.plate || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === normalized);
    setForm((current) => ({ ...current, [field]: field === "plate" ? value.toUpperCase() : value, ...(found ? { fleetNumber: found.fleetNumber, plate: found.plate || "", hourmeterStart: "", hourmeterEnd: "", kilometerStart: "", kilometerEnd: "" } : {}) }));
    if (found) applyLastReading(found);
    else setOperationalOrders([]);
  }

  async function loadHistory(id = companyId, date = form.entryDate) {
    if (!id || !navigator.onLine) return;
    const response = await fetch(`/api/daily-parts?companyId=${encodeURIComponent(id)}&date=${encodeURIComponent(date)}`);
    const data = await response.json();
    if (response.ok) setHistory(data.entries || []);
  }
  async function loadHistoryRange(id = companyId, from = historyFrom, to = historyTo) {
    if (!id || !navigator.onLine) return;
    const response = await fetch(`/api/daily-parts?companyId=${encodeURIComponent(id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const data = await response.json();
    if (response.ok) setHistory(data.entries || []);
  }
  useEffect(() => {
    const savedCompanyId = localStorage.getItem(selectedCompanyCacheKey) || "";
    try {
      const cachedCompanies = JSON.parse(localStorage.getItem(companiesCacheKey) || "[]");
      if (Array.isArray(cachedCompanies) && cachedCompanies.length) {
        const preferred = cachedCompanies.find((row: any) => row.id === savedCompanyId) || cachedCompanies[0];
        setCompanies(cachedCompanies);
        setCompanyId(preferred.id);
        loadEquipmentOptions(preferred.id);
        if (!navigator.onLine) setMessage(`Modo offline: empresa ${preferred.tradeName} e equipamentos carregados deste computador.`);
      }
    } catch {}
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const rows = data.companies || []; setCompanies(rows);
      if (rows.length) localStorage.setItem(companiesCacheKey, JSON.stringify(rows));
      const preferred = rows.find((row: any) => row.id === savedCompanyId) || rows[0];
      if (preferred) { setCompanyId(preferred.id); localStorage.setItem(selectedCompanyCacheKey, preferred.id); loadHistoryRange(preferred.id, historyFrom, historyTo); loadEquipmentOptions(preferred.id); }
    }).catch(() => {
      if (!localStorage.getItem(companiesCacheKey)) setMessage("Conecte-se uma vez para preparar as empresas e equipamentos para uso offline.");
    });
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const payload = {
      ...form, companyId, source: "manual",
      hourmeterStart: form.hourmeterStart === "" ? null : Number(form.hourmeterStart),
      hourmeterEnd: form.hourmeterEnd === "" ? null : Number(form.hourmeterEnd),
      kilometerStart: form.kilometerStart === "" ? null : Number(form.kilometerStart),
      kilometerEnd: form.kilometerEnd === "" ? null : Number(form.kilometerEnd),
    };
    const response = await offlineRequest("/api/daily-parts", { method: editingDailyId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, id: editingDailyId || undefined }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível salvar a parte diária.");
    setMessage(data.queued ? data.message : data.updated ? "Parte diária atualizada com sucesso para este equipamento e dia." : "Parte diária registrada com sucesso.");
    if (!data.queued) await loadHistory();
    setEditingDailyId("");
    setForm((current) => ({ ...current, fleetNumber: "", plate: "", maintenanceOrderNumber: "", hourmeterStart: "", hourmeterEnd: "", kilometerStart: "", kilometerEnd: "", observation: "" }));
    setOperationalOrders([]);
  }

  function editDaily(row: any) {
    setEditingDailyId(row.id);
    setForm({
      entryDate: row.entryDate,
      fleetNumber: row.fleetNumber || "",
      plate: row.plate || "",
      status: row.status || "T",
      maintenanceOrderNumber: row.maintenanceOrderNumber || "",
      hourmeterStart: row.hourmeterStart == null ? "" : String(row.hourmeterStart),
      hourmeterEnd: row.hourmeterEnd == null ? "" : String(row.hourmeterEnd),
      kilometerStart: row.kilometerStart == null ? "" : String(row.kilometerStart),
      kilometerEnd: row.kilometerEnd == null ? "" : String(row.kilometerEnd),
      observation: row.observation || "",
    });
    const asset = equipmentOptions.find((item) => item.id === row.equipmentId);
    if (asset) loadOperationalOrders(asset, row.entryDate);
    setMode("manual");
    setMessage(`Editando a parte diária de ${row.fleetNumber} em ${row.entryDate.split("-").reverse().join("/")}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelDailyEdit() {
    setEditingDailyId("");
    setOperationalOrders([]);
    setForm((current) => ({ ...current, fleetNumber: "", plate: "", maintenanceOrderNumber: "", hourmeterStart: "", hourmeterEnd: "", kilometerStart: "", kilometerEnd: "", observation: "" }));
    setMessage("Edição cancelada.");
  }

  async function downloadDailyTemplate() {
    downloadStandardTemplate("/templates/modelo-parte-diaria.xlsx", "2.LANÇAMENTO DE PARTE DIARIA.xlsx");
  }

  async function importDailyFile(file?: File) {
    if (!file || !companyId) return;
    setBusy(true); setMessage(""); setImportErrors([]);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheetName = book.SheetNames.find((name) => /PARTE|DIARIA/i.test(name)) || book.SheetNames[0];
      const matrix = XLSX.utils.sheet_to_json<any[]>(book.Sheets[sheetName], { header: 1, defval: "", raw: true });
      const normalize = (value: any) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const aliases = {
        date: ["DATA", "DATAPARTE", "DATADOLANCAMENTO"], fleet: ["ID", "FROTA", "NUMEROFROTA", "NID", "EQUIPAMENTO"], plate: ["PLACA", "PLACASERIE", "SERIE"],
        status: ["SITUACAO", "STATUS", "TIPOMANUT", "TIPOMANUTENCAO", "CONDICAO"], order: ["OS", "NUMEROOS", "ORDEMSERVICO"],
        hs: ["HORIMETROINICIAL", "HORIMINIC", "HORIMINICIAL", "HOINICIAL"], he: ["HORIMETROFINAL", "HORIMFIM", "HORIMFINAL", "HOFINAL"],
        ks: ["KMINICIAL", "KMINICIAL2", "KMINIC"], ke: ["KMFINAL", "KMFINAL2", "KMFIM"], obs: ["OBSERVACAO", "OBS", "DESCRICAO"],
      };
      const headerIndex = matrix.findIndex((row) => { const cells = row.map(normalize); return aliases.date.some((key) => cells.includes(key)) && (aliases.fleet.some((key) => cells.includes(key)) || aliases.plate.some((key) => cells.includes(key))); });
      if (headerIndex < 0) throw new Error("Não encontrei o cabeçalho da planilha. É obrigatório existir DATA e ID/FROTA ou PLACA.");
      const headers = matrix[headerIndex].map(normalize);
      const column = (keys: string[]) => headers.findIndex((header) => keys.includes(header));
      const fleetColumn = column(aliases.fleet);
      let plateColumn = column(aliases.plate);
      // Algumas planilhas antigas substituem o título PLACA pela placa do primeiro equipamento.
      if (plateColumn < 0 && fleetColumn >= 0) {
        const candidate = fleetColumn + 1;
        const plateSamples = matrix.slice(headerIndex + 1, headerIndex + 31).map((row) => String(row[candidate] || "").trim()).filter((item) => /^[A-Z]{3}[- ]?\d[A-Z0-9]\d{2}$/i.test(item));
        if (plateSamples.length >= 3) plateColumn = candidate;
      }
      const value = (row: any[], keys: string[], forcedColumn = -1) => { const index = forcedColumn >= 0 ? forcedColumn : column(keys); return index >= 0 ? row[index] : ""; };
      const identifier = (raw: any) => { const text = String(raw ?? "").trim(); return /^[-–—.\s]*$/.test(text) ? "" : text; };
      const dateValue = (raw: any) => { if (raw instanceof Date) return raw.toISOString().slice(0, 10); if (typeof raw === "number") return XLSX.SSF.parse_date_code(raw) ? new Date(Date.UTC(XLSX.SSF.parse_date_code(raw).y, XLSX.SSF.parse_date_code(raw).m - 1, XLSX.SSF.parse_date_code(raw).d)).toISOString().slice(0, 10) : ""; const text = String(raw || "").trim(); if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10); const parts = text.split(/[\/.-]/); return parts.length === 3 ? `${parts[2].padStart(4, "20")}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}` : ""; };
      const statusValue = (raw: any) => { const text = normalize(raw); if (text === "AB" || text.includes("ABONO")) return "AB"; if (text === "M" || text.includes("MANUT")) return "M"; if (text === "D" || text.includes("DISPOS")) return "D"; return "T"; };
      const rows = matrix.slice(headerIndex + 1).map((row, index) => ({ row: headerIndex + index + 2, payload: { companyId, source: "spreadsheet", entryDate: dateValue(value(row, aliases.date)), fleetNumber: identifier(value(row, aliases.fleet, fleetColumn)), plate: identifier(value(row, aliases.plate, plateColumn)), status: statusValue(value(row, aliases.status)), maintenanceOrderNumber: identifier(value(row, aliases.order)), hourmeterStart: value(row, aliases.hs) === "" ? null : Number(value(row, aliases.hs)), hourmeterEnd: value(row, aliases.he) === "" ? null : Number(value(row, aliases.he)), kilometerStart: value(row, aliases.ks) === "" ? null : Number(value(row, aliases.ks)), kilometerEnd: value(row, aliases.ke) === "" ? null : Number(value(row, aliases.ke)), observation: String(value(row, aliases.obs) || "").trim() } })).filter(({ payload }) => payload.entryDate || payload.fleetNumber || payload.plate);
      if (!rows.length) throw new Error("A planilha não possui lançamentos para importar.");
      const errors: { row: number; error: string }[] = []; let imported = 0;
      for (const item of rows) {
        if (!item.payload.entryDate || (!item.payload.fleetNumber && !item.payload.plate)) { errors.push({ row: item.row, error: "Informe DATA e ID/FROTA ou PLACA." }); continue; }
        const response = await offlineRequest("/api/daily-parts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item.payload) });
        const data = await response.json(); if (response.ok) imported += 1; else errors.push({ row: item.row, error: data.error || "Lançamento rejeitado." });
      }
      setImportErrors(errors); setMessage(`${imported} lançamento(s) importado(s).${errors.length ? ` ${errors.length} linha(s) com divergência.` : " Importação concluída com sucesso."}`);
      if (imported > 0) {
        const importedDates = rows.map((item) => item.payload.entryDate).filter(Boolean).sort();
        const from = importedDates[0], to = importedDates.at(-1)!;
        setHistoryFrom(from); setHistoryTo(to);
        await loadHistoryRange(companyId, from, to);
        setMode("history");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ler a planilha."); }
    setBusy(false);
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <button onClick={() => setMode("manual")} className={`panel flex items-center gap-4 p-5 text-left ${mode === "manual" ? "border-blue-400 ring-2 ring-blue-100" : "hover:border-blue-300"}`}><div className="iconbox blue"><Plus size={21} /></div><div><div className="font-bold">Lançamento manual</div><div className="text-sm text-slate-500">Cadastrar uma parte diária sem planilha</div></div><ChevronRight className="ml-auto" /></button>
        <button onClick={() => { setMode("import"); setMessage(""); setImportErrors([]); }} className={`panel flex items-center gap-4 p-5 text-left ${mode === "import" ? "border-emerald-400 ring-2 ring-emerald-100" : "hover:border-blue-300"}`}><div className="iconbox green"><Upload size={21} /></div><div><div className="font-bold">Importar planilha</div><div className="text-sm text-slate-500">Enviar vários equipamentos de uma vez</div></div><ChevronRight className="ml-auto" /></button>
        <button onClick={() => { setMode("history"); setHistoryDetailDate(""); loadHistoryRange(); }} className={`panel flex items-center gap-4 p-5 text-left ${mode === "history" ? "border-red-400 ring-2 ring-red-100" : "hover:border-red-300"}`}><div className="iconbox red"><FileText size={21} /></div><div><div className="font-bold">Total por dia</div><div className="text-sm text-slate-500">Quantidade de partes diárias lançadas</div></div><ChevronRight className="ml-auto" /></button>
      </div>
      {mode === "import" && <section className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Importação de Parte Diária</h3><p className="mt-1 text-sm text-slate-500">Aceita XLSX, XLS ou CSV. Localiza o equipamento pelo ID/Frota ou pela placa.</p></div><button type="button" onClick={downloadDailyTemplate} className="btn-secondary"><Download size={17}/>Baixar modelo padrão</button></div><label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-400"><Upload className="text-blue-700"/><span className="mt-2 font-semibold">Selecionar a planilha preenchida</span><span className="text-xs text-slate-500">Colunas reconhecidas: Data, ID/Frota, Placa, Situação, O.S., horímetro e KM</span><input disabled={busy} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importDailyFile(e.target.files?.[0])}/></label>{message && <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}{importErrors.slice(0, 20).map((item) => <div key={`${item.row}-${item.error}`} className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Linha {item.row}: {item.error}</div>)}<div className="mt-4 flex justify-end"><button type="button" className="btn-secondary" onClick={() => setMode("manual")}>Voltar ao lançamento manual</button></div></section>}
      {mode !== "import" && <section className="panel overflow-hidden">
        <div className="panel-head"><div><h3>{editingDailyId ? "Editar parte diária" : "Novo lançamento manual"}</h3><p>{editingDailyId ? "Corrija os dados do lançamento existente" : "Localize o equipamento pelo número da frota ou pela placa"}</p></div><button onClick={() => { setMode("history"); loadHistory(); }} className="btn-secondary"><FileText size={17} />Ver lançamentos do dia</button></div>
        <form onSubmit={save} className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">Empresa<select required className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); localStorage.setItem(selectedCompanyCacheKey, e.target.value); loadHistory(e.target.value); loadEquipmentOptions(e.target.value); }}>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">A empresa selecionada fica disponível neste computador mesmo sem internet.</span></label>
            <label className="text-sm font-semibold">Data<input required type="date" className="input mt-1" value={form.entryDate} onChange={(e) => { const date = e.target.value; setForm({ ...form, entryDate: date }); loadHistory(companyId, date); const asset = equipmentOptions.find((item) => item.fleetNumber === form.fleetNumber || (item.plate && item.plate === form.plate)); if (asset) loadOperationalOrders(asset, date); }} /></label>
            <label className="text-sm font-semibold">Situação<select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="T">T • Trabalhando</option><option value="D">D • À disposição</option><option value="M">M • Manutenção</option><option value="AB">AB • Abono</option></select></label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold">Nº da frota / ID<input list="daily-fleet-options" className="input mt-1" value={form.fleetNumber} onChange={(e) => selectRegisteredEquipment("fleetNumber", e.target.value)} placeholder="Digite ou selecione" /><datalist id="daily-fleet-options">{equipmentOptions.map((item) => <option key={item.id} value={item.fleetNumber}>{item.plate || "Sem placa"} • {item.description}</option>)}</datalist><span className="mt-1 block text-xs font-normal text-slate-500">{equipmentOptions.length} equipamento(s) disponível(is)</span></label>
            <label className="text-sm font-semibold">Placa<input list="daily-plate-options" className="input mt-1 uppercase" value={form.plate} onChange={(e) => selectRegisteredEquipment("plate", e.target.value)} placeholder="Digite ou selecione" /><datalist id="daily-plate-options">{equipmentOptions.filter((item) => item.plate).map((item) => <option key={item.id} value={item.plate || ""}>{item.fleetNumber} • {item.description}</option>)}</datalist><span className="mt-1 block text-xs font-normal text-slate-500">Selecione uma placa cadastrada</span></label>
            <label className="text-sm font-semibold">Número da O.S. {form.status === "M" && <span className="text-red-600">*</span>}<input required={form.status === "M"} disabled={form.status !== "M"} className="input mt-1 disabled:bg-slate-100" value={form.maintenanceOrderNumber} onChange={(e) => setForm({ ...form, maintenanceOrderNumber: e.target.value })} placeholder={form.status === "M" ? "Digite a O.S. cadastrada ou avulsa" : "Somente para manutenção"} />{form.status === "M" && <span className="mt-1 block text-xs font-normal text-slate-500">Se ainda não existir, será criada como referência operacional para posterior ficha de aprovação.</span>}</label>
          </div>
          {operationalOrders.length > 0 && <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-700"/><div><h4 className="font-black text-amber-950">Existe O.S. operacional neste período</h4><p className="text-sm text-amber-800">Confira os dados e confirme se esta Parte Diária deve ser lançada como M — Manutenção.</p></div></div><div className="mt-4 grid gap-3">{operationalOrders.map((order) => <div key={order.id} className="rounded-xl border border-amber-200 bg-white p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><MaintenanceInfo label="Número da O.S." value={order.orderNumber}/><MaintenanceInfo label="Abertura" value={order.startedAt}/><MaintenanceInfo label="Defeito / descrição" value={order.description || "—"}/><MaintenanceInfo label="Tipo" value={order.maintenanceType || "—"}/><MaintenanceInfo label="Situação" value={order.maintenanceStatus || (order.status === "closed" ? "Concluída" : "Em aberto")}/></div><div className="mt-3 flex justify-end"><button type="button" className="btn-primary" onClick={() => { setForm((current) => ({ ...current, status: "M", maintenanceOrderNumber: order.orderNumber })); setMessage(`O.S. ${order.orderNumber} confirmada. Situação alterada para M — Manutenção.`); }}>Confirmar M e vincular O.S. {order.orderNumber}</button></div></div>)}</div></div>}
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="text-sm font-semibold">Horímetro inicial<input type="number" className="input mt-1" value={form.hourmeterStart} onChange={(e) => setForm({ ...form, hourmeterStart: e.target.value })} /></label>
            <label className="text-sm font-semibold">Horímetro final<input type="number" className="input mt-1" value={form.hourmeterEnd} onChange={(e) => setForm({ ...form, hourmeterEnd: e.target.value })} /></label>
            <label className="text-sm font-semibold text-blue-800">Total horímetro<input readOnly className="input mt-1 bg-blue-50 font-bold text-blue-900" value={totalHourmeter} /></label>
            <label className="text-sm font-semibold">KM inicial<input type="number" className="input mt-1" value={form.kilometerStart} onChange={(e) => setForm({ ...form, kilometerStart: e.target.value })} /></label>
            <label className="text-sm font-semibold">KM final<input type="number" className="input mt-1" value={form.kilometerEnd} onChange={(e) => setForm({ ...form, kilometerEnd: e.target.value })} /></label>
            <label className="text-sm font-semibold text-blue-800">Total KM<input readOnly className="input mt-1 bg-blue-50 font-bold text-blue-900" value={totalKilometer} /></label>
          </div>
          <label className="block text-sm font-semibold">Observação<textarea className="input mt-1 min-h-20" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></label>
          {day31 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Dia 31 — será mantido no histórico, mas não será contabilizado financeiramente.</div>}
          {message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}
          <div className="flex justify-end gap-2">{editingDailyId && <button type="button" onClick={cancelDailyEdit} className="btn-secondary">Cancelar edição</button>}<button disabled={busy || !companyId || (!form.fleetNumber && !form.plate)} className="btn-primary disabled:opacity-50"><CheckCircle2 size={17} />{busy ? "Salvando..." : editingDailyId ? "Salvar alterações" : "Salvar parte diária"}</button></div>
        </form>
      </section>}
      {mode === "history" && <section className="panel overflow-hidden"><div className="panel-head flex-wrap"><div><h3>{historyDetailDate ? `Detalhes de ${historyDetailDate.split("-").reverse().join("/")}` : "Lançamento de Partes Diárias"}</h3><p>{historyDetailDate ? `${history.filter((row) => row.entryDate === historyDetailDate).length} lançamento(s) no dia` : `${historyDays.length} dia(s) • ${history.length} lançamento(s) no período`}</p></div><div className="flex flex-wrap items-end gap-2">{!historyDetailDate && <><label className="text-xs font-semibold">De<input type="date" className="input mt-1" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}/></label><label className="text-xs font-semibold">Até<input type="date" className="input mt-1" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}/></label><button onClick={() => { setHistoryDetailDate(""); loadHistoryRange(); }} className="btn-secondary"><Search size={17}/>Consultar</button></>}{historyDetailDate && <button onClick={() => setHistoryDetailDate("")} className="btn-secondary"><ChevronLeft size={17}/>Voltar aos dias</button>}<button onClick={() => { setEditingDailyId(""); setMode("manual"); }} className="btn-primary"><Plus size={17}/>Novo lançamento</button></div></div>{!historyDetailDate ? <div className="overflow-x-auto"><table><thead><tr><th>Data</th><th>Total diário</th><th>Detalhes</th></tr></thead><tbody>{historyDays.map(([date, rows]) => <tr key={date}><td className="whitespace-nowrap text-lg font-semibold">{date.split("-").reverse().join("/")}</td><td className="text-lg font-bold">{rows.length}</td><td><button className="row-action" onClick={() => setHistoryDetailDate(date)}>Detalhes <ChevronRight size={15}/></button></td></tr>)}{!historyDays.length && <tr><td colSpan={3} className="py-8 text-center text-slate-500">Nenhum lançamento neste período.</td></tr>}</tbody></table></div> : <div className="overflow-x-auto"><table><thead><tr><th>Frota</th><th>Placa</th><th>Equipamento</th><th>Status</th><th>Horímetro</th><th>KM</th><th>Ações</th></tr></thead><tbody>{history.filter((row) => row.entryDate === historyDetailDate).map((row) => <tr key={row.id}><td className="font-semibold">{row.fleetNumber}</td><td>{row.plate || "—"}</td><td>{row.description}</td><td><Badge tone={row.status === "M" ? "amber" : row.status === "AB" ? "blue" : "green"}>{row.status}</Badge></td><td>{row.hourmeterStart ?? "—"} → {row.hourmeterEnd ?? "—"}</td><td>{row.kilometerStart ?? "—"} → {row.kilometerEnd ?? "—"}</td><td><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editDaily(row)} className="row-action"><Pencil size={14}/> Editar</button><DeletionRequestButton companyId={companyId} module="daily_parts" entityType="daily_part" entityId={row.id} label={`Parte diária ${row.fleetNumber} • ${row.entryDate}`} snapshot={row} onSent={setMessage}/></div></td></tr>)}</tbody></table></div>}</section>}
      {mode === "history" && historyDetailDate && <div className="flex justify-end"><button onClick={() => { setForm((current) => ({ ...current, entryDate: historyDetailDate, fleetNumber: "", plate: "", maintenanceOrderNumber: "", hourmeterStart: "", hourmeterEnd: "", kilometerStart: "", kilometerEnd: "", observation: "" })); setMode("manual"); setMessage(`Novo veículo para ${historyDetailDate.split("-").reverse().join("/")}.`); }} className="btn-primary"><Plus size={17}/>Adicionar veículo neste dia</button></div>}
      <div className="grid gap-3 panel p-4 md:grid-cols-4">
        <Mini value="T" label="Trabalhando • pago" />
        <Mini value="D" label="À disposição • pago" />
        <Mini value="M" label="Manutenção • regra por O.S." />
        <Mini value="AB" label="Abono • pago sem penalização" />
      </div>
    </div>
  );
}

function MobileChecklistPage() {
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState("");
  const [equipmentRows, setEquipmentRows] = useState<any[]>([]), [equipmentId, setEquipmentId] = useState("");
  const [items, setItems] = useState<any[]>(newEntryChecklist()), [status, setStatus] = useState("draft");
  const [checklistType, setChecklistType] = useState("entry"), [observation, setObservation] = useState("");
  const [history, setHistory] = useState<any[]>([]), [message, setMessage] = useState(""), [saving, setSaving] = useState(false);
  const asset = equipmentRows.find((row) => row.id === equipmentId);
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) selectCompany(rows[0].id); }); }, []);
  async function selectCompany(id: string) { setCompanyId(id); const response = await fetch(`/api/equipment?companyId=${encodeURIComponent(id)}`), data = await response.json(); setEquipmentRows(data.equipment || []); setEquipmentId(""); setHistory([]); }
  async function selectEquipment(id: string) {
    setEquipmentId(id); setMessage(""); const selected = equipmentRows.find((row) => row.id === id); if (!selected) return;
    const [modelResponse, historyResponse] = await Promise.all([fetch(`/api/master-data?companyId=${encodeURIComponent(companyId)}&type=checklist_item`), fetch(`/api/equipment/checklists?companyId=${encodeURIComponent(companyId)}&equipmentId=${encodeURIComponent(id)}`)]);
    const modelData = await modelResponse.json(), historyData = await historyResponse.json();
    const matches = (modelData.records || []).filter((row: any) => !row.code || row.code.toLowerCase() === String(selected.equipmentType || "").toLowerCase());
    setItems((matches.length ? matches.map((row: any) => ({ label: row.name, result: "ok", observation: "", photoName: "" })) : newEntryChecklist())); setHistory(historyData.checklists || []);
  }
  function update(index: number, key: string, value: string) { setItems((rows) => rows.map((row, current) => current === index ? { ...row, [key]: value } : row)); }
  async function save() { if (!equipmentId) return setMessage("Selecione o equipamento."); setSaving(true); setMessage(""); const response = await offlineRequest("/api/equipment/checklists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, equipmentId, checklistType, status, items, observation }) }); const data = await response.json(); setSaving(false); if (!response.ok) return setMessage(data.error || "Não foi possível salvar o checklist."); setMessage("Checklist salvo e vinculado ao histórico do equipamento."); await selectEquipment(equipmentId); }
  return <div className="mx-auto max-w-3xl space-y-4">
    <section className="panel p-4 sm:p-5"><div className="mb-4 flex items-center gap-3"><div className="iconbox blue"><ClipboardCheck size={21}/></div><div><h3 className="font-black">Checklist móvel</h3><p className="text-sm text-slate-500">Preenchimento rápido pelo celular.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><FuelField label="Empresa"><select className="input mt-1" value={companyId} onChange={(e) => selectCompany(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>
<FuelField label="Equipamento • ID/frota ou placa"><select className="input mt-1" value={equipmentId} onChange={(e) => selectEquipment(e.target.value)}><option value="">Selecione</option>{equipmentRows.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"} • {row.description}</option>)}</select></FuelField>
</div>
      {asset && <div className="mt-3 grid gap-2 rounded-xl bg-blue-50 p-3 text-sm sm:grid-cols-3"><span>Tipo: <strong>{asset.equipmentType || "—"}</strong></span><span>Motorista: <strong>{asset.operatorName || "—"}</strong></span><span>Obra: <strong>{asset.projectName || "—"}</strong></span></div>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><FuelField label="Tipo do checklist"><select className="input mt-1" value={checklistType} onChange={(e) => setChecklistType(e.target.value)}><option value="entry">Entrada</option><option value="periodic">Inspeção periódica</option><option value="incident">Incidência em uso</option><option value="exit">Saída/desmobilização</option></select></FuelField>
<FuelField label="Resultado final"><select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Rascunho</option><option value="approved">Aprovado</option><option value="approved_with_notes">Aprovado com ressalva</option><option value="rejected">Reprovado</option></select></FuelField>
</div>
    </section>
    {equipmentId && <section className="space-y-3">{items.map((item, index) => <div key={`${item.label}-${index}`} className={`panel p-4 ${item.result === "nonconforming" ? "border-red-300" : ""}`}><div className="font-bold">{index + 1}. {item.label}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><select className="input" value={item.result} onChange={(e) => update(index, "result", e.target.value)}><option value="ok">Conforme</option><option value="nonconforming">Não conforme</option><option value="na">Não se aplica</option></select><input className="input" value={item.observation} onChange={(e) => update(index, "observation", e.target.value)} placeholder={item.result === "nonconforming" ? "Descreva a irregularidade" : "Observação opcional"}/></div><label className="btn-secondary mt-3 w-full justify-center"><Upload size={16}/>{item.photoName || "Adicionar foto"}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => update(index, "photoName", e.target.files?.[0]?.name || "")}/></label></div>)}</section>}
    {equipmentId && <section className="panel p-4"><FuelField label="Observação geral"><textarea className="input mt-1 min-h-24" value={observation} onChange={(e) => setObservation(e.target.value)}/></FuelField>
{message && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}<button disabled={saving} onClick={save} className="btn-primary mt-4 w-full justify-center"><CheckCircle2 size={17}/>{saving ? "Salvando..." : "Salvar checklist"}</button>{history.length > 0 && <div className="mt-4 text-xs text-slate-500">Histórico: {history.length} checklist(s). Último em {new Date(history[0].performedAt).toLocaleString("pt-BR")}.</div>}</section>}
  </div>;
}

function QuickServicesPage() {
  const empty = { entryDate: new Date().toISOString().slice(0,10), equipmentId: "", fleetNumber: "", plate: "", category: "Borracharia", serviceDescription: "", supplierName: "", driverName: "", quantity: 1, unitPrice: 0, kilometer: "", hourmeter: "", costCenter: "", requisitionNumber: "", paymentResponsibility: "company", invoiceNumber: "", observation: "" };
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState(""); const [equipmentRows, setEquipmentRows] = useState<any[]>([]), [entries, setEntries] = useState<any[]>([]);
  const [serviceSuppliers, setServiceSuppliers] = useState<any[]>([]), [serviceProducts, setServiceProducts] = useState<any[]>([]), [serviceProfessionals, setServiceProfessionals] = useState<any[]>([]), [serviceCosts, setServiceCosts] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty), [mode, setMode] = useState<"list"|"manual"|"import">("list"), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [editingQuickId, setEditingQuickId] = useState("");
  const money = (cents = 0) => (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) selectCompany(rows[0].id); }); }, []);
  async function selectCompany(id: string) { setCompanyId(id); const [assets, services, suppliersResponse, productsResponse, professionalsResponse, costsResponse] = await Promise.all([fetch(`/api/equipment?companyId=${encodeURIComponent(id)}`), fetch(`/api/quick-services?companyId=${encodeURIComponent(id)}`), fetch(`/api/suppliers?companyId=${encodeURIComponent(id)}`), fetch(`/api/products?companyId=${encodeURIComponent(id)}`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=profissional`), fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=centro_custo`)]); const a = await assets.json(), s = await services.json(), suppliersData = await suppliersResponse.json(), productsData = await productsResponse.json(), professionalsData = await professionalsResponse.json(), costsData = await costsResponse.json(); setEquipmentRows(a.equipment || []); setEntries(s.entries || []); setServiceSuppliers(suppliersData.suppliers || []); setServiceProducts(productsData.products || []); setServiceProfessionals(professionalsData.records || []); setServiceCosts(costsData.records || []); }
  function selectAsset(id: string) { const asset = equipmentRows.find((row) => row.id === id); setForm({ ...form, equipmentId: id, fleetNumber: asset?.fleetNumber || "", plate: asset?.plate || "", driverName: asset?.operatorName || "", costCenter: asset?.costCenter || "", kilometer: asset?.currentKilometer ?? "", hourmeter: asset?.currentHourmeter ?? "" }); }
  async function save(event: React.FormEvent) { event.preventDefault(); setBusy(true); const response = await offlineRequest("/api/quick-services", { method: editingQuickId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, id: editingQuickId || undefined, source: "manual", ...form }) }); const data = await response.json(); setBusy(false); if (!response.ok) return setMessage(data.error || data.errors?.[0]?.error || "Não foi possível salvar."); const generated = data.entries?.[0]?.systemNumber; setMessage(editingQuickId ? "Serviço corrigido e concluído novamente." : `O.S. ${String(generated || 0).padStart(6, "0")} criada e enviada para a apropriação.`); setForm(empty); setEditingQuickId(""); setMode("list"); await selectCompany(companyId); }
  function editQuick(row: any) { setEditingQuickId(row.id); setForm({ entryDate: row.entryDate, equipmentId: row.equipmentId, fleetNumber: row.fleetNumber, plate: row.plate || "", category: row.category, serviceDescription: row.serviceDescription, supplierName: row.supplierName || "", driverName: row.driverName || "", quantity: row.quantityMilli / 1000, unitPrice: row.unitPriceCents / 100, kilometer: row.kilometer ?? "", hourmeter: row.hourmeter ?? "", costCenter: row.costCenter || "", requisitionNumber: row.requisitionNumber || "", paymentResponsibility: row.paymentResponsibility, invoiceNumber: row.invoiceNumber || "", observation: row.observation || "" }); setMode("manual"); }
  async function importFile(file?: File) { if (!file) return; setBusy(true); const XLSX = await import("xlsx"), book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true }); const rows = XLSX.utils.sheet_to_json<any>(book.Sheets[book.SheetNames[0]], { defval: "" }).map((row: any) => ({ entryDate: row.DATA instanceof Date ? row.DATA.toISOString().slice(0,10) : String(row.DATA || row.Data || "").split("/").reverse().join("-"), fleetNumber: String(row.ID || row.FROTA || ""), plate: String(row.PLACA || ""), category: row.CATEGORIA || "Borracharia", serviceDescription: row.SERVICO || row.DESCRICAO || "", supplierName: row.FORNECEDOR || "", driverName: row.MOTORISTA || "", quantity: Number(row.QUANTIDADE || 1), unitPrice: Number(row.VALOR_UNITARIO || row.VALOR || 0), kilometer: row.KM || "", hourmeter: row.HORIMETRO || "", costCenter: row.CENTRO_CUSTO || "", requisitionNumber: row.REQUISICAO || "", paymentResponsibility: String(row.PAGAMENTO || "").toLowerCase().includes("locador") ? "lessor" : "company", invoiceNumber: row.NF || "", observation: row.OBSERVACAO || "" })); const response = await offlineRequest("/api/quick-services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, source: "spreadsheet", fileName: file.name, entries: rows }) }); const data = await response.json(); setBusy(false); setMessage(`${data.inserted || 0} registro(s) importado(s). ${data.errors?.length || 0} divergência(s).`); await selectCompany(companyId); setMode("list"); }
  function downloadModel() { const headers = [["DATA","ID","PLACA","CATEGORIA","SERVICO","FORNECEDOR","MOTORISTA","QUANTIDADE","VALOR_UNITARIO","KM","HORIMETRO","CENTRO_CUSTO","REQUISICAO","PAGAMENTO","NF","OBSERVACAO"]]; import("xlsx").then((XLSX) => { const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(headers), "SERVICOS_RAPIDOS"); XLSX.writeFile(book, "MODELO_SERVICOS_RAPIDOS.xlsx"); }); }
  return <div className="space-y-4"><section className="panel p-4"><div className="flex flex-wrap items-end justify-between gap-3"><FuelField label="Empresa"><select className="input mt-1 min-w-64" value={companyId} onChange={(e) => selectCompany(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>
<div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={downloadModel}><Download size={17}/>Baixar modelo</button><button className="btn-secondary" onClick={() => setMode("import")}><Upload size={17}/>Importar planilha</button><button className="btn-primary" onClick={() => { setEditingQuickId(""); setForm(empty); setMode("manual"); }}><Plus size={17}/>Novo serviço</button></div></div>{message && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}</section>
    <datalist id="quick-service-products">{serviceProducts.map((row) => <option key={row.id} value={row.name}>{row.category || "Serviço cadastrado"}</option>)}</datalist><datalist id="quick-service-suppliers">{serviceSuppliers.map((row) => <option key={row.id} value={row.name}>{row.taxId || "Fornecedor cadastrado"}</option>)}</datalist><datalist id="quick-service-professionals">{serviceProfessionals.map((row) => <option key={row.id} value={row.name}>{row.code || "Profissional cadastrado"}</option>)}</datalist><datalist id="quick-service-costs">{serviceCosts.map((row) => <option key={row.id} value={row.name}>{row.code || "Centro de custo"}</option>)}</datalist>
    {mode === "import" && <section className="panel p-5"><label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center"><Upload className="text-blue-700"/><span className="mt-2 font-semibold">Escolher planilha de serviços rápidos</span><span className="text-xs text-slate-500">Identificação por ID/frota ou placa</span><input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importFile(e.target.files?.[0])}/></label></section>}
    {mode === "manual" && <form onSubmit={save} className="panel p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Número da O.S."><input className="input mt-1 bg-slate-50 font-bold" value={editingQuickId ? String(entries.find((row) => row.id === editingQuickId)?.systemNumber || "").padStart(6, "0") : "Automático ao salvar"} readOnly/></FuelField><FuelField label="Data"><input required type="date" className="input mt-1" value={form.entryDate} onChange={(e) => setForm({...form,entryDate:e.target.value})}/></FuelField>
<FuelField label="Equipamento • ID ou placa"><select required className="input mt-1" value={form.equipmentId} onChange={(e) => selectAsset(e.target.value)}><option value="">Selecione</option>{equipmentRows.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"}</option>)}</select></FuelField>
<FuelField label="Categoria"><select className="input mt-1" value={form.category} onChange={(e) => setForm({...form,category:e.target.value})}><option>Borracharia</option><option>Lava-jato</option><option>Lubrificação</option><option>Outro serviço recorrente</option></select></FuelField>
<FuelField label="Serviço"><input required list="quick-service-products" className="input mt-1" value={form.serviceDescription} onChange={(e) => setForm({...form,serviceDescription:e.target.value})} placeholder="Selecione um serviço"/></FuelField>
<FuelField label="Fornecedor"><input list="quick-service-suppliers" className="input mt-1" value={form.supplierName} onChange={(e) => setForm({...form,supplierName:e.target.value})} placeholder="Selecione um fornecedor"/></FuelField>
<FuelField label="Motorista"><input list="quick-service-professionals" className="input mt-1" value={form.driverName} onChange={(e) => setForm({...form,driverName:e.target.value})} placeholder="Selecione um condutor"/></FuelField>
<FuelField label="Quantidade"><input type="number" min="0.001" step="0.001" className="input mt-1" value={form.quantity} onChange={(e) => setForm({...form,quantity:Number(e.target.value)})}/></FuelField>
<FuelField label="Valor unitário"><input type="number" min="0" step="0.01" className="input mt-1" value={form.unitPrice} onChange={(e) => setForm({...form,unitPrice:Number(e.target.value)})}/></FuelField>
<FuelField label="KM"><input type="number" className="input mt-1" value={form.kilometer} onChange={(e) => setForm({...form,kilometer:e.target.value})}/></FuelField>
<FuelField label="Horímetro"><input type="number" className="input mt-1" value={form.hourmeter} onChange={(e) => setForm({...form,hourmeter:e.target.value})}/></FuelField>
<FuelField label="Centro de custo"><input list="quick-service-costs" className="input mt-1" value={form.costCenter} onChange={(e) => setForm({...form,costCenter:e.target.value})} placeholder="Selecione um cadastro"/></FuelField>
<FuelField label="Requisição / O.S."><input className="input mt-1" value={form.requisitionNumber} onChange={(e) => setForm({...form,requisitionNumber:e.target.value})}/></FuelField>
<FuelField label="Pagamento"><select className="input mt-1" value={form.paymentResponsibility} onChange={(e) => setForm({...form,paymentResponsibility:e.target.value})}><option value="company">Empresa • custo da obra</option><option value="lessor">Locador • reembolso</option></select></FuelField>
<FuelField label="Nota fiscal"><input className="input mt-1" value={form.invoiceNumber} onChange={(e) => setForm({...form,invoiceNumber:e.target.value})}/></FuelField>
</div><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setMode("list")}>Cancelar</button><button disabled={busy} className="btn-primary">{busy ? "Salvando..." : "Confirmar serviço"}</button></div></form>}
    {mode === "list" && <section className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[1350px]"><thead><tr><th>O.S.</th><th>Data</th><th>ID / placa</th><th>Categoria</th><th>Serviço</th><th>Fornecedor</th><th>Motorista</th><th>Centro de custo</th><th>Pagamento</th><th className="text-right">Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{entries.map((row) => <tr key={row.id}><td className="font-bold text-blue-800">{String(row.systemNumber || 0).padStart(6, "0")}</td><td>{String(row.entryDate).split("-").reverse().join("/")}</td><td className="font-semibold">{row.fleetNumber} • {row.plate || "—"}</td><td>{row.category}</td><td>{row.serviceDescription}</td><td>{row.supplierName || "—"}</td><td>{row.driverName || "—"}</td><td>{row.costCenter || "—"}</td><td><Badge tone={row.paymentResponsibility === "lessor" ? "amber" : "blue"}>{row.paymentResponsibility === "lessor" ? "Reembolso" : "Custo da obra"}</Badge></td><td className="text-right font-semibold">{money(row.totalCents)}</td><td><Badge tone={row.status === "draft" ? "amber" : "green"}>{row.status === "draft" ? "Reaberto" : "Concluído"}</Badge></td><td><div className="flex flex-wrap gap-2">{row.status === "draft" ? <button onClick={() => editQuick(row)} className="row-action"><Pencil size={14}/>Alterar</button> : <ReopenRequestButton companyId={companyId} module="quick_services" entityType="quick_service" entityId={row.id} label={`O.S. ${String(row.systemNumber || 0).padStart(6, "0")} • ${row.category}`} snapshot={row} onSent={setMessage}/>}<DeletionRequestButton companyId={companyId} module="maintenance" entityType="quick_service" entityId={row.id} label={`O.S. ${String(row.systemNumber || 0).padStart(6, "0")} • ${row.category}`} snapshot={row} onSent={(text) => { setMessage(text); selectCompany(companyId); }}/></div></td></tr>)}{!entries.length && <tr><td colSpan={12} className="py-10 text-center text-slate-500">Nenhum serviço rápido lançado.</td></tr>}</tbody></table></div></section>}
  </div>;
}

function WorksPage() {
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState(""), [records, setRecords] = useState<any[]>([]); const [open, setOpen] = useState(false), [message, setMessage] = useState("");
  const [form, setForm] = useState({ code: "", name: "", client: "", contract: "", city: "", state: "PI", startsAt: "", endsAt: "", responsible: "", status: "Ativa", fronts: "", costCenters: "" });
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows=data.companies||[]; setCompanies(rows); if(rows[0]) selectCompany(rows[0].id); }); }, []);
  async function selectCompany(id:string){setCompanyId(id); const response=await fetch(`/api/master-data?companyId=${encodeURIComponent(id)}&type=obra`),data=await response.json(); setRecords(data.records||[]);}
  async function save(e:React.FormEvent){e.preventDefault(); const description=JSON.stringify(form); const response=await offlineRequest("/api/master-data",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({companyId,type:"obra",code:form.code,name:form.name,description})}); const data=await response.json(); if(!response.ok)return setMessage(data.error||"Não foi possível cadastrar a obra."); setMessage("Obra cadastrada com frentes e centros de custo informados."); setOpen(false); setForm({ code:"",name:"",client:"",contract:"",city:"",state:"PI",startsAt:"",endsAt:"",responsible:"",status:"Ativa",fronts:"",costCenters:""}); await selectCompany(companyId);}
  return <div className="space-y-4"><section className="panel p-4"><div className="flex flex-wrap items-end justify-between gap-3"><FuelField label="Empresa"><select className="input mt-1 min-w-64" value={companyId} onChange={(e)=>selectCompany(e.target.value)}>{companies.map((row)=><option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>
<button className="btn-primary" onClick={()=>setOpen(!open)}><Plus size={17}/>{open?"Fechar cadastro":"Nova obra"}</button></div>{message&&<div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">{message}</div>}</section>{open&&<form onSubmit={save} className="panel p-5"><h3 className="font-black">Cadastro da obra / projeto</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Código"><input required className="input mt-1" value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})}/></FuelField>
<FuelField label="Nome da obra"><input required className="input mt-1" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></FuelField>
<FuelField label="Cliente"><input className="input mt-1" value={form.client} onChange={(e)=>setForm({...form,client:e.target.value})}/></FuelField>
<FuelField label="Contrato da obra"><input className="input mt-1" value={form.contract} onChange={(e)=>setForm({...form,contract:e.target.value})}/></FuelField>
<FuelField label="Cidade"><input className="input mt-1" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></FuelField>
<FuelField label="UF"><select className="input mt-1" value={form.state} onChange={(e)=>setForm({...form,state:e.target.value})}>{["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf)=><option key={uf}>{uf}</option>)}</select></FuelField>
<FuelField label="Início"><input type="date" className="input mt-1" value={form.startsAt} onChange={(e)=>setForm({...form,startsAt:e.target.value})}/></FuelField>
<FuelField label="Final"><input type="date" className="input mt-1" value={form.endsAt} onChange={(e)=>setForm({...form,endsAt:e.target.value})}/></FuelField>
<FuelField label="Responsável"><input className="input mt-1" value={form.responsible} onChange={(e)=>setForm({...form,responsible:e.target.value})}/></FuelField>
<FuelField label="Situação"><select className="input mt-1" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}><option>Mobilização</option><option>Ativa</option><option>Suspensa</option><option>Concluída</option></select></FuelField>
<FuelField label="Frentes de serviço"><input className="input mt-1" value={form.fronts} onChange={(e)=>setForm({...form,fronts:e.target.value})} placeholder="Separe por vírgula"/></FuelField>
<FuelField label="Centros de custo"><input className="input mt-1" value={form.costCenters} onChange={(e)=>setForm({...form,costCenters:e.target.value})} placeholder="Separe por vírgula"/></FuelField>
</div><div className="mt-4 flex justify-end"><button className="btn-primary">Cadastrar obra</button></div></form>}<section className="panel overflow-hidden"><div className="overflow-x-auto"><table><thead><tr><th>Código</th><th>Obra / projeto</th><th>Cliente</th><th>Localização</th><th>Vigência</th><th>Situação</th></tr></thead><tbody>{records.map((row)=>{let d:any={};try{d=JSON.parse(row.description||"{}")}catch{}return <tr key={row.id}><td className="font-semibold">{row.code||"—"}</td><td>{row.name}</td><td>{d.client||"—"}</td><td>{[d.city,d.state].filter(Boolean).join("/")||"—"}</td><td>{d.startsAt||"—"} a {d.endsAt||"—"}</td><td><Badge tone={d.status==="Ativa"?"green":"amber"}>{d.status||"Ativa"}</Badge></td></tr>})}{!records.length&&<tr><td colSpan={6} className="py-10 text-center text-slate-500">Nenhuma obra cadastrada nesta empresa.</td></tr>}</tbody></table></div></section></div>;
}

function Appropriation({ setModal }: { setModal: (s: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState("");
  const [equipmentRows, setEquipmentRows] = useState<any[]>([]), [equipmentId, setEquipmentId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [movementType, setMovementType] = useState<"normal" | "mobilization" | "demobilization">("normal");
  const competencePeriod = (month: string) => { const [year, number] = month.split("-").map(Number), previous = new Date(Date.UTC(year, number - 2, 21)); return { start: previous.toISOString().slice(0, 10), end: `${month}-20` }; };
  const initialPeriod = competencePeriod(referenceMonth);
  const [periodStart, setPeriodStart] = useState(initialPeriod.start), [periodEnd, setPeriodEnd] = useState(initialPeriod.end);
  const [data, setData] = useState<any | null>(null), [message, setMessage] = useState(""), [generalObservation, setGeneralObservation] = useState(""), [showManualAdjustment, setShowManualAdjustment] = useState(false);
  const [maintenanceGraceDays, setMaintenanceGraceDays] = useState(1), [savingMaintenanceRule, setSavingMaintenanceRule] = useState(false);
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((json) => { const rows = json.companies || []; setCompanies(rows); if (rows[0]) { setCompanyId(rows[0].id); loadEquipment(rows[0].id); loadMaintenanceRule(rows[0].id); } }); }, []);
  async function loadEquipment(id: string) {
    const response = await fetch(`/api/equipment?companyId=${encodeURIComponent(id)}`), json = await response.json();
    const rows = [...(json.equipment || [])].sort((a, b) =>
      String(a.fleetNumber || "").localeCompare(String(b.fleetNumber || ""), "pt-BR", { numeric: true, sensitivity: "base" })
    );
    setEquipmentRows(rows); setEquipmentId(rows[0]?.id || ""); setData(null);
  }
  async function loadMaintenanceRule(id: string) { const response = await fetch(`/api/maintenance-rule?companyId=${encodeURIComponent(id)}`), json = await response.json(); if (response.ok) setMaintenanceGraceDays(Number(json.graceDays ?? 2)); }
  async function saveMaintenanceRule() { if (!companyId) return; setSavingMaintenanceRule(true); const response = await fetch("/api/maintenance-rule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, graceDays: maintenanceGraceDays }) }), json = await response.json(); setSavingMaintenanceRule(false); setMessage(response.ok ? `${json.message} A partir do ${json.discountStartsOnDay}º dia contínuo, todos os dias do período serão descontados.` : json.error || "Não foi possível atualizar a regra."); if (response.ok) setData(null); }
  async function generate() { if (!companyId || !equipmentId) return setMessage("Selecione a empresa e o equipamento."); setMessage("Calculando..."); const response = await fetch(`/api/appropriation?companyId=${encodeURIComponent(companyId)}&equipmentId=${encodeURIComponent(equipmentId)}&referenceMonth=${referenceMonth}&periodStart=${periodStart}&periodEnd=${periodEnd}&movementType=${movementType}`), json = await response.json(); if (!response.ok) { setData(null); return setMessage(json.error || "Não foi possível calcular a apropriação."); } setData(json); setMessage(""); }
  const money = (cents = 0) => (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const ap = data?.appropriation, financial = data?.maintenanceFinancial, fuelSummary = data?.fuel, quickSummary = data?.quickServices;
  function printAppropriation() {
    if (!data) return;
    const esc = (value: any) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
    const dateLabel = (value: string) => value?.split("-").reverse().join("/") || "—";
    const dates: string[] = []; const cursor = new Date(`${periodStart}T00:00:00Z`), last = new Date(`${periodEnd}T00:00:00Z`);
    while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const dailyByDate = new Map((data.dailyEntries || []).map((row: any) => [row.entryDate, row]));
    const fuelsByDate = new Map<string, any>();
    for (const row of data.fuel?.entries || []) { const current = fuelsByDate.get(row.entryDate) || { litersMilli: 0, totalCents: 0, stations: [] as string[] }; current.litersMilli += Number(row.litersMilli || 0); current.totalCents += Number(row.totalCents || 0); if (row.station && !current.stations.includes(row.station)) current.stations.push(row.station); fuelsByDate.set(row.entryDate, current); }
    const servicesByDate = new Map<string, any[]>();
    for (const row of data.maintenanceFinancial?.items || []) { const day = row.closedAt; if (!day) continue; servicesByDate.set(day, [...(servicesByDate.get(day) || []), row]); }
    const rows = dates.map((day) => { const entry: any = dailyByDate.get(day), fuel = fuelsByDate.get(day), services = servicesByDate.get(day) || []; const start = entry?.kilometerStart ?? entry?.hourmeterStart, end = entry?.kilometerEnd ?? entry?.hourmeterEnd; const total = start != null && end != null ? Number(end) - Number(start) : ""; const serviceTotal = services.reduce((sum: number, row: any) => sum + Number(row.totalCents || 0), 0); const serviceText = services.map((row: any) => `${row.orderNumber} ${row.productService}`).join("; "); return `<tr><td>${dateLabel(day).slice(0,5)}</td><td>${weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()]}</td><td>${esc(entry?.status || "")}</td><td>${esc(start ?? "")}</td><td>${esc(end ?? "")}</td><td>${esc(total)}</td><td>${fuel ? (fuel.litersMilli / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : ""}</td><td>${fuel?.litersMilli ? money(Math.round(fuel.totalCents * 1000 / fuel.litersMilli)) : ""}</td><td>${fuel ? money(fuel.totalCents) : ""}</td><td>${esc(fuel?.stations?.join(", ") || "")}</td><td>${esc(serviceText)}</td><td>${serviceTotal ? money(serviceTotal) : ""}</td><td>${services.map((row: any) => row.invoiceNumber).filter(Boolean).join(", ")}</td><td>${services.some((row: any) => row.paymentResponsibility === "lessor") ? "LOCADOR" : services.length ? "POWERCHINA" : ""}</td></tr>`; }).join("");
    const totalKm = (data.dailyEntries || []).reduce((sum: number, row: any) => { const start = row.kilometerStart ?? row.hourmeterStart, end = row.kilometerEnd ?? row.hourmeterEnd; return sum + (start != null && end != null ? Number(end) - Number(start) : 0); }, 0);
    const liters = Number(data.fuel?.entries?.reduce((sum: number, row: any) => sum + Number(row.litersMilli || 0), 0) || 0) / 1000;
    const fuelAverage = liters ? Number(data.fuel.totalCents || 0) / 100 / liters : 0;
    const reimbursement = Number(data.maintenanceFinancial?.reimbursementCents || 0) + Number(data.quickServices?.reimbursementCents || 0);
    const tireWash = Number(data.maintenanceFinancial?.tireWashLubricationCents || 0) + Number(data.quickServices?.tireCents || 0) + Number(data.quickServices?.washCents || 0);
    const companyParts = Number(data.maintenanceFinancial?.partsServicesCents || 0);
    const otherDiscounts = Number(data.maintenanceFinancial?.lessorChargeCents || 0);
    const totalDiscounts = Number(ap.discountCents || 0) + otherDiscounts;
    const totalGross = Number(ap.payableCents || 0) + Number(data.movement?.valueCents || 0) + reimbursement + Number(data.fuel?.totalCents || 0) + tireWash + companyParts;
    const company = companies.find((row) => row.id === companyId);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Apropriação ${esc(data.equipment.fleetNumber)} - ${esc(referenceMonth)}</title><style>@page{size:A4 portrait;margin:4mm}*{box-sizing:border-box}html,body{width:202mm;height:289mm;overflow:hidden}body{margin:0;color:#000;font-family:Arial,"Microsoft YaHei",sans-serif;font-size:6.05pt}.sheet{width:202mm;height:287mm;margin:auto;border:1px solid #000;overflow:hidden;break-inside:avoid;page-break-inside:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #000;padding:1.1px 2px;vertical-align:middle;line-height:1.05}th{background:#fff;font-weight:700;text-align:center}.title{font-size:9pt;font-weight:800;text-align:center}.logo{width:34mm;height:11mm;object-fit:contain}.label{font-weight:700}.center{text-align:center}.right{text-align:right}.gray{background:#d9d9d9}.section{font-size:7.5pt;font-weight:800;text-align:center}.daily{font-size:5.4pt}.daily th{font-size:5.2pt}.daily td{height:4.1mm;text-align:center}.summary{font-size:5.8pt}.summary td{height:4.1mm}.total{font-size:10pt;font-weight:900}.sign td{height:17mm;text-align:center;vertical-align:bottom}.signline{display:block;margin:0 auto 2px;width:72%;border-top:1px solid #000}.nowrap{white-space:nowrap}.small{font-size:5.2pt}</style></head><body><div class="sheet"><table><tr><td style="width:28%" class="center"><img class="logo" src="${location.origin}/assets/powerchina-logo-000.jpg"></td><td colspan="5" class="title">CONTROLE DE APROPRIAÇÃO DE VEÍCULO E/OU EQUIPAMENTO 车辆和/或设备占用控制</td></tr><tr><td class="label">OBRA 工作</td><td colspan="3">${esc(data.equipment.projectName || company?.tradeName || "—")}</td><td class="label">SUPERVISOR 导师</td><td>—</td></tr><tr><td class="label">FRENTE DE TRABALHO 施工区域</td><td colspan="3">${esc(data.equipment.frontName || "—")}</td><td class="label">ENCARREGADO 现任</td><td>—</td></tr><tr><td class="label">DESCRIÇÃO DO EQUIPAMENTO 设备描述</td><td colspan="2">${esc(data.equipment.description)}</td><td><span class="label">COMB. TIPO 燃料类型</span><br>${esc(data.equipment.fuelType || "—")}</td><td><span class="label">PERÍODO 月份</span><br>${dateLabel(periodStart)} a ${dateLabel(periodEnd)}</td><td><span class="label">DATA 打印日期</span><br>${new Date().toLocaleDateString("pt-BR")}</td></tr><tr><td class="label">VALOR DA LOCAÇÃO 月租</td><td>${money(ap.monthlyRentCents)}</td><td><span class="label">VALOR UNI. 单位价值</span><br>${money(ap.dailyValueCents)}</td><td><span class="label">PLACA 车牌号</span><br>${esc(data.equipment.plate || "—")}</td><td class="label">VALOR S. COMPRA 购买价值</td><td>${money(ap.monthlyRentCents)}</td></tr><tr><td class="label">LOCADOR 公司</td><td>${esc(data.contract?.supplierName || data.equipment.lessorName || "—")}</td><td class="label">Nº FROTA 舰队数量</td><td class="center total">${esc(data.equipment.fleetNumber)}</td><td class="label">CANTEIRO 工地</td><td>${esc(data.equipment.costCenter || "—")}</td></tr><tr><td class="label">MOTORISTA 司机/操作工</td><td>${esc(data.equipment.operatorName || "—")}</td><td class="label">INÍCIO CONTRATO 合同起始日</td><td>${dateLabel(data.contract?.itemStartsAt)}</td><td class="label">RESC. CONTRATO 合同终止</td><td>${dateLabel(data.contract?.itemEndsAt)}</td></tr></table><table class="daily"><colgroup><col style="width:5%"><col style="width:4%"><col style="width:3.5%"><col style="width:5.5%"><col style="width:5.5%"><col style="width:4.5%"><col style="width:5.5%"><col style="width:5.5%"><col style="width:6.5%"><col style="width:11%"><col style="width:19%"><col style="width:7%"><col style="width:5%"><col style="width:7.5%"></colgroup><thead><tr><th rowspan="2">DIA<br>天</th><th rowspan="2">SEM.<br>星期</th><th rowspan="2">TRAB.<br>工作</th><th colspan="3">QUILOMETRAGEM / HORÍMETRO 公里数</th><th colspan="4">ABASTECIMENTO 供应</th><th colspan="4">OUTROS SERVIÇOS 其他服务</th></tr><tr><th>INICIAL<br>开始</th><th>FINAL<br>结束</th><th>TOTAL<br>公里/小时</th><th>LITROS<br>升</th><th>UNIT.<br>单位价值</th><th>VALOR<br>价格</th><th>LOCAL<br>地点</th><th>DISCRIMINAÇÃO<br>歧视</th><th>VALOR<br>价格</th><th>NF<br>帐户</th><th>PAGTO<br>支付</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="gray"><td colspan="3">CÓD: ${esc(data.equipment.fleetNumber)}</td><td colspan="2" class="label">TOTAL Km/Hr</td><td>${totalKm}</td><td>${liters.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</td><td></td><td>${money(data.fuel?.totalCents)}</td><td></td><td class="label">TOTAL</td><td>${money((data.maintenanceFinancial?.items || []).reduce((sum: number,row: any)=>sum+Number(row.totalCents||0),0))}</td><td colspan="2"></td></tr></tfoot></table><table class="summary"><tr><td colspan="6" class="section">RESUMO DA MEDIÇÃO 测量摘要</td></tr><tr><td class="label">DIAS TRABALHADOS 工作天数</td><td class="center">${ap.counts.T}</td><td class="right">${money(ap.counts.T * ap.dailyValueCents)}</td><td colspan="3" class="section gray">RESUMO DE CONSUMO 消费总结</td></tr><tr><td class="label">DIAS À DISPOSIÇÃO 可用天数</td><td class="center">${ap.counts.D}</td><td class="right">${money(ap.counts.D * ap.dailyValueCents)}</td><td class="label">QUILOMETRAGEM MÊS 每月里程数</td><td colspan="2" class="right">${totalKm}</td></tr><tr><td class="label">DIAS EM MANUTENÇÃO 维护天数</td><td class="center">${ap.counts.M}</td><td class="right">${money(ap.discountCents)}</td><td class="label">COMBUSTÍVEL / LITRO 燃料/升</td><td colspan="2" class="right">${liters.toLocaleString("pt-BR")}</td></tr><tr><td class="label">TOTAL DE DIAS</td><td class="center">${ap.paidDays}</td><td class="right">${money(ap.payableCents)}</td><td class="label">MÉDIA HO / KM</td><td colspan="2" class="right">${liters ? (totalKm / liters).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "0"}</td></tr><tr><td class="label">REEMBOLSO DE AVARIAS 维修报销</td><td></td><td class="right">${money(reimbursement)}</td><td class="label">VL CONSUMO COMBUSTÍVEL 燃油费</td><td colspan="2" class="right">${money(data.fuel?.totalCents)}</td></tr><tr><td class="label">MÃO DE OBRA 外包劳务</td><td></td><td class="right">${money(0)}</td><td class="label">MÉDIA LITRO COMBUSTÍVEL 平均每升燃料</td><td colspan="2" class="right">${fuelAverage.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr><tr><td class="label">BORRACHARIA / LAVAJATO / LUBRIFICAÇÃO</td><td></td><td class="right">${money(tireWash)}</td><td class="label">CUSTO MÉDIO DIÁRIO 平均每日费用</td><td colspan="2" class="right">${money(Math.round(totalGross / 30))}</td></tr><tr><td class="label">MOBILIZAÇÃO / DESMOBILIZAÇÃO 动员/复员费</td><td></td><td class="right">${money(data.movement?.valueCents)}</td><td colspan="3" rowspan="5"><strong>OBSERVAÇÕES GERAIS 一般观察</strong><br><span class="small"></span></td></tr><tr class="gray"><td colspan="3" class="section">DESCONTOS 折扣</td></tr><tr><td class="label">OUTROS DESCONTOS 其他折扣</td><td></td><td class="right">${money(otherDiscounts)}</td></tr><tr><td class="label">PEÇAS / SERVIÇOS 零件/服务</td><td></td><td class="right">${money(companyParts)}</td></tr><tr><td class="label">TOTAL DE DESCONTOS 总折扣</td><td></td><td class="right">${money(totalDiscounts)}</td></tr><tr><td class="label">TOTAL BRUTO 累计</td><td></td><td class="right">${money(totalGross)}</td><td colspan="3"></td></tr><tr><td colspan="2" class="total">TOTAL LÍQUIDO A FATURAR 净值</td><td class="right total">${money(data.totals.lessorInvoiceCents)}</td><td colspan="3"></td></tr></table><table class="sign"><tr><td><span class="signline"></span>Apropriador - 运输助理</td><td><span class="signline"></span>Supervisor - 运输负责人</td><td><span class="signline"></span>Supervisor Manutenção - 维护主管</td></tr><tr><td><span class="signline"></span>Gerente BR - 商业关系经理</td><td><span class="signline"></span>Gerente Chinês - 中方经理</td><td><span class="signline"></span>Locador - 供应商</td></tr></table></div><script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script></body></html>`;
    const printableHtml = html
      .replace(`<td class="label">VALOR S. COMPRA 购买价值</td><td>${money(ap.monthlyRentCents)}</td>`, `<td class="label">VALOR S. COMPRA 购买价值</td><td class="right total">${money(data.totals.lessorInvoiceCents)}</td>`)
      .replace(`<td class="label">TOTAL BRUTO 累计</td><td></td><td class="right">${money(totalGross)}</td><td colspan="3"></td>`, `<td class="label">TOTAL BRUTO 累计</td><td></td><td class="right">${money(totalGross)}</td><td class="label">VALOR TOTAL DO CONTRATO 合同总额</td><td colspan="2" class="right">${data.contract ? money(data.contract.contractTotalCents) : "—"}</td>`)
      .replace(`<td colspan="2" class="total">TOTAL LÍQUIDO A FATURAR 净值</td><td class="right total">${money(data.totals.lessorInvoiceCents)}</td><td colspan="3"></td>`, `<td colspan="2" class="total">TOTAL LÍQUIDO A FATURAR 净值</td><td class="right total">${money(data.totals.lessorInvoiceCents)}</td><td class="label">SALDO DO CONTRATO APÓS ESTA APROPRIAÇÃO 合同余额</td><td colspan="2" class="right total">${data.contract ? money(data.totals.contractBalanceAfterCents) : "—"}</td>`)
      .replace(`<strong>OBSERVAÇÕES GERAIS 一般观察</strong><br><span class="small"></span>`, `<strong>OBSERVAÇÕES GERAIS 一般观察</strong><br><span class="small">${esc(generalObservation).replace(/\n/g, "<br>")}</span>`);
    const printWindow = window.open("", "_blank", "width=900,height=1100"); if (!printWindow) return setMessage("Permita a abertura da janela de impressão no navegador."); printWindow.document.open(); printWindow.document.write(printableHtml); printWindow.document.close();
  }
  async function exportAppropriationExcel() {
    if (!data) return;
    const ExcelJS: any = await import("exceljs");
    const dates: string[] = [], cursor = new Date(`${periodStart}T00:00:00Z`), last = new Date(`${periodEnd}T00:00:00Z`);
    while (cursor <= last) { dates.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); }
    const dailyByDate = new Map((data.dailyEntries || []).map((row: any) => [row.entryDate, row]));
    const fuelsByDate = new Map<string, any>();
    for (const row of data.fuel?.entries || []) { const current = fuelsByDate.get(row.entryDate) || { litersMilli: 0, totalCents: 0, stations: [] as string[] }; current.litersMilli += Number(row.litersMilli || 0); current.totalCents += Number(row.totalCents || 0); if (row.station && !current.stations.includes(row.station)) current.stations.push(row.station); fuelsByDate.set(row.entryDate, current); }
    const servicesByDate = new Map<string, any[]>();
    for (const row of data.maintenanceFinancial?.items || []) { if (!row.closedAt) continue; servicesByDate.set(row.closedAt, [...(servicesByDate.get(row.closedAt) || []), row]); }
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet("MEDIÇÃO", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.15, right: 0.15, top: 0.2, bottom: 0.2, header: 0, footer: 0 } } });
    sheet.views = [{ showGridLines: false }];
    const widths = [7, 7, 7, 10, 10, 10, 10, 10, 11, 18, 30, 12, 10, 13]; widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    const mergeValue = (range: string, value: any) => { sheet.mergeCells(range); sheet.getCell(range.split(":")[0]).value = value; };
    mergeValue("A1:D2", "POWERCHINA\nSEPCO1 CONSTRUÇÕES DO BRASIL LTDA"); mergeValue("E1:N2", "CONTROLE DE APROPRIAÇÃO DE VEÍCULO E/OU EQUIPAMENTO 车辆和/或设备占用控制");
    mergeValue("A3:B3", "OBRA 工作"); mergeValue("C3:J3", data.equipment.projectName || companies.find((row) => row.id === companyId)?.tradeName || "—"); mergeValue("K3:L3", "SUPERVISOR 导师"); mergeValue("M3:N3", "—");
    mergeValue("A4:B4", "FRENTE DE TRABALHO 施工区域"); mergeValue("C4:J4", data.equipment.frontName || "—"); mergeValue("K4:L4", "ENCARREGADO 现任"); mergeValue("M4:N4", "—");
    mergeValue("A5:D5", "DESCRIÇÃO DO EQUIPAMENTO 设备描述"); mergeValue("E5:H5", data.equipment.description); mergeValue("I5:J5", `COMB. TIPO 燃料类型\n${data.equipment.fuelType || "—"}`); mergeValue("K5:L5", `PERÍODO 月份\n${periodStart.split("-").reverse().join("/")} a ${periodEnd.split("-").reverse().join("/")}`); mergeValue("M5:N5", `DATA 打印日期\n${new Date().toLocaleDateString("pt-BR")}`);
    mergeValue("A6:C6", "VALOR DA LOCAÇÃO 月租"); sheet.getCell("D6").value = ap.monthlyRentCents / 100; mergeValue("E6:F6", "VALOR UNI. 单位价值"); sheet.getCell("G6").value = ap.dailyValueCents / 100; mergeValue("H6:I6", "PLACA 车牌号"); sheet.getCell("J6").value = data.equipment.plate || "—"; mergeValue("K6:L6", "VALOR S. COMPRA 购买价值"); mergeValue("M6:N6", Number(data.totals.lessorInvoiceCents || 0) / 100);
    mergeValue("A7:C7", "LOCADOR 公司"); mergeValue("D7:F7", data.contract?.supplierName || data.equipment.lessorName || "—"); mergeValue("G7:H7", "Nº FROTA 舰队数量"); mergeValue("I7:J7", data.equipment.fleetNumber); mergeValue("K7:L7", "CANTEIRO 工地"); mergeValue("M7:N7", data.equipment.costCenter || "—");
    mergeValue("A8:C8", "MOTORISTA 司机/操作工"); mergeValue("D8:F8", data.equipment.operatorName || "—"); mergeValue("G8:H8", "INÍCIO CONTRATO 合同起始日"); mergeValue("I8:J8", data.contract?.itemStartsAt?.split("-").reverse().join("/") || "—"); mergeValue("K8:L8", "RESC. CONTRATO 合同终止"); mergeValue("M8:N8", data.contract?.itemEndsAt?.split("-").reverse().join("/") || "—");
    mergeValue("A9:A10", "DIA\n天"); mergeValue("B9:B10", "SEM.\n星期"); mergeValue("C9:C10", "TRAB.\n工作"); mergeValue("D9:F9", "QUILOMETRAGEM / HORÍMETRO 公里数"); mergeValue("G9:J9", "ABASTECIMENTO 供应"); mergeValue("K9:N9", "OUTROS SERVIÇOS 其他服务");
    ["INICIAL\n开始", "FINAL\n结束", "TOTAL\n公里/小时", "LITROS\n升", "UNIT.\n单位价值", "VALOR\n价格", "LOCAL\n地点", "DISCRIMINAÇÃO\n歧视", "VALOR\n价格", "NF\n帐户", "PAGTO\n支付"].forEach((value, index) => { sheet.getCell(10, index + 4).value = value; });
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    let rowNumber = 11, totalKm = 0, totalLiters = 0, totalFuel = 0, totalServices = 0;
    for (const day of dates) {
      const entry: any = dailyByDate.get(day), fuel = fuelsByDate.get(day), services = servicesByDate.get(day) || [];
      const start = entry?.kilometerStart ?? entry?.hourmeterStart, end = entry?.kilometerEnd ?? entry?.hourmeterEnd;
      const distance = start != null && end != null ? Number(end) - Number(start) : 0, liters = Number(fuel?.litersMilli || 0) / 1000, fuelValue = Number(fuel?.totalCents || 0) / 100, serviceValue = services.reduce((sum: number, row: any) => sum + Number(row.totalCents || 0), 0) / 100;
      totalKm += distance; totalLiters += liters; totalFuel += fuelValue; totalServices += serviceValue;
      sheet.addRow([day.slice(8,10) + "/" + day.slice(5,7), weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()], entry?.status || "", start ?? "", end ?? "", distance || "", liters || "", liters ? fuelValue / liters : "", fuelValue || "", fuel?.stations?.join(", ") || "", services.map((row: any) => `${row.orderNumber} ${row.productService}`).join("; "), serviceValue || "", services.map((row: any) => row.invoiceNumber).filter(Boolean).join(", "), services.some((row: any) => row.paymentResponsibility === "lessor") ? "LOCADOR" : services.some((row: any) => row.paymentResponsibility === "company_charge_lessor") ? "DESCONTO LOCADOR" : services.length ? "POWERCHINA" : ""]);
      rowNumber++;
    }
    sheet.addRow([`CÓD: ${data.equipment.fleetNumber}`, "", "", "TOTAL Km/Hr", "", totalKm, totalLiters, "", totalFuel, "", "TOTAL", totalServices, "", ""]); mergeValue(`A${rowNumber}:C${rowNumber}`, `CÓD: ${data.equipment.fleetNumber}`); mergeValue(`D${rowNumber}:E${rowNumber}`, "TOTAL Km/Hr");
    const summaryStart = rowNumber + 1; mergeValue(`A${summaryStart}:N${summaryStart}`, "RESUMO DA MEDIÇÃO 测量摘要");
    const reimbursement = (Number(financial?.reimbursementCents || 0) + Number(quickSummary?.reimbursementCents || 0)) / 100, osDiscount = Number(financial?.lessorChargeCents || 0) / 100, maintenanceDiscount = Number(ap.discountCents || 0) / 100;
    const summaryRows = [
      ["DIAS TRABALHADOS 工作天数", ap.counts.T, ap.counts.T * ap.dailyValueCents / 100, "RESUMO DE CONSUMO 消费总结", "", ""],
      ["DIAS À DISPOSIÇÃO 可用天数", ap.counts.D, ap.counts.D * ap.dailyValueCents / 100, "QUILOMETRAGEM MÊS 每月里程数", "", totalKm],
      ["DIAS EM MANUTENÇÃO 维护天数", ap.counts.M, maintenanceDiscount, "COMBUSTÍVEL / LITRO 燃料/升", "", totalLiters],
      ["TOTAL DE DIAS", ap.paidDays, ap.payableCents / 100, "MÉDIA HO / KM", "", totalLiters ? totalKm / totalLiters : 0],
      ["REEMBOLSO DE AVARIAS 维修报销", "", reimbursement, "VL CONSUMO COMBUSTÍVEL 燃油费", "", totalFuel],
      ["MÃO DE OBRA 外包劳务", "", 0, "MÉDIA LITRO COMBUSTÍVEL 平均每升燃料", "", totalLiters ? totalFuel / totalLiters : 0],
      ["BORRACHARIA / LAVAJATO / LUBRIFICAÇÃO", "", (Number(financial?.tireWashLubricationCents || 0) + Number(quickSummary?.tireCents || 0) + Number(quickSummary?.washCents || 0)) / 100, "CUSTO MÉDIO DIÁRIO 平均每日费用", "", 0],
      ["MOBILIZAÇÃO / DESMOBILIZAÇÃO 动员/复员费", "", Number(data.movement?.valueCents || 0) / 100, "OBSERVAÇÕES GERAIS 一般观察", generalObservation, ""],
      ["DESCONTOS 折扣", "", "", "", "", ""], ["OUTROS DESCONTOS 其他折扣", "", osDiscount, "", "", ""], ["PEÇAS / SERVIÇOS 零件/服务", "", Number(financial?.partsServicesCents || 0) / 100, "", "", ""], ["TOTAL DE DESCONTOS 总折扣", "", maintenanceDiscount + osDiscount, "", "", ""], ["TOTAL BRUTO 累计", "", 0, "VALOR TOTAL DO CONTRATO 合同总额", "", data.contract ? Number(data.contract.contractTotalCents || 0) / 100 : "—"], ["TOTAL LÍQUIDO A FATURAR 净值", "", Number(data.totals.lessorInvoiceCents || 0) / 100, "SALDO DO CONTRATO APÓS ESTA APROPRIAÇÃO 合同余额", "", data.contract ? Number(data.totals.contractBalanceAfterCents || 0) / 100 : "—"],
    ];
    summaryRows.forEach((values, index) => { const r = summaryStart + 1 + index; mergeValue(`A${r}:E${r}`, values[0]); sheet.getCell(r, 6).value = values[1]; mergeValue(`G${r}:H${r}`, values[2]); mergeValue(`I${r}:K${r}`, values[3]); mergeValue(`L${r}:M${r}`, values[4]); sheet.getCell(r, 14).value = values[5]; });
    const lastRow = summaryStart + summaryRows.length;
    for (let r = 1; r <= lastRow; r++) for (let c = 1; c <= 14; c++) { const cell = sheet.getCell(r, c); cell.font = { name: "Arial", size: r <= 10 ? 8 : 7, bold: r <= 10 || c === 1 }; cell.alignment = { vertical: "middle", horizontal: r >= 9 && r <= rowNumber ? "center" : "left", wrapText: true }; cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; if (typeof cell.value === "number" && [4,7,8,9,12,13,14].includes(c)) cell.numFmt = 'R$ #,##0.00'; }
    sheet.getCell("E1").font = { name: "Arial", size: 14, bold: true }; sheet.getCell("E1").alignment = { horizontal: "center", vertical: "middle", wrapText: true }; sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true }; sheet.getRow(1).height = 28; sheet.getRow(2).height = 16;
    for (let r = 9; r <= 10; r++) sheet.getRow(r).height = 24; for (let r = 11; r < rowNumber; r++) sheet.getRow(r).height = 17;
    sheet.getCell(`M6`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; sheet.getCell(`M6`).font = { name: "Arial", size: 9, bold: true }; sheet.getCell(`G${lastRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }; sheet.getCell(`G${lastRow}`).font = { name: "Arial", size: 13, bold: true };
    sheet.printArea = `A1:N${lastRow}`; sheet.headerFooter.oddFooter = "";
    const buffer = await workbook.xlsx.writeBuffer(), blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = `Apropriacao_${data.equipment.fleetNumber}_${referenceMonth}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-5">
    <section className="panel p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7"><FuelField label="Empresa"><select className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); loadEquipment(e.target.value); loadMaintenanceRule(e.target.value); }}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>
<FuelField label="Equipamento"><select className="input mt-1" value={equipmentId} onChange={(e) => { setEquipmentId(e.target.value); setData(null); }}><option value="">Selecione ID ou placa</option>{equipmentRows.map((row) => <option key={row.id} value={row.id}>{row.fleetNumber} • {row.plate || "Sem placa"} • {row.description}</option>)}</select></FuelField>
<FuelField label="Competência"><input type="month" className="input mt-1" value={referenceMonth} onChange={(e) => { const value = e.target.value, period = competencePeriod(value); setReferenceMonth(value); setPeriodStart(period.start); setPeriodEnd(period.end); setData(null); }}/></FuelField>
<FuelField label="Período inicial"><input type="date" className="input mt-1" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setData(null); }}/></FuelField>
<FuelField label="Período final"><input type="date" className="input mt-1" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setData(null); }}/></FuelField>
<FuelField label="Movimentação"><select className="input mt-1" value={movementType} onChange={(e) => { setMovementType(e.target.value as "normal" | "mobilization" | "demobilization"); setData(null); }}><option value="normal">Apropriação normal</option><option value="mobilization">Mobilização</option><option value="demobilization">Desmobilização</option></select></FuelField>
<div className="flex items-end"><button onClick={generate} className="btn-primary w-full justify-center"><BarChart3 size={17}/>Gerar apropriação</button></div></div><div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]"><FuelField label="Observações gerais da apropriação / 一般观察"><textarea className="input mt-1 min-h-20 resize-y" value={generalObservation} onChange={(e) => setGeneralObservation(e.target.value)} placeholder="Digite aqui as observações que devem aparecer no PDF e no Excel"/></FuelField><div className="flex items-end"><button onClick={() => setShowManualAdjustment((value) => !value)} className={showManualAdjustment ? "btn-primary" : "btn-secondary"}><Pencil size={17}/>{showManualAdjustment ? "Fechar ajuste manual" : "Ajuste manual da medição"}</button></div></div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="font-bold text-amber-950">Regra de manutenção da empresa</div><p className="mt-1 text-sm text-amber-800">O prazo abaixo é abonado. Se a manutenção ultrapassar esse prazo, todos os dias contínuos da ocorrência serão descontados.</p></div><div className="flex flex-wrap items-end gap-2"><FuelField label="Prazo de abono"><select className="input mt-1 min-w-48 bg-white" value={maintenanceGraceDays} onChange={(e) => setMaintenanceGraceDays(Number(e.target.value))}><option value={0}>Sem abono</option><option value={1}>24 horas • 1 dia</option><option value={2}>48 horas • 2 dias</option><option value={3}>72 horas • 3 dias</option></select></FuelField><button type="button" disabled={savingMaintenanceRule} onClick={saveMaintenanceRule} className="btn-secondary">{savingMaintenanceRule ? "Salvando..." : "Salvar regra"}</button></div></div><div className="mt-2 text-sm font-semibold text-amber-900">Regra atual: {maintenanceGraceDays} dia(s) de abono. A partir do {maintenanceGraceDays + 1}º dia contínuo, o período completo entra em desconto.</div></div>{message && <div className="mt-3 text-sm font-semibold text-blue-800">{message}</div>}</section>
    {showManualAdjustment && <div id="ajuste-manual-medicao" className="space-y-3"><div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"><h3 className="font-black text-red-800">Tela para Correção Manual de Medição</h3><p className="text-sm text-red-700">Ajuste valor medido, mobilização, reembolso, desconto e observações antes de imprimir.</p></div><MeasurementReport/></div>}
    {!data ? <section className="panel p-10 text-center"><ClipboardCheck className="mx-auto text-slate-300" size={42}/><h3 className="mt-3 font-bold">Selecione o equipamento e a competência</h3><p className="mt-1 text-sm text-slate-500">A apropriação será formada pelas partes diárias e pelas O.S. concluídas no período.</p></section> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="panel p-5"><div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 pb-4"><div><h3 className="text-lg font-black">APROPRIAÇÃO DE EQUIPAMENTO</h3><p className="text-sm text-slate-500">Frota {data.equipment.fleetNumber} • {data.equipment.plate || "Sem placa"} • Competência {referenceMonth} • {periodStart.split("-").reverse().join("/")} a {periodEnd.split("-").reverse().join("/")}</p></div><div className="flex flex-wrap gap-2"><button onClick={exportAppropriationExcel} className="btn-secondary"><FileSpreadsheet size={17}/>Excel</button><button onClick={printAppropriation} className="btn-secondary"><Printer size={17}/>Imprimir</button><button onClick={printAppropriation} className="btn-primary"><Printer size={17}/>PDF A4</button></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Mini value={String(ap.counts.T)} label="T • Trabalhando"/><Mini value={String(ap.counts.D)} label="D • Disposição"/><Mini value={String(ap.counts.M)} label="M • Manutenção"/><Mini value={String(ap.counts.AB)} label="AB • Abono"/></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Mini value={money(ap.monthlyRentCents)} label="Valor mensal"/><Mini value={money(Number(ap.discountCents || 0) + Number(financial?.lessorChargeCents || 0))} label={`Desconto total • ${ap.discountedDays} dia(s) + O.S.`}/><Mini value={money(ap.payableCents)} label="Locação após manutenção"/><Mini value={money(data.movement?.valueCents)} label={data.movement?.type === "mobilization" ? "Mobilização do contrato" : data.movement?.type === "demobilization" ? "Desmobilização do contrato" : "Mobilização / desmobilização"}/></div>
        <h4 className="mt-6 font-bold">Ocorrências de manutenção</h4><div className="mt-2 overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-[700px]"><thead><tr><th>O.S.</th><th>Período</th><th>Dias reais</th><th>Tolerância</th><th>Descontados</th><th>Desconto</th></tr></thead><tbody>{ap.occurrences.length ? ap.occurrences.map((row: any, index: number) => <tr key={index}><td className="font-semibold">{row.orderNumber || "—"}</td><td>{row.startDate} a {row.endDate}</td><td>{row.realDays}</td><td>{row.toleranceDays}</td><td>{row.discountedDays}</td><td>{money(row.discountCents)}</td></tr>) : <tr><td colSpan={6} className="py-6 text-center text-slate-500">Sem ocorrência de manutenção no período.</td></tr>}</tbody></table></div>
        <h4 className="mt-6 font-bold">Peças, serviços, reembolsos e descontos das O.S.</h4><div className="mt-2 overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-[850px]"><thead><tr><th>O.S.</th><th>Descrição</th><th>Categoria</th><th>Fornecedor</th><th>NF</th><th>Pagamento</th><th className="text-right">Valor</th></tr></thead><tbody>{financial.items.length ? financial.items.map((row: any, index: number) => <tr key={index}><td className="font-semibold">{row.orderNumber}</td><td>{row.productService}</td><td>{row.serviceClass}</td><td>{row.supplierName || "—"}</td><td>{row.invoiceNumber || "—"}</td><td><Badge tone={row.paymentResponsibility === "lessor" ? "amber" : row.paymentResponsibility === "company_charge_lessor" ? "red" : "blue"}>{row.paymentResponsibility === "lessor" ? "Locador • reembolso" : row.paymentResponsibility === "company_charge_lessor" ? "Desconto do locador" : "PowerChina • custo da obra"}</Badge></td><td className="text-right font-semibold">{money(row.totalCents)}</td></tr>) : <tr><td colSpan={7} className="py-6 text-center text-slate-500">Nenhuma O.S. financeira concluída nesta competência.</td></tr>}</tbody></table></div>
        <h4 className="mt-6 font-bold">Abastecimento e serviços rápidos</h4><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Mini value={money(fuelSummary?.totalCents)} label="Combustível"/><Mini value={money(quickSummary?.tireCents)} label="Borracharia"/><Mini value={money(quickSummary?.washCents)} label="Lava-jato"/><Mini value={money((financial?.reimbursementCents || 0) + (quickSummary?.reimbursementCents || 0))} label="Reembolso total ao locador"/></div>
      </section>
      <aside className="space-y-4"><div className="panel p-5"><h3 className="font-bold">Resumo da medição</h3><div className="mt-4 space-y-3"><Progress label="Locação após descontos" value={money(ap.payableCents)}/>{data.movement?.type !== "normal" && <Progress label={data.movement.type === "mobilization" ? "Mobilização" : "Desmobilização"} value={money(data.movement.valueCents)}/>}<Progress label="Reembolso ao locador" value={money((financial?.reimbursementCents || 0) + (quickSummary?.reimbursementCents || 0))}/><Progress label="Total a faturar pelo locador" value={money(data.totals.lessorInvoiceCents)}/><Progress label="Custos pagos pela PowerChina" value={money(data.totals.companyCostCents)}/></div></div><div className="rounded-2xl bg-[#0b1930] p-5 text-white"><h3 className="font-bold">Conciliação automática</h3><p className="mt-2 text-sm text-slate-300">Partes diárias, combustível, serviços rápidos e O.S. concluídas são conciliados na mesma competência. Mobilização ou desmobilização utiliza o valor do equipamento cadastrado no contrato. Reembolsos aumentam a fatura do locador; custos diretos permanecem como despesa da obra.</p></div></aside>
    </div>}
  </div>;
}

function MeasurementReport() {
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState(""), [suppliersList, setSuppliersList] = useState<string[]>([]), [supplierName, setSupplierName] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0,7));
  const periodFor = (month: string) => { const [year, number] = month.split("-").map(Number), previous = new Date(Date.UTC(year, number - 2, 21)); return { start: previous.toISOString().slice(0,10), end: `${month}-20` }; };
  const initial = periodFor(referenceMonth); const [periodStart, setPeriodStart] = useState(initial.start), [periodEnd, setPeriodEnd] = useState(initial.end);
  const [report, setReport] = useState<any>(null), [rows, setRows] = useState<any[]>([]), [originalRows, setOriginalRows] = useState<any[]>([]), [history, setHistory] = useState<any[]>([]), [justification, setJustification] = useState(""), [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const list = data.companies || []; setCompanies(list); if (list[0]) selectCompany(list[0].id); }); }, []);
  async function selectCompany(id: string) { setCompanyId(id); setReport(null); const response = await fetch(`/api/contracts?companyId=${encodeURIComponent(id)}`), data = await response.json(); const names = [...new Set((data.contracts || []).map((row: any) => row.supplierName).filter(Boolean))] as string[]; setSuppliersList(names); setSupplierName(names[0] || ""); }
  async function generateReport() { setMessage("Gerando relatório..."); const response = await fetch(`/api/measurement-report?companyId=${encodeURIComponent(companyId)}&supplierName=${encodeURIComponent(supplierName)}&referenceMonth=${referenceMonth}&periodStart=${periodStart}&periodEnd=${periodEnd}`), data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível gerar o relatório."); setReport(data); setRows(data.items || []); setOriginalRows(JSON.parse(JSON.stringify(data.items || []))); setHistory(data.history || []); setJustification(""); setMessage(""); }
  function updateRow(id: string, field: string, value: string) { setRows((current) => current.map((row) => { if (row.id !== id) return row; const centsFields = ["monthlyCents","measuredCents","mobilizationCents","demobilizationCents","reimbursementCents","discountCents","mobDesmobCents"]; const converted: any = centsFields.includes(field) ? Math.round(Number(value || 0) * 100) : field === "workedDays" ? Number(value || 0) : value; const next = field === "mobDesmobCents" ? { ...row, mobilizationCents: converted, demobilizationCents: 0 } : { ...row, [field]: converted }; next.totalCents = next.measuredCents + next.mobilizationCents + next.demobilizationCents + next.reimbursementCents - next.discountCents; return next; })); }
  const number = (cents = 0) => (Number(cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totals = rows.reduce((sum, row) => ({ measured: sum.measured + row.measuredCents, mob: sum.mob + row.mobilizationCents + row.demobilizationCents, reimbursement: sum.reimbursement + row.reimbursementCents, discount: sum.discount + row.discountCents, total: sum.total + row.totalCents }), { measured: 0, mob: 0, reimbursement: 0, discount: 0, total: 0 });
  const auditFields: Record<string,string> = { monthlyCents:"Preço unitário", workedDays:"Dias trabalhados", measuredCents:"Valor medido", mobilizationCents:"Mobilização", demobilizationCents:"Desmobilização", reimbursementCents:"Reembolso", discountCents:"Desconto", observation:"Observação" };
  async function saveCorrections() {
    const changes: any[] = [];
    for (const row of rows) { const previous = originalRows.find((item) => item.id === row.id); if (!previous) continue; for (const fieldName of Object.keys(auditFields)) if (String(previous[fieldName] ?? "") !== String(row[fieldName] ?? "")) changes.push({ itemId: row.id, equipmentId: row.equipmentId, fieldName, oldValue: previous[fieldName] ?? "", newValue: row[fieldName] ?? "" }); }
    if (!changes.length) return setMessage("Nenhuma correção foi identificada.");
    if (justification.trim().length < 5) return setMessage("Informe a justificativa da correção para a auditoria.");
    setMessage("Salvando correção e histórico...");
    const response = await fetch("/api/appropriation-adjustments", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ companyId, scope:"measurement", referenceMonth, periodStart, periodEnd, supplierName, justification, changes }) });
    const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível salvar a correção.");
    await generateReport(); setMessage(`Correção salva. ${data.saved} campo(s) registrado(s) no histórico de auditoria.`);
  }
  const auditValue = (field:string,value:any) => field === "observation" ? (value || "—") : field === "workedDays" ? String(value || 0) : number(Number(value || 0));
  function printReport() { document.body.classList.add("printing-measurement"); const cleanup = () => document.body.classList.remove("printing-measurement"); window.addEventListener("afterprint", cleanup, { once: true }); window.print(); setTimeout(cleanup, 1000); }
  return <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Relatório de medição por locadora</h3><p>Faça os ajustes finais e emita no padrão oficial PowerChina.</p></div></div><div className="grid gap-3 p-5 md:grid-cols-3 xl:grid-cols-6"><FuelField label="Empresa"><select className="input mt-1" value={companyId} onChange={(e) => selectCompany(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField><FuelField label="Locador / fornecedor"><select className="input mt-1" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}>{suppliersList.map((name) => <option key={name}>{name}</option>)}</select></FuelField><FuelField label="Competência"><input type="month" className="input mt-1" value={referenceMonth} onChange={(e) => { const value=e.target.value,p=periodFor(value); setReferenceMonth(value); setPeriodStart(p.start); setPeriodEnd(p.end); }}/></FuelField><FuelField label="Período inicial"><input type="date" className="input mt-1" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}/></FuelField><FuelField label="Período final"><input type="date" className="input mt-1" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}/></FuelField><div className="flex items-end"><button onClick={generateReport} className="btn-primary w-full justify-center"><BarChart3 size={17}/>Gerar</button></div></div>{message && <div className="px-5 pb-4 text-sm font-semibold text-blue-800">{message}</div>}{report && <div className="measurement-print p-5"><div className="measurement-title">RELATÓRIO DE MEDIÇÃO - {report.supplier.name}</div><div className="measurement-header"><div><div><strong>FORNECEDOR</strong> &nbsp; {report.supplier.name}</div><div><strong>CNPJ_Medicao</strong> &nbsp; {report.supplier.taxId || "Não informado"}</div><div><strong>Período:</strong> &nbsp; De {periodStart.split("-").reverse().join("/")} até {periodEnd.split("-").reverse().join("/")}</div></div><img src="/assets/powerchina-logo-000.jpg" alt="PowerChina SEPCO1 Construções do Brasil Ltda"/></div><div className="overflow-x-auto"><table className="measurement-table"><thead><tr><th>ITEM</th><th>TIPO EQUIPAMENTO</th><th>ID</th><th>PLACA</th><th>PREÇO UNITÁRIO</th><th>DIAS TRAB</th><th>VALOR MEDIDO</th><th>MOB/DESMOB</th><th>REEMBOLSO</th><th>DESCONTO</th><th>TOTAL</th><th>OBSERVAÇÃO</th></tr></thead><tbody>{rows.map((row,index) => <tr key={row.id}><td>{index+1}</td><td><div>{row.description}</div></td><td>{row.fleetNumber}</td><td>{row.plate || "—"}</td><td><input value={number(row.monthlyCents)} onChange={(e) => updateRow(row.id,"monthlyCents",e.target.value.replace(/\./g,"").replace(",","."))}/></td><td><input value={row.workedDays} onChange={(e) => updateRow(row.id,"workedDays",e.target.value)}/></td><td><input value={number(row.measuredCents)} onChange={(e) => updateRow(row.id,"measuredCents",e.target.value.replace(/\./g,"").replace(",","."))}/></td><td><input value={number(row.mobilizationCents + row.demobilizationCents)} onChange={(e) => updateRow(row.id,"mobDesmobCents",e.target.value.replace(/\./g,"").replace(",","."))}/></td><td><input value={number(row.reimbursementCents)} onChange={(e) => updateRow(row.id,"reimbursementCents",e.target.value.replace(/\./g,"").replace(",","."))}/></td><td><input value={number(row.discountCents)} onChange={(e) => updateRow(row.id,"discountCents",e.target.value.replace(/\./g,"").replace(",","."))}/></td><td className="font-semibold">{number(row.totalCents)}</td><td><input value={row.observation} onChange={(e) => updateRow(row.id,"observation",e.target.value)}/></td></tr>)}</tbody><tfoot><tr><td></td><td colSpan={4}>Totais</td><td></td><td>{number(totals.measured)}</td><td>{number(totals.mob)}</td><td>{number(totals.reimbursement)}</td><td>{number(totals.discount)}</td><td>{number(totals.total)}</td><td></td></tr></tfoot></table></div><div className="measurement-total"><strong>VALOR A SER FATURADO</strong><strong>{number(totals.total)}</strong></div><div className="measurement-date">{new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div><div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 print:hidden md:grid-cols-[1fr_auto]"><FuelField label="Justificativa obrigatória da correção"><textarea className="input mt-1 min-h-20" value={justification} onChange={(e)=>setJustification(e.target.value)} placeholder="Explique por que os valores da medição foram corrigidos."/></FuelField><div className="flex items-end"><button onClick={saveCorrections} className="btn-primary"><CheckCircle2 size={17}/>Salvar correções</button></div></div><div className="mt-4 flex justify-end print:hidden"><button onClick={printReport} className="btn-primary"><Printer size={17}/>Imprimir / Salvar PDF</button></div>{history.length>0&&<div className="mt-6 rounded-xl border border-slate-200 print:hidden"><div className="border-b border-slate-200 p-4"><h4 className="font-black">Histórico de correções para auditoria</h4><p className="text-sm text-slate-500">Registros permanentes da competência, com responsável e justificativa.</p></div><div className="overflow-x-auto"><table><thead><tr><th>Data e hora</th><th>Responsável</th><th>Equipamento</th><th>Campo</th><th>Antes</th><th>Depois</th><th>Justificativa</th></tr></thead><tbody>{[...history].reverse().map((entry:any)=><tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString("pt-BR")}</td><td>{entry.createdByName}</td><td>{rows.find((row)=>row.id===entry.itemId)?.fleetNumber||entry.equipmentId||"—"}</td><td>{auditFields[entry.fieldName]||entry.fieldName}</td><td>{auditValue(entry.fieldName,entry.oldValue)}</td><td className="font-semibold">{auditValue(entry.fieldName,entry.newValue)}</td><td>{entry.justification}</td></tr>)}</tbody></table></div></div>}</div>}</section>;
}

function ReportsPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("2026-10-21");
  const [to, setTo] = useState("2026-11-20");
  const [periodMode, setPeriodMode] = useState("21-20");
  const [referenceMonth, setReferenceMonth] = useState("2026-11");
  const [report, setReport] = useState("Gastos por fornecedor e notas pagas");
  const [data, setData] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const money = (cents: any = 0) => (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  function applyPeriod(mode: string, month = referenceMonth) { setPeriodMode(mode); setReferenceMonth(month); if (mode === "custom") return; const [year, number] = month.split("-").map(Number); if (mode === "calendar") { const last = new Date(Date.UTC(year, number, 0)).getUTCDate(); setFrom(`${month}-01`); setTo(`${month}-${String(last).padStart(2,"0")}`); } else { const previous = new Date(Date.UTC(year, number - 2, 21)); setFrom(previous.toISOString().slice(0,10)); setTo(`${month}-20`); } }
  const reportOptions = [
    ["Produtivo x Improdutivo", "Produtividade, disposição, manutenção e ranking por equipamento"],
    ["Dashboard mensal de frota", "Frota, locadores, custos e manutenção no período"],
    ["Painel mensal de gestão", "Resumo executivo bilíngue de custos e desempenho"],
    ["Gastos por fornecedor e notas pagas", "Notas fiscais pagas, parciais e pendentes"],
    ["Controle de pneus", "Identificação, DOT, condição, estoque e descarte"],
    ["Controle de baterias", "Certificado, nota fiscal e aplicação"],
    ["Custo de veículos", "Locação, combustível, serviços e manutenção"],
    ["Contrato x despesas", "Valor contratual, despesas vinculadas e saldo"],
  ];
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((payload) => { const list = payload.companies || []; setCompanies(list); if (list[0]) setCompanyId(list[0].id); }).catch(() => setMessage("Não foi possível carregar as empresas.")); }, []);
  function displayRows(payload: any, selected = report) {
    if (selected === "Produtivo x Improdutivo") return (payload.productivityByType || []).map((r: any, index: number) => ({ Ranking: index + 1, "Tipo de equipamento": r.equipmentType, Trabalhado: r.worked, Disposição: r.idle, Manutenção: r.maintenance, Abono: r.allowance, Improdutivo: r.unproductive, Total: r.total, "% Produtivo": `${(r.productiveRate * 100).toFixed(1)}%`, "% Improdutivo": `${(r.unproductiveRate * 100).toFixed(1)}%`, "% Disposição": `${(r.idleRate * 100).toFixed(1)}%`, "% Manutenção": `${(r.maintenanceRate * 100).toFixed(1)}%` }));
    if (selected === "Dashboard mensal de frota") return [
      ...(payload.monthlyPanel?.equipmentByType || []).map((r: any) => ({ Grupo: "Equipamentos por tipo", Indicador: r.name, Quantidade: r.total, Valor: "—" })),
      ...(payload.monthlyPanel?.equipmentByLessor || []).map((r: any) => ({ Grupo: "Equipamentos por locador", Indicador: r.name, Quantidade: r.total, Valor: "—" })),
      ...(payload.monthlyPanel?.expensesByLessor || []).map((r: any) => ({ Grupo: "Despesas por locador", Indicador: r.name, Quantidade: "—", Valor: money(r.totalCents) })),
      ...(payload.monthlyPanel?.maintenanceByType || []).map((r: any) => ({ Grupo: "Despesas por manutenção", Indicador: r.name, Quantidade: "—", Valor: money(r.totalCents) })),
    ];
    if (selected === "Painel mensal de gestão") { const s = payload.summary || {}; return [
      { Grupo:"Frota / 车队", Indicador:"Total de equipamentos / 设备总数", Valor:s.equipmentTotal }, { Grupo:"Frota / 车队", Indicador:"Ativos / 在用设备", Valor:s.activeEquipment }, { Grupo:"Frota / 车队", Indicador:"Desmobilizados / 已退场设备", Valor:s.demobilizedEquipment },
      { Grupo:"Operação / 运营", Indicador:"Produtividade / 生产率", Valor:`${(Number(s.efficiency||0)*100).toFixed(1)}%` }, { Grupo:"Operação / 运营", Indicador:"Eficiência de 91% a 100% / 效率91%-100%", Valor:payload.monthlyPanel?.efficiency91to100 || 0 },
      { Grupo:"Custos / 费用", Indicador:"Locação / 租赁", Valor:money(s.rentCents) }, { Grupo:"Custos / 费用", Indicador:"Abastecimento / 燃料", Valor:money(s.fuelCents) }, { Grupo:"Custos / 费用", Indicador:"Manutenção direta / 直接维修", Valor:money(s.directMaintenanceCents) }, { Grupo:"Custos / 费用", Indicador:"Borracharia, lava-jato e serviços / 其他费用", Valor:money(s.quickCompanyCents) },
      ...(payload.monthlyPanel?.topEquipment || []).map((r:any,index:number)=>({Grupo:"Maiores despesas / 最高费用",Indicador:`${index+1}. ${r.fleetNumber} • ${r.plate||r.description}`,Valor:money(r.totalCents)})),
    ]; }
    if (selected === "Gastos por fornecedor e notas pagas") return (payload.invoiceDetails || []).map((r: any) => ({ Fornecedor: r.supplierName, "Nota fiscal": r.invoiceNumber, Emissão: r.issueDate, Vencimento: r.dueDate || "—", "Centro de custo": r.costCenter, "Valor da NF": money(r.totalCents), Pago: money(r.paidCents), "A pagar": money(Math.max(r.payableCents || 0, r.totalCents - r.paidCents)), Situação: r.paymentStatus }));
    if (selected === "Controle de pneus") return (payload.tires || []).map((r: any) => ({ "O.S.": r.orderNumber, Data: r.date, Frota: r.fleetNumber, Placa: r.plate, "Pneu anterior": r.previousIdentification || "—", "Pneu atual": r.currentIdentification || "—", DOT: r.dot || "—", Condição: r.condition || "—", Destino: r.destination || "—", Fornecedor: r.supplier || "—", Valor: money(r.valueCents) }));
    if (selected === "Controle de baterias") return (payload.batteries || []).map((r: any) => ({ "O.S.": r.orderNumber, Data: r.date, Frota: r.fleetNumber, Placa: r.plate, Certificado: r.certificate || "—", "Nota fiscal": r.invoice || "—", Fornecedor: r.supplier || "—", Valor: money(r.valueCents), Observação: r.observation || "—" }));
    if (selected === "Custo de veículos") return (payload.vehicleCosts || []).map((r: any) => ({ Frota: r.fleetNumber, Placa: r.plate || "—", Equipamento: r.description, Locação: money(r.rentCents), Combustível: money(r.fuelCents), "Serviços rápidos": money(r.quickCents), "Manutenção direta": money(r.directMaintenanceCents), Total: money(r.totalCents) }));
    return (payload.contractExpenses || []).map((r: any) => ({ Contrato: r.contractNumber, Objeto: r.contractObject, Locador: r.supplierName || "—", Obra: r.projectName || "—", "Valor contratual": money(r.contractCents), Despesas: money(r.expenseCents), Saldo: money(r.balanceCents) }));
  }
  async function generate(selected = report) { if (!companyId) return setMessage("Selecione uma empresa."); setLoading(true); setMessage(""); try { const response = await fetch(`/api/reports?companyId=${encodeURIComponent(companyId)}&from=${from}&to=${to}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Não foi possível gerar o relatório."); setData(payload); setRows(displayRows(payload, selected)); } catch (error: any) { setRows([]); setMessage(error.message || "Não foi possível gerar o relatório."); } finally { setLoading(false); } }
  function selectReport(name: string) { setReport(name); if (data) setRows(displayRows(data, name)); }
  function exportExcel() { if (!rows.length) return setMessage("Gere o relatório antes de exportar."); const headers = Object.keys(rows[0]); const csv = [headers.join(";"), ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n"); const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${report.replace(/\s+/g, "_")}_${from}_${to}.csv`; anchor.click(); URL.revokeObjectURL(url); }
  const summary = data?.summary || {};
  return <div className="space-y-5">
    <section className="panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black">Central de relatórios</h2><p className="text-slate-500">Relatórios financeiros e operacionais formados pelos lançamentos reais do sistema.</p></div><Badge tone="blue">PowerChina</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6"><FuelField label="Empresa"><select className="input mt-1" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField><FuelField label="Tipo de período"><select className="input mt-1" value={periodMode} onChange={(e)=>applyPeriod(e.target.value)}><option value="21-20">Medição — dia 21 ao dia 20</option><option value="calendar">Mês civil — dia 01 ao último dia</option><option value="custom">Personalizado</option></select></FuelField><FuelField label="Mês de referência"><input type="month" className="input mt-1" value={referenceMonth} onChange={(e)=>applyPeriod(periodMode,e.target.value)}/></FuelField><FuelField label="Período inicial"><input type="date" className="input mt-1" value={from} onChange={(e) => {setFrom(e.target.value);setPeriodMode("custom");}}/></FuelField><FuelField label="Período final"><input type="date" className="input mt-1" value={to} onChange={(e) => {setTo(e.target.value);setPeriodMode("custom");}}/></FuelField><div className="flex items-end"><button onClick={() => generate()} disabled={loading} className="btn-primary w-full justify-center"><Search size={17}/>{loading ? "Gerando..." : "Gerar relatório"}</button></div></div>{message && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</div>}</section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Mini label="Notas fiscais no período" value={money(summary.invoiceTotalCents || 0)}/><Mini label="Notas pagas" value={money(summary.invoicePaidCents || 0)}/><Mini label="Custo operacional" value={money(summary.companyOperatingCostCents || 0)}/><Mini label="Custo total da empresa" value={money(summary.totalCompanyCostCents || 0)}/></section>
    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Selecione o relatório</h3><p>Clique em uma opção e depois em Gerar relatório.</p></div></div><div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">{reportOptions.map(([name, description]) => <button key={name} onClick={() => selectReport(name)} className={`bg-white p-4 text-left hover:bg-slate-50 ${report === name ? "ring-2 ring-inset ring-blue-500 bg-blue-50" : ""}`}><div className="flex items-center gap-3"><div className="iconbox blue"><FileSpreadsheet size={19}/></div><div><div className="font-bold">{name}</div><div className="text-sm text-slate-500">{description}</div></div></div></button>)}</div></section>
    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>{report}</h3><p>{rows.length} registro(s) de {from.split("-").reverse().join("/")} a {to.split("-").reverse().join("/")}</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="btn-secondary"><Printer size={17}/>PDF / imprimir</button><button onClick={exportExcel} className="btn-primary"><FileSpreadsheet size={17}/>Excel</button></div></div><div className="overflow-x-auto">{rows.length ? <table className="min-w-[1000px]"><thead><tr>{Object.keys(rows[0]).map((key) => <th key={key}>{key}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{Object.keys(rows[0]).map((key) => <td key={key}>{String(row[key] ?? "")}</td>)}</tr>)}</tbody></table> : <div className="p-10 text-center text-slate-500">Selecione os filtros e clique em “Gerar relatório”.</div>}</div></section>
  </div>;
}

function ReportsPageLegacy() {
/* Disabled unstable report implementation from version 81.
  const [companies, setCompanies] = useState<any[]>([]), [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("2026-10-21"), [to, setTo] = useState("2026-11-20");
  const [selectedReport, setSelectedReport] = useState("Painel mensal de gestão"), [data, setData] = useState<any>(null), [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((d) => { const list=d.companies||[]; setCompanies(list); if(list[0]) setCompanyId(list[0].id); }); }, []);
  async function loadReport(id=companyId) { if(!id) return; setLoading(true); const response=await fetch(`/api/reports?companyId=${encodeURIComponent(id)}&from=${from}&to=${to}`), result=await response.json(); setData(response.ok?result:null); setLoading(false); }
  useEffect(() => { if(companyId) loadReport(companyId); }, [companyId]);
  const reports = [["Painel mensal de gestão","Frota, custos e desempenho do mês","Gestão"],["Índice de eficiência","Produtividade, disposição e manutenção","Operacional"],["Custo de veículo - período","Combustível, serviços e manutenção direta","Financeiro"],["Controle de pneus","Identificação anterior/atual, DOT e destino","Pneus"],["Controle de baterias","Certificado, nota fiscal e aplicação","Baterias"],["Apropriação de equipamentos","Medição mensal e ajustes","Medição"]];
  const s=data?.summary||{};
  const rows = selectedReport === "Controle de pneus" ? data?.tires || [] : selectedReport === "Controle de baterias" ? data?.batteries || [] : selectedReport === "Índice de eficiência" ? data?.efficiency || [] : data?.vehicleCosts || [];
  function exportReport() { const headers = selectedReport === "Controle de pneus" ? ["O.S.","Data","Frota","Placa","Equipamento","Identificação anterior","Identificação atual","DOT","Condição","Destino","Fornecedor","Valor","Observação"] : selectedReport === "Controle de baterias" ? ["O.S.","Data","Frota","Placa","Equipamento","Certificado","Nota fiscal","Fornecedor","Valor","Observação"] : selectedReport === "Índice de eficiência" ? ["Frota","Placa","Equipamento","Trabalhado","Disposição","Manutenção","Abono","Eficiência"] : ["Frota","Placa","Equipamento","Combustível","Serviços rápidos","Manutenção direta PowerChina","Total"]; const csv=[headers.join(";")].concat(rows.map((r:any)=>Object.values(selectedReport === "Controle de pneus" ? {a:r.orderNumber,b:r.date,c:r.fleetNumber,d:r.plate,e:r.description,f:r.previousIdentification,g:r.currentIdentification,h:r.dot,i:r.condition,j:r.destination,k:r.supplier,l:(r.valueCents||0)/100,m:r.observation} : selectedReport === "Controle de baterias" ? {a:r.orderNumber,b:r.date,c:r.fleetNumber,d:r.plate,e:r.description,f:r.certificate,g:r.invoice,h:r.supplier,i:(r.valueCents||0)/100,j:r.observation} : selectedReport === "Índice de eficiência" ? {a:r.fleetNumber,b:r.plate,c:r.description,d:r.worked,e:r.idle,f:r.maintenance,g:r.allowance,h:(r.efficiency*100).toFixed(1)+"%"} : {a:r.fleetNumber,b:r.plate,c:r.description,d:(r.fuelCents||0)/100,e:(r.quickCents||0)/100,f:(r.directMaintenanceCents||0)/100,g:(r.totalCents||0)/100}).map((v:any)=>`"${String(v??"").replaceAll('"','""')}"`).join(";"))); const blob=new Blob(["\ufeff"+csv.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url;a.download=`${selectedReport.replace(/\s+/g,"_")}_${from}_${to}.csv`;a.click();URL.revokeObjectURL(url); }
  return <div className="space-y-5">
    <section className="panel p-5"><div className="grid gap-3 md:grid-cols-4"><FuelField label="Empresa"><select className="input mt-1" value={companyId} onChange={(e)=>setCompanyId(e.target.value)}>{companies.map((c)=><option key={c.id} value={c.id}>{c.tradeName}</option>)}</select></FuelField><FuelField label="Período inicial"><input type="date" className="input mt-1" value={from} onChange={(e)=>setFrom(e.target.value)}/></FuelField><FuelField label="Período final"><input type="date" className="input mt-1" value={to} onChange={(e)=>setTo(e.target.value)}/></FuelField><div className="flex items-end gap-2"><button onClick={()=>loadReport()} className="btn-primary flex-1"><Search size={17}/>{loading?"Carregando...":"Aplicar"}</button><button onClick={()=>window.print()} className="btn-secondary"><Printer size={17}/></button></div></div></section>
    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Painel mensal de gestão</h3><p>{from.split("-").reverse().join("/")} a {to.split("-").reverse().join("/")} • dados consolidados do sistema</p></div><Badge tone="blue">PowerChina</Badge></div><div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><Mini value={String(s.equipmentTotal||0)} label="Total de equipamentos"/><Mini value={String(s.activeEquipment||0)} label="Ativos"/><Mini value={`${((s.efficiency||0)*100).toFixed(1)}%`} label="Índice de eficiência"/><Mini value={money(s.totalCompanyCostCents||0)} label="Custo total da empresa"/></div><div className="grid gap-3 border-t border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-4"><Mini value={money(s.rentCents||0)} label="Locação"/><Mini value={money(s.fuelCents||0)} label="Abastecimento"/><Mini value={money(s.quickCompanyCents||0)} label="Serviços rápidos pagos pela empresa"/><div className="rounded-xl border-2 border-red-200 bg-red-50 p-4"><div className="text-sm font-bold text-red-800">Manutenção direta PowerChina</div><div className="mt-2 text-2xl font-black text-red-900">{money(s.directMaintenanceCents||0)}</div><div className="mt-1 text-xs text-red-700">Pago pela empresa e não descontado do locador</div></div></div><div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4"><Mini value={money(s.lessorReimbursementCents||0)} label="Reembolso ao locador"/><Mini value={money(s.lessorDiscountCents||0)} label="Cobrado/descontado do locador"/><Mini value={String(s.idle||0)} label="Dias à disposição"/><Mini value={String(s.maintenance||0)} label="Dias em manutenção"/></div></section>
    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Central de relatórios</h3><p>Escolha o relatório, consulte, imprima ou exporte.</p></div></div><div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-3">{reports.map(([name,desc,group])=><button key={name} onClick={()=>setSelectedReport(name)} className={`flex items-center gap-3 p-4 text-left ${selectedReport===name?"bg-blue-50 ring-2 ring-inset ring-blue-500":"bg-white hover:bg-slate-50"}`}><div className="iconbox blue"><FileSpreadsheet size={19}/></div><div className="min-w-0 flex-1"><div className="font-semibold">{name}</div><div className="text-sm text-slate-500">{desc}</div></div><Badge tone="blue">{group}</Badge></button>)}</div></section>
    {selectedReport !== "Painel mensal de gestão" && selectedReport !== "Apropriação de equipamentos" && <section className="panel overflow-hidden"><div className="panel-head"><div><h3>{selectedReport}</h3><p>{rows.length} registro(s) no período</p></div><div className="flex gap-2"><button onClick={()=>window.print()} className="btn-secondary"><Printer size={17}/>PDF</button><button onClick={exportReport} className="btn-primary"><FileSpreadsheet size={17}/>Excel</button></div></div><div className="overflow-x-auto"><table className="min-w-[900px]"><thead><tr>{selectedReport==="Controle de pneus"?<><th>O.S.</th><th>Data</th><th>Frota / placa</th><th>Pneu anterior</th><th>Pneu atual</th><th>DOT</th><th>Condição</th><th>Destino</th><th>Fornecedor</th><th className="text-right">Valor</th></>:selectedReport==="Controle de baterias"?<><th>O.S.</th><th>Data</th><th>Frota / placa</th><th>Certificado</th><th>Nota fiscal</th><th>Fornecedor</th><th className="text-right">Valor</th><th>Observação</th></>:selectedReport==="Índice de eficiência"?<><th>Frota / placa</th><th>Equipamento</th><th>T</th><th>D</th><th>M</th><th>AB</th><th>Eficiência</th></>:<><th>Frota / placa</th><th>Equipamento</th><th className="text-right">Combustível</th><th className="text-right">Serviços rápidos</th><th className="text-right">Manutenção direta</th><th className="text-right">Total</th></>}</tr></thead><tbody>{rows.length?rows.map((r:any,i:number)=><tr key={i}>{selectedReport==="Controle de pneus"?<><td>{r.orderNumber}</td><td>{r.date}</td><td>{r.fleetNumber} • {r.plate}</td><td>{r.previousIdentification||"—"}</td><td>{r.currentIdentification||"—"}</td><td>{r.dot||"—"}</td><td>{r.condition||"—"}</td><td>{r.destination||"—"}</td><td>{r.supplier||"—"}</td><td className="text-right">{money(r.valueCents)}</td></>:selectedReport==="Controle de baterias"?<><td>{r.orderNumber}</td><td>{r.date}</td><td>{r.fleetNumber} • {r.plate}</td><td>{r.certificate||"—"}</td><td>{r.invoice||"—"}</td><td>{r.supplier||"—"}</td><td className="text-right">{money(r.valueCents)}</td><td>{r.observation||"—"}</td></>:selectedReport==="Índice de eficiência"?<><td>{r.fleetNumber} • {r.plate}</td><td>{r.description}</td><td>{r.worked}</td><td>{r.idle}</td><td>{r.maintenance}</td><td>{r.allowance}</td><td className="font-bold">{(r.efficiency*100).toFixed(1)}%</td></>:<><td>{r.fleetNumber} • {r.plate}</td><td>{r.description}</td><td className="text-right">{money(r.fuelCents)}</td><td className="text-right">{money(r.quickCents)}</td><td className="text-right">{money(r.directMaintenanceCents)}</td><td className="text-right font-bold">{money(r.totalCents)}</td></>}</tr>):<tr><td colSpan={12} className="py-8 text-center text-slate-500">Nenhum lançamento encontrado neste período.</td></tr>}</tbody></table></div></section>}
*/
  const [period, setPeriod] = useState("21/08/2026 a 20/09/2026");
  const [project, setProject] = useState("Todos os canteiros");
  const [selectedReport, setSelectedReport] = useState("Despesas da frota");
  const [reportCompanies, setReportCompanies] = useState<any[]>([]), [reportCompanyId, setReportCompanyId] = useState("");
  const [reportRows, setReportRows] = useState<any[]>([]), [reportMessage, setReportMessage] = useState(""), [reportLoading, setReportLoading] = useState(false), [reportData, setReportData] = useState<any>(null);
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const list=data.companies||[]; setReportCompanies(list); if(list[0]) setReportCompanyId(list[0].id); }).catch(()=>setReportMessage("Não foi possível carregar as empresas.")); }, []);
  const periodDates = () => { const match=period.match(/(\d{2})\/(\d{2})\/(\d{4}) a (\d{2})\/(\d{2})\/(\d{4})/); return match ? { from:`${match[3]}-${match[2]}-${match[1]}`, to:`${match[6]}-${match[5]}-${match[4]}` } : { from:"",to:"" }; };
  async function generateSelectedReport(name=selectedReport) {
    if(!reportCompanyId) return; setReportLoading(true); setReportMessage(""); setReportRows([]);
    try { const {from,to}=periodDates();
      if(["Gastos por fornecedor e notas pagas","Controle de pneus","Controle de baterias","Custo de veículos","Contrato x despesas","Despesas da frota"].includes(name)) { const response=await fetch(`/api/reports?companyId=${encodeURIComponent(reportCompanyId)}&from=${from}&to=${to}`), payload=await response.json(); if(!response.ok) throw new Error(payload.error); setReportData(payload);
        if(name==="Gastos por fornecedor e notas pagas") setReportRows((payload.invoiceDetails||[]).map((r:any)=>({Fornecedor:r.supplierName,"Nota fiscal":r.invoiceNumber,Emissão:r.issueDate,Vencimento:r.dueDate||"—","Centro de custo":r.costCenter,"Valor da NF":money(r.totalCents),Pago:money(r.paidCents),"A pagar":money(Math.max(r.payableCents,r.totalCents-r.paidCents)),Situação:r.paymentStatus})));
        else if(name==="Controle de pneus") setReportRows((payload.tires||[]).map((r:any)=>({"O.S.":r.orderNumber,Data:r.date,Frota:r.fleetNumber,Placa:r.plate,"Pneu anterior":r.previousIdentification||"—","Pneu atual":r.currentIdentification||"—",DOT:r.dot||"—",Condição:r.condition||"—",Destino:r.destination||"—",Fornecedor:r.supplier||"—",Valor:money(r.valueCents),Observação:r.observation||"—"})));
        else if(name==="Controle de baterias") setReportRows((payload.batteries||[]).map((r:any)=>({"O.S.":r.orderNumber,Data:r.date,Frota:r.fleetNumber,Placa:r.plate,Certificado:r.certificate||"—","Nota fiscal":r.invoice||"—",Fornecedor:r.supplier||"—",Valor:money(r.valueCents),Observação:r.observation||"—"})));
        else if(name==="Custo de veículos") setReportRows((payload.vehicleCosts||[]).map((r:any)=>({Frota:r.fleetNumber,Placa:r.plate,Equipamento:r.description,Locação:money(r.rentCents),Combustível:money(r.fuelCents),"Serviços rápidos":money(r.quickCents),"Manutenção direta":money(r.directMaintenanceCents),"Custo total":money(r.totalCents)})));
        else if(name==="Contrato x despesas") setReportRows((payload.contractExpenses||[]).map((r:any)=>({Contrato:r.contractNumber,Objeto:r.contractObject,Locador:r.supplierName||"—",Obra:r.projectName||"—","Valor contratual no período":money(r.contractCents),Despesas:money(r.expenseCents),Saldo:money(r.balanceCents)})));
        else setReportRows([{Grupo:"Locação",Valor:money(payload.summary?.rentCents||0)},{Grupo:"Abastecimento",Valor:money(payload.summary?.fuelCents||0)},{Grupo:"Serviços rápidos",Valor:money(payload.summary?.quickCompanyCents||0)},{Grupo:"Manutenção direta",Valor:money(payload.summary?.directMaintenanceCents||0)}]);
      } else if(name==="Índice de eficiência" || name==="Partes diárias") { const response=await fetch(`/api/daily-parts?companyId=${encodeURIComponent(reportCompanyId)}&from=${from}&to=${to}`), payload=await response.json(); if(!response.ok) throw new Error(payload.error); const entries=payload.entries||[]; if(name==="Partes diárias") setReportRows(entries.map((r:any)=>({Data:r.entryDate,Frota:r.fleetNumber,Placa:r.plate,Equipamento:r.description,Status:r.status,"KM inicial":r.kilometerStart??"","KM final":r.kilometerEnd??""}))); else { const map=new Map<string,any>(); entries.forEach((r:any)=>{const x=map.get(r.equipmentId)||{Frota:r.fleetNumber,Placa:r.plate,Equipamento:r.description,T:0,D:0,M:0,AB:0};x[r.status]=(x[r.status]||0)+1;map.set(r.equipmentId,x)}); setReportRows([...map.values()].map((r:any)=>({...r,"Eficiência":`${((r.T/Math.max(1,r.T+r.D+r.M))*100).toFixed(1)}%`}))); }
      } else if(name==="Controle de pneus" || name==="Controle de baterias" || name==="Manutenção corretiva" || name==="Manutenção preventiva" || name==="Fornecimento por período" || name==="Custo por equipamento" || name==="Descarte de pneus") { const response=await fetch(`/api/maintenance?companyId=${encodeURIComponent(reportCompanyId)}`), payload=await response.json(); if(!response.ok) throw new Error(payload.error); const orders=(payload.orders||[]).filter((o:any)=>o.startedAt>=from&&o.startedAt<=to); const groups=await Promise.all(orders.map(async(o:any)=>{const rr=await fetch(`/api/maintenance/items?companyId=${encodeURIComponent(reportCompanyId)}&orderId=${encodeURIComponent(o.id)}`),dd=await rr.json();return (dd.items||[]).map((i:any)=>({o,i}))})); const items=groups.flat();
        if(name==="Controle de pneus"||name==="Descarte de pneus") setReportRows(items.filter(({i}:any)=>i.tireCurrentIdentification||i.tirePreviousIdentification||i.tireDot).filter(({i}:any)=>name!=="Descarte de pneus"||i.tireRemovedDestination==="discard").map(({o,i}:any)=>({"O.S.":o.orderNumber,Data:o.closedAt||o.startedAt,Frota:o.fleetNumber,Placa:o.plate,"Pneu anterior":i.tirePreviousIdentification||"—","Pneu atual":i.tireCurrentIdentification||"—",DOT:i.tireDot||"—",Condição:i.tireCondition||"—",Destino:i.tireRemovedDestination||"—",Fornecedor:i.supplierName||"—",Valor:money(i.totalCents)})));
        else if(name==="Controle de baterias") setReportRows(items.filter(({i}:any)=>i.batteryCertificateNumber||i.batteryInvoiceNumber).map(({o,i}:any)=>({"O.S.":o.orderNumber,Data:o.closedAt||o.startedAt,Frota:o.fleetNumber,Placa:o.plate,Certificado:i.batteryCertificateNumber||"—","Nota fiscal":i.batteryInvoiceNumber||i.invoiceNumber||"—",Fornecedor:i.supplierName||"—",Valor:money(i.totalCents),Observação:i.observation||"—"})));
        else setReportRows(items.filter(({o}:any)=>name!=="Manutenção preventiva"||String(o.maintenanceType).toLowerCase().includes("prevent")).filter(({o}:any)=>name!=="Manutenção corretiva"||!String(o.maintenanceType).toLowerCase().includes("prevent")).map(({o,i}:any)=>({"O.S.":o.orderNumber,Data:o.closedAt||o.startedAt,Frota:o.fleetNumber,Placa:o.plate,Descrição:i.productService,Fornecedor:i.supplierName||"ESTOQUE",Pagamento:i.paymentResponsibility==="company"?"PowerChina":i.paymentResponsibility==="lessor"?"Reembolso ao locador":"Desconto do locador",Valor:money(i.totalCents)})));
      } else { setReportRows([{Grupo:"Locação",Valor:money(Math.round(rent*100))},{Grupo:"Abastecimento",Valor:money(Math.round(fuel*100))},{Grupo:"Borracharia e lava-jato",Valor:money(Math.round(tireWash*100))},{Grupo:"Manutenção direta PowerChina",Valor:money(Math.round(maintenancePowerChina*100))}]); }
    } catch(error:any) { setReportMessage(error?.message||"Não foi possível gerar o relatório."); } finally { setReportLoading(false); }
  }
  function exportSelectedReport() { if(!reportRows.length) return setReportMessage("Gere o relatório antes de exportar."); const headers=Object.keys(reportRows[0]),csv=[headers.join(";"),...reportRows.map((row:any)=>headers.map((key)=>`"${String(row[key]??"").replace(/"/g,'""')}"`).join(";"))].join("\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${selectedReport.replace(/\s+/g,"_")}.csv`;a.click();URL.revokeObjectURL(url); }
  const rent = (reportData?.summary?.rentCents||0)/100;
  const fuel = (reportData?.summary?.fuelCents||0)/100;
  const tireWash = (reportData?.summary?.quickCompanyCents||0)/100;
  const maintenancePowerChina = (reportData?.summary?.directMaintenanceCents||0)/100;
  const maintenanceGeneral = (reportData?.summary?.directMaintenanceCents||0)/100 + (reportData?.summary?.lessorReimbursementCents||0)/100 + (reportData?.summary?.lessorDiscountCents||0)/100;
  const workCost = fuel + tireWash;
  const totalExpense = rent + workCost + maintenancePowerChina;
  function setModal() { const content = `RELATÓRIO;${selectedReport}\nOBRA;${project}\nPERÍODO;${period}\nLOCAÇÃO;${rent.toFixed(2)}\nCUSTOS DA OBRA;${workCost.toFixed(2)}\nMANUTENÇÃO POWERCHINA;${maintenancePowerChina.toFixed(2)}\nDESPESA TOTAL;${totalExpense.toFixed(2)}`, blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }), url = URL.createObjectURL(blob), anchor = document.createElement("a"); anchor.href = url; anchor.download = `${selectedReport.replace(/\s+/g, "_")}.csv`; anchor.click(); URL.revokeObjectURL(url); }
  const reports = [
    ["Despesas da frota", "Locação + custos da obra + manutenção", "Financeiro"],
    ["Gastos por fornecedor e notas pagas", "Notas fiscais, valores pagos, pendentes e fornecedor", "Financeiro"],
    ["Custo de veículos", "Locação, combustível, serviços e manutenção por veículo", "Gestão"],
    ["Contrato x despesas", "Comparativo do valor contratual com as despesas vinculadas", "Contratos"],
    ["Apropriação de equipamentos", "Medição mensal em uma página A4", "Medição"],
    ["Índice de eficiência", "Disponibilidade e utilização por equipamento", "Operacional"],
    ["Partes diárias", "Histórico de T, D, M e AB", "Operacional"],
    ["Manutenção preventiva", "Programadas por KM, horímetro e data", "Manutenção"],
    ["Manutenção corretiva", "Ocorrências, dias parados e valores", "Manutenção"],
    ["Fornecimento por período", "Fornecedor, categoria, O.S., NF e centro de custo", "Financeiro"],
    ["Medições por locadora", "Medido, desconto, reembolso e saldo", "Contratos"],
    ["Estoque e consumo", "Entradas, saídas, saldo e aplicação", "Suprimentos"],
    ["Controle de pneus", "Pneu anterior e atual, DOT, condição, estoque e descarte", "Pneus"],
    ["Controle de baterias", "Certificado, nota fiscal, aplicação e histórico por equipamento", "Baterias"],
    ["Descarte de pneus", "Data, identificação, motivo, destino e responsável", "Ambiental"],
  ];
  return <div className="space-y-5">
    <section className="panel p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <FuelField label="Empresa"><select className="input mt-1" value={reportCompanyId} onChange={(e)=>setReportCompanyId(e.target.value)}>{reportCompanies.map((row)=><option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>

        <FuelField label="Obra / canteiro"><select className="input mt-1" value={project} onChange={(e) => setProject(e.target.value)}><option>Todos os canteiros</option><option>Canto do Buriti</option><option>Colônia do Gurgueia</option><option>Uruçuí</option><option>Ribeiro Gonçalves</option></select></FuelField>

        <FuelField label="Período"><select className="input mt-1" value={period} onChange={(e) => setPeriod(e.target.value)}><option>21/08/2026 a 20/09/2026</option><option>21/07/2026 a 20/08/2026</option><option>21/06/2026 a 20/07/2026</option></select></FuelField>

        <div className="flex items-end gap-2"><button onClick={()=>generateSelectedReport()} className="btn-primary flex-1"><Search size={17}/>{reportLoading?"Gerando...":"Aplicar"}</button><button onClick={exportSelectedReport} className="btn-secondary" aria-label="Exportar"><FileSpreadsheet size={17}/></button><button onClick={()=>window.print()} className="btn-secondary" aria-label="Imprimir"><Printer size={17}/></button></div>
      </div>
    </section>

    <section className="panel overflow-hidden">
      <div className="panel-head"><div><h3>Despesas da frota</h3><p>{period} • {project}</p></div><Badge tone="blue">Regime de despesas</Badge></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-medium text-slate-500">Locação</div><div className="mt-2 text-2xl font-bold">{money(Math.round(rent * 100))}</div><div className="mt-1 text-xs text-slate-400">Medição dos equipamentos locados</div></div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-medium text-slate-500">Custos da obra</div><div className="mt-2 text-2xl font-bold">{money(Math.round(workCost * 100))}</div><div className="mt-1 text-xs text-slate-400">Abastecimento + borracharia + lava-jato</div></div>
        <div className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-medium text-slate-500">Manutenção PowerChina</div><div className="mt-2 text-2xl font-bold">{money(Math.round(maintenancePowerChina * 100))}</div><div className="mt-1 text-xs text-slate-400">Pagamento direto da empresa</div></div>
        <div className="rounded-xl bg-[#0b1930] p-4 text-white"><div className="text-sm font-medium text-slate-300">Despesa total</div><div className="mt-2 text-2xl font-bold">{money(Math.round(totalExpense * 100))}</div><div className="mt-1 text-xs text-slate-300">Sem duplicar reembolsos da medição</div></div>
      </div>
      <div className="overflow-x-auto border-t border-slate-200"><table><thead><tr><th>Grupo</th><th>Composição</th><th className="text-right">Valor</th><th>Tratamento</th></tr></thead><tbody>
        <tr><td className="font-semibold">Locação</td><td>Medição mensal dos contratos</td><td className="text-right font-semibold">{money(Math.round(rent * 100))}</td><td><Badge tone="blue">Despesa contratual</Badge></td></tr>
        <tr><td className="font-semibold">Custo da obra</td><td>Abastecimento {money(Math.round(fuel * 100))} + borracharia/lava-jato {money(Math.round(tireWash * 100))}</td><td className="text-right font-semibold">{money(Math.round(workCost * 100))}</td><td><Badge tone="amber">Despesa operacional</Badge></td></tr>
        <tr><td className="font-semibold">Manutenção PowerChina</td><td>Peças e serviços pagos diretamente</td><td className="text-right font-semibold">{money(Math.round(maintenancePowerChina * 100))}</td><td><Badge tone="red">Despesa direta</Badge></td></tr>
        <tr><td className="font-semibold">Manutenção geral</td><td>PowerChina + avarias + reembolsos</td><td className="text-right font-semibold">{money(Math.round(maintenanceGeneral * 100))}</td><td><Badge tone="green">Indicador gerencial</Badge></td></tr>
      </tbody></table></div>
      <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900"><strong>Regra financeira:</strong> manutenção geral é exibida para controle, mas não é somada novamente à despesa total quando o reembolso já estiver dentro da medição de locação.</div>
    </section>

    <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Central de relatórios</h3><p>Relatórios ativos para consulta, impressão e exportação.</p></div></div><div className="grid gap-px bg-slate-200 md:grid-cols-2">{reports.map(([name, desc, group]) => <button key={name} onClick={() => { setSelectedReport(name); generateSelectedReport(name); }} className={`flex items-center gap-3 p-4 text-left ${selectedReport === name ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : "bg-white hover:bg-slate-50"}`}><div className="iconbox blue"><FileText size={19}/></div><div className="min-w-0 flex-1"><div className="font-semibold">{name}</div><div className="text-sm text-slate-500">{desc}</div></div><Badge tone="blue">{group}</Badge><ChevronRight size={18} className="text-slate-400"/></button>)}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-5"><div><div className="text-xs font-bold uppercase text-slate-500">Relatório selecionado</div><div className="text-lg font-black">{selectedReport}</div><div className="text-sm text-slate-500">{project} • {period}</div></div><div className="flex gap-2"><button onClick={() => window.print()} className="btn-secondary"><Printer size={17}/>Imprimir / PDF</button><button onClick={exportSelectedReport} className="btn-primary"><FileSpreadsheet size={17}/>Exportar Excel</button></div></div>{reportMessage&&<div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900">{reportMessage}</div>}{reportRows.length>0&&<div className="overflow-x-auto border-t border-slate-200"><table className="min-w-[900px]"><thead><tr>{Object.keys(reportRows[0]).map((key)=><th key={key}>{key}</th>)}</tr></thead><tbody>{reportRows.map((row,index)=><tr key={index}>{Object.keys(reportRows[0]).map((key)=><td key={key}>{String(row[key]??"")}</td>)}</tr>)}</tbody></table></div>}</section>
  </div>;
}

function CentralAdminPage({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const actions: { title: string; text: string; screen: Screen; icon: any; tone: string }[] = [
    { title: "Empresas", text: "Cadastrar e selecionar empresas administradas.", screen: "Empresas", icon: Building2, tone: "blue" },
    { title: "Usuários e permissões", text: "Definir módulos e ações permitidas por usuário.", screen: "Usuários e permissões", icon: ShieldCheck, tone: "red" },
    { title: "Produtos e cadastros", text: "Produtos, categorias, centros de custo, fornecedores e parâmetros.", screen: "Cadastros", icon: Package, tone: "amber" },
    { title: "Backup e sincronização", text: "Criar cópias por empresa e acompanhar lançamentos offline.", screen: "Backup e sincronização", icon: DatabaseBackup, tone: "green" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {actions.map((item) => {
        const Icon = item.icon;
        return <button key={item.title} onClick={() => setScreen(item.screen)} className="panel p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
          <div className={`iconbox ${item.tone}`}><Icon size={21} /></div>
          <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
          <p className="mt-1 min-h-12 text-sm text-slate-500">{item.text}</p>
          <div className="mt-4 flex items-center text-sm font-bold text-blue-700">Acessar <ChevronRight size={17} className="ml-auto" /></div>
        </button>;
      })}
    </div>
  );
}

const masterTypes = [
  ["produto", "Produtos"], ["categoria_produto", "Categorias de produtos"],
  ["centro_custo", "Centros de custos"], ["fornecedor", "Fornecedores"],
  ["cargo", "Cargos"], ["profissional", "Profissionais"],
  ["local_manutencao", "Locais de manutenção"], ["marca_equipamento", "Marcas de equipamentos"],
  ["modelo_equipamento", "Modelos de equipamentos"], ["tipo_equipamento", "Tipos de equipamentos"],
  ["tipo_manutencao", "Tipos de manutenção"], ["tipo_servico_manutencao", "Tipos de serviço de manutenção"], ["status_manutencao", "Status de manutenção"],
  ["tipo_contrato", "Tipos de contratos"], ["treinamento", "Treinamentos"],
  ["obra", "Obras/Projetos"], ["frente", "Frentes de trabalho"],
] as const;

function MasterDataPage() {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [type, setType] = useState("menu");
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [masterSortBy, setMasterSortBy] = useState<"code" | "name" | "description" | "status">("code");
  const [masterSortDirection, setMasterSortDirection] = useState<"asc" | "desc">("asc");
  const [masterStatusFilter, setMasterStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", active: true, contact: "", job: "", admission: "", exams: "", integration1: "", integration2: "", integration3: "", dismissal: "", cnh: "", cnhExpiry: "", professionalStatus: "Apto", observation: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const professionalFile = useRef<HTMLInputElement>(null);

  async function load(selectedCompany = companyId, selectedType = type) {
    if (!selectedCompany || !navigator.onLine || selectedType === "menu") return;
    const response = await fetch(`/api/master-data?companyId=${encodeURIComponent(selectedCompany)}&type=${encodeURIComponent(selectedType)}`);
    const data = await response.json();
    if (response.ok) setRecords(data.records || []); else setMessage(data.error || "Não foi possível carregar os cadastros.");
  }
  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const rows = data.companies || []; setCompanies(rows);
      if (rows[0]) { setCompanyId(rows[0].id); load(rows[0].id, type); }
    }).catch(() => setMessage("Conecte-se para carregar as empresas."));
  }, []);
  useEffect(() => { if (companyId) load(companyId, type); }, [type, companyId]);
  function reset() { setEditingId(null); setForm({ code: "", name: "", description: "", active: true, contact: "", job: "", admission: "", exams: "", integration1: "", integration2: "", integration3: "", dismissal: "", cnh: "", cnhExpiry: "", professionalStatus: "Apto", observation: "" }); }
  function edit(record: any) {
    let details: any = {}; try { details = JSON.parse(record.description || "{}"); } catch {}
    setEditingId(record.id); setForm({ code: record.code || "", name: record.name, description: type === "profissional" ? "" : record.description || "", active: record.active, contact: details.contact || "", job: details.job || "", admission: details.admission || "", exams: details.exams || "", integration1: details.integration1 || "", integration2: details.integration2 || "", integration3: details.integration3 || "", dismissal: details.dismissal || "", cnh: details.cnh || "", cnhExpiry: details.cnhExpiry || "", professionalStatus: details.professionalStatus || "Apto", observation: details.observation || "" });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const description = type === "profissional" ? JSON.stringify({ contact: form.contact, job: form.job, admission: form.admission, exams: form.exams, integration1: form.integration1, integration2: form.integration2, integration3: form.integration3, dismissal: form.dismissal, cnh: form.cnh, cnhExpiry: form.cnhExpiry, professionalStatus: form.professionalStatus, observation: form.observation }) : form.description;
    const response = await offlineRequest("/api/master-data", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: form.code, name: form.name, description, active: form.active, id: editingId, companyId, type }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível salvar.");
    setMessage(data.queued ? data.message : editingId ? "Cadastro atualizado." : "Cadastro incluído.");
    reset(); if (!data.queued) await load();
  }
  async function remove(id: string) {
    if (!window.confirm("Confirma a exclusão deste cadastro?")) return;
    const response = await fetch(`/api/master-data?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) { setMessage("Cadastro excluído."); await load(); } else setMessage("Não foi possível excluir. Verifique sua permissão.");
  }
  async function importProfessionals(file?: File) {
    if (!file || !companyId) return;
    setBusy(true); setMessage("Lendo a planilha de efetivo...");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames.includes("ATIVO") ? "ATIVO" : workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "", raw: false });
      const normalize = (value: any) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
      const headerIndex = rows.findIndex((row) => row.some((cell) => normalize(cell).startsWith("NOME")) && row.some((cell) => normalize(cell).includes("FUNCAO")));
      if (headerIndex < 0) throw new Error("Não encontrei as colunas NOME e FUNÇÃO.");
      const headers = rows[headerIndex].map(normalize);
      const col = (...names: string[]) => headers.findIndex((header) => names.some((name) => header === name || header.startsWith(name)));
      const indexes = { code: col("MATR", "RE"), name: col("NOME"), job: col("FUNCAO"), admission: col("ADMISSAO"), integration1: col("INTEGRACAO 1"), integration2: col("INTEGRACAO 2"), integration3: col("INTEGRACAO 3"), observation: col("OBSERVACAO", "OBSERVACOES"), site: col("CANTEIRO"), cpf: col("CPF"), status: col("SITUACAO", "STATUS"), supervisor: col("SUPERVISOR"), laborType: col("MO DIR/IND"), sex: col("SEXO"), nationality: col("NACIONALIDADE"), city: col("CIDADE"), state: col("UF"), sector: col("SETOR"), team: col("EQUIPE") };
      const records = rows.slice(headerIndex + 1).map((row) => {
        const get = (index: number) => index >= 0 ? String(row[index] || "").trim() : "";
        const job = get(indexes.job), name = get(indexes.name);
        return { code: get(indexes.code), name, active: !/DEMITID/i.test(get(indexes.status)), description: JSON.stringify({ job, admission: get(indexes.admission), integration1: get(indexes.integration1), integration2: get(indexes.integration2), integration3: get(indexes.integration3), observation: get(indexes.observation), site: get(indexes.site), cpf: get(indexes.cpf), sourceStatus: get(indexes.status), supervisor: get(indexes.supervisor), laborType: get(indexes.laborType), sex: get(indexes.sex), nationality: get(indexes.nationality), city: get(indexes.city), state: get(indexes.state), sector: get(indexes.sector), team: get(indexes.team), professionalStatus: "Apto" }) };
      }).filter((row) => row.name && /MECANIC|SUPERVISOR.*TRANSPORTE|ENCARREGADO.*TRANSPORTE/i.test(JSON.parse(row.description).job));
      if (!records.length) throw new Error("Nenhum profissional válido foi encontrado.");
      const response = await fetch("/api/master-data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, type: "profissional", records }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível importar.");
      setMessage(`${data.imported} profissionais incluídos ou atualizados. Somente mecânicos, supervisores e encarregados de transporte foram considerados.`);
      await load(companyId, "profissional");
    } catch (error: any) {
      setMessage(error?.message || "Não foi possível ler a planilha.");
    } finally {
      setBusy(false);
      if (professionalFile.current) professionalFile.current.value = "";
    }
  }
  const filtered = records
    .filter((record) => `${record.code || ""} ${record.name} ${record.description || ""}`.toLowerCase().includes(search.toLowerCase()))
    .filter((record) => masterStatusFilter === "all" || (masterStatusFilter === "active" ? record.active : !record.active))
    .sort((a, b) => {
      const value = (record: any) => masterSortBy === "status" ? (record.active ? "Ativo" : "Inativo") : String(record[masterSortBy] || "");
      const result = value(a).localeCompare(value(b), "pt-BR", { numeric: true, sensitivity: "base" });
      return masterSortDirection === "asc" ? result : -result;
    });
  const currentLabel = masterTypes.find(([value]) => value === type)?.[1] || "Cadastros";
  if (type === "menu") {
    const primary = [["obra", "Obras", "Contratos de obra, cliente, localização e vigência."], ["frente", "Frentes de serviço", "Frentes vinculadas às obras."], ["centro_custo", "Centros de custo", "Centros de custo por obra."], ["fornecedor", "Fornecedores e locadores", "Pessoa física ou jurídica e dados de pagamento."], ["profissional", "Profissionais", "Condutores, operadores, admissões, integrações e CNH."], ["produto", "Produtos e serviços", "Peças, pneus, filtros, lubrificantes e serviços."]] as const;
    const administrative = masterTypes.filter(([value]) => !["produto", "centro_custo", "fornecedor", "profissional", "obra", "frente"].includes(value));
    return <div className="space-y-6"><section><div className="mb-4"><h2 className="text-2xl font-black">Cadastros</h2><p className="text-slate-500">Base de dados utilizada por todos os módulos do sistema.</p></div><h3 className="mb-3 font-bold">Cadastros principais</h3><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{primary.map(([value, label, description]) => <button key={value} onClick={() => setType(value)} className="panel min-h-28 p-6 text-left transition hover:border-blue-400 hover:shadow-md"><div className="font-bold">{label}</div><div className="mt-2 text-sm text-slate-500">{description}</div></button>)}</div></section><section><h3 className="mb-3 font-bold">Cadastros administrativos</h3><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{administrative.map(([value, label]) => <button key={value} onClick={() => setType(value)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left font-semibold hover:border-blue-400 hover:text-blue-800">{label}</button>)}</div></section></div>;
  }
  if (type === "produto") return <ProductCatalog companyId={companyId} companies={companies} onCompany={setCompanyId} onBack={() => setType("menu")}/>;
  if (type === "fornecedor") return <SupplierCatalog companyId={companyId} companies={companies} onCompany={setCompanyId} onBack={() => setType("menu")}/>;
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="panel h-fit overflow-hidden">
        <div className="border-b border-slate-200 p-4"><button onClick={() => setType("menu")} className="font-bold text-blue-800">← Todos os cadastros</button><div className="mt-1 text-xs text-slate-500">Selecione para consultar ou incluir</div></div>
        <div className="max-h-[650px] overflow-y-auto p-2">{masterTypes.map(([value, label]) => <button key={value} onClick={() => { setType(value); reset(); setMessage(""); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${type === value ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"}`}><Tags size={16} />{label}<ChevronRight size={15} className="ml-auto" /></button>)}</div>
      </aside>
      <div className="space-y-5">
        <section className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{currentLabel}</h3><p className="text-sm text-slate-500">Os registros pertencem somente à empresa selecionada.</p>{type === "profissional" && <div className="mt-3"><input ref={professionalFile} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => importProfessionals(e.target.files?.[0])}/><button type="button" disabled={busy || !companyId} onClick={() => professionalFile.current?.click()} className="btn-secondary"><Upload size={16}/> Importar Excel do efetivo</button><p className="mt-1 text-xs text-slate-500">Importa somente mecânicos, supervisores de transporte e encarregados de transporte.</p></div>}</div><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Origem: Central administrativa → Empresas</span></label></div>
          <form onSubmit={save} className="mt-5 border-t border-slate-100 pt-5">
            {type === "profissional" ? <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <label className="text-sm font-semibold">Matrícula<input className="input mt-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></label><label className="text-sm font-semibold md:col-span-2">Nome do profissional<input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label className="text-sm font-semibold">Contato<input className="input mt-1" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}/></label><label className="text-sm font-semibold">Função<input className="input mt-1" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })}/></label>
              <label className="text-sm font-semibold">Admissão<input type="date" className="input mt-1" value={form.admission} onChange={(e) => setForm({ ...form, admission: e.target.value })}/></label><label className="text-sm font-semibold">Exames<input type="date" className="input mt-1" value={form.exams} onChange={(e) => setForm({ ...form, exams: e.target.value })}/></label><label className="text-sm font-semibold">Integração 1<input type="date" className="input mt-1" value={form.integration1} onChange={(e) => setForm({ ...form, integration1: e.target.value })}/></label><label className="text-sm font-semibold">Integração 2<input type="date" className="input mt-1" value={form.integration2} onChange={(e) => setForm({ ...form, integration2: e.target.value })}/></label><label className="text-sm font-semibold">Integração 3<input type="date" className="input mt-1" value={form.integration3} onChange={(e) => setForm({ ...form, integration3: e.target.value })}/></label><label className="text-sm font-semibold">Demissão<input type="date" className="input mt-1" value={form.dismissal} onChange={(e) => setForm({ ...form, dismissal: e.target.value })}/></label>
              <label className="text-sm font-semibold">Número da CNH<input className="input mt-1" value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })}/></label><label className="text-sm font-semibold">Validade da CNH<input type="date" className="input mt-1" value={form.cnhExpiry} onChange={(e) => setForm({ ...form, cnhExpiry: e.target.value })}/></label><label className="text-sm font-semibold">Status atual<select className="input mt-1" value={form.professionalStatus} onChange={(e) => setForm({ ...form, professionalStatus: e.target.value })}><option>Apto</option><option>Falta exame médico</option><option>Integração pendente</option><option>CNH vencida</option><option>Demitido</option></select></label>
              <label className="text-sm font-semibold md:col-span-3 xl:col-span-5">Observações<textarea className="input mt-1 min-h-24" value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} placeholder="Restrições, qualificações, afastamentos ou informações adicionais do profissional"/></label>
            </div> : <div className="grid gap-3 md:grid-cols-[180px_1fr_1.4fr]">
              <label className="text-sm font-semibold">{type === "checklist_item" ? "Tipo de equipamento" : "Código"}<input required={type === "checklist_item"} className="input mt-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={type === "checklist_item" ? "Ex.: Caminhão Munck" : "Opcional"}/></label><label className="text-sm font-semibold">{type === "checklist_item" ? "Item da inspeção" : "Nome"}<input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label className="text-sm font-semibold">{type === "checklist_item" ? "Orientação / critério" : "Descrição"}<input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes ou observação"/></label>
            </div>}
            {type === "checklist_item" && <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Cadastre todos os itens pertencentes ao mesmo tipo de equipamento. Ao abrir o checklist de um equipamento, o sistema carregará somente os itens do tipo correspondente.</div>}
            <div className="mt-4 flex justify-end gap-2"><button disabled={busy || !companyId} className="btn-primary">{editingId ? <Pencil size={16}/> : <Plus size={16}/>} {busy ? "Salvando..." : editingId ? "Atualizar" : "Incluir"}</button>{editingId && <button type="button" onClick={reset} className="btn-secondary">Cancelar</button>}</div>
          </form>
          {message && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
        </section>
        <section className="panel overflow-hidden">
          <div className="panel-head flex-wrap"><div><h3>Registros cadastrados</h3><p>{filtered.length} resultado(s)</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search size={16} className="text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-44 bg-transparent text-sm outline-none" placeholder="Pesquisar" /></label><select aria-label="Filtrar status" className="input w-auto min-w-32" value={masterStatusFilter} onChange={(e) => setMasterStatusFilter(e.target.value as "all" | "active" | "inactive")}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><select aria-label="Ordenar registros" className="input w-auto min-w-40" value={masterSortBy} onChange={(e) => setMasterSortBy(e.target.value as "code" | "name" | "description" | "status")}><option value="code">Ordenar: Código</option><option value="name">Ordenar: Nome</option>{type !== "profissional" && <option value="description">Ordenar: Descrição</option>}<option value="status">Ordenar: Status</option></select><button type="button" className="btn-secondary" onClick={() => setMasterSortDirection((direction) => direction === "asc" ? "desc" : "asc")} title="Alternar ordem">{masterSortDirection === "asc" ? "↑ Crescente" : "↓ Decrescente"}</button></div></div>
          <div className="overflow-x-auto"><table><thead><tr><th>{type === "profissional" ? "Matrícula" : type === "checklist_item" ? "Tipo de equipamento" : "Código"}</th><th>{type === "profissional" ? "Profissional" : type === "checklist_item" ? "Item da inspeção" : "Nome"}</th><th>{type === "profissional" ? "Função / situação" : "Descrição"}</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((record) => { let details: any = {}; try { details = JSON.parse(record.description || "{}"); } catch {} return <tr key={record.id}><td>{record.code || "—"}</td><td className="font-semibold">{record.name}</td><td>{type === "profissional" ? `${details.job || "Função não informada"} • ${details.professionalStatus || "Sem status"}` : record.description || "—"}</td><td><Badge tone={record.active ? "green" : "slate"}>{record.active ? "Ativo" : "Inativo"}</Badge></td><td><div className="flex gap-2"><button onClick={() => edit(record)} className="row-action"><Pencil size={14}/></button><button onClick={() => remove(record.id)} className="row-action text-red-700"><Trash2 size={14}/></button></div></td></tr>; })}{!filtered.length && <tr><td colSpan={5} className="py-10 text-center text-slate-500">Nenhum registro cadastrado. Use o formulário acima para testar.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </div>
  );
}

function ProductCatalog({ companyId, companies, onCompany, onBack }: { companyId: string; companies: any[]; onCompany: (id: string) => void; onBack: () => void }) {
  const empty = { code: "", name: "", unit: "UN", category: "", itemType: "product", application: "", manufacturerReference: "" };
  const formRef = useRef<HTMLElement | null>(null);
  const [rows, setRows] = useState<any[]>([]), [form, setForm] = useState<any>(empty), [editingId, setEditingId] = useState<string | null>(null), [selected, setSelected] = useState<any | null>(null), [history, setHistory] = useState<any[]>([]), [summary, setSummary] = useState<any>({}), [message, setMessage] = useState("");
  const [catalogSearch, setCatalogSearch] = useState(""), [catalogSortBy, setCatalogSortBy] = useState("code"), [catalogSortDirection, setCatalogSortDirection] = useState<"asc" | "desc">("asc"), [catalogStatus, setCatalogStatus] = useState("all");
  const categories = [...new Set([...rows.map((row) => row.category).filter(Boolean), "Combustíveis", "Lubrificantes e fluidos", "Motor e alimentação", "Arrefecimento", "Emissões e escapamento", "Transmissão e embreagem", "Freios", "Suspensão e direção", "Pneus e rodas", "Elétrica e eletrônica", "Iluminação e sinalização", "Climatização", "Cabine e carroceria", "Hidráulica de implementos", "Implementos e material rodante", "Materiais gerais de oficina", "Ferramentas e segurança", "Lavagem e conservação", "Transporte e locação", "Seguros e regularização", "Despesas de viagem", "Documentação e regularização", "Despesas administrativas"])]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" }));
  async function load() { if (!companyId) return; const response = await fetch(`/api/products?companyId=${encodeURIComponent(companyId)}`), data = await response.json(); if (response.ok) setRows(data.products || []); else setMessage(data.error || "Não foi possível carregar os produtos."); }
  useEffect(() => { load(); }, [companyId]);
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await offlineRequest("/api/products", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, id: editingId, ...form }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível salvar o produto."); setMessage(editingId ? "Produto atualizado." : "Produto cadastrado."); setForm(empty); setEditingId(null); await load(); }
  async function remove(row: any) {
    if (!window.confirm(`Excluir “${row.name}”? Se houver movimentação em Nota Fiscal, o cadastro será apenas inativado para preservar o histórico.`)) return;
    const response = await fetch(`/api/products?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(row.id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Não foi possível excluir o produto ou serviço.");
    setMessage(data.message || (data.deactivated ? "Produto inativado." : "Produto excluído."));
    if (editingId === row.id) { setEditingId(null); setForm(empty); }
    if (selected?.id === row.id) { setSelected(null); setHistory([]); setSummary({}); }
    await load();
  }
  async function openHistory(row: any) { const response = await fetch(`/api/products?companyId=${encodeURIComponent(companyId)}&productId=${encodeURIComponent(row.id)}`), data = await response.json(); setSelected(row); setHistory(data.history || []); setSummary(data.summary || {}); }
  function editProduct(row: any) {
    setEditingId(row.id);
    setForm({
      code: row.code || "", name: row.name || "", unit: row.unit || "UN", category: row.category || "",
      itemType: row.itemType || "product", application: row.application || "", manufacturerReference: row.manufacturerReference || "",
    });
    setMessage(`Editando ${row.code} • ${row.name}. Altere os campos e clique em Atualizar.`);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  const money = (cents: any) => cents == null ? "Sem compras" : (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const catalogRows = rows.filter((row) => `${row.code} ${row.name} ${row.category} ${row.application || ""}`.toLowerCase().includes(catalogSearch.toLowerCase())).filter((row) => catalogStatus === "all" || (catalogStatus === "active" ? row.active !== false : row.active === false)).sort((a, b) => { const result = String(a[catalogSortBy] || "").localeCompare(String(b[catalogSortBy] || ""), "pt-BR", { numeric: true, sensitivity: "base" }); return catalogSortDirection === "asc" ? result : -result; });
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><button onClick={onBack} className="text-sm font-bold text-blue-800">← Todos os cadastros</button><h2 className="mt-2 text-2xl font-black">Produtos e serviços</h2><p className="text-slate-500">Categoria, unidade, aplicação e histórico real das notas fiscais.</p></div><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => onCompany(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></label></div>
    <section ref={formRef} className={`panel p-5 scroll-mt-5 ${editingId ? "ring-2 ring-blue-500" : ""}`}>{editingId && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">Modo de edição ativo. Confira os dados abaixo e clique em Atualizar.</div>}<form onSubmit={save} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Código"><input required className="input mt-1" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}/></FuelField>
<FuelField label="Produto / serviço"><input required className="input mt-1 uppercase" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLocaleUpperCase("pt-BR") })}/></FuelField>
<FuelField label="Categoria"><select required className="input mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Selecione</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></FuelField>
<FuelField label="Tipo"><select className="input mt-1" value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })}><option value="product">Produto</option><option value="service">Serviço</option></select></FuelField>
<FuelField label="Unidade"><select className="input mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{["UN","KIT","JG","PAR","MT","LT","KG","SV","DIA","H","KM"].map((value) => <option key={value}>{value}</option>)}</select></FuelField>
<FuelField label="Aplicação / equipamento compatível"><input className="input mt-1" value={form.application} onChange={(e) => setForm({ ...form, application: e.target.value })}/></FuelField>
<FuelField label="Referência do fabricante"><input className="input mt-1" value={form.manufacturerReference} onChange={(e) => setForm({ ...form, manufacturerReference: e.target.value })}/></FuelField>
<div className="flex items-end gap-2"><button className="btn-primary"><Plus size={16}/>{editingId ? "Atualizar" : "Cadastrar"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(empty); }} className="btn-secondary">Cancelar</button>}</div></form>{message && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}</section>
    {selected && <section className="panel overflow-hidden"><div className="panel-head"><div><h3>Histórico de compra • {selected.name}</h3><p>Comparação somente da mesma aplicação, especificação e unidade.</p></div><button onClick={() => setSelected(null)} className="btn-secondary">Fechar</button></div><div className="grid gap-3 p-5 md:grid-cols-3"><Mini label="Menor preço" value={money(summary.minimumPriceCents)}/><Mini label={`Fornecedor do menor preço${summary.minimumSupplier ? ` • ${summary.minimumSupplier}` : ""}`} value={summary.minimumPurchaseDate ? summary.minimumPurchaseDate.split("-").reverse().join("/") : "Sem histórico"}/><Mini label={`Último fornecedor${summary.lastSupplier ? ` • ${summary.lastSupplier}` : ""}`} value={summary.lastPurchaseDate ? `${summary.lastPurchaseDate.split("-").reverse().join("/")} • ${money(summary.lastPriceCents)}` : "Sem compras"}/></div><div className="overflow-x-auto"><table><thead><tr><th>Data</th><th>Fornecedor</th><th>NF</th><th>Quantidade</th><th>Preço unitário</th><th>Total</th></tr></thead><tbody>{history.map((row, index) => <tr key={index}><td>{row.purchaseDate.split("-").reverse().join("/")}</td><td className="font-semibold">{row.supplierName}</td><td>{row.invoiceNumber}</td><td>{row.quantityMilli / 1000}</td><td>{money(row.unitPriceCents)}</td><td>{money(row.totalCents)}</td></tr>)}{!history.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">O histórico será formado automaticamente pelas próximas notas fiscais vinculadas a este produto.</td></tr>}</tbody></table></div></section>}
    <section className="panel overflow-hidden"><div className="panel-head flex-wrap"><div><h3>Catálogo cadastrado</h3><p>{catalogRows.length} produto(s) e serviço(s)</p></div><div className="flex flex-wrap gap-2"><input className="input w-48" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Pesquisar"/><select className="input w-auto" value={catalogStatus} onChange={(e) => setCatalogStatus(e.target.value)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><select className="input w-auto" value={catalogSortBy} onChange={(e) => setCatalogSortBy(e.target.value)}><option value="code">Ordenar: Código</option><option value="name">Ordenar: Nome</option><option value="category">Ordenar: Categoria</option><option value="unit">Ordenar: Unidade</option><option value="itemType">Ordenar: Tipo</option></select><button className="btn-secondary" onClick={() => setCatalogSortDirection((value) => value === "asc" ? "desc" : "asc")}>{catalogSortDirection === "asc" ? "↑ Crescente" : "↓ Decrescente"}</button></div></div><div className="overflow-x-auto"><table className="min-w-[900px]"><thead><tr><th>Código</th><th>Produto / serviço</th><th>Categoria</th><th>Unidade</th><th>Tipo</th><th>Aplicação</th><th>Ações</th></tr></thead><tbody>{catalogRows.map((row) => <tr key={row.id} className={editingId === row.id ? "bg-blue-50" : ""}><td>{row.code}</td><td className="font-semibold uppercase">{row.name}</td><td>{row.category}</td><td>{row.unit}</td><td>{row.itemType === "service" ? "Serviço" : "Produto"}</td><td>{row.application || "—"}</td><td><div className="flex flex-wrap gap-2"><button onClick={() => openHistory(row)} className="row-action">Histórico</button><button onClick={() => editProduct(row)} className="row-action"><Pencil size={14}/>Editar</button><button onClick={() => remove(row)} className="row-action text-red-700"><Trash2 size={14}/>Excluir</button></div></td></tr>)}{!catalogRows.length && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Nenhum produto encontrado.</td></tr>}</tbody></table></div></section>
  </div>;
}

function SupplierCatalog({ companyId, companies, onCompany, onBack }: { companyId: string; companies: any[]; onCompany: (id: string) => void; onBack: () => void }) {
  const empty: any = { name: "", tradeName: "", taxId: "", stateRegistration: "", address: "", district: "", zipCode: "", city: "", state: "", contactName: "", phone: "", email: "", freightType: "Outro", simpleNational: "Não optante", paymentMethod: "Crédito em conta própria", pixKey: "", accountHolder: "", accountType: "Conta Corrente", bank: "", bankAgency: "", bankAccount: "", financialContact: "", active: true };
  const states = [["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],["SE","Sergipe"],["TO","Tocantins"]];
  const [rows, setRows] = useState<any[]>([]), [form, setForm] = useState<any>(empty), [editingId, setEditingId] = useState<string | null>(null), [tab, setTab] = useState<"registration"|"financial">("registration"), [message, setMessage] = useState(""), [canDelete, setCanDelete] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState(""), [supplierSortBy, setSupplierSortBy] = useState("name"), [supplierSortDirection, setSupplierSortDirection] = useState<"asc" | "desc">("asc"), [supplierStatus, setSupplierStatus] = useState("all");
  async function load() { if (!companyId) return; const response = await fetch(`/api/suppliers?companyId=${encodeURIComponent(companyId)}`), data = await response.json(); if (response.ok) { setRows(data.suppliers || []); setCanDelete(Boolean(data.canDelete)); } else setMessage(data.error || "Não foi possível carregar os fornecedores."); }
  useEffect(() => { load(); }, [companyId]);
  async function save(event: React.FormEvent) { event.preventDefault(); const response = await offlineRequest("/api/suppliers", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, id: editingId, ...form }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível salvar."); setMessage(editingId ? "Fornecedor atualizado." : "Fornecedor cadastrado."); setEditingId(null); setForm(empty); await load(); }
  async function remove(row: any) { if (!window.confirm(`Excluir o fornecedor “${row.name}”? Esta ação não poderá ser desfeita.`)) return; const response = await fetch(`/api/suppliers?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(row.id)}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) return setMessage(data.error || "Não foi possível excluir o fornecedor."); setMessage("Fornecedor excluído pelo administrador master."); if (editingId === row.id) { setEditingId(null); setForm(empty); } await load(); }
  const field = (label: string, key: string, type = "text") => <FuelField label={label}><input type={type} className="input mt-1" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })}/></FuelField>
;
  const supplierRows = rows.filter((row) => `${row.code || ""} ${row.name} ${row.tradeName || ""} ${row.taxId || ""} ${row.city || ""}`.toLowerCase().includes(supplierSearch.toLowerCase())).filter((row) => supplierStatus === "all" || (supplierStatus === "active" ? row.active !== false : row.active === false)).sort((a, b) => { const result = String(a[supplierSortBy] || "").localeCompare(String(b[supplierSortBy] || ""), "pt-BR", { numeric: true, sensitivity: "base" }); return supplierSortDirection === "asc" ? result : -result; });
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><button onClick={onBack} className="text-sm font-bold text-blue-800">← Todos os cadastros</button><h2 className="mt-2 text-2xl font-black">Fornecedores e locadores</h2><p className="text-slate-500">Dados cadastrais, contatos e informações financeiras.</p></div><label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => onCompany(e.target.value)}>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></label></div><section className="panel overflow-hidden"><div className="flex gap-2 border-b border-slate-200 p-4"><button onClick={() => setTab("registration")} className={tab === "registration" ? "btn-primary" : "btn-secondary"}>Dados do fornecedor</button><button onClick={() => setTab("financial")} className={tab === "financial" ? "btn-primary" : "btn-secondary"}>Dados financeiros</button></div><form onSubmit={save} className="p-5">{tab === "registration" ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{field("Razão social", "name")}{field("Nome fantasia", "tradeName")}{field("CNPJ / CPF", "taxId")}{field("Inscrição estadual", "stateRegistration")}{field("Endereço", "address")}{field("Bairro", "district")}{field("CEP", "zipCode")}{field("Cidade", "city")}<FuelField label="UF"><select className="input mt-1" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })}><option value="">Selecione</option>{states.map(([uf, name]) => <option key={uf} value={uf}>{uf} • {name}</option>)}</select></FuelField>
{field("Nome do contato", "contactName")}{field("Telefone", "phone")}{field("E-mail", "email", "email")}<FuelField label="Tipo de frete"><select className="input mt-1" value={form.freightType} onChange={(e) => setForm({ ...form, freightType: e.target.value })}><option>Outro</option><option>CIF</option><option>FOB</option><option>Sem frete</option></select></FuelField>
</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Simples Nacional"><select className="input mt-1" value={form.simpleNational} onChange={(e) => setForm({ ...form, simpleNational: e.target.value })}><option>Não optante</option><option>Optante</option></select></FuelField>
<FuelField label="Forma de pagamento"><select className="input mt-1" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option>Crédito em conta própria</option><option>PIX</option><option>Boleto</option><option>Transferência / TED</option></select></FuelField>
{field("Chave PIX", "pixKey")}{field("Titular da conta", "accountHolder")}<FuelField label="Tipo de conta"><select className="input mt-1" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}><option>Conta Corrente</option><option>Conta Poupança</option><option>Conta Pagamento</option></select></FuelField>
{field("Banco", "bank")}{field("Agência", "bankAgency")}{field("Número da conta", "bankAccount")}{field("Contato financeiro", "financialContact")}</div>}<div className="mt-4 flex justify-end gap-2"><button className="btn-primary"><CheckCircle2 size={16}/>{editingId ? "Atualizar fornecedor" : "Cadastrar fornecedor"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(empty); }} className="btn-secondary">Cancelar</button>}</div></form>{message && <div className="border-t border-slate-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}</section><section className="panel overflow-hidden"><div className="panel-head flex-wrap"><div><h3>Fornecedores cadastrados</h3><p>{supplierRows.length} registro(s){canDelete ? " • exclusão disponível somente para administrador master" : ""}</p></div><div className="flex flex-wrap gap-2"><input className="input w-48" value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Pesquisar"/><select className="input w-auto" value={supplierStatus} onChange={(e) => setSupplierStatus(e.target.value)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select><select className="input w-auto" value={supplierSortBy} onChange={(e) => setSupplierSortBy(e.target.value)}><option value="name">Ordenar: Razão social</option><option value="tradeName">Ordenar: Nome fantasia</option><option value="taxId">Ordenar: CNPJ/CPF</option><option value="city">Ordenar: Cidade</option><option value="paymentMethod">Ordenar: Pagamento</option></select><button className="btn-secondary" onClick={() => setSupplierSortDirection((value) => value === "asc" ? "desc" : "asc")}>{supplierSortDirection === "asc" ? "↑ Crescente" : "↓ Decrescente"}</button></div></div><div className="overflow-x-auto"><table className="min-w-[900px]"><thead><tr><th>Razão social</th><th>Nome fantasia</th><th>CNPJ / CPF</th><th>Contato</th><th>Telefone</th><th>Pagamento</th><th>Ações</th></tr></thead><tbody>{supplierRows.map((row) => <tr key={row.id}><td className="font-semibold">{row.name}</td><td>{row.tradeName || "—"}</td><td>{row.taxId || "—"}</td><td>{row.contactName || row.email || "—"}</td><td>{row.phone || "—"}</td><td>{row.paymentMethod || "—"}</td><td><div className="flex gap-2"><button onClick={() => { setEditingId(row.id); setForm({ ...empty, ...row }); setTab("registration"); }} className="row-action"><Pencil size={14}/>Editar</button>{canDelete && <button onClick={() => remove(row)} className="row-action text-red-700"><Trash2 size={14}/>Excluir</button>}</div></td></tr>)}{!supplierRows.length && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Nenhum fornecedor encontrado.</td></tr>}</tbody></table></div></section></div>;
}

function BackupSyncPage() {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [backups, setBackups] = useState<{ id: string; fileName: string; recordCount: number; sizeBytes: number; createdAt: string }[]>([]);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [syncFailures, setSyncFailures] = useState<{ id: string; url: string; createdAt: string; status: number | null; error: string }[]>([]);

  async function refreshQueue() {
    setOnline(navigator.onLine);
    setPending(await offlineQueueCount().catch(() => 0));
  }
  async function loadBackups(id: string) {
    if (!id || !navigator.onLine) return setBackups([]);
    const response = await fetch(`/api/backups?companyId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (response.ok) setBackups(data.backups || []);
    else setMessage(data.error || "Não foi possível carregar os backups.");
  }
  useEffect(() => {
    setOnline(navigator.onLine);
    refreshQueue();
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const rows = data.companies || [];
      setCompanies(rows);
      if (rows[0]) setCompanyId(rows[0].id);
    }).catch(() => setMessage("As empresas serão carregadas quando a conexão voltar."));
    const update = () => refreshQueue();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("frota-sync-change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("frota-sync-change", update);
    };
  }, []);
  useEffect(() => { loadBackups(companyId); }, [companyId]);

  async function syncNow() {
    setWorking(true); setMessage("");
    const result = await flushOfflineQueue();
    setSyncFailures(result.failures || []);
    await refreshQueue();
    setWorking(false);
    setMessage(result.pending
      ? `${result.synced} sincronizado(s); ${result.pending} ainda pendente(s)${result.conflicts ? `; ${result.conflicts} duplicado(s) descartado(s)` : ""}.`
      : result.conflicts
        ? `${result.synced} sincronizado(s). ${result.conflicts} lançamento(s) duplicado(s) não foram reenviados.`
        : "Todos os lançamentos foram sincronizados.");
  }
  async function createBackup() {
    if (!companyId) return;
    setWorking(true); setMessage("");
    const response = await fetch("/api/backups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId }) });
    const data = await response.json();
    setWorking(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível gerar o backup.");
    setMessage("Backup criado e guardado com segurança.");
    await loadBackups(companyId);
  }
  async function downloadBackup(id: string, fileName: string) {
    const response = await fetch(`/api/backups?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(id)}`);
    if (!response.ok) return setMessage("Não foi possível baixar o backup.");
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = fileName; anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <section className="panel p-5">
        <div className="flex items-center gap-3">
          <div className={`iconbox ${online ? "green" : "red"}`}>{online ? <Wifi size={20} /> : <WifiOff size={20} />}</div>
          <div><h3 className="font-bold">Situação da sincronização</h3><p className="text-sm text-slate-500">{online ? "Conectado à base online" : "Trabalhando sem internet"}</p></div>
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <div className="text-3xl font-bold">{pending}</div>
          <div className="text-sm text-slate-500">lançamento(s) salvo(s) neste aparelho e ainda não confirmado(s) na base</div>
        </div>
        <button disabled={!online || working || !pending} onClick={syncNow} className="btn-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={17} className={working ? "animate-spin" : ""} />Sincronizar agora
        </button>
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          Sem internet, os lançamentos compatíveis ficam protegidos neste aparelho. Não limpe os dados do navegador antes da confirmação da sincronização.
        </div>
        {syncFailures.length > 0 && <div className="mt-4 space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-bold text-red-900">Motivo dos lançamentos ainda pendentes</div>
          {syncFailures.map((failure, index) => <div key={failure.id} className="rounded-lg bg-white px-3 py-2 text-xs text-red-800">
            <div className="font-bold">Lançamento {index + 1} • {failure.url.replace("/api/", "")}</div>
            <div>{failure.error}</div>
            <div className="mt-1 text-red-600">Salvo em {new Date(failure.createdAt).toLocaleString("pt-BR")}{failure.status ? ` • HTTP ${failure.status}` : ""}</div>
          </div>)}
          <div className="text-xs text-red-700">Os dados continuam protegidos neste aparelho e não foram apagados.</div>
        </div>}
      </section>
      <section className="panel overflow-hidden">
        <div className="panel-head"><div><h3>Backups por empresa</h3><p>Cópias completas separadas e disponíveis para download</p></div></div>
        <div className="space-y-4 p-5">
          <label className="block text-sm font-semibold">Empresa
            <select className="input mt-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Selecione</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.tradeName}</option>)}
            </select>
          </label>
          <button disabled={!online || working || !companyId} onClick={createBackup} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            <DatabaseBackup size={17} />{working ? "Processando..." : "Criar backup agora"}
          </button>
          {message && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</div>}
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {backups.length ? backups.map((backup) => (
              <div key={backup.id} className="flex flex-wrap items-center gap-3 p-3">
                <DatabaseBackup size={18} className="text-blue-700" />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{backup.fileName}</div><div className="text-xs text-slate-500">{new Date(backup.createdAt).toLocaleString("pt-BR")} • {backup.recordCount} registros • {(backup.sizeBytes / 1024).toFixed(1)} KB</div></div>
                <button onClick={() => downloadBackup(backup.id, backup.fileName)} className="btn-secondary"><Download size={16} />Baixar</button>
              </div>
            )) : <div className="p-5 text-sm text-slate-500">Nenhum backup encontrado para esta empresa.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function PermissionsPage() {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", role: "operator" });
  const [userMessage, setUserMessage] = useState("");
  const [userBusy, setUserBusy] = useState(false);
  const roleLabel: Record<string, string> = { super_admin: "Administrador geral", company_admin: "Administrador", manager: "Gestor", operator: "Operador", viewer: "Consulta" };
  async function loadUsers(id = companyId) {
    if (!id) return;
    const response = await fetch(`/api/users?companyId=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (response.ok) setUsers(data.users || []); else setUserMessage(data.error || "Não foi possível carregar os usuários.");
  }
  useEffect(() => {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      const rows = data.companies || []; setCompanies(rows);
      if (rows[0]) { setCompanyId(rows[0].id); loadUsers(rows[0].id); }
    }).catch(() => setUserMessage("Não foi possível carregar as empresas."));
  }, []);
  async function createUser(event: React.FormEvent) {
    event.preventDefault(); setUserBusy(true); setUserMessage("");
    const response = await offlineRequest("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...userForm, companyId }) });
    const data = await response.json(); setUserBusy(false);
    if (!response.ok) return setUserMessage(data.error || "Não foi possível cadastrar o usuário.");
    setUserMessage(data.queued ? data.message : "Usuário cadastrado. O acesso será reconhecido pelo e-mail informado.");
    setUserForm({ name: "", email: "", role: "operator" }); setShowUserForm(false); if (!data.queued) await loadUsers();
  }
  const modules = [
    "Empresas",
    "Usuários",
    "Fornecedores",
    "Obras, canteiros e centros de custo",
    "Tipos, marcas e modelos",
    "Contratos",
    "Equipamentos",
    "Manutenção",
    "Partes diárias",
    "Abastecimento",
    "Apropriação",
    "Relatórios",
  ];
  const [user, setUser] = useState("");
  const [profile, setProfile] = useState("Gestor");
  const [rules, setRules] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(modules.map((m, i) => [m, [true, i < 10, i < 9, false, i < 6, false, false, true]])),
  );
  const [saved, setSaved] = useState(false);
  function toggle(module: string, index: number) {
    if (profile === "Administrador") return;
    setRules((r) => ({
      ...r,
      [module]: r[module].map((v, i) => (i === index ? !v : v)),
    }));
    setSaved(false);
  }
  return (
    <div className="space-y-4">
    <section className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="min-w-64 text-sm font-semibold">Empresa<select className="input mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); loadUsers(e.target.value); }}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName}</option>)}</select></label>
        <button onClick={() => setShowUserForm(!showUserForm)} className="btn-primary"><Plus size={17} />{showUserForm ? "Fechar" : "Novo usuário"}</button>
      </div>
      {showUserForm && <form onSubmit={createUser} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
        <label className="text-sm font-semibold">Nome completo<input required className="input mt-1" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Nome do usuário" /></label>
        <label className="text-sm font-semibold">E-mail<input required type="email" className="input mt-1" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="usuario@empresa.com" /></label>
        <label className="text-sm font-semibold">Perfil do usuário<select className="input mt-1" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="company_admin">Administrador</option><option value="manager">Gestor</option><option value="operator">Operador</option><option value="viewer">Consulta</option><option value="super_admin">Administrador geral</option></select></label>
        <div className="md:col-span-3 flex justify-end"><button disabled={userBusy || !companyId} className="btn-primary"><ShieldCheck size={17} />{userBusy ? "Salvando..." : "Cadastrar usuário"}</button></div>
      </form>}
      {userMessage && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">{userMessage}</div>}
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td className="font-semibold">{item.displayName || "Usuário já vinculado"}</td><td>{item.email || "Conta vinculada anteriormente"}</td><td>{roleLabel[item.role] || item.role}</td><td><Badge tone={item.active ? "green" : "slate"}>{item.active ? "Ativo" : "Inativo"}</Badge></td></tr>)}{!users.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">Nenhum usuário cadastrado nesta empresa.</td></tr>}</tbody></table></div>
    </section>
    <DeletionApprovalPanel companyId={companyId}/>
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-5">
        <div className="flex-1">
          <h3 className="font-bold">Permissões por usuário e módulo</h3>
          <p className="text-sm text-slate-500">
            Administrador / 管理员 possui acesso total. Os demais perfis seguem esta matriz.
          </p>
        </div>
        <select
          className="input w-auto"
          value={user}
          onChange={(e) => { const selected = users.find((item) => item.id === e.target.value); setUser(e.target.value); if (selected) setProfile(roleLabel[selected.role] === "Administrador geral" ? "Administrador" : roleLabel[selected.role]); }}
        >
          <option value="">Selecione o usuário</option>
          {users.map((item) => <option key={item.id} value={item.id}>{item.displayName || item.email || "Usuário"} • {roleLabel[item.role] || item.role}</option>)}
        </select>
        <select className="input w-auto" value={profile} onChange={(e) => { setProfile(e.target.value); setSaved(false); }}>
          <option>Administrador</option>
          <option>Gestor</option>
          <option>Operador</option>
          <option>Consulta</option>
        </select>
      </div>
      {profile === "Administrador" && <div className="border-b border-blue-200 bg-blue-50 px-5 py-4"><div className="font-bold text-blue-900">Administrador / 管理员 — acesso total</div><p className="mt-1 text-sm text-blue-800">Pode cadastrar e alterar usuários, empresas, fornecedores, obras, centros de custo e equipamentos; consultar e alterar todos os registros; aprovar, cancelar, reabrir e gerar todos os relatórios.</p></div>}
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Módulo</th>
              <th className="text-center">Visualizar</th>
              <th className="text-center">Incluir</th>
              <th className="text-center">Alterar</th>
              <th className="text-center">Excluir</th>
              <th className="text-center">Aprovar</th>
              <th className="text-center">Cancelar</th>
              <th className="text-center">Reabrir</th>
              <th className="text-center">Relatórios</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m}>
                <td className="font-semibold">{m}</td>
                {rules[m].map((checked, i) => (
                  <td key={i} className="text-center">
                    <input
                      aria-label={`${["Visualizar", "Incluir", "Alterar", "Excluir", "Aprovar", "Cancelar", "Reabrir", "Relatórios"][i]} ${m}`}
                      type="checkbox"
                      checked={profile === "Administrador" ? true : checked}
                      onChange={() => toggle(m, i)}
                      disabled={profile === "Administrador"}
                      className="h-5 w-5 accent-blue-700"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 p-4">
        <span className="text-sm text-emerald-700">
          {saved
            ? "Permissões salvas com sucesso."
            : "Alterações ainda não salvas."}
        </span>
        <button onClick={() => setSaved(true)} className="btn-primary">
          <ShieldCheck size={17} />
          Salvar permissões
        </button>
      </div>
    </section>
    <section className="grid gap-3 md:grid-cols-3">
      <div className="panel p-4"><div className="text-sm font-bold">Cadastros / 登记</div><p className="mt-1 text-sm text-slate-500">Usuários, empresas, fornecedores, obras, centros de custo, equipamentos, marcas e modelos.</p></div>
      <div className="panel p-4"><div className="text-sm font-bold">Controle / 管控</div><p className="mt-1 text-sm text-slate-500">Consulta e alteração total, incluindo aprovação, cancelamento e reabertura com auditoria.</p></div>
      <div className="panel p-4"><div className="text-sm font-bold">Relatórios / 报告</div><p className="mt-1 text-sm text-slate-500">Emissão de todos os relatórios operacionais, financeiros e gerenciais.</p></div>
    </section>
    </div>
  );
}

function RealAlerts() {
  const [alerts, setAlerts] = useState<{ contracts: any[]; tachographs: any[]; orders: any[] }>({ contracts: [], tachographs: [], orders: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try {
      const companyResponse = await fetch("/api/companies"), companyData = await companyResponse.json(), companyId = companyData.companies?.[0]?.id;
      if (!companyId) return;
      const [contractResponse, equipmentResponse, orderResponse] = await Promise.all([fetch(`/api/contracts?companyId=${encodeURIComponent(companyId)}`), fetch(`/api/equipment?companyId=${encodeURIComponent(companyId)}`), fetch(`/api/maintenance?companyId=${encodeURIComponent(companyId)}`)]);
      const [contractData, equipmentData, orderData] = await Promise.all([contractResponse.json(), equipmentResponse.json(), orderResponse.json()]);
      const now = new Date(), inThirtyDays = new Date(now.getTime() + 30 * 86400000);
      const contracts = (contractData.contracts || []).filter((row: any) => { const date = new Date(`${row.endsAt}T23:59:59`); return date >= now && date <= inThirtyDays; });
      const tachographs = (equipmentData.equipment || []).filter((row: any) => { if (!row.tachographExpiryDate) return false; const date = new Date(`${row.tachographExpiryDate}T23:59:59`); return date >= now && date <= inThirtyDays; });
      const orders = (orderData.orders || []).filter((row: any) => {
        const status = String(row.status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const maintenanceStatus = String(row.maintenanceStatus || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return !row.closedAt && !["closed", "concluido", "concluida"].includes(status) && !maintenanceStatus.includes("concluid");
      });
      setAlerts({ contracts, tachographs, orders });
    } finally { setLoading(false); }
  })(); }, []);
  if (loading) return <div className="rounded-xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">Consultando alertas reais...</div>;
  const total = alerts.contracts.length + alerts.tachographs.length + alerts.orders.length;
  if (!total) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Nenhum alerta real identificado para a SEPCO1.</div>;
  return <div className="space-y-3">
    {alerts.contracts.map((row: any) => <AlertItem key={`contract-${row.id}`} icon={CalendarClock} color="red" title={`${row.number} vence em ${Math.max(0, Math.ceil((new Date(`${row.endsAt}T23:59:59`).getTime() - Date.now()) / 86400000))} dias`} text={`${row.supplierName || "Locador não informado"} • ${row.object || "Contrato"}`}/>)}
    {alerts.tachographs.map((row: any) => <AlertItem key={`tachograph-${row.id}`} icon={ShieldCheck} color="amber" title="Tacógrafo próximo do vencimento" text={`Frota ${row.fleetNumber} • ${row.plate || "sem placa"} • vencimento em ${String(row.tachographExpiryDate).split("-").reverse().join("/")}.`}/>)}
    {alerts.orders.length > 0 && <AlertItem icon={Wrench} color="amber" title={`${alerts.orders.length} O.S. em andamento`} text="Consulte Ordens de Serviço para acompanhar os registros reais."/>}
  </div>;
}

function Modal({ kind, close }: { kind: string; close: () => void }) {
  const standalone =
    kind === "nova empresa" || kind === "novo contrato" || kind === "nova o.s.";
  const wide = kind === "novo contrato" || kind === "nova o.s.";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-2 sm:p-4">
      <div className={`flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-[96vw] xl:max-w-7xl" : "max-w-lg"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-bold capitalize">{kind}</h3>
            <p className="text-sm text-slate-500">
              Preencha ou revise as informações abaixo.
            </p>
          </div>
          <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100">
            <X />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          {kind === "nova empresa" ? (
            <CompanyForm close={close} />
          ) : kind === "novo contrato" ? (
            <ContractForm close={close} />
          ) : kind === "nova o.s." ? (
            <MaintenanceForm close={close} />
          ) : kind === "alertas" ? (
            <RealAlerts />
          ) : kind.includes("importar") ? (
            <>
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Upload className="mx-auto text-blue-700" />
                <div className="mt-3 font-semibold">
                  Arraste a planilha ou escolha o arquivo
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  XLSX ou CSV • identificação por frota e/ou placa
                </div>
                <button className="btn-secondary mt-4">Escolher arquivo</button>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                O sistema validará duplicidades e divergências entre número de
                frota e placa antes de importar.
              </div>
            </>
          ) : kind === "contrato" ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">Consulte o módulo Contratos para abrir os dados reais do contrato selecionado.</div>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                Identificação
                <input
                  className="input mt-2"
                  placeholder="Informe o número, placa ou descrição"
                />
              </label>
              <label className="block text-sm font-semibold">
                Observação
                <textarea
                  className="input mt-2 min-h-24"
                  placeholder="Informações adicionais"
                />
              </label>
            </>
          )}
        </div>
        {!standalone && (
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <button onClick={close} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={close} className="btn-primary">
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyForm({ close }: { close: () => void }) {
  const [form, setForm] = useState({ legalName: "", tradeName: "", taxId: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await offlineRequest("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok)
      return setMessage(data.error || "Não foi possível cadastrar.");
    if (data.queued) {
      setMessage(data.message);
      setTimeout(close, 1200);
    } else {
      close();
      window.location.reload();
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-semibold">
        Razão social
        <input
          required
          className="input mt-2"
          value={form.legalName}
          onChange={(e) => setForm({ ...form, legalName: e.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold">
        Nome fantasia
        <input
          required
          className="input mt-2"
          value={form.tradeName}
          onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold">
        CNPJ
        <input
          required
          className="input mt-2"
          value={form.taxId}
          onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          placeholder="00.000.000/0000-00"
        />
      </label>
      {message && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={close} className="btn-secondary">
          Cancelar
        </button>
        <button disabled={saving} className="btn-primary">
          {saving ? "Salvando..." : "Cadastrar empresa"}
        </button>
      </div>
    </form>
  );
}

function CompaniesPage({ setModal }: { setModal: (value: string) => void }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [companySortBy, setCompanySortBy] = useState("legalName");
  const [companySortDirection, setCompanySortDirection] = useState<"asc" | "desc">("asc");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ legalName: "", tradeName: "", taxId: "" });

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as empresas.");
      setCompanies(data.companies || []);
      setSelected((current: any) => current ? (data.companies || []).find((row: any) => row.id === current.id) || null : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar as empresas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  const filtered = companies.filter((row) => `${row.legalName} ${row.tradeName} ${row.taxId}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = String(a[companySortBy] || "").localeCompare(String(b[companySortBy] || ""), "pt-BR", { numeric: true, sensitivity: "base" }); return companySortDirection === "asc" ? result : -result; });
  const roleLabel: Record<string, string> = { super_admin: "Administrador geral", company_admin: "Administrador da empresa", manager: "Gestor", operator: "Operador", viewer: "Consulta" };
  const formatTaxId = (value = "") => value.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");

  function startEditing(company: any) {
    setSelected(company);
    setEditForm({ legalName: company.legalName || "", tradeName: company.tradeName || "", taxId: formatTaxId(company.taxId || "") });
    setMessage("");
    setEditing(true);
  }

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return; setSaving(true); setMessage("");
    const response = await fetch("/api/companies", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: selected.id, ...editForm }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível alterar a empresa.");
    setSelected(data.company); setEditing(false); setMessage("Informações da empresa alteradas e registradas no histórico."); await load();
  }

  async function deleteCompany(company: any) {
    const reason = window.prompt(`Informe o motivo para excluir “${company.tradeName}”.\n\nA empresa será retirada das listas, mas seus registros serão preservados para auditoria.`);
    if (reason === null) return;
    if (reason.trim().length < 10) return setMessage("Informe uma justificativa com pelo menos 10 caracteres.");
    if (!window.confirm(`Confirma a exclusão de “${company.tradeName}”?`)) return;
    const response = await fetch("/api/companies", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: company.id, reason }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Não foi possível excluir a empresa.");
    setSelected(null); setEditing(false); setMessage(data.message); await load();
  }

  if (selected) return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div><h3 className="text-xl font-black">Dados da empresa</h3><p className="text-sm text-slate-500">Identificação da empresa administrada e seu vínculo de acesso.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => startEditing(selected)}><Pencil size={17}/>Alterar informações</button><button className="row-action text-red-700" onClick={() => deleteCompany(selected)}><Trash2 size={15}/>Excluir empresa</button><button className="btn-secondary" onClick={() => { setSelected(null); setEditing(false); }}><X size={17}/>Fechar detalhes</button></div>
      </div>
      {message && <div className={`border-b p-3 text-sm font-semibold ${message.includes("alteradas") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}
      {editing ? <form onSubmit={saveCompany} className="space-y-4 p-5"><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-semibold">Razão social<input required className="input mt-2" value={editForm.legalName} onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}/></label><label className="text-sm font-semibold">Nome fantasia<input required className="input mt-2" value={editForm.tradeName} onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}/></label><label className="text-sm font-semibold">CNPJ<input required className="input mt-2" value={editForm.taxId} onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}/></label></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancelar</button><button disabled={saving} className="btn-primary">{saving ? "Salvando..." : "Salvar alterações"}</button></div></form> : <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        <CompanyDetail label="Razão social" value={selected.legalName}/>
        <CompanyDetail label="Nome fantasia" value={selected.tradeName}/>
        <CompanyDetail label="CNPJ" value={formatTaxId(selected.taxId)}/>
        <CompanyDetail label="Seu perfil nesta empresa" value={roleLabel[selected.role] || selected.role}/>
        <CompanyDetail label="Situação" value="Ativa" tone="green"/>
        <CompanyDetail label="Separação de dados" value="Contratos, medições e operação próprios"/>
      </div>}
      <div className="border-t border-slate-200 bg-blue-50 p-4 text-sm text-blue-900">Os registros desta empresa permanecem isolados das demais empresas administradas. O acesso aos módulos é definido em <strong>Usuários e permissões</strong>.</div>
    </section>
  );

  return (
    <div className="space-y-4">
      {message && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por razão social, nome fantasia ou CNPJ..."/></div>
          <select className="input w-auto" value={companySortBy} onChange={(e) => setCompanySortBy(e.target.value)}><option value="legalName">Ordenar: Razão social</option><option value="tradeName">Ordenar: Nome fantasia</option><option value="taxId">Ordenar: CNPJ</option><option value="role">Ordenar: Perfil</option></select><button className="btn-secondary" onClick={() => setCompanySortDirection((value) => value === "asc" ? "desc" : "asc")}>{companySortDirection === "asc" ? "↑ Crescente" : "↓ Decrescente"}</button>
          <button className="btn-secondary" onClick={load}><RefreshCw size={17}/>Atualizar</button>
          <button className="btn-primary" onClick={() => setModal("nova empresa")}><Plus size={17}/>Nova empresa</button>
        </div>
        <div className="overflow-x-auto"><table className="min-w-[820px]"><thead><tr><th>Razão social</th><th>Nome fantasia</th><th>CNPJ</th><th>Perfil</th><th>Situação</th><th></th></tr></thead><tbody>
          {filtered.map((row) => <tr key={row.id}><td className="font-semibold">{row.legalName}</td><td>{row.tradeName}</td><td>{formatTaxId(row.taxId)}</td><td>{roleLabel[row.role] || row.role}</td><td><Badge tone="green">Ativa</Badge></td><td><div className="flex flex-wrap gap-2"><button className="row-action" onClick={() => setSelected(row)}>Abrir</button><button className="row-action text-blue-700" onClick={() => startEditing(row)}><Pencil size={14}/>Alterar</button><button className="row-action text-red-700" onClick={() => deleteCompany(row)}><Trash2 size={14}/>Excluir</button></div></td></tr>)}
          {!loading && !filtered.length && <tr><td colSpan={6} className="py-10 text-center text-slate-500">Nenhuma empresa encontrada.</td></tr>}
          {loading && <tr><td colSpan={6} className="py-10 text-center text-slate-500">Carregando empresas...</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}

function CompanyDetail({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-2 font-semibold ${tone === "green" ? "text-emerald-700" : "text-slate-900"}`}>{value || "—"}</div></div>;
}

function ContractForm({ close }: { close: () => void }) {
  const [companies, setCompanies] = useState<{ id: string; tradeName: string }[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<any[]>([]);
  const [initialContracts, setInitialContracts] = useState<any[]>([]);
  const [contractProjects, setContractProjects] = useState<any[]>([]);
  const [form, setForm] = useState({ companyId: "", number: "", object: "", contractType: "Locação de equipamento sem operador", documentKind: "initial", parentContractId: "", amendmentNumber: "1", supplierName: "", projectName: "", startsAt: "", endsAt: "" });
  const newItem = () => ({ id: crypto.randomUUID(), equipmentId: "", startsAt: "", endsAt: "", billingMode: "Mensal", monthlyEquipment: 0, monthlyOperator: 0, mobilization: 0, demobilization: 0, quantity: 1, status: "mobilized" });
  const [items, setItems] = useState<any[]>([newItem()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ code: "", name: "", description: "" });
  async function loadOptions(companyId: string) {
    if (!companyId) return;
    const [response, projectsResponse] = await Promise.all([fetch(`/api/contracts?companyId=${encodeURIComponent(companyId)}&options=1`), fetch(`/api/master-data?companyId=${encodeURIComponent(companyId)}&type=obra`)]), data = await response.json(), projectsData = await projectsResponse.json();
    if (response.ok) { setSuppliers(data.suppliers || []); setEquipmentOptions(data.equipment || []); setInitialContracts(data.initialContracts || []); } else setMessage(data.error || "Não foi possível carregar os dados do contrato.");
    if (projectsResponse.ok) setContractProjects((projectsData.records || []).filter((row: any) => row.active));
  }
  useEffect(() => { fetch("/api/companies").then((r) => r.json()).then((data) => { const rows = data.companies || []; setCompanies(rows); if (rows[0]) { setForm((current) => ({ ...current, companyId: rows[0].id })); loadOptions(rows[0].id); } }).catch(() => setMessage("Não foi possível carregar as empresas.")); }, []);
  function updateItem(id: string, key: string, value: string | number) { setItems((rows) => rows.map((row) => row.id === id ? { ...row, [key]: value } : row)); }
  async function saveSupplier(event: React.SyntheticEvent) {
    event.preventDefault(); setMessage("");
    const response = await offlineRequest("/api/suppliers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId: form.companyId, name: newSupplier.name, taxId: newSupplier.code, contactName: newSupplier.description }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Não foi possível cadastrar o locador/fornecedor.");
    setForm((current) => ({ ...current, supplierName: data.supplier.name })); setNewSupplier({ code: "", name: "", description: "" }); setShowSupplierForm(false); await loadOptions(form.companyId); setMessage("Locador/fornecedor cadastrado e selecionado no contrato.");
  }
  function monthsBetween(start: string, end: string) { if (!start || !end) return 0; const a = new Date(`${start}T12:00:00`), b = new Date(`${end}T12:00:00`); return Math.max(1, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()); }
  const includesOperator = form.contractType.toLowerCase().includes("operador") || form.contractType.toLowerCase().includes("mão de obra");
  const total = items.reduce((sum, row) => sum + ((Number(row.monthlyEquipment) + Number(row.monthlyOperator)) * monthsBetween(row.startsAt, row.endsAt) + Number(row.mobilization) + Number(row.demobilization)) * Number(row.quantity || 1), 0);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const starts = items.map((row) => row.startsAt).filter(Boolean).sort(), ends = items.map((row) => row.endsAt).filter(Boolean).sort();
    const response = await offlineRequest("/api/contracts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, startsAt: starts[0] || form.startsAt, endsAt: ends.at(-1) || form.endsAt, totalCents: Math.round(total * 100), monthlyAmountCents: Math.round(items.reduce((sum, row) => sum + Number(row.monthlyEquipment) + Number(row.monthlyOperator), 0) * 100), monthlyRentCents: Math.round(items.reduce((sum, row) => sum + Number(row.monthlyEquipment), 0) * 100), monthlyLaborCents: Math.round(items.reduce((sum, row) => sum + Number(row.monthlyOperator), 0) * 100), amendmentNumber: Number(form.amendmentNumber), items }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setMessage(data.error || "Não foi possível salvar o contrato.");
    if (data.queued) setMessage(data.message); else { setMessage(form.documentKind === "amendment" ? "Aditivo cadastrado e pronto para gerar o Anexo I." : "Contrato inicial cadastrado e pronto para gerar o Anexo I."); setTimeout(close, 1400); }
  }
  return <form onSubmit={save} className="space-y-5">
    <div className="grid gap-3 md:grid-cols-3"><FuelField label="Empresa"><select required className="input mt-1" value={form.companyId} onChange={(e) => { setForm({ ...form, companyId: e.target.value }); loadOptions(e.target.value); }}><option value="">Selecione</option>{companies.map((row) => <option key={row.id} value={row.id}>{row.tradeName}</option>)}</select></FuelField>
<FuelField label="Documento"><select className="input mt-1" value={form.documentKind} onChange={(e) => setForm({ ...form, documentKind: e.target.value, parentContractId: "" })}><option value="initial">Primeiro contrato</option><option value="amendment">Aditivo</option></select></FuelField>
{form.documentKind === "amendment" ? <FuelField label="Contrato inicial"><select required className="input mt-1" value={form.parentContractId} onChange={(e) => setForm({ ...form, parentContractId: e.target.value })}><option value="">Selecione</option>{initialContracts.map((row) => <option key={row.id} value={row.id}>{row.number} • {row.supplierName || row.object}</option>)}</select></FuelField>
 : <FuelField label="Número do contrato"><input required className="input mt-1" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })}/></FuelField>
}</div>
    {form.documentKind === "amendment" && <div className="grid gap-3 md:grid-cols-2"><FuelField label="Número do aditivo"><input required type="number" min="1" className="input mt-1" value={form.amendmentNumber} onChange={(e) => setForm({ ...form, amendmentNumber: e.target.value })}/></FuelField>
<FuelField label="Identificação do documento"><input required className="input mt-1" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Ex.: CT-2025 - Aditivo I"/></FuelField>
</div>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><FuelField label="Locador / fornecedor"><select required className="input mt-1" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })}><option value="">Selecione um cadastro</option>{suppliers.map((row) => <option key={row.id} value={row.name}>{row.name}</option>)}</select><button type="button" onClick={() => setShowSupplierForm(!showSupplierForm)} className="mt-2 text-sm font-bold text-blue-700 hover:underline"><Plus className="mr-1 inline" size={14}/>{showSupplierForm ? "Fechar cadastro" : "Cadastrar novo locador/fornecedor"}</button></FuelField>
<FuelField label="Tipo de contrato"><select className="input mt-1" value={form.contractType} onChange={(e) => { const next = e.target.value; setForm({ ...form, contractType: next }); if (!next.toLowerCase().includes("operador") && !next.toLowerCase().includes("mão de obra")) setItems((rows) => rows.map((row) => ({ ...row, monthlyOperator: 0 }))); }}><option>Locação de equipamento sem operador</option><option>Locação de equipamento com operador</option><option>Locação + Mão de obra</option><option>Prestação de serviços</option></select></FuelField>
<FuelField label="Obra / projeto"><select required className="input mt-1" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })}><option value="">Selecione uma obra cadastrada</option>{contractProjects.map((row) => <option key={row.id} value={row.name}>{row.code ? `${row.code} • ` : ""}{row.name}</option>)}</select></FuelField>
<FuelField label="Objeto do contrato"><input required className="input mt-1" value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })}/></FuelField>
</div>
    {showSupplierForm && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="mb-3"><h4 className="font-bold text-blue-950">Cadastro rápido de locador/fornecedor</h4><p className="text-sm text-blue-800">O cadastro ficará disponível também para contratos, notas fiscais, cotações e ordens de serviço.</p></div><div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]"><FuelField label="CPF / CNPJ ou código"><input className="input mt-1 bg-white" value={newSupplier.code} onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}/></FuelField>
<FuelField label="Nome / razão social"><input className="input mt-1 bg-white" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}/></FuelField>
<FuelField label="Observação / contato"><input className="input mt-1 bg-white" value={newSupplier.description} onChange={(e) => setNewSupplier({ ...newSupplier, description: e.target.value })}/></FuelField>
<div className="flex items-end"><button type="button" onClick={saveSupplier} className="btn-primary"><CheckCircle2 size={16}/>Salvar cadastro</button></div></div></div>}
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Regra:</strong> um contrato ou aditivo pode possuir vários equipamentos. Cada equipamento terá sua própria data de entrada, data final e valores para alimentar o Anexo I. <strong>Com operador</strong> e <strong>com mão de obra</strong> usam o mesmo critério: valor do equipamento + valor do operador/mão de obra.</div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-bold">Equipamentos do contrato / aditivo</h4><button type="button" onClick={() => setItems((rows) => [...rows, newItem()])} className="btn-secondary"><Plus size={16}/>Adicionar equipamento</button></div>{items.map((row, index) => { const asset = equipmentOptions.find((item) => item.id === row.equipmentId); return <div key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex justify-between"><div className="font-bold">Item {index + 1}{asset ? ` • ${asset.fleetNumber} • ${asset.plate || "Sem placa"}` : ""}</div>{items.length > 1 && <button type="button" onClick={() => setItems((current) => current.filter((item) => item.id !== row.id))} className="row-action text-red-700"><Trash2 size={15}/>Remover</button>}</div><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5"><FuelField label="Equipamento"><select required className="input mt-1" value={row.equipmentId} onChange={(e) => updateItem(row.id, "equipmentId", e.target.value)}><option value="">Selecione</option>{equipmentOptions.map((item) => <option key={item.id} value={item.id}>{item.fleetNumber} • {item.plate || "Sem placa"} • {item.description}</option>)}</select></FuelField>
<FuelField label="Data de entrada"><input required type="date" className="input mt-1" value={row.startsAt} onChange={(e) => updateItem(row.id, "startsAt", e.target.value)}/></FuelField>
<FuelField label="Data final"><input required type="date" className="input mt-1" value={row.endsAt} onChange={(e) => updateItem(row.id, "endsAt", e.target.value)}/></FuelField>
<FuelField label="Modalidade"><select className="input mt-1" value={row.billingMode} onChange={(e) => updateItem(row.id, "billingMode", e.target.value)}><option>Mensal</option><option>Diária</option><option>Horímetro</option><option>Quilômetro</option></select></FuelField>
<FuelField label="Quantidade"><input type="number" min="1" className="input mt-1" value={row.quantity} onChange={(e) => updateItem(row.id, "quantity", Number(e.target.value))}/></FuelField>
<FuelField label="Valor equipamento"><input type="number" min="0" step="0.01" className="input mt-1" value={row.monthlyEquipment} onChange={(e) => updateItem(row.id, "monthlyEquipment", Number(e.target.value))}/></FuelField>
<FuelField label="Valor operador"><input type="number" min="0" step="0.01" className="input mt-1" value={row.monthlyOperator} onChange={(e) => updateItem(row.id, "monthlyOperator", Number(e.target.value))}/></FuelField>
<FuelField label="Mobilização"><input type="number" min="0" step="0.01" className="input mt-1" value={row.mobilization} onChange={(e) => updateItem(row.id, "mobilization", Number(e.target.value))}/></FuelField>
<FuelField label="Desmobilização"><input type="number" min="0" step="0.01" className="input mt-1" value={row.demobilization} onChange={(e) => updateItem(row.id, "demobilization", Number(e.target.value))}/></FuelField>
<FuelField label="Situação"><select className="input mt-1" value={row.status} onChange={(e) => updateItem(row.id, "status", e.target.value)}><option value="mobilized">Mobilizado</option><option value="demobilized">Desmobilizado</option></select></FuelField>
</div>{asset && <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-4"><span>Tipo: <strong>{asset.equipmentType || "—"}</strong></span><span>Marca/modelo: <strong>{[asset.brand, asset.model].filter(Boolean).join(" / ") || "—"}</strong></span><span>Chassi: <strong>{asset.chassis || "—"}</strong></span><span>Renavam: <strong>{asset.renavam || "—"}</strong></span></div>}</div>; })}</div>
    <div className="flex flex-wrap items-center justify-between rounded-xl bg-slate-900 p-4 text-white"><div><div className="text-xs text-slate-300">Valor total calculado para o Anexo I</div><div className="text-xl font-black">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div><div className="flex gap-2"><button type="button" onClick={close} className="btn-secondary">Cancelar</button><button disabled={saving || !form.companyId} className="btn-primary"><CheckCircle2 size={17}/>{saving ? "Salvando..." : form.documentKind === "amendment" ? "Salvar aditivo" : "Salvar contrato"}</button></div></div>
    {message && <div className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">{message}</div>}
  </form>;
}

function ContractFormLegacy({ close }: { close: () => void }) {
  const [companies, setCompanies] = useState<
    { id: string; tradeName: string }[]
  >([]);
  const [form, setForm] = useState({
    companyId: "",
    number: "",
    object: "",
    startsAt: "",
    endsAt: "",
    total: "",
    contractType: "Locação de equipamento",
    monthlyRent: "",
    monthlyLabor: "",
    monthlyAmount: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const rows = d.companies || [];
        setCompanies(rows);
        if (rows[0]) setForm((f) => ({ ...f, companyId: rows[0].id }));
      })
      .catch(() => setMessage("Não foi possível carregar as empresas."));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const totalCents =
      Math.round(
        Number(form.total.replace(/\./g, "").replace(",", ".")) * 100,
      ) || 0;
    const parseMoney = (value: string) => Math.round((Number(value.replace(/\./g, "").replace(",", ".")) || 0) * 100);
    const monthlyRentCents = parseMoney(form.monthlyRent), monthlyLaborCents = parseMoney(form.monthlyLabor);
    const monthlyAmountCents = form.contractType.toLowerCase().includes("mão de obra") ? monthlyRentCents + monthlyLaborCents : parseMoney(form.monthlyAmount);
    const response = await offlineRequest("/api/contracts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, totalCents, monthlyRentCents, monthlyLaborCents, monthlyAmountCents }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok)
      return setMessage(data.error || "Não foi possível salvar.");
    if (data.queued) {
      setMessage(data.message);
      setTimeout(close, 1200);
    } else {
      close();
      window.location.reload();
    }
  }
  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block text-sm font-semibold">
        Empresa
        <select
          required
          className="input mt-2"
          value={form.companyId}
          onChange={(e) => setForm({ ...form, companyId: e.target.value })}
        >
          <option value="">Selecione</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tradeName}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-normal text-slate-500">Origem: Central administrativa → Empresas</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Número
          <input
            required
            className="input mt-2"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Valor total
          <input
            required
            className="input mt-2"
            value={form.total}
            onChange={(e) => setForm({ ...form, total: e.target.value })}
            placeholder="0,00"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Objeto do contrato
        <input
          required
          className="input mt-2"
          value={form.object}
          onChange={(e) => setForm({ ...form, object: e.target.value })}
        />
      </label>
      <label className="block text-sm font-semibold">Tipo de contrato<select required className="input mt-2" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value, ...(e.target.value.toLowerCase().includes("mão de obra") ? {} : { monthlyRent: "", monthlyLabor: "" }) })}><option>Locação de equipamento</option><option>Locação + Mão de obra</option><option>Prestação de serviços</option><option>Comodato</option></select></label>
      {form.contractType.toLowerCase().includes("mão de obra") && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="mb-3 font-bold text-blue-900">Composição do valor mensal</div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Valor mensal da locação<input required className="input mt-2 bg-white" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} placeholder="0,00"/></label><label className="text-sm font-semibold">Valor mensal da mão de obra<input required className="input mt-2 bg-white" value={form.monthlyLabor} onChange={(e) => setForm({ ...form, monthlyLabor: e.target.value })} placeholder="0,00"/></label></div><div className="mt-3 text-sm font-semibold text-blue-900">Valor mensal calculado: {((Number(form.monthlyRent.replace(/\./g, "").replace(",", ".")) || 0) + (Number(form.monthlyLabor.replace(/\./g, "").replace(",", ".")) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>}
      {!form.contractType.toLowerCase().includes("mão de obra") && <label className="block text-sm font-semibold">Valor mensal<input className="input mt-2" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} placeholder="0,00"/></label>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Início
          <input
            required
            type="date"
            className="input mt-2"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Término
          <input
            required
            type="date"
            className="input mt-2"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
          />
        </label>
      </div>
      {message && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={close} className="btn-secondary">
          Cancelar
        </button>
        <button disabled={saving || !companies.length} className="btn-primary">
          {saving ? "Salvando..." : "Salvar contrato"}
        </button>
      </div>
    </form>
  );
}

function MaintenanceForm({ close }: { close: () => void }) {
  const [form, setForm] = useState({
    fleet: "",
    plate: "",
    order: "",
    type: "Corretiva",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    lessor: "",
    email: "",
    notify: true,
  });
  const [message, setMessage] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Ordem de serviço aberta e aviso preparado para o locador.");
    if (form.notify && form.email) {
      const subject = `Aviso de manutenção - Frota ${form.fleet}${form.plate ? ` - ${form.plate}` : ""}`;
      const body = `Prezado(a) ${form.lessor || "locador"},\n\nInformamos que o equipamento da frota ${form.fleet}${form.plate ? `, placa ${form.plate}` : ""}, entrou em manutenção em ${form.date}.\n\nOrdem de serviço: ${form.order}\nTipo: ${form.type}\nDescrição: ${form.description}\n\nAtenciosamente,\nSetor de Transporte`;
      window.location.href = `mailto:${encodeURIComponent(form.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Número da frota
          <input
            required
            className="input mt-2"
            value={form.fleet}
            onChange={(e) => setForm({ ...form, fleet: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Placa
          <input
            className="input mt-2 uppercase"
            value={form.plate}
            onChange={(e) =>
              setForm({ ...form, plate: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label className="block text-sm font-semibold">
          Número da O.S.
          <input
            required
            className="input mt-2"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Entrada
          <input
            required
            type="date"
            className="input mt-2"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Tipo de manutenção
        <select
          className="input mt-2"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option>Corretiva</option>
          <option>Preventiva</option>
          <option>Acidente</option>
          <option>Borracharia</option>
          <option>Lava-jato</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Descrição
        <textarea
          required
          className="input mt-2 min-h-20"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">
          Locador/fornecedor
          <input
            className="input mt-2"
            value={form.lessor}
            onChange={(e) => setForm({ ...form, lessor: e.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          E-mail do locador
          <input
            type="email"
            className="input mt-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
      </div>
      <label className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">
        <input
          type="checkbox"
          checked={form.notify}
          onChange={(e) => setForm({ ...form, notify: e.target.checked })}
          className="h-5 w-5 accent-blue-700"
        />
        Preparar e-mail ao locador ao abrir a manutenção
      </label>
      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className="btn-secondary">
          Cancelar
        </button>
        <button className="btn-primary">
          <Mail size={17} />
          Abrir O.S. e preparar e-mail
        </button>
      </div>
    </form>
  );
}
function AlertItem({
  icon: Icon,
  color,
  title,
  text,
}: {
  icon: any;
  color: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className={`iconbox ${color} shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{text}</div>
      </div>
    </div>
  );
}
function Legend({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <strong className="text-lg">{value}</strong>
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
function Quick({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left text-sm font-semibold transition hover:border-blue-300 hover:bg-blue-50/50"
    >
      <div className="iconbox blue">
        <Icon size={18} />
      </div>
      {label}
      <ChevronRight className="ml-auto text-slate-400" size={16} />
    </button>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
function Source({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="iconbox blue">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-slate-500">{value}</div>
      </div>
      <CheckCircle2 className="text-emerald-500" size={19} />
    </div>
  );
}
function Progress({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <span className="text-sm">{label}</span>
      <Badge tone={value === "Pendente" ? "amber" : "green"}>{value}</Badge>
    </div>
  );
}

function FuelCreditNotesManager({ companyId, suppliers }: { companyId: string; suppliers: { id: string; name: string }[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    if (!companyId) return;
    const response = await fetch(`/api/fuel/stock?companyId=${encodeURIComponent(companyId)}&mode=credits`);
    const data = await response.json();
    if (response.ok) setRows(data.credits || []); else setNotice(data.error || "Não foi possível consultar os créditos.");
  }
  useEffect(() => { load(); }, [companyId]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    const response = await fetch("/api/fuel/stock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId, action: "register-credit", supplierId, creditNumber: number, issueDate: date, originalAmount: Number(amount) }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setNotice(data.error || "Não foi possível cadastrar o crédito.");
    setNotice("Nota de crédito cadastrada uma única vez e disponível para abastecimentos deste fornecedor."); setSupplierId(""); setNumber(""); setAmount(""); setOpen(false); load();
  }
  return <section className="panel p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Notas de crédito de combustível</h3><p className="text-sm text-slate-500">Cadastre cada crédito aqui uma vez. O abastecimento apenas registra seu uso e saldo.</p></div><button className="btn-secondary" onClick={() => setOpen(!open)}><Plus size={16}/>Cadastrar nota de crédito</button></div>
    {notice && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
    {open && <form onSubmit={save} className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-5"><label className="text-sm font-semibold">Fornecedor<select required className="input mt-1" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Selecione</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm font-semibold">Número da nota<input required className="input mt-1" value={number} onChange={(e) => setNumber(e.target.value)}/></label><label className="text-sm font-semibold">Data<input required type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)}/></label><label className="text-sm font-semibold">Valor original (R$)<input required min="0.01" step="0.01" type="number" className="input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)}/></label><div className="flex items-end"><button disabled={busy} className="btn-primary w-full">{busy ? "Salvando..." : "Salvar crédito"}</button></div></form>}
    <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Fornecedor</th><th>Nota</th><th>Original</th><th>Utilizado</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.supplierName}</td><td>{r.creditNumber}</td><td>{(r.originalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{((r.originalCents - r.remainingCents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{(r.remainingCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{r.remainingCents > 0 ? "Disponível" : "Utilizado"}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="py-4 text-center text-slate-500">Nenhuma nota de crédito cadastrada.</td></tr>}</tbody></table></div>
  </section>;
}
