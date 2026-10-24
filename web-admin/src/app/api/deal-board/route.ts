import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { planJobToBookingDeal } from '@/lib/planDealLink';
import type { BookingDealItem } from '@/lib/types';
import {
  EMPTY_DEAL_BOARD,
  FRAMEWORK_STATE_LABEL,
  frameworkState,
  jobPaymentBlocker,
  normHandle,
  sanitizeDealBoard,
  syncDealSummaryFields,
  type DealBoardData,
  type FrameworkContract,
} from '@/lib/dealBoardRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const keyOf = (planId: string) => `deal-board-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

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
      const fwById = new Map((frameworks.data.items || []).map(i => [i.id, i]));
      const bookingDeals: BookingDealItem[] = [];
      await Promise.all(
        storedPlans.map(async ({ plan }) => {
          try {
            const rec = await readRecord<DealBoardData>(keyOf(plan.id), EMPTY_DEAL_BOARD);
            const board = sanitizeDealBoard(rec.data);
            for (const deal of board.deals) {
              const fw = fwById.get(normHandle(deal.kocHandle));
              for (const job of deal.jobs || []) {
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
          // Đề nghị hoặc ghi nhận thanh toán theo Job: phải qua nghiệm thu của Job đó
          const payChanged = j.payment.status !== (oldJob?.payment.status ?? 'NONE');
          if (payChanged && j.payment.status !== 'NONE') {
            const reason = jobPaymentBlocker(j);
            if (reason) throw new RecordError(`Job ${j.code} chưa thanh toán được: ${reason}`, 400);
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
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
