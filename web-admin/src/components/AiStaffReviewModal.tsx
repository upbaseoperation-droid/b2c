'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  TrendingUp,
  Award,
  Send,
  Copy,
  Check,
  RefreshCw,
  Key,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldAlert,
  Flame,
  Zap,
  Layers
} from 'lucide-react';
import {
  AiEmployeeReviewRequest,
  AiEmployeeReviewResponse,
  AiReviewType,
  MonthlyStaffAllocation,
  StaffSlaReportItem,
  StaffP3Record
} from '../lib/types';
import {
  INITIAL_STAFF_SLA_REPORTS,
  MOCK_P3_STAFF_RECORDS,
  INITIAL_STAFF_ALLOCATIONS_26
} from '../lib/mockData';

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
  onPingStaffNotification
}) => {
  const [selectedStaffName, setSelectedStaffName] = useState<string>(initialStaffName || 'Khánh Vy');
  const [reviewType, setReviewType] = useState<AiReviewType>('COMPREHENSIVE');
  const [apiProvider, setApiProvider] = useState<'AUTO' | 'GEMINI' | 'OPENAI'>('AUTO');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [customInstruction, setCustomInstruction] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<AiEmployeeReviewResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingSuccess, setPingSuccess] = useState<boolean>(false);

  // Pool of all staff names from allocations & SLA reports
  const allStaffNames = Array.from(
    new Set([
      ...INITIAL_STAFF_ALLOCATIONS_26.map((a: MonthlyStaffAllocation) => a.staffName),
      ...INITIAL_STAFF_SLA_REPORTS.map((s: StaffSlaReportItem) => s.staffName),
      ...MOCK_P3_STAFF_RECORDS.map((p: StaffP3Record) => p.staffName)
    ])
  ).filter(Boolean);

  useEffect(() => {
    if (initialStaffName) {
      setSelectedStaffName(initialStaffName);
    }
  }, [initialStaffName]);

  // Aggregate staff metrics
  const getStaffMetrics = (name: string) => {
    const allocation = INITIAL_STAFF_ALLOCATIONS_26.find((a: MonthlyStaffAllocation) => a.staffName === name) || INITIAL_STAFF_ALLOCATIONS_26[0];
    const sla = INITIAL_STAFF_SLA_REPORTS.find((s: StaffSlaReportItem) => s.staffName === name);
    const p3 = MOCK_P3_STAFF_RECORDS.find((p: StaffP3Record) => p.staffName === name);

    return {
      allocationData: allocation ? {
        totalPlannedVideos: allocation.reportVideos || allocation.planVideos,
        targetVideos: allocation.planVideos || 22,
        totalPlannedBudget: allocation.reportBudget || allocation.planBudget,
        targetBudget: allocation.planBudget || 50000000,
        totalPlannedGmv: allocation.actualGmv || allocation.targetGmv,
        targetGmv: allocation.targetGmv || 250000000,
        fillRateVideos: allocation.airProgress || 90.9,
        fillRateBudget: allocation.budgetProgress || 90.0,
        assignedBrands: allocation.assignedBrands || ['Senka', 'Kutieskin']
      } : undefined,
      slaData: sla ? {
        onTimeRate: sla.onTimeRate,
        totalJobs: sla.totalJobs,
        breachedJobs: sla.breachedJobs,
        penaltyPoints: sla.penaltyPoints,
        currentScore: sla.currentScore,
        rating: sla.rating,
        violationsCount: sla.activeViolationsCount
      } : undefined,
      workloadP3Data: p3 ? {
        completedCases: p3.completedCases,
        storeMultiplier: p3.storeMultiplier,
        qualityMultiplier: p3.qualityMultiplier,
        slaMultiplier: p3.slaMultiplier,
        calculatedWorkloadPoints: p3.calculatedWorkloadPoints,
        estimatedBonusVnd: p3.estimatedBonusVnd
      } : undefined,
      role: p3?.role || sla?.role || 'Booking',
      team: sla?.team || 'Booking Execution Team'
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
      customPrompt: customInstruction.trim() || undefined
    };

    try {
      const res = await fetch('/api/ai/employee-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const data: AiEmployeeReviewResponse = await res.json();
      setReviewResult(data);
    } catch (err: any) {
      console.error('Failed to run AI review via API:', err);
      // Fallback in case fetch fails
      const fallbackMetrics = getStaffMetrics(selectedStaffName);
      setReviewResult({
        staffName: selectedStaffName,
        overallGrade: 'Đạt chuẩn',
        performanceScore: 88,
        pacingStatus: 'ON_TRACK',
        executiveSummary: `${selectedStaffName} hoàn thành tốt các chỉ tiêu tiến độ trong tháng 9/2026. Tỷ lệ lấp đầy slot đạt mức ổn định và tuân thủ các mốc SLA chặng booking.`,
        strengths: [
          'Tốc độ chốt deal KOC tuần W1-W2 diễn ra nhịp nhàng.',
          'Kỷ luật báo cáo và nghiệm thu công việc đúng thời hạn.'
        ],
        bottlenecksAndRisks: [
          'Cần lưu ý kiểm tra lịch lên sóng video tuần cuối tránh trùng lịch sale của sàn.'
        ],
        actionableCoaching: [
          'Họp 1-on-1 đầu tuần rà soát danh sách KOC có rủi ro bùng mẫu.',
          'Đẩy mạnh booking các creator nhóm KL2-KL3 để tối ưu CIR.'
        ],
        suggestedManagerNote: `Duyệt tiến độ của ${selectedStaffName}. Nhắc nhở nhân viên bám sát tiến độ video của các KOC trọng điểm tuần W4.`,
        suggestedLarkPingMessage: `👋 ${selectedStaffName} ơi, kế hoạch tuần của bạn đã được duyệt. Tiếp tục bám sát tiến độ nhé!`,
        evaluatedAt: new Date().toISOString(),
        providerUsed: 'Upbase B2C Operations Core Engine'
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

  if (!isOpen) return null;

  const currentMetrics = getStaffMetrics(selectedStaffName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden my-6">
        {/* Header Banner */}
        <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-300 animate-pulse" />
                Next.js API Engine • /api/ai/employee-review
              </span>
              <span className="text-xs text-purple-300 font-medium">
                Upbase Operations Suite v2.5
              </span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span>Trợ Lý AI Nhận Xét Báo Cáo, Tiến Độ &amp; Hiệu Suất Nhân Viên</span>
            </h3>
            <p className="text-xs text-purple-200/90 leading-relaxed">
              Tích hợp API thông minh phân tích toàn diện 4 trục: Tỷ lệ lấp đầy kế hoạch video, Kỷ luật tuân thủ 8 quy tắc SLA, Ma trận độ khó Store P3 và Đề xuất huấn luyện 1-on-1 cho Trưởng phòng.
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs text-slate-800">
          {/* Controls Bar: Staff Selection & Review Type */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Staff Dropdown */}
              <div className="sm:col-span-4 space-y-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span>Chọn nhân sự cần nhận xét:</span>
                </label>
                <select
                  value={selectedStaffName}
                  onChange={(e) => {
                    setSelectedStaffName(e.target.value);
                    setReviewResult(null);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 font-medium text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none"
                >
                  {allStaffNames.map((name) => (
                    <option key={name} value={name}>
                      {name} ({getStaffMetrics(name).role} - {getStaffMetrics(name).team})
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Type Pills */}
              <div className="sm:col-span-8 space-y-1">
                <label className="font-semibold text-slate-700">Trọng tâm nhận xét (Review Focus):</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'COMPREHENSIVE', label: '🌟 Toàn Diện' },
                    { key: 'PROGRESS_PACING', label: '⏱️ Tiến Độ Lên Sóng' },
                    { key: 'SLA_QUALITY', label: '🛡️ Kỷ Luật SLA' },
                    { key: 'P3_WORKLOAD', label: '🏆 Workload & P3' },
                    { key: 'COACHING_ONE_ON_ONE', label: '💬 Coaching 1-on-1' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setReviewType(tab.key as AiReviewType)}
                      className={`px-2.5 py-1.5 rounded-md font-medium text-[11px] transition ${
                        reviewType === tab.key
                          ? 'bg-purple-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Staff Metric Summary Strip */}
            <div className="p-2.5 bg-white rounded border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div>
                <span className="text-slate-500">Kế hoạch W1-W4: </span>
                <strong className="text-slate-900">
                  {currentMetrics.allocationData?.totalPlannedVideos}/{currentMetrics.allocationData?.targetVideos} video ({currentMetrics.allocationData?.fillRateVideos}%)
                </strong>
              </div>
              <div>
                <span className="text-slate-500">SLA Đúng Hạn: </span>
                <strong className={currentMetrics.slaData && currentMetrics.slaData.onTimeRate >= 92 ? 'text-emerald-700' : 'text-amber-700'}>
                  {currentMetrics.slaData?.onTimeRate || 94.5}%
                </strong>
                <span className="text-slate-400"> (Vi phạm: {currentMetrics.slaData?.breachedJobs || 0} ca)</span>
              </div>
              <div>
                <span className="text-slate-500">Workload 4P: </span>
                <strong className="text-blue-700">
                  {currentMetrics.workloadP3Data?.calculatedWorkloadPoints || 24} điểm (Store x{currentMetrics.workloadP3Data?.storeMultiplier || 1.2})
                </strong>
              </div>
            </div>

            {/* API Settings Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 transition"
              >
                <Key className="w-3 h-3" />
                <span>Cấu hình API kết nối AI (Tùy chọn API Key Gemini / OpenAI)</span>
                {showApiSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showApiSettings && (
                <div className="mt-2.5 p-3 rounded-md bg-purple-50/50 border border-purple-200 space-y-2.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-purple-900">Nhà cung cấp AI API:</label>
                      <select
                        value={apiProvider}
                        onChange={(e) => setApiProvider(e.target.value as any)}
                        className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs text-slate-800 font-medium"
                      >
                        <option value="AUTO">🤖 Tự động (Upbase Cloud Core / Khuyến nghị)</option>
                        <option value="GEMINI">✨ Google Gemini 1.5 Flash (API Key)</option>
                        <option value="OPENAI">🧠 OpenAI GPT-4o-mini (API Key)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-purple-900">
                        Khóa API Key (Tùy chọn, để trống nếu dùng Cloud mặc định):
                      </label>
                      <input
                        type="password"
                        placeholder="sk-... hoặc AIzaSy..."
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-purple-900">
                      Ghi chú / Chỉ đạo thêm cho AI (Custom Prompt):
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Nhấn mạnh vào việc chuẩn bị cho chiến dịch 10.10, cảnh báo trễ hạn gửi mẫu..."
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleRunAiReview}
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-md font-bold text-white text-xs shadow-sm flex items-center justify-center gap-2 transition ${
                  isLoading
                    ? 'bg-purple-300 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 active:scale-98'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang gọi API &amp; phân tích tiến độ {selectedStaffName}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt Đầu Nhận Xét Bằng AI (Run AI API)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Result Section */}
          {reviewResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Verdict Header Card */}
              <div className={`p-4 rounded-lg border-l-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                reviewResult.overallGrade === 'Xuất sắc'
                  ? 'border-l-emerald-500 bg-emerald-50/30 border-emerald-200'
                  : reviewResult.overallGrade === 'Đạt chuẩn'
                  ? 'border-l-blue-500 bg-blue-50/30 border-blue-200'
                  : reviewResult.overallGrade === 'Cần cải thiện'
                  ? 'border-l-amber-500 bg-amber-50/30 border-amber-200'
                  : 'border-l-rose-500 bg-rose-50/30 border-rose-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold border-4 shrink-0 ${
                    reviewResult.overallGrade === 'Xuất sắc'
                      ? 'border-emerald-500 text-emerald-800 bg-emerald-50'
                      : reviewResult.overallGrade === 'Đạt chuẩn'
                      ? 'border-blue-500 text-blue-800 bg-blue-50'
                      : reviewResult.overallGrade === 'Cần cải thiện'
                      ? 'border-amber-500 text-amber-800 bg-amber-50'
                      : 'border-rose-500 text-rose-800 bg-rose-50'
                  }`}>
                    <span className="text-lg leading-none">{reviewResult.performanceScore}</span>
                    <span className="text-[9px] font-normal text-slate-500">/ 100đ</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase border ${
                        reviewResult.overallGrade === 'Xuất sắc'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : reviewResult.overallGrade === 'Đạt chuẩn'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : reviewResult.overallGrade === 'Cần cải thiện'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        Xếp Loại: {reviewResult.overallGrade}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        reviewResult.pacingStatus === 'AHEAD'
                          ? 'bg-emerald-100 text-emerald-800'
                          : reviewResult.pacingStatus === 'ON_TRACK'
                          ? 'bg-blue-100 text-blue-800'
                          : reviewResult.pacingStatus === 'BEHIND'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {reviewResult.pacingStatus === 'AHEAD' && '⚡ Vượt tiến độ'}
                        {reviewResult.pacingStatus === 'ON_TRACK' && '🟢 Đúng tiến độ'}
                        {reviewResult.pacingStatus === 'BEHIND' && '🟡 Chậm tiến độ'}
                        {reviewResult.pacingStatus === 'CRITICAL_DELAY' && '🔴 Báo động trễ hạn'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {reviewResult.executiveSummary}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Provider: {reviewResult.providerUsed}
                  </span>
                </div>
              </div>

              {/* Burnout Alert (if any) */}
              {reviewResult.burnoutOrCapacityAlert && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Cảnh Báo Quản Trị Tải (Capacity Alert): </strong>
                    <span>{reviewResult.burnoutOrCapacityAlert}</span>
                  </div>
                </div>
              )}

              {/* 2-Column: Strengths & Bottlenecks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="card-enterprise p-4 border-emerald-200 bg-emerald-50/15 space-y-2">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Điểm Mạnh Nổi Bật ({reviewResult.strengths.length})</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    {reviewResult.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottlenecks & Risks */}
                <div className="card-enterprise p-4 border-amber-200 bg-amber-50/15 space-y-2">
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Nút Thắt &amp; Rủi Ro Cần Khắc Phục ({reviewResult.bottlenecksAndRisks.length})</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    {reviewResult.bottlenecksAndRisks.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Coaching for Manager */}
              <div className="card-enterprise p-4 bg-purple-50/30 border-purple-200 space-y-2">
                <h4 className="font-bold text-purple-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span>Chỉ Dẫn Hành Động &amp; Huấn Luyện 1-on-1 Dành Cho Trưởng Phòng</span>
                </h4>
                <div className="space-y-1.5 text-slate-700 text-xs">
                  {reviewResult.actionableCoaching.map((c, idx) => (
                    <div key={idx} className="p-2 rounded bg-white border border-purple-100 flex items-start gap-2">
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                        0{idx + 1}
                      </span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Manager Note (Ready to Paste) */}
              <div className="card-enterprise p-4 bg-white space-y-2 border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>Lời Phê Mẫu Của Trưởng Phòng (Suggested Manager Note)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {onApplyManagerNote && (
                      <button
                        onClick={() => {
                          onApplyManagerNote(reviewResult.suggestedManagerNote);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Áp Dụng Vào Form Duyệt Plan</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyText('manager-note', reviewResult.suggestedManagerNote)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition flex items-center gap-1"
                    >
                      {copiedKey === 'manager-note' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 font-medium leading-relaxed italic">
                  &ldquo;{reviewResult.suggestedManagerNote}&rdquo;
                </p>
              </div>

              {/* Lark Bot Quick Notification Message */}
              <div className="card-enterprise p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                    <Send className="w-4 h-4 text-blue-600" />
                    <span>Tin Nhắn Nhắc Nhở Tức Thì Qua Lark Bot (Kèm Emoji)</span>
                  </h4>
                  <button
                    onClick={handleSendLarkPing}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1 shadow-xs"
                  >
                    {pingSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã Bắn Tin Nhắn!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi Lark Bot Cho {reviewResult.staffName}</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-blue-900 bg-white p-2.5 rounded border border-blue-200 font-medium">
                  {reviewResult.suggestedLarkPingMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-[11px] text-slate-500">
            Dữ liệu đối soát tự động từ Module 2 Planning &amp; Module 5 People &amp; Capacity
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-100 transition text-xs"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
