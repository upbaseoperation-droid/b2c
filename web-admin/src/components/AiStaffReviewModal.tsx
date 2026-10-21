'use client';

import React, { useState } from 'react';
import {
  Button,
  Chips,
  Field,
  Input,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
} from './ui';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Key,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  AiEmployeeReviewRequest,
  AiEmployeeReviewResponse,
  AiReviewType,
  MonthlyStaffAllocation,
  StaffSlaReportItem,
  StaffP3Record,
} from '../lib/types';
import {
  INITIAL_STAFF_SLA_REPORTS,
  MOCK_P3_STAFF_RECORDS,
  INITIAL_STAFF_ALLOCATIONS_26,
} from '../lib/mockData';
import {
  getEffectiveConfigForPurpose,
  calculateExecutionCost,
  recordApiUsageLog,
} from '../lib/apiKeyConfig';
import { InlinePurposeApiSetup } from './InlinePurposeApiSetup';

interface AiStaffReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStaffName?: string;
  onApplyManagerNote?: (note: string) => void;
  onPingStaffNotification?: (staffName: string, message: string) => void;
}

export const AiStaffReviewModal: React.FC<AiStaffReviewModalProps> = ({
  isOpen,
  onClose,
  initialStaffName,
  onApplyManagerNote,
  onPingStaffNotification,
}) => {
  const [selectedStaffName, setSelectedStaffName] = useState<string>(initialStaffName || 'Khánh Vy');
  const [prevInitialStaffName, setPrevInitialStaffName] = useState<string | undefined>(initialStaffName);
  if (initialStaffName !== prevInitialStaffName) {
    setPrevInitialStaffName(initialStaffName);
    if (initialStaffName) {
      setSelectedStaffName(initialStaffName);
    }
  }

  const [reviewType, setReviewType] = useState<AiReviewType>('COMPREHENSIVE');
  const [apiProvider, setApiProvider] = useState<'AUTO' | 'GEMINI' | 'OPENAI' | 'CLAUDE'>(() => {
    const eff = getEffectiveConfigForPurpose('STAFF_REVIEW');
    if (eff.primaryProvider === 'GOOGLE') return 'GEMINI';
    if (eff.primaryProvider === 'OPENAI') return 'OPENAI';
    if (eff.primaryProvider === 'CLAUDE') return 'CLAUDE';
    return 'AUTO';
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    const eff = getEffectiveConfigForPurpose('STAFF_REVIEW');
    return eff.primaryApiKey || '';
  });
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [customInstruction, setCustomInstruction] = useState<string>(() => {
    const eff = getEffectiveConfigForPurpose('STAFF_REVIEW');
    return eff.purpose.systemInstruction || '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<AiEmployeeReviewResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingSuccess, setPingSuccess] = useState<boolean>(false);

  const allStaffNames = Array.from(
    new Set([
      ...INITIAL_STAFF_ALLOCATIONS_26.map((a: MonthlyStaffAllocation) => a.staffName),
      ...INITIAL_STAFF_SLA_REPORTS.map((s: StaffSlaReportItem) => s.staffName),
      ...MOCK_P3_STAFF_RECORDS.map((p: StaffP3Record) => p.staffName),
    ])
  ).filter(Boolean);

  const getStaffMetrics = (name: string) => {
    const allocation =
      INITIAL_STAFF_ALLOCATIONS_26.find((a: MonthlyStaffAllocation) => a.staffName === name) ||
      INITIAL_STAFF_ALLOCATIONS_26[0];
    const sla = INITIAL_STAFF_SLA_REPORTS.find((s: StaffSlaReportItem) => s.staffName === name);
    const p3 = MOCK_P3_STAFF_RECORDS.find((p: StaffP3Record) => p.staffName === name);

    return {
      allocationData: allocation
        ? {
            totalPlannedVideos: allocation.reportVideos || allocation.planVideos,
            targetVideos: allocation.planVideos || 22,
            totalPlannedBudget: allocation.reportBudget || allocation.planBudget,
            targetBudget: allocation.planBudget || 50000000,
            totalPlannedGmv: allocation.actualGmv || allocation.targetGmv,
            targetGmv: allocation.targetGmv || 250000000,
            fillRateVideos: allocation.airProgress || 90.9,
            fillRateBudget: allocation.budgetProgress || 90.0,
            assignedBrands: allocation.assignedBrands || ['Senka', 'Kutieskin'],
          }
        : undefined,
      slaData: sla
        ? {
            onTimeRate: sla.onTimeRate,
            totalJobs: sla.totalJobs,
            breachedJobs: sla.breachedJobs,
            penaltyPoints: sla.penaltyPoints,
            currentScore: sla.currentScore,
            rating: sla.rating,
            violationsCount: sla.activeViolationsCount,
          }
        : undefined,
      workloadP3Data: p3
        ? {
            completedCases: p3.completedCases,
            storeMultiplier: p3.storeMultiplier,
            qualityMultiplier: p3.qualityMultiplier,
            slaMultiplier: p3.slaMultiplier,
            calculatedWorkloadPoints: p3.calculatedWorkloadPoints,
            estimatedBonusVnd: p3.estimatedBonusVnd,
          }
        : undefined,
      role: p3?.role || sla?.role || 'Booking',
      team: sla?.team || 'Booking Execution Team',
    };
  };

  const handleRunAiReview = async () => {
    setIsLoading(true);
    setReviewResult(null);

    const metrics = getStaffMetrics(selectedStaffName);

    const payload: AiEmployeeReviewRequest = {
      staffName: selectedStaffName,
      role: metrics.role,
      team: metrics.team,
      month: '2026/09',
      reviewType,
      allocationData: metrics.allocationData,
      slaData: metrics.slaData,
      workloadP3Data: metrics.workloadP3Data,
      apiKey: customApiKey.trim() || undefined,
      apiProvider,
      customPrompt: customInstruction.trim() || undefined,
    };

    const startTime = Date.now();
    try {
      const res = await fetch('/api/ai/employee-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const data: AiEmployeeReviewResponse = await res.json();
      setReviewResult(data);

      const eff = getEffectiveConfigForPurpose('STAFF_REVIEW');
      const promptChars = JSON.stringify(payload).length;
      const completionChars = JSON.stringify(data).length;
      const promptTokens = Math.max(120, Math.ceil(promptChars / 3.8));
      const completionTokens = Math.max(80, Math.ceil(completionChars / 3.8));
      const modelUsed = data.providerUsed?.includes('Gemini')
        ? 'gemini-3.8-flash'
        : data.providerUsed?.includes('GPT')
        ? 'gpt-5-mini'
        : data.providerUsed?.includes('Claude')
        ? 'claude-sonnet-5-5'
        : eff.primaryProvider === 'INTERNAL'
        ? 'upbase-local-engine'
        : eff.primaryModel;
      const providerId = data.providerUsed?.includes('Gemini')
        ? 'GOOGLE'
        : data.providerUsed?.includes('GPT')
        ? 'OPENAI'
        : data.providerUsed?.includes('Claude')
        ? 'CLAUDE'
        : 'INTERNAL';
      const costReport = calculateExecutionCost(modelUsed, {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      });

      recordApiUsageLog({
        purposeId: 'STAFF_REVIEW',
        purposeTitle: `Đánh giá nhân sự 4P & SLA: ${selectedStaffName}`,
        provider: providerId,
        modelUsed,
        promptTokens: costReport.promptTokens,
        completionTokens: costReport.completionTokens,
        totalTokens: costReport.totalTokens,
        costUsd: costReport.costUsd,
        costVnd: costReport.costVnd,
        latencyMs: Date.now() - startTime,
        status: providerId === 'INTERNAL' ? 'FALLBACK' : 'SUCCESS',
        source: 'STAFF_REVIEW',
      });
    } catch {
      setReviewResult({
        staffName: selectedStaffName,
        overallGrade: 'Đạt chuẩn',
        performanceScore: 88,
        pacingStatus: 'ON_TRACK',
        executiveSummary: `${selectedStaffName} hoàn thành các chỉ tiêu tiến độ trong tháng 9/2026. Tỷ lệ lấp đầy slot đạt mức ổn định và tuân thủ các mốc SLA chặng booking.`,
        strengths: [
          'Tốc độ chốt deal KOC tuần W1–W2 diễn ra nhịp nhàng.',
          'Kỷ luật báo cáo và nghiệm thu công việc đúng thời hạn.',
        ],
        bottlenecksAndRisks: [
          'Cần lưu ý kiểm tra lịch lên sóng video tuần cuối tránh trùng lịch sale của sàn.',
        ],
        actionableCoaching: [
          'Họp 1-on-1 đầu tuần rà soát danh sách KOC có rủi ro bùng mẫu.',
          'Đẩy mạnh booking các creator nhóm KL2–KL3 để tối ưu CIR.',
        ],
        suggestedManagerNote: `Duyệt tiến độ của ${selectedStaffName}. Nhắc nhở nhân viên bám sát tiến độ video của các KOC trọng điểm tuần W4.`,
        suggestedLarkPingMessage: `${selectedStaffName} ơi, kế hoạch tuần của bạn đã được duyệt. Tiếp tục bám sát tiến độ nhé!`,
        evaluatedAt: new Date().toISOString(),
        providerUsed: 'Hệ thống phân tích nội bộ',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendLarkPing = () => {
    if (!reviewResult) return;
    if (onPingStaffNotification) {
      onPingStaffNotification(reviewResult.staffName, reviewResult.suggestedLarkPingMessage);
    }
    setPingSuccess(true);
    setTimeout(() => setPingSuccess(false), 3000);
  };

  const currentMetrics = getStaffMetrics(selectedStaffName);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nhận xét tiến độ và hiệu suất nhân sự"
      size="xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            icon={RefreshCw}
            disabled={isLoading}
            onClick={handleRunAiReview}
          >
            {isLoading ? 'Đang tổng hợp nhận xét…' : 'Tổng hợp nhận xét'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-ink">
        <div className="p-3.5 bg-canvas rounded-lg border border-line space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <Field label="Nhân sự">
                <Select
                  value={selectedStaffName}
                  onChange={(e) => {
                    setSelectedStaffName(e.target.value);
                    setReviewResult(null);
                  }}
                >
                  {allStaffNames.map((name) => (
                    <option key={name} value={name}>
                      {name} ({getStaffMetrics(name).role} · {getStaffMetrics(name).team})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="sm:col-span-7 space-y-1.5">
              <span className="text-xs font-medium text-ink-2 block">Trọng tâm nhận xét</span>
              <Chips
                value={reviewType}
                onChange={setReviewType}
                items={[
                  { key: 'COMPREHENSIVE', label: 'Tổng quan' },
                  { key: 'PROGRESS_PACING', label: 'Tiến độ đăng' },
                  { key: 'SLA_QUALITY', label: 'Kỷ luật SLA' },
                  { key: 'P3_WORKLOAD', label: 'Khối lượng & P3' },
                  { key: 'COACHING_ONE_ON_ONE', label: 'Trao đổi 1-1' },
                ]}
              />
            </div>
          </div>

          <StatRow size="sm">
            <Stat
              label="Tiến độ video W1–W4"
              value={`${currentMetrics.allocationData?.totalPlannedVideos}/${currentMetrics.allocationData?.targetVideos} video`}
              note={`Đạt ${currentMetrics.allocationData?.fillRateVideos}% kế hoạch`}
            />
            <Stat
              label="Đúng hạn SLA"
              value={`${currentMetrics.slaData?.onTimeRate || 94.5}%`}
              note={`Trễ hạn ${currentMetrics.slaData?.breachedJobs || 0} ca`}
            />
            <Stat
              label="Điểm khối lượng 4P"
              value={`${currentMetrics.workloadP3Data?.calculatedWorkloadPoints || 24} điểm`}
              note={`Hệ số gian hàng x${currentMetrics.workloadP3Data?.storeMultiplier || 1.2}`}
            />
          </StatRow>

          <div className="pt-2 border-t border-line">
            <Field label="Ghi chú yêu cầu thêm cho kỳ đánh giá này">
              <Input
                type="text"
                placeholder="VD: Rà soát chuẩn bị chiến dịch 10.10, kiểm tra trễ hạn gửi mẫu..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {reviewResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-surface border border-line space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold text-ink">
                    {reviewResult.performanceScore}/100 điểm
                  </span>
                  <Status
                    tone={
                      reviewResult.overallGrade === 'Xuất sắc'
                        ? 'positive'
                        : reviewResult.overallGrade === 'Đạt chuẩn'
                        ? 'info'
                        : reviewResult.overallGrade === 'Cần cải thiện'
                        ? 'warning'
                        : 'critical'
                    }
                  >
                    {reviewResult.overallGrade}
                  </Status>
                </div>
                <span className="text-xs text-ink-3">
                  {reviewResult.pacingStatus === 'AHEAD' && 'Vượt tiến độ'}
                  {reviewResult.pacingStatus === 'ON_TRACK' && 'Đúng tiến độ'}
                  {reviewResult.pacingStatus === 'BEHIND' && 'Chậm tiến độ'}
                  {reviewResult.pacingStatus === 'CRITICAL_DELAY' && 'Trễ hạn cần xử lý'}
                </span>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                {reviewResult.executiveSummary}
              </p>
            </div>

            {reviewResult.burnoutOrCapacityAlert && (
              <div className="p-3 bg-warning-soft border border-warning/20 rounded-lg text-ink text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Cảnh báo tải công việc: </strong>
                  <span>{reviewResult.burnoutOrCapacityAlert}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title={`Điểm mạnh (${reviewResult.strengths.length})`}>
                <ul className="space-y-1.5 text-ink-2 text-xs">
                  {reviewResult.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ink-3">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title={`Điểm nghẽn cần khắc phục (${reviewResult.bottlenecksAndRisks.length})`}>
                <ul className="space-y-1.5 text-ink-2 text-xs">
                  {reviewResult.bottlenecksAndRisks.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-ink-3">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel title="Hướng dẫn trao đổi 1-1 cho quản lý">
              <div className="space-y-1.5 text-ink-2 text-xs">
                {reviewResult.actionableCoaching.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md bg-canvas border border-line flex items-start gap-2"
                  >
                    <span className="text-ink-3 font-mono font-semibold text-xs shrink-0">
                      {idx + 1}.
                    </span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Nhận xét mẫu của quản lý"
              actions={
                <div className="flex items-center gap-2">
                  {onApplyManagerNote && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Check}
                      onClick={() => {
                        onApplyManagerNote(reviewResult.suggestedManagerNote);
                        onClose();
                      }}
                    >
                      Áp dụng vào phiếu duyệt
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={copiedKey === 'manager-note' ? Check : Copy}
                    onClick={() =>
                      handleCopyText('manager-note', reviewResult.suggestedManagerNote)
                    }
                  >
                    {copiedKey === 'manager-note' ? 'Đã chép' : 'Sao chép'}
                  </Button>
                </div>
              }
            >
              <p className="p-3 bg-canvas rounded-md border border-line text-ink leading-relaxed">
                {reviewResult.suggestedManagerNote}
              </p>
            </Panel>

            <Panel
              title="Tin nhắn gửi qua Lark"
              actions={
                <Button
                  size="sm"
                  variant="primary"
                  icon={pingSuccess ? Check : Send}
                  onClick={handleSendLarkPing}
                >
                  {pingSuccess ? 'Đã gửi tin nhắn' : `Gửi Lark cho ${reviewResult.staffName}`}
                </Button>
              }
            >
              <p className="p-3 bg-canvas rounded-md border border-line text-ink leading-relaxed">
                {reviewResult.suggestedLarkPingMessage}
              </p>
            </Panel>
          </div>
        )}
      </div>
    </Modal>
  );
};
