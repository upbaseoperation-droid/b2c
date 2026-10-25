/**
 * Shared State Client
 * Module client đồng bộ dữ liệu hai chiều giữa localStorage và PostgreSQL thông qua /api/shared-state (AppSharedRecord).
 */

export type SharedStateDbKey =
  | 'brand-monthly-plans-v1'
  | 'store-air-plans-v1'
  | 'approved-booking-list-v2'
  | 'staff-brand-listing-sheets-v1'
  | 'video-acceptance-screenshots-v1'
  | 'store-overrides-v1'
  | 'sla-tasks-v1'
  | 'task-difficulty-configs-v1'
  | 'sow-point-policies-v1'
  | 'staff-workload-exceptions-v1'
  | 'third-party-accounts-v1'
  | 'api-workspace-config-v2'
  | 'api-usage-logs-v1'
  | 'custom-knowledge-articles-v1';

export interface SharedStateMapping {
  localStorageKey: string;
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
    localStorageKey: 'upbase_b2c_approved_booking_list_v2',
    eventName: 'upbase:approved-booking-list-updated',
    aliasEvents: ['upbase-approved-booking-list-updated'],
  },
  'staff-brand-listing-sheets-v1': {
    localStorageKey: 'upbase_b2c_staff_brand_listing_sheets_v1',
    eventName: 'upbase:staff-brand-listing-sheet-updated',
    aliasEvents: ['upbase-staff-brand-sheet-updated'],
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
};

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Đẩy dữ liệu Shared State lên máy chủ (PostgreSQL AppSharedRecord) có debounce
 */
export function pushSharedStateToDb(
  dbKey: SharedStateDbKey,
  data: unknown,
  debounceMs = 250
): void {
  if (typeof window === 'undefined') return;

  const existing = debounceTimers.get(dbKey);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(dbKey);
    fetch('/api/shared-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: dbKey, data }),
    }).catch(() => undefined);
  }, debounceMs);

  debounceTimers.set(dbKey, timer);
}

/**
 * Tải toàn bộ Shared States từ DB, đồng bộ vào localStorage và bắn sự kiện cập nhật giao diện.
 * Nếu DB chưa có (revision === 0) nhưng localStorage có dữ liệu, tự động đẩy lên DB.
 */
export async function hydrateAllSharedStatesFromDb(): Promise<
  Record<string, { revision: number; data: unknown }> | null
> {
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/shared-state', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    if (!json) return null;

    const records: Record<string, { revision: number; data: unknown }> =
      (json && typeof json === 'object' && ('records' in json ? json.records : 'data' in json ? json.data : json)) ||
      {};

    const initialBackfill: Record<string, unknown> = {};

    for (const [dbKey, cfg] of Object.entries(SHARED_STATE_REGISTRY) as [
      SharedStateDbKey,
      SharedStateMapping
    ][]) {
      const rec = records[dbKey];
      if (
        rec &&
        typeof rec.revision === 'number' &&
        rec.revision > 0 &&
        rec.data !== null &&
        rec.data !== undefined
      ) {
        try {
          let dataToStore = rec.data;
          if (dbKey === 'video-acceptance-screenshots-v1' && Array.isArray(dataToStore)) {
            dataToStore = dataToStore.slice(0, 40);
          }
          window.localStorage.setItem(cfg.localStorageKey, JSON.stringify(dataToStore));
          if (dbKey === 'sow-point-policies-v1') {
            window.localStorage.setItem('upbase_b2c_sow_point_policy_v1', JSON.stringify(dataToStore));
          }
          window.dispatchEvent(new CustomEvent(cfg.eventName, { detail: rec.data }));
          for (const alias of cfg.aliasEvents || []) {
            window.dispatchEvent(new CustomEvent(alias, { detail: rec.data }));
          }
        } catch {
          // Bỏ qua lỗi quota trình duyệt
        }
      } else {
        // DB chưa có dữ liệu (revision === 0) -> kiểm tra local để gom backfill
        try {
          let raw = window.localStorage.getItem(cfg.localStorageKey);
          if (!raw && dbKey === 'sow-point-policies-v1') {
            raw = window.localStorage.getItem('upbase_b2c_sow_point_policy_v1');
          }
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed !== null && parsed !== undefined) {
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
      }).catch(() => undefined);
    }

    return records;
  } catch {
    return null;
  }
}
