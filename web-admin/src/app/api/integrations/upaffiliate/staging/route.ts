import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord } from '@/lib/server/sharedRecords';
import { requestActor } from '@/lib/server/requestActor';
import { USERS } from '@/lib/mockData';
import type { StagingKocItem } from '@/lib/kocStagingService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STAGING_RECORD_KEY = 'upaffiliate-pending-koc-staging';
const headers = { 'Cache-Control': 'no-store' };

interface StagingStorageData {
  items: StagingKocItem[];
  updatedAt: string;
}

const DEFAULT_STAGING_DATA: StagingStorageData = {
  items: [],
  updatedAt: new Date(0).toISOString(),
};

async function resolveUser(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

export async function GET() {
  try {
    const record = await readRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA
    );
    return NextResponse.json(
      {
        success: true,
        items: record.data.items || [],
        total: (record.data.items || []).length,
        updatedAt: record.data.updatedAt,
      },
      { headers }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi nạp bảng tạm KOC.';
    return NextResponse.json(
      { success: false, message: msg, items: [] },
      { status: 500, headers }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    const body = await req.json();
    const incomingItems = Array.isArray(body?.items) ? body.items : [];

    if (incomingItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Danh sách KOC trống.', savedCount: 0 },
        { status: 400, headers }
      );
    }

    const currentRecord = await readRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA
    );

    const result = await updateRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA,
      currentRecord.revision,
      (current: StagingStorageData) => {
        const existingList = Array.isArray(current.items) ? current.items : [];
        const existingMap = new Map<string, StagingKocItem>();
        for (const it of existingList) {
          existingMap.set(it.channelId.toLowerCase().trim(), it);
        }

        let addedCount = 0;
        const now = new Date().toISOString();

        for (const item of incomingItems) {
          const rawHandle = (item.channelId || item.handle || '').toString().trim();
          const clean = rawHandle.toLowerCase().replace(/^@+/, '');
          if (!clean) continue;

          // Nếu đã có trong bảng tạm thì cập nhật thêm thông tin nếu trước đó thiếu
          if (existingMap.has(clean)) {
            const currentItem = existingMap.get(clean)!;
            existingMap.set(clean, {
              ...currentItem,
              stageName: item.stageName || currentItem.stageName,
              phone: item.phone || currentItem.phone,
              zalo: item.zalo || currentItem.zalo,
              followersCount: item.followersCount || currentItem.followersCount,
              avgViews: item.avgViews || currentItem.avgViews,
              sampleVideoUrl: item.sampleVideoUrl || currentItem.sampleVideoUrl,
            });
          } else {
            // Thêm mới vào bảng tạm
            const newStagingItem: StagingKocItem = {
              id: `stg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              channelId: clean,
              channelUrl: item.channelUrl || `https://www.tiktok.com/@${clean}`,
              stageName: item.stageName || clean,
              realName: item.realName || undefined,
              phone: item.phone || undefined,
              zalo: item.zalo || undefined,
              email: item.email || undefined,
              followersCount: Math.max(0, Math.round(Number(item.followersCount) || 0)),
              avgViews: Math.max(0, Math.round(Number(item.avgViews) || 0)),
              engagementRate: Number(item.engagementRate) || undefined,
              discoverySource: item.discoverySource || 'COMPETITOR_DISCOVERY',
              sourceContext: item.sourceContext || 'Tìm kiếm tự động',
              sampleVideoUrl: item.sampleVideoUrl || undefined,
              sampleVideoViews: Number(item.sampleVideoViews) || undefined,
              sampleVideoCaption: item.sampleVideoCaption || undefined,
              discoveredByStaffId: user?.id || 'staff-b2c',
              discoveredByStaffName: user?.name || 'Chuyên viên B2C',
              discoveredAt: now,
              exportStatus: 'PENDING_EXPORT',
            };
            existingMap.set(clean, newStagingItem);
            addedCount++;
          }
        }

        return {
          items: Array.from(existingMap.values()),
          updatedAt: now,
        };
      }
    );

    return NextResponse.json(
      {
        success: true,
        savedCount: result.data.items.length,
        items: result.data.items,
        updatedAt: result.data.updatedAt,
      },
      { headers }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi lưu KOC vào bảng tạm.';
    return NextResponse.json(
      { success: false, message: msg, savedCount: 0 },
      { status: 500, headers }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const rawChannels: string[] = Array.isArray(body?.channelIds)
      ? body.channelIds
      : body?.channelId
        ? [body.channelId]
        : [];
    const nextStatus = body?.exportStatus as StagingKocItem['exportStatus'] | undefined;

    if (rawChannels.length === 0 || !nextStatus) {
      return NextResponse.json(
        { success: false, message: 'Thiếu danh sách kênh hoặc trạng thái cần cập nhật.' },
        { status: 400, headers }
      );
    }

    const targetSet = new Set(
      rawChannels.map((c) => String(c).toLowerCase().trim().replace(/^@+/, '')).filter(Boolean)
    );
    const now = new Date().toISOString();

    const currentRecord = await readRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA
    );

    const result = await updateRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA,
      currentRecord.revision,
      (current: StagingStorageData) => {
        const existingList = Array.isArray(current.items) ? current.items : [];
        const updatedItems = existingList.map((it) => {
          const clean = it.channelId.toLowerCase().trim().replace(/^@+/, '');
          if (!targetSet.has(clean)) return it;
          return {
            ...it,
            exportStatus: nextStatus,
            upaffiliateMasterId:
              it.upaffiliateMasterId ||
              `UPA-NEW-${clean.slice(0, 6).toUpperCase()}`,
            exportedAt:
              nextStatus === 'ENRICHING' || nextStatus === 'EXPORTED'
                ? now
                : it.exportedAt,
          };
        });
        return {
          items: updatedItems,
          updatedAt: now,
        };
      }
    );

    return NextResponse.json(
      {
        success: true,
        items: result.data.items,
        total: result.data.items.length,
        updatedAt: result.data.updatedAt,
      },
      { headers }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái bảng tạm.';
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500, headers }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    const currentRecord = await readRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA
    );

    const result = await updateRecord<StagingStorageData>(
      STAGING_RECORD_KEY,
      DEFAULT_STAGING_DATA,
      currentRecord.revision,
      (current: StagingStorageData) => {
        const existingList = Array.isArray(current.items) ? current.items : [];
        if (!channelId) {
          // Xóa toàn bộ
          return { items: [], updatedAt: new Date().toISOString() };
        }
        const clean = channelId.toLowerCase().trim().replace(/^@+/, '');
        const filtered = existingList.filter((it: StagingKocItem) => it.channelId !== clean);
        return { items: filtered, updatedAt: new Date().toISOString() };
      }
    );

    return NextResponse.json(
      {
        success: true,
        items: result.data.items,
        total: result.data.items.length,
      },
      { headers }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi xóa KOC khỏi bảng tạm.';
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500, headers }
    );
  }
}
