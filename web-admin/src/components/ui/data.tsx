'use client';

/**
 * Thành phần hiển thị dữ liệu: ảnh đại diện, kênh bán, thanh phân bổ, tiến độ, xu hướng.
 * Màu ở đây là màu dữ liệu (định danh), không phải màu trạng thái. Luôn đi kèm nhãn chữ.
 */

import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ Avatar */

// Nền nhạt + chữ đậm cùng sắc độ; chữ đạt ≥ 4,5:1 trên nền.
const AVATAR_TONES = [
  { bg: '#E3EDFA', fg: '#1C4F8F' }, // xanh dương
  { bg: '#FBE6DC', fg: '#97391A' }, // cam đất
  { bg: '#DDF3EA', fg: '#17674A' }, // xanh ngọc
  { bg: '#F8EDCF', fg: '#7A5200' }, // vàng nghệ
  { bg: '#F9E3EC', fg: '#962E57' }, // hồng
  { bg: '#E6E3F5', fg: '#463A8F' }, // tím than
  { bg: '#E2EEE0', fg: '#2F5F27' }, // xanh lá
  { bg: '#ECE7E1', fg: '#5C4A3A' }, // nâu
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function initialsOf(name: string) {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
}

/** Ảnh đại diện: ảnh Lark nếu có, nếu không thì chữ viết tắt trên màu cố định theo tên. */
export function Avatar({ name, src, size = 24, className }: { name: string; src?: string; size?: number; className?: string }) {
  const tone = AVATAR_TONES[hashName(name) % AVATAR_TONES.length];
  const style: React.CSSProperties = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cx('rounded-full object-cover shrink-0', className)} style={style} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cx('rounded-full inline-flex items-center justify-center font-semibold shrink-0 select-none', className)}
      style={{ ...style, background: tone.bg, color: tone.fg }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Ảnh đại diện + tên, dùng trong ô bảng. */
export function Person({ name, sub, src, size = 24 }: { name: string; sub?: string; src?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Avatar name={name} src={src} size={size} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-ink">{name}</span>
        {sub && <span className="block truncate text-2xs text-ink-3">{sub}</span>}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- Channels */

export type ChannelKey = 'tiktok' | 'shopee' | 'live' | 'self' | 'lazada' | 'other';

export const CHANNELS: Record<ChannelKey, { label: string; color: string }> = {
  tiktok: { label: 'TikTok Shop', color: 'var(--color-ch-tiktok)' },
  shopee: { label: 'Shopee', color: 'var(--color-ch-shopee)' },
  live: { label: 'Livestream', color: 'var(--color-ch-live)' },
  self: { label: 'Kênh tự xây', color: 'var(--color-ch-self)' },
  lazada: { label: 'Lazada', color: 'var(--color-ch-lazada)' },
  other: { label: 'Mạng xã hội khác', color: 'var(--color-ch-other)' },
};

/** Đổi mã kênh/sàn trong dữ liệu (TIKTOK_SHOP, SHOPEE_MALL, SELF_CHANNEL…) về một kênh chuẩn. */
export function channelOf(raw?: string): ChannelKey {
  const v = (raw || '').toUpperCase();
  if (v.includes('TIKTOK')) return 'tiktok';
  if (v.includes('SHOPEE')) return 'shopee';
  if (v.includes('LIVE')) return 'live';
  if (v.includes('SELF') || v.includes('TỰ XÂY')) return 'self';
  if (v.includes('LAZADA')) return 'lazada';
  return 'other';
}

/** Chấm màu + tên kênh. Thay cho chuỗi thô như “TIKTOK_SHOP”. */
export function ChannelTag({ channel, className }: { channel: string; className?: string }) {
  const c = CHANNELS[channelOf(channel)];
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-2xs text-ink-2 whitespace-nowrap', className)}>
      <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: c.color }} aria-hidden="true" />
      {c.label}
    </span>
  );
}

/**
 * Thanh phân bổ theo kênh: mỗi đoạn một kênh, khe 2px giữa các đoạn, chú thích có tên và tỷ lệ.
 * `values` có thể chứa mã kênh thô; các mã cùng kênh được cộng dồn.
 */
export function ChannelBar({
  values,
  format,
  showLegend = true,
  height = 8,
}: {
  values: Array<{ channel: string; value: number }>;
  format?: (n: number) => string;
  showLegend?: boolean;
  height?: number;
}) {
  const sums = new Map<ChannelKey, number>();
  for (const v of values) {
    const k = channelOf(v.channel);
    sums.set(k, (sums.get(k) || 0) + (v.value || 0));
  }
  const order = (Object.keys(CHANNELS) as ChannelKey[]).filter((k) => (sums.get(k) || 0) > 0);
  const total = order.reduce((s, k) => s + (sums.get(k) || 0), 0);
  if (total <= 0) return <div className="text-2xs text-ink-3">Chưa phân bổ kênh</div>;

  return (
    <div className="grid gap-2">
      <div className="flex w-full gap-[2px] rounded-full overflow-hidden bg-sunken" style={{ height }} role="img"
        aria-label={order.map((k) => `${CHANNELS[k].label} ${Math.round(((sums.get(k) || 0) / total) * 100)}%`).join(', ')}>
        {order.map((k) => (
          <span
            key={k}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${((sums.get(k) || 0) / total) * 100}%`, background: CHANNELS[k].color }}
            title={`${CHANNELS[k].label}: ${format ? format(sums.get(k) || 0) : sums.get(k)} · ${Math.round(((sums.get(k) || 0) / total) * 100)}%`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {order.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-2xs text-ink-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-[2px]" style={{ background: CHANNELS[k].color }} aria-hidden="true" />
              {CHANNELS[k].label}
              <span className="text-ink-3 tabular-nums">{Math.round(((sums.get(k) || 0) / total) * 100)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Progress */

/**
 * Thanh tiến độ. Màu theo ý nghĩa: đạt (≥ mốc) xanh lá, chậm cảnh báo, vượt trần đỏ.
 * `invert` cho chỉ số càng thấp càng tốt (ví dụ ngân sách đã tiêu so với trần).
 */
export function Progress({
  value,
  max = 100,
  target = 0.8,
  invert = false,
  className,
  label,
}: {
  value: number;
  max?: number;
  target?: number;
  invert?: boolean;
  className?: string;
  label?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const color = invert
    ? ratio > 1 ? 'var(--color-critical)' : ratio > target ? 'var(--color-warning)' : 'var(--color-accent)'
    : ratio >= 1 ? 'var(--color-positive)' : ratio >= target ? 'var(--color-accent)' : 'var(--color-warning)';
  return (
    <div
      className={cx('h-1.5 w-full rounded-full bg-sunken overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* --------------------------------------------------------------- Sparkline */

/** Biểu đồ xu hướng nhỏ: đường 2px, vùng tô nhạt, nhấn điểm cuối. */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = 'var(--color-accent)',
  label,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const lx = x(data.length - 1);
  const ly = y(data[data.length - 1]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <path d={area} fill={color} opacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
    </svg>
  );
}
