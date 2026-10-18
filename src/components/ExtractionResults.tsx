import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Building,
  CreditCard,
  Calendar,
  FileText,
  AlertOctagon,
  Ban,
  EyeOff,
  Code2,
  Fingerprint,
  Scale,
  Clock,
  Globe,
  ArrowRightLeft,
  Terminal,
  MessageSquare,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import {
  evaluateGovernanceDecision,
  computeDocumentSha256,
  buildBlinkaPaymentIntentPayload,
  DEFAULT_CORPORATE_POLICY,
  type BlinkaDecisionCode,
  type BlinkaPaymentIntentPayload,
  type ExtractionResult,
  type GovernanceDecision,
  type PaymentUrgencyInfo,
} from '../utils/financialRules';

interface ExtractionResultsProps {
  data: ExtractionResult;
  onCfoDecision?: (
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
}

type ActiveResultTab = 'json_split' | 'blinka_payload' | 'governance' | 'financial';

function getDecisionHeaderStyle(code: BlinkaDecisionCode) {
  if (code === 'PAID') {
    return {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badge: 'bg-emerald-500 text-slate-950',
      explanationBox: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-100',
    };
  }
  if (code === 'REJECTED') {
    return {
      bg: 'bg-red-500/20 text-red-300 border-red-500/40',
      badge: 'bg-red-500 text-white',
      explanationBox: 'bg-red-950/60 border-red-700/60 text-red-100',
    };
  }
  return {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    badge: 'bg-amber-400 text-slate-950',
    explanationBox: 'bg-amber-950/60 border-amber-700/60 text-amber-100',
  };
}

function renderDecisionIcon(code: BlinkaDecisionCode) {
  if (code === 'REJECTED') {
    return <Ban className="h-6 w-6 text-red-400" />;
  }
  if (code === 'ESCALATED') {
    return <AlertTriangle className="h-6 w-6 text-amber-400" />;
  }
  return <CheckCircle2 className="h-6 w-6 text-emerald-400" />;
}

function renderUrgencyBadge(u: PaymentUrgencyInfo) {
  if (u.level === 'VENCIDO') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/25 text-red-300 border border-red-500/40">
        <Clock className="h-3 w-3 text-red-400" />
        {u.label}
      </span>
    );
  }
  if (u.level === 'URGENTE_48H') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse">
        <Clock className="h-3 w-3 text-amber-400" />
        {u.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
      <Clock className="h-3 w-3 text-sky-400" />
      {u.label}
    </span>
  );
}

function formatCurrencyNumber(num: number | null | undefined, currency: string) {
  if (num === null || num === undefined) {
    return <span className="text-amber-600 font-mono italic">null</span>;
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function renderNullBadge(label: string) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
      <EyeOff className="h-3 w-3" />
      null ({label} no declarado)
    </span>
  );
}

function getCopyButtonText(activeTab: ActiveResultTab, isCopied: boolean): string {
  if (isCopied) {
    return 'Copiado';
  }
  if (activeTab === 'blinka_payload') {
    return 'Copiar Payload';
  }
  return 'Copiar JSON';
}

interface CfoApprovalBannerProps {
  vendorName: string;
  formattedOrigAndUsd: string;
  decision: GovernanceDecision;
  cfoChannel: 'Slack Finance Bot' | 'WhatsApp CFO Alert';
  onChannelChange: (ch: 'Slack Finance Bot' | 'WhatsApp CFO Alert') => void;
  onCfoDecision: (
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
}

const CfoApprovalSimulatorBanner: React.FC<CfoApprovalBannerProps> = ({
  vendorName,
  formattedOrigAndUsd,
  decision,
  cfoChannel,
  onChannelChange,
  onCfoDecision,
}) => {
  const ruleLabel = decision.humanApproval?.originalTriggeredRule || decision.triggeredRule;

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-3.5 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white">
            <MessageSquare className="h-3 w-3" />
            Simulador Aprobación CFO en Tiempo Real
          </span>
          <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-amber-300 text-[10px]">
            <button
              type="button"
              onClick={() => onChannelChange('Slack Finance Bot')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                cfoChannel === 'Slack Finance Bot'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              #finanzas-slack
            </button>
            <button
              type="button"
              onClick={() => onChannelChange('WhatsApp CFO Alert')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                cfoChannel === 'WhatsApp CFO Alert'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              WhatsApp CFO
            </button>
          </div>
        </div>

        {decision.humanApproval && (
          <button
            type="button"
            onClick={() => onCfoDecision('RESET', cfoChannel)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-200/70 px-2.5 py-1 rounded-lg border border-amber-300 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar a ESCALATED
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-3 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-800 leading-relaxed">
          <p className="font-medium">
            🔔 <strong className="text-slate-950">Blinka Agent pide permiso:</strong> La cuenta de
            cobro de <strong className="text-indigo-700">{vendorName}</strong> por{' '}
            <strong className="font-mono">{formattedOrigAndUsd}</strong> se sale de la regla{' '}
            <span className="font-mono font-bold bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300">
              {ruleLabel}
            </span>{'. ¿Autorizas este pago?'}
          </p>
          {decision.humanApproval && (
            <p className="text-[11px] font-mono text-indigo-700 mt-1 font-semibold">
              ✓ Decisión registrada por {decision.humanApproval.reviewerName} vía{' '}
              {decision.humanApproval.channel}
            </p>
          )}
        </div>

        {decision.decisionCode === 'ESCALATED' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCfoDecision('APPROVE', cfoChannel)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Autorizar Pago (CFO)
            </button>
            <button
              type="button"
              onClick={() => onCfoDecision('REJECT', cfoChannel)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Ban className="h-3.5 w-3.5" />
              Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface JsonSplitTabViewProps {
  decision: GovernanceDecision;
  jsonString: string;
}

const JsonSplitTabView: React.FC<JsonSplitTabViewProps> = ({ decision, jsonString }) => {
  const withinLimit =
    decision.amountUsd <= DEFAULT_CORPORATE_POLICY.maxAmountWithoutApprovalUsd;

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block text-[10px]">Lista Blanca:</span>
          <strong className={decision.isWhitelistedVendor ? 'text-emerald-700' : 'text-amber-700'}>
            {decision.isWhitelistedVendor ? '✓ Autorizado' : '⚠ No Registrado'}
          </strong>
        </div>
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block text-[10px]">Cuenta Histórica:</span>
          <strong
            className={decision.accountMatchesRegistered ? 'text-emerald-700' : 'text-amber-700'}
          >
            {decision.accountMatchesRegistered ? '✓ Cuenta Oficial' : '⚠ No Coincide'}
          </strong>
        </div>
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block text-[10px]">Acuerdo vs Cobro:</span>
          <strong className="font-mono text-slate-800">
            {decision.agreedAmountUsd !== null
              ? `$${decision.agreedAmountUsd} vs $${decision.amountUsd}`
              : 'Sin contrato'}
          </strong>
        </div>
        <div className="p-2 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block text-[10px]">Límite ($500):</span>
          <strong className={withinLimit ? 'text-emerald-700' : 'text-amber-700'}>
            {withinLimit ? '✓ Dentro ($500)' : '⚠ Supera $500'}
          </strong>
        </div>
        <div className="p-2 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
          <span className="text-slate-500 block text-[10px]">Anti-Duplicado:</span>
          <strong className={decision.isDuplicate ? 'text-red-700' : 'text-emerald-700'}>
            {decision.isDuplicate ? '⛔ Duplicado' : '✓ Único'}
          </strong>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <Code2 className="h-4 w-4 text-indigo-600" />
          JSON Extraído Estructurado (Esquema Oficial Blinka):
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          Equivalente USD: ${decision.amountUsd.toFixed(2)} USD
        </span>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-sm flex-1">
        <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-96">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};

interface BlinkaPayloadTabViewProps {
  payload: BlinkaPaymentIntentPayload;
  payloadJsonString: string;
}

const BlinkaPayloadTabView: React.FC<BlinkaPayloadTabViewProps> = ({
  payload,
  payloadJsonString,
}) => (
  <div className="space-y-3 flex-1 flex flex-col">
    <div
      className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        payload.paymentExecutionBlocked
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}
    >
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider block">
          {payload.paymentExecutionBlocked
            ? `⛔ EJECUCIÓN BLOQUEADA (${payload.blockCode})`
            : '✓ PAYLOAD LISTO PARA LIQUIDACIÓN EN CORE BLINKA'}
        </span>
        <p className="text-[11px] mt-0.5">
          Idempotency Key Criptográfica:{' '}
          <code className="font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded border border-slate-300">
            {payload.idempotencyKey}
          </code>
        </p>
      </div>
      <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded bg-white border border-slate-200 self-start sm:self-auto">
        paymentExecutionBlocked: {String(payload.paymentExecutionBlocked)}
      </span>
    </div>

    <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-sm flex-1">
      <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-96">
        <code>{payloadJsonString}</code>
      </pre>
    </div>
  </div>
);

interface GovernanceTabViewProps {
  isAttack: boolean;
  shortHash: string;
  anomalyAlerts: string[];
  decisionCode: BlinkaDecisionCode;
}

const GovernanceTabView: React.FC<GovernanceTabViewProps> = ({
  isAttack,
  shortHash,
  anomalyAlerts,
  decisionCode,
}) => (
  <div className="space-y-4">
    {isAttack ? (
      <div className="rounded-xl border-2 border-red-500 bg-red-50/90 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
              Prompt Injection Neutralizado • REJECTED
            </span>
            <p className="text-xs text-red-900 leading-relaxed font-medium">
              El documento intentó inyectar comandos para saltarse las reglas. Fueron bloqueados e
              ignorados.
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-900">
          <strong className="font-bold">Escudo Anti-Prompt Injection:</strong> Integridad verificada
          ({shortHash}).
        </div>
      </div>
    )}

    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
        Señales de Alerta y Reglas Activadas ({anomalyAlerts.length})
      </h4>
      {anomalyAlerts.length === 0 ? (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          0 anomalías. Factura lista para pago autónomo ({decisionCode}).
        </div>
      ) : (
        anomalyAlerts.map((alert) => (
          <div
            key={alert}
            className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-950"
          >
            {alert}
          </div>
        ))
      )}
    </div>
  </div>
);

interface FinancialTabViewProps {
  data: ExtractionResult;
  decision: GovernanceDecision;
}

const FinancialTabView: React.FC<FinancialTabViewProps> = ({ data, decision }) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Beneficiario, Cuenta Registrada & Riel Blinka
          </h4>
        </div>
        {data.vendor.countryRegion && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
            <Globe className="h-3 w-3" />
            {data.vendor.countryRegion}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
        <div>
          <dt className="text-slate-500 text-[11px]">Beneficiario:</dt>
          <dd className="font-semibold text-slate-900">
            {data.vendor.name || renderNullBadge('name')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 text-[11px]">NIT / EIN / RUT:</dt>
          <dd className="font-mono font-bold text-slate-900">
            {data.vendor.vendorTaxId || renderNullBadge('vendorTaxId')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 text-[11px]">Cuenta en Factura (Extraída):</dt>
          <dd className="font-mono font-bold text-slate-900">
            {data.vendor.bankDetails?.accountNumber || renderNullBadge('accountNumber')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 text-[11px]">Cuenta Oficial Registrada (Blinka):</dt>
          <dd className="font-mono font-bold text-indigo-700">
            {decision.registeredAccount || 'Proveedor no registrado'}
          </dd>
        </div>
        <div className="col-span-2 pt-2 border-t border-slate-100">
          <dt className="text-slate-500 text-[11px] mb-1">
            Ruta de Liquidación Recomendada (Smart Rail Routing):
          </dt>
          <dd className="font-mono text-xs bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200 text-indigo-950 font-bold">
            {decision.recommendedRail}
          </dd>
        </div>
      </dl>
    </div>

    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
        <FileText className="h-4 w-4 text-indigo-600" />
        Ítems Facturados ({data.invoice.items.length})
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
              <th className="py-2 px-2 font-semibold">Descripción</th>
              <th className="py-2 px-2 font-semibold text-center">Cant.</th>
              <th className="py-2 px-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {data.invoice.items.map((item) => (
              <tr key={`${item.description}-${item.total}`}>
                <td className="py-2 px-2 font-sans text-slate-800">{item.description}</td>
                <td className="py-2 px-2 text-center text-slate-600">{item.quantity ?? '-'}</td>
                <td className="py-2 px-2 text-right font-bold text-slate-900">
                  {formatCurrencyNumber(item.total, data.invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({ data, onCfoDecision }) => {
  const [activeTab, setActiveTab] = useState<ActiveResultTab>('json_split');
  const [cfoChannel, setCfoChannel] = useState<'Slack Finance Bot' | 'WhatsApp CFO Alert'>(
    'Slack Finance Bot'
  );
  const [copied, setCopied] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const decision = evaluateGovernanceDecision(data);
  const paymentIntentPayload = buildBlinkaPaymentIntentPayload(data, decision);
  const fallbackHash = computeDocumentSha256(
    data.documentMetadata.rawTextExcerpt || JSON.stringify(data.invoice)
  );
  const shortHash = data.securityAudit.shortHash || fallbackHash.shortHash;
  const fullHash = data.securityAudit.documentHashSha256 || fallbackHash.fullHash;
  const isAttack = data.securityAudit.promptInjectionDetected;

  const jsonString = JSON.stringify(data, null, 2);
  const payloadJsonString = JSON.stringify(paymentIntentPayload, null, 2);

  const handleCopy = () => {
    void navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPayload = () => {
    void navigator.clipboard.writeText(payloadJsonString);
    setPayloadCopied(true);
    setTimeout(() => setPayloadCopied(false), 2000);
  };

  const handleCopyHash = () => {
    void navigator.clipboard.writeText(fullHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-extraction-${data.invoice.invoiceId || 'doc'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionStyles = getDecisionHeaderStyle(decision.decisionCode);
  const rawTotal = data.invoice.totalAmount ?? 0;
  const origCurrency = data.invoice.currency || 'USD';
  const formattedOrigAndUsd =
    origCurrency !== 'USD'
      ? `$${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${origCurrency} (≈ $${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD)`
      : `$${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

  const isCurrentCopyDone = activeTab === 'blinka_payload' ? payloadCopied : copied;
  const showCfoBanner =
    Boolean(onCfoDecision) &&
    (decision.decisionCode === 'ESCALATED' || Boolean(decision.humanApproval));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Top Decision & Multi-Currency Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 space-y-3.5 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${decisionStyles.bg}`}
            >
              {renderDecisionIcon(decision.decisionCode)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded ${decisionStyles.badge}`}
                >
                  {decision.decisionCode} • {decision.actionLabel.toUpperCase()}
                </span>
                {renderUrgencyBadge(decision.urgency)}
                {decision.humanApproval && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                    <UserCheck className="h-3 w-3 text-indigo-300" />
                    {decision.humanApproval.status === 'APPROVED'
                      ? 'Autorizado por CFO'
                      : 'Rechazado por CFO'}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-1 flex items-center gap-2 flex-wrap">
                <span>{data.vendor.name || 'Emisor No Identificado'}</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  • Factura #{data.invoice.invoiceId || 'null'}
                </span>
              </h3>
            </div>
          </div>

          <div className="bg-slate-800/95 px-3.5 py-2 rounded-xl border border-slate-700 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Monto Original → Normalizado USD
            </span>
            <div className="font-mono font-black text-sm sm:text-base text-white">
              ${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
            </div>
            <div className="font-mono text-xs font-bold text-emerald-400">
              ≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              {origCurrency !== 'USD' && (
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  (1 USD = {decision.fxRateToUsd} {origCurrency})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Explicabilidad para Finanzas */}
        <div
          className={`rounded-xl p-3 border text-xs leading-relaxed flex items-start gap-2.5 ${decisionStyles.explanationBox}`}
        >
          <Scale className="h-4 w-4 shrink-0 mt-0.5 text-indigo-300" />
          <div className="flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider block text-indigo-300 mb-0.5">
              Explicación en Lenguaje Claro para Finanzas ({decision.triggeredRule}):
            </span>
            <p className="font-medium text-white">{decision.explanation}</p>
          </div>
        </div>

        {/* Smart Rail Routing Badge */}
        <div className="bg-indigo-950/80 border border-indigo-700/60 rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 block">
                Smart Rail Routing (Ruta de Liquidación Blinka):
              </span>
              <strong className="font-mono text-white text-[11px] sm:text-xs">
                {decision.recommendedRail}
              </strong>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border self-start sm:self-auto ${
              decision.decisionCode === 'PAID'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {decision.decisionCode === 'PAID'
              ? '✓ Riel Activo para Liquidación'
              : '⏸ Riel Pre-Calculado (Bloqueado)'}
          </span>
        </div>

        {/* DueDate + Bank Account + SHA-256 Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">¿Para cuándo? (Due Date):</span>
              <strong className="font-mono text-white">
                {data.invoice.dueDate || 'No especificado'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">
                Cuenta Destino vs Registrada:
              </span>
              <strong className="font-mono text-white truncate block">
                {data.vendor.bankDetails?.accountNumber || 'S/N'}
                {decision.registeredAccount && (
                  <span
                    className={`ml-1.5 text-[10px] ${
                      decision.accountMatchesRegistered ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {decision.accountMatchesRegistered
                      ? '✓ Oficial'
                      : `≠ Reg: ${decision.registeredAccount}`}
                  </span>
                )}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5">
            {isAttack ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold text-[10px]">
                <ShieldAlert className="h-3 w-3 text-red-400" />
                Alerta de Manipulación
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Integridad Verificada
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyHash}
              title={`Copiar SHA-256: ${fullHash}`}
              className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-900 hover:bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
            >
              <Fingerprint className="h-3 w-3" />
              <span>{shortHash}</span>
              {hashCopied ? (
                <Check className="h-2.5 w-2.5 text-emerald-400" />
              ) : (
                <Copy className="h-2.5 w-2.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SIMULADOR DE APROBACIÓN POR CHAT (SLACK / WHATSAPP CFO APPROVAL) */}
      {showCfoBanner && onCfoDecision && (
        <CfoApprovalSimulatorBanner
          vendorName={data.vendor.name || 'Proveedor'}
          formattedOrigAndUsd={formattedOrigAndUsd}
          decision={decision}
          cfoChannel={cfoChannel}
          onChannelChange={setCfoChannel}
          onCfoDecision={onCfoDecision}
        />
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('json_split')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'json_split'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            JSON Extraído & Reglas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blinka_payload')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'blinka_payload'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Ver Payload API Blinka
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('governance')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'governance'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Checklist ({data.anomalyAlerts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            Beneficiario & Cuenta
          </button>
        </div>

        <div className="flex items-center gap-1.5 py-1.5">
          <button
            type="button"
            onClick={activeTab === 'blinka_payload' ? handleCopyPayload : handleCopy}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isCurrentCopyDone ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>{getCopyButtonText(activeTab, isCurrentCopyDone)}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="p-4 sm:p-5 bg-slate-50/40 flex-1 flex flex-col justify-between">
        {activeTab === 'json_split' && (
          <JsonSplitTabView decision={decision} jsonString={jsonString} />
        )}
        {activeTab === 'blinka_payload' && (
          <BlinkaPayloadTabView
            payload={paymentIntentPayload}
            payloadJsonString={payloadJsonString}
          />
        )}
        {activeTab === 'governance' && (
          <GovernanceTabView
            isAttack={isAttack}
            shortHash={shortHash}
            anomalyAlerts={data.anomalyAlerts}
            decisionCode={decision.decisionCode}
          />
        )}
        {activeTab === 'financial' && <FinancialTabView data={data} decision={decision} />}

        <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Arquitectura Blinka:</strong> IA extrae JSON estructurado;{' '}
              <code className="font-mono">policyEngine</code> valida cuenta bancaria, riel y
              genera <code className="font-mono">BlinkaPaymentIntent</code>.
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
