import { NextRequest, NextResponse } from 'next/server';
import type { BookingDealItem, KocItem, KocTier, TikTokVideoItem } from '@/lib/types';
import { getSalaryGradeFromRate, getSegmentFromSalaryGrade } from '@/lib/types';
import { UPBASE_FULL_KOC_MASTER } from '@/lib/kocMasterDataset';
import { REAL_KOC_COOPERATION_DEALS } from '@/lib/realKocDealsData';
import { REAL_B2C_69_STORES } from '@/lib/realB2cPlanData';
import {
  buildStaffListingRowFromKoc,
  makeSheetKey,
  type StaffBrandSheetCollection,
} from '@/lib/staffBrandListingSheet';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, upsertRecord } from '@/lib/server/sharedRecords';
import type { KocDirectoryChangesData } from '@/app/api/kocs/route';
import { historicalDb } from '@/lib/kocHistoricalDatabase';
import {
  KOC_VIDEO_HISTORY_RECORD_KEY,
  buildInitialWeeklyHistoryStore,
  extractSystemVideoId,
  ingestWeeklyRowsBySystemVideoId,
  registerNewSystemVideo,
  type KocVideoWeeklyHistoryStoreData,
  type WeeklyVideoInputRow,
} from '@/lib/kocVideoWeeklyHistory';
import {
  injectExtensionCapturedVideoToCache,
  inspectLiveTikTokVideoPage,
  type TikTokCartProductItem,
} from '@/lib/tiktokOpenSourceEngines';
import { saveMultiPlatformExtensionCapture } from '@/lib/linkAirCheckServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KOC_DIRECTORY_KEY = 'koc-directory-changes';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upbase-Ext-Version',
  'Cache-Control': 'no-store',
};

let extShotSeq = 0;

function resolveStoreApprover(storeName: string, brandName: string): {
  leaderName: string;
  directorName: string;
  marketingDirector: string;
  routingLabel: string;
} {
  const sNorm = storeName.toLowerCase();
  const bNorm = brandName.toLowerCase();
  const matchedStore = REAL_B2C_69_STORES.find(
    (s) =>
      s.storeName.toLowerCase() === sNorm ||
      (bNorm && s.brandName.toLowerCase() === bNorm)
  );
  const hasLeader = Boolean(matchedStore?.hasBookingLeader && matchedStore?.bookingLeader);
  const leaderName = matchedStore?.bookingLeader || 'Nguyễn Thị Ngọc Tâm';
  if (hasLeader) {
    return {
      leaderName,
      directorName: 'Đặng Thị Yến Nhi',
      marketingDirector: 'Đặng Thị Yến Nhi',
      routingLabel: `Leader ${leaderName} → GĐ Marketing Đặng Thị Yến Nhi`,
    };
  }
  return {
    leaderName: 'Trực tiếp (Không qua Leader)',
    directorName: 'Đặng Thị Yến Nhi',
    marketingDirector: 'Đặng Thị Yến Nhi',
    routingLabel: 'PIC trình trực tiếp GĐ Marketing Đặng Thị Yến Nhi',
  };
}

function normalizeHandle(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

function stripHandlePunct(raw?: string | null): string {
  return normalizeHandle(raw).replace(/[._-]+/g, '');
}

function dedupeHandleLetters(raw?: string | null): string {
  return stripHandlePunct(raw).replace(/([a-z])\1+/g, '$1');
}

function maskSensitive(raw?: string | null): string {
  const clean = String(raw || '').trim();
  if (!clean) return '—';
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

function getTierFromFollowers(followers: number): { tier: KocTier; tierLabel: string } {
  if (followers >= 500_000) return { tier: 'TIER_1_CELEB', tierLabel: 'Tier 1 · Celeb' };
  if (followers >= 100_000) return { tier: 'TIER_2_MACRO', tierLabel: 'Tier 2 · Macro' };
  if (followers >= 10_000) return { tier: 'TIER_3_MICRO', tierLabel: 'Tier 3 · Micro' };
  return { tier: 'TIER_4_AFFILIATE', tierLabel: 'Tier 4 · Affiliate' };
}

// O(1) Index Maps theo RULE-PERF-01
let masterKocByHandle: Map<string, KocItem> | null = null;
let masterKocByStripped: Map<string, KocItem> | null = null;
let masterKocByFuzzy: Map<string, KocItem> | null = null;
let dealsByHandle: Map<string, BookingDealItem[]> | null = null;

function ensureMasterIndexes() {
  if (!masterKocByHandle || !masterKocByStripped || !masterKocByFuzzy) {
    masterKocByHandle = new Map<string, KocItem>();
    masterKocByStripped = new Map<string, KocItem>();
    masterKocByFuzzy = new Map<string, KocItem>();
    for (const item of UPBASE_FULL_KOC_MASTER) {
      const key = normalizeHandle(item.channelId || item.id);
      if (!key) continue;
      const dealsCount = Number(item.totalPastDeals || 0);
      const prevExact = masterKocByHandle.get(key);
      if (!prevExact || Number(prevExact.totalPastDeals || 0) < dealsCount) {
        masterKocByHandle.set(key, item);
      }
      const stripped = stripHandlePunct(key);
      if (stripped) {
        const prevStripped = masterKocByStripped.get(stripped);
        if (!prevStripped || Number(prevStripped.totalPastDeals || 0) < dealsCount) {
          masterKocByStripped.set(stripped, item);
        }
      }
      const fuzzy = dedupeHandleLetters(key);
      if (fuzzy) {
        const prevFuzzy = masterKocByFuzzy.get(fuzzy);
        if (!prevFuzzy || Number(prevFuzzy.totalPastDeals || 0) < dealsCount) {
          masterKocByFuzzy.set(fuzzy, item);
        }
      }
    }
  }
  if (!dealsByHandle) {
    dealsByHandle = new Map<string, BookingDealItem[]>();
    for (const deal of REAL_KOC_COOPERATION_DEALS) {
      const key = normalizeHandle(deal.kocChannelId || deal.kocStageName || deal.kocId);
      if (!key) continue;
      const list = dealsByHandle.get(key);
      if (list) {
        if (list.length < 25) list.push(deal);
      } else {
        dealsByHandle.set(key, [deal]);
      }
    }
  }
}

function resolveMasterKocByHandle(handle: string): KocItem | undefined {
  if (!handle) return undefined;
  const exact = masterKocByHandle?.get(handle);
  const stripped = masterKocByStripped?.get(stripHandlePunct(handle));
  const fuzzy = masterKocByFuzzy?.get(dedupeHandleLetters(handle));
  if (
    exact &&
    fuzzy &&
    Number(fuzzy.totalPastDeals || 0) > Number(exact.totalPastDeals || 0) &&
    (String(fuzzy.realName || '') === String(exact.realName || '') ||
      Number(fuzzy.totalPastDeals || 0) >= Number(exact.totalPastDeals || 0) * 3)
  ) {
    return fuzzy;
  }
  return exact || stripped || fuzzy;
}

async function resolveActor(req: NextRequest) {
  return requestActor(req).catch(() => null);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    ensureMasterIndexes();
    const { searchParams } = new URL(req.url);
    const handle = normalizeHandle(searchParams.get('handle'));
    const videoIdParam = String(searchParams.get('videoId') || '').trim();
    const videoUrlParam = String(searchParams.get('videoUrl') || '').trim();

    const customRecord = await readRecord<KocDirectoryChangesData>(KOC_DIRECTORY_KEY, {
      itemsByHandle: {},
      updatedAt: new Date(0).toISOString(),
    });

    const videoHistoryRecord = await readRecord<KocVideoWeeklyHistoryStoreData>(
      KOC_VIDEO_HISTORY_RECORD_KEY,
      buildInitialWeeklyHistoryStore()
    );

    const allRegisteredList = Object.values(videoHistoryRecord.data.registeredVideosById || {});
    if (handle) {
      allRegisteredList.sort((a, b) => {
        const aMatch = normalizeHandle(a.kocChannelId) === handle ? 0 : 1;
        const bMatch = normalizeHandle(b.kocChannelId) === handle ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    const registeredVideos = allRegisteredList.slice(0, 40).map((v, idx) => ({
      videoId: v.videoId,
      systemVideoId: v.videoId,
      dealCode: v.dealCode || '',
      kocChannelId: v.kocChannelId,
      kocStageName: v.kocStageName,
      brandName: v.brandName,
      storeName: v.storeName,
      productName: v.productName,
      bookingCostNet: Math.round(Number(v.bookingCostNet || 0)),
      sparkAdsCode: v.sparkAdsCode || '',
      authorizationType: v.authorizationType || 'Chờ nạp mã Ads (30 ngày)',
      pic: v.pic || '—',
    }));

    const customKoc = handle ? customRecord.data.itemsByHandle?.[handle] : undefined;
    const standardMasterKoc = handle ? resolveMasterKocByHandle(handle) : undefined;
    const historicalKoc = handle ? historicalDb.getKoc(handle) : null;

    // Ưu tiên bản ghi có đầy đủ deal lịch sử hơn giữa standardMasterKoc và historicalKoc
    const baseMasterKoc = standardMasterKoc && historicalKoc
      ? (Number(historicalKoc.totalPastDeals || 0) > Number(standardMasterKoc.totalPastDeals || 0)
          ? { ...standardMasterKoc, ...historicalKoc, id: standardMasterKoc.id || historicalKoc.id }
          : { ...historicalKoc, ...standardMasterKoc })
      : (standardMasterKoc || historicalKoc || undefined);

    const mergedKoc: KocItem | null = customKoc
      ? {
          ...(baseMasterKoc || {}),
          ...customKoc,
          ...(baseMasterKoc
            ? {
                id: baseMasterKoc.id,
                salaryGrade: baseMasterKoc.salaryGrade,
                segment: baseMasterKoc.segment,
                rateCardVideo: baseMasterKoc.rateCardVideo,
                minRate: baseMasterKoc.minRate,
                maxRate: baseMasterKoc.maxRate,
                totalPastDeals: baseMasterKoc.totalPastDeals,
                totalPaidVideos: baseMasterKoc.totalPaidVideos,
                totalFocVideos: baseMasterKoc.totalFocVideos,
                latestBookMonth: baseMasterKoc.latestBookMonth,
                latestBoCode: baseMasterKoc.latestBoCode,
                reliabilityScore: baseMasterKoc.reliabilityScore,
              }
            : {}),
        }
      : baseMasterKoc || null;

    const canonicalMasterHandle = normalizeHandle(baseMasterKoc?.channelId || handle);
    const standardDeals = handle
      ? dealsByHandle?.get(canonicalMasterHandle) || dealsByHandle?.get(handle) || []
      : [];
    const historicalDeals = handle
      ? historicalDb.getDeals(canonicalMasterHandle) || historicalDb.getDeals(handle) || []
      : [];

    const seenDealCodes = new Set<string>();
    const historyDeals: BookingDealItem[] = [];
    for (const d of [...standardDeals, ...historicalDeals]) {
      const code = String(d.dealCode || '').trim();
      if (code && !seenDealCodes.has(code)) {
        seenDealCodes.add(code);
        historyDeals.push(d);
      }
    }

    let inspectedVideo: Record<string, unknown> | null = null;
    if (videoIdParam || videoUrlParam) {
      const targetUrl =
        videoUrlParam && videoUrlParam.includes('/video/')
          ? videoUrlParam
          : handle && videoIdParam
            ? `https://www.tiktok.com/@${handle}/video/${videoIdParam}`
            : '';
      if (targetUrl) {
        try {
          const liveDetail = await inspectLiveTikTokVideoPage(targetUrl);
          if (liveDetail) {
            inspectedVideo = {
              videoId: liveDetail.videoId,
              videoUrl: liveDetail.videoUrl,
              handle: liveDetail.author.handle,
              caption: liveDetail.caption,
              hashtags: liveDetail.hashtags,
              publishedAt: liveDetail.publishedAt,
              durationSeconds: liveDetail.durationSeconds,
              views: liveDetail.views,
              likes: liveDetail.likes,
              comments: liveDetail.comments,
              shares: liveDetail.shares,
              saves: liveDetail.saves,
              engagementRate: liveDetail.engagementRate,
              hasYellowCart: Boolean(liveDetail.hasCartAnchor || (liveDetail.cartProducts && liveDetail.cartProducts.length > 0)),
              cartAnchorTitle: liveDetail.cartAnchorTitle || '',
              cartAnchorUrl: liveDetail.cartAnchorUrl || '',
              cartProductId: liveDetail.cartProductId || '',
              cartSellerId: liveDetail.cartSellerId || '',
              cartProducts: liveDetail.cartProducts || [],
              transcriptText: liveDetail.transcriptText || '',
              subtitleUrl: liveDetail.subtitleUrl || '',
              playableUrl: liveDetail.playableUrl || '',
              onScreenStickers: liveDetail.onScreenStickers || [],
            };
          }
        } catch {
          // ignore live video fallback error
        }
      }
      if (!inspectedVideo && videoIdParam) {
        const regVid = videoHistoryRecord.data.registeredVideosById?.[videoIdParam];
        if (regVid) {
          inspectedVideo = {
            videoId: regVid.videoId,
            videoUrl: regVid.linkAir || `https://www.tiktok.com/@${regVid.kocChannelId}/video/${regVid.videoId}`,
            handle: regVid.kocChannelId,
            caption: regVid.videoTitle || regVid.productName || '',
            publishedAt: regVid.airDate || '',
            hasYellowCart: Boolean(regVid.productName || regVid.productId),
            cartAnchorTitle: regVid.productName || '',
            cartProductId: regVid.productId || '',
            cartProducts: regVid.productName
              ? [
                  {
                    productId: regVid.productId || '',
                    title: regVid.productName,
                    shopName: regVid.storeName || regVid.brandName || 'TikTok Shop',
                    productUrl: regVid.productId
                      ? `https://shop.tiktok.com/view/product/${regVid.productId}?region=VN&locale=vi-VN`
                      : '',
                  },
                ]
              : [],
          };
        }
      }
    }

    const storesSummary = REAL_B2C_69_STORES.map((s) => {
      const routing = resolveStoreApprover(s.storeName, s.brandName);
      return {
        id: s.id,
        storeName: s.storeName,
        brandName: s.brandName,
        platform: s.platform,
        b2cOwnerName: s.b2cOwnerName || s.assignedStaff || 'Chưa phân công',
        budgetNet: Math.round(Number(s.budgetNet || s.monthlyBudget || 0)),
        actualSpentNet: Math.round(Number(s.actualSpentNet || 0)),
        financialRiskStatus: s.financialRiskStatus || 'NORMAL',
        leaderName: routing.leaderName,
        directorName: routing.directorName,
        routingLabel: routing.routingLabel,
      };
    });

    return NextResponse.json(
      {
        success: true,
        handle,
        foundInMaster: Boolean(mergedKoc),
        sourceType: customKoc
          ? 'CUSTOM_SYNCED'
          : standardMasterKoc
            ? 'MASTER_DATA'
            : historicalKoc
              ? 'HISTORICAL_DATABASE'
              : 'NEW_DISCOVERY',
        koc: mergedKoc
          ? {
              id: mergedKoc.id,
              channelId: mergedKoc.channelId,
              stageName: mergedKoc.stageName,
              realName: mergedKoc.realName || '—',
              salaryGrade: mergedKoc.salaryGrade,
              segment: mergedKoc.segment,
              tepKenh: mergedKoc.tepKenh,
              kocCategory: mergedKoc.kocCategory,
              niche: mergedKoc.niche,
              followers: Math.round(Number(mergedKoc.followers || 0)),
              avgViews: Math.round(Number(mergedKoc.avgViews || 0)),
              medianViews: Math.round(Number(mergedKoc.medianViews || 0)),
              engagementRate: Number(mergedKoc.engagementRate || 0),
              rateCardVideo: Math.round(Number(mergedKoc.rateCardVideo || 0)),
              minRate: Math.round(Number(mergedKoc.minRate || mergedKoc.rateCardVideo || 0)),
              maxRate: Math.round(Number(mergedKoc.maxRate || mergedKoc.rateCardVideo || 0)),
              reliabilityScore: Number(mergedKoc.reliabilityScore || 0),
              totalPastDeals: Math.round(Number(mergedKoc.totalPastDeals || historyDeals.length || 0)),
              totalPaidVideos: Math.round(Number(mergedKoc.totalPaidVideos || 0)),
              totalFocVideos: Math.round(Number(mergedKoc.totalFocVideos || 0)),
              totalPastGmv: Math.round(Number(mergedKoc.totalPastGmv || mergedKoc.gmvBestCase || 0)),
              historicalRoi: Number(mergedKoc.historicalRoi || 0),
              latestBookMonth: mergedKoc.latestBookMonth || '—',
              latestBoCode: mergedKoc.latestBoCode || '—',
              bookingPic: mergedKoc.bookingPic || '—',
              workedPicsList: mergedKoc.workedPicsList || '—',
              brandName: mergedKoc.brandName || '—',
              brandApprovalStatus: mergedKoc.brandApprovalStatus || 'CHỜ_DUYỆT',
              taxAccountType: mergedKoc.taxAccountType || 'Chưa xác nhận',
              collabGroupLabel: mergedKoc.collabGroupLabel || '—',
              phoneMasked: maskSensitive(mergedKoc.phone || mergedKoc.zalo),
              cccdMasked: maskSensitive(mergedKoc.cccd || mergedKoc.taxCode),
              bankAccountMasked: mergedKoc.bankAccount
                ? `${mergedKoc.bankName || 'NH'} · ${maskSensitive(
                    mergedKoc.bankAccount.includes('·')
                      ? mergedKoc.bankAccount.split('·').pop()
                      : mergedKoc.bankAccount
                  )}`
                : '—',
              sharedMcnInfo: mergedKoc.sharedMcnInfo || null,
              metricsUpdatedAt: mergedKoc.metricsUpdatedAt || null,
              // Chỉ số TikTok Seller / Affiliate
              recentRevenue: Math.round(Number(mergedKoc.recentRevenue || mergedKoc.gmvBestCase || 0)),
              itemsSold: Math.round(Number(mergedKoc.itemsSold || 0)),
              gpm: Math.round(Number(mergedKoc.gpm || 0)),
              aov: Math.round(Number(mergedKoc.aov || 0)),
              gmvShareVideo: Number(mergedKoc.gmvShareVideo ?? 0),
              gmvShareLive: Number(mergedKoc.gmvShareLive ?? 0),
              gmvShareProductCard: Number(mergedKoc.gmvShareProductCard ?? 0),
              maleRatio: Number(mergedKoc.maleRatio ?? 0),
              femaleRatio: Number(mergedKoc.femaleRatio ?? 0),
              age18_24: Number(mergedKoc.age18_24 ?? 0),
              age25_34: Number(mergedKoc.age25_34 ?? 0),
              age35Plus: Number(mergedKoc.age35Plus ?? 0),
              location: mergedKoc.location || '',
            }
          : null,
        recentDeals: historyDeals.slice(0, 8).map((d) => ({
          id: d.id,
          dealCode: d.dealCode,
          brandName: d.brandName,
          storeName: d.storeName || d.brandName,
          bookingFormat: d.bookingFormat || 'Booking Video KOC',
          totalValue: Math.round(Number(d.totalValue || 0)),
          viewsCount: Math.round(Number(d.viewsCount || 0)),
          affiliateGmv: Math.round(Number(d.affiliateGmv || 0)),
          roi: Number(d.roi || 0),
          assignedStaff: d.assignedStaff || d.bookingPic || '—',
          statusLabel: d.statusLabel || d.status,
          postedDate: d.postedDate || d.deadlinePost || '—',
          videoUrl: d.tiktokVideoUrl || d.videoUrl || '',
        })),
        stores: storesSummary,
        registeredVideos,
        inspectedVideo,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Lỗi tra cứu dữ liệu KOC từ Extension.',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

interface ExtensionSyncPayload {
  action:
    | 'SYNC_KOC_PROFILE'
    | 'CREATE_DEAL_PROPOSAL'
    | 'VERIFY_AIR_LINK'
    | 'SYNC_ADS_PERFORMANCE'
    | 'VERIFY_SPARK_ADS_CODES'
    | 'SCORE_PRODUCT_SUPER_VIP'
    | 'ANALYZE_CHANNEL_AND_SCRIPT'
    | 'SUBMIT_EXTENSION_FEEDBACK'
    | 'SYNC_ACCEPTANCE_SCREENSHOT';
  platform?: 'tiktok' | 'instagram' | 'tiktok_ads' | 'douyin' | 'threads' | 'facebook';
  handle?: string;
  productQuery?: string;
  productInput?: string;
  productTitle?: string;
  topProductTitle?: string;
  productPriceVnd?: number;
  priceVnd?: number;
  commissionRatePct?: number;
  commissionPct?: number;
  soldCount?: number;
  feedbackText?: string;
  pageUrl?: string;
  adsRows?: Array<{
    videoId: string;
    dealCode?: string;
    handle?: string;
    kocHandle?: string;
    storeName?: string;
    brandName?: string;
    campaignName?: string;
    bookingCostNet?: number;
    adsSpend?: number;
    gmv?: number;
    orders?: number;
    views?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    cvr?: number;
    hookRate2s?: number;
    viewRate6s?: number;
    completionRate100?: number;
    sparkAdsCode?: string;
  }>;
  adsRecords?: Array<{
    videoId: string;
    dealCode?: string;
    handle?: string;
    kocHandle?: string;
    storeName?: string;
    brandName?: string;
    campaignName?: string;
    bookingCostNet?: number;
    adsSpend?: number;
    gmv?: number;
    orders?: number;
    views?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    cvr?: number;
    hookRate2s?: number;
    viewRate6s?: number;
    completionRate100?: number;
    sparkAdsCode?: string;
  }>;
  sparkCodes?: Array<{
    sparkAdsCode: string;
    videoId?: string;
    dealCode?: string;
    handle?: string;
    kocHandle?: string;
    status?: 'AUTHORIZED' | 'VERIFIED' | 'EXPIRED' | 'INVALID';
    daysAuthorized?: number;
  }>;
  codes?: Array<{
    sparkAdsCode: string;
    videoId?: string;
    dealCode?: string;
    handle?: string;
    kocHandle?: string;
    status?: 'AUTHORIZED' | 'VERIFIED' | 'EXPIRED' | 'INVALID';
    daysAuthorized?: number;
  }>;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  followers?: number;
  following?: number;
  totalLikes?: number;
  videoCount?: number;
  avgViews?: number;
  medianViews?: number;
  avgLikes?: number;
  avgComments?: number;
  avgShares?: number;
  engagementRate?: number;
  organicAvgViews?: number;
  sponsoredAvgViews?: number;
  extractedPhone?: string;
  extractedEmail?: string;
  // TikTok Seller / Creator Marketplace E-commerce & Demographics
  recentRevenue?: number;
  itemsSold?: number;
  gpm?: number;
  aov?: number;
  gmvShareVideo?: number;
  gmvShareLive?: number;
  gmvShareProductCard?: number;
  maleRatio?: number;
  femaleRatio?: number;
  age18_24?: number;
  age25_34?: number;
  age35Plus?: number;
  location?: string;
  recentVideos?: Array<{
    videoId: string;
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    publishedAt?: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    isSponsored?: boolean;
    isPinned?: boolean;
    hasCartAnchor?: boolean;
    cartAnchorTitle?: string;
    cartAnchorUrl?: string;
    cartProductId?: string;
    cartSellerId?: string;
    cartProducts?: TikTokCartProductItem[];
    transcriptText?: string;
    subtitleUrl?: string;
    playableUrl?: string;
    onScreenStickers?: string[];
    durationSeconds?: number;
  }>;
  // Deal proposal fields
  storeName?: string;
  brandName?: string;
  planMonth?: string;
  bookingFormatLabel?: 'Video trả phí' | 'Suất gửi mẫu FOC' | 'Video Affiliate';
  rateCardNet?: number;
  picName?: string;
  note?: string;
  // Air link verification fields
  videoUrl?: string;
  videoId?: string;
  caption?: string;
  hashtags?: string[];
  publishedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  hasYellowCart?: boolean;
  cartAnchorTitle?: string;
  cartAnchorUrl?: string;
  cartProductId?: string;
  cartSellerId?: string;
  cartProducts?: TikTokCartProductItem[];
  transcriptText?: string;
  subtitleUrl?: string;
  playableUrl?: string;
  onScreenStickers?: string[];
  durationSeconds?: number;
  kocScore?: number;
  postsWeekly?: number;
  shopSharePct?: number;
  goldenHours?: string[];
  dealCode?: string;
  imageDataUrl?: string;
  captionQuote?: string;
  productName?: string;
  timeLabel?: string;
  sourceMode?: 'VIDEO_FRAME' | 'FULL_SCREEN' | string;
  timestampSec?: number;
  matchedTerm?: string;
}

export async function POST(req: NextRequest) {
  try {
    ensureMasterIndexes();
    const actor = await resolveActor(req);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Chưa xác thực phiên làm việc. Vui lòng đăng nhập Web-Admin.' },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    if (actor.partnerType || String(actor.role || '').includes('_PARTNER')) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản đối tác không có quyền ghi dữ liệu qua Extension.' },
        { status: 403, headers: CORS_HEADERS }
      );
    }
    const body = (await req.json()) as ExtensionSyncPayload;
    const nowIso = new Date().toISOString();
    const vnDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // 1. Đồng bộ bảng chỉ số hiệu quả chạy Ads (TikTok Ads Manager -> Kho lịch sử tuần)
    if (body.action === 'SYNC_ADS_PERFORMANCE') {
      const rawAdsList = Array.isArray(body.adsRows)
        ? body.adsRows
        : Array.isArray(body.adsRecords)
          ? body.adsRecords
          : [];
      const incomingRows = rawAdsList;
      if (incomingRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Chưa có dòng dữ liệu báo cáo Ads cần đồng bộ.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const weeklyInputRows: WeeklyVideoInputRow[] = incomingRows.map((r) => ({
        videoId: String(r.videoId || ''),
        dealCode: r.dealCode || undefined,
        tiktokAccount: r.handle || r.kocHandle || body.handle || 'koc_ads',
        brandName: r.brandName || (r.storeName ? r.storeName.split('_')[0] : 'ClubClio'),
        storeName: r.storeName || body.storeName || 'ClubClio_TikTok_E2E-S',
        campaignName: r.campaignName || 'Chiến dịch TikTok Ads B2C',
        adsSpend: Math.max(0, Math.round(Number(r.adsSpend || 0))),
        gmv: Math.max(0, Math.round(Number(r.gmv || 0))),
        orders: Math.max(0, Math.round(Number(r.orders || 0))),
        views: Math.max(0, Math.round(Number(r.views || r.impressions || 0))),
        impressions: Math.max(0, Math.round(Number(r.impressions || r.views || 0))),
        clicks: Math.max(0, Math.round(Number(r.clicks || 0))),
        ctr: Number(r.ctr || 0),
        cvr: Number(r.cvr || 0),
        hookRate2s: Number(r.hookRate2s || 0),
        viewRate6s: Number(r.viewRate6s || 0),
        completionRate100: Number(r.completionRate100 || 0),
        authorizationType: r.sparkAdsCode ? `Spark Ads (${r.sparkAdsCode})` : 'Spark Ads Authorized',
      }));

      let matchedCount = 0;
      let newCount = 0;
      await upsertRecord<KocVideoWeeklyHistoryStoreData>(
        KOC_VIDEO_HISTORY_RECORD_KEY,
        buildInitialWeeklyHistoryStore(),
        (current) => {
          const result = ingestWeeklyRowsBySystemVideoId(current, {
            weekKey: '2026-W44',
            weekLabel: 'Tuần 44 (Đồng bộ từ TikTok Ads Extension)',
            dateRange: `${vnDate} ~ ${vnDate}`,
            fileName: `TikTok_Ads_Manager_Extension_${vnDate}`,
            sourceType: 'API_INGEST',
            importedBy: String(body.picName || actor?.name || 'Chuyên viên B2C'),
            defaultBrandName: body.brandName || 'ClubClio',
            defaultStoreName: body.storeName || 'ClubClio_TikTok_E2E-S',
            rows: weeklyInputRows,
          });
          matchedCount = result.matchedCount;
          newCount = result.newlyRegisteredVideosCount;
          return result.nextStore;
        }
      );

      return NextResponse.json(
        {
          success: true,
          action: 'SYNC_ADS_PERFORMANCE',
          message: `Đã đồng bộ ${weeklyInputRows.length} video từ TikTok Ads Manager (${matchedCount} video khớp mã hệ thống, ${newCount} video mới) về Báo cáo hiệu quả tuần.`,
          matchedCount,
          newCount,
        },
        { headers: CORS_HEADERS }
      );
    }

    // 2. Xác nhận hàng loạt Mã ủy quyền Spark Ads (Spark Ads Authorization)
    if (body.action === 'VERIFY_SPARK_ADS_CODES') {
      const codes = Array.isArray(body.sparkCodes)
        ? body.sparkCodes
        : Array.isArray(body.codes)
          ? body.codes
          : [];
      if (codes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Không có mã Spark Ads trong danh sách nạp.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      let updatedVideosCount = 0;
      await upsertRecord<KocVideoWeeklyHistoryStoreData>(
        KOC_VIDEO_HISTORY_RECORD_KEY,
        buildInitialWeeklyHistoryStore(),
        (current) => {
          const nextRegisteredById = { ...current.registeredVideosById };
          for (const item of codes) {
            const vidKey =
              item.videoId && nextRegisteredById[item.videoId]
                ? item.videoId
                : Object.keys(nextRegisteredById).find(
                    (k) =>
                      (item.dealCode &&
                        nextRegisteredById[k].dealCode?.toUpperCase() ===
                          item.dealCode.toUpperCase()) ||
                      (item.sparkAdsCode &&
                        nextRegisteredById[k].sparkAdsCode === item.sparkAdsCode)
                  );
            if (vidKey && nextRegisteredById[vidKey]) {
              updatedVideosCount++;
              const isOk = !item.status || item.status === 'AUTHORIZED' || item.status === 'VERIFIED';
              nextRegisteredById[vidKey] = {
                ...nextRegisteredById[vidKey],
                sparkAdsCode: item.sparkAdsCode,
                authorizationType: isOk
                  ? `Đã nạp Ads Manager (${item.daysAuthorized || 30} ngày · ${vnDate})`
                  : `Mã lỗi / Hết hạn (${vnDate})`,
              };
            }
          }
          return {
            ...current,
            registeredVideosById: nextRegisteredById,
            registeredVideos: Object.values(nextRegisteredById),
            updatedAt: nowIso,
          };
        }
      );

      return NextResponse.json(
        {
          success: true,
          action: 'VERIFY_SPARK_ADS_CODES',
          message: `Đã nạp và cập nhật trạng thái ủy quyền cho ${codes.length} mã Spark Ads (${updatedVideosCount} video gắn mã BO đã đồng bộ).`,
          updatedVideosCount,
        },
        { headers: CORS_HEADERS }
      );
    }

    // 3. Chấm điểm Mặt hàng Super VIP từ Link hoặc Product ID (Giá, Hoa hồng, Đã bán, Tốc độ bán, Tồn kho, Cạnh tranh bằng chữ)
    if (body.action === 'SCORE_PRODUCT_SUPER_VIP') {
      const rawQuery = String(
        body.productQuery || body.productInput || body.cartProductId || body.cartAnchorUrl || ''
      ).trim();
      if (!rawQuery) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập Link sản phẩm TikTok Shop hoặc Mã Product ID cần chấm điểm.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const pidMatch = rawQuery.match(/\b(\d{15,22})\b/);
      const productId = pidMatch ? pidMatch[1] : rawQuery.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 22);
      const recentVids = Array.isArray(body.recentVideos) ? body.recentVideos : [];

      let matchedTitle = String(body.productTitle || '').trim();
      let matchedPrice = Math.max(0, Math.round(Number(body.productPriceVnd || body.priceVnd || 0)));
      let matchedSellerId = '';
      let matchedVideosCount = 0;
      let totalViews = 0;
      let totalLikes = 0;

      for (const v of recentVids) {
        const cList = Array.isArray(v.cartProducts) ? v.cartProducts : [];
        const hit = cList.find(
          (p) =>
            p.productId === productId ||
            (rawQuery.length >= 4 &&
              (String(p.title || '').toLowerCase().includes(rawQuery.toLowerCase()) ||
                String(p.productUrl || '').toLowerCase().includes(rawQuery.toLowerCase())))
        );
        if (hit) {
          matchedVideosCount++;
          totalViews += Math.max(0, Math.round(Number(v.views || 0)));
          totalLikes += Math.max(0, Math.round(Number(v.likes || 0)));
          if (!matchedTitle && hit.title) matchedTitle = hit.title;
          if (!matchedPrice && hit.priceVnd) matchedPrice = Math.round(Number(hit.priceVnd));
          if (!matchedSellerId && hit.sellerId) matchedSellerId = hit.sellerId;
        }
      }

      if (!matchedTitle) {
        matchedTitle =
          rawQuery.startsWith('http') || /^\d+$/.test(rawQuery)
            ? `Sản phẩm TikTok Shop #${productId.slice(-6)}`
            : rawQuery;
      }
      const commRatePct = Math.max(
        0,
        Math.min(50, Number(body.commissionRatePct || body.commissionPct || 0))
      );
      const estimatedCommissionVnd = matchedPrice > 0 && commRatePct > 0 ? Math.round(matchedPrice * (commRatePct / 100)) : 0;
      const effectiveVideos = matchedVideosCount;
      const effectiveViews = totalViews;
      const estimatedSold = Math.max(0, Math.round(Number(body.soldCount || 0)));
      const dailySalesVelocity = estimatedSold > 0 ? Math.round(estimatedSold / 14) : 0;
      const stockCount = 0;

      const scoreRaw =
        Math.min(35, effectiveVideos * 7) +
        Math.min(35, Math.round((dailySalesVelocity / 25) * 35)) +
        Math.min(30, Math.round((commRatePct / 15) * 30));
      const productScore = Math.max(52, Math.min(98, scoreRaw));

      const competitionLabel =
        effectiveVideos >= 6 || dailySalesVelocity >= 40
          ? 'Cạnh tranh cao (Nhiều KOC đang đẩy)'
          : effectiveVideos >= 3 || dailySalesVelocity >= 15
            ? 'Cạnh tranh vừa (Đang vào nhịp tăng trưởng)'
            : 'Cạnh tranh thấp (Ngách mới tiềm năng)';

      const tierLabel =
        productScore >= 80
          ? 'Mặt hàng chủ lực (Winning)'
          : productScore >= 60
            ? 'Mặt hàng tiềm năng'
            : 'Mặt hàng thử nghiệm';

      const encodedKw = encodeURIComponent(matchedTitle);

      const productPayload = {
        productId,
        title: matchedTitle,
        sellerId: matchedSellerId || '',
        shopName: matchedSellerId ? `Gian hàng #${matchedSellerId.slice(-6)}` : 'Chưa xác nhận',
        priceVnd: matchedPrice,
        commissionRatePct: commRatePct,
        commissionPct: commRatePct,
        estimatedCommissionVnd,
        commissionVnd: estimatedCommissionVnd,
        soldCount: estimatedSold,
        dailySalesVelocity,
        stockCount,
        stockStatusLabel: stockCount > 0 ? `Sẵn hàng (${new Intl.NumberFormat('vi-VN').format(stockCount)} tồn kho)` : 'Chưa xác nhận tồn kho',
        videoCountOnChannel: effectiveVideos,
        totalViewsOnChannel: effectiveViews,
        totalLikesOnChannel: totalLikes,
        productScore,
        tierLabel,
        competitionLabel,
        competitionLevel: competitionLabel,
        recommendationNote:
          productScore >= 75
            ? 'Mặt hàng có tốc độ bán và tỷ lệ chuyển đổi tốt, nên ưu tiên gắn giỏ hoặc vít Spark Ads.'
            : 'Mặt hàng ở mức ổn định, cần kết hợp góc nội dung xử lý nỗi đau khách hàng trong 3 giây đầu.',
        crossPlatformLinks: {
          tiktokShop: `https://shop.tiktok.com/view/product/${productId}?region=VN&locale=vi-VN`,
          shopee: `https://shopee.vn/search?keyword=${encodedKw}`,
          lazada: `https://www.lazada.vn/catalog/?q=${encodedKw}`,
        },
      };

      return NextResponse.json(
        {
          success: true,
          action: 'SCORE_PRODUCT_SUPER_VIP',
          product: productPayload,
          productMetrics: productPayload,
        },
        { headers: CORS_HEADERS }
      );
    }

    // 4. Nhận xét Kênh & Viết Kịch bản Video từ Phụ đề / Chỉ số (Chỉ chạy khi bấm nút theo RULE-API-02)
    if (body.action === 'ANALYZE_CHANNEL_AND_SCRIPT') {
      const targetHandle = normalizeHandle(body.handle) || 'koc_b2c';
      const followers = Math.max(0, Math.round(Number(body.followers || 0)));
      const avgViews = Math.max(0, Math.round(Number(body.avgViews || 0)));
      const er = Number(body.engagementRate || 0);
      const productTitle = String(
        body.productTitle ||
          body.topProductTitle ||
          body.cartAnchorTitle ||
          body.cartProducts?.[0]?.title ||
          'Sản phẩm chiến dịch B2C'
      ).trim();
      const rawTranscript = String(body.transcriptText || body.caption || '').trim();

      const viewToFollowerPct =
        followers === 0 ? 0 : Number(((avgViews / followers) * 100).toFixed(1));
      const healthVerdict =
        er >= 4.5 || viewToFollowerPct >= 18
          ? 'Kênh có tệp người xem thật tương tác cao, giữ chân người xem tốt ở 3 giây đầu.'
          : er >= 2.0
            ? 'Kênh duy trì tương tác ổn định, phù hợp làm video trải nghiệm thực tế gắn giỏ hàng.'
            : 'Tỷ lệ tương tác trên lượt xem đang thấp, cần đổi câu mở đầu trực diện vào vấn đề của khách.';

      const suggestedFormat =
        followers >= 100000
          ? 'Video trả phí kết hợp cấp mã Spark Ads 30 ngày'
          : followers >= 15000
            ? 'Video trả phí hoặc Gửi mẫu kèm hoa hồng Affiliate cao'
            : 'Suất gửi mẫu FOC kèm hoa hồng Affiliate';

      const rawTranscriptLines = rawTranscript
        ? rawTranscript
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
        : [];

      const parsedCues = rawTranscriptLines.map((line, idx) => {
        const m = line.match(/^\[(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?\]\s*(.*)$/);
        if (m) {
          const startSec = Number(m[1]) * 60 + Number(m[2]);
          const endSec = m[3] !== undefined ? Number(m[3]) * 60 + Number(m[4]) : startSec + 3;
          return {
            timeRange: `${m[1].padStart(2, '0')}:${m[2]} - ${(m[3] || m[1]).padStart(2, '0')}:${m[4] || m[2]}`,
            startSec,
            endSec,
            text: m[5].trim(),
          };
        }
        return {
          timeRange: `${String(Math.floor((idx * 3) / 60)).padStart(2, '0')}:${String((idx * 3) % 60).padStart(2, '0')}`,
          startSec: idx * 3,
          endSec: idx * 3 + 3,
          text: line.replace(/^\[[^\]]+\]\s*/, '').trim(),
        };
      });

      const totalTranscriptWords = parsedCues
        .map((c) => c.text)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length;

      const totalCues = parsedCues.length;
      const hookEndIdx = Math.max(1, Math.min(3, Math.ceil(totalCues * 0.15)));
      const painEndIdx = Math.max(hookEndIdx + 1, Math.ceil(totalCues * 0.4));
      const uspEndIdx = Math.max(painEndIdx + 1, Math.ceil(totalCues * 0.8));

      const joinCueGroup = (cues: typeof parsedCues) =>
        cues.map((c) => `[${c.timeRange}] ${c.text}`).join('\n');
      const joinPlainText = (cues: typeof parsedCues) =>
        cues.map((c) => c.text).join(' ');

      const originalBreakdown = {
        totalLines: totalCues,
        totalWords: totalTranscriptWords,
        hookPart:
          totalCues > 0
            ? joinCueGroup(parsedCues.slice(0, hookEndIdx))
            : 'Chưa có phụ đề bóc tách phần mở đầu.',
        painPointPart:
          totalCues > hookEndIdx
            ? joinCueGroup(parsedCues.slice(hookEndIdx, painEndIdx))
            : totalCues > 0
              ? joinCueGroup(parsedCues)
              : 'Chưa có phụ đề phân đoạn dẫn dắt bối cảnh.',
        uspExperiencePart:
          totalCues > painEndIdx
            ? joinCueGroup(parsedCues.slice(painEndIdx, uspEndIdx))
            : totalCues > 0
              ? joinCueGroup(parsedCues)
              : 'Chưa có phụ đề phân đoạn trải nghiệm sản phẩm.',
        ctaPart:
          totalCues > uspEndIdx
            ? joinCueGroup(parsedCues.slice(uspEndIdx))
            : totalCues > 0
              ? joinCueGroup(parsedCues.slice(-Math.min(2, totalCues)))
              : 'Chưa có phụ đề phân đoạn chốt đơn.',
      };

      const originalHookPlain = joinPlainText(parsedCues.slice(0, hookEndIdx));
      const originalBodyPlain = joinPlainText(parsedCues.slice(hookEndIdx, uspEndIdx));
      const originalCtaPlain = joinPlainText(parsedCues.slice(uspEndIdx));

      const scriptOutline = {
        hook3s: `[00:00 - 00:05] Mở đầu giữ chân (Hook): Quay cận cảnh kết cấu thực tế của ${productTitle} trên da/tay dưới ánh sáng tự nhiên. Lời thoại gợi ý: "${
          originalHookPlain
            ? `${originalHookPlain} — Đừng vội chốt đơn ${productTitle} nếu bạn chưa xem hết kiểm chứng thực tế này!`
            : `Đừng vội mua ${productTitle} nếu bạn chưa biết 3 điểm khác biệt thực tế này trên da!`
        }"`,
        problemLead: `[00:05 - 00:18] Dẫn dắt bối cảnh & Nỗi đau khách hàng: Nêu trực diện vấn đề người dùng hay gặp phải khi chọn sản phẩm cùng phân khúc và lý do quyết định thử ${productTitle}.${
          parsedCues.slice(hookEndIdx, painEndIdx).length > 0
            ? ` Bám sát mạch thoại gốc của KOC: "${joinPlainText(parsedCues.slice(hookEndIdx, painEndIdx))}"`
            : ''
        }`,
        bodyUsp: `[00:18 - 00:45] Trải nghiệm thực tế & Chứng minh công dụng USP: Thoa/sử dụng trực tiếp ${productTitle}, zoom cận độ thẩm thấu, độ hoàn thiện và so sánh trước/sau. ${
          originalBodyPlain
            ? `Nội dung lời thoại bóc tách đầy đủ từ video: "${originalBodyPlain}"`
            : 'So sánh trước & sau khi dùng, nhấn mạnh điểm khác biệt về bảng thành phần, cảm giác trên da và độ bền.'
        }`,
        socialProof: `[00:45 - 00:55] Tổng kết ưu/nhược điểm & Đối tượng phù hợp: Đánh giá khách quan điểm cộng lớn nhất của ${productTitle} và lưu ý cách dùng để đạt hiệu quả tối đa.`,
        ctaCart: `[00:55 - Kết thúc] Kêu gọi hành động & Chốt giỏ hàng (CTA): Chỉ tay về biểu tượng giỏ hàng góc trái màn hình. Lời thoại: "${
          originalCtaPlain
            ? `${originalCtaPlain} — Đợt này gian hàng chính hãng đang có deal trợ giá kèm quà tặng, mọi người bấm vào giỏ hàng góc trái màn hình để đặt nhé!`
            : `Đợt này gian hàng chính hãng đang trợ giá kèm quà tặng độc quyền, bấm ngay vào giỏ hàng màu vàng góc trái màn hình để áp voucher nhé!`
        }"`,
      };

      const scriptScenes = [
        {
          scene: 'Cảnh 1 (00:00 - 00:05): Mở đầu giữ chân (Hook 5s đầu)',
          visual: `Quay cận cảnh kết cấu ${productTitle} hoặc biểu cảm bất ngờ khi test sản phẩm dưới ánh sáng tự nhiên`,
          onScreenText: `Sự thật về ${productTitle} sau khi trải nghiệm thực tế`,
          voiceover: scriptOutline.hook3s,
        },
        {
          scene: 'Cảnh 2 (00:05 - 00:18): Bối cảnh & Nỗi đau khách hàng',
          visual: 'Quay góc trung cảnh KOC chia sẻ tình trạng thực tế trước khi dùng sản phẩm',
          onScreenText: 'Vấn đề thường gặp & Lý do chọn sản phẩm này',
          voiceover: scriptOutline.problemLead,
        },
        {
          scene: 'Cảnh 3 (00:18 - 00:45): Trải nghiệm thực tế & Chứng minh USP',
          visual: 'Cận cảnh thao tác sử dụng trên da/mặt, chia đôi màn hình Before/After rõ nét',
          onScreenText: 'Test trực tiếp độ thẩm thấu & Công dụng chính',
          voiceover: scriptOutline.bodyUsp,
        },
        {
          scene: 'Cảnh 4 (00:45 - 00:55): Đánh giá khách quan & Đối tượng phù hợp',
          visual: 'KOC cầm sản phẩm ngang mặt, tổng kết 3 điểm ăn tiền nhất',
          onScreenText: 'Ai nên dùng & Lưu ý quan trọng khi sử dụng',
          voiceover: scriptOutline.socialProof,
        },
        {
          scene: 'Cảnh 5 (00:55 - Kết thúc): Kêu gọi bấm Giỏ hàng TikTok Shop',
          visual: 'Chỉ tay xuống góc trái màn hình vị trí neo Giỏ hàng màu vàng kèm hiệu ứng mũi tên',
          onScreenText: 'Bấm Giỏ hàng góc trái nhận ưu đãi chính hãng',
          voiceover: scriptOutline.ctaCart,
        },
      ];

      const fullScriptText = [
        `=== KỊCH BẢN CHI TIẾT & BÓC TÁCH VIDEO (@${targetHandle}) ===`,
        `Sản phẩm trọng tâm: ${productTitle}`,
        `Nhận xét kênh: ${healthVerdict}`,
        `Hình thức khuyến nghị: ${suggestedFormat}`,
        '',
        '--- PHẦN 1: BÓC TÁCH KỊCH BẢN GỐC TỪ LỜI THOẠI VIDEO ---',
        `1. Mở đầu (Hook): \n${originalBreakdown.hookPart}`,
        `2. Dẫn dắt & Bối cảnh: \n${originalBreakdown.painPointPart}`,
        `3. Trải nghiệm & Chứng minh USP: \n${originalBreakdown.uspExperiencePart}`,
        `4. Kết bài & Kêu gọi hành động: \n${originalBreakdown.ctaPart}`,
        '',
        '--- PHẦN 2: KỊCH BẢN SẢN XUẤT ĐỀ XUẤT (5 PHÂN CẢNH CHI TIẾT) ---',
        ...scriptScenes.map(
          (s) => `${s.scene}\n- Cảnh quay: ${s.visual}\n- Chữ trên màn hình: ${s.onScreenText}\n- Lời thoại: ${s.voiceover}`
        ),
      ].join('\n');

      return NextResponse.json(
        {
          success: true,
          action: 'ANALYZE_CHANNEL_AND_SCRIPT',
          analysis: {
            handle: targetHandle,
            healthVerdict,
            channelEvaluation: healthVerdict,
            viewToFollowerPct,
            suggestedFormat,
            recommendation: suggestedFormat,
            strengths: [
              `View trung bình đạt ${new Intl.NumberFormat('vi-VN').format(avgViews)} lượt xem/bài (ER: ${er}%).`,
              `Tỷ lệ chuyển đổi nội dung thương mại phù hợp với mặt hàng ${productTitle}.`,
            ],
            originalBreakdown,
            scriptOutline,
            scriptScenes,
            fullScriptText,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // 5. Gửi ghi chú Báo lỗi / Góp ý của người dùng (Chỉ gửi khi bấm nút Gửi)
    if (body.action === 'SUBMIT_EXTENSION_FEEDBACK') {
      const note = String(body.feedbackText || body.note || '').trim();
      if (!note) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập nội dung ghi chú hoặc mô tả lỗi trước khi bấm Gửi.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const feedbackEntry = {
        id: `FB-${Date.now()}`,
        handle: normalizeHandle(body.handle) || 'user',
        platform: String(body.platform || 'tiktok'),
        pageUrl: String(body.pageUrl || ''),
        note,
        picName: String(body.picName || 'Nhân sự B2C'),
        submittedAt: nowIso,
      };
      return NextResponse.json(
        {
          success: true,
          action: 'SUBMIT_EXTENSION_FEEDBACK',
          message: 'Đã ghi nhận phản hồi của bạn về bộ phận kỹ thuật Upbase B2C.',
          submittedAt: nowIso,
          feedback: feedbackEntry,
        },
        { headers: CORS_HEADERS }
      );
    }

    const handle = normalizeHandle(body.handle);

    if (!handle) {
      return NextResponse.json(
        { success: false, error: 'Thiếu định danh kênh KOC (handle).' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (body.action === 'SYNC_ACCEPTANCE_SCREENSHOT') {
      const videoUrl = String(body.videoUrl || '').trim();
      const videoId = String(body.videoId || extractSystemVideoId(videoUrl) || `ext-${Date.now()}`).trim();
      const dealCode = String(body.dealCode || '').trim();
      const imageDataUrl = String(body.imageDataUrl || '').trim();
      const captionQuote = String(body.captionQuote || body.productName || '').trim();
      const timeLabel = String(body.timeLabel || '00:00').trim();
      const sourceMode = body.sourceMode || 'VIDEO_FRAME';

      if (!imageDataUrl) {
        return NextResponse.json(
          { success: false, error: 'Thiếu dữ liệu ảnh imageDataUrl.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const screenshotItem = {
        id: `shot-${Date.now()}-${(++extShotSeq).toString(36).padStart(4, '0')}`,
        videoUrl: videoUrl || `https://www.tiktok.com/@${handle}/video/${videoId}`,
        videoId,
        authorHandle: handle,
        timestampSec: Number(body.timestampSec || 0),
        timeLabel,
        matchedTerm: body.matchedTerm || body.productName || 'Sản phẩm nghiệm thu',
        captionQuote,
        imageDataUrl,
        capturedAt: new Date().toISOString(),
        sourceMode,
        note: body.note || `Ảnh chụp từ Upbase B2C Extension (${sourceMode === 'FULL_SCREEN' ? 'Màn hình bài đăng' : 'Khung hình SP'})`,
      };

      await upsertRecord<any[]>(
        'video-acceptance-screenshots-v1',
        [],
        (current) => {
          const list = Array.isArray(current) ? [...current] : [];
          const primaryKey = dealCode || videoId || handle;
          const bucketIdx = list.findIndex(
            (b: any) =>
              b.key === primaryKey ||
              (dealCode && b.dealCode === dealCode) ||
              (videoId && b.videoId === videoId)
          );
          const bucket =
            bucketIdx >= 0
              ? list[bucketIdx]
              : {
                  key: primaryKey,
                  dealCode: dealCode || undefined,
                  videoId,
                  authorHandle: handle,
                  videoUrl,
                  updatedAt: new Date().toISOString(),
                  items: [],
                };
          bucket.items = [screenshotItem, ...(bucket.items || [])].slice(0, 20);
          bucket.updatedAt = new Date().toISOString();
          if (bucketIdx >= 0) {
            list[bucketIdx] = bucket;
          } else {
            list.unshift(bucket);
          }
          return list.slice(0, 50);
        }
      );

      return NextResponse.json(
        {
          success: true,
          action: 'SYNC_ACCEPTANCE_SCREENSHOT',
          message: `Đã lưu ảnh chụp nghiệm thu bài đăng #${videoId} của @${handle} vào hệ thống Web-Admin.`,
          screenshotId: screenshotItem.id,
          data: screenshotItem,
        },
        { headers: CORS_HEADERS }
      );
    }

    if (body.action === 'VERIFY_AIR_LINK') {
      const videoUrl = String(body.videoUrl || '').trim();
      const videoId = String(body.videoId || extractSystemVideoId(videoUrl) || `ext-${Date.now()}`).trim();
      const views = Math.max(0, Math.round(Number(body.views || 0)));
      const likes = Math.max(0, Math.round(Number(body.likes || 0)));
      const comments = Math.max(0, Math.round(Number(body.comments || 0)));
      const shares = Math.max(0, Math.round(Number(body.shares || 0)));
      const costNet = Math.max(0, Math.round(Number(body.rateCardNet || 0)));
      const storeName = String(body.storeName || 'ClubClio_TikTok_E2E-S').trim();
      const brandName = String(body.brandName || storeName.split('_')[0] || 'ClubClio').trim();
      const picName = String(body.picName || actor?.name || 'Chuyên viên B2C').trim();
      const rawPlat = String(body.platform || '').toLowerCase();
      const detectedPlat: 'tiktok' | 'threads' | 'facebook' | 'shopee' | 'instagram' =
        rawPlat.includes('thread') || /threads\.(net|com)/i.test(videoUrl)
          ? 'threads'
          : rawPlat.includes('facebook') || rawPlat === 'fb' || /facebook\.com|fb\.watch/i.test(videoUrl)
          ? 'facebook'
          : rawPlat.includes('shopee') || /shopee\.|shp\.ee/i.test(videoUrl)
          ? 'shopee'
          : rawPlat.includes('instagram') || rawPlat === 'ig' || /instagram\.com/i.test(videoUrl)
          ? 'instagram'
          : 'tiktok';

      if (detectedPlat !== 'tiktok') {
        await saveMultiPlatformExtensionCapture({
          contentId: videoId,
          platform: detectedPlat,
          postUrl: videoUrl,
          handle,
          displayName: body.displayName || handle,
          publishedAt: body.publishedAt || vnDate,
          caption: String(body.caption || ''),
          hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
          views,
          likes,
          comments,
          shares,
          hasProductLink: Boolean(
            body.hasYellowCart ||
              body.cartAnchorUrl ||
              (Array.isArray(body.cartProducts) && body.cartProducts.length > 0)
          ),
          productTitle: body.cartAnchorTitle || body.cartProducts?.[0]?.title || null,
          productUrl: body.cartAnchorUrl || body.cartProducts?.[0]?.productUrl || null,
          productId: body.cartProductId || body.cartProducts?.[0]?.productId || null,
          sellerId: body.cartSellerId || body.cartProducts?.[0]?.sellerId || null,
          cartProducts: Array.isArray(body.cartProducts) ? body.cartProducts : [],
          source: 'extension-dom-verified',
          updatedAt: new Date().toISOString(),
        });
      }

      // Đẩy toàn bộ dữ liệu Giỏ hàng (cartProducts), Phụ đề (transcriptText) và MP4 (playableUrl) từ trình duyệt vào bộ nhớ đệm Server
      injectExtensionCapturedVideoToCache({
        videoId,
        handle,
        nickname: body.displayName || handle,
        avatarUrl: body.avatarUrl,
        caption: body.caption,
        hashtags: body.hashtags,
        publishedAt: body.publishedAt || vnDate,
        views,
        likes,
        comments,
        shares,
        durationSeconds: body.durationSeconds,
        hasCartAnchor: Boolean(body.hasYellowCart || (body.cartProducts && body.cartProducts.length > 0)),
        cartAnchorTitle: body.cartAnchorTitle || body.cartProducts?.[0]?.title,
        cartAnchorUrl: body.cartAnchorUrl || body.cartProducts?.[0]?.productUrl,
        cartProductId: body.cartProductId || body.cartProducts?.[0]?.productId,
        cartSellerId: body.cartSellerId || body.cartProducts?.[0]?.sellerId,
        cartProducts: body.cartProducts,
        transcriptText: body.transcriptText,
        subtitleUrl: body.subtitleUrl,
        playableUrl: body.playableUrl,
        onScreenStickers: body.onScreenStickers,
      });

      const updatedHistory = await upsertRecord<KocVideoWeeklyHistoryStoreData>(
        KOC_VIDEO_HISTORY_RECORD_KEY,
        buildInitialWeeklyHistoryStore(),
        (current) => {
          return registerNewSystemVideo(current, {
            videoId,
            linkAir: videoUrl || `https://www.tiktok.com/@${handle}/video/${videoId}`,
            kocChannelId: handle,
            kocStageName: body.displayName || handle,
            brandName,
            storeName,
            productName:
              body.cartProducts?.[0]?.title ||
              body.cartAnchorTitle ||
              body.note ||
              'Sản phẩm chiến dịch B2C',
            dealCode: body.dealCode || `BO2610-${videoId.slice(-5)}`,
            pic: picName,
            klGrade: getSalaryGradeFromRate(costNet),
            airDate: body.publishedAt ? body.publishedAt.slice(0, 10) : vnDate,
            bookingCostNet: costNet,
            videoTitle: String(body.caption || '').slice(0, 180),
            weekKey: '2026-W44',
            initialViews: views,
          }).nextStore;
        }
      );

      const cartSummary =
        body.cartProducts && body.cartProducts.length > 0
          ? ` · Đã lưu ${body.cartProducts.length} SP trong giỏ (${body.cartProducts[0].title.slice(0, 38)})`
          : '';

      return NextResponse.json(
        {
          success: true,
          action: 'VERIFY_AIR_LINK',
          message: `Đã nghiệm thu bài đăng #${videoId} của @${handle} (${new Intl.NumberFormat('vi-VN').format(views)} lượt xem${cartSummary}) về hệ thống Upbase B2C.`,
          videoId,
          totalRegisteredVideos: Object.keys(updatedHistory.data.registeredVideosById || {}).length,
        },
        { headers: CORS_HEADERS }
      );
    }

    // SYNC_KOC_PROFILE hoặc CREATE_DEAL_PROPOSAL
    const followers = Math.max(0, Math.round(Number(body.followers || 0)));
    const avgViews = Math.max(0, Math.round(Number(body.avgViews || 0)));
    const medianViews = Math.max(0, Math.round(Number(body.medianViews || avgViews)));
    const rateNet = Math.max(0, Math.round(Number(body.rateCardNet || 0)));
    const existingMaster = resolveMasterKocByHandle(handle);

    if (Array.isArray(body.recentVideos)) {
      for (const rv of body.recentVideos.slice(0, 30)) {
        if (rv.videoId) {
          injectExtensionCapturedVideoToCache({
            videoId: String(rv.videoId),
            handle,
            nickname: body.displayName || handle,
            avatarUrl: body.avatarUrl,
            caption: rv.caption,
            hashtags: rv.hashtags,
            publishedAt: rv.publishedAt || vnDate,
            views: rv.views,
            likes: rv.likes,
            comments: rv.comments,
            shares: rv.shares,
            durationSeconds: rv.durationSeconds,
            hasCartAnchor: Boolean(rv.hasCartAnchor || rv.isSponsored || (rv.cartProducts && rv.cartProducts.length > 0)),
            cartAnchorTitle: rv.cartAnchorTitle || rv.cartProducts?.[0]?.title,
            cartAnchorUrl: rv.cartAnchorUrl || rv.cartProducts?.[0]?.productUrl,
            cartProductId: rv.cartProductId || rv.cartProducts?.[0]?.productId,
            cartSellerId: rv.cartSellerId || rv.cartProducts?.[0]?.sellerId,
            cartProducts: rv.cartProducts,
            transcriptText: rv.transcriptText,
            subtitleUrl: rv.subtitleUrl,
            playableUrl: rv.playableUrl,
            onScreenStickers: rv.onScreenStickers,
          });
        }
      }
    }

    const mappedVideos: TikTokVideoItem[] = Array.isArray(body.recentVideos)
      ? body.recentVideos.slice(0, 30).map((v) => ({
          videoId: String(v.videoId || ''),
          videoUrl: String(v.videoUrl || `https://www.tiktok.com/@${handle}/video/${v.videoId}`),
          caption: String(v.caption || ''),
          hashtags: Array.isArray(v.hashtags) ? v.hashtags : [],
          publishedAt: String(v.publishedAt || vnDate),
          musicTitle: 'Âm thanh gốc',
          views: Math.max(0, Math.round(Number(v.views || 0))),
          likes: Math.max(0, Math.round(Number(v.likes || 0))),
          comments: Math.max(0, Math.round(Number(v.comments || 0))),
          shares: Math.max(0, Math.round(Number(v.shares || 0))),
          engagementRate: Number(v.engagementRate || 0),
          isAffiliate: Boolean(v.isSponsored),
        }))
      : existingMaster?.recentVideos || [];

    const isFocProposal = body.bookingFormatLabel === 'Suất gửi mẫu FOC';
    const masterRate = Math.round(Number(existingMaster?.rateCardVideo || 0));
    const effectiveRate = isFocProposal
      ? 0
      : body.action === 'SYNC_KOC_PROFILE' && masterRate > 0
        ? masterRate
        : rateNet > 0
          ? rateNet
          : masterRate;
    const salaryGrade =
      body.action === 'SYNC_KOC_PROFILE' && existingMaster?.salaryGrade && !isFocProposal
        ? existingMaster.salaryGrade
        : getSalaryGradeFromRate(effectiveRate);
    const segment =
      body.action === 'SYNC_KOC_PROFILE' && existingMaster?.segment && !isFocProposal
        ? existingMaster.segment
        : getSegmentFromSalaryGrade(salaryGrade);
    const tierInfo = getTierFromFollowers(followers || existingMaster?.followers || 10000);
    const storeName = String(body.storeName || existingMaster?.proposedStores || '').trim();
    const brandName = String(
      body.brandName || (storeName ? storeName.split('_')[0] : existingMaster?.brandName || '')
    ).trim();
    const routing = storeName ? resolveStoreApprover(storeName, brandName) : null;

    const bookingFormatMap: Record<string, KocItem['bookingFormat']> = {
      'Video trả phí': 'Booking Video KOC',
      'Suất gửi mẫu FOC': 'Booking Video KOC',
      'Video Affiliate': 'Affiliate Thuần',
    };

    const updatedRecord = await upsertRecord<KocDirectoryChangesData>(
      KOC_DIRECTORY_KEY,
      { itemsByHandle: {}, updatedAt: nowIso },
      (current) => {
        const prev = current.itemsByHandle?.[handle] || existingMaster;
        const nextItem: KocItem = {
          ...(prev || {
            id: `koc-ext-${handle}`,
            channelId: handle,
            stageName: body.displayName || handle,
            realName: body.displayName || handle,
            tier: tierInfo.tier,
            tierLabel: tierInfo.tierLabel,
            salaryGrade,
            segment,
            tepKenh: 'Review Nữ',
            kocCategory: 'Reviewer',
            niche: 'Chăm sóc cá nhân & Làm đẹp',
            followers,
            avgViews,
            rateCardVideo: effectiveRate,
            reliabilityScore: 0,
          }),
          channelId: handle,
          channelLink:
            body.platform === 'threads'
              ? `https://www.threads.net/@${handle}`
              : body.platform === 'facebook'
                ? `https://www.facebook.com/${handle}`
                : body.platform === 'instagram'
                  ? `https://www.instagram.com/${handle}/`
                  : body.platform === 'douyin'
                    ? `https://www.douyin.com/user/${handle}`
                    : `https://www.tiktok.com/@${handle}`,
          stageName: body.displayName || prev?.stageName || handle,
          avatarUrl: body.avatarUrl || prev?.avatarUrl,
          bio: body.bio ?? prev?.bio,
          followers: followers > 0 ? followers : prev?.followers || 0,
          avgViews: avgViews > 0 ? avgViews : prev?.avgViews || 0,
          medianViews: medianViews > 0 ? medianViews : prev?.medianViews || 0,
          totalLikes: body.totalLikes ? Math.round(Number(body.totalLikes)) : prev?.totalLikes,
          videoCount: body.videoCount ? Math.round(Number(body.videoCount)) : prev?.videoCount,
          avgLikes: body.avgLikes ? Math.round(Number(body.avgLikes)) : prev?.avgLikes,
          avgComments: body.avgComments ? Math.round(Number(body.avgComments)) : prev?.avgComments,
          avgShares: body.avgShares ? Math.round(Number(body.avgShares)) : prev?.avgShares,
          engagementRate:
            typeof body.engagementRate === 'number' ? body.engagementRate : prev?.engagementRate,
          rateCardVideo: effectiveRate,
          salaryGrade,
          segment,
          phone: body.extractedPhone || prev?.phone || '',
          email: body.extractedEmail || prev?.email || '',
          recentRevenue:
            body.recentRevenue !== undefined
              ? Math.max(0, Math.round(Number(body.recentRevenue)))
              : prev?.recentRevenue,
          gmvBestCase:
            body.recentRevenue !== undefined
              ? Math.max(
                  Math.round(Number(body.recentRevenue)),
                  Math.round(Number(prev?.gmvBestCase || 0))
                )
              : prev?.gmvBestCase,
          itemsSold:
            body.itemsSold !== undefined
              ? Math.max(0, Math.round(Number(body.itemsSold)))
              : prev?.itemsSold,
          gpm:
            body.gpm !== undefined ? Math.max(0, Math.round(Number(body.gpm))) : prev?.gpm,
          aov:
            body.aov !== undefined ? Math.max(0, Math.round(Number(body.aov))) : prev?.aov,
          gmvShareVideo:
            body.gmvShareVideo !== undefined ? Number(body.gmvShareVideo) : prev?.gmvShareVideo,
          gmvShareLive:
            body.gmvShareLive !== undefined ? Number(body.gmvShareLive) : prev?.gmvShareLive,
          gmvShareProductCard:
            body.gmvShareProductCard !== undefined
              ? Number(body.gmvShareProductCard)
              : prev?.gmvShareProductCard,
          maleRatio: body.maleRatio !== undefined ? Number(body.maleRatio) : prev?.maleRatio,
          femaleRatio:
            body.femaleRatio !== undefined ? Number(body.femaleRatio) : prev?.femaleRatio,
          age18_24: body.age18_24 !== undefined ? Number(body.age18_24) : prev?.age18_24,
          age25_34: body.age25_34 !== undefined ? Number(body.age25_34) : prev?.age25_34,
          age35Plus: body.age35Plus !== undefined ? Number(body.age35Plus) : prev?.age35Plus,
          location: body.location || prev?.location || '',
          tiktokSellerSyncedAt:
            body.recentRevenue !== undefined ? nowIso : prev?.tiktokSellerSyncedAt,
          brandName: brandName || prev?.brandName,
          proposedStores: storeName || prev?.proposedStores,
          bookingFormat:
            (body.bookingFormatLabel && bookingFormatMap[body.bookingFormatLabel]) ||
            prev?.bookingFormat ||
            'Booking Video KOC',
          collabGroupLabel:
            body.bookingFormatLabel === 'Suất gửi mẫu FOC'
              ? 'KOC Miễn phí (FOC)'
              : body.bookingFormatLabel === 'Video trả phí'
                ? 'KOC Trả phí (Paid)'
                : prev?.collabGroupLabel || 'Paid + FOC',
          brandApprovalStatus:
            body.action === 'CREATE_DEAL_PROPOSAL'
              ? 'CHỜ_DUYỆT'
              : prev?.brandApprovalStatus || 'ĐÃ_DUYỆT',
          bookingPic: body.picName || prev?.bookingPic || actor?.name || 'Chuyên viên B2C',
          contentNote: body.note || prev?.contentNote,
          metricsUpdatedAt: vnDate,
          sourceSheet: 'Upbase B2C Chrome Extension',
          recentVideos: mappedVideos.length > 0 ? mappedVideos : prev?.recentVideos,
        };

        return {
          itemsByHandle: {
            ...(current.itemsByHandle || {}),
            [handle]: nextItem,
          },
          updatedAt: nowIso,
        };
      }
    );

    const savedKoc = updatedRecord.data.itemsByHandle[handle];

    if (body.action === 'CREATE_DEAL_PROPOSAL' && storeName) {
      const monthKey = String(body.planMonth || vnDate.slice(0, 7).replace('-', '/')).trim();
      const sheetKey = makeSheetKey(monthKey, storeName);
      const proposalRow = buildStaffListingRowFromKoc({
        koc: savedKoc,
        monthKey,
        staffName: savedKoc.bookingPic || actor.name || 'Chuyên viên B2C',
        storeName,
        dot: 'Đợt 1',
      });
      if (body.note || savedKoc.contentNote) {
        proposalRow.contentNote = body.note || savedKoc.contentNote || '';
      }
      await upsertRecord<StaffBrandSheetCollection>(
        'staff-brand-listing-sheets-v1',
        { sheets: {}, googleSheetUrls: {} },
        (col) => {
          const sheets = { ...(col?.sheets || {}) };
          const existingRows = Array.isArray(sheets[sheetKey]) ? [...sheets[sheetKey]] : [];
          const dupIdx = existingRows.findIndex(
            (r) => normalizeHandle(r.idKenh) === handle
          );
          if (dupIdx >= 0) {
            existingRows[dupIdx] = {
              ...existingRows[dupIdx],
              giaNetVideo: effectiveRate || existingRows[dupIdx].giaNetVideo,
              contentNote: body.note || existingRows[dupIdx].contentNote,
            };
          } else {
            existingRows.unshift(proposalRow);
          }
          sheets[sheetKey] = existingRows;
          return {
            sheets,
            googleSheetUrls: col?.googleSheetUrls || {},
            fieldEditPolicy: col?.fieldEditPolicy,
          };
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        action: body.action,
        handle,
        message:
          body.action === 'CREATE_DEAL_PROPOSAL'
            ? `Đã lưu đề xuất Booking @${handle} cho gian hàng ${storeName || brandName} (${routing?.routingLabel || 'Trình duyệt B2C'}).`
            : `Đã đồng bộ chỉ số kênh @${handle} (${new Intl.NumberFormat('vi-VN').format(savedKoc.followers)} followers · View TB ${new Intl.NumberFormat('vi-VN').format(savedKoc.avgViews)}) về Danh bạ KOC.`,
        koc: {
          id: savedKoc.id,
          channelId: savedKoc.channelId,
          stageName: savedKoc.stageName,
          salaryGrade: savedKoc.salaryGrade,
          followers: savedKoc.followers,
          avgViews: savedKoc.avgViews,
          medianViews: savedKoc.medianViews,
          engagementRate: savedKoc.engagementRate,
          rateCardVideo: savedKoc.rateCardVideo,
          brandName: savedKoc.brandName,
          proposedStores: savedKoc.proposedStores,
          bookingPic: savedKoc.bookingPic,
          metricsUpdatedAt: savedKoc.metricsUpdatedAt,
        },
        deal:
          body.action === 'CREATE_DEAL_PROPOSAL'
            ? {
                dealCode: `BO2610-${Date.now().toString().slice(-6)}`,
                handle,
                storeName,
                brandName,
                bookingFormatLabel: body.bookingFormatLabel || 'Video trả phí',
                rateCardNet: effectiveRate,
                picName: savedKoc.bookingPic,
                status: 'CHỜ_DUYỆT',
              }
            : undefined,
        routing,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Lỗi đồng bộ dữ liệu từ Extension về hệ thống.',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
