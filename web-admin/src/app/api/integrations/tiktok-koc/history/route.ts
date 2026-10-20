import { NextRequest, NextResponse } from 'next/server';
import { readRecord, updateRecord, RecordError } from '@/lib/server/sharedRecords';
import type {
  TikTokCompetitorKocResult,
  TikTokCompetitorProfileSummary,
  TikTokHashtagKocResult,
  TikTokScrapedKocResult,
  TikTokTrendingCreatorItem,
  TikTokVideoCommentsScrapeResult,
  TrendingKocCategoryKey,
} from '@/lib/tiktokKocScraper';
import type { LinkAirExpectation, LinkAirResult } from '@/lib/linkAirCheck';

export type CrawlerHistoryTabKey =
  | 'COMPETITOR_KOCS'
  | 'HASHTAG_DISCOVERY'
  | 'COMMENTS_AND_TRENDING'
  | 'CHANNEL_AND_VIDEO_TOOLS'
  | 'LINK_AIR_CHECK'
  | 'HANDLE_SCRAPE';

export interface TikTokCrawlerDailyHistoryItem {
  id: string;
  dateKey: string;
  tab: CrawlerHistoryTabKey;
  queryKey: string;
  queryLabel: string;
  rawInput: string;
  resultCount: number;
  summaryNote?: string;
  staffName: string;
  updatedAt: string;
  timeLabel: string;
  compProfile?: TikTokCompetitorProfileSummary | null;
  compResults?: TikTokCompetitorKocResult[];
  tagResults?: TikTokHashtagKocResult[];
  commentData?: TikTokVideoCommentsScrapeResult | null;
  trendingCategory?: TrendingKocCategoryKey;
  trendingCreators?: TikTokTrendingCreatorItem[];
  scrapedChannels?: TikTokScrapedKocResult[];
  linkAirResults?: LinkAirResult[];
  linkAirExpect?: LinkAirExpectation;
}

export type TikTokCrawlerWeeklyHistoryItem = TikTokCrawlerDailyHistoryItem;

interface WeeklyHistoryStore {
  dateKey: string;
  items: TikTokCrawlerDailyHistoryItem[];
}

const RECORD_KEY = 'tiktok-crawler-daily-history';
const WEEKLY_RETENTION_DAYS = 7;
const MAX_WEEKLY_ITEMS = 100;

function getVietnamDateAndTime(now = new Date()): { dateKey: string; timeLabel: string } {
  const vnDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const vnTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { dateKey: vnDate, timeLabel: vnTime };
}

function getPastDateKey(daysAgo: number, baseNow = new Date()): {
  dateKey: string;
  isoAtTime: (hh: string, mm: string) => string;
} {
  const d = new Date(baseNow.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const { dateKey } = getVietnamDateAndTime(d);
  return {
    dateKey,
    isoAtTime: (hh: string, mm: string) => `${dateKey}T${hh}:${mm}:00+07:00`,
  };
}

/**
 * Kiểm tra xem bản ghi lịch sử có nằm trong vòng 7 ngày gần nhất hay không
 */
function isWithinWeeklyWindow(
  item: TikTokCrawlerDailyHistoryItem,
  todayKey: string
): boolean {
  if (!item || !item.dateKey) return false;
  const todayMs = Date.parse(`${todayKey}T23:59:59+07:00`);
  const itemMs = Date.parse(`${item.dateKey}T12:00:00+07:00`);
  if (!Number.isFinite(todayMs) || !Number.isFinite(itemMs)) {
    return item.dateKey === todayKey;
  }
  const diffDays = (todayMs - itemMs) / (1000 * 60 * 60 * 24);
  return diffDays >= -1 && diffDays <= WEEKLY_RETENTION_DAYS;
}

function normalizeQueryKey(tab: CrawlerHistoryTabKey, rawInput: string): string {
  const clean = (rawInput || '').trim().toLowerCase();
  if (tab === 'COMPETITOR_KOCS' || tab === 'HANDLE_SCRAPE') {
    return clean.replace(/^@+/, '');
  }
  if (tab === 'HASHTAG_DISCOVERY') {
    return clean.replace(/^#+/, '');
  }
  return clean;
}

function buildSummaryNote(body: {
  tab: CrawlerHistoryTabKey;
  compResults?: TikTokCompetitorKocResult[];
  tagResults?: TikTokHashtagKocResult[];
  commentData?: TikTokVideoCommentsScrapeResult;
  trendingCreators?: TikTokTrendingCreatorItem[];
  scrapedChannels?: TikTokScrapedKocResult[];
  linkAirResults?: LinkAirResult[];
  summaryNote?: string;
}): string {
  if (body.summaryNote && body.summaryNote.trim()) {
    return body.summaryNote.trim();
  }
  if (body.compResults && body.compResults.length > 0) {
    const newCount = body.compResults.filter(
      (r) => !r.competitorCollaboration?.isAlreadyInUpbase
    ).length;
    const phoneCount = body.compResults.filter((r) => Boolean(r.channelProfile?.extractedPhone)).length;
    return `${newCount} KOC mới · ${body.compResults.length - newCount} đã có · ${phoneCount} có SĐT`;
  }
  if (body.tagResults && body.tagResults.length > 0) {
    const viralCount = body.tagResults.filter(
      (r) => (r.matchedHashtagVideo?.breakoutRatio || 0) >= 1
    ).length;
    const phoneCount = body.tagResults.filter((r) => Boolean(r.channelProfile?.extractedPhone)).length;
    return `${viralCount} video xu hướng · ${phoneCount} kênh có SĐT`;
  }
  if (body.commentData?.summary) {
    const s = body.commentData.summary;
    return `${s.buyingIntentCount} khách hỏi mua (${s.buyingIntentRate}%) · ${s.feedbackCount} phản hồi SP`;
  }
  if (body.trendingCreators && body.trendingCreators.length > 0) {
    const contactCount = body.trendingCreators.filter(
      (c) => Boolean(c.extractedPhone || c.extractedEmail)
    ).length;
    const verifiedCount = body.trendingCreators.filter((c) => c.verified).length;
    return `${contactCount} kênh có SĐT/Email · ${verifiedCount} tick xanh`;
  }
  if (body.scrapedChannels && body.scrapedChannels.length > 0) {
    const totalVideos = body.scrapedChannels.reduce(
      (sum, c) => sum + (c.recentVideos?.length || 0),
      0
    );
    return `Đã quét ${body.scrapedChannels.length} kênh · ${totalVideos} video gần nhất`;
  }
  if (body.linkAirResults && body.linkAirResults.length > 0) {
    const pass = body.linkAirResults.filter((r) => r.verdict === 'PASS').length;
    const review = body.linkAirResults.filter((r) => r.verdict === 'REVIEW').length;
    const fail = body.linkAirResults.filter((r) => r.verdict === 'FAIL').length;
    return `${pass} Đạt · ${review} Xem lại · ${fail} Không đạt`;
  }
  return '';
}

function buildInitialWeeklySeed(now = new Date()): TikTokCrawlerDailyHistoryItem[] {
  const d0 = getPastDateKey(0, now);
  const d1 = getPastDateKey(1, now);
  const d2 = getPastDateKey(2, now);
  const d3 = getPastDateKey(3, now);
  const d4 = getPastDateKey(4, now);

  const sampleCompResults: TikTokCompetitorKocResult[] = [
    {
      handle: 'megauriviu',
      channelUrl: 'https://www.tiktok.com/@megauriviu',
      sourceMode: 'LIVE_PUBLIC_AND_AFFILIATE',
      scrapedAt: d0.isoAtTime('09', '35'),
      channelProfile: {
        handle: 'megauriviu',
        channelUrl: 'https://www.tiktok.com/@megauriviu',
        nickname: 'Mega Uri Review',
        realName: 'Phạm Ngọc Hiếu An',
        bio: 'Review Dược mỹ phẩm & Skincare khoa học | LH: 0399675534',
        extractedPhone: '0399675534',
        extractedZalo: '0399675534',
        extractedEmail: 'phamngochieuan@gmail.com',
        followers: 680000,
        following: 145,
        totalLikes: 14500000,
        videoCount: 412,
        isVerified: true,
      },
      engagementMetrics: {
        sampleVideoCount: 24,
        avgViews: 95000,
        avgLikes: 4200,
        avgComments: 185,
        avgShares: 120,
        engagementRate: 4.7,
      },
      recentVideos: [],
      affiliateMetrics: {
        period: '30d',
        gmv30d: 180000000,
        gmvBestCase: 350000000,
        itemsSold: 1120,
        ordersCount: 980,
        aov: 320000,
        gpm: 189000,
        commissionRate: 12,
        ctr: 5.6,
        cvr: 2.8,
        gmvShareVideo: 70,
        gmvShareLive: 20,
        gmvShareProductCard: 10,
        topCategories: ['Dược mỹ phẩm & Skincare', 'Chăm sóc cá nhân'],
        shopRating: 4.9,
        cancellationRate: 1.4,
        followerGrowth30d: 14200,
        total30dViews: 1850000,
        audience: {
          femaleRatio: 82,
          maleRatio: 18,
          age18_24: 38,
          age25_34: 49,
          age35Plus: 13,
          topLocations: [{ city: 'Hà Nội', ratio: 42 }, { city: 'TP.HCM', ratio: 35 }],
        },
        topProducts: [],
        suggestedClassification: {
          salaryGrade: 'KL6',
          segment: 'Key Creator',
          tier: 'TIER_2_MACRO',
          tierLabel: 'Tier 2 (Macro)',
          rateCardVideo: 15000000,
          kocCategory: 'Personal care',
          tepKenh: 'Review Nữ',
        },
      },
      competitorCollaboration: {
        competitorHandle: 'larocheposayvn',
        competitorBrandName: 'La Roche-Posay Việt Nam',
        collaborationType: 'PAID_BOOKING',
        collaborationTypeLabel: 'Booking trả phí',
        competitorProductPromoted: 'Kem dưỡng phục hồi da La Roche-Posay Cicaplast Baume B5+',
        competitorVideoCount: 3,
        latestCollabVideoId: '7426198204118928658',
        latestCollabVideoUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
        latestCollabPublishedAt: d1.dateKey,
        latestCollabCaption: 'Da nhạy cảm kích ứng thời tiết thì cứ B5+ La Roche-Posay mà thoa nhé mọi người #larocheposayvn #cicaplastb5 #skincare',
        latestCollabViews: 148500,
        videoViews: 148500,
        videoLikes: 6820,
        estimatedCompetitorGmv: 64000000,
        estimatedCompetitorOrders: 210,
        isAlreadyInUpbase: true,
        suggestedUpbaseBrand: 'Babé',
      },
    },
    {
      handle: 'quinskincareholic',
      channelUrl: 'https://www.tiktok.com/@quinskincareholic',
      sourceMode: 'LIVE_PUBLIC_AND_AFFILIATE',
      scrapedAt: d0.isoAtTime('09', '35'),
      channelProfile: {
        handle: 'quinskincareholic',
        channelUrl: 'https://www.tiktok.com/@quinskincareholic',
        nickname: 'Quin Skincare Holic',
        bio: 'Skincare treatment & phục hồi da mụn | Zalo/SĐT: 0918442310',
        extractedPhone: '0918442310',
        extractedZalo: '0918442310',
        followers: 165000,
        following: 98,
        totalLikes: 4100000,
        videoCount: 286,
        isVerified: false,
      },
      engagementMetrics: {
        sampleVideoCount: 20,
        avgViews: 54000,
        avgLikes: 2950,
        avgComments: 140,
        avgShares: 85,
        engagementRate: 5.9,
      },
      recentVideos: [],
      affiliateMetrics: {
        period: '30d',
        gmv30d: 82000000,
        gmvBestCase: 145000000,
        itemsSold: 430,
        ordersCount: 390,
        aov: 285000,
        gpm: 162000,
        commissionRate: 12,
        ctr: 5.2,
        cvr: 3.1,
        gmvShareVideo: 80,
        gmvShareLive: 10,
        gmvShareProductCard: 10,
        topCategories: ['Dược mỹ phẩm & Skincare'],
        shopRating: 4.8,
        cancellationRate: 1.8,
        followerGrowth30d: 6400,
        total30dViews: 920000,
        audience: {
          femaleRatio: 86,
          maleRatio: 14,
          age18_24: 45,
          age25_34: 44,
          age35Plus: 11,
          topLocations: [{ city: 'TP.HCM', ratio: 46 }, { city: 'Hà Nội', ratio: 36 }],
        },
        topProducts: [],
        suggestedClassification: {
          salaryGrade: 'KL4',
          segment: 'Mid Creator',
          tier: 'TIER_2_MACRO',
          tierLabel: 'Tier 2 (Mid-Tier)',
          rateCardVideo: 4500000,
          kocCategory: 'Personal care',
          tepKenh: 'Beauty',
        },
      },
      competitorCollaboration: {
        competitorHandle: 'larocheposayvn',
        competitorBrandName: 'La Roche-Posay Việt Nam',
        collaborationType: 'AFFILIATE_CART',
        collaborationTypeLabel: 'Gắn giỏ Affiliate',
        competitorProductPromoted: 'Kem chống nắng kiềm dầu La Roche-Posay Anthelios UV Mune 400',
        competitorVideoCount: 2,
        latestCollabVideoId: '7425812039102941458',
        latestCollabVideoUrl: 'https://www.tiktok.com/@quinskincareholic/video/7425812039102941458',
        latestCollabPublishedAt: d2.dateKey,
        latestCollabCaption: 'Test độ kiềm dầu 8 tiếng của kem chống nắng vạch xanh La Roche-Posay dưới nắng Sài Gòn #kemchongnang #larocheposayvn',
        latestCollabViews: 92400,
        videoViews: 92400,
        videoLikes: 5120,
        estimatedCompetitorGmv: 38500000,
        estimatedCompetitorOrders: 115,
        isAlreadyInUpbase: false,
        suggestedUpbaseBrand: 'Rejuran',
      },
    },
  ];

  const sampleTagResults: TikTokHashtagKocResult[] = [
    {
      ...sampleCompResults[1],
      matchedHashtagVideo: {
        hashtag: '#kemchongnang',
        videoId: '7425812039102941458',
        videoUrl: 'https://www.tiktok.com/@quinskincareholic/video/7425812039102941458',
        publishedAt: d1.dateKey,
        captionSnippet: 'Top 4 kem chống nắng kiềm dầu ráo mịn cho da dầu mụn mùa này #kemchongnang #skincare #reviewlamdep',
        views: 128000,
        likes: 6400,
        breakoutRatio: 1.4,
      },
    },
    {
      ...sampleCompResults[0],
      matchedHashtagVideo: {
        hashtag: '#kemchongnang',
        videoId: '7426198204118928658',
        videoUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
        publishedAt: d2.dateKey,
        captionSnippet: 'Bôi đủ 2 ngón tay kem chống nắng mà không bị vón cục hay trắng bệch #kemchongnang #duocmypham',
        views: 164000,
        likes: 7850,
        breakoutRatio: 1.1,
      },
    },
  ];

  const sampleCommentData: TikTokVideoCommentsScrapeResult = {
    engineUsed: 'TikTok Comment API + SSR WAF Solver',
    nextCursor: 40,
    hasMore: true,
    videoInfo: {
      videoId: '7426198204118928658',
      videoUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      authorHandle: 'megauriviu',
      authorNickname: 'Mega Uri Review',
      caption: 'Review chi tiết bộ đôi phục hồi da nhạy cảm #skincare #duocmypham',
      publishedAt: d1.dateKey,
      views: 148500,
      likes: 6820,
      commentsCount: 185,
      sharesCount: 120,
      downloadsCount: 45,
    },
    summary: {
      totalFetched: 3,
      buyingIntentCount: 2,
      buyingIntentRate: 66.7,
      feedbackCount: 1,
      totalLikesOnComments: 84,
    },
    comments: [
      {
        cid: 'c-7426198201',
        username: 'linhnhi.skincare98',
        nickname: 'Linh Nhi',
        text: 'Da em đang bong tróc sau peel dùng tuýp này ngày mấy lần ạ? Shop tư vấn giúp em qua số 0983412098 nhé',
        likeCount: 42,
        replyCount: 3,
        publishedAt: d1.dateKey,
        intentType: 'BUYING_INTENT',
        intentLabel: 'Hỏi mua / Tư vấn',
        extractedPhone: '0983412098',
      },
      {
        cid: 'c-7426198202',
        username: 'thao_nguyen2204',
        nickname: 'Thảo Nguyên',
        text: 'Mình đặt ở giỏ hàng góc trái có được tặng kèm sample chống nắng không chị ơi?',
        likeCount: 28,
        replyCount: 2,
        publishedAt: d1.dateKey,
        intentType: 'BUYING_INTENT',
        intentLabel: 'Hỏi mua / Tư vấn',
      },
      {
        cid: 'c-7426198203',
        username: 'minhanh.beauty',
        nickname: 'Minh Anh',
        text: 'Đã mua theo chị Uri tuýp thứ 2 rồi, chất kem thấm nhanh không bị bí da chút nào.',
        likeCount: 14,
        replyCount: 1,
        publishedAt: d2.dateKey,
        intentType: 'PRODUCT_FEEDBACK',
        intentLabel: 'Phản hồi SP',
      },
    ],
  };

  const sampleTrendingCreators: TikTokTrendingCreatorItem[] = [
    {
      id: 'trend-megauriviu',
      handle: 'megauriviu',
      nickname: 'Mega Uri Review',
      bio: 'Review Dược mỹ phẩm & Skincare khoa học | LH: 0399675534',
      verified: true,
      followers: 680000,
      totalLikes: 14500000,
      videoCount: 412,
      followingCount: 145,
      secUid: '',
      channelUrl: 'https://www.tiktok.com/@megauriviu',
      extractedPhone: '0399675534',
      extractedEmail: 'phamngochieuan@gmail.com',
      categoryKey: 'SKINCARE',
      categoryLabel: 'Mỹ phẩm & Chăm sóc da (Skincare)',
      latestVideoId: '7426198204118928658',
      latestVideoUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      latestVideoCaption: 'Chu trình phục hồi hàng rào bảo vệ da 7 ngày cho da nhạy cảm #skincare',
      latestVideoPublishedAt: d1.dateKey,
      latestVideoViews: 148500,
      latestVideoLikes: 6820,
      engagementRate: 4.7,
    },
    {
      id: 'trend-quinskincareholic',
      handle: 'quinskincareholic',
      nickname: 'Quin Skincare Holic',
      bio: 'Skincare treatment & phục hồi da mụn | Zalo/SĐT: 0918442310',
      verified: false,
      followers: 165000,
      totalLikes: 4100000,
      videoCount: 286,
      followingCount: 98,
      secUid: '',
      channelUrl: 'https://www.tiktok.com/@quinskincareholic',
      extractedPhone: '0918442310',
      categoryKey: 'SKINCARE',
      categoryLabel: 'Mỹ phẩm & Chăm sóc da (Skincare)',
      latestVideoId: '7425812039102941458',
      latestVideoUrl: 'https://www.tiktok.com/@quinskincareholic/video/7425812039102941458',
      latestVideoCaption: 'So sánh 3 dòng serum B5 cấp ẩm phục hồi cho da dầu mụn #skincare #b5',
      latestVideoPublishedAt: d2.dateKey,
      latestVideoViews: 92400,
      latestVideoLikes: 5120,
      engagementRate: 5.9,
    },
  ];

  const sampleLinkAirResults: LinkAirResult[] = [
    {
      inputUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      platform: 'tiktok',
      contentType: 'video',
      contentId: '7426198204118928658',
      canonicalUrl: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      status: 'LIVE',
      statusDetail: 'Video đang hiển thị công khai',
      author: {
        handle: 'megauriviu',
        name: 'Mega Uri Review',
        profileUrl: 'https://www.tiktok.com/@megauriviu',
        followers: 680000,
      },
      publishedAt: d1.dateKey,
      caption: 'Review chi tiết kem dưỡng ẩm phục hồi da #clubclio #skincare',
      hashtags: ['#clubclio', '#skincare'],
      mentions: [],
      durationSeconds: 68,
      metrics: {
        views: 148500,
        likes: 6820,
        comments: 185,
        shares: 120,
        saves: 540,
      },
      hasProductLink: true,
      productTitle: 'Kem dưỡng ẩm & Cushion ClubClio Chính Hãng',
      checks: [
        { key: 'status', label: 'Trạng thái bài đăng', status: 'PASS', detail: 'Bài đăng công khai' },
        { key: 'product', label: 'Gắn giỏ hàng', status: 'PASS', detail: 'Đã gắn link sản phẩm TikTok Shop' },
      ],
      verdict: 'PASS',
      limitations: [],
      source: 'tiktok-live',
      fetchedAt: d1.isoAtTime('16', '20'),
      fromCache: false,
      durationMs: 620,
    },
  ];

  return [
    {
      id: `seed-${d0.dateKey}-COMPETITOR_KOCS-larocheposayvn`,
      dateKey: d0.dateKey,
      tab: 'COMPETITOR_KOCS',
      queryKey: 'larocheposayvn',
      queryLabel: '@larocheposayvn',
      rawInput: '@larocheposayvn',
      resultCount: sampleCompResults.length,
      summaryNote: '1 KOC mới · 1 đã có · 2 có SĐT',
      staffName: 'Lê Phương Thảo',
      updatedAt: d0.isoAtTime('09', '35'),
      timeLabel: '09:35',
      compProfile: {
        handle: 'larocheposayvn',
        channelUrl: 'https://www.tiktok.com/@larocheposayvn',
        brandName: 'La Roche-Posay Việt Nam',
        followers: 425000,
        totalLikes: 6800000,
        videoCount: 510,
        bio: 'Kênh TikTok chính thức của La Roche-Posay Việt Nam',
        category: 'Dược mỹ phẩm & Chăm sóc da',
        recommendedUpbaseBrands: ['Babé', 'Rejuran', 'Bye Bye Blemish'],
      },
      compResults: sampleCompResults,
    },
    {
      id: `seed-${d1.dateKey}-HASHTAG_DISCOVERY-kemchongnang`,
      dateKey: d1.dateKey,
      tab: 'HASHTAG_DISCOVERY',
      queryKey: 'kemchongnang',
      queryLabel: '#kemchongnang',
      rawInput: '#kemchongnang',
      resultCount: sampleTagResults.length,
      summaryNote: '2 video xu hướng · 2 kênh có SĐT',
      staffName: 'Lương Thị Như Quỳnh',
      updatedAt: d1.isoAtTime('15', '20'),
      timeLabel: '15:20',
      tagResults: sampleTagResults,
    },
    {
      id: `seed-${d2.dateKey}-COMMENTS_AND_TRENDING-7426198204118928658`,
      dateKey: d2.dateKey,
      tab: 'COMMENTS_AND_TRENDING',
      queryKey: '7426198204118928658',
      queryLabel: '@megauriviu · #928658',
      rawInput: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      resultCount: sampleCommentData.comments.length,
      summaryNote: '2 khách hỏi mua (66.7%) · 1 phản hồi SP',
      staffName: 'Phạm Thị Thu Hằng',
      updatedAt: d2.isoAtTime('11', '10'),
      timeLabel: '11:10',
      commentData: sampleCommentData,
    },
    {
      id: `seed-${d3.dateKey}-CHANNEL_AND_VIDEO_TOOLS-skincare`,
      dateKey: d3.dateKey,
      tab: 'CHANNEL_AND_VIDEO_TOOLS',
      queryKey: 'skincare',
      queryLabel: 'Mỹ phẩm & Chăm sóc da (Skincare)',
      rawInput: 'SKINCARE',
      resultCount: sampleTrendingCreators.length,
      summaryNote: '2 kênh có SĐT/Email · 1 tick xanh',
      staffName: 'Nguyễn Thị Ngọc Tâm',
      updatedAt: d3.isoAtTime('14', '45'),
      timeLabel: '14:45',
      trendingCategory: 'SKINCARE',
      trendingCreators: sampleTrendingCreators,
    },
    {
      id: `seed-${d4.dateKey}-LINK_AIR_CHECK-megauriviu`,
      dateKey: d4.dateKey,
      tab: 'LINK_AIR_CHECK',
      queryKey: 'megauriviu-7426198204118928658',
      queryLabel: 'Nghiệm thu 1 link air (@megauriviu)',
      rawInput: 'https://www.tiktok.com/@megauriviu/video/7426198204118928658',
      resultCount: sampleLinkAirResults.length,
      summaryNote: '1 Đạt · 0 Xem lại · 0 Không đạt',
      staffName: 'Hoàng Hải Long',
      updatedAt: d4.isoAtTime('16', '20'),
      timeLabel: '16:20',
      linkAirResults: sampleLinkAirResults,
      linkAirExpect: {
        handle: '@megauriviu',
        requireProductLink: true,
      },
    },
  ];
}

// Bộ nhớ dự phòng trong tiến trình khi môi trường không kết nối được Postgres
let inMemoryFallbackStore: WeeklyHistoryStore | null = null;

async function readWeeklyStore(): Promise<WeeklyHistoryStore> {
  const now = new Date();
  const { dateKey: todayKey } = getVietnamDateAndTime(now);
  const seedFallback: WeeklyHistoryStore = {
    dateKey: todayKey,
    items: buildInitialWeeklySeed(now),
  };

  try {
    const record = await readRecord<WeeklyHistoryStore>(RECORD_KEY, seedFallback);
    const rawItems =
      record.revision === 0 && (!record.data?.items || record.data.items.length === 0)
        ? seedFallback.items
        : Array.isArray(record.data?.items)
          ? record.data.items
          : [];
    const validWeeklyItems = rawItems
      .filter((item) => isWithinWeeklyWindow(item, todayKey))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      dateKey: todayKey,
      items: validWeeklyItems,
    };
  } catch {
    if (!inMemoryFallbackStore) {
      inMemoryFallbackStore = seedFallback;
    }
    inMemoryFallbackStore.items = inMemoryFallbackStore.items.filter((item) =>
      isWithinWeeklyWindow(item, todayKey)
    );
    return inMemoryFallbackStore;
  }
}

async function mutateHistoryWithRetry(
  mutator: (current: WeeklyHistoryStore, todayKey: string) => WeeklyHistoryStore
): Promise<WeeklyHistoryStore> {
  const now = new Date();
  const { dateKey: todayKey } = getVietnamDateAndTime(now);
  const seedFallback: WeeklyHistoryStore = {
    dateKey: todayKey,
    items: buildInitialWeeklySeed(now),
  };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const currentRecord = await readRecord<WeeklyHistoryStore>(RECORD_KEY, seedFallback);
      const updated = await updateRecord<WeeklyHistoryStore>(
        RECORD_KEY,
        seedFallback,
        currentRecord.revision,
        (data) => {
          const baseItems =
            currentRecord.revision === 0 && (!data?.items || data.items.length === 0)
              ? seedFallback.items
              : Array.isArray(data?.items)
                ? data.items
                : [];
          const normalized: WeeklyHistoryStore = {
            dateKey: todayKey,
            items: baseItems.filter((item) => isWithinWeeklyWindow(item, todayKey)),
          };
          return mutator(normalized, todayKey);
        }
      );
      return updated.data;
    } catch (err) {
      if (err instanceof RecordError && err.status === 409 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
        continue;
      }
      // Fallback sang in-memory nếu không ghi được DB
      if (!inMemoryFallbackStore) {
        inMemoryFallbackStore = seedFallback;
      }
      inMemoryFallbackStore = mutator(
        {
          dateKey: todayKey,
          items: inMemoryFallbackStore.items.filter((item) =>
            isWithinWeeklyWindow(item, todayKey)
          ),
        },
        todayKey
      );
      return inMemoryFallbackStore;
    }
  }
  return seedFallback;
}

export async function GET(req: NextRequest) {
  try {
    const store = await readWeeklyStore();
    const tabFilter = req.nextUrl.searchParams.get('tab') as CrawlerHistoryTabKey | null;
    const items = tabFilter
      ? store.items.filter((it) => it.tab === tabFilter)
      : store.items;

    return NextResponse.json({
      success: true,
      retentionDays: WEEKLY_RETENTION_DAYS,
      dateKey: store.dateKey,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không tải được lịch sử quét trong tuần.',
        items: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tab = body.tab as CrawlerHistoryTabKey;
    const rawInput = String(body.rawInput || '').trim();
    const queryLabel = String(body.queryLabel || rawInput).trim();
    const staffName = String(body.staffName || 'Nhân sự B2C').trim();

    if (!tab || !rawInput) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin phiên quét.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const { dateKey: todayKey, timeLabel } = getVietnamDateAndTime(now);
    const queryKey = normalizeQueryKey(tab, String(body.queryKey || rawInput));

    const compResults = Array.isArray(body.compResults)
      ? (body.compResults as TikTokCompetitorKocResult[])
      : undefined;
    const tagResults = Array.isArray(body.tagResults)
      ? (body.tagResults as TikTokHashtagKocResult[])
      : undefined;
    const commentData = body.commentData
      ? (body.commentData as TikTokVideoCommentsScrapeResult)
      : undefined;
    const trendingCreators = Array.isArray(body.trendingCreators)
      ? (body.trendingCreators as TikTokTrendingCreatorItem[])
      : undefined;
    const scrapedChannels = Array.isArray(body.scrapedChannels)
      ? (body.scrapedChannels as TikTokScrapedKocResult[])
      : undefined;
    const linkAirResults = Array.isArray(body.linkAirResults)
      ? (body.linkAirResults as LinkAirResult[])
      : undefined;
    const linkAirExpect = body.linkAirExpect
      ? (body.linkAirExpect as LinkAirExpectation)
      : undefined;

    const resultCount =
      compResults?.length ??
      tagResults?.length ??
      commentData?.comments?.length ??
      trendingCreators?.length ??
      scrapedChannels?.length ??
      linkAirResults?.length ??
      Number(body.resultCount || 0);

    if (resultCount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Phiên quét không có dữ liệu để lưu lịch sử.',
      });
    }

    const summaryNote = buildSummaryNote({
      tab,
      compResults,
      tagResults,
      commentData,
      trendingCreators,
      scrapedChannels,
      linkAirResults,
      summaryNote: body.summaryNote,
    });

    const store = await mutateHistoryWithRetry((current) => {
      const existingIdx = current.items.findIndex(
        (it) => it.tab === tab && it.queryKey === queryKey && it.dateKey === todayKey
      );

      const newItem: TikTokCrawlerDailyHistoryItem = {
        id:
          existingIdx >= 0
            ? current.items[existingIdx].id
            : `${todayKey}-${tab}-${queryKey}-${now.getTime()}`,
        dateKey: todayKey,
        tab,
        queryKey,
        queryLabel,
        rawInput,
        resultCount,
        summaryNote,
        staffName,
        updatedAt: now.toISOString(),
        timeLabel,
        compProfile: body.compProfile ?? undefined,
        compResults,
        tagResults,
        commentData,
        trendingCategory: body.trendingCategory ?? undefined,
        trendingCreators,
        scrapedChannels,
        linkAirResults,
        linkAirExpect,
      };

      const remaining = current.items.filter((_, idx) => idx !== existingIdx);
      const nextItems = [newItem, ...remaining].slice(0, MAX_WEEKLY_ITEMS);

      return {
        dateKey: todayKey,
        items: nextItems,
      };
    });

    return NextResponse.json({
      success: true,
      retentionDays: WEEKLY_RETENTION_DAYS,
      dateKey: store.dateKey,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không lưu được lịch sử quét trong tuần.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tab = searchParams.get('tab') as CrawlerHistoryTabKey | null;

    const store = await mutateHistoryWithRetry((current) => {
      let nextItems = current.items;
      if (id) {
        nextItems = current.items.filter((it) => it.id !== id);
      } else if (tab) {
        nextItems = current.items.filter((it) => it.tab !== tab);
      } else {
        nextItems = [];
      }
      return {
        dateKey: current.dateKey,
        items: nextItems,
      };
    });

    return NextResponse.json({
      success: true,
      retentionDays: WEEKLY_RETENTION_DAYS,
      dateKey: store.dateKey,
      items: store.items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Không xóa được lịch sử quét.',
      },
      { status: 500 }
    );
  }
}
