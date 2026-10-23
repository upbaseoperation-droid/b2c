import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import type { ContentPlanData, ContentSlot } from '@/lib/contentPlanRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const MAX_SLOTS = 3000;

const keyOf = (planId: string) => `content-plan-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/content-plan?planId=... — kế hoạch content của một kế hoạch tháng
// GET /api/content-plan?selfAll=1 — tổng hợp toàn bộ các ô row === 'SELF' từ tất cả kế hoạch tháng để liên thông sang SelfChannelCtvHubView
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const selfAll = request.nextUrl.searchParams.get('selfAll');
  if (selfAll === '1' || selfAll === 'true') {
    try {
      const plans = await listMonthlyPlans(actor);
      const selfSlots: Array<{
        planId: string;
        storeName: string;
        brandName: string;
        month: string;
        slot: ContentSlot;
      }> = [];
      for (const p of plans) {
        const rec = await readRecord<ContentPlanData>(keyOf(p.plan.id), { slots: [] });
        const slots = (rec.data.slots || []).filter(s => s.row === 'SELF');
        for (const slot of slots) {
          selfSlots.push({
            planId: p.plan.id,
            storeName: p.plan.storeName || p.plan.title,
            brandName: p.plan.brandName,
            month: p.plan.month,
            slot,
          });
        }
      }
      return NextResponse.json({ selfSlots });
    } catch (err) {
      return handlePlanError(err);
    }
  }
  const planId = request.nextUrl.searchParams.get('planId') || '';
  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch.' }, { status: 400 });
  try {
    await assertPlanIdAccess(planId, actor, 'read');
    const rec = await readRecord<ContentPlanData>(keyOf(planId), { slots: [] });
    return NextResponse.json({ data: { ...rec.data, slots: rec.data.slots || [] }, revision: rec.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// PUT /api/content-plan — lưu toàn bộ kế hoạch content (chống ghi đè bằng revision)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; revision?: number; data?: Partial<ContentPlanData> };
    if (!body.planId || !body.data || !Array.isArray(body.data.slots) || typeof body.revision !== 'number') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }
    if (body.data.slots.length > MAX_SLOTS) {
      return NextResponse.json({ error: `Tối đa ${MAX_SLOTS} content mỗi kế hoạch.` }, { status: 400 });
    }
    await assertPlanIdAccess(body.planId, actor, 'write');
    const next: ContentPlanData = {
      slots: body.data.slots as ContentSlot[],
      sheetUrl: typeof body.data.sheetUrl === 'string' ? body.data.sheetUrl.slice(0, 500) : undefined,
      tabName: typeof body.data.tabName === 'string' ? body.data.tabName.slice(0, 100) : undefined,
      lastPush: body.data.lastPush,
    };
    const saved = await updateRecord<ContentPlanData>(keyOf(body.planId), { slots: [] }, body.revision, () => next);
    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
