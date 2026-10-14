'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Play,
  RefreshCw,
  Copy,
  Check,
  Download,
  X,
  Coins,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ApiProviderId,
  OperationalApiPurposeId,
  PROVIDER_META,
  PROVIDER_MODELS_CATALOG,
  getEffectiveConfigForPurpose,
  getModelOption,
  loadApiWorkspaceConfig,
  API_CONFIG_UPDATED_EVENT,
} from '../lib/apiKeyConfig';
import {
  executeOperationalReport,
  OperationalReportResult,
} from '../lib/operationalReportService';

export interface OperationalReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  purposeId: OperationalApiPurposeId;
  moduleTitle: string;
  moduleSubtitle?: string;
  contextDataText: string;
  customSystemPrompt?: string;
  autoRunOnOpen?: boolean;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const OperationalReportDrawer: React.FC<OperationalReportDrawerProps> = ({
  isOpen,
  onClose,
  purposeId,
  moduleTitle,
  moduleSubtitle,
  contextDataText,
  customSystemPrompt,
  autoRunOnOpen = true,
  onNotify,
}) => {
  const [workspaceConfig, setWorkspaceConfig] = useState(() => loadApiWorkspaceConfig());
  const [selectedProvider, setSelectedProvider] = useState<'ROUTE_DEFAULT' | ApiProviderId>('ROUTE_DEFAULT');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [editableContext, setEditableContext] = useState<string>(contextDataText);
  const [showContextEditor, setShowContextEditor] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<OperationalReportResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    setEditableContext(contextDataText);
  }, [contextDataText]);

  useEffect(() => {
    const handleCfgUpdate = () => setWorkspaceConfig(loadApiWorkspaceConfig());
    window.addEventListener(API_CONFIG_UPDATED_EVENT, handleCfgUpdate);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, handleCfgUpdate);
  }, []);

  const effective = getEffectiveConfigForPurpose(purposeId, workspaceConfig);
  const activeProvider: ApiProviderId =
    selectedProvider === 'ROUTE_DEFAULT' ? effective.primaryProvider : selectedProvider;
  const availableModels = PROVIDER_MODELS_CATALOG[activeProvider] || PROVIDER_MODELS_CATALOG.GOOGLE;
  const activeModelId =
    selectedModel && availableModels.some(m => m.id === selectedModel)
      ? selectedModel
      : selectedProvider === 'ROUTE_DEFAULT'
      ? effective.primaryModel
      : workspaceConfig.providers[activeProvider as Exclude<ApiProviderId, 'INTERNAL'>]?.defaultModel ||
        availableModels[0]?.id ||
        'gemini-3.8-flash';

  const activeModelMeta = getModelOption(activeModelId);
  const activeProviderMeta = PROVIDER_META[activeProvider];

  const handleRunReport = async () => {
    setIsRunning(true);
    try {
      const res = await executeOperationalReport({
        purposeId,
        moduleTitle,
        inputContextText: editableContext,
        overrideProvider: selectedProvider,
        overrideModel: activeModelId,
        customSystemInstruction: customSystemPrompt,
      });
      setReportResult(res);
      if (res.ok) {
        onNotify?.(
          `Đã lập báo cáo "${moduleTitle}" (${res.usage?.totalTokens.toLocaleString('vi-VN') || 0} tokens · ${res.usage?.costVnd.toLocaleString('vi-VN') || 0}đ)`,
          'success'
        );
      }
    } catch (err) {
      console.error('Lỗi lập báo cáo phân hệ:', err);
      onNotify?.('Không thể lập báo cáo. Vui lòng thử lại.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && autoRunOnOpen && !reportResult && !isRunning) {
      handleRunReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!reportResult?.outputText) return;
    navigator.clipboard.writeText(reportResult.outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify?.('Đã sao chép nội dung báo cáo để gửi Lark.', 'info');
  };

  const handleDownloadTxt = () => {
    if (!reportResult?.outputText) return;
    const blob = new Blob([reportResult.outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao-cao-${purposeId}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px] animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <FileText className="w-3.5 h-3.5" />
                <span>Lập Báo Cáo & Nhận Xét Nghiệp Vụ</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${activeProviderMeta.badgeClass}`}>
                {activeProviderMeta.shortName} · {activeModelId}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">{moduleTitle}</h3>
            {moduleSubtitle && <p className="text-xs text-slate-600">{moduleSubtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
            title="Đóng khung báo cáo (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Khung chọn Nhà cung cấp & Model xử lý */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cấu hình Công cụ & Mô hình xử lý báo cáo</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Nguồn khóa: {effective.keySourceLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nhà cung cấp API:
                </label>
                <select
                  value={selectedProvider}
                  onChange={e => {
                    const val = e.target.value as 'ROUTE_DEFAULT' | ApiProviderId;
                    setSelectedProvider(val);
                    setSelectedModel('');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="ROUTE_DEFAULT">
                    Theo cấu hình mục đích ({PROVIDER_META[effective.primaryProvider].shortName})
                  </option>
                  <option value="GOOGLE">Google (Gemini API)</option>
                  <option value="OPENAI">OpenAI (ChatGPT API)</option>
                  <option value="CLAUDE">Anthropic (Claude API)</option>
                  <option value="INTERNAL">Bộ xử lý nội bộ (Offline 0đ)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Mô hình (Model 2026):
                </label>
                <select
                  value={activeModelId}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.id}) — ${m.inputCostPerMillionUsd}/${m.outputCostPerMillionUsd}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
              <div className="flex items-center gap-2 font-mono">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Đơn giá: <strong>${activeModelMeta.inputCostPerMillionUsd}/1M</strong> vào ·{' '}
                  <strong>${activeModelMeta.outputCostPerMillionUsd}/1M</strong> ra
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowContextEditor(!showContextEditor)}
                className="text-indigo-700 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showContextEditor ? 'Ẩn dữ liệu đầu vào' : 'Xem / sửa dữ liệu phân hệ đưa vào'}</span>
                {showContextEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showContextEditor && (
              <div className="pt-1 space-y-1.5">
                <textarea
                  rows={5}
                  value={editableContext}
                  onChange={e => setEditableContext(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleRunReport}
                disabled={isRunning}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tổng hợp số liệu & lập báo cáo...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{reportResult ? 'Chạy lại báo cáo' : 'Lập báo cáo ngay'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Thẻ đo lường Token & Chi phí thực tế của lượt chạy */}
          {reportResult && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Token Đầu Vào</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {(reportResult.usage?.promptTokens || 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ${reportResult.usage?.ratePromptPerMillionUsd || 0}/1M tokens
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Token Đầu Ra</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {(reportResult.usage?.completionTokens || 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ${reportResult.usage?.rateCompletionPerMillionUsd || 0}/1M tokens
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                  <div className="text-[10px] font-semibold text-amber-800 uppercase">Chi Phí Lượt Chạy</div>
                  <div className="text-sm font-bold font-mono text-amber-900 mt-0.5">
                    {(reportResult.usage?.costVnd || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-amber-700 font-mono">
                    ~ ${(reportResult.usage?.costUsd || 0).toFixed(5)} USD
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] font-semibold text-emerald-800 uppercase">Thời Gian & Trạng Thái</div>
                  <div className="text-sm font-bold font-mono text-emerald-900 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{reportResult.latencyMs} ms</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold truncate">
                    {reportResult.modelUsed}
                  </div>
                </div>
              </div>

              {reportResult.usedFallback && reportResult.fallbackReason && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{reportResult.fallbackReason}</span>
                </div>
              )}

              {/* Nội dung báo cáo */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>BÁO CÁO PHÂN TÍCH & ĐỀ XUẤT HÀNH ĐỘNG</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Đã chép' : 'Sao chép gửi Lark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải .txt</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                    {reportResult.outputText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mọi lượt chạy đều tự động cộng dồn Token & Chi phí vào mục <strong>Cấu hình API & Công cụ</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
