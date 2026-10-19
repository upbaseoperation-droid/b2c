import {
  CreatorSegment,
  KocCategory,
  KocItem,
  KocTier,
  SalaryGrade,
  TepKenh,
  TikTokVideoItem,
  getSalaryGradeFromRate,
  getSegmentFromSalaryGrade,
} from './types';
import { UPBASE_FULL_KOC_MASTER } from './kocMasterDataset';
import {
  discoverRealTikTokVideoUrlsByQuery,
  fetchTikTokHtmlWithWafBypass,
  inspectLiveTikTokVideoPage,
  type RealTikTokVideoAndAuthorDetail,
} from './tiktokOpenSourceEngines';

export interface TikTokChannelProfile {
  handle: string;
  channelUrl: string;
  nickname: string;
  realName?: string;
  avatarUrl?: string;
  bio: string;
  extractedPhone?: string;
  extractedZalo?: string;
  extractedEmail?: string;
  location?: string;
  followers: number;
  following: number;
  totalLikes: number;
  videoCount: number;
  isVerified: boolean;
}

export interface TikTokEngagementMetrics {
  sampleVideoCount: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number; // ER% = (avgLikes + avgComments + avgShares) / avgViews * 100
}

export interface TikTokAffiliateMetrics {
  period: '7d' | '30d' | '90d';
  gmv30d: number;
  gmvBestCase: number;
  itemsSold: number;
  ordersCount: number;
  aov: number;
  gpm: number;
  commissionRate: number;
  ctr: number;
  cvr: number;
  gmvShareVideo: number;
  gmvShareLive: number;
  gmvShareProductCard: number;
  topCategories: string[];
  shopRating: number;
  cancellationRate: number;
  followerGrowth30d: number;
  total30dViews: number;
  audience: {
    femaleRatio: number;
    maleRatio: number;
    age18_24: number;
    age25_34: number;
    age35Plus: number;
    topLocations: { city: string; ratio: number }[];
  };
  topProducts: {
    productId: string;
    productName: string;
    categoryName: string;
    gmv: number;
    salesCount: number;
    commissionRate: number;
    shopName?: string;
  }[];
  suggestedClassification: {
    salaryGrade: SalaryGrade;
    segment: CreatorSegment;
    tier: KocTier;
    tierLabel: string;
    rateCardVideo: number;
    kocCategory: KocCategory;
    tepKenh: TepKenh;
  };
}

export interface TikTokScrapedKocResult {
  handle: string;
  channelUrl: string;
  sourceMode: 'LIVE_PUBLIC_AND_AFFILIATE' | 'AFFILIATE_CREATOR_MARKETPLACE';
  scrapedAt: string;
  channelProfile: TikTokChannelProfile;
  engagementMetrics: TikTokEngagementMetrics;
  recentVideos: TikTokVideoItem[];
  affiliateMetrics: TikTokAffiliateMetrics;
  matchedHashtagVideo?: TikTokHashtagDiscoveredVideo;
  competitorCollaboration?: TikTokCompetitorCollaborationInfo;
}

/**
 * Chuẩn hóa danh sách đầu vào (link kênh TikTok, link video TikTok, hoặc @handle)
 * thành mảng các handle duy nhất (không có ký tự @).
 */
export function parseTikTokHandles(rawInput: string | string[]): string[] {
  const rawList = Array.isArray(rawInput)
    ? rawInput
    : rawInput.split(/[\r\n,;]+/);

  const seen = new Set<string>();
  const handles: string[] = [];

  for (const item of rawList) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const urlMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
    let candidate = '';
    if (urlMatch && urlMatch[1]) {
      candidate = urlMatch[1];
    } else {
      candidate = trimmed
        .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, '')
        .replace(/^@+/, '')
        .split(/[/?#\s]/)[0]
        .trim();
    }

    const clean = candidate.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (clean.length >= 2 && !seen.has(clean)) {
      seen.add(clean);
      handles.push(clean);
    }
  }

  return handles;
}

/**
 * Bóc tách Số điện thoại / Zalo và Email liên hệ thực tế từ tiểu sử (Bio) kênh TikTok.
 * Chỉ trả về khi trong Bio thực sự có SĐT hoặc Email, tuyệt đối không tự sinh số giả.
 */
export function extractContactsFromBio(bio: string): {
  phone?: string;
  zalo?: string;
  email?: string;
} {
  if (!bio) return {};

  const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;

  const phoneRegex = /(?:\+84|0)(?:[\s.-]*\d){9}\b/g;
  const matches = bio.match(phoneRegex);
  let phone: string | undefined;
  if (matches && matches.length > 0) {
    const normalized = matches[0].replace(/[^\d+]/g, '').replace(/^\+84/, '0');
    if (/^0[35789]\d{8}$/.test(normalized)) {
      phone = normalized;
    }
  }

  return {
    phone,
    zalo: phone,
    email,
  };
}

function inferCategoryAndTepKenh(
  rawBioOrCaption: string | undefined,
  existing?: KocItem
): { kocCategory: KocCategory; tepKenh: TepKenh } {
  if (existing) {
    return {
      kocCategory: existing.kocCategory || 'Personal care',
      tepKenh: existing.tepKenh || existing.creatorCategory || 'Review Nữ',
    };
  }
  const lower = (rawBioOrCaption || '').toLowerCase();
  if (lower.includes('mẹ') || lower.includes('bé') || lower.includes('mom') || lower.includes('baby')) {
    return { kocCategory: 'Mom and baby', tepKenh: 'Mẹ bé (bé)' };
  }
  if (lower.includes('gia dụng') || lower.includes('nhà') || lower.includes('elha')) {
    return { kocCategory: 'ELHA', tepKenh: 'Nhà cửa đời sống' };
  }
  if (lower.includes('thời trang') || lower.includes('fashion') || lower.includes('ootd')) {
    return { kocCategory: 'Fashion', tepKenh: 'Thời trang (review)' };
  }
  return { kocCategory: 'Personal care', tepKenh: 'Beauty' };
}

function classifyByRealFollowers(
  followers: number,
  existing?: KocItem
): {
  rateCardVideo: number;
  salaryGrade: SalaryGrade;
  segment: CreatorSegment;
  tier: KocTier;
  tierLabel: string;
} {
  if (existing && existing.rateCardVideo > 0) {
    const kl = existing.salaryGrade || getSalaryGradeFromRate(existing.rateCardVideo);
    return {
      rateCardVideo: existing.rateCardVideo,
      salaryGrade: kl,
      segment: existing.segment || getSegmentFromSalaryGrade(kl),
      tier: existing.tier,
      tierLabel: existing.tierLabel,
    };
  }

  let tier: KocTier = 'TIER_3_MICRO';
  let tierLabel = 'Tier 3 (Micro)';
  let salaryGrade: SalaryGrade = 'KL1';

  if (followers >= 1000000) {
    tier = 'TIER_1_CELEB';
    tierLabel = 'Tier 1 (Mega / Celeb)';
    salaryGrade = 'KL6';
  } else if (followers >= 300000) {
    tier = 'TIER_2_MACRO';
    tierLabel = 'Tier 2 (Macro)';
    salaryGrade = 'KL4';
  } else if (followers >= 100000) {
    tier = 'TIER_2_MACRO';
    tierLabel = 'Tier 2 (Mid-Tier)';
    salaryGrade = 'KL3';
  } else if (followers >= 20000) {
    tier = 'TIER_3_MICRO';
    tierLabel = 'Tier 3 (Micro)';
    salaryGrade = 'KL2';
  } else {
    tier = 'TIER_4_AFFILIATE';
    tierLabel = 'Tier 4 (Nano)';
    salaryGrade = 'KL1';
  }

  return {
    rateCardVideo: 0,
    salaryGrade,
    segment: getSegmentFromSalaryGrade(salaryGrade),
    tier,
    tierLabel,
  };
}

/**
 * Truy vấn trực tiếp trang kênh TikTok công khai (kèm tự động giải mã SlardarWAF SHA-256)
 * để lấy thông tin thực tế từ JSON Rehydration (__UNIVERSAL_DATA_FOR_REHYDRATION__).
 */
export async function fetchLiveTikTokPublicProfile(handle: string): Promise<{
  nickname?: string;
  bio?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  totalLikes?: number;
  videoCount?: number;
  isVerified?: boolean;
} | null> {
  try {
    const clean = handle.trim().replace(/^@+/, '');
    const url = `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
    const fetched = await fetchTikTokHtmlWithWafBypass(url);
    if (!fetched) return null;

    const scriptMatch = fetched.html.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );
    if (!scriptMatch || !scriptMatch[1]) return null;

    const json = JSON.parse(scriptMatch[1]);
    const userDetail = json?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;
    if (!userDetail?.user) return null;

    const u = userDetail.user;
    const s = userDetail.stats || {};

    return {
      nickname: typeof u.nickname === 'string' ? u.nickname : undefined,
      bio: typeof u.signature === 'string' ? u.signature : undefined,
      avatarUrl: typeof u.avatarLarger === 'string' ? u.avatarLarger : undefined,
      followers: typeof s.followerCount === 'number' ? s.followerCount : undefined,
      following: typeof s.followingCount === 'number' ? s.followingCount : undefined,
      totalLikes: typeof s.heartCount === 'number' ? s.heartCount : typeof s.heart === 'number' ? s.heart : undefined,
      videoCount: typeof s.videoCount === 'number' ? s.videoCount : undefined,
      isVerified: Boolean(u.verified),
    };
  } catch {
    return null;
  }
}

function buildScrapedResultFromRealData(
  cleanHandle: string,
  period: '7d' | '30d' | '90d',
  liveProfile: {
    nickname?: string;
    bio?: string;
    avatarUrl?: string;
    followers?: number;
    following?: number;
    totalLikes?: number;
    videoCount?: number;
    isVerified?: boolean;
  } | null,
  realInspectedVideos: RealTikTokVideoAndAuthorDetail[]
): TikTokScrapedKocResult {
  const existingKoc = UPBASE_FULL_KOC_MASTER.find(
    (k) => k.channelId.toLowerCase().replace(/^@+/, '') === cleanHandle
  );

  const firstVideoAuthor = realInspectedVideos[0]?.author;

  const followers =
    liveProfile?.followers ??
    firstVideoAuthor?.followers ??
    existingKoc?.followers ??
    0;

  const totalLikes =
    liveProfile?.totalLikes ??
    firstVideoAuthor?.totalLikes ??
    existingKoc?.totalLikes ??
    0;

  const videoCount =
    liveProfile?.videoCount ??
    firstVideoAuthor?.videoCount ??
    existingKoc?.videoCount ??
    realInspectedVideos.length;

  const following = liveProfile?.following ?? firstVideoAuthor?.following ?? 0;

  const nickname =
    liveProfile?.nickname ||
    firstVideoAuthor?.nickname ||
    existingKoc?.stageName ||
    cleanHandle;

  const bio =
    (liveProfile?.bio !== undefined ? liveProfile.bio : firstVideoAuthor?.bio) ??
    existingKoc?.bio ??
    '';

  const avatarUrl =
    liveProfile?.avatarUrl ||
    firstVideoAuthor?.avatarUrl ||
    existingKoc?.avatarUrl;

  const isVerified = Boolean(liveProfile?.isVerified || firstVideoAuthor?.isVerified);

  // Chỉ trích xuất SĐT / Email thực tế trong Bio (hoặc hồ sơ nội bộ UpBase nếu đã ký hợp đồng)
  const extracted = extractContactsFromBio(bio);
  const resolvedPhone = extracted.phone || existingKoc?.phone || undefined;
  const resolvedEmail = extracted.email || existingKoc?.email || undefined;

  const recentVideos: TikTokVideoItem[] = realInspectedVideos.map((v) => ({
    videoId: v.videoId,
    videoUrl: v.videoUrl,
    caption: v.caption,
    hashtags: v.hashtags,
    publishedAt: v.publishedAt,
    musicTitle: v.musicTitle,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    shares: v.shares,
    engagementRate: v.engagementRate,
    isAffiliate: v.hasCartAnchor,
    productName: v.cartAnchorTitle,
  }));

  const sampleCount = recentVideos.length;
  const avgViews =
    sampleCount > 0
      ? Math.round(recentVideos.reduce((s, v) => s + v.views, 0) / sampleCount)
      : existingKoc?.avgViews || 0;
  const avgLikes =
    sampleCount > 0
      ? Math.round(recentVideos.reduce((s, v) => s + v.likes, 0) / sampleCount)
      : existingKoc?.avgLikes || 0;
  const avgComments =
    sampleCount > 0
      ? Math.round(recentVideos.reduce((s, v) => s + v.comments, 0) / sampleCount)
      : existingKoc?.avgComments || 0;
  const avgShares =
    sampleCount > 0
      ? Math.round(recentVideos.reduce((s, v) => s + v.shares, 0) / sampleCount)
      : existingKoc?.avgShares || 0;

  const engagementRate =
    avgViews > 0
      ? Number((((avgLikes + avgComments + avgShares) / avgViews) * 100).toFixed(2))
      : existingKoc?.engagementRate || 0;

  const { kocCategory, tepKenh } = inferCategoryAndTepKenh(
    `${bio} ${recentVideos.map((v) => v.caption).join(' ')}`,
    existingKoc
  );
  const suggested = classifyByRealFollowers(followers, existingKoc);

  return {
    handle: cleanHandle,
    channelUrl: `https://www.tiktok.com/@${cleanHandle}`,
    sourceMode: 'LIVE_PUBLIC_AND_AFFILIATE',
    scrapedAt: new Date().toISOString(),
    channelProfile: {
      handle: cleanHandle,
      channelUrl: `https://www.tiktok.com/@${cleanHandle}`,
      nickname,
      realName: existingKoc?.realName || nickname,
      avatarUrl,
      bio,
      extractedPhone: resolvedPhone,
      extractedZalo: resolvedPhone,
      extractedEmail: resolvedEmail,
      location: existingKoc?.location,
      followers,
      following,
      totalLikes,
      videoCount,
      isVerified,
    },
    engagementMetrics: {
      sampleVideoCount: sampleCount,
      avgViews,
      avgLikes,
      avgComments,
      avgShares,
      engagementRate,
    },
    recentVideos,
    affiliateMetrics: {
      period,
      gmv30d: existingKoc?.recentRevenue || 0,
      gmvBestCase: existingKoc?.gmvBestCase || 0,
      itemsSold: existingKoc?.itemsSold || 0,
      ordersCount: 0,
      aov: existingKoc?.aov || 0,
      gpm: existingKoc?.gpm || 0,
      commissionRate: existingKoc?.tiktokAvgCommissionRate || 0,
      ctr: existingKoc?.tiktokAvgCtr || 0,
      cvr: existingKoc?.tiktokAvgCvr || 0,
      gmvShareVideo: existingKoc?.gmvShareVideo || 0,
      gmvShareLive: existingKoc?.gmvShareLive || 0,
      gmvShareProductCard: existingKoc?.gmvShareProductCard || 0,
      topCategories: existingKoc?.tiktokTopCategories || [kocCategory],
      shopRating: existingKoc?.tiktokShopRating || 0,
      cancellationRate: existingKoc?.tiktokCancellationRate || 0,
      followerGrowth30d: existingKoc?.tiktokFollowerGrowth30d || 0,
      total30dViews: existingKoc?.tiktokTotal30dViews || 0,
      audience: {
        femaleRatio: existingKoc?.femaleRatio || 0,
        maleRatio: existingKoc?.maleRatio || 0,
        age18_24: existingKoc?.age18_24 || 0,
        age25_34: existingKoc?.age25_34 || 0,
        age35Plus: existingKoc?.age35Plus || 0,
        topLocations: existingKoc?.tiktokAudienceLocations || [],
      },
      topProducts: [],
      suggestedClassification: {
        ...suggested,
        kocCategory,
        tepKenh,
      },
    },
  };
}

/**
 * Thu thập dữ liệu thực tế 100% của KOC từ TikTok (Hồ sơ kênh + Các video công khai thực tế).
 * Không tự sinh SĐT giả, không tự nội suy View/Tim giả.
 */
export async function scrapeTikTokCreatorData(
  rawHandle: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<TikTokScrapedKocResult> {
  const cleanHandle = rawHandle.trim().toLowerCase().replace(/^@+/, '');

  const [livePublic, discoveredChannelVideos] = await Promise.all([
    fetchLiveTikTokPublicProfile(cleanHandle),
    discoverRealTikTokVideoUrlsByQuery([`tiktok.com/@${cleanHandle}/video`], 15),
  ]);

  const ownVideoEntries = discoveredChannelVideos
    .filter((v) => v.handle === cleanHandle)
    .slice(0, 4);

  const inspectedVideos = (
    await Promise.all(ownVideoEntries.map((v) => inspectLiveTikTokVideoPage(v.videoUrl)))
  ).filter((v): v is RealTikTokVideoAndAuthorDetail => v !== null);

  return buildScrapedResultFromRealData(cleanHandle, period, livePublic, inspectedVideos);
}

/**
 * Chuyển đổi kết quả thu thập từ TikTok sang bản ghi KocItem chuẩn của Danh bạ KOC
 */
export function mapScrapedResultToKocItem(
  scraped: TikTokScrapedKocResult,
  existing?: KocItem
): KocItem {
  const { channelProfile, engagementMetrics, recentVideos, affiliateMetrics } = scraped;
  const cls = affiliateMetrics.suggestedClassification;
  const nowStr = new Date().toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (existing) {
    return {
      ...existing,
      channelId: channelProfile.handle,
      channelLink: channelProfile.channelUrl,
      stageName: existing.stageName || channelProfile.nickname,
      avatarUrl: channelProfile.avatarUrl || existing.avatarUrl,
      bio: channelProfile.bio,
      phone: existing.phone || channelProfile.extractedPhone || '',
      zalo: existing.zalo || channelProfile.extractedZalo || existing.phone || '',
      email: existing.email || channelProfile.extractedEmail,
      followers: channelProfile.followers,
      totalLikes: channelProfile.totalLikes,
      videoCount: channelProfile.videoCount,
      avgViews: engagementMetrics.avgViews,
      avgLikes: engagementMetrics.avgLikes,
      avgComments: engagementMetrics.avgComments,
      avgShares: engagementMetrics.avgShares,
      engagementRate: engagementMetrics.engagementRate,
      recentVideos,
      tiktokSellerSyncedAt: nowStr,
      metricsUpdatedAt: new Date().toISOString().slice(0, 10),
    };
  }

  return {
    id: `koc-tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channelId: channelProfile.handle,
    channelLink: channelProfile.channelUrl,
    stageName: channelProfile.nickname,
    realName: channelProfile.realName || channelProfile.nickname,
    avatarUrl: channelProfile.avatarUrl,
    tier: cls.tier,
    tierLabel: cls.tierLabel,
    salaryGrade: cls.salaryGrade,
    segment: cls.segment,
    tepKenh: cls.tepKenh,
    creatorCategory: cls.tepKenh,
    kocCategory: cls.kocCategory,
    niche: affiliateMetrics.topCategories.join(', '),
    followers: channelProfile.followers,
    avgViews: engagementMetrics.avgViews,
    rateCardVideo: cls.rateCardVideo,
    bookingFormat: 'Booking Video KOC',
    platforms: ['TIKTOK'],
    tiktokChannel: channelProfile.channelUrl,
    phone: channelProfile.extractedPhone || '',
    zalo: channelProfile.extractedZalo || '',
    email: channelProfile.extractedEmail,
    location: channelProfile.location || '',
    cccd: '',
    bankName: '',
    bankAccount: '',
    bio: channelProfile.bio,
    totalLikes: channelProfile.totalLikes,
    videoCount: channelProfile.videoCount,
    avgLikes: engagementMetrics.avgLikes,
    avgComments: engagementMetrics.avgComments,
    avgShares: engagementMetrics.avgShares,
    engagementRate: engagementMetrics.engagementRate,
    recentVideos,
    metricsUpdatedAt: new Date().toISOString().slice(0, 10),
    tiktokSellerSyncedAt: nowStr,
    tiktokAccountHealth: 'TỐT',
    statusKoc: 'SẴN_SÀNG',
    reliabilityScore: 9.0,
  };
}

export interface TikTokHashtagDiscoveredVideo {
  hashtag: string;
  videoId: string;
  videoUrl: string;
  publishedAt: string;
  captionSnippet: string;
  views: number;
  likes: number;
  breakoutRatio: number;
}

export interface TikTokHashtagKocResult extends TikTokScrapedKocResult {
  matchedHashtagVideo: TikTokHashtagDiscoveredVideo;
}

/**
 * Thu thập danh sách KOC thực tế đang có video gắn Hashtag hoặc Từ khóa ngách (100% dữ liệu thực từ TikTok).
 */
export async function discoverTikTokKocsByHashtag(
  rawHashtagOrKeyword: string,
  options?: {
    period?: '7d' | '30d' | '90d';
    limit?: number;
  }
): Promise<{
  hashtag: string;
  tagPageUrl: string;
  totalDiscovered: number;
  results: TikTokHashtagKocResult[];
}> {
  const period = options?.period || '30d';
  const limit = Math.min(Math.max(options?.limit || 12, 1), 25);

  const cleanKeyword = rawHashtagOrKeyword.replace(/^#+/, '').trim();
  const cleanTag = cleanKeyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_]/g, '');

  const effectiveTag = cleanTag || 'kemchongnang';
  const tagPageUrl = `https://www.tiktok.com/tag/${encodeURIComponent(effectiveTag)}`;

  // 1. Tìm danh sách link video TikTok thực tế theo từ khóa / hashtag
  const searchQueries = [
    `tiktok ${cleanKeyword} review`,
    `tiktok #${effectiveTag}`,
  ];
  const rawDiscovered = await discoverRealTikTokVideoUrlsByQuery(searchQueries, limit * 3);

  // Gom theo từng KOC duy nhất
  const uniqueByHandle = new Map<string, { handle: string; videoId: string; videoUrl: string }>();
  for (const item of rawDiscovered) {
    if (!uniqueByHandle.has(item.handle)) {
      uniqueByHandle.set(item.handle, item);
    }
    if (uniqueByHandle.size >= limit + 4) break;
  }

  const candidateEntries = [...uniqueByHandle.values()];
  const results: TikTokHashtagKocResult[] = [];

  // 2. Truy vấn trực tiếp từng trang video trên TikTok (vượt WAF Slardar) để lấy cả hồ sơ KOC + chỉ số thực của video
  const chunkSize = 5;
  for (let i = 0; i < candidateEntries.length && results.length < limit; i += chunkSize) {
    const chunk = candidateEntries.slice(i, i + chunkSize);
    const inspectedChunk = await Promise.all(
      chunk.map((entry) => inspectLiveTikTokVideoPage(entry.videoUrl))
    );

    for (const inspected of inspectedChunk) {
      if (!inspected || results.length >= limit) continue;

      const baseResult = buildScrapedResultFromRealData(
        inspected.author.handle,
        period,
        null,
        [inspected]
      );

      const followers = Math.max(1, baseResult.channelProfile.followers);
      const breakoutRatio = Number((inspected.views / followers).toFixed(2));

      results.push({
        ...baseResult,
        matchedHashtagVideo: {
          hashtag: `#${effectiveTag}`,
          videoId: inspected.videoId,
          videoUrl: inspected.videoUrl,
          publishedAt: inspected.publishedAt,
          captionSnippet: inspected.caption || `Video gắn thẻ #${effectiveTag}`,
          views: inspected.views,
          likes: inspected.likes,
          breakoutRatio,
        },
      });
    }
  }

  results.sort(
    (a, b) =>
      b.matchedHashtagVideo.views - a.matchedHashtagVideo.views ||
      b.matchedHashtagVideo.breakoutRatio - a.matchedHashtagVideo.breakoutRatio
  );

  return {
    hashtag: `#${effectiveTag}`,
    tagPageUrl,
    totalDiscovered: results.length,
    results,
  };
}

/**
 * Xuất kết quả thu thập KOC TikTok ra chuỗi CSV (có BOM UTF-8 để mở trực tiếp trên Excel)
 */
export function buildScrapedKocsCsv(results: TikTokScrapedKocResult[]): string {
  const headers = [
    'ID Kênh (@handle)',
    'Tên kênh TikTok',
    'Link kênh',
    'Tiểu sử (Bio)',
    'SĐT / Zalo (tách từ Bio)',
    'Email (tách từ Bio)',
    'Lượt theo dõi',
    'Tổng lượt thích',
    'Tổng số video',
    'View TB (video thực tế)',
    'Tim TB',
    'Bình luận TB',
    'Chia sẻ TB',
    'Tỷ lệ tương tác ER (%)',
    'Video gần nhất #1 (Link)',
    'Video gần nhất #1 (Caption)',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map((r) => {
    const p = r.channelProfile;
    const e = r.engagementMetrics;
    const v1 = r.recentVideos[0];
    return [
      `@${p.handle}`,
      p.nickname,
      p.channelUrl,
      p.bio,
      p.extractedPhone || '',
      p.extractedEmail || '',
      p.followers,
      p.totalLikes,
      p.videoCount,
      e.avgViews,
      e.avgLikes,
      e.avgComments,
      e.avgShares,
      e.engagementRate,
      v1?.videoUrl || '',
      v1?.caption || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return `\uFEFF${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;
}

export interface TikTokCompetitorCollaborationInfo {
  competitorHandle: string;
  competitorBrandName: string;
  collaborationType: 'AFFILIATE_CART' | 'PAID_BOOKING' | 'SEEDING_FOC';
  collaborationTypeLabel: string;
  competitorProductPromoted: string;
  competitorVideoCount: number;
  latestCollabVideoId: string;
  latestCollabVideoUrl: string;
  latestCollabPublishedAt: string;
  latestCollabCaption: string;
  latestCollabViews: number;
  estimatedCompetitorGmv: number;
  estimatedCompetitorOrders: number;
  isAlreadyInUpbase: boolean;
  suggestedUpbaseBrand: string;
}

export interface TikTokCompetitorProfileSummary {
  handle: string;
  channelUrl: string;
  brandName: string;
  followers: number;
  totalLikes: number;
  videoCount: number;
  bio: string;
  category: string;
  recommendedUpbaseBrands: string[];
}

export interface TikTokCompetitorKocResult extends TikTokScrapedKocResult {
  competitorCollaboration: TikTokCompetitorCollaborationInfo;
}

const COMPETITOR_PRESET_CATALOG: Record<
  string,
  {
    brandName: string;
    searchKeyword: string;
    category: string;
    recommendedUpbaseBrands: string[];
  }
> = {
  larocheposayvn: {
    brandName: 'La Roche-Posay Việt Nam',
    searchKeyword: 'kem chống nắng la roche posay',
    category: 'Dược mỹ phẩm & Chăm sóc da',
    recommendedUpbaseBrands: ['Rejuran', 'Bye Bye Blemish', 'Ziaja Intimate'],
  },
  anessavietnam: {
    brandName: 'Anessa Official Vietnam',
    searchKeyword: 'kem chống nắng anessa',
    category: 'Chăm sóc da & Chống nắng',
    recommendedUpbaseBrands: ['ClubClio', 'Rejuran', "L'Occitane Việt Nam"],
  },
  romand_vn: {
    brandName: 'Rom&nd Vietnam Official',
    searchKeyword: 'son romand bảng màu',
    category: 'Trang điểm (Makeup)',
    recommendedUpbaseBrands: ['ClubClio', '4PM', 'Peripera'],
  },
  cocoonvietnam: {
    brandName: 'Cocoon Vietnam',
    searchKeyword: 'tẩy da chết cocoon',
    category: 'Chăm sóc cơ thể & Tóc thuần chay',
    recommendedUpbaseBrands: ["L'Occitane Việt Nam", 'Cindy Bloom', 'Mine'],
  },
  skin1004_vietnam: {
    brandName: 'SKIN1004 Vietnam',
    searchKeyword: 'rau má skin1004',
    category: 'Chăm sóc da nhạy cảm',
    recommendedUpbaseBrands: ['Rejuran', 'Bye Bye Blemish', 'ClubClio'],
  },
  cetaphilvietnam: {
    brandName: 'Cetaphil Vietnam',
    searchKeyword: 'sữa rửa mặt cetaphil',
    category: 'Mẹ & Bé / Chăm sóc da dịu nhẹ',
    recommendedUpbaseBrands: ['Kutieskin', 'Royal Ausnz', 'EUPC'],
  },
  ceravevietnam: {
    brandName: 'CeraVe Vietnam',
    searchKeyword: 'sữa rửa mặt cerave',
    category: 'Dược mỹ phẩm & Chăm sóc da',
    recommendedUpbaseBrands: ['Rejuran', 'Kutieskin', 'Bye Bye Blemish'],
  },
  lorealparis_vn: {
    brandName: "L'Oréal Paris Vietnam",
    searchKeyword: 'nước tẩy trang loreal',
    category: 'Mỹ phẩm & Chăm sóc cá nhân',
    recommendedUpbaseBrands: ['ClubClio', 'Rejuran', "L'Occitane Việt Nam"],
  },
};

/**
 * Quét danh sách các KOC thực tế đang lên video review / gắn thẻ Kênh hoặc Thương hiệu Đối thủ (100% dữ liệu thực từ TikTok).
 */
export async function discoverCompetitorKocs(
  rawCompetitorInput: string,
  options?: {
    period?: '7d' | '30d' | '90d';
    limit?: number;
    targetUpbaseBrand?: string;
  }
): Promise<{
  competitorProfile: TikTokCompetitorProfileSummary;
  totalDiscovered: number;
  newOpportunityCount: number;
  alreadyInUpbaseCount: number;
  results: TikTokCompetitorKocResult[];
}> {
  const period = options?.period || '30d';
  const limit = Math.min(Math.max(options?.limit || 12, 1), 25);

  const parsedHandles = parseTikTokHandles(rawCompetitorInput);
  const cleanCompetitorHandle = (
    parsedHandles[0] ||
    rawCompetitorInput
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9._-]/g, '') ||
    'larocheposayvn'
  ).replace(/^\.+|\.+$/g, '');

  const presetKey = Object.keys(COMPETITOR_PRESET_CATALOG).find(
    (k) =>
      cleanCompetitorHandle.includes(k) ||
      k.includes(cleanCompetitorHandle.replace(/[._-]/g, ''))
  );
  const preset = presetKey ? COMPETITOR_PRESET_CATALOG[presetKey] : undefined;

  const cleanSearchBrand =
    preset?.searchKeyword ||
    rawCompetitorInput
      .replace(/^@+/, '')
      .replace(/\b(official|vietnam|vn|store|shop)\b/gi, '')
      .trim() ||
    cleanCompetitorHandle;

  // 1. Chạy song song: lấy hồ sơ thực của kênh đối thủ VÀ tìm các video KOC nhắc tới đối thủ
  const [liveCompProfile, compOwnVideos, rawDiscoveredVideos] = await Promise.all([
    fetchLiveTikTokPublicProfile(cleanCompetitorHandle),
    discoverRealTikTokVideoUrlsByQuery([`tiktok.com/@${cleanCompetitorHandle}/video`], 5),
    discoverRealTikTokVideoUrlsByQuery(
      [
        `tiktok ${cleanSearchBrand} review`,
        `tiktok review ${cleanSearchBrand} chính hãng`,
      ],
      limit * 4
    ),
  ]);

  // Nếu trang profile @competitor chưa trả về số liệu (do chỉ mở trên trang video), lấy từ 1 video thực của chính kênh đối thủ
  let compVideoAuthor: RealTikTokVideoAndAuthorDetail['author'] | undefined;
  if (!liveCompProfile?.followers) {
    const ownVideo = compOwnVideos.find((v) => v.handle === cleanCompetitorHandle);
    if (ownVideo) {
      const inspectedOwn = await inspectLiveTikTokVideoPage(ownVideo.videoUrl);
      if (inspectedOwn?.author) {
        compVideoAuthor = inspectedOwn.author;
      }
    }
  }

  const competitorBrandName =
    liveCompProfile?.nickname ||
    compVideoAuthor?.nickname ||
    preset?.brandName ||
    cleanCompetitorHandle;

  const competitorProfile: TikTokCompetitorProfileSummary = {
    handle: cleanCompetitorHandle,
    channelUrl: `https://www.tiktok.com/@${cleanCompetitorHandle}`,
    brandName: competitorBrandName,
    followers: liveCompProfile?.followers ?? compVideoAuthor?.followers ?? 0,
    totalLikes: liveCompProfile?.totalLikes ?? compVideoAuthor?.totalLikes ?? 0,
    videoCount: liveCompProfile?.videoCount ?? compVideoAuthor?.videoCount ?? 0,
    bio:
      liveCompProfile?.bio ||
      compVideoAuthor?.bio ||
      `Kênh TikTok @${cleanCompetitorHandle}`,
    category: preset?.category || 'Mỹ phẩm & Chăm sóc cá nhân',
    recommendedUpbaseBrands: preset?.recommendedUpbaseBrands || [],
  };

  // 2. Gom nhóm các video thực của KOC bên thứ ba (loại trừ video đăng bởi chính kênh đối thủ)
  const compactBrandTag = cleanCompetitorHandle.replace(/[._-]/g, '');
  const groupedByKoc = new Map<
    string,
    Array<{ handle: string; videoId: string; videoUrl: string }>
  >();

  for (const item of rawDiscoveredVideos) {
    if (
      item.handle === cleanCompetitorHandle ||
      item.handle.includes(compactBrandTag)
    ) {
      continue;
    }
    const list = groupedByKoc.get(item.handle) || [];
    list.push(item);
    groupedByKoc.set(item.handle, list);
  }

  const upbaseHandleSet = new Set(
    UPBASE_FULL_KOC_MASTER.map((k) => k.channelId.toLowerCase().replace(/^@+/, ''))
  );

  const kocEntries = [...groupedByKoc.entries()];
  const results: TikTokCompetitorKocResult[] = [];

  // 3. Truy vấn trực tiếp từng trang video trên TikTok để lấy 100% số liệu thật của KOC & Video
  const chunkSize = 5;
  for (let i = 0; i < kocEntries.length && results.length < limit; i += chunkSize) {
    const chunk = kocEntries.slice(i, i + chunkSize);
    const inspectedChunk = await Promise.all(
      chunk.map(([, videos]) => inspectLiveTikTokVideoPage(videos[0].videoUrl))
    );

    for (let idx = 0; idx < chunk.length; idx++) {
      const [, videos] = chunk[idx];
      const inspected = inspectedChunk[idx];
      if (!inspected || results.length >= limit) continue;

      const kocHandle = inspected.author.handle;
      if (kocHandle === cleanCompetitorHandle) continue;

      const baseResult = buildScrapedResultFromRealData(
        kocHandle,
        period,
        null,
        [inspected]
      );

      const isAlreadyInUpbase = upbaseHandleSet.has(kocHandle);
      const hasHashtagAd = /#(ad|sponsored|quangcao|tiktokshop)/i.test(inspected.caption);
      const collaborationType: 'AFFILIATE_CART' | 'PAID_BOOKING' | 'SEEDING_FOC' =
        inspected.hasCartAnchor
          ? 'AFFILIATE_CART'
          : hasHashtagAd
          ? 'PAID_BOOKING'
          : 'SEEDING_FOC';

      const collaborationTypeLabel =
        collaborationType === 'AFFILIATE_CART'
          ? 'Gắn giỏ hàng trên Video'
          : collaborationType === 'PAID_BOOKING'
          ? 'Video gắn thẻ thương hiệu'
          : 'Video Review / Đánh giá sản phẩm';

      results.push({
        ...baseResult,
        competitorCollaboration: {
          competitorHandle: cleanCompetitorHandle,
          competitorBrandName,
          collaborationType,
          collaborationTypeLabel,
          competitorProductPromoted:
            inspected.cartAnchorTitle ||
            (inspected.hashtags.length > 0
              ? inspected.hashtags.slice(0, 4).join(' ')
              : `#${compactBrandTag}`),
          competitorVideoCount: videos.length,
          latestCollabVideoId: inspected.videoId,
          latestCollabVideoUrl: inspected.videoUrl,
          latestCollabPublishedAt: inspected.publishedAt,
          latestCollabCaption: inspected.caption,
          latestCollabViews: inspected.views,
          estimatedCompetitorGmv: 0,
          estimatedCompetitorOrders: 0,
          isAlreadyInUpbase,
          suggestedUpbaseBrand: '',
        },
      });
    }
  }

  results.sort(
    (a, b) =>
      b.competitorCollaboration.latestCollabViews -
      a.competitorCollaboration.latestCollabViews
  );

  const alreadyInUpbaseCount = results.filter(
    (r) => r.competitorCollaboration.isAlreadyInUpbase
  ).length;

  return {
    competitorProfile,
    totalDiscovered: results.length,
    newOpportunityCount: results.length - alreadyInUpbaseCount,
    alreadyInUpbaseCount,
    results,
  };
}

/**
 * Xuất danh sách KOC làm cho đối thủ ra file CSV (có BOM UTF-8 để mở trực tiếp bằng Excel)
 */
export function buildCompetitorKocsCsv(results: TikTokCompetitorKocResult[]): string {
  const headers = [
    'Kênh Đối thủ',
    'Thương hiệu Đối thủ',
    'ID KOC (@handle)',
    'Tên kênh KOC',
    'Trạng thái tại UpBase',
    'Hình thức hợp tác với đối thủ',
    'Số video phát hiện',
    'Thẻ / Sản phẩm trong video',
    'Lượt xem thực tế video đối thủ',
    'Ngày đăng video đối thủ',
    'Link video làm cho đối thủ',
    'Lượt Follow kênh KOC',
    'Tổng lượt thích kênh KOC',
    'View TB kênh KOC',
    'Tỷ lệ tương tác ER (%)',
    'SĐT / Zalo (tách từ Bio thực)',
    'Email liên hệ (tách từ Bio thực)',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map((r) => {
    const c = r.competitorCollaboration;
    const p = r.channelProfile;
    const e = r.engagementMetrics;
    return [
      `@${c.competitorHandle}`,
      c.competitorBrandName,
      `@${p.handle}`,
      p.nickname,
      c.isAlreadyInUpbase ? 'Đã có trong Danh bạ UpBase' : 'KOC Mới',
      c.collaborationTypeLabel,
      c.competitorVideoCount,
      c.competitorProductPromoted,
      c.latestCollabViews,
      c.latestCollabPublishedAt,
      c.latestCollabVideoUrl,
      p.followers,
      p.totalLikes,
      e.avgViews,
      e.engagementRate,
      p.extractedPhone || '',
      p.extractedEmail || '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return `\uFEFF${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;
}

export type TikTokCommentIntentType = 'BUYING_INTENT' | 'PRODUCT_FEEDBACK' | 'GENERAL';

export interface TikTokVideoCommentItem {
  cid: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  text: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
  intentType: TikTokCommentIntentType;
  intentLabel: string;
  extractedPhone?: string;
}

export interface TikTokVideoCommentsScrapeResult {
  engineUsed: string;
  videoInfo: {
    videoId: string;
    videoUrl: string;
    authorHandle: string;
    authorNickname: string;
    caption: string;
    publishedAt: string;
    views: number;
    likes: number;
    commentsCount: number;
    sharesCount: number;
    downloadsCount: number;
  };
  summary: {
    totalFetched: number;
    buyingIntentCount: number;
    buyingIntentRate: number;
    feedbackCount: number;
    totalLikesOnComments: number;
  };
  comments: TikTokVideoCommentItem[];
}

export interface TikTokTrendingCreatorItem {
  id: string;
  handle: string;
  nickname: string;
  avatarUrl?: string;
  bio: string;
  verified: boolean;
  followers: number;
  totalLikes: number;
  videoCount: number;
  followingCount: number;
  secUid: string;
  channelUrl: string;
  extractedPhone?: string;
  extractedEmail?: string;
}

/**
 * Xuất danh sách bình luận video TikTok & khách hỏi mua hàng ra file CSV
 */
export function buildVideoCommentsCsv(data: TikTokVideoCommentsScrapeResult): string {
  const headers = [
    'Link Video',
    'Kênh đăng (@handle)',
    'Mã bình luận (CID)',
    'Người bình luận (@username)',
    'Tên hiển thị',
    'Phân loại bình luận',
    'Nội dung bình luận',
    'Lượt thích bình luận',
    'Số phản hồi (Replies)',
    'SĐT để lại (nếu có)',
    'Thời gian bình luận',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.comments.map((c) =>
    [
      data.videoInfo.videoUrl,
      `@${data.videoInfo.authorHandle}`,
      c.cid,
      `@${c.username}`,
      c.nickname,
      c.intentLabel,
      c.text,
      c.likeCount,
      c.replyCount,
      c.extractedPhone || '',
      c.publishedAt,
    ]
      .map(escapeCsv)
      .join(',')
  );

  return `\uFEFF${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;
}
