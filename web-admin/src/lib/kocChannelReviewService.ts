'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type KocChannelReviewVerdict = 'NOT_SUITABLE' | 'CAUTION' | 'SUITABLE';

export interface KocChannelReviewItem {
  id: string;
  handle: string;
  channelName: string;
  channelUrl?: string;
  avatarUrl?: string;
  verdict: KocChannelReviewVerdict;
  verdictLabel: string;
  reasonTags: string[];
  note: string;
  brandScope: string;
  sourceScreen: string;
  reviewerName: string;
  reviewerRole?: string;
  reviewerEmail?: string;
  createdAt: string;
  dateLabel: string;
  timeLabel: string;
}

export interface KocChannelBrandVerdictItem {
  brandScope: string;
  verdict: KocChannelReviewVerdict;
  verdictLabel: string;
  latestReview: KocChannelReviewItem;
  reviewCount: number;
}

export interface KocChannelReviewSummary {
  handle: string;
  channelName: string;
  totalReviews: number;
  notSuitableCount: number;
  cautionCount: number;
  suitableCount: number;
  latestReview: KocChannelReviewItem;
  reviews: KocChannelReviewItem[];
  byBrand: KocChannelBrandVerdictItem[];
}

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

let memoryReviewsCache: KocChannelReviewItem[] | null = null;

function readCachedReviewsFromStorage(): KocChannelReviewItem[] {
  if (memoryReviewsCache) return memoryReviewsCache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KOC_CHANNEL_REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryReviewsCache = parsed;
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function writeCachedReviewsToStorage(items: KocChannelReviewItem[]) {
  memoryReviewsCache = items;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KOC_CHANNEL_REVIEWS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota
  }
  window.dispatchEvent(
    new CustomEvent(KOC_CHANNEL_REVIEWS_UPDATED_EVENT, { detail: { items } })
  );
}

export async function fetchKocChannelReviews(): Promise<KocChannelReviewItem[]> {
  try {
    const res = await fetch('/api/integrations/tiktok-koc/channel-reviews', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.items)) {
      writeCachedReviewsToStorage(json.items);
      return json.items as KocChannelReviewItem[];
    }
  } catch {
    // fallback to localStorage cache when offline
  }
  return readCachedReviewsFromStorage();
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
      writeCachedReviewsToStorage(json.items);
      return {
        success: true,
        item: json.item as KocChannelReviewItem | undefined,
        items: json.items as KocChannelReviewItem[],
      };
    }
    return {
      success: false,
      items: readCachedReviewsFromStorage(),
      message: json.message || json.error || 'Không lưu được đánh giá kênh KOC.',
    };
  } catch {
    // Fallback local save if server unreachable
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

    const fallbackItem: KocChannelReviewItem = {
      id: `rev-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      handle: cleanHandle,
      channelName: (payload.channelName || `@${cleanHandle}`).trim(),
      channelUrl: payload.channelUrl || `https://www.tiktok.com/@${cleanHandle}`,
      avatarUrl: payload.avatarUrl,
      verdict: payload.verdict,
      verdictLabel: getVerdictLabel(payload.verdict),
      reasonTags: payload.reasonTags,
      note: payload.note.trim(),
      brandScope: (payload.brandScope || 'Toàn hệ thống B2C').trim(),
      sourceScreen: (payload.sourceScreen || 'Tìm kiếm KOC').trim(),
      reviewerName: (payload.reviewerName || 'Nhân sự B2C').trim(),
      reviewerRole: payload.reviewerRole,
      reviewerEmail: payload.reviewerEmail,
      createdAt: now.toISOString(),
      dateLabel,
      timeLabel,
    };
    const next = [fallbackItem, ...readCachedReviewsFromStorage()];
    writeCachedReviewsToStorage(next);
    return {
      success: true,
      item: fallbackItem,
      items: next,
    };
  }
}

export async function deleteKocChannelReview(id: string): Promise<{
  success: boolean;
  items: KocChannelReviewItem[];
}> {
  try {
    const res = await fetch(
      `/api/integrations/tiktok-koc/channel-reviews?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.items)) {
      writeCachedReviewsToStorage(json.items);
      return { success: true, items: json.items as KocChannelReviewItem[] };
    }
  } catch {
    // fallback local remove
  }
  const next = readCachedReviewsFromStorage().filter((it) => it.id !== id);
  writeCachedReviewsToStorage(next);
  return { success: true, items: next };
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
