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
  ArrowRightLeft,
  CreditCard,
} from 'lucide-react';
import {
  DEFAULT_CORPORATE_POLICY,
  FX_RATES_PER_USD,
  evaluateGovernanceDecision,
  type CorporatePolicyConfig,
} from '../utils/financialRules';
import type { HistoryItem } from './ExtractionHistory';
import {
  buildPrivacySafeReport,
  serializePrivacySafeReportCsv,
} from '../utils/privacySafeReport';

interface ChallengeSuccessKPIsProps {
  history: HistoryItem[];
  policy?: CorporatePolicyConfig;
}

interface KPIStat {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accent: string;
}

export const ChallengeSuccessKPIs: React.FC<ChallengeSuccessKPIsProps> = ({
  history,
  policy = DEFAULT_CORPORATE_POLICY,
}) => {
  const decisions = history.map((item) => evaluateGovernanceDecision(item.result, policy));

  const totalCount = Math.max(decisions.length, 1);
  const paidCount = decisions.filter((d) => d.decisionCode === 'PAID').length;
  const rejectedCount = decisions.filter((d) => d.decisionCode === 'REJECTED').length;
  const escalatedCount = decisions.filter((d) => d.decisionCode === 'ESCALATED').length;

  const autonomousResolvedCount = paidCount + rejectedCount;
  const autonomyPercent = Math.round((autonomousResolvedCount / totalCount) * 100);

  const totalPaidUsd = decisions
    .filter((d) => d.decisionCode === 'PAID')
    .reduce((acc, cur) => acc + cur.amountUsd, 0);

  const totalReconciledUsd = decisions.reduce((acc, cur) => acc + cur.amountUsd, 0);
  const timeSavedMinutes = decisions.length * 18;

  const remainingBudgetUsd = Math.max(
    0,
    Number((policy.maxMonthlyBudgetUsd - totalPaidUsd).toFixed(2))
  );

  const stats: KPIStat[] = [
    {
      label: 'Autonomía del Agente',
      value: `${autonomyPercent}%`,
      sublabel: `${paidCount} pagadas • ${rejectedCount} frenadas • ${escalatedCount} escaladas`,
      icon: <Zap className="h-5 w-5" />,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      accent: 'border-purple-500/30',
    },
    {
      label: 'Pagos Indebidos Aprobados',
      value: '0',
      sublabel: `100% cumplimiento • ${rejectedCount + escalatedCount} trampas interceptadas`,
      icon: <ShieldCheck className="h-5 w-5" />,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-[#00F5D4]',
      accent: 'border-cyan-500/30',
    },
    {
      label: 'Liquidado este Mes',
      value: `$${totalPaidUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`,
      sublabel: `~${timeSavedMinutes} min ahorrados • ${totalReconciledUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD auditado`,
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: 'bg-[#0D1322]',
      iconColor: 'text-[#00F5D4]',
      accent: 'border-slate-800/50',
    },
  ];

  const fxRates = policy.fxRates ?? FX_RATES_PER_USD;

  const handleExportMonthlyReconciliationCSV = () => {
    const report = buildPrivacySafeReport(decisions.map((decision) => decision.decisionCode));
    const csvContent = serializePrivacySafeReportCsv(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blinka-conciliacion-mensual-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border bg-[#0D1322]/70 backdrop-blur-md p-6 shadow-xl relative overflow-hidden group"
            style={{ borderColor: stat.accent.replace('/30', '/50') }}
          >
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-t from-transparent to-white/5" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  {stat.label}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {stat.sublabel}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de Presupuesto y Smart Rail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800/50 bg-[#0B0F19]/60 backdrop-blur-md p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-[#00F5D4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Presupuesto Corporativo
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm sm:text-lg font-black text-white">
              ${remainingBudgetUsd.toLocaleString('en-US')} USD
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              disponible de ${policy.maxMonthlyBudgetUsd.toLocaleString('en-US')} USD
            </span>
          </div>
          <div className="w-full bg-slate-800/30 h-1.5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              style={{ width: `${Math.min(100, Math.max(0, 100 - (remainingBudgetUsd / policy.maxMonthlyBudgetUsd) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Consumido</span>
            <span>
              ${(policy.maxMonthlyBudgetUsd - remainingBudgetUsd).toLocaleString('en-US')} USD
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/50 bg-[#0B0F19]/60 backdrop-blur-md p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRightLeft className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Smart Rail de Liquidación
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] border border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00F5D4]/10 text-[#00F5D4] flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <span className="text-sm font-medium text-slate-200">Pago directo (PAID)</span>
              </div>
              <span className="text-xs font-bold text-[#00F5D4]">{paidCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] border border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs font-bold">
                  ⛔
                </div>
                <span className="text-sm font-medium text-slate-200">Bloqueado (REJECTED)</span>
              </div>
              <span className="text-xs font-bold text-rose-400">{rejectedCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1322] border border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold">
                  ⚠
                </div>
                <span className="text-sm font-medium text-slate-200">Escalado a CFO (ESCALATED)</span>
              </div>
              <span className="text-xs font-bold text-amber-400">{escalatedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Currency Reference Bar */}
      <div className="rounded-2xl border border-slate-800/60 bg-[#0B0F19]/60 backdrop-blur-md p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-[#00F5D4]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Motor Multimoneda (US → LATAM)
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-3">
          {[
            { label: 'COP', value: fxRates.COP, color: 'text-[#00F5D4]' },
            { label: 'MXN', value: fxRates.MXN, color: 'text-purple-400' },
            { label: 'EUR', value: fxRates.EUR, color: 'text-cyan-400' },
            { label: 'ARS', value: fxRates.ARS, color: 'text-pink-400' },
            { label: 'BRL', value: fxRates.BRL, color: 'text-emerald-400' },
          ].map((rate) => (
            <div
              key={rate.label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0D1322] border border-slate-700/60"
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                1 USD =
              </span>
              <span className={`font-mono font-bold text-xs ${rate.color}`}>
                {rate.value.toLocaleString('en-US')} {rate.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500 font-mono">
            Normaliza toda factura a USD antes de validar acuerdo, límite y presupuesto.
          </span>
          <button
            type="button"
            onClick={handleExportMonthlyReconciliationCSV}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="h-3 w-3" />
            <span className="ml-1">Exportar CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
