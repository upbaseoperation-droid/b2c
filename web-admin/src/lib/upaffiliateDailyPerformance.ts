// Hiệu quả video theo ngày từ UpAffiliate: mỗi dòng là số phát sinh trong 1 ngày của 1 video (không phải số cộng dồn).
// Hệ thống tự cộng các mốc D14 / D30 / D60 tính từ ngày air của Job.
import type { DealPerformance } from './dealBoardRules';

export interface DailyVideoPerformanceRow {
  date: string; // YYYY-MM-DD
  videoId: string;
  views: number;
  orders: number;
  gmv: number;
}

export const PERFORMANCE_WINDOWS = [
  { key: 'd14', days: 14 },
  { key: 'd30', days: 30 },
  { key: 'd60', days: 60 },
] as const;

export type PerformanceWindowKey = (typeof PERFORMANCE_WINDOWS)[number]['key'];

const DAY_MS = 24 * 60 * 60 * 1000;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const toUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(toUtc(day) + n * DAY_MS).toISOString().slice(0, 10);

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const parsed = Number(v.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Chuẩn hóa 1 dòng API (snake_case hoặc camelCase); trả null nếu thiếu ngày hoặc video ID. */
export function normalizeDailyRow(raw: unknown): DailyVideoPerformanceRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const date = String(r.date ?? r.stat_date ?? r.statDate ?? '').slice(0, 10);
  const videoId = String(r.video_id ?? r.videoId ?? '').trim();
  if (!isDay(date) || !/^\d{10,25}$/.test(videoId)) return null;
  return {
    date,
    videoId,
    views: Math.max(0, num(r.views ?? r.video_views ?? r.videoViews) ?? 0),
    orders: Math.max(0, num(r.orders ?? r.order_count ?? r.orderCount) ?? 0),
    gmv: Math.max(0, num(r.gmv) ?? 0),
  };
}

/** Ghép dữ liệu mới vào dữ liệu cũ theo ngày: kéo lại cùng ngày thì ghi đè (UpAffiliate có thể cập nhật lại số của ngày trước). */
export function mergeDailyRows(existing: DailyVideoPerformanceRow[], incoming: DailyVideoPerformanceRow[]): DailyVideoPerformanceRow[] {
  const byDate = new Map(existing.map(r => [r.date, r]));
  for (const r of incoming) byDate.set(r.date, r);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface WindowPerformance extends DealPerformance {
  daysCovered: number;
  daysInWindow: number;
}

/**
 * Cộng số daily của 1 video trong từng mốc tính từ ngày air (ngày air là ngày thứ 1).
 * Mốc chưa có ngày nào có dữ liệu trả về null để không nhầm với số 0 thật.
 * `daysInWindow` chỉ đếm tới hôm nay, nên D30 khi mới air 10 ngày là 10/30 thay vì báo thiếu 20 ngày.
 */
export function computeWindowPerformance(
  rows: DailyVideoPerformanceRow[],
  airDate: string,
  today: string
): Record<PerformanceWindowKey, WindowPerformance> {
  const result = {} as Record<PerformanceWindowKey, WindowPerformance>;
  for (const w of PERFORMANCE_WINDOWS) {
    const end = addDays(airDate, w.days - 1);
    const lastDay = end < today ? end : today;
    const inWindow = rows.filter(r => r.date >= airDate && r.date <= lastDay);
    const elapsed = lastDay < airDate ? 0 : Math.round((toUtc(lastDay) - toUtc(airDate)) / DAY_MS) + 1;
    const has = inWindow.length > 0;
    result[w.key] = {
      views: has ? inWindow.reduce((s, r) => s + r.views, 0) : null,
      orders: has ? inWindow.reduce((s, r) => s + r.orders, 0) : null,
      gmv: has ? inWindow.reduce((s, r) => s + r.gmv, 0) : null,
      daysCovered: new Set(inWindow.map(r => r.date)).size,
      daysInWindow: elapsed,
    };
  }
  return result;
}

/** Khoảng ngày cần kéo từ API cho 1 Job: từ ngày air tới hết D60 hoặc hôm nay. */
export function pullRangeForAirDate(airDate: string, today: string): { from: string; to: string } | null {
  if (!isDay(airDate) || airDate > today) return null;
  const end = addDays(airDate, 59);
  return { from: airDate, to: end < today ? end : today };
}

export const dailyRecordKey = (videoId: string) => `upaffiliate-daily-${videoId}`;

/** Video ID TikTok từ link air dài (…/video/123…) hoặc chuỗi số; '' nếu không có. */
export function videoIdFromAirLink(link: string): string {
  const m = link.match(/\/video\/(\d{10,25})/i) || link.trim().match(/^(\d{10,25})$/);
  return m ? m[1] : '';
}
