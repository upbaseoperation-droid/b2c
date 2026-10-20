'use client';

import React, { useEffect, useState } from 'react';
import {
  Flame,
  Hash,
  MessageSquare,
  Radio,
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

const RADAR_SIGNAL_BLIPS = [
  { top: '18%', left: '22%', label: '@koc.beauty', delay: '0s' },
  { top: '26%', left: '72%', label: 'ER 6.8%', delay: '0.6s' },
  { top: '70%', left: '18%', label: '098***', delay: '1.2s' },
  { top: '74%', left: '68%', label: '@review', delay: '1.8s' },
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

  const unitText = mode === 'COMMENTS' ? 'bình luận' : 'KOC';
  const ModeIcon =
    mode === 'COMPETITOR'
      ? Search
      : mode === 'HASHTAG'
        ? Hash
        : mode === 'TRENDING'
          ? Flame
          : MessageSquare;

  if (compact) {
    return (
      <div className="px-4 py-2 border-b border-accent/25 bg-accent-soft/35 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-7 h-7 rounded-full bg-surface border border-accent/40 flex items-center justify-center shrink-0">
            <span className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-40" />
            <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-ink truncate max-w-[220px]">
              {queryLabel}
            </span>
            <Status tone="info">
              {batchProgress
                ? `Đợt ${batchProgress.currentBatch}/${batchProgress.totalBatches}`
                : 'Đang quét'}
            </Status>
            <span className="text-2xs font-code font-semibold text-accent tabular-nums">
              {currentCollected}/{effectiveTarget} {unitText} ({progressPct}%)
            </span>
            <span className="text-2xs font-code text-ink-3 tabular-nums">· {elapsedSec}s</span>
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

  return (
    <>
      <div className="py-16 text-center text-xs text-ink-3">
        Đang quét dữ liệu TikTok...
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-[2px] p-4">
        <div className="w-full max-w-[300px] rounded-2xl bg-surface border border-line shadow-xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
          {/* Radar Animation */}
          <div className="relative w-48 h-48 flex items-center justify-center select-none">
            <span
              className="absolute inset-0 rounded-full border border-accent/25 animate-ping opacity-20"
              style={{ animationDuration: '2.8s' }}
            />
            <div className="absolute inset-0 rounded-full border border-accent/25 bg-accent-soft/10" />
            <div className="absolute inset-5 rounded-full border border-dashed border-accent/25" />
            <div className="absolute inset-10 rounded-full border border-accent/30" />
            <div className="absolute inset-16 rounded-full border border-accent/40 bg-accent-soft/20" />

            <div className="absolute inset-x-3 top-1/2 h-px bg-accent/15 -translate-y-1/2" />
            <div className="absolute inset-y-3 left-1/2 w-px bg-accent/15 -translate-x-1/2" />

            <div
              className="absolute inset-1 rounded-full animate-spin"
              style={{
                animationDuration: '2.6s',
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 260deg, rgba(37, 99, 235, 0.22) 340deg, rgba(37, 99, 235, 0.5) 360deg)',
              }}
            />

            {RADAR_SIGNAL_BLIPS.map((blip, idx) => (
              <div
                key={idx}
                className="absolute flex items-center gap-1 pointer-events-none"
                style={{
                  top: blip.top,
                  left: blip.left,
                }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"
                    style={{ animationDuration: '2s', animationDelay: blip.delay }}
                  />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent border border-white" />
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface/95 border border-line shadow-2xs text-[10px] font-code font-medium text-ink whitespace-nowrap">
                  {blip.label}
                </span>
              </div>
            ))}

            <div className="relative z-10 w-[72px] h-[72px] rounded-full bg-surface border-2 border-accent shadow-sm flex flex-col items-center justify-center">
              <ModeIcon className="w-4 h-4 text-accent mb-0.5 animate-pulse" />
              <span className="text-sm font-bold font-code text-ink tabular-nums leading-none">
                {progressPct}%
              </span>
              <span className="text-[10px] font-code text-ink-3 tabular-nums mt-0.5">
                {elapsedSec}s
              </span>
            </div>
          </div>

          {/* Target & Progress */}
          <div className="mt-4 w-full space-y-2.5">
            <div className="flex items-center justify-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-line text-xs font-code font-semibold text-ink truncate max-w-[180px]">
                {queryLabel}
              </span>
              <span className="text-xs font-code font-semibold text-accent tabular-nums">
                {currentCollected}/{effectiveTarget} {unitText}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-surface-2 border border-line overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {onStop && (
              <div className="pt-1">
                <Button size="sm" variant="secondary" icon={Square} onClick={onStop}>
                  Dừng quét
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
