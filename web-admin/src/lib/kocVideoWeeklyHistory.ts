import {
  B2C_BOOKED_VIDEOS_OCT_2026,
  TIKTOK_SELLER_TOP_CREATIVES,
} from './b2cAnalyticsDataset';
import { INITIAL_DEALS, INITIAL_KOCS } from './mockData';
import type {
  AdsReportParseResult,
  BookingDealItem,
  KocItem,
} from './types';

export const KOC_VIDEO_HISTORY_RECORD_KEY = 'koc-video-weekly-history-store-v1';
export const KOC_VIDEO_HISTORY_LOCAL_STORAGE_KEY = 'upbase_b2c_koc_video_weekly_history_v1';
export const KOC_VIDEO_HISTORY_UPDATED_EVENT = 'upbase-koc-video-weekly-history-updated';

export interface SystemRegisteredVideo {
  videoId: string;
  dealCode: string;
  kocId: string;
  kocChannelId: string;
  kocStageName: string;
  brandName: string;
  storeName: string;
  productName: string;
  productId?: string;
  campaignName: string;
  videoTitle: string;
  linkAir: string;
  airDate: string;
  weekLabel: string;
  pic: string;
  klGrade: string;
  bookingCostNet: number;
  sparkAdsCode?: string;
  authorizationType?: string;
  source: 'SYSTEM_BOOKING' | 'TIKTOK_CREATIVE' | 'API_REGISTERED' | 'MANUAL_REGISTERED';
  registeredAt: string;
}

export interface VideoWeeklySnapshotItem {
  id: string; // `${videoId}__${weekKey}`
  videoId: string;
  weekKey: string; // e.g. '2026-W40', '2026-W41', '2026-W42'
  weekLabel: string; // e.g. 'Tuần 40 (01/10 - 07/10/2026)'
  reportDateRange: string;
  dealCode: string;
  kocId: string;
  kocChannelId: string;
  kocStageName: string;
  brandName: string;
  storeName: string;
  productName: string;
  campaignName: string;
  videoTitle: string;
  linkAir: string;
  bookingCostNet: number;
  adsSpend: number;
  gmv: number;
  orders: number;
  roas: number;
  totalRoi: number;
  cpa: number;
  views: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cvr: number;
  hookRate2s: number;
  viewRate6s: number;
  completionRate100: number;
  authorizationType: string;
  explorationStatus: string;
  isMatchedSystemVideo: boolean;
  sourceFileName: string;
  updatedAt: string;
}

export interface WeeklyHistoryBatchLog {
  id: string;
  weekKey: string;
  weekLabel: string;
  dateRange: string;
  sourceType: 'EXCEL_UPLOAD' | 'API_INGEST' | 'SYSTEM_SEED';
  fileName: string;
  totalRows: number;
  matchedSystemVideos: number;
  unmatchedVideos: number;
  totalAdsSpend: number;
  totalGmv: number;
  totalOrders: number;
  overallRoas: number;
  importedBy: string;
  importedAt: string;
}

export interface KocWeeklyTimelinePoint {
  weekKey: string;
  weekLabel: string;
  activeVideosCount: number;
  adsSpend: number;
  gmv: number;
  orders: number;
  views: number;
  roas: number;
}

export interface KocWeeklyAggregatedHistory {
  kocId: string;
  kocChannelId: string;
  kocStageName: string;
  brands: string[];
  stores: string[];
  totalRegisteredVideos: number;
  videoIds: string[];
  weeksTracked: string[];
  totalBookingCostNet: number;
  cumulativeAdsSpend: number;
  cumulativeGmv: number;
  cumulativeOrders: number;
  cumulativeViews: number;
  overallAdsRoas: number;
  overallTotalRoi: number;
  avgHookRate2s: number;
  avgCtr: number;
  weeklyTimeline: KocWeeklyTimelinePoint[];
}

export interface KocVideoWeeklyHistoryStoreData {
  registeredVideosById: Record<string, SystemRegisteredVideo>;
  snapshotsByKey: Record<string, VideoWeeklySnapshotItem>;
  batches: WeeklyHistoryBatchLog[];
  updatedAt: string;
}

export interface WeeklyVideoInputRow {
  videoId: string;
  videoUrl?: string;
  videoTitle?: string;
  tiktokAccount?: string;
  dealCode?: string;
  brandName?: string;
  storeName?: string;
  productName?: string;
  productId?: string;
  campaignName?: string;
  adsSpend?: number;
  cost?: number;
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
  authorizationType?: string;
  explorationStatus?: string;
}

export const STANDARD_WEEK_OPTIONS: Array<{
  weekKey: string;
  weekLabel: string;
  dateRange: string;
}> = [
  {
    weekKey: '2026-W43',
    weekLabel: 'Tuần 43 (16/10 - 22/10/2026)',
    dateRange: '2026-10-16 ~ 2026-10-22',
  },
  {
    weekKey: '2026-W42',
    weekLabel: 'Tuần 42 (09/10 - 15/10/2026)',
    dateRange: '2026-10-09 ~ 2026-10-15',
  },
  {
    weekKey: '2026-W41',
    weekLabel: 'Tuần 41 (02/10 - 08/10/2026)',
    dateRange: '2026-10-02 ~ 2026-10-08',
  },
  {
    weekKey: '2026-W40',
    weekLabel: 'Tuần 40 (25/09 - 01/10/2026)',
    dateRange: '2026-09-25 ~ 2026-10-01',
  },
  {
    weekKey: '2026-W39',
    weekLabel: 'Tuần 39 (18/09 - 24/09/2026)',
    dateRange: '2026-09-18 ~ 2026-09-24',
  },
];

export function normalizeChannelHandle(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
    .split(/[/?#]/)[0]
    .replace(/^@+/, '')
    .trim();
}

export function normalizeCreatorLookupKey(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tách chuẩn videoId từ chuỗi bất kỳ (Link TikTok `/video/769388...` hoặc mã videoId trực tiếp)
 */
export function extractSystemVideoId(rawInput?: string | null): string {
  if (!rawInput) return '';
  const trimmed = String(rawInput).trim();
  const urlMatch = trimmed.match(/\/video\/(\d{10,25})/i);
  if (urlMatch) return urlMatch[1];
  const digitsMatch = trimmed.match(/\b(\d{15,22})\b/);
  if (digitsMatch) return digitsMatch[1];
  return trimmed.replace(/\s+/g, '');
}

export function resolveWeekMeta(weekKeyInput?: string, rawLabel?: string): {
  weekKey: string;
  weekLabel: string;
  dateRange: string;
} {
  const clean = (weekKeyInput || '').trim().toUpperCase();
  const found = STANDARD_WEEK_OPTIONS.find(
    (w) => w.weekKey.toUpperCase() === clean || (rawLabel && rawLabel.includes(w.weekKey.replace('2026-', '')))
  );
  if (found) return found;

  const wMatch = (clean || rawLabel || '').match(/W(\d{1,2})/i);
  if (wMatch) {
    const wn = wMatch[1].padStart(2, '0');
    const wk = `2026-W${wn}`;
    const std = STANDARD_WEEK_OPTIONS.find((w) => w.weekKey === wk);
    if (std) return std;
    return {
      weekKey: wk,
      weekLabel: rawLabel || `Tuần ${wn}/2026`,
      dateRange: `Tuần W${wn}/2026`,
    };
  }

  return STANDARD_WEEK_OPTIONS[2]; // Mặc định 2026-W41
}

/**
 * Xây dựng Sổ đăng ký Video hệ thống (`registeredVideosById`) từ:
 * 1. Danh sách Video đã Book thực tế File 3.2 (`B2C_BOOKED_VIDEOS_OCT_2026`)
 * 2. Danh sách Video Creative TikTok Seller (`TIKTOK_SELLER_TOP_CREATIVES`)
 * 3. Các Deal hiện hành trong hệ thống (`INITIAL_DEALS`)
 */
export function buildInitialSystemVideoRegistry(
  kocs: KocItem[] = INITIAL_KOCS,
  deals: BookingDealItem[] = INITIAL_DEALS
): Record<string, SystemRegisteredVideo> {
  const registry: Record<string, SystemRegisteredVideo> = {};

  const kocByHandle = new Map<string, KocItem>();
  const kocByNormName = new Map<string, KocItem>();
  for (const k of kocs) {
    const h = normalizeChannelHandle(k.channelId);
    if (h) kocByHandle.set(h, k);
    const nStage = normalizeCreatorLookupKey(k.stageName);
    if (nStage) kocByNormName.set(nStage, k);
    const nReal = normalizeCreatorLookupKey(k.realName);
    if (nReal) kocByNormName.set(nReal, k);
  }

  // 1. Từ B2C_BOOKED_VIDEOS_OCT_2026 (File 3.2 - các đơn đã có linkAir chứa /video/{videoId})
  for (const rec of B2C_BOOKED_VIDEOS_OCT_2026) {
    const extractedId = extractSystemVideoId(rec.linkAir);
    // Chỉ lấy các videoId số chuẩn TikTok hoặc dùng mã BO nếu là đơn đã lên sóng
    const videoId = /^\d{12,22}$/.test(extractedId) ? extractedId : '';
    if (!videoId) continue;

    const handle = normalizeChannelHandle(rec.channelId);
    const matchedKoc =
      kocByHandle.get(handle) ||
      kocByNormName.get(normalizeCreatorLookupKey(rec.channelId));

    registry[videoId] = {
      videoId,
      dealCode: rec.code,
      kocId: matchedKoc?.id || `koc-${handle || rec.code.toLowerCase()}`,
      kocChannelId: handle || rec.channelId,
      kocStageName: matchedKoc?.stageName || rec.channelId,
      brandName: rec.brandName,
      storeName: rec.storeName,
      productName: rec.productName || 'Sản phẩm chủ lực',
      campaignName: `Booking ${rec.brandName} (${rec.weekLabel || 'T10/2026'})`,
      videoTitle: `${rec.videoType || 'Review'} - ${rec.productName || rec.brandName} (${rec.code})`,
      linkAir: rec.linkAir,
      airDate: rec.airDate || '2026-10-05',
      weekLabel: rec.weekLabel || 'W41 [02.10-08.10]',
      pic: rec.pic,
      klGrade: rec.kl || 'KL3',
      bookingCostNet: Number(rec.cost) || 0,
      authorizationType: 'Video code',
      source: 'SYSTEM_BOOKING',
      registeredAt: rec.airDate ? `${rec.airDate}T09:00:00.000Z` : '2026-10-05T09:00:00.000Z',
    };
  }

  // 2. Từ TIKTOK_SELLER_TOP_CREATIVES (Báo cáo TikTok Seller Center)
  for (const cr of TIKTOK_SELLER_TOP_CREATIVES) {
    const videoId = extractSystemVideoId(cr.videoId);
    if (!videoId) continue;

    const normAcc = normalizeCreatorLookupKey(cr.tiktokAccount);
    const handleAcc = normalizeChannelHandle(cr.tiktokAccount);
    const matchedKoc =
      kocByHandle.get(handleAcc) ||
      kocByNormName.get(normAcc);

    const existing = registry[videoId];
    const postedDate = (cr.timePosted || '2026-10-02').split(' ')[0];

    registry[videoId] = {
      videoId,
      dealCode: existing?.dealCode || `BO2610_${videoId.slice(-5)}`,
      kocId: existing?.kocId || matchedKoc?.id || `koc-${handleAcc || videoId.slice(-6)}`,
      kocChannelId: existing?.kocChannelId || matchedKoc?.channelId?.replace(/^@/, '') || cr.tiktokAccount,
      kocStageName: existing?.kocStageName || matchedKoc?.stageName || cr.tiktokAccount,
      brandName: existing?.brandName || cr.brandName,
      storeName: existing?.storeName || cr.storeName,
      productName: existing?.productName || cr.campaignName.replace(/^PGM_/, ''),
      productId: cr.productId || existing?.productId,
      campaignName: cr.campaignName || existing?.campaignName || 'PGM Campaign',
      videoTitle: cr.videoTitle || existing?.videoTitle || `Video ${videoId}`,
      linkAir:
        existing?.linkAir ||
        `https://www.tiktok.com/@${(matchedKoc?.channelId || cr.tiktokAccount).replace(/^@/, '').replace(/\s+/g, '')}/video/${videoId}`,
      airDate: existing?.airDate || postedDate,
      weekLabel: existing?.weekLabel || 'W40 [25.09-01.10]',
      pic: existing?.pic || matchedKoc?.bookingPic || 'Lê Phương Thảo',
      klGrade: existing?.klGrade || matchedKoc?.salaryGrade || 'KL2',
      bookingCostNet: existing?.bookingCostNet ?? (matchedKoc?.rateCardVideo || 1500000),
      authorizationType: cr.authorizationType || existing?.authorizationType || 'Affiliate mass authorization',
      source: existing ? 'SYSTEM_BOOKING' : 'TIKTOK_CREATIVE',
      registeredAt: `${postedDate}T10:00:00.000Z`,
    };
  }

  // 3. Từ các Deal hiện hành trong hệ thống (`deals`) nếu có tiktokVideoUrl hoặc sparkAdsCode
  for (const d of deals) {
    const candidateId = extractSystemVideoId(d.tiktokVideoUrl || d.videoUrl || d.sparkAdsCode);
    if (!candidateId || !/^\d{12,22}$/.test(candidateId)) continue;
    if (registry[candidateId]) continue;

    registry[candidateId] = {
      videoId: candidateId,
      dealCode: d.dealCode,
      kocId: d.kocId,
      kocChannelId: (d.kocChannelId || d.kocStageName).replace(/^@/, ''),
      kocStageName: d.kocStageName,
      brandName: d.brandName,
      storeName: d.storeName || `${d.brandName}_TikTok_E2E-C`,
      productName: d.productName || d.campaignTitle,
      campaignName: d.campaignTitle || `Chiến dịch ${d.brandName}`,
      videoTitle: d.contentHook || `${d.productName || d.brandName} - ${d.kocStageName}`,
      linkAir: d.tiktokVideoUrl || d.videoUrl || `https://www.tiktok.com/@${(d.kocChannelId || 'koc').replace(/^@/, '')}/video/${candidateId}`,
      airDate: d.postedDate || d.deadlinePost || '2026-10-06',
      weekLabel: 'W41 [02.10-08.10]',
      pic: d.assignedStaff || d.bookingPic || 'Lê Phương Thảo',
      klGrade: d.salaryGrade || 'KL3',
      bookingCostNet: Number(d.totalValue) || 0,
      sparkAdsCode: d.sparkAdsCode,
      authorizationType: d.adAuthorizationType || 'Video code',
      source: 'SYSTEM_BOOKING',
      registeredAt: '2026-10-06T09:00:00.000Z',
    };
  }

  return registry;
}

/**
 * Khởi tạo dữ liệu lịch sử theo tuần (`2026-W40`, `2026-W41`, `2026-W42`)
 * gắn chặt 100% với `videoId` của hệ thống.
 */
export function buildInitialWeeklyHistoryStore(
  kocs: KocItem[] = INITIAL_KOCS,
  deals: BookingDealItem[] = INITIAL_DEALS
): KocVideoWeeklyHistoryStoreData {
  const registeredVideosById = buildInitialSystemVideoRegistry(kocs, deals);
  const snapshotsByKey: Record<string, VideoWeeklySnapshotItem> = {};

  // 1. Ghi nhận dữ liệu Tuần 40 (25/09 - 01/10/2026) và Tuần 41 (02/10 - 08/10/2026) từ TIKTOK_SELLER_TOP_CREATIVES
  for (const cr of TIKTOK_SELLER_TOP_CREATIVES) {
    const videoId = extractSystemVideoId(cr.videoId);
    const sysVideo = registeredVideosById[videoId];
    if (!sysVideo) continue;

    // Bản ghi Tuần 40 (45% quy mô tuần đầu khởi chạy)
    const w40Spend = Math.round(cr.cost * 0.45);
    const w40Gmv = Math.round(cr.gmv * 0.42);
    const w40Orders = Math.max(1, Math.round(cr.orders * 0.42));
    const w40Impr = Math.round(cr.impressions * 0.45);
    const w40Clicks = Math.round(cr.clicks * 0.45);
    const w40Roas = w40Spend > 0 ? Number((w40Gmv / w40Spend).toFixed(2)) : 0;
    const w40TotalCost = sysVideo.bookingCostNet + w40Spend;

    const keyW40 = `${videoId}__2026-W40`;
    snapshotsByKey[keyW40] = {
      id: keyW40,
      videoId,
      weekKey: '2026-W40',
      weekLabel: 'Tuần 40 (25/09 - 01/10/2026)',
      reportDateRange: '2026-09-25 ~ 2026-10-01',
      dealCode: sysVideo.dealCode,
      kocId: sysVideo.kocId,
      kocChannelId: sysVideo.kocChannelId,
      kocStageName: sysVideo.kocStageName,
      brandName: sysVideo.brandName,
      storeName: sysVideo.storeName,
      productName: sysVideo.productName,
      campaignName: sysVideo.campaignName,
      videoTitle: sysVideo.videoTitle,
      linkAir: sysVideo.linkAir,
      bookingCostNet: sysVideo.bookingCostNet,
      adsSpend: w40Spend,
      gmv: w40Gmv,
      orders: w40Orders,
      roas: w40Roas,
      totalRoi: w40TotalCost > 0 ? Number((w40Gmv / w40TotalCost).toFixed(2)) : w40Roas,
      cpa: w40Orders > 0 ? Math.round(w40Spend / w40Orders) : 0,
      views: Math.max(w40Impr, Math.round(w40Impr * 1.25)),
      impressions: w40Impr,
      clicks: w40Clicks,
      ctr: cr.ctr,
      cvr: cr.cvr,
      hookRate2s: cr.hookRate2s,
      viewRate6s: cr.viewRate6s,
      completionRate100: cr.completionRate100,
      authorizationType: cr.authorizationType,
      explorationStatus: cr.explorationStatus,
      isMatchedSystemVideo: true,
      sourceFileName: 'creative data for product campaigns 2026-09-25 ~ 2026-10-01.xlsx',
      updatedAt: '2026-10-01T18:00:00.000Z',
    };

    // Bản ghi Tuần 41 (02/10 - 08/10/2026) - Số liệu thực tế từ file báo cáo tuần 41
    const w41Spend = Math.round(cr.cost);
    const w41Gmv = Math.round(cr.gmv);
    const w41Orders = cr.orders;
    const w41Roas = cr.roas;
    const w41TotalCost = sysVideo.bookingCostNet + w41Spend;

    const keyW41 = `${videoId}__2026-W41`;
    snapshotsByKey[keyW41] = {
      id: keyW41,
      videoId,
      weekKey: '2026-W41',
      weekLabel: 'Tuần 41 (02/10 - 08/10/2026)',
      reportDateRange: '2026-10-02 ~ 2026-10-08',
      dealCode: sysVideo.dealCode,
      kocId: sysVideo.kocId,
      kocChannelId: sysVideo.kocChannelId,
      kocStageName: sysVideo.kocStageName,
      brandName: sysVideo.brandName,
      storeName: sysVideo.storeName,
      productName: sysVideo.productName,
      campaignName: sysVideo.campaignName,
      videoTitle: sysVideo.videoTitle,
      linkAir: sysVideo.linkAir,
      bookingCostNet: sysVideo.bookingCostNet,
      adsSpend: w41Spend,
      gmv: w41Gmv,
      orders: w41Orders,
      roas: w41Roas,
      totalRoi: w41TotalCost > 0 ? Number((w41Gmv / w41TotalCost).toFixed(2)) : w41Roas,
      cpa: cr.cpa,
      views: Math.max(cr.impressions, Math.round(cr.impressions * 1.3)),
      impressions: cr.impressions,
      clicks: cr.clicks,
      ctr: cr.ctr,
      cvr: cr.cvr,
      hookRate2s: cr.hookRate2s,
      viewRate6s: cr.viewRate6s,
      completionRate100: cr.completionRate100,
      authorizationType: cr.authorizationType,
      explorationStatus: cr.explorationStatus,
      isMatchedSystemVideo: true,
      sourceFileName: 'creative data for product campaigns 2026-10-01 00 ~ 2026-10-08 06.xlsx',
      updatedAt: '2026-10-08T18:00:00.000Z',
    };
  }

  // 2. Ghi nhận dữ liệu các video đã book trong File 3.2 (`B2C_BOOKED_VIDEOS_OCT_2026`) theo đúng tuần `weekLabel`
  for (const rec of B2C_BOOKED_VIDEOS_OCT_2026.slice(0, 120)) {
    const videoId = extractSystemVideoId(rec.linkAir);
    if (!/^\d{12,22}$/.test(videoId)) continue;
    const sysVideo = registeredVideosById[videoId];
    if (!sysVideo) continue;

    const weekMeta = resolveWeekMeta(undefined, rec.weekLabel);
    const snapKey = `${videoId}__${weekMeta.weekKey}`;
    if (snapshotsByKey[snapKey]) continue;

    const estAdsSpend = Math.round((Number(rec.cost) || 0) * 0.35);
    const gmv = Math.round(Number(rec.sellerGmv) || 0);
    const orders = Number(rec.sellerOrders) || 0;
    const views = Number(rec.views) || 0;
    const roas = estAdsSpend > 0 ? Number((gmv / estAdsSpend).toFixed(2)) : Number(rec.roas) || 0;
    const totalCost = (Number(rec.cost) || 0) + estAdsSpend;

    snapshotsByKey[snapKey] = {
      id: snapKey,
      videoId,
      weekKey: weekMeta.weekKey,
      weekLabel: weekMeta.weekLabel,
      reportDateRange: weekMeta.dateRange,
      dealCode: sysVideo.dealCode,
      kocId: sysVideo.kocId,
      kocChannelId: sysVideo.kocChannelId,
      kocStageName: sysVideo.kocStageName,
      brandName: sysVideo.brandName,
      storeName: sysVideo.storeName,
      productName: sysVideo.productName,
      campaignName: sysVideo.campaignName,
      videoTitle: sysVideo.videoTitle,
      linkAir: sysVideo.linkAir,
      bookingCostNet: sysVideo.bookingCostNet,
      adsSpend: estAdsSpend,
      gmv,
      orders,
      roas,
      totalRoi: totalCost > 0 ? Number((gmv / totalCost).toFixed(2)) : roas,
      cpa: orders > 0 ? Math.round(estAdsSpend / orders) : 0,
      views,
      impressions: views,
      clicks: Math.round(views * 0.028),
      ctr: 2.8,
      cvr: 3.4,
      hookRate2s: 24.5,
      viewRate6s: 10.2,
      completionRate100: 1.8,
      authorizationType: 'Video code',
      explorationStatus: 'Performing',
      isMatchedSystemVideo: true,
      sourceFileName: '3.2 List duyệt book - Đồng bộ nghiệm thu tuần.xlsx',
      updatedAt: '2026-10-15T18:00:00.000Z',
    };
  }

  // Tạo danh sách Batch lịch sử theo tuần
  const batchesByWeek = new Map<string, VideoWeeklySnapshotItem[]>();
  for (const snap of Object.values(snapshotsByKey)) {
    const arr = batchesByWeek.get(snap.weekKey) || [];
    arr.push(snap);
    batchesByWeek.set(snap.weekKey, arr);
  }

  const batches: WeeklyHistoryBatchLog[] = Array.from(batchesByWeek.entries())
    .map(([weekKey, list]) => {
      const meta = resolveWeekMeta(weekKey);
      const totalAdsSpend = list.reduce((s, x) => s + x.adsSpend, 0);
      const totalGmv = list.reduce((s, x) => s + x.gmv, 0);
      const totalOrders = list.reduce((s, x) => s + x.orders, 0);
      return {
        id: `BATCH-${weekKey}`,
        weekKey,
        weekLabel: meta.weekLabel,
        dateRange: meta.dateRange,
        sourceType: 'SYSTEM_SEED' as const,
        fileName: list[0]?.sourceFileName || `Bao_cao_Ads_${weekKey}.xlsx`,
        totalRows: list.length,
        matchedSystemVideos: list.filter((x) => x.isMatchedSystemVideo).length,
        unmatchedVideos: list.filter((x) => !x.isMatchedSystemVideo).length,
        totalAdsSpend,
        totalGmv,
        totalOrders,
        overallRoas: totalAdsSpend > 0 ? Number((totalGmv / totalAdsSpend).toFixed(2)) : 0,
        importedBy: 'Hệ thống đối soát B2C',
        importedAt: list[0]?.updatedAt || '2026-10-15T18:00:00.000Z',
      };
    })
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));

  return {
    registeredVideosById,
    snapshotsByKey,
    batches,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Nạp dữ liệu báo cáo tuần (từ file Excel/CSV hoặc API JSON) khớp theo `videoId` của hệ thống.
 */
export function ingestWeeklyRowsBySystemVideoId(
  store: KocVideoWeeklyHistoryStoreData,
  params: {
    weekKey: string;
    weekLabel?: string;
    dateRange?: string;
    fileName: string;
    sourceType: 'EXCEL_UPLOAD' | 'API_INGEST';
    importedBy: string;
    defaultBrandName?: string;
    defaultStoreName?: string;
    rows: WeeklyVideoInputRow[];
  }
): {
  nextStore: KocVideoWeeklyHistoryStoreData;
  batchLog: WeeklyHistoryBatchLog;
  matchedCount: number;
  newlyRegisteredVideosCount: number;
} {
  const nowIso = new Date().toISOString();
  const weekMeta = resolveWeekMeta(params.weekKey, params.weekLabel);
  const nextRegistered = { ...store.registeredVideosById };
  const nextSnapshots = { ...store.snapshotsByKey };

  // Tạo chỉ mục phụ theo dealCode để hỗ trợ trường hợp dòng dữ liệu truyền mã BO thay vì videoId
  const videoByDealCode = new Map<string, SystemRegisteredVideo>();
  for (const v of Object.values(nextRegistered)) {
    if (v.dealCode) videoByDealCode.set(v.dealCode.toUpperCase(), v);
  }

  let matchedCount = 0;
  let newlyRegisteredVideosCount = 0;
  let totalAdsSpend = 0;
  let totalGmv = 0;
  let totalOrders = 0;

  for (const row of params.rows) {
    const rawVid = extractSystemVideoId(row.videoId || row.videoUrl);
    const dealLookup = row.dealCode ? videoByDealCode.get(row.dealCode.trim().toUpperCase()) : undefined;
    const videoId = rawVid || dealLookup?.videoId || '';
    if (!videoId) continue;

    let sysVideo = nextRegistered[videoId] || dealLookup;
    const isAlreadyInSystem = Boolean(sysVideo);

    if (isAlreadyInSystem) {
      matchedCount++;
    } else {
      // Nếu videoId mới phát sinh trong file/API tuần, đăng ký vào sổ Video với thông tin đi kèm
      newlyRegisteredVideosCount++;
      const cleanHandle = normalizeChannelHandle(row.tiktokAccount) || `koc_${videoId.slice(-5)}`;
      sysVideo = {
        videoId,
        dealCode: row.dealCode || `BO2610_${videoId.slice(-5)}`,
        kocId: `koc-${cleanHandle}`,
        kocChannelId: cleanHandle,
        kocStageName: row.tiktokAccount || cleanHandle,
        brandName: row.brandName || params.defaultBrandName || 'Cathy Doll',
        storeName: row.storeName || params.defaultStoreName || 'Cathy Doll_TikTok_E2E-C',
        productName: row.productName || (row.campaignName || 'Sản phẩm chiến dịch').replace(/^PGM_/, ''),
        productId: row.productId,
        campaignName: row.campaignName || 'Chiến dịch Tuần',
        videoTitle: row.videoTitle || `Video ${videoId}`,
        linkAir: row.videoUrl || `https://www.tiktok.com/@${cleanHandle}/video/${videoId}`,
        airDate: nowIso.slice(0, 10),
        weekLabel: weekMeta.weekLabel,
        pic: 'Lê Phương Thảo',
        klGrade: 'KL2',
        bookingCostNet: 0,
        authorizationType: row.authorizationType || 'Video code',
        source: params.sourceType === 'API_INGEST' ? 'API_REGISTERED' : 'TIKTOK_CREATIVE',
        registeredAt: nowIso,
      };
      nextRegistered[videoId] = sysVideo;
    }

    const adsSpend = Math.round(Number(row.adsSpend ?? row.cost ?? 0) || 0);
    const gmv = Math.round(Number(row.gmv ?? 0) || 0);
    const orders = Math.round(Number(row.orders ?? 0) || 0);
    const impressions = Math.round(Number(row.impressions ?? 0) || 0);
    const views = Math.round(Number(row.views ?? impressions) || 0);
    const clicks = Math.round(Number(row.clicks ?? 0) || 0);
    const roas = adsSpend > 0 ? Number((gmv / adsSpend).toFixed(2)) : gmv > 0 ? 99 : 0;
    const totalCost = (sysVideo.bookingCostNet || 0) + adsSpend;
    const totalRoi = totalCost > 0 ? Number((gmv / totalCost).toFixed(2)) : roas;
    const cpa = orders > 0 ? Math.round(adsSpend / orders) : 0;

    // Chuẩn hóa tỷ lệ % (nếu <= 1.0 thì nhân 100 để đồng nhất hiển thị %)
    const rawCtr = Number(row.ctr ?? 0) || 0;
    const ctr = rawCtr > 0 && rawCtr < 1 ? Number((rawCtr * 100).toFixed(2)) : Number(rawCtr.toFixed(2));
    const rawCvr = Number(row.cvr ?? 0) || 0;
    const cvr = rawCvr > 0 && rawCvr < 1 ? Number((rawCvr * 100).toFixed(2)) : Number(rawCvr.toFixed(2));
    const rawHook = Number(row.hookRate2s ?? 0) || 0;
    const hookRate2s = rawHook > 0 && rawHook < 1 ? Number((rawHook * 100).toFixed(2)) : Number(rawHook.toFixed(2));
    const rawView6s = Number(row.viewRate6s ?? 0) || 0;
    const viewRate6s = rawView6s > 0 && rawView6s < 1 ? Number((rawView6s * 100).toFixed(2)) : Number(rawView6s.toFixed(2));
    const rawComp = Number(row.completionRate100 ?? 0) || 0;
    const completionRate100 = rawComp > 0 && rawComp < 1 ? Number((rawComp * 100).toFixed(2)) : Number(rawComp.toFixed(2));

    const snapKey = `${videoId}__${weekMeta.weekKey}`;
    nextSnapshots[snapKey] = {
      id: snapKey,
      videoId,
      weekKey: weekMeta.weekKey,
      weekLabel: weekMeta.weekLabel,
      reportDateRange: params.dateRange || weekMeta.dateRange,
      dealCode: sysVideo.dealCode,
      kocId: sysVideo.kocId,
      kocChannelId: sysVideo.kocChannelId,
      kocStageName: sysVideo.kocStageName,
      brandName: row.brandName || sysVideo.brandName,
      storeName: row.storeName || sysVideo.storeName,
      productName: row.productName || sysVideo.productName,
      campaignName: row.campaignName || sysVideo.campaignName,
      videoTitle: row.videoTitle || sysVideo.videoTitle,
      linkAir: sysVideo.linkAir,
      bookingCostNet: sysVideo.bookingCostNet,
      adsSpend,
      gmv,
      orders,
      roas,
      totalRoi,
      cpa,
      views,
      impressions,
      clicks,
      ctr,
      cvr,
      hookRate2s,
      viewRate6s,
      completionRate100,
      authorizationType: row.authorizationType || sysVideo.authorizationType || 'Video code',
      explorationStatus: row.explorationStatus || 'Performing',
      isMatchedSystemVideo: isAlreadyInSystem,
      sourceFileName: params.fileName,
      updatedAt: nowIso,
    };

    totalAdsSpend += adsSpend;
    totalGmv += gmv;
    totalOrders += orders;
  }

  const batchLog: WeeklyHistoryBatchLog = {
    id: `BATCH-${weekMeta.weekKey}-${Date.now()}`,
    weekKey: weekMeta.weekKey,
    weekLabel: weekMeta.weekLabel,
    dateRange: params.dateRange || weekMeta.dateRange,
    sourceType: params.sourceType,
    fileName: params.fileName,
    totalRows: params.rows.length,
    matchedSystemVideos: matchedCount,
    unmatchedVideos: newlyRegisteredVideosCount,
    totalAdsSpend,
    totalGmv,
    totalOrders,
    overallRoas: totalAdsSpend > 0 ? Number((totalGmv / totalAdsSpend).toFixed(2)) : 0,
    importedBy: params.importedBy,
    importedAt: nowIso,
  };

  const nextBatches = [
    batchLog,
    ...store.batches.filter((b) => !(b.weekKey === batchLog.weekKey && b.fileName === batchLog.fileName)),
  ].slice(0, 30);

  return {
    nextStore: {
      registeredVideosById: nextRegistered,
      snapshotsByKey: nextSnapshots,
      batches: nextBatches,
      updatedAt: nowIso,
    },
    batchLog,
    matchedCount,
    newlyRegisteredVideosCount,
  };
}

/**
 * Chuyển kết quả đọc file Excel báo cáo Ads (`AdsReportParseResult`) sang các dòng `WeeklyVideoInputRow`
 */
export function convertParsedAdsReportToWeeklyRows(
  parsed: AdsReportParseResult,
  brandName?: string,
  storeName?: string
): WeeklyVideoInputRow[] {
  return (parsed.topCreatives || []).map((cr) => ({
    videoId: cr.videoId,
    videoTitle: cr.videoTitle,
    tiktokAccount: cr.tiktokAccount,
    dealCode: cr.mappedDealId,
    brandName,
    storeName,
    productId: cr.productId,
    campaignName: cr.campaignName,
    adsSpend: cr.cost,
    gmv: cr.gmv,
    orders: cr.orders,
    impressions: cr.impressions,
    clicks: cr.clicks,
    ctr: cr.ctr,
    cvr: cr.cvr,
    hookRate2s: cr.hookRate2s,
    viewRate6s: cr.viewRate6s,
    completionRate100: cr.completionRate100,
    authorizationType: cr.authorizationType,
    explorationStatus: cr.explorationSecondaryStatus,
  }));
}

/**
 * Đăng ký một Video mới phát sinh (`videoId`) vào Sổ đăng ký Video hệ thống
 */
export function registerNewSystemVideo(
  store: KocVideoWeeklyHistoryStoreData,
  payload: {
    videoId?: string;
    linkAir?: string;
    dealCode?: string;
    kocId?: string;
    kocChannelId: string;
    kocStageName?: string;
    brandName: string;
    storeName: string;
    productName?: string;
    campaignName?: string;
    videoTitle?: string;
    airDate?: string;
    weekKey?: string;
    pic?: string;
    klGrade?: string;
    bookingCostNet?: number;
    sparkAdsCode?: string;
    authorizationType?: string;
    initialAdsSpend?: number;
    initialGmv?: number;
    initialOrders?: number;
    initialViews?: number;
    source?: SystemRegisteredVideo['source'];
  }
): {
  nextStore: KocVideoWeeklyHistoryStoreData;
  registeredVideo: SystemRegisteredVideo;
  initialSnapshot?: VideoWeeklySnapshotItem;
} {
  const nowIso = new Date().toISOString();
  const extractedId = extractSystemVideoId(payload.videoId || payload.linkAir);
  if (!extractedId) {
    throw new Error('Thiếu mã videoId hoặc link video TikTok hợp lệ.');
  }

  const cleanHandle = normalizeChannelHandle(payload.kocChannelId) || payload.kocChannelId.trim();
  const weekMeta = resolveWeekMeta(payload.weekKey);

  const registeredVideo: SystemRegisteredVideo = {
    videoId: extractedId,
    dealCode: payload.dealCode?.trim() || `BO2610_${extractedId.slice(-5)}`,
    kocId: payload.kocId || `koc-${cleanHandle}`,
    kocChannelId: cleanHandle,
    kocStageName: payload.kocStageName?.trim() || cleanHandle,
    brandName: payload.brandName.trim(),
    storeName: payload.storeName.trim(),
    productName: payload.productName?.trim() || 'Sản phẩm chiến dịch',
    campaignName: payload.campaignName?.trim() || `Booking ${payload.brandName.trim()}`,
    videoTitle: payload.videoTitle?.trim() || `Video @${cleanHandle} - ${payload.brandName.trim()}`,
    linkAir:
      payload.linkAir?.trim() ||
      `https://www.tiktok.com/@${cleanHandle}/video/${extractedId}`,
    airDate: payload.airDate || nowIso.slice(0, 10),
    weekLabel: weekMeta.weekLabel,
    pic: payload.pic || 'Lê Phương Thảo',
    klGrade: payload.klGrade || 'KL3',
    bookingCostNet: Number(payload.bookingCostNet) || 0,
    sparkAdsCode: payload.sparkAdsCode?.trim() || undefined,
    authorizationType: payload.authorizationType || 'Video code',
    source: payload.source || 'API_REGISTERED',
    registeredAt: nowIso,
  };

  const nextRegistered = {
    ...store.registeredVideosById,
    [extractedId]: registeredVideo,
  };
  const nextSnapshots = { ...store.snapshotsByKey };
  let initialSnapshot: VideoWeeklySnapshotItem | undefined;

  if (
    (payload.initialAdsSpend && payload.initialAdsSpend > 0) ||
    (payload.initialGmv && payload.initialGmv > 0) ||
    (payload.initialViews && payload.initialViews > 0)
  ) {
    const adsSpend = Math.round(Number(payload.initialAdsSpend) || 0);
    const gmv = Math.round(Number(payload.initialGmv) || 0);
    const orders = Math.round(Number(payload.initialOrders) || 0);
    const views = Math.round(Number(payload.initialViews) || 0);
    const roas = adsSpend > 0 ? Number((gmv / adsSpend).toFixed(2)) : 0;
    const totalCost = registeredVideo.bookingCostNet + adsSpend;
    const snapKey = `${extractedId}__${weekMeta.weekKey}`;

    initialSnapshot = {
      id: snapKey,
      videoId: extractedId,
      weekKey: weekMeta.weekKey,
      weekLabel: weekMeta.weekLabel,
      reportDateRange: weekMeta.dateRange,
      dealCode: registeredVideo.dealCode,
      kocId: registeredVideo.kocId,
      kocChannelId: registeredVideo.kocChannelId,
      kocStageName: registeredVideo.kocStageName,
      brandName: registeredVideo.brandName,
      storeName: registeredVideo.storeName,
      productName: registeredVideo.productName,
      campaignName: registeredVideo.campaignName,
      videoTitle: registeredVideo.videoTitle,
      linkAir: registeredVideo.linkAir,
      bookingCostNet: registeredVideo.bookingCostNet,
      adsSpend,
      gmv,
      orders,
      roas,
      totalRoi: totalCost > 0 ? Number((gmv / totalCost).toFixed(2)) : roas,
      cpa: orders > 0 ? Math.round(adsSpend / orders) : 0,
      views,
      impressions: views,
      clicks: Math.round(views * 0.03),
      ctr: 3.0,
      cvr: 3.2,
      hookRate2s: 25.0,
      viewRate6s: 10.5,
      completionRate100: 2.0,
      authorizationType: registeredVideo.authorizationType || 'Video code',
      explorationStatus: 'Performing',
      isMatchedSystemVideo: true,
      sourceFileName: 'Đăng ký Video mới qua API / Hệ thống',
      updatedAt: nowIso,
    };
    nextSnapshots[snapKey] = initialSnapshot;
  }

  return {
    nextStore: {
      ...store,
      registeredVideosById: nextRegistered,
      snapshotsByKey: nextSnapshots,
      updatedAt: nowIso,
    },
    registeredVideo,
    initialSnapshot,
  };
}

/**
 * Tổng hợp lịch sử theo tuần cho toàn bộ KOC từ các `videoId` của hệ thống
 */
export function aggregateKocHistoryFromVideoSnapshots(
  store: KocVideoWeeklyHistoryStoreData
): KocWeeklyAggregatedHistory[] {
  const byKocKey = new Map<
    string,
    {
      kocId: string;
      kocChannelId: string;
      kocStageName: string;
      brands: Set<string>;
      stores: Set<string>;
      videoIds: Set<string>;
      weeks: Map<string, KocWeeklyTimelinePoint>;
      totalBookingCostNet: number;
      countedVideoCostIds: Set<string>;
      cumulativeAdsSpend: number;
      cumulativeGmv: number;
      cumulativeOrders: number;
      cumulativeViews: number;
      hookSum: number;
      ctrSum: number;
      snapCount: number;
    }
  >();

  // Khởi tạo từ danh sách video đã đăng ký
  for (const reg of Object.values(store.registeredVideosById)) {
    const key = normalizeCreatorLookupKey(reg.kocChannelId || reg.kocStageName);
    if (!key) continue;
    let entry = byKocKey.get(key);
    if (!entry) {
      entry = {
        kocId: reg.kocId,
        kocChannelId: reg.kocChannelId,
        kocStageName: reg.kocStageName,
        brands: new Set(),
        stores: new Set(),
        videoIds: new Set(),
        weeks: new Map(),
        totalBookingCostNet: 0,
        countedVideoCostIds: new Set(),
        cumulativeAdsSpend: 0,
        cumulativeGmv: 0,
        cumulativeOrders: 0,
        cumulativeViews: 0,
        hookSum: 0,
        ctrSum: 0,
        snapCount: 0,
      };
      byKocKey.set(key, entry);
    }
    entry.videoIds.add(reg.videoId);
    if (reg.brandName) entry.brands.add(reg.brandName);
    if (reg.storeName) entry.stores.add(reg.storeName);
    if (!entry.countedVideoCostIds.has(reg.videoId)) {
      entry.countedVideoCostIds.add(reg.videoId);
      entry.totalBookingCostNet += Number(reg.bookingCostNet) || 0;
    }
  }

  // Cộng dồn từ các bản ghi snapshot tuần
  for (const snap of Object.values(store.snapshotsByKey)) {
    const key = normalizeCreatorLookupKey(snap.kocChannelId || snap.kocStageName);
    if (!key) continue;
    let entry = byKocKey.get(key);
    if (!entry) {
      entry = {
        kocId: snap.kocId,
        kocChannelId: snap.kocChannelId,
        kocStageName: snap.kocStageName,
        brands: new Set(),
        stores: new Set(),
        videoIds: new Set(),
        weeks: new Map(),
        totalBookingCostNet: 0,
        countedVideoCostIds: new Set(),
        cumulativeAdsSpend: 0,
        cumulativeGmv: 0,
        cumulativeOrders: 0,
        cumulativeViews: 0,
        hookSum: 0,
        ctrSum: 0,
        snapCount: 0,
      };
      byKocKey.set(key, entry);
    }

    entry.videoIds.add(snap.videoId);
    if (snap.brandName) entry.brands.add(snap.brandName);
    if (snap.storeName) entry.stores.add(snap.storeName);
    if (!entry.countedVideoCostIds.has(snap.videoId)) {
      entry.countedVideoCostIds.add(snap.videoId);
      entry.totalBookingCostNet += Number(snap.bookingCostNet) || 0;
    }

    entry.cumulativeAdsSpend += snap.adsSpend;
    entry.cumulativeGmv += snap.gmv;
    entry.cumulativeOrders += snap.orders;
    entry.cumulativeViews += snap.views;
    entry.hookSum += snap.hookRate2s;
    entry.ctrSum += snap.ctr;
    entry.snapCount++;

    const wk = entry.weeks.get(snap.weekKey) || {
      weekKey: snap.weekKey,
      weekLabel: snap.weekLabel,
      activeVideosCount: 0,
      adsSpend: 0,
      gmv: 0,
      orders: 0,
      views: 0,
      roas: 0,
    };
    wk.activeVideosCount += 1;
    wk.adsSpend += snap.adsSpend;
    wk.gmv += snap.gmv;
    wk.orders += snap.orders;
    wk.views += snap.views;
    wk.roas = wk.adsSpend > 0 ? Number((wk.gmv / wk.adsSpend).toFixed(2)) : 0;
    entry.weeks.set(snap.weekKey, wk);
  }

  return Array.from(byKocKey.values())
    .map((e) => {
      const totalCost = e.totalBookingCostNet + e.cumulativeAdsSpend;
      const weeklyTimeline = Array.from(e.weeks.values()).sort((a, b) =>
        a.weekKey.localeCompare(b.weekKey)
      );
      return {
        kocId: e.kocId,
        kocChannelId: e.kocChannelId,
        kocStageName: e.kocStageName,
        brands: Array.from(e.brands),
        stores: Array.from(e.stores),
        totalRegisteredVideos: e.videoIds.size,
        videoIds: Array.from(e.videoIds),
        weeksTracked: weeklyTimeline.map((w) => w.weekKey),
        totalBookingCostNet: e.totalBookingCostNet,
        cumulativeAdsSpend: e.cumulativeAdsSpend,
        cumulativeGmv: e.cumulativeGmv,
        cumulativeOrders: e.cumulativeOrders,
        cumulativeViews: e.cumulativeViews,
        overallAdsRoas:
          e.cumulativeAdsSpend > 0
            ? Number((e.cumulativeGmv / e.cumulativeAdsSpend).toFixed(2))
            : 0,
        overallTotalRoi:
          totalCost > 0 ? Number((e.cumulativeGmv / totalCost).toFixed(2)) : 0,
        avgHookRate2s:
          e.snapCount > 0 ? Number((e.hookSum / e.snapCount).toFixed(1)) : 0,
        avgCtr:
          e.snapCount > 0 ? Number((e.ctrSum / e.snapCount).toFixed(2)) : 0,
        weeklyTimeline,
      };
    })
    .sort((a, b) => b.cumulativeGmv - a.cumulativeGmv);
}

/**
 * Tra cứu toàn bộ lịch sử Video Ads theo tuần của 1 KOC cụ thể (theo channelId, stageName hoặc kocId)
 */
export function getKocVideoWeeklyHistoryForKoc(
  store: KocVideoWeeklyHistoryStoreData,
  koc: Pick<KocItem, 'id' | 'channelId' | 'stageName' | 'realName'>
): {
  registeredVideos: SystemRegisteredVideo[];
  weeklySnapshots: VideoWeeklySnapshotItem[];
  summary: KocWeeklyAggregatedHistory | null;
} {
  const targetHandle = normalizeChannelHandle(koc.channelId);
  const targetStage = normalizeCreatorLookupKey(koc.stageName);
  const targetReal = normalizeCreatorLookupKey(koc.realName);

  const matchKoc = (channelId: string, stageName: string, kocId: string): boolean => {
    if (kocId && koc.id && kocId === koc.id) return true;
    const h = normalizeChannelHandle(channelId);
    if (h && targetHandle && (h === targetHandle || h.includes(targetHandle) || targetHandle.includes(h))) {
      return true;
    }
    const s = normalizeCreatorLookupKey(stageName || channelId);
    if (s && targetStage && s.length >= 3 && targetStage.length >= 3 && (s === targetStage || s.includes(targetStage) || targetStage.includes(s))) {
      return true;
    }
    if (s && targetReal && s.length >= 4 && targetReal.length >= 4 && s === targetReal) {
      return true;
    }
    return false;
  };

  const registeredVideos = Object.values(store.registeredVideosById).filter((v) =>
    matchKoc(v.kocChannelId, v.kocStageName, v.kocId)
  );
  const registeredVideoIds = new Set(registeredVideos.map((v) => v.videoId));

  const weeklySnapshots = Object.values(store.snapshotsByKey)
    .filter(
      (s) =>
        registeredVideoIds.has(s.videoId) ||
        matchKoc(s.kocChannelId, s.kocStageName, s.kocId)
    )
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey) || b.gmv - a.gmv);

  const allSummaries = aggregateKocHistoryFromVideoSnapshots(store);
  const summary =
    allSummaries.find((sum) =>
      matchKoc(sum.kocChannelId, sum.kocStageName, sum.kocId)
    ) || null;

  return {
    registeredVideos,
    weeklySnapshots,
    summary,
  };
}
