import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
        <ShieldAlert className="h-3 w-3" /> Prompt Injection
      </span>
    );
  }
  if (hasHumanApproval) {
    return (
      <button
        type="button"
        onClick={() => onCfoDecisionForItem(itemId, 'RESET', 'Slack Finance Bot')}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline cursor-pointer"
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
    <div className="bg-[#0D1322] rounded-xl border border-slate-800 p-3.5 shadow-md hover:border-cyan-400/50 transition-all flex flex-col justify-between gap-2.5">
      {/* Top: Vendor + Invoice ID */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-100 text-xs sm:text-sm truncate">
            {item.result.vendor.name || item.title}
          </h4>
          <span className="text-[11px] font-mono text-slate-400 block">
            #{item.result.invoice.invoiceId || 'S/N'} •{' '}
            {item.result.vendor.countryRegion || 'Internacional'}
          </span>
        </div>

        {decision.humanApproval && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40 flex items-center gap-1 shrink-0">
            <UserCheck className="h-3 w-3" />
            CFO
          </span>
        )}
      </div>

      {/* Amount + Urgency */}
      <div className="bg-[#131B2E] rounded-lg p-2.5 border border-slate-800 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase text-slate-400 font-bold block">
            Monto Original → USD
          </span>
          <div className="font-mono text-xs font-bold text-white">
            ${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {origCurrency}
          </div>
          <div className="font-mono text-[11px] font-black text-[#00F5D4]">
            ≈ ${decision.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0D1322] border border-slate-700 text-slate-200">
            <Clock className="h-2.5 w-2.5 text-[#00F5D4]" />
            {decision.urgency.label}
          </span>
          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
            Vence: {item.result.invoice.dueDate || 'N/A'}
          </span>
        </div>
      </div>

      {/* Triggered Rule + Natural Spanish Explanation */}
      <div className="space-y-1">
        <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40">
          {decision.triggeredRule}
        </span>
        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
          {decision.explanation}
        </p>
      </div>

      {/* Bank Account & Rail info */}
      <div className="text-[10px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-slate-500" />
            Cta: {item.result.vendor.bankDetails?.accountNumber || 'S/N'}
          </span>
          {decision.registeredAccount && (
            <strong
              className={
                decision.accountMatchesRegistered ? 'text-[#00F5D4]' : 'text-amber-400'
              }
            >
              {decision.accountMatchesRegistered
                ? '✓ Cuenta Oficial'
                : `⚠ ≠ ${decision.registeredAccount}`}
            </strong>
          )}
        </div>
        <div className="flex items-center gap-1 text-purple-300 truncate">
          <ArrowRightLeft className="h-3 w-3 shrink-0 text-[#00F5D4]" />
          <span className="truncate">{decision.recommendedRail}</span>
        </div>
      </div>

      {/* 1-Click Actions for ESCALATED cards */}
      {decision.decisionCode === 'ESCALATED' && (
        <div className="pt-1.5 border-t border-amber-500/30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCfoDecisionForItem(item.id, 'APPROVE', 'Slack Finance Bot')}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprobar (1 Clic)
          </button>
          <button
            type="button"
            onClick={() => onCfoDecisionForItem(item.id, 'REJECT', 'Slack Finance Bot')}
            className="py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            <Ban className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>
      )}

      {/* Footer Actions: Restore if CFO overridden + View in Simulator */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
        {renderFooterLeftStatus(
          isAttack,
          Boolean(decision.humanApproval),
          item.id,
          onCfoDecisionForItem
        )}

        <button
          type="button"
          onClick={() => onSelectForSimulator(item)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00F5D4] hover:text-cyan-300 cursor-pointer"
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
  const [paidPage, setPaidPage] = useState(1);
  const [escalatedPage, setEscalatedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const PAGE_SIZE = 5;

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
  const currentPaidPage = Math.min(
    paidPage,
    Math.max(Math.ceil(paidItems.length / PAGE_SIZE), 1)
  );
  const currentEscalatedPage = Math.min(
    escalatedPage,
    Math.max(Math.ceil(escalatedItems.length / PAGE_SIZE), 1)
  );
  const currentRejectedPage = Math.min(
    rejectedPage,
    Math.max(Math.ceil(rejectedItems.length / PAGE_SIZE), 1)
  );

  const renderPagination = (
    totalItems: number,
    page: number,
    onPageChange: (nextPage: number) => void
  ) => {
    const totalPages = Math.max(Math.ceil(totalItems / PAGE_SIZE), 1);
    const currentPage = Math.min(page, totalPages);

    if (totalItems <= PAGE_SIZE) return null;

    return (
      <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Páginas de columna">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-3 w-3" />
          Anterior
        </button>
        <span className="text-[11px] font-mono text-slate-400">
          {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Siguiente
          <ChevronRight className="h-3 w-3" />
        </button>
      </nav>
    );
  };

  return (
    <div className="space-y-4">
      {/* Kanban Top Summary Bar */}
      <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 px-4 py-3.5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-100">
            📋 Tablero de Decisiones en Tiempo Real (Kanban de Tesorería)
          </h2>
          <p className="text-xs text-slate-400">
            Aprueba o rechaza en 1 clic las facturas que piden permiso humano y observa cómo se
            mueven automáticamente de columna.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetAllSamples}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar los 9 Escenarios
        </button>
      </div>

      {/* 3 Columns Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: PAID */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-[#00F5D4] text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-100">
                  ✅ Pagados Autónomos ({paidItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-[#00F5D4]">
                  Total liquidado: $
                  {totalPaidUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {paidItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-[#0D1322] rounded-xl border border-dashed border-slate-800">
                Ninguna factura en esta columna.
              </div>
            ) : (
              paidItems
                .slice((currentPaidPage - 1) * PAGE_SIZE, currentPaidPage * PAGE_SIZE)
                .map(({ item, decision }) => (
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
          {renderPagination(paidItems.length, paidPage, setPaidPage)}
        </div>

        {/* Column 2: ESCALATED */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-100">
                  ⚠️ Pidiendo Permiso al Humano ({escalatedItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-amber-300">
                  En espera de CFO: $
                  {totalEscalatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {escalatedItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-[#0D1322] rounded-xl border border-dashed border-slate-800">
                ¡Bandeja limpia! No hay pagos pendientes de aprobación humana.
              </div>
            ) : (
              escalatedItems
                .slice(
                  (currentEscalatedPage - 1) * PAGE_SIZE,
                  currentEscalatedPage * PAGE_SIZE
                )
                .map(({ item, decision }) => (
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
          {renderPagination(escalatedItems.length, escalatedPage, setEscalatedPage)}
        </div>

        {/* Column 3: REJECTED */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-rose-500/40 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <Ban className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-100">
                  🛑 Frenados / Fraude ({rejectedItems.length})
                </h3>
                <span className="text-[11px] font-mono font-bold text-rose-400">
                  Ahorro por bloqueo: $
                  {totalRejectedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rejectedItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-[#0D1322] rounded-xl border border-dashed border-slate-800">
                Ninguna factura frenada.
              </div>
            ) : (
              rejectedItems
                .slice((currentRejectedPage - 1) * PAGE_SIZE, currentRejectedPage * PAGE_SIZE)
                .map(({ item, decision }) => (
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
          {renderPagination(rejectedItems.length, rejectedPage, setRejectedPage)}
        </div>
      </div>
    </div>
  );
};
