import {
  type LinkAirCheckItem,
  type LinkAirExpectation,
  type LinkAirPlatform,
  type LinkAirResult,
  type LinkAirStatus,
  type LinkAirVerdict,
} from './linkAirCheck';
import { inspectLiveTikTokVideoPage } from './tiktokOpenSourceEngines';

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
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    return res.url || url;
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
  >,
  expect: LinkAirExpectation = {}
): LinkAirCheckItem[] {
  const checks: LinkAirCheckItem[] = [];

  if (!input.platform) {
    checks.push({
      key: 'link_format',
      label: 'Định dạng link',
      status: 'FAIL',
      detail: 'Không nhận ra nền tảng. Hỗ trợ TikTok, Shopee Video, Facebook, Instagram.',
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
    const missing = expect.requiredKeywords.filter(
      (k) => k.trim() && !captionFolded.includes(foldText(k.trim()))
    );
    checks.push(
      missing.length === 0
        ? {
            key: 'keywords',
            label: 'Brand / key message',
            status: 'PASS',
            detail: 'Caption có nhắc brand / key message.',
          }
        : {
            key: 'keywords',
            label: 'Brand / key message',
            status: 'WARN',
            detail: input.caption
              ? `Caption chưa nhắc: ${missing.join(', ')} (có thể KOC nói trong video, cần xem lại).`
              : 'Không đọc được caption.',
          }
    );
  }

  if (expect.requireProductLink) {
    checks.push(
      input.hasProductLink === true
        ? {
            key: 'product_link',
            label: 'Gắn link sản phẩm',
            status: 'PASS',
            detail: 'Bài có gắn giỏ hàng / link sản phẩm.',
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
      limitations: [],
      source: 'tiktok-ssr-waf',
      fetchedAt,
      fromCache: false,
      durationMs: Date.now() - started,
    };
    const checks = buildLinkAirChecks(base, expect);
    return { ...base, checks, verdict: verdictOf(checks) };
  }

  // Facebook / Instagram / Shopee Video fallback
  try {
    const res = await fetch(parsed.url, {
      method: 'GET',
      headers: {
        'User-Agent': parsed.platform === 'shopee' ? BROWSER_UA : LINK_PREVIEW_UA,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
      cache: 'no-store',
    });
    const html = await res.text();
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
      hasProductLink: null,
      productTitle: null,
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
