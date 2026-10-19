'use client';

import React, { useContext, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Flame,
  Hash,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';
import type { KocItem } from '../../lib/types';
import {
  buildCompetitorKocsCsv,
  buildScrapedKocsCsv,
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
} from '../../lib/tiktokKocScraper';
import { formatDate, formatNumber } from '../../lib/format';
import { formatFollowers } from '../koc/kocUtils';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import { TikTokVideoInspectorModal } from '../koc/TikTokVideoInspectorModal';
import { LinkAirCheckerPanel } from '../crawler/LinkAirCheckerPanel';
import {
  Avatar,
  Button,
  Chips,
  DataTable,
  Field,
  FilterBar,
  PageActiveContext,
  Panel,
  Segmented,
  Select,
  Status,
} from '../ui';
import type { Column } from '../ui';

interface TikTokCrawlerHubViewProps {
  kocs: KocItem[];
  onSaveScrapedKocs: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onNavigateToKocMaster?: () => void;
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
  | 'HAS_PHONE';
type HashtagFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'VIRAL_BREAKOUT'
  | 'HAS_PHONE';
type TrendingFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'VERIFIED'
  | 'HAS_CONTACT';
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

const COMPETITOR_SAMPLES = [
  { handle: '@larocheposayvn', label: 'La Roche-Posay VN' },
  { handle: '@keyshulive', label: 'KEYSHU LIVE' },
  { handle: '@anessavietnam', label: 'Anessa Vietnam' },
  { handle: '@romand_vn', label: 'Rom&nd Vietnam' },
  { handle: '@cocoonvietnam', label: 'Cocoon Vietnam' },
  { handle: '@skin1004_vietnam', label: 'SKIN1004 Vietnam' },
  { handle: '@cetaphilvietnam', label: 'Cetaphil Vietnam' },
];

const HASHTAG_SAMPLES = [
  '#kemchongnang',
  '#skincare',
  '#clubclio',
  '#kutieskin',
  '#duocmypham',
  '#mebimsua',
  '#cushion',
];

const SAMPLE_VIDEO_URLS = [
  {
    url: 'https://www.tiktok.com/@keyshulive/video/7542352999495060743',
    label: '@keyshulive (2,4M view · 88 bình luận thực)',
  },
  {
    url: 'https://www.tiktok.com/@quinskincareholic/video/7511336312234970375',
    label: '@quinskincareholic (181K view · 112 bình luận thực)',
  },
  {
    url: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
    label: 'TikTok Official',
  },
];

export const TikTokCrawlerHubView: React.FC<TikTokCrawlerHubViewProps> = ({
  kocs,
  onSaveScrapedKocs,
  onNotify,
  onNavigateToKocMaster,
}) => {
  const [activeTab, setActiveTab] = useState<CrawlerTabKey>('COMPETITOR_KOCS');
  const period: PeriodKey = '30d';

  // --- State Tab 1: Quét KOC của Đối thủ ---
  const [competitorInput, setCompetitorInput] = useState('');
  const [compTargetCount, setCompTargetCount] = useState<number>(12);
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
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentBatchProgress, setCommentBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentData, setCommentData] = useState<TikTokVideoCommentsScrapeResult | null>(null);
  const [commentFilter, setCommentFilter] = useState<CommentFilterKey>('ALL');
  const [commentSearch, setCommentSearch] = useState('');
  const [commentSortBy, setCommentSortBy] = useState<'INTENT_FIRST' | 'LIKES_DESC' | 'NEWEST'>('INTENT_FIRST');
  const commentAbortRef = useRef(false);

  // --- State Tab 4: KOC Xu hướng ---
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingCreators, setTrendingCreators] = useState<TikTokTrendingCreatorItem[]>([]);
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilterKey>('ALL');
  const [trendingFollowerTier, setTrendingFollowerTier] = useState<FollowerTierKey>('ALL');
  const [trendingSearch, setTrendingSearch] = useState('');

  // --- State Modals ---
  const [scraperModalOpen, setScraperModalOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');
  const [videoInspectorOpen, setVideoInspectorOpen] = useState(false);

  // Làm mới toàn bộ kết quả từ lần trước mỗi khi người dùng nhấn vào màn hình Crawler
  const isPageActive = useContext(PageActiveContext);
  const [prevPageActive, setPrevPageActive] = useState(isPageActive);
  if (prevPageActive !== isPageActive) {
    setPrevPageActive(isPageActive);
    setActiveTab('COMPETITOR_KOCS');
    setCompetitorInput('');
    setCompLoading(false);
    setCompBatchProgress(null);
    setCompError(null);
    setCompProfile(null);
    setCompResults([]);
    setCompSearchQuery('');
    setHashtagInput('');
    setTagLoading(false);
    setTagBatchProgress(null);
    setTagError(null);
    setTagResults([]);
    setTagSearchQuery('');
    setVideoCommentUrl('');
    setCommentLoading(false);
    setCommentBatchProgress(null);
    setCommentError(null);
    setCommentData(null);
    setCommentSearch('');
    setTrendingLoading(false);
    setTrendingCreators([]);
    setTrendingSearch('');
  }

  useEffect(() => {
    if (!isPageActive) {
      compAbortRef.current = true;
      tagAbortRef.current = true;
      commentAbortRef.current = true;
    }
  }, [isPageActive]);

  const existingByHandle = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of kocs) {
      const clean = (k.channelId || '').trim().toLowerCase().replace(/^@+/, '');
      if (clean) map.set(clean, k);
    }
    return map;
  }, [kocs]);

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
    }
    const baseList = appendMode ? [...compResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? compTargetCount) || 12, 1), 1000);

    const totalNeeded = Math.max(1, requestedTotal - baseList.length);
    const totalBatches = Math.max(1, Math.ceil(totalNeeded / KOC_BATCH_SIZE));

    compAbortRef.current = false;
    setCompLoading(true);
    setCompError(null);

    const accumulatedMap = new Map<string, TikTokCompetitorKocResult>();
    for (const item of baseList) {
      accumulatedMap.set(item.handle.toLowerCase(), item);
    }
    let latestProfile = appendMode ? compProfile : null;

    try {
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (compAbortRef.current) break;

        const remaining = requestedTotal - accumulatedMap.size;
        if (remaining <= 0) break;
        const batchLimit = Math.min(KOC_BATCH_SIZE, remaining);

        setCompBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches,
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
            pageOffset: batchIdx,
            skipProfileFetch: accumulatedMap.size > 0 && Boolean(latestProfile),
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.results)) {
          if (accumulatedMap.size === 0) {
            setCompError(json.message || 'Không quét được danh sách KOC của đối thủ này.');
          }
          break;
        }

        if (json.competitorProfile && (!latestProfile || !latestProfile.followers)) {
          latestProfile = json.competitorProfile;
          setCompProfile(json.competitorProfile);
        }

        let addedInBatch = 0;
        for (const row of json.results as TikTokCompetitorKocResult[]) {
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
          totalBatches,
          collectedCount: mergedList.length,
          targetCount: requestedTotal,
        });

        if (addedInBatch === 0) break;
      }
    } catch {
      if (accumulatedMap.size === 0) {
        setCompError('Không kết nối được dịch vụ thu thập dữ liệu TikTok. Vui lòng thử lại.');
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
    }
    const baseList = appendMode ? [...tagResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? tagTargetCount) || 12, 1), 1000);

    const totalNeeded = Math.max(1, requestedTotal - baseList.length);
    const totalBatches = Math.max(1, Math.ceil(totalNeeded / KOC_BATCH_SIZE));

    tagAbortRef.current = false;
    setTagLoading(true);
    setTagError(null);

    const accumulatedMap = new Map<string, TikTokHashtagKocResult>();
    for (const item of baseList) {
      accumulatedMap.set(item.handle.toLowerCase(), item);
    }

    try {
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (tagAbortRef.current) break;

        const remaining = requestedTotal - accumulatedMap.size;
        if (remaining <= 0) break;
        const batchLimit = Math.min(KOC_BATCH_SIZE, remaining);

        setTagBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches,
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
            pageOffset: batchIdx,
          }),
        });
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.results)) {
          if (accumulatedMap.size === 0) {
            setTagError(json.message || 'Không tìm thấy KOC nào cho hashtag này.');
          }
          break;
        }

        let addedInBatch = 0;
        for (const row of json.results as TikTokHashtagKocResult[]) {
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
          totalBatches,
          collectedCount: mergedList.length,
          targetCount: requestedTotal,
        });

        if (addedInBatch === 0) break;
      }
    } catch {
      if (accumulatedMap.size === 0) {
        setTagError('Không kết nối được dịch vụ quét hashtag TikTok.');
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
            setCommentError(json.message || 'Không lấy được danh sách bình luận của video này.');
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

        setCommentData({
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
        });

        setCommentBatchProgress({
          currentBatch: batchIdx + 1,
          totalBatches,
          collectedCount: allComments.length,
          targetCount: requestedTotal,
        });

        if (!json.hasMore || addedInBatch === 0) break;
      }
    } catch {
      if (commentMap.size === 0) {
        setCommentError('Không kết nối được dịch vụ cào bình luận video TikTok.');
      }
    } finally {
      setCommentLoading(false);
      setCommentBatchProgress(null);
    }
  };

  const runTrendingCreatorsCrawl = async () => {
    setTrendingLoading(true);
    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendingCreators: true,
          limit: 30,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.creators)) {
        setTrendingCreators(json.creators);
      }
    } finally {
      setTrendingLoading(false);
    }
  };

  const filteredCompResults = useMemo(() => {
    const filtered = compResults.filter((r) => {
      const c = r.competitorCollaboration;
      const p = r.channelProfile;
      const e = r.engagementMetrics;
      const isExisting = existingByHandle.has(r.handle) || c.isAlreadyInUpbase;

      if (compFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (compFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (compFilter === 'PAID_BOOKING' && c.collaborationType !== 'PAID_BOOKING') return false;
      if (compFilter === 'AFFILIATE_CART' && c.collaborationType !== 'AFFILIATE_CART') return false;
      if (compFilter === 'HAS_PHONE' && !p.extractedPhone) return false;

      if (!matchesFollowerTier(p.followers, compFollowerTier)) return false;
      if (compMinViews > 0 && c.latestCollabViews < compMinViews) return false;
      if (compMinEr > 0 && e.engagementRate < compMinEr) return false;

      if (compSearchQuery.trim()) {
        const q = compSearchQuery.toLowerCase();
        const matchHandle = p.handle.toLowerCase().includes(q);
        const matchName = p.nickname.toLowerCase().includes(q);
        const matchProd = c.competitorProductPromoted.toLowerCase().includes(q);
        const matchCaption = c.latestCollabCaption.toLowerCase().includes(q);
        const matchPhone = (p.extractedPhone || '').toLowerCase().includes(q);
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
  ]);

  const filteredTagResults = useMemo(() => {
    const filtered = tagResults.filter((r) => {
      const p = r.channelProfile;
      const v = r.matchedHashtagVideo;
      const e = r.engagementMetrics;
      const isExisting = existingByHandle.has(r.handle);

      if (tagFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (tagFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (tagFilter === 'VIRAL_BREAKOUT' && v.breakoutRatio < 1) return false;
      if (tagFilter === 'HAS_PHONE' && !p.extractedPhone) return false;

      if (!matchesFollowerTier(p.followers, tagFollowerTier)) return false;
      if (tagMinViews > 0 && v.views < tagMinViews) return false;
      if (tagMinEr > 0 && e.engagementRate < tagMinEr) return false;

      if (tagSearchQuery.trim()) {
        const q = tagSearchQuery.toLowerCase();
        const matchHandle = p.handle.toLowerCase().includes(q);
        const matchName = p.nickname.toLowerCase().includes(q);
        const matchCaption = v.captionSnippet.toLowerCase().includes(q);
        const matchPhone = (p.extractedPhone || '').toLowerCase().includes(q);
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
        const q = commentSearch.toLowerCase();
        if (
          !c.text.toLowerCase().includes(q) &&
          !c.username.toLowerCase().includes(q) &&
          !c.nickname.toLowerCase().includes(q)
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
      if (trendingFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (trendingFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (trendingFilter === 'VERIFIED' && !c.verified) return false;
      if (trendingFilter === 'HAS_CONTACT' && !c.extractedPhone && !c.extractedEmail) return false;
      if (!matchesFollowerTier(c.followers, trendingFollowerTier)) return false;

      if (trendingSearch.trim()) {
        const q = trendingSearch.toLowerCase();
        if (
          !c.handle.toLowerCase().includes(q) &&
          !c.nickname.toLowerCase().includes(q) &&
          !c.bio.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [trendingCreators, trendingFilter, trendingFollowerTier, trendingSearch, existingByHandle]);

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
    const mapped = mapScrapedResultToKocItem(item, matched);
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
      const mapped = mapScrapedResultToKocItem(item, matched);
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
    a.download = `koc-doi-thu-${compProfile?.handle || 'tiktok'}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    a.download = `koc-hashtag-${hashtagInput.replace(/[^a-z0-9]/gi, '')}-${new Date().toISOString().slice(0, 10)}.csv`;
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
    a.download = `binh-luan-video-${commentData.videoInfo.videoId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất CSV ${filteredComments.length} bình luận video`, 'success');
  };

  const competitorColumns: Column<TikTokCompetitorKocResult>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC & Liên hệ',
      width: 230,
      render: (r) => {
        const p = r.channelProfile;
        const isExisting =
          existingByHandle.has(r.handle) || r.competitorCollaboration.isAlreadyInUpbase;
        return (
          <div className="flex items-start gap-2.5 min-w-0">
            <Avatar name={p.nickname} src={p.avatarUrl} size={36} />
            <div className="grid gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={p.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1"
                >
                  <span>@{p.handle}</span>
                  <ExternalLink className="w-3 h-3 text-ink-3" />
                </a>
                <Status tone={isExisting ? 'neutral' : 'positive'}>
                  {isExisting ? 'Đã có' : 'KOC Mới'}
                </Status>
              </div>
              <span className="text-2xs text-ink-2 truncate">{p.nickname}</span>
              {p.extractedPhone && (
                <span className="text-2xs text-ink font-code inline-flex items-center gap-1 tabular-nums">
                  <Phone className="w-3 h-3 text-ink-3 shrink-0" />
                  <span>{p.extractedPhone}</span>
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'collab',
      header: 'Hình thức & Sản phẩm',
      width: 230,
      render: (r) => {
        const c = r.competitorCollaboration;
        return (
          <div className="grid gap-1 min-w-0 max-w-[250px]">
            <div className="flex items-center gap-1.5 flex-wrap">
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
              className="text-xs text-ink-2 truncate"
              title={c.competitorProductPromoted}
            >
              {c.competitorProductPromoted}
            </span>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video hợp tác gần nhất',
      width: 280,
      render: (r) => {
        const c = r.competitorCollaboration;
        return (
          <div className="grid gap-1 min-w-0 max-w-[300px]">
            <a
              href={c.latestCollabVideoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
            >
              <span>{c.latestCollabCaption}</span>
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
            </a>
            <div className="flex items-center gap-2 text-2xs text-ink-3 tabular-nums">
              <span>{formatDate(c.latestCollabPublishedAt)}</span>
              <span>·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoCommentUrl(c.latestCollabVideoUrl);
                  setActiveTab('COMMENTS_AND_TRENDING');
                  void runVideoCommentsCrawl(c.latestCollabVideoUrl);
                }}
                className="text-accent hover:underline font-medium"
              >
                Xem bình luận
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'compPerf',
      header: 'Hiệu quả video',
      align: 'right',
      width: 155,
      render: (r) => {
        const c = r.competitorCollaboration;
        const e = r.engagementMetrics;
        return (
          <div className="grid gap-0.5">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {formatNumber(c.latestCollabViews)} view
            </span>
            <span className="text-2xs text-positive font-semibold tabular-nums">
              ER {e.engagementRate}% · {formatNumber(e.avgLikes)} tim
            </span>
          </div>
        );
      },
    },
    {
      key: 'channelAction',
      header: 'Quy mô kênh & Thao tác',
      align: 'right',
      width: 215,
      render: (r) => {
        const p = r.channelProfile;
        const isExisting = existingByHandle.has(r.handle);
        return (
          <div className="grid gap-1 justify-items-end">
            <div className="text-xs text-ink tabular-nums">
              <span className="font-semibold">{formatFollowers(p.followers)}</span> flw ·{' '}
              <span className="text-ink-2">{formatNumber(p.videoCount)} video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setScraperInitialHandle(`@${r.handle}`);
                  setScraperModalOpen(true);
                }}
              >
                Chi tiết
              </Button>
              <Button
                size="sm"
                variant={isExisting ? 'secondary' : 'primary'}
                icon={isExisting ? Check : UserPlus}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveSingleKoc(r);
                }}
              >
                {isExisting ? 'Cập nhật' : 'Lưu KOC'}
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const hashtagColumns: Column<TikTokHashtagKocResult>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC & Liên hệ',
      width: 230,
      render: (r) => {
        const p = r.channelProfile;
        const isExisting = existingByHandle.has(r.handle);
        return (
          <div className="flex items-start gap-2.5 min-w-0">
            <Avatar name={p.nickname} src={p.avatarUrl} size={36} />
            <div className="grid gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={p.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1"
                >
                  <span>@{p.handle}</span>
                  <ExternalLink className="w-3 h-3 text-ink-3" />
                </a>
                <Status tone={isExisting ? 'neutral' : 'positive'}>
                  {isExisting ? 'Đã có' : 'KOC Mới'}
                </Status>
              </div>
              <span className="text-2xs text-ink-2 truncate">{p.nickname}</span>
              {p.extractedPhone && (
                <span className="text-2xs text-ink font-code tabular-nums">
                  SĐT: {p.extractedPhone}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video gắn Hashtag',
      width: 310,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return (
          <div className="grid gap-1 min-w-0 max-w-[330px]">
            <a
              href={v.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
            >
              <span>{v.captionSnippet}</span>
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
            </a>
            <div className="flex items-center gap-2 text-2xs text-ink-3 tabular-nums">
              <span>{formatDate(v.publishedAt)}</span>
              <span>·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoCommentUrl(v.videoUrl);
                  setActiveTab('COMMENTS_AND_TRENDING');
                  void runVideoCommentsCrawl(v.videoUrl);
                }}
                className="text-accent hover:underline font-medium"
              >
                Xem bình luận
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'breakout',
      header: 'Hiệu quả video',
      align: 'right',
      width: 175,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return (
          <div className="grid gap-0.5">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {formatNumber(v.views)} view · {formatNumber(v.likes)} tim
            </span>
            <span className="text-2xs text-positive font-semibold tabular-nums">
              View/Flw {v.breakoutRatio}x · ER {r.engagementMetrics.engagementRate}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'channelStats',
      header: 'Quy mô kênh & Thao tác',
      align: 'right',
      width: 210,
      render: (r) => {
        const p = r.channelProfile;
        const isExisting = existingByHandle.has(r.handle);
        return (
          <div className="grid gap-1 justify-items-end">
            <span className="text-xs text-ink tabular-nums">
              <span className="font-semibold">{formatFollowers(p.followers)}</span> flw ·{' '}
              <span className="text-ink-2">{formatNumber(p.videoCount)} video</span>
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setScraperInitialHandle(`@${r.handle}`);
                  setScraperModalOpen(true);
                }}
              >
                Chi tiết
              </Button>
              <Button
                size="sm"
                variant={isExisting ? 'secondary' : 'primary'}
                icon={isExisting ? Check : UserPlus}
                onClick={() => handleSaveSingleKoc(r)}
              >
                {isExisting ? 'Cập nhật' : 'Lưu KOC'}
              </Button>
            </div>
          </div>
        );
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
      key: 'creator',
      header: 'Kênh KOC xu hướng',
      width: 240,
      render: (c) => {
        const isExisting = existingByHandle.has(c.handle.toLowerCase());
        return (
          <div className="flex items-start gap-2.5 min-w-0">
            <Avatar name={c.nickname} src={c.avatarUrl} size={36} />
            <div className="grid gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={c.channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-ink hover:text-accent inline-flex items-center gap-1"
                >
                  <span>@{c.handle}</span>
                  <ExternalLink className="w-3 h-3 text-ink-3" />
                </a>
                {c.verified && <Status tone="positive">Tick xanh</Status>}
                {isExisting && <Status tone="neutral">Đã có</Status>}
              </div>
              <span className="text-2xs text-ink-2 truncate">{c.nickname}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'bio',
      header: 'Tiểu sử & Liên hệ',
      width: 310,
      render: (c) => (
        <div className="grid gap-0.5 min-w-0 max-w-[330px]">
          <span className="text-xs text-ink line-clamp-2">{c.bio || '—'}</span>
          {(c.extractedPhone || c.extractedEmail) && (
            <span className="text-2xs text-ink-3 font-code">
              {c.extractedPhone ? `SĐT: ${c.extractedPhone}` : ''}{' '}
              {c.extractedEmail ? `· ${c.extractedEmail}` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'scale',
      header: 'Quy mô kênh',
      align: 'right',
      width: 190,
      render: (c) => (
        <div className="grid gap-0.5 tabular-nums">
          <span className="text-xs font-semibold text-ink">
            {formatFollowers(c.followers)} flw · {formatFollowers(c.totalLikes)} tim
          </span>
          <span className="text-2xs text-ink-3">
            {formatNumber(c.videoCount)} video trên kênh
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: 160,
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            icon={Search}
            onClick={() => {
              setScraperInitialHandle(`@${c.handle}`);
              setScraperModalOpen(true);
            }}
          >
            Cào chi tiết kênh
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Thanh điều hướng gọn nhẹ, chuyển tab không tự động quét */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<CrawlerTabKey>
          items={[
            {
              key: 'COMPETITOR_KOCS',
              label: 'KOC của đối thủ',
            },
            {
              key: 'HASHTAG_DISCOVERY',
              label: 'KOC theo #Hashtag',
            },
            {
              key: 'COMMENTS_AND_TRENDING',
              label: 'Bình luận video',
            },
            {
              key: 'CHANNEL_AND_VIDEO_TOOLS',
              label: 'KOC xu hướng',
            },
            {
              key: 'LINK_AIR_CHECK',
              label: 'Kiểm tra link air',
            },
          ]}
          value={activeTab}
          onChange={(t) => setActiveTab(t)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Search}
            onClick={() => {
              setScraperInitialHandle('');
              setScraperModalOpen(true);
            }}
          >
            Cào kênh theo @handle
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={Video}
            onClick={() => setVideoInspectorOpen(true)}
          >
            Nghiệm thu link video
          </Button>
          {onNavigateToKocMaster && (
            <Button
              size="sm"
              variant="ghost"
              icon={Users}
              onClick={onNavigateToKocMaster}
            >
              Danh bạ KOC ({kocs.length})
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: QUÉT KOC LÀM VIỆC CHO ĐỐI THỦ */}
      {activeTab === 'COMPETITOR_KOCS' && (
        <div className="space-y-4">
          <Panel title="Quét danh sách KOC hợp tác với thương hiệu đối thủ">
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Kênh TikTok hoặc tên thương hiệu đối thủ"
                  htmlFor="competitor-channel-input"
                  error={compError || undefined}
                >
                  <input
                    id="competitor-channel-input"
                    type="text"
                    value={competitorInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompetitorInput(val);
                      if (compError) setCompError(null);
                      if (!val.trim() || compResults.length > 0 || compProfile) {
                        setCompResults([]);
                        setCompProfile(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !compLoading) {
                        e.preventDefault();
                        void runCompetitorCrawl(competitorInput, period, {
                          targetCount: compTargetCount,
                        });
                      }
                    }}
                    placeholder="Ví dụ: @larocheposayvn, @anessavietnam, @romand_vn, Cocoon..."
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink focus:outline-none focus:border-line-strong font-code"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 h-9 rounded-lg border border-line">
                    <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                    {KOC_COUNT_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCompTargetCount(n)}
                        className={`px-2 py-0.5 rounded text-xs font-code transition-colors ${
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
                      title="Nhập số lượng KOC cần quét (tối đa 1000 KOC, hệ thống tự chia đợt 12 KOC/lần)"
                      className="w-16 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <Button
                    variant="primary"
                    icon={compLoading ? RefreshCw : Search}
                    disabled={compLoading}
                    onClick={() =>
                      runCompetitorCrawl(competitorInput, period, {
                        targetCount: compTargetCount,
                      })
                    }
                  >
                    {compLoading
                      ? compBatchProgress
                        ? `Đang quét đợt ${compBatchProgress.currentBatch}/${compBatchProgress.totalBatches} (${compBatchProgress.collectedCount}/${compBatchProgress.targetCount})...`
                        : 'Đang quét...'
                      : 'Quét KOC đối thủ'}
                  </Button>
                  {compLoading && (
                    <Button
                      variant="secondary"
                      icon={Square}
                      onClick={() => {
                        compAbortRef.current = true;
                      }}
                    >
                      Dừng
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Thương hiệu mẫu:</span>
                {COMPETITOR_SAMPLES.map((s) => (
                  <button
                    key={s.handle}
                    type="button"
                    onClick={() => {
                      if (competitorInput.toLowerCase() !== s.handle.toLowerCase()) {
                        setCompResults([]);
                        setCompProfile(null);
                      }
                      setCompetitorInput(s.handle);
                      if (compError) setCompError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                      competitorInput.toLowerCase() === s.handle.toLowerCase()
                        ? 'bg-accent-soft border-accent text-ink font-semibold'
                        : 'bg-surface border-line text-ink-2 hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    <span className="font-code">{s.handle}</span>
                    <span className="text-2xs text-ink-3 ml-1">({s.label})</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Thanh tóm tắt gọn nhẹ thông tin kênh đối thủ + tổng lượt xem KOC hợp tác */}
          {compProfile && compResults.length > 0 && (
            <div className="px-4 py-3 rounded-xl border border-line bg-surface flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={compProfile.brandName} size={38} />
                <div className="grid gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">
                      {compProfile.brandName}
                    </span>
                    <a
                      href={compProfile.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-code text-accent hover:underline inline-flex items-center gap-1"
                    >
                      <span>@{compProfile.handle}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Status tone="neutral">{compProfile.category}</Status>
                  </div>
                  {compProfile.bio && (
                    <span className="text-2xs text-ink-2 truncate max-w-xl">
                      {compProfile.bio}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs tabular-nums">
                <div>
                  <span className="text-ink-3 block text-2xs">Follower kênh</span>
                  <strong className="text-ink">
                    {formatNumber(compProfile.followers)}
                  </strong>
                </div>
                <div>
                  <span className="text-ink-3 block text-2xs">Video trên kênh</span>
                  <strong className="text-ink">
                    {formatNumber(compProfile.videoCount)}
                  </strong>
                </div>
                <div>
                  <span className="text-ink-3 block text-2xs">Tổng view KOC hợp tác</span>
                  <strong className="text-positive">
                    {formatNumber(compStats.totalCompViews)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Bảng danh sách KOC của đối thủ — chỉ hiển thị khi đang quét hoặc đã có kết quả */}
          {(compLoading || compResults.length > 0) && (
            <Panel
              title={`KOC hợp tác với ${compProfile?.brandName || competitorInput} (${filteredCompResults.length}/${compResults.length})`}
              flush
              actions={
                <div className="flex flex-wrap items-center gap-2">
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
                    Quét thêm +{KOC_BATCH_SIZE} KOC
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
                    Lưu tất cả vào Danh bạ
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-3 border-b border-line bg-surface">
                <FilterBar
                  search={{
                    value: compSearchQuery,
                    onChange: setCompSearchQuery,
                    placeholder: 'Tìm theo @handle, tên KOC, SĐT, sản phẩm hoặc nội dung video...',
                  }}
                  filters={
                    <>
                      <Select
                        aria-label="Lọc theo quy mô Follower"
                        value={compFollowerTier}
                        onChange={(e) => setCompFollowerTier(e.target.value as FollowerTierKey)}
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                          Đặt lại lọc
                        </Button>
                      )}
                    </>
                  }
                  chips={
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
                      ]}
                      value={compFilter}
                      onChange={setCompFilter}
                    />
                  }
                />
              </div>

              <DataTable
                rows={filteredCompResults}
                columns={competitorColumns}
                rowKey={(r) => r.handle}
                fitContainer
                empty={compLoading ? 'Đang quét danh sách KOC hợp tác...' : 'Không có KOC nào khớp bộ lọc.'}
              />
            </Panel>
          )}
        </div>
      )}

      {/* TAB 2: TÌM KOC THEO #HASHTAG / TỪ KHÓA */}
      {activeTab === 'HASHTAG_DISCOVERY' && (
        <div className="space-y-4">
          <Panel title="Tìm kiếm KOC có video nổi bật theo #Hashtag hoặc từ khóa ngách">
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Hashtag hoặc từ khóa ngách trên TikTok"
                  htmlFor="crawler-hashtag-input"
                  error={tagError || undefined}
                >
                  <input
                    id="crawler-hashtag-input"
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHashtagInput(val);
                      if (tagError) setTagError(null);
                      if (!val.trim() || tagResults.length > 0) {
                        setTagResults([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !tagLoading) {
                        e.preventDefault();
                        void runHashtagCrawl(hashtagInput, period, {
                          targetCount: tagTargetCount,
                        });
                      }
                    }}
                    placeholder="Ví dụ: #kemchongnang, #skincare, #clubclio, #kutieskin..."
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink focus:outline-none focus:border-line-strong font-code"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 h-9 rounded-lg border border-line">
                    <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                    {KOC_COUNT_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTagTargetCount(n)}
                        className={`px-2 py-0.5 rounded text-xs font-code transition-colors ${
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
                      title="Nhập số lượng KOC cần quét theo Hashtag (tối đa 1000 KOC, hệ thống tự chia đợt 12 KOC/lần)"
                      className="w-16 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <Button
                    variant="primary"
                    icon={tagLoading ? RefreshCw : Hash}
                    disabled={tagLoading}
                    onClick={() =>
                      runHashtagCrawl(hashtagInput, period, {
                        targetCount: tagTargetCount,
                      })
                    }
                  >
                    {tagLoading
                      ? tagBatchProgress
                        ? `Đang quét đợt ${tagBatchProgress.currentBatch}/${tagBatchProgress.totalBatches} (${tagBatchProgress.collectedCount}/${tagBatchProgress.targetCount})...`
                        : 'Đang quét...'
                      : 'Quét theo Hashtag'}
                  </Button>
                  {tagLoading && (
                    <Button
                      variant="secondary"
                      icon={Square}
                      onClick={() => {
                        tagAbortRef.current = true;
                      }}
                    >
                      Dừng
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Hashtag mẫu:</span>
                {HASHTAG_SAMPLES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (hashtagInput.toLowerCase() !== tag.toLowerCase()) {
                        setTagResults([]);
                      }
                      setHashtagInput(tag);
                      if (tagError) setTagError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md border text-xs font-code transition-colors ${
                      hashtagInput.toLowerCase() === tag.toLowerCase()
                        ? 'bg-accent-soft border-accent text-ink font-semibold'
                        : 'bg-surface border-line text-ink-2 hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {(tagLoading || tagResults.length > 0) && (
            <Panel
              title={`KOC theo ${hashtagInput} (${filteredTagResults.length}/${tagResults.length})`}
              flush
              actions={
                <div className="flex flex-wrap items-center gap-2">
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
                    Quét thêm +{KOC_BATCH_SIZE} KOC
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
                    Lưu tất cả vào Danh bạ
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-3 border-b border-line bg-surface">
                <FilterBar
                  search={{
                    value: tagSearchQuery,
                    onChange: setTagSearchQuery,
                    placeholder: 'Tìm theo @handle, tên kênh, SĐT hoặc nội dung caption...',
                  }}
                  filters={
                    <>
                      <Select
                        aria-label="Lọc theo quy mô Follower"
                        value={tagFollowerTier}
                        onChange={(e) => setTagFollowerTier(e.target.value as FollowerTierKey)}
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                        className="h-[34px] text-xs"
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
                          Đặt lại lọc
                        </Button>
                      )}
                    </>
                  }
                  chips={
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
                      ]}
                      value={tagFilter}
                      onChange={setTagFilter}
                    />
                  }
                />
              </div>

              <DataTable
                rows={filteredTagResults}
                columns={hashtagColumns}
                rowKey={(r) => r.handle}
                fitContainer
                empty={tagLoading ? 'Đang quét danh sách KOC theo hashtag...' : 'Không có KOC nào khớp bộ lọc.'}
              />
            </Panel>
          )}
        </div>
      )}

      {/* TAB 3: BÌNH LUẬN VIDEO */}
      {activeTab === 'COMMENTS_AND_TRENDING' && (
        <div className="space-y-4">
          <Panel title="Cào bình luận video TikTok & lọc khách hỏi mua hàng">
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Đường dẫn video TikTok"
                  htmlFor="video-comment-url-input"
                  error={commentError || undefined}
                >
                  <input
                    id="video-comment-url-input"
                    type="text"
                    value={videoCommentUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoCommentUrl(val);
                      if (commentError) setCommentError(null);
                      if (!val.trim() || commentData) {
                        setCommentData(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !commentLoading) {
                        e.preventDefault();
                        void runVideoCommentsCrawl(videoCommentUrl, {
                          targetCount: commentTargetCount,
                        });
                      }
                    }}
                    placeholder="Ví dụ: https://www.tiktok.com/@keyshulive/video/7542352999495060743"
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink focus:outline-none focus:border-line-strong font-code"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-2 px-2.5 h-9 rounded-lg border border-line">
                    <span className="text-2xs text-ink-2 whitespace-nowrap">Số lượng:</span>
                    {COMMENT_COUNT_PRESETS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCommentTargetCount(n)}
                        className={`px-2 py-0.5 rounded text-xs font-code transition-colors ${
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
                      title="Nhập số lượng bình luận muốn lấy (tối đa 1000, hệ thống tự chia đợt 40 bình luận/lần)"
                      className="w-16 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <Button
                    variant="primary"
                    icon={commentLoading ? RefreshCw : MessageSquare}
                    disabled={commentLoading}
                    onClick={() =>
                      runVideoCommentsCrawl(videoCommentUrl, {
                        targetCount: commentTargetCount,
                      })
                    }
                  >
                    {commentLoading
                      ? commentBatchProgress
                        ? `Đang cào đợt ${commentBatchProgress.currentBatch}/${commentBatchProgress.totalBatches} (${commentBatchProgress.collectedCount}/${commentBatchProgress.targetCount})...`
                        : 'Đang tải...'
                      : 'Cào bình luận'}
                  </Button>
                  {commentLoading && (
                    <Button
                      variant="secondary"
                      icon={Square}
                      onClick={() => {
                        commentAbortRef.current = true;
                      }}
                    >
                      Dừng
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                <span>Video mẫu:</span>
                {SAMPLE_VIDEO_URLS.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => {
                      if (videoCommentUrl !== item.url) {
                        setCommentData(null);
                      }
                      setVideoCommentUrl(item.url);
                      if (commentError) setCommentError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                      videoCommentUrl === item.url
                        ? 'bg-accent-soft border-accent text-ink font-semibold'
                        : 'bg-surface border-line text-ink-2 hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {commentData && (
            <>
              <div className="px-4 py-3 rounded-xl border border-line bg-surface flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">
                      Kênh đăng: @{commentData.videoInfo.authorHandle}
                    </span>
                    <span className="text-2xs text-ink-3 tabular-nums">
                      · Ngày đăng: {formatDate(commentData.videoInfo.publishedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 truncate">
                    {commentData.videoInfo.caption}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs tabular-nums">
                  <div>
                    <span className="text-ink-3 block text-2xs">Lượt xem</span>
                    <strong className="text-ink">
                      {formatNumber(commentData.videoInfo.views)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Lượt thích</span>
                    <strong className="text-ink">
                      {formatNumber(commentData.videoInfo.likes)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tổng bình luận</span>
                    <strong className="text-ink">
                      {formatNumber(commentData.videoInfo.commentsCount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tỷ lệ hỏi mua</span>
                    <strong className="text-positive">
                      {commentData.summary.buyingIntentRate}%
                    </strong>
                  </div>
                </div>
              </div>

              <Panel
                title={`Danh sách bình luận (${filteredComments.length}/${commentData.comments.length})`}
                flush
                actions={
                  <div className="flex flex-wrap items-center gap-2">
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
                      Cào thêm +{COMMENT_BATCH_SIZE} bình luận
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
                  </div>
                }
              >
                <div className="px-4 py-3 border-b border-line bg-surface">
                  <FilterBar
                    search={{
                      value: commentSearch,
                      onChange: setCommentSearch,
                      placeholder: 'Tìm nội dung bình luận hoặc @username người bình luận...',
                    }}
                    filters={
                      <Select
                        aria-label="Sắp xếp bình luận"
                        value={commentSortBy}
                        onChange={(e) =>
                          setCommentSortBy(
                            e.target.value as 'INTENT_FIRST' | 'LIKES_DESC' | 'NEWEST'
                          )
                        }
                        className="h-[34px] text-xs"
                      >
                        <option value="INTENT_FIRST">Sắp xếp: Ưu tiên khách hỏi mua</option>
                        <option value="LIKES_DESC">Sắp xếp: Lượt thích cao → thấp</option>
                        <option value="NEWEST">Sắp xếp: Bình luận mới nhất</option>
                      </Select>
                    }
                    chips={
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
                            label: 'Có để lại SĐT',
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
                    }
                  />
                </div>

                <DataTable
                  rows={filteredComments}
                  columns={commentColumns}
                  rowKey={(c) => c.cid}
                  fitContainer
                  empty="Không có bình luận nào khớp bộ lọc."
                />
              </Panel>
            </>
          )}
        </div>
      )}

      {/* TAB 4: DANH SÁCH KOC XU HƯỚNG TRÊN TIKTOK */}
      {activeTab === 'CHANNEL_AND_VIDEO_TOOLS' && (
        <Panel
          title={`KOC đang thịnh hành trên TikTok (${filteredTrendingCreators.length}/${trendingCreators.length})`}
          flush
          actions={
            <Button
              size="sm"
              variant="primary"
              icon={trendingLoading ? RefreshCw : Flame}
              disabled={trendingLoading}
              onClick={runTrendingCreatorsCrawl}
            >
              {trendingLoading ? 'Đang quét...' : 'Quét danh sách xu hướng'}
            </Button>
          }
        >
          <div className="px-4 py-3 border-b border-line bg-surface">
            <FilterBar
              search={{
                value: trendingSearch,
                onChange: setTrendingSearch,
                placeholder: 'Tìm theo @handle, tên kênh hoặc nội dung tiểu sử...',
              }}
              filters={
                <Select
                  aria-label="Lọc KOC xu hướng theo quy mô Follower"
                  value={trendingFollowerTier}
                  onChange={(e) => setTrendingFollowerTier(e.target.value as FollowerTierKey)}
                  className="h-[34px] text-xs"
                >
                  <option value="ALL">Mọi quy mô Follower</option>
                  <option value="NANO">Nano (&lt; 50K flw)</option>
                  <option value="MICRO">Micro (50K – 200K flw)</option>
                  <option value="MACRO">Macro (200K – 500K flw)</option>
                  <option value="MEGA">Mega (&gt; 500K flw)</option>
                </Select>
              }
              chips={
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
                  ]}
                  value={trendingFilter}
                  onChange={setTrendingFilter}
                />
              }
            />
          </div>

          <DataTable
            rows={filteredTrendingCreators}
            columns={trendingColumns}
            rowKey={(c) => c.handle}
            fitContainer
            empty="Nhấn nút Quét danh sách xu hướng ở góc phải để tải các kênh KOC đang thịnh hành trên TikTok."
          />
        </Panel>
      )}

      {/* TAB 5: KIỂM TRA LINK AIR ĐA NỀN TẢNG (qua crawler-worker) */}
      {activeTab === 'LINK_AIR_CHECK' && <LinkAirCheckerPanel onNotify={onNotify} />}

      <TikTokKocScraperModal
        open={scraperModalOpen}
        onClose={() => setScraperModalOpen(false)}
        existingKocs={kocs}
        initialHandle={scraperInitialHandle}
        onApplyResults={onSaveScrapedKocs}
        onNotify={onNotify}
      />

      <TikTokVideoInspectorModal
        isOpen={videoInspectorOpen}
        onClose={() => setVideoInspectorOpen(false)}
      />
    </div>
  );
};
