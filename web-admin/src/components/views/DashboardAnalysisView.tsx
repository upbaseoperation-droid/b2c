'use client';

import React, { useMemo, useState } from 'react';
import { Grid3x3, ScatterChart } from 'lucide-react';
import {
  CorrelationMatrix,
  Field,
  GROUP_COLORS,
  Panel,
  ScatterPlot,
  Segmented,
  Select,
  autoScale,
  describeCorrelation,
  formatCorr,
  pearson,
  spearman,
} from '../ui';
import type { AxisScale, ScatterPoint } from '../ui';
import { StorePortfolioItem } from '../../lib/types';
import { formatCountShort, formatNumber, formatPercent, formatVndShort } from '../../lib/format';
import { B2cBookedVideoRecord } from '../../lib/b2cAnalyticsDataset';

type Unit = 'VIDEO' | 'STORE';
type ScaleMode = 'AUTO' | 'LOG' | 'LINEAR';

interface Metric<T> {
  key: string;
  label: string;
  /** Nhãn ngắn cho ma trận. */
  short: string;
  get: (row: T) => number | null;
  format: (n: number) => string;
}

interface Grouping<T> {
  key: string;
  label: string;
  get: (row: T) => string;
}

interface UnitConfig<T> {
  rows: T[];
  id: (row: T) => string;
  name: (row: T) => string;
  metrics: Metric<T>[];
  groupings: Grouping<T>[];
  open?: (row: T) => void;
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);
const pos = (n: number | undefined) => (n && n > 0 ? n : null);
const times = (n: number) => `${n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}x`;

const VIDEO_METRICS: Metric<B2cBookedVideoRecord>[] = [
  { key: 'views', label: 'Lượt xem', short: 'View', get: (v) => pos(v.views), format: formatCountShort },
  { key: 'cost', label: 'Chi phí booking', short: 'Chi phí', get: (v) => pos(v.cost), format: formatVndShort },
  { key: 'gmv', label: 'GMV', short: 'GMV', get: (v) => pos(v.sellerGmv), format: formatVndShort },
  { key: 'orders', label: 'Đơn', short: 'Đơn', get: (v) => pos(v.sellerOrders), format: formatCountShort },
  { key: 'aov', label: 'AOV', short: 'AOV', get: (v) => div(v.sellerGmv, v.sellerOrders), format: formatVndShort },
  { key: 'roas', label: 'ROAS', short: 'ROAS', get: (v) => div(v.sellerGmv, v.cost), format: times },
  { key: 'cpm', label: 'Chi phí / 1.000 view', short: 'CPM', get: (v) => div(v.cost * 1000, v.views), format: formatVndShort },
];

const RISK_TEXT: Record<string, string> = {
  NORMAL: 'Trong hạn mức',
  UNBUDGETED: 'Chi ngoài kế hoạch',
  OVERBUDGET: 'Vượt trần Net',
  SLOW_BURN: 'Giải ngân chậm',
};

const STORE_METRICS: Metric<StorePortfolioItem>[] = [
  { key: 'target', label: 'Mục tiêu NMV', short: 'NMV', get: (s) => pos(s.monthlyTargetGmv), format: formatVndShort },
  { key: 'budget', label: 'Hạn mức Net', short: 'Hạn mức', get: (s) => pos(s.budgetNet || s.monthlyBudget), format: formatVndShort },
  { key: 'spent', label: 'Đã chi Net', short: 'Đã chi', get: (s) => pos(s.actualSpentNet), format: formatVndShort },
  {
    key: 'burn',
    label: '% giải ngân',
    short: '% chi',
    get: (s) => div(s.actualSpentNet || 0, s.budgetNet || s.monthlyBudget || 0),
    format: (n) => formatPercent(n),
  },
  {
    key: 'videoTarget',
    label: 'Chỉ tiêu video',
    short: 'CT video',
    get: (s) => pos((s.targetPaidVideos || 0) + (s.targetFocVideos || 0) + (s.targetSelfChannelContents || 0)),
    format: formatNumber,
  },
  { key: 'aired', label: 'Video đã air', short: 'Đã air', get: (s) => pos(s.actualAiredVideos), format: formatNumber },
  {
    key: 'costPerVideo',
    label: 'Chi phí / video air',
    short: 'CP/video',
    get: (s) => div(s.actualSpentNet || 0, s.actualAiredVideos || 0),
    format: formatVndShort,
  },
];

function useUnitConfig(unit: Unit, videos: B2cBookedVideoRecord[], stores: StorePortfolioItem[]): UnitConfig<unknown> {
  return useMemo(() => {
    if (unit === 'VIDEO') {
      const cfg: UnitConfig<B2cBookedVideoRecord> = {
        rows: videos,
        id: (v) => v.code,
        name: (v) => `@${v.channelId} · ${v.brandName}`,
        metrics: VIDEO_METRICS,
        groupings: [
          { key: 'format', label: 'Định dạng', get: (v) => v.format || 'Chưa ghi' },
          { key: 'coop', label: 'Loại hợp tác', get: (v) => v.coopType || 'Chưa ghi' },
          { key: 'kl', label: 'Khung KL', get: (v) => v.kl || 'Chưa ghi' },
          { key: 'videoType', label: 'Kiểu video', get: (v) => v.videoType || 'Chưa ghi' },
        ],
        open: (v) => v.linkAir && window.open(v.linkAir, '_blank', 'noopener'),
      };
      return cfg as unknown as UnitConfig<unknown>;
    }
    const cfg: UnitConfig<StorePortfolioItem> = {
      rows: stores,
      id: (s) => s.id,
      name: (s) => s.storeName,
      metrics: STORE_METRICS,
      groupings: [
        { key: 'platform', label: 'Sàn', get: (s) => s.platform },
        { key: 'risk', label: 'Kiểm soát kế toán', get: (s) => RISK_TEXT[s.financialRiskStatus || 'NORMAL'] },
        { key: 'leader', label: 'Cơ cấu duyệt', get: (s) => (s.hasBookingLeader ? 'Có Leader' : 'Trình trực tiếp') },
      ],
    };
    return cfg as unknown as UnitConfig<unknown>;
  }, [unit, videos, stores]);
}

const resolveScale = (mode: ScaleMode, values: (number | null)[]): AxisScale =>
  mode === 'AUTO' ? autoScale(values) : mode === 'LOG' ? 'log' : 'linear';

const SCALE_ITEMS: { key: ScaleMode; label: string }[] = [
  { key: 'AUTO', label: 'Tự động' },
  { key: 'LOG', label: 'Log' },
  { key: 'LINEAR', label: 'Tuyến tính' },
];

export function DashboardAnalysisView({
  stores,
  bookedVideos,
}: {
  stores: StorePortfolioItem[];
  bookedVideos: B2cBookedVideoRecord[];
}) {
  const [unit, setUnit] = useState<Unit>('VIDEO');
  const cfg = useUnitConfig(unit, bookedVideos, stores);
  const [axes, setAxes] = useState<Record<Unit, { x: string; y: string; group: string }>>({
    VIDEO: { x: 'views', y: 'gmv', group: 'format' },
    STORE: { x: 'spent', y: 'aired', group: 'platform' },
  });
  const [xMode, setXMode] = useState<ScaleMode>('AUTO');
  const [yMode, setYMode] = useState<ScaleMode>('AUTO');

  const sel = axes[unit];
  const setSel = (patch: Partial<typeof sel>) => setAxes((prev) => ({ ...prev, [unit]: { ...prev[unit], ...patch } }));
  const metricIndex = (key: string) => Math.max(0, cfg.metrics.findIndex((m) => m.key === key));
  const mx = cfg.metrics[metricIndex(sel.x)];
  const my = cfg.metrics[metricIndex(sel.y)];
  const grouping = cfg.groupings.find((g) => g.key === sel.group) ?? cfg.groupings[0];

  const columns = useMemo(() => cfg.metrics.map((m) => cfg.rows.map((r) => m.get(r))), [cfg]);
  const matrix = useMemo(
    () => columns.map((a, i) => columns.map((b, j) => (i === j ? null : spearman(a, b).rho))),
    [columns],
  );

  const xs = columns[metricIndex(sel.x)];
  const ys = columns[metricIndex(sel.y)];
  const xScale = resolveScale(xMode, xs);
  const yScale = resolveScale(yMode, ys);

  const points: ScatterPoint[] = useMemo(
    () => cfg.rows.map((r, i) => ({ id: cfg.id(r), x: xs[i], y: ys[i], label: cfg.name(r), group: grouping.get(r) })),
    [cfg, xs, ys, grouping],
  );

  // Nhóm đông nhất lấy màu trước, nhóm thứ 7 trở đi dùng màu xám.
  const groups = useMemo(() => {
    const count = new Map<string, number>();
    points.forEach((p) => count.set(p.group, (count.get(p.group) || 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [points]);
  const groupColor = (g: string) => {
    const i = groups.findIndex(([name]) => name === g);
    return GROUP_COLORS[Math.min(i < 0 ? GROUP_COLORS.length - 1 : i, GROUP_COLORS.length - 1)];
  };

  const stats = useMemo(() => {
    const usable = (v: number | null, s: AxisScale) => v !== null && Number.isFinite(v) && (s === 'linear' || v > 0);
    const tx: number[] = [];
    const ty: number[] = [];
    points.forEach((p) => {
      if (usable(p.x, xScale) && usable(p.y, yScale)) {
        tx.push(xScale === 'log' ? Math.log10(p.x!) : p.x!);
        ty.push(yScale === 'log' ? Math.log10(p.y!) : p.y!);
      }
    });
    return { r: pearson(tx, ty), ...spearman(xs, ys), plotted: tx.length, dropped: points.length - tx.length };
  }, [points, xs, ys, xScale, yScale]);

  const unitLabel = unit === 'VIDEO' ? 'video booking' : 'gian hàng';
  const onLog = xScale === 'log' || yScale === 'log';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm text-ink-2">
          <span className="font-semibold text-ink">Vì sao, đòn bẩy nào?</span> · {formatNumber(cfg.rows.length)} {unitLabel} trong phạm vi của bạn
        </h2>
        <Segmented<Unit>
          items={[
            { key: 'VIDEO', label: 'Theo video booking' },
            { key: 'STORE', label: 'Theo gian hàng' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] gap-4 items-start">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <ScatterChart className="w-4 h-4 text-critical" strokeWidth={1.75} />
              {my.label} theo {mx.label}
            </span>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-ink-2 tabular-nums">
              Spearman ρ = <strong className="text-ink">{formatCorr(stats.rho)}</strong> ({describeCorrelation(stats.rho)}) · Pearson r
              {onLog ? ' (thang log)' : ''} = {formatCorr(stats.r)} · n = {formatNumber(stats.n)}
              {cfg.open ? ' · bấm điểm mở video' : ''}
            </p>
            {stats.dropped > 0 && (
              <p className="rounded-md bg-canvas px-3 py-1.5 text-2xs text-ink-3">
                Bỏ {formatNumber(stats.dropped)} {unitLabel} thiếu số{onLog ? ' hoặc ≤ 0 trên trục log' : ''}. Nét đứt là xu hướng bình phương tối thiểu; tương quan không phải nhân quả.
              </p>
            )}
            <ScatterPlot
              points={points}
              xScale={xScale}
              yScale={yScale}
              xLabel={mx.label}
              yLabel={my.label}
              formatX={mx.format}
              formatY={my.format}
              groupColor={groupColor}
              onPointClick={
                cfg.open
                  ? (p) => {
                      const row = cfg.rows.find((r) => cfg.id(r) === p.id);
                      if (row) cfg.open!(row);
                    }
                  : undefined
              }
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-2">
              {groups.slice(0, GROUP_COLORS.length).map(([name, n]) => (
                <span key={name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: groupColor(name) }} />
                  {name} <span className="text-ink-3">{n}</span>
                </span>
              ))}
              {groups.length > GROUP_COLORS.length && <span className="text-ink-3">+{groups.length - GROUP_COLORS.length} nhóm khác (xám)</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <Field label="Trục X">
                <Select aria-label="Trục X" value={mx.key} onChange={(e) => setSel({ x: e.target.value })}>
                  {cfg.metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </Select>
              </Field>
              <Field label="Trục Y">
                <Select aria-label="Trục Y" value={my.key} onChange={(e) => setSel({ y: e.target.value })}>
                  {cfg.metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </Select>
              </Field>
              <Field label="Màu theo">
                <Select aria-label="Màu theo" value={grouping.key} onChange={(e) => setSel({ group: e.target.value })}>
                  {cfg.groupings.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
              <span className="flex items-center gap-2">
                Thang X <Segmented<ScaleMode> items={SCALE_ITEMS} value={xMode} onChange={setXMode} />
              </span>
              <span className="flex items-center gap-2">
                Thang Y <Segmented<ScaleMode> items={SCALE_ITEMS} value={yMode} onChange={setYMode} />
              </span>
            </div>
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-critical" strokeWidth={1.75} />
              Ma trận tương quan (Spearman)
            </span>
          }
        >
          <div className="space-y-3">
            <p className="text-2xs text-ink-3">
              Cam = cùng chiều, xanh = ngược chiều, đậm = mạnh. Bấm ô để đặt cặp chỉ số lên biểu đồ (cột = X, hàng = Y).
            </p>
            <CorrelationMatrix
              labels={cfg.metrics.map((m) => m.short)}
              matrix={matrix}
              selected={{ row: metricIndex(sel.y), col: metricIndex(sel.x) }}
              onSelect={(row, col) => setSel({ x: cfg.metrics[col].key, y: cfg.metrics[row].key })}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
