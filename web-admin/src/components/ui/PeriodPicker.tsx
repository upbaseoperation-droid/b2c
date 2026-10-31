'use client';

/**
 * Chọn kỳ (tháng) dùng chung (UI_SYNC_PLAN.md §4.4). Một kiểu duy nhất: nút lùi, ô chọn, nút tiến.
 * Đặt ở thanh trên, bên trái; các tab trong một màn dùng chung một kỳ.
 * `allLabel`: thêm lựa chọn "tất cả kỳ" (giá trị rỗng). Nút lùi/tiến bỏ qua lựa chọn này.
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './blocks';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export type PeriodOption = string | { value: string; label?: string; hint?: string };

const norm = (o: PeriodOption) => (typeof o === 'string' ? { value: o, label: undefined as string | undefined, hint: undefined as string | undefined } : { value: o.value, label: o.label, hint: o.hint });

/** Chuỗi kỳ dạng 2026/11 hoặc 2026-11 hiện là "Tháng 2026/11"; nhãn khác giữ nguyên. */
function defaultLabel(value: string): string {
  return /^\d{4}[/-]\d{2}$/.test(value) ? `Tháng ${value}` : value;
}

export function PeriodPicker({
  value,
  onChange,
  options,
  allLabel,
  label = 'Chọn kỳ',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: PeriodOption[];
  /** Có thì thêm lựa chọn "tất cả kỳ" với giá trị rỗng. */
  allLabel?: string;
  /** Nhãn cho trình đọc màn hình. */
  label?: string;
  className?: string;
}) {
  const items = useMemo(() => options.map(norm), [options]);
  // Lùi/tiến theo thứ tự thời gian, không phụ thuộc thứ tự danh sách truyền vào.
  const ordered = useMemo(() => [...items].sort((a, b) => a.value.localeCompare(b.value)), [items]);
  const index = ordered.findIndex((o) => o.value === value);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;

  const step = 'inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40';

  return (
    <div role="group" aria-label={label} className={cx('inline-flex items-center gap-1', className)}>
      <button type="button" className={step} disabled={!prev} onClick={() => prev && onChange(prev.value)} aria-label="Kỳ trước" title={prev ? defaultLabel(prev.label ?? prev.value) : undefined}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="min-w-[9.5rem]">
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {(o.label ?? defaultLabel(o.value)) + (o.hint ? ` (${o.hint})` : '')}
          </option>
        ))}
      </Select>
      <button type="button" className={step} disabled={!next} onClick={() => next && onChange(next.value)} aria-label="Kỳ sau" title={next ? defaultLabel(next.label ?? next.value) : undefined}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
