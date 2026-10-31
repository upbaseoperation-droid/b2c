'use client';

/**
 * Upbase Ops UI — thành phần dùng chung.
 * Quy tắc dùng: web-admin/DESIGN_SYSTEM.md. Màn hình mới chỉ dùng các thành phần này
 * và token màu (bg-surface, text-ink-3, border-line…), không tự đặt màu Tailwind.
 */

import React, { useContext, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Progress, Sparkline } from './data';
import { NumberRoll, SlidingIndicator, deltaPercent, useActiveBox } from './motion';
import { useDensity } from './blocks';

export { Avatar, Person, initialsOf, CHANNELS, channelOf, ChannelTag, ChannelBar, Progress, Sparkline } from './data';
export { TrendChart, ScatterPlot, CorrelationMatrix, BarList, StackBar, HeatGrid, GROUP_COLORS, autoScale, spearman, pearson, describeCorrelation, formatCorr } from './charts';
export type { ChannelKey } from './data';
export type { TrendPoint, ScatterPoint, AxisScale, BarItem, StackPart } from './charts';
export { Combobox } from './Combobox';
export type { ComboboxOption, ComboboxProps } from './Combobox';
export { BrandAvatar } from './BrandAvatar';
export type { BrandAvatarProps } from './BrandAvatar';
export { PlatformLogo, FacebookLogo, ThreadsLogo, InstagramLogo, ShopeeLogo, TikTokLogo, LazadaLogo, LiveLogo, SelfChannelLogo, PlatformBadge, getPlatformShortLabel } from './PlatformLogos';
export type { PlatformKey, PlatformBadgeProps } from './PlatformLogos';
export { Density, DensityContext, useDensity, Toolbar, Panel, Chips, SearchInput, FilterBar, DataTable, Modal, ConfirmDialog, Field, Input, Select, Textarea, ActionMenu, Pagination, PageActions, PageActionsSlot, PageHeaderNav, PageHeaderNavSlot, PageActiveContext } from './blocks';
export type { Column, ChipOption, ActionMenuItem, DensityMode } from './blocks';
export { MOTION, NumberRoll, deltaPercent, useActiveBox, SlidingIndicator, useFlipList, StepMark, ChangeFlash, usePresence, Presence, withViewTransition, tagShared, sharedFrom, sharedTo, openShared, closeShared, Skeleton, SkeletonRows, useReducedMotion } from './motion';
export { ToastStack, useToastQueue } from './toast';
export type { ToastItem, ToastType } from './toast';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'bg-surface text-critical border border-line-strong hover:bg-critical-soft',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}

/** Nhãn nút: động từ + đối tượng, tối đa 3 từ. Mỗi vùng chỉ một nút primary. */
export function Button({ variant = 'secondary', size = 'md', icon: Icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-7 px-2.5 text-ctl' : 'h-[34px] px-3.5 text-ctl-md',
        BUTTON_VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={cx('w-4 h-4 shrink-0', variant === 'secondary' && 'text-ink-3')} strokeWidth={1.75} />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Status */

export type StatusTone = 'neutral' | 'info' | 'positive' | 'warning' | 'critical' | 'warn' | 'ok' | 'err' | 'danger' | 'brand';

const STATUS_TONE: Record<StatusTone, string> = {
  neutral: 'bg-sunken text-ink-2',
  info: 'bg-accent-soft text-accent',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
  warn: 'bg-warning-soft text-warning',
  ok: 'bg-positive-soft text-positive',
  err: 'bg-critical-soft text-critical',
  danger: 'bg-critical-soft text-critical',
  brand: 'bg-accent-soft text-accent',
};

/** Bộ từ trạng thái chuẩn — dùng đúng nhãn, đúng màu. */
export const STATUS = {
  draft: { label: 'Nháp', tone: 'neutral' },
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  changesRequested: { label: 'Cần sửa', tone: 'critical' },
  approved: { label: 'Đã duyệt', tone: 'positive' },
  running: { label: 'Đang chạy', tone: 'info' },
  done: { label: 'Hoàn tất', tone: 'positive' },
  overdue: { label: 'Quá hạn', tone: 'critical' },
  cancelled: { label: 'Đã hủy', tone: 'neutral' },
} as const satisfies Record<string, { label: string; tone: StatusTone }>;

export function Status({ tone = 'neutral', children, className }: { tone?: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 h-5 px-2 rounded text-2xs font-medium whitespace-nowrap', STATUS_TONE[tone], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Tabs */

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number | string;
  tone?: 'default' | 'critical';
}

/**
 * Tab gạch chân. Số đếm màu nhạt, không đóng khung.
 * `actions`: thao tác của cả trang/tab, nằm bên phải cùng hàng. Dãy tab tự cuộn ngang khi chật,
 * không bao giờ bị nút đè lên. Tối đa một nút primary; thao tác thứ ba trở đi vào `ActionMenu`.
 */
export function Tabs<K extends string>({ items, value, onChange, className, actions }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string; actions?: React.ReactNode }) {
  const list = <TabList items={items} value={value} onChange={onChange} className={actions ? 'max-w-full' : cx('border-b border-line', className)} />;
  if (!actions) return list;
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line', className)}>
      {list}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0 pb-2 ml-auto">{actions}</div>
    </div>
  );
}

function TabList<K extends string>({ items, value, onChange, className }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { box, ready } = useActiveBox(ref, value);
  return (
    <div ref={ref} role="tablist" className={cx('relative flex gap-4 sm:gap-6 min-w-0 max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <SlidingIndicator box={box} ready={ready} fit="underline" className="bg-ink z-[1]" />
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={on}
            data-active={on}
            onClick={() => onChange(t.key)}
            className={cx(
              'relative pb-2.5 pt-1 inline-flex items-center gap-1.5 text-ctl sm:text-ctl-md font-medium whitespace-nowrap border-b-2 border-transparent transition-colors shrink-0',
              on ? 'text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cx('text-2xs tabular-nums', t.tone === 'critical' ? 'text-critical' : 'text-ink-3')}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- SegmentedControl */

export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { box, ready } = useActiveBox(ref, value);
  return (
    <div ref={ref} className="relative inline-flex max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0.5 rounded-md bg-sunken">
      <SlidingIndicator box={box} ready={ready} className="rounded-[5px] bg-surface shadow-[0_1px_2px_rgb(22_23_26/0.08)]" />
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={it.key === value}
          data-active={it.key === value}
          className={cx(
            'relative h-7 px-2.5 sm:px-3 rounded-[5px] text-ctl-sm sm:text-ctl whitespace-nowrap shrink-0 transition-colors',
            it.key === value ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- PageSection */

/** Tiêu đề khối: một dòng tiêu đề, mô tả ngắn nếu thêm thông tin, thao tác bên phải. */
export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-w-full">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------- Stat */

/**
 * Ô chỉ số. `trend`: dãy số cho biểu đồ xu hướng nhỏ. `progress`: { value, max } cho thanh tiến độ.
 * Ghi chú nói ý nghĩa của con số, không lặp lại nhãn.
 */
export function Stat({
  label,
  value,
  note,
  tone,
  trend,
  progress,
  numeric,
  invert,
  icon: Icon,
}: {
  label: string;
  /** Chuỗi hoặc số sẽ lăn khi đổi (NumberRoll). Truyền phần tử React nếu cần định dạng riêng. */
  value: React.ReactNode;
  /** Giá trị số gốc: khi đổi, hiện mức chênh % cạnh con số trong vài giây. */
  numeric?: number;
  /** Chỉ số càng thấp càng tốt (chi phí, số việc quá hạn). */
  invert?: boolean;
  note?: React.ReactNode;
  tone?: 'warning' | 'critical' | 'positive';
  trend?: number[];
  progress?: { value: number; max: number; target?: number; invert?: boolean };
  icon?: LucideIcon;
}) {
  const compact = useContext(StatSizeContext) === 'sm';
  const dense = useDensity() === 'compact';
  const noteColor = tone === 'warning' ? 'text-warning' : tone === 'critical' ? 'text-critical' : tone === 'positive' ? 'text-positive' : 'text-ink-3';
  return (
    <div
      className={cx(
        'bg-surface grid gap-1 content-start min-w-0 transition-colors hover:bg-canvas/50',
        dense ? 'px-3 pt-2.5 pb-3 border border-line rounded-xl' : compact ? 'px-3 py-2.5 sm:px-3.5' : 'px-3.5 pt-3 pb-3.5 sm:px-4 sm:pt-3.5 sm:pb-4',
      )}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <span className="text-2xs sm:text-ctl-sm text-ink-3 truncate" title={label}>{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-3/70 shrink-0" strokeWidth={1.75} />}
      </div>
      <div className="flex items-end justify-between gap-2 sm:gap-3 min-w-0">
        <span
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
          className={cx(
            'min-w-0 truncate text-ink tabular-nums font-figure',
            dense ? 'font-medium text-stat-sm' : 'font-semibold tracking-tight',
            !dense && (compact ? 'text-lg sm:text-stat-sm' : 'text-xl sm:text-stat'),
          )}
        >
          {typeof value === 'string' || typeof value === 'number'
            ? <NumberRoll value={value} numeric={numeric} invert={invert} formatDelta={numeric !== undefined ? deltaPercent : undefined} />
            : value}
        </span>
        {trend && trend.length > 1 && (
          <div className="hidden sm:block shrink-0">
            <Sparkline data={trend} label={`Xu hướng ${label}`} />
          </div>
        )}
      </div>
      {progress && <Progress {...progress} label={label} className="mt-1" />}
      {note && <span className={cx('text-2xs break-words', noteColor)}>{note}</span>}
    </div>
  );
}

const StatSizeContext = React.createContext<'md' | 'sm'>('md');
const WIDE_COLS: Record<number, string> = { 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7', 8: 'xl:grid-cols-8' };

/**
 * Hàng chỉ số: các ô chung một khung, ngăn bằng đường kẻ mảnh. Tối đa 4 ô.
 * `size="sm"`: chữ số 20px, đệm gọn — dùng khi hàng chỉ số nằm trên tab hoặc bảng, để nội dung chính lên sớm.
 * Trong <Density mode="compact">: mỗi ô là một thẻ riêng, tối đa 8 ô một hàng (2 → 4 → 8 cột theo bề rộng).
 */
export function StatRow({ children, size = 'md' }: { children: React.ReactNode; size?: 'md' | 'sm' }) {
  const dense = useDensity() === 'compact';
  const count = React.Children.toArray(children).filter(Boolean).length;
  return (
    <StatSizeContext.Provider value={size}>
      {dense ? (
        <div className={cx('grid grid-cols-2 sm:grid-cols-4 gap-2', WIDE_COLS[count])}>{children}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden">{children}</div>
      )}
    </StatSizeContext.Provider>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="py-10 px-4 grid gap-1.5 justify-items-start max-w-md">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="text-[13px] text-ink-2">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- BrandLogo */

/**
 * Logo Upbase + tên sản phẩm. File logo: public/upbase-logo.png (tỷ lệ 15:4).
 * Không kéo giãn, không đổi màu, không đặt trên nền màu.
 */
export function BrandLogo({ height = 24, product = 'Ops', unit = 'Marketing B2C' }: { height?: number; product?: string; unit?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/upbase-logo.png" alt="Upbase" width={Math.round(height * 3.75)} height={height} style={{ height, width: 'auto' }} className="shrink-0" />
      {(product || unit) && (
        <span className="pl-2.5 border-l border-line leading-tight min-w-0">
          {product && <span className="block text-[13px] font-semibold text-ink truncate">{product}</span>}
          {unit && <span className="block text-2xs text-ink-3 truncate">{unit}</span>}
        </span>
      )}
    </span>
  );
}
