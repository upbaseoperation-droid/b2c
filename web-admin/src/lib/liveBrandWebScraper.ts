/**
 * Bộ cào tự động 100% theo thời gian thực (Live Official Website + Haravan/Shopify/Sapo JSON + WooCommerce API + E-Commerce Public API)
 * cho BẤT KỲ thương hiệu hoặc đối thủ nào người dùng nhập vào.
 *
 * Quy trình tự động khi người dùng dán tên thương hiệu / đối thủ:
 * 1. Tự động dò tìm tên miền Website chính thức tại Việt Nam (.vn, .com.vn, vietnam.com, .com)
 * 2. Cào trực tiếp API Danh mục Sản phẩm trên Website hãng:
 *    - Haravan / Shopify: `/collections/all/products.json?limit=16` & `/products.json?limit=16`
 *    - WordPress / WooCommerce: `/wp-json/wc/store/products?per_page=16`
 *    - DOM HTML & JSON-LD Schema.org trên trang chủ, `/collections/all`, `/san-pham`
 * 3. Cào trực tiếp API Sàn TMĐT công khai (Tiki Product Catalog API) lọc nghiêm ngặt theo đúng tên thương hiệu (`brand_name` / `name`)
 *    để lấy giá bán thực tế, giá niêm yết, điểm đánh giá (rating) và sản lượng đã bán.
 */

export interface LiveScrapedProductSku {
  productName: string;
  priceVnd: number;
  originalPriceVnd?: number;
  sourceUrl: string;
  sourceDomain: string;
  productType?: string;
  specSummary?: string;
  ratingAverage?: number;
  reviewCount?: number;
  soldCount?: number;
}

export interface LiveSearchSnippetEvidence {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  extractedPricesVnd: number[];
}

export interface LiveAutoScrapedBrandIntelligence {
  queriedName: string;
  resolvedBrandTitle: string;
  detectedOriginCountry: string;
  detectedCategoryLabel: string;
  officialWebsiteUrl?: string;
  officialWebsiteDomain?: string;
  shopeeUrl?: string;
  tiktokHandle?: string;
  metaTitle?: string;
  metaDescription?: string;
  headings: string[];
  extractedUsps: string[];
  extractedSpecs: string[];
  extractedPromotions: string[];
  scrapedProducts: LiveScrapedProductSku[];
  priceRangeVnd: {
    min: number;
    max: number;
    median: number;
    formattedRange: string;
  } | null;
  searchSnippets: LiveSearchSnippetEvidence[];
  scrapedAt: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&#038;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function normalizeToken(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Tách tất cả mức giá VNĐ hợp lệ (từ 15.000đ đến 15.000.000đ) trong một đoạn văn bản
 */
export function extractVndPricesFromText(text: string): number[] {
  const prices: number[] = [];
  const fullRegex =
    /\b(\d{1,3}(?:[.,]\d{3}){1,2})\s*(?:đ|₫|vnd|vnđ|đồng)\b/gi;
  for (const m of text.matchAll(fullRegex)) {
    const digits = Number(m[1].replace(/[.,]/g, ''));
    if (digits >= 15000 && digits <= 15000000) {
      prices.push(digits);
    }
  }
  return Array.from(new Set(prices));
}

/**
 * Tự động dò tìm Website chính thức của thương hiệu tại Việt Nam bằng cách kiểm tra song song các tên miền khả dĩ
 */
async function discoverOfficialBrandWebsite(
  brandQuery: string,
  knownWebsiteUrl?: string
): Promise<string | undefined> {
  const cleanFull = brandQuery
    .replace(/^@+/, '')
    .replace(/\b(vietnam|vn|official|store|shop|mall|chính hãng)\b/gi, '')
    .trim();
  const slugFull = normalizeToken(cleanFull);
  const slugShort = normalizeToken(
    cleanFull.replace(/\b(mẹ và bé|baby|kids|mama)\b/gi, '').trim()
  );
  if (slugFull.length < 2) return knownWebsiteUrl;

  const slugs = Array.from(new Set([slugFull, slugShort].filter((s) => s.length >= 2)));
  const candidateUrls = Array.from(
    new Set(
      [
        knownWebsiteUrl,
        ...slugs.flatMap((slug) => [
          `https://www.${slug}.vn`,
          `https://${slug}.vn`,
          `https://${slug}.com.vn`,
          `https://www.${slug}.com.vn`,
          `https://${slug}vietnam.com`,
          `https://${slug}baby.vn`,
          `https://${slug}.com`,
        ]),
      ].filter((u): u is string => Boolean(u))
    )
  );

  const probeResults = await Promise.all(
    candidateUrls.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi-VN,vi;q=0.9',
          },
          signal: AbortSignal.timeout(3800),
          cache: 'no-store',
        });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('html')) return null;
        const html = (await res.text()).slice(0, 35000);
        const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
        const cleanTitle = stripTags(title);
        // Loại bỏ trang rao bán tên miền (parked domain)
        if (
          /domain for sale|buy this domain|sedo|hugedomains|godaddy|namecheap|ten mien/i.test(
            cleanTitle
          )
        ) {
          return null;
        }
        const finalUrl = res.url || url;
        let finalHost = '';
        try {
          finalHost = new URL(finalUrl).hostname.toLowerCase();
        } catch {
          // ignore
        }
        const hostMatchesBrand = slugs.some((s) => normalizeToken(finalHost).includes(s));
        const titleMatchesBrand = slugs.some((s) => normalizeToken(cleanTitle).includes(s));
        const hasVnLang =
          /[ăằắặẳẵầấậẩẫềếệểễòóọỏõồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(html) ||
          finalHost.endsWith('.vn') ||
          finalHost.includes('vietnam');
        return {
          url: finalUrl,
          title: cleanTitle,
          score:
            (hasVnLang ? 10 : 0) +
            (titleMatchesBrand ? 10 : 0) +
            (hostMatchesBrand ? 15 : 0),
        };
      } catch {
        return null;
      }
    })
  );

  const valid = probeResults
    .filter((r): r is NonNullable<typeof r> => r !== null && r.score >= 10)
    .sort((a, b) => b.score - a.score);

  if (valid.length > 0) {
    try {
      const u = new URL(valid[0].url);
      return `${u.protocol}//${u.hostname}`;
    } catch {
      return valid[0].url;
    }
  }
  return knownWebsiteUrl;
}

/**
 * Cào trực tiếp danh mục sản phẩm từ Website chính thức (Haravan / Shopify / Sapo / WooCommerce / HTML DOM)
 */
async function scrapeOfficialWebsiteCatalog(
  baseUrl: string,
  brandQuery: string
): Promise<{
  domain: string;
  metaTitle: string;
  metaDescription: string;
  headings: string[];
  promotions: string[];
  specs: string[];
  products: LiveScrapedProductSku[];
  pricesVnd: number[];
}> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const domain = new URL(cleanBase).hostname.toLowerCase();
  const products: LiveScrapedProductSku[] = [];
  const specs: string[] = [];
  const seenNames = new Set<string>();

  const addProduct = (item: LiveScrapedProductSku) => {
    const cleanName = decodeHtmlEntities(item.productName).trim();
    if (cleanName.length < 5 || cleanName.length > 160) return;
    const key = normalizeToken(cleanName);
    if (seenNames.has(key)) return;
    seenNames.add(key);
    products.push({
      ...item,
      productName: cleanName,
    });
  };

  // Chạy song song:
  // 1) Trang chủ HTML
  // 2) Trang `/san-pham` HTML (phổ biến trên các website nhãn hàng Việt Nam)
  // 3) Haravan/Shopify `/collections/all/products.json?limit=18`
  // 4) Sapo/Shopify `/products.json?limit=18`
  // 5) WooCommerce `/wp-json/wc/store/products?per_page=18`
  const [homeRes, sanPhamRes, haravanJsonRes, sapoJsonRes, wcJsonRes] = await Promise.all([
    fetch(cleanBase, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
      signal: AbortSignal.timeout(4800),
      cache: 'no-store',
    }).catch(() => null),
    fetch(`${cleanBase}/san-pham`, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    }).catch(() => null),
    fetch(`${cleanBase}/collections/all/products.json?limit=18`, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    }).catch(() => null),
    fetch(`${cleanBase}/products.json?limit=18`, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    }).catch(() => null),
    fetch(`${cleanBase}/wp-json/wc/store/products?per_page=18`, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    }).catch(() => null),
  ]);

  // Xử lý Haravan / Shopify / Sapo JSON
  for (const jsonRes of [haravanJsonRes, sapoJsonRes]) {
    if (!jsonRes || !jsonRes.ok) continue;
    const ct = jsonRes.headers.get('content-type') || '';
    if (!ct.includes('json')) continue;
    try {
      const data = await jsonRes.json();
      const rawList = Array.isArray(data?.products) ? data.products : [];
      for (const p of rawList) {
        const title = String(p.title || p.name || '').trim();
        if (!title) continue;
        const firstVariant = Array.isArray(p.variants) ? p.variants[0] : undefined;
        let rawPrice = Number(firstVariant?.price ?? p.price ?? p.price_min ?? 0);
        let rawCompare = Number(
          firstVariant?.compare_at_price ?? p.compare_at_price_max ?? 0
        );
        // Một số cấu hình Haravan nhân 100 vào đơn vị xu
        if (rawPrice >= 15000000 && rawPrice % 100 === 0) {
          rawPrice = Math.round(rawPrice / 100);
        }
        if (rawCompare >= 15000000 && rawCompare % 100 === 0) {
          rawCompare = Math.round(rawCompare / 100);
        }
        const handlePath = p.handle
          ? `/products/${p.handle}`
          : p.alias
          ? `/${p.alias}`
          : p.url || '';
        const prodUrl = handlePath.startsWith('http')
          ? handlePath
          : `${cleanBase}${handlePath.startsWith('/') ? '' : '/'}${handlePath}`;

        const rawBody = stripTags(String(p.body_html || p.summary || p.content || '')).slice(
          0,
          220
        );
        if (rawBody.length >= 20 && specs.length < 8 && !specs.includes(rawBody)) {
          specs.push(`${title}: ${rawBody}`);
        }

        if (rawPrice >= 15000 && rawPrice <= 15000000) {
          addProduct({
            productName: title,
            priceVnd: rawPrice,
            originalPriceVnd: rawCompare > rawPrice ? rawCompare : undefined,
            sourceUrl: prodUrl,
            sourceDomain: domain,
            productType: p.product_type ? String(p.product_type) : undefined,
            specSummary: rawBody || undefined,
          });
        }
      }
    } catch {
      // ignore json parse error
    }
  }

  // Xử lý WordPress WooCommerce Store API (`/wp-json/wc/store/products`)
  if (wcJsonRes && wcJsonRes.ok && (wcJsonRes.headers.get('content-type') || '').includes('json')) {
    try {
      const wcList = await wcJsonRes.json();
      if (Array.isArray(wcList)) {
        for (const p of wcList) {
          const title = stripTags(String(p.name || ''));
          const priceObj = p.prices || {};
          const minorUnit = Number(priceObj.currency_minor_unit ?? 0);
          const divisor = minorUnit > 0 ? Math.pow(10, minorUnit) : 1;
          const salePrice = Math.round(Number(priceObj.price || priceObj.sale_price || 0) / divisor);
          const regPrice = Math.round(Number(priceObj.regular_price || 0) / divisor);
          const shortDesc = stripTags(
            String(p.short_description || p.description || '')
          ).slice(0, 220);

          if (shortDesc.length >= 20 && specs.length < 8 && !specs.includes(shortDesc)) {
            specs.push(`${title}: ${shortDesc}`);
          }

          if (title && salePrice >= 15000 && salePrice <= 15000000) {
            addProduct({
              productName: title,
              priceVnd: salePrice,
              originalPriceVnd: regPrice > salePrice ? regPrice : undefined,
              sourceUrl: String(p.permalink || cleanBase),
              sourceDomain: domain,
              specSummary: shortDesc || undefined,
              ratingAverage: Number(p.average_rating) || undefined,
              reviewCount: Number(p.review_count) || undefined,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  let metaTitle = domain;
  let metaDescription = '';
  const headings: string[] = [];
  const promotions: string[] = [];
  const pricesVnd: number[] = [];

  if (homeRes && homeRes.ok) {
    try {
      const html = await homeRes.text();
      const tMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (tMatch) metaTitle = stripTags(tMatch[1]).slice(0, 180);

      const dMatch =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
        html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      if (dMatch) metaDescription = stripTags(dMatch[1]).slice(0, 320);

      for (const m of html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)) {
        const hText = stripTags(m[1]);
        if (
          hText.length >= 5 &&
          hText.length <= 130 &&
          /[\p{L}]/u.test(hText) &&
          !headings.includes(hText)
        ) {
          headings.push(hText);
          if (headings.length >= 16) break;
        }
      }

      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ');

      pricesVnd.push(...extractVndPricesFromText(stripped));

      const promoMatches =
        stripped.match(
          /(?:giảm|sale|ưu đãi|voucher|tặng|mua\s+\d+\s+tặng\s+\d+|freeship)\s+[^\n<>.,;]{3,45}/gi
        ) || [];
      for (const pm of promoMatches) {
        const cleanPromo = decodeHtmlEntities(pm);
        if (!promotions.includes(cleanPromo) && promotions.length < 6) {
          promotions.push(cleanPromo);
        }
      }

      // Nếu chưa lấy được sản phẩm từ API JSON, bóc tách từ thẻ sản phẩm HTML trên trang chủ và `/san-pham`
      if (products.length < 6) {
        const brandNorm = normalizeToken(brandQuery);
        let sanPhamHtml = '';
        if (sanPhamRes && sanPhamRes.ok) {
          sanPhamHtml = await sanPhamRes.text().catch(() => '');
        }
        const combinedHtmlForCards = `${sanPhamHtml}\n${stripped}`
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ');

        const headingBlocks = combinedHtmlForCards.split(/(?=<h[2-4][^>]*>)/i);
        for (const hBlock of headingBlocks) {
          const hMatch = hBlock.match(/^<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
          if (!hMatch) continue;
          const rawHeading = stripTags(hMatch[1]).replace(/^\d+[.)]\s*/, '').trim();
          if (rawHeading.length < 6 || rawHeading.length > 110) continue;
          const pMatch = hBlock.match(/(\d{1,3}(?:[.,]\d{3}){1,2})\s*(?:đ|₫|vnd|vnđ|đồng)/i);
          if (!pMatch) continue;
          const pPrice = Number(pMatch[1].replace(/[.,]/g, ''));
          if (pPrice < 15000 || pPrice > 15000000) continue;

          if (
            brandNorm.length < 3 ||
            normalizeToken(rawHeading).includes(brandNorm) ||
            normalizeToken(domain).includes(brandNorm)
          ) {
            const bulletTexts = [...hBlock.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
              .map((m) => stripTags(m[1]))
              .filter((t) => t.length >= 15 && t.length <= 180)
              .slice(0, 2);
            const specText = bulletTexts.join(' · ') || undefined;
            if (specText && specs.length < 8 && !specs.includes(`${rawHeading}: ${specText}`)) {
              specs.push(`${rawHeading}: ${specText}`);
            }
            addProduct({
              productName: rawHeading,
              priceVnd: pPrice,
              sourceUrl: sanPhamHtml ? `${cleanBase}/san-pham` : cleanBase,
              sourceDomain: domain,
              specSummary: specText,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    domain,
    metaTitle,
    metaDescription,
    headings,
    promotions,
    specs,
    products: products.slice(0, 12),
    pricesVnd: Array.from(new Set([...products.map((p) => p.priceVnd), ...pricesVnd])).slice(
      0,
      20
    ),
  };
}

/**
 * Giải mã URL chuyển hướng của công cụ tìm kiếm (Bing `/ck/a?...&u=a1...`, DuckDuckGo `uddg=...`)
 * về URL gốc thực tế của Website / Sàn TMĐT
 */
export function unwrapSearchRedirectUrl(rawUrl: string): string {
  const decoded = decodeHtmlEntities(rawUrl);
  try {
    const full = decoded.startsWith('//') ? `https:${decoded}` : decoded;
    if (full.includes('uddg=')) {
      const m = full.match(/uddg=([^&]+)/);
      if (m) {
        const target = decodeURIComponent(m[1]);
        if (target.startsWith('http')) return target;
      }
    }
    const u = new URL(full);
    if (u.hostname.includes('bing.com') && u.pathname.startsWith('/ck/a')) {
      const paramU = u.searchParams.get('u');
      if (paramU && paramU.startsWith('a1')) {
        const b64 = paramU.slice(2).replace(/-/g, '+').replace(/_/g, '/');
        const target = Buffer.from(b64, 'base64').toString('utf8');
        if (target.startsWith('http')) return target;
      }
    }
    return full;
  } catch {
    return decoded;
  }
}

/**
 * Cào trực tiếp danh mục sản phẩm & giá bán từ API công khai của Sàn TMĐT (Tiki Public Catalog API)
 * Chỉ lấy các sản phẩm khớp đúng tên thương hiệu (`brand_name` hoặc `name` chứa tên thương hiệu)
 */
async function scrapeEcommerceMarketplaceCatalog(
  brandQuery: string
): Promise<{
  products: LiveScrapedProductSku[];
  snippets: LiveSearchSnippetEvidence[];
}> {
  const cleanName = brandQuery
    .replace(/^@+/, '')
    .replace(/\b(vietnam|vn|official|store|shop|mall)\b/gi, '')
    .trim();
  const brandNorm = normalizeToken(cleanName);
  if (brandNorm.length < 2) return { products: [], snippets: [] };

  const products: LiveScrapedProductSku[] = [];
  const snippets: LiveSearchSnippetEvidence[] = [];

  try {
    const apiUrl = `https://tiki.vn/api/v2/products?limit=24&q=${encodeURIComponent(cleanName)}`;
    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    });
    if (!res.ok) return { products, snippets };

    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : [];

    for (const item of items) {
      const name = String(item.name || '').trim();
      const brandNameField = String(item.brand_name || '').trim();
      const nameNorm = normalizeToken(name);
      const brandFieldNorm = normalizeToken(brandNameField);

      // Kiểm tra nghiêm ngặt sản phẩm thực sự thuộc về thương hiệu đang tra cứu
      const isDirectBrandMatch =
        (brandFieldNorm.length >= 2 &&
          (brandFieldNorm === brandNorm ||
            (brandNorm.length >= 3 && brandFieldNorm.includes(brandNorm)) ||
            (brandFieldNorm.length >= 4 &&
              brandFieldNorm.length >= brandNorm.length - 3 &&
              brandNorm.includes(brandFieldNorm)))) ||
        (brandNorm.length >= 3 && nameNorm.includes(brandNorm));

      if (!isDirectBrandMatch) continue;

      const price = Number(item.price || 0);
      const originalPrice = Number(item.original_price || item.list_price || 0);
      const ratingAvg = Number(item.rating_average || 0);
      const reviewCount = Number(item.review_count || 0);
      const soldCount = Number(item.quantity_sold?.value || 0);
      const urlPath = String(item.url_path || '');
      const fullUrl = urlPath.startsWith('http')
        ? urlPath
        : `https://tiki.vn/${urlPath.replace(/^\/+/, '')}`;

      const isSampleSachet =
        price < 45000 || /\b(1ml|2ml|3ml|sample|mẫu thử|gói thử)\b/i.test(name);

      if (!isSampleSachet && price >= 45000 && price <= 15000000) {
        products.push({
          productName: name.replace(/^\[[^\]]+\]\s*/, '').trim(),
          priceVnd: price,
          originalPriceVnd: originalPrice > price ? originalPrice : undefined,
          sourceUrl: fullUrl,
          sourceDomain: 'tiki.vn',
          ratingAverage: ratingAvg > 0 ? Number(ratingAvg.toFixed(1)) : undefined,
          reviewCount: reviewCount > 0 ? reviewCount : undefined,
          soldCount: soldCount > 0 ? soldCount : undefined,
        });

        snippets.push({
          title: name,
          url: fullUrl,
          domain: 'tiki.vn',
          snippet: `Thương hiệu: ${brandNameField || cleanName} · Giá bán: ${price.toLocaleString('vi-VN')}đ${
            originalPrice > price ? ` (Giá gốc: ${originalPrice.toLocaleString('vi-VN')}đ)` : ''
          }${ratingAvg > 0 ? ` · Đánh giá: ${ratingAvg}/5 (${reviewCount} nhận xét)` : ''}${
            soldCount > 0 ? ` · Đã bán: ${soldCount.toLocaleString('vi-VN')}` : ''
          }`,
          extractedPricesVnd: [price],
        });
      }
    }
  } catch {
    // ignore
  }

  products.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

  return {
    products: products.slice(0, 12),
    snippets: snippets.slice(0, 8),
  };
}

/**
 * Tìm kiếm trực tiếp trên Web (Bing Search vi-VN, DuckDuckGo HTML & Bing News Async)
 * để lấy kết quả trang web, sàn TMĐT, bài viết đánh giá, giá bán (đã giải mã URL gốc & lọc kết quả rác).
 */
export async function scrapeWebSearchSnippets(
  searchQuery: string,
  requiredBrandHint?: string
): Promise<LiveSearchSnippetEvidence[]> {
  const cleanQ = searchQuery.trim();
  if (!cleanQ) return [];
  const snippets: LiveSearchSnippetEvidence[] = [];
  const seenUrls = new Set<string>();

  const hintRaw = (requiredBrandHint || cleanQ.split(/\s+/).slice(0, 2).join(' '))
    .replace(/^@+/, '')
    .trim();
  const brandNormFull = normalizeToken(hintRaw);
  const brandNormFirst = normalizeToken(hintRaw.split(/[\s-]+/)[0] || '');

  // Tạo truy vấn phụ nối liền tên thương hiệu nếu tên có dấu gạch ngang/khoảng trắng (ví dụ: La Roche-Posay -> larocheposay)
  const joinedBrandQuery =
    requiredBrandHint && /[\s-]/.test(requiredBrandHint.trim())
      ? `${normalizeToken(requiredBrandHint)} chính hãng giá bán`
      : cleanQ;

  const pushVerifiedSnippet = (rawTitle: string, rawUrl: string, rawSnippet: string) => {
    const cleanUrl = unwrapSearchRedirectUrl(rawUrl);
    if (
      !cleanUrl.startsWith('http') ||
      cleanUrl.includes('duckduckgo.com/y.js') ||
      cleanUrl.includes('bing.com/aclick') ||
      seenUrls.has(cleanUrl)
    ) {
      return;
    }
    const title = stripTags(rawTitle);
    const snippetText = stripTags(rawSnippet).slice(0, 260) || title;
    if (!title || /^tìm kiếm bằng hình ảnh$/i.test(title)) return;

    // Lọc bỏ kết quả mồi (decoy) không liên quan đến thương hiệu đang tìm
    const combinedNorm = normalizeToken(`${title} ${cleanUrl} ${snippetText}`);
    const matchesBrand =
      (brandNormFull.length >= 2 && combinedNorm.includes(brandNormFull)) ||
      (brandNormFirst.length >= 4 && combinedNorm.includes(brandNormFirst));
    if (!matchesBrand) return;

    let domain = 'web';
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      // ignore
    }
    seenUrls.add(cleanUrl);
    snippets.push({
      title,
      url: cleanUrl,
      domain,
      snippet: snippetText,
      extractedPricesVnd: extractVndPricesFromText(`${title} ${snippetText}`),
    });
  };

  const [bingHtml, bingJoinedHtml, ddgHtml, bingNewsHtml] = await Promise.all([
    fetch(
      `https://www.bing.com/search?q=${encodeURIComponent(
        cleanQ
      )}&mkt=vi-VN&setlang=vi&cc=VN&count=10`,
      {
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
        signal: AbortSignal.timeout(4500),
        cache: 'no-store',
      }
    )
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
    joinedBrandQuery !== cleanQ
      ? fetch(
          `https://www.bing.com/search?q=${encodeURIComponent(
            joinedBrandQuery
          )}&mkt=vi-VN&setlang=vi&cc=VN&count=10`,
          {
            headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
            signal: AbortSignal.timeout(4500),
            cache: 'no-store',
          }
        )
          .then((r) => (r.ok ? r.text() : ''))
          .catch(() => '')
      : Promise.resolve(''),
    fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQ)}&kl=vn-vi`,
      {
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
        signal: AbortSignal.timeout(4500),
        cache: 'no-store',
      }
    )
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
    fetch(
      `https://www.bing.com/news/infinitescrollajax?InfiniteScroll=1&q=${encodeURIComponent(
        requiredBrandHint || cleanQ
      )}&mkt=vi-VN&setlang=vi`,
      {
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
        signal: AbortSignal.timeout(4500),
        cache: 'no-store',
      }
    )
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => ''),
  ]);

  // 1) Bing Web Search (chính + nối liền tên brand)
  for (const html of [bingHtml, bingJoinedHtml]) {
    if (!html) continue;
    const algoBlocks = html.split(/<li class="b_algo"/i).slice(1, 10);
    for (const block of algoBlocks) {
      const linkMatch = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const captionMatch =
        block.match(/<div class="b_caption"[^>]*>([\s\S]*?)<\/div>/i) ||
        block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      pushVerifiedSnippet(linkMatch[2], linkMatch[1], captionMatch?.[1] || '');
    }
  }

  // 2) DuckDuckGo HTML Search
  if (ddgHtml) {
    const ddgBlocks = ddgHtml.split(/class="result\s+results_links/i).slice(1, 10);
    for (const block of ddgBlocks) {
      if (block.includes('result--ad')) continue;
      const aMatch = block.match(/class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!aMatch) continue;
      const sMatch = block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i
      );
      pushVerifiedSnippet(aMatch[2], aMatch[1], sMatch?.[1] || sMatch?.[2] || '');
    }
  }

  // 3) Bing News & Bài viết đánh giá chuyên sâu
  if (bingNewsHtml) {
    const newsCards = bingNewsHtml.split(/class="news-card/i).slice(1, 8);
    for (const card of newsCards) {
      const m = card.match(/<a[^>]+class="title"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!m) continue;
      const sm = card.match(/<div class="snippet"[^>]*>([\s\S]*?)<\/div>/i);
      pushVerifiedSnippet(m[2], m[1], sm?.[1] || '');
    }
  }

  return snippets.slice(0, 12);
}

/**
 * Cào trực tiếp các thẻ video & tiêu đề thực tế từ Bing Video Search (vi-VN) cho thương hiệu/đối thủ
 */
async function scrapeBingVideoSnippetsForBrand(
  brandQuery: string
): Promise<LiveSearchSnippetEvidence[]> {
  const cleanName = brandQuery.replace(/^@+/, '').trim();
  const brandNorm = normalizeToken(cleanName);
  const snippets: LiveSearchSnippetEvidence[] = [];
  try {
    const url = `https://www.bing.com/videos/asyncv2?q=${encodeURIComponent(
      `tiktok "${cleanName}" review`
    )}&async=content&first=0&count=20&mkt=vi-VN&setlang=vi&cc=VN`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'vi-VN,vi;q=0.9',
      },
      signal: AbortSignal.timeout(4200),
      cache: 'no-store',
    });
    if (!res.ok) return snippets;
    const html = await res.text();
    const cards = html.split(/class="mc_vtvc_con_rc"/i).slice(1, 10);
    for (const card of cards) {
      const title =
        card.match(/class="mc_vtvc_title[^"]*"[^>]*title="([^"]*)"/i)?.[1] ||
        card.match(/class="mc_vtvc_title[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
        card.match(/alt="([^"]*)"/i)?.[1] ||
        '';
      const ourl = card.match(/ourl="([^"]*)"/i)?.[1] || '';
      const cleanTitle = stripTags(title);
      const cleanOurl = decodeHtmlEntities(ourl);
      if (!cleanTitle || !cleanOurl.startsWith('http')) continue;
      if (
        brandNorm.length >= 3 &&
        !normalizeToken(`${cleanTitle} ${cleanOurl}`).includes(brandNorm)
      ) {
        continue;
      }
      const viewsText = stripTags(
        card.match(/class="meta_vc_content"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''
      );
      const channelText = stripTags(
        card.match(/class="mc_vtvc_meta_row_channel"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || ''
      );
      let domain = 'tiktok.com';
      try {
        domain = new URL(cleanOurl).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        // ignore
      }
      const metaParts = [
        channelText ? `Kênh: ${channelText}` : '',
        viewsText ? `${viewsText}` : '',
      ].filter(Boolean);
      snippets.push({
        title: cleanTitle,
        url: cleanOurl,
        domain,
        snippet: `Video review trên ${domain}${metaParts.length ? ` (${metaParts.join(' · ')})` : ''}: ${cleanTitle}`,
        extractedPricesVnd: extractVndPricesFromText(cleanTitle),
      });
    }
  } catch {
    // ignore
  }
  return snippets;
}

function hasVnKeywords(text: string, alternation: string): boolean {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${alternation})(?=$|[^\\p{L}\\p{N}])`, 'iu');
  return re.test(text);
}

function inferBrandOriginAndCategoryFromText(
  brandName: string,
  combinedText: string,
  officialDomain?: string
): { originCountry: string; categoryLabel: string } {
  const lowerBrand = brandName.toLowerCase();
  const lower = `${brandName} ${combinedText}`.toLowerCase();

  let originCountry = 'Việt Nam / Quốc tế';
  if (
    hasVnKeywords(
      lowerBrand,
      'nous|bu baby|bubaby|dokma|lullaby|chaang|cocoon|cỏ mềm|comem|nerman|rhys man|rhysman|cm24|coolmate|oniiz|kutieskin|nguyên xuân|dạ hương|miss saigon|cindy bloom|orgalife|meracine'
    ) ||
    hasVnKeywords(
      lower,
      'thương hiệu việt nam|thuần chay việt nam|sản xuất tại việt nam|thương hiệu chăm sóc nam giới việt nam'
    )
  ) {
    originCountry = 'Việt Nam';
  } else if (
    hasVnKeywords(
      lower,
      'hàn quốc|korea|seoul|k-beauty|klairs|skin1004|rom&nd|romand|torriden|clubclio|nabizam|momo rabbit|momorabbit|rejuran|baegayul|face republic'
    )
  ) {
    originCountry = 'Hàn Quốc';
  } else if (
    hasVnKeywords(
      lower,
      "pháp|france|paris|la roche-posay|larocheposay|bioderma|svr|mustela|l'oréal|loreal|l'occitane|loccitane|royal canin"
    )
  ) {
    originCountry = 'Pháp';
  } else if (
    hasVnKeywords(
      lower,
      'nhật bản|nhật|japan|tokyo|anessa|moony|merries|dhc|pigeon|nucos|phcare|chulala'
    )
  ) {
    originCountry = 'Nhật Bản';
  } else if (
    hasVnKeywords(
      lower,
      'mỹ|usa|hoa kỳ|cerave|cetaphil|obagi|maybelline|ensure|revision|bye bye blemish|byebyeblemish'
    )
  ) {
    originCountry = 'Mỹ';
  } else if (hasVnKeywords(lower, 'đức|germany|bepanthen|sebamed|eucerin')) {
    originCountry = 'Đức';
  } else if (hasVnKeywords(lower, 'anh quốc|uk|femfresh|simple')) {
    originCountry = 'Anh Quốc';
  } else if (hasVnKeywords(lower, 'tây ban nha|spain|babé|babe|ekseption')) {
    originCountry = 'Tây Ban Nha';
  } else if (hasVnKeywords(lower, 'thái lan|thailand|d-nee|dnee|cathy doll|cathydoll|karmart|kodomo')) {
    originCountry = 'Thái Lan';
  } else if (hasVnKeywords(lower, 'ba lan|poland|ziaja|herbal care|farmona')) {
    originCountry = 'Ba Lan';
  } else if (officialDomain && officialDomain.endsWith('.vn')) {
    originCountry = 'Việt Nam';
  }

  let categoryLabel = 'Chăm sóc Cá nhân & Tiêu dùng';
  if (
    hasVnKeywords(
      lowerBrand,
      'rhys man|rhysman|nerman|romano|x-men|xmen|cm24|badlab|oniiz|iron & stone|old spice|gatsby|nivea men'
    ) ||
    hasVnKeywords(
      lower,
      'nam giới|đàn ông|phái mạnh|dành cho nam|bộ quà tặng cho nam|sữa tắm nam|sữa tắm gội nam|dầu gội nam|vệ sinh nam|bọt vệ sinh nam|dung dịch vệ sinh nam|nước hoa nam|khử mùi nam|sáp vuốt tóc|gôm xịt tóc|xịt phồng tóc|máy tỉa lông mũi|cạo râu|rhys man|rhysman|nerman|romano|x-men|cm24|badlab'
    )
  ) {
    categoryLabel = 'Chăm sóc Cá nhân & Nước hoa Nam giới';
  } else if (
    hasVnKeywords(
      lower,
      'quần áo sơ sinh|đồ sơ sinh|thời trang sơ sinh|giỏ đồ đi sinh|bodysuit sơ sinh|nous|bu baby|bubaby|lullaby|dokma|uala rogo|chaang|nu petit|nu doux|nu air'
    )
  ) {
    categoryLabel = 'Thời trang & Phụ kiện Sơ sinh Mẹ & Bé';
  } else if (
    hasVnKeywords(
      lower,
      'tã dán|tã quần|bỉm quần|bỉm dán|miếng lót sơ sinh|momo rabbit|momorabbit|nabizam|moony|merries|huggies|bobby'
    )
  ) {
    categoryLabel = 'Tã Bỉm & Chăm sóc Em bé';
  } else if (
    hasVnKeywords(
      lower,
      'hăm tã|chống hăm|chàm sữa|kem bôi cho bé|tắm gội cho bé|nước tắm thảo dược cho bé|rôm sảy|kutieskin|mustela|bepanthen|skinbibi'
    )
  ) {
    categoryLabel = 'Chăm sóc da Mẹ & Bé';
  } else if (
    hasVnKeywords(
      lower,
      'nước giặt cho bé|nước giặt em bé|giặt xả cho bé|d-nee|dnee|docilee|kodomo|arau baby'
    )
  ) {
    categoryLabel = 'Chăm sóc Đồ dùng & Giặt xả cho Bé';
  } else if (
    hasVnKeywords(
      lower,
      'dung dịch vệ sinh phụ nữ|vệ sinh phụ nữ|phụ khoa|vùng kín|femfresh|lactacyd|phcare|ziaja intimate|dạ hương'
    )
  ) {
    categoryLabel = 'Chăm sóc Vệ sinh Phụ nữ & Cá nhân';
  } else if (
    hasVnKeywords(
      lower,
      'son môi|son kem|son tint|phấn nước|cushion|mascara|kẻ mắt|má hồng|trang điểm|makeup|rom&nd|romand|judydoll|colorkey|maybelline|clubclio|peripera'
    )
  ) {
    categoryLabel = 'Trang điểm & Mỹ phẩm Xu hướng';
  } else if (
    hasVnKeywords(
      lower,
      'kem chống nắng|serum|toner|nước hoa hồng|dưỡng ẩm|sữa rửa mặt|mụn|thâm mụn|nám|retinol|niacinamide|hyaluronic|aha|bha|peel da|dược mỹ phẩm|rejuran|la roche-posay|cerave|cetaphil|bioderma|svr|obagi|skin1004|torriden|babé'
    )
  ) {
    categoryLabel = 'Dược mỹ phẩm & Chăm sóc Da (Skincare)';
  } else if (
    hasVnKeywords(
      lower,
      "nước hoa|body mist|xịt thơm toàn thân|xịt thơm cơ thể|khuếch tán hương|cindy bloom|miss saigon|l'occitane|loccitane"
    )
  ) {
    categoryLabel = 'Nước hoa & Chăm sóc Hương thơm';
  } else if (
    hasVnKeywords(
      lower,
      'dầu gội|dầu xả|ủ tóc|xịt bưởi|tinh dầu bưởi|rụng tóc|sữa tắm|tẩy da chết cơ thể|herbal care|chulala|nguyên xuân|cocoon|cỏ mềm'
    )
  ) {
    categoryLabel = 'Chăm sóc Tóc & Cơ thể (Hair & Body Care)';
  } else if (
    hasVnKeywords(
      lower,
      'nước giặt|nước xả|lau sàn|rửa chén|giặt xả|omo|maxkleen|ariel|tm clean|feelcleans'
    )
  ) {
    categoryLabel = 'Chăm sóc Nhà cửa & Giặt xả (Home Care)';
  } else if (
    hasVnKeywords(
      lower,
      'thức ăn cho mèo|thức ăn cho chó|hạt cho mèo|hạt cho chó|thú cưng|royal canin|whiskas|me-o'
    )
  ) {
    categoryLabel = 'Dinh dưỡng Khoa học cho Thú cưng';
  } else if (
    hasVnKeywords(
      lower,
      'sữa bột|sữa công thức|sữa dinh dưỡng|bữa ăn thay thế|dinh dưỡng y học|vitamin|collagen|omega-3|thực phẩm bảo vệ sức khỏe|nucos|meracine|orgalife|ensure|dhc'
    )
  ) {
    categoryLabel = 'Dinh dưỡng & Thực phẩm Bảo vệ Sức khỏe';
  }

  return { originCountry, categoryLabel };
}

/**
 * Hàm chủ lực: Cào tự động 100% theo thời gian thực thông tin Thương hiệu / Đối thủ
 * từ Website chính thức (Haravan/Shopify/Sapo/WooCommerce), Sàn TMĐT (Tiki Public API) và Video Search.
 */
export async function scrapeLiveBrandWebIntelligence(
  brandQuery: string,
  knownWebsiteUrl?: string,
  extraSearchQuery?: string
): Promise<LiveAutoScrapedBrandIntelligence> {
  const cleanName = brandQuery.replace(/^@+/, '').trim();
  const webQuery = extraSearchQuery?.trim()
    ? `${cleanName} ${extraSearchQuery.trim()}`
    : `${cleanName} sản phẩm giá bán đánh giá`;

  const brandNorm = normalizeToken(cleanName);

  // Chạy song song:
  // 1) Dò tìm Website chính thức
  // 2) Cào danh mục sản phẩm & giá thật trên Sàn TMĐT
  // 3) Cào danh sách video thực tế từ Bing Video Search
  // 4) Tìm kiếm trực tiếp trên Web (Bing Search vi-VN, DuckDuckGo & Bing News)
  const [probedOfficialUrl, ecommerceData, videoSnippets, webSnippets] = await Promise.all([
    discoverOfficialBrandWebsite(cleanName, knownWebsiteUrl),
    scrapeEcommerceMarketplaceCatalog(cleanName),
    scrapeBingVideoSnippetsForBrand(cleanName),
    scrapeWebSearchSnippets(webQuery, cleanName),
  ]);

  let officialUrl = probedOfficialUrl;
  const marketplaceDomains =
    /shopee\.vn|lazada\.vn|tiki\.vn|hasaki\.vn|guardian\.com\.vn|watsons\.vn|chiaki\.vn|nhathuoclongchau|pharmacity|concung|bibomart|kidsplaza|websosanh|facebook\.com|tiktok\.com|youtube\.com|instagram\.com|kenh14|vnexpress|dantri|vietnamnet|thanhnien|tuoitre|bloganchoi|saostar/i;

  const snippetBrandSite = webSnippets.find(
    (s) =>
      brandNorm.length >= 3 &&
      normalizeToken(s.domain).includes(brandNorm) &&
      !marketplaceDomains.test(s.domain)
  );

  if (snippetBrandSite) {
    const probedHostNorm = officialUrl
      ? normalizeToken(new URL(officialUrl).hostname)
      : '';
    if (!officialUrl || !probedHostNorm.includes(brandNorm)) {
      try {
        const u = new URL(snippetBrandSite.url);
        officialUrl = `${u.protocol}//${u.hostname}`;
      } catch {
        officialUrl = snippetBrandSite.url;
      }
    }
  }

  const detectedShopeeUrl = webSnippets.find((s) => /shopee\.vn/i.test(s.domain))?.url;
  const detectedTikTokSnippet = [...webSnippets, ...videoSnippets].find((s) =>
    /tiktok\.com\/@([a-zA-Z0-9._]+)/i.test(s.url)
  );
  const detectedTikTokHandle = detectedTikTokSnippet?.url.match(
    /tiktok\.com\/(@[a-zA-Z0-9._]+)/i
  )?.[1];

  // Nếu tìm thấy Website chính thức, cào sâu ngay danh mục sản phẩm (`/collections/all/products.json`, `/products.json`, `/wp-json/wc/store/products`, `/san-pham`, trang chủ)
  const officialCatalog = officialUrl
    ? await scrapeOfficialWebsiteCatalog(officialUrl, cleanName)
    : null;

  const allProducts: LiveScrapedProductSku[] = [];
  const seenProdKeys = new Set<string>();

  for (const p of [
    ...(officialCatalog?.products || []),
    ...ecommerceData.products,
  ]) {
    const key = normalizeToken(p.productName);
    if (!seenProdKeys.has(key)) {
      seenProdKeys.add(key);
      allProducts.push(p);
    }
  }

  // Nếu chưa đủ sản phẩm từ Website hãng & Tiki, bóc tách thêm từ 2 trang bài viết/nhà thuốc/sàn đầu tiên trong kết quả tìm kiếm
  if (allProducts.length < 3 && webSnippets.length > 0) {
    const candidateSnippetPages = webSnippets
      .filter(
        (s) =>
          !/facebook\.com|tiktok\.com|youtube\.com|instagram\.com/i.test(s.domain) &&
          s.url !== officialUrl
      )
      .slice(0, 2);

    await Promise.all(
      candidateSnippetPages.map(async (snip) => {
        try {
          const pRes = await fetch(snip.url, {
            headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
            signal: AbortSignal.timeout(3500),
            cache: 'no-store',
          });
          if (!pRes.ok) return;
          const pHtml = (await pRes.text())
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ');
          const pagePrices = extractVndPricesFromText(pHtml);
          if (pagePrices.length > 0) {
            snip.extractedPricesVnd = Array.from(
              new Set([...(snip.extractedPricesVnd || []), ...pagePrices])
            ).slice(0, 4);
            const rawTitlePart = snip.title.split(/[|–:]/)[0].trim();
            const cleanedProdTitle = rawTitlePart
              .replace(/^(review|đánh giá|chi tiết|top\s*\d+|so sánh)\s+/i, '')
              .trim();
            const cleanSnipTitle =
              cleanedProdTitle.charAt(0).toUpperCase() + cleanedProdTitle.slice(1);
            const key = normalizeToken(cleanSnipTitle);
            if (cleanSnipTitle.length >= 8 && !seenProdKeys.has(key)) {
              seenProdKeys.add(key);
              allProducts.push({
                productName: cleanSnipTitle,
                priceVnd: pagePrices[0],
                sourceUrl: snip.url,
                sourceDomain: snip.domain,
                specSummary: snip.snippet.slice(0, 180),
              });
            }
          }
        } catch {
          // ignore
        }
      })
    );
  }

  const allPrices = Array.from(
    new Set([
      ...allProducts.map((p) => p.priceVnd),
      ...(officialCatalog?.pricesVnd || []),
      ...webSnippets.flatMap((s) => s.extractedPricesVnd || []),
    ])
  )
    .filter((p) => p >= 15000 && p <= 15000000)
    .sort((a, b) => a - b);

  let priceRangeVnd: LiveAutoScrapedBrandIntelligence['priceRangeVnd'] = null;
  if (allPrices.length > 0) {
    const trimmed =
      allPrices.length >= 6
        ? allPrices.slice(1, allPrices.length - 1)
        : allPrices;
    const min = trimmed[0];
    const max = trimmed[trimmed.length - 1];
    const median = trimmed[Math.floor(trimmed.length / 2)];
    const fmt = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
    priceRangeVnd = {
      min,
      max,
      median,
      formattedRange: min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`,
    };
  }

  const combinedCorpus = [
    cleanName,
    officialCatalog?.metaTitle || '',
    officialCatalog?.metaDescription || '',
    ...(officialCatalog?.headings || []),
    ...(officialCatalog?.specs || []),
    ...allProducts.map((p) => `${p.productName} ${p.specSummary || ''}`),
  ].join(' ');

  const { originCountry, categoryLabel } = inferBrandOriginAndCategoryFromText(
    cleanName,
    combinedCorpus,
    officialCatalog?.domain
  );

  const extractedUsps: string[] = [];
  if (officialCatalog?.metaDescription && officialCatalog.metaDescription.length >= 20) {
    extractedUsps.push(`[${officialCatalog.domain}] ${officialCatalog.metaDescription}`);
  }
  for (const spec of officialCatalog?.specs || []) {
    if (extractedUsps.length >= 5) break;
    extractedUsps.push(`[${officialCatalog?.domain}] ${spec}`);
  }
  for (const snip of [...ecommerceData.snippets, ...webSnippets]) {
    if (extractedUsps.length >= 6) break;
    const uLine = `[${snip.domain}] ${snip.snippet}`;
    if (!extractedUsps.includes(uLine)) {
      extractedUsps.push(uLine);
    }
  }

  const rawCombinedSnippets: LiveSearchSnippetEvidence[] = [
    ...(officialCatalog
      ? [
          {
            title: officialCatalog.metaTitle,
            url: officialUrl!,
            domain: officialCatalog.domain,
            snippet:
              officialCatalog.metaDescription ||
              officialCatalog.headings.slice(0, 4).join(' · ') ||
              `Trang chủ chính thức ${officialCatalog.domain} (${officialCatalog.products.length} sản phẩm)`,
            extractedPricesVnd: officialCatalog.pricesVnd.slice(0, 6),
          },
        ]
      : []),
    ...webSnippets,
    ...ecommerceData.snippets,
    ...videoSnippets,
  ];

  const allSnippets: LiveSearchSnippetEvidence[] = [];
  const seenSnippetUrls = new Set<string>();
  for (const sn of rawCombinedSnippets) {
    const normUrl = sn.url.replace(/\/+$/, '').toLowerCase();
    if (!seenSnippetUrls.has(normUrl)) {
      seenSnippetUrls.add(normUrl);
      allSnippets.push(sn);
    }
  }

  return {
    queriedName: cleanName,
    resolvedBrandTitle:
      officialCatalog?.metaTitle?.split(/[-|–]/)[0]?.trim() || cleanName,
    detectedOriginCountry: originCountry,
    detectedCategoryLabel: categoryLabel,
    officialWebsiteUrl: officialUrl,
    officialWebsiteDomain: officialCatalog?.domain,
    shopeeUrl: detectedShopeeUrl,
    tiktokHandle: detectedTikTokHandle,
    metaTitle: officialCatalog?.metaTitle,
    metaDescription: officialCatalog?.metaDescription,
    headings: officialCatalog?.headings || [],
    extractedUsps,
    extractedSpecs: officialCatalog?.specs || [],
    extractedPromotions: officialCatalog?.promotions || [],
    scrapedProducts: allProducts.slice(0, 12),
    priceRangeVnd,
    searchSnippets: allSnippets.slice(0, 12),
    scrapedAt: new Date().toISOString(),
  };
}
