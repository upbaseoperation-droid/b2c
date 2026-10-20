import { NextRequest, NextResponse } from 'next/server';
import type { KocItem } from '@/lib/types';
import { USERS } from '@/lib/mockData';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECORD_KEY = 'koc-directory-changes';
const headers = { 'Cache-Control': 'no-store' };

export interface KocDirectoryChangesData {
  itemsByHandle: Record<string, KocItem>;
  updatedAt: string;
}

const DEFAULT_KOC_CHANGES: KocDirectoryChangesData = {
  itemsByHandle: {},
  updatedAt: new Date(0).toISOString(),
};

function normalizeHandleKey(koc: Partial<KocItem>): string {
  const raw = (koc.channelId || koc.id || '').trim().toLowerCase().replace(/^@+/, '');
  return raw || (koc.id || '').trim().toLowerCase();
}

async function resolveUser(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  if (process.env.NODE_ENV !== 'production') {
    return USERS[0];
  }
  return null;
}

async function syncKocsToPrismaTable(items: KocItem[]): Promise<void> {
  if (!process.env.DATABASE_URL || items.length === 0) return;
  try {
    for (const item of items.slice(0, 50)) {
      const cleanHandle = item.channelId?.trim().replace(/^@+/, '')
        ? `@${item.channelId.trim().replace(/^@+/, '')}`
        : `@${item.id}`;
      await prisma.kocProfile.upsert({
        where: { channelId: cleanHandle },
        update: {
          stageName: item.stageName || cleanHandle,
          realName: item.realName || null,
          channelUrl: item.channelLink || `https://www.tiktok.com/${cleanHandle}`,
          followersCount: Math.max(0, Math.round(Number(item.followers) || 0)),
          avgViews: Math.max(0, Math.round(Number(item.avgViews) || 0)),
          niche: item.niche || item.tepKenh || null,
          phone: item.phone || null,
          zalo: item.zalo || null,
          email: item.email || null,
          cccd: item.cccd || null,
          taxCode: item.taxCode || null,
          bankName: item.bankName || null,
          bankAccount: item.bankAccount || null,
          rateCardVideo: Number(item.rateCardVideo) || 0,
          reliabilityScore: Number(item.reliabilityScore) || 10,
        },
        create: {
          channelId: cleanHandle,
          stageName: item.stageName || cleanHandle,
          realName: item.realName || null,
          channelUrl: item.channelLink || `https://www.tiktok.com/${cleanHandle}`,
          followersCount: Math.max(0, Math.round(Number(item.followers) || 0)),
          avgViews: Math.max(0, Math.round(Number(item.avgViews) || 0)),
          niche: item.niche || item.tepKenh || null,
          phone: item.phone || null,
          zalo: item.zalo || null,
          email: item.email || null,
          cccd: item.cccd || null,
          taxCode: item.taxCode || null,
          bankName: item.bankName || null,
          bankAccount: item.bankAccount || null,
          rateCardVideo: Number(item.rateCardVideo) || 0,
          reliabilityScore: Number(item.reliabilityScore) || 10,
        },
      });
    }
  } catch {
    // Bỏ qua nếu bảng KocProfile chưa migrate trên môi trường local, dữ liệu vẫn được bảo toàn trong AppSharedRecord
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

    const record = await readRecord<KocDirectoryChangesData>(RECORD_KEY, DEFAULT_KOC_CHANGES);
    const items = Object.values(record.data.itemsByHandle || {});

    return NextResponse.json(
      {
        success: true,
        revision: record.revision,
        updatedAt: record.data.updatedAt,
        totalCustomCount: items.length,
        items,
      },
      { headers }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof RecordError
            ? err.message
            : 'Không tải được dữ liệu Danh bạ KOC từ máy chủ.',
      },
      { status: err instanceof RecordError ? err.status : 500, headers }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401, headers }
      );
    }

    const body = (await req.json()) as {
      created?: KocItem[];
      updated?: KocItem[];
      koc?: KocItem;
    };

    const incoming: KocItem[] = [
      ...(Array.isArray(body.created) ? body.created : []),
      ...(Array.isArray(body.updated) ? body.updated : []),
      ...(body.koc ? [body.koc] : []),
    ].filter((item): item is KocItem => Boolean(item && (item.id || item.channelId)));

    if (incoming.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không có dữ liệu KOC hợp lệ để lưu.' },
        { status: 400, headers }
      );
    }

    const current = await readRecord<KocDirectoryChangesData>(RECORD_KEY, DEFAULT_KOC_CHANGES);
    const updatedRecord = await updateRecord<KocDirectoryChangesData>(
      RECORD_KEY,
      DEFAULT_KOC_CHANGES,
      current.revision,
      (prev) => {
        const nextMap: Record<string, KocItem> = { ...(prev.itemsByHandle || {}) };
        for (const item of incoming) {
          const key = normalizeHandleKey(item);
          if (!key) continue;
          const existing = nextMap[key];
          nextMap[key] = existing ? { ...existing, ...item } : item;
        }
        return {
          itemsByHandle: nextMap,
          updatedAt: new Date().toISOString(),
        };
      }
    );

    await syncKocsToPrismaTable(incoming);

    const allItems = Object.values(updatedRecord.data.itemsByHandle || {});
    return NextResponse.json(
      {
        success: true,
        revision: updatedRecord.revision,
        savedCount: incoming.length,
        totalCustomCount: allItems.length,
        items: allItems,
      },
      { headers }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof RecordError
            ? err.message
            : 'Không lưu được KOC vào cơ sở dữ liệu máy chủ.',
      },
      { status: err instanceof RecordError ? err.status : 500, headers }
    );
  }
}
