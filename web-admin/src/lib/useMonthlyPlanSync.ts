'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InputPlanBreakdownState } from './types';

/**
 * Đồng bộ kế hoạch tháng với database qua /api/monthly-plans.
 * - Tải danh sách khi mở màn hình.
 * - Tự lưu sau ~1.2 giây kể từ lần sửa cuối; có hàm saveNow() cho nút "Lưu" / "Quay lại".
 * - Chống ghi đè bằng revision: nếu người khác đã lưu trước, tải lại bản mới nhất và báo cho người dùng.
 * - Cảnh báo khi đóng/tải lại trang lúc còn thay đổi chưa lưu.
 */

export type PlanSyncStatus =
  | 'loading'   // Đang tải từ database
  | 'saved'     // Mọi thay đổi đã lưu
  | 'dirty'     // Có thay đổi, chờ lưu
  | 'saving'    // Đang lưu
  | 'error'     // Lưu lỗi, sẽ thử lại khi bấm Lưu
  | 'offline';  // Không kết nối được database — đang dùng dữ liệu mẫu, không lưu

export interface StoredPlan {
  plan: InputPlanBreakdownState;
  revision: number;
}

const CLIENT_PLANS_TTL_MS = 20_000;
let clientStoredPlansCache: { plans: StoredPlan[]; fetchedAt: number } | null = null;
let clientInflightPlansFetch: Promise<StoredPlan[]> | null = null;

export function getCachedClientMonthlyPlans(): InputPlanBreakdownState[] | null {
  if (!clientStoredPlansCache || clientStoredPlansCache.plans.length === 0) return null;
  return clientStoredPlansCache.plans.map(s => s.plan);
}

export function invalidateClientMonthlyPlansCache() {
  clientStoredPlansCache = null;
}

function upsertClientCachedPlan(stored: StoredPlan) {
  if (!clientStoredPlansCache) return;
  const idx = clientStoredPlansCache.plans.findIndex(p => p.plan.id === stored.plan.id);
  if (idx >= 0) {
    const next = [...clientStoredPlansCache.plans];
    next[idx] = stored;
    clientStoredPlansCache = { plans: next, fetchedAt: Date.now() };
  } else {
    clientStoredPlansCache = { plans: [stored, ...clientStoredPlansCache.plans], fetchedAt: Date.now() };
  }
}

export async function fetchClientMonthlyPlans(force = false): Promise<StoredPlan[]> {
  if (!force && clientStoredPlansCache && Date.now() - clientStoredPlansCache.fetchedAt < CLIENT_PLANS_TTL_MS) {
    return clientStoredPlansCache.plans;
  }
  if (!force && clientInflightPlansFetch) {
    return clientInflightPlansFetch;
  }
  const promise = (async () => {
    let res = await fetch('/api/monthly-plans', { cache: 'no-store' });
    if (res.status === 401) {
      await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
      res = await fetch('/api/monthly-plans', { cache: 'no-store' });
    }
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`);
    const body = (await res.json()) as { plans: StoredPlan[] };
    const plans = Array.isArray(body?.plans) ? body.plans : [];
    clientStoredPlansCache = { plans, fetchedAt: Date.now() };
    return plans;
  })().finally(() => {
    clientInflightPlansFetch = null;
  });
  clientInflightPlansFetch = promise;
  return promise;
}

interface UseMonthlyPlanSyncOptions {
  /** Danh sách kế hoạch hiệu lực (đã gộp bản đang mở trong Studio). */
  effectivePlans: InputPlanBreakdownState[];
  /** Nạp danh sách từ database vào state của màn hình. Có thể trả về danh sách đã chuẩn hóa để ghi nhận mốc đã lưu. */
  onLoaded: (plans: InputPlanBreakdownState[]) => InputPlanBreakdownState[] | void;
  /** Thay một kế hoạch bằng bản mới nhất từ database (khi bị ghi đè / bị khóa). */
  onReplacePlan: (plan: InputPlanBreakdownState) => InputPlanBreakdownState | void;
  onNotify?: (msg: string) => void;
  debounceMs?: number;
}

const serializedPlanCache = new WeakMap<InputPlanBreakdownState, string>();

const serialize = (plan: InputPlanBreakdownState): string => {
  const cached = serializedPlanCache.get(plan);
  if (cached !== undefined) return cached;
  const json = JSON.stringify(plan);
  serializedPlanCache.set(plan, json);
  return json;
};

export function useMonthlyPlanSync({
  effectivePlans,
  onLoaded,
  onReplacePlan,
  onNotify,
  debounceMs = 1200
}: UseMonthlyPlanSyncOptions) {
  const [status, setStatus] = useState<PlanSyncStatus>('loading');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const revisionsRef = useRef<Map<string, number>>(new Map());
  const lastSavedRef = useRef<Map<string, string>>(new Map());
  const lastSavedObjRef = useRef<Map<string, InputPlanBreakdownState>>(new Map());
  const latestPlansRef = useRef<InputPlanBreakdownState[]>(effectivePlans);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const rerunRef = useRef(false);
  const readyRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Giữ callback mới nhất mà không làm effect chạy lại
  const callbacksRef = useRef({ onLoaded, onReplacePlan, onNotify });
  useEffect(() => {
    callbacksRef.current = { onLoaded, onReplacePlan, onNotify };
  });

  useEffect(() => {
    latestPlansRef.current = effectivePlans;
  }, [effectivePlans]);

  const rememberStored = useCallback((stored: StoredPlan) => {
    revisionsRef.current.set(stored.plan.id, stored.revision);
    lastSavedObjRef.current.set(stored.plan.id, stored.plan);
    lastSavedRef.current.delete(stored.plan.id);
  }, []);

  // 1. Tải dữ liệu lần đầu
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedList = await fetchClientMonthlyPlans(reloadKey > 0);
        if (cancelled) return;
        const loadedPlans = storedList.map(p => p.plan);
        const maybeTransformed = callbacksRef.current.onLoaded(loadedPlans);
        const finalPlans = Array.isArray(maybeTransformed) ? maybeTransformed : loadedPlans;
        const byId = new Map(finalPlans.map(p => [p.id, p]));
        storedList.forEach(s => {
          rememberStored({
            revision: s.revision,
            plan: byId.get(s.plan.id) ?? s.plan
          });
        });
        readyRef.current = true;
        setStatus('saved');
        setLastSavedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        console.error('[plan-sync] load failed', err);
        setStatus('offline');
        setErrorMessage(err instanceof Error ? err.message : 'Không kết nối được database');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rememberStored, reloadKey]);

  const getDirtyPlans = useCallback(
    () =>
      latestPlansRef.current.filter(p => {
        const savedObj = lastSavedObjRef.current.get(p.id);
        if (savedObj === p) return false;
        if (!savedObj && !lastSavedRef.current.has(p.id)) return true;
        let savedJson = lastSavedRef.current.get(p.id);
        if (savedJson === undefined && savedObj) {
          savedJson = serialize(savedObj);
          lastSavedRef.current.set(p.id, savedJson);
        }
        const curJson = serialize(p);
        if (savedJson === curJson) {
          lastSavedObjRef.current.set(p.id, p);
          return false;
        }
        return true;
      }),
    []
  );

  // 2. Lưu các kế hoạch có thay đổi
  const flush = useCallback(async (): Promise<boolean> => {
    if (!readyRef.current) return false;
    if (inFlightRef.current) {
      rerunRef.current = true;
      return inFlightRef.current;
    }

    const run = async (): Promise<boolean> => {
      let allOk = true;
      do {
        rerunRef.current = false;
        const dirty = getDirtyPlans();
        if (!dirty.length) break;
        setStatus('saving');

        for (const plan of dirty) {
          const sentJson = serialize(plan);
          const revision = revisionsRef.current.get(plan.id);
          const isNew = revision === undefined;
          try {
            const res = await fetch(isNew ? '/api/monthly-plans' : `/api/monthly-plans/${encodeURIComponent(plan.id)}`, {
              method: isNew ? 'POST' : 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(isNew ? { plan } : { plan, expectedRevision: revision })
            });
            const body = await res.json().catch(() => null);

            if (res.ok) {
              const savedStored = body as StoredPlan;
              revisionsRef.current.set(plan.id, savedStored.revision);
              lastSavedObjRef.current.set(plan.id, plan);
              lastSavedRef.current.set(plan.id, sentJson);
              upsertClientCachedPlan({ revision: savedStored.revision, plan });
              continue;
            }

            // Bị người khác lưu trước hoặc phiên bản đã chốt: lấy bản mới nhất từ database
            if ((res.status === 409 || res.status === 423) && body?.current) {
              const current = body.current as StoredPlan;
              const replaced = callbacksRef.current.onReplacePlan(current.plan);
              const nextPlan = replaced || current.plan;
              rememberStored({
                revision: current.revision,
                plan: nextPlan
              });
              upsertClientCachedPlan({ revision: current.revision, plan: nextPlan });
              callbacksRef.current.onNotify?.(
                `${body.error} Đã tải lại bản mới nhất của "${current.plan.title}", thay đổi vừa rồi chưa được lưu.`
              );
              continue;
            }

            throw new Error(body?.error || `HTTP ${res.status}`);
          } catch (err) {
            allOk = false;
            const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
            setErrorMessage(msg);
            console.error('[plan-sync] save failed', plan.id, err);
          }
        }

        if (!allOk) break;
      } while (rerunRef.current);

      if (allOk) {
        setErrorMessage(null);
        setLastSavedAt(new Date());
        setStatus(getDirtyPlans().length ? 'dirty' : 'saved');
      } else {
        setStatus('error');
      }
      return allOk;
    };

    inFlightRef.current = run().finally(() => {
      inFlightRef.current = null;
    });
    return inFlightRef.current;
  }, [getDirtyPlans, rememberStored]);

  // 3. Tự lưu sau khi ngừng sửa
  useEffect(() => {
    if (!readyRef.current) return;
    if (!getDirtyPlans().length) return;
    queueMicrotask(() => {
      setStatus(prev => (prev === 'saving' ? prev : 'dirty'));
    });
    const timer = setTimeout(() => {
      void flush();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [effectivePlans, debounceMs, flush, getDirtyPlans]);

  // 4. Cảnh báo khi rời trang lúc chưa lưu xong
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!readyRef.current) return;
      if (inFlightRef.current || getDirtyPlans().length) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [getDirtyPlans]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    /** Lưu ngay các thay đổi. Trả về true nếu lưu thành công (hoặc không có gì để lưu). */
    saveNow: flush,
    /** Tải lại danh sách từ database (sau khi tải Plan order tổng lên). */
    reload: () => setReloadKey(k => k + 1),
    isPersistent: status !== 'offline' && status !== 'loading'
  };
}
