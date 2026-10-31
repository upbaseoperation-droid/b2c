import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { USERS } from '@/lib/mockData';
import { readRecord, readRecordsBatch, readRevisionsBatch, upsertRecord, RecordError } from '@/lib/server/sharedRecords';
import { ensureLarkListingsSyncedToDb } from '@/lib/server/larkListingDbSync';
import {
  isSyntheticMultiPlatformSeedItem,
  isSyntheticMultiPlatformSeedReup,
} from '@/lib/multiPlatformListing';
import {
  isSyntheticApprovedBookingItem,
  recalculateApprovedBookingItem,
  type ApprovedBookingListItem,
} from '@/lib/approvedBookingList';
import { isSyntheticBrandMonthlyPlanItem } from '@/lib/monthlyPlanData';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

const ALLOWED_SHARED_STATE_KEYS = new Set<string>([
  'brand-monthly-plans-v1',
  'store-air-plans-v1',
  'approved-booking-list-v2',
  'staff-brand-listing-sheets-v1',
  'multi-platform-listings-v1',
  'multi-platform-reups-v1',
  'video-acceptance-screenshots-v1',
  'store-overrides-v1',
  'sla-tasks-v1',
  'task-difficulty-configs-v1',
  'sow-point-policies-v1',
  'staff-workload-exceptions-v1',
  'third-party-accounts-v1',
  'api-workspace-config-v2',
  'api-usage-logs-v1',
  'custom-knowledge-articles-v1',
  'ads-reports-metadata-v1',
  'cloudflare-r2-config-v1',
]);

async function resolveUser(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

async function syncStoreOverridesToPrisma(data: unknown): Promise<void> {
  if (!process.env.DATABASE_URL || !data || typeof data !== 'object') return;
  try {
    const list = Array.isArray(data) ? data : Object.values(data as Record<string, unknown>);
    for (const rawItem of list) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const ov = rawItem as Record<string, unknown>;
      const storeName = typeof ov.storeName === 'string' ? ov.storeName.trim() : '';
      if (!storeName) continue;

      const updateData: Record<string, unknown> = {};
      if (typeof ov.difficultyTier === 'string' && ov.difficultyTier.trim()) {
        updateData.difficultyTier = ov.difficultyTier.trim();
      }
      if (typeof ov.difficultyMultiplier === 'number' && !Number.isNaN(ov.difficultyMultiplier)) {
        updateData.difficultyMultiplier = ov.difficultyMultiplier;
      }
      if (typeof ov.b2cOwnerName === 'string' && ov.b2cOwnerName.trim()) {
        updateData.b2cOwnerName = ov.b2cOwnerName.trim();
      }
      if (typeof ov.accountOwnerName === 'string' && ov.accountOwnerName.trim()) {
        updateData.accountOwnerName = ov.accountOwnerName.trim();
      }
      if (ov.bookingLeader !== undefined) {
        updateData.bookingLeader = ov.bookingLeader ? String(ov.bookingLeader).trim() : null;
      }
      if (typeof ov.hasBookingLeader === 'boolean') {
        updateData.hasBookingLeader = ov.hasBookingLeader;
      } else if (ov.bookingLeader !== undefined) {
        updateData.hasBookingLeader = Boolean(ov.bookingLeader);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.storePortfolio.updateMany({
          where: { storeName },
          data: updateData,
        });
      }
    }
  } catch (err) {
    console.warn('[shared-state] Không thể đồng bộ storePortfolio sang DB:', err);
  }
}

const ENTITY_MERGE_ARRAY_KEYS = new Set<string>([
  'brand-monthly-plans-v1',
  'store-air-plans-v1',
  'approved-booking-list-v2',
  'multi-platform-listings-v1',
  'multi-platform-reups-v1',
  'sla-tasks-v1',
  'custom-knowledge-articles-v1',
]);

function getSharedEntityId(key: string, rawItem: unknown): string {
  if (!rawItem || typeof rawItem !== 'object') return '';
  const item = rawItem as Record<string, unknown>;
  if (typeof item.id === 'string' && item.id.trim()) {
    return item.id.trim();
  }
  if (key === 'approved-booking-list-v2') {
    if (typeof item.sourceSheetRowId === 'string' && item.sourceSheetRowId.trim()) {
      return `row:${item.sourceSheetRowId.trim()}`;
    }
    if (typeof item.maBooking === 'string' && item.maBooking.trim()) {
      return `bo:${item.maBooking.trim()}`;
    }
  }
  if (key === 'brand-monthly-plans-v1') {
    const brand = typeof item.brandName === 'string' ? item.brandName.trim() : '';
    const month =
      typeof item.monthKey === 'string'
        ? item.monthKey.trim()
        : typeof item.month === 'string'
          ? item.month.trim()
          : '';
    if (brand && month) return `bmp:${brand}::${month}`;
  }
  if (key === 'store-air-plans-v1') {
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
    if (store && month) return `sap:${store}::${month}`;
  }
  return '';
}

function getEntityTimestampMs(rawItem: unknown): number {
  if (!rawItem || typeof rawItem !== 'object') return 0;
  const item = rawItem as Record<string, unknown>;
  const ts =
    (typeof item.updatedAt === 'string' && item.updatedAt) ||
    (typeof item.brandReviewedAt === 'string' && item.brandReviewedAt) ||
    (typeof item.bookingOrderCreatedAt === 'string' && item.bookingOrderCreatedAt) ||
    (typeof item.createdAt === 'string' && item.createdAt) ||
    '';
  if (!ts) return 0;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Hợp nhất thông minh cấp độ thực thể (Entity-Level Concurrency Merge) chống lỗi Last-Write-Wins
 * khi nhiều PIC cùng thao tác đồng thời trên 69 gian hàng.
 */
function mergeSharedStateData(
  key: string,
  currentServerData: unknown,
  incomingClientData: unknown,
  deletedIds?: string[]
): unknown {
  const deletedSet = new Set((deletedIds || []).map((id) => String(id).trim()).filter(Boolean));

  if (
    key === 'store-overrides-v1' &&
    currentServerData &&
    typeof currentServerData === 'object' &&
    !Array.isArray(currentServerData) &&
    incomingClientData &&
    typeof incomingClientData === 'object' &&
    !Array.isArray(incomingClientData)
  ) {
    const mergedMap: Record<string, unknown> = {
      ...(currentServerData as Record<string, unknown>),
      ...(incomingClientData as Record<string, unknown>),
    };
    for (const delKey of deletedSet) {
      delete mergedMap[delKey];
    }
    return mergedMap;
  }

  if (!ENTITY_MERGE_ARRAY_KEYS.has(key) || !Array.isArray(incomingClientData)) {
    return incomingClientData;
  }

  if (!Array.isArray(currentServerData) || currentServerData.length === 0) {
    return deletedSet.size > 0
      ? incomingClientData.filter((it) => !deletedSet.has(getSharedEntityId(key, it)))
      : incomingClientData;
  }

  const serverById = new Map<string, unknown>();
  const serverOrderIds: string[] = [];

  for (const srvItem of currentServerData) {
    const id = getSharedEntityId(key, srvItem);
    if (!id || deletedSet.has(id)) continue;
    if (!serverById.has(id)) {
      serverOrderIds.push(id);
    }
    serverById.set(id, srvItem);
  }

  const visitedIds = new Set<string>();
  const mergedList: unknown[] = [];

  for (const incItem of incomingClientData) {
    const id = getSharedEntityId(key, incItem);
    if (!id) {
      mergedList.push(incItem);
      continue;
    }
    if (deletedSet.has(id) || visitedIds.has(id)) continue;
    visitedIds.add(id);

    const existingSrv = serverById.get(id);
    if (!existingSrv) {
      mergedList.push(incItem);
      continue;
    }

    const srvTs = getEntityTimestampMs(existingSrv);
    const incTs = getEntityTimestampMs(incItem);

    // Nếu bản ghi trên máy chủ có dấu thời gian cập nhật mới hơn hẳn bản client gửi lên,
    // giữ bản máy chủ để không làm mất chỉnh sửa vừa lưu của đồng nghiệp khác.
    if (srvTs > 0 && incTs > 0 && srvTs > incTs) {
      mergedList.push(existingSrv);
    } else {
      mergedList.push(incItem);
    }
  }

  // Bảo toàn các bản ghi do nhân sự khác vừa thêm mới trên máy chủ (chưa kịp có trên trình duyệt người gửi)
  const concurrentServerAdditions: unknown[] = [];
  for (const srvId of serverOrderIds) {
    if (!visitedIds.has(srvId) && !deletedSet.has(srvId)) {
      const item = serverById.get(srvId);
      if (item !== undefined) {
        concurrentServerAdditions.push(item);
      }
    }
  }

  return concurrentServerAdditions.length > 0
    ? [...concurrentServerAdditions, ...mergedList]
    : mergedList;
}

function sanitizeSharedStatePayload(key: string, data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  if (key === 'multi-platform-listings-v1') {
    return data.filter((item) => !isSyntheticMultiPlatformSeedItem(item));
  }
  if (key === 'multi-platform-reups-v1') {
    return data.filter((item) => !isSyntheticMultiPlatformSeedReup(item));
  }
  if (key === 'approved-booking-list-v2') {
    return data
      .filter((item) => !isSyntheticApprovedBookingItem(item))
      .map((item) => recalculateApprovedBookingItem(item as ApprovedBookingListItem));
  }
  if (key === 'brand-monthly-plans-v1') {
    return data.filter((item) => !isSyntheticBrandMonthlyPlanItem(item));
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401, headers }
      );
    }
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản đối tác không được phép truy cập kho trạng thái nội bộ.' },
        { status: 403, headers }
      );
    }

    const singleKey = req.nextUrl.searchParams.get('key')?.trim();
    const multiKeys = req.nextUrl.searchParams.get('keys')?.trim();
    const clientRevsRaw = req.nextUrl.searchParams.get('clientRevs')?.trim() || '';

    const clientRevMap = new Map<string, number>();
    if (clientRevsRaw) {
      for (const part of clientRevsRaw.split(',')) {
        const idx = part.lastIndexOf(':');
        if (idx <= 0) continue;
        const k = part.slice(0, idx).trim();
        const rev = Number(part.slice(idx + 1).trim());
        if (k && Number.isInteger(rev) && rev > 0) {
          clientRevMap.set(k, rev);
        }
      }
    }

    let targetKeys: string[] = [];

    if (singleKey) {
      if (!ALLOWED_SHARED_STATE_KEYS.has(singleKey)) {
        return NextResponse.json(
          { success: false, error: `Mã dữ liệu "${singleKey}" không nằm trong danh sách được phép truy cập.` },
          { status: 400, headers }
        );
      }
      targetKeys = [singleKey];
    } else if (multiKeys) {
      targetKeys = multiKeys
        .split(',')
        .map(k => k.trim())
        .filter(k => ALLOWED_SHARED_STATE_KEYS.has(k));
    } else {
      targetKeys = Array.from(ALLOWED_SHARED_STATE_KEYS);
    }

    if (
      targetKeys.includes('staff-brand-listing-sheets-v1') ||
      targetKeys.includes('approved-booking-list-v2')
    ) {
      await ensureLarkListingsSyncedToDb();
    }

    const records: Record<string, { revision: number; data: unknown; unchanged?: boolean }> = {};
    let keysToFetchData = targetKeys;

    if (clientRevMap.size > 0) {
      const serverRevs = await readRevisionsBatch(targetKeys);
      keysToFetchData = [];
      for (const k of targetKeys) {
        const srvRev = serverRevs.get(k) ?? 0;
        const cliRev = clientRevMap.get(k) ?? 0;
        if (srvRev > 0 && cliRev === srvRev) {
          records[k] = { revision: srvRev, data: null, unchanged: true };
        } else if (srvRev === 0) {
          records[k] = { revision: 0, data: null };
        } else {
          keysToFetchData.push(k);
        }
      }
    }

    if (keysToFetchData.length > 0) {
      const batchMap = await readRecordsBatch<unknown>(keysToFetchData, null, { clone: false });
      for (const k of keysToFetchData) {
        const rec = batchMap.get(k) || { revision: 0, data: null };
        records[k] = { revision: rec.revision, data: sanitizeSharedStatePayload(k, rec.data) };
      }
    }

    if (singleKey) {
      return NextResponse.json(
        {
          success: true,
          key: singleKey,
          revision: records[singleKey]?.revision ?? 0,
          unchanged: records[singleKey]?.unchanged ?? false,
          data: records[singleKey]?.data ?? null,
          records,
        },
        { headers }
      );
    }

    return NextResponse.json(
      {
        success: true,
        records,
      },
      { headers }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof RecordError ? err.message : 'Lỗi khi đọc trạng thái đồng bộ.',
      },
      { status: err instanceof RecordError ? err.status : 500, headers }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401, headers }
      );
    }
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản đối tác không được phép ghi đè kho trạng thái nội bộ.' },
        { status: 403, headers }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      key?: string;
      data?: unknown;
      deletedIds?: string[];
      mode?: 'MERGE' | 'REPLACE';
      updates?: Record<string, unknown>;
      deletedIdsByKey?: Record<string, string[]>;
    };

    const updatesMap: Record<string, unknown> = {};
    const deletedMap: Record<string, string[]> = {};

    if (body.key && typeof body.key === 'string') {
      const cleanKey = body.key.trim();
      updatesMap[cleanKey] = body.data;
      if (Array.isArray(body.deletedIds)) {
        deletedMap[cleanKey] = body.deletedIds;
      }
    } else if (body.updates && typeof body.updates === 'object') {
      for (const [k, v] of Object.entries(body.updates)) {
        updatesMap[k.trim()] = v;
      }
      if (body.deletedIdsByKey && typeof body.deletedIdsByKey === 'object') {
        for (const [k, delIds] of Object.entries(body.deletedIdsByKey)) {
          if (Array.isArray(delIds)) {
            deletedMap[k.trim()] = delIds;
          }
        }
      }
    }

    const keysToProcess = Object.keys(updatesMap);
    if (keysToProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không có dữ liệu hợp lệ để lưu.' },
        { status: 400, headers }
      );
    }

    for (const key of keysToProcess) {
      if (!ALLOWED_SHARED_STATE_KEYS.has(key)) {
        return NextResponse.json(
          { success: false, error: `Mã dữ liệu "${key}" không nằm trong danh sách được phép đồng bộ.` },
          { status: 400, headers }
        );
      }
    }

    const returnFullData = req.nextUrl.searchParams.get('returnData') === '1';
    const savedRecords: Record<string, { revision: number; data?: unknown }> = {};

    const isAdminOrManager =
      ['ADMIN', 'MANAGER'].includes(user.role) ||
      Boolean(user.permissions?.includes('ALL_PERMISSIONS'));
    const canManageMasterData =
      isAdminOrManager ||
      ['LEADER'].includes(user.role) ||
      Boolean(user.permissions?.includes('canManageMasterData'));

    const ADMIN_ONLY_KEYS = new Set([
      'third-party-accounts-v1',
      'api-workspace-config-v2',
      'cloudflare-r2-config-v1',
    ]);
    const MASTER_CONFIG_KEYS = new Set([
      'task-difficulty-configs-v1',
      'sow-point-policies-v1',
      'staff-workload-exceptions-v1',
      'store-overrides-v1',
    ]);

    const keysNeedingExistenceCheck = keysToProcess.filter(
      (k) =>
        k === 'staff-brand-listing-sheets-v1' ||
        (ADMIN_ONLY_KEYS.has(k) && !isAdminOrManager) ||
        (MASTER_CONFIG_KEYS.has(k) && !canManageMasterData)
    );
    const existingRevisionsMap =
      keysNeedingExistenceCheck.length > 0
        ? await readRevisionsBatch(keysNeedingExistenceCheck)
        : new Map<string, number>();

    for (const key of keysToProcess) {
      let dataToSave = sanitizeSharedStatePayload(key, updatesMap[key]);

      // Sheet nhân sự lưu theo từng dòng qua /api/staff-listing-sheets (có kiểm quyền theo gian).
      // Ở đây chỉ nhận lần nạp đầu khi máy chủ chưa có dữ liệu, không cho ghi đè cả kho.
      if (key === 'staff-brand-listing-sheets-v1') {
        if ((existingRevisionsMap.get(key) || 0) > 0) continue;
      }

      if (ADMIN_ONLY_KEYS.has(key) && !isAdminOrManager) {
        if ((existingRevisionsMap.get(key) || 0) > 0) continue;
      }

      if (MASTER_CONFIG_KEYS.has(key) && !canManageMasterData) {
        if ((existingRevisionsMap.get(key) || 0) > 0) continue;
      }

      // Giới hạn số lượng bản ghi cho logs và screenshots để tránh phình dung lượng
      if (key === 'video-acceptance-screenshots-v1' && Array.isArray(dataToSave)) {
        dataToSave = dataToSave.slice(0, 100);
      } else if (key === 'api-usage-logs-v1' && Array.isArray(dataToSave)) {
        dataToSave = dataToSave.slice(0, 500);
      }

      const keyDeletedIds = deletedMap[key];
      const forceReplace = body.mode === 'REPLACE';
      const saved = await upsertRecord<unknown>(key, null, (currentServerData) => {
        if (forceReplace) return dataToSave;
        const merged = mergeSharedStateData(
          key,
          sanitizeSharedStatePayload(key, currentServerData),
          dataToSave,
          keyDeletedIds
        );
        if (key === 'video-acceptance-screenshots-v1' && Array.isArray(merged)) {
          return merged.slice(0, 100);
        }
        if (key === 'api-usage-logs-v1' && Array.isArray(merged)) {
          return merged.slice(0, 500);
        }
        return merged;
      });
      savedRecords[key] = returnFullData
        ? { revision: saved.revision, data: saved.data }
        : { revision: saved.revision };

      // Đồng bộ gian hàng bị override sang bảng prisma.storePortfolio nếu cấu hình DB
      if (key === 'store-overrides-v1' && dataToSave && typeof dataToSave === 'object') {
        await syncStoreOverridesToPrisma(dataToSave);
      }
    }

    return NextResponse.json(
      {
        success: true,
        records: savedRecords,
      },
      { headers }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof RecordError ? err.message : 'Lỗi khi lưu trạng thái đồng bộ.',
      },
      { status: err instanceof RecordError ? err.status : 500, headers }
    );
  }
}
