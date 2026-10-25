import type { SalaryGrade } from './types';
import type { ApprovedBookingListItem } from './approvedBookingList';
import type { KocListingItem } from './types';
import { pushSharedStateToDb } from './sharedStateClient';

export const STORE_AIR_PLAN_STORAGE_KEY = 'upbase_b2c_store_air_plans_v1';
export const STORE_AIR_PLAN_UPDATED_EVENT = 'upbase-store-air-plan-updated';

export const STANDARD_KL_LIST: SalaryGrade[] = [
  'TAP UpAffiliate',
  'KL1',
  'KL2',
  'KL3',
  'KL4',
  'KL5',
  'KL6',
  'KL7',
];

/** Đơn giá tham chiếu chuẩn (Benchmark VNĐ) cho từng mức Khung Lương KL */
export const BENCHMARK_KL_UNIT_COST: Record<SalaryGrade, number> = {
  'TAP UpAffiliate': 0,
  'KL1': 350000,
  'KL2': 1200000,
  'KL3': 2500000,
  'KL4': 4500000,
  'KL5': 8500000,
  'KL6': 22000000,
  'KL7': 50000000,
  'TAP đối tác ngoài': 15000000,
};

export interface StoreAirPlanKlDetail {
  kl: SalaryGrade;
  targetVideos: number;
  unitCost: number;
  allocatedBudget: number;
  targetNmv?: number;
  notes?: string;
}

export interface StoreAirPlan {
  id: string;
  monthKey: string; // ví dụ: '2026/10'
  storeId: string;
  storeName: string;
  brandName: string;
  picName: string; // Chuyên viên phụ trách
  leaderName?: string; // Trưởng nhóm (nếu có)
  targetNmv: number; // Chỉ tiêu NMV (VNĐ)
  targetBudget: number; // Ngân sách kế hoạch Net (VNĐ)
  targetVideos: number; // Tổng số video mục tiêu
  klDetails: StoreAirPlanKlDetail[];
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu Kế hoạch Gian hàng ban đầu thực tế cho tháng 10/2026 và 11/2026 */
export const INITIAL_STORE_AIR_PLANS: StoreAirPlan[] = [
  {
    id: 'SAP-202610-001',
    monthKey: '2026/10',
    storeId: 'clubclio-tiktok',
    storeName: 'ClubClio TikTok Shop',
    brandName: 'ClubClio',
    picName: 'Lê Phương Thảo',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 420000000,
    targetBudget: 68000000,
    targetVideos: 32,
    status: 'ACTIVE',
    notes: 'Trọng tâm đẩy dòng cushion kill cover và tint water bare',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 8, unitCost: 0, allocatedBudget: 0, targetNmv: 40000000 },
      { kl: 'KL1', targetVideos: 6, unitCost: 350000, allocatedBudget: 2100000, targetNmv: 30000000 },
      { kl: 'KL2', targetVideos: 8, unitCost: 1200000, allocatedBudget: 9600000, targetNmv: 90000000 },
      { kl: 'KL3', targetVideos: 6, unitCost: 2700000, allocatedBudget: 16200000, targetNmv: 110000000 },
      { kl: 'KL4', targetVideos: 3, unitCost: 4800000, allocatedBudget: 14400000, targetNmv: 80000000 },
      { kl: 'KL5', targetVideos: 1, unitCost: 8500000, allocatedBudget: 8500000, targetNmv: 70000000 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-002',
    monthKey: '2026/10',
    storeId: 'clubclio-shopee',
    storeName: 'ClubClio Shopee Mall',
    brandName: 'ClubClio',
    picName: 'Lê Phương Thảo',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 310000000,
    targetBudget: 45000000,
    targetVideos: 24,
    status: 'ACTIVE',
    notes: 'Kéo traffic đợt Payday và Siêu Sale giữa tháng',
    createdAt: '2026-10-01T08:30:00Z',
    updatedAt: '2026-10-01T08:30:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 10, unitCost: 0, allocatedBudget: 0, targetNmv: 50000000 },
      { kl: 'KL1', targetVideos: 4, unitCost: 350000, allocatedBudget: 1400000, targetNmv: 20000000 },
      { kl: 'KL2', targetVideos: 5, unitCost: 1200000, allocatedBudget: 6000000, targetNmv: 60000000 },
      { kl: 'KL3', targetVideos: 3, unitCost: 2600000, allocatedBudget: 7800000, targetNmv: 70000000 },
      { kl: 'KL4', targetVideos: 2, unitCost: 4900000, allocatedBudget: 9800000, targetNmv: 60000000 },
      { kl: 'KL5', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-003',
    monthKey: '2026/10',
    storeId: 'cindy-bloom',
    storeName: 'Cindy Bloom Official',
    brandName: 'Cindy Bloom',
    picName: 'Lê Phương Thảo',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 220000000,
    targetBudget: 32000000,
    targetVideos: 20,
    status: 'ACTIVE',
    notes: 'Phân tầng mùi hương nữ sinh và công sở',
    createdAt: '2026-10-02T09:00:00Z',
    updatedAt: '2026-10-02T09:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 6, unitCost: 0, allocatedBudget: 0, targetNmv: 25000000 },
      { kl: 'KL1', targetVideos: 6, unitCost: 350000, allocatedBudget: 2100000, targetNmv: 35000000 },
      { kl: 'KL2', targetVideos: 4, unitCost: 1200000, allocatedBudget: 4800000, targetNmv: 50000000 },
      { kl: 'KL3', targetVideos: 3, unitCost: 2700000, allocatedBudget: 8100000, targetNmv: 60000000 },
      { kl: 'KL4', targetVideos: 1, unitCost: 5000000, allocatedBudget: 5000000, targetNmv: 50000000 },
      { kl: 'KL5', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-004',
    monthKey: '2026/10',
    storeId: 'eupc-beauty',
    storeName: 'EUPC Natural Beauty',
    brandName: 'EUPC',
    picName: 'Lương Thị Như Quỳnh',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 280000000,
    targetBudget: 48000000,
    targetVideos: 25,
    status: 'ACTIVE',
    notes: 'Combo dầu gội bưởi và xịt dưỡng phục hồi tóc',
    createdAt: '2026-10-02T09:30:00Z',
    updatedAt: '2026-10-02T09:30:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 8, unitCost: 0, allocatedBudget: 0, targetNmv: 35000000 },
      { kl: 'KL1', targetVideos: 5, unitCost: 350000, allocatedBudget: 1750000, targetNmv: 25000000 },
      { kl: 'KL2', targetVideos: 6, unitCost: 1200000, allocatedBudget: 7200000, targetNmv: 70000000 },
      { kl: 'KL3', targetVideos: 4, unitCost: 2600000, allocatedBudget: 10400000, targetNmv: 80000000 },
      { kl: 'KL4', targetVideos: 2, unitCost: 4800000, allocatedBudget: 9600000, targetNmv: 70000000 },
      { kl: 'KL5', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-005',
    monthKey: '2026/10',
    storeId: 'loccitane-vn',
    storeName: 'L\'Occitane En Provence',
    brandName: 'L\'Occitane',
    picName: 'Lương Thị Như Quỳnh',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 550000000,
    targetBudget: 95000000,
    targetVideos: 28,
    status: 'ACTIVE',
    notes: 'Kênh TikTok Shop đẩy mạnh dòng kem tay bơ hạt mỡ và tinh chất Immortelle',
    createdAt: '2026-10-03T10:00:00Z',
    updatedAt: '2026-10-03T10:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 5, unitCost: 0, allocatedBudget: 0, targetNmv: 30000000 },
      { kl: 'KL1', targetVideos: 3, unitCost: 350000, allocatedBudget: 1050000, targetNmv: 20000000 },
      { kl: 'KL2', targetVideos: 6, unitCost: 1200000, allocatedBudget: 7200000, targetNmv: 80000000 },
      { kl: 'KL3', targetVideos: 6, unitCost: 2800000, allocatedBudget: 16800000, targetNmv: 120000000 },
      { kl: 'KL4', targetVideos: 5, unitCost: 5000000, allocatedBudget: 25000000, targetNmv: 150000000 },
      { kl: 'KL5', targetVideos: 2, unitCost: 9000000, allocatedBudget: 18000000, targetNmv: 150000000 },
      { kl: 'KL6', targetVideos: 1, unitCost: 25000000, allocatedBudget: 25000000, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-006',
    monthKey: '2026/10',
    storeId: 'cocoon-tiktok',
    storeName: 'Cocoon Vietnam TikTok',
    brandName: 'Cocoon',
    picName: 'Lê Thanh Hải',
    targetNmv: 390000000,
    targetBudget: 62000000,
    targetVideos: 30,
    status: 'ACTIVE',
    notes: 'Bộ đôi tẩy da chết cà phê Đắk Lắk và nước dưỡng tóc dầu dừa Bến Tre',
    createdAt: '2026-10-03T11:00:00Z',
    updatedAt: '2026-10-03T11:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 8, unitCost: 0, allocatedBudget: 0, targetNmv: 40000000 },
      { kl: 'KL1', targetVideos: 6, unitCost: 350000, allocatedBudget: 2100000, targetNmv: 30000000 },
      { kl: 'KL2', targetVideos: 7, unitCost: 1200000, allocatedBudget: 8400000, targetNmv: 80000000 },
      { kl: 'KL3', targetVideos: 5, unitCost: 2700000, allocatedBudget: 13500000, targetNmv: 110000000 },
      { kl: 'KL4', targetVideos: 3, unitCost: 4800000, allocatedBudget: 14400000, targetNmv: 90000000 },
      { kl: 'KL5', targetVideos: 1, unitCost: 8500000, allocatedBudget: 8500000, targetNmv: 40000000 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-007',
    monthKey: '2026/10',
    storeId: 'anessa-official',
    storeName: 'Anessa Vietnam Official',
    brandName: 'Anessa',
    picName: 'Phạm Thị Thu Hằng',
    targetNmv: 480000000,
    targetBudget: 75000000,
    targetVideos: 26,
    status: 'ACTIVE',
    notes: 'Chống nắng bảo vệ tối đa kiềm dầu Perfect UV Sunscreen',
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 6, unitCost: 0, allocatedBudget: 0, targetNmv: 30000000 },
      { kl: 'KL1', targetVideos: 4, unitCost: 350000, allocatedBudget: 1400000, targetNmv: 25000000 },
      { kl: 'KL2', targetVideos: 6, unitCost: 1200000, allocatedBudget: 7200000, targetNmv: 85000000 },
      { kl: 'KL3', targetVideos: 5, unitCost: 2800000, allocatedBudget: 14000000, targetNmv: 120000000 },
      { kl: 'KL4', targetVideos: 3, unitCost: 4900000, allocatedBudget: 14700000, targetNmv: 110000000 },
      { kl: 'KL5', targetVideos: 2, unitCost: 8800000, allocatedBudget: 17600000, targetNmv: 110000000 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
  {
    id: 'SAP-202610-008',
    monthKey: '2026/10',
    storeId: 'byebye-blemish',
    storeName: 'Bye Bye Blemish Vietnam',
    brandName: 'Bye Bye Blemish',
    picName: 'Lương Thị Như Quỳnh',
    leaderName: 'Nguyễn Thị Ngọc Tâm',
    targetNmv: 190000000,
    targetBudget: 28000000,
    targetVideos: 18,
    status: 'ACTIVE',
    notes: 'Dung dịch chấm mụn mờ thâm cấp tốc tràm trà và lưu huỳnh',
    createdAt: '2026-10-04T14:00:00Z',
    updatedAt: '2026-10-04T14:00:00Z',
    klDetails: [
      { kl: 'TAP UpAffiliate', targetVideos: 6, unitCost: 0, allocatedBudget: 0, targetNmv: 20000000 },
      { kl: 'KL1', targetVideos: 5, unitCost: 350000, allocatedBudget: 1750000, targetNmv: 30000000 },
      { kl: 'KL2', targetVideos: 4, unitCost: 1200000, allocatedBudget: 4800000, targetNmv: 50000000 },
      { kl: 'KL3', targetVideos: 2, unitCost: 2600000, allocatedBudget: 5200000, targetNmv: 45000000 },
      { kl: 'KL4', targetVideos: 1, unitCost: 4800000, allocatedBudget: 4800000, targetNmv: 45000000 },
      { kl: 'KL5', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL6', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
      { kl: 'KL7', targetVideos: 0, unitCost: 0, allocatedBudget: 0, targetNmv: 0 },
    ],
  },
];

/** Tải danh sách Kế hoạch Gian hàng từ LocalStorage */
export function loadStoreAirPlans(): StoreAirPlan[] {
  if (typeof window === 'undefined') return INITIAL_STORE_AIR_PLANS;
  try {
    const raw = localStorage.getItem(STORE_AIR_PLAN_STORAGE_KEY);
    if (!raw) {
      return INITIAL_STORE_AIR_PLANS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_STORE_AIR_PLANS;
  } catch (err) {
    console.error('Lỗi đọc StoreAirPlans từ localStorage:', err);
    return INITIAL_STORE_AIR_PLANS;
  }
}

/** Lưu danh sách Kế hoạch Gian hàng vào LocalStorage */
export function saveStoreAirPlans(plans: StoreAirPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_AIR_PLAN_STORAGE_KEY, JSON.stringify(plans));
    pushSharedStateToDb('store-air-plans-v1', plans);
    window.dispatchEvent(new CustomEvent(STORE_AIR_PLAN_UPDATED_EVENT, { detail: plans }));
    window.dispatchEvent(new CustomEvent('upbase_store_air_plans_updated', { detail: plans }));
  } catch (err) {
    console.error('Lỗi lưu StoreAirPlans vào localStorage:', err);
  }
}

/** Thêm hoặc cập nhật Kế hoạch Gian hàng */
export function upsertStoreAirPlan(plan: StoreAirPlan): StoreAirPlan[] {
  const current = loadStoreAirPlans();
  const existingIdx = current.findIndex((p) => p.id === plan.id);
  let updated: StoreAirPlan[];
  const timestamp = new Date().toISOString();
  if (existingIdx >= 0) {
    updated = current.map((p, idx) =>
      idx === existingIdx ? { ...plan, updatedAt: timestamp } : p
    );
  } else {
    updated = [{ ...plan, createdAt: timestamp, updatedAt: timestamp }, ...current];
  }
  saveStoreAirPlans(updated);
  return updated;
}

/** Xóa Kế hoạch Gian hàng */
export function deleteStoreAirPlan(planId: string): StoreAirPlan[] {
  const current = loadStoreAirPlans();
  const updated = current.filter((p) => p.id !== planId);
  saveStoreAirPlans(updated);
  return updated;
}

// -------------------------------------------------------------
// CÁC CẤU TRÚC VÀ HÀM TỔNG HỢP BÁO CÁO ĐỐI SOÁT PLAN VS THỰC TẾ
// -------------------------------------------------------------

export interface KlComparisonRow {
  kl: SalaryGrade;
  // Plan
  planVideos: number;
  planUnitCost: number;
  planBudget: number;
  planNmv: number;
  // Thực tế từ List Duyệt Book & Listing Air
  actualBookedVideos: number;
  actualNetSpend: number;
  actualGrossSpend: number;
  actualAiredVideos: number;
  actualNmv: number;
  actualOrders: number;
  actualViews: number;
  // Độ lệch & Tỷ lệ
  videoDiff: number; // actualAiredVideos - planVideos
  spendDiff: number; // actualNetSpend - planBudget
  spendCompletionRate: number; // (actualNetSpend / planBudget) * 100
  airCompletionRate: number; // (actualAiredVideos / planVideos) * 100
  burnWarning: 'AN_TOÀN' | 'SẮP_TRẦN' | 'BỘI_CHI' | 'CHƯA_PHÁT_SINH';
}

export interface StoreAirReportItem {
  storeId: string;
  storeName: string;
  brandName: string;
  picName: string;
  leaderName?: string;
  monthKey: string;
  hasPlan: boolean;
  // Chỉ số Plan
  planNmv: number;
  planBudget: number;
  planVideos: number;
  // Thực tế
  actualBookedVideos: number;
  actualAiredVideos: number;
  actualAiredOntime: number;
  actualAiredLate: number;
  actualWaitingAir: number;
  actualAcceptedVideos: number;
  actualNetSpend: number;
  actualGrossSpend: number;
  actualPaidSpend: number;
  actualPendingPaymentSpend: number;
  actualNmv: number;
  actualOrders: number;
  actualViews: number;
  // Tỷ lệ hoàn thành
  airProgressRate: number; // (actualAiredVideos / planVideos) * 100
  budgetBurnRate: number; // (actualNetSpend / planBudget) * 100
  nmvAchievementRate: number; // (actualNmv / planNmv) * 100
  spendStatus: 'AN_TOÀN' | 'SẮP_TRẦN' | 'VƯỢT_NGÂN_SÁCH' | 'CHƯA_CÓ_PLAN';
  airStatus: 'ĐẠT_TIẾN_ĐỘ' | 'CẦN_ĐÔN_ĐỐC' | 'CHẬM_TIẾN_ĐỘ';
}

export interface OverallAirReportSummary {
  totalPlanNmv: number;
  totalActualNmv: number;
  nmvRate: number;

  totalPlanBudget: number;
  totalBookedNetSpend: number;
  totalGrossSpend: number;
  totalPaidSpend: number;
  budgetBurnRate: number;

  totalPlanVideos: number;
  totalBookedVideos: number;
  totalAiredVideos: number;
  totalWaitingAirVideos: number;
  airRate: number;

  totalOntimeVideos: number;
  totalLateVideos: number;
  totalAcceptedVideos: number;

  totalStoresCount: number;
  overbudgetStoresCount: number;
  unbudgetedStoresCount: number;

  klBreakdown: KlComparisonRow[];
  storeReports: StoreAirReportItem[];
}

/**
 * Hàm chuẩn hóa tên để so khớp linh hoạt
 */
function normalizeName(str: string): string {
  return (str || '').trim().toLowerCase();
}

/**
 * Tính toán báo cáo đối soát Kế hoạch vs Thực tế
 */
export function computeAirBookingComparisonReport(params: {
  plans: StoreAirPlan[];
  approvedBookings: ApprovedBookingListItem[];
  kocListings?: KocListingItem[];
  selectedMonth?: string;
  selectedPic?: string;
  selectedStore?: string;
  selectedBrand?: string;
}): OverallAirReportSummary {
  const {
    plans,
    approvedBookings,
    kocListings = [],
    selectedMonth,
    selectedPic,
    selectedStore,
    selectedBrand,
  } = params;

  // 1. Lọc plans theo điều kiện
  const filteredPlans = plans.filter((p) => {
    if (selectedMonth && p.monthKey !== selectedMonth) return false;
    if (selectedPic && normalizeName(p.picName) !== normalizeName(selectedPic)) return false;
    if (selectedStore && normalizeName(p.storeName) !== normalizeName(selectedStore)) return false;
    if (selectedBrand && normalizeName(p.brandName) !== normalizeName(selectedBrand)) return false;
    return true;
  });

  // 2. Lọc approvedBookings theo điều kiện
  const filteredBookings = approvedBookings.filter((b) => {
    if (selectedMonth && b.thangPlan && b.thangPlan !== selectedMonth) return false;
    if (selectedPic && normalizeName(b.nguoiPhuTrach) !== normalizeName(selectedPic)) return false;
    if (selectedStore && normalizeName(b.storeName) !== normalizeName(selectedStore)) return false;
    if (selectedBrand && normalizeName(b.brandName) !== normalizeName(selectedBrand)) return false;
    return true;
  });

  // Gom tập hợp tất cả các Store tham gia
  const allStoreNames = new Set<string>();
  filteredPlans.forEach((p) => allStoreNames.add(p.storeName));
  filteredBookings.forEach((b) => {
    if (b.storeName) allStoreNames.add(b.storeName);
  });

  // 3. Xây dựng báo cáo theo từng gian hàng
  const storeReports: StoreAirReportItem[] = [];

  allStoreNames.forEach((sName) => {
    const matchedPlan = filteredPlans.find((p) => normalizeName(p.storeName) === normalizeName(sName));
    const matchedBookings = filteredBookings.filter((b) => normalizeName(b.storeName) === normalizeName(sName));

    const planNmv = matchedPlan ? matchedPlan.targetNmv : 0;
    const planBudget = matchedPlan ? matchedPlan.targetBudget : 0;
    const planVideos = matchedPlan ? matchedPlan.targetVideos : 0;

    let actualBookedVideos = matchedBookings.length;
    let actualNetSpend = 0;
    let actualGrossSpend = 0;
    let actualPaidSpend = 0;
    let actualPendingPaymentSpend = 0;
    let actualNmv = 0;
    let actualOrders = 0;
    let actualViews = 0;

    let actualAiredVideos = 0;
    let actualAiredOntime = 0;
    let actualAiredLate = 0;
    let actualWaitingAir = 0;
    let actualAcceptedVideos = 0;

    matchedBookings.forEach((b) => {
      const net = b.chiPhiBookingNetCuoi || 0;
      const gross = b.chiPhiGrossKemThue || (net / 0.9);
      actualNetSpend += net;
      actualGrossSpend += gross;

      if (b.trangThaiPhieuThanhToan === 'Đã thanh toán') {
        actualPaidSpend += b.soTienDaThanhToan || net;
      } else {
        actualPendingPaymentSpend += (b.soTienCanThanhToan || net);
      }

      // NMV/GMV, Đơn hàng, Lượt xem lấy theo mốc lũy kế cao nhất (30d đã bao gồm 14d, không cộng trùng)
      const gmv = Math.max(b.gmv14d || 0, b.gmv30d || 0);
      actualNmv += gmv;
      actualOrders += Math.max(b.orders14d || 0, b.orders30d || 0);
      actualViews += Math.max(b.views14d || 0, b.views30d || 0);

      // Tiến độ Air
      const isAired = Boolean(b.actualAirDate || b.linkAir || b.videoId);
      if (isAired) {
        actualAiredVideos++;
        if (b.trangThaiSlaAir && b.trangThaiSlaAir.includes('Trễ')) {
          actualAiredLate++;
        } else {
          actualAiredOntime++;
        }
      } else {
        actualWaitingAir++;
      }

      if (b.acceptanceStatus === 'DA_NGHIEM_THU') {
        actualAcceptedVideos++;
      }
    });

    // Nếu không có trong bookings, thử tìm trong kocListings
    if (matchedBookings.length === 0 && kocListings.length > 0) {
      const matchedListings = kocListings.filter((l) => normalizeName(l.storeName) === normalizeName(sName));
      if (matchedListings.length > 0) {
        actualBookedVideos = matchedListings.length;
        matchedListings.forEach((l) => {
          const fee = l.finalFee || l.proposedFee || 0;
          actualNetSpend += fee;
          actualGrossSpend += fee / 0.9;
          if (l.actualAirDate || l.publishedVideoUrl || l.airVideoStage === 'AIRED') {
            actualAiredVideos++;
            actualAiredOntime++;
          } else {
            actualWaitingAir++;
          }
        });
      }
    }

    const airProgressRate = planVideos > 0 ? (actualAiredVideos / planVideos) * 100 : (actualAiredVideos > 0 ? 100 : 0);
    const budgetBurnRate = planBudget > 0 ? (actualNetSpend / planBudget) * 100 : 0;
    const nmvAchievementRate = planNmv > 0 ? (actualNmv / planNmv) * 100 : 0;

    let spendStatus: StoreAirReportItem['spendStatus'] = 'AN_TOÀN';
    if (!matchedPlan) {
      spendStatus = 'CHƯA_CÓ_PLAN';
    } else if (actualNetSpend > planBudget) {
      spendStatus = 'VƯỢT_NGÂN_SÁCH';
    } else if (budgetBurnRate >= 90) {
      spendStatus = 'SẮP_TRẦN';
    }

    let airStatus: StoreAirReportItem['airStatus'] = 'ĐẠT_TIẾN_ĐỘ';
    if (actualAiredLate > 2 || (planVideos > 0 && airProgressRate < 50 && actualWaitingAir > 5)) {
      airStatus = 'CHẬM_TIẾN_ĐỘ';
    } else if (actualWaitingAir > 0) {
      airStatus = 'CẦN_ĐÔN_ĐỐC';
    }

    const brandName = matchedPlan?.brandName || matchedBookings[0]?.brandName || 'Thương hiệu';
    const picName = matchedPlan?.picName || matchedBookings[0]?.nguoiPhuTrach || 'Chưa gán';
    const leaderName = matchedPlan?.leaderName || matchedBookings[0]?.leaderName;

    storeReports.push({
      storeId: matchedPlan?.storeId || sName.toLowerCase().replace(/\s+/g, '-'),
      storeName: sName,
      brandName,
      picName,
      leaderName,
      monthKey: selectedMonth || matchedPlan?.monthKey || matchedBookings[0]?.thangPlan || '2026/10',
      hasPlan: Boolean(matchedPlan),
      planNmv,
      planBudget,
      planVideos,
      actualBookedVideos,
      actualAiredVideos,
      actualAiredOntime,
      actualAiredLate,
      actualWaitingAir,
      actualAcceptedVideos,
      actualNetSpend,
      actualGrossSpend,
      actualPaidSpend,
      actualPendingPaymentSpend,
      actualNmv,
      actualOrders,
      actualViews,
      airProgressRate,
      budgetBurnRate,
      nmvAchievementRate,
      spendStatus,
      airStatus,
    });
  });

  // 4. Bóc tách đối soát theo từng phân tầng Khung Lương KL
  const klBreakdown: KlComparisonRow[] = STANDARD_KL_LIST.map((kl) => {
    let planVideos = 0;
    let planBudget = 0;
    let planNmv = 0;

    filteredPlans.forEach((p) => {
      const matchKl = p.klDetails.find((d) => d.kl === kl);
      if (matchKl) {
        planVideos += matchKl.targetVideos || 0;
        planBudget += matchKl.allocatedBudget || 0;
        planNmv += matchKl.targetNmv || 0;
      }
    });

    const planUnitCost = planVideos > 0 ? Math.round(planBudget / planVideos) : BENCHMARK_KL_UNIT_COST[kl] || 0;

    let actualBookedVideos = 0;
    let actualNetSpend = 0;
    let actualGrossSpend = 0;
    let actualAiredVideos = 0;
    let actualNmv = 0;
    let actualOrders = 0;
    let actualViews = 0;

    filteredBookings.forEach((b) => {
      // So khớp KL của booking
      const itemKl = b.klGrade || 'TAP UpAffiliate';
      if (itemKl === kl) {
        actualBookedVideos++;
        const net = b.chiPhiBookingNetCuoi || 0;
        actualNetSpend += net;
        actualGrossSpend += b.chiPhiGrossKemThue || (net / 0.9);
        const gmv = Math.max(b.gmv14d || 0, b.gmv30d || 0);
        actualNmv += gmv;
        actualOrders += Math.max(b.orders14d || 0, b.orders30d || 0);
        actualViews += Math.max(b.views14d || 0, b.views30d || 0);

        const isAired = Boolean(b.actualAirDate || b.linkAir || b.videoId);
        if (isAired) {
          actualAiredVideos++;
        }
      }
    });

    const videoDiff = actualAiredVideos - planVideos;
    const spendDiff = actualNetSpend - planBudget;
    const spendCompletionRate = planBudget > 0 ? (actualNetSpend / planBudget) * 100 : (actualNetSpend > 0 ? 100 : 0);
    const airCompletionRate = planVideos > 0 ? (actualAiredVideos / planVideos) * 100 : (actualAiredVideos > 0 ? 100 : 0);

    let burnWarning: KlComparisonRow['burnWarning'] = 'AN_TOÀN';
    if (planBudget === 0 && actualNetSpend === 0) {
      burnWarning = 'CHƯA_PHÁT_SINH';
    } else if (actualNetSpend > planBudget && planBudget > 0) {
      burnWarning = 'BỘI_CHI';
    } else if (spendCompletionRate >= 90) {
      burnWarning = 'SẮP_TRẦN';
    }

    return {
      kl,
      planVideos,
      planUnitCost,
      planBudget,
      planNmv,
      actualBookedVideos,
      actualNetSpend,
      actualGrossSpend,
      actualAiredVideos,
      actualNmv,
      actualOrders,
      actualViews,
      videoDiff,
      spendDiff,
      spendCompletionRate,
      airCompletionRate,
      burnWarning,
    };
  });

  // 5. Tổng hợp toàn bộ các chỉ số
  const totalPlanNmv = storeReports.reduce((sum, r) => sum + r.planNmv, 0);
  const totalActualNmv = storeReports.reduce((sum, r) => sum + r.actualNmv, 0);
  const nmvRate = totalPlanNmv > 0 ? (totalActualNmv / totalPlanNmv) * 100 : 0;

  const totalPlanBudget = storeReports.reduce((sum, r) => sum + r.planBudget, 0);
  const totalBookedNetSpend = storeReports.reduce((sum, r) => sum + r.actualNetSpend, 0);
  const totalGrossSpend = storeReports.reduce((sum, r) => sum + r.actualGrossSpend, 0);
  const totalPaidSpend = storeReports.reduce((sum, r) => sum + r.actualPaidSpend, 0);
  const budgetBurnRate = totalPlanBudget > 0 ? (totalBookedNetSpend / totalPlanBudget) * 100 : 0;

  const totalPlanVideos = storeReports.reduce((sum, r) => sum + r.planVideos, 0);
  const totalBookedVideos = storeReports.reduce((sum, r) => sum + r.actualBookedVideos, 0);
  const totalAiredVideos = storeReports.reduce((sum, r) => sum + r.actualAiredVideos, 0);
  const totalWaitingAirVideos = storeReports.reduce((sum, r) => sum + r.actualWaitingAir, 0);
  const airRate = totalPlanVideos > 0 ? (totalAiredVideos / totalPlanVideos) * 100 : 0;

  const totalOntimeVideos = storeReports.reduce((sum, r) => sum + r.actualAiredOntime, 0);
  const totalLateVideos = storeReports.reduce((sum, r) => sum + r.actualAiredLate, 0);
  const totalAcceptedVideos = storeReports.reduce((sum, r) => sum + r.actualAcceptedVideos, 0);

  const totalStoresCount = storeReports.length;
  const overbudgetStoresCount = storeReports.filter((r) => r.spendStatus === 'VƯỢT_NGÂN_SÁCH').length;
  const unbudgetedStoresCount = storeReports.filter((r) => r.spendStatus === 'CHƯA_CÓ_PLAN').length;

  return {
    totalPlanNmv,
    totalActualNmv,
    nmvRate,
    totalPlanBudget,
    totalBookedNetSpend,
    totalGrossSpend,
    totalPaidSpend,
    budgetBurnRate,
    totalPlanVideos,
    totalBookedVideos,
    totalAiredVideos,
    totalWaitingAirVideos,
    airRate,
    totalOntimeVideos,
    totalLateVideos,
    totalAcceptedVideos,
    totalStoresCount,
    overbudgetStoresCount,
    unbudgetedStoresCount,
    klBreakdown,
    storeReports,
  };
}
