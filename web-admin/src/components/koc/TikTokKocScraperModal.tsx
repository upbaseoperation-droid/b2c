'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Download,
  ExternalLink,
  History,
  Music,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { KocItem, TikTokVideoItem, UserProfile } from '../../lib/types';
import {
  buildScrapedKocsCsv,
  mapScrapedResultToKocItem,
  parseTikTokHandles,
  type TikTokScrapedKocResult,
} from '../../lib/tiktokKocScraper';
import { formatDate, formatNumber, getVietnamDateYmd } from '../../lib/format';
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
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type PeriodKey = '7d' | '30d' | '90d';
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
  onNotify,
}) => {
  const [rawInput, setRawInput] = useState(initialHandle);
  const period: PeriodKey = '30d';
  const [videoLimit, setVideoLimit] = useState<number>(24);
  const [requestedHandlesCount, setRequestedHandlesCount] = useState<number>(0);
  const [requestedVideoLimit, setRequestedVideoLimit] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [loadingMoreHandle, setLoadingMoreHandle] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<TikTokScrapedKocResult[]>([]);
  const [selectedHandle, setSelectedHandle] = useState<string>('');
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [reviewTarget, setReviewTarget] = useState<KocChannelReviewTarget | null>(null);
  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();

  const syncKey = `${open}-${initialHandle}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setRawInput(initialHandle);
      setVideoLimit(24);
      setRequestedVideoLimit(24);
      setRequestedHandlesCount(parseTikTokHandles(initialHandle).length);
      setErrorMsg(null);
      setResults([]);
      setSelectedHandle('');
      setLoading(false);
    } else {
      setLoading(false);
      setLoadingMoreHandle(null);
    }
  }

  const runScrape = async (inputToFetch: string, targetPeriod: PeriodKey, targetLimit = videoLimit) => {
    const trimmed = inputToFetch.trim();
    if (!trimmed) {
      setErrorMsg('Nhập ít nhất một đường dẫn kênh hoặc @handle TikTok để lấy dữ liệu.');
      return;
    }

    const parsedHandles = parseTikTokHandles(trimmed);
    setRequestedHandlesCount(Math.max(1, parsedHandles.length));
    setRequestedVideoLimit(targetLimit);
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: trimmed,
          period: targetPeriod,
          videoLimit: targetLimit,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results) || json.results.length === 0) {
        setErrorMsg(json.message || 'Không lấy được dữ liệu kênh TikTok. Kiểm tra lại đường dẫn hoặc @handle.');
        return;
      }

      setResults(json.results);
      setSelectedHandle(json.results[0].handle);
      onSaveScrapedSession?.({
        rawInput: trimmed,
        results: json.results as TikTokScrapedKocResult[],
      });
      if (parsedHandles.length > json.results.length) {
        onNotify?.(
          `Chỉ lấy được ${json.results.length}/${parsedHandles.length} kênh KOC yêu cầu (thiếu ${parsedHandles.length - json.results.length} kênh).`,
          'warning'
        );
      }
    } catch {
      setErrorMsg('Không kết nối được dịch vụ lấy dữ liệu TikTok. Thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMoreVideos = async (handle: string, nextLimit: number) => {
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
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.results) && json.results.length > 0) {
        const refreshed = json.results[0] as TikTokScrapedKocResult;
        setResults((prev) => prev.map((item) => (item.handle === handle ? refreshed : item)));
        setVideoLimit(nextLimit);
        onNotify?.(`Đã tải ${refreshed.recentVideos.length} video trên kênh @${handle}`, 'success');
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
          <span className="text-2xs text-ink-3 truncate">
            {v.hashtags.length > 0 ? v.hashtags.join(' ') : 'Không có hashtag'}
          </span>
          {v.isAffiliate && (
            <span className="text-2xs text-positive font-medium truncate" title={v.productName}>
              Giỏ hàng: {v.productName || 'Sản phẩm TikTok Shop'}
            </span>
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
                placeholder="Nhập @handle hoặc link kênh TikTok (cách nhau bằng dấu phẩy, VD: @megauriviu, @chanhbeauty)..."
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

              <Button
                variant={results.length === 0 ? 'primary' : 'secondary'}
                icon={loading ? RefreshCw : Search}
                disabled={loading}
                onClick={() => runScrape(rawInput, period, videoLimit)}
              >
                {loading ? 'Đang lấy dữ liệu...' : 'Lấy dữ liệu kênh'}
              </Button>
            </div>

            {errorMsg && <p className="text-2xs text-critical">{errorMsg}</p>}
            {!loading && results.length > 0 && requestedHandlesCount > results.length && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Status tone="warning">
                  Chỉ lấy được {results.length}/{requestedHandlesCount} kênh KOC yêu cầu (thiếu{' '}
                  {requestedHandlesCount - results.length} kênh)
                </Status>
              </div>
            )}
          </div>

          {/* Danh sách các kênh đã quét (nếu quét nhiều kênh) */}
          {results.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs text-ink-3 mr-1">Đã lấy {results.length} kênh:</span>
              {results.map((r) => {
                const isSelected = r.handle === activeResult?.handle;
                const isExisting = existingByHandle.has(r.handle.toLowerCase().replace(/^@+/, ''));
                const sum = getChannelSummary(r.handle);
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
                    {sum && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-3xs font-semibold ${
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
                      {formatFollowers(r.channelProfile.followers)} flw · ER {r.engagementMetrics.engagementRate}%
                    </span>
                    <span className="text-2xs text-ink-3">
                      ({isExisting ? 'Đã có' : 'Mới'})
                    </span>
                  </button>
                );
              })}
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
                    <span className="text-ink-3">View TB ({activeResult.recentVideos.length} bài): </span>
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
                title={`Video gần nhất trên kênh (${activeResult.recentVideos.length} / ${formatNumber(activeResult.channelProfile.videoCount)} bài)`}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
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
                  rows={activeResult.recentVideos}
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
