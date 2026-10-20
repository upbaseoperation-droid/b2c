import { createHash } from 'node:crypto';
import { BROWSER_UA, fetchText } from '../core/http.ts';
import { unixSecondsToIso } from '../core/text.ts';
import type { CartProductItem, ParsedLink, PlatformAdapter, ScrapedContent } from '../core/types.ts';

/**
 * Giải bài SHA-256 proof-of-work của tường lửa SlardarWAF trên trang TikTok
 * và trả về cookie để tải lại trang có dữ liệu SSR.
 */
export function solveTikTokWaf(html: string): string | null {
  const read = (id: string) => html.match(new RegExp(`<p id="${id}" class="([^"]*)"`))?.[1] ?? '';
  const cs = read('cs');
  if (!cs) return null;
  try {
    const challenge = JSON.parse(Buffer.from(cs, 'base64').toString('utf8'));
    const prefix = Buffer.from(challenge.v.a, 'base64');
    const expected = Buffer.from(challenge.v.c, 'base64').toString('hex');
    for (let i = 0; i <= 1_000_000; i++) {
      const hash = createHash('sha256').update(prefix).update(String(i)).digest('hex');
      if (hash !== expected) continue;
      challenge.d = Buffer.from(String(i), 'utf8').toString('base64');
      const cookies = [`${read('wci') || '_wafchallengeid'}=${Buffer.from(JSON.stringify(challenge)).toString('base64')}`];
      const rci = read('rci');
      const rs = read('rs');
      if (rci && rs) cookies.push(`${rci}=${rs}`);
      const rsId = read('rs_id');
      if (rsId) cookies.push(`waforigin_id=${rsId}`);
      return cookies.join('; ');
    }
  } catch {
    return null;
  }
  return null;
}

async function fetchTikTokPage(url: string): Promise<{ html: string; finalUrl: string; status: number }> {
  const first = await fetchText(url, { userAgent: BROWSER_UA });
  const wafCookie = solveTikTokWaf(first.text);
  if (!wafCookie) return { html: first.text, finalUrl: first.finalUrl, status: first.status };

  const setCookies = first.headers.getSetCookie().map((c) => c.split(';')[0].trim());
  const second = await fetchText(first.finalUrl, {
    userAgent: BROWSER_UA,
    headers: { Cookie: [...setCookies, wafCookie].join('; ') },
  });
  return { html: second.text, finalUrl: second.finalUrl, status: second.status };
}

interface TikTokItemStruct {
  id?: string;
  desc?: string;
  createTime?: number | string;
  author?: { uniqueId?: string; nickname?: string };
  authorStats?: { followerCount?: number };
  stats?: Record<string, number | string>;
  statsV2?: Record<string, number | string>;
  video?: { duration?: number };
  anchors?: Array<Record<string, unknown>>;
  isECVideo?: number | boolean;
  commerceInfo?: unknown;
  imagePost?: unknown;
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

export function extractTikTokCartAnchors(item: TikTokItemStruct): {
  hasProductLink: boolean;
  productTitle: string | null;
  productUrl: string | null;
  productId: string | null;
  sellerId: string | null;
  cartProducts: CartProductItem[];
} {
  const anchors = Array.isArray(item.anchors) ? item.anchors : [];
  let hasProductLink = Boolean(item.isECVideo) || Boolean(item.commerceInfo);
  let productTitle: string | null = null;
  const cartProducts: CartProductItem[] = [];
  const seenKeys = new Set<string>();

  const pushProduct = (prod: CartProductItem) => {
    const key = prod.productId || prod.productUrl || prod.title;
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    cartProducts.push(prod);
  };

  for (const anchor of anchors) {
    if (!anchor || typeof anchor !== 'object') continue;
    const schema = typeof anchor.schema === 'string' ? anchor.schema : '';
    const isCapcutSchema = schema.toLowerCase().includes('capcut') && typeof anchor.extra !== 'string';

    if (typeof anchor.extra === 'string' && anchor.extra.trim()) {
      try {
        const parsedExtra = JSON.parse(anchor.extra);
        const outerList = Array.isArray(parsedExtra) ? parsedExtra : [parsedExtra];
        for (const outer of outerList) {
          if (!outer || typeof outer !== 'object') continue;
          const outerObj = outer as Record<string, unknown>;
          const compKey = typeof outerObj.component_key === 'string' ? outerObj.component_key : '';
          const outerKeyword = typeof outerObj.keyword === 'string' ? outerObj.keyword.trim() : '';
          const outerId =
            typeof outerObj.id === 'string' && /^\d{10,25}$/.test(outerObj.id.trim())
              ? outerObj.id.trim()
              : typeof outerObj.id === 'number'
                ? String(outerObj.id)
                : '';

          const isShopEntry = compKey === 'anchor_shop' || outerObj.type === 33;
          if (isShopEntry) hasProductLink = true;

          if (typeof outerObj.extra === 'string' && outerObj.extra.trim()) {
            const rawExtraStr = outerObj.extra;
            const rawProductId =
              rawExtraStr.match(/"product_id"\s*:\s*"?(\d{10,25})"?/)?.[1] ||
              rawExtraStr.match(/"material_id"\s*:\s*"?(\d{10,25})"?/)?.[1] ||
              outerId;
            const rawSellerId = rawExtraStr.match(/"seller_id"\s*:\s*"?(\d{10,25})"?/)?.[1];
            const rawSkuId = rawExtraStr.match(/"sku_id"\s*:\s*"?(\d{10,25})"?/)?.[1];

            try {
              const innerObj = JSON.parse(rawExtraStr) as Record<string, unknown>;
              const fullTitle = typeof innerObj.title === 'string' ? innerObj.title.trim() : '';
              const elasticTitle =
                typeof innerObj.elastic_title === 'string' ? innerObj.elastic_title.trim() : '';
              const innerTitle = fullTitle || elasticTitle || outerKeyword;
              const seoUrl =
                typeof innerObj.seo_url === 'string' && innerObj.seo_url.trim().startsWith('http')
                  ? innerObj.seo_url.trim()
                  : '';
              const shortUrl =
                typeof innerObj.short_url === 'string' && innerObj.short_url.trim().startsWith('http')
                  ? innerObj.short_url.trim()
                  : '';
              const finalUrl =
                typeof innerObj.final_url === 'string' && innerObj.final_url.trim().startsWith('http')
                  ? innerObj.final_url.trim()
                  : '';
              const pid = rawProductId || (seoUrl.match(/\/(\d{15,25})(?:[/?#]|$)/)?.[1] ?? '');
              const url =
                seoUrl ||
                shortUrl ||
                finalUrl ||
                (pid ? `https://shop.tiktok.com/view/product/${pid}?region=VN&locale=vi-VN` : '');

              if (pid || url || innerObj.source === 'TikTok Shop' || isShopEntry || innerTitle) {
                hasProductLink = true;
                if (innerTitle && !productTitle) productTitle = innerTitle;
                if (url || pid || innerTitle) {
                  pushProduct({
                    productId: pid || '',
                    skuId: rawSkuId,
                    sellerId: rawSellerId,
                    title: innerTitle || 'Sản phẩm TikTok Shop',
                    anchorKeyword:
                      outerKeyword && outerKeyword !== fullTitle ? outerKeyword : undefined,
                    productUrl: url,
                    source: 'TikTok Shop',
                  });
                }
              }
            } catch {
              if (isShopEntry && (outerId || outerKeyword)) {
                pushProduct({
                  productId: outerId,
                  title: outerKeyword || 'Sản phẩm TikTok Shop',
                  productUrl: outerId
                    ? `https://shop.tiktok.com/view/product/${outerId}?region=VN&locale=vi-VN`
                    : '',
                  source: 'TikTok Shop',
                });
              }
            }
          }
          if (hasProductLink && !productTitle && outerKeyword && !isNonProductAnchorText(outerKeyword)) {
            productTitle = outerKeyword;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!isCapcutSchema && !productTitle) {
      const kw =
        (typeof anchor.keyword === 'string' && anchor.keyword.trim()) ||
        (typeof anchor.description === 'string' && anchor.description.trim()) ||
        '';
      if (kw && !isNonProductAnchorText(kw)) {
        hasProductLink = true;
        productTitle = kw;
      }
    }
  }

  const primary = cartProducts[0];
  return {
    hasProductLink,
    productTitle: productTitle || primary?.title || null,
    productUrl: primary?.productUrl || null,
    productId: primary?.productId || null,
    sellerId: primary?.sellerId || null,
    cartProducts,
  };
}

/** 32 bit cao của video ID TikTok là thời điểm đăng (Unix giây). */
export function tiktokIdToUnixSeconds(id: string): number | null {
  if (!/^\d{17,22}$/.test(id)) return null;
  const seconds = Number(BigInt(id) >> 32n);
  return seconds > 1_451_606_400 && seconds < 2_100_000_000 ? seconds : null;
}

function num(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',

  async fetchContent(link: ParsedLink): Promise<ScrapedContent> {
    const page = await fetchTikTokPage(link.url);
    const script = page.html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!script) {
      return {
        status: 'BLOCKED',
        statusDetail: `TikTok không trả dữ liệu trang (HTTP ${page.status}). Có thể bị chặn IP, cần proxy.`,
        source: 'tiktok-ssr',
      };
    }

    const scope = JSON.parse(script)?.__DEFAULT_SCOPE__ ?? {};
    const detail = scope['webapp.video-detail'] ?? scope['webapp.reflow.video.detail'];
    const item: TikTokItemStruct | undefined = detail?.itemInfo?.itemStruct;
    if (!item?.id) {
      const code = detail?.statusCode;
      return {
        status: 'UNAVAILABLE',
        statusDetail:
          code === 10204 || code === 10216
            ? 'Video đã bị xoá hoặc chuyển riêng tư.'
            : `TikTok không trả thông tin video${code ? ` (mã ${code})` : ''}.`,
        source: 'tiktok-ssr',
      };
    }

    const handle = (item.author?.uniqueId ?? '').toLowerCase();
    const stats = { ...item.stats, ...item.statsV2 };
    const createTime = num(item.createTime) ?? tiktokIdToUnixSeconds(item.id);
    const kind = item.imagePost ? 'photo' : 'video';
    const cartInfo = extractTikTokCartAnchors(item);

    return {
      status: 'LIVE',
      canonicalUrl: `https://www.tiktok.com/@${handle}/${kind}/${item.id}`,
      contentId: item.id,
      contentType: kind,
      author: {
        handle,
        name: item.author?.nickname ?? null,
        profileUrl: handle ? `https://www.tiktok.com/@${handle}` : null,
        followers: num(item.authorStats?.followerCount),
      },
      publishedAt: unixSecondsToIso(createTime),
      caption: (item.desc ?? '').trim(),
      durationSeconds: num(item.video?.duration),
      metrics: {
        views: num(stats.playCount),
        likes: num(stats.diggCount),
        comments: num(stats.commentCount),
        shares: num(stats.shareCount),
        saves: num(stats.collectCount),
      },
      hasProductLink: cartInfo.hasProductLink,
      productTitle: cartInfo.productTitle,
      productUrl: cartInfo.productUrl,
      productId: cartInfo.productId,
      sellerId: cartInfo.sellerId,
      cartProducts: cartInfo.cartProducts,
      source: 'tiktok-ssr',
    };
  },
};
