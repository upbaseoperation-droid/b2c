'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DataTable, EmptyState, Field, Input, Panel, PeriodPicker, Select, Status } from '../../ui';
import type { Column } from '../../ui';
import { formatDate, formatNumber, formatVnd } from '../../../lib/format';
import {
  SELF_ACCEPTANCE_LABEL,
  SELF_CTV_CONFIRM_LABEL,
  SELF_FORMAT_LABEL,
  SELF_PLATFORM_LABEL,
  SELF_STAGE_LABEL,
  selfJobHandoverPassed,
  selfJobStageOf,
  type SelfJobStage,
} from '../../../lib/selfChannelBoardRules';
import {
  buildSelfAirReportCsv,
  summarizeByPillar,
  type PillarSummary,
  type SelfAirReportResponse,
  type SelfAirReportRow,
} from '../../../lib/selfChannelAirReport';
import { useHubMonths, type HubJob, type HubPlanSummary } from './SelfChannelMonthPanels';

type Notify = (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;

const NO_PILLAR = 'Chưa gắn pillar';
const isActive = (j: HubJob) => j.lifecycleStatus !== 'CANCELLED';
const pillarOf = (j: { pillar: string }) => j.pillar.trim() || NO_PILLAR;

function Facet({ label, value, onChange, options, all = 'Tất cả' }: { label: string; value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <Field label={label} className="w-44">
      <Select value={value} onChange={e => onChange(e.target.value)} aria-label={label}>
        <option value="ALL">{all}</option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Field>
  );
}

const link = (url: string, text: string) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="text-accent underline">
      {text}
    </a>
  ) : (
    <span className="text-ink-3">—</span>
  );

/** Danh sách mọi video Self-channel trong tháng (qua mọi gian): lọc theo pillar, CTV, gian, bước, từ khóa. */
export function SelfChannelVideoListPanel({
  plans,
  jobs,
  loading,
  onOpenPlan,
}: {
  plans: HubPlanSummary[];
  jobs: HubJob[];
  loading: boolean;
  onOpenPlan: (planId: string, jobCode?: string) => void;
}) {
  const { months, month, setMonth } = useHubMonths(plans, jobs);
  const [store, setStore] = useState('ALL');
  const [pillar, setPillar] = useState('ALL');
  const [ctv, setCtv] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [q, setQ] = useState('');

  const monthJobs = useMemo(() => jobs.filter(j => j.month === month && isActive(j)), [jobs, month]);
  const stageOf = useMemo(() => new Map(monthJobs.map(j => [`${j.planId}:${j.id}`, selfJobStageOf(j)] as const)), [monthJobs]);

  const facets = useMemo(() => {
    const stores = new Set<string>();
    const pillars = new Set<string>();
    const ctvs = new Set<string>();
    for (const j of monthJobs) {
      stores.add(j.storeName);
      pillars.add(pillarOf(j));
      if (j.contributorName.trim()) ctvs.add(j.contributorName.trim());
    }
    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
    return { stores: sort(stores), pillars: sort(pillars), ctvs: sort(ctvs) };
  }, [monthJobs]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return monthJobs.filter(j => {
      if (store !== 'ALL' && j.storeName !== store) return false;
      if (pillar !== 'ALL' && pillarOf(j) !== pillar) return false;
      if (ctv !== 'ALL' && j.contributorName.trim() !== ctv) return false;
      if (stage !== 'ALL' && stageOf.get(`${j.planId}:${j.id}`) !== stage) return false;
      if (needle && ![j.code, j.productName, j.angle, j.pillar, j.contributorName, j.storeName].some(v => (v || '').toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [monthJobs, store, pillar, ctv, stage, q, stageOf]);

  const totals = useMemo(
    () => ({
      all: visible.length,
      aired: visible.filter(j => j.airedAt || j.airLink.trim()).length,
      accepted: visible.filter(j => j.acceptanceStatus === 'PASSED').length,
      waitingCtv: visible.filter(j => j.ctvConfirmStatus === 'ASSIGNED').length,
    }),
    [visible]
  );

  const byPillar = useMemo(() => {
    const map = new Map<string, { pillar: string; videos: number; aired: number; accepted: number }>();
    for (const j of visible) {
      const k = pillarOf(j);
      const cur = map.get(k) || { pillar: k, videos: 0, aired: 0, accepted: 0 };
      cur.videos += 1;
      if (j.airedAt || j.airLink.trim()) cur.aired += 1;
      if (j.acceptanceStatus === 'PASSED') cur.accepted += 1;
      map.set(k, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.videos - a.videos);
  }, [visible]);

  const columns: Column<HubJob>[] = [
    {
      key: 'code',
      header: 'Việc',
      render: j => (
        <div>
          <div className="font-medium text-ink tabular-nums">{j.code}</div>
          <div className="text-2xs text-ink-3">{j.storeName}</div>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Pillar / Yêu cầu',
      render: j => (
        <div className="max-w-xs text-xs">
          <div className="font-medium text-ink">{pillarOf(j)}</div>
          <div className="text-ink-2">{j.productName || '—'}{j.angle ? ` · ${j.angle}` : ''}</div>
          {j.hook && <div className="text-ink-3 truncate" title={j.hook}>Hook: {j.hook}</div>}
          {j.forbiddenClaims && <div className="text-critical truncate" title={j.forbiddenClaims}>Tránh: {j.forbiddenClaims}</div>}
        </div>
      ),
    },
    { key: 'format', header: 'Định dạng', render: j => `${SELF_FORMAT_LABEL[j.formatKey]} · ${SELF_PLATFORM_LABEL[j.publishPlatform]}` },
    {
      key: 'ctv',
      header: 'CTV',
      render: j =>
        j.productionMode === 'CTV_OUTSOURCE' ? (
          <div>
            <div className="text-ink">{j.contributorName || '—'}</div>
            {j.ctvConfirmStatus && j.ctvConfirmStatus !== 'CONFIRMED' && (
              <Status tone={j.ctvConfirmStatus === 'DECLINED' ? 'critical' : 'warning'}>{SELF_CTV_CONFIRM_LABEL[j.ctvConfirmStatus]}</Status>
            )}
          </div>
        ) : (
          <span className="text-ink-2">Nội bộ</span>
        ),
    },
    { key: 'stage', header: 'Bước', render: j => SELF_STAGE_LABEL[stageOf.get(`${j.planId}:${j.id}`) as SelfJobStage] },
    {
      key: 'links',
      header: 'Link',
      render: j => (
        <div className="text-xs space-y-0.5">
          <div>Nháp: {link(j.draftVideoUrl, 'Mở')}</div>
          <div>Đăng: {link(j.airLink, 'Mở')}</div>
        </div>
      ),
    },
    {
      key: 'accept',
      header: 'Nghiệm thu',
      render: j => (
        <div className="space-y-0.5">
          <Status tone={j.acceptanceStatus === 'PASSED' ? 'positive' : j.acceptanceStatus === 'PENDING' ? 'neutral' : 'warning'}>{SELF_ACCEPTANCE_LABEL[j.acceptanceStatus]}</Status>
          {selfJobHandoverPassed(j) && <Status tone="info">Đạt bàn giao</Status>}
          {j.bbntCode && <div className="text-2xs text-ink-3">{j.bbntCode}</div>}
        </div>
      ),
    },
    { key: 'deadline', header: 'Hạn đăng', render: j => (j.deadline ? formatDate(j.deadline) : '—') },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: j => (
        <Button size="sm" variant="ghost" onClick={() => onOpenPlan(j.planId, j.code)}>
          Mở
        </Button>
      ),
    },
  ];

  const pillarColumns: Column<{ pillar: string; videos: number; aired: number; accepted: number }>[] = [
    { key: 'p', header: 'Pillar', render: r => <span className="font-medium text-ink">{r.pillar}</span> },
    { key: 'v', header: 'Video', align: 'right', render: r => formatNumber(r.videos) },
    { key: 'a', header: 'Đã đăng', align: 'right', render: r => formatNumber(r.aired) },
    { key: 'k', header: 'Nghiệm thu đạt', align: 'right', render: r => formatNumber(r.accepted) },
  ];

  return (
    <div className="space-y-4">      <Panel
        title="Danh sách video trong tháng"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Facet label="Tháng" value={month} onChange={setMonth} options={months} all="Tháng gần nhất" />
            <Facet label="Gian hàng" value={store} onChange={setStore} options={facets.stores} />
            <Facet label="Pillar" value={pillar} onChange={setPillar} options={facets.pillars} />
            <Facet label="CTV" value={ctv} onChange={setCtv} options={facets.ctvs} />
            <Field label="Bước" className="w-48">
              <Select value={stage} onChange={e => setStage(e.target.value)} aria-label="Lọc theo bước">
                <option value="ALL">Tất cả</option>
                {(Object.keys(SELF_STAGE_LABEL) as SelfJobStage[]).map(k => (
                  <option key={k} value={k}>
                    {SELF_STAGE_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tìm" className="w-44">
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Mã việc, sản phẩm, CTV" />
            </Field>
          </div>
        }
        flush
      >
        <DataTable columns={columns} rows={visible} rowKey={j => `${j.planId}:${j.id}`} loading={loading} empty="Chưa có video nào khớp bộ lọc." />
      </Panel>
      <Panel title="Theo pillar" flush>
        <DataTable columns={pillarColumns} rows={byPillar} rowKey={r => r.pillar} loading={loading} empty="Chưa có video." />
      </Panel>
    </div>
  );
}

const money = (n: number | null | undefined) => (typeof n === 'number' ? formatVnd(n) : '—');
const count = (n: number | null | undefined) => (typeof n === 'number' ? formatNumber(n) : '—');

function downloadCsv(rows: SelfAirReportRow[], month: string) {
  const url = URL.createObjectURL(new Blob([buildSelfAirReportCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `bao-cao-air-self-channel-${month.replace(/\D/g, '')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Báo cáo air theo tháng: video đã đăng kèm số liệu từ Data Warehouse (khớp theo video_id). */
export function SelfChannelAirReportPanel({ onNotify }: { onNotify?: Notify }) {
  const [data, setData] = useState<SelfAirReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [pillar, setPillar] = useState('ALL');
  const [store, setStore] = useState('ALL');
  const [ctv, setCtv] = useState('ALL');

  const load = useCallback(
    async (m: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/self-channel-board/air-report${m ? `?month=${encodeURIComponent(m)}` : ''}`, { cache: 'no-store' });
        const body = (await res.json().catch(() => ({}))) as SelfAirReportResponse & { error?: string };
        if (!res.ok) {
          onNotify?.(body.error || 'Không tải được báo cáo air.', 'error');
          return;
        }
        setData(body);
        setMonth(body.month);
      } catch {
        onNotify?.('Lỗi mạng khi tải báo cáo air.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load('');
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const facets = useMemo(() => {
    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
    return {
      pillars: sort(new Set(rows.map(r => r.pillar.trim() || 'Chưa gắn pillar'))),
      stores: sort(new Set(rows.map(r => r.storeName))),
      ctvs: sort(new Set(rows.map(r => r.contributorName.trim()).filter(Boolean))),
    };
  }, [rows]);
  const visible = useMemo(
    () =>
      rows.filter(r => {
        if (pillar !== 'ALL' && (r.pillar.trim() || 'Chưa gắn pillar') !== pillar) return false;
        if (store !== 'ALL' && r.storeName !== store) return false;
        if (ctv !== 'ALL' && r.contributorName.trim() !== ctv) return false;
        return true;
      }),
    [rows, pillar, store, ctv]
  );
  const pillars = useMemo<PillarSummary[]>(() => summarizeByPillar(visible), [visible]);
  const totals = useMemo(() => {
    const dw = visible.filter(r => r.dw);
    return {
      videos: visible.length,
      withDw: dw.length,
      orders: dw.reduce((s, r) => s + (r.dw?.orders30d ?? 0), 0),
      gmv: dw.reduce((s, r) => s + (r.dw?.gmv30d ?? 0), 0),
    };
  }, [visible]);

  const columns: Column<SelfAirReportRow>[] = [
    {
      key: 'job',
      header: 'Việc',
      render: r => (
        <div>
          <div className="font-medium text-ink tabular-nums">{r.code}</div>
          <div className="text-2xs text-ink-3">{r.storeName}</div>
        </div>
      ),
    },
    { key: 'pillar', header: 'Pillar', render: r => r.pillar.trim() || 'Chưa gắn pillar' },
    { key: 'ctv', header: 'CTV', render: r => r.contributorName || 'Nội bộ' },
    { key: 'aired', header: 'Ngày đăng', render: r => (r.airedAt ? formatDate(r.airedAt) : '—') },
    { key: 'link', header: 'Link', render: r => link(r.airLink, r.videoId || 'Mở') },
    { key: 'v', header: 'View 14 / 30 ngày', align: 'right', render: r => (r.dw ? `${count(r.dw.views14d)} / ${count(r.dw.views30d)}` : r.viewsFromLink !== null ? `${count(r.viewsFromLink)} (link)` : '—') },
    { key: 'o', header: 'Đơn 14 / 30 ngày', align: 'right', render: r => (r.dw ? `${count(r.dw.orders14d)} / ${count(r.dw.orders30d)}` : '—') },
    { key: 'g', header: 'GMV 14 / 30 ngày', align: 'right', render: r => (r.dw ? `${money(r.dw.gmv14d)} / ${money(r.dw.gmv30d)}` : '—') },
    { key: 'r', header: 'ROI 14 / 30 ngày', align: 'right', render: r => (r.dw ? `${r.dw.roi14d?.toFixed(2) ?? '—'} / ${r.dw.roi30d?.toFixed(2) ?? '—'}` : '—') },
    { key: 'e', header: 'Like · Comment · Share', align: 'right', render: r => (r.dw ? `${count(r.dw.likes)} · ${count(r.dw.comments)} · ${count(r.dw.shares)}` : '—') },
    { key: 'sync', header: 'Cập nhật số', render: r => (r.dw?.syncedAt ? r.dw.syncedAt.slice(0, 16).replace('T', ' ') : '—') },
  ];

  const pillarColumns: Column<PillarSummary>[] = [
    { key: 'p', header: 'Pillar', render: r => <span className="font-medium text-ink">{r.pillar}</span> },
    { key: 'v', header: 'Video', align: 'right', render: r => formatNumber(r.videos) },
    { key: 'd', header: 'Có số Data Warehouse', align: 'right', render: r => formatNumber(r.withDw) },
    { key: 'vw', header: 'View 30 ngày', align: 'right', render: r => formatNumber(r.views30d) },
    { key: 'o', header: 'Đơn 30 ngày', align: 'right', render: r => formatNumber(r.orders30d) },
    { key: 'g', header: 'GMV 30 ngày', align: 'right', render: r => formatVnd(r.gmv30d) },
  ];

  return (
    <div className="space-y-4">
      {data && !data.dw.configured && <Status tone="warning">Chưa kết nối Data Warehouse (thiếu DW_API_BASE_URL / DW_API_TOKEN). Cột số liệu để trống.</Status>}
      {data?.dw.configured && !data.dw.ok && <Status tone="critical">{data.dw.error || 'Không lấy được số liệu từ Data Warehouse.'}</Status>}      <Panel
        title="Báo cáo air"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <PeriodPicker value={month} onChange={(m) => void load(m)} options={(data?.months || [])} />
            <Facet label="Pillar" value={pillar} onChange={setPillar} options={facets.pillars} />
            <Facet label="Gian hàng" value={store} onChange={setStore} options={facets.stores} />
            <Facet label="CTV" value={ctv} onChange={setCtv} options={facets.ctvs} />
            <Button size="sm" variant="secondary" onClick={() => void load(month)} disabled={loading}>
              Tải lại số liệu
            </Button>
            <Button size="sm" variant="secondary" disabled={visible.length === 0} onClick={() => downloadCsv(visible, month)}>
              Xuất CSV
            </Button>
          </div>
        }
        flush
      >
        {visible.length === 0 && !loading ? (
          <EmptyState title="Chưa có video đã đăng trong tháng này" />
        ) : (
          <DataTable columns={columns} rows={visible} rowKey={r => `${r.planId}:${r.code}`} loading={loading} empty="Chưa có video đã đăng." />
        )}
      </Panel>
      <Panel title="Theo pillar" flush>
        <DataTable columns={pillarColumns} rows={pillars} rowKey={r => r.pillar} loading={loading} empty="Chưa có dữ liệu." />
      </Panel>
    </div>
  );
}
