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
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '));
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
    /\b(\d{1,2}(?:[.,]\d{3}){1,2})\s*(?:đ|₫|vnd|vnđ|đồng)\b/gi;
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
        const hasVnLang =
          /[ăằắặẳẵầấậẩẫềếệểễòóọỏõồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(html) ||
          url.endsWith('.vn') ||
          url.includes('vietnam');
        return {
          url: res.url || url,
          title: cleanTitle,
          score:
            (hasVnLang ? 10 : 0) +
            (slugs.some((s) => normalizeToken(cleanTitle).includes(s)) ? 10 : 0),
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
  // 2) Haravan/Shopify `/collections/all/products.json?limit=18`
  // 3) Sapo/Shopify `/products.json?limit=18`
  // 4) WooCommerce `/wp-json/wc/store/products?per_page=18`
  const [homeRes, haravanJsonRes, sapoJsonRes, wcJsonRes] = await Promise.all([
    fetch(cleanBase, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'vi-VN,vi;q=0.9' },
      signal: AbortSignal.timeout(4800),
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
        if (hText.length >= 5 && hText.length <= 130 && !headings.includes(hText)) {
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

      // Nếu chưa lấy được sản phẩm từ API JSON, bóc tách từ thẻ sản phẩm HTML trên trang chủ
      if (products.length < 4) {
        const brandNorm = normalizeToken(brandQuery);
        const cardRegex =
          /<(?:h2|h3|h4|a)[^>]*>([^<]{6,110})<\/(?:h2|h3|h4|a)>[\s\S]{0,260}?(\d{1,2}(?:[.,]\d{3}){1,2})\s*(?:đ|₫|vnd|vnđ)/gi;
        for (const m of stripped.matchAll(cardRegex)) {
          const pTitle = stripTags(m[1]);
          const pPrice = Number(m[2].replace(/[.,]/g, ''));
          if (
            brandNorm.length < 3 ||
            normalizeToken(pTitle).includes(brandNorm) ||
            domain.includes(brandNorm)
          ) {
            addProduct({
              productName: pTitle,
              priceVnd: pPrice,
              sourceUrl: cleanBase,
              sourceDomain: domain,
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
          (brandFieldNorm.includes(brandNorm) || brandNorm.includes(brandFieldNorm))) ||
        nameNorm.includes(brandNorm);

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

      if (price >= 15000 && price <= 15000000) {
        products.push({
          productName: name,
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

  return {
    products: products.slice(0, 12),
    snippets: snippets.slice(0, 8),
  };
}

/**
 * Cào trực tiếp các thẻ video & tiêu đề thực tế từ Bing Video Search (vi-VN) cho thương hiệu/đối thủ
 */
async function scrapeBingVideoSnippetsForBrand(
  brandQuery: string
): Promise<LiveSearchSnippetEvidence[]> {
  const cleanName = brandQuery.replace(/^@+/, '').trim();
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
      const title = card.match(/class="mc_vtvc_title"[^>]*title="([^"]*)"/i)?.[1] || '';
      const ourl = card.match(/ourl="([^"]*)"/i)?.[1] || '';
      const cleanTitle = decodeHtmlEntities(title);
      if (!cleanTitle || !ourl.startsWith('http')) continue;
      let domain = 'tiktok.com';
      try {
        domain = new URL(ourl).hostname.toLowerCase();
      } catch {
        // ignore
      }
      snippets.push({
        title: cleanTitle,
        url: ourl,
        domain,
        snippet: `Video thực tế trên ${domain}: ${cleanTitle}`,
        extractedPricesVnd: extractVndPricesFromText(cleanTitle),
      });
    }
  } catch {
    // ignore
  }
  return snippets;
}

function inferBrandOriginAndCategoryFromText(
  brandName: string,
  combinedText: string
): { originCountry: string; categoryLabel: string } {
  const lower = `${brandName} ${combinedText}`.toLowerCase();

  let originCountry = 'Việt Nam / Quốc tế';
  if (
    /\b(nous|bu baby|bubaby|dokma|lullaby|chaang|cocoon|cỏ mềm|nerman|kutieskin|nguyên xuân|dạ hương)\b/i.test(
      brandName.toLowerCase()
    ) ||
    /\b(thương hiệu việt nam|thuần chay việt nam|sản xuất tại việt nam)\b/i.test(lower)
  ) {
    originCountry = 'Việt Nam';
  } else if (/\b(hàn quốc|korea|seoul|k-beauty|klairs|skin1004|rom&nd|romand|torriden|clubclio)\b/i.test(lower)) {
    originCountry = 'Hàn Quốc';
  } else if (/\b(pháp|france|paris|la roche-posay|bioderma|svr|mustela|l'oréal|loreal)\b/i.test(lower)) {
    originCountry = 'Pháp';
  } else if (/\b(nhật bản|nhật|japan|tokyo|anessa|moony|merries|dhc|pigeon)\b/i.test(lower)) {
    originCountry = 'Nhật Bản';
  } else if (/\b(mỹ|usa|hoa kỳ|cerave|cetaphil|obagi|maybelline|ensure)\b/i.test(lower)) {
    originCountry = 'Mỹ';
  } else if (/\b(đức|germany|bepanthen|sebamed)\b/i.test(lower)) {
    originCountry = 'Đức';
  } else if (/\b(anh quốc|anh|uk|femfresh|simple)\b/i.test(lower)) {
    originCountry = 'Anh Quốc';
  } else if (/\b(tây ban nha|spain|babé|babe)\b/i.test(lower)) {
    originCountry = 'Tây Ban Nha';
  } else if (/\b(thái lan|thailand|d-nee|dnee|cathy doll)\b/i.test(lower)) {
    originCountry = 'Thái Lan';
  }

  let categoryLabel = 'Chăm sóc Cá nhân & Tiêu dùng';
  if (
    /\b(sơ sinh|quần áo bé|bodysuit|nous|bu baby|bubaby|lullaby|dokma|uala rogo|chaang|bộ dài tay|áo khoác|bamboo cotton|petit)\b/i.test(
      lower
    )
  ) {
    categoryLabel = 'Thời trang & Phụ kiện Sơ sinh Mẹ & Bé';
  } else if (/\b(tã|bỉm|quần bỉm|miếng lót sơ sinh|momo rabbit|moony|merries|huggies|bobby)\b/i.test(lower)) {
    categoryLabel = 'Tã Bỉm & Chăm sóc Em bé';
  } else if (/\b(hăm tã|chàm sữa|kem bôi cho bé|tắm gội cho bé|rôm sảy|kutieskin|mustela|bepanthen)\b/i.test(lower)) {
    categoryLabel = 'Chăm sóc da Mẹ & Bé';
  } else if (/\b(nam giới|sữa tắm nam|dầu gội nam|vệ sinh nam|nerman|romano|x-men)\b/i.test(lower)) {
    categoryLabel = 'Chăm sóc Cá nhân & Nước hoa Nam giới';
  } else if (/\b(dung dịch vệ sinh|phụ khoa|vùng kín|femfresh|lactacyd)\b/i.test(lower)) {
    categoryLabel = 'Chăm sóc Vệ sinh Phụ nữ & Cá nhân';
  } else if (/\b(son|phấn nước|cushion|mascara|kẻ mắt|má hồng|trang điểm|makeup|rom&nd|judydoll|colorkey|maybelline)\b/i.test(lower)) {
    categoryLabel = 'Trang điểm & Mỹ phẩm Xu hướng';
  } else if (/\b(kem chống nắng|serum|toner|nước hoa hồng|dưỡng ẩm|sữa rửa mặt|mụn|thâm|nám|retinol|b5|aha|bha|peel)\b/i.test(lower)) {
    categoryLabel = 'Dược mỹ phẩm & Chăm sóc Da (Skincare)';
  } else if (/\b(dầu gội|dầu xả|ủ tóc|xịt bưởi|rụng tóc|sữa tắm)\b/i.test(lower)) {
    categoryLabel = 'Chăm sóc Tóc & Cơ thể (Hair & Body Care)';
  } else if (/\b(nước giặt|nước xả|lau sàn|rửa chén|giặt xả)\b/i.test(lower)) {
    categoryLabel = 'Chăm sóc Nhà cửa & Giặt xả (Home Care)';
  } else if (/\b(sữa bột|sữa công thức|tiêu hóa|tăng cân|dinh dưỡng|vitamin|collagen)\b/i.test(lower)) {
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
  knownWebsiteUrl?: string
): Promise<LiveAutoScrapedBrandIntelligence> {
  const cleanName = brandQuery.replace(/^@+/, '').trim();

  // Chạy song song:
  // 1) Dò tìm Website chính thức
  // 2) Cào danh mục sản phẩm & giá thật trên Sàn TMĐT
  // 3) Cào danh sách video thực tế từ Bing Video Search
  const [officialUrl, ecommerceData, videoSnippets] = await Promise.all([
    discoverOfficialBrandWebsite(cleanName, knownWebsiteUrl),
    scrapeEcommerceMarketplaceCatalog(cleanName),
    scrapeBingVideoSnippetsForBrand(cleanName),
  ]);

  // Nếu tìm thấy Website chính thức, cào sâu ngay danh mục sản phẩm (`/collections/all/products.json`, `/products.json`, `/wp-json/wc/store/products`, trang chủ)
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

  const allPrices = Array.from(
    new Set([
      ...allProducts.map((p) => p.priceVnd),
      ...(officialCatalog?.pricesVnd || []),
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
    combinedCorpus
  );

  const extractedUsps: string[] = [];
  if (officialCatalog?.metaDescription && officialCatalog.metaDescription.length >= 20) {
    extractedUsps.push(`[${officialCatalog.domain}] ${officialCatalog.metaDescription}`);
  }
  for (const spec of officialCatalog?.specs || []) {
    if (extractedUsps.length >= 5) break;
    extractedUsps.push(`[${officialCatalog?.domain}] ${spec}`);
  }
  for (const snip of ecommerceData.snippets) {
    if (extractedUsps.length >= 6) break;
    extractedUsps.push(`[${snip.domain}] ${snip.snippet}`);
  }

  const allSnippets: LiveSearchSnippetEvidence[] = [
    ...(officialCatalog
      ? [
          {
            title: officialCatalog.metaTitle,
            url: officialUrl!,
            domain: officialCatalog.domain,
            snippet:
              officialCatalog.metaDescription ||
              officialCatalog.headings.slice(0, 4).join(' · ') ||
              `Trang chủ chính thức ${officialCatalog.domain} (${officialCatalog.products.length} SKU sản phẩm vừa cào)`,
            extractedPricesVnd: officialCatalog.pricesVnd.slice(0, 6),
          },
        ]
      : []),
    ...ecommerceData.snippets,
    ...videoSnippets,
  ];

  return {
    queriedName: cleanName,
    resolvedBrandTitle:
      officialCatalog?.metaTitle?.split(/[-|–]/)[0]?.trim() || cleanName,
    detectedOriginCountry: originCountry,
    detectedCategoryLabel: categoryLabel,
    officialWebsiteUrl: officialUrl,
    officialWebsiteDomain: officialCatalog?.domain,
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
