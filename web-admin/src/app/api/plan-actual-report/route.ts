import { NextRequest, NextResponse } from 'next/server';
import { readRecordsBatch } from '@/lib/server/sharedRecords';
import { listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { dealBoardKey, listingBoardKey, selfChannelBoardKey } from '@/lib/server/boardKeys';
import { EMPTY_DEAL_BOARD, sanitizeDealBoard, type DealBoardData } from '@/lib/dealBoardRules';
import {
  EMPTY_SELF_CHANNEL_BOARD,
  sanitizeSelfChannelBoard,
  type SelfChannelBoardData,
} from '@/lib/selfChannelBoardRules';
import { buildPlanActualReport, type PlanActualStoreReport } from '@/lib/planActualReport';
import { getRealLarkListingsForBoardKey } from '@/lib/realLarkListings2026';
import {
  B2C_STORE_WEEKLY_AIR_SYNC_LIST,
  type StoreWeeklyAirSyncRecord,
} from '@/lib/b2cWeeklyAirSyncDataset';
import type { KocListingItem } from '@/lib/types';
import { getPlanActor, handlePlanError, unauthorized } from '../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

const todayVn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

const normStore = (v?: string) => (v || '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
const canonicalListingId = (id?: string) => (id || '').trim().replace(/^(LI-|LST-|SSR-)/i, '');

const AIR_SYNC_BY_STORE = new Map<string, StoreWeeklyAirSyncRecord>();
for (const rec of B2C_STORE_WEEKLY_AIR_SYNC_LIST) {
  if (rec.storeName) AIR_SYNC_BY_STORE.set(normStore(rec.storeName), rec);
  if (rec.storeId) AIR_SYNC_BY_STORE.set(normStore(rec.storeId), rec);
}

function resolveListingItems(
  boardKey: string,
  dbData?: { items?: KocListingItem[] } | null,
  planMeta?: { month?: string; storeName?: string; storeId?: string }
): KocListingItem[] {
  const larkItems = getRealLarkListingsForBoardKey(boardKey, planMeta);
  const dbItems = Array.isArray(dbData?.items) ? dbData!.items : [];
  if (dbItems.length > 0) {
    const byCanonical = new Map<string, KocListingItem>();
    for (const larkItem of larkItems) {
      if (larkItem?.id) byCanonical.set(canonicalListingId(larkItem.id), larkItem);
    }
    for (const item of dbItems) {
      if (item?.id) byCanonical.set(canonicalListingId(item.id), item);
    }
    return Array.from(byCanonical.values());
  }
  return larkItems;
}

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

    const monthPlans = stored.filter(({ plan }) => plan.month === month);
    const allBoardKeys: string[] = [];
    for (const { plan } of monthPlans) {
      allBoardKeys.push(
        listingBoardKey(plan.id),
        dealBoardKey(plan.id),
        selfChannelBoardKey(plan.id)
      );
    }
    const batchRecords = await readRecordsBatch<unknown>(allBoardKeys, null, { clone: false });

    const reports: PlanActualStoreReport[] = monthPlans.map(({ plan }) => {
      const lKey = listingBoardKey(plan.id);
      const listingData = (batchRecords.get(lKey)?.data as { items?: KocListingItem[] } | null) || null;
      const listingItems = resolveListingItems(lKey, listingData, {
        month: plan.month,
        storeName: plan.storeName || plan.title,
        storeId: plan.storeId,
      });
      const dealData = (batchRecords.get(dealBoardKey(plan.id))?.data as DealBoardData | null) || EMPTY_DEAL_BOARD;
      const selfData = (batchRecords.get(selfChannelBoardKey(plan.id))?.data as SelfChannelBoardData | null) || EMPTY_SELF_CHANNEL_BOARD;
      const airSyncRecord =
        plan.month === '2026/10'
          ? AIR_SYNC_BY_STORE.get(normStore(plan.storeName || plan.title)) ||
            AIR_SYNC_BY_STORE.get(normStore(plan.storeId))
          : undefined;

      return buildPlanActualReport(
        plan,
        listingItems,
        sanitizeDealBoard(dealData),
        today,
        sanitizeSelfChannelBoard(selfData),
        airSyncRecord
      );
    });
    reports.sort((a, b) => a.storeName.localeCompare(b.storeName, 'vi'));
    return NextResponse.json({ month, months, today, reports }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return handlePlanError(err);
  }
}
