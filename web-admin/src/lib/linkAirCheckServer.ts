import {
  type LinkAirAffiliateVerification,
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
  const trimmed = raw.trim();
  const normalized =
    /^\d+,\d{1,2}\s*(?:[KMBN]|Tr)$/i.test(trimmed)
      ? trimmed.replace(',', '.')
      : trimmed.replace(/,/g, '');
  const m = normalized.match(/^([\d.]+)\s*([KMBN]|Tr)?$/i);
  if (!m) {
    const digits = Number(normalized.replace(/[^\d]/g, ''));
    return Number.isFinite(digits) && digits > 0 ? digits : null;
  }
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;
  const unit = (m[2] || '').toUpperCase();
  const mult =
    unit === 'B'
      ? 1_000_000_000
      : unit === 'M' || unit === 'TR'
      ? 1_000_000
      : unit === 'K' || unit === 'N'
      ? 1_000
      : 1;
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

/**
 * Giải mã trực tiếp 11 ký tự đầu của shortcode Meta (Instagram / Threads) ra Unix Timestamp (giây).
 * Cấu trúc Snowflake 64-bit của Meta: (id >> 23n) + 1314220021721n (ms).
 */
function decodeMetaShortcodeTimestampSec(shortcode?: string | null): number | null {
  if (!shortcode || shortcode.length < 9 || /^\d+$/.test(shortcode)) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  const six = BigInt(6);
  const shift23 = BigInt(23);
  const epochMs = BigInt('1314220021721');
  for (const ch of shortcode.slice(0, 11)) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) return null;
    id = (id << six) | BigInt(idx);
  }
  const ms = Number((id >> shift23) + epochMs);
  const sec = Math.floor(ms / 1000);
  return sec > 1_400_000_000 && sec < 2_200_000_000 ? sec : null;
}

/**
 * Giải mã thời điểm tải lên từ URL media Shopee MMS (vn-11110124-6vasd-mtxhco9p48ay4f.16003551791183408...).
 * - 8 ký tự đầu của định danh MMS (VD: "mtxhco9p") là Unix timestamp (ms) hệ cơ số 36.
 * - Hoặc chuỗi ".1600355<10_chữ_số_unix_sec>." trong tên file MP4.
 */
function decodeShopeeMmsTimestampSec(...urls: Array<string | null | undefined>): number | null {
  for (const raw of urls) {
    if (!raw) continue;
    const directSecMatch = raw.match(/\.\d{7}(1[6789]\d{8})\./);
    if (directSecMatch) {
      const sec = Number(directSecMatch[1]);
      if (sec > 1_500_000_000 && sec < 2_200_000_000) return sec;
    }
    const mmsMatch = raw.match(/vn-\d+-[0-9a-z]+-([0-9a-z]{8})[0-9a-z]{4,}/i);
    if (mmsMatch) {
      const ms = parseInt(mmsMatch[1].toLowerCase(), 36);
      const sec = Math.floor(ms / 1000);
      if (sec > 1_500_000_000 && sec < 2_200_000_000) return sec;
    }
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
    const shareMatch = path.match(/^\/share\/(?:(p|reel|reels)\/)?([\w-]{5,})/i);
    if (shareMatch) {
      const kind = shareMatch[1] === 'p' ? 'post' : 'reel';
      return {
        platform: 'instagram',
        url: url.toString(),
        contentId: shareMatch[2],
        contentType: kind,
        handle: null,
        isShortLink: true,
      };
    }
    const storyMatch = path.match(/^\/stories\/([\w.]+)\/(\d{6,})/i);
    if (storyMatch) {
      return {
        platform: 'instagram',
        url: `https://www.instagram.com/stories/${storyMatch[1]}/${storyMatch[2]}/`,
        contentId: storyMatch[2],
        contentType: 'reel',
        handle: storyMatch[1].toLowerCase(),
        isShortLink: false,
      };
    }
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
    const handleOnly = path.match(/^\/([\w.]+)\/?$/);
    return {
      platform: 'instagram',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle:
        handleOnly && !['explore', 'accounts', 'direct', 'reels'].includes(handleOnly[1].toLowerCase())
          ? handleOnly[1].toLowerCase()
          : null,
      isShortLink: false,
    };
  }

  if (
    hostMatches(host, 'facebook.com') ||
    host === 'fb.watch' ||
    host === 'fb.com' ||
    hostMatches(host, 'fb.com')
  ) {
    // Nếu URL bị chuyển hướng về /login/?next=... thì bóc URL gốc bên trong tham số next
    if (/^\/login(\.php)?\/?$/i.test(path)) {
      const nextParam = url.searchParams.get('next');
      if (nextParam && /^https?:\/\//i.test(nextParam)) {
        const innerFb = parseLink(nextParam);
        if (innerFb) return innerFb;
      }
    }
    if (host === 'fb.watch') {
      const watchToken = path.replace(/^\/+|\/+$/g, '').split('/')[0] || null;
      return {
        platform: 'facebook',
        url: url.toString(),
        contentId: watchToken,
        contentType: 'video',
        handle: null,
        isShortLink: true,
      };
    }
    const shareMatch =
      path.match(/^\/share\/(r|v|p)\/([\w-]{4,})/i) ||
      path.match(/^\/share\/([\w-]{4,})/i);
    if (shareMatch) {
      const shareKind = shareMatch[2] ? shareMatch[1].toLowerCase() : 'p';
      const shareCode = shareMatch[2] || shareMatch[1];
      return {
        platform: 'facebook',
        url: url.toString(),
        contentId: shareCode,
        contentType: shareKind === 'r' ? 'reel' : shareKind === 'v' ? 'video' : 'post',
        handle: null,
        isShortLink: true,
      };
    }
    const canonical = new URL(url.toString());
    canonical.hostname = 'www.facebook.com';
    const reel = path.match(/^\/reel\/([\w-]{6,})/);
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
    const video =
      path.match(/^\/([^/]+)\/videos\/(?:[^/]+\/)?(\d{6,})/) ||
      path.match(/^\/videos\/(\d{6,})/);
    if (video) {
      canonical.search = '';
      canonical.hash = '';
      const vidId = video[2] || video[1];
      const owner = video[2] ? video[1] : null;
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: vidId,
        contentType: 'video',
        handle: owner && !/^\d+$/.test(owner) ? owner.toLowerCase() : null,
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
    const groupPost = path.match(/^\/groups\/([^/]+)\/(?:posts|permalink)\/([\w.-]+)/i);
    if (groupPost) {
      canonical.search = '';
      canonical.hash = '';
      return {
        platform: 'facebook',
        url: canonical.toString(),
        contentId: groupPost[2],
        contentType: 'post',
        handle: !/^\d+$/.test(groupPost[1]) ? groupPost[1].toLowerCase() : null,
        isShortLink: false,
      };
    }
    const post = path.match(/^\/([^/]+)\/posts\/([\w.-]+)/);
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

  if (
    host === 'shp.ee' ||
    hostMatches(host, 'shp.ee') ||
    host === 's.shopee.vn' ||
    hostMatches(host, 's.shopee.vn')
  ) {
    const cleanSegments = path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const shortCode = cleanSegments[cleanSegments.length - 1] || null;
    return {
      platform: 'shopee',
      url: url.toString(),
      contentId: shortCode,
      contentType: 'video',
      handle: null,
      isShortLink: true,
    };
  }

  // Threads: threads.net/@<handle>/post/<id>, threads.com/@<handle>/post/<id>, threads.net/t/<id>
  if (hostMatches(host, 'threads.net') || hostMatches(host, 'threads.com')) {
    const postMatch =
      path.match(/^\/@([^/]+)\/post\/([\w-]+)/i) ||
      path.match(/^\/([^/@]+)\/post\/([\w-]+)/i);
    if (postMatch && !['t', 'post', 'login', 'search', 'settings'].includes(postMatch[1].toLowerCase())) {
      const handle = decodeURIComponent(postMatch[1]).replace(/^@/, '').toLowerCase();
      const postId = postMatch[2];
      return {
        platform: 'threads',
        url: `https://www.threads.net/@${handle}/post/${postId}`,
        contentId: postId,
        contentType: 'post',
        handle,
        isShortLink: false,
      };
    }
    const shortThread = path.match(/^\/(?:t|post)\/([\w-]+)/i);
    if (shortThread) {
      return {
        platform: 'threads',
        url: `https://www.threads.net/t/${shortThread[1]}`,
        contentId: shortThread[1],
        contentType: 'post',
        handle: null,
        isShortLink: false,
      };
    }
    const handleOnly = path.match(/^\/@?([^/]+)\/?$/);
    return {
      platform: 'threads',
      url: url.toString(),
      contentId: null,
      contentType: 'post',
      handle: handleOnly ? decodeURIComponent(handleOnly[1]).replace(/^@/, '').toLowerCase() : null,
      isShortLink: false,
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
    const rawRedir =
      url.searchParams.get('redir') ||
      url.searchParams.get('deep_and_deferred') ||
      url.searchParams.get('url');
    if (rawRedir) {
      let decodedRedir = rawRedir;
      try {
        if (decodedRedir.startsWith('http%3A') || decodedRedir.startsWith('https%3A')) {
          decodedRedir = decodeURIComponent(decodedRedir);
        }
      } catch {
        // ignore decode error
      }
      if (decodedRedir.startsWith('http') && decodedRedir !== url.toString()) {
        const innerParsed = parseLink(decodedRedir);
        if (innerParsed && innerParsed.contentId) return innerParsed;
      }
    }
    const m =
      path.match(/\/(?:share-video|video)\/([\w=-]+)/i) ||
      path.match(/\/universal-link\/(?:share-video|video)\/([\w=-]+)/i);
    const queryVid =
      url.searchParams.get('videoId') ||
      url.searchParams.get('share_video_id') ||
      url.searchParams.get('vid') ||
      url.searchParams.get('svid');
    const contentId = m?.[1] || queryVid || null;
    if (contentId) {
      const cleanHost = host.startsWith('sv.') ? host : `sv.${host.replace(/^www\./, '')}`;
      return {
        platform: 'shopee',
        url: `https://${cleanHost}/share-video/${contentId}`,
        contentId,
        contentType: 'video',
        handle: url.searchParams.get('username')?.toLowerCase() || null,
        isShortLink: false,
      };
    }
    if (/\/universal-link\//i.test(path)) {
      return {
        platform: 'shopee',
        url: url.toString(),
        contentId: null,
        contentType: 'video',
        handle: null,
        isShortLink: true,
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
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    });
    let finalUrl = res.url || url;
    try {
      await res.body?.cancel();
    } catch {
      // ignore stream cancel error
    }
    // Bóc tiếp nếu finalUrl là universal-link của Shopee hoặc /login/?next=... của Facebook
    try {
      const parsedFinal = new URL(finalUrl);
      const nextOrRedir =
        parsedFinal.searchParams.get('redir') ||
        parsedFinal.searchParams.get('next') ||
        parsedFinal.searchParams.get('ulp');
      if (nextOrRedir && /^https?:\/\//i.test(nextOrRedir)) {
        finalUrl = nextOrRedir;
      }
    } catch {
      // ignore URL parse error
    }
    return finalUrl;
  } catch {
    return url;
  }
}

/**
 * Xác thực & bóc tách trực tiếp Link Affiliate đích (s.shopee.vn, shp.ee, shopee.vn, lazada, linktr.ee...)
 * phục vụ nghiệm thu đa sàn (Threads, Facebook Comment đầu, Instagram Bio).
 */
export async function verifyAffiliateTargetUrl(
  rawInputUrl?: string | null,
  expect: LinkAirExpectation = {}
): Promise<LinkAirAffiliateVerification | undefined> {
  const cleaned = (rawInputUrl || '').trim();
  if (!cleaned || !/^(https?:\/\/|[a-z0-9-]+\.(shopee|shp|lazada|tiktok|linktr|beacons|bio))/i.test(cleaned)) {
    return undefined;
  }
  const inputObj = toUrl(cleaned);
  if (!inputObj) return undefined;

  const host = inputObj.hostname.toLowerCase();
  const isShortLink =
    host === 's.shopee.vn' ||
    hostMatches(host, 's.shopee.vn') ||
    host === 'shp.ee' ||
    hostMatches(host, 'shp.ee') ||
    host === 'vt.tiktok.com' ||
    host === 'vm.tiktok.com' ||
    host === 's.lazada.vn' ||
    host === 'bit.ly' ||
    host === 'tinyurl.com' ||
    /\/universal-link\//i.test(inputObj.pathname);

  let resolvedUrl = inputObj.toString();
  let isLive = true;

  // Thử giải mã redirect thực tế cho link rút gọn
  if (isShortLink) {
    try {
      const res = await fetch(inputObj.toString(), {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        signal: AbortSignal.timeout(5500),
        cache: 'no-store',
      });
      if (res.status === 404 || res.status === 410) {
        isLive = false;
      }
      if (res.url) {
        resolvedUrl = res.url;
      }
      try {
        await res.body?.cancel();
      } catch {
        // ignore
      }
    } catch {
      // Nếu mạng chặn outbound tới shortener thì vẫn phân tích cấu trúc link gốc
    }
  }

  // Nếu resolvedUrl chứa tham số redir=... (Shopee universal-link), bóc URL đích thực sự
  const trackingParams: string[] = [];
  const collectTrackingFromUrl = (uStr: string) => {
    try {
      const u = new URL(uStr);
      const keys = [
        'uls_trackid',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'mmp_pid',
        'af_siteid',
        'sub_id',
        'aff_sid',
        'gads_t_sig',
      ];
      for (const k of keys) {
        const val = u.searchParams.get(k);
        if (val) {
          trackingParams.push(`${k}=${val.slice(0, 28)}`);
        }
      }
      const innerRedir = u.searchParams.get('redir') || u.searchParams.get('ulp');
      if (innerRedir && /^https?:\/\//i.test(innerRedir)) {
        collectTrackingFromUrl(innerRedir);
        resolvedUrl = innerRedir;
      }
    } catch {
      // ignore
    }
  };
  collectTrackingFromUrl(inputObj.toString());
  if (resolvedUrl !== inputObj.toString()) {
    collectTrackingFromUrl(resolvedUrl);
  }

  const finalObj = toUrl(resolvedUrl) || inputObj;
  const finalHost = finalObj.hostname.toLowerCase();
  const finalPath = finalObj.pathname;

  let platform: LinkAirAffiliateVerification['platform'] = 'external';
  if (
    finalHost.includes('shopee') ||
    finalHost.includes('shp.ee') ||
    host.includes('shopee') ||
    host.includes('shp.ee')
  ) {
    platform = 'shopee';
  } else if (finalHost.includes('tiktok')) {
    platform = 'tiktok';
  } else if (finalHost.includes('lazada')) {
    platform = 'lazada';
  } else if (/(linktr\.ee|beacons\.ai|bio\.link|instabio\.cc)/i.test(finalHost)) {
    platform = 'bio_aggregator';
  }

  // Trích xuất Shop ID & Item ID nếu là link Shopee / TikTok Shop
  let shopId: string | null = null;
  let itemId: string | null = null;
  const shopeeSlugMatch = finalPath.match(/-i\.(\d{5,})\.(\d{6,})/);
  const shopeeProdMatch = finalPath.match(/\/product\/(\d{5,})\/(\d{6,})/i);
  const tiktokPdpMatch = finalPath.match(/\/pdp\/(?:[^/]+\/)?(\d{15,22})/i);

  if (shopeeSlugMatch) {
    shopId = shopeeSlugMatch[1];
    itemId = shopeeSlugMatch[2];
  } else if (shopeeProdMatch) {
    shopId = shopeeProdMatch[1];
    itemId = shopeeProdMatch[2];
  } else if (tiktokPdpMatch) {
    itemId = tiktokPdpMatch[1];
  } else {
    shopId = finalObj.searchParams.get('shopid') || finalObj.searchParams.get('shop_id') || null;
    itemId = finalObj.searchParams.get('itemid') || finalObj.searchParams.get('item_id') || null;
  }

  const hasAffiliateTracking =
    trackingParams.length > 0 ||
    host === 's.shopee.vn' ||
    hostMatches(host, 's.shopee.vn') ||
    host === 'shp.ee' ||
    hostMatches(host, 'shp.ee') ||
    host === 's.lazada.vn';

  if (!isLive) {
    return {
      inputUrl: cleaned,
      resolvedUrl,
      isLive: false,
      isShortLink,
      platform,
      shopId,
      itemId,
      hasAffiliateTracking,
      trackingParams: [...new Set(trackingParams)],
      status: 'FAIL',
      detail: `Link Affiliate (${cleaned}) trả về lỗi 404 hoặc đã hết hạn.`,
    };
  }

  if (platform === 'shopee' || platform === 'tiktok' || platform === 'lazada') {
    const idSummary =
      shopId && itemId
        ? ` · Shop ID: ${shopId} · Mã SP: ${itemId}`
        : itemId
        ? ` · Mã SP: ${itemId}`
        : '';
    const trackSummary =
      trackingParams.length > 0
        ? ` · Tracking: ${[...new Set(trackingParams)].slice(0, 2).join(', ')}`
        : hasAffiliateTracking
        ? ` · Shortlink Affiliate hợp lệ (${host})`
        : '';
    return {
      inputUrl: cleaned,
      resolvedUrl,
      isLive: true,
      isShortLink,
      platform,
      shopId,
      itemId,
      hasAffiliateTracking,
      trackingParams: [...new Set(trackingParams)],
      status: 'PASS',
      detail: `Đã xác thực Link ${platform === 'shopee' ? 'Shopee Affiliate' : platform === 'lazada' ? 'Lazada Affiliate' : 'TikTok Shop'}${idSummary}${trackSummary}.`,
    };
  }

  if (platform === 'bio_aggregator') {
    return {
      inputUrl: cleaned,
      resolvedUrl,
      isLive: true,
      isShortLink,
      platform,
      shopId: null,
      itemId: null,
      hasAffiliateTracking: true,
      trackingParams: [...new Set(trackingParams)],
      status: 'PASS',
      detail: `Đã xác thực trang Bio tổng hợp link (${finalHost})${expect.linkPlacement ? ` đúng vị trí ${expect.linkPlacement}` : ''}.`,
    };
  }

  return {
    inputUrl: cleaned,
    resolvedUrl,
    isLive: true,
    isShortLink,
    platform,
    shopId,
    itemId,
    hasAffiliateTracking,
    trackingParams: [...new Set(trackingParams)],
    status: 'WARN',
    detail: `Link đích (${finalHost}) hoạt động nhưng không phải định dạng Shopee / Lazada / TikTok Affiliate tiêu chuẩn.`,
  };
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
    | 'affiliateVerification'
  >,
  expect: LinkAirExpectation = {}
): LinkAirCheckItem[] {
  const checks: LinkAirCheckItem[] = [];

  if (!input.platform) {
    checks.push({
      key: 'link_format',
      label: 'Định dạng link',
      status: 'FAIL',
      detail: 'Không nhận ra nền tảng. Hỗ trợ TikTok, Threads, Shopee Video, Facebook, Instagram, YouTube.',
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

  if (input.affiliateVerification) {
    checks.push({
      key: 'affiliate_target_verify',
      label: 'Xác thực Link Affiliate đích',
      status: input.affiliateVerification.status,
      detail: input.affiliateVerification.detail,
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
      input.hasProductLink === true || input.affiliateVerification?.status === 'PASS'
        ? {
            key: 'product_link',
            label: expect.linkPlacement ? `Vị trí gắn link (${expect.linkPlacement})` : 'Gắn link sản phẩm / Affiliate',
            status: 'PASS',
            detail:
              input.affiliateVerification?.status === 'PASS'
                ? input.affiliateVerification.detail
                : `Đã phát hiện gắn link/giỏ hàng${input.productTitle ? `: ${input.productTitle}` : ''}${
                    input.productUrl ? ` (${input.productUrl})` : ''
                  }.`,
          }
        : input.hasProductLink === false
        ? {
            key: 'product_link',
            label: expect.linkPlacement ? `Vị trí gắn link (${expect.linkPlacement})` : 'Gắn link sản phẩm / Affiliate',
            status: 'FAIL',
            detail: 'Bài chưa gắn giỏ hàng / link sản phẩm.',
          }
        : {
            key: 'product_link',
            label: expect.linkPlacement ? `Vị trí gắn link (${expect.linkPlacement})` : 'Gắn link sản phẩm / Affiliate',
            status: 'WARN',
            detail:
              'Không thấy link sản phẩm công khai trong HTML bài đăng (nếu KOC gắn ở Comment đầu / Bio, hãy dán Link Affiliate đích vào cột bên cạnh hoặc bấm Ghi nhận trên Extension trình duyệt).',
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
  let views: number | null = null;
  let likes: number | null = null;
  let comments: number | null = null;
  let durationSeconds: number | null = null;
  let publishedAt: string | null = null;
  let publishedTimeSec: number | null = null;
  let description = '';

  const watchUrl = contentId ? `https://www.youtube.com/watch?v=${contentId}` : canonicalUrl;

  try {
    const [oembedRes, watchRes] = await Promise.all([
      fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl)}`, {
        headers: { 'User-Agent': BROWSER_UA },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null),
      fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      }).catch(() => null),
    ]);

    if (oembedRes?.ok) {
      const json = (await oembedRes.json().catch(() => null)) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
      } | null;
      thumbnail = json?.thumbnail_url || null;
      status = 'LIVE';
      title = json?.title || '';
      authorName = json?.author_name || null;
      profileUrl = json?.author_url || null;
    } else if (oembedRes && (oembedRes.status === 401 || oembedRes.status === 403 || oembedRes.status === 404)) {
      status = 'UNAVAILABLE';
      statusDetail = 'Video đã bị xoá, để riêng tư hoặc không cho nhúng.';
    } else if (oembedRes) {
      statusDetail = `YouTube trả lỗi HTTP ${oembedRes.status}.`;
    }

    if (watchRes?.ok) {
      const html = await watchRes.text();
      const rawViews =
        html.match(/"viewCount":"(\d+)"/)?.[1] ||
        html.match(/itemprop="interactionCount"\s+content="(\d+)"/i)?.[1];
      if (rawViews) views = Number(rawViews);
      const rawLen = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
      if (rawLen && Number(rawLen) > 0) durationSeconds = Number(rawLen);
      const rawPub =
        html.match(/"publishDate":"([^"]+)"/)?.[1] ||
        html.match(/"uploadDate":"([^"]+)"/)?.[1] ||
        html.match(/itemprop="datePublished"\s+content="([^"]+)"/i)?.[1];
      if (rawPub) {
        const parsedMs = Date.parse(rawPub);
        if (Number.isFinite(parsedMs)) {
          publishedTimeSec = Math.floor(parsedMs / 1000);
          publishedAt = new Date(parsedMs).toISOString();
        } else {
          publishedAt = rawPub;
        }
      }
      const rawLikes =
        html.match(/"likeCount":"?(\d+)"?/)?.[1] ||
        html.match(/"topLevelButtons":\[\{"segmentedLikeDislikeButtonViewModel":[\s\S]{0,600}?"title":"([\d.,]+\s?[KMBN]?)"/i)?.[1];
      if (rawLikes) {
        likes = parseCompactNumber(rawLikes.replace(/N$/i, 'K'));
      }
      const rawComments = html.match(/"commentCount":\{"simpleText":"([\d.,]+\s?[KMBN]?)"/i)?.[1];
      if (rawComments) {
        comments = parseCompactNumber(rawComments.replace(/N$/i, 'K'));
      }
      const shortDescMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      if (shortDescMatch?.[1]) {
        try {
          description = JSON.parse(`"${shortDescMatch[1]}"`) as string;
        } catch {
          description = shortDescMatch[1];
        }
      }
      if (status !== 'LIVE' && views !== null) {
        status = 'LIVE';
        statusDetail = null;
      }
    }
  } catch (err) {
    statusDetail = err instanceof Error ? err.message : 'Không kết nối được YouTube.';
  }

  const handleFromUrl = profileUrl?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
  const combinedCaption = [title, description].filter(Boolean).join('\n').trim();
  const detectedShopUrls = extractShoppingUrlsFromText(combinedCaption);
  const affiliateVerification = expect.affiliateTargetUrl
    ? await verifyAffiliateTargetUrl(expect.affiliateTargetUrl, expect)
    : detectedShopUrls[0]
    ? await verifyAffiliateTargetUrl(detectedShopUrls[0], expect)
    : undefined;
  const hasShopLink = detectedShopUrls.length > 0 || affiliateVerification?.status === 'PASS';

  const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
    inputUrl,
    platform: 'youtube',
    contentType: 'video',
    contentId,
    canonicalUrl,
    status,
    statusDetail,
    author: {
      handle: handleFromUrl ? decodeURIComponent(handleFromUrl).toLowerCase() : null,
      name: authorName,
      profileUrl,
      followers: null,
    },
    publishedAt,
    publishedTimeSec,
    airedAtVn: formatVnDateTimeFromUnixSec(publishedTimeSec, publishedAt),
    caption: title || description.slice(0, 280),
    hashtags: extractHashtags(combinedCaption),
    mentions: extractMentions(combinedCaption),
    durationSeconds,
    metrics: { views, likes, comments, shares: null, saves: null },
    hasProductLink: hasShopLink ? true : null,
    productTitle: hasShopLink ? 'Link mua hàng gắn trong mô tả YouTube' : null,
    productUrl: detectedShopUrls[0] || affiliateVerification?.resolvedUrl || null,
    productId: affiliateVerification?.itemId || null,
    sellerId: affiliateVerification?.shopId || null,
    cartProducts: detectedShopUrls.map((url) => ({
      productId: affiliateVerification?.itemId || '',
      sellerId: affiliateVerification?.shopId || undefined,
      title: 'Link mua hàng trong mô tả YouTube',
      productUrl: url,
      source: 'YouTube Description',
    })),
    affiliateVerification,
    coverUrl: thumbnail,
    limitations: [],
    source: 'youtube-watch-oembed',
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
      captureSec: 9.8,
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

export const MULTI_PLATFORM_AIR_CACHE_KEY = 'multi-platform-air-cache-v1';

export interface MultiPlatformAirCacheItem {
  contentId: string;
  platform: 'threads' | 'facebook' | 'shopee' | 'instagram';
  postUrl: string;
  handle: string;
  displayName?: string;
  publishedAt?: string;
  publishedTimeSec?: number;
  caption: string;
  hashtags?: string[];
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  hasProductLink?: boolean;
  productTitle?: string | null;
  productUrl?: string | null;
  productId?: string | null;
  sellerId?: string | null;
  cartProducts?: Array<{
    productId: string;
    sellerId?: string;
    title: string;
    productUrl: string;
    source?: string;
  }>;
  source?: string;
  updatedAt: string;
}

export interface MultiPlatformAirCacheState {
  items: Record<string, MultiPlatformAirCacheItem>;
}

const multiPlatformMemoryCache: Record<string, MultiPlatformAirCacheItem> = {};

export async function saveMultiPlatformExtensionCapture(
  item: MultiPlatformAirCacheItem
): Promise<void> {
  if (!item?.contentId || !item?.platform) return;
  const cacheKey = `${item.platform}:${item.contentId}`;
  multiPlatformMemoryCache[cacheKey] = item;
  await upsertRecord<MultiPlatformAirCacheState>(
    MULTI_PLATFORM_AIR_CACHE_KEY,
    { items: {} },
    (cur) => ({
      items: {
        ...(cur?.items || {}),
        [cacheKey]: item,
      },
    })
  ).catch(() => {});
}

export async function getMultiPlatformExtensionCapture(
  platform: string,
  contentId: string | null
): Promise<MultiPlatformAirCacheItem | null> {
  if (!contentId) return null;
  const cacheKey = `${platform}:${contentId}`;
  if (multiPlatformMemoryCache[cacheKey]) {
    return multiPlatformMemoryCache[cacheKey];
  }
  try {
    const rec = await readRecord<MultiPlatformAirCacheState>(
      MULTI_PLATFORM_AIR_CACHE_KEY,
      { items: {} },
      { skipCache: true }
    );
    const found = rec.data?.items?.[cacheKey] || null;
    if (found) {
      multiPlatformMemoryCache[cacheKey] = found;
    }
    return found;
  } catch {
    return null;
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
    const fallbackContentId = parsed.contentId;
    const fallbackContentType = parsed.contentType;
    const resolvedUrl = await resolveRedirectUrl(
      parsed.url,
      parsed.platform === 'facebook' ? LINK_PREVIEW_UA : BROWSER_UA
    );
    const reParsed = parseLink(resolvedUrl);
    if (reParsed) {
      parsed = {
        ...reParsed,
        contentId: reParsed.contentId || fallbackContentId,
        contentType: reParsed.contentType || fallbackContentType,
      };
    } else {
      parsed = {
        ...parsed,
        url: resolvedUrl,
        contentId: fallbackContentId,
        contentType: fallbackContentType,
        isShortLink: false,
      };
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

  // Xác thực trực tiếp Link Affiliate đích (nếu người dùng đính kèm ở cột Link Affiliate / Đích)
  let affiliateVerification = await verifyAffiliateTargetUrl(expect.affiliateTargetUrl, expect);

  // Kiểm tra bộ nhớ đệm DOM từ UpBase Chrome Extension trước (dành cho Threads, Facebook, Shopee Video, Instagram)
  if (
    parsed.platform === 'threads' ||
    parsed.platform === 'facebook' ||
    parsed.platform === 'shopee' ||
    parsed.platform === 'instagram'
  ) {
    const extCached = await getMultiPlatformExtensionCapture(parsed.platform, parsed.contentId);
    if (extCached) {
      if (!affiliateVerification && extCached.productUrl) {
        affiliateVerification = await verifyAffiliateTargetUrl(extCached.productUrl, expect);
      }
      const hashtags =
        extCached.hashtags && extCached.hashtags.length > 0
          ? extCached.hashtags
          : extractHashtags(extCached.caption || '');
      const hasVerifiedLink =
        Boolean(extCached.hasProductLink) || affiliateVerification?.status === 'PASS';
      const policyViolations = scanBlacklistViolations(extCached.caption || '');
      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: parsed.platform,
        contentType: parsed.contentType ?? (parsed.platform === 'shopee' ? 'video' : 'post'),
        contentId: extCached.contentId || parsed.contentId,
        canonicalUrl: extCached.postUrl || parsed.url,
        status: 'LIVE',
        statusDetail: null,
        author: {
          handle: extCached.handle || parsed.handle,
          name: extCached.displayName || extCached.handle || parsed.handle,
          profileUrl: null,
          followers: null,
        },
        publishedAt: extCached.publishedAt || null,
        publishedTimeSec: extCached.publishedTimeSec || null,
        airedAtVn: formatVnDateTimeFromUnixSec(extCached.publishedTimeSec, extCached.publishedAt),
        caption: extCached.caption || '',
        hashtags,
        mentions: extractMentions(extCached.caption || ''),
        durationSeconds: null,
        metrics: {
          views: extCached.views ?? null,
          likes: extCached.likes ?? null,
          comments: extCached.comments ?? null,
          shares: extCached.shares ?? null,
          saves: null,
        },
        hasProductLink: hasVerifiedLink ? true : null,
        productTitle:
          extCached.productTitle ||
          (affiliateVerification?.status === 'PASS'
            ? `Đã xác thực Link Affiliate (${affiliateVerification.platform.toUpperCase()})`
            : null),
        productUrl:
          extCached.productUrl ||
          affiliateVerification?.resolvedUrl ||
          affiliateVerification?.inputUrl ||
          null,
        productId: extCached.productId || affiliateVerification?.itemId || null,
        sellerId: extCached.sellerId || affiliateVerification?.shopId || null,
        cartProducts: extCached.cartProducts || [],
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        affiliateVerification,
        limitations: [],
        source: extCached.source || 'extension-dom-verified',
        fetchedAt,
        fromCache: true,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }
  }

  // Hàm giải mã các link bọc chuyển hướng của Meta (l.threads.net, l.facebook.com, l.instagram.com)
  const unpackMetaRedirectLinksInHtml = (rawHtml: string): string => {
    let unpacked = rawHtml;
    const metaRedirectMatches = [
      ...rawHtml.matchAll(
        /https?:\/\/l\.(?:threads\.net|threads\.com|facebook\.com|instagram\.com)\/(?:l\.php)?\?[^"'\s<>]*?u=(https?%3A%2F%2F[^"&'\s<>]+)/gi
      ),
    ];
    const decodedUrls: string[] = [];
    for (const m of metaRedirectMatches) {
      try {
        decodedUrls.push(decodeURIComponent(m[1]));
      } catch {
        // ignore
      }
    }
    if (decodedUrls.length > 0) {
      unpacked += ' ' + decodedUrls.join(' ');
    }
    return unpacked;
  };

  // Shopee Video / Threads / Facebook / Instagram dedicated parsers
  try {
    const res = await fetch(parsed.url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': parsed.platform === 'shopee' ? BROWSER_UA : LINK_PREVIEW_UA,
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(9000),
      cache: 'no-store',
    });
    const finalUrl = res.url || parsed.url;
    const html = unpackMetaRedirectLinksInHtml(await res.text());

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
          affiliateVerification,
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
          const parsedNext = JSON.parse(nextDataRaw);
          const media = parsedNext?.props?.pageProps?.mediaInfo;
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
              affiliateVerification,
              limitations: [],
              source: 'shopee-share-page',
              fetchedAt,
              fromCache: false,
              durationMs: Date.now() - started,
            };
            const checks = buildLinkAirChecks(base, expect);
            return { ...base, checks, verdict: verdictOf(checks) };
          }
          const handle =
            media.userInfo?.videoUserName?.toLowerCase() ??
            media.userInfo?.userName?.toLowerCase() ??
            parsed.handle ??
            null;
          const displayName = media.userInfo?.nickName || handle;
          const host = new URL(parsed.url).hostname.replace(/^sv\./, '');
          const count = media.count ?? {};
          const caption = String(media.video.caption ?? '').trim();
          const shopeePlayableUrl =
            media.video?.watermarkVideoUrl || media.video?.videoUrl || media.video?.playUrl || null;
          const shopeeCoverUrl =
            media.video?.watermarkCoverUrl ||
            media.video?.coverUrl ||
            media.video?.watermarkShareImageUrl ||
            readMeta(html, 'og:image') ||
            null;
          const createSecRaw =
            Number(media.video.createTime || media.video.ctime || media.createTime || 0) ||
            decodeShopeeMmsTimestampSec(shopeePlayableUrl, shopeeCoverUrl);
          const createSec =
            createSecRaw && createSecRaw > 1_000_000_000_000
              ? Math.floor(createSecRaw / 1000)
              : createSecRaw;

          // Trích xuất Giỏ hàng Cam Shopee Video (itemList / items / products / anchors)
          const rawProductArray =
            media.itemList ||
            media.items ||
            media.products ||
            media.video?.itemList ||
            media.video?.items ||
            media.anchors ||
            [];
          const orangeCartItems: Array<{
            productId: string;
            sellerId?: string;
            title: string;
            productUrl: string;
            source: string;
          }> = [];
          if (Array.isArray(rawProductArray)) {
            for (const item of rawProductArray) {
              const itemId = String(item?.itemId || item?.itemid || item?.productId || '').trim();
              const shopId = String(item?.shopId || item?.shopid || item?.sellerId || '').trim();
              const itemTitle = String(
                item?.name || item?.title || item?.itemName || 'Sản phẩm Giỏ cam Shopee Video'
              ).trim();
              const itemUrl =
                item?.productUrl ||
                item?.url ||
                (shopId && itemId
                  ? `https://shopee.vn/product/${shopId}/${itemId}`
                  : `https://shopee.vn/search?keyword=${encodeURIComponent(itemTitle)}`);
              if (itemId || itemTitle) {
                orangeCartItems.push({
                  productId: itemId,
                  sellerId: shopId || undefined,
                  title: itemTitle,
                  productUrl: itemUrl,
                  source: 'Giỏ hàng Cam Shopee Video',
                });
              }
            }
          }

          const captionShoppingUrls = extractShoppingUrlsFromText(caption);
          const allCartProducts = [
            ...orangeCartItems,
            ...captionShoppingUrls.map((url) => ({
              productId: '',
              sellerId: undefined as string | undefined,
              title: 'Link Shopee gắn trong mô tả video',
              productUrl: url,
              source: 'Caption Link',
            })),
          ];
          if (!affiliateVerification && allCartProducts[0]?.productUrl) {
            affiliateVerification = await verifyAffiliateTargetUrl(allCartProducts[0].productUrl, expect);
          }
          const hasOrangeCartFlag =
            allCartProducts.length > 0 ||
            affiliateVerification?.status === 'PASS' ||
            Boolean(media.hasItem || media.video?.hasItem || /"itemId"\s*:\s*"?\d{6,}/i.test(nextDataRaw));
          const policyViolations = scanBlacklistViolations(caption);
          const rawHashtags = Array.isArray(media.video?.hashtagContent)
            ? media.video.hashtagContent.map((h: string) => `#${String(h).replace(/^#+/, '').toLowerCase()}`)
            : [];
          const mergedHashtags = [...new Set([...extractHashtags(caption), ...rawHashtags])];
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
              name: displayName,
              profileUrl: handle ? `https://${host}/${handle}` : null,
              followers: media.userInfo?.followerCount ?? null,
            },
            publishedAt: unixSecondsToIso(createSec),
            publishedTimeSec: createSec,
            airedAtVn: formatVnDateTimeFromUnixSec(createSec),
            caption,
            hashtags: mergedHashtags,
            mentions: extractMentions(caption),
            durationSeconds: media.video.duration ? Math.round(media.video.duration / 1000) : null,
            metrics: {
              views: count.viewCount ?? count.playCount ?? null,
              likes: count.likeCount ?? null,
              comments: count.commentCount ?? null,
              shares: count.shareCount ?? null,
              saves: null,
            },
            hasProductLink: hasOrangeCartFlag ? true : null,
            productTitle:
              allCartProducts[0]?.title ||
              (hasOrangeCartFlag ? 'Giỏ hàng Cam Shopee Video' : null),
            productUrl:
              allCartProducts[0]?.productUrl ||
              affiliateVerification?.resolvedUrl ||
              null,
            productId:
              allCartProducts[0]?.productId ||
              affiliateVerification?.itemId ||
              null,
            sellerId:
              allCartProducts[0]?.sellerId ||
              affiliateVerification?.shopId ||
              null,
            cartProducts: allCartProducts,
            playableUrl: shopeePlayableUrl,
            coverUrl: shopeeCoverUrl,
            policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
            affiliateVerification,
            limitations: [
              'Số đơn hàng và GMV phát sinh từ Shopee Video cần đối chiếu báo cáo Shopee Affiliate hoặc đồng bộ từ Extension.',
            ],
            source: 'shopee-next-data',
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
      // Nhánh dự phòng khi Shopee Video trả về HTML SPA nhưng URL hợp lệ có mã share-video/<id>
      if (res.ok && parsed.contentId) {
        const ogTitle = readMeta(html, 'og:title') || '';
        const ogDesc = readMeta(html, 'og:description') || readMeta(html, 'description') || '';
        const caption = (ogDesc || ogTitle || '').trim();
        const likes =
          readJsonNumber(html, 'likeCount') ??
          parseCompactNumber(caption.match(/([\d.,]+\s?[KMB]?)\s+likes?/i)?.[1]);
        const comments = readJsonNumber(html, 'commentCount');
        const views = readJsonNumber(html, 'viewCount') ?? readJsonNumber(html, 'playCount');
        const hasItemInHtml =
          /"itemId"\s*:\s*"?\d{6,}|shopee\.vn\/product\//i.test(html) ||
          affiliateVerification?.status === 'PASS';
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'shopee',
          contentType: 'video',
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: 'LIVE',
          statusDetail: null,
          author: {
            handle: parsed.handle || expect.handle || null,
            name: parsed.handle || expect.handle || null,
            profileUrl: null,
            followers: null,
          },
          publishedAt: null,
          caption,
          hashtags: extractHashtags(caption),
          mentions: extractMentions(caption),
          durationSeconds: null,
          metrics: { views, likes, comments, shares: null, saves: null },
          hasProductLink: hasItemInHtml ? true : null,
          productTitle: hasItemInHtml ? 'Giỏ hàng Cam Shopee Video' : null,
          productUrl: affiliateVerification?.resolvedUrl || null,
          productId: affiliateVerification?.itemId || null,
          sellerId: affiliateVerification?.shopId || null,
          affiliateVerification,
          limitations: [
            'Shopee Video render phía trình duyệt (CSR); để lấy đủ danh sách SP trong Giỏ cam hãy mở link trên trình duyệt có bật UpBase Extension.',
          ],
          source: 'shopee-csr-fallback',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }
    }

    if (parsed.platform === 'threads') {
      let threadsHtml = html;
      const initialOgTitle = readMeta(html, 'og:title') || '';
      const initialOgImage = readMeta(html, 'og:image') || readMeta(html, 'twitter:image') || null;
      let ogTitle = initialOgTitle;
      let ogDesc = readMeta(threadsHtml, 'og:description') || readMeta(threadsHtml, 'description') || '';
      let usedEmbed = false;

      // Luôn thử gọi thêm endpoint /embed công khai của Threads khi trang chính chỉ trả về vỏ "Threads", thiếu nội dung hoặc thiếu chỉ số tương tác
      const isGenericShell =
        !ogDesc || /^threads$/i.test(ogTitle.trim()) || readJsonNumber(threadsHtml, 'like_count') === null;
      if (isGenericShell && parsed.contentId && res.status !== 404) {
        const embedUrls = parsed.handle
          ? [
              `https://www.threads.net/@${parsed.handle}/post/${parsed.contentId}/embed`,
              `https://www.threads.com/@${parsed.handle}/post/${parsed.contentId}/embed`,
            ]
          : [
              `https://www.threads.net/t/${parsed.contentId}/embed`,
              `https://www.threads.com/t/${parsed.contentId}/embed`,
            ];
        for (const embedUrl of embedUrls) {
          try {
            const embedRes = await fetch(embedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              },
              signal: AbortSignal.timeout(6000),
              cache: 'no-store',
            });
            if (embedRes.ok) {
              const rawEmbedBody = await embedRes.text();
              if (rawEmbedBody && !/Page Not Found/i.test(rawEmbedBody)) {
                threadsHtml = unpackMetaRedirectLinksInHtml(rawEmbedBody);
                usedEmbed = true;
                ogTitle =
                  readMeta(threadsHtml, 'og:title') ||
                  initialOgTitle ||
                  threadsHtml
                    .match(/class="[^"]*Name[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]
                    ?.replace(/<[^>]+>/g, '')
                    .trim() ||
                  ogTitle;
                ogDesc =
                  readMeta(threadsHtml, 'og:description') ||
                  threadsHtml
                    .match(/class="[^"]*BodyText[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
                    ?.replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim() ||
                  ogDesc;
                if (ogDesc) break;
              }
            }
          } catch {
            // Bỏ qua nếu endpoint embed lỗi
          }
        }
      }

      if (res.status === 404 || /Page Not Found/i.test(threadsHtml)) {
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'threads',
          contentType: 'post',
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: 'UNAVAILABLE',
          statusDetail: 'Bài đăng Threads đã bị xoá hoặc không tồn tại.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: null,
          productTitle: null,
          affiliateVerification,
          limitations: [],
          source: 'threads-meta',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }

      // Trích xuất @handle và Tên hiển thị từ og:title (VD: "Hồng Ánh (@honganh.daily) on Threads")
      const titleSource = initialOgTitle.includes('(@') ? initialOgTitle : ogTitle;
      const titleHandleMatch = titleSource.match(/\(@([\w.]+)\)/);
      const handle =
        titleHandleMatch?.[1]?.toLowerCase() ||
        parsed.handle ||
        readJsonString(threadsHtml, 'username')?.toLowerCase() ||
        null;
      const authorName =
        titleSource.match(/^(.*?)\s*\(@[\w.]+\)/)?.[1]?.trim() ||
        titleSource.replace(/\s*on Threads.*$/i, '').replace(/^@/, '').trim() ||
        handle;

      // Trích xuất ảnh chụp đính kèm trong bài đăng Threads hoặc thẻ og:image
      const embedImgs = [...threadsHtml.matchAll(/<img[^>]+src="([^"]+)"/gi)]
        .map((m) => decodeHtmlEntities(m[1]))
        .filter(
          (u) =>
            /^https?:\/\//i.test(u) &&
            !u.includes('rsrc.php') &&
            !u.includes('s100x100') &&
            !u.includes('t51.82787-19') &&
            !u.includes('giphy.com')
        );
      const threadsCoverUrl =
        embedImgs[0] ||
        (initialOgImage && !initialOgImage.includes('rsrc.php') ? initialOgImage : null);
      const threadsPlayableUrl =
        threadsHtml
          .match(/<video[^>]+src="([^"]+)"/i)?.[1]
          ?.replace(/&amp;/g, '&') || null;

      // Trích xuất nội dung bài đăng & các bình luận/reply nhúng trong SSR JSON
      const ssrTextMatches = [...threadsHtml.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
        .map((m) => {
          try {
            return JSON.parse(`"${m[1]}"`) as string;
          } catch {
            return m[1];
          }
        })
        .filter((t) => t && t.length > 3);
      const caption = (ogDesc || ssrTextMatches[0] || '').trim();
      const combinedPostAndReplies = [caption, ...ssrTextMatches.slice(0, 15), threadsHtml.slice(0, 8000)].join(' ');

      const embedActionCounts = [...threadsHtml.matchAll(/class="[^"]*ActionBarCount[^"]*"[^>]*>([^<]+)</gi)].map(
        (m) => parseCompactNumber(m[1])
      );
      const takenAtSec =
        readJsonNumber(threadsHtml, 'taken_at') ??
        readJsonNumber(threadsHtml, 'publish_time') ??
        readJsonNumber(threadsHtml, 'created_at') ??
        decodeMetaShortcodeTimestampSec(parsed.contentId);
      const likes =
        readJsonNumber(threadsHtml, 'like_count') ??
        embedActionCounts[0] ??
        parseCompactNumber(
          (ogTitle + ' ' + ogDesc + ' ' + threadsHtml).match(
            /([\d.,]+\s?[KMB]?)\s+(?:likes?|lượt thích)/i
          )?.[1]
        );
      const comments =
        readJsonNumber(threadsHtml, 'direct_reply_count') ??
        readJsonNumber(threadsHtml, 'reply_count') ??
        embedActionCounts[1] ??
        parseCompactNumber(
          (ogTitle + ' ' + ogDesc).match(/([\d.,]+\s?[KMB]?)\s+(?:replies|bình luận)/i)?.[1]
        );
      const reposts =
        (readJsonNumber(threadsHtml, 'repost_count') || 0) +
        (readJsonNumber(threadsHtml, 'quote_count') || 0) +
        (embedActionCounts[2] || 0) +
        (embedActionCounts[3] || 0);
      const views =
        readJsonNumber(threadsHtml, 'view_count') ??
        readJsonNumber(threadsHtml, 'play_count') ??
        readJsonNumber(threadsHtml, 'impression_count') ??
        parseCompactNumber(
          (ogTitle + ' ' + ogDesc).match(/([\d.,]+\s?[KMB]?)\s+(?:views|lượt xem)/i)?.[1]
        );

      const detectedShopUrls = extractShoppingUrlsFromText(combinedPostAndReplies);
      if (!affiliateVerification && detectedShopUrls[0]) {
        affiliateVerification = await verifyAffiliateTargetUrl(detectedShopUrls[0], expect);
      }
      const hasShopLink =
        detectedShopUrls.length > 0 ||
        affiliateVerification?.status === 'PASS' ||
        /(?:s\.shopee\.vn|shp\.ee|shopee\.vn|vt\.tiktok\.com|lazada\.vn|linktr\.ee|beacons\.ai|bio\.link)/i.test(
          threadsHtml
        );
      const isReplyLink =
        !extractShoppingUrlsFromText(caption).length &&
        (detectedShopUrls.length > 0 || affiliateVerification?.status === 'PASS');
      const policyViolations = scanBlacklistViolations(caption);

      const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
        inputUrl,
        platform: 'threads',
        contentType: 'post',
        contentId: parsed.contentId,
        canonicalUrl:
          handle && parsed.contentId
            ? `https://www.threads.net/@${handle}/post/${parsed.contentId}`
            : parsed.url,
        status: 'LIVE',
        statusDetail: null,
        author: {
          handle,
          name: authorName,
          profileUrl: handle ? `https://www.threads.net/@${handle}` : null,
          followers: readJsonNumber(threadsHtml, 'follower_count'),
        },
        publishedAt: unixSecondsToIso(takenAtSec),
        publishedTimeSec: takenAtSec,
        airedAtVn: formatVnDateTimeFromUnixSec(takenAtSec),
        caption,
        hashtags: extractHashtags(caption),
        mentions: extractMentions(caption),
        durationSeconds: null,
        metrics: {
          views,
          likes,
          comments,
          shares: reposts > 0 ? reposts : null,
          saves: null,
        },
        hasProductLink: hasShopLink ? true : null,
        productTitle: hasShopLink
          ? isReplyLink
            ? 'Link Affiliate ở Comment đầu (Reply #1) / Đã xác thực'
            : 'Link mua hàng gắn trực tiếp trong bài Threads'
          : null,
        productUrl:
          detectedShopUrls[0] ||
          affiliateVerification?.resolvedUrl ||
          affiliateVerification?.inputUrl ||
          null,
        productId: affiliateVerification?.itemId || null,
        sellerId: affiliateVerification?.shopId || null,
        cartProducts: detectedShopUrls.map((url) => ({
          productId: affiliateVerification?.itemId || '',
          sellerId: affiliateVerification?.shopId || undefined,
          title: isReplyLink ? 'Link ở Comment đầu Threads' : 'Link trong bài Threads',
          productUrl: url,
          source: isReplyLink ? 'First Reply' : 'Thread Post',
        })),
        playableUrl: threadsPlayableUrl,
        coverUrl: threadsCoverUrl,
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        affiliateVerification,
        limitations: [
          'Lượt xem (Views) và Reply bên dưới trên Threads có thể bị giới hạn khi quét không đăng nhập; hãy dán kèm Link Affiliate đích hoặc bấm Ghi nhận trên Extension để lấy đủ chuỗi tút.',
        ],
        source: usedEmbed ? 'threads-embed-ssr' : 'threads-ssr-engine',
        fetchedAt,
        fromCache: false,
        durationMs: Date.now() - started,
      };
      const checks = buildLinkAirChecks(base, expect);
      return { ...base, checks, verdict: verdictOf(checks) };
    }

    if (parsed.platform === 'facebook') {
      let fbHtml = html;
      let ogUrl = readMeta(fbHtml, 'og:url') ?? finalUrl;
      let ogTitle = readMeta(fbHtml, 'og:title');
      let ogDescription = readMeta(fbHtml, 'og:description') ?? '';
      const initialFbCoverUrl = readMeta(fbHtml, 'og:image') || readMeta(fbHtml, 'twitter:image') || null;
      let usedFbPlugin = false;
      let fbPluginBody = '';

      // Gọi bổ sung endpoint Social Plugin công khai (/plugins/video.php hoặc /plugins/post.php) để bóc luồng MP4, phụ đề SRT, thời lượng và @handle Fanpage
      if (res.status !== 404) {
        try {
          const pluginKind =
            parsed.contentType === 'reel' || parsed.contentType === 'video' ? 'video.php' : 'post.php';
          const pluginUrl = `https://www.facebook.com/plugins/${pluginKind}?href=${encodeURIComponent(
            parsed.url
          )}&show_text=true`;
          const pluginRes = await fetch(pluginUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
            },
            signal: AbortSignal.timeout(6000),
            cache: 'no-store',
          });
          if (pluginRes.ok) {
            fbPluginBody = unpackMetaRedirectLinksInHtml(await pluginRes.text());
            if (!ogTitle || /\/login(\.php)?|checkpoint/.test(finalUrl)) {
              const textFromPlugin = fbPluginBody
                .match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]
                ?.replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              if (textFromPlugin && textFromPlugin.length > 3) {
                fbHtml = fbPluginBody;
                ogDescription = decodeHtmlEntities(textFromPlugin);
                ogTitle = ogTitle || parsed.handle || 'Facebook Post';
                ogUrl = parsed.url;
                usedFbPlugin = true;
              }
            }
          }
        } catch {
          // ignore plugin fallback error
        }
      }

      if (res.status === 404 || (!ogTitle && !usedFbPlugin) || (/\/login(\.php)?|checkpoint/.test(finalUrl) && !usedFbPlugin)) {
        const isBlocked = /\/login|checkpoint/.test(finalUrl) || (res.status >= 400 && res.status !== 404);
        const base: Omit<LinkAirResult, 'checks' | 'verdict'> = {
          inputUrl,
          platform: 'facebook',
          contentType: parsed.contentType,
          contentId: parsed.contentId,
          canonicalUrl: parsed.url,
          status: isBlocked ? 'BLOCKED' : 'UNAVAILABLE',
          statusDetail: isBlocked
            ? 'Facebook yêu cầu đăng nhập để xem bài này (bài riêng tư hoặc bị chặn IP). Hãy mở bài trên trình duyệt có UpBase Extension để đồng bộ.'
            : 'Bài đã bị xoá, ẩn hoặc chỉ bạn bè xem được.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: affiliateVerification?.status === 'PASS' ? true : null,
          productTitle:
            affiliateVerification?.status === 'PASS' ? 'Đã xác thực Link Affiliate đính kèm' : null,
          productUrl: affiliateVerification?.resolvedUrl || null,
          productId: affiliateVerification?.itemId || null,
          sellerId: affiliateVerification?.shopId || null,
          affiliateVerification,
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
        ogUrl.match(/\/posts\/([\w.-]+)/)?.[1] ??
        null;
      const contentId = idFromUrl ?? parsed.contentId;
      const contentType = /\/reel\//.test(ogUrl)
        ? 'reel'
        : /\/videos\/|watch/.test(ogUrl)
        ? 'video'
        : parsed.contentType ?? 'post';

      const anchor = contentId
        ? fbHtml.indexOf(
            `"associated_video":{"is_live_streaming":false,"is_profile_video":false,"id":"${contentId}"`
          )
        : -1;
      const fromAnchor = anchor >= 0 ? anchor : 0;
      const titleStats = parseFacebookOgTitle(ogTitle || '');

      const views =
        readJsonNumber(fbHtml, 'video_view_count', fromAnchor) ??
        readJsonNumber(fbHtml, 'play_count') ??
        titleStats.views;
      const pluginSource = fbPluginBody || fbHtml;
      const reactionsMatch = fbHtml.match(/"reaction_count":\{"count":(\d+)/);
      const pluginReactionText = pluginSource.match(/class="_5n6h _2pih"[^>]*>([\d.,KMB]+)</i)?.[1];
      const reactions = reactionsMatch
        ? Number(reactionsMatch[1])
        : titleStats.reactions ?? parseCompactNumber(pluginReactionText);
      const comments = readJsonNumber(fbHtml, 'total_comment_count');
      const shareMatch =
        fbHtml.match(/"share_count":\{"count":(\d+)/) ??
        fbHtml.match(/"share_count_reduced":"([\d.,KMB]+)"/);
      const shares = shareMatch ? parseCompactNumber(shareMatch[1]) : null;
      let publishTime =
        readJsonNumber(fbHtml, 'publish_time') ?? readJsonNumber(fbHtml, 'creation_time');
      let durationSec = readJsonNumber(fbHtml, 'playable_duration_in_ms')
        ? Math.round(Number(readJsonNumber(fbHtml, 'playable_duration_in_ms')) / 1000)
        : null;

      // Trích xuất luồng MP4 (hd_src / sd_src), thời lượng (efg.duration_s), phụ đề SRT (subtitles_src) và @handle từ /plugins/video.php
      const fbPlayableUrl =
        readJsonString(pluginSource, 'hd_src') ||
        readJsonString(pluginSource, 'sd_src') ||
        readJsonString(pluginSource, 'browser_native_hd_url') ||
        readJsonString(pluginSource, 'browser_native_sd_url') ||
        readJsonString(pluginSource, 'playable_url') ||
        null;
      const fbCoverUrl = initialFbCoverUrl || readMeta(fbHtml, 'og:image') || null;

      // Lấy thời điểm đăng chính xác tới từng giây từ header Last-Modified của ảnh thumbnail gốc trên CDN Facebook
      if (fbCoverUrl && !publishTime) {
        try {
          const headRes = await fetch(fbCoverUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3500),
            cache: 'no-store',
          });
          const lastMod = headRes.headers.get('last-modified');
          if (lastMod) {
            const parsedMs = Date.parse(lastMod);
            if (Number.isFinite(parsedMs) && parsedMs > 1_400_000_000_000) {
              publishTime = Math.floor(parsedMs / 1000);
            }
          }
        } catch {
          // ignore HEAD error
        }
      }

      if (fbPlayableUrl && (!durationSec || !publishTime)) {
        try {
          const efgParam = fbPlayableUrl.match(/[?&]efg=([^&]+)/)?.[1];
          if (efgParam) {
            const efgJson = JSON.parse(
              Buffer.from(decodeURIComponent(efgParam), 'base64').toString('utf8')
            );
            if (!durationSec && typeof efgJson?.duration_s === 'number' && efgJson.duration_s > 0) {
              durationSec = Math.round(efgJson.duration_s);
            }
            if (!publishTime && typeof efgJson?.asset_age_days === 'number') {
              publishTime = Math.floor(Date.now() / 1000) - efgJson.asset_age_days * 86400;
            }
          }
        } catch {
          // ignore efg decode error
        }
      }

      const pageMatch = fbHtml.match(
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
      const pluginVanityMatch =
        pluginSource.match(/https:\/\/www\.facebook\.com\/([\w.]+)\?(?:ref=embed_video|fref=)/i)?.[1] ||
        pluginSource.match(/\/(?:watch|stories)\/(\d{8,})\/\?(?:source=EMBED_VIDEO&)?ref=embed_video/i)?.[1] ||
        null;
      const vanity =
        readJsonString(fbHtml, 'vanity') ??
        parsed.handle ??
        (pluginVanityMatch && !['help', 'reel', 'watch', 'sharer'].includes(pluginVanityMatch.toLowerCase())
          ? pluginVanityMatch
          : null);
      const messageAt = fbHtml.indexOf('"message":{"text"');
      const caption = (
        (messageAt >= 0 ? readJsonString(fbHtml, 'text', messageAt) : null) ?? ogDescription
      ).trim();

      // Trích xuất phụ đề tự động (.srt) của Facebook Reels nếu có subtitles_src
      let fbTranscriptText: string | null = null;
      let fbSubtitleSegments: TikTokSubtitleSegment[] = [];
      const fbSubtitlesUrl = readJsonString(pluginSource, 'subtitles_src');
      if (fbSubtitlesUrl && /^https?:\/\//i.test(fbSubtitlesUrl)) {
        try {
          const subRes = await fetch(fbSubtitlesUrl, {
            signal: AbortSignal.timeout(3500),
            cache: 'no-store',
          });
          if (subRes.ok) {
            const srtRaw = await subRes.text();
            fbSubtitleSegments = parseWebVttToSegments(srtRaw);
            if (fbSubtitleSegments.length > 0) {
              fbTranscriptText = fbSubtitleSegments.map((s) => `[${s.timeLabel}] ${s.text}`).join(' ');
            }
          }
        } catch {
          // ignore subtitle fetch error
        }
      }

      const fbHashtags = extractHashtags(caption);
      const fbMentionDetection = detectProductMentionMoments({
        segments: fbSubtitleSegments,
        productName: expect.requiredKeywords?.[0],
        caption,
        hashtags: fbHashtags,
        uspKeywords: expect.requiredKeywords,
      });

      // Quét thêm các bình luận đầu tiên nhúng trong HTML Facebook để phát hiện link đặt ở Comment đầu
      const embeddedTexts = [...fbHtml.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)]
        .slice(0, 20)
        .map((m) => {
          try {
            return JSON.parse(`"${m[1]}"`) as string;
          } catch {
            return m[1];
          }
        });
      const hasProductTag =
        /"comet_product_tag_feed_overlay_renderer":\{/.test(fbHtml) ||
        /"product_item":\{/.test(fbHtml);
      const captionShoppingUrls = extractShoppingUrlsFromText(caption);
      const commentShoppingUrls = extractShoppingUrlsFromText(embeddedTexts.join(' '));
      const allFbShopUrls = [...new Set([...captionShoppingUrls, ...commentShoppingUrls])];
      if (!affiliateVerification && allFbShopUrls[0]) {
        affiliateVerification = await verifyAffiliateTargetUrl(allFbShopUrls[0], expect);
      }
      const hasAnyShopLink =
        hasProductTag || allFbShopUrls.length > 0 || affiliateVerification?.status === 'PASS';
      const isCommentShopLink =
        captionShoppingUrls.length === 0 &&
        (commentShoppingUrls.length > 0 || affiliateVerification?.status === 'PASS');
      const policyViolations = scanBlacklistViolations([caption, fbTranscriptText || ''].join(' '));

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
        publishedTimeSec: publishTime,
        airedAtVn: formatVnDateTimeFromUnixSec(publishTime),
        caption,
        hashtags: fbHashtags,
        mentions: extractMentions(caption),
        durationSeconds: durationSec,
        metrics: { views, likes: reactions, comments, shares, saves: null },
        hasProductLink: hasAnyShopLink ? true : null,
        productTitle:
          allFbShopUrls.length > 0 || affiliateVerification?.status === 'PASS'
            ? isCommentShopLink
              ? 'Link Affiliate ở Comment đầu Facebook (Đã xác thực)'
              : 'Link mua hàng gắn trong bài đăng Facebook'
            : hasProductTag
            ? 'Sản phẩm gắn thẻ trên Facebook'
            : null,
        productUrl:
          allFbShopUrls[0] ||
          affiliateVerification?.resolvedUrl ||
          affiliateVerification?.inputUrl ||
          null,
        productId: affiliateVerification?.itemId || null,
        sellerId: affiliateVerification?.shopId || null,
        cartProducts: allFbShopUrls.map((url) => ({
          productId: affiliateVerification?.itemId || '',
          sellerId: affiliateVerification?.shopId || undefined,
          title: isCommentShopLink
            ? 'Link mua hàng ở Comment đầu Facebook'
            : 'Link mua hàng trong bài đăng Facebook',
          productUrl: url,
          source: isCommentShopLink ? 'First Comment' : 'Caption Link',
        })),
        transcriptText: fbTranscriptText,
        playableUrl: fbPlayableUrl,
        coverUrl: fbCoverUrl,
        firstProductAppearanceSec: fbMentionDetection.firstProductAppearanceSec,
        firstProductMentionTimeLabel: fbMentionDetection.firstProductMentionTimeLabel || null,
        firstProductMentionTerm: fbMentionDetection.firstProductMentionTerm || null,
        firstProductMentionQuote: fbMentionDetection.firstProductMentionQuote || null,
        productMentionMoments: fbMentionDetection.productMentionMoments,
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        affiliateVerification,
        limitations: [
          'Facebook ẩn danh sách bình luận với máy chủ không đăng nhập; để xác thực link ở Comment đầu hãy dán Link Affiliate vào cột bên cạnh hoặc bấm Ghi nhận từ UpBase Chrome Extension.',
        ],
        source: usedFbPlugin || fbPluginBody ? 'facebook-plugin-embed' : 'facebook-html',
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
          affiliateVerification,
          limitations: [],
          source: 'instagram-meta',
          fetchedAt,
          fromCache: false,
          durationMs: Date.now() - started,
        };
        const checks = buildLinkAirChecks(base, expect);
        return { ...base, checks, verdict: verdictOf(checks) };
      }

      const initialIgTitle = readMeta(html, 'og:title') ?? '';
      const initialIgCover = readMeta(html, 'og:image') ?? readMeta(html, 'twitter:image') ?? null;
      let igHtml = html;
      let description = readMeta(igHtml, 'og:description') ?? readMeta(igHtml, 'description');
      let ogUrl = readMeta(igHtml, 'og:url');
      let usedIgEmbed = false;
      let igEmbedMedia: Record<string, any> | null = null;
      let igEmbedFollowers: number | null = null;
      let igEmbedCoverUrl: string | null = null;

      // Luôn gọi thêm /embed/captioned/ với User-Agent gọn nhẹ để lấy contextJSON (video_view_count, video_duration, video_url, followers)
      if (parsed.contentId && res.status !== 404) {
        try {
          const embedRes = await fetch(
            `https://www.instagram.com/p/${parsed.contentId}/embed/captioned/`,
            {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              signal: AbortSignal.timeout(6000),
              cache: 'no-store',
            }
          );
          if (embedRes.ok) {
            const rawEmbedBody = await embedRes.text();
            if (rawEmbedBody && !/Page Not Found/i.test(rawEmbedBody)) {
              const unpackedEmbed = unpackMetaRedirectLinksInHtml(rawEmbedBody);
              usedIgEmbed = true;
              const followerText = unpackedEmbed.match(
                /class="FollowerCountText"[^>]*>([\d.,]+\s?[KMB]?)\s+followers/i
              )?.[1];
              if (followerText) {
                igEmbedFollowers = parseCompactNumber(followerText);
              }
              igEmbedCoverUrl =
                unpackedEmbed
                  .match(/class="EmbeddedMediaImage"[^>]+src="([^"]+)"/i)?.[1]
                  ?.replace(/&amp;/g, '&') || null;
              const ctxMatch = unpackedEmbed.match(/"contextJSON":"((?:[^"\\]|\\.)*)"/);
              if (ctxMatch) {
                try {
                  const ctxStr = JSON.parse(`"${ctxMatch[1]}"`) as string;
                  const ctxParsed = JSON.parse(ctxStr);
                  igEmbedMedia = ctxParsed?.gql_data?.shortcode_media || ctxParsed?.shortcode_media || null;
                } catch {
                  // ignore contextJSON parse error
                }
              }
              if (!description || !ogUrl) {
                igHtml = unpackedEmbed;
                const embedUser =
                  unpackedEmbed.match(/class="UsernameText"[^>]*>([\s\S]*?)<\//i)?.[1]?.trim() ||
                  igEmbedMedia?.owner?.username ||
                  parsed.handle ||
                  '';
                const embedCaption =
                  unpackedEmbed
                    .match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
                    ?.replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim() || '';
                if (embedUser || embedCaption) {
                  description = `${embedUser}: "${embedCaption}"`;
                  ogUrl = parsed.url;
                }
              }
            }
          }
        } catch {
          // Bỏ qua nếu endpoint embed Instagram lỗi
        }
      }

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
              : 'Instagram yêu cầu đăng nhập để xem bài đăng này. Hãy mở trên trình duyệt có UpBase Extension.',
          author: { handle: parsed.handle, name: null, profileUrl: null, followers: null },
          publishedAt: null,
          caption: '',
          hashtags: [],
          mentions: [],
          durationSeconds: null,
          metrics: { views: null, likes: null, comments: null, shares: null, saves: null },
          hasProductLink: affiliateVerification?.status === 'PASS' ? true : null,
          productTitle:
            affiliateVerification?.status === 'PASS' ? 'Đã xác thực Link Bio / Affiliate đính kèm' : null,
          productUrl: affiliateVerification?.resolvedUrl || null,
          productId: affiliateVerification?.itemId || null,
          sellerId: affiliateVerification?.shopId || null,
          affiliateVerification,
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
      const handle =
        igParsed.handle ??
        igEmbedMedia?.owner?.username?.toLowerCase() ??
        ownerFromUrl ??
        parsed.handle;
      const ogTitle = initialIgTitle || readMeta(igHtml, 'og:title') || '';
      const displayName =
        ogTitle.match(/^(.*?) on Instagram/)?.[1]?.trim() ||
        igEmbedMedia?.owner?.full_name ||
        handle;
      const igViews =
        (typeof igEmbedMedia?.video_view_count === 'number' ? igEmbedMedia.video_view_count : null) ??
        readJsonNumber(igHtml, 'video_view_count') ??
        readJsonNumber(igHtml, 'play_count') ??
        readJsonNumber(igHtml, 'view_count');
      const igDurationSec =
        typeof igEmbedMedia?.video_duration === 'number' && igEmbedMedia.video_duration > 0
          ? Math.round(igEmbedMedia.video_duration)
          : null;
      const igLikes =
        igParsed.likes ??
        igEmbedMedia?.edge_media_preview_like?.count ??
        igEmbedMedia?.edge_liked_by?.count ??
        null;
      const igComments =
        igParsed.comments ??
        igEmbedMedia?.edge_media_to_comment?.count ??
        null;
      const igFollowers =
        igEmbedMedia?.owner?.edge_followed_by?.count ?? igEmbedFollowers ?? null;
      const igPlayableUrl =
        typeof igEmbedMedia?.video_url === 'string' ? igEmbedMedia.video_url : null;
      const igCoverUrl =
        (typeof igEmbedMedia?.display_url === 'string' ? igEmbedMedia.display_url : null) ||
        igEmbedCoverUrl ||
        initialIgCover;
      const igTakenAt =
        (typeof igEmbedMedia?.taken_at_timestamp === 'number' ? igEmbedMedia.taken_at_timestamp : null) ??
        readJsonNumber(igHtml, 'taken_at_timestamp') ??
        readJsonNumber(igHtml, 'taken_at') ??
        decodeMetaShortcodeTimestampSec(parsed.contentId);
      const captionShoppingUrls = extractShoppingUrlsFromText(igParsed.caption);
      if (!affiliateVerification && captionShoppingUrls[0]) {
        affiliateVerification = await verifyAffiliateTargetUrl(captionShoppingUrls[0], expect);
      }
      const hasBioOrStoryHint =
        captionShoppingUrls.length > 0 ||
        affiliateVerification?.status === 'PASS' ||
        /(?:link\s+in\s+bio|link\s+ở\s+bio|link\s+bio|trên\s+bio|story\s+mình|xem\s+story)/i.test(
          igParsed.caption
        );
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
          followers: igFollowers,
        },
        publishedAt: igParsed.publishedAt || unixSecondsToIso(igTakenAt),
        publishedTimeSec: igTakenAt,
        airedAtVn: formatVnDateTimeFromUnixSec(igTakenAt, igParsed.publishedAt),
        caption: igParsed.caption,
        hashtags: extractHashtags(igParsed.caption),
        mentions: extractMentions(igParsed.caption),
        durationSeconds: igDurationSec,
        metrics: {
          views: igViews,
          likes: igLikes,
          comments: igComments,
          shares: null,
          saves: null,
        },
        hasProductLink: hasBioOrStoryHint ? true : null,
        productTitle:
          affiliateVerification?.status === 'PASS'
            ? 'Đã xác thực Link Bio / Affiliate đính kèm'
            : captionShoppingUrls.length > 0
            ? 'Link mua hàng gắn trong bài đăng'
            : hasBioOrStoryHint
            ? 'Đã điều hướng Link Bio / Story Sticker trong Caption'
            : null,
        productUrl:
          captionShoppingUrls[0] ||
          affiliateVerification?.resolvedUrl ||
          affiliateVerification?.inputUrl ||
          null,
        productId: affiliateVerification?.itemId || null,
        sellerId: affiliateVerification?.shopId || null,
        cartProducts: captionShoppingUrls.map((url) => ({
          productId: affiliateVerification?.itemId || '',
          sellerId: affiliateVerification?.shopId || undefined,
          title: 'Link mua hàng gắn trong bài đăng',
          productUrl: url,
          source: 'Caption Link',
        })),
        playableUrl: igPlayableUrl,
        coverUrl: igCoverUrl,
        policyViolations: policyViolations.length > 0 ? policyViolations : undefined,
        affiliateVerification,
        limitations: [
          'Link Bio Instagram cần dán vào cột Link Affiliate đích để hệ thống kiểm tra tự động.',
        ],
        source: usedIgEmbed ? 'instagram-embed' : 'instagram-meta',
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
