'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  X,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  OperationalApiPurposeId,
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  getDefaultPurposeRoute,
  API_CONFIG_UPDATED_EVENT,
} from '../lib/apiKeyConfig';
import { executeOperationalReport, OperationalReportResult } from '../lib/operationalReportService';
import { Button, Status } from './ui';

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
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<OperationalReportResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleConfigChange = () => setConfigVersion((v) => v + 1);
    window.addEventListener(API_CONFIG_UPDATED_EVENT, handleConfigChange);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, handleConfigChange);
  }, []);

  const effectiveRoute = useMemo(() => {
    void configVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose(purposeId, cfg);
  }, [purposeId, configVersion]);

  const defaultRoute = useMemo(() => getDefaultPurposeRoute(purposeId), [purposeId]);

  const handleGenerateReport = async () => {
    setIsRunning(true);
    try {
      const promptToUse =
        effectiveRoute.purpose.systemInstruction ||
        customSystemPrompt ||
        defaultRoute.systemInstruction;
      const res = await executeOperationalReport({
        purposeId,
        moduleTitle,
        inputContextText: contextDataText,
        customSystemInstruction: promptToUse,
        overrideProvider: effectiveRoute.primaryProvider,
        overrideModel: effectiveRoute.primaryModel,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <div className="bg-surface w-full max-w-2xl h-full border-l border-line flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-surface border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-accent shrink-0" />
            <h3 className="text-sm font-semibold text-ink truncate">{moduleTitle}</h3>
            <Status tone="neutral">{effectiveRoute.purpose.departmentTag}</Status>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              icon={RefreshCw}
              disabled={isRunning}
              onClick={() => void handleGenerateReport()}
            >
              {isRunning ? 'Đang tổng hợp…' : result ? 'Tổng hợp lại' : 'Tổng hợp báo cáo'}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface">
          {isRunning ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-accent animate-spin mx-auto" />
              <p className="text-xs font-medium text-ink-2">Đang tổng hợp số liệu báo cáo…</p>
            </div>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-2">Bản tổng hợp nhận xét</span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copied ? Check : Copy}
                  onClick={handleCopy}
                >
                  {copied ? 'Đã sao chép' : 'Sao chép nội dung'}
                </Button>
              </div>

              {result.fallbackReason && (
                <div className="px-3 py-2 rounded-lg bg-warning-soft border border-line text-warning text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <span>{result.fallbackReason}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-sunken text-ink text-xs leading-relaxed whitespace-pre-wrap border border-line">
                {result.outputText}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">Số liệu đầu vào của kỳ báo cáo</span>
              </div>
              <div className="p-4 rounded-xl bg-sunken border border-line text-xs text-ink-2 font-mono leading-relaxed whitespace-pre-wrap">
                {contextDataText}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-sunken border-t border-line flex items-center justify-end shrink-0">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
