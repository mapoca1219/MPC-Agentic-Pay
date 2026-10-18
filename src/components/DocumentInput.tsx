import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
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
    } else {
      if (!customText.trim()) return;
      onExtract({
        text: customText,
        documentHint,
      });
    }
  };

  const renderFormatIcon = (format: SampleInvoice['visualFormat']) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />;
      case 'chat':
        return <MessageSquare className="h-3.5 w-3.5 text-teal-600 shrink-0" />;
      case 'image':
        return <ImageIcon className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
      case 'email':
        return <Mail className="h-3.5 w-3.5 text-sky-600 shrink-0" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header & Mode Switcher */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-3 sm:px-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
              Simulador Multicanal en 1 Clic (8 Casos Oficiales Reto Blinka: PDF / Imagen / Correo / Chat)
            </h3>
            <p className="text-[11px] text-slate-500">
              Selecciona cualquiera de los 8 escenarios (2 normales + 6 casos trampa) para ver el documento original junto al JSON y la decisión de Finanzas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/75 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'samples'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            8 Escenarios del Reto
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Subir PDF / Imagen
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Texto Libre
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* TAB 1: 8 SCENARIOS IN 1 CLICK */}
        {activeTab === 'samples' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {SAMPLE_INVOICES.map((sample) => {
              const isSelected = selectedSample?.id === sample.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSampleClick(sample)}
                  className={`text-left p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${sample.tagColor}`}>
                        {sample.tag}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {renderFormatIcon(sample.visualFormat)}
                        {sample.formatLabel}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 leading-snug flex items-center justify-between gap-1">
                      <span>{sample.title}</span>
                      {(sample.category === 'injection' || sample.category === 'duplicate') && (
                        <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      {(sample.category === 'unlisted_vendor' ||
                        sample.category === 'agreement_mismatch' ||
                        sample.category === 'exceeds_limit' ||
                        sample.category === 'exceeds_budget' ||
                        sample.category === 'bank_account_mismatch') && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      {(sample.category === 'valid_usd' || sample.category === 'valid_latam_cop') && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {sample.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 2: FILE UPLOAD */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload-input"
            />

            {!uploadedFile ? (
              <label
                htmlFor="file-upload-input"
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 transition-colors">
                  <Upload className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Haz clic para seleccionar o arrastra una factura real
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Formatos soportados: Facturas en PDF, imágenes PNG, JPEG o WebP (hasta 25MB).
                </p>
              </label>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {uploadedFile.previewUrl ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Vista previa"
                      className="h-16 w-16 object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0 font-bold text-xs uppercase">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(uploadedFile.file.size / 1024).toFixed(1)} KB • {uploadedFile.file.type || 'Documento'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-200">
                      <FileCheck2 className="h-3 w-3" />
                      Listo para procesar con visión multimodal Gemini
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar archivo"
                  aria-label="Eliminar archivo"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RAW TEXT / EMAIL / CHAT */}
        {activeTab === 'text' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                Pega o modifica cualquier factura, correo o mensaje de cobro para probar el extractor en vivo:
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {customText.length} caracteres
              </span>
            </div>
            <textarea
              aria-label="Texto de factura o mensaje de cobro"
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              rows={7}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/60 p-3 font-mono text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-y leading-relaxed"
              placeholder="Ejemplo: 'Hola equipo, les paso la cuenta por los servicios de diseño web por $500 USD a Bancolombia...'"
              required
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Al hacer clic en un escenario se carga al instante su vista previa, hash SHA-256, JSON y decisión. También puedes re-procesar en vivo con Gemini AI:
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading || (activeTab === 'upload' && !uploadedFile) || (activeTab !== 'upload' && !customText.trim())}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando con Gemini AI + SHA-256...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Ejecutar Extracción en Vivo (Gemini AI)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
