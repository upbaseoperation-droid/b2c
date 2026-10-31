'use client';

/**
 * Thanh bước của một quy trình (UI_SYNC_PLAN.md §4.4). Nhãn không đánh số: thành phần tự hiện thứ tự theo
 * vị trí, nên đổi hoặc chèn bước không phải sửa nhãn. Bấm một bước để lọc theo bước đó, bấm lại để bỏ lọc.
 * Dùng cho: Quản lý Deal & Booking, Video kênh Brand & CTV, Studio kế hoạch tháng.
 */

import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export interface StepItem<K extends string> {
  key: K;
  /** Tên bước, không kèm số thứ tự. */
  label: string;
  /** Số bản ghi đang ở bước này. */
  count?: number;
}

export function StepBar<K extends string>({
  steps,
  value,
  onChange,
  unit,
  label,
  className,
}: {
  steps: StepItem<K>[];
  /** Bước đang lọc; `null` là không lọc. */
  value: K | null;
  onChange: (next: K | null) => void;
  /** Đơn vị của số đếm, ví dụ "video". */
  unit?: string;
  /** Nhãn cho trình đọc màn hình. */
  label?: string;
  className?: string;
}) {
  return (
    <ol role="group" aria-label={label} className={cx('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr', className)}>
      {steps.map((s, i) => {
        const selected = value === s.key;
        const has = (s.count ?? 0) > 0;
        return (
          <li key={s.key} className="min-w-0">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : s.key)}
              className={cx(
                'w-full min-w-0 rounded-lg border p-3 text-left transition-colors',
                selected ? 'border-primary bg-sunken' : 'border-line bg-surface hover:border-line-strong hover:bg-canvas',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  aria-hidden="true"
                  className={cx(
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-medium tabular-nums',
                    selected ? 'bg-primary text-white' : 'bg-sunken text-ink-2',
                  )}
                >
                  {i + 1}
                </span>
                {s.count !== undefined && (
                  <span className={cx('text-xs tabular-nums', has ? 'text-ink' : 'text-ink-3')}>
                    {s.count}{unit ? ` ${unit}` : ''}
                  </span>
                )}
              </span>
              <span className={cx('mt-2 block line-clamp-2 text-xs', selected ? 'font-medium text-ink' : 'text-ink-2')} title={s.label}>
                {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
