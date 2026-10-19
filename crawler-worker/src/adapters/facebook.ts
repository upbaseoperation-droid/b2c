import { fetchText, LINK_PREVIEW_UA } from '../core/http.ts';
import { parseCompactNumber, readJsonNumber, readJsonString, readMeta, unixSecondsToIso } from '../core/text.ts';
import type { ContentType, ParsedLink, PlatformAdapter, ScrapedContent } from '../core/types.ts';

/**
 * og:title của video Facebook có dạng `2.8M views · 1.3K reactions | Caption | Tên trang`.
 */
export function parseFacebookOgTitle(title: string): {
  views: number | null;
  reactions: number | null;
  ownerName: string | null;
} {
  const parts = title.split(' | ').map((p) => p.trim());
  const stats = parts[0] ?? '';
  const views = parseCompactNumber(stats.match(/([\d.,]+\s?[KMB]?)\s+(?:views|lượt xem)/i)?.[1]);
  const reactions = parseCompactNumber(stats.match(/([\d.,]+\s?[KMB]?)\s+(?:reactions|cảm xúc)/i)?.[1]);
  const ownerName = parts.length >= 3 ? parts[parts.length - 1] : null;
  return { views, reactions, ownerName };
}

/** Bóc dữ liệu từ HTML trang bài/video Facebook (bản trả cho bot xem trước link). */
export function parseFacebookHtml(html: string, link: ParsedLink, finalUrl: string): ScrapedContent {
  const ogUrl = readMeta(html, 'og:url') ?? finalUrl;
  const ogTitle = readMeta(html, 'og:title');
  const ogDescription = readMeta(html, 'og:description') ?? '';

  if (!ogTitle || /\/login(\.php)?|checkpoint/.test(finalUrl)) {
    return {
      status: /\/login|checkpoint/.test(finalUrl) ? 'BLOCKED' : 'UNAVAILABLE',
      statusDetail: /\/login|checkpoint/.test(finalUrl)
        ? 'Facebook yêu cầu đăng nhập để xem bài này (bài riêng tư hoặc bị chặn IP).'
        : 'Bài đã bị xoá, ẩn hoặc chỉ bạn bè xem được.',
      source: 'facebook-html',
    };
  }

  const idFromUrl =
    ogUrl.match(/\/(?:reel|videos)\/(\d{6,})/)?.[1] ??
    ogUrl.match(/[?&]v=(\d{6,})/)?.[1] ??
    ogUrl.match(/\/posts\/([\w]+)/)?.[1] ??
    null;
  const contentId = idFromUrl ?? link.contentId;
  const contentType: ContentType = /\/reel\//.test(ogUrl) ? 'reel' : /\/videos\/|watch/.test(ogUrl) ? 'video' : link.contentType ?? 'post';

  // Số liệu video nằm trong khối feedback gắn với đúng video ID.
  const anchor = contentId ? html.indexOf(`"associated_video":{"is_live_streaming":false,"is_profile_video":false,"id":"${contentId}"`) : -1;
  const fromAnchor = anchor >= 0 ? anchor : 0;
  const titleStats = parseFacebookOgTitle(ogTitle);

  const views = readJsonNumber(html, 'video_view_count', fromAnchor) ?? readJsonNumber(html, 'play_count') ?? titleStats.views;
  const reactionsMatch = html.match(/"reaction_count":\{"count":(\d+)/);
  const reactions = reactionsMatch ? Number(reactionsMatch[1]) : titleStats.reactions;
  const comments = readJsonNumber(html, 'total_comment_count');
  const shareMatch = html.match(/"share_count":\{"count":(\d+)/) ?? html.match(/"share_count_reduced":"([\d.,KMB]+)"/);
  const shares = shareMatch ? parseCompactNumber(shareMatch[1]) : null;
  const publishTime = readJsonNumber(html, 'publish_time') ?? readJsonNumber(html, 'creation_time');
  const durationMs = readJsonNumber(html, 'playable_duration_in_ms');

  const pageMatch = html.match(/"owner_as_page":\{"id":"(\d+)","name":"((?:[^"\\]|\\.)*)"/);
  const ownerName = pageMatch ? safeJsonString(pageMatch[2]) : titleStats.ownerName;
  const vanity = readJsonString(html, 'vanity') ?? link.handle;
  const messageAt = html.indexOf('"message":{"text"');
  const caption = (messageAt >= 0 ? readJsonString(html, 'text', messageAt) : null) ?? ogDescription;
  const hasProductTag = /"comet_product_tag_feed_overlay_renderer":\{/.test(html) || /"product_item":\{/.test(html);

  return {
    status: 'LIVE',
    canonicalUrl: ogUrl.split('?')[0],
    contentId: contentId ?? undefined,
    contentType,
    author: {
      handle: vanity ? vanity.toLowerCase() : null,
      name: ownerName,
      profileUrl: vanity ? `https://www.facebook.com/${vanity}` : null,
      followers: null,
    },
    publishedAt: unixSecondsToIso(publishTime),
    caption: caption.trim(),
    durationSeconds: durationMs ? Math.round(durationMs / 1000) : null,
    metrics: { views, likes: reactions, comments, shares, saves: null },
    hasProductLink: hasProductTag ? true : null,
    source: 'facebook-html',
    limitations: [
      '"Likes" là tổng reactions (thích, yêu thích, haha...).',
      'Không đọc được số follower của trang.',
    ],
  };
}

function safeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

export const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',

  async fetchContent(link: ParsedLink): Promise<ScrapedContent> {
    const page = await fetchText(link.url, {
      userAgent: LINK_PREVIEW_UA,
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    if (page.status === 404) {
      return { status: 'UNAVAILABLE', statusDetail: 'Bài không tồn tại.', source: 'facebook-html' };
    }
    if (page.status >= 400) {
      return { status: 'BLOCKED', statusDetail: `Facebook trả HTTP ${page.status}.`, source: 'facebook-html' };
    }
    return parseFacebookHtml(page.text, link, page.finalUrl);
  },
};
