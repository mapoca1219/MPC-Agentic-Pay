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

export interface AgentMascotProps {
  decisionCode: BlinkaDecisionCode;
  isScanning: boolean;
  scanStep: number; // 0..5 (1..5 during scan, 5 when complete)
  vendorName?: string | null;
}

interface MascotMoodConfig {
  badgeText: string;
  speechText: string;
  primaryHex: string;
  secondaryHex: string;
  visorHex: string;
  containerClass: string;
  badgeClass: string;
  bubbleBorderClass: string;
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
      primaryHex: '#6366f1',
      secondaryHex: '#e0e7ff',
      visorHex: '#38bdf8',
      containerClass: 'bg-indigo-950 border-indigo-700/80 text-white',
      badgeClass: 'bg-indigo-500 text-white animate-pulse',
      bubbleBorderClass: 'border-indigo-500/50 bg-indigo-900/70 text-indigo-50',
    };
  }

  if (decisionCode === 'PAID') {
    return {
      badgeText: 'CENTINELA VERDE • PAGO AUTORIZADO',
      speechText:
        '¡Todo en regla! Pagué esta cuenta automáticamente porque cumple el 100% de tus políticas.',
      primaryHex: '#10b981',
      secondaryHex: '#d1fae5',
      visorHex: '#34d399',
      containerClass: 'bg-slate-900 border-emerald-600/70 text-white',
      badgeClass: 'bg-emerald-500 text-slate-950',
      bubbleBorderClass: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-50',
    };
  }

  if (decisionCode === 'ESCALATED') {
    return {
      badgeText: 'CENTINELA EN ALERTA • PIDE PERMISO',
      speechText:
        '¡Alto ahí! Frené este pago temporalmente y te pedí permiso porque se sale de una regla.',
      primaryHex: '#f59e0b',
      secondaryHex: '#fef3c7',
      visorHex: '#fbbf24',
      containerClass: 'bg-slate-900 border-amber-500/80 text-white',
      badgeClass: 'bg-amber-400 text-slate-950',
      bubbleBorderClass: 'border-amber-500/50 bg-amber-950/60 text-amber-50',
    };
  }

  return {
    badgeText: 'ESCUDO ROJO ACTIVO • PELIGRO BLOQUEADO',
    speechText:
      '¡Peligro bloqueado! Detecté un cobro duplicado o intento de manipulación.',
    primaryHex: '#ef4444',
    secondaryHex: '#fee2e2',
    visorHex: '#f87171',
    containerClass: 'bg-slate-900 border-red-600/80 text-white',
    badgeClass: 'bg-red-500 text-white',
    bubbleBorderClass: 'border-red-500/50 bg-red-950/70 text-red-50',
  };
}

const SCAN_STEPS = [
  { id: 1, label: '1. Lectura de Factura', icon: FileSearch },
  { id: 2, label: '2. Anti-Duplicados', icon: CopyCheck },
  { id: 3, label: '3. Lista Blanca y Cuenta', icon: Building2 },
  { id: 4, label: '4. Conversión Multimoneda', icon: Globe },
  { id: 5, label: '5. Veredicto Final', icon: Gavel },
];

function getStepStyle(
  stepId: number,
  scanStep: number,
  isScanning: boolean,
  decisionCode: BlinkaDecisionCode
): string {
  if (isScanning) {
    if (scanStep === stepId) {
      return 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/40 scale-[1.02]';
    }
    if (scanStep > stepId) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';
    }
    return 'bg-slate-900/60 text-slate-500 border-slate-800';
  }

  if (stepId < 5) {
    return 'bg-slate-800/90 text-emerald-300 border-emerald-600/40';
  }

  if (decisionCode === 'PAID') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-extrabold';
  }
  if (decisionCode === 'ESCALATED') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-extrabold';
  }
  return 'bg-red-500/20 text-red-300 border-red-500/60 font-extrabold';
}

export const AgentMascot: React.FC<AgentMascotProps> = ({
  decisionCode,
  isScanning,
  scanStep,
}) => {
  const mood = getMascotMood(isScanning, decisionCode);

  return (
    <div
      className={`rounded-2xl border-2 p-3.5 sm:p-4 shadow-md transition-all duration-300 ${mood.containerClass}`}
    >
      <div className="flex flex-col sm:flex-row items-center gap-3.5">
        {/* SVG Mascot: Blinky - El Suricato Centinela */}
        <div className="relative shrink-0">
          <div
            className={`h-20 w-20 rounded-2xl flex items-center justify-center border relative overflow-hidden ${
              isScanning
                ? 'border-indigo-400 bg-indigo-900/60'
                : 'border-slate-700 bg-slate-950/90'
            }`}
          >
            {isScanning && (
              <div className="absolute inset-0 bg-indigo-500/20 animate-ping rounded-2xl" />
            )}

            <svg
              viewBox="0 0 120 120"
              className="h-18 w-18 drop-shadow-md"
              role="img"
              aria-label="Blinky - El Suricato Centinela"
            >
              {/* Cyber Aura Ring */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={mood.primaryHex}
                strokeWidth="2.5"
                strokeDasharray={isScanning ? '8 6' : 'none'}
                opacity="0.45"
              />

              {/* Perky Sentinel Ears */}
              <polygon
                points="26,44 18,14 44,30"
                fill="#d97706"
                stroke="#fde68a"
                strokeWidth="2"
              />
              <polygon points="26,38 22,20 39,30" fill="#fef3c7" />
              <polygon
                points="94,44 102,14 76,30"
                fill="#d97706"
                stroke="#fde68a"
                strokeWidth="2"
              />
              <polygon points="94,38 98,20 81,30" fill="#fef3c7" />

              {/* Body / Cyber Armor Collar */}
              <path
                d="M32 95 C32 76, 88 76, 88 95 L94 112 L26 112 Z"
                fill="#1e293b"
                stroke={mood.primaryHex}
                strokeWidth="2.5"
              />
              <polygon points="50,86 70,86 60,104" fill={mood.primaryHex} />

              {/* Meerkat/Fox Head */}
              <ellipse
                cx="60"
                cy="56"
                rx="30"
                ry="26"
                fill="#f59e0b"
                stroke="#fde68a"
                strokeWidth="2"
              />
              {/* Cheeks Fur */}
              <ellipse cx="60" cy="64" rx="22" ry="15" fill="#fef3c7" />

              {/* High-Tech Cyber Visor Glasses */}
              <rect
                x="29"
                y="41"
                width="62"
                height="16"
                rx="8"
                fill="#0f172a"
                stroke={mood.visorHex}
                strokeWidth="2.5"
              />
              {/* Glowing Visor HUD Eyes */}
              <circle cx="46" cy="49" r="4" fill={mood.visorHex} />
              <circle cx="74" cy="49" r="4" fill={mood.visorHex} />
              <line
                x1="53"
                y1="49"
                x2="67"
                y2="49"
                stroke={mood.visorHex}
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Cute Nose & Expression */}
              <polygon points="56,61 64,61 60,66" fill="#0f172a" />
              {decisionCode === 'PAID' && !isScanning && (
                <path
                  d="M51 69 Q60 76 69 69"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
              {decisionCode === 'ESCALATED' && !isScanning && (
                <>
                  <line
                    x1="53"
                    y1="71"
                    x2="67"
                    y2="71"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Raised Paw asking for permission */}
                  <circle
                    cx="22"
                    cy="70"
                    r="8"
                    fill="#f59e0b"
                    stroke="#fde68a"
                    strokeWidth="2"
                  />
                </>
              )}
              {decisionCode === 'REJECTED' && !isScanning && (
                <path
                  d="M52 73 Q60 67 68 73"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}
              {isScanning && (
                <circle
                  cx="60"
                  cy="71"
                  r="3"
                  fill="#0f172a"
                />
              )}

              {/* Cyber Guardian Shield on Right Side */}
              <path
                d="M84 68 L106 68 L106 86 C106 96, 95 104, 95 104 C95 104, 84 96, 84 86 Z"
                fill={mood.primaryHex}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {decisionCode === 'PAID' && !isScanning && (
                <polyline
                  points="90,84 94,89 101,79"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {decisionCode === 'ESCALATED' && !isScanning && (
                <text
                  x="95"
                  y="90"
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="15"
                  fontWeight="bold"
                >
                  !
                </text>
              )}
              {decisionCode === 'REJECTED' && !isScanning && (
                <path
                  d="M90 79 L100 89 M100 79 L90 89"
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Speech Bubble in First Person */}
        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <span className="text-xs font-extrabold tracking-tight text-white">
              🦊 Blinky • El Suricato Centinela
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${mood.badgeClass}`}
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
            className={`rounded-xl px-3.5 py-2.5 border text-xs sm:text-sm font-semibold leading-snug shadow-sm ${mood.bubbleBorderClass}`}
          >
            “{mood.speechText}”
          </div>
        </div>
      </div>

      {/* 5-Step Progressive Scanning Pipeline (1.5s step-by-step illumination) */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 px-0.5">
          <span className="font-bold uppercase tracking-wider text-indigo-300">
            Pipeline Determinista Blinka Sentinel AI (5 Pasos):
          </span>
          <span className="font-mono">
            {isScanning ? `Verificando paso ${scanStep} de 5...` : '✓ 5/5 Pasos Auditados'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {SCAN_STEPS.map((s) => {
            const Icon = s.icon;
            const stepStyle = getStepStyle(s.id, scanStep, isScanning, decisionCode);
            return (
              <div
                key={s.id}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 transition-all duration-200 ${stepStyle}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

