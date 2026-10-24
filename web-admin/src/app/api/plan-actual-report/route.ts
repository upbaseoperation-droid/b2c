import { NextRequest, NextResponse } from 'next/server';
import { readRecord } from '@/lib/server/sharedRecords';
import { listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { dealBoardKey, listingBoardKey } from '@/lib/server/boardKeys';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, type DealBoardData } from '@/lib/dealBoardRules';
import { buildPlanActualReport, type PlanActualStoreReport } from '@/lib/planActualReport';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const todayVn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

// GET /api/plan-actual-report?month=YYYY/MM — Kế hoạch vs Thực tế của các gian hàng trong phạm vi người xem.
// Không truyền month: trả danh sách tháng có kế hoạch, chọn tháng hiện tại nếu có, không thì tháng mới nhất.
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const stored = (await listMonthlyPlans(actor)).filter(({ plan }) => plan.status !== 'ARCHIVED');
    const months = [...new Set(stored.map(({ plan }) => plan.month).filter(Boolean))].sort().reverse();
    const today = todayVn();
    const currentMonth = today.slice(0, 7).replace('-', '/');
    const requested = request.nextUrl.searchParams.get('month') || '';
    const month = months.includes(requested) ? requested : months.includes(currentMonth) ? currentMonth : months[0] || '';

    const reports: PlanActualStoreReport[] = await Promise.all(
      stored
        .filter(({ plan }) => plan.month === month)
        .map(async ({ plan }) => {
          const [listing, board] = await Promise.all([
            readRecord<{ items: KocListingItem[] }>(listingBoardKey(plan.id), { items: [] }),
            readRecord<DealBoardData>(dealBoardKey(plan.id), EMPTY_DEAL_BOARD),
          ]);
          return buildPlanActualReport(plan, listing.data.items || [], sanitizeDealBoard(board.data), today);
        })
    );
    reports.sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));
    return NextResponse.json({ month, months, today, reports }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return handlePlanError(err);
  }
}
