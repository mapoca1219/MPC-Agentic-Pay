/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header, type AppViewTab } from './components/Header';
import { RulesBanner } from './components/RulesBanner';
import { DocumentInput } from './components/DocumentInput';
import { ExtractionResults } from './components/ExtractionResults';
import { ExtractionHistory, type HistoryItem } from './components/ExtractionHistory';
import { VisualDocumentPreview } from './components/VisualDocumentPreview';
import { ChallengeSuccessKPIs } from './components/ChallengeSuccessKPIs';
import { KanbanDecisionBoard } from './components/KanbanDecisionBoard';
import { PolicyRulesPanel } from './components/PolicyRulesPanel';
import { AgentMascot } from './components/AgentMascot';
import { SAMPLE_INVOICES, type SampleInvoice } from './data/sampleInvoices';
import {
  parseDocumentDeterministically,
  applyHumanCfoDecision,
  evaluateGovernanceDecision,
  DEFAULT_CORPORATE_POLICY,
  type CorporatePolicyConfig,
  type ExtractionResult,
} from './utils/financialRules';
import { AlertCircle } from 'lucide-react';

const SCAN_STEP_DURATION_MS = 850;

function buildInitialHistory(): HistoryItem[] {
  return SAMPLE_INVOICES.map((sample, index) => ({
    id: `sample-${sample.id}`,
    timestamp: new Date(Date.now() - index * 120000).toISOString(),
    title: sample.title,
    result: sample.expectedResult,
    sampleId: sample.id,
  }));
}

export default function App() {
  const [activeView, setActiveView] = useState<AppViewTab>('simulator');
  const [policy, setPolicy] = useState<CorporatePolicyConfig>(DEFAULT_CORPORATE_POLICY);
  const [selectedSample, setSelectedSample] = useState<SampleInvoice | null>(SAMPLE_INVOICES[0]);
  const [customText, setCustomText] = useState<string>(SAMPLE_INVOICES[0].rawText);
  const [activeResult, setActiveResult] = useState<ExtractionResult>(
    SAMPLE_INVOICES[0].expectedResult
  );
  const [hasCurrentResult, setHasCurrentResult] = useState<boolean>(true);
  const [uploadedPreview, setUploadedPreview] = useState<{ url?: string; filename?: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<number>(5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(buildInitialHistory);

  const handleSelectSample = (sample: SampleInvoice) => {
    setSelectedSample(sample);
    setHasCurrentResult(true);
    setCustomText(sample.rawText);
    setUploadedPreview({});
    setErrorMessage(null);

    const existingInHistory = history.find((item) => item.sampleId === sample.id);
    if (existingInHistory) {
      setActiveResult(existingInHistory.result);
      return;
    }

    setActiveResult(sample.expectedResult);
    setHistory((prev) => [
      {
        id: `sample-${sample.id}`,
        timestamp: new Date().toISOString(),
        title: sample.title,
        result: sample.expectedResult,
        sampleId: sample.id,
      },
      ...prev,
    ]);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setHasCurrentResult(true);
    setActiveResult(item.result);
    setActiveView('simulator');

    if (item.sampleId) {
      const matched = SAMPLE_INVOICES.find((s) => s.id === item.sampleId);
      if (matched) {
        setSelectedSample(matched);
        setCustomText(matched.rawText);
        setUploadedPreview({});
        return;
      }
    }
    if (item.result.documentMetadata.rawTextExcerpt) {
      setCustomText(item.result.documentMetadata.rawTextExcerpt);
    }
  };

  const handleActiveCfoDecision = (
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => {
    const updated = applyHumanCfoDecision(
      activeResult,
      action,
      'CFO Carolina Martínez (Dirección Financiera)',
      channel,
      policy
    );
    setActiveResult(updated);
    setHistory((prev) =>
      prev.map((item) => {
        if (
          item.result === activeResult ||
          (selectedSample && item.sampleId === selectedSample.id)
        ) {
          return { ...item, result: updated };
        }
        return item;
      })
    );
  };

  const handleHistoryItemCfoDecision = (
    itemId: string,
    action: 'APPROVE' | 'REJECT' | 'RESET',
    channel: 'Slack Finance Bot' | 'WhatsApp CFO Alert'
  ) => {
    setHistory((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = applyHumanCfoDecision(
          item.result,
          action,
          'CFO Carolina Martínez (Dirección Financiera)',
          channel,
          policy
        );
        if (
          item.result === activeResult ||
          (selectedSample && item.sampleId === selectedSample.id)
        ) {
          setActiveResult(updated);
        }
        return { ...item, result: updated };
      })
    );
  };

  const handleExtract = async (payload: {
    text?: string;
    fileData?: { mimeType: string; base64: string; filename?: string; previewUrl?: string };
    documentHint?: string;
  }) => {
    setIsLoading(true);
    setHasCurrentResult(false);
    setScanStep(1);
    setErrorMessage(null);

    const scanAnimation = (async () => {
      for (let step = 2; step <= 5; step += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, SCAN_STEP_DURATION_MS));
        setScanStep(step);
      }
    })();

    if (payload.fileData) {
      setSelectedSample(null);
      setCustomText('');
      setUploadedPreview({
        url: payload.fileData.previewUrl,
        filename: payload.fileData.filename,
      });
    }

    try {
      let extracted: ExtractionResult;
      try {
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        let resData: {
          success?: boolean;
          data?: ExtractionResult;
          error?: string;
          details?: string;
        };
        try {
          resData = JSON.parse(responseText) as typeof resData;
        } catch {
          const message =
            response.status === 404
              ? 'La API de análisis no está desplegada en este sitio. Verifica que Vercel haya publicado la función /api/extract.'
              : `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`;
          throw new Error(message);
        }

        if (!response.ok || !resData.success) {
          throw new Error(
            resData.error || resData.details || `Error al procesar el documento (HTTP ${response.status}).`
          );
        }

        if (!resData.data) {
          throw new Error('El servidor no devolvió los datos extraídos del documento.');
        }
        extracted = resData.data;
      } catch (error) {
        if (payload.fileData) {
          throw error;
        }
        extracted = parseDocumentDeterministically(
          payload.text || '',
          payload.documentHint
        );
      }

      await scanAnimation;
      setActiveResult(extracted);
      setHasCurrentResult(true);
      if (payload.fileData && extracted.documentMetadata?.rawTextExcerpt) {
        setCustomText(extracted.documentMetadata.rawTextExcerpt);
      }

      const newItem: HistoryItem = {
        id: `ext-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: extracted.vendor.name || payload.documentHint || 'Documento Auditado en Vivo',
        result: extracted,
        sampleId: payload.fileData ? undefined : selectedSample?.id,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 14)]);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Error desconocido.';
      setErrorMessage(
        payload.fileData
          ? `No se pudo analizar el archivo cargado. ${details} No se mostraron datos de otro escenario.`
          : details
      );
    } finally {
      await scanAnimation;
      setIsLoading(false);
      setScanStep(5);
    }
  };

  // Compute live KPI metrics for the persistent SaaS Header (memoized to avoid re-render flicker)
  const memo = useMemo(() => {
    const evaluatedHistory = history.map((item) => evaluateGovernanceDecision(item.result, policy));
    const totalDocs = evaluatedHistory.length || 1;
    const paidDocs = evaluatedHistory.filter((d) => d.decisionCode === 'PAID');
    const rejectedDocs = evaluatedHistory.filter((d) => d.decisionCode === 'REJECTED');
    const escalatedDocs = evaluatedHistory.filter((d) => d.decisionCode === 'ESCALATED');
    const autonomyPercent = Math.round(((paidDocs.length + rejectedDocs.length) / totalDocs) * 100);
    const totalPaidUsd = paidDocs.reduce((acc, cur) => acc + cur.amountUsd, 0);
    const remainingBudgetUsd = Math.max(
      0,
      Number((policy.maxMonthlyBudgetUsd - totalPaidUsd).toFixed(2))
    );
    const activeId =
      history.find((h) => h.result === activeResult)?.id ||
      history.find((h) => h.sampleId === selectedSample?.id)?.id;
    return {
      evaluatedHistory,
      autonomyPercent,
      paidDocs,
      rejectedDocs,
      escalatedDocs,
      totalPaidUsd,
      remainingBudgetUsd,
      activeId,
    };
  }, [history, policy, activeResult, selectedSample]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        autonomyPercent={memo.autonomyPercent}
        escalatedCount={memo.escalatedDocs.length}
        remainingBudgetUsd={memo.remainingBudgetUsd}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white font-bold px-2 py-1 rounded cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* VISTA 1: ⚡ AGENTE EN VIVO (SIMULADOR EN 2 COLUMNAS SIN SCROLL LARGO) */}
        {activeView === 'simulator' && (
          <section
            aria-label="Agente en Vivo: Simulador y Visor Interactivo"
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
          >
            {/* Columna Izquierda: Selector de 9 Casos / Subida + Vista Previa del Documento Original */}
            <div className="lg:col-span-5 space-y-3.5">
              <DocumentInput
                selectedSample={selectedSample}
                customText={customText}
                onCustomTextChange={setCustomText}
                onSelectSample={handleSelectSample}
                onExtract={handleExtract}
                isLoading={isLoading}
              />

              <VisualDocumentPreview
                sample={selectedSample}
                rawText={customText}
                onRawTextChange={setCustomText}
                extractionResult={activeResult}
                uploadedPreviewUrl={uploadedPreview.url}
                uploadedFilename={uploadedPreview.filename}
              />
            </div>

            {/* Columna Derecha: Mascota Blinky + Escaneo Paso a Paso + Veredicto en Español + Acordeón Técnico */}
            <div className="lg:col-span-7">
              {hasCurrentResult ? (
                <ExtractionResults
                  data={activeResult}
                  policy={policy}
                  isScanning={isLoading}
                  scanStep={scanStep}
                  onCfoDecision={handleActiveCfoDecision}
                />
              ) : isLoading ? (
                <AgentMascot
                  decisionCode={evaluateGovernanceDecision(activeResult, policy).decisionCode}
                  isScanning
                  scanStep={scanStep}
                />
              ) : (
                <div
                  role="status"
                  className="rounded-2xl border border-dashed border-slate-700 bg-[#111827]/80 p-6 text-center text-sm text-slate-300"
                >
                  El resultado anterior está oculto para evitar mezclarlo con el archivo nuevo.
                  Vuelve a analizar el documento para ver sus datos.
                </div>
              )}
            </div>
          </section>
        )}

        {/* VISTA 2: 📋 TABLERO DE DECISIONES (KANBAN 3 COLUMNAS) */}
        {activeView === 'kanban' && (
          <section aria-label="Tablero de Decisiones Kanban" className="space-y-4">
            <KanbanDecisionBoard
              history={history}
              policy={policy}
              onSelectForSimulator={handleSelectHistoryItem}
              onCfoDecisionForItem={handleHistoryItemCfoDecision}
              onResetAllSamples={() => setHistory(buildInitialHistory())}
            />
          </section>
        )}

        {/* VISTA 3: ⚙️ REGLAS Y PRESUPUESTO (SLIDERS + TASAS + LISTA BLANCA EDITABLE) */}
        {activeView === 'rules' && (
          <section aria-label="Configuración de Reglas y Presupuesto" className="space-y-4">
            <PolicyRulesPanel
              policy={policy}
              onUpdatePolicy={setPolicy}
              onResetPolicy={() => setPolicy(DEFAULT_CORPORATE_POLICY)}
            />
            <RulesBanner />
          </section>
        )}

        {/* VISTA 4: 📊 CONCILIACIÓN MENSUAL (KPIS + TABLA Y EXPORTACIÓN CSV / EXCEL) */}
        {activeView === 'reconciliation' && (
          <section aria-label="Conciliación Mensual y Exportación Contable" className="space-y-4">
            <ChallengeSuccessKPIs history={history} policy={policy} />
            <ExtractionHistory
              history={history}
              policy={policy}
              activeId={memo.activeId}
              onSelect={handleSelectHistoryItem}
              onClear={() => setHistory([])}
              onLoadAllSamples={() => setHistory(buildInitialHistory())}
              onCfoDecisionForItem={handleHistoryItemCfoDecision}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-[#0B0F19] py-3 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-slate-300 font-semibold">
            Blinka Sentinel AI • Sistema de Gobernanza de Pagos Corporativos
          </span>
          <span className="font-mono text-[11px] text-[#00F5D4]">
            Blinky Guardián • Smart Rail Routing • Validación Cuenta Histórica • Aprobación CFO
          </span>
        </div>
      </footer>
    </div>
  );
}
