'use client';

/**
 * Thanh thao tác hàng loạt (UI_SYNC_PLAN.md §4.4). Chỉ hiện khi đã chọn ít nhất một dòng; bên trái ghi
 * "Đã chọn N" kèm "Bỏ chọn", bên phải là các thao tác. Chỉ một nút primary; thao tác nguy hiểm dùng variant danger.
 * `flush`: dính liền khung bảng bên dưới (không bo góc, chỉ viền dưới).
 */

import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export function BulkBar({
  count,
  unit,
  onClear,
  children,
  flush = false,
  className,
}: {
  count: number;
  /** Đối tượng đang chọn: "video", "KOC", "gian hàng"… */
  unit: string;
  onClear: () => void;
  /** Các thao tác (Button, Select…), nằm bên phải. */
  children?: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <div
      role="region"
      aria-label="Thao tác hàng loạt"
      className={cx(
        'flex flex-wrap items-center gap-3 border-line bg-sunken px-3 py-2 text-xs',
        flush ? 'border-b' : 'rounded-lg border',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium tabular-nums text-ink">Đã chọn {count} {unit}</span>
        <button type="button" onClick={onClear} className="text-2xs text-ink-2 underline hover:text-ink">
          Bỏ chọn
        </button>
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
