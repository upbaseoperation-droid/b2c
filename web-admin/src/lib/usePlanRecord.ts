'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { threeWayMerge } from './threeWayMerge';

export type PlanRecordSyncStatus = 'idle' | 'loading' | 'saved' | 'dirty' | 'saving' | 'error';

/**
 * Tải và tự lưu dữ liệu theo từng kế hoạch qua API dạng GET/PUT { planId, revision, data }.
 * Lưu sau ~1 giây kể từ lần sửa cuối; nếu người khác đã lưu trước thì tải lại bản mới.
 */
export function usePlanRecord<T>(endpoint: string, planId: string | null, empty: T, onNotify?: (msg: string) => void, idKey = 'planId') {
  const [data, setData] = useState<T>(empty);
  const [status, setStatus] = useState<PlanRecordSyncStatus>('idle');
  const revisionRef = useRef(0);
  const latestRef = useRef<T>(empty);
  /** Bản máy chủ mà mình đã tải hoặc lưu gần nhất, làm mốc để gộp khi người khác lưu trước. */
  const baseRef = useRef<T | undefined>(undefined);
  const emptyRef = useRef(empty);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const conflictRetryRef = useRef(0);
  const notifyRef = useRef(onNotify);
  const flushRef = useRef<(id: string) => Promise<void>>(async () => {});
  useEffect(() => {
    notifyRef.current = onNotify;
  });

  const load = useCallback(
    async (id: string) => {
      setStatus('loading');
      try {
        const res = await fetch(`${endpoint}?${idKey}=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Lỗi ${res.status}`);
        revisionRef.current = body.revision;
        latestRef.current = body.data as T;
        baseRef.current = body.data as T;
        dirtyRef.current = false;
        setData(latestRef.current);
        setStatus('saved');
      } catch (err) {
        setStatus('error');
        notifyRef.current?.(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
      }
    },
    [endpoint, idKey]
  );

  const flush = useCallback(
    async (id: string) => {
      if (savingRef.current || !dirtyRef.current) return;
      savingRef.current = true;
      setStatus('saving');
      const snapshot = latestRef.current;
      try {
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [idKey]: id, revision: revisionRef.current, data: snapshot }),
        });
        const body = await res.json().catch(() => null);
        if (res.status === 409) {
          // Người khác đã lưu trước: gộp thay đổi của mình lên bản mới nhất rồi lưu lại
          savingRef.current = false;
          const latestRes = await fetch(`${endpoint}?${idKey}=${encodeURIComponent(id)}`, { cache: 'no-store' });
          const latestBody = await latestRes.json().catch(() => null);
          if (!latestRes.ok) throw new Error(latestBody?.error || `Lỗi ${latestRes.status}`);
          const merged = threeWayMerge<T>(baseRef.current, latestRef.current, latestBody.data as T);
          revisionRef.current = latestBody.revision;
          baseRef.current = latestBody.data as T;
          latestRef.current = merged.value;
          setData(merged.value);
          if (merged.conflicts.length > 0) {
            notifyRef.current?.(`Người khác vừa sửa ${merged.conflicts.length} mục trùng với bạn. Đã giữ bản của họ cho các mục đó, các thay đổi còn lại của bạn được giữ nguyên.`);
          } else {
            notifyRef.current?.('Người khác vừa lưu thay đổi. Đã gộp với thay đổi của bạn.');
          }
          conflictRetryRef.current += 1;
          if (conflictRetryRef.current <= 3) {
            void flushRef.current(id);
          } else {
            conflictRetryRef.current = 0;
            setStatus('error');
          }
          return;
        }
        if (!res.ok) {
          const rejected = res.status === 400 || res.status === 403 || res.status === 423;
          if (rejected) {
            // Máy chủ từ chối bản đang sửa: báo lý do và tải lại để màn hình không lệch với dữ liệu thật
            savingRef.current = false;
            notifyRef.current?.(body?.error || `Lỗi ${res.status}`);
            await load(id);
            return;
          }
          throw new Error(body?.error || `Lỗi ${res.status}`);
        }
        revisionRef.current = body.revision;
        baseRef.current = (body.data as T) ?? snapshot;
        conflictRetryRef.current = 0;
        savingRef.current = false;
        if (latestRef.current !== snapshot) {
          void flushRef.current(id);
        } else {
          dirtyRef.current = false;
          setStatus('saved');
          if (typeof window !== 'undefined' && endpoint === '/api/deal-board') {
            window.dispatchEvent(new CustomEvent('upbase-deal-board-updated'));
          }
        }
      } catch (err) {
        savingRef.current = false;
        setStatus('error');
        notifyRef.current?.(err instanceof Error ? err.message : 'Không lưu được dữ liệu.');
      }
    },
    [endpoint, idKey, load]
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dirtyRef.current = false;
    savingRef.current = false;
    if (!planId) {
      queueMicrotask(() => {
        setData(emptyRef.current);
        setStatus('idle');
      });
      return;
    }
    queueMicrotask(() => {
      void load(planId);
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [planId, load]);

  const update = useCallback(
    (next: T) => {
      if (!planId) return;
      latestRef.current = next;
      dirtyRef.current = true;
      setData(next);
      setStatus('dirty');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(planId), 1000);
    },
    [planId, flush]
  );

  const saveNow = useCallback(() => {
    if (planId) {
      if (timerRef.current) clearTimeout(timerRef.current);
      void flush(planId);
    }
  }, [planId, flush]);

  const reload = useCallback(() => (planId ? load(planId) : Promise.resolve()), [planId, load]);

  return { data, status, update, saveNow, reload };
}
