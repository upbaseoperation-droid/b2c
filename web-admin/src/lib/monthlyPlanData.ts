import { resolveStoreBookingLeader } from './larkPaymentRequestEngine';
﻿import { InputPlanBreakdownState, InputPlanRowItem, SalaryGrade, PlanVersionSnapshot, MultiPartySignOff, BrandDetail, BrandMonthlyPlanItem, CampaignItem, isCampaignActiveInMonth, getCampaignPhaseForMonth } from './types';
import { 
  INITIAL_INPUT_PLAN_ITEMS, 
  autoBalancePlanItems, 
  MOCK_PLAN_SCENARIOS 
} from './inputPlanDefaults';
import { DEFAULT_CONTENT_PILLARS } from './selfChannelData';
import { REAL_MONTHLY_PLANS_OCT_2026 } from './realB2cPlanData';
import { REAL_MONTHLY_PLANS_NOV_2026 } from './realLarkPlans202611';
import { REAL_B2C_42_BRANDS } from './realB2cBrandsData';

/** Tìm chiến dịch (Campaign) đang chạy của một Thương hiệu trong chu kỳ tháng ('YYYY/MM') */
export function findActiveCampaignForBrandInMonth(
  brandName: string,
  month: string,
  campaigns: CampaignItem[] = []
): CampaignItem | undefined {
  if (!brandName) return undefined;
  const normBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return campaigns.find(c => {
    const normCampBrand = c.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
    const brandMatches =
      normBrand === normCampBrand ||
      normBrand.includes(normCampBrand) ||
      normCampBrand.includes(normBrand);
    return brandMatches && isCampaignActiveInMonth(c, month);
  });
}


// HÀM TẠO ITEMS TỰ ĐỘNG THEO CHIẾN LƯỢC CHO KẾ HOẠCH THÁNG
export function createPlanItemsForScenario(
  budget: number, 
  qty: number, 
  preset: 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE' = 'BALANCED',
  picName: string = 'Đặng Mai Hà Linh'
): InputPlanRowItem[] {
  const balanced = autoBalancePlanItems(INITIAL_INPUT_PLAN_ITEMS, budget, qty, preset);
  
  // Gán phân bổ mẫu cho nhân sự trong team Booking
  const teamMembers = ['Khánh Vy', 'Nguyễn Thu Trang', 'Trần Minh Đức', 'Phạm Thị Thu Hằng'];
  return balanced.map((item, idx) => ({
    ...item,
    assignedStaff: item.assignedStaff || teamMembers[idx % teamMembers.length],
    staffNotes: item.staffNotes || `Chỉ đạo từ PIC ${picName}: Ưu tiên chốt creator uy tín, đảm bảo tỷ lệ hoàn 8%`
  }));
}

/** Gợi ý mã phiên bản tiếp theo trong cùng 1 tháng (v1.0 -> v1.1 -> v1.2...) */
export function suggestNextVersionCode(currentCode?: string, snapshotsCount: number = 1): string {
  const base = currentCode || `v1.${Math.max(0, snapshotsCount - 1)}`;
  const match = base.match(/v?(\d+)\.(\d+)/i);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]) + 1;
    return `v${major}.${minor}`;
  }
  return `v1.${snapshotsCount}`;
}

/** Lấy danh sách toàn bộ các phiên bản của kế hoạch trong tháng (đảm bảo luôn có ít nhất v1.0 gốc và phiên bản hiện hành) */
export function getPlanVersionSnapshots(plan: InputPlanBreakdownState): PlanVersionSnapshot[] {
  const defaultSignOff: MultiPartySignOff = plan.multiPartySignOff || {
    growth: {
      confirmed: true,
      confirmedBy: 'Trần Thị Ánh',
      note: 'Giao hạn mức ngân sách & chỉ tiêu tháng'
    },
    booking: {
      confirmed: plan.status !== 'DRAFT',
      confirmedBy: plan.pic || 'Chuyên viên B2C',
      note: 'Phân rã 4 đầu việc B2C (KOC trả phí, FOC, Kênh tự xây, Đa sàn)'
    },
    media: {
      confirmed: ['PRE_APPROVED', 'PENDING_APPROVAL', 'LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      confirmedBy: 'Phan Thành Đạt',
      targetRoas: 4.8,
      acceptedAdsBudget: plan.budgetAdsTotal || 0,
      note: 'Nhận gói tổng ngân sách Ads'
    },
    leadB2c: {
      confirmed: ['LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      confirmedBy: plan.approvedBy || 'Đặng Thị Yến Nhi (Trưởng Phòng)',
      note: 'Phê duyệt phiên bản kế hoạch tháng'
    }
  };

  if (plan.versionSnapshots && plan.versionSnapshots.length > 0) {
    const curCode = plan.currentVersionCode || plan.versionSnapshots[plan.versionSnapshots.length - 1].versionCode;
    const hasCurrentInSnapshots = plan.versionSnapshots.some(s => s.versionCode === curCode);
    if (hasCurrentInSnapshots) {
      return plan.versionSnapshots;
    }
    // Nếu đang ở bản nháp mới (chưa khóa vào danh sách chốt), nối thêm bản hiện hành vào cuối để dễ chuyển đổi
    return [
      ...plan.versionSnapshots,
      {
        id: `SNAP-${plan.id}-${curCode}`,
        versionCode: curCode,
        versionName: plan.isVersionLocked ? `${curCode} - Bản chốt hiện hành` : `${curCode} - Bản đang điều chỉnh (Nháp)`,
        status: plan.isVersionLocked ? 'LOCKED' : 'SUPERSEDED',
        createdAt: plan.updatedAt || plan.createdAt || new Date().toISOString(),
        createdBy: plan.pic || 'Growth / B2C',
        creatorRole: 'GROWTH',
        changeReason: plan.notes || 'Phiên bản đang làm việc trong tháng',
        totalTargetBudget: plan.totalTargetBudget,
        totalTargetContents: plan.totalTargetContents,
        targetGmv: plan.targetGmv,
        budgetAdsTotal: plan.budgetAdsTotal || 0,
        budgetAffiliate: plan.budgetAffiliate || 0,
        budgetSelfChannel: plan.budgetSelfChannel || 0,
        items: plan.items || [],
        signOffRecord: defaultSignOff
      }
    ];
  }

  return [
    {
      id: `SNAP-${plan.id}-V1`,
      versionCode: plan.currentVersionCode || 'v1.0',
      versionName: 'v1.0 - Bản chốt đầu tháng (Gốc)',
      status: 'LOCKED',
      createdAt: plan.createdAt || '2026-10-01T09:00:00Z',
      createdBy: 'Growth PIC',
      creatorRole: 'GROWTH',
      changeReason: 'Phiên bản kế hoạch gốc chốt đầu kỳ tháng',
      totalTargetBudget: plan.totalTargetBudget,
      totalTargetContents: plan.totalTargetContents,
      targetGmv: plan.targetGmv,
      budgetAdsTotal: plan.budgetAdsTotal || 0,
      budgetAffiliate: plan.budgetAffiliate || 0,
      budgetSelfChannel: plan.budgetSelfChannel || 0,
      items: plan.items || [],
      signOffRecord: defaultSignOff
    }
  ];
}

// DANH MỤC MASTER KẾ HOẠCH THEO THÁNG (MONTHLY PLAN REPOSITORY)
const RAW_MONTHLY_PLANS: InputPlanBreakdownState[] = [
  // =========================================================================
  // DỮ LIỆU THẬT 69 GIAN HÀNG THÁNG 10/2026 (TỪ FILE 4.1 VÀ 4.1.1)
  // =========================================================================
  ...REAL_MONTHLY_PLANS_OCT_2026,

  // =========================================================================
  // DỮ LIỆU THẬT 66 GIAN HÀNG THÁNG 11/2026 (TỪ LARK BASE 4.1 VÀ 4.1.1)
  // =========================================================================
  ...REAL_MONTHLY_PLANS_NOV_2026,

  // =========================================================================
  // THÁNG 09/2026 (THÁNG TRƯỚC - ĐÃ HOÀN THÀNH NGHIỆM THU)
  // =========================================================================
  {
    id: 'PLAN-2026-09-CLIO',
    title: 'Chiến Dịch Tháng 9 - Clio Cosmetics Make-up Chuẩn Hàn',
    brandName: 'Clio_TikTok_E2E-C',
    month: '2026/09',
    week: 'W38 [15.09 - 21.09]',
    pic: 'Nguyễn Thu Trang',
    totalTargetBudget: 190000000,
    totalTargetContents: 85,
    targetGmv: 1150000000,
    cancellationRate: 0.08,
    strategyPreset: 'BRAND_PUSH',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 188000000,
    deliveredContents: 85,
    actualGmv: 1220000000,
    preApprovedBy: 'Vũ Thùy Linh',
    preApprovedAt: '2026-08-30T10:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-09-01T09:00:00Z',
    notes: 'Ra mắt Cushion thế hệ mới và Son kem lì. Đạt 106% KPI GMV đề ra.',
    createdAt: '2026-08-25T08:00:00Z',
    updatedAt: '2026-10-02T17:00:00Z',
    items: createPlanItemsForScenario(190000000, 85, 'BRAND_PUSH', 'Nguyễn Thu Trang'),
    discussions: [
      {
        id: 'DISC-CLIO-1',
        authorName: 'Vũ Thùy Linh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Lead',
        content: 'Clio đã nghiệm thu tháng 9 đạt 106% GMV kế hoạch. Khen ngợi team Booking đã kiểm soát tỷ lệ hoàn hủy dưới 6.5%.',
        type: 'COMMENT',
        timestamp: '2026-10-02T17:00:00Z',
        tags: ['Chỉ Số KPI', 'Nghiệm Thu']
      }
    ]
  },
  {
    id: 'PLAN-2026-09-LEMONADE',
    title: 'Chiến Dịch Tháng 9 - Lemonade Siêu Tiệc Son Tint & Má Kem',
    brandName: 'Lemonade',
    month: '2026/09',
    week: 'W37 [08.09 - 14.09]',
    pic: 'Khánh Vy',
    totalTargetBudget: 130000000,
    totalTargetContents: 60,
    targetGmv: 780000000,
    cancellationRate: 0.08,
    strategyPreset: 'GMV_MAX',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 129000000,
    deliveredContents: 60,
    actualGmv: 815000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-08-29T11:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-08-31T15:00:00Z',
    notes: 'Chiến dịch Son Tint nước và Má hồng kem. Tệp Gen Z tương tác cực mạnh.',
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-09-30T16:30:00Z',
    items: createPlanItemsForScenario(130000000, 60, 'GMV_MAX', 'Khánh Vy')
  },
  {
    id: 'PLAN-2026-09-SENKA',
    title: 'Chiến Dịch Tháng 9 - Senka Bọt Rửa Mặt & Sạch Sâu',
    brandName: 'Senka_TikTok_E2E-C',
    month: '2026/09',
    week: 'W39 [22.09 - 28.09]',
    pic: 'Phạm Thị Thu Hằng',
    totalTargetBudget: 210000000,
    totalTargetContents: 95,
    targetGmv: 1300000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 208000000,
    deliveredContents: 95,
    actualGmv: 1340000000,
    preApprovedBy: 'Hoàng Quốc Bảo',
    preApprovedAt: '2026-08-31T09:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-09-01T14:00:00Z',
    notes: 'Chiến dịch bứt phá doanh số cuối quý 3. Đạt 103% chỉ tiêu.',
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z',
    items: createPlanItemsForScenario(210000000, 95, 'BALANCED', 'Phạm Thị Thu Hằng')
  },

  // =========================================================================
  // THÁNG 08/2026 (LỊCH SỬ THÁNG 8)
  // =========================================================================
  {
    id: 'PLAN-2026-08-TMCLEAN',
    title: 'Kế Hoạch Tẩy Rửa Đa Năng - TM Clean Mùa Mưa Tháng 8',
    brandName: 'TM Clean_TikTok_E2E-C',
    month: '2026/08',
    week: 'W32 [04.08 - 10.08]',
    pic: 'Trần Minh Đức',
    totalTargetBudget: 50000000,
    totalTargetContents: 48,
    targetGmv: 350000000,
    cancellationRate: 0.08,
    strategyPreset: 'COST_SAVER',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 49500000,
    deliveredContents: 48,
    actualGmv: 362000000,
    notes: 'Ngành hàng gia dụng, tận dụng video chuyển đổi trước/sau (Before-After).',
    createdAt: '2026-07-28T09:00:00Z',
    updatedAt: '2026-08-31T17:00:00Z',
    items: MOCK_PLAN_SCENARIOS[3]?.state?.items || createPlanItemsForScenario(50000000, 48, 'COST_SAVER', 'Trần Minh Đức')
  },
  {
    id: 'PLAN-2026-08-FRESH',
    title: 'Chiến Dịch Tháng 8 - Fresh Back To School Sinh Viên',
    brandName: 'Fresh_TikTok_E2E-C',
    month: '2026/08',
    week: 'W34 [18.08 - 24.08]',
    pic: 'Đặng Mai Hà Linh',
    totalTargetBudget: 120000000,
    totalTargetContents: 65,
    targetGmv: 720000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 119000000,
    deliveredContents: 65,
    actualGmv: 755000000,
    notes: 'Tập trung bộ dưỡng da sinh viên tựu trường. Đạt 105% GMV.',
    createdAt: '2026-07-30T10:00:00Z',
    updatedAt: '2026-08-31T18:00:00Z',
    items: createPlanItemsForScenario(120000000, 65, 'BALANCED', 'Đặng Mai Hà Linh')
  }
];

function buildScaledItems(items: InputPlanRowItem[], ratio: number): InputPlanRowItem[] {
  return (items || []).map(it => {
    const scaledQty = Math.max(0, Math.round((it.qty || 0) * ratio));
    const newTotal = scaledQty * (it.unitCost || 0);
    return {
      ...it,
      qty: scaledQty,
      totalBudget: newTotal,
      targetGmv: Math.round(newTotal * (it.expectedRoiMultiplier || 5))
    };
  });
}

export type B2cWorkstreamType =
  | 'AFFILIATE_PAID'
  | 'FOC_SAMPLE'
  | 'SELF_CHANNEL'
  | 'MULTI_PLATFORM'
  | 'CONTENT_BRAND_MAIN'
  | 'PLAN_STRATEGY'
  | 'KEY_VISUAL_SIS';

export interface WorkstreamStaffSlice {
  staffName: string;
  roleGroup:
    | 'BOOKING'
    | 'CONTENT_SELF_CHANNEL'
    | 'FOC'
    | 'MULTI_PLATFORM'
    | 'CONTENT_BRAND_MAIN'
    | 'PLAN_STRATEGY'
    | 'KEY_VISUAL_SIS';
  leaderName?: string;
  qty: number;
  videos: number;
  budget: number;
  tierOrFormatLabels: string[];
  rowIds: string[];
}

export interface StorePlanWorkstreamSummary {
  affiliatePaid: { totalQty: number; totalBudget: number; leaderName?: string; assignees: WorkstreamStaffSlice[] };
  focSample: { totalQty: number; totalBudget: number; leaderName?: string; assignees: WorkstreamStaffSlice[] };
  selfChannel: { totalQty: number; totalBudget: number; leaderName: string; assignees: WorkstreamStaffSlice[] };
  multiPlatform: { totalQty: number; totalBudget: number; leaderName?: string; assignees: WorkstreamStaffSlice[] };
  allStaffNames: string[];
  allAssignedStaff: string[];
  affiliateSlices: WorkstreamStaffSlice[];
  focSlices: WorkstreamStaffSlice[];
  selfChannelSlices: WorkstreamStaffSlice[];
  multiPlatformSlices: WorkstreamStaffSlice[];
  selfChannelVideos: number;
  selfChannelBudget: number;
}

export interface PersonalWorkPackageItem {
  id: string;
  staffName: string;
  roleGroup:
    | 'BOOKING'
    | 'CONTENT_SELF_CHANNEL'
    | 'FOC'
    | 'MULTI_PLATFORM'
    | 'CONTENT_BRAND_MAIN'
    | 'PLAN_STRATEGY'
    | 'KEY_VISUAL_SIS';
  leaderName?: string;
  planId: string;
  planTitle: string;
  month: string;
  storeId?: string;
  storeName: string;
  brandName: string;
  platform: string;
  planStatus: InputPlanBreakdownState['status'];
  versionCode: string;
  workstream: B2cWorkstreamType;
  workstreamLabel: string;
  myQty: number;
  myBudget: number;
  assignedVideos: number;
  assignedBudget: number;
  storeTotalQty: number;
  storeTotalBudget: number;
  tierOrFormatLabels: string[];
  tiersSummary: string;
  coWorkersInSameWorkstream: string[];
  allStoreContributors: string[];
  coWorkersOnSameStore: string[];
  rowIds: string[];
  isBrandPosition?: boolean;
  brandId?: string;
}

const BOOKING_CO_PIC_POOL = [
  'Phạm Thị Thu Hằng',
  'Lương Thị Như Quỳnh',
  'Lê Phương Thảo',
  'Lê Thanh Hải',
  'Hoàng Hải Long',
  'Trần Hải Phượng',
  'Khánh Vy',
  'Nguyễn Thu Trang',
];

const CONTENT_SELF_CHANNEL_POOL = [
  'Quỳnh Như',
  'Nguyễn Thị Mai Anh',
  'Vũ Hoài Lâm',
  'Phan Diệu Ánh',
];

function pickContentPrimaryForBrand(brandOrStore: string, idx: number): { primary: string; secondary: string } {
  const lower = (brandOrStore || '').toLowerCase();
  if (lower.includes('kutie') || lower.includes('cỏ mềm') || lower.includes('comem') || lower.includes('dr.papa') || lower.includes('papa')) {
    return { primary: 'Quỳnh Như', secondary: 'Nguyễn Thị Mai Anh' };
  }
  if (lower.includes('senka') || lower.includes('anessa') || lower.includes('tsubaki') || lower.includes('dprogram') || lower.includes('elixir') || lower.includes('clubclio') || lower.includes('clio')) {
    return { primary: 'Nguyễn Thị Mai Anh', secondary: 'Quỳnh Như' };
  }
  if (lower.includes('cocoon') || lower.includes('la roche') || lower.includes('bioderma') || lower.includes('cerave') || lower.includes('fresh') || lower.includes('rejuran')) {
    return { primary: 'Vũ Hoài Lâm', secondary: 'Phan Diệu Ánh' };
  }
  if (lower.includes('sunplay') || lower.includes('selsun') || lower.includes('rohto') || lower.includes('blossomy') || lower.includes('loccitane') || lower.includes('eupc')) {
    return { primary: 'Phan Diệu Ánh', secondary: 'Vũ Hoài Lâm' };
  }
  const p = CONTENT_SELF_CHANNEL_POOL[idx % CONTENT_SELF_CHANNEL_POOL.length];
  const s = CONTENT_SELF_CHANNEL_POOL[(idx + 1) % CONTENT_SELF_CHANNEL_POOL.length];
  return { primary: p, secondary: s };
}

/**
 * Chuẩn hóa phân bổ nhân sự theo đúng 4 mảng độc lập trên từng gian hàng:
 * - Video Affiliate trả phí: 1 đến 3 chuyên viên Booking cùng chạy (tách theo bậc KL cao vs KL1-KL3)
 * - Gửi mẫu FOC (0đ): Chuyên viên FOC (Trần Thị Hảo / Phạm Thị Thu Hằng)
 * - Video Self-Channel (Kênh Brand): Đội Content dưới quyền Leader Partnership Việt Hoàng (1-2 bạn Content cùng làm)
 * - Đa sàn khác: Chuyên viên Đa sàn (Lê Hoàng Yến / Phan Diệu Ánh)
 */
export function enrichPlanWithMultiStaffWorkstreams(plan: InputPlanBreakdownState, idx: number = 0): InputPlanBreakdownState {
  const primaryBooking = (plan.primaryPic || plan.pic || 'Lê Phương Thảo').trim();
  const coCandidates = BOOKING_CO_PIC_POOL.filter(n => n !== primaryBooking);
  const coBooking1 = coCandidates[idx % coCandidates.length] || 'Phạm Thị Thu Hằng';
  const coBooking2 = coCandidates[(idx + 2) % coCandidates.length] || 'Nguyễn Thu Trang';
  const contentTeam = pickContentPrimaryForBrand(`${plan.brandName} ${plan.storeName || ''}`, idx);

  const rawItems = plan.items || [];
  let selfIdx = 0;
  let affIdx = 0;

  const totalAffQty = rawItems
    .filter(it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP') && it.id !== 'row-tt-tap' && it.totalBudget > 0)
    .reduce((s, i) => s + (i.qty || 0), 0);

  const enrichedItems: InputPlanRowItem[] = rawItems.map(it => {
    // 1. Mảng Gửi mẫu FOC (0đ / TAP)
    if (it.tierCode.includes('TAP') || it.id === 'row-tt-tap' || (it.channel === 'TIKTOK' && it.unitCost === 0)) {
      const focPic = idx % 2 === 0 ? 'Trần Thị Hảo' : 'Phạm Thị Thu Hằng';
      return {
        ...it,
        assignedStaff: focPic,
        staffNotes: `Gói FOC gửi mẫu 0đ (${focPic} phụ trách rải đơn & thu hồi clip)`
      };
    }

    // 2. Mảng Video Self-Channel (Kênh Brand — dưới quyền Leader Partnership Việt Hoàng)
    if (it.channel === 'SELF_CHANNEL') {
      const assignedContent = selfIdx === 0 ? contentTeam.primary : contentTeam.secondary;
      selfIdx += 1;
      return {
        ...it,
        assignedStaff: assignedContent,
        staffNotes: `Kênh Brand Self-Channel • Content PIC: ${assignedContent} (Leader Partnership: Việt Hoàng liên hệ CTV)`
      };
    }

    // 3. Mảng Đa sàn khác (Shopee, FB, IG, Threads)
    if (['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel)) {
      const isShopeeMain = (plan.storeName || '').toLowerCase().includes('shopee');
      const multiPic = isShopeeMain ? primaryBooking : (idx % 2 === 0 ? 'Lê Hoàng Yến' : 'Phan Diệu Ánh');
      return {
        ...it,
        assignedStaff: multiPic,
        staffNotes: `Gói Đa sàn (${it.platform}) do ${multiPic} phụ trách`
      };
    }

    // 4. Mảng Video Affiliate trả phí (KL1 -> KL7): Chia 2-3 người nếu gian hàng có nhiều video
    if (it.channel === 'TIKTOK') {
      const tier = (it.tierCode || '').toUpperCase();
      let assigned = primaryBooking;
      if (totalAffQty >= 20) {
        if (['KL1', 'KL2'].includes(tier)) {
          assigned = coBooking1;
        } else if (tier === 'KL3' && totalAffQty >= 50) {
          assigned = coBooking2;
        } else {
          assigned = primaryBooking;
        }
      } else if (affIdx > 0 && (plan.totalTargetBudget || 0) >= 40000000) {
        assigned = coBooking1;
      }
      affIdx += 1;
      return {
        ...it,
        assignedStaff: assigned,
        staffNotes: assigned === primaryBooking
          ? `PIC chính (${primaryBooking}) phụ trách nhóm ${it.tierCode}`
          : `Phối hợp cùng ${primaryBooking}: ${assigned} chạy gói ${it.tierCode}`
      };
    }

    return it;
  });

  // Nếu gian có chỉ tiêu Self-Channel ở cấp Plan nhưng chưa có dòng SELF_CHANNEL trong items, tự bổ sung 2 dòng cho 2 bạn Content
  const hasSelfItems = enrichedItems.some(it => it.channel === 'SELF_CHANNEL' && it.qty > 0);
  const targetSelfQty = plan.targetSelfChannelContents || 0;
  const targetSelfBudget = plan.budgetSelfChannel || 0;
  if (!hasSelfItems && (targetSelfQty > 0 || targetSelfBudget > 0)) {
    const qtyTotal = targetSelfQty > 0 ? targetSelfQty : Math.max(4, Math.round(targetSelfBudget / 500000));
    const unitCost = qtyTotal > 0 && targetSelfBudget > 0 ? Math.round(targetSelfBudget / qtyTotal) : 450000;
    if (qtyTotal >= 10) {
      const q1 = Math.ceil(qtyTotal * 0.6);
      const q2 = qtyTotal - q1;
      enrichedItems.push(
        {
          id: `${plan.id}-self-voice`,
          channel: 'SELF_CHANNEL',
          platform: 'TikTok Shop',
          category: 'SELF_CHANNEL',
          tierCode: 'Review voice',
          tierLabel: 'Kênh Brand - Review Voice',
          contentFormat: 'Kênh Brand - Review Voice',
          qty: q1,
          unitCost,
          benchmarkCost: 450000,
          totalBudget: q1 * unitCost,
          expectedRoiMultiplier: 2.8,
          targetGmv: Math.round(q1 * unitCost * 2.8),
          assignedStaff: contentTeam.primary,
          staffNotes: `Kênh Brand Self-Channel • Content PIC: ${contentTeam.primary} (Leader Partnership: Việt Hoàng)`
        },
        {
          id: `${plan.id}-self-pov`,
          channel: 'SELF_CHANNEL',
          platform: 'TikTok Shop',
          category: 'SELF_CHANNEL',
          tierCode: 'POV',
          tierLabel: 'Kênh Brand - POV & Tình Huống',
          contentFormat: 'Kênh Brand - POV & Tình Huống',
          qty: q2,
          unitCost,
          benchmarkCost: 450000,
          totalBudget: q2 * unitCost,
          expectedRoiMultiplier: 2.8,
          targetGmv: Math.round(q2 * unitCost * 2.8),
          assignedStaff: contentTeam.secondary,
          staffNotes: `Kênh Brand Self-Channel • Content PIC: ${contentTeam.secondary} (Leader Partnership: Việt Hoàng)`
        }
      );
    } else {
      enrichedItems.push({
        id: `${plan.id}-self-main`,
        channel: 'SELF_CHANNEL',
        platform: 'TikTok Shop',
        category: 'SELF_CHANNEL',
        tierCode: 'Review voice',
        tierLabel: 'Kênh Brand - Review Voice',
        contentFormat: 'Kênh Brand - Review Voice',
        qty: qtyTotal,
        unitCost,
        benchmarkCost: 450000,
        totalBudget: targetSelfBudget || qtyTotal * unitCost,
        expectedRoiMultiplier: 2.8,
        targetGmv: Math.round((targetSelfBudget || qtyTotal * unitCost) * 2.8),
        assignedStaff: contentTeam.primary,
        staffNotes: `Kênh Brand Self-Channel • Content PIC: ${contentTeam.primary} (Leader Partnership: Việt Hoàng)`
      });
    }
  }

  const allContributors = Array.from(
    new Set(
      [
        primaryBooking,
        ...enrichedItems.filter(i => i.qty > 0).map(i => i.assignedStaff || primaryBooking)
      ].filter(Boolean)
    )
  );

  return {
    ...plan,
    assignedMembers: allContributors,
    items: enrichedItems
  };
}

interface CachedWorkstreamSummary {
  items: unknown;
  reference41: unknown;
  pic: string | undefined;
  primaryPic: string | undefined;
  bookingLeader: string | undefined;
  hasBookingLeader: boolean | undefined;
  value: StorePlanWorkstreamSummary;
}

const workstreamSummaryCache = new WeakMap<InputPlanBreakdownState, CachedWorkstreamSummary>();

export function getStorePlanWorkstreamSummary(plan: InputPlanBreakdownState | null): StorePlanWorkstreamSummary {
  const empty: StorePlanWorkstreamSummary = {
    affiliatePaid: { totalQty: 0, totalBudget: 0, leaderName: plan?.bookingLeader, assignees: [] },
    focSample: { totalQty: 0, totalBudget: 0, leaderName: plan?.bookingLeader, assignees: [] },
    selfChannel: { totalQty: 0, totalBudget: 0, leaderName: 'Việt Hoàng', assignees: [] },
    multiPlatform: { totalQty: 0, totalBudget: 0, leaderName: plan?.bookingLeader, assignees: [] },
    allStaffNames: [],
    allAssignedStaff: [],
    affiliateSlices: [],
    focSlices: [],
    selfChannelSlices: [],
    multiPlatformSlices: [],
    selfChannelVideos: 0,
    selfChannelBudget: 0,
  };
  if (!plan) return empty;

  const cached = workstreamSummaryCache.get(plan);
  if (
    cached &&
    cached.items === plan.items &&
    cached.reference41 === plan.reference41 &&
    cached.pic === plan.pic &&
    cached.primaryPic === plan.primaryPic &&
    cached.bookingLeader === plan.bookingLeader &&
    cached.hasBookingLeader === plan.hasBookingLeader
  ) {
    return cached.value;
  }

  const primaryPic = plan.primaryPic || plan.pic || 'Lê Phương Thảo';
  const bookingLeader = plan.hasBookingLeader ? (plan.bookingLeader || 'Nguyễn Thị Ngọc Tâm') : undefined;

  const groupRows = (
    rows: InputPlanRowItem[],
    roleGroup: WorkstreamStaffSlice['roleGroup'],
    defaultStaff: string,
    leaderName?: string
  ): WorkstreamStaffSlice[] => {
    const map = new Map<string, WorkstreamStaffSlice>();
    for (const r of rows) {
      if ((r.qty || 0) <= 0 && (r.totalBudget || 0) <= 0) continue;
      const staff = (r.assignedStaff || defaultStaff).trim();
      const cur = map.get(staff) || {
        staffName: staff,
        roleGroup,
        leaderName,
        qty: 0,
        videos: 0,
        budget: 0,
        tierOrFormatLabels: [],
        rowIds: []
      };
      cur.qty += r.qty || 0;
      cur.videos = cur.qty;
      cur.budget += r.totalBudget || 0;
      const tag = r.tierCode || r.contentFormat;
      if (tag && !cur.tierOrFormatLabels.includes(tag)) cur.tierOrFormatLabels.push(tag);
      cur.rowIds.push(r.id);
      map.set(staff, cur);
    }
    return Array.from(map.values());
  };

  const items = plan.items || [];
  const affRows = items.filter(
    it => it.channel === 'TIKTOK' && !it.tierCode.includes('TAP') && it.id !== 'row-tt-tap' && (it.totalBudget > 0 || it.unitCost > 0)
  );
  const focRows = items.filter(
    it => it.tierCode.includes('TAP') || it.id === 'row-tt-tap' || (it.channel === 'TIKTOK' && it.totalBudget === 0 && it.unitCost === 0)
  );
  const selfRows = items.filter(it => it.channel === 'SELF_CHANNEL');
  const multiRows = items.filter(it => ['SHOPEE', 'SHOPEE_LAZADA', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

  const affSlices = groupRows(affRows, 'BOOKING', primaryPic, bookingLeader);
  const focSlices = groupRows(focRows, 'FOC', 'Trần Thị Hảo', bookingLeader);
  const selfSlices = groupRows(selfRows, 'CONTENT_SELF_CHANNEL', 'Quỳnh Như', 'Việt Hoàng');
  const multiSlices = groupRows(multiRows, 'MULTI_PLATFORM', primaryPic, bookingLeader);

  // Nếu kế hoạch có reference41 từ bảng 4.1 Larkbase, bổ sung phần còn thiếu theo reference41
  if (plan.reference41) {
    if (affSlices.length === 0 && (plan.reference41.cast > 0 || plan.reference41.affCostNet > 0)) {
      affSlices.push({
        staffName: primaryPic,
        roleGroup: 'BOOKING',
        leaderName: bookingLeader,
        qty: plan.reference41.cast,
        videos: plan.reference41.cast,
        budget: plan.reference41.affCostNet,
        tierOrFormatLabels: ['Chỉ tiêu 4.1'],
        rowIds: []
      });
    }
    if (focSlices.length === 0 && plan.reference41.foc > 0) {
      focSlices.push({
        staffName: 'Trần Thị Hảo',
        roleGroup: 'FOC',
        leaderName: bookingLeader,
        qty: plan.reference41.foc,
        videos: plan.reference41.foc,
        budget: 0,
        tierOrFormatLabels: ['FOC 4.1'],
        rowIds: []
      });
    }
    if (selfSlices.length === 0 && (plan.reference41.selfVideos > 0 || plan.reference41.selfCostNet > 0)) {
      selfSlices.push({
        staffName: primaryPic,
        roleGroup: 'CONTENT_SELF_CHANNEL',
        leaderName: 'Việt Hoàng',
        qty: plan.reference41.selfVideos,
        videos: plan.reference41.selfVideos,
        budget: plan.reference41.selfCostNet,
        tierOrFormatLabels: ['Self-channel 4.1'],
        rowIds: []
      });
    }
  }

  // Fallback nếu plan chưa có items chi tiết nhưng có chỉ tiêu tổng
  if (items.length === 0 && affSlices.length === 0 && ((plan.budgetAffiliate || 0) > 0 || (plan.targetAffiliateContents || 0) > 0)) {
    const isShopee = (plan.storeName || '').toLowerCase().includes('shopee');
    if (isShopee) {
      const q = plan.targetAffiliateContents || plan.totalTargetContents || 0;
      multiSlices.push({
        staffName: primaryPic,
        roleGroup: 'MULTI_PLATFORM',
        leaderName: bookingLeader,
        qty: q,
        videos: q,
        budget: plan.budgetAffiliate || plan.totalTargetBudget || 0,
        tierOrFormatLabels: ['Shopee Video & Affiliate'],
        rowIds: []
      });
    } else if ((plan.budgetAffiliate || 0) > 0) {
      const q = plan.targetAffiliateContents || 0;
      affSlices.push({
        staffName: primaryPic,
        roleGroup: 'BOOKING',
        leaderName: bookingLeader,
        qty: q,
        videos: q,
        budget: plan.budgetAffiliate || 0,
        tierOrFormatLabels: ['KL1-KL5'],
        rowIds: []
      });
    } else if (focSlices.length === 0 && (plan.targetAffiliateContents || 0) > 0) {
      const q = plan.targetAffiliateContents || 0;
      focSlices.push({
        staffName: 'Trần Thị Hảo',
        roleGroup: 'FOC',
        leaderName: bookingLeader,
        qty: q,
        videos: q,
        budget: 0,
        tierOrFormatLabels: ['FOC 0đ'],
        rowIds: []
      });
    }
  }

  if (selfSlices.length === 0 && ((plan.budgetSelfChannel || 0) > 0 || (plan.targetSelfChannelContents || 0) > 0)) {
    const defContent = pickContentPrimaryForBrand(`${plan.brandName} ${plan.storeName || ''}`, 0).primary;
    const q = plan.targetSelfChannelContents || 0;
    selfSlices.push({
      staffName: defContent,
      roleGroup: 'CONTENT_SELF_CHANNEL',
      leaderName: 'Việt Hoàng',
      qty: q,
      videos: q,
      budget: plan.budgetSelfChannel || 0,
      tierOrFormatLabels: ['Review voice'],
      rowIds: []
    });
  }

  const sumQ = (arr: WorkstreamStaffSlice[]) => arr.reduce((s, x) => s + x.qty, 0);
  const sumB = (arr: WorkstreamStaffSlice[]) => arr.reduce((s, x) => s + x.budget, 0);

  const allStaff = Array.from(
    new Set([
      ...affSlices.map(s => s.staffName),
      ...focSlices.map(s => s.staffName),
      ...selfSlices.map(s => s.staffName),
      ...multiSlices.map(s => s.staffName),
    ])
  );

  const selfChannelTotalQty = sumQ(selfSlices);
  const selfChannelTotalBudget = sumB(selfSlices);

  const summary: StorePlanWorkstreamSummary = {
    affiliatePaid: { totalQty: sumQ(affSlices), totalBudget: sumB(affSlices), leaderName: bookingLeader, assignees: affSlices },
    focSample: { totalQty: sumQ(focSlices), totalBudget: sumB(focSlices), leaderName: bookingLeader, assignees: focSlices },
    selfChannel: { totalQty: selfChannelTotalQty, totalBudget: selfChannelTotalBudget, leaderName: 'Việt Hoàng', assignees: selfSlices },
    multiPlatform: { totalQty: sumQ(multiSlices), totalBudget: sumB(multiSlices), leaderName: bookingLeader, assignees: multiSlices },
    allStaffNames: allStaff,
    allAssignedStaff: allStaff,
    affiliateSlices: affSlices,
    focSlices: focSlices,
    selfChannelSlices: selfSlices,
    multiPlatformSlices: multiSlices,
    selfChannelVideos: selfChannelTotalQty,
    selfChannelBudget: selfChannelTotalBudget,
  };
  workstreamSummaryCache.set(plan, {
    items: plan.items,
    reference41: plan.reference41,
    pic: plan.pic,
    primaryPic: plan.primaryPic,
    bookingLeader: plan.bookingLeader,
    hasBookingLeader: plan.hasBookingLeader,
    value: summary,
  });
  return summary;
}

export function buildInitialBrandMonthlyPlans(
  brands: BrandDetail[] = REAL_B2C_42_BRANDS,
  month: string = '2026/10'
): BrandMonthlyPlanItem[] {
  return brands.map((b, idx) => {
    const contentPic = b.contentBrandMainPic || b.contentPic || 'Quỳnh Như';
    const planPic = b.planStrategyPic || b.brandPicName || 'Nguyễn Thị Ngọc Tâm';
    const kvPic = b.keyVisualSisPic || 'Vũ Hoài Lâm';
    const budget = b.planBudget || b.monthlyBudget || 0;
    const isApproved = budget > 0 || idx % 3 !== 2;
    const activeCamp = findActiveCampaignForBrandInMonth(b.name, month);

    return {
      id: `BRAND-PLAN-${month.replace('/', '-')}-${b.code}`,
      brandId: b.id,
      brandCode: b.code,
      brandName: b.name,
      category: b.category || 'Mỹ phẩm & Chăm sóc da',
      month,
      status: isApproved ? 'IN_EXECUTION' : 'PENDING_APPROVAL',
      hasCampaign: !!activeCamp,
      campaignId: activeCamp?.id,
      campaignCode: activeCamp?.code,
      campaignTitle: activeCamp?.title,
      linkedCampaignIds: activeCamp ? [activeCamp.id] : [],
      contentBrandMainPic: contentPic,
      planStrategyPic: planPic,
      keyVisualSisPic: kvPic,
      accountPic: b.accountPic || 'Phạm Thị Nhài',
      bookingPicLead: b.bookingPicLead || 'Đặng Thị Yến Nhi',
      contentBrandMainPlan: {
        masterContentPlanCount: 1,
        contentPillarsCount: 4,
        heroScriptsTarget: Math.max(6, Math.min(24, Math.round((b.targetVideos || 20) * 0.25))),
        deliveredCount: isApproved ? Math.max(2, Math.round((b.targetVideos || 20) * 0.12)) : 0,
        focusPillars: `USP sản phẩm chủ lực ${b.name} • Review thực tế • So sánh giải pháp • Ưu đãi Mega Sale`,
        notes: `Content / Brand main (${contentPic}) duyệt khung kịch bản & định hướng tuyến nội dung xuyên suốt cho ${b.name}.`,
      },
      planStrategyPlan: {
        campaignStrategyCount: activeCamp ? ((b.storeCount || 1) >= 2 ? 2 : 1) : 0,
        bigIdeaAndKeyMessage: activeCamp
          ? `${activeCamp.bigIdea} — ${activeCamp.keyMessage || ''}`
          : `Duy trì nhận diện & chuyển đổi thường nhật (Always-on) cho Hero SKU ${b.name}`,
        brandAuditCount: 1,
        deliveredCount: isApproved ? 1 : 0,
        targetBrandBudget: budget,
        targetBrandGmv: b.targetGmv || Math.round(budget * 4.5),
        notes: `Plan / Strategy (${planPic}) lập kế hoạch tổng thể cấp Brand, phân bổ hạn mức xuống ${b.storeCount || b.stores?.length || 1} gian hàng.`,
      },
      keyVisualSisPlan: {
        kvDirectionCount: activeCamp ? 2 : 1,
        sisBannerPackageCount: Math.max(2, (b.storeCount || 1) * 2),
        pdpSeoProductCount: Math.max(4, (b.heroProducts?.length || 1) * 4),
        deliveredCount: isApproved ? 2 : 1,
        designTheme: activeCamp?.keyVisualSpec?.theme
          ? `${activeCamp.keyVisualSpec.theme} (${activeCamp.code})`
          : `Key Visual duy trì tháng ${month} & chuẩn hóa SIS/PDP gian hàng chính hãng ${b.name}`,
        notes: `Key Visual / SIS (${kvPic}) định hướng bộ KV chiến dịch, trang trí SIS & khung ảnh PDP chuẩn SEO cho ${b.name}.`,
      },
      updatedAt: '2026-10-05T10:00:00Z',
      updatedBy: planPic,
      approvedBy: isApproved ? 'Đặng Thị Yến Nhi' : undefined,
      approvedAt: isApproved ? '2026-10-02T09:30:00Z' : undefined,
    };
  });
}

export const INITIAL_BRAND_MONTHLY_PLANS: BrandMonthlyPlanItem[] = buildInitialBrandMonthlyPlans(REAL_B2C_42_BRANDS, '2026/10');

export function buildPersonalWorkPackages(
  plans: InputPlanBreakdownState[],
  month: string = '2026/10',
  brandMonthlyPlans: BrandMonthlyPlanItem[] = INITIAL_BRAND_MONTHLY_PLANS
): PersonalWorkPackageItem[] {
  const packages: PersonalWorkPackageItem[] = [];
  const filteredPlans = plans.filter(p => month === 'ALL' || p.month === month);

  for (const plan of filteredPlans) {
    const ws = getStorePlanWorkstreamSummary(plan);
    const storeName = plan.storeName || plan.brandName;
    const platform = storeName.toLowerCase().includes('shopee') ? 'Shopee Mall' : 'TikTok Shop';
    const versionCode = plan.currentVersionCode || 'v1.0';
    const storeTotalQty =
      ws.affiliatePaid.totalQty + ws.focSample.totalQty + ws.selfChannel.totalQty + ws.multiPlatform.totalQty || plan.totalTargetContents || 0;
    const storeTotalBudget = plan.totalTargetBudget || (ws.affiliatePaid.totalBudget + ws.selfChannel.totalBudget + ws.multiPlatform.totalBudget);

    const pushSlices = (
      workstream: B2cWorkstreamType,
      workstreamLabel: string,
      slices: WorkstreamStaffSlice[]
    ) => {
      const namesInWs = slices.map(s => s.staffName);
      for (const sl of slices) {
        if (sl.qty <= 0 && sl.budget <= 0) continue;
        const coWorkersSameStore = ws.allStaffNames.filter(n => n !== sl.staffName);
        packages.push({
          id: `${plan.id}-${workstream}-${sl.staffName}`,
          staffName: sl.staffName,
          roleGroup: sl.roleGroup,
          leaderName: sl.leaderName,
          planId: plan.id,
          planTitle: plan.title,
          month: plan.month,
          storeId: plan.storeId,
          storeName,
          brandName: plan.brandName,
          platform,
          planStatus: plan.status || 'DRAFT',
          versionCode,
          workstream,
          workstreamLabel,
          myQty: sl.qty,
          myBudget: sl.budget,
          assignedVideos: sl.qty,
          assignedBudget: sl.budget,
          storeTotalQty,
          storeTotalBudget,
          tierOrFormatLabels: sl.tierOrFormatLabels,
          tiersSummary: sl.tierOrFormatLabels.join(', '),
          coWorkersInSameWorkstream: namesInWs.filter(n => n !== sl.staffName),
          allStoreContributors: coWorkersSameStore,
          coWorkersOnSameStore: coWorkersSameStore,
          rowIds: sl.rowIds
        });
      }
    };

    pushSlices('AFFILIATE_PAID', '1. Video Affiliate (KOC trả phí)', ws.affiliatePaid.assignees);
    pushSlices('FOC_SAMPLE', '2. Gửi mẫu FOC (0đ)', ws.focSample.assignees);
    pushSlices('SELF_CHANNEL', '3. Video Self-Channel (Kênh Brand)', ws.selfChannel.assignees);
    pushSlices('MULTI_PLATFORM', '4. Đa sàn (Shopee / FB / IG)', ws.multiPlatform.assignees);
  }

  // Bổ sung 3 vị trí gắn theo Brand [theo brand]: Content / Brand main, Plan / Strategy, Key Visual / SIS
  const filteredBrandPlans = brandMonthlyPlans.filter(bp => month === 'ALL' || bp.month === month);
  for (const bp of filteredBrandPlans) {
    const brandCoWorkers = Array.from(
      new Set([bp.contentBrandMainPic, bp.planStrategyPic, bp.keyVisualSisPic].filter(Boolean))
    );
    const matchingStorePlan = filteredPlans.find(
      p => p.brandName.toLowerCase().includes(bp.brandName.toLowerCase()) || bp.brandName.toLowerCase().includes(p.brandName.toLowerCase())
    );
    const linkedPlanId = matchingStorePlan?.id || bp.id;

    // 5. Content / Brand main [theo brand]
    if (bp.contentBrandMainPic) {
      const qty =
        bp.contentBrandMainPlan.masterContentPlanCount +
        bp.contentBrandMainPlan.contentPillarsCount +
        bp.contentBrandMainPlan.heroScriptsTarget;
      packages.push({
        id: `${bp.id}-CONTENT_BRAND_MAIN-${bp.contentBrandMainPic}`,
        staffName: bp.contentBrandMainPic,
        roleGroup: 'CONTENT_BRAND_MAIN',
        leaderName: 'Đặng Thị Yến Nhi',
        planId: linkedPlanId,
        planTitle: `Kế hoạch Brand ${bp.brandName} (${bp.month})`,
        month: bp.month,
        storeName: `[Theo Brand] ${bp.brandName}`,
        brandName: bp.brandName,
        platform: 'Theo Brand',
        planStatus: bp.status,
        versionCode: 'v1.0',
        workstream: 'CONTENT_BRAND_MAIN',
        workstreamLabel: '5. Content / Brand main [theo brand]',
        myQty: qty,
        myBudget: 0,
        assignedVideos: qty,
        assignedBudget: 0,
        storeTotalQty: qty,
        storeTotalBudget: bp.planStrategyPlan.targetBrandBudget || 0,
        tierOrFormatLabels: [
          `${bp.contentBrandMainPlan.masterContentPlanCount} Master Plan`,
          `${bp.contentBrandMainPlan.contentPillarsCount} Pillars`,
          `${bp.contentBrandMainPlan.heroScriptsTarget} Kịch bản Hero`
        ],
        tiersSummary: `${bp.contentBrandMainPlan.masterContentPlanCount} Master Plan • ${bp.contentBrandMainPlan.contentPillarsCount} Pillars • ${bp.contentBrandMainPlan.heroScriptsTarget} Kịch bản Hero`,
        coWorkersInSameWorkstream: [],
        allStoreContributors: brandCoWorkers.filter(n => n !== bp.contentBrandMainPic),
        coWorkersOnSameStore: brandCoWorkers.filter(n => n !== bp.contentBrandMainPic),
        rowIds: [],
        isBrandPosition: true,
        brandId: bp.brandId,
      });
    }

    // 6. Plan / Strategy [theo brand]
    if (bp.planStrategyPic) {
      const qty = bp.planStrategyPlan.campaignStrategyCount + bp.planStrategyPlan.brandAuditCount;
      packages.push({
        id: `${bp.id}-PLAN_STRATEGY-${bp.planStrategyPic}`,
        staffName: bp.planStrategyPic,
        roleGroup: 'PLAN_STRATEGY',
        leaderName: 'Đặng Thị Yến Nhi',
        planId: linkedPlanId,
        planTitle: `Kế hoạch Brand ${bp.brandName} (${bp.month})`,
        month: bp.month,
        storeName: `[Theo Brand] ${bp.brandName}`,
        brandName: bp.brandName,
        platform: 'Theo Brand',
        planStatus: bp.status,
        versionCode: 'v1.0',
        workstream: 'PLAN_STRATEGY',
        workstreamLabel: '6. Plan / Strategy [theo brand]',
        myQty: qty,
        myBudget: bp.planStrategyPlan.targetBrandBudget || 0,
        assignedVideos: qty,
        assignedBudget: bp.planStrategyPlan.targetBrandBudget || 0,
        storeTotalQty: qty,
        storeTotalBudget: bp.planStrategyPlan.targetBrandBudget || 0,
        tierOrFormatLabels: [
          `${bp.planStrategyPlan.campaignStrategyCount} Brand/Campaign Strategy`,
          `${bp.planStrategyPlan.brandAuditCount} Brand Audit`,
          `Big Idea & Key Message`
        ],
        tiersSummary: `${bp.planStrategyPlan.campaignStrategyCount} Strategy • ${bp.planStrategyPlan.brandAuditCount} Audit • Big Idea`,
        coWorkersInSameWorkstream: [],
        allStoreContributors: brandCoWorkers.filter(n => n !== bp.planStrategyPic),
        coWorkersOnSameStore: brandCoWorkers.filter(n => n !== bp.planStrategyPic),
        rowIds: [],
        isBrandPosition: true,
        brandId: bp.brandId,
      });
    }

    // 7. Key Visual / SIS [theo brand]
    if (bp.keyVisualSisPic) {
      const qty =
        bp.keyVisualSisPlan.kvDirectionCount +
        bp.keyVisualSisPlan.sisBannerPackageCount +
        bp.keyVisualSisPlan.pdpSeoProductCount;
      packages.push({
        id: `${bp.id}-KEY_VISUAL_SIS-${bp.keyVisualSisPic}`,
        staffName: bp.keyVisualSisPic,
        roleGroup: 'KEY_VISUAL_SIS',
        leaderName: 'Đặng Thị Yến Nhi',
        planId: linkedPlanId,
        planTitle: `Kế hoạch Brand ${bp.brandName} (${bp.month})`,
        month: bp.month,
        storeName: `[Theo Brand] ${bp.brandName}`,
        brandName: bp.brandName,
        platform: 'Theo Brand',
        planStatus: bp.status,
        versionCode: 'v1.0',
        workstream: 'KEY_VISUAL_SIS',
        workstreamLabel: '7. Key Visual / SIS [theo brand]',
        myQty: qty,
        myBudget: 0,
        assignedVideos: qty,
        assignedBudget: 0,
        storeTotalQty: qty,
        storeTotalBudget: bp.planStrategyPlan.targetBrandBudget || 0,
        tierOrFormatLabels: [
          `${bp.keyVisualSisPlan.kvDirectionCount} KV Direction`,
          `${bp.keyVisualSisPlan.sisBannerPackageCount} Bộ SIS/Banner`,
          `${bp.keyVisualSisPlan.pdpSeoProductCount} PDP/SEO Product`
        ],
        tiersSummary: `${bp.keyVisualSisPlan.kvDirectionCount} KV • ${bp.keyVisualSisPlan.sisBannerPackageCount} SIS/Banner • ${bp.keyVisualSisPlan.pdpSeoProductCount} PDP`,
        coWorkersInSameWorkstream: [],
        allStoreContributors: brandCoWorkers.filter(n => n !== bp.keyVisualSisPic),
        coWorkersOnSameStore: brandCoWorkers.filter(n => n !== bp.keyVisualSisPic),
        rowIds: [],
        isBrandPosition: true,
        brandId: bp.brandId,
      });
    }
  }

  return packages;
}

const enrichedPlanCache = new WeakMap<InputPlanBreakdownState, InputPlanBreakdownState>();

export function enrichPlanWithVersions(rawPlan: InputPlanBreakdownState, idx: number = 0): InputPlanBreakdownState {
  const cached = enrichedPlanCache.get(rawPlan);
  if (cached) return cached;
  const resolvedLeader = resolveStoreBookingLeader(rawPlan.storeName || rawPlan.brandName, rawPlan.bookingLeader);
  if (rawPlan.reference41) {
    const matchedCamp41 = rawPlan.campaignId ? undefined : findActiveCampaignForBrandInMonth(rawPlan.brandName, rawPlan.month);
    const matchedPhase41 = matchedCamp41 ? getCampaignPhaseForMonth(matchedCamp41, rawPlan.month) : undefined;
    const out41: InputPlanBreakdownState = {
      ...rawPlan,
      hasBookingLeader: Boolean(resolvedLeader),
      bookingLeader: resolvedLeader,
      hasCampaign: rawPlan.hasCampaign !== undefined ? rawPlan.hasCampaign : !!matchedCamp41,
      campaignId: rawPlan.campaignId ?? matchedCamp41?.id,
      campaignCode: rawPlan.campaignCode ?? matchedCamp41?.code,
      campaignTitle: rawPlan.campaignTitle ?? matchedCamp41?.title,
      campaignPhaseName: rawPlan.campaignPhaseName ?? matchedPhase41?.phaseName,
    };
    enrichedPlanCache.set(rawPlan, out41);
    enrichedPlanCache.set(out41, out41);
    return out41;
  }
  const basePlan = enrichPlanWithMultiStaffWorkstreams({ ...rawPlan, hasBookingLeader: Boolean(resolvedLeader), bookingLeader: resolvedLeader }, idx);
  const matchedCamp = basePlan.campaignId ? undefined : findActiveCampaignForBrandInMonth(basePlan.brandName, basePlan.month);
  const matchedPhase = matchedCamp ? getCampaignPhaseForMonth(matchedCamp, basePlan.month) : undefined;
  const plan: InputPlanBreakdownState = {
    ...basePlan,
    hasCampaign: basePlan.hasCampaign !== undefined ? basePlan.hasCampaign : !!matchedCamp,
    campaignId: basePlan.campaignId ?? matchedCamp?.id,
    campaignCode: basePlan.campaignCode ?? matchedCamp?.code,
    campaignTitle: basePlan.campaignTitle ?? matchedCamp?.title,
    campaignPhaseName: basePlan.campaignPhaseName ?? matchedPhase?.phaseName,
  };
  if (plan.versionSnapshots && plan.versionSnapshots.length > 0) {
    enrichedPlanCache.set(rawPlan, plan);
    enrichedPlanCache.set(plan, plan);
    return plan;
  }

  const baseSignOff: MultiPartySignOff = plan.multiPartySignOff || {
    growth: {
      confirmed: true,
      confirmedBy: 'Trần Thị Ánh',
      confirmedAt: '2026-10-01T09:00:00Z',
      note: 'Giao hạn mức ngân sách & chỉ tiêu đầu tháng'
    },
    booking: {
      confirmed: true,
      confirmedBy: plan.pic || 'Chuyên viên B2C',
      confirmedAt: '2026-10-01T14:00:00Z',
      note: 'Hoàn tất phân rã 4 đầu việc B2C'
    },
    media: {
      confirmed: true,
      confirmedBy: 'Phan Thành Đạt',
      confirmedAt: '2026-10-01T16:00:00Z',
      targetRoas: 4.8,
      acceptedAdsBudget: plan.budgetAdsTotal || 0,
      note: 'Nhận gói tổng ngân sách Ads'
    },
    leadB2c: {
      confirmed: true,
      confirmedBy: plan.approvedBy || 'Đặng Thị Yến Nhi (Trưởng Phòng)',
      confirmedAt: '2026-10-02T09:00:00Z',
      note: 'Phê duyệt & đóng băng phiên bản'
    }
  };

  const budget = plan.totalTargetBudget || 0;
  const contents = plan.totalTargetContents || 0;
  const gmv = plan.targetGmv || 0;
  const ads = plan.budgetAdsTotal || 0;

  // Các gian hàng trọng điểm có ngân sách >= 60M hoặc các gian hàng tiêu biểu có từ 2 - 3 phiên bản trong tháng
  const hasThreeVersions =
    budget >= 150000000 ||
    ['KUTIESKIN', 'CLUBCLIO', 'LOCCITANE', 'SENKA', 'COMEM'].some(k => plan.id.toUpperCase().includes(k));
  const hasTwoVersions =
    !hasThreeVersions &&
    (budget >= 40000000 || idx % 3 === 0 || ['FRESH', 'COCOON', 'REJURAN', 'FACEREPUBLIC', 'SUNPLAY'].some(k => plan.id.toUpperCase().includes(k)));

  if (hasThreeVersions && budget > 0) {
    const v1Budget = Math.round((budget * 0.78) / 1000000) * 1000000;
    const v1Contents = Math.max(10, Math.round(contents * 0.8));
    const v1Gmv = Math.round((gmv * 0.78) / 1000000) * 1000000;
    const v1Ads = Math.round((ads * 0.75) / 1000000) * 1000000;

    const v2Budget = Math.round((budget * 0.9) / 1000000) * 1000000;
    const v2Contents = Math.max(12, Math.round(contents * 0.9));
    const v2Gmv = Math.round((gmv * 0.9) / 1000000) * 1000000;
    const v2Ads = Math.round((ads * 0.88) / 1000000) * 1000000;

    const snapshots: PlanVersionSnapshot[] = [
      {
        id: `SNAP-${plan.id}-V10`,
        versionCode: 'v1.0',
        versionName: 'Bản chốt đầu tháng (Baseline)',
        status: 'SUPERSEDED',
        createdAt: '2026-10-01T09:00:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Chốt hạn mức ngân sách và chỉ tiêu gốc đầu kỳ tháng',
        totalTargetBudget: v1Budget,
        totalTargetContents: v1Contents,
        targetGmv: v1Gmv,
        budgetAdsTotal: v1Ads,
        budgetAffiliate: Math.round((plan.budgetAffiliate || v1Budget * 0.75) * 0.78),
        budgetSelfChannel: Math.round((plan.budgetSelfChannel || v1Budget * 0.25) * 0.78),
        items: buildScaledItems(plan.items, 0.8),
        signOffRecord: baseSignOff
      },
      {
        id: `SNAP-${plan.id}-V11`,
        versionCode: 'v1.1',
        versionName: 'Điều chỉnh Đợt 2 (Mega Sale 10.10)',
        status: 'SUPERSEDED',
        createdAt: '2026-10-06T14:30:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Bổ sung ngân sách KOC trả phí & tăng suất gửi mẫu FOC đón nhịp Mega Sale 10.10',
        totalTargetBudget: v2Budget,
        totalTargetContents: v2Contents,
        targetGmv: v2Gmv,
        budgetAdsTotal: v2Ads,
        budgetAffiliate: Math.round((plan.budgetAffiliate || v2Budget * 0.75) * 0.9),
        budgetSelfChannel: Math.round((plan.budgetSelfChannel || v2Budget * 0.25) * 0.9),
        items: buildScaledItems(plan.items, 0.9),
        signOffRecord: baseSignOff
      },
      {
        id: `SNAP-${plan.id}-V12`,
        versionCode: 'v1.2',
        versionName: 'Điều chỉnh Đợt 3 (Top-up Payday)',
        status: 'LOCKED',
        createdAt: '2026-10-12T10:15:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Growth cấp thêm ngân sách Top-up giữa tháng đẩy Hero SKU dịp Payday 15.10 & 25.10',
        totalTargetBudget: budget,
        totalTargetContents: contents,
        targetGmv: gmv,
        budgetAdsTotal: ads,
        budgetAffiliate: plan.budgetAffiliate || Math.round(budget * 0.75),
        budgetSelfChannel: plan.budgetSelfChannel || Math.round(budget * 0.25),
        items: plan.items || [],
        signOffRecord: baseSignOff
      }
    ];

    const out3: InputPlanBreakdownState = {
      ...plan,
      currentVersionCode: 'v1.2',
      isVersionLocked: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      versionSnapshots: snapshots
    };
    enrichedPlanCache.set(rawPlan, out3);
    enrichedPlanCache.set(out3, out3);
    return out3;
  }

  if (hasTwoVersions && budget > 0) {
    const v1Budget = Math.round((budget * 0.85) / 1000000) * 1000000;
    const v1Contents = Math.max(5, Math.round(contents * 0.85));
    const v1Gmv = Math.round((gmv * 0.85) / 1000000) * 1000000;
    const v1Ads = Math.round((ads * 0.85) / 1000000) * 1000000;

    const snapshots: PlanVersionSnapshot[] = [
      {
        id: `SNAP-${plan.id}-V10`,
        versionCode: 'v1.0',
        versionName: 'Bản chốt đầu tháng (Baseline)',
        status: 'SUPERSEDED',
        createdAt: '2026-10-01T09:00:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Phiên bản kế hoạch gốc chốt đầu tháng',
        totalTargetBudget: v1Budget,
        totalTargetContents: v1Contents,
        targetGmv: v1Gmv,
        budgetAdsTotal: v1Ads,
        budgetAffiliate: Math.round((plan.budgetAffiliate || v1Budget * 0.8) * 0.85),
        budgetSelfChannel: Math.round((plan.budgetSelfChannel || v1Budget * 0.2) * 0.85),
        items: buildScaledItems(plan.items, 0.85),
        signOffRecord: baseSignOff
      },
      {
        id: `SNAP-${plan.id}-V11`,
        versionCode: 'v1.1',
        versionName: 'Điều chỉnh Đợt 2 (Giữa kỳ)',
        status: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || '') ? 'LOCKED' : 'SUPERSEDED',
        createdAt: '2026-10-08T11:00:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Cập nhật lại tỷ trọng KOC trả phí, FOC 0đ và kênh tự xây theo hiệu quả thực tế Tuần 1',
        totalTargetBudget: budget,
        totalTargetContents: contents,
        targetGmv: gmv,
        budgetAdsTotal: ads,
        budgetAffiliate: plan.budgetAffiliate || Math.round(budget * 0.8),
        budgetSelfChannel: plan.budgetSelfChannel || Math.round(budget * 0.2),
        items: plan.items || [],
        signOffRecord: baseSignOff
      }
    ];

    const out2: InputPlanBreakdownState = {
      ...plan,
      currentVersionCode: 'v1.1',
      isVersionLocked: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      versionSnapshots: snapshots
    };
    enrichedPlanCache.set(rawPlan, out2);
    enrichedPlanCache.set(out2, out2);
    return out2;
  }

  const out1: InputPlanBreakdownState = {
    ...plan,
    currentVersionCode: plan.currentVersionCode || 'v1.0',
    isVersionLocked: plan.isVersionLocked ?? ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
    versionSnapshots: [
      {
        id: `SNAP-${plan.id}-V10`,
        versionCode: 'v1.0',
        versionName: 'Bản chốt đầu tháng (Baseline)',
        status: 'LOCKED',
        createdAt: plan.createdAt || '2026-10-01T09:00:00Z',
        createdBy: 'Growth PIC',
        creatorRole: 'GROWTH',
        changeReason: 'Phiên bản kế hoạch gốc chốt đầu kỳ tháng',
        totalTargetBudget: budget,
        totalTargetContents: contents,
        targetGmv: gmv,
        budgetAdsTotal: ads,
        budgetAffiliate: plan.budgetAffiliate || budget,
        budgetSelfChannel: plan.budgetSelfChannel || 0,
        items: plan.items || [],
        signOffRecord: baseSignOff
      }
    ]
  };
  enrichedPlanCache.set(rawPlan, out1);
  enrichedPlanCache.set(out1, out1);
  return out1;
}

export const INITIAL_MONTHLY_PLANS: InputPlanBreakdownState[] = RAW_MONTHLY_PLANS.map(enrichPlanWithVersions);

// =========================================================================
// QUẢN LÝ TUẦN THEO CHU KỲ THÁNG (WEEK CALENDAR BY MONTH)
// =========================================================================

export interface MonthWeekOption {
  value: string;
  label: string;
  isFullMonth?: boolean;
}

export function getWeeksForMonth(month: string): MonthWeekOption[] {
  const m = month === 'ALL' ? '2026/10' : month;
  const calendarMap: Record<string, MonthWeekOption[]> = {
    '2026/08': [
      { value: 'Cả tháng 08/2026 (W31 - W35)', label: 'Cả tháng 08/2026 (W31 - W35)', isFullMonth: true },
      { value: 'W31 [28.07 - 03.08]', label: 'W31 [28.07 - 03.08]' },
      { value: 'W32 [04.08 - 10.08]', label: 'W32 [04.08 - 10.08]' },
      { value: 'W33 [11.08 - 17.08]', label: 'W33 [11.08 - 17.08]' },
      { value: 'W34 [18.08 - 24.08]', label: 'W34 [18.08 - 24.08]' },
      { value: 'W35 [25.08 - 31.08]', label: 'W35 [25.08 - 31.08]' },
    ],
    '2026/09': [
      { value: 'Cả tháng 09/2026 (W36 - W40)', label: 'Cả tháng 09/2026 (W36 - W40)', isFullMonth: true },
      { value: 'W36 [31.08 - 06.09]', label: 'W36 [31.08 - 06.09]' },
      { value: 'W37 [07.09 - 13.09]', label: 'W37 [07.09 - 13.09]' },
      { value: 'W38 [14.09 - 20.09]', label: 'W38 [14.09 - 20.09]' },
      { value: 'W39 [21.09 - 27.09]', label: 'W39 [21.09 - 27.09]' },
      { value: 'W40 [28.09 - 04.10]', label: 'W40 [28.09 - 04.10]' },
    ],
    '2026/10': [
      { value: 'Cả tháng 10/2026 (W40 - W44)', label: 'Cả tháng 10/2026 (W40 - W44)', isFullMonth: true },
      { value: 'W40 [28.09 - 04.10]', label: 'W40 [28.09 - 04.10]' },
      { value: 'W41 [05.10 - 11.10]', label: 'W41 [05.10 - 11.10]' },
      { value: 'W42 [12.10 - 18.10]', label: 'W42 [12.10 - 18.10]' },
      { value: 'W43 [19.10 - 25.10]', label: 'W43 [19.10 - 25.10]' },
      { value: 'W44 [26.10 - 01.11]', label: 'W44 [26.10 - 01.11]' },
    ],
    '2026/11': [
      { value: 'Cả tháng 11/2026 (W45 - W49)', label: 'Cả tháng 11/2026 (W45 - W49)', isFullMonth: true },
      { value: 'W45 [30.10-05.11]', label: 'W45 [30.10-05.11]' },
      { value: 'W46 [06.11-12.11]', label: 'W46 [06.11-12.11]' },
      { value: 'W47 [13.11-19.11]', label: 'W47 [13.11-19.11]' },
      { value: 'W48 [20.11-26.11]', label: 'W48 [20.11-26.11]' },
      { value: 'W49 [27.11-03.12]', label: 'W49 [27.11-03.12]' },
    ],
    '2026/12': [
      { value: 'Cả tháng 12/2026 (W49 - W53)', label: 'Cả tháng 12/2026 (W49 - W53)', isFullMonth: true },
      { value: 'W49 [30.11 - 06.12]', label: 'W49 [30.11 - 06.12]' },
      { value: 'W50 [07.12 - 13.12]', label: 'W50 [07.12 - 13.12]' },
      { value: 'W51 [14.12 - 20.12]', label: 'W51 [14.12 - 20.12]' },
      { value: 'W52 [21.12 - 27.12]', label: 'W52 [21.12 - 27.12]' },
      { value: 'W53 [28.12 - 03.01]', label: 'W53 [28.12 - 03.01]' },
    ],
    '2027/01': [
      { value: 'Cả tháng 01/2027 (W01 - W05)', label: 'Cả tháng 01/2027 (W01 - W05)', isFullMonth: true },
      { value: 'W01 [04.01 - 10.01]', label: 'W01 [04.01 - 10.01]' },
      { value: 'W02 [11.01 - 17.01]', label: 'W02 [11.01 - 17.01]' },
      { value: 'W03 [18.01 - 24.01]', label: 'W03 [18.01 - 24.01]' },
      { value: 'W04 [25.01 - 31.01]', label: 'W04 [25.01 - 31.01]' },
      { value: 'W05 [01.02 - 07.02]', label: 'W05 [01.02 - 07.02]' },
    ],
  };

  if (calendarMap[m]) return calendarMap[m];

  const parts = m.split('/');
  const year = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(monthNum)) {
    return [{ value: `Tháng ${m}`, label: `Tháng ${m}`, isFullMonth: true }];
  }
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return [
    { value: `Cả tháng ${pad(monthNum)}/${year} (W1 - W4)`, label: `Cả tháng ${pad(monthNum)}/${year} (W1 - W4)`, isFullMonth: true },
    { value: `W1 [01.${pad(monthNum)} - 07.${pad(monthNum)}]`, label: `W1 [01.${pad(monthNum)} - 07.${pad(monthNum)}]` },
    { value: `W2 [08.${pad(monthNum)} - 14.${pad(monthNum)}]`, label: `W2 [08.${pad(monthNum)} - 14.${pad(monthNum)}]` },
    { value: `W3 [15.${pad(monthNum)} - 21.${pad(monthNum)}]`, label: `W3 [15.${pad(monthNum)} - 21.${pad(monthNum)}]` },
    { value: `W4 [22.${pad(monthNum)} - 28.${pad(monthNum)}]`, label: `W4 [22.${pad(monthNum)} - 28.${pad(monthNum)}]` },
  ];
}

export function buildDefaultWeeklyMatrix(month: string, picName: string = 'Khánh Vy') {
  const weeks = getWeeksForMonth(month).filter(w => !w.isFullMonth).slice(0, 5);
  const ratios = [
    { affQty: 10, affBudget: 35000000, tapQty: 30, selfQty: 8, selfBudget: 3500000, multiQty: 4, multiBudget: 2500000, status: 'Đã lập', tiers: { kl1: 2, kl2: 3, kl3: 3, kl4: 1, kl5: 1, kl6: 0, kl7: 0 } },
    { affQty: 12, affBudget: 42000000, tapQty: 35, selfQty: 10, selfBudget: 4200000, multiQty: 5, multiBudget: 3200000, status: 'Đã lập', tiers: { kl1: 2, kl2: 4, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 } },
    { affQty: 10, affBudget: 38000000, tapQty: 25, selfQty: 8, selfBudget: 3500000, multiQty: 4, multiBudget: 2200000, status: 'Đã lập', tiers: { kl1: 1, kl2: 3, kl3: 3, kl4: 2, kl5: 1, kl6: 0, kl7: 0 } },
    { affQty: 8, affBudget: 28000000, tapQty: 20, selfQty: 6, selfBudget: 2800000, multiQty: 3, multiBudget: 1800000, status: 'Đã lập', tiers: { kl1: 2, kl2: 2, kl3: 2, kl4: 1, kl5: 1, kl6: 0, kl7: 0 } },
    { affQty: 2, affBudget: 7000000, tapQty: 10, selfQty: 2, selfBudget: 1000000, multiQty: 1, multiBudget: 500000, status: 'Dự thảo', tiers: { kl1: 0, kl2: 1, kl3: 1, kl4: 0, kl5: 0, kl6: 0, kl7: 0 } },
  ];

  return weeks.map((w, idx) => {
    const r = ratios[idx] || ratios[0];
    return {
      week: w.value,
      affPaidQty: r.affQty,
      affPaidBudget: r.affBudget,
      tapFreeQty: r.tapQty,
      selfChannelQty: r.selfQty,
      selfChannelBudget: r.selfBudget,
      multiQty: r.multiQty,
      multiBudget: r.multiBudget,
      pic: picName,
      status: r.status,
      tiers: { ...r.tiers },
      tapChannels: { upAffiliate: Math.round(r.tapQty * 0.6), brand: Math.round(r.tapQty * 0.25), upbase: Math.max(1, Math.round(r.tapQty * 0.15)) },
      selfFormats: { voice: Math.ceil(r.selfQty * 0.4), text: Math.floor(r.selfQty * 0.3), remix: Math.floor(r.selfQty * 0.2), autoScript: 1, pov: 0 },
      multiPlatforms: { shopee: Math.ceil(r.multiQty * 0.5), facebook: Math.floor(r.multiQty * 0.3), threads: 1, instagram: 0 }
    };
  });
}


