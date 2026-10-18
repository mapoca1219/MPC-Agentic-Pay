import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  CreditCard,
  ArrowRightLeft,
  UserCheck,
  RotateCcw,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import {
  evaluateGovernanceDecision,
  type CorporatePolicyConfig,
  type GovernanceDecision,
} from '../utils/financialRules';
import type { HistoryItem } from './ExtractionHistory';

interface KanbanDecisionBoardProps {
  history: HistoryItem[];
  policy: CorporatePolicyConfig;
  onSelectForSimulator: (item: HistoryItem) => void;
  onCfoDecisionForItem: (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
  onResetAllSamples: () => void;
}

interface KanbanCardProps {
  item: HistoryItem;
  decision: GovernanceDecision;
  onSelectForSimulator: (item: HistoryItem) => void;
  onCfoDecisionForItem: (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void;
}

function renderFooterLeftStatus(
  isAttack: boolean,
  hasHumanApproval: boolean,
  itemId: string,
  onCfoDecisionForItem: (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => void
) {
  if (isAttack) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700">
        <ShieldAlert className="h-3 w-3" /> Prompt Injection
      </span>
    );
  }
  if (hasHumanApproval) {
    return (
      <button
        type="button"
        onClick={() => onCfoDecisionForItem(itemId, 'RESET', 'Slack Finance Bot')}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
      >
        <RotateCcw className="h-3 w-3" />
        Devolver a Permiso Humano
      </button>
    );
  }
  return <span className="text-[10px] text-slate-400 font-mono">SHA-256 Verificado</span>;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  item,
  decision,
  onSelectForSimulator,
  onCfoDecisionForItem,
}) => {
  const origAmount = item.result.invoice.totalAmount ?? 0;
  const origCurrency = item.result.invoice.currency || 'USD';
  const isAttack = item.result.securityAudit.promptInjectionDetected;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between gap-2.5">
      {/* Top: Vendor + Invoice ID */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
            {item.result.vendor.name || item.title}
          </h4>
          <span className="text-[11px] font-mono text-slate-500 block">
            #{item.result.invoice.invoiceId || 'S/N'} •{' '}
            {item.result.vendor.countryRegion || 'Internacional'}
          </span>
        </div>

        {decision.humanApproval && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1 shrink-0">
            <UserCheck className="h-3 w-3" />
            CFO
          </span>
        )}
      </div>

      {/* Amount + Urgency */}
      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase text-slate-400 font-bold block">
            Monto Original → USD
          </span>
          <div className="font-mono text-xs font-bold text-slate-900">
            ${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
          </div>
          <div className="font-mono text-[11px] font-black text-indigo-700">
            ≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
            <Clock className="h-2.5 w-2.5 text-indigo-600" />
            {decision.urgency.label}
          </span>
          <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
            Vence: {item.result.invoice.dueDate || 'N/A'}
          </span>
        </div>
      </div>

      {/* Triggered Rule + Natural Spanish Explanation */}
      <div className="space-y-1">
        <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {decision.triggeredRule}
        </span>
        <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-3">
          {decision.explanation}
        </p>
      </div>

      {/* Bank Account & Rail info */}
      <div className="text-[10px] font-mono text-slate-600 space-y-1 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-slate-400" />
            Cta: {item.result.vendor.bankDetails?.accountNumber || 'S/N'}
          </span>
          {decision.registeredAccount && (
            <strong
              className={
                decision.accountMatchesRegistered ? 'text-emerald-700' : 'text-amber-700'
              }
            >
              {decision.accountMatchesRegistered
                ? '✓ Cuenta Oficial'
                : `⚠ ≠ ${decision.registeredAccount}`}
            </strong>
          )}
        </div>
        <div className="flex items-center gap-1 text-indigo-700 truncate">
          <ArrowRightLeft className="h-3 w-3 shrink-0" />
          <span className="truncate">{decision.recommendedRail}</span>
        </div>
      </div>

      {/* 1-Click Actions for ESCALATED cards */}
      {decision.decisionCode === 'ESCALATED' && (
        <div className="pt-1.5 border-t border-amber-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot')}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprobar (1 Clic)
          </button>
          <button
            type="button"
            onClick={() => onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot')}
            className="py-1.5 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <Ban className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>
      )}

      {/* Footer Actions: Restore if CFO overridden + View in Simulator */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        {renderFooterLeftStatus(isAttack, Boolean(decision.humanApproval), item.id, onCfoDecisionForItem)}

        <button
          type="button"
          onClick={() => onSelectForSimulator(item)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          <Eye className="h-3 w-3" />
          Inspeccionar con Blinky
        </button>
      </div>
    </div>
  );
};

export const KanbanDecisionBoard: React.FC<KanbanDecisionBoardProps> = ({
  history,
  policy,
  onSelectForSimulator,
  onCfoDecisionForItem,
  onResetAllSamples,
}) => {
  const evaluatedItems = history.map((item) => ({
    item,
    decision: evaluateGovernanceDecision(item.result, policy),
  }));

  const paidItems = evaluatedItems.filter((x) => x.decision.decisionCode === 'PAID');
  const escalatedItems = evaluatedItems.filter((x) => x.decision.decisionCode === 'ESCALATED');
  const rejectedItems = evaluatedItems.filter((x) => x.decision.decisionCode === 'REJECTED');

  const totalPaidUsd = paidItems.reduce((acc, cur) => acc + cur.decision.amountUsd, 0);
  const totalEscalatedUsd = escalatedItems.reduce((acc, cur) => acc + cur.decision.amountUsd, 0);
  const totalRejectedUsd = rejectedItems.reduce((acc, cur) => acc + cur.decision.amountUsd, 0);

  return (
    <div className="space-y-4">
      {/* Kanban Top Summary Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
            📋 Tablero de Decisiones en Tiempo Real (Kanban de Tesorería)
          </h2>
          <p className="text-xs text-slate-500">
            Aprueba o rechaza en 1 clic las facturas que piden permiso humano y observa cómo se
            mueven automáticamente de columna.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetAllSamples}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar los 9 Escenarios
        </button>
      </div>

      {/* 3 Columns Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: PAID */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                  ✅ Pagados Autónomos ({paidItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  Total liquidado: ${totalPaidUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {paidItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-emerald-800/70 bg-white/60 rounded-xl border border-dashed border-emerald-200">
                Ninguna factura en esta columna.
              </div>
            ) : (
              paidItems.map(({ item, decision }) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  decision={decision}
                  onSelectForSimulator={onSelectForSimulator}
                  onCfoDecisionForItem={onCfoDecisionForItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: ESCALATED */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  ⚠️ Pidiendo Permiso al Humano ({escalatedItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-amber-800">
                  En espera de CFO: ${totalEscalatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {escalatedItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-amber-900/70 bg-white/60 rounded-xl border border-dashed border-amber-300">
                ¡Bandeja limpia! No hay pagos pendientes de aprobación humana.
              </div>
            ) : (
              escalatedItems.map(({ item, decision }) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  decision={decision}
                  onSelectForSimulator={onSelectForSimulator}
                  onCfoDecisionForItem={onCfoDecisionForItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: REJECTED */}
        <div className="bg-red-50/60 border border-red-200 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-red-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <Ban className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-red-950">
                  🛑 Frenados / Fraude ({rejectedItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-red-700">
                  Ahorro por bloqueo: ${totalRejectedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rejectedItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-red-800/70 bg-white/60 rounded-xl border border-dashed border-red-200">
                Ninguna factura frenada.
              </div>
            ) : (
              rejectedItems.map(({ item, decision }) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  decision={decision}
                  onSelectForSimulator={onSelectForSimulator}
                  onCfoDecisionForItem={onCfoDecisionForItem}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
