import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { dealBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { planJobToBookingDeal } from '@/lib/planDealLink';
import type { BookingDealItem } from '@/lib/types';
import {
  EMPTY_DEAL_BOARD,
  jobPaymentBlocker,
  jobStageOf,
  jobTotalFee,
  newDealId,
  newJobId,
  normHandle,
  sanitizeDealBoard,
  syncDealSummaryFields,
  type DealBoardData,
  type DealJob,
  type FrameworkContract,
  type PlanDeal,
} from '@/lib/dealBoardRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const keyOf = dealBoardKey;

// GET /api/deal-board?planId=... — các deal & job của một kế hoạch tháng
// GET /api/deal-board?all=1 — tổng hợp toàn bộ Deal/Job từ mọi kế hoạch sang định dạng BookingDealItem[] để đồng bộ sang Hồ sơ KOC & Dashboard
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const fetchAll = request.nextUrl.searchParams.get('all') === '1';
  if (fetchAll) {
    try {
      const [storedPlans, frameworks] = await Promise.all([
        listMonthlyPlans(actor),
        readRecord<{ items: FrameworkContract[] }>('koc-framework-contracts', { items: [] }),
      ]);
      const fwById = new Map<string, FrameworkContract>();
      for (const item of frameworks.data.items || []) {
        fwById.set(normHandle(item.id), item);
        for (const ch of item.coveredHandles || []) {
          const normCh = normHandle(ch);
          if (normCh && !fwById.has(normCh)) fwById.set(normCh, item);
        }
      }
      const bookingDeals: BookingDealItem[] = [];
      await Promise.all(
        storedPlans.map(async ({ plan }) => {
          try {
            const rec = await readRecord<DealBoardData>(keyOf(plan.id), EMPTY_DEAL_BOARD);
            const board = sanitizeDealBoard(rec.data);
            for (const deal of board.deals) {
              const fw = fwById.get(normHandle(deal.kocHandle));
              for (const job of deal.jobs || []) {
                if (job.sourcePlanId) continue;
                bookingDeals.push(planJobToBookingDeal(deal, job, plan, undefined, fw?.contractNo));
              }
            }
          } catch {
            // Bỏ qua plan không có dữ liệu deal-board
          }
        })
      );
      return NextResponse.json({ bookingDeals, planCount: storedPlans.length });
    } catch (err) {
      if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
      return handlePlanError(err);
    }
  }

  // GET /api/deal-board?rolloverCandidatesForPlanId=... — lấy danh sách các Job còn treo / chờ dời từ tháng trước của cùng gian hàng
  const rolloverTargetId = request.nextUrl.searchParams.get('rolloverCandidatesForPlanId') || '';
  if (rolloverTargetId) {
    try {
      const targetPlan = await assertPlanIdAccess(rolloverTargetId, actor, 'read');
      const allPlans = await listMonthlyPlans(actor);
      const normStore = (s?: string) => (s || '').trim().toLowerCase();
      const prevPlans = allPlans
        .map(x => x.plan)
        .filter(
          p =>
            p.id !== targetPlan.id &&
            p.month < targetPlan.month &&
            ((targetPlan.storeId && p.storeId === targetPlan.storeId) ||
              (targetPlan.storeName && normStore(p.storeName) === normStore(targetPlan.storeName)))
        )
        .sort((a, b) => (a.month < b.month ? 1 : -1));

      const targetRec = await readRecord<DealBoardData>(keyOf(targetPlan.id), EMPTY_DEAL_BOARD);
      const targetBoard = sanitizeDealBoard(targetRec.data);
      const alreadyPulledCodes = new Set<string>();
      for (const d of targetBoard.deals) {
        for (const j of d.jobs || []) {
          if (j.code) alreadyPulledCodes.add(j.code);
          if (j.dependsOnJobCode) alreadyPulledCodes.add(j.dependsOnJobCode);
        }
      }

      const candidates: Array<{
        sourcePlanId: string;
        sourceMonth: string;
        dealId: string;
        dealCode: string;
        kocHandle: string;
        kocName: string;
        grade: string;
        jobId: string;
        jobCode: string;
        title: string;
        productName: string;
        week: string;
        deadline: string;
        videoFee: number;
        totalFee: number;
        sampleStatus: string;
        scriptStatus: string;
        stage: string;
        lifecycleStatus: string;
        appendixNo: string;
        larkSlipCode: string;
        paymentStatus: string;
        acceptanceStatus: string;
        isAired: boolean;
        reasonLabel: string;
      }> = [];

      for (const prevPlan of prevPlans) {
        const rec = await readRecord<DealBoardData>(keyOf(prevPlan.id), EMPTY_DEAL_BOARD);
        const board = sanitizeDealBoard(rec.data);
        for (const d of board.deals) {
          for (const j of d.jobs || []) {
            if (j.sourcePlanId) continue;
            if (alreadyPulledCodes.has(j.code)) continue;
            if (j.lifecycleStatus === 'CANCELLED' || j.lifecycleStatus === 'REPLACED' || j.lifecycleStatus === 'REPLACED_KOC') {
              continue;
            }
            const isExplicitRollover =
              j.lifecycleStatus === 'ROLLED_OVER_NEXT_MONTH' || j.lifecycleStatus === 'ROLLED_OVER';
            const hasAir = Boolean(j.airLink.trim() || j.airedAt);
            const fee = jobTotalFee(j);
            const isFullyDone =
              hasAir &&
              j.acceptance.status === 'PASSED' &&
              (fee === 0 || j.payment.status === 'PAID');
            if (!isExplicitRollover && isFullyDone) continue;
            candidates.push({
              sourcePlanId: prevPlan.id,
              sourceMonth: prevPlan.month,
              dealId: d.id,
              dealCode: d.code,
              kocHandle: d.kocHandle,
              kocName: d.kocName || d.kocHandle,
              grade: d.grade,
              jobId: j.id,
              jobCode: j.code,
              title: j.title,
              productName: j.productName || j.productGroupName || d.productName || '',
              week: j.week,
              deadline: j.deadline,
              videoFee: j.videoFee,
              totalFee: fee,
              sampleStatus: j.sample.status,
              scriptStatus: j.script.status,
              stage: jobStageOf(j),
              lifecycleStatus: j.lifecycleStatus || 'ACTIVE',
              appendixNo: j.appendixNo || d.appendixNo || '',
              larkSlipCode: j.payment.larkSlipCode || j.advancePayment?.larkSlipCode || '',
              paymentStatus: j.payment.status,
              acceptanceStatus: j.acceptance.status,
              isAired: hasAir,
              reasonLabel: !hasAir
                ? 'Chưa có Link Air'
                : j.acceptance.status !== 'PASSED'
                ? 'Đã Air · Chờ nghiệm thu'
                : 'Đã nghiệm thu · Chờ thanh toán 6.1',
            });
          }
        }
      }

      return NextResponse.json({
        targetPlanId: targetPlan.id,
        targetMonth: targetPlan.month,
        storeName: targetPlan.storeName || targetPlan.title,
        candidates,
      });
    } catch (err) {
      if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
      return handlePlanError(err);
    }
  }
  const planId = request.nextUrl.searchParams.get('planId') || '';
  if (!planId) return NextResponse.json({ error: 'Thiếu mã kế hoạch.' }, { status: 400 });
  try {
    await assertPlanIdAccess(planId, actor, 'read');
    const rec = await readRecord<DealBoardData>(keyOf(planId), EMPTY_DEAL_BOARD);
    return NextResponse.json({ data: sanitizeDealBoard(rec.data), revision: rec.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}

// PUT /api/deal-board — lưu toàn bộ deal & job (chống ghi đè bằng revision, kiểm các điều kiện bắt buộc ở máy chủ)
export async function PUT(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as { planId?: string; revision?: number; data?: Partial<DealBoardData> };
    if (!body.planId || !body.data || typeof body.revision !== 'number') {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 });
    }
    await assertPlanIdAccess(body.planId, actor, 'write');
    const incoming = sanitizeDealBoard(body.data);
    const saved = await updateRecord<DealBoardData>(keyOf(body.planId), EMPTY_DEAL_BOARD, body.revision, async previous => {
      const before = new Map(sanitizeDealBoard(previous).deals.map(d => [d.id, d]));
      const codes = new Set<string>();
      const deals = incoming.deals.map(d => {
        const old = before.get(d.id);
        if (!d.code || codes.has(d.code)) throw new RecordError(`Mã deal ${d.code || '(trống)'} trống hoặc bị trùng.`, 400);
        codes.add(d.code);
        const oldJobMap = new Map((old?.jobs || []).map(j => [j.id, j]));
        const jobCodes = new Set<string>();
        const jobs = (d.jobs || []).map(j => {
          const oldJob = oldJobMap.get(j.id);
          if (!j.code || jobCodes.has(j.code)) throw new RecordError(`Mã job ${j.code || '(trống)'} trong deal ${d.code} trống hoặc bị trùng.`, 400);
          jobCodes.add(j.code);

          // D5: Khóa sửa phí / phụ lục khi Job đã lập đề nghị thanh toán hoặc đã thanh toán
          if (oldJob && oldJob.payment.status !== 'NONE') {
            if (
              j.videoFee !== oldJob.videoFee ||
              jobTotalFee(j) !== jobTotalFee(oldJob) ||
              (oldJob.appendixNo.trim() && j.appendixNo.trim() !== oldJob.appendixNo.trim())
            ) {
              throw new RecordError(
                `Job ${j.code} đã lập đề nghị thanh toán hoặc đã thanh toán, không được sửa đơn giá hoặc mã phụ lục.`,
                400
              );
            }
          }

          // S6: Kiểm soát vai trò trên máy chủ đối với các trạng thái phê duyệt nhạy cảm
          if (j.legalReviewStatus === 'APPROVED' && oldJob?.legalReviewStatus !== 'APPROVED') {
            if (!['LEGAL', 'ADMIN', 'DIRECTOR', 'LEADER'].includes(actor.role)) {
              throw new RecordError('Chỉ Pháp chế hoặc Quản lý mới có quyền duyệt thẩm định Pháp chế.', 403);
            }
          }
          if (j.financeReviewStatus === 'APPROVED' && oldJob?.financeReviewStatus !== 'APPROVED') {
            if (!['FINANCE', 'ADMIN', 'DIRECTOR', 'LEADER'].includes(actor.role) && !actor.permissions?.includes('canApprovePayment')) {
              throw new RecordError('Chỉ Kế toán hoặc Quản lý mới có quyền duyệt thẩm định Tài chính.', 403);
            }
          }
          if (j.payment.status === 'PAID' && oldJob?.payment.status !== 'PAID') {
            if (!['FINANCE', 'ADMIN', 'DIRECTOR', 'LEADER'].includes(actor.role) && !actor.permissions?.includes('canApprovePayment')) {
              throw new RecordError('Chỉ Kế toán hoặc cấp Phê duyệt mới có quyền xác nhận Đã thanh toán (PAID).', 403);
            }
          }
          const wasLeadConfirmed = Boolean(
            oldJob?.lateSigningExplanation?.leadConfirmed ||
              oldJob?.lateSigningExplanation?.confirmedByLead?.trim() ||
              oldJob?.lateSigningExplanation?.leadConfirmedBy?.trim()
          );
          const isLeadConfirmed = Boolean(
            j.lateSigningExplanation?.leadConfirmed ||
              j.lateSigningExplanation?.confirmedByLead?.trim() ||
              j.lateSigningExplanation?.leadConfirmedBy?.trim()
          );
          if (isLeadConfirmed && !wasLeadConfirmed) {
            if (!['LEADER', 'ADMIN', 'DIRECTOR'].includes(actor.role)) {
              throw new RecordError('Chỉ Trưởng nhóm (Leader) hoặc Quản lý mới có quyền xác nhận Giải trình ký muộn.', 403);
            }
          }

          // Đề nghị hoặc ghi nhận thanh toán theo Job: phải qua nghiệm thu của Job đó và có HĐNT/Phụ lục nếu có phí (D1)
          const payChanged = j.payment.status !== (oldJob?.payment.status ?? 'NONE');
          if (payChanged && j.payment.status !== 'NONE') {
            if (jobTotalFee(j) > 0 && !d.appendixNo.trim() && !j.appendixNo.trim()) {
              throw new RecordError(`Job ${j.code} có phí nhưng chưa có số Hợp đồng nguyên tắc (HĐNT) / Phụ lục SOW.`, 400);
            }
            const reason = jobPaymentBlocker(j);
            if (reason) throw new RecordError(`Job ${j.code} chưa thanh toán được: ${reason}`, 400);
          }

          // Nếu đổi link air thì xóa xác nhận nghiệm thu cũ để bắt buộc nghiệm thu lại
          const airLinkChanged = Boolean(oldJob && j.airLink.trim() !== oldJob.airLink.trim());
          if (airLinkChanged) {
            return {
              ...j,
              acceptance: {
                ...j.acceptance,
                status: j.airLink.trim() ? j.acceptance.status : 'PENDING',
                confirmedBy: '',
                confirmedAt: '',
                confirmNote: '',
              },
            };
          }

          // Người xác nhận nghiệm thu Job do máy chủ ghi
          const confirmChanged = j.acceptance.confirmedBy !== (oldJob?.acceptance.confirmedBy ?? '');
          if (confirmChanged) {
            return j.acceptance.confirmedBy
              ? { ...j, acceptance: { ...j.acceptance, confirmedBy: actor.name, confirmedAt: new Date().toISOString() } }
              : { ...j, acceptance: { ...j.acceptance, confirmedBy: '', confirmedAt: '', confirmNote: '' } };
          }
          return oldJob ? { ...j, acceptance: { ...j.acceptance, confirmedBy: oldJob.acceptance.confirmedBy, confirmedAt: oldJob.acceptance.confirmedAt } } : j;
        });
        return syncDealSummaryFields({ ...d, jobs });
      });
      return { deals, closingState: incoming.closingState ?? previous.closingState };
    });

    // Đồng bộ ngược tiến độ vận hành (Link Air, Nghiệm thu, Phụ lục, Thanh toán) về kế hoạch tháng gốc đối với các Job cũ kéo sang xử lý tiếp
    const syncBackBySourcePlan = new Map<string, Map<string, DealJob>>();
    for (const d of saved.data.deals) {
      for (const j of d.jobs || []) {
        if (!j.sourcePlanId) continue;
        const origCode = j.dependsOnJobCode || j.code;
        if (!origCode) continue;
        if (!syncBackBySourcePlan.has(j.sourcePlanId)) {
          syncBackBySourcePlan.set(j.sourcePlanId, new Map());
        }
        syncBackBySourcePlan.get(j.sourcePlanId)!.set(origCode, j);
      }
    }
    for (const [srcPlanId, jobByCode] of syncBackBySourcePlan.entries()) {
      try {
        const srcRec = await readRecord<DealBoardData>(keyOf(srcPlanId), EMPTY_DEAL_BOARD);
        await updateRecord<DealBoardData>(keyOf(srcPlanId), EMPTY_DEAL_BOARD, srcRec.revision, async prevSrc => {
          const srcBoard = sanitizeDealBoard(prevSrc);
          const nextDeals = srcBoard.deals.map(d => {
            let changed = false;
            const nextJobs = (d.jobs || []).map(origJob => {
              const updatedJob = jobByCode.get(origJob.code);
              if (!updatedJob) return origJob;
              changed = true;
              return {
                ...origJob,
                sample: updatedJob.sample,
                script: updatedJob.script,
                airLink: updatedJob.airLink,
                airedAt: updatedJob.airedAt,
                sparkAdsCode: updatedJob.sparkAdsCode,
                acceptance: updatedJob.acceptance,
                appendixNo: updatedJob.appendixNo || origJob.appendixNo,
                appendixDate: updatedJob.appendixDate || origJob.appendixDate,
                appendixUrl: updatedJob.appendixUrl || origJob.appendixUrl,
                invoiceCheck: updatedJob.invoiceCheck ?? origJob.invoiceCheck,
                advancePayment: updatedJob.advancePayment ?? origJob.advancePayment,
                payment: updatedJob.payment,
                performance: updatedJob.performance,
              };
            });
            return changed ? syncDealSummaryFields({ ...d, jobs: nextJobs }) : d;
          });
          return { ...srcBoard, deals: nextDeals };
        });
      } catch {
        // Không làm gián đoạn lưu bảng hiện tại nếu bảng tháng cũ đang khóa
      }
    }

    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}

// POST /api/deal-board — Kéo các Job còn treo / chờ dời từ kế hoạch tháng cũ sang kế hoạch tháng mới
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const body = (await request.json()) as {
      action?: string;
      targetPlanId?: string;
      targetWeek?: string;
      targetDeadline?: string;
      items?: Array<{ sourcePlanId: string; dealId: string; jobId: string }>;
    };
    if (body.action !== 'PULL_HANGING_JOBS' || !body.targetPlanId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Yêu cầu kéo Job không hợp lệ.' }, { status: 400 });
    }

    const targetPlan = await assertPlanIdAccess(body.targetPlanId, actor, 'write');
    const nowIso = new Date().toISOString();

    // Nhóm các job cần kéo theo sourcePlanId
    const bySourcePlan = new Map<string, Set<string>>();
    for (const it of body.items) {
      if (!it.sourcePlanId || !it.jobId) continue;
      if (!bySourcePlan.has(it.sourcePlanId)) bySourcePlan.set(it.sourcePlanId, new Set());
      bySourcePlan.get(it.sourcePlanId)!.add(it.jobId);
    }

    const pulledJobsInfo: Array<{
      sourcePlanId: string;
      sourceMonth: string;
      sourceDeal: PlanDeal;
      sourceJob: DealJob;
    }> = [];

    // 1. Đọc từ kế hoạch tháng cũ: GIỮ NGUYÊN lifecycleStatus = 'ACTIVE' ở tháng cũ để ngân sách vẫn tính ở tháng cũ, chỉ ghi chú đang xử lý tiếp ở tháng mới
    for (const [sourcePlanId, jobIdsSet] of bySourcePlan.entries()) {
      const sourcePlan = await assertPlanIdAccess(sourcePlanId, actor, 'write');
      const sourceRec = await readRecord<DealBoardData>(keyOf(sourcePlanId), EMPTY_DEAL_BOARD);
      await updateRecord<DealBoardData>(keyOf(sourcePlanId), EMPTY_DEAL_BOARD, sourceRec.revision, async prev => {
        const board = sanitizeDealBoard(prev);
        const nextDeals = board.deals.map(d => {
          let changed = false;
          const nextJobs = (d.jobs || []).map(j => {
            if (!jobIdsSet.has(j.id)) return j;
            changed = true;
            pulledJobsInfo.push({
              sourcePlanId: sourcePlan.id,
              sourceMonth: sourcePlan.month,
              sourceDeal: d,
              sourceJob: j,
            });
            return {
              ...j,
              lifecycleStatus: 'ACTIVE' as const,
              rolledOverToMonth: targetPlan.month,
              lifecycleNote: `Đang theo dõi & xử lý hoàn tất tại kỳ ${targetPlan.month} (${actor.name})`,
            };
          });
          if (!changed) return d;
          return syncDealSummaryFields({
            ...d,
            jobs: nextJobs,
            history: [
              ...(d.history || []),
              {
                at: nowIso,
                actor: actor.name,
                text: `Kéo Job sang kỳ ${targetPlan.month} để xử lý tiếp (ngân sách giữ tại ${sourcePlan.month})`,
              },
            ],
          });
        });
        return { ...board, deals: nextDeals };
      });
    }

    if (pulledJobsInfo.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy Job hợp lệ để kéo sang tháng mới.' }, { status: 404 });
    }

    // 2. Đưa các Job đã chọn vào deal-board của kế hoạch tháng mới (gắn sourcePlanId & sourcePlanMonth để không lẹm ngân sách tháng mới)
    const targetRec = await readRecord<DealBoardData>(keyOf(targetPlan.id), EMPTY_DEAL_BOARD);
    const pulledSummaryByTier: Record<string, { qty: number; budgetNet: number }> = {};

    const savedTarget = await updateRecord<DealBoardData>(keyOf(targetPlan.id), EMPTY_DEAL_BOARD, targetRec.revision, async prev => {
      const board = sanitizeDealBoard(prev);
      const deals = [...board.deals];
      const usedDealCodes = new Set(deals.map(d => d.code));
      const usedJobCodes = new Set<string>();
      for (const d of deals) {
        for (const j of d.jobs || []) usedJobCodes.add(j.code);
      }

      for (const { sourcePlanId, sourceMonth, sourceDeal, sourceJob } of pulledJobsInfo) {
        if (usedJobCodes.has(sourceJob.code)) continue;
        const newCode = sourceJob.code || `RO-${Date.now().toString(36).toUpperCase()}`;
        usedJobCodes.add(newCode);

        const clonedJob: DealJob = {
          ...sourceJob,
          id: newJobId(),
          code: newCode,
          week: body.targetWeek || sourceJob.week,
          deadline: body.targetDeadline || sourceJob.deadline,
          dependsOnJobCode: sourceJob.code,
          sourcePlanId,
          sourcePlanMonth: sourceMonth,
          lifecycleStatus: 'ACTIVE',
          rolledOverToMonth: undefined,
          lifecycleNote: `Job tồn kỳ ${sourceMonth} — Xử lý tiếp (Ngân sách thuộc ${sourceMonth})`,
        };

        const tierKey = /TAP|FOC/i.test(sourceDeal.grade) ? 'FOC' : sourceDeal.grade || 'KL1';
        if (!pulledSummaryByTier[tierKey]) pulledSummaryByTier[tierKey] = { qty: 0, budgetNet: 0 };
        pulledSummaryByTier[tierKey].qty += 1;
        pulledSummaryByTier[tierKey].budgetNet += jobTotalFee(clonedJob);

        let dealCode = sourceDeal.code;
        if (usedDealCodes.has(dealCode)) {
          let suffix = 2;
          while (usedDealCodes.has(`${sourceDeal.code}-R${suffix}`)) suffix++;
          dealCode = `${sourceDeal.code}-R${suffix}`;
        }
        usedDealCodes.add(dealCode);

        const newDeal: PlanDeal = syncDealSummaryFields({
          ...sourceDeal,
          id: newDealId(),
          code: dealCode,
          week: clonedJob.week,
          fee: jobTotalFee(clonedJob),
          jobs: [clonedJob],
          createdAt: nowIso,
          createdBy: actor.name,
          history: [
            ...(sourceDeal.history || []),
            {
              at: nowIso,
              actor: actor.name,
              text: `Nhận Job ${clonedJob.code} kéo từ kế hoạch tháng ${sourceMonth}`,
            },
          ],
        });
        deals.unshift(newDeal);
      }

      return { ...board, deals };
    });

    return NextResponse.json({
      pulledCount: pulledJobsInfo.length,
      pulledSummaryByTier,
      data: savedTarget.data,
      revision: savedTarget.revision,
    });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
