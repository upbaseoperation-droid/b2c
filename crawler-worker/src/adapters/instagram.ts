import { fetchText, LINK_PREVIEW_UA } from '../core/http.ts';
import { decodeHtmlEntities, parseCompactNumber, readMeta } from '../core/text.ts';
import type { ParsedLink, PlatformAdapter, ScrapedContent } from '../core/types.ts';

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export interface InstagramDescription {
  likes: number | null;
  comments: number | null;
  handle: string | null;
  publishedAt: string | null;
  caption: string;
}

/**
 * Bóc thẻ meta description dạng:
 * `60M likes, 4M comments - world_record_egg on January 4, 2019: "caption..."`
 * Phần likes/comments có thể bị ẩn khi chủ bài tắt hiển thị lượt thích.
 */
export function parseInstagramDescription(description: string): InstagramDescription {
  const text = decodeHtmlEntities(description).trim();
  const likes = text.match(/([\d.,]+\s?[KMB]?)\s+likes?\b/i)?.[1] ?? null;
  const comments = text.match(/([\d.,]+\s?[KMB]?)\s+comments?\b/i)?.[1] ?? null;
  const byLine = text.match(/(?:^|-\s)([\w.]+) on ([A-Z][a-z]+) (\d{1,2}), (\d{4})/);
  let publishedAt: string | null = null;
  if (byLine) {
    const month = MONTHS[byLine[2].toLowerCase()];
    if (month) {
      publishedAt = `${byLine[4]}-${String(month).padStart(2, '0')}-${byLine[3].padStart(2, '0')}`;
    }
  }
  const captionMatch = text.match(/:\s*"([\s\S]*)"?\s*$/);
  const caption = captionMatch ? captionMatch[1].replace(/"\s*$/, '').trim() : '';
  return {
    likes: parseCompactNumber(likes),
    comments: parseCompactNumber(comments),
    handle: byLine ? byLine[1].toLowerCase() : null,
    publishedAt,
    caption,
  };
}

export const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',

  async fetchContent(link: ParsedLink): Promise<ScrapedContent> {
    const page = await fetchText(link.url, {
      userAgent: LINK_PREVIEW_UA,
      headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const html = page.text;
    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? '';

    if (page.status === 404 || /Page Not Found/i.test(title)) {
      return { status: 'UNAVAILABLE', statusDetail: 'Bài đã bị xoá, ẩn hoặc tài khoản riêng tư.', source: 'instagram-meta' };
    }
    if (page.status === 429) {
      return { status: 'BLOCKED', statusDetail: 'Instagram giới hạn tần suất truy cập (HTTP 429). Cần proxy hoặc thử lại sau.', source: 'instagram-meta' };
    }

    const description = readMeta(html, 'og:description') ?? readMeta(html, 'description');
    const ogUrl = readMeta(html, 'og:url');
    if (!description || !ogUrl) {
      return {
        status: 'BLOCKED',
        statusDetail:
          'Instagram trả trang đăng nhập thay vì bài đăng: link sai, bài đã xoá hoặc riêng tư, hoặc IP đang bị chặn. Mở link kiểm tra tay; nếu bài vẫn còn thì cần proxy.',
        source: 'instagram-meta',
      };
    }

    const parsed = parseInstagramDescription(description);
    const ownerFromUrl = ogUrl.match(/instagram\.com\/([\w.]+)\/(?:p|reel)\//)?.[1]?.toLowerCase() ?? null;
    const handle = parsed.handle ?? ownerFromUrl ?? link.handle;
    const ogTitle = readMeta(html, 'og:title') ?? '';
    const displayName = ogTitle.match(/^(.*?) on Instagram/)?.[1]?.trim() || null;

    return {
      status: 'LIVE',
      canonicalUrl: link.url,
      contentId: link.contentId ?? undefined,
      contentType: link.contentType ?? 'post',
      author: {
        handle,
        name: displayName,
        profileUrl: handle ? `https://www.instagram.com/${handle}/` : null,
        followers: null,
      },
      publishedAt: parsed.publishedAt,
      caption: parsed.caption,
      metrics: { views: null, likes: parsed.likes, comments: parsed.comments, shares: null, saves: null },
      hasProductLink: null,
      source: 'instagram-meta',
      limitations: [
        'Instagram không công khai lượt xem reel khi chưa đăng nhập.',
        'Không đọc được nhãn "Paid partnership" và link sản phẩm.',
        'Likes và bình luận là số làm tròn (VD 1.2K).',
      ],
    };
  },
};
