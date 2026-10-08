'use client';

/**
 * Khối dựng màn hình: thanh công cụ, khung nội dung, bộ lọc, bảng dữ liệu, modal, form.
 * Màn hình nào cũng ghép từ các khối này để cùng vị trí, cùng hành vi. Quy tắc: DESIGN_SYSTEM.md §5, §7.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ----------------------------------------------------------------- Toolbar */

/** Hàng dưới tiêu đề trang: bên trái chọn kỳ / bộ lọc nhanh, bên phải thao tác. */
export function Toolbar({ children, actions, className }: { children?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-3 min-w-0">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Panel */

/**
 * Khung nội dung có viền. Dùng cho bảng, form, nhóm thao tác độc lập.
 * `flush`: nội dung tràn sát viền (bảng).
 */
export function Panel({
  title,
  description,
  actions,
  children,
  flush = false,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={cx('bg-surface border border-line rounded-xl overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {description && <p className="text-2xs text-ink-3 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- FilterBar */

export interface ChipOption<K extends string> {
  key: K;
  label: string;
  count?: number;
}

/** Nhóm nút lọc dạng chip (khi có hơn 5 lựa chọn; ít hơn dùng Segmented). */
export function Chips<K extends string>({ items, value, onChange, label }: { items: ChipOption<K>[]; value: K; onChange: (k: K) => void; label?: string }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label={label}>
      {label && <span className="text-2xs text-ink-3 shrink-0 mr-1">{label}</span>}
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.key)}
            className={cx(
              'h-7 px-2.5 rounded-full text-[12.5px] whitespace-nowrap border transition-colors',
              on ? 'bg-ink text-white border-ink' : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:text-ink',
            )}
          >
            {it.label}
            {it.count !== undefined && <span className={cx('ml-1.5 tabular-nums', on ? 'text-white/70' : 'text-ink-3')}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Ô tìm kiếm chuẩn. */
export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-[34px] pl-9 pr-8 rounded-md border border-line-strong bg-surface text-[13.5px] text-ink focus:outline-none focus:border-focus"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-ink-3 hover:text-ink" aria-label="Xóa tìm kiếm">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Thanh lọc: ô tìm kiếm bên trái, bộ lọc chọn bên phải cùng hàng; hàng chip (nếu có) ở dưới.
 * Luôn đặt ngay trên bảng mà nó lọc.
 */
export function FilterBar({
  search,
  filters,
  chips,
  resultCount,
}: {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  filters?: React.ReactNode;
  chips?: React.ReactNode;
  resultCount?: number;
}) {
  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {search && <SearchInput {...search} className="flex-1 min-w-[220px] max-w-md" />}
        {filters}
        {resultCount !== undefined && <span className="ml-auto text-2xs text-ink-3 tabular-nums">{resultCount} kết quả</span>}
      </div>
      {chips}
    </div>
  );
}

/* --------------------------------------------------------------- DataTable */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Độ rộng tối thiểu (px). */
  width?: number;
  className?: string;
}

/**
 * Bảng dữ liệu chuẩn: tiêu đề cột nhạt, số căn phải, hàng đổi nền khi rê chuột,
 * trạng thái rỗng có sẵn, cột cuối cố định khi cuộn ngang (`stickyLast`).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  stickyLast = false,
  onRowClick,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  stickyLast?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
}) {
  const align = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const minWidth = columns.reduce((s, c) => s + (c.width || 120), 0);
  const last = columns.length - 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { minWidth: c.width } : undefined}
                className={cx(
                  'px-4 py-2.5 text-[12.5px] font-medium text-ink-3 bg-surface border-b border-line',
                  align(c.align),
                  stickyLast && i === last && 'sticky right-0 z-10 border-l',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4">
                {empty ?? <p className="py-10 text-[13px] text-ink-3">Không có dữ liệu phù hợp.</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx('group border-b border-line last:border-b-0 transition-colors hover:bg-canvas', onRowClick && 'cursor-pointer', rowClassName?.(row))}
              >
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cx(
                      'px-4 py-3 align-top text-ink',
                      align(c.align),
                      c.className,
                      stickyLast && i === last && 'sticky right-0 bg-surface group-hover:bg-canvas border-l border-line',
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */

const MODAL_SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/**
 * Hộp thoại. Đóng bằng Esc, nút X hoặc bấm ra ngoài. Chân modal: nút phụ bên trái nút chính.
 * Chỉ dùng cho tác vụ ngắn; việc dài nên mở trang riêng.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof MODAL_SIZE;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" role="presentation">
      <div className="fixed inset-0 bg-[rgb(22_23_26/0.4)] animate-in fade-in duration-150" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('relative w-full bg-surface rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8', MODAL_SIZE[size])}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="text-[13px] text-ink-3 mt-0.5">{description}</p>}
          </div>
          <button type="button" data-close onClick={onClose} className="p-1 -mr-1 rounded-md text-ink-3 hover:text-ink hover:bg-sunken" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </header>
        {children && <div className="px-5 pb-4 grid gap-4">{children}</div>}
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-line bg-canvas rounded-b-xl">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * Hỏi xác nhận trước thao tác không hoàn tác được, hoặc cần lý do (từ chối, hủy).
 * Thay cho window.confirm / window.prompt.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Hủy',
  tone = 'default',
  reason,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  /** Có ô nhập lý do. `required`: không cho xác nhận khi trống. */
  reason?: { label: string; placeholder?: string; defaultValue?: string; required?: boolean };
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(reason?.defaultValue || '');
  const fieldId = useId();
  useEffect(() => { if (open) setText(reason?.defaultValue || ''); }, [open, reason?.defaultValue]);
  const blocked = !!reason?.required && !text.trim();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onCancel} className="h-[34px] px-3.5 rounded-md text-[13.5px] font-medium text-ink-2 hover:bg-sunken">{cancelLabel}</button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onConfirm(text.trim())}
            className={cx(
              'h-[34px] px-3.5 rounded-md text-[13.5px] font-medium text-white disabled:opacity-50',
              tone === 'danger' ? 'bg-critical hover:opacity-90' : 'bg-primary hover:bg-primary-hover',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {reason && (
        <Field label={reason.label} htmlFor={fieldId}>
          <Textarea id={fieldId} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} />
        </Field>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------------------- Form */

/** Nhãn ở trên, luôn hiện. Lỗi nói rõ sai gì và sửa thế nào. */
export function Field({ label, hint, error, htmlFor, children, className }: { label: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('grid gap-1.5 min-w-0', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="text-2xs text-critical">{error}</p> : hint ? <p className="text-2xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

const CONTROL = 'rounded-md border border-line-strong bg-surface text-[13.5px] text-ink focus:outline-none focus:border-focus disabled:bg-sunken disabled:text-ink-3';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(CONTROL, "h-9 px-3 w-full", className)} {...rest} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(CONTROL, 'h-9 pl-3 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(CONTROL, "px-3 py-2 leading-relaxed w-full", className)} {...rest} />;
});
