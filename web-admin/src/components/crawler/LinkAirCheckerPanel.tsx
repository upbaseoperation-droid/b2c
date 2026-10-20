'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, RotateCcw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { formatDate, formatNumber } from '../../lib/format';
import {
  buildLinkAirCsv,
  LINK_AIR_PLATFORM_LABEL,
  LINK_AIR_VERDICT_LABEL,
  splitLinkInput,
  splitTerms,
  type LinkAirCheckResponse,
  type LinkAirCheckStatus,
  type LinkAirExpectation,
  type LinkAirResult,
  type LinkAirVerdict,
} from '../../lib/linkAirCheck';
import {
  Button,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  Panel,
  PlatformLogo,
  Status,
  Textarea,
} from '../ui';
import type { Column, StatusTone } from '../ui';

const MAX_LINKS = 100;

const VERDICT_TONE: Record<LinkAirVerdict, StatusTone> = {
  PASS: 'positive',
  REVIEW: 'warning',
  FAIL: 'critical',
};

const CHECK_TONE: Record<LinkAirCheckStatus, string> = {
  PASS: 'text-positive',
  WARN: 'text-warning',
  FAIL: 'text-critical',
};

const CHECK_LABEL: Record<LinkAirCheckStatus, string> = {
  PASS: 'Đạt',
  WARN: 'Xem lại',
  FAIL: 'Không đạt',
};

type VerdictFilter = 'ALL' | LinkAirVerdict;

const num = (n: number | null) => (n === null ? '—' : formatNumber(n));

function issueSummary(r: LinkAirResult): string {
  const issue = r.checks.find((c) => c.status === 'FAIL') ?? r.checks.find((c) => c.status === 'WARN');
  return issue ? issue.detail : '';
}

function downloadCsv(results: LinkAirResult[]) {
  const blob = new Blob([buildLinkAirCsv(results)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kiem-tra-link-air-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface LinkAirRestorePayload {
  nonce: number;
  rawInput: string;
  results: LinkAirResult[];
  expect?: LinkAirExpectation;
}

export function LinkAirCheckerPanel({
  onNotify,
  historyButton,
  historyTable,
  restorePayload,
  onStartCheck,
  onSaveHistory,
}: {
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
    linkAirExpect: LinkAirExpectation;
  }) => void;
}) {
  const [linksText, setLinksText] = useState('');
  const [handle, setHandle] = useState('');
  const [airFrom, setAirFrom] = useState('');
  const [airTo, setAirTo] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [minViews, setMinViews] = useState('');
  const [requireProductLink, setRequireProductLink] = useState(false);
  const [expectedProductUrl, setExpectedProductUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LinkAirResult[]>([]);
  const [filter, setFilter] = useState<VerdictFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const [syncedNonce, setSyncedNonce] = useState<number>(0);
  if (restorePayload && restorePayload.nonce !== syncedNonce) {
    setSyncedNonce(restorePayload.nonce);
    setLinksText(restorePayload.rawInput || '');
    setResults(restorePayload.results || []);
    setFilter('ALL');
    setError('');
    const ex = restorePayload.expect;
    setHandle(ex?.handle || '');
    setAirFrom(ex?.airFrom || '');
    setAirTo(ex?.airTo || '');
    setHashtags((ex?.requiredHashtags || []).join(', '));
    setKeywords((ex?.requiredKeywords || []).join(', '));
    setMinViews(ex?.minViews ? String(ex.minViews) : '');
    setRequireProductLink(Boolean(ex?.requireProductLink));
    setExpectedProductUrl(ex?.expectedProductUrl || '');
  }

  const links = useMemo(() => splitLinkInput(linksText), [linksText]);
  const tooMany = links.length > MAX_LINKS;

  const counts = useMemo(
    () => ({
      ALL: results.length,
      PASS: results.filter((r) => r.verdict === 'PASS').length,
      REVIEW: results.filter((r) => r.verdict === 'REVIEW').length,
      FAIL: results.filter((r) => r.verdict === 'FAIL').length,
    }),
    [results]
  );
  const visible = filter === 'ALL' ? results : results.filter((r) => r.verdict === filter);
  const opened = results.find((r) => r.inputUrl === openKey) ?? null;

  const runCheck = async () => {
    if (links.length === 0 || tooMany) return;
    const expect: LinkAirExpectation = {
      handle: handle.trim() || undefined,
      airFrom: airFrom || undefined,
      airTo: airTo || undefined,
      requiredHashtags: splitTerms(hashtags),
      requiredKeywords: splitTerms(keywords),
      requireProductLink: requireProductLink || Boolean(expectedProductUrl.trim()),
      expectedProductUrl: expectedProductUrl.trim() || undefined,
      minViews: Number(minViews) > 0 ? Number(minViews) : undefined,
    };
    onStartCheck?.();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/integrations/link-air-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links, expect }),
      });
      const data: LinkAirCheckResponse = await res.json();
      if (!res.ok || !data.success || !data.results) {
        setError(data.message || 'Không kiểm tra được danh sách link. Thử lại sau.');
        return;
      }
      setResults(data.results);
      setFilter('ALL');
      const s = data.summary;
      onNotify?.(
        s ? `Đã kiểm tra ${s.total} link: ${s.pass} đạt, ${s.review} cần xem lại, ${s.fail} không đạt` : `Đã kiểm tra ${data.results.length} link`,
        s && s.fail > 0 ? 'warning' : 'success'
      );

      if (data.results.length > 0 && onSaveHistory) {
        const firstAuthor = data.results[0]?.author?.handle
          ? `@${data.results[0].author.handle}`
          : handle.trim() || 'Đa kênh';
        onSaveHistory({
          rawInput: links.join('\n'),
          queryKey: `${firstAuthor}-${links.length}-${links[0]?.slice(-12) || ''}`.toLowerCase(),
          queryLabel: `Nghiệm thu ${data.results.length} link air (${firstAuthor})`,
          linkAirResults: data.results,
          linkAirExpect: expect,
        });
      }
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLinksText('');
    setHandle('');
    setAirFrom('');
    setAirTo('');
    setHashtags('');
    setKeywords('');
    setMinViews('');
    setRequireProductLink(false);
    setExpectedProductUrl('');
    setError('');
    setResults([]);
  };

  const columns: Column<LinkAirResult>[] = [
    {
      key: 'post',
      header: 'Bài đăng',
      render: (r) => (
        <div className="flex items-start gap-2 min-w-0">
          {r.platform ? <PlatformLogo platform={r.platform.toUpperCase()} className="w-4 h-4 mt-0.5 shrink-0" /> : null}
          <div className="min-w-0">
            <p className="text-ink truncate max-w-[260px]">
              {r.author.handle ? `@${r.author.handle}` : r.author.name || (r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : 'Không rõ nền tảng')}
            </p>
            <p className="text-2xs text-ink-3 truncate max-w-[260px]" title={r.inputUrl}>
              {r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : r.inputUrl}
              {r.contentId ? ` · ${r.contentId}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'air',
      header: 'Ngày air',
      render: (r) => (r.publishedAt ? formatDate(r.publishedAt) : <span className="text-ink-3">—</span>),
    },
    { key: 'views', header: 'View', align: 'right', render: (r) => num(r.metrics.views) },
    { key: 'likes', header: 'Like', align: 'right', render: (r) => num(r.metrics.likes) },
    { key: 'comments', header: 'Bình luận', align: 'right', render: (r) => num(r.metrics.comments) },
    {
      key: 'cart',
      header: 'Giỏ hàng / Link SP',
      render: (r) => {
        const cartMatchCheck = r.checks.find((c) => c.key === 'cart_link_match');
        if (r.hasProductLink === null) {
          return <span className="text-ink-3">—</span>;
        }
        if (!r.hasProductLink) {
          return (
            <div className="space-y-0.5">
              <span className="text-2xs text-ink-3 block">Chưa gắn giỏ</span>
              {cartMatchCheck && (
                <span className="text-2xs text-critical font-semibold block">
                  ✕ Thiếu link giỏ mẫu
                </span>
              )}
            </div>
          );
        }
        const extraCount = (r.cartProducts?.length ?? 0) > 1 ? (r.cartProducts?.length ?? 1) - 1 : 0;
        return (
          <div className="min-w-0 max-w-[230px] space-y-0.5">
            <p className="text-xs text-ink truncate" title={r.productTitle || 'Có gắn giỏ hàng'}>
              {r.productTitle || 'Có gắn giỏ hàng'}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {r.productUrl ? (
                <a
                  href={r.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                >
                  <ShoppingBag className="w-3 h-3 shrink-0" />
                  <span>Link giỏ hàng</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              ) : (
                <span className="text-2xs text-positive font-medium">Đã gắn giỏ</span>
              )}
              {extraCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-accent-soft text-accent text-2xs font-semibold">
                  +{extraCount} SP
                </span>
              )}
            </div>
            {cartMatchCheck && (
              <span
                className={`text-2xs font-semibold block ${
                  cartMatchCheck.status === 'PASS' ? 'text-positive' : 'text-critical'
                }`}
              >
                {cartMatchCheck.status === 'PASS'
                  ? '✓ Khớp link giỏ mẫu'
                  : '✕ Lệch link giỏ mẫu'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'verdict',
      header: 'Kết luận',
      render: (r) => <Status tone={VERDICT_TONE[r.verdict]}>{LINK_AIR_VERDICT_LABEL[r.verdict]}</Status>,
    },
    {
      key: 'issue',
      header: 'Cần chú ý',
      render: (r) => <span className="text-2xs text-ink-2 line-clamp-2 max-w-[340px]">{issueSummary(r) || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <Panel flush>
        <div
          className={`px-3.5 py-2.5 bg-surface space-y-2.5 ${
            Boolean(historyTable) || results.length > 0 || loading ? 'border-b border-line' : ''
          }`}
        >
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
            <div>
              <Textarea
                id="link-air-input"
                aria-label={`Link air (${links.length}/${MAX_LINKS})`}
                rows={3}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder={`Dán danh sách link TikTok, Shopee Video, Facebook, Instagram (${links.length}/${MAX_LINKS} link - mỗi dòng 1 link)...`}
                className="font-code text-xs"
              />
              {tooMany && (
                <p className="mt-1 text-2xs text-critical">
                  Tối đa {MAX_LINKS} link mỗi lần. Bớt {links.length - MAX_LINKS} link rồi kiểm tra lại.
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                id="link-air-handle"
                aria-label="Kênh KOC"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Kênh KOC (@handle)"
                className="h-8 text-xs"
              />
              <Input
                id="link-air-views"
                aria-label="View tối thiểu"
                type="number"
                min={0}
                inputMode="numeric"
                value={minViews}
                onChange={(e) => setMinViews(e.target.value)}
                placeholder="View tối thiểu"
                className="h-8 text-xs"
              />
              <Input
                id="link-air-hashtags"
                aria-label="Hashtag bắt buộc"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Hashtag (#tag1, #tag2)"
                className="h-8 text-xs"
              />
              <Input
                id="link-air-from"
                aria-label="Air từ ngày"
                type="date"
                value={airFrom}
                onChange={(e) => setAirFrom(e.target.value)}
                title="Air từ ngày"
                className="h-8 text-xs"
              />
              <Input
                id="link-air-to"
                aria-label="Đến ngày"
                type="date"
                value={airTo}
                onChange={(e) => setAirTo(e.target.value)}
                title="Air đến ngày"
                className="h-8 text-xs"
              />
              <Input
                id="link-air-keywords"
                aria-label="Brand / key message"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Brand / từ khoá bắt buộc"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={requireProductLink || Boolean(expectedProductUrl.trim())}
                  onChange={(e) => setRequireProductLink(e.target.checked)}
                  className="w-3.5 h-3.5 accent-(--color-primary)"
                />
                Bắt buộc gắn giỏ hàng
              </label>

              <div className="flex-1 min-w-[220px] max-w-[420px]">
                <Input
                  id="link-air-expected-cart-url"
                  aria-label="Link giỏ hàng mẫu đối chiếu"
                  value={expectedProductUrl}
                  onChange={(e) => setExpectedProductUrl(e.target.value)}
                  placeholder="Dán link giỏ hàng mẫu hoặc mã SP để đối chiếu..."
                  className="h-8 text-xs font-code"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {error && <span className="text-2xs text-critical">{error}</span>}
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetForm} disabled={loading}>
                Xoá nhập
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={ShieldCheck}
                onClick={runCheck}
                disabled={loading || links.length === 0 || tooMany}
              >
                {loading ? `Đang kiểm tra ${links.length} link…` : `Kiểm tra link (${links.length})`}
              </Button>
              {historyButton}
            </div>
          </div>
        </div>

        {historyTable ? (
          historyTable
        ) : (results.length > 0 || loading) ? (
          <div>
            <div className="px-3.5 py-2 border-b border-line bg-sunken/30 flex flex-wrap items-center justify-between gap-2">
              <FilterBar
                chips={
                  <Chips<VerdictFilter>
                    label="Kết luận"
                    value={filter}
                    onChange={setFilter}
                    items={[
                      { key: 'ALL', label: 'Tất cả', count: counts.ALL },
                      { key: 'FAIL', label: 'Không đạt', count: counts.FAIL },
                      { key: 'REVIEW', label: 'Cần xem lại', count: counts.REVIEW },
                      { key: 'PASS', label: 'Đạt', count: counts.PASS },
                    ]}
                  />
                }
              />
              <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCsv(visible)} disabled={visible.length === 0}>
                Tải CSV ({visible.length})
              </Button>
            </div>
            <DataTable
              rows={visible}
              columns={columns}
              rowKey={(r) => r.inputUrl}
              loading={loading}
              onRowClick={(r) => setOpenKey(r.inputUrl)}
              empty={<EmptyState title="Không có link nào ở nhóm này." />}
            />
          </div>
        ) : null}
      </Panel>

      <LinkAirDetailModal result={opened} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function LinkAirDetailModal({ result, onClose }: { result: LinkAirResult | null; onClose: () => void }) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  if (!result) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const r = result;
  const platformLabel = r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : 'Không rõ nền tảng';
  const metrics: Array<[string, number | null]> = [
    ['View', r.metrics.views],
    ['Like', r.metrics.likes],
    ['Bình luận', r.metrics.comments],
    ['Chia sẻ', r.metrics.shares],
    ['Lưu', r.metrics.saves],
  ];

  const cartItems =
    r.cartProducts && r.cartProducts.length > 0
      ? r.cartProducts
      : r.hasProductLink && (r.productUrl || r.productTitle)
      ? [
          {
            productId: r.productId || '',
            sellerId: r.sellerId || undefined,
            title: r.productTitle || 'Sản phẩm gắn trong giỏ hàng',
            productUrl: r.productUrl || '',
          },
        ]
      : [];

  const copyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 2000);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Kết quả kiểm tra · ${r.author.handle ? `@${r.author.handle}` : platformLabel}`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Status tone={VERDICT_TONE[r.verdict]}>{LINK_AIR_VERDICT_LABEL[r.verdict]}</Status>
          <span className="text-2xs text-ink-3">
            {platformLabel}
            {r.publishedAt ? ` · Air ${formatDate(r.publishedAt)}` : ''}
            {` · Kiểm tra ${formatDate(r.fetchedAt)}`}
          </span>
          {r.canonicalUrl && (
            <a
              href={r.canonicalUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
            >
              Mở bài đăng <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
          )}
        </div>

        <section className="grid gap-2">
          <h4 className="text-sm font-semibold text-ink">Điều kiện nghiệm thu</h4>
          <ul className="grid gap-1.5">
            {r.checks.map((c) => (
              <li key={c.key} className="grid grid-cols-1 sm:grid-cols-[88px_150px_minmax(0,1fr)] gap-1 sm:gap-2 text-[13px]">
                <span className={`font-medium ${CHECK_TONE[c.status]}`}>{CHECK_LABEL[c.status]}</span>
                <span className="text-ink">{c.label}</span>
                <span className="text-ink-2 break-all">{c.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {(r.hasProductLink !== null || cartItems.length > 0) && (
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink inline-flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-accent" />
                <span>Giỏ hàng & Link sản phẩm gắn kèm</span>
              </h4>
              {r.hasProductLink ? (
                <Status tone="positive">
                  Có gắn giỏ ({cartItems.length > 0 ? `${cartItems.length} SP` : 'Đã xác nhận'})
                </Status>
              ) : (
                <Status tone="neutral">Chưa gắn giỏ hàng</Status>
              )}
            </div>

            {cartItems.length > 0 ? (
              <div className="grid gap-2">
                {cartItems.map((item, idx) => (
                  <div
                    key={item.productId || item.productUrl || idx}
                    className="p-2.5 rounded-xl border border-line bg-surface-2/60 grid gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-ink leading-snug">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-2xs text-ink-3 font-code">
                          {item.anchorKeyword && (
                            <span className="px-1.5 py-0.5 rounded bg-accent-soft/50 text-accent font-sans font-medium">
                              Nhãn giỏ: &ldquo;{item.anchorKeyword}&rdquo;
                            </span>
                          )}
                          {item.productId && <span>Mã SP: {item.productId}</span>}
                          {item.sellerId && <span>Mã Shop: {item.sellerId}</span>}
                        </div>
                      </div>
                      {item.productUrl && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={copiedUrl === item.productUrl ? Check : Copy}
                            onClick={() => copyLink(item.productUrl)}
                          >
                            {copiedUrl === item.productUrl ? 'Đã chép' : 'Chép link'}
                          </Button>
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90"
                          >
                            <span>Mở giỏ hàng</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                    {item.productUrl && (
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-2xs font-code text-accent hover:underline break-all"
                      >
                        {item.productUrl}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : r.hasProductLink ? (
              <p className="text-xs text-ink-2">
                Bài đăng có bật cờ gắn giỏ hàng thương mại điện tử nhưng nền tảng không công khai đường dẫn chi tiết trên bản web.
              </p>
            ) : null}
          </section>
        )}

        {r.status === 'LIVE' && (
          <section className="grid gap-2">
            <h4 className="text-sm font-semibold text-ink">Số liệu công khai</h4>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-line border border-line rounded-xl overflow-hidden">
              {metrics.map(([label, value]) => (
                <div key={label} className="bg-surface px-3 py-2.5 grid gap-0.5">
                  <dt className="text-2xs text-ink-3">{label}</dt>
                  <dd className="text-sm font-semibold text-ink tabular-nums">{num(value)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-2xs text-ink-3">
              Kênh: {r.author.name || '—'}
              {r.author.followers !== null ? ` · ${formatNumber(r.author.followers)} follower` : ''}
              {r.hasProductLink === null ? '' : r.hasProductLink ? ` · Có gắn sản phẩm${r.productTitle ? `: ${r.productTitle}` : ''}` : ' · Không gắn sản phẩm'}
            </p>
          </section>
        )}

        {r.caption && (
          <section className="grid gap-2">
            <h4 className="text-sm font-semibold text-ink">Caption</h4>
            <p className="text-[13px] text-ink-2 whitespace-pre-line max-h-40 overflow-y-auto">{r.caption}</p>
          </section>
        )}

        {r.limitations.length > 0 && (
          <section className="grid gap-1">
            <h4 className="text-sm font-semibold text-ink">Giới hạn của {platformLabel}</h4>
            <ul className="list-disc pl-5 text-2xs text-ink-3 grid gap-0.5">
              {r.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-2xs text-ink-3 break-all">Link đã nhập: {r.inputUrl}</p>
      </div>
    </Modal>
  );
}
