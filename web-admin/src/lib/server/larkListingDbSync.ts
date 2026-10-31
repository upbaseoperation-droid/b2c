/**
 * Đồng bộ trực tiếp dữ liệu Bảng 3.1 Listing KOC (2.561 bản ghi / 59 kế hoạch gian hàng),
 * Sheet Listing Brand (staff-brand-listing-sheets-v1) và Quản lý Deal & Booking (approved-booking-list-v2)
 * vào bảng AppSharedRecord trong PostgreSQL (hoặc kho .shared-data khi chạy độc lập).
 */
import { readRecord, readRecordsBatch, upsertRecord } from './sharedRecords';
import { listingBoardKey } from './boardKeys';
import {
  REAL_LARK_LISTINGS_BY_BOARD_KEY,
  REAL_LARK_LISTINGS_SYNC_VERSION,
  getRealLarkListingsForBoardKey,
} from '../realLarkListings2026';
import { REAL_MONTHLY_PLANS_OCT_2026 } from '../realLarkPlans202610';
import { REAL_MONTHLY_PLANS_NOV_2026 } from '../realLarkPlans202611';
import { INITIAL_KOCS, INITIAL_STORE_PORTFOLIOS, INITIAL_DEALS } from '../mockData';
import {
  loadStaffSheetCollection,
  type StaffBrandSheetCollection,
  type StaffListingSheetRow,
} from '../staffBrandListingSheet';
import {
  loadApprovedBookingList,
  isSyntheticApprovedBookingItem,
  recalculateApprovedBookingItem,
  type ApprovedBookingListItem,
} from '../approvedBookingList';
import type { KocListingItem } from '../types';

const SYNC_META_KEY = 'lark-31-listing-sync-meta';

interface ListingSyncMeta {
  version: string;
  syncedAt: string;
  totalBoards: number;
  totalListingItems: number;
  totalStaffSheets: number;
  totalApprovedBookings: number;
}

let hasVerifiedInMemory = false;
let inflightSyncPromise: Promise<ListingSyncMeta | null> | null = null;

const canonicalListingId = (id?: string) =>
  (id || '').trim().replace(/^(LI-|LST-|SSR-)/i, '');

function mergeBoardItems(
  existingItems: KocListingItem[] | undefined,
  larkItems: KocListingItem[]
): KocListingItem[] {
  if (!Array.isArray(existingItems) || existingItems.length === 0) {
    return larkItems;
  }
  const larkByCanonical = new Map<string, KocListingItem>();
  for (const larkItem of larkItems) {
    if (!larkItem || !larkItem.id) continue;
    larkByCanonical.set(canonicalListingId(larkItem.id), larkItem);
  }

  const byCanonical = new Map<string, KocListingItem>();
  // Ưu tiên nạp chuẩn bản ghi Lark Base 3.1 trước
  for (const [cId, larkItem] of larkByCanonical.entries()) {
    byCanonical.set(cId, larkItem);
  }
  // Giữ lại các bản ghi do người dùng thêm thủ công trên web app (không trùng record_id Lark)
  for (const item of existingItems) {
    if (!item || !item.id || item.id.startsWith('LISTING-KUTI-') || item.id.startsWith('LISTING-BBB-')) continue;
    const cId = canonicalListingId(item.id);
    if (!byCanonical.has(cId)) {
      byCanonical.set(cId, item);
    }
  }
  return Array.from(byCanonical.values());
}

function mergeStaffSheetCollections(
  existing: StaffBrandSheetCollection | null | undefined,
  seeded: StaffBrandSheetCollection
): StaffBrandSheetCollection {
  if (!existing || typeof existing !== 'object' || !existing.sheets) {
    return seeded;
  }
  const mergedSheets: Record<string, StaffListingSheetRow[]> = { ...existing.sheets };
  for (const [sheetKey, seededRows] of Object.entries(seeded.sheets || {})) {
    const curRows = mergedSheets[sheetKey] || [];
    if (curRows.length === 0) {
      mergedSheets[sheetKey] = seededRows;
      continue;
    }
    const hasRealRow = curRows.some((r) => r && typeof r.id === 'string' && r.id.startsWith('SSR-'));
    if (!hasRealRow && curRows.length <= 5) {
      mergedSheets[sheetKey] = seededRows;
      continue;
    }
    const seededById = new Map(seededRows.map((r) => [r.id, r]));
    const existingIds = new Set<string>();
    const combined: StaffListingSheetRow[] = curRows.map((r) => {
      existingIds.add(r.id);
      const rich = seededById.get(r.id);
      if (!rich) return r;
      if (
        (r.follower === 0 && rich.follower > 0) ||
        (r.doanhSo === 0 && rich.doanhSo > 0) ||
        (r.viewTrungBinh === 0 && rich.viewTrungBinh > 0) ||
        (!r.sanPham && rich.sanPham) ||
        ((!r.thanhQuaHopTac || r.thanhQuaHopTac.includes('0M₫') || r.thanhQuaHopTac !== rich.thanhQuaHopTac) && Boolean(rich.thanhQuaHopTac)) ||
        ((!r.gmvDaHopTac || r.gmvDaHopTac === 0) && (rich.gmvDaHopTac || 0) > 0) ||
        (r.kocId !== rich.kocId && Boolean(rich.kocId))
      ) {
        return {
          ...rich,
          dot: r.dot || rich.dot,
          giaNetVideo: r.giaNetVideo ?? rich.giaNetVideo,
          brandChon: r.brandChon || rich.brandChon,
          lyDoTuChoi: r.lyDoTuChoi || rich.lyDoTuChoi,
          contentNote: r.contentNote || rich.contentNote,
          leaderNote: r.leaderNote || rich.leaderNote,
          trangThai: r.trangThai || rich.trangThai,
          deXuatUpBase: r.deXuatUpBase || rich.deXuatUpBase,
          ngayAirPlan: r.ngayAirPlan || rich.ngayAirPlan,
          maBooking: r.maBooking || rich.maBooking,
        };
      }
      return r;
    });
    for (const sr of seededRows) {
      if (!existingIds.has(sr.id)) {
        combined.push(sr);
      }
    }
    mergedSheets[sheetKey] = combined;
  }

  return {
    sheets: mergedSheets,
    googleSheetUrls: {
      ...(seeded.googleSheetUrls || {}),
      ...(existing.googleSheetUrls || {}),
    },
    ...(existing.fieldEditPolicy
      ? { fieldEditPolicy: existing.fieldEditPolicy }
      : seeded.fieldEditPolicy
        ? { fieldEditPolicy: seeded.fieldEditPolicy }
        : {}),
  };
}

function mergeApprovedBookings(
  existing: ApprovedBookingListItem[] | null | undefined,
  seeded: ApprovedBookingListItem[]
): ApprovedBookingListItem[] {
  const cleanExisting = Array.isArray(existing) ? existing.filter((i) => !isSyntheticApprovedBookingItem(i)) : [];
  if (cleanExisting.length === 0) {
    return seeded;
  }
  existing = cleanExisting;
  const hasRealRows = existing.some(
    (i) => i && typeof i.sourceSheetRowId === 'string' && i.sourceSheetRowId.startsWith('SSR-')
  );
  if (!hasRealRows) {
    return seeded;
  }
  const seededByKey = new Map<string, ApprovedBookingListItem>();
  for (const s of seeded) {
    const k = s.sourceSheetRowId || s.id;
    if (k) seededByKey.set(k, s);
  }
  const existingKeys = new Set<string>();
  const combined = existing.map((item) => {
    const key = item.sourceSheetRowId || item.id;
    if (key) existingKeys.add(key);
    const rich = key ? seededByKey.get(key) : undefined;
    if (!rich) return item;
    return {
      ...item,
      kocId: rich.kocId || item.kocId,
      hinhThucHopTac:
        item.chiPhiBookingNetCuoi === 0
          ? 'FOC'
          : rich.hinhThucHopTac === 'Rebook'
            ? 'Rebook'
            : item.hinhThucHopTac,
      follower: item.follower || rich.follower,
      tenKenh: item.tenKenh || rich.tenKenh,
    };
  });
  for (const item of seeded) {
    const key = item.sourceSheetRowId || item.id;
    if (key && !existingKeys.has(key)) {
      existingKeys.add(key);
      combined.push(item);
    }
  }
  return combined.map((item) => recalculateApprovedBookingItem(item));
}

export async function ensureLarkListingsSyncedToDb(options?: {
  force?: boolean;
  extraPlanIds?: Array<{ id: string; month?: string; storeName?: string; storeId?: string }>;
}): Promise<ListingSyncMeta | null> {
  if (!options?.force && hasVerifiedInMemory) {
    return null;
  }
  if (inflightSyncPromise && !options?.force) {
    return inflightSyncPromise;
  }

  inflightSyncPromise = (async () => {
    try {
      if (!options?.force) {
        const metaRec = await readRecord<ListingSyncMeta | null>(SYNC_META_KEY, null);
        if (metaRec.revision > 0 && metaRec.data?.version === REAL_LARK_LISTINGS_SYNC_VERSION) {
          hasVerifiedInMemory = true;
          return metaRec.data;
        }
      }

      // 1. Tập hợp toàn bộ boardKey cần nạp vào AppSharedRecord
      const targetBoards = new Map<string, KocListingItem[]>();
      for (const [bKey, items] of Object.entries(REAL_LARK_LISTINGS_BY_BOARD_KEY)) {
        if (Array.isArray(items) && items.length > 0) {
          targetBoards.set(bKey, items);
        }
      }

      const allPlans = [
        ...REAL_MONTHLY_PLANS_OCT_2026,
        ...REAL_MONTHLY_PLANS_NOV_2026,
        ...(options?.extraPlanIds || []),
      ];
      for (const p of allPlans) {
        if (!p?.id) continue;
        const bKey = listingBoardKey(p.id);
        if (targetBoards.has(bKey)) continue;
        const matchedItems = getRealLarkListingsForBoardKey(bKey, {
          month: p.month,
          storeName: p.storeName,
          storeId: p.storeId,
        });
        if (matchedItems.length > 0) {
          targetBoards.set(bKey, matchedItems);
        }
      }

      const boardKeys = Array.from(targetBoards.keys());
      const existingBoardRecords = await readRecordsBatch<{ items: KocListingItem[] }>(
        boardKeys,
        { items: [] }
      );

      let totalListingItems = 0;
      const CHUNK_SIZE = 15;
      for (let i = 0; i < boardKeys.length; i += CHUNK_SIZE) {
        const chunk = boardKeys.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (bKey) => {
            const larkItems = targetBoards.get(bKey) || [];
            totalListingItems += larkItems.length;
            const cur = existingBoardRecords.get(bKey);
            const curItems = cur?.data?.items || [];
            const hasLegacyLstPrefix = curItems.some(
              (it) => it && typeof it.id === 'string' && it.id.startsWith('LST-')
            );
            if (
              !options?.force &&
              cur &&
              cur.revision > 0 &&
              curItems.length === larkItems.length &&
              !hasLegacyLstPrefix
            ) {
              return;
            }
            await upsertRecord<{ items: KocListingItem[] }>(
              bKey,
              { items: [] },
              (prev) => ({
                items: mergeBoardItems(prev?.items, larkItems),
              })
            );
          })
        );
      }

      // 2. Đồng bộ staff-brand-listing-sheets-v1 (59 Sheet, 2.561 dòng đã làm giàu KOC Master) vào AppSharedRecord
      const seededStaffSheets = loadStaffSheetCollection(
        INITIAL_KOCS,
        INITIAL_STORE_PORTFOLIOS,
        INITIAL_DEALS
      );
      await upsertRecord<StaffBrandSheetCollection>(
        'staff-brand-listing-sheets-v1',
        { sheets: {}, googleSheetUrls: {} },
        (prev) => mergeStaffSheetCollections(prev, seededStaffSheets)
      );

      // 3. Đồng bộ approved-booking-list-v2 (917 KOC đã được Brand duyệt Yes) vào AppSharedRecord
      const seededApprovedBookings = loadApprovedBookingList(
        INITIAL_KOCS,
        INITIAL_STORE_PORTFOLIOS,
        INITIAL_DEALS
      );
      await upsertRecord<ApprovedBookingListItem[]>(
        'approved-booking-list-v2',
        [],
        (prev) => mergeApprovedBookings(prev, seededApprovedBookings)
      );

      // 4. Lưu dấu mốc hoàn tất đồng bộ vào AppSharedRecord
      const meta: ListingSyncMeta = {
        version: REAL_LARK_LISTINGS_SYNC_VERSION,
        syncedAt: new Date().toISOString(),
        totalBoards: targetBoards.size,
        totalListingItems,
        totalStaffSheets: Object.keys(seededStaffSheets.sheets || {}).length,
        totalApprovedBookings: seededApprovedBookings.length,
      };
      await upsertRecord<ListingSyncMeta | null>(SYNC_META_KEY, null, () => meta);
      hasVerifiedInMemory = true;
      return meta;
    } catch (err) {
      console.warn('[larkListingDbSync] Không thể đồng bộ Listing KOC vào DB:', err);
      return null;
    } finally {
      inflightSyncPromise = null;
    }
  })();

  return inflightSyncPromise;
}
