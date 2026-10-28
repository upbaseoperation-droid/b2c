import { NextRequest, NextResponse } from 'next/server';
import { RecordError } from '@/lib/server/sharedRecords';
import { resolvePlanContext, type PlanContext } from '@/lib/server/monthlyPlanStore';
import { runSelfAirCheck } from '@/lib/server/selfChannelCtvWork';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const canWork = (ctx: PlanContext) =>
  ctx.global || ['SELF_CHANNEL', 'BOOKING_MAIN', 'BOOKING_CO', 'BACKUP', 'LEADER'].some(p => ctx.positions.has(p as never));

// GET /api/self-channel-board/air-check?planId=... — kênh Brand đã khai báo của gian (để kiểm link đăng đúng kênh)
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const planId = request.nextUrl.searchParams.get('planId') || '';
    const ctx = await resolvePlanContext(planId, actor);
    const canEdit = ctx.global || ['LEADER', 'BOOKING_MAIN', 'SELF_CHANNEL'].some(p => ctx.positions.has(p as never));
    return NextResponse.json({ storeId: ctx.store?.id || null, storeName: ctx.store?.storeName || ctx.plan.storeName || '', handles: ctx.store?.selfChannelHandles || {}, canEdit });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// POST /api/self-channel-board/air-check — kiểm link đăng của 1 việc: đúng kênh Brand, bài còn hiển thị; ghi kết quả vào việc
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as { planId?: string; jobId?: string } | null;
    if (!body?.planId || !body.jobId) return NextResponse.json({ error: 'Thiếu kế hoạch hoặc việc.' }, { status: 400 });
    const ctx = await resolvePlanContext(body.planId, actor);
    if (!canWork(ctx)) return NextResponse.json({ error: 'Chỉ nhân sự phụ trách gian hàng được kiểm link đăng.' }, { status: 403 });
    const airCheck = await runSelfAirCheck(ctx.plan, body.jobId, actor.name);
    return NextResponse.json({ airCheck });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
