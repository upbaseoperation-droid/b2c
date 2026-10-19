import { fetchLiveTikTokPublicProfile } from './tiktokKocScraper';
import { getSharedCrawlerStore, stripVnAccents } from './tiktokOpenSourceEngines';

export type SocialPlatformKey = 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS';

export type SocialConfidenceLevel = 'CAO' | 'TRUNG_BÌNH' | 'GỢI_Ý';

export interface SocialChannelCandidate {
  platform: SocialPlatformKey;
  handle: string;
  url: string;
  displayName?: string;
  confidence: SocialConfidenceLevel;
  sourceLabel: string;
  evidence?: string;
  isVerifiedLive?: boolean;
  followerCount?: number;
}

export interface KocSocialDiscoveryResult {
  kocId?: string;
  tiktokHandle: string;
  stageName: string;
  scannedAt: string;
  bioExtracted?: string;
  bioLinkExtracted?: string;
  candidatesByPlatform: Record<SocialPlatformKey, SocialChannelCandidate[]>;
}

const DEFAULT_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const MOBILE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const OPENGRAPH_CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const IGNORED_FB_PATHS = new Set([
  'profile.php',
  'people',
  'pages',
  'groups',
  'watch',
  'reel',
  'reels',
  'share',
  'sharer',
  'sharer.php',
  'story.php',
  'photo.php',
  'photo',
  'photos',
  'video.php',
  'videos',
  'events',
  'marketplace',
  'gaming',
  'login',
  'reg',
  'help',
  'privacy',
  'policies',
  'hashtag',
  'public',
  'search',
  'answer',
  'facebook',
  'facebook.com',
  'fb.com',
  'outline',
  'dialog',
  'plugins',
]);

const IGNORED_IG_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'explore',
  'accounts',
  'about',
  'legal',
  'developer',
  'direct',
  'tags',
  'outline',
  '_g.bqig',
  'signin',
  'login',
  'instagram.com',
  'threads.net',
  'threads.com',
]);

const IGNORED_SHOPEE_PATHS = new Set([
  'search',
  'buyer',
  'seller',
  'user',
  'cart',
  'checkout',
  'daily_discover',
  'flash_sale',
  'mall',
  'm',
  'campaigns',
  'events',
  'blog',
  'help',
  'legaldoc',
  'product',
  'universal-link',
  'shopee.vn',
]);

function normalizeHandle(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .split(/[/?#&\s]/)[0]
    .trim();
}

function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return _;
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&bull;/g, '•')
    .replace(/&middot;/g, '·')
    .normalize('NFC')
    .trim();
}

export function formatSocialChannelUrl(platform: SocialPlatformKey, rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const h = normalizeHandle(trimmed);
  if (!h) return '';

  switch (platform) {
    case 'SHOPEE':
      return `https://shopee.vn/${h}`;
    case 'FACEBOOK':
      return `https://www.facebook.com/${h}`;
    case 'INSTAGRAM':
      return `https://www.instagram.com/${h}`;
    case 'THREADS':
      return `https://www.threads.net/@${h}`;
  }
}

export function extractHandleFromSocialInput(platform: SocialPlatformKey, rawInput: string): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return '';

  if (
    !/^https?:\/\//i.test(trimmed) &&
    !trimmed.includes('.com') &&
    !trimmed.includes('shopee.vn') &&
    !trimmed.includes('threads.net')
  ) {
    const clean = normalizeHandle(trimmed);
    return platform === 'INSTAGRAM' || platform === 'THREADS' ? `@${clean}` : clean;
  }

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length === 0) return trimmed;

    if (platform === 'SHOPEE') {
      if (segs[0] === 'universal-link' && segs.length > 1) {
        return segs[1];
      }
      if (segs[0] === 'shop' && segs.length > 1) {
        return segs[1];
      }
      return segs[0];
    }

    if (platform === 'FACEBOOK') {
      if (segs[0] === 'profile.php') {
        const id = u.searchParams.get('id');
        return id ? `profile.php?id=${id}` : 'profile.php';
      }
      if (segs[0] === 'people' && segs.length >= 2) {
        return segs[1];
      }
      return segs[0];
    }

    if (platform === 'INSTAGRAM') {
      const h = segs[0].replace(/^@+/, '');
      return h ? `@${h}` : trimmed;
    }

    if (platform === 'THREADS') {
      const h = segs[0].replace(/^@+/, '');
      return h ? `@${h}` : trimmed;
    }
  } catch {
    // fallback
  }

  return normalizeHandle(trimmed);
}

function decodeRedirectUrlsInText(rawHtml: string): string {
  const ytDecoded = [...rawHtml.matchAll(/[?&]q=(https?%3A%2F%2F[^"&'\s<>]+)/gi)]
    .map((m) => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return '';
      }
    })
    .join('\n');

  const b64Decoded = [...rawHtml.matchAll(/(?:[?&]|&amp;)u=a1([a-zA-Z0-9_-]+)/g)]
    .map((m) => {
      try {
        return Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      } catch {
        return '';
      }
    })
    .join('\n');

  const ddgDecoded = [...rawHtml.matchAll(/uddg=([^&"'\s>]+)/g)]
    .map((m) => {
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return '';
      }
    })
    .join('\n');

  return `${rawHtml}\n${ytDecoded}\n${b64Decoded}\n${ddgDecoded}`
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/%40/g, '@')
    .replace(/%2F/gi, '/')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/');
}

function extractSocialLinksFromText(
  text: string,
  sourceLabel: string,
  confidence: SocialConfidenceLevel
): SocialChannelCandidate[] {
  const normalized = decodeRedirectUrlsInText(text);
  const candidates: SocialChannelCandidate[] = [];

  // 1. Instagram URLs & flexible bio mentions (e.g. "Fl my ig : _zuyah_", "IG: @abc", "ins: abc")
  for (const m of normalized.matchAll(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{3,30})/gi)) {
    const h = m[1].toLowerCase().replace(/\/+$/, '').replace(/\.+$/, '');
    if (IGNORED_IG_PATHS.has(h) || /^\d+$/.test(h) || h.length < 3) continue;
    candidates.push({
      platform: 'INSTAGRAM',
      handle: `@${h}`,
      url: `https://www.instagram.com/${h}`,
      confidence,
      sourceLabel,
    });
  }

  for (const m of normalized.matchAll(
    /(?:\b(?:ig|insta|instagram|ins)\b)\s*(?:[:\-–=]|\s+is\s+|\s+)\s*(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)?@?([a-zA-Z0-9._]{3,30})/gi
  )) {
    const h = m[1].toLowerCase().replace(/\.+$/, '');
    if (IGNORED_IG_PATHS.has(h) || /^(my|me|for|and|the|của|mình|tớ|em)$/i.test(h)) continue;
    candidates.push({
      platform: 'INSTAGRAM',
      handle: `@${h}`,
      url: `https://www.instagram.com/${h}`,
      confidence: 'CAO',
      sourceLabel,
    });
  }

  // 2. Threads URLs & mentions
  for (const m of normalized.matchAll(/(?:https?:\/\/)?(?:www\.)?threads\.(?:net|com)\/@?([a-zA-Z0-9._]{3,30})/gi)) {
    const h = m[1].toLowerCase().replace(/\/+$/, '').replace(/\.+$/, '');
    if (IGNORED_IG_PATHS.has(h) || h === 'post' || h === 't' || h === 'login' || h.length < 3) continue;
    candidates.push({
      platform: 'THREADS',
      handle: `@${h}`,
      url: `https://www.threads.net/@${h}`,
      confidence,
      sourceLabel,
    });
  }

  // 3. Facebook URLs & mentions
  for (const m of normalized.matchAll(/(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook|fb)\.com\/([a-zA-Z0-9.]{4,45})/gi)) {
    const h = m[1].replace(/\/+$/, '').replace(/\.+$/, '');
    const lower = h.toLowerCase();
    if (
      IGNORED_FB_PATHS.has(lower) ||
      lower.endsWith('.php') ||
      lower.endsWith('.com') ||
      lower.startsWith('10000') ||
      lower.length < 4
    ) {
      continue;
    }
    candidates.push({
      platform: 'FACEBOOK',
      handle: h,
      url: `https://www.facebook.com/${h}`,
      confidence,
      sourceLabel,
    });
  }

  for (const m of normalized.matchAll(
    /(?:\b(?:fb|facebook|fanpage)\b)\s*[:\-–]\s*(?:https?:\/\/)?(?:www\.|m\.)?(?:(?:facebook|fb)\.com\/)?([a-zA-Z0-9.]{4,35})/gi
  )) {
    const h = m[1].trim().replace(/\/+$/, '').replace(/\.+$/, '');
    const lower = h.toLowerCase();
    if (IGNORED_FB_PATHS.has(lower) || lower.endsWith('.com')) continue;
    candidates.push({
      platform: 'FACEBOOK',
      handle: h,
      url: `https://www.facebook.com/${h}`,
      confidence: 'CAO',
      sourceLabel,
    });
  }

  // 4. Direct Shopee shop URLs
  for (const m of normalized.matchAll(
    /(?:https?:\/\/)?(?:www\.|vn\.)?(?:shopee\.vn)\/(?:shop\/|universal-link\/)?([a-zA-Z0-9._-]{3,35})/gi
  )) {
    const h = m[1].replace(/\/+$/, '');
    const lower = h.toLowerCase();
    if (
      IGNORED_SHOPEE_PATHS.has(lower) ||
      lower.includes('-i.') ||
      /^\d+$/.test(lower) ||
      lower.length < 3
    ) {
      continue;
    }
    candidates.push({
      platform: 'SHOPEE',
      handle: h,
      url: `https://shopee.vn/${h}`,
      confidence,
      sourceLabel,
    });
  }

  return candidates;
}

async function fetchUrlTextSafe(url: string, timeoutMs = 4500, userAgent = DEFAULT_BROWSER_UA): Promise<string> {
  const store = getSharedCrawlerStore();
  return store.searchLimiter.run(async () => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      });
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return '';
    }
  });
}

async function unrollShopeeShortlinks(text: string, sourceLabel: string): Promise<SocialChannelCandidate[]> {
  const normalized = decodeRedirectUrlsInText(text);
  const shortlinks = new Set<string>();

  for (const m of normalized.matchAll(/https?:\/\/(?:s\.shopee\.vn|shp\.ee)\/[a-zA-Z0-9_-]+/gi)) {
    shortlinks.add(m[0]);
  }

  const results: SocialChannelCandidate[] = [];
  await Promise.all(
    [...shortlinks].slice(0, 4).map(async (shortUrl) => {
      const html = await fetchUrlTextSafe(shortUrl, 4000, MOBILE_SAFARI_UA);
      if (!html) return;
      const httpUrlMatch = html.match(/httpUrl\s*:\s*"([^"]+)"/i);
      if (httpUrlMatch?.[1]) {
        const unescaped = httpUrlMatch[1].replace(/\\\//g, '/').replace(/\\u0026/gi, '&');
        const extracted = extractSocialLinksFromText(unescaped, `${sourceLabel} (${shortUrl})`, 'CAO').filter(
          (c) => c.platform === 'SHOPEE'
        );
        results.push(...extracted);
      }
    })
  );

  return results;
}

async function discoverFromYouTubeAboutPage(
  stageName: string,
  tiktokHandle: string,
  realName: string
): Promise<{ candidates: SocialChannelCandidate[]; rawText: string }> {
  const searchQuery =
    stageName && stageName.toLowerCase() !== tiktokHandle
      ? `${stageName} ${tiktokHandle}`
      : stageName || tiktokHandle;
  if (!searchQuery) return { candidates: [], rawText: '' };

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const searchHtml = await fetchUrlTextSafe(searchUrl, 4500);
  if (!searchHtml) return { candidates: [], rawText: '' };

  const channelPaths = [
    ...new Set([...searchHtml.matchAll(/"canonicalBaseUrl":"(\/@[^"]+)"/g)].map((m) => m[1])),
  ];
  if (channelPaths.length === 0) return { candidates: [], rawText: '' };

  // Filter channel path that matches KOC name/handle tokens to avoid unrelated channels
  const kocTokens = stripVnAccents(`${tiktokHandle} ${stageName} ${realName}`)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !/^(official|review|channel|tiktok|vlog|daily)$/i.test(t));

  const matchedChannels = channelPaths.filter((ch) => {
    const cleanCh = stripVnAccents(decodeURIComponent(ch)).replace(/[^a-z0-9]/g, '');
    return kocTokens.some((tok) => cleanCh.includes(tok));
  });

  const targetChannel = matchedChannels[0];
  if (!targetChannel) return { candidates: [], rawText: '' };

  const aboutHtml = await fetchUrlTextSafe(`https://www.youtube.com${targetChannel}/about`, 4500);
  if (!aboutHtml) return { candidates: [], rawText: '' };

  const sourceLabel = `Liên kết chính thức trên kênh YouTube (${targetChannel})`;
  const candidates = extractSocialLinksFromText(aboutHtml, sourceLabel, 'CAO');
  const shopeeShortCands = await unrollShopeeShortlinks(aboutHtml, sourceLabel);
  candidates.push(...shopeeShortCands);

  return { candidates, rawText: aboutHtml };
}

function checkNameIdentityMatch(
  profileDisplayName: string,
  handle: string,
  tiktokHandle: string,
  stageName: string,
  realName: string
): boolean {
  const normProfile = stripVnAccents(profileDisplayName || '').replace(/[^a-z0-9\s]/g, ' ').trim();
  const normHandle = stripVnAccents(handle || '').replace(/[^a-z0-9]/g, '');
  const normTiktok = stripVnAccents(tiktokHandle || '').replace(/[^a-z0-9]/g, '');
  const normStage = stripVnAccents(stageName || '').replace(/[^a-z0-9\s]/g, ' ').trim();
  const normReal = stripVnAccents(realName || '').replace(/[^a-z0-9\s]/g, ' ').trim();

  if (normTiktok && normHandle === normTiktok) return true;
  if (normStage && normProfile && (normProfile.includes(normStage) || normStage.includes(normProfile))) {
    return true;
  }
  if (normReal && normProfile && (normProfile.includes(normReal) || normReal.includes(normProfile))) {
    return true;
  }

  const tokens = `${normStage} ${normReal}`
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !/^(official|review|channel|tiktok|beauty)$/i.test(t));

  if (tokens.length >= 2) {
    const matchedCount = tokens.filter((t) => normProfile.includes(t) || normHandle.includes(t)).length;
    if (matchedCount >= 2) return true;
  } else if (tokens.length === 1 && tokens[0].length >= 4) {
    if (normProfile.includes(tokens[0]) || normHandle.includes(tokens[0])) return true;
  }

  return false;
}

function parseFollowerCountFromText(text: string): number {
  if (!text) return 0;
  // Match patterns like "2.446.010 người theo dõi", "243K người theo dõi", "17,4K người theo dõi", "1,009 người theo dõi", "1.2M followers"
  const m = text.match(/([\d.,]+)\s*([kKmM]|triệu|nghìn|ngàn)?\s*(?:người theo dõi|followers|lượt thích)/i);
  if (!m) return 0;
  const rawNum = m[1];
  const suffix = (m[2] || '').toLowerCase();

  if (suffix === 'k' || suffix === 'nghìn' || suffix === 'ngàn') {
    const val = parseFloat(rawNum.replace(',', '.'));
    return Number.isFinite(val) ? Math.round(val * 1000) : 0;
  }
  if (suffix === 'm' || suffix === 'triệu') {
    const val = parseFloat(rawNum.replace(',', '.'));
    return Number.isFinite(val) ? Math.round(val * 1_000_000) : 0;
  }

  // Otherwise remove thousand separators (. or ,)
  const digitsOnly = rawNum.replace(/[.,]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isExplicitOfficialSource(sourceLabel: string): boolean {
  return (
    sourceLabel.includes('Bio') ||
    sourceLabel.includes('YouTube') ||
    sourceLabel.includes('danh bạ') ||
    sourceLabel.includes('Đồng bộ từ tài khoản Instagram')
  );
}

async function verifyLiveSocialCandidate(
  cand: SocialChannelCandidate,
  tiktokHandle: string,
  stageName: string,
  realName: string
): Promise<SocialChannelCandidate | null> {
  const store = getSharedCrawlerStore();
  return store.searchLimiter.run(async () => {
    try {
      const explicitSource = isExplicitOfficialSource(cand.sourceLabel);

      if (cand.platform === 'SHOPEE') {
        const bare = cand.handle.replace(/^@+/, '');
        const res = await fetch(
          `https://shopee.vn/api/v4/shop/get_shop_detail?username=${encodeURIComponent(bare)}`,
          {
            headers: {
              'User-Agent': MOBILE_SAFARI_UA,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(4000),
            cache: 'no-store',
          }
        );
        if (!res.ok) {
          return cand.sourceLabel.includes('danh bạ') ? cand : null;
        }
        const json: any = await res.json();
        if (json?.error !== 0 || !json?.data) {
          return null;
        }
        const d = json.data;
        const shopName = typeof d.name === 'string' ? d.name.trim() : bare;
        const followers = typeof d.follower_count === 'number' ? d.follower_count : 0;
        const items = typeof d.item_count === 'number' ? d.item_count : 0;
        const desc = typeof d.description === 'string' ? d.description : '';

        if (!explicitSource && items === 0 && followers < 20) {
          return null;
        }

        const isNameMatched =
          checkNameIdentityMatch(shopName, bare, tiktokHandle, stageName, realName) ||
          checkNameIdentityMatch(desc, bare, tiktokHandle, stageName, realName);

        if (!explicitSource && !isNameMatched && followers < 100) {
          return null;
        }

        return {
          ...cand,
          displayName: shopName,
          confidence: explicitSource || isNameMatched ? 'CAO' : 'TRUNG_BÌNH',
          evidence: `${followers.toLocaleString('vi-VN')} người theo dõi • ${items} sản phẩm`,
          isVerifiedLive: true,
          followerCount: followers,
        };
      }

      // INSTAGRAM, THREADS, FACEBOOK verification via OpenGraph SSR metadata
      const targetUrl =
        cand.platform === 'INSTAGRAM'
          ? `https://www.instagram.com/${cand.handle.replace(/^@+/, '')}/`
          : cand.platform === 'THREADS'
          ? `https://www.threads.net/@${cand.handle.replace(/^@+/, '')}`
          : cand.url;

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': OPENGRAPH_CRAWLER_UA,
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(4200),
        cache: 'no-store',
      });

      if (!res.ok) {
        return cand.sourceLabel.includes('danh bạ') ? cand : null;
      }

      const html = await res.text();
      const rawTitle = decodeHtmlEntities(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '');
      const ogTitle = decodeHtmlEntities(
        html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ||
          html.match(/content="([^"]+)"\s+property="og:title"/i)?.[1] ||
          ''
      );
      const ogDesc = decodeHtmlEntities(
        html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ||
          html.match(/content="([^"]+)"\s+property="og:description"/i)?.[1] ||
          ''
      );

      if (cand.platform === 'INSTAGRAM') {
        if (!ogTitle || rawTitle === 'Instagram' || rawTitle.includes('Page Not Found')) {
          return cand.sourceLabel.includes('danh bạ') ? cand : null;
        }
        const nameMatch = ogTitle.match(/^(.+?)\s*\(@[a-zA-Z0-9._]+\)/);
        const displayName = nameMatch ? nameMatch[1].trim() : ogTitle.split('•')[0].trim();
        const statsSnippet = ogDesc.split(/[–-]\s*Xem/i)[0].replace(/\s+/g, ' ').trim();
        const followers = parseFollowerCountFromText(statsSnippet);
        const isMatched = checkNameIdentityMatch(displayName, cand.handle, tiktokHandle, stageName, realName);

        // Filter out non-explicit handle guesses that have < 50 followers or 0 posts (random personal squats)
        if (!explicitSource && (followers < 50 || !isMatched)) {
          return null;
        }

        return {
          ...cand,
          displayName: displayName || stageName,
          confidence: explicitSource || (isMatched && followers >= 200) ? 'CAO' : 'TRUNG_BÌNH',
          evidence: statsSnippet || 'Tài khoản Instagram đang hoạt động',
          isVerifiedLive: true,
          followerCount: followers,
        };
      }

      if (cand.platform === 'THREADS') {
        if (
          !ogTitle ||
          rawTitle === 'Threads' ||
          rawTitle.includes('Đăng nhập') ||
          rawTitle.includes('Log in') ||
          res.url.includes('/login')
        ) {
          return cand.sourceLabel.includes('danh bạ') ? cand : null;
        }
        const nameMatch = ogTitle.match(/^(.+?)\s*\(@[a-zA-Z0-9._]+\)/);
        const displayName = nameMatch ? nameMatch[1].trim() : ogTitle.split('•')[0].trim();
        const statsSnippet = ogDesc
          .split(/\.?\s*Xem các cuộc trò chuyện/i)[0]
          .replace(/\s+/g, ' ')
          .trim();
        const followers = parseFollowerCountFromText(statsSnippet);
        const isMatched = checkNameIdentityMatch(displayName, cand.handle, tiktokHandle, stageName, realName);

        if (!explicitSource && (followers < 20 || !isMatched)) {
          return null;
        }

        return {
          ...cand,
          displayName: displayName || stageName,
          confidence: explicitSource || (isMatched && followers >= 100) ? 'CAO' : 'TRUNG_BÌNH',
          evidence: statsSnippet || 'Tài khoản Threads đang hoạt động',
          isVerifiedLive: true,
          followerCount: followers,
        };
      }

      if (cand.platform === 'FACEBOOK') {
        if (
          !ogTitle ||
          rawTitle === 'Facebook' ||
          ogTitle === 'Facebook' ||
          rawTitle.includes('Log Into Facebook') ||
          rawTitle.includes('Đăng nhập Facebook')
        ) {
          return cand.sourceLabel.includes('danh bạ') ? cand : null;
        }
        const displayName = ogTitle.trim();
        const cleanedDesc = ogDesc
          .replace(new RegExp(`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?\\s*`, 'i'), '')
          .replace(/\s+/g, ' ')
          .trim();
        const followerPhraseMatch = cleanedDesc.match(
          /([\d.,]+\s*(?:[kKmM]|triệu|nghìn)?\s*người theo dõi(?:\s*·\s*[\d.,]+\s*người đang nói về điều này)?)/i
        );
        const statsPart = followerPhraseMatch
          ? followerPhraseMatch[1]
          : cleanedDesc.split(/(?<=\D)\.\s+/)[0].slice(0, 95).trim();
        const followers = parseFollowerCountFromText(cleanedDesc);
        const isMatched = checkNameIdentityMatch(displayName, cand.handle, tiktokHandle, stageName, realName);

        // Filter out non-explicit handle guesses that have no public follower stats ("đang ở trên Facebook") or mismatched name
        if (!explicitSource && (followers < 50 || !isMatched)) {
          return null;
        }

        return {
          ...cand,
          displayName: displayName || realName || stageName,
          confidence: explicitSource || (isMatched && followers >= 500) ? 'CAO' : 'TRUNG_BÌNH',
          evidence: statsPart || 'Trang / Trang cá nhân Facebook đang hoạt động',
          isVerifiedLive: true,
          followerCount: followers,
        };
      }

      return cand;
    } catch {
      return cand.sourceLabel.includes('danh bạ') ? cand : null;
    }
  });
}

function buildHandleVariants(tiktokHandle: string, stageName: string, realName?: string): string[] {
  const cleanHandle = normalizeHandle(tiktokHandle).toLowerCase();
  const variants = new Set<string>();
  if (cleanHandle) {
    variants.add(cleanHandle);
    const stripped = cleanHandle
      .replace(
        /(?:_|-|\.)?(review|rv|official|vn|tiktok|channel|beauty|daily|vlog|blog|skincare|makeup|mom|baby|\d{2,4})$/i,
        ''
      )
      .replace(/^[._-]+|[._-]+$/g, '');
    if (stripped.length >= 4) {
      variants.add(stripped);
    }
    const noDots = cleanHandle.replace(/[._-]/g, '');
    if (noDots.length >= 4) {
      variants.add(noDots);
    }
    const withDots = cleanHandle.replace(/[_-]/g, '.');
    if (withDots.length >= 4) {
      variants.add(withDots);
    }
  }

  const slugStage = stripVnAccents(stageName || '')
    .replace(/\b(review|official|channel|tiktok)\b/gi, '')
    .replace(/[^a-z0-9]/g, '');
  if (slugStage.length >= 4) {
    variants.add(slugStage);
  }

  const slugStageDots = stripVnAccents(stageName || '')
    .replace(/\b(review|official|channel|tiktok)\b/gi, '')
    .trim()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('.');
  if (slugStageDots.length >= 5) {
    variants.add(slugStageDots);
  }

  const slugReal = stripVnAccents(realName || '').replace(/[^a-z0-9]/g, '');
  if (slugReal.length >= 5) {
    variants.add(slugReal);
  }

  return [...variants];
}

export async function discoverKocSocialChannels(params: {
  kocId?: string;
  tiktokHandle: string;
  stageName: string;
  realName?: string;
  phone?: string;
  bio?: string;
  existingChannels?: {
    shopeeChannel?: string;
    facebookChannel?: string;
    instagramChannel?: string;
    threadsChannel?: string;
  };
}): Promise<KocSocialDiscoveryResult> {
  const cleanHandle = normalizeHandle(params.tiktokHandle).toLowerCase();
  const stageName = (params.stageName || cleanHandle).trim();
  const realName = (params.realName || '').trim();

  const bucket: Record<SocialPlatformKey, Map<string, SocialChannelCandidate>> = {
    SHOPEE: new Map(),
    FACEBOOK: new Map(),
    INSTAGRAM: new Map(),
    THREADS: new Map(),
  };

  const addCandidate = (cand: SocialChannelCandidate) => {
    const key = cand.handle.toLowerCase().replace(/^@+/, '');
    if (!key || key.length < 2) return;
    const map = bucket[cand.platform];
    const existing = map.get(key);
    if (!existing) {
      map.set(key, cand);
      return;
    }
    const rank: Record<SocialConfidenceLevel, number> = { CAO: 3, TRUNG_BÌNH: 2, GỢI_Ý: 1 };
    if (rank[cand.confidence] > rank[existing.confidence]) {
      map.set(key, cand);
    }
  };

  // 1. Kênh đã lưu sẵn trong danh bạ KOC
  if (params.existingChannels?.shopeeChannel) {
    const h = extractHandleFromSocialInput('SHOPEE', params.existingChannels.shopeeChannel);
    addCandidate({
      platform: 'SHOPEE',
      handle: h,
      url: formatSocialChannelUrl('SHOPEE', params.existingChannels.shopeeChannel),
      displayName: stageName,
      confidence: 'CAO',
      sourceLabel: 'Đã lưu trong danh bạ KOC',
    });
  }
  if (params.existingChannels?.facebookChannel) {
    const h = extractHandleFromSocialInput('FACEBOOK', params.existingChannels.facebookChannel);
    addCandidate({
      platform: 'FACEBOOK',
      handle: h,
      url: formatSocialChannelUrl('FACEBOOK', params.existingChannels.facebookChannel),
      displayName: realName || stageName,
      confidence: 'CAO',
      sourceLabel: 'Đã lưu trong danh bạ KOC',
    });
  }
  if (params.existingChannels?.instagramChannel) {
    const h = extractHandleFromSocialInput('INSTAGRAM', params.existingChannels.instagramChannel);
    addCandidate({
      platform: 'INSTAGRAM',
      handle: h.startsWith('@') ? h : `@${h}`,
      url: formatSocialChannelUrl('INSTAGRAM', params.existingChannels.instagramChannel),
      displayName: stageName,
      confidence: 'CAO',
      sourceLabel: 'Đã lưu trong danh bạ KOC',
    });
  }
  if (params.existingChannels?.threadsChannel) {
    const h = extractHandleFromSocialInput('THREADS', params.existingChannels.threadsChannel);
    addCandidate({
      platform: 'THREADS',
      handle: h.startsWith('@') ? h : `@${h}`,
      url: formatSocialChannelUrl('THREADS', params.existingChannels.threadsChannel),
      displayName: stageName,
      confidence: 'CAO',
      sourceLabel: 'Đã lưu trong danh bạ KOC',
    });
  }

  // 2. Lấy tiểu sử (bio) & bioLink trực tiếp từ TikTok kết hợp tìm kiếm kênh YouTube chính thức song song
  let bioText = params.bio || '';
  let bioLinkUrl = '';

  const [liveProfile, youtubeDiscovery] = await Promise.all([
    cleanHandle ? fetchLiveTikTokPublicProfile(cleanHandle) : Promise.resolve(null),
    discoverFromYouTubeAboutPage(stageName, cleanHandle, realName),
  ]);

  if (liveProfile?.bio && !bioText) {
    bioText = liveProfile.bio;
  }
  if (liveProfile?.bioLink) {
    bioLinkUrl = liveProfile.bioLink;
  }

  const combinedBioSource = [bioText, bioLinkUrl].filter(Boolean).join('\n');
  if (combinedBioSource) {
    const bioCandidates = extractSocialLinksFromText(
      combinedBioSource,
      'Trích xuất trực tiếp từ tiểu sử TikTok (Bio)',
      'CAO'
    );
    bioCandidates.forEach(addCandidate);

    const shopeeFromBio = await unrollShopeeShortlinks(
      combinedBioSource,
      'Giải mã link rút gọn trong Bio TikTok'
    );
    shopeeFromBio.forEach(addCandidate);

    const bioHubMatches = [
      ...combinedBioSource.matchAll(
        /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:linktr\.ee|beacons\.ai|bio\.link|instabio\.cc|msha\.ke|lnk\.bio|passio\.eco|carrd\.co)\/[a-zA-Z0-9._/-]*/gi
      ),
    ].map((m) => m[0]);

    for (const hubUrl of [...new Set(bioHubMatches)].slice(0, 2)) {
      const hubHtml = await fetchUrlTextSafe(hubUrl, 4000);
      if (hubHtml) {
        extractSocialLinksFromText(hubHtml, `Trích xuất từ trang Bio (${hubUrl})`, 'CAO').forEach(
          addCandidate
        );
        const shopeeFromHub = await unrollShopeeShortlinks(hubHtml, `Trích xuất từ trang Bio (${hubUrl})`);
        shopeeFromHub.forEach(addCandidate);
      }
    }
  }

  // 3. Đưa toàn bộ ứng viên trích xuất từ trang giới thiệu kênh YouTube chính thức của KOC vào danh sách
  youtubeDiscovery.candidates.forEach(addCandidate);

  // 4. Sinh các biến thể @handle thông minh để đưa vào diện kiểm tra tồn tại thực tế (Live Probe)
  const handleVariants = buildHandleVariants(cleanHandle, stageName, realName);
  for (const variant of handleVariants.slice(0, 4)) {
    addCandidate({
      platform: 'SHOPEE',
      handle: variant,
      url: `https://shopee.vn/${variant}`,
      displayName: stageName,
      confidence: variant === cleanHandle ? 'TRUNG_BÌNH' : 'GỢI_Ý',
      sourceLabel:
        variant === cleanHandle
          ? 'Trùng username với kênh TikTok (@handle)'
          : 'Đối chiếu theo định danh KOC',
    });

    addCandidate({
      platform: 'FACEBOOK',
      handle: variant,
      url: `https://www.facebook.com/${variant}`,
      displayName: realName || stageName,
      confidence: variant === cleanHandle ? 'TRUNG_BÌNH' : 'GỢI_Ý',
      sourceLabel:
        variant === cleanHandle
          ? 'Trùng username với kênh TikTok (@handle)'
          : 'Đối chiếu theo định danh KOC',
    });

    addCandidate({
      platform: 'INSTAGRAM',
      handle: `@${variant}`,
      url: `https://www.instagram.com/${variant}`,
      displayName: stageName,
      confidence: variant === cleanHandle ? 'TRUNG_BÌNH' : 'GỢI_Ý',
      sourceLabel:
        variant === cleanHandle
          ? 'Trùng username với kênh TikTok (@handle)'
          : 'Đối chiếu theo định danh KOC',
    });

    addCandidate({
      platform: 'THREADS',
      handle: `@${variant}`,
      url: `https://www.threads.net/@${variant}`,
      displayName: stageName,
      confidence: variant === cleanHandle ? 'TRUNG_BÌNH' : 'GỢI_Ý',
      sourceLabel:
        variant === cleanHandle
          ? 'Trùng username với kênh TikTok (@handle)'
          : 'Đối chiếu theo định danh KOC',
    });
  }

  // Đồng bộ toàn bộ ứng viên Instagram sang Threads để kiểm tra tồn tại (vì Threads dùng chung username Instagram)
  for (const igCand of bucket.INSTAGRAM.values()) {
    const bareIg = igCand.handle.replace(/^@+/, '');
    addCandidate({
      platform: 'THREADS',
      handle: `@${bareIg}`,
      url: `https://www.threads.net/@${bareIg}`,
      displayName: igCand.displayName || stageName,
      confidence: igCand.confidence,
      sourceLabel: isExplicitOfficialSource(igCand.sourceLabel)
        ? 'Đồng bộ từ tài khoản Instagram của KOC'
        : igCand.sourceLabel,
    });
  }

  // 5. XÁC THỰC TỒN TẠI TRỰC TIẾP (LIVE PROFILE VERIFICATION) & SẮP XẾP ƯU TIÊN TÀI KHOẢN CHÍNH THỨC
  const verifyPlatformList = async (platform: SocialPlatformKey): Promise<SocialChannelCandidate[]> => {
    const rawList = [...bucket[platform].values()].slice(0, 6);
    const verifiedResults = await Promise.all(
      rawList.map((cand) => verifyLiveSocialCandidate(cand, cleanHandle, stageName, realName))
    );
    const valid = verifiedResults.filter((item): item is SocialChannelCandidate => item !== null);

    const rankOrder: Record<SocialConfidenceLevel, number> = { CAO: 3, TRUNG_BÌNH: 2, GỢI_Ý: 1 };
    valid.sort((a, b) => {
      if (a.isVerifiedLive !== b.isVerifiedLive) {
        return a.isVerifiedLive ? -1 : 1;
      }
      if (rankOrder[b.confidence] !== rankOrder[a.confidence]) {
        return rankOrder[b.confidence] - rankOrder[a.confidence];
      }
      const aExplicit = isExplicitOfficialSource(a.sourceLabel) ? 1 : 0;
      const bExplicit = isExplicitOfficialSource(b.sourceLabel) ? 1 : 0;
      if (bExplicit !== aExplicit) {
        return bExplicit - aExplicit;
      }
      return (b.followerCount || 0) - (a.followerCount || 0);
    });

    return valid.slice(0, 4);
  };

  const [shopeeVerified, facebookVerified, instagramVerified, threadsVerified] = await Promise.all([
    verifyPlatformList('SHOPEE'),
    verifyPlatformList('FACEBOOK'),
    verifyPlatformList('INSTAGRAM'),
    verifyPlatformList('THREADS'),
  ]);

  return {
    kocId: params.kocId,
    tiktokHandle: cleanHandle,
    stageName,
    scannedAt: new Date().toISOString(),
    bioExtracted: bioText || undefined,
    bioLinkExtracted: bioLinkUrl || undefined,
    candidatesByPlatform: {
      SHOPEE: shopeeVerified,
      FACEBOOK: facebookVerified,
      INSTAGRAM: instagramVerified,
      THREADS: threadsVerified,
    },
  };
}
