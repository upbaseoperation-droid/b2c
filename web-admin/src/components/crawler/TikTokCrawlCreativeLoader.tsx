'use client';

import React, { useEffect, useState } from 'react';
import {
  Check,
  Flame,
  Hash,
  MessageSquare,
  Phone,
  Radio,
  Search,
  Square,
  Users,
  Video,
} from 'lucide-react';
import { Button, Status } from '../ui';

export interface CrawlBatchProgressInfo {
  currentBatch: number;
  totalBatches: number;
  collectedCount: number;
  targetCount: number;
}

interface TikTokCrawlCreativeLoaderProps {
  mode: 'COMPETITOR' | 'HASHTAG' | 'TRENDING' | 'COMMENTS';
  queryLabel: string;
  targetCount: number;
  batchProgress?: CrawlBatchProgressInfo | null;
  collectedSoFar?: number;
  compact?: boolean;
  onStop?: () => void;
}

const PIPELINE_STEPS: Record<
  TikTokCrawlCreativeLoaderProps['mode'],
  Array<{ title: string; detail: string }>
> = {
  COMPETITOR: [
    {
      title: 'Khởi tạo phiên & Xác thực kênh đối thủ',
      detail: 'Kết nối luồng dữ liệu công khai TikTok và kiểm tra hồ sơ thương hiệu',
    },
    {
      title: 'Quét video gắn thẻ & Giỏ hàng đối thủ',
      detail: 'Phát hiện các kênh KOC đăng video review hoặc gắn link sản phẩm',
    },
    {
      title: 'Trích xuất chỉ số kênh & Thông tin liên hệ',
      detail: 'Đọc số lượng Follower, lượt xem video, tỷ lệ tương tác ER% và SĐT/Email',
    },
    {
      title: 'Đối chiếu Danh bạ KOC & Chuẩn hóa bảng',
      detail: 'Kiểm tra lịch sử hợp tác tại UpBase và sắp xếp theo hiệu quả',
    },
  ],
  HASHTAG: [
    {
      title: 'Khởi tạo truy vấn từ khóa & #Hashtag',
      detail: 'Thiết lập bộ lọc tìm kiếm video thịnh hành tại thị trường Việt Nam',
    },
    {
      title: 'Thu thập luồng video gắn Hashtag mục tiêu',
      detail: 'Lọc các nhà sáng tạo nội dung có video đạt tương tác thực tế',
    },
    {
      title: 'Tính toán tỷ lệ bứt phá (View/Flw) & ER%',
      detail: 'Đo lường quy mô Follower, lượt xem, lượt tim và bóc tách SĐT tiểu sử',
    },
    {
      title: 'Đối chiếu Danh bạ KOC & Chuẩn hóa bảng',
      detail: 'Phân loại KOC Mới và KOC đã có trong hệ thống UpBase',
    },
  ],
  TRENDING: [
    {
      title: 'Kết nối danh mục ngành hàng B2C trên TikTok',
      detail: 'Khởi tạo bộ từ khóa ngành hàng và tiêu chí lọc nhà sáng tạo',
    },
    {
      title: 'Quét các kênh KOC có video đang lên xu hướng',
      detail: 'Thu thập danh sách kênh có tốc độ tăng trưởng lượt xem nổi bật',
    },
    {
      title: 'Trích xuất quy mô kênh, ER% & Liên hệ',
      detail: 'Tổng hợp Follower, tổng lượt thích, video tiêu biểu và SĐT/Email',
    },
    {
      title: 'Đối chiếu Danh bạ KOC & Hoàn thiện danh sách',
      detail: 'Đánh dấu các kênh đã hợp tác và sẵn sàng lưu vào Danh bạ gốc',
    },
  ],
  COMMENTS: [
    {
      title: 'Kết nối video TikTok & Kiểm tra thông số gốc',
      detail: 'Đọc tổng lượt xem, lượt thích và số lượng bình luận trên video',
    },
    {
      title: 'Tải luồng bình luận thực tế theo từng đợt',
      detail: 'Thu thập nội dung bình luận, thời gian đăng và lượt thích',
    },
    {
      title: 'Phân loại nhóm nhu cầu & Tách SĐT khách hàng',
      detail: 'Nhận diện bình luận hỏi mua, phản hồi sản phẩm và số điện thoại',
    },
    {
      title: 'Tổng hợp tỷ lệ chuyển đổi & Hiển thị bảng',
      detail: 'Sắp xếp ưu tiên các bình luận có nhu cầu mua hàng cao nhất',
    },
  ],
};

const RADAR_SIGNAL_BLIPS = [
  { top: '20%', left: '26%', label: '@koc.beauty', metric: '142K flw', delay: '0s' },
  { top: '28%', left: '74%', label: 'ER 6.8%', metric: '280K view', delay: '0.6s' },
  { top: '68%', left: '22%', label: 'SĐT: 098***', metric: 'Micro KOC', delay: '1.2s' },
  { top: '72%', left: '70%', label: '@review.skincare', metric: 'View/Flw 3.2x', delay: '1.8s' },
];

export const TikTokCrawlCreativeLoader: React.FC<TikTokCrawlCreativeLoaderProps> = ({
  mode,
  queryLabel,
  targetCount,
  batchProgress,
  collectedSoFar = 0,
  compact = false,
  onStop,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentCollected = batchProgress?.collectedCount ?? collectedSoFar;
  const effectiveTarget = Math.max(1, batchProgress?.targetCount ?? targetCount);
  const rawPct = Math.round((currentCollected / effectiveTarget) * 100);
  const timeSimulatedPct = Math.min(88, Math.round(12 + elapsedSec * 5.5));
  const progressPct =
    currentCollected > 0 ? Math.min(96, Math.max(15, rawPct)) : timeSimulatedPct;

  const activeStepIndex =
    currentCollected > 0
      ? currentCollected >= effectiveTarget * 0.7
        ? 3
        : 2
      : elapsedSec < 2
        ? 0
        : elapsedSec < 5
          ? 1
          : 2;

  const steps = PIPELINE_STEPS[mode];
  const unitText = mode === 'COMMENTS' ? 'bình luận' : 'KOC';
  const ModeIcon =
    mode === 'COMPETITOR'
      ? Search
      : mode === 'HASHTAG'
        ? Hash
        : mode === 'TRENDING'
          ? Flame
          : MessageSquare;

  // Chế độ thu gọn: Hiển thị ngay trên đầu bảng khi đã có dữ liệu đợt 1 và đang nạp tiếp các đợt sau
  if (compact) {
    return (
      <div className="px-4 py-2.5 border-b border-accent/25 bg-accent-soft/35 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-8 h-8 rounded-full bg-surface border border-accent/40 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-40" />
            <Radio className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink">
                Đang thu thập tiếp dữ liệu TikTok: {queryLabel}
              </span>
              <Status tone="info">
                {batchProgress
                  ? `Đợt ${batchProgress.currentBatch}/${batchProgress.totalBatches}`
                  : 'Đang đồng bộ'}
              </Status>
              <span className="text-2xs font-code font-semibold text-accent tabular-nums">
                Đã lấy {currentCollected}/{effectiveTarget} {unitText} ({progressPct}%)
              </span>
              <span className="text-2xs font-code text-ink-3 tabular-nums">· {elapsedSec}s</span>
            </div>
            <div className="mt-1.5 w-full max-w-md h-1.5 rounded-full bg-surface border border-line overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {onStop && (
          <Button size="sm" variant="secondary" icon={Square} onClick={onStop}>
            Dừng quét ({currentCollected} {unitText})
          </Button>
        )}
      </div>
    );
  }

  // Chế độ đầy đủ: Hiển thị Radar quét trực quan + 4 bước tiến trình + Khung xương 5 cột đồng nhất
  return (
    <div className="p-5 bg-surface space-y-5">
      <div className="rounded-xl border border-line bg-gradient-to-br from-surface via-surface to-accent-soft/20 p-5 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Cột trái: Radar Quét Tín Hiệu KOC TikTok */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-52 h-52 flex items-center justify-center select-none">
              {/* Vòng tròn đồng tâm của Radar */}
              <div className="absolute inset-0 rounded-full border border-accent/20 bg-accent-soft/10" />
              <div className="absolute inset-5 rounded-full border border-dashed border-accent/25" />
              <div className="absolute inset-11 rounded-full border border-accent/30" />
              <div className="absolute inset-[70px] rounded-full border border-accent/40 bg-accent-soft/20" />

              {/* Trục tọa độ Radar */}
              <div className="absolute inset-x-3 top-1/2 h-px bg-accent/15 -translate-y-1/2" />
              <div className="absolute inset-y-3 left-1/2 w-px bg-accent/15 -translate-x-1/2" />

              {/* Chùm tia quét xoay 360 độ */}
              <div
                className="absolute inset-1 rounded-full animate-spin"
                style={{
                  animationDuration: '3.2s',
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(37, 99, 235, 0.22) 345deg, rgba(37, 99, 235, 0.45) 360deg)',
                }}
              />

              {/* Các điểm tín hiệu KOC nhấp nháy trên mặt Radar */}
              {RADAR_SIGNAL_BLIPS.map((blip, idx) => (
                <div
                  key={idx}
                  className="absolute flex items-center gap-1 pointer-events-none"
                  style={{
                    top: blip.top,
                    left: blip.left,
                    animationDelay: blip.delay,
                  }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"
                      style={{ animationDuration: '2.2s', animationDelay: blip.delay }}
                    />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent border border-white" />
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface/95 border border-line shadow-2xs text-[10px] font-code font-medium text-ink whitespace-nowrap">
                    {blip.label}
                  </span>
                </div>
              ))}

              {/* Tâm Radar hiển thị phần trăm & icon chế độ */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-surface border-2 border-accent shadow-sm flex flex-col items-center justify-center text-center">
                <ModeIcon className="w-4 h-4 text-accent mb-0.5 animate-bounce" />
                <span className="text-sm font-bold font-code text-ink tabular-nums leading-none">
                  {progressPct}%
                </span>
                <span className="text-[10px] font-code text-ink-3 tabular-nums mt-0.5">
                  {elapsedSec}s
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center">
              <Status tone="info">
                {batchProgress
                  ? `Đang quét đợt ${batchProgress.currentBatch}/${batchProgress.totalBatches}`
                  : 'Đang kết nối luồng TikTok'}
              </Status>
              <span className="text-xs font-semibold text-ink font-code tabular-nums">
                {currentCollected} / {effectiveTarget} {unitText}
              </span>
            </div>
          </div>

          {/* Cột phải: Thông tin phiên quét + Thanh tiến độ + 4 bước xử lý */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Radio className="w-4 h-4 text-accent animate-pulse" />
                    <span>Đang thu thập dữ liệu thực tế từ TikTok</span>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-2">
                  <span>Mục tiêu quét:</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line font-code font-semibold text-ink">
                    {queryLabel}
                  </span>
                  <span>·</span>
                  <span>
                    Số lượng yêu cầu: <strong className="text-ink">{effectiveTarget} {unitText}</strong>
                  </span>
                </div>
              </div>

              {onStop && (
                <Button size="sm" variant="secondary" icon={Square} onClick={onStop}>
                  Dừng quét
                </Button>
              )}
            </div>

            {/* Thanh tiến độ tổng thể */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-2xs font-medium">
                <span className="text-ink-2">
                  Tiến độ thu thập &amp; kiểm chứng hồ sơ kênh
                </span>
                <span className="font-code font-semibold text-accent tabular-nums">
                  {currentCollected}/{effectiveTarget} {unitText} ({progressPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent via-accent to-positive transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* 4 bước xử lý trực tiếp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {steps.map((step, index) => {
                const isDone = index < activeStepIndex;
                const isCurrent = index === activeStepIndex;
                return (
                  <div
                    key={index}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'border-accent bg-accent-soft/30 shadow-2xs'
                        : isDone
                          ? 'border-positive/30 bg-positive-soft/20'
                          : 'border-line bg-surface-2/40 opacity-65'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-positive text-white'
                            : isCurrent
                              ? 'bg-accent text-white animate-pulse'
                              : 'bg-surface border border-line text-ink-3'
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3 stroke-[2.5]" /> : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-ink leading-snug">
                          {step.title}
                        </div>
                        <div className="text-[11px] text-ink-3 leading-normal mt-0.5 line-clamp-2">
                          {step.detail}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Khung mô phỏng trước bảng kết quả 5 cột đồng nhất đang nạp dữ liệu */}
      {mode !== 'COMMENTS' && (
        <div className="rounded-xl border border-line overflow-hidden bg-surface">
          <div className="px-3.5 py-2 border-b border-line bg-surface-2/60 flex items-center justify-between text-2xs font-semibold text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>Đang chuẩn bị bảng kết quả KOC (5 cột đồng nhất)...</span>
            </span>
            <span className="font-code text-ink-3">
              Kênh KOC &amp; Liên hệ · Quy mô kênh · Phân loại · Video tiêu biểu · Thao tác
            </span>
          </div>
          <div className="divide-y divide-line">
            {[0, 1, 2].map((rowIdx) => (
              <div
                key={rowIdx}
                className="px-3.5 py-3 grid grid-cols-12 gap-3 items-center animate-pulse"
                style={{ animationDelay: `${rowIdx * 180}ms` }}
              >
                {/* Cột 1: Kênh KOC & Liên hệ */}
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-surface-2 border border-line shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3.5 w-24 rounded bg-surface-2" />
                      <div className="h-4 w-16 rounded-full bg-accent-soft/60" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-20 rounded bg-surface-2" />
                      <Phone className="w-2.5 h-2.5 text-ink-3/40" />
                    </div>
                  </div>
                </div>

                {/* Cột 2: Quy mô kênh */}
                <div className="col-span-2 space-y-1.5 text-right">
                  <div className="h-3.5 w-20 rounded bg-surface-2 ml-auto" />
                  <div className="h-2.5 w-24 rounded bg-surface-2 ml-auto" />
                </div>

                {/* Cột 3: Phân loại & Ngữ cảnh */}
                <div className="col-span-2 space-y-1.5">
                  <div className="h-4 w-24 rounded-full bg-surface-2" />
                  <div className="h-2.5 w-28 rounded bg-surface-2" />
                </div>

                {/* Cột 4: Video tiêu biểu */}
                <div className="col-span-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-accent/40 shrink-0" />
                    <div className="h-3 w-full rounded bg-surface-2" />
                  </div>
                  <div className="h-2.5 w-36 rounded bg-surface-2" />
                </div>

                {/* Cột 5: Thao tác */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <div className="h-7 w-16 rounded-md bg-surface-2" />
                  <div className="h-7 w-20 rounded-md bg-accent/20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
