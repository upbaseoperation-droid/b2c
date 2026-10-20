'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  X,
  RefreshCw,
  Copy,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  RotateCcw,
  Save,
  KeyRound,
} from 'lucide-react';
import { InlinePurposeApiSetup } from './InlinePurposeApiSetup';
import {
  OperationalApiPurposeId,
  ApiProviderId,
  PROVIDER_MODELS_CATALOG,
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  getDefaultPurposeRoute,
  updatePurposeSystemInstruction,
  resetPurposeSystemInstruction,
  API_CONFIG_UPDATED_EVENT,
} from '../lib/apiKeyConfig';
import { executeOperationalReport, OperationalReportResult } from '../lib/operationalReportService';

export interface OperationalReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  purposeId: OperationalApiPurposeId;
  moduleTitle: string;
  contextDataText: string;
  customSystemPrompt?: string;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const OperationalReportDrawer: React.FC<OperationalReportDrawerProps> = ({
  isOpen,
  onClose,
  purposeId,
  moduleTitle,
  contextDataText,
  customSystemPrompt,
}) => {
  const [configVersion, setConfigVersion] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<ApiProviderId>('GOOGLE');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [editablePrompt, setEditablePrompt] = useState<string>('');
  const [editableContext, setEditableContext] = useState<string>(contextDataText);
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(true);
  const [showContextEditor, setShowContextEditor] = useState<boolean>(false);
  const [showApiKeyEditor, setShowApiKeyEditor] = useState<boolean>(false);
  const [promptSavedToast, setPromptSavedToast] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<OperationalReportResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleConfigChange = () => setConfigVersion(v => v + 1);
    window.addEventListener(API_CONFIG_UPDATED_EVENT, handleConfigChange);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, handleConfigChange);
  }, []);

  const effectiveRoute = useMemo(() => {
    void configVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose(purposeId, cfg);
  }, [purposeId, configVersion]);

  const defaultRoute = useMemo(() => getDefaultPurposeRoute(purposeId), [purposeId]);

  // Đồng bộ dữ liệu khi mở khung hoặc đổi phân hệ
  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(effectiveRoute.primaryProvider);
      setSelectedModel(effectiveRoute.primaryModel);
      setEditableContext(contextDataText);
      const activePrompt = effectiveRoute.purpose.systemInstruction || customSystemPrompt || defaultRoute.systemInstruction;
      setEditablePrompt(activePrompt);
    }
  }, [
    isOpen,
    contextDataText,
    customSystemPrompt,
    effectiveRoute.primaryProvider,
    effectiveRoute.primaryModel,
    effectiveRoute.purpose.systemInstruction,
    defaultRoute.systemInstruction,
  ]);

  const availableModels = useMemo(() => {
    return PROVIDER_MODELS_CATALOG[selectedProvider] || [];
  }, [selectedProvider]);

  const handleProviderChange = (prov: ApiProviderId) => {
    setSelectedProvider(prov);
    const models = PROVIDER_MODELS_CATALOG[prov] || [];
    if (models.length > 0) {
      setSelectedModel(models[0].id);
    }
  };

  const handleSavePromptDefault = () => {
    const updated = updatePurposeSystemInstruction(purposeId, editablePrompt);
    setEditablePrompt(updated.systemInstruction);
    setPromptSavedToast('Đã lưu câu lệnh (Prompt) làm mặc định cho phân hệ này');
    setTimeout(() => setPromptSavedToast(null), 2500);
  };

  const handleResetPromptDefault = () => {
    const resetRule = resetPurposeSystemInstruction(purposeId);
    setEditablePrompt(resetRule.systemInstruction);
    setPromptSavedToast('Đã khôi phục câu lệnh (Prompt) gốc của phân hệ');
    setTimeout(() => setPromptSavedToast(null), 2500);
  };

  const handleGenerateReport = async (promptOverride?: string) => {
    setIsRunning(true);
    try {
      const promptToUse = (promptOverride ?? editablePrompt).trim() || effectiveRoute.purpose.systemInstruction;
      const res = await executeOperationalReport({
        purposeId,
        moduleTitle,
        inputContextText: editableContext,
        customSystemInstruction: promptToUse,
        overrideProvider: selectedProvider,
        overrideModel: selectedModel,
      });
      setResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!result?.outputText) return;
    navigator.clipboard.writeText(result.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 animate-fade-in">
      <div className="bg-surface w-full max-w-2xl h-full shadow-2xl border-l border-line flex flex-col overflow-hidden">
        {/* Header — Tuân thủ GEMINI.md: Không có dòng phụ đề xám dưới tiêu đề */}
        <div className="px-5 py-4 bg-ink text-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft border border-accent-line flex items-center justify-center text-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-surface">{moduleTitle}</h3>
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-accent/20 text-accent-fg border border-accent/30">
                {effectiveRoute.purpose.departmentTag}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-surface hover:bg-surface/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh chọn Nhà cung cấp & Mô hình */}
        <div className="px-5 py-3 bg-sunken border-b border-line space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ink">
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Công cụ xử lý báo cáo:</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${
                effectiveRoute.hasActiveExternalKey
                  ? 'bg-success-soft text-success border-success-line'
                  : 'bg-surface text-ink-2 border-line'
              }`}
            >
              {effectiveRoute.keySourceLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-4">
              <select
                value={selectedProvider}
                onChange={e => handleProviderChange(e.target.value as ApiProviderId)}
                className="w-full px-2.5 py-1.5 bg-surface border border-line rounded-lg text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="GOOGLE">Google (Gemini API)</option>
                <option value="OPENAI">OpenAI (ChatGPT API)</option>
                <option value="CLAUDE">Anthropic (Claude API)</option>
                <option value="INTERNAL">Bộ xử lý nội bộ Upbase</option>
              </select>
            </div>
            <div className="sm:col-span-5">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-line rounded-lg text-xs font-semibold text-ink font-mono outline-none focus:ring-2 focus:ring-accent"
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.badge})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={() => void handleGenerateReport()}
                disabled={isRunning}
                className="w-full px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-fg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Đang chạy...' : 'Chạy phân tích'}
              </button>
            </div>
          </div>

          {/* Nút bật/tắt Xem dữ liệu đầu vào */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/60">
            <button
              type="button"
              onClick={() => setShowContextEditor(v => !v)}
              className="text-2xs font-semibold text-ink-2 hover:text-ink flex items-center gap-1 cursor-pointer"
            >
              {showContextEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Dữ liệu đầu vào ({editableContext.split('\n').length} dòng)
            </button>
          </div>

          {/* Khung xem / sửa dữ liệu phân hệ đưa vào */}
          {showContextEditor && (
            <div className="pt-1 space-y-1.5">
              <span className="text-2xs font-bold text-ink block">
                Dữ liệu ngữ cảnh của phân hệ gửi vào báo cáo:
              </span>
              <textarea
                rows={5}
                value={editableContext}
                onChange={e => setEditableContext(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-line rounded-lg text-xs font-mono text-ink leading-relaxed outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}
        </div>

        {/* Nội dung báo cáo kết quả */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface">
          {isRunning ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-sm font-bold text-ink">Đang tổng hợp số liệu và lập báo cáo nhận xét...</p>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-sunken border border-line rounded-xl px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-ink">Nguồn xử lý:</span>
                  <span className="px-2 py-0.5 rounded bg-accent-soft text-accent font-bold border border-accent-line">
                    {result.providerUsedLabel}
                  </span>
                  <span className="font-mono text-2xs text-ink-2 bg-surface px-2 py-0.5 rounded border border-line">
                    {result.modelUsed}
                  </span>
                  <span className="text-2xs text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.latencyMs} ms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-hover border border-line text-ink text-2xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã sao chép' : 'Sao chép báo cáo'}
                </button>
              </div>

              {result.fallbackReason && (
                <div className="px-3.5 py-2 rounded-lg bg-warning-soft border border-warning-line text-warning text-2xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <span>{result.fallbackReason}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-ink text-surface font-mono text-xs leading-relaxed whitespace-pre-wrap border border-ink-2 shadow-inner">
                {result.outputText}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted">
              Bấm &quot;Chạy phân tích&quot; để tạo báo cáo đánh giá cho phân hệ này.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-sunken border-t border-line flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-ink hover:bg-ink-2 text-surface text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
