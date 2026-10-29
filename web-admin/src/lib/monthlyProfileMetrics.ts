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
import { bookingDealCost } from './planDealLink';

export interface ProfileMonthOption {
  value: string;
  label: string;
  shortLabel: string;
  periodTag: string;
}

/** Kỳ của ngân sách, chỉ tiêu, thực chi ghi trên gian hàng trong Dữ liệu gốc. */
export const STORE_MASTER_MONTH = '2026/10';
/** File 3.2 (video đã book) và số liệu TikTok Seller Ads hiện có đều thuộc tháng 10/2026. */
const FILE32_MONTH = '2026/10';
const ADS_MONTH = '2026/10';

/** Tháng plan của deal sinh từ kế hoạch (campaignCode PLAN-YYYYMM). Deal không gắn plan thì không thuộc tháng nào. */
export function dealPlanMonth(d: Pick<BookingDealItem, 'campaignCode'>): string | undefined {
  const m = /^PLAN-(\d{4})(\d{2})$/.exec(d.campaignCode || '');
  return m ? `${m[1]}/${m[2]}` : undefined;
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
  /** Tháng có plan hoặc số liệu thực tế; false thì màn hình để trống. */
  hasData: boolean;
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
  hasData: boolean;
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

const plansByMonthCache = new WeakMap<InputPlanBreakdownState[], Map<string, InputPlanBreakdownState[]>>();

function getPlansForMonth(allPlans: InputPlanBreakdownState[], month: string): InputPlanBreakdownState[] {
  let byMonth = plansByMonthCache.get(allPlans);
  if (!byMonth) {
    byMonth = new Map<string, InputPlanBreakdownState[]>();
    for (const p of allPlans) {
      const m = p.month || '';
      let list = byMonth.get(m);
      if (!list) {
        list = [];
        byMonth.set(m, list);
      }
      list.push(p);
    }
    plansByMonthCache.set(allPlans, byMonth);
  }
  return byMonth.get(month) || [];
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

  const monthPlans = getPlansForMonth(allPlans, month);
  // 1. Khớp chính xác theo storeId hoặc storeName
  const exactStore = monthPlans.find(
    p =>
      (p.storeId && (norm(p.storeId) === sId || norm(p.storeId) === sOpId)) ||
      (p.storeName && norm(p.storeName) === sName) ||
      norm(p.brandName) === sName
  );
  if (exactStore) return exactStore;

  // 2. Khớp theo brandName chỉ khi cùng nền tảng sàn và không gắn cố định vào một storeId khác
  const isShopee = sName.includes('shopee') || norm(store.platform).includes('shopee');
  const isLazada = sName.includes('lazada') || norm(store.platform).includes('lazada');
  const brandPlans = monthPlans.filter(p => {
    if (p.storeId && norm(p.storeId) !== sId && norm(p.storeId) !== sOpId) {
      return false;
    }
    const target = `${norm(p.storeName)} ${norm(p.brandName)}`;
    if (isShopee && (target.includes('tiktok') || target.includes('lazada'))) return false;
    if (isLazada && (target.includes('tiktok') || target.includes('shopee'))) return false;
    if (!isShopee && !isLazada && (target.includes('shopee') || target.includes('lazada'))) return false;

    const pb = norm(p.brandName).split('_')[0];
    const sb = bName.split('_')[0];
    return pb && sb && (pb === sb || norm(p.brandName) === bName);
  });
  if (brandPlans.length === 1) return brandPlans[0];
  if (brandPlans.length > 1) {
    const platformMatched = brandPlans.find(p => {
      const target = `${norm(p.storeName)} ${norm(p.brandName)}`;
      if (isShopee) return target.includes('shopee');
      if (isLazada) return target.includes('lazada');
      return target.includes('tiktok');
    });
    return platformMatched || null;
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
  const cost = bookingDealCost(d);
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

const FILE32_CONVERTED_BY_STORE_NAME = new Map<string, StoreMonthlyBookingRecord[]>();

function getFile32ConvertedBookings(sNameNorm: string): StoreMonthlyBookingRecord[] {
  let cached = FILE32_CONVERTED_BY_STORE_NAME.get(sNameNorm);
  if (cached) return cached;
  const raw = FILE32_BY_STORE_NAME.get(sNameNorm) || [];
  cached = raw.map(r => convertBookedRecordToMonthlyBooking(r, '2026/10'));
  FILE32_CONVERTED_BY_STORE_NAME.set(sNameNorm, cached);
  return cached;
}

const EMPTY_DEALS_REF: BookingDealItem[] = [];
const storeReportMemoCache = new WeakMap<
  StorePortfolioItem,
  Map<string, { plansRef: InputPlanBreakdownState[]; dealsRef: BookingDealItem[]; report: StoreMonthlyPlanReport }>
>();

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
  const allDeals = options?.deals || EMPTY_DEALS_REF;

  const byMonthCache = storeReportMemoCache.get(store);
  const cachedEntry = byMonthCache?.get(month);
  if (cachedEntry && cachedEntry.plansRef === allPlans && cachedEntry.dealsRef === allDeals) {
    return cachedEntry.report;
  }

  const monthMeta =
    PROFILE_MONTH_OPTIONS.find(m => m.value === month) || PROFILE_MONTH_OPTIONS[0];

  const sNameNorm = norm(store.storeName);
  const bNameNorm = norm(store.brandName);

  // Plan của đúng tháng đang xem. Tháng không có plan và không có số liệu thì để trống, không suy diễn.
  const directPlan = matchStorePlan(store, month, allPlans);
  // Ngân sách, chỉ tiêu và thực chi ghi trên gian hàng (Dữ liệu gốc) chỉ thuộc kỳ hiện hành.
  const isStoreMasterMonth = month === STORE_MASTER_MONTH;
  const activePlan = directPlan;

  const baseBudgetNet =
    directPlan?.totalTargetBudget ??
    (isStoreMasterMonth ? store.budgetNet ?? store.monthlyBudget ?? 0 : 0);
  const baseBudgetGross =
    store.budgetGross && isStoreMasterMonth && !directPlan
      ? store.budgetGross
      : Math.round(baseBudgetNet * GROSS_MULTIPLIER);

  const baseAffBudgetNet =
    directPlan?.budgetAffiliate ??
    (isStoreMasterMonth ? store.budgetAffiliateNet ?? store.budgetAffiliate ?? Math.round(baseBudgetNet * 0.8) : 0);
  const baseSelfBudgetNet =
    directPlan?.budgetSelfChannel ??
    (isStoreMasterMonth
      ? store.budgetSelfChannelNet ?? store.budgetSelfChannel ?? Math.max(0, baseBudgetNet - baseAffBudgetNet)
      : 0);
  const baseAdsBudget = directPlan?.budgetAdsTotal ?? Math.round(baseBudgetNet * 0.2);

  const baseAffVideos =
    directPlan?.targetAffiliateContents ?? (isStoreMasterMonth ? store.targetAffiliateContents ?? 0 : 0);
  const baseSelfVideos =
    directPlan?.targetSelfChannelContents ?? (isStoreMasterMonth ? store.targetSelfChannelContents ?? 0 : 0);
  const baseFocVideos = isStoreMasterMonth ? store.targetFocVideos ?? 0 : 0;
  const sumVideos = baseAffVideos + baseSelfVideos + baseFocVideos;
  const planTotalVideos =
    directPlan?.totalTargetContents && directPlan.totalTargetContents > sumVideos
      ? directPlan.totalTargetContents
      : sumVideos;

  // Mục tiêu NMV của tháng (nếu file 4.1 để 0 nhưng có ngân sách hoặc có sản lượng video, tính NMV mục tiêu theo định mức sàn)
  const rawPlanNmv =
    directPlan?.targetGmv ||
    (isStoreMasterMonth ? store.monthlyTargetGmv : 0) ||
    0;
  const planNmv =
    rawPlanNmv > 0
      ? rawPlanNmv
      : baseBudgetNet > 0
        ? Math.round(baseBudgetNet * 4.5)
        : 0;

  // Lấy danh sách Booking Deals & Video thực tế (File 3.2) của gian hàng qua chỉ mục O(1)
  const matchedFile32Bookings = getFile32ConvertedBookings(sNameNorm);
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

  // Deal sinh từ kế hoạch tính vào tháng của plan; File 3.2 là booking thực tế tháng 10/2026.
  const monthAppDeals = matchedAppDeals.filter(d => dealPlanMonth(d) === month);
  const monthFile32Bookings = month === FILE32_MONTH ? matchedFile32Bookings : [];
  const bookings: StoreMonthlyBookingRecord[] =
    monthAppDeals.length === 0
      ? monthFile32Bookings
      : (() => {
          const appDealCodes = new Set(monthAppDeals.map(d => d.dealCode));
          return [
            ...monthAppDeals.map(d => convertDealToMonthlyBooking(d, month)),
            ...monthFile32Bookings.filter(b => !appDealCodes.has(b.dealCode)),
          ];
        })();

  // Chiến dịch TikTok Seller Ads của gian hàng
  const adsByStore = ADS_CAMPAIGNS_BY_STORE.byStore.get(sNameNorm) || [];
  const adsByBrand = sNameNorm.includes('tiktok') ? (ADS_CAMPAIGNS_BY_STORE.byBrand.get(bNameNorm) || []) : [];
  const adsCampaigns = adsByBrand.length === 0
    ? adsByStore
    : Array.from(new Set([...adsByStore, ...adsByBrand]));
  // Số liệu Ads hiện có là của tháng 10/2026.
  const monthAdsCampaigns = month === ADS_MONTH ? adsCampaigns : [];
  const adsCost = monthAdsCampaigns.reduce((s, c) => s + c.cost, 0);
  const adsGmv = monthAdsCampaigns.reduce((s, c) => s + c.gmv, 0);

  // Tính chỉ số Report (Báo cáo thực tế trong tháng)
  const spentFromBookings = bookings.reduce((s, b) => s + b.costNet, 0);
  const reportSpentNet = Math.max(
    isStoreMasterMonth ? store.actualSpentNet ?? 0 : 0,
    directPlan?.spentBudget ?? 0,
    spentFromBookings,
  );

  const gmvFromBookings = bookings.reduce((s, b) => s + b.gmv, 0);
  const realTotalGmv = gmvFromBookings + adsGmv;
  const reportNmv = realTotalGmv > 0 ? realTotalGmv : directPlan?.actualGmv ?? 0;

  const airedFromBookings = bookings.filter(b => Boolean(b.linkAir) || b.pipeline.includes('lên sóng') || b.pipeline.includes('nghiệm thu')).length;
  const storeAiredVideos = isStoreMasterMonth ? store.actualAiredVideos ?? 0 : 0;
  const reportBookedVideos = Math.max(bookings.length, storeAiredVideos, directPlan?.deliveredContents ?? 0);
  const reportAiredVideos = Math.max(storeAiredVideos, airedFromBookings, directPlan?.deliveredContents ?? 0);

  const reportViews = bookings.reduce((s, b) => s + b.views, 0);
  const reportOrders =
    bookings.reduce((s, b) => s + b.orders, 0) +
    monthAdsCampaigns.reduce((s, c) => s + c.orders, 0);
  const reportRoas =
    reportSpentNet > 0 ? Number((reportNmv / reportSpentNet).toFixed(2)) : 0;

  const nmvAchievementPct = planNmv > 0 ? Number(((reportNmv / planNmv) * 100).toFixed(1)) : 0;
  const budgetBurnPct = baseBudgetNet > 0 ? Number(((reportSpentNet / baseBudgetNet) * 100).toFixed(1)) : 0;
  const videoAchievementPct = planTotalVideos > 0 ? Number(((reportAiredVideos / planTotalVideos) * 100).toFixed(1)) : 0;

  const isOverbudget = baseBudgetNet > 0 && reportSpentNet > baseBudgetNet;
  const isUnbudgetedSpend = baseBudgetNet === 0 && reportSpentNet > 0;

  const planStatus: MonthlyPlanStatus = directPlan?.status || 'DRAFT';

  const planStatusLabel =
    directPlan?.statusLabel ||
    (!directPlan
      ? 'Chưa có plan'
      : planStatus === 'COMPLETED'
      ? 'Đã quyết toán'
      : planStatus === 'IN_EXECUTION'
        ? 'Đang thực thi'
        : planStatus === 'REVISION_REQUESTED'
          ? 'Yêu cầu chỉnh sửa'
          : planStatus === 'PENDING_APPROVAL' || planStatus === 'PENDING_PRE_APPROVAL'
            ? 'Chờ phê duyệt'
            : 'Bản nháp');

  const pic =
    store.b2cOwnerName ||
    store.primaryPic ||
    (store.b2cOwners && store.b2cOwners[0]) ||
    directPlan?.pic ||
    'Lê Phương Thảo';

  const report: StoreMonthlyPlanReport = {
    storeId: store.id,
    storeName: store.storeName,
    brandName: store.brandName,
    platform: store.platform,
    month,
    monthLabel: monthMeta.shortLabel,
    plan: activePlan,
    planId: directPlan?.id || `PLAN-${month.replace('/', '-')}-${store.id}`,
    planTitle:
      directPlan?.title ||
      `Kế hoạch B2C ${monthMeta.shortLabel} — ${store.storeName}`,
    versionCode: directPlan?.currentVersionCode || 'v1.0',
    planStatus,
    planStatusLabel,
    pic,
    specialistPic: pic,
    bookingLeader: store.bookingLeader,
    leaderPic: store.bookingLeader,
    hasBookingLeader: Boolean(store.hasBookingLeader && store.bookingLeader),
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
    hasData:
      Boolean(directPlan) ||
      bookings.length > 0 ||
      monthAdsCampaigns.length > 0 ||
      (isStoreMasterMonth && (baseBudgetNet > 0 || planTotalVideos > 0 || reportSpentNet > 0 || storeAiredVideos > 0)),
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

  let nextByMonth = storeReportMemoCache.get(store);
  if (!nextByMonth) {
    nextByMonth = new Map();
    storeReportMemoCache.set(store, nextByMonth);
  }
  nextByMonth.set(month, { plansRef: allPlans, dealsRef: allDeals, report });
  return report;
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
      bp.month === month
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
  const overbudgetStoresCount = storeReports.filter(r => r.isOverbudget).length;
  const unbudgetedStoresCount = storeReports.filter(r => r.isUnbudgetedSpend).length;
  const platforms = Array.from(new Set(storeReports.map(r => r.platform).filter(Boolean)));

  const isOverbudget =
    (planBudgetNet > 0 && reportSpentNet > planBudgetNet) ||
    storeReports.some(r => r.isOverbudget);
  const isUnbudgetedSpend =
    (planBudgetNet === 0 && reportSpentNet > 0) ||
    storeReports.some(r => r.isUnbudgetedSpend);

  const bookings = storeReports.flatMap(r => r.bookings);

  const hasData = Boolean(brandPlan) || storeReports.some(r => r.hasData);
  const planStatusLabel = hasData ? monthMeta.periodTag : 'Chưa có dữ liệu';

  return {
    brandName,
    month,
    monthLabel: monthMeta.shortLabel,
    brandPlan,
    storeReports,
    storeCount: storeReports.length,
    platforms,
    planStatusLabel,
    hasData,
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
