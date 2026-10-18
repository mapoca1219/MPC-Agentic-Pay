import React from 'react';
import {
  ShieldCheck,
  Zap,
  Kanban,
  Sliders,
  BarChart3,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export type AppViewTab = 'simulator' | 'kanban' | 'rules' | 'reconciliation';

interface HeaderProps {
  activeView: AppViewTab;
  onSelectView: (view: AppViewTab) => void;
  autonomyPercent?: number;
  escalatedCount?: number;
  remainingBudgetUsd?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView = 'simulator',
  onSelectView,
  autonomyPercent = 78,
  escalatedCount = 5,
  remainingBudgetUsd = 2660,
}) => {
  const navItems: Array<{
    id: AppViewTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeStyle?: string;
  }> = [
    {
      id: 'simulator',
      label: '⚡ Agente en Vivo (Simulador)',
      icon: Zap,
    },
    {
      id: 'kanban',
      label: '📋 Tablero de Decisiones (Kanban)',
      icon: Kanban,
      badge: escalatedCount > 0 ? `${escalatedCount} pendientes` : undefined,
      badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    {
      id: 'rules',
      label: '⚙️ Reglas y Presupuesto',
      icon: Sliders,
    },
    {
      id: 'reconciliation',
      label: '📊 Conciliación Mensual',
      icon: BarChart3,
    },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
        {/* Top Row: Brand + Live Sentinel Status Pills */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Blinka Sentinel AI
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Blinky Guardián Activo
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Gobernanza y Pagos Corporativos Autónomos (US → LATAM)
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/70 text-indigo-900 border border-indigo-200 rounded-lg font-semibold">
              <Zap className="h-3.5 w-3.5 text-indigo-600" />
              <span>Autonomía: {autonomyPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>0 Pagos Indebidos</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-mono font-bold">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>Saldo: ${remainingBudgetUsd.toLocaleString('en-US')} USD</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: 4-View SaaS Navigation Tabs (Zero Infinite Scroll) */}
        {onSelectView && (
          <nav
            aria-label="Navegación Principal de Vistas"
            className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100"
          >
            {navItems.map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectView(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                        tab.badgeStyle ?? ''
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
