import { NextRequest, NextResponse } from 'next/server';
import type { BookingDealItem, KocItem, KocTier, TikTokVideoItem } from '@/lib/types';
import { getSalaryGradeFromRate, getSegmentFromSalaryGrade } from '@/lib/types';
import { UPBASE_FULL_KOC_MASTER } from '@/lib/kocMasterDataset';
import { REAL_KOC_COOPERATION_DEALS } from '@/lib/realKocMasterData';
import { REAL_B2C_69_STORES } from '@/lib/realB2cPlanData';
import { USERS } from '@/lib/mockData';
import { requestActor } from '@/lib/server/requestActor';
import { readRecord, upsertRecord } from '@/lib/server/sharedRecords';
import type { KocDirectoryChangesData } from '@/app/api/kocs/route';
import {
  KOC_VIDEO_HISTORY_RECORD_KEY,
  buildInitialWeeklyHistoryStore,
  extractSystemVideoId,
  ingestWeeklyRowsBySystemVideoId,
  registerNewSystemVideo,
  type KocVideoWeeklyHistoryStoreData,
  type WeeklyVideoInputRow,
} from '@/lib/kocVideoWeeklyHistory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KOC_DIRECTORY_KEY = 'koc-directory-changes';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Upbase-Ext-Version',
  'Cache-Control': 'no-store',
};

const LEADER_NGOC_TAM_KEYWORDS = [
  'clubclio',
  'cindy bloom',
  'cindybloom',
  'mine',
  'eupc',
  'loccitane',
  "l'occitane",
  'bye bye blemish',
  'byebyeblemish',
  'rejuran',
];

function resolveStoreApprover(storeName: string, brandName: string): {
  leaderName: string;
  directorName: string;
  routingLabel: string;
} {
  const combined = `${storeName} ${brandName}`.toLowerCase();
  const hasNgocTam = LEADER_NGOC_TAM_KEYWORDS.some((kw) => combined.includes(kw));
  if (hasNgocTam) {
    return {
      leaderName: 'Nguyễn Thị Ngọc Tâm',
      directorName: 'Đặng Thị Yến Nhi',
      routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
    };
  }
  return {
    leaderName: 'Trực tiếp (Không qua Leader)',
    directorName: 'Đặng Thị Yến Nhi',
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
let dealsByHandle: Map<string, BookingDealItem[]> | null = null;

function ensureMasterIndexes() {
  if (!masterKocByHandle) {
    masterKocByHandle = new Map<string, KocItem>();
    for (const item of UPBASE_FULL_KOC_MASTER) {
      const key = normalizeHandle(item.channelId || item.id);
      if (key && !masterKocByHandle.has(key)) {
        masterKocByHandle.set(key, item);
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

async function resolveActor(req: NextRequest) {
  const actor = await requestActor(req).catch(() => null);
  if (actor) return actor;
  return USERS[0];
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    ensureMasterIndexes();
    const { searchParams } = new URL(req.url);
    const handle = normalizeHandle(searchParams.get('handle'));

    const customRecord = await readRecord<KocDirectoryChangesData>(KOC_DIRECTORY_KEY, {
      itemsByHandle: {},
      updatedAt: new Date(0).toISOString(),
    });

    const videoHistoryRecord = await readRecord<KocVideoWeeklyHistoryStoreData>(
      KOC_VIDEO_HISTORY_RECORD_KEY,
      buildInitialWeeklyHistoryStore()
    );

    const registeredVideos = Object.values(videoHistoryRecord.data.registeredVideosById || {})
      .slice(0, 40)
      .map((v, idx) => ({
        videoId: v.videoId,
        dealCode: v.dealCode || `BO2610-${v.videoId.slice(-5)}`,
        kocChannelId: v.kocChannelId,
        kocStageName: v.kocStageName,
        brandName: v.brandName,
        storeName: v.storeName,
        productName: v.productName,
        bookingCostNet: Math.round(Number(v.bookingCostNet || 0)),
        sparkAdsCode:
          v.sparkAdsCode ||
          `#${v.kocChannelId.slice(0, 6).toUpperCase()}2610${String(idx + 11).padStart(2, '0')}Q`,
        authorizationType: v.authorizationType || 'Chờ nạp mã Ads (30 ngày)',
        pic: v.pic || '—',
      }));

    const customKoc = handle ? customRecord.data.itemsByHandle?.[handle] : undefined;
    const masterKoc = handle ? masterKocByHandle?.get(handle) : undefined;
    const mergedKoc: KocItem | null = customKoc
      ? { ...(masterKoc || {}), ...customKoc }
      : masterKoc || null;

    const historyDeals = handle ? dealsByHandle?.get(handle) || [] : [];

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
        sourceType: customKoc ? 'CUSTOM_SYNCED' : masterKoc ? 'MASTER_DATA' : 'NEW_DISCOVERY',
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
                ? `${mergedKoc.bankName || 'NH'} · ${maskSensitive(mergedKoc.bankAccount)}`
                : '—',
              sharedMcnInfo: mergedKoc.sharedMcnInfo || null,
              metricsUpdatedAt: mergedKoc.metricsUpdatedAt || null,
              // Chỉ số TikTok Seller / Affiliate
              recentRevenue: Math.round(Number(mergedKoc.recentRevenue || mergedKoc.gmvBestCase || 0)),
              itemsSold: Math.round(Number(mergedKoc.itemsSold || 0)),
              gpm: Math.round(Number(mergedKoc.gpm || 0)),
              aov: Math.round(Number(mergedKoc.aov || 0)),
              gmvShareVideo: Number(mergedKoc.gmvShareVideo ?? 80),
              gmvShareLive: Number(mergedKoc.gmvShareLive ?? 14),
              gmvShareProductCard: Number(mergedKoc.gmvShareProductCard ?? 6),
              maleRatio: Number(mergedKoc.maleRatio ?? 22),
              femaleRatio: Number(mergedKoc.femaleRatio ?? 78),
              age18_24: Number(mergedKoc.age18_24 ?? 35),
              age25_34: Number(mergedKoc.age25_34 ?? 45),
              age35Plus: Number(mergedKoc.age35Plus ?? 20),
              location: mergedKoc.location || 'Việt Nam',
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
    | 'VERIFY_SPARK_ADS_CODES';
  platform?: 'tiktok' | 'instagram' | 'tiktok_ads';
  handle?: string;
  adsRows?: Array<{
    videoId: string;
    dealCode?: string;
    handle?: string;
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
    status: 'AUTHORIZED' | 'EXPIRED' | 'INVALID';
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
  dealCode?: string;
}

export async function POST(req: NextRequest) {
  try {
    ensureMasterIndexes();
    const actor = await resolveActor(req);
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
      const incomingRows = Array.isArray(body.adsRows) ? body.adsRows : [];
      if (incomingRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Chưa có dòng dữ liệu báo cáo Ads cần đồng bộ.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const weeklyInputRows: WeeklyVideoInputRow[] = incomingRows.map((r) => ({
        videoId: String(r.videoId || ''),
        dealCode: r.dealCode || undefined,
        tiktokAccount: r.handle || 'koc_ads',
        brandName: r.brandName || (r.storeName ? r.storeName.split('_')[0] : 'ClubClio'),
        storeName: r.storeName || 'ClubClio_TikTok_E2E-S',
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
            importedBy: String(body.picName || actor?.name || 'Trần Hữu Chiến'),
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
      const codes = Array.isArray(body.sparkCodes) ? body.sparkCodes : [];
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
              nextRegisteredById[vidKey] = {
                ...nextRegisteredById[vidKey],
                sparkAdsCode: item.sparkAdsCode,
                authorizationType:
                  item.status === 'AUTHORIZED'
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

    const handle = normalizeHandle(body.handle);

    if (!handle) {
      return NextResponse.json(
        { success: false, error: 'Thiếu định danh kênh KOC (handle).' },
        { status: 400, headers: CORS_HEADERS }
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
      const picName = String(body.picName || actor?.name || 'Trần Hữu Chiến').trim();

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
            productName: body.note || 'Sản phẩm chiến dịch B2C',
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

      return NextResponse.json(
        {
          success: true,
          action: 'VERIFY_AIR_LINK',
          message: `Đã nghiệm thu bài đăng #${videoId} của @${handle} (${new Intl.NumberFormat('vi-VN').format(views)} lượt xem) về hệ thống Upbase B2C.`,
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
    const existingMaster = masterKocByHandle?.get(handle);

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

    const effectiveRate = rateNet > 0 ? rateNet : Math.round(Number(existingMaster?.rateCardVideo || 0));
    const salaryGrade = getSalaryGradeFromRate(effectiveRate);
    const segment = getSegmentFromSalaryGrade(salaryGrade);
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
            reliabilityScore: 9.0,
          }),
          channelId: handle,
          channelLink:
            body.platform === 'instagram'
              ? `https://www.instagram.com/${handle}/`
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
          location: body.location || prev?.location || 'Việt Nam',
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
          bookingPic: body.picName || prev?.bookingPic || actor?.name || 'Trần Hữu Chiến',
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
