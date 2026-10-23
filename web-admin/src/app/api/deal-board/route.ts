import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import { assertPlanIdAccess } from '@/lib/server/monthlyPlanStore';
import { EMPTY_DEAL_BOARD, FRAMEWORK_STATE_LABEL, frameworkState, normHandle, paymentBlocker, sanitizeDealBoard, type DealBoardData, type FrameworkContract } from '@/lib/dealBoardRules';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const keyOf = (planId: string) => `deal-board-${planId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}`;

// GET /api/deal-board?planId=... — các deal của một kế hoạch tháng
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
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

// PUT /api/deal-board — lưu toàn bộ deal (chống ghi đè bằng revision, kiểm các điều kiện bắt buộc ở máy chủ)
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
      const frameworks = await readRecord<{ items: FrameworkContract[] }>('koc-framework-contracts', { items: [] });
      const fwById = new Map((frameworks.data.items || []).map(i => [i.id, i]));
      const codes = new Set<string>();
      const deals = incoming.deals.map(d => {
        const old = before.get(d.id);
        if (!d.code || codes.has(d.code)) throw new RecordError(`Mã deal ${d.code || '(trống)'} trống hoặc bị trùng.`, 400);
        codes.add(d.code);
        // Deal mới: KOC phải có hợp đồng nguyên tắc hợp lệ
        if (!old) {
          const st = frameworkState(fwById.get(normHandle(d.kocHandle)));
          if (st !== 'VALID') throw new RecordError(`Không tạo được deal ${d.code}: ${FRAMEWORK_STATE_LABEL[st]} (@${normHandle(d.kocHandle)}).`, 400);
        }
        // Đề nghị hoặc ghi nhận thanh toán: phải qua nghiệm thu
        const payChanged = d.payment.status !== (old?.payment.status ?? 'NONE');
        if (payChanged && d.payment.status !== 'NONE') {
          const reason = paymentBlocker({ ...d, acceptance: { ...d.acceptance, confirmedBy: d.acceptance.confirmedBy } });
          if (reason) throw new RecordError(`Deal ${d.code} chưa thanh toán được: ${reason}`, 400);
        }
        // Người xác nhận nghiệm thu do máy chủ ghi, không nhận từ máy khách
        const confirmChanged = d.acceptance.confirmedBy !== (old?.acceptance.confirmedBy ?? '');
        if (confirmChanged) {
          return d.acceptance.confirmedBy
            ? { ...d, acceptance: { ...d.acceptance, confirmedBy: actor.name, confirmedAt: new Date().toISOString() } }
            : { ...d, acceptance: { ...d.acceptance, confirmedBy: '', confirmedAt: '', confirmNote: '' } };
        }
        return old ? { ...d, acceptance: { ...d.acceptance, confirmedBy: old.acceptance.confirmedBy, confirmedAt: old.acceptance.confirmedAt } } : d;
      });
      return { deals };
    });
    return NextResponse.json({ data: saved.data, revision: saved.revision });
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message, code: err.status === 409 ? 'CONFLICT' : undefined }, { status: err.status });
    return handlePlanError(err);
  }
}
