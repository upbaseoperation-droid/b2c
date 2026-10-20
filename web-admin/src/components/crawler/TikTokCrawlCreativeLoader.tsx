'use client';

import React, { useEffect, useState } from 'react';
import {
  Flame,
  Hash,
  MessageSquare,
  Search,
  Square,
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

const MODE_CONFIG = {
  COMPETITOR: {
    icon: Search,
    title: 'Đang phân tích kênh đối thủ',
    unit: 'KOC',
    stages: [
      'Kết nối dữ liệu kênh TikTok đối thủ...',
      'Trích xuất danh sách video gần nhất...',
      'Tổng hợp chỉ số tương tác & lọc thông tin...',
    ],
  },
  HASHTAG: {
    icon: Hash,
    title: 'Đang quét KOC theo hashtag',
    unit: 'KOC',
    stages: [
      'Tìm kiếm video có gắn hashtag...',
      'Đọc danh sách tác giả & lượng tương tác...',
      'Lọc thông tin liên hệ & kênh KOC...',
    ],
  },
  TRENDING: {
    icon: Flame,
    title: 'Đang cập nhật xu hướng thịnh hành',
    unit: 'KOC',
    stages: [
      'Đồng bộ bảng xếp hạng nhà sáng tạo...',
      'Phân loại theo ngành hàng & chỉ số tăng trưởng...',
      'Chuẩn hóa danh sách đề xuất...',
    ],
  },
  COMMENTS: {
    icon: MessageSquare,
    title: 'Đang thu thập bình luận video',
    unit: 'bình luận',
    stages: [
      'Kết nối liên kết video TikTok...',
      'Tải luồng bình luận & phản hồi...',
      'Phân tích nội dung & mức độ quan tâm...',
    ],
  },
};

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

  const config = MODE_CONFIG[mode] || MODE_CONFIG.HASHTAG;
  const ModeIcon = config.icon;
  const unitText = config.unit;

  const currentCollected = batchProgress?.collectedCount ?? collectedSoFar;
  const effectiveTarget = Math.max(1, batchProgress?.targetCount ?? targetCount);
  const rawPct = Math.round((currentCollected / effectiveTarget) * 100);
  const timeSimulatedPct = Math.min(88, Math.round(12 + elapsedSec * 4.5));
  const progressPct =
    currentCollected > 0 ? Math.min(98, Math.max(10, rawPct)) : timeSimulatedPct;

  // Determine stage based on batch progress or elapsed time
  let currentStageText = '';
  if (batchProgress && batchProgress.totalBatches > 1) {
    currentStageText = `Đang xử lý đợt ${batchProgress.currentBatch}/${batchProgress.totalBatches} (${currentCollected}/${effectiveTarget} ${unitText})`;
  } else {
    const stageIndex = Math.min(
      config.stages.length - 1,
      Math.floor(elapsedSec / 3)
    );
    currentStageText = config.stages[stageIndex];
  }

  // Compact inline bar when results already exist
  if (compact) {
    return (
      <div className="px-4 py-2.5 border-b border-accent/20 bg-accent-soft/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-7 h-7 rounded-lg bg-surface border border-accent/30 flex items-center justify-center shrink-0">
            <span className="absolute inset-0 rounded-lg border border-accent/30 animate-ping opacity-35" />
            <ModeIcon className="w-3.5 h-3.5 text-accent animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-ink truncate max-w-[200px]">
              {queryLabel}
            </span>
            <Status tone="info">
              {batchProgress
                ? `Đợt ${batchProgress.currentBatch}/${batchProgress.totalBatches}`
                : 'Đang tải thêm'}
            </Status>
            <span className="text-2xs font-code font-semibold text-accent tabular-nums">
              {currentCollected}/{effectiveTarget} {unitText} ({progressPct}%)
            </span>
            <span className="text-2xs font-code text-ink-3 tabular-nums">
              · {elapsedSec}s
            </span>
          </div>
        </div>

        {onStop && (
          <Button size="sm" variant="secondary" icon={Square} onClick={onStop}>
            Dừng ({currentCollected})
          </Button>
        )}
      </div>
    );
  }

  // Full in-place scanning state (NO full-screen modal, NO murky gray veil)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPct) / 100;

  return (
    <div className="py-10 px-4 md:py-14 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
      <div className="w-full max-w-md mx-auto rounded-xl border border-line bg-surface p-6 shadow-xs flex flex-col items-center">
        {/* Crisp circular progress with central icon and percentage */}
        <div className="relative w-32 h-32 flex items-center justify-center select-none my-2">
          {/* Subtle outer breathing ring */}
          <div className="absolute inset-0 rounded-full border border-accent/15 bg-accent-soft/20 animate-pulse" />

          {/* SVG Progress Circle */}
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              className="text-line"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              className="text-accent"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 400ms ease-out',
              }}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute flex flex-col items-center justify-center">
            <ModeIcon className="w-5 h-5 text-accent mb-0.5" />
            <span className="text-base font-bold font-code text-ink tabular-nums leading-tight">
              {progressPct}%
            </span>
            <span className="text-[10px] font-code text-ink-3 tabular-nums">
              {elapsedSec}s
            </span>
          </div>
        </div>

        {/* Heading & Target Query */}
        <div className="mt-3 space-y-1">
          <div className="text-sm font-semibold text-ink">
            {config.title}
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sunken border border-line text-xs font-code font-medium text-ink max-w-[280px] truncate">
            {queryLabel}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 p-2.5 rounded-lg bg-canvas border border-line text-left">
          <div className="px-1.5">
            <div className="text-[10px] text-ink-3">Đã thu thập</div>
            <div className="text-xs font-bold font-code text-ink tabular-nums mt-0.5 truncate">
              {currentCollected}/{effectiveTarget}
            </div>
          </div>
          <div className="px-1.5 border-l border-line">
            <div className="text-[10px] text-ink-3">Đợt quét</div>
            <div className="text-xs font-bold font-code text-ink tabular-nums mt-0.5 truncate">
              {batchProgress
                ? `${batchProgress.currentBatch}/${batchProgress.totalBatches}`
                : '1/1'}
            </div>
          </div>
          <div className="px-1.5 border-l border-line">
            <div className="text-[10px] text-ink-3">Thời gian</div>
            <div className="text-xs font-bold font-code text-ink tabular-nums mt-0.5 truncate">
              {elapsedSec}s
            </div>
          </div>
        </div>

        {/* Progress Bar & Stage Status */}
        <div className="w-full mt-4 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-sunken border border-line overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-2xs text-ink-3 font-medium truncate">
            {currentStageText}
          </div>
        </div>

        {/* Stop Button */}
        {onStop && (
          <div className="mt-5 w-full">
            <Button
              size="sm"
              variant="secondary"
              icon={Square}
              onClick={onStop}
              className="w-full justify-center"
            >
              Dừng quét ({currentCollected}/{effectiveTarget})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
