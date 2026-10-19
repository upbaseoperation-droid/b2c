'use client';

import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, RotateCcw, ShieldCheck } from 'lucide-react';
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

export function LinkAirCheckerPanel({
  onNotify,
}: {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}) {
  const [linksText, setLinksText] = useState('');
  const [handle, setHandle] = useState('');
  const [airFrom, setAirFrom] = useState('');
  const [airTo, setAirTo] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [minViews, setMinViews] = useState('');
  const [requireProductLink, setRequireProductLink] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LinkAirResult[]>([]);
  const [filter, setFilter] = useState<VerdictFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

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
      requireProductLink,
      minViews: Number(minViews) > 0 ? Number(minViews) : undefined,
    };
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
    setError('');
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
      <div className="px-3.5 py-2.5 rounded-xl border border-line bg-surface space-y-2.5">
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
          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requireProductLink}
              onChange={(e) => setRequireProductLink(e.target.checked)}
              className="w-3.5 h-3.5 accent-(--color-primary)"
            />
            Bắt buộc gắn giỏ hàng / link sản phẩm
          </label>

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
          </div>
        </div>
      </div>

      {(results.length > 0 || loading) && (
        <Panel
          title={`Kết quả kiểm tra (${visible.length}/${results.length})`}
          flush
          actions={
            <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCsv(visible)} disabled={visible.length === 0}>
              Tải CSV
            </Button>
          }
        >
          <div className="px-4 py-2.5 border-b border-line">
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
          </div>
          <DataTable
            rows={visible}
            columns={columns}
            rowKey={(r) => r.inputUrl}
            loading={loading}
            onRowClick={(r) => setOpenKey(r.inputUrl)}
            empty={<EmptyState title="Không có link nào ở nhóm này." />}
          />
        </Panel>
      )}

      <LinkAirDetailModal result={opened} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function LinkAirDetailModal({ result, onClose }: { result: LinkAirResult | null; onClose: () => void }) {
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
              <li key={c.key} className="grid grid-cols-[88px_150px_minmax(0,1fr)] gap-2 text-[13px]">
                <span className={`font-medium ${CHECK_TONE[c.status]}`}>{CHECK_LABEL[c.status]}</span>
                <span className="text-ink">{c.label}</span>
                <span className="text-ink-2">{c.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {r.status === 'LIVE' && (
          <section className="grid gap-2">
            <h4 className="text-sm font-semibold text-ink">Số liệu công khai</h4>
            <dl className="grid grid-cols-5 gap-px bg-line border border-line rounded-xl overflow-hidden">
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
