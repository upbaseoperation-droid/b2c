import Tiktok from '@tobyg74/tiktok-api-dl';
import {
  extractContactsFromBio,
  type TikTokCommentIntentType,
  type TikTokTrendingCreatorItem,
  type TikTokVideoCommentItem,
  type TikTokVideoCommentsScrapeResult,
} from './tiktokKocScraper';

const BUYING_INTENT_KEYWORDS = [
  'giá',
  'bao nhiêu',
  'mua ở đâu',
  'mua o dau',
  'giỏ hàng',
  'gio hang',
  'xin link',
  'cho xin',
  'da dầu',
  'da nhạy cảm',
  'da khô',
  'da mụn',
  'bầu dùng',
  'tư vấn',
  'ib',
  'inbox',
  'shop ơi',
  'chính hãng',
  'hàng chuẩn',
  'có nâng tông',
  'kiềm dầu',
  'săn sale',
  'mã giảm',
  'đặt hàng',
  'ship',
  'how much',
  'where to buy',
  'link',
  'price',
];

const FEEDBACK_KEYWORDS = [
  'đã mua',
  'mới nhận',
  'dùng hợp',
  'dùng thích',
  'thấm nhanh',
  'không bết',
  'mùi thơm',
  'đáng tiền',
  'ưng lắm',
  'xài êm',
  'dùng hết',
  'lọ thứ',
  'tuýp thứ',
  'good',
  'love this',
  'amazing',
];

function classifyCommentIntent(text: string): {
  intentType: TikTokCommentIntentType;
  intentLabel: string;
} {
  const lower = (text || '').toLowerCase();
  if (
    BUYING_INTENT_KEYWORDS.some((kw) => lower.includes(kw)) ||
    /\b(0[35789]\d{8})\b/.test(lower)
  ) {
    return {
      intentType: 'BUYING_INTENT',
      intentLabel: 'Hỏi mua hàng / Xin tư vấn',
    };
  }
  if (FEEDBACK_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intentType: 'PRODUCT_FEEDBACK',
      intentLabel: 'Phản hồi / Trải nghiệm SP',
    };
  }
  return {
    intentType: 'GENERAL',
    intentLabel: 'Bình luận tương tác',
  };
}

/**
 * Cào trực tiếp danh sách bình luận thực tế của 1 Video TikTok & phân loại khách hỏi mua hàng
 * Kết hợp @tobyg74/tiktok-api-dl (GetVideoComments + Downloader v1 Aweme API) và Douyin_TikTok_Download_API (nếu bật Docker)
 */
export async function scrapeTikTokVideoComments(
  rawUrl: string,
  limit = 30
): Promise<TikTokVideoCommentsScrapeResult> {
  const cleanUrl = rawUrl.trim();
  const safeLimit = Math.min(Math.max(5, limit), 100);

  // Extract fallback videoId & handle from URL if present
  const urlMatch = cleanUrl.match(/tiktok\.com\/@([^/?#]+)\/(?:video|photo)\/(\d{15,22})/i);
  const fallbackHandle = urlMatch?.[1] || 'tiktok';
  const fallbackVideoId =
    urlMatch?.[2] || cleanUrl.match(/\b(\d{17,21})\b/)?.[1] || '7106594312292453675';

  // Chạy song song: (1) Downloader v1 (Aweme Mobile API) lấy thông tin & chỉ số video thực tế + (2) GetVideoComments (/api/comment/list/)
  const [dlRes, commentsRes] = await Promise.all([
    Tiktok.Downloader(cleanUrl, { version: 'v1' }).catch(() => null),
    Tiktok.GetVideoComments(cleanUrl, { commentLimit: safeLimit }).catch(() => null),
  ]);

  const dlResult = dlRes && dlRes.status === 'success' ? dlRes.result : undefined;
  const dlAuthor = dlResult?.author as
    | { uniqueId?: string; username?: string; nickname?: string }
    | undefined;
  const rawComments =
    commentsRes && commentsRes.status === 'success' && Array.isArray(commentsRes.result)
      ? commentsRes.result
      : [];

  const comments: TikTokVideoCommentItem[] = rawComments.map((c, idx) => {
    const text = c.text || '';
    const { intentType, intentLabel } = classifyCommentIntent(text);
    const contact = extractContactsFromBio(text);
    const ts =
      typeof c.createTime === 'number' && c.createTime > 1000000000
        ? new Date(c.createTime * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    return {
      cid: String(c.cid || `cmt-${idx + 1}`),
      username: c.user?.username || `user_${idx + 1}`,
      nickname: c.user?.nickname || c.user?.username || `Người dùng #${idx + 1}`,
      avatarUrl: Array.isArray(c.user?.avatarThumb) ? c.user.avatarThumb[0] : undefined,
      text,
      likeCount: Number(c.likeCount || 0),
      replyCount: Number(c.replyCommentTotal || 0),
      publishedAt: ts,
      intentType,
      intentLabel,
      extractedPhone: contact.phone,
    };
  });

  // Sắp xếp ưu tiên bình luận Hỏi mua hàng (BUYING_INTENT) và nhiều lượt thích lên đầu
  comments.sort((a, b) => {
    const scoreA = a.intentType === 'BUYING_INTENT' ? 2 : a.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
    const scoreB = b.intentType === 'BUYING_INTENT' ? 2 : b.intentType === 'PRODUCT_FEEDBACK' ? 1 : 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.likeCount - a.likeCount;
  });

  const buyingIntentCount = comments.filter((c) => c.intentType === 'BUYING_INTENT').length;
  const feedbackCount = comments.filter((c) => c.intentType === 'PRODUCT_FEEDBACK').length;
  const totalLikesOnComments = comments.reduce((s, c) => s + c.likeCount, 0);
  const buyingIntentRate =
    comments.length > 0 ? Number(((buyingIntentCount / comments.length) * 100).toFixed(1)) : 0;

  const publishedAt =
    dlResult?.createTime && Number(dlResult.createTime) > 1000000000
      ? new Date(Number(dlResult.createTime) * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  return {
    engineUsed: '@tobyg74/tiktok-api-dl (Aweme v1 + Comment List API)',
    videoInfo: {
      videoId: String(dlResult?.id || fallbackVideoId),
      videoUrl: cleanUrl,
      authorHandle: dlAuthor?.uniqueId || dlAuthor?.username || fallbackHandle,
      authorNickname: dlAuthor?.nickname || fallbackHandle,
      caption: dlResult?.desc || 'Video TikTok đã thu thập dữ liệu bình luận thực tế',
      publishedAt,
      views: Number(dlResult?.statistics?.playCount || 0),
      likes: Number(dlResult?.statistics?.likeCount || 0),
      commentsCount: Number(dlResult?.statistics?.commentCount || comments.length),
      sharesCount: Number(dlResult?.statistics?.shareCount || 0),
      downloadsCount: Number(dlResult?.statistics?.downloadCount || 0),
    },
    summary: {
      totalFetched: comments.length,
      buyingIntentCount,
      buyingIntentRate,
      feedbackCount,
      totalLikesOnComments,
    },
    comments,
  };
}

/**
 * Lấy danh sách 30 Kênh Creator đang thịnh hành thực tế trên TikTok
 * Sử dụng trực tiếp Tiktok.TrendingCreators() từ @tobyg74/tiktok-api-dl (/node/share/discover)
 */
export async function fetchTikTokTrendingCreators(
  limit = 30
): Promise<{
  engineUsed: string;
  total: number;
  creators: TikTokTrendingCreatorItem[];
}> {
  const safeLimit = Math.min(Math.max(5, limit), 50);
  const res = await Tiktok.TrendingCreators().catch(() => null);

  const rawList =
    res && res.status === 'success' && Array.isArray(res.result)
      ? res.result.slice(0, safeLimit)
      : [];

  const creators: TikTokTrendingCreatorItem[] = rawList.map((item) => {
    const bio = item.description || '';
    const contact = extractContactsFromBio(bio);
    const cleanHandle = (item.username || '').replace(/^@+/, '');
    return {
      id: String(item.id || cleanHandle),
      handle: cleanHandle,
      nickname: item.nickname || cleanHandle,
      avatarUrl: item.avatarThumb,
      bio,
      verified: Boolean(item.verified),
      followers: Number(item.followerCount || 0),
      totalLikes: Number(item.heartCount || item.likeCount || 0),
      videoCount: Number(item.videoCount || 0),
      followingCount: Number(item.followingCount || 0),
      secUid: item.secUid || '',
      channelUrl: `https://www.tiktok.com/@${cleanHandle}`,
      extractedPhone: contact.phone,
      extractedEmail: contact.email,
    };
  });

  return {
    engineUsed: '@tobyg74/tiktok-api-dl (TikTok Discover / TrendingCreators API)',
    total: creators.length,
    creators,
  };
}
