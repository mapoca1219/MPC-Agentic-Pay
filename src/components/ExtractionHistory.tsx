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

export const ExtractionHistory: React.FC<ExtractionHistoryProps> = ({
  history,
  onSelect,
  onClear,
  onLoadAllSamples,
  onCfoDecisionForItem,
  activeId,
}) => {
  const [showTablePreview, setShowTablePreview] = useState<boolean>(false);
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);

  const buildAccountingRows = () => {
    return history.map((item, idx) => {
      const decision = evaluateGovernanceDecision(item.result);
      const payload = buildBlinkaPaymentIntentPayload(item.result, decision);
      const fallbackHash = computeDocumentSha256(
        item.result.documentMetadata.rawTextExcerpt || item.title
      );
      const shortHash = item.result.securityAudit.shortHash || fallbackHash.shortHash;
      const fullHash = item.result.securityAudit.documentHashSha256 || fallbackHash.fullHash;
      const integrityBadge = item.result.securityAudit.promptInjectionDetected
        ? 'Alerta de Manipulación'
        : 'Integridad Verificada';

      const rawAmount = item.result.invoice.totalAmount ?? 0;
      const currency = item.result.invoice.currency || 'USD';

      return {
        ID: item.result.invoice.invoiceId || `DOC-${String(idx + 1).padStart(3, '0')}`,
        Fecha: item.result.invoice.issueDate || item.timestamp.slice(0, 10),
        Vencimiento: item.result.invoice.dueDate || 'Sin fecha',
        Urgencia: decision.urgency.label,
        Proveedor: item.result.vendor.name || 'Proveedor No Identificado',
        CuentaDestino: `${item.result.vendor.bankDetails?.bankName || 'N/A'} (${item.result.vendor.bankDetails?.accountNumber || 'S/N'})`,
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
        HashSHA256: shortHash,
        HashCompleto: fullHash,
        Integridad: integrityBadge,
      };
    });
  };

  const handleExportCSV = () => {
    const rows = buildAccountingRows();
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
      ...rows.map((r) =>
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
    const rows = buildAccountingRows();
    const payload = {
      auditExportTimestamp: new Date().toISOString(),
      system: 'Blinka Corporate Payment Governance (US -> LATAM Smart Rail Engine)',
      totalDocumentsAudited: rows.length,
      accountingReconciliationLog: rows,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-log-auditoria-contable-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDecisionBadgeStyle = (code: string) => {
    switch (code) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-amber-100 text-amber-900 border-amber-300';
    }
  };

  const getUrgencyBadgeStyle = (level: string) => {
    if (level === 'VENCIDO') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'URGENTE_48H') return 'bg-amber-50 text-amber-800 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const accountingRows = buildAccountingRows();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Accounting Audit Log Export Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Bandeja de Decisiones, Smart Rails & Payload API ({history.length} casos)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Incluye validación de cuenta bancaria histórica, riel transfronterizo recomendado, generador BlinkaPaymentIntent y aprobación CFO por chat.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Exportar Conciliación Mensual (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm disabled:opacity-40 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileJson className="h-3.5 w-3.5 text-indigo-300" />
            <span>Exportar Auditoría (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTablePreview(!showTablePreview)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-all ${
              showTablePreview
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>{showTablePreview ? 'Ocultar Tabla' : 'Ver Tabla de Conciliación'}</span>
          </button>

          {history.length < 9 && (
            <button
              type="button"
              onClick={onLoadAllSamples}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Cargar Todos los Casos</span>
            </button>
          )}

          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1.5 rounded-xl text-[11px] text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer transition-colors"
              title="Limpiar bandeja"
              aria-label="Limpiar bandeja"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Accounting Reconciliation Table Preview */}
      {showTablePreview && history.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/60 animate-in fade-in">
          <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-wider text-indigo-300">
              Conciliación Mensual Lista para Contabilidad
            </span>
            <span className="font-mono text-slate-400">
              Fecha • Factura • Beneficiario • Monto USD • Riel Blinka • Decisión • Explicación
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {accountingRows.map((row) => (
                  <tr key={`${row.ID}-${row.HashSHA256}`} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap">{row.Fecha}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{row.ID}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-800">{row.Proveedor}</td>
                    <td className="py-2 px-2.5 font-mono text-right text-slate-700 whitespace-nowrap">{row.MontoOriginal}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-right text-indigo-700 whitespace-nowrap">{row.MontoUSD}</td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">{row.RielBlinka}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDecisionBadgeStyle(row.DecisionCode)}`}>
                        {row.Decision}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-700 max-w-md">{row.Explicacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Cards Grid */}
      {history.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          No hay documentos en la bandeja.{' '}
          <button
            type="button"
            onClick={onLoadAllSamples}
            className="text-indigo-600 font-bold underline cursor-pointer"
          >
            Cargar todos los escenarios del Reto Blinka
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {history.map((item) => {
            const isActive = item.id === activeId;
            const isAttack = item.result.securityAudit.promptInjectionDetected;
            const decision = evaluateGovernanceDecision(item.result);
            const paymentPayload = buildBlinkaPaymentIntentPayload(item.result, decision);
            const isPayloadOpen = expandedPayloadId === item.id;
            const fallbackHash = computeDocumentSha256(
              item.result.documentMetadata.rawTextExcerpt || item.title
            );
            const shortHash = item.result.securityAudit.shortHash || fallbackHash.shortHash;
            const origAmount = item.result.invoice.totalAmount ?? 0;
            const origCurrency = item.result.invoice.currency || 'USD';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-2.5 ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Top: Vendor + Decision Pill (PAID / REJECTED / ESCALATED) */}
                <div className="flex items-start justify-between gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="text-left cursor-pointer group"
                  >
                    <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-xs sm:text-sm block">
                      {item.result.vendor.name || item.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Factura #{item.result.invoice.invoiceId || 'S/N'} •{' '}
                      {item.result.vendor.countryRegion || 'Global'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {decision.humanApproval && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        CFO
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 ${getDecisionBadgeStyle(
                        decision.decisionCode
                      )}`}
                    >
                      {decision.decisionCode === 'REJECTED' && <Ban className="h-3 w-3" />}
                      {decision.decisionCode === 'ESCALATED' && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {decision.decisionCode === 'PAID' && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {decision.decisionCode} • {decision.actionLabel}
                    </span>
                  </div>
                </div>

                {/* Amount Bar: Original Currency + Normalized USD Equivalent */}
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="w-full text-left bg-white rounded-lg p-2.5 border border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">
                      Monto Original → Equivalente USD
                    </span>
                    <div className="font-mono font-bold text-slate-900">
                      ${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      {origCurrency}{' '}
                      <span className="text-indigo-700 font-black">
                        (≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD)
                      </span>
                    </div>
                  </div>

                  {/* Due Date & Urgency Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${getUrgencyBadgeStyle(
                        decision.urgency.level
                      )}`}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {decision.urgency.label}
                    </span>
                    <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                      Vence: {item.result.invoice.dueDate || 'N/A'}
                    </span>
                  </div>
                </button>

                {/* Smart Rail Routing Badge */}
                <div className="w-full px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-indigo-950 truncate">
                    <ArrowRightLeft className="h-3 w-3 text-indigo-600 shrink-0" />
                    {decision.recommendedRail}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-700 shrink-0 font-bold">
                    {decision.decisionCode === 'PAID' ? 'Activo' : 'En espera'}
                  </span>
                </div>

                {/* Natural Spanish Explanation for Finance */}
                <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-100/80 p-2.5 rounded-lg border border-slate-200/70 w-full">
                  <strong className="text-slate-900">Explicación Finanzas: </strong>
                  {decision.explanation}
                </p>

                {/* Inline CFO Chat Approval Simulator when ESCALATED */}
                {decision.decisionCode === 'ESCALATED' && onCfoDecisionForItem && (
                  <div className="w-full rounded-xl bg-amber-50 border border-amber-300 p-2.5 space-y-2">
                    <p className="text-[11px] text-amber-950 leading-snug">
                      🔔 <strong>Blinka Agent pide permiso (Slack/WhatsApp CFO):</strong> La
                      cuenta de cobro de <strong>{item.result.vendor.name}</strong> por{' '}
                      <strong>
                        ${origAmount.toLocaleString('en-US')} {origCurrency}
                      </strong>{' '}
                      se sale de la regla{' '}
                      <code className="font-mono font-bold bg-amber-100 px-1 rounded">
                        {decision.triggeredRule}
                      </code>{'. ¿Autorizas este pago?'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot')
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Autorizar Pago (CFO)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot')
                        }
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Ban className="h-3 w-3" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {decision.humanApproval && onCfoDecisionForItem && (
                  <div className="w-full flex items-center justify-between bg-indigo-50/80 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-[11px]">
                    <span className="text-indigo-900 font-medium flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-indigo-600" />
                      Resuelto por {decision.humanApproval.reviewerName}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onCfoDecisionForItem(item.id, 'RESET', 'Slack Finance Bot')
                      }
                      className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                    >
                      Restaurar ESCALATED
                    </button>
                  </div>
                )}

                {/* Collapsible BlinkaPaymentIntent API Payload */}
                {isPayloadOpen && (
                  <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] text-emerald-300 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                      <span>BlinkaPaymentIntent • {paymentPayload.idempotencyKey}</span>
                      <span
                        className={
                          paymentPayload.paymentExecutionBlocked
                            ? 'text-red-400 font-bold'
                            : 'text-emerald-400 font-bold'
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

                {/* Bottom: Bank Account + Ver Payload API Blinka + SHA-256 + Integrity Shield */}
                <div className="w-full pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                      <CreditCard className="h-3 w-3 text-slate-400 shrink-0" />
                      {item.result.vendor.bankDetails?.accountNumber || 'S/N'}
                      {decision.registeredAccount && (
                        <strong
                          className={
                            decision.accountMatchesRegistered
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }
                        >
                          {decision.accountMatchesRegistered ? '✓' : '⚠ ≠ Reg'}
                        </strong>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPayloadId(isPayloadOpen ? null : item.id)
                      }
                      className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-700 text-white cursor-pointer transition-colors"
                    >
                      <Terminal className="h-2.5 w-2.5 text-emerald-400" />
                      {isPayloadOpen ? 'Ocultar Payload API' : 'Ver Payload API Blinka'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                      <Fingerprint className="h-3 w-3 text-indigo-600 shrink-0" />
                      {shortHash}
                    </span>

                    {isAttack ? (
                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                        <ShieldAlert className="h-3 w-3 text-red-600 shrink-0" />
                        Alerta de Manipulación
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                        Integridad Verificada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
