'use client';

import React from 'react';
import { Check, RefreshCw, Target } from 'lucide-react';
import type {
  BookingDealItem,
  KocItem,
  StorePortfolioItem,
  UserProfile,
} from '../../lib/types';
import type { TikTokScrapedKocResult } from '../../lib/tiktokKocScraper';
import type { KocBriefAnalysisBackgroundJob } from '../../lib/kocChannelBriefAnalyzer';
import type { KocChannelReviewEntry } from '../../lib/kocChannelReviewService';
import {
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from '../koc/KocChannelReviewModal';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { KocChannelBriefMatcherModal } from '../koc/KocChannelBriefMatcherModal';
import {
  CompetitorVideoScriptModal,
  type ScriptExtractFallbackContext,
} from './CompetitorVideoScriptModal';
import { AddToBrandListingSheetModal } from '../shortlist/AddToBrandListingSheetModal';
import { PendingKocStagingModal } from '../koc/PendingKocStagingModal';
import type { StagingKocItem } from '../../lib/kocStagingService';
import type { CrawlerHistoryTabKey } from '../../app/api/integrations/tiktok-koc/history/route';
import { Button, Status } from '../ui';

export interface CrawlerChannelBriefModalProps {
  briefAnalysisJobs: KocBriefAnalysisBackgroundJob[];
  runningBriefJobsCount: number;
  setBriefMatcherOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scraperModalOpen: boolean;
  setScraperModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  kocs: KocItem[];
  scraperInitialHandle: string;
  currentUser?: UserProfile;
  onSaveScrapedKocs: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  saveDailyHistorySession: (payload: {
    tab: CrawlerHistoryTabKey;
    rawInput: string;
    queryKey?: string;
    queryLabel: string;
    summaryNote?: string;
    scrapedChannels?: TikTokScrapedKocResult[];
  }) => Promise<void>;
  onNavigateToKocMaster?: (kocId?: string) => void;
  setSheetTargetKocs: React.Dispatch<
    React.SetStateAction<Array<Partial<KocItem> & { stageName: string; channelId: string }>>
  >;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  videoInspectorOpen: boolean;
  setVideoInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deals: BookingDealItem[];
  scriptModalOpen: boolean;
  setScriptModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scriptModalUrl: string;
  scriptModalContext?: ScriptExtractFallbackContext;
  briefMatcherOpen: boolean;
  briefMatcherHandles: string[];
  briefMatcherBrand: string;
  handleBriefJobsChange: (nextJobs: KocBriefAnalysisBackgroundJob[]) => void;
  channelReviewModalOpen: boolean;
  setChannelReviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  channelReviewTarget: KocChannelReviewTarget | null;
  channelReviews: KocChannelReviewEntry[];
  channelReviewInitialMode: 'CHANNEL_DETAIL' | 'ALL_HISTORY';
  sheetTargetKocs: Array<Partial<KocItem> & { stageName: string; channelId: string }>;
  stores: StorePortfolioItem[];
  onOpenStaffBrandSheet?: (params: { monthKey: string; storeName: string }) => void;
  pendingStagingModalOpen: boolean;
  setPendingStagingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stagingKocs: StagingKocItem[];
  handleRemoveStagingItem: (channelId: string) => Promise<void>;
}

export const CrawlerBriefProgressBanner: React.FC<{
  briefAnalysisJobs: KocBriefAnalysisBackgroundJob[];
  runningBriefJobsCount: number;
  setBriefMatcherOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ briefAnalysisJobs, runningBriefJobsCount, setBriefMatcherOpen }) => {
  if (briefAnalysisJobs.length === 0) return null;
  return (
    <div className="px-3 py-2 rounded-xl border border-accent/30 bg-surface flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Target className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="font-semibold text-ink">
          Phân tích Kênh &amp; Khớp Brief ({briefAnalysisJobs.length} phiên)
        </span>
        {runningBriefJobsCount > 0 ? (
          <Status tone="info">Đang quét {runningBriefJobsCount} tiến trình</Status>
        ) : (
          <Status tone="positive">Hoàn tất</Status>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {briefAnalysisJobs.slice(0, 3).map((job) => {
            const isRunning = job.status === 'QUEUED' || job.status === 'RUNNING';
            return (
              <button
                key={job.jobId}
                type="button"
                onClick={() => setBriefMatcherOpen(true)}
                className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md border border-line bg-surface-2 hover:border-accent/50 text-2xs transition cursor-pointer"
              >
                {isRunning ? (
                  <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-positive shrink-0" />
                )}
                <span className="font-medium text-ink">{job.briefCriteria.brandName}</span>
                <span className="font-code text-ink-3">
                  {job.completedHandlesCount}/{job.handles.length} ({job.progressPct}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <Button size="sm" variant="secondary" onClick={() => setBriefMatcherOpen(true)}>
        Xem tiến trình &amp; Kết quả
      </Button>
    </div>
  );
};

export const CrawlerChannelBriefModal: React.FC<CrawlerChannelBriefModalProps> = ({
  scraperModalOpen,
  setScraperModalOpen,
  kocs,
  scraperInitialHandle,
  currentUser,
  onSaveScrapedKocs,
  saveDailyHistorySession,
  onNavigateToKocMaster,
  setSheetTargetKocs,
  onNotify,
  videoInspectorOpen,
  setVideoInspectorOpen,
  deals,
  scriptModalOpen,
  setScriptModalOpen,
  scriptModalUrl,
  scriptModalContext,
  briefMatcherOpen,
  setBriefMatcherOpen,
  briefMatcherHandles,
  briefMatcherBrand,
  handleBriefJobsChange,
  channelReviewModalOpen,
  setChannelReviewModalOpen,
  channelReviewTarget,
  channelReviews,
  channelReviewInitialMode,
  sheetTargetKocs,
  stores,
  onOpenStaffBrandSheet,
  pendingStagingModalOpen,
  setPendingStagingModalOpen,
  stagingKocs,
  handleRemoveStagingItem,
}) => {
  return (
    <>
      <TikTokKocScraperModal
        open={scraperModalOpen}
        onClose={() => setScraperModalOpen(false)}
        existingKocs={kocs}
        initialHandle={scraperInitialHandle}
        currentUser={currentUser}
        onApplyResults={onSaveScrapedKocs}
        onSaveScrapedSession={({ rawInput, results }) => {
          const handles = results.map((r) => `@${r.handle}`);
          const label =
            handles.length === 1
              ? `Kênh ${handles[0]}`
              : `${handles.slice(0, 2).join(', ')}${handles.length > 2 ? ` +${handles.length - 2}` : ''}`;
          void saveDailyHistorySession({
            tab: 'HANDLE_SCRAPE',
            rawInput,
            queryKey: handles.join(',').toLowerCase(),
            queryLabel: label,
            summaryNote: `${results.length} kênh · ${results.reduce((s, r) => s + (r.recentVideos?.length || 0), 0)} video`,
          });
        }}
        onOpenKocInMaster={
          onNavigateToKocMaster
            ? (koc) => {
                setScraperModalOpen(false);
                onNavigateToKocMaster(koc.id);
              }
            : undefined
        }
        onAddToBrandSheet={(kocsToPush) => {
          setSheetTargetKocs(kocsToPush);
        }}
        onNotify={onNotify}
      />

      <TikTokVideoInspectorModal
        isOpen={videoInspectorOpen}
        onClose={() => setVideoInspectorOpen(false)}
        deals={deals}
      />

      <CompetitorVideoScriptModal
        isOpen={scriptModalOpen}
        onClose={() => setScriptModalOpen(false)}
        initialUrl={scriptModalUrl}
        fallbackContext={scriptModalContext}
        onNotify={onNotify}
      />

      <KocChannelBriefMatcherModal
        isOpen={briefMatcherOpen}
        onClose={() => setBriefMatcherOpen(false)}
        initialHandles={briefMatcherHandles}
        initialBrandName={briefMatcherBrand}
        onJobsChange={handleBriefJobsChange}
        onNotify={onNotify}
      />

      <KocChannelReviewModal
        open={channelReviewModalOpen}
        onClose={() => setChannelReviewModalOpen(false)}
        target={channelReviewTarget}
        reviews={channelReviews}
        currentUserName={currentUser?.name || 'Nhân sự B2C'}
        currentUserRole={currentUser?.role}
        currentUserEmail={currentUser?.email}
        initialMode={channelReviewInitialMode}
        onNotify={onNotify}
      />

      <AddToBrandListingSheetModal
        open={sheetTargetKocs.length > 0}
        onClose={() => setSheetTargetKocs([])}
        targetKocs={sheetTargetKocs}
        allKocs={kocs}
        stores={stores}
        deals={deals}
        currentUserName={currentUser?.name || 'Chuyên viên Listing'}
        onAddedSuccess={({ monthKey, storeName, openSheet }) => {
          if (openSheet && onOpenStaffBrandSheet) {
            onOpenStaffBrandSheet({ monthKey, storeName });
          }
        }}
        onNotify={onNotify}
      />

      <PendingKocStagingModal
        open={pendingStagingModalOpen}
        onClose={() => setPendingStagingModalOpen(false)}
        stagingItems={stagingKocs}
        onRemoveItem={handleRemoveStagingItem}
        onNotify={onNotify}
      />
    </>
  );
};
