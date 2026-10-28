/**
 * Kiểu dữ liệu kết quả kiểm tra link air do crawler-worker trả về
 * (giữ khớp với crawler-worker/src/core/types.ts).
 */

export type LinkAirPlatform = 'tiktok' | 'instagram' | 'facebook' | 'shopee';
export type LinkAirStatus = 'LIVE' | 'UNAVAILABLE' | 'INVALID_LINK' | 'BLOCKED' | 'ERROR';
export type LinkAirVerdict = 'PASS' | 'REVIEW' | 'FAIL';
export type LinkAirCheckStatus = 'PASS' | 'WARN' | 'FAIL';

export interface LinkAirExpectation {
  handle?: string;
  airFrom?: string;
  airTo?: string;
  requiredHashtags?: string[];
  requiredKeywords?: string[];
  requireProductLink?: boolean;
  expectedProductUrl?: string;
  minViews?: number;
}

export interface LinkAirCheckItem {
  key: string;
  label: string;
  status: LinkAirCheckStatus;
  detail: string;
}

export interface LinkAirCartProduct {
  productId: string;
  skuId?: string;
  sellerId?: string;
  title: string;
  anchorKeyword?: string;
  productUrl: string;
  coverUrl?: string;
  categoryName?: string;
  source?: string;
}

export interface LinkAirResult {
  inputUrl: string;
  platform: LinkAirPlatform | null;
  contentType: 'video' | 'reel' | 'photo' | 'post' | null;
  contentId: string | null;
  canonicalUrl: string | null;
  status: LinkAirStatus;
  statusDetail: string | null;
  author: { handle: string | null; name: string | null; profileUrl: string | null; followers: number | null };
  publishedAt: string | null;
  publishedTimeSec?: number | null;
  airedAtVn?: string | null;
  caption: string;
  hashtags: string[];
  mentions: string[];
  durationSeconds: number | null;
  metrics: { views: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null };
  hasProductLink: boolean | null;
  productTitle: string | null;
  productUrl?: string | null;
  productId?: string | null;
  sellerId?: string | null;
  cartProducts?: LinkAirCartProduct[];
  onScreenStickers?: string[];
  transcriptText?: string | null;
  playableUrl?: string | null;
  coverUrl?: string | null;
  firstProductAppearanceSec?: number | null;
  firstProductMentionTimeLabel?: string | null;
  firstProductMentionTerm?: string | null;
  firstProductMentionQuote?: string | null;
  bestHoldingMomentSec?: number | null;
  bestHoldingMomentTimeLabel?: string | null;
  bestHoldingMomentQuote?: string | null;
  productMentionMoments?: Array<{
    startSec: number;
    endSec: number;
    timeLabel: string;
    matchedTerm: string;
    quote: string;
  }>;
  policyViolations?: Array<{
    word: string;
    category: string;
    suggestion: string;
  }>;
  checks: LinkAirCheckItem[];
  verdict: LinkAirVerdict;
  limitations: string[];
  source: string;
  fetchedAt: string;
  fromCache: boolean;
  durationMs: number;
}

export interface LinkAirCheckResponse {
  success: boolean;
  summary?: { total: number; pass: number; review: number; fail: number };
  results?: LinkAirResult[];
  message?: string;
  error?: string;
}

export const LINK_AIR_PLATFORM_LABEL: Record<LinkAirPlatform, string> = {
  tiktok: 'TikTok',
  shopee: 'Shopee Video',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

export const LINK_AIR_VERDICT_LABEL: Record<LinkAirVerdict, string> = {
  PASS: 'Đạt',
  REVIEW: 'Cần xem lại',
  FAIL: 'Không đạt',
};

/** Tách danh sách link từ ô nhập (mỗi dòng một link, hoặc cách nhau bởi dấu phẩy / khoảng trắng). */
export function splitLinkInput(raw: string): string[] {
  return [...new Set(raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
}

/** Tách danh sách hashtag / từ khoá nhập tay, cách nhau bởi dấu phẩy hoặc xuống dòng. */
export function splitTerms(raw: string): string[] {
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildLinkAirCsv(results: LinkAirResult[]): string {
  const header = [
    'Link nhập',
    'Nền tảng',
    'Kết luận',
    'Trạng thái bài',
    'Kênh',
    'Ngày giờ air (VN)',
    'View',
    'Like',
    'Bình luận',
    'Chia sẻ',
    'Gắn sản phẩm',
    'Tên sản phẩm giỏ hàng',
    'Mã SP (Product ID)',
    'Link giỏ hàng',
    'Giây nhắc tên SP',
    'Link chuẩn',
    'Ghi chú',
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = results.map((r) => [
    r.inputUrl,
    r.platform ? LINK_AIR_PLATFORM_LABEL[r.platform] : '',
    LINK_AIR_VERDICT_LABEL[r.verdict],
    r.status,
    r.author.handle ? `@${r.author.handle}` : r.author.name ?? '',
    r.airedAtVn || (r.publishedAt ? r.publishedAt.slice(0, 10) : ''),
    r.metrics.views,
    r.metrics.likes,
    r.metrics.comments,
    r.metrics.shares,
    r.hasProductLink === null ? '' : r.hasProductLink ? 'Có' : 'Không',
    r.productTitle ?? '',
    r.productId ?? '',
    r.productUrl ?? '',
    r.firstProductAppearanceSec !== null && r.firstProductAppearanceSec !== undefined
      ? `Giây ${r.firstProductAppearanceSec}s${r.firstProductMentionTerm ? ` (${r.firstProductMentionTerm})` : ''}`
      : '',
    r.canonicalUrl ?? '',
    r.checks
      .filter((c) => c.status !== 'PASS')
      .map((c) => `${c.label}: ${c.detail}`)
      .join(' | '),
  ]);
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\n');
}
