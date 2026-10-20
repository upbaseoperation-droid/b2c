import { facebookAdapter } from './adapters/facebook.ts';
import { instagramAdapter } from './adapters/instagram.ts';
import { shopeeAdapter } from './adapters/shopee.ts';
import { tiktokAdapter } from './adapters/tiktok.ts';
import { TtlCache } from './core/cache.ts';
import { buildChecks, verdictOf } from './core/checks.ts';
import { config } from './core/config.ts';
import { parseLink } from './core/detect.ts';
import { errorMessage, LINK_PREVIEW_UA, resolveRedirect } from './core/http.ts';
import { RateLimiter } from './core/limiter.ts';
import { log } from './core/log.ts';
import { extractHashtags, extractMentions } from './core/text.ts';
import type {
  LinkCheckResult,
  LinkExpectation,
  ParsedLink,
  Platform,
  PlatformAdapter,
  ScrapedContent,
} from './core/types.ts';

const adapters: Record<Platform, PlatformAdapter> = {
  tiktok: tiktokAdapter,
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  shopee: shopeeAdapter,
};

const limiters: Record<Platform, RateLimiter> = {
  tiktok: new RateLimiter(config.perPlatformConcurrency, config.perPlatformMinGapMs),
  instagram: new RateLimiter(config.perPlatformConcurrency, config.perPlatformMinGapMs),
  facebook: new RateLimiter(config.perPlatformConcurrency, config.perPlatformMinGapMs),
  shopee: new RateLimiter(config.perPlatformConcurrency, config.perPlatformMinGapMs),
};

/** Cache dữ liệu thô theo link chuẩn hoá; điều kiện nghiệm thu được áp lại mỗi lần. */
const contentCache = new TtlCache<{ parsed: ParsedLink; content: ScrapedContent; fetchedAt: string }>(
  config.cacheTtlMs,
  config.cacheMaxEntries
);

export function cacheSize(): number {
  return contentCache.size;
}

export function queueDepth(): Record<Platform, number> {
  return {
    tiktok: limiters.tiktok.pending,
    instagram: limiters.instagram.pending,
    facebook: limiters.facebook.pending,
    shopee: limiters.shopee.pending,
  };
}

async function resolveShortLink(parsed: ParsedLink): Promise<ParsedLink> {
  if (!parsed.isShortLink) return parsed;
  const ua = parsed.platform === 'facebook' ? LINK_PREVIEW_UA : undefined;
  const finalUrl = await limiters[parsed.platform].run(() => resolveRedirect(parsed.url, ua));
  const resolved = parseLink(finalUrl);
  return resolved && resolved.platform === parsed.platform && !resolved.isShortLink
    ? resolved
    : { ...parsed, url: finalUrl, isShortLink: false };
}

async function scrape(parsed: ParsedLink): Promise<{ parsed: ParsedLink; content: ScrapedContent; fetchedAt: string; fromCache: boolean }> {
  const resolved = await resolveShortLink(parsed);
  const cacheKey = `${resolved.platform}:${resolved.contentId ?? resolved.url}`;
  const cached = contentCache.get(cacheKey);
  const isStaleCartCache =
    cached?.content?.hasProductLink &&
    (!cached.content.cartProducts || cached.content.cartProducts.length === 0) &&
    !cached.content.productUrl;
  if (cached && !isStaleCartCache) return { ...cached, fromCache: true };

  if (!resolved.contentId && resolved.platform !== 'facebook') {
    return {
      parsed: resolved,
      content: {
        status: 'INVALID_LINK',
        statusDetail: 'Link không trỏ tới một bài đăng cụ thể (có thể là link kênh). Cần link của đúng bài air.',
        source: 'link-parser',
      },
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
  }

  const content = await limiters[resolved.platform].run(() => adapters[resolved.platform].fetchContent(resolved));
  const entry = { parsed: resolved, content, fetchedAt: new Date().toISOString() };
  // Chỉ cache kết quả chắc chắn; lỗi tạm thời (BLOCKED/ERROR) để lần sau thử lại.
  if (content.status === 'LIVE' || content.status === 'UNAVAILABLE') contentCache.set(cacheKey, entry);
  return { ...entry, fromCache: false };
}

export async function checkLink(inputUrl: string, expect: LinkExpectation = {}): Promise<LinkCheckResult> {
  const started = Date.now();
  const parsed = parseLink(inputUrl);

  let platform: Platform | null = parsed?.platform ?? null;
  let resolvedLink: ParsedLink | null = parsed;
  let content: ScrapedContent;
  let fetchedAt = new Date().toISOString();
  let fromCache = false;

  if (!parsed) {
    content = { status: 'INVALID_LINK', statusDetail: 'Không nhận ra nền tảng của link.', source: 'link-parser' };
  } else {
    try {
      const result = await scrape(parsed);
      resolvedLink = result.parsed;
      content = result.content;
      fetchedAt = result.fetchedAt;
      fromCache = result.fromCache;
    } catch (err) {
      log.error('check.failed', { url: inputUrl, platform, error: errorMessage(err) });
      content = { status: 'ERROR', statusDetail: `Không tải được trang: ${errorMessage(err)}`, source: 'worker' };
    }
  }

  const caption = content.caption ?? '';
  const base = {
    platform,
    contentId: content.contentId ?? resolvedLink?.contentId ?? null,
    status: content.status,
    statusDetail: content.statusDetail ?? null,
    author: {
      handle: content.author?.handle ?? resolvedLink?.handle ?? null,
      name: content.author?.name ?? null,
      profileUrl: content.author?.profileUrl ?? null,
      followers: content.author?.followers ?? null,
    },
    publishedAt: content.publishedAt ?? null,
    caption,
    hashtags: extractHashtags(caption),
    metrics: {
      views: content.metrics?.views ?? null,
      likes: content.metrics?.likes ?? null,
      comments: content.metrics?.comments ?? null,
      shares: content.metrics?.shares ?? null,
      saves: content.metrics?.saves ?? null,
    },
    hasProductLink: content.hasProductLink ?? null,
    productTitle: content.productTitle ?? null,
    productUrl: content.productUrl ?? null,
    productId: content.productId ?? null,
    cartProducts: content.cartProducts ?? [],
  };
  const checks = buildChecks(base, expect);

  return {
    inputUrl,
    ...base,
    contentType: content.contentType ?? resolvedLink?.contentType ?? null,
    canonicalUrl: content.canonicalUrl ?? resolvedLink?.url ?? null,
    mentions: extractMentions(caption),
    durationSeconds: content.durationSeconds ?? null,
    productTitle: content.productTitle ?? null,
    productUrl: content.productUrl ?? null,
    productId: content.productId ?? null,
    sellerId: content.sellerId ?? null,
    cartProducts: content.cartProducts ?? [],
    checks,
    verdict: verdictOf(checks),
    limitations: content.limitations ?? [],
    source: content.source,
    fetchedAt,
    fromCache,
    durationMs: Date.now() - started,
  };
}

export interface CheckRequestItem {
  url: string;
  expect?: LinkExpectation;
}

/** Kiểm tra nhiều link song song; giới hạn tốc độ được áp riêng cho từng nền tảng. */
export async function checkLinks(items: CheckRequestItem[]): Promise<LinkCheckResult[]> {
  return Promise.all(items.map((item) => checkLink(item.url, item.expect)));
}
