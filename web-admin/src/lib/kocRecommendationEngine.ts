import {
  BookingDealItem,
  InputPlanBreakdownState,
  KocItem,
  KocListingItem,
  SalaryGrade,
  StorePortfolioItem,
} from './types';
import { formatVndShort } from './format';

export type RecommendationBucket =
  | 'ALL'
  | 'BRAND_REBOOK'
  | 'CROSS_BRAND_WINNER'
  | 'COMPETITOR_ACTIVE'
  | 'FOC_SATELLITE';

export type MatchTier = 'TOP_MATCH' | 'GOOD_MATCH' | 'BACKUP' | 'LOW_MATCH';

export interface KocCooperationHistory {
  // Lịch sử với chính Brand đang chọn
  brandDealsCount: number;
  brandApprovedDealsCount: number;
  brandRejectedDealsCount: number;
  brandLatestRejectReason?: string;
  brandPastGmv: number;
  brandPastCost: number;
  brandAvgRoi: number;
  brandPastDeals: BookingDealItem[];
  minDaysSinceLastBrandAir: number | null;

  // Lịch sử cùng ngành hàng (Cross-Brand cùng Category)
  sameCategoryApprovedCount: number;
  sameCategoryGmv: number;

  // Lịch sử tổng thể tại Upbase B2C
  totalUpbaseDeals: number;
  completedDealsCount: number;
  overdueDealsCount: number;
  totalPastGmv: number;
  totalPastCost: number;
  systemAvgRoi: number;
  onTimeRate: number;
  reliabilityScore: number;
  isWinnerTop20: boolean;
  hasOverdueWarning: boolean;
  allPastDeals: BookingDealItem[];
}

export interface KocScoreBreakdown {
  // Trụ cột 1: Hiệu quả thương mại & Tương tác (35đ)
  roiScore: number; // 0-15
  gmvScore: number; // 0-10
  engagementCvrScore: number; // 0-10
  perfTotal: number; // 0-35

  // Trụ cột 2: Độ khớp Ngành hàng, Brand & Nhân khẩu học (25đ)
  categoryFitScore: number; // 0-12
  demographicsScore: number; // 0-8
  productSampleScore: number; // 0-5
  fitTotal: number; // 0-25

  // Trụ cột 3: Độ khớp Ngân sách & Khung giá (20đ)
  gradeMatchScore: number; // 0-10
  rateBenchmarkScore: number; // 0-6
  cpvScore: number; // 0-4
  costTotal: number; // 0-20

  // Trụ cột 4: Uy tín vận hành, SLA & Pháp lý (20đ)
  onTimeScore: number; // 0-8
  reliabilityHealthScore: number; // 0-6
  legalReadinessScore: number; // 0-6
  opsTotal: number; // 0-20

  // Điểm cộng / trừ đặc biệt (-15 -> +15)
  bonusPenaltyScore: number;
  bonusPenaltyDetails: { code: string; label: string; delta: number }[];

  // Tổng điểm (0-100)
  totalScore: number;
}

export interface RankedKocRecommendation {
  koc: KocItem;
  matchPercent: number;
  matchTier: MatchTier;
  matchTierLabel: string;
  buckets: RecommendationBucket[];
  primaryBucket: RecommendationBucket;
  primaryBucketLabel: string;
  hasLegalDoc: boolean;
  estimatedCpv: number;
  history: KocCooperationHistory;
  scoreBreakdown: KocScoreBreakdown;
  evidenceTags: string[];
  warningTags: string[];
}

export interface KocRecommendationCriteria {
  store: StorePortfolioItem;
  kocs: KocItem[];
  deals: BookingDealItem[];
  activePlan?: InputPlanBreakdownState | null;
  existingListings?: KocListingItem[];
  currentUserName?: string;

  // Bộ lọc điều chỉnh trên giao diện
  bucketFilter?: RecommendationBucket;
  selectedGrades?: string[];
  selectedTepKenh?: string;
  minGmvThreshold?: number;
  preferFormat?: 'ALL' | 'VIDEO' | 'LIVE';
  minFemaleRatio?: number;
  excludeAssignedKoc?: boolean;
  requireLegalDoc?: boolean;
  searchKocText?: string;
  historyFilter?: 'ALL' | 'BRAND_EXPERIENCED' | 'UPBASE_EXPERIENCED' | 'NEW_KOC';
  excludeBrandRejected?: boolean;
  requireTopWinner?: boolean;
  minOnTimeRate?: number;
  enforceCooldownFilter?: boolean;
}

export interface MissingGradeQuota {
  grade: SalaryGrade;
  label: string;
  planQty: number;
  listedQty: number;
  missingQty: number;
  benchmarkUnitCost: number;
}

export const GRADE_GMV_TARGETS: Record<string, number> = {
  'TAP UpAffiliate': 500_000,
  TAP_UP_AFFILIATE: 500_000,
  'TAP đối tác ngoài': 1_500_000,
  KL1: 1_500_000,
  KL2: 3_500_000,
  KL3: 7_500_000,
  KL4: 15_000_000,
  KL5: 30_000_000,
  KL6: 60_000_000,
  KL7: 120_000_000,
};

export const GRADE_STANDARD_COSTS: Record<string, number> = {
  'TAP UpAffiliate': 0,
  TAP_UP_AFFILIATE: 0,
  'TAP đối tác ngoài': 0,
  KL1: 400_000,
  KL2: 1_000_000,
  KL3: 2_200_000,
  KL4: 4_500_000,
  KL5: 8_500_000,
  KL6: 16_000_000,
  KL7: 30_000_000,
};

export const GRADE_MAX_COSTS: Record<string, number> = {
  'TAP UpAffiliate': 100_000,
  TAP_UP_AFFILIATE: 100_000,
  'TAP đối tác ngoài': 500_000,
  KL1: 500_000,
  KL2: 1_500_000,
  KL3: 3_000_000,
  KL4: 6_000_000,
  KL5: 12_000_000,
  KL6: 25_000_000,
  KL7: 80_000_000,
};

const GRADE_ORDER_INDEX: Record<string, number> = {
  'TAP UpAffiliate': 0,
  TAP_UP_AFFILIATE: 0,
  'TAP đối tác ngoài': 0,
  KL1: 1,
  KL2: 2,
  KL3: 3,
  KL4: 4,
  KL5: 5,
  KL6: 6,
  KL7: 7,
};

export function normalizeGradeCode(grade?: string): SalaryGrade {
  if (!grade) return 'KL3';
  if (grade === 'TAP_UP_AFFILIATE' || grade.toUpperCase().includes('TAP')) {
    return 'TAP UpAffiliate';
  }
  return grade as SalaryGrade;
}

function isSameBroadCategory(catA: string, catB: string): boolean {
  const a = (catA || '').toLowerCase();
  const b = (catB || '').toLowerCase();
  if (!a || !b) return false;
  if (a.includes('mẹ') || a.includes('bé') || a.includes('mom')) {
    return b.includes('mẹ') || b.includes('bé') || b.includes('mom') || b.includes('gia đình');
  }
  if (a.includes('mỹ phẩm') || a.includes('dược') || a.includes('skincare') || a.includes('beauty') || a.includes('cá nhân')) {
    return (
      b.includes('mỹ phẩm') ||
      b.includes('dược') ||
      b.includes('skincare') ||
      b.includes('beauty') ||
      b.includes('personal') ||
      b.includes('review nữ') ||
      b.includes('chăm sóc')
    );
  }
  if (a.includes('gia dụng') || a.includes('nhà') || a.includes('elha')) {
    return b.includes('gia dụng') || b.includes('nhà') || b.includes('elha') || b.includes('lifestyle') || b.includes('cooking');
  }
  if (a.includes('sức khỏe') || a.includes('thực phẩm') || a.includes('health')) {
    return b.includes('sức khỏe') || b.includes('health') || b.includes('f&b') || b.includes('eat clean') || b.includes('bác sỹ');
  }
  return a === b;
}

export function calculateKocHistory(
  koc: KocItem,
  brandName: string,
  storeCategory: string,
  deals: BookingDealItem[],
  preFilteredKocDeals?: BookingDealItem[]
): KocCooperationHistory {
  const cleanHandle = (koc.channelId || '').toLowerCase().replace('@', '');
  const kocDeals =
    preFilteredKocDeals ??
    deals.filter(
      (d) =>
        d.kocId === koc.id ||
        (d.kocChannelId && d.kocChannelId.toLowerCase().replace('@', '') === cleanHandle)
    );

  const cleanBrand = (brandName || '').trim().toLowerCase();
  const brandDeals = kocDeals.filter(
    (d) => d.brandName && cleanBrand && d.brandName.toLowerCase().includes(cleanBrand)
  );

  const brandApprovedDeals = brandDeals.filter(
    (d) =>
      d.brandApprovalStatus === 'ĐÃ_DUYỆT' ||
      d.status === 'FINAL_PAID' ||
      d.status === 'VIDEO_VERIFIED' ||
      d.status === 'SCRIPT_APPROVED' ||
      d.status === 'COMPLETED'
  );

  const brandRejectedDeals = brandDeals.filter(
    (d) => d.brandApprovalStatus === 'TỪ_CHỐI' || d.status === 'CANCELLED'
  );

  const brandLatestRejectReason =
    brandRejectedDeals[0]?.brandRejectReason ||
    (brandRejectedDeals.length > 0 ? 'Không khớp tiêu chí nhãn hàng' : undefined);

  const brandPastGmv = brandApprovedDeals.reduce(
    (sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0),
    0
  );
  const brandPastCost = brandApprovedDeals.reduce(
    (sum, d) => sum + (d.totalValue || 0),
    0
  );
  const brandAvgRoi =
    brandPastCost > 0
      ? +(brandPastGmv / brandPastCost).toFixed(2)
      : brandApprovedDeals.length > 0
        ? +(
            brandApprovedDeals.reduce((s, d) => s + (d.roi || 2.2), 0) /
            brandApprovedDeals.length
          ).toFixed(2)
        : 0;

  // Kiểm tra số ngày từ lần lên sóng gần nhất cho Brand này
  let minDaysSinceLastBrandAir: number | null = null;
  for (const d of brandApprovedDeals) {
    if (typeof d.publishedDays === 'number' && d.publishedDays > 0) {
      if (minDaysSinceLastBrandAir === null || d.publishedDays < minDaysSinceLastBrandAir) {
        minDaysSinceLastBrandAir = d.publishedDays;
      }
    }
  }

  // Lịch sử cùng ngành hàng (Cross-Brand)
  const sameCategoryDeals = kocDeals.filter(
    (d) =>
      (!cleanBrand || !d.brandName?.toLowerCase().includes(cleanBrand)) &&
      (d.brandApprovalStatus === 'ĐÃ_DUYỆT' || d.status === 'FINAL_PAID' || d.status === 'VIDEO_VERIFIED') &&
      (isSameBroadCategory(storeCategory, d.kocCategory || '') ||
        isSameBroadCategory(storeCategory, d.tepKenh || ''))
  );
  const sameCategoryGmv = sameCategoryDeals.reduce(
    (sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0),
    0
  );

  // Toàn hệ thống Upbase
  const totalUpbaseDeals = Math.max(koc.totalPastDeals || 0, kocDeals.length);
  const completedDealsCount = kocDeals.filter(
    (d) => d.status === 'FINAL_PAID' || d.status === 'VIDEO_VERIFIED' || d.status === 'COMPLETED'
  ).length;
  const overdueDealsCount = kocDeals.filter((d) => d.slaStatus === 'OVERDUE').length;

  const dealsGmvSum = kocDeals.reduce((sum, d) => sum + (d.affiliateGmv || d.gmv30 || 0), 0);
  const dealsCostSum = kocDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);

  const totalPastGmv = Math.max(koc.totalPastGmv || 0, dealsGmvSum);
  const totalPastCost = Math.max(koc.totalPastCost || 0, dealsCostSum);
  const systemAvgRoi =
    totalPastCost > 0
      ? +(totalPastGmv / totalPastCost).toFixed(2)
      : koc.historicalRoi || 0;

  const onTimeCount = kocDeals.length - overdueDealsCount;
  const onTimeRate =
    kocDeals.length > 0 ? Math.round((onTimeCount / kocDeals.length) * 100) : 100;
  const hasOverdueWarning = overdueDealsCount > 0;

  return {
    brandDealsCount: brandDeals.length,
    brandApprovedDealsCount: brandApprovedDeals.length,
    brandRejectedDealsCount: brandRejectedDeals.length,
    brandLatestRejectReason,
    brandPastGmv,
    brandPastCost,
    brandAvgRoi,
    brandPastDeals: brandDeals,
    minDaysSinceLastBrandAir,
    sameCategoryApprovedCount: sameCategoryDeals.length,
    sameCategoryGmv,
    totalUpbaseDeals,
    completedDealsCount,
    overdueDealsCount,
    totalPastGmv,
    totalPastCost,
    systemAvgRoi,
    onTimeRate,
    reliabilityScore: koc.reliabilityScore || 9.2,
    isWinnerTop20: Boolean(koc.isWinnerTop20),
    hasOverdueWarning,
    allPastDeals: kocDeals,
  };
}

export function computeMissingPlanQuotas(
  activePlan?: InputPlanBreakdownState | null,
  existingListings: KocListingItem[] = [],
  storeName?: string
): MissingGradeQuota[] {
  const gradeDefs: Array<{ grade: SalaryGrade; label: string; defaultCost: number }> = [
    { grade: 'KL1', label: 'KL1 (< 500K)', defaultCost: 400_000 },
    { grade: 'KL2', label: 'KL2 (500K - 1.5M)', defaultCost: 1_000_000 },
    { grade: 'KL3', label: 'KL3 (1.5M - 3M)', defaultCost: 2_200_000 },
    { grade: 'KL4', label: 'KL4 (3M - 6M)', defaultCost: 4_500_000 },
    { grade: 'KL5', label: 'KL5 (6M - 12M)', defaultCost: 8_500_000 },
    { grade: 'KL6', label: 'KL6 (12M - 25M)', defaultCost: 16_000_000 },
    { grade: 'KL7', label: 'KL7 (> 25M)', defaultCost: 30_000_000 },
    { grade: 'TAP UpAffiliate', label: 'FOC / TAP (0đ)', defaultCost: 0 },
  ];

  const storeScopedListings = existingListings.filter((l) => {
    if (l.overallStatus === 'DROPPED') return false;
    if (storeName && l.storeName && l.storeName !== storeName) return false;
    if (activePlan?.month && l.monthKey && l.monthKey !== activePlan.month) return false;
    return true;
  });

  return gradeDefs.map((def) => {
    let planQty = 0;
    let benchmarkUnitCost = def.defaultCost;

    if (activePlan?.items) {
      activePlan.items.forEach((row) => {
        const isPaidOrTapRow =
          row.channel === 'TIKTOK' || row.category === 'KOC_TIER' || row.tierCode.includes('TAP');
        if (!isPaidOrTapRow) return;
        const rowGrade = normalizeGradeCode(
          row.salaryGrade || (row.tierCode.includes('TAP') ? 'TAP UpAffiliate' : row.tierCode)
        );
        if (rowGrade === def.grade) {
          planQty += row.qty || 0;
          if (row.unitCost && row.unitCost > 0) {
            benchmarkUnitCost = row.unitCost;
          }
        }
      });
    }

    const listedQty = storeScopedListings.filter(
      (l) => normalizeGradeCode(l.salaryGrade) === def.grade
    ).length;

    return {
      grade: def.grade,
      label: def.label,
      planQty,
      listedQty,
      missingQty: Math.max(0, planQty - listedQty),
      benchmarkUnitCost,
    };
  });
}

export function evaluateAndRankKocs(
  criteria: KocRecommendationCriteria
): RankedKocRecommendation[] {
  const {
    store,
    kocs,
    deals,
    activePlan,
    existingListings = [],
    currentUserName = '',
    bucketFilter = 'ALL',
    selectedGrades = [],
    selectedTepKenh = 'ALL',
    minGmvThreshold = 0,
    preferFormat = 'ALL',
    minFemaleRatio = 0,
    excludeAssignedKoc = false,
    requireLegalDoc = false,
    searchKocText = '',
    historyFilter = 'ALL',
    excludeBrandRejected = true,
    requireTopWinner = false,
    minOnTimeRate = 0,
    enforceCooldownFilter = true,
  } = criteria;

  if (!store) return [];

  const storeCat = (store.category || '').toLowerCase();
  const brandName = store.brandName || '';
  const normalizedSelectedGrades = selectedGrades.map(normalizeGradeCode);

  const missingQuotas = computeMissingPlanQuotas(activePlan, existingListings, store.storeName);
  const missingGradesSet = new Set<SalaryGrade>(
    missingQuotas.filter((q) => q.missingQty > 0).map((q) => q.grade)
  );

  // Trần đơn giá của các bậc KL đang chọn (HF-04)
  const maxAllowedFee =
    normalizedSelectedGrades.length > 0
      ? Math.max(...normalizedSelectedGrades.map((g) => GRADE_MAX_COSTS[g] ?? 80_000_000)) * 1.25
      : Infinity;

  const results: RankedKocRecommendation[] = [];

  // Chỉ mục hóa danh sách deal theo kocId và handle kênh để tra cứu O(1)
  const dealsByKocId = new Map<string, BookingDealItem[]>();
  const dealsByHandle = new Map<string, BookingDealItem[]>();
  for (const d of deals) {
    if (d.kocId) {
      let arr = dealsByKocId.get(d.kocId);
      if (!arr) {
        arr = [];
        dealsByKocId.set(d.kocId, arr);
      }
      arr.push(d);
    }
    if (d.kocChannelId) {
      const h = d.kocChannelId.toLowerCase().replace('@', '');
      if (h) {
        let arr = dealsByHandle.get(h);
        if (!arr) {
          arr = [];
          dealsByHandle.set(h, arr);
        }
        arr.push(d);
      }
    }
  }

  for (const k of kocs) {
    const kocGrade = normalizeGradeCode(k.salaryGrade);
    const byId = dealsByKocId.get(k.id) || [];
    const cleanHandle = (k.channelId || '').toLowerCase().replace('@', '');
    const byHandle = cleanHandle ? dealsByHandle.get(cleanHandle) || [] : [];
    let matchedDeals: BookingDealItem[];
    if (byId.length === 0) {
      matchedDeals = byHandle;
    } else if (byHandle.length === 0) {
      matchedDeals = byId;
    } else {
      const seen = new Set<string>(byId.map((d) => d.id));
      matchedDeals = [...byId];
      for (const d of byHandle) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          matchedDeals.push(d);
        }
      }
    }
    const history = calculateKocHistory(k, brandName, storeCat, deals, matchedDeals);

    // =========================================================================
    // 1. BỘ LỌC LOẠI TRỪ CỨNG (HARD FILTERS HF-01 .. HF-06)
    // =========================================================================
    // HF-01: Brand từng từ chối
    if (
      excludeBrandRejected &&
      (history.brandRejectedDealsCount > 0 ||
        (k.brandApprovalStatus === 'TỪ_CHỐI' &&
          k.brandName &&
          k.brandName.toLowerCase().includes(brandName.toLowerCase())))
    ) {
      continue;
    }

    // HF-02: Trạng thái KOC từ chối nhận job
    if (k.statusKoc === 'TỪ_CHỐI') {
      continue;
    }

    // HF-03: Tài khoản TikTok Shop vi phạm
    if (k.tiktokAccountHealth === 'VI_PHẠM') {
      continue;
    }

    // HF-04: Lọc theo khung lương KL & trần đơn giá
    if (normalizedSelectedGrades.length > 0) {
      if (!normalizedSelectedGrades.includes(kocGrade)) {
        continue;
      }
      if ((k.rateCardVideo || 0) > maxAllowedFee) {
        continue;
      }
    }

    // HF-05: Cooldown trùng lịch lên sóng quá gần (< 21 ngày trên cùng Brand)
    if (
      enforceCooldownFilter &&
      history.minDaysSinceLastBrandAir !== null &&
      history.minDaysSinceLastBrandAir < 21
    ) {
      continue;
    }

    // HF-06: Đang nợ video quá hạn nặng (>= 2 deal OVERDUE)
    if (history.overdueDealsCount >= 2) {
      continue;
    }

    // =========================================================================
    // CÁC BỘ LỌC TÙY CHỌN TRÊN UI
    // =========================================================================
    if (historyFilter === 'BRAND_EXPERIENCED' && history.brandApprovedDealsCount === 0) {
      continue;
    }
    if (historyFilter === 'UPBASE_EXPERIENCED' && history.totalUpbaseDeals === 0) {
      continue;
    }
    if (historyFilter === 'NEW_KOC' && history.totalUpbaseDeals > 0) {
      continue;
    }

    if (requireTopWinner && !history.isWinnerTop20) {
      continue;
    }

    if (minOnTimeRate > 0 && history.totalUpbaseDeals > 0 && history.onTimeRate < minOnTimeRate) {
      continue;
    }

    const revenue30d = k.tiktokGmv30d || k.recentRevenue || k.gmvBestCase || 0;
    if (minGmvThreshold > 0 && revenue30d < minGmvThreshold) {
      continue;
    }

    if (minFemaleRatio > 0) {
      const female = k.femaleRatio ?? k.audienceGender?.femalePct ?? 0;
      if (female < minFemaleRatio) {
        continue;
      }
    }

    const isConflictPic = Boolean(k.bookingPic && k.bookingPic !== store.b2cOwnerName);
    if (excludeAssignedKoc && isConflictPic) {
      continue;
    }

    const hasLegalDoc = Boolean(
      k.isOcrVerified || (k.cccd && k.cccd.length >= 9) || (k.taxCode && k.taxCode.length >= 10)
    );
    if (requireLegalDoc && !hasLegalDoc) {
      continue;
    }

    if (searchKocText.trim()) {
      const q = searchKocText.trim().toLowerCase();
      const matchName = (k.stageName || '').toLowerCase().includes(q);
      const matchHandle = (k.channelId || '').toLowerCase().includes(q);
      const matchReal = (k.realName || '').toLowerCase().includes(q);
      if (!matchName && !matchHandle && !matchReal) continue;
    }

    // =========================================================================
    // 2. CHẤM ĐIỂM 4 TRỤ CỘT (THANG 100 ĐIỂM)
    // =========================================================================

    // --- TRỤ CỘT 1: HIỆU QUẢ THƯƠNG MẠI & TƯƠNG TÁC (Tối đa 35đ) ---
    const effectiveRoi =
      history.brandApprovedDealsCount > 0 ? history.brandAvgRoi : history.systemAvgRoi;

    let roiScore = 0;
    if (history.totalPastCost > 0 || effectiveRoi > 0) {
      if (effectiveRoi >= 4.0) roiScore = 15;
      else if (effectiveRoi >= 2.5) roiScore = 12;
      else if (effectiveRoi >= 1.5) roiScore = 8;
      else if (effectiveRoi >= 0.8) roiScore = 4;
      else roiScore = 2;
    } else {
      // KOC mới chưa có lịch sử deal Paid: chấm theo GPM & GMV sàn
      const gpm = k.gpm || 0;
      if (gpm >= 8_000_000 || revenue30d >= 50_000_000) roiScore = 8;
      else if (gpm >= 3_000_000 || revenue30d >= 15_000_000) roiScore = 6;
      else roiScore = 4;
    }

    const gmvTarget = GRADE_GMV_TARGETS[kocGrade] || 7_500_000;
    const bestGmvMetric = Math.max(
      revenue30d,
      history.brandApprovedDealsCount > 0
        ? history.brandPastGmv / history.brandApprovedDealsCount
        : 0,
      history.completedDealsCount > 0 ? history.totalPastGmv / history.completedDealsCount : 0
    );
    const gmvRatio = gmvTarget > 0 ? bestGmvMetric / gmvTarget : 1;
    let gmvScore = 1;
    if (gmvRatio >= 1.0) gmvScore = 10;
    else if (gmvRatio >= 0.6) gmvScore = 7;
    else if (gmvRatio >= 0.3) gmvScore = 4;

    const viewFollowerRatio = k.followers > 0 ? (k.avgViews || 0) / k.followers : 0;
    const er = k.engagementRate || 0;
    let erPart = 1;
    if (er >= 5.0 || viewFollowerRatio >= 0.3) erPart = 5;
    else if (er >= 2.0 || viewFollowerRatio >= 0.12) erPart = 3;

    const cvr = k.tiktokAvgCvr ?? k.cvrPct ?? 0;
    const videoShare = k.gmvShareVideo ?? k.revenueShareByFormat?.videoPct ?? 0;
    const liveShare = k.gmvShareLive ?? k.revenueShareByFormat?.livePct ?? 0;
    let cvrPart = 2;
    if (preferFormat === 'LIVE' && liveShare >= 35) {
      cvrPart = 5;
    } else if (cvr >= 3.0 || videoShare >= 65 || (k.gpm || 0) >= 6_000_000) {
      cvrPart = 5;
    } else if (cvr >= 1.5 || videoShare >= 40) {
      cvrPart = 3;
    }

    const engagementCvrScore = erPart + cvrPart; // 0-10
    const perfTotal = roiScore + gmvScore + engagementCvrScore; // 0-35

    // --- TRỤ CỘT 2: ĐỘ KHỚP NGÀNH HÀNG, BRAND & NHÂN KHẨU HỌC (Tối đa 25đ) ---
    let categoryFitScore = 4;
    const exactTepMatch = selectedTepKenh !== 'ALL' && k.tepKenh === selectedTepKenh;
    const broadMatch =
      isSameBroadCategory(storeCat, k.tepKenh || '') ||
      isSameBroadCategory(storeCat, k.kocCategory || '') ||
      (k.tiktokTopCategories || []).some((c) => isSameBroadCategory(storeCat, c));

    if (exactTepMatch && broadMatch) {
      categoryFitScore = 12;
    } else if (exactTepMatch || broadMatch) {
      categoryFitScore = 10;
    } else if (
      selectedTepKenh === 'ALL' &&
      (k.kocCategory === 'Reviewer' || k.tepKenh === 'Review Nữ' || k.tepKenh === 'Lifestyle')
    ) {
      categoryFitScore = 6;
    } else if (selectedTepKenh !== 'ALL' && k.tepKenh !== selectedTepKenh) {
      categoryFitScore = 2;
    }

    const femalePct = k.femaleRatio ?? k.audienceGender?.femalePct ?? 65;
    const age18_24 = k.age18_24 ?? k.audienceTopAge?.age18_24Pct ?? 35;
    const age25_34 = k.age25_34 ?? k.audienceTopAge?.age25_34Pct ?? 45;

    let genderScore = 3;
    if (storeCat.includes('mẹ') || storeCat.includes('mỹ phẩm') || storeCat.includes('dược')) {
      if (femalePct >= 70) genderScore = 5;
      else if (femalePct >= 60) genderScore = 3;
      else genderScore = 1;
    } else {
      genderScore = 4;
    }

    let ageScore = 2;
    if (storeCat.includes('mẹ') && age25_34 >= 42) ageScore = 3;
    else if ((storeCat.includes('mỹ phẩm') || storeCat.includes('dược')) && age18_24 + age25_34 >= 70)
      ageScore = 3;
    else if (age25_34 >= 35) ageScore = 2;

    const demographicsScore = genderScore + ageScore; // 0-8

    let productSampleScore = 2;
    const hasSpecificSamplePref = Boolean(
      k.samplePreferences?.skinType ||
        k.samplePreferences?.babyAgeMonths ||
        k.samplePreferences?.specialNotes
    );
    const hasMultiPlatform = (k.platforms?.length || 0) >= 2 || Boolean(k.shopeeChannel);
    if (hasSpecificSamplePref && hasMultiPlatform) productSampleScore = 5;
    else if (hasSpecificSamplePref || hasMultiPlatform) productSampleScore = 4;

    const fitTotal = categoryFitScore + demographicsScore + productSampleScore; // 0-25

    // --- TRỤ CỘT 3: ĐỘ KHỚP NGÂN SÁCH & KHUNG GIÁ (Tối đa 20đ) ---
    let gradeMatchScore = 6;
    if (missingGradesSet.size > 0) {
      if (missingGradesSet.has(kocGrade)) {
        gradeMatchScore = 10;
      } else {
        // Kiểm tra thấp hơn 1 bậc nhưng view tốt
        const kocIdx = GRADE_ORDER_INDEX[kocGrade] ?? 3;
        const isOneGradeBelowMissing = Array.from(missingGradesSet).some(
          (mg) => (GRADE_ORDER_INDEX[mg] ?? 3) - kocIdx === 1
        );
        gradeMatchScore = isOneGradeBelowMissing ? 8 : 4;
      }
    } else if (normalizedSelectedGrades.includes(kocGrade)) {
      gradeMatchScore = 10;
    }

    const rate = k.rateCardVideo || 0;
    const stdCost = GRADE_STANDARD_COSTS[kocGrade] ?? 2_200_000;
    const histMidRate =
      k.minRate && k.maxRate ? (k.minRate + k.maxRate) / 2 : stdCost;

    let rateBenchmarkScore = 3;
    if (rate <= 0 || (rate <= stdCost && rate <= histMidRate * 1.05)) {
      rateBenchmarkScore = 6;
    } else if (rate <= stdCost * 1.15) {
      rateBenchmarkScore = 4;
    } else if (rate > stdCost * 1.35) {
      rateBenchmarkScore = 1;
    }

    const avgViews = Math.max(1, k.avgViews || Math.round((k.followers || 20_000) * 0.15));
    const estimatedCpv = rate > 0 ? Math.round((rate / avgViews) * 1000) : 0;
    let cpvScore = 0;
    if (rate === 0 || estimatedCpv <= 50_000) cpvScore = 4;
    else if (estimatedCpv <= 120_000) cpvScore = 2;
    else cpvScore = 1;

    const costTotal = gradeMatchScore + rateBenchmarkScore + cpvScore; // 0-20

    // --- TRỤ CỘT 4: UY TÍN VẬN HÀNH, SLA & PHÁP LÝ (Tối đa 20đ) ---
    let onTimeScore = 5;
    if (history.totalUpbaseDeals >= 2 && history.onTimeRate >= 95) onTimeScore = 8;
    else if (history.totalUpbaseDeals >= 1 && history.onTimeRate >= 85) onTimeScore = 6;
    else if (history.totalUpbaseDeals === 0) onTimeScore = 5;
    else onTimeScore = 2;

    const cancelRate = k.tiktokCancellationRate ?? k.cancellationRatePct ?? 1.5;
    let reliabilityHealthScore = 4;
    if (history.reliabilityScore >= 9.0 && cancelRate < 3.0) reliabilityHealthScore = 6;
    else if (history.reliabilityScore >= 8.0) reliabilityHealthScore = 4;
    else reliabilityHealthScore = 2;

    let legalReadinessScore = 0;
    if (k.phone || k.zalo || k.shippingAddress) legalReadinessScore += 2;
    if ((k.cccd || k.taxCode) && k.bankAccount) legalReadinessScore += 2;
    if (k.isOcrVerified || k.contractDriveUrl || hasLegalDoc) legalReadinessScore += 2;

    const opsTotal = onTimeScore + reliabilityHealthScore + legalReadinessScore; // 0-20

    // --- ĐIỂM CỘNG / TRỪ ĐẶC BIỆT (P_bonus/penalty) ---
    const bonusPenaltyDetails: { code: string; label: string; delta: number }[] = [];

    if (history.brandApprovedDealsCount >= 1 && history.brandAvgRoi >= 2.0) {
      bonusPenaltyDetails.push({
        code: 'B-01',
        label: `Winner thực chiến của ${brandName} (ROI ${history.brandAvgRoi}x)`,
        delta: 10,
      });
    }
    if (history.isWinnerTop20) {
      bonusPenaltyDetails.push({
        code: 'B-02',
        label: 'Top 20% KOC doanh số cao UpBase',
        delta: 5,
      });
    }
    if (
      currentUserName &&
      ((k.workedPicsList && k.workedPicsList.toLowerCase().includes(currentUserName.toLowerCase())) ||
        k.bookingPic === currentUserName)
    ) {
      bonusPenaltyDetails.push({
        code: 'B-03',
        label: 'PIC từng làm việc trực tiếp',
        delta: 3,
      });
    }

    if (
      history.minDaysSinceLastBrandAir !== null &&
      history.minDaysSinceLastBrandAir >= 21 &&
      history.minDaysSinceLastBrandAir <= 45
    ) {
      bonusPenaltyDetails.push({
        code: 'P-01',
        label: `Vừa lên bài cho ${brandName} ${history.minDaysSinceLastBrandAir} ngày trước`,
        delta: -8,
      });
    }
    if (history.hasOverdueWarning) {
      bonusPenaltyDetails.push({
        code: 'P-02',
        label: 'Có lịch sử trễ hạn SLA',
        delta: -10,
      });
    }
    if (k.tiktokAccountHealth === 'CẢNH_BÁO') {
      bonusPenaltyDetails.push({
        code: 'P-03',
        label: 'Kênh có cảnh báo trên TikTok Shop',
        delta: -7,
      });
    }

    const rawBonusPenalty = bonusPenaltyDetails.reduce((s, item) => s + item.delta, 0);
    const bonusPenaltyScore = Math.max(-15, Math.min(15, rawBonusPenalty));

    const totalScore = Math.max(
      15,
      Math.min(100, Math.round(perfTotal + fitTotal + costTotal + opsTotal + bonusPenaltyScore))
    );

    // =========================================================================
    // 3. PHÂN NHÓM CHIẾN THUẬT (4 RỔ MỤC TIÊU)
    // =========================================================================
    const buckets: RecommendationBucket[] = ['ALL'];

    if (history.brandApprovedDealsCount > 0 && history.brandRejectedDealsCount === 0) {
      buckets.push('BRAND_REBOOK');
    }

    if (
      history.brandApprovedDealsCount === 0 &&
      (history.sameCategoryApprovedCount > 0 ||
        (history.totalUpbaseDeals > 0 && history.systemAvgRoi >= 2.0) ||
        history.isWinnerTop20)
    ) {
      buckets.push('CROSS_BRAND_WINNER');
    }

    if (
      kocGrade === 'TAP UpAffiliate' ||
      kocGrade === 'KL1' ||
      (k.rateCardVideo || 0) <= 500_000
    ) {
      if (history.onTimeRate >= 85) {
        buckets.push('FOC_SATELLITE');
      }
    }

    if (
      history.brandApprovedDealsCount === 0 &&
      (revenue30d >= 20_000_000 || (k.gpm || 0) >= 5_000_000 || (k.recentVideos?.length || 0) > 0)
    ) {
      buckets.push('COMPETITOR_ACTIVE');
    }

    if (bucketFilter !== 'ALL' && !buckets.includes(bucketFilter)) {
      continue;
    }

    let primaryBucket: RecommendationBucket = 'ALL';
    let primaryBucketLabel = 'Khớp tiêu chí';
    if (buckets.includes('BRAND_REBOOK')) {
      primaryBucket = 'BRAND_REBOOK';
      primaryBucketLabel = 'Tái book của Brand';
    } else if (buckets.includes('CROSS_BRAND_WINNER')) {
      primaryBucket = 'CROSS_BRAND_WINNER';
      primaryBucketLabel = 'Winner cùng ngành';
    } else if (buckets.includes('FOC_SATELLITE')) {
      primaryBucket = 'FOC_SATELLITE';
      primaryBucketLabel = 'Gửi mẫu FOC / Nano';
    } else if (buckets.includes('COMPETITOR_ACTIVE')) {
      primaryBucket = 'COMPETITOR_ACTIVE';
      primaryBucketLabel = 'Tệp mở rộng / Đối thủ';
    }

    // Phân hạng điểm
    let matchTier: MatchTier = 'LOW_MATCH';
    let matchTierLabel = 'Cân nhắc';
    if (totalScore >= 85) {
      matchTier = 'TOP_MATCH';
      matchTierLabel = 'Ưu tiên số 1';
    } else if (totalScore >= 70) {
      matchTier = 'GOOD_MATCH';
      matchTierLabel = 'Phù hợp cao';
    } else if (totalScore >= 55) {
      matchTier = 'BACKUP';
      matchTierLabel = 'Dự phòng';
    }

    // Dẫn chứng lý do đề xuất bằng số liệu thực
    const evidenceTags: string[] = [];
    if (history.brandApprovedDealsCount > 0) {
      evidenceTags.push(
        `Đã làm ${history.brandApprovedDealsCount} deal ${brandName} · ROI ${history.brandAvgRoi || 2.4}x`
      );
    } else if (history.sameCategoryApprovedCount > 0) {
      evidenceTags.push(
        `Thắng ${history.sameCategoryApprovedCount} deal cùng ngành (${formatVndShort(history.sameCategoryGmv)})`
      );
    } else if (history.totalUpbaseDeals > 0) {
      evidenceTags.push(`Đã hợp tác ${history.totalUpbaseDeals} deal UpBase · ROI ${history.systemAvgRoi || 2.2}x`);
    }

    if (missingGradesSet.has(kocGrade)) {
      evidenceTags.push(`Bù đúng định mức thiếu ${kocGrade}`);
    } else {
      evidenceTags.push(`Khung ${kocGrade} (${rate > 0 ? formatVndShort(rate) : '0đ FOC'})`);
    }

    if (estimatedCpv > 0) {
      evidenceTags.push(`CPV ~${formatVndShort(estimatedCpv)}/1K view`);
    }
    if (history.onTimeRate >= 90 && history.totalUpbaseDeals > 0) {
      evidenceTags.push(`Đúng hạn ${history.onTimeRate}%`);
    }

    const warningTags: string[] = [];
    if (history.hasOverdueWarning) {
      warningTags.push('Từng trễ hạn SLA');
    }
    if (!hasLegalDoc) {
      warningTags.push('Chưa đủ CCCD/MST');
    }
    if (
      history.minDaysSinceLastBrandAir !== null &&
      history.minDaysSinceLastBrandAir <= 45
    ) {
      warningTags.push(`Vừa air ${history.minDaysSinceLastBrandAir} ngày trước`);
    }

    results.push({
      koc: k,
      matchPercent: totalScore,
      matchTier,
      matchTierLabel,
      buckets,
      primaryBucket,
      primaryBucketLabel,
      hasLegalDoc,
      estimatedCpv,
      history,
      scoreBreakdown: {
        roiScore,
        gmvScore,
        engagementCvrScore,
        perfTotal,
        categoryFitScore,
        demographicsScore,
        productSampleScore,
        fitTotal,
        gradeMatchScore,
        rateBenchmarkScore,
        cpvScore,
        costTotal,
        onTimeScore,
        reliabilityHealthScore,
        legalReadinessScore,
        opsTotal,
        bonusPenaltyScore,
        bonusPenaltyDetails,
        totalScore,
      },
      evidenceTags,
      warningTags,
    });
  }

  return results.sort((a, b) => {
    if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent;
    return (b.history.brandPastGmv || b.history.totalPastGmv) - (a.history.brandPastGmv || a.history.totalPastGmv);
  });
}

/**
 * Tự động nhặt danh sách KOC điểm cao nhất để lấp đầy số lượng còn thiếu theo từng bậc KL của Plan tháng
 */
export function autoPickKocsForMissingQuotas(
  rankedKocs: RankedKocRecommendation[],
  missingQuotas: MissingGradeQuota[],
  existingListings: KocListingItem[] = [],
  storeName?: string
): { pickedIds: string[]; pickedByGrade: Record<string, number> } {
  const alreadyListedHandles = new Set(
    existingListings
      .filter((l) => l.overallStatus !== 'DROPPED' && (!storeName || l.storeName === storeName))
      .map((l) => (l.kocHandle || '').toLowerCase().replace('@', ''))
  );
  const alreadyListedKocIds = new Set(
    existingListings
      .filter((l) => l.overallStatus !== 'DROPPED' && (!storeName || l.storeName === storeName))
      .map((l) => l.kocId)
  );

  const pickedIds: string[] = [];
  const pickedByGrade: Record<string, number> = {};

  for (const quota of missingQuotas) {
    if (quota.missingQty <= 0) continue;

    const candidates = rankedKocs.filter((r) => {
      const g = normalizeGradeCode(r.koc.salaryGrade);
      if (g !== quota.grade) return false;
      const handle = (r.koc.channelId || '').toLowerCase().replace('@', '');
      if (alreadyListedKocIds.has(r.koc.id) || alreadyListedHandles.has(handle)) return false;
      if (pickedIds.includes(r.koc.id)) return false;
      return true;
    });

    const chosen = candidates.slice(0, quota.missingQty);
    chosen.forEach((c) => {
      pickedIds.push(c.koc.id);
    });
    if (chosen.length > 0) {
      pickedByGrade[quota.grade] = chosen.length;
    }
  }

  // Nếu Plan tháng chưa cấu hình chi tiết hoặc đã đủ nhưng người dùng bấm chọn nhanh, lấy Top 5 KOC điểm cao nhất
  if (pickedIds.length === 0 && rankedKocs.length > 0) {
    const topCandidates = rankedKocs
      .filter((r) => {
        const handle = (r.koc.channelId || '').toLowerCase().replace('@', '');
        return !alreadyListedKocIds.has(r.koc.id) && !alreadyListedHandles.has(handle);
      })
      .slice(0, 5);

    topCandidates.forEach((c) => {
      pickedIds.push(c.koc.id);
      const g = normalizeGradeCode(c.koc.salaryGrade);
      pickedByGrade[g] = (pickedByGrade[g] || 0) + 1;
    });
  }

  return { pickedIds, pickedByGrade };
}
