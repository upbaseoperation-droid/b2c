import { InputPlanBreakdownState, InputPlanRowItem, SalaryGrade, PlanVersionSnapshot, MultiPartySignOff, BrandDetail, BrandMonthlyPlanItem, CampaignItem, isCampaignActiveInMonth, getCampaignPhaseForMonth } from './types';
import { 
  INITIAL_INPUT_PLAN_ITEMS, 
  autoBalancePlanItems, 
  MOCK_PLAN_SCENARIOS 
} from './inputPlanDefaults';
import { DEFAULT_CONTENT_PILLARS } from './selfChannelData';
import { REAL_MONTHLY_PLANS_OCT_2026 } from './realB2cPlanData';
import { REAL_B2C_42_BRANDS } from './realB2cBrandsData';
import { INITIAL_CAMPAIGNS } from './mockData';

/** Tìm chiến dịch (Campaign) đang chạy của một Thương hiệu trong chu kỳ tháng ('YYYY/MM') */
export function findActiveCampaignForBrandInMonth(
  brandName: string,
  month: string,
  campaigns: CampaignItem[] = INITIAL_CAMPAIGNS
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
      confirmedBy: plan.growthPic || 'Trần Thị Ánh',
      note: 'Giao hạn mức ngân sách & chỉ tiêu tháng'
    },
    booking: {
      confirmed: plan.status !== 'DRAFT',
      confirmedBy: plan.pic || 'Chuyên viên B2C',
      note: 'Phân rã 4 đầu việc B2C (KOC trả phí, FOC, Kênh tự xây, Đa sàn)'
    },
    media: {
      confirmed: ['PRE_APPROVED', 'PENDING_APPROVAL', 'LEAD_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      confirmedBy: plan.mediaPic || 'Phan Thành Đạt',
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
        createdBy: plan.growthPic || plan.pic || 'Growth / B2C',
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
      createdBy: plan.growthPic || 'Growth PIC',
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

  {
    id: 'PLAN-2026-10-KUTIESKIN',
    title: 'Kế Hoạch B2C Tháng 10 - Kutieskin (Affiliate 150M + Self Channel 50M)',
    brandName: 'Kutieskin',
    storeId: 'ST-SO0001',
    storeName: 'Kutieskin Mama_TikTok_E2E-S',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Khánh Vy',
    bookingLeader: undefined,
    hasBookingLeader: false,
    primaryPic: 'Khánh Vy',
    assignedMembers: ['Khánh Vy', 'Trần Minh Đức', 'Nguyễn Quỳnh Trang'],
    leaderApprovalStatus: 'KHÔNG_ÁP_DỤNG',
    leaderApprovedBy: 'Đặng Thị Yến Nhi (Trưởng Phòng)',
    leaderApprovedAt: '2026-09-30T17:00:00Z',
    leaderNotes: 'Gian hàng do chuyên viên phụ trách độc lập (không có leader), trình duyệt trực tiếp lên Trưởng Phòng.',
    growthPic: 'Trần Thị Ánh (Growth PIC)',
    mediaPic: 'Phan Thành Đạt (Media PIC)',
    totalTargetBudget: 200000000, // 200 Tr
    budgetAdsTotal: 50000000, // Gói Ads tổng 50 Tr
    budgetAffiliate: 150000000, // 150 Tr
    budgetSelfChannel: 50000000, // 50 Tr
    targetAffiliateContents: 85,
    targetSelfChannelContents: 40,
    totalTargetContents: 125, // 85 + 40
    targetGmv: 1200000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 132500000,
    deliveredContents: 76,
    actualGmv: 890000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-10-01T10:00:00Z',
    approvedBy: 'Vân Ngọc (Trưởng Phòng)',
    approvedAt: '2026-10-02T09:00:00Z',
    notes: 'Kế hoạch phân bổ: 150M Affiliate KOC theo cấp bậc lương KL1-KL4 & 50M Self Channel cho 40 video theo 4 Content Pillars. Media nhận trọn gói Ads 50M.',
    createdAt: '2026-09-28T09:00:00Z',
    updatedAt: '2026-10-07T14:30:00Z',
    items: createPlanItemsForScenario(150000000, 85, 'BALANCED', 'Khánh Vy'),
    selfChannelPillars: DEFAULT_CONTENT_PILLARS,
    multiPartySignOff: {
      growth: {
        confirmed: true,
        confirmedBy: 'Trần Thị Ánh',
        confirmedAt: '2026-09-30T10:00:00Z',
        note: 'Đã giao trần ngân sách 200 triệu và hạn mức Ads tổng 50 triệu.'
      },
      booking: {
        confirmed: true,
        confirmedBy: 'Khánh Vy',
        confirmedAt: '2026-10-01T09:00:00Z',
        note: 'Đã phân rã chi tiết 85 video Affiliate KOC và 40 video Self Channel theo 4 Content Pillars.'
      },
      media: {
        confirmed: true,
        confirmedBy: 'Phan Thành Đạt',
        confirmedAt: '2026-10-01T14:30:00Z',
        targetRoas: 4.8,
        acceptedAdsBudget: 50000000,
        note: 'Media đã nhận gói Ads tổng 50M, cam kết ROAS tối thiểu 4.8x và sẽ vít Spark Ads cho top video KOC chuyển đổi tốt.'
      },
      leadB2c: {
        confirmed: true,
        confirmedBy: 'Vân Ngọc (Trưởng Phòng)',
        confirmedAt: '2026-10-02T09:00:00Z',
        note: 'Phê duyệt cơ cấu 3 bên và chốt phiên bản v1.0.'
      }
    },
    discussions: [
      {
        id: 'DISC-KUTI-1',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth PIC / Chiến lược & PnL',
        content: 'Tổng ngân sách nhãn hàng chốt 200 triệu cho tháng 10. Giao B2C trần booking 150M và giao Media gói Ads tổng 50M để kéo số Mega 10.10. Mục tiêu NMV tối thiểu 1.2 Tỷ.',
        type: 'BUDGET_ADJUST',
        timestamp: '2026-09-28T09:30:00Z',
        tags: ['Ngân Sách', 'Affiliate', 'Media Ads']
      },
      {
        id: 'DISC-KUTI-2',
        authorName: 'Khánh Vy',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist PIC',
        content: 'B2C đã phân rã xong: 150M Affiliate chia cho 85 Creator (KL1-KL4) và 50M Self Channel chia đều cho 4 Content Pillars (40 video qua CTV Hub). Cơ cấu khớp 100% trần chi phí.',
        type: 'COMMENT',
        timestamp: '2026-09-29T14:00:00Z',
        tags: ['Content Pillar', 'CTV Hub']
      },
      {
        id: 'DISC-KUTI-3',
        authorName: 'Phan Thành Đạt',
        authorRole: 'MEDIA',
        authorTitle: 'Media PIC / Quảng cáo & Ads',
        content: 'Media xác nhận nhận gói Tổng Ads 50M (không phân chia kênh). Media sẽ dùng 35M cho Spark Ads vít mạnh các video KOC có chuyển đổi cao và 15M cho Ads chuyển đổi kênh Brand. Cam kết ROAS đạt 4.8x.',
        type: 'COMMENT',
        timestamp: '2026-09-30T16:20:00Z',
        tags: ['Media Ads', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-KUTI-4',
        authorName: 'Vân Ngọc',
        authorRole: 'LEAD',
        authorTitle: 'Trưởng Phòng B2C',
        content: 'Trưởng phòng đã rà soát toàn bộ lịch sử trao đổi của Growth, Media và Booking. Cơ cấu 3 bên rất chặt chẽ, phê duyệt chính thức và đóng băng kế hoạch phiên bản v1.0.',
        type: 'FINAL_APPROVAL_PASS',
        timestamp: '2026-10-02T09:00:00Z',
        tags: ['Phê Duyệt Chính Thức', 'Đóng Băng Phiên Bản']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-FRESH',
    title: 'Kế Hoạch B2C Tháng 10 - Fresh E2E Campaign W41',
    brandName: 'Fresh_TikTok_E2E-C',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
    growthPic: 'Trần Thị Ánh (Growth PIC)',
    mediaPic: 'Phan Thành Đạt (Media PIC)',
    totalTargetBudget: 150000000,
    budgetAdsTotal: 35000000, // Gói Ads tổng 35 Tr
    totalTargetContents: 76,
    targetGmv: 920000000,
    cancellationRate: 0.08,
    strategyPreset: 'GMV_MAX',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 98000000,
    deliveredContents: 48,
    actualGmv: 610000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-10-01T10:00:00Z',
    approvedBy: 'Vân Ngọc (Trưởng Phòng)',
    approvedAt: '2026-10-02T09:00:00Z',
    notes: 'Trọng tâm đẩy dòng Sữa Rửa Mặt Đậu Nành & Nước Hoa Hồng qua mạng lưới Creator KL1-KL4 kết hợp Shopee Video Reup. Media nhận gói Ads tổng 35M.',
    createdAt: '2026-09-28T09:00:00Z',
    updatedAt: '2026-10-06T14:30:00Z',
    items: MOCK_PLAN_SCENARIOS[0].state.items,
    multiPartySignOff: {
      growth: {
        confirmed: true,
        confirmedBy: 'Trần Thị Ánh',
        confirmedAt: '2026-09-29T10:15:00Z',
        note: 'Ngân sách trần 150M, gói Ads tổng 35M, target GMV 920M.'
      },
      booking: {
        confirmed: true,
        confirmedBy: 'Đặng Mai Hà Linh',
        confirmedAt: '2026-09-30T14:30:00Z',
        note: 'Đã phân rã 76 video cho TikTok Shop, Shopee và Livestream.'
      },
      media: {
        confirmed: true,
        confirmedBy: 'Phan Thành Đạt',
        confirmedAt: '2026-10-01T11:00:00Z',
        targetRoas: 5.2,
        acceptedAdsBudget: 35000000,
        note: 'Đã nhận gói Ads tổng 35M, cam kết ROAS tối thiểu 5.2x.'
      },
      leadB2c: {
        confirmed: true,
        confirmedBy: 'Vân Ngọc (Trưởng Phòng)',
        confirmedAt: '2026-10-02T09:00:00Z',
        note: 'Phê duyệt chính thức và đóng băng kế hoạch tháng 10 Fresh.'
      }
    },
    discussions: [
      {
        id: 'DISC-FRESH-1',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth PIC / Chiến lược & PnL',
        content: 'Chào Hà Linh và Đạt, ngân sách tháng 10 nhãn Fresh chốt trần 150M, trong đó gói Ads tổng giao Media là 35M. Nhãn yêu cầu đẩy mạnh combo Sữa Rửa Mặt Đậu Nành và Nước Hoa Hồng. Kỳ vọng GMV tối thiểu 920M để đạt ROI trên 6.0x.',
        type: 'COMMENT',
        timestamp: '2026-09-29T10:15:00Z',
        tags: ['Ngân Sách', 'HeroSKU', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-FRESH-2',
        authorName: 'Đặng Mai Hà Linh',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist PIC',
        content: 'Dạ chị Ánh, em đã phân rã xong 76 video cho W41. Trong đó TikTok Shop chiếm 45 video (58M), Shopee Video 25 video (30M) và 2 ca Livestream độc quyền (35M). Dự phòng định mức hủy đúng 8%. Nhờ anh Đạt Media và chị Ánh xem qua.',
        type: 'COMMENT',
        timestamp: '2026-09-30T14:30:00Z',
        tags: ['TikTok Shop', 'Shopee Video', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-FRESH-3',
        authorName: 'Phan Thành Đạt',
        authorRole: 'MEDIA',
        authorTitle: 'Media PIC / Quảng cáo & Ads',
        content: 'Media đã kiểm tra: Với dàn 45 video TikTok Shop của Hà Linh, team Media sẽ chọn ra 8 video có hook giữ chân tốt nhất để chạy Spark Ads từ ngày 08/10. Gói Ads 35M đảm bảo cam kết ROAS tối thiểu 5.2x cho nhãn.',
        type: 'COMMENT',
        timestamp: '2026-10-01T10:30:00Z',
        tags: ['Media Ads', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-FRESH-4',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth PIC / Chiến lược & PnL',
        content: 'Chị đã kiểm tra cơ cấu phân rã và cam kết ROAS từ Media: Tỷ lệ phân bổ kênh hợp lý, CIR dự kiến 16.3% an toàn. Xác nhận SƠ DUYỆT ĐẠT để trình Trưởng phòng duyệt chính thức.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T14:00:00Z',
        tags: ['Sơ Duyệt Đạt', 'CIR']
      },
      {
        id: 'DISC-FRESH-5',
        authorName: 'Vân Ngọc',
        authorRole: 'LEAD',
        authorTitle: 'Trưởng Phòng B2C',
        content: 'Trưởng phòng phê duyệt chính thức kế hoạch tháng 10 của Fresh. Team Booking tiến hành ký cam kết creator và Media chuẩn bị tài khoản quảng cáo giải ngân.',
        type: 'FINAL_APPROVAL_PASS',
        timestamp: '2026-10-02T09:00:00Z',
        tags: ['Phê Duyệt Chính Thức']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-COCOON',
    title: 'Kế Hoạch B2C Tháng 10 - Cocoon Cà Phê Đắk Lắk & Bưởi',
    brandName: 'Cocoon',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Phương Thảo',
    growthPic: 'Trần Thị Ánh (Growth PIC)',
    mediaPic: 'Phan Thành Đạt (Media PIC)',
    totalTargetBudget: 180000000,
    budgetAdsTotal: 40000000,
    totalTargetContents: 85,
    targetGmv: 1100000000,
    cancellationRate: 0.08,
    strategyPreset: 'BRAND_PUSH',
    status: 'PENDING_PRE_APPROVAL',
    statusLabel: 'Chờ Growth Sơ Duyệt',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Chiến dịch mùa hanh khô, đẩy mạnh Tẩy da chết Body Cà Phê và Nước dưỡng tóc Tinh dầu Bưởi. Cần book 1 KOL KL6.',
    createdAt: '2026-10-04T08:30:00Z',
    updatedAt: '2026-10-07T11:00:00Z',
    items: createPlanItemsForScenario(180000000, 85, 'BRAND_PUSH', 'Phương Thảo'),
    multiPartySignOff: {
      growth: {
        confirmed: true,
        confirmedBy: 'Trần Thị Ánh',
        confirmedAt: '2026-10-04T09:00:00Z',
        note: 'Đã giao trần ngân sách 180M và gói Ads tổng 40M.'
      },
      booking: {
        confirmed: true,
        confirmedBy: 'Phương Thảo',
        confirmedAt: '2026-10-07T10:45:00Z',
        note: 'Đã phân rã chi tiết 85 video đẩy Tẩy da chết Cà Phê Đắk Lắk và Dưỡng tóc Bưởi.'
      },
      media: {
        confirmed: false,
        confirmedBy: 'Phan Thành Đạt',
        targetRoas: 4.5,
        acceptedAdsBudget: 40000000,
        note: 'Đang rà soát góc video kịch bản và định mức ROAS 4.5x.'
      },
      leadB2c: {
        confirmed: false
      }
    },
    discussions: [
      {
        id: 'DISC-COCOON-1',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Chào chị Ánh, em gửi phân rã dự thảo W42 cho Cocoon: Ngân sách trần 180M, chỉ tiêu 85 video, target GMV 1.1 Tỷ. Em đã cơ cấu 1 KOL KL6 (40M) và 35 video Shopee Video Reup 0đ để kéo CIR.',
        type: 'COMMENT',
        timestamp: '2026-10-05T14:15:00Z',
        tags: ['Ngân Sách', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-COCOON-2',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth PIC / Chiến lược & PnL',
        content: 'Thảo ơi, dòng Tẩy da chết Cà Phê Đắk Lắk đang là hero SKU mùa này. Chị thấy tỷ trọng ngân sách TikTok Shop đang hơi thấp (42%), trong khi tuần Mega 10.10 TikTok đang trợ giá voucher 18%. Em cân nhắc tăng slot KL3-KL4 TikTok Shop lên khoảng 55-60% ngân sách được không?',
        type: 'COMMENT',
        timestamp: '2026-10-06T09:30:00Z',
        tags: ['TikTok Shop', 'HeroSKU', 'Ngân Sách']
      },
      {
        id: 'DISC-COCOON-3',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Dạ em đã cập nhật lại cơ cấu: Tăng thêm 6 creator KL3 bên TikTok Shop và giảm bớt 2 ca live phụ để giữ đúng trần 180M. GMV dự kiến tăng lên 1.18 Tỷ. Em đã gửi sơ duyệt, nhờ chị Ánh thẩm định và bấm Sơ Duyệt Thông Qua giúp em nhé!',
        type: 'COMMENT',
        timestamp: '2026-10-07T10:45:00Z',
        tags: ['TikTok Shop', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-COCOON-4',
        authorName: 'Phan Thành Đạt',
        authorRole: 'MEDIA',
        authorTitle: 'Media PIC / Quảng cáo & Ads',
        content: 'Media đã xem qua cơ cấu: Đồng ý với chị Ánh về việc tăng slot TikTok Shop. Gói Ads tổng 40M này team Media sẽ dồn vào ngày Mega 10.10 và Payday 15.10 để tối ưu chỉ số ROAS sàn. Đạt chuẩn bị bấm xác nhận nhận gói Ads.',
        type: 'COMMENT',
        timestamp: '2026-10-07T11:20:00Z',
        tags: ['Media Ads', 'TikTok Shop']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-FACEREPUBLIC',
    title: 'Kế Hoạch Tối Ưu Chi Phí & Doanh Số - Face Republic W41',
    brandName: 'Face Republic_TikTok_E2E-O',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Khánh Vy',
    growthPic: 'Trần Thị Ánh (Growth PIC)',
    mediaPic: 'Phan Thành Đạt (Media PIC)',
    totalTargetBudget: 70000000,
    budgetAdsTotal: 15000000,
    totalTargetContents: 54,
    targetGmv: 480000000,
    cancellationRate: 0.08,
    strategyPreset: 'COST_SAVER',
    status: 'PRE_APPROVED',
    statusLabel: 'Sơ Duyệt Đạt (Chờ Phê Duyệt)',
    spentBudget: 42000000,
    deliveredContents: 32,
    actualGmv: 310000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-10-06T15:30:00Z',
    preApprovalNotes: 'Đồng ý cơ cấu ngân sách 70M tối ưu, CIR 14.5%, GMV mục tiêu 480M khả thi.',
    notes: 'Ngân sách tối ưu 70M, tập trung KOC KL1-KL3 review chân thực kết hợp Shopee Video Reup. Media gói Ads 15M.',
    createdAt: '2026-10-01T11:20:00Z',
    updatedAt: '2026-10-06T09:45:00Z',
    items: MOCK_PLAN_SCENARIOS[1]?.state?.items || createPlanItemsForScenario(70000000, 54, 'COST_SAVER', 'Khánh Vy'),
    multiPartySignOff: {
      growth: {
        confirmed: true,
        confirmedBy: 'Trần Thị Ánh',
        confirmedAt: '2026-10-06T15:30:00Z',
        note: 'Đã giao trần ngân sách 70M và gói Ads tổng 15M.'
      },
      booking: {
        confirmed: true,
        confirmedBy: 'Khánh Vy',
        confirmedAt: '2026-10-05T10:00:00Z',
        note: 'Đã phân rã 54 video tập trung KOC KL1-KL3.'
      },
      media: {
        confirmed: true,
        confirmedBy: 'Phan Thành Đạt',
        confirmedAt: '2026-10-06T11:00:00Z',
        targetRoas: 5.5,
        acceptedAdsBudget: 15000000,
        note: 'Nhận gói Ads 15M cho Spark Ads, cam kết ROAS 5.5x.'
      },
      leadB2c: {
        confirmed: false
      }
    },
    discussions: [
      {
        id: 'DISC-FACE-1',
        authorName: 'Khánh Vy',
        authorRole: 'BOOKING',
        authorTitle: 'Senior Booking Specialist',
        content: 'Gửi chị Ánh và anh Đạt phương án Cost Saver 70M cho Face Republic, tập trung phủ KOC KL1-KL3 review chân thực, chi phí trung bình 1.2M/video.',
        type: 'COMMENT',
        timestamp: '2026-10-05T10:00:00Z',
        tags: ['Ngân Sách', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-FACE-2',
        authorName: 'Phan Thành Đạt',
        authorRole: 'MEDIA',
        authorTitle: 'Media PIC / Quảng cáo & Ads',
        content: 'Media xác nhận gói Ads 15M. Do đây là chiến dịch tối ưu chi phí nên Media sẽ chỉ chạy Spark Ads cho 5 video đạt tỷ lệ giữ chân người xem trên 3 giây cao nhất. Cam kết ROAS đạt 5.5x.',
        type: 'COMMENT',
        timestamp: '2026-10-06T11:00:00Z',
        tags: ['Media Ads', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-FACE-3',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth PIC / Chiến lược & PnL',
        content: 'Chị đồng ý với cơ cấu này. CIR đạt 14.5% rất đẹp, tỷ lệ hoàn 8% được kiểm soát tốt. Chị đã bấm [Sơ Duyệt Đạt], Vy trình Trưởng phòng Ngọc duyệt chính thức nhé.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-06T15:30:00Z',
        tags: ['Sơ Duyệt Đạt', 'CIR']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-COMEM',
    title: 'Chiến Dịch Tháng 10 - Cỏ Mềm Mỹ Phẩm Lành & Thật',
    brandName: 'Cỏ Mềm',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 220000000,
    totalTargetContents: 95,
    targetGmv: 1350000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 145000000,
    deliveredContents: 62,
    actualGmv: 890000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-10-01T16:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-10-02T10:00:00Z',
    notes: 'Đẩy mạnh Son dưỡng Gạo, Bọt rửa mặt Tơ Tằm. Phủ mạnh tệp Mẹ Bỉm sữa và Gen Z văn phòng.',
    createdAt: '2026-09-29T10:15:00Z',
    updatedAt: '2026-10-05T16:00:00Z',
    items: createPlanItemsForScenario(220000000, 95, 'BALANCED', 'Đặng Mai Hà Linh'),
    discussions: [
      {
        id: 'DISC-COMEM-1',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Cỏ Mềm đợt này chốt ngân sách 220M, push mạnh son dưỡng Gạo đón đợt không khí lạnh.',
        type: 'COMMENT',
        timestamp: '2026-09-30T10:00:00Z',
        tags: ['Ngân Sách', 'HeroSKU']
      },
      {
        id: 'DISC-COMEM-2',
        authorName: 'Đặng Mai Hà Linh',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Đã hoàn thành phân rã 95 nội dung, tỷ trọng KOC mẹ bỉm chiếm 60%.',
        type: 'COMMENT',
        timestamp: '2026-10-01T14:00:00Z',
        tags: ['Cơ Cấu Creator']
      },
      {
        id: 'DISC-COMEM-3',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Sơ duyệt đạt. Cơ cấu đẹp, đủ điều kiện trình duyệt.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T16:00:00Z',
        tags: ['Sơ Duyệt Đạt']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-SENKA',
    title: 'Mega Campaign Chống Nắng & Làm Sạch - Senka W42',
    brandName: 'Senka_TikTok_E2E-C',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Nguyễn Thu Trang',
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
    totalTargetBudget: 250000000,
    totalTargetContents: 115,
    targetGmv: 1450000000,
    cancellationRate: 0.08,
    strategyPreset: 'MEGA_SALE',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 175000000,
    deliveredContents: 78,
    actualGmv: 1020000000,
    preApprovedBy: 'Hoàng Quốc Bảo',
    preApprovedAt: '2026-10-01T11:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-10-01T17:00:00Z',
    notes: 'Chiến dịch ra mắt Kem Chống Nắng Senka Thế Hệ Mới. Phối hợp 1 Đại sứ KL7 và 2 Ca live độc quyền.',
    createdAt: '2026-09-30T14:00:00Z',
    updatedAt: '2026-10-07T10:15:00Z',
    items: MOCK_PLAN_SCENARIOS[2]?.state?.items || createPlanItemsForScenario(250000000, 115, 'MEGA_SALE', 'Nguyễn Thu Trang'),
    discussions: [
      {
        id: 'DISC-SENKA-1',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Senka đẩy 250M cho đợt ra mắt KCN mới, cần kiểm tra kỹ năng lực ca live độc quyền.',
        type: 'COMMENT',
        timestamp: '2026-10-01T09:00:00Z',
        tags: ['Ngân Sách', 'Livestream']
      },
      {
        id: 'DISC-SENKA-2',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Đã thẩm định xong. Sơ duyệt đạt.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T11:00:00Z',
        tags: ['Sơ Duyệt Đạt']
      }
    ]
  },

  // =========================================================================
  // THÁNG 11/2026 (KẾ HOẠCH SẮP TỚI - CÓ KẾ HOẠCH BỊ YÊU CẦU HIỆU CHỈNH)
  // =========================================================================
  {
    id: 'PLAN-2026-11-SUNPLAY',
    title: 'Chiến Dịch Mega Sale 11.11 - Sunplay Chống Nắng Da Dầu',
    brandName: 'Sunplay',
    month: '2026/11',
    week: 'W45 [02.11 - 08.11]',
    pic: 'Trần Minh Đức',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 160000000,
    totalTargetContents: 75,
    targetGmv: 950000000,
    cancellationRate: 0.08,
    strategyPreset: 'MEGA_SALE',
    status: 'REVISION_REQUESTED',
    statusLabel: 'Yêu Cầu Hiệu Chỉnh',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    revisionNotes: 'Tỷ trọng Shopee Video đang để 0đ trong khi tháng 11 Shopee có hỗ trợ traffic mạnh cho hashtag #ChongNang. Đức phân rã lại tối thiểu 15 video Shopee và điều chỉnh ngân sách.',
    notes: 'Chuẩn bị giỏ hàng và danh sách KOC sớm trước 3 tuần để đón đầu lượng traffic Mega Sale 11.11.',
    createdAt: '2026-10-06T15:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
    items: createPlanItemsForScenario(160000000, 75, 'MEGA_SALE', 'Trần Minh Đức'),
    discussions: [
      {
        id: 'DISC-SUNPLAY-1',
        authorName: 'Trần Minh Đức',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Em gửi bản phân rã dự thảo 160M cho Sunplay chiến dịch 11.11, dồn toàn lực vào TikTok Shop 75 video.',
        type: 'COMMENT',
        timestamp: '2026-10-06T16:00:00Z',
        tags: ['Ngân Sách', 'TikTok Shop']
      },
      {
        id: 'DISC-SUNPLAY-2',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Chị review thấy kênh Shopee Video đang để 0đ là chưa tối ưu, tháng 11 Shopee có hỗ trợ traffic mạnh cho hashtag #ChongNang. Đức phân rã lại tối thiểu 15 video Shopee và điều chỉnh ngân sách sang đa sàn nhé.',
        type: 'REVISION_REQUEST',
        timestamp: '2026-10-07T09:30:00Z',
        tags: ['Yêu Cầu Hiệu Chỉnh', 'Shopee Video']
      }
    ]
  },
  {
    id: 'PLAN-2026-11-COCOON',
    title: 'Chiến Dịch Chăm Sóc Da Mùa Đông 11.11 - Cocoon',
    brandName: 'Cocoon',
    month: '2026/11',
    week: 'W46 [09.11 - 15.11]',
    pic: 'Phương Thảo',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 140000000,
    totalTargetContents: 70,
    targetGmv: 880000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'DRAFT',
    statusLabel: 'Bản Nháp (Đang Lập)',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Kế hoạch dự thảo cho tuần siêu sale 11.11. Dự kiến đẩy Combo Dưỡng Ẩm Chuyên Sâu.',
    createdAt: '2026-10-07T09:30:00Z',
    updatedAt: '2026-10-07T09:30:00Z',
    items: createPlanItemsForScenario(140000000, 70, 'BALANCED', 'Phương Thảo'),
    discussions: [
      {
        id: 'DISC-COCOON11-1',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Em đang lên khung phân rã 140M cho tuần 46, dự kiến đẩy mạnh Combo dưỡng ẩm chuyên sâu Cocoon.',
        type: 'COMMENT',
        timestamp: '2026-10-07T09:35:00Z',
        tags: ['Ngân Sách']
      }
    ]
  },

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
    growthPic: 'Vũ Thùy Linh (Growth Lead)',
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
    growthPic: 'Trần Thị Ánh (Growth Manager)',
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
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
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
    growthPic: 'Vũ Thùy Linh (Growth Lead)',
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
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
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
  const multiRows = items.filter(it => ['SHOPEE', 'FACEBOOK', 'INSTAGRAM', 'THREADS'].includes(it.channel));

  const affSlices = groupRows(affRows, 'BOOKING', primaryPic, bookingLeader);
  const focSlices = groupRows(focRows, 'FOC', 'Trần Thị Hảo', bookingLeader);
  const selfSlices = groupRows(selfRows, 'CONTENT_SELF_CHANNEL', 'Quỳnh Như', 'Việt Hoàng');
  const multiSlices = groupRows(multiRows, 'MULTI_PLATFORM', primaryPic, bookingLeader);

  // Fallback nếu plan chưa có items chi tiết nhưng có chỉ tiêu tổng
  if (affSlices.length === 0 && ((plan.budgetAffiliate || 0) > 0 || (plan.targetAffiliateContents || 0) > 0)) {
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
    } else if ((plan.targetAffiliateContents || 0) > 0) {
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

  return {
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
    const activeCamp = findActiveCampaignForBrandInMonth(b.name, month, INITIAL_CAMPAIGNS);

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
      growthPic: b.growthPic || 'Hoàng Long',
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

export function enrichPlanWithVersions(rawPlan: InputPlanBreakdownState, idx: number = 0): InputPlanBreakdownState {
  const basePlan = enrichPlanWithMultiStaffWorkstreams(rawPlan, idx);
  const matchedCamp = basePlan.campaignId
    ? INITIAL_CAMPAIGNS.find(c => c.id === basePlan.campaignId)
    : findActiveCampaignForBrandInMonth(basePlan.brandName, basePlan.month, INITIAL_CAMPAIGNS);
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
    return plan;
  }

  const baseSignOff: MultiPartySignOff = plan.multiPartySignOff || {
    growth: {
      confirmed: true,
      confirmedBy: plan.growthPic || 'Trần Thị Ánh',
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
      confirmedBy: plan.mediaPic || 'Phan Thành Đạt',
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
        createdBy: plan.growthPic || 'Growth PIC',
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
        createdBy: plan.growthPic || 'Growth PIC',
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
        createdBy: plan.growthPic || 'Growth PIC',
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

    return {
      ...plan,
      currentVersionCode: 'v1.2',
      isVersionLocked: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      versionSnapshots: snapshots
    };
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
        createdBy: plan.growthPic || 'Growth PIC',
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
        createdBy: plan.growthPic || 'Growth PIC',
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

    return {
      ...plan,
      currentVersionCode: 'v1.1',
      isVersionLocked: ['LEAD_APPROVED', 'BRAND_APPROVED', 'APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(plan.status || ''),
      versionSnapshots: snapshots
    };
  }

  return {
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
        createdBy: plan.growthPic || 'Growth PIC',
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
}

export const INITIAL_MONTHLY_PLANS: InputPlanBreakdownState[] = RAW_MONTHLY_PLANS.map(enrichPlanWithVersions);

// Danh sách các chu kỳ tháng hỗ trợ
export const AVAILABLE_MONTHS = [
  { value: 'ALL', label: 'Tất Cả Các Tháng', badge: '11 Plans' },
  { value: '2026/10', label: 'Tháng 10/2026 (Hiện tại)', badge: '5 Plans', isCurrent: true },
  { value: '2026/11', label: 'Tháng 11/2026 (Sắp tới)', badge: '2 Plans' },
  { value: '2026/09', label: 'Tháng 09/2026', badge: '3 Plans' },
  { value: '2026/08', label: 'Tháng 08/2026', badge: '2 Plans' }
];

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
      { value: 'W45 [02.11 - 08.11]', label: 'W45 [02.11 - 08.11]' },
      { value: 'W46 [09.11 - 15.11]', label: 'W46 [09.11 - 15.11]' },
      { value: 'W47 [16.11 - 22.11]', label: 'W47 [16.11 - 22.11]' },
      { value: 'W48 [23.11 - 29.11]', label: 'W48 [23.11 - 29.11]' },
      { value: 'W49 [30.11 - 06.12]', label: 'W49 [30.11 - 06.12]' },
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


