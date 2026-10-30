import { NextRequest, NextResponse } from 'next/server';
import { readRecordsBatch, RecordError } from '@/lib/server/sharedRecords';
import { selfChannelBoardKey } from '@/lib/server/boardKeys';
import { listMonthlyPlans } from '@/lib/server/monthlyPlanStore';
import { fetchDwVideoMetrics } from '@/lib/server/dataWarehouseClient';
import { EMPTY_SELF_CHANNEL_BOARD, sanitizeSelfChannelBoard, type SelfChannelBoardData } from '@/lib/selfChannelBoardRules';
import { extractVideoId, type SelfAirReportResponse, type SelfAirReportRow } from '@/lib/selfChannelAirReport';
import { getPlanActor, handlePlanError, unauthorized } from '../../monthly-plans/_shared';

export const dynamic = 'force-dynamic';

// GET /api/self-channel-board/air-report?month=YYYY/MM — video đã đăng trong tháng (mọi gian người dùng được xem) kèm số liệu từ Data Warehouse
export async function GET(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  try {
    const stored = await listMonthlyPlans(actor);
    const months = Array.from(new Set(stored.map(s => s.plan.month).filter(Boolean))).sort().reverse();
    const month = request.nextUrl.searchParams.get('month') || months[0] || '';
    const plans = stored.filter(s => s.plan.month === month);
    const recs = await readRecordsBatch<SelfChannelBoardData>(plans.map(({ plan }) => selfChannelBoardKey(plan.id)), EMPTY_SELF_CHANNEL_BOARD, { clone: false });

    const rows: SelfAirReportRow[] = [];
    for (const { plan } of plans) {
      const data = recs.get(selfChannelBoardKey(plan.id))?.data;
      if (!data?.jobs?.length) continue;
      for (const j of sanitizeSelfChannelBoard(data).jobs) {
        if (j.lifecycleStatus === 'CANCELLED' || !j.airLink.trim()) continue;
        rows.push({
          planId: plan.id,
          storeName: plan.storeName || plan.title,
          brandName: plan.brandName,
          month: plan.month,
          code: j.code,
          pillar: j.pillar,
          angle: j.angle,
          formatKey: j.formatKey,
          platform: j.publishPlatform,
          contributorName: j.contributorName,
          productName: j.productName,
          airedAt: j.airedAt,
          airLink: j.airLink,
          videoId: extractVideoId(j.airLink),
          viewsFromLink: typeof j.views === 'number' ? j.views : null,
          acceptanceStatus: j.acceptanceStatus,
          dw: null,
        });
      }
    }

    const dw = await fetchDwVideoMetrics(rows.map(r => r.videoId || ''));
    let matched = 0;
    for (const r of rows) {
      const m = r.videoId ? dw.rows.get(r.videoId) : undefined;
      if (m) {
        r.dw = m;
        matched += 1;
      }
    }
    rows.sort((a, b) => (b.airedAt || '').localeCompare(a.airedAt || ''));
    const body: SelfAirReportResponse = { month, months, rows, dw: { configured: dw.configured, ok: dw.ok, error: dw.error, matched } };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
    return handlePlanError(err);
  }
}
