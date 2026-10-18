/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Header, type AppViewTab } from './components/Header';
import { RulesBanner } from './components/RulesBanner';
import { DocumentInput } from './components/DocumentInput';
import { ExtractionResults } from './components/ExtractionResults';
import { ExtractionHistory, type HistoryItem } from './components/ExtractionHistory';
import { VisualDocumentPreview } from './components/VisualDocumentPreview';
import { ChallengeSuccessKPIs } from './components/ChallengeSuccessKPIs';
import { KanbanDecisionBoard } from './components/KanbanDecisionBoard';
import { PolicyRulesPanel } from './components/PolicyRulesPanel';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/Card';
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
  const [uploadedPreview, setUploadedPreview] = useState<{ url?: string; filename?: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(buildInitialHistory);

  const handleSelectSample = (sample: SampleInvoice) => {
    setSelectedSample(sample);
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
    setErrorMessage(null);

    if (payload.fileData) {
      setSelectedSample(null);
      setUploadedPreview({
        url: payload.fileData.previewUrl,
        filename: payload.fileData.filename,
      });
    }

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.details || 'Error al procesar el documento.');
      }

      const extracted: ExtractionResult = resData.data;
      setActiveResult(extracted);
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
    } catch {
      const fallbackExtracted = parseDocumentDeterministically(
        payload.text || customText,
        payload.documentHint
      );
      setActiveResult(fallbackExtracted);

      const newItem: HistoryItem = {
        id: `ext-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: fallbackExtracted.vendor.name || payload.documentHint || 'Documento Auditado',
        result: fallbackExtracted,
        sampleId: payload.fileData ? undefined : selectedSample?.id,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 14)]);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute live KPI metrics for the persistent SaaS Header
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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        autonomyPercent={autonomyPercent}
        escalatedCount={escalatedDocs.length}
        remainingBudgetUsd={remainingBudgetUsd}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Error notification if any */}
        {errorMessage && (
          <Card className="p-3.5 shadow-[0_0_20px_rgba(244,63,94,0.12)] border-rose-500/50">
            <div className="flex items-center justify-between gap-3">
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
          </Card>
        )}

        {/* VISTA 1: ⚡ AGENTE EN VIVO (SIMULADOR EN 2 COLUMNAS SIN SCROLL LARGO) */}
        {activeView === 'simulator' && (
          <Card className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start p-0 sm:p-0 pt-0">
            <CardHeader>
              <CardTitle>Agente en Vivo — Simulador de Extracción</CardTitle>
              <CardDescription>
                Sube un documento (PDF, imagen, correo o chat) y Blinky lo escanea en 5 pasos
                deterministas: OCR/IA → Anti-duplicado → Lista blanca → Tasa USD → Veredicto.
              </CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start p-4 sm:p-5 lg:p-6">
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
                <ExtractionResults
                  data={activeResult}
                  policy={policy}
                  isScanning={isLoading}
                  scanStep={5}
                  onCfoDecision={handleActiveCfoDecision}
                />
              </div>
            </div>
          </Card>
        )}

        {/* VISTA 2: 📋 TABLERO DE DECISIONES (KANBAN 3 COLUMNAS) */}
        {activeView === 'kanban' && (
          <Card aria-label="Tablero de Decisiones Kanban" className="space-y-4 p-4 sm:p-5">
            <CardHeader>
              <CardTitle>Tablero de Decisiones — Kanban de Pagos</CardTitle>
              <CardDescription>
                Cada factura auditada se clasifica en Pagó, Frenó o Escaló. Arrastra para cambiar de
                columna y acelera la conciliación mensual.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0 pt-0 pb-0">
              <KanbanDecisionBoard
                history={history}
                policy={policy}
                onSelectForSimulator={handleSelectHistoryItem}
                onCfoDecisionForItem={handleHistoryItemCfoDecision}
                onResetAllSamples={() => setHistory(buildInitialHistory())}
              />
            </CardContent>
          </Card>
        )}

        {/* VISTA 3: ⚙️ REGLAS Y PRESUPUESTO (SLIDERS + TASAS + LISTA BLANCA EDITABLE) */}
        {activeView === 'rules' && (
          <Card className="space-y-4 p-4 sm:p-5">
            <CardHeader>
              <CardTitle>Reglas y Presupuesto en Vivo</CardTitle>
              <CardDescription>
                Ajusta límites, tasas de cambio y lista blanca de proveedores. Blinky re-evalúa al
                instante todas las facturas del simulador y el tablero Kanban.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0 pt-0 pb-0">
              <PolicyRulesPanel
                policy={policy}
                onUpdatePolicy={setPolicy}
                onResetPolicy={() => setPolicy(DEFAULT_CORPORATE_POLICY)}
              />
              <RulesBanner />
            </CardContent>
          </Card>
        )}

        {/* VISTA 4: 📊 CONCILIACIÓN MENSUAL (KPIS + TABLA Y EXPORTACIÓN CSV / EXCEL) */}
        {activeView === 'reconciliation' && (
          <Card className="space-y-4 p-4 sm:p-5">
            <CardHeader>
              <CardTitle>Conciliación Mensual y Exportación Contable</CardTitle>
              <CardDescription>
                Métricas de autonomía, seguridad, pagos y tiempo ahorrado. Exporta la reconciliación
                en CSV para el cierre financiero.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0 pt-0 pb-0">
              <ChallengeSuccessKPIs history={history} policy={policy} />
              <ExtractionHistory
                history={history}
                policy={policy}
                activeId={
                  history.find((h) => h.result === activeResult)?.id ||
                  history.find((h) => h.sampleId === selectedSample?.id)?.id
                }
                onSelect={handleSelectHistoryItem}
                onClear={() => setHistory([])}
                onLoadAllSamples={() => setHistory(buildInitialHistory())}
                onCfoDecisionForItem={handleHistoryItemCfoDecision}
              />
            </CardContent>
          </Card>
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
