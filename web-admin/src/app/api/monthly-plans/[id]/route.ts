import { NextRequest, NextResponse } from 'next/server';
import { saveMonthlyPlan } from '@/lib/server/monthlyPlanStore';
import type { InputPlanBreakdownState } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../_shared';

export const dynamic = 'force-dynamic';

// PUT /api/monthly-plans/:id — lưu bản làm việc (kèm revision để chống ghi đè)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { plan?: InputPlanBreakdownState; expectedRevision?: number };
    if (!body?.plan || typeof body.expectedRevision !== 'number') {
      return NextResponse.json({ error: 'Thiếu dữ liệu kế hoạch hoặc revision.' }, { status: 400 });
    }
    const stored = await saveMonthlyPlan(decodeURIComponent(id), body.plan, body.expectedRevision, actor);
    return NextResponse.json(stored);
  } catch (err) {
    return handlePlanError(err);
  }
}
