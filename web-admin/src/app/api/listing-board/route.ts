import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { dealBoardKey, listingBoardKey } from '@/lib/server/boardKeys';
import { assertCanViewBooking, listPlansOfBrandMonth, resolvePlanContext, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { readRecordsBatch } from '@/lib/server/sharedRecords';
import { columnOf, itemFee } from '@/lib/listingBoardRules';
import { guardListingSave } from '@/lib/listingBoardGuard';
import { DealGuardError } from '@/lib/dealBoardGuard';
import { EMPTY_DEAL_BOARD, type DealBoardData } from '@/lib/dealBoardRules';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 3000;

interface ListingBoardData {
  items: KocListingItem[];
}

const keyOf = listingBoardKey;

// GET /api/listing-board?planId=... hoặc ?storeName=...&month=... hoặc ?summary=true
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();

  // GET /api/listing-board?all=true — Lấy toàn bộ KOC đã list của mọi kế hoạch
  if (request.nextUrl.searchParams.get('all') === 'true') {
    try {
      const storedList = await listMonthlyPlans(actor);
      const planKeys = storedList.map((r) => keyOf(r.plan.id));
      const records = await readRecordsBatch<ListingBoardData>(planKeys, { items: [] });
      const allItems: KocListingItem[] = [];
      for (const rec of records.values()) {
        if (rec.data?.items && Array.isArray(rec.data.items)) {
          allItems.push(...rec.data.items);
        }
      }
      return NextResponse.json({ items: allItems, count: allItems.length });
    } catch (err) {
      return handlePlanError(err);
    }
  }

  // GET /api/listing-board?summary=true — Thống kê số lượng KOC đã list theo từng gian và tháng
  if (request.nextUrl.searchParams.get('summary') === 'true') {
    try {
      const storedList = await listMonthlyPlans(actor);
      const planKeys = storedList.map((r) => ({
        planId: r.plan.id,
        storeName: r.plan.storeName || r.plan.title,
        month: r.plan.month,
        key: keyOf(r.plan.id),
      }));
      const records = await readRecordsBatch<ListingBoardData>(
        planKeys.map((p) => p.key),
        { items: [] }
      );
      const summary: Record<string, { storeName: string; month: string; count: number; planId: string }> = {};
      for (const p of planKeys) {
        const rec = records.get(p.key);
        const count = rec?.data?.items?.length || 0;
        if (count > 0) {
          summary[`${p.month}__${p.storeName}`] = {
            storeName: p.storeName,
            month: p.month,
            count,
            planId: p.planId,
          };
        }
      }
      return NextResponse.json({ summary });
    } catch (err) {
      return handlePlanError(err);
    }
  }

  let planId = request.nextUrl.searchParams.get('planId') || '';
  const storeNameParam = request.nextUrl.searchParams.get('storeName')?.trim();
  const monthParam = request.nextUrl.searchParams.get('month')?.trim();

  // Nếu không truyền planId nhưng truyền storeName và month, tự động tìm kế hoạch phù hợp
  if (!planId && storeNameParam && monthParam) {
    try {
      const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
      const storedList = await listMonthlyPlans(actor);
      const targetStore = norm(storeNameParam);
      const matched = storedList.find(
        (r) =>
          r.plan.month === monthParam &&
          (norm(r.plan.storeName) === targetStore ||
            norm(r.plan.title) === targetStore)
      );
      if (matched) {
        planId = matched.plan.id;
      }
    } catch {
      /* ignore */
    }
  }

  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch hoặc gian hàng không hợp lệ.' }, { status: 400 });
  // GET /api/listing-board?planId=...&view=duplicates — KOC của kế hoạch này đang được list ở gian khác cùng nhãn, cùng tháng (để cảnh báo)
  if (request.nextUrl.searchParams.get('view') === 'duplicates') {
    try {
      const ctx = await resolvePlanContext(planId, actor);
      assertCanViewBooking(ctx);
      const norm = (v?: string) => (v || '').replace(/^@/, '').trim().toLowerCase();
      const mine = await readRecord<ListingBoardData>(keyOf(planId), { items: [] });
      const myHandles = new Set((mine.data.items || []).filter(i => i.overallStatus !== 'DROPPED').map(i => norm(i.kocHandle)).filter(Boolean));
      // Quét mọi gian cùng nhãn, cùng tháng — kể cả gian người dùng không được xem — vì đó chính là trùng cần cảnh báo.
      // Chỉ trả về tên gian, người phụ trách và trạng thái.
      const siblings = (await listPlansOfBrandMonth(ctx.plan.brandName, ctx.plan.month)).filter(p => p.id !== planId);
      const records = await readRecordsBatch<ListingBoardData>(siblings.map(p => keyOf(p.id)), { items: [] });
      const duplicates: { handle: string; storeName: string; pic: string; status: string }[] = [];
      for (const p of siblings) {
        for (const it of records.get(keyOf(p.id))?.data.items || []) {
          if (it.overallStatus === 'DROPPED' || !myHandles.has(norm(it.kocHandle))) continue;
          duplicates.push({ handle: norm(it.kocHandle), storeName: p.storeName || p.title, pic: it.assignedStaffName || '', status: columnOf(it) });
        }
      }
      return NextResponse.json({ duplicates });
    } catch (err) {
      return handlePlanError(err);
    }
  }
  try {
    assertCanViewBooking(await resolvePlanContext(planId, actor));
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
    const ctx = await resolvePlanContext(body.planId, actor);
    assertCanViewBooking(ctx);
    const planId = body.planId;
    const existingRec = await readRecord<ListingBoardData>(keyOf(planId), { items: [] });
    const prevById = new Map<string, KocListingItem>(
      (existingRec.data.items || []).map(it => [it.id, it])
    );
    const dealBoard = await readRecord<DealBoardData>(dealBoardKey(planId), EMPTY_DEAL_BOARD);
    const itemsWithDeal = new Set((dealBoard.data.deals || []).map(d => d.listingItemId).filter(Boolean));
    // Quyền theo người phụ trách KOC, căn cứ Brand duyệt, KOC đã có Deal
    const guarded = guardListingSave(existingRec.data.items || [], body.items, {
      actor,
      global: ctx.global,
      positions: ctx.positions,
      storeCodes: ctx.store?.staffCodes,
      itemsWithDeal,
    });

    const items = guarded.map(raw => {
      const i: KocListingItem = { ...raw, sourcePlanId: planId };
      const prev = prevById.get(i.id);
      const wasApproved = Boolean(prev && (prev.brandApprovalStatus === 'BRAND_APPROVED' || prev.overallStatus === 'FINAL_APPROVED'));
      // Nếu tăng giá sau khi Brand đã duyệt hoặc đã chốt Deal, bắt buộc đưa về chờ Brand duyệt lại (L3):
      // xóa căn cứ duyệt cũ (ngày duyệt, bằng chứng) và đánh mốc tăng giá để "Yes" cũ trên Sheet không tự duyệt lại
      if (prev && wasApproved && itemFee(i) > itemFee(prev) && columnOf(i) !== 'DROPPED') {
        return {
          ...i,
          overallStatus: 'SUBMITTED' as const,
          brandApprovalStatus: 'BRAND_PENDING' as const,
          brandApprovedAt: undefined,
          brandApprovedBy: undefined,
          brandApprovalEvidence: undefined,
          brandRepricedAt: new Date().toISOString(),
          lastSheetDecision: undefined,
          lastSheetDecisionAt: undefined,
        };
      }
      // Brand duyệt trong app (có bằng chứng / FOC): ghi lại giá được duyệt
      if (i.brandApprovalStatus === 'BRAND_APPROVED' && !wasApproved) {
        return { ...i, brandApprovedFee: itemFee(i), brandRepricedAt: undefined };
      }
      return i;
    });
    const saved = await updateRecord<ListingBoardData>(keyOf(planId), { items: [] }, body.revision, () => ({ items }));
    return NextResponse.json({ items: saved.data.items, data: { items: saved.data.items }, revision: saved.revision });
  } catch (err) {
    if (err instanceof DealGuardError) return NextResponse.json({ error: err.message, code: 'FORBIDDEN_CHANGE' }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
