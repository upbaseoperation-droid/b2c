import type { StorePortfolioItem } from './types';
import { resolveBrandBookingSheetUrl } from './bookingList';
import { pushSharedStateToDb } from './sharedStateClient';

/** Các trường Link Google Sheet của một gian (Link file + 3 tab chuẩn). */
export interface StoreSheetLink {
  bookingSheetUrl: string;
  planSheetTab: string;
  defaultSheetTab: string;
  reportSheetTab: string;
}

export const STORE_SHEET_OVERRIDES_KEY = 'upbase_store_overrides_v1';
export const STORE_SHEET_OVERRIDES_EVENT = 'upbase:store-overrides-updated';

export function readStoreOverrides(): Record<string, Partial<StorePortfolioItem>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORE_SHEET_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<StorePortfolioItem>>) : {};
  } catch {
    return {};
  }
}

/** Link Sheet đang hiệu lực của gian: bản ghi đè trên máy trước, rồi dữ liệu gốc, rồi link mặc định theo nhãn. */
export function resolveStoreSheetLink(
  st: StorePortfolioItem,
  overrides: Record<string, Partial<StorePortfolioItem>> = readStoreOverrides()
): StoreSheetLink {
  const ov = overrides[st.id] || {};
  return {
    bookingSheetUrl: (
      ov.bookingSheetUrl ||
      st.bookingSheetUrl ||
      resolveBrandBookingSheetUrl(st.brandName, st.storeName, st) ||
      ''
    ).trim(),
    planSheetTab: (ov.planSheetTab ?? st.planSheetTab ?? '').trim(),
    defaultSheetTab: (ov.defaultSheetTab ?? st.defaultSheetTab ?? '').trim(),
    reportSheetTab: (ov.reportSheetTab ?? st.reportSheetTab ?? '').trim(),
  };
}

/** Lưu Link Sheet cho nhiều gian: ghi đè trên máy, đồng bộ DB dùng chung và cập nhật dữ liệu gốc. */
export async function persistStoreSheetLinks(patches: Record<string, StoreSheetLink>): Promise<void> {
  const storeIds = Object.keys(patches);
  if (storeIds.length === 0) return;

  const overrides = readStoreOverrides();
  for (const id of storeIds) {
    const p = patches[id];
    overrides[id] = {
      ...(overrides[id] || {}),
      bookingSheetUrl: p.bookingSheetUrl.trim() || undefined,
      planSheetTab: p.planSheetTab.trim() || undefined,
      defaultSheetTab: p.defaultSheetTab.trim() || undefined,
      reportSheetTab: p.reportSheetTab.trim() || undefined,
    };
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORE_SHEET_OVERRIDES_KEY, JSON.stringify(overrides));
    pushSharedStateToDb('store-overrides-v1', overrides);
    window.dispatchEvent(new CustomEvent(STORE_SHEET_OVERRIDES_EVENT, { detail: overrides }));
  }

  await Promise.allSettled(
    storeIds.map(storeId => {
      const p = patches[storeId];
      return fetch('/api/master-data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          assignment: {
            bookingSheetUrl: p.bookingSheetUrl.trim(),
            planSheetTab: p.planSheetTab.trim(),
            defaultSheetTab: p.defaultSheetTab.trim(),
            reportSheetTab: p.reportSheetTab.trim(),
          },
        }),
      });
    })
  );
}
