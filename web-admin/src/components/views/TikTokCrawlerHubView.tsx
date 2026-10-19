'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Avatar,
  Button,
  Chips,
  DataTable,
  Field,
  FilterBar,
  Panel,
  Segmented,
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
  | 'CHANNEL_AND_VIDEO_TOOLS';
type PeriodKey = '7d' | '30d' | '90d';
type CompetitorFilterKey =
  | 'ALL'
  | 'NEW_OPPORTUNITY'
  | 'ALREADY_IN_UPBASE'
  | 'PAID_BOOKING'
  | 'AFFILIATE_CART';
type CommentFilterKey = 'ALL' | TikTokCommentIntentType;

interface BatchCrawlProgress {
  currentBatch: number;
  totalBatches: number;
  collectedCount: number;
  targetCount: number;
}

const KOC_BATCH_SIZE = 12;
const COMMENT_BATCH_SIZE = 40;
const KOC_COUNT_PRESETS = [12, 24, 36, 60];
const COMMENT_COUNT_PRESETS = [30, 60, 100, 150];

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
  const [competitorInput, setCompetitorInput] = useState('@larocheposayvn');
  const [compTargetCount, setCompTargetCount] = useState<number>(12);
  const [compLoading, setCompLoading] = useState(false);
  const [compBatchProgress, setCompBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [compError, setCompError] = useState<string | null>(null);
  const [compProfile, setCompProfile] = useState<TikTokCompetitorProfileSummary | null>(null);
  const [compResults, setCompResults] = useState<TikTokCompetitorKocResult[]>([]);
  const [compFilter, setCompFilter] = useState<CompetitorFilterKey>('ALL');
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const compAbortRef = useRef(false);

  // --- State Tab 2: Tìm KOC theo Hashtag ---
  const [hashtagInput, setHashtagInput] = useState('#kemchongnang');
  const [tagTargetCount, setTagTargetCount] = useState<number>(12);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagBatchProgress, setTagBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagResults, setTagResults] = useState<TikTokHashtagKocResult[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const tagAbortRef = useRef(false);

  // --- State Tab 3: Cào Bình luận Video & KOC Xu hướng ---
  const [videoCommentUrl, setVideoCommentUrl] = useState(
    'https://www.tiktok.com/@tiktok/video/7106594312292453675'
  );
  const [commentTargetCount, setCommentTargetCount] = useState<number>(40);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentBatchProgress, setCommentBatchProgress] = useState<BatchCrawlProgress | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentData, setCommentData] = useState<TikTokVideoCommentsScrapeResult | null>(null);
  const [commentFilter, setCommentFilter] = useState<CommentFilterKey>('ALL');
  const [commentSearch, setCommentSearch] = useState('');
  const commentAbortRef = useRef(false);

  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingCreators, setTrendingCreators] = useState<TikTokTrendingCreatorItem[]>([]);
  const [trendingSearch, setTrendingSearch] = useState('');

  // --- State Modals ---
  const [scraperModalOpen, setScraperModalOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');
  const [videoInspectorOpen, setVideoInspectorOpen] = useState(false);

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
    const baseList = appendMode ? [...compResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? compTargetCount) || 12, 1), 120);

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
            pageOffset: Math.floor(accumulatedMap.size / KOC_BATCH_SIZE),
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

        const mergedList = Array.from(accumulatedMap.values()).sort(
          (a, b) =>
            b.competitorCollaboration.latestCollabViews -
            a.competitorCollaboration.latestCollabViews
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
    const baseList = appendMode ? [...tagResults] : [];
    const requestedTotal = appendMode
      ? baseList.length + (options?.targetCount || KOC_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? tagTargetCount) || 12, 1), 120);

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
            pageOffset: Math.floor(accumulatedMap.size / KOC_BATCH_SIZE),
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
            b.matchedHashtagVideo.views - a.matchedHashtagVideo.views ||
            b.matchedHashtagVideo.breakoutRatio - a.matchedHashtagVideo.breakoutRatio
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
    const existingComments = appendMode && commentData ? [...commentData.comments] : [];
    const requestedTotal = appendMode
      ? existingComments.length + (options?.targetCount || COMMENT_BATCH_SIZE)
      : Math.min(Math.max(Number(options?.targetCount ?? commentTargetCount) || 40, 5), 300);

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

  useEffect(() => {
    void runCompetitorCrawl('@larocheposayvn', '30d', { targetCount: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompResults = useMemo(() => {
    return compResults.filter((r) => {
      const c = r.competitorCollaboration;
      const isExisting = existingByHandle.has(r.handle) || c.isAlreadyInUpbase;
      if (compFilter === 'NEW_OPPORTUNITY' && isExisting) return false;
      if (compFilter === 'ALREADY_IN_UPBASE' && !isExisting) return false;
      if (compFilter === 'PAID_BOOKING' && c.collaborationType !== 'PAID_BOOKING') return false;
      if (compFilter === 'AFFILIATE_CART' && c.collaborationType !== 'AFFILIATE_CART') return false;

      if (compSearchQuery.trim()) {
        const q = compSearchQuery.toLowerCase();
        const matchHandle = r.channelProfile.handle.toLowerCase().includes(q);
        const matchName = r.channelProfile.nickname.toLowerCase().includes(q);
        const matchProd = c.competitorProductPromoted.toLowerCase().includes(q);
        const matchCaption = c.latestCollabCaption.toLowerCase().includes(q);
        if (!matchHandle && !matchName && !matchProd && !matchCaption) return false;
      }
      return true;
    });
  }, [compResults, compFilter, compSearchQuery, existingByHandle]);

  const filteredTagResults = useMemo(() => {
    if (!tagSearchQuery.trim()) return tagResults;
    const q = tagSearchQuery.toLowerCase();
    return tagResults.filter(
      (r) =>
        r.channelProfile.handle.toLowerCase().includes(q) ||
        r.channelProfile.nickname.toLowerCase().includes(q) ||
        r.matchedHashtagVideo.captionSnippet.toLowerCase().includes(q)
    );
  }, [tagResults, tagSearchQuery]);

  const filteredComments = useMemo(() => {
    const list = commentData?.comments || [];
    return list.filter((c) => {
      if (commentFilter !== 'ALL' && c.intentType !== commentFilter) return false;
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
  }, [commentData, commentFilter, commentSearch]);

  const filteredTrendingCreators = useMemo(() => {
    if (!trendingSearch.trim()) return trendingCreators;
    const q = trendingSearch.toLowerCase();
    return trendingCreators.filter(
      (c) =>
        c.handle.toLowerCase().includes(q) ||
        c.nickname.toLowerCase().includes(q) ||
        c.bio.toLowerCase().includes(q)
    );
  }, [trendingCreators, trendingSearch]);

  const compStats = useMemo(() => {
    const total = compResults.length;
    const existingCount = compResults.filter(
      (r) => existingByHandle.has(r.handle) || r.competitorCollaboration.isAlreadyInUpbase
    ).length;
    const newCount = total - existingCount;
    const totalCompVideos = compResults.reduce(
      (sum, r) => sum + r.competitorCollaboration.competitorVideoCount,
      0
    );
    const totalCompViews = compResults.reduce(
      (sum, r) => sum + r.competitorCollaboration.latestCollabViews,
      0
    );
    return { total, existingCount, newCount, totalCompVideos, totalCompViews };
  }, [compResults, existingByHandle]);

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
      {/* Thanh điều hướng gọn nhẹ, không bọc khung thừa */}
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
          ]}
          value={activeTab}
          onChange={(t) => {
            setActiveTab(t);
            if (t === 'HASHTAG_DISCOVERY' && tagResults.length === 0) {
              void runHashtagCrawl(hashtagInput, period);
            }
            if (t === 'COMMENTS_AND_TRENDING' && !commentData) {
              void runVideoCommentsCrawl(videoCommentUrl);
            }
            if (t === 'CHANNEL_AND_VIDEO_TOOLS' && trendingCreators.length === 0) {
              void runTrendingCreatorsCrawl();
            }
          }}
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
                    onChange={(e) => setCompetitorInput(e.target.value)}
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
                      max={120}
                      value={compTargetCount}
                      onChange={(e) =>
                        setCompTargetCount(
                          Math.min(120, Math.max(1, Number(e.target.value) || 12))
                        )
                      }
                      title="Nhập số lượng KOC cần quét (tối đa 120 KOC, chia đợt 12 KOC/lần)"
                      className="w-14 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
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
                <span>Chọn nhanh:</span>
                {COMPETITOR_SAMPLES.map((s) => (
                  <button
                    key={s.handle}
                    type="button"
                    onClick={() => {
                      setCompetitorInput(s.handle);
                      void runCompetitorCrawl(s.handle, period, {
                        targetCount: compTargetCount,
                      });
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
          {compProfile && (
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

          {/* Bảng danh sách KOC của đối thủ */}
          <Panel
            title={`KOC hợp tác với ${compProfile?.brandName || competitorInput} (${filteredCompResults.length})`}
            flush
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  disabled={compLoading}
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
            <FilterBar
              search={{
                value: compSearchQuery,
                onChange: setCompSearchQuery,
                placeholder: 'Tìm theo @handle, tên KOC, sản phẩm hoặc nội dung video...',
              }}
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
                  ]}
                  value={compFilter}
                  onChange={setCompFilter}
                />
              }
            />

            <DataTable
              rows={filteredCompResults}
              columns={competitorColumns}
              rowKey={(r) => r.handle}
              fitContainer
              empty="Chưa có dữ liệu KOC đối thủ. Nhập @handle kênh đối thủ (ví dụ: @larocheposayvn) và bấm Quét KOC đối thủ."
            />
          </Panel>
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
                    onChange={(e) => setHashtagInput(e.target.value)}
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
                      max={120}
                      value={tagTargetCount}
                      onChange={(e) =>
                        setTagTargetCount(
                          Math.min(120, Math.max(1, Number(e.target.value) || 12))
                        )
                      }
                      title="Nhập số lượng KOC cần quét theo Hashtag (tối đa 120 KOC, chia đợt 12 KOC/lần)"
                      className="w-14 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
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
                <span>Chọn nhanh:</span>
                {HASHTAG_SAMPLES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setHashtagInput(tag);
                      void runHashtagCrawl(tag, period, {
                        targetCount: tagTargetCount,
                      });
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

          <Panel
            title={`KOC theo ${hashtagInput} (${filteredTagResults.length})`}
            flush
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  disabled={tagLoading}
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
            <FilterBar
              search={{
                value: tagSearchQuery,
                onChange: setTagSearchQuery,
                placeholder: 'Lọc theo @handle, tên kênh hoặc nội dung caption...',
              }}
            />

            <DataTable
              rows={filteredTagResults}
              columns={hashtagColumns}
              rowKey={(r) => r.handle}
              fitContainer
              empty="Chưa có dữ liệu KOC theo hashtag. Nhập #hashtag (ví dụ #kemchongnang) và bấm Quét theo Hashtag."
            />
          </Panel>
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
                    onChange={(e) => setVideoCommentUrl(e.target.value)}
                    placeholder="Ví dụ: https://www.tiktok.com/@tiktok/video/7106594312292453675"
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
                      min={10}
                      max={300}
                      value={commentTargetCount}
                      onChange={(e) =>
                        setCommentTargetCount(
                          Math.min(300, Math.max(10, Number(e.target.value) || 40))
                        )
                      }
                      title="Nhập số lượng bình luận muốn lấy (tối đa 300, chia đợt 40 bình luận/lần)"
                      className="w-14 h-6 px-1.5 rounded border border-line bg-surface text-xs text-ink text-center font-code focus:outline-none focus:border-line-strong"
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
                <span>Chọn nhanh video mẫu:</span>
                {SAMPLE_VIDEO_URLS.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => {
                      setVideoCommentUrl(item.url);
                      void runVideoCommentsCrawl(item.url, {
                        targetCount: commentTargetCount,
                      });
                    }}
                    className="px-2.5 py-1 rounded-md border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink transition-colors"
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
                title={`Danh sách bình luận (${filteredComments.length})`}
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
                <FilterBar
                  search={{
                    value: commentSearch,
                    onChange: setCommentSearch,
                    placeholder: 'Tìm nội dung bình luận hoặc @username người bình luận...',
                  }}
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
          title={`KOC đang thịnh hành trên TikTok (${filteredTrendingCreators.length})`}
          flush
          actions={
            <Button
              size="sm"
              variant="secondary"
              icon={trendingLoading ? RefreshCw : Flame}
              disabled={trendingLoading}
              onClick={runTrendingCreatorsCrawl}
            >
              {trendingLoading ? 'Đang làm mới...' : 'Làm mới danh sách'}
            </Button>
          }
        >
          <FilterBar
            search={{
              value: trendingSearch,
              onChange: setTrendingSearch,
              placeholder: 'Tìm theo @handle, tên kênh hoặc nội dung tiểu sử...',
            }}
          />

          <DataTable
            rows={filteredTrendingCreators}
            columns={trendingColumns}
            rowKey={(c) => c.handle}
            fitContainer
            empty="Nhấn Làm mới danh sách để tải các kênh KOC đang thịnh hành trên TikTok."
          />
        </Panel>
      )}

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
