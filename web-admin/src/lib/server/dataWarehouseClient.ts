// Kết nối Data Warehouse (chỉ phía máy chủ): lấy số liệu video theo video_id qua view ổn định của Portal B2C.
// Cấu hình bằng biến môi trường; chưa cấu hình thì báo "chưa kết nối", không điền số giả.
//   DW_API_BASE_URL   địa chỉ dịch vụ truy vấn DW (vd https://dw.example.com/api)
//   DW_API_TOKEN      khóa truy cập (Bearer)
//   DW_VIDEO_VIEW     tên view, mặc định v_b2c_video_performance
// Tên cột trong DW được ánh xạ ở DW_COLUMN_MAP: đổi tại đây nếu view thật đặt tên khác.
import type { SelfDwMetrics } from '../selfChannelAirReport';

export const DW_COLUMN_MAP: Record<keyof SelfDwMetrics, string[]> = {
  videoId: ['video_id', 'videoId'],
  views14d: ['views_14d', 'view_14d', 'views14d'],
  orders14d: ['orders_14d', 'order_14d', 'orders14d'],
  gmv14d: ['gmv_14d', 'gmv14d'],
  roi14d: ['roi_14d', 'roi14d'],
  views30d: ['views_30d', 'view_30d', 'views30d'],
  orders30d: ['orders_30d', 'order_30d', 'orders30d'],
  gmv30d: ['gmv_30d', 'gmv30d'],
  roi30d: ['roi_30d', 'roi30d'],
  likes: ['likes', 'like_count'],
  comments: ['comments', 'comment_count'],
  shares: ['shares', 'share_count'],
  syncedAt: ['synced_at', 'updated_at', 'syncedAt'],
};

export interface DwFetchResult {
  configured: boolean;
  ok: boolean;
  error?: string;
  rows: Map<string, SelfDwMetrics>;
}

export const dwConfigured = (): boolean => Boolean(process.env.DW_API_BASE_URL?.trim() && process.env.DW_API_TOKEN?.trim());

const pick = (row: Record<string, unknown>, names: string[]): unknown => {
  for (const n of names) if (row[n] !== undefined && row[n] !== null) return row[n];
  return null;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function mapDwRow(row: Record<string, unknown>): SelfDwMetrics | null {
  const videoId = String(pick(row, DW_COLUMN_MAP.videoId) ?? '').trim();
  if (!videoId) return null;
  const syncedAt = pick(row, DW_COLUMN_MAP.syncedAt);
  return {
    videoId,
    views14d: num(pick(row, DW_COLUMN_MAP.views14d)),
    orders14d: num(pick(row, DW_COLUMN_MAP.orders14d)),
    gmv14d: num(pick(row, DW_COLUMN_MAP.gmv14d)),
    roi14d: num(pick(row, DW_COLUMN_MAP.roi14d)),
    views30d: num(pick(row, DW_COLUMN_MAP.views30d)),
    orders30d: num(pick(row, DW_COLUMN_MAP.orders30d)),
    gmv30d: num(pick(row, DW_COLUMN_MAP.gmv30d)),
    roi30d: num(pick(row, DW_COLUMN_MAP.roi30d)),
    likes: num(pick(row, DW_COLUMN_MAP.likes)),
    comments: num(pick(row, DW_COLUMN_MAP.comments)),
    shares: num(pick(row, DW_COLUMN_MAP.shares)),
    syncedAt: syncedAt ? String(syncedAt) : null,
  };
}

/** Lấy số liệu cho danh sách video_id (chia lô 100). Lỗi mạng / từ chối không làm sập báo cáo. */
export async function fetchDwVideoMetrics(videoIds: string[]): Promise<DwFetchResult> {
  const rows = new Map<string, SelfDwMetrics>();
  if (!dwConfigured()) return { configured: false, ok: false, rows };
  const base = process.env.DW_API_BASE_URL!.trim().replace(/\/+$/, '');
  const token = process.env.DW_API_TOKEN!.trim();
  const view = (process.env.DW_VIDEO_VIEW || 'v_b2c_video_performance').trim();
  const ids = Array.from(new Set(videoIds.filter(Boolean)));
  try {
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const res = await fetch(`${base}/views/${encodeURIComponent(view)}?video_ids=${encodeURIComponent(batch.join(','))}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { configured: true, ok: false, error: `Data Warehouse trả mã ${res.status}.`, rows };
      const body = (await res.json().catch(() => null)) as { rows?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | null;
      const list = Array.isArray(body) ? body : body?.rows || [];
      for (const r of list) {
        const m = mapDwRow(r);
        if (m) rows.set(m.videoId, m);
      }
    }
    return { configured: true, ok: true, rows };
  } catch (err) {
    return { configured: true, ok: false, error: err instanceof Error ? err.message : 'Không kết nối được Data Warehouse.', rows };
  }
}
