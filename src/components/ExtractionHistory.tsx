import React, { useState } from 'react';
import {
  History,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  FileJson,
  Fingerprint,
  RotateCcw,
  Ban,
  Clock,
  CreditCard,
  Terminal,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Scale,
  Building2,
  ExternalLink,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  evaluateGovernanceDecision,
  computeDocumentSha256,
  buildBlinkaPaymentIntentPayload,
  DEFAULT_CORPORATE_POLICY,
  type CorporatePolicyConfig,
  type ExtractionResult,
} from '../utils/financialRules';

export interface HistoryItem {
  id: string;
  timestamp: string;
  title: string;
  result: ExtractionResult;
  sampleId?: string;
}

interface ExtractionHistoryProps {
  history: HistoryItem[];
  policy?: CorporatePolicyConfig;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onLoadAllSamples: () => void;
  onCfoDecisionForItem?: (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
  activeId?: string;
}

interface AccountingRow {
  ID: string;
  Fecha: string;
  Vencimiento: string;
  Urgencia: string;
  Proveedor: string;
  CuentaDestino: string;
  CuentaRegistradaOficial: string;
  CuentaVerificada: string;
  MontoOriginal: string;
  Monto: string;
  Moneda: string;
  MontoUSD: string;
  Decision: string;
  DecisionCode: string;
  ReglaActivada: string;
  Explicacion: string;
  RielBlinka: string;
  IdempotencyKey: string;
  AprobadoPorHumano: string;
  HashSHA256: string;
  HashCompleto: string;
  Integridad: string;
}

function getDecisionBadgeStyle(code: string) {
  switch (code) {
    case 'PAID':
      return {
        badge: 'bg-cyan-500/15 text-[#00F5D4] border-cyan-400/40 shadow-[0_0_12px_rgba(0,245,212,0.15)]',
        cardBorder: 'hover:border-cyan-400/50',
        dot: 'bg-[#00F5D4]',
        label: 'PAID • Autorizado',
      };
    case 'REJECTED':
      return {
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]',
        cardBorder: 'hover:border-rose-500/50',
        dot: 'bg-rose-500',
        label: 'REJECTED • Frenado',
      };
    default:
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]',
        cardBorder: 'hover:border-amber-400/50',
        dot: 'bg-amber-400',
        label: 'ESCALATED • Requiere CFO',
      };
  }
}

function getUrgencyBadgeStyle(level: string): string {
  if (level === 'VENCIDO') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  if (level === 'URGENTE_48H') return 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse';
  return 'bg-[#0D1322] text-slate-300 border-slate-700/60';
}

function formatDestinationAccount(item: HistoryItem): string {
  const bankName = item.result.vendor.bankDetails?.bankName || 'N/A';
  const accountNum = item.result.vendor.bankDetails?.accountNumber || 'S/N';
  return `${bankName} (${accountNum})`;
}

function mapItemToAccountingRow(
  item: HistoryItem,
  idx: number,
  policy: CorporatePolicyConfig
): AccountingRow {
  const decision = evaluateGovernanceDecision(item.result, policy);
  const payload = buildBlinkaPaymentIntentPayload(item.result, decision);
  const fallbackHash = computeDocumentSha256(
    item.result.documentMetadata.rawTextExcerpt || item.title
  );
  const isPromptInjection = item.result.securityAudit.promptInjectionDetected;
  const rawAmount = item.result.invoice.totalAmount ?? 0;
  const currency = item.result.invoice.currency || 'USD';

  return {
    ID: item.result.invoice.invoiceId || `DOC-${String(idx + 1).padStart(3, '0')}`,
    Fecha: item.result.invoice.issueDate || item.timestamp.slice(0, 10),
    Vencimiento: item.result.invoice.dueDate || 'Sin fecha',
    Urgencia: decision.urgency.label,
    Proveedor: item.result.vendor.name || 'Proveedor No Identificado',
    CuentaDestino: formatDestinationAccount(item),
    CuentaRegistradaOficial: decision.registeredAccount || 'No registrado',
    CuentaVerificada: decision.accountMatchesRegistered ? 'Verificada' : 'Alerta / No coincide',
    MontoOriginal: `${rawAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`,
    Monto: rawAmount.toFixed(2),
    Moneda: currency,
    MontoUSD: `$${decision.amountUsd.toFixed(2)} USD`,
    Decision: `${decision.actionLabel} (${decision.decisionCode})`,
    DecisionCode: decision.decisionCode,
    ReglaActivada: decision.triggeredRule,
    Explicacion: decision.explanation,
    RielBlinka: decision.recommendedRail,
    IdempotencyKey: payload.idempotencyKey,
    AprobadoPorHumano: payload.humanApprovedBy || 'Resolución Autónoma Agente',
    HashSHA256: item.result.securityAudit.shortHash || fallbackHash.shortHash,
    HashCompleto: item.result.securityAudit.documentHashSha256 || fallbackHash.fullHash,
    Integridad: isPromptInjection ? 'Alerta de Manipulación' : 'Integridad Verificada',
  };
}

export const ExtractionHistory: React.FC<ExtractionHistoryProps> = ({
  history,
  policy = DEFAULT_CORPORATE_POLICY,
  onSelect,
  onClear,
  onLoadAllSamples,
  onCfoDecisionForItem,
  activeId,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);
  const [filterDecision, setFilterDecision] = useState<'all' | 'PAID' | 'REJECTED' | 'ESCALATED'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const evaluatedHistory = history.map((item, idx) => ({
    item,
    decision: evaluateGovernanceDecision(item.result, policy),
    row: mapItemToAccountingRow(item, idx, policy),
  }));

  const accountingRows = evaluatedHistory.map((x) => x.row);
  const paidCount = evaluatedHistory.filter((x) => x.decision.decisionCode === 'PAID').length;
  const rejectedCount = evaluatedHistory.filter((x) => x.decision.decisionCode === 'REJECTED').length;
  const escalatedCount = evaluatedHistory.filter((x) => x.decision.decisionCode === 'ESCALATED').length;

  const filteredHistory = evaluatedHistory.filter(
    (x) => filterDecision === 'all' || x.decision.decisionCode === filterDecision
  );

  const totalPages = Math.max(Math.ceil(filteredHistory.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const currentPageItems = filteredHistory.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const decisionFilters: Array<{
    value: typeof filterDecision;
    label: string;
    count: number;
  }> = [
    { value: 'all', label: 'Todos', count: history.length },
    { value: 'PAID', label: 'Pagados', count: paidCount },
    { value: 'REJECTED', label: 'Rechazados', count: rejectedCount },
    { value: 'ESCALATED', label: 'Escalados', count: escalatedCount },
  ];

  const handleTogglePayload = (itemId: string) => {
    setExpandedPayloadId((prev) => (prev === itemId ? null : itemId));
  };

  const handleSetFilter = (decision: 'all' | 'PAID' | 'REJECTED' | 'ESCALATED') => {
    setFilterDecision(decision);
    setPage(1);
  };

  const handlePrevPage = () => setPage(Math.max(currentPage - 1, 1));
  const handleNextPage = () => setPage(Math.min(currentPage + 1, totalPages));

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Fecha',
      'Factura',
      'Proveedor',
      'Beneficiario',
      'Monto',
      'Moneda',
      'Monto Original',
      'Monto USD',
      'Para Cuándo (Due Date)',
      'Urgencia',
      'Cuenta Destino',
      'Cuenta Oficial Blinka',
      'Riel de Liquidación (Smart Rail)',
      'Idempotency Key',
      'Aprobación CFO',
      'Decisión',
      'Regla Activada',
      'Explicación',
      'Hash SHA-256',
      'Estado Integridad',
    ];

    const escapeCsv = (val: string) => `"${String(val ?? '').replaceAll('"', '""')}"`;

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...accountingRows.map((r) =>
        [
          r.ID,
          r.Fecha,
          r.ID,
          r.Proveedor,
          r.Proveedor,
          r.Monto,
          r.Moneda,
          r.MontoOriginal,
          r.MontoUSD,
          r.Vencimiento,
          r.Urgencia,
          r.CuentaDestino,
          r.CuentaRegistradaOficial,
          r.RielBlinka,
          r.IdempotencyKey,
          r.AprobadoPorHumano,
          r.Decision,
          r.ReglaActivada,
          r.Explicacion,
          r.HashSHA256,
          r.Integridad,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-conciliacion-mensual-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const payload = {
      auditExportTimestamp: new Date().toISOString(),
      system: 'Blinka Corporate Payment Governance (US -> LATAM Smart Rail Engine)',
      totalDocumentsAudited: accountingRows.length,
      accountingReconciliationLog: accountingRows,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-log-auditoria-contable-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#111827]/70 backdrop-blur-md rounded-3xl border border-slate-800/80 p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Header con métricas y barra de herramientas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/70 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-100">
                Conciliación Mensual Lista para Contabilidad
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00F5D4] border border-cyan-400/30">
                {history.length} Documentos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualización por Cards Contables enriquecidas • Cada campo organizado con detalle
              financiero, riel y decisión.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
          {/* Switcher de Vista: Cards / Grid */}
          <div className="flex items-center gap-1 bg-[#0D1322] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Cards en Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards en Grid</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer hover:brightness-110 transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0D1322] hover:bg-[#161F33] text-slate-200 border border-slate-700/80 shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileJson className="h-3.5 w-3.5 text-purple-400" />
            <span>JSON</span>
          </button>

          {history.length < 9 && (
            <button
              type="button"
              onClick={onLoadAllSamples}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-cyan-400/40 bg-cyan-500/10 text-[#00F5D4] hover:bg-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Recargar 9 Casos</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
              title="Limpiar bandeja"
              aria-label="Limpiar bandeja"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de Documentos en Cards Ultra Profesionales */}
      {history.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar conciliación por decisión">
            {decisionFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleSetFilter(filter.value)}
                aria-pressed={filterDecision === filter.value}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  filterDecision === filter.value
                    ? 'bg-cyan-500/15 text-[#00F5D4] border-cyan-400/50'
                    : 'bg-[#0D1322] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {filter.label} <span className="ml-1 font-mono">({filter.count})</span>
              </button>
            ))}
          </div>

          {currentPageItems.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
                  : 'space-y-4'
              }
            >
              {currentPageItems.map(({ item, decision }, idx) => {
            const displayIndex = (currentPage - 1) * PAGE_SIZE + idx;
            const isAttack = item.result.securityAudit.promptInjectionDetected;
            const origAmount = item.result.invoice.totalAmount ?? 0;
            const origCurrency = item.result.invoice.currency || 'USD';
            const vendorTitle = item.result.vendor.name || item.title;
            const invoiceNumber = item.result.invoice.invoiceId || `DOC-${String(displayIndex + 1).padStart(3, '0')}`;
            const issueDate = item.result.invoice.issueDate || item.timestamp.slice(0, 10);
            const dueDateLabel = item.result.invoice.dueDate || 'Sin fecha';
            const isActive = item.id === activeId;
            const isPayloadOpen = expandedPayloadId === item.id;
            const paymentPayload = buildBlinkaPaymentIntentPayload(item.result, decision);
            const fallbackHash = computeDocumentSha256(
              item.result.documentMetadata.rawTextExcerpt || item.title
            );
            const shortHash = item.result.securityAudit.shortHash || fallbackHash.shortHash;
            const accountNumber = item.result.vendor.bankDetails?.accountNumber || 'S/N';
            const bankName = item.result.vendor.bankDetails?.bankName || 'Banco no especificado';
            const countryRegion = item.result.vendor.countryRegion || 'Global';
            const badgeStyle = getDecisionBadgeStyle(decision.decisionCode);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'border-cyan-400/80 bg-[#121B2F] ring-2 ring-cyan-400/30 shadow-xl shadow-cyan-500/10'
                    : 'border-slate-800/80 bg-[#0D1322]/90 hover:border-slate-700 hover:bg-[#10182B]'
                }`}
              >
                {/* Header de la Card: Identificación, Decisión y Montos */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#12192A]/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#1A2338] border border-slate-700/80 flex items-center justify-center text-[#00F5D4] shrink-0 font-black text-xs">
                      {displayIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-slate-100 bg-[#0B0F19] px-2.5 py-0.5 rounded-lg border border-slate-700/80 text-[#00F5D4]">
                          #{invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Emitida: {issueDate}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getUrgencyBadgeStyle(
                            decision.urgency.level
                          )}`}
                        >
                          <Clock className="h-3 w-3 inline mr-1" />
                          Vence: {dueDateLabel}
                        </span>
                      </div>
                      <h5 className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                        <span className="truncate">{vendorTitle}</span>
                        <span className="text-xs font-normal text-slate-400">
                          ({countryRegion})
                        </span>
                      </h5>
                    </div>
                  </div>

                  {/* Bloque de Montos y Badge de Decisión */}
                  <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Monto Original
                      </div>
                      <div className="font-mono text-xs text-slate-300 font-semibold">
                        ${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
                      </div>
                      <div className="font-mono font-black text-sm sm:text-base text-[#00F5D4]">
                        ≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${badgeStyle.badge}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badgeStyle.dot} animate-pulse`} />
                        {badgeStyle.label}
                      </span>
                      {decision.humanApproval && (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-400/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {decision.humanApproval.reviewerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cuerpo de la Card: Campos Organizados en Bloques Limpios */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Campo 1: Cuenta Bancaria */}
                    <div className="bg-[#0B0F19]/90 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                        <span>Cuenta Destino</span>
                      </div>
                      <div className="font-mono text-xs text-white font-bold truncate">
                        {accountNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {bankName}
                      </div>
                      <div className="mt-1">
                        {decision.accountMatchesRegistered ? (
                          <span className="text-[10px] font-semibold text-[#00F5D4] bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-400/30">
                            ✓ Registrada Oficial
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-400/30">
                            ⚠ No coincide con historial
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Campo 2: Smart Rail Routing */}
                    <div className="bg-[#0B0F19]/90 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-[#00F5D4]" />
                        <span>Riel de Pago Recomendado</span>
                      </div>
                      <div className="font-mono text-xs text-purple-200 font-bold leading-tight">
                        {decision.recommendedRail}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {decision.decisionCode === 'PAID' ? (
                          <span className="text-[#00F5D4] font-medium">
                            ● Riel Activo para Liquidación
                          </span>
                        ) : (
                          <span className="text-amber-400/90 font-medium">
                            ⏸ Riel Pausado por Gobernanza
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Campo 3: Integridad Criptográfica */}
                    <div className="bg-[#0B0F19]/90 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <Fingerprint className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Hash SHA-256</span>
                      </div>
                      <div className="font-mono text-xs text-slate-300 font-bold">
                        {shortHash}
                      </div>
                      <div className="mt-1">
                        {isAttack ? (
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/40 inline-flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Alerta Manipulación
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#00F5D4] bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-400/40 inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Integridad Verificada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Campo 4: Explicación Contable en Lenguaje Claro */}
                  <div className="bg-[#0B0F19] rounded-xl p-3 sm:p-3.5 border border-slate-800 flex items-start gap-2.5">
                    <Scale className="h-4 w-4 text-[#00F5D4] shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-slate-200 flex-1">
                      <strong className="text-[#00F5D4] font-bold uppercase text-[10px] tracking-wider block mb-0.5">
                        Explicación Finanzas ({decision.triggeredRule}):
                      </strong>
                      <p>{decision.explanation}</p>
                    </div>
                  </div>

                  {/* Barra de Acciones y Payload API */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#162137] hover:bg-[#1E2D4A] text-slate-200 border border-slate-700/80 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#00F5D4]" />
                        <span>Inspeccionar en Simulador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePayload(item.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0D1322] hover:bg-[#141E33] text-purple-300 border border-purple-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Terminal className="h-3.5 w-3.5 text-[#00F5D4]" />
                        <span>
                          {isPayloadOpen ? 'Ocultar Payload' : 'BlinkaPaymentIntent JSON'}
                        </span>
                        {isPayloadOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Botones de Aprobación Humana CFO (si está ESCALATED) */}
                    {decision.decisionCode === 'ESCALATED' && onCfoDecisionForItem && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot')}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Autorizar Pago (CFO)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot')}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </div>
                    )}

                    {decision.humanApproval && onCfoDecisionForItem && (
                      <button
                        type="button"
                        onClick={() => onCfoDecisionForItem(item.id, 'RESET', 'Slack Finance Bot')}
                        className="text-[11px] font-semibold text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar a ESCALATED
                      </button>
                    )}
                  </div>

                  {/* Panel expandible de Payload API JSON */}
                  {isPayloadOpen && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#080C14] p-3.5 font-mono text-xs text-[#00F5D4] space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800 text-[11px]">
                        <span>Idempotency Key: {paymentPayload.idempotencyKey}</span>
                        <strong
                          className={
                            paymentPayload.paymentExecutionBlocked
                              ? 'text-rose-400'
                              : 'text-[#00F5D4]'
                          }
                        >
                          blocked: {String(paymentPayload.paymentExecutionBlocked)}
                        </strong>
                      </div>
                      <pre className="overflow-x-auto max-h-48 leading-relaxed text-[11px]">
                        <code>{JSON.stringify(paymentPayload, null, 2)}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center">
              <p className="text-sm font-semibold text-slate-200">No hay documentos en este filtro.</p>
              <button
                type="button"
                onClick={() => handleSetFilter('all')}
                className="mt-3 text-xs font-semibold text-[#00F5D4] hover:underline cursor-pointer"
              >
                Mostrar todos los documentos
              </button>
            </div>
          )}

          {filteredHistory.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/70 pt-4">
              <span className="text-xs text-slate-400">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredHistory.length)} de {filteredHistory.length}
              </span>
              <nav className="flex items-center gap-2" aria-label="Páginas de conciliación">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-200 hover:border-cyan-400/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="text-xs font-mono text-slate-300">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-200 hover:border-cyan-400/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl p-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-500 mb-3">
            <History className="h-7 w-7" />
          </div>
          <h5 className="text-sm font-bold text-slate-200 mb-1">
            Bandeja de Conciliación Vacía
          </h5>
          <p className="text-xs text-slate-400 mb-4 max-w-sm">
            No hay documentos en el registro contable. Puedes cargar los 9 escenarios del reto para ver la conciliación completa.
          </p>
          <button
            type="button"
            onClick={onLoadAllSamples}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all cursor-pointer"
          >
            Cargar Todos los 9 Escenarios
          </button>
        </div>
      )}
    </div>
  );
};
