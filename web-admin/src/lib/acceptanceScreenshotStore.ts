import type { AcceptanceScreenshotItem } from './contracts/types';

const STORAGE_KEY = 'upbase_b2c_video_acceptance_screenshots_v1';
export const ACCEPTANCE_SCREENSHOTS_UPDATED_EVENT = 'upbase:acceptance-screenshots-updated';

export interface StoredAcceptanceScreenshotBucket {
  key: string;
  dealId?: string;
  dealCode?: string;
  kocId?: string;
  authorHandle?: string;
  videoUrl?: string;
  videoId?: string;
  updatedAt: string;
  items: AcceptanceScreenshotItem[];
}

function normalizeHandle(raw?: string): string {
  return (raw || '').trim().toLowerCase().replace(/^@+/, '');
}

function normalizeVideoId(urlOrId?: string): string {
  if (!urlOrId) return '';
  const m =
    urlOrId.match(/\/(?:video|photo|v)\/(\d{15,22})/i) ||
    urlOrId.match(/[?&]item_id=(\d{15,22})/i) ||
    urlOrId.match(/^(\d{15,22})$/);
  return m?.[1] || '';
}

export function loadAllAcceptanceScreenshotBuckets(): StoredAcceptanceScreenshotBucket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllBuckets(buckets: StoredAcceptanceScreenshotBucket[]) {
  if (typeof window === 'undefined') return;
  try {
    // Giữ tối đa 40 bucket gần nhất để tránh tràn bộ nhớ localStorage
    const trimmed = [...buckets]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 40);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(ACCEPTANCE_SCREENSHOTS_UPDATED_EVENT));
  } catch {
    // Bỏ qua lỗi quota
  }
}

export function findSavedScreenshotsForContext(params: {
  dealId?: string;
  dealCode?: string;
  kocId?: string;
  authorHandle?: string;
  videoUrl?: string;
  videoId?: string;
}): AcceptanceScreenshotItem[] {
  const buckets = loadAllAcceptanceScreenshotBuckets();
  if (buckets.length === 0) return [];

  const targetVideoId = params.videoId || normalizeVideoId(params.videoUrl);
  const targetHandle = normalizeHandle(params.authorHandle);

  // Ưu tiên khớp chính xác theo dealCode / dealId / videoId
  for (const b of buckets) {
    const list = Array.isArray(b?.items) ? b.items : [];
    if (list.length === 0) continue;
    if (params.dealId && b.dealId && b.dealId === params.dealId) {
      return list;
    }
    if (params.dealCode && b.dealCode && b.dealCode === params.dealCode) {
      return list;
    }
    if (targetVideoId && b.videoId && b.videoId === targetVideoId) {
      return list;
    }
    if (params.videoUrl && b.videoUrl && b.videoUrl.trim() === params.videoUrl.trim()) {
      return list;
    }
  }

  // Fallback khớp theo kocId hoặc authorHandle
  for (const b of buckets) {
    const list = Array.isArray(b?.items) ? b.items : [];
    if (list.length === 0) continue;
    if (params.kocId && b.kocId && b.kocId === params.kocId) {
      return list;
    }
    if (targetHandle && b.authorHandle && normalizeHandle(b.authorHandle) === targetHandle) {
      return list;
    }
  }

  return [];
}

export function saveScreenshotsForContext(
  context: {
    dealId?: string;
    dealCode?: string;
    kocId?: string;
    authorHandle?: string;
    videoUrl?: string;
    videoId?: string;
    screenshots?: AcceptanceScreenshotItem[];
  },
  itemsArg?: AcceptanceScreenshotItem[]
) {
  const items = Array.isArray(itemsArg)
    ? itemsArg
    : Array.isArray(context.screenshots)
      ? context.screenshots
      : [];
  const buckets = loadAllAcceptanceScreenshotBuckets();
  const videoId = context.videoId || normalizeVideoId(context.videoUrl);
  const authorHandle = normalizeHandle(context.authorHandle);
  const primaryKey =
    context.dealCode ||
    context.dealId ||
    videoId ||
    context.videoUrl?.trim() ||
    context.kocId ||
    authorHandle ||
    `manual-${Date.now()}`;

  const existingIdx = buckets.findIndex(
    (b) =>
      b.key === primaryKey ||
      (context.dealCode && b.dealCode === context.dealCode) ||
      (context.dealId && b.dealId === context.dealId) ||
      (videoId && b.videoId === videoId)
  );

  const nextBucket: StoredAcceptanceScreenshotBucket = {
    key: primaryKey,
    dealId: context.dealId || buckets[existingIdx]?.dealId,
    dealCode: context.dealCode || buckets[existingIdx]?.dealCode,
    kocId: context.kocId || buckets[existingIdx]?.kocId,
    authorHandle: authorHandle || buckets[existingIdx]?.authorHandle,
    videoUrl: context.videoUrl || buckets[existingIdx]?.videoUrl,
    videoId: videoId || buckets[existingIdx]?.videoId,
    updatedAt: new Date().toISOString(),
    items,
  };

  if (existingIdx >= 0) {
    buckets[existingIdx] = nextBucket;
  } else {
    buckets.unshift(nextBucket);
  }
  saveAllBuckets(buckets);
}
