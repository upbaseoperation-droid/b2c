import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { dealBoardKey } from '@/lib/server/boardKeys';
import { assertPlanIdAccess, listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { planJobToBookingDeal } from '@/lib/planDealLink';
import type { BookingDealItem } from '@/lib/types';
import {
  EMPTY_DEAL_BOARD,
  jobPaymentBlocker,
  jobTotalFee,
  normHandle,
  sanitizeDealBoard,
  syncDealSummaryFields,
  type DealBoardData,
  type FrameworkContract,
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
            if (!['LEADER', 'ADMIN', 'DIRECTOR', 'GROWTH_MANAGER', 'MEDIA_MANAGER'].includes(actor.role)) {
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
    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
