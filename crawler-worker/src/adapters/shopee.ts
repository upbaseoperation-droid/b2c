import { BROWSER_UA, fetchText } from '../core/http.ts';
import type { ParsedLink, PlatformAdapter, ScrapedContent } from '../core/types.ts';

interface ShopeeMediaInfo {
  video?: { caption?: string; duration?: number };
  count?: { likeCount?: number; commentCount?: number; viewCount?: number; shareCount?: number };
  userInfo?: { videoUserName?: string };
}

/** Bóc dữ liệu từ trang chia sẻ Shopee Video (Next.js, dữ liệu nằm trong __NEXT_DATA__). */
export function parseShopeeVideoHtml(html: string, link: ParsedLink): ScrapedContent {
  const raw = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!raw) {
    return {
      status: 'BLOCKED',
      statusDetail: 'Shopee không trả dữ liệu trang video. Có thể bị chặn IP, cần proxy.',
      source: 'shopee-share-page',
    };
  }
  const media: ShopeeMediaInfo | undefined = JSON.parse(raw)?.props?.pageProps?.mediaInfo;
  if (!media?.video) {
    return { status: 'UNAVAILABLE', statusDetail: 'Video đã bị xoá hoặc ẩn.', source: 'shopee-share-page' };
  }

  const handle = media.userInfo?.videoUserName?.toLowerCase() ?? null;
  const host = new URL(link.url).hostname.replace(/^sv\./, '');
  const count = media.count ?? {};
  return {
    status: 'LIVE',
    canonicalUrl: link.url,
    contentId: link.contentId ?? undefined,
    contentType: 'video',
    author: {
      handle,
      name: handle,
      profileUrl: handle ? `https://${host}/${handle}` : null,
      followers: null,
    },
    publishedAt: null,
    caption: (media.video.caption ?? '').trim(),
    durationSeconds: media.video.duration ? Math.round(media.video.duration / 1000) : null,
    metrics: {
      views: count.viewCount ?? null,
      likes: count.likeCount ?? null,
      comments: count.commentCount ?? null,
      shares: count.shareCount ?? null,
      saves: null,
    },
    hasProductLink: null,
    source: 'shopee-share-page',
    limitations: [
      'Trang chia sẻ Shopee Video không công khai lượt xem, ngày đăng và sản phẩm gắn kèm.',
      'Ngày air và GMV cần đối chiếu trong Shopee Affiliate / Seller Center.',
    ],
  };
}

export const shopeeAdapter: PlatformAdapter = {
  platform: 'shopee',

  async fetchContent(link: ParsedLink): Promise<ScrapedContent> {
    const page = await fetchText(link.url, { userAgent: BROWSER_UA });
    if (page.status === 404) {
      return { status: 'UNAVAILABLE', statusDetail: 'Video không tồn tại.', source: 'shopee-share-page' };
    }
    return parseShopeeVideoHtml(page.text, link);
  },
};
