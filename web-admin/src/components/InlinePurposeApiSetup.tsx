'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';
import {
  ApiProviderId,
  OperationalApiPurposeId,
  PROVIDER_MODELS_CATALOG,
  PROVIDER_META,
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  getDefaultPurposeRoute,
  updatePurposeRoutingRule,
  updateProviderApiKey,
  resetPurposeSystemInstruction,
  API_CONFIG_UPDATED_EVENT,
} from '../lib/apiKeyConfig';

export interface InlinePurposeApiSetupProps {
  purposeId: OperationalApiPurposeId;
  onConfigSaved?: () => void;
  showPromptEditor?: boolean;
  className?: string;
}

export const InlinePurposeApiSetup: React.FC<InlinePurposeApiSetupProps> = ({
  purposeId,
  onConfigSaved,
  showPromptEditor = false,
  className = '',
}) => {
  const [configVersion, setConfigVersion] = useState(0);

  const workspaceCfg = useMemo(() => {
    void configVersion;
    return loadApiWorkspaceConfig();
  }, [configVersion]);

  const effective = useMemo(
    () => getEffectiveConfigForPurpose(purposeId, workspaceCfg),
    [purposeId, workspaceCfg]
  );

  const defaultRoute = useMemo(() => getDefaultPurposeRoute(purposeId), [purposeId]);

  const [primaryProvider, setPrimaryProvider] = useState<ApiProviderId>(effective.primaryProvider);
  const [primaryModel, setPrimaryModel] = useState<string>(effective.primaryModel);
  const [fallbackProvider, setFallbackProvider] = useState<ApiProviderId>(effective.fallbackProvider);
  const [fallbackModel, setFallbackModel] = useState<string>(effective.fallbackModel);
  const [apiKeyInput, setApiKeyInput] = useState<string>(effective.primaryApiKey);
  const [systemPrompt, setSystemPrompt] = useState<string>(effective.purpose.systemInstruction);
  const [showKey, setShowKey] = useState<boolean>(false);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => setConfigVersion((v) => v + 1);
    window.addEventListener(API_CONFIG_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    setPrimaryProvider(effective.primaryProvider);
    setPrimaryModel(effective.primaryModel);
    setFallbackProvider(effective.fallbackProvider);
    setFallbackModel(effective.fallbackModel);
    setApiKeyInput(effective.primaryApiKey);
    setSystemPrompt(effective.purpose.systemInstruction);
  }, [
    purposeId,
    effective.primaryProvider,
    effective.primaryModel,
    effective.fallbackProvider,
    effective.fallbackModel,
    effective.primaryApiKey,
    effective.purpose.systemInstruction,
  ]);

  const primaryModels = useMemo(
    () => PROVIDER_MODELS_CATALOG[primaryProvider] || [],
    [primaryProvider]
  );

  const fallbackModels = useMemo(
    () => PROVIDER_MODELS_CATALOG[fallbackProvider] || [],
    [fallbackProvider]
  );

  const handlePrimaryProviderChange = (nextProv: ApiProviderId) => {
    setPrimaryProvider(nextProv);
    const catalog = PROVIDER_MODELS_CATALOG[nextProv] || [];
    const nextModel = catalog[0]?.id || 'upbase-local-engine';
    setPrimaryModel(nextModel);

    if (nextProv === 'INTERNAL') {
      setApiKeyInput('');
    } else {
      const latestCfg = loadApiWorkspaceConfig();
      const provKey = latestCfg.providers[nextProv]?.apiKey || '';
      setApiKeyInput(provKey);
    }
    setTestFeedback(null);
  };

  const handleFallbackProviderChange = (nextProv: ApiProviderId) => {
    setFallbackProvider(nextProv);
    const catalog = PROVIDER_MODELS_CATALOG[nextProv] || [];
    setFallbackModel(catalog[0]?.id || 'upbase-local-engine');
  };

  const handleSaveAll = () => {
    if (primaryProvider !== 'INTERNAL' && apiKeyInput.trim()) {
      updateProviderApiKey(primaryProvider, apiKeyInput.trim(), primaryModel);
    }
    updatePurposeRoutingRule(purposeId, {
      primaryProvider,
      primaryModel,
      fallbackProvider,
      fallbackModel,
      systemInstruction: systemPrompt.trim() || defaultRoute.systemInstruction,
    });
    setConfigVersion((v) => v + 1);
    setSavedNotice('Đã lưu cấu hình kết nối API & câu lệnh cho nghiệp vụ này');
    setTimeout(() => setSavedNotice(null), 2800);
    onConfigSaved?.();
  };

  const handleResetPrompt = () => {
    const reset = resetPurposeSystemInstruction(purposeId);
    setSystemPrompt(reset.systemInstruction);
    setSavedNotice('Đã khôi phục câu lệnh gốc của hệ thống');
    setTimeout(() => setSavedNotice(null), 2500);
    onConfigSaved?.();
  };

  const handleTestConnection = async () => {
    // Lưu trước khi kiểm tra để đồng bộ trạng thái
    if (primaryProvider !== 'INTERNAL' && apiKeyInput.trim()) {
      updateProviderApiKey(primaryProvider, apiKeyInput.trim(), primaryModel);
    }
    updatePurposeRoutingRule(purposeId, {
      primaryProvider,
      primaryModel,
      fallbackProvider,
      fallbackModel,
      systemInstruction: systemPrompt.trim() || defaultRoute.systemInstruction,
    });

    setIsTesting(true);
    setTestFeedback(null);
    try {
      const latestCfg = loadApiWorkspaceConfig();
      const baseUrl =
        primaryProvider === 'INTERNAL' ? undefined : latestCfg.providers[primaryProvider]?.baseUrl;

      const res = await fetch('/api/integrations/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_CONNECTION',
          provider: primaryProvider,
          model: primaryModel,
          apiKey: apiKeyInput.trim(),
          baseUrl,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestFeedback({
          ok: true,
          message: data.reply || 'Kết nối thành công.',
          latencyMs: data.latencyMs,
        });
      } else {
        setTestFeedback({
          ok: false,
          message: data.error || 'Không thể kết nối tới máy chủ API.',
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: unknown) {
      setTestFeedback({
        ok: false,
        message: err instanceof Error ? err.message : 'Lỗi mạng khi kiểm tra kết nối API.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className={`rounded-xl border border-line bg-sunken p-3.5 space-y-3 text-xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent shrink-0" />
          <span className="font-semibold text-ink">{effective.purpose.title}</span>
          <span className="px-2 py-0.5 rounded bg-surface border border-line text-2xs font-semibold text-ink-2">
            {effective.purpose.departmentTag}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${
              effective.hasActiveExternalKey || primaryProvider === 'INTERNAL'
                ? 'bg-success-soft text-success border-success-line'
                : 'bg-warning-soft text-warning border-warning-line'
            }`}
          >
            {effective.keySourceLabel}
          </span>
        </div>
      </div>

      {/* Hàng 1: Nhà cung cấp chính, Mô hình chính & Luồng dự phòng */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-ink-2 block">Nhà cung cấp chính</label>
          <select
            value={primaryProvider}
            onChange={(e) => handlePrimaryProviderChange(e.target.value as ApiProviderId)}
            className="w-full h-8 px-2.5 bg-surface border border-line rounded-lg text-xs font-semibold text-ink outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="GOOGLE">Google (Gemini API)</option>
            <option value="OPENAI">OpenAI (ChatGPT API)</option>
            <option value="CLAUDE">Anthropic (Claude API)</option>
            <option value="INTERNAL">Bộ xử lý nội bộ Upbase</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold text-ink-2 block">Mô hình xử lý chính</label>
          <select
            value={primaryModel}
            onChange={(e) => setPrimaryModel(e.target.value)}
            className="w-full h-8 px-2.5 bg-surface border border-line rounded-lg text-xs font-mono font-semibold text-ink outline-none focus:ring-2 focus:ring-accent"
          >
            {primaryModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.badge})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold text-ink-2 block">Nhà cung cấp dự phòng</label>
          <select
            value={fallbackProvider}
            onChange={(e) => handleFallbackProviderChange(e.target.value as ApiProviderId)}
            className="w-full h-8 px-2.5 bg-surface border border-line rounded-lg text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="INTERNAL">Bộ xử lý nội bộ Upbase</option>
            <option value="GOOGLE">Google (Gemini API)</option>
            <option value="OPENAI">OpenAI (ChatGPT API)</option>
            <option value="CLAUDE">Anthropic (Claude API)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-semibold text-ink-2 block">Mô hình dự phòng</label>
          <select
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            className="w-full h-8 px-2.5 bg-surface border border-line rounded-lg text-xs font-mono text-ink outline-none focus:ring-2 focus:ring-accent"
          >
            {fallbackModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hàng 2: Ô nhập Khóa API & Nút Kiểm tra kết nối */}
      {primaryProvider !== 'INTERNAL' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-2xs font-semibold text-ink flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-accent" />
              <span>
                Khóa API ({PROVIDER_META[primaryProvider]?.shortName}) — Định dạng:{' '}
                <code className="font-mono text-ink-2">{PROVIDER_META[primaryProvider]?.keyPrefixHint}</code>
              </span>
            </label>
            {PROVIDER_META[primaryProvider]?.docsLabel && (
              <span className="text-2xs text-ink-3">
                Nguồn cấp: {PROVIDER_META[primaryProvider].docsLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`Dán khóa API ${PROVIDER_META[primaryProvider]?.shortName || ''} (${PROVIDER_META[primaryProvider]?.keyPrefixHint || ''})...`}
                className="w-full h-8 pl-3 pr-9 bg-surface border border-line rounded-lg text-xs font-mono text-ink outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink cursor-pointer"
                aria-label={showKey ? 'Ẩn khóa API' : 'Hiện khóa API'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={isTesting}
              className="h-8 px-3 rounded-lg border border-line bg-surface hover:bg-hover disabled:opacity-50 text-ink font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-accent' : ''}`} />
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu cấu hình API</span>
            </button>
          </div>
        </div>
      )}

      {/* Phản hồi kiểm tra kết nối */}
      {testFeedback && (
        <div
          className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
            testFeedback.ok
              ? 'bg-success-soft border-success-line text-success'
              : 'bg-danger-soft border-danger-line text-danger'
          }`}
        >
          {testFeedback.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold">
              {testFeedback.ok ? 'Kết nối API hoạt động tốt' : 'Kiểm tra kết nối không thành công'}
              {typeof testFeedback.latencyMs === 'number' ? ` (${testFeedback.latencyMs} ms)` : ''}
            </div>
            <div className="text-2xs mt-0.5 break-words">{testFeedback.message}</div>
          </div>
        </div>
      )}

      {/* Hàng 3: Câu lệnh chỉ dẫn (System Prompt) */}
      {showPromptEditor && (
        <div className="space-y-1.5 pt-2 border-t border-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-2xs font-semibold text-ink">
              Câu lệnh chỉ dẫn (System Prompt) của nghiệp vụ:
            </label>
            <div className="flex items-center gap-1.5">
              {savedNotice && (
                <span className="text-2xs font-semibold text-success flex items-center gap-1 mr-1">
                  <Check className="w-3 h-3" />
                  {savedNotice}
                </span>
              )}
              <button
                type="button"
                onClick={handleResetPrompt}
                className="px-2 py-1 rounded border border-line bg-surface hover:bg-hover text-2xs font-semibold text-ink-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Khôi phục gốc
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-2.5 py-1 rounded bg-accent-soft hover:bg-accent/20 text-accent border border-accent-line text-2xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                Lưu cấu hình & câu lệnh
              </button>
            </div>
          </div>
          <textarea
            rows={3}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-line rounded-lg text-xs text-ink leading-relaxed outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}
    </div>
  );
};
