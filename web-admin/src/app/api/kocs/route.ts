import { NextRequest, NextResponse } from 'next/server';
import type { KocItem } from '@/lib/types';
import { USERS } from '@/lib/mockData';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';

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
        { success: false, error: 'Tài khoản đối tác không có quyền tải danh bạ KOC nội bộ.' },
        { status: 403, headers }
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
    if (user.partnerType || user.role.endsWith('_PARTNER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản đối tác không có quyền chỉnh sửa danh bạ KOC nội bộ.' },
        { status: 403, headers }
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
          let existingById: KocItem | undefined;
          if (item.id) {
            for (const [k, v] of Object.entries(nextMap)) {
              if (v?.id === item.id && k !== key) {
                existingById = v;
                delete nextMap[k];
              }
            }
          }
          const existing = nextMap[key] || existingById;
          nextMap[key] = existing ? { ...existing, ...item } : item;
        }
        return {
          itemsByHandle: nextMap,
          updatedAt: new Date().toISOString(),
        };
      }
    );

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
