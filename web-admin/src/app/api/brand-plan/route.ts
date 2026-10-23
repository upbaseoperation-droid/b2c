import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import { isStaffGlobalAdminOrManager } from '@/lib/rbacScope';
import { EMPTY_BRAND_PLAN, sanitizeBrandPlan, type BrandPlanData } from '@/lib/brandPlanRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const keyOf = (planId: string) => `brand-plan-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/brand-plan?planId=... — plan tháng của Brand (định hướng, KPI, key visual, content theo sàn)
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const planId = request.nextUrl.searchParams.get('planId') || '';
  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch.' }, { status: 400 });
  try {
    await assertPlanIdAccess(planId, actor, 'read');
    const rec = await readRecord<BrandPlanData>(keyOf(planId), EMPTY_BRAND_PLAN);
    return NextResponse.json({ data: sanitizeBrandPlan(rec.data), revision: rec.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// PUT /api/brand-plan — lưu toàn bộ plan (chống ghi đè bằng revision)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; revision?: number; data?: Partial<BrandPlanData> };
    if (!body.planId || !body.data || typeof body.revision !== 'number') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }
    const plan = await assertPlanIdAccess(body.planId, actor, 'write');
    const leaderName = plan.hasBookingLeader !== false ? (plan.bookingLeader || '').trim().toLowerCase() : '';
    const isLeader = Boolean(leaderName) && leaderName === actor.name.trim().toLowerCase();
    const canDecide = isStaffGlobalAdminOrManager(actor) || isLeader;
    const saved = await updateRecord<BrandPlanData>(keyOf(body.planId), EMPTY_BRAND_PLAN, body.revision, previous => {
      const before = sanitizeBrandPlan(previous);
      const next = sanitizeBrandPlan(body.data);
      const from = before.approval.status;
      const to = next.approval.status;
      const strip = (d: BrandPlanData) => JSON.stringify({ ...d, approval: null });
      const contentChanged = strip(before) !== strip(next);
      const now = new Date().toISOString();
      if (from === to) {
        // Không đổi trạng thái: giữ nguyên thông tin duyệt, chỉ cho sửa nội dung khi đang là nháp hoặc cần sửa
        if ((from === 'PENDING' || from === 'APPROVED') && contentChanged) {
          throw new RecordError(from === 'PENDING' ? 'Plan đang chờ duyệt nên không sửa được. Rút lại để sửa tiếp.' : 'Plan đã được duyệt nên không sửa được. Cần người duyệt yêu cầu mở lại.', 423);
        }
        return { ...next, approval: before.approval };
      }
      if (to === 'PENDING') {
        if (from !== 'DRAFT' && from !== 'CHANGES') throw new RecordError('Chỉ gửi duyệt được khi plan đang là nháp hoặc cần sửa.', 400);
        return { ...next, approval: { status: 'PENDING', submittedBy: actor.name, submittedAt: now, decidedBy: '', decidedAt: '', note: '' } };
      }
      if (contentChanged) throw new RecordError('Không đổi nội dung cùng lúc với thao tác duyệt hoặc rút lại. Lưu nội dung trước.', 400);
      if (to === 'APPROVED' || to === 'CHANGES') {
        if (from === 'PENDING' || (from === 'APPROVED' && to === 'CHANGES')) {
          if (!canDecide) throw new RecordError('Chỉ Trưởng nhóm của gian hàng hoặc Giám đốc được duyệt hoặc yêu cầu sửa plan.', 403);
          return { ...before, approval: { ...before.approval, status: to, decidedBy: actor.name, decidedAt: now, note: next.approval.note } };
        }
        throw new RecordError('Trạng thái hiện tại không chuyển được sang trạng thái này.', 400);
      }
      if (to === 'DRAFT' && from === 'PENDING') {
        if (!canDecide && before.approval.submittedBy !== actor.name) throw new RecordError('Chỉ người đã gửi duyệt hoặc người duyệt được rút lại.', 403);
        return { ...before, approval: { ...before.approval, status: 'DRAFT', decidedBy: '', decidedAt: '' } };
      }
      throw new RecordError('Trạng thái hiện tại không chuyển được sang trạng thái này.', 400);
    });
    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
