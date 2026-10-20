'use client';

import {
  ApiProviderId,
  OperationalApiPurposeId,
  ExecutionCostReport,
  getEffectiveConfigForPurpose,
  loadApiWorkspaceConfig,
  recordApiUsageLog,
  PROVIDER_MODELS_CATALOG,
} from './apiKeyConfig';

export interface ExecuteOperationalReportParams {
  purposeId: OperationalApiPurposeId;
  moduleTitle?: string;
  inputContextText: string;
  overrideProvider?: 'ROUTE_DEFAULT' | ApiProviderId;
  overrideModel?: string;
  customSystemInstruction?: string;
  sourceTag?: 'PLAYGROUND' | 'LEGAL_OCR' | 'SCRIPT_REVIEW' | 'STAFF_REVIEW' | 'CONTRACT' | 'PLAN' | 'QA';
}

export interface OperationalReportResult {
  ok: boolean;
  purposeId: OperationalApiPurposeId;
  provider: ApiProviderId;
  providerUsedLabel: string;
  providerUsed: string;
  modelUsed: string;
  usedFallback: boolean;
  fallbackReason?: string;
  latencyMs: number;
  outputText: string;
  output: string;
  usage?: ExecutionCostReport;
  generatedAt: string;
}

/**
 * Thực thi phân tích & lập báo cáo cho một phân hệ nghiệp vụ B2C,
 * tự động lấy khóa API / Model từ Trung tâm Cấu hình API và ghi nhật ký Token/Chi phí.
 */
export async function executeOperationalReport(
  params: ExecuteOperationalReportParams
): Promise<OperationalReportResult> {
  const workspaceCfg = loadApiWorkspaceConfig();
  const effective = getEffectiveConfigForPurpose(params.purposeId, workspaceCfg);

  const chosenProvider: ApiProviderId =
    !params.overrideProvider || params.overrideProvider === 'ROUTE_DEFAULT'
      ? effective.primaryProvider
      : params.overrideProvider;

  const chosenModel: string =
    params.overrideModel && params.overrideModel.trim()
      ? params.overrideModel.trim()
      : chosenProvider === effective.primaryProvider
      ? effective.primaryModel
      : chosenProvider === 'INTERNAL'
      ? 'upbase-local-engine'
      : workspaceCfg.providers[chosenProvider]?.defaultModel ||
        PROVIDER_MODELS_CATALOG[chosenProvider]?.[0]?.id ||
        'gemini-3.8-flash';

  const chosenApiKey: string =
    chosenProvider === effective.primaryProvider
      ? effective.primaryApiKey
      : chosenProvider === 'INTERNAL'
      ? ''
      : workspaceCfg.providers[chosenProvider]?.apiKey || '';

  const chosenBaseUrl: string | undefined =
    chosenProvider === 'INTERNAL' ? undefined : workspaceCfg.providers[chosenProvider]?.baseUrl;

  const systemInstruction =
    params.customSystemInstruction?.trim() || effective.purpose.systemInstruction;

  const resolvedTitle = params.moduleTitle || effective.purpose.title;
  const formattedInput = params.inputContextText.startsWith('[DỮ LIỆU PHÂN HỆ')
    ? params.inputContextText
    : `[DỮ LIỆU PHÂN HỆ: ${resolvedTitle}]\n${params.inputContextText}`;

  const res = await fetch('/api/integrations/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'EXECUTE_PURPOSE',
      purposeId: params.purposeId,
      provider: chosenProvider,
      model: chosenModel,
      apiKey: chosenApiKey,
      baseUrl: chosenBaseUrl,
      systemInstruction,
      inputText: formattedInput,
      temperature: effective.purpose.temperature,
      maxTokens: effective.purpose.maxTokens,
      fallbackProvider: effective.fallbackProvider,
      fallbackModel: effective.fallbackModel,
      fallbackApiKey: effective.fallbackApiKey,
    }),
  });

  const data = await res.json();
  const usageReport: ExecutionCostReport | undefined = data.usage;
  const resolvedProvider: ApiProviderId = (data.provider as ApiProviderId) || chosenProvider;
  const resolvedModel: string = data.modelUsed || chosenModel;
  const latencyMs: number = data.latencyMs || 0;

  if (usageReport) {
    recordApiUsageLog({
      purposeId: params.purposeId,
      purposeTitle: `${resolvedTitle} (${effective.purpose.title.replace(/^\d+\.\s*/, '')})`,
      provider: resolvedProvider,
      modelUsed: resolvedModel,
      promptTokens: usageReport.promptTokens,
      completionTokens: usageReport.completionTokens,
      totalTokens: usageReport.totalTokens,
      costUsd: usageReport.costUsd,
      costVnd: usageReport.costVnd,
      latencyMs,
      status: !data.ok ? 'ERROR' : data.usedFallback ? 'FALLBACK' : 'SUCCESS',
      source:
        params.sourceTag ||
        (params.purposeId === 'PLAN_ADS_ANALYSIS'
          ? 'PLAN'
          : params.purposeId === 'STAFF_REVIEW'
          ? 'STAFF_REVIEW'
          : params.purposeId === 'SCRIPT_REVIEW'
          ? 'SCRIPT_REVIEW'
          : params.purposeId === 'CONTRACT_DRAFTING'
          ? 'CONTRACT'
          : params.purposeId === 'LEGAL_OCR'
          ? 'LEGAL_OCR'
          : 'PLAYGROUND'),
    });
  }

  const finalOutput = data.output || data.error || 'Không nhận được nội dung báo cáo.';
  const finalProviderLabel = data.providerUsed || chosenProvider;

  return {
    ok: Boolean(data.ok),
    purposeId: params.purposeId,
    provider: resolvedProvider,
    providerUsedLabel: finalProviderLabel,
    providerUsed: finalProviderLabel,
    modelUsed: resolvedModel,
    usedFallback: Boolean(data.usedFallback),
    fallbackReason: data.fallbackReason,
    latencyMs,
    outputText: finalOutput,
    output: finalOutput,
    usage: usageReport,
    generatedAt: new Date().toISOString(),
  };
}
