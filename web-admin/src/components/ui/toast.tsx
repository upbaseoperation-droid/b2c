'use client';

/**
 * Thông báo sau thao tác (toast). Nhiều thông báo xếp chồng như một xấp thẻ: thẻ mới ở trước,
 * thẻ cũ lùi ra sau; rê chuột vào để xoè ra và dừng đếm giờ. Quy tắc câu chữ: DESIGN_SYSTEM.md §6.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { MOTION } from './motion';

export type ToastType = 'success' | 'warning' | 'info' | 'error';
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving?: boolean;
}

const MAX_KEPT = 5;
const MAX_VISIBLE = 3;
const GAP = 8;
const PEEK = 10;

/** Hàng đợi thông báo. `show(message, type)` thay cho setState thủ công. */
export function useToastQueue(duration = 4500) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), MOTION.base);
  }, []);

  const schedule = useCallback((id: number, ms: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), ms));
  }, [dismiss]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId.current++;
    setToasts((ts) => [{ id, message, type }, ...ts].slice(0, MAX_KEPT));
    schedule(id, duration);
  }, [duration, schedule]);

  const pause = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
  }, []);

  const resume = useCallback(() => {
    // Đếm lại từ đầu cho từng thẻ, thẻ cũ tắt trước.
    const ids = Array.from(timers.current.keys());
    ids.reverse().forEach((id, i) => schedule(id, 1800 + i * 400));
  }, [schedule]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  return { toasts, show, dismiss, pause, resume };
}

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />,
  error: <XCircle className="w-4 h-4 text-rose-300 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-300 shrink-0" />,
};

export function ToastStack({
  toasts,
  onDismiss,
  onPause,
  onResume,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  onPause?: () => void;
  onResume?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const observer = useRef<ResizeObserver | null>(null);

  // Đo phần nội dung (không bị ép chiều cao khi thẻ lùi phía sau) + đệm dọc 2 × 10px.
  const measure = useCallback((el: HTMLDivElement | null, id: number) => {
    if (!el) return;
    if (!observer.current) {
      observer.current = new ResizeObserver((entries) => {
        setHeights((prev) => {
          const next = { ...prev };
          for (const e of entries) next[Number((e.target as HTMLElement).dataset.toastId)] = Math.max((e.target as HTMLElement).offsetHeight, 24) + 20;
          return next;
        });
      });
    }
    el.dataset.toastId = String(id);
    observer.current.observe(el);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);

  const live = toasts.filter((t) => !t.leaving);
  if (toasts.length === 0) return null;
  const frontHeight = heights[live[0]?.id ?? toasts[0].id] ?? 44;
  const expandedHeight = live.slice(0, MAX_VISIBLE).reduce((s, t) => s + (heights[t.id] ?? 44) + GAP, 0);

  // Vị trí dọc của từng thẻ khi xoè: cộng dồn chiều cao các thẻ mới hơn.
  const offsets = live.reduce<number[]>((acc, t, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (heights[live[i - 1].id] ?? 44) + GAP], []);
  return (
    <div
      className="fixed right-6 bottom-6 z-[60] w-[min(380px,calc(100vw-32px))]"
      style={{ height: expanded ? expandedHeight : frontHeight + PEEK * Math.min(live.length - 1, MAX_VISIBLE - 1) }}
      onMouseEnter={() => { setExpanded(true); onPause?.(); }}
      onMouseLeave={() => { setExpanded(false); onResume?.(); }}
      role="region"
      aria-label="Thông báo"
    >
      {toasts.map((t) => {
        const i = t.leaving ? Math.max(0, live.length) : live.indexOf(t);
        const y = expanded ? -(offsets[i] ?? 0) : -i * PEEK;
        const scale = expanded ? 1 : 1 - i * 0.05;
        const hidden = i >= MAX_VISIBLE;
        const collapsedBehind = !expanded && i > 0;
        return (
          <div
            key={t.id}
            className="toast-card"
            data-state={t.leaving ? 'exit' : 'enter'}
            role="status"
            aria-live="polite"
            style={{
              zIndex: MAX_KEPT - i,
              transform: t.leaving ? `translateY(${y + 12}px) scale(${scale * 0.96})` : `translateY(${y}px) scale(${scale})`,
              opacity: hidden ? 0 : undefined,
              height: collapsedBehind ? frontHeight : undefined,
              pointerEvents: hidden ? 'none' : undefined,
            }}
          >
            <div className="h-full pl-4 pr-2 py-2.5 rounded-md text-sm shadow-xl flex items-center gap-3 bg-ink text-white overflow-hidden">
              <div
                ref={(el) => measure(el, t.id)}
                className="flex items-center gap-3 min-w-0 flex-1 transition-opacity duration-(--motion-base)" style={{ opacity: collapsedBehind ? 0 : 1 }}>
                {ICON[t.type]}
                <span className="min-w-0">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="p-1 rounded-md hover:bg-white/20 transition-colors text-white/70 hover:text-white shrink-0"
                aria-label="Đóng thông báo"
                tabIndex={collapsedBehind ? -1 : 0}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
