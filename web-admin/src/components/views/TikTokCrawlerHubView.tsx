'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileCheck2,
  Flame,
  Hash,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Store,
  ThumbsUp,
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
  Stat,
  StatRow,
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

const COMPETITOR_SAMPLES = [
  { handle: '@larocheposayvn', label: 'La Roche-Posay VN' },
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
  const [period, setPeriod] = useState<PeriodKey>('30d');

  // --- State Tab 1: Quét KOC của Đối thủ ---
  const [competitorInput, setCompetitorInput] = useState('@larocheposayvn');
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compProfile, setCompProfile] = useState<TikTokCompetitorProfileSummary | null>(null);
  const [compResults, setCompResults] = useState<TikTokCompetitorKocResult[]>([]);
  const [compFilter, setCompFilter] = useState<CompetitorFilterKey>('ALL');
  const [compSearchQuery, setCompSearchQuery] = useState('');

  // --- State Tab 2: Tìm KOC theo Hashtag ---
  const [hashtagInput, setHashtagInput] = useState('#kemchongnang');
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagResults, setTagResults] = useState<TikTokHashtagKocResult[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // --- State Tab 3: Cào Bình luận Video & KOC Xu hướng (@tobyg74/tiktok-api-dl) ---
  const [videoCommentUrl, setVideoCommentUrl] = useState(
    'https://www.tiktok.com/@tiktok/video/7106594312292453675'
  );
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentData, setCommentData] = useState<TikTokVideoCommentsScrapeResult | null>(null);
  const [commentFilter, setCommentFilter] = useState<CommentFilterKey>('ALL');
  const [commentSearch, setCommentSearch] = useState('');

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

  const runCompetitorCrawl = async (rawComp: string, targetPeriod: PeriodKey) => {
    const trimmed = rawComp.trim();
    if (!trimmed) {
      setCompError('Vui lòng nhập @handle kênh TikTok hoặc tên thương hiệu đối thủ.');
      return;
    }

    setCompLoading(true);
    setCompError(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor: trimmed,
          period: targetPeriod,
          limit: 12,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results)) {
        setCompError(json.message || 'Không quét được danh sách KOC của đối thủ này.');
        return;
      }

      setCompProfile(json.competitorProfile || null);
      setCompResults(json.results);
    } catch {
      setCompError('Không kết nối được dịch vụ thu thập dữ liệu TikTok. Vui lòng thử lại.');
    } finally {
      setCompLoading(false);
    }
  };

  const runHashtagCrawl = async (rawTag: string, targetPeriod: PeriodKey) => {
    const trimmed = rawTag.trim();
    if (!trimmed) {
      setTagError('Vui lòng nhập #hashtag hoặc từ khóa ngách cần quét.');
      return;
    }

    setTagLoading(true);
    setTagError(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hashtag: trimmed,
          period: targetPeriod,
          limit: 12,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results)) {
        setTagError(json.message || 'Không tìm thấy KOC nào cho hashtag này.');
        return;
      }

      setTagResults(json.results);
    } catch {
      setTagError('Không kết nối được dịch vụ quét hashtag TikTok.');
    } finally {
      setTagLoading(false);
    }
  };

  const runVideoCommentsCrawl = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setCommentError('Vui lòng nhập đường dẫn video TikTok cần cào bình luận.');
      return;
    }

    setCommentLoading(true);
    setCommentError(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: trimmed,
          limit: 40,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !json.videoInfo) {
        setCommentError(json.message || 'Không lấy được danh sách bình luận của video này.');
        return;
      }

      setCommentData(json);
    } catch {
      setCommentError('Không kết nối được dịch vụ cào bình luận video TikTok.');
    } finally {
      setCommentLoading(false);
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
    void runCompetitorCrawl('@larocheposayvn', '30d');
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
      header: 'Kênh KOC & Liên hệ (Bio)',
      width: 240,
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
                  {isExisting ? 'Đã có tại UpBase' : 'KOC Mới'}
                </Status>
              </div>
              <span className="text-2xs text-ink-2 truncate">{p.nickname}</span>
              <span className="text-2xs text-ink-3 inline-flex items-center gap-1 tabular-nums">
                <Phone className="w-3 h-3 text-ink-3 shrink-0" />
                <span>{p.extractedPhone || 'Chưa gắn SĐT'}</span>
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'collab',
      header: 'Hợp tác với Đối thủ & Sản phẩm',
      width: 250,
      render: (r) => {
        const c = r.competitorCollaboration;
        return (
          <div className="grid gap-1 min-w-0 max-w-[270px]">
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
              className="text-xs font-medium text-ink truncate"
              title={c.competitorProductPromoted}
            >
              {c.competitorProductPromoted}
            </span>
            <span className="text-2xs text-ink-3 truncate">
              Đối thủ: @{c.competitorHandle} ({c.competitorBrandName})
            </span>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video làm cho đối thủ gần nhất',
      width: 270,
      render: (r) => {
        const c = r.competitorCollaboration;
        return (
          <div className="grid gap-1 min-w-0 max-w-[290px]">
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
              <span>Đăng ngày: {formatDate(c.latestCollabPublishedAt)}</span>
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
                Cào bình luận
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'compPerf',
      header: 'Lượt xem & Tương tác',
      align: 'right',
      width: 170,
      render: (r) => {
        const c = r.competitorCollaboration;
        const e = r.engagementMetrics;
        return (
          <div className="grid gap-0.5">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {formatNumber(c.latestCollabViews)} view
            </span>
            <span className="text-2xs text-ink-2 tabular-nums">
              View TB kênh: {formatNumber(e.avgViews)}
            </span>
            <span className="text-2xs text-positive font-semibold tabular-nums">
              ER {e.engagementRate}% · {formatNumber(e.avgLikes)} tim TB
            </span>
          </div>
        );
      },
    },
    {
      key: 'channelAction',
      header: 'Quy mô kênh & Thao tác',
      align: 'right',
      width: 220,
      render: (r) => {
        const p = r.channelProfile;
        const isExisting = existingByHandle.has(r.handle);
        return (
          <div className="grid gap-1 justify-items-end">
            <div className="text-xs text-ink tabular-nums">
              <span className="font-semibold">{formatFollowers(p.followers)}</span> flw ·{' '}
              <span className="font-semibold">{formatFollowers(p.totalLikes)}</span> tim
            </div>
            <div className="text-2xs text-ink-3 tabular-nums">
              Tổng {formatNumber(p.videoCount)} video trên kênh
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setScraperInitialHandle(`@${r.handle}`);
                  setScraperModalOpen(true);
                }}
              >
                Chi tiết kênh
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
      header: 'Kênh KOC & Liên hệ (Bio)',
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
                  {isExisting ? 'Đã có' : 'Mới'}
                </Status>
              </div>
              <span className="text-2xs text-ink-2 truncate">{p.nickname}</span>
              <span className="text-2xs text-ink-3 tabular-nums">
                SĐT/Zalo: {p.extractedPhone || 'Chưa gắn Bio'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Video gắn Hashtag phát hiện',
      width: 300,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return (
          <div className="grid gap-1 min-w-0 max-w-[320px]">
            <a
              href={v.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
            >
              <span>{v.captionSnippet}</span>
              <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
            </a>
            <span className="text-2xs text-ink-3 tabular-nums">
              Đăng ngày: {formatDate(v.publishedAt)} · Hashtag: <strong className="text-ink-2">{v.hashtag}</strong>
            </span>
          </div>
        );
      },
    },
    {
      key: 'breakout',
      header: 'Lượt xem Video & Tương tác',
      align: 'right',
      width: 180,
      render: (r) => {
        const v = r.matchedHashtagVideo;
        return (
          <div className="grid gap-0.5">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {formatNumber(v.views)} view · {formatNumber(v.likes)} tim
            </span>
            <span className="text-2xs text-positive font-semibold tabular-nums">
              Tỷ lệ View/Flw: {v.breakoutRatio}x · ER {r.engagementMetrics.engagementRate}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'channelStats',
      header: 'Quy mô kênh & Lưu Danh bạ',
      align: 'right',
      width: 210,
      render: (r) => {
        const p = r.channelProfile;
        const e = r.engagementMetrics;
        const isExisting = existingByHandle.has(r.handle);
        return (
          <div className="grid gap-1 justify-items-end">
            <span className="text-xs font-semibold text-ink tabular-nums">
              {formatFollowers(p.followers)} flw · {formatFollowers(p.totalLikes)} tim
            </span>
            <span className="text-2xs text-ink-2 tabular-nums">
              View TB kênh: {formatNumber(e.avgViews)} · {formatNumber(p.videoCount)} video
            </span>
            <Button
              size="sm"
              variant={isExisting ? 'secondary' : 'primary'}
              icon={isExisting ? Check : UserPlus}
              onClick={() => handleSaveSingleKoc(r)}
            >
              {isExisting ? 'Cập nhật hồ sơ' : 'Lưu vào Danh bạ'}
            </Button>
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
      header: 'Phân loại nhu cầu',
      width: 190,
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
      header: 'Nội dung bình luận thực tế',
      width: 360,
      render: (c) => (
        <p className="text-xs text-ink leading-snug break-words">{c.text}</p>
      ),
    },
    {
      key: 'stats',
      header: 'Lượt thích & Phản hồi',
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
      header: 'Kênh Creator Thịnh hành',
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
      header: 'Tiểu sử (Bio) & Liên hệ',
      width: 300,
      render: (c) => (
        <div className="grid gap-0.5 min-w-0 max-w-[320px]">
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
      header: 'Lượt theo dõi & Tổng lượt thích',
      align: 'right',
      width: 200,
      render: (c) => (
        <div className="grid gap-0.5 tabular-nums">
          <span className="text-xs font-semibold text-ink">
            {formatFollowers(c.followers)} người theo dõi
          </span>
          <span className="text-2xs text-ink-3">
            {formatFollowers(c.totalLikes)} lượt thích · {formatNumber(c.videoCount)} video
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      width: 170,
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
    <div className="space-y-5">
      {/* Thanh điều hướng 4 công cụ Crawler */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-line">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<CrawlerTabKey>
            items={[
              {
                key: 'COMPETITOR_KOCS',
                label: '1. Quét KOC làm cho Đối thủ',
              },
              {
                key: 'HASHTAG_DISCOVERY',
                label: '2. Tìm KOC theo #Hashtag',
              },
              {
                key: 'COMMENTS_AND_TRENDING',
                label: '3. Cào Bình luận Video & KOC Xu hướng',
              },
              {
                key: 'CHANNEL_AND_VIDEO_TOOLS',
                label: '4. Cào Kênh hàng loạt & Nghiệm thu Video',
              },
            ]}
            value={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              if (t === 'HASHTAG_DISCOVERY' && tagResults.length === 0) {
                void runHashtagCrawl(hashtagInput, period);
              }
              if (t === 'COMMENTS_AND_TRENDING') {
                if (!commentData) {
                  void runVideoCommentsCrawl(videoCommentUrl);
                }
                if (trendingCreators.length === 0) {
                  void runTrendingCreatorsCrawl();
                }
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={Video}
            onClick={() => setVideoInspectorOpen(true)}
          >
            Nghiệm thu Link Video KOC
          </Button>
          {onNavigateToKocMaster && (
            <Button
              variant="ghost"
              icon={Users}
              onClick={onNavigateToKocMaster}
            >
              Mở Danh bạ KOC ({kocs.length})
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: QUÉT KOC LÀM VIỆC CHO ĐỐI THỦ */}
      {activeTab === 'COMPETITOR_KOCS' && (
        <div className="space-y-4">
          <Panel
            title="Quét danh sách KOC đang đăng video / gắn giỏ hàng cho Đối thủ (0đ)"
          >
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Kênh TikTok hoặc Tên thương hiệu Đối thủ"
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

                <div className="flex items-center gap-2">
                  <Segmented<PeriodKey>
                    items={[
                      { key: '7d', label: '7 ngày' },
                      { key: '30d', label: '30 ngày' },
                      { key: '90d', label: '90 ngày' },
                    ]}
                    value={period}
                    onChange={(p) => {
                      setPeriod(p);
                      void runCompetitorCrawl(competitorInput, p);
                    }}
                  />
                  <Button
                    variant="primary"
                    icon={compLoading ? RefreshCw : Search}
                    disabled={compLoading}
                    onClick={() => runCompetitorCrawl(competitorInput, period)}
                  >
                    {compLoading ? 'Đang quét KOC đối thủ...' : 'Quét KOC đối thủ'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Chọn nhanh kênh đối thủ mẫu:</span>
                {COMPETITOR_SAMPLES.map((s) => (
                  <button
                    key={s.handle}
                    type="button"
                    onClick={() => {
                      setCompetitorInput(s.handle);
                      void runCompetitorCrawl(s.handle, period);
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

          {/* Tóm tắt kênh đối thủ & 4 KPI */}
          {compProfile && (
            <>
              <div className="p-4 rounded-xl border border-line bg-surface flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={compProfile.brandName} size={44} />
                  <div className="grid gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink">
                        Đối thủ: {compProfile.brandName}
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
                    <span className="text-xs text-ink-2 truncate max-w-2xl">
                      {compProfile.bio}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <div>
                    <span className="text-ink-3 block text-2xs">Follower kênh đối thủ</span>
                    <strong className="text-ink tabular-nums">
                      {formatNumber(compProfile.followers)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tổng lượt thích</span>
                    <strong className="text-ink tabular-nums">
                      {formatNumber(compProfile.totalLikes)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-ink-3 block text-2xs">Tổng số video</span>
                    <strong className="text-ink tabular-nums">
                      {formatNumber(compProfile.videoCount)}
                    </strong>
                  </div>
                </div>
              </div>

              <StatRow>
                <Stat
                  label="Tổng KOC làm cho đối thủ"
                  value={formatNumber(compStats.total)}
                  note={`Đã quét trên kênh @${compProfile.handle}`}
                  icon={Users}
                />
                <Stat
                  label="KOC Mới (Chưa có tại UpBase)"
                  value={formatNumber(compStats.newCount)}
                  note="Chưa có trong Danh bạ KOC UpBase"
                  tone="positive"
                  icon={UserPlus}
                />
                <Stat
                  label="Đã có trong Danh bạ UpBase"
                  value={formatNumber(compStats.existingCount)}
                  note="Đang có hồ sơ tại UpBase"
                  icon={Store}
                />
                <Stat
                  label="Tổng video KOC đăng cho đối thủ"
                  value={`${formatNumber(compStats.totalCompVideos)} video`}
                  note={`Tổng lượt xem video gần nhất: ${formatNumber(compStats.totalCompViews)} view`}
                  tone="positive"
                  icon={Video}
                />
              </StatRow>
            </>
          )}

          {/* Bảng danh sách KOC của đối thủ */}
          <Panel
            title={`Danh sách KOC đang hợp tác với ${compProfile?.brandName || competitorInput} (${filteredCompResults.length})`}
            flush
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Download}
                  disabled={filteredCompResults.length === 0}
                  onClick={handleExportCompetitorCsv}
                >
                  Xuất CSV ({filteredCompResults.length})
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={Check}
                  disabled={filteredCompResults.length === 0}
                  onClick={() => handleSaveBulkKocs(filteredCompResults)}
                >
                  Lưu tất cả vào Danh bạ KOC
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
                      label: 'KOC Mới (Chưa có tại UpBase)',
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
                      label: 'Tự gắn giỏ Affiliate',
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
          <Panel
            title="Tìm kiếm KOC đang có video lên xu hướng theo #Hashtag / Từ khóa ngách (0đ)"
          >
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Hashtag hoặc Từ khóa ngách trên TikTok"
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

                <div className="flex items-center gap-2">
                  <Segmented<PeriodKey>
                    items={[
                      { key: '7d', label: '7 ngày' },
                      { key: '30d', label: '30 ngày' },
                      { key: '90d', label: '90 ngày' },
                    ]}
                    value={period}
                    onChange={(p) => {
                      setPeriod(p);
                      void runHashtagCrawl(hashtagInput, p);
                    }}
                  />
                  <Button
                    variant="primary"
                    icon={tagLoading ? RefreshCw : Hash}
                    disabled={tagLoading}
                    onClick={() => runHashtagCrawl(hashtagInput, period)}
                  >
                    {tagLoading ? 'Đang quét hashtag...' : 'Quét KOC theo Hashtag'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Chọn nhanh hashtag ngách:</span>
                {HASHTAG_SAMPLES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setHashtagInput(tag);
                      void runHashtagCrawl(tag, period);
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
            title={`Danh sách KOC phát hiện từ ${hashtagInput} (${filteredTagResults.length})`}
            flush
            actions={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Download}
                  disabled={filteredTagResults.length === 0}
                  onClick={handleExportHashtagCsv}
                >
                  Xuất CSV ({filteredTagResults.length})
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={Check}
                  disabled={filteredTagResults.length === 0}
                  onClick={() => handleSaveBulkKocs(filteredTagResults)}
                >
                  Lưu tất cả vào Danh bạ KOC
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
              empty="Chưa có dữ liệu KOC theo hashtag. Nhập #hashtag (ví dụ #kemchongnang) và bấm Quét KOC theo Hashtag."
            />
          </Panel>
        </div>
      )}

      {/* TAB 3: CÀO BÌNH LUẬN VIDEO & KOC XU HƯỚNG (@tobyg74/tiktok-api-dl) */}
      {activeTab === 'COMMENTS_AND_TRENDING' && (
        <div className="space-y-4">
          <Panel
            title="Cào Bình luận thực tế của Video TikTok & Lọc khách hỏi mua hàng (@tobyg74/tiktok-api-dl)"
          >
            <div className="space-y-3">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <Field
                  label="Đường dẫn Video TikTok cần cào bình luận"
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

                <Button
                  variant="primary"
                  icon={commentLoading ? RefreshCw : MessageSquare}
                  disabled={commentLoading}
                  onClick={() => runVideoCommentsCrawl(videoCommentUrl)}
                >
                  {commentLoading ? 'Đang tải bình luận...' : 'Cào bình luận Video'}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                <span>Thử nhanh link video mẫu:</span>
                {SAMPLE_VIDEO_URLS.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => {
                      setVideoCommentUrl(item.url);
                      void runVideoCommentsCrawl(item.url);
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
              <div className="p-4 rounded-xl border border-line bg-surface flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">
                      Kênh đăng: @{commentData.videoInfo.authorHandle}
                    </span>
                    <Status tone="positive">{commentData.engineUsed}</Status>
                    <span className="text-2xs text-ink-3 tabular-nums">
                      Ngày đăng: {formatDate(commentData.videoInfo.publishedAt)}
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
                    <span className="text-ink-3 block text-2xs">Chia sẻ / Tải về</span>
                    <strong className="text-ink">
                      {formatNumber(commentData.videoInfo.sharesCount)} /{' '}
                      {formatNumber(commentData.videoInfo.downloadsCount)}
                    </strong>
                  </div>
                </div>
              </div>

              <StatRow>
                <Stat
                  label="Số bình luận đã bóc tách"
                  value={formatNumber(commentData.summary.totalFetched)}
                  note="Lấy trực tiếp từ /api/comment/list/"
                  icon={MessageSquare}
                />
                <Stat
                  label="Bình luận hỏi mua hàng / tư vấn"
                  value={formatNumber(commentData.summary.buyingIntentCount)}
                  note={`Chiếm ${commentData.summary.buyingIntentRate}% số bình luận`}
                  tone="positive"
                  icon={Phone}
                />
                <Stat
                  label="Phản hồi trải nghiệm sản phẩm"
                  value={formatNumber(commentData.summary.feedbackCount)}
                  note="Nhận xét chất lượng / hiệu quả sử dụng"
                  icon={Check}
                />
                <Stat
                  label="Tổng lượt thích trên bình luận"
                  value={formatNumber(commentData.summary.totalLikesOnComments)}
                  note="Mức độ đồng tình của người xem"
                  icon={ThumbsUp}
                />
              </StatRow>

              <Panel
                title={`Danh sách bình luận thực tế (${filteredComments.length})`}
                flush
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    disabled={filteredComments.length === 0}
                    onClick={handleExportCommentsCsv}
                  >
                    Xuất CSV Bình luận ({filteredComments.length})
                  </Button>
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
                          label: 'Tất cả bình luận',
                          count: commentData.comments.length,
                        },
                        {
                          key: 'BUYING_INTENT',
                          label: 'Hỏi mua hàng / Xin tư vấn',
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

          {/* Bảng 30 Kênh Creator đang thịnh hành thực tế trên TikTok */}
          <Panel
            title={`Danh sách Creator đang thịnh hành thực tế trên TikTok (${filteredTrendingCreators.length})`}
            flush
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={trendingLoading ? RefreshCw : Flame}
                disabled={trendingLoading}
                onClick={runTrendingCreatorsCrawl}
              >
                {trendingLoading ? 'Đang làm mới...' : 'Làm mới danh sách Xu hướng'}
              </Button>
            }
          >
            <FilterBar
              search={{
                value: trendingSearch,
                onChange: setTrendingSearch,
                placeholder: 'Tìm kiếm theo @handle, tên kênh hoặc nội dung Bio...',
              }}
            />

            <DataTable
              rows={filteredTrendingCreators}
              columns={trendingColumns}
              rowKey={(c) => c.handle}
              fitContainer
              empty="Nhấn Làm mới danh sách Xu hướng để lấy danh sách Creator đang thịnh hành trên TikTok."
            />
          </Panel>
        </div>
      )}

      {/* TAB 4: CÀO HỒ SƠ KÊNH HÀNG LOẠT & NGHIỆM THU VIDEO KOC */}
      {activeTab === 'CHANNEL_AND_VIDEO_TOOLS' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel
            title="Cào hồ sơ & chỉ số hàng loạt Kênh KOC theo @handle"
          >
            <div>
              <Button
                variant="primary"
                icon={Search}
                onClick={() => {
                  setScraperInitialHandle('');
                  setScraperModalOpen(true);
                }}
              >
                Mở bảng Cào Kênh KOC theo @handle
              </Button>
            </div>
          </Panel>

          <Panel
            title="Nghiệm thu hàng loạt Link Video KOC gửi (6 lớp kiểm tra)"
          >
            <div>
              <Button
                variant="primary"
                icon={FileCheck2}
                onClick={() => setVideoInspectorOpen(true)}
              >
                Mở bảng Nghiệm thu Link Video KOC
              </Button>
            </div>
          </Panel>
        </div>
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
