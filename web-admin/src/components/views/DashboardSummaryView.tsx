'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarRange, Gauge, GitFork, LineChart, ListChecks } from 'lucide-react';
import {
  Button,
  DataTable,
  Panel,
  Person,
  Progress,
  Segmented,
  Sparkline,
  Stat,
  StatRow,
  Status,
  TrendChart,
} from '../ui';
import type { Column, TrendPoint } from '../ui';
import { StorePortfolioItem } from '../../lib/types';
import { formatNumber, formatPercent, formatVndShort, getVietnamDateYmd } from '../../lib/format';
import { B2cBookedVideoRecord } from '../../lib/b2cAnalyticsDataset';
import { B2C_DAILY_AIR_PULSE_OCT_2026 } from '../../lib/b2cWeeklyAirSyncDataset';

type Grain = 'DAY' | 'WEEK';
type ChartMetric = 'AIR' | 'COST' | 'GMV';
type ChartCompare = 'NONE' | 'PLAN';

interface Bucket {
  key: string;
  label: string;
  videos: number;
  gmv: number;
  cost: number;
  orders: number;
}

const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Gộp video booking theo ngày air (lấp ngày trống bằng 0 trong tháng gần nhất) hoặc theo tuần. */
function bucketVideos(videos: B2cBookedVideoRecord[], grain: Grain): Bucket[] {
  const dated = videos.filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.airDate));
  if (dated.length === 0) return [];
  const map = new Map<string, Bucket>();
  const add = (key: string, label: string, v: B2cBookedVideoRecord) => {
    const b = map.get(key) ?? { key, label, videos: 0, gmv: 0, cost: 0, orders: 0 };
    b.videos += 1;
    b.gmv += v.sellerGmv || 0;
    b.cost += v.cost || 0;
    b.orders += v.sellerOrders || 0;
    map.set(key, b);
  };

  if (grain === 'WEEK') {
    dated.forEach((v) => {
      const code = v.weekLabel.split(' ')[0] || v.weekLabel;
      add(code, code, v);
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
  }

  const last = dated.reduce((m, v) => (v.airDate > m ? v.airDate : m), dated[0].airDate);
  const monthStart = `${last.slice(0, 7)}-01`;
  dated.filter((v) => v.airDate >= monthStart).forEach((v) => add(v.airDate, ddmm(v.airDate), v));
  const out: Bucket[] = [];
  for (let d = monthStart; d <= last; d = addDays(d, 1)) {
    out.push(map.get(d) ?? { key: d, label: ddmm(d), videos: 0, gmv: 0, cost: 0, orders: 0 });
  }
  return out;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

interface TreeMetric {
  label: string;
  values: (number | null)[];
  format: (n: number) => string;
  /** Chỉ số càng thấp càng tốt (chi phí): tăng tô đỏ. */
  invert?: boolean;
  /** Tỷ lệ (%): mức chênh tính theo điểm %, không theo %. */
  isRate?: boolean;
}

function MetricNode({ metric, periodLabel, root = false }: { metric: TreeMetric; periodLabel: string; root?: boolean }) {
  const n = metric.values.length;
  const cur = n > 0 ? metric.values[n - 1] : null;
  const prev = n > 1 ? metric.values[n - 2] : null;
  const delta = cur !== null && prev !== null && prev !== 0 ? (metric.isRate ? cur - prev : (cur - prev) / Math.abs(prev)) : null;
  // Chênh dưới 0,05% coi như đi ngang, không tô màu.
  const flat = delta !== null && Math.abs(delta) < 0.0005;
  const up = delta !== null && !flat && delta > 0;
  const good = delta === null || flat ? null : metric.invert ? !up : up;
  const trend = metric.values.filter((v): v is number => v !== null);
  const color = root ? 'var(--color-critical)' : 'var(--color-accent)';

  return (
    <div
      className={
        root
          ? 'rounded-xl border border-critical/40 bg-critical-soft/40 px-3.5 py-3'
          : 'rounded-xl border border-line bg-surface px-3 py-2.5 min-w-0'
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs sm:text-xs text-ink-3 truncate">{metric.label}</span>
        <Sparkline data={trend} width={root ? 64 : 56} height={root ? 20 : 18} color={color} label={`Xu hướng ${metric.label}`} />
      </div>
      <div className={root ? 'mt-1 text-xl font-semibold text-ink tabular-nums' : 'mt-1 text-base font-semibold text-ink tabular-nums truncate'}>
        {cur === null ? '—' : metric.format(cur)}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-2xs tabular-nums">
        {delta === null ? (
          <span className="text-ink-3">Chưa có kỳ trước · {periodLabel}</span>
        ) : (
          <>
            <span className={good === null ? 'text-ink-3' : good ? 'text-positive' : 'text-critical'}>
              {flat ? '•' : up ? '▲' : '▼'}{' '}
              {metric.isRate ? `${formatPercent(Math.abs(delta)).replace('%', '')} điểm %` : formatPercent(Math.abs(delta))}
            </span>
            <span className="text-ink-3">· {periodLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}

function TreeRow({ formula, children, op }: { formula: string; children: React.ReactNode; op: string }) {
  const items = React.Children.toArray(children);
  return (
    <div className="space-y-1.5">
      <div className="text-2xs text-ink-3">{formula}</div>
      <div className="flex items-stretch gap-1.5">
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="self-center text-xs text-ink-3 shrink-0">{op}</span>}
            <div className="flex-1 min-w-0">{child}</div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

const RISK_LABEL: Record<string, { tone: 'critical' | 'warning' | 'neutral'; text: string }> = {
  UNBUDGETED: { tone: 'critical', text: 'Chi ngoài kế hoạch' },
  OVERBUDGET: { tone: 'warning', text: 'Vượt trần Net' },
  SLOW_BURN: { tone: 'neutral', text: 'Giải ngân chậm' },
};
const RISK_ORDER = ['UNBUDGETED', 'OVERBUDGET', 'SLOW_BURN'];

export function DashboardSummaryView({
  stores,
  bookedVideos,
  isGlobalViewer,
  onOpenFinance,
}: {
  stores: StorePortfolioItem[];
  bookedVideos: B2cBookedVideoRecord[];
  isGlobalViewer: boolean;
  onOpenFinance: () => void;
}) {
  const [grain, setGrain] = useState<Grain>('DAY');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('AIR');
  const [chartCompare, setChartCompare] = useState<ChartCompare>('NONE');

  const totals = useMemo(() => {
    let targetGmv = 0;
    let budgetNet = 0;
    let spentNet = 0;
    let targetVideos = 0;
    let airedVideos = 0;
    const risk = { UNBUDGETED: 0, OVERBUDGET: 0, SLOW_BURN: 0 };
    stores.forEach((s) => {
      targetGmv += s.monthlyTargetGmv || 0;
      budgetNet += s.budgetNet || s.monthlyBudget || 0;
      spentNet += s.actualSpentNet || 0;
      targetVideos += (s.targetPaidVideos || 0) + (s.targetFocVideos || 0) + (s.targetSelfChannelContents || 0);
      airedVideos += s.actualAiredVideos || 0;
      if (s.financialRiskStatus && s.financialRiskStatus in risk) risk[s.financialRiskStatus as keyof typeof risk]++;
    });
    return { targetGmv, budgetNet, spentNet, targetVideos, airedVideos, risk };
  }, [stores]);

  // Lịch air hằng ngày chỉ có số toàn công ty; chỉ cắt đến ngày cuối đã đồng bộ (≤ hôm nay).
  const pulse = useMemo(() => {
    const today = getVietnamDateYmd();
    const synced = B2C_DAILY_AIR_PULSE_OCT_2026.filter((d) => d.date <= today && d.actualCount > 0);
    const lastDate = synced.length ? synced[synced.length - 1].date : null;
    return lastDate ? B2C_DAILY_AIR_PULSE_OCT_2026.filter((d) => d.date <= lastDate) : [];
  }, []);

  const periodTitle = useMemo(() => {
    const dates = bookedVideos.map((v) => v.airDate).filter(Boolean).sort();
    const last = dates[dates.length - 1] || pulse[pulse.length - 1]?.date;
    return last ? `Tháng ${last.slice(5, 7)}/${last.slice(0, 4)}` : 'Tháng này';
  }, [bookedVideos, pulse]);

  const buckets = useMemo(() => bucketVideos(bookedVideos, grain), [bookedVideos, grain]);
  const latestLabel = buckets.length ? buckets[buckets.length - 1].label : '—';

  const tree = useMemo(() => {
    const m = (label: string, values: (number | null)[], format: (n: number) => string, extra?: Partial<TreeMetric>): TreeMetric => ({
      label,
      values,
      format,
      ...extra,
    });
    return {
      gmv: m('GMV từ video', buckets.map((b) => b.gmv), formatVndShort),
      videos: m('Video air', buckets.map((b) => b.videos), formatNumber),
      gmvPerVideo: m('GMV / video', buckets.map((b) => ratio(b.gmv, b.videos)), formatVndShort),
      cost: m('Chi phí booking', buckets.map((b) => b.cost), formatVndShort, { invert: true }),
      roas: m('ROAS', buckets.map((b) => ratio(b.gmv, b.cost)), (n) => `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x`),
      orders: m('Đơn', buckets.map((b) => b.orders), formatNumber),
      aov: m('AOV', buckets.map((b) => ratio(b.gmv, b.orders)), formatVndShort),
    };
  }, [buckets]);

  const usePulse = isGlobalViewer && pulse.length > 1 && chartMetric !== 'GMV';
  const chart = useMemo<{ data: TrendPoint[]; format: (n: number) => string; label: string; source: string }>(() => {
    if (usePulse) {
      const isAir = chartMetric === 'AIR';
      return {
        data: pulse.map((d) => ({
          label: d.dayLabel,
          value: isAir ? d.actualCount : d.totalCostActual,
          ...(isAir && chartCompare === 'PLAN' ? { compare: d.plannedCount } : {}),
        })),
        format: isAir ? formatNumber : formatVndShort,
        label: isAir ? 'Video air' : 'Chi phí',
        source: `Lịch air toàn bộ gian hàng · đồng bộ đến ${pulse[pulse.length - 1].dayLabel}`,
      };
    }
    const daily = bucketVideos(bookedVideos, 'DAY');
    const pick = (b: Bucket) => (chartMetric === 'AIR' ? b.videos : chartMetric === 'COST' ? b.cost : b.gmv);
    return {
      data: daily.map((b) => ({ label: b.label, value: pick(b) })),
      format: chartMetric === 'AIR' ? formatNumber : formatVndShort,
      label: chartMetric === 'AIR' ? 'Video air' : chartMetric === 'COST' ? 'Chi phí' : 'GMV',
      source: daily.length
        ? `${formatNumber(bookedVideos.length)} video booking có link air · đến ${daily[daily.length - 1].label}`
        : 'Chưa có video booking có link air',
    };
  }, [usePulse, pulse, chartMetric, chartCompare, bookedVideos]);

  const riskRows = useMemo(
    () =>
      stores
        .filter((s) => s.financialRiskStatus && RISK_ORDER.includes(s.financialRiskStatus))
        .sort(
          (a, b) =>
            RISK_ORDER.indexOf(a.financialRiskStatus!) - RISK_ORDER.indexOf(b.financialRiskStatus!) ||
            (b.actualSpentNet || 0) - (a.actualSpentNet || 0),
        )
        .slice(0, 6),
    [stores],
  );

  const riskColumns: Column<StorePortfolioItem>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: (s) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{s.storeName}</div>
          <div className="text-2xs text-ink-3 truncate">{s.brandName}</div>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Phụ trách',
      render: (s) => {
        const name = s.primaryPic || s.assignedStaff;
        return name ? <Person name={name} /> : <span className="text-ink-3">—</span>;
      },
    },
    {
      key: 'spent',
      header: 'Đã chi / hạn mức Net',
      width: 200,
      render: (s) => {
        const budget = s.budgetNet || s.monthlyBudget || 0;
        const spent = s.actualSpentNet || 0;
        return (
          <div className="space-y-1">
            <div className="text-xs tabular-nums text-ink-2">
              {formatVndShort(spent)} <span className="text-ink-3">/ {budget > 0 ? formatVndShort(budget) : '0 đ'}</span>
            </div>
            <Progress value={spent} max={Math.max(1, budget)} invert />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => {
        const r = RISK_LABEL[s.financialRiskStatus!];
        return <Status tone={r.tone}>{r.text}</Status>;
      },
    },
  ];

  const spentPct = totals.budgetNet > 0 ? totals.spentNet / totals.budgetNet : 0;
  const airPct = totals.targetVideos > 0 ? totals.airedVideos / totals.targetVideos : 0;
  const riskCount = totals.risk.UNBUDGETED + totals.risk.OVERBUDGET;
  const periodLabel = latestLabel;

  // GMV, chi phí video lấy từ video booking có link air trong phạm vi người xem
  const videoTotals = useMemo(() => {
    let gmv = 0;
    let cost = 0;
    bookedVideos.forEach((v) => {
      gmv += v.sellerGmv || 0;
      cost += v.cost || 0;
    });
    return { gmv, cost, roas: ratio(gmv, cost) };
  }, [bookedVideos]);

  // Kỳ dữ liệu: từ đầu tháng đến ngày đồng bộ cuối (≤ hôm nay)
  const period = useMemo(() => {
    const today = getVietnamDateYmd();
    const last = [...bookedVideos.map((v) => v.airDate), ...pulse.map((d) => d.date)]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today)
      .sort()
      .pop();
    if (!last) return null;
    const y = Number(last.slice(0, 4));
    const daysInMonth = new Date(Date.UTC(y, Number(last.slice(5, 7)), 0)).getUTCDate();
    return { from: `01/${last.slice(5, 7)}`, to: `${ddmm(last)}/${y}`, day: Number(last.slice(8, 10)), daysInMonth };
  }, [bookedVideos, pulse]);

  const timePct = period ? period.day / period.daysInMonth : 0;
  const riskList = RISK_ORDER.map((k) => ({ key: k, ...RISK_LABEL[k], count: totals.risk[k as keyof typeof totals.risk] }));
  const peak = chart.data.length > 1 ? chart.data.reduce((a, b) => (b.value > a.value ? b : a)) : null;

  return (
    <div className="space-y-4">
      {/* Kỳ dữ liệu */}
      <Panel
        icon={CalendarRange}
        title={`Số ${periodTitle.toLowerCase()}`}
        meta={period ? `${period.from} – ${period.to} (${period.day}/${period.daysInMonth} ngày) · chưa chốt` : 'Chưa có dữ liệu trong tháng'}
        actions={
          <Button size="sm" variant="ghost" onClick={onOpenFinance}>
            Ngân sách chi tiết <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        }
      >
        <p className="text-2xs text-ink-3">
          Nguồn: kế hoạch tháng ở Dữ liệu gốc · lịch air · {formatNumber(bookedVideos.length)} video booking có link air trong phạm vi của bạn.
        </p>
      </Panel>

      <StatRow>
        <Stat label="Mục tiêu NMV" value={formatVndShort(totals.targetGmv)} numeric={totals.targetGmv} note={`${formatNumber(stores.length)} gian hàng`} />
        <Stat label="Hạn mức Net" value={formatVndShort(totals.budgetNet)} numeric={totals.budgetNet} />
        <Stat
          label="Đã chi Net"
          value={formatVndShort(totals.spentNet)}
          numeric={totals.spentNet}
          progress={{ value: totals.spentNet, max: Math.max(1, totals.budgetNet), invert: true }}
          note={`${formatPercent(spentPct)} hạn mức`}
        />
        <Stat
          label="Video đã air"
          value={formatNumber(totals.airedVideos)}
          numeric={totals.airedVideos}
          note={totals.targetVideos > 0 ? `${formatPercent(airPct)} chỉ tiêu ${formatNumber(totals.targetVideos)}` : 'Chưa có chỉ tiêu'}
        />
        <Stat
          label="GMV từ video"
          value={bookedVideos.length ? formatVndShort(videoTotals.gmv) : '—'}
          note={`${formatNumber(bookedVideos.length)} video có link air`}
        />
        <Stat label="Chi phí booking" value={bookedVideos.length ? formatVndShort(videoTotals.cost) : '—'} />
        <Stat
          label="ROAS video"
          value={videoTotals.roas === null ? '—' : `${videoTotals.roas.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x`}
          note="GMV ÷ chi phí booking"
        />
        <Stat
          label="Gian cần xử lý"
          value={formatNumber(riskCount)}
          numeric={riskCount}
          invert
          tone={riskCount > 0 ? 'critical' : undefined}
          note={`${totals.risk.UNBUDGETED} ngoài kế hoạch · ${totals.risk.OVERBUDGET} vượt trần`}
        />
      </StatRow>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        {/* Cột chính */}
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-4 items-start">
            <Panel
              icon={GitFork}
              title="Cây chỉ số video booking"
              meta={buckets.length ? `${grain === 'DAY' ? 'Ngày' : 'Tuần'} gần nhất (${latestLabel}) so với ${grain === 'DAY' ? 'ngày' : 'tuần'} trước` : undefined}
              actions={
                <Segmented<Grain>
                  items={[
                    { key: 'DAY', label: 'Ngày' },
                    { key: 'WEEK', label: 'Tuần' },
                  ]}
                  value={grain}
                  onChange={setGrain}
                />
              }
            >
              {buckets.length === 0 ? (
                <p className="text-sm text-ink-3 py-6 text-center">Chưa có video booking có link air trong phạm vi của bạn.</p>
              ) : (
                <div className="space-y-3">
                  <MetricNode metric={tree.gmv} periodLabel={periodLabel} root />
                  <TreeRow formula="GMV = Video air × GMV/video" op="×">
                    <MetricNode metric={tree.videos} periodLabel={periodLabel} />
                    <MetricNode metric={tree.gmvPerVideo} periodLabel={periodLabel} />
                  </TreeRow>
                  <TreeRow formula="GMV = Chi phí × ROAS" op="×">
                    <MetricNode metric={tree.cost} periodLabel={periodLabel} />
                    <MetricNode metric={tree.roas} periodLabel={periodLabel} />
                  </TreeRow>
                  <TreeRow formula="GMV = Đơn × AOV" op="×">
                    <MetricNode metric={tree.orders} periodLabel={periodLabel} />
                    <MetricNode metric={tree.aov} periodLabel={periodLabel} />
                  </TreeRow>
                </div>
              )}
            </Panel>

            <Panel
              icon={LineChart}
              title={`${chart.label} theo ngày`}
              meta={chart.source}
              actions={
                <>
                  {usePulse && chartMetric === 'AIR' && (
                    <Segmented<ChartCompare>
                      items={[
                        { key: 'NONE', label: 'Không so' },
                        { key: 'PLAN', label: 'Kế hoạch' },
                      ]}
                      value={chartCompare}
                      onChange={setChartCompare}
                    />
                  )}
                  <Segmented<ChartMetric>
                    items={[
                      { key: 'AIR', label: 'Video air' },
                      { key: 'COST', label: 'Chi phí' },
                      { key: 'GMV', label: 'GMV' },
                    ]}
                    value={chartMetric}
                    onChange={setChartMetric}
                  />
                </>
              }
            >
              {chart.data.length > 1 ? (
                <TrendChart
                  data={chart.data}
                  format={chart.format}
                  height={300}
                  color="var(--color-critical)"
                  valueLabel={chart.label}
                  compareLabel="Kế hoạch"
                />
              ) : (
                <p className="text-sm text-ink-3 py-16 text-center">Chưa đủ dữ liệu để vẽ xu hướng.</p>
              )}
              {peak && (
                <p className="mt-2 text-2xs text-ink-3">
                  Cao nhất: {peak.label} · {chart.format(peak.value)}
                </p>
              )}
            </Panel>
          </div>

          <Panel
            flush
            icon={AlertTriangle}
            title="Gian hàng cần chú ý"
            meta="Chi ngoài kế hoạch, vượt trần Net hoặc giải ngân chậm · sắp theo mức rủi ro"
            actions={
              <Button size="sm" variant="ghost" onClick={onOpenFinance}>
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            }
          >
            <DataTable
              columns={riskColumns}
              rows={riskRows}
              rowKey={(s) => s.id}
              empty={<p className="text-sm text-ink-3 py-6 text-center">Không có gian hàng chi ngoài kế hoạch, vượt trần hoặc giải ngân chậm.</p>}
            />
          </Panel>
        </div>

        {/* Cột phải: tiến độ tháng và việc cần xử lý */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-4">
          <Panel icon={Gauge} title="Tiến độ tháng" meta={period ? `Ngày ${period.day}/${period.daysInMonth} của tháng` : undefined}>
            <ul className="space-y-3">
              {[
                { key: 'time', label: 'Thời gian đã qua', value: period?.day ?? 0, max: period?.daysInMonth ?? 1, text: period ? formatPercent(timePct, 0) : '—' },
                { key: 'spent', label: 'Đã chi / hạn mức Net', value: totals.spentNet, max: totals.budgetNet, text: formatPercent(spentPct, 0) },
                { key: 'air', label: 'Video air / chỉ tiêu', value: totals.airedVideos, max: totals.targetVideos, text: totals.targetVideos > 0 ? formatPercent(airPct, 0) : '—' },
              ].map((r) => (
                <li key={r.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-2">{r.label}</span>
                    <span className="font-figure tabular-nums text-ink">{r.text}</span>
                  </div>
                  <Progress value={r.value} max={Math.max(1, r.max)} />
                </li>
              ))}
            </ul>
            {period && totals.targetVideos > 0 && (
              <p className="mt-3 rounded-lg bg-canvas px-3 py-2 text-2xs text-ink-2">
                {airPct >= timePct
                  ? 'Video air đang theo kịp thời gian trong tháng.'
                  : `Video air chậm hơn thời gian ${formatPercent(timePct - airPct, 0)}.`}
              </p>
            )}
          </Panel>

          <Panel icon={ListChecks} title="Cần xử lý" meta={`${formatNumber(stores.length)} gian trong phạm vi`}>
            <ul className="divide-y divide-line">
              {riskList.map((r) => (
                <li key={r.key}>
                  <button type="button" onClick={onOpenFinance} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-canvas">
                    <Status tone={r.tone}>{r.text}</Status>
                    <span className="font-figure tabular-nums text-sm text-ink">{formatNumber(r.count)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
