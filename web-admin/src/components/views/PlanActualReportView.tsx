'use client';

import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Filter,
  Layers,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  Panel,
  Person,
  Progress,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  STATUS,
  Toolbar,
  type Column,
} from '../ui';
import { formatDate, formatNumber, formatVndShort } from '../../lib/format';
import {
  PLAN_CHANNEL_SPECS,
  type BatchActualRow,
  type ChannelActualRow,
  type PlanActualStoreReport,
  type PlanChannelKey,
  type ProgressState,
  type StoreExecutionDealRow,
  type TierActualRow,
  type WeekActualRow,
  type WeekCellMetrics,
} from '../../lib/planActualReport';
import type { QuotaKey } from '../../lib/listingBoardRules';

interface ReportResponse {
  month: string;
  months: string[];
  today: string;
  reports: PlanActualStoreReport[];
}

const STATE_STATUS: Record<ProgressState, { label: string; tone: 'positive' | 'info' | 'critical' | 'neutral' }> = {
  done: STATUS.done,
  running: STATUS.running,
  overdue: STATUS.overdue,
  upcoming: { label: 'Chưa tới', tone: 'neutral' },
  none: { label: 'Không có chỉ tiêu', tone: 'neutral' },
};

const StateTag = ({ state }: { state: ProgressState }) => (
  <Status tone={STATE_STATUS[state].tone}>{STATE_STATUS[state].label}</Status>
);

const sub = (text: React.ReactNode) => <div className="text-2xs text-ink-3">{text}</div>;

const safePct = (num: number, den: number): number =>
  den <= 0 ? 0 : Math.round((num / den) * 100);

/** Số thực tế / chỉ tiêu kèm thanh tiến độ (Progress chỉ vẽ thanh, không hiện chữ). */
const Bar = ({
  value,
  max,
  text,
  invert,
}: {
  value: number;
  max: number;
  text: string;
  invert?: boolean;
}) => (
  <div className="space-y-1">
    <div className="tabular-nums">{text}</div>
    <Progress value={value} max={Math.max(1, max)} target={1} invert={invert} label={text} />
  </div>
);

const monthLabel = (m: string) => {
  const [y, mm] = m.split('/');
  return y && mm ? `Tháng ${mm}/${y}` : m;
};

type MatrixDimension = 'CHANNEL' | 'KL_TIER';
type MatrixMetric = 'QTY' | 'BUDGET';
type StoreFilterState = 'ALL' | 'RUNNING' | 'OVERDUE' | 'NO_WEEKLY' | 'OVERBUDGET' | 'DONE';
type DetailSection = 'week_channel' | 'week_tier' | 'batches' | 'deals';

interface AggregatedWeekSummary {
  week: string;
  weekCode: string;
  start: string;
  end: string;
  planQty: number;
  planBudget: number;
  scheduled: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
  onTime: number;
  early: number;
  late: number;
  pending: number;
  state: ProgressState;
  byChannel: Record<PlanChannelKey, WeekCellMetrics>;
  byTier: Record<QuotaKey, WeekCellMetrics>;
}

interface MatrixRowItem {
  id: string;
  label: string;
  shortLabel: string;
  unit: 'video' | 'phiên';
  planQty: number;
  planBudget: number;
  listed: number;
  confirmed: number;
  jobs: number;
  scheduled: number;
  aired: number;
  accepted: number;
  committed: number;
  paid: number;
  weeks: Record<string, WeekCellMetrics>;
  isTotal?: boolean;
}

const TIER_DISPLAY_ORDER: { key: QuotaKey; label: string; shortLabel: string }[] = [
  { key: 'KL1', label: 'KL1 (≤ 500k)', shortLabel: 'KL1' },
  { key: 'KL2', label: 'KL2 (500k – 1.5tr)', shortLabel: 'KL2' },
  { key: 'KL3', label: 'KL3 (1.5tr – 3tr)', shortLabel: 'KL3' },
  { key: 'KL4', label: 'KL4 (3tr – 5tr)', shortLabel: 'KL4' },
  { key: 'KL5', label: 'KL5 (5tr – 10tr)', shortLabel: 'KL5' },
  { key: 'KL6', label: 'KL6 (10tr – 30tr)', shortLabel: 'KL6' },
  { key: 'KL7', label: 'KL7 (> 30tr)', shortLabel: 'KL7' },
  { key: 'FOC', label: 'FOC (Gửi mẫu 0đ)', shortLabel: 'FOC 0đ' },
  { key: 'SELF', label: 'Self-channel (Kênh Brand)', shortLabel: 'Kênh Brand' },
];

const emptyCell = (): WeekCellMetrics => ({
  planQty: 0,
  planBudget: 0,
  listed: 0,
  confirmed: 0,
  scheduled: 0,
  aired: 0,
  accepted: 0,
  committed: 0,
  paid: 0,
});

function addCell(target: WeekCellMetrics, src?: WeekCellMetrics) {
  if (!src) return;
  target.planQty += src.planQty || 0;
  target.planBudget += src.planBudget || 0;
  target.listed += src.listed || 0;
  target.confirmed += src.confirmed || 0;
  target.scheduled += src.scheduled || 0;
  target.aired += src.aired || 0;
  target.accepted += src.accepted || 0;
  target.committed += src.committed || 0;
  target.paid += src.paid || 0;
}

export interface PlanActualReportViewProps {
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  allowedStoreNames?: string[];
  onOpenPlanForStore?: (params: {
    planId?: string;
    storeId?: string;
    storeName?: string;
    brandName?: string;
    month: string;
  }) => void;
  onOpenListingForStore?: (params: {
    planId?: string;
    storeName?: string;
    brandName?: string;
    month: string;
  }) => void;
}

export const PlanActualReportView: React.FC<PlanActualReportViewProps> = ({
  onNotify,
  allowedStoreNames,
  onOpenPlanForStore,
  onOpenListingForStore,
}) => {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc phạm vi
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState<'ALL' | 'TikTok Shop' | 'Shopee Mall'>('ALL');
  const [selectedPic, setSelectedPic] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState<StoreFilterState>('ALL');
  const [selectedWeekCode, setSelectedWeekCode] = useState<string>('ALL');

  // Chế độ hiển thị ma trận tuần
  const [matrixDim, setMatrixDim] = useState<MatrixDimension>('CHANNEL');
  const [matrixMetric, setMatrixMetric] = useState<MatrixMetric>('QTY');

  // Modal chi tiết gian hàng
  const [detail, setDetail] = useState<PlanActualStoreReport | null>(null);
  const [section, setSection] = useState<DetailSection>('week_channel');

  const requestSeq = useRef(0);
  const fetchReport = useCallback(
    async (m: string) => {
      const seq = ++requestSeq.current;
      try {
        const res = await fetch(`/api/plan-actual-report${m ? `?month=${encodeURIComponent(m)}` : ''}`, {
          cache: 'no-store',
        });
        const body = (await res.json().catch(() => null)) as (ReportResponse & { error?: string }) | null;
        if (seq !== requestSeq.current) return;
        if (!res.ok || !body) throw new Error(body?.error || 'Không tải được báo cáo.');
        setData(body);
        setMonth(body.month);
        setSelectedWeekCode('ALL');
        setError('');
      } catch (e) {
        if (seq !== requestSeq.current) return;
        const msg = e instanceof Error ? e.message : 'Không tải được báo cáo.';
        setData(prev => (prev ? { ...prev, reports: [] } : prev));
        setError(msg);
        onNotify?.(msg, 'error');
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [onNotify]
  );

  useEffect(() => {
    void fetchReport('');
  }, [fetchReport]);

  const load = (m: string) => {
    setLoading(true);
    setMonth(m);
    void fetchReport(m);
  };

  // Phạm vi gian hàng được phép xem
  const scopedReports = useMemo(() => {
    const list = data?.reports ?? [];
    if (!allowedStoreNames || allowedStoreNames.length === 0) return list;
    return list.filter(r => allowedStoreNames.includes(r.storeName));
  }, [data, allowedStoreNames]);

  // Danh sách Thương hiệu & Nhân sự PIC trong phạm vi
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of scopedReports) {
      if (r.brandName) set.add(r.brandName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [scopedReports]);

  const picOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of scopedReports) {
      if (r.pic) set.add(r.pic);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [scopedReports]);

  // Áp bộ lọc Thương hiệu, Sàn, PIC, Tìm kiếm (dùng chung cho KPI, Ma trận tuần và Bảng gian hàng)
  const baseFilteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedReports.filter(r => {
      if (selectedBrand !== 'ALL' && r.brandName !== selectedBrand) return false;
      if (selectedPlatform !== 'ALL' && r.platform !== selectedPlatform) return false;
      if (selectedPic !== 'ALL' && r.pic !== selectedPic) return false;
      if (q) {
        const matchStore = r.storeName.toLowerCase().includes(q);
        const matchBrand = r.brandName.toLowerCase().includes(q);
        const matchPic = (r.pic || '').toLowerCase().includes(q);
        if (!matchStore && !matchBrand && !matchPic) return false;
      }
      return true;
    });
  }, [scopedReports, selectedBrand, selectedPlatform, selectedPic, searchQuery]);

  // Đếm số lượng theo từng trạng thái cho Chips lọc nhanh
  const filterCounts = useMemo(() => {
    let running = 0;
    let overdue = 0;
    let noWeekly = 0;
    let overbudget = 0;
    let done = 0;
    for (const r of baseFilteredReports) {
      if (r.state === 'running') running += 1;
      if (r.state === 'overdue') overdue += 1;
      if (!r.hasWeeklyPlan) noWeekly += 1;
      if (r.budget.isOver || r.budget.isUnbudgeted) overbudget += 1;
      if (r.state === 'done') done += 1;
    }
    return {
      all: baseFilteredReports.length,
      running,
      overdue,
      noWeekly,
      overbudget,
      done,
    };
  }, [baseFilteredReports]);

  // Danh sách gian hàng sau khi áp thêm chip trạng thái và tuần đang chọn
  const reports = useMemo(() => {
    return baseFilteredReports.filter(r => {
      if (storeFilter === 'RUNNING' && r.state !== 'running') return false;
      if (storeFilter === 'OVERDUE' && r.state !== 'overdue') return false;
      if (storeFilter === 'NO_WEEKLY' && r.hasWeeklyPlan) return false;
      if (storeFilter === 'OVERBUDGET' && !r.budget.isOver && !r.budget.isUnbudgeted) return false;
      if (storeFilter === 'DONE' && r.state !== 'done') return false;
      if (selectedWeekCode !== 'ALL') {
        const wk = r.weeks.find(w => w.weekCode === selectedWeekCode);
        if (!wk || (wk.planQty === 0 && wk.scheduled === 0 && wk.aired === 0)) return false;
      }
      return true;
    });
  }, [baseFilteredReports, storeFilter, selectedWeekCode]);

  // Tổng hợp KPI tổng thể từ tập gian hàng đang lọc
  const totals = useMemo(() => {
    const t = {
      planQty: 0,
      listed: 0,
      waitBrand: 0,
      negotiating: 0,
      confirmed: 0,
      jobs: 0,
      scheduled: 0,
      aired: 0,
      accepted: 0,
      planBudget: 0,
      committed: 0,
      paid: 0,
      dueQty: 0,
      dueAired: 0,
      weeklyStores: 0,
      overdue: 0,
      overbudgetStores: 0,
      onTime: 0,
      early: 0,
      late: 0,
      pending: 0,
    };
    for (const r of baseFilteredReports) {
      t.planQty += r.total.planQty;
      t.listed += r.total.listed;
      t.waitBrand += r.funnel?.waitBrandQty || 0;
      t.negotiating += r.funnel?.negotiatingQty || 0;
      t.confirmed += r.total.confirmed;
      t.jobs += r.total.jobs;
      t.scheduled += r.funnel?.scheduledJobQty || 0;
      t.aired += r.total.aired;
      t.accepted += r.total.accepted;
      t.planBudget += r.budget.plan;
      t.committed += r.budget.committed;
      t.paid += r.budget.paid;
      if (r.hasWeeklyPlan) {
        t.weeklyStores += 1;
        t.dueQty += r.dueToDate.planQty;
        t.dueAired += r.dueToDate.aired;
      }
      if (r.state === 'overdue') t.overdue += 1;
      if (r.budget.isOver || r.budget.isUnbudgeted) t.overbudgetStores += 1;
      for (const w of r.weeks) {
        t.onTime += w.onTime || 0;
        t.early += w.early || 0;
        t.late += w.late || 0;
        t.pending += w.pending || 0;
      }
    }
    return t;
  }, [baseFilteredReports]);

  // Tổng hợp 3 Đợt Listing (Ngày 10 / 20 / 30) trên toàn phạm vi lọc
  const aggregatedBatches = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        dueDate: string;
        targetQty: number;
        targetBudget: number;
        listed: number;
        confirmed: number;
        committed: number;
      }
    >();
    for (const r of baseFilteredReports) {
      for (const b of r.batches) {
        let cur = map.get(b.key);
        if (!cur) {
          cur = {
            key: b.key,
            label: b.label,
            dueDate: b.dueDate,
            targetQty: 0,
            targetBudget: 0,
            listed: 0,
            confirmed: 0,
            committed: 0,
          };
          map.set(b.key, cur);
        }
        cur.targetQty += b.targetQty;
        cur.targetBudget += b.targetBudget;
        cur.listed += b.listed;
        cur.confirmed += b.confirmed;
        cur.committed += b.committed;
      }
    }
    const todayStr = data?.today || '';
    return Array.from(map.values()).map((b): BatchActualRow => {
      const state: ProgressState =
        b.targetQty <= 0
          ? 'none'
          : b.listed >= b.targetQty
            ? 'done'
            : b.dueDate && todayStr > b.dueDate
              ? 'overdue'
              : 'running';
      return { ...b, state };
    });
  }, [baseFilteredReports, data?.today]);

  // Tổng hợp dữ liệu theo từng Tuần (W40..W45 hoặc W45..W49)
  const aggregatedWeeks = useMemo<AggregatedWeekSummary[]>(() => {
    const weekMap = new Map<string, AggregatedWeekSummary>();
    const todayStr = data?.today || '';

    for (const r of baseFilteredReports) {
      for (const w of r.weeks) {
        const code = w.weekCode || w.week.split(' ')[0].toUpperCase();
        let agg = weekMap.get(code);
        if (!agg) {
          agg = {
            week: w.week,
            weekCode: code,
            start: w.start,
            end: w.end,
            planQty: 0,
            planBudget: 0,
            scheduled: 0,
            aired: 0,
            accepted: 0,
            committed: 0,
            paid: 0,
            onTime: 0,
            early: 0,
            late: 0,
            pending: 0,
            state: 'none',
            byChannel: {
              CAST_PAID: emptyCell(),
              FOC_SAMPLE: emptyCell(),
              SELF_CHANNEL: emptyCell(),
              MULTI_PLATFORM: emptyCell(),
              LIVESTREAM: emptyCell(),
            },
            byTier: Object.fromEntries(
              TIER_DISPLAY_ORDER.map(t => [t.key, emptyCell()])
            ) as Record<QuotaKey, WeekCellMetrics>,
          };
          weekMap.set(code, agg);
        }
        agg.planQty += w.planQty;
        agg.planBudget += w.planBudget;
        agg.scheduled += w.scheduled;
        agg.aired += w.aired;
        agg.accepted += w.accepted || 0;
        agg.committed += w.committed || 0;
        agg.paid += w.paid || 0;
        agg.onTime += w.onTime || 0;
        agg.early += w.early || 0;
        agg.late += w.late || 0;
        agg.pending += w.pending || 0;

        if (w.byChannel) {
          for (const ch of PLAN_CHANNEL_SPECS) {
            addCell(agg.byChannel[ch.key], w.byChannel[ch.key]);
          }
        }
        if (w.byTier) {
          for (const td of TIER_DISPLAY_ORDER) {
            addCell(agg.byTier[td.key], w.byTier[td.key]);
          }
        }
      }
    }

    const sorted = Array.from(weekMap.values()).sort((a, b) => a.start.localeCompare(b.start));
    for (const w of sorted) {
      if (w.planQty === 0 && w.aired === 0) w.state = 'none';
      else if (todayStr && w.end < todayStr) w.state = w.aired >= w.planQty ? 'done' : 'overdue';
      else if (todayStr && w.start <= todayStr) w.state = w.planQty > 0 && w.aired >= w.planQty ? 'done' : 'running';
      else w.state = 'upcoming';
    }
    return sorted;
  }, [baseFilteredReports, data?.today]);

  // Xây dựng dữ liệu Ma trận (Kênh × Tuần hoặc Bậc KL KOC × Tuần)
  const matrixRows = useMemo<MatrixRowItem[]>(() => {
    const rows: MatrixRowItem[] = [];

    if (matrixDim === 'CHANNEL') {
      const channelTotals = new Map<PlanChannelKey, ChannelActualRow>();
      for (const spec of PLAN_CHANNEL_SPECS) {
        channelTotals.set(spec.key, {
          key: spec.key,
          label: spec.label,
          shortLabel: spec.shortLabel,
          unit: spec.unit,
          planQty: 0,
          planBudget: 0,
          listed: 0,
          confirmed: 0,
          jobs: 0,
          scheduled: 0,
          aired: 0,
          accepted: 0,
          committed: 0,
          paid: 0,
        });
      }

      for (const r of baseFilteredReports) {
        for (const ch of r.channels || []) {
          const acc = channelTotals.get(ch.key);
          if (!acc) continue;
          acc.planQty += ch.planQty;
          acc.planBudget += ch.planBudget;
          acc.listed += ch.listed;
          acc.confirmed += ch.confirmed;
          acc.jobs += ch.jobs;
          acc.scheduled += ch.scheduled;
          acc.aired += ch.aired;
          acc.accepted += ch.accepted;
          acc.committed += ch.committed;
          acc.paid += ch.paid;
        }
      }

      for (const spec of PLAN_CHANNEL_SPECS) {
        const tot = channelTotals.get(spec.key)!;
        const weeksRecord: Record<string, WeekCellMetrics> = {};
        for (const w of aggregatedWeeks) {
          weeksRecord[w.weekCode] = w.byChannel[spec.key] || emptyCell();
        }
        rows.push({
          id: spec.key,
          label: spec.label,
          shortLabel: spec.shortLabel,
          unit: spec.unit,
          planQty: tot.planQty,
          planBudget: tot.planBudget,
          listed: tot.listed,
          confirmed: tot.confirmed,
          jobs: tot.jobs,
          scheduled: tot.scheduled,
          aired: tot.aired,
          accepted: tot.accepted,
          committed: tot.committed,
          paid: tot.paid,
          weeks: weeksRecord,
        });
      }
    } else {
      const tierTotals = new Map<QuotaKey, TierActualRow>();
      for (const td of TIER_DISPLAY_ORDER) {
        tierTotals.set(td.key, {
          key: td.key,
          label: td.label,
          planQty: 0,
          planBudget: 0,
          listed: 0,
          confirmed: 0,
          jobs: 0,
          scheduled: 0,
          aired: 0,
          accepted: 0,
          committed: 0,
          paid: 0,
        });
      }

      for (const r of baseFilteredReports) {
        for (const tr of r.tiers || []) {
          const acc = tierTotals.get(tr.key);
          if (!acc) continue;
          acc.planQty += tr.planQty;
          acc.planBudget += tr.planBudget;
          acc.listed += tr.listed;
          acc.confirmed += tr.confirmed;
          acc.jobs += tr.jobs;
          acc.scheduled = (acc.scheduled || 0) + (tr.scheduled || 0);
          acc.aired += tr.aired;
          acc.accepted += tr.accepted;
          acc.committed += tr.committed;
          acc.paid += tr.paid;
        }
      }

      for (const td of TIER_DISPLAY_ORDER) {
        const tot = tierTotals.get(td.key)!;
        const weeksRecord: Record<string, WeekCellMetrics> = {};
        for (const w of aggregatedWeeks) {
          weeksRecord[w.weekCode] = w.byTier[td.key] || emptyCell();
        }
        rows.push({
          id: td.key,
          label: td.label,
          shortLabel: td.shortLabel,
          unit: 'video',
          planQty: tot.planQty,
          planBudget: tot.planBudget,
          listed: tot.listed,
          confirmed: tot.confirmed,
          jobs: tot.jobs,
          scheduled: tot.scheduled || 0,
          aired: tot.aired,
          accepted: tot.accepted,
          committed: tot.committed,
          paid: tot.paid,
          weeks: weeksRecord,
        });
      }
    }

    // Dòng tổng cộng cuối bảng ma trận
    const totalWeeks: Record<string, WeekCellMetrics> = {};
    for (const w of aggregatedWeeks) {
      const c = emptyCell();
      for (const r of rows) {
        addCell(c, r.weeks[w.weekCode]);
      }
      totalWeeks[w.weekCode] = c;
    }

    const summaryRow: MatrixRowItem = {
      id: 'TOTAL_ROW',
      label: 'Tổng cộng toàn phạm vi',
      shortLabel: 'Tổng cộng',
      unit: 'video',
      planQty: rows.reduce((s, r) => s + r.planQty, 0),
      planBudget: rows.reduce((s, r) => s + r.planBudget, 0),
      listed: rows.reduce((s, r) => s + r.listed, 0),
      confirmed: rows.reduce((s, r) => s + r.confirmed, 0),
      jobs: rows.reduce((s, r) => s + r.jobs, 0),
      scheduled: rows.reduce((s, r) => s + r.scheduled, 0),
      aired: rows.reduce((s, r) => s + r.aired, 0),
      accepted: rows.reduce((s, r) => s + r.accepted, 0),
      committed: rows.reduce((s, r) => s + r.committed, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      weeks: totalWeeks,
      isTotal: true,
    };

    return [...rows, summaryRow];
  }, [matrixDim, baseFilteredReports, aggregatedWeeks]);

  // Cột của bảng Ma trận (Kênh / Bậc KL × Tuần)
  const matrixColumns = useMemo<Column<MatrixRowItem>[]>(() => {
    const baseCols: Column<MatrixRowItem>[] = [
      {
        key: 'label',
        header: matrixDim === 'CHANNEL' ? 'Kênh triển khai' : 'Bậc KOC / Nguồn video',
        width: 190,
        render: r => (
          <div>
            <div className={r.isTotal ? 'font-semibold text-ink' : 'font-medium text-ink'}>
              {r.label}
            </div>
            {!r.isTotal && (
              <div className="text-2xs text-ink-3">
                Tỷ trọng KH: {safePct(r.planQty, totals.planQty || 1)}% số lượng
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'planTotal',
        header: 'Kế hoạch tháng',
        align: 'right',
        width: 125,
        render: r => (
          <div className="tabular-nums">
            <div className="font-medium text-ink">
              {formatNumber(r.planQty)} {r.unit}
            </div>
            {sub(r.planBudget > 0 ? formatVndShort(r.planBudget) : '0đ (Miễn phí)')}
          </div>
        ),
      },
      {
        key: 'funnelPrep',
        header: 'Listing → Chốt → Book',
        align: 'right',
        width: 145,
        render: r => (
          <div className="tabular-nums">
            <div>
              List <span className="font-medium text-ink">{formatNumber(r.listed)}</span> · Chốt{' '}
              <span className="font-medium text-positive">{formatNumber(r.confirmed)}</span>
            </div>
            {sub(`Lên BO/Job: ${formatNumber(r.jobs)} · Hẹn: ${formatNumber(r.scheduled)}`)}
          </div>
        ),
      },
    ];

    const weekCols: Column<MatrixRowItem>[] = aggregatedWeeks.map(w => ({
      key: `wk_${w.weekCode}`,
      header: (
        <div className="text-right">
          <div className={selectedWeekCode === w.weekCode ? 'text-accent font-semibold' : 'text-ink'}>
            {w.weekCode}
          </div>
          <div className="text-2xs font-normal text-ink-3">
            {formatDate(w.start).slice(0, 5)}–{formatDate(w.end).slice(0, 5)}
          </div>
        </div>
      ),
      align: 'right',
      width: 120,
      className: selectedWeekCode === w.weekCode ? 'bg-accent-soft/25' : undefined,
      render: r => {
        const cell = r.weeks[w.weekCode] || emptyCell();
        const isEmpty =
          cell.planQty === 0 &&
          cell.planBudget === 0 &&
          cell.scheduled === 0 &&
          cell.aired === 0 &&
          cell.committed === 0;
        if (isEmpty) {
          return <span className="text-ink-3">—</span>;
        }
        if (matrixMetric === 'QTY') {
          const pct = safePct(cell.aired, cell.planQty);
          const isOverdueCell = w.state === 'overdue' && cell.planQty > 0 && cell.aired < cell.planQty;
          return (
            <div className="space-y-1 tabular-nums">
              <div className="flex items-center justify-end gap-2">
                <span
                  className={
                    cell.planQty > 0 && cell.aired >= cell.planQty
                      ? 'text-positive font-medium'
                      : isOverdueCell
                        ? 'text-critical font-medium'
                        : 'text-ink'
                  }
                >
                  {formatNumber(cell.aired)}
                </span>
                <span className="text-ink-3">/</span>
                <span className="text-ink-2">{formatNumber(cell.planQty)}</span>
              </div>
              <Progress
                value={cell.aired}
                max={Math.max(1, cell.planQty || cell.aired)}
                target={1}
                label={`${w.weekCode} ${r.shortLabel}`}
              />
              <div className="text-2xs text-ink-3">
                {cell.scheduled > 0 ? `Hẹn ${formatNumber(cell.scheduled)}` : `Đạt ${pct}%`}
                {cell.planBudget > 0 ? ` · ${formatVndShort(cell.planBudget)}` : ''}
              </div>
            </div>
          );
        }

        // Chế độ xem Ngân sách Net (VNĐ)
        const overBudgetCell = cell.planBudget > 0 && cell.committed > cell.planBudget;
        return (
          <div className="space-y-1 tabular-nums">
            <div className={overBudgetCell ? 'text-critical font-medium' : 'text-ink'}>
              {formatVndShort(cell.committed)}
            </div>
            <Progress
              value={cell.committed}
              max={Math.max(1, cell.planBudget || cell.committed)}
              target={1}
              invert
              label={`${w.weekCode} ${r.shortLabel} ngân sách`}
            />
            <div className="text-2xs text-ink-3">
              KH {formatVndShort(cell.planBudget)} · Air {formatNumber(cell.aired)}/{formatNumber(cell.planQty)}
            </div>
          </div>
        );
      },
    }));

    const tailCols: Column<MatrixRowItem>[] = [
      {
        key: 'airedTotal',
        header: 'Tổng Đã Air / KH',
        align: 'right',
        width: 145,
        render: r => (
          <div className="space-y-1 tabular-nums">
            <div className="font-medium text-ink">
              {formatNumber(r.aired)} / {formatNumber(r.planQty)}{' '}
              <span className="text-2xs text-ink-3">({safePct(r.aired, r.planQty)}%)</span>
            </div>
            <Progress
              value={r.aired}
              max={Math.max(1, r.planQty || r.aired)}
              target={1}
              label={`Tổng air ${r.shortLabel}`}
            />
            {sub(`Nghiệm thu: ${formatNumber(r.accepted)}`)}
          </div>
        ),
      },
      {
        key: 'budgetTotal',
        header: 'Cam kết / Trần Net',
        align: 'right',
        width: 155,
        render: r => {
          const isOver = r.planBudget > 0 && r.committed > r.planBudget;
          return (
            <div className="space-y-1 tabular-nums">
              <div className={isOver ? 'text-critical font-medium' : 'text-ink'}>
                {formatVndShort(r.committed)} / {formatVndShort(r.planBudget)}
              </div>
              <Progress
                value={r.committed}
                max={Math.max(1, r.planBudget || r.committed)}
                target={1}
                invert
                label={`Ngân sách ${r.shortLabel}`}
              />
              {sub(`Đã chi: ${formatVndShort(r.paid)}`)}
            </div>
          );
        },
      },
    ];

    return [...baseCols, ...weekCols, ...tailCols];
  }, [matrixDim, matrixMetric, aggregatedWeeks, selectedWeekCode, totals.planQty]);

  // Cột của bảng Tiến độ từng gian hàng
  const storeColumns: Column<PlanActualStoreReport>[] = [
    {
      key: 'store',
      header: 'Gian hàng',
      width: 210,
      render: r => (
        <div>
          <div className="font-medium text-ink">{r.storeName}</div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-2xs text-ink-3">
            <span>{r.brandName}</span>
            <span>·</span>
            <span>{r.platform}</span>
            {r.pic && (
              <>
                <span>·</span>
                <Person name={r.pic} size={16} />
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Kế hoạch tháng',
      align: 'right',
      width: 115,
      render: r => (
        <div className="tabular-nums">
          <div className="font-medium text-ink">{formatNumber(r.total.planQty)} video</div>
          {sub(formatVndShort(r.budget.plan))}
        </div>
      ),
    },
    {
      key: 'funnel',
      header: 'Listing → Chốt → Book',
      align: 'right',
      width: 150,
      render: r => (
        <div className="tabular-nums">
          <div>
            List <span className="font-medium text-ink">{formatNumber(r.total.listed)}</span> · Chốt{' '}
            <span className="font-medium text-positive">{formatNumber(r.total.confirmed)}</span>
          </div>
          {sub(
            `Đã book ${formatNumber(r.total.jobs)} job${
              r.total.listed > 0 ? ` · Tỷ lệ chốt ${safePct(r.total.confirmed, r.total.listed)}%` : ''
            }`
          )}
        </div>
      ),
    },
    {
      key: 'weeklyStrip',
      header: 'Thực thi theo tuần (Air / KH)',
      width: 265,
      render: r => {
        if (!r.hasWeeklyPlan && r.total.aired === 0) {
          return <span className="text-ink-3 text-2xs">Chưa nhập phân rã tuần 4.1.1</span>;
        }
        return (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {r.weeks.map(w => {
              const activeWk = selectedWeekCode === w.weekCode;
              const toneClass =
                w.planQty === 0 && w.aired === 0
                  ? 'bg-sunken/50 text-ink-3 border-line'
                  : w.aired >= w.planQty && w.planQty > 0
                    ? 'bg-positive-soft text-positive border-line'
                    : w.state === 'overdue'
                      ? 'bg-critical-soft text-critical border-line'
                      : w.aired > 0 || w.scheduled > 0
                        ? 'bg-accent-soft text-accent border-line'
                        : 'bg-canvas text-ink-2 border-line';
              return (
                <div
                  key={w.weekCode}
                  className={`px-2 py-1 rounded border text-center tabular-nums ${toneClass} ${
                    activeWk ? 'ring-1 ring-ink' : ''
                  }`}
                  title={`${w.week}: Đã air ${w.aired} / Kế hoạch ${w.planQty} (Hẹn ${w.scheduled})`}
                >
                  <div className="text-2xs font-medium leading-none">{w.weekCode}</div>
                  <div className="text-2xs mt-0.5 leading-none">
                    {w.aired}/{w.planQty}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'pace',
      header: 'Air đến tuần trước',
      width: 145,
      render: r =>
        !r.hasWeeklyPlan ? (
          <span className="text-ink-3">Chưa phân rã tuần</span>
        ) : r.dueToDate.lastEndedWeekEnd ? (
          <Bar
            value={r.dueToDate.aired}
            max={r.dueToDate.planQty}
            text={`${formatNumber(r.dueToDate.aired)} / ${formatNumber(r.dueToDate.planQty)}`}
          />
        ) : (
          <span className="text-ink-3">Chưa hết tuần đầu</span>
        ),
    },
    {
      key: 'aired',
      header: 'Tổng Đã Air',
      align: 'right',
      width: 120,
      render: r => (
        <div className="tabular-nums">
          <div className="font-medium text-ink">
            {formatNumber(r.total.aired)} / {formatNumber(r.total.planQty)}
          </div>
          {sub(
            `Nghiệm thu ${formatNumber(r.total.accepted)}${
              r.total.aired > 0 ? ` (${safePct(r.total.accepted, r.total.aired)}%)` : ''
            }`
          )}
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Cam kết / Trần Net',
      width: 155,
      render: r =>
        r.budget.isUnbudgeted ? (
          <div className="text-critical tabular-nums">
            {formatVndShort(r.budget.committed)}
            {sub('Kế hoạch 0đ (Ngoài KH)')}
          </div>
        ) : (
          <div>
            <Bar
              value={r.budget.committed}
              max={r.budget.plan}
              invert
              text={`${formatVndShort(r.budget.committed)} / ${formatVndShort(r.budget.plan)}`}
            />
            {sub(`Đã chi ${formatVndShort(r.budget.paid)}`)}
          </div>
        ),
    },
    { key: 'state', header: 'Trạng thái', width: 115, render: r => <StateTag state={r.state} /> },
  ];

  // Cột trong Modal chi tiết gian hàng: 1) Kênh × Tuần, 2) Bậc KL × Tuần, 3) Đợt 10/20/30, 4) Danh sách Deal
  const storeDetailChannelMatrix = useMemo<MatrixRowItem[]>(() => {
    if (!detail) return [];
    const rows: MatrixRowItem[] = detail.channels.map(ch => {
      const weeksMap: Record<string, WeekCellMetrics> = {};
      for (const w of detail.weeks) {
        weeksMap[w.weekCode] = w.byChannel?.[ch.key] || emptyCell();
      }
      return {
        id: ch.key,
        label: ch.label,
        shortLabel: ch.shortLabel,
        unit: ch.unit,
        planQty: ch.planQty,
        planBudget: ch.planBudget,
        listed: ch.listed,
        confirmed: ch.confirmed,
        jobs: ch.jobs,
        scheduled: ch.scheduled,
        aired: ch.aired,
        accepted: ch.accepted,
        committed: ch.committed,
        paid: ch.paid,
        weeks: weeksMap,
      };
    });
    return rows;
  }, [detail]);

  const storeDetailTierMatrix = useMemo<MatrixRowItem[]>(() => {
    if (!detail) return [];
    return detail.tiers.map(tr => {
      const weeksMap: Record<string, WeekCellMetrics> = {};
      for (const w of detail.weeks) {
        weeksMap[w.weekCode] = w.byTier?.[tr.key] || emptyCell();
      }
      return {
        id: tr.key,
        label: tr.label,
        shortLabel: tr.key,
        unit: 'video',
        planQty: tr.planQty,
        planBudget: tr.planBudget,
        listed: tr.listed,
        confirmed: tr.confirmed,
        jobs: tr.jobs,
        scheduled: tr.scheduled || 0,
        aired: tr.aired,
        accepted: tr.accepted,
        committed: tr.committed,
        paid: tr.paid,
        weeks: weeksMap,
      };
    });
  }, [detail]);

  const buildStoreDetailWeekColumns = (weeks: WeekActualRow[]): Column<MatrixRowItem>[] => [
    {
      key: 'name',
      header: 'Hạng mục',
      width: 170,
      render: r => <div className="font-medium text-ink">{r.label}</div>,
    },
    {
      key: 'plan',
      header: 'Kế hoạch',
      align: 'right',
      render: r => (
        <div className="tabular-nums">
          <div>{formatNumber(r.planQty)}</div>
          {sub(formatVndShort(r.planBudget))}
        </div>
      ),
    },
    {
      key: 'listed',
      header: 'List / Chốt',
      align: 'right',
      render: r => (
        <div className="tabular-nums">
          <div>
            {formatNumber(r.listed)} / {formatNumber(r.confirmed)}
          </div>
          {sub(`Job: ${formatNumber(r.jobs)}`)}
        </div>
      ),
    },
    ...weeks.map(
      (w): Column<MatrixRowItem> => ({
        key: `dw_${w.weekCode}`,
        header: (
          <div className="text-right">
            <div>{w.weekCode}</div>
            <div className="text-2xs font-normal text-ink-3">
              {formatDate(w.start).slice(0, 5)}–{formatDate(w.end).slice(0, 5)}
            </div>
          </div>
        ),
        align: 'right',
        render: r => {
          const c = r.weeks[w.weekCode] || emptyCell();
          if (c.planQty === 0 && c.aired === 0 && c.scheduled === 0) {
            return <span className="text-ink-3">—</span>;
          }
          return (
            <div className="tabular-nums">
              <div className={c.planQty > 0 && c.aired >= c.planQty ? 'text-positive font-medium' : 'text-ink'}>
                {formatNumber(c.aired)} / {formatNumber(c.planQty)}
              </div>
              {sub(c.scheduled > 0 ? `Hẹn ${c.scheduled}` : formatVndShort(c.planBudget))}
            </div>
          );
        },
      })
    ),
    {
      key: 'aired',
      header: 'Đã air / Nghiệm thu',
      align: 'right',
      render: r => (
        <div className="tabular-nums">
          <div className="font-medium text-ink">
            {formatNumber(r.aired)} / {formatNumber(r.planQty)}
          </div>
          {sub(`Nghiệm thu ${formatNumber(r.accepted)}`)}
        </div>
      ),
    },
    {
      key: 'committed',
      header: 'Cam kết / Đã chi',
      align: 'right',
      render: r => (
        <div className="tabular-nums">
          <div className={r.planBudget > 0 && r.committed > r.planBudget ? 'text-critical font-medium' : 'text-ink'}>
            {formatVndShort(r.committed)}
          </div>
          {sub(`Đã chi ${formatVndShort(r.paid)}`)}
        </div>
      ),
    },
  ];

  const batchColumns: Column<BatchActualRow>[] = [
    {
      key: 'batch',
      header: 'Đợt Listing',
      render: b => (
        <div>
          <div className="font-medium text-ink">{b.label}</div>
          {sub(b.dueDate ? `Hạn ${formatDate(b.dueDate)}` : 'Chưa có hạn')}
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Chỉ tiêu đợt',
      align: 'right',
      render: b => (
        <div className="tabular-nums">
          <div>{formatNumber(b.targetQty)} video</div>
          {sub(formatVndShort(b.targetBudget))}
        </div>
      ),
    },
    {
      key: 'listed',
      header: 'Đã list / Chỉ tiêu',
      width: 160,
      render: b => (
        <Bar
          value={b.listed}
          max={b.targetQty}
          text={`${formatNumber(b.listed)} / ${formatNumber(b.targetQty)}`}
        />
      ),
    },
    {
      key: 'confirmed',
      header: 'Đã chốt KOC',
      align: 'right',
      render: b => <span className="tabular-nums font-medium text-positive">{formatNumber(b.confirmed)}</span>,
    },
    {
      key: 'committed',
      header: 'Ngân sách đang list',
      align: 'right',
      render: b => <span className="tabular-nums">{formatVndShort(b.committed)}</span>,
    },
    { key: 'state', header: 'Trạng thái', render: b => <StateTag state={b.state} /> },
  ];

  const dealColumns: Column<StoreExecutionDealRow>[] = [
    {
      key: 'code',
      header: 'Mã BO / Job',
      render: d => (
        <div>
          <div className="font-code font-medium text-ink">{d.code}</div>
          {sub(d.pic || '—')}
        </div>
      ),
    },
    {
      key: 'koc',
      header: 'Kênh KOC & Sản phẩm',
      render: d => (
        <div>
          <div className="font-medium text-ink">@{d.kocHandle.replace(/^@/, '')}</div>
          {sub(d.productName || d.formatLabel)}
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Kênh & Bậc KL',
      render: d => (
        <div>
          <div className="text-ink-2">{d.formatLabel}</div>
          {sub(`Bậc ${d.tierKey}`)}
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Lịch hẹn Air',
      align: 'right',
      render: d => (
        <div className="tabular-nums">
          <div>{d.plannedWeek || '—'}</div>
          {sub(d.plannedAirDate ? formatDate(d.plannedAirDate) : 'Chưa hẹn ngày')}
        </div>
      ),
    },
    {
      key: 'actual',
      header: 'Thực tế Air',
      align: 'right',
      render: d => (
        <div className="tabular-nums">
          <div className={d.actualAirDate || d.linkAir ? 'text-positive font-medium' : 'text-ink-3'}>
            {d.actualWeek || (d.actualAirDate ? formatDate(d.actualAirDate) : 'Chưa air')}
          </div>
          {sub(
            d.actualAirDate
              ? `${formatDate(d.actualAirDate)} · ${
                  d.timingStatus === 'LATE'
                    ? 'Trễ lịch'
                    : d.timingStatus === 'EARLY'
                      ? 'Sớm lịch'
                      : 'Đúng lịch'
                }`
              : 'Đang chờ đăng'
          )}
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Chi phí Net',
      align: 'right',
      render: d => (
        <div className="tabular-nums">
          <div className="font-medium text-ink">{formatVndShort(d.feeNet)}</div>
          {sub(`Đã chi ${formatVndShort(d.paidAmount)}`)}
        </div>
      ),
    },
    {
      key: 'pipeline',
      header: 'Tiến độ hồ sơ',
      render: d => (
        <div className="flex items-center justify-between gap-2">
          <Status tone={d.accepted ? 'positive' : d.actualAirDate || d.linkAir ? 'info' : 'warning'}>
            {d.pipelineLabel}
          </Status>
          {d.linkAir && (
            <a
              href={d.linkAir}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-accent hover:underline inline-flex items-center gap-1 text-2xs"
            >
              Video <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ];

  const months = data?.months ?? [];

  // 5 bước trong Phễu Thực Thi Tổng Thể
  const funnelSteps = [
    {
      step: '1. Kế hoạch tháng (4.1.1)',
      qty: totals.planQty,
      pctOfPlan: 100,
      subText: `Trần Net: ${formatVndShort(totals.planBudget)} · ${formatNumber(totals.weeklyStores)}/${formatNumber(baseFilteredReports.length)} gian đã chia tuần`,
    },
    {
      step: '2. Đề xuất Listing KOC (3.1)',
      qty: totals.listed,
      pctOfPlan: safePct(totals.listed, totals.planQty),
      subText: `Chờ Brand: ${formatNumber(totals.waitBrand)} · Đang thương lượng: ${formatNumber(totals.negotiating)}`,
    },
    {
      step: '3. Brand duyệt & Chốt KOC',
      qty: totals.confirmed,
      pctOfPlan: safePct(totals.confirmed, totals.planQty),
      subText: `Tỷ lệ chốt từ Listing: ${safePct(totals.confirmed, totals.listed)}%`,
    },
    {
      step: '4. Lên BO/Deal & Hẹn tuần (3.2)',
      qty: totals.jobs,
      pctOfPlan: safePct(totals.jobs, totals.planQty),
      subText: `Cam kết: ${formatVndShort(totals.committed)} · Đã gán lịch: ${formatNumber(totals.scheduled)} job`,
    },
    {
      step: '5. Đã Air & Nghiệm thu ĐNTT',
      qty: totals.aired,
      pctOfPlan: safePct(totals.aired, totals.planQty),
      subText: `Nghiệm thu ĐNTT: ${formatNumber(totals.accepted)} video · Đã giải ngân: ${formatVndShort(totals.paid)}`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Thanh chọn Kỳ tháng & Bộ lọc phạm vi */}
      <Toolbar
        actions={
          (selectedBrand !== 'ALL' ||
            selectedPlatform !== 'ALL' ||
            selectedPic !== 'ALL' ||
            storeFilter !== 'ALL' ||
            selectedWeekCode !== 'ALL' ||
            Boolean(searchQuery.trim())) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedBrand('ALL');
                setSelectedPlatform('ALL');
                setSelectedPic('ALL');
                setStoreFilter('ALL');
                setSelectedWeekCode('ALL');
                setSearchQuery('');
              }}
            >
              Xóa bộ lọc
            </Button>
          )
        }
      >
        <Select
          aria-label="Chọn tháng"
          value={month}
          disabled={loading || months.length === 0}
          onChange={e => void load(e.target.value)}
          className="w-44"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Lọc thương hiệu"
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          className="w-48"
        >
          <option value="ALL">Tất cả thương hiệu ({brandOptions.length})</option>
          {brandOptions.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Lọc sàn TMĐT"
          value={selectedPlatform}
          onChange={e => setSelectedPlatform(e.target.value as 'ALL' | 'TikTok Shop' | 'Shopee Mall')}
          className="w-40"
        >
          <option value="ALL">Tất cả sàn</option>
          <option value="TikTok Shop">TikTok Shop</option>
          <option value="Shopee Mall">Shopee Mall</option>
        </Select>

        <Select
          aria-label="Lọc nhân sự phụ trách"
          value={selectedPic}
          onChange={e => setSelectedPic(e.target.value)}
          className="w-48"
        >
          <option value="ALL">Tất cả PIC ({picOptions.length})</option>
          {picOptions.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Toolbar>

      {/* Hàng 1: 4 Chỉ số KPI Tổng thể */}
      <StatRow size="sm">
        <Stat
          label="Kế hoạch & Tiến độ Air tháng"
          value={`${formatNumber(totals.aired)} / ${formatNumber(totals.planQty)}`}
          progress={{ value: totals.aired, max: Math.max(1, totals.planQty) }}
          note={`Đạt ${safePct(totals.aired, totals.planQty)}% KH · Đã lên BO: ${formatNumber(totals.jobs)} · Nghiệm thu: ${formatNumber(totals.accepted)}`}
        />
        <Stat
          label="Phễu Listing → Chốt KOC (3.1)"
          value={`${formatNumber(totals.confirmed)} / ${formatNumber(totals.listed)}`}
          progress={{ value: totals.confirmed, max: Math.max(1, totals.listed) }}
          note={`List đạt ${safePct(totals.listed, totals.planQty)}% KH · Chờ Brand: ${formatNumber(totals.waitBrand)} · Đang deal: ${formatNumber(totals.negotiating)}`}
        />
        <Stat
          label="Tiến độ đến tuần vừa khép"
          value={
            totals.weeklyStores > 0
              ? `${formatNumber(totals.dueAired)} / ${formatNumber(totals.dueQty)}`
              : '—'
          }
          progress={
            totals.weeklyStores > 0
              ? { value: totals.dueAired, max: Math.max(1, totals.dueQty) }
              : undefined
          }
          note={
            totals.weeklyStores === 0
              ? 'Chưa gian nào phân rã kế hoạch theo tuần'
              : totals.dueQty > totals.dueAired
                ? `Thiếu ${formatNumber(totals.dueQty - totals.dueAired)} video so với lịch tuần đã qua · ${formatNumber(totals.weeklyStores)} gian có lịch tuần`
                : `Đạt tiến độ lũy kế tuần · ${formatNumber(totals.weeklyStores)} gian có lịch tuần`
          }
          tone={totals.dueQty > totals.dueAired ? 'warning' : 'positive'}
        />
        <Stat
          label="Ngân sách Cam kết / Trần Net"
          value={`${formatVndShort(totals.committed)} / ${formatVndShort(totals.planBudget)}`}
          progress={{
            value: totals.committed,
            max: Math.max(1, totals.planBudget),
            invert: true,
          }}
          note={
            totals.committed > totals.planBudget
              ? `Vượt ${formatVndShort(totals.committed - totals.planBudget)} · Đã giải ngân ${formatVndShort(totals.paid)}`
              : `Đạt ${safePct(totals.committed, totals.planBudget)}% trần Net · Đã giải ngân ${formatVndShort(totals.paid)}`
          }
          tone={
            totals.committed > totals.planBudget || totals.overbudgetStores > 0
              ? 'critical'
              : undefined
          }
        />
      </StatRow>

      {/* Hàng 2: Phễu Thực Thi 5 Chặng & Tiến Độ 3 Đợt Listing (10/20/30) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Panel
          className="lg:col-span-7"
          icon={Layers}
          title="Đường đi thực thi 5 chặng (Kế hoạch → Listing → Chốt KOC → Lên BO → Air & Nghiệm thu)"
          meta={
            data?.today
              ? `Kỳ ${monthLabel(month)} · cập nhật ${formatDate(data.today)} · phạm vi ${baseFilteredReports.length} gian hàng`
              : undefined
          }
        >
          <div className="space-y-3">
            {funnelSteps.map(st => (
              <div
                key={st.step}
                className="p-3 rounded-lg border border-line bg-canvas/50 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-ink">{st.step}</span>
                  <span className="tabular-nums font-semibold text-ink">
                    {formatNumber(st.qty)} video{' '}
                    <span className="text-2xs font-normal text-ink-3">({st.pctOfPlan}%)</span>
                  </span>
                </div>
                <Progress
                  value={st.qty}
                  max={Math.max(1, totals.planQty)}
                  target={1}
                  label={st.step}
                />
                <div className="text-2xs text-ink-3">{st.subText}</div>
              </div>
            ))}

            {/* Điểm nghẽn tồn đọng hiện tại */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-lg bg-surface border border-line">
                <div className="text-2xs text-ink-3">Chờ Brand duyệt (3.1)</div>
                <div className="text-sm font-semibold tabular-nums text-warning mt-0.5">
                  {formatNumber(totals.waitBrand)} KOC
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <div className="text-2xs text-ink-3">Đã chốt chờ lên BO</div>
                <div className="text-sm font-semibold tabular-nums text-accent mt-0.5">
                  {formatNumber(Math.max(0, totals.confirmed - totals.jobs))} KOC
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <div className="text-2xs text-ink-3">Đã book chờ KOC đăng</div>
                <div className="text-sm font-semibold tabular-nums text-warning mt-0.5">
                  {formatNumber(Math.max(0, totals.jobs - totals.aired))} job
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-line">
                <div className="text-2xs text-ink-3">Đã air chờ nghiệm thu</div>
                <div className="text-sm font-semibold tabular-nums text-positive mt-0.5">
                  {formatNumber(Math.max(0, totals.aired - totals.accepted))} video
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-5"
          icon={CheckCircle2}
          title="Tiến độ 3 đợt Listing (10/20/30) & Kỷ luật lịch Air"
          meta="Định mức 60% (Ngày 10) · 30% (Ngày 20) · 10% (Ngày 30)"
        >
          <div className="space-y-3">
            <div className="space-y-3">
              {aggregatedBatches.map(b => (
                <div key={b.key} className="p-3 rounded-lg border border-line bg-canvas/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-ink">{b.label}</span>
                      {b.dueDate && (
                        <span className="ml-2 text-2xs text-ink-3">
                          Hạn {formatDate(b.dueDate)}
                        </span>
                      )}
                    </div>
                    <StateTag state={b.state} />
                  </div>
                  <Progress
                    value={b.listed}
                    max={Math.max(1, b.targetQty)}
                    target={1}
                    label={b.label}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-3 tabular-nums">
                    <span>
                      Đã list: <strong className="text-ink">{formatNumber(b.listed)}</strong> /{' '}
                      {formatNumber(b.targetQty)} ({safePct(b.listed, b.targetQty)}%)
                    </span>
                    <span>
                      Đã chốt: <strong className="text-positive">{formatNumber(b.confirmed)}</strong> ·{' '}
                      {formatVndShort(b.committed)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-xs font-semibold text-ink mb-2">
                Kỷ luật bám lịch Air theo tuần (File 3.2)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                <div className="p-3 rounded-lg bg-positive-soft/60 border border-line">
                  <div className="text-2xs text-ink-2">Đúng hạn tuần</div>
                  <div className="text-sm font-semibold text-positive mt-0.5">
                    {formatNumber(totals.onTime)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-accent-soft/60 border border-line">
                  <div className="text-2xs text-ink-2">Lên sóng sớm</div>
                  <div className="text-sm font-semibold text-accent mt-0.5">
                    {formatNumber(totals.early)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-critical-soft/60 border border-line">
                  <div className="text-2xs text-ink-2">Trễ lịch tuần</div>
                  <div className="text-sm font-semibold text-critical mt-0.5">
                    {formatNumber(totals.late)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-warning-soft/60 border border-line">
                  <div className="text-2xs text-ink-2">Hẹn chờ đăng</div>
                  <div className="text-sm font-semibold text-warning mt-0.5">
                    {formatNumber(totals.pending)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Hàng 3: Ma trận Trực quan Kế hoạch & Thực thi theo Tuần (Theo Kênh hoặc Theo Bậc KL KOC) */}
      <Panel
        flush
        icon={Calendar}
        title="Ma trận Kế hoạch & Thực thi theo Tuần — Từng Kênh & Bậc KL KOC"
        meta={
          aggregatedWeeks.length > 0
            ? `${aggregatedWeeks[0].weekCode} (${formatDate(aggregatedWeeks[0].start)}) – ${
                aggregatedWeeks[aggregatedWeeks.length - 1].weekCode
              } (${formatDate(aggregatedWeeks[aggregatedWeeks.length - 1].end)})`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<MatrixDimension>
              items={[
                { key: 'CHANNEL', label: 'Theo kênh (5 đầu việc)' },
                { key: 'KL_TIER', label: 'Theo bậc KOC (KL1–KL7 & FOC)' },
              ]}
              value={matrixDim}
              onChange={setMatrixDim}
            />
            <Segmented<MatrixMetric>
              items={[
                { key: 'QTY', label: 'Số lượng' },
                { key: 'BUDGET', label: 'Ngân sách Net' },
              ]}
              value={matrixMetric}
              onChange={setMatrixMetric}
            />
          </div>
        }
      >
        {/* Dải thẻ nhịp độ từng tuần (Bấm vào tuần để lọc/nhấn mạnh tuần đó) */}
        {aggregatedWeeks.length > 0 && (
          <div className="px-4 sm:px-4 pt-3 pb-4 border-b border-line bg-canvas/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {aggregatedWeeks.map(w => {
                const isSelected = selectedWeekCode === w.weekCode;
                const pct = safePct(w.aired, w.planQty);
                return (
                  <button
                    key={w.weekCode}
                    type="button"
                    onClick={() =>
                      setSelectedWeekCode(prev => (prev === w.weekCode ? 'ALL' : w.weekCode))
                    }
                    className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-surface border-ink ring-1 ring-ink'
                        : 'bg-surface border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{w.weekCode}</span>
                      <StateTag state={w.state} />
                    </div>
                    <div className="text-2xs text-ink-3 mt-0.5">
                      {formatDate(w.start).slice(0, 5)} – {formatDate(w.end).slice(0, 5)}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-1 tabular-nums">
                      <span className="text-sm font-semibold text-ink">
                        {matrixMetric === 'QTY'
                          ? `${formatNumber(w.aired)} / ${formatNumber(w.planQty)}`
                          : `${formatVndShort(w.committed)} / ${formatVndShort(w.planBudget)}`}
                      </span>
                      <span className="text-2xs text-ink-3">{pct}%</span>
                    </div>
                    <Progress
                      value={matrixMetric === 'QTY' ? w.aired : w.committed}
                      max={Math.max(
                        1,
                        matrixMetric === 'QTY' ? w.planQty || w.aired : w.planBudget || w.committed
                      )}
                      target={1}
                      invert={matrixMetric === 'BUDGET'}
                      label={`Tuần ${w.weekCode}`}
                      className="mt-2"
                    />
                    <div className="mt-2 flex items-center justify-between text-2xs text-ink-3 tabular-nums">
                      <span>Hẹn: {formatNumber(w.scheduled)}</span>
                      <span>{formatVndShort(w.planBudget)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DataTable
          columns={matrixColumns}
          rows={matrixRows}
          rowKey={r => r.id}
          loading={loading}
          rowClassName={r => (r.isTotal ? 'font-semibold bg-canvas/70' : undefined)}
          empty={<EmptyState title="Chưa có dữ liệu phân rã tuần trong kỳ này" />}
        />
      </Panel>

      {/* Hàng 4: Bảng Tiến độ Thực thi Từng Gian Hàng */}
      <Panel
        flush
        icon={ClipboardList}
        title={`Tiến độ thực thi từng gian hàng (${reports.length})`}
        actions={
          selectedWeekCode !== 'ALL' ? (
            <Button size="sm" variant="secondary" icon={Filter} onClick={() => setSelectedWeekCode('ALL')}>
              Đang lọc {selectedWeekCode} · Xem cả tháng
            </Button>
          ) : undefined
        }
      >
        <div className="px-4 sm:px-4 py-3 border-b border-line bg-surface">
          <FilterBar
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              placeholder: 'Tìm theo tên gian hàng, thương hiệu hoặc PIC phụ trách…',
            }}
            resultCount={reports.length}
            chips={
              <Chips<StoreFilterState>
                label="Trạng thái:"
                value={storeFilter}
                onChange={setStoreFilter}
                items={[
                  { key: 'ALL', label: 'Tất cả', count: filterCounts.all },
                  { key: 'RUNNING', label: 'Đang chạy', count: filterCounts.running },
                  { key: 'OVERDUE', label: 'Quá hạn tuần', count: filterCounts.overdue },
                  { key: 'NO_WEEKLY', label: 'Chưa chia tuần', count: filterCounts.noWeekly },
                  { key: 'OVERBUDGET', label: 'Vượt trần / Ngoài KH', count: filterCounts.overbudget },
                  { key: 'DONE', label: 'Hoàn tất', count: filterCounts.done },
                ]}
              />
            }
          />
        </div>

        <DataTable
          columns={storeColumns}
          rows={reports}
          rowKey={r => r.planId}
          loading={loading}
          onRowClick={r => {
            setDetail(r);
            setSection('week_channel');
          }}
          empty={
            <EmptyState
              title={error ? 'Chưa tải được báo cáo' : 'Không có gian hàng phù hợp bộ lọc'}
              description={error || 'Thử đổi bộ lọc trạng thái hoặc chọn kỳ kế hoạch khác.'}
            />
          }
        />
        {data?.today && (
          <p className="px-4 sm:px-4 py-3 border-t border-line text-2xs text-ink-3">
            Tính đến {formatDate(data.today)} · Nguồn: Bảng 4.1 Plan tổng, 4.1.1 Phân rã tuần, 3.1 Listing KOC và 3.2 List duyệt book.
          </p>
        )}
      </Panel>

      {/* Hộp thoại Chi tiết Kế hoạch & Thực thi của 1 Gian hàng */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.storeName} · ${monthLabel(detail.month)}` : ''}
        size="2xl"
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-canvas border border-line text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-3">Thương hiệu:</span>
                <strong className="text-ink">{detail.brandName}</strong>
                <span className="text-ink-3">·</span>
                <span className="text-ink-3">Sàn:</span>
                <strong className="text-ink">{detail.platform}</strong>
                {detail.pic && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span className="text-ink-3">PIC:</span>
                    <strong className="text-ink">{detail.pic}</strong>
                  </>
                )}
                <span className="text-ink-3">·</span>
                <StateTag state={detail.state} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenPlanForStore && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onOpenPlanForStore({
                        planId: detail.planId,
                        storeId: detail.storeId,
                        storeName: detail.storeName,
                        brandName: detail.brandName,
                        month: detail.month,
                      });
                      setDetail(null);
                    }}
                  >
                    Mở Kế hoạch tuần (4.1.1)
                  </Button>
                )}
                {onOpenListingForStore && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onOpenListingForStore({
                        planId: detail.planId,
                        storeName: detail.storeName,
                        brandName: detail.brandName,
                        month: detail.month,
                      });
                      setDetail(null);
                    }}
                  >
                    Mở Listing & Deal KOC
                  </Button>
                )}
              </div>
            </div>

            <StatRow size="sm">
              <Stat
                label="Kế hoạch & Đã Air"
                value={`${formatNumber(detail.total.aired)} / ${formatNumber(detail.total.planQty)}`}
                progress={{ value: detail.total.aired, max: Math.max(1, detail.total.planQty) }}
                note={`Nghiệm thu: ${formatNumber(detail.total.accepted)} video`}
              />
              <Stat
                label="Listing → Chốt → Book"
                value={`${formatNumber(detail.total.listed)} → ${formatNumber(detail.total.confirmed)} → ${formatNumber(detail.total.jobs)}`}
                note={`Chờ Brand: ${formatNumber(detail.funnel?.waitBrandQty || 0)} · Đang deal: ${formatNumber(detail.funnel?.negotiatingQty || 0)}`}
              />
              <Stat
                label="Air đến tuần trước"
                value={
                  detail.hasWeeklyPlan
                    ? `${formatNumber(detail.dueToDate.aired)} / ${formatNumber(detail.dueToDate.planQty)}`
                    : 'Chưa chia tuần'
                }
                note={
                  detail.dueToDate.lastEndedWeekEnd
                    ? `Tính đến ${formatDate(detail.dueToDate.lastEndedWeekEnd)}`
                    : 'Chưa khép tuần đầu'
                }
              />
              <Stat
                label="Cam kết / Trần Net"
                value={`${formatVndShort(detail.budget.committed)} / ${formatVndShort(detail.budget.plan)}`}
                note={`Đã giải ngân: ${formatVndShort(detail.budget.paid)}`}
                tone={detail.budget.isOver || detail.budget.isUnbudgeted ? 'critical' : undefined}
              />
            </StatRow>

            <Segmented<DetailSection>
              items={[
                { key: 'week_channel', label: 'Theo Kênh × Tuần' },
                { key: 'week_tier', label: 'Theo Bậc KL × Tuần' },
                { key: 'batches', label: 'Theo Đợt (10/20/30)' },
                { key: 'deals', label: `Danh sách Deal (${detail.deals.length})` },
              ]}
              value={section}
              onChange={setSection}
            />

            {section === 'week_channel' && (
              <DataTable
                columns={buildStoreDetailWeekColumns(detail.weeks)}
                rows={storeDetailChannelMatrix}
                rowKey={r => r.id}
                empty={<EmptyState title="Gian hàng chưa có chỉ tiêu theo kênh" />}
              />
            )}

            {section === 'week_tier' && (
              <DataTable
                columns={buildStoreDetailWeekColumns(detail.weeks)}
                rows={storeDetailTierMatrix}
                rowKey={r => r.id}
                empty={<EmptyState title="Gian hàng chưa có chỉ tiêu theo bậc KL" />}
              />
            )}

            {section === 'batches' && (
              <DataTable
                columns={batchColumns}
                rows={detail.batches}
                rowKey={b => b.key}
              />
            )}

            {section === 'deals' && (
              <DataTable
                columns={dealColumns}
                rows={detail.deals}
                rowKey={d => d.code}
                empty={<EmptyState title="Chưa có bản ghi Deal / Job thực thi cho gian hàng này" />}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
