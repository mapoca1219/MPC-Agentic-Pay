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
  ArrowRightLeft,
  Terminal,
  MessageSquare,
  UserCheck,
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
      return 'bg-cyan-500/20 text-[#00F5D4] border-cyan-400/50';
    case 'REJECTED':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    default:
      return 'bg-amber-500/20 text-amber-300 border-amber-400/50';
  }
}

function getUrgencyBadgeStyle(level: string): string {
  if (level === 'VENCIDO') return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  if (level === 'URGENTE_48H') return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
  return 'bg-[#0D1322] text-slate-300 border-slate-700';
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

interface HistoryDecisionCardProps {
  item: HistoryItem;
  policy: CorporatePolicyConfig;
  isActive: boolean;
  isPayloadOpen: boolean;
  onSelect: (item: HistoryItem) => void;
  onTogglePayload: (itemId: string) => void;
  onCfoDecisionForItem?: (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
}

const HistoryDecisionCard: React.FC<HistoryDecisionCardProps> = ({
  item,
  policy,
  isActive,
  isPayloadOpen,
  onSelect,
  onTogglePayload,
  onCfoDecisionForItem,
}) => {
  const isAttack = item.result.securityAudit.promptInjectionDetected;
  const decision = evaluateGovernanceDecision(item.result, policy);
  const paymentPayload = buildBlinkaPaymentIntentPayload(item.result, decision);
  const fallbackHash = computeDocumentSha256(
    item.result.documentMetadata.rawTextExcerpt || item.title
  );
  const shortHash = item.result.securityAudit.shortHash || fallbackHash.shortHash;
  const origAmount = item.result.invoice.totalAmount ?? 0;
  const origCurrency = item.result.invoice.currency || 'USD';
  const vendorTitle = item.result.vendor.name || item.title;
  const invoiceNumber = item.result.invoice.invoiceId || 'S/N';
  const countryRegion = item.result.vendor.countryRegion || 'Global';
  const accountNumber = item.result.vendor.bankDetails?.accountNumber || 'S/N';
  const dueDateLabel = item.result.invoice.dueDate || 'N/A';

  const cardClass = isActive
    ? 'border-cyan-400 bg-[#1C2841] ring-2 ring-cyan-400/40 shadow-lg'
    : 'border-slate-800 bg-[#0D1322] hover:bg-[#131B2E] hover:border-purple-500/40';

  const renderDecisionCodeIcon = () => {
    if (decision.decisionCode === 'REJECTED') return <Ban className="h-3 w-3" />;
    if (decision.decisionCode === 'ESCALATED') return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle2 className="h-3 w-3" />;
  };

  return (
    <div
      className={`p-4 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-2.5 ${cardClass}`}
    >
      <div className="flex items-start justify-between gap-2 w-full">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="text-left cursor-pointer group"
        >
          <span className="font-bold text-slate-100 group-hover:text-[#00F5D4] text-xs sm:text-sm block">
            {vendorTitle}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Factura #{invoiceNumber} • {countryRegion}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {decision.humanApproval && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              CFO
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 ${getDecisionBadgeStyle(
              decision.decisionCode
            )}`}
          >
            {renderDecisionCodeIcon()}
            {decision.decisionCode} • {decision.actionLabel}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(item)}
        className="w-full text-left bg-[#131B2E] rounded-lg p-2.5 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer"
      >
        <div>
          <span className="text-[10px] uppercase text-slate-400 font-bold block">
            Monto Original → Equivalente USD
          </span>
          <div className="font-mono font-bold text-white">
            ${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}{' '}
            <span className="text-[#00F5D4] font-black">
              (≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD)
            </span>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${getUrgencyBadgeStyle(
              decision.urgency.level
            )}`}
          >
            <Clock className="h-2.5 w-2.5" />
            {decision.urgency.label}
          </span>
          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
            Vence: {dueDateLabel}
          </span>
        </div>
      </button>

      <div className="w-full px-2.5 py-1.5 rounded-lg bg-[#131B2E] border border-purple-500/30 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-purple-200 truncate">
          <ArrowRightLeft className="h-3 w-3 text-[#00F5D4] shrink-0" />
          {decision.recommendedRail}
        </span>
        <span className="text-[10px] font-mono text-[#00F5D4] shrink-0 font-bold">
          {decision.decisionCode === 'PAID' ? 'Activo' : 'En espera'}
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed bg-[#131B2E] p-2.5 rounded-lg border border-slate-800 w-full">
        <strong className="text-white">Explicación Finanzas: </strong>
        {decision.explanation}
      </p>

      {decision.decisionCode === 'ESCALATED' && onCfoDecisionForItem && (
        <div className="w-full rounded-xl bg-amber-950/40 border border-amber-500/40 p-2.5 space-y-2">
          <p className="text-[11px] text-amber-100 leading-snug">
            🔔 <strong className="text-amber-300">Blinka Agent pide permiso (CFO):</strong> La
            cuenta de cobro de <strong className="text-[#00F5D4]">{vendorTitle}</strong> por{' '}
            <strong>
              ${origAmount.toLocaleString('en-US')} {origCurrency}
            </strong>{' '}
            se sale de la regla{' '}
            <code className="font-mono font-bold bg-amber-500/20 text-amber-300 px-1 rounded">
              {decision.triggeredRule}
            </code>
            {'. ¿Autorizas este pago?'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot')}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="h-3 w-3" />
              Autorizar Pago (CFO)
            </button>
            <button
              type="button"
              onClick={() => onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot')}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Ban className="h-3 w-3" />
              Rechazar
            </button>
          </div>
        </div>
      )}

      {decision.humanApproval && onCfoDecisionForItem && (
        <div className="w-full flex items-center justify-between bg-purple-950/40 border border-purple-500/40 px-2.5 py-1.5 rounded-lg text-[11px]">
          <span className="text-purple-200 font-medium flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-[#00F5D4]" />
            Resuelto por {decision.humanApproval.reviewerName}
          </span>
          <button
            type="button"
            onClick={() => onCfoDecisionForItem(item.id, 'RESET', 'Slack Finance Bot')}
            className="text-[10px] font-bold text-[#00F5D4] hover:underline cursor-pointer"
          >
            Restaurar ESCALATED
          </button>
        </div>
      )}

      {isPayloadOpen && (
        <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0B0F19] p-3 font-mono text-[10px] text-[#00F5D4] space-y-1">
          <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
            <span>BlinkaPaymentIntent • {paymentPayload.idempotencyKey}</span>
            <span
              className={
                paymentPayload.paymentExecutionBlocked
                  ? 'text-rose-400 font-bold'
                  : 'text-[#00F5D4] font-bold'
              }
            >
              blocked: {String(paymentPayload.paymentExecutionBlocked)}
            </span>
          </div>
          <pre className="overflow-x-auto max-h-48 leading-relaxed">
            <code>{JSON.stringify(paymentPayload, null, 2)}</code>
          </pre>
        </div>
      )}

      <div className="w-full pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap text-[10px]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-slate-400">
            <CreditCard className="h-3 w-3 text-slate-500 shrink-0" />
            {accountNumber}
          </span>

          <button
            type="button"
            onClick={() => onTogglePayload(item.id)}
            className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-[#161F33] hover:bg-purple-600 text-slate-100 border border-slate-700 cursor-pointer transition-colors"
          >
            <Terminal className="h-2.5 w-2.5 text-[#00F5D4]" />
            {isPayloadOpen ? 'Ocultar Payload API' : 'Ver Payload API Blinka'}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-slate-300 bg-[#161F33] border border-slate-700 px-1.5 py-0.5 rounded">
            <Fingerprint className="h-3 w-3 text-purple-400 shrink-0" />
            {shortHash}
          </span>

          {isAttack ? (
            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <ShieldAlert className="h-3 w-3 text-rose-400 shrink-0" />
              Alerta de Manipulación
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00F5D4] border border-cyan-400/40">
              <ShieldCheck className="h-3 w-3 text-[#00F5D4] shrink-0" />
              Integridad Verificada
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

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

  return (
    <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#00F5D4]" />
            <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-100">
              Bandeja de Decisiones, Smart Rails & Payload API ({history.length} casos)
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Incluye validación de cuenta bancaria histórica, riel transfronterizo recomendado,
            generador BlinkaPaymentIntent y aprobación CFO por chat.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Conciliación Mensual (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0D1322] hover:bg-[#161F33] text-slate-100 border border-slate-700 shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileJson className="h-3.5 w-3.5 text-purple-400" />
            <span>Exportar Auditoría (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTablePreview(!showTablePreview)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              showTablePreview
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                : 'bg-[#0D1322] border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>{showTablePreview ? 'Ocultar Tabla' : 'Ver Tabla de Conciliación'}</span>
          </button>

          {history.length < 9 && (
            <button
              type="button"
              onClick={onLoadAllSamples}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-cyan-400/40 bg-cyan-500/10 text-[#00F5D4] hover:bg-cyan-500/20 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Cargar Todos los Casos</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer transition-colors"
              title="Limpiar bandeja"
              aria-label="Limpiar bandeja"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showTablePreview && history.length > 0 && (
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0D1322] animate-in fade-in">
          <div className="bg-[#131B2E] text-white px-3.5 py-2 flex items-center justify-between text-[11px] border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-[#00F5D4]">
              Conciliación Mensual Lista para Contabilidad
            </span>
            <span className="font-mono text-slate-400">
              Fecha • Factura • Beneficiario • Monto USD • Riel Blinka • Decisión • Explicación
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161F33] text-slate-300 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2.5">Fecha</th>
                  <th className="py-2 px-2.5">Factura</th>
                  <th className="py-2 px-2.5">Beneficiario</th>
                  <th className="py-2 px-2.5 text-right">Monto Original</th>
                  <th className="py-2 px-2.5 text-right">Monto USD</th>
                  <th className="py-2 px-2.5">Riel Blinka</th>
                  <th className="py-2 px-2.5">Decisión</th>
                  <th className="py-2 px-2.5">Explicación en Lenguaje Claro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#0D1322]">
                {accountingRows.map((row) => (
                  <tr key={`${row.ID}-${row.HashSHA256}`} className="hover:bg-[#131B2E]">
                    <td className="py-2 px-2.5 font-mono text-slate-400 whitespace-nowrap">
                      {row.Fecha}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-white whitespace-nowrap">
                      {row.ID}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-200">{row.Proveedor}</td>
                    <td className="py-2 px-2.5 font-mono text-right text-slate-300 whitespace-nowrap">
                      {row.MontoOriginal}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-right text-[#00F5D4] whitespace-nowrap">
                      {row.MontoUSD}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-purple-300 whitespace-nowrap">
                      {row.RielBlinka}
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDecisionBadgeStyle(
                          row.DecisionCode
                        )}`}
                      >
                        {row.Decision}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-300 max-w-md">{row.Explicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400">
          No hay documentos en la bandeja.{' '}
          <button
            type="button"
            onClick={onLoadAllSamples}
            className="text-[#00F5D4] font-bold underline cursor-pointer"
          >
            Cargar todos los escenarios del Reto Blinka
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {history.map((item) => (
            <HistoryDecisionCard
              key={item.id}
              item={item}
              policy={policy}
              isActive={item.id === activeId}
              isPayloadOpen={expandedPayloadId === item.id}
              onSelect={onSelect}
              onTogglePayload={handleTogglePayload}
              onCfoDecisionForItem={onCfoDecisionForItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
