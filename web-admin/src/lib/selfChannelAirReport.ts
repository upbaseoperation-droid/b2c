// Báo cáo air video Self-channel: nối video đã đăng với số liệu từ Data Warehouse theo video_id.
import { formatDate, formatVnd } from './format';
import type { SelfFormatKey, SelfPublishPlatform } from './selfChannelBoardRules';

export interface SelfDwMetrics {
  videoId: string;
  views14d: number | null;
  orders14d: number | null;
  gmv14d: number | null;
  roi14d: number | null;
  views30d: number | null;
  orders30d: number | null;
  gmv30d: number | null;
  roi30d: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  syncedAt: string | null;
}

export interface SelfAirReportRow {
  planId: string;
  storeName: string;
  brandName: string;
  month: string;
  code: string;
  pillar: string;
  angle: string;
  formatKey: SelfFormatKey;
  platform: SelfPublishPlatform;
  contributorName: string;
  productName: string;
  airedAt: string;
  airLink: string;
  videoId: string | null;
  /** Lượt xem đọc từ link lúc kiểm (dự phòng khi chưa có số DW) */
  viewsFromLink: number | null;
  acceptanceStatus: string;
  dw: SelfDwMetrics | null;
}

export interface SelfAirReportResponse {
  month: string;
  months: string[];
  rows: SelfAirReportRow[];
  dw: { configured: boolean; ok: boolean; error?: string; matched: number };
}

/** video_id từ link đăng: TikTok /video/<id>, Facebook /videos/<id> hoặc /reel/<id>, YouTube Shorts, hoặc dãy số cuối đủ dài. */
export function extractVideoId(link: string): string | null {
  const url = (link || '').trim();
  if (!url) return null;
  const m =
    url.match(/\/(?:video|videos|reel|reels|shorts)\/([A-Za-z0-9_-]{6,})/i) ||
    url.match(/[?&]v=([A-Za-z0-9_-]{6,})/i) ||
    url.match(/(\d{8,})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

const nz = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

/** Tỷ lệ an toàn: mẫu số 0 trả 0 (không NaN / Infinity). */
export const safeRatio = (num: number, den: number): number => (den === 0 ? 0 : num / den);

export interface PillarSummary {
  pillar: string;
  videos: number;
  withDw: number;
  views30d: number;
  orders30d: number;
  gmv30d: number;
}

/** Tổng hợp theo pillar; chỉ cộng các video đã có số DW (không điền giả). */
export function summarizeByPillar(rows: SelfAirReportRow[]): PillarSummary[] {
  const map = new Map<string, PillarSummary>();
  for (const r of rows) {
    const key = r.pillar.trim() || 'Chưa gắn pillar';
    const cur = map.get(key) || { pillar: key, videos: 0, withDw: 0, views30d: 0, orders30d: 0, gmv30d: 0 };
    cur.videos += 1;
    if (r.dw) {
      cur.withDw += 1;
      cur.views30d += nz(r.dw.views30d) ?? 0;
      cur.orders30d += nz(r.dw.orders30d) ?? 0;
      cur.gmv30d += nz(r.dw.gmv30d) ?? 0;
    }
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.gmv30d - a.gmv30d || b.videos - a.videos);
}

const dash = (n: number | null | undefined) => (typeof n === 'number' ? String(Math.round(n)) : '');

/** CSV báo cáo air (UTF-8 BOM cho Excel). Ô chưa có số DW để trống. */
export function buildSelfAirReportCsv(rows: SelfAirReportRow[]): string {
  const head = ['Gian hàng', 'Brand', 'Tháng', 'Mã việc', 'Pillar', 'Góc nội dung', 'Sản phẩm', 'CTV', 'Ngày đăng', 'Link', 'video_id', 'View (link)', 'View 14 ngày', 'Đơn 14 ngày', 'GMV 14 ngày', 'ROI 14 ngày', 'View 30 ngày', 'Đơn 30 ngày', 'GMV 30 ngày', 'ROI 30 ngày', 'Like', 'Comment', 'Share', 'Cập nhật số DW'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map(r =>
    [
      r.storeName, r.brandName, r.month, r.code, r.pillar, r.angle, r.productName, r.contributorName,
      r.airedAt ? formatDate(r.airedAt) : '', r.airLink, r.videoId || '', dash(r.viewsFromLink),
      dash(r.dw?.views14d), dash(r.dw?.orders14d), dash(r.dw?.gmv14d), r.dw?.roi14d != null ? r.dw.roi14d.toFixed(2) : '',
      dash(r.dw?.views30d), dash(r.dw?.orders30d), dash(r.dw?.gmv30d), r.dw?.roi30d != null ? r.dw.roi30d.toFixed(2) : '',
      dash(r.dw?.likes), dash(r.dw?.comments), dash(r.dw?.shares), r.dw?.syncedAt || '',
    ].map(c => esc(String(c))).join(',')
  );
  return '\uFEFF' + [head.map(esc).join(','), ...lines].join('\n');
}

export const fmtMoney = (n: number | null | undefined): string => (typeof n === 'number' ? formatVnd(n) : '—');
