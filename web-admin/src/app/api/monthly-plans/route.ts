import { NextRequest, NextResponse } from 'next/server';
import { createMonthlyPlan, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import type { InputPlanBreakdownState } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from './_shared';

export const dynamic = 'force-dynamic';

// GET /api/monthly-plans — danh sách kế hoạch tháng (kèm phiên bản chốt & sổ trao đổi)
export async function GET(request: NextRequest) {
  const actor = getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const plans = await listMonthlyPlans(actor);
    return NextResponse.json({ plans });
  } catch (err) {
    return handlePlanError(err);
  }
}

// POST /api/monthly-plans — tạo kế hoạch mới (tạo mới hoặc nhân bản)
export async function POST(request: NextRequest) {
  const actor = getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { plan?: InputPlanBreakdownState };
    if (!body?.plan) return NextResponse.json({ error: 'Thiếu dữ liệu kế hoạch.' }, { status: 400 });
    const stored = await createMonthlyPlan(body.plan, actor);
    return NextResponse.json(stored, { status: 201 });
  } catch (err) {
    return handlePlanError(err);
  }
}
