'use client';

/**
 * Upbase Ops UI — thành phần dùng chung.
 * Quy tắc dùng: web-admin/DESIGN_SYSTEM.md. Màn hình mới chỉ dùng các thành phần này
 * và token màu (bg-surface, text-ink-3, border-line…), không tự đặt màu Tailwind.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Progress, Sparkline } from './data';

export { Avatar, Person, initialsOf, CHANNELS, channelOf, ChannelTag, ChannelBar, Progress, Sparkline } from './data';
export type { ChannelKey } from './data';
export { Toolbar, Panel, Chips, SearchInput, FilterBar, DataTable, Modal, ConfirmDialog, Field, Input, Select, Textarea } from './blocks';
export type { Column, ChipOption } from './blocks';

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
        size === 'sm' ? 'h-7 px-2.5 text-[13px]' : 'h-[34px] px-3.5 text-[13.5px]',
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

export type StatusTone = 'neutral' | 'info' | 'positive' | 'warning' | 'critical';

const STATUS_TONE: Record<StatusTone, string> = {
  neutral: 'bg-sunken text-ink-2',
  info: 'bg-accent-soft text-accent',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  critical: 'bg-critical-soft text-critical',
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

/** Tab gạch chân. Số đếm màu nhạt, không đóng khung. */
export function Tabs<K extends string>({ items, value, onChange, className }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex gap-6 border-b border-line overflow-x-auto', className)}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cx(
              'relative -mb-px pb-2.5 pt-1 inline-flex items-center gap-1.5 text-[13.5px] font-medium whitespace-nowrap border-b-2 transition-colors',
              on ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink',
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
  return (
    <div className="inline-flex p-0.5 rounded-md bg-sunken">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={it.key === value}
          className={cx(
            'h-7 px-3 rounded-[5px] text-[13px] whitespace-nowrap transition-colors',
            it.key === value ? 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgb(22_23_26/0.08)]' : 'text-ink-3 hover:text-ink',
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
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
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: 'warning' | 'critical' | 'positive';
  trend?: number[];
  progress?: { value: number; max: number; target?: number; invert?: boolean };
}) {
  const noteColor = tone === 'warning' ? 'text-warning' : tone === 'critical' ? 'text-critical' : tone === 'positive' ? 'text-positive' : 'text-ink-3';
  return (
    <div className="bg-surface px-4 pt-3.5 pb-4 grid gap-1 content-start">
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <div className="flex items-end justify-between gap-3">
        <span className="text-[26px] leading-8 font-semibold text-ink tabular-nums tracking-tight">{value}</span>
        {trend && trend.length > 1 && <Sparkline data={trend} label={`Xu hướng ${label}`} />}
      </div>
      {progress && <Progress {...progress} label={label} className="mt-1" />}
      {note && <span className={cx('text-2xs', noteColor)}>{note}</span>}
    </div>
  );
}

/** Hàng chỉ số: các ô chung một khung, ngăn bằng đường kẻ mảnh. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden">{children}</div>
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
