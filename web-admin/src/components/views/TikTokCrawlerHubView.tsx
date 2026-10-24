'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Flame,
  Hash,
  History,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Target,
  UserPlus,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import {
  getSegmentFromSalaryGrade,
  type BookingDealItem,
  type KocItem,
  type KocTier,
  type SalaryGrade,
  type StorePortfolioItem,
  type UserProfile,
} from '../../lib/types';
import { INITIAL_DEALS, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { AddToBrandListingSheetModal } from '../shortlist/AddToBrandListingSheetModal';
import type {
  CrawlerHistoryTabKey,
  TikTokCrawlerDailyHistoryItem,
} from '../../app/api/integrations/tiktok-koc/history/route';
import {
  buildCompetitorKocsCsv,
  buildScrapedKocsCsv,
  buildTrendingCreatorsCsv,
  buildVideoCommentsCsv,
  compareVideoAirDateDesc,
  mapScrapedResultToKocItem,
  type TikTokCommentIntentType,
  type TikTokCompetitorKocResult,
  type TikTokCompetitorProfileSummary,
  type TikTokHashtagKocResult,
  type TikTokScrapedKocResult,
  type TikTokTrendingCreatorItem,
  type TikTokVideoCommentItem,
  type TikTokVideoCommentsScrapeResult,
  type TrendingKocCategoryKey,
} from '../../lib/tiktokKocScraper';
import { formatDate, formatNumber, getVietnamDateYmd } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { KocChannelBriefMatcherModal } from '../koc/KocChannelBriefMatcherModal';
import {
  KocChannelReviewBadge,
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from '../koc/KocChannelReviewModal';
import {
  VERDICT_META,
  normalizeChannelHandle,
  useKocChannelReviews,
  type KocChannelReviewEntry,
  type KocChannelReviewVerdict,
} from '../../lib/kocChannelReviewService';
import type { KocBriefAnalysisBackgroundJob } from '../../lib/kocChannelBriefAnalyzer';
import {
  LinkAirCheckerPanel,
  type LinkAirRestorePayload,
} from '../crawler/LinkAirCheckerPanel';
import type { LinkAirExpectation, LinkAirResult } from '../../lib/linkAirCheck';
import {
  CompetitorVideoScriptModal,
  type ScriptExtractFallbackContext,
} from '../crawler/CompetitorVideoScriptModal';
import { TikTokCrawlCreativeLoader } from '../crawler/TikTokCrawlCreativeLoader';
import {
  fetchStagingKocs,
  saveStagingKocsBatch,
  normalizeKocHandle,
  type StagingKocItem,
} from '../../lib/kocStagingService';
import { PendingKocStagingModal } from '../koc/PendingKocStagingModal';
import {
  ActionMenu,
  Avatar,
  Button,
  Chips,
  DataTable,
  PageActions,
  Panel,
  SearchInput,
  Segmented,
  Select,
  Status,
  Tabs,
} from '../ui';
import type { Column } from '../ui';

interface TikTokCrawlerHubViewProps {
  currentUser?: UserProfile;
  kocs: KocItem[];
  stores?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  onSaveScrapedKocs: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToKocMaster?: (kocId?: string) => void;
  onOpenStaffBrandSheet?: (params: { monthKey: string; storeName: string }) => void;
}

type CrawlerTabKey =
  | 'COMPETITOR_KOCS'
  | 'HASHTAG_DISCOVERY'
  | 'COMMENTS_AND_TRENDING'
  | 'CHANNEL_AND_VIDEO_TOOLS'
  | 'LINK_AIR_CHECK';
type PeriodKey = '7d' | '30d' | '90d';
type CompetitorFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'PAID_BOOKING'
  | 'AFFILIATE_CART'
  | 'HAS_PHONE'
  | 'SUITABLE'
  | 'NOT_SUITABLE';
type HashtagFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'VIRAL_BREAKOUT'
  | 'HAS_PHONE'
  | 'SUITABLE'
  | 'NOT_SUITABLE';
type TrendingFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'VERIFIED'
  | 'HAS_CONTACT'
  | 'SUITABLE'
  | 'NOT_SUITABLE';
type FollowerTierKey = 'ALL' | 'NANO' | 'MICRO' | 'MACRO' | 'MEGA';
type KocSortKey = 'VIEWS_DESC' | 'FOLLOWERS_DESC' | 'ER_DESC' | 'LATEST_DESC';
type CommentFilterKey = 'ALL' | TikTokCommentIntentType | 'HAS_PHONE';

function matchesFollowerTier(followers: number, tier: FollowerTierKey): boolean {
  if (tier === 'NANO') return followers < 50_000;
  if (tier === 'MICRO') return followers >= 50_000 && followers < 200_000;
  if (tier === 'MACRO') return followers >= 200_000 && followers < 500_000;
  if (tier === 'MEGA') return followers >= 500_000;
  return true;
}

interface BatchCrawlProgress {
  currentBatch: number;
  totalBatches: number;
  collectedCount: number;
  targetCount: number;
}

const KOC_BATCH_SIZE = 12;
const COMMENT_BATCH_SIZE = 40;
const KOC_COUNT_PRESETS = [12, 50, 100, 200, 500];
const COMMENT_COUNT_PRESETS = [40, 100, 200, 300, 500];

const TRENDING_CATEGORY_OPTIONS: Array<{ key: TrendingKocCategoryKey; label: string }> = [
  { key: 'ALL', label: 'Tất cả ngành hàng B2C' },
  { key: 'SKINCARE', label: 'Mỹ phẩm & Chăm sóc da (Skincare)' },
  { key: 'MAKEUP', label: 'Trang điểm (Makeup / Son & Cushion)' },
  { key: 'BODY_HAIR', label: 'Chăm sóc cơ thể & Tóc (Body & Hair)' },
  { key: 'MOM_BABY', label: 'Mẹ & Bé (Mom & Baby)' },
  { key: 'MEN_CARE', label: 'Chăm sóc Nam giới (Men\'s Care)' },
  { key: 'HEALTH_WELLNESS', label: 'Sức khỏe & Thực phẩm bổ sung' },
  { key: 'FASHION_LIFESTYLE', label: 'Thời trang & Đời sống' },
];

export const TikTokCrawlerHubView: React.FC<TikTokCrawlerHubViewProps> = ({
  currentUser,
  kocs,
  stores = INITIAL_STORE_PORTFOLIOS,
  deals = INITIAL_DEALS,
  onSaveScrapedKocs,
  onNotify,
  onNavigateToKocMaster,
  onOpenStaffBrandSheet,
}) => {
  const [activeTab, setActiveTab] = useState<CrawlerTabKey>('COMPETITOR_KOCS');
  const [sheetTargetKocs, setSheetTargetKocs] = useState<
    Array<Partial<KocItem> & { stageName: string; channelId: string }>
  >([]);
  const period: PeriodKey = '30d';

  // --- Lịch sử crawl theo tuần (7 ngày gần nhất) cho từng tab ---
  const [dailyHistory, setDailyHistory] = useState<TikTokCrawlerDailyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyDayFilter, setHistoryDayFilter] = useState<
    'ALL_WEEK' | 'TODAY' | 'YESTERDAY' | 'EARLIER'
  >('ALL_WEEK');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showAllTabsInBar, setShowAllTabsInBar] = useState(false);
  const [expandedWeeklyTableByTab, setExpandedWeeklyTableByTab] = useState<
    Record<string, boolean>
  >({});
  const [linkAirRestorePayload, setLinkAirRestorePayload] =
    useState<LinkAirRestorePayload | null>(null);

  const WEEKLY_HISTORY_STORAGE_KEY = 'upbase_b2c_tiktok_weekly_crawl_history_v1';

  const fetchDailyHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/integrations/tiktok-koc/history');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.items)) {
        setDailyHistory(json.items);
        try {
          window.localStorage.setItem(
            WEEKLY_HISTORY_STORAGE_KEY,
            JSON.stringify(json.items)
          );
        } catch {
          // ignore storage quota
        }
        return;
      }
    } catch {
      // fallback to localStorage if offline
    } finally {
      setHistoryLoading(false);
    }

    try {
      const cached = window.localStorage.getItem(WEEKLY_HISTORY_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setDailyHistory(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDailyHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDailyHistory, activeTab]);

  const saveDailyHistorySession = useCallback(
    async (payload: {
      tab: CrawlerHistoryTabKey;
      rawInput: string;
      queryKey?: string;
      queryLabel: string;
      summaryNote?: string;
      compProfile?: TikTokCompetitorProfileSummary | null;
      compResults?: TikTokCompetitorKocResult[];
      tagResults?: TikTokHashtagKocResult[];
      commentData?: TikTokVideoCommentsScrapeResult | null;
      trendingCategory?: TrendingKocCategoryKey;
      trendingCreators?: TikTokTrendingCreatorItem[];
      scrapedChannels?: TikTokScrapedKocResult[];
      linkAirResults?: LinkAirResult[];
      linkAirExpect?: LinkAirExpectation;
    }) => {
      try {
        const res = await fetch('/api/integrations/tiktok-koc/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            staffName: currentUser?.name || 'Nhân sự B2C',
          }),
        });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.items)) {
          setDailyHistory(json.items);
          try {
            window.localStorage.setItem(
              WEEKLY_HISTORY_STORAGE_KEY,
              JSON.stringify(json.items)
            );
          } catch {
            // ignore
          }
          const first = json.items[0] as TikTokCrawlerDailyHistoryItem | undefined;
          if (first && first.tab === payload.tab) {
            setActiveHistoryId(first.id);
          }
        }
      } catch {
        // ignore
      }
    },
    [currentUser]
  );

  const deleteHistoryEntry = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setDailyHistory((prev) => {
        const next = prev.filter((it) => it.id !== id);
        try {
          window.localStorage.setItem(WEEKLY_HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      if (activeHistoryId === id) setActiveHistoryId(null);
      try {
        const res = await fetch(
          `/api/integrations/tiktok-koc/history?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.items)) {
          setDailyHistory(json.items);
        }
      } catch {
        // ignore
      }
    },
    [activeHistoryId]
  );

  const clearTabWeeklyHistory = useCallback(
    async (tab: CrawlerHistoryTabKey) => {
      setDailyHistory((prev) => {
        const next = prev.filter((it) => it.tab !== tab);
        try {
          window.localStorage.setItem(WEEKLY_HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      try {
        const res = await fetch(
          `/api/integrations/tiktok-koc/history?tab=${encodeURIComponent(tab)}`,
          { method: 'DELETE' }
        );
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.items)) {
          setDailyHistory(json.items);
        }
        onNotify?.('Đã xóa lịch sử quét trong tuần của tab này.', 'info');
      } catch {
        // ignore
      }
    },
    [onNotify]
  );

  // --- State Tab 1: Quét KOC của Đối thủ ---
  const [competitorInput, setCompetitorInput] = useState('');
  const [compTargetCount, setCompTargetCount] = useState<number>(12);
  const [compRequestedCount, setCompRequestedCount] = useState<number | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compBatchProgress, setCompBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [compError, setCompError] = useState<string | null>(null);
  const [compProfile, setCompProfile] = useState<TikTokCompetitorProfileSummary | null>(null);
  const [compResults, setCompResults] = useState<TikTokCompetitorKocResult[]>([]);
  const [compFilter, setCompFilter] = useState<CompetitorFilterKey>('ALL');
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compFollowerTier, setCompFollowerTier] = useState<FollowerTierKey>('ALL');
  const [compMinViews, setCompMinViews] = useState<number>(0);
  const [compMinEr, setCompMinEr] = useState<number>(0);
  const [compSortBy, setCompSortBy] = useState<KocSortKey>('LATEST_DESC');
  const compAbortRef = useRef(false);

  // --- State Tab 2: Tìm KOC theo Hashtag ---
  const [hashtagInput, setHashtagInput] = useState('');
  const [tagTargetCount, setTagTargetCount] = useState<number>(12);
  const [tagRequestedCount, setTagRequestedCount] = useState<number | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagBatchProgress, setTagBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagResults, setTagResults] = useState<TikTokHashtagKocResult[]>([]);
  const [tagFilter, setTagFilter] = useState<HashtagFilterKey>('ALL');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagFollowerTier, setTagFollowerTier] = useState<FollowerTierKey>('ALL');
  const [tagMinViews, setTagMinViews] = useState<number>(0);
  const [tagMinEr, setTagMinEr] = useState<number>(0);
  const [tagSortBy, setTagSortBy] = useState<KocSortKey>('LATEST_DESC');
  const tagAbortRef = useRef(false);

  // --- State Tab 3: Cào Bình luận Video ---
  const [videoCommentUrl, setVideoCommentUrl] = useState('');
  const [commentTargetCount, setCommentTargetCount] = useState<number>(40);
  const [commentRequestedCount, setCommentRequestedCount] = useState<number | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentBatchProgress, setCommentBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentData, setCommentData] = useState<TikTokVideoCommentsScrapeResult | null>(null);
  const [commentFilter, setCommentFilter] = useState<CommentFilterKey>('ALL');
  const [commentSearch, setCommentSearch] = useState('');
  const [commentSortBy, setCommentSortBy] = useState<'INTENT_FIRST' | 'LIKES_DESC' | 'NEWEST'>('INTENT_FIRST');
  const commentAbortRef = useRef(false);

  // --- State Tab 4: KOC Xu hướng theo Ngành hàng ---
  const [trendingCategory, setTrendingCategory] = useState<TrendingKocCategoryKey>('ALL');
  const [trendingTargetCount, setTrendingTargetCount] = useState<number>(12);
  const [trendingRequestedCount, setTrendingRequestedCount] = useState<number | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingBatchProgress, setTrendingBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [trendingCreators, setTrendingCreators] = useState<TikTokTrendingCreatorItem[]>([]);
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilterKey>('ALL');
  const [trendingFollowerTier, setTrendingFollowerTier] = useState<FollowerTierKey>('ALL');
  const [trendingSearch, setTrendingSearch] = useState('');
  const trendingAbortRef = useRef(false);
  const trendingNextPageOffsetRef = useRef(0);

  // --- State Modals ---
  const [scraperModalOpen, setScraperModalOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');
  const [videoInspectorOpen, setVideoInspectorOpen] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptModalUrl, setScriptModalUrl] = useState('');
  const [scriptModalContext, setScriptModalContext] = useState<
    ScriptExtractFallbackContext | undefined
  >(undefined);
  const [briefMatcherOpen, setBriefMatcherOpen] = useState(false);
  const [briefMatcherHandles, setBriefMatcherHandles] = useState<string[]>([]);
  const [briefMatcherBrand, setBriefMatcherBrand] = useState('');
  const [briefAnalysisJobs, setBriefAnalysisJobs] = useState<KocBriefAnalysisBackgroundJob[]>([]);
  const [channelReviewModalOpen, setChannelReviewModalOpen] = useState(false);
  const [channelReviewTarget, setChannelReviewTarget] = useState<KocChannelReviewTarget | null>(null);
  const [channelReviewInitialMode, setChannelReviewInitialMode] = useState<'CHANNEL_DETAIL' | 'ALL_HISTORY'>('CHANNEL_DETAIL');
  const [expandedReviewHistoryByTab, setExpandedReviewHistoryByTab] = useState<Record<string, boolean>>({});
  const [quickExpandedChannelHandle, setQuickExpandedChannelHandle] = useState<string | null>(null);
  const [inlineReviewVerdictFilter, setInlineReviewVerdictFilter] = useState<'ALL' | KocChannelReviewVerdict>('ALL');
  const [inlineReviewSearch, setInlineReviewSearch] = useState('');
  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();

  const openChannelReviewModal = (
    target: KocChannelReviewTarget | null,
    mode: 'CHANNEL_DETAIL' | 'ALL_HISTORY' = 'CHANNEL_DETAIL'
  ) => {
    setChannelReviewTarget(target);
    setChannelReviewInitialMode(mode);
    setChannelReviewModalOpen(true);
  };
  const notifiedCompletedJobsRef = useRef<Set<string>>(new Set());
  const runningBriefJobsCount = useMemo(
    () =>
      briefAnalysisJobs.filter(
        (j) => j.status === 'QUEUED' || j.status === 'RUNNING'
      ).length,
    [briefAnalysisJobs]
  );

  const handleBriefJobsChange = (nextJobs: KocBriefAnalysisBackgroundJob[]) => {
    setBriefAnalysisJobs((prev) => {
      const prevRunningIds = new Set(
        prev
          .filter((j) => j.status === 'QUEUED' || j.status === 'RUNNING')
          .map((j) => j.jobId)
      );
      for (const job of nextJobs) {
        if (
          job.status === 'COMPLETED' &&
          prevRunningIds.has(job.jobId) &&
          !notifiedCompletedJobsRef.current.has(job.jobId)
        ) {
          notifiedCompletedJobsRef.current.add(job.jobId);
          onNotify?.(
            `Hoàn tất phân tích ngầm ${job.handles.length} kênh KOC (${job.totalVideosScannedSoFar} video) cho Brand ${job.briefCriteria.brandName}`,
            'success'
          );
        }
      }
      return nextJobs;
    });
  };

  const openScriptExtractorModal = (
    videoUrl: string,
    ctx?: ScriptExtractFallbackContext
  ) => {
    setScriptModalUrl(videoUrl);
    setScriptModalContext(ctx);
    setScriptModalOpen(true);
  };

  const openBriefMatcherModal = (handles: string[], brandHint?: string) => {
    setBriefMatcherHandles(handles);
    if (brandHint) setBriefMatcherBrand(brandHint);
    setBriefMatcherOpen(true);
  };

  const existingByHandle = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      const clean = (k.channelId || '').trim().toLowerCase().replace(/^@+/, '');
      if (clean) map.set(clean, k);
    }
    return map;
  }, [kocs]);

  // --- Bảng tạm KOC mới chưa có trên Upaffiliate (Pending Staging) ---
  const [stagingKocs, setStagingKocs] = useState<StagingKocItem[]>([]);
  const [pendingStagingModalOpen, setPendingStagingModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void fetchStagingKocs().then((items) => {
      if (isMounted) setStagingKocs(items);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const stagingByHandle = useMemo(() => {
    const map = new Map<string, StagingKocItem>();
    for (const it of stagingKocs) {
      const clean = normalizeKocHandle(it.channelId);
      if (clean) map.set(clean, it);
    }
    return map;
  }, [stagingKocs]);

  const handleRemoveStagingItem = async (channelId: string) => {
    try {
      const res = await fetch(
        `/api/integrations/upaffiliate/staging?channelId=${encodeURIComponent(channelId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          setStagingKocs(json.items);
          return;
        }
      }
    } catch {
      // ignore
    }
    setStagingKocs((prev) => prev.filter((it) => it.channelId !== channelId));
  };

  const compNextPageOffsetRef = useRef(0);
  const tagNextPageOffsetRef = useRef(0);

  const runCompetitorCrawl = async (
    rawComp: string,
    targetPeriod: PeriodKey,
    options?: { targetCount?: number; appendMode?: boolean }
  ) => {
    const trimmed = rawComp.trim();
    if (!trimmed) {
      setCompError('Vui lòng nhập @handle kênh TikTok hoặc tên thương hiệu đối thủ.');
      return;
    }

    const appendMode = Boolean(options?.appendMode);
    if (!appendMode) {
      setCompResults([]);
      setCompProfile(null);
      compNextPageOffsetRef.current = 0;
    }
    const baseList = appendMode ? [...compResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? compTargetCount) || 12, 1), 1000);
    setCompRequestedCount(requestedTotal);

    const totalNeeded = Math.max(1, requestedTotal - baseList.length);
    const initialEstimateBatches = Math.max(1, Math.ceil(totalNeeded / KOC_BATCH_SIZE));
    const maxBatches = Math.max(initialEstimateBatches + 8, Math.ceil(totalNeeded / 5));

    compAbortRef.current = false;
    setCompLoading(true);
    setCompError(null);

    const accumulatedMap = new Map<string, TikTokCompetitorKocResult>();
    for (const item of baseList) {
      accumulatedMap.set(item.handle.toLowerCase(), item);
    }
    let latestProfile = appendMode ? compProfile : null;
    let consecutiveEmptyBatches = 0;

    try {
      for (let batchIdx = 0; batchIdx < maxBatches; batchIdx++) {
        if (compAbortRef.current) break;

        const remaining = requestedTotal - accumulatedMap.size;
        if (remaining <= 0) break;
        const batchLimit = Math.min(20, Math.max(KOC_BATCH_SIZE, remaining));
        const currentPageOffset = compNextPageOffsetRef.current++;
        const displayTotalBatches = Math.max(
          initialEstimateBatches,
          batchIdx + Math.ceil(remaining / KOC_BATCH_SIZE)
        );

        setCompBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: displayTotalBatches,
          collectedCount: accumulatedMap.size,
          targetCount: requestedTotal,
        });

        const res = await fetch('/api/integrations/tiktok-koc/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitor: trimmed,
            period: targetPeriod,
            limit: batchLimit,
            excludeHandles: Array.from(accumulatedMap.keys()),
            pageOffset: currentPageOffset,
            skipProfileFetch: accumulatedMap.size > 0 && Boolean(latestProfile),
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.results)) {
          if (accumulatedMap.size === 0) {
            const msg = json.message || 'Không quét được danh sách KOC của đối thủ này.';
            setCompError(msg);
            onNotify?.(msg, 'error');
          }
          break;
        }

        if (json.competitorProfile && (!latestProfile || !latestProfile.followers)) {
          latestProfile = json.competitorProfile;
          setCompProfile(json.competitorProfile);
        }

        let addedInBatch = 0;
        for (const row of json.results as TikTokCompetitorKocResult[]) {
          if (accumulatedMap.size >= requestedTotal) break;
          const key = row.handle.toLowerCase();
          if (!accumulatedMap.has(key)) {
            accumulatedMap.set(key, row);
            addedInBatch++;
          }
        }

        const mergedList = Array.from(accumulatedMap.values()).sort((a, b) =>
          compareVideoAirDateDesc(
            {
              publishedAt: a.competitorCollaboration.latestCollabPublishedAt,
              videoId: a.competitorCollaboration.latestCollabVideoId,
              views: a.competitorCollaboration.latestCollabViews,
            },
            {
              publishedAt: b.competitorCollaboration.latestCollabPublishedAt,
              videoId: b.competitorCollaboration.latestCollabVideoId,
              views: b.competitorCollaboration.latestCollabViews,
            }
          )
        );
        setCompResults(mergedList);

        setCompBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: displayTotalBatches,
          collectedCount: mergedList.length,
          targetCount: requestedTotal,
        });

        if (addedInBatch === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= 2) break;
        } else {
          consecutiveEmptyBatches = 0;
        }
      }

      if (accumulatedMap.size === 0 && !compAbortRef.current) {
        const msg = `Không tìm thấy video KOC hợp tác nào khớp với "${trimmed}". Kiểm tra lại @handle hoặc nhập tên thương hiệu (VD: Coolmate, La Roche-Posay).`;
        setCompError(msg);
        onNotify?.(msg, 'warning');
      } else if (!compAbortRef.current && accumulatedMap.size < requestedTotal) {
        onNotify?.(
          `Chỉ tìm thấy ${accumulatedMap.size}/${requestedTotal} KOC hợp tác với "${trimmed}" (ít hơn yêu cầu ${requestedTotal - accumulatedMap.size} KOC).`,
          'warning'
        );
      } else if (appendMode && accumulatedMap.size === baseList.length && !compAbortRef.current) {
        onNotify?.('Đã lấy hết các KOC khớp với đối thủ này trên chỉ mục hiện tại.', 'info');
      }

      if (accumulatedMap.size > 0) {
        const finalMerged = Array.from(accumulatedMap.values()).sort((a, b) =>
          compareVideoAirDateDesc(
            {
              publishedAt: a.competitorCollaboration.latestCollabPublishedAt,
              videoId: a.competitorCollaboration.latestCollabVideoId,
              views: a.competitorCollaboration.latestCollabViews,
            },
            {
              publishedAt: b.competitorCollaboration.latestCollabPublishedAt,
              videoId: b.competitorCollaboration.latestCollabVideoId,
              views: b.competitorCollaboration.latestCollabViews,
            }
          )
        );
        const displayLabel = latestProfile?.handle
          ? `@${latestProfile.handle}`
          : trimmed.startsWith('@')
            ? trimmed
            : `@${trimmed}`;
        void saveDailyHistorySession({
          tab: 'COMPETITOR_KOCS',
          rawInput: trimmed,
          queryKey: (latestProfile?.handle || trimmed).toLowerCase().replace(/^@+/, ''),
          queryLabel: displayLabel,
          compProfile: latestProfile,
          compResults: finalMerged,
        });

        // Tự động kiểm tra đối soát Upaffiliate & lưu vào Bảng Tạm nếu chưa có
        const newCompetitorKocsToStage = finalMerged
          .filter((r) => {
            const clean = normalizeKocHandle(r.handle);
            return !existingByHandle.has(clean) && !stagingByHandle.has(clean);
          })
          .map((r) => ({
            channelId: normalizeKocHandle(r.handle),
            channelUrl: r.channelProfile.channelUrl,
            stageName: r.channelProfile.nickname || r.handle,
            phone: r.channelProfile.extractedPhone || undefined,
            followersCount: r.channelProfile.followers || 0,
            avgViews: r.engagementMetrics?.avgViews || 0,
            engagementRate: r.engagementMetrics?.engagementRate,
            discoverySource: 'COMPETITOR_DISCOVERY' as const,
            sourceContext: `Đối thủ: ${displayLabel}`,
            sampleVideoUrl: r.competitorCollaboration.latestCollabVideoUrl,
            sampleVideoViews: r.competitorCollaboration.latestCollabViews,
            sampleVideoCaption: r.competitorCollaboration.latestCollabCaption,
            discoveredByStaffId: currentUser?.id,
            discoveredByStaffName: currentUser?.name,
          }));

        if (newCompetitorKocsToStage.length > 0) {
          void saveStagingKocsBatch(newCompetitorKocsToStage).then((res) => {
            if (res.success && res.savedCount > 0) {
              setStagingKocs(res.items);
              onNotify?.(
                `Đã đối soát & tự động lưu ${res.savedCount} KOC chưa có trên Upaffiliate vào Bảng Tạm.`,
                'info'
              );
            }
          });
        }
      }
    } catch {
      if (accumulatedMap.size === 0) {
        const msg = 'Không kết nối được dịch vụ thu thập dữ liệu TikTok. Vui lòng thử lại.';
        setCompError(msg);
        onNotify?.(msg, 'error');
      }
    } finally {
      setCompLoading(false);
      setCompBatchProgress(null);
    }
  };

  const runHashtagCrawl = async (
    rawTag: string,
    targetPeriod: PeriodKey,
    options?: { targetCount?: number; appendMode?: boolean }
  ) => {
    const trimmed = rawTag.trim();
    if (!trimmed) {
      setTagError('Vui lòng nhập #hashtag hoặc từ khóa ngách cần quét.');
      return;
    }

    const appendMode = Boolean(options?.appendMode);
    if (!appendMode) {
      setTagResults([]);
      tagNextPageOffsetRef.current = 0;
    }
    const baseList = appendMode ? [...tagResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? tagTargetCount) || 12, 1), 1000);
    setTagRequestedCount(requestedTotal);

    const totalNeeded = Math.max(1, requestedTotal - baseList.length);
    const initialEstimateBatches = Math.max(1, Math.ceil(totalNeeded / KOC_BATCH_SIZE));
    const maxBatches = Math.max(initialEstimateBatches + 8, Math.ceil(totalNeeded / 5));

    tagAbortRef.current = false;
    setTagLoading(true);
    setTagError(null);

    const accumulatedMap = new Map<string, TikTokHashtagKocResult>();
    for (const item of baseList) {
      accumulatedMap.set(item.handle.toLowerCase(), item);
    }
    let consecutiveEmptyBatches = 0;

    try {
      for (let batchIdx = 0; batchIdx < maxBatches; batchIdx++) {
        if (tagAbortRef.current) break;

        const remaining = requestedTotal - accumulatedMap.size;
        if (remaining <= 0) break;
        const batchLimit = Math.min(20, Math.max(KOC_BATCH_SIZE, remaining));
        const currentPageOffset = tagNextPageOffsetRef.current++;
        const displayTotalBatches = Math.max(
          initialEstimateBatches,
          batchIdx + Math.ceil(remaining / KOC_BATCH_SIZE)
        );

        setTagBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: displayTotalBatches,
          collectedCount: accumulatedMap.size,
          targetCount: requestedTotal,
        });

        const res = await fetch('/api/integrations/tiktok-koc/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hashtag: trimmed,
            period: targetPeriod,
            limit: batchLimit,
            excludeHandles: Array.from(accumulatedMap.keys()),
            pageOffset: currentPageOffset,
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.results)) {
          if (accumulatedMap.size === 0) {
            const msg = json.message || `Không tìm thấy KOC nào cho hashtag "${trimmed}".`;
            setTagError(msg);
            onNotify?.(msg, 'error');
          }
          break;
        }

        let addedInBatch = 0;
        for (const row of json.results as TikTokHashtagKocResult[]) {
          if (accumulatedMap.size >= requestedTotal) break;
          const key = row.handle.toLowerCase();
          if (!accumulatedMap.has(key)) {
            accumulatedMap.set(key, row);
            addedInBatch++;
          }
        }

        const mergedList = Array.from(accumulatedMap.values()).sort(
          (a, b) =>
            compareVideoAirDateDesc(
              {
                publishedAt: a.matchedHashtagVideo.publishedAt,
                videoId: a.matchedHashtagVideo.videoId,
                views: a.matchedHashtagVideo.views,
              },
              {
                publishedAt: b.matchedHashtagVideo.publishedAt,
                videoId: b.matchedHashtagVideo.videoId,
                views: b.matchedHashtagVideo.views,
              }
            ) || b.matchedHashtagVideo.breakoutRatio - a.matchedHashtagVideo.breakoutRatio
        );
        setTagResults(mergedList);

        setTagBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: displayTotalBatches,
          collectedCount: mergedList.length,
          targetCount: requestedTotal,
        });

        if (addedInBatch === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= 2) break;
        } else {
          consecutiveEmptyBatches = 0;
        }
      }

      if (!tagAbortRef.current && accumulatedMap.size === 0) {
        const periodText = `${targetPeriod.replace('d', '')} ngày qua`;
        const emptyMsg = `Không tìm thấy KOC nào đăng video với hashtag "${trimmed}" trong ${periodText}. Vui lòng kiểm tra lại từ khóa hoặc mở rộng khung thời gian.`;
        setTagError(emptyMsg);
        onNotify?.(emptyMsg, 'warning');
      } else if (!tagAbortRef.current && accumulatedMap.size < requestedTotal) {
        onNotify?.(
          `Chỉ tìm thấy ${accumulatedMap.size}/${requestedTotal} KOC cho từ khóa "${trimmed}" (ít hơn yêu cầu ${requestedTotal - accumulatedMap.size} KOC).`,
          'warning'
        );
      } else if (appendMode && accumulatedMap.size === baseList.length && !tagAbortRef.current) {
        onNotify?.('Đã lấy hết các KOC khớp với hashtag này trên chỉ mục hiện tại.', 'info');
      }

      if (accumulatedMap.size > 0) {
        const finalMerged = Array.from(accumulatedMap.values()).sort(
          (a, b) =>
            compareVideoAirDateDesc(
              {
                publishedAt: a.matchedHashtagVideo.publishedAt,
                videoId: a.matchedHashtagVideo.videoId,
                views: a.matchedHashtagVideo.views,
              },
              {
                publishedAt: b.matchedHashtagVideo.publishedAt,
                videoId: b.matchedHashtagVideo.videoId,
                views: b.matchedHashtagVideo.views,
              }
            ) || b.matchedHashtagVideo.breakoutRatio - a.matchedHashtagVideo.breakoutRatio
        );
        const displayTag = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
        void saveDailyHistorySession({
          tab: 'HASHTAG_DISCOVERY',
          rawInput: trimmed,
          queryKey: trimmed.toLowerCase().replace(/^#+/, ''),
          queryLabel: displayTag,
          tagResults: finalMerged,
        });

        // Tự động kiểm tra đối soát Upaffiliate & lưu vào Bảng Tạm nếu chưa có
        const newHashtagKocsToStage = finalMerged
          .filter((r) => {
            const clean = normalizeKocHandle(r.handle);
            return !existingByHandle.has(clean) && !stagingByHandle.has(clean);
          })
          .map((r) => ({
            channelId: normalizeKocHandle(r.handle),
            channelUrl: r.channelProfile.channelUrl,
            stageName: r.channelProfile.nickname || r.handle,
            phone: r.channelProfile.extractedPhone || undefined,
            followersCount: r.channelProfile.followers || 0,
            avgViews: r.engagementMetrics?.avgViews || 0,
            engagementRate: r.engagementMetrics?.engagementRate,
            discoverySource: 'HASHTAG_DISCOVERY' as const,
            sourceContext: `Hashtag: ${displayTag}`,
            sampleVideoUrl: r.matchedHashtagVideo.videoUrl,
            sampleVideoViews: r.matchedHashtagVideo.views,
            sampleVideoCaption: r.matchedHashtagVideo.captionSnippet,
            discoveredByStaffId: currentUser?.id,
            discoveredByStaffName: currentUser?.name,
          }));

        if (newHashtagKocsToStage.length > 0) {
          void saveStagingKocsBatch(newHashtagKocsToStage).then((res) => {
            if (res.success && res.savedCount > 0) {
              setStagingKocs(res.items);
              onNotify?.(
                `Đã đối soát & tự động lưu ${res.savedCount} KOC chưa có trên Upaffiliate vào Bảng Tạm.`,
                'info'
              );
            }
          });
        }
      }
    } catch {
      if (accumulatedMap.size === 0) {
        const netMsg = 'Không kết nối được dịch vụ quét hashtag TikTok. Vui lòng thử lại.';
        setTagError(netMsg);
        onNotify?.(netMsg, 'error');
      }
    } finally {
      setTagLoading(false);
      setTagBatchProgress(null);
    }
  };

  const runVideoCommentsCrawl = async (
    rawUrl: string,
    options?: { targetCount?: number; appendMode?: boolean }
  ) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setCommentError('Vui lòng nhập đường dẫn video TikTok cần cào bình luận.');
      return;
    }

    const appendMode = Boolean(options?.appendMode && commentData);
    if (!appendMode) {
      setCommentData(null);
    }
    const existingComments = appendMode && commentData ? [...commentData.comments] : [];
    const requestedTotal = appendMode
      ? existingComments.length + (options?.targetCount || COMMENT_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? commentTargetCount) || 40, 5), 1000);
    setCommentRequestedCount(requestedTotal);

    const totalNeeded = Math.max(5, requestedTotal - existingComments.length);
    const totalBatches = Math.max(1, Math.ceil(totalNeeded / COMMENT_BATCH_SIZE));

    commentAbortRef.current = false;
    setCommentLoading(true);
    setCommentError(null);

    const commentMap = new Map<string, TikTokVideoCommentItem>();
    for (const c of existingComments) {
      commentMap.set(c.cid, c);
    }

    let currentCursor = appendMode ? commentData?.nextCursor || existingComments.length : 0;
    let resolvedVideoId = appendMode ? commentData?.videoInfo.videoId : undefined;
    let latestVideoInfo = appendMode ? commentData?.videoInfo : undefined;
    let latestEngine = appendMode ? commentData?.engineUsed : undefined;
    let latestCommentPayload: TikTokVideoCommentsScrapeResult | null = null;

    try {
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (commentAbortRef.current) break;

        const remaining = requestedTotal - commentMap.size;
        if (remaining <= 0) break;
        const batchLimit = Math.min(COMMENT_BATCH_SIZE, remaining);

        setCommentBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches,
          collectedCount: commentMap.size,
          targetCount: requestedTotal,
        });

        const res = await fetch('/api/integrations/tiktok-koc/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: trimmed,
            limit: batchLimit,
            cursor: currentCursor,
            resolvedVideoId,
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !json.videoInfo) {
          if (commentMap.size === 0) {
            const msg = json.message || 'Không lấy được danh sách bình luận của video này. Vui lòng kiểm tra lại đường dẫn video.';
            setCommentError(msg);
            onNotify?.(msg, 'error');
          }
          break;
        }

        if (!latestVideoInfo || json.videoInfo.views > 0) {
          latestVideoInfo = json.videoInfo;
        }
        resolvedVideoId = json.videoInfo.videoId || resolvedVideoId;
        latestEngine = json.engineUsed || latestEngine;
        currentCursor = typeof json.nextCursor === 'number' ? json.nextCursor : currentCursor + batchLimit;

        let addedInBatch = 0;
        for (const c of (json.comments || []) as TikTokVideoCommentItem[]) {
          if (!commentMap.has(c.cid)) {
            commentMap.set(c.cid, c);
            addedInBatch++;
          }
        }

        const allComments = Array.from(commentMap.values()).sort((a, b) => {
          const scoreA =
            a.intentType === 'BUYING_INTENT' ? 2 : a.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
          const scoreB =
            b.intentType === 'BUYING_INTENT' ? 2 : b.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.likeCount - a.likeCount;
        });

        const buyingIntentCount = allComments.filter((c) => c.intentType === 'BUYING_INTENT').length;
        const feedbackCount = allComments.filter((c) => c.intentType === 'PRODUCT_FEEDBACK').length;
        const totalLikesOnComments = allComments.reduce((s, c) => s + c.likeCount, 0);
        const buyingIntentRate =
          allComments.length > 0
            ? Number(((buyingIntentCount / allComments.length) * 100).toFixed(1))
            : 0;

        latestCommentPayload = {
          engineUsed: latestEngine || 'TikTok Comment API + SSR WAF Solver (100% Real Data)',
          nextCursor: currentCursor,
          hasMore: Boolean(json.hasMore),
          videoInfo: {
            ...(latestVideoInfo || json.videoInfo),
            commentsCount: Math.max(
              Number((latestVideoInfo || json.videoInfo).commentsCount || 0),
              allComments.length
            ),
          },
          summary: {
            totalFetched: allComments.length,
            buyingIntentCount,
            buyingIntentRate,
            feedbackCount,
            totalLikesOnComments,
          },
          comments: allComments,
        };
        setCommentData(latestCommentPayload);

        setCommentBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches,
          collectedCount: allComments.length,
          targetCount: requestedTotal,
        });

        if (!json.hasMore || addedInBatch === 0) break;
      }

      if (!commentAbortRef.current && commentMap.size === 0) {
        const emptyCommentMsg = 'Video này chưa có bình luận công khai hoặc đã tắt bình luận trên TikTok.';
        setCommentError(emptyCommentMsg);
        onNotify?.(emptyCommentMsg, 'warning');
      } else if (!commentAbortRef.current && commentMap.size < requestedTotal) {
        onNotify?.(
          `Chỉ lấy được ${commentMap.size}/${requestedTotal} bình luận công khai (ít hơn yêu cầu ${requestedTotal - commentMap.size} bình luận).`,
          'warning'
        );
      }

      if (latestCommentPayload && latestCommentPayload.comments.length > 0) {
        const vid = latestCommentPayload.videoInfo.videoId || trimmed;
        const author = latestCommentPayload.videoInfo.authorHandle
          ? `@${latestCommentPayload.videoInfo.authorHandle}`
          : 'Video TikTok';
        void saveDailyHistorySession({
          tab: 'COMMENTS_AND_TRENDING',
          rawInput: trimmed,
          queryKey: String(vid).toLowerCase(),
          queryLabel: `${author} · #${String(vid).slice(-6)}`,
          commentData: latestCommentPayload,
        });
      }
    } catch {
      if (commentMap.size === 0) {
        const netMsg = 'Không kết nối được dịch vụ cào bình luận video TikTok. Vui lòng thử lại.';
        setCommentError(netMsg);
        onNotify?.(netMsg, 'error');
      }
    } finally {
      setCommentLoading(false);
      setCommentBatchProgress(null);
    }
  };

  const [trendingHandleSearching, setTrendingHandleSearching] = useState(false);

  const runTrendingCreatorsCrawl = async (
    targetCat?: TrendingKocCategoryKey,
    options?: { targetCount?: number; appendMode?: boolean }
  ) => {
    const cat = targetCat ?? trendingCategory;
    if (targetCat) setTrendingCategory(targetCat);

    const appendMode = Boolean(options?.appendMode);
    const desiredTotal = Math.max(
      1,
      Math.min(500, options?.targetCount ?? trendingTargetCount ?? KOC_BATCH_SIZE)
    );

    trendingAbortRef.current = false;
    setTrendingLoading(true);

    const accumulated = new Map<string, TikTokTrendingCreatorItem>();
    const excludedSet = new Set<string>();

    if (appendMode) {
      for (const existing of trendingCreators) {
        const h = existing.handle.toLowerCase();
        accumulated.set(h, existing);
        excludedSet.add(h);
      }
    } else {
      setTrendingCreators([]);
      setTrendingFilter('ALL');
      setTrendingSearch('');
      trendingNextPageOffsetRef.current = 0;
    }

    const initialCount = accumulated.size;
    const targetFinalCount = appendMode ? initialCount + desiredTotal : desiredTotal;
    setTrendingRequestedCount(targetFinalCount);
    const remainingNeeded = Math.max(1, targetFinalCount - initialCount);
    const estimatedBatches = Math.max(1, Math.ceil(remainingNeeded / 20));
    const maxBatches = Math.min(45, Math.max(estimatedBatches + 4, estimatedBatches * 2));
    let consecutiveZeroYield = 0;

    const catLabel =
      TRENDING_CATEGORY_OPTIONS.find((o) => o.key === cat)?.label || 'Tất cả ngành hàng';

    try {
      for (let batchIdx = 0; batchIdx < maxBatches; batchIdx++) {
        if (trendingAbortRef.current) break;
        const currentNeed = targetFinalCount - accumulated.size;
        if (currentNeed <= 0) break;

        const currentOffset = trendingNextPageOffsetRef.current;
        trendingNextPageOffsetRef.current = currentOffset + 1;

        setTrendingBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: Math.max(estimatedBatches, batchIdx + 1),
          collectedCount: accumulated.size,
          targetCount: targetFinalCount,
        });

        const batchLimit = Math.min(25, Math.max(KOC_BATCH_SIZE, currentNeed));
        const res = await fetch('/api/integrations/tiktok-koc/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trendingCreators: true,
            category: cat,
            limit: batchLimit,
            pageOffset: currentOffset,
            excludeHandles: Array.from(excludedSet),
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.creators)) {
          if (accumulated.size === 0) {
            onNotify?.(
              json.message || 'Không tải được danh sách KOC xu hướng TikTok.',
              'error'
            );
          }
          break;
        }

        const incoming: TikTokTrendingCreatorItem[] = json.creators;
        let addedInBatch = 0;
        for (const item of incoming) {
          const h = item.handle.toLowerCase();
          if (!accumulated.has(h)) {
            accumulated.set(h, item);
            excludedSet.add(h);
            addedInBatch++;
          }
          if (accumulated.size >= targetFinalCount) break;
        }

        const currentList = Array.from(accumulated.values());
        setTrendingCreators(currentList);
        setTrendingBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches: Math.max(estimatedBatches, batchIdx + 1),
          collectedCount: currentList.length,
          targetCount: targetFinalCount,
        });

        if (currentList.length >= targetFinalCount) break;
        if (addedInBatch === 0) {
          consecutiveZeroYield++;
          if (consecutiveZeroYield >= 2) break;
        } else {
          consecutiveZeroYield = 0;
        }
      }

      const finalCount = accumulated.size;
      const newlyAdded = finalCount - initialCount;
      if (finalCount > 0 && finalCount < targetFinalCount && !trendingAbortRef.current) {
        onNotify?.(
          `Chỉ tìm thấy ${finalCount}/${targetFinalCount} KOC xu hướng ngành "${catLabel}" (ít hơn yêu cầu ${targetFinalCount - finalCount} KOC).`,
          'warning'
        );
      } else if (finalCount > 0) {
        onNotify?.(
          appendMode
            ? `Đã quét thêm ${newlyAdded} KOC xu hướng ngành "${catLabel}" (tổng ${finalCount} KOC)`
            : `Đã quét xong ${finalCount} KOC xu hướng ngành "${catLabel}"`,
          'success'
        );
      } else {
        onNotify?.(
          'Chưa lấy được danh sách KOC xu hướng. Vui lòng bấm Quét lại sau ít giây.',
          'warning'
        );
      }

      if (finalCount > 0) {
        const finalTrendingList = Array.from(accumulated.values());
        void saveDailyHistorySession({
          tab: 'CHANNEL_AND_VIDEO_TOOLS',
          rawInput: cat,
          queryKey: cat.toLowerCase(),
          queryLabel: catLabel,
          trendingCategory: cat,
          trendingCreators: finalTrendingList,
        });
      }
    } catch {
      if (accumulated.size === 0) {
        onNotify?.('Không kết nối được dịch vụ quét KOC xu hướng TikTok.', 'error');
      }
    } finally {
      setTrendingLoading(false);
      setTrendingBatchProgress(null);
    }
  };

  const runQuickTrendingHandleLookup = async (rawQuery: string) => {
    const cleanHandle = rawQuery
      .trim()
      .replace(/^https?:\/\/(?:www\.|m\.)?tiktok\.com\/@/i, '')
      .replace(/^@+/, '')
      .split(/[/?#\s]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');

    if (cleanHandle.length < 2) return;

    setTrendingHandleSearching(true);
    try {
      const res = await fetch(
        `/api/integrations/tiktok-koc/scrape?handle=${encodeURIComponent(cleanHandle)}&period=30d`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data?.channelProfile) {
        const p = json.data.channelProfile;
        const resolvedHandle = String(p.handle || cleanHandle).replace(/^@+/, '');
        const newCreator: TikTokTrendingCreatorItem = {
          id: `live-${resolvedHandle}`,
          handle: resolvedHandle,
          nickname: p.nickname || resolvedHandle,
          avatarUrl: p.avatarUrl,
          bio: p.bio || '',
          verified: Boolean(p.isVerified),
          followers: Number(p.followers || 0),
          totalLikes: Number(p.totalLikes || 0),
          videoCount: Number(p.videoCount || 0),
          followingCount: Number(p.following || 0),
          secUid: '',
          channelUrl: p.channelUrl || `https://www.tiktok.com/@${resolvedHandle}`,
          extractedPhone: p.extractedPhone,
          extractedEmail: p.extractedEmail,
          categoryKey: trendingCategory,
          categoryLabel:
            TRENDING_CATEGORY_OPTIONS.find((o) => o.key === trendingCategory)?.label ||
            'Tra cứu trực tiếp',
        };
        setTrendingCreators((prev) => {
          const exists = prev.some(
            (c) => c.handle.toLowerCase() === resolvedHandle.toLowerCase()
          );
          if (exists) {
            return prev.map((c) =>
              c.handle.toLowerCase() === resolvedHandle.toLowerCase() ? newCreator : c
            );
          }
          return [newCreator, ...prev];
        });
      }
    } catch {
      // ignore
    } finally {
      setTrendingHandleSearching(false);
    }
  };

  const filteredCompResults = useMemo(() => {
    const filtered = compResults.filter((r) => {
      const c = r.competitorCollaboration;
      const p = r.channelProfile;
      const e = r.engagementMetrics;
      const isExisting = existingByHandle.has(r.handle) || c.isAlreadyInUpbase;
      const reviewSum = getChannelSummary(r.handle);
      const isSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'SUITABLE' || reviewSum.suitableCount > 0)
      );
      const isNotSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'NOT_SUITABLE' || reviewSum.notSuitableCount > 0)
      );

      if (compFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (compFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (compFilter === 'PAID_BOOKING' && c.collaborationType !== 'PAID_BOOKING') return false;
      if (compFilter === 'AFFILIATE_CART' && c.collaborationType !== 'AFFILIATE_CART') return false;
      if (compFilter === 'HAS_PHONE' && !p.extractedPhone) return false;
      if (compFilter === 'SUITABLE' && !isSuitable) return false;
      if (compFilter === 'NOT_SUITABLE' && !isNotSuitable) return false;

      if (!matchesFollowerTier(p.followers, compFollowerTier)) return false;
      if (compMinViews > 0 && c.latestCollabViews < compMinViews) return false;
      if (compMinEr > 0 && e.engagementRate < compMinEr) return false;

      if (compSearchQuery.trim()) {
        const q = compSearchQuery.trim().toLowerCase();
        const cleanQ = q.replace(/^@+/, '');
        const matchHandle = p.handle.toLowerCase().includes(cleanQ);
        const matchName = p.nickname.toLowerCase().includes(cleanQ);
        const matchProd = c.competitorProductPromoted.toLowerCase().includes(cleanQ);
        const matchCaption = c.latestCollabCaption.toLowerCase().includes(cleanQ);
        const matchPhone = (p.extractedPhone || '').toLowerCase().includes(cleanQ);
        if (!matchHandle && !matchName && !matchProd && !matchCaption && !matchPhone) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (compSortBy === 'FOLLOWERS_DESC') {
        return b.channelProfile.followers - a.channelProfile.followers;
      }
      if (compSortBy === 'ER_DESC') {
        return b.engagementMetrics.engagementRate - a.engagementMetrics.engagementRate;
      }
      if (compSortBy === 'LATEST_DESC') {
        return compareVideoAirDateDesc(
          {
            publishedAt: a.competitorCollaboration.latestCollabPublishedAt,
            videoId: a.competitorCollaboration.latestCollabVideoId,
            views: a.competitorCollaboration.latestCollabViews,
          },
          {
            publishedAt: b.competitorCollaboration.latestCollabPublishedAt,
            videoId: b.competitorCollaboration.latestCollabVideoId,
            views: b.competitorCollaboration.latestCollabViews,
          }
        );
      }
      return (
        b.competitorCollaboration.latestCollabViews -
        a.competitorCollaboration.latestCollabViews
      );
    });
  }, [
    compResults,
    compFilter,
    compFollowerTier,
    compMinViews,
    compMinEr,
    compSortBy,
    compSearchQuery,
    existingByHandle,
    getChannelSummary,
  ]);

  const filteredTagResults = useMemo(() => {
    const filtered = tagResults.filter((r) => {
      const p = r.channelProfile;
      const v = r.matchedHashtagVideo;
      const e = r.engagementMetrics;
      const isExisting = existingByHandle.has(r.handle);
      const reviewSum = getChannelSummary(r.handle);
      const isSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'SUITABLE' || reviewSum.suitableCount > 0)
      );
      const isNotSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'NOT_SUITABLE' || reviewSum.notSuitableCount > 0)
      );

      if (tagFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (tagFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (tagFilter === 'VIRAL_BREAKOUT' && v.breakoutRatio < 1) return false;
      if (tagFilter === 'HAS_PHONE' && !p.extractedPhone) return false;
      if (tagFilter === 'SUITABLE' && !isSuitable) return false;
      if (tagFilter === 'NOT_SUITABLE' && !isNotSuitable) return false;

      if (!matchesFollowerTier(p.followers, tagFollowerTier)) return false;
      if (tagMinViews > 0 && v.views < tagMinViews) return false;
      if (tagMinEr > 0 && e.engagementRate < tagMinEr) return false;

      if (tagSearchQuery.trim()) {
        const q = tagSearchQuery.trim().toLowerCase();
        const cleanQ = q.replace(/^@+/, '');
        const matchHandle = p.handle.toLowerCase().includes(cleanQ);
        const matchName = p.nickname.toLowerCase().includes(cleanQ);
        const matchCaption = v.captionSnippet.toLowerCase().includes(cleanQ);
        const matchPhone = (p.extractedPhone || '').toLowerCase().includes(cleanQ);
        if (!matchHandle && !matchName && !matchCaption && !matchPhone) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (tagSortBy === 'FOLLOWERS_DESC') {
        return b.channelProfile.followers - a.channelProfile.followers;
      }
      if (tagSortBy === 'ER_DESC') {
        return b.engagementMetrics.engagementRate - a.engagementMetrics.engagementRate;
      }
      if (tagSortBy === 'LATEST_DESC') {
        return compareVideoAirDateDesc(
          {
            publishedAt: a.matchedHashtagVideo.publishedAt,
            videoId: a.matchedHashtagVideo.videoId,
            views: a.matchedHashtagVideo.views,
          },
          {
            publishedAt: b.matchedHashtagVideo.publishedAt,
            videoId: b.matchedHashtagVideo.videoId,
            views: b.matchedHashtagVideo.views,
          }
        );
      }
      return b.matchedHashtagVideo.views - a.matchedHashtagVideo.views;
    });
  }, [
    tagResults,
    tagFilter,
    tagFollowerTier,
    tagMinViews,
    tagMinEr,
    tagSortBy,
    tagSearchQuery,
    existingByHandle,
    getChannelSummary,
  ]);

  const filteredComments = useMemo(() => {
    const list = commentData?.comments || [];
    const filtered = list.filter((c) => {
      if (commentFilter === 'HAS_PHONE') {
        if (!c.extractedPhone) return false;
      } else if (commentFilter !== 'ALL' && c.intentType !== commentFilter) {
        return false;
      }
      if (commentSearch.trim()) {
        const q = commentSearch.trim().toLowerCase();
        const cleanQ = q.replace(/^@+/, '');
        if (
          !c.text.toLowerCase().includes(cleanQ) &&
          !c.username.toLowerCase().includes(cleanQ) &&
          !c.nickname.toLowerCase().includes(cleanQ)
        ) {
          return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (commentSortBy === 'LIKES_DESC') return b.likeCount - a.likeCount;
      if (commentSortBy === 'NEWEST') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      const scoreA =
        a.intentType === 'BUYING_INTENT' ? 2 : a.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
      const scoreB =
        b.intentType === 'BUYING_INTENT' ? 2 : b.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.likeCount - a.likeCount;
    });
  }, [commentData, commentFilter, commentSearch, commentSortBy]);

  const filteredTrendingCreators = useMemo(() => {
    return trendingCreators.filter((c) => {
      const isExisting = existingByHandle.has(c.handle.toLowerCase());
      const reviewSum = getChannelSummary(c.handle);
      const isSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'SUITABLE' || reviewSum.suitableCount > 0)
      );
      const isNotSuitable = Boolean(
        reviewSum &&
          (reviewSum.latestReview.verdict === 'NOT_SUITABLE' || reviewSum.notSuitableCount > 0)
      );
      if (trendingFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (trendingFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (trendingFilter === 'VERIFIED' && !c.verified) return false;
      if (trendingFilter === 'HAS_CONTACT' && !c.extractedPhone && !c.extractedEmail) return false;
      if (trendingFilter === 'SUITABLE' && !isSuitable) return false;
      if (trendingFilter === 'NOT_SUITABLE' && !isNotSuitable) return false;
      if (!matchesFollowerTier(c.followers, trendingFollowerTier)) return false;

      if (trendingSearch.trim()) {
        const q = trendingSearch.trim().toLowerCase();
        const cleanQ = q.replace(/^@+/, '');
        if (
          !c.handle.toLowerCase().includes(cleanQ) &&
          !c.nickname.toLowerCase().includes(cleanQ) &&
          !c.bio.toLowerCase().includes(cleanQ) &&
          !(c.latestVideoCaption || '').toLowerCase().includes(cleanQ) &&
          !(c.categoryLabel || '').toLowerCase().includes(cleanQ)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    trendingCreators,
    trendingFilter,
    trendingFollowerTier,
    trendingSearch,
    existingByHandle,
    getChannelSummary,
  ]);

  const compStats = useMemo(() => {
    const total = compResults.length;
    const existingCount = compResults.filter(
      (r) => existingByHandle.has(r.handle) || r.competitorCollaboration.isAlreadyInUpbase
    ).length;
    const newCount = total - existingCount;
    const phoneCount = compResults.filter((r) => Boolean(r.channelProfile.extractedPhone)).length;
    const totalCompVideos = compResults.reduce(
      (sum, r) => sum + r.competitorCollaboration.competitorVideoCount,
      0
    );
    const totalCompViews = compResults.reduce(
      (sum, r) => sum + r.competitorCollaboration.latestCollabViews,
      0
    );
    return { total, existingCount, newCount, phoneCount, totalCompVideos, totalCompViews };
  }, [compResults, existingByHandle]);

  const tagStats = useMemo(() => {
    const total = tagResults.length;
    const existingCount = tagResults.filter((r) => existingByHandle.has(r.handle)).length;
    const newCount = total - existingCount;
    const viralCount = tagResults.filter((r) => r.matchedHashtagVideo.breakoutRatio >= 1).length;
    const phoneCount = tagResults.filter((r) => Boolean(r.channelProfile.extractedPhone)).length;
    return { total, existingCount, newCount, viralCount, phoneCount };
  }, [tagResults, existingByHandle]);

  const handleSaveSingleKoc = (item: TikTokScrapedKocResult) => {
    const clean = item.handle.toLowerCase().replace(/^@+/, '');
    const matched = existingByHandle.get(clean);
    const mapped = mapScrapedResultToKocItem(item, matched, {
      bookingPic: currentUser?.name,
    });
    if (matched) {
      onSaveScrapedKocs({ created: [], updated: [mapped] });
    } else {
      onSaveScrapedKocs({ created: [mapped], updated: [] });
    }
  };

  const handleSaveBulkKocs = (items: TikTokScrapedKocResult[]) => {
    if (items.length === 0) return;
    const created: KocItem[] = [];
    const updated: KocItem[] = [];

    for (const item of items) {
      const clean = item.handle.toLowerCase().replace(/^@+/, '');
      const matched = existingByHandle.get(clean);
      const mapped = mapScrapedResultToKocItem(item, matched, {
        bookingPic: currentUser?.name,
      });
      if (matched) {
        updated.push(mapped);
      } else {
        created.push(mapped);
      }
    }

    onSaveScrapedKocs({ created, updated });
  };

  const mapTrendingItemToKoc = (
    c: TikTokTrendingCreatorItem,
    existing?: KocItem
  ): KocItem => {
    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const flw = c.followers || 0;
    const tier: KocTier =
      flw >= 500_000
        ? 'TIER_1_CELEB'
        : flw >= 150_000
          ? 'TIER_2_MACRO'
          : flw >= 30_000
            ? 'TIER_3_MICRO'
            : 'TIER_4_AFFILIATE';
    const tierLabel =
      tier === 'TIER_1_CELEB'
        ? 'Tầng 1: Celeb / Mega'
        : tier === 'TIER_2_MACRO'
          ? 'Tầng 2: Macro'
          : tier === 'TIER_3_MICRO'
            ? 'Tầng 3: Micro'
            : 'Tầng 4: Affiliate';
    const salaryGrade: SalaryGrade =
      flw >= 500_000
        ? 'KL6'
        : flw >= 200_000
          ? 'KL5'
          : flw >= 100_000
            ? 'KL4'
            : flw >= 30_000
              ? 'KL3'
              : 'KL2';
    const rateCardVideo =
      flw >= 500_000
        ? 15_000_000
        : flw >= 200_000
          ? 8_000_000
          : flw >= 100_000
            ? 4_500_000
            : flw >= 30_000
              ? 2_000_000
              : 1_000_000;

    const categoryMapping: {
      tepKenh: KocItem['tepKenh'];
      kocCategory: KocItem['kocCategory'];
    } = (() => {
      switch (c.categoryKey) {
        case 'MOM_BABY':
          return { tepKenh: 'Mẹ bé (bé)', kocCategory: 'Mom and baby' };
        case 'MEN_CARE':
          return { tepKenh: 'Review Nam', kocCategory: 'Personal care' };
        case 'FASHION_LIFESTYLE':
          return { tepKenh: 'Thời trang (review)', kocCategory: 'Fashion' };
        case 'HEALTH_WELLNESS':
          return { tepKenh: 'Health', kocCategory: 'Lifestyle' };
        case 'MAKEUP':
        case 'SKINCARE':
        case 'BODY_HAIR':
        default:
          return { tepKenh: 'Beauty', kocCategory: 'Personal care' };
      }
    })();

    if (existing) {
      return {
        ...existing,
        channelId: c.handle,
        channelLink: c.channelUrl,
        stageName: existing.stageName || c.nickname,
        avatarUrl: c.avatarUrl || existing.avatarUrl,
        bio: c.bio || existing.bio,
        phone: existing.phone || c.extractedPhone || '',
        zalo: existing.zalo || c.extractedPhone || existing.phone || '',
        email: existing.email || c.extractedEmail,
        bookingPic: existing.bookingPic || currentUser?.name,
        followers: c.followers || existing.followers,
        totalLikes: c.totalLikes || existing.totalLikes,
        videoCount: c.videoCount || existing.videoCount,
        engagementRate: c.engagementRate ?? existing.engagementRate,
        tiktokSellerSyncedAt: nowStr,
        metricsUpdatedAt: getVietnamDateYmd(),
      };
    }

    return {
      id: `koc-tt-${c.handle.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      channelId: c.handle,
      channelLink: c.channelUrl,
      stageName: c.nickname || c.handle,
      realName: c.nickname || c.handle,
      avatarUrl: c.avatarUrl,
      tier,
      tierLabel,
      salaryGrade,
      segment: getSegmentFromSalaryGrade(salaryGrade),
      tepKenh: categoryMapping.tepKenh,
      creatorCategory: categoryMapping.tepKenh,
      kocCategory: categoryMapping.kocCategory,
      niche: c.categoryLabel || 'KOC Xu hướng',
      followers: c.followers,
      avgViews: c.latestVideoViews || Math.round(c.followers * 0.25),
      rateCardVideo,
      bookingFormat: 'Booking Video KOC',
      bookingPic: currentUser?.name,
      platforms: ['TIKTOK'],
      tiktokChannel: c.channelUrl,
      phone: c.extractedPhone || '',
      zalo: c.extractedPhone || '',
      email: c.extractedEmail,
      location: '',
      cccd: '',
      bankName: '',
      bankAccount: '',
      bio: c.bio,
      totalLikes: c.totalLikes,
      videoCount: c.videoCount,
      avgLikes: c.latestVideoLikes || 0,
      engagementRate: c.engagementRate || 0,
      metricsUpdatedAt: getVietnamDateYmd(),
      tiktokSellerSyncedAt: nowStr,
      tiktokAccountHealth: 'TỐT',
      statusKoc: 'SẴN_SÀNG',
      reliabilityScore: 9.0,
    };
  };

  const handleSaveSingleTrendingKoc = (item: TikTokTrendingCreatorItem) => {
    const clean = item.handle.toLowerCase().replace(/^@+/, '');
    const matched = existingByHandle.get(clean);
    const mapped = mapTrendingItemToKoc(item, matched);
    if (matched) {
      onSaveScrapedKocs({ created: [], updated: [mapped] });
    } else {
      onSaveScrapedKocs({ created: [mapped], updated: [] });
    }
  };

  const handleSaveBulkTrendingKocs = (items: TikTokTrendingCreatorItem[]) => {
    if (items.length === 0) return;
    const created: KocItem[] = [];
    const updated: KocItem[] = [];
    for (const item of items) {
      const clean = item.handle.toLowerCase().replace(/^@+/, '');
      const matched = existingByHandle.get(clean);
      const mapped = mapTrendingItemToKoc(item, matched);
      if (matched) {
        updated.push(mapped);
      } else {
        created.push(mapped);
      }
    }
    onSaveScrapedKocs({ created, updated });
  };

  const handleExportCompetitorCsv = () => {
    if (filteredCompResults.length === 0) return;
    const csv = buildCompetitorKocsCsv(filteredCompResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koc-doi-thu-${compProfile?.handle || 'tiktok'}-${getVietnamDateYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất CSV ${filteredCompResults.length} KOC làm cho đối thủ`, 'success');
  };

  const handleExportHashtagCsv = () => {
    if (filteredTagResults.length === 0) return;
    const csv = buildScrapedKocsCsv(filteredTagResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koc-hashtag-${hashtagInput.replace(/[^a-z0-9]/gi, '')}-${getVietnamDateYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất CSV ${filteredTagResults.length} KOC theo hashtag`, 'success');
  };

  const handleExportCommentsCsv = () => {
    if (!commentData || commentData.comments.length === 0) return;
    const csv = buildVideoCommentsCsv({
      ...commentData,
      comments: filteredComments,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binh-luan-video-${commentData.videoInfo.videoId}-${getVietnamDateYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất CSV ${filteredComments.length} bình luận video`, 'success');
  };

  const handleExportTrendingCsv = () => {
    if (filteredTrendingCreators.length === 0) return;
    const csv = buildTrendingCreatorsCsv(filteredTrendingCreators);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koc-xu-huong-${trendingCategory.toLowerCase()}-${getVietnamDateYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất CSV ${filteredTrendingCreators.length} KOC xu hướng`, 'success');
  };

  const renderKocStatusBadge = (
    matchedKoc: KocItem | undefined,
    isExisting: boolean,
    rawHandle?: string
  ) => {
    const clean = rawHandle ? normalizeKocHandle(rawHandle) : '';
    const inStaging = clean ? stagingByHandle.get(clean) : undefined;

    // 1. Nếu đã có trong Upaffiliate Master Data (danh bạ chính thức)
    if (matchedKoc) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateToKocMaster) onNavigateToKocMaster(matchedKoc.id);
          }}
          title={`Đã có trên Upaffiliate Master · ${matchedKoc.salaryGrade || ''} · ${matchedKoc.bookingPic || ''}`}
          className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-positive-soft text-positive border border-positive/30 hover:bg-positive hover:text-white transition-colors text-2xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
          <span>✓ Upaffiliate Master</span>
        </button>
      );
    }

    // 2. Nếu chưa có trên Upaffiliate nhưng đã lưu trong bảng tạm (Staging)
    if (inStaging) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPendingStagingModalOpen(true);
          }}
          title={`Chưa có trên Upaffiliate · Đã lưu bảng tạm lúc ${new Date(inStaging.discoveredAt).toLocaleDateString('vi-VN')} · Nhấp để mở bảng tạm`}
          className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-accent-soft text-accent border border-accent/30 hover:bg-accent hover:text-white transition-colors text-2xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
          <span>+ Đã lưu bảng tạm</span>
        </button>
      );
    }

    // 3. Nếu chưa có trên Upaffiliate và chưa có trong bảng tạm
    return (
      <span
        title="Chưa có trên Upaffiliate"
        className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-2xs font-medium whitespace-nowrap shrink-0 bg-sunken text-ink-2 border border-line"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />
        <span>Chưa có trên Upaffiliate</span>
      </span>
    );
  };

  // --- BỘ RENDER 5 CỘT ĐỒNG NHẤT CHO TOÀN BỘ DANH SÁCH KOC CÀO RA ---
  const getFollowerTierShortLabel = (followers: number) => {
    if (followers >= 500_000) return 'Mega';
    if (followers >= 200_000) return 'Macro';
    if (followers >= 50_000) return 'Micro';
    return 'Nano';
  };

  const renderUnifiedKocIdentityCell = (params: {
    handle: string;
    nickname: string;
    avatarUrl?: string;
    channelUrl: string;
    verified?: boolean;
    phone?: string;
    email?: string;
    matchedKoc?: KocItem;
    isExisting: boolean;
  }) => {
    const reviewSummary = getChannelSummary(params.handle);
    const cleanHandle = params.handle.replace(/^@+/, '');
    return (
      <div className="flex items-start gap-2.5 min-w-0">
        <Avatar name={params.nickname || cleanHandle} src={params.avatarUrl} size={36} className="shrink-0 mt-0.5" />
        <div className="grid gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <a
              href={params.channelUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1 min-w-0 break-all"
              title={`@${cleanHandle}`}
            >
              <span className="font-code text-xs font-semibold text-ink hover:text-accent break-all">@{cleanHandle}</span>
              <ExternalLink className="w-3 h-3 text-ink-3 shrink-0" />
            </a>
            {params.verified && (
              <span
                title="Kênh có tích xanh TikTok"
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-positive text-white text-3xs font-semibold shrink-0"
              >
                ✓
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {renderKocStatusBadge(params.matchedKoc, params.isExisting, params.handle)}
            {reviewSummary && (
              <KocChannelReviewBadge
                summary={reviewSummary}
                compact
                onClick={(e) => {
                  e.stopPropagation();
                  openChannelReviewModal({
                    handle: params.handle,
                    channelName: params.nickname || params.handle,
                    channelUrl: params.channelUrl,
                    avatarUrl: params.avatarUrl,
                    sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                  });
                }}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 text-2xs text-ink-2">
            <span className="truncate max-w-[150px] font-medium" title={params.nickname || cleanHandle}>
              {params.nickname || cleanHandle}
            </span>
            {params.phone ? (
              <>
                <span className="text-ink-3 shrink-0">·</span>
                <span className="text-ink font-code inline-flex items-center gap-0.5 tabular-nums shrink-0">
                  <Phone className="w-2.5 h-2.5 text-accent shrink-0" />
                  <span>{params.phone}</span>
                </span>
              </>
            ) : params.email ? (
              <>
                <span className="text-ink-3 shrink-0">·</span>
                <span className="text-ink-3 font-code truncate max-w-[130px]" title={params.email}>{params.email}</span>
              </>
            ) : null}
          </div>
          {reviewSummary && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openChannelReviewModal({
                  handle: params.handle,
                  channelName: params.nickname || params.handle,
                  channelUrl: params.channelUrl,
                  avatarUrl: params.avatarUrl,
                  sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                });
              }}
              className={`text-left text-2xs hover:underline grid gap-0.5 cursor-pointer ${
                reviewSummary.latestReview.verdict === 'NOT_SUITABLE'
                  ? 'text-critical'
                  : reviewSummary.latestReview.verdict === 'SUITABLE'
                    ? 'text-positive'
                    : 'text-warning'
              }`}
              title={`Ý kiến: ${reviewSummary.latestReview.note || reviewSummary.latestReview.reasonTags.join(', ')}`}
            >
              <span className="truncate font-medium">
                ĐG: {reviewSummary.latestReview.reviewerName} ({reviewSummary.latestReview.timeLabel}{' '}
                {reviewSummary.latestReview.dateLabel})
              </span>
              {reviewSummary.latestReview.note && (
                <span className="truncate text-ink-2">
                  Ý kiến: &ldquo;{reviewSummary.latestReview.note}&rdquo;
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderUnifiedKocScaleCell = (params: {
    followers: number;
    videoCount: number;
    engagementRate?: number;
    totalLikes?: number;
  }) => {
    const tierBadge = getFollowerTierShortLabel(params.followers);
    return (
      <div className="grid gap-0.5 justify-items-end tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink">
            {formatFollowers(params.followers)} flw
          </span>
          <span className="px-1.5 py-0.2 rounded bg-surface-2 border border-line text-3xs font-medium text-ink-2">
            {tierBadge}
          </span>
        </div>
        <div className="text-2xs text-ink-3">
          {params.engagementRate ? (
            <span className="text-positive font-semibold">ER {params.engagementRate}%</span>
          ) : params.totalLikes ? (
            <span>{formatFollowers(params.totalLikes)} tim</span>
          ) : null}
          {(params.engagementRate || params.totalLikes) && params.videoCount > 0 ? ' · ' : ''}
          {params.videoCount > 0 ? <span>{formatNumber(params.videoCount)} video</span> : null}
        </div>
      </div>
    );
  };

  const renderUnifiedVideoCell = (params: {
    videoUrl?: string;
    caption?: string;
    views?: number;
    likes?: number;
    publishedAt?: string;
  }) => {
    if (!params.videoUrl) {
      return <span className="text-2xs text-ink-3">—</span>;
    }
    return (
      <div className="grid gap-0.5 min-w-0 max-w-[290px]">
        <a
          href={params.videoUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={params.caption}
          className="text-xs text-ink hover:text-accent truncate inline-flex items-center gap-1.5 font-medium"
        >
          <Video className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">{params.caption || 'Xem video TikTok'}</span>
        </a>
        <div className="flex items-center gap-1.5 text-2xs text-ink-3 tabular-nums pl-5">
          <span className="font-semibold text-ink">
            {params.views ? `${formatNumber(params.views)} view` : 'Video mới'}
          </span>
          {params.likes ? (
            <>
              <span>·</span>
              <span>{formatNumber(params.likes)} tim</span>
            </>
          ) : null}
          {params.publishedAt ? (
            <>
              <span>·</span>
              <span>{formatDate(params.publishedAt)}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const renderUnifiedBrandReviewCell = (params: {
    handle: string;
    nickname?: string;
    avatarUrl?: string;
    channelUrl: string;
  }) => {
    const reviewSummary = getChannelSummary(params.handle);
    const openForVerdict = (verdict?: 'SUITABLE' | 'CAUTION' | 'NOT_SUITABLE') => {
      openChannelReviewModal({
        handle: params.handle,
        channelName: params.nickname || params.handle,
        channelUrl: params.channelUrl,
        avatarUrl: params.avatarUrl,
        initialVerdict: verdict,
        sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
      });
    };

    if (!reviewSummary) {
      return (
        <div
          className="grid gap-1 min-w-0 max-w-[235px]"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-2xs text-ink-3">Chưa có đánh giá theo Brand</span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => openForVerdict('SUITABLE')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-positive/30 bg-positive-soft text-positive text-2xs font-semibold hover:bg-positive-soft/80 transition cursor-pointer"
              title="Đánh giá kênh Phù hợp với Brand"
            >
              <Check className="w-3 h-3 shrink-0" />
              <span>Phù hợp</span>
            </button>
            <button
              type="button"
              onClick={() => openForVerdict('NOT_SUITABLE')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-critical/30 bg-critical-soft text-critical text-2xs font-semibold hover:bg-critical-soft/80 transition cursor-pointer"
              title="Đánh giá kênh Không phù hợp với Brand"
            >
              <XCircle className="w-3 h-3 shrink-0" />
              <span>Không phù hợp</span>
            </button>
          </div>
        </div>
      );
    }

    const isQuickExpanded = quickExpandedChannelHandle === reviewSummary.channelHandle;

    return (
      <div
        className="grid gap-1 min-w-0 max-w-[260px]"
        onClick={(e) => e.stopPropagation()}
      >
        <KocChannelReviewBadge
          summary={reviewSummary}
          onClick={() => openForVerdict()}
        />
        <button
          type="button"
          onClick={() => openForVerdict()}
          className="text-left text-2xs leading-snug grid gap-0.5 hover:underline cursor-pointer"
          title={`Ý kiến: ${reviewSummary.latestReview.note || reviewSummary.latestReview.reasonTags.join(', ')}`}
        >
          <span className="truncate font-medium text-ink-2">
            {reviewSummary.latestReview.reviewerName} · {reviewSummary.latestReview.timeLabel}{' '}
            {reviewSummary.latestReview.dateLabel}
          </span>
          {reviewSummary.latestReview.note && (
            <span className="truncate text-ink">
              Ý kiến: &ldquo;{reviewSummary.latestReview.note}&rdquo;
            </span>
          )}
        </button>
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={() =>
              setQuickExpandedChannelHandle((prev) =>
                prev === reviewSummary.channelHandle
                  ? null
                  : reviewSummary.channelHandle || null
              )
            }
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-accent/35 bg-accent-soft text-accent text-3xs font-semibold hover:bg-accent-soft/80 transition cursor-pointer"
            title="Xem nhanh toàn bộ lịch sử đánh giá của kênh ngay tại dòng"
          >
            <History className="w-2.5 h-2.5" />
            <span>{isQuickExpanded ? 'Thu gọn' : `Xem nhanh (${reviewSummary.totalReviews})`}</span>
          </button>
          <button
            type="button"
            onClick={() => openForVerdict('SUITABLE')}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-positive/30 bg-positive-soft/60 text-positive text-3xs font-semibold hover:bg-positive-soft transition cursor-pointer"
          >
            <Check className="w-2.5 h-2.5" />
            <span>+ Phù hợp</span>
          </button>
          <button
            type="button"
            onClick={() => openForVerdict('NOT_SUITABLE')}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-critical/30 bg-critical-soft/60 text-critical text-3xs font-semibold hover:bg-critical-soft transition cursor-pointer"
          >
            <XCircle className="w-2.5 h-2.5" />
            <span>+ K.Phù hợp</span>
          </button>
        </div>

        {isQuickExpanded && (
          <div className="mt-1 rounded-md border border-line bg-sunken/40 p-2 space-y-1.5 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between gap-1 text-3xs font-semibold text-ink-2">
              <span>Lịch sử ĐG ({reviewSummary.totalReviews} lượt)</span>
              <button
                type="button"
                onClick={() => openForVerdict()}
                className="text-accent hover:underline cursor-pointer"
              >
                Mở chi tiết
              </button>
            </div>
            {reviewSummary.reviews.map((rev) => {
              const meta = VERDICT_META[rev.verdict];
              return (
                <div
                  key={rev.id}
                  className="rounded border border-line bg-surface p-1.5 text-3xs leading-snug space-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-semibold text-ink">
                      {rev.brandName || 'Toàn hệ thống B2C'}
                    </span>
                    <Status tone={meta.tone}>{meta.shortLabel}</Status>
                  </div>
                  {rev.note && (
                    <div className="text-ink break-words">
                      Ý kiến: &ldquo;{rev.note}&rdquo;
                    </div>
                  )}
                  <div className="text-ink-3">
                    {rev.reviewerName} · {rev.timeLabel} {rev.dateLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderUnifiedKocActionsCell = (params: {
    handle: string;
    nickname?: string;
    avatarUrl?: string;
    channelUrl: string;
    isExisting: boolean;
    onSave: () => void;
    scrapedKocItem?: KocItem;
    videoUrl?: string;
    scriptContext?: ScriptExtractFallbackContext;
  }) => {
    const reviewSummary = getChannelSummary(params.handle);
    const openAddToSheetForChannel = () => {
      const clean = params.handle.toLowerCase().replace(/^@+/, '');
      const matched = existingByHandle.get(clean);
      if (matched) {
        setSheetTargetKocs([matched]);
      } else if (params.scrapedKocItem) {
        onSaveScrapedKocs({ created: [params.scrapedKocItem], updated: [] });
        setSheetTargetKocs([params.scrapedKocItem]);
      } else {
        setSheetTargetKocs([
          {
            stageName: params.nickname || params.handle,
            channelId: clean,
            channelLink: params.channelUrl,
            avatarUrl: params.avatarUrl,
            rateCardVideo: 0,
            followers: 0,
            tepKenh: 'Beauty',
          },
        ]);
      }
    };
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          icon={reviewSummary ? History : Check}
          onClick={(e) => {
            e.stopPropagation();
            openChannelReviewModal({
              handle: params.handle,
              channelName: params.nickname || params.scriptContext?.nickname || params.handle,
              channelUrl: params.channelUrl,
              avatarUrl: params.avatarUrl,
              sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
            });
          }}
        >
          {reviewSummary ? `Lịch sử ĐG (${reviewSummary.totalReviews})` : 'Đánh giá'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={FileSpreadsheet}
          onClick={(e) => {
            e.stopPropagation();
            openAddToSheetForChannel();
          }}
        >
          Thêm vào Sheet
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setScraperInitialHandle(`@${params.handle.replace(/^@+/, '')}`);
            setScraperModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
        <Button
          size="sm"
          variant={params.isExisting ? 'secondary' : 'primary'}
          icon={params.isExisting ? Check : UserPlus}
          onClick={(e) => {
            e.stopPropagation();
            params.onSave();
          }}
        >
          {params.isExisting ? 'Cập nhật' : 'Lưu KOC'}
        </Button>
        <ActionMenu
          items={[
            {
              label: 'Đánh giá Phù hợp (theo Brand)',
              icon: Check,
              onSelect: () =>
                openChannelReviewModal({
                  handle: params.handle,
                  channelName: params.nickname || params.scriptContext?.nickname || params.handle,
                  channelUrl: params.channelUrl,
                  avatarUrl: params.avatarUrl,
                  initialVerdict: 'SUITABLE',
                  sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                }),
            },
            {
              label: 'Đánh giá Không phù hợp (theo Brand)',
              icon: XCircle,
              onSelect: () =>
                openChannelReviewModal({
                  handle: params.handle,
                  channelName: params.nickname || params.scriptContext?.nickname || params.handle,
                  channelUrl: params.channelUrl,
                  avatarUrl: params.avatarUrl,
                  initialVerdict: 'NOT_SUITABLE',
                  sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                }),
            },
            ...(reviewSummary
              ? [
                  {
                    label: `Xem lịch sử đánh giá (${reviewSummary.totalReviews} lượt)`,
                    icon: History,
                    onSelect: () =>
                      openChannelReviewModal({
                        handle: params.handle,
                        channelName: params.nickname || params.scriptContext?.nickname || params.handle,
                        channelUrl: params.channelUrl,
                        avatarUrl: params.avatarUrl,
                        sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                      }),
                  },
                ]
              : []),
            ...(params.videoUrl
              ? [
                  {
                    label: 'Tách lời thoại & Hook video',
                    icon: FileText,
                    onSelect: () => openScriptExtractorModal(params.videoUrl!, params.scriptContext),
                  },
                  {
                    label: 'Cào bình luận video này',
                    icon: MessageSquare,
                    onSelect: () => {
                      setVideoCommentUrl(params.videoUrl!);
                      setActiveTab('COMMENTS_AND_TRENDING');
                      void runVideoCommentsCrawl(params.videoUrl!);
                    },
                  },
                ]
              : []),
            {
              label: 'Mở kênh trên TikTok',
              icon: ExternalLink,
              onSelect: () => window.open(params.channelUrl, '_blank', 'noopener,noreferrer'),
            },
          ]}
        />
      </div>
    );
  };

  const competitorColumns: Column<TikTokCompetitorKocResult>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC & Liên hệ',
      width: 285,
      render: (r) => {
        const p = r.channelProfile;
        const matchedKoc = existingByHandle.get(r.handle.toLowerCase().replace(/^@+/, ''));
        const isExisting =
          Boolean(matchedKoc) || r.competitorCollaboration.isAlreadyInUpbase;
        return renderUnifiedKocIdentityCell({
          handle: p.handle,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl,
          channelUrl: p.channelUrl,
          verified: p.isVerified,
          phone: p.extractedPhone,
          email: p.extractedEmail,
          matchedKoc,
          isExisting,
        });
      },
    },
    {
      key: 'brandReview',
      header: 'Đánh giá & Brand',
      width: 235,
      render: (r) =>
        renderUnifiedBrandReviewCell({
          handle: r.handle,
          nickname: r.channelProfile.nickname,
          avatarUrl: r.channelProfile.avatarUrl,
          channelUrl: r.channelProfile.channelUrl,
        }),
    },
    {
      key: 'scale',
      header: 'Quy mô kênh',
      align: 'right',
      width: 145,
      render: (r) =>
        renderUnifiedKocScaleCell({
          followers: r.channelProfile.followers,
          videoCount: r.channelProfile.videoCount,
          engagementRate: r.engagementMetrics.engagementRate,
          totalLikes: r.channelProfile.totalLikes,
        }),
    },
    {
      key: 'context',
      header: 'Phân loại & Ngữ cảnh',
      width: 200,
      render: (r) => {
        const c = r.competitorCollaboration;
        return (
          <div className="grid gap-0.5 min-w-0 max-w-[210px]">
            <div className="flex items-center gap-1.5">
              <Status
                tone={
                  c.collaborationType === 'PAID_BOOKING'
                    ? 'warning'
                    : c.collaborationType === 'AFFILIATE_CART'
                      ? 'positive'
                      : 'neutral'
                }
              >
                {c.collaborationTypeLabel}
              </Status>
              <span className="text-2xs font-semibold text-ink tabular-nums">
                {c.competitorVideoCount} video
              </span>
            </div>
            <span
              className="text-2xs text-ink-2 truncate"
              title={c.competitorProductPromoted}
            >
              {c.competitorProductPromoted || r.channelProfile.bio || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video tiêu biểu',
      width: 260,
      render: (r) => {
        const c = r.competitorCollaboration;
        return renderUnifiedVideoCell({
          videoUrl: c.latestCollabVideoUrl,
          caption: c.latestCollabCaption,
          views: c.latestCollabViews,
          likes: r.engagementMetrics.avgLikes,
          publishedAt: c.latestCollabPublishedAt,
        });
      },
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: (r) => {
        const c = r.competitorCollaboration;
        const matchedKoc = existingByHandle.get(r.handle.toLowerCase().replace(/^@+/, ''));
        return renderUnifiedKocActionsCell({
          handle: r.handle,
          nickname: r.channelProfile.nickname,
          avatarUrl: r.channelProfile.avatarUrl,
          channelUrl: r.channelProfile.channelUrl,
          isExisting: Boolean(matchedKoc),
          onSave: () => handleSaveSingleKoc(r),
          scrapedKocItem: mapScrapedResultToKocItem(r, matchedKoc, {
            bookingPic: currentUser?.name,
          }),
          videoUrl: c.latestCollabVideoUrl,
          scriptContext: {
            handle: r.handle,
            nickname: r.channelProfile.nickname,
            caption: c.latestCollabCaption,
            productPromoted: c.competitorProductPromoted,
            views: c.latestCollabViews,
            likes: r.engagementMetrics.avgLikes,
          },
        });
      },
    },
  ];

  const hashtagColumns: Column<TikTokHashtagKocResult>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC & Liên hệ',
      width: 285,
      render: (r) => {
        const p = r.channelProfile;
        const matchedKoc = existingByHandle.get(r.handle.toLowerCase().replace(/^@+/, ''));
        return renderUnifiedKocIdentityCell({
          handle: p.handle,
          nickname: p.nickname,
          avatarUrl: p.avatarUrl,
          channelUrl: p.channelUrl,
          verified: p.isVerified,
          phone: p.extractedPhone,
          email: p.extractedEmail,
          matchedKoc,
          isExisting: Boolean(matchedKoc),
        });
      },
    },
    {
      key: 'brandReview',
      header: 'Đánh giá & Brand',
      width: 235,
      render: (r) =>
        renderUnifiedBrandReviewCell({
          handle: r.handle,
          nickname: r.channelProfile.nickname,
          avatarUrl: r.channelProfile.avatarUrl,
          channelUrl: r.channelProfile.channelUrl,
        }),
    },
    {
      key: 'scale',
      header: 'Quy mô kênh',
      align: 'right',
      width: 145,
      render: (r) =>
        renderUnifiedKocScaleCell({
          followers: r.channelProfile.followers,
          videoCount: r.channelProfile.videoCount,
          engagementRate: r.engagementMetrics.engagementRate,
          totalLikes: r.channelProfile.totalLikes,
        }),
    },
    {
      key: 'context',
      header: 'Phân loại & Ngữ cảnh',
      width: 200,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return (
          <div className="grid gap-0.5 min-w-0 max-w-[210px]">
            <div className="flex items-center gap-1.5">
              <Status tone={v.breakoutRatio >= 1 ? 'positive' : 'neutral'}>
                View/Flw {v.breakoutRatio}x
              </Status>
              <span className="text-2xs font-code text-accent truncate">
                #{v.hashtag.replace(/^#+/, '')}
              </span>
            </div>
            <span className="text-2xs text-ink-2 truncate" title={r.channelProfile.bio}>
              {r.channelProfile.bio || 'Kênh sáng tạo nội dung theo hashtag'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video tiêu biểu',
      width: 260,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return renderUnifiedVideoCell({
          videoUrl: v.videoUrl,
          caption: v.captionSnippet,
          views: v.views,
          likes: v.likes,
          publishedAt: v.publishedAt,
        });
      },
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        const matchedKoc = existingByHandle.get(r.handle.toLowerCase().replace(/^@+/, ''));
        return renderUnifiedKocActionsCell({
          handle: r.handle,
          nickname: r.channelProfile.nickname,
          avatarUrl: r.channelProfile.avatarUrl,
          channelUrl: r.channelProfile.channelUrl,
          isExisting: Boolean(matchedKoc),
          onSave: () => handleSaveSingleKoc(r),
          scrapedKocItem: mapScrapedResultToKocItem(r, matchedKoc, {
            bookingPic: currentUser?.name,
          }),
          videoUrl: v.videoUrl,
          scriptContext: {
            handle: r.handle,
            nickname: r.channelProfile.nickname,
            caption: v.captionSnippet,
            views: v.views,
            likes: v.likes,
          },
        });
      },
    },
  ];

  const commentColumns: Column<TikTokVideoCommentItem>[] = [
    {
      key: 'user',
      header: 'Người bình luận',
      width: 210,
      render: (c) => (
        <div className="flex items-start gap-2.5 min-w-0">
          <Avatar name={c.nickname} src={c.avatarUrl} size={32} />
          <div className="grid gap-0.5 min-w-0">
            <a
              href={`https://www.tiktok.com/@${c.username}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1"
            >
              <span>@{c.username}</span>
              <ExternalLink className="w-3 h-3 text-ink-3" />
            </a>
            <span className="text-2xs text-ink-3 truncate">{c.nickname}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'intent',
      header: 'Nhóm nhu cầu',
      width: 180,
      render: (c) => (
        <div className="grid gap-0.5">
          <Status
            tone={
              c.intentType === 'BUYING_INTENT'
                ? 'positive'
                : c.intentType === 'PRODUCT_FEEDBACK'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {c.intentLabel}
          </Status>
          {c.extractedPhone && (
            <span className="text-2xs text-ink font-code">SĐT: {c.extractedPhone}</span>
          )}
        </div>
      ),
    },
    {
      key: 'text',
      header: 'Nội dung bình luận',
      width: 370,
      render: (c) => (
        <p className="text-xs text-ink leading-snug break-words">{c.text}</p>
      ),
    },
    {
      key: 'stats',
      header: 'Tương tác & Thời gian',
      align: 'right',
      width: 160,
      render: (c) => (
        <div className="grid gap-0.5 tabular-nums">
          <span className="text-xs font-semibold text-ink">
            {formatNumber(c.likeCount)} lượt thích
          </span>
          <span className="text-2xs text-ink-3">
            {formatNumber(c.replyCount)} phản hồi · {formatDate(c.publishedAt)}
          </span>
        </div>
      ),
    },
  ];

  const trendingColumns: Column<TikTokTrendingCreatorItem>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC & Liên hệ',
      width: 285,
      render: (c) => {
        const matchedKoc = existingByHandle.get(c.handle.toLowerCase().replace(/^@+/, ''));
        return renderUnifiedKocIdentityCell({
          handle: c.handle,
          nickname: c.nickname,
          avatarUrl: c.avatarUrl,
          channelUrl: c.channelUrl,
          verified: c.verified,
          phone: c.extractedPhone,
          email: c.extractedEmail,
          matchedKoc,
          isExisting: Boolean(matchedKoc),
        });
      },
    },
    {
      key: 'brandReview',
      header: 'Đánh giá & Brand',
      width: 235,
      render: (c) =>
        renderUnifiedBrandReviewCell({
          handle: c.handle,
          nickname: c.nickname,
          avatarUrl: c.avatarUrl,
          channelUrl: c.channelUrl,
        }),
    },
    {
      key: 'scale',
      header: 'Quy mô kênh',
      align: 'right',
      width: 145,
      render: (c) =>
        renderUnifiedKocScaleCell({
          followers: c.followers,
          videoCount: c.videoCount,
          engagementRate: c.engagementRate,
          totalLikes: c.totalLikes,
        }),
    },
    {
      key: 'context',
      header: 'Phân loại & Ngữ cảnh',
      width: 200,
      render: (c) => (
        <div className="grid gap-0.5 min-w-0 max-w-[210px]">
          <div className="flex items-center gap-1.5">
            <Status tone="info">{c.categoryLabel || 'KOC Xu hướng'}</Status>
          </div>
          <span className="text-2xs text-ink-2 truncate" title={c.bio}>
            {c.bio || 'Kênh sáng tạo nội dung xu hướng ngành hàng'}
          </span>
        </div>
      ),
    },
    {
      key: 'video',
      header: 'Video tiêu biểu',
      width: 260,
      render: (c) =>
        renderUnifiedVideoCell({
          videoUrl: c.latestVideoUrl,
          caption: c.latestVideoCaption,
          views: c.latestVideoViews,
          likes: c.latestVideoLikes,
          publishedAt: c.latestVideoPublishedAt,
        }),
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: 190,
      render: (c) => {
        const matchedKoc = existingByHandle.get(c.handle.toLowerCase().replace(/^@+/, ''));
        return renderUnifiedKocActionsCell({
          handle: c.handle,
          nickname: c.nickname,
          avatarUrl: c.avatarUrl,
          channelUrl: c.channelUrl,
          isExisting: Boolean(matchedKoc),
          onSave: () => handleSaveSingleTrendingKoc(c),
          scrapedKocItem: mapTrendingItemToKoc(c, matchedKoc),
          videoUrl: c.latestVideoUrl,
          scriptContext: {
            handle: c.handle,
            nickname: c.nickname,
            caption: c.latestVideoCaption || c.bio,
            views: c.latestVideoViews || 0,
            likes: c.latestVideoLikes || 0,
          },
        });
      },
    },
  ];

  const todayVnDateKey = useMemo(() => getVietnamDateYmd(), []);

  const yesterdayVnDateKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getVietnamDateYmd(d);
  }, []);

  const formatHistoryDayBadge = useCallback(
    (dateKey: string) => {
      if (!dateKey || dateKey === todayVnDateKey) return 'Hôm nay';
      if (dateKey === yesterdayVnDateKey) return 'Hôm qua';
      const parts = dateKey.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateKey;
    },
    [todayVnDateKey, yesterdayVnDateKey]
  );

  const applyHistoryEntry = (item: TikTokCrawlerDailyHistoryItem) => {
    setActiveHistoryId(item.id);
    setExpandedWeeklyTableByTab({});
    if (item.tab === 'HANDLE_SCRAPE') {
      setScraperInitialHandle(item.rawInput);
      setScraperModalOpen(true);
      return;
    }
    if (activeTab !== item.tab) {
      setActiveTab(item.tab);
    }

    if (item.tab === 'COMPETITOR_KOCS') {
      setCompetitorInput(item.rawInput);
      setCompError(null);
      setCompProfile(item.compProfile ?? null);
      const list = Array.isArray(item.compResults) ? item.compResults : [];
      setCompResults(list);
      setCompRequestedCount(list.length || item.resultCount);
      setCompFilter('ALL');
      setCompSearchQuery('');
    } else if (item.tab === 'HASHTAG_DISCOVERY') {
      setHashtagInput(item.rawInput);
      setTagError(null);
      const list = Array.isArray(item.tagResults) ? item.tagResults : [];
      setTagResults(list);
      setTagRequestedCount(list.length || item.resultCount);
      setTagFilter('ALL');
      setTagSearchQuery('');
    } else if (item.tab === 'COMMENTS_AND_TRENDING') {
      setVideoCommentUrl(item.rawInput);
      setCommentError(null);
      setCommentData(item.commentData ?? null);
      setCommentRequestedCount(item.commentData?.comments?.length || item.resultCount);
      setCommentFilter('ALL');
      setCommentSearch('');
    } else if (item.tab === 'CHANNEL_AND_VIDEO_TOOLS') {
      const cat = (item.trendingCategory || item.rawInput || 'ALL') as TrendingKocCategoryKey;
      setTrendingCategory(cat);
      const list = Array.isArray(item.trendingCreators) ? item.trendingCreators : [];
      setTrendingCreators(list);
      setTrendingRequestedCount(list.length || item.resultCount);
      setTrendingFilter('ALL');
      setTrendingSearch('');
    } else if (item.tab === 'LINK_AIR_CHECK') {
      setLinkAirRestorePayload((prev) => ({
        nonce: (prev?.nonce ?? 0) + 1,
        rawInput: item.rawInput,
        results: Array.isArray(item.linkAirResults) ? item.linkAirResults : [],
        expect: item.linkAirExpect,
      }));
    }
  };

  const rerunHistoryEntry = (item: TikTokCrawlerDailyHistoryItem) => {
    setExpandedWeeklyTableByTab({});
    if (item.tab === 'HANDLE_SCRAPE') {
      setScraperInitialHandle(item.rawInput);
      setScraperModalOpen(true);
      return;
    }
    if (activeTab !== item.tab) {
      setActiveTab(item.tab);
    }
    if (item.tab === 'COMPETITOR_KOCS') {
      setCompetitorInput(item.rawInput);
      void runCompetitorCrawl(item.rawInput, period, { targetCount: compTargetCount });
    } else if (item.tab === 'HASHTAG_DISCOVERY') {
      setHashtagInput(item.rawInput);
      void runHashtagCrawl(item.rawInput, period, { targetCount: tagTargetCount });
    } else if (item.tab === 'COMMENTS_AND_TRENDING') {
      setVideoCommentUrl(item.rawInput);
      void runVideoCommentsCrawl(item.rawInput, { targetCount: commentTargetCount });
    } else if (item.tab === 'CHANNEL_AND_VIDEO_TOOLS') {
      const cat = (item.trendingCategory || item.rawInput || 'ALL') as TrendingKocCategoryKey;
      setTrendingCategory(cat);
      void runTrendingCreatorsCrawl(cat, { targetCount: trendingTargetCount });
    } else if (item.tab === 'LINK_AIR_CHECK') {
      applyHistoryEntry(item);
    }
  };

  const tabShortLabel: Record<CrawlerHistoryTabKey, string> = {
    COMPETITOR_KOCS: 'KOC của đối thủ',
    HASHTAG_DISCOVERY: 'KOC theo #Hashtag',
    COMMENTS_AND_TRENDING: 'Bình luận video',
    CHANNEL_AND_VIDEO_TOOLS: 'KOC xu hướng',
    LINK_AIR_CHECK: 'Kiểm tra link air',
    HANDLE_SCRAPE: 'Kênh @handle',
  };

  const unitLabel: Record<CrawlerHistoryTabKey, string> = {
    COMPETITOR_KOCS: 'KOC',
    HASHTAG_DISCOVERY: 'KOC',
    COMMENTS_AND_TRENDING: 'BL',
    CHANNEL_AND_VIDEO_TOOLS: 'KOC',
    LINK_AIR_CHECK: 'Link',
    HANDLE_SCRAPE: 'KOC',
  };

  const renderHistoryButton = (currentTab: CrawlerHistoryTabKey) => {
    const tabItems = dailyHistory.filter(
      (it) =>
        it.tab === currentTab ||
        (currentTab === 'CHANNEL_AND_VIDEO_TOOLS' && it.tab === 'HANDLE_SCRAPE')
    );
    const isTableExpanded = Boolean(expandedWeeklyTableByTab[currentTab]);
    const isReviewExpanded = Boolean(expandedReviewHistoryByTab[currentTab]);
    const showKocReviewBtn =
      currentTab === 'COMPETITOR_KOCS' ||
      currentTab === 'HASHTAG_DISCOVERY' ||
      currentTab === 'CHANNEL_AND_VIDEO_TOOLS' ||
      currentTab === 'HANDLE_SCRAPE';

    return (
      <div className="inline-flex items-center gap-1.5">
        {showKocReviewBtn && (
          <Button
            size="sm"
            variant={isReviewExpanded ? 'primary' : 'secondary'}
            icon={History}
            onClick={() =>
              setExpandedReviewHistoryByTab((prev) => ({
                ...prev,
                [currentTab]: !prev[currentTab],
              }))
            }
            title="Xem nhanh bảng Lịch sử đánh giá KOC theo Brand ngay tại màn hình này"
          >
            <span>Lịch sử ĐG KOC ({channelReviews.length})</span>
          </Button>
        )}
        <Button
          size="sm"
          variant={isTableExpanded ? 'primary' : 'secondary'}
          icon={Clock}
          onClick={() =>
            setExpandedWeeklyTableByTab((prev) => ({
              ...prev,
              [currentTab]: !prev[currentTab],
            }))
          }
          title="Mở bảng lịch sử quét trong 7 ngày gần nhất"
        >
          <span>Lịch sử{tabItems.length > 0 ? ` (${tabItems.length})` : ''}</span>
        </Button>
      </div>
    );
  };

  const renderDailyHistoryBar = (currentTab: CrawlerHistoryTabKey, _compact?: boolean) =>
    renderHistoryButton(currentTab);

  const renderInlineKocReviewHistoryPanel = (currentTab: CrawlerHistoryTabKey) => {
    if (!expandedReviewHistoryByTab[currentTab]) return null;

    const filteredReviews = channelReviews.filter((rev) => {
      if (inlineReviewVerdictFilter !== 'ALL' && rev.verdict !== inlineReviewVerdictFilter) {
        return false;
      }
      if (inlineReviewSearch.trim()) {
        const q = inlineReviewSearch.trim().toLowerCase();
        const hay = [
          rev.channelHandle,
          rev.channelName,
          rev.brandName,
          rev.note,
          rev.reviewerName,
          ...rev.reasonTags,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const suitableCount = channelReviews.filter((r) => r.verdict === 'SUITABLE').length;
    const cautionCount = channelReviews.filter((r) => r.verdict === 'CAUTION').length;
    const notSuitableCount = channelReviews.filter((r) => r.verdict === 'NOT_SUITABLE').length;

    const inlineReviewColumns: Column<KocChannelReviewEntry>[] = [
      {
        key: 'channel',
        header: 'Kênh KOC',
        width: 230,
        render: (rev) => (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={rev.channelName || rev.channelHandle || 'KOC'} src={rev.avatarUrl} size={26} className="shrink-0" />
            <div className="min-w-0 grid">
              <span className="font-semibold text-xs text-ink truncate" title={rev.channelName || `@${rev.channelHandle || rev.handle}`}>
                {rev.channelName || `@${rev.channelHandle || rev.handle}`}
              </span>
              <span className="font-code text-2xs text-ink-3 break-all">@{rev.channelHandle || rev.handle}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'brand',
        header: 'Brand đánh giá',
        width: 155,
        render: (rev) => (
          <Status tone="info">{rev.brandName || 'Toàn hệ thống B2C'}</Status>
        ),
      },
      {
        key: 'verdict',
        header: 'Kết luận',
        width: 140,
        render: (rev) => {
          const meta = VERDICT_META[rev.verdict];
          return <Status tone={meta.tone}>{meta.label}</Status>;
        },
      },
      {
        key: 'note',
        header: 'Ý kiến nhân viên & Tiêu chí',
        render: (rev) => (
          <div className="grid gap-1 min-w-0">
            {rev.note && (
              <span className="text-xs text-ink break-words">
                &ldquo;{rev.note}&rdquo;
              </span>
            )}
            {rev.reasonTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {rev.reasonTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded bg-sunken border border-line text-3xs text-ink-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'reviewer',
        header: 'Người đánh giá & Thời gian',
        width: 200,
        render: (rev) => (
          <div className="grid gap-0.5 text-xs">
            <span className="font-semibold text-ink">{rev.reviewerName}</span>
            <span className="text-2xs text-ink-3 font-code">
              {rev.timeLabel} · {rev.dateLabel}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        width: 150,
        render: (rev) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openChannelReviewModal({
                  handle: rev.channelHandle || rev.handle,
                  channelName: rev.channelName,
                  channelUrl: rev.channelUrl,
                  avatarUrl: rev.avatarUrl,
                  initialBrandName: rev.brandName,
                  sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
                });
              }}
            >
              Đánh giá thêm
            </Button>
          </div>
        ),
      },
    ];

    return (
      <div className="bg-surface border-b border-line">
        <div className="px-3.5 py-2 border-b border-line bg-sunken/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-accent" />
              <span>Lịch sử đánh giá KOC theo Brand ({channelReviews.length} lượt)</span>
            </span>
            <Chips<'ALL' | KocChannelReviewVerdict>
              items={[
                { key: 'ALL', label: 'Tất cả', count: channelReviews.length },
                { key: 'SUITABLE', label: 'Phù hợp', count: suitableCount },
                { key: 'CAUTION', label: 'Cân nhắc', count: cautionCount },
                { key: 'NOT_SUITABLE', label: 'Không phù hợp', count: notSuitableCount },
              ]}
              value={inlineReviewVerdictFilter}
              onChange={setInlineReviewVerdictFilter}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SearchInput
              value={inlineReviewSearch}
              onChange={setInlineReviewSearch}
              placeholder="Tìm @handle, Brand, ý kiến, người ĐG..."
              className="w-56 [&_input]:h-7 [&_input]:text-xs"
            />
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => openChannelReviewModal(null, 'CHANNEL_DETAIL')}
            >
              Đánh giá kênh mới
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openChannelReviewModal(null, 'ALL_HISTORY')}
            >
              Mở cửa sổ đầy đủ
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              onClick={() =>
                setExpandedReviewHistoryByTab((prev) => ({
                  ...prev,
                  [currentTab]: false,
                }))
              }
            >
              Đóng
            </Button>
          </div>
        </div>
        <DataTable
          rows={filteredReviews}
          columns={inlineReviewColumns}
          rowKey={(r) => r.id}
          onRowClick={(rev) =>
            openChannelReviewModal({
              handle: rev.channelHandle || rev.handle,
              channelName: rev.channelName,
              channelUrl: rev.channelUrl,
              avatarUrl: rev.avatarUrl,
              initialBrandName: rev.brandName,
              sourceScreen: tabShortLabel[activeTab] || 'Crawler KOC',
            })
          }
          fitContainer
          empty="Chưa có đánh giá KOC nào khớp bộ lọc."
        />
      </div>
    );
  };

  const renderTabWeeklyHistorySection = (currentTab: CrawlerHistoryTabKey, _inline?: boolean) => {
    const isExpanded = Boolean(expandedWeeklyTableByTab[currentTab]);
    const isReviewExpanded = Boolean(expandedReviewHistoryByTab[currentTab]);
    if (!isExpanded && !isReviewExpanded) return null;

    if (!isExpanded && isReviewExpanded) {
      return renderInlineKocReviewHistoryPanel(currentTab);
    }

    const tabOnlyItems = dailyHistory.filter(
      (it) =>
        it.tab === currentTab ||
        (currentTab === 'CHANNEL_AND_VIDEO_TOOLS' && it.tab === 'HANDLE_SCRAPE')
    );
    const allTabItems = showAllTabsInBar ? dailyHistory : tabOnlyItems;

    const todayCount = allTabItems.filter((it) => it.dateKey === todayVnDateKey).length;
    const yesterdayCount = allTabItems.filter((it) => it.dateKey === yesterdayVnDateKey).length;
    const earlierCount = allTabItems.length - todayCount - yesterdayCount;

    const filteredHistoryRows = allTabItems.filter((it) => {
      if (historyDayFilter === 'TODAY' && it.dateKey !== todayVnDateKey) return false;
      if (historyDayFilter === 'YESTERDAY' && it.dateKey !== yesterdayVnDateKey) return false;
      if (
        historyDayFilter === 'EARLIER' &&
        (it.dateKey === todayVnDateKey || it.dateKey === yesterdayVnDateKey)
      ) {
        return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.trim().toLowerCase();
        const hitLabel = it.queryLabel.toLowerCase().includes(q);
        const hitRaw = it.rawInput.toLowerCase().includes(q);
        const hitStaff = (it.staffName || '').toLowerCase().includes(q);
        const hitNote = (it.summaryNote || '').toLowerCase().includes(q);
        if (!hitLabel && !hitRaw && !hitStaff && !hitNote) return false;
      }
      return true;
    });

    const historyColumns: Column<TikTokCrawlerDailyHistoryItem>[] = [
      {
        key: 'query',
        header: 'Nội dung / Từ khóa đã quét',
        width: 280,
        render: (it) => (
          <div className="grid gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-code font-semibold text-xs text-ink truncate">
                {it.queryLabel}
              </span>
              {activeHistoryId === it.id && (
                <Status tone="info">Đang mở</Status>
              )}
            </div>
            <span className="text-2xs text-ink-3 font-code truncate max-w-[290px]" title={it.rawInput}>
              Đầu vào: {it.rawInput}
            </span>
          </div>
        ),
      },
      {
        key: 'result',
        header: 'Kết quả lưu trữ',
        width: 260,
        render: (it) => (
          <div className="grid gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Status tone="positive">
                {it.resultCount} {unitLabel[it.tab]}
              </Status>
              <span className="text-2xs text-ink-2 font-medium">
                {tabShortLabel[it.tab]}
              </span>
            </div>
            {it.summaryNote && (
              <span className="text-2xs text-ink-3 truncate">{it.summaryNote}</span>
            )}
          </div>
        ),
      },
      {
        key: 'staff',
        header: 'Nhân sự thực hiện',
        width: 170,
        render: (it) => (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={it.staffName || 'Nhân sự'} size={24} />
            <span className="text-xs font-medium text-ink truncate">
              {it.staffName || 'Nhân sự B2C'}
            </span>
          </div>
        ),
      },
      {
        key: 'time',
        header: 'Thời gian quét (7 ngày)',
        width: 175,
        render: (it) => {
          const badge = formatHistoryDayBadge(it.dateKey);
          const isToday = it.dateKey === todayVnDateKey;
          return (
            <div className="grid gap-0.5 tabular-nums">
              <div className="flex items-center gap-1.5">
                <Status tone={isToday ? 'positive' : 'neutral'}>{badge}</Status>
                <span className="text-xs font-semibold text-ink font-code">
                  {it.timeLabel}
                </span>
              </div>
              <span className="text-2xs text-ink-3">{formatDate(it.dateKey)}</span>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right',
        width: 230,
        render: (it) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                applyHistoryEntry(it);
              }}
            >
              Xem kết quả
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={(e) => {
                e.stopPropagation();
                rerunHistoryEntry(it);
              }}
            >
              Quét lại
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              onClick={(e) => void deleteHistoryEntry(it.id, e)}
            >
              Xóa
            </Button>
          </div>
        ),
      },
    ];

    return (
      <div className="bg-surface">
        {renderInlineKocReviewHistoryPanel(currentTab)}
        <div className="px-3.5 py-2 border-b border-line bg-sunken/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>
                Lịch sử crawl (7 ngày gần nhất) —{' '}
                {showAllTabsInBar ? 'Tất cả tab' : tabShortLabel[currentTab]}
              </span>
            </span>
            <Chips<'ALL_WEEK' | 'TODAY' | 'YESTERDAY' | 'EARLIER'>
              items={[
                { key: 'ALL_WEEK', label: 'Tất cả 7 ngày', count: allTabItems.length },
                { key: 'TODAY', label: 'Hôm nay', count: todayCount },
                { key: 'YESTERDAY', label: 'Hôm qua', count: yesterdayCount },
                { key: 'EARLIER', label: 'Trong tuần', count: earlierCount },
              ]}
              value={historyDayFilter}
              onChange={setHistoryDayFilter}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <SearchInput
              value={historySearchQuery}
              onChange={setHistorySearchQuery}
              placeholder="Tìm từ khóa, @handle, nhân sự quét..."
              className="w-52 [&_input]:h-7 [&_input]:text-xs"
            />
            {dailyHistory.length > tabOnlyItems.length && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowAllTabsInBar((prev) => !prev)}
              >
                {showAllTabsInBar
                  ? `Chỉ tab này (${tabOnlyItems.length})`
                  : `Tất cả tab (${dailyHistory.length})`}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              disabled={historyLoading}
              onClick={() => void fetchDailyHistory()}
            >
              Làm mới
            </Button>
            {tabOnlyItems.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={RotateCcw}
                onClick={() => void clearTabWeeklyHistory(currentTab)}
              >
                Xóa lịch sử tab
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              icon={X}
              onClick={() =>
                setExpandedWeeklyTableByTab((prev) => ({
                  ...prev,
                  [currentTab]: false,
                }))
              }
            >
              Đóng
            </Button>
          </div>
        </div>

        <DataTable
          rows={filteredHistoryRows}
          columns={historyColumns}
          rowKey={(it) => it.id}
          onRowClick={(it) => applyHistoryEntry(it)}
          fitContainer
          empty="Chưa có phiên crawl nào được lưu trong 7 ngày qua ở tab này."
        />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Thanh chuyển 5 công cụ con của Crawler KOC & Đối thủ */}
      <Tabs<CrawlerTabKey>
        items={[
          {
            key: 'COMPETITOR_KOCS',
            label: 'KOC của đối thủ',
            count: compResults.length > 0 ? compResults.length : undefined,
          },
          {
            key: 'HASHTAG_DISCOVERY',
            label: 'KOC theo #Hashtag',
            count: tagResults.length > 0 ? tagResults.length : undefined,
          },
          {
            key: 'COMMENTS_AND_TRENDING',
            label: 'Bình luận video',
            count: commentData?.comments.length ? commentData.comments.length : undefined,
          },
          {
            key: 'CHANNEL_AND_VIDEO_TOOLS',
            label: 'KOC xu hướng',
            count: trendingCreators.length > 0 ? trendingCreators.length : undefined,
          },
          {
            key: 'LINK_AIR_CHECK',
            label: 'Kiểm tra link air',
          },
        ]}
        value={activeTab}
        onChange={(t) => setActiveTab(t)}
      />

      {/* Nút chính bên trái, menu tiện ích ⋯ ở ngoài cùng bên phải */}
      <PageActions>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Users}
            onClick={() => setPendingStagingModalOpen(true)}
          >
            <span>Bảng Tạm KOC</span>
            {stagingKocs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-white text-2xs font-semibold tabular-nums">
                {stagingKocs.length}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Target}
            onClick={() => {
              const defaultHandles =
                activeTab === 'COMPETITOR_KOCS' && compResults.length > 0
                  ? compResults.slice(0, 5).map((r) => `@${r.handle}`)
                  : activeTab === 'HASHTAG_DISCOVERY' && tagResults.length > 0
                    ? tagResults.slice(0, 5).map((r) => `@${r.handle}`)
                    : activeTab === 'CHANNEL_AND_VIDEO_TOOLS' && trendingCreators.length > 0
                      ? trendingCreators.slice(0, 5).map((r) => `@${r.handle}`)
                      : [];
              openBriefMatcherModal(defaultHandles, competitorInput || hashtagInput);
            }}
          >
            <span>Phân tích Kênh &amp; Khớp Brief</span>
            {runningBriefJobsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-2xs font-semibold tabular-nums">
                {runningBriefJobsCount}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={History}
            onClick={() => openChannelReviewModal(null, 'ALL_HISTORY')}
          >
            <span>Lịch sử đánh giá KOC{channelReviews.length > 0 ? ` (${channelReviews.length})` : ''}</span>
          </Button>
        </div>
        <ActionMenu
          label="Tiện ích crawler"
          items={[
            {
              label: 'Lịch sử đánh giá kênh KOC',
              icon: History,
              onSelect: () => openChannelReviewModal(null, 'ALL_HISTORY'),
            },
            {
              label: 'Cào kênh theo @handle',
              icon: Search,
              onSelect: () => {
                setScraperInitialHandle('');
                setScraperModalOpen(true);
              },
            },
            {
              label: 'Tách lời thoại & Hook',
              icon: FileText,
              onSelect: () => openScriptExtractorModal(''),
            },
            {
              label: 'Nghiệm thu link video',
              icon: Video,
              onSelect: () => setVideoInspectorOpen(true),
            },
          ]}
        />
      </PageActions>

      {/* Thanh theo dõi trực tiếp các tiến trình Phân tích Kênh & Khớp Brief đang chạy ngầm */}
      {briefAnalysisJobs.length > 0 && (
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
            <div className="flex flex-wrap items-center gap-1.5">
              {briefAnalysisJobs.slice(0, 3).map((job) => {
                const isRunning = job.status === 'QUEUED' || job.status === 'RUNNING';
                return (
                  <button
                    key={job.jobId}
                    type="button"
                    onClick={() => setBriefMatcherOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-line bg-surface-2 hover:border-accent/50 text-2xs transition cursor-pointer"
                  >
                    {isRunning ? (
                      <RefreshCw className="w-3 h-3 text-accent animate-spin shrink-0" />
                    ) : (
                      <Check className="w-3 h-3 text-positive shrink-0" />
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
      )}

      {/* TAB 1: QUÉT KOC LÀM VIỆC CHO ĐỐI THỦ — Gộp chung 1 khung điều khiển & bảng */}
      {activeTab === 'COMPETITOR_KOCS' && (
        <Panel flush>
          {/* Dòng 1: Thanh nhập đối thủ + chọn số lượng + nút quét (bên trái) & Thao tác kết quả + Lịch sử (bên phải) */}
          <div
            className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 bg-surface ${
              compError ||
              compLoading ||
              compResults.length > 0 ||
              compProfile ||
              expandedWeeklyTableByTab.COMPETITOR_KOCS
                ? 'border-b border-line'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                id="competitor-channel-input"
                type="text"
                aria-label="Kênh TikTok hoặc tên thương hiệu đối thủ"
                value={competitorInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompetitorInput(val);
                  if (compError) setCompError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !compLoading) {
                    e.preventDefault();
                    setExpandedWeeklyTableByTab((prev) => ({ ...prev, COMPETITOR_KOCS: false }));
                    void runCompetitorCrawl(competitorInput, period, {
                      targetCount: compTargetCount,
                    });
                  }
                }}
                placeholder="Nhập @handle hoặc thương hiệu đối thủ (VD: @hapas.official, @larocheposayvn)..."
                className="w-full sm:w-72 lg:w-80 h-8 px-2.5 rounded-md border border-line-strong bg-surface text-xs text-ink focus:outline-none focus:border-focus font-code"
              />

              <div className="flex items-center gap-1 bg-surface-2 px-2 h-8 rounded-md border border-line">
                <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                {KOC_COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCompTargetCount(n)}
                    className={`px-1.5 py-0.5 rounded text-2xs font-code transition-colors ${
                      compTargetCount === n
                        ? 'bg-accent text-white font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  id="competitor-count-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={compTargetCount || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setCompTargetCount(0);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      setCompTargetCount(Math.min(1000, Math.max(1, parsed)));
                    }
                  }}
                  onBlur={() => {
                    if (!compTargetCount || compTargetCount < 1) {
                      setCompTargetCount(12);
                    }
                  }}
                  title="Nhập số lượng KOC cần quét (tối đa 1000 KOC)"
                  className="w-14 h-5 px-1 rounded border border-line bg-surface text-2xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                />
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={compLoading ? RefreshCw : Search}
                disabled={compLoading}
                onClick={() => {
                  setExpandedWeeklyTableByTab((prev) => ({ ...prev, COMPETITOR_KOCS: false }));
                  void runCompetitorCrawl(competitorInput, period, {
                    targetCount: compTargetCount,
                  });
                }}
              >
                {compLoading
                  ? compBatchProgress
                    ? `Đang quét đợt ${compBatchProgress.currentBatch}/${compBatchProgress.totalBatches} (${compBatchProgress.collectedCount}/${compBatchProgress.targetCount})...`
                    : 'Đang quét...'
                  : 'Quét KOC đối thủ'}
              </Button>
              {compLoading && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Square}
                  onClick={() => {
                    compAbortRef.current = true;
                  }}
                >
                  Dừng
                </Button>
              )}

              {!compLoading &&
                compResults.length > 0 &&
                compResults.length < (compRequestedCount ?? compTargetCount) && (
                  <Status tone="warning">
                    Chỉ tìm thấy {compResults.length}/{compRequestedCount ?? compTargetCount} KOC yêu cầu (thiếu{' '}
                    {(compRequestedCount ?? compTargetCount) - compResults.length} KOC)
                  </Status>
                )}
              {!compLoading &&
                compResults.length >= (compRequestedCount ?? compTargetCount) &&
                filteredCompResults.length < (compRequestedCount ?? compTargetCount) && (
                  <Status tone="warning">
                    Bộ lọc chỉ còn {filteredCompResults.length}/{compRequestedCount ?? compTargetCount} KOC yêu cầu
                  </Status>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(compLoading || compResults.length > 0) && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    disabled={compLoading || compResults.length === 0}
                    onClick={() =>
                      runCompetitorCrawl(competitorInput, period, {
                        targetCount: KOC_BATCH_SIZE,
                        appendMode: true,
                      })
                    }
                  >
                    +{KOC_BATCH_SIZE} KOC
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    disabled={filteredCompResults.length === 0}
                    onClick={handleExportCompetitorCsv}
                  >
                    Xuất CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Check}
                    disabled={filteredCompResults.length === 0}
                    onClick={() => handleSaveBulkKocs(filteredCompResults)}
                  >
                    Lưu tất cả ({filteredCompResults.length})
                  </Button>
                </>
              )}
              {renderHistoryButton('COMPETITOR_KOCS')}
            </div>
          </div>

          {renderTabWeeklyHistorySection('COMPETITOR_KOCS')}

          {compError && (
            <div className="mx-3.5 my-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-critical-line bg-critical-soft text-xs text-critical">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{compError}</div>
            </div>
          )}

          {/* Dòng 2: Gộp Tóm tắt đối thủ + Chips lọc nhanh + Bộ lọc chi tiết */}
          {!expandedWeeklyTableByTab.COMPETITOR_KOCS && (compLoading || compResults.length > 0) && (
            <>
              <div className="px-3.5 py-2 border-b border-line bg-sunken/30 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chips<CompetitorFilterKey>
                    items={[
                      { key: 'ALL', label: 'Tất cả', count: compResults.length },
                      {
                        key: 'NEW_OPPORTUNITY',
                        label: 'KOC Mới',
                        count: compStats.newCount,
                      },
                      {
                        key: 'ALREADY_IN_UPBASE',
                        label: 'Đã có tại UpBase',
                        count: compStats.existingCount,
                      },
                      {
                        key: 'PAID_BOOKING',
                        label: 'Booking trả phí',
                        count: compResults.filter(
                          (r) => r.competitorCollaboration.collaborationType === 'PAID_BOOKING'
                        ).length,
                      },
                      {
                        key: 'AFFILIATE_CART',
                        label: 'Gắn giỏ Affiliate',
                        count: compResults.filter(
                          (r) => r.competitorCollaboration.collaborationType === 'AFFILIATE_CART'
                        ).length,
                      },
                      {
                        key: 'HAS_PHONE',
                        label: 'Có SĐT',
                        count: compStats.phoneCount,
                      },
                      {
                        key: 'SUITABLE',
                        label: 'Phù hợp',
                        count: compResults.filter((r) => {
                          const s = getChannelSummary(r.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'SUITABLE' || s.suitableCount > 0)
                          );
                        }).length,
                      },
                      {
                        key: 'NOT_SUITABLE',
                        label: 'Không phù hợp',
                        count: compResults.filter((r) => {
                          const s = getChannelSummary(r.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'NOT_SUITABLE' || s.notSuitableCount > 0)
                          );
                        }).length,
                      },
                    ]}
                    value={compFilter}
                    onChange={setCompFilter}
                  />

                  <div className="flex flex-wrap items-center gap-2.5 text-2xs tabular-nums">
                    {!compLoading &&
                      compResults.length > 0 &&
                      compResults.length < (compRequestedCount ?? compTargetCount) && (
                        <Status tone="warning">
                          Đạt {compResults.length}/{compRequestedCount ?? compTargetCount} KOC yêu cầu
                        </Status>
                      )}
                    {compProfile && (
                      <>
                        <span className="font-semibold text-ink">{compProfile.brandName}</span>
                        <a
                          href={compProfile.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-code text-accent hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>@{compProfile.handle}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <span className="text-ink-3">
                          Flw: <strong className="text-ink">{formatNumber(compProfile.followers)}</strong>
                        </span>
                        <span className="text-ink-3">
                          Video: <strong className="text-ink">{formatNumber(compProfile.videoCount)}</strong>
                        </span>
                        <span className="text-ink-3">
                          Tổng view KOC: <strong className="text-positive">{formatNumber(compStats.totalCompViews)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <SearchInput
                    value={compSearchQuery}
                    onChange={setCompSearchQuery}
                    placeholder="Tìm theo @handle, tên KOC, SĐT, sản phẩm hoặc nội dung..."
                    className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs [&_input]:h-7 [&_input]:text-xs"
                  />

                  <Select
                    aria-label="Lọc theo quy mô Follower"
                    value={compFollowerTier}
                    onChange={(e) => setCompFollowerTier(e.target.value as FollowerTierKey)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="ALL">Mọi quy mô Follower</option>
                    <option value="NANO">Nano (&lt; 50K flw)</option>
                    <option value="MICRO">Micro (50K – 200K flw)</option>
                    <option value="MACRO">Macro (200K – 500K flw)</option>
                    <option value="MEGA">Mega (&gt; 500K flw)</option>
                  </Select>

                  <Select
                    aria-label="Lọc theo lượt xem video"
                    value={String(compMinViews)}
                    onChange={(e) => setCompMinViews(Number(e.target.value) || 0)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="0">Mọi lượt xem video</option>
                    <option value="10000">Video ≥ 10K view</option>
                    <option value="50000">Video ≥ 50K view</option>
                    <option value="100000">Video ≥ 100K view</option>
                    <option value="500000">Video ≥ 500K view</option>
                  </Select>

                  <Select
                    aria-label="Lọc theo tỷ lệ tương tác ER"
                    value={String(compMinEr)}
                    onChange={(e) => setCompMinEr(Number(e.target.value) || 0)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="0">Mọi mức ER%</option>
                    <option value="3">ER ≥ 3%</option>
                    <option value="5">ER ≥ 5%</option>
                    <option value="10">ER ≥ 10%</option>
                  </Select>

                  <Select
                    aria-label="Sắp xếp kết quả"
                    value={compSortBy}
                    onChange={(e) => setCompSortBy(e.target.value as KocSortKey)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="LATEST_DESC">Sắp xếp: Ngày air mới → cũ</option>
                    <option value="VIEWS_DESC">Sắp xếp: View cao → thấp</option>
                    <option value="FOLLOWERS_DESC">Sắp xếp: Follower cao → thấp</option>
                    <option value="ER_DESC">Sắp xếp: ER% cao → thấp</option>
                  </Select>

                  {(compFilter !== 'ALL' ||
                    compFollowerTier !== 'ALL' ||
                    compMinViews > 0 ||
                    compMinEr > 0 ||
                    compSortBy !== 'LATEST_DESC' ||
                    compSearchQuery.trim() !== '') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={RotateCcw}
                      onClick={() => {
                        setCompFilter('ALL');
                        setCompFollowerTier('ALL');
                        setCompMinViews(0);
                        setCompMinEr(0);
                        setCompSortBy('LATEST_DESC');
                        setCompSearchQuery('');
                      }}
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              </div>

              {compLoading && compResults.length === 0 ? (
                <TikTokCrawlCreativeLoader
                  mode="COMPETITOR"
                  queryLabel={competitorInput.trim() || 'Kênh đối thủ'}
                  targetCount={compRequestedCount ?? compTargetCount}
                  batchProgress={compBatchProgress}
                  collectedSoFar={compResults.length}
                  onStop={() => {
                    compAbortRef.current = true;
                  }}
                />
              ) : (
                <>
                  {compLoading && compResults.length > 0 && (
                    <TikTokCrawlCreativeLoader
                      compact
                      mode="COMPETITOR"
                      queryLabel={competitorInput.trim() || 'Kênh đối thủ'}
                      targetCount={compRequestedCount ?? compTargetCount}
                      batchProgress={compBatchProgress}
                      collectedSoFar={compResults.length}
                      onStop={() => {
                        compAbortRef.current = true;
                      }}
                    />
                  )}
                  <DataTable
                    rows={filteredCompResults}
                    columns={competitorColumns}
                    rowKey={(r) => r.handle}
                    fitContainer
                    empty="Không có KOC nào khớp bộ lọc."
                  />
                </>
              )}
            </>
          )}
        </Panel>
      )}

      {/* TAB 2: TÌM KOC THEO #HASHTAG / TỪ KHÓA — Gộp chung 1 khung */}
      {activeTab === 'HASHTAG_DISCOVERY' && (
        <Panel flush>
          <div
            className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 bg-surface ${
              tagError ||
              tagLoading ||
              tagResults.length > 0 ||
              expandedWeeklyTableByTab.HASHTAG_DISCOVERY
                ? 'border-b border-line'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                id="crawler-hashtag-input"
                type="text"
                aria-label="Hashtag hoặc từ khóa ngách trên TikTok"
                value={hashtagInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setHashtagInput(val);
                  if (tagError) setTagError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !tagLoading) {
                    e.preventDefault();
                    setExpandedWeeklyTableByTab({});
                    void runHashtagCrawl(hashtagInput, period, {
                      targetCount: tagTargetCount,
                    });
                  }
                }}
                placeholder="Nhập #hashtag hoặc từ khóa ngách (VD: #kemchongnang, #skincare, #clubclio)..."
                className="w-full sm:w-72 lg:w-80 h-8 px-2.5 rounded-md border border-line-strong bg-surface text-xs text-ink focus:outline-none focus:border-focus font-code"
              />

              <div className="flex items-center gap-1 bg-surface-2 px-2 h-8 rounded-md border border-line">
                <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                {KOC_COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTagTargetCount(n)}
                    className={`px-1.5 py-0.5 rounded text-2xs font-code transition-colors ${
                      tagTargetCount === n
                        ? 'bg-accent text-white font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  id="hashtag-count-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={tagTargetCount || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setTagTargetCount(0);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      setTagTargetCount(Math.min(1000, Math.max(1, parsed)));
                    }
                  }}
                  onBlur={() => {
                    if (!tagTargetCount || tagTargetCount < 1) {
                      setTagTargetCount(12);
                    }
                  }}
                  title="Nhập số lượng KOC cần quét theo Hashtag (tối đa 1000 KOC)"
                  className="w-14 h-5 px-1 rounded border border-line bg-surface text-2xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                />
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={tagLoading ? RefreshCw : Hash}
                disabled={tagLoading}
                onClick={() => {
                  setExpandedWeeklyTableByTab({});
                  void runHashtagCrawl(hashtagInput, period, {
                    targetCount: tagTargetCount,
                  });
                }}
              >
                {tagLoading
                  ? tagBatchProgress
                    ? `Đang quét đợt ${tagBatchProgress.currentBatch}/${tagBatchProgress.totalBatches} (${tagBatchProgress.collectedCount}/${tagBatchProgress.targetCount})...`
                    : 'Đang quét...'
                  : 'Quét theo Hashtag'}
              </Button>
              {tagLoading && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Square}
                  onClick={() => {
                    tagAbortRef.current = true;
                  }}
                >
                  Dừng
                </Button>
              )}

              {!tagLoading &&
                tagResults.length > 0 &&
                tagResults.length < (tagRequestedCount ?? tagTargetCount) && (
                  <Status tone="warning">
                    Chỉ tìm thấy {tagResults.length}/{tagRequestedCount ?? tagTargetCount} KOC yêu cầu (thiếu{' '}
                    {(tagRequestedCount ?? tagTargetCount) - tagResults.length} KOC)
                  </Status>
                )}
              {!tagLoading &&
                tagResults.length >= (tagRequestedCount ?? tagTargetCount) &&
                filteredTagResults.length < (tagRequestedCount ?? tagTargetCount) && (
                  <Status tone="warning">
                    Bộ lọc chỉ còn {filteredTagResults.length}/{tagRequestedCount ?? tagTargetCount} KOC yêu cầu
                  </Status>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(tagLoading || tagResults.length > 0) && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    disabled={tagLoading || tagResults.length === 0}
                    onClick={() =>
                      runHashtagCrawl(hashtagInput, period, {
                        targetCount: KOC_BATCH_SIZE,
                        appendMode: true,
                      })
                    }
                  >
                    +{KOC_BATCH_SIZE} KOC
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    disabled={filteredTagResults.length === 0}
                    onClick={handleExportHashtagCsv}
                  >
                    Xuất CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Check}
                    disabled={filteredTagResults.length === 0}
                    onClick={() => handleSaveBulkKocs(filteredTagResults)}
                  >
                    Lưu tất cả ({filteredTagResults.length})
                  </Button>
                </>
              )}
              {renderHistoryButton('HASHTAG_DISCOVERY')}
            </div>
          </div>

          {renderTabWeeklyHistorySection('HASHTAG_DISCOVERY')}

          {tagError && (
            <div className="mx-3.5 my-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-critical-line bg-critical-soft text-xs text-critical">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{tagError}</div>
            </div>
          )}

          {!expandedWeeklyTableByTab.HASHTAG_DISCOVERY &&
            (tagLoading || tagResults.length > 0) && (
            <>
              <div className="px-3.5 py-2 border-b border-line bg-sunken/30 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chips<HashtagFilterKey>
                    items={[
                      { key: 'ALL', label: 'Tất cả', count: tagResults.length },
                      {
                        key: 'NEW_OPPORTUNITY',
                        label: 'KOC Mới',
                        count: tagStats.newCount,
                      },
                      {
                        key: 'ALREADY_IN_UPBASE',
                        label: 'Đã có tại UpBase',
                        count: tagStats.existingCount,
                      },
                      {
                        key: 'VIRAL_BREAKOUT',
                        label: 'Video xu hướng (View ≥ Flw)',
                        count: tagStats.viralCount,
                      },
                      {
                        key: 'HAS_PHONE',
                        label: 'Có SĐT',
                        count: tagStats.phoneCount,
                      },
                      {
                        key: 'SUITABLE',
                        label: 'Phù hợp',
                        count: tagResults.filter((r) => {
                          const s = getChannelSummary(r.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'SUITABLE' || s.suitableCount > 0)
                          );
                        }).length,
                      },
                      {
                        key: 'NOT_SUITABLE',
                        label: 'Không phù hợp',
                        count: tagResults.filter((r) => {
                          const s = getChannelSummary(r.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'NOT_SUITABLE' || s.notSuitableCount > 0)
                          );
                        }).length,
                      },
                    ]}
                    value={tagFilter}
                    onChange={setTagFilter}
                  />

                  <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3 tabular-nums">
                    {!tagLoading &&
                      tagResults.length > 0 &&
                      tagResults.length < (tagRequestedCount ?? tagTargetCount) && (
                        <Status tone="warning">
                          Đạt {tagResults.length}/{tagRequestedCount ?? tagTargetCount} KOC yêu cầu
                        </Status>
                      )}
                    <span>
                      Từ khóa: <strong className="text-ink">{hashtagInput}</strong> · Hiển thị{' '}
                      <strong className="text-ink">{filteredTagResults.length}</strong>/{tagResults.length} KOC
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <SearchInput
                    value={tagSearchQuery}
                    onChange={setTagSearchQuery}
                    placeholder="Tìm theo @handle, tên kênh, SĐT hoặc nội dung caption..."
                    className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs [&_input]:h-7 [&_input]:text-xs"
                  />

                  <Select
                    aria-label="Lọc theo quy mô Follower"
                    value={tagFollowerTier}
                    onChange={(e) => setTagFollowerTier(e.target.value as FollowerTierKey)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="ALL">Mọi quy mô Follower</option>
                    <option value="NANO">Nano (&lt; 50K flw)</option>
                    <option value="MICRO">Micro (50K – 200K flw)</option>
                    <option value="MACRO">Macro (200K – 500K flw)</option>
                    <option value="MEGA">Mega (&gt; 500K flw)</option>
                  </Select>

                  <Select
                    aria-label="Lọc theo lượt xem video"
                    value={String(tagMinViews)}
                    onChange={(e) => setTagMinViews(Number(e.target.value) || 0)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="0">Mọi lượt xem video</option>
                    <option value="10000">Video ≥ 10K view</option>
                    <option value="50000">Video ≥ 50K view</option>
                    <option value="100000">Video ≥ 100K view</option>
                    <option value="500000">Video ≥ 500K view</option>
                  </Select>

                  <Select
                    aria-label="Lọc theo tỷ lệ tương tác ER"
                    value={String(tagMinEr)}
                    onChange={(e) => setTagMinEr(Number(e.target.value) || 0)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="0">Mọi mức ER%</option>
                    <option value="3">ER ≥ 3%</option>
                    <option value="5">ER ≥ 5%</option>
                    <option value="10">ER ≥ 10%</option>
                  </Select>

                  <Select
                    aria-label="Sắp xếp kết quả Hashtag"
                    value={tagSortBy}
                    onChange={(e) => setTagSortBy(e.target.value as KocSortKey)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="LATEST_DESC">Sắp xếp: Ngày air mới → cũ</option>
                    <option value="VIEWS_DESC">Sắp xếp: View cao → thấp</option>
                    <option value="FOLLOWERS_DESC">Sắp xếp: Follower cao → thấp</option>
                    <option value="ER_DESC">Sắp xếp: ER% cao → thấp</option>
                  </Select>

                  {(tagFilter !== 'ALL' ||
                    tagFollowerTier !== 'ALL' ||
                    tagMinViews > 0 ||
                    tagMinEr > 0 ||
                    tagSortBy !== 'LATEST_DESC' ||
                    tagSearchQuery.trim() !== '') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={RotateCcw}
                      onClick={() => {
                        setTagFilter('ALL');
                        setTagFollowerTier('ALL');
                        setTagMinViews(0);
                        setTagMinEr(0);
                        setTagSortBy('LATEST_DESC');
                        setTagSearchQuery('');
                      }}
                    >
                      Đặt lại
                    </Button>
                  )}
                </div>
              </div>

              {tagLoading && tagResults.length === 0 ? (
                <TikTokCrawlCreativeLoader
                  mode="HASHTAG"
                  queryLabel={hashtagInput.trim() || '#Hashtag'}
                  targetCount={tagRequestedCount ?? tagTargetCount}
                  batchProgress={tagBatchProgress}
                  collectedSoFar={tagResults.length}
                  onStop={() => {
                    tagAbortRef.current = true;
                  }}
                />
              ) : (
                <>
                  {tagLoading && tagResults.length > 0 && (
                    <TikTokCrawlCreativeLoader
                      compact
                      mode="HASHTAG"
                      queryLabel={hashtagInput.trim() || '#Hashtag'}
                      targetCount={tagRequestedCount ?? tagTargetCount}
                      batchProgress={tagBatchProgress}
                      collectedSoFar={tagResults.length}
                      onStop={() => {
                        tagAbortRef.current = true;
                      }}
                    />
                  )}
                  <DataTable
                    rows={filteredTagResults}
                    columns={hashtagColumns}
                    rowKey={(r) => r.handle}
                    fitContainer
                    empty="Không có KOC nào khớp bộ lọc."
                  />
                </>
              )}
            </>
          )}
        </Panel>
      )}

      {/* TAB 3: BÌNH LUẬN VIDEO — Gộp chung 1 khung */}
      {activeTab === 'COMMENTS_AND_TRENDING' && (
        <Panel flush>
          <div
            className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 bg-surface ${
              commentError ||
              commentLoading ||
              commentData ||
              expandedWeeklyTableByTab.COMMENTS_AND_TRENDING
                ? 'border-b border-line'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <input
                id="video-comment-url-input"
                type="text"
                aria-label="Đường dẫn video TikTok"
                value={videoCommentUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setVideoCommentUrl(val);
                  if (commentError) setCommentError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !commentLoading) {
                    e.preventDefault();
                    setExpandedWeeklyTableByTab({});
                    void runVideoCommentsCrawl(videoCommentUrl, {
                      targetCount: commentTargetCount,
                    });
                  }
                }}
                placeholder="Dán đường dẫn video TikTok cần cào bình luận (VD: https://www.tiktok.com/@user/video/...)..."
                className="w-full sm:w-80 lg:w-96 h-8 px-2.5 rounded-md border border-line-strong bg-surface text-xs text-ink focus:outline-none focus:border-focus font-code"
              />

              <div className="flex items-center gap-1 bg-surface-2 px-2 h-8 rounded-md border border-line">
                <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                {COMMENT_COUNT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCommentTargetCount(n)}
                    className={`px-1.5 py-0.5 rounded text-2xs font-code transition-colors ${
                      commentTargetCount === n
                        ? 'bg-accent text-white font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  id="comment-count-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={commentTargetCount || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setCommentTargetCount(0);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      setCommentTargetCount(Math.min(1000, Math.max(1, parsed)));
                    }
                  }}
                  onBlur={() => {
                    if (!commentTargetCount || commentTargetCount < 1) {
                      setCommentTargetCount(40);
                    }
                  }}
                  title="Nhập số lượng bình luận muốn lấy (tối đa 1000)"
                  className="w-14 h-5 px-1 rounded border border-line bg-surface text-2xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                />
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={commentLoading ? RefreshCw : MessageSquare}
                disabled={commentLoading}
                onClick={() => {
                  setExpandedWeeklyTableByTab({});
                  void runVideoCommentsCrawl(videoCommentUrl, {
                    targetCount: commentTargetCount,
                  });
                }}
              >
                {commentLoading
                  ? commentBatchProgress
                    ? `Đang cào đợt ${commentBatchProgress.currentBatch}/${commentBatchProgress.totalBatches} (${commentBatchProgress.collectedCount}/${commentBatchProgress.targetCount})...`
                    : 'Đang tải...'
                  : 'Cào bình luận'}
              </Button>
              {commentLoading && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Square}
                  onClick={() => {
                    commentAbortRef.current = true;
                  }}
                >
                  Dừng
                </Button>
              )}

              {!commentLoading &&
                commentData &&
                commentData.comments.length < (commentRequestedCount ?? commentTargetCount) && (
                  <Status tone="warning">
                    Chỉ lấy được {commentData.comments.length}/{commentRequestedCount ?? commentTargetCount} bình luận yêu cầu (thiếu{' '}
                    {(commentRequestedCount ?? commentTargetCount) - commentData.comments.length})
                  </Status>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {commentData && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    disabled={commentLoading || commentData.hasMore === false}
                    onClick={() =>
                      runVideoCommentsCrawl(videoCommentUrl, {
                        targetCount: COMMENT_BATCH_SIZE,
                        appendMode: true,
                      })
                    }
                  >
                    +{COMMENT_BATCH_SIZE} bình luận
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    disabled={filteredComments.length === 0}
                    onClick={handleExportCommentsCsv}
                  >
                    Xuất CSV
                  </Button>
                </>
              )}
              {renderHistoryButton('COMMENTS_AND_TRENDING')}
            </div>
          </div>

          {renderTabWeeklyHistorySection('COMMENTS_AND_TRENDING')}

          {commentError && (
            <div className="mx-3.5 my-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-critical-line bg-critical-soft text-xs text-critical">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{commentError}</div>
            </div>
          )}

          {!expandedWeeklyTableByTab.COMMENTS_AND_TRENDING && commentLoading && !commentData && (
            <TikTokCrawlCreativeLoader
              mode="COMMENTS"
              queryLabel={videoCommentUrl.trim() || 'Video TikTok'}
              targetCount={commentRequestedCount ?? commentTargetCount}
              batchProgress={commentBatchProgress}
              collectedSoFar={0}
              onStop={() => {
                commentAbortRef.current = true;
              }}
            />
          )}

          {!expandedWeeklyTableByTab.COMMENTS_AND_TRENDING && commentData && (
            <>
              {commentLoading && (
                <TikTokCrawlCreativeLoader
                  compact
                  mode="COMMENTS"
                  queryLabel={videoCommentUrl.trim() || 'Video TikTok'}
                  targetCount={commentRequestedCount ?? commentTargetCount}
                  batchProgress={commentBatchProgress}
                  collectedSoFar={commentData.comments.length}
                  onStop={() => {
                    commentAbortRef.current = true;
                  }}
                />
              )}
              <div className="px-3.5 py-2 border-b border-line bg-sunken/30 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chips<CommentFilterKey>
                    items={[
                      {
                        key: 'ALL',
                        label: 'Tất cả',
                        count: commentData.comments.length,
                      },
                      {
                        key: 'BUYING_INTENT',
                        label: 'Hỏi mua / Tư vấn',
                        count: commentData.summary.buyingIntentCount,
                      },
                      {
                        key: 'PRODUCT_FEEDBACK',
                        label: 'Phản hồi SP',
                        count: commentData.summary.feedbackCount,
                      },
                      {
                        key: 'HAS_PHONE',
                        label: 'Có SĐT',
                        count: commentData.comments.filter((c) => Boolean(c.extractedPhone))
                          .length,
                      },
                      {
                        key: 'GENERAL',
                        label: 'Tương tác chung',
                        count:
                          commentData.comments.length -
                          commentData.summary.buyingIntentCount -
                          commentData.summary.feedbackCount,
                      },
                    ]}
                    value={commentFilter}
                    onChange={setCommentFilter}
                  />

                  <div className="flex flex-wrap items-center gap-2.5 text-2xs tabular-nums">
                    {!commentLoading &&
                      commentData.comments.length < (commentRequestedCount ?? commentTargetCount) && (
                        <Status tone="warning">
                          Đạt {commentData.comments.length}/{commentRequestedCount ?? commentTargetCount} bình luận yêu cầu
                        </Status>
                      )}
                    <span className="font-semibold text-ink">
                      @{commentData.videoInfo.authorHandle}
                    </span>
                    <span className="text-ink-3">
                      View: <strong className="text-ink">{formatNumber(commentData.videoInfo.views)}</strong>
                    </span>
                    <span className="text-ink-3">
                      Tim: <strong className="text-ink">{formatNumber(commentData.videoInfo.likes)}</strong>
                    </span>
                    <span className="text-ink-3">
                      Bình luận: <strong className="text-ink">{formatNumber(commentData.videoInfo.commentsCount)}</strong>
                    </span>
                    <span className="text-ink-3">
                      Tỷ lệ hỏi mua: <strong className="text-positive">{commentData.summary.buyingIntentRate}%</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <SearchInput
                    value={commentSearch}
                    onChange={setCommentSearch}
                    placeholder="Tìm nội dung bình luận hoặc @username người bình luận..."
                    className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs [&_input]:h-7 [&_input]:text-xs"
                  />

                  <Select
                    aria-label="Sắp xếp bình luận"
                    value={commentSortBy}
                    onChange={(e) =>
                      setCommentSortBy(
                        e.target.value as 'INTENT_FIRST' | 'LIKES_DESC' | 'NEWEST'
                      )
                    }
                    className="h-7 text-xs py-0"
                  >
                    <option value="INTENT_FIRST">Sắp xếp: Ưu tiên khách hỏi mua</option>
                    <option value="LIKES_DESC">Sắp xếp: Lượt thích cao → thấp</option>
                    <option value="NEWEST">Sắp xếp: Bình luận mới nhất</option>
                  </Select>
                </div>
              </div>

              <DataTable
                rows={filteredComments}
                columns={commentColumns}
                rowKey={(c) => c.cid}
                fitContainer
                empty="Không có bình luận nào khớp bộ lọc."
              />
            </>
          )}
        </Panel>
      )}

      {/* TAB 4: DANH SÁCH KOC XU HƯỚNG TRÊN TIKTOK THEO NGÀNH HÀNG — Gộp chung 1 khung */}
      {activeTab === 'CHANNEL_AND_VIDEO_TOOLS' && (
        <Panel flush>
          <div
            className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 bg-surface ${
              trendingLoading ||
              trendingHandleSearching ||
              trendingCreators.length > 0 ||
              expandedWeeklyTableByTab.CHANNEL_AND_VIDEO_TOOLS
                ? 'border-b border-line'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <Select
                aria-label="Chọn ngành hàng quét KOC xu hướng"
                value={trendingCategory}
                onChange={(e) => {
                  const nextCat = e.target.value as TrendingKocCategoryKey;
                  setTrendingCategory(nextCat);
                  if (trendingCreators.length > 0) {
                    setTrendingCreators([]);
                    setTrendingRequestedCount(null);
                  }
                }}
                className="w-full sm:w-64 h-8 text-xs py-0"
              >
                {TRENDING_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-1 px-2 h-8 rounded-md border border-line bg-surface-2">
                <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                {KOC_COUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={trendingLoading}
                    onClick={() => setTrendingTargetCount(preset)}
                    className={`px-1.5 py-0.5 rounded text-2xs font-code tabular-nums transition-colors ${
                      trendingTargetCount === preset
                        ? 'bg-accent text-white font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={500}
                  disabled={trendingLoading}
                  value={trendingTargetCount}
                  onChange={(e) =>
                    setTrendingTargetCount(
                      Math.max(1, Math.min(500, Number(e.target.value) || KOC_BATCH_SIZE))
                    )
                  }
                  aria-label="Nhập số lượng KOC xu hướng muốn quét"
                  className="w-14 h-5 px-1 text-center text-2xs font-code tabular-nums rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={trendingLoading ? RefreshCw : Flame}
                disabled={trendingLoading}
                onClick={() => {
                  setExpandedWeeklyTableByTab({});
                  void runTrendingCreatorsCrawl();
                }}
              >
                {trendingLoading && trendingBatchProgress
                  ? `Đang cào (${trendingBatchProgress.collectedCount}/${trendingBatchProgress.targetCount} KOC - Đợt ${trendingBatchProgress.currentBatch})`
                  : trendingLoading
                    ? 'Đang quét...'
                    : `Quét ${trendingTargetCount} KOC xu hướng`}
              </Button>

              {trendingLoading && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Square}
                  onClick={() => {
                    trendingAbortRef.current = true;
                  }}
                >
                  Dừng
                </Button>
              )}

              {!trendingLoading &&
                trendingCreators.length > 0 &&
                trendingCreators.length < (trendingRequestedCount ?? trendingTargetCount) && (
                  <Status tone="warning">
                    Chỉ tìm thấy {trendingCreators.length}/{trendingRequestedCount ?? trendingTargetCount} KOC yêu cầu (thiếu{' '}
                    {(trendingRequestedCount ?? trendingTargetCount) - trendingCreators.length} KOC)
                  </Status>
                )}
              {!trendingLoading &&
                trendingCreators.length >= (trendingRequestedCount ?? trendingTargetCount) &&
                filteredTrendingCreators.length < (trendingRequestedCount ?? trendingTargetCount) && (
                  <Status tone="warning">
                    Bộ lọc chỉ còn {filteredTrendingCreators.length}/{trendingRequestedCount ?? trendingTargetCount} KOC yêu cầu
                  </Status>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(trendingLoading || trendingHandleSearching || trendingCreators.length > 0) && (
                <>
                  {trendingSearch.trim().length >= 2 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={trendingHandleSearching ? RefreshCw : Search}
                      disabled={trendingHandleSearching}
                      onClick={() => void runQuickTrendingHandleLookup(trendingSearch)}
                    >
                      {trendingHandleSearching
                        ? 'Đang cào kênh...'
                        : `Cào kênh @${trendingSearch.trim().replace(/^@+/, '')}`}
                    </Button>
                  )}
                  {trendingCreators.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={trendingLoading ? RefreshCw : UserPlus}
                      disabled={trendingLoading}
                      onClick={() =>
                        void runTrendingCreatorsCrawl(trendingCategory, {
                          targetCount: KOC_BATCH_SIZE,
                          appendMode: true,
                        })
                      }
                    >
                      {trendingLoading ? 'Đang quét...' : `+${KOC_BATCH_SIZE} KOC`}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={handleExportTrendingCsv}
                    disabled={filteredTrendingCreators.length === 0}
                  >
                    Xuất CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Check}
                    disabled={filteredTrendingCreators.length === 0}
                    onClick={() => handleSaveBulkTrendingKocs(filteredTrendingCreators)}
                  >
                    Lưu tất cả ({filteredTrendingCreators.length})
                  </Button>
                </>
              )}
              {renderHistoryButton('CHANNEL_AND_VIDEO_TOOLS')}
            </div>
          </div>

          {renderTabWeeklyHistorySection('CHANNEL_AND_VIDEO_TOOLS')}

          {!expandedWeeklyTableByTab.CHANNEL_AND_VIDEO_TOOLS &&
            (trendingLoading || trendingHandleSearching || trendingCreators.length > 0) && (
            <>
              <div className="px-3.5 py-2 border-b border-line bg-sunken/30 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chips<TrendingFilterKey>
                    items={[
                      { key: 'ALL', label: 'Tất cả', count: trendingCreators.length },
                      {
                        key: 'NEW_OPPORTUNITY',
                        label: 'KOC Mới',
                        count: trendingCreators.filter(
                          (c) => !existingByHandle.has(c.handle.toLowerCase())
                        ).length,
                      },
                      {
                        key: 'ALREADY_IN_UPBASE',
                        label: 'Đã có tại UpBase',
                        count: trendingCreators.filter((c) =>
                          existingByHandle.has(c.handle.toLowerCase())
                        ).length,
                      },
                      {
                        key: 'VERIFIED',
                        label: 'Tick xanh',
                        count: trendingCreators.filter((c) => c.verified).length,
                      },
                      {
                        key: 'HAS_CONTACT',
                        label: 'Có SĐT / Email',
                        count: trendingCreators.filter(
                          (c) => Boolean(c.extractedPhone || c.extractedEmail)
                        ).length,
                      },
                      {
                        key: 'SUITABLE',
                        label: 'Phù hợp',
                        count: trendingCreators.filter((c) => {
                          const s = getChannelSummary(c.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'SUITABLE' || s.suitableCount > 0)
                          );
                        }).length,
                      },
                      {
                        key: 'NOT_SUITABLE',
                        label: 'Không phù hợp',
                        count: trendingCreators.filter((c) => {
                          const s = getChannelSummary(c.handle);
                          return Boolean(
                            s && (s.latestReview.verdict === 'NOT_SUITABLE' || s.notSuitableCount > 0)
                          );
                        }).length,
                      },
                    ]}
                    value={trendingFilter}
                    onChange={setTrendingFilter}
                  />

                  <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3 tabular-nums">
                    {!trendingLoading &&
                      trendingCreators.length > 0 &&
                      trendingCreators.length < (trendingRequestedCount ?? trendingTargetCount) && (
                        <Status tone="warning">
                          Đạt {trendingCreators.length}/{trendingRequestedCount ?? trendingTargetCount} KOC yêu cầu
                        </Status>
                      )}
                    <span>
                      Ngành:{' '}
                      <strong className="text-ink">
                        {TRENDING_CATEGORY_OPTIONS.find((o) => o.key === trendingCategory)?.label ||
                          'Tất cả ngành hàng'}
                      </strong>{' '}
                      · Hiển thị <strong className="text-ink">{filteredTrendingCreators.length}</strong>/
                      {trendingCreators.length} KOC
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <SearchInput
                    value={trendingSearch}
                    onChange={setTrendingSearch}
                    placeholder="Tìm theo @handle (VD: @duymuoi), tên kênh, tiểu sử hoặc caption..."
                    className="w-full sm:w-auto sm:flex-1 sm:min-w-[200px] sm:max-w-xs [&_input]:h-7 [&_input]:text-xs"
                  />

                  <Select
                    aria-label="Lọc KOC xu hướng theo quy mô Follower"
                    value={trendingFollowerTier}
                    onChange={(e) => setTrendingFollowerTier(e.target.value as FollowerTierKey)}
                    className="h-7 text-xs py-0"
                  >
                    <option value="ALL">Mọi quy mô Follower</option>
                    <option value="NANO">Nano (&lt; 50K flw)</option>
                    <option value="MICRO">Micro (50K – 200K flw)</option>
                    <option value="MACRO">Macro (200K – 500K flw)</option>
                    <option value="MEGA">Mega (&gt; 500K flw)</option>
                  </Select>
                </div>
              </div>

              {(trendingLoading || trendingHandleSearching) && trendingCreators.length === 0 ? (
                <TikTokCrawlCreativeLoader
                  mode="TRENDING"
                  queryLabel={
                    TRENDING_CATEGORY_OPTIONS.find((o) => o.key === trendingCategory)?.label ||
                    'Tất cả ngành hàng B2C'
                  }
                  targetCount={trendingRequestedCount ?? trendingTargetCount}
                  batchProgress={trendingBatchProgress}
                  collectedSoFar={trendingCreators.length}
                  onStop={() => {
                    trendingAbortRef.current = true;
                  }}
                />
              ) : (
                <>
                  {(trendingLoading || trendingHandleSearching) && trendingCreators.length > 0 && (
                    <TikTokCrawlCreativeLoader
                      compact
                      mode="TRENDING"
                      queryLabel={
                        TRENDING_CATEGORY_OPTIONS.find((o) => o.key === trendingCategory)?.label ||
                        'Tất cả ngành hàng B2C'
                      }
                      targetCount={trendingRequestedCount ?? trendingTargetCount}
                      batchProgress={trendingBatchProgress}
                      collectedSoFar={trendingCreators.length}
                      onStop={() => {
                        trendingAbortRef.current = true;
                      }}
                    />
                  )}
                  <DataTable
                    rows={filteredTrendingCreators}
                    columns={trendingColumns}
                    rowKey={(c) => c.handle}
                    fitContainer
                    empty={
                      trendingCreators.length > 0
                        ? `Không tìm thấy kênh khớp "${trendingSearch.trim()}". Bấm nút "Cào kênh @${trendingSearch.trim().replace(/^@+/, '')}" ở góc phải để quét trực tiếp từ TikTok.`
                        : 'Chọn ngành hàng và nhấn nút Quét KOC xu hướng để tải các kênh đang thịnh hành trên TikTok.'
                    }
                  />
                </>
              )}
            </>
          )}
        </Panel>
      )}

      {/* TAB 5: KIỂM TRA LINK AIR ĐA NỀN TẢNG (qua crawler-worker) */}
      {activeTab === 'LINK_AIR_CHECK' && (
        <LinkAirCheckerPanel
          onNotify={onNotify}
          restorePayload={linkAirRestorePayload}
          historyButton={renderHistoryButton('LINK_AIR_CHECK')}
          historyTable={renderTabWeeklyHistorySection('LINK_AIR_CHECK')}
          onStartCheck={() => setExpandedWeeklyTableByTab({})}
          onSaveHistory={(payload) => {
            void saveDailyHistorySession({
              tab: 'LINK_AIR_CHECK',
              rawInput: payload.rawInput,
              queryKey: payload.queryKey,
              queryLabel: payload.queryLabel,
              linkAirResults: payload.linkAirResults,
              linkAirExpect: payload.linkAirExpect,
            });
          }}
        />
      )}

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
    </div>
  );
};
