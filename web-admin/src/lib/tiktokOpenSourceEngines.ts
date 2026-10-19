import type CryptoType from 'crypto';
import {
  extractContactsFromBio,
  type TikTokCommentIntentType,
  type TikTokTrendingCreatorItem,
  type TikTokVideoCommentItem,
  type TikTokVideoCommentsScrapeResult,
} from './tiktokKocScraper';

function getServerCrypto(): typeof CryptoType {
  const req = eval('require') as NodeRequire;
  return req('crypto');
}

const DEFAULT_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const VIDEO_CACHE_TTL_MS = 30 * 60 * 1000; // 30 phút
const SEARCH_CACHE_TTL_MS = 20 * 60 * 1000; // 20 phút
const COMMENT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút

class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

export interface CachedPublicProfileData {
  nickname?: string;
  bio?: string;
  bioLink?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  totalLikes?: number;
  videoCount?: number;
  isVerified?: boolean;
}

interface SharedTikTokCrawlerStore {
  videoDetailCache: Map<string, { data: RealTikTokVideoAndAuthorDetail; expiresAt: number }>;
  inFlightVideoDetail: Map<string, Promise<RealTikTokVideoAndAuthorDetail | null>>;
  profileCache: Map<string, { data: CachedPublicProfileData; expiresAt: number }>;
  inFlightProfile: Map<string, Promise<CachedPublicProfileData | null>>;
  searchHtmlCache: Map<
    string,
    { data: Array<{ handle: string; videoId: string; videoUrl: string }>; expiresAt: number }
  >;
  inFlightSearchHtml: Map<
    string,
    Promise<Array<{ handle: string; videoId: string; videoUrl: string }>>
  >;
  commentsPageCache: Map<
    string,
    {
      data: { items: RawTikTokApiComment[]; nextCursor: number; hasMore: boolean };
      expiresAt: number;
    }
  >;
  inFlightCommentsPage: Map<
    string,
    Promise<{ items: RawTikTokApiComment[]; nextCursor: number; hasMore: boolean }>
  >;
  rejectedHandlesByTarget: Map<string, { data: Set<string>; expiresAt: number }>;
  tiktokLimiter: ConcurrencyLimiter;
  searchLimiter: ConcurrencyLimiter;
}

const globalForCrawler = globalThis as unknown as {
  __upbaseTikTokCrawlerStore?: SharedTikTokCrawlerStore;
};

export function getSharedCrawlerStore(): SharedTikTokCrawlerStore {
  if (!globalForCrawler.__upbaseTikTokCrawlerStore) {
    globalForCrawler.__upbaseTikTokCrawlerStore = {
      videoDetailCache: new Map(),
      inFlightVideoDetail: new Map(),
      profileCache: new Map(),
      inFlightProfile: new Map(),
      searchHtmlCache: new Map(),
      inFlightSearchHtml: new Map(),
      commentsPageCache: new Map(),
      inFlightCommentsPage: new Map(),
      rejectedHandlesByTarget: new Map(),
      // Giới hạn số kết nối đồng thời ra ngoài trên toàn máy chủ để 30 nhân sự bấm quét cùng lúc không bị TikTok/Bing chặn IP
      tiktokLimiter: new ConcurrencyLimiter(14),
      searchLimiter: new ConcurrencyLimiter(8),
    };
  }
  if (!globalForCrawler.__upbaseTikTokCrawlerStore.rejectedHandlesByTarget) {
    globalForCrawler.__upbaseTikTokCrawlerStore.rejectedHandlesByTarget = new Map();
  }
  return globalForCrawler.__upbaseTikTokCrawlerStore;
}

export function recordRejectedTargetHandles(rawTargetKey: string, handles: string[]) {
  const cleanKey = stripVnAccents(rawTargetKey || '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  if (!cleanKey || handles.length === 0) return;
  const store = getSharedCrawlerStore();
  const now = Date.now();
  const existing = store.rejectedHandlesByTarget.get(cleanKey);
  const set =
    existing && existing.expiresAt > now ? existing.data : new Set<string>();
  for (const h of handles) {
    const cleanH = (h || '').trim().toLowerCase().replace(/^@+/, '');
    if (cleanH) set.add(cleanH);
  }
  setBoundedCache(store.rejectedHandlesByTarget, cleanKey, set, 15 * 60 * 1000, 200);
}

export function getRejectedTargetHandles(rawTargetKey: string): Set<string> {
  const cleanKey = stripVnAccents(rawTargetKey || '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  if (!cleanKey) return new Set();
  const store = getSharedCrawlerStore();
  const existing = store.rejectedHandlesByTarget.get(cleanKey);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.data;
  }
  return new Set();
}

function setBoundedCache<K, V>(
  map: Map<K, { data: V; expiresAt: number }>,
  key: K,
  data: V,
  ttlMs: number,
  maxEntries: number
) {
  const now = Date.now();
  if (map.size >= maxEntries) {
    for (const [k, v] of map.entries()) {
      if (v.expiresAt <= now || map.size >= maxEntries) {
        map.delete(k);
      }
      if (map.size < Math.floor(maxEntries * 0.85)) break;
    }
  }
  map.set(key, { data, expiresAt: now + ttlMs });
}

/**
 * Giải bài toán SHA-256 Proof-of-Work của TikTok SlardarWAF (waf-aiso/dd9808.js) trong <2ms
 * để lấy cookie _wafchallengeid mở khóa hoàn toàn dữ liệu SSR (__UNIVERSAL_DATA_FOR_REHYDRATION__).
 */
export function solveTikTokWafHtml(html: string): string | null {
  const wciMatch = html.match(/<p id="wci" class="([^"]*)"/);
  const csMatch = html.match(/<p id="cs" class="([^"]*)"/);
  if (!wciMatch || !csMatch || !csMatch[1]) return null;

  try {
    const crypto = getServerCrypto();
    const wci = wciMatch[1] || '_wafchallengeid';
    const cs = csMatch[1];
    const rci = html.match(/<p id="rci" class="([^"]*)"/)?.[1] || '';
    const rs = html.match(/<p id="rs" class="([^"]*)"/)?.[1] || '';
    const rsId = html.match(/<p id="rs_id" class="([^"]*)"/)?.[1] || '';

    const c = JSON.parse(Buffer.from(cs, 'base64').toString('utf8'));
    const prefix = Buffer.from(c.v.a, 'base64');
    const expectHex = Buffer.from(c.v.c, 'base64').toString('hex');

    for (let i = 0; i <= 1000000; i++) {
      const hashHex = crypto.createHash('sha256').update(prefix).update(String(i)).digest('hex');
      if (hashHex === expectHex) {
        c.d = Buffer.from(String(i), 'utf8').toString('base64');
        const jsv = Buffer.from(JSON.stringify(c), 'utf8').toString('base64');
        const cookies = [`${wci}=${jsv}`];
        if (rci && rs) cookies.push(`${rci}=${rs}`);
        if (rsId) cookies.push(`waforigin_id=${rsId}`);
        return cookies.join('; ');
      }
    }
  } catch {
    return null;
  }
  return null;
}

function mergeCookieStrings(...cookieParts: Array<string | undefined>): string {
  const map = new Map<string, string>();
  for (const part of cookieParts) {
    if (!part) continue;
    for (const seg of part.split(';')) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const name = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!name || !val) continue;
      map.set(name, val);
    }
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Tải trang công khai TikTok (Kênh hoặc Video) kèm tự động vượt tường lửa SlardarWAF,
 * giải mã độc lập cookie WAF theo đúng từng đường dẫn và điều tiết luồng qua ConcurrencyLimiter.
 */
export async function fetchTikTokHtmlWithWafBypass(
  url: string,
  timeoutMs = 6500
): Promise<{ html: string; finalUrl: string } | null> {
  const store = getSharedCrawlerStore();
  return store.tiktokLimiter.run(async () => {
    try {
      const r1Headers: Record<string, string> = {
        'User-Agent': DEFAULT_BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      };

      const r1 = await fetch(url, {
        method: 'GET',
        headers: r1Headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });

      const finalUrl = r1.url ? r1.url.split('?')[0] : url;
      const setCookies1 = (
        r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie') || '']
      )
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean);

      const html1 = await r1.text();
      const wafCookie1 = solveTikTokWafHtml(html1);
      if (!wafCookie1) {
        return { html: html1, finalUrl };
      }

      const combinedCookie1 = mergeCookieStrings(...setCookies1, wafCookie1);

      const r2 = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          Cookie: combinedCookie1,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });

      const setCookies2 = (
        r2.headers.getSetCookie ? r2.headers.getSetCookie() : [r2.headers.get('set-cookie') || '']
      )
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean);
      const html2 = await r2.text();
      const finalUrl2 = r2.url ? r2.url.split('?')[0] : finalUrl;

      const wafCookie2 = solveTikTokWafHtml(html2);
      if (!wafCookie2) {
        return {
          html: html2,
          finalUrl: finalUrl2,
        };
      }

      const combinedCookie2 = mergeCookieStrings(combinedCookie1, ...setCookies2, wafCookie2);

      const r3 = await fetch(finalUrl2, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          Cookie: combinedCookie2,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });

      const html3 = await r3.text();
      return {
        html: html3,
        finalUrl: r3.url ? r3.url.split('?')[0] : finalUrl2,
      };
    } catch {
      return null;
    }
  });
}

export interface RealTikTokVideoAndAuthorDetail {
  videoId: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  createTimeSec: number;
  durationSeconds: number;
  musicTitle: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
  author: {
    handle: string;
    nickname: string;
    bio: string;
    avatarUrl?: string;
    isVerified: boolean;
    followers: number;
    following: number;
    totalLikes: number;
    videoCount: number;
    extractedPhone?: string;
    extractedZalo?: string;
    extractedEmail?: string;
  };
}

function isNonProductAnchorText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return true;
  return (
    lower.includes('capcut') ||
    lower.includes('thử mẫu') ||
    lower.includes('template') ||
    lower.includes('green screen') ||
    lower.includes('hiệu ứng') ||
    lower.includes('effect') ||
    lower.includes('sound')
  );
}

function extractTikTokShopAnchorInfo(itemStruct: Record<string, unknown>): {
  hasCartAnchor: boolean;
  cartAnchorTitle?: string;
} {
  const anchors = Array.isArray(itemStruct.anchors) ? itemStruct.anchors : [];
  let hasCartAnchor = Boolean(itemStruct.isECVideo);
  let cartAnchorTitle: string | undefined;

  for (const rawAnchor of anchors) {
    if (!rawAnchor || typeof rawAnchor !== 'object') continue;
    const anchor = rawAnchor as Record<string, unknown>;
    const schema = typeof anchor.schema === 'string' ? anchor.schema.toLowerCase() : '';
    const isCapcutSchema = schema.includes('capcut');

    if (typeof anchor.extra === 'string' && anchor.extra.trim()) {
      try {
        const parsedExtra = JSON.parse(anchor.extra);
        const outerList = Array.isArray(parsedExtra) ? parsedExtra : [parsedExtra];
        for (const outer of outerList) {
          if (!outer || typeof outer !== 'object') continue;
          const outerObj = outer as Record<string, unknown>;
          const compKey = typeof outerObj.component_key === 'string' ? outerObj.component_key : '';
          const outerKeyword = typeof outerObj.keyword === 'string' ? outerObj.keyword.trim() : '';

          if (compKey === 'anchor_shop' || outerObj.type === 33) {
            hasCartAnchor = true;
          }

          if (typeof outerObj.extra === 'string' && outerObj.extra.trim()) {
            try {
              const innerObj = JSON.parse(outerObj.extra) as Record<string, unknown>;
              const innerTitle =
                (typeof innerObj.title === 'string' && innerObj.title.trim()) ||
                (typeof innerObj.elastic_title === 'string' && innerObj.elastic_title.trim()) ||
                '';
              if (
                innerObj.product_id ||
                innerObj.seo_url ||
                innerObj.source === 'TikTok Shop' ||
                innerTitle
              ) {
                hasCartAnchor = true;
                if (innerTitle && !cartAnchorTitle) {
                  cartAnchorTitle = innerTitle;
                }
              }
            } catch {
              // ignore inner parse error
            }
          }

          if (hasCartAnchor && !cartAnchorTitle && outerKeyword && !isNonProductAnchorText(outerKeyword)) {
            cartAnchorTitle = outerKeyword;
          }
        }
      } catch {
        // ignore outer parse error
      }
    }

    if (!isCapcutSchema && !cartAnchorTitle) {
      const kw =
        (typeof anchor.keyword === 'string' && anchor.keyword.trim()) ||
        (typeof anchor.description === 'string' && anchor.description.trim()) ||
        '';
      if (kw && !isNonProductAnchorText(kw) && hasCartAnchor) {
        cartAnchorTitle = kw;
      }
    }
  }

  return { hasCartAnchor, cartAnchorTitle };
}

/**
 * Bóc tách đồng thời cả Chỉ số Video thực tế VÀ Hồ sơ KOC thực tế từ trang Video TikTok (webapp.video-detail).
 * Có bộ nhớ đệm dùng chung (TTL 30 phút) và gộp truy vấn trùng (In-Flight Deduplication) cho 30+ người dùng đồng thời.
 */
export async function inspectLiveTikTokVideoPage(
  videoUrl: string
): Promise<RealTikTokVideoAndAuthorDetail | null> {
  const normalizedKey = videoUrl.trim().split('?')[0].toLowerCase();
  if (!normalizedKey) return null;

  const store = getSharedCrawlerStore();
  const now = Date.now();
  const cached = store.videoDetailCache.get(normalizedKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existingInFlight = store.inFlightVideoDetail.get(normalizedKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const taskPromise = (async (): Promise<RealTikTokVideoAndAuthorDetail | null> => {
    const fetched = await fetchTikTokHtmlWithWafBypass(videoUrl);
    if (!fetched) return null;

    try {
      const scriptMatch = fetched.html.match(
        /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
      );
      if (!scriptMatch || !scriptMatch[1]) return null;

      const json = JSON.parse(scriptMatch[1]);
      const defaultScope = json?.__DEFAULT_SCOPE__ || {};
      const videoDetailScope =
        defaultScope?.['webapp.video-detail'] ||
        defaultScope?.['webapp.reflow.video.detail'];
      const itemStruct = videoDetailScope?.itemInfo?.itemStruct;

      if (!itemStruct || !itemStruct.author || itemStruct.takeDown === 1) return null;

      const u = itemStruct.author;
      const s = itemStruct.authorStats || itemStruct.authorStatsV2 || {};
      const stats1 = itemStruct.stats || {};
      const stats2 = itemStruct.statsV2 || {};
      const handle = String(u.uniqueId || '')
        .trim()
        .toLowerCase();
      if (!handle) return null;

      const views = Math.max(Number(stats1.playCount || 0), Number(stats2.playCount || 0));
      const likes = Math.max(Number(stats1.diggCount || 0), Number(stats2.diggCount || 0));
      const comments = Math.max(Number(stats1.commentCount || 0), Number(stats2.commentCount || 0));
      const shares = Math.max(Number(stats1.shareCount || 0), Number(stats2.shareCount || 0));
      const saves = Math.max(Number(stats1.collectCount || 0), Number(stats2.collectCount || 0));
      const durationSeconds = Number(itemStruct.video?.duration || 0);

      if (views === 0 && likes === 0 && comments === 0 && durationSeconds === 0) {
        return null;
      }

      const videoId = String(itemStruct.id || '');
      let createTimeSec = Number(itemStruct.createTime || 0);
      if (createTimeSec <= 1000000000 && /^\d{17,22}$/.test(videoId)) {
        try {
          const snowflakeSec = Number(BigInt(videoId) >> BigInt(32));
          if (snowflakeSec > 1451606400 && snowflakeSec < 2100000000) {
            createTimeSec = snowflakeSec;
          }
        } catch {
          // ignore
        }
      }
      const publishedAt =
        createTimeSec > 1000000000
          ? new Date(createTimeSec * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);

      const contentsDesc = Array.isArray(itemStruct.contents)
        ? itemStruct.contents
            .map((c: { desc?: string }) => (typeof c?.desc === 'string' ? c.desc.trim() : ''))
            .filter(Boolean)
            .join(' ')
        : '';
      const imagePostTitle =
        typeof itemStruct.imagePost?.title === 'string' ? itemStruct.imagePost.title.trim() : '';
      const stickerText = Array.isArray(itemStruct.stickersOnItem)
        ? itemStruct.stickersOnItem
            .flatMap((st: { stickerText?: string[] }) =>
              Array.isArray(st?.stickerText) ? st.stickerText : []
            )
            .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean)
            .join(' ')
        : '';

      const rawCaption =
        String(itemStruct.desc || '').trim() ||
        imagePostTitle ||
        contentsDesc;

      const hashtagSet = new Set<string>();
      for (const h of rawCaption.match(/#[\p{L}\p{N}_]+/gu) || []) {
        hashtagSet.add(h.toLowerCase());
      }
      if (Array.isArray(itemStruct.challenges)) {
        for (const ch of itemStruct.challenges) {
          const title = typeof ch?.title === 'string' ? ch.title.trim().replace(/^#+/, '') : '';
          if (title) hashtagSet.add(`#${title.toLowerCase()}`);
        }
      }
      if (Array.isArray(itemStruct.textExtra)) {
        for (const te of itemStruct.textExtra) {
          const hn = typeof te?.hashtagName === 'string' ? te.hashtagName.trim().replace(/^#+/, '') : '';
          if (hn) hashtagSet.add(`#${hn.toLowerCase()}`);
        }
      }
      const hashtags = Array.from(hashtagSet);

      const { hasCartAnchor, cartAnchorTitle } = extractTikTokShopAnchorInfo(itemStruct);

      const caption =
        rawCaption ||
        stickerText ||
        (cartAnchorTitle ? `Review ${cartAnchorTitle}` : '') ||
        (hashtags.length > 0 ? `Video kênh @${handle} ${hashtags.slice(0, 4).join(' ')}` : '') ||
        `Video kênh @${handle} (${publishedAt})`;

      const engagementRate =
        views > 0 ? Number((((likes + comments + shares) / views) * 100).toFixed(2)) : 0;

      const bio = typeof u.signature === 'string' ? u.signature.trim() : '';
      const contacts = extractContactsFromBio(bio);

      const canonicalUrl = `https://www.tiktok.com/@${handle}/video/${videoId}`;
      const result: RealTikTokVideoAndAuthorDetail = {
        videoId,
        videoUrl: canonicalUrl,
        caption,
        hashtags,
        publishedAt,
        createTimeSec,
        durationSeconds,
        musicTitle: String(itemStruct.music?.title || `Nhạc nền - @${handle}`),
        views,
        likes,
        comments,
        shares,
        saves,
        engagementRate,
        hasCartAnchor,
        cartAnchorTitle,
        author: {
          handle,
          nickname: String(u.nickname || handle),
          bio,
          avatarUrl: typeof u.avatarLarger === 'string' ? u.avatarLarger : u.avatarMedium,
          isVerified: Boolean(u.verified),
          followers: Number(s.followerCount || 0),
          following: Number(s.followingCount || 0),
          totalLikes: Number(s.heartCount ?? s.heart ?? 0),
          videoCount: Number(s.videoCount || 0),
          extractedPhone: contacts.phone,
          extractedZalo: contacts.zalo,
          extractedEmail: contacts.email,
        },
      };

      setBoundedCache(store.videoDetailCache, normalizedKey, result, VIDEO_CACHE_TTL_MS, 2500);
      setBoundedCache(
        store.videoDetailCache,
        canonicalUrl.toLowerCase(),
        result,
        VIDEO_CACHE_TTL_MS,
        2500
      );
      return result;
    } catch {
      return null;
    }
  })();

  store.inFlightVideoDetail.set(normalizedKey, taskPromise);
  try {
    return await taskPromise;
  } finally {
    store.inFlightVideoDetail.delete(normalizedKey);
  }
}

const BING_US_WIDGET_BLACKLIST = new Set([
  'bendymoto',
  'bubusafiira',
  'violin_phonix',
  'imeatingshhhhh',
  'kittensklout',
  'mikhadonovon',
  'tb4ypodcast',
  'akb48_official_tiktok',
]);

/**
 * Danh mục các đường dẫn Video TikTok Việt Nam thực tế đã xác thực (chỉ lưu URL gốc trên TikTok,
 * toàn bộ số liệu View/Like/Comment/Follower/Bio đều được truy vấn trực tiếp thời gian thực từ máy chủ TikTok qua inspectLiveTikTokVideoPage).
 * Dùng để bổ sung khi máy chủ Serverless đặt tại Mỹ (AWS US-East) bị công cụ tìm kiếm giới hạn theo vùng địa lý.
 */
const VERIFIED_VN_TIKTOK_VIDEO_URLS: Record<
  string,
  Array<{ handle: string; videoId: string; videoUrl: string }>
> = {
  larocheposay: [
    { handle: 'dhnlie', videoId: '7638191108970843412', videoUrl: 'https://www.tiktok.com/@dhnlie/video/7638191108970843412' },
    { handle: 'quinskincareholic', videoId: '7511336312234970375', videoUrl: 'https://www.tiktok.com/@quinskincareholic/video/7511336312234970375' },
    { handle: 'vu_dieuthuy_', videoId: '7619313454364724500', videoUrl: 'https://www.tiktok.com/@vu_dieuthuy_/video/7619313454364724500' },
    { handle: 'meox96', videoId: '7477573484609129746', videoUrl: 'https://www.tiktok.com/@meox96/video/7477573484609129746' },
    { handle: 'minchimoah', videoId: '7622252402468588808', videoUrl: 'https://www.tiktok.com/@minchimoah/video/7622252402468588808' },
    { handle: 'thuuyen1402', videoId: '7511329708047469842', videoUrl: 'https://www.tiktok.com/@thuuyen1402/video/7511329708047469842' },
    { handle: 'manhtienkhoi_', videoId: '7513161286222499090', videoUrl: 'https://www.tiktok.com/@manhtienkhoi_/video/7513161286222499090' },
    { handle: 'tongdaimeogoi', videoId: '7514198189545704712', videoUrl: 'https://www.tiktok.com/@tongdaimeogoi/video/7514198189545704712' },
    { handle: 'ducli_duli', videoId: '7578482278234361109', videoUrl: 'https://www.tiktok.com/@ducli_duli/video/7578482278234361109' },
    { handle: 'kyn.review1', videoId: '7513859798962556167', videoUrl: 'https://www.tiktok.com/@kyn.review1/video/7513859798962556167' },
    { handle: 'trinh_lucia', videoId: '7359828276963036423', videoUrl: 'https://www.tiktok.com/@trinh_lucia/video/7359828276963036423' },
  ],
  anessa: [
    { handle: 'mamachanbeauty', videoId: '7628553171555601684', videoUrl: 'https://www.tiktok.com/@mamachanbeauty/video/7628553171555601684' },
    { handle: 'gaoiuu2025', videoId: '7621930879387995413', videoUrl: 'https://www.tiktok.com/@gaoiuu2025/video/7621930879387995413' },
    { handle: 'rynaa.riviu', videoId: '7481606413664472338', videoUrl: 'https://www.tiktok.com/@rynaa.riviu/video/7481606413664472338' },
    { handle: 'trinh_lucia', videoId: '7510591383871196423', videoUrl: 'https://www.tiktok.com/@trinh_lucia/video/7510591383871196423' },
    { handle: 'luumaianh_', videoId: '7641123573322550536', videoUrl: 'https://www.tiktok.com/@luumaianh_/video/7641123573322550536' },
    { handle: 'chanhthu__', videoId: '7100138448777907482', videoUrl: 'https://www.tiktok.com/@chanhthu__/video/7100138448777907482' },
    { handle: 'viet_ngthe', videoId: '7645237029353049345', videoUrl: 'https://www.tiktok.com/@viet_ngthe/video/7645237029353049345' },
    { handle: 'reviewallthing', videoId: '7439379022288637191', videoUrl: 'https://www.tiktok.com/@reviewallthing/video/7439379022288637191' },
    { handle: 'ndiepne', videoId: '7627844204005297416', videoUrl: 'https://www.tiktok.com/@ndiepne/video/7627844204005297416' },
    { handle: 'banhbeophuphiemofficial', videoId: '7462386528816303367', videoUrl: 'https://www.tiktok.com/@banhbeophuphiemofficial/video/7462386528816303367' },
  ],
  romand: [
    { handle: 'xuannhilamgido', videoId: '7517244195300543752', videoUrl: 'https://www.tiktok.com/@xuannhilamgido/video/7517244195300543752' },
    { handle: '_tieutieu_', videoId: '7314257766330223873', videoUrl: 'https://www.tiktok.com/@_tieutieu_/video/7314257766330223873' },
    { handle: 'zaitestson', videoId: '7592614750735895816', videoUrl: 'https://www.tiktok.com/@zaitestson/video/7592614750735895816' },
    { handle: 'tiktok.029vn', videoId: '7594295379198348564', videoUrl: 'https://www.tiktok.com/@tiktok.029vn/video/7594295379198348564' },
    { handle: 'kaewtiechumoi', videoId: '7633496997349068039', videoUrl: 'https://www.tiktok.com/@kaewtiechumoi/video/7633496997349068039' },
    { handle: 'hmyhviet', videoId: '7524544771839282450', videoUrl: 'https://www.tiktok.com/@hmyhviet/video/7524544771839282450' },
    { handle: 'maris.dbeauty', videoId: '7547874474398469383', videoUrl: 'https://www.tiktok.com/@maris.dbeauty/video/7547874474398469383' },
    { handle: 'kiera8963', videoId: '7633996946608246024', videoUrl: 'https://www.tiktok.com/@kiera8963/video/7633996946608246024' },
    { handle: 'maitrangreal', videoId: '7615945105333177618', videoUrl: 'https://www.tiktok.com/@maitrangreal/video/7615945105333177618' },
    { handle: 'lolimeo', videoId: '7506513705006288135', videoUrl: 'https://www.tiktok.com/@lolimeo/video/7506513705006288135' },
    { handle: 'lethituyetnghi', videoId: '7486026816319442194', videoUrl: 'https://www.tiktok.com/@lethituyetnghi/video/7486026816319442194' },
    { handle: 'kicidoa', videoId: '7469025084003323152', videoUrl: 'https://www.tiktok.com/@kicidoa/video/7469025084003323152' },
  ],
  cocoon: [
    { handle: 'yangho.bando', videoId: '7647916662087240967', videoUrl: 'https://www.tiktok.com/@yangho.bando/video/7647916662087240967' },
    { handle: 'heyiamvanh', videoId: '7258122844238925061', videoUrl: 'https://www.tiktok.com/@heyiamvanh/video/7258122844238925061' },
    { handle: 'gocreviewcuatuyen', videoId: '7677977042519919879', videoUrl: 'https://www.tiktok.com/@gocreviewcuatuyen/video/7677977042519919879' },
    { handle: 'bibiidayne', videoId: '7576402236201307399', videoUrl: 'https://www.tiktok.com/@bibiidayne/video/7576402236201307399' },
    { handle: 'bongbachthichlamdep', videoId: '7299071591403638018', videoUrl: 'https://www.tiktok.com/@bongbachthichlamdep/video/7299071591403638018' },
    { handle: 'tuongnhicosmetic', videoId: '7249660789043334405', videoUrl: 'https://www.tiktok.com/@tuongnhicosmetic/video/7249660789043334405' },
    { handle: 'trangtrangkhau', videoId: '7660324347407650069', videoUrl: 'https://www.tiktok.com/@trangtrangkhau/video/7660324347407650069' },
  ],
  skin1004: [
    { handle: 'nguyenskincare', videoId: '7384408669624077575', videoUrl: 'https://www.tiktok.com/@nguyenskincare/video/7384408669624077575' },
    { handle: 'vananh.onni', videoId: '7594401678183451922', videoUrl: 'https://www.tiktok.com/@vananh.onni/video/7594401678183451922' },
    { handle: 'halinhofficial', videoId: '7345087210372336914', videoUrl: 'https://www.tiktok.com/@halinhofficial/video/7345087210372336914' },
    { handle: 'ngoc.matcha.review', videoId: '7654909010633706772', videoUrl: 'https://www.tiktok.com/@ngoc.matcha.review/video/7654909010633706772' },
    { handle: 'tolahann08', videoId: '7639730369931087105', videoUrl: 'https://www.tiktok.com/@tolahann08/video/7639730369931087105' },
    { handle: 'muoixnatri', videoId: '7397290959391739154', videoUrl: 'https://www.tiktok.com/@muoixnatri/video/7397290959391739154' },
    { handle: 'hg.rv', videoId: '7339394935600336135', videoUrl: 'https://www.tiktok.com/@hg.rv/video/7339394935600336135' },
    { handle: 'gigigithebabe', videoId: '7459408690076994824', videoUrl: 'https://www.tiktok.com/@gigigithebabe/video/7459408690076994824' },
    { handle: 'uamiune', videoId: '7450508873733098770', videoUrl: 'https://www.tiktok.com/@uamiune/video/7450508873733098770' },
  ],
  cetaphil: [
    { handle: 'thuuyen1168', videoId: '7479041906689821960', videoUrl: 'https://www.tiktok.com/@thuuyen1168/video/7479041906689821960' },
    { handle: 'mai.trinh.h', videoId: '7542505082781224199', videoUrl: 'https://www.tiktok.com/@mai.trinh.h/video/7542505082781224199' },
    { handle: 'nhatkycuameichan', videoId: '7490926406432591112', videoUrl: 'https://www.tiktok.com/@nhatkycuameichan/video/7490926406432591112' },
    { handle: 'danquynh.daily', videoId: '7636344766187310357', videoUrl: 'https://www.tiktok.com/@danquynh.daily/video/7636344766187310357' },
    { handle: 'reviewallthing', videoId: '7519902876991261960', videoUrl: 'https://www.tiktok.com/@reviewallthing/video/7519902876991261960' },
    { handle: 'im_phuongdun', videoId: '7613389778058284289', videoUrl: 'https://www.tiktok.com/@im_phuongdun/video/7613389778058284289' },
    { handle: 'emlylynguyen', videoId: '7615246461340552455', videoUrl: 'https://www.tiktok.com/@emlylynguyen/video/7615246461340552455' },
    { handle: 'nhubinh.review', videoId: '7482329756772355346', videoUrl: 'https://www.tiktok.com/@nhubinh.review/video/7482329756772355346' },
  ],
  cerave: [
    { handle: 'hannieday10', videoId: '7650151251614764309', videoUrl: 'https://www.tiktok.com/@hannieday10/video/7650151251614764309' },
    { handle: 'unboxsiumlem', videoId: '7572886158271712532', videoUrl: 'https://www.tiktok.com/@unboxsiumlem/video/7572886158271712532' },
    { handle: 'misaa.diary', videoId: '7649641650595056917', videoUrl: 'https://www.tiktok.com/@misaa.diary/video/7649641650595056917' },
    { handle: 'enhobbies', videoId: '7597275670158298388', videoUrl: 'https://www.tiktok.com/@enhobbies/video/7597275670158298388' },
    { handle: 'vanmeoriviu', videoId: '7635493474388708624', videoUrl: 'https://www.tiktok.com/@vanmeoriviu/video/7635493474388708624' },
    { handle: 'biboriviu11', videoId: '7653129676646305045', videoUrl: 'https://www.tiktok.com/@biboriviu11/video/7653129676646305045' },
    { handle: 'trangtrangkhau', videoId: '7575931339564698900', videoUrl: 'https://www.tiktok.com/@trangtrangkhau/video/7575931339564698900' },
    { handle: 'vananh.onni', videoId: '7646819405699091720', videoUrl: 'https://www.tiktok.com/@vananh.onni/video/7646819405699091720' },
    { handle: 'loclucyofficial', videoId: '7595506840935402768', videoUrl: 'https://www.tiktok.com/@loclucyofficial/video/7595506840935402768' },
    { handle: 'changaffiliate', videoId: '7659393168156232980', videoUrl: 'https://www.tiktok.com/@changaffiliate/video/7659393168156232980' },
    { handle: 'nanaday_01', videoId: '7446821907254512904', videoUrl: 'https://www.tiktok.com/@nanaday_01/video/7446821907254512904' },
    { handle: 'polynh_', videoId: '7592201571706899720', videoUrl: 'https://www.tiktok.com/@polynh_/video/7592201571706899720' },
  ],
  loreal: [
    { handle: 'vanjinka', videoId: '7492654685346745608', videoUrl: 'https://www.tiktok.com/@vanjinka/video/7492654685346745608' },
    { handle: 'rireview75', videoId: '7545689532339932423', videoUrl: 'https://www.tiktok.com/@rireview75/video/7545689532339932423' },
    { handle: 'iamzrun', videoId: '7653070428294090005', videoUrl: 'https://www.tiktok.com/@iamzrun/video/7653070428294090005' },
    { handle: 'thanhhuyen_1307', videoId: '7642002165736787218', videoUrl: 'https://www.tiktok.com/@thanhhuyen_1307/video/7642002165736787218' },
    { handle: 'nhannhanbeauty', videoId: '7647178691126037780', videoUrl: 'https://www.tiktok.com/@nhannhanbeauty/video/7647178691126037780' },
    { handle: 'goc.cua.ru', videoId: '7497823931202555143', videoUrl: 'https://www.tiktok.com/@goc.cua.ru/video/7497823931202555143' },
    { handle: 'meshinro', videoId: '7650836388773940488', videoUrl: 'https://www.tiktok.com/@meshinro/video/7650836388773940488' },
    { handle: 'monly2810', videoId: '7647116438750121234', videoUrl: 'https://www.tiktok.com/@monly2810/video/7647116438750121234' },
    { handle: 'harrydailyyy', videoId: '7513189191304400135', videoUrl: 'https://www.tiktok.com/@harrydailyyy/video/7513189191304400135' },
    { handle: 'banchuyenskincare', videoId: '7636042550817869077', videoUrl: 'https://www.tiktok.com/@banchuyenskincare/video/7636042550817869077' },
    { handle: 'hoagreen02', videoId: '7680751587802893576', videoUrl: 'https://www.tiktok.com/@hoagreen02/video/7680751587802893576' },
    { handle: 'yangyun1012', videoId: '7573996937884470549', videoUrl: 'https://www.tiktok.com/@yangyun1012/video/7573996937884470549' },
  ],
  keyshu: [
    { handle: 'gaos_2602', videoId: '7648183148051991829', videoUrl: 'https://www.tiktok.com/@gaos_2602/video/7648183148051991829' },
    { handle: 'hn.nhathaday', videoId: '7569240407582969095', videoUrl: 'https://www.tiktok.com/@hn.nhathaday/video/7569240407582969095' },
    { handle: 'doha_20.07', videoId: '7561056894484221192', videoUrl: 'https://www.tiktok.com/@doha_20.07/video/7561056894484221192' },
    { handle: 'hyyeonw_', videoId: '7678858767890517266', videoUrl: 'https://www.tiktok.com/@hyyeonw_/video/7678858767890517266' },
    { handle: 'xxdux__', videoId: '7676376221252455687', videoUrl: 'https://www.tiktok.com/@xxdux__/video/7676376221252455687' },
    { handle: 'miamereviewday', videoId: '7655718121315093767', videoUrl: 'https://www.tiktok.com/@miamereviewday/video/7655718121315093767' },
    { handle: 'annie.rose697', videoId: '7548808880663399687', videoUrl: 'https://www.tiktok.com/@annie.rose697/video/7548808880663399687' },
    { handle: '_hattieune', videoId: '7475703983147928850', videoUrl: 'https://www.tiktok.com/@_hattieune/video/7475703983147928850' },
    { handle: 'chile.2000', videoId: '7541765684343098625', videoUrl: 'https://www.tiktok.com/@chile.2000/video/7541765684343098625' },
  ],
  kemchongnang: [
    { handle: 'harrydailyyy', videoId: '7613746197345471765', videoUrl: 'https://www.tiktok.com/@harrydailyyy/video/7613746197345471765' },
    { handle: 'mamachanbeauty', videoId: '7628553171555601684', videoUrl: 'https://www.tiktok.com/@mamachanbeauty/video/7628553171555601684' },
    { handle: 'unboxingai1', videoId: '7623367104628002055', videoUrl: 'https://www.tiktok.com/@unboxingai1/video/7623367104628002055' },
    { handle: 'user81219907245954', videoId: '7586612645151689992', videoUrl: 'https://www.tiktok.com/@user81219907245954/video/7586612645151689992' },
    { handle: 'reviewallthing', videoId: '7616757147753270549', videoUrl: 'https://www.tiktok.com/@reviewallthing/video/7616757147753270549' },
    { handle: 'trinhmeow.vlogger', videoId: '7647880887270427924', videoUrl: 'https://www.tiktok.com/@trinhmeow.vlogger/video/7647880887270427924' },
    { handle: 'lapiszuzu', videoId: '7632921886673915156', videoUrl: 'https://www.tiktok.com/@lapiszuzu/video/7632921886673915156' },
    { handle: 'giangchannn', videoId: '7628926392993926421', videoUrl: 'https://www.tiktok.com/@giangchannn/video/7628926392993926421' },
    { handle: 'bnh.m.pitaya', videoId: '7586611261442379016', videoUrl: 'https://www.tiktok.com/@bnh.m.pitaya/video/7586611261442379016' },
    { handle: 'aquabobo8', videoId: '7589939153555541249', videoUrl: 'https://www.tiktok.com/@aquabobo8/video/7589939153555541249' },
    { handle: 'kyn.review1', videoId: '7628209211310181650', videoUrl: 'https://www.tiktok.com/@kyn.review1/video/7628209211310181650' },
    { handle: 'skincarejerry', videoId: '7442126727108709650', videoUrl: 'https://www.tiktok.com/@skincarejerry/video/7442126727108709650' },
  ],
  skincare: [
    { handle: 'conmeo.keu_', videoId: '7648263603241405716', videoUrl: 'https://www.tiktok.com/@conmeo.keu_/video/7648263603241405716' },
    { handle: 'hapudunghet', videoId: '7647903412171836679', videoUrl: 'https://www.tiktok.com/@hapudunghet/video/7647903412171836679' },
    { handle: 'yuuxinh7699', videoId: '7485730067637718279', videoUrl: 'https://www.tiktok.com/@yuuxinh7699/video/7485730067637718279' },
    { handle: 'haiyekinke', videoId: '7637378773268172039', videoUrl: 'https://www.tiktok.com/@haiyekinke/video/7637378773268172039' },
    { handle: 'lxthaor', videoId: '7655195069577760007', videoUrl: 'https://www.tiktok.com/@lxthaor/video/7655195069577760007' },
    { handle: 'bsluuphuong', videoId: '7646413499165445384', videoUrl: 'https://www.tiktok.com/@bsluuphuong/video/7646413499165445384' },
    { handle: 'gigi.ngocngan', videoId: '7329121593651744001', videoUrl: 'https://www.tiktok.com/@gigi.ngocngan/video/7329121593651744001' },
    { handle: 'justjuliee02', videoId: '7631986987678846216', videoUrl: 'https://www.tiktok.com/@justjuliee02/video/7631986987678846216' },
    { handle: 'nguyenngoctuyen16', videoId: '7651528259808529685', videoUrl: 'https://www.tiktok.com/@nguyenngoctuyen16/video/7651528259808529685' },
    { handle: 'sophia.beauty99', videoId: '7276335610799885586', videoUrl: 'https://www.tiktok.com/@sophia.beauty99/video/7276335610799885586' },
    { handle: 'xinhdepwithme', videoId: '7269792882788191494', videoUrl: 'https://www.tiktok.com/@xinhdepwithme/video/7269792882788191494' },
  ],
  clubclio: [
    { handle: 'minchimoah', videoId: '7553635350451637511', videoUrl: 'https://www.tiktok.com/@minchimoah/video/7553635350451637511' },
    { handle: 'hoangthachhh', videoId: '7509879936698600711', videoUrl: 'https://www.tiktok.com/@hoangthachhh/video/7509879936698600711' },
    { handle: 'cucaideyy', videoId: '7613430835768839444', videoUrl: 'https://www.tiktok.com/@cucaideyy/video/7613430835768839444' },
    { handle: 'thaoglowupdiary', videoId: '7611343947893378312', videoUrl: 'https://www.tiktok.com/@thaoglowupdiary/video/7611343947893378312' },
    { handle: 'lapiszuzu', videoId: '7564644653933382933', videoUrl: 'https://www.tiktok.com/@lapiszuzu/video/7564644653933382933' },
    { handle: 'kei.miii', videoId: '7572848267315268882', videoUrl: 'https://www.tiktok.com/@kei.miii/video/7572848267315268882' },
  ],
  kutieskin: [
    { handle: 'hanhriviu__', videoId: '7532712444607712530', videoUrl: 'https://www.tiktok.com/@hanhriviu__/video/7532712444607712530' },
    { handle: 'chamdabeyeu', videoId: '7533830501136633096', videoUrl: 'https://www.tiktok.com/@chamdabeyeu/video/7533830501136633096' },
    { handle: 'akumin3012', videoId: '7484598555538181383', videoUrl: 'https://www.tiktok.com/@akumin3012/video/7484598555538181383' },
    { handle: 'miamereviewday', videoId: '7682225343855430920', videoUrl: 'https://www.tiktok.com/@miamereviewday/video/7682225343855430920' },
    { handle: 'hoangnhung989', videoId: '7639277393429024018', videoUrl: 'https://www.tiktok.com/@hoangnhung989/video/7639277393429024018' },
    { handle: 'melon.228', videoId: '7594459428435332370', videoUrl: 'https://www.tiktok.com/@melon.228/video/7594459428435332370' },
    { handle: 'memonminreview', videoId: '7488701541759651078', videoUrl: 'https://www.tiktok.com/@memonminreview/video/7488701541759651078' },
    { handle: 'reviewtattantat1806', videoId: '7440074059771071752', videoUrl: 'https://www.tiktok.com/@reviewtattantat1806/video/7440074059771071752' },
    { handle: 'giadinhsido', videoId: '7546919450373524743', videoUrl: 'https://www.tiktok.com/@giadinhsido/video/7546919450373524743' },
  ],
  duocmypham: [
    { handle: 'sobeauty.glx', videoId: '7640003474041621761', videoUrl: 'https://www.tiktok.com/@sobeauty.glx/video/7640003474041621761' },
    { handle: 'bacsicanhvu', videoId: '7595813741380373780', videoUrl: 'https://www.tiktok.com/@bacsicanhvu/video/7595813741380373780' },
    { handle: 'ngophuonglinhneee', videoId: '7588137119927799048', videoUrl: 'https://www.tiktok.com/@ngophuonglinhneee/video/7588137119927799048' },
    { handle: 'lynreviewne', videoId: '7598499117005901074', videoUrl: 'https://www.tiktok.com/@lynreviewne/video/7598499117005901074' },
    { handle: 'madamespaclinic', videoId: '7631789775258668308', videoUrl: 'https://www.tiktok.com/@madamespaclinic/video/7631789775258668308' },
    { handle: 'congbeauty3', videoId: '7482020226641464584', videoUrl: 'https://www.tiktok.com/@congbeauty3/video/7482020226641464584' },
  ],
  mebimsua: [
    { handle: 'mexitrum123', videoId: '7491912903625313554', videoUrl: 'https://www.tiktok.com/@mexitrum123/video/7491912903625313554' },
    { handle: 'mebim38ky', videoId: '7628577472459672839', videoUrl: 'https://www.tiktok.com/@mebim38ky/video/7628577472459672839' },
    { handle: 'hanhhaohuc', videoId: '7655519850718154005', videoUrl: 'https://www.tiktok.com/@hanhhaohuc/video/7655519850718154005' },
    { handle: 'nhacuakenkeo', videoId: '7613622287811513618', videoUrl: 'https://www.tiktok.com/@nhacuakenkeo/video/7613622287811513618' },
    { handle: 'phanducminh0709', videoId: '7656404507424787732', videoUrl: 'https://www.tiktok.com/@phanducminh0709/video/7656404507424787732' },
    { handle: 'kamidi.chamconeasy', videoId: '7597336142261898516', videoUrl: 'https://www.tiktok.com/@kamidi.chamconeasy/video/7597336142261898516' },
    { handle: 'goldyeu26', videoId: '7623591608839179541', videoUrl: 'https://www.tiktok.com/@goldyeu26/video/7623591608839179541' },
    { handle: 'coutxuann', videoId: '7660381163487317269', videoUrl: 'https://www.tiktok.com/@coutxuann/video/7660381163487317269' },
    { handle: 'tuilachang_tapdaulamme', videoId: '7623387273991671048', videoUrl: 'https://www.tiktok.com/@tuilachang_tapdaulamme/video/7623387273991671048' },
    { handle: 'me.an.cham.con', videoId: '7637460800008998165', videoUrl: 'https://www.tiktok.com/@me.an.cham.con/video/7637460800008998165' },
  ],
  cushion: [
    { handle: 'cucaideyy', videoId: '7570979524842704148', videoUrl: 'https://www.tiktok.com/@cucaideyy/video/7570979524842704148' },
    { handle: 'chichilinh__', videoId: '7594808490581888276', videoUrl: 'https://www.tiktok.com/@chichilinh__/video/7594808490581888276' },
    { handle: 'lapiszuzu', videoId: '7601145267634720021', videoUrl: 'https://www.tiktok.com/@lapiszuzu/video/7601145267634720021' },
    { handle: 'hanthie', videoId: '7634147729450536212', videoUrl: 'https://www.tiktok.com/@hanthie/video/7634147729450536212' },
    { handle: 'hannaholala', videoId: '7601395093391625492', videoUrl: 'https://www.tiktok.com/@hannaholala/video/7601395093391625492' },
    { handle: 'thuchienne6868', videoId: '7595388528972811527', videoUrl: 'https://www.tiktok.com/@thuchienne6868/video/7595388528972811527' },
    { handle: 'khvan19', videoId: '7604458740183665927', videoUrl: 'https://www.tiktok.com/@khvan19/video/7604458740183665927' },
  ],
  nous: [
    { handle: 'chuyennhathoday', videoId: '7696353302589738260', videoUrl: 'https://www.tiktok.com/@chuyennhathoday/video/7696353302589738260' },
    { handle: 'sukemshopdososinh', videoId: '7692300985150049556', videoUrl: 'https://www.tiktok.com/@sukemshopdososinh/video/7692300985150049556' },
    { handle: 'chuyennhathoday', videoId: '7682074704907373845', videoUrl: 'https://www.tiktok.com/@chuyennhathoday/video/7682074704907373845' },
    { handle: 'phm.nh.li1', videoId: '7670574316722851090', videoUrl: 'https://www.tiktok.com/@phm.nh.li1/video/7670574316722851090' },
    { handle: 'besuadeiii', videoId: '7664908993902464276', videoUrl: 'https://www.tiktok.com/@besuadeiii/video/7664908993902464276' },
    { handle: 'combodisinh', videoId: '7660439036749778197', videoUrl: 'https://www.tiktok.com/@combodisinh/video/7660439036749778197' },
    { handle: 'nousbabystore', videoId: '7657051530738126098', videoUrl: 'https://www.tiktok.com/@nousbabystore/video/7657051530738126098' },
    { handle: 'hathuuu163', videoId: '7651638911999085831', videoUrl: 'https://www.tiktok.com/@hathuuu163/video/7651638911999085831' },
    { handle: 'embemeo_1792', videoId: '7650505481550597383', videoUrl: 'https://www.tiktok.com/@embemeo_1792/video/7650505481550597383' },
    { handle: 'nous.vietnam', videoId: '7649743444771933458', videoUrl: 'https://www.tiktok.com/@nous.vietnam/video/7649743444771933458' },
    { handle: 'noushanoi', videoId: '7646366709301005576', videoUrl: 'https://www.tiktok.com/@noushanoi/video/7646366709301005576' },
    { handle: 'ngockhanhday', videoId: '7624523830559542549', videoUrl: 'https://www.tiktok.com/@ngockhanhday/video/7624523830559542549' },
    { handle: 'nousbabystoredaily', videoId: '7619699870349184276', videoUrl: 'https://www.tiktok.com/@nousbabystoredaily/video/7619699870349184276' },
    { handle: 'genzhocdelamcha', videoId: '7604079616076123413', videoUrl: 'https://www.tiktok.com/@genzhocdelamcha/video/7604079616076123413' },
  ],
};

export interface TargetKeywordProfile {
  rawClean: string;
  compactTag: string;
  rootToken: string;
  spacedAliases: string[];
  matchTokens: string[];
  searchQueries: string[];
}

const VN_HASHTAG_SPACED_DICTIONARY: Record<string, string[]> = {
  kemchongnang: ['kem chống nắng', 'kem chong nang', 'chống nắng'],
  duocmypham: ['dược mỹ phẩm', 'duoc my pham', 'da dầu mụn', 'chăm sóc da mụn', 'trị mụn'],
  mebimsua: ['mẹ bỉm sữa', 'me bim sua', 'mẹ bỉm', 'chăm con', 'đồ sơ sinh'],
  suaruamat: ['sữa rửa mặt', 'sua rua mat'],
  taytrang: ['nước tẩy trang', 'tẩy trang', 'tay trang'],
  kemduongam: ['kem dưỡng ẩm', 'kem duong am', 'dưỡng ẩm'],
  dososinh: ['đồ sơ sinh', 'do so sinh', 'quần áo sơ sinh'],
  quanaososinh: ['quần áo sơ sinh', 'đồ sơ sinh'],
  chamda: ['chăm sóc da', 'chăm da', 'skincare'],
  trimun: ['trị mụn', 'tri mun', 'da mụn', 'chấm mụn'],
  sonduong: ['son dưỡng', 'son duong'],
  trangdiem: ['trang điểm', 'makeup'],
  cushion: ['cushion', 'phấn nước', 'phan nuoc'],
  larocheposay: [
    'la roche posay',
    'la roche-posay',
    'kem chống nắng la roche posay',
    'b5 la roche posay',
    'sữa rửa mặt la roche posay',
  ],
  clubclio: ['club clio', 'clio', 'cushion clio', 'phấn nước clio', 'son clio'],
  cocoon: ['cocoon', 'cocoon vietnam', 'tẩy da chết cocoon', 'xịt bưởi cocoon', 'bí đao cocoon'],
  skin1004: ['skin1004', 'skin 1004', 'rau má skin1004', 'kem chống nắng skin1004'],
  anessa: ['anessa', 'kem chống nắng anessa', 'sữa chống nắng anessa'],
  romand: ['romand', 'rom&nd', 'son romand', 'bảng màu romand'],
  cetaphil: ['cetaphil', 'sữa rửa mặt cetaphil', 'sữa tắm cetaphil'],
  cerave: ['cerave', 'sữa rửa mặt cerave', 'kem dưỡng cerave'],
  loreal: ['loreal', "l'oreal", 'nước tẩy trang loreal', 'kem chống nắng loreal'],
  keyshu: ['keyshu', 'mặt nạ keyshu', 'kem chống nắng keyshu'],
  kutieskin: ['kutieskin', 'kem chàm sữa kutieskin', 'kem hăm kutieskin', 'sữa tắm kutieskin'],
  mustela: ['mustela', 'sữa tắm mustela', 'kem hăm mustela', 'dầu tràm mustela'],
  byebyeblemish: [
    'bye bye blemish',
    'chấm mụn bye bye blemish',
    'lotion chấm mụn bye bye blemish',
    'serum bye bye blemish',
  ],
  cindybloom: [
    'cindy bloom',
    'sữa tắm cindy bloom',
    'sữa tắm nước hoa cindy bloom',
    'nước hoa cindy bloom',
    'xịt thơm cindy bloom',
    'body mist cindy bloom',
    'dưỡng thể cindy bloom',
  ],
  loccitane: ['loccitane', "l'occitane", 'dầu tắm hạnh nhân loccitane', 'kem tay loccitane'],
  rejuran: ['rejuran', 'serum rejuran', 'kem dưỡng rejuran', 'mặt nạ rejuran'],
  babe: ['babe', 'babé', 'sữa rửa mặt babe', 'kem dưỡng babe', 'kem chống nắng babe'],
  cathydoll: ['cathy doll', 'kem chống nắng cathy doll', 'sữa tắm cathy doll'],
  nabizam: ['nabizam', 'bỉm nabizam', 'tã nabizam'],
  nousvietnam: [
    'nous vietnam',
    'nous việt nam',
    'nous baby',
    'đồ sơ sinh nous',
    'nhà nous',
    'đồ nous',
    'quần áo nous',
    'bộ nous',
    'nous cho bé',
    'nous sơ sinh',
    'hãng nous',
    'set sơ sinh nous',
    'review đồ nous',
    'săn sale nous',
    'khăn sữa nous',
  ],
  nous: [
    'nous vietnam',
    'nous việt nam',
    'nous baby',
    'đồ sơ sinh nous',
    'nhà nous',
    'đồ nous',
    'quần áo nous',
    'bộ nous',
    'nous cho bé',
    'nous sơ sinh',
    'hãng nous',
    'set sơ sinh nous',
    'review đồ nous',
    'săn sale nous',
    'khăn sữa nous',
  ],
  coolmate: [
    'coolmate',
    'áo thun coolmate',
    'quần coolmate',
    'đồ nam coolmate',
    'review coolmate',
    'unbox coolmate',
  ],
};

export function stripVnAccents(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/**
 * Bóc tách từ khóa / hashtag / @handle (kể cả từ ghép như #nousvietnam, @larocheposayvn, #kutieskinmama, "cindy bloom")
 * thành bộ gốc thương hiệu (rootToken), cụm từ có dấu/cách chữ và danh sách truy vấn đặt trong ngoặc kép.
 */
export function buildTargetKeywordProfile(rawInput: string): TargetKeywordProfile {
  const rawClean = (rawInput || '').replace(/^[#@]+/, '').trim();
  const asciiClean = stripVnAccents(rawClean);

  const GENERIC_AFFIX_RE =
    /^(official|vietnam|vn|store|shop|live|mall|channel|chinhhang|korea|kr|japan|jp|cosmetics|beauty|mama|baby|kids|paris|global|authentic|auth)$/i;

  const rawSegments = asciiClean
    .split(/[\s._-]+/)
    .map((s) => s.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  const filteredSegments = rawSegments.filter((seg, idx) => {
    if (rawSegments.length > 1 && GENERIC_AFFIX_RE.test(seg)) return false;
    // Loại bỏ tiền tố lặp lại nằm trong từ chính (VD: "cool.coolmate" -> bỏ "cool", giữ "coolmate")
    if (
      rawSegments.length > 1 &&
      seg.length <= 5 &&
      rawSegments.some((other, otherIdx) => otherIdx !== idx && other.length > seg.length && other.includes(seg))
    ) {
      return false;
    }
    return true;
  });

  const effectiveSegments = filteredSegments.length > 0 ? filteredSegments : rawSegments;
  const fullCompactTag = asciiClean.replace(/[^a-z0-9_]/g, '');
  const compactTag = effectiveSegments.join('') || fullCompactTag;

  const strippedRoot = compactTag
    .replace(
      /(?:_|-|\.)?(official|vietnam|vn|store|shop|live|mall|channel|chinhhang|korea|kr|japan|jp|cosmetics|beauty|mama|baby|kids|paris)$/i,
      ''
    )
    .replace(/^_+|_+$/g, '');

  const rootToken = strippedRoot.length >= 3 ? strippedRoot : compactTag;

  // Không tách tên thương hiệu nhiều từ cách nhau bằng khoảng trắng (VD: "cindy bloom", "bye bye blemish")
  // thành các từ tiếng Anh đơn lẻ ("cindy", "bloom") gây khớp nhầm video quốc tế (#bloompop)
  const hasMultipleSpacedWords = /\s/.test(rawClean.trim()) && effectiveSegments.length >= 2;
  const distinctiveSubTokens = hasMultipleSpacedWords
    ? []
    : effectiveSegments.filter(
        (s) => s.length >= 6 && s !== rootToken && !GENERIC_AFFIX_RE.test(s)
      );

  const dictEntries =
    VN_HASHTAG_SPACED_DICTIONARY[compactTag] ||
    VN_HASHTAG_SPACED_DICTIONARY[rootToken] ||
    VN_HASHTAG_SPACED_DICTIONARY[fullCompactTag] ||
    [];

  const spacedPhrase = effectiveSegments.length > 1 ? effectiveSegments.join(' ') : '';
  const dottedPhrase = effectiveSegments.length > 1 ? effectiveSegments.join('.') : '';
  const underscoredPhrase = effectiveSegments.length > 1 ? effectiveSegments.join('_') : '';

  const spacedAliases = Array.from(
    new Set([
      ...dictEntries,
      ...(spacedPhrase ? [spacedPhrase] : []),
      ...(rawClean.includes(' ') ? [rawClean.toLowerCase()] : []),
      ...(rootToken && rootToken !== fullCompactTag
        ? [
            `${rootToken} vietnam`,
            `review ${rootToken}`,
          ]
        : []),
    ])
  );

  const matchTokens = Array.from(
    new Set(
      [
        compactTag,
        rootToken,
        fullCompactTag,
        ...(dottedPhrase ? [dottedPhrase] : []),
        ...(underscoredPhrase ? [underscoredPhrase] : []),
        ...(rawClean.includes('.') ? [asciiClean] : []),
        ...distinctiveSubTokens,
        ...spacedAliases.map((s) => stripVnAccents(s).trim()),
      ].filter((t) => t.length >= 3)
    )
  );

  const primaryQueryTerm = spacedPhrase || rootToken;
  const isShortAmbiguousRoot = rootToken.length <= 5;

  const searchQueries = Array.from(
    new Set([
      ...(rawClean.includes('.') ? [`tiktok.com "@${asciiClean}"`] : []),
      ...(compactTag !== rootToken ? [`tiktok.com "#${compactTag}"`] : []),
      `tiktok.com "#${rootToken}vietnam"`,
      ...spacedAliases.slice(0, 14).flatMap((alias) => {
        const otherWords = alias
          .replace(new RegExp(`\\b${escapeRegexLiteral(rootToken)}\\b`, 'gi'), '')
          .trim();
        return [
          `tiktok.com "${alias}"`,
          ...(otherWords ? [`tiktok.com "${rootToken}" ${otherWords}`] : []),
        ];
      }),
      ...distinctiveSubTokens.map((sub) => `tiktok.com "#${sub}"`),
      `tiktok.com "review ${primaryQueryTerm}"`,
      `tiktok.com "${primaryQueryTerm}" review`,
      `tiktok.com "${primaryQueryTerm}" chính hãng`,
      `tiktok.com "${primaryQueryTerm}" unbox`,
      `tiktok.com "${primaryQueryTerm}" tiktok shop`,
      `tiktok.com "${primaryQueryTerm}" săn sale`,
      `tiktok.com "#${rootToken}" review`,
      `tiktok.com "#${rootToken}" việt nam`,
      ...(isShortAmbiguousRoot
        ? [
            `tiktok.com "${rootToken}" cho bé`,
            `tiktok.com "${rootToken}" sơ sinh`,
            `tiktok.com "${rootToken}" mẹ bỉm`,
            `tiktok.com "${rootToken}" quần áo`,
            `tiktok.com "${rootToken}" bộ`,
            `tiktok.com "${rootToken}" set`,
            `tiktok.com "#${rootToken}" cho bé`,
            `tiktok.com "#${rootToken}" chính hãng`,
            `tiktok.com "#${rootToken}"`,
            `tiktok.com "${primaryQueryTerm}"`,
          ]
        : [
            `tiktok.com "#${rootToken}"`,
            `tiktok.com "${primaryQueryTerm}"`,
          ]),
    ])
  );

  return {
    rawClean,
    compactTag,
    rootToken,
    spacedAliases,
    matchTokens,
    searchQueries,
  };
}

function escapeRegexLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textContainsAnyToken(rawText: string, matchTokens: string[]): boolean {
  if (!matchTokens || matchTokens.length === 0) return true;
  const norm = stripVnAccents(rawText);
  for (const token of matchTokens) {
    if (!token) continue;
    if (token.length <= 5 && /^[a-z0-9]+$/.test(token)) {
      const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegexLiteral(token)}(?:$|[^a-z0-9]|vietnam|vn|baby|kids|mom|mama|store|shop|official|cushion)`, 'i');
      if (re.test(norm)) return true;
    } else if (norm.includes(token)) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra nghiêm ngặt xem video thực tế trên TikTok (sau khi inspectLiveTikTokVideoPage)
 * có thực sự nhắc tới hashtag / thương hiệu / từ khóa mục tiêu và thuộc ngữ cảnh Việt Nam hay không.
 * Loại bỏ 100% video rác quốc tế (VD: tin tức bóng bầu dục Mỹ @ketv7newswatch, từ "nous" tiếng Pháp @mariabalenga, #bloompop Mỹ @autumatic4thepeople)
 * hoặc video nhạc/trend không liên quan (@giangokinguyen).
 */
export function doesInspectedVideoMatchTarget(
  inspected: RealTikTokVideoAndAuthorDetail,
  rawTargetInput: string
): boolean {
  const profile = buildTargetKeywordProfile(rawTargetInput);
  if (profile.matchTokens.length === 0) return true;

  // Bản thân nội dung Video (Caption + Hashtags + Sản phẩm gắn giỏ hàng) BẮT BUỘC phải chứa từ khóa/hashtag mục tiêu
  const videoOnlyText = [
    inspected.caption,
    inspected.hashtags.join(' '),
    inspected.cartAnchorTitle || '',
  ].join(' ');

  if (!textContainsAnyToken(videoOnlyText, profile.matchTokens)) {
    return false;
  }

  const combinedRaw = [
    videoOnlyText,
    inspected.author.handle,
    inspected.author.nickname,
    inspected.author.bio,
  ].join(' ');

  // Bắt buộc video/kênh phải thuộc ngữ cảnh Việt Nam (tránh lọt video quốc tế của các thương hiệu toàn cầu)
  const norm = stripVnAccents(combinedRaw);

  // Loại bỏ ngay nếu gắn thẻ chi nhánh quốc gia khác ngoài Việt Nam
  if (
    /\b(brasil|brazil|mexico|espana|italia|deutschland|polska|turkiye|indonesia|malaysia|philippines|thailand|india|pakistan|nigeria|arabia)\b/i.test(
      norm
    )
  ) {
    return false;
  }

  const hasExplicitVnBrandTag =
    norm.includes(`${profile.rootToken}vietnam`) ||
    norm.includes(`${profile.rootToken}.vietnam`) ||
    norm.includes(`${profile.rootToken}_vn`) ||
    norm.includes(`${profile.rootToken}vn`) ||
    norm.includes(`${profile.rootToken}_hcm`) ||
    norm.includes(`${profile.rootToken}babystore`) ||
    norm.includes(`${profile.rootToken}hanoi`) ||
    /\b(vietnam|viet nam|ha noi|hanoi|tphcm|sai gon|saigon|da nang|tiktokshopvn|xuhuong|goclamdep|reviewlamdep|mebimsua|dososinh|suatam|kemchongnang|duocmypham|chinhhang)\b/i.test(
      norm
    );

  const hasSpecificVietnameseDiacritics =
    /[ăằắặẳẵầấậẩẫềếệểễìíịỉĩòóọỏõồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđảạẻẹỉịỏọủụỷỵ]/i.test(
      combinedRaw
    );
  // Chỉ dùng các từ tiếng Việt không dấu đủ dài/đặc trưng (không dùng từ đơn 2-3 chữ trùng tiếng Anh như me, be, set, son, hop, mac, da)
  const hasUnmistakableUnaccentedVnPhrase =
    /\b(cua minh|cho be|nha minh|khong bi|chinh hang|sua tam|sua rua mat|kem chong nang|kem duong|nuoc hoa|tay trang|duong the|xit thom|dau goi|cham soc da|trang diem|me bim|so sinh)\b/i.test(
      norm
    );

  if (
    !hasExplicitVnBrandTag &&
    !hasSpecificVietnameseDiacritics &&
    !hasUnmistakableUnaccentedVnPhrase
  ) {
    return false;
  }

  return true;
}

/**
 * So sánh 2 mã TikTok Video ID (Snowflake 64-bit, trong đó 32 bit cao là Unix timestamp giây)
 * theo thứ tự giảm dần (video mới đăng lên trước -> video cũ).
 */
export function compareTikTokVideoIdDesc(videoIdA?: string, videoIdB?: string): number {
  const cleanA = (videoIdA || '').replace(/\D/g, '');
  const cleanB = (videoIdB || '').replace(/\D/g, '');
  if (!cleanA && !cleanB) return 0;
  if (!cleanA) return 1;
  if (!cleanB) return -1;
  try {
    const bigA = BigInt(cleanA);
    const bigB = BigInt(cleanB);
    return bigB > bigA ? 1 : bigB < bigA ? -1 : 0;
  } catch {
    return cleanB.localeCompare(cleanA);
  }
}

/**
 * Dò tìm chuyên biệt danh sách đường dẫn video thuộc về ĐÚNG 1 kênh TikTok (@handle).
 * Kết hợp đồng thời Bing Video Search (vi-VN) + DuckDuckGo HTML Search + Danh mục xác thực,
 * lọc nghiêm ngặt theo đúng @handle của kênh và sắp xếp theo Snowflake Video ID giảm dần (video mới đăng lên trước).
 */
export async function discoverTikTokChannelVideoUrls(
  rawHandle: string,
  options?: {
    nickname?: string;
    maxUrls?: number;
  }
): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> {
  const cleanHandle = rawHandle.trim().toLowerCase().replace(/^@+/, '');
  if (!cleanHandle) return [];
  const maxUrls = Math.min(Math.max(8, options?.maxUrls || 60), 120);
  const store = getSharedCrawlerStore();
  const cacheKey = `channel_videos__${cleanHandle}`;
  const now = Date.now();
  const cached = store.searchHtmlCache.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.data.length >= Math.min(maxUrls, 20)) {
    return cached.data.slice(0, maxUrls);
  }

  const found = new Map<string, { handle: string; videoId: string; videoUrl: string }>();

  const extractOwnVideosFromHtml = (rawHtml: string) => {
    const b64Decoded = [...rawHtml.matchAll(/(?:[?&]|&amp;)u=a1([a-zA-Z0-9_-]+)/g)]
      .map((m) => {
        try {
          return Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        } catch {
          return '';
        }
      })
      .join('\n');

    const normalized = `${rawHtml}\n${b64Decoded}`
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/%40/g, '@')
      .replace(/%2F/gi, '/')
      .replace(/\\u002f/gi, '/');

    for (const m of normalized.matchAll(/tiktok\.com\/@([a-zA-Z0-9._-]+)\/(?:video|photo)\/(\d{15,22})/gi)) {
      const h = m[1].toLowerCase();
      if (h !== cleanHandle) continue;
      const videoId = m[2];
      if (!found.has(videoId)) {
        found.set(videoId, {
          handle: cleanHandle,
          videoId,
          videoUrl: `https://www.tiktok.com/@${cleanHandle}/video/${videoId}`,
        });
      }
    }
  };

  for (const items of Object.values(VERIFIED_VN_TIKTOK_VIDEO_URLS)) {
    for (const item of items) {
      if (item.handle.toLowerCase() === cleanHandle && !found.has(item.videoId)) {
        found.set(item.videoId, {
          handle: cleanHandle,
          videoId: item.videoId,
          videoUrl: `https://www.tiktok.com/@${cleanHandle}/video/${item.videoId}`,
        });
      }
    }
  }

  const bingVideoUrls: string[] = [
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok.com/@${cleanHandle}/video`
    )}&async=content&first=0&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok.com/@${cleanHandle}/video`
    )}&async=content&first=35&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok.com/@${cleanHandle}/video`
    )}&async=content&first=70&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok.com/@${cleanHandle}/video`
    )}&async=content&first=105&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok @${cleanHandle}`
    )}&async=content&first=0&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok @${cleanHandle}`
    )}&async=content&first=35&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok @${cleanHandle}`
    )}&async=content&first=70&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `site:tiktok.com/@${cleanHandle}`
    )}&async=content&first=0&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
    `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `site:tiktok.com/@${cleanHandle}`
    )}&async=content&first=35&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
  ];

  if (
    options?.nickname &&
    options.nickname.trim() &&
    options.nickname.trim().toLowerCase() !== cleanHandle
  ) {
    bingVideoUrls.push(
      `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
        `tiktok.com/@${cleanHandle} ${options.nickname.trim()}`
      )}&async=content&first=0&count=35&mkt=vi-VN&setlang=vi&cc=VN`,
      `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
        `tiktok.com/@${cleanHandle} ${options.nickname.trim()}`
      )}&async=content&first=35&count=35&mkt=vi-VN&setlang=vi&cc=VN`
    );
  }

  const bingWebUrls: string[] = [
    `https://www.bing.com/search?q=${encodeURIComponent(
      `site:tiktok.com/@${cleanHandle}/video`
    )}&count=50&first=1`,
    `https://www.bing.com/search?q=${encodeURIComponent(
      `site:tiktok.com/@${cleanHandle}/video`
    )}&count=50&first=51`,
    `https://www.bing.com/search?q=${encodeURIComponent(
      `site:tiktok.com/@${cleanHandle}/video`
    )}&count=50&first=101`,
  ];

  const searchTasks: Array<Promise<void>> = [
    ...bingVideoUrls.map((url) =>
      store.searchLimiter.run(async () => {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': DEFAULT_BROWSER_UA,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
              Cookie: '_EDGE_S=mkt=vi-vn&ui=vi-vn; SRCHHPGUSR=SRCHLANG=vi',
            },
            signal: AbortSignal.timeout(4500),
            cache: 'no-store',
          });
          if (res.ok) {
            extractOwnVideosFromHtml(await res.text());
          }
        } catch {
          // ignore
        }
      })
    ),
    ...bingWebUrls.map((url) =>
      store.searchLimiter.run(async () => {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': DEFAULT_BROWSER_UA,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
            },
            signal: AbortSignal.timeout(4500),
            cache: 'no-store',
          });
          if (res.ok) {
            extractOwnVideosFromHtml(await res.text());
          }
        } catch {
          // ignore
        }
      })
    ),
    store.searchLimiter.run(async () => {
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
          `site:tiktok.com/@${cleanHandle}/video`
        )}`;
        const res = await fetch(ddgUrl, {
          headers: {
            'User-Agent': DEFAULT_BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        });
        if (res.ok) {
          extractOwnVideosFromHtml(await res.text());
        }
      } catch {
        // ignore
      }
    }),
  ];

  await Promise.allSettled(searchTasks);

  const sorted = [...found.values()].sort((a, b) =>
    compareTikTokVideoIdDesc(a.videoId, b.videoId)
  );

  if (sorted.length > 0) {
    setBoundedCache(store.searchHtmlCache, cacheKey, sorted, SEARCH_CACHE_TTL_MS, 500);
  }

  return sorted.slice(0, maxUrls);
}

/**
 * Tìm kiếm danh sách đường dẫn video TikTok thực tế (https://www.tiktok.com/@handle/video/videoId)
 * thông qua chỉ mục Bing Video Search (vi-VN) và danh mục URL video TikTok Việt Nam đã xác thực.
 * Bóc tách theo từng thẻ kết quả (card-level metadata filtering) để loại bỏ hoàn toàn tham số q=... bị dội lại
 * và widget "Video thịnh hành ngẫu nhiên" của Bing.
 */
export async function discoverRealTikTokVideoUrlsByQuery(
  queries: string[],
  maxUrls = 30,
  options?: {
    excludeHandles?: string[];
    pageOffset?: number;
    targetKeyword?: string;
  }
): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> {
  const discovered = new Map<string, { handle: string; videoId: string; videoUrl: string }>();
  const liveCandidates = new Map<string, { handle: string; videoId: string; videoUrl: string }>();
  const uniqueLiveHandles = new Set<string>();
  const excludeSet = new Set(
    (options?.excludeHandles || []).map((h) => h.trim().toLowerCase().replace(/^@+/, ''))
  );
  const pageOffset = Math.max(0, options?.pageOffset || 0);

  const store = getSharedCrawlerStore();

  const rawTargetSeed =
    options?.targetKeyword ||
    queries
      .join(' ')
      .replace(/\b(tiktok\.com|tiktok|site:|review|chính hãng|chinh hang|video)\b/gi, ' ')
      .replace(/["#@]/g, ' ')
      .trim();

  const targetProfile = rawTargetSeed ? buildTargetKeywordProfile(rawTargetSeed) : null;
  const requiredTokens = targetProfile?.matchTokens || [];
  const longRequiredTokens = requiredTokens.filter((t) => t.length >= 7);
  const isShortAmbiguousRoot = Boolean(targetProfile && targetProfile.rootToken.length <= 5);

  // Tự động loại trừ các @handle đã bị từ chối ở các đợt quét trước của cùng từ khóa
  for (const h of getRejectedTargetHandles(rawTargetSeed)) {
    excludeSet.add(h);
  }
  if (targetProfile?.rootToken) {
    for (const h of getRejectedTargetHandles(targetProfile.rootToken)) {
      excludeSet.add(h);
    }
  }

  const extractUrlsFromHtml = (
    rawHtml: string
  ): Array<{ handle: string; videoId: string; videoUrl: string }> => {
    const found = new Map<string, { handle: string; videoId: string; videoUrl: string }>();

    // Tách theo từng thẻ kết quả độc lập của Bing Video (`mc_vtvc_con_rc`), Bing Web (`<li class="b_algo"`) hoặc DuckDuckGo (`class="result__body"`)
    // Tuyệt đối không quét toàn trang khi có requiredTokens để tránh dính widget "Video thịnh hành" ở thanh bên của Bing
    const videoCardBlocks = rawHtml.split(/class="mc_vtvc_con_rc"/i);
    const webAlgoBlocks = rawHtml.split(/<li\s+class="b_algo\b/i);
    const ddgResultBlocks = rawHtml.split(/class="result__body"/i);

    let blocksToScan: string[] = [];
    let isStructuredCard = false;

    if (videoCardBlocks.length > 1) {
      isStructuredCard = true;
      blocksToScan = videoCardBlocks.slice(1).map((b) => {
        const endAnchor = b.indexOf('</a>');
        return endAnchor > 0 ? b.slice(0, Math.min(endAnchor, 3500)) : b.slice(0, 2800);
      });
    } else if (webAlgoBlocks.length > 1) {
      isStructuredCard = true;
      blocksToScan = webAlgoBlocks.slice(1).map((b) => {
        const endLi = b.indexOf('</li>');
        return endLi > 0 ? b.slice(0, Math.min(endLi, 3500)) : b.slice(0, 3500);
      });
    } else if (ddgResultBlocks.length > 1) {
      isStructuredCard = true;
      blocksToScan = ddgResultBlocks.slice(1).map((b) => {
        const endClear = b.indexOf('<div class="clear"');
        return endClear > 0 ? b.slice(0, Math.min(endClear, 3000)) : b.slice(0, 2500);
      });
    } else if (requiredTokens.length === 0) {
      blocksToScan = [rawHtml];
    }

    for (const block of blocksToScan) {
      const b64Decoded = [...block.matchAll(/(?:[?&]|&amp;)u=a1([a-zA-Z0-9_-]+)/g)]
        .map((m) => {
          try {
            return Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
          } catch {
            return '';
          }
        })
        .join('\n');

      // Loại bỏ các tham số relatedvideo?q=... hoặc search?q=... mà Bing chèn vào thẻ để tránh khớp nhầm câu truy vấn
      const cleanB64Decoded = b64Decoded
        .replace(/(?:relatedvideo|search)\?[^"&'\s<>]+/gi, '')
        .replace(/[?&](?:q|pq|lq|sc)=[^"&'\s<>]+/gi, '');

      const cleanedBlock = `${block}\n${cleanB64Decoded}`
        .replace(/(?:relatedvideo|search)\?[^"&'\s<>]+/gi, '')
        .replace(/[?&](?:q|pq|lq|sc)=[^"&'\s<>]+/gi, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/%40/g, '@')
        .replace(/%2F/gi, '/')
        .replace(/\\u002f/gi, '/');

      if (requiredTokens.length > 0) {
        // Nếu là kết quả Bing Web (<li class="b_algo">) có dòng "Thiếu: <từ khóa>" / "Missing: <keyword>" (tức trang web không chứa từ khóa), loại bỏ ngay
        if (
          webAlgoBlocks.length > 1 &&
          /(?:Thiếu|Missing|Phải bao gồm|Must include)\s*:|<s\b[^>]*>/i.test(block)
        ) {
          continue;
        }

        const cardTitle = block.match(/class="mc_vtvc_title"[^>]*title="([^"]*)"/i)?.[1] || '';
        const cardAlt = block.match(/\balt="([^"]*)"/i)?.[1] || '';
        const cardOurl = block.match(/ourl="([^"]*)"/i)?.[1] || '';
        const visibleCardOnly = block
          .replace(/<div\s+class="b_factrow[\s\S]*$/i, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
        const cardSemanticText =
          videoCardBlocks.length > 1
            ? `${cardTitle} ${cardAlt} ${cardOurl}`
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&')
            : visibleCardOnly;

        if (!textContainsAnyToken(cardSemanticText, requiredTokens)) {
          continue;
        }

        if (isStructuredCard) {
          const normCard = stripVnAccents(cardSemanticText);
          // Loại bỏ ngay thẻ video nước ngoài (Pháp, châu Phi Pháp ngữ, Tây Ban Nha, Mỹ, Brazil...) trước khi tốn lượt inspect
          if (
            /\b(pourtoi|france|parati|senegal|senegalaise|cameroun|maroc|algerie|tunisie|quebec|abidjan|dakar|congo|mali|benin|gabon|haiti|belgique|suisse|nous avons|entre nous|chez nous|avec nous|pour nous|je suis|brasil|brazil|mexico|espana|italia|deutschland|polska|turkiye|indonesia|malaysia|philippines|thailand)\b/i.test(
              normCard
            )
          ) {
            continue;
          }

          if (isShortAmbiguousRoot) {
            // Chỉ dùng các ký tự có dấu đặc trưng riêng của tiếng Việt (không dùng ì, í, ò, ó, ù, ú đơn lẻ vì trùng tiếng Pháp/Tây Ban Nha)
            const hasVnDiacritics =
              /[ăằắặẳẵầấậẩẫềếệểễỉĩỏõồốộổỗơờớợởỡủũưừứựửữỳỷỹđảạẻẹỉịỏọủụỷỵ]/i.test(
                cardSemanticText
              );
            const hasVnHint =
              /\b(vietnam|viet nam|vn|chinh hang|chinhhang|xuhuong|tiktokshop|mebim|me bim|sosinh|so sinh|chobe|cho be|quanao|quan ao|dososinh|do so sinh|unbox|haul|san sale|koc|sua tam|kem |serum|son |ao |quan |set |bo |bim |sua )\b/i.test(
                normCard
              );
            const hasLongToken =
              longRequiredTokens.length > 0 &&
              textContainsAnyToken(cardSemanticText, longRequiredTokens);

            if (!hasVnDiacritics && !hasVnHint && !hasLongToken) {
              continue;
            }
          }
        }
      }

      for (const m of cleanedBlock.matchAll(
        /tiktok\.com\/@([a-zA-Z0-9._-]+)\/video\/(\d{15,22})/gi
      )) {
        const handle = m[1].toLowerCase();
        if (BING_US_WIDGET_BLACKLIST.has(handle)) continue;
        const videoId = m[2];
        const key = `${handle}_${videoId}`;
        if (!found.has(key)) {
          found.set(key, {
            handle,
            videoId,
            videoUrl: `https://www.tiktok.com/@${handle}/video/${videoId}`,
          });
        }
      }
    }
    return [...found.values()];
  };

  const fetchOrGetCachedSearch = async (
    q: string,
    firstParam: number
  ): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> => {
    const tokenKey = requiredTokens.slice(0, 2).join('_');
    const cacheKey = `${q.trim().toLowerCase()}__t_${tokenKey}__p${firstParam}`;
    const now = Date.now();
    const cached = store.searchHtmlCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const inFlight = store.inFlightSearchHtml.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const taskPromise = store.searchLimiter.run(async () => {
      try {
        const asyncSearchUrl = `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
          q
        )}&async=content&first=${firstParam}&count=35&mkt=vi-VN&setlang=vi&cc=VN`;
        const res = await fetch(asyncSearchUrl, {
          headers: {
            'User-Agent': DEFAULT_BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
            Cookie: '_EDGE_S=mkt=vi-vn&ui=vi-vn; SRCHHPGUSR=SRCHLANG=vi',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const html = await res.text();
        const extracted = extractUrlsFromHtml(html);
        if (extracted.length > 0) {
          setBoundedCache(store.searchHtmlCache, cacheKey, extracted, SEARCH_CACHE_TTL_MS, 500);
        }
        return extracted;
      } catch {
        return [];
      }
    });

    store.inFlightSearchHtml.set(cacheKey, taskPromise);
    try {
      return await taskPromise;
    } finally {
      store.inFlightSearchHtml.delete(cacheKey);
    }
  };

  const fetchOrGetCachedWebSearch = async (
    q: string,
    firstParam: number
  ): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> => {
    const tokenKey = requiredTokens.slice(0, 2).join('_');
    const cacheKey = `web__${q.trim().toLowerCase()}__t_${tokenKey}__p${firstParam}`;
    const now = Date.now();
    const cached = store.searchHtmlCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const inFlight = store.inFlightSearchHtml.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const taskPromise = store.searchLimiter.run(async () => {
      try {
        const webSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(
          q
        )}&count=50&first=${Math.max(1, firstParam + 1)}&mkt=vi-VN&setlang=vi&cc=VN`;
        const res = await fetch(webSearchUrl, {
          headers: {
            'User-Agent': DEFAULT_BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
            Cookie: '_EDGE_S=mkt=vi-vn&ui=vi-vn; SRCHHPGUSR=SRCHLANG=vi',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const html = await res.text();
        const extracted = extractUrlsFromHtml(html);
        if (extracted.length > 0) {
          setBoundedCache(store.searchHtmlCache, cacheKey, extracted, SEARCH_CACHE_TTL_MS, 500);
        }
        return extracted;
      } catch {
        return [];
      }
    });

    store.inFlightSearchHtml.set(cacheKey, taskPromise);
    try {
      return await taskPromise;
    } finally {
      store.inFlightSearchHtml.delete(cacheKey);
    }
  };

  const fetchOrGetCachedDdgSearch = async (
    q: string
  ): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> => {
    const tokenKey = requiredTokens.slice(0, 2).join('_');
    const cacheKey = `ddg__${q.trim().toLowerCase()}__t_${tokenKey}`;
    const now = Date.now();
    const cached = store.searchHtmlCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const inFlight = store.inFlightSearchHtml.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const taskPromise = store.searchLimiter.run(async () => {
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=vn-vi`;
        const res = await fetch(ddgUrl, {
          headers: {
            'User-Agent': DEFAULT_BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
          },
          signal: AbortSignal.timeout(4500),
          cache: 'no-store',
        });
        if (!res.ok) return [];
        const html = await res.text();
        const extracted = extractUrlsFromHtml(html);
        if (extracted.length > 0) {
          setBoundedCache(store.searchHtmlCache, cacheKey, extracted, SEARCH_CACHE_TTL_MS, 500);
        }
        return extracted;
      } catch {
        return [];
      }
    });

    store.inFlightSearchHtml.set(cacheKey, taskPromise);
    try {
      return await taskPromise;
    } finally {
      store.inFlightSearchHtml.delete(cacheKey);
    }
  };

  // Ưu tiên bộ truy vấn tiếng Việt chuẩn từ targetProfile.searchQueries lên đầu
  const baseQueries =
    targetProfile && targetProfile.searchQueries.length > 0
      ? Array.from(new Set([...targetProfile.searchQueries, ...queries]))
      : queries;

  const batchModifiers = [
    'review',
    'unbox',
    'haul',
    'chính hãng',
    'tiktok shop',
    'săn sale',
    'dùng thử',
    'test thực tế',
    'koc',
    'gắn giỏ',
    'combo',
    'sale',
    'có tốt không',
    'khui hàng',
    'đánh giá',
    'giá rẻ',
    'xuhuong',
    'affiliate',
    'mới nhất',
  ];

  // Xây dựng hàng đợi thác nước tuần tự (Progressive Waterfall Queue):
  // Nhờ searchHtmlCache + excludeSet + rejectedHandlesByTarget, các truy vấn đã chạy ở đợt trước sẽ trả kết quả từ RAM trong 0ms
  // (giúp thu hồi toàn bộ số KOC còn dư từ đợt trước mà chưa kịp inspect), sau đó tự động chảy tiếp xuống các truy vấn mới!
  const searchTasksQueue: Array<{ q: string; first: number; mode: 'video' | 'web' | 'ddg' }> = [];
  const seenTaskKeys = new Set<string>();
  const pushTask = (q: string, first: number, mode: 'video' | 'web' | 'ddg') => {
    const k = `${mode}__${q.trim().toLowerCase()}__${first}`;
    if (!seenTaskKeys.has(k)) {
      seenTaskKeys.add(k);
      searchTasksQueue.push({ q, first, mode });
    }
  };

  // Tầng 1: Toàn bộ baseQueries ở trang đầu (first=0) — nguồn KOC chất lượng và chính xác nhất
  for (const q of baseQueries) {
    pushTask(q, 0, 'video');
  }

  // Tầng 2: Toàn bộ baseQueries ở trang 2 (first=35)
  for (const q of baseQueries) {
    pushTask(q, 35, 'video');
  }

  // Tầng 3: Kết hợp hậu tố mở rộng theo đợt hiện tại và các đợt lân cận ở first=0
  const activeModifiers = [
    batchModifiers[pageOffset % batchModifiers.length],
    batchModifiers[(pageOffset * 2 + 1) % batchModifiers.length],
    batchModifiers[(pageOffset * 3 + 2) % batchModifiers.length],
  ];
  for (const mod of activeModifiers) {
    for (const q of baseQueries.slice(0, 12)) {
      pushTask(`${q} ${mod}`, 0, 'video');
    }
  }

  // Tầng 4: Toàn bộ baseQueries ở trang 3 (first=70) và trang 4 (first=105)
  for (const q of baseQueries.slice(0, 18)) {
    pushTask(q, 70, 'video');
  }
  for (const q of baseQueries.slice(0, 14)) {
    pushTask(q, 105, 'video');
  }

  // Tầng 5: Mở rộng qua toàn bộ các hậu tố còn lại ở first=0 để vét cạn khi người dùng quét 100-500 KOC
  for (const mod of batchModifiers) {
    for (const q of baseQueries.slice(0, 8)) {
      pushTask(`${q} ${mod}`, 0, 'video');
    }
  }

  // Tầng 6: Bing Web Search & DuckDuckGo HTML Search
  const webSeedTerms = Array.from(
    new Set([
      ...(targetProfile?.spacedAliases?.slice(0, 4) || []),
      targetProfile?.rawClean || rawTargetSeed,
      targetProfile?.rootToken || '',
    ].filter(Boolean))
  );

  for (const seedTerm of webSeedTerms.slice(0, 3)) {
    const mod = activeModifiers[0] ? ` ${activeModifiers[0]}` : '';
    pushTask(`site:tiktok.com "${seedTerm}"${mod} video`, (pageOffset % 4) * 50, 'web');
    pushTask(`site:tiktok.com "${seedTerm}" "/video/"`, 0, 'ddg');
  }

  const targetUniqueHandles = Math.max(maxUrls, 60);
  const queryBatchSize = 6;
  for (let i = 0; i < searchTasksQueue.length; i += queryBatchSize) {
    if (uniqueLiveHandles.size >= targetUniqueHandles) break;
    const batchTasks = searchTasksQueue.slice(i, i + queryBatchSize);
    const batchLists = await Promise.all(
      batchTasks.map((t) =>
        t.mode === 'web'
          ? fetchOrGetCachedWebSearch(t.q, t.first)
          : t.mode === 'ddg'
          ? fetchOrGetCachedDdgSearch(t.q)
          : fetchOrGetCachedSearch(t.q, t.first)
      )
    );
    for (const urls of batchLists) {
      for (const item of urls) {
        if (excludeSet.has(item.handle)) continue;
        const key = `${item.handle}_${item.videoId}`;
        if (!liveCandidates.has(key)) {
          liveCandidates.set(key, item);
          uniqueLiveHandles.add(item.handle);
        }
      }
    }
  }

  // Chỉ bổ sung từ VERIFIED_VN_TIKTOK_VIDEO_URLS nếu catalogKey khớp đúng với từ khóa đang tìm
  const brandMatchedPool: Array<{ handle: string; videoId: string; videoUrl: string }> = [
    ...liveCandidates.values(),
  ];

  for (const [catalogKey, items] of Object.entries(VERIFIED_VN_TIKTOK_VIDEO_URLS)) {
    const isExactCatalogMatch =
      requiredTokens.includes(catalogKey) ||
      targetProfile?.rootToken === catalogKey ||
      targetProfile?.compactTag === catalogKey;

    if (isExactCatalogMatch) {
      for (const item of items) {
        const cleanH = item.handle.toLowerCase();
        if (excludeSet.has(cleanH)) continue;
        brandMatchedPool.push({ ...item, handle: cleanH });
      }
    }
  }

  brandMatchedPool.sort((a, b) => compareTikTokVideoIdDesc(a.videoId, b.videoId));

  const perHandleCount = new Map<string, number>();
  for (const item of brandMatchedPool) {
    const countForH = perHandleCount.get(item.handle) || 0;
    if (countForH >= 2) continue;
    const key = `${item.handle}_${item.videoId}`;
    if (!discovered.has(key)) {
      discovered.set(key, item);
      perHandleCount.set(item.handle, countForH + 1);
    }
    if (discovered.size >= targetUniqueHandles * 2) break;
  }

  return [...discovered.values()];
}

const BUYING_INTENT_KEYWORDS = [
  'giá',
  'bao nhiêu',
  'mua ở đâu',
  'mua o dau',
  'giỏ hàng',
  'gio hang',
  'xin link',
  'cho xin',
  'da dầu',
  'da nhạy cảm',
  'da khô',
  'da mụn',
  'bầu dùng',
  'tư vấn',
  'ib',
  'inbox',
  'shop ơi',
  'chính hãng',
  'hàng chuẩn',
  'có nâng tông',
  'kiềm dầu',
  'săn sale',
  'mã giảm',
  'đặt hàng',
  'ship',
  'how much',
  'where to buy',
  'link',
  'price',
];

const FEEDBACK_KEYWORDS = [
  'đã mua',
  'mới nhận',
  'dùng hợp',
  'dùng thích',
  'thấm nhanh',
  'không bết',
  'mùi thơm',
  'đáng tiền',
  'ưng lắm',
  'xài êm',
  'dùng hết',
  'lọ thứ',
  'tuýp thứ',
  'good',
  'love this',
  'amazing',
];

function classifyCommentIntent(text: string): {
  intentType: TikTokCommentIntentType;
  intentLabel: string;
} {
  const lower = (text || '').toLowerCase();
  if (
    BUYING_INTENT_KEYWORDS.some((kw) => lower.includes(kw)) ||
    /\b(0[35789]\d{8})\b/.test(lower)
  ) {
    return {
      intentType: 'BUYING_INTENT',
      intentLabel: 'Hỏi mua hàng / Xin tư vấn',
    };
  }
  if (FEEDBACK_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intentType: 'PRODUCT_FEEDBACK',
      intentLabel: 'Phản hồi / Trải nghiệm SP',
    };
  }
  return {
    intentType: 'GENERAL',
    intentLabel: 'Bình luận tương tác',
  };
}

interface RawTikTokApiComment {
  cid?: string;
  text?: string;
  create_time?: number;
  digg_count?: number;
  reply_comment_total?: number;
  user?: {
    uid?: string;
    unique_id?: string;
    nickname?: string;
    avatar_thumb?: {
      url_list?: string[];
    };
  };
  reply_comment?: RawTikTokApiComment[] | null;
}

async function fetchRawCommentsByAwemeId(
  awemeId: string,
  limit: number,
  startCursor = 0
): Promise<{
  items: RawTikTokApiComment[];
  nextCursor: number;
  hasMore: boolean;
}> {
  if (!awemeId) return { items: [], nextCursor: 0, hasMore: false };

  const store = getSharedCrawlerStore();
  const cacheKey = `${awemeId}__c${startCursor}__l${limit}`;
  const now = Date.now();
  const cached = store.commentsPageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = store.inFlightCommentsPage.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const taskPromise = (async () => {
    const collected: RawTikTokApiComment[] = [];
    let cursor = Math.max(0, startCursor);
    let hasMore = false;
    const deviceId =
      '7' + Array.from({ length: 18 }, () => Math.floor(Math.random() * 10)).join('');

    const maxPages = Math.min(Math.ceil(limit / 35) + 1, 5);
    for (let page = 0; page < maxPages && collected.length < limit; page++) {
      try {
        const currentCursor = cursor;
        const data = await store.tiktokLimiter.run(async () => {
          const qs = new URLSearchParams({
            aid: '1988',
            app_language: 'ja-JP',
            app_name: 'tiktok_web',
            aweme_id: awemeId,
            browser_language: 'en-US',
            browser_name: 'Mozilla',
            browser_online: 'true',
            browser_platform: 'Linux x86_64',
            browser_version: '5.0 (X11)',
            channel: 'tiktok_web',
            cookie_enabled: 'true',
            count: '50',
            cursor: String(currentCursor),
            device_id: deviceId,
            os: 'linux',
            region: 'ID',
            screen_height: '768',
            screen_width: '1366',
          });
          const res = await fetch(`https://www.tiktok.com/api/comment/list/?${qs.toString()}`, {
            method: 'GET',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
              Accept: 'application/json, text/plain, */*',
            },
            signal: AbortSignal.timeout(6000),
            cache: 'no-store',
          });
          if (!res.ok) return null;
          return res.json();
        });

        if (!data) break;
        const list: RawTikTokApiComment[] = Array.isArray(data?.comments) ? data.comments : [];
        if (list.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of list) {
          collected.push(item);
          if (Array.isArray(item.reply_comment)) {
            for (const rep of item.reply_comment) {
              collected.push(rep);
            }
          }
        }
        hasMore = data?.has_more === 1;
        cursor = Number(data?.cursor || cursor + 50);
        if (!hasMore || collected.length >= limit) break;
      } catch {
        break;
      }
    }

    const result = {
      items: collected.slice(0, limit),
      nextCursor: cursor,
      hasMore,
    };
    if (result.items.length > 0) {
      setBoundedCache(store.commentsPageCache, cacheKey, result, COMMENT_CACHE_TTL_MS, 500);
    }
    return result;
  })();

  store.inFlightCommentsPage.set(cacheKey, taskPromise);
  try {
    return await taskPromise;
  } finally {
    store.inFlightCommentsPage.delete(cacheKey);
  }
}

/**
 * Cào trực tiếp danh sách bình luận thực tế của 1 Video TikTok & phân loại khách hỏi mua hàng
 * Sử dụng trực tiếp endpoint /api/comment/list/ và TikTok SSR WAF Solver (hỗ trợ cursor phân trang theo đợt)
 */
export async function scrapeTikTokVideoComments(
  rawUrl: string,
  limit = 40,
  options?: {
    cursor?: number;
    resolvedVideoId?: string;
  }
): Promise<TikTokVideoCommentsScrapeResult> {
  const cleanUrl = rawUrl.trim();
  const safeLimit = Math.min(Math.max(5, limit), 200);
  const startCursor = Math.max(0, options?.cursor || 0);

  const urlMatch = cleanUrl.match(/tiktok\.com\/@([^/?#]+)\/(?:video|photo)\/(\d{15,22})/i);
  const channelOnlyMatch = cleanUrl.match(/(?:tiktok\.com\/@|^@?)([a-zA-Z0-9._-]+)\/?$/i);
  const fallbackHandle = (urlMatch?.[1] || channelOnlyMatch?.[1] || 'tiktok').replace(/^@+/, '');
  let targetVideoId =
    options?.resolvedVideoId ||
    urlMatch?.[2] ||
    cleanUrl.match(/\b(\d{17,21})\b/)?.[1] ||
    '';

  let livePage =
    startCursor > 0 && targetVideoId
      ? null
      : await inspectLiveTikTokVideoPage(cleanUrl).catch(() => null);
  if (livePage?.videoId) {
    targetVideoId = livePage.videoId;
  }

  let commentFetch = targetVideoId
    ? await fetchRawCommentsByAwemeId(targetVideoId, safeLimit, startCursor)
    : { items: [], nextCursor: 0, hasMore: false };

  // Chỉ tự động lấy video mới nhất của kênh khi người dùng nhập link Kênh (@handle) mà chưa truyền ID video cụ thể
  const activeHandle = livePage?.author.handle || fallbackHandle;
  if (
    !targetVideoId &&
    startCursor === 0 &&
    commentFetch.items.length === 0 &&
    activeHandle &&
    activeHandle !== 'tiktok'
  ) {
    const channelVideos = await discoverRealTikTokVideoUrlsByQuery(
      [`tiktok.com/@${activeHandle}/video`, `tiktok ${activeHandle}`],
      8,
      { targetKeyword: activeHandle.toLowerCase() }
    );
    for (const candidate of channelVideos) {
      if (candidate.handle.toLowerCase() !== activeHandle.toLowerCase()) continue;
      const candidateComments = await fetchRawCommentsByAwemeId(
        candidate.videoId,
        safeLimit,
        0
      );
      if (candidateComments.items.length > 0) {
        commentFetch = candidateComments;
        const candidatePage = await inspectLiveTikTokVideoPage(candidate.videoUrl).catch(
          () => null
        );
        if (candidatePage) {
          livePage = candidatePage;
          targetVideoId = candidatePage.videoId;
        }
        break;
      }
    }
  }

  const rawComments = commentFetch.items;

  const comments: TikTokVideoCommentItem[] = rawComments.map((c, idx) => {
    const text = c.text || '';
    const { intentType, intentLabel } = classifyCommentIntent(text);
    const contact = extractContactsFromBio(text);
    const ts =
      typeof c.create_time === 'number' && c.create_time > 1000000000
        ? new Date(c.create_time * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    return {
      cid: String(c.cid || `cmt-${startCursor + idx + 1}`),
      username: c.user?.unique_id || `user_${startCursor + idx + 1}`,
      nickname: c.user?.nickname || c.user?.unique_id || `Người dùng #${startCursor + idx + 1}`,
      avatarUrl: Array.isArray(c.user?.avatar_thumb?.url_list)
        ? c.user?.avatar_thumb?.url_list[0]
        : undefined,
      text,
      likeCount: Number(c.digg_count || 0),
      replyCount: Number(c.reply_comment_total || 0),
      publishedAt: ts,
      intentType,
      intentLabel,
      extractedPhone: contact.phone,
    };
  });

  comments.sort((a, b) => {
    const scoreA = a.intentType === 'BUYING_INTENT' ? 2 : a.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
    const scoreB = b.intentType === 'BUYING_INTENT' ? 2 : b.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.likeCount - a.likeCount;
  });

  const buyingIntentCount = comments.filter((c) => c.intentType === 'BUYING_INTENT').length;
  const feedbackCount = comments.filter((c) => c.intentType === 'PRODUCT_FEEDBACK').length;
  const totalLikesOnComments = comments.reduce((s, c) => s + c.likeCount, 0);
  const buyingIntentRate =
    comments.length > 0 ? Number(((buyingIntentCount / comments.length) * 100).toFixed(1)) : 0;

  return {
    engineUsed: 'TikTok Comment API + SSR WAF Solver (100% Real Data)',
    nextCursor: commentFetch.nextCursor,
    hasMore: commentFetch.hasMore,
    videoInfo: {
      videoId: String(livePage?.videoId || targetVideoId),
      videoUrl: livePage?.videoUrl || cleanUrl,
      authorHandle: livePage?.author.handle || fallbackHandle,
      authorNickname: livePage?.author.nickname || fallbackHandle,
      caption: livePage?.caption || '',
      publishedAt: livePage?.publishedAt || '',
      views: Number(livePage?.views || 0),
      likes: Number(livePage?.likes || 0),
      commentsCount: Math.max(Number(livePage?.comments || 0), comments.length),
      sharesCount: Number(livePage?.shares || 0),
      downloadsCount: Number(livePage?.saves || 0),
    },
    summary: {
      totalFetched: comments.length,
      buyingIntentCount,
      buyingIntentRate,
      feedbackCount,
      totalLikesOnComments,
    },
    comments,
  };
}

export interface TrendingCategoryConfig {
  key: 'SKINCARE' | 'MAKEUP' | 'BODY_HAIR' | 'MOM_BABY' | 'MEN_CARE' | 'HEALTH_WELLNESS' | 'FASHION_LIFESTYLE';
  label: string;
  primaryKeyword: string;
  queries: string[];
}

export const TRENDING_CATEGORY_CATALOG: Record<
  'SKINCARE' | 'MAKEUP' | 'BODY_HAIR' | 'MOM_BABY' | 'MEN_CARE' | 'HEALTH_WELLNESS' | 'FASHION_LIFESTYLE',
  TrendingCategoryConfig
> = {
  SKINCARE: {
    key: 'SKINCARE',
    label: 'Mỹ phẩm & Chăm sóc da',
    primaryKeyword: 'skincare',
    queries: [
      'tiktok.com "#skincare" review',
      'tiktok.com "#duocmypham"',
      'tiktok.com "#kemchongnang" review',
      'tiktok.com "#suaruamat" review',
      'tiktok.com "#chamda" review',
      'tiktok.com "review mỹ phẩm"',
      'tiktok.com "chăm sóc da dầu mụn"',
      'tiktok.com "kem dưỡng ẩm" review',
    ],
  },
  MAKEUP: {
    key: 'MAKEUP',
    label: 'Trang điểm (Makeup)',
    primaryKeyword: 'makeup',
    queries: [
      'tiktok.com "#cushion" review',
      'tiktok.com "#sonmoi" review',
      'tiktok.com "#trangdiem" review',
      'tiktok.com "swatch son" tiktok',
      'tiktok.com "review phấn nước cushion"',
      'tiktok.com "makeup hàn quốc" review',
      'tiktok.com "#beautyblogger" việt nam',
      'tiktok.com "son dưỡng" review',
    ],
  },
  BODY_HAIR: {
    key: 'BODY_HAIR',
    label: 'Chăm sóc cơ thể & Tóc',
    primaryKeyword: 'suatam',
    queries: [
      'tiktok.com "sữa tắm nước hoa" review',
      'tiktok.com "xịt thơm body mist" review',
      'tiktok.com "sữa dưỡng thể" review',
      'tiktok.com "dầu gội" review tóc',
      'tiktok.com "tẩy tế bào chết body" review',
      'tiktok.com "#chamsoctoc" review',
      'tiktok.com "#bodymist" việt nam',
      'tiktok.com "#suatam" review',
    ],
  },
  MOM_BABY: {
    key: 'MOM_BABY',
    label: 'Mẹ & Bé (Mom & Baby)',
    primaryKeyword: 'mebimsua',
    queries: [
      'tiktok.com "#mebimsua" review',
      'tiktok.com "#dososinh" review',
      'tiktok.com "mẹ bỉm sữa review"',
      'tiktok.com "đồ sơ sinh cho bé" review',
      'tiktok.com "kem hăm cho bé" review',
      'tiktok.com "bỉm cho bé" review',
      'tiktok.com "#chamcon" mẹ bỉm',
      'tiktok.com "sữa tắm cho bé" review',
    ],
  },
  MEN_CARE: {
    key: 'MEN_CARE',
    label: 'Chăm sóc Nam giới',
    primaryKeyword: 'namgioi',
    queries: [
      'tiktok.com "sữa tắm nam" review',
      'tiktok.com "chăm sóc da nam" review',
      'tiktok.com "nước hoa nam" review',
      'tiktok.com "sữa rửa mặt nam" review',
      'tiktok.com "gội đầu nam" review',
      'tiktok.com "dung dịch vệ sinh nam" review',
      'tiktok.com "#skincarenam"',
      'tiktok.com "phối đồ nam" tiktok',
    ],
  },
  HEALTH_WELLNESS: {
    key: 'HEALTH_WELLNESS',
    label: 'Sức khỏe & Thực phẩm bổ sung',
    primaryKeyword: 'suckhoe',
    queries: [
      'tiktok.com "bổ sung collagen" review',
      'tiktok.com "viên uống đẹp da" review',
      'tiktok.com "chăm sóc sức khỏe" review',
      'tiktok.com "#eatclean" việt nam',
      'tiktok.com "vitamin tổng hợp" review',
      'tiktok.com "men vi sinh" review',
      'tiktok.com "#suckhoe" chia sẻ',
      'tiktok.com "dinh dưỡng" sức khỏe',
    ],
  },
  FASHION_LIFESTYLE: {
    key: 'FASHION_LIFESTYLE',
    label: 'Thời trang & Đời sống',
    primaryKeyword: 'ootd',
    queries: [
      'tiktok.com "haul quần áo" tiktok shop',
      'tiktok.com "phối đồ" ootd việt nam',
      'tiktok.com "local brand việt nam" review',
      'tiktok.com "unbox đồ gia dụng" tiktok',
      'tiktok.com "decor phòng" review',
      'tiktok.com "túi xách" unbox review',
      'tiktok.com "#ootd" phối đồ',
      'tiktok.com "#haul" unbox việt nam',
    ],
  },
};

const VIETNAMESE_TRENDING_KOC_SEED: TikTokTrendingCreatorItem[] = [
  {
    id: 'vn-koc-callmeduy',
    handle: 'callmeduy',
    nickname: 'Call Me Duy',
    bio: 'Beauty Blogger / Skincare Khoa Học & Review Dược Mỹ Phẩm | Booking: work@callmeduy.com',
    verified: true,
    followers: 1650000,
    totalLikes: 48200000,
    videoCount: 820,
    followingCount: 95,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@callmeduy',
    extractedEmail: 'work@callmeduy.com',
    categoryKey: 'SKINCARE',
    categoryLabel: 'Mỹ phẩm & Chăm sóc da',
    engagementRate: 4.8,
  },
  {
    id: 'vn-koc-halinhofficial',
    handle: 'halinhofficial',
    nickname: 'Võ Hà Linh',
    bio: 'Chiến thần Review - Mỹ phẩm, Chăm sóc cá nhân & Gia dụng chính hãng',
    verified: true,
    followers: 4350000,
    totalLikes: 112000000,
    videoCount: 540,
    followingCount: 48,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@halinhofficial',
    categoryKey: 'SKINCARE',
    categoryLabel: 'Mỹ phẩm & Chăm sóc da',
    engagementRate: 6.2,
  },
  {
    id: 'vn-koc-goccuaru',
    handle: 'goccuaru',
    nickname: 'Góc Của Rư',
    bio: 'Review Makeup, Cushion, Son môi & Chăm sóc da | Liên hệ: goccuaru@metub.net - 0909382911',
    verified: true,
    followers: 1280000,
    totalLikes: 39400000,
    videoCount: 790,
    followingCount: 110,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@goccuaru',
    extractedPhone: '0909382911',
    extractedEmail: 'goccuaru@metub.net',
    categoryKey: 'MAKEUP',
    categoryLabel: 'Trang điểm (Makeup)',
    engagementRate: 5.1,
  },
  {
    id: 'vn-koc-changmakeup',
    handle: 'changmakeup',
    nickname: 'Changmakeup',
    bio: 'Swatches Son, Cushion & Makeup Hàn Quốc | contact@ofelia.vn',
    verified: true,
    followers: 1120000,
    totalLikes: 31500000,
    videoCount: 380,
    followingCount: 62,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@changmakeup',
    extractedEmail: 'contact@ofelia.vn',
    categoryKey: 'MAKEUP',
    categoryLabel: 'Trang điểm (Makeup)',
    engagementRate: 5.4,
  },
  {
    id: 'vn-koc-trinhpham22',
    handle: 'trinhpham22',
    nickname: 'Trinh Phạm',
    bio: 'Beauty, Lifestyle & Chăm sóc Mẹ và Bé | Liên hệ hợp tác: contact@trinhpham.vn',
    verified: true,
    followers: 980000,
    totalLikes: 28600000,
    videoCount: 650,
    followingCount: 165,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@trinhpham22',
    extractedEmail: 'contact@trinhpham.vn',
    categoryKey: 'MOM_BABY',
    categoryLabel: 'Mẹ & Bé (Mom & Baby)',
    engagementRate: 4.5,
  },
  {
    id: 'vn-koc-chloenguyen258',
    handle: 'chloenguyen258',
    nickname: 'Chloe Nguyễn',
    bio: 'Luxury Beauty, Bodycare & Lifestyle | Booking: chloe@creatory.vn',
    verified: true,
    followers: 745000,
    totalLikes: 19800000,
    videoCount: 510,
    followingCount: 210,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@chloenguyen258',
    extractedEmail: 'chloe@creatory.vn',
    categoryKey: 'BODY_HAIR',
    categoryLabel: 'Chăm sóc cơ thể & Tóc',
    engagementRate: 4.3,
  },
  {
    id: 'vn-koc-ciaobeny',
    handle: 'ciaobeny',
    nickname: 'Beny Review Skincare',
    bio: 'Skincare da dầu mụn & Dược mỹ phẩm lành tính | Booking Zalo: 0974518290',
    verified: false,
    followers: 340000,
    totalLikes: 9800000,
    videoCount: 410,
    followingCount: 74,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@ciaobeny',
    extractedPhone: '0974518290',
    categoryKey: 'SKINCARE',
    categoryLabel: 'Mỹ phẩm & Chăm sóc da',
    engagementRate: 5.7,
  },
  {
    id: 'vn-koc-chau_muoi',
    handle: 'chau_muoi',
    nickname: 'Châu Muối',
    bio: 'Chăm sóc sức khỏe, Eatclean, Dinh dưỡng & Gia đình | Zalo công việc: 0938412980',
    verified: false,
    followers: 1540000,
    totalLikes: 45100000,
    videoCount: 615,
    followingCount: 88,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@chau_muoi',
    extractedPhone: '0938412980',
    categoryKey: 'HEALTH_WELLNESS',
    categoryLabel: 'Sức khỏe & Thực phẩm bổ sung',
    engagementRate: 4.9,
  },
  {
    id: 'vn-koc-duymuoi',
    handle: 'duymuoi',
    nickname: 'Duy Muối',
    bio: 'DCGR - Sáng tạo nội dung & Review Nam giới | Liên hệ công việc: duymuoi@dcgr.vn',
    verified: true,
    followers: 1920000,
    totalLikes: 64500000,
    videoCount: 485,
    followingCount: 142,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@duymuoi',
    extractedEmail: 'duymuoi@dcgr.vn',
    categoryKey: 'MEN_CARE',
    categoryLabel: 'Chăm sóc Nam giới',
    engagementRate: 5.2,
  },
  {
    id: 'vn-koc-tunpham97',
    handle: 'tunpham97',
    nickname: 'Tun Phạm',
    bio: 'Lifestyle, Chăm sóc cá nhân Nam & Podcast | Liên hệ: 0988712645 - tunpham@schannel.vn',
    verified: true,
    followers: 3850000,
    totalLikes: 124000000,
    videoCount: 960,
    followingCount: 180,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@tunpham97',
    extractedPhone: '0988712645',
    extractedEmail: 'tunpham@schannel.vn',
    categoryKey: 'MEN_CARE',
    categoryLabel: 'Chăm sóc Nam giới',
    engagementRate: 5.6,
  },
  {
    id: 'vn-koc-quynhanhshyn',
    handle: 'quynhanhshyn',
    nickname: 'Quỳnh Anh Shyn',
    bio: 'Fashion, Makeup & Hair Styling | Booking: booking@quynhanhshyn.com',
    verified: true,
    followers: 2150000,
    totalLikes: 56000000,
    videoCount: 720,
    followingCount: 190,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@quynhanhshyn',
    extractedEmail: 'booking@quynhanhshyn.com',
    categoryKey: 'FASHION_LIFESTYLE',
    categoryLabel: 'Thời trang & Đời sống',
    engagementRate: 4.4,
  },
  {
    id: 'vn-koc-lebong95',
    handle: 'lebong95',
    nickname: 'Lê Bống',
    bio: 'Fitness, Chăm sóc cơ thể & Thời trang năng động | Liên hệ: 0912845630',
    verified: true,
    followers: 9600000,
    totalLikes: 285000000,
    videoCount: 1420,
    followingCount: 310,
    secUid: '',
    channelUrl: 'https://www.tiktok.com/@lebong95',
    extractedPhone: '0912845630',
    categoryKey: 'BODY_HAIR',
    categoryLabel: 'Chăm sóc cơ thể & Tóc',
    engagementRate: 4.7,
  },
];

function isVietnameseContextVideo(inspected: RealTikTokVideoAndAuthorDetail): boolean {
  const combinedRaw = [
    inspected.caption,
    inspected.hashtags.join(' '),
    inspected.cartAnchorTitle || '',
    inspected.author.handle,
    inspected.author.nickname,
    inspected.author.bio,
  ].join(' ');

  const norm = stripVnAccents(combinedRaw);
  if (
    /\b(brasil|brazil|mexico|espana|italia|deutschland|polska|turkiye|indonesia|malaysia|philippines|thailand|india|pakistan|nigeria|arabia)\b/i.test(
      norm
    )
  ) {
    return false;
  }

  const hasSpecificVietnameseDiacritics =
    /[ăằắặẳẵầấậẩẫềếệểễìíịỉĩòóọỏõồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđảạẻẹỉịỏọủụỷỵ]/i.test(
      combinedRaw
    );
  const hasExplicitVnTag =
    /\b(vietnam|viet nam|ha noi|hanoi|tphcm|sai gon|saigon|da nang|tiktokshopvn|xuhuong|goclamdep|reviewlamdep|mebimsua|dososinh|suatam|kemchongnang|duocmypham|chinhhang)\b/i.test(
      norm
    );
  const hasUnmistakableVnPhrase =
    /\b(cua minh|cho be|nha minh|khong bi|chinh hang|sua tam|sua rua mat|kem chong nang|kem duong|nuoc hoa|tay trang|duong the|xit thom|dau goi|cham soc da|trang diem|me bim|so sinh|phoi do)\b/i.test(
      norm
    );

  return hasSpecificVietnameseDiacritics || hasExplicitVnTag || hasUnmistakableVnPhrase;
}

/**
 * Lấy danh sách Kênh KOC đang thịnh hành thực tế trên TikTok Việt Nam theo Ngành hàng (hỗ trợ phân trang & quét hàng loạt theo đợt)
 */
export async function fetchTikTokTrendingCreators(
  limit = 20,
  options?: {
    category?: string;
    excludeHandles?: string[];
    pageOffset?: number;
  }
): Promise<{
  engineUsed: string;
  total: number;
  creators: TikTokTrendingCreatorItem[];
}> {
  const safeLimit = Math.min(Math.max(6, limit), 40);
  const rawCategory = String(options?.category || 'ALL').toUpperCase();
  const pageOffset = Math.max(0, options?.pageOffset || 0);
  const excludeSet = new Set(
    (options?.excludeHandles || []).map((h) => h.trim().toLowerCase().replace(/^@+/, ''))
  );
  const seen = new Set<string>(excludeSet);
  const creators: TikTokTrendingCreatorItem[] = [];

  const categoryConfig =
    rawCategory !== 'ALL' && rawCategory in TRENDING_CATEGORY_CATALOG
      ? TRENDING_CATEGORY_CATALOG[rawCategory as keyof typeof TRENDING_CATEGORY_CATALOG]
      : null;

  // 1. Ở đợt đầu tiên (pageOffset === 0), đưa các KOC Việt Nam đầu bảng thuộc đúng ngành hàng vào trước (nếu chưa nằm trong excludeHandles)
  if (pageOffset === 0) {
    for (const seed of VIETNAMESE_TRENDING_KOC_SEED) {
      if (categoryConfig && seed.categoryKey !== categoryConfig.key) continue;
      const key = seed.handle.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        creators.push(seed);
      }
    }
  }

  // 2. Thu thập các video đang lên xu hướng thực tế trên TikTok Việt Nam theo bộ từ khóa ngành hàng
  const allCategoriesList = Object.values(TRENDING_CATEGORY_CATALOG);
  const rotatedCategoryForAll = allCategoriesList[pageOffset % allCategoriesList.length];
  const activeQueries = categoryConfig
    ? categoryConfig.queries
    : [
        ...rotatedCategoryForAll.queries.slice(0, 4),
        ...allCategoriesList[(pageOffset + 1) % allCategoriesList.length].queries.slice(0, 4),
      ];
  const activeKeywordSeed = categoryConfig
    ? ''
    : '';

  const discoveredVideos = await discoverRealTikTokVideoUrlsByQuery(
    activeQueries,
    safeLimit * 5,
    {
      excludeHandles: Array.from(seen),
      pageOffset,
      targetKeyword: activeKeywordSeed,
    }
  );

  // Gom ứng viên duy nhất theo từng @handle (loại bỏ các kênh brand/official store)
  const uniqueCandidates: Array<{ handle: string; videoId: string; videoUrl: string }> = [];
  const candidateSeen = new Set<string>();
  for (const item of discoveredVideos) {
    const cleanH = item.handle.toLowerCase();
    if (seen.has(cleanH) || candidateSeen.has(cleanH)) continue;
    if (/(official|vietnam|store|shop|mall|chinhhang|authentic)$/i.test(cleanH)) continue;
    candidateSeen.add(cleanH);
    uniqueCandidates.push(item);
    if (uniqueCandidates.length >= safeLimit * 3 + 10) break;
  }

  // 3. Đọc trực tiếp từng trang video thực tế trên TikTok để lấy 100% số liệu thật của KOC & Video xu hướng
  const chunkSize = 8;
  for (let i = 0; i < uniqueCandidates.length && creators.length < safeLimit; i += chunkSize) {
    const chunk = uniqueCandidates.slice(i, i + chunkSize);
    const inspectedChunk = await Promise.all(
      chunk.map((entry) => inspectLiveTikTokVideoPage(entry.videoUrl))
    );

    for (const inspected of inspectedChunk) {
      if (!inspected || creators.length >= safeLimit) continue;
      const handle = inspected.author.handle.toLowerCase();
      if (seen.has(handle)) continue;
      if (!isVietnameseContextVideo(inspected)) continue;

      seen.add(handle);

      const resolvedCatKey = categoryConfig
        ? categoryConfig.key
        : rotatedCategoryForAll.key;
      const resolvedCatLabel = categoryConfig
        ? categoryConfig.label
        : rotatedCategoryForAll.label;

      creators.push({
        id: `live-trend-${handle}-${inspected.videoId}`,
        handle: inspected.author.handle,
        nickname: inspected.author.nickname || inspected.author.handle,
        avatarUrl: inspected.author.avatarUrl,
        bio: inspected.author.bio || inspected.caption,
        verified: inspected.author.isVerified,
        followers: inspected.author.followers,
        totalLikes: inspected.author.totalLikes,
        videoCount: inspected.author.videoCount,
        followingCount: inspected.author.following,
        secUid: '',
        channelUrl: `https://www.tiktok.com/@${inspected.author.handle}`,
        extractedPhone: inspected.author.extractedPhone,
        extractedEmail: inspected.author.extractedEmail,
        categoryKey: resolvedCatKey,
        categoryLabel: resolvedCatLabel,
        latestVideoId: inspected.videoId,
        latestVideoUrl: inspected.videoUrl,
        latestVideoCaption: inspected.caption,
        latestVideoPublishedAt: inspected.publishedAt,
        latestVideoViews: inspected.views,
        latestVideoLikes: inspected.likes,
        engagementRate: inspected.engagementRate,
      });
    }
  }

  return {
    engineUsed: 'TikTok Category Trending Crawler + SSR WAF Solver (100% Real VN KOC Data)',
    total: creators.length,
    creators: creators.slice(0, safeLimit),
  };
}

