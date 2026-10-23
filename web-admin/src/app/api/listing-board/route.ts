import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 3000;

interface ListingBoardData {
  items: KocListingItem[];
}

const keyOf = (planId: string) => `listing-board-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/listing-board?planId=... — danh sách KOC đã list cho một kế hoạch tháng
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const planId = request.nextUrl.searchParams.get('planId') || '';
  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch.' }, { status: 400 });
  try {
    await assertPlanIdAccess(planId, actor, 'read');
    const rec = await readRecord<ListingBoardData>(keyOf(planId), { items: [] });
    const items = rec.data.items || [];
    return NextResponse.json({ items, data: { items }, revision: rec.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// PUT /api/listing-board — lưu toàn bộ danh sách của một kế hoạch (chống ghi đè bằng revision)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; revision?: number; items?: KocListingItem[]; data?: { items?: KocListingItem[] } };
    body.items = body.items ?? body.data?.items;
    if (!body.planId || !Array.isArray(body.items) || typeof body.revision !== 'number') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }
    if (body.items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Tối đa ${MAX_ITEMS} KOC mỗi kế hoạch.` }, { status: 400 });
    }
    await assertPlanIdAccess(body.planId, actor, 'write');
    const planId = body.planId;
    const items = body.items.map(i => ({ ...i, sourcePlanId: planId }));
    const saved = await updateRecord<ListingBoardData>(keyOf(planId), { items: [] }, body.revision, () => ({ items }));
    return NextResponse.json({ items: saved.data.items, data: { items: saved.data.items }, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
