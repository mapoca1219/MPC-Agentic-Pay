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
  Table,
  AlertTriangle,
  Ban,
  Clock,
  CreditCard,
  Terminal,
  MessageSquare,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ArrowRightLeft,
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

function getDecisionBadgeStyle(code: string): string {
  switch (code) {
    case 'PAID':
      return 'bg-cyan-500/10 text-[#00F5D4] border-cyan-500/30';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
}

function getUrgencyBadgeStyle(level: string): string {
  if (level === 'VENCIDO') return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  if (level === 'URGENTE_48H') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return 'bg-[#0D1322] text-slate-400 border-slate-700/50';
}

function formatDestinationAccount(item: HistoryItem): string {
  const bankName = item.result.vendor.bankDetails?.bankName || 'N/A';
  const accountNum = item.result.vendor.bankDetails?.accountNumber || 'S/N';
  return `${bankName} • ${accountNum}`;
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
  const [showTablePreview, setShowTablePreview] = useState<boolean>(true);
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

  const accountingRows = history.map((item, idx) => mapItemToAccountingRow(item, idx, policy));

  const handleTogglePayload = (itemId: string) => {
    setExpandedPayloadId((prev) => (prev === itemId ? null : itemId));
  };

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

  const decisions = history.map((item) => evaluateGovernanceDecision(item.result, policy));
  const paidCount = decisions.filter((d) => d.decisionCode === 'PAID').length;
  const rejectedCount = decisions.filter((d) => d.decisionCode === 'REJECTED').length;
  const escalatedCount = decisions.filter((d) => d.decisionCode === 'ESCALATED').length;
  const totalPaidUsd = decisions
    .filter((d) => d.decisionCode === 'PAID')
    .reduce((acc, cur) => acc + cur.amountUsd, 0);

  return (
    <div className="bg-[#111827]/60 backdrop-blur-md rounded-3xl border border-slate-800/60 p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header con métricas resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-100">
              Conciliación Mensual — Lista para Contabilidad
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              {history.length} casos auditados • {paidCount} pagos autorizados • ${totalPaidUsd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })} USD liquidados
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={history.length === 0}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0D1322] hover:bg-[#161F33] text-slate-100 border border-slate-700/60 shadow-sm disabled:opacity-40 flex items-center gap-2 cursor-pointer transition-all"
          >
            <FileJson className="h-4 w-4 text-purple-400" />
            <span>Exportar JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTablePreview(!showTablePreview)}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-all ${
              showTablePreview
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-[#0D1322] border-slate-700/60 text-slate-300 hover:text-white hover:border-purple-500/50'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>{showTablePreview ? 'Ocultar Tabla' : 'Ver Tabla'}</span>
          </button>

          {history.length < 9 && (
            <button
              type="button"
              onClick={onLoadAllSamples}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-cyan-400/30 bg-cyan-500/5 text-[#00F5D4] hover:bg-cyan-500/10 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Cargar Todos los Casos</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="px-2.5 py-2.5 rounded-xl text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 flex items-center gap-2 cursor-pointer transition-colors"
              title="Limpiar bandeja"
              aria-label="Limpiar bandeja"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showTablePreview && history.length > 0 && (
        <div className="rounded-2xl border border-slate-800/60 overflow-hidden bg-[#0D1322]/80 shadow-xl">
          <div className="bg-[#0B0F19]/80 px-5 py-3 flex items-center justify-between text-[11px] border-b border-slate-800/60">
            <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#00F5D4]">
              <CreditCard className="h-3.5 w-3.5" />
              Registro Contable de Pagos
            </span>
            <span className="font-mono text-slate-500">
              Fecha • Factura • Beneficiario • Monto USD • Riel • Decisión • Explicación
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F19]/60 text-slate-400 text-[10px] uppercase border-b border-slate-800/60 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-bold tracking-wider">Fecha</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Factura</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Beneficiario</th>
                  <th className="py-3 px-4 font-bold tracking-wider text-right">Monto Original</th>
                  <th className="py-3 px-4 font-bold tracking-wider text-right">Monto USD</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Riel Blinka</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Decisión</th>
                  <th className="py-3 px-4 font-bold tracking-wider">Explicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-[#0D1322]/50">
                {accountingRows.map((row, idx) => (
                  <tr
                    key={`row-${idx}`}
                    className="hover:bg-[#131B2E]/40 transition-colors group"
                  >
                    <td className="py-4 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {row.Fecha}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-200 whitespace-nowrap group-hover:text-[#00F5D4]">
                      {row.ID}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-200 truncate max-w-xs">
                      {row.Proveedor}
                    </td>
                    <td className="py-4 px-4 font-mono text-right text-slate-400 whitespace-nowrap">
                      {row.MontoOriginal}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-right text-[#00F5D4] whitespace-nowrap">
                      {row.MontoUSD}
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px] text-purple-300 whitespace-nowrap">
                      {row.RielBlinka}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded border inline-flex items-center gap-1.5 ${getDecisionBadgeStyle(
                          row.DecisionCode
                        )}`}
                      >
                        {row.DecisionCode === 'PAID' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : row.DecisionCode === 'REJECTED' ? (
                          <Ban className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {row.Decision}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300 max-w-sm leading-relaxed">
                      {row.Explicacion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              No hay documentos en la bandeja.
              <button
                type="button"
                onClick={onLoadAllSamples}
                className="text-[#00F5D4] font-bold underline cursor-pointer mt-2"
              >
                Cargar todos los escenarios del Reto Blinka
              </button>
            </div>
          )}
        </div>
      )}

      {!showTablePreview && history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {history.map((item) => {
            const decision = evaluateGovernanceDecision(item.result, policy);
            const isAttack = item.result.securityAudit.promptInjectionDetected;
            const origAmount = item.result.invoice.totalAmount ?? 0;
            const origCurrency = item.result.invoice.currency || 'USD';
            const vendorTitle = item.result.vendor.name || item.title;
            const invoiceNumber = item.result.invoice.invoiceId || 'S/N';
            const dueDateLabel = item.result.invoice.dueDate || 'N/A';
            const isActive = item.id === activeId;
            const isPayloadOpen = expandedPayloadId === item.id;
            const paymentPayload = buildBlinkaPaymentIntentPayload(item.result, decision);
            const fallbackHash = computeDocumentSha256(
              item.result.documentMetadata.rawTextExcerpt || item.title
            );
            const shortHash = item.result.securityAudit.shortHash || fallbackHash.shortHash;
            const accountNumber = item.result.vendor.bankDetails?.accountNumber || 'S/N';
            const countryRegion = item.result.vendor.countryRegion || 'Global';

            const decisionStyles =
              decision.decisionCode === 'PAID'
                ? { border: 'border-cyan-500/30', badge: 'bg-cyan-500/10 text-[#00F5D4]', icon: <CheckCircle2 className="h-4 w-4 text-[#00F5D4]" /> }
                : decision.decisionCode === 'REJECTED'
                ? { border: 'border-rose-500/30', badge: 'bg-rose-500/10 text-rose-400', icon: <Ban className="h-4 w-4 text-rose-400" /> }
                : { border: 'border-amber-500/30', badge: 'bg-amber-500/10 text-amber-400', icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> };

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer group ${isActive
                  ? 'bg-[#1C2841]/60 border-cyan-400/50 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-[#0D1322]/60 border-slate-800/50 hover:border-purple-500/30 hover:bg-[#131B2E]/80'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${decisionStyles.badge}`}>
                        {decision.decisionCode} • {decision.actionLabel}
                      </span>
                      {decision.humanApproval && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          CFO
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-100 text-sm mb-0.5 group-hover:text-[#00F5D4] transition-colors">
                      {vendorTitle}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Factura #{invoiceNumber} • {countryRegion}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-[#00F5D4] text-sm">
                      {decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-800/40">
                    <span className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">
                      Vence
                    </span>
                    <span className="font-mono text-slate-200 text-xs">{dueDateLabel}</span>
                  </div>
                  <div className="bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-800/40">
                    <span className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">
                      Urgencia
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${getUrgencyBadgeStyle(
                        decision.urgency.level
                      )}`}
                    >
                      <Clock className="h-3 w-3" />
                      {decision.urgency.label}
                    </span>
                  </div>
                </div>

                <div className="bg-[#0B0F19]/40 p-3 rounded-xl border border-slate-800/40 mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-[#00F5D4]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Smart Rail
                    </span>
                  </div>
                  <div className="font-mono text-slate-200 text-xs">{decision.recommendedRail}</div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  <span className="text-slate-600 font-bold mr-1">Explicación:</span>
                  {decision.explanation}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePayload(item.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border bg-[#161F33] hover:bg-purple-600 text-slate-100 border-slate-700 cursor-pointer transition-colors group-hover:text-purple-300"
                  >
                    <Terminal className="h-3 w-3 text-[#00F5D4]" />
                    {isPayloadOpen ? 'Ocultar Payload' : 'Ver Payload API'}
                  </button>

                  {decision.decisionCode === 'ESCALATED' && onCfoDecisionForItem && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot');
                        }}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Autorizar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        <Ban className="h-3 w-3" />
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>

                {isPayloadOpen && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 bg-[#0B0F19] p-4 font-mono text-[10px] text-[#00F5D4] shadow-xl">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-2">
                      <span>BlinkaPaymentIntent • {paymentPayload.idempotencyKey}</span>
                      <span className={paymentPayload.paymentExecutionBlocked ? 'text-rose-400 font-bold' : 'text-[#00F5D4] font-bold'}>
                        blocked: {String(paymentPayload.paymentExecutionBlocked)}
                      </span>
                    </div>
                    <pre className="overflow-x-auto max-h-48 leading-relaxed">
                      <code>{JSON.stringify(paymentPayload, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-4">
            <History className="h-8 w-8" />
          </div>
          <h5 className="text-sm font-bold text-slate-200 mb-1">Bandeja Vacía</h5>
          <p className="text-xs text-slate-500 mb-6 max-w-sm">
            No hay documentos auditados aún. Usa el simulador para extraer facturas o carga los
            escenarios del reto.
          </p>
          <button
            type="button"
            onClick={onLoadAllSamples}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:from-purple-500 hover:to-cyan-400 transition-all"
          >
            Cargar Todos los Escenarios
          </button>
        </div>
      )}
    </div>
  );
};
