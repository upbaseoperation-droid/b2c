import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import {
  dailyRecordKey,
  mergeDailyRows,
  normalizeDailyRow,
  pullRangeForAirDate,
  type DailyVideoPerformanceRow,
} from '@/lib/upaffiliateDailyPerformance';
import { getPlanActor, unauthorized } from '../../../monthly-plans/_shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DailyRecord {
  rows: DailyVideoPerformanceRow[];
  lastPulledAt: string;
}
const EMPTY: DailyRecord = { rows: [], lastPulledAt: '' };

const todayVn = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/**
 * Gọi API daily của UpAffiliate. Hợp đồng dữ liệu đang giả định:
 *   GET {UPAFFILIATE_DAILY_API_URL}?video_id=...&from=YYYY-MM-DD&to=YYYY-MM-DD, header Authorization: Bearer {UPAFFILIATE_API_KEY}
 *   → { data: [{ date, video_id, views, orders, gmv }] } — số phát sinh trong ngày, không cộng dồn.
 * Đổi tên trường ở normalizeDailyRow nếu API thật khác.
 */
async function pullFromUpaffiliate(videoId: string, from: string, to: string): Promise<DailyVideoPerformanceRow[]> {
  const base = process.env.UPAFFILIATE_DAILY_API_URL;
  const key = process.env.UPAFFILIATE_API_KEY;
  if (!base || !key) throw new RecordError('Chưa cấu hình UPAFFILIATE_DAILY_API_URL / UPAFFILIATE_API_KEY nên chưa kéo được dữ liệu daily.', 503);
  const url = new URL(base);
  url.searchParams.set('video_id', videoId);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res || !res.ok) throw new RecordError(`UpAffiliate không trả dữ liệu daily (${res ? res.status : 'mất kết nối'}).`, 502);
  const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
  if (!body || !Array.isArray(body.data)) throw new RecordError('UpAffiliate trả dữ liệu daily sai định dạng.', 502);
  return body.data
    .map(normalizeDailyRow)
    .filter((r): r is DailyVideoPerformanceRow => !!r && r.videoId === videoId && r.date >= from && r.date <= to);
}

async function saveRows(videoId: string, incoming: DailyVideoPerformanceRow[]): Promise<DailyRecord> {
  const key = dailyRecordKey(videoId);
  for (let attempt = 0; ; attempt += 1) {
    const current = await readRecord<DailyRecord>(key, EMPTY);
    try {
      const saved = await updateRecord<DailyRecord>(key, EMPTY, current.revision, data => ({
        rows: mergeDailyRows(data.rows || [], incoming),
        lastPulledAt: new Date().toISOString(),
      }));
      return saved.data;
    } catch (err) {
      if (attempt < 2 && err instanceof RecordError && err.status === 409) continue;
      throw err;
    }
  }
}

// POST /api/integrations/upaffiliate/daily-performance { videoId, airDate }
// Kéo daily của video từ ngày air tới hết D60 (hoặc hôm nay), lưu theo từng ngày rồi trả toàn bộ dữ liệu đã lưu để máy khách tính D14/D30/D60.
// Khi API lỗi hoặc chưa cấu hình: vẫn trả dữ liệu đã lưu kèm `error`, không báo đồng bộ thành công.
export async function POST(request: NextRequest) {
  const actor = await getPlanActor(request);
  if (!actor) return unauthorized();
  const body = (await request.json().catch(() => null)) as { videoId?: unknown; airDate?: unknown } | null;
  const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
  const airDate = typeof body?.airDate === 'string' ? body.airDate.slice(0, 10) : '';
  if (!/^\d{10,25}$/.test(videoId)) return NextResponse.json({ error: 'Link air chưa có Video ID hợp lệ.' }, { status: 400 });
  const today = todayVn();
  const range = pullRangeForAirDate(airDate, today);
  if (!range) return NextResponse.json({ error: 'Job chưa có ngày air hợp lệ (hoặc ngày air ở tương lai).' }, { status: 400 });

  let pulled = 0;
  let pullError: { message: string; status: number } | null = null;
  let record: DailyRecord;
  try {
    const rows = await pullFromUpaffiliate(videoId, range.from, range.to);
    pulled = rows.length;
    record = await saveRows(videoId, rows);
  } catch (err) {
    if (!(err instanceof RecordError)) {
      console.error('[upaffiliate-daily]', err);
      return NextResponse.json({ error: 'Không đồng bộ được dữ liệu daily. Vui lòng thử lại.' }, { status: 500 });
    }
    pullError = { message: err.message, status: err.status };
    record = (await readRecord<DailyRecord>(dailyRecordKey(videoId), EMPTY)).data;
  }

  return NextResponse.json(
    { videoId, airDate, today, range, pulled, rows: record.rows, lastPulledAt: record.lastPulledAt, error: pullError?.message ?? null },
    { status: pullError ? pullError.status : 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
