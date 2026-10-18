import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck2,
  MessageSquare,
  ShieldAlert,
  Mail,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import { SAMPLE_INVOICES, type SampleInvoice } from '../data/sampleInvoices';

interface DocumentInputProps {
  selectedSample: SampleInvoice | null;
  customText: string;
  onCustomTextChange: (text: string) => void;
  onSelectSample: (sample: SampleInvoice) => void;
  onExtract: (payload: {
    text?: string;
    fileData?: { mimeType: string; base64: string; filename?: string; previewUrl?: string };
    documentHint?: string;
  }) => void;
  isLoading: boolean;
}

function getScenarioBadgeDarkClass(category: SampleInvoice['category']): string {
  if (category === 'valid_usd' || category === 'valid_latam_cop') {
    return 'bg-emerald-500/20 text-[#00F5D4] border-cyan-400/40';
  }
  if (category === 'duplicate' || category === 'injection') {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
  return 'bg-amber-500/20 text-amber-300 border-amber-400/40';
}

function renderFormatIcon(format: SampleInvoice['visualFormat']) {
  switch (format) {
    case 'pdf':
      return <FileText className="h-3 w-3 text-purple-400 shrink-0" />;
    case 'chat':
      return <MessageSquare className="h-3 w-3 text-[#00F5D4] shrink-0" />;
    case 'image':
      return <ImageIcon className="h-3 w-3 text-pink-400 shrink-0" />;
    case 'email':
      return <Mail className="h-3 w-3 text-cyan-400 shrink-0" />;
  }
}

function renderCategoryStatusIcon(category: SampleInvoice['category']) {
  if (category === 'injection' || category === 'duplicate') {
    return <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />;
  }
  if (category === 'valid_usd' || category === 'valid_latam_cop') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-[#00F5D4] shrink-0 mt-0.5" />;
  }
  return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />;
}

function isSubmitDisabled(
  isLoading: boolean,
  activeTab: 'samples' | 'upload' | 'text',
  hasUploadedFile: boolean,
  customText: string
): boolean {
  if (isLoading) return true;
  if (activeTab === 'upload') return !hasUploadedFile;
  return !customText.trim();
}

export const DocumentInput: React.FC<DocumentInputProps> = ({
  selectedSample,
  customText,
  onCustomTextChange,
  onSelectSample,
  onExtract,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'samples' | 'upload' | 'text'>('samples');
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    base64: string;
    previewUrl?: string;
  } | null>(null);
  const [documentHint, setDocumentHint] = useState<string>(
    selectedSample?.title || 'Factura electrónica de servicios'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSampleClick = (sample: SampleInvoice) => {
    setDocumentHint(sample.title);
    onSelectSample(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1] || result;
      setUploadedFile({
        file,
        base64: base64Clean,
        previewUrl: file.type.startsWith('image/') ? result : undefined,
      });
      setDocumentHint(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (activeTab === 'upload') {
      if (!uploadedFile) return;
      onExtract({
        fileData: {
          mimeType: uploadedFile.file.type || 'application/pdf',
          base64: uploadedFile.base64,
          filename: uploadedFile.file.name,
          previewUrl: uploadedFile.previewUrl,
        },
        documentHint,
      });
      return;
    }

    if (!customText.trim()) return;
    onExtract({
      text: customText,
      documentHint,
    });
  };

  const disabled = isSubmitDisabled(isLoading, activeTab, Boolean(uploadedFile), customText);

  return (
    <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
      {/* Header & Mode Switcher */}
      <div className="border-b border-slate-800/80 bg-[#131B2E]/90 p-3 sm:px-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-100 tracking-tight">
              Simulador Multicanal (9 Escenarios en 1 Clic)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#0D1322] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Layers className="h-3 w-3" />9 Casos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Upload className="h-3 w-3" />
            Subir Archivo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <FileText className="h-3 w-3" />
            Texto Libre
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-3.5">
        {activeTab === 'samples' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_INVOICES.map((sample) => {
              const isSelected = selectedSample?.id === sample.id;
              const buttonStyle = isSelected
                ? 'ring-2 ring-cyan-400 bg-[#1C2841] border-cyan-400/60 shadow-[0_0_18px_rgba(0,245,212,0.2)]'
                : 'border-slate-800/90 bg-[#161F33] hover:border-purple-500/50 hover:bg-[#1A253D]';
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSampleClick(sample)}
                  className={`text-left p-3 min-h-[96px] rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 cursor-pointer relative ${buttonStyle}`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getScenarioBadgeDarkClass(
                        sample.category
                      )}`}
                    >
                      {sample.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-slate-300 bg-[#0D1322] px-1.5 py-0.5 rounded border border-slate-700/80 shrink-0">
                      {renderFormatIcon(sample.visualFormat)}
                      {sample.visualFormat.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-1.5 w-full">
                    <span className="font-bold text-[11px] text-slate-100 leading-snug break-words">
                      {sample.title}
                    </span>
                    {renderCategoryStatusIcon(sample.category)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />

            {!uploadedFile ? (
              <label
                htmlFor="file-upload-input"
                className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 bg-[#0D1322] hover:bg-[#131B2E] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 group-hover:border-cyan-400/60 flex items-center justify-center text-[#00F5D4] mb-2 transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-[#00F5D4] transition-colors">
                  Haz clic para subir o arrastra una factura (PDF / Imagen)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Blinka Sentinel AI extraerá los datos y verificará todas las reglas de pago.
                </p>
              </label>
            ) : (
              <div className="border border-cyan-400/40 rounded-2xl p-3 bg-[#0D1322] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Vista previa"
                      className="h-12 w-12 object-cover rounded-xl border border-slate-700"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0 font-bold text-xs uppercase">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-100 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00F5D4] bg-cyan-950/60 px-2 py-0.5 rounded-md mt-1 border border-cyan-400/40">
                      <FileCheck2 className="h-3 w-3" />
                      Listo para auditoría con Blinka Sentinel AI
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar archivo"
                  aria-label="Eliminar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-200 text-[11px]">
                Pega o edita cualquier correo, factura o mensaje de WhatsApp:
              </span>
              <span className="text-slate-400 font-mono text-[10px]">
                {customText.length} caracteres
              </span>
            </div>
            <textarea
              aria-label="Texto de factura o mensaje de cobro"
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-700/90 bg-[#0D1322] p-3 font-mono text-xs text-slate-100 focus:border-cyan-400 focus:outline-none transition-all resize-y leading-relaxed"
              placeholder="Ejemplo: 'Hola equipo, les paso la cuenta de cobro por $300 USD...'"
              required
            />
          </div>
        )}

        <div className="pt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400">
            Haz clic en cualquier escenario o presiona el botón para escanear:
          </span>

          <button
            type="submit"
            disabled={disabled}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>⚡ Blinky está auditando la factura...</span>
              </>
            ) : (
              <span>⚡ Analizar Documento con el Agente</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
