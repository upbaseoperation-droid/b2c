'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  Clock,
} from 'lucide-react';
import type { BookingDealItem, KocItem } from '../../lib/types';
import type { DuplicateMatch } from './kocUtils';
import {
  Modal,
  Button,
  Status,
  Stat,
  StatRow,
  Panel,
  SectionHeader,
  Field,
  Input,
  Select,
  Textarea,
} from '../ui';
import {
  ApiProviderId,
  PROVIDER_MODELS_CATALOG,
  loadApiWorkspaceConfig,
  getEffectiveConfigForPurpose,
  getDefaultPurposeRoute,
  updatePurposeSystemInstruction,
  resetPurposeSystemInstruction,
  API_CONFIG_UPDATED_EVENT,
} from '../../lib/apiKeyConfig';
import { executeOperationalReport, OperationalReportResult } from '../../lib/operationalReportService';
import { evaluateKocCollaborationHistory, KocRiskCategory } from '../../lib/kocHistoryEvaluator';
import { formatVnd, formatVndShort } from '../../lib/format';
import { InlinePurposeApiSetup } from '../InlinePurposeApiSetup';

export interface KocHistoryEvaluationModalProps {
  open: boolean;
  onClose: () => void;
  koc: KocItem | null;
  deals?: BookingDealItem[];
  duplicates?: DuplicateMatch[];
  initialBrandName?: string;
  initialProposedFee?: number;
  onCreateBooking?: (koc: KocItem) => void;
}

const RISK_CATEGORY_META: Record<KocRiskCategory, { label: string }> = {
  SLA: { label: 'Tiến độ & Kỷ luật SLA' },
  LEGAL_PAYMENT: { label: 'Pháp lý, Thuế & Thanh toán' },
  COMMERCIAL: { label: 'Hiệu quả thương mại & Đơn giá' },
  BRAND_CONTENT: { label: 'Nội dung & Phù hợp Nhãn hàng' },
};

export const KocHistoryEvaluationModal: React.FC<KocHistoryEvaluationModalProps> = ({
  open,
  onClose,
  koc,
  deals = [],
  duplicates = [],
  initialBrandName = '',
  initialProposedFee,
  onCreateBooking,
}) => {
  const [targetBrandName, setTargetBrandName] = useState<string>(initialBrandName);
  const [proposedFeeInput, setProposedFeeInput] = useState<string>(
    initialProposedFee ? String(initialProposedFee) : ''
  );

  const [configVersion, setConfigVersion] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<ApiProviderId>('GOOGLE');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [editablePrompt, setEditablePrompt] = useState<string>('');
  const [showPromptSetup, setShowPromptSetup] = useState<boolean>(false);
  const [showContextPreview, setShowContextPreview] = useState<boolean>(false);
  const [promptToast, setPromptToast] = useState<string | null>(null);

  const [isRunningReport, setIsRunningReport] = useState<boolean>(false);
  const [llmReport, setLlmReport] = useState<OperationalReportResult | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  useEffect(() => {
    const onConfigUpdate = () => setConfigVersion(v => v + 1);
    window.addEventListener(API_CONFIG_UPDATED_EVENT, onConfigUpdate);
    return () => window.removeEventListener(API_CONFIG_UPDATED_EVENT, onConfigUpdate);
  }, []);

  const effectiveRoute = useMemo(() => {
    void configVersion;
    const cfg = loadApiWorkspaceConfig();
    return getEffectiveConfigForPurpose('KOC_HISTORY_EVALUATION', cfg);
  }, [configVersion]);

  const defaultRoute = useMemo(() => getDefaultPurposeRoute('KOC_HISTORY_EVALUATION'), []);

  useEffect(() => {
    if (open && koc) {
      setTargetBrandName(initialBrandName || koc.brandName || '');
      setProposedFeeInput(
        initialProposedFee
          ? String(initialProposedFee)
          : koc.maxRate || koc.minRate
          ? String(koc.maxRate || koc.minRate)
          : ''
      );
      setSelectedProvider(effectiveRoute.primaryProvider);
      setSelectedModel(effectiveRoute.primaryModel);
      setEditablePrompt(effectiveRoute.purpose.systemInstruction || defaultRoute.systemInstruction);
      setLlmReport(null);
    }
  }, [
    open,
    koc,
    initialBrandName,
    initialProposedFee,
    effectiveRoute.primaryProvider,
    effectiveRoute.primaryModel,
    effectiveRoute.purpose.systemInstruction,
    defaultRoute.systemInstruction,
  ]);

  const parsedProposedFee = useMemo(() => {
    const raw = parseInt(proposedFeeInput.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  }, [proposedFeeInput]);

  const evaluation = useMemo(() => {
    if (!open || !koc) return null;
    return evaluateKocCollaborationHistory({
      koc,
      deals,
      duplicates,
      targetBrandName: targetBrandName.trim() || undefined,
      proposedFeeNet: parsedProposedFee,
    });
  }, [open, koc, deals, duplicates, targetBrandName, parsedProposedFee]);

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
    const updated = updatePurposeSystemInstruction('KOC_HISTORY_EVALUATION', editablePrompt);
    setEditablePrompt(updated.systemInstruction);
    setPromptToast('Đã lưu câu lệnh (Prompt) làm mặc định cho Báo cáo thẩm định KOC');
    setTimeout(() => setPromptToast(null), 2500);
  };

  const handleResetPromptDefault = () => {
    const reset = resetPurposeSystemInstruction('KOC_HISTORY_EVALUATION');
    setEditablePrompt(reset.systemInstruction);
    setPromptToast('Đã khôi phục câu lệnh (Prompt) mặc định');
    setTimeout(() => setPromptToast(null), 2500);
  };

  const handleRunReport = async (promptOverride?: string) => {
    if (!evaluation) return;
    setIsRunningReport(true);
    try {
      const promptToUse =
        (promptOverride ?? editablePrompt).trim() || effectiveRoute.purpose.systemInstruction;
      const res = await executeOperationalReport({
        purposeId: 'KOC_HISTORY_EVALUATION',
        inputContextText: evaluation.contextDataText,
        customSystemInstruction: promptToUse,
        overrideProvider: selectedProvider,
        overrideModel: selectedModel,
      });
      setLlmReport(res);
    } finally {
      setIsRunningReport(false);
    }
  };

  useEffect(() => {
    if (open && evaluation && !llmReport && !isRunningReport) {
      const initialPrompt =
        effectiveRoute.purpose.systemInstruction || defaultRoute.systemInstruction;
      void handleRunReport(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, evaluation?.kocId]);

  const handleCopyReport = () => {
    if (!llmReport?.output) return;
    navigator.clipboard.writeText(llmReport.output);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 1800);
  };

  if (!koc || !evaluation) return null;

  const verdictTone =
    evaluation.suitabilityVerdict === 'HIGHLY_SUITABLE'
      ? 'positive'
      : evaluation.suitabilityVerdict === 'CONDITIONAL'
      ? 'warning'
      : 'critical';

  const riskTone =
    evaluation.overallRiskLevel === 'LOW'
      ? 'positive'
      : evaluation.overallRiskLevel === 'MEDIUM'
      ? 'warning'
      : 'critical';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Báo cáo đánh giá lịch sử & rủi ro KOC — ${koc.stageName}`}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={Sliders}
              onClick={() => setShowPromptSetup(v => !v)}
            >
              {showPromptSetup ? 'Ẩn thiết lập câu lệnh (Prompt)' : 'Thiết lập câu lệnh (Prompt)'}
            </Button>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={() => void handleRunReport()}
              disabled={isRunningReport}
            >
              {isRunningReport ? 'Đang lập báo cáo...' : 'Chạy đánh giá lại'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {onCreateBooking && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onCreateBooking(koc);
                }}
              >
                Tạo booking với KOC này
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 1. Khối Kết luận Tổng quan Mức độ phù hợp & Rủi ro */}
        <div className="p-4 rounded-xl bg-sunken border border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Status tone={verdictTone}>{evaluation.suitabilityVerdictLabel}</Status>
              <Status tone={riskTone}>{evaluation.overallRiskLabel}</Status>
              <span className="text-xs font-mono text-ink-3">
                @{koc.channelId.replace(/^@/, '')} · {koc.kocCategory || 'Chưa phân ngành'}
                {koc.salaryGrade ? ` · ${koc.salaryGrade}` : ''}
              </span>
            </div>
            <div className="text-xs text-ink-2">
              Pháp lý: <strong className="text-ink">{evaluation.legalStatusLabel}</strong> · Đơn giá thực chi TB:{' '}
              <strong className="text-ink">
                {evaluation.avgHistoricalFeeNet > 0 ? formatVnd(evaluation.avgHistoricalFeeNet) : 'Chưa có'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-surface border border-line text-center">
              <div className="text-2xs text-ink-3 font-medium">Điểm phù hợp</div>
              <div className="text-xl font-bold text-ink tabular-nums">
                {evaluation.suitabilityScore}
                <span className="text-xs font-normal text-ink-3">/100</span>
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-surface border border-line text-center">
              <div className="text-2xs text-ink-3 font-medium">Cảnh báo rủi ro</div>
              <div className="text-xl font-bold text-ink tabular-nums">
                {evaluation.riskFlags.length}
                <span className="text-xs font-normal text-ink-3"> mục</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Bộ tham số đối chiếu Chiến dịch mục tiêu & Thiết lập Prompt */}
        <Panel>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <Field label="Nhãn hàng / Gian hàng dự kiến book">
                <Input
                  value={targetBrandName}
                  onChange={e => setTargetBrandName(e.target.value)}
                  placeholder="VD: ClubClio, Kutieskin, Rejuran..."
                />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Đơn giá Net dự kiến chốt (VNĐ)">
                <Input
                  value={proposedFeeInput}
                  onChange={e => setProposedFeeInput(e.target.value)}
                  placeholder="VD: 3500000"
                />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Công cụ phân tích báo cáo">
                <Select
                  value={selectedProvider}
                  onChange={e => handleProviderChange(e.target.value as ApiProviderId)}
                >
                  <option value="GOOGLE">Google (Gemini API)</option>
                  <option value="OPENAI">OpenAI (ChatGPT API)</option>
                  <option value="CLAUDE">Anthropic (Claude API)</option>
                  <option value="INTERNAL">Bộ xử lý nội bộ Upbase</option>
                </Select>
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button
                variant="primary"
                icon={RefreshCw}
                onClick={() => void handleRunReport()}
                disabled={isRunningReport}
                className="w-full justify-center"
              >
                {isRunningReport ? 'Đang chạy...' : 'Đánh giá'}
              </Button>
            </div>
          </div>

          {/* Thanh bật/tắt Thiết lập câu lệnh (Prompt) */}
          <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowPromptSetup(v => !v)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showPromptSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Thiết lập câu lệnh (Prompt) đánh giá lịch sử & rủi ro KOC
              </button>
              <button
                type="button"
                onClick={() => setShowContextPreview(v => !v)}
                className="text-xs font-medium text-ink-3 hover:text-ink flex items-center gap-1 cursor-pointer"
              >
                {showContextPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Xem dữ liệu lịch sử gửi phân tích
              </button>
            </div>

            {promptToast && (
              <span className="text-xs font-semibold text-success flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {promptToast}
              </span>
            )}
          </div>

          {showPromptSetup && (
            <div className="mt-3">
              <InlinePurposeApiSetup
                purposeId="KOC_HISTORY_EVALUATION"
                onConfigSaved={() => {
                  const eff = getEffectiveConfigForPurpose('KOC_HISTORY_EVALUATION');
                  setSelectedProvider(eff.primaryProvider);
                  setSelectedModel(eff.primaryModel);
                  setEditablePrompt(eff.purpose.systemInstruction);
                }}
              />
            </div>
          )}

          {showContextPreview && (
            <div className="mt-3 p-3 rounded-xl bg-sunken border border-line">
              <pre className="text-2xs font-mono text-ink-2 whitespace-pre-wrap max-h-44 overflow-y-auto">
                {evaluation.contextDataText}
              </pre>
            </div>
          )}
        </Panel>

        {/* 3. Hàng chỉ số Hiệu quả Lịch sử Hợp tác */}
        <StatRow>
          <Stat
            label="Tổng chiến dịch lịch sử"
            value={`${evaluation.stats.totalDeals} deal`}
            note={`${evaluation.stats.paidDealsCount} Paid · ${evaluation.stats.focDealsCount} FOC`}
          />
          <Stat
            label="Tổng GMV / Chi phí Net"
            value={formatVndShort(evaluation.stats.totalGmv)}
            note={`Chi Net: ${formatVndShort(evaluation.stats.totalSpentNet)}`}
            tone={evaluation.stats.overallRoi >= 2.0 ? 'positive' : undefined}
          />
          <Stat
            label="ROI trung bình / Tỷ lệ lãi"
            value={evaluation.stats.totalDeals > 0 ? `${evaluation.stats.overallRoi.toFixed(2)}x` : '—'}
            note={
              evaluation.stats.paidDealsCount > 0
                ? `${evaluation.profitableDealRatio}% deal đạt ROI >= 2.0x`
                : 'Chưa có deal trả phí'
            }
            tone={
              evaluation.stats.overallRoi >= 2.5
                ? 'positive'
                : evaluation.stats.overallRoi < 1.2 && evaluation.stats.totalSpentNet > 0
                ? 'critical'
                : undefined
            }
          />
          <Stat
            label="Đúng hạn SLA / Spark Ads"
            value={evaluation.stats.totalDeals > 0 ? `${evaluation.stats.onTimePostRate}%` : '—'}
            note={
              evaluation.stats.totalDeals > 0
                ? `Kịch bản: ${evaluation.stats.onTimeScriptRate}% · Mã Ads: ${evaluation.stats.sparkComplianceRate}%`
                : 'Chưa có dữ liệu SLA'
            }
            tone={
              evaluation.stats.totalDeals === 0
                ? undefined
                : evaluation.stats.onTimePostRate >= 85
                ? 'positive'
                : 'warning'
            }
          />
        </StatRow>

        {/* 4. Ma trận Rủi ro phát hiện & Điểm mạnh / Khuyến nghị */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3">
            <SectionHeader title={`Phân tích rủi ro phát hiện qua lịch sử (${evaluation.riskFlags.length})`} />
            {evaluation.riskFlags.length === 0 ? (
              <Panel>
                <div className="flex items-center gap-2.5 text-xs text-positive font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Không phát hiện rủi ro nghiêm trọng nào về SLA, pháp lý hay lịch sử hợp tác.</span>
                </div>
              </Panel>
            ) : (
              <div className="space-y-2.5">
                {evaluation.riskFlags.map(flag => {
                  const flagTone =
                    flag.severity === 'HIGH'
                      ? 'critical'
                      : flag.severity === 'MEDIUM'
                      ? 'warning'
                      : 'info';
                  return (
                    <div
                      key={flag.id}
                      className="p-3.5 rounded-xl bg-surface border border-line space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Status tone={flagTone}>
                            {flag.severity === 'HIGH'
                              ? 'Rủi ro cao'
                              : flag.severity === 'MEDIUM'
                              ? 'Cần lưu ý'
                              : 'Theo dõi'}
                          </Status>
                          <span className="text-xs font-semibold text-ink">{flag.title}</span>
                        </div>
                        <span className="text-2xs font-medium text-ink-3 px-2 py-0.5 rounded bg-sunken border border-line">
                          {RISK_CATEGORY_META[flag.category]?.label || flag.categoryLabel}
                        </span>
                      </div>
                      <div className="text-xs text-ink-2">{flag.detail}</div>
                      <div className="text-xs text-ink pt-1 border-t border-line/60">
                        <strong className="font-semibold">Hướng kiểm soát:</strong> {flag.mitigation}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Panel>
              <SectionHeader title={`Điểm phù hợp & Lợi thế kênh (${evaluation.strengths.length})`} />
              <div className="mt-3 space-y-2">
                {evaluation.strengths.length > 0 ? (
                  evaluation.strengths.map((st, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-ink-2">
                      <CheckCircle2 className="w-4 h-4 text-positive shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-ink-3">Chưa có đủ dữ liệu chiến dịch hoàn tất để xác nhận điểm mạnh.</div>
                )}
              </div>
            </Panel>

            <Panel>
              <SectionHeader title={`Khuyến nghị đàm phán & Ràng buộc (${evaluation.recommendations.length})`} />
              <div className="mt-3 space-y-2">
                {evaluation.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-ink-2">
                    <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* 5. Báo cáo Thẩm định Tổng hợp từ Công cụ Phân tích (Theo Prompt đã cấu hình) */}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-ink">
                Báo cáo nhận xét chi tiết (Theo câu lệnh Prompt phân hệ)
              </h3>
              {llmReport && (
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-sunken border border-line text-ink-2">
                  {llmReport.providerUsed} · {llmReport.modelUsed}
                </span>
              )}
              {llmReport && (
                <span className="text-2xs text-ink-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {llmReport.latencyMs} ms
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {llmReport?.output && (
                <Button variant="secondary" size="sm" icon={copiedReport ? Check : Copy} onClick={handleCopyReport}>
                  {copiedReport ? 'Đã sao chép' : 'Sao chép báo cáo'}
                </Button>
              )}
            </div>
          </div>

          {llmReport?.fallbackReason && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-warning-soft border border-warning-line text-warning text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{llmReport.fallbackReason}</span>
            </div>
          )}

          <div className="mt-3">
            {isRunningReport ? (
              <div className="py-10 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
                <div className="text-xs font-medium text-ink-2">
                  Đang tổng hợp lịch sử hợp tác và chạy câu lệnh đánh giá rủi ro KOC...
                </div>
              </div>
            ) : llmReport?.output ? (
              <div className="p-4 rounded-xl bg-sunken border border-line font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap">
                {llmReport.output}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-ink-3">
                Bấm &quot;Đánh giá&quot; hoặc &quot;Chạy đánh giá lại&quot; để xuất báo cáo nhận xét.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Modal>
  );
};
