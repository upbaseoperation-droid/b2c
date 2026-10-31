'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Gauge, LineChart } from 'lucide-react';
import {
  Button,
  DataTable,
  Panel,
  Person,
  Progress,
  Segmented,
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

function bucketVideosByDay(videos: B2cBookedVideoRecord[]): Bucket[] {
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

  const last = dated.reduce((m, v) => (v.airDate > m ? v.airDate : m), dated[0].airDate);
  const monthStart = `${last.slice(0, 7)}-01`;
  dated.filter((v) => v.airDate >= monthStart).forEach((v) => add(v.airDate, ddmm(v.airDate), v));
  const out: Bucket[] = [];
  for (let d = monthStart; d <= last; d = addDays(d, 1)) {
    out.push(map.get(d) ?? { key: d, label: ddmm(d), videos: 0, gmv: 0, cost: 0, orders: 0 });
  }
  return out;
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
  onOpenPlanActual,
}: {
  stores: StorePortfolioItem[];
  bookedVideos: B2cBookedVideoRecord[];
  isGlobalViewer: boolean;
  onOpenFinance: () => void;
  onOpenPlanActual?: () => void;
}) {
  const [chartMetric, setChartMetric] = useState<ChartMetric>('AIR');
  const [chartCompare, setChartCompare] = useState<ChartCompare>('PLAN');

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
      if (s.financialRiskStatus && s.financialRiskStatus in risk) {
        risk[s.financialRiskStatus as keyof typeof risk]++;
      }
    });
    return { targetGmv, budgetNet, spentNet, targetVideos, airedVideos, risk };
  }, [stores]);

  const pulse = useMemo(() => {
    const today = getVietnamDateYmd();
    const synced = B2C_DAILY_AIR_PULSE_OCT_2026.filter((d) => d.date <= today && d.actualCount > 0);
    const lastDate = synced.length ? synced[synced.length - 1].date : null;
    return lastDate ? B2C_DAILY_AIR_PULSE_OCT_2026.filter((d) => d.date <= lastDate) : [];
  }, []);

  const usePulse = isGlobalViewer && pulse.length > 1 && chartMetric !== 'GMV';
  const chart = useMemo<{ data: TrendPoint[]; format: (n: number) => string; label: string }>(() => {
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
      };
    }
    const daily = bucketVideosByDay(bookedVideos);
    const pick = (b: Bucket) => (chartMetric === 'AIR' ? b.videos : chartMetric === 'COST' ? b.cost : b.gmv);
    return {
      data: daily.map((b) => ({ label: b.label, value: pick(b) })),
      format: chartMetric === 'AIR' ? formatNumber : formatVndShort,
      label: chartMetric === 'AIR' ? 'Video air' : chartMetric === 'COST' ? 'Chi phí' : 'GMV',
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
        .slice(0, 8),
    [stores],
  );

  const riskColumns: Column<StorePortfolioItem>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      render: (s) => (
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">{s.storeName}</div>
          <div className="text-2xs text-ink-3 truncate">{s.brandName} · {s.platform}</div>
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
      header: 'Đã chi / Hạn mức Net',
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
      key: 'videos',
      header: 'Video air / Chỉ tiêu',
      align: 'right',
      render: (s) => (
        <span className="tabular-nums text-xs text-ink-2">
          {formatNumber(s.actualAiredVideos || 0)} / {formatNumber((s.targetPaidVideos || 0) + (s.targetFocVideos || 0))}
        </span>
      ),
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

  const videoTotals = useMemo(() => {
    let gmv = 0;
    let cost = 0;
    bookedVideos.forEach((v) => {
      gmv += v.sellerGmv || 0;
      cost += v.cost || 0;
    });
    return { gmv, cost };
  }, [bookedVideos]);

  const period = useMemo(() => {
    const today = getVietnamDateYmd();
    const last = [...bookedVideos.map((v) => v.airDate), ...pulse.map((d) => d.date)]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today)
      .sort()
      .pop();
    if (!last) return null;
    const y = Number(last.slice(0, 4));
    const daysInMonth = new Date(Date.UTC(y, Number(last.slice(5, 7)), 0)).getUTCDate();
    return { day: Number(last.slice(8, 10)), daysInMonth };
  }, [bookedVideos, pulse]);

  const timePct = period ? period.day / period.daysInMonth : 0;
  const riskList = RISK_ORDER.map((k) => ({ key: k, ...RISK_LABEL[k], count: totals.risk[k as keyof typeof totals.risk] }));

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat label="Mục tiêu NMV" value={formatVndShort(totals.targetGmv)} numeric={totals.targetGmv} />
        <Stat
          label="Đã chi / Hạn mức Net"
          value={`${formatVndShort(totals.spentNet)} / ${formatVndShort(totals.budgetNet)}`}
          progress={{ value: totals.spentNet, max: Math.max(1, totals.budgetNet), invert: true }}
        />
        <Stat
          label="Video đã air / Chỉ tiêu"
          value={`${formatNumber(totals.airedVideos)} / ${formatNumber(totals.targetVideos)}`}
          progress={{ value: totals.airedVideos, max: Math.max(1, totals.targetVideos) }}
        />
        <Stat
          label="Doanh số GMV Video"
          value={bookedVideos.length ? formatVndShort(videoTotals.gmv) : '—'}
        />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
        <Panel
          icon={LineChart}
          title={`${chart.label} theo ngày`}
          actions={
            <>
              {usePulse && chartMetric === 'AIR' && (
                <Segmented<ChartCompare>
                  items={[
                    { key: 'NONE', label: 'Thực tế' },
                    { key: 'PLAN', label: 'So kế hoạch' },
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
              height={280}
              color="var(--color-critical)"
              valueLabel={chart.label}
              compareLabel="Kế hoạch"
            />
          ) : (
            <p className="text-sm text-ink-3 py-16 text-center">Chưa có dữ liệu theo ngày.</p>
          )}
        </Panel>

        <Panel
          icon={Gauge}
          title="Tiến độ tháng & Cảnh báo"
          actions={
            <div className="flex items-center gap-2">
              {onOpenPlanActual && (
                <Button size="sm" variant="ghost" onClick={onOpenPlanActual}>
                  Theo tuần <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onOpenFinance}>
                Ngân sách <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <ul className="space-y-3">
              {[
                { key: 'time', label: 'Thời gian trong tháng', value: period?.day ?? 0, max: period?.daysInMonth ?? 1, text: period ? formatPercent(timePct, 0) : '—' },
                { key: 'spent', label: 'Giải ngân hạn mức Net', value: totals.spentNet, max: totals.budgetNet, text: formatPercent(spentPct, 0) },
                { key: 'air', label: 'Hoàn thành chỉ tiêu Video', value: totals.airedVideos, max: totals.targetVideos, text: totals.targetVideos > 0 ? formatPercent(airPct, 0) : '—' },
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

            <ul className="divide-y divide-line border-t border-line pt-2">
              {riskList.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={onOpenFinance}
                    className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-canvas"
                  >
                    <Status tone={r.tone}>{r.text}</Status>
                    <span className="font-figure tabular-nums text-sm font-medium text-ink">
                      {formatNumber(r.count)} gian
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel
        flush
        icon={AlertTriangle}
        title="Gian hàng cần xử lý"
        actions={
          <Button size="sm" variant="ghost" onClick={onOpenFinance}>
            Xem tất cả ({stores.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        }
      >
        <DataTable
          columns={riskColumns}
          rows={riskRows}
          rowKey={(s) => s.id}
          empty={<p className="text-sm text-ink-3 py-6 text-center">Không có gian hàng vượt trần hoặc chi ngoài kế hoạch.</p>}
        />
      </Panel>
    </div>
  );
}
