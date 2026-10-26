import { NextRequest, NextResponse } from 'next/server';
import { readRecord, readRecordsBatch, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { selfChannelBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess, listMonthlyPlans, resolvePlanContext } from '@/lib/server/monthlyPlanStore';
import {
  EMPTY_SELF_CHANNEL_BOARD,
  sanitizeSelfChannelBoard,
  selfJobAcceptanceBlocker,
  selfJobPaymentBlocker,
  type SelfChannelBoardData,
  type SelfChannelJob,
} from '@/lib/selfChannelBoardRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const keyOf = selfChannelBoardKey;

// GET /api/self-channel-board?planId=... — Lấy bảng công việc video Self-channel của 1 kế hoạch
// GET /api/self-channel-board?all=1 — Gom toàn bộ công việc video Self-channel từ mọi kế hoạch trong phạm vi người dùng
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();

  const fetchAll = request.nextUrl.searchParams.get('all') === '1';
  if (fetchAll) {
    try {
      const storedPlans = await listMonthlyPlans(actor);
      const allJobs: Array<SelfChannelJob & { planId: string; storeName: string; brandName: string; month: string }> = [];
      const boardRecords = await readRecordsBatch<SelfChannelBoardData>(
        storedPlans.map(({ plan }) => keyOf(plan.id)),
        EMPTY_SELF_CHANNEL_BOARD,
        { clone: false }
      );
      for (const { plan } of storedPlans) {
        const rec = boardRecords.get(keyOf(plan.id));
        if (!rec || !rec.data?.jobs?.length) continue;
        const board = sanitizeSelfChannelBoard(rec.data);
        for (const j of board.jobs) {
          allJobs.push({
            ...j,
            planId: plan.id,
            storeName: plan.storeName || plan.title,
            brandName: plan.brandName,
            month: plan.month,
          });
        }
      }

      return NextResponse.json({ jobs: allJobs, planCount: storedPlans.length });
    } catch (err) {
      if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
      return handlePlanError(err);
    }
  }

  const planId = request.nextUrl.searchParams.get('planId') || '';
  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch.' }, { status: 400 });

  try {
    await assertPlanIdAccess(planId, actor, 'read');
    const rec = await readRecord<SelfChannelBoardData>(keyOf(planId), EMPTY_SELF_CHANNEL_BOARD);
    return NextResponse.json({ data: sanitizeSelfChannelBoard(rec.data), revision: rec.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// PUT /api/self-channel-board — Lưu bảng công việc video Self-channel (kiểm soát revision và ràng buộc nghiệp vụ)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();

  try {
    const body = (await request.json()) as {
      planId?: string;
      revision?: number;
      data?: Partial<SelfChannelBoardData>;
    };

    if (!body.planId || !body.data || typeof body.revision !== 'number') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }

    // Bảng Video kênh Brand: PIC Kênh tự sở hữu, Booking chính, Booking phụ, Dự phòng, Leader hoặc Giám đốc
    const ctx = await resolvePlanContext(body.planId, actor);
    if (!ctx.global && !['SELF_CHANNEL', 'BOOKING_MAIN', 'BOOKING_CO', 'BACKUP', 'LEADER'].some(p => ctx.positions.has(p as never))) {
      return NextResponse.json({ error: 'Chỉ nhân sự phụ trách gian hàng (Self-channel, Booking chính/phụ, Dự phòng) hoặc Leader được sửa bảng Video kênh Brand.' }, { status: 403 });
    }
    const incoming = sanitizeSelfChannelBoard(body.data);

    const saved = await updateRecord<SelfChannelBoardData>(
      keyOf(body.planId),
      EMPTY_SELF_CHANNEL_BOARD,
      body.revision,
      async previous => {
        const prevJobs = new Map(sanitizeSelfChannelBoard(previous).jobs.map(j => [j.id, j]));
        const codes = new Set<string>();

        for (const j of incoming.jobs) {
          if (!j.code) throw new RecordError('Mã công việc video không được để trống.', 400);
          if (codes.has(j.code)) throw new RecordError(`Mã công việc video ${j.code} bị trùng lặp.`, 400);
          codes.add(j.code);

          const old = prevJobs.get(j.id);

          // Ràng buộc nghiệm thu Đạt
          if (j.acceptanceStatus === 'PASSED' && old?.acceptanceStatus !== 'PASSED') {
            const blocker = selfJobAcceptanceBlocker(j);
            if (blocker) throw new RecordError(`Không thể nghiệm thu job ${j.code}: ${blocker}`, 400);
          }

          // Ràng buộc lập Đề nghị thanh toán hoặc Đã thanh toán
          if (
            (j.paymentStatus === 'REQUESTED' || j.paymentStatus === 'PAID') &&
            old?.paymentStatus !== j.paymentStatus
          ) {
            const blocker = selfJobPaymentBlocker(j);
            if (blocker) throw new RecordError(`Không thể chuyển trạng thái thanh toán job ${j.code}: ${blocker}`, 400);
          }
        }

        return incoming;
      }
    );

    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
