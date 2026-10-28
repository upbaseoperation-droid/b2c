import { NextRequest, NextResponse } from 'next/server';
import { requestActor } from '@/lib/server/requestActor';
import { USERS } from '@/lib/mockData';
import { readRecord, upsertRecord, RecordError } from '@/lib/server/sharedRecords';
import { ensureLarkListingsSyncedToDb } from '@/lib/server/larkListingDbSync';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

const ALLOWED_SHARED_STATE_KEYS = new Set<string>([
  'brand-monthly-plans-v1',
  'store-air-plans-v1',
  'approved-booking-list-v2',
  'staff-brand-listing-sheets-v1',
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

    const records: Record<string, { revision: number; data: unknown }> = {};
    await Promise.all(
      targetKeys.map(async (k) => {
        const rec = await readRecord<unknown>(k, null);
        records[k] = { revision: rec.revision, data: rec.data };
      })
    );

    if (singleKey) {
      return NextResponse.json(
        {
          success: true,
          key: singleKey,
          revision: records[singleKey]?.revision ?? 0,
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
      updates?: Record<string, unknown>;
    };

    const updatesMap: Record<string, unknown> = {};

    if (body.key && typeof body.key === 'string') {
      updatesMap[body.key.trim()] = body.data;
    } else if (body.updates && typeof body.updates === 'object') {
      for (const [k, v] of Object.entries(body.updates)) {
        updatesMap[k.trim()] = v;
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

    const savedRecords: Record<string, { revision: number; data: unknown }> = {};

    for (const key of keysToProcess) {
      let dataToSave = updatesMap[key];

      // Sheet nhân sự lưu theo từng dòng qua /api/staff-listing-sheets (có kiểm quyền theo gian).
      // Ở đây chỉ nhận lần nạp đầu khi máy chủ chưa có dữ liệu, không cho ghi đè cả kho.
      if (key === 'staff-brand-listing-sheets-v1') {
        const existing = await readRecord<unknown>(key, null);
        if (existing.revision > 0) continue;
      }

      // Giới hạn số lượng bản ghi cho logs và screenshots để tránh phình dung lượng
      if (key === 'video-acceptance-screenshots-v1' && Array.isArray(dataToSave)) {
        dataToSave = dataToSave.slice(0, 100);
      } else if (key === 'api-usage-logs-v1' && Array.isArray(dataToSave)) {
        dataToSave = dataToSave.slice(0, 500);
      }

      const saved = await upsertRecord<unknown>(key, null, () => dataToSave);
      savedRecords[key] = { revision: saved.revision, data: saved.data };

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
