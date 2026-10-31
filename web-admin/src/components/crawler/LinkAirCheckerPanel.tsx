'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Play,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { formatDate, formatNumber, getVietnamDateYmd } from '../../lib/format';
import {
  buildLinkAirCsv,
  LINK_AIR_PLATFORM_LABEL,
  splitLinkInput,
  type LinkAirCheckResponse,
  type LinkAirExpectation,
  type LinkAirResult,
} from '../../lib/linkAirCheck';
import {
  Button,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  Panel,
  PlatformLogo,
  Status,
  Textarea,
} from '../ui';
import type { Column } from '../ui';

const MAX_LINKS = 100;
const num = (n: number | null) => (n === null || n === undefined ? '—' : formatNumber(n));

function downloadCsv(results: LinkAirResult[]) {
  const blob = new Blob([buildLinkAirCsv(results)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kiem-tra-link-video-${getVietnamDateYmd()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface LinkAirRestorePayload {
  nonce: number;
  rawInput: string;
  results: LinkAirResult[];
  expect?: LinkAirExpectation;
}

export interface LinkAirCheckerPanelProps {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  historyButton?: React.ReactNode;
  historyTable?: React.ReactNode;
  restorePayload?: LinkAirRestorePayload | null;
  onStartCheck?: () => void;
  onSaveHistory?: (payload: {
    rawInput: string;
    queryKey: string;
    queryLabel: string;
    linkAirResults: LinkAirResult[];
    linkAirExpect?: LinkAirExpectation;
  }) => void;
}

export function LinkAirCheckerPanel({
  onNotify,
  historyButton,
  historyTable,
  restorePayload,
  onStartCheck,
  onSaveHistory,
}: LinkAirCheckerPanelProps) {
  const [linksText, setLinksText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LinkAirResult[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [syncedNonce, setSyncedNonce] = useState<number>(0);

  // Restore payload if arriving from history
  if (restorePayload && restorePayload.nonce !== syncedNonce) {
    setSyncedNonce(restorePayload.nonce);
    setLinksText(restorePayload.rawInput || '');
    setResults(restorePayload.results || []);
    setError('');
  }

  const links = useMemo(() => splitLinkInput(linksText), [linksText]);
  const tooMany = links.length > MAX_LINKS;

  const runCheck = async () => {
    if (links.length === 0 || tooMany) return;
    onStartCheck?.();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      });
      const data: LinkAirCheckResponse = await res.json();
      if (!res.ok || !data.success || !data.results) {
        setError(data.message || 'Không kiểm tra được danh sách link. Thử lại sau.');
        return;
      }
      setResults(data.results);
      onNotify?.(`Đã kiểm tra xong ${data.results.length} link video`, 'success');

      if (data.results.length > 0 && onSaveHistory) {
        const firstAuthor = data.results[0]?.author?.handle
          ? `@${data.results[0].author.handle}`
          : 'Đa kênh';
        onSaveHistory({
          rawInput: links.join('\n'),
          queryKey: `${firstAuthor}-${links.length}-${links[0]?.slice(-12) || ''}`.toLowerCase(),
          queryLabel: `Kiểm tra ${data.results.length} link (${firstAuthor})`,
          linkAirResults: data.results,
        });
      }
    } catch {
      setError('Không kết nối được máy chủ kiểm tra link. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLinksText('');
    setError('');
    setResults([]);
  };

  const opened = useMemo(
    () => results.find((r) => r.inputUrl === openKey) ?? null,
    [results, openKey]
  );

  const columns: Column<LinkAirResult>[] = [
    {
      key: 'post',
      header: 'Bài đăng & Kênh',
      render: (r) => (
        <div className="flex items-start gap-2 min-w-0">
          {r.platform ? (
            <PlatformLogo platform={r.platform.toUpperCase()} className="w-4 h-4 mt-0.5 shrink-0" />
          ) : null}
          <div className="min-w-0">
            <p className="text-ink font-semibold truncate max-w-[280px]">
              {r.author.handle
                ? `@${r.author.handle}`
                : r.author.name || (r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : 'Kênh video')}
            </p>
            <p className="text-2xs text-ink-3 truncate max-w-[280px]" title={r.inputUrl}>
              {r.inputUrl}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'air',
      header: 'Ngày đăng',
      render: (r) =>
        r.airedAtVn ? (
          <span className="font-mono text-xs text-ink">{r.airedAtVn}</span>
        ) : r.publishedAt ? (
          formatDate(r.publishedAt)
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    { key: 'views', header: 'Lượt xem', align: 'right', render: (r) => num(r.metrics.views) },
    { key: 'likes', header: 'Lượt thích', align: 'right', render: (r) => num(r.metrics.likes) },
    { key: 'comments', header: 'Bình luận', align: 'right', render: (r) => num(r.metrics.comments) },
    {
      key: 'cart',
      header: 'Giỏ hàng / Sản phẩm',
      render: (r) => {
        if (!r.hasProductLink) {
          return <span className="text-2xs text-ink-3">Chưa gắn giỏ</span>;
        }
        const extraCount = (r.cartProducts?.length ?? 0) > 1 ? (r.cartProducts?.length ?? 1) - 1 : 0;
        return (
          <div className="min-w-0 max-w-[220px] space-y-0.5">
            <p className="text-xs text-ink truncate" title={r.productTitle || 'Có gắn giỏ hàng'}>
              {r.productTitle || 'Có gắn giỏ hàng'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {r.productUrl ? (
                <a
                  href={r.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                >
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>Xem SP</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              ) : (
                <span className="text-2xs text-positive font-medium">Đã gắn giỏ</span>
              )}
              {extraCount > 0 && (
                <span className="px-2 py-0.2 rounded bg-accent-soft text-accent text-2xs font-semibold">
                  +{extraCount} SP
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái link',
      align: 'center',
      render: (r) => {
        const isError = r.status === 'ERROR' || r.status === 'INVALID_LINK' || r.status === 'UNAVAILABLE';
        return (
          <Status tone={isError ? 'critical' : 'positive'}>
            {isError ? 'Lỗi link' : 'Hoạt động'}
          </Status>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {r.canonicalUrl && (
            <a
              href={r.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded hover:bg-canvas text-ink-3 hover:text-accent transition-colors"
              title="Mở link trên sàn / mạng xã hội"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* KHỐI NHẬP LINK ĐƠN GIẢN (TEST LINK ONLY) */}
      <Panel flush>
        <div className="p-4 bg-surface space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Kiểm tra link video (TikTok, Shopee Video, Facebook, Instagram)
              </h3>
              <p className="text-2xs text-ink-3 mt-0.5">
                Nhập danh sách link video để cào dữ liệu nhanh: trạng thái link, lượt xem, thích, bình luận và thông tin giỏ hàng.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {historyButton}
              {results.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() => downloadCsv(results)}
                >
                  Xuất CSV ({results.length})
                </Button>
              )}
            </div>
          </div>

          <div>
            <Textarea
              id="link-air-input"
              aria-label={`Link video (${links.length}/${MAX_LINKS})`}
              rows={3}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder={`Dán danh sách link video cần kiểm tra (mỗi dòng 1 link, tối đa ${MAX_LINKS} link)...`}
              className="font-mono text-xs w-full"
            />
            {tooMany && (
              <p className="mt-1 text-2xs text-critical">
                Tối đa {MAX_LINKS} link mỗi lần. Vui lòng bớt {links.length - MAX_LINKS} link rồi thử lại.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/60">
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <span>Đã nhập: <strong className="text-ink">{links.length} link</strong></span>
              {error && <span className="text-critical font-medium ml-2">{error}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={resetForm}
                disabled={loading || (!linksText && results.length === 0)}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                onClick={runCheck}
                disabled={loading || links.length === 0 || tooMany}
              >
                {loading ? 'Đang kiểm tra...' : 'Kiểm tra link'}
              </Button>
            </div>
          </div>
        </div>

        {/* LỊCH SỬ TUẦN */}
        {historyTable}

        {/* BẢNG KẾT QUẢ TEST */}
        {results.length > 0 && (
          <DataTable<LinkAirResult>
            rows={results}
            columns={columns}
            rowKey={(r) => r.inputUrl}
            onRowClick={(r) => setOpenKey(r.inputUrl)}
          />
        )}
      </Panel>

      {/* MODAL CHI TIẾT VIDEO (THÔNG TIN THỰC TẾ, KHÔNG CÓ BBNT HAY NGHIỆM THU) */}
      {opened && (
        <LinkAirDetailModal
          result={opened}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  );
}

function LinkAirDetailModal({
  result: r,
  onClose,
}: {
  result: LinkAirResult;
  onClose: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const platformLabel = r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : 'Video';
  const cartItems = r.cartProducts || [];

  const copyLink = (url: string) => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Thông tin video · ${r.author.handle ? `@${r.author.handle}` : platformLabel}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            size="sm"
            icon={copiedUrl ? Check : Copy}
            onClick={() => copyLink(r.canonicalUrl || r.inputUrl)}
          >
            {copiedUrl ? 'Đã sao chép link' : 'Sao chép link'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
            {r.canonicalUrl && (
              <Button
                variant="primary"
                size="sm"
                icon={ExternalLink}
                onClick={() => {
                  const targetUrl = r.canonicalUrl;
                  if (targetUrl) window.open(targetUrl, '_blank');
                }}
              >
                Mở bài đăng
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Header thông tin kênh & thời gian */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-surface-2 border border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink">
                {r.author.handle ? `@${r.author.handle}` : r.author.name || platformLabel}
              </span>
              <Status tone={r.status === 'ERROR' || r.status === 'INVALID_LINK' || r.status === 'UNAVAILABLE' ? 'critical' : 'positive'}>
                {r.status === 'ERROR' || r.status === 'INVALID_LINK' || r.status === 'UNAVAILABLE' ? 'Lỗi link' : 'Hoạt động'}
              </Status>
            </div>
            <p className="text-2xs text-ink-3 mt-0.5">
              {platformLabel} {r.publishedAt ? `· Đăng ngày ${formatDate(r.publishedAt)}` : ''} · Kiểm tra lúc {formatDate(r.fetchedAt)}
            </p>
          </div>
        </div>

        {/* Lưới 4 chỉ số tương tác */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface border border-line text-center">
            <span className="text-2xs text-ink-3 block">Lượt xem</span>
            <span className="text-base font-semibold text-ink tabular-nums">{num(r.metrics.views)}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-line text-center">
            <span className="text-2xs text-ink-3 block">Lượt thích</span>
            <span className="text-base font-semibold text-ink tabular-nums">{num(r.metrics.likes)}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-line text-center">
            <span className="text-2xs text-ink-3 block">Bình luận</span>
            <span className="text-base font-semibold text-ink tabular-nums">{num(r.metrics.comments)}</span>
          </div>
          <div className="p-3 rounded-lg bg-surface border border-line text-center">
            <span className="text-2xs text-ink-3 block">Chia sẻ</span>
            <span className="text-base font-semibold text-ink tabular-nums">{num(r.metrics.shares)}</span>
          </div>
        </div>

        {/* Nội dung Caption / Mô tả */}
        {r.caption && (
          <div className="space-y-1">
            <h4 className="font-semibold text-ink">Nội dung bài đăng</h4>
            <div className="p-3 rounded-lg bg-surface border border-line text-ink-2 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {r.caption}
            </div>
          </div>
        )}

        {/* Thông tin Giỏ hàng & Sản phẩm */}
        <div className="space-y-2">
          <h4 className="font-semibold text-ink flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-accent" />
            <span>Giỏ hàng gắn kèm ({cartItems.length > 0 ? `${cartItems.length} sản phẩm` : r.hasProductLink ? 'Có gắn giỏ' : 'Chưa gắn giỏ'})</span>
          </h4>

          {cartItems.length > 0 ? (
            <div className="space-y-2">
              {cartItems.map((item, idx) => (
                <div
                  key={item.productId || item.productUrl || idx}
                  className="p-3 rounded-lg border border-line bg-surface flex items-start gap-3"
                >
                  {item.coverUrl && (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover border border-line shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-ink leading-snug">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3">
                      {item.anchorKeyword && (
                        <span className="px-2 py-0.5 rounded bg-accent-soft text-accent font-medium">
                          Nhãn: &ldquo;{item.anchorKeyword}&rdquo;
                        </span>
                      )}
                      {item.categoryName && <span>{item.categoryName}</span>}
                      {item.productId && <span>Mã SP: {item.productId}</span>}
                    </div>
                  </div>
                  {item.productUrl && (
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline text-2xs inline-flex items-center gap-1 shrink-0 pt-1"
                    >
                      <span>Xem giỏ</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xs text-ink-3 p-3 bg-surface rounded-lg border border-line">
              {r.hasProductLink ? 'Video có gắn giỏ hàng nhưng không lấy được chi tiết từng sản phẩm.' : 'Video không có liên kết giỏ hàng sàn.'}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
