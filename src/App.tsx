/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Header } from './components/Header';
import { RulesBanner } from './components/RulesBanner';
import { DocumentInput } from './components/DocumentInput';
import { ExtractionResults } from './components/ExtractionResults';
import { ExtractionHistory, type HistoryItem } from './components/ExtractionHistory';
import { VisualDocumentPreview } from './components/VisualDocumentPreview';
import { ChallengeSuccessKPIs } from './components/ChallengeSuccessKPIs';
import { SAMPLE_INVOICES, type SampleInvoice } from './data/sampleInvoices';
import {
  parseDocumentDeterministically,
  applyHumanCfoDecision,
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
  const [selectedSample, setSelectedSample] = useState<SampleInvoice | null>(SAMPLE_INVOICES[0]);
  const [customText, setCustomText] = useState<string>(SAMPLE_INVOICES[0].rawText);
  const [activeResult, setActiveResult] = useState<ExtractionResult>(SAMPLE_INVOICES[0].expectedResult);
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
      channel
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
          channel
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

      const newItem: HistoryItem = {
        id: `ext-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: extracted.vendor.name || payload.documentHint || 'Documento Auditado en Vivo',
        result: extracted,
        sampleId: selectedSample?.id,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 14)]);
    } catch {
      // Seamless local deterministic fallback if backend is offline or unreachable
      const fallbackExtracted = parseDocumentDeterministically(
        payload.text || payload.fileData?.filename || customText,
        payload.documentHint
      );
      setActiveResult(fallbackExtracted);

      const newItem: HistoryItem = {
        id: `ext-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: fallbackExtracted.vendor.name || payload.documentHint || 'Documento Auditado',
        result: fallbackExtracted,
        sampleId: selectedSample?.id,
      };

      setHistory((prev) => [newItem, ...prev.slice(0, 14)]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Real-Time Challenge Success KPIs (Autonomy, Security, Reconciliation + FX Rates) */}
        <section aria-label="Indicadores de Éxito del Reto Blinka">
          <ChallengeSuccessKPIs history={history} />
        </section>

        {/* Governance Rules Ribbon */}
        <RulesBanner />

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-900 font-bold px-2 py-1 rounded cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* 1-Click Test Invoice Generator Panel */}
        <section aria-label="Generador de Facturas de Prueba en 1 Clic">
          <DocumentInput
            selectedSample={selectedSample}
            customText={customText}
            onCustomTextChange={setCustomText}
            onSelectSample={handleSelectSample}
            onExtract={handleExtract}
            isLoading={isLoading}
          />
        </section>

        {/* Side-by-Side Visual Document Preview & Extracted JSON + Decision */}
        <section
          aria-label="Vista en Paralelo: Documento Original, JSON Extraído y Decisión"
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >
          <div className="lg:col-span-5 flex flex-col">
            <VisualDocumentPreview
              sample={selectedSample}
              rawText={customText}
              onRawTextChange={setCustomText}
              extractionResult={activeResult}
              uploadedPreviewUrl={uploadedPreview.url}
              uploadedFilename={uploadedPreview.filename}
            />
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <ExtractionResults
              data={activeResult}
              onCfoDecision={handleActiveCfoDecision}
            />
          </div>
        </section>

        {/* Decision Tray & Accounting Audit Log Exporter (CSV / JSON) */}
        <section aria-label="Bandeja de Decisiones y Exportación de Auditoría Contable">
          <ExtractionHistory
            history={history}
            activeId={
              history.find((h) => h.result === activeResult)?.id ||
              history.find((h) => h.sampleId === selectedSample?.id)?.id
            }
            onSelect={handleSelectHistoryItem}
            onClear={() => setHistory([])}
            onLoadAllSamples={() => setHistory(buildInitialHistory())}
            onCfoDecisionForItem={handleHistoryItemCfoDecision}
          />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Blinka Corporate Payment Governance System • Agente Extractor Financiero</span>
          <span className="font-mono text-[11px] text-slate-400">
            Smart Rail Routing • Validación Cuenta Histórica • BlinkaPaymentIntent • Aprobación CFO Slack/WhatsApp
          </span>
        </div>
      </footer>
    </div>
  );
}
