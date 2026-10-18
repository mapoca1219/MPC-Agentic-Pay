import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Radar,
  FileSearch,
  CopyCheck,
  Building2,
  Globe,
  Gavel,
} from 'lucide-react';
import type { BlinkaDecisionCode } from '../utils/financialRules';
import logoImg from '../assets/logo.png';

export interface AgentMascotProps {
  decisionCode: BlinkaDecisionCode;
  isScanning: boolean;
  scanStep: number; // 0..5 (1..5 during scan, 5 when complete)
  vendorName?: string | null;
}

interface MascotMoodConfig {
  badgeText: string;
  speechText: string;
  containerClass: string;
  badgeClass: string;
  bubbleBorderClass: string;
  avatarRingClass: string;
  statusCornerBadgeClass: string;
}

function getMascotMood(
  isScanning: boolean,
  decisionCode: BlinkaDecisionCode
): MascotMoodConfig {
  if (isScanning) {
    return {
      badgeText: 'ESCANEANDO EN TIEMPO REAL...',
      speechText:
        'Estoy revisando la factura, verificando la cuenta bancaria y el presupuesto...',
      containerClass:
        'bg-[#111827] border-purple-500/60 text-slate-100 shadow-[0_0_20px_rgba(168,85,247,0.14)]',
      badgeClass:
        'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm',
      bubbleBorderClass:
        'border-purple-500/50 bg-[#0D1322] text-cyan-100 shadow-inner',
      avatarRingClass:
        'ring-2 ring-[#00F5D4] border-[#A855F7] shadow-[0_0_20px_rgba(0,245,212,0.35)]',
      statusCornerBadgeClass: 'bg-purple-600 text-white border-cyan-300',
    };
  }

  if (decisionCode === 'PAID') {
    return {
      badgeText: 'CENTINELA VERDE • PAGO AUTORIZADO',
      speechText:
        '¡Todo en regla! Pagué esta cuenta automáticamente porque cumple el 100% de tus políticas.',
      containerClass:
        'bg-[#111827] border-cyan-400/50 text-slate-100 shadow-[0_0_20px_rgba(0,245,212,0.1)]',
      badgeClass: 'bg-[#00F5D4] text-slate-950 shadow-[0_0_10px_rgba(0,245,212,0.3)]',
      bubbleBorderClass:
        'border-cyan-400/40 bg-[#0D1322] text-emerald-100 shadow-inner',
      avatarRingClass:
        'ring-2 ring-[#00F5D4] border-[#00F5D4] shadow-[0_0_20px_rgba(0,245,212,0.35)]',
      statusCornerBadgeClass: 'bg-[#00F5D4] text-slate-950 border-emerald-950',
    };
  }

  if (decisionCode === 'ESCALATED') {
    return {
      badgeText: 'CENTINELA EN ALERTA • PIDE PERMISO',
      speechText:
        '¡Alto ahí! Frené este pago temporalmente y te pedí permiso porque se sale de una regla.',
      containerClass:
        'bg-[#111827] border-amber-400/60 text-slate-100 shadow-[0_0_20px_rgba(245,158,11,0.12)]',
      badgeClass: 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.3)]',
      bubbleBorderClass:
        'border-amber-400/50 bg-[#0D1322] text-amber-100 shadow-inner',
      avatarRingClass:
        'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
      statusCornerBadgeClass: 'bg-amber-400 text-slate-950 border-amber-950',
    };
  }

  return {
    badgeText: 'ESCUDO ROJO ACTIVO • PELIGRO BLOQUEADO',
    speechText:
      '¡Peligro bloqueado! Detecté un cobro duplicado o intento de manipulación.',
    containerClass:
      'bg-[#111827] border-rose-500/70 text-slate-100 shadow-[0_0_20px_rgba(244,63,94,0.14)]',
    badgeClass: 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.35)]',
    bubbleBorderClass:
      'border-rose-500/50 bg-[#0D1322] text-rose-100 shadow-inner',
    avatarRingClass:
      'ring-2 ring-rose-500 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    statusCornerBadgeClass: 'bg-rose-500 text-white border-rose-950',
  };
}

const SCAN_STEPS = [
  { id: 1, label: '1. Lectura OCR/IA', icon: FileSearch },
  { id: 2, label: '2. Anti-Duplicado', icon: CopyCheck },
  { id: 3, label: '3. Lista Blanca', icon: Building2 },
  { id: 4, label: '4. Tasa USD', icon: Globe },
  { id: 5, label: '5. Veredicto', icon: Gavel },
];

function getStepStyle(
  stepId: number,
  scanStep: number,
  isScanning: boolean,
  decisionCode: BlinkaDecisionCode
): string {
  if (isScanning) {
    if (scanStep === stepId) {
      return 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-cyan-300 shadow-md';
    }
    if (scanStep > stepId) {
      return 'bg-[#0D1322] text-[#00F5D4] border-cyan-500/50';
    }
    return 'bg-[#0D1322]/60 text-slate-500 border-slate-800';
  }

  if (stepId < 5) {
    return 'bg-[#0D1322] text-[#00F5D4] border-cyan-500/40';
  }

  if (decisionCode === 'PAID') {
    return 'bg-cyan-500/20 text-[#00F5D4] border-cyan-400/70 font-extrabold';
  }
  if (decisionCode === 'ESCALATED') {
    return 'bg-amber-500/20 text-amber-300 border-amber-400/70 font-extrabold';
  }
  return 'bg-rose-500/20 text-rose-300 border-rose-500/70 font-extrabold';
}

export const AgentMascot: React.FC<AgentMascotProps> = ({
  decisionCode,
  isScanning,
  scanStep,
}) => {
  const mood = getMascotMood(isScanning, decisionCode);

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors duration-200 ${mood.containerClass}`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Official Logo Avatar: Blinky - El Suricato Centinela (w-20 h-20 / sm:w-24 sm:h-24) */}
        <div className="relative shrink-0">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 bg-[#0B0F19] ${mood.avatarRingClass}`}
          >
            <img
              src={logoImg}
              alt="Blinky • El Suricato Centinela"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Dynamic State Corner Pill on Avatar */}
          <span
            className={`absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-xl border-2 flex items-center justify-center shadow-lg ${mood.statusCornerBadgeClass}`}
          >
            {isScanning && <Radar className="h-4 w-4 animate-spin" />}
            {!isScanning && decisionCode === 'PAID' && <CheckCircle2 className="h-4 w-4" />}
            {!isScanning && decisionCode === 'ESCALATED' && (
              <AlertTriangle className="h-4 w-4" />
            )}
            {!isScanning && decisionCode === 'REJECTED' && (
              <ShieldAlert className="h-4 w-4" />
            )}
          </span>
        </div>

        {/* Speech Bubble in First Person */}
        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>Blinky • El Suricato Centinela</span>
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${mood.badgeClass}`}
            >
              {isScanning && <Radar className="h-3 w-3 animate-spin" />}
              {!isScanning && decisionCode === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
              {!isScanning && decisionCode === 'ESCALATED' && (
                <AlertTriangle className="h-3 w-3" />
              )}
              {!isScanning && decisionCode === 'REJECTED' && <ShieldAlert className="h-3 w-3" />}
              {mood.badgeText}
            </span>
          </div>

          <div
            className={`rounded-xl px-4 py-3 border text-xs sm:text-sm font-semibold leading-relaxed ${mood.bubbleBorderClass}`}
          >
            “{mood.speechText}”
          </div>
        </div>
      </div>

      {/* 5-Step Progressive Scanning Pipeline */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/90">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-0.5">
          <span className="font-bold uppercase tracking-wider text-purple-300">
            Pipeline Determinista Blinka Sentinel AI (5 Pasos):
          </span>
          <span className="font-mono text-[#00F5D4]" aria-live="polite">
            {isScanning
              ? `⚡ ${SCAN_STEPS.find((step) => step.id === scanStep)?.label ?? 'Procesando documento...'}`
              : '✓ 5/5 Pasos Auditados'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {SCAN_STEPS.map((s) => {
            const Icon = s.icon;
            const stepStyle = getStepStyle(s.id, scanStep, isScanning, decisionCode);
            return (
              <div
                key={s.id}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center sm:justify-start gap-1.5 ${stepStyle}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="whitespace-nowrap">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
