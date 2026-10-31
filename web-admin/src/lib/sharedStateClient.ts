/**
 * Shared State Client
 * Module client đồng bộ dữ liệu hai chiều giữa localStorage và PostgreSQL thông qua /api/shared-state (AppSharedRecord).
 */
import {
  isSyntheticMultiPlatformSeedItem,
  isSyntheticMultiPlatformSeedReup,
} from './multiPlatformListing';
import {
  isSyntheticApprovedBookingItem,
  recalculateApprovedBookingItem,
  type ApprovedBookingListItem,
} from './approvedBookingList';
import { isSyntheticBrandMonthlyPlanItem } from './monthlyPlanData';

function sanitizeClientSharedState(dbKey: SharedStateDbKey, data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  if (dbKey === 'multi-platform-listings-v1') {
    return data.filter((item) => !isSyntheticMultiPlatformSeedItem(item));
  }
  if (dbKey === 'multi-platform-reups-v1') {
    return data.filter((item) => !isSyntheticMultiPlatformSeedReup(item));
  }
  if (dbKey === 'approved-booking-list-v2') {
    return data
      .filter((item) => !isSyntheticApprovedBookingItem(item))
      .map((item) => recalculateApprovedBookingItem(item as ApprovedBookingListItem));
  }
  if (dbKey === 'brand-monthly-plans-v1') {
    return data.filter((item) => !isSyntheticBrandMonthlyPlanItem(item));
  }
  return data;
}

export type SharedStateDbKey =
  | 'brand-monthly-plans-v1'
  | 'store-air-plans-v1'
  | 'approved-booking-list-v2'
  | 'staff-brand-listing-sheets-v1'
  | 'multi-platform-listings-v1'
  | 'multi-platform-reups-v1'
  | 'video-acceptance-screenshots-v1'
  | 'store-overrides-v1'
  | 'sla-tasks-v1'
  | 'task-difficulty-configs-v1'
  | 'sow-point-policies-v1'
  | 'staff-workload-exceptions-v1'
  | 'third-party-accounts-v1'
  | 'api-workspace-config-v2'
  | 'api-usage-logs-v1'
  | 'custom-knowledge-articles-v1'
  | 'ads-reports-metadata-v1'
  | 'cloudflare-r2-config-v1';

export interface SharedStateMapping {
  localStorageKey: string;
  legacyLocalStorageKeys?: string[];
  eventName: string;
  aliasEvents?: string[];
}

export const SHARED_STATE_REGISTRY: Record<SharedStateDbKey, SharedStateMapping> = {
  'brand-monthly-plans-v1': {
    localStorageKey: 'b2c_brand_monthly_plans_v1',
    eventName: 'upbase:brand-monthly-plans-updated',
  },
  'store-air-plans-v1': {
    localStorageKey: 'upbase_b2c_store_air_plans_v1',
    eventName: 'upbase_store_air_plans_updated',
    aliasEvents: ['upbase-store-air-plan-updated'],
  },
  'approved-booking-list-v2': {
    localStorageKey: 'upbase_b2c_approved_booking_list_v3',
    legacyLocalStorageKeys: ['upbase_b2c_approved_booking_list_v2'],
    eventName: 'upbase:approved-booking-list-updated',
    aliasEvents: ['upbase-approved-booking-list-updated'],
  },
  'staff-brand-listing-sheets-v1': {
    localStorageKey: 'upbase_b2c_staff_brand_listing_sheets_v2',
    legacyLocalStorageKeys: ['upbase_b2c_staff_brand_listing_sheets_v1'],
    eventName: 'upbase:staff-brand-listing-sheet-updated',
    aliasEvents: ['upbase-staff-brand-sheet-updated'],
  },
  'multi-platform-listings-v1': {
    localStorageKey: 'upbase_b2c_multi_platform_listing_v2',
    legacyLocalStorageKeys: ['upbase_b2c_multi_platform_listings_v1'],
    eventName: 'upbase:multi-platform-listings-updated',
  },
  'multi-platform-reups-v1': {
    localStorageKey: 'upbase_b2c_multi_platform_reup_v2',
    legacyLocalStorageKeys: ['upbase_b2c_multi_platform_reups_v1'],
    eventName: 'upbase:multi-platform-reups-updated',
  },
  'video-acceptance-screenshots-v1': {
    localStorageKey: 'upbase_b2c_video_acceptance_screenshots_v1',
    eventName: 'upbase:acceptance-screenshots-updated',
  },
  'store-overrides-v1': {
    localStorageKey: 'upbase_store_overrides_v1',
    eventName: 'upbase:store-overrides-updated',
  },
  'sla-tasks-v1': {
    localStorageKey: 'upbase_b2c_sla_tasks_v1',
    eventName: 'upbase:sla-tasks-updated',
  },
  'task-difficulty-configs-v1': {
    localStorageKey: 'upbase_b2c_task_difficulty_configs_v1',
    eventName: 'upbase-task-difficulty-updated',
  },
  'sow-point-policies-v1': {
    localStorageKey: 'upbase_b2c_sow_point_policies_v1',
    legacyLocalStorageKeys: ['upbase_b2c_sow_point_policy_v1'],
    eventName: 'upbase-sow-policies-updated',
  },
  'staff-workload-exceptions-v1': {
    localStorageKey: 'upbase_b2c_staff_workload_exceptions_v1',
    eventName: 'upbase-workload-exceptions-updated',
  },
  'third-party-accounts-v1': {
    localStorageKey: 'upbase_b2c_third_party_accounts_v1',
    eventName: 'upbase:third-party-accounts-updated',
  },
  'api-workspace-config-v2': {
    localStorageKey: 'upbase_b2c_api_workspace_config_v2',
    eventName: 'upbase-api-config-updated',
  },
  'api-usage-logs-v1': {
    localStorageKey: 'upbase_b2c_api_usage_logs_v1',
    eventName: 'upbase-api-usage-logged',
  },
  'custom-knowledge-articles-v1': {
    localStorageKey: 'upbase_b2c_custom_knowledge_articles_v1',
    eventName: 'upbase:custom-knowledge-articles-updated',
  },
  'ads-reports-metadata-v1': {
    localStorageKey: 'upbase_b2c_ads_reports_metadata_v1',
    eventName: 'upbase:ads-reports-metadata-updated',
  },
  'cloudflare-r2-config-v1': {
    localStorageKey: 'upbase_b2c_cloudflare_r2_config_v1',
    eventName: 'upbase:cloudflare-r2-config-updated',
  },
};

const REVISIONS_STORAGE_KEY = 'upbase_b2c_shared_state_revisions_v1';
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const inMemorySharedStateCache = new Map<SharedStateDbKey, unknown>();
const knownEntityIdsByKey = new Map<SharedStateDbKey, Set<string>>();
const pendingDeletedIdsByKey = new Map<SharedStateDbKey, Set<string>>();
const knownRevisionsByKey = new Map<SharedStateDbKey, number>();
const lastSyncedSerializedByKey = new Map<SharedStateDbKey, string>();

let inflightHydratePromise: Promise<Record<string, { revision: number; data: unknown }> | null> | null = null;
let lastHydratedAtMs = 0;
const HYDRATE_COOLDOWN_MS = 15_000;

function loadStoredRevisionsMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(REVISIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'number' && v > 0) {
          knownRevisionsByKey.set(k as SharedStateDbKey, v);
        }
      }
      return parsed as Record<string, number>;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveStoredRevision(dbKey: SharedStateDbKey, revision: number): void {
  if (typeof window === 'undefined' || !Number.isInteger(revision) || revision <= 0) return;
  knownRevisionsByKey.set(dbKey, revision);
  try {
    const cur = loadStoredRevisionsMap();
    cur[dbKey] = revision;
    window.localStorage.setItem(REVISIONS_STORAGE_KEY, JSON.stringify(cur));
  } catch {
    // ignore quota errors
  }
}

const IDB_NAME = 'upbase_b2c_shared_state_idb';
const IDB_STORE = 'states';
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openSharedStateIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

function writeToIdbAsync(dbKey: SharedStateDbKey, data: unknown): void {
  openSharedStateIdb()
    .then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, dbKey);
      } catch {
        // ignore IndexedDB write errors
      }
    })
    .catch(() => undefined);
}

export async function readFromIdbAsync<T = unknown>(dbKey: SharedStateDbKey): Promise<T | null> {
  const mem = inMemorySharedStateCache.get(dbKey);
  if (mem !== undefined) return mem as T;
  const db = await openSharedStateIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(dbKey);
      req.onsuccess = () => {
        if (req.result !== undefined) {
          inMemorySharedStateCache.set(dbKey, req.result);
          resolve(req.result as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function getInMemorySharedState<T = unknown>(dbKey: SharedStateDbKey): T | null {
  const val = inMemorySharedStateCache.get(dbKey);
  return val !== undefined ? (val as T) : null;
}

function extractClientEntityIds(dbKey: SharedStateDbKey, data: unknown): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(data)) return ids;
  for (const rawItem of data) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Record<string, unknown>;
    if (typeof item.id === 'string' && item.id.trim()) {
      ids.add(item.id.trim());
    } else if (dbKey === 'approved-booking-list-v2') {
      if (typeof item.sourceSheetRowId === 'string' && item.sourceSheetRowId.trim()) {
        ids.add(`row:${item.sourceSheetRowId.trim()}`);
      } else if (typeof item.maBooking === 'string' && item.maBooking.trim()) {
        ids.add(`bo:${item.maBooking.trim()}`);
      }
    } else if (dbKey === 'brand-monthly-plans-v1') {
      const brand = typeof item.brandName === 'string' ? item.brandName.trim() : '';
      const month =
        typeof item.monthKey === 'string'
          ? item.monthKey.trim()
          : typeof item.month === 'string'
            ? item.month.trim()
            : '';
      if (brand && month) ids.add(`bmp:${brand}::${month}`);
    } else if (dbKey === 'store-air-plans-v1') {
      const store =
        typeof item.storeId === 'string'
          ? item.storeId.trim()
          : typeof item.storeName === 'string'
            ? item.storeName.trim()
            : '';
      const month =
        typeof item.monthKey === 'string'
          ? item.monthKey.trim()
          : typeof item.month === 'string'
            ? item.month.trim()
            : '';
      if (store && month) ids.add(`sap:${store}::${month}`);
    }
  }
  return ids;
}

function recordEntitySnapshotAndDiffDeletes(dbKey: SharedStateDbKey, data: unknown): void {
  if (!Array.isArray(data)) return;
  if (!knownEntityIdsByKey.has(dbKey) && typeof window !== 'undefined') {
    const cfg = SHARED_STATE_REGISTRY[dbKey];
    if (cfg) {
      try {
        const raw = window.localStorage.getItem(cfg.localStorageKey);
        if (raw) {
          knownEntityIdsByKey.set(dbKey, extractClientEntityIds(dbKey, JSON.parse(raw)));
        }
      } catch {
        // ignore
      }
    }
  }
  const nextIds = extractClientEntityIds(dbKey, data);
  const prevIds = knownEntityIdsByKey.get(dbKey);
  if (prevIds && prevIds.size > 0) {
    let deletedSet = pendingDeletedIdsByKey.get(dbKey);
    if (!deletedSet) {
      deletedSet = new Set<string>();
      pendingDeletedIdsByKey.set(dbKey, deletedSet);
    }
    for (const oldId of prevIds) {
      if (!nextIds.has(oldId)) {
        deletedSet.add(oldId);
      }
    }
    for (const currentId of nextIds) {
      deletedSet.delete(currentId);
    }
  }
  knownEntityIdsByKey.set(dbKey, nextIds);
}

/**
 * Lưu vào localStorage kèm tự động thu hồi các khóa bản cũ trùng lặp khi chạm ngưỡng 5MB Quota.
 */
function safeWriteLocalStorage(cfg: SharedStateMapping, dataToStore: unknown): void {
  if (typeof window === 'undefined') return;
  for (const legacyKey of cfg.legacyLocalStorageKeys || []) {
    try {
      window.localStorage.removeItem(legacyKey);
    } catch {
      // ignore
    }
  }
  const serialized = JSON.stringify(dataToStore);
  try {
    window.localStorage.setItem(cfg.localStorageKey, serialized);
  } catch {
    // Thu hồi các khóa phụ / bản sao cũ chiếm dụng dung lượng và thử lại 1 lần
    const evictableKeys = [
      'upbase_b2c_approved_booking_list_v2',
      'upbase_b2c_multi_platform_listings_v1',
      'upbase_b2c_multi_platform_reups_v1',
      'upbase_b2c_staff_brand_listing_sheets_v1',
      'upbase_b2c_video_acceptance_screenshots_v1',
      'upbase_b2c_api_usage_logs_v1',
    ];
    for (const k of evictableKeys) {
      if (k !== cfg.localStorageKey) {
        try {
          window.localStorage.removeItem(k);
        } catch {
          // ignore
        }
      }
    }
    try {
      window.localStorage.setItem(cfg.localStorageKey, serialized);
    } catch {
      // Nếu vẫn vượt trần 5MB, dữ liệu đã an toàn trong inMemorySharedStateCache + IndexedDB
    }
  }
}

/**
 * Đẩy dữ liệu Shared State lên máy chủ (PostgreSQL AppSharedRecord) có debounce, chặn gửi trùng lặp và theo dõi ID xóa
 */
export function pushSharedStateToDb(
  dbKey: SharedStateDbKey,
  data: unknown,
  debounceMs = 250
): void {
  if (typeof window === 'undefined') return;

  inMemorySharedStateCache.set(dbKey, data);
  writeToIdbAsync(dbKey, data);
  recordEntitySnapshotAndDiffDeletes(dbKey, data);

  const existing = debounceTimers.get(dbKey);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(dbKey);
    const pendingDeletes = Array.from(pendingDeletedIdsByKey.get(dbKey) || []);
    let serializedData = '';
    try {
      serializedData = JSON.stringify(data);
    } catch {
      return;
    }
    // Chặn gửi PUT lên máy chủ nếu nội dung không thay đổi so với lần đồng bộ gần nhất
    if (pendingDeletes.length === 0 && lastSyncedSerializedByKey.get(dbKey) === serializedData) {
      return;
    }
    lastSyncedSerializedByKey.set(dbKey, serializedData);

    fetch('/api/shared-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: dbKey,
        data,
        ...(pendingDeletes.length > 0 ? { deletedIds: pendingDeletes } : {}),
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          pendingDeletedIdsByKey.delete(dbKey);
          const json = await res.json().catch(() => null);
          const newRev = json?.records?.[dbKey]?.revision;
          if (typeof newRev === 'number' && newRev > 0) {
            saveStoredRevision(dbKey, newRev);
          }
        } else {
          lastSyncedSerializedByKey.delete(dbKey);
          console.warn(`[sharedStateClient] Đồng bộ "${dbKey}" trả về HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        lastSyncedSerializedByKey.delete(dbKey);
        console.warn(`[sharedStateClient] Lỗi mạng khi đồng bộ "${dbKey}":`, err);
      });
  }, debounceMs);

  debounceTimers.set(dbKey, timer);
}

/**
 * Tải toàn bộ Shared States từ DB có đối chiếu revision (Delta Sync) để không tải lại các bản ghi nặng nhiều MB khi chưa thay đổi.
 */
export async function hydrateAllSharedStatesFromDb(options?: {
  force?: boolean;
}): Promise<Record<string, { revision: number; data: unknown }> | null> {
  if (typeof window === 'undefined') return null;

  const now = Date.now();
  if (!options?.force && inflightHydratePromise) {
    return inflightHydratePromise;
  }
  if (!options?.force && lastHydratedAtMs > 0 && now - lastHydratedAtMs < HYDRATE_COOLDOWN_MS) {
    return null;
  }

  inflightHydratePromise = (async () => {
    try {
      const storedRevs = loadStoredRevisionsMap();
      const clientRevPairs: string[] = [];

      for (const [dbKey, cfg] of Object.entries(SHARED_STATE_REGISTRY) as [
        SharedStateDbKey,
        SharedStateMapping
      ][]) {
        const rev = knownRevisionsByKey.get(dbKey) || storedRevs[dbKey] || 0;
        if (rev <= 0) continue;
        let hasLocalData = inMemorySharedStateCache.has(dbKey);
        if (!hasLocalData) {
          try {
            hasLocalData = Boolean(window.localStorage.getItem(cfg.localStorageKey));
          } catch {
            // ignore
          }
        }
        if (!hasLocalData) {
          const idbVal = await readFromIdbAsync(dbKey);
          hasLocalData = idbVal !== null && idbVal !== undefined;
        }
        if (hasLocalData) {
          clientRevPairs.push(`${dbKey}:${rev}`);
        }
      }

      const qs = clientRevPairs.length > 0 ? `?clientRevs=${encodeURIComponent(clientRevPairs.join(','))}` : '';
      const res = await fetch(`/api/shared-state${qs}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      if (!json) return null;

      lastHydratedAtMs = Date.now();

      const records: Record<string, { revision: number; data: unknown; unchanged?: boolean }> =
        (json && typeof json === 'object' && ('records' in json ? json.records : 'data' in json ? json.data : json)) ||
        {};

      const initialBackfill: Record<string, unknown> = {};

      for (const [dbKey, cfg] of Object.entries(SHARED_STATE_REGISTRY) as [
        SharedStateDbKey,
        SharedStateMapping
      ][]) {
        const rec = records[dbKey];
        if (rec && rec.unchanged && typeof rec.revision === 'number' && rec.revision > 0) {
          saveStoredRevision(dbKey, rec.revision);
          continue;
        }

        if (
          rec &&
          typeof rec.revision === 'number' &&
          rec.revision > 0 &&
          rec.data !== null &&
          rec.data !== undefined
        ) {
          let dataToStore = sanitizeClientSharedState(dbKey, rec.data);
          if (dbKey === 'video-acceptance-screenshots-v1' && Array.isArray(dataToStore)) {
            dataToStore = dataToStore.slice(0, 40);
          }

          saveStoredRevision(dbKey, rec.revision);
          try {
            lastSyncedSerializedByKey.set(dbKey, JSON.stringify(dataToStore));
          } catch {
            // ignore
          }

          // 1. Lưu ngay vào In-Memory & IndexedDB (không bao giờ bị chặn bởi trần 5MB của localStorage)
          inMemorySharedStateCache.set(dbKey, dataToStore);
          writeToIdbAsync(dbKey, dataToStore);
          knownEntityIdsByKey.set(dbKey, extractClientEntityIds(dbKey, dataToStore));

          // 2. Lưu xuống localStorage kèm cơ chế tự giải phóng khóa cũ
          safeWriteLocalStorage(cfg, dataToStore);

          // 3. Luôn phát sự kiện cập nhật giao diện độc lập với kết quả ghi localStorage
          try {
            if (dbKey === 'staff-brand-listing-sheets-v1') {
              window.dispatchEvent(new CustomEvent('upbase:staff-sheet-db-hydrated', { detail: dataToStore }));
            }
            window.dispatchEvent(new CustomEvent(cfg.eventName, { detail: dataToStore }));
            for (const alias of cfg.aliasEvents || []) {
              window.dispatchEvent(new CustomEvent(alias, { detail: dataToStore }));
            }
          } catch {
            // ignore event errors
          }
        } else {
          // DB chưa có dữ liệu (revision === 0) -> kiểm tra local để gom backfill
          try {
            let raw = window.localStorage.getItem(cfg.localStorageKey);
            if (!raw && cfg.legacyLocalStorageKeys) {
              for (const legacyKey of cfg.legacyLocalStorageKeys) {
                raw = window.localStorage.getItem(legacyKey);
                if (raw) break;
              }
            }
            if (raw) {
              const parsed = sanitizeClientSharedState(dbKey, JSON.parse(raw));
              if (parsed !== null && parsed !== undefined) {
                inMemorySharedStateCache.set(dbKey, parsed);
                writeToIdbAsync(dbKey, parsed);
                knownEntityIdsByKey.set(dbKey, extractClientEntityIds(dbKey, parsed));
                initialBackfill[dbKey] = parsed;
              }
            }
          } catch {
            // Bỏ qua lỗi parse
          }
        }
      }

      if (Object.keys(initialBackfill).length > 0) {
        fetch('/api/shared-state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: initialBackfill }),
        })
          .then(async (r) => {
            if (!r.ok) return;
            const resJson = await r.json().catch(() => null);
            const savedMap = resJson?.records || {};
            for (const [k, v] of Object.entries(savedMap)) {
              const rev = (v as { revision?: number })?.revision;
              if (typeof rev === 'number' && rev > 0) {
                saveStoredRevision(k as SharedStateDbKey, rev);
              }
            }
          })
          .catch(() => undefined);
      }

      return records;
    } catch {
      return null;
    } finally {
      inflightHydratePromise = null;
    }
  })();

  return inflightHydratePromise;
}
