import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { listingBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import { columnOf, isDirectConfirmEligible, itemFee } from '@/lib/listingBoardRules';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 3000;

interface ListingBoardData {
  items: KocListingItem[];
}

const keyOf = listingBoardKey;

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
    const existingRec = await readRecord<ListingBoardData>(keyOf(planId), { items: [] });
    const prevById = new Map<string, KocListingItem>(
      (existingRec.data.items || []).map(it => [it.id, it])
    );

    const items = body.items.map(raw => {
      const i: KocListingItem = { ...raw, sourcePlanId: planId };
      const prev = prevById.get(i.id);
      if (prev) {
        const wasApproved =
          prev.brandApprovalStatus === 'BRAND_APPROVED' || prev.overallStatus === 'FINAL_APPROVED';
        // Nếu tăng giá sau khi Brand đã duyệt hoặc đã chốt Deal, bắt buộc đưa về chờ Brand duyệt lại (L3)
        if (wasApproved && itemFee(i) > itemFee(prev) && columnOf(i) !== 'DROPPED') {
          return {
            ...i,
            overallStatus: 'SUBMITTED' as const,
            brandApprovalStatus: 'BRAND_PENDING' as const,
            lastSheetDecision: undefined,
            lastSheetDecisionAt: undefined,
          };
        }
        // Chặn nhảy cóc từ DRAFT/WAIT_BRAND sang CONFIRMED nếu không đủ điều kiện FOC/KOL chỉ định (L2)
        const prevCol = columnOf(prev);
        if (
          (prevCol === 'DRAFT' || prevCol === 'WAIT_BRAND') &&
          columnOf(i) === 'CONFIRMED' &&
          !isDirectConfirmEligible(i) &&
          !prev.brandApprovedAt
        ) {
          return {
            ...i,
            overallStatus: 'SUBMITTED' as const,
            brandApprovalStatus: 'BRAND_PENDING' as const,
          };
        }
      }
      return i;
    });
    const saved = await updateRecord<ListingBoardData>(keyOf(planId), { items: [] }, body.revision, () => ({ items }));
    return NextResponse.json({ items: saved.data.items, data: { items: saved.data.items }, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
