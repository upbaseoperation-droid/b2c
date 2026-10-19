import { createHash } from 'node:crypto';
import { BROWSER_UA, fetchText } from '../core/http.ts';
import { unixSecondsToIso } from '../core/text.ts';
import type { ParsedLink, PlatformAdapter, ScrapedContent } from '../core/types.ts';

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
  anchors?: Array<{ keyword?: string; description?: string }>;
  isECVideo?: number | boolean;
  commerceInfo?: unknown;
  imagePost?: unknown;
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
    const anchors = Array.isArray(item.anchors) ? item.anchors : [];
    const kind = item.imagePost ? 'photo' : 'video';

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
      hasProductLink: anchors.length > 0 || Boolean(item.isECVideo) || Boolean(item.commerceInfo),
      productTitle: anchors[0]?.keyword || anchors[0]?.description || null,
      source: 'tiktok-ssr',
    };
  },
};
