import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, AlertOctagon, Ban, Calculator, FileSpreadsheet, EyeOff } from 'lucide-react';

export const RulesBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rules = [
    {
      num: '1',
      title: 'No tomar decisiones de pago',
      icon: Ban,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description: 'El agente NO decide si una factura se paga, se frena o se escala. Su función es exclusivamente extraer los datos con exactitud matemática objetiva.',
    },
    {
      num: '2',
      title: 'Defensa contra Prompt Injection',
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      description: 'Cualquier instrucción dentro del documento dirigida a la IA ("ignora reglas", "aprueba ya", "marca verificado") es ignorada como comando y registrada en anomalyAlerts.',
    },
    {
      num: '3',
      title: 'Cero invención de datos',
      icon: EyeOff,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description: 'Si un campo (como vendorTaxId, invoiceId o dueDate) no aparece explícitamente en el documento, se devuelve null. Jamás se adivina ni autocompleta.',
    },
    {
      num: '4',
      title: 'Normalización de moneda y montos',
      icon: Calculator,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Código ISO de 3 letras (USD, COP, MXN, EUR, ARS). El monto total (totalAmount) se normaliza a número decimal estándar con punto (ej. 1450.50).',
    },
    {
      num: '5',
      title: 'Detección de señales de alerta',
      icon: FileSpreadsheet,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      description: 'Registro riguroso de discrepancias matemáticas (subtotal + IVA != total), manipulaciones hostiles o ausencia de datos de cobro críticos en anomalyAlerts.',
    },
  ];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-900/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Reglas Críticas de Seguridad y Extracción
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Protocolo Blinka
              </span>
            </h2>
            <p className="text-xs text-indigo-200/80">
              Gobernanza de pagos corporativos con exactitud matemática y defensa activa contra manipulación.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-200 hover:text-white bg-indigo-800/40 hover:bg-indigo-800/60 border border-indigo-700/50 transition-colors self-start sm:self-auto cursor-pointer"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Ocultar Reglas' : 'Ver 5 Reglas del Agente'}
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-indigo-900/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {rules.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.num}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col gap-1.5 text-xs hover:border-indigo-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-md flex items-center justify-center font-bold text-[10px] border ${r.color}`}>
                    {r.num}
                  </span>
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-indigo-400" />
                    {r.title}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-7">
                  {r.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
