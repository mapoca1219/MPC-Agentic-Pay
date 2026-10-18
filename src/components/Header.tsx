import React from 'react';
import {
  Zap,
  Kanban,
  Sliders,
  BarChart3,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

export type AppViewTab = 'simulator' | 'kanban' | 'rules' | 'reconciliation';

interface HeaderProps {
  activeView: AppViewTab;
  onSelectView?: (view: AppViewTab) => void;
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
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
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
    <header className="border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
        {/* Top Row: Official Logo + Brand + Live Sentinel Status Pills */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <img
                src={logoImg}
                alt="Blinky - El Suricato Centinela Logo Oficial"
                className="h-12 w-12 rounded-xl object-cover border border-cyan-400/50 shadow-[0_0_15px_rgba(0,245,212,0.3)] hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#00F5D4] ring-2 ring-[#0B0F19]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  Blinka Sentinel AI
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00F5D4] bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-400/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00F5D4] animate-pulse" />
                  Blinky Guardián Activo
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight mt-0.5">
                Gobernanza y Pagos Corporativos Autónomos (US → LATAM)
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131B2E] text-purple-200 border border-purple-500/40 rounded-xl font-semibold shadow-sm">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>Autonomía: {autonomyPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131B2E] text-[#00F5D4] border border-cyan-400/40 rounded-xl font-semibold shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00F5D4]" />
              <span>0 Pagos Indebidos</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D1322] text-slate-100 border border-slate-700/80 rounded-xl font-mono font-bold shadow-sm">
              <DollarSign className="h-3.5 w-3.5 text-[#00F5D4]" />
              <span>Saldo: ${remainingBudgetUsd.toLocaleString('en-US')} USD</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: 4-View SaaS Navigation Tabs (Zero Infinite Scroll) */}
        {onSelectView && (
          <nav
            aria-label="Navegación Principal de Vistas"
            className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80"
          >
            {navItems.map((tab) => {
              const isActive = activeView === tab.id;
              const defaultBadgeStyle = tab.badgeStyle ?? '';
              const badgeStyle = isActive
                ? 'bg-slate-950/60 text-amber-300 border-amber-400/60'
                : defaultBadgeStyle;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectView(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-semibold border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                      : 'bg-[#131B2E]/90 text-slate-300 font-bold border-slate-800/80 hover:bg-[#192339] hover:text-white hover:border-cyan-400/40'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${badgeStyle}`}
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
