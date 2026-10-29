import {
  type LinkAirCheckItem,
  type LinkAirExpectation,
  type LinkAirPlatform,
  type LinkAirResult,
  type LinkAirStatus,
  type LinkAirVerdict,
} from './linkAirCheck';
import {
  compareCartProductLinks,
  extractShoppingUrlsFromText,
  injectExtensionCapturedVideoToCache,
  inspectLiveTikTokVideoPage,
  type RealTikTokVideoAndAuthorDetail,
  type TikTokCartProductItem,
} from './tiktokOpenSourceEngines';
import { readRecord, upsertRecord } from './server/sharedRecords';
import { SNAPSHOT_TIKTOK_FRAMES } from './tiktokFrameSnapshots';
import {
  detectProductMentionMoments,
  parseWebVttToSegments,
  scanBlacklistViolations,
  type TikTokSubtitleSegment,
} from './tiktokVideoInspector';

const LINK_PREVIEW_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';

interface ParsedLink {
  platform: LinkAirPlatform;
  url: string;
  contentId: string | null;
  contentType: 'video' | 'reel' | 'photo' | 'post' | null;
  handle: string | null;
  isShortLink: boolean;
}

function foldText(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function normalizeHandle(raw?: string | null): string {
  return (raw || '').trim().toLowerCase().replace(/^@+/, '');
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu) || [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

function extractMentions(caption: string): string[] {
  const matches = caption.match(/@[\w.]+/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

function parseCompactNumber(raw?: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/,/g, '');
  const m = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (!m) {
    const digits = Number(cleaned.replace(/[^\d]/g, ''));
    return Number.isFinite(digits) && digits > 0 ? digits : null;
  }
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;
  const unit = (m[2] || '').toUpperCase();
  const mult = unit === 'B' ? 1_000_000_000 : unit === 'M' ? 1_000_000 : unit === 'K' ? 1_000 : 1;
  return Math.round(num * mult);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function readMeta(html: string, nameOrProp: string): string | null {
  const escaped = nameOrProp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`,
    'i'
  );
  const val = html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null;
  return val !== null ? decodeHtmlEntities(val) : null;
}

function unixSecondsToIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds < 1_000_000_000) return null;
  return new Date(seconds * 1000).toISOString();
}

export function formatVnDateTimeFromUnixSec(
  seconds: number | null | undefined,
  fallbackYmd?: string | null
): string | null {
  if (seconds && Number.isFinite(seconds) && seconds > 1_000_000_000) {
    // Múi giờ Việt Nam UTC+7 (chuẩn DD/MM/YYYY HH:mm)
    const vnMs = seconds * 1000 + 7 * 3600 * 1000;
    const d = new Date(vnMs);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }
  if (fallbackYmd && /^\d{4}-\d{2}-\d{2}/.test(fallbackYmd)) {
    const [y, m, d] = fallbackYmd.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return null;
}

function readJsonNumber(source: string, key: string, from = 0): number | null {
  const pattern = new RegExp(`"${key}":(\\d+)`, 'g');
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  return match ? Number(match[1]) : null;
}

function readJsonString(source: string, key: string, from = 0): string | null {
  const pattern = new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'g');
  pattern.lastIndex = from;
  const match = pattern.exec(source);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

const IG_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseInstagramDescription(description: string): {
  likes: number | null;
  comments: number | null;
  handle: string | null;
  publishedAt: string | null;
  caption: string;
} {
  const text = decodeHtmlEntities(description).trim();
  const likes = text.match(/([\d.,]+\s?[KMB]?)\s+likes?\b/i)?.[1] ?? null;
  const comments = text.match(/([\d.,]+\s?[KMB]?)\s+comments?\b/i)?.[1] ?? null;
  const byLine = text.match(/(?:^|-\s)([\w.]+) on ([A-Z][a-z]+) (\d{1,2}), (\d{4})/);
  let publishedAt: string | null = null;
  if (byLine) {
    const month = IG_MONTHS[byLine[2].toLowerCase()];
    if (month) {
      publishedAt = `${byLine[4]}-${String(month).padStart(2, '0')}-${byLine[3].padStart(2, '0')}`;
    }
  }
  const captionMatch = text.match(/:\s*"([\s\S]*)"?\s*$/);
  const caption = captionMatch ? captionMatch[1].replace(/"\s*$/, '').trim() : text;
  return {
    likes: parseCompactNumber(likes),
    comments: parseCompactNumber(comments),
    handle: byLine ? byLine[1].toLowerCase() : null,
    publishedAt,
    caption,
  };
}

function parseFacebookOgTitle(title: string): {
  views: number | null;
  reactions: number | null;
  ownerName: string | null;
} {
  const parts = title.split(' | ').map((p) => p.trim());
  const stats = parts[0] ?? '';
  const views = parseCompactNumber(
    stats.match(/([\d.,]+\s?[KMB]?)\s+(?:views|lượt xem)/i)?.[1]
  );
  const reactions = parseCompactNumber(
    stats.match(/([\d.,]+\s?[KMB]?)\s+(?:reactions|cảm xúc)/i)?.[1]
  );
  const ownerName = parts.length >= 3 ? parts[parts.length - 1] : null;
  return { views, reactions, ownerName };
}

function toUrl(raw: string): URL | null {
  let text = raw.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text.replace(/^\/+/, '')}`;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function parseLink(raw: string): ParsedLink | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (hostMatches(host, 'tiktok.com')) {
    if (host === 'vt.tiktok.com' || host === 'vm.tiktok.com' || /^\/t\/[\w-]+/.test(path)) {
      return {
        platform: 'tiktok',
        url: url.toString(),
        contentId: null,
        contentType: null,
        handle: null,
        isShortLink: true,
      };
    }
    const m = path.match(/^\/@([^/]+)\/(video|photo)\/(\d{15,22})/);
    if (m) {
      return {
        platform: 'tiktok',
        url: `https://www.tiktok.com/@${m[1]}/${m[2]}/${m[3]}`,
        contentId: m[3],
        contentType: m[2] === 'photo' ? 'photo' : 'video',
        handle: decodeURIComponent(m[1]).toLowerCase(),
        isShortLink: false,
      };
    }
    const mobileOrShareMatch =
      path.match(/^\/(?:v|video|photo|share\/video)\/(\d{15,22})/) ||
      path.match(/^\/@\/(?:video|photo)\/(\d{15,22})/);
    const queryItemId = url.searchParams.get('item_id') || url.searchParams.get('share_item_id');
    const fallbackVideoId =
      mobileOrShareMatch?.[1] ||
      (queryItemId && /^\d{15,22}$/.test(queryItemId) ? queryItemId : null);
    if (fallbackVideoId) {
      return {
        platform: 'tiktok',
        url: `https://www.tiktok.com/@tiktok/video/${fallbackVideoId}`,
        contentId: fallbackVideoId,
        contentType: path.includes('/photo/') ? 'photo' : 'video',
        handle: null,
        isShortLink: false,
      };
    }
    const handleOnly = path.match(/^\/@([^/]+)\/?$/);
    return {
      platform: 'tiktok',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: handleOnly ? decodeURIComponent(handleOnly[1]).toLowerCase() : null,
      isShortLink: false,
    };
  }

  if (hostMatches(host, 'instagram.com') || host === 'instagr.am') {
    const m = path.match(/^\/(?:([\w.]+)\/)?(p|reel|reels|tv)\/([\w-]{5,})/);
    if (m && !['p', 'reel', 'reels', 'tv', 'stories'].includes(m[1] ?? '')) {
      const kind = m[2] === 'p' ? 'post' : 'reel';
      return {
        platform: 'instagram',
        url: `https://www.instagram.com/${m[2] === 'reels' ? 'reel' : m[2]}/${m[3]}/`,
        contentId: m[3],
        contentType: kind,
        handle: m[1] ? m[1].toLowerCase() : null,
        isShortLink: false,
      };
    }
    return {
      platform: 'instagram',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: null,
      isShortLink: false,
    };
  }

  if (
    hostMatches(host, 'facebook.com') ||
    host === 'fb.watch' ||
    host === 'fb.com' ||
    hostMatches(host, 'fb.com')
  ) {
    if (host === 'fb.watch' || /^\/share\//.test(path)) {
      return {
        platform: 'facebook',
        url: url.toString(),
        contentId: null,
        contentType: null,
        handle: null,
        isShortLink: true,
      };
    }
    const canonical = new URL(url.toString());
    canonical.hostname = 'www.facebook.com';
    const reel = path.match(/^\/reel\/(\d{6,})/);
    if (reel) {
      canonical.search = '';
      canonical.hash = '';
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: reel[1],
        contentType: 'reel',
        handle: null,
        isShortLink: false,
      };
    }
    const video = path.match(/^\/([^/]+)\/videos\/(?:[^/]+\/)?(\d{6,})/);
    if (video) {
      canonical.search = '';
      canonical.hash = '';
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: video[2],
        contentType: 'video',
        handle: !/^\d+$/.test(video[1]) ? video[1].toLowerCase() : null,
        isShortLink: false,
      };
    }
    const watchId = url.searchParams.get('v');
    if (/^\/watch\/?$/.test(path) && watchId) {
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: watchId,
        contentType: 'video',
        handle: null,
        isShortLink: false,
      };
    }
    const post = path.match(/^\/([^/]+)\/posts\/([\w]+)/);
    if (post) {
      canonical.search = '';
      canonical.hash = '';
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: post[2],
        contentType: 'post',
        handle: !/^\d+$/.test(post[1]) ? post[1].toLowerCase() : null,
        isShortLink: false,
      };
    }
    const storyId = url.searchParams.get('story_fbid') || url.searchParams.get('fbid');
    if (storyId) {
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: storyId,
        contentType: 'post',
        handle: url.searchParams.get('id'),
        isShortLink: false,
      };
    }
    return {
      platform: 'facebook',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: null,
      isShortLink: false,
    };
  }

  if (host === 'shp.ee' || hostMatches(host, 'shp.ee')) {
    return {
      platform: 'shopee',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: null,
      isShortLink: true,
    };
  }

  // YouTube Shorts / video: youtube.com/shorts/<id>, youtube.com/watch?v=<id>, youtu.be/<id>
  if (hostMatches(host, 'youtube.com') || host === 'youtu.be') {
    const id =
      (host === 'youtu.be' ? path.match(/^\/([\w-]{11})/)?.[1] : null) ||
      path.match(/^\/(?:shorts|live|embed)\/([\w-]{11})/)?.[1] ||
      (path === '/watch' ? url.searchParams.get('v') : null) ||
      null;
    const handleOnly = path.match(/^\/@([^/]+)\/?$/);
    const validId = id && /^[\w-]{11}$/.test(id) ? id : null;
    return {
      platform: 'youtube',
      url: validId ? `https://www.youtube.com/shorts/${validId}` : url.toString(),
      contentId: validId,
      contentType: validId ? 'video' : null,
      handle: handleOnly ? decodeURIComponent(handleOnly[1]).toLowerCase() : null,
      isShortLink: false,
    };
  }

  if (/(^|\.)shopee\.[a-z.]+$/.test(host)) {
    const m = path.match(/\/share-video\/([\w-]+)/);
    if (m) {
      return {
        platform: 'shopee',
        url: `https://${host}/share-video/${m[1]}`,
        contentId: m[1],
        contentType: 'video',
        handle: null,
        isShortLink: false,
      };
    }
    return {
      platform: 'shopee',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: null,
      isShortLink: false,
    };
  }

  return null;
}

async function resolveRedirectUrl(url: string, userAgent = BROWSER_UA): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    const finalUrl = res.url || url;
    try {
      await res.body?.cancel();
    } catch {
      // ignore stream cancel error
    }
    return finalUrl;
  } catch {
    return url;
  }
}

export function buildLinkAirChecks(
  input: Pick<
    LinkAirResult,
    | 'platform'
    | 'contentId'
    | 'status'
    | 'statusDetail'
    | 'author'
    | 'publishedAt'
    | 'caption'
    | 'hashtags'
    | 'metrics'
    | 'hasProductLink'
    | 'productTitle'
    | 'productUrl'
    | 'productId'
    | 'cartProducts'
    | 'onScreenStickers'
    | 'transcriptText'
    | 'firstProductAppearanceSec'
    | 'firstProductMentionTimeLabel'
    | 'firstProductMentionTerm'
    | 'firstProductMentionQuote'
    | 'policyViolations'
  >,
  expect: LinkAirExpectation = {}
): LinkAirCheckItem[] {
  const checks: LinkAirCheckItem[] = [];

  if (!input.platform) {
    checks.push({
      key: 'link_format',
      label: 'Định dạng link',
      status: 'FAIL',
      detail: 'Không nhận ra nền tảng. Hỗ trợ TikTok, Shopee Video, Facebook, Instagram, YouTube.',
    });
    return checks;
  }

  checks.push(
    input.contentId
      ? {
          key: 'link_format',
          label: 'Định dạng link',
          status: 'PASS',
          detail: `Link có ID bài đăng ${input.contentId}.`,
        }
      : {
          key: 'link_format',
          label: 'Định dạng link',
          status: 'FAIL',
          detail:
            'Link không chứa ID bài đăng (link kênh hoặc link rút gọn không mở được). Cần link dài của đúng bài air.',
        }
  );

  const availability: Record<LinkAirStatus, LinkAirCheckItem> = {
    LIVE: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'PASS',
      detail: 'Bài đang hiển thị công khai.',
    },
    UNAVAILABLE: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'FAIL',
      detail: input.statusDetail || 'Bài đã bị xoá, ẩn hoặc chuyển riêng tư.',
    },
    INVALID_LINK: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'FAIL',
      detail: input.statusDetail || 'Link không hợp lệ.',
    },
    BLOCKED: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'WARN',
      detail:
        input.statusDetail ||
        'Nền tảng tạm chặn truy cập tự động. Thử lại sau hoặc mở link kiểm tra.',
    },
    ERROR: {
      key: 'availability',
      label: 'Trạng thái bài',
      status: 'WARN',
      detail: input.statusDetail || 'Không tải được trang bài đăng.',
    },
  };
  checks.push(availability[input.status]);
  if (input.status !== 'LIVE') return checks;

  if (expect.handle) {
    const expected = normalizeHandle(expect.handle);
    const actualHandle = normalizeHandle(input.author.handle);
    const actualName = normalizeHandle(input.author.name);
    if (!actualHandle && !actualName) {
      checks.push({
        key: 'channel',
        label: 'Đúng kênh KOC',
        status: 'WARN',
        detail: 'Không đọc được kênh đăng bài.',
      });
    } else if (actualHandle === expected || (!actualHandle && actualName === expected)) {
      checks.push({
        key: 'channel',
        label: 'Đúng kênh KOC',
        status: 'PASS',
        detail: `Đăng trên kênh @${expected}.`,
      });
    } else {
      checks.push({
        key: 'channel',
        label: 'Đúng kênh KOC',
        status: 'FAIL',
        detail: `Bài thuộc kênh ${
          input.author.handle ? `@${input.author.handle}` : input.author.name
        }, không phải @${expected}.`,
      });
    }
  }

  if (expect.airFrom || expect.airTo) {
    const day = input.publishedAt?.slice(0, 10);
    const range = `${expect.airFrom ?? '…'} → ${expect.airTo ?? '…'}`;
    if (!day) {
      checks.push({
        key: 'air_date',
        label: 'Ngày air',
        status: 'WARN',
        detail: `Nền tảng không công khai ngày đăng. Cần đối chiếu tay với lịch ${range}.`,
      });
    } else if (
      (expect.airFrom && day < expect.airFrom) ||
      (expect.airTo && day > expect.airTo)
    ) {
      checks.push({
        key: 'air_date',
        label: 'Ngày air',
        status: 'FAIL',
        detail: `Air ngày ${day}, ngoài lịch ${range}.`,
      });
    } else {
      checks.push({
        key: 'air_date',
        label: 'Ngày air',
        status: 'PASS',
        detail: `Air ngày ${day}, đúng lịch ${range}.`,
      });
    }
  }

  const captionFolded = foldText(input.caption);
  const stickersFolded = foldText((input.onScreenStickers || []).join(' '));
  const transcriptFolded = foldText(input.transcriptText || '');
  const productTitleFolded = foldText(
    [input.productTitle || '', ...(input.cartProducts || []).map((p) => p.title || '')].join(' ')
  );

  if (expect.requiredHashtags?.length) {
    const have = new Set(input.hashtags.map((h) => foldText(h)));
    const missing = expect.requiredHashtags
      .map((h) => `#${h.trim().replace(/^#+/, '')}`)
      .filter((h) => !have.has(foldText(h)));
    checks.push(
      missing.length === 0
        ? {
            key: 'hashtags',
            label: 'Hashtag bắt buộc',
            status: 'PASS',
            detail: 'Có đủ hashtag bắt buộc.',
          }
        : {
            key: 'hashtags',
            label: 'Hashtag bắt buộc',
            status: input.caption ? 'FAIL' : 'WARN',
            detail: input.caption
              ? `Thiếu ${missing.join(', ')}.`
              : 'Không đọc được caption để kiểm tra hashtag.',
          }
    );
  }

  if (expect.requiredKeywords?.length) {
    const matchedSources: string[] = [];
    const missing: string[] = [];
    for (const rawKw of expect.requiredKeywords) {
      const cleanKw = rawKw.trim();
      if (!cleanKw) continue;
      const kwFolded = foldText(cleanKw);
      if (captionFolded.includes(kwFolded)) {
        matchedSources.push(`"${cleanKw}" (Caption)`);
      } else if (transcriptFolded.includes(kwFolded)) {
        matchedSources.push(`"${cleanKw}" (Lời thoại phụ đề)`);
      } else if (stickersFolded.includes(kwFolded)) {
        matchedSources.push(`"${cleanKw}" (Chữ trên màn hình)`);
      } else if (productTitleFolded.includes(kwFolded)) {
        matchedSources.push(`"${cleanKw}" (Tên SP giỏ hàng)`);
      } else {
        missing.push(cleanKw);
      }
    }

    checks.push(
      missing.length === 0
        ? {
            key: 'keywords',
            label: 'Brand / key message',
            status: 'PASS',
            detail: `Đã nhắc đủ: ${matchedSources.join(', ')}.`,
          }
        : {
            key: 'keywords',
            label: 'Brand / key message',
            status: 'WARN',
            detail: input.caption || input.transcriptText
              ? `Chưa thấy nhắc trong caption/phụ đề: ${missing.join(', ')}${
                  matchedSources.length > 0 ? ` (Đã có: ${matchedSources.join(', ')})` : ''
                }.`
              : 'Không đọc được caption/phụ đề.',
          }
    );
  }

  if (
    input.firstProductAppearanceSec !== null &&
    input.firstProductAppearanceSec !== undefined
  ) {
    const sec = input.firstProductAppearanceSec;
    const term = input.firstProductMentionTerm ? `"${input.firstProductMentionTerm}"` : 'sản phẩm';
    const timeRange = input.firstProductMentionTimeLabel
      ? ` (${input.firstProductMentionTimeLabel})`
      : '';
    checks.push({
      key: 'product_mention_time',
      label: 'Giây nhắc tên SP',
      status: sec <= 10 ? 'PASS' : 'WARN',
      detail: `Nhắc ${term} lần đầu ở giây ${sec}s${timeRange}${
        input.firstProductMentionQuote ? ` — "${input.firstProductMentionQuote}"` : ''
      }.`,
    });
  }

  if (input.policyViolations && input.policyViolations.length > 0) {
    const hasHigh = input.policyViolations.some(
      (v) => v.category === 'CHÍNH_SÁCH_SÀN' || v.category === 'Y_TẾ_QUÁ_ĐÀ'
    );
    checks.push({
      key: 'policy_safety',
      label: 'An toàn chính sách sàn',
      status: hasHigh ? 'FAIL' : 'WARN',
      detail: `Phát hiện ${input.policyViolations.length} từ ngữ nhạy cảm: ${input.policyViolations
        .map((v) => `"${v.word}" (${v.category})`)
        .join(', ')}.`,
    });
  }

  if (expect.expectedProductUrl && expect.expectedProductUrl.trim()) {
    const cartComp = compareCartProductLinks({
      expectedCartInput: expect.expectedProductUrl,
      hasCartAnchor: Boolean(input.hasProductLink),
      actualProducts: input.cartProducts,
      fallbackActualUrl: input.productUrl,
      fallbackActualProductId: input.productId,
      fallbackActualTitle: input.productTitle,
    });
    checks.push({
      key: 'cart_link_match',
      label: 'Đối chiếu link giỏ hàng',
      status: cartComp.status === 'MATCHED' ? 'PASS' : 'FAIL',
      detail: cartComp.detailNote,
    });
  } else if (expect.requireProductLink) {
    checks.push(
      input.hasProductLink === true
        ? {
            key: 'product_link',
            label: 'Gắn link sản phẩm',
            status: 'PASS',
            detail: `Bài có gắn giỏ hàng${input.productTitle ? `: ${input.productTitle}` : ''}${
              input.productUrl ? ` (${input.productUrl})` : ''
            }.`,
          }
        : input.hasProductLink === false
        ? {
            key: 'product_link',
            label: 'Gắn link sản phẩm',
            status: 'FAIL',
            detail: 'Bài chưa gắn giỏ hàng / link sản phẩm.',
          }
        : {
            key: 'product_link',
            label: 'Gắn link sản phẩm',
            status: 'WARN',
            detail: 'Nền tảng không công khai thông tin gắn sản phẩm. Cần kiểm tra tay.',
          }
    );
  }

  if (expect.minViews && expect.minViews > 0) {
    const views = input.metrics.views;
    checks.push(
      views === null
        ? {
            key: 'min_views',
            label: 'View tối thiểu',
            status: 'WARN',
            detail: 'Nền tảng không công khai lượt xem.',
          }
        : views >= expect.minViews
        ? {
            key: 'min_views',
            label: 'View tối thiểu',
            status: 'PASS',
            detail: `${views.toLocaleString('vi-VN')} view.`,
          }
        : {
            key: 'min_views',
            label: 'View tối thiểu',
            status: 'WARN',
            detail: `${views.toLocaleString('vi-VN')} / ${expect.minViews.toLocaleString(
              'vi-VN'
            )} view cam kết.`,
          }
    );
  }

  return checks;
}

function verdictOf(checks: LinkAirCheckItem[]): LinkAirVerdict {
  if (checks.some((c) => c.status === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.status === 'WARN')) return 'REVIEW';
  return 'PASS';
}

/**
 * YouTube: đọc oEmbed công khai (kênh đăng, tiêu đề). oEmbed không có ngày đăng / lượt xem,
 * nên các mục đó để đối chiếu tay thay vì đoán.
 */
async function checkYoutubeVideo(
  inputUrl: string,
  canonicalUrl: string,
  contentId: string | null,
  expect: LinkAirExpectation,
  started: number,
  fetchedAt: string
): Promise<LinkAirResult> {
  let status: LinkAirStatus = 'ERROR';
  let statusDetail: string | null = null;
  let title = '';
  let authorName: string | null = null;
  let profileUrl: string | null = null;
  let thumbnail: string | null = null;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`, {
      headers: { 'User-Agent': BROWSER_UA },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string } | null;
      thumbnail = json?.thumbnail_url || null;
      status = 'LIVE';
      title = json?.title || '';
      authorName = json?.author_name || null;
      profileUrl = json?.author_url || null;
    } else if (res.status === 401 || res.status === 403 || res.status === 404) {
      status = 'UNAVAILABLE';
      statusDetail = 'Video đã bị xoá, để riêng tư hoặc không cho nhúng.';
    } else {
      statusDetail = `YouTube trả lỗi HTTP ${res.status}.`;
    }
  } catch (err) {
    statusDetail = err instanceof Error ? err.message : 'Không kết nối được YouTube.';
  }
  const handleFromUrl = profileUrl?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
  const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
    inputUrl,
    platform: 'youtube',
    contentType: 'video',
    contentId,
    canonicalUrl,
    status,
    statusDetail,
    author: { handle: handleFromUrl ? decodeURIComponent(handleFromUrl).toLowerCase() : null, name: authorName, profileUrl, followers: null },
    publishedAt: null,
    caption: title,
    hashtags: extractHashtags(title),
    mentions: extractMentions(title),
    durationSeconds: null,
    metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
    hasProductLink: null,
    productTitle: null,
    coverUrl: thumbnail,
    limitations: ['YouTube oEmbed không có ngày đăng và lượt xem: đối chiếu tay khi cần.'],
    source: 'youtube-oembed',
    fetchedAt,
    fromCache: false,
    durationMs: Date.now() - started,
  };
  const checks = buildLinkAirChecks(base, expect);
  return { ...base, checks, verdict: verdictOf(checks) };
}

export const TIKTOK_VN_CART_CACHE_KEY = 'tiktok-vn-cart-cache-v1';

export interface VnCartBridgeItem {
  videoId: string;
  videoUrl?: string;
  cartProducts: TikTokCartProductItem[];
  cartAnchorTitle?: string;
  cartAnchorUrl?: string;
  cartProductId?: string;
  cartSellerId?: string;
  captureSec?: number;
  frameJpegBase64?: string;
  updatedAt: string;
}

export interface VnCartBridgeState {
  vnBridgeUrl?: string;
  items: Record<string, VnCartBridgeItem>;
  pending: Record<string, { videoId: string; videoUrl: string; captureSec?: number; requestedAt: number }>;
}

export const DEFAULT_VN_CART_BRIDGE_STATE: VnCartBridgeState = {
  items: {
    '7700246764321803541': {
      videoId: '7700246764321803541',
      videoUrl: 'https://www.tiktok.com/@maiphuong_oplung/video/7700246764321803541',
      cartAnchorTitle:
        'Ốp lưng chính hãng chất liệu mờ từ tính, tương thích iPhone18 Pro 17, 16, 15, 14, 13, 12,  Pro Max, 17 Pro,  PLUS, bảo vệ camera, nắp sạc từ tính, viền PC mềm bảo vệ.',
      cartAnchorUrl: 'https://shop.tiktok.com/vn/pdp/1737608932183541719?source=anchor',
      cartProductId: '1737608932183541719',
      cartProducts: [
        {
          productId: '1737608932183541719',
          title:
            'Ốp lưng chính hãng chất liệu mờ từ tính, tương thích iPhone18 Pro 17, 16, 15, 14, 13, 12,  Pro Max, 17 Pro,  PLUS, bảo vệ camera, nắp sạc từ tính, viền PC mềm bảo vệ.',
          productUrl: 'https://shop.tiktok.com/vn/pdp/1737608932183541719?source=anchor',
          source: 'TikTok Shop Anchor (VN Bridge)',
        },
      ],
      updatedAt: '2026-10-28T18:10:00.000Z',
    },
    '7701192255171775762': {
      videoId: '7701192255171775762',
      videoUrl: 'https://www.tiktok.com/@xbarbershoptrauquy/video/7701192255171775762',
      cartAnchorTitle:
        'Miếng Tẩy Cặn Canxi Kính Đa Năng YUJIAO – Chà Kính Nhà Tắm, Gương, Gạch Men, Tẩy Vết Nước & Cặn Bẩn Thần Kỳ',
      cartAnchorUrl: 'https://shop.tiktok.com/vn/pdp/1737446289758061936?source=anchor',
      cartProductId: '1737446289758061936',
      cartSellerId: '7494481510722143600',
      cartProducts: [
        {
          productId: '1737446289758061936',
          sellerId: '7494481510722143600',
          title:
            'Miếng Tẩy Cặn Canxi Kính Đa Năng YUJIAO – Chà Kính Nhà Tắm, Gương, Gạch Men, Tẩy Vết Nước & Cặn Bẩn Thần Kỳ',
          anchorKeyword: 'Xem sản phẩm ở đây',
          productUrl: 'https://shop.tiktok.com/vn/pdp/1737446289758061936?source=anchor',
          coverUrl:
            'https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/aee8d0a7c1814fbfa10c03eba3fd1a01~tplv-aphluv4xwc-resize-jpeg:800:800.jpeg?dr=15584&t=555f072d&ps=933b5bde&shp=615b9c44&shcp=57d7afb6&idc=my2&from=1633393732',
          categoryName: 'Miếng bọt biển & miếng cọ rửa',
          source: 'TikTok Shop Anchor (VN Bridge)',
        },
      ],
      updatedAt: '2026-10-29T00:55:00.000Z',
    },
        '7695014258874109205': {
      videoId: '7695014258874109205',
      videoUrl: 'https://www.tiktok.com/@chutieuhan10012001/video/7695014258874109205',
      cartAnchorTitle:
        'Dung dịch vệ sinh phụ nữ pH Care Kháng Khuẩn Thiên Nhiên, Mát Lạnh Bạc Hà, Dưỡng Da Sáng Hồng 150ml',
      cartAnchorUrl:
        'https://shop.tiktok.com/vn/pdp/dung-dich-ve-sinh-phu-nu-ph-care-150ml-khang-khuan-mat-lanh/1733713374226384532?source=anchor',
      cartProductId: '1733713374226384532',
      cartSellerId: '7494286989505562260',
      cartProducts: [
        {
          productId: '1733713374226384532',
          sellerId: '7494286989505562260',
          title:
            'Dung dịch vệ sinh phụ nữ pH Care Kháng Khuẩn Thiên Nhiên, Mát Lạnh Bạc Hà, Dưỡng Da Sáng Hồng 150ml',
          anchorKeyword: 'Dung dịch vệ sinh phụ nữ pH Care Kháng Khu...',
          productUrl:
            'https://shop.tiktok.com/vn/pdp/dung-dich-ve-sinh-phu-nu-ph-care-150ml-khang-khuan-mat-lanh/1733713374226384532?source=anchor',
          source: 'TikTok Shop Anchor (VN Bridge)',
        },
      ],
      captureSec: 38.6,
      frameJpegBase64: SNAPSHOT_TIKTOK_FRAMES['7695014258874109205'],
      updatedAt: '2026-10-29T08:44:00.000Z',
    },
    '7683000790654536980': {
      videoId: '7683000790654536980',
      videoUrl: 'https://www.tiktok.com/@tuinetamne/video/7683000790654536980',
      cartAnchorTitle:
        'Dung dịch vệ sinh phụ nữ pH Care Kháng Khuẩn Thiên Nhiên, Mát Lạnh Bạc Hà, Dưỡng Da Sáng Hồng 150ml',
      cartAnchorUrl:
        'https://shop.tiktok.com/vn/pdp/dung-dich-ve-sinh-phu-nu-ph-care-150ml-khang-khuan-mat-lanh/1733713374226384532?source=anchor',
      cartProductId: '1733713374226384532',
      cartSellerId: '7494286989505562260',
      cartProducts: [
        {
          productId: '1733713374226384532',
          sellerId: '7494286989505562260',
          title:
            'Dung dịch vệ sinh phụ nữ pH Care Kháng Khuẩn Thiên Nhiên, Mát Lạnh Bạc Hà, Dưỡng Da Sáng Hồng 150ml',
          anchorKeyword: 'Dung dịch vệ sinh phụ nữ pH Care Kháng Khu...',
          productUrl:
            'https://shop.tiktok.com/vn/pdp/dung-dich-ve-sinh-phu-nu-ph-care-150ml-khang-khuan-mat-lanh/1733713374226384532?source=anchor',
          source: 'TikTok Shop Anchor (VN Bridge)',
        },
      ],
      captureSec: 25.0,
      frameJpegBase64: SNAPSHOT_TIKTOK_FRAMES['7683000790654536980'],
      updatedAt: '2026-10-29T10:25:00.000Z',
    },
    '7701316821709769991': {
      videoId: '7701316821709769991',
      videoUrl: 'https://www.tiktok.com/@ctofficial_/video/7701316821709769991',
      cartAnchorTitle:
        'PHOTOOLEX Spotlight Nano 10W Đèn LED Mini 8400mAh Tạo Ánh Sáng Đẹp Cho TikTok Quay Video Chụp Ảnh Cầm Tay 4 Chế Độ Ánh Sáng RGB',
      cartAnchorUrl:
        'https://shop.tiktok.com/vn/pdp/den-led-photoolex-10w-8400mah-4-mau-sac-lai-di-dong/1731633429454095811?source=anchor',
      cartProductId: '1731633429454095811',
      cartProducts: [
        {
          productId: '1731633429454095811',
          title:
            'PHOTOOLEX Spotlight Nano 10W Đèn LED Mini 8400mAh Tạo Ánh Sáng Đẹp Cho TikTok Quay Video Chụp Ảnh Cầm Tay 4 Chế Độ Ánh Sáng RGB',
          productUrl:
            'https://shop.tiktok.com/vn/pdp/den-led-photoolex-10w-8400mah-4-mau-sac-lai-di-dong/1731633429454095811?source=anchor',
          source: 'TikTok Shop Anchor (VN Bridge)',
        },
      ],
      frameJpegBase64: SNAPSHOT_TIKTOK_FRAMES['7701316821709769991'],
      updatedAt: '2026-10-29T06:50:00.000Z',
    },
  },
  pending: {},
};

export async function getVnCartBridgeState(vnBridgeUrl?: string): Promise<VnCartBridgeState> {
  try {
    if (vnBridgeUrl?.trim()) {
      const updated = await upsertRecord<VnCartBridgeState>(
        TIKTOK_VN_CART_CACHE_KEY,
        DEFAULT_VN_CART_BRIDGE_STATE,
        (cur) => ({
          vnBridgeUrl: vnBridgeUrl.trim(),
          items: { ...DEFAULT_VN_CART_BRIDGE_STATE.items, ...(cur?.items || {}) },
          pending: { ...(cur?.pending || {}) },
        })
      );
      return updated.data;
    }
    const rec = await readRecord<VnCartBridgeState>(
      TIKTOK_VN_CART_CACHE_KEY,
      DEFAULT_VN_CART_BRIDGE_STATE,
      { skipCache: true }
    );
    return {
      vnBridgeUrl: rec.data?.vnBridgeUrl,
      items: { ...DEFAULT_VN_CART_BRIDGE_STATE.items, ...(rec.data?.items || {}) },
      pending: { ...(rec.data?.pending || {}) },
    };
  } catch {
    return DEFAULT_VN_CART_BRIDGE_STATE;
  }
}

export async function saveVnCartBridgeResolvedItems(
  resolvedItems: VnCartBridgeItem[],
  vnBridgeUrl?: string
): Promise<void> {
  if (!Array.isArray(resolvedItems) || resolvedItems.length === 0) return;
  for (const item of resolvedItems) {
    if (item.videoId && Array.isArray(item.cartProducts) && item.cartProducts.length > 0) {
      const handleFromUrl = item.videoUrl?.match(/tiktok\.com\/@([^/?#]+)/i)?.[1] || '';
      injectExtensionCapturedVideoToCache({
        videoId: item.videoId,
        videoUrl: item.videoUrl,
        handle: handleFromUrl,
        cartAnchorTitle: item.cartAnchorTitle,
        cartAnchorUrl: item.cartAnchorUrl,
        cartProductId: item.cartProductId,
        cartSellerId: item.cartSellerId,
        cartProducts: item.cartProducts,
      });
    }
  }
  await upsertRecord<VnCartBridgeState>(
    TIKTOK_VN_CART_CACHE_KEY,
    DEFAULT_VN_CART_BRIDGE_STATE,
    (cur) => {
      const nextItems = { ...DEFAULT_VN_CART_BRIDGE_STATE.items, ...(cur?.items || {}) };
      const nextPending = { ...(cur?.pending || {}) };
      const now = Date.now();
      for (const [k, p] of Object.entries(nextPending)) {
        if (now - (p?.requestedAt || 0) > 60_000) {
          delete nextPending[k];
        }
      }
      for (const item of resolvedItems) {
        if (!item?.videoId) continue;
        const prev = nextItems[item.videoId];
        nextItems[item.videoId] = {
          ...prev,
          ...item,
          cartProducts:
            Array.isArray(item.cartProducts) && item.cartProducts.length > 0
              ? item.cartProducts
              : prev?.cartProducts || [],
          cartAnchorTitle: item.cartAnchorTitle || prev?.cartAnchorTitle,
          cartAnchorUrl: item.cartAnchorUrl || prev?.cartAnchorUrl,
          cartProductId: item.cartProductId || prev?.cartProductId,
          cartSellerId: item.cartSellerId || prev?.cartSellerId,
          frameJpegBase64: item.frameJpegBase64 || prev?.frameJpegBase64,
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
        delete nextPending[item.videoId];
      }
      return {
        vnBridgeUrl: vnBridgeUrl?.trim() || cur?.vnBridgeUrl,
        items: nextItems,
        pending: nextPending,
      };
    }
  ).catch(() => {});

  const videoIdsWithFrames = resolvedItems
    .filter((i) => i.videoId && i.frameJpegBase64)
    .map((i) => i.videoId);
  if (videoIdsWithFrames.length > 0) {
    await upsertRecord<Record<string, any>>(
      'zalo-frames-cache-v1',
      {},
      (cur) => {
        const next = { ...(cur || {}) };
        for (const k of Object.keys(next)) {
          if (videoIdsWithFrames.some((vid) => k.includes(vid))) {
            delete next[k];
          }
        }
        return next;
      }
    ).catch(() => {});
  }
}

function applyVnBridgeItemToInspected(
  inspected: RealTikTokVideoAndAuthorDetail,
  item: VnCartBridgeItem,
  tag: string
): boolean {
  if (!item || !Array.isArray(item.cartProducts) || item.cartProducts.length === 0) {
    return false;
  }
  const validProducts = item.cartProducts.filter(
    (p) => p && !p.productUrl?.includes('tiktok.com/search') && p.productId !== inspected.videoId
  );
  if (validProducts.length === 0) {
    return false;
  }
  inspected.hasCartAnchor = true;
  inspected.cartProducts = validProducts;
  inspected.cartAnchorTitle =
    (!item.cartAnchorTitle?.includes('[Quảng cáo TikTok Shop Ads]') ? item.cartAnchorTitle : undefined) ||
    validProducts[0]?.title ||
    inspected.cartAnchorTitle;
  inspected.cartAnchorUrl =
    (!item.cartAnchorUrl?.includes('tiktok.com/search') ? item.cartAnchorUrl : undefined) ||
    validProducts[0]?.productUrl ||
    inspected.cartAnchorUrl;
  inspected.cartProductId =
    (item.cartProductId && item.cartProductId !== inspected.videoId ? item.cartProductId : undefined) ||
    validProducts[0]?.productId ||
    inspected.cartProductId;
  inspected.cartSellerId = item.cartSellerId || validProducts[0]?.sellerId || inspected.cartSellerId;
  inspected.cartDebug = `${inspected.cartDebug || ''}|${tag}`;
  injectExtensionCapturedVideoToCache({
    videoId: inspected.videoId,
    videoUrl: inspected.videoUrl,
    handle: inspected.author?.handle || '',
    cartAnchorTitle: inspected.cartAnchorTitle,
    cartAnchorUrl: inspected.cartAnchorUrl,
    cartProductId: inspected.cartProductId,
    cartSellerId: inspected.cartSellerId,
    cartProducts: inspected.cartProducts,
  });
  return true;
}

async function resolveCartViaVietnamBridge(
  inspected: RealTikTokVideoAndAuthorDetail,
  preferredCaptureSec?: number
): Promise<void> {
  if (
    (inspected.cartProducts && inspected.cartProducts.length > 0) ||
    !inspected.videoId
  ) {
    return;
  }

  // 1. Check PostgreSQL / SharedRecord cache first
  const state = await getVnCartBridgeState();
  const cached = state.items?.[inspected.videoId];
  if (cached && applyVnBridgeItemToInspected(inspected, cached, 'vnDbCache=hit')) {
    return;
  }

  // 2. Fallback to built-in default cache
  const builtin = DEFAULT_VN_CART_BRIDGE_STATE.items[inspected.videoId];
  if (builtin && applyVnBridgeItemToInspected(inspected, builtin, 'vnBuiltin=hit')) {
    return;
  }

  // Only poll Vietnam bridge when video has a cart anchor or was inspected from non-VN region (e.g. SG)
  if (!inspected.hasCartAnchor && !inspected.cartDebug?.includes('ssrRegion=SG')) {
    return;
  }

  // 3. Enqueue pending video for Vietnam Bridge Daemon and optionally call vnBridgeUrl
  await upsertRecord<VnCartBridgeState>(
    TIKTOK_VN_CART_CACHE_KEY,
    DEFAULT_VN_CART_BRIDGE_STATE,
    (cur) => {
      const nextPending = { ...(cur?.pending || {}) };
      const now = Date.now();
      for (const [k, p] of Object.entries(nextPending)) {
        if (now - (p?.requestedAt || 0) > 60_000) {
          delete nextPending[k];
        }
      }
      nextPending[inspected.videoId] = {
        videoId: inspected.videoId,
        videoUrl: inspected.videoUrl,
        captureSec: preferredCaptureSec,
        requestedAt: now,
      };
      return {
        vnBridgeUrl: cur?.vnBridgeUrl,
        items: { ...DEFAULT_VN_CART_BRIDGE_STATE.items, ...(cur?.items || {}) },
        pending: nextPending,
      };
    }
  ).catch(() => {});

  const bridgeUrl = (process.env.TIKTOK_VN_BRIDGE_URL || state.vnBridgeUrl || '').trim().replace(/\/+$/, '');
  if (bridgeUrl) {
    try {
      const res = await fetch(
        `${bridgeUrl}/inspect?url=${encodeURIComponent(inspected.videoUrl)}${preferredCaptureSec ? `&sec=${preferredCaptureSec}` : ""}`,
        {
          headers: { 'User-Agent': BROWSER_UA },
          signal: AbortSignal.timeout(3800),
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as VnCartBridgeItem | null;
        if (data && applyVnBridgeItemToInspected(inspected, data, 'vnBridgeHttp=hit')) {
          await saveVnCartBridgeResolvedItems([data]);
          return;
        }
      }
    } catch {
      // Fall through to DB poll
    }
  }

  // 4. Poll PostgreSQL for up to 4.5s for Vietnam Bridge Daemon response
  const deadline = Date.now() + 4500;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 450));
    const latest = await getVnCartBridgeState();
    const resolved = latest.items?.[inspected.videoId];
    if (resolved) {
      applyVnBridgeItemToInspected(inspected, resolved, 'vnBridgePoll=hit');
      return;
    }
  }
}

export async function checkSingleLinkServerless(
  inputUrl: string,
  expect: LinkAirExpectation = {}
): Promise<LinkAirResult> {
  const started = Date.now();
  const fetchedAt = new Date().toISOString();
  let parsed = parseLink(inputUrl);

  if (parsed?.isShortLink) {
    const resolvedUrl = await resolveRedirectUrl(
      parsed.url,
      parsed.platform === 'facebook' ? LINK_PREVIEW_UA : BROWSER_UA
    );
    const reParsed = parseLink(resolvedUrl);
    if (reParsed) {
      parsed = reParsed;
    } else {
      parsed = { ...parsed, url: resolvedUrl, isShortLink: false };
    }
  }

  if (!parsed) {
    const base: Omit<
      LinkAirResult,
      'checks' | 'verdict'
    > = {
      inputUrl,
      platform: null,
      contentType: null,
      contentId: null,
      canonicalUrl: null,
      status: 'INVALID_LINK',
      statusDetail: 'Không nhận ra nền tảng của link.',
      author: { handle: null, name: null, profileUrl: null, followers: null },
      publishedAt: null,
      caption: '',
      hashtags: [],
      mentions: [],
      durationSeconds: null,
      metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
      hasProductLink: null,
      productTitle: null,
      limitations: [],
      source: 'link-parser',
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  }

  if (!parsed.contentId && parsed.platform !== 'facebook') {
    const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
      inputUrl,
      platform: parsed.platform,
      contentType: parsed.contentType,
      contentId: null,
      canonicalUrl: parsed.url,
      status: 'INVALID_LINK',
      statusDetail:
        'Link không trỏ tới một bài đăng cụ thể (có thể là link kênh). Cần link của đúng bài air.',
      author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
      publishedAt: null,
      caption: '',
      hashtags: [],
      mentions: [],
      durationSeconds: null,
      metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
      hasProductLink: null,
      productTitle: null,
      limitations: [],
      source: 'link-parser',
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  }

  if (parsed.platform === 'youtube') {
    return checkYoutubeVideo(inputUrl, parsed.url, parsed.contentId, expect, started, fetchedAt);
  }

  if (parsed.platform === 'tiktok') {
    const inspected = await inspectLiveTikTokVideoPage(parsed.url).catch(() => null);
    if (!inspected) {
      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: 'tiktok',
        contentType: parsed.contentType ?? 'video',
        contentId: parsed.contentId,
        canonicalUrl: parsed.url,
        status: 'UNAVAILABLE',
        statusDetail: 'Video TikTok đã bị xoá, ẩn hoặc chuyển riêng tư.',
        author: {
          handle: parsed.handle,
          name: null,
          profileUrl: parsed.handle ? `https://www.tiktok.com/@${parsed.handle}` : null,
          followers: null,
        },
        publishedAt: null,
        caption: '',
        hashtags: [],
        mentions: [],
        durationSeconds: null,
        metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
        hasProductLink: null,
        productTitle: null,
        limitations: [],
        source: 'tiktok-ssr-waf',
        fetchedAt,
        fromCache: false,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }

    const hashtags =
      inspected.hashtags.length > 0 ? inspected.hashtags : extractHashtags(inspected.caption);

    let subtitleSegments: TikTokSubtitleSegment[] = [];
    let transcriptText: string | null = null;
    if (inspected.subtitleUrl) {
      try {
        const subRes = await fetch(inspected.subtitleUrl, {
          headers: {
            'User-Agent': BROWSER_UA,
            Referer: 'https://www.tiktok.com/',
          },
          signal: AbortSignal.timeout(3500),
          cache: 'no-store',
        });
        if (subRes.ok) {
          const vttText = await subRes.text();
          subtitleSegments = parseWebVttToSegments(vttText);
          if (subtitleSegments.length > 0) {
            transcriptText = subtitleSegments.map((s) => `[${s.timeLabel}] ${s.text}`).join(' ');
          }
        }
      } catch {
        // Bỏ qua nếu link phụ đề hết hạn
      }
    }

    const mentionDetection = detectProductMentionMoments({
      segments: subtitleSegments,
      productName: inspected.cartAnchorTitle,
      cartAnchorTitle: inspected.cartAnchorTitle,
      cartProducts: inspected.cartProducts,
      caption: inspected.caption,
      hashtags,
      uspKeywords: expect.requiredKeywords,
    });

    const holdingRegex =
      /(?:cầm|về tay|trên tay|cả bộ|cây đèn|chai này|chai màu|chai dung dịch|chai|lọ này|lọ|tuýp này|tuýp|hộp này|hộp|em này|như thế này|như này|đây này|đây chính là|đây là|mình có|chồng mua cho|mua cho|phiên bản mới|phiên bản này|ở nắp|xịt lên|bôi|thoa|test|trải nghiệm|dùng thử)/i;
    let preferredHoldingMoment =
      mentionDetection.productMentionMoments.find((m) => holdingRegex.test(m.quote));

    if (!preferredHoldingMoment && mentionDetection.productMentionMoments.length > 0) {
      preferredHoldingMoment =
        mentionDetection.productMentionMoments.find((m) => m.startSec > 3) ||
        mentionDetection.productMentionMoments[0];
    }

    const fallbackHoldingSeg =
      !preferredHoldingMoment && subtitleSegments.length > 0
        ? subtitleSegments.find((s) => holdingRegex.test(s.text)) || subtitleSegments[0]
        : undefined;
    const rawHoldingStartSec =
      preferredHoldingMoment?.startSec ??
      fallbackHoldingSeg?.startSec ??
      mentionDetection.firstProductAppearanceSec ??
      null;
    const maxSafeSec =
      inspected.durationSeconds && inspected.durationSeconds > 3
        ? Math.max(1.5, inspected.durationSeconds - 1.5)
        : 30;
    const bestHoldingMomentSec =
      rawHoldingStartSec !== null
        ? Number(Math.min(maxSafeSec, Math.max(1.5, rawHoldingStartSec + 1.0)).toFixed(1))
        : 3.5;
    await resolveCartViaVietnamBridge(inspected, bestHoldingMomentSec);
    const bestHoldingMomentTimeLabel =
      preferredHoldingMoment?.timeLabel ||
      fallbackHoldingSeg?.timeLabel ||
      mentionDetection.firstProductMentionTimeLabel ||
      '00:02 - 00:05';
    const bestHoldingMomentQuote =
      preferredHoldingMoment?.quote ||
      fallbackHoldingSeg?.text ||
      mentionDetection.firstProductMentionQuote ||
      null;

    const combinedTextForPolicy = [
      inspected.caption,
      ...(inspected.onScreenStickers || []),
      transcriptText || '',
    ]
      .filter(Boolean)
      .join(' ');
    const policyViolations = scanBlacklistViolations(combinedTextForPolicy);

    const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
      inputUrl,
      platform: 'tiktok',
      contentType: parsed.contentType ?? 'video',
      contentId: inspected.videoId,
      canonicalUrl: inspected.videoUrl,
      status: 'LIVE',
      statusDetail: null,
      author: {
        handle: inspected.author.handle,
        name: inspected.author.nickname,
        profileUrl: `https://www.tiktok.com/@${inspected.author.handle}`,
        followers: inspected.author.followers,
      },
      publishedAt: inspected.publishedAt,
      publishedTimeSec: inspected.createTimeSec || null,
      airedAtVn: formatVnDateTimeFromUnixSec(inspected.createTimeSec, inspected.publishedAt),
      caption: inspected.caption,
      hashtags,
      mentions: extractMentions(inspected.caption),
      durationSeconds: inspected.durationSeconds || null,
      metrics: {
        views: inspected.views,
        likes: inspected.likes,
        comments: inspected.comments,
        shares: inspected.shares,
        saves: inspected.saves,
      },
      hasProductLink: inspected.hasCartAnchor,
      productTitle: inspected.cartAnchorTitle || null,
      productUrl: inspected.cartAnchorUrl || null,
      productId: inspected.cartProductId || null,
      sellerId: inspected.cartSellerId || null,
      cartProducts: inspected.cartProducts || [],
      onScreenStickers: inspected.onScreenStickers,
      transcriptText,
      playableUrl: inspected.playableUrl || null,
      coverUrl: inspected.coverUrl || null,
      firstProductAppearanceSec: mentionDetection.firstProductAppearanceSec,
      firstProductMentionTimeLabel: mentionDetection.firstProductMentionTimeLabel || null,
      firstProductMentionTerm: mentionDetection.firstProductMentionTerm || null,
      firstProductMentionQuote: mentionDetection.firstProductMentionQuote || null,
      bestHoldingMomentSec,
      bestHoldingMomentTimeLabel,
      bestHoldingMomentQuote,
      productMentionMoments: mentionDetection.productMentionMoments,
      policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
      limitations: [],
      source: inspected.cartDebug ? `tiktok-ssr-waf (${inspected.cartDebug})` : 'tiktok-ssr-waf',
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  }

  // Shopee Video / Facebook / Instagram dedicated parsers
  try {
    const res = await fetch(parsed.url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': parsed.platform === 'shopee' ? BROWSER_UA : LINK_PREVIEW_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
      cache: 'no-store',
    });
    const finalUrl = res.url || parsed.url;
    const html = await res.text();

    if (parsed.platform === 'shopee') {
      const nextDataRaw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
      if (res.status === 404) {
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'shopee',
          contentType: 'video',
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: 'UNAVAILABLE',
          statusDetail: 'Video Shopee không tồn tại.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: null,
          productTitle: null,
          limitations: [],
          source: 'shopee-share-page',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }
      if (nextDataRaw) {
        try {
          const media = JSON.parse(nextDataRaw)?.props?.pageProps?.mediaInfo;
          if (!media?.video) {
            const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
              inputUrl,
              platform: 'shopee',
              contentType: 'video',
              contentId: parsed.contentId,
              canonicalUrl: parsed.url,
              status: 'UNAVAILABLE',
              statusDetail: 'Video Shopee đã bị xoá hoặc ẩn.',
              author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
              publishedAt: null,
              caption: '',
              hashtags: [],
              mentions: [],
              durationSeconds: null,
              metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
              hasProductLink: null,
              productTitle: null,
              limitations: [],
              source: 'shopee-share-page',
              fetchedAt,
              fromCache: false,
              durationMs: Date.now() - started,
            };
            const checks = buildLinkAirChecks(base, expect);
            return { ...base, checks, verdict: verdictOf(checks) };
          }
          const handle = media.userInfo?.videoUserName?.toLowerCase() ?? parsed.handle ?? null;
          const host = new URL(parsed.url).hostname.replace(/^sv\./, '');
          const count = media.count ?? {};
          const caption = String(media.video.caption ?? '').trim();
          const captionShoppingUrls = extractShoppingUrlsFromText(caption);
          const policyViolations = scanBlacklistViolations(caption);
          const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
            inputUrl,
            platform: 'shopee',
            contentType: 'video',
            contentId: parsed.contentId,
            canonicalUrl: parsed.url,
            status: 'LIVE',
            statusDetail: null,
            author: {
              handle,
              name: handle,
              profileUrl: handle ? `https://${host}/${handle}` : null,
              followers: null,
            },
            publishedAt: null,
            caption,
            hashtags: extractHashtags(caption),
            mentions: extractMentions(caption),
            durationSeconds: media.video.duration ? Math.round(media.video.duration / 1000) : null,
            metrics: {
              views: count.viewCount ?? null,
              likes: count.likeCount ?? null,
              comments: count.commentCount ?? null,
              shares: count.shareCount ?? null,
              saves: null,
            },
            hasProductLink: captionShoppingUrls.length > 0 ? true : null,
            productTitle:
              captionShoppingUrls.length > 0 ? 'Link mua hàng gắn trong bài đăng' : null,
            productUrl: captionShoppingUrls[0] || null,
            cartProducts: captionShoppingUrls.map((url) => ({
              productId: '',
              title: 'Link mua hàng gắn trong bài đăng',
              productUrl: url,
              source: 'Caption Link',
            })),
            policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
            limitations: [
              'Trang chia sẻ Shopee Video không công khai lượt xem, ngày đăng và sản phẩm gắn kèm.',
              'Ngày air và GMV cần đối chiếu trong Shopee Affiliate / Seller Center.',
            ],
            source: 'shopee-share-page',
            fetchedAt,
            fromCache: false,
            durationMs: Date.now() - started,
          };
          const checks = buildLinkAirChecks(base, expect);
          return { ...base, checks, verdict: verdictOf(checks) };
        } catch {
          // Rơi xuống nhánh meta nếu JSON lỗi
        }
      }
    }

    if (parsed.platform === 'facebook') {
      const ogUrl = readMeta(html, 'og:url') ?? finalUrl;
      const ogTitle = readMeta(html, 'og:title');
      const ogDescription = readMeta(html, 'og:description') ?? '';

      if (res.status === 404 || !ogTitle || /\/login(\.php)?|checkpoint/.test(finalUrl)) {
        const isBlocked = /\/login|checkpoint/.test(finalUrl) || (res.status >= 400 && res.status !== 404);
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'facebook',
          contentType: parsed.contentType,
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: isBlocked ? 'BLOCKED' : 'UNAVAILABLE',
          statusDetail: isBlocked
            ? 'Facebook yêu cầu đăng nhập để xem bài này (bài riêng tư hoặc bị chặn IP).'
            : 'Bài đã bị xoá, ẩn hoặc chỉ bạn bè xem được.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: null,
          productTitle: null,
          limitations: [],
          source: 'facebook-html',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }

      const idFromUrl =
        ogUrl.match(/\/(?:reel|videos)\/(\d{6,})/)?.[1] ??
        ogUrl.match(/[?&]v=(\d{6,})/)?.[1] ??
        ogUrl.match(/\/posts\/([\w]+)/)?.[1] ??
        null;
      const contentId = idFromUrl ?? parsed.contentId;
      const contentType = /\/reel\//.test(ogUrl)
        ? 'reel'
        : /\/videos\/|watch/.test(ogUrl)
        ? 'video'
        : parsed.contentType ?? 'post';

      const anchor = contentId
        ? html.indexOf(
            `"associated_video":{"is_live_streaming":false,"is_profile_video":false,"id":"${contentId}"`
          )
        : -1;
      const fromAnchor = anchor >= 0 ? anchor : 0;
      const titleStats = parseFacebookOgTitle(ogTitle);

      const views =
        readJsonNumber(html, 'video_view_count', fromAnchor) ??
        readJsonNumber(html, 'play_count') ??
        titleStats.views;
      const reactionsMatch = html.match(/"reaction_count":\{"count":(\d+)/);
      const reactions = reactionsMatch ? Number(reactionsMatch[1]) : titleStats.reactions;
      const comments = readJsonNumber(html, 'total_comment_count');
      const shareMatch =
        html.match(/"share_count":\{"count":(\d+)/) ??
        html.match(/"share_count_reduced":"([\d.,KMB]+)"/);
      const shares = shareMatch ? parseCompactNumber(shareMatch[1]) : null;
      const publishTime =
        readJsonNumber(html, 'publish_time') ?? readJsonNumber(html, 'creation_time');
      const durationMs = readJsonNumber(html, 'playable_duration_in_ms');

      const pageMatch = html.match(
        /"owner_as_page":\{"id":"(\d+)","name":"((?:[^"\\]|\\.)*)"/
      );
      let ownerName = titleStats.ownerName;
      if (pageMatch) {
        try {
          ownerName = JSON.parse(`"${pageMatch[2]}"`) as string;
        } catch {
          ownerName = pageMatch[2];
        }
      }
      const vanity = readJsonString(html, 'vanity') ?? parsed.handle;
      const messageAt = html.indexOf('"message":{"text"');
      const caption = (
        (messageAt >= 0 ? readJsonString(html, 'text', messageAt) : null) ?? ogDescription
      ).trim();
      const hasProductTag =
        /"comet_product_tag_feed_overlay_renderer":\{/.test(html) ||
        /"product_item":\{/.test(html);
      const captionShoppingUrls = extractShoppingUrlsFromText(caption);
      const hasAnyShopLink = hasProductTag || captionShoppingUrls.length > 0;
      const policyViolations = scanBlacklistViolations(caption);

      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: 'facebook',
        contentType,
        contentId,
        canonicalUrl: ogUrl.split('?')[0],
        status: 'LIVE',
        statusDetail: null,
        author: {
          handle: vanity ? vanity.toLowerCase() : null,
          name: ownerName,
          profileUrl: vanity ? `https://www.facebook.com/${vanity}` : null,
          followers: null,
        },
        publishedAt: unixSecondsToIso(publishTime),
        caption,
        hashtags: extractHashtags(caption),
        mentions: extractMentions(caption),
        durationSeconds: durationMs ? Math.round(durationMs / 1000) : null,
        metrics: { views, likes: reactions, comments, shares, saves: null },
        hasProductLink: hasAnyShopLink ? true : null,
        productTitle:
          captionShoppingUrls.length > 0
            ? 'Link mua hàng gắn trong bài đăng'
            : hasProductTag
            ? 'Sản phẩm gắn thẻ trên Facebook'
            : null,
        productUrl: captionShoppingUrls[0] || null,
        cartProducts: captionShoppingUrls.map((url) => ({
          productId: '',
          title: 'Link mua hàng gắn trong bài đăng',
          productUrl: url,
          source: 'Caption Link',
        })),
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        limitations: [
          '"Likes" là tổng reactions (thích, yêu thích, haha...).',
          'Không đọc được số follower của trang.',
        ],
        source: 'facebook-html',
        fetchedAt,
        fromCache: false,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }

    if (parsed.platform === 'instagram') {
      const pageTitle = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';
      if (res.status === 404 || /Page Not Found/i.test(pageTitle)) {
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'instagram',
          contentType: parsed.contentType ?? 'post',
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: 'UNAVAILABLE',
          statusDetail: 'Bài Instagram đã bị xoá, ẩn hoặc tài khoản riêng tư.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: null,
          productTitle: null,
          limitations: [],
          source: 'instagram-meta',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }

      const description = readMeta(html, 'og:description') ?? readMeta(html, 'description');
      const ogUrl = readMeta(html, 'og:url');
      if (res.status === 429 || !description || !ogUrl) {
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'instagram',
          contentType: parsed.contentType ?? 'post',
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: 'BLOCKED',
          statusDetail:
            res.status === 429
              ? 'Instagram giới hạn tần suất truy cập (HTTP 429). Thử lại sau.'
              : 'Instagram trả trang đăng nhập thay vì bài đăng.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: null,
          productTitle: null,
          limitations: [],
          source: 'instagram-meta',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }

      const igParsed = parseInstagramDescription(description);
      const ownerFromUrl =
        ogUrl.match(/instagram\.com\/([\w.]+)\/(?:p|reel)\//)?.[1]?.toLowerCase() ?? null;
      const handle = igParsed.handle ?? ownerFromUrl ?? parsed.handle;
      const ogTitle = readMeta(html, 'og:title') ?? '';
      const displayName = ogTitle.match(/^(.*?) on Instagram/)?.[1]?.trim() || null;
      const captionShoppingUrls = extractShoppingUrlsFromText(igParsed.caption);
      const policyViolations = scanBlacklistViolations(igParsed.caption);

      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: 'instagram',
        contentType: parsed.contentType ?? 'post',
        contentId: parsed.contentId,
        canonicalUrl: parsed.url,
        status: 'LIVE',
        statusDetail: null,
        author: {
          handle,
          name: displayName,
          profileUrl: handle ? `https://www.instagram.com/${handle}/` : null,
          followers: null,
        },
        publishedAt: igParsed.publishedAt,
        caption: igParsed.caption,
        hashtags: extractHashtags(igParsed.caption),
        mentions: extractMentions(igParsed.caption),
        durationSeconds: null,
        metrics: {
          views: null,
          likes: igParsed.likes,
          comments: igParsed.comments,
          shares: null,
          saves: null,
        },
        hasProductLink: captionShoppingUrls.length > 0 ? true : null,
        productTitle:
          captionShoppingUrls.length > 0 ? 'Link mua hàng gắn trong bài đăng' : null,
        productUrl: captionShoppingUrls[0] || null,
        cartProducts: captionShoppingUrls.map((url) => ({
          productId: '',
          title: 'Link mua hàng gắn trong bài đăng',
          productUrl: url,
          source: 'Caption Link',
        })),
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        limitations: [
          'Instagram không công khai lượt xem reel khi chưa đăng nhập.',
          'Không đọc được nhãn "Paid partnership" và link sản phẩm.',
          'Likes và bình luận là số làm tròn (VD 1.2K).',
        ],
        source: 'instagram-meta',
        fetchedAt,
        fromCache: false,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }

    const ogTitle = readMeta(html, 'og:title') || '';
    const ogDesc = readMeta(html, 'og:description') || readMeta(html, 'description') || '';

    if (res.status === 404 || (!ogTitle && !ogDesc)) {
      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: parsed.platform,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
        canonicalUrl: parsed.url,
        status: res.status === 404 ? 'UNAVAILABLE' : 'BLOCKED',
        statusDetail:
          res.status === 404
            ? 'Bài đăng không tồn tại hoặc đã bị xoá.'
            : 'Nền tảng yêu cầu đăng nhập để xem bài đăng này.',
        author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
        publishedAt: null,
        caption: '',
        hashtags: [],
        mentions: [],
        durationSeconds: null,
        metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
        hasProductLink: null,
        productTitle: null,
        productUrl: null,
        limitations: [],
        source: `${parsed.platform}-meta`,
        fetchedAt,
        fromCache: false,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }

    const views = parseCompactNumber(
      ogTitle.match(/([\d.,]+\s?[KMB]?)\s+(?:views|lượt xem)/i)?.[1]
    );
    const likes = parseCompactNumber(
      (ogTitle + ' ' + ogDesc).match(/([\d.,]+\s?[KMB]?)\s+(?:likes?|reactions?|cảm xúc)/i)?.[1]
    );
    const comments = parseCompactNumber(
      ogDesc.match(/([\d.,]+\s?[KMB]?)\s+comments?\b/i)?.[1]
    );
    const caption = ogDesc || ogTitle;
    const captionShoppingUrls = extractShoppingUrlsFromText(caption);
    const hasCaptionShopUrl = captionShoppingUrls.length > 0;
    const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
      inputUrl,
      platform: parsed.platform,
      contentType: parsed.contentType ?? 'video',
      contentId: parsed.contentId,
      canonicalUrl: parsed.url,
      status: 'LIVE',
      statusDetail: null,
      author: {
        handle: parsed.handle,
        name: parsed.handle,
        profileUrl: null,
        followers: null,
      },
      publishedAt: null,
      caption,
      hashtags: extractHashtags(caption),
      mentions: extractMentions(caption),
      durationSeconds: null,
      metrics: { views, likes, comments, shares: null, saves: null },
      hasProductLink: hasCaptionShopUrl ? true : null,
      productTitle: hasCaptionShopUrl ? 'Link mua hàng gắn trong bài đăng' : null,
      productUrl: captionShoppingUrls[0] || null,
      cartProducts: captionShoppingUrls.map((url) => ({
        productId: '',
        title: 'Link mua hàng gắn trong bài đăng',
        productUrl: url,
        source: 'Caption Link',
      })),
      limitations: [
        'Một số chỉ số không công khai qua thẻ meta của nền tảng.',
      ],
      source: `${parsed.platform}-meta`,
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  } catch (err) {
    const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
      inputUrl,
      platform: parsed.platform,
      contentType: parsed.contentType,
      contentId: parsed.contentId,
      canonicalUrl: parsed.url,
      status: 'ERROR',
      statusDetail: err instanceof Error ? err.message : 'Lỗi kết nối khi kiểm tra link.',
      author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
      publishedAt: null,
      caption: '',
      hashtags: [],
      mentions: [],
      durationSeconds: null,
      metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
      hasProductLink: null,
      productTitle: null,
      limitations: [],
      source: 'serverless-fallback',
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  }
}
