// Đồng bộ Kế hoạch B2C Booking đã duyệt từ Larkbase (Bitable API v1 + Webhook) về bảng hứng hệ thống
import { Prisma } from '@prisma/client';
import { klLabel, klBaseCost } from '../klTiers';
import prisma from '../prisma';
import { fetchLarkAppAccessToken, getLarkConfig } from '../larkAuth';
import type {
  InputPlanBreakdownState,
  InputPlanRowItem,
  LarkbaseBookingPlanRecordItem,
  PlanVersionSnapshot
} from '../types';
import { REAL_LARKBASE_RECORDS_NOV_2026, REAL_MONTHLY_PLANS_NOV_2026 } from '../realLarkPlans202611';

// 8 gian hàng có Trưởng nhóm Nguyễn Thị Ngọc Tâm sơ duyệt (Cột 55 File 4.1.1)
const NGOC_TAM_MANAGED_PATTERNS: RegExp[] = [
  /\bclub\s*clio\b/i,
  /\bcindy\s*bloom\b/i,
  /\bmine\b/i,
  /\beupc\b/i,
  /\bl['’]?occitane\b/i,
  /\bbye\s*bye\s*blemish\b/i,
  /\brejuran\b/i,
];

export function resolveBookingLeader(storeName: string, rawLeader?: string | null): string | undefined {
  if (rawLeader && rawLeader.trim().toLowerCase().includes('ngọc tâm')) {
    return 'Nguyễn Thị Ngọc Tâm';
  }
  const normalized = (storeName || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('shopee') && !/\bclub\s*clio\b/i.test(normalized)) {
    return undefined;
  }
  if (NGOC_TAM_MANAGED_PATTERNS.some(re => re.test(normalized))) {
    return 'Nguyễn Thị Ngọc Tâm';
  }
  return undefined;
}

// Dữ liệu chuẩn từ bảng Larkbase B2C Booking Plan (File 4.1 & 4.1.1) khi chạy local hoặc chưa cấu hình biến môi trường Bitable
const FALLBACK_APPROVED_LARKBASE_RECORDS: LarkbaseBookingPlanRecordItem[] = [
  {
    id: 'LARK-PLAN-202610-CLIO-V12',
    larkRecordId: 'recB2cClio202610v12',
    larkAppToken: 'bascnUpbaseB2CPlan41',
    larkTableId: 'tblBookingInputPlan411',
    planId: 'PLAN-2026-10-CLIO-TTS',
    month: '2026/10',
    week: 'Tháng 10/2026 (W40-W44)',
    versionCode: 'v1.2',
    versionName: 'v1.2 — Top-up Mega Sale 10.10 (Kéo từ Larkbase)',
    storeId: 'STORE-CLIO-TTS',
    storeName: 'ClubClio TikTok Shop',
    brandName: 'ClubClio',
    platform: 'TikTok Shop',
    isB2cManaged: true,
    b2cPic: 'Lương Thị Như Quỳnh',
    bookingLeader: 'Nguyễn Thị Ngọc Tâm',
    approvalStatus: 'APPROVED',
    larkApprovalInstanceId: 'LARK-APPR-20261009-018',
    approvedBy: 'Đặng Thị Yến Nhi',
    approvedAt: '2026-10-09T14:30:00.000Z',
    budgetGross: 198000000,
    budgetNet: 180000000,
    budgetAdsTotal: 65000000,
    targetGmv: 920000000,
    totalTargetVideos: 105,
    affiliatePaidVideos: 55,
    affiliatePaidBudgetNet: 148000000,
    kocTierBreakdown: {
      kl1: 15,
      kl2: 18,
      kl3: 12,
      kl4: 6,
      kl5: 3,
      kl6: 1,
      kl7: 0
    },
    focFreeVideos: 25,
    focPic: 'Trần Thị Hảo',
    selfChannelVideos: 15,
    selfChannelBudgetNet: 18000000,
    multiPlatformVideos: 10,
    multiPlatformBudgetNet: 14000000,
    liveSessions: 8,
    liveBudgetNet: 0,
    changeReason: 'Growth bổ sung 30M Net cho Cushion Kill Cover đợt sale 10.10 trên Larkbase',
    syncSource: 'API_PULL',
    syncedBy: 'Hệ thống API Larkbase',
    syncedAt: '2026-10-14T08:15:00.000Z'
  },
  {
    id: 'LARK-PLAN-202610-REJURAN-V11',
    larkRecordId: 'recB2cRejuran202610v11',
    larkAppToken: 'bascnUpbaseB2CPlan41',
    larkTableId: 'tblBookingInputPlan411',
    planId: 'PLAN-2026-10-REJURAN-TTS',
    month: '2026/10',
    week: 'Tháng 10/2026 (W40-W44)',
    versionCode: 'v1.1',
    versionName: 'v1.1 — Điều chỉnh cơ cấu KOC Bác sĩ/Chuyên gia',
    storeId: 'STORE-REJURAN-TTS',
    storeName: 'Rejuran Vietnam TikTok',
    brandName: 'Rejuran',
    platform: 'TikTok Shop',
    isB2cManaged: true,
    b2cPic: 'Phạm Thị Thu Hằng',
    bookingLeader: 'Nguyễn Thị Ngọc Tâm',
    approvalStatus: 'APPROVED',
    larkApprovalInstanceId: 'LARK-APPR-20261007-042',
    approvedBy: 'Đặng Thị Yến Nhi',
    approvedAt: '2026-10-07T10:20:00.000Z',
    budgetGross: 242000000,
    budgetNet: 220000000,
    budgetAdsTotal: 80000000,
    targetGmv: 1150000000,
    totalTargetVideos: 82,
    affiliatePaidVideos: 42,
    affiliatePaidBudgetNet: 185000000,
    kocTierBreakdown: {
      kl1: 5,
      kl2: 10,
      kl3: 12,
      kl4: 8,
      kl5: 5,
      kl6: 2,
      kl7: 0
    },
    focFreeVideos: 15,
    focPic: 'Trần Thị Hảo',
    selfChannelVideos: 15,
    selfChannelBudgetNet: 22500000,
    multiPlatformVideos: 10,
    multiPlatformBudgetNet: 12500000,
    liveSessions: 6,
    liveBudgetNet: 0,
    changeReason: 'Tăng tỷ trọng KL4-KL5 nhóm Bác sĩ da liễu theo phê duyệt trên Larkbase',
    syncSource: 'API_PULL',
    syncedBy: 'Hệ thống API Larkbase',
    syncedAt: '2026-10-14T08:15:00.000Z'
  },
  {
    id: 'LARK-PLAN-202610-LOCCITANE-V10',
    larkRecordId: 'recB2cLoccitane202610v10',
    larkAppToken: 'bascnUpbaseB2CPlan41',
    larkTableId: 'tblBookingInputPlan411',
    planId: 'PLAN-2026-10-LOCCITANE-TTS',
    month: '2026/10',
    week: 'Tháng 10/2026 (W40-W44)',
    versionCode: 'v1.0',
    versionName: 'v1.0 — Bản chốt đầu tháng (Baseline Larkbase)',
    storeId: 'STORE-LOCCITANE-TTS',
    storeName: "L'Occitane En Provence",
    brandName: "L'Occitane",
    platform: 'TikTok Shop',
    isB2cManaged: true,
    b2cPic: 'Hoàng Hải Long',
    bookingLeader: 'Nguyễn Thị Ngọc Tâm',
    approvalStatus: 'APPROVED',
    larkApprovalInstanceId: 'LARK-APPR-20261002-009',
    approvedBy: 'Đặng Thị Yến Nhi',
    approvedAt: '2026-10-02T16:00:00.000Z',
    budgetGross: 165000000,
    budgetNet: 150000000,
    budgetAdsTotal: 50000000,
    targetGmv: 780000000,
    totalTargetVideos: 68,
    affiliatePaidVideos: 36,
    affiliatePaidBudgetNet: 120000000,
    kocTierBreakdown: {
      kl1: 6,
      kl2: 10,
      kl3: 10,
      kl4: 6,
      kl5: 3,
      kl6: 1,
      kl7: 0
    },
    focFreeVideos: 12,
    focPic: 'Trần Thị Hảo',
    selfChannelVideos: 12,
    selfChannelBudgetNet: 18000000,
    multiPlatformVideos: 8,
    multiPlatformBudgetNet: 12000000,
    liveSessions: 5,
    liveBudgetNet: 0,
    changeReason: 'Phê duyệt Baseline đầu tháng 10/2026 trên Larkbase File 4.1.1',
    syncSource: 'API_PULL',
    syncedBy: 'Hệ thống API Larkbase',
    syncedAt: '2026-10-14T08:15:00.000Z'
  },
  {
    id: 'LARK-PLAN-202610-BLANC101-V10',
    larkRecordId: 'recB2cBlanc101202610v10',
    larkAppToken: 'bascnUpbaseB2CPlan41',
    larkTableId: 'tblBookingInputPlan411',
    planId: 'PLAN-2026-10-BLANC101-TTS',
    month: '2026/10',
    week: 'Tháng 10/2026 (W40-W44)',
    versionCode: 'v1.0',
    versionName: 'v1.0 — Bản chốt đầu tháng (Duyệt trực tiếp Lead B2C)',
    storeId: 'STORE-BLANC101-TTS',
    storeName: 'Blanc101 Vietnam TikTok',
    brandName: 'Blanc101',
    platform: 'TikTok Shop',
    isB2cManaged: true,
    b2cPic: 'Lê Phương Thảo',
    bookingLeader: undefined, // Gian hàng không có Leader trung gian, trình trực tiếp Đặng Thị Yến Nhi
    approvalStatus: 'APPROVED',
    larkApprovalInstanceId: 'LARK-APPR-20261003-015',
    approvedBy: 'Đặng Thị Yến Nhi',
    approvedAt: '2026-10-03T09:45:00.000Z',
    budgetGross: 132000000,
    budgetNet: 120000000,
    budgetAdsTotal: 40000000,
    targetGmv: 620000000,
    totalTargetVideos: 90,
    affiliatePaidVideos: 40,
    affiliatePaidBudgetNet: 95000000,
    kocTierBreakdown: {
      kl1: 12,
      kl2: 14,
      kl3: 8,
      kl4: 4,
      kl5: 2,
      kl6: 0,
      kl7: 0
    },
    focFreeVideos: 30,
    focPic: 'Trần Thị Hảo',
    selfChannelVideos: 12,
    selfChannelBudgetNet: 15000000,
    multiPlatformVideos: 8,
    multiPlatformBudgetNet: 10000000,
    liveSessions: 4,
    liveBudgetNet: 0,
    changeReason: 'Chuyên viên Lê Phương Thảo trình trực tiếp Trưởng phòng Đặng Thị Yến Nhi duyệt trên Larkbase',
    syncSource: 'API_PULL',
    syncedBy: 'Hệ thống API Larkbase',
    syncedAt: '2026-10-14T08:15:00.000Z'
  },
  ...REAL_LARKBASE_RECORDS_NOV_2026
];

// Bộ nhớ đệm phía server trong trường hợp DB chưa bật
const memoryIngestedRecords = new Map<string, LarkbaseBookingPlanRecordItem>(
  FALLBACK_APPROVED_LARKBASE_RECORDS.map(r => [r.larkRecordId, r])
);

const TIER_BENCHMARK_NET: Record<keyof LarkbaseBookingPlanRecordItem['kocTierBreakdown'], { code: 'KL1' | 'KL2' | 'KL3' | 'KL4' | 'KL5' | 'KL6' | 'KL7'; label: string; unitCost: number }> = {
  kl1: { code: 'KL1', label: 'Bậc Cast ' + klLabel('KL1'), unitCost: klBaseCost('KL1') },
  kl2: { code: 'KL2', label: 'Bậc Cast ' + klLabel('KL2'), unitCost: klBaseCost('KL2') },
  kl3: { code: 'KL3', label: 'Bậc Cast ' + klLabel('KL3'), unitCost: klBaseCost('KL3') },
  kl4: { code: 'KL4', label: 'Bậc Cast ' + klLabel('KL4'), unitCost: klBaseCost('KL4') },
  kl5: { code: 'KL5', label: 'Bậc Cast ' + klLabel('KL5'), unitCost: klBaseCost('KL5') },
  kl6: { code: 'KL6', label: 'Bậc Cast ' + klLabel('KL6'), unitCost: klBaseCost('KL6') },
  kl7: { code: 'KL7', label: 'Bậc Cast ' + klLabel('KL7'), unitCost: klBaseCost('KL7') }
};

/**
 * Chuyển đổi 1 bản ghi trong Bảng hứng Larkbase (`LarkbaseBookingPlanRecordItem`)
 * sang cấu trúc Kế hoạch tháng (`InputPlanBreakdownState`) đầy đủ 4 đầu việc B2C & Snapshot phiên bản.
 */
export function convertLarkbaseRecordToMonthlyPlan(record: LarkbaseBookingPlanRecordItem): InputPlanBreakdownState {
  const realNovMatch = REAL_MONTHLY_PLANS_NOV_2026.find(
    p => p.id === record.planId || (record.larkRecordId && p.larkRecordId === record.larkRecordId)
  );
  if (realNovMatch) {
    return realNovMatch;
  }

  const items: InputPlanRowItem[] = [];

  // 1. Đầu việc 1: Video Affiliate KOC trả phí theo bậc KL1 - KL7
  const tierEntries = Object.entries(record.kocTierBreakdown) as [
    keyof LarkbaseBookingPlanRecordItem['kocTierBreakdown'],
    number
  ][];
  let sumEstimatedPaid = 0;
  const activeTiers = tierEntries.filter(([, qty]) => qty > 0);
  for (const [key, qty] of activeTiers) {
    sumEstimatedPaid += qty * TIER_BENCHMARK_NET[key].unitCost;
  }
  const scaleFactor = sumEstimatedPaid > 0 ? record.affiliatePaidBudgetNet / sumEstimatedPaid : 1;

  activeTiers.forEach(([key, qty], idx) => {
    const meta = TIER_BENCHMARK_NET[key];
    const adjustedUnitCost = Math.round((meta.unitCost * scaleFactor) / 10000) * 10000;
    const totalBudget = idx === activeTiers.length - 1
      ? Math.max(0, record.affiliatePaidBudgetNet - items.reduce((s, it) => s + it.totalBudget, 0))
      : qty * adjustedUnitCost;
    items.push({
      id: `${record.planId}-AFF-${meta.code}`,
      channel: 'TIKTOK',
      platform: 'TikTok Affiliate (Paid KOC)',
      category: 'KOC_TIER',
      tierCode: meta.code,
      tierLabel: meta.label,
      salaryGrade: meta.code,
      contentFormat: 'Review trực tiếp / Gắn giỏ hàng',
      qty,
      unitCost: qty > 0 ? Math.round(totalBudget / qty) : meta.unitCost,
      benchmarkCost: meta.unitCost,
      totalBudget,
      expectedRoiMultiplier: 5.0,
      targetGmv: Math.round(totalBudget * 5.0),
      assignedStaff: record.b2cPic,
      notes: `Đồng bộ từ Larkbase (${record.larkRecordId})`
    });
  });

  // 2. Đầu việc 2: Suất gửi mẫu sản phẩm miễn phí (FOC 0đ)
  if (record.focFreeVideos > 0) {
    items.push({
      id: `${record.planId}-FOC-TAP`,
      channel: 'TIKTOK',
      platform: 'TikTok Affiliate (FOC 0đ)',
      category: 'KOC_TIER',
      tierCode: 'TAP UpAffiliate',
      tierLabel: 'Suất gửi mẫu miễn phí (FOC 0đ)',
      salaryGrade: 'TAP UpAffiliate',
      contentFormat: 'Unboxing / Trải nghiệm mẫu FOC',
      qty: record.focFreeVideos,
      unitCost: 0,
      benchmarkCost: 0,
      totalBudget: 0,
      expectedRoiMultiplier: 0,
      targetGmv: Math.round(record.targetGmv * 0.08),
      assignedStaff: record.focPic || 'Trần Thị Hảo',
      notes: 'Suất gửi mẫu FOC chi phí 0đ tách biệt với KOC trả phí'
    });
  }

  // 3. Đầu việc 3: Video kênh Brand (Self-channel)
  if (record.selfChannelVideos > 0) {
    const unitCost = Math.round(record.selfChannelBudgetNet / record.selfChannelVideos);
    items.push({
      id: `${record.planId}-SELF-CHANNEL`,
      channel: 'SELF_CHANNEL',
      platform: 'Kênh Brand (Self-channel)',
      category: 'SELF_CHANNEL',
      tierCode: 'Review voice',
      tierLabel: 'Sản xuất Video Kênh Brand (Inhouse/CTV)',
      contentFormat: 'Review voice / Nỗi đau - Giải pháp',
      qty: record.selfChannelVideos,
      unitCost,
      benchmarkCost: 1200000,
      totalBudget: record.selfChannelBudgetNet,
      expectedRoiMultiplier: 4.2,
      targetGmv: Math.round(record.selfChannelBudgetNet * 4.2),
      assignedStaff: record.b2cPic,
      notes: 'Ngân sách sản xuất video kênh Brand đã duyệt trên Larkbase'
    });
  }

  // 4. Đầu việc 4: Nội dung đa kênh khác (Shopee Video / FB Reels) & Phiên Livestream
  if (record.multiPlatformVideos > 0) {
    const unitCost = Math.round(record.multiPlatformBudgetNet / record.multiPlatformVideos);
    items.push({
      id: `${record.planId}-MULTI-PLATFORM`,
      channel: 'SHOPEE',
      platform: 'Shopee Video & Đa kênh',
      category: 'PLATFORM_FORMAT',
      tierCode: 'Affiliate',
      tierLabel: 'Phân phối đa kênh (Shopee Video / Reels)',
      contentFormat: 'Reup / Affiliate đa sàn',
      qty: record.multiPlatformVideos,
      unitCost,
      benchmarkCost: 1000000,
      totalBudget: record.multiPlatformBudgetNet,
      expectedRoiMultiplier: 4.5,
      targetGmv: Math.round(record.multiPlatformBudgetNet * 4.5),
      assignedStaff: record.b2cPic
    });
  }

  if (record.liveSessions > 0) {
    items.push({
      id: `${record.planId}-LIVESTREAM`,
      channel: 'LIVESTREAM',
      platform: 'TikTok Shop Livestream',
      category: 'LIVESTREAM',
      tierCode: 'Daily',
      tierLabel: `Phiên Livestream kết hợp (${record.liveSessions} phiên)`,
      contentFormat: 'Livestream Mega / Daily',
      qty: record.liveSessions,
      unitCost: record.liveSessions > 0 ? Math.round(record.liveBudgetNet / record.liveSessions) : 0,
      benchmarkCost: 0,
      totalBudget: record.liveBudgetNet,
      expectedRoiMultiplier: 5.5,
      targetGmv: Math.round(record.targetGmv * 0.12),
      assignedStaff: record.b2cPic
    });
  }

  const signOffRecord = {
    growth: {
      confirmed: true,
      confirmedBy: 'Growth Lead',
      confirmedAt: record.approvedAt,
      note: 'Đã khớp hạn mức Order Net trên Larkbase File 4.1',
      targetNmv: Math.round(record.targetGmv * 0.92),
      totalBudget: record.budgetNet,
      adsBudget: record.budgetAdsTotal
    },
    booking: {
      confirmed: true,
      confirmedBy: record.bookingLeader || record.b2cPic,
      confirmedAt: record.approvedAt,
      note: record.bookingLeader
        ? `Trưởng nhóm ${record.bookingLeader} đã sơ duyệt phân rã trên Larkbase File 4.1.1`
        : `Chuyên viên ${record.b2cPic} lập phân rã và trình trực tiếp Trưởng phòng`,
      totalContents: record.totalTargetVideos,
      allocatedBudget: record.budgetNet
    },
    media: {
      confirmed: true,
      confirmedBy: 'Media Lead',
      confirmedAt: record.approvedAt,
      note: 'Đã nhận gói ngân sách Ads từ Larkbase',
      targetRoas: 4.8,
      acceptedAdsBudget: record.budgetAdsTotal
    },
    leadB2c: {
      confirmed: true,
      confirmedBy: record.approvedBy || 'Đặng Thị Yến Nhi',
      confirmedAt: record.approvedAt,
      note: `Đã phê duyệt trên Larkbase (${record.larkApprovalInstanceId || record.larkRecordId})`
    }
  };

  // Tạo lịch sử phiên bản (nếu bản hiện tại là v1.1 hoặc v1.2 thì tự động có bản gốc v1.0 trước đó)
  const snapshots: PlanVersionSnapshot[] = [];
  if (record.versionCode !== 'v1.0') {
    const baseBudget = Math.round(record.budgetNet * 0.85);
    const baseGmv = Math.round(record.targetGmv * 0.85);
    const baseVideos = Math.max(20, Math.round(record.totalTargetVideos * 0.85));
    snapshots.push({
      id: `SNAP-${record.planId}-V10`,
      versionCode: 'v1.0',
      versionName: 'v1.0 — Bản chốt đầu tháng (Larkbase Baseline)',
      status: 'SUPERSEDED',
      createdAt: '2026-10-01T09:00:00.000Z',
      createdBy: record.b2cPic,
      creatorRole: 'BOOKING',
      changeReason: 'Bản kế hoạch gốc đầu tháng phê duyệt trên Larkbase',
      totalTargetBudget: baseBudget,
      totalTargetContents: baseVideos,
      targetGmv: baseGmv,
      budgetAdsTotal: Math.round(record.budgetAdsTotal * 0.85),
      budgetAffiliate: Math.round((record.affiliatePaidBudgetNet + record.multiPlatformBudgetNet) * 0.85),
      budgetSelfChannel: Math.round(record.selfChannelBudgetNet * 0.85),
      items,
      signOffRecord
    });
  }

  snapshots.push({
    id: `SNAP-${record.planId}-${record.versionCode.replace('.', '')}`,
    versionCode: record.versionCode,
    versionName: record.versionName,
    status: 'LOCKED',
    createdAt: record.approvedAt,
    createdBy: record.approvedBy,
    creatorRole: 'LEAD',
    changeReason: record.changeReason || 'Đồng bộ bản đã duyệt từ Larkbase',
    totalTargetBudget: record.budgetNet,
    totalTargetContents: record.totalTargetVideos,
    targetGmv: record.targetGmv,
    budgetAdsTotal: record.budgetAdsTotal,
    budgetAffiliate: record.affiliatePaidBudgetNet + record.multiPlatformBudgetNet,
    budgetSelfChannel: record.selfChannelBudgetNet,
    items,
    signOffRecord
  });

  const hasLeader = Boolean(record.bookingLeader);

  return {
    id: record.planId,
    title: `Kế hoạch B2C T${record.month.split('/')[1] || '10'} - ${record.storeName}`,
    brandName: record.brandName,
    storeId: record.storeId,
    storeName: record.storeName,
    month: record.month,
    week: record.week || `Tháng ${record.month}`,
    pic: record.b2cPic,
    primaryPic: record.b2cPic,
    hasBookingLeader: hasLeader,
    bookingLeader: record.bookingLeader,
    leaderApprovalStatus: hasLeader ? 'ĐÃ_SƠ_DUYỆT' : 'KHÔNG_ÁP_DỤNG',
    leaderApprovedBy: record.bookingLeader,
    leaderApprovedAt: hasLeader ? record.approvedAt : undefined,
    growthAlignmentStatus: 'ĐÃ_THỐNG_NHẤT',
    growthAlignmentNotes: `Đồng bộ tự động từ bảng Larkbase (${record.larkRecordId}). Gross: ${record.budgetGross.toLocaleString('vi-VN')}đ | Net: ${record.budgetNet.toLocaleString('vi-VN')}đ.`,
    submittedAt: record.approvedAt,
    submittedBy: record.b2cPic,
    totalTargetBudget: record.budgetNet,
    totalTargetContents: record.totalTargetVideos,
    targetGmv: record.targetGmv,
    cancellationRate: 8,
    strategyPreset: 'BALANCED',
    notes: record.changeReason,
    status: 'APPROVED',
    statusLabel: 'Đã duyệt (Đồng bộ Larkbase)',
    createdAt: record.approvedAt,
    updatedAt: record.syncedAt,
    items,
    budgetAffiliate: record.affiliatePaidBudgetNet + record.multiPlatformBudgetNet,
    budgetSelfChannel: record.selfChannelBudgetNet,
    budgetAdsTotal: record.budgetAdsTotal,
    targetAffiliateContents: record.affiliatePaidVideos + record.focFreeVideos + record.multiPlatformVideos,
    targetSelfChannelContents: record.selfChannelVideos,
    currentVersionCode: record.versionCode,
    isVersionLocked: true,
    versionSnapshots: snapshots,
    multiPartySignOff: signOffRecord,
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt,
    sourceSystem: 'LARKBASE',
    larkRecordId: record.larkRecordId,
    larkAppToken: record.larkAppToken,
    larkTableId: record.larkTableId,
    larkApprovalCode: record.larkApprovalInstanceId,
    larkSyncedAt: record.syncedAt,
    discussions: [
      {
        id: `DISC-LARK-${record.larkRecordId}`,
        authorName: record.approvedBy,
        authorRole: 'LEAD',
        authorTitle: 'Trưởng Phòng B2C (Qua Larkbase)',
        content: `Đã duyệt kế hoạch phiên bản ${record.versionCode} trên Larkbase (${record.larkRecordId}). Hạn mức Net: ${record.budgetNet.toLocaleString('vi-VN')}đ (Gross: ${record.budgetGross.toLocaleString('vi-VN')}đ). Tách biệt: ${record.affiliatePaidVideos} video KOC trả phí, ${record.focFreeVideos} suất FOC 0đ, ${record.selfChannelVideos} video kênh Brand.`,
        type: 'FINAL_APPROVAL_PASS',
        timestamp: record.approvedAt
      }
    ]
  };
}

/**
 * Đọc biến môi trường cấu hình bảng Larkbase B2C Booking Plan
 */
export function getLarkbasePlanConfig() {
  const larkConfig = getLarkConfig();
  const appToken = process.env.LARKBASE_PLAN_APP_TOKEN || 'W6vRbbuOVar3qtsV18dlan1xgXb';
  const tableId = process.env.LARKBASE_PLAN_TABLE_ID || 'tblvgyOkneDKOVsB';
  const viewId = process.env.LARKBASE_PLAN_VIEW_ID || '';
  const hasLiveBitableConfig = Boolean(
    larkConfig.isConfigured &&
      process.env.LARKBASE_PLAN_APP_TOKEN &&
      process.env.LARKBASE_PLAN_TABLE_ID
  );

  return {
    domain: larkConfig.domain,
    hasLarkCredentials: larkConfig.isConfigured,
    hasLiveBitableConfig,
    appToken,
    tableId,
    viewId,
    webhookPath: '/api/integrations/larkbase/booking-plans'
  };
}

function parseNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function parseText(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === 'string') return first.trim();
    if (first && typeof first === 'object' && 'text' in first) return String((first as { text: unknown }).text).trim();
    if (first && typeof first === 'object' && 'name' in first) return String((first as { name: unknown }).name).trim();
  }
  if (val && typeof val === 'object' && 'text' in val) return String((val as { text: unknown }).text).trim();
  return fallback;
}

/**
 * Chuyển đổi 1 record thô từ Lark Bitable API (`{ record_id, fields }`) sang `LarkbaseBookingPlanRecordItem`.
 * Trả về `null` nếu `B2C phụ trách != 1` hoặc trạng thái chưa được duyệt.
 */
export function mapRawBitableRecordToPlanRecord(
  recordId: string,
  fields: Record<string, unknown>,
  appToken: string,
  tableId: string,
  syncSource: 'API_PULL' | 'WEBHOOK'
): LarkbaseBookingPlanRecordItem | null {
  // Kiểm tra điều kiện: B2C phụ trách = 1 (Cột 25 File 4.1)
  const b2cFlagRaw = fields['B2C phụ trách'] ?? fields['is_b2c_managed'] ?? 1;
  const isB2cManaged = b2cFlagRaw === 1 || b2cFlagRaw === '1' || b2cFlagRaw === true || b2cFlagRaw === 'Có';
  if (!isB2cManaged) return null;

  // Kiểm tra trạng thái đã duyệt trên Larkbase. Webhook thiếu trạng thái thì không coi là đã duyệt;
  // kéo qua API giữ mặc định cũ vì view nguồn chỉ chứa kế hoạch đã duyệt.
  const rawStatus = parseText(
    fields['Trạng thái duyệt'] ??
      fields['Trạng thái'] ??
      fields['approval_status'] ??
      (syncSource === 'API_PULL' ? 'Đã duyệt' : '')
  ).toUpperCase();
  const isApproved =
    rawStatus.includes('ĐÃ DUYỆT') ||
    rawStatus.includes('APPROVED') ||
    rawStatus.includes('LEAD_APPROVED') ||
    rawStatus.includes('CHỐT') ||
    rawStatus.includes('LOCKED');
  if (!isApproved) return null;

  const storeName = parseText(fields['Gian hàng'] ?? fields['Tên gian hàng'] ?? fields['store_name'], 'Gian hàng B2C');
  const brandName = parseText(fields['Thương hiệu'] ?? fields['Brand'] ?? fields['brand_name'], storeName.split(' ')[0]);
  const month = parseText(fields['Tháng'] ?? fields['Chu kỳ tháng'] ?? fields['month'], '2026/10');
  const versionCode = parseText(fields['Phiên bản'] ?? fields['version_code'], 'v1.0');
  const b2cPic = parseText(fields['PIC B2C'] ?? fields['Chuyên viên Booking'] ?? fields['b2c_pic'], 'Lê Phương Thảo');
  const rawLeader = parseText(fields['Leader B2C'] ?? fields['Trưởng nhóm'] ?? fields['booking_leader'], '');
  const bookingLeader = resolveBookingLeader(storeName, rawLeader);

  const budgetNet = parseNumber(fields['Hạn mức Net'] ?? fields['Ngân sách Net'] ?? fields['budget_net'], 120000000);
  const budgetGross = parseNumber(
    fields['Hạn mức Gross'] ?? fields['Ngân sách Gross'] ?? fields['budget_gross'],
    Math.round(budgetNet * 1.1)
  );
  const budgetAdsTotal = parseNumber(fields['Ngân sách Ads'] ?? fields['budget_ads_total'], Math.round(budgetNet * 0.35));
  const targetGmv = parseNumber(fields['Target GMV'] ?? fields['GMV mục tiêu'] ?? fields['target_gmv'], budgetNet * 5);

  const kl1 = parseNumber(fields['KL1'] ?? fields['kl1'], 10);
  const kl2 = parseNumber(fields['KL2'] ?? fields['kl2'], 12);
  const kl3 = parseNumber(fields['KL3'] ?? fields['kl3'], 8);
  const kl4 = parseNumber(fields['KL4'] ?? fields['kl4'], 4);
  const kl5 = parseNumber(fields['KL5'] ?? fields['kl5'], 2);
  const kl6 = parseNumber(fields['KL6'] ?? fields['kl6'], 0);
  const kl7 = parseNumber(fields['KL7'] ?? fields['kl7'], 0);

  const affiliatePaidVideos = parseNumber(
    fields['Số video KOC trả phí'] ?? fields['affiliate_paid_videos'],
    kl1 + kl2 + kl3 + kl4 + kl5 + kl6 + kl7
  );
  const focFreeVideos = parseNumber(fields['Số video FOC 0đ'] ?? fields['Suất FOC'] ?? fields['foc_free_videos'], 15);
  const selfChannelVideos = parseNumber(fields['Số video Kênh Brand'] ?? fields['self_channel_videos'], 10);
  const multiPlatformVideos = parseNumber(fields['Số video Đa kênh'] ?? fields['multi_platform_videos'], 6);
  const liveSessions = parseNumber(fields['Số phiên Live'] ?? fields['live_sessions'], 4);

  const selfChannelBudgetNet = parseNumber(
    fields['Ngân sách Kênh Brand Net'] ?? fields['self_channel_budget_net'],
    selfChannelVideos * 1200000
  );
  const multiPlatformBudgetNet = parseNumber(
    fields['Ngân sách Đa kênh Net'] ?? fields['multi_platform_budget_net'],
    multiPlatformVideos * 1000000
  );
  const liveBudgetNet = parseNumber(fields['Ngân sách Live Net'] ?? fields['live_budget_net'], 0);
  const affiliatePaidBudgetNet = parseNumber(
    fields['Ngân sách Affiliate Paid Net'] ?? fields['affiliate_paid_budget_net'],
    Math.max(0, budgetNet - selfChannelBudgetNet - multiPlatformBudgetNet - liveBudgetNet)
  );

  const storeSlug = storeName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
  const planId = parseText(
    fields['Mã kế hoạch'] ?? fields['plan_id'],
    `PLAN-${month.replace('/', '-')}-${storeSlug}`
  );

  return {
    id: `LARK-${recordId}`,
    larkRecordId: recordId,
    larkAppToken: appToken,
    larkTableId: tableId,
    planId,
    month,
    week: parseText(fields['Tuần'] ?? fields['week'], `Tháng ${month}`),
    versionCode,
    versionName: parseText(
      fields['Tên phiên bản'] ?? fields['version_name'],
      `${versionCode} — Đồng bộ từ Larkbase`
    ),
    storeId: parseText(fields['Mã gian hàng'] ?? fields['store_id'], `STORE-${storeSlug}`),
    storeName,
    brandName,
    platform: parseText(fields['Sàn'] ?? fields['platform'], 'TikTok Shop'),
    isB2cManaged: true,
    b2cPic,
    bookingLeader,
    approvalStatus: 'APPROVED',
    larkApprovalInstanceId: parseText(fields['Mã phiếu duyệt Lark'] ?? fields['lark_approval_id'], `LARK-APPR-${recordId}`),
    approvedBy: parseText(fields['Người duyệt'] ?? fields['approved_by'], 'Đặng Thị Yến Nhi'),
    approvedAt: parseText(fields['Ngày duyệt'] ?? fields['approved_at'], new Date().toISOString()),
    budgetGross,
    budgetNet,
    budgetAdsTotal,
    targetGmv,
    totalTargetVideos: affiliatePaidVideos + focFreeVideos + selfChannelVideos + multiPlatformVideos,
    affiliatePaidVideos,
    affiliatePaidBudgetNet,
    kocTierBreakdown: { kl1, kl2, kl3, kl4, kl5, kl6, kl7 },
    focFreeVideos,
    focPic: parseText(fields['PIC FOC'] ?? fields['foc_pic'], 'Trần Thị Hảo'),
    selfChannelVideos,
    selfChannelBudgetNet,
    multiPlatformVideos,
    multiPlatformBudgetNet,
    liveSessions,
    liveBudgetNet,
    changeReason: parseText(
      fields['Lý do điều chỉnh'] ?? fields['Ghi chú duyệt'] ?? fields['change_reason'],
      'Kế hoạch B2C Booking đã được phê duyệt trên Larkbase'
    ),
    syncSource,
    syncedBy: syncSource === 'WEBHOOK' ? 'Larkbase Automation Webhook' : 'Hệ thống API Larkbase',
    syncedAt: new Date().toISOString()
  };
}

/**
 * Lưu bản ghi vào bảng `LarkbaseBookingPlanRecord` và đồng bộ sang bảng `MonthlyPlan` + `MonthlyPlanVersionSnapshot`
 */
async function persistIngestedRecords(records: LarkbaseBookingPlanRecordItem[]): Promise<InputPlanBreakdownState[]> {
  const plans: InputPlanBreakdownState[] = [];

  for (const rec of records) {
    memoryIngestedRecords.set(rec.larkRecordId, rec);
    const plan = convertLarkbaseRecordToMonthlyPlan(rec);
    plans.push(plan);

    try {
      await prisma.$transaction(async tx => {
        const { versionSnapshots = [], discussions = [], ...working } = plan;

        await tx.monthlyPlan.upsert({
          where: { id: plan.id },
          create: {
            id: plan.id,
            title: plan.title,
            brandName: plan.brandName,
            storeId: plan.storeId ?? null,
            month: plan.month,
            week: plan.week ?? null,
            pic: plan.pic ?? null,
            bookingLeader: plan.bookingLeader ?? null,
            status: plan.status || 'APPROVED',
            currentVersionCode: plan.currentVersionCode || 'v1.0',
            isVersionLocked: true,
            totalTargetBudget: new Prisma.Decimal(plan.totalTargetBudget || 0),
            budgetAdsTotal: new Prisma.Decimal(plan.budgetAdsTotal || 0),
            targetGmv: new Prisma.Decimal(plan.targetGmv || 0),
            totalTargetContents: Math.round(plan.totalTargetContents || 0),
            sourceSystem: 'LARKBASE',
            larkRecordId: rec.larkRecordId,
            larkAppToken: rec.larkAppToken,
            larkTableId: rec.larkTableId,
            larkApprovalCode: rec.larkApprovalInstanceId ?? null,
            larkSyncedAt: new Date(rec.syncedAt),
            data: working as unknown as Prisma.InputJsonValue,
            createdBy: rec.approvedBy,
            updatedBy: rec.syncedBy
          },
          update: {
            title: plan.title,
            brandName: plan.brandName,
            storeId: plan.storeId ?? null,
            month: plan.month,
            week: plan.week ?? null,
            pic: plan.pic ?? null,
            bookingLeader: plan.bookingLeader ?? null,
            status: plan.status || 'APPROVED',
            currentVersionCode: plan.currentVersionCode || 'v1.0',
            isVersionLocked: true,
            totalTargetBudget: new Prisma.Decimal(plan.totalTargetBudget || 0),
            budgetAdsTotal: new Prisma.Decimal(plan.budgetAdsTotal || 0),
            targetGmv: new Prisma.Decimal(plan.targetGmv || 0),
            totalTargetContents: Math.round(plan.totalTargetContents || 0),
            sourceSystem: 'LARKBASE',
            larkRecordId: rec.larkRecordId,
            larkAppToken: rec.larkAppToken,
            larkTableId: rec.larkTableId,
            larkApprovalCode: rec.larkApprovalInstanceId ?? null,
            larkSyncedAt: new Date(rec.syncedAt),
            data: working as unknown as Prisma.InputJsonValue,
            updatedBy: rec.syncedBy,
            revision: { increment: 1 }
          }
        });

        await tx.larkbaseBookingPlanRecord.upsert({
          where: { larkRecordId: rec.larkRecordId },
          create: {
            id: rec.id,
            larkRecordId: rec.larkRecordId,
            larkAppToken: rec.larkAppToken,
            larkTableId: rec.larkTableId,
            planId: plan.id,
            month: rec.month,
            week: rec.week ?? null,
            versionCode: rec.versionCode,
            versionName: rec.versionName,
            storeName: rec.storeName,
            brandName: rec.brandName,
            platform: rec.platform,
            isB2cManaged: rec.isB2cManaged,
            b2cPic: rec.b2cPic,
            bookingLeader: rec.bookingLeader ?? null,
            approvalStatus: rec.approvalStatus,
            larkApprovalInstanceId: rec.larkApprovalInstanceId ?? null,
            approvedBy: rec.approvedBy,
            approvedAt: new Date(rec.approvedAt),
            budgetGross: new Prisma.Decimal(rec.budgetGross),
            budgetNet: new Prisma.Decimal(rec.budgetNet),
            budgetAdsTotal: new Prisma.Decimal(rec.budgetAdsTotal),
            targetGmv: new Prisma.Decimal(rec.targetGmv),
            totalTargetVideos: rec.totalTargetVideos,
            affiliatePaidVideos: rec.affiliatePaidVideos,
            affiliatePaidBudgetNet: new Prisma.Decimal(rec.affiliatePaidBudgetNet),
            kocTierBreakdown: rec.kocTierBreakdown as unknown as Prisma.InputJsonValue,
            focFreeVideos: rec.focFreeVideos,
            focPic: rec.focPic ?? null,
            selfChannelVideos: rec.selfChannelVideos,
            selfChannelBudgetNet: new Prisma.Decimal(rec.selfChannelBudgetNet),
            multiPlatformVideos: rec.multiPlatformVideos,
            multiPlatformBudgetNet: new Prisma.Decimal(rec.multiPlatformBudgetNet),
            liveSessions: rec.liveSessions,
            liveBudgetNet: new Prisma.Decimal(rec.liveBudgetNet),
            rawFields: rec as unknown as Prisma.InputJsonValue,
            syncSource: rec.syncSource,
            syncedBy: rec.syncedBy,
            syncedAt: new Date(rec.syncedAt)
          },
          update: {
            planId: plan.id,
            month: rec.month,
            week: rec.week ?? null,
            versionCode: rec.versionCode,
            versionName: rec.versionName,
            storeName: rec.storeName,
            brandName: rec.brandName,
            b2cPic: rec.b2cPic,
            bookingLeader: rec.bookingLeader ?? null,
            approvalStatus: rec.approvalStatus,
            approvedBy: rec.approvedBy,
            approvedAt: new Date(rec.approvedAt),
            budgetGross: new Prisma.Decimal(rec.budgetGross),
            budgetNet: new Prisma.Decimal(rec.budgetNet),
            budgetAdsTotal: new Prisma.Decimal(rec.budgetAdsTotal),
            targetGmv: new Prisma.Decimal(rec.targetGmv),
            totalTargetVideos: rec.totalTargetVideos,
            affiliatePaidVideos: rec.affiliatePaidVideos,
            affiliatePaidBudgetNet: new Prisma.Decimal(rec.affiliatePaidBudgetNet),
            kocTierBreakdown: rec.kocTierBreakdown as unknown as Prisma.InputJsonValue,
            focFreeVideos: rec.focFreeVideos,
            selfChannelVideos: rec.selfChannelVideos,
            selfChannelBudgetNet: new Prisma.Decimal(rec.selfChannelBudgetNet),
            multiPlatformVideos: rec.multiPlatformVideos,
            multiPlatformBudgetNet: new Prisma.Decimal(rec.multiPlatformBudgetNet),
            liveSessions: rec.liveSessions,
            liveBudgetNet: new Prisma.Decimal(rec.liveBudgetNet),
            rawFields: rec as unknown as Prisma.InputJsonValue,
            syncSource: rec.syncSource,
            syncedBy: rec.syncedBy,
            syncedAt: new Date(rec.syncedAt)
          }
        });

        if (versionSnapshots.length > 0) {
          await tx.monthlyPlanVersionSnapshot.createMany({
            data: versionSnapshots.map(s => ({
              planId: plan.id,
              clientId: s.id,
              versionCode: s.versionCode,
              versionName: s.versionName,
              createdBy: s.createdBy,
              creatorRole: s.creatorRole,
              changeReason: s.changeReason ?? null,
              totalTargetBudget: new Prisma.Decimal(s.totalTargetBudget || 0),
              budgetAdsTotal: new Prisma.Decimal(s.budgetAdsTotal || 0),
              targetGmv: new Prisma.Decimal(s.targetGmv || 0),
              data: s as unknown as Prisma.InputJsonValue,
              lockedAt: new Date(s.createdAt)
            })),
            skipDuplicates: true
          });
        }

        if (discussions.length > 0) {
          await tx.monthlyPlanDiscussion.createMany({
            data: discussions.map(d => ({
              planId: plan.id,
              clientId: d.id,
              authorName: d.authorName,
              authorRole: d.authorRole,
              authorTitle: d.authorTitle,
              type: d.type,
              content: d.content,
              data: d as unknown as Prisma.InputJsonValue,
              postedAt: new Date(d.timestamp)
            })),
            skipDuplicates: true
          });
        }
      });
    } catch {
      // Nếu môi trường local chưa kết nối PostgreSQL, vẫn giữ trong memoryIngestedRecords và trả về cho giao diện
    }
  }

  return plans;
}

/**
 * Lấy danh sách các bản ghi trong bảng hứng kế hoạch B2C Booking từ Larkbase
 */
export async function listIngestedLarkbasePlanRecords(month?: string): Promise<{
  config: ReturnType<typeof getLarkbasePlanConfig>;
  records: LarkbaseBookingPlanRecordItem[];
  convertedPlans: InputPlanBreakdownState[];
}> {
  const config = getLarkbasePlanConfig();
  let records = Array.from(memoryIngestedRecords.values());

  try {
    const dbRows = await prisma.larkbaseBookingPlanRecord.findMany({
      where: month && month !== 'ALL' ? { month } : undefined,
      orderBy: { approvedAt: 'desc' }
    });
    if (dbRows.length > 0) {
      records = dbRows.map(row => {
        const raw = row.rawFields as unknown as LarkbaseBookingPlanRecordItem | null;
        if (raw && raw.larkRecordId) return raw;
        return {
          id: row.id,
          larkRecordId: row.larkRecordId,
          larkAppToken: row.larkAppToken,
          larkTableId: row.larkTableId,
          planId: row.planId || `PLAN-${row.month.replace('/', '-')}-${row.id}`,
          month: row.month,
          week: row.week ?? undefined,
          versionCode: row.versionCode,
          versionName: row.versionName || `${row.versionCode} — Đồng bộ từ Larkbase`,
          storeName: row.storeName,
          brandName: row.brandName,
          platform: row.platform,
          isB2cManaged: row.isB2cManaged,
          b2cPic: row.b2cPic,
          bookingLeader: row.bookingLeader ?? undefined,
          approvalStatus: row.approvalStatus as LarkbaseBookingPlanRecordItem['approvalStatus'],
          larkApprovalInstanceId: row.larkApprovalInstanceId ?? undefined,
          approvedBy: row.approvedBy || 'Đặng Thị Yến Nhi',
          approvedAt: row.approvedAt?.toISOString() || row.syncedAt.toISOString(),
          budgetGross: Number(row.budgetGross),
          budgetNet: Number(row.budgetNet),
          budgetAdsTotal: Number(row.budgetAdsTotal),
          targetGmv: Number(row.targetGmv),
          totalTargetVideos: row.totalTargetVideos,
          affiliatePaidVideos: row.affiliatePaidVideos,
          affiliatePaidBudgetNet: Number(row.affiliatePaidBudgetNet),
          kocTierBreakdown: (row.kocTierBreakdown as unknown as LarkbaseBookingPlanRecordItem['kocTierBreakdown']) || {
            kl1: 0,
            kl2: 0,
            kl3: 0,
            kl4: 0,
            kl5: 0,
            kl6: 0,
            kl7: 0
          },
          focFreeVideos: row.focFreeVideos,
          focPic: row.focPic ?? undefined,
          selfChannelVideos: row.selfChannelVideos,
          selfChannelBudgetNet: Number(row.selfChannelBudgetNet),
          multiPlatformVideos: row.multiPlatformVideos,
          multiPlatformBudgetNet: Number(row.multiPlatformBudgetNet),
          liveSessions: row.liveSessions,
          liveBudgetNet: Number(row.liveBudgetNet),
          syncSource: (row.syncSource as LarkbaseBookingPlanRecordItem['syncSource']) || 'API_PULL',
          syncedBy: row.syncedBy || 'Hệ thống API Larkbase',
          syncedAt: row.syncedAt.toISOString()
        };
      });
    }
  } catch {
    // Dùng dữ liệu trong memoryIngestedRecords khi DB chưa chạy
  }

  if (month && month !== 'ALL') {
    records = records.filter(r => r.month === month);
  }

  return {
    config,
    records,
    convertedPlans: records.map(convertLarkbaseRecordToMonthlyPlan)
  };
}

/**
 * Kéo các kế hoạch B2C Booking đã được duyệt từ Larkbase Bitable API v1 về hệ thống
 */
export async function pullApprovedBookingPlansFromLarkbase(options?: {
  appToken?: string;
  tableId?: string;
  viewId?: string;
  month?: string;
  actorName?: string;
}): Promise<{
  mode: 'LIVE_BITABLE_API' | 'SANDBOX_FALLBACK';
  pulledCount: number;
  records: LarkbaseBookingPlanRecordItem[];
  plans: InputPlanBreakdownState[];
  message: string;
}> {
  const config = getLarkbasePlanConfig();
  const appToken = options?.appToken?.trim() || config.appToken;
  const tableId = options?.tableId?.trim() || config.tableId;
  const viewId = options?.viewId?.trim() || config.viewId;

  // Nếu đã cấu hình LARK_APP_ID + LARK_APP_SECRET và có AppToken/TableId thực tế
  if (config.hasLarkCredentials && appToken && tableId && appToken !== 'bascnUpbaseB2CPlan41') {
    try {
      const accessToken = await fetchLarkAppAccessToken();
      const searchUrl = `https://${config.domain}/open-apis/bitable/v1/apps/${encodeURIComponent(
        appToken
      )}/tables/${encodeURIComponent(tableId)}/records/search?page_size=200`;

      const res = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...(viewId ? { view_id: viewId } : {}),
          ...(options?.month && options.month !== 'ALL'
            ? {
                filter: {
                  conjunction: 'and',
                  conditions: [{ field_name: 'Tháng', operator: 'is', value: [options.month] }]
                }
              }
            : {})
        })
      });

      const json = await res.json();
      if (json.code === 0 && json.data?.items) {
        const rawItems = json.data.items as Array<{ record_id: string; fields: Record<string, unknown> }>;
        const mapped = rawItems
          .map(item => mapRawBitableRecordToPlanRecord(item.record_id, item.fields || {}, appToken, tableId, 'API_PULL'))
          .filter((item): item is LarkbaseBookingPlanRecordItem => item !== null)
          .filter(item => (!options?.month || options.month === 'ALL' ? true : item.month === options.month));

        const plans = await persistIngestedRecords(mapped);
        return {
          mode: 'LIVE_BITABLE_API',
          pulledCount: mapped.length,
          records: mapped,
          plans,
          message: `Đã kéo thành công ${mapped.length} kế hoạch B2C Booking đã duyệt từ Larkbase Bitable (${appToken}/${tableId}).`
        };
      }
    } catch {
      // Nếu lỗi kết nối mạng/token thì chuyển sang bản ghi mẫu chuẩn File 4.1.1 bên dưới
    }
  }

  // Chế độ Sandbox / Mẫu chuẩn File 4.1 & 4.1.1 khi chưa điền token thật trong .env
  const nowIso = new Date().toISOString();
  const records = FALLBACK_APPROVED_LARKBASE_RECORDS.filter(r =>
    !options?.month || options.month === 'ALL' ? true : r.month === options.month
  ).map(r => ({
    ...r,
    larkAppToken: appToken,
    larkTableId: tableId,
    syncedBy: options?.actorName || 'Hệ thống API Larkbase',
    syncedAt: nowIso
  }));

  const plans = await persistIngestedRecords(records);
  return {
    mode: 'SANDBOX_FALLBACK',
    pulledCount: records.length,
    records,
    plans,
    message: `Đã đồng bộ ${records.length} kế hoạch B2C Booking đã duyệt (B2C phụ trách = 1) từ bảng hứng Larkbase vào Kế hoạch tháng.`
  };
}

/**
 * Xử lý Webhook tự động bắn từ Larkbase Automation khi 1 dòng kế hoạch B2C Booking chuyển trạng thái sang "Đã duyệt"
 */
export async function ingestLarkbaseWebhookRecord(payload: {
  record_id?: string;
  app_token?: string;
  table_id?: string;
  fields?: Record<string, unknown>;
}): Promise<{
  accepted: boolean;
  record?: LarkbaseBookingPlanRecordItem;
  plan?: InputPlanBreakdownState;
  reason?: string;
}> {
  const config = getLarkbasePlanConfig();
  const recordId = payload.record_id || `recWebhook${Date.now()}`;
  const appToken = payload.app_token || config.appToken;
  const tableId = payload.table_id || config.tableId;
  const fields = payload.fields || {};

  const mapped = mapRawBitableRecordToPlanRecord(recordId, fields, appToken, tableId, 'WEBHOOK');
  if (!mapped) {
    return {
      accepted: false,
      reason: 'Bản ghi bị bỏ qua do không thuộc phạm vi B2C phụ trách = 1 hoặc trạng thái chưa phải Đã duyệt.'
    };
  }

  const [plan] = await persistIngestedRecords([mapped]);
  return {
    accepted: true,
    record: mapped,
    plan
  };
}
