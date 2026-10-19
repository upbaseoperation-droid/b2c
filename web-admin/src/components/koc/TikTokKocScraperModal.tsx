'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CloudDownload,
  Download,
  ExternalLink,
  Music,
  RefreshCw,
  Search,
  Video,
} from 'lucide-react';
import type { KocItem, TikTokVideoItem } from '../../lib/types';
import {
  buildScrapedKocsCsv,
  mapScrapedResultToKocItem,
  type TikTokScrapedKocResult,
} from '../../lib/tiktokKocScraper';
import { formatDate, formatNumber } from '../../lib/format';
import { formatFollowers } from './kocUtils';
import {
  Avatar,
  Button,
  DataTable,
  Field,
  Modal,
  Panel,
  Segmented,
  Stat,
  StatRow,
  Status,
  Textarea,
} from '../ui';
import type { Column } from '../ui';

interface TikTokKocScraperModalProps {
  open: boolean;
  onClose: () => void;
  existingKocs: KocItem[];
  initialHandle?: string;
  onApplyResults: (payload: { created: KocItem[]; updated: KocItem[] }) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type PeriodKey = '7d' | '30d' | '90d';
type ScrapeModeKey = 'HANDLE' | 'HASHTAG';

const SAMPLE_HANDLES = [
  '@megauriviu',
  '@chanhbeauty',
  '@ha.linh.official',
  '@mebimsuathongthai',
];

const SAMPLE_HASHTAGS = [
  '#kemchongnang',
  '#skincare',
  '#clubclio',
  '#kutieskin',
  '#duocmypham',
];

export const TikTokKocScraperModal: React.FC<TikTokKocScraperModalProps> = ({
  open,
  onClose,
  existingKocs,
  initialHandle = '',
  onApplyResults,
  onNotify,
}) => {
  const [scrapeMode, setScrapeMode] = useState<ScrapeModeKey>('HANDLE');
  const [rawInput, setRawInput] = useState(initialHandle);
  const [hashtagInput, setHashtagInput] = useState('#kemchongnang');
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<TikTokScrapedKocResult[]>([]);
  const [selectedHandle, setSelectedHandle] = useState<string>('');

  const syncKey = `${open}-${initialHandle}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open) {
      setRawInput(initialHandle);
      setErrorMsg(null);
      setLoading(Boolean(initialHandle.trim()));
      if (!initialHandle) {
        setResults([]);
        setSelectedHandle('');
      }
    } else {
      setLoading(false);
    }
  }

  const runScrape = async (inputToFetch: string, targetPeriod: PeriodKey) => {
    const trimmed = inputToFetch.trim();
    if (!trimmed) {
      setErrorMsg('Nhập ít nhất một đường dẫn kênh hoặc @handle TikTok để lấy dữ liệu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawInput: trimmed,
          period: targetPeriod,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results) || json.results.length === 0) {
        setErrorMsg(json.message || 'Không lấy được dữ liệu kênh TikTok. Kiểm tra lại đường dẫn hoặc @handle.');
        return;
      }

      setResults(json.results);
      setSelectedHandle(json.results[0].handle);
    } catch {
      setErrorMsg('Không kết nối được dịch vụ lấy dữ liệu TikTok. Thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  };

  const runHashtagDiscovery = async (tagToFetch: string, targetPeriod: PeriodKey) => {
    const trimmed = tagToFetch.trim();
    if (!trimmed) {
      setErrorMsg('Nhập một #hashtag hoặc từ khóa ngách (ví dụ: #kemchongnang) để quét KOC.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/integrations/tiktok-koc/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hashtag: trimmed,
          period: targetPeriod,
          limit: 10,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.results) || json.results.length === 0) {
        setErrorMsg(json.message || 'Không tìm thấy KOC nào với hashtag này.');
        return;
      }

      setResults(json.results);
      setSelectedHandle(json.results[0].handle);
    } catch {
      setErrorMsg('Không kết nối được dịch vụ quét hashtag TikTok. Thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !initialHandle.trim()) return;
    let active = true;
    fetch('/api/integrations/tiktok-koc/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawInput: initialHandle.trim(),
        period,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.results) && json.results.length > 0) {
          setResults(json.results);
          setSelectedHandle(json.results[0].handle);
        } else {
          setErrorMsg(json.message || 'Không lấy được dữ liệu kênh TikTok.');
        }
      })
      .catch(() => {
        if (active) {
          setErrorMsg('Không kết nối được dịch vụ lấy dữ liệu TikTok.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, initialHandle, period]);

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

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const csvContent = buildScrapedKocsCsv(results);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-koc-data-${new Date().toISOString().slice(0, 10)}.csv`;
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
      const mapped = mapScrapedResultToKocItem(item, matched);
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

  return (
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
          {results.length > 0 && (
            <>
              <Button variant="secondary" icon={Download} onClick={handleExportCsv}>
                Xuất file CSV
              </Button>
              <Button variant="primary" icon={Check} onClick={handleSaveToMaster}>
                {results.length === 1
                  ? existingByHandle.has(results[0].handle)
                    ? 'Cập nhật hồ sơ KOC'
                    : 'Thêm vào danh bạ'
                  : `Lưu ${results.length} kênh (${newCount} mới, ${updateCount} cập nhật)`}
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Khung chọn chế độ & nhập danh sách kênh hoặc #hashtag TikTok */}
        <div className="p-4 rounded-xl border border-line bg-canvas/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-line/60">
            <Segmented<ScrapeModeKey>
              items={[
                { key: 'HANDLE', label: 'Quét theo @handle / Link kênh' },
                { key: 'HASHTAG', label: 'Tìm KOC theo #Hashtag / Từ khóa (0đ)' },
              ]}
              value={scrapeMode}
              onChange={(mode) => {
                setScrapeMode(mode);
                setErrorMsg(null);
              }}
            />
            <span className="text-2xs text-ink-3">
              Không cần tài khoản Kalodata · Tự động bóc tách SĐT/Zalo & chỉ số kênh thực tế
            </span>
          </div>

          {scrapeMode === 'HANDLE' ? (
            <>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                <Field
                  label="Đường dẫn kênh TikTok hoặc @handle (nhập 1 hoặc nhiều kênh, mỗi dòng 1 kênh)"
                  htmlFor="tiktok-scraper-input"
                  error={errorMsg || undefined}
                >
                  <Textarea
                    id="tiktok-scraper-input"
                    rows={2}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Ví dụ: https://www.tiktok.com/@megauriviu, @chanhbeauty..."
                  />
                </Field>

                <div className="flex flex-col gap-2 lg:pt-6">
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
                        if (rawInput.trim() && results.length > 0) {
                          void runScrape(rawInput, p);
                        }
                      }}
                    />
                    <Button
                      variant={results.length === 0 ? 'primary' : 'secondary'}
                      icon={loading ? RefreshCw : Search}
                      disabled={loading}
                      onClick={() => runScrape(rawInput, period)}
                    >
                      {loading ? 'Đang lấy dữ liệu...' : 'Lấy dữ liệu kênh'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Thử nhanh kênh mẫu:</span>
                {SAMPLE_HANDLES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      const next = rawInput.trim()
                        ? rawInput.includes(h)
                          ? rawInput
                          : `${rawInput.trim()}\n${h}`
                        : h;
                      setRawInput(next);
                    }}
                    className="px-2 py-0.5 rounded border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink transition-colors font-code"
                  >
                    {h}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const batch = SAMPLE_HANDLES.join('\n');
                    setRawInput(batch);
                    void runScrape(batch, period);
                  }}
                  className="px-2 py-0.5 rounded border border-line bg-surface text-accent hover:border-line-strong transition-colors font-medium ml-1"
                >
                  Quét mẫu 4 kênh
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                <Field
                  label="Nhập #Hashtag hoặc Từ khóa ngách trên TikTok để tìm KOC đang có video lên xu hướng"
                  htmlFor="tiktok-hashtag-input"
                  error={errorMsg || undefined}
                >
                  <input
                    id="tiktok-hashtag-input"
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    placeholder="Ví dụ: #kemchongnang, #skincare, #clubclio, #kutieskin..."
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-xs text-ink focus:outline-none focus:border-line-strong font-code"
                  />
                </Field>

                <div className="flex flex-col gap-2 lg:pt-6">
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
                        if (hashtagInput.trim() && results.length > 0) {
                          void runHashtagDiscovery(hashtagInput, p);
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      icon={loading ? RefreshCw : Search}
                      disabled={loading}
                      onClick={() => runHashtagDiscovery(hashtagInput, period)}
                    >
                      {loading ? 'Đang quét hashtag...' : 'Quét KOC theo Hashtag'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-ink-3">
                <span>Thử nhanh hashtag ngách:</span>
                {SAMPLE_HASHTAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setHashtagInput(tag);
                      void runHashtagDiscovery(tag, period);
                    }}
                    className="px-2 py-0.5 rounded border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink transition-colors font-code"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Danh sách các kênh đã quét (nếu quét nhiều kênh) */}
        {results.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-2xs text-ink-3 mr-1">Đã lấy {results.length} kênh:</span>
            {results.map((r) => {
              const isSelected = r.handle === activeResult?.handle;
              const isExisting = existingByHandle.has(r.handle);
              return (
                <button
                  key={r.handle}
                  type="button"
                  onClick={() => setSelectedHandle(r.handle)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isSelected
                      ? 'bg-accent-soft border-accent text-ink font-semibold'
                      : 'bg-surface border-line text-ink-2 hover:bg-canvas'
                  }`}
                >
                  <span>@{r.handle}</span>
                  <span className="text-2xs text-ink-3 tabular-nums">
                    {formatFollowers(r.channelProfile.followers)} flw · ER {r.engagementMetrics.engagementRate}%
                  </span>
                  {r.matchedHashtagVideo && (
                    <span className="text-2xs text-positive font-semibold tabular-nums">
                      {r.matchedHashtagVideo.breakoutRatio}x view/flw
                    </span>
                  )}
                  <span className="text-2xs text-ink-3">
                    ({isExisting ? 'Đã có' : 'Mới'})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chi tiết kênh & danh sách video của kênh đang chọn */}
        {activeResult ? (
          <div className="space-y-4">
            {/* Đầu hồ sơ kênh vừa thu thập */}
            <div className="p-4 rounded-xl border border-line bg-surface flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Avatar
                  name={activeResult.channelProfile.nickname}
                  src={activeResult.channelProfile.avatarUrl}
                  size={48}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-ink">
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
                    {existingByHandle.has(activeResult.handle) ? (
                      <Status tone="neutral">Đã có trong danh bạ</Status>
                    ) : (
                      <Status tone="positive">Kênh mới</Status>
                    )}
                  </div>

                  {/* Bio kênh */}
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {activeResult.channelProfile.bio || 'Chưa có tiểu sử trên kênh'}
                  </p>

                  {/* Thông tin liên hệ bóc tách từ Bio */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-2xs text-ink-3">
                    <span>
                      SĐT / Zalo tách từ bio:{' '}
                      <strong className="font-semibold text-ink font-code">
                        {activeResult.channelProfile.extractedPhone || '—'}
                      </strong>
                    </span>
                    <span>
                      Email:{' '}
                      <strong className="font-semibold text-ink font-code">
                        {activeResult.channelProfile.extractedEmail || '—'}
                      </strong>
                    </span>
                    <span>
                      Tổng số video trên kênh:{' '}
                      <strong className="font-semibold text-ink tabular-nums">
                        {formatNumber(activeResult.channelProfile.videoCount)} video
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-semibold text-ink tabular-nums">
                  {formatFollowers(activeResult.channelProfile.followers)} người theo dõi
                </span>
                <span className="text-2xs text-ink-3">
                  Cập nhật lúc {new Date(activeResult.scrapedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* 4 Ô chỉ số kênh & tương tác video gần nhất */}
              <StatRow>
                <Stat
                  label="Lượt theo dõi & tổng tim"
                  value={formatFollowers(activeResult.channelProfile.followers)}
                  note={`${formatFollowers(activeResult.channelProfile.totalLikes)} lượt thích · ${formatNumber(activeResult.channelProfile.videoCount)} video`}
                />
                <Stat
                  label="Lượt xem trung bình"
                  value={formatNumber(activeResult.engagementMetrics.avgViews)}
                  note={`Tính trên ${activeResult.engagementMetrics.sampleVideoCount} video gần nhất`}
                />
                <Stat
                  label="Tỷ lệ tương tác (ER)"
                  value={`${activeResult.engagementMetrics.engagementRate}%`}
                  note="(Tim + Bình luận + Chia sẻ) / Lượt xem"
                  tone="positive"
                />
                <Stat
                  label="Tương tác trung bình / video"
                  value={`${formatNumber(activeResult.engagementMetrics.avgLikes)} tim`}
                  note={`${formatNumber(activeResult.engagementMetrics.avgComments)} bình luận · ${formatNumber(activeResult.engagementMetrics.avgShares)} chia sẻ`}
                />
              </StatRow>

              {/* Bảng danh sách video & nội dung */}
              <Panel
                flush
                title="Danh sách video & nội dung gần nhất"
                description="Bao gồm đường dẫn video, caption, hashtag, nhạc nền, ngày đăng và lượt tương tác"
              >
                <DataTable
                  columns={videoColumns}
                  rows={activeResult.recentVideos}
                  rowKey={(v) => v.videoId}
                  compact
                />
              </Panel>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center space-y-2 border border-dashed border-line rounded-xl bg-surface">
            <div className="w-10 h-10 rounded-lg bg-sunken text-ink-3 flex items-center justify-center mx-auto">
              <CloudDownload className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-ink">
              Nhập link kênh TikTok hoặc @handle để lấy dữ liệu KOC
            </p>
            <p className="text-xs text-ink-3 max-w-xl mx-auto">
              Hệ thống thu thập trực tiếp dữ liệu công khai trên TikTok: Thông tin kênh & liên hệ trong Bio (SĐT, Zalo, Email), Follower, Tổng lượt thích, Tổng số video và chỉ số tương tác các video gần nhất (View, Tim, Bình luận, Chia sẻ, ER%).
            </p>
            <div className="pt-2 flex items-center justify-center gap-4 text-2xs text-ink-3">
              <span className="inline-flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> Tương tác & nội dung video
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
