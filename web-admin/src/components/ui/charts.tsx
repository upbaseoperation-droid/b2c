'use client';

/**
 * Biểu đồ dữ liệu: xu hướng theo thời gian, phân tán hai chỉ số, ma trận tương quan.
 * Tự vẽ bằng SVG, màu lấy từ token. Chỉ vẽ từ dữ liệu thật; thiếu số thì bỏ điểm và nói rõ đã bỏ bao nhiêu.
 */

import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Đo chiều rộng khung chứa để SVG vẽ đúng điểm ảnh, chữ không bị kéo giãn. */
function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/* -------------------------------------------------------------- TrendChart */

export interface TrendPoint {
  label: string;
  value: number;
  /** Giá trị so sánh cùng kỳ (kế hoạch, kỳ trước). Vẽ nét đứt. */
  compare?: number;
}

/** Đường cong mượt qua các điểm (Catmull-Rom → Bézier), không vượt quá biên dữ liệu nhiều. */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Biểu đồ vùng theo thời gian: một chuỗi chính (vùng tô nhạt) và tùy chọn chuỗi so sánh (nét đứt).
 * Rê chuột hiện giá trị từng mốc. Chỉ vẽ từ dữ liệu thật.
 */
export function TrendChart({
  data,
  format = (n: number) => String(n),
  height = 280,
  color = 'var(--color-accent)',
  valueLabel = 'Thực tế',
  compareLabel = 'So sánh',
}: {
  data: TrendPoint[];
  format?: (n: number) => string;
  height?: number;
  color?: string;
  valueLabel?: string;
  compareLabel?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const hasCompare = data.some((d) => d.compare !== undefined);
  const padL = 52;
  const padR = 20;
  const padT = 12;
  const padB = 28;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const max = niceMax(Math.max(0, ...data.map((d) => Math.max(d.value, d.compare ?? 0))));
  const x = (i: number) => padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => padT + (1 - v / max) * innerH;

  const mainPts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = smoothPath(mainPts);
  const area = line ? `${line} L${x(data.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z` : '';
  const comparePts = hasCompare ? data.map((d, i) => ({ x: x(i), y: y(d.compare ?? 0) })) : [];
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => r * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64))));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0 || innerW <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - padL) / innerW;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  const h = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover) + 10, 0), Math.max(0, width - 170)) : 0;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 1 && (
        <svg width={width} height={height} role="img" aria-label={valueLabel} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-2xs tabular-nums">{format(t)}</text>
            </g>
          ))}
          {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && (
            <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-ink-3 text-2xs tabular-nums">{d.label}</text>
          ))}
          <path d={area} fill={color} opacity={0.12} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hasCompare && <path d={smoothPath(comparePts)} fill="none" stroke="var(--color-ink-3)" strokeWidth={1.5} strokeDasharray="4 4" />}
          {mainPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 4.5 : 3} fill="var(--color-surface)" stroke={color} strokeWidth={2} />
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="var(--color-line-strong)" />}
        </svg>
      )}
      {h && (
        <div className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md" style={{ left: tipLeft }}>
          <div className="text-ink-3 mb-1">{h.label}</div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-ink-2"><span className="w-2 h-2 rounded-full" style={{ background: color }} />{valueLabel}</span>
            <span className="font-semibold text-ink tabular-nums">{format(h.value)}</span>
          </div>
          {h.compare !== undefined && (
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <span className="flex items-center gap-1.5 text-ink-2"><span className="w-2 h-0 border-t border-dashed border-ink-3" />{compareLabel}</span>
              <span className="text-ink-2 tabular-nums">{format(h.compare)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Thống kê */

const finite = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

/** Xếp hạng, hạng trùng lấy trung bình. */
function ranks(values: number[]) {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Spearman ρ trên các cặp có đủ cả hai số. */
export function spearman(xs: (number | null)[], ys: (number | null)[]): { rho: number | null; n: number } {
  const px: number[] = [];
  const py: number[] = [];
  xs.forEach((x, i) => {
    const y = ys[i];
    if (finite(x) && finite(y)) {
      px.push(x);
      py.push(y);
    }
  });
  return { rho: pearson(ranks(px), ranks(py)), n: px.length };
}

/** Diễn đạt độ mạnh tương quan bằng lời. */
export function describeCorrelation(r: number | null) {
  if (r === null) return 'chưa đủ số';
  const a = Math.abs(r);
  if (a < 0.1) return 'gần như không liên quan';
  const strength = a < 0.3 ? 'yếu' : a < 0.5 ? 'vừa' : a < 0.7 ? 'khá mạnh' : 'mạnh';
  return `${strength}, ${r > 0 ? 'cùng chiều' : 'ngược chiều'}`;
}

export const formatCorr = (r: number | null, digits = 2) =>
  r === null ? '—' : r.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/* ---------------------------------------------------------- ScatterPlot */

export type AxisScale = 'log' | 'linear';

export interface ScatterPoint {
  id: string;
  x: number | null;
  y: number | null;
  label: string;
  group: string;
}

/** Bảng màu nhóm: màu kênh đã kiểm định tương phản, lặp lại khi quá 6 nhóm. */
export const GROUP_COLORS = [
  'var(--color-ch-tiktok)',
  'var(--color-ch-shopee)',
  'var(--color-ch-live)',
  'var(--color-ch-self)',
  'var(--color-ch-lazada)',
  'var(--color-ch-other)',
];

/** Thang tự động: log khi mọi giá trị dương và trải rộng trên 50 lần. */
export function autoScale(values: (number | null)[]): AxisScale {
  const v = values.filter(finite);
  if (v.length < 2 || v.some((n) => n <= 0)) return 'linear';
  return Math.max(...v) / Math.min(...v) > 50 ? 'log' : 'linear';
}

function axisOf(values: number[], scale: AxisScale) {
  if (scale === 'log') {
    const lo = Math.floor(Math.log10(Math.min(...values)));
    const hi = Math.ceil(Math.log10(Math.max(...values)));
    const top = hi === lo ? hi + 1 : hi;
    const ticks: number[] = [];
    for (let e = lo; e <= top; e++) ticks.push(10 ** e);
    return { min: lo, max: top, t: (v: number) => Math.log10(v), ticks };
  }
  const lo = Math.min(0, ...values);
  const hi = niceMax(Math.max(...values));
  return { min: lo, max: hi, t: (v: number) => v, ticks: [0, 0.25, 0.5, 0.75, 1].map((r) => lo + r * (hi - lo)) };
}

/**
 * Biểu đồ phân tán hai chỉ số: mỗi điểm là một bản ghi, màu theo nhóm, nét đứt là đường xu hướng
 * bình phương tối thiểu trên chính thang đang xem. Tương quan không phải nhân quả.
 */
export function ScatterPlot({
  points,
  xScale,
  yScale,
  xLabel,
  yLabel,
  formatX,
  formatY,
  groupColor,
  onPointClick,
  height = 380,
}: {
  points: ScatterPoint[];
  xScale: AxisScale;
  yScale: AxisScale;
  xLabel: string;
  yLabel: string;
  formatX: (n: number) => string;
  formatY: (n: number) => string;
  groupColor: (group: string) => string;
  onPointClick?: (p: ScatterPoint) => void;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<string | null>(null);
  const ok = (v: number | null, s: AxisScale): v is number => finite(v) && (s === 'linear' || v > 0);
  const shown = points.filter((p) => ok(p.x, xScale) && ok(p.y, yScale)) as (ScatterPoint & { x: number; y: number })[];

  if (shown.length < 2) {
    return (
      <div ref={ref} className="flex items-center justify-center text-sm text-ink-3" style={{ height }}>
        Chưa đủ điểm có số để vẽ.
      </div>
    );
  }

  const padL = 56;
  const padR = 16;
  const padT = 12;
  const padB = 32;
  const innerW = Math.max(0, width - padL - padR);
  const innerH = height - padT - padB;
  const ax = axisOf(shown.map((p) => p.x), xScale);
  const ay = axisOf(shown.map((p) => p.y), yScale);
  const px = (t: number) => padL + ((t - ax.min) / (ax.max - ax.min || 1)) * innerW;
  const py = (t: number) => padT + (1 - (t - ay.min) / (ay.max - ay.min || 1)) * innerH;
  const sx = (v: number) => px(ax.t(v));
  const sy = (v: number) => py(ay.t(v));

  // Đường xu hướng trên thang đang xem (log hoặc tuyến tính), cắt trong khung vẽ.
  const tx = shown.map((p) => ax.t(p.x));
  const ty = shown.map((p) => ay.t(p.y));
  const mx = tx.reduce((a, b) => a + b, 0) / tx.length;
  const my = ty.reduce((a, b) => a + b, 0) / ty.length;
  const sxx = tx.reduce((a, v) => a + (v - mx) ** 2, 0);
  const slope = sxx > 0 ? tx.reduce((a, v, i) => a + (v - mx) * (ty[i] - my), 0) / sxx : 0;
  const fit = (t: number) => my + slope * (t - mx);
  const clamp = (y: number) => Math.max(padT, Math.min(padT + innerH, y));

  const hp = hover ? shown.find((p) => p.id === hover) : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${yLabel} theo ${xLabel}`} className="block">
          {ay.ticks.map((t) => (
            <g key={`y${t}`}>
              <line x1={padL} x2={width - padR} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeDasharray="3 4" />
              <text x={padL - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-2xs tabular-nums">{formatY(t)}</text>
            </g>
          ))}
          {ax.ticks.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={padT} y2={padT + innerH} stroke="var(--color-line)" strokeDasharray="3 4" />
              <text x={sx(t)} y={height - 10} textAnchor="middle" className="fill-ink-3 text-2xs tabular-nums">{formatX(t)}</text>
            </g>
          ))}
          <line
            x1={padL}
            x2={width - padR}
            y1={clamp(py(fit(ax.min)))}
            y2={clamp(py(fit(ax.max)))}
            stroke="var(--color-ink-2)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {shown.map((p) => (
            <circle
              key={p.id}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={hover === p.id ? 6 : 4.5}
              fill={groupColor(p.group)}
              fillOpacity={hover && hover !== p.id ? 0.35 : 0.85}
              stroke="var(--color-surface)"
              strokeWidth={1}
              className={onPointClick ? 'cursor-pointer' : undefined}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPointClick?.(p)}
            />
          ))}
        </svg>
      )}
      {hp && (
        <div
          className="pointer-events-none absolute z-10 min-w-[180px] max-w-[260px] rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(sx(hp.x) + 12, Math.max(0, width - 270)), top: Math.max(0, sy(hp.y) - 80) }}
        >
          <div className="font-medium text-ink truncate">{hp.label}</div>
          <div className="text-ink-3 truncate mb-1">{hp.group}</div>
          <div className="flex justify-between gap-3"><span className="text-ink-2">{xLabel}</span><span className="tabular-nums text-ink">{formatX(hp.x)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-ink-2">{yLabel}</span><span className="tabular-nums text-ink">{formatY(hp.y)}</span></div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------- CorrelationMatrix */

/**
 * Ma trận tương quan: cam = cùng chiều, xanh = ngược chiều, đậm = mạnh.
 * Bấm ô để chọn cặp chỉ số (cột = trục X, hàng = trục Y).
 */
export function CorrelationMatrix({
  labels,
  matrix,
  selected,
  onSelect,
}: {
  labels: string[];
  matrix: (number | null)[][];
  selected?: { row: number; col: number };
  onSelect?: (row: number, col: number) => void;
}) {
  const cellStyle = (r: number | null): React.CSSProperties => {
    if (r === null) return { background: 'var(--color-sunken)', color: 'var(--color-ink-3)' };
    const pct = Math.round(Math.min(1, Math.abs(r)) * 85 + 8);
    const base = r >= 0 ? 'var(--color-ch-shopee)' : 'var(--color-ch-tiktok)';
    return {
      background: `color-mix(in srgb, ${base} ${pct}%, var(--color-surface))`,
      color: Math.abs(r) >= 0.55 ? 'var(--color-surface)' : 'var(--color-ink)',
    };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-2xs tabular-nums">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l} className="px-0.5 pb-1 font-medium text-ink-3 truncate max-w-[64px]" title={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="pr-2 text-right font-medium text-ink-3 whitespace-nowrap">{labels[i]}</th>
              {row.map((r, j) => {
                const isSel = selected && selected.row === i && selected.col === j;
                return (
                  <td key={j} className="p-0">
                    {i === j ? (
                      <div className="h-8 rounded bg-canvas" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect?.(i, j)}
                        title={`${labels[j]} × ${labels[i]}: ρ = ${formatCorr(r)}`}
                        aria-pressed={!!isSel}
                        className={`h-8 w-full min-w-[40px] rounded transition-shadow ${isSel ? 'ring-2 ring-ink ring-offset-1' : 'hover:ring-1 hover:ring-ink-3'}`}
                        style={cellStyle(r)}
                      >
                        {formatCorr(r, 1)}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------- BarList */

export interface BarItem {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Chữ bên phải thanh; mặc định là value. */
  display?: React.ReactNode;
  /** Màu thanh, mặc định token critical (màu nhấn biểu đồ). */
  color?: string;
  onClick?: () => void;
  /** Dòng đang được chọn làm bộ lọc. */
  active?: boolean;
}

/**
 * Xếp hạng bằng thanh ngang: nhãn trái, thanh giữa, số phải. Thay cho bảng 2 cột.
 * `narrow`: nhãn và số hẹp hơn, dùng trong cột phải (~300px).
 */
export function BarList({ items, max, narrow = false }: { items: BarItem[]; max?: number; narrow?: boolean }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const pct = Math.max(0, Math.min(100, (it.value / top) * 100));
        const body = (
          <>
            <span className={cx('shrink-0 truncate text-left text-xs', narrow ? 'w-28' : 'w-32 sm:w-40', it.active ? 'font-semibold text-ink' : 'text-ink')}>{it.label}</span>
            <span className="relative h-5 flex-1 rounded bg-canvas overflow-hidden">
              <span
                className="data-bar absolute inset-y-0 left-0 rounded"
                style={{ width: `${pct}%`, background: it.color ?? 'color-mix(in srgb, var(--color-critical) 70%, var(--color-surface))' }}
              />
            </span>
            <span className={cx('shrink-0 text-right text-xs tabular-nums text-ink font-figure', narrow ? 'w-12' : 'w-20')}>{it.display ?? it.value}</span>
          </>
        );
        return (
          <li key={it.key}>
            {it.onClick ? (
              <button type="button" onClick={it.onClick} aria-pressed={it.active} className={cx('flex w-full items-center gap-2.5 rounded px-1 -mx-1 hover:bg-canvas', it.active && 'bg-canvas ring-1 ring-line-strong')}>
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- StackBar */

export interface StackPart {
  key: string;
  label: string;
  value: number;
  display?: React.ReactNode;
  color: string;
}

/** Thanh cơ cấu 100% kèm chú thích từng phần (tỷ trọng tính trên tổng). */
export function StackBar({ parts }: { parts: StackPart[] }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  return (
    <div className="space-y-2.5">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-canvas">
        {total > 0 &&
          parts.map((p) => (
            <span
              key={p.key}
              className="data-bar h-full"
              style={{ width: `${(Math.max(0, p.value) / total) * 100}%`, background: p.color }}
              title={p.label}
            />
          ))}
      </div>
      <ul className="space-y-1">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate text-ink">{p.label}</span>
            </span>
            <span className="tabular-nums text-ink">
              {p.display ?? p.value}
              <span className="ml-1.5 text-ink-3">{total > 0 ? Math.round((Math.max(0, p.value) / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- HeatGrid */

/**
 * Lưới nhiệt hàng × cột (ví dụ tuần × thứ, gian hàng × tuần). Ô null = chưa có dữ liệu.
 * Màu đậm dần theo giá trị so với ô lớn nhất.
 */
export function HeatGrid({
  rows,
  cols,
  values,
  format = (v) => String(v),
  cellTitle,
  onCellClick,
}: {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  format?: (v: number) => string;
  cellTitle?: (row: number, col: number, v: number | null) => string;
  onCellClick?: (row: number, col: number) => void;
}) {
  const max = Math.max(0, ...values.flat().filter((v): v is number => typeof v === 'number'));
  const bg = (v: number | null) => {
    if (v === null) return 'var(--color-surface)';
    if (v <= 0 || max <= 0) return 'var(--color-canvas)';
    const pct = Math.round(18 + (v / max) * 72);
    return `color-mix(in srgb, var(--color-critical) ${pct}%, var(--color-surface))`;
  };
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[3px] text-2xs tabular-nums">
          <thead>
            <tr>
              <th />
              {cols.map((c) => (
                <th key={c} className="px-0.5 font-medium text-ink-3 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={rows[i]}>
                <th className="pr-2 text-right font-medium text-ink-3 whitespace-nowrap">{rows[i]}</th>
                {row.map((v, j) => {
                  const title = cellTitle?.(i, j, v) ?? `${rows[i]} · ${cols[j]}: ${v === null ? 'chưa có' : format(v)}`;
                  const style: React.CSSProperties = {
                    background: bg(v),
                    border: v === null ? '1px dashed var(--color-line)' : undefined,
                    color: v !== null && max > 0 && v / max > 0.55 ? 'var(--color-surface)' : 'var(--color-ink-2)',
                  };
                  const cls = 'flex h-6 min-w-[28px] w-full items-center justify-center rounded';
                  return (
                    <td key={j} className="p-0">
                      {onCellClick ? (
                        <button type="button" title={title} onClick={() => onCellClick(i, j)} className={`${cls} hover:ring-1 hover:ring-ink-3`} style={style}>
                          {v ? format(v) : ''}
                        </button>
                      ) : (
                        <div title={title} className={cls} style={style}>{v ? format(v) : ''}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-2xs text-ink-3">
        <span className="flex items-center gap-1">
          Thấp
          {[25, 45, 65, 90].map((p) => (
            <span key={p} className="h-2.5 w-2.5 rounded-sm" style={{ background: `color-mix(in srgb, var(--color-critical) ${p}%, var(--color-surface))` }} />
          ))}
          Cao
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-line" />
          Chưa có
        </span>
      </div>
    </div>
  );
}
