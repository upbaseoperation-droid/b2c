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
import { getVietnamDateYmd } from './format';
import {
  buildTargetKeywordProfile,
  compareTikTokVideoIdDesc,
  discoverRealTikTokVideoUrlsByQuery,
  discoverTikTokChannelVideoUrls,
  doesInspectedVideoMatchTarget,
  fetchTikTokCreatorVideoListBySecUid,
  fetchTikTokHtmlWithWafBypass,
  getSharedCrawlerStore,
  inspectLiveTikTokVideoPage,
  recordRejectedTargetHandles,
  type RealTikTokVideoAndAuthorDetail,
} from './tiktokOpenSourceEngines';

/**
 * So sánh 2 video theo thứ tự ưu tiên Ngày air mới nhất lên trước (publishedAt giảm dần -> Snowflake videoId giảm dần -> lượt xem giảm dần).
 */
export function compareVideoAirDateDesc(
  a: { publishedAt?: string; videoId?: string; views?: number },
  b: { publishedAt?: string; videoId?: string; views?: number }
): number {
  const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
  const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
  const validA = Number.isFinite(timeA) ? timeA : 0;
  const validB = Number.isFinite(timeB) ? timeB : 0;
  if (validB !== validA) return validB - validA;

  const idCmp = compareTikTokVideoIdDesc(a.videoId, b.videoId);
  if (idCmp !== 0) return idCmp;

  return (b.views || 0) - (a.views || 0);
}

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
    } else if (/^https?:\/\//i.test(trimmed)) {
      const cleanedUrl = trimmed
        .replace(/^https?:\/\/([a-z0-9-]+\.)?tiktok\.com\//i, '')
        .replace(/^@+/, '')
        .split(/[/?#\s]/)[0]
        .trim();
      if (cleanedUrl && !cleanedUrl.includes(':')) {
        candidate = cleanedUrl;
      }
    } else {
      candidate = trimmed
        .replace(/^@+/, '')
        .split(/[/?#\s]/)[0]
        .trim();
    }

    const clean = candidate.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (clean.length >= 2 && clean !== 'video' && clean !== 'photo' && !seen.has(clean)) {
      seen.add(clean);
      handles.push(clean);
    }
  }

  return handles;
}

/**
 * Tách các đường dẫn video TikTok trực tiếp (nếu người dùng dán link video vào ô quét kênh)
 */
export function extractDirectVideoUrlsFromInput(
  rawInput: string | string[]
): Array<{ handle: string; videoId: string; videoUrl: string }> {
  const rawList = Array.isArray(rawInput)
    ? rawInput
    : rawInput.split(/[\r\n,;]+/);
  const found: Array<{ handle: string; videoId: string; videoUrl: string }> = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const m = item
      .trim()
      .match(/tiktok\.com\/@([a-zA-Z0-9._-]+)\/(?:video|photo)\/(\d{15,22})/i);
    if (m && m[1] && m[2]) {
      const handle = m[1].toLowerCase();
      const videoId = m[2];
      const key = `${handle}_${videoId}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          handle,
          videoId,
          videoUrl: `https://www.tiktok.com/@${handle}/video/${videoId}`,
        });
      }
    }
  }
  return found;
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
 * Có bộ nhớ đệm dùng chung (TTL 30 phút) và gộp truy vấn trùng cho 30+ người dùng đồng thời.
 */
export async function fetchLiveTikTokPublicProfile(handle: string): Promise<{
  secUid?: string;
  nickname?: string;
  bio?: string;
  bioLink?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  totalLikes?: number;
  videoCount?: number;
  isVerified?: boolean;
} | null> {
  const clean = handle.trim().replace(/^@+/, '').toLowerCase();
  if (!clean) return null;

  const store = getSharedCrawlerStore();
  const now = Date.now();
  const cached = store.profileCache.get(clean);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = store.inFlightProfile.get(clean);
  if (inFlight) {
    return inFlight;
  }

  const taskPromise = (async () => {
    try {
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

      const profileData = {
        secUid: typeof u.secUid === 'string' && u.secUid.trim() ? u.secUid.trim() : undefined,
        nickname: typeof u.nickname === 'string' ? u.nickname : undefined,
        bio: typeof u.signature === 'string' ? u.signature : undefined,
        bioLink: typeof u.bioLink?.link === 'string' ? u.bioLink.link : undefined,
        avatarUrl: typeof u.avatarLarger === 'string' ? u.avatarLarger : undefined,
        followers: typeof s.followerCount === 'number' ? s.followerCount : undefined,
        following: typeof s.followingCount === 'number' ? s.followingCount : undefined,
        totalLikes:
          typeof s.heartCount === 'number'
            ? s.heartCount
            : typeof s.heart === 'number'
            ? s.heart
            : undefined,
        videoCount: typeof s.videoCount === 'number' ? s.videoCount : undefined,
        isVerified: Boolean(u.verified),
      };

      if (store.profileCache.size >= 1000) {
        const firstKey = store.profileCache.keys().next().value;
        if (firstKey) store.profileCache.delete(firstKey);
      }
      store.profileCache.set(clean, {
        data: profileData,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
      return profileData;
    } catch {
      return null;
    }
  })();

  store.inFlightProfile.set(clean, taskPromise);
  try {
    return await taskPromise;
  } finally {
    store.inFlightProfile.delete(clean);
  }
}

const REAL_TIKTOK_CHANNEL_FALLBACK_MAP: Record<string, string> = {
  'ha.linh.official': 'halinhofficial',
  'halinh.official': 'halinhofficial',
  vohalinh: 'halinhofficial',
};

function resolveFallbackCreatorHandle(cleanHandle: string): string | null {
  return REAL_TIKTOK_CHANNEL_FALLBACK_MAP[cleanHandle] || null;
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
  realInspectedVideos: RealTikTokVideoAndAuthorDetail[],
  usedFallbackVideosForInternalKoc = false
): TikTokScrapedKocResult {
  const existingKoc = UPBASE_FULL_KOC_MASTER.find(
    (k) => k.channelId.toLowerCase().replace(/^@+/, '') === cleanHandle
  );

  // Bảo vệ hồ sơ KOC nội bộ khi @handle trùng với một tài khoản trắng 0 video trên TikTok
  const isSquatterEmptyProfile =
    Boolean(existingKoc) &&
    (liveProfile?.videoCount ?? 0) === 0 &&
    (liveProfile?.followers ?? 0) < 500 &&
    (existingKoc?.followers ?? 0) >= 5000;

  const effectiveLiveProfile = isSquatterEmptyProfile ? null : liveProfile;
  const ownAuthorVideos = usedFallbackVideosForInternalKoc ? [] : realInspectedVideos;
  const fallbackAuthor = realInspectedVideos[0]?.author;

  const maxAuthorFollowers = ownAuthorVideos.reduce(
    (max, v) => Math.max(max, v.author.followers || 0),
    0
  );
  const maxAuthorLikes = ownAuthorVideos.reduce(
    (max, v) => Math.max(max, v.author.totalLikes || 0),
    0
  );
  const maxAuthorVideoCount = ownAuthorVideos.reduce(
    (max, v) => Math.max(max, v.author.videoCount || 0),
    0
  );
  const maxAuthorFollowing = ownAuthorVideos.reduce(
    (max, v) => Math.max(max, v.author.following || 0),
    0
  );
  const bestAuthorBio = ownAuthorVideos
    .map((v) => v.author.bio)
    .find((b) => typeof b === 'string' && b.trim().length > 0);
  const bestAuthorNickname = ownAuthorVideos
    .map((v) => v.author.nickname)
    .find((n) => typeof n === 'string' && n.trim().length > 0);
  const bestAuthorAvatar = ownAuthorVideos
    .map((v) => v.author.avatarUrl)
    .find((a) => typeof a === 'string' && a.trim().length > 0);

  const liveOrAuthorFollowers = Math.max(
    effectiveLiveProfile?.followers || 0,
    maxAuthorFollowers
  );
  const followers =
    liveOrAuthorFollowers > 0
      ? liveOrAuthorFollowers
      : existingKoc?.followers ?? fallbackAuthor?.followers ?? 0;

  const liveOrAuthorLikes = Math.max(
    effectiveLiveProfile?.totalLikes || 0,
    maxAuthorLikes
  );
  const totalLikes =
    liveOrAuthorLikes > 0
      ? liveOrAuthorLikes
      : existingKoc?.totalLikes || fallbackAuthor?.totalLikes || 0;

  const liveOrAuthorVideoCount = Math.max(
    effectiveLiveProfile?.videoCount || 0,
    maxAuthorVideoCount
  );
  const videoCount =
    liveOrAuthorVideoCount > 0
      ? liveOrAuthorVideoCount
      : existingKoc?.videoCount ||
        fallbackAuthor?.videoCount ||
        realInspectedVideos.length;

  const following =
    Math.max(effectiveLiveProfile?.following || 0, maxAuthorFollowing) ||
    fallbackAuthor?.following ||
    0;

  const nickname =
    effectiveLiveProfile?.nickname ||
    bestAuthorNickname ||
    existingKoc?.stageName ||
    fallbackAuthor?.nickname ||
    cleanHandle;

  const bio =
    (effectiveLiveProfile?.bio && effectiveLiveProfile.bio.trim()) ||
    bestAuthorBio ||
    existingKoc?.bio ||
    fallbackAuthor?.bio ||
    '';

  const avatarUrl =
    effectiveLiveProfile?.avatarUrl ||
    bestAuthorAvatar ||
    existingKoc?.avatarUrl ||
    fallbackAuthor?.avatarUrl;

  const isVerified = Boolean(
    effectiveLiveProfile?.isVerified ||
      ownAuthorVideos.some((v) => v.author.isVerified) ||
      fallbackAuthor?.isVerified
  );

  // Chỉ trích xuất SĐT / Email thực tế trong Bio (hoặc hồ sơ nội bộ UpBase nếu đã ký hợp đồng)
  const extracted = extractContactsFromBio(bio);
  const bestVideoPhone = ownAuthorVideos.map((v) => v.author.extractedPhone).find(Boolean);
  const bestVideoEmail = ownAuthorVideos.map((v) => v.author.extractedEmail).find(Boolean);
  const resolvedPhone = extracted.phone || bestVideoPhone || existingKoc?.phone || undefined;
  const resolvedEmail = extracted.email || bestVideoEmail || existingKoc?.email || undefined;

  const recentVideos: TikTokVideoItem[] = realInspectedVideos
    .map((v) => ({
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
    }))
    .sort((a, b) => compareVideoAirDateDesc(a, b));

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

async function inspectVideoCandidatesInBatches(
  candidates: Array<{ handle: string; videoId: string; videoUrl: string }>,
  expectedHandle: string,
  targetCount = 40
): Promise<RealTikTokVideoAndAuthorDetail[]> {
  const uniqueUrls = new Map<string, string>();
  for (const c of candidates) {
    if (!uniqueUrls.has(c.videoId)) {
      uniqueUrls.set(c.videoId, c.videoUrl);
    }
  }
  const urlList = [...uniqueUrls.values()];
  if (urlList.length === 0) return [];

  const collected = new Map<string, RealTikTokVideoAndAuthorDetail>();
  const batchSize = 10;
  const maxCandidatesToInspect = Math.min(urlList.length, Math.max(targetCount + 20, 50));
  let triedCreatorListBySecUid = false;

  for (let offset = 0; offset < maxCandidatesToInspect; offset += batchSize) {
    const batch = urlList.slice(offset, offset + batchSize);
    const inspected = await Promise.all(
      batch.map((u) => inspectLiveTikTokVideoPage(u))
    );
    let discoveredSecUid: string | undefined;
    for (const v of inspected) {
      if (!v) continue;
      if (v.author.handle.toLowerCase() !== expectedHandle.toLowerCase()) continue;
      if (!collected.has(v.videoId)) {
        collected.set(v.videoId, v);
      }
      if (!discoveredSecUid && v.author.secUid) {
        discoveredSecUid = v.author.secUid;
      }
    }

    // Ngay khi lấy được secUid từ 1 video của kênh (trường hợp trang @handle bị ẩn user-detail),
    // truy vấn ngay /api/creator/item_list/ để lấy đầy đủ các video mới nhất liên tiếp theo thời gian
    if (!triedCreatorListBySecUid && discoveredSecUid) {
      triedCreatorListBySecUid = true;
      const directChronological = await fetchTikTokCreatorVideoListBySecUid(
        expectedHandle,
        discoveredSecUid,
        targetCount
      );
      for (const dv of directChronological) {
        collected.set(dv.videoId, dv);
      }
    }

    if (collected.size >= targetCount) break;
  }

  return [...collected.values()]
    .sort((a, b) => compareVideoAirDateDesc(a, b))
    .slice(0, targetCount);
}

/**
 * Thu thập dữ liệu thực tế 100% của KOC từ TikTok (Hồ sơ kênh + Các video công khai thực tế mới nhất liên tiếp).
 * Không tự sinh SĐT giả, không tự nội suy View/Tim giả.
 */
export async function scrapeTikTokCreatorData(
  rawHandle: string,
  period: '7d' | '30d' | '90d' = '30d',
  options?: {
    directVideoUrls?: Array<{ handle: string; videoId: string; videoUrl: string }>;
    videoLimit?: number;
  }
): Promise<TikTokScrapedKocResult> {
  const parsedHandles = parseTikTokHandles(rawHandle);
  const cleanHandle = (parsedHandles[0] || rawHandle)
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');

  const targetVideoLimit = Math.min(Math.max(options?.videoLimit || 40, 6), 100);
  const candidateMaxUrls = Math.min(Math.max(targetVideoLimit * 2, 80), 160);

  const inlineDirectVideos = extractDirectVideoUrlsFromInput(rawHandle);
  const directVideosForHandle = [
    ...inlineDirectVideos,
    ...(options?.directVideoUrls || []),
  ].filter((v) => v.handle.toLowerCase() === cleanHandle);

  // 1. Lấy hồ sơ kênh thực tế trước để có secUid truy vấn danh sách video mới nhất liên tiếp
  let livePublic = await fetchLiveTikTokPublicProfile(cleanHandle);
  let inspectedVideos: RealTikTokVideoAndAuthorDetail[] = [];

  if (livePublic?.secUid) {
    const [chronologicalVideos, inspectedDirect] = await Promise.all([
      fetchTikTokCreatorVideoListBySecUid(cleanHandle, livePublic.secUid, targetVideoLimit),
      directVideosForHandle.length > 0
        ? inspectVideoCandidatesInBatches(
            directVideosForHandle,
            cleanHandle,
            directVideosForHandle.length
          )
        : Promise.resolve([]),
    ]);
    const mergedMap = new Map<string, RealTikTokVideoAndAuthorDetail>();
    for (const v of [...inspectedDirect, ...chronologicalVideos]) {
      if (!mergedMap.has(v.videoId)) {
        mergedMap.set(v.videoId, v);
      }
    }
    inspectedVideos = [...mergedMap.values()]
      .sort((a, b) => compareVideoAirDateDesc(a, b))
      .slice(0, targetVideoLimit);
  }

  // 2. Dự phòng khi chưa có secUid hoặc /api/creator/item_list/ trả về ít hơn số lượng yêu cầu
  if (inspectedVideos.length === 0) {
    const initialChannelVideos = await discoverTikTokChannelVideoUrls(cleanHandle, {
      maxUrls: candidateMaxUrls,
      secUid: livePublic?.secUid,
    });
    let candidateVideos = [...directVideosForHandle, ...initialChannelVideos];

    if (
      candidateVideos.length < targetVideoLimit &&
      livePublic?.nickname &&
      livePublic.nickname.trim().toLowerCase() !== cleanHandle
    ) {
      const extraByNickname = await discoverTikTokChannelVideoUrls(cleanHandle, {
        nickname: livePublic.nickname,
        maxUrls: candidateMaxUrls,
      });
      candidateVideos = [...candidateVideos, ...extraByNickname];
    }

    inspectedVideos = await inspectVideoCandidatesInBatches(
      candidateVideos,
      cleanHandle,
      targetVideoLimit
    );
  }

  let usedFallbackVideosForInternalKoc = false;

  // Nếu kênh được yêu cầu là alias chính chủ (VD: vohalinh -> halinhofficial),
  // dò sang kênh TikTok thực tế tương ứng để lấy danh sách video thật
  if (inspectedVideos.length === 0 && (livePublic?.videoCount ?? 0) === 0) {
    const existingKoc = UPBASE_FULL_KOC_MASTER.find(
      (k) => k.channelId.toLowerCase().replace(/^@+/, '') === cleanHandle
    );
    const fallbackHandle = resolveFallbackCreatorHandle(cleanHandle);
    if (fallbackHandle && fallbackHandle !== cleanHandle) {
      const fallbackProfile = await fetchLiveTikTokPublicProfile(fallbackHandle);
      let fallbackInspected: RealTikTokVideoAndAuthorDetail[] = [];
      if (fallbackProfile?.secUid) {
        fallbackInspected = await fetchTikTokCreatorVideoListBySecUid(
          fallbackHandle,
          fallbackProfile.secUid,
          targetVideoLimit
        );
      }
      if (fallbackInspected.length === 0) {
        const fallbackUrls = await discoverTikTokChannelVideoUrls(fallbackHandle, {
          maxUrls: candidateMaxUrls,
          secUid: fallbackProfile?.secUid,
        });
        fallbackInspected = await inspectVideoCandidatesInBatches(
          fallbackUrls,
          fallbackHandle,
          targetVideoLimit
        );
      }
      if (fallbackInspected.length > 0) {
        inspectedVideos = fallbackInspected;
        usedFallbackVideosForInternalKoc = Boolean(existingKoc);
        if (!existingKoc && fallbackProfile) {
          livePublic = fallbackProfile;
        }
      }
    }
  }

  return buildScrapedResultFromRealData(
    cleanHandle,
    period,
    livePublic,
    inspectedVideos,
    usedFallbackVideosForInternalKoc
  );
}

/**
 * Chuyển đổi kết quả thu thập từ TikTok sang bản ghi KocItem chuẩn của Danh bạ KOC
 */
export function mapScrapedResultToKocItem(
  scraped: TikTokScrapedKocResult,
  existing?: KocItem,
  options?: { bookingPic?: string }
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
      bookingPic: existing.bookingPic || options?.bookingPic,
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
      metricsUpdatedAt: getVietnamDateYmd(),
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
    bookingPic: options?.bookingPic,
    platforms: ['TIKTOK'],
    tiktokChannel: channelProfile.channelUrl,
    phone: channelProfile.extractedPhone || '',
    zalo: channelProfile.extractedZalo || channelProfile.extractedPhone || '',
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
    metricsUpdatedAt: getVietnamDateYmd(),
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
 * Hỗ trợ excludeHandles và pageOffset để chia thành nhiều đợt quét liên tiếp.
 */
export async function discoverTikTokKocsByHashtag(
  rawHashtagOrKeyword: string,
  options?: {
    period?: '7d' | '30d' | '90d';
    limit?: number;
    excludeHandles?: string[];
    pageOffset?: number;
  }
): Promise<{
  hashtag: string;
  tagPageUrl: string;
  totalDiscovered: number;
  results: TikTokHashtagKocResult[];
}> {
  const period = options?.period || '30d';
  const limit = Math.min(Math.max(options?.limit || 12, 1), 30);
  const excludeSet = new Set(
    (options?.excludeHandles || []).map((h) => h.trim().toLowerCase().replace(/^@+/, ''))
  );

  const cleanKeyword = rawHashtagOrKeyword.replace(/^#+/, '').trim();
  const cleanTag = cleanKeyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_]/g, '');

  const effectiveTag = cleanTag || 'kemchongnang';
  const tagPageUrl = `https://www.tiktok.com/tag/${encodeURIComponent(effectiveTag)}`;

  // 1. Phân tách hashtag/từ khóa (kể cả từ ghép như #nousvietnam -> nous + nousvietnam) và tìm link video thực tế
  const keywordProfile = buildTargetKeywordProfile(cleanKeyword || effectiveTag);
  const searchQueries = keywordProfile.searchQueries;
  const rawDiscovered = await discoverRealTikTokVideoUrlsByQuery(searchQueries, limit * 6, {
    excludeHandles: options?.excludeHandles,
    pageOffset: options?.pageOffset,
    targetKeyword: cleanKeyword || effectiveTag,
  });

  // Gom theo từng KOC duy nhất (ưu tiên video mới đăng nhất của từng KOC)
  const sortedDiscovered = [...rawDiscovered].sort((a, b) =>
    compareTikTokVideoIdDesc(a.videoId, b.videoId)
  );
  const uniqueByHandle = new Map<string, { handle: string; videoId: string; videoUrl: string }>();
  for (const item of sortedDiscovered) {
    if (excludeSet.has(item.handle)) continue;
    if (!uniqueByHandle.has(item.handle)) {
      uniqueByHandle.set(item.handle, item);
    }
    if (uniqueByHandle.size >= limit * 3 + 12) break;
  }

  const candidateEntries = [...uniqueByHandle.values()];
  const results: TikTokHashtagKocResult[] = [];

  // 2. Truy vấn trực tiếp từng trang video trên TikTok (vượt WAF Slardar) và đối soát nội dung video khớp đúng hashtag/từ khóa
  const rejectedInBatch: string[] = [];
  const chunkSize = 8;
  for (let i = 0; i < candidateEntries.length && results.length < limit; i += chunkSize) {
    const chunk = candidateEntries.slice(i, i + chunkSize);
    const inspectedChunk = await Promise.all(
      chunk.map((entry) => inspectLiveTikTokVideoPage(entry.videoUrl))
    );

    for (let idx = 0; idx < chunk.length; idx++) {
      const entry = chunk[idx];
      const inspected = inspectedChunk[idx];
      if (results.length >= limit) break;
      if (!inspected) {
        rejectedInBatch.push(entry.handle);
        continue;
      }
      if (excludeSet.has(inspected.author.handle)) continue;
      if (!doesInspectedVideoMatchTarget(inspected, cleanKeyword || effectiveTag)) {
        rejectedInBatch.push(entry.handle, inspected.author.handle);
        continue;
      }

      excludeSet.add(inspected.author.handle);
      excludeSet.add(entry.handle);

      const baseResult = buildScrapedResultFromRealData(
        inspected.author.handle,
        period,
        null,
        [inspected]
      );

      const followers = Math.max(1, baseResult.channelProfile.followers);
      const breakoutRatio = Number((inspected.views / followers).toFixed(2));

      const exactTagLower = `#${effectiveTag.toLowerCase()}`;
      const rootTagPrefix = keywordProfile.rootToken
        ? `#${keywordProfile.rootToken.toLowerCase()}`
        : exactTagLower;
      const matchedRealTag =
        inspected.hashtags.find((h) => h.toLowerCase() === exactTagLower) ||
        inspected.hashtags.find((h) => h.toLowerCase().startsWith(rootTagPrefix)) ||
        `#${effectiveTag}`;

      const lowerCaption = (inspected.caption || '').toLowerCase();
      const missingTags = inspected.hashtags
        .filter((h) => !lowerCaption.includes(h.toLowerCase()))
        .slice(0, 4);
      const enrichedCaption =
        missingTags.length > 0 && inspected.caption
          ? `${inspected.caption} ${missingTags.join(' ')}`
          : inspected.caption || `Video gắn thẻ ${matchedRealTag}`;

      results.push({
        ...baseResult,
        matchedHashtagVideo: {
          hashtag: matchedRealTag,
          videoId: inspected.videoId,
          videoUrl: inspected.videoUrl,
          publishedAt: inspected.publishedAt,
          captionSnippet: enrichedCaption,
          views: inspected.views,
          likes: inspected.likes,
          breakoutRatio,
        },
      });
    }
  }

  if (rejectedInBatch.length > 0) {
    recordRejectedTargetHandles(cleanKeyword || effectiveTag, rejectedInBatch);
    if (keywordProfile.rootToken) {
      recordRejectedTargetHandles(keywordProfile.rootToken, rejectedInBatch);
    }
  }

  results.sort((a, b) =>
    compareVideoAirDateDesc(
      {
        publishedAt: a.matchedHashtagVideo.publishedAt,
        videoId: a.matchedHashtagVideo.videoId,
        views: a.matchedHashtagVideo.views,
      },
      {
        publishedAt: b.matchedHashtagVideo.publishedAt,
        videoId: b.matchedHashtagVideo.videoId,
        views: b.matchedHashtagVideo.views,
      }
    )
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
  collaborationLabel?: string;
  competitorProductPromoted: string;
  promotedProduct?: string;
  competitorVideoCount: number;
  latestCollabVideoId: string;
  latestCollabVideoUrl: string;
  latestCollabPublishedAt: string;
  latestCollabCaption: string;
  latestCollabViews: number;
  videoViews: number;
  videoLikes: number;
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
    officialHandle?: string;
    brandName: string;
    searchKeyword: string;
    category: string;
    recommendedUpbaseBrands: string[];
  }
> = {
  larocheposayvn: {
    officialHandle: 'larocheposayvn',
    brandName: 'La Roche-Posay Việt Nam',
    searchKeyword: 'la roche posay',
    category: 'Dược mỹ phẩm & Chăm sóc da',
    recommendedUpbaseBrands: ['Babé', 'Rejuran', 'Bye Bye Blemish'],
  },
  anessavietnam: {
    officialHandle: 'anessavietnam',
    brandName: 'Anessa Official Vietnam',
    searchKeyword: 'anessa',
    category: 'Chăm sóc da & Chống nắng',
    recommendedUpbaseBrands: ['Cathy Doll', 'ClubClio', 'Face republic'],
  },
  romand_vn: {
    officialHandle: 'romand_vn',
    brandName: 'Rom&nd Vietnam Official',
    searchKeyword: 'romand',
    category: 'Trang điểm (Makeup)',
    recommendedUpbaseBrands: ['ClubClio', 'Cathy Doll', 'Karmart'],
  },
  cocoonvietnam: {
    officialHandle: 'cocoonvietnamofficial',
    brandName: 'Cocoon Vietnam',
    searchKeyword: 'cocoon',
    category: 'Chăm sóc cơ thể & Tóc thuần chay',
    recommendedUpbaseBrands: ['Herbal Care', 'Chulala', 'Mine'],
  },
  skin1004_vietnam: {
    officialHandle: 'skin1004_vietnam',
    brandName: 'SKIN1004 Vietnam',
    searchKeyword: 'skin1004',
    category: 'Chăm sóc da nhạy cảm',
    recommendedUpbaseBrands: ['Babé', 'Rejuran', 'Fresh'],
  },
  cetaphilvietnam: {
    officialHandle: 'cetaphilvietnam',
    brandName: 'Cetaphil Vietnam',
    searchKeyword: 'cetaphil',
    category: 'Mẹ & Bé / Chăm sóc da dịu nhẹ',
    recommendedUpbaseBrands: ['Kutieskin', 'Babé', 'EUPC'],
  },
  ceravevietnam: {
    officialHandle: 'ceravevietnam',
    brandName: 'CeraVe Vietnam',
    searchKeyword: 'cerave',
    category: 'Dược mỹ phẩm & Chăm sóc da',
    recommendedUpbaseBrands: ['Babé', 'Rejuran', 'Natural Care'],
  },
  lorealparis_vn: {
    officialHandle: 'lorealparis_vn',
    brandName: "L'Oréal Paris Vietnam",
    searchKeyword: 'loreal',
    category: 'Mỹ phẩm & Chăm sóc cá nhân',
    recommendedUpbaseBrands: ['ClubClio', 'Rejuran', 'EUPC'],
  },
  nous_vietnam: {
    officialHandle: 'nous.vietnam',
    brandName: 'Nous Vietnam Official',
    searchKeyword: 'nous vietnam',
    category: 'Thời trang & Phụ kiện Sơ sinh (Mẹ & Bé)',
    recommendedUpbaseBrands: ['Kutieskin', 'Nabizam', 'Docilee'],
  },
  keyshulive: {
    officialHandle: 'keyshulive',
    brandName: 'KEYSHU LIVE',
    searchKeyword: 'keyshu',
    category: 'Dược mỹ phẩm & Chăm sóc da',
    recommendedUpbaseBrands: ['Rejuran', 'Bye Bye Blemish', 'ClubClio'],
  },
  mustelavietnam: {
    officialHandle: 'mustelavietnam',
    brandName: 'Mustela Vietnam',
    searchKeyword: 'mustela',
    category: 'Chăm sóc da Mẹ & Bé',
    recommendedUpbaseBrands: ['Kutieskin', 'Nabizam', 'Docilee'],
  },
  momorabbitvietnam: {
    officialHandle: 'momorabbitvietnam',
    brandName: 'Momo Rabbit Vietnam',
    searchKeyword: 'momo rabbit',
    category: 'Bỉm & Tã Cao cấp cho Bé',
    recommendedUpbaseBrands: ['Nabizam', 'Kutieskin', 'Docilee'],
  },
  femfreshvietnam: {
    officialHandle: 'femfreshvietnam',
    brandName: 'Femfresh Vietnam',
    searchKeyword: 'femfresh',
    category: 'Dung dịch Vệ sinh Phụ nữ',
    recommendedUpbaseBrands: ['Ziaja Intimate', 'pHCare', 'Baniphar'],
  },
  rhysman: {
    officialHandle: 'rhysman.vn',
    brandName: 'Rhys Man Vietnam',
    searchKeyword: 'rhys man',
    category: 'Chăm sóc Cá nhân Nam giới',
    recommendedUpbaseBrands: ['CM24', 'Badlab'],
  },
  nerman_official: {
    officialHandle: 'nerman.official',
    brandName: 'Nerman Vietnam',
    searchKeyword: 'nerman',
    category: 'Chăm sóc Cá nhân Nam giới',
    recommendedUpbaseBrands: ['CM24', 'Badlab'],
  },
  comem_homelab: {
    officialHandle: 'comem_homelab',
    brandName: 'Cỏ Mềm HomeLab',
    searchKeyword: 'cỏ mềm',
    category: 'Mỹ phẩm Thiên nhiên Việt Nam',
    recommendedUpbaseBrands: ['Herbal Care', 'Kutieskin', 'pHCare'],
  },
  cindybloom: {
    officialHandle: 'cindybloom.official',
    brandName: 'Cindy Bloom Vietnam',
    searchKeyword: 'cindy bloom',
    category: 'Sữa tắm nước hoa & Chăm sóc cơ thể',
    recommendedUpbaseBrands: ["L'Occitane", 'Herbal Care', 'Mine'],
  },
  clubclio: {
    officialHandle: 'clubclio_vietnam',
    brandName: 'ClubClio Vietnam Official',
    searchKeyword: 'club clio',
    category: 'Trang điểm Hàn Quốc (Makeup)',
    recommendedUpbaseBrands: ['Cathy Doll', 'Rejuran', 'Karmart'],
  },
  byebyeblemish: {
    officialHandle: 'byebyeblemishvn',
    brandName: 'Bye Bye Blemish Vietnam',
    searchKeyword: 'bye bye blemish',
    category: 'Chăm sóc da mụn',
    recommendedUpbaseBrands: ['Babé', 'Rejuran', 'ClubClio'],
  },
  rejuran: {
    officialHandle: 'rejuran.vn',
    brandName: 'Rejuran Vietnam Official',
    searchKeyword: 'rejuran',
    category: 'Dược mỹ phẩm & Phục hồi da',
    recommendedUpbaseBrands: ['Babé', 'ClubClio', "L'Occitane"],
  },
  loccitane: {
    officialHandle: 'loccitane_vn',
    brandName: "L'Occitane en Provence",
    searchKeyword: 'loccitane',
    category: 'Chăm sóc cơ thể & Da cao cấp',
    recommendedUpbaseBrands: ['Cindy Bloom', 'Rejuran', 'Fresh'],
  },
  kutieskin: {
    officialHandle: 'kutieskin.official',
    brandName: 'Kutieskin Chính Hãng',
    searchKeyword: 'kutieskin',
    category: 'Chăm sóc da Mẹ & Bé',
    recommendedUpbaseBrands: ['Nabizam', 'Docilee', 'Babé'],
  },
};

/**
 * Quét danh sách các KOC thực tế đang lên video review / gắn thẻ Kênh hoặc Thương hiệu Đối thủ (100% dữ liệu thực từ TikTok).
 * Hỗ trợ excludeHandles, pageOffset và skipProfileFetch để chia thành nhiều đợt quét liên tiếp.
 */
export async function discoverCompetitorKocs(
  rawCompetitorInput: string,
  options?: {
    period?: '7d' | '30d' | '90d';
    limit?: number;
    targetUpbaseBrand?: string;
    excludeHandles?: string[];
    pageOffset?: number;
    skipProfileFetch?: boolean;
  }
): Promise<{
  competitorProfile: TikTokCompetitorProfileSummary;
  totalDiscovered: number;
  newOpportunityCount: number;
  alreadyInUpbaseCount: number;
  results: TikTokCompetitorKocResult[];
}> {
  const period = options?.period || '30d';
  const limit = Math.min(Math.max(options?.limit || 12, 1), 30);
  const excludeSet = new Set(
    (options?.excludeHandles || []).map((h) => h.trim().toLowerCase().replace(/^@+/, ''))
  );

  const trimmedInput = rawCompetitorInput.trim();
  const isExplicitHandleOrUrl =
    trimmedInput.startsWith('@') || /tiktok\.com\/@/i.test(trimmedInput);
  const isHandleOrUrlInput = isExplicitHandleOrUrl || !/\s/.test(trimmedInput);

  const parsedHandles = isHandleOrUrlInput ? parseTikTokHandles(trimmedInput) : [];
  const compactAsciiInput = trimmedInput
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/^#+/, '')
    .replace(/[^a-z0-9._-]/g, '');

  const rawCompetitorHandle = (
    parsedHandles[0] ||
    compactAsciiInput ||
    'larocheposayvn'
  ).replace(/^\.+|\.+$/g, '');

  const compactInputTag = rawCompetitorHandle.replace(/[._-]/g, '');
  const presetKey = Object.keys(COMPETITOR_PRESET_CATALOG).find((k) => {
    const compactKey = k.replace(/[._-]/g, '');
    return compactInputTag.includes(compactKey) || compactKey.includes(compactInputTag);
  });
  const preset = presetKey ? COMPETITOR_PRESET_CATALOG[presetKey] : undefined;

  const cleanCompetitorHandle =
    !isExplicitHandleOrUrl && preset?.officialHandle
      ? preset.officialHandle
      : rawCompetitorHandle;

  const strippedBrandCore = isHandleOrUrlInput
    ? cleanCompetitorHandle
        .replace(
          /(?:_|-|\.)?(official|vietnam|vn|store|shop|live|mall|channel|cosmetics|beauty)$/gi,
          ''
        )
        .replace(/[._-]+/g, ' ')
        .trim()
    : trimmedInput
        .replace(/^[@#]+/, '')
        .replace(/\b(official|vietnam|vn|store|shop|live|mall)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

  const isDirectVideoUrl = /tiktok\.com\/@[^/?#]+\/(?:video|photo)\/\d{15,22}/i.test(
    rawCompetitorInput
  );

  const targetKeywordForDiscovery = isHandleOrUrlInput
    ? cleanCompetitorHandle
    : strippedBrandCore || cleanCompetitorHandle;
  const keywordProfile = buildTargetKeywordProfile(targetKeywordForDiscovery);
  const cleanSearchBrand =
    preset?.searchKeyword || keywordProfile.rootToken || strippedBrandCore || cleanCompetitorHandle;

  // 1. Chạy song song: lấy hồ sơ thực của kênh đối thủ (nếu là đợt 1) VÀ tìm các video KOC nhắc tới đối thủ
  const [initialLiveCompProfile, directInputVideo, compOwnVideos, rawDiscoveredVideos] = await Promise.all([
    options?.skipProfileFetch
      ? Promise.resolve(null)
      : fetchLiveTikTokPublicProfile(cleanCompetitorHandle),
    !options?.skipProfileFetch && isDirectVideoUrl
      ? inspectLiveTikTokVideoPage(rawCompetitorInput.trim())
      : Promise.resolve(null),
    options?.skipProfileFetch
      ? Promise.resolve([])
      : discoverTikTokChannelVideoUrls(cleanCompetitorHandle, { maxUrls: 8 }),
    discoverRealTikTokVideoUrlsByQuery(
      [
        ...(keywordProfile.searchQueries || []),
        `tiktok.com "${cleanSearchBrand}" review`,
        `tiktok.com "${targetKeywordForDiscovery}"`,
      ],
      limit * 6,
      {
        excludeHandles: options?.excludeHandles,
        pageOffset: options?.pageOffset,
        targetKeyword: targetKeywordForDiscovery,
      }
    ),
  ]);

  let liveCompProfile = initialLiveCompProfile;
  let resolvedCompetitorHandle = cleanCompetitorHandle;

  // Nếu người dùng nhập tên thương hiệu (không phải @handle cụ thể) mà tài khoản @brand gốc không tồn tại, tự dò @brand.official / @brandvietnam
  if (
    !options?.skipProfileFetch &&
    !isExplicitHandleOrUrl &&
    (!liveCompProfile?.followers || liveCompProfile.followers < 100)
  ) {
    const candidateOfficialHandles = Array.from(
      new Set([
        `${compactInputTag}.official`,
        `${compactInputTag}vietnam`,
        `${compactInputTag}_vn`,
        `${compactInputTag}.vn`,
      ])
    ).filter((h) => h !== cleanCompetitorHandle);

    const fallbackProfiles = await Promise.all(
      candidateOfficialHandles.slice(0, 3).map(async (h) => ({
        handle: h,
        profile: await fetchLiveTikTokPublicProfile(h),
      }))
    );
    const bestOfficial = fallbackProfiles
      .filter((item) => (item.profile?.followers || 0) >= 100)
      .sort((a, b) => (b.profile?.followers || 0) - (a.profile?.followers || 0))[0];
    if (bestOfficial?.profile) {
      liveCompProfile = bestOfficial.profile;
      resolvedCompetitorHandle = bestOfficial.handle;
    }
  }

  // Nếu trang profile @competitor chưa trả về số liệu (hoặc trả về tài khoản trùng tên < 500 flw), lấy từ 1 video thực của chính kênh đối thủ
  let compVideoAuthor: RealTikTokVideoAndAuthorDetail['author'] | undefined =
    directInputVideo?.author;
  if (
    !options?.skipProfileFetch &&
    ((!liveCompProfile?.followers || liveCompProfile.followers < 500) && !compVideoAuthor?.followers)
  ) {
    const ownVideo =
      compOwnVideos.find((v) => v.handle === resolvedCompetitorHandle || v.handle === cleanCompetitorHandle) ||
      rawDiscoveredVideos.find((v) => v.handle === resolvedCompetitorHandle || v.handle === cleanCompetitorHandle);
    if (ownVideo) {
      const inspectedOwn = await inspectLiveTikTokVideoPage(ownVideo.videoUrl);
      if (inspectedOwn?.author) {
        compVideoAuthor = inspectedOwn.author;
      }
    }
  }

  const useLiveProfile =
    liveCompProfile && (liveCompProfile.followers || 0) >= (compVideoAuthor?.followers || 500);

  const competitorBrandName =
    compVideoAuthor?.nickname ||
    preset?.brandName ||
    (useLiveProfile ? liveCompProfile?.nickname : undefined) ||
    (isExplicitHandleOrUrl ? resolvedCompetitorHandle : trimmedInput);

  const competitorProfile: TikTokCompetitorProfileSummary = {
    handle: resolvedCompetitorHandle,
    channelUrl: `https://www.tiktok.com/@${resolvedCompetitorHandle}`,
    brandName: competitorBrandName,
    followers: Math.max(liveCompProfile?.followers ?? 0, compVideoAuthor?.followers ?? 0),
    totalLikes: Math.max(liveCompProfile?.totalLikes ?? 0, compVideoAuthor?.totalLikes ?? 0),
    videoCount: Math.max(liveCompProfile?.videoCount ?? 0, compVideoAuthor?.videoCount ?? 0),
    bio:
      compVideoAuthor?.bio ||
      (useLiveProfile ? liveCompProfile?.bio : undefined) ||
      `Kênh TikTok @${resolvedCompetitorHandle}`,
    category: preset?.category || 'Mỹ phẩm & Chăm sóc cá nhân',
    recommendedUpbaseBrands: preset?.recommendedUpbaseBrands || [],
  };

  // 2. Gom nhóm các video thực của KOC bên thứ ba (loại trừ video đăng bởi chính kênh chính thức của đối thủ & các KOC đã quét ở đợt trước)
  const compactBrandTag = cleanCompetitorHandle.replace(/[._-]/g, '');
  const compactCoreTag = (keywordProfile.rootToken || strippedBrandCore || cleanCompetitorHandle)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');

  const isBrandOwnedHandle = (h: string): boolean => {
    const lower = h.toLowerCase();
    const compact = lower.replace(/[._-]/g, '');
    if (lower === cleanCompetitorHandle || compact === compactBrandTag) return true;
    if (compactBrandTag.length >= 4 && compact.includes(compactBrandTag)) return true;
    if (
      compactCoreTag.length >= 4 &&
      new RegExp(
        `^${compactCoreTag}(official|vietnam|vn|mall|global|korea|kr|japan|jp|paris|chinhhang|authentic)?$`,
        'i'
      ).test(compact)
    ) {
      return true;
    }
    return false;
  };

  const groupedByKoc = new Map<
    string,
    Array<{ handle: string; videoId: string; videoUrl: string }>
  >();

  const rejectedHandlesInBatch: string[] = [];

  for (const item of rawDiscoveredVideos) {
    if (isBrandOwnedHandle(item.handle)) {
      rejectedHandlesInBatch.push(item.handle);
      continue;
    }
    if (excludeSet.has(item.handle)) {
      continue;
    }
    const list = groupedByKoc.get(item.handle) || [];
    list.push(item);
    groupedByKoc.set(item.handle, list);
  }

  // Sắp xếp danh sách video của mỗi KOC theo thứ tự mới nhất trước, và ưu tiên KOC có video mới air lên đầu
  for (const [h, list] of groupedByKoc.entries()) {
    list.sort((a, b) => compareTikTokVideoIdDesc(a.videoId, b.videoId));
    groupedByKoc.set(h, list);
  }

  const upbaseHandleSet = new Set(
    UPBASE_FULL_KOC_MASTER.map((k) => k.channelId.toLowerCase().replace(/^@+/, ''))
  );

  const kocEntries = [...groupedByKoc.entries()].sort((a, b) =>
    compareTikTokVideoIdDesc(a[1][0]?.videoId, b[1][0]?.videoId)
  );
  const results: TikTokCompetitorKocResult[] = [];

  const matchesCompetitorTarget = (v: RealTikTokVideoAndAuthorDetail): boolean =>
    doesInspectedVideoMatchTarget(v, targetKeywordForDiscovery) ||
    doesInspectedVideoMatchTarget(v, cleanSearchBrand) ||
    Boolean(competitorBrandName && doesInspectedVideoMatchTarget(v, competitorBrandName));

  // 3. Truy vấn trực tiếp từng trang video trên TikTok để lấy 100% số liệu thật của KOC & Video
  const chunkSize = 8;
  for (let i = 0; i < kocEntries.length && results.length < limit; i += chunkSize) {
    const chunk = kocEntries.slice(i, i + chunkSize);
    const inspectedChunk = await Promise.all(
      chunk.map(([, videos]) => inspectLiveTikTokVideoPage(videos[0].videoUrl))
    );

    for (let idx = 0; idx < chunk.length; idx++) {
      if (results.length >= limit) break;
      const [candidateHandle, videos] = chunk[idx];
      let inspected = inspectedChunk[idx];

      if (!inspected && videos.length > 1) {
        inspected = await inspectLiveTikTokVideoPage(videos[1].videoUrl);
      }
      if (!inspected) {
        rejectedHandlesInBatch.push(candidateHandle);
        continue;
      }

      let kocHandle = inspected.author.handle;
      if (isBrandOwnedHandle(kocHandle)) {
        rejectedHandlesInBatch.push(candidateHandle, kocHandle);
        continue;
      }
      if (excludeSet.has(kocHandle)) continue;

      if (!matchesCompetitorTarget(inspected) && videos.length > 1) {
        const secondInspected = await inspectLiveTikTokVideoPage(videos[1].videoUrl);
        if (secondInspected && matchesCompetitorTarget(secondInspected)) {
          inspected = secondInspected;
          kocHandle = secondInspected.author.handle;
        }
      }

      if (!matchesCompetitorTarget(inspected)) {
        rejectedHandlesInBatch.push(candidateHandle, kocHandle);
        continue;
      }
      if (excludeSet.has(kocHandle)) continue;

      excludeSet.add(kocHandle);
      excludeSet.add(candidateHandle);

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
          collaborationLabel: collaborationTypeLabel,
          competitorProductPromoted:
            inspected.cartAnchorTitle ||
            (inspected.hashtags.length > 0
              ? inspected.hashtags.slice(0, 4).join(' ')
              : `#${compactBrandTag}`),
          promotedProduct:
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
          videoViews: inspected.views,
          videoLikes: inspected.likes,
          estimatedCompetitorGmv: 0,
          estimatedCompetitorOrders: 0,
          isAlreadyInUpbase,
          suggestedUpbaseBrand: '',
        },
      });
    }
  }

  if (rejectedHandlesInBatch.length > 0) {
    recordRejectedTargetHandles(targetKeywordForDiscovery, rejectedHandlesInBatch);
    if (keywordProfile.rootToken) {
      recordRejectedTargetHandles(keywordProfile.rootToken, rejectedHandlesInBatch);
    }
  }

  results.sort((a, b) =>
    compareVideoAirDateDesc(
      {
        publishedAt: a.competitorCollaboration.latestCollabPublishedAt,
        videoId: a.competitorCollaboration.latestCollabVideoId,
        views: a.competitorCollaboration.latestCollabViews,
      },
      {
        publishedAt: b.competitorCollaboration.latestCollabPublishedAt,
        videoId: b.competitorCollaboration.latestCollabVideoId,
        views: b.competitorCollaboration.latestCollabViews,
      }
    )
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
  nextCursor?: number;
  hasMore?: boolean;
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

export type TrendingKocCategoryKey =
  | 'ALL'
  | 'SKINCARE'
  | 'MAKEUP'
  | 'BODY_HAIR'
  | 'MOM_BABY'
  | 'MEN_CARE'
  | 'HEALTH_WELLNESS'
  | 'FASHION_LIFESTYLE';

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
  categoryKey?: TrendingKocCategoryKey;
  categoryLabel?: string;
  latestVideoId?: string;
  latestVideoUrl?: string;
  latestVideoCaption?: string;
  latestVideoPublishedAt?: string;
  latestVideoViews?: number;
  latestVideoLikes?: number;
  engagementRate?: number;
}

/**
 * Xuất danh sách KOC xu hướng theo ngành hàng ra file CSV (BOM UTF-8 cho Excel)
 */
export function buildTrendingCreatorsCsv(creators: TikTokTrendingCreatorItem[]): string {
  const headers = [
    'ID Kênh (@handle)',
    'Tên kênh TikTok',
    'Ngành hàng',
    'Link kênh',
    'Tick xanh',
    'Lượt Follow',
    'Tổng lượt thích',
    'Tổng số video',
    'Tỷ lệ tương tác ER (%)',
    'SĐT / Zalo (tách từ Bio)',
    'Email (tách từ Bio)',
    'Tiểu sử (Bio)',
    'Video xu hướng gần nhất (Link)',
    'Lượt xem video xu hướng',
    'Ngày đăng video',
    'Nội dung video xu hướng',
  ];

  const escapeCsv = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = creators.map((c) =>
    [
      `@${c.handle}`,
      c.nickname,
      c.categoryLabel || 'Đa ngành B2C',
      c.channelUrl,
      c.verified ? 'Tick xanh' : 'Không',
      c.followers,
      c.totalLikes,
      c.videoCount,
      c.engagementRate ?? '',
      c.extractedPhone || '',
      c.extractedEmail || '',
      c.bio,
      c.latestVideoUrl || '',
      c.latestVideoViews ?? '',
      c.latestVideoPublishedAt || '',
      c.latestVideoCaption || '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return `\uFEFF${headers.map(escapeCsv).join(',')}\r\n${rows.join('\r\n')}`;
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
