import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Download,
  CreditCard,
  Calendar,
  Ban,
  Code2,
  Fingerprint,
  Scale,
  Clock,
  ArrowRightLeft,
  Terminal,
  MessageSquare,
  RotateCcw,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  evaluateGovernanceDecision,
  computeDocumentSha256,
  buildBlinkaPaymentIntentPayload,
  DEFAULT_CORPORATE_POLICY,
  type BlinkaDecisionCode,
  type BlinkaPaymentIntentPayload,
  type CorporatePolicyConfig,
  type ExtractionResult,
  type GovernanceDecision,
  type PaymentUrgencyInfo,
} from '../utils/financialRules';
import { AgentMascot } from './AgentMascot';

interface ExtractionResultsProps {
  data: ExtractionResult;
  policy?: CorporatePolicyConfig;
  isScanning?: boolean;
  scanStep?: number;
  onCfoDecision?: (
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
}

type TechnicalAccordionTab = 'blinka_payload' | 'json_extracted' | 'governance_alerts';

function getDecisionHeaderStyle(code: BlinkaDecisionCode) {
  if (code === 'PAID') {
    return {
      bg: 'bg-cyan-500/20 text-[#00F5D4] border-cyan-400/50',
      badge: 'bg-[#00F5D4] text-slate-950 shadow-[0_0_10px_rgba(0,245,212,0.35)]',
      explanationBox: 'bg-[#0D1322] border-cyan-400/50 text-emerald-100',
      scaleIcon: 'text-[#00F5D4]',
      ruleTitle: 'text-[#00F5D4]',
    };
  }
  if (code === 'REJECTED') {
    return {
      bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      badge: 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.35)]',
      explanationBox: 'bg-[#0D1322] border-rose-500/60 text-rose-100',
      scaleIcon: 'text-rose-400',
      ruleTitle: 'text-rose-400',
    };
  }
  return {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    badge: 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.35)]',
    explanationBox: 'bg-[#0D1322] border-amber-400/60 text-amber-100',
    scaleIcon: 'text-amber-400',
    ruleTitle: 'text-amber-300',
  };
}

function renderDecisionIcon(code: BlinkaDecisionCode) {
  if (code === 'REJECTED') {
    return <Ban className="h-5 w-5 text-rose-400" />;
  }
  if (code === 'ESCALATED') {
    return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  }
  return <CheckCircle2 className="h-5 w-5 text-[#00F5D4]" />;
}

function renderUrgencyBadge(u: PaymentUrgencyInfo) {
  if (u.level === 'VENCIDO') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
        <Clock className="h-3 w-3 text-rose-400" />
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
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
      <Clock className="h-3 w-3 text-cyan-400" />
      {u.label}
    </span>
  );
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
    <div className="bg-amber-950/30 border border-amber-500/50 rounded-xl p-3.5 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
            <MessageSquare className="h-3 w-3" />
            Simulador Aprobación CFO (Slack / WhatsApp)
          </span>
          <div className="flex items-center gap-1 bg-[#0D1322] rounded-lg p-0.5 border border-slate-700 text-[10px]">
            <button
              type="button"
              onClick={() => onChannelChange('Slack Finance Bot')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                cfoChannel === 'Slack Finance Bot'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              #finanzas-slack
            </button>
            <button
              type="button"
              onClick={() => onChannelChange('WhatsApp CFO Alert')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                cfoChannel === 'WhatsApp CFO Alert'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
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
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-400/50 cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="h-3 w-3" />
            Restaurar a ESCALATED
          </button>
        )}
      </div>

      <div className="bg-[#0D1322] rounded-xl p-3 border border-amber-500/40 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-200 leading-relaxed">
          <p className="font-medium">
            🔔 <strong className="text-amber-300">Blinka Agent pide permiso:</strong> La cuenta de
            cobro de <strong className="text-[#00F5D4]">{vendorName}</strong> por{' '}
            <strong className="font-mono text-white">{formattedOrigAndUsd}</strong> se sale de la
            regla{' '}
            <span className="font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/40">
              {ruleLabel}
            </span>
            {'. ¿Autorizas este pago?'}
          </p>
          {decision.humanApproval && (
            <p className="text-[11px] font-mono text-purple-300 mt-1 font-semibold">
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
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Autorizar Pago (CFO)
            </button>
            <button
              type="button"
              onClick={() => onCfoDecision('REJECT', cfoChannel)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
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

interface TechnicalAccordionProps {
  isOpen: boolean;
  onToggle: () => void;
  techTab: TechnicalAccordionTab;
  onSelectTechTab: (tab: TechnicalAccordionTab) => void;
  paymentIntentPayload: BlinkaPaymentIntentPayload;
  payloadJsonString: string;
  jsonString: string;
  anomalyAlerts: string[];
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}

const TechnicalAccordion: React.FC<TechnicalAccordionProps> = ({
  isOpen,
  onToggle,
  techTab,
  onSelectTechTab,
  paymentIntentPayload,
  payloadJsonString,
  jsonString,
  anomalyAlerts,
  onCopy,
  onDownload,
  copied,
}) => (
  <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0D1322]">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-[#131B2E] hover:text-white transition-colors cursor-pointer"
      aria-expanded={isOpen}
    >
      <span className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-purple-400" />
        <span>🔍 Ver Detalles Técnicos / API Payload (Opcional)</span>
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#00F5D4]">
        {isOpen ? 'Ocultar JSON y Payload' : 'Abrir BlinkaPaymentIntent + JSON'}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </span>
    </button>

    {isOpen && (
      <div className="border-t border-slate-800 p-3.5 bg-[#111827] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-[#0D1322] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onSelectTechTab('blinka_payload')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                techTab === 'blinka_payload'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="h-3 w-3" />
              Payload API Blinka
            </button>
            <button
              type="button"
              onClick={() => onSelectTechTab('json_extracted')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                techTab === 'json_extracted'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="h-3 w-3" />
              JSON Extraído
            </button>
            <button
              type="button"
              onClick={() => onSelectTechTab('governance_alerts')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                techTab === 'governance_alerts'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Alertas ({anomalyAlerts.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopy}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-[#0D1322] text-xs font-semibold text-slate-200 hover:border-cyan-400/50 flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#00F5D4]" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-[#0D1322] text-xs font-semibold text-slate-200 hover:border-cyan-400/50 flex items-center gap-1 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Descargar JSON</span>
            </button>
          </div>
        </div>

        {techTab === 'blinka_payload' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono bg-[#0D1322] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800">
              <span>Idempotency Key: {paymentIntentPayload.idempotencyKey}</span>
              <strong
                className={
                  paymentIntentPayload.paymentExecutionBlocked
                    ? 'text-rose-400'
                    : 'text-[#00F5D4]'
                }
              >
                paymentExecutionBlocked: {String(paymentIntentPayload.paymentExecutionBlocked)}
              </strong>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-[#00F5D4] font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed">
              <code>{payloadJsonString}</code>
            </pre>
          </div>
        )}

        {techTab === 'json_extracted' && (
          <pre className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed">
            <code>{jsonString}</code>
          </pre>
        )}

        {techTab === 'governance_alerts' && (
          <div className="space-y-1.5">
            {anomalyAlerts.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#0D1322] border border-cyan-500/40 text-xs text-[#00F5D4]">
                0 anomalías detectadas. Documento verificado sin alertas.
              </div>
            ) : (
              anomalyAlerts.map((alert) => (
                <div
                  key={alert}
                  className="p-2.5 rounded-lg bg-[#0D1322] border border-amber-500/40 text-xs font-mono text-amber-200"
                >
                  {alert}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )}
  </div>
);

export const ExtractionResults: React.FC<ExtractionResultsProps> = ({
  data,
  policy = DEFAULT_CORPORATE_POLICY,
  isScanning = false,
  scanStep = 5,
  onCfoDecision,
}) => {
  const [isTechOpen, setIsTechOpen] = useState(false);
  const [techTab, setTechTab] = useState<TechnicalAccordionTab>('blinka_payload');
  const [cfoChannel, setCfoChannel] = useState<'Slack Finance Bot' | 'WhatsApp CFO Alert'>(
    'Slack Finance Bot'
  );
  const [copied, setCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const decision = evaluateGovernanceDecision(data, policy);
  const paymentIntentPayload = buildBlinkaPaymentIntentPayload(data, decision);
  const fallbackHash = computeDocumentSha256(
    data.documentMetadata.rawTextExcerpt || JSON.stringify(data.invoice)
  );
  const shortHash = data.securityAudit.shortHash || fallbackHash.shortHash;
  const fullHash = data.securityAudit.documentHashSha256 || fallbackHash.fullHash;
  const isAttack = data.securityAudit.promptInjectionDetected;

  const jsonString = JSON.stringify(data, null, 2);
  const payloadJsonString = JSON.stringify(paymentIntentPayload, null, 2);

  const handleCopyTech = () => {
    const textToCopy = techTab === 'blinka_payload' ? payloadJsonString : jsonString;
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const withinLimit = decision.amountUsd <= policy.maxAmountWithoutApprovalUsd;
  const showCfoBanner =
    Boolean(onCfoDecision) &&
    (decision.decisionCode === 'ESCALATED' || Boolean(decision.humanApproval));

  return (
    <div className="space-y-3.5 flex flex-col">
      {/* 1. Interactive Mascot ("Blinky - El Suricato Centinela") + 5-Step Scan Animation */}
      <AgentMascot
        decisionCode={decision.decisionCode}
        isScanning={isScanning}
        scanStep={scanStep}
        vendorName={data.vendor.name}
      />

      {/* 2. Protagonist Card: Decision + Plain-Spanish Explanation + CFO Simulator */}
      <div className="bg-[#111827]/95 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
        {/* Top Summary Strip */}
        <div className="bg-[#131B2E] text-white p-3.5 sm:p-4 space-y-3 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${decisionStyles.bg}`}
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40">
                      <UserCheck className="h-3 w-3 text-purple-300" />
                      {decision.humanApproval.status === 'APPROVED'
                        ? 'Autorizado por CFO'
                        : 'Rechazado por CFO'}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{data.vendor.name || 'Emisor No Identificado'}</span>
                  <span className="text-xs font-mono font-normal text-slate-400">
                    • Factura #{data.invoice.invoiceId || 'S/N'}
                  </span>
                </h3>
              </div>
            </div>

            {/* Dual Amount Box */}
            <div className="bg-[#0D1322] px-3.5 py-2 rounded-xl border border-slate-700/80 text-right shrink-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                Monto Original → Equivalente USD
              </span>
              <div className="font-mono font-black text-sm text-white">
                ${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
              </div>
              <div className="font-mono text-xs font-bold text-[#00F5D4]">
                ≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
            </div>
          </div>

          {/* DueDate + Bank Account + SHA-256 Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#0D1322] p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[9px]">¿Para cuándo? (Vence):</span>
                <strong className="font-mono text-white">
                  {data.invoice.dueDate || 'No especificado'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[9px]">Cuenta Destino vs Oficial:</span>
                <strong className="font-mono text-white truncate block">
                  {data.vendor.bankDetails?.accountNumber || 'S/N'}
                  {decision.registeredAccount && (
                    <span
                      className={`ml-1 text-[10px] ${
                        decision.accountMatchesRegistered ? 'text-[#00F5D4]' : 'text-amber-400'
                      }`}
                    >
                      {decision.accountMatchesRegistered
                        ? '✓ Oficial'
                        : `≠ ${decision.registeredAccount}`}
                    </span>
                  )}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1.5">
              {isAttack ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[9px]">
                  <ShieldAlert className="h-3 w-3 text-rose-400" />
                  Manipulación
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00F5D4] border border-cyan-400/40 font-bold text-[9px]">
                  <ShieldCheck className="h-3 w-3 text-[#00F5D4]" />
                  Verificada
                </span>
              )}
              <button
                type="button"
                onClick={handleCopyHash}
                title={`Copiar SHA-256: ${fullHash}`}
                className="inline-flex items-center gap-1 font-mono text-[10px] bg-[#131B2E] hover:bg-[#1C2841] text-purple-300 px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer"
              >
                <Fingerprint className="h-3 w-3" />
                <span>{shortHash}</span>
                {hashCopied ? (
                  <Check className="h-2.5 w-2.5 text-[#00F5D4]" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Body: Plain Spanish Explanation + 5 Rules Grid + Smart Rail + Optional Tech Accordion */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Protagonist: Plain Spanish Explanation */}
          <div
            className={`rounded-xl p-3.5 border text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 ${decisionStyles.explanationBox}`}
          >
            <Scale className={`h-5 w-5 shrink-0 mt-0.5 ${decisionStyles.scaleIcon}`} />
            <div className="flex-1">
              <span
                className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${decisionStyles.ruleTitle}`}
              >
                Veredicto Explicado para Finanzas ({decision.triggeredRule}):
              </span>
              <p className="font-bold text-slate-100">{decision.explanation}</p>
            </div>
          </div>

          {/* 5 Governance Checks Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/90">
              <span className="text-slate-400 block text-[10px]">1. Lista Blanca:</span>
              <strong
                className={decision.isWhitelistedVendor ? 'text-[#00F5D4]' : 'text-amber-300'}
              >
                {decision.isWhitelistedVendor ? '✓ Autorizado' : '⚠ Nuevo'}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/90">
              <span className="text-slate-400 block text-[10px]">2. Cuenta Bancaria:</span>
              <strong
                className={
                  decision.accountMatchesRegistered ? 'text-[#00F5D4]' : 'text-amber-300'
                }
              >
                {decision.accountMatchesRegistered ? '✓ Oficial' : '⚠ No Coincide'}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/90">
              <span className="text-slate-400 block text-[10px]">3. Acuerdo (USD):</span>
              <strong className="font-mono text-slate-100">
                {decision.agreedAmountUsd !== null
                  ? `$${decision.agreedAmountUsd} vs $${decision.amountUsd}`
                  : 'Sin acuerdo'}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/90">
              <span className="text-slate-400 block text-[10px]">
                4. Límite (${policy.maxAmountWithoutApprovalUsd}):
              </span>
              <strong className={withinLimit ? 'text-[#00F5D4]' : 'text-amber-300'}>
                {withinLimit ? '✓ Dentro' : '⚠ Supera'}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/90 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px]">5. Anti-Duplicado:</span>
              <strong className={decision.isDuplicate ? 'text-rose-400' : 'text-[#00F5D4]'}>
                {decision.isDuplicate ? '⛔ Duplicado' : '✓ Único'}
              </strong>
            </div>
          </div>

          {/* Smart Rail Routing Strip */}
          <div className="bg-[#131B2E] border border-purple-500/40 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <ArrowRightLeft className="h-4 w-4 text-[#00F5D4] shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300 block">
                  Smart Rail Routing (Ruta de Liquidación Blinka):
                </span>
                <strong className="font-mono text-slate-100 text-[11px] sm:text-xs">
                  {decision.recommendedRail}
                </strong>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border self-start sm:self-auto ${
                decision.decisionCode === 'PAID'
                  ? 'bg-cyan-500/20 text-[#00F5D4] border-cyan-400/50'
                  : 'bg-[#0D1322] text-slate-400 border-slate-700'
              }`}
            >
              {decision.decisionCode === 'PAID'
                ? '✓ Riel Activo para Liquidación'
                : '⏸ Riel en Espera'}
            </span>
          </div>

          {/* Interactive CFO Slack/WhatsApp Approval Banner (when ESCALATED) */}
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

          {/* Closed-by-default Technical Accordion: JSON & API Payload */}
          <TechnicalAccordion
            isOpen={isTechOpen}
            onToggle={() => setIsTechOpen(!isTechOpen)}
            techTab={techTab}
            onSelectTechTab={setTechTab}
            paymentIntentPayload={paymentIntentPayload}
            payloadJsonString={payloadJsonString}
            jsonString={jsonString}
            anomalyAlerts={data.anomalyAlerts}
            onCopy={handleCopyTech}
            onDownload={handleDownload}
            copied={copied}
          />
        </div>
      </div>
    </div>
  );
};
