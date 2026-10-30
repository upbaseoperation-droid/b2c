import { NextRequest, NextResponse } from 'next/server';
import { readRecord, readRecordsBatch, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { selfChannelBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess, listMonthlyPlans, resolvePlanContext } from '@/lib/server/monthlyPlanStore';
import {
  EMPTY_SELF_CHANNEL_BOARD,
  computeSelfPlanTarget,
  isSelfScriptReady,
  sanitizeSelfChannelBoard,
  selfBrandScriptBlocker,
  selfJobAcceptanceBlocker,
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
      // Chỉ tiêu Self-channel của từng kế hoạch (4.1.1) để tab Tổng quan so chỉ tiêu với thực tế
      const plans: Array<{ planId: string; storeName: string; brandName: string; month: string; pic: string; targetQty: number; targetBudgetNet: number }> = [];
      for (const { plan } of storedPlans) {
        const target = computeSelfPlanTarget(plan);
        const rec = boardRecords.get(keyOf(plan.id));
        if (target.totalQty > 0 || rec?.data?.jobs?.length) {
          plans.push({
            planId: plan.id,
            storeName: plan.storeName || plan.title,
            brandName: plan.brandName,
            month: plan.month,
            pic: plan.pic || '',
            targetQty: target.totalQty,
            targetBudgetNet: target.totalBudgetNet,
          });
        }
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

      return NextResponse.json({ jobs: allJobs, plans, planCount: storedPlans.length });
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
        const nowIso = new Date().toISOString();

        for (const j of incoming.jobs) {
          if (!j.code) throw new RecordError('Mã công việc video không được để trống.', 400);
          if (codes.has(j.code)) throw new RecordError(`Mã công việc video ${j.code} bị trùng lặp.`, 400);
          codes.add(j.code);

          const old = prevJobs.get(j.id);

          // Kết quả kiểm link / đối chiếu nội dung chỉ máy chủ ghi: đặt lại trước khi kiểm điều kiện nghiệm thu
          j.airCheck = old?.airCheck;
          j.contentCheck = old?.contentCheck;

          // Xác nhận nhận việc là của CTV: PIC không tự đặt. Đổi CTV hoặc giao mới thì chờ xác nhận lại.
          const sameCtv = Boolean(old && old.contributorId === j.contributorId);
          if (j.productionMode !== 'CTV_OUTSOURCE' || !j.contributorId) {
            j.ctvConfirmStatus = undefined;
            j.ctvConfirmedAt = undefined;
            j.ctvDeclineReason = undefined;
          } else if (sameCtv && old) {
            j.ctvConfirmStatus = old.ctvConfirmStatus;
            j.ctvConfirmedAt = old.ctvConfirmedAt;
            j.ctvDeclineReason = old.ctvDeclineReason;
          } else {
            j.ctvConfirmStatus = 'ASSIGNED';
            j.ctvConfirmedAt = undefined;
            j.ctvDeclineReason = undefined;
          }

          // Brand duyệt kịch bản: đúng thứ tự, mốc thời gian do máy chủ ghi (tính SLA 72h, không tự duyệt)
          const brandBlocker = selfBrandScriptBlocker(old, j);
          if (brandBlocker) throw new RecordError(`Job ${j.code}: ${brandBlocker}`, 400);
          if (j.brandScriptStatus !== (old?.brandScriptStatus ?? 'NOT_SENT')) {
            if (j.brandScriptStatus === 'PENDING') j.brandScriptSentAt = nowIso;
            if (j.brandScriptStatus === 'APPROVED' || j.brandScriptStatus === 'REVISION') j.brandScriptDecidedAt = nowIso;
          }

          // Chỉ quay / nộp video nháp khi kịch bản đã được Brand duyệt
          if (j.videoQaStatus !== 'WAITING_DRAFT' && (old?.videoQaStatus ?? 'WAITING_DRAFT') === 'WAITING_DRAFT' && !isSelfScriptReady(j)) {
            throw new RecordError(`Job ${j.code}: kịch bản chưa được Brand duyệt, chưa nộp video nháp được.`, 400);
          }

          // Ràng buộc nghiệm thu Đạt
          if (j.acceptanceStatus === 'PASSED' && old?.acceptanceStatus !== 'PASSED') {
            const blocker = selfJobAcceptanceBlocker(j);
            if (blocker) throw new RecordError(`Không thể nghiệm thu job ${j.code}: ${blocker}`, 400);
          }

          // Thanh toán do tab Quyết toán ghi (BBNT tháng, ĐNTT Lark, Kế toán xác nhận chi): giữ nguyên giá trị trên máy chủ
          const locked = old?.paymentStatus === 'REQUESTED' || old?.paymentStatus === 'PAID';
          const serverPaymentStatus = old?.paymentStatus === 'REQUESTED' || old?.paymentStatus === 'PAID' ? old.paymentStatus : null;
          if (serverPaymentStatus || j.paymentStatus === 'REQUESTED' || j.paymentStatus === 'PAID') {
            j.paymentStatus = serverPaymentStatus || (j.feeGross > 0 || j.productionMode === 'CTV_OUTSOURCE' ? 'NONE' : 'NOT_APPLICABLE');
          }
          // Kết quả kiểm link đăng chỉ máy chủ ghi (đổi link thì kết quả cũ tự hết hiệu lực vì không khớp link)
          j.dnttSlipCode = old?.dnttSlipCode;
          j.requestedAt = old?.requestedAt;
          j.requestedBy = old?.requestedBy;
          j.paidAt = old?.paidAt;
          j.uncRef = old?.uncRef;
          if (locked && old) {
            Object.assign(j, {
              feeGross: old.feeGross,
              withholdPit10: old.withholdPit10,
              pitTaxAmount: old.pitTaxAmount,
              netPayout: old.netPayout,
              contributorId: old.contributorId,
              contributorName: old.contributorName,
              bbntCode: old.bbntCode,
              acceptanceStatus: old.acceptanceStatus,
            });
          }
        }

        // Việc đã lập ĐNTT / đã chi không bị xóa khỏi bảng
        const keptIds = new Set(incoming.jobs.map(j => j.id));
        for (const old of prevJobs.values()) {
          if (!keptIds.has(old.id) && (old.paymentStatus === 'REQUESTED' || old.paymentStatus === 'PAID')) {
            throw new RecordError(`Việc ${old.code} đã lập ĐNTT (${old.dnttSlipCode || ''}), không xóa được. Hủy đợt ở tab Quyết toán trước.`, 409);
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
