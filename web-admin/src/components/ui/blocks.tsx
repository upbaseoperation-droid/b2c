'use client';

/**
 * Khối dựng màn hình: thanh công cụ, khung nội dung, bộ lọc, bảng dữ liệu, modal, form.
 * Màn hình nào cũng ghép từ các khối này để cùng vị trí, cùng hành vi. Quy tắc: DESIGN_SYSTEM.md §5, §7.
 */

import React, { useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, Search, X } from 'lucide-react';
import { SkeletonRows, SlidingIndicator, useActiveBox, useFlipList, usePresence } from './motion';

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
    <section className={cx('workspace-panel bg-surface border border-line rounded-xl overflow-hidden shadow-2xs', className)}>
      {(title || description || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-surface">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-ink leading-tight">{title}</h3>}
            {description && <p className="text-2xs text-ink-3 mt-0.5 leading-normal">{description}</p>}
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
  const ref = useRef<HTMLDivElement>(null);
  const { box, ready } = useActiveBox(ref, value);
  return (
    <div ref={ref} className="relative flex items-center gap-1.5 overflow-x-auto" role="group" aria-label={label}>
      <SlidingIndicator box={box} ready={ready} className="rounded-full bg-ink" />
      {label && <span className="text-2xs text-ink-3 shrink-0 mr-1">{label}</span>}
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={on}
            data-active={on}
            onClick={() => onChange(it.key)}
            className={cx(
              'relative h-7 px-2.5 rounded-full text-[12.5px] whitespace-nowrap border transition-colors duration-(--motion-base)',
              on ? 'text-white border-transparent' : 'bg-transparent text-ink-2 border-line hover:border-line-strong hover:text-ink',
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
  loading = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  stickyLast?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Đang tải: giữ khung bảng, hiện hàng giữ chỗ. */
  loading?: boolean;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // Sắp xếp/lọc: hàng còn lại trượt về chỗ mới, hàng mới hiện dần (DESIGN_SYSTEM.md §9).
  useFlipList(bodyRef, rows.map(rowKey).join('|'));
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
                  'px-4 py-2.5 text-[12px] font-semibold text-ink-3 bg-sunken/40 border-b border-line whitespace-nowrap',
                  align(c.align),
                  stickyLast && i === last && 'sticky right-0 z-10 bg-sunken/60 border-l border-line',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {loading && rows.length === 0 ? (
            <SkeletonRows columns={columns.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4">
                {empty ?? <p className="py-10 text-[13px] text-ink-3">Không có dữ liệu phù hợp.</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                data-flip={rowKey(row)}
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
  const { mounted, closing } = usePresence(open);
  // Trong nhịp đóng, dữ liệu của màn cha thường đã bị xóa: giữ nội dung lúc còn mở để không lỗi.
  const [shown, setShown] = useState({ title, description, children, footer });
  if (open && (shown.title !== title || shown.description !== description || shown.children !== children || shown.footer !== footer)) {
    setShown({ title, description, children, footer });
  }
  const view = open ? { title, description, children, footer } : shown;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([data-close]):not([disabled])');
      first?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!mounted) return null;
  return (
    <div className={cx('fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto', closing && 'pointer-events-none')} role="presentation">
      <div className={cx('fixed inset-0 bg-[rgb(22_23_26/0.4)]', closing ? 'motion-exit-fade' : 'animate-in fade-in duration-(--motion-base)')} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('relative w-full bg-surface rounded-xl shadow-2xl my-8', closing ? 'motion-exit-pop' : 'animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter', MODAL_SIZE[size])}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">{view.title}</h2>
          </div>
          <button type="button" data-close onClick={onClose} className="p-1 -mr-1 rounded-md text-ink-3 hover:text-ink hover:bg-sunken" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </header>
        {view.children && <div className="px-5 pb-4 grid gap-4">{view.children}</div>}
        {view.footer && <footer className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-line bg-canvas rounded-b-xl">{view.footer}</footer>}
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
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  tone = 'default',
  variant,
  reason,
  onConfirm,
  onCancel,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  variant?: 'primary' | 'danger' | 'default';
  /** Có ô nhập lý do. `required`: không cho xác nhận khi trống. */
  reason?: { label: string; placeholder?: string; defaultValue?: string; required?: boolean };
  onConfirm: (reason?: string) => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [text, setText] = useState(reason?.defaultValue || '');
  const fieldId = useId();
  useEffect(() => { if (open) setText(reason?.defaultValue || ''); }, [open, reason?.defaultValue]);
  const blocked = !!reason?.required && !text.trim();
  const handleClose = () => {
    onCancel?.();
    onOpenChange?.(false);
  };
  const effectiveTone = variant === 'danger' ? 'danger' : tone;
  const effectiveMessage = description !== undefined ? description : message;
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={handleClose} className="h-[34px] px-3.5 rounded-md text-[13.5px] font-medium text-ink-2 hover:bg-sunken">{cancelLabel}</button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              onConfirm(text.trim());
              onOpenChange?.(false);
            }}
            className={cx(
              'h-[34px] px-3.5 rounded-md text-[13.5px] font-medium text-white disabled:opacity-50',
              effectiveTone === 'danger' ? 'bg-critical hover:opacity-90' : 'bg-primary hover:bg-primary-hover',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {effectiveMessage && <p className="text-[13.5px] text-ink leading-relaxed">{effectiveMessage}</p>}
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

/* -------------------------------------------------------------- ActionMenu */

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  disabled?: boolean;
}

/**
 * Nút “⋯” mở danh sách thao tác của một bản ghi. Dùng trong hàng bảng để giữ tối đa
 * một nút hiện sẵn. Tự chặn lan sự kiện để không kích hoạt `onRowClick`.
 */
export function ActionMenu({ items, label = 'Thao tác khác' }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-sunken"
      >
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-8 z-30 min-w-[180px] py-1 bg-surface border border-line rounded-lg shadow-md text-left origin-top-right animate-in fade-in zoom-in-95 duration-(--motion-fast) ease-enter">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onSelect(); }}
                className="w-full flex items-center gap-2 px-3 h-8 text-[13px] text-ink hover:bg-sunken disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
              >
                {Icon && <Icon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Pagination */

/** Chân bảng: vị trí đang xem, số dòng mỗi trang, trang trước/sau. Chỉ đặt ở cuối bảng. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [20, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (n: number) => void;
  pageSizes?: number[];
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nav = 'h-7 w-7 inline-flex items-center justify-center rounded-md border border-line-strong text-ink-2 hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-2xs text-ink-3">
      <span className="tabular-nums">{from}–{to} trong {total}</span>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            Mỗi trang
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 pl-2 pr-6 rounded-md border border-line-strong bg-surface text-[12.5px] text-ink"
            >
              {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <div className="inline-flex items-center gap-1.5">
          <button type="button" className={nav} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="tabular-nums text-ink-2 min-w-[48px] text-center">{page} / {pages}</span>
          <button type="button" className={nav} disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Trang sau">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- PageActions */

/** Màn đang hiển thị hay đang ẩn (các tab giữ trạng thái vẫn mount khi ẩn). */
export const PageActiveContext = React.createContext(true);

const PAGE_ACTIONS_SLOT = 'page-actions';
const noopSubscribe = () => () => {};

/** Chỗ đặt nút chính của trang, nằm cuối thanh trên. Chỉ khung app (TopHeader) đặt. */
export function PageActionsSlot() {
  return <div id={PAGE_ACTIONS_SLOT} className="flex items-center gap-2 empty:hidden" />;
}

/**
 * Đưa nút chính của màn lên thanh trên, cạnh tiêu đề trang (DESIGN_SYSTEM.md §7).
 * Thay cho một hàng riêng chỉ chứa nút. Tối đa một nút `primary`.
 */
export function PageActions({ children }: { children: React.ReactNode }) {
  const active = useContext(PageActiveContext);
  const target = useSyncExternalStore(
    noopSubscribe,
    () => document.getElementById(PAGE_ACTIONS_SLOT),
    () => null,
  );
  if (!active || !target) return null;
  return createPortal(children, target);
}
