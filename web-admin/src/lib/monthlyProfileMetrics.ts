import type {
  BookingDealItem,
  BrandDetail,
  BrandMonthlyPlanItem,
  InputPlanBreakdownState,
  InputPlanRowItem,
  MonthlyPlanStatus,
  StorePortfolioItem,
} from './types';
import {
  INITIAL_BRAND_MONTHLY_PLANS,
  INITIAL_MONTHLY_PLANS,
} from './monthlyPlanData';
import {
  B2C_BOOKED_VIDEOS_OCT_2026,
  TIKTOK_SELLER_CAMPAIGNS,
  type B2cAdsCampaignMetric,
  type B2cBookedVideoRecord,
} from './b2cAnalyticsDataset';

export interface ProfileMonthOption {
  value: string;
  label: string;
  shortLabel: string;
  periodTag: string;
}

export const PROFILE_MONTH_OPTIONS: ProfileMonthOption[] = [
  {
    value: '2026/10',
    label: 'Tháng 10/2026 (Kỳ hiện hành)',
    shortLabel: 'Tháng 10/2026',
    periodTag: 'Đang thực thi',
  },
  {
    value: '2026/09',
    label: 'Tháng 09/2026 (Đã nghiệm thu)',
    shortLabel: 'Tháng 09/2026',
    periodTag: 'Đã quyết toán',
  },
  {
    value: '2026/08',
    label: 'Tháng 08/2026 (Đã nghiệm thu)',
    shortLabel: 'Tháng 08/2026',
    periodTag: 'Đã quyết toán',
  },
  {
    value: '2026/11',
    label: 'Tháng 11/2026 (Kế hoạch tới)',
    shortLabel: 'Tháng 11/2026',
    periodTag: 'Đang lập Plan',
  },
];

export interface StoreMonthlyBookingRecord {
  id: string;
  dealCode: string;
  dealRef?: BookingDealItem;
  month: string;
  storeName: string;
  brandName: string;
  kocName: string;
  kocHandle: string;
  channelId: string;
  kl: string;
  tierCode: string;
  tierLabel: string;
  format: string;
  videoType: string;
  productName: string;
  campaignTitle: string;
  pic: string;
  picName: string;
  growthPic: string;
  airDate: string;
  weekLabel: string;
  linkAir: string;
  videoLink: string;
  adsCode: string;
  costNet: number;
  costGross: number;
  pipeline: string;
  statusLabel: string;
  isAired: boolean;
  paymentStatus: string;
  slaWarning: string;
  views: number;
  gmv: number;
  revenue: number;
  orders: number;
  roas: number;
  sourceDeal?: BookingDealItem;
}

export interface StoreMonthlyPlanReport {
  storeId: string;
  storeName: string;
  brandName: string;
  platform: string;
  month: string;
  monthLabel: string;
  plan: InputPlanBreakdownState | null;
  planId: string;
  planTitle: string;
  versionCode: string;
  planStatus: MonthlyPlanStatus;
  planStatusLabel: string;
  pic: string;
  specialistPic: string;
  bookingLeader?: string;
  leaderPic?: string;
  hasBookingLeader: boolean;
  growthPic: string;
  // Chỉ số Plan (Kế hoạch tháng - File 4.1 & 4.1.1)
  planNmv: number;
  planBudgetNet: number;
  planBudgetGross: number;
  planAffBudgetNet: number;
  planSelfBudgetNet: number;
  planAdsBudget: number;
  planTotalVideos: number;
  planAffVideos: number;
  planAffiliateVideos: number;
  planSelfVideos: number;
  planSelfChannelVideos: number;
  planFocVideos: number;
  // Chỉ số Report (Thực tế vận hành - File 3.2 & Seller Center)
  reportNmv: number;
  nmvAchievementPct: number;
  reportSpentNet: number;
  budgetBurnPct: number;
  isOverbudget: boolean;
  isUnbudgetedSpend: boolean;
  reportBookedVideos: number;
  reportBookedCount: number;
  reportAiredVideos: number;
  reportAiredCount: number;
  videoAchievementPct: number;
  reportViews: number;
  reportOrders: number;
  reportRoas: number;
  adsCost: number;
  adsGmv: number;
  // Dữ liệu drill-down
  planItems: InputPlanRowItem[];
  bookings: StoreMonthlyBookingRecord[];
  adsCampaigns: B2cAdsCampaignMetric[];
}

export interface BrandMonthlyPlanReport {
  brandName: string;
  month: string;
  monthLabel: string;
  brandPlan?: BrandMonthlyPlanItem;
  storeReports: StoreMonthlyPlanReport[];
  storeCount: number;
  platforms: string[];
  planStatusLabel: string;
  overbudgetStoresCount: number;
  unbudgetedStoresCount: number;
  // Tổng hợp Plan cấp Thương hiệu
  planNmv: number;
  planBudgetNet: number;
  planBudgetGross: number;
  planAffBudgetNet: number;
  planSelfBudgetNet: number;
  planAdsBudget: number;
  planTotalVideos: number;
  planAffVideos: number;
  planSelfVideos: number;
  planFocVideos: number;
  // Tổng hợp Report cấp Thương hiệu
  reportNmv: number;
  nmvAchievementPct: number;
  reportSpentNet: number;
  budgetBurnPct: number;
  isOverbudget: boolean;
  isUnbudgetedSpend: boolean;
  reportBookedVideos: number;
  reportBookedCount: number;
  reportAiredVideos: number;
  reportAiredCount: number;
  videoAchievementPct: number;
  videoAiredPct: number;
  reportViews: number;
  reportTotalViews: number;
  reportOrders: number;
  reportTotalOrders: number;
  reportRoas: number;
  // Danh sách booking thực tế của thương hiệu trong kỳ
  bookings: StoreMonthlyBookingRecord[];
}

const GROSS_MULTIPLIER = 1.188;

function norm(s?: string): string {
  return (s || '').trim().toLowerCase();
}

// Chỉ mục tĩnh cho dữ liệu File 3.2 (16.046 bản ghi) và chiến dịch Seller Ads để tra cứu O(1)
const FILE32_BY_STORE_NAME = (() => {
  const map = new Map<string, B2cBookedVideoRecord[]>();
  for (const r of B2C_BOOKED_VIDEOS_OCT_2026) {
    const key = norm(r.storeName);
    if (!key) continue;
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(r);
  }
  return map;
})();

const ADS_CAMPAIGNS_BY_STORE = (() => {
  const byStore = new Map<string, B2cAdsCampaignMetric[]>();
  const byBrand = new Map<string, B2cAdsCampaignMetric[]>();
  for (const c of TIKTOK_SELLER_CAMPAIGNS) {
    const sKey = norm(c.storeName);
    if (sKey) {
      let list = byStore.get(sKey);
      if (!list) { list = []; byStore.set(sKey, list); }
      list.push(c);
    }
    const bKey = norm(c.brandName);
    if (bKey) {
      let list = byBrand.get(bKey);
      if (!list) { list = []; byBrand.set(bKey, list); }
      list.push(c);
    }
  }
  return { byStore, byBrand };
})();

interface StoreDealsIndex {
  byStoreName: Map<string, BookingDealItem[]>;
  byStoreId: Map<string, BookingDealItem[]>;
}

const storeDealsIndexCache = new WeakMap<BookingDealItem[], StoreDealsIndex>();

function getStoreDealsIndex(deals: BookingDealItem[]): StoreDealsIndex {
  let cached = storeDealsIndexCache.get(deals);
  if (cached) return cached;

  const byStoreName = new Map<string, BookingDealItem[]>();
  const byStoreId = new Map<string, BookingDealItem[]>();
  for (const d of deals) {
    if (d.storeName) {
      const sKey = norm(d.storeName);
      if (sKey) {
        let list = byStoreName.get(sKey);
        if (!list) { list = []; byStoreName.set(sKey, list); }
        list.push(d);
      }
    }
    if (d.storeId) {
      let list = byStoreId.get(d.storeId);
      if (!list) { list = []; byStoreId.set(d.storeId, list); }
      list.push(d);
    }
  }

  cached = { byStoreName, byStoreId };
  storeDealsIndexCache.set(deals, cached);
  return cached;
}

function matchStorePlan(
  store: StorePortfolioItem,
  month: string,
  allPlans: InputPlanBreakdownState[]
): InputPlanBreakdownState | null {
  const sId = norm(store.id);
  const sOpId = norm(store.storeOperationId);
  const sName = norm(store.storeName);
  const bName = norm(store.brandName);

  const monthPlans = allPlans.filter(p => p.month === month);
  // 1. Khớp chính xác theo storeId hoặc storeName
  const exactStore = monthPlans.find(
    p =>
      (p.storeId && (norm(p.storeId) === sId || norm(p.storeId) === sOpId)) ||
      (p.storeName && norm(p.storeName) === sName) ||
      norm(p.brandName) === sName
  );
  if (exactStore) return exactStore;

  // 2. Khớp theo brandName nếu cùng nền tảng hoặc chỉ có 1 plan của brand trong tháng
  const brandPlans = monthPlans.filter(p => {
    const pb = norm(p.brandName).split('_')[0];
    const sb = bName.split('_')[0];
    return pb && sb && (pb === sb || norm(p.brandName) === bName);
  });
  if (brandPlans.length === 1) return brandPlans[0];
  if (brandPlans.length > 1) {
    const isShopee = sName.includes('shopee') || norm(store.platform).includes('shopee');
    const platformMatched = brandPlans.find(p => {
      const target = `${norm(p.storeName)} ${norm(p.brandName)}`;
      return isShopee ? target.includes('shopee') : target.includes('tiktok');
    });
    return platformMatched || brandPlans[0];
  }
  return null;
}

function convertBookedRecordToMonthlyBooking(
  r: B2cBookedVideoRecord,
  month: string
): StoreMonthlyBookingRecord {
  const costNet = r.cost || 0;
  const costGross = Math.round(costNet * GROSS_MULTIPLIER);
  const gmv = r.sellerGmv || 0;
  const handle = r.channelId.startsWith('@') ? r.channelId : `@${r.channelId}`;
  const kl = r.kl || 'KL2';
  const pipeline = r.pipeline || 'Đã air';
  const isAired = Boolean(r.linkAir) || pipeline.toLowerCase().includes('air') || pipeline.toLowerCase().includes('done');
  return {
    id: `32-${r.code}-${month}`,
    dealCode: r.code,
    dealRef: undefined,
    month,
    storeName: r.storeName,
    brandName: r.brandName,
    kocName: handle,
    kocHandle: handle,
    channelId: handle,
    kl,
    tierCode: kl,
    tierLabel: kl,
    format: r.format || 'Booking Video KOC',
    videoType: r.videoType || 'Review Voice',
    productName: r.productName || r.brandName,
    campaignTitle: `Chiến dịch ${r.brandName} (${month})`,
    pic: r.pic || 'Lê Phương Thảo',
    picName: r.pic || 'Lê Phương Thảo',
    growthPic: r.growthPic || 'Growth Team',
    airDate: r.airDate || '',
    weekLabel: r.weekLabel || 'W41',
    linkAir: r.linkAir || '',
    videoLink: r.linkAir || '',
    adsCode: r.linkAir ? `SPARK-${r.code.slice(-6)}` : '—',
    costNet,
    costGross,
    pipeline,
    statusLabel: pipeline,
    isAired,
    paymentStatus: r.paymentStatus || 'Chờ thanh toán',
    slaWarning: r.slaWarning || 'Đúng hạn',
    views: r.views || 0,
    gmv,
    revenue: gmv,
    orders: r.sellerOrders || 0,
    roas: r.roas || (costNet > 0 ? Number((gmv / costNet).toFixed(2)) : 0),
  };
}

function convertDealToMonthlyBooking(
  d: BookingDealItem,
  month: string
): StoreMonthlyBookingRecord {
  const gmv = d.gmv30 || d.affiliateGmv || 0;
  const cost = d.totalValue || 0;
  const costGross = Math.round(cost * GROSS_MULTIPLIER);
  const isAired = Boolean(
    d.videoUrl ||
      d.tiktokVideoUrl ||
      ['AIRING', 'COMPLETED', 'FINAL_PAID'].includes(d.status)
  );
  const handle = d.kocChannelId || '@creator';
  const kl = d.salaryGrade || 'KL3';
  const pipeline = isAired ? 'Đã lên sóng' : d.pipelineText || d.statusLabel;
  const link = d.videoUrl || d.tiktokVideoUrl || '';
  const pic = d.assignedStaff || 'Lê Phương Thảo';
  return {
    id: d.id,
    dealCode: d.dealCode,
    dealRef: d,
    month,
    storeName: d.storeName || `${d.brandName}_TikTok`,
    brandName: d.brandName,
    kocName: d.kocStageName,
    kocHandle: handle,
    channelId: handle,
    kl,
    tierCode: kl,
    tierLabel: kl,
    format: d.contentPillar || 'Booking Video KOC',
    videoType: d.contentAngleName || d.contentPillar || 'Review trực tiếp',
    productName: d.productName || d.brandName,
    campaignTitle: d.campaignTitle || `Chiến dịch ${d.brandName}`,
    pic,
    picName: pic,
    growthPic: 'Growth Team',
    airDate: d.deadlinePost || '2026-10-15',
    weekLabel: d.bookingBatch || 'W41',
    linkAir: link,
    videoLink: link,
    adsCode: d.sparkAdsCode || (link ? `SPARK-${d.dealCode.slice(-5)}` : '—'),
    costNet: cost,
    costGross,
    pipeline,
    statusLabel: pipeline,
    isAired,
    paymentStatus:
      d.status === 'FINAL_PAID'
        ? 'Đã tất toán'
        : d.status === 'COMPLETED'
          ? 'Chờ tất toán'
          : 'Đang thực thi',
    slaWarning: d.isSlaWarning ? 'Cảnh báo SLA' : 'Đúng hạn',
    views: d.viewsCount || 0,
    gmv,
    revenue: gmv,
    orders: gmv > 0 ? Math.max(1, Math.round(gmv / 245000)) : 0,
    roas: d.roi || (cost > 0 ? Number((gmv / cost).toFixed(2)) : 0),
    sourceDeal: d,
  };
}

/**
 * Xây dựng dữ liệu Hồ sơ Kế hoạch & Báo cáo (Plan & Report) cho 1 Gian hàng tại 1 kỳ tháng.
 */
export function buildStoreMonthlyPlanReport(
  store: StorePortfolioItem,
  month: string,
  options?: {
    plans?: InputPlanBreakdownState[];
    deals?: BookingDealItem[];
  }
): StoreMonthlyPlanReport {
  const allPlans = options?.plans?.length ? options.plans : INITIAL_MONTHLY_PLANS;
  const allDeals = options?.deals || [];
  const monthMeta =
    PROFILE_MONTH_OPTIONS.find(m => m.value === month) || PROFILE_MONTH_OPTIONS[0];

  const sNameNorm = norm(store.storeName);
  const bNameNorm = norm(store.brandName);

  // Tìm Plan trực tiếp của tháng đó hoặc suy dẫn từ Plan gốc tháng 10/2026
  const directPlan = matchStorePlan(store, month, allPlans);
  const octBaselinePlan =
    month === '2026/10' ? directPlan : matchStorePlan(store, '2026/10', allPlans);

  // Hệ số theo kỳ tháng nếu gian hàng chưa có bản ghi riêng trong tháng 08, 09, 11
  const monthRatio =
    month === '2026/10'
      ? 1
      : month === '2026/09'
        ? 0.92
        : month === '2026/08'
          ? 0.85
          : 1.1; // 2026/11 Mega Sale 11.11

  const activePlan = directPlan || octBaselinePlan;

  // Các chỉ số Plan gốc ở tháng 10 (từ Plan 4.1 hoặc từ bản ghi tháng 10)
  const baseBudgetNet =
    directPlan?.totalTargetBudget ??
    Math.round((store.budgetNet ?? store.monthlyBudget ?? octBaselinePlan?.totalTargetBudget ?? 0) * monthRatio);
  const baseBudgetGross =
    store.budgetGross && month === '2026/10'
      ? store.budgetGross
      : Math.round(baseBudgetNet * GROSS_MULTIPLIER);

  const baseAffBudgetNet =
    directPlan?.budgetAffiliate ??
    Math.round(
      (store.budgetAffiliateNet ?? store.budgetAffiliate ?? octBaselinePlan?.budgetAffiliate ?? baseBudgetNet * 0.8) *
        monthRatio
    );
  const baseSelfBudgetNet =
    directPlan?.budgetSelfChannel ??
    Math.round(
      (store.budgetSelfChannelNet ?? store.budgetSelfChannel ?? octBaselinePlan?.budgetSelfChannel ?? Math.max(0, baseBudgetNet - baseAffBudgetNet)) *
        monthRatio
    );
  const baseAdsBudget =
    directPlan?.budgetAdsTotal ??
    Math.round((octBaselinePlan?.budgetAdsTotal ?? baseBudgetNet * 0.2) * monthRatio);

  const baseAffVideos =
    directPlan?.targetAffiliateContents ??
    Math.round((store.targetAffiliateContents ?? octBaselinePlan?.targetAffiliateContents ?? 0) * monthRatio);
  const baseSelfVideos =
    directPlan?.targetSelfChannelContents ??
    Math.round((store.targetSelfChannelContents ?? octBaselinePlan?.targetSelfChannelContents ?? 0) * monthRatio);
  const baseFocVideos = Math.round((store.targetFocVideos ?? 0) * monthRatio);
  const sumVideos = baseAffVideos + baseSelfVideos + baseFocVideos;
  const planTotalVideos =
    directPlan?.totalTargetContents && directPlan.totalTargetContents > sumVideos
      ? directPlan.totalTargetContents
      : sumVideos;

  // Mục tiêu NMV của tháng (nếu file 4.1 để 0 nhưng có ngân sách hoặc có sản lượng video, tính NMV mục tiêu theo định mức sàn)
  const rawPlanNmv =
    directPlan?.targetGmv ||
    (month === '2026/10' ? store.monthlyTargetGmv : 0) ||
    octBaselinePlan?.targetGmv ||
    0;
  const planNmv =
    rawPlanNmv > 0
      ? Math.round(rawPlanNmv * (directPlan ? 1 : monthRatio))
      : baseBudgetNet > 0
        ? Math.round(baseBudgetNet * 4.5)
        : 0;

  // Lấy danh sách Booking Deals & Video thực tế (File 3.2) của gian hàng qua chỉ mục O(1)
  const matchedFile32 = FILE32_BY_STORE_NAME.get(sNameNorm) || [];
  const dealsIdx = getStoreDealsIndex(allDeals);
  const byNameDeals = dealsIdx.byStoreName.get(sNameNorm);
  const byIdDeals = store.id ? dealsIdx.byStoreId.get(store.id) : undefined;
  const byOpIdDeals = store.storeOperationId ? dealsIdx.byStoreId.get(store.storeOperationId) : undefined;

  let matchedAppDeals: BookingDealItem[] = [];
  if (byNameDeals && !byIdDeals && !byOpIdDeals) {
    matchedAppDeals = byNameDeals;
  } else if (byNameDeals || byIdDeals || byOpIdDeals) {
    const seenDeals = new Set<BookingDealItem>();
    for (const list of [byNameDeals, byIdDeals, byOpIdDeals]) {
      if (!list) continue;
      for (const d of list) {
        if (!seenDeals.has(d)) {
          seenDeals.add(d);
          matchedAppDeals.push(d);
        }
      }
    }
  }

  const appDealCodes = new Set(matchedAppDeals.map(d => d.dealCode));

  const octBookings: StoreMonthlyBookingRecord[] = [
    ...matchedAppDeals.map(d => convertDealToMonthlyBooking(d, '2026/10')),
    ...matchedFile32
      .filter(r => !appDealCodes.has(r.code))
      .map(r => convertBookedRecordToMonthlyBooking(r, '2026/10')),
  ];

  // Với các tháng 08, 09, 11: tạo danh sách booking theo đúng kỳ tháng
  const bookings: StoreMonthlyBookingRecord[] =
    month === '2026/10'
      ? octBookings
      : month === '2026/11'
        ? []
        : octBookings.map((b, idx) => {
            const monthNum = month.split('/')[1] || '09';
            const day = String(((idx * 3 + 5) % 25) + 2).padStart(2, '0');
            const costScaled = Math.round(b.costNet * monthRatio);
            const gmvScaled = Math.round(b.gmv * (month === '2026/09' ? 0.96 : 0.88));
            return {
              ...b,
              id: `${b.id}-${month}`,
              dealCode: `${b.dealCode.slice(0, 4)}${monthNum}${b.dealCode.slice(-5)}`,
              month,
              airDate: `2026-${monthNum}-${day}`,
              weekLabel: month === '2026/09' ? `W3${(idx % 4) + 6}` : `W3${(idx % 4) + 2}`,
              costNet: costScaled,
              gmv: gmvScaled,
              views: Math.round(b.views * monthRatio),
              orders: Math.round(b.orders * monthRatio),
              roas: costScaled > 0 ? Number((gmvScaled / costScaled).toFixed(2)) : b.roas,
              pipeline: 'Đã nghiệm thu',
              paymentStatus: 'Đã tất toán',
              slaWarning: 'Đúng hạn',
            };
          });

  // Chiến dịch TikTok Seller Ads của gian hàng
  const adsByStore = ADS_CAMPAIGNS_BY_STORE.byStore.get(sNameNorm) || [];
  const adsByBrand = sNameNorm.includes('tiktok') ? (ADS_CAMPAIGNS_BY_STORE.byBrand.get(bNameNorm) || []) : [];
  const adsCampaigns = adsByBrand.length === 0
    ? adsByStore
    : Array.from(new Set([...adsByStore, ...adsByBrand]));
  const adsCost =
    month === '2026/10'
      ? adsCampaigns.reduce((s, c) => s + c.cost, 0)
      : month === '2026/11'
        ? 0
        : Math.round(adsCampaigns.reduce((s, c) => s + c.cost, 0) * monthRatio);
  const adsGmv =
    month === '2026/10'
      ? adsCampaigns.reduce((s, c) => s + c.gmv, 0)
      : month === '2026/11'
        ? 0
        : Math.round(adsCampaigns.reduce((s, c) => s + c.gmv, 0) * monthRatio);

  // Tính chỉ số Report (Báo cáo thực tế trong tháng)
  const spentFromBookings = bookings.reduce((s, b) => s + b.costNet, 0);
  const reportSpentNet =
    month === '2026/10'
      ? Math.max(store.actualSpentNet ?? 0, directPlan?.spentBudget ?? 0, spentFromBookings)
      : month === '2026/11'
        ? directPlan?.spentBudget ?? 0
        : directPlan?.spentBudget ||
          spentFromBookings ||
          Math.round((store.actualSpentNet ?? baseBudgetNet * 0.94) * monthRatio);

  const gmvFromBookings = bookings.reduce((s, b) => s + b.gmv, 0);
  const reportNmv =
    month === '2026/10'
      ? Math.max(directPlan?.actualGmv ?? 0, gmvFromBookings + adsGmv, reportSpentNet > 0 ? Math.round(reportSpentNet * 3.8) : 0)
      : month === '2026/11'
        ? directPlan?.actualGmv ?? 0
        : directPlan?.actualGmv ||
          gmvFromBookings + adsGmv ||
          (planNmv > 0 ? Math.round(planNmv * (month === '2026/09' ? 1.03 : 0.97)) : 0);

  const airedFromBookings = bookings.filter(b => Boolean(b.linkAir) || b.pipeline.includes('lên sóng') || b.pipeline.includes('nghiệm thu')).length;
  const reportBookedVideos =
    month === '2026/10'
      ? Math.max(bookings.length, store.actualAiredVideos ?? 0, directPlan?.deliveredContents ?? 0)
      : month === '2026/11'
        ? directPlan?.deliveredContents ?? 0
        : Math.max(bookings.length, directPlan?.deliveredContents ?? planTotalVideos);

  const reportAiredVideos =
    month === '2026/10'
      ? Math.max(store.actualAiredVideos ?? 0, airedFromBookings, directPlan?.deliveredContents ?? 0)
      : month === '2026/11'
        ? 0
        : Math.max(airedFromBookings, directPlan?.deliveredContents ?? planTotalVideos);

  const reportViews = bookings.reduce((s, b) => s + b.views, 0);
  const reportOrders =
    bookings.reduce((s, b) => s + b.orders, 0) +
    (month === '2026/10' ? adsCampaigns.reduce((s, c) => s + c.orders, 0) : 0);
  const reportRoas =
    reportSpentNet > 0 ? Number((reportNmv / reportSpentNet).toFixed(2)) : 0;

  const nmvAchievementPct = planNmv > 0 ? Number(((reportNmv / planNmv) * 100).toFixed(1)) : 0;
  const budgetBurnPct = baseBudgetNet > 0 ? Number(((reportSpentNet / baseBudgetNet) * 100).toFixed(1)) : 0;
  const videoAchievementPct = planTotalVideos > 0 ? Number(((reportAiredVideos / planTotalVideos) * 100).toFixed(1)) : 0;

  const isOverbudget = baseBudgetNet > 0 && reportSpentNet > baseBudgetNet;
  const isUnbudgetedSpend = baseBudgetNet === 0 && reportSpentNet > 0;

  const planStatus: MonthlyPlanStatus =
    directPlan?.status ||
    (month === '2026/10'
      ? 'IN_EXECUTION'
      : month === '2026/11'
        ? 'DRAFT'
        : 'COMPLETED');

  const planStatusLabel =
    directPlan?.statusLabel ||
    (planStatus === 'COMPLETED'
      ? 'Đã quyết toán'
      : planStatus === 'IN_EXECUTION'
        ? 'Đang thực thi'
        : planStatus === 'REVISION_REQUESTED'
          ? 'Yêu cầu chỉnh sửa'
          : planStatus === 'PENDING_APPROVAL' || planStatus === 'PENDING_PRE_APPROVAL'
            ? 'Chờ phê duyệt'
            : 'Bản nháp');

  const pic =
    directPlan?.pic ||
    store.b2cOwnerName ||
    store.primaryPic ||
    (store.b2cOwners && store.b2cOwners[0]) ||
    'Lê Phương Thảo';

  return {
    storeId: store.id,
    storeName: store.storeName,
    brandName: store.brandName,
    platform: store.platform,
    month,
    monthLabel: monthMeta.shortLabel,
    plan: activePlan,
    planId: directPlan?.id || octBaselinePlan?.id || `PLAN-${month.replace('/', '-')}-${store.id}`,
    planTitle:
      directPlan?.title ||
      `Kế hoạch B2C ${monthMeta.shortLabel} — ${store.storeName}`,
    versionCode:
      directPlan?.currentVersionCode ||
      (month === '2026/10' ? octBaselinePlan?.currentVersionCode || 'v1.0' : 'v1.0'),
    planStatus,
    planStatusLabel,
    pic,
    specialistPic: pic,
    bookingLeader: store.bookingLeader,
    leaderPic: store.bookingLeader,
    hasBookingLeader: Boolean(store.hasBookingLeader && store.bookingLeader),
    growthPic: directPlan?.growthPic || store.growthPic || 'Growth Team',
    planNmv,
    planBudgetNet: baseBudgetNet,
    planBudgetGross: baseBudgetGross,
    planAffBudgetNet: baseAffBudgetNet,
    planSelfBudgetNet: baseSelfBudgetNet,
    planAdsBudget: baseAdsBudget,
    planTotalVideos,
    planAffVideos: baseAffVideos,
    planAffiliateVideos: baseAffVideos,
    planSelfVideos: baseSelfVideos,
    planSelfChannelVideos: baseSelfVideos,
    planFocVideos: baseFocVideos,
    reportNmv,
    nmvAchievementPct,
    reportSpentNet,
    budgetBurnPct,
    isOverbudget,
    isUnbudgetedSpend,
    reportBookedVideos,
    reportBookedCount: reportBookedVideos,
    reportAiredVideos,
    reportAiredCount: reportAiredVideos,
    videoAchievementPct,
    reportViews,
    reportOrders,
    reportRoas,
    adsCost,
    adsGmv,
    planItems: activePlan?.items || [],
    bookings,
    adsCampaigns,
  };
}

/**
 * Xây dựng dữ liệu Hồ sơ Kế hoạch & Báo cáo (Plan & Report) cho 1 Thương hiệu tại 1 kỳ tháng,
 * tổng hợp từ toàn bộ gian hàng trực thuộc và kế hoạch 3 vị trí gắn theo Brand.
 */
export function buildBrandMonthlyPlanReport(
  brandName: string,
  brandStores: StorePortfolioItem[],
  month: string,
  options?: {
    plans?: InputPlanBreakdownState[];
    monthlyPlans?: InputPlanBreakdownState[];
    deals?: BookingDealItem[];
    brandMaster?: BrandDetail;
    brandMonthlyPlans?: BrandMonthlyPlanItem[];
  }
): BrandMonthlyPlanReport {
  const monthMeta =
    PROFILE_MONTH_OPTIONS.find(m => m.value === month) || PROFILE_MONTH_OPTIONS[0];
  const allBrandPlans = options?.brandMonthlyPlans?.length
    ? options.brandMonthlyPlans
    : INITIAL_BRAND_MONTHLY_PLANS;

  const bNorm = norm(brandName);
  const brandPlan = allBrandPlans.find(
    bp =>
      (norm(bp.brandName) === bNorm ||
        norm(bp.brandName).includes(bNorm) ||
        bNorm.includes(norm(bp.brandName))) &&
      (bp.month === month || bp.month === '2026/10')
  );

  const effectivePlans = options?.plans || options?.monthlyPlans;
  const storeReports = brandStores.map(st =>
    buildStoreMonthlyPlanReport(st, month, {
      plans: effectivePlans,
      deals: options?.deals,
    })
  );

  const planNmv = storeReports.reduce((s, r) => s + r.planNmv, 0) || (brandPlan?.planStrategyPlan.targetBrandGmv ?? 0);
  const planBudgetNet = storeReports.reduce((s, r) => s + r.planBudgetNet, 0) || (brandPlan?.planStrategyPlan.targetBrandBudget ?? 0);
  const planBudgetGross = storeReports.reduce((s, r) => s + r.planBudgetGross, 0) || Math.round(planBudgetNet * GROSS_MULTIPLIER);
  const planAffBudgetNet = storeReports.reduce((s, r) => s + r.planAffBudgetNet, 0);
  const planSelfBudgetNet = storeReports.reduce((s, r) => s + r.planSelfBudgetNet, 0);
  const planAdsBudget = storeReports.reduce((s, r) => s + r.planAdsBudget, 0);
  const planTotalVideos = storeReports.reduce((s, r) => s + r.planTotalVideos, 0);
  const planAffVideos = storeReports.reduce((s, r) => s + r.planAffVideos, 0);
  const planSelfVideos = storeReports.reduce((s, r) => s + r.planSelfVideos, 0);
  const planFocVideos = storeReports.reduce((s, r) => s + r.planFocVideos, 0);

  const reportNmv = storeReports.reduce((s, r) => s + r.reportNmv, 0);
  const reportSpentNet = storeReports.reduce((s, r) => s + r.reportSpentNet, 0);
  const reportBookedVideos = storeReports.reduce((s, r) => s + r.reportBookedVideos, 0);
  const reportAiredVideos = storeReports.reduce((s, r) => s + r.reportAiredVideos, 0);
  const reportViews = storeReports.reduce((s, r) => s + r.reportViews, 0);
  const reportOrders = storeReports.reduce((s, r) => s + r.reportOrders, 0);
  const reportRoas = reportSpentNet > 0 ? Number((reportNmv / reportSpentNet).toFixed(2)) : 0;

  const nmvAchievementPct = planNmv > 0 ? Number(((reportNmv / planNmv) * 100).toFixed(1)) : 0;
  const budgetBurnPct = planBudgetNet > 0 ? Number(((reportSpentNet / planBudgetNet) * 100).toFixed(1)) : 0;
  const videoAchievementPct = planTotalVideos > 0 ? Number(((reportAiredVideos / planTotalVideos) * 100).toFixed(1)) : 0;
  const overbudgetStoresCount = storeReports.filter(r => r.isOverbudget || r.isUnbudgetedSpend).length;
  const unbudgetedStoresCount = storeReports.filter(r => r.isUnbudgetedSpend).length;
  const platforms = Array.from(new Set(storeReports.map(r => r.platform).filter(Boolean)));

  const isOverbudget =
    (planBudgetNet > 0 && reportSpentNet > planBudgetNet) ||
    storeReports.some(r => r.isOverbudget);
  const isUnbudgetedSpend =
    (planBudgetNet === 0 && reportSpentNet > 0) ||
    storeReports.some(r => r.isUnbudgetedSpend);

  const bookings = storeReports.flatMap(r => r.bookings);

  const planStatusLabel =
    month === '2026/10'
      ? 'Đang thực thi'
      : month === '2026/11'
        ? 'Đang lập Plan'
        : 'Đã quyết toán';

  return {
    brandName,
    month,
    monthLabel: monthMeta.shortLabel,
    brandPlan,
    storeReports,
    storeCount: storeReports.length,
    platforms,
    planStatusLabel,
    overbudgetStoresCount,
    unbudgetedStoresCount,
    planNmv,
    planBudgetNet,
    planBudgetGross,
    planAffBudgetNet,
    planSelfBudgetNet,
    planAdsBudget,
    planTotalVideos,
    planAffVideos,
    planSelfVideos,
    planFocVideos,
    reportNmv,
    nmvAchievementPct,
    reportSpentNet,
    budgetBurnPct,
    isOverbudget,
    isUnbudgetedSpend,
    reportBookedVideos,
    reportBookedCount: reportBookedVideos,
    reportAiredVideos,
    reportAiredCount: reportAiredVideos,
    videoAchievementPct,
    videoAiredPct: videoAchievementPct,
    reportViews,
    reportTotalViews: reportViews,
    reportOrders,
    reportTotalOrders: reportOrders,
    reportRoas,
    bookings,
  };
}
