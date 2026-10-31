'use client';

/**
 * Combobox: một ô vừa gõ tìm vừa chọn, cho danh sách lớn (KOC, brand, gian hàng…).
 * Thay cho cặp "ô tìm + Select" và `.slice(0, N)`. Cuộn ảo nên chịu được hàng nghìn mục.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export interface ComboboxOption {
  value: string;
  label: string;
  /** Dòng phụ nhỏ dưới nhãn (kênh, mã…). Không đưa CCCD/MST/STK vào đây. */
  hint?: string;
  /** Chuỗi chỉ để tìm kiếm, không hiển thị (SĐT, mã, tên kênh…). */
  searchText?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, option: ComboboxOption | undefined) => void;
  id?: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Cho phép bỏ chọn bằng nút X. */
  clearable?: boolean;
  className?: string;
  'aria-label'?: string;
}

const ROW_H = 40;
const MAX_VISIBLE = 7;
const OVERSCAN = 4;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export function Combobox({
  options,
  value,
  onChange,
  id,
  placeholder = 'Chọn…',
  emptyText = 'Không có mục phù hợp',
  disabled,
  clearable,
  className,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const autoId = useId();
  const listId = `${autoId}-list`;
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 240 });

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chuẩn hóa một lần cho mỗi danh sách, để gõ phím không phải chuẩn hóa lại hàng nghìn chuỗi.
  const indexed = useMemo(
    () => options.map((o) => ({ o, key: normalize(`${o.label} ${o.value} ${o.hint ?? ''} ${o.searchText ?? ''}`) })),
    [options],
  );
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    const terms = q.split(/\s+/);
    return indexed.filter((r) => terms.every((t) => r.key.includes(t))).map((r) => r.o);
  }, [indexed, options, query]);

  const updatePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const need = Math.min(MAX_VISIBLE, Math.max(filtered.length, 1)) * ROW_H + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const up = spaceBelow < need && rect.top > spaceBelow;
    setPos({
      left: rect.left,
      width: rect.width,
      top: up ? undefined : rect.bottom + 4,
      bottom: up ? window.innerHeight - rect.top + 4 : undefined,
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    const onMove = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      updatePos();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, updatePos]);

  const scrollToIndex = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = i * ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
  };

  const openMenu = () => {
    if (disabled) return;
    const idx = Math.max(0, filtered.findIndex((o) => o.value === value));
    setActive(idx);
    setOpen(true);
    requestAnimationFrame(() => scrollToIndex(idx));
  };

  const pick = (o: ComboboxOption) => {
    if (o.disabled) return;
    onChange(o.value, o);
    setOpen(false);
    setQuery('');
    inputRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openMenu();
      const next = Math.min(Math.max(active + (e.key === 'ArrowDown' ? 1 : -1), 0), Math.max(filtered.length - 1, 0));
      setActive(next);
      scrollToIndex(next);
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const o = filtered[active];
      if (o) pick(o);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
      setQuery('');
    }
  };

  const viewH = Math.min(MAX_VISIBLE, Math.max(filtered.length, 1)) * ROW_H;
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(filtered.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);

  return (
    <div ref={wrapRef} className={cx('relative w-full', className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : selected?.label ?? ''}
        placeholder={open && selected ? selected.label : placeholder}
        onFocus={openMenu}
        onClick={() => !open && openMenu()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setScrollTop(0);
          if (scrollRef.current) scrollRef.current.scrollTop = 0;
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cx(
          'h-9 w-full rounded-md border border-line-strong bg-surface pl-3 text-ctl-md text-ink focus:outline-none focus:border-focus disabled:bg-sunken disabled:text-ink-3',
          clearable && selected && !disabled ? 'pr-14' : 'pr-8',
          open && 'border-focus ring-2 ring-focus/15',
        )}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="Bỏ chọn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange('', undefined)}
            className="rounded p-0.5 text-ink-3 hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={cx('w-3.5 h-3.5 text-ink-3 pointer-events-none transition-transform', open && 'rotate-180')} />
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 220 }}
            className="bg-surface border border-line-strong rounded-lg shadow-xl overflow-hidden"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-ink-3 text-center">{emptyText}</div>
            ) : (
              <div
                ref={scrollRef}
                id={listId}
                role="listbox"
                onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                style={{ maxHeight: viewH }}
                className="overflow-y-auto"
              >
                <div style={{ height: filtered.length * ROW_H, position: 'relative' }}>
                  {filtered.slice(first, last).map((o, k) => {
                    const i = first + k;
                    const isSel = o.value === value;
                    return (
                      <div
                        key={`${o.value}-${i}`}
                        role="option"
                        aria-selected={isSel}
                        aria-disabled={o.disabled}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pick(o)}
                        style={{ position: 'absolute', top: i * ROW_H, height: ROW_H, left: 0, right: 0 }}
                        className={cx(
                          'px-3 flex items-center justify-between gap-2 cursor-pointer',
                          i === active && 'bg-sunken',
                          isSel && 'text-accent',
                          o.disabled && 'opacity-45 pointer-events-none',
                        )}
                      >
                        <span className="min-w-0 leading-tight">
                          <span className={cx('block truncate text-xs', isSel && 'font-medium')}>{o.label}</span>
                          {o.hint && <span className="block truncate text-2xs text-ink-3">{o.hint}</span>}
                        </span>
                        {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
