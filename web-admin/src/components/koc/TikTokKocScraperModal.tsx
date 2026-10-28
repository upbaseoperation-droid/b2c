'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  History,
  MessageSquare,
  Music,
  RefreshCw,
  Search,
  ShoppingBag,
  Square,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { KocItem, TikTokVideoItem, UserProfile } from '../../lib/types';
import {
  buildScrapedKocsCsv,
  extractShortTikTokUrlsFromInput,
  mapScrapedResultToKocItem,
  parseTikTokHandles,
  type TikTokScrapedKocResult,
} from '../../lib/tiktokKocScraper';
import { formatDate, formatNumber, formatVnd, formatVndShort, getVietnamDateYmd } from '../../lib/format';
import { findKocListingsByHandle } from '../../lib/staffBrandListingSheet';
import { formatFollowers } from './kocUtils';
import {
  KocChannelReviewBadge,
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from './KocChannelReviewModal';
import { getVerdictTone, useKocChannelReviews } from '../../lib/kocChannelReviewService';
import {
  Avatar,
  Button,
  DataTable,
  Modal,
  Panel,
  Select,
  Status,
} from '../ui';
import type { Column } from '../ui';

interface TikTokKocScraperModalProps {
  open: boolean;
  onClose: () => void;
  existingKocs: KocItem[];
  initialHandle?: string;
  currentUser?: UserProfile;
  onApplyResults: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  onSaveScrapedSession?: (payload: {
    rawInput: string;
    results: TikTokScrapedKocResult[];
  }) => void;
  onOpenKocInMaster?: (koc: KocItem) => void;
  onAddToBrandSheet?: (kocs: KocItem[]) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type PeriodKey = '7d' | '30d' | '90d';
type VideoFilterMode = 'ALL' | 'AFFILIATE' | 'ORGANIC' | 'OUTLIER';
const VIDEO_LIMIT_OPTIONS = [24, 48, 72, 100] as const;

export const TikTokKocScraperModal: React.FC<TikTokKocScraperModalProps> = ({
  open,
  onClose,
  existingKocs,
  initialHandle = '',
  currentUser,
  onApplyResults,
  onSaveScrapedSession,
  onOpenKocInMaster,
  onAddToBrandSheet,
  onNotify,
}) => {
  const [rawInput, setRawInput] = useState(initialHandle);
  const period: PeriodKey = '30d';
  const [videoLimit, setVideoLimit] = useState<number>(24);
  const [requestedHandlesCount, setRequestedHandlesCount] = useState<number>(0);
  const [completedHandlesCount, setCompletedHandlesCount] = useState<number>(0);
  const [requestedVideoLimit, setRequestedVideoLimit] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [loadingMoreHandle, setLoadingMoreHandle] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedHandlesList, setFailedHandlesList] = useState<Array<{ handle: string; reason: string }>>([]);
  const [resolvedShortLinks, setResolvedShortLinks] = useState<
    Array<{ shortUrl: string; handle: string; videoId?: string; videoUrl?: string }>
  >([]);
  const [showComparisonTable, setShowComparisonTable] = useState<boolean>(true);
  const [results, setResults] = useState<TikTokScrapedKocResult[]>([]);
  const [selectedHandle, setSelectedHandle] = useState<string>('');
  const [videoFilter, setVideoFilter] = useState<VideoFilterMode>('ALL');
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewTarget, setReviewTarget] = useState<KocChannelReviewTarget | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();

  const syncKey = `${open}-${initialHandle}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setRawInput(initialHandle);
      setVideoLimit(24);
      setRequestedVideoLimit(24);
      const initCount =
        parseTikTokHandles(initialHandle).length +
        extractShortTikTokUrlsFromInput(initialHandle).length;
      setRequestedHandlesCount(initCount);
      setCompletedHandlesCount(0);
      setErrorMsg(null);
      setFailedHandlesList([]);
      setResolvedShortLinks([]);
      setResults([]);
      setSelectedHandle('');
      setLoading(false);
    } else {
      abortControllerRef.current?.abort();
      setLoading(false);
      setLoadingMoreHandle(null);
    }
  }

  const handleStopScrape = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    onNotify?.('Đã dừng quét các kênh còn lại. Giữ nguyên các kênh đã thu thập.', 'info');
  };

  const handleCopyOutreachMessage = async (msg: string, handle: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      onNotify?.(`Đã sao chép mẫu lời mời hợp tác kênh @${handle}`, 'success');
    } catch {
      onNotify?.('Không sao chép được vào bộ nhớ tạm.', 'warning');
    }
  };

  const runScrape = async (
    inputToFetch: string,
    targetPeriod: PeriodKey,
    targetLimit = videoLimit,
    forceRefresh = false
  ) => {
    const trimmed = inputToFetch.trim();
    if (!trimmed) {
      setErrorMsg('Nhập ít nhất một đường dẫn kênh, link rút gọn vt.tiktok.com hoặc @handle TikTok để lấy dữ liệu.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const parsedHandles = parseTikTokHandles(trimmed);
    const shortUrls = extractShortTikTokUrlsFromInput(trimmed);
    const allInputTokens = [...parsedHandles, ...shortUrls].slice(0, 30);
    setRequestedHandlesCount(Math.max(1, allInputTokens.length));
    setCompletedHandlesCount(0);
    setRequestedVideoLimit(targetLimit);
    setLoading(true);
    setErrorMsg(null);
    setFailedHandlesList([]);
    setResolvedShortLinks([]);

    // Quét theo lô cuốn chiếu (Micro-Batch 2 kênh/lượt) khi nhập nhiều kênh để hiển thị kết quả tức thì
    if (allInputTokens.length > 2) {
      const accumulatedResults: TikTokScrapedKocResult[] = [];
      const accumulatedFailures: Array<{ handle: string; reason: string }> = [];
      const accumulatedShortLinks: Array<{
        shortUrl: string;
        handle: string;
        videoId?: string;
        videoUrl?: string;
      }> = [];
      const chunkSize = 2;

      try {
        for (let i = 0; i < allInputTokens.length; i += chunkSize) {
          if (controller.signal.aborted) break;
          const chunkTokens = allInputTokens.slice(i, i + chunkSize);
          const res = await fetch('/api/integrations/tiktok-koc/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              rawInput: chunkTokens.join(', '),
              period: targetPeriod,
              videoLimit: targetLimit,
              forceRefresh,
            }),
          });
          const json = await res.json();
          if (Array.isArray(json.resolvedShortLinks) && json.resolvedShortLinks.length > 0) {
            accumulatedShortLinks.push(...json.resolvedShortLinks);
            setResolvedShortLinks([...accumulatedShortLinks]);
          }
          if (Array.isArray(json.results) && json.results.length > 0) {
            for (const item of json.results as TikTokScrapedKocResult[]) {
              if (!accumulatedResults.some((r) => r.handle === item.handle)) {
                accumulatedResults.push(item);
              }
            }
            setResults([...accumulatedResults]);
            if (accumulatedResults.length === json.results.length) {
              setSelectedHandle(accumulatedResults[0].handle);
            }
          }
          if (Array.isArray(json.failedHandles)) {
            accumulatedFailures.push(...json.failedHandles);
            setFailedHandlesList([...accumulatedFailures]);
          }
          setCompletedHandlesCount(Math.min(allInputTokens.length, i + chunkTokens.length));
        }

        if (accumulatedResults.length > 0) {
          onSaveScrapedSession?.({
            rawInput: trimmed,
            results: accumulatedResults,
          });
        } else if (!controller.signal.aborted) {
          setErrorMsg('Không lấy được dữ liệu kênh TikTok. Kiểm tra lại đường dẫn hoặc @handle.');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        if (accumulatedResults.length === 0) {
          setErrorMsg('Không kết nối được dịch vụ lấy dữ liệu TikTok. Thử lại sau ít phút.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          rawInput: trimmed,
          period: targetPeriod,
          videoLimit: targetLimit,
          forceRefresh,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results) || json.results.length === 0) {
        setErrorMsg(json.message || 'Không lấy được dữ liệu kênh TikTok. Kiểm tra lại đường dẫn hoặc @handle.');
        return;
      }

      if (Array.isArray(json.resolvedShortLinks)) {
        setResolvedShortLinks(json.resolvedShortLinks);
      }
      setResults(json.results);
      setCompletedHandlesCount(json.results.length);
      if (Array.isArray(json.failedHandles)) {
        setFailedHandlesList(json.failedHandles);
      }
      setSelectedHandle(json.results[0].handle);
      onSaveScrapedSession?.({
        rawInput: trimmed,
        results: json.results as TikTokScrapedKocResult[],
      });
      if (allInputTokens.length > json.results.length) {
        onNotify?.(
          `Chỉ lấy được ${json.results.length}/${allInputTokens.length} kênh KOC yêu cầu (thiếu ${allInputTokens.length - json.results.length} kênh).`,
          'warning'
        );
      } else if (forceRefresh) {
        onNotify?.(`Đã làm mới trực tiếp dữ liệu kênh @${json.results[0].handle}`, 'success');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setErrorMsg('Không kết nối được dịch vụ lấy dữ liệu TikTok. Thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreVideos = async (handle: string, nextLimit: number, forceRefresh = false) => {
    setLoadingMoreHandle(handle);
    setRequestedVideoLimit(nextLimit);
    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handles: [handle],
          period,
          videoLimit: nextLimit,
          forceRefresh,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.results) && json.results.length > 0) {
        const refreshed = json.results[0] as TikTokScrapedKocResult;
        setResults((prev) => prev.map((item) => (item.handle === handle ? refreshed : item)));
        setVideoLimit(nextLimit);
        onNotify?.(
          forceRefresh
            ? `Đã làm mới trực tiếp kênh @${handle} (${refreshed.recentVideos.length} video)`
            : `Đã tải ${refreshed.recentVideos.length} video trên kênh @${handle}`,
          'success'
        );
      } else {
        onNotify?.('Không tải thêm được video của kênh này.', 'warning');
      }
    } catch {
      onNotify?.('Lỗi kết nối khi tải thêm video của kênh.', 'error');
    } finally {
      setLoadingMoreHandle(null);
    }
  };

  const existingByHandle = useMemo(() => {
    const map = new Map<string, KocItem>();
    for (const k of existingKocs) {
      const h = (k.channelId || '').trim().toLowerCase().replace(/^@+/, '');
      if (h) map.set(h, k);
    }
    return map;
  }, [existingKocs]);

  const activeResult = useMemo(() => {
    if (results.length === 0) return null;
    return results.find((r) => r.handle === selectedHandle) || results[0];
  }, [results, selectedHandle]);

  const matchedActiveKoc = useMemo(() => {
    if (!activeResult) return undefined;
    const clean = activeResult.handle.trim().toLowerCase().replace(/^@+/, '');
    return existingByHandle.get(clean);
  }, [activeResult, existingByHandle]);

  const activeSheetListings = useMemo(() => {
    if (!activeResult) return [];
    return findKocListingsByHandle(activeResult.handle);
  }, [activeResult]);

  const filteredVideos = useMemo(() => {
    if (!activeResult) return [];
    if (videoFilter === 'AFFILIATE') {
      return activeResult.recentVideos.filter((v) => v.isAffiliate);
    }
    if (videoFilter === 'ORGANIC') {
      return activeResult.recentVideos.filter((v) => !v.isAffiliate);
    }
    if (videoFilter === 'OUTLIER') {
      return activeResult.recentVideos.filter((v) => v.isViralOutlier || v.isPinnedOldVideo);
    }
    return activeResult.recentVideos;
  }, [activeResult, videoFilter]);

  const handlePushToBrandSheet = (itemsToPush: TikTokScrapedKocResult[]) => {
    if (!onAddToBrandSheet || itemsToPush.length === 0) return;
    const mapped = itemsToPush.map((item) => {
      const clean = item.handle.toLowerCase().replace(/^@+/, '');
      const matched = existingByHandle.get(clean);
      return mapScrapedResultToKocItem(item, matched, {
        bookingPic: currentUser?.name,
      });
    });
    onAddToBrandSheet(mapped);
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const csvContent = buildScrapedKocsCsv(results);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-koc-data-${getVietnamDateYmd()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.(`Đã xuất file CSV dữ liệu ${results.length} kênh KOC`, 'success');
  };

  const handleSaveToMaster = () => {
    if (results.length === 0) return;
    const created: KocItem[] = [];
    const updated: KocItem[] = [];

    for (const item of results) {
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

    onApplyResults({ created, updated });
    onClose();
  };

  const comparisonColumns: Column<TikTokScrapedKocResult>[] = [
    {
      key: 'channel',
      header: 'Kênh KOC',
      width: 210,
      render: (r) => {
        const isCurrent = r.handle === activeResult?.handle;
        return (
          <button
            type="button"
            onClick={() => setSelectedHandle(r.handle)}
            className="text-left grid gap-0.5 min-w-0 cursor-pointer"
          >
            <span className={`text-xs ${isCurrent ? 'font-bold text-accent' : 'font-semibold text-ink'} truncate`}>
              {r.channelProfile.nickname}
            </span>
            <span className="text-2xs text-ink-3 font-code truncate">@{r.handle}</span>
          </button>
        );
      },
    },
    {
      key: 'verdict',
      header: 'Đánh giá & Điểm phù hợp',
      width: 195,
      render: (r) => {
        const bi = r.bookingIntelligence;
        if (!bi) return <span className="text-2xs text-ink-3">—</span>;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Status
              tone={
                bi.verdict === 'NÊN_BOOK'
                  ? 'positive'
                  : bi.verdict === 'CÂN_NHẮC'
                    ? 'warning'
                    : 'critical'
              }
            >
              {bi.verdictLabel}
            </Status>
            <span className="text-2xs font-semibold text-ink tabular-nums">
              {bi.fitScore}/100
            </span>
          </div>
        );
      },
    },
    {
      key: 'metrics',
      header: 'Follower · Trung vị 15 bài · Giỏ',
      align: 'right',
      width: 210,
      render: (r) => {
        const em = r.engagementMetrics;
        const med15 = em.latest15MedianViews ?? em.medianViews ?? em.avgViews;
        return (
          <div className="grid gap-0.5 tabular-nums">
            <span className="text-xs font-semibold text-ink">
              {formatFollowers(r.channelProfile.followers)} flw · {formatNumber(med15)} view
            </span>
            <span className="text-2xs text-ink-3">
              Giỏ: {em.affiliateVideoCount ? formatNumber(em.affiliateMedianViews || 0) : '0'} · ER {em.engagementRate}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'pricing',
      header: 'Khung giá Net đề xuất',
      align: 'right',
      width: 185,
      render: (r) => {
        const bi = r.bookingIntelligence;
        if (!bi) return <span className="text-2xs text-ink-3">—</span>;
        const isFoc = bi.suggestedNetRateMin === 0 && bi.suggestedNetRateMax <= 500000;
        return (
          <div className="grid gap-0.5 tabular-nums">
            <span className="text-xs font-semibold text-accent font-code">
              {isFoc
                ? 'FOC 0đ – 500K'
                : `${formatVndShort(bi.suggestedNetRateMin)} – ${formatVndShort(bi.suggestedNetRateMax)}`}
            </span>
            <span className="text-2xs text-ink-3">
              {bi.estimatedCpvVnd > 0 ? `CPV ~${formatNumber(bi.estimatedCpvVnd)}đ/view` : bi.suggestedBookingFormatLabel}
            </span>
          </div>
        );
      },
    },
    {
      key: 'history',
      header: 'Lịch sử Upbase & PIC',
      width: 210,
      render: (r) => {
        const hist = r.bookingIntelligence?.historicalUpbaseSummary;
        if (!hist || !hist.isExistingMasterKoc) {
          return <Status tone="positive">KOC Mới (Chưa trùng PIC)</Status>;
        }
        return (
          <div className="grid gap-0.5 min-w-0">
            <span className="text-xs font-medium text-ink tabular-nums">
              Đã làm {hist.totalPastDeals} deal
              {hist.historicalRateCard > 0 ? ` · Rate ${formatVndShort(hist.historicalRateCard)}` : ''}
            </span>
            <span className="text-2xs text-ink-3 truncate" title={hist.workedPics.join(', ')}>
              PIC: {hist.workedPics.slice(0, 2).join(', ') || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      width: 140,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant={r.handle === activeResult?.handle ? 'primary' : 'secondary'}
            onClick={() => setSelectedHandle(r.handle)}
          >
            Xem
          </Button>
          {onAddToBrandSheet && (
            <Button
              size="sm"
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => handlePushToBrandSheet([r])}
            >
              Listing
            </Button>
          )}
        </div>
      ),
    },
  ];

  const videoColumns: Column<TikTokVideoItem>[] = [
    {
      key: 'content',
      header: 'Nội dung & hashtag',
      width: 280,
      render: (v) => (
        <div className="grid gap-1 min-w-0 max-w-[340px]">
          <a
            href={v.videoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-ink hover:text-accent line-clamp-2 leading-snug inline-flex items-start gap-1"
          >
            <span>{v.caption}</span>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-ink-3" />
          </a>
          <div className="flex flex-wrap items-center gap-1.5">
            {v.isViralOutlier && (
              <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-2xs font-medium">
                Đột biến &ge;4x trung vị
              </span>
            )}
            {v.isPinnedOldVideo && (
              <span className="px-1.5 py-0.5 rounded bg-warning-soft text-warning text-2xs font-medium">
                Bài ghim cũ
              </span>
            )}
            <span className="text-2xs text-ink-3 truncate">
              {v.hashtags.length > 0 ? v.hashtags.join(' ') : 'Không có hashtag'}
            </span>
          </div>
          {v.isAffiliate && (
            <div className="flex flex-wrap items-center gap-1.5">
              {v.productUrl ? (
                <a
                  href={v.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-2xs text-positive font-medium hover:underline truncate max-w-[260px] inline-flex items-center gap-1"
                  title={v.productName}
                >
                  <ShoppingBag className="w-3 h-3 shrink-0" />
                  <span className="truncate">Giỏ hàng: {v.productName || 'Sản phẩm TikTok Shop'}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              ) : (
                <span className="text-2xs text-positive font-medium truncate" title={v.productName}>
                  Giỏ hàng: {v.productName || 'Sản phẩm TikTok Shop'}
                </span>
              )}
              {v.productId && (
                <span className="px-1.5 py-0.5 rounded bg-sunken border border-line text-2xs font-code text-ink-2">
                  SP: {v.productId}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'meta',
      header: 'Ngày đăng & nhạc nền',
      width: 170,
      render: (v) => (
        <div className="grid gap-0.5 min-w-0">
          <span className="text-xs text-ink tabular-nums">{formatDate(v.publishedAt)}</span>
          <span className="text-2xs text-ink-3 truncate inline-flex items-center gap-1" title={v.musicTitle}>
            <Music className="w-3 h-3 shrink-0" />
            <span className="truncate">{v.musicTitle}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'views',
      header: 'Lượt xem & ER',
      align: 'right',
      width: 110,
      render: (v) => (
        <div className="grid gap-0.5">
          <span className="text-xs font-semibold text-ink tabular-nums">{formatNumber(v.views)}</span>
          <span className="text-2xs text-ink-3 tabular-nums">ER {v.engagementRate}%</span>
        </div>
      ),
    },
    {
      key: 'engagement',
      header: 'Lượt thích · Bình luận · Chia sẻ',
      align: 'right',
      width: 210,
      render: (v) => (
        <div className="grid gap-0.5">
          <span className="text-xs text-ink tabular-nums">{formatNumber(v.likes)} tim</span>
          <span className="text-2xs text-ink-3 tabular-nums">
            {formatNumber(v.comments)} bình luận · {formatNumber(v.shares)} chia sẻ
          </span>
        </div>
      ),
    },
  ];

  const newCount = results.filter(
    (r) => !existingByHandle.has(r.handle.toLowerCase().replace(/^@+/, ''))
  ).length;
  const updateCount = results.length - newCount;

  const activeReviewSummary = useMemo(
    () => (activeResult ? getChannelSummary(activeResult.handle) : undefined),
    [activeResult, getChannelSummary]
  );

  const openChannelReview = (
    resItem: TikTokScrapedKocResult,
    initialVerdict?: 'SUITABLE' | 'CAUTION' | 'NOT_SUITABLE'
  ) => {
    setReviewTarget({
      handle: resItem.handle,
      channelName: resItem.channelProfile.nickname || resItem.handle,
      channelUrl: resItem.channelProfile.channelUrl,
      avatarUrl: resItem.channelProfile.avatarUrl,
      initialVerdict,
      sourceScreen: 'Cào kênh theo @handle',
    });
    setReviewModalOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Lấy dữ liệu Kênh KOC trên TikTok"
        size="2xl"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            {activeResult && (
              <>
                <Button
                  variant="secondary"
                  icon={Check}
                  onClick={() => openChannelReview(activeResult, 'SUITABLE')}
                >
                  ĐG Phù hợp
                </Button>
                <Button
                  variant="secondary"
                  icon={XCircle}
                  onClick={() => openChannelReview(activeResult, 'NOT_SUITABLE')}
                >
                  Không phù hợp
                </Button>
                {activeReviewSummary && (
                  <Button
                    variant="secondary"
                    icon={History}
                    onClick={() => openChannelReview(activeResult)}
                  >
                    Lịch sử ĐG ({activeReviewSummary.totalReviews})
                  </Button>
                )}
              </>
            )}
            {results.length > 0 && (
              <>
                {matchedActiveKoc && onOpenKocInMaster && (
                  <Button
                    variant="secondary"
                    icon={UserCheck}
                    onClick={() => onOpenKocInMaster(matchedActiveKoc)}
                  >
                    Mở hồ sơ danh bạ
                  </Button>
                )}
                <Button variant="secondary" icon={Download} onClick={handleExportCsv}>
                  Xuất file CSV
                </Button>
                {onAddToBrandSheet && (
                  <Button
                    variant="secondary"
                    icon={FileSpreadsheet}
                    onClick={() => handlePushToBrandSheet(results)}
                  >
                    {results.length === 1
                      ? 'Đưa vào Sheet Listing'
                      : `Đưa ${results.length} kênh vào Sheet`}
                  </Button>
                )}
                <Button variant="primary" icon={Check} onClick={handleSaveToMaster}>
                  {results.length === 1
                    ? existingByHandle.has(results[0].handle.toLowerCase().replace(/^@+/, ''))
                      ? 'Cập nhật hồ sơ KOC'
                      : 'Thêm vào danh bạ'
                    : `Lưu ${results.length} kênh (${newCount} mới, ${updateCount} cập nhật)`}
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface space-y-2">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_185px_auto] gap-2.5 items-center">
              <input
                id="tiktok-scraper-input"
                type="text"
                aria-label="Kênh TikTok (@handle hoặc link kênh)"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    void runScrape(rawInput, period, videoLimit);
                  }
                }}
                placeholder="Nhập @handle, link kênh, link video hoặc link rút gọn vt.tiktok.com (VD: @megauriviu, https://vt.tiktok.com/...)..."
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink focus:outline-none focus:border-line-strong font-code"
              />

              <Select
                id="tiktok-scraper-video-limit"
                aria-label="Số video đọc / kênh"
                value={String(videoLimit)}
                onChange={(e) => setVideoLimit(Number(e.target.value))}
                className="h-9 text-xs"
              >
                {VIDEO_LIMIT_OPTIONS.map((num) => (
                  <option key={num} value={num}>
                    Tối đa {num} video
                  </option>
                ))}
              </Select>

              <div className="flex items-center gap-2">
                <Button
                  variant={results.length === 0 ? 'primary' : 'secondary'}
                  icon={loading ? RefreshCw : Search}
                  disabled={loading}
                  onClick={() => runScrape(rawInput, period, videoLimit, false)}
                >
                  {loading
                    ? requestedHandlesCount > 1
                      ? `Đang quét ${completedHandlesCount}/${requestedHandlesCount}...`
                      : 'Đang lấy dữ liệu...'
                    : 'Lấy dữ liệu kênh'}
                </Button>
                {loading && (
                  <Button
                    variant="secondary"
                    icon={Square}
                    onClick={handleStopScrape}
                  >
                    Dừng
                  </Button>
                )}
              </div>
            </div>

            {resolvedShortLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-2xs">
                <span className="text-ink-3 font-medium">Đã giải mã link rút gọn:</span>
                {resolvedShortLinks.map((sl) => (
                  <span
                    key={sl.shortUrl}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sunken border border-line font-code text-ink-2"
                  >
                    <span className="truncate max-w-[160px]">{sl.shortUrl.replace(/^https?:\/\//i, '')}</span>
                    <span>→</span>
                    <strong className="text-accent">@{sl.handle}</strong>
                  </span>
                ))}
              </div>
            )}

            {loading && requestedHandlesCount > 1 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-2xs text-ink-3 tabular-nums">
                  <span>
                    Tiến độ quét lô cuốn chiếu: {completedHandlesCount}/{requestedHandlesCount} kênh
                  </span>
                  <span>
                    {Math.min(
                      100,
                      Math.round(
                        (completedHandlesCount / Math.max(1, requestedHandlesCount)) * 100
                      )
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-sunken overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (completedHandlesCount / Math.max(1, requestedHandlesCount)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {errorMsg && <p className="text-2xs text-critical">{errorMsg}</p>}
            {!loading && results.length > 0 && requestedHandlesCount > results.length && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Status tone="warning">
                  Chỉ lấy được {results.length}/{requestedHandlesCount} kênh KOC yêu cầu (thiếu{' '}
                  {requestedHandlesCount - results.length} kênh)
                </Status>
                {failedHandlesList.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={() =>
                      runScrape(
                        failedHandlesList.map((f) => f.handle).join(', '),
                        period,
                        videoLimit,
                        true
                      )
                    }
                  >
                    Quét lại {failedHandlesList.length} kênh lỗi
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Danh sách các kênh đã quét & Bảng so sánh nhanh đa kênh */}
          {results.length > 1 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xs text-ink-3 mr-1">Đã lấy {results.length} kênh:</span>
                  {results.map((r) => {
                    const isSelected = r.handle === activeResult?.handle;
                    const isExisting = existingByHandle.has(r.handle.toLowerCase().replace(/^@+/, ''));
                    const sum = getChannelSummary(r.handle);
                    const bi = r.bookingIntelligence;
                    return (
                      <button
                        key={r.handle}
                        type="button"
                        onClick={() => setSelectedHandle(r.handle)}
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'bg-accent-soft border-accent text-ink font-semibold'
                            : 'bg-surface border-line text-ink-2 hover:bg-canvas'
                        }`}
                      >
                        <span>@{r.handle}</span>
                        {bi && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-2xs font-semibold tabular-nums ${
                              bi.verdict === 'NÊN_BOOK'
                                ? 'bg-positive-soft text-positive'
                                : bi.verdict === 'CÂN_NHẮC'
                                  ? 'bg-warning-soft text-warning'
                                  : 'bg-critical-soft text-critical'
                            }`}
                          >
                            {bi.fitScore}đ
                          </span>
                        )}
                        {sum && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-2xs font-semibold ${
                              sum.latestReview.verdict === 'NOT_SUITABLE' || sum.notSuitableCount > 0
                                ? 'bg-critical-soft text-critical'
                                : sum.latestReview.verdict === 'SUITABLE'
                                  ? 'bg-positive-soft text-positive'
                                  : 'bg-warning-soft text-warning'
                            }`}
                          >
                            {sum.latestReview.verdictLabel}
                          </span>
                        )}
                        <span className="text-2xs text-ink-3 tabular-nums">
                          {formatFollowers(r.channelProfile.followers)} flw · Trung vị {formatNumber(r.engagementMetrics.latest15MedianViews ?? r.engagementMetrics.medianViews ?? r.engagementMetrics.avgViews)}
                        </span>
                        <span className="text-2xs text-ink-3">
                          ({isExisting ? 'Đã có' : 'Mới'})
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowComparisonTable((prev) => !prev)}
                >
                  {showComparisonTable ? 'Thu gọn bảng so sánh' : `So sánh ${results.length} kênh`}
                </Button>
              </div>

              {showComparisonTable && (
                <Panel
                  flush
                  title={`Bảng so sánh & định giá nhanh (${results.length} kênh vừa quét)`}
                >
                  <DataTable
                    columns={comparisonColumns}
                    rows={results}
                    rowKey={(r) => r.handle}
                    compact
                  />
                </Panel>
              )}
            </div>
          )}

          {/* Chi tiết kênh & danh sách video của kênh đang chọn */}
          {activeResult && (
            <div className="space-y-3">
              <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar
                    name={activeResult.channelProfile.nickname}
                    src={activeResult.channelProfile.avatarUrl}
                    size={36}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-semibold text-ink">
                        {activeResult.channelProfile.nickname}
                      </h3>
                      <a
                        href={activeResult.channelProfile.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline font-code"
                      >
                        @{activeResult.channelProfile.handle}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {matchedActiveKoc ? (
                        onOpenKocInMaster ? (
                          <button
                            type="button"
                            onClick={() => onOpenKocInMaster(matchedActiveKoc)}
                            title="Mở hồ sơ KOC trong Danh bạ KOC"
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent-soft border border-accent/30 text-accent hover:bg-accent hover:text-white transition-colors text-2xs font-semibold cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3 shrink-0" />
                            <span>Đã có trong danh bạ · Xem hồ sơ</span>
                          </button>
                        ) : (
                          <Status tone="neutral">Đã có trong danh bạ</Status>
                        )
                      ) : (
                        <Status tone="positive">Kênh mới</Status>
                      )}
                      {activeReviewSummary && (
                        <KocChannelReviewBadge
                          summary={activeReviewSummary}
                          onClick={() => openChannelReview(activeResult)}
                        />
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={History}
                        onClick={() => openChannelReview(activeResult)}
                      >
                        {activeReviewSummary
                          ? `Lịch sử ĐG (${activeReviewSummary.totalReviews})`
                          : 'Đánh giá kênh'}
                      </Button>
                      {onAddToBrandSheet && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={FileSpreadsheet}
                          onClick={() => handlePushToBrandSheet([activeResult])}
                        >
                          Đưa vào Sheet Listing
                        </Button>
                      )}
                      {activeResult.bookingIntelligence?.outreachMessageTemplate && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Copy}
                          onClick={() =>
                            void handleCopyOutreachMessage(
                              activeResult.bookingIntelligence!.outreachMessageTemplate,
                              activeResult.handle
                            )
                          }
                        >
                          Sao chép lời mời
                        </Button>
                      )}
                      {activeResult.bookingIntelligence?.zaloDirectUrl && (
                        <a
                          href={activeResult.bookingIntelligence.zaloDirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-line bg-surface hover:bg-canvas text-2xs font-medium text-accent"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Nhắn Zalo ({activeResult.channelProfile.extractedPhone})</span>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={RefreshCw}
                        disabled={loadingMoreHandle === activeResult.handle || loading}
                        onClick={() =>
                          void handleLoadMoreVideos(
                            activeResult.handle,
                            Math.max(videoLimit, activeResult.recentVideos.length || 24),
                            true
                          )
                        }
                      >
                        {loadingMoreHandle === activeResult.handle
                          ? 'Đang làm mới...'
                          : 'Làm mới trực tiếp'}
                      </Button>
                      {activeResult.scrapeDiagnostics && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sunken border border-line text-2xs text-ink-2 tabular-nums">
                          <Activity className="w-3 h-3 text-accent shrink-0" />
                          <span>{activeResult.scrapeDiagnostics.engineLabel}</span>
                          <span>· {activeResult.scrapeDiagnostics.durationMs}ms</span>
                          <span>
                            · {activeResult.scrapeDiagnostics.cacheHit ? 'Bộ nhớ đệm' : 'Trực tiếp'}
                          </span>
                        </span>
                      )}
                      <span className="text-2xs text-ink-3">
                        · SĐT:{' '}
                        <strong className="font-semibold text-ink font-code">
                          {activeResult.channelProfile.extractedPhone || '—'}
                        </strong>
                      </span>
                      <span className="text-2xs text-ink-3">
                        · Email:{' '}
                        <strong className="font-semibold text-ink font-code">
                          {activeResult.channelProfile.extractedEmail || '—'}
                        </strong>
                      </span>
                      {activeResult.channelProfile.externalSocialLinks &&
                        activeResult.channelProfile.externalSocialLinks.length > 0 && (
                          <span className="inline-flex flex-wrap items-center gap-1.5 text-2xs">
                            · Liên kết Bio:
                            {activeResult.channelProfile.externalSocialLinks.map((lnk) => {
                              const shortHost = lnk
                                .replace(/^https?:\/\/(www\.)?/i, '')
                                .split('/')[0];
                              return (
                                <a
                                  key={lnk}
                                  href={lnk}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-sunken border border-line text-accent hover:underline font-code"
                                >
                                  {shortHost}
                                </a>
                              );
                            })}
                          </span>
                        )}
                    </div>

                    {activeResult.channelProfile.bio && (
                      <p className="text-2xs text-ink-2 truncate max-w-2xl">
                        {activeResult.channelProfile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-2xs tabular-nums shrink-0">
                  <span>
                    <span className="text-ink-3">Follower: </span>
                    <strong className="text-ink">
                      {formatFollowers(activeResult.channelProfile.followers)}
                    </strong>
                  </span>
                  <span>
                    <span className="text-ink-3">Tổng video: </span>
                    <strong className="text-ink">
                      {formatNumber(activeResult.channelProfile.videoCount)}
                    </strong>
                  </span>
                  <span>
                    <span className="text-ink-3">View trung vị ({activeResult.recentVideos.length} bài): </span>
                    <strong className="text-accent">
                      {formatNumber(activeResult.engagementMetrics.medianViews ?? activeResult.engagementMetrics.avgViews)}
                    </strong>
                  </span>
                  <span>
                    <span className="text-ink-3">View TB: </span>
                    <strong className="text-ink">
                      {formatNumber(activeResult.engagementMetrics.avgViews)}
                    </strong>
                  </span>
                  <span>
                    <span className="text-ink-3">ER: </span>
                    <strong className="text-positive">
                      {activeResult.engagementMetrics.engagementRate}%
                    </strong>
                  </span>
                </div>
              </div>

              {/* Lưới 6 chỉ số sức khỏe thật của kênh (Tách bài gắn giỏ vs bài thường, 15 bài mới nhất, độ ổn định & tần suất đăng) */}
              {(() => {
                const em = activeResult.engagementMetrics;
                const affCount = em.affiliateVideoCount ?? activeResult.recentVideos.filter((v) => v.isAffiliate).length;
                const orgCount = em.organicVideoCount ?? activeResult.recentVideos.length - affCount;
                const affMedian = em.affiliateMedianViews ?? 0;
                const orgMedian = em.organicMedianViews ?? 0;
                const isAffDropWarning =
                  affCount > 0 && orgCount > 0 && orgMedian > 0 && affMedian < orgMedian * 0.45;
                const consistency = em.viewConsistencyRatioPct;
                const daysIdle = em.daysSinceLastPost;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <div className="p-2.5 rounded-lg border border-line bg-surface space-y-0.5">
                      <span className="text-2xs text-ink-3 block">
                        View trung vị ({activeResult.recentVideos.length} bài)
                      </span>
                      <span className="text-sm font-semibold text-accent tabular-nums block">
                        {formatNumber(em.medianViews ?? em.avgViews)}
                      </span>
                      <span className="text-2xs text-ink-3 tabular-nums block">
                        View TB: {formatNumber(em.avgViews)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-line bg-surface space-y-0.5">
                      <span className="text-2xs text-ink-3 block">
                        15 bài mới nhất (trừ ghim cũ)
                      </span>
                      <span className="text-sm font-semibold text-ink tabular-nums block">
                        {formatNumber(em.latest15MedianViews ?? em.medianViews ?? em.avgViews)}
                      </span>
                      <span className="text-2xs text-ink-3 tabular-nums block">
                        TB 15 bài: {formatNumber(em.latest15AvgViews ?? em.avgViews)}
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-lg border space-y-0.5 ${
                        isAffDropWarning
                          ? 'border-critical/40 bg-critical-soft/20'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <span className="text-2xs text-ink-3 block">
                        Bài gắn giỏ ({affCount}/{activeResult.recentVideos.length} bài)
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums block ${
                          isAffDropWarning ? 'text-critical' : 'text-positive'
                        }`}
                      >
                        {affCount > 0 ? formatNumber(affMedian) : 'Chưa có'}
                      </span>
                      <span className="text-2xs text-ink-3 tabular-nums block">
                        {affCount > 0
                          ? isAffDropWarning
                            ? `Tụt view giỏ (TB ${formatNumber(em.affiliateAvgViews || 0)})`
                            : `TB giỏ: ${formatNumber(em.affiliateAvgViews || 0)}`
                          : '0 bài gắn giỏ hàng'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-line bg-surface space-y-0.5">
                      <span className="text-2xs text-ink-3 block">
                        Bài nội dung thường ({orgCount} bài)
                      </span>
                      <span className="text-sm font-semibold text-ink tabular-nums block">
                        {orgCount > 0 ? formatNumber(orgMedian) : '—'}
                      </span>
                      <span className="text-2xs text-ink-3 tabular-nums block">
                        {orgCount > 0 ? `TB thường: ${formatNumber(em.organicAvgViews || 0)}` : 'Toàn bộ gắn giỏ'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-line bg-surface space-y-0.5">
                      <span className="text-2xs text-ink-3 block">
                        Độ ổn định phong độ
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums block ${
                          consistency !== undefined && consistency < 45
                            ? 'text-warning'
                            : 'text-positive'
                        }`}
                      >
                        {consistency !== undefined ? `${consistency}%` : '—'}
                      </span>
                      <span className="text-2xs text-ink-3 tabular-nums block">
                        Giữ &ge; 50% trung vị · ER {em.engagementRate}%
                      </span>
                    </div>

                    <div
                      className={`p-2.5 rounded-lg border space-y-0.5 ${
                        daysIdle !== undefined && daysIdle > 21
                          ? 'border-warning/40 bg-warning-soft/20'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <span className="text-2xs text-ink-3 block">
                        Nhịp độ đăng bài
                      </span>
                      <span className="text-sm font-semibold text-ink tabular-nums block">
                        {em.postingFrequencyPerWeek !== undefined
                          ? `${em.postingFrequencyPerWeek} bài/tuần`
                          : '—'}
                      </span>
                      <span
                        className={`text-2xs tabular-nums block ${
                          daysIdle !== undefined && daysIdle > 21 ? 'text-warning font-medium' : 'text-ink-3'
                        }`}
                      >
                        {daysIdle !== undefined
                          ? daysIdle === 0
                            ? 'Vừa đăng hôm nay'
                            : `Bài mới nhất: ${daysIdle} ngày trước`
                          : em.lastVideoPublishedAt
                            ? `Đăng: ${formatDate(em.lastVideoPublishedAt)}`
                            : '—'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Khối Đánh giá Đề xuất Book, Khung giá Net gợi ý & Đối soát Lịch sử Lark 3.1 / Danh bạ Upbase */}
              {activeResult.bookingIntelligence && (() => {
                const bi = activeResult.bookingIntelligence;
                const hist = bi.historicalUpbaseSummary;
                const isFocRange = bi.suggestedNetRateMin === 0 && bi.suggestedNetRateMax <= 500000;
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-ink">
                            Khuyến nghị Booking &amp; Định giá đàm phán
                          </span>
                          <Status
                            tone={
                              bi.verdict === 'NÊN_BOOK'
                                ? 'positive'
                                : bi.verdict === 'CÂN_NHẮC'
                                  ? 'warning'
                                  : 'critical'
                            }
                          >
                            {bi.verdictLabel} ({bi.fitScore}/100)
                          </Status>
                        </div>
                        <span className="text-2xs font-medium text-ink-2">
                          {bi.suggestedBookingFormatLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
                        <div className="px-2.5 py-1.5 rounded-lg bg-sunken border border-line">
                          <span className="text-2xs text-ink-3 block">Khung giá Net đề xuất</span>
                          <strong className="text-xs font-semibold text-accent font-code tabular-nums">
                            {isFocRange
                              ? 'FOC 0đ – 500.000đ'
                              : `${formatVnd(bi.suggestedNetRateMin)} – ${formatVnd(bi.suggestedNetRateMax)}`}
                          </strong>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-sunken border border-line">
                          <span className="text-2xs text-ink-3 block">CPV dự kiến (theo trung vị)</span>
                          <strong className="text-xs font-semibold text-ink font-code tabular-nums">
                            {bi.estimatedCpvVnd > 0
                              ? `${formatNumber(bi.estimatedCpvVnd)} đ/view`
                              : 'FOC 0đ'}
                          </strong>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg bg-sunken border border-line col-span-2 sm:col-span-1">
                          <span className="text-2xs text-ink-3 block">Nhãn hàng B2C phù hợp</span>
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {bi.recommendedB2cBrands.map((b) => (
                              <span
                                key={b}
                                className="px-1.5 py-0.5 rounded bg-surface border border-line text-2xs font-medium text-ink"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {bi.riskFlags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {bi.riskFlags.map((flag) => (
                            <span
                              key={flag.code}
                              className={`px-2 py-0.5 rounded-md text-2xs font-medium border ${
                                flag.severity === 'critical'
                                  ? 'bg-critical-soft border-critical/30 text-critical'
                                  : flag.severity === 'warning'
                                    ? 'bg-warning-soft border-warning/30 text-warning'
                                    : 'bg-positive-soft border-positive/30 text-positive'
                              }`}
                            >
                              {flag.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ink">
                          Đối soát Lịch sử Lark 3.1 &amp; Danh bạ Upbase
                        </span>
                        {hist.isExistingMasterKoc ? (
                          <Status tone="warning">
                            Đã từng làm ({hist.totalPastDeals} deal)
                          </Status>
                        ) : (
                          <Status tone="positive">KOC Mới hoàn toàn</Status>
                        )}
                      </div>

                      {hist.isExistingMasterKoc ? (
                        <div className="space-y-1.5 text-2xs">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                            {hist.historicalRateCard > 0 && (
                              <span>
                                <span className="text-ink-3">Rate Card: </span>
                                <strong className="text-accent font-code">
                                  {formatVnd(hist.historicalRateCard)}
                                </strong>
                              </span>
                            )}
                            {(hist.historicalMinRate > 0 || hist.historicalMaxRate > 0) && (
                              <span>
                                <span className="text-ink-3">Biên độ từng chốt: </span>
                                <strong className="text-ink font-code">
                                  {formatVndShort(hist.historicalMinRate)} – {formatVndShort(hist.historicalMaxRate)}
                                </strong>
                              </span>
                            )}
                            {hist.historicalGmvVnd > 0 && (
                              <span>
                                <span className="text-ink-3">GMV lịch sử: </span>
                                <strong className="text-positive font-code">
                                  {formatVndShort(hist.historicalGmvVnd)}
                                </strong>
                                {hist.historicalRoi > 0 && (
                                  <span className="text-ink-3"> (ROI {hist.historicalRoi}x)</span>
                                )}
                              </span>
                            )}
                          </div>
                          {hist.workedPics.length > 0 && (
                            <div className="text-2xs text-ink-2">
                              <span className="text-ink-3">PIC từng phụ trách: </span>
                              <strong className="text-ink">{hist.workedPics.join(', ')}</strong>
                            </div>
                          )}
                          {hist.recentLarkListings.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              {hist.recentLarkListings.slice(0, 2).map((li, idx) => (
                                <div
                                  key={`${li.monthKey}-${li.storeName}-${idx}`}
                                  className="px-2 py-1 rounded bg-sunken border border-line flex flex-wrap items-center justify-between gap-2"
                                >
                                  <span>
                                    <strong className="text-ink">{li.brandName}</strong> ({li.monthKey}) · PIC: {li.picName}
                                  </span>
                                  <span className="font-code tabular-nums text-ink">
                                    {li.finalFee > 0 ? formatVnd(li.finalFee) : 'FOC 0đ'} · {li.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-2xs text-ink-2">
                          Kênh chưa phát sinh trong 4.811 KOC Master và 2.561 bản ghi Lark 3.1 Listing kỳ 2026/10–2026/11. Có thể chủ động liên hệ mở mới mà không lo trùng PIC nội bộ.
                        </p>
                      )}

                      <div className="pt-1 border-t border-line flex flex-wrap items-center justify-between gap-2">
                        <span className="text-2xs text-ink-2 truncate max-w-md" title={bi.outreachMessageTemplate}>
                          Mẫu nhắn KOC: &ldquo;{bi.outreachMessageTemplate}&rdquo;
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Copy}
                            onClick={() =>
                              void handleCopyOutreachMessage(
                                bi.outreachMessageTemplate,
                                activeResult.handle
                              )
                            }
                          >
                            Sao chép lời mời
                          </Button>
                          {bi.zaloDirectUrl && (
                            <a
                              href={bi.zaloDirectUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-sunken hover:bg-canvas text-2xs font-semibold text-accent"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Mở Zalo</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Cảnh báo xung đột Sheet Listing nội bộ (nếu đang lưu tạm trong trình duyệt) */}
              {activeSheetListings.length > 0 && (
                <div className="px-3.5 py-2.5 rounded-xl border border-warning/40 bg-warning-soft/30 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                      Đang có trong Sheet Listing cá nhân ({activeSheetListings.length} dòng) — Tránh liên hệ trùng
                    </span>
                  </div>
                  <div className="space-y-1">
                    {activeSheetListings.slice(0, 3).map((item) => (
                      <div
                        key={`${item.sheetKey}-${item.dot}`}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-line text-2xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-ink">{item.store}</span>
                          <span className="text-ink-3">({item.thang} · {item.dot})</span>
                          <span className="text-ink-2">· PIC: <strong>{item.nhanSuDien}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          {item.giaNetVideo > 0 && (
                            <span className="font-code font-medium text-ink">
                              Net: {formatVnd(item.giaNetVideo)}
                            </span>
                          )}
                          <Status
                            tone={
                              item.brandChon === 'Yes'
                                ? 'positive'
                                : item.brandChon === 'No'
                                  ? 'critical'
                                  : 'warning'
                            }
                          >
                            Brand: {item.brandChon}
                          </Status>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách sản phẩm / nhãn hàng đang gắn giỏ phát hiện trên kênh */}
              {activeResult.engagementMetrics.promotedProductsSummary &&
                activeResult.engagementMetrics.promotedProductsSummary.length > 0 && (
                  <div className="px-3.5 py-2 rounded-xl border border-line bg-surface flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-semibold text-ink inline-flex items-center gap-1.5 shrink-0">
                      <ShoppingBag className="w-3.5 h-3.5 text-accent" />
                      Sản phẩm / Giỏ hàng phát hiện trên kênh:
                    </span>
                    {activeResult.engagementMetrics.promotedProductsSummary.map((prod) => (
                      <a
                        key={`${prod.productId || prod.label}`}
                        href={prod.productUrl || prod.latestVideoUrl || activeResult.channelProfile.channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sunken border border-line text-2xs text-ink hover:border-line-strong"
                      >
                        <span className="truncate max-w-[220px] font-medium">{prod.label}</span>
                        {prod.productId && (
                          <span className="font-code text-accent">#{prod.productId.slice(-6)}</span>
                        )}
                        <span className="text-ink-3 tabular-nums">
                          ({prod.count} bài · {formatNumber(prod.latestViews)} view)
                        </span>
                        <ExternalLink className="w-2.5 h-2.5 text-ink-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}

              {/* Khung hiển thị trực tiếp lịch sử đánh giá khi tìm kiếm đúng vào kênh đã có đánh giá */}
              {activeReviewSummary && (
                <div
                  className={`px-3.5 py-2.5 rounded-xl border space-y-2 ${
                    activeReviewSummary.latestReview.verdict === 'NOT_SUITABLE' ||
                    activeReviewSummary.notSuitableCount > 0
                      ? 'bg-critical-soft/40 border-critical/30'
                      : activeReviewSummary.latestReview.verdict === 'SUITABLE'
                        ? 'bg-positive-soft/40 border-positive/30'
                        : 'bg-warning-soft/40 border-warning/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <History
                        className={`w-4 h-4 shrink-0 ${
                          activeReviewSummary.latestReview.verdict === 'NOT_SUITABLE' ||
                          activeReviewSummary.notSuitableCount > 0
                            ? 'text-critical'
                            : activeReviewSummary.latestReview.verdict === 'SUITABLE'
                              ? 'text-positive'
                              : 'text-warning'
                        }`}
                      />
                      <span className="font-semibold text-ink">
                        Lịch sử đánh giá kênh @{activeReviewSummary.handle} ({activeReviewSummary.totalReviews} lượt)
                      </span>
                      <Status tone={getVerdictTone(activeReviewSummary.latestReview.verdict)}>
                        {activeReviewSummary.latestReview.verdictLabel}
                      </Status>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openChannelReview(activeResult)}
                    >
                      Xem đầy đủ &amp; Thêm đánh giá
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {activeReviewSummary.reviews.slice(0, 2).map((rev) => (
                      <div
                        key={rev.id}
                        className="px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-ink">{rev.reviewerName}</span>
                          <span className="text-2xs text-ink-3 inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" />
                            {rev.timeLabel} {rev.dateLabel}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-sunken text-2xs font-medium text-ink-2">
                            {rev.brandScope}
                          </span>
                          {rev.reasonTags.length > 0 && (
                            <span className="text-2xs font-medium text-critical">
                              · {rev.reasonTags.join(', ')}
                            </span>
                          )}
                          {rev.note && (
                            <span className="text-2xs text-ink-2 truncate max-w-md">
                              — {rev.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Panel
                flush
                title={`Video gần nhất trên kênh (${filteredVideos.length} / ${formatNumber(activeResult.channelProfile.videoCount)} bài)`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-lg border border-line bg-sunken p-0.5 text-2xs">
                      <button
                        type="button"
                        onClick={() => setVideoFilter('ALL')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          videoFilter === 'ALL'
                            ? 'bg-surface text-ink font-semibold'
                            : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        Tất cả ({activeResult.recentVideos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoFilter('AFFILIATE')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          videoFilter === 'AFFILIATE'
                            ? 'bg-surface text-positive font-semibold'
                            : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        Gắn giỏ ({activeResult.recentVideos.filter((v) => v.isAffiliate).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoFilter('ORGANIC')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          videoFilter === 'ORGANIC'
                            ? 'bg-surface text-ink font-semibold'
                            : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        Bài thường ({activeResult.recentVideos.filter((v) => !v.isAffiliate).length})
                      </button>
                      {activeResult.recentVideos.some(
                        (v) => v.isViralOutlier || v.isPinnedOldVideo
                      ) && (
                        <button
                          type="button"
                          onClick={() => setVideoFilter('OUTLIER')}
                          className={`px-2 py-1 rounded-md transition-colors ${
                            videoFilter === 'OUTLIER'
                              ? 'bg-surface text-accent font-semibold'
                              : 'text-ink-2 hover:text-ink'
                          }`}
                        >
                          Đột biến / Ghim cũ (
                          {
                            activeResult.recentVideos.filter(
                              (v) => v.isViralOutlier || v.isPinnedOldVideo
                            ).length
                          }
                          )
                        </button>
                      )}
                    </div>
                    {!loading &&
                      loadingMoreHandle !== activeResult.handle &&
                      activeResult.recentVideos.length < requestedVideoLimit && (
                        <Status tone="warning">
                          Chỉ lấy được {activeResult.recentVideos.length}/{requestedVideoLimit} video yêu cầu
                        </Status>
                      )}
                    {activeResult.recentVideos.length < 100 &&
                      activeResult.recentVideos.length < activeResult.channelProfile.videoCount && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={RefreshCw}
                          disabled={loadingMoreHandle === activeResult.handle || loading}
                          onClick={() => {
                            const nextPreset =
                              VIDEO_LIMIT_OPTIONS.find(
                                (opt) => opt > activeResult.recentVideos.length
                              ) || 100;
                            void handleLoadMoreVideos(activeResult.handle, nextPreset);
                          }}
                        >
                          {loadingMoreHandle === activeResult.handle
                            ? 'Đang tải thêm...'
                            : 'Tải thêm video'}
                        </Button>
                      )}
                  </div>
                }
              >
                <DataTable
                  columns={videoColumns}
                  rows={filteredVideos}
                  rowKey={(v) => v.videoId}
                  compact
                />
              </Panel>
            </div>
          )}
        </div>
      </Modal>

      <KocChannelReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        target={reviewTarget}
        reviews={channelReviews}
        currentUserName={currentUser?.name || 'Nhân sự B2C'}
        currentUserRole={currentUser?.role}
        currentUserEmail={currentUser?.email}
        onNotify={onNotify}
      />
    </>
  );
};
