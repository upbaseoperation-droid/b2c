'use client';

/**
 * Khối dựng màn hình: thanh công cụ, khung nội dung, bộ lọc, bảng dữ liệu, modal, form.
 * Màn hình nào cũng ghép từ các khối này để cùng vị trí, cùng hành vi. Quy tắc: DESIGN_SYSTEM.md §5, §7.
 */

import React, { useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

/* ----------------------------------------------------------------- Density */

export type DensityMode = 'comfortable' | 'compact';
export const DensityContext = React.createContext<DensityMode>('comfortable');
export const useDensity = () => useContext(DensityContext);

/**
 * Bọc một màn nhiều số liệu (Dashboard, báo cáo) để dùng mật độ dày: chữ nhỏ một bậc, số chỉ số dạng mono,
 * ô chỉ số tách thẻ (tối đa 8 ô/hàng), khung không kẻ ngang dưới tiêu đề. Xem DESIGN_SYSTEM.md §3.1.
 */
export function Density({ mode = 'compact', className, children }: { mode?: DensityMode; className?: string; children: React.ReactNode }) {
  return (
    <DensityContext.Provider value={mode}>
      <div data-density={mode} className={className}>{children}</div>
    </DensityContext.Provider>
  );
}

/* ------------------------------------------------------------------- Panel */

/**
 * Khung nội dung có viền. Dùng cho bảng, form, nhóm thao tác độc lập.
 * `icon`: icon nhỏ màu nhấn trước tiêu đề. `meta`: một dòng ngữ cảnh dưới tiêu đề — chỉ kỳ dữ liệu, lúc cập nhật,
 * nguồn (vd "29/09 – 28/10 · cập nhật 17:13"), không dùng để giải thích. `flush`: nội dung tràn sát viền (bảng).
 */
export function Panel({
  title,
  description,
  actions,
  children,
  flush = false,
  className,
  icon: Icon,
  meta,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
  icon?: LucideIcon;
  meta?: React.ReactNode;
}) {
  const compact = useDensity() === 'compact';
  return (
    <section className={cx('workspace-panel bg-surface border border-line rounded-xl overflow-hidden shadow-2xs', className)}>
      {(title || actions) && (
        <header
          className={cx(
            'flex flex-wrap items-start justify-between gap-2 sm:gap-3 bg-surface',
            compact ? cx('px-4 pt-3.5', flush ? 'pb-3' : 'pb-0') : 'px-3.5 sm:px-4 py-3 border-b border-line',
          )}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink leading-tight">
                {Icon && <Icon className="w-4 h-4 text-critical shrink-0" strokeWidth={1.75} />}
                {title}
              </h3>
            )}
            {meta && <p className={cx('mt-1 text-2xs text-ink-3', Icon && 'pl-6')}>{meta}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 max-w-full">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : compact ? 'px-4 pb-4 pt-3' : 'p-3.5 sm:p-4'}>{children}</div>
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
    <div ref={ref} className="relative flex items-center gap-1.5 overflow-x-auto overflow-y-hidden max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label={label}>
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
              'relative h-7 px-2.5 rounded-full text-ctl-sm whitespace-nowrap shrink-0 border transition-colors duration-(--motion-base)',
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
        className="w-full h-[34px] pl-9 pr-8 rounded-md border border-line-strong bg-surface text-ctl-md text-ink focus:outline-none focus:border-focus"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-ink-3 hover:text-ink" aria-label="Xóa tìm kiếm">
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
        {search && <SearchInput {...search} className="w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-md" />}
        {filters}
        {resultCount !== undefined && <span className="ml-auto text-2xs text-ink-3 tabular-nums shrink-0">{resultCount} kết quả</span>}
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
  fitContainer = true,
  compact = true,
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
  /** Tự động vừa vặn container, không ép thanh cuộn ngang trên màn hình máy tính. */
  fitContainer?: boolean;
  /** Giảm padding các ô để hiển thị đầy đủ các cột mà không phải kéo ngang. */
  compact?: boolean;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // Sắp xếp/lọc: hàng còn lại trượt về chỗ mới, hàng mới hiện dần (DESIGN_SYSTEM.md §9).
  useFlipList(bodyRef, rows.map(rowKey).join('|'));
  const align = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const minWidth = fitContainer ? undefined : columns.reduce((s, c) => s + (c.width || 120), 0);
  const last = columns.length - 1;
  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <table
        className={cx(
          'w-full border-collapse text-xs',
          fitContainer && columns.length >= 5 && 'min-w-[600px] lg:min-w-0',
          fitContainer && columns.length === 4 && 'min-w-[480px] md:min-w-0',
        )}
        style={minWidth ? { minWidth } : undefined}
      >
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                scope="col"
                style={!fitContainer && c.width ? { minWidth: c.width } : c.width ? { width: `${c.width}px` } : undefined}
                className={cx(
                  compact
                    ? 'px-2.5 sm:px-3 py-2 text-3xs font-semibold text-ink-3 bg-sunken/40 border-b border-line'
                    : 'px-3.5 sm:px-4 py-2.5 text-2xs font-semibold text-ink-3 bg-sunken/40 border-b border-line',
                  align(c.align),
                  stickyLast && i === last && 'sm:sticky sm:right-0 sm:z-10 bg-sunken border-l border-line',
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
              <td colSpan={columns.length} className={compact ? "px-3" : "px-4"}>
                {empty ?? <p className="py-10 text-ctl text-ink-3">Không có dữ liệu phù hợp.</p>}
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
                      compact ? 'px-2.5 sm:px-3 py-2 align-top text-ink' : 'px-3.5 sm:px-4 py-3 align-top text-ink',
                      align(c.align),
                      c.className,
                      stickyLast && i === last && 'sm:sticky sm:right-0 bg-surface group-hover:bg-canvas border-l border-line',
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

const MODAL_SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-6xl', '3xl': 'max-w-7xl', full: 'max-w-[96vw]' } as const;

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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[data-select-portal="true"]') && onClose();
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([data-close]):not([disabled])');
      first?.focus({ preventScroll: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(
    <div className={cx('fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4', closing && 'pointer-events-none')} role="presentation">
      <div className={cx('fixed inset-0 bg-[rgb(22_23_26/0.4)]', closing ? 'motion-exit-fade' : 'animate-in fade-in duration-(--motion-base)')} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('relative w-full max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh] flex flex-col overflow-hidden bg-surface rounded-xl shadow-2xl', closing ? 'motion-exit-pop' : 'animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter', MODAL_SIZE[size])}
      >
        <header className="shrink-0 flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-5 pt-3.5 sm:pt-4 pb-3 border-b border-line bg-surface">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">{view.title}</h2>
          </div>
          <button type="button" data-close onClick={onClose} className="h-7 w-7 inline-flex items-center justify-center -mr-1 rounded-md text-ink-3 hover:text-ink hover:bg-sunken shrink-0" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </header>
        {view.children && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-5 py-3.5 sm:py-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 min-w-0">{view.children}</div>
          </div>
        )}
        {view.footer && <footer className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-line bg-canvas rounded-b-xl">{view.footer}</footer>}
      </div>
    </div>,
    document.body,
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
  tone?: 'default' | 'danger' | 'critical';
  variant?: 'primary' | 'danger' | 'default' | 'critical';
  /** Có ô nhập lý do. `required`: không cho xác nhận khi trống. */
  reason?: { label: string; placeholder?: string; defaultValue?: string; required?: boolean };
  onConfirm: (reason?: string) => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [text, setText] = useState(reason?.defaultValue || '');
  const fieldId = useId();
  const syncKey = `${open}-${reason?.defaultValue || ''}`;
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    if (open) setText(reason?.defaultValue || '');
  }
  const blocked = !!reason?.required && !text.trim();
  const handleClose = () => {
    onCancel?.();
    onOpenChange?.(false);
  };
  const effectiveTone = variant === 'danger' || variant === 'critical' || tone === 'danger' || tone === 'critical' ? 'danger' : 'default';
  const effectiveMessage = description !== undefined ? description : message;
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={handleClose} className="h-[34px] px-3.5 rounded-md text-ctl-md font-medium text-ink-2 hover:bg-sunken">{cancelLabel}</button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              onConfirm(text.trim());
              onOpenChange?.(false);
            }}
            className={cx(
              'h-[34px] px-3.5 rounded-md text-ctl-md font-medium text-white disabled:opacity-50',
              effectiveTone === 'danger' ? 'bg-critical hover:opacity-90' : 'bg-primary hover:bg-primary-hover',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {effectiveMessage && <p className="text-ctl-md text-ink leading-relaxed">{effectiveMessage}</p>}
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
export function Field({ label, error, htmlFor, children, className, labelClassName, noWrap }: { label: string; hint?: string; error?: string; htmlFor?: string; children: React.ReactNode; className?: string; labelClassName?: string; noWrap?: boolean }) {
  const parenMatch = !noWrap ? label.match(/^(.*?\s)(\([^()]+\)(?:\s*\*)?)$/) : null;
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)] gap-1.5 min-w-0 [&>select]:w-full [&>[data-select-root]]:w-full', className)}>
      <label htmlFor={htmlFor} className={cx('text-ctl font-medium text-ink text-pretty', noWrap && 'whitespace-nowrap', labelClassName)}>
        {parenMatch ? <>{parenMatch[1]}<span className="whitespace-nowrap">{parenMatch[2]}</span></> : label}
      </label>
      {children}
      {error ? <p className="text-2xs text-critical">{error}</p> : null}
    </div>
  );
}

const CONTROL = 'rounded-md border border-line-strong bg-surface text-ctl-md text-ink focus:outline-none focus:border-focus disabled:bg-sunken disabled:text-ink-3';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(CONTROL, "h-9 px-3 w-full", className)} {...rest} />;
});

interface ParsedSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

function extractSelectNodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractSelectNodeText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractSelectNodeText(node.props.children);
  }
  return '';
}

function parseSelectChildren(children: React.ReactNode, groupLabel?: string): ParsedSelectOption[] {
  const out: ParsedSelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<Record<string, unknown>>(child)) return;
    if (child.type === React.Fragment) {
      out.push(...parseSelectChildren(child.props.children as React.ReactNode, groupLabel));
      return;
    }
    if (child.type === 'optgroup') {
      const grp = typeof child.props.label === 'string' ? child.props.label : undefined;
      out.push(...parseSelectChildren(child.props.children as React.ReactNode, grp));
      return;
    }
    if (child.type === 'option') {
      const label = extractSelectNodeText(child.props.children as React.ReactNode).trim();
      const val = child.props.value !== undefined ? String(child.props.value) : label;
      out.push({
        value: val,
        label: label || val,
        disabled: Boolean(child.props.disabled),
        group: groupLabel,
      });
    }
  });
  return out;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, value, defaultValue, onChange, disabled, id, name, title, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  const options = React.useMemo(() => parseSelectChildren(children), [children]);
  const [internalVal, setInternalVal] = useState<string>(() => {
    if (value !== undefined) return String(value);
    if (defaultValue !== undefined) return String(defaultValue);
    return options[0]?.value ?? '';
  });
  const currentValue = value !== undefined ? String(value) : internalVal;
  const selectedOpt = options.find((o) => o.value === currentValue) || options[0];

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 200,
  });

  const updatePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 240 && rect.top > spaceBelow;
    const menuWidth = Math.max(rect.width, 210);
    const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
    setPos({
      left: Math.min(Math.max(8, rect.left), maxLeft),
      width: menuWidth,
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    if (options.length > 8) {
      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 20);
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      updatePos();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, options.length, updatePos]);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q) ||
        (o.group && o.group.toLowerCase().includes(q)),
    );
  }, [options, search]);

  const handlePick = (opt: ParsedSelectOption) => {
    if (opt.disabled) return;
    if (value === undefined) setInternalVal(opt.value);
    if (onChange) {
      const syntheticEvent = {
        target: { value: opt.value, name: name || '', id: id || '' },
        currentTarget: { value: opt.value, name: name || '', id: id || '' },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
    setSearch('');
  };

  /*
  return (
  */
  return (
    <>
      <select
        ref={ref}
        id={id}
        name={name}
        value={currentValue}
        onChange={onChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
        {...rest}
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        data-select-root="true"
        disabled={disabled}
        title={title || selectedOpt?.label}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            setSearch('');
            updatePos();
          }
          setOpen((v) => !v);
        }}
        className={cx(
          CONTROL,
          'h-9 px-3 inline-flex items-center justify-between gap-2 min-w-0 max-w-full text-left',
          open && 'border-focus ring-2 ring-focus/15',
          className,
        )}
      >
        <span className="truncate flex-1 min-w-0">{selectedOpt?.label ?? ''}</span>
        <ChevronDown
          className={cx(
            'w-3.5 h-3.5 text-ink-3 shrink-0 transition-transform duration-150',
            open && 'rotate-180 text-ink',
          )}
        />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-select-portal="true"
            role="listbox"
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              zIndex: 220,
            }}
            className="bg-surface border border-line-strong rounded-lg shadow-xl overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100"
          >
            {options.length > 8 && (
              <div className="p-1.5 border-b border-line bg-sunken/50 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm nhanh..."
                    className="w-full h-7 pl-7 pr-2 text-xs rounded border border-line bg-surface text-ink focus:outline-none focus:border-focus"
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto py-1 divide-y divide-line/40">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-ink-3 text-center">Không có mục phù hợp</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const active = opt.value === currentValue;
                  const prevGroup = idx > 0 ? filteredOptions[idx - 1]?.group : undefined;
                  const showGroupHeader = Boolean(opt.group && opt.group !== prevGroup);
                  return (
                    <React.Fragment key={`${opt.value}-${idx}`}>
                      {showGroupHeader && (
                        <div className="px-2.5 py-1 text-3xs font-semibold text-ink-3 bg-sunken/60">
                          {opt.group}
                        </div>
                      )}
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={opt.disabled}
                        onClick={() => handlePick(opt)}
                        className={cx(
                          'w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors',
                          active
                            ? 'bg-accent-soft text-accent font-semibold'
                            : 'text-ink hover:bg-sunken',
                          opt.disabled && 'opacity-45 pointer-events-none',
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
  if (false) return (
    <select>
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
  danger?: boolean;
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
                className="w-full flex items-center gap-2 px-3 h-8 text-ctl text-ink hover:bg-sunken disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
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
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-4 py-3 border-t border-line text-2xs text-ink-3">
      <span className="tabular-nums">{from}–{to} trong {total}</span>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            Mỗi trang
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 pl-2 pr-6 rounded-md border border-line-strong bg-surface text-ctl-sm text-ink"
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
const PAGE_HEADER_NAV_SLOT = 'page-header-nav';
const noopSubscribe = () => () => {};

/** Chỗ đặt nút chính của trang, nằm cuối thanh trên. Chỉ khung app (TopHeader) đặt. */
export function PageActionsSlot() {
  return <div id={PAGE_ACTIONS_SLOT} className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-1.5 sm:gap-2 max-w-full shrink-0 empty:hidden" />;
}

/** Chỗ đặt điều hướng phụ / bộ chọn ngữ cảnh cạnh tiêu đề trang. Chỉ khung app (TopHeader) đặt. */
export function PageHeaderNavSlot() {
  return <div id={PAGE_HEADER_NAV_SLOT} className="flex items-center gap-1.5 sm:gap-2 empty:hidden shrink-0" />;
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

/**
 * Đưa cụm điều hướng (nút quay lại, bộ chọn gian hàng/tháng/phiên bản) lên thẳng thanh trên cạnh tiêu đề trang.
 */
export function PageHeaderNav({ children }: { children: React.ReactNode }) {
  const active = useContext(PageActiveContext);
  const target = useSyncExternalStore(
    noopSubscribe,
    () => document.getElementById(PAGE_HEADER_NAV_SLOT),
    () => null,
  );
  if (!active || !target) return null;
  return createPortal(children, target);
}
