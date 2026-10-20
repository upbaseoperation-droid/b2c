'use client';

/**
 * Chuyển động dùng chung — quy tắc ở DESIGN_SYSTEM.md §9.
 * Mỗi chuyển động phải nói lên một điều: số đã đổi, phần tử đến từ đâu, thao tác đã xong.
 * Màn hình không tự viết keyframe hay transition riêng; dùng các thành phần và hook dưới đây.
 * Thời lượng và đường cong: token --motion-* và --ease-* trong globals.css.
 */

import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Khớp với :root trong globals.css, dùng cho Web Animations API. */
export const MOTION = {
  fast: 120,
  base: 200,
  slow: 320,
  data: 640,
  easeEnter: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  easeExit: 'cubic-bezier(0.4, 0, 1, 1)',
  easeMove: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/* ------------------------------------------------------- Reduced motion */

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** Người dùng bật "giảm chuyển động" trong hệ điều hành. CSS đã tự tắt; hook này cho JS. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_QUERY).matches;
}

/* ---------------------------------------------------------- NumberRoll */

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Số lăn như đồng hồ đo. Khi giá trị đổi, chỉ chữ số thay đổi mới lăn; chữ số giữ nguyên đứng yên.
 * Lần đầu hiện: lăn từ 0 lên (một lần, tạo cảm giác số "dừng lại").
 *
 * `value`: chuỗi đã định dạng (`formatVndShort(n)`, `formatNumber(n)`…).
 * `numeric` + `formatDelta`: hiện mức chênh (ví dụ "+12,4%") vài giây khi số đổi.
 * `invert`: chỉ số càng thấp càng tốt (chi phí, số gian vượt trần) → giảm là màu tích cực.
 */
export function NumberRoll({
  value,
  numeric,
  formatDelta,
  invert = false,
  className,
}: {
  value: string | number;
  numeric?: number;
  formatDelta?: (diff: number, prev: number) => string;
  invert?: boolean;
  className?: string;
}) {
  const text = String(value);

  // Lưu giá trị trước trong state (không dùng effect) để tính mức chênh ngay khi số đổi.
  const [track, setTrack] = useState<{ numeric?: number; delta: { id: number; diff: number; prev: number } | null }>({ numeric, delta: null });
  if (numeric !== track.numeric) {
    const prev = track.numeric;
    setTrack({
      numeric,
      delta: numeric !== undefined && prev !== undefined && numeric !== prev ? { id: (track.delta?.id ?? 0) + 1, diff: numeric - prev, prev } : track.delta,
    });
  }
  const delta = track.delta;

  const up = delta ? delta.diff > 0 : false;
  const good = invert ? !up : up;

  return (
    <span className={cx('tabular-nums', className)}>
      <span>{text}</span>
      {delta && formatDelta && (
        <span key={delta.id} className={cx('num-roll-delta', good ? 'text-positive' : 'text-critical')}>
          {delta.diff > 0 ? '+' : ''}{formatDelta(delta.diff, delta.prev)}
        </span>
      )}
    </span>
  );
}

/** Định dạng mức chênh theo % so với giá trị cũ: "+12,4%". Dùng cho `formatDelta`. */
export const deltaPercent = (diff: number, prev: number) =>
  prev === 0 ? '' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format((diff / Math.abs(prev)) * 100)}%`;

/* ------------------------------------------------------ SlidingIndicator */

type Box = { x: number; y: number; w: number; h: number };

/**
 * Đo vị trí phần tử đang chọn (`[data-active="true"]`) trong `containerRef` để một vạch chỉ báo
 * trượt tới đó. Dùng cho menu trái, Tabs, Segmented. Container phải `position: relative`.
 */
export function useActiveBox(containerRef: React.RefObject<HTMLElement | null>, activeKey: unknown) {
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);
  useIsoLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const measure = () => {
      const el = root.querySelector<HTMLElement>('[data-active="true"]');
      if (!el) {
        setBox(prev => (prev === null ? prev : null));
        return;
      }
      const r = el.getBoundingClientRect();
      const c = root.getBoundingClientRect();
      const nx = Math.round(r.left - c.left + root.scrollLeft);
      const ny = Math.round(r.top - c.top + root.scrollTop);
      const nw = Math.round(r.width);
      const nh = Math.round(r.height);
      setBox(prev => (prev && prev.x === nx && prev.y === ny && prev.w === nw && prev.h === nh ? prev : { x: nx, y: ny, w: nw, h: nh }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [containerRef, activeKey]);
  // Lần đo đầu không trượt từ góc (0,0); từ lần sau mới bật transition.
  useEffect(() => {
    if (!box || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [box, ready]);
  return { box, ready };
}

/** Vạch chỉ báo trượt. `className` quyết định hình dạng (nền, gạch chân, vạch trái). */
export function SlidingIndicator({ box, ready, className, fit = 'box' }: { box: Box | null; ready: boolean; className?: string; fit?: 'box' | 'underline' }) {
  if (!box) return null;
  const style: React.CSSProperties =
    fit === 'underline'
      ? { left: 0, bottom: 0, height: 2, width: box.w, transform: `translateX(${box.x}px)` }
      : { left: 0, top: 0, width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` };
  return <span aria-hidden="true" data-ready={ready} className={cx('sliding-indicator', className)} style={style} />;
}

/* ------------------------------------------------------------ FLIP list */

/**
 * Hàng/thẻ đổi chỗ có chuyển động (FLIP): khi sắp xếp hoặc lọc, phần tử còn lại trượt về
 * vị trí mới thay vì nhảy; phần tử mới hiện dần. Đánh dấu con trực tiếp bằng `data-flip="<khóa>"`.
 * Chỉ áp cho `limit` phần tử đầu để danh sách dài vẫn nhẹ.
 */
export function useFlipList(containerRef: React.RefObject<HTMLElement | null>, orderKey: string, limit = 40) {
  const prev = useRef<Map<string, number> | null>(null);
  const prevRoot = useRef<HTMLElement | null>(null);
  useIsoLayoutEffect(() => {
    const root = containerRef.current;
    // Bảng bị ẩn rồi hiện lại (đổi tab, đổi chế độ xem): vị trí cũ không còn đúng, đo lại từ đầu.
    if (root !== prevRoot.current) prev.current = null;
    prevRoot.current = root;
    if (!root || root.offsetParent === null) {
      prev.current = null;
      return;
    }
    const items = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-flip]')).slice(0, limit);
    const next = new Map<string, number>();
    const animate = prev.current !== null && !prefersReducedMotion() && typeof root.animate === 'function';
    for (const el of items) {
      const key = el.dataset.flip as string;
      const top = el.offsetTop;
      next.set(key, top);
      if (!animate) continue;
      const before = prev.current!.get(key);
      if (before === undefined) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.base, easing: MOTION.easeEnter });
      } else if (before !== top) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: MOTION.slow, easing: MOTION.easeMove });
      }
    }
    prev.current = next;
  }, [containerRef, orderKey, limit]);
}

/* ------------------------------------------------------------- StepMark */

function useBecameTrue(flag: boolean) {
  const [state, setState] = useState({ flag, now: false });
  if (flag !== state.flag) setState({ flag, now: flag });
  return state.now;
}

/**
 * Dấu của một bước (số thứ tự → dấu tích). Khi bước vừa được hoàn tất trong phiên này,
 * vòng tròn "đóng dấu" và dấu tích được vẽ nét. Bước đã xong từ trước thì hiện tĩnh.
 */
export function StepMark({ done, label, size = 24, className }: { done: boolean; label: React.ReactNode; size?: number; className?: string }) {
  const justDone = useBecameTrue(done);
  return (
    <span
      className={cx(
        'step-mark rounded-full inline-flex items-center justify-center text-2xs font-semibold shrink-0 border',
        done ? 'bg-positive border-positive text-white' : 'bg-sunken border-line text-ink-2',
        justDone && 'is-done-now',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {done ? (
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : label}
    </span>
  );
}

/**
 * Bọc một nhãn/khối để nó "hiện lại" một lần khi `on` đổi (ví dụ trạng thái Chờ duyệt → Đã duyệt).
 * Không chạy ở lần hiện đầu tiên.
 */
export function ChangeFlash({ on, children, className }: { on: unknown; children: React.ReactNode; className?: string }) {
  const [state, setState] = useState({ on, count: 0 });
  if (!Object.is(on, state.on)) setState({ on, count: state.count + 1 });
  const count = state.count;
  return <span key={count} className={cx('inline-flex', count > 0 && 'state-changed', className)}>{children}</span>;
}

/* ------------------------------------------------------------- Presence */

/**
 * Giữ phần tử thêm một nhịp sau khi `open` tắt để chạy hiệu ứng đóng.
 * Trả về `mounted` (còn render không) và `closing` (đang chạy hiệu ứng đóng).
 */
export function usePresence(open: boolean, exitMs: number = MOTION.fast) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(t);
  }, [open, mounted, exitMs]);
  return { mounted, closing: mounted && !open };
}

type PresenceExit = 'pop' | 'drawer';

/**
 * Hiệu ứng đóng cho lớp nổi tự viết (`fixed inset-0 …`). Khi `show` tắt, giữ nội dung lần
 * hiện cuối thêm một nhịp: cả lớp mờ dần, phần tử có `data-motion-panel` thu nhỏ (`pop`)
 * hoặc trượt ra phải (`drawer`). Không đổi bố cục: lúc mở là `display: contents`.
 *
 *   <Presence show={isOpen}>{isOpen && (<div className="fixed inset-0 …">…</div>)}</Presence>
 *
 * Component tự trả `null` khi đóng: thay `if (!open) return null` bằng
 * `if (!open) return <Presence show={false} />` và bọc phần render chính bằng `<Presence show>`.
 */
export function Presence({ show, exit = 'pop', children }: { show: boolean; exit?: PresenceExit; children?: React.ReactNode }) {
  const { mounted, closing } = usePresence(show, exit === 'drawer' ? MOTION.base : MOTION.fast);
  // Dữ liệu của màn cha thường đã bị xóa khi đóng: giữ nội dung lần hiện cuối.
  const [frozen, setFrozen] = useState(children);
  if (show && frozen !== children) setFrozen(children);
  if (!mounted) return null;
  return (
    <div className="motion-presence" data-presence={closing ? exit : 'open'}>
      {show ? children : frozen}
    </div>
  );
}

/* -------------------------------------------------------- View transition */

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void>; ready: Promise<void> } };

/**
 * Chuyển cảnh giữa hai trạng thái màn hình (danh sách → hồ sơ) bằng View Transitions API.
 * Phần tử có cùng `view-transition-name` ở hai trạng thái sẽ bay từ chỗ cũ sang chỗ mới.
 * `before`: gắn tên cho phần tử ở trạng thái cũ. `after`: gắn tên cho phần tử ở trạng thái mới.
 * Trình duyệt không hỗ trợ hoặc người dùng giảm chuyển động → đổi trạng thái ngay.
 */
export function withViewTransition(update: () => void, hooks?: { before?: () => void; after?: () => void; cleanup?: () => void }) {
  const doc = document as ViewTransitionDoc;
  if (!doc.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  hooks?.before?.();
  const t = doc.startViewTransition(() => {
    flushSync(update);
    hooks?.after?.();
  });
  // Trình duyệt có thể bỏ chuyển cảnh (tab bị ẩn, chuyển cảnh khác chen vào): trạng thái vẫn đổi, chỉ không có hiệu ứng.
  t.ready.catch(() => {});
  t.finished.catch(() => {}).finally(() => hooks?.cleanup?.());
}

/** Gắn `view-transition-name` tạm thời cho các phần tử; trả về hàm gỡ. */
export function tagShared(pairs: Array<[Element | null | undefined, string]>) {
  const tagged: HTMLElement[] = [];
  for (const [el, name] of pairs) {
    if (el instanceof HTMLElement) {
      el.style.viewTransitionName = name;
      tagged.push(el);
    }
  }
  return () => tagged.forEach((el) => { el.style.viewTransitionName = ''; });
}

/**
 * Chuyển cảnh danh sách ↔ hồ sơ một bản ghi, dựng sẵn từ withViewTransition + tagShared.
 *
 * Trong hàng danh sách: `<span {...sharedFrom('koc-avatar', koc.id)}>` (mỗi phần một tên).
 * Ở đầu hồ sơ: `<span style={sharedTo('koc-avatar')}>`.
 * Mở: `openShared(koc.id, () => setOpenId(koc.id))`. Quay lại: `closeShared(koc.id, () => setOpenId(null))`.
 */
export const sharedFrom = (name: string, key: string) => ({ 'data-vt': `${name}|${key}` });
export const sharedTo = (name: string): React.CSSProperties => ({ viewTransitionName: name });

function tagRow(key: string) {
  const pairs = Array.from(document.querySelectorAll<HTMLElement>('[data-vt]'))
    .filter((el) => el.offsetParent !== null && el.dataset.vt!.endsWith(`|${key}`))
    .map((el) => [el, el.dataset.vt!.slice(0, el.dataset.vt!.indexOf('|'))] as [Element, string]);
  return tagShared(pairs);
}

export function openShared(key: string, update: () => void) {
  let untag = () => {};
  withViewTransition(update, { before: () => { untag = tagRow(key); }, cleanup: () => untag() });
}

export function closeShared(key: string, update: () => void) {
  let untag = () => {};
  withViewTransition(update, { after: () => { untag = tagRow(key); }, cleanup: () => untag() });
}

/* ------------------------------------------------------------- Skeleton */

/** Khung giữ chỗ khi đang tải. Đặt đúng hình dạng nội dung sắp hiện. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden="true" className={cx('skeleton block h-3', className)} style={style} />;
}

/** Hàng giữ chỗ cho bảng: giữ khung bảng, không thay cả trang bằng vòng xoay. */
export function SkeletonRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-line last:border-b-0" aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton style={{ width: `${c === 0 ? 70 : 40 + ((r * 7 + c * 13) % 40)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
