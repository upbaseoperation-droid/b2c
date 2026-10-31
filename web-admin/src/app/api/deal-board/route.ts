import { NextRequest, NextResponse } from 'next/server';
import { readRecord, readRecordsBatch, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { dealBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { planJobToBookingDeal } from '@/lib/planDealLink';
import { maskSensitivePii } from '@/lib/format';
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
import { assertCanViewBooking, resolvePlanContext } from '@/lib/server/monthlyPlanStore';
import { DealGuardError, guardDealBoardSave } from '@/lib/dealBoardGuard';
import { isPersonInField } from '@/lib/staffIdentity';
import { transferDealOwner } from '@/lib/server/dealOwnerTransfer';
import { storeCoBookings, storeLeader, storeMainBooking } from '@/lib/storePositions';

export const dynamic = 'force-dynamic';

const keyOf = dealBoardKey;

// GET /api/deal-board?planId=... — các deal & job của một kế hoạch tháng
// GET /api/deal-board?all=1 — tổng hợp toàn bộ Deal/Job từ mọi kế hoạch sang định dạng BookingDealItem[] để đồng bộ sang Hồ sơ KOC & Dashboard
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const canViewFullPii =
    (['FINANCE', 'LEGAL', 'ADMIN', 'MANAGER'].includes(String(actor.role || '')) ||
      Boolean(actor.permissions?.includes('ALL_PERMISSIONS')) ||
      Boolean(actor.permissions?.includes('canApprovePayment'))) &&
    !String(actor.role || '').includes('_PARTNER') &&
    !actor.partnerType;
  const fetchAll = request.nextUrl.searchParams.get('all') === '1';
  if (fetchAll) {
    try {
      const [storedPlans, frameworks] = await Promise.all([
        listMonthlyPlans(actor),
        readRecord<{ items: FrameworkContract[] }>('koc-framework-contracts', { items: [] }, { clone: false }),
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
      const boardRecords = await readRecordsBatch<DealBoardData>(
        storedPlans.map(({ plan }) => keyOf(plan.id)),
        EMPTY_DEAL_BOARD,
        { clone: false }
      );
      for (const { plan } of storedPlans) {
        const rec = boardRecords.get(keyOf(plan.id));
        if (!rec || !rec.data?.deals?.length) continue;
        const board = sanitizeDealBoard(rec.data);
        for (const deal of board.deals) {
          const fw = fwById.get(normHandle(deal.kocHandle));
          for (const job of deal.jobs || []) {
            if (job.sourcePlanId) continue;
            const bd = planJobToBookingDeal(deal, job, plan, undefined, fw?.contractNo);
            if (!canViewFullPii) {
              if (bd.kocIdCardNumber) bd.kocIdCardNumber = maskSensitivePii(bd.kocIdCardNumber);
              if (bd.kocBankAccount) bd.kocBankAccount = maskSensitivePii(bd.kocBankAccount);
              if (bd.legalProfileSnapshot) {
                bd.legalProfileSnapshot = {
                  ...bd.legalProfileSnapshot,
                  cccd: bd.legalProfileSnapshot.cccd ? maskSensitivePii(bd.legalProfileSnapshot.cccd) : undefined,
                  taxCode: bd.legalProfileSnapshot.taxCode ? maskSensitivePii(bd.legalProfileSnapshot.taxCode) : undefined,
                  bankAccountNumber: bd.legalProfileSnapshot.bankAccountNumber ? maskSensitivePii(bd.legalProfileSnapshot.bankAccountNumber) : undefined,
                };
              }
            }
            bookingDeals.push(bd);
          }
        }
      }
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

      const prevRecords = await readRecordsBatch<DealBoardData>(
        prevPlans.map(p => keyOf(p.id)),
        EMPTY_DEAL_BOARD,
        { clone: false }
      );
      for (const prevPlan of prevPlans) {
        const rec = prevRecords.get(keyOf(prevPlan.id)) || { revision: 0, data: EMPTY_DEAL_BOARD };
        const board = sanitizeDealBoard(rec.data);
        for (const d of board.deals) {
          for (const j of d.jobs || []) {
            if (j.sourcePlanId) continue;
            if (alreadyPulledCodes.has(j.code)) continue;
            if (j.lifecycleStatus === 'CANCELLED' || j.lifecycleStatus === 'REPLACED' || j.lifecycleStatus === 'REPLACED_KOC') {
              continue;
            }
            // Chỉ Job chưa lên sóng mới chuyển sang tháng sau; Job đã lên sóng ở lại tháng cũ để làm nốt
            const hasAir = Boolean(j.airLink.trim() || j.airedAt);
            const fee = jobTotalFee(j);
            if (hasAir || j.payment.status !== 'NONE') continue;
            if (j.lifecycleStatus && !['ACTIVE', 'ROLLED_OVER_NEXT_MONTH', 'ROLLED_OVER'].includes(j.lifecycleStatus)) continue;
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
              reasonLabel: j.advancePayment?.status === 'PAID' ? 'Chưa lên sóng · Đã tạm ứng (mang sang)' : 'Chưa lên sóng',
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
  // GET /api/deal-board?planId=...&view=access — vị trí của người dùng trên gian để giao diện khóa sẵn deal không phải của mình
  if (request.nextUrl.searchParams.get('view') === 'access') {
    try {
      const ctx = await resolvePlanContext(planId, actor);
      return NextResponse.json({
        global: ctx.global,
        positions: [...ctx.positions],
        isAccountPic: ctx.isAccountPic,
        storeCodes: ctx.store?.staffCodes || {},
        selfAirAllowed: Boolean(ctx.brand?.selfAirAllowed),
        me: { id: actor.id, name: actor.name, staffCode: actor.staffCode, role: actor.role },
        // Người đang thuộc nhóm Booking của gian (để cảnh báo deal "mồ côi")
        bookers: ctx.store ? [storeMainBooking(ctx.store), ...storeCoBookings(ctx.store), storeLeader(ctx.store), ctx.store.backupOwnerName || ''].filter(Boolean) : [],
      });
    } catch (err) {
      return handlePlanError(err);
    }
  }
  try {
    assertCanViewBooking(await resolvePlanContext(planId, actor));
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
    const ctx = await resolvePlanContext(body.planId, actor);
    assertCanViewBooking(ctx);
    const sanitized = sanitizeDealBoard(body.data);
    const saved = await updateRecord<DealBoardData>(keyOf(body.planId), EMPTY_DEAL_BOARD, body.revision, async previous => {
      const prevBoard = sanitizeDealBoard(previous);
      // Quyền theo người sở hữu deal, vai trò và trạng thái (khóa sổ, khóa link Air, kịch bản 2 vòng, tự Air)
      const incoming = guardDealBoardSave(prevBoard, sanitized, {
        actor,
        global: ctx.global,
        positions: ctx.positions,
        isAccountPic: ctx.isAccountPic,
        storeCodes: ctx.store?.staffCodes,
        planMonth: ctx.plan.month,
        selfAirAllowed: Boolean(ctx.brand?.selfAirAllowed),
      });
      const before = new Map(prevBoard.deals.map(d => [d.id, d]));
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

          // Đề nghị hoặc ghi nhận thanh toán theo Job: phải qua nghiệm thu của Job đó và có HĐNT/Phụ lục nếu có phí (D1)
          const payChanged = j.payment.status !== (oldJob?.payment.status ?? 'NONE');
          if (payChanged && j.payment.status !== 'NONE') {
            if (jobTotalFee(j) > 0 && !d.appendixNo.trim() && !j.appendixNo.trim()) {
              throw new RecordError(`Job ${j.code} có phí nhưng chưa có số Hợp đồng nguyên tắc (HĐNT) / Phụ lục SOW.`, 400);
            }
            const reason = jobPaymentBlocker(j);
            if (reason) throw new RecordError(`Job ${j.code} chưa thanh toán được: ${reason}`, 400);
          }

          // Nếu đổi link air thì xóa kết quả và xác nhận nghiệm thu cũ để bắt buộc nghiệm thu lại video mới
          const airLinkChanged = Boolean(oldJob && j.airLink.trim() !== oldJob.airLink.trim());
          if (airLinkChanged) {
            return {
              ...j,
              acceptance: {
                ...j.acceptance,
                status: 'PENDING' as const,
                checks: [],
                checkedAt: '',
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

    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof DealGuardError) return NextResponse.json({ error: err.message, code: 'FORBIDDEN_CHANGE' }, { status: err.status });
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}

// POST /api/deal-board — Chuyển Job chưa lên sóng của tháng cũ sang tháng mới (sao chép).
// Job tháng cũ: "Không hoàn thành (chuyển tháng sau)", không tính thực tế tháng cũ.
// Bản sao: Job bình thường của tháng mới (ngân sách, đề nghị thanh toán ở tháng mới), mang theo HĐ/SOW, mẫu, kịch bản, tạm ứng đã chi.
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
      /** TRANSFER_OWNER: bàn giao gian — chỉ chuyển deal / Job chưa đề nghị thanh toán của người bị thay */
      storeId?: string;
      storeName?: string;
      fromPic?: string;
      toPic?: string;
      fromMonth?: string;
    };
    if (body.action === 'TRANSFER_OWNER') {
      const fromPic = (body.fromPic || '').trim();
      const toPic = (body.toPic || '').trim();
      if (!fromPic || !toPic || fromPic.toLowerCase() === toPic.toLowerCase()) {
        return NextResponse.json({ error: 'Thiếu người bàn giao / người nhận.' }, { status: 400 });
      }
      const norm = (v?: string) => (v || '').trim().toLowerCase();
      const plans = (await listMonthlyPlans(actor))
        .map(p => p.plan)
        .filter(p => (body.storeId && p.storeId === body.storeId) || (body.storeName && norm(p.storeName) === norm(body.storeName)))
        .filter(p => !body.fromMonth || p.month >= body.fromMonth);
      let storeCodes: Record<string, string> | undefined;
      for (const p of plans) {
        const ctx = await resolvePlanContext(p.id, actor);
        if (!ctx.global && !ctx.positions.has('LEADER')) {
          return NextResponse.json({ error: 'Chỉ Giám đốc hoặc Leader của gian được bàn giao deal.' }, { status: 403 });
        }
        storeCodes = ctx.store?.staffCodes;
      }
      const transferred = await transferDealOwner({ planIds: plans.map(p => p.id), fromPic, toPic, actorName: actor.name, storeCodes });
      return NextResponse.json({ transferred, plans: plans.length });
    }
    if (body.action !== 'PULL_HANGING_JOBS' || !body.targetPlanId || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Yêu cầu kéo Job không hợp lệ.' }, { status: 400 });
    }

    const targetCtx = await resolvePlanContext(body.targetPlanId, actor);
    const targetPlan = targetCtx.plan;
    const ownerLevel = (c: typeof targetCtx) => c.global || c.positions.has('BOOKING_MAIN') || c.positions.has('LEADER');
    const executor = (c: typeof targetCtx) => c.positions.has('BOOKING_CO') || c.positions.has('BACKUP');
    if (!ownerLevel(targetCtx) && !executor(targetCtx)) {
      return NextResponse.json({ error: 'Chỉ nhóm Booking của gian được chuyển Job sang tháng này.' }, { status: 403 });
    }
    const nowIso = new Date().toISOString();

    const bySourcePlan = new Map<string, Set<string>>();
    for (const it of body.items) {
      if (!it.sourcePlanId || !it.jobId) continue;
      if (!bySourcePlan.has(it.sourcePlanId)) bySourcePlan.set(it.sourcePlanId, new Set());
      bySourcePlan.get(it.sourcePlanId)!.add(it.jobId);
    }

    const pulled: Array<{ sourcePlanId: string; sourceMonth: string; sourceDeal: PlanDeal; sourceJob: DealJob }> = [];

    // 1. Tháng cũ: kiểm từng Job (chưa lên sóng, chưa đề nghị thanh toán, người kéo có quyền với Job) rồi đánh dấu chuyển tháng
    for (const [sourcePlanId, jobIdsSet] of bySourcePlan.entries()) {
      const srcCtx = await resolvePlanContext(sourcePlanId, actor);
      const sourcePlan = srcCtx.plan;
      if (sourcePlan.month >= targetPlan.month) {
        return NextResponse.json({ error: 'Chỉ chuyển Job từ tháng trước sang tháng sau.' }, { status: 400 });
      }
      const sourceRec = await readRecord<DealBoardData>(keyOf(sourcePlanId), EMPTY_DEAL_BOARD);
      await updateRecord<DealBoardData>(keyOf(sourcePlanId), EMPTY_DEAL_BOARD, sourceRec.revision, async prev => {
        const board = sanitizeDealBoard(prev);
        const nextDeals = board.deals.map(d => {
          let changed = false;
          const nextJobs = (d.jobs || []).map(j => {
            if (!jobIdsSet.has(j.id)) return j;
            if (j.airLink.trim() || j.airedAt) throw new RecordError(`Job ${j.code} đã lên sóng, làm nốt ở tháng ${sourcePlan.month}.`, 400);
            if (j.payment.status !== 'NONE') throw new RecordError(`Job ${j.code} đã có đề nghị thanh toán, không chuyển tháng được.`, 400);
            if (j.lifecycleStatus === 'ROLLED_OVER_NEXT_MONTH' && j.rolledOverToMonth) {
              throw new RecordError(`Job ${j.code} đã chuyển sang tháng ${j.rolledOverToMonth}.`, 409);
            }
            const mine = isPersonInField(actor, j.pic, srcCtx.store?.staffCodes) || isPersonInField(actor, d.pic, srcCtx.store?.staffCodes);
            if (!ownerLevel(srcCtx) && !(executor(srcCtx) && mine)) {
              throw new RecordError(`Job ${j.code} do ${j.pic || d.pic || 'người khác'} phụ trách, bạn không chuyển được.`, 403);
            }
            changed = true;
            pulled.push({ sourcePlanId: sourcePlan.id, sourceMonth: sourcePlan.month, sourceDeal: d, sourceJob: j });
            return {
              ...j,
              lifecycleStatus: 'ROLLED_OVER_NEXT_MONTH' as const,
              rolledOverToMonth: targetPlan.month,
              lifecycleNote: `Không hoàn thành trong tháng ${sourcePlan.month} — chuyển sang ${targetPlan.month} (${actor.name})`,
            };
          });
          if (!changed) return d;
          return syncDealSummaryFields({
            ...d,
            jobs: nextJobs,
            history: [...(d.history || []), { at: nowIso, actor: actor.name, text: `Chuyển Job chưa lên sóng sang tháng ${targetPlan.month}` }],
          });
        });
        return { ...board, deals: nextDeals };
      });
    }

    if (pulled.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy Job hợp lệ để chuyển sang tháng mới.' }, { status: 404 });
    }

    // 2. Tháng mới: thêm bản sao như Job bình thường (giữ người phụ trách cũ)
    const targetRec = await readRecord<DealBoardData>(keyOf(targetPlan.id), EMPTY_DEAL_BOARD);
    const pulledSummaryByTier: Record<string, { qty: number; budgetNet: number }> = {};
    const savedTarget = await updateRecord<DealBoardData>(keyOf(targetPlan.id), EMPTY_DEAL_BOARD, targetRec.revision, async prev => {
      const board = sanitizeDealBoard(prev);
      const deals = [...board.deals];
      const usedDealCodes = new Set(deals.map(d => d.code));
      const carried = new Set(deals.flatMap(d => (d.jobs || []).map(j => j.carriedFromJobCode).filter(Boolean)));
      for (const { sourcePlanId, sourceMonth, sourceDeal, sourceJob } of pulled) {
        if (carried.has(sourceJob.code)) continue;
        const clonedJob: DealJob = {
          ...sourceJob,
          id: newJobId(),
          week: body.targetWeek || sourceJob.week,
          deadline: body.targetDeadline || sourceJob.deadline,
          carriedFromPlanId: sourcePlanId,
          carriedFromMonth: sourceMonth,
          carriedFromJobCode: sourceJob.code,
          sourcePlanId: undefined,
          sourcePlanMonth: undefined,
          lifecycleStatus: 'ACTIVE',
          rolledOverToMonth: undefined,
          lifecycleNote: `Chuyển từ tháng ${sourceMonth} (chưa lên sóng)`,
        };
        const tierKey = /TAP|FOC/i.test(sourceDeal.grade) ? 'FOC' : sourceDeal.grade || 'KL1';
        pulledSummaryByTier[tierKey] ??= { qty: 0, budgetNet: 0 };
        pulledSummaryByTier[tierKey].qty += 1;
        pulledSummaryByTier[tierKey].budgetNet += jobTotalFee(clonedJob);

        let dealCode = sourceDeal.code;
        if (usedDealCodes.has(dealCode)) {
          let suffix = 2;
          while (usedDealCodes.has(`${sourceDeal.code}-R${suffix}`)) suffix++;
          dealCode = `${sourceDeal.code}-R${suffix}`;
        }
        usedDealCodes.add(dealCode);
        deals.unshift(
          syncDealSummaryFields({
            ...sourceDeal,
            id: newDealId(),
            code: dealCode,
            week: clonedJob.week,
            fee: jobTotalFee(clonedJob),
            jobs: [clonedJob],
            createdAt: nowIso,
            createdBy: actor.name,
            history: [...(sourceDeal.history || []), { at: nowIso, actor: actor.name, text: `Nhận Job ${sourceJob.code} chuyển từ tháng ${sourceMonth}` }],
          })
        );
      }
      return { ...board, deals };
    });

    // Cảnh báo (không chặn): ngân sách booking tháng mới sau khi nhận Job chuyển sang
    const pulledTotal = Object.values(pulledSummaryByTier).reduce((s, t) => s + t.budgetNet, 0);
    const committed = savedTarget.data.deals.reduce((s, d) => s + (d.jobs || []).filter(j => !j.lifecycleStatus || j.lifecycleStatus === 'ACTIVE').reduce((x, j) => x + jobTotalFee(j), 0), 0);
    const budget = Number(targetPlan.budgetAffiliate || targetPlan.totalTargetBudget || 0);
    const warnings = budget > 0 && committed > budget
      ? [`Ngân sách booking tháng ${targetPlan.month} đã cam kết ${committed.toLocaleString('vi-VN')}đ, vượt kế hoạch ${budget.toLocaleString('vi-VN')}đ (Job chuyển sang: ${pulledTotal.toLocaleString('vi-VN')}đ).`]
      : [];

    return NextResponse.json({
      pulledCount: pulled.length,
      pulledSummaryByTier,
      warnings,
      data: savedTarget.data,
      revision: savedTarget.revision,
    });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
