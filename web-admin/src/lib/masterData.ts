// Dữ liệu gốc thật dùng làm giá trị khởi tạo phía client: KOC, brand, gian hàng, tổ đội booking và lịch sử hợp tác KOC.
import { KocItem, BookingDealItem, BrandDetail, StorePortfolioItem, BookingTeamGroup, StaffMasterMember } from './types';
import { UPBASE_FULL_KOC_MASTER } from './kocMasterDataset';
import { REAL_KOC_COOPERATION_DEALS } from './realKocMasterData';
import { REAL_B2C_69_STORES, REAL_BOOKING_TEAMS_STRUCTURE } from './realB2cPlanData';
import { REAL_B2C_42_BRANDS } from './realB2cBrandsData';
import { UPBASE_STAFF_MASTER } from './importedMasterData';

export const INITIAL_KOCS: KocItem[] = UPBASE_FULL_KOC_MASTER;

// Lịch sử hợp tác KOC thật (file 3.4 KOCs tổng hợp). Deal sinh từ kế hoạch tháng được nạp thêm qua /api/deal-board.
export const INITIAL_DEALS: BookingDealItem[] = REAL_KOC_COOPERATION_DEALS;

export const INITIAL_BRANDS: BrandDetail[] = REAL_B2C_42_BRANDS;

export const STAFF_MASTER_DIRECTORY: StaffMasterMember[] = UPBASE_STAFF_MASTER;

export const INITIAL_STORE_PORTFOLIOS: StorePortfolioItem[] = REAL_B2C_69_STORES.map((st) => {
  const netBudget = st.budgetNet ?? st.monthlyBudget ?? 0;
  const bLower = (st.brandName || '').toLowerCase();

  // Phân loại Bảng 2. Hệ số gian hàng (HS phạm vi cho việc cấp Sàn và cấp Brand)
  // Cơ bản: 0,80 | Tiêu chuẩn: 1,00 | Vừa: 1,25 | Khó: 1,50
  let tier: StorePortfolioItem['difficultyTier'] = st.difficultyTier || 'Tiêu chuẩn';
  let multiplier = st.difficultyMultiplier ?? 1.0;

  if (
    st.difficultyTier === 'Khó' ||
    netBudget >= 85000000 ||
    bLower.includes('clio') ||
    bLower.includes('rejuran') ||
    bLower.includes('loccitane') ||
    bLower.includes("l'occitane") ||
    bLower.includes('senka') ||
    bLower.includes('peripera')
  ) {
    tier = 'Khó';
    multiplier = 1.5;
  } else if (
    st.difficultyTier === 'Vừa' ||
    netBudget >= 30000000 ||
    Boolean(st.hasBookingLeader && st.bookingLeader) ||
    (st.b2cOwners && st.b2cOwners.length >= 2)
  ) {
    tier = 'Vừa';
    multiplier = 1.25;
  } else if (
    st.difficultyTier === 'Cơ bản' ||
    (netBudget === 0 && (st.targetFocVideos || 0) <= 15)
  ) {
    tier = 'Cơ bản';
    multiplier = 0.8;
  } else {
    tier = 'Tiêu chuẩn';
    multiplier = 1.0;
  }

  return {
    ...st,
    difficultyTier: tier,
    difficultyMultiplier: multiplier,
    coefficientApprovalStatus: 'APPROVED_START_OF_MONTH',
    coefficientApprovedBy: 'Đặng Thị Yến Nhi',
    coefficientApprovedAt: '2026-10-01',
    coefficientPeriodMonth: '2026/10',
  };
});


// CƠ CẤU PHÂN CẤP TỔ ĐỘI BOOKING (LEADER & TEAM MEMBERS DỰA TRÊN DỮ LIỆU THẬT 4.1 & 4.1.1)
export const BOOKING_TEAMS_STRUCTURE: BookingTeamGroup[] = REAL_BOOKING_TEAMS_STRUCTURE;
