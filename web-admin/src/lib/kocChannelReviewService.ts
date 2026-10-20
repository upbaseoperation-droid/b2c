'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type KocChannelReviewVerdict = 'NOT_SUITABLE' | 'CAUTION' | 'SUITABLE';

export interface KocChannelReviewItem {
  id: string;
  handle: string;
  channelHandle?: string;
  channelName: string;
  channelUrl?: string;
  avatarUrl?: string;
  verdict: KocChannelReviewVerdict;
  verdictLabel: string;
  reasonTags: string[];
  note: string;
  brandScope: string;
  brandName?: string;
  sourceScreen: string;
  reviewerName: string;
  reviewerRole?: string;
  reviewerEmail?: string;
  createdAt: string;
  dateLabel: string;
  timeLabel: string;
}

export type KocChannelReviewEntry = KocChannelReviewItem;

export interface KocChannelBrandVerdictItem {
  brandScope: string;
  verdict: KocChannelReviewVerdict;
  verdictLabel: string;
  latestReview: KocChannelReviewItem;
  reviewCount: number;
}

export interface KocChannelReviewSummary {
  handle: string;
  channelHandle?: string;
  channelName: string;
  totalReviews: number;
  notSuitableCount: number;
  cautionCount: number;
  suitableCount: number;
  latestReview: KocChannelReviewItem;
  reviews: KocChannelReviewItem[];
  byBrand: KocChannelBrandVerdictItem[];
}

export const VERDICT_META: Record<
  KocChannelReviewVerdict,
  { label: string; shortLabel: string; tone: 'critical' | 'warning' | 'positive' }
> = {
  SUITABLE: { label: 'Phù hợp', shortLabel: 'Phù hợp', tone: 'positive' },
  CAUTION: { label: 'Cân nhắc / Lưu ý', shortLabel: 'Cân nhắc', tone: 'warning' },
  NOT_SUITABLE: { label: 'Không phù hợp', shortLabel: 'K.Phù hợp', tone: 'critical' },
};

export const KOC_REVIEW_VERDICT_OPTIONS: Array<{
  key: KocChannelReviewVerdict;
  label: string;
  tone: 'critical' | 'warning' | 'positive';
}> = [
  { key: 'SUITABLE', label: 'Phù hợp', tone: 'positive' },
  { key: 'CAUTION', label: 'Cân nhắc / Lưu ý', tone: 'warning' },
  { key: 'NOT_SUITABLE', label: 'Không phù hợp', tone: 'critical' },
];

export const KOC_SUITABLE_REASON_PRESETS: string[] = [
  'Tệp khán giả khớp chân dung khách hàng Brand',
  'Tương tác thật & chuyển đổi giỏ hàng tốt',
  'Hình ảnh / Giọng điệu hợp định vị Brand',
  'Đơn giá hợp lý so với lượt xem thực tế',
  'Phối hợp nhanh, trả bài đúng hạn SLA',
  'Từng lên video hiệu quả cao cùng ngành',
  'Khác (Ghi rõ ở phần ý kiến)',
];

export const KOC_CAUTION_REASON_PRESETS: string[] = [
  'Cần thương lượng giảm đơn giá trước khi book',
  'Chỉ phù hợp gửi mẫu FOC / Affiliate 0đ',
  'Cần duyệt kỹ kịch bản & từ khóa trước khi quay',
  'Phản hồi hơi chậm, cần theo sát tiến độ',
  'Lượt xem biến động mạnh giữa các video',
  'Khác (Ghi rõ ở phần ý kiến)',
];

export const KOC_UNSUITABLE_REASON_PRESETS: string[] = [
  'Tệp khán giả không khớp ngành hàng',
  'Hình ảnh / Nội dung không hợp Brand',
  'Đơn giá cao so với chuyển đổi thực tế',
  'Tương tác thấp / Nghi vấn buff view',
  'Đã hợp tác độc quyền đối thủ',
  'Phản hồi chậm / Từng trễ hạn SLA',
  'Tỷ lệ hoàn hủy cao / Điểm uy tín thấp',
  'Khác (Ghi rõ ở phần ý kiến)',
];

export function getReasonPresetsByVerdict(verdict: KocChannelReviewVerdict): string[] {
  if (verdict === 'SUITABLE') return KOC_SUITABLE_REASON_PRESETS;
  if (verdict === 'CAUTION') return KOC_CAUTION_REASON_PRESETS;
  return KOC_UNSUITABLE_REASON_PRESETS;
}

export const KOC_CHANNEL_REVIEWS_STORAGE_KEY = 'upbase_b2c_koc_channel_reviews_v1';
export const KOC_CHANNEL_REVIEWS_UPDATED_EVENT = 'upbase:koc-channel-reviews-updated';

export function normalizeKocChannelHandle(rawInput?: string | null): string {
  if (!rawInput) return '';
  const trimmed = String(rawInput).trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].toLowerCase();
  }
  return trimmed
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
    .split(/[/?#&\s]/)[0]
    .replace(/^@+/, '')
    .trim()
    .toLowerCase();
}

export const normalizeChannelHandle = normalizeKocChannelHandle;

export function getVerdictLabel(verdict: KocChannelReviewVerdict): string {
  if (verdict === 'NOT_SUITABLE') return 'Không phù hợp';
  if (verdict === 'CAUTION') return 'Cân nhắc / Lưu ý';
  return 'Phù hợp';
}

export function getVerdictTone(
  verdict: KocChannelReviewVerdict
): 'critical' | 'warning' | 'positive' {
  if (verdict === 'NOT_SUITABLE') return 'critical';
  if (verdict === 'CAUTION') return 'warning';
  return 'positive';
}

export const INITIAL_CHANNEL_REVIEW_SEEDS: KocChannelReviewItem[] = [
  {
    id: 'seed-rev-quinskincareholic-1',
    handle: 'quinskincareholic',
    channelName: 'Quin Skincare Holic',
    channelUrl: 'https://www.tiktok.com/@quinskincareholic',
    verdict: 'NOT_SUITABLE',
    verdictLabel: 'Không phù hợp',
    reasonTags: [
      'Đơn giá cao so với chuyển đổi thực tế',
      'Đã hợp tác độc quyền đối thủ',
    ],
    note: 'Kênh đang nhận gói booking cố định cho dòng chống nắng của đối thủ trực tiếp trong quý này, báo giá lẻ cao hơn định mức KL4.',
    brandScope: 'ClubClio',
    sourceScreen: 'KOC của đối thủ',
    reviewerName: 'Lê Phương Thảo',
    reviewerRole: 'Chuyên viên Booking B2C',
    createdAt: '2026-10-18T10:15:00+07:00',
    dateLabel: '18/10/2026',
    timeLabel: '10:15',
  },
  {
    id: 'seed-rev-linhnhireview-1',
    handle: 'linhnhireview',
    channelName: 'Linh Nhi Review',
    channelUrl: 'https://www.tiktok.com/@linhnhireview',
    verdict: 'NOT_SUITABLE',
    verdictLabel: 'Không phù hợp',
    reasonTags: [
      'Tệp khán giả không khớp ngành hàng',
      'Tương tác thấp / Nghi vấn buff view',
    ],
    note: 'Lượt xem cao nhưng phần bình luận chủ yếu là tài khoản seeding, tệp người xem tuổi dưới 18 không khớp tệp khách hàng mục tiêu.',
    brandScope: 'Dear, Klairs',
    sourceScreen: 'KOC theo #Hashtag',
    reviewerName: 'Lương Thị Như Quỳnh',
    reviewerRole: 'Chuyên viên Booking B2C',
    createdAt: '2026-10-19T14:30:00+07:00',
    dateLabel: '19/10/2026',
    timeLabel: '14:30',
  },
  {
    id: 'seed-rev-mevabe.chloe-1',
    handle: 'chloenguyen.official',
    channelName: 'Chloe Nguyễn',
    channelUrl: 'https://www.tiktok.com/@chloenguyen.official',
    verdict: 'SUITABLE',
    verdictLabel: 'Phù hợp',
    reasonTags: [
      'Tệp khán giả khớp chân dung khách hàng Brand',
      'Hình ảnh / Giọng điệu hợp định vị Brand',
    ],
    note: 'Hình ảnh chỉn chu, giọng đọc truyền cảm, tệp mẹ bỉm và phụ nữ 25-35 tuổi tương tác hỏi mua rất tốt cho dòng chăm sóc da.',
    brandScope: 'Kutieskin',
    sourceScreen: 'Danh bạ KOC',
    reviewerName: 'Nguyễn Thị Ngọc Tâm',
    reviewerRole: 'Trưởng nhóm Booking B2C',
    createdAt: '2026-10-20T09:20:00+07:00',
    dateLabel: '20/10/2026',
    timeLabel: '09:20',
  },
  {
    id: 'seed-rev-tuhuyreview-1',
    handle: 'tuhuy.review',
    channelName: 'Review Đồ Công Nghệ',
    channelUrl: 'https://www.tiktok.com/@tuhuy.review',
    verdict: 'SUITABLE',
    verdictLabel: 'Phù hợp',
    reasonTags: [
      'Tương tác thật & chuyển đổi giỏ hàng tốt',
      'Đơn giá hợp lý so với lượt xem thực tế',
    ],
    note: 'Kênh review thực tế, quay chi tiết sản phẩm rõ nét, có sẵn SĐT liên hệ công việc và phản hồi nhanh.',
    brandScope: 'Simplus',
    sourceScreen: 'KOC theo #Hashtag',
    reviewerName: 'Hoàng Hải Long',
    reviewerRole: 'Chuyên viên Booking B2C',
    createdAt: '2026-10-20T11:05:00+07:00',
    dateLabel: '20/10/2026',
    timeLabel: '11:05',
  },
  {
    id: 'seed-rev-thoitrangnonson-1',
    handle: 'thoitrangnonson',
    channelName: 'Nón Sơn',
    channelUrl: 'https://www.tiktok.com/@thoitrangnonson',
    verdict: 'NOT_SUITABLE',
    verdictLabel: 'Không phù hợp',
    reasonTags: [
      'Tệp khán giả không khớp ngành hàng',
      'Đã hợp tác độc quyền đối thủ',
    ],
    note: 'Đây là kênh chính hãng của thương hiệu Nón Sơn, không phải kênh KOC cá nhân nhận booking ngoại.',
    brandScope: 'Toàn hệ thống B2C',
    sourceScreen: 'KOC theo #Hashtag',
    reviewerName: 'Lê Thanh Hải',
    reviewerRole: 'Chuyên viên Booking B2C',
    createdAt: '2026-10-20T11:15:00+07:00',
    dateLabel: '20/10/2026',
    timeLabel: '11:15',
  },
];

let memoryReviewsCache: KocChannelReviewItem[] | null = null;

function mergeAndSortReviewItems(
  primary: KocChannelReviewItem[],
  secondary: KocChannelReviewItem[] = []
): KocChannelReviewItem[] {
  const byId = new Map<string, KocChannelReviewItem>();
  for (const item of [...primary, ...secondary]) {
    if (!item || !item.id) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function readCachedReviewsFromStorage(): KocChannelReviewItem[] {
  if (memoryReviewsCache && memoryReviewsCache.length > 0) return memoryReviewsCache;
  if (typeof window === 'undefined') return INITIAL_CHANNEL_REVIEW_SEEDS;
  try {
    const raw = window.localStorage.getItem(KOC_CHANNEL_REVIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = mergeAndSortReviewItems(parsed, INITIAL_CHANNEL_REVIEW_SEEDS);
        memoryReviewsCache = merged;
        return merged;
      }
    }
  } catch {
    // ignore storage errors
  }
  memoryReviewsCache = INITIAL_CHANNEL_REVIEW_SEEDS;
  return INITIAL_CHANNEL_REVIEW_SEEDS;
}

function writeCachedReviewsToStorage(items: KocChannelReviewItem[]) {
  const sorted = mergeAndSortReviewItems(items);
  memoryReviewsCache = sorted;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KOC_CHANNEL_REVIEWS_STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // ignore storage quota
  }
  window.dispatchEvent(
    new CustomEvent(KOC_CHANNEL_REVIEWS_UPDATED_EVENT, { detail: { items: sorted } })
  );
}

export async function fetchKocChannelReviews(): Promise<KocChannelReviewItem[]> {
  const localCurrent = readCachedReviewsFromStorage();
  try {
    const res = await fetch('/api/integrations/tiktok-koc/channel-reviews', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.items)) {
      const merged = mergeAndSortReviewItems(json.items as KocChannelReviewItem[], localCurrent);
      writeCachedReviewsToStorage(merged);
      return merged;
    }
  } catch {
    // fallback to localStorage cache when offline
  }
  return localCurrent;
}

export async function submitKocChannelReview(payload: {
  handle: string;
  channelName?: string;
  channelUrl?: string;
  avatarUrl?: string;
  verdict: KocChannelReviewVerdict;
  reasonTags: string[];
  note: string;
  brandScope?: string;
  sourceScreen?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewerEmail?: string;
}): Promise<{
  success: boolean;
  item?: KocChannelReviewItem;
  items: KocChannelReviewItem[];
  message?: string;
}> {
  const cleanHandle = normalizeKocChannelHandle(payload.handle);
  if (!cleanHandle) {
    return {
      success: false,
      items: readCachedReviewsFromStorage(),
      message: 'Thiếu mã kênh (@handle) để lưu đánh giá.',
    };
  }

  // 1. Tạo ngay bản ghi đánh giá và cập nhật tức thì (0ms) vào bảng bên cạnh & bảng danh sách
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const optimisticItem: KocChannelReviewItem = {
    id: `rev-${cleanHandle}-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    handle: cleanHandle,
    channelHandle: cleanHandle,
    channelName: (payload.channelName || `@${cleanHandle}`).trim(),
    channelUrl: payload.channelUrl || `https://www.tiktok.com/@${cleanHandle}`,
    avatarUrl: payload.avatarUrl,
    verdict: payload.verdict,
    verdictLabel: getVerdictLabel(payload.verdict),
    reasonTags: payload.reasonTags,
    note: payload.note.trim(),
    brandScope: (payload.brandScope || 'Toàn hệ thống B2C').trim(),
    brandName: (payload.brandScope || 'Toàn hệ thống B2C').trim(),
    sourceScreen: (payload.sourceScreen || 'Tìm kiếm KOC').trim(),
    reviewerName: (payload.reviewerName || 'Nhân sự B2C').trim(),
    reviewerRole: payload.reviewerRole,
    reviewerEmail: payload.reviewerEmail,
    createdAt: now.toISOString(),
    dateLabel,
    timeLabel,
  };

  const baseBeforeSubmit = readCachedReviewsFromStorage();
  const optimisticNext = mergeAndSortReviewItems([optimisticItem], baseBeforeSubmit);
  writeCachedReviewsToStorage(optimisticNext);

  // 2. Đồng bộ lên máy chủ
  try {
    const res = await fetch('/api/integrations/tiktok-koc/channel-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        handle: cleanHandle,
      }),
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.items)) {
      const serverItem = (json.item as KocChannelReviewItem | undefined) || optimisticItem;
      const withoutTemp = readCachedReviewsFromStorage().filter(
        (it) => it.id !== optimisticItem.id
      );
      const synced = mergeAndSortReviewItems(
        [serverItem, ...(json.items as KocChannelReviewItem[])],
        withoutTemp
      );
      writeCachedReviewsToStorage(synced);
      return {
        success: true,
        item: serverItem,
        items: synced,
      };
    }
  } catch {
    // Giữ nguyên bản ghi đã lưu tức thì ở bước 1
  }

  return {
    success: true,
    item: optimisticItem,
    items: readCachedReviewsFromStorage(),
  };
}

export async function deleteKocChannelReview(id: string): Promise<{
  success: boolean;
  items: KocChannelReviewItem[];
}> {
  const nextLocal = readCachedReviewsFromStorage().filter((it) => it.id !== id);
  writeCachedReviewsToStorage(nextLocal);
  try {
    const res = await fetch(
      `/api/integrations/tiktok-koc/channel-reviews?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.items)) {
      const synced = (json.items as KocChannelReviewItem[]).filter((it) => it.id !== id);
      writeCachedReviewsToStorage(synced);
      return { success: true, items: synced };
    }
  } catch {
    // fallback local remove already applied
  }
  return { success: true, items: nextLocal };
}

export function buildChannelReviewSummaryMap(
  reviews: KocChannelReviewItem[]
): Map<string, KocChannelReviewSummary> {
  const map = new Map<string, KocChannelReviewSummary>();
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (const r of sorted) {
    const clean = normalizeKocChannelHandle(r.handle);
    if (!clean) continue;
    const brandName = (r.brandScope || 'Toàn hệ thống B2C').trim();
    const existing = map.get(clean);
    if (!existing) {
      map.set(clean, {
        handle: clean,
        channelHandle: clean,
        channelName: r.channelName || `@${clean}`,
        totalReviews: 1,
        notSuitableCount: r.verdict === 'NOT_SUITABLE' ? 1 : 0,
        cautionCount: r.verdict === 'CAUTION' ? 1 : 0,
        suitableCount: r.verdict === 'SUITABLE' ? 1 : 0,
        latestReview: r,
        reviews: [r],
        byBrand: [
          {
            brandScope: brandName,
            verdict: r.verdict,
            verdictLabel: r.verdictLabel,
            latestReview: r,
            reviewCount: 1,
          },
        ],
      });
    } else {
      existing.totalReviews += 1;
      if (r.verdict === 'NOT_SUITABLE') existing.notSuitableCount += 1;
      else if (r.verdict === 'CAUTION') existing.cautionCount += 1;
      else existing.suitableCount += 1;
      existing.reviews.push(r);
      const brandEntry = existing.byBrand.find(
        (b) => b.brandScope.toLowerCase() === brandName.toLowerCase()
      );
      if (!brandEntry) {
        existing.byBrand.push({
          brandScope: brandName,
          verdict: r.verdict,
          verdictLabel: r.verdictLabel,
          latestReview: r,
          reviewCount: 1,
        });
      } else {
        brandEntry.reviewCount += 1;
      }
    }
  }

  return map;
}

export function useKocChannelReviews() {
  const [reviews, setReviews] = useState<KocChannelReviewItem[]>(() =>
    readCachedReviewsFromStorage()
  );
  const [loading, setLoading] = useState<boolean>(false);

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchKocChannelReviews();
      setReviews(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ items?: KocChannelReviewItem[] }>;
      if (Array.isArray(custom.detail?.items)) {
        setReviews(custom.detail.items);
      } else {
        setReviews(readCachedReviewsFromStorage());
      }
    };
    window.addEventListener(KOC_CHANNEL_REVIEWS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(KOC_CHANNEL_REVIEWS_UPDATED_EVENT, onUpdated);
  }, []);

  const summaryByHandle = useMemo(
    () => buildChannelReviewSummaryMap(reviews),
    [reviews]
  );

  const getChannelSummary = useCallback(
    (handleOrUrl?: string | null): KocChannelReviewSummary | undefined => {
      const clean = normalizeKocChannelHandle(handleOrUrl);
      if (!clean) return undefined;
      return summaryByHandle.get(clean);
    },
    [summaryByHandle]
  );

  return {
    reviews,
    loading,
    refreshReviews,
    summaryByHandle,
    getChannelSummary,
  };
}
