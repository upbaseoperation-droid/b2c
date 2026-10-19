'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  Clock,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { REAL_B2C_42_BRANDS } from '../../lib/realB2cBrandsData';
import type {
  KocBriefAnalysisBackgroundJob,
  KocChannelBriefAnalysisReport,
} from '../../lib/kocChannelBriefAnalyzer';
import { formatNumber, formatVndShort } from '../../lib/format';
import { Button, Modal, Status, Textarea } from '../ui';

interface KocChannelBriefMatcherModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  initialHandles?: string[];
  initialBrandName?: string;
  onJobsChange?: (jobs: KocBriefAnalysisBackgroundJob[]) => void;
  onNotify?: (msg: string, type?: 'info' | 'error' | 'warning' | 'success') => void;
  onRunningCountChange?: (count: number) => void;
}

export const KocChannelBriefMatcherModal: React.FC<
  KocChannelBriefMatcherModalProps
> = ({
  open,
  isOpen,
  onClose,
  initialHandles = [],
  initialBrandName = 'Cocoon',
  onJobsChange,
  onNotify,
  onRunningCountChange,
}) => {
  const isModalOpen = open ?? isOpen ?? false;
  const [handlesInput, setHandlesInput] = useState<string>(
    initialHandles.join(', ')
  );
  const [brandName, setBrandName] = useState<string>(
    initialBrandName || 'Cocoon'
  );
  const [productName, setProductName] = useState<string>('');
  const [requiredUspInput, setRequiredUspInput] = useState<string>('');
  const [preferredStyle, setPreferredStyle] = useState<string>('');
  const [maxBudgetInput, setMaxBudgetInput] = useState<string>('5000000');
  const [videoScanLimit, setVideoScanLimit] = useState<number>(40);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<KocBriefAnalysisBackgroundJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedHandle, setSelectedHandle] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const initSyncKey = `${isOpen}:${initialHandles.join(',')}:${initialBrandName}`;
  const [prevSyncKey, setPrevSyncKey] = useState<string>(initSyncKey);
  if (initSyncKey !== prevSyncKey) {
    setPrevSyncKey(initSyncKey);
    if (isOpen && initialHandles.length > 0) {
      setHandlesInput(initialHandles.map((h) => `@${h.replace(/^@+/, '')}`).join(', '));
    }
    if (isOpen && initialBrandName) {
      setBrandName(initialBrandName);
    }
  }

  const fetchAllJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/tiktok-koc/channel-brief-analysis');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.jobs)) {
        setJobs(json.jobs);
        onJobsChange?.(json.jobs);
        setSelectedJobId((prev) => prev || json.jobs[0]?.jobId || '');
      }
    } catch {
      // ignore background poll error
    }
  }, [onJobsChange]);

  useEffect(() => {
    void fetchAllJobs();
  }, [fetchAllJobs]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchAllJobs();
  }, [isOpen, fetchAllJobs]);

  const hasRunningJobs = useMemo(
    () => jobs.some((j) => j.status === 'QUEUED' || j.status === 'RUNNING'),
    [jobs]
  );

  // Tự động cập nhật tiến trình chạy ngầm mỗi 2.5 giây
  useEffect(() => {
    if (!hasRunningJobs && !isOpen) return;
    const interval = setInterval(() => {
      void fetchAllJobs();
    }, 2500);
    return () => clearInterval(interval);
  }, [hasRunningJobs, isOpen, fetchAllJobs]);

  const activeJob = useMemo(
    () => jobs.find((j) => j.jobId === selectedJobId) || jobs[0] || null,
    [jobs, selectedJobId]
  );

  const activeReport: KocChannelBriefAnalysisReport | null = useMemo(() => {
    if (!activeJob || activeJob.results.length === 0) return null;
    return (
      activeJob.results.find((r) => r.handle === selectedHandle) ||
      activeJob.results[0] ||
      null
    );
  }, [activeJob, selectedHandle]);

  const handleStartBackgroundJob = async () => {
    if (!handlesInput.trim()) {
      setErrorMessage('Vui lòng nhập ít nhất 1 @handle hoặc link kênh TikTok KOC.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        '/api/integrations/tiktok-koc/channel-brief-analysis',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            handles: handlesInput,
            brandName: brandName.trim() || 'Cocoon',
            productName: productName.trim() || undefined,
            requiredUspKeywords: requiredUspInput,
            preferredContentStyle: preferredStyle.trim() || undefined,
            maxBudgetPerVideoVnd: Number(maxBudgetInput) || undefined,
            videoScanLimit,
            background: true,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMessage(
          json.error || 'Không thể khởi tạo tiến trình phân tích kênh KOC.'
        );
      } else if (json.job) {
        const createdJob: KocBriefAnalysisBackgroundJob = json.job;
        setJobs((prev) => {
          const next = [
            createdJob,
            ...prev.filter((j) => j.jobId !== createdJob.jobId),
          ];
          onJobsChange?.(next);
          return next;
        });
        setSelectedJobId(createdJob.jobId);
        setSelectedHandle(createdJob.handles[0] || '');
      }
    } catch {
      setErrorMessage('Lỗi kết nối khi gửi tiến trình phân tích ngầm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const copyBriefForKocText = useMemo(() => {
    if (!activeReport) return '';
    const ev = activeReport.briefMatchEvaluation;
    return [
      `=== HỒ SƠ ĐỐI CHIẾU KÊNH KOC & BRIEF CHIẾN DỊCH (${ev.brandName.toUpperCase()}) ===`,
      `• Kênh KOC: @${activeReport.handle} (${activeReport.nickname}) — Hạng: ${activeReport.tierLabel}`,
      `• Số video đã quét: ${activeReport.videoSampleStats.scannedVideosCount} video · View trung vị (Median): ${formatNumber(activeReport.videoSampleStats.medianViews)} · ER: ${activeReport.videoSampleStats.avgEngagementRatePct}%`,
      `• Điểm khớp Brief: ${ev.totalScore}/100 điểm (${ev.fitVerdictLabel})`,
      `• Phong cách kênh: ${activeReport.contentPersonaProfile.dominantContentStyle}`,
      `• Nhận xét giọng văn KOC: ${activeReport.contentPersonaProfile.spokenToneSummary}`,
      ``,
      `[ĐỊNH HƯỚNG GÓC QUAY & KỊCH BẢN RIÊNG CHO @${activeReport.handle}]:`,
      `• Góc tiếp cận: ${ev.recommendedAngleForKoc}`,
      `• Câu mở đầu 3s (Hook): ${ev.tailoredHook3sForKoc}`,
      ...ev.tailored4StepScript.map(
        (s) => `  ${s.stepIndex}. [${s.timeRange}] ${s.title}: ${s.content}`
      ),
    ].join('\n');
  }, [activeReport]);

  return (
    <Modal
      open={isModalOpen}
      onClose={onClose}
      title="Phân tích Sâu Kênh KOC & Chấm điểm Khớp Brief Brand (Chạy ngầm)"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Thu nhỏ / Chạy ngầm tiếp
          </Button>
          {activeReport && (
            <Button
              variant="secondary"
              icon={copiedKey === 'brief' ? Check : Copy}
              onClick={() => handleCopy('brief', copyBriefForKocText)}
            >
              {copiedKey === 'brief'
                ? 'Đã chép Hồ sơ & Kịch bản'
                : 'Chép Hồ sơ & Kịch bản KOC'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Khung thiết lập Kênh KOC & Tiêu chí Brief Brand */}
        <div className="p-3.5 rounded-xl border border-line bg-surface space-y-3">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-2.5 items-start">
            <Textarea
              id="koc-brief-handles-input"
              aria-label="Danh sách kênh KOC"
              rows={2}
              value={handlesInput}
              onChange={(e) => {
                setHandlesInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Nhập 1 hoặc nhiều @handle / link kênh TikTok KOC cần phân tích sâu (VD: @callmeduy, @ciaobeny, @goccuaru)..."
              className="font-code text-xs"
            />
            <Button
              variant="primary"
              icon={isSubmitting ? RefreshCw : Play}
              disabled={isSubmitting}
              onClick={handleStartBackgroundJob}
            >
              {isSubmitting
                ? 'Đang đưa vào hàng đợi...'
                : `Chạy phân tích ngầm (${videoScanLimit} video/kênh)`}
            </Button>
          </div>

          <div className="pt-2.5 border-t border-line grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span>Thương hiệu (Brand Brief)</span>
              <input
                type="text"
                list="b2c-brand-brief-list"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="VD: Cocoon, La Roche-Posay..."
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
              />
              <datalist id="b2c-brand-brief-list">
                {REAL_B2C_42_BRANDS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.category}
                  </option>
                ))}
              </datalist>
            </label>

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span>Sản phẩm cần đẩy (SKU)</span>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="VD: Nước tẩy trang Bí Đao"
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
              />
            </label>

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span>Từ khóa USP bắt buộc trong Brief</span>
              <input
                type="text"
                value={requiredUspInput}
                onChange={(e) => setRequiredUspInput(e.target.value)}
                placeholder="VD: kiềm dầu, không cồn, da mụn"
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
              />
            </label>

            <label className="grid gap-1 text-2xs font-medium text-ink-2">
              <span>Phong cách video mong muốn</span>
              <input
                type="text"
                value={preferredStyle}
                onChange={(e) => setPreferredStyle(e.target.value)}
                placeholder="VD: Test cam thường / Phân tích thành phần"
                className="h-8 px-2.5 rounded-md border border-line bg-surface-2 text-xs text-ink"
              />
            </label>

            <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2">
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Trần Cast/bài (đ)</span>
                <input
                  type="number"
                  step={500000}
                  value={maxBudgetInput}
                  onChange={(e) => setMaxBudgetInput(e.target.value)}
                  className="h-8 px-2 rounded-md border border-line bg-surface-2 text-xs text-ink font-code tabular-nums"
                />
              </label>
              <label className="grid gap-1 text-2xs font-medium text-ink-2">
                <span>Số video/kênh</span>
                <select
                  value={videoScanLimit}
                  onChange={(e) => setVideoScanLimit(Number(e.target.value))}
                  className="h-8 px-2 rounded-md border border-line bg-surface-2 text-xs text-ink font-code"
                >
                  <option value={25}>25 video</option>
                  <option value={40}>40 video</option>
                  <option value={60}>60 video</option>
                  <option value={80}>80 video</option>
                </select>
              </label>
            </div>
          </div>

          {errorMessage && (
            <p className="text-2xs text-critical">{errorMessage}</p>
          )}
        </div>

        {/* Hàng đợi các tiến trình phân tích chạy ngầm */}
        {jobs.length > 0 && (
          <div className="rounded-xl border border-line bg-surface-2 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink">
                  Tiến trình Phân tích Chạy ngầm ({jobs.length} phiên)
                </span>
                {hasRunningJobs && (
                  <Status tone="info">
                    Đang quét ngầm — Bạn có thể đóng cửa sổ này để làm việc khác
                  </Status>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={RefreshCw}
                onClick={() => void fetchAllJobs()}
              >
                Làm mới trạng thái
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {jobs.map((j) => {
                const isSelected = activeJob?.jobId === j.jobId;
                return (
                  <button
                    key={j.jobId}
                    type="button"
                    onClick={() => {
                      setSelectedJobId(j.jobId);
                      if (j.results[0]) setSelectedHandle(j.results[0].handle);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-left transition flex items-center gap-2 text-xs ${
                      isSelected
                        ? 'border-accent bg-accent-soft/40 text-ink font-semibold'
                        : 'border-line bg-surface text-ink-2 hover:text-ink'
                    }`}
                  >
                    <span className="font-code text-2xs">{j.jobId}</span>
                    <span>· {j.briefCriteria.brandName}</span>
                    <span className="text-2xs text-ink-3">
                      ({j.completedHandlesCount}/{j.handles.length} kênh ·{' '}
                      {j.totalVideosScannedSoFar} video)
                    </span>
                    <Status
                      tone={
                        j.status === 'COMPLETED'
                          ? 'positive'
                          : j.status === 'FAILED'
                          ? 'critical'
                          : 'info'
                      }
                    >
                      {j.status === 'COMPLETED'
                        ? 'Hoàn tất'
                        : j.status === 'FAILED'
                        ? 'Lỗi'
                        : `${j.progressPct}%`}
                    </Status>
                  </button>
                );
              })}
            </div>

            {activeJob &&
              (activeJob.status === 'QUEUED' ||
                activeJob.status === 'RUNNING') && (
                <div className="p-2.5 rounded-lg border border-accent/30 bg-surface space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                      {activeJob.currentStepLabel}
                    </span>
                    <span className="font-code text-2xs text-accent font-semibold">
                      {activeJob.progressPct}% · Đã quét{' '}
                      {activeJob.totalVideosScannedSoFar} video
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${activeJob.progressPct}%` }}
                    />
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Chọn kênh KOC trong phiên phân tích */}
        {activeJob && activeJob.results.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeJob.results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedHandle(r.handle)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-2 ${
                  activeReport?.handle === r.handle
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface text-ink-2 border-line hover:text-ink'
                }`}
              >
                <span>
                  #{i + 1} @{r.handle}
                </span>
                <span className="font-code text-2xs px-1.5 py-0.5 rounded bg-black/15">
                  {r.briefMatchEvaluation.totalScore}/100đ
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Chi tiết Báo cáo Phân tích Kênh & Chấm điểm Khớp Brief */}
        {activeReport && (
          <div className="space-y-3.5">
            {/* Tổng quan Kênh & Điểm Khớp Brief */}
            <div className="rounded-xl border border-line bg-surface p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {activeReport.nickname}
                    </span>
                    <a
                      href={activeReport.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-code text-accent hover:underline inline-flex items-center gap-1"
                    >
                      @{activeReport.handle}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Status tone="neutral">{activeReport.tierLabel}</Status>
                    <Status
                      tone={
                        activeReport.briefMatchEvaluation.fitVerdict ===
                        'RẤT_KHỚP'
                          ? 'positive'
                          : activeReport.briefMatchEvaluation.fitVerdict ===
                            'KHÁ_KHỚP'
                          ? 'info'
                          : activeReport.briefMatchEvaluation.fitVerdict ===
                            'CẦN_CÂN_NHẮC'
                          ? 'warning'
                          : 'critical'
                      }
                    >
                      {activeReport.briefMatchEvaluation.fitVerdictLabel}
                    </Status>
                  </div>
                  <p className="text-xs text-ink-2 line-clamp-1">
                    {activeReport.bio || 'Không có mô tả tiểu sử'}
                  </p>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-accent/30 bg-accent-soft/30">
                  <div className="text-right">
                    <span className="block text-2xs text-ink-3 font-medium">
                      Điểm khớp Brief {activeReport.briefMatchEvaluation.brandName}
                    </span>
                    <span className="text-lg font-semibold text-accent tabular-nums">
                      {activeReport.briefMatchEvaluation.totalScore}
                      <span className="text-xs font-normal text-ink-3">
                        /100 điểm
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 Chỉ số Sức khỏe Kênh trên Tập Video Quét Mở Rộng */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    Số video đã quét
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {activeReport.videoSampleStats.scannedVideosCount} bài
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    Tổng kênh: {formatNumber(activeReport.totalChannelVideos)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    View trung vị (Median)
                  </span>
                  <span className="text-sm font-semibold text-accent tabular-nums">
                    {formatNumber(activeReport.videoSampleStats.medianViews)}
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    TB: {formatNumber(activeReport.videoSampleStats.avgViews)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    Độ ổn định phong độ
                  </span>
                  <span className="text-sm font-semibold text-positive tabular-nums">
                    {activeReport.videoSampleStats.viewConsistencyRatioPct}%
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    {formatNumber(activeReport.videoSampleStats.minViews)} –{' '}
                    {formatNumber(activeReport.videoSampleStats.maxViews)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    Tương tác & Đăng bài
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    ER {activeReport.videoSampleStats.avgEngagementRatePct}%
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    {activeReport.videoSampleStats.postingFrequencyPerWeek}{' '}
                    video/tuần
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    Tỷ lệ khách hỏi mua
                  </span>
                  <span className="text-sm font-semibold text-positive tabular-nums">
                    {activeReport.audienceCommentProfile.buyingIntentRatePct}%
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    Gắn giỏ:{' '}
                    {activeReport.videoSampleStats.affiliateCartRatioPct}% số bài
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-line bg-surface-2">
                  <span className="text-2xs text-ink-3 block">
                    Định mức Cast dự kiến
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatVndShort(activeReport.estimatedRateCardVnd)}
                  </span>
                  <span className="text-2xs text-ink-3 block">
                    Đã hợp tác UpBase:{' '}
                    {activeReport.historicalUpbaseDealsCount} đơn
                  </span>
                </div>
              </div>

              {/* 5 Trục Chấm điểm Đối chiếu Brief */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {activeReport.briefMatchEvaluation.axisScores.map((ax) => (
                  <div
                    key={ax.axisKey}
                    className="p-2.5 rounded-lg border border-line bg-surface-2/60 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-2xs font-semibold text-ink">
                        {ax.axisLabel}
                      </span>
                      <Status
                        tone={
                          ax.status === 'TỐT'
                            ? 'positive'
                            : ax.status === 'KHÁ'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {ax.score}/{ax.maxScore}đ
                      </Status>
                    </div>
                    <p className="text-2xs text-ink-2 leading-snug">
                      {ax.evidenceNote}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Phân tích Văn phong KOC, Tệp Người Xem & Cảnh báo Rủi ro */}
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-line bg-surface space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink">
                    Ngách Nội dung, Văn phong KOC & Sản phẩm từng gắn giỏ
                  </span>
                  <Status tone="info">
                    {activeReport.contentPersonaProfile.dominantHookPatterns[0]}
                  </Status>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-2xs text-ink-3 font-semibold block">
                      Phong cách chủ đạo:
                    </span>
                    <span className="text-ink font-medium">
                      {activeReport.contentPersonaProfile.dominantContentStyle}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-ink-3 font-semibold block">
                      Nhận xét giọng văn & cách dẫn chuyện:
                    </span>
                    <p className="text-ink-2 leading-relaxed">
                      {activeReport.contentPersonaProfile.spokenToneSummary}
                    </p>
                  </div>
                  {activeReport.contentPersonaProfile.topPromotedProducts
                    .length > 0 && (
                    <div>
                      <span className="text-2xs text-ink-3 font-semibold block mb-1">
                        Sản phẩm đã gắn giỏ TikTok Shop trên kênh:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {activeReport.contentPersonaProfile.topPromotedProducts.map(
                          (prod, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-surface-2 border border-line text-2xs text-ink"
                            >
                              {prod}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-surface space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink">
                    Tệp Người xem qua Bình luận & Lưu ý Xung đột Đối thủ
                  </span>
                  <Status tone="positive">
                    {activeReport.audienceCommentProfile.buyingIntentCount}/
                    {activeReport.audienceCommentProfile.totalCommentsSampled}{' '}
                    bình luận hỏi mua
                  </Status>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-2xs text-ink-3 font-semibold block">
                      Chân dung người xem thực tế dưới bình luận:
                    </span>
                    <ul className="list-disc list-inside text-ink-2 space-y-0.5">
                      {activeReport.audienceCommentProfile.detectedViewerPersonas.map(
                        (p, i) => (
                          <li key={i}>{p}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div>
                    <span className="text-2xs text-ink-3 font-semibold block">
                      Lưu ý rủi ro & Xung đột nhãn hàng:
                    </span>
                    {activeReport.briefMatchEvaluation.riskWarnings.map(
                      (w, i) => (
                        <p
                          key={i}
                          className="text-2xs text-ink-2 flex items-start gap-1.5 mt-0.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Đề xuất Kịch bản 4 bước & Câu mở đầu 3s đo ni đóng giày cho KOC */}
            <div className="p-3.5 rounded-xl border border-accent/30 bg-surface space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-ink">
                    Định hướng Góc quay & Kịch bản 4 bước đo ni đóng giày cho @
                    {activeReport.handle}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copiedKey === 'hook' ? Check : Copy}
                  onClick={() =>
                    handleCopy(
                      'hook',
                      activeReport.briefMatchEvaluation.tailoredHook3sForKoc
                    )
                  }
                >
                  {copiedKey === 'hook' ? 'Đã chép Hook 3s' : 'Chép Hook 3s'}
                </Button>
              </div>

              <div className="p-2.5 rounded-lg border border-accent/25 bg-accent-soft/30 space-y-1">
                <span className="text-2xs font-semibold uppercase tracking-wider text-accent block">
                  Góc tiếp cận đề xuất & Câu mở đầu 3 giây đầu (Hook)
                </span>
                <p className="text-xs text-ink-2">
                  {activeReport.briefMatchEvaluation.recommendedAngleForKoc}
                </p>
                <p className="text-xs font-semibold text-ink pt-1">
                  Hook 3s gợi ý:{' '}
                  {activeReport.briefMatchEvaluation.tailoredHook3sForKoc}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {activeReport.briefMatchEvaluation.tailored4StepScript.map(
                  (step) => (
                    <div
                      key={step.stepIndex}
                      className="p-2.5 rounded-lg border border-line bg-surface-2/60 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-ink">
                          Bước {step.stepIndex}: {step.title}
                        </span>
                        <span className="font-code text-2xs text-ink-3">
                          {step.timeRange}
                        </span>
                      </div>
                      <p className="text-2xs text-ink-2 leading-relaxed">
                        {step.content}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Danh sách toàn bộ các video đã quét trên kênh KOC */}
            <div className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Danh sách {activeReport.analyzedVideos.length} video thực tế
                  đã quét trên kênh @{activeReport.handle}
                </span>
                <span className="text-2xs text-ink-3">
                  Bóc tách kèm Câu mở đầu 3s (Hook) & Thẻ giỏ hàng
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-line">
                {activeReport.analyzedVideos.map((v, idx) => (
                  <div
                    key={v.videoId}
                    className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-surface-2/60"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-code text-2xs text-ink-3">
                          #{idx + 1} · {v.publishedAt}
                        </span>
                        <Status tone="neutral">{v.hookPatternLabel}</Status>
                        {v.hasCartAnchor && (
                          <Status tone="positive">
                            Giỏ hàng: {v.cartAnchorTitle || 'TikTok Shop'}
                          </Status>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-ink truncate">
                        Hook 3s: &ldquo;{v.hook3sText}&rdquo;
                      </div>
                      <a
                        href={v.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs text-ink-2 hover:text-accent truncate inline-flex items-center gap-1 max-w-full"
                      >
                        <span className="truncate">{v.caption}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="font-semibold text-ink">
                        {formatNumber(v.views)} view · ER {v.engagementRate}%
                      </div>
                      <div className="text-2xs text-ink-3">
                        {formatNumber(v.likes)} tim · {formatNumber(v.comments)}{' '}
                        bình luận
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
