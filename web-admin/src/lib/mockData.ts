import { 
  UserProfile, 
  KocItem, 
  BookingDealItem, 
  SlaTask, 
  LeaderboardItem, 
  CampaignItem, 
  ScriptReviewItem,
  MonthlyPlanItem,
  StaffPerformanceItem,
  BookingStaffProgressItem,
  BookingStaffRevenueItem,
  PlanGapItem,
  BrandDetail,
  EcomStore,
  HeroProduct,
  MonthlyStaffAllocation,
  MasterTierQuota,
  MonthlyMasterQuotaPlan,
  GrowthDemandItem,
  BrandCampaignPortalData,
  SampleShipment,
  StoreDifficultyConfig,
  StaffP3Record,
  WeeklyStorePlan411,
  StorePortfolioItem,
  KocCandidateItem,
  ContentItemModel,
  PublicationItemModel,
  ControlTowerSummary,
  StaffDetailedPlanItem,
  SlaBreachItem,
  StaffSlaReportItem,
  E2EReconciliationWindow,
  StaffMasterMember,
  BrandGuidelineAsset,
  BlacklistKeyword,
  HeroSkuItem,
  BrandApprovalQueueItem,
  BrandRetainerHealth,
  BrandKnowledgeBase,
  PushProductItem,
  KocListingItem,
  KocListingBatchHeader,
  BookingTeamGroup,
  BookingTeamMemberInfo
} from './types';
import { LIVE_STORE_PORTFOLIOS_MASTER } from './liveStoresData';
import { UPBASE_STORES_MASTER } from './importedMasterData';
import { UPBASE_FULL_KOC_MASTER } from './kocMasterDataset';
import { REAL_B2C_69_STORES, REAL_BOOKING_TEAMS_STRUCTURE } from './realB2cPlanData';
import { REAL_B2C_42_BRANDS } from './realB2cBrandsData';


export const USERS: UserProfile[] = [
  // =========================================================================
  // 1. BAN ĐIỀU HÀNH & TRƯỞNG PHÒNG 3 KHỐI (ADMIN / MARKETING B2C / GROWTH / MEDIA)
  // =========================================================================
  {
    id: 'user-admin-giang',
    name: 'Đỗ Văn Giang',
    email: 'giangdv@upbase.vn',
    role: 'ADMIN',
    roleTitle: 'Tổng Giám Đốc (CEO)',
    avatar: 'DG',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Ban Giám Đốc',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng', 'Kutieskin', 'Royal Ausnz', 'Mega Uri', 'pHCare', 'La Roche-Posay', 'Senka'],
    permissions: ['ALL_PERMISSIONS']
  },
  {
    id: 'user-yen-nhi',
    name: 'Đặng Thị Yến Nhi',
    email: 'yennhi@upbase.vn',
    role: 'MANAGER',
    roleTitle: 'Giám Đốc Marketing B2C (Lead B2C)',
    avatar: 'YN',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Khối Marketing B2C',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng', 'BELLA', 'Baniphar', 'EUPC', 'ClubClio', 'Fresh', 'Kutieskin', 'Natural Care', 'Miss Saigon']
  },
  {
    id: 'user-huu-chien',
    name: 'Trần Hữu Chiến',
    email: 'chienth@upbase.vn',
    role: 'ADMIN',
    roleTitle: 'Business Operation Leader (Operation)',
    avatar: 'HC',
    staffCode: 'HN979',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Khối Vận Hành (Operation)',
    teamName: 'Operation',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng', 'ClubClio', 'Kutieskin', 'Fresh', 'Cocoon', 'Senka', 'La Roche-Posay', 'BELLA'],
    permissions: ['ALL_PERMISSIONS']
  },

  // =========================================================================
  // 2. TRƯỞNG NHÓM & CHUYÊN VIÊN TÁC NGHIỆP 3 KHỐI (MARKETING B2C - GROWTH - MEDIA)
  // =========================================================================
  {
    id: 'user-ngoc-tam',
    name: 'Nguyễn Thị Ngọc Tâm',
    email: 'ngoctam@upbase.vn',
    role: 'LEADER',
    roleTitle: 'Trưởng Nhóm Booking (Mỹ Phẩm & FMCG)',
    avatar: 'NT',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'ClubClio, Cindy Bloom, EUPC, Mine, Cathy Doll',
    assignedBrands: ['ClubClio', 'Cindy Bloom', 'EUPC', 'Mine', 'Cathy Doll']
  },
  {
    id: 'user-phuong-thao',
    name: 'Lê Phương Thảo',
    email: 'phuongthao@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính (Dược Mỹ Phẩm & Skincare)',
    avatar: 'PT',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'BELLA, Dynik, Miss Saigon, Ekseption, 4PM',
    assignedBrands: ['BELLA', 'Dynik', 'Miss Saigon', 'Ekseption', '4PM']
  },
  {
    id: 'user-nhu-quynh',
    name: 'Lương Thị Như Quỳnh',
    email: 'nhuquynh@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính (Mẹ & Bé, Sức Khỏe)',
    avatar: 'NQ',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Kutieskin, Baniphar, Nabizam, Docilee, Nature\'s Way, Ziaja',
    assignedBrands: ['Kutieskin', 'Baniphar', 'Nabizam', 'Docilee', 'Nature\'s Way', 'Ziaja']
  },
  {
    id: 'user-thanh-hai',
    name: 'Lê Thanh Hải',
    email: 'thanhhai@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính (Đa Sàn & Tự Xây)',
    avatar: 'TH',
    staffCode: 'HN241',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Bye Bye Blemish, Herbal Care, Fresh, HDT, pHCare, Nucos',
    assignedBrands: ['Bye Bye Blemish', 'Herbal Care', 'Fresh', 'HDT', 'pHCare', 'Nucos']
  },
  {
    id: 'user-thu-hang',
    name: 'Phạm Thị Thu Hằng',
    email: 'thuhang@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking (Booking Specialist)',
    avatar: 'TH',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-ngoc-tam',
    managerName: 'Nguyễn Thị Ngọc Tâm',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'ClubClio, Lipit, Fresh',
    assignedBrands: ['ClubClio', 'Lipit', 'Fresh']
  },
  {
    id: 'user-hai-long',
    name: 'Hoàng Hải Long',
    email: 'hailong@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking (Booking Specialist)',
    avatar: 'HL',
    staffCode: 'HN220',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Dynik, Badlab, Natural Care',
    assignedBrands: ['Dynik', 'Badlab', 'Natural Care']
  },
  {
    id: 'user-bich-lien',
    name: 'Đinh Thị Bích Liên',
    email: 'bichlien@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking & Điều Phối Affiliate (Partnership)',
    avatar: 'BL',
    staffCode: 'HN601',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Baniphar, ClubClio, EUPC, Fresh, Kutieskin, Meracine, Docilee',
    assignedBrands: ['Baniphar', 'ClubClio', 'EUPC', 'Fresh', 'Kutieskin', 'Meracine', 'Docilee']
  },
  {
    id: 'user-dieu-anh',
    name: 'Phan Diệu Ánh',
    email: 'dieuanh@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking (Booking Specialist)',
    avatar: 'DA',
    staffCode: 'HN889',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'EUPC, TM Clean, FeelCleans',
    assignedBrands: ['EUPC', 'TM Clean', 'FeelCleans']
  },
  {
    id: 'user-ngoc-anh',
    name: 'Bùi Ngọc Ánh',
    email: 'ngocanh@upbase.vn',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content & Kế Hoạch Chiến Lược (Content Executive)',
    avatar: 'NA',
    staffCode: 'HN240',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Content Self-Channel',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Baniphar, Herbal Care, Venus, Blossomy',
    assignedBrands: ['Baniphar', 'Herbal Care', 'Venus', 'Blossomy']
  },
  {
    id: 'user-dieu-thuy',
    name: 'Hoàng Diệu Thùy',
    email: 'dieuthuy@upbase.vn',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content & Key Visual Lead (SIS / Content Executive)',
    avatar: 'DT',
    staffCode: 'HN206',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Key Visual / SIS',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'ClubClio, Baniphar, Meracine, Nucos, Blossomy, Revision, pHCare',
    assignedBrands: ['ClubClio', 'Baniphar', 'Meracine', 'Nucos', 'Blossomy', 'Revision', 'pHCare']
  },
  {
    id: 'user-viet-hoang',
    name: 'Việt Hoàng',
    email: 'viethoang@upbase.vn',
    role: 'LEADER',
    roleTitle: 'Trưởng Nhóm Partnership & Self-Channel (Quản lý CTV & Team Content)',
    avatar: 'VH',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Partnership & Self-Channel',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Kutieskin, pHCare, Royal Ausnz, Mega Uri, Senka',
    assignedBrands: ['Kutieskin', 'pHCare', 'Royal Ausnz', 'Mega Uri', 'Senka']
  },
  {
    id: 'user-quynh-nhu',
    name: 'Quỳnh Như',
    email: 'quynhnhu@upbase.vn',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Mẹ & Bé, Sức Khỏe)',
    avatar: 'QN',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Content Self-Channel',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Kutieskin, Royal Ausnz, Mega Uri',
    assignedBrands: ['Kutieskin', 'Royal Ausnz', 'Mega Uri']
  },
  {
    id: 'user-mai-anh-content',
    name: 'Nguyễn Thị Mai Anh',
    email: 'maianhnt@upbase.vn',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Skincare & Chăm Sóc Cá Nhân)',
    avatar: 'MA',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Content Self-Channel',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'pHCare, Senka',
    assignedBrands: ['pHCare', 'Senka']
  },
  {
    id: 'user-hoai-lam-content',
    name: 'Vũ Hoài Lâm',
    email: 'hoailam@upbase.vn',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Kịch Bản & Hậu Kỳ)',
    avatar: 'HL',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Content Self-Channel',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Kutieskin, Senka, Royal Ausnz',
    assignedBrands: ['Kutieskin', 'Senka', 'Royal Ausnz']
  },
  {
    id: 'user-ha-linh',
    name: 'Đặng Mai Hà Linh',
    email: 'halinh@upbase.vn',
    role: 'BRAND_MEMBER',
    roleTitle: 'Chuyên Viên Quản Lý Nhãn Hàng (Brand PIC)',
    avatar: 'HL',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Brand',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Kutieskin, Royal Ausnz',
    assignedBrands: ['Kutieskin', 'Royal Ausnz']
  },
  {
    id: 'user-minh-duc',
    name: 'Trần Minh Đức',
    email: 'minhduc@upbase.vn',
    role: 'MEMBER',
    roleTitle: 'Chuyên Viên Vận Hành (General Member)',
    avatar: 'MĐ',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'Mega Uri, Kutieskin',
    assignedBrands: ['Mega Uri', 'Kutieskin']
  },
  {
    id: 'user-thu-trang',
    name: 'Nguyễn Thu Trang',
    email: 'thutrang@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Booking Specialist (Micro & Sàn)',
    avatar: 'TT',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Marketing B2C',
    teamName: 'Booking',
    managerId: 'user-ngoc-tam',
    managerName: 'Nguyễn Thị Ngọc Tâm',
    canLogin: true,
    loginProvider: 'LARK',
    linkedEntityName: 'La Roche-Posay, Kutieskin',
    assignedBrands: ['La Roche-Posay', 'Kutieskin']
  },
  {
    id: 'contract-demo-legal',
    name: 'Pháp chế (kiểm thử)',
    email: 'phapche@upbase.vn',
    role: 'LEGAL',
    roleTitle: 'Pháp Chế — Duyệt Hợp Đồng & Biểu Mẫu (Legal)',
    avatar: 'PC',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Pháp Chế',
    teamName: 'Pháp chế',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng']
  },
  {
    id: 'contract-demo-finance',
    name: 'Kế toán (kiểm thử)',
    email: 'ketoan@upbase.vn',
    role: 'FINANCE',
    roleTitle: 'Kế Toán — Duyệt Hợp Đồng & Hạn Mức Thanh Toán (Finance)',
    avatar: 'KT',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Tài Chính Kế Toán',
    teamName: 'Kế toán',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng']
  },
  {
    id: 'contract-demo-sign',
    name: 'Điều phối ký (kiểm thử)',
    email: 'dieuphoiky@upbase.vn',
    role: 'SIGN_ADMIN',
    roleTitle: 'Điều Phối Ký Điện Tử — Trình Ký Hợp Đồng (weSign)',
    avatar: 'ĐK',
    departmentScope: 'MARKETING_B2C',
    departmentName: 'Phòng Hành Chính - Pháp Chế',
    teamName: 'Điều phối ký',
    canLogin: true,
    loginProvider: 'LARK',
    assignedBrands: ['Tất cả nhãn hàng']
  },

  // =========================================================================
  // 3. ĐỐI TÁC BÊN THỨ 3 (BRAND, KOC, CTV - GMAIL SSO)
  // =========================================================================
  {
    id: 'user-koc-megauri',
    name: 'Mega Uri Review (Hiếu An)',
    email: 'megauri.creator@gmail.com',
    role: 'KOC_PARTNER',
    roleTitle: 'Creator / KOC Đối Tác (Tier 2 Macro)',
    avatar: 'MU',
    loginProvider: 'GMAIL',
    partnerType: 'KOC',
    linkedEntityId: 'koc-1',
    linkedEntityName: 'Mega Uri Review'
  },
  {
    id: 'user-ctv-hamy',
    name: 'Hà My Content (CTV Creator)',
    email: 'hamy.creator@gmail.com',
    role: 'CTV_PARTNER',
    roleTitle: 'Cộng Tác Viên Kênh Nội Bộ (CTV)',
    avatar: 'HM',
    loginProvider: 'GMAIL',
    partnerType: 'CTV',
    linkedEntityId: 'ctv-hamy',
    linkedEntityName: 'Hà My Content'
  }
];

export const INITIAL_KOCS: KocItem[] = UPBASE_FULL_KOC_MASTER;

export const INITIAL_DEALS: BookingDealItem[] = [];

export const INITIAL_TASKS: SlaTask[] = [];

// Data from Image 2: Overall Marketing B2C T8
export const MONTHLY_PLAN_DATA: MonthlyPlanItem[] = [];

export const KL_PERFORMANCE_DATA = [];

// Data from Image 4: Table 2.3 Hiệu quả theo Content Pillar
export const PILLAR_PERFORMANCE_DATA = [];

// Data from Image 5: Table 2.4 Report hiệu quả theo Tệp Creator
export const CREATOR_NICHE_PERFORMANCE_DATA = [];

// Staff Performance Data for Managers
export const STAFF_PERFORMANCE_DATA: StaffPerformanceItem[] = [];

// =========================================================================
// EXECUTIVE REPORT DATA (FROM REAL OPERATION REPORTS - IMAGES 6, 7, 8)
// =========================================================================

// Data from Image 6: 26 Nhân sự Booking - Chi tiết theo chỉ tiêu ngân sách
export const BOOKING_STAFF_PROGRESS_26: BookingStaffProgressItem[] = [];

// Data from Image 7: Report hiệu quả GMV & KOC mới 26 nhân sự
export const BOOKING_STAFF_REVENUE_26: BookingStaffRevenueItem[] = [];

// Data from Image 8: V. Chi tiêu ngân sách Booking Tháng 8 (Plan Gap 466 Triệu)
export const PLAN_GAP_DATA: PlanGapItem[] = [];

// Data from Image 8: VI. Self Channel
export const SELF_CHANNEL_SUMMARY = {
  gmvPlan: '0đ',
  gmvRevise: '0đ',
  gmvActual: '0đ',
  gmvPct: '0%',
  budgetPlan: '0đ',
  budgetRevise: '0đ',
  budgetActual: '0đ',
  budgetPct: '0%',
  videoPlan: 0,
  videoRevise: 0,
  videoActual: 0,
  videoPct: '0%',
  pillarVideoCount: 0,
  pillarGmv30: '0đ'
};

export const INITIAL_LEADERBOARD: LeaderboardItem[] = [];

export const INITIAL_CAMPAIGNS: CampaignItem[] = [];

export const INITIAL_BRAND_GUIDELINES: BrandGuidelineAsset[] = [];

export const INITIAL_BRAND_APPROVAL_QUEUE: BrandApprovalQueueItem[] = [];

export const INITIAL_BRAND_RETAINER_HEALTH: BrandRetainerHealth[] = [];

export const INITIAL_BRAND_KNOWLEDGE_BASES: BrandKnowledgeBase[] = [];

export const INITIAL_SCRIPTS: ScriptReviewItem[] = [];

export const INITIAL_BRANDS: BrandDetail[] = REAL_B2C_42_BRANDS;



// =========================================================================
// MONTHLY MASTER QUOTA PLANS (HẠN MỨC TRẦN THEO THÁNG & THEO 4 TIER KOC/KOL)
// =========================================================================
export const MONTHLY_MASTER_QUOTA_PLANS: MonthlyMasterQuotaPlan[] = [];

export const INITIAL_STAFF_ALLOCATIONS_26: MonthlyStaffAllocation[] = [];

export const INITIAL_GROWTH_DEMANDS: GrowthDemandItem[] = [];

export const INITIAL_BRAND_PORTAL_DATA: BrandCampaignPortalData[] = [];

export const MOCK_SAMPLE_SHIPMENTS: SampleShipment[] = [];

// ==========================================
// BẢNG 2. HỆ SỐ GIAN HÀNG (HS PHẠM VI CHO VIỆC CẤP SÀN VÀ CẤP BRAND)
// Cơ bản: 0,80 | Tiêu chuẩn: 1,00 | Vừa: 1,25 | Khó: 1,50
// ==========================================
export const MOCK_STORE_DIFFICULTIES: StoreDifficultyConfig[] = [];

// ==========================================
// BẢNG ĐÁNH GIÁ HIỆU SUẤT 4P & TÍNH THƯỞNG P3 (CHÍNH SÁCH THƯỞNG P3 - BẢNG 2 HỆ SỐ GIAN HÀNG)
// ==========================================
export const MOCK_P3_STAFF_RECORDS: StaffP3Record[] = [];

// ==========================================
// KẾ HOẠCH TUẦN CHI TIẾT TỪ 4.1.1 INPUT PLAN (BẬC KL1 - KL7)
// ==========================================
export const MOCK_WEEKLY_PLANS_411: WeeklyStorePlan411[] = [];

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

// MASTER DATA DANH BẠ NHÂN SỰ & QUẢN LÝ PHÂN CÔNG (THỰC TẾ PHÒNG B2C)
export const STAFF_MASTER_DIRECTORY: StaffMasterMember[] = [
  // Cấp Trưởng Phòng (Operations Head / Lead B2C)
  { id: 'st-mgr-1', name: 'Đặng Thị Yến Nhi', role: 'MANAGER', team: 'Ban Quản Trị Vận Hành B2C', roleTitle: 'Trưởng Phòng Vận Hành B2C (Lead B2C)', avatar: 'YN', email: 'yennhi@upbase.vn', phone: '0980.000.001', maxStoresCapacity: 69 },

  // Cấp Trưởng nhóm (Leader)
  { id: 'st-ld-1', name: 'Nguyễn Thị Ngọc Tâm', role: 'BOOKING', team: 'Nhóm Booking Mỹ Phẩm & FMCG', roleTitle: 'Trưởng Nhóm Booking', avatar: 'NT', email: 'ngoctam@upbase.vn', phone: '0980.111.001', maxStoresCapacity: 15 },

  // Cấp Chuyên viên chính & Chuyên viên thực thi (Specialist)
  { id: 'st-sp-0a', name: 'Lê Phương Thảo', role: 'BOOKING', team: 'Khối Vận Hành B2C', roleTitle: 'Chuyên viên Booking Chính (Senior)', avatar: 'PT', email: 'phuongthao@upbase.vn', phone: '0980.111.002', maxStoresCapacity: 10 },
  { id: 'st-sp-0b', name: 'Lương Thị Như Quỳnh', role: 'BOOKING', team: 'Khối Vận Hành B2C', roleTitle: 'Chuyên viên Booking Chính (Senior)', avatar: 'NQ', email: 'nhuquynh@upbase.vn', phone: '0980.111.003', maxStoresCapacity: 10 },
  { id: 'st-sp-0c', name: 'Lê Thanh Hải', role: 'BOOKING', team: 'Khối Vận Hành B2C', roleTitle: 'Chuyên viên Booking Chính (Senior)', avatar: 'TH', email: 'thanhhai@upbase.vn', phone: '0980.111.004', maxStoresCapacity: 10 },
  { id: 'st-sp-0d', name: 'Hoàng Diệu Thuỳ', role: 'BOOKING', team: 'Khối Vận Hành B2C', roleTitle: 'Chuyên viên Booking', avatar: 'DT', email: 'dieuthuy@upbase.vn', phone: '0980.111.005', maxStoresCapacity: 8 },
  { id: 'st-sp-0e', name: 'Dương Thị Hồng Nhung', role: 'BOOKING', team: 'Khối Vận Hành B2C', roleTitle: 'Chuyên viên Booking', avatar: 'HN', email: 'hongnhung@upbase.vn', phone: '0980.111.006', maxStoresCapacity: 8 },
  { id: 'st-sp-1', name: 'Phạm Thị Thu Hằng', role: 'BOOKING', team: 'Đội 1: Mỹ Phẩm Trang Điểm & FMCG', roleTitle: 'Chuyên viên Booking (Senior)', avatar: 'TH', email: 'thuhang@upbase.vn', phone: '0981.222.001', maxStoresCapacity: 5 },
  { id: 'st-sp-2', name: 'Lại Ngọc Huyền', role: 'BOOKING', team: 'Đội 1: Mỹ Phẩm Trang Điểm & FMCG', roleTitle: 'Chuyên viên Booking', avatar: 'LH', email: 'ngochuyen.lai@upbase.vn', phone: '0981.222.002', maxStoresCapacity: 5 },
  { id: 'st-sp-3', name: 'Lương Nguyễn Trang Nhung', role: 'BOOKING', team: 'Đội 1: Mỹ Phẩm Trang Điểm & FMCG', roleTitle: 'Chuyên viên Booking', avatar: 'TN', email: 'trangnhung@upbase.vn', phone: '0981.222.003', maxStoresCapacity: 5 },
  { id: 'st-sp-4', name: 'Hà Thị Thủy', role: 'BOOKING', team: 'Đội 1: Mỹ Phẩm Trang Điểm & FMCG', roleTitle: 'Chuyên viên Booking', avatar: 'HT', email: 'thuyha@upbase.vn', phone: '0981.222.004', maxStoresCapacity: 5 },
  { id: 'st-sp-5', name: 'Nguyễn Thị Hồng Ngát', role: 'BOOKING', team: 'Đội 1: Mỹ Phẩm Trang Điểm & FMCG', roleTitle: 'Chuyên viên Booking', avatar: 'HN', email: 'hongngat@upbase.vn', phone: '0981.222.005', maxStoresCapacity: 5 },
  { id: 'st-sp-6', name: 'Hoàng Hải Long', role: 'BOOKING', team: 'Đội 2: Dược Mỹ Phẩm & Chăm Sóc Da', roleTitle: 'Chuyên viên Booking (Senior)', avatar: 'HL', email: 'hailong@upbase.vn', phone: '0981.222.006', maxStoresCapacity: 5 },
  { id: 'st-sp-7', name: 'Bùi Ngọc Ánh', role: 'BOOKING', team: 'Đội 2: Dược Mỹ Phẩm & Chăm Sóc Da', roleTitle: 'Chuyên viên Booking', avatar: 'NA', email: 'ngocanh.bui@upbase.vn', phone: '0981.222.007', maxStoresCapacity: 5 },
  { id: 'st-sp-8', name: 'Trần Phương Thảo', role: 'BOOKING', team: 'Đội 2: Dược Mỹ Phẩm & Chăm Sóc Da', roleTitle: 'Chuyên viên Booking', avatar: 'TT', email: 'phuongthao.tran@upbase.vn', phone: '0981.222.008', maxStoresCapacity: 5 },
  { id: 'st-sp-9', name: 'Nguyễn Quỳnh Trang', role: 'BOOKING', team: 'Đội 2: Dược Mỹ Phẩm & Chăm Sóc Da', roleTitle: 'Chuyên viên Booking', avatar: 'QT', email: 'quinhtrang@upbase.vn', phone: '0981.222.009', maxStoresCapacity: 5 },
  { id: 'st-sp-10', name: 'Nguyễn Ngọc Huyền', role: 'BOOKING', team: 'Đội 3: Mẹ & Bé, Chăm Sóc Sức Khỏe', roleTitle: 'Chuyên viên Booking', avatar: 'NH', email: 'ngochuyen@upbase.vn', phone: '0981.222.010', maxStoresCapacity: 5 },
  { id: 'st-sp-11', name: 'Nguyễn Thị Quỳnh Nhi', role: 'BOOKING', team: 'Đội 3: Mẹ & Bé, Chăm Sóc Sức Khỏe', roleTitle: 'Chuyên viên Booking', avatar: 'QN', email: 'quynhnhi@upbase.vn', phone: '0981.222.011', maxStoresCapacity: 5 },
  { id: 'st-sp-12', name: 'Bùi Thu Hằng', role: 'BOOKING', team: 'Đội 3: Mẹ & Bé, Chăm Sóc Sức Khỏe', roleTitle: 'Chuyên viên Booking', avatar: 'BH', email: 'thuhang.bui@upbase.vn', phone: '0981.222.012', maxStoresCapacity: 5 },
  { id: 'st-sp-13', name: 'Đinh Thị Bích Liên', role: 'BOOKING', team: 'Đội 3: Mẹ & Bé, Chăm Sóc Sức Khỏe', roleTitle: 'Chuyên viên Booking', avatar: 'BL', email: 'bichlien@upbase.vn', phone: '0981.222.013', maxStoresCapacity: 5 },
  { id: 'st-sp-14', name: 'Trần Thị Hảo', role: 'BOOKING', team: 'Đội 3: Mẹ & Bé, Chăm Sóc Sức Khỏe', roleTitle: 'Chuyên viên Điều phối Mẫu FOC & TAP', avatar: 'TH', email: 'thihao@upbase.vn', phone: '0981.222.014', maxStoresCapacity: 10 },
  { id: 'st-sp-15', name: 'Trần Hải Phượng', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking', avatar: 'HP', email: 'haiphuong@upbase.vn', phone: '0981.222.015', maxStoresCapacity: 5 },
  { id: 'st-sp-16', name: 'Phan Diệu Ánh', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking Đa Sàn', avatar: 'DA', email: 'dieuannh@upbase.vn', phone: '0981.222.016', maxStoresCapacity: 5 },
  { id: 'st-sp-17', name: 'Vũ Hoài Lâm', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking & Tự Xây', avatar: 'HL', email: 'hoailam@upbase.vn', phone: '0981.222.017', maxStoresCapacity: 5 },
  { id: 'st-sp-18', name: 'Nguyễn Thị Mai Anh', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking', avatar: 'MA', email: 'maianh@upbase.vn', phone: '0981.222.018', maxStoresCapacity: 5 },
  { id: 'st-sp-19', name: 'Phạm Huyền Thương', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking & Livestream', avatar: 'HT', email: 'huyenthuong@upbase.vn', phone: '0981.222.019', maxStoresCapacity: 5 },
  { id: 'st-sp-20', name: 'Nguyễn Ngọc Linh', role: 'BOOKING', team: 'Đội 4: Đa Kênh, Tự Xây & Livestream', roleTitle: 'Chuyên viên Booking', avatar: 'NL', email: 'ngoclinh@upbase.vn', phone: '0981.222.020', maxStoresCapacity: 5 },

  // Nhân sự phối hợp các phòng ban (Growth, Account, Media, Content)
  { id: 'st-6', name: 'Quỳnh Như', role: 'CONTENT', team: 'Content Studio', roleTitle: 'Content Creative & Script Lead', avatar: 'QN', email: 'quynhnhu@upbase.vn', phone: '0986.789.012', maxStoresCapacity: 4 },
  { id: 'st-8', name: 'Đào Phương Anh', role: 'ACCOUNT', team: 'Account Management', roleTitle: 'Senior Account Manager', avatar: 'PA', email: 'phuonganh@upbase.vn', phone: '0988.901.234', maxStoresCapacity: 10 },
  { id: 'st-9', name: 'Nguyễn Đức Mạnh', role: 'GROWTH', team: 'Growth Ops', roleTitle: 'Growth Operations Lead', avatar: 'DM', email: 'ducmanh@upbase.vn', phone: '0989.012.345', maxStoresCapacity: 8 },
  { id: 'st-10', name: 'Nguyễn Khánh Linh', role: 'GROWTH', team: 'Growth Ops', roleTitle: 'Growth Specialist', avatar: 'KL', email: 'khanhlinh@upbase.vn', phone: '0971.123.456', maxStoresCapacity: 8 },
  { id: 'st-11', name: 'Trần Anh Thư', role: 'GROWTH', team: 'Growth Ops', roleTitle: 'Senior Growth Specialist', avatar: 'AT', email: 'anhthu@upbase.vn', phone: '0972.234.567', maxStoresCapacity: 8 }
];

// --- MODULE 3: EXECUTION (CANDIDATE POOL & OUTREACH PIPELINE) ---
export const INITIAL_KOC_CANDIDATES: KocCandidateItem[] = [];

// --- MODULE 4: CONTENT (DECOUPLED CONTENT ASSETS & QC FLOW) ---
export const INITIAL_CONTENT_ITEMS: ContentItemModel[] = [];

// --- MODULE 3 / 4: PUBLICATIONS (LINK LIVE, SPARK ADS & REAL PERFORMANCE) ---
export const INITIAL_PUBLICATIONS: PublicationItemModel[] = [];

// --- MODULE 6: CONTROL TOWER COCKPIT AGGREGATES ---
export const INITIAL_CONTROL_TOWER: ControlTowerSummary = {
  planGmv: 0,
  actualGmv: 0,
  gmvAchievementRate: 0,
  planBudget: 0,
  actualSpentBudget: 0,
  budgetBurnRate: 0,
  cirCurrent: 0,
  slaOnTimeRate: 100,
  pendingBacklogCases: 0,
  bottleneckTeam: '—',
  firstTimePassRate: 100,
  ghostSampleWarnings: 0,
  overloadStaffCount: 0
};

export const INITIAL_DETAILED_STAFF_PLANS: StaffDetailedPlanItem[] = [];

export const INITIAL_SLA_BREACHES: SlaBreachItem[] = [];

export const INITIAL_STAFF_SLA_REPORTS: StaffSlaReportItem[] = [];

export const INITIAL_RECONCILIATION_WINDOW: E2EReconciliationWindow = {
  currentPhase: 'OPEN_WINDOW_WD05',
  phaseLabel: 'Chưa mở cửa sổ nghiệm thu',
  windowOpenTime: '—',
  windowCloseTime: '—',
  isOpenForEdit: false,
  totalErrorsReportedRound1: 0,
  totalErrorsReportedRound2: 0,
  resolvedErrorsCount: 0,
  pendingErrorsCount: 0
};

export const INITIAL_PUSH_PRODUCTS: PushProductItem[] = [];

export const INITIAL_LISTING_BATCHES: KocListingBatchHeader[] = [];

export const INITIAL_KOC_LISTINGS: KocListingItem[] = [];
