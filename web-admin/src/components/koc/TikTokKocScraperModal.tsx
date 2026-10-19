'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Music,
  RefreshCw,
  Search,
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

export const TikTokKocScraperModal: React.FC<TikTokKocScraperModalProps> = ({
  open,
  onClose,
  existingKocs,
  initialHandle = '',
  onApplyResults,
  onNotify,
}) => {
  const [rawInput, setRawInput] = useState(initialHandle);
  const period: PeriodKey = '30d';
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
      setResults([]);
      setSelectedHandle('');
      setLoading(Boolean(initialHandle.trim()));
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
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
          <Field
            label="Kênh TikTok (@handle hoặc link kênh)"
            htmlFor="tiktok-scraper-input"
            error={errorMsg || undefined}
          >
            <Textarea
              id="tiktok-scraper-input"
              rows={2}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Ví dụ: @megauriviu, @chanhbeauty..."
            />
          </Field>

          <div className="flex flex-col gap-2 lg:pt-6">
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
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-line bg-surface flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Avatar
                  name={activeResult.channelProfile.nickname}
                  src={activeResult.channelProfile.avatarUrl}
                  size={44}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
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

                  {activeResult.channelProfile.bio && (
                    <p className="text-xs text-ink-2 leading-relaxed">
                      {activeResult.channelProfile.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-2xs text-ink-3">
                    <span>
                      SĐT / Zalo:{' '}
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
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs tabular-nums shrink-0">
                <div>
                  <span className="text-ink-3 block text-2xs">Follower</span>
                  <strong className="text-ink">
                    {formatFollowers(activeResult.channelProfile.followers)}
                  </strong>
                </div>
                <div>
                  <span className="text-ink-3 block text-2xs">View TB</span>
                  <strong className="text-ink">
                    {formatNumber(activeResult.engagementMetrics.avgViews)}
                  </strong>
                </div>
                <div>
                  <span className="text-ink-3 block text-2xs">ER%</span>
                  <strong className="text-positive">
                    {activeResult.engagementMetrics.engagementRate}%
                  </strong>
                </div>
              </div>
            </div>

            <Panel
              flush
              title={`Video gần nhất trên kênh (${activeResult.recentVideos.length})`}
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
  );
};
