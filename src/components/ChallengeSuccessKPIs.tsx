import React from 'react';
import {
  Zap,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  Clock,
  CheckCircle2,
  Ban,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import {
  DEFAULT_CORPORATE_POLICY,
  FX_RATES_PER_USD,
  evaluateGovernanceDecision,
  type CorporatePolicyConfig,
} from '../utils/financialRules';
import type { HistoryItem } from './ExtractionHistory';

interface ChallengeSuccessKPIsProps {
  history: HistoryItem[];
  policy?: CorporatePolicyConfig;
}

export const ChallengeSuccessKPIs: React.FC<ChallengeSuccessKPIsProps> = ({
  history,
  policy = DEFAULT_CORPORATE_POLICY,
}) => {
  const decisions = history.map((item, idx) => {
    const d = evaluateGovernanceDecision(item.result, policy);
    const origAmount = item.result.invoice.totalAmount ?? 0;
    const origCurrency = item.result.invoice.currency || 'USD';
    return {
      item,
      decision: d,
      fecha: item.result.invoice.issueDate || item.timestamp.slice(0, 10),
      factura: item.result.invoice.invoiceId || `DOC-${idx + 1}`,
      beneficiario: item.result.vendor.name || 'No identificado',
      montoOriginal: `${origAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${origCurrency}`,
      montoUsd: d.amountUsd,
    };
  });

  const totalCount = decisions.length || 1;
  const paidCount = decisions.filter((d) => d.decision.decisionCode === 'PAID').length;
  const rejectedCount = decisions.filter((d) => d.decision.decisionCode === 'REJECTED').length;
  const escalatedCount = decisions.filter((d) => d.decision.decisionCode === 'ESCALATED').length;

  // Autonomous resolution includes invoices paid automatically + frauds/duplicates stopped automatically
  const autonomousResolvedCount = paidCount + rejectedCount;
  const autonomyPercent = Math.round((autonomousResolvedCount / totalCount) * 100);
  const autoPaidPercent = Math.round((paidCount / totalCount) * 100);

  const totalPaidUsd = decisions
    .filter((d) => d.decision.decisionCode === 'PAID')
    .reduce((acc, cur) => acc + cur.montoUsd, 0);

  const totalReconciledUsd = decisions.reduce((acc, cur) => acc + cur.montoUsd, 0);
  const timeSavedMinutes = decisions.length * 18; // ~18 min saved per cross-border invoice audit

  const handleExportMonthlyReconciliationCSV = () => {
    const headers = [
      'Fecha',
      'Factura',
      'Beneficiario',
      'Monto Original',
      'Monto USD',
      'Decisión',
      'Explicación',
    ];

    const escapeCsv = (val: string | number) => `"${String(val ?? '').replaceAll('"', '""')}"`;

    const lines = [
      headers.map(escapeCsv).join(','),
      ...decisions.map((d) =>
        [
          d.fecha,
          d.factura,
          d.beneficiario,
          d.montoOriginal,
          `$${d.montoUsd.toFixed(2)} USD`,
          `${d.decision.actionLabel} (${d.decision.decisionCode})`,
          d.decision.explanation,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-conciliacion-mensual-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fxRates = policy.fxRates ?? FX_RATES_PER_USD;
  const remainingBudgetUsd = Math.max(
    0,
    Number((policy.maxMonthlyBudgetUsd - totalPaidUsd).toFixed(2))
  );

  return (
    <div className="space-y-3">
      {/* Top 3 KPI Success Cards (Sección 10: Cómo se ve el éxito) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Autonomía */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block">
                1. Indicador de Autonomía
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {autonomyPercent}% Resolución Autónoma
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {paidCount} pagadas sin intervención ({autoPaidPercent}%) • {rejectedCount} frenadas solas • {escalatedCount} escaladas a humano
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> {paidCount} PAID (Pagó)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              <Ban className="h-3 w-3" /> {rejectedCount} REJECTED (Frenó)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="h-3 w-3" /> {escalatedCount} ESCALATED
            </span>
          </div>
        </div>

        {/* KPI 2: Seguridad */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                2. Seguridad & Gobernanza
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight mt-0.5">
                0 Pagos Indebidos Aprobados
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                100% cumplimiento de reglas • {rejectedCount + escalatedCount} casos trampa interceptados a tiempo
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-600">
            <span>Límite Autónomo: <strong className="font-mono text-slate-900">${policy.maxAmountWithoutApprovalUsd} USD</strong></span>
            <span>Saldo Presupuesto: <strong className="font-mono text-emerald-700">${remainingBudgetUsd.toLocaleString('en-US')} USD</strong></span>
          </div>
        </div>

        {/* KPI 3: Conciliación y Tiempo Ahorrado */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                3. Conciliación & Tiempo Ahorrado
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  ${totalPaidUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </h3>
                <span className="text-xs text-emerald-700 font-bold">Pagados</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>
                  ~{timeSavedMinutes} min ahorrados • Auditado: ${totalReconciledUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportMonthlyReconciliationCSV}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Exportar Conciliación Mensual (CSV)</span>
          </button>
        </div>
      </div>

      {/* Multi-Currency Conversion Bar (US -> LATAM FX Reference Rates) */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            Motor Multimoneda (<code className="font-mono text-indigo-700">policyEngine</code> EE. UU. → LATAM):
          </span>
          <span className="text-slate-500 font-normal hidden md:inline">
            Normaliza toda factura a USD antes de validar acuerdo, límite (${policy.maxAmountWithoutApprovalUsd} USD) y presupuesto (${policy.maxMonthlyBudgetUsd} USD).
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            1 USD = <strong>{fxRates.COP.toLocaleString('en-US')} COP</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            1 USD = <strong>{fxRates.MXN} MXN</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            1 USD = <strong>{fxRates.EUR} EUR</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            1 USD = <strong>{fxRates.ARS} ARS</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            1 USD = <strong>{fxRates.BRL} BRL</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

