'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, LineChart, Timer } from 'lucide-react';
import { BarList, HeatGrid, Panel, Segmented, Stat, StatRow, StackBar, TrendChart } from '../ui';
import type { BarItem, TrendPoint } from '../ui';
import { StorePortfolioItem } from '../../lib/types';
import { formatNumber, formatPercent, getVietnamDateYmd } from '../../lib/format';
import {
  B2C_STORE_WEEKLY_AIR_SYNC_LIST,
  B2C_WEEKLY_MACRO_AIR_SUMMARY,
  type StoreWeeklyAirSyncRecord,
} from '../../lib/b2cWeeklyAirSyncDataset';

type ChartCompare = 'NONE' | 'PLAN';
type StoreView = 'GAP' | 'ALL';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const STORE_GAP_LIMIT = 12;

const ddmm = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Tổng giá trị của các ngày trong khoảng [from, to]. */
const sumRange = (map: Map<string, number>, from: string, to: string) => {
  let s = 0;
  map.forEach((v, k) => {
    if (k >= from && k <= to) s += v;
  });
  return s;
};

/** Thứ trong tuần theo lịch Việt: 0 = T2 … 6 = CN. */
const weekdayIndex = (ymd: string) => (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Tuần kế hoạch W40…W45 với ngày bắt đầu lấy từ khoảng ngày "25/09 – 01/10". */
const WEEKS = B2C_WEEKLY_MACRO_AIR_SUMMARY.map((w) => {
  const [d, m] = w.dateRange.split('–')[0].trim().split('/');
  const start = `2026-${m}-${d}`;
  return { code: w.weekCode || w.code, start, end: addDays(start, 6), range: w.dateRange };
});

/** Kế hoạch tuần của một gian: lấy số lớn hơn giữa chỉ tiêu Paid + Brand (4.1.1) và đơn đã hẹn ngày air trong tuần (3.2). */
const weekPlan = (st: StoreWeeklyAirSyncRecord, code: string) => {
  const w = st.weeks.find((x) => x.weekCode === code);
  return w ? Math.max(w.planCoreVideos, w.bookedPlannedInWeek) : 0;
};

export function DashboardScheduleReport({
  stores,
  isGlobalViewer,
  onInspectStore,
}: {
  stores: StorePortfolioItem[];
  isGlobalViewer: boolean;
  onInspectStore: (s: StorePortfolioItem) => void;
}) {
  const [compare, setCompare] = useState<ChartCompare>('PLAN');
  const [storeView, setStoreView] = useState<StoreView>('GAP');

  // Người không xem toàn công ty chỉ thấy lịch air của các gian mình phụ trách.
  const scoped = useMemo(() => {
    if (isGlobalViewer) return B2C_STORE_WEEKLY_AIR_SYNC_LIST;
    const names = new Set(stores.map((s) => s.storeName.toLowerCase()));
    return B2C_STORE_WEEKLY_AIR_SYNC_LIST.filter((st) => names.has(st.storeName.toLowerCase()));
  }, [stores, isGlobalViewer]);

  const deals = useMemo(() => scoped.flatMap((st) => st.deals), [scoped]);

  // Chỉ tính đến ngày cuối đã có video air (≤ hôm nay); sau đó là chưa đồng bộ, không phải 0.
  const lastSync = useMemo(() => {
    const today = getVietnamDateYmd();
    const dates = deals.map((d) => d.actualAirDate).filter((d) => d && d <= today).sort();
    return dates[dates.length - 1] ?? null;
  }, [deals]);

  const counts = useMemo(() => {
    const aired = new Map<string, number>();
    const planned = new Map<string, number>();
    deals.forEach((d) => {
      if (d.actualAirDate && lastSync && d.actualAirDate <= lastSync) aired.set(d.actualAirDate, (aired.get(d.actualAirDate) ?? 0) + 1);
      if (d.plannedAirDate) planned.set(d.plannedAirDate, (planned.get(d.plannedAirDate) ?? 0) + 1);
    });
    return { aired, planned };
  }, [deals, lastSync]);

  const monthStart = lastSync ? `${lastSync.slice(0, 7)}-01` : null;

  const daily = useMemo<TrendPoint[]>(() => {
    if (!monthStart || !lastSync) return [];
    const out: TrendPoint[] = [];
    for (let d = monthStart; d <= lastSync; d = addDays(d, 1)) {
      out.push({
        label: ddmm(d),
        value: counts.aired.get(d) ?? 0,
        ...(compare === 'PLAN' ? { compare: counts.planned.get(d) ?? 0 } : {}),
      });
    }
    return out;
  }, [monthStart, lastSync, counts, compare]);

  const stats = useMemo(() => {
    if (!lastSync || !monthStart) return null;
    const airedMonth = sumRange(counts.aired, monthStart, lastSync);
    const planMonth = scoped.reduce((s, st) => s + st.totalPlanCoreMonth, 0);
    const last7 = sumRange(counts.aired, addDays(lastSync, -6), lastSync);
    const prev7 = sumRange(counts.aired, addDays(lastSync, -13), addDays(lastSync, -7));
    const peaks = Array.from(counts.aired.entries())
      .filter(([d]) => d >= monthStart)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const peakShare = airedMonth > 0 ? peaks.reduce((s, [, v]) => s + v, 0) / airedMonth : 0;
    const late = deals.filter((d) => d.syncTimingStatus === 'LATE').length;
    const overdue = deals.filter((d) => d.syncTimingStatus === 'NOT_AIRED' && d.plannedAirDate && d.plannedAirDate < lastSync).length;
    return { airedMonth, planMonth, last7, prev7, peaks, peakShare, late, overdue };
  }, [counts, scoped, deals, lastSync, monthStart]);

  // Lưới tuần × thứ: ô sau ngày đồng bộ cuối để trống (chưa có), không ghi 0.
  const weekGrid = useMemo(() => {
    const values = WEEKS.map((w) =>
      WEEKDAYS.map((_, col) => {
        const offset = (col - weekdayIndex(w.start) + 7) % 7;
        const date = addDays(w.start, offset);
        if (!lastSync || date > lastSync) return null;
        return counts.aired.get(date) ?? 0;
      }),
    );
    const dateOf = (row: number, col: number) => addDays(WEEKS[row].start, (col - weekdayIndex(WEEKS[row].start) + 7) % 7);
    let best: { row: number; col: number; v: number } | null = null;
    values.forEach((r, i) => r.forEach((v, j) => {
      if (v !== null && v > 0 && (!best || v > best.v)) best = { row: i, col: j, v };
    }));
    return { values, dateOf, best: best as { row: number; col: number; v: number } | null };
  }, [counts, lastSync]);

  // Lưới gian × tuần: chỉ những tuần đã bắt đầu trước ngày đồng bộ cuối.
  const storeGrid = useMemo(() => {
    const syncedWeeks = WEEKS.map((w) => !!lastSync && w.start <= lastSync);
    const rows = scoped.map((st) => {
      const actual = WEEKS.map((w, i) => (syncedWeeks[i] ? st.weeks.find((x) => x.weekCode === w.code)?.actualAiredInWeek ?? 0 : null));
      const plan = WEEKS.map((w) => weekPlan(st, w.code));
      const gap = WEEKS.reduce((s, _, i) => s + (syncedWeeks[i] ? Math.max(0, plan[i] - (actual[i] ?? 0)) : 0), 0);
      return { st, actual, plan, gap };
    });
    const sorted = storeView === 'GAP'
      ? rows.filter((r) => r.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, STORE_GAP_LIMIT)
      : [...rows].sort((a, b) => a.st.storeName.localeCompare(b.st.storeName, 'vi'));
    const totalGap = rows.filter((r) => r.gap > 0).length;
    return { rows: sorted, totalGap };
  }, [scoped, lastSync, storeView]);

  const timing = useMemo(() => {
    const count = (s: string) => deals.filter((d) => d.syncTimingStatus === s).length;
    return {
      onTime: count('ON_TIME'),
      early: count('EARLY'),
      late: count('LATE'),
      unscheduled: count('UNSCHEDULED_AIR'),
      notAired: count('NOT_AIRED'),
    };
  }, [deals]);

  const flows = useMemo<BarItem[]>(() => {
    const leaderName = scoped.find((st) => st.hasLeader && st.leaderName)?.leaderName;
    const groups = [
      { key: 'LEADER', label: leaderName ? `Qua trưởng nhóm ${leaderName.split(' ').slice(-2).join(' ')}` : 'Qua trưởng nhóm', list: scoped.filter((st) => st.hasLeader) },
      { key: 'DIRECT', label: 'Trình trực tiếp', list: scoped.filter((st) => !st.hasLeader) },
    ];
    return groups
      .filter((g) => g.list.length > 0)
      .map((g) => {
        const onTime = g.list.reduce((s, st) => s + st.onTimeCount + st.earlyCount, 0);
        const scheduled = onTime + g.list.reduce((s, st) => s + st.lateCount, 0);
        const rate = scheduled > 0 ? onTime / scheduled : null;
        return {
          key: g.key,
          label: `${g.label} · ${g.list.length} gian`,
          value: rate ?? 0,
          display: rate === null ? '—' : formatPercent(rate),
        };
      });
  }, [scoped]);

  const openStore = (st: StoreWeeklyAirSyncRecord) => {
    const name = st.storeName.toLowerCase();
    const match = stores.find((s) => s.storeName.toLowerCase() === name) ?? stores.find((s) => s.id === st.storeId || s.id.startsWith(`${st.storeId}-`));
    if (match) onInspectStore(match);
  };

  if (!stats || !lastSync) {
    return <p className="text-sm text-ink-3 py-16 text-center">Chưa có video air nào trong phạm vi gian hàng của bạn.</p>;
  }

  const weekDelta = stats.prev7 > 0 ? (stats.last7 - stats.prev7) / stats.prev7 : null;
  const syncNote = `Nguồn: 3.2 list duyệt book (ngày hẹn và ngày air thực) · 4.1.1 plan tuần · đồng bộ đến ${ddmm(lastSync)}.`;

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Video air trong tháng"
          value={formatNumber(stats.airedMonth)}
          progress={stats.planMonth > 0 ? { value: stats.airedMonth, max: stats.planMonth } : undefined}
          note={stats.planMonth > 0 ? `Kế hoạch Paid + Brand: ${formatNumber(stats.planMonth)} · đạt ${formatPercent(stats.airedMonth / stats.planMonth)}` : 'Chưa có kế hoạch tháng'}
        />
        <Stat
          label="7 ngày gần nhất"
          value={formatNumber(stats.last7)}
          trend={daily.slice(-14).map((d) => d.value)}
          note={weekDelta === null ? `${ddmm(addDays(lastSync, -6))} – ${ddmm(lastSync)}` : `${weekDelta >= 0 ? '+' : ''}${formatPercent(weekDelta)} so với 7 ngày trước (${formatNumber(stats.prev7)})`}
          tone={weekDelta !== null && weekDelta < 0 ? 'warning' : undefined}
        />
        <Stat
          label="Air dồn vào 3 ngày đỉnh"
          value={formatPercent(stats.peakShare)}
          note={stats.peaks.map(([d, v]) => `${ddmm(d)} (${v})`).join(' · ')}
        />
        <Stat
          label="Đơn trễ lịch hẹn"
          value={formatNumber(stats.late + stats.overdue)}
          note={`${formatNumber(stats.late)} air trễ ngày hẹn · ${formatNumber(stats.overdue)} quá hẹn chưa air`}
          tone={stats.late + stats.overdue > 0 ? 'critical' : undefined}
        />
      </StatRow>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] gap-4 items-start">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Video air theo ngày
            </span>
          }
          actions={
            <Segmented<ChartCompare>
              items={[
                { key: 'NONE', label: 'Không so' },
                { key: 'PLAN', label: 'Kế hoạch' },
              ]}
              value={compare}
              onChange={setCompare}
            />
          }
        >
          {daily.length > 1 ? (
            <TrendChart
              data={daily}
              format={formatNumber}
              height={300}
              color="var(--color-critical)"
              valueLabel="Video air"
              compareLabel="Ngày hẹn air"
            />
          ) : (
            <p className="text-sm text-ink-3 py-16 text-center">Chưa đủ dữ liệu để vẽ xu hướng.</p>
          )}
          <p className="mt-2 text-2xs text-ink-3">
            {compare === 'PLAN' ? 'Nét đứt = số đơn hẹn air trong ngày. ' : ''}
            {syncNote}
          </p>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Lịch air trong tuần
            </span>
          }
        >
          {weekGrid.best && (
            <p className="mb-3 text-xs text-ink">
              Nhiều nhất: <strong>{WEEKDAYS[weekGrid.best.col]} {ddmm(weekGrid.dateOf(weekGrid.best.row, weekGrid.best.col))}</strong>
              <span className="text-ink-3"> · {formatNumber(weekGrid.best.v)} video</span>
            </p>
          )}
          <HeatGrid
            rows={WEEKS.map((w) => w.code)}
            cols={WEEKDAYS}
            values={weekGrid.values}
            format={formatNumber}
            cellTitle={(r, c, v) => {
              const d = weekGrid.dateOf(r, c);
              return `${WEEKDAYS[c]} ${ddmm(d)}: ${v === null ? 'chưa đồng bộ' : `${formatNumber(v)} air`} · hẹn ${formatNumber(counts.planned.get(d) ?? 0)}`;
            }}
          />
          <p className="mt-2 text-2xs text-ink-3">Tuần kế hoạch chạy từ thứ Sáu đến thứ Năm ({WEEKS[0].range} là {WEEKS[0].code}). Ô = số video air thực tế.</p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] gap-4 items-start">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Lịch tuần theo gian hàng
            </span>
          }
          actions={
            <Segmented<StoreView>
              items={[
                { key: 'GAP', label: 'Thiếu nhiều nhất' },
                { key: 'ALL', label: `Tất cả ${scoped.length} gian` },
              ]}
              value={storeView}
              onChange={setStoreView}
            />
          }
        >
          {storeGrid.rows.length === 0 ? (
            <p className="text-sm text-ink-3 py-10 text-center">Không có gian nào air thiếu so với kế hoạch tuần.</p>
          ) : (
            <div className={storeView === 'ALL' ? 'max-h-[560px] overflow-y-auto' : undefined}>
              <HeatGrid
                rows={storeGrid.rows.map((r) => r.st.storeName)}
                cols={WEEKS.map((w) => w.code)}
                values={storeGrid.rows.map((r) => r.actual)}
                format={formatNumber}
                cellTitle={(i, j, v) => {
                  const r = storeGrid.rows[i];
                  return `${r.st.storeName} · ${WEEKS[j].code} (${WEEKS[j].range}): ${v === null ? 'chưa đồng bộ' : `air ${formatNumber(v)}`} / kế hoạch ${formatNumber(r.plan[j])}`;
                }}
                onCellClick={(i) => openStore(storeGrid.rows[i].st)}
              />
            </div>
          )}
          <p className="mt-2 text-2xs text-ink-3">
            {storeView === 'GAP'
              ? `${formatNumber(Math.min(STORE_GAP_LIMIT, storeGrid.totalGap))}/${formatNumber(storeGrid.totalGap)} gian air thiếu nhiều nhất so với kế hoạch tuần (Paid + Brand hoặc đơn đã hẹn, lấy số lớn hơn). `
              : ''}
            Rê chuột xem kế hoạch, bấm ô để mở hồ sơ gian hàng.
          </p>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Khớp lịch hẹn air
            </span>
          }
        >
          <StackBar
            parts={[
              { key: 'ON_TIME', label: 'Đúng ngày hẹn', value: timing.onTime, display: formatNumber(timing.onTime), color: 'var(--color-positive)' },
              { key: 'EARLY', label: 'Air sớm', value: timing.early, display: formatNumber(timing.early), color: 'var(--color-accent)' },
              { key: 'LATE', label: 'Air trễ', value: timing.late, display: formatNumber(timing.late), color: 'var(--color-critical)' },
              { key: 'UNSCHEDULED', label: 'Air không có ngày hẹn', value: timing.unscheduled, display: formatNumber(timing.unscheduled), color: 'var(--color-warning)' },
              { key: 'NOT_AIRED', label: 'Chưa air', value: timing.notAired, display: formatNumber(timing.notAired), color: 'var(--color-line-strong)' },
            ]}
          />
          {flows.length > 0 && (
            <div className="mt-5 space-y-2">
              <h4 className="text-xs font-semibold text-ink">Đúng hẹn theo luồng duyệt</h4>
              <BarList items={flows} max={1} />
            </div>
          )}
          <p className="mt-3 text-2xs text-ink-3">Đúng hẹn = (đúng ngày + sớm) / số video air có ngày hẹn. Tính trên {formatNumber(deals.length)} đơn book.</p>
        </Panel>
      </div>
    </div>
  );
}
