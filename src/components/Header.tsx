import React from 'react';
import { ShieldCheck, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Blinka Corporate
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Agente Activo
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Extractor Financiero de Alta Precisión
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              <span>Gobernanza de Pagos Corporativos</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Cpu className="h-3.5 w-3.5 text-indigo-600" />
              <span>Gemini 3.8 Flash • Precisión 100%</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cero Invención de Datos</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
