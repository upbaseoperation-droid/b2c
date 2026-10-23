import type { KocItem } from './types';

export type StagingDiscoverySource =
  | 'COMPETITOR_DISCOVERY'
  | 'HASHTAG_DISCOVERY'
  | 'SEARCH_BAR'
  | 'EXCEL_IMPORT'
  | 'TIKTOK_SCRAPER';

export type StagingExportStatus =
  | 'PENDING_EXPORT'    // Đang lưu tạm, chờ đẩy sang Upaffiliate
  | 'EXPORTED'          // Đã đẩy thành công sang Upaffiliate
  | 'DUPLICATE_REJECTED'; // Bị từ chối do trùng lặp

export interface StagingKocItem {
  id: string;
  channelId: string; // Handle chuẩn hóa (không có @, chữ thường)
  channelUrl: string;
  stageName: string;
  realName?: string;
  phone?: string;
  zalo?: string;
  email?: string;
  shippingAddress?: string;
  followersCount: number;
  avgViews: number;
  engagementRate?: number;
  discoverySource: StagingDiscoverySource;
  sourceContext: string; // Tên đối thủ hoặc Hashtag phát hiện
  sampleVideoUrl?: string;
  sampleVideoViews?: number;
  sampleVideoCaption?: string;
  discoveredByStaffId?: string;
  discoveredByStaffName?: string;
  discoveredAt: string; // ISO String
  exportStatus: StagingExportStatus;
  upaffiliateMasterId?: string;
  exportedAt?: string;
  notes?: string;
}

export type KocUpaffiliateCheckVerdict =
  | 'EXISTED_IN_UPAFFILIATE'   // Đã có trong Upaffiliate Master Data
  | 'ALREADY_IN_STAGING'        // Chưa có trên Upaffiliate, nhưng đã lưu trong bảng tạm trước đó
  | 'NOT_IN_UPAFFILIATE';       // Chưa có trên Upaffiliate (sẽ được tự động lưu tạm)

export interface KocUpaffiliateCheckResult {
  handle: string;
  cleanHandle: string;
  verdict: KocUpaffiliateCheckVerdict;
  matchedMaster?: KocItem;
  matchedStaging?: StagingKocItem;
}

/**
 * Chuẩn hóa handle kênh TikTok: bỏ @, khoảng trắng, chữ thường.
 */
export function normalizeKocHandle(rawHandle: string): string {
  if (!rawHandle) return '';
  return rawHandle.trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Kiểm tra đối soát trạng thái KOC với Upaffiliate Master Data & Bảng Tạm.
 */
export function checkKocUpaffiliateStatus(
  rawHandle: string,
  masterMap: Map<string, KocItem>,
  stagingMap: Map<string, StagingKocItem>
): KocUpaffiliateCheckResult {
  const clean = normalizeKocHandle(rawHandle);
  if (!clean) {
    return {
      handle: rawHandle,
      cleanHandle: '',
      verdict: 'NOT_IN_UPAFFILIATE',
    };
  }

  // 1. Kiểm tra trong Master Data (Upaffiliate Source of Truth)
  const matchedMaster = masterMap.get(clean);
  if (matchedMaster) {
    return {
      handle: rawHandle,
      cleanHandle: clean,
      verdict: 'EXISTED_IN_UPAFFILIATE',
      matchedMaster,
    };
  }

  // 2. Kiểm tra trong Bảng Tạm (Staging)
  const matchedStaging = stagingMap.get(clean);
  if (matchedStaging) {
    return {
      handle: rawHandle,
      cleanHandle: clean,
      verdict: 'ALREADY_IN_STAGING',
      matchedStaging,
    };
  }

  // 3. Chưa có ở cả 2 nơi -> Sẵn sàng lưu tạm
  return {
    handle: rawHandle,
    cleanHandle: clean,
    verdict: 'NOT_IN_UPAFFILIATE',
  };
}

const LOCAL_STORAGE_STAGING_KEY = 'upbase_b2c_pending_kocs_staging_v1';

/**
 * Đọc danh sách KOC trong bảng tạm từ Server API (có fallback localStorage).
 */
export async function fetchStagingKocs(): Promise<StagingKocItem[]> {
  try {
    const res = await fetch('/api/integrations/upaffiliate/staging', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-store' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        try {
          window.localStorage.setItem(
            LOCAL_STORAGE_STAGING_KEY,
            JSON.stringify(json.items)
          );
        } catch {
          // ignore storage quota
        }
        return json.items;
      }
    }
  } catch {
    // offline fallback
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem(LOCAL_STORAGE_STAGING_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
  }

  return [];
}

/**
 * Gửi lưu theo lô các KOC mới vào Bảng Tạm.
 */
export async function saveStagingKocsBatch(
  newItems: Omit<StagingKocItem, 'id' | 'discoveredAt' | 'exportStatus'>[]
): Promise<{ success: boolean; savedCount: number; items: StagingKocItem[] }> {
  if (newItems.length === 0) {
    return { success: true, savedCount: 0, items: [] };
  }

  try {
    const res = await fetch('/api/integrations/upaffiliate/staging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newItems }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        try {
          window.localStorage.setItem(
            LOCAL_STORAGE_STAGING_KEY,
            JSON.stringify(json.items)
          );
        } catch {
          // ignore
        }
        return {
          success: true,
          savedCount: json.savedCount || 0,
          items: json.items,
        };
      }
    }
  } catch {
    // fallback client-side storage
  }

  // Fallback client-side nếu API tạm thời chưa phản hồi
  let existing: StagingKocItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const cached = window.localStorage.getItem(LOCAL_STORAGE_STAGING_KEY);
      if (cached) existing = JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  const existingMap = new Map(existing.map((item) => [item.channelId, item]));
  let savedCount = 0;
  const now = new Date().toISOString();

  for (const it of newItems) {
    const clean = normalizeKocHandle(it.channelId);
    if (!clean) continue;
    if (!existingMap.has(clean)) {
      const fullItem: StagingKocItem = {
        ...it,
        id: `stg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        channelId: clean,
        discoveredAt: now,
        exportStatus: 'PENDING_EXPORT',
      };
      existingMap.set(clean, fullItem);
      savedCount++;
    }
  }

  const merged = Array.from(existingMap.values());
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_STAGING_KEY,
        JSON.stringify(merged)
      );
    } catch {
      // ignore
    }
  }

  return { success: true, savedCount, items: merged };
}
