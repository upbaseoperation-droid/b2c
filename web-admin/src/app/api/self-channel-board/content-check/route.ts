import { NextRequest, NextResponse } from 'next/server';
import { readRecord, RecordError } from '@/lib/server/sharedRecords';
import { selfChannelBoardKey } from '@/lib/server/boardKeys';
import { resolvePlanContext, type PlanContext } from '@/lib/server/monthlyPlanStore';
import { runSelfContentCheck } from '@/lib/server/selfChannelCtvWork';
import { buildSelfContentModelInput, parseSelfContentModelOutput } from '@/lib/selfChannelContentCheck';
import { EMPTY_SELF_CHANNEL_BOARD, sanitizeSelfChannelBoard, type SelfChannelBoardData, type SelfContentCheckItem } from '@/lib/selfChannelBoardRules';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const canWork = (ctx: PlanContext) =>
  ctx.global || ['SELF_CHANNEL', 'BOOKING_MAIN', 'BOOKING_CO', 'BACKUP', 'LEADER'].some(p => ctx.positions.has(p as never));

/**
 * POST /api/self-channel-board/content-check — đối chiếu nội dung bài đăng với brief.
 * - { planId, jobId }: đọc bài, chạy luật từ khóa, ghi kết quả vào việc; trả kèm nội dung gửi mô hình (nếu người dùng chọn đối chiếu thêm).
 * - { planId, jobId, modelOutput }: gộp kết quả mô hình (chuỗi JSON) vào kết quả luật của đúng link.
 * Chỉ chạy khi người dùng bấm nút, không tự chạy khi mở màn hình.
 */
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json().catch(() => null)) as { planId?: string; jobId?: string; modelOutput?: string } | null;
    if (!body?.planId || !body.jobId) return NextResponse.json({ error: 'Thiếu kế hoạch hoặc việc.' }, { status: 400 });
    const ctx = await resolvePlanContext(body.planId, actor);
    if (!canWork(ctx)) return NextResponse.json({ error: 'Chỉ nhân sự phụ trách gian hàng được đối chiếu nội dung.' }, { status: 403 });

    if (typeof body.modelOutput === 'string') {
      const parsed = parseSelfContentModelOutput(body.modelOutput);
      const items: SelfContentCheckItem[] = parsed?.items || [];
      if (!parsed || items.length === 0) {
        return NextResponse.json({ error: 'Kết quả đối chiếu thêm không đọc được, giữ kết quả từ khóa.' }, { status: 422 });
      }
      const { contentCheck } = await runSelfContentCheck(ctx.plan, body.jobId, actor.name, { items, suggestion: parsed.suggestion });
      return NextResponse.json({ contentCheck });
    }

    const { contentCheck, evidence } = await runSelfContentCheck(ctx.plan, body.jobId, actor.name);
    // Nội dung gửi mô hình dựng từ việc đã lưu trên máy chủ, không nhận từ client
    const board = sanitizeSelfChannelBoard((await readRecord<SelfChannelBoardData>(selfChannelBoardKey(ctx.plan.id), EMPTY_SELF_CHANNEL_BOARD)).data);
    const job = board.jobs.find(j => j.id === body.jobId);
    const modelInput = job && evidence ? buildSelfContentModelInput(job, evidence, contentCheck.items) : '';
    return NextResponse.json({ contentCheck, modelInput });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
