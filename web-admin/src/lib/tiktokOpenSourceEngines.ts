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

/**
 * Tải trang công khai TikTok (Kênh hoặc Video) kèm tự động vượt tường lửa SlardarWAF
 */
export async function fetchTikTokHtmlWithWafBypass(
  url: string,
  timeoutMs = 6500
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const r1 = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
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
    const wafCookie = solveTikTokWafHtml(html1);
    if (!wafCookie) {
      return { html: html1, finalUrl };
    }

    const combinedCookie = [...setCookies1, wafCookie].filter(Boolean).join('; ');
    const r2 = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        Cookie: combinedCookie,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });

    const html2 = await r2.text();
    return {
      html: html2,
      finalUrl: r2.url ? r2.url.split('?')[0] : finalUrl,
    };
  } catch {
    return null;
  }
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

/**
 * Bóc tách đồng thời cả Chỉ số Video thực tế VÀ Hồ sơ KOC thực tế từ trang Video TikTok (webapp.video-detail)
 */
export async function inspectLiveTikTokVideoPage(
  videoUrl: string
): Promise<RealTikTokVideoAndAuthorDetail | null> {
  const fetched = await fetchTikTokHtmlWithWafBypass(videoUrl);
  if (!fetched) return null;

  try {
    const scriptMatch = fetched.html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!scriptMatch || !scriptMatch[1]) return null;

    const json = JSON.parse(scriptMatch[1]);
    const defaultScope = json?.__DEFAULT_SCOPE__ || {};
    const itemStruct =
      defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct ||
      defaultScope?.['webapp.reflow.video.detail']?.itemInfo?.itemStruct;

    if (!itemStruct || !itemStruct.author) return null;

    const u = itemStruct.author;
    const s = itemStruct.authorStats || {};
    const vStats = itemStruct.stats || itemStruct.statsV2 || {};
    const handle = String(u.uniqueId || '')
      .trim()
      .toLowerCase();
    if (!handle) return null;

    const videoId = String(itemStruct.id || '');
    const createTimeSec = Number(itemStruct.createTime || 0);
    const publishedAt =
      createTimeSec > 1000000000
        ? new Date(createTimeSec * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    const caption = String(itemStruct.desc || '').trim();
    const hashtagMatches = caption.match(/#[\p{L}\p{N}_]+/gu) || [];
    const hashtags = Array.from(new Set(hashtagMatches.map((h) => h.toLowerCase())));

    const views = Number(vStats.playCount || 0);
    const likes = Number(vStats.diggCount || 0);
    const comments = Number(vStats.commentCount || 0);
    const shares = Number(vStats.shareCount || 0);
    const saves = Number(vStats.collectCount || 0);
    const engagementRate =
      views > 0 ? Number((((likes + comments + shares) / views) * 100).toFixed(2)) : 0;

    const bio = typeof u.signature === 'string' ? u.signature.trim() : '';
    const contacts = extractContactsFromBio(bio);

    const anchors = Array.isArray(itemStruct.anchors) ? itemStruct.anchors : [];
    const hasCartAnchor =
      anchors.length > 0 ||
      Boolean(itemStruct.isECVideo) ||
      Boolean(itemStruct.commerceInfo);
    const cartAnchorTitle = anchors[0]?.keyword || anchors[0]?.description || undefined;

    return {
      videoId,
      videoUrl: `https://www.tiktok.com/@${handle}/video/${videoId}`,
      caption,
      hashtags,
      publishedAt,
      createTimeSec,
      durationSeconds: Number(itemStruct.video?.duration || 0),
      musicTitle: String(itemStruct.music?.title || `Original Sound - @${handle}`),
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
  } catch {
    return null;
  }
}

/**
 * Tìm kiếm danh sách đường dẫn video TikTok thực tế (https://www.tiktok.com/@handle/video/videoId)
 * thông qua chỉ mục Bing Video Search và Bing Web Search (Giải mã base64 u=a1...)
 */
export async function discoverRealTikTokVideoUrlsByQuery(
  queries: string[],
  maxUrls = 30
): Promise<Array<{ handle: string; videoId: string; videoUrl: string }>> {
  const discovered = new Map<string, { handle: string; videoId: string; videoUrl: string }>();

  const extractFromHtml = (rawHtml: string) => {
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

    for (const m of normalized.matchAll(/tiktok\.com\/@([a-zA-Z0-9._-]+)\/video\/(\d{15,22})/g)) {
      const handle = m[1].toLowerCase();
      const videoId = m[2];
      const key = `${handle}_${videoId}`;
      if (!discovered.has(key)) {
        discovered.set(key, {
          handle,
          videoId,
          videoUrl: `https://www.tiktok.com/@${handle}/video/${videoId}`,
        });
      }
      if (discovered.size >= maxUrls) break;
    }
  };

  for (const q of queries) {
    if (discovered.size >= maxUrls) break;
    try {
      const videoSearchUrl = `https://www.bing.com/videos/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(videoSearchUrl, {
        headers: {
          'User-Agent': DEFAULT_BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        signal: AbortSignal.timeout(5500),
        cache: 'no-store',
      });
      if (res.ok) {
        const html = await res.text();
        extractFromHtml(html);
      }
    } catch {
      // ignore and continue next query
    }
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
  limit: number
): Promise<RawTikTokApiComment[]> {
  if (!awemeId) return [];
  const collected: RawTikTokApiComment[] = [];
  let cursor = 0;
  const deviceId =
    '7' + Array.from({ length: 18 }, () => Math.floor(Math.random() * 10)).join('');

  for (let page = 0; page < 2 && collected.length < limit; page++) {
    try {
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
        cursor: String(cursor),
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
      if (!res.ok) break;
      const data = await res.json();
      const list: RawTikTokApiComment[] = Array.isArray(data?.comments) ? data.comments : [];
      if (list.length === 0) break;

      for (const item of list) {
        collected.push(item);
        if (Array.isArray(item.reply_comment)) {
          for (const rep of item.reply_comment) {
            collected.push(rep);
          }
        }
      }
      if (data?.has_more !== 1 || collected.length >= limit) break;
      cursor = Number(data?.cursor || cursor + 50);
    } catch {
      break;
    }
  }

  return collected.slice(0, limit);
}

/**
 * Cào trực tiếp danh sách bình luận thực tế của 1 Video TikTok & phân loại khách hỏi mua hàng
 * Sử dụng trực tiếp endpoint /api/comment/list/ và TikTok SSR WAF Solver (không phụ thuộc module ngoài trên Serverless)
 */
export async function scrapeTikTokVideoComments(
  rawUrl: string,
  limit = 30
): Promise<TikTokVideoCommentsScrapeResult> {
  const cleanUrl = rawUrl.trim();
  const safeLimit = Math.min(Math.max(5, limit), 100);

  const urlMatch = cleanUrl.match(/tiktok\.com\/@([^/?#]+)\/(?:video|photo)\/(\d{15,22})/i);
  const channelOnlyMatch = cleanUrl.match(/(?:tiktok\.com\/@|^@?)([a-zA-Z0-9._-]+)\/?$/i);
  const fallbackHandle = (urlMatch?.[1] || channelOnlyMatch?.[1] || 'tiktok').replace(/^@+/, '');
  let targetVideoId = urlMatch?.[2] || cleanUrl.match(/\b(\d{17,21})\b/)?.[1] || '';

  let livePage = await inspectLiveTikTokVideoPage(cleanUrl).catch(() => null);
  if (livePage?.videoId) {
    targetVideoId = livePage.videoId;
  }

  let rawComments = targetVideoId
    ? await fetchRawCommentsByAwemeId(targetVideoId, safeLimit)
    : [];

  // Nếu video được dán hiện có 0 bình luận (hoặc người dùng dán link kênh @handle),
  // tự động dò các video thực tế khác của chính kênh đó để lấy bình luận thật của kênh
  const activeHandle = livePage?.author.handle || fallbackHandle;
  if (rawComments.length === 0 && activeHandle && activeHandle !== 'tiktok') {
    const channelVideos = await discoverRealTikTokVideoUrlsByQuery(
      [`tiktok.com/@${activeHandle}/video`, `tiktok ${activeHandle}`],
      8
    );
    for (const candidate of channelVideos) {
      if (candidate.videoId === targetVideoId) continue;
      const candidateComments = await fetchRawCommentsByAwemeId(candidate.videoId, safeLimit);
      if (candidateComments.length > 0) {
        rawComments = candidateComments;
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

  const comments: TikTokVideoCommentItem[] = rawComments.map((c, idx) => {
    const text = c.text || '';
    const { intentType, intentLabel } = classifyCommentIntent(text);
    const contact = extractContactsFromBio(text);
    const ts =
      typeof c.create_time === 'number' && c.create_time > 1000000000
        ? new Date(c.create_time * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    return {
      cid: String(c.cid || `cmt-${idx + 1}`),
      username: c.user?.unique_id || `user_${idx + 1}`,
      nickname: c.user?.nickname || c.user?.unique_id || `Người dùng #${idx + 1}`,
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

/**
 * Lấy danh sách 30 Kênh Creator đang thịnh hành thực tế trên TikTok
 * Gọi trực tiếp endpoint /node/share/discover của TikTok bằng native fetch
 */
export async function fetchTikTokTrendingCreators(
  limit = 30
): Promise<{
  engineUsed: string;
  total: number;
  creators: TikTokTrendingCreatorItem[];
}> {
  const safeLimit = Math.min(Math.max(5, limit), 50);
  const creators: TikTokTrendingCreatorItem[] = [];

  try {
    const discoverUrl =
      'https://www.tiktok.com/node/share/discover?aid=1988&app_language=en&app_name=tiktok_web&battery_info=1';
    const res = await fetch(discoverUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(6500),
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const bodyList = Array.isArray(data?.body) ? data.body : [];
      for (const section of bodyList) {
        const exploreList = Array.isArray(section?.exploreList) ? section.exploreList : [];
        for (const item of exploreList) {
          const cardItem = item?.cardItem;
          if (!cardItem || cardItem.type !== 2) continue;
          const cleanHandle = String(cardItem.subTitle || '').replace(/^@+/, '');
          if (!cleanHandle) continue;
          const bio = String(cardItem.description || '');
          const contact = extractContactsFromBio(bio);
          const extra = cardItem.extraInfo || {};

          creators.push({
            id: String(cardItem.id || cleanHandle),
            handle: cleanHandle,
            nickname: String(cardItem.title || cleanHandle),
            avatarUrl: cardItem.cover,
            bio,
            verified: Boolean(extra.verified),
            followers: Number(extra.fans || 0),
            totalLikes: Number(extra.heart || extra.likes || 0),
            videoCount: Number(extra.video || 0),
            followingCount: Number(extra.following || 0),
            secUid: String(extra.secUid || ''),
            channelUrl: `https://www.tiktok.com/@${cleanHandle}`,
            extractedPhone: contact.phone,
            extractedEmail: contact.email,
          });
          if (creators.length >= safeLimit) break;
        }
        if (creators.length >= safeLimit) break;
      }
    }
  } catch {
    // ignore network error
  }

  return {
    engineUsed: 'TikTok Discover API (/node/share/discover)',
    total: creators.length,
    creators,
  };
}
