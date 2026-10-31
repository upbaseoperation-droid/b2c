import {
  BrandOneSheetPlanData,
  BrandOneSheetPillarRow,
  BrandOneSheetTikTokWeeklyRow,
  BrandOneSheetTikTokContentRow,
  BrandOneSheetShopeeWeeklyTarget,
  BrandOneSheetShopeeContentRow,
  BrandMonthlyPlanItem,
  CampaignItem,
  InputPlanBreakdownState,
  StorePortfolioItem,
  KeyVisualScheduleRow,
  PlanTierKey,
  PlanWeekRow,
  isCampaignActiveInMonth,
  getCampaignPhaseForMonth,
} from './types';
import {
  resolveWeekRows,
  hasBreakdownData,
  distributeItemsToWeeks,
  distributeReference41ToWeeks,
  TIER_KEYS,
  SELF_TYPES,
} from './planBreakdownRules';

export interface Brand411WeekData {
  week: 'W1' | 'W2' | 'W3' | 'W4' | 'W5';
  dateRange: string;
  tapCount: number;
  kl1Count: number;
  kl2Count: number;
  kl3Count: number;
  kl4Count: number;
  kl5Count: number;
  kl6Count: number;
  kl7Count: number;
  kl1Budget: number;
  kl2Budget: number;
  kl3Budget: number;
  kl4Budget: number;
  kl5Budget: number;
  kl6Budget: number;
  kl7Budget: number;
  ttSelfQty: number;
  ttSelfBudget: number;
  ttLiveAffSessions: number;
  ttLiveAffBudget: number;
  ttLiveSelfSessions: number;
  ttLiveSelfBudget: number;
  spVideos: number;
  spBudget: number;
  spLiveSessions: number;
  spLiveBudget: number;
}

export interface Brand411Summary {
  matchingStorePlans: InputPlanBreakdownState[];
  tiktokPlans: InputPlanBreakdownState[];
  shopeePlans: InputPlanBreakdownState[];
  has411Plan: boolean;
  weeks: Brand411WeekData[];
  ttCastQty: number;
  ttCastBudget: number;
  ttFocQty: number;
  ttSelfQty: number;
  ttSelfBudget: number;
  ttLiveAffSessions: number;
  ttLiveAffBudget: number;
  ttLiveSelfSessions: number;
  ttLiveSelfBudget: number;
  ttAdsBudget: number;
  ttTargetGmv: number;
  spVideos: number;
  spBudget: number;
  spLiveSessions: number;
  spLiveBudget: number;
  spAdsBudget: number;
  spTargetGmv: number;
  totalNetBudget411: number;
  totalVideos411: number;
}

function getEffectiveWeekRowsForPlan(plan: InputPlanBreakdownState): PlanWeekRow[] {
  return resolveWeekRows(plan);
}

function splitTo4Weeks(total: number): number[] {
  const clean = Math.max(0, Math.round(total));
  const base = Math.floor(clean / 4);
  const rem = clean - base * 4;
  return [0, 1, 2, 3].map((i) => base + (i < rem ? 1 : 0));
}

export function extractBrand411Summary(params: {
  brandName: string;
  month: string;
  storePlans?: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
}): Brand411Summary {
  const { brandName, month, storePlans = [], storePortfolios = [] } = params;
  const cleanBrand = (brandName || '').split('_')[0].trim() || 'pH Care';
  const normBrand = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const monthNum = (month.split('/')[1] || '10').padStart(2, '0');

  const brandStores = storePortfolios.filter((s) => {
    const sb = (s.brandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return sb.length >= 2 && normBrand.length >= 2 && (sb === normBrand || sb.includes(normBrand) || normBrand.includes(sb));
  });
  const brandStoreIds = new Set(brandStores.map((s) => s.id));
  const brandStoreSlugs = new Set(
    brandStores.map((s) => (s.storeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
  );

  const matchingStorePlans = storePlans.filter((p) => {
    if (month !== 'ALL' && p.month !== month) return false;
    if (p.storeId && brandStoreIds.has(p.storeId)) return true;
    const pStoreSlug = (p.storeName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pStoreSlug && brandStoreSlugs.has(pStoreSlug)) return true;
    const pb = (p.parentBrand || p.brandName || '').split('_')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return pb.length >= 2 && normBrand.length >= 2 && (pb === normBrand || pb.includes(normBrand) || normBrand.includes(pb));
  });

  const isShopeePlan = (p: InputPlanBreakdownState) => {
    const st = brandStores.find((s) => s.id === p.storeId);
    const label = `${st?.platform || ''} ${p.storeName || ''} ${p.brandName || ''}`.toLowerCase();
    return label.includes('shopee');
  };

  const tiktokPlans = matchingStorePlans.filter((p) => !isShopeePlan(p));
  const shopeePlans = matchingStorePlans.filter((p) => isShopeePlan(p));

  const weekRanges: Array<{ week: 'W1' | 'W2' | 'W3' | 'W4' | 'W5'; range: string }> = [
    { week: 'W1', range: `01–07/${monthNum}` },
    { week: 'W2', range: `08–14/${monthNum}` },
    { week: 'W3', range: `15–21/${monthNum}` },
    { week: 'W4', range: `22–28/${monthNum}` },
    { week: 'W5', range: `29–30/${monthNum}` },
  ];

  const weeks: Brand411WeekData[] = weekRanges.map((w) => ({
    week: w.week,
    dateRange: w.range,
    tapCount: 0,
    kl1Count: 0,
    kl2Count: 0,
    kl3Count: 0,
    kl4Count: 0,
    kl5Count: 0,
    kl6Count: 0,
    kl7Count: 0,
    kl1Budget: 0,
    kl2Budget: 0,
    kl3Budget: 0,
    kl4Budget: 0,
    kl5Budget: 0,
    kl6Budget: 0,
    kl7Budget: 0,
    ttSelfQty: 0,
    ttSelfBudget: 0,
    ttLiveAffSessions: 0,
    ttLiveAffBudget: 0,
    ttLiveSelfSessions: 0,
    ttLiveSelfBudget: 0,
    spVideos: 0,
    spBudget: 0,
    spLiveSessions: 0,
    spLiveBudget: 0,
  }));

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  // 1. Cộng dữ liệu từ các bản 4.1.1 của gian hàng TikTok
  for (const p of tiktokPlans) {
    const effRows = getEffectiveWeekRowsForPlan(p);
    effRows.slice(0, 5).forEach((r, wi) => {
      const target = weeks[wi];
      if (!target) return;
      target.tapCount += num(r.foc?.tapBrand) + num(r.foc?.tap) + num(r.foc?.tapUp);
      target.kl1Count += num(r.tiers?.KL1?.qty);
      target.kl2Count += num(r.tiers?.KL2?.qty);
      target.kl3Count += num(r.tiers?.KL3?.qty);
      target.kl4Count += num(r.tiers?.KL4?.qty);
      target.kl5Count += num(r.tiers?.KL5?.qty);
      target.kl6Count += num(r.tiers?.KL6?.qty);
      target.kl7Count += num(r.tiers?.KL7?.qty);

      target.kl1Budget += num(r.tiers?.KL1?.budgetNet);
      target.kl2Budget += num(r.tiers?.KL2?.budgetNet);
      target.kl3Budget += num(r.tiers?.KL3?.budgetNet);
      target.kl4Budget += num(r.tiers?.KL4?.budgetNet);
      target.kl5Budget += num(r.tiers?.KL5?.budgetNet);
      target.kl6Budget += num(r.tiers?.KL6?.budgetNet);
      target.kl7Budget += num(r.tiers?.KL7?.budgetNet);

      const weekSelf = SELF_TYPES.reduce((s, t) => s + num(r.self?.[t.key]), 0);
      target.ttSelfQty += weekSelf;
      target.ttSelfBudget += num(r.self?.budgetNet);

      target.ttLiveAffSessions += num(r.live?.sessions);
      target.ttLiveAffBudget += num(r.live?.budgetNet);

      target.ttLiveSelfSessions +=
        num(r.liveSelf?.inhouse3h) + num(r.liveSelf?.ctv2h) + num(r.liveSelf?.brand2h);
      target.ttLiveSelfBudget += num(r.liveSelf?.budgetNet);

      // Nếu bản 4.1.1 TikTok có chia Đa sàn Shopee và Brand không có bản Shopee riêng
      if (shopeePlans.length === 0) {
        target.spVideos += num(r.multiPlatform?.shopee?.affQty) + num(r.multiPlatform?.shopee?.reupQty);
        target.spBudget += num(r.multiPlatform?.shopee?.budgetNet);
      }
    });

    // Nếu weeklyBreakdown chưa có self/live nhưng trong items hoặc reference41 của p có self/live
    const sumPlanWeekSelf = effRows.reduce(
      (s, r) => s + SELF_TYPES.reduce((acc, t) => acc + num(r.self?.[t.key]), 0),
      0
    );
    const sumPlanWeekSelfBud = effRows.reduce((s, r) => s + num(r.self?.budgetNet), 0);
    const itemsSelf = (p.items || []).filter((it) => it.channel === 'SELF_CHANNEL');
    const fallbackSelfQty =
      itemsSelf.reduce((s, it) => s + num(it.qty), 0) || num(p.reference41?.selfVideos);
    const fallbackSelfBud =
      itemsSelf.reduce((s, it) => s + num(it.totalBudget), 0) || num(p.reference41?.selfCostNet);
    if (sumPlanWeekSelf === 0 && fallbackSelfQty > 0) {
      const q4 = splitTo4Weeks(fallbackSelfQty);
      q4.forEach((v, idx) => {
        weeks[idx].ttSelfQty += v;
      });
    }
    if (sumPlanWeekSelfBud === 0 && fallbackSelfBud > 0) {
      const b4 = splitTo4Weeks(fallbackSelfBud);
      b4.forEach((v, idx) => {
        weeks[idx].ttSelfBudget += v;
      });
    }

    const sumPlanWeekLive = effRows.reduce((s, r) => s + num(r.live?.sessions), 0);
    const sumPlanWeekLiveBud = effRows.reduce((s, r) => s + num(r.live?.budgetNet), 0);
    const itemsLive = (p.items || []).filter((it) => it.channel === 'LIVESTREAM');
    const fallbackLiveQty =
      itemsLive.reduce((s, it) => s + num(it.qty), 0) || num(p.reference41?.liveSessions);
    const fallbackLiveBud =
      itemsLive.reduce((s, it) => s + num(it.totalBudget), 0) || num(p.reference41?.liveCostNet);
    if (sumPlanWeekLive === 0 && fallbackLiveQty > 0) {
      const q4 = splitTo4Weeks(fallbackLiveQty);
      q4.forEach((v, idx) => {
        weeks[idx].ttLiveAffSessions += v;
      });
    }
    if (sumPlanWeekLiveBud === 0 && fallbackLiveBud > 0) {
      const b4 = splitTo4Weeks(fallbackLiveBud);
      b4.forEach((v, idx) => {
        weeks[idx].ttLiveAffBudget += v;
      });
    }
  }

  // 2. Cộng dữ liệu từ các bản 4.1.1 của gian hàng Shopee
  for (const p of shopeePlans) {
    const effRows = getEffectiveWeekRowsForPlan(p);
    let planSpVideosFromWeeks = 0;
    let planSpBudgetFromWeeks = 0;
    effRows.slice(0, 5).forEach((r, wi) => {
      const target = weeks[wi];
      if (!target) return;
      const wCast = TIER_KEYS.reduce((s, k: PlanTierKey) => s + num(r.tiers?.[k]?.qty), 0);
      const wCastBud = TIER_KEYS.reduce((s, k: PlanTierKey) => s + num(r.tiers?.[k]?.budgetNet), 0);
      const wFoc = num(r.foc?.tapBrand) + num(r.foc?.tap) + num(r.foc?.tapUp);
      const wSelf = SELF_TYPES.reduce((s, t) => s + num(r.self?.[t.key]), 0);
      const wSelfBud = num(r.self?.budgetNet);
      const wMpSp = num(r.multiPlatform?.shopee?.affQty) + num(r.multiPlatform?.shopee?.reupQty);
      const wMpSpBud = num(r.multiPlatform?.shopee?.budgetNet);

      const vTotal = wCast + wFoc + wSelf + wMpSp;
      const bTotal = wCastBud + wSelfBud + wMpSpBud;
      target.spVideos += vTotal;
      target.spBudget += bTotal;
      target.spLiveSessions +=
        num(r.live?.sessions) +
        num(r.liveSelf?.inhouse3h) +
        num(r.liveSelf?.ctv2h) +
        num(r.liveSelf?.brand2h);
      target.spLiveBudget += num(r.live?.budgetNet) + num(r.liveSelf?.budgetNet);

      planSpVideosFromWeeks += vTotal;
      planSpBudgetFromWeeks += bTotal;
    });

    // Fallback nếu bản Shopee để số ở items SHOPEE / SHOPEE_LAZADA hoặc totalTargetContents
    if (planSpVideosFromWeeks === 0 && planSpBudgetFromWeeks === 0) {
      const spItems = (p.items || []).filter((it) => !it.id.startsWith('WB-'));
      const itemQty =
        spItems.reduce((s, it) => s + num(it.qty), 0) ||
        num(p.reference41?.cast) + num(p.reference41?.foc) + num(p.reference41?.selfVideos) ||
        num(p.totalTargetContents);
      const itemBud =
        spItems.reduce((s, it) => s + num(it.totalBudget), 0) ||
        num(p.reference41?.affCostNet) + num(p.reference41?.selfCostNet) ||
        num(p.totalTargetBudget);
      const q4 = splitTo4Weeks(itemQty);
      const b4 = splitTo4Weeks(itemBud);
      q4.forEach((v, idx) => {
        weeks[idx].spVideos += v;
      });
      b4.forEach((v, idx) => {
        weeks[idx].spBudget += v;
      });
    }
  }

  const ttCastQty = weeks.reduce(
    (s, w) => s + w.kl1Count + w.kl2Count + w.kl3Count + w.kl4Count + w.kl5Count + w.kl6Count + w.kl7Count,
    0
  );
  const ttCastBudget = weeks.reduce(
    (s, w) =>
      s + w.kl1Budget + w.kl2Budget + w.kl3Budget + w.kl4Budget + w.kl5Budget + w.kl6Budget + w.kl7Budget,
    0
  );
  const ttFocQty = weeks.reduce((s, w) => s + w.tapCount, 0);
  const ttSelfQty = weeks.reduce((s, w) => s + w.ttSelfQty, 0);
  const ttSelfBudget = weeks.reduce((s, w) => s + w.ttSelfBudget, 0);
  const ttLiveAffSessions = weeks.reduce((s, w) => s + w.ttLiveAffSessions, 0);
  const ttLiveAffBudget = weeks.reduce((s, w) => s + w.ttLiveAffBudget, 0);
  const ttLiveSelfSessions = weeks.reduce((s, w) => s + w.ttLiveSelfSessions, 0);
  const ttLiveSelfBudget = weeks.reduce((s, w) => s + w.ttLiveSelfBudget, 0);

  const spVideos = weeks.reduce((s, w) => s + w.spVideos, 0);
  const spBudget = weeks.reduce((s, w) => s + w.spBudget, 0);
  const spLiveSessions = weeks.reduce((s, w) => s + w.spLiveSessions, 0);
  const spLiveBudget = weeks.reduce((s, w) => s + w.spLiveBudget, 0);

  const tiktokStores = brandStores.filter((s) => !s.platform.toLowerCase().includes('shopee'));
  const shopeeStores = brandStores.filter((s) => s.platform.toLowerCase().includes('shopee'));

  const ttTargetGmv =
    tiktokPlans.reduce((s, p) => s + num(p.targetGmv), 0) ||
    tiktokStores.reduce((s, st) => s + num(st.monthlyTargetGmv), 0);
  const spTargetGmv =
    shopeePlans.reduce((s, p) => s + num(p.targetGmv), 0) ||
    shopeeStores.reduce((s, st) => s + num(st.monthlyTargetGmv), 0);

  const ttAdsBudget = tiktokPlans.reduce((s, p) => s + num(p.budgetAdsTotal), 0);
  const spAdsBudget = shopeePlans.reduce((s, p) => s + num(p.budgetAdsTotal), 0);

  const totalNetBudget411 =
    ttCastBudget + ttSelfBudget + ttLiveAffBudget + ttLiveSelfBudget + spBudget + spLiveBudget;
  const totalVideos411 =
    ttCastQty + ttFocQty + ttSelfQty + ttLiveAffSessions + ttLiveSelfSessions + spVideos + spLiveSessions;

  return {
    matchingStorePlans,
    tiktokPlans,
    shopeePlans,
    has411Plan: matchingStorePlans.length > 0,
    weeks,
    ttCastQty,
    ttCastBudget,
    ttFocQty,
    ttSelfQty,
    ttSelfBudget,
    ttLiveAffSessions,
    ttLiveAffBudget,
    ttLiveSelfSessions,
    ttLiveSelfBudget,
    ttAdsBudget,
    ttTargetGmv,
    spVideos,
    spBudget,
    spLiveSessions,
    spLiveBudget,
    spAdsBudget,
    spTargetGmv,
    totalNetBudget411,
    totalVideos411,
  };
}

export function buildDefaultKvScheduleRows(month: string, kvPic = 'Lê Thanh Hải'): KeyVisualScheduleRow[] {
  const monthNum = (month.split('/')[1] || '10').padStart(2, '0');
  const yearNum = month.split('/')[0] || '2026';
  const mInt = parseInt(monthNum, 10) || 10;
  const yInt = parseInt(yearNum, 10) || 2026;
  const prevMonthInt = mInt === 1 ? 12 : mInt - 1;
  const prevYearInt = mInt === 1 ? yInt - 1 : yInt;
  const prevMonthStr = String(prevMonthInt).padStart(2, '0');
  const prevYearStr = String(prevYearInt);

  return [
    {
      id: `kv-sched-master-${yearNum}${monthNum}`,
      phaseName: 'Master KV đầu tháng',
      deliverables: 'Master KV + Bộ Banner SIS + Khung ảnh PDP',
      refDate: `${prevYearStr}-${prevMonthStr}-13`,
      orderDate: `${prevYearStr}-${prevMonthStr}-22`,
      draftDate: `${prevYearStr}-${prevMonthStr}-25`,
      approveDate: `${prevYearStr}-${prevMonthStr}-28`,
      hangDate: `${yearNum}-${monthNum}-01`,
      pic: kvPic,
      note: 'Dùng proposal hiện có, bổ sung packshot SKU đúng quy chuẩn',
    },
    {
      id: `kv-sched-mega-${yearNum}${monthNum}`,
      phaseName: `Adapt Sale Đôi ${monthNum}.${monthNum}`,
      deliverables: 'Banner Campaign + Khung giá Sale Đôi + Sticker Deal',
      refDate: `${prevYearStr}-${prevMonthStr}-28`,
      orderDate: `${yearNum}-${monthNum}-01`,
      draftDate: `${yearNum}-${monthNum}-05`,
      approveDate: `${yearNum}-${monthNum}-08`,
      hangDate: `${yearNum}-${monthNum}-10`,
      pic: kvPic,
      note: `Cập nhật voucher & ưu đãi đợt Sale Đôi ${monthNum}.${monthNum}`,
    },
    {
      id: `kv-sched-payday-${yearNum}${monthNum}`,
      phaseName: 'Adapt Cuối tháng & Payday',
      deliverables: 'Banner Payday + Khung ảnh Deal cuối tháng',
      refDate: `${yearNum}-${monthNum}-14`,
      orderDate: `${yearNum}-${monthNum}-17`,
      draftDate: `${yearNum}-${monthNum}-21`,
      approveDate: `${yearNum}-${monthNum}-24`,
      hangDate: `${yearNum}-${monthNum}-26`,
      pic: kvPic,
      note: 'Đồng bộ CTKM cuối tháng & Payday trên 2 sàn',
    },
  ];
}

/**
 * Xây dựng dữ liệu chuẩn 1-Sheet Monthly Content & Key Visual Plan trình Brand
 * Tự động kéo & tổng hợp từ:
 *  - Vị trí Brand Strategy & Thực thể Chiến dịch (Section 01)
 *  - Kế hoạch Gian hàng TikTok Shop + Shopee của Brand trong tháng (Section 02)
 *  - Vị trí Key Visual / SIS (Section 03)
 *  - Đội ngũ Booking & Content TikTok Shop (Section 04)
 *  - Đội ngũ Content Shopee & Chiến lược Pillar P01–P05 (Section 05)
 */
export function buildBrandOneSheetPlanData(params: {
  brandName: string;
  month: string;
  brandPlan?: BrandMonthlyPlanItem | null;
  storePlans?: InputPlanBreakdownState[];
  storePortfolios?: StorePortfolioItem[];
  campaigns?: CampaignItem[];
}): BrandOneSheetPlanData {
  const {
    brandName,
    month,
    brandPlan,
    storePlans = [],
    storePortfolios = [],
    campaigns = [],
  } = params;

  const cleanBrand = (brandName || '').split('_')[0].trim() || 'pH Care';
  const normBrand = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isPhCare = normBrand.includes('phcare');

  // 1. Tổng hợp dữ liệu chuẩn từ 4.1.1 (storePlans)
  const s411 = extractBrand411Summary({
    brandName,
    month,
    storePlans,
    storePortfolios,
  });
  const { matchingStorePlans, tiktokPlans, shopeePlans, weeks: w411 } = s411;

  const explicitCampaignId = brandPlan?.campaignId || matchingStorePlans.find((p) => p.campaignId)?.campaignId;
  const activeCampaign =
    (explicitCampaignId ? campaigns.find((c) => c.id === explicitCampaignId) : undefined) ||
    campaigns.find((c) => {
      const cb = (c.brand || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (cb === normBrand || cb.includes(normBrand) || normBrand.includes(cb)) && isCampaignActiveInMonth(c, month);
    });

  const hasCampaign =
    brandPlan?.hasCampaign !== undefined
      ? Boolean(brandPlan.hasCampaign)
      : matchingStorePlans.some((p) => p.hasCampaign !== undefined)
      ? Boolean(matchingStorePlans.find((p) => p.hasCampaign !== undefined)?.hasCampaign)
      : Boolean(activeCampaign);

  const activePhase = activeCampaign ? getCampaignPhaseForMonth(activeCampaign, month) : undefined;

  const monthNum = (month.split('/')[1] || '10').padStart(2, '0');
  const yearNum = month.split('/')[0] || '2026';

  const tiktokPlan = tiktokPlans[0];
  const shopeePlan = shopeePlans[0];

  const totalBookingVideoBudget = s411.ttCastBudget;
  const tiktokGmvSeller = s411.ttTargetGmv || brandPlan?.planStrategyPlan?.targetBrandGmv || 0;
  const tiktokCancelRate = tiktokPlan?.cancellationRate ?? 0.1;
  const tiktokNmvSeller = Math.round(tiktokGmvSeller * (1 - tiktokCancelRate));
  const tiktokAov = 200000;
  const tiktokOrders = tiktokGmvSeller > 0 ? Math.round(tiktokGmvSeller / tiktokAov) : 0;
  const tiktokCr = 0.05;
  const tiktokTraffic = tiktokOrders > 0 ? Math.round(tiktokOrders / tiktokCr) : 0;

  const shopeeGmvSeller = s411.spTargetGmv || 0;
  const shopeeCancelRate = shopeePlan?.cancellationRate ?? 0.05;
  const shopeeNmvSeller = Math.round(shopeeGmvSeller * (1 - shopeeCancelRate));
  const shopeeAov = 200000;
  const shopeeOrders = shopeeGmvSeller > 0 ? Math.round(shopeeGmvSeller / shopeeAov) : 0;
  const shopeeCr = 0.05;
  const shopeeTraffic = shopeeOrders > 0 ? Math.round(shopeeOrders / shopeeCr) : 0;

  // Doanh thu theo hoạt động
  const tiktokGmvVideo = Math.round(tiktokGmvSeller * 0.55);
  const tiktokGmvLive =
    s411.ttLiveAffSessions + s411.ttLiveSelfSessions > 0 ? Math.round(tiktokGmvSeller * 0.2) : 0;
  const tiktokGmvCard = Math.max(0, tiktokGmvSeller - tiktokGmvVideo - tiktokGmvLive);

  const shopeeGmvVideo = s411.spVideos > 0 ? Math.round(shopeeGmvSeller * 0.4) : 0;
  const shopeeGmvLive = s411.spLiveSessions > 0 ? Math.round(shopeeGmvSeller * 0.2) : 0;
  const shopeeGmvCard = Math.max(0, shopeeGmvSeller - shopeeGmvVideo - shopeeGmvLive);

  const preparedBy =
    brandPlan?.planStrategyPic ||
    activeCampaign?.brandStrategyPic ||
    tiktokPlan?.pic ||
    'Hoàng Thuỳ';

  const contentMainPic =
    brandPlan?.contentBrandMainPic ||
    shopeePlan?.pic ||
    tiktokPlan?.pic ||
    'Bích Liên';

  const kvPic =
    brandPlan?.keyVisualSisPic ||
    activeCampaign?.kvPic ||
    'Lê Thanh Hải';

  const heroSkuText =
    activeCampaign?.heroSkus?.join(' | ') ||
    (isPhCare
      ? 'pH Care Natural (chai Xanh lá) | Delicate, Cooling 20/10 mới có hàng.'
      : `${cleanBrand} Hero SKU chủ lực & Combo bán chạy tháng ${monthNum}/${yearNum}`);

  // Section 01: Định hướng tháng
  const orientation = {
    roleInYearPlan:
      activeCampaign?.roleInYearPlan ||
      (hasCampaign
        ? `Scale video chuyển đổi trước/sau đợt sale tháng ${monthNum}; duy trì nhận diện trên 2 sàn.`
        : `Duy trì nhịp chuyển đổi thường nhật (Always-on) tháng ${monthNum}/${yearNum} trên TikTok Shop & Shopee.`),
    objectivesAndBarriers:
      activeCampaign?.objectivesAndBarriers ||
      `Mục tiêu: tăng khách mới và mua combo. | Rào cản: Ít SKU, quà chưa đa dạng. KH ngại hỏi trực tiếp về sản phẩm, chưa rõ SKU/giá sau voucher.`,
    heroSkusUspRtb: heroSkuText,
    seasonalOpportunity:
      activeCampaign?.seasonalOpportunity ||
      `Chuẩn bị routine cá nhân cho mùa bận rộn; mua tích trữ trong đợt sale tháng ${monthNum}/${yearNum}.`,
    bigIdeaMonthlyTheme:
      activeCampaign?.bigIdea ||
      brandPlan?.planStrategyPlan.bigIdeaAndKeyMessage ||
      (isPhCare
        ? 'Kiểm soát mùi, mở tự tin - chăm sóc cá nhân để thoải mái trong nhịp sống mỗi ngày.'
        : `${cleanBrand} — Chăm sóc chuẩn chuyên gia, tự tin tỏa sáng mỗi ngày.`),
    previousMonthReview: `Bài học tháng trước: nội dung demo rõ cách dùng và giải thích deal tốt hơn video chỉ nêu giá. Tập trung tối ưu hook 3s đầu và điều kiện voucher.`,
    targetAudienceInsight:
      activeCampaign?.targetAudience ||
      `Tệp đề xuất: nữ 22–35, văn phòng/lifestyle. | Insight: muốn chăm sóc bản thân nhưng cần giải thích kín đáo, dễ hiểu và đáng tin.`,
    comboPromoOffer:
      activeCampaign?.comboPromoOffer ||
      `Chai đơn giảm 10%; combo 2 sản phẩm giảm 15%; voucher tối đa 30.000đ từ 199.000đ. Quà combo: chờ Brand chốt loại/quy cách/tồn; chưa đưa vào KV trước khi xác nhận.`,
    campaignSaleMilestones:
      activePhase?.saleMilestones ||
      activeCampaign?.saleMilestones ||
      `W1 (01–07/${monthNum}): warm-up. W2 (08–14/${monthNum}): Sale Đôi ${monthNum}.${monthNum}. W3 (15–21/${monthNum}): FAQ/review. W4 (22–28/${monthNum}): sale cuối tháng + Payday. W5 (29–30/${monthNum}): kéo dài nội dung mua lại/recap theo CTKM đã duyệt.`,
    keyMessageAndCta:
      activeCampaign?.keyMessage ||
      `Công nghệ & thành phần chủ đạo theo brief Brand đã duyệt. CTA: Ưu đãi tháng ${monthNum}, xem giá và điều kiện trước khi chốt đơn; không dùng claim quá mức khi chưa có căn cứ.`,
  };

  // Section 03: Key Visual
  const keyVisual = {
    theme:
      activeCampaign?.keyVisualSpec?.theme ||
      brandPlan?.keyVisualSisPlan.designTheme ||
      (isPhCare ? 'Feminine Editorial Scrapbook' : `Clean Editorial & Hero Product Cut-out ${cleanBrand}`),
    fonts: activeCampaign?.keyVisualSpec?.fonts || 'Museo, Magnolia Script, Neutraface Text',
    moodboard:
      activeCampaign?.keyVisualSpec?.moodboard ||
      (isPhCare
        ? 'Feminine Editorial Scrapbook: trắng/kem, hồng và xanh lá pH Care; chai Natural hero cut-out, Delicate/Cooling phụ theo hàng thực tế. Lifestyle phụ nữ trưởng thành; USP đặt trên giấy xé/label.'
        : `Tone màu chuẩn nhận diện ${cleanBrand}, sản phẩm Hero cut-out rõ nét, nhãn USP đặt nổi bật, bố cục thoáng cho cả 2 sàn TikTok Shop & Shopee.`),
    proposalUrl:
      activeCampaign?.keyVisualSpec?.proposalUrl ||
      'https://www.canva.com/design/DAHUH0fjPbo/ZFDjboVvuFLmGk18oeJW0w/edit',
    promoTextOnKv:
      activeCampaign?.keyVisualSpec?.promoTextOnKv ||
      `Đơn lẻ -10%; combo 2 -15%; voucher tối đa 30.000đ từ 199.000đ. Đồng bộ offer với mục 01; chỉ in quà tặng sau khi Brand xác nhận tồn kho.`,
    hangDate:
      activeCampaign?.keyVisualSpec?.hangDate ||
      `Treo master 01/${monthNum}/${yearNum}; draft 25 tháng trước, duyệt 28 tháng trước. Adapt Sale Đôi ${monthNum}.${monthNum}: treo 10/${monthNum}. Adapt Cuối tháng: treo 26/${monthNum}.`,
    orderDate:
      activeCampaign?.keyVisualSpec?.orderDate ||
      `Order master 22 tháng trước (10 ngày trước treo). Order adapt ${monthNum}.${monthNum}: 01/${monthNum}; Cuối tháng: 17/${monthNum}.`,
    refDate:
      activeCampaign?.keyVisualSpec?.refDate ||
      `Ref master 13 tháng trước (9 ngày trước order). Dùng proposal hiện có, bổ sung packshot SKU đúng.`,
    kvPic,
    kvImages:
      brandPlan?.keyVisualSisPlan?.kvImages ||
      activeCampaign?.keyVisualSpec?.kvImages ||
      [],
    kvScheduleRows:
      activeCampaign?.keyVisualSpec?.kvScheduleRows && activeCampaign.keyVisualSpec.kvScheduleRows.length > 0
        ? activeCampaign.keyVisualSpec.kvScheduleRows
        : buildDefaultKvScheduleRows(month, kvPic),
  };

  // Section 04: 5 tuần TikTok KOC & Booking lấy trực tiếp từ 4.1.1 (`w411`)
  const tiktokWeeklyRows: BrandOneSheetTikTokWeeklyRow[] = w411.map((w) => {
    const weekVideos =
      w.tapCount +
      w.kl1Count +
      w.kl2Count +
      w.kl3Count +
      w.kl4Count +
      w.kl5Count +
      w.kl6Count +
      w.kl7Count;
    const weekBudget =
      w.kl1Budget +
      w.kl2Budget +
      w.kl3Budget +
      w.kl4Budget +
      w.kl5Budget +
      w.kl6Budget +
      w.kl7Budget;
    return {
      week: w.week,
      dateRange: w.dateRange,
      tapCount: w.tapCount,
      kl1Count: w.kl1Count,
      kl2Count: w.kl2Count,
      kl3Count: w.kl3Count,
      kl4Count: w.kl4Count,
      kl5Count: w.kl5Count,
      kl6Count: w.kl6Count,
      kl7Count: w.kl7Count,
      tapBudget: 0,
      kl1Budget: w.kl1Budget,
      kl2Budget: w.kl2Budget,
      kl3Budget: w.kl3Budget,
      kl4Budget: w.kl4Budget,
      kl5Budget: w.kl5Budget,
      kl6Budget: w.kl6Budget,
      kl7Budget: w.kl7Budget,
      targetBookingGmv:
        weekBudget > 0
          ? Math.round(weekBudget * 5.5)
          : s411.ttCastBudget > 0
          ? 0
          : Math.round((tiktokGmvVideo / 4) * (w.week === 'W5' ? 0 : 1)),
      ownerActionNote: `4.1.1 ${w.week}: ${weekVideos} video AFF (${w.tapCount} FOC) · NS Net ${weekBudget.toLocaleString('vi-VN')}đ`,
    };
  });

  const buildTierMixLabel = (w: BrandOneSheetTikTokWeeklyRow) => {
    const parts: string[] = [];
    if (w.tapCount > 0) parts.push(`TAP×${w.tapCount}`);
    if (w.kl1Count > 0) parts.push(`KL1×${w.kl1Count}`);
    if (w.kl2Count > 0) parts.push(`KL2×${w.kl2Count}`);
    if (w.kl3Count > 0) parts.push(`KL3×${w.kl3Count}`);
    if (w.kl4Count > 0) parts.push(`KL4×${w.kl4Count}`);
    if (w.kl5Count > 0) parts.push(`KL5×${w.kl5Count}`);
    if (w.kl6Count > 0) parts.push(`KL6×${w.kl6Count}`);
    if (w.kl7Count > 0) parts.push(`KL7×${w.kl7Count}`);
    return parts.length > 0 ? parts.join(', ') : 'Theo phân rã 4.1.1';
  };

  const affWeekMeta = [
    {
      sku: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU / Combo 2`,
      pillar: 'Product education: hiểu SKU/RTB',
      angle: 'Trước khi mua: đọc nhãn và chọn routine phù hợp; tránh nói quá claim.',
    },
    {
      sku: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi ${monthNum}.${monthNum}`,
      pillar: 'Promotion: hiểu deal & combo',
      angle: 'Đọc deal combo 2 sản phẩm: giá, voucher và điều kiện áp dụng thật rõ.',
    },
    {
      sku: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU chủ lực`,
      pillar: 'Social proof: trải nghiệm thật',
      angle: 'Review trải nghiệm có thật: thao tác dùng/bao bì; không dựng kết quả điều trị.',
    },
    {
      sku: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      pillar: 'Promotion: chọn mua trong đợt sale',
      angle: `Chọn đơn lẻ hay combo, giải thích giá/voucher; nhắc đợt sale cuối tháng theo CTKM đã duyệt.`,
    },
    {
      sku: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      pillar: 'Usage: chọn mua lại',
      angle: 'Routine cuối tháng: nhắc xem thông tin SKU trước khi mua lại.',
    },
  ];

  const selfWeekMeta = [
    {
      sku: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU`,
      pillar: 'Problem / tình huống',
      angle: 'Video Kênh Brand (Self-channel): đọc nhãn sản phẩm, chọn SKU theo nhu cầu và FAQ.',
    },
    {
      sku: isPhCare ? 'Natural + Delicate/Cooling (tùy tồn)' : `${cleanBrand} Combo Sale Đôi`,
      pillar: 'Promotion',
      angle: `Video Kênh Brand (Self-channel): giải thích giá đơn lẻ/combo, điều kiện voucher ${monthNum}.${monthNum}.`,
    },
    {
      sku: isPhCare ? 'Natural / Delicate (tùy tồn)' : `${cleanBrand} Hero SKU`,
      pillar: 'Product education',
      angle: 'Video Kênh Brand (Self-channel): FAQ chăm sóc hằng ngày; giới thiệu phân loại SKU theo tồn kho.',
    },
    {
      sku: isPhCare ? 'Natural + Cooling (tùy tồn)' : `${cleanBrand} Combo Cuối Tháng`,
      pillar: 'Usage / routine',
      angle: `Video Kênh Brand (Self-channel): routine khi bận + checklist mua hàng cuối tháng ${monthNum}.`,
    },
    {
      sku: isPhCare ? 'Natural / combo mua lại' : `${cleanBrand} Combo Mua Lại`,
      pillar: 'Usage / mua lại',
      angle: 'Video Kênh Brand (Self-channel): recap cách chọn SKU/mua lại, không tạo khan hiếm giả.',
    },
  ];

  // Section 04.3: Chi tiết Content TikTok khớp 100% số lượng & ngân sách với 4.1.1
  const tiktokContentRows: BrandOneSheetTikTokContentRow[] = [];
  tiktokWeeklyRows.forEach((w, idx) => {
    const affQty =
      w.tapCount +
      w.kl1Count +
      w.kl2Count +
      w.kl3Count +
      w.kl4Count +
      w.kl5Count +
      w.kl6Count +
      w.kl7Count;
    const affBud =
      w.kl1Budget +
      w.kl2Budget +
      w.kl3Budget +
      w.kl4Budget +
      w.kl5Budget +
      w.kl6Budget +
      w.kl7Budget;
    if (idx < 4 || affQty > 0 || affBud > 0) {
      const meta = affWeekMeta[idx] || affWeekMeta[0];
      tiktokContentRows.push({
        id: `tt-cnt-aff-${idx + 1}`,
        weekAndAirDate: `${w.week} | ${w.dateRange}`,
        skuOrCombo: meta.sku,
        touchpointSource: 'Video affiliate',
        klGroup: 'Mix KL / TAP',
        kocCriteria: `Theo phân rã 4.1.1 (${buildTierMixLabel(w)})`,
        pillar: meta.pillar,
        angleAndBrief: meta.angle,
        contentType: 'Video',
        qty: affQty,
        budgetVnd: affBud,
        pic: tiktokPlan?.pic || preparedBy,
      });
    }
  });

  w411.forEach((w, idx) => {
    if (idx < 4 || w.ttSelfQty > 0 || w.ttSelfBudget > 0) {
      const meta = selfWeekMeta[idx] || selfWeekMeta[0];
      tiktokContentRows.push({
        id: `tt-cnt-self-${idx + 1}`,
        weekAndAirDate: `${w.week} | ${w.dateRange}`,
        skuOrCombo: meta.sku,
        touchpointSource: 'Video self',
        klGroup: 'Không áp dụng',
        kocCriteria: 'Kênh Brand tự xây (Self-channel 4.1.1)',
        pillar: meta.pillar,
        angleAndBrief: meta.angle,
        contentType: 'Video',
        qty: w.ttSelfQty,
        budgetVnd: w.ttSelfBudget,
        pic: contentMainPic,
      });
    }
  });

  // Section 05: 5 Chiến lược Pillar P01 -> P05 (tỷ trọng nhân với tổng video thực tế 4.1.1)
  const totalBrandVideos = s411.ttCastQty + s411.ttFocQty + s411.ttSelfQty + s411.spVideos;
  const pillarCounts = [0, 1, 2, 3, 4].map((i) => {
    const base = Math.floor(totalBrandVideos / 5);
    const rem = totalBrandVideos - base * 5;
    return base + (i < rem ? 1 : 0);
  });
  const contentPillars: BrandOneSheetPillarRow[] = [
    {
      pillarId: 'P01',
      pillarName: 'Problem / tình huống',
      behaviorObjective: 'Nhận biết nhu cầu chăm sóc',
      insightAndBarrier: 'Ngại hỏi trực tiếp về routine',
      messageAndRtb: 'Chăm sóc cá nhân kín đáo, dễ hiểu',
      priorityAngle: 'FAQ từ tình huống đời sống',
      suitableFormat: 'FAQ / POV',
      videoWeightRatio: 0.2,
      monthlyVideoCount: pillarCounts[0],
    },
    {
      pillarId: 'P02',
      pillarName: 'Product education',
      behaviorObjective: 'Hiểu nhãn và cách dùng',
      insightAndBarrier: 'Chưa rõ cách dùng/sản phẩm',
      messageAndRtb: 'Hướng dẫn theo nhãn đã duyệt',
      priorityAngle: 'Demo thao tác, đọc nhãn',
      suitableFormat: 'Demo / tutorial',
      videoWeightRatio: 0.2,
      monthlyVideoCount: pillarCounts[1],
    },
    {
      pillarId: 'P03',
      pillarName: 'Social proof',
      behaviorObjective: 'Tin từ trải nghiệm thật',
      insightAndBarrier: 'Chưa biết có phù hợp mình',
      messageAndRtb: 'Review từ người đã trải nghiệm',
      priorityAngle: 'Unbox/texture/bao bì; không giả kết quả',
      suitableFormat: 'Review / unbox',
      videoWeightRatio: 0.2,
      monthlyVideoCount: pillarCounts[2],
    },
    {
      pillarId: 'P04',
      pillarName: 'Promotion',
      behaviorObjective: 'Hiểu offer và mua',
      insightAndBarrier: 'Ngại điều kiện voucher phức tạp',
      messageAndRtb: 'Giá + điều kiện ưu đãi rõ',
      priorityAngle: 'Chai đơn vs combo; đọc điều kiện',
      suitableFormat: 'Deal explainer',
      videoWeightRatio: 0.2,
      monthlyVideoCount: pillarCounts[3],
    },
    {
      pillarId: 'P05',
      pillarName: 'Usage / mua lại',
      behaviorObjective: 'Nhớ routine và chọn mua lại',
      insightAndBarrier: 'Mua về nhưng dùng thiếu đều',
      messageAndRtb: 'Routine cá nhân hợp nhu cầu',
      priorityAngle: 'Checklist lựa chọn/mua lại',
      suitableFormat: 'Routine / checklist',
      videoWeightRatio: 0.2,
      monthlyVideoCount: pillarCounts[4],
    },
  ];

  // Section 05.2: Target tuần Content Shopee (W1 -> W5) lấy trực tiếp từ 4.1.1
  const shopeeWeeklyTargets: BrandOneSheetShopeeWeeklyTarget[] = w411.map((w) => ({
    week: w.week,
    airDateRange: w.dateRange,
    plannedVideos: w.spVideos,
    contentBudget: w.spBudget,
    targetViews: w.spVideos * 15000,
    targetVideoGmv:
      w.spBudget > 0
        ? Math.round(w.spBudget * 5.5)
        : w.spVideos > 0
        ? Math.round((shopeeGmvVideo / Math.max(1, s411.spVideos)) * w.spVideos)
        : 0,
    ownerAction: `4.1.1 Shopee ${w.week}: ${w.spVideos} video · NS Net ${w.spBudget.toLocaleString('vi-VN')}đ`,
  }));

  // Section 05.3: Lịch sản xuất & air Content Shopee khớp 100% số lượng & ngân sách với 4.1.1
  const kvCode = `KV${monthNum}-${cleanBrand.slice(0, 2).toUpperCase()}`;
  const spTemplates = [
    {
      weekIdx: 0,
      day: '03',
      objective: 'Awareness',
      pillarId: 'P01',
      angle: '3 điều cần đọc trên nhãn trước khi chọn sản phẩm',
      format: 'FAQ',
      method: 'VJ',
    },
    {
      weekIdx: 0,
      day: '06',
      objective: 'Consideration',
      pillarId: 'P02',
      angle: 'Routine ở nhà: đọc hướng dẫn và chọn thao tác phù hợp',
      format: 'Demo',
      method: 'Remix',
    },
    {
      weekIdx: 1,
      day: '10',
      objective: 'Consideration',
      pillarId: 'P03',
      angle: 'Review từ người đã dùng: đọc nhãn, bao bì và cảm nhận thật; không dựng kết quả.',
      format: 'Review / unbox',
      method: 'VJ',
    },
    {
      weekIdx: 1,
      day: '12',
      objective: 'Conversion',
      pillarId: 'P04',
      angle: `Chai đơn hay combo: giải thích giá/voucher và điều kiện đợt ${monthNum}.${monthNum}.`,
      format: 'Deal explainer',
      method: 'Remix',
    },
    {
      weekIdx: 2,
      day: '16',
      objective: 'Loyalty',
      pillarId: 'P05',
      angle: 'Checklist routine cá nhân cuối ngày; CTA xem hướng dẫn và lựa chọn SKU.',
      format: 'Routine',
      method: 'VJ',
    },
    {
      weekIdx: 2,
      day: '19',
      objective: 'Awareness',
      pillarId: 'P01',
      angle: 'FAQ ngại hỏi: 3 điều nên đọc trên nhãn trước khi chọn sản phẩm.',
      format: 'FAQ',
      method: 'Remix',
    },
    {
      weekIdx: 3,
      day: '24',
      objective: 'Consideration',
      pillarId: 'P02',
      angle: 'Demo dùng theo nhãn; quay cận thao tác.',
      format: 'Demo',
      method: 'VJ',
    },
    {
      weekIdx: 3,
      day: '27',
      objective: 'Consideration',
      pillarId: 'P03',
      angle: `Unbox/review cảm nhận thật, source có quyền sử dụng. Kết thúc CTA xem deal 27/${monthNum}.`,
      format: 'Review / unbox',
      method: 'Remix',
    },
    {
      weekIdx: 4,
      day: '29',
      objective: 'Conversion',
      pillarId: 'P04',
      angle: 'Deal cuối tháng: giá, điều kiện, thời hạn; không tạo khan hiếm giả.',
      format: 'Deal explainer',
      method: 'VJ',
    },
    {
      weekIdx: 4,
      day: '30',
      objective: 'Loyalty',
      pillarId: 'P05',
      angle: 'Recap routine và cách chọn mua lại theo nhu cầu; không cam kết điều trị.',
      format: 'Routine',
      method: 'Remix',
    },
  ];

  const shopeeContentRows: BrandOneSheetShopeeContentRow[] = [];
  for (let wIdx = 0; wIdx < 5; wIdx++) {
    const wData = w411[wIdx];
    if (wIdx === 4 && wData.spVideos === 0 && wData.spBudget === 0) continue;
    const t1 = spTemplates[wIdx * 2];
    const t2 = spTemplates[wIdx * 2 + 1];
    const q1 = Math.ceil(wData.spVideos / 2);
    const q2 = Math.max(0, wData.spVideos - q1);
    const b1 = wData.spVideos > 0 ? Math.round((wData.spBudget * q1) / wData.spVideos) : Math.round(wData.spBudget / 2);
    const b2 = Math.max(0, wData.spBudget - b1);

    shopeeContentRows.push({
      id: `sp-cnt-${wIdx * 2 + 1}`,
      week: wData.week,
      skuOrCombo: isPhCare ? 'Natural / combo 2 Natural' : `${cleanBrand} Hero SKU / Combo`,
      touchpointSource: 'Video self',
      airOrHandoverDate: `${t1.day}/${monthNum}/${yearNum}`,
      behaviorObjective: t1.objective,
      pillarId: t1.pillarId,
      angleAndBrief: t1.angle,
      format: t1.format,
      productionMethod: t1.method,
      qty: q1,
      budgetVnd: b1,
      ownerDeadlineKvNote: `${contentMainPic}; draft trước air 2 ngày; ${kvCode}`,
    });
    if (q2 > 0 || b2 > 0 || wData.spVideos === 0) {
      shopeeContentRows.push({
        id: `sp-cnt-${wIdx * 2 + 2}`,
        week: wData.week,
        skuOrCombo: isPhCare ? 'Natural + Delicate/Cooling' : `${cleanBrand} Combo Chiến Dịch`,
        touchpointSource: 'Video self',
        airOrHandoverDate: `${t2.day}/${monthNum}/${yearNum}`,
        behaviorObjective: t2.objective,
        pillarId: t2.pillarId,
        angleAndBrief: t2.angle,
        format: t2.format,
        productionMethod: t2.method,
        qty: q2,
        budgetVnd: b2,
        ownerDeadlineKvNote: `${contentMainPic}; draft trước air 2 ngày; ${kvCode}`,
      });
    }
  }

  const totalAffVideos = s411.ttCastQty + s411.ttFocQty;
  const freshData: BrandOneSheetPlanData = {
    brandName: cleanBrand,
    month,
    preparedBy,
    statusAndCutoffNote: `Chốt kế hoạch: 13/${monthNum}/${yearNum} | Trạng thái: ${
      brandPlan?.status === 'APPROVED' || brandPlan?.status === 'IN_EXECUTION'
        ? 'Đã phê duyệt'
        : 'Đang rà soát trình Brand'
    }`,
    hasCampaign,
    campaignId: activeCampaign?.id,
    campaignCode: activeCampaign?.code,
    campaignTitle: activeCampaign?.title,
    campaignPhaseName: activePhase?.phaseName || (hasCampaign ? `Giai đoạn ${month}` : undefined),
    orientation,
    shopeeKpi: {
      gmvSeller: shopeeGmvSeller,
      nmvSeller: shopeeNmvSeller,
      orders: shopeeOrders,
      traffic: shopeeTraffic,
      conversionRate: shopeeCr,
      aov: shopeeAov,
      cancellationRate: shopeeCancelRate,
      gmvVideo: shopeeGmvVideo,
      gmvLivestream: shopeeGmvLive,
      gmvProductCard: shopeeGmvCard,
      costBookingVideoAff: 0,
      costVideoSelfChannel: s411.spBudget,
      costAds: s411.spAdsBudget,
      costBookingLiveAff: s411.spLiveBudget,
      costLiveSelfChannel: 0,
      costDisplayPackage: 0,
      costOtherNet: 0,
      costAffiliateCommission: 0,
      costAffiliateAdsCommission: 0,
    },
    tiktokKpi: {
      gmvSeller: tiktokGmvSeller,
      nmvSeller: tiktokNmvSeller,
      orders: tiktokOrders,
      traffic: tiktokTraffic,
      conversionRate: tiktokCr,
      aov: tiktokAov,
      cancellationRate: tiktokCancelRate,
      gmvVideo: tiktokGmvVideo,
      gmvLivestream: tiktokGmvLive,
      gmvProductCard: tiktokGmvCard,
      costBookingVideoAff: totalBookingVideoBudget,
      costVideoSelfChannel: s411.ttSelfBudget,
      costAds: s411.ttAdsBudget,
      costBookingLiveAff: s411.ttLiveAffBudget,
      costLiveSelfChannel: s411.ttLiveSelfBudget,
      costDisplayPackage: 0,
      costOtherNet: 0,
      costAffiliateCommission: 0,
      costAffiliateAdsCommission: 0,
    },
    kpiBalanceNote:
      'Lưu ý: Số liệu Chi phí Booking Video Affiliate, Video Self-channel, Livestream và Số lượng Video tuần được đồng bộ trực tiếp từ Bản phân rã 4.1.1 của các gian hàng thuộc Brand.',
    keyVisual,
    tiktokOverviewExtra: {
      selfRevenueTarget: s411.ttSelfBudget > 0 ? Math.round(s411.ttSelfBudget * 6) : Math.round(tiktokGmvVideo * 0.25),
      selfContentCount: s411.ttSelfQty,
      selfCostNet: s411.ttSelfBudget,
      affRevenueTarget: totalBookingVideoBudget > 0 ? Math.round(totalBookingVideoBudget * 5.5) : Math.round(tiktokGmvVideo * 0.75),
      awarenessVideoTagCount: Math.round(totalAffVideos * 0.35),
      brandingVideoTagCount: Math.round(totalAffVideos * 0.15),
      liveSelfOrders: s411.ttLiveSelfSessions * 30,
      liveSelfSessions2h: s411.ttLiveSelfSessions,
      liveAffOrders: s411.ttLiveAffSessions * 40,
      liveAffSessions: s411.ttLiveAffSessions,
    },
    tiktokWeeklyRows,
    tiktokContentRows,
    contentPillars,
    shopeeWeeklyTargets,
    shopeeContentRows,
  };

  // Nếu đã có oneSheetPlanData lưu trước đó, giữ lại nội dung định hướng/KV/Pillar do người dùng nhập
  // nhưng tự động đồng bộ các bảng số liệu 4.1.1 (02 KPI, 4.1, 4.2, 5.2) và thay thế các dòng mẫu cố định cũ
  const savedOneSheet =
    (brandPlan?.oneSheetPlanData && brandPlan.oneSheetPlanData.month === month
      ? brandPlan.oneSheetPlanData
      : undefined) || matchingStorePlans.find((p) => p.oneSheetPlanData)?.oneSheetPlanData;

  if (savedOneSheet) {
    const existingKv = savedOneSheet.keyVisual;
    const isLegacyTikTokContent =
      (savedOneSheet.tiktokContentRows || []).length === 10 &&
      savedOneSheet.tiktokContentRows.slice(0, 5).every((r) => r.budgetVnd === 0) &&
      savedOneSheet.tiktokContentRows.slice(5, 10).every((r) => r.qty === 4 && r.budgetVnd === 4000000);
    const isLegacyShopeeContent =
      (savedOneSheet.shopeeContentRows || []).length === 10 &&
      savedOneSheet.shopeeContentRows.every((r) => r.qty === 3 && r.budgetVnd === 2000000);

    return {
      ...savedOneSheet,
      shopeeKpi: s411.has411Plan ? freshData.shopeeKpi : savedOneSheet.shopeeKpi,
      tiktokKpi: s411.has411Plan ? freshData.tiktokKpi : savedOneSheet.tiktokKpi,
      tiktokOverviewExtra: s411.has411Plan ? freshData.tiktokOverviewExtra : savedOneSheet.tiktokOverviewExtra,
      tiktokWeeklyRows: s411.has411Plan ? freshData.tiktokWeeklyRows : savedOneSheet.tiktokWeeklyRows,
      shopeeWeeklyTargets: s411.has411Plan ? freshData.shopeeWeeklyTargets : savedOneSheet.shopeeWeeklyTargets,
      tiktokContentRows:
        isLegacyTikTokContent || !savedOneSheet.tiktokContentRows?.length
          ? freshData.tiktokContentRows
          : savedOneSheet.tiktokContentRows,
      shopeeContentRows:
        isLegacyShopeeContent || !savedOneSheet.shopeeContentRows?.length
          ? freshData.shopeeContentRows
          : savedOneSheet.shopeeContentRows,
      keyVisual: {
        ...existingKv,
        kvImages:
          existingKv?.kvImages ??
          brandPlan?.keyVisualSisPlan?.kvImages ??
          [],
        kvScheduleRows:
          existingKv?.kvScheduleRows && existingKv.kvScheduleRows.length > 0
            ? existingKv.kvScheduleRows
            : buildDefaultKvScheduleRows(month, existingKv?.kvPic || kvPic),
      },
    };
  }

  return freshData;
}
