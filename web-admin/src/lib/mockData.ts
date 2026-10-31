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
export const MONTHLY_PLAN_DATA: MonthlyPlanItem[] = [
  {
    id: 'plan-1',
    workstream: 'Video Affiliate',
    metric: 'GMV',
    planT8: '28,74 B',
    reviseT8: '28,74 B',
    actualT8: '24,15 B',
    pctAchieved: '84,0%',
    status: 'IN_PROGRESS'
  },
  {
    id: 'plan-2',
    workstream: 'Video Affiliate',
    metric: 'Budget Gross',
    planT8: '3,37 B',
    reviseT8: '3,37 B',
    actualT8: '3,05 B',
    pctAchieved: '90,4%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-3',
    workstream: 'Video Affiliate',
    metric: 'Budget Net',
    planT8: '3,03 B',
    reviseT8: '3,03 B',
    actualT8: '2,74 B',
    pctAchieved: '90,4%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-4',
    workstream: 'Self Channel',
    metric: 'GMV',
    planT8: '1,88 B',
    reviseT8: '1,88 B',
    actualT8: '1,19 B',
    pctAchieved: '63,4%',
    status: 'MISSED'
  },
  {
    id: 'plan-5',
    workstream: 'Self Channel',
    metric: 'Budget Gross',
    planT8: '370,8 M',
    reviseT8: '370,8 M',
    actualT8: '314,3 M',
    pctAchieved: '84,8%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-6',
    workstream: 'Self Channel',
    metric: 'Số video',
    planT8: '921',
    reviseT8: '902',
    actualT8: '853',
    pctAchieved: '94,6%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-7',
    workstream: 'Live Affiliate',
    metric: 'Số phiên',
    planT8: '—',
    reviseT8: '—',
    actualT8: '23 phiên',
    pctAchieved: '100%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-8',
    workstream: 'Campaign',
    metric: 'Đang triển khai',
    planT8: '6',
    reviseT8: '6',
    actualT8: '6',
    pctAchieved: '100%',
    status: 'ACHIEVED'
  },
  {
    id: 'plan-9',
    workstream: 'Campaign',
    metric: 'Đang nghiên cứu',
    planT8: '5',
    reviseT8: '5',
    actualT8: '5',
    pctAchieved: '100%',
    status: 'ACHIEVED'
  }
];

// Data from Image 4: Table 2.2 Hiệu quả theo Khung Lương KL1 -> KL7
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
  gmvPlan: '1,882 B',
  gmvRevise: '1,882 B',
  gmvActual: '1,193 B',
  gmvPct: '63,4%',
  budgetPlan: '370,8 M',
  budgetRevise: '370,8 M',
  budgetActual: '314,3 M',
  budgetPct: '84,8%',
  videoPlan: 921,
  videoRevise: 902,
  videoActual: 853,
  videoPct: '94,6% vs revise',
  pillarVideoCount: 883,
  pillarGmv30: '72,6 M'
};

export const INITIAL_LEADERBOARD: LeaderboardItem[] = [
  {
    rank: 1,
    name: 'Khánh Vy',
    team: 'Booking Execution',
    role: 'BOOKING_MEMBER',
    slaScore: 100,
    videoCount: 32,
    gmv: 420000000,
    totalScore: 1120,
    badge: 'Hoàn Thành Xuất Sắc',
    isTop3: true
  },
  {
    rank: 2,
    name: 'Hoàng Linh',
    team: 'Content Team',
    role: 'CONTENT_MEMBER',
    slaScore: 98,
    videoCount: 24,
    gmv: 380000000,
    totalScore: 945,
    badge: 'Nội Dung Xuất Sắc',
    isTop3: true
  },
  {
    rank: 3,
    name: 'Nguyễn Anh',
    team: 'Booking Execution',
    role: 'BOOKING_MEMBER',
    slaScore: 100,
    videoCount: 28,
    gmv: 310000000,
    totalScore: 890,
    badge: 'Kỷ Luật SLA Tối Đa',
    isTop3: true
  },
  {
    rank: 4,
    name: 'Quỳnh Như',
    team: 'Content Team',
    role: 'CONTENT_MEMBER',
    slaScore: 95,
    videoCount: 18,
    gmv: 250000000,
    totalScore: 820,
    badge: 'Top Strategy',
    isTop3: false
  },
  {
    rank: 5,
    name: 'Phương Thảo',
    team: 'Brand Team',
    role: 'BRAND_MEMBER',
    slaScore: 96,
    videoCount: 8,
    gmv: 520000000,
    totalScore: 795,
    badge: 'Master Campaigner',
    isTop3: false
  }
];

export const INITIAL_CAMPAIGNS: CampaignItem[] = [
  {
    id: 'camp-1',
    code: 'CAMP-1010-SENKA',
    title: 'Chiến Dịch Mega Sale 9.9 - 10.10 — Kháng Nắng & Làm Sạch Đa Tầng Senka Perfect Whip',
    brand: 'Senka',
    targetAudience: 'Nữ 18-28 tuổi, nhân viên văn phòng, sinh viên tiếp xúc màn hình và tia UV hàng ngày.',
    bigIdea: 'Lá Chắn Đa Tầng — Bảo Vệ Da Sạch Sâu Cả Ngày Dài',
    keyMessage: 'Bọt tơ tằm siêu nhỏ Micro Bubbles sạch sâu 99% bụi mịn PM 2.5 mà không gây khô căng da',
    heroSkus: ['SKU-SNK-WHIP-120G', 'SKU-SNK-MICELLAR-500ML'],
    targetCir: 13.8,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Nguyễn Thị Thu Hà',
    kvPic: 'Lê Hoàng Nam',
    handoffAt: '2026-09-23 10:00',
    handoffSlaHours: 24,
    isSlaBreached: false,
    budget: 250000000,
    spentBudget: 165000000,
    targetGmv: 1800000000,
    currentGmv: 1120000000,
    targetKocCount: 30,
    bookedKocCount: 22,
    status: 'ACTIVE',
    briefStatus: 'HANDED_OFF_TO_CONTENT',
    startDate: '2026-09-15',
    endDate: '2026-10-25',
    coveredMonths: ['2026/09', '2026/10'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Senka Official TikTok', 'Senka Official Shopee'],
    roleInYearPlan: 'Chiến dịch trọng điểm mở màn Q4, đẩy sản lượng dòng Perfect Whip & Micellar trước mùa lễ hội cuối năm.',
    objectivesAndBarriers: 'Mục tiêu: Tăng 35% thị phần nhóm sữa rửa mặt bình dân. Rào cản: Định kiến bọt nhiều gây khô căng da mùa thu.',
    seasonalOpportunity: 'Giao mùa Thu - Đông độ ẩm giảm, nhu cầu làm sạch dịu nhẹ kết hợp dưỡng ẩm tăng cao; hưởng lợi sóng Mega Sale 9.9 & 10.10.',
    comboPromoOffer: 'Combo 2 tuýp Perfect Whip 120g giảm 28% + Tặng 1 băng đô rửa mặt tai thỏ & Voucher 25K đơn từ 199K',
    saleMilestones: 'W1: D-Day 10.10 Mega Sale | W2: Mid-Month 15.10 | W4: Payday 25.10',
    keyVisualSpec: {
      theme: 'Blue Micro-Bubble Shield — Bọt Tơ Tằm Cấp Ẩm Đa Tầng',
      fonts: 'Montserrat Bold / Noto Sans JP Regular',
      moodboard: 'Tone xanh dương pastel kết hợp bọt trắng xốp 3D và hiệu ứng giọt nước tinh khiết kiểu Nhật',
      proposalUrl: 'https://upbase.vn/kv-proposals/senka-1010-kv-deck.pdf',
      promoTextOnKv: 'MUA 2 GIẢM 28% + QUÀ TẶNG ĐỘC QUYỀN 99K',
      refDate: '2026-09-05',
      orderDate: '2026-09-08',
      hangDate: '2026-09-14',
      kvPic: 'Lê Hoàng Nam'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Giai đoạn 1: Teasing & Review Thực Chứng Độ Ẩm',
        allocatedBudget: 100000000,
        spentBudget: 85000000,
        targetGmv: 720000000,
        actualGmv: 620000000,
        targetKocCount: 12,
        saleMilestones: 'W3: Mid-Month 15.09 | W4: Payday 25.09 Teasing 10.10',
        kvAdaptNotes: 'Treo KV Teasing tone xanh dịu + Frame KOC test độ pH'
      },
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 2: Booming Mega Sale 10.10 & Chốt Đơn Combo',
        allocatedBudget: 150000000,
        spentBudget: 80000000,
        targetGmv: 1080000000,
        actualGmv: 500000000,
        targetKocCount: 18,
        saleMilestones: 'W1-W2: D-Day 10.10 | W3: 20.10 Phụ nữ VN | W4: Payday 25.10',
        kvAdaptNotes: 'Adapt KV sang badge đỏ-vàng Mega Sale 10.10 & quà tặng 20/10'
      }
    ],
    guidelineUrl: 'https://upbase.vn/guidelines/senka-megasale-1010.pdf'
  },
  {
    id: 'camp-2',
    code: 'CAMP-KUTI-THUDONG',
    title: 'Chiến Dịch Mẹ Thông Thái Chăm Da Bé Thu Đông Kutieskin (3 Tháng)',
    brand: 'Kutieskin',
    targetAudience: 'Mẹ bỉm sữa 22-35 tuổi có con nhỏ từ 0-5 tuổi, quan tâm chăm sóc da trẻ mùa hanh khô.',
    bigIdea: 'Lớp Giáp Thảo Dược Hữu Cơ Cho Da Nhạy Cảm Của Bé',
    keyMessage: 'Dịu nhanh mẩn ngứa, dưỡng ẩm phục hồi sau 24h với Aminovector từ Pháp đạt chuẩn Cosmos',
    heroSkus: ['SKU-KUTI-SOOTHING-30G'],
    targetCir: 16.3,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Trần Minh Trang',
    kvPic: 'Phạm Quốc Bảo',
    handoffAt: '2026-09-24 09:30',
    handoffSlaHours: 24,
    isSlaBreached: false,
    budget: 240000000,
    spentBudget: 110000000,
    targetGmv: 1600000000,
    currentGmv: 780000000,
    targetKocCount: 32,
    bookedKocCount: 20,
    status: 'ACTIVE',
    briefStatus: 'HANDED_OFF_TO_CONTENT',
    startDate: '2026-09-20',
    endDate: '2026-11-15',
    coveredMonths: ['2026/09', '2026/10', '2026/11'],
    durationMonthsCount: 3,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Kutieskin Official TikTok', 'Kutieskin Official Shopee'],
    roleInYearPlan: 'Chiến dịch mùa vụ dài hạn (3 tháng Thu Đông) chiếm 45% doanh thu cả năm của dòng Kem dưỡng ẩm & Kem mẩn ngứa.',
    objectivesAndBarriers: 'Mục tiêu: Chiếm lĩnh Top 1 kem dưỡng ẩm cho bé trên TikTok Shop. Rào cản: Phụ huynh lo ngại corticoid trong kem bôi da trẻ sơ sinh.',
    seasonalOpportunity: 'Không khí lạnh và hanh khô miền Bắc - Trung từ tháng 9 đến tháng 11 khiến 70% trẻ nhỏ gặp tình trạng khô nẻ, chàm sữa.',
    comboPromoOffer: 'Bộ đôi Kem mẩn ngứa + Kem dưỡng ẩm Thu Đông giảm 22% + Tặng Sữa tắm gội thảo dược mini 50ml',
    saleMilestones: 'T9: Khởi động mùa lạnh | T10: Đỉnh điểm giao mùa 10.10 | T11: Đại tiệc 11.11 Trữ hàng mùa đông',
    keyVisualSpec: {
      theme: 'Warm Herbal Hug — Vòng Tay Thảo Dược Ấm Áp Mùa Thu Đông',
      fonts: 'Quicksand Bold / Inter Regular',
      moodboard: 'Tone cam đất ấm áp kết hợp xanh lá thảo mộc hữu cơ, hình ảnh mẹ ôm bé trong chăn len mềm',
      proposalUrl: 'https://upbase.vn/kv-proposals/kutieskin-thudong-kv.pdf',
      promoTextOnKv: 'COMBO CHĂM DA BÉ THU ĐÔNG - GIẢM 22% + TẶNG QUÀ SƠ SINH',
      refDate: '2026-09-10',
      orderDate: '2026-09-12',
      hangDate: '2026-09-19',
      kvPic: 'Phạm Quốc Bảo'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Giai đoạn 1: Cảnh Báo Giao Mùa & Giáo Dục Thành Phần Không Corticoid',
        allocatedBudget: 60000000,
        spentBudget: 55000000,
        targetGmv: 400000000,
        actualGmv: 380000000,
        targetKocCount: 8,
        saleMilestones: 'W4: Payday 25.09 Mở bán Combo Giao Mùa',
        kvAdaptNotes: 'KV khởi động mùa thu - nhấn mạnh chứng nhận Cosmos Ecocert'
      },
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 2: Bùng Nổ Doanh Số 10.10 & Phủ Sóng Hot Mom Review',
        allocatedBudget: 100000000,
        spentBudget: 55000000,
        targetGmv: 700000000,
        actualGmv: 400000000,
        targetKocCount: 14,
        saleMilestones: 'W1-W2: 10.10 Mega Sale | W3: Brand Day 18.10 | W4: Payday 25.10',
        kvAdaptNotes: 'Adapt KV gắn tag Top 1 Kem Dưỡng Ẩm Cho Bé + Deal 10.10'
      },
      {
        month: '2026/11',
        phaseName: 'Giai đoạn 3: Duy Trì & Chốt Đơn Đại Tiệc 11.11 (Sustain & Stock-up)',
        allocatedBudget: 80000000,
        spentBudget: 0,
        targetGmv: 500000000,
        actualGmv: 0,
        targetKocCount: 10,
        saleMilestones: 'W1-W2: Siêu Sale 11.11 Combo 3 Tuýp Trữ Đông',
        kvAdaptNotes: 'Adapt KV sang tone Đông ấm áp + Badge 11.11'
      }
    ],
    guidelineUrl: 'https://upbase.vn/guidelines/kutieskin-thudong.pdf'
  },
  {
    id: 'camp-3',
    code: 'CAMP-NW-IMMUNITY',
    title: 'Chiến Dịch Tăng Đề Kháng Khởi Động Năm Học Nature\'s Way Kids Smart',
    brand: "Nature's Way",
    targetAudience: 'Phụ huynh có con trong độ tuổi mầm non và tiểu học hay ốm vặt khi giao mùa.',
    bigIdea: 'Đề Kháng Vững Vàng — Tự Tin Đến Trường Cùng Nature\'s Way',
    keyMessage: 'Bổ sung Kẽm & Vitamin C kẹo dẻo thơm ngon nhập khẩu 100% từ Úc giúp con khỏe mạnh',
    heroSkus: ['SKU-NW-GUMMIES-60V'],
    targetCir: 15.0,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Nguyễn Thị Thu Hà',
    kvPic: 'Lê Hoàng Nam',
    handoffAt: '2026-09-24 15:00',
    handoffSlaHours: 24,
    isSlaBreached: false,
    budget: 350000000,
    spentBudget: 210000000,
    targetGmv: 2500000000,
    currentGmv: 1450000000,
    targetKocCount: 45,
    bookedKocCount: 28,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-09-10',
    endDate: '2026-10-30',
    coveredMonths: ['2026/09', '2026/10'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ["Nature's Way TikTok", "Nature's Way Shopee"],
    roleInYearPlan: 'Chiến dịch Back-to-School & Giao mùa lớn nhất nửa cuối năm của nhãn hàng.',
    objectivesAndBarriers: 'Mục tiêu: Đạt 2.5 tỷ GMV trong 2 tháng. Rào cản: Trẻ kén ăn, sợ mùi tanh hoặc vị thuốc của sản phẩm bổ sung kẽm.',
    seasonalOpportunity: 'Tháng 9-10 trẻ quay lại trường học dễ lây chéo cúm mùa, nhu cầu tìm vitamin tăng đề kháng tăng gấp 2.5 lần.',
    comboPromoOffer: 'Combo 2 hộp Vita Gummies Zinc + Vitamin C giảm 25% + Tặng bình nước đi học Nature\'s Way',
    saleMilestones: 'T9: Back-to-School 9.9 & Payday | T10: Mega Sale 10.10 & Payday 25.10',
    keyVisualSpec: {
      theme: 'Aussie Kids Immunity Shield — Khiên Đề Kháng Tự Nhiên Từ Úc',
      fonts: 'Fredoka SemiBold / Nunito Regular',
      moodboard: 'Tone vàng nắng Úc & xanh lá tươi mát, minh họa khiên bảo vệ hoạt hình quanh bé đến trường',
      proposalUrl: 'https://upbase.vn/kv-proposals/naturesway-immunity-kv.pdf',
      promoTextOnKv: 'MUA 2 TẶNG BÌNH NƯỚC ĐI HỌC + VOUCHER 50K',
      refDate: '2026-09-01',
      orderDate: '2026-09-04',
      hangDate: '2026-09-09',
      kvPic: 'Lê Hoàng Nam'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Giai đoạn 1: Back-to-School — Hành Trang Đề Kháng Đầu Năm Học',
        allocatedBudget: 160000000,
        spentBudget: 140000000,
        targetGmv: 1100000000,
        actualGmv: 920000000,
        targetKocCount: 20,
        saleMilestones: 'W2: 9.9 Sale | W4: Payday 25.09',
        kvAdaptNotes: 'KV Back-to-School gắn quà tặng bình nước đi học'
      },
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 2: Mega Sale 10.10 — Liệu Trình 2 Tháng Tăng Đề Kháng Giao Mùa',
        allocatedBudget: 190000000,
        spentBudget: 70000000,
        targetGmv: 1400000000,
        actualGmv: 530000000,
        targetKocCount: 25,
        saleMilestones: 'W1-W2: 10.10 Mega Sale | W4: Payday 25.10',
        kvAdaptNotes: 'Adapt KV đẩy liệu trình Combo 2-3 lọ tiết kiệm 25%'
      }
    ]
  },
  {
    id: 'camp-4',
    code: 'CAMP-BABE-STOPAKN',
    title: 'Chiến Dịch Tạm Biệt Da Dầu Mụn Laboratorios BABÉ Tây Ban Nha (1 Tháng)',
    brand: 'Babe',
    targetAudience: 'Giới trẻ Gen Z và người có làn da dầu nhờn, dễ bị mụn viêm vùng chữ T.',
    bigIdea: 'Kiểm Soát Bã Nhờn Tinh Chuẩn Chuẩn Da Liễu Châu Âu',
    keyMessage: 'Sạch sâu ngừa mụn với Cytobiol Iris và Salicylic Acid 0.5% độ pH 5.0 không khô rát',
    heroSkus: ['SKU-BABE-STOPAKN-200ML'],
    targetCir: 18.9,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Trần Minh Trang',
    kvPic: 'Phạm Quốc Bảo',
    budget: 150000000,
    spentBudget: 48000000,
    targetGmv: 950000000,
    currentGmv: 320000000,
    targetKocCount: 25,
    bookedKocCount: 15,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    coveredMonths: ['2026/10'],
    durationMonthsCount: 1,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Babe Laboratorios TikTok', 'Babe Laboratorios Shopee'],
    roleInYearPlan: 'Chiến dịch 1 tháng tập trung đẩy dòng Stop AKN trong nhịp Mega Sale 10.10.',
    objectivesAndBarriers: 'Mục tiêu: Tăng chuyển đổi dòng sữa rửa mặt và kem dưỡng Stop AKN. Rào cản: Giá cao hơn phân khúc phổ thông.',
    seasonalOpportunity: 'Tháng 10 có nhịp sale 10.10 và 20.10, khách hàng sẵn sàng chi tiêu cho dược mỹ phẩm chính hãng khi có deal tốt.',
    comboPromoOffer: 'Mua Gel rửa mặt Stop AKN 200ml tặng Kem dưỡng kiềm dầu mini 15ml trị giá 145K',
    saleMilestones: 'W1: 01-05/10 Teasing | W2: 10.10 Mega Sale | W3: 20.10 | W4: Payday 25.10',
    keyVisualSpec: {
      theme: 'Clinical Matte Green — Chuẩn Da Liễu Tây Ban Nha Kiềm Dầu 12H',
      fonts: 'Helvetica Neue Bold / Inter',
      moodboard: 'Tone trắng dược mỹ phẩm kết hợp xanh ngọc Stop AKN tối giản, chuyên nghiệp',
      proposalUrl: 'https://upbase.vn/kv-proposals/babe-stopakn-10.pdf',
      promoTextOnKv: 'MUA FULLSIZE TẶNG MINISIZE 145K DUY NHẤT THÁNG 10',
      refDate: '2026-09-22',
      orderDate: '2026-09-25',
      hangDate: '2026-09-30',
      kvPic: 'Phạm Quốc Bảo'
    },
    monthlyPhases: [
      {
        month: '2026/10',
        phaseName: 'Chiến dịch trọn gói Tháng 10: Mega Sale 10.10 & Payday 25.10',
        allocatedBudget: 150000000,
        spentBudget: 48000000,
        targetGmv: 950000000,
        actualGmv: 320000000,
        targetKocCount: 25,
        saleMilestones: 'W2: 10.10 Mega Sale | W3: 20.10 | W4: Payday 25.10',
        kvAdaptNotes: 'Sử dụng bộ KV Clinical Matte Green xuyên suốt tháng 10'
      }
    ]
  },
  {
    id: 'camp-5',
    code: 'CAMP-ROYAL-AUSNZ',
    title: 'Chiến Dịch Sữa Hoàng Gia Úc Q4 — Phát Triển Chiều Cao & Đề Kháng (2 Tháng)',
    brand: 'Royal Ausnz',
    targetAudience: 'Mẹ bầu và trẻ nhỏ cần bổ sung canxi tự nhiên và dinh dưỡng tinh khiết.',
    bigIdea: '20 Phút Vàng — Giọt Sữa Tươi Tinh Khiết Từ Nước Úc',
    keyMessage: 'Sữa công thức hoàng gia Úc nguyên chất đạt tiêu chuẩn cao cấp quốc tế',
    heroSkus: ['SKU-ROYAL-PREMIUM-900G'],
    targetCir: 14.5,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Nguyễn Thị Thu Hà',
    kvPic: 'Lê Hoàng Nam',
    budget: 200000000,
    spentBudget: 75000000,
    targetGmv: 1500000000,
    currentGmv: 580000000,
    targetKocCount: 25,
    bookedKocCount: 16,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    coveredMonths: ['2026/10', '2026/11'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Royal Ausnz TikTok', 'Royal Ausnz Shopee'],
    roleInYearPlan: 'Chiến dịch Q4 xuyên suốt 2 tháng cao điểm 10.10 và 11.11 thúc đẩy khách mua theo thùng/combo.',
    objectivesAndBarriers: 'Mục tiêu: Tăng tỷ lệ mua lặp lại và AOV lên trên 1.2 triệu/đơn. Rào cản: Thời gian cân nhắc đổi sữa của mẹ bỉm khá dài.',
    seasonalOpportunity: 'Các đợt siêu sale cuối năm 10.10 & 11.11 là thời điểm các mẹ mua tích trữ sữa lon lớn với ưu đãi quà tặng cao.',
    comboPromoOffer: 'Mua 2 lon 900g tặng 1 lon 400g cùng loại + Voucher giảm 120K',
    saleMilestones: 'T10: 10.10 & 25.10 | T11: 11.11 Mega Sale & Black Friday 27.11',
    keyVisualSpec: {
      theme: 'Royal Gold Standard — Chuẩn Hoàng Gia Úc 160 Năm',
      fonts: 'Playfair Display Bold / Inter',
      moodboard: 'Tone vàng Royal Gold sang trọng kết hợp xanh dương đậm và đồng cỏ Úc',
      proposalUrl: 'https://upbase.vn/kv-proposals/royal-ausnz-q4.pdf',
      promoTextOnKv: 'MUA 2 LON 900G TẶNG 1 LON 400G',
      refDate: '2026-09-20',
      orderDate: '2026-09-24',
      hangDate: '2026-09-30',
      kvPic: 'Lê Hoàng Nam'
    },
    monthlyPhases: [
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 1: Trải Nghiệm Chuẩn Sữa Hoàng Gia & Bùng Nổ 10.10',
        allocatedBudget: 95000000,
        spentBudget: 75000000,
        targetGmv: 700000000,
        actualGmv: 580000000,
        targetKocCount: 12,
        saleMilestones: 'W2: 10.10 Mega Sale | W4: Payday 25.10',
        kvAdaptNotes: 'KV nhấn mạnh công nghệ 20 phút vàng & quà tặng lon 400g'
      },
      {
        month: '2026/11',
        phaseName: 'Giai đoạn 2: Tích Trữ Cuối Năm Đại Tiệc 11.11 & Black Friday',
        allocatedBudget: 105000000,
        spentBudget: 0,
        targetGmv: 800000000,
        actualGmv: 0,
        targetKocCount: 13,
        saleMilestones: 'W2: 11.11 Mega Sale | W4: Black Friday 27.11',
        kvAdaptNotes: 'Adapt KV sang Combo 4 lon tặng xe chòi chân cao cấp'
      }
    ]
  },
  {
    id: 'camp-6',
    code: 'CAMP-BBB-ACNECARE',
    title: 'Chiến Dịch Sạch Mụn Tự Tin Bye Bye Blemish Tea Tree (2 Tháng)',
    brand: 'Bye Bye Blemish',
    targetAudience: 'Học sinh sinh viên có mụn viêm cấp tốc cần xử lý qua đêm.',
    bigIdea: 'Gom Cồi Mụn Cấp Tốc Sau 1 Đêm',
    keyMessage: 'Tràm trà tự nhiên làm dịu nhanh không để lại thâm sẹo',
    heroSkus: ['SKU-BBB-TEATREE-30ML'],
    targetCir: 16.0,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Trần Minh Trang',
    kvPic: 'Phạm Quốc Bảo',
    budget: 120000000,
    spentBudget: 65000000,
    targetGmv: 850000000,
    currentGmv: 480000000,
    targetKocCount: 20,
    bookedKocCount: 12,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-09-10',
    endDate: '2026-10-25',
    coveredMonths: ['2026/09', '2026/10'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Bye Bye Blemish TikTok'],
    roleInYearPlan: 'Chiến dịch tăng nhận diện tại tệp Gen Z mùa tựu trường Tháng 9 - Tháng 10.',
    objectivesAndBarriers: 'Mục tiêu: Đẩy mạnh lọ chấm mụn 2 lớp. Rào cản: Khách hàng hay lắc đều lọ chấm mụn làm giảm hiệu quả.',
    seasonalOpportunity: 'Mùa tựu trường & chụp kỷ yếu tháng 9-10 nhu cầu xử lý mụn cấp tốc tăng cao.',
    comboPromoOffer: 'Mua Chấm mụn Drying Lotion tặng Miếng dán mụn 24 miếng',
    saleMilestones: 'T9: 9.9 & 25.09 | T10: 10.10 & 20.10',
    keyVisualSpec: {
      theme: 'Overnight Spot Eraser — Chấm Đêm Nay, Sáng Mai Xẹp Mụn',
      fonts: 'Poppins Bold / Inter',
      moodboard: 'Tone xanh tràm trà & hồng phấn tách lớp đặc trưng của Drying Lotion',
      proposalUrl: 'https://upbase.vn/kv-proposals/bbb-acnecare-kv.pdf',
      promoTextOnKv: 'CHẤM MỤN QUA ĐÊM - TẶNG MIẾNG DÁN MỤN 69K',
      refDate: '2026-09-02',
      orderDate: '2026-09-05',
      hangDate: '2026-09-09',
      kvPic: 'Phạm Quốc Bảo'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Giai đoạn 1: Hướng Dẫn Dùng Đúng Cách Không Lắc Lọ Chấm Mụn',
        allocatedBudget: 55000000,
        spentBudget: 45000000,
        targetGmv: 380000000,
        actualGmv: 310000000,
        targetKocCount: 9,
        saleMilestones: 'W2: 9.9 | W4: 25.09',
        kvAdaptNotes: 'KV nhấn mạnh visual tách 2 lớp dung dịch'
      },
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 2: Đẩy Đơn Combo Chấm Mụn + Miếng Dán Mụn 10.10',
        allocatedBudget: 65000000,
        spentBudget: 20000000,
        targetGmv: 470000000,
        actualGmv: 170000000,
        targetKocCount: 11,
        saleMilestones: 'W2: 10.10 | W3: 20.10',
        kvAdaptNotes: 'Adapt KV sang Combo Mua 1 Tặng 1 dịp 10.10'
      }
    ]
  },
  {
    id: 'camp-7',
    code: 'CAMP-PHCARE-FOAM10',
    title: 'Chiến Dịch Bọt Mịn Dịu Nhẹ pH Care — Dịu Êm Ngày Nhạy Cảm (Template 1 Sheet)',
    brand: 'pH Care',
    targetAudience: 'Phụ nữ trẻ 18-32 tuổi (sinh viên, dân văn phòng), nhạy cảm với mùi hương nồng, ưu tiên kết cấu bọt mịn tiện lợi.',
    bigIdea: 'Độ pH Chuẩn 5.0 & Bọt Mịn Sẵn Sàng — Dịu Êm Suốt 24H',
    keyMessage: 'Dung dịch vệ sinh dạng bọt pH Care Nhật Bản pH 5.0 làm sạch dịu nhẹ, kháng khuẩn & khử mùi suốt ngày dài',
    heroSkus: ['SKU-PHCARE-FOAM-150ML', 'SKU-PHCARE-COOL-150ML'],
    targetCir: 15.5,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Nguyễn Thị Thu Hà',
    kvPic: 'Lê Hoàng Nam',
    budget: 145000000,
    spentBudget: 45000000,
    targetGmv: 920000000,
    currentGmv: 310000000,
    targetKocCount: 28,
    bookedKocCount: 16,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-10-01',
    endDate: '2026-11-15',
    coveredMonths: ['2026/10', '2026/11'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['pH Care Official TikTok', 'pH Care Official Shopee'],
    roleInYearPlan: 'Chiến dịch trọng điểm Q4 chuyển dịch người dùng từ dạng gel truyền thống sang Hero SKU Dạng Bọt (Foam) biên lợi nhuận cao.',
    objectivesAndBarriers: 'Mục tiêu: Dòng Bọt chiếm 45% tổng GMV gian hàng. Rào cản: Người dùng nghĩ dạng bọt nhanh hết hơn dạng gel.',
    seasonalOpportunity: 'Tháng 10 có ngày Phụ nữ Việt Nam 20/10 & Siêu sale 10.10, phù hợp đẩy thông điệp yêu bản thân và combo quà tặng phái đẹp.',
    comboPromoOffer: 'Combo 2 chai pH Care Bọt Mịn giảm 25% + Tặng 1 chai mini 50ml bỏ túi & Túi đựng mỹ phẩm chống nước',
    saleMilestones: 'W1: Warm-up 01-08/10 | W2: Mega Sale 10.10 | W3: Quà tặng 20.10 | W4: Payday 25.10',
    keyVisualSpec: {
      theme: 'Soft Cloud Foam 5.0 — Đám Mây Bọt Mịn Nâng Niu Phái Đẹp',
      fonts: 'Plus Jakarta Sans Bold / Inter Regular',
      moodboard: 'Tone hồng pastel & xanh mint mát lạnh, hiệu ứng đám mây bọt mịn bồng bềnh cùng hoa cúc La Mã',
      proposalUrl: 'https://upbase.vn/kv-proposals/phcare-foam-10-2026.pdf',
      promoTextOnKv: 'COMBO BỌT MỊN NHẬT BẢN GIẢM 25% + QUÀ TẶNG 20/10',
      refDate: '2026-09-20',
      orderDate: '2026-09-23',
      hangDate: '2026-09-30',
      kvPic: 'Lê Hoàng Nam'
    },
    monthlyPhases: [
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 1: Ra Mắt Hero SKU Dạng Bọt & Đỉnh Sale 10.10 - 20.10',
        allocatedBudget: 90000000,
        spentBudget: 45000000,
        targetGmv: 580000000,
        actualGmv: 310000000,
        targetKocCount: 18,
        saleMilestones: 'W2: 10.10 Mega Sale | W3: 20.10 Ngày Phụ Nữ VN | W4: Payday 25.10',
        kvAdaptNotes: 'Treo bộ KV Soft Cloud Foam 5.0 & Banner quà tặng 20/10 trên cả Shopee và TikTok Shop'
      },
      {
        month: '2026/11',
        phaseName: 'Giai đoạn 2: Tối Ưu Mua Lặp Lại & Combo Tiết Kiệm Dịp 11.11',
        allocatedBudget: 55000000,
        spentBudget: 0,
        targetGmv: 340000000,
        actualGmv: 0,
        targetKocCount: 10,
        saleMilestones: 'W1-W2: Siêu Sale 11.11 | W4: Payday 25.11',
        kvAdaptNotes: 'Adapt KV nhấn mạnh bài toán kinh tế: 1 chai bọt = 300 lần nhấn dùng 3 tháng'
      }
    ]
  },
  {
    id: 'camp-8',
    code: 'CAMP-CLIO-MEGA10',
    title: 'Chiến Dịch ClubClio K-Beauty Glow — Bùng Nổ Cushion & Tint 10.10 (1 Tháng)',
    brand: 'ClubClio',
    targetAudience: 'Nữ 18-30 tuổi yêu thích trang điểm chuẩn Hàn, săn deal Cushion Kill Cover và son Peripera.',
    bigIdea: 'Lớp Nền Chuẩn Idol Hàn — Bền Màu Suốt 54 Giờ',
    keyMessage: 'Cushion Clio Kill Cover Thế Hệ Mới che phủ mỏng nhẹ, kiềm dầu suốt ngày dài',
    heroSkus: ['SKU-CLIO-CUSHION-02', 'SKU-CLIO-MASCARA-01'],
    targetCir: 16.5,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Trần Minh Trang',
    kvPic: 'Phạm Quốc Bảo',
    budget: 280000000,
    spentBudget: 135000000,
    targetGmv: 1950000000,
    currentGmv: 980000000,
    targetKocCount: 38,
    bookedKocCount: 26,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    coveredMonths: ['2026/10'],
    durationMonthsCount: 1,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['ClubClio TikTok', 'ClubClio Shopee'],
    roleInYearPlan: 'Chiến dịch 1 tháng cao điểm Tháng 10 dành riêng cho Mega Sale 10.10 &禮 20.10.',
    objectivesAndBarriers: 'Mục tiêu: Đạt 1.95 tỷ GMV trên 2 sàn. Rào cản: Khách phân vân chọn tone màu Cushion khi mua online.',
    seasonalOpportunity: 'Tháng 10 mùa tiệc tùng, kỷ yếu và quà tặng 20/10 khiến nhu cầu mua sắm mỹ phẩm trang điểm tăng mạnh.',
    comboPromoOffer: 'Mua Cushion Kill Cover kèm lõi phụ giảm 30% + Tặng son tint mini & Bông mút cao cấp',
    saleMilestones: 'W1: Swatch Tone Week | W2: 10.10 Mega Sale | W3: 20.10 Gift Box | W4: Payday 25.10',
    keyVisualSpec: {
      theme: 'Seoul Glass & Velvet — Hộp Quà Trang Điểm Chuẩn Hàn Tháng 10',
      fonts: 'Pretendard Bold / Montserrat',
      moodboard: 'Tone đen nhám sang trọng kết hợp hồng rose gold thời thượng',
      proposalUrl: 'https://upbase.vn/kv-proposals/clubclio-oct-2026.pdf',
      promoTextOnKv: 'DEAL ĐỘC QUYỀN 10.10 - MUA 1 TẶNG 3 QUÀ FULL-EXPERIENCE',
      refDate: '2026-09-21',
      orderDate: '2026-09-24',
      hangDate: '2026-09-30',
      kvPic: 'Phạm Quốc Bảo'
    },
    monthlyPhases: [
      {
        month: '2026/10',
        phaseName: 'Chiến dịch 1 tháng: Mega Sale 10.10 & Quà Tặng Phái Đẹp 20.10',
        allocatedBudget: 280000000,
        spentBudget: 135000000,
        targetGmv: 1950000000,
        actualGmv: 980000000,
        targetKocCount: 38,
        saleMilestones: 'W2: 10.10 Mega Sale | W3: 20.10 Gift Set | W4: Payday 25.10',
        kvAdaptNotes: 'Bộ KV Seoul Glass & Velvet + Bảng quy đổi tone da trực quan trên ảnh bìa PDP'
      }
    ]
  },
  {
    id: 'camp-9',
    code: 'CAMP-EUPC-WELLNESS',
    title: 'Chiến Dịch Sức Khỏe Gia Đình Cùng EUPC (2 Tháng)',
    brand: 'EUPC',
    targetAudience: 'Gia đình trẻ chăm sóc sức khỏe dinh dưỡng mỗi ngày.',
    bigIdea: 'Dinh Dưỡng Vàng Chuẩn Châu Âu',
    keyMessage: 'Bảo vệ hệ miễn dịch cả nhà với vi chất hữu cơ cao cấp',
    heroSkus: ['SKU-EUPC-DAILY-60CAPS'],
    targetCir: 16.5,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Nguyễn Thị Thu Hà',
    kvPic: 'Lê Hoàng Nam',
    budget: 110000000,
    spentBudget: 50000000,
    targetGmv: 750000000,
    currentGmv: 340000000,
    targetKocCount: 18,
    bookedKocCount: 10,
    status: 'ACTIVE',
    briefStatus: 'IN_PRODUCTION',
    startDate: '2026-09-15',
    endDate: '2026-10-30',
    coveredMonths: ['2026/09', '2026/10'],
    durationMonthsCount: 2,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['EUPC TikTok', 'EUPC Shopee'],
    roleInYearPlan: 'Chiến dịch mở rộng tệp khách hàng gia đình trong Q3-Q4.',
    objectivesAndBarriers: 'Mục tiêu: Tăng 25% khách hàng mới. Rào cản: Nhận diện thương hiệu mới.',
    seasonalOpportunity: 'Giao mùa thu đông nhu cầu bổ sung vitamin tổng hợp tăng.',
    comboPromoOffer: 'Mua 2 hộp giảm 20% + Tặng hộp chia thuốc 7 ngày',
    saleMilestones: 'T9: 25.09 | T10: 10.10 & 25.10',
    keyVisualSpec: {
      theme: 'European Family Shield — Vi Chất Chuẩn Châu Âu Cho Cả Gia Đình',
      fonts: 'Inter Bold / Inter Regular',
      moodboard: 'Tone xanh dương y khoa và vàng cam năng lượng',
      proposalUrl: 'https://upbase.vn/kv-proposals/eupc-wellness.pdf',
      promoTextOnKv: 'COMBO GIA ĐÌNH GIẢM 20% + QUÀ TẶNG TIỆN ÍCH',
      refDate: '2026-09-05',
      orderDate: '2026-09-08',
      hangDate: '2026-09-14',
      kvPic: 'Lê Hoàng Nam'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Giai đoạn 1: Giới Thiệu Vi Chất Châu Âu & Seeding Chuyên Gia',
        allocatedBudget: 45000000,
        spentBudget: 30000000,
        targetGmv: 300000000,
        actualGmv: 210000000,
        targetKocCount: 8,
        saleMilestones: 'W4: Payday 25.09'
      },
      {
        month: '2026/10',
        phaseName: 'Giai đoạn 2: Tăng Tốc Doanh Số Nhịp 10.10',
        allocatedBudget: 65000000,
        spentBudget: 20000000,
        targetGmv: 450000000,
        actualGmv: 130000000,
        targetKocCount: 10,
        saleMilestones: 'W2: 10.10 Mega Sale | W4: Payday 25.10'
      }
    ]
  },
  {
    id: 'camp-10',
    code: 'CAMP-CURE-PEELING',
    title: 'Chiến Dịch Tẩy Tế Bào Chết Dịu Nhẹ Chuẩn Nhật Cure Natural (1 Tháng)',
    brand: 'Cure Natural',
    targetAudience: 'Người có da nhạy cảm cần làm sạch tế bào chết không chà xát.',
    bigIdea: '91% Nước Tinh Khiết Kích Hoạt — Tẩy Da Chết Số 1 Nhật Bản',
    keyMessage: 'Làm sạch nhẹ nhàng lớp sừng già cỗi, làn da mịn màng mộc mạc',
    heroSkus: ['SKU-CURE-AQUA-250G'],
    targetCir: 15.0,
    contentPic: 'Quỳnh Như',
    brandStrategyPic: 'Trần Minh Trang',
    kvPic: 'Phạm Quốc Bảo',
    budget: 130000000,
    spentBudget: 85000000,
    targetGmv: 900000000,
    currentGmv: 640000000,
    targetKocCount: 20,
    bookedKocCount: 18,
    status: 'COMPLETED',
    briefStatus: 'COMPLETED',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    coveredMonths: ['2026/09'],
    durationMonthsCount: 1,
    platforms: ['TikTok Shop', 'Shopee'],
    targetStores: ['Cure Natural TikTok'],
    roleInYearPlan: 'Chiến dịch 1 tháng đẩy mạnh doanh số dịp 9.9 (Tháng 10 chuyển sang chế độ Duy trì / Không có Campaign).',
    objectivesAndBarriers: 'Mục tiêu: Đạt 900 triệu GMV trong tháng 9.',
    seasonalOpportunity: 'Nhu cầu tẩy da chết phục hồi da sau mùa hè nắng gắt.',
    comboPromoOffer: 'Mua 1 chai Cure 250g tặng 3 gói sample du lịch + Voucher 30K',
    saleMilestones: 'W2: 9.9 Mega Sale | W4: Payday 25.09',
    keyVisualSpec: {
      theme: 'Pure Water Aqua Gel — 91% Nước Tinh Khiết Nhật Bản',
      fonts: 'Noto Sans Bold',
      moodboard: 'Tone xanh nước biển trong suốt tối giản',
      proposalUrl: 'https://upbase.vn/kv-proposals/cure-sep-2026.pdf',
      promoTextOnKv: 'SỐ 1 NHẬT BẢN - TẶNG BỘ KIT DU LỊCH',
      refDate: '2026-08-22',
      orderDate: '2026-08-25',
      hangDate: '2026-08-31',
      kvPic: 'Phạm Quốc Bảo'
    },
    monthlyPhases: [
      {
        month: '2026/09',
        phaseName: 'Chiến dịch trọn gói Tháng 9: Phục Hồi Da Sau Hè 9.9',
        allocatedBudget: 130000000,
        spentBudget: 85000000,
        targetGmv: 900000000,
        actualGmv: 640000000,
        targetKocCount: 20,
        saleMilestones: 'W2: 9.9 Mega Sale | W4: Payday 25.09'
      }
    ]
  }
];

export const INITIAL_BRAND_GUIDELINES: BrandGuidelineAsset[] = [
  {
    id: 'bg-senka',
    brandName: 'Senka',
    category: 'Chăm Sóc Da / Sữa Rửa Mặt & Tẩy Trang',
    colorTheme: 'bg-blue-600 ',
    toneOfVoice: 'Chuyên gia Nhật Bản, nhẹ nhàng, trong trẻo, khoa học nhưng gần gũi với học sinh sinh viên.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    logoRules: 'Logo Senka phải hiển thị rõ nét góc trên bên phải trong 3 giây đầu tiên và xuất hiện cùng sản phẩm thực tế.',
    visualDoList: [
      'Bọt tơ tằm trắng mịn tạo khối dày xốp trên lòng bàn tay',
      'Cận cảnh làn da mộc sạch thoáng, mềm ẩm sau khi rửa',
      'Ánh sáng tự nhiên ban ngày, không gian phòng tắm tối giản kiểu Nhật'
    ],
    visualDontList: [
      'Không dùng filter làm mịn da giả tạo hoặc mờ nhòe bọt sữa rửa mặt',
      'Không so sánh tiêu cực hoặc đặt cạnh sản phẩm của Hada Labo, Biore',
      'Không tuyên bố "hết sạch mụn 100%" hay "trị dứt điểm"'
    ],
    blacklistKeywords: [
      {
        id: 'bl-1',
        keyword: 'Trị dứt điểm mụn / thâm',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Vi phạm luật quảng cáo mỹ phẩm Bộ Y Tế (Mỹ phẩm không có chức năng điều trị dứt điểm bệnh lý da liễu).',
        alternativeSuggestion: 'Hỗ trợ làm sạch sâu bã nhờn, giúp ngừa mụn quay trở lại'
      },
      {
        id: 'bl-2',
        keyword: '100% không kích ứng',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Cấm cam kết tuyệt đối 100% trong truyền thông dược mỹ phẩm.',
        alternativeSuggestion: 'Công thức dịu nhẹ đã được kiểm nghiệm da liễu an toàn'
      },
      {
        id: 'bl-3',
        keyword: 'Tốt hơn Biore / Hada Labo',
        category: 'COMPETITOR',
        severity: 'COMPETITOR_WARNING',
        rationale: 'Vi phạm quy chuẩn cấm dìm hàng đối thủ trực tiếp.',
        alternativeSuggestion: 'Bọt dày xốp gấp 5 lần so với sữa rửa mặt thông thường'
      }
    ],
    heroSkus: [
      {
        id: 'sku-senka-whip',
        skuCode: 'SKU-SNK-WHIP-120G',
        name: 'Sữa Rửa Mặt Tạo Bọt Tơ Tằm Senka Perfect Whip 120g',
        category: 'Cleanser',
        uspBulletPoints: [
          'Hạt bọt siêu nhỏ Micro Bubbles len lỏi làm sạch bụi mịn PM 2.5',
          'Gấp đôi Hyaluronic Acid giữ ẩm sâu, không căng rát sau rửa',
          'Chiết xuất tơ tằm trắng Mayu Haku Nhật Bản độc quyền'
        ],
        clinicalClaims: 'Được kiểm nghiệm da liễu lâm sàng tại Nhật Bản, 96% người dùng cảm nhận da mềm mịn sau 7 ngày.',
        pdpUrl: 'https://www.tiktok.com/@senkavietnam_official/product/1729481920',
        sampleStockCount: 150,
        priceVnd: 115000
      },
      {
        id: 'sku-senka-water',
        skuCode: 'SKU-SNK-MICELLAR-500ML',
        name: 'Nước Tẩy Trang Sạch Sâu Giảm Mụn Senka All Clear Water 500ml',
        category: 'Makeup Remover',
        uspBulletPoints: [
          'Công nghệ Micellar hút sạch 99% lớp trang điểm lâu trôi',
          'Chiết xuất trà xanh Uji Kyoto kiềm dầu, chống oxy hóa',
          'Không cồn, không dầu khoáng, không hương liệu nhân tạo'
        ],
        clinicalClaims: 'Chứng minh giảm dầu thừa 82% sau 4 giờ sử dụng.',
        pdpUrl: 'https://www.tiktok.com/@senkavietnam_official/product/1729481921',
        sampleStockCount: 80,
        priceVnd: 145000
      }
    ]
  },
  {
    id: 'bg-kutieskin',
    brandName: 'Kutieskin',
    category: 'Mẹ & Bé / Kem Bôi Da Trẻ Em',
    colorTheme: 'bg-pink-500 ',
    toneOfVoice: 'Ấm áp, đồng cảm, chuyên môn y khoa nhẹ nhàng, mẹ bỉm thông thái tin dùng.',
    toneTag: 'MẸ_BỈM_CHÂN_THỰC',
    logoRules: 'Logo Kutieskin kèm linh vật chú gấu nhỏ góc trái màn hình, màu sắc ấm cúng.',
    visualDoList: [
      'Cảnh mẹ chăm sóc, massage thoa kem cho bé lúc tắm xong hoặc trước khi ngủ',
      'Cận cảnh chất kem thẩm thấu nhanh, không bết dính trên da em bé',
      'Chứng nhận hữu cơ Cosmos Organic và tem chống hàng giả'
    ],
    visualDontList: [
      'Không để bé khóc to hoặc hoảng sợ trong khung hình',
      'Tuyệt đối không so sánh với các loại kem trộn, kem chứa Corticoid',
      'Không cam kết "khỏi chàm sữa sau 1 lần bôi"'
    ],
    blacklistKeywords: [
      {
        id: 'bl-kuti-1',
        keyword: 'Chữa khỏi chàm sữa 100%',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Chàm sữa là viêm da cơ địa mạn tính, không được dùng từ chữa khỏi 100%.',
        alternativeSuggestion: 'Làm dịu nhanh mẩn ngứa, dưỡng ẩm phục hồi hàng rào bảo vệ da bé'
      },
      {
        id: 'bl-kuti-2',
        keyword: 'Chứa Corticoid trị nhanh',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Kutieskin là thảo dược hữu cơ không chứa Corticoid, cấm liên hệ gây hiểu lầm.',
        alternativeSuggestion: 'Thảo dược tự nhiên Aminovector nhập khẩu từ Pháp, an toàn lành tính'
      }
    ],
    heroSkus: [
      {
        id: 'sku-kuti-kemboirot',
        skuCode: 'SKU-KUTI-SOOTHING-30G',
        name: 'Kem Bôi Dịu Da Mẩn Ngứa Trẻ Em Kutieskin 30g',
        category: 'Baby Skincare',
        uspBulletPoints: [
          'Chiết xuất Yến Mạch & Bơ Shea làm dịu ngứa, hăm tã sau 24h',
          'Công nghệ kháng viêm thảo dược Aminovector từ Pháp',
          'Không Corticoid, không Paraben, dùng an toàn cho trẻ sơ sinh từ 5 ngày tuổi'
        ],
        clinicalClaims: 'Đạt chứng nhận Organic Cosmos Châu Âu và chứng nhận kiểm nghiệm Viện Da Liễu.',
        pdpUrl: 'https://www.tiktok.com/@kutieskin_official/product/182940192',
        sampleStockCount: 220,
        priceVnd: 98000
      }
    ]
  },
  {
    id: 'bg-naturesway',
    brandName: "Nature's Way",
    category: 'Thực Phẩm Bảo Vệ Sức Khỏe Trẻ Em & Gia Đình',
    colorTheme: 'bg-emerald-600 ',
    toneOfVoice: 'Chuẩn Úc, khoa học, uy tín số 1 về vitamin trẻ em, bảo chứng chất lượng.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    logoRules: 'Logo Nature\'s Way hình chiếc lá xanh và cờ Úc góc trên bên phải.',
    visualDoList: [
      'Bé hào hứng ăn kẹo dẻo gummie hoặc uống siro vị ngon',
      'Hộp sản phẩm có tem chống giả tích hợp mã QR truy xuất nguồn gốc',
      'Hình ảnh gia đình vận động khỏe khoắn ngoài trời'
    ],
    visualDontList: [
      'Cấm gọi là "Thuốc" (Nature\'s Way là TPCN/Bổ sung vi chất, không phải thuốc)',
      'Không cam kết "uống vào tăng ngay 5cm chiều cao hoặc 2kg trong 1 tháng"',
      'Không quay cảnh bé bị ép uống thuốc'
    ],
    blacklistKeywords: [
      {
        id: 'bl-nw-1',
        keyword: 'Thuốc bổ tăng chiều cao / Thuốc trị biếng ăn',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Vi phạm nghiêm trọng phân loại TPCN. Bắt buộc gọi là Thực phẩm bảo vệ sức khỏe hoặc Viên nhai/Siro.',
        alternativeSuggestion: 'Sản phẩm hỗ trợ bổ sung Canxi & Vitamin D3 giúp xương răng chắc khỏe'
      },
      {
        id: 'bl-nw-2',
        keyword: 'Uống vào tăng ngay 2-3kg',
        category: 'SENSITIVE_POLICY',
        severity: 'CRITICAL_BANNED',
        rationale: 'Cam kết sai sự thật bị cấm hoàn toàn trên TikTok Shop & Dược phẩm.',
        alternativeSuggestion: 'Giúp bé ăn ngon miệng tự nhiên và hấp thu dưỡng chất tốt hơn'
      }
    ],
    heroSkus: [
      {
        id: 'sku-nw-vita-gummies',
        skuCode: 'SKU-NW-GUMMIES-60V',
        name: 'Kẹo Dẻo Bổ Sung Kẽm & Vitamin C Nature\'s Way Kids Smart 60 viên',
        category: 'Supplements',
        uspBulletPoints: [
          'Thương hiệu số 1 tại Úc về dòng sản phẩm chăm sóc sức khỏe trẻ em',
          'Vị dâu cam tự nhiên chua ngọt thơm ngon, bé thích thú tự giác ăn',
          'Tăng cường miễn dịch, kích thích vị giác giúp bé ăn ngon tự nhiên'
        ],
        clinicalClaims: 'Nhập khẩu chính ngạch 100% từ Úc, đầy đủ giấy phép công bố Cục An Toàn Thực Phẩm.',
        pdpUrl: 'https://www.tiktok.com/@natureswayvn/product/182940888',
        sampleStockCount: 95,
        priceVnd: 280000
      }
    ]
  },
  {
    id: 'bg-babe',
    brandName: 'Babe',
    category: 'Dược Mỹ Phẩm Trị Mụn & Phục Hồi Chuyên Sâu',
    colorTheme: 'bg-amber-600 ',
    toneOfVoice: 'Dược mỹ phẩm Châu Âu, tối giản khoa học, kê đơn chuẩn da liễu Tây Ban Nha.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    logoRules: 'Logo Laboratorios BABÉ phong cách tối giản y tế góc trên.',
    visualDoList: [
      'Texture gel rửa mặt tạo bọt mịn trong suốt, độ pH 5.0 chuẩn da liễu',
      'Bác sĩ hoặc KOC có kiến thức Skincare phân tích thành phần Niacinamide, Salicylic Acid',
      'Đo độ ẩm và bã nhờn bằng máy soi da trước và sau'
    ],
    visualDontList: [
      'Không dùng từ "hết mụn sau 1 đêm"',
      'Không so sánh với SVR hay La Roche-Posay dạng bôi nhọ',
      'Không quay cảnh nặn mụn chảy máu ghê rợn'
    ],
    blacklistKeywords: [
      {
        id: 'bl-babe-1',
        keyword: 'Trị mụn cấp tốc sau 1 đêm',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Cam kết sai khoa học, dễ dẫn tới khiếu nại khách hàng và TikTok bóp reach.',
        alternativeSuggestion: 'Giảm sưng viêm gom cồi mụn sau 48-72 giờ sử dụng đúng phác đồ'
      }
    ],
    heroSkus: [
      {
        id: 'sku-babe-stop-akn',
        skuCode: 'SKU-BABE-STOPAKN-200ML',
        name: 'Gel Rửa Mặt Giảm Mụn Kiềm Dầu Babe Stop Akn Purifying Cleansing Gel 200ml',
        category: 'Dermocosmetics',
        uspBulletPoints: [
          'Chứa phức hợp Cytobiol Iris kiềm dầu và kháng viêm mụn',
          'Salicylic Acid 0.5% thông thoáng lỗ chân lông không gây khô căng',
          'Độ pH chuẩn 5.0 tôn trọng hệ vi sinh vật tự nhiên trên da'
        ],
        clinicalClaims: 'Kiểm nghiệm lâm sàng tại Tây Ban Nha: 91% giảm bã nhờn, 84% giảm mụn viêm sau 28 ngày.',
        pdpUrl: 'https://www.tiktok.com/@babe_vietnam/product/182940999',
        sampleStockCount: 110,
        priceVnd: 349000
      }
    ]
  },
  {
    id: 'bg-bioessence',
    brandName: 'Bio-Essence',
    category: 'Mỹ Phẩm Chống Lão Hóa Vàng 24K',
    colorTheme: 'bg-amber-500 ',
    toneOfVoice: 'Sang trọng, quý phái, công nghệ sinh học Bio-Energy Complex kích hoạt làn da.',
    toneTag: 'SANG_TRỌNG_CAO_CẤP',
    logoRules: 'Logo Bio-Essence ánh kim trên nền tối trang nhã.',
    visualDoList: [
      'Cận cảnh vảy vàng 24K óng ánh tan chảy khi thoa lên gò má',
      'Độ bóng khỏe mọng nước Glass-Skin của phụ nữ trưởng thành',
      'Trang phục trang nhã, ánh sáng ấm áp sang trọng'
    ],
    visualDontList: [
      'Không quay cảnh lem luốc hoặc bôi trét cẩu thả',
      'Không so sánh với vàng giả hay tuyên bố cải lão hoàn đồng vô lý'
    ],
    blacklistKeywords: [
      {
        id: 'bl-bio-1',
        keyword: 'Trẻ hóa 10 tuổi ngay tức thì',
        category: 'SENSITIVE_POLICY',
        severity: 'CRITICAL_BANNED',
        rationale: 'Vi phạm chính sách tuyên bố quá đà về sản phẩm chống lão hóa.',
        alternativeSuggestion: 'Kích hoạt độ đàn hồi, giúp da căng bóng và làm mờ nếp nhăn li ti'
      }
    ],
    heroSkus: [
      {
        id: 'sku-bio-gold-water',
        skuCode: 'SKU-BIO-GOLD-100ML',
        name: 'Nước Thần Phục Hồi Chống Lão Hóa Bio-Gold Rose Gold Water 100ml',
        category: 'Anti-Aging',
        uspBulletPoints: [
          'Vàng 24K sinh học nguyên chất 98% tăng cường chống oxy hóa',
          'Công nghệ độc quyền Bio-Energy Complex tăng khả năng hấp thu oxy cho tế bào',
          'Se khít lỗ chân lông, dưỡng da sáng hồng rạng rỡ'
        ],
        clinicalClaims: 'Tăng cường tái tạo collagen lên 28% sau 14 ngày.',
        pdpUrl: 'https://www.tiktok.com/@bioessencevn/product/182940777',
        sampleStockCount: 75,
        priceVnd: 420000
      }
    ]
  }
];

export const INITIAL_BRAND_APPROVAL_QUEUE: BrandApprovalQueueItem[] = [
  {
    id: 'baq-1',
    dealCode: 'BO260757834',
    brandName: 'Kutieskin',
    kocName: 'Bác Sĩ Da Liễu Nguyên',
    kocChannel: '@drnguyendalieu',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop',
    salaryGrade: 'KL4',
    quoteNet: 4500000,
    tepKenh: 'Bác sỹ/chuyên gia',
    submissionRound: 'ROUND_1_KOC',
    submittedBy: 'Khánh Vy',
    submittedAt: '2026-09-24 14:30',
    remainingSlaHours: 18.5,
    status: 'PENDING'
  },
  {
    id: 'baq-2',
    dealCode: 'BO260757719',
    brandName: 'Senka',
    kocName: 'Chanh Beauty Review',
    kocChannel: '@chanhbeauty',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
    salaryGrade: 'KL3',
    quoteNet: 2800000,
    tepKenh: 'Review Nữ',
    submissionRound: 'ROUND_2_SCRIPT',
    submittedBy: 'Trần Anh Thư',
    submittedAt: '2026-09-24 16:15',
    remainingSlaHours: 21.0,
    scriptContent: {
      hook: 'Test camera UV thực tế 8 tiếng ngoài trời: Sữa rửa mặt tạo bọt tơ tằm Senka có làm sạch hết cặn kem chống nắng bám sâu không?',
      pain: 'Hầu hết mọi người chỉ rửa mặt qua loa 10 giây, cặn kem chống nắng và bụi mịn PM 2.5 tích tụ làm bít tắc sinh mụn ẩn li ti.',
      usp: 'Hạt bọt siêu nhỏ Micro Bubbles len lỏi vào lỗ chân lông hút sạch bã nhờn mà da vẫn mềm mịn nhờ gấp đôi Hyaluronic Acid.',
      cta: 'Bấm ngay góc trái giỏ hàng nhận voucher mua 1 tặng 1 duy nhất trong phiên Live D-Day 10.10 này!',
      durationSeconds: 62
    },
    status: 'PENDING'
  },
  {
    id: 'baq-3',
    dealCode: 'BO260757999',
    brandName: "Nature's Way",
    kocName: 'Mẹ Bầu Sành Điệu',
    kocChannel: '@mebausanhdieu',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop',
    salaryGrade: 'KL5',
    quoteNet: 6500000,
    tepKenh: 'Mẹ bé (bầu)',
    submissionRound: 'ROUND_1_KOC',
    submittedBy: 'Nguyễn Thu Trang',
    submittedAt: '2026-09-24 11:20',
    remainingSlaHours: 15.0,
    status: 'PENDING'
  },
  {
    id: 'baq-4',
    dealCode: 'BO260757555',
    brandName: 'Babe',
    kocName: 'Minh Đan Daily',
    kocChannel: '@danxinhdaily',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop',
    salaryGrade: 'KL2',
    quoteNet: 1200000,
    tepKenh: 'Beauty',
    submissionRound: 'ROUND_2_SCRIPT',
    submittedBy: 'Đinh Thị Bích Liên',
    submittedAt: '2026-09-24 09:00',
    remainingSlaHours: 12.5,
    scriptContent: {
      hook: 'Review gel rửa mặt kiềm dầu Babe Stop Akn sau 1 tuần dùng thử xem da dầu mụn nhạy cảm có đỡ đổ dầu bóng loáng không.',
      pain: 'Trời nồm ẩm hay nắng nóng da mặt lúc nào cũng đổ dầu bóng nhẫy, rửa mặt xong thì lại khô căng rát khó chịu.',
      usp: 'Độ pH 5.0 dịu nhẹ, chứa phức hợp Iris kiềm dầu suốt 8h và Salicylic Acid thông thoáng lỗ chân lông.',
      cta: 'Deal chính hãng nhập khẩu độc quyền giảm 35% đang gắn tại link giỏ hàng phía dưới.',
      durationSeconds: 58
    },
    status: 'APPROVED'
  }
];

export const INITIAL_BRAND_RETAINER_HEALTH: BrandRetainerHealth[] = [
  {
    id: 'brh-senka',
    brandName: 'Senka',
    accountLead: 'Phương Thảo',
    growthLead: 'Hoàng Long',
    allocatedBudget: 350000000,
    spentBudget: 285000000,
    targetGmv: 2100000000,
    actualGmv: 1980000000,
    roi: 6.95,
    activeKocsCount: 42,
    rejectedKocsCount: 3,
    rejectionRate: 6.6,
    healthStatus: 'HEALTHY',
    statusNotes: 'Tiến độ GMV đạt 94.2% chỉ tiêu tháng. Hợp tác ổn định, KOC chất lượng cao ăn khớp guideline.'
  },
  {
    id: 'brh-kutieskin',
    brandName: 'Kutieskin',
    accountLead: 'Phạm Thị Nhài',
    growthLead: 'Phạm Thị Hồng Yến',
    allocatedBudget: 220000000,
    spentBudget: 175000000,
    targetGmv: 1350000000,
    actualGmv: 1290000000,
    roi: 7.37,
    activeKocsCount: 35,
    rejectedKocsCount: 2,
    rejectionRate: 5.4,
    healthStatus: 'HEALTHY',
    statusNotes: 'Tỷ lệ chốt đơn rất cao nhờ tệp KOC Mẹ & Bé uy tín. Cần đẩy thêm video đợt 3 Mega D-Day.'
  },
  {
    id: 'brh-naturesway',
    brandName: "Nature's Way",
    accountLead: 'Hà Thị Thương',
    growthLead: 'Nguyễn Anh Tú',
    allocatedBudget: 420000000,
    spentBudget: 310000000,
    targetGmv: 2800000000,
    actualGmv: 2450000000,
    roi: 7.90,
    activeKocsCount: 52,
    rejectedKocsCount: 7,
    rejectionRate: 11.8,
    healthStatus: 'HEALTHY',
    statusNotes: 'Brand kiểm soát khắt khe giấy phép quảng cáo TPCN. Đã đào tạo lại tệp KOC để hạn chế từ chối kịch bản.'
  },
  {
    id: 'brh-babe',
    brandName: 'Babe',
    accountLead: 'Phạm Hà Hoàng Trang',
    growthLead: 'Huỳnh Ngọc Xuân Thúy',
    allocatedBudget: 180000000,
    spentBudget: 145000000,
    targetGmv: 950000000,
    actualGmv: 780000000,
    roi: 5.38,
    activeKocsCount: 24,
    rejectedKocsCount: 5,
    rejectionRate: 17.2,
    healthStatus: 'WARNING',
    statusNotes: 'Tỷ lệ từ chối KOC còn cao (17.2%) do Brand yêu cầu KOC phải có kiến thức da liễu chuyên sâu. Đang hội chẩn lại tiêu chí.'
  },
  {
    id: 'brh-bioessence',
    brandName: 'Bio-Essence',
    accountLead: 'Nguyễn Mai Linh',
    growthLead: 'Nguyễn Mai Oanh',
    allocatedBudget: 150000000,
    spentBudget: 60000000,
    targetGmv: 850000000,
    actualGmv: 390000000,
    roi: 6.50,
    activeKocsCount: 16,
    rejectedKocsCount: 4,
    rejectionRate: 20.0,
    healthStatus: 'WARNING',
    statusNotes: 'Giải ngân chậm hơn kế hoạch 2 tuần do chờ phê duyệt Key Visual mới từ Brand mẹ bên Singapore.'
  },
  {
    id: 'brh-phcare',
    brandName: 'pHCare',
    accountLead: 'Phương Thảo',
    growthLead: 'Hoàng Long',
    allocatedBudget: 90000000,
    spentBudget: 25000000,
    targetGmv: 450000000,
    actualGmv: 180000000,
    roi: 7.20,
    activeKocsCount: 12,
    rejectedKocsCount: 6,
    rejectionRate: 33.3,
    healthStatus: 'CRITICAL',
    statusNotes: 'Cảnh báo đỏ: Tỷ lệ KOC bị từ chối 33.3% do ngành hàng dung dịch vệ sinh nhạy cảm. Cần họp khẩn chốt lại chân dung KOC.'
  }
];

export const INITIAL_BRAND_KNOWLEDGE_BASES: BrandKnowledgeBase[] = [
  {
    id: 'kb-senka',
    brandName: 'Senka',
    slogan: 'Sạch Sâu Tinh Khiết — Dịu Êm Làn Da Chuẩn Nhật',
    brandStory: 'Thành lập năm 2002 tại Tokyo bởi tập đoàn Shiseido, Senka là thương hiệu sữa rửa mặt và chăm sóc da quốc dân 15 năm liên tiếp số 1 tại thị trường Nhật Bản. Nổi danh với công nghệ tạo bọt tơ tằm trắng Micro Bubbles len lỏi sâu vào lỗ chân lông hút sạch bụi mịn PM2.5 mà vẫn bảo toàn độ ẩm tự nhiên của làn da.',
    category: 'Chăm Sóc Da & Làm Sạch (Skincare)',
    originCountry: 'Nhật Bản (Shiseido Group)',
    foundedYear: 2002,
    toneOfVoice: 'Khoa học, trong trẻo, nhẹ nhàng, gần gũi với học sinh sinh viên và nhân viên văn phòng. Truyền tải thông điệp làn da mộc rạng rỡ từ bước làm sạch căn bản.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    targetPersonaSummary: 'Nữ giới 16-28 tuổi, học sinh, sinh viên, nhân viên văn phòng có thói quen làm sạch da hàng ngày, thường xuyên di chuyển ngoài đường hoặc tiếp xúc môi trường ô nhiễm, điều hòa.',
    colors: [
      { name: 'Senka Primary Blue', hex: '#005BAC', role: 'PRIMARY' },
      { name: 'Deep Navy Trust', hex: '#0A2540', role: 'SECONDARY' },
      { name: 'Silk Foam White', hex: '#FFFFFF', role: 'BACKGROUND' },
      { name: 'Hydra Soft Cyan', hex: '#38BDF8', role: 'ACCENT' }
    ],
    logoAssetRules: 'Logo Senka dạng chữ viết không chân cách điệu, bắt buộc hiển thị góc trên bên phải trong 3 giây đầu tiên của video. Khoảng cách an toàn tối thiểu 15px so với mép khung hình và không được đặt đè lên chi tiết rối mắt.',
    logoDownloadUrls: [
      { format: 'Logo Senka Xanh Chuẩn (PNG Trong Suốt High-Res)', url: 'https://cdn.upbase.vn/assets/senka/logo-blue-transparent.png' },
      { format: 'Logo Senka Vector (SVG Dành Cho Editor/Designer)', url: 'https://cdn.upbase.vn/assets/senka/logo-senka-vector.svg' },
      { format: 'Logo Senka Âm Bản Trắng (Dành Cho Nền Tối)', url: 'https://cdn.upbase.vn/assets/senka/logo-white-reversed.png' }
    ],
    visualDoList: [
      'Cảnh tạo bọt sữa rửa mặt dày xốp trên lòng bàn tay hoặc lưới tạo bọt, độ bông xốp dày ít nhất 3cm',
      'Cận cảnh làn da mộc sạch thoáng, mềm ẩm không bóng dầu sau khi rửa mặt với nước sạch',
      'Không gian phòng tắm tối giản, hiện đại, ánh sáng tự nhiên ban ngày kiểu Nhật',
      'Hướng dẫn test camera UV hoặc giấy thấm dầu để chứng minh khả năng làm sạch sâu thực tế'
    ],
    visualDontList: [
      'Không sử dụng filter làm mịn da giả tạo hoặc làm mờ nhòe kết cấu bọt tơ tằm',
      'Không đặt sản phẩm cạnh hoặc so sánh tiêu cực với Biore, Hada Labo, Innisfree',
      'Không quay cảnh cào cấu mạnh tay làm đỏ rát da gây hiểu lầm sản phẩm kích ứng',
      'Không cam kết "trị sạch 100% mụn sau 1 lần rửa"'
    ],
    certifications: [
      {
        id: 'cert-snk-01',
        docTitle: 'Giấy tiếp nhận bản công bố sản phẩm mỹ phẩm số 154820/21/CBMP-QLD',
        issuingAuthority: 'Cục Quản Lý Dược — Bộ Y Tế Việt Nam',
        docNumber: '154820/21/CBMP-QLD',
        issueDate: '2021-08-15',
        validUntil: '2026-08-15',
        docType: 'CÔNG_BỐ_MỸ_PHẨM',
        verificationUrl: 'https://dav.gov.vn/tra-cuu-my-pham/154820-21',
        summaryKeyFindings: 'Sản phẩm đạt chuẩn nhập khẩu chính ngạch 100% từ Shiseido Nhật Bản, an toàn da liễu không chứa chất cấm.'
      },
      {
        id: 'cert-snk-02',
        docTitle: 'Kiểm nghiệm lâm sàng da liễu về độ ẩm và hiệu quả làm sạch bụi mịn PM2.5',
        issuingAuthority: 'Viện Kiểm Nghiệm Da Liễu Tokyo (Tokyo Dermatology Research Lab)',
        docNumber: 'TDR-2022-8491',
        issueDate: '2022-04-10',
        docType: 'KIỂM_NGHIỆM_LÂM_SÀNG',
        summaryKeyFindings: '96% người tham gia thử nghiệm xác nhận da mềm mượt không căng rát sau 7 ngày; chứng minh loại bỏ 94% bụi mịn PM2.5 và giảm 82% bã nhờn sau 4h.'
      },
      {
        id: 'cert-snk-03',
        docTitle: 'Giấy xác nhận nội dung quảng cáo số 128/2023/XNQC-YTHCM',
        issuingAuthority: 'Sở Y Tế TP. Hồ Chí Minh',
        docNumber: '128/2023/XNQC-YTHCM',
        issueDate: '2023-03-20',
        docType: 'XÁC_NHẬN_QUẢNG_CÁO',
        mandatoryDisclaimerText: 'Hiệu quả thực tế có thể thay đổi tùy thuộc vào cơ địa và tình trạng da của từng người.',
        summaryKeyFindings: 'Cho phép truyền thông công dụng làm sạch sâu bọt tơ tằm và công thức dưỡng ẩm gấp đôi Hyaluronic Acid.'
      }
    ],
    skus: [
      {
        id: 'sku-senka-whip-det',
        skuCode: 'SKU-SNK-WHIP-120G',
        name: 'Sữa Rửa Mặt Tạo Bọt Tơ Tằm Trắng Senka Perfect Whip 120g',
        volumeOrWeight: '120g tuýp chuẩn',
        category: 'Cleanser (Sữa rửa mặt)',
        priceVnd: 115000,
        pdpUrl: 'https://www.tiktok.com/@senkavietnam_official/product/1729481920',
        sampleStockCount: 150,
        scientificMechanism: 'Hạt bọt Micro Bubbles mang điện tích âm liên kết tĩnh điện với bụi bẩn và bã nhờn mang điện tích dương sâu trong lỗ chân lông, cuốn trôi chất bẩn mà không làm tổn thương màng lipid.',
        keyActiveIngredients: [
          { name: 'Kén tơ tằm trắng Mayu Haku', percentage: 'Chiết xuất tự nhiên', origin: 'Nhật Bản', benefit: 'Tạo bọt mịn gấp 5 lần, tăng cường tái tạo lớp màng ẩm' },
          { name: 'Gấp đôi Hyaluronic Acid', percentage: 'Chuẩn lâm sàng', origin: 'Nhật Bản', benefit: 'Cấp ẩm sâu 2 tầng, ngăn ngừa mất nước biểu bì sau khi rửa' },
          { name: 'Sericin & Hydrolyzed Silk', percentage: 'Tinh khiết', origin: 'Nhật Bản', benefit: 'Dưỡng da sáng mịn và đàn hồi tự nhiên' }
        ],
        uniqueSellingPoints: [
          'Hạt bọt siêu nhỏ Micro Bubbles len lỏi làm sạch bụi mịn PM2.5',
          'Bọt dày xốp gấp 5 lần bảo vệ da khỏi lực ma sát của bàn tay',
          'Gấp đôi Hyaluronic Acid giữ ẩm sâu, không hề căng rát sau rửa mặt',
          'Sản phẩm số 1 Nhật Bản 15 năm liên tiếp'
        ],
        clinicalTrials: 'Chứng minh lâm sàng tại Nhật Bản: 96% người thử nghiệm cảm nhận da mềm mịn sau 7 ngày.',
        usageInstructions: 'Lấy lượng kem cỡ 2cm ra lòng bàn tay ẩm, thêm ít nước đánh bọt bông xốp, mát-xa nhẹ nhàng khắp mặt 30-45 giây rồi rửa sạch bằng nước.',
        targetSkinOrUser: 'Mọi loại da, đặc biệt da thường, da hỗn hợp thiên dầu, người hay makeup hoặc tiếp xúc bụi bẩn.',
        contraindications: 'Không dùng trên vùng da có vết thương hở sâu hoặc đang bùng phát viêm da tiếp xúc cấp tính.'
      },
      {
        id: 'sku-senka-micellar-det',
        skuCode: 'SKU-SNK-MICELLAR-500ML',
        name: 'Nước Tẩy Trang Sạch Sâu Giảm Mụn Senka All Clear Water Micellar 500ml',
        volumeOrWeight: '500ml chai lớn tiết kiệm',
        category: 'Makeup Remover (Nước tẩy trang)',
        priceVnd: 145000,
        pdpUrl: 'https://www.tiktok.com/@senkavietnam_official/product/1729481921',
        sampleStockCount: 80,
        scientificMechanism: 'Phân tử Micellar 2 đầu (đầu ưa nước và đầu ưa dầu) hoạt động như nam châm hút sạch cặn trang điểm lâu trôi và bã nhờn mà không phá vỡ màng ẩm sinh học.',
        keyActiveIngredients: [
          { name: 'Chiết xuất Trà Xanh Uji Kyoto', percentage: 'Hữu cơ', origin: 'Kyoto, Nhật Bản', benefit: 'Kiềm dầu, kháng viêm và chống oxy hóa mạnh mẽ' },
          { name: 'Công nghệ Micellar', percentage: 'Độc quyền', origin: 'Shiseido Nhật Bản', benefit: 'Hút sạch 99% lớp trang điểm cứng đầu' }
        ],
        uniqueSellingPoints: [
          'Công thức 3 KHÔNG: Không cồn, không dầu khoáng, không hương liệu độc hại',
          'Kiềm dầu suốt 8h nhờ tinh chất trà xanh Uji Kyoto trứ danh',
          'Dung tích lớn 500ml tiết kiệm cho học sinh sinh viên'
        ],
        clinicalTrials: 'Giảm 82% bã nhờn sau 4h sử dụng, an toàn cho da nhạy cảm có mụn.',
        usageInstructions: 'Thấm ướt bông tẩy trang, lau nhẹ nhàng khắp mặt từ trong ra ngoài, không cần chà xát mạnh.',
        targetSkinOrUser: 'Da dầu mụn, da hỗn hợp, người thường xuyên bôi kem chống nắng hoặc makeup hàng ngày.',
        contraindications: 'Tránh tiếp xúc trực tiếp vào giác mạc mắt.'
      }
    ],
    blacklistKeywords: [
      {
        id: 'bl-snk-01',
        keyword: 'Trị dứt điểm mụn / sạch thâm 100%',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Vi phạm luật quảng cáo mỹ phẩm Bộ Y Tế. Mỹ phẩm làm sạch không có chức năng điều trị dứt điểm bệnh lý da liễu.',
        alternativeSuggestion: 'Hỗ trợ làm sạch bã nhờn và vi khuẩn, giúp ngăn ngừa mụn quay trở lại hiệu quả'
      },
      {
        id: 'bl-snk-02',
        keyword: '100% không kích ứng',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Cấm cam kết tuyệt đối 100% trong truyền thông dược mỹ phẩm.',
        alternativeSuggestion: 'Công thức dịu nhẹ đã được kiểm nghiệm da liễu an toàn'
      },
      {
        id: 'bl-snk-03',
        keyword: 'Tốt hơn Biore / Hada Labo',
        category: 'COMPETITOR',
        severity: 'COMPETITOR_WARNING',
        rationale: 'Vi phạm quy chuẩn cấm dìm hàng đối thủ cạnh tranh trực tiếp.',
        alternativeSuggestion: 'Hạt bọt tơ tằm siêu nhỏ Micro Bubbles tạo bọt dày xốp gấp 5 lần so với thông thường'
      }
    ],
    whitelistKeywords: [
      {
        id: 'wl-snk-01',
        phrase: 'Bọt tơ tằm dày xốp gấp 5 lần bảo vệ màng ẩm',
        category: 'USP_CLAIM',
        exampleUsage: 'Bọt tơ tằm dày xốp gấp 5 lần giúp giảm lực ma sát tay lên da, rửa xong da mềm mượt thích mê!',
        benefitNotes: 'Tôn vinh công nghệ tơ tằm trắng Mayu Haku độc quyền của Shiseido'
      },
      {
        id: 'wl-snk-02',
        phrase: 'Gấp đôi Hyaluronic Acid không lo căng rát',
        category: 'TRUST_BUILDER',
        exampleUsage: 'Nhờ bổ sung gấp đôi Hyaluronic Acid nên dù rửa sạch sâu bụi bẩn da vẫn mềm ẩm dễ chịu.',
        benefitNotes: 'Giải tỏa định kiến cũ của người dùng về việc sữa rửa mặt tạo bọt gây khô căng'
      },
      {
        id: 'wl-snk-03',
        phrase: 'Làm sạch sâu bụi mịn PM2.5 chuẩn kiểm nghiệm Nhật Bản',
        category: 'HOOK_WINNER',
        exampleUsage: 'Đi đường bụi mịn PM2.5 cả ngày về nhà phải có em này len lỏi sạch sâu lỗ chân lông!',
        benefitNotes: 'Hook thời sự đánh trúng nỗi đau môi trường ô nhiễm của cư dân đô thị'
      }
    ],
    objectionFaqs: [
      {
        id: 'faq-snk-01',
        question: 'Nghe nói sữa rửa mặt Senka Perfect Whip rửa xong bị khô căng kít da, có đúng không?',
        targetConcern: 'KÍCH_ỨNG_MẨN_ĐỎ',
        recommendedAnswerForKoc: 'Đó là định kiến từ bản cũ cách đây nhiều năm rồi cả nhà ơi! Bản cải tiến mới nhất của Senka đã bổ sung gấp đôi Hyaluronic Acid và công nghệ tơ tằm Mayu Haku, giúp bọt dày gấp 5 lần đệm giữa tay và mặt. Khi tạo bọt bông xốp đúng cách trên tay rồi mới xoa lên mặt thì da rửa xong siêu mềm mượt, sạch thoáng mà màng ẩm tự nhiên vẫn nguyên vẹn.',
        doMentionPoints: ['Phải tạo bọt bông xốp trên tay trước khi đưa lên mặt', 'Công thức cải tiến gấp đôi Hyaluronic Acid', 'Kiểm nghiệm da liễu Nhật Bản 96% mềm mượt'],
        dontSayWords: ['Bản cũ dùng dở lắm', 'Khô rát', 'Hút hết dầu']
      },
      {
        id: 'faq-snk-02',
        question: 'Hàng trên TikTok Shop Upbase phân phối có phải chính hãng Nhật Bản không, sao giá mềm thế?',
        targetConcern: 'NGUỒN_GỐC_XUẤT_XỨ',
        recommendedAnswerForKoc: 'Gian hàng TikTok Shop của Senka do Upbase vận hành là kênh phân phối chính thức từ tập đoàn Shiseido Việt Nam. Sản phẩm có đầy đủ tem phụ tiếng Việt, tem chống hàng giả mã QR truy xuất và hóa đơn VAT. Mức giá ưu đãi này là do chương trình trợ giá trực tiếp độc quyền từ nhãn hàng trong phiên Mega Sale.',
        doMentionPoints: ['Nhập khẩu chính ngạch 100% Shiseido', 'Có tem chống giả quét mã QR', 'Trợ giá trực tiếp từ nhãn hàng'],
        dontSayWords: ['Hàng xách tay', 'Hàng tồn kho xả lỗ']
      }
    ],
    crisisProtocols: [
      {
        stepNumber: 1,
        actionTitle: 'Tiếp nhận & Hướng dẫn ngưng sử dụng tức thì',
        guidelineDescription: 'Khi khách hàng comment bị mẩn đỏ, KOC phản hồi lịch sự hướng dẫn khách tạm ngưng dùng, rửa mặt lại bằng nước mát sạch và inbox trực tiếp fanpage Senka kèm ảnh chụp.',
        contactPic: 'Account Lead (Phương Thảo - 0984.112.xxx)',
        slaResponseMinutes: 30
      },
      {
        stepNumber: 2,
        actionTitle: 'Bác sĩ da liễu nhãn hàng hội chẩn & Đổi trả',
        guidelineDescription: 'Đội ngũ chuyên gia Senka gọi điện thăm hỏi, xác định nguyên nhân (dị ứng chéo hay do kết hợp sai AHA/BHA) và hỗ trợ hoàn tiền hoặc đổi sản phẩm dịu nhẹ hơn.',
        contactPic: 'Dermatologist Specialist (Dr. Hằng)',
        slaResponseMinutes: 120
      }
    ],
    lastUpdated: '2026-09-24',
    updatedBy: 'Phạm Thị Nhài (Brand Manager)',
    publicShareSlug: 'senka-japan-official',
    shareAccessPin: 'SNK2026'
  },
  {
    id: 'kb-kutieskin',
    brandName: 'Kutieskin',
    slogan: 'Nâng Niu Làn Da Bé — Trọn Vẹn Tình Yêu Mẹ',
    brandStory: 'Kutieskin là thương hiệu chăm sóc da chuyên biệt cho trẻ sơ sinh và trẻ nhỏ số 1 tại Việt Nam được nghiên cứu và phát triển bởi CVI Pharma. Ứng dụng công nghệ kháng viêm thảo dược Aminovector độc quyền từ Pháp kết hợp nguồn dược liệu chuẩn hóa đạt chứng nhận Cosmos Organic Châu Âu, mang tới giải pháp làm dịu nhanh mẩn ngứa, chàm sữa mà hoàn toàn không chứa Corticoid.',
    category: 'Mẹ & Bé (Baby Skincare & Healthcare)',
    originCountry: 'Việt Nam (CVI Pharma)',
    foundedYear: 2019,
    toneOfVoice: 'Ấm áp, thấu hiểu, đồng cảm sâu sắc với nỗi lo của các mẹ bỉm sữa, kết hợp kiến thức y khoa chuyên môn đáng tin cậy.',
    toneTag: 'MẸ_BỈM_CHÂN_THỰC',
    targetPersonaSummary: 'Mẹ bỉm sữa đang nuôi con nhỏ từ 0 - 5 tuổi, mẹ bầu chuẩn bị sinh, các mẹ kỹ tính tìm kiếm sản phẩm lành tính không hóa chất độc hại để bảo vệ làn da non nớt của con.',
    colors: [
      { name: 'Kutieskin Baby Pink', hex: '#EC4899', role: 'PRIMARY' },
      { name: 'Soft Herb Green', hex: '#059669', role: 'SECONDARY' },
      { name: 'Warm Cream Peach', hex: '#FFF1F2', role: 'BACKGROUND' },
      { name: 'Gentle Amber', hex: '#F59E0B', role: 'ACCENT' }
    ],
    logoAssetRules: 'Logo Kutieskin kèm biểu tượng chú gấu nhỏ ấm áp, hiển thị góc trái màn hình, màu sắc hồng pastel dịu nhẹ.',
    logoDownloadUrls: [
      { format: 'Logo Kutieskin Gấu Nhỏ (PNG Trong Suốt)', url: 'https://cdn.upbase.vn/assets/kutieskin/logo-pink-bear.png' },
      { format: 'Logo Kutieskin Tròn Huy Hiệu (SVG)', url: 'https://cdn.upbase.vn/assets/kutieskin/badge-kutieskin.svg' }
    ],
    visualDoList: [
      'Cảnh mẹ âu yếm chăm sóc, thoa kem nhẹ nhàng cho bé lúc vừa tắm xong hoặc trước khi đi ngủ',
      'Cận cảnh chất kem thẩm thấu nhanh, không bết dính, bé thoải mái cười đùa',
      'Giơ tem chống hàng giả và chứng nhận Organic Cosmos Châu Âu rõ nét',
      'Không gian phòng ngủ hoặc phòng tắm gia đình ấm cúng, sạch sẽ'
    ],
    visualDontList: [
      'Tuyệt đối không quay cảnh em bé đang khóc thét hay hoảng sợ',
      'Cấm so sánh hoặc nhắc tới các loại kem trộn, thuốc bôi chứa Corticoid trôi nổi',
      'Không bôi lem luốc vào vùng mắt hoặc miệng của trẻ',
      'Không hứa hẹn "khỏi chàm sữa sau 1 lần bôi duy nhất"'
    ],
    certifications: [
      {
        id: 'cert-kuti-01',
        docTitle: 'Giấy tiếp nhận bản công bố sản phẩm số 7291/20/CBMP-HN',
        issuingAuthority: 'Sở Y Tế Hà Nội',
        docNumber: '7291/20/CBMP-HN',
        issueDate: '2020-11-12',
        docType: 'CÔNG_BỐ_MỸ_PHẨM',
        summaryKeyFindings: 'Sản phẩm thảo dược kiểm nghiệm an toàn cho trẻ sơ sinh từ 5 ngày tuổi, không chứa Corticoid, không Paraben.'
      },
      {
        id: 'cert-kuti-02',
        docTitle: 'Chứng nhận nguồn gốc nguyên liệu đạt chuẩn Cosmos Organic Châu Âu',
        issuingAuthority: 'Ecocert Greenlife Pháp',
        docNumber: 'ECO-FR-2021-998',
        issueDate: '2021-06-18',
        docType: 'CHỨNG_CHỈ_QUỐC_TẾ',
        summaryKeyFindings: 'Chiết xuất Yến Mạch và Bơ Shea đạt chuẩn canh tác hữu cơ không phân bón hóa học và thuốc trừ sâu.'
      }
    ],
    skus: [
      {
        id: 'sku-kuti-soothing-det',
        skuCode: 'SKU-KUTI-SOOTHING-30G',
        name: 'Kem Bôi Dịu Da Mẩn Ngứa Trẻ Em Kutieskin 30g',
        volumeOrWeight: '30g tuýp nhỏ gọn',
        category: 'Baby Skincare',
        priceVnd: 98000,
        pdpUrl: 'https://www.tiktok.com/@kutieskin_official/product/182940192',
        sampleStockCount: 220,
        scientificMechanism: 'Phức hợp Aminovector gắn kết axit amin với lipid thực vật giúp kháng khuẩn, làm dịu nhanh cơn ngứa rát và tái lập hàng rào bảo vệ màng da non của bé.',
        keyActiveIngredients: [
          { name: 'Aminovector từ Pháp', percentage: 'Chuẩn độc quyền', origin: 'Pháp', benefit: 'Kháng viêm sinh học, dứt cơn ngứa sau 24h' },
          { name: 'Chiết xuất Yến Mạch & Bơ Shea', percentage: 'Hữu cơ Cosmos', origin: 'Châu Âu', benefit: 'Cấp ẩm phục hồi, mềm mịn vết nẻ và chàm sữa' },
          { name: 'Nano Bạc & Tinh chất Nghệ trắng', percentage: 'Dược liệu sạch', origin: 'Việt Nam', benefit: 'Kháng khuẩn tự nhiên, ngừa thâm sẹo' }
        ],
        uniqueSellingPoints: [
          'Làm dịu ngứa, mẩn đỏ, hăm tã sau 24h sử dụng',
          '100% không chứa Corticoid, không Paraben, an toàn từ 5 ngày tuổi',
          'Công nghệ kháng viêm thảo dược Aminovector nhập khẩu từ Pháp',
          'Chất kem mỏng nhẹ thẩm thấu nhanh, không gây bết dính quần áo bé'
        ],
        clinicalTrials: 'Viện Kiểm Nghiệm Thuốc Trung Ương chứng nhận: Không chứa chất gây hại, kiểm nghiệm an toàn trên 500 trẻ sơ sinh.',
        usageInstructions: 'Vệ sinh sạch vùng da tổn thương, lau khô nhẹ bằng khăn mềm rồi thoa một lớp kem mỏng 2-3 lần/ngày.',
        targetSkinOrUser: 'Trẻ sơ sinh và trẻ nhỏ bị mẩn ngứa, hăm tã, côn trùng cắn, chàm sữa hoặc da khô nứt nẻ.',
        contraindications: 'Không thoa trực tiếp lên vết thương hở đang chảy máu hoặc mưng mủ sâu.'
      }
    ],
    blacklistKeywords: [
      {
        id: 'bl-kuti-01',
        keyword: 'Chữa khỏi chàm sữa 100%',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Chàm sữa là viêm da cơ địa mạn tính, không được dùng từ chữa khỏi 100%.',
        alternativeSuggestion: 'Làm dịu nhanh mẩn ngứa, dưỡng ẩm phục hồi và củng cố hàng rào bảo vệ da bé'
      },
      {
        id: 'bl-kuti-02',
        keyword: 'Chứa Corticoid khỏi ngay sau 1 đêm',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Kutieskin là thảo dược hữu cơ không chứa Corticoid, cấm liên hệ sai lệch.',
        alternativeSuggestion: 'Kháng viêm thảo dược tự nhiên Aminovector nhập khẩu từ Pháp, an toàn lành tính'
      }
    ],
    whitelistKeywords: [
      {
        id: 'wl-kuti-01',
        phrase: 'Thảo dược Aminovector từ Pháp an toàn cho trẻ từ 5 ngày tuổi',
        category: 'TRUST_BUILDER',
        exampleUsage: 'Mẹ hoàn toàn an tâm vì Kutieskin dùng công nghệ Aminovector nhập khẩu từ Pháp, an toàn cho bé từ 5 ngày tuổi.',
        benefitNotes: 'Bảo chứng chất lượng an toàn cao nhất cho trẻ sơ sinh'
      },
      {
        id: 'wl-kuti-02',
        phrase: 'Làm dịu mẩn ngứa hăm tã sau 24h không bết dính',
        category: 'USP_CLAIM',
        exampleUsage: 'Bé bị muỗi đốt hay mẩn ngứa thoa lớp mỏng là êm dịu ngay sau 24h, chất kem thấm nhanh không bết dính.',
        benefitNotes: 'Khẳng định tốc độ hiệu quả thực tế'
      }
    ],
    objectionFaqs: [
      {
        id: 'faq-kuti-01',
        question: 'Kutieskin có chứa Corticoid để làm dịu ngứa nhanh không?',
        targetConcern: 'KÍCH_ỨNG_MẨN_ĐỎ',
        recommendedAnswerForKoc: 'Dạ hoàn toàn KHÔNG chứa Corticoid ạ! Kutieskin đã được Viện Kiểm Nghiệm Quốc Gia chứng nhận 100% không Corticoid, không Paraben. Tác dụng làm dịu nhanh là nhờ công nghệ kháng viêm sinh học Aminovector từ Pháp kết hợp Nano bạc và Yến mạch hữu cơ, tuyệt đối an toàn cho làn da mỏng manh của trẻ sơ sinh.',
        doMentionPoints: ['Không chứa Corticoid', 'Chứng nhận Viện Kiểm Nghiệm', 'Công nghệ Aminovector Pháp'],
        dontSayWords: ['Thuốc trị', 'Tác dụng phụ']
      }
    ],
    crisisProtocols: [
      {
        stepNumber: 1,
        actionTitle: 'Tiếp nhận thông tin mẹ bỉm & Bác sĩ nhi tư vấn',
        guidelineDescription: 'Bác sĩ nhi khoa của nhãn hàng liên hệ trực tiếp mẹ để kiểm tra hình ảnh da bé, tư vấn phác đồ chăm sóc phù hợp hoàn toàn miễn phí.',
        contactPic: 'Dr. Thùy Trang (CVI Medical Team)',
        slaResponseMinutes: 45
      }
    ],
    lastUpdated: '2026-09-25',
    updatedBy: 'Quỳnh Như (Content Lead)',
    publicShareSlug: 'kutieskin-vietnam-official',
    shareAccessPin: 'KUTI2026'
  },
  {
    id: 'kb-naturesway',
    brandName: "Nature's Way",
    slogan: 'Vitamin Số 1 Nước Úc — Đồng Hành Cùng Con Khôn Lớn',
    brandStory: 'Ra đời từ năm 1943 tại Úc, Nature\'s Way là thương hiệu thực phẩm bảo vệ sức khỏe và vitamin trẻ em số 1 tại Úc. Sản phẩm nổi danh với dạng kẹo dẻo Kids Smart Vita Gummies thơm ngon tự nhiên giúp bé hào hứng bổ sung vi chất hàng ngày mà không cần ép uổng.',
    category: 'Thực Phẩm Bảo Vệ Sức Khỏe & Vitamin Trẻ Em',
    originCountry: 'Úc (Pharmacare Laboratories)',
    foundedYear: 1943,
    toneOfVoice: 'Khoa học dinh dưỡng, uy tín chuẩn Úc, bảo chứng sức khỏe gia đình, minh bạch nguồn gốc.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    targetPersonaSummary: 'Bố mẹ có con từ 2 - 12 tuổi mong muốn bổ sung kẽm, vitamin C, DHA hoặc canxi cho con phát triển toàn diện, trẻ biếng ăn hoặc đề kháng kém.',
    colors: [
      { name: 'Nature Green Leaf', hex: '#059669', role: 'PRIMARY' },
      { name: 'Aussie Sunshine Gold', hex: '#F59E0B', role: 'SECONDARY' },
      { name: 'Clean White', hex: '#FFFFFF', role: 'BACKGROUND' }
    ],
    logoAssetRules: 'Logo chiếc lá xanh đặc trưng kèm dòng chữ Nature\'s Way và huy hiệu cờ Úc góc trên bên phải.',
    logoDownloadUrls: [
      { format: 'Logo Nature\'s Way Chiếc Lá (PNG)', url: 'https://cdn.upbase.vn/assets/naturesway/logo-green-leaf.png' }
    ],
    visualDoList: [
      'Bé hào hứng ăn kẹo dẻo gummie thơm ngon tự giác mà không cần bố mẹ ép',
      'Hộp sản phẩm có tem chống giả tích hợp mã QR truy xuất nguồn gốc',
      'Gia đình vận động thể thao ngoài trời khỏe khoắn'
    ],
    visualDontList: [
      'CẤM TUYỆT ĐỐI GỌI LÀ "THUỐC" (Nature\'s Way là Thực phẩm bảo vệ sức khỏe)',
      'Không cam kết "uống vào tăng ngay 5cm chiều cao hoặc 2kg trong 1 tháng"',
      'Không quay cảnh bắt ép bé uống thuốc'
    ],
    certifications: [
      {
        id: 'cert-nw-01',
        docTitle: 'Giấy tiếp nhận bản công bố sản phẩm số 2891/2021/ĐKSP',
        issuingAuthority: 'Cục An Toàn Thực Phẩm — Bộ Y Tế',
        docNumber: '2891/2021/ĐKSP',
        issueDate: '2021-04-05',
        docType: 'CÔNG_BỐ_ATTP',
        mandatoryDisclaimerText: 'Thực phẩm này không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh.',
        summaryKeyFindings: 'Sản phẩm nhập khẩu chính ngạch từ Úc, bổ sung vitamin C và Kẽm đạt tiêu chuẩn kiểm nghiệm an toàn thực phẩm.'
      }
    ],
    skus: [
      {
        id: 'sku-nw-vita-gummies-det',
        skuCode: 'SKU-NW-GUMMIES-60V',
        name: 'Kẹo Dẻo Bổ Sung Kẽm & Vitamin C Nature\'s Way Kids Smart 60 viên',
        volumeOrWeight: '60 viên/lọ',
        category: 'Supplements (Thực phẩm bảo vệ sức khỏe)',
        priceVnd: 280000,
        pdpUrl: 'https://www.tiktok.com/@natureswayvn/product/182940888',
        sampleStockCount: 95,
        scientificMechanism: 'Kẽm hữu cơ kết hợp Vitamin C tăng cường hấp thu sinh học, kích hoạt tế bào lympho T củng cố hệ thống miễn dịch tự nhiên của trẻ.',
        keyActiveIngredients: [
          { name: 'Kẽm hữu cơ (Zinc)', percentage: '1.5mg', origin: 'Úc', benefit: 'Kích thích vị giác, kích hoạt enzym tiêu hóa' },
          { name: 'Vitamin C', percentage: '30mg', origin: 'Úc', benefit: 'Tăng cường đề kháng, bảo vệ tế bào khỏi oxy hóa' }
        ],
        uniqueSellingPoints: [
          'Thương hiệu vitamin trẻ em số 1 tại Úc',
          'Vị dâu cam chua ngọt tự nhiên từ nước ép hoa quả, bé thích thú ăn mỗi ngày',
          'Kích thích bé ăn ngon miệng tự nhiên, hỗ trợ đề kháng vững vàng',
          'Nhập khẩu chính ngạch 100%, đầy đủ tem phụ và mã QR chống giả'
        ],
        clinicalTrials: 'Nghiên cứu lâm sàng tại Úc chứng minh trẻ bổ sung kẽm và vitamin C giảm 38% số ngày ốm vặt đường hô hấp.',
        usageInstructions: 'Trẻ từ 2-3 tuổi: Nhai 1 viên/ngày. Trẻ từ 4 tuổi trở lên: Nhai 2 viên/ngày sau bữa ăn.',
        targetSkinOrUser: 'Trẻ em từ 2 tuổi trở lên hay ốm vặt, biếng ăn, đề kháng kém khi giao mùa hoặc đi học mẫu giáo.',
        contraindications: 'Không dùng cho trẻ dưới 2 tuổi nếu chưa có hướng dẫn của bác sĩ (ngừa nguy cơ hóc dị vật).'
      }
    ],
    blacklistKeywords: [
      {
        id: 'bl-nw-01',
        keyword: 'Thuốc bổ tăng cân / Thuốc trị biếng ăn',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Vi phạm nghiêm trọng quy chế TPCN. Cấm hoàn toàn dùng từ "Thuốc".',
        alternativeSuggestion: 'Sản phẩm hỗ trợ bổ sung Kẽm & Vitamin C giúp bé ăn ngon và tăng cường đề kháng'
      }
    ],
    whitelistKeywords: [
      {
        id: 'wl-nw-01',
        phrase: 'Vitamin số 1 nước Úc giúp bé đề kháng vững vàng',
        category: 'TRUST_BUILDER',
        exampleUsage: 'Nature\'s Way là thương hiệu vitamin số 1 nước Úc được hàng triệu mẹ bỉm trên thế giới tin dùng.',
        benefitNotes: 'Khẳng định vị thế thương hiệu toàn cầu'
      }
    ],
    objectionFaqs: [
      {
        id: 'faq-nw-01',
        question: 'Kẹo gummie có chứa đường không, ăn nhiều có bị sâu răng không?',
        targetConcern: 'HIỆU_QUẢ_CHẬM',
        recommendedAnswerForKoc: 'Kẹo dẻo Nature\'s Way có vị ngọt dịu nhẹ từ nước trái cây tự nhiên, không chứa đường hóa học độc hại. Tuy nhiên vì là sản phẩm bổ sung vi chất, bố mẹ chỉ nên cho bé nhai đúng liều lượng 1-2 viên mỗi ngày sau bữa ăn và duy trì đánh răng sạch sẽ cho bé nhé!',
        doMentionPoints: ['Vị ngọt từ trái cây tự nhiên', 'Nhai đúng liều lượng 1-2 viên/ngày'],
        dontSayWords: ['Ăn thoải mái thay kẹo ngọt', 'Ăn bao nhiêu cũng được']
      }
    ],
    crisisProtocols: [
      {
        stepNumber: 1,
        actionTitle: 'Xác minh tem chống giả & Lô sản xuất',
        guidelineDescription: 'Hướng dẫn khách cào tem chống giả gửi mã về tổng đài xác thực hàng chính ngạch Pharmacare Úc.',
        contactPic: 'Hà Thị Thương (Account Lead)',
        slaResponseMinutes: 30
      }
    ],
    lastUpdated: '2026-09-22',
    updatedBy: 'Hà Thị Thương (Account Lead)',
    publicShareSlug: 'naturesway-australia-official',
    shareAccessPin: 'NW2026'
  },
  {
    id: 'kb-babe',
    brandName: 'Babe',
    slogan: 'Dược Mỹ Phẩm Châu Âu — Chuẩn Da Liễu Tây Ban Nha',
    brandStory: 'Laboratorios BABÉ thành lập năm 1994 tại Valencia Tây Ban Nha bởi các dược sĩ da liễu. Thương hiệu tiên phong phát triển các giải pháp phục hồi da dầu mụn chuyên sâu với công thức tối giản, minh bạch tỷ lệ thành phần và tôn trọng độ pH sinh học của làn da.',
    category: 'Dược Mỹ Phẩm Kê Đơn (Dermocosmetics)',
    originCountry: 'Tây Ban Nha (Valencia Laboratories)',
    foundedYear: 1994,
    toneOfVoice: 'Khoa học y khoa, kê đơn, phân tích chuyên môn da liễu, tối giản và khách quan.',
    toneTag: 'BÁC_SĨ_CHUYÊN_GIA',
    targetPersonaSummary: 'Nam nữ 18-35 tuổi sở hữu làn da dầu mụn, mụn ẩn, mụn viêm nhạy cảm, người đang treatment hoặc tìm kiếm giải pháp kiềm dầu phục hồi chuẩn y khoa.',
    colors: [
      { name: 'Babe Amber Orange', hex: '#EA580C', role: 'PRIMARY' },
      { name: 'Medical Slate Navy', hex: '#0F172A', role: 'SECONDARY' },
      { name: 'Laboratory Pure White', hex: '#FFFFFF', role: 'BACKGROUND' }
    ],
    logoAssetRules: 'Logo chữ Laboratorios BABÉ với dấu gạch ngang tối giản phong cách dược phòng Châu Âu.',
    logoDownloadUrls: [
      { format: 'Logo Laboratorios BABÉ (PNG)', url: 'https://cdn.upbase.vn/assets/babe/logo-babe-pharma.png' }
    ],
    visualDoList: [
      'Texture gel rửa mặt trong suốt tạo bọt mịn nhẹ nhàng, độ pH 5.0 chuẩn da liễu',
      'KOC/Bác sĩ phân tích cơ chế phức hợp Iris kiềm dầu và Salicylic Acid',
      'Đo độ dầu thừa trước và sau khi sử dụng bằng máy soi da hoặc giấy thấm dầu'
    ],
    visualDontList: [
      'Không dùng từ "hết mụn tức thì sau 1 đêm"',
      'Không quay cảnh nặn mụn viêm chảy mủ ghê rợn',
      'Không so sánh dìm hàng SVR hay La Roche-Posay'
    ],
    certifications: [
      {
        id: 'cert-babe-01',
        docTitle: 'Chứng nhận đạt tiêu chuẩn thực hành sản xuất mỹ phẩm tốt ISO 22716 CGMP Châu Âu',
        issuingAuthority: 'Cơ quan Y Tế Tây Ban Nha (AEMPS)',
        docNumber: 'ES-CGMP-2021-491',
        issueDate: '2021-02-14',
        docType: 'CHỨNG_CHỈ_QUỐC_TẾ',
        summaryKeyFindings: 'Sản xuất trong phòng thí nghiệm y tế vô trùng, kiểm nghiệm da liễu và nhãn khoa an toàn tuyệt đối.'
      }
    ],
    skus: [
      {
        id: 'sku-babe-stop-akn-det',
        skuCode: 'SKU-BABE-STOPAKN-200ML',
        name: 'Gel Rửa Mặt Giảm Mụn Kiềm Dầu Babe Stop Akn Purifying Cleansing Gel 200ml',
        volumeOrWeight: '200ml chai vòi nhấn',
        category: 'Dermocosmetics (Dược mỹ phẩm)',
        priceVnd: 349000,
        pdpUrl: 'https://www.tiktok.com/@babe_vietnam/product/182940999',
        sampleStockCount: 110,
        scientificMechanism: 'Phức hợp Cytobiol Iris (Chiết xuất hoa diên vĩ + Zinc Sulfate + Vitamin A) ức chế enzym 5-alpha reductase làm giảm tiết bã nhờn, kết hợp Salicylic Acid 0.5% tẩy tế bào chết vi mô.',
        keyActiveIngredients: [
          { name: 'Phức hợp Cytobiol Iris 5%', percentage: '5.0%', origin: 'Tây Ban Nha', benefit: 'Kiềm dầu suốt 8h, gom cồi mụn' },
          { name: 'Salicylic Acid (BHA)', percentage: '0.5%', origin: 'Châu Âu', benefit: 'Thông thoáng lỗ chân lông không gây kích ứng' },
          { name: 'Zinc PCA', percentage: '0.02%', origin: 'Châu Âu', benefit: 'Kháng viêm mụn, giảm sưng đỏ' }
        ],
        uniqueSellingPoints: [
          'Phức hợp Cytobiol Iris kiểm soát dầu thừa suốt 8 giờ',
          'Độ pH chuẩn sinh học 5.0 tôn trọng hệ vi sinh vật trên da',
          'Salicylic Acid 0.5% dịu êm thông thoáng lỗ chân lông không khô rát',
          'Kiểm nghiệm lâm sàng tại Tây Ban Nha: 91% giảm bã nhờn, 84% giảm mụn'
        ],
        clinicalTrials: 'Nghiên cứu lâm sàng trên 40 tình nguyện viên da dầu mụn trong 28 ngày: 91% cảm nhận giảm dầu thừa rõ rệt.',
        usageInstructions: 'Làm ướt mặt, lấy một lượng gel vừa đủ xoa nhẹ tạo bọt trên tay rồi mát-xa nhẹ nhàng 1 phút, rửa lại với nước ấm.',
        targetSkinOrUser: 'Da dầu mụn, mụn ẩn, mụn đầu đen, da bóng nhờn lỗ chân lông to.',
        contraindications: 'Không dùng cho người dị ứng với Salicylates (Aspirin).'
      }
    ],
    blacklistKeywords: [
      {
        id: 'bl-babe-01',
        keyword: 'Trị mụn cấp tốc sau 1 đêm',
        category: 'LEGAL_MEDICAL',
        severity: 'CRITICAL_BANNED',
        rationale: 'Cam kết sai khoa học, dễ dẫn tới khiếu nại khách hàng và vi phạm chính sách kiểm duyệt.',
        alternativeSuggestion: 'Hỗ trợ gom cồi mụn và giảm sưng viêm sau 48-72 giờ sử dụng đúng phác đồ'
      }
    ],
    whitelistKeywords: [
      {
        id: 'wl-babe-01',
        phrase: 'Phức hợp Cytobiol Iris kiềm dầu suốt 8h chuẩn da liễu Tây Ban Nha',
        category: 'USP_CLAIM',
        exampleUsage: 'Em gel rửa mặt Babe này chứa phức hợp Cytobiol Iris độc quyền giúp kiềm dầu khô ráo suốt 8 tiếng.',
        benefitNotes: 'Khẳng định thành phần ngôi sao độc quyền'
      }
    ],
    objectionFaqs: [
      {
        id: 'faq-babe-01',
        question: 'Dùng gel rửa mặt Babe Stop Akn có làm da bị khô căng hay bong tróc không?',
        targetConcern: 'KÍCH_ỨNG_MẨN_ĐỎ',
        recommendedAnswerForKoc: 'Hoàn toàn không bạn nha! Điểm đặc biệt của Babe Stop Akn là độ pH chuẩn 5.0 trùng khớp với màng axit tự nhiên của da. Nồng độ Salicylic Acid chỉ ở mức 0.5% dịu nhẹ kết hợp kẽm PCA nên vừa làm sạch thông thoáng lỗ chân lông vừa giữ lại độ ẩm mềm mịn cho da.',
        doMentionPoints: ['Độ pH chuẩn sinh học 5.0', 'BHA chỉ 0.5% dịu nhẹ', 'Không chứa cồn'],
        dontSayWords: ['Hút cạn dầu', 'Lột tẩy']
      }
    ],
    crisisProtocols: [
      {
        stepNumber: 1,
        actionTitle: 'Hỗ trợ thăm khám trực tuyến cùng Bác Sĩ Babe',
        guidelineDescription: 'Kết nối khách hàng với bác sĩ da liễu đại diện nhãn Babe để soi da và phân tích nguyên nhân mụn.',
        contactPic: 'Phạm Hà Hoàng Trang (Account Lead)',
        slaResponseMinutes: 60
      }
    ],
    lastUpdated: '2026-09-24',
    updatedBy: 'Phạm Hà Hoàng Trang (Account Lead)',
    publicShareSlug: 'babe-laboratorios-official',
    shareAccessPin: 'BABE2026'
  },
  {
    id: 'kb-bioessence',
    brandName: 'Bio-Essence',
    slogan: 'Kích Hoạt Tế Bào — Trẻ Hóa Làn Da Vàng 24K',
    brandStory: 'Thương hiệu dược mỹ phẩm hàng đầu Singapore và Châu Á với công nghệ sinh học Bio-Energy Complex độc quyền, giúp tăng cường 28% khả năng hấp thu oxy và dưỡng chất của tế bào da. Tinh túy vàng 24K sinh học nguyên chất 98% mang tới liệu pháp chống lão hóa sang trọng và hiệu quả.',
    category: 'Mỹ Phẩm Chống Lão Hóa & Dưỡng Sáng (Anti-Aging)',
    originCountry: 'Singapore (Wipro Consumer Care)',
    foundedYear: 2001,
    toneOfVoice: 'Sang trọng, quý phái, khoa học công nghệ cao, nâng niu phụ nữ hiện đại.',
    toneTag: 'SANG_TRỌNG_CAO_CẤP',
    targetPersonaSummary: 'Phụ nữ 25-45 tuổi bắt đầu xuất hiện dấu hiệu lão hóa, nếp nhăn li ti, da xỉn màu thiếu sức sống, mong muốn tìm kiếm sản phẩm dưỡng ẩm chuyên sâu và tái tạo độ đàn hồi.',
    colors: [
      { name: 'Bio Gold Imperial', hex: '#D97706', role: 'PRIMARY' },
      { name: 'Royal Onyx Black', hex: '#0B0F19', role: 'SECONDARY' },
      { name: 'Rose Gold Shimmer', hex: '#FDE68A', role: 'ACCENT' }
    ],
    logoAssetRules: 'Logo Bio-Essence ánh kim trên nền tối trang nhã, kiểu chữ thanh lịch.',
    logoDownloadUrls: [
      { format: 'Logo Bio-Essence Vàng Gold (PNG)', url: 'https://cdn.upbase.vn/assets/bioessence/logo-gold.png' }
    ],
    visualDoList: [
      'Cận cảnh vảy vàng 24K óng ánh tan chảy khi thoa và thẩm thấu vào gò má',
      'Độ bóng khỏe mọng nước Glass-Skin của làn da phụ nữ trưởng thành',
      'Trang phục trang nhã, ánh sáng ấm áp sang trọng'
    ],
    visualDontList: [
      'Không quay cảnh lem luốc hoặc bôi trét cẩu thả',
      'Không so sánh với vàng giả hay tuyên bố cải lão hoàn đồng vô lý'
    ],
    certifications: [
      {
        id: 'cert-bio-01',
        docTitle: 'Giấy tiếp nhận công bố mỹ phẩm nhập khẩu số 119820/19/CBMP-QLD',
        issuingAuthority: 'Cục Quản Lý Dược — Bộ Y Tế',
        docNumber: '119820/19/CBMP-QLD',
        issueDate: '2019-10-08',
        docType: 'CÔNG_BỐ_MỸ_PHẨM',
        summaryKeyFindings: 'Sản phẩm tinh chất vàng 24K nhập khẩu chính ngạch từ Singapore, chứng minh khả năng kích thích tổng hợp Collagen.'
      }
    ],
    skus: [
      {
        id: 'sku-bio-gold-water-det',
        skuCode: 'SKU-BIO-GOLD-100ML',
        name: 'Nước Thần Phục Hồi Chống Lão Hóa Vàng 24K Bio-Gold Rose Gold Water 100ml',
        volumeOrWeight: '100ml chai thủy tinh sang trọng',
        category: 'Anti-Aging Essence',
        priceVnd: 420000,
        pdpUrl: 'https://www.tiktok.com/@bioessencevn/product/182940777',
        sampleStockCount: 75,
        scientificMechanism: 'Vàng 24K sinh học đóng vai trò chất chống oxy hóa cực mạnh, kết hợp năng lượng Bio-Energy Complex kích thích quá trình trao đổi chất tế bào, se khít lỗ chân lông và giữ ẩm đa tầng.',
        keyActiveIngredients: [
          { name: 'Vàng 24K sinh học nguyên chất', percentage: '98%', origin: 'Singapore', benefit: 'Chống oxy hóa, tái tạo độ đàn hồi' },
          { name: 'Bio-Energy Complex', percentage: 'Độc quyền', origin: 'Singapore', benefit: 'Tăng hấp thu oxy cho tế bào lên 28%' },
          { name: 'Niacinamide & Chiết xuất Hoa Hồng', percentage: 'Tinh khiết', origin: 'Châu Á', benefit: 'Dưỡng da sáng hồng rạng rỡ' }
        ],
        uniqueSellingPoints: [
          'Vảy vàng 24K tan chảy thẩm thấu tức thì vào da',
          'Công nghệ độc quyền Bio-Energy Complex kích hoạt tế bào',
          'Tăng cường tái tạo collagen lên 28% sau 14 ngày',
          'Nuôi dưỡng làn da căng bóng ngậm nước chuẩn Glass-Skin'
        ],
        clinicalTrials: 'Thử nghiệm lâm sàng tại Singapore: 93% phụ nữ nhận thấy da săn chắc và mờ nếp nhăn li ti sau 2 tuần.',
        usageInstructions: 'Sau bước rửa mặt, lấy lượng vừa đủ vỗ nhẹ lên khắp mặt và cổ sáng và tối.',
        targetSkinOrUser: 'Phụ nữ từ 25 tuổi có dấu hiệu lão hóa, da khô ráp, xỉn màu.',
        contraindications: 'Người dị ứng với kim loại vàng (rất hiếm gặp).'
      }
    ],
    blacklistKeywords: [
      {
        id: 'bl-bio-01',
        keyword: 'Trẻ hóa 10 tuổi ngay tức thì',
        category: 'SENSITIVE_POLICY',
        severity: 'CRITICAL_BANNED',
        rationale: 'Tuyên bố sai sự thật vi phạm chính sách nền tảng và luật quảng cáo.',
        alternativeSuggestion: 'Kích hoạt độ đàn hồi tế bào, giúp làn da căng bóng và làm mờ nếp nhăn li ti tự nhiên'
      }
    ],
    whitelistKeywords: [
      {
        id: 'wl-bio-01',
        phrase: 'Vảy vàng 24K sinh học tan chảy nuôi dưỡng làn da căng bóng',
        category: 'HOOK_WINNER',
        exampleUsage: 'Nhìn những vảy vàng 24K lấp lánh tan chảy trên da, vừa sang chảnh vừa cấp ẩm sâu cực đã!',
        benefitNotes: 'Tạo hiệu ứng thị giác sang trọng kích thích mua sắm'
      }
    ],
    objectionFaqs: [
      {
        id: 'faq-bio-01',
        question: 'Vàng trong chai Bio-Gold có phải vàng thật không, bôi lên có bị bít tắc lỗ chân lông không?',
        targetConcern: 'NGUỒN_GỐC_XUẤT_XỨ',
        recommendedAnswerForKoc: 'Vàng trong chai Bio-Essence là vàng 24K sinh học tinh khiết 98% chuẩn công nghệ y dược bạn nhé! Nhờ công nghệ Bio-Energy Complex nghiền siêu vi mô nên khi bạn xoa nhẹ là vảy vàng tan chảy thẩm thấu hoàn toàn vào hạ bì, không hề để lại cặn bám gây bít tắc lỗ chân lông.',
        doMentionPoints: ['Vàng 24K sinh học 98%', 'Tan chảy thẩm thấu hoàn toàn', 'Không gây bít tắc'],
        dontSayWords: ['Vàng trang sức', 'Kim loại nặng']
      }
    ],
    crisisProtocols: [
      {
        stepNumber: 1,
        actionTitle: 'Xác minh và cam kết đền bù chính hãng 200%',
        guidelineDescription: 'Cam kết nguồn gốc xuất xứ chính hãng tập đoàn Wipro Singapore với giấy kiểm định Cục Quản Lý Dược.',
        contactPic: 'Nguyễn Mai Linh (Account Lead)',
        slaResponseMinutes: 30
      }
    ],
    lastUpdated: '2026-09-23',
    updatedBy: 'Nguyễn Mai Linh (Account Lead)',
    publicShareSlug: 'bioessence-singapore-official',
    shareAccessPin: 'BIO2026'
  }
];

export const INITIAL_SCRIPTS: ScriptReviewItem[] = [];

export const INITIAL_BRANDS: BrandDetail[] = REAL_B2C_42_BRANDS;



// =========================================================================
// MONTHLY MASTER QUOTA PLANS (HẠN MỨC TRẦN THEO THÁNG & THEO 4 TIER KOC/KOL)
// =========================================================================
export const MONTHLY_MASTER_QUOTA_PLANS: MonthlyMasterQuotaPlan[] = [];

export const INITIAL_STAFF_ALLOCATIONS_26: MonthlyStaffAllocation[] = [
  {
    id: 'alloc-1',
    month: '2026/08',
    staffName: 'Đinh Thị Bích Liên',
    roleTitle: 'Senior Booking Specialist',
    assignedBrands: ['Royal Ausnz'],
    tier1Videos: 2,
    tier2Videos: 5,
    tier3Videos: 15,
    tier4Videos: 80,
    planVideos: 102,
    reportVideos: 69,
    airProgress: 68,
    planBudget: 378700000,
    reportBudget: 278390000,
    budgetProgress: 74,
    targetGmv: 350000000,
    actualGmv: 332494214,
    targetNewKocs: 35,
    actualNewKocs: 35,
    isLagging: false,
    managerNote: 'Tập trung video review sữa công thức và đẩy mạnh live affiliate'
  },
  {
    id: 'alloc-2',
    month: '2026/08',
    staffName: 'Hà Thị Thùy',
    roleTitle: 'Senior Booking Specialist',
    assignedBrands: ['Kutieskin Mama', 'Babe'],
    tier1Videos: 2,
    tier2Videos: 5,
    tier3Videos: 10,
    tier4Videos: 42,
    planVideos: 59,
    reportVideos: 46,
    airProgress: 78,
    planBudget: 359200000,
    reportBudget: 319160000,
    budgetProgress: 89,
    targetGmv: 200000000,
    actualGmv: 158396250,
    targetNewKocs: 20,
    actualNewKocs: 13,
    isLagging: false,
    managerNote: 'Cần đốc thúc KOC lên bài đúng hạn để kéo thêm 42M GMV'
  },
  {
    id: 'alloc-3',
    month: '2026/08',
    staffName: 'Bùi Thu Hằng',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Keyshu', 'Natural Care'],
    tier1Videos: 1,
    tier2Videos: 4,
    tier3Videos: 8,
    tier4Videos: 70,
    planVideos: 83,
    reportVideos: 80,
    airProgress: 96,
    planBudget: 283000000,
    reportBudget: 105430000,
    budgetProgress: 37,
    targetGmv: 150000000,
    actualGmv: 120216633,
    targetNewKocs: 70,
    actualNewKocs: 69,
    isLagging: false,
    managerNote: 'Top tuyển mới KOC xuất sắc. Cần giải ngân thêm ngân sách'
  },
  {
    id: 'alloc-4',
    month: '2026/08',
    staffName: 'Lê Phương Thảo (Team 1)',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Bye Bye Blemish'],
    tier1Videos: 1,
    tier2Videos: 4,
    tier3Videos: 9,
    tier4Videos: 52,
    planVideos: 66,
    reportVideos: 37,
    airProgress: 56,
    planBudget: 279900000,
    reportBudget: 235150000,
    budgetProgress: 84,
    targetGmv: 120000000,
    actualGmv: 111276407,
    targetNewKocs: 15,
    actualNewKocs: 10,
    isLagging: false
  },
  {
    id: 'alloc-5',
    month: '2026/08',
    staffName: 'Lương Nguyễn Trang Nhung',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Royal Ausnz'],
    tier1Videos: 2,
    tier2Videos: 5,
    tier3Videos: 9,
    tier4Videos: 45,
    planVideos: 61,
    reportVideos: 33,
    airProgress: 54,
    planBudget: 312500000,
    reportBudget: 218820000,
    budgetProgress: 70,
    targetGmv: 130000000,
    actualGmv: 103063678,
    targetNewKocs: 15,
    actualNewKocs: 10,
    isLagging: false
  },
  {
    id: 'alloc-6',
    month: '2026/08',
    staffName: 'Bùi Ngọc Ánh',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Kutieskin Mama'],
    tier1Videos: 1,
    tier2Videos: 4,
    tier3Videos: 8,
    tier4Videos: 58,
    planVideos: 71,
    reportVideos: 56,
    airProgress: 79,
    planBudget: 195000000,
    reportBudget: 165090000,
    budgetProgress: 85,
    targetGmv: 110000000,
    actualGmv: 96212218,
    targetNewKocs: 10,
    actualNewKocs: 5,
    isLagging: false
  },
  {
    id: 'alloc-7',
    month: '2026/08',
    staffName: 'Trần Hải Phượng',
    roleTitle: 'Senior Booking Specialist',
    assignedBrands: ['Babe'],
    tier1Videos: 2,
    tier2Videos: 5,
    tier3Videos: 12,
    tier4Videos: 114,
    planVideos: 133,
    reportVideos: 93,
    airProgress: 70,
    planBudget: 213300000,
    reportBudget: 168094000,
    budgetProgress: 79,
    targetGmv: 100000000,
    actualGmv: 96103566,
    targetNewKocs: 10,
    actualNewKocs: 4,
    isLagging: false
  },
  {
    id: 'alloc-8',
    month: '2026/08',
    staffName: 'Nguyễn Thị Hồng Ngát',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['EUPC'],
    tier1Videos: 1,
    tier2Videos: 3,
    tier3Videos: 6,
    tier4Videos: 105,
    planVideos: 115,
    reportVideos: 102,
    airProgress: 89,
    planBudget: 146480000,
    reportBudget: 141190000,
    budgetProgress: 96,
    targetGmv: 80000000,
    actualGmv: 68636142,
    targetNewKocs: 20,
    actualNewKocs: 17,
    isLagging: false
  },
  {
    id: 'alloc-9',
    month: '2026/08',
    staffName: 'Nguyễn Thị Mai Anh',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Natural Care'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 5,
    tier4Videos: 72,
    planVideos: 80,
    reportVideos: 78,
    airProgress: 98,
    planBudget: 108650000,
    reportBudget: 105110000,
    budgetProgress: 97,
    targetGmv: 70000000,
    actualGmv: 60255850,
    targetNewKocs: 12,
    actualNewKocs: 8,
    isLagging: false
  },
  {
    id: 'alloc-10',
    month: '2026/08',
    staffName: 'Vũ Ngọc Minh',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Bye Bye Blemish'],
    tier1Videos: 0,
    tier2Videos: 2,
    tier3Videos: 4,
    tier4Videos: 43,
    planVideos: 49,
    reportVideos: 32,
    airProgress: 65,
    planBudget: 73000000,
    reportBudget: 70650000,
    budgetProgress: 97,
    targetGmv: 50000000,
    actualGmv: 42822879,
    targetNewKocs: 10,
    actualNewKocs: 6,
    isLagging: false
  },
  {
    id: 'alloc-11',
    month: '2026/08',
    staffName: 'Phạm Thị Thu Hằng',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['pHCare'],
    tier1Videos: 2,
    tier2Videos: 4,
    tier3Videos: 7,
    tier4Videos: 66,
    planVideos: 79,
    reportVideos: 76,
    airProgress: 96,
    planBudget: 255800000,
    reportBudget: 276800000,
    budgetProgress: 108,
    targetGmv: 50000000,
    actualGmv: 38968092,
    targetNewKocs: 15,
    actualNewKocs: 10,
    isLagging: false
  },
  {
    id: 'alloc-12',
    month: '2026/08',
    staffName: 'Hoàng Hải Long',
    roleTitle: 'Junior Booking Specialist',
    assignedBrands: ['EUPC'],
    tier1Videos: 1,
    tier2Videos: 3,
    tier3Videos: 5,
    tier4Videos: 58,
    planVideos: 67,
    reportVideos: 32,
    airProgress: 48,
    planBudget: 234850000,
    reportBudget: 149370000,
    budgetProgress: 64,
    targetGmv: 50000000,
    actualGmv: 36838129,
    targetNewKocs: 15,
    actualNewKocs: 11,
    isLagging: true,
    managerNote: 'Tiến độ air 48% — cần đôn đốc KOC đăng bài trước kỳ chốt số'
  },
  {
    id: 'alloc-13',
    month: '2026/08',
    staffName: 'Vũ Hoài Lâm',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['pHCare'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 3,
    tier4Videos: 22,
    planVideos: 28,
    reportVideos: 4,
    airProgress: 14,
    planBudget: 84000000,
    reportBudget: 80800000,
    budgetProgress: 96,
    targetGmv: 45000000,
    actualGmv: 35090318,
    targetNewKocs: 10,
    actualNewKocs: 2,
    isLagging: true,
    managerNote: 'Cần đẩy nhanh tiến độ: Mới air 4/28 videos (14%). Yêu cầu kiểm tra việc giao mẫu và duyệt kịch bản'
  },
  {
    id: 'alloc-14',
    month: '2026/08',
    staffName: 'Phan Diệu Ánh',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Royal Ausnz'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 4,
    tier4Videos: 60,
    planVideos: 67,
    reportVideos: 59,
    airProgress: 88,
    planBudget: 68100000,
    reportBudget: 76830000,
    budgetProgress: 113,
    targetGmv: 25000000,
    actualGmv: 16099123,
    targetNewKocs: 12,
    actualNewKocs: 9,
    isLagging: false
  },
  {
    id: 'alloc-15',
    month: '2026/08',
    staffName: 'Dương Thị Hồng Nhung',
    roleTitle: 'Junior Booking Specialist',
    assignedBrands: ['Keyshu'],
    tier1Videos: 0,
    tier2Videos: 1,
    tier3Videos: 2,
    tier4Videos: 14,
    planVideos: 17,
    reportVideos: 4,
    airProgress: 24,
    planBudget: 45400000,
    reportBudget: 19000000,
    budgetProgress: 42,
    targetGmv: 20000000,
    actualGmv: 12328508,
    targetNewKocs: 5,
    actualNewKocs: 2,
    isLagging: true,
    managerNote: 'Tiến độ air 24% — cần giải quyết nhanh vướng mắc kịch bản'
  },
  {
    id: 'alloc-16',
    month: '2026/08',
    staffName: 'Lê Thanh Hải',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['pHCare', 'EUPC'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 3,
    tier4Videos: 40,
    planVideos: 46,
    reportVideos: 8,
    airProgress: 17,
    planBudget: 201000000,
    reportBudget: 65800000,
    budgetProgress: 33,
    targetGmv: 30000000,
    actualGmv: 11028735,
    targetNewKocs: 15,
    actualNewKocs: 5,
    isLagging: true,
    managerNote: 'Hụt nghiệm thu chi phí mã Ads pHCare — đã chỉ đạo giải tỏa'
  },
  {
    id: 'alloc-17',
    month: '2026/08',
    staffName: 'Lê Phương Thảo (Team 2)',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Natural Care'],
    tier1Videos: 0,
    tier2Videos: 2,
    tier3Videos: 4,
    tier4Videos: 141,
    planVideos: 147,
    reportVideos: 127,
    airProgress: 86,
    planBudget: 49900000,
    reportBudget: 36085000,
    budgetProgress: 72,
    targetGmv: 15000000,
    actualGmv: 7302233,
    targetNewKocs: 8,
    actualNewKocs: 2,
    isLagging: false
  },
  {
    id: 'alloc-18',
    month: '2026/08',
    staffName: 'Nguyễn Thị Quỳnh Nhi',
    roleTitle: 'Booking Specialist',
    assignedBrands: ['Kutieskin Mama'],
    tier1Videos: 0,
    tier2Videos: 2,
    tier3Videos: 3,
    tier4Videos: 116,
    planVideos: 121,
    reportVideos: 98,
    airProgress: 81,
    planBudget: 33200000,
    reportBudget: 52392000,
    budgetProgress: 158,
    targetGmv: 12000000,
    actualGmv: 6518469,
    targetNewKocs: 15,
    actualNewKocs: 11,
    isLagging: false
  },
  {
    id: 'alloc-19',
    month: '2026/08',
    staffName: 'Phạm Huyền Thương',
    roleTitle: 'Junior Booking Specialist',
    assignedBrands: ['Keyshu'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 2,
    tier4Videos: 9,
    planVideos: 14,
    reportVideos: 18,
    airProgress: 129,
    planBudget: 85000000,
    reportBudget: 45100000,
    budgetProgress: 53,
    targetGmv: 10000000,
    actualGmv: 5129623,
    targetNewKocs: 8,
    actualNewKocs: 5,
    isLagging: false
  },
  {
    id: 'alloc-20',
    month: '2026/08',
    staffName: 'Ôn Ngọc Hà',
    roleTitle: 'Junior Booking Specialist',
    assignedBrands: ['Bye Bye Blemish'],
    tier1Videos: 0,
    tier2Videos: 2,
    tier3Videos: 3,
    tier4Videos: 72,
    planVideos: 77,
    reportVideos: 12,
    airProgress: 16,
    planBudget: 12000000,
    reportBudget: 11000000,
    budgetProgress: 92,
    targetGmv: 8000000,
    actualGmv: 1847396,
    targetNewKocs: 5,
    actualNewKocs: 2,
    isLagging: true,
    managerNote: 'Tiến độ air 16% — Đề nghị kiểm tra kịch bản kẹt ở khâu duyệt'
  },
  {
    id: 'alloc-21',
    month: '2026/08',
    staffName: 'Nguyễn Ngọc Huyền',
    roleTitle: 'Junior Booking Specialist',
    assignedBrands: ['Babe'],
    tier1Videos: 1,
    tier2Videos: 2,
    tier3Videos: 3,
    tier4Videos: 58,
    planVideos: 64,
    reportVideos: 53,
    airProgress: 83,
    planBudget: 120000000,
    reportBudget: 107210000,
    budgetProgress: 89,
    targetGmv: 5000000,
    actualGmv: 964680,
    targetNewKocs: 5,
    actualNewKocs: 3,
    isLagging: false
  },
  {
    id: 'alloc-22',
    month: '2026/08',
    staffName: 'Nguyễn Ngọc Linh',
    roleTitle: 'Trainee Booking',
    assignedBrands: ['EUPC'],
    tier1Videos: 0,
    tier2Videos: 1,
    tier3Videos: 1,
    tier4Videos: 36,
    planVideos: 38,
    reportVideos: 37,
    airProgress: 97,
    planBudget: 16800000,
    reportBudget: 16000000,
    budgetProgress: 95,
    targetGmv: 2000000,
    actualGmv: 326540,
    targetNewKocs: 5,
    actualNewKocs: 3,
    isLagging: false
  },
  {
    id: 'alloc-23',
    month: '2026/08',
    staffName: 'Nguyễn Quỳnh Trang',
    roleTitle: 'Trainee Booking',
    assignedBrands: ['Natural Care'],
    tier1Videos: 0,
    tier2Videos: 0,
    tier3Videos: 0,
    tier4Videos: 42,
    planVideos: 42,
    reportVideos: 47,
    airProgress: 112,
    planBudget: 35500000,
    reportBudget: 33028000,
    budgetProgress: 93,
    targetGmv: 2000000,
    actualGmv: 0,
    targetNewKocs: 3,
    actualNewKocs: 1,
    isLagging: false
  },
  {
    id: 'alloc-24',
    month: '2026/08',
    staffName: 'Lại Ngọc Huyền',
    roleTitle: 'Trainee Booking',
    assignedBrands: ['Keyshu'],
    tier1Videos: 0,
    tier2Videos: 0,
    tier3Videos: 0,
    tier4Videos: 141,
    planVideos: 141,
    reportVideos: 138,
    airProgress: 98,
    planBudget: 45200000,
    reportBudget: 40540000,
    budgetProgress: 90,
    targetGmv: 2000000,
    actualGmv: 0,
    targetNewKocs: 2,
    actualNewKocs: 0,
    isLagging: false
  },
  {
    id: 'alloc-25',
    month: '2026/08',
    staffName: 'Trần Phương Thảo',
    roleTitle: 'Trainee Booking',
    assignedBrands: ['Bye Bye Blemish'],
    tier1Videos: 0,
    tier2Videos: 0,
    tier3Videos: 0,
    tier4Videos: 71,
    planVideos: 71,
    reportVideos: 60,
    airProgress: 85,
    planBudget: 43000000,
    reportBudget: 31050000,
    budgetProgress: 72,
    targetGmv: 2000000,
    actualGmv: 0,
    targetNewKocs: 2,
    actualNewKocs: 0,
    isLagging: false
  },
  {
    id: 'alloc-26',
    month: '2026/08',
    staffName: 'Khánh Vy',
    roleTitle: 'Senior Booking Specialist',
    assignedBrands: ['Kutieskin Mama', 'Royal Ausnz', 'Bye Bye Blemish'],
    tier1Videos: 3,
    tier2Videos: 3,
    tier3Videos: 5,
    tier4Videos: 109,
    planVideos: 120,
    reportVideos: 98,
    airProgress: 82,
    planBudget: 290000000,
    reportBudget: 245000000,
    budgetProgress: 84,
    targetGmv: 320000000,
    actualGmv: 295000000,
    targetNewKocs: 30,
    actualNewKocs: 28,
    isLagging: false,
    managerNote: 'Phụ trách điều phối chính cụm gian hàng mẹ bé và mỹ phẩm'
  }
];

export const INITIAL_GROWTH_DEMANDS: GrowthDemandItem[] = [
  {
    id: 'gd-01',
    code: 'GD-1010-SENKA',
    title: 'Mega Sale 10.10 - Gian Hàng TikTok Shop Senka',
    brandName: 'Senka',
    brandCategory: 'Skincare / Chống nắng & Làm sạch',
    month: '2026/10',
    totalAssignedBudget: 150000000,
    targetGmv: 750000000,
    cancellationRate: 0.08,
    targetNmv: 690000000, // 750M * (1 - 0.08)
    targetCir: 20.0,
    bookingPic: 'Khánh Vy',
    deadlineBreakdown: 'Trước 18:00 ngày 25/09/2026',
    growthNotes: 'Đẩy mạnh dòng Sữa Rửa Mặt Perfect Whip và Kem Chống Nắng Senka Perfect UV Gel. Cần tối thiểu 1 Celeb/Mega mở phễu tạo trust, phần lớn ngân sách dồn vào Micro KOC và Mass Affiliate để phủ sàn TikTok Shop trong 3 ngày D-Day.',
    status: 'PENDING_BREAKDOWN',
    bookingStrategyNotes: '',
    selfChannelPlan: {
      plannedVideos: 24,
      approvedVideos: 24,
      reportedVideos: 18,
      productionBudget: 18000000,
      reportedCost: 14200000,
      reupTargets: {
        tiktok: 24,
        shopee: 24,
        facebook: 20,
        threads: 12
      }
    },
    livestreamPlan: {
      inhouseSessionsHn: 8,
      inhouseSessionsHcm: 16,
      ctvSessions: 10,
      totalHours: 92,
      affiliateLiveSessions: 4,
      plannedBudget: 35000000,
      reportedBudget: 28500000,
      plannedGmv: 250000000,
      reportedGmv: 198000000
    },
    fourStageTracking: {
      planBudget: 150000000,
      approvedBudget: 150000000,
      adjustedBudget: 155000000,
      reportedBudgetMtd: 114000000,
      budgetGapMtd: 41000000,
      planNmv: 690000000,
      approvedNmv: 690000000,
      adjustedNmv: 710000000,
      reportedNmvMtd: 512000000,
      nmvGapMtd: 198000000,
      cancellationRate: 0.08
    },
    createdAt: '2026-09-22 09:30',
    breakdown: [
      {
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        salaryGradeLabel: 'KL7 (>30M/video)',
        targetCount: 1,
        estimatedAvgCost: 35000000,
        allocatedBudget: 35000000,
        estimatedGmvPerKoc: 140000000,
        totalExpectedGmv: 140000000,
        historicalRoiBenchmark: 4.0,
        notes: 'Chốt 1 Mega KOL ngành Beauty mở phễu (như Call Me Duy hoặc Hannah Olala)'
      },
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 3,
        estimatedAvgCost: 18000000,
        allocatedBudget: 54000000,
        estimatedGmvPerKoc: 90000000,
        totalExpectedGmv: 270000000,
        historicalRoiBenchmark: 5.0,
        notes: 'Tập trung 3 Macro uy tín test chất kem chống nắng thực tế'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 8,
        estimatedAvgCost: 4500000,
        allocatedBudget: 36000000,
        estimatedGmvPerKoc: 31500000,
        totalExpectedGmv: 252000000,
        historicalRoiBenchmark: 7.0,
        notes: 'KOC học sinh, sinh viên, dân văn phòng review chân thực'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 25,
        estimatedAvgCost: 1000000,
        allocatedBudget: 25000000,
        estimatedGmvPerKoc: 11000000,
        totalExpectedGmv: 275000000,
        historicalRoiBenchmark: 11.0,
        notes: 'Gửi hàng mẫu kèm mã voucher độc quyền gắn giỏ hàng TikTok Shop'
      }
    ]
  },
  {
    id: 'gd-02',
    code: 'GD-1010-BIO',
    title: 'Chiến Dịch Kháng Nắng Đa Tầng - Bio-Essence',
    brandName: 'Bio-Essence',
    brandCategory: 'Mỹ phẩm / Dưỡng da công nghệ Bio-Energy',
    month: '2026/10',
    totalAssignedBudget: 120000000,
    targetGmv: 600000000,
    targetCir: 20.0,
    bookingPic: 'Trần Minh Đức',
    deadlineBreakdown: 'Đã lập plan xong',
    growthNotes: 'Tập trung các KOC có tệp follower Nữ 22-32 tuổi, dân văn phòng. Yêu cầu 100% video phải lấy được mã Spark Ads để team Growth chạy đè Ads đẩy GMV.',
    status: 'PLANNED',
    bookingStrategyNotes: 'Đã phân bổ 2 Macro chuyên Beauty (Chloe Nguyễn, Chanh Beauty) và 15 Micro chuyên review thực tế kem chống nắng không bết dính. Đạt GMV dự phóng 635M, CIR 18.9%.',
    createdAt: '2026-09-20 14:00',
    breakdown: [
      {
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        salaryGradeLabel: 'KL7 (>30M/video)',
        targetCount: 0,
        estimatedAvgCost: 35000000,
        allocatedBudget: 0,
        estimatedGmvPerKoc: 0,
        totalExpectedGmv: 0,
        historicalRoiBenchmark: 4.0,
        notes: 'Chiến dịch này không sử dụng Celeb để tối ưu CIR'
      },
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 3,
        estimatedAvgCost: 20000000,
        allocatedBudget: 60000000,
        estimatedGmvPerKoc: 100000000,
        totalExpectedGmv: 300000000,
        historicalRoiBenchmark: 5.0,
        notes: 'Chốt Chanh Beauty và 2 Beauty Blogger có tỷ lệ chuyển đổi cao'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 8,
        estimatedAvgCost: 5000000,
        allocatedBudget: 40000000,
        estimatedGmvPerKoc: 32000000,
        totalExpectedGmv: 256000000,
        historicalRoiBenchmark: 6.4,
        notes: 'Tập trung góc quay cận cảnh finish trên da dưới ánh nắng tự nhiên'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 20,
        estimatedAvgCost: 1000000,
        allocatedBudget: 20000000,
        estimatedGmvPerKoc: 9000000,
        totalExpectedGmv: 180000000,
        historicalRoiBenchmark: 9.0,
        notes: 'Đăng tải video đồng loạt vào khung giờ vàng D-Day (11h - 13h & 20h - 22h)'
      }
    ]
  },
  {
    id: 'gd-03',
    code: 'GD-1010-COCOON',
    title: 'Chiến Dịch Thu Đông 2026 - Cocoon Vietnam',
    brandName: 'Cocoon',
    brandCategory: 'Mỹ phẩm thuần chay Việt Nam',
    month: '2026/10',
    totalAssignedBudget: 80000000,
    targetGmv: 480000000,
    targetCir: 16.7,
    bookingPic: 'Lê Hoàng Yến',
    deadlineBreakdown: 'Đã được duyệt',
    growthNotes: 'Đẩy dòng Tẩy tế bào chết Cà phê Đắk Lắk và Nước hoa hồng hoa hồng Cao Bằng. Ưu tiên KOC phong cách organic, sống xanh, tự nhiên.',
    status: 'LEAD_APPROVED',
    bookingStrategyNotes: 'Chiến lược tập trung vào tệp KOC phong cách sống xanh và sinh viên. Đã qua phê duyệt của Trưởng bộ phận, sẵn sàng bàn giao deal sang Booking tác nghiệp.',
    createdAt: '2026-09-18 10:15',
    approvedAt: '2026-09-19 16:30',
    breakdown: [
      {
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        salaryGradeLabel: 'KL7 (>30M/video)',
        targetCount: 0,
        estimatedAvgCost: 30000000,
        allocatedBudget: 0,
        estimatedGmvPerKoc: 0,
        totalExpectedGmv: 0,
        historicalRoiBenchmark: 4.0,
        notes: 'Không phân bổ ngân sách Celeb'
      },
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 2,
        estimatedAvgCost: 15000000,
        allocatedBudget: 30000000,
        estimatedGmvPerKoc: 85000000,
        totalExpectedGmv: 170000000,
        historicalRoiBenchmark: 5.7,
        notes: 'Chọn KOL có tiếng nói về môi trường và bảo vệ động vật'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 8,
        estimatedAvgCost: 4000000,
        allocatedBudget: 32000000,
        estimatedGmvPerKoc: 28000000,
        totalExpectedGmv: 224000000,
        historicalRoiBenchmark: 7.0,
        notes: 'Micro KOC unboxing hộp quà tái chế thuần chay'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 18,
        estimatedAvgCost: 1000000,
        allocatedBudget: 18000000,
        estimatedGmvPerKoc: 7500000,
        totalExpectedGmv: 135000000,
        historicalRoiBenchmark: 7.5,
        notes: 'Affiliate video ngắn Shopee Video & TikTok Shop'
      }
    ]
  },
  {
    id: 'gd-04',
    code: 'GD-1010-LOREAL',
    title: 'Super Brand Day Shopee & TikTok - L\'Oréal Paris',
    brandName: 'L\'Oréal Paris',
    brandCategory: 'Mỹ phẩm cao cấp / Chăm sóc tóc & Serum',
    month: '2026/10',
    totalAssignedBudget: 250000000,
    targetGmv: 1500000000,
    targetCir: 16.7,
    bookingPic: 'Khánh Vy',
    deadlineBreakdown: 'Đang triển khai booking',
    growthNotes: 'Chiến dịch trọng điểm quý 4. Đẩy Serum Hyaluronic Acid và Dưỡng tóc Elseve. Cần 2 Celeb hạng A và kết hợp Live Affiliate lớn.',
    status: 'IN_EXECUTION',
    bookingStrategyNotes: 'Đã chốt 2 Celeb Tier 1 (Ninh Anh Bùi, Thạch Trang), 5 Macro và 40 Affiliate vệ tinh. Hợp đồng đợt 1 đã hoàn tất 100%.',
    createdAt: '2026-09-15 08:30',
    approvedAt: '2026-09-16 11:00',
    breakdown: [
      {
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        salaryGradeLabel: 'KL7 (>30M/video)',
        targetCount: 2,
        estimatedAvgCost: 40000000,
        allocatedBudget: 80000000,
        estimatedGmvPerKoc: 200000000,
        totalExpectedGmv: 400000000,
        historicalRoiBenchmark: 5.0,
        notes: 'Ninh Anh Bùi & Thạch Trang lên bài khung giờ vàng teasing'
      },
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 4,
        estimatedAvgCost: 20000000,
        allocatedBudget: 80000000,
        estimatedGmvPerKoc: 120000000,
        totalExpectedGmv: 480000000,
        historicalRoiBenchmark: 6.0,
        notes: 'Macro trải nghiệm dưỡng tóc phục hồi 7 ngày'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 10,
        estimatedAvgCost: 5000000,
        allocatedBudget: 50000000,
        estimatedGmvPerKoc: 35000000,
        totalExpectedGmv: 350000000,
        historicalRoiBenchmark: 7.0,
        notes: 'Review khoa học về phân tử Macro & Micro HA'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 40,
        estimatedAvgCost: 1000000,
        allocatedBudget: 40000000,
        estimatedGmvPerKoc: 10000000,
        totalExpectedGmv: 400000000,
        historicalRoiBenchmark: 10.0,
        notes: 'Affiliate mass phủ sóng toàn sàn'
      }
    ]
  }
];

export const INITIAL_BRAND_PORTAL_DATA: BrandCampaignPortalData[] = [
  {
    id: 'portal-senka-1010',
    brandId: 'brand-senka',
    brandName: 'Senka Official',
    brandLogoText: 'SENKA',
    campaignCode: 'GD-1010-SENKA',
    campaignTitle: 'Mega Sale 10.10 - Gian Hàng TikTok Shop Senka',
    month: '2026/10',
    totalBudget: 150000000,
    targetGmv: 750000000,
    targetCir: 20.0,
    focusSkus: ['Sữa Rửa Mặt Senka Perfect Whip 120g', 'Kem Chống Nắng Senka Perfect UV Gel 80ml'],
    bigIdea: 'Sạch Sâu Thoáng Mịn - Chuẩn Gái Nhật Rạng Ngời D-Day 10.10',
    planApprovalStatus: 'PENDING_BRAND_PLAN', // Chặng 1: Brand đang xem xét duyệt Kế hoạch Ngân sách
    breakdownTiers: [
      {
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        salaryGradeLabel: 'KL7 (>30M)',
        targetCount: 1,
        estimatedAvgCost: 35000000,
        allocatedBudget: 35000000,
        estimatedGmvPerKoc: 140000000,
        totalExpectedGmv: 140000000,
        historicalRoiBenchmark: 4.0,
        notes: '01 Celeb Beauty mở phễu tạo trust đầu chiến dịch'
      },
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 3,
        estimatedAvgCost: 18000000,
        allocatedBudget: 54000000,
        estimatedGmvPerKoc: 90000000,
        totalExpectedGmv: 270000000,
        historicalRoiBenchmark: 5.0,
        notes: '03 Macro uy tín test chất kem và khả năng tạo bọt tơ tằm'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 8,
        estimatedAvgCost: 4500000,
        allocatedBudget: 36000000,
        estimatedGmvPerKoc: 31500000,
        totalExpectedGmv: 252000000,
        historicalRoiBenchmark: 7.0,
        notes: '08 Micro review chân thực từ tệp học sinh, sinh viên, công sở'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 25,
        estimatedAvgCost: 1000000,
        allocatedBudget: 25000000,
        estimatedGmvPerKoc: 11000000,
        totalExpectedGmv: 275000000,
        historicalRoiBenchmark: 11.0,
        notes: '25 Affiliate phủ sóng gắn link giỏ hàng toàn sàn 3 ngày D-Day'
      }
    ],
    kocCandidates: [
      {
        id: 'koc-senka-01',
        stageName: 'Call Me Duy',
        channelId: '@callmeduy',
        channelUrl: 'https://tiktok.com/@callmeduy',
        tier: 'TIER_1_CELEB',
        tierLabel: 'Level 1: Celeb / Mega KOL',
        followers: 1250000,
        avgViews: 480000,
        engagementRate: 5.2,
        niche: 'Beauty / Chuyên gia Skincare',
        formatDescription: '01 Video TikTok 60s độc quyền ngành + Quyền chạy Spark Ads 30 ngày + Ghim bình luận link giỏ hàng',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleVideoUrls: [
          { title: 'So sánh bảng thành phần sữa rửa mặt Senka vs Cerave', url: 'https://tiktok.com/@callmeduy/video/1' },
          { title: 'Routine dưỡng sáng da cho da dầu mụn mùa hè', url: 'https://tiktok.com/@callmeduy/video/2' }
        ]
      },
      {
        id: 'koc-senka-02',
        stageName: 'Chanh Beauty',
        channelId: '@chanhbeauty99',
        channelUrl: 'https://tiktok.com/@chanhbeauty99',
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        followers: 680000,
        avgViews: 220000,
        engagementRate: 6.4,
        niche: 'Beauty Reviewer',
        formatDescription: '01 Video ngắn 45s review trải nghiệm bọt tơ tằm + Gắn giỏ hàng TikTok Shop',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleVideoUrls: [
          { title: 'Top 3 kem chống nắng ráo mịn không vón cục', url: 'https://tiktok.com/@chanhbeauty99/video/1' }
        ]
      },
      {
        id: 'koc-senka-03',
        stageName: 'Chloe Nguyễn',
        channelId: '@bychloenguyen',
        channelUrl: 'https://tiktok.com/@bychloenguyen',
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        followers: 540000,
        avgViews: 190000,
        engagementRate: 4.9,
        niche: 'Lifestyle & Skincare Sang Trọng',
        formatDescription: '01 Video Morning Routine công sở với Senka Perfect UV Gel + Gắn mã ưu đãi',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleVideoUrls: [
          { title: 'Chuẩn bị đi làm trong 15 phút với lớp chống nắng tự nhiên', url: 'https://tiktok.com/@bychloenguyen/video/1' }
        ]
      },
      {
        id: 'koc-senka-04',
        stageName: 'Bác Sĩ Mã Phượng',
        channelId: '@bsmaphuong.da',
        channelUrl: 'https://tiktok.com/@bsmaphuong.da',
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        followers: 185000,
        avgViews: 95000,
        engagementRate: 7.1,
        niche: 'Bác sĩ / Chuyên môn Da liễu',
        formatDescription: '01 Video phân tích pH 5.5 và khả năng làm sạch bụi mịn PM2.5',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleVideoUrls: [
          { title: 'Da dầu mụn nên chọn sữa rửa mặt tạo bọt hay dạng gel?', url: 'https://tiktok.com/@bsmaphuong.da/video/1' }
        ]
      },
      {
        id: 'koc-senka-05',
        stageName: 'Bé Đăng Skincare',
        channelId: '@bedang.skincare',
        channelUrl: 'https://tiktok.com/@bedang.skincare',
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        followers: 142000,
        avgViews: 88000,
        engagementRate: 8.0,
        niche: 'Học sinh / Sinh viên Review',
        formatDescription: '01 Video review học sinh giá rẻ chất lượng Nhật Bản',
        brandApprovalStatus: 'CHỜ_DUYỆT',
        sampleVideoUrls: [
          { title: 'Học sinh mang gì trong cặp khi đi học cả ngày nắng gắt?', url: 'https://tiktok.com/@bedang.skincare/video/1' }
        ]
      }
    ],
    scripts: [
      {
        id: 'sc-senka-01',
        dealCode: 'BO26_1001_DUY',
        kocStageName: 'Call Me Duy',
        channelId: '@callmeduy',
        tier: 'TIER_1_CELEB',
        productName: 'Senka Perfect Whip 120g & Gel Chống Nắng',
        videoDuration: '60 giây',
        hook: 'Ai bảo sữa rửa mặt tạo bọt là làm khô căng da mặt? Thử ngay công nghệ bọt tơ tằm gấp 5 lần mật độ của Senka!',
        painPoint: 'Nhiều bạn da dầu mùa hè rửa mặt xong cảm giác rít và khô rát vì chất tạo bọt công nghiệp làm mất hàng rào ẩm tự nhiên.',
        solutionAndUsp: 'Senka Perfect Whip ứng dụng kén tơ tằm trắng Mayu Haku và Hyaluronic Acid đôi. Bọt siêu mịn len sâu lỗ chân lông cuốn sạch bụi mịn mà da vẫn ẩm mượt 8 tiếng.',
        callToAction: 'Duy ghim ngay giỏ hàng TikTok Shop bên dưới kèm voucher giảm 30% độc quyền chỉ có trong 3 ngày Mega Sale 10.10 này!',
        status: 'PENDING',
        revisionCount: 0,
        remainingHours: 18,
        draftVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-washing-her-face-with-soap-41484-large.mp4'
      },
      {
        id: 'sc-senka-02',
        dealCode: 'BO26_1002_CHANH',
        kocStageName: 'Chanh Beauty',
        channelId: '@chanhbeauty99',
        tier: 'TIER_2_MACRO',
        productName: 'Kem Chống Nắng Senka Perfect UV Gel 80ml',
        videoDuration: '45 giây',
        hook: '3 giây để da bạn "uống nước" và chống nắng cả ngày không sợ bóng nhờn!',
        painPoint: 'Mùa nắng nóng này sợ nhất là bôi kem chống nắng bị vón cục thành ghét trắng, bết rít như trét mỡ lên mặt.',
        solutionAndUsp: 'Senka Perfect UV Gel dạng sữa lỏng nhẹ như nước, thấm sau 5 giây để lại finish mịn lì tự nhiên, chỉ số SPF 50+ PA++++ bảo vệ tuyệt đối.',
        callToAction: 'Deal hời mua 1 tặng 1 sữa rửa mặt mini duy nhất tại link giỏ hàng góc trái màn hình nha cả nhà!',
        status: 'PENDING',
        revisionCount: 0,
        remainingHours: 22
      }
    ],
    liveAiredVideosCount: 2,
    totalTargetVideos: 37,
    totalAiredViews: 345000,
    totalAffiliateGmv: 142000000,
    accountPic: 'Phương Thảo (Account Manager)',
    bookingPic: 'Khánh Vy (Senior Booking)'
  },
  {
    id: 'portal-bio-1010',
    brandId: 'brand-bio',
    brandName: 'Bio-Essence Vietnam',
    brandLogoText: 'BIO-ESSENCE',
    campaignCode: 'GD-1010-BIO',
    campaignTitle: 'Chiến Dịch Kháng Nắng Đa Tầng - Bio-Essence',
    month: '2026/10',
    totalBudget: 120000000,
    targetGmv: 600000000,
    targetCir: 20.0,
    focusSkus: ['Gel Chống Nắng Kháng Nắng Đa Tầng Bio-Water SPF 50+'],
    bigIdea: 'Kháng Nắng Đa Tầng - Da Mát Dịu Dưới Nắng Hè 40°C',
    planApprovalStatus: 'BRAND_PLAN_APPROVED', // Chặng 1: Brand ĐÃ DUYỆT Plan
    planApprovalDate: '2026-09-21 15:30',
    planFeedbackNotes: 'Brand duyệt cấu trúc 3 Macro và 8 Micro KOC. Đề nghị tập trung góc quay cận chất gel mỏng nhẹ.',
    breakdownTiers: [
      {
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        salaryGradeLabel: 'KL6 (10M - 30M)',
        targetCount: 3,
        estimatedAvgCost: 20000000,
        allocatedBudget: 60000000,
        estimatedGmvPerKoc: 100000000,
        totalExpectedGmv: 300000000,
        historicalRoiBenchmark: 5.0,
        notes: '03 Macro chuyên sâu skincare công nghệ'
      },
      {
        tier: 'TIER_3_MICRO',
        tierLabel: 'Level 3: Micro KOC',
        salaryGradeLabel: 'KL4 - KL5 (2.5M - 10M)',
        targetCount: 8,
        estimatedAvgCost: 5000000,
        allocatedBudget: 40000000,
        estimatedGmvPerKoc: 32000000,
        totalExpectedGmv: 256000000,
        historicalRoiBenchmark: 6.4,
        notes: '08 Micro KOC công sở test độ hạ nhiệt trên da'
      },
      {
        tier: 'TIER_4_AFFILIATE',
        tierLabel: 'Level 4: Nano & Mass Affiliate',
        salaryGradeLabel: 'KL1 - KL3 (<2.5M / Sample)',
        targetCount: 20,
        estimatedAvgCost: 1000000,
        allocatedBudget: 20000000,
        estimatedGmvPerKoc: 9000000,
        totalExpectedGmv: 180000000,
        historicalRoiBenchmark: 9.0,
        notes: '20 Affiliate vệ tinh bám trend'
      }
    ],
    kocCandidates: [
      {
        id: 'koc-bio-01',
        stageName: 'Trinh Meow',
        channelId: '@trinhmeow95',
        channelUrl: 'https://tiktok.com/@trinhmeow95',
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        followers: 420000,
        avgViews: 180000,
        engagementRate: 5.8,
        niche: 'Beauty & Skincare Khoa Học',
        formatDescription: '01 Video phân tích công nghệ Bio-Energy Complex độc quyền',
        brandApprovalStatus: 'ĐÃ_DUYỆT',
        sampleVideoUrls: [
          { title: 'Top serum phục hồi da sau treatment', url: 'https://tiktok.com/@trinhmeow95/video/1' }
        ]
      },
      {
        id: 'koc-bio-02',
        stageName: 'Quỳnh Thi',
        channelId: '@quynhthi_daily',
        channelUrl: 'https://tiktok.com/@quynhthi_daily',
        tier: 'TIER_2_MACRO',
        tierLabel: 'Level 2: Macro KOL',
        followers: 390000,
        avgViews: 150000,
        engagementRate: 6.1,
        niche: 'Review Mỹ Phẩm Sinh Viên',
        formatDescription: '01 Video test chống nước khi đi bơi',
        brandApprovalStatus: 'TỪ_CHỐI',
        rejectReason: 'Từng booking đối thủ cạnh tranh (Anessa) tuần trước',
        sampleVideoUrls: [
          { title: 'Review kem chống nắng đi biển', url: 'https://tiktok.com/@quynhthi_daily/video/1' }
        ]
      }
    ],
    scripts: [
      {
        id: 'sc-bio-01',
        dealCode: 'BO26_1003_TRINHMEOW',
        kocStageName: 'Trinh Meow',
        channelId: '@trinhmeow95',
        tier: 'TIER_2_MACRO',
        productName: 'Bio-Water SPF 50+',
        videoDuration: '60 giây',
        hook: 'Hạ nhiệt da ngay 5 độ C dưới nắng gay gắt với màng lọc chống nắng thế hệ mới!',
        painPoint: 'Tia UVA thâm nhập phá vỡ collagen khiến da lão hóa sớm mà kem chống nắng thường không cản nổi nhiệt.',
        solutionAndUsp: 'Công nghệ độc quyền Bio-Energy Complex từ Bio-Essence giúp tế bào hấp thu oxy tăng cường sức đề kháng cho da.',
        callToAction: 'Chớp ngay deal sốc mua gel chống nắng tặng xịt khoáng 100ml tại link giỏ hàng nha!',
        status: 'APPROVED',
        revisionCount: 1,
        remainingHours: 0,
        publishedVideoUrl: 'https://tiktok.com/@trinhmeow95/video/1003',
        views: 280000,
        gmv: 115000000
      }
    ],
    liveAiredVideosCount: 1,
    totalTargetVideos: 31,
    totalAiredViews: 280000,
    totalAffiliateGmv: 115000000,
    accountPic: 'Phương Thảo (Account Manager)',
    bookingPic: 'Trần Minh Đức'
  }
];

// ==========================================
// DỮ LIỆU GIÁM SÁT VẬN ĐƠN MẪU & CHỐNG BÙNG MẪU (MEUP PLAYBOOK)
// ==========================================
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

// =========================================================================
// 6 CANONICAL MODULES MOCK DATASETS
// =========================================================================

// --- MODULE 1: PORTFOLIO / STORE MANAGEMENT ---
const DEFAULT_SAMPLE_STORES: StorePortfolioItem[] = [
  {
    id: 'store-port-1',
    brandName: 'Kutieskin',
    storeName: 'Kutieskin Mama_TikTok_E2E-S',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/kutieskin_mama',
    serviceModel: 'FULL_SERVICE',
    difficultyTier: 'Khó',
    difficultyMultiplier: 1.6,
    accountStatus: 'ACTIVE',
    category: 'Mẹ & Bé / Chăm Sóc Da',
    monthlyTargetGmv: 850000000,
    monthlyBudget: 150000000,
    accountOwnerName: 'Phạm Thị Nhài',
    b2cOwnerName: 'Khánh Vy, Trần Minh Đức',
    b2cOwners: ['Khánh Vy', 'Trần Minh Đức'], // 2 nhân viên cùng phụ trách 1 shop
    assignmentNotes: 'Khánh Vy phụ trách KOC Tier 1 & Tier 2; Trần Minh Đức phụ trách Tier 3 & Seeding Affiliate',
    activeCandidatesCount: 18,
    activeBookingsCount: 12,
    activeContentsCount: 22,
    isB2cManaged: true,
    requiresB2cPlan: true,
    createdAt: '2026-01-15'
  },
  {
    id: 'store-port-2',
    brandName: 'Fresh Herb',
    storeName: 'Fresh_TikTok_E2E-C',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/fresh_herb_vn',
    serviceModel: 'AFFILIATE_ONLY',
    difficultyTier: 'Tiêu chuẩn',
    difficultyMultiplier: 1.2,
    accountStatus: 'ACTIVE',
    category: 'Trị Mụn & Skincare',
    monthlyTargetGmv: 450000000,
    monthlyBudget: 75000000,
    accountOwnerName: 'Nguyễn Anh Tú',
    b2cOwnerName: 'Trần Minh Đức',
    b2cOwners: ['Trần Minh Đức'],
    assignmentNotes: 'Vận hành độc quyền mạng lưới KOC Affiliate & Seeding đơn lẻ',
    activeCandidatesCount: 14,
    activeBookingsCount: 9,
    activeContentsCount: 12,
    isB2cManaged: true,
    requiresB2cPlan: true,
    createdAt: '2026-03-01'
  },
  {
    id: 'store-port-3',
    brandName: 'Bio-Essence',
    storeName: 'Bio-Essence_TikTok_Shop',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/bio_essence_official',
    serviceModel: 'FULL_SERVICE',
    difficultyTier: 'Vừa',
    difficultyMultiplier: 1.4,
    accountStatus: 'ACTIVE',
    category: 'Dược Mỹ Phẩm Châu Âu',
    monthlyTargetGmv: 620000000,
    monthlyBudget: 110000000,
    accountOwnerName: 'Hà Thị Thương',
    b2cOwnerName: 'Khánh Vy',
    b2cOwners: ['Khánh Vy'],
    assignmentNotes: 'Phụ trách chính kịch bản y khoa & booking dược sĩ/KOC da liễu',
    activeCandidatesCount: 12,
    activeBookingsCount: 8,
    activeContentsCount: 15,
    isB2cManaged: true,
    requiresB2cPlan: true,
    createdAt: '2026-02-10'
  },
  {
    id: 'store-port-4',
    brandName: 'Senka',
    storeName: 'Senka_Official_Store',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/senka_vietnam',
    serviceModel: 'LIVESTREAM_DEDICATED',
    difficultyTier: 'Khó',
    difficultyMultiplier: 1.6,
    accountStatus: 'ACTIVE',
    category: 'Mỹ Phẩm Làm Sạch',
    monthlyTargetGmv: 950000000,
    monthlyBudget: 180000000,
    accountOwnerName: 'Phạm Thị Hồng Yến',
    b2cOwnerName: 'Quỳnh Như, Khánh Vy',
    b2cOwners: ['Quỳnh Như', 'Khánh Vy'], // 2 nhân viên cùng phụ trách 1 shop
    assignmentNotes: 'Quỳnh Như lead phòng Live Hà Nội & kịch bản; Khánh Vy booking KOC đẩy traffic phiên Mega',
    activeCandidatesCount: 25,
    activeBookingsCount: 16,
    activeContentsCount: 28,
    isB2cManaged: true,
    requiresB2cPlan: true,
    createdAt: '2025-11-20'
  },
  {
    id: 'store-port-5',
    brandName: 'Face Republic',
    storeName: 'Face Republic Official Store',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/face_republic_vn',
    serviceModel: 'FULL_SERVICE',
    difficultyTier: 'Vừa',
    difficultyMultiplier: 1.4,
    accountStatus: 'ACTIVE',
    category: 'Dược mỹ phẩm Hàn Quốc',
    monthlyTargetGmv: 520000000,
    monthlyBudget: 85000000,
    accountOwnerName: 'Hoàng Long',
    b2cOwnerName: 'Đặng Mai Hà Linh, Nguyễn Ngọc Huyền',
    b2cOwners: ['Đặng Mai Hà Linh', 'Nguyễn Ngọc Huyền'], // 2 nhân viên cùng phụ trách 1 shop
    assignmentNotes: 'Brand tự vận hành chiến dịch & booking in-house; Marketing B2C miễn trừ làm plan',
    activeCandidatesCount: 16,
    activeBookingsCount: 11,
    activeContentsCount: 18,
    isB2cManaged: false,
    requiresB2cPlan: false,
    createdAt: '2026-02-15'
  },
  {
    id: 'store-port-6',
    brandName: 'Peripera',
    storeName: 'Peripera Vietnam Club',
    platform: 'TikTok Shop',
    storeUrl: 'https://shop.tiktok.com/view/product/peripera_vn',
    serviceModel: 'FULL_SERVICE',
    difficultyTier: 'Khó',
    difficultyMultiplier: 1.6,
    accountStatus: 'ACTIVE',
    category: 'Trang điểm Gen Z',
    monthlyTargetGmv: 650000000,
    monthlyBudget: 120000000,
    accountOwnerName: 'Phạm Thị Nhài',
    b2cOwnerName: 'Đặng Mai Hà Linh',
    b2cOwners: ['Đặng Mai Hà Linh'],
    assignmentNotes: 'Store độ khó cao yêu cầu casting khắt khe; follow KOC test màu son trực tiếp',
    activeCandidatesCount: 20,
    activeBookingsCount: 14,
    activeContentsCount: 24,
    isB2cManaged: true,
    requiresB2cPlan: true,
    createdAt: '2026-03-10'
  }
];

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
  planGmv: 2870000000,
  actualGmv: 2415000000,
  gmvAchievementRate: 84.1,
  planBudget: 515000000,
  actualSpentBudget: 421000000,
  budgetBurnRate: 81.7,
  cirCurrent: 17.4,
  slaOnTimeRate: 94.2,
  pendingBacklogCases: 14,
  bottleneckTeam: 'CONTENT (Thẩm định kịch bản)',
  firstTimePassRate: 78.5,
  ghostSampleWarnings: 2,
  overloadStaffCount: 1
};

// =========================================================================
// INITIAL DETAILED STAFF PLANS (KẾ HOẠCH CHI TIẾT DO NHÂN VIÊN LẬP)
// =========================================================================
export const INITIAL_DETAILED_STAFF_PLANS: StaffDetailedPlanItem[] = [];

export const INITIAL_SLA_BREACHES: SlaBreachItem[] = [];

export const INITIAL_STAFF_SLA_REPORTS: StaffSlaReportItem[] = [];

export const INITIAL_RECONCILIATION_WINDOW: E2EReconciliationWindow = {
  currentPhase: 'OPEN_WINDOW_WD05',
  phaseLabel: 'Cửa sổ Nghiệm Thu Round 1 (Ngày làm việc thứ 05)',
  windowOpenTime: '09:00',
  windowCloseTime: '17:00 (Khóa sổ lúc 17:30)',
  isOpenForEdit: true,
  totalErrorsReportedRound1: 14,
  totalErrorsReportedRound2: 0,
  resolvedErrorsCount: 11,
  pendingErrorsCount: 3
};

// ==========================================
// MASTER DATA SẢN PHẨM THÚC ĐẨY (FOCUS PUSH PRODUCTS)
// Chiều phân cấp: Brand => Gian hàng (Store) => Sản phẩm thúc đẩy
// ==========================================
export const INITIAL_PUSH_PRODUCTS: PushProductItem[] = [
  // ==========================================
  // BRAND 1: KUTIESKIN MAMA & BABY
  // ==========================================
  // Gian hàng 1: Shopee Mall Kutieskin Chính Hãng (store-kutieskin-sp)
  {
    id: 'push-kuti-1',
    sku: 'KUTIE-SOOTH-30G',
    productName: 'Kem Bôi Dịu Da Kutieskin 30g',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-sp',
    storeName: 'Shopee Mall Kutieskin Chính Hãng',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/kutieskin_official',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Mega Sale 10.10 & Payday Cuối Tháng',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 96000,
    promotionalPrice: 79000,
    discountPercent: 18,
    affiliateRate: 20,
    availableStock: 12500,
    monthlySampleQuota: 250,
    allocatedSampleCount: 165,
    usp: '100% thảo dược Nano Bạc & Yến mạch Pháp nhập khẩu, dịu ngứa chàm sữa sau 3 ngày, an toàn tuyệt đối cho trẻ sơ sinh.',
    keyMessage: 'Dịu êm da bé tức thì - Mẹ an tâm trọn giấc nồng cùng Kutieskin thảo dược.',
    viralAngle: 'Mẹ bỉm chia sẻ khoảnh khắc cứu nguy làn da bé nửa đêm, so sánh trước và sau 72h dùng kem dịu da.',
    targetKocNiche: ['Mẹ Bỉm Nuôi Con', 'Hot Mom & Gia Đình', 'Bác Sĩ / Dược Sĩ Nhi Khoa', 'Lifestyle Reviewer'],
    pdpUrl: 'https://shopee.vn/kutieskin-kem-diu-da-chinh-hang-30g',
    briefUrl: 'https://drive.google.com/kutieskin-kem-diu-da-brief-2026',
    doAndDonts: 'NÊN: Quay cận chất kem mềm mịn thẩm thấu nhanh, có em bé tương tác cùng mẹ. KHÔNG ĐƯỢC: So sánh dìm hàng nhãn khác, không cam kết "khỏi 100% sau 1 đêm".',
    sampleNotes: 'Cấp 01 tuýp fullsize 30g + túi quà CVI cho KOC có em bé từ 0-3 tuổi.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cBriefStatus: 'BRIEF_COMPLETED',
    briefUpdatedBy: 'Khánh Vy (B2C Lead)',
    briefUpdatedAt: '2026-09-27T10:00:00Z',
    b2cEvaluationNote: 'Sản phẩm chủ lực có uy tín sẵn trên thị trường. KOC nhận mẫu đạt tỷ lệ lên video 94%. Hoa hồng 20% rất hấp dẫn KOC sàn.',
    b2cPic: 'Khánh Vy',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-25T08:30:00Z',
    lockedAt: '2026-09-28T16:00:00Z',
    lockedBy: {
      b2cPic: 'Khánh Vy (Booking Lead)'
    },
    comments: [
      {
        id: 'comm-kuti-1-1',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Kho tổng vừa nhập về thêm 15,000 tuýp date mới 2029. Growth đưa SKU này làm SP thúc đẩy số 1 trên Shopee Mall Kutieskin tháng 10. Giá flash sale chốt 79k, hoa hồng 20%.',
        type: 'PRICE_DEAL',
        createdAt: '2026-09-25T09:15:00Z'
      },
      {
        id: 'comm-kuti-1-2',
        authorName: 'Khánh Vy',
        authorRole: 'B2C',
        content: 'B2C đã book xong 45 Mẹ Bỉm Tier 3 và 5 Hot Mom Tier 2. Hạn mức mẫu 250 tuýp đảm bảo đủ phủ sóng trọn tháng.',
        type: 'SAMPLE_REQUEST',
        createdAt: '2026-09-26T14:20:00Z'
      },
      {
        id: 'comm-kuti-1-3',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Đã khóa kho 12,500 tuýp riêng cho kênh Affiliate Shopee. Chốt duyệt khóa sản phẩm thúc đẩy này!',
        type: 'LOCK_AGREEMENT',
        createdAt: '2026-09-28T15:50:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-1-1',
        timestamp: '2026-09-25 08:30',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Growth khởi tạo SKU Kem Bôi Dịu Da 30g trên Shopee Mall cho chu kỳ Tháng 10/2026.'
      },
      {
        id: 'log-kuti-1-2',
        timestamp: '2026-09-28 16:00',
        action: 'Chốt Khóa SP Thúc Đẩy (LOCKED)',
        actorName: 'Hoàng Long & Khánh Vy',
        actorRole: 'MANAGEMENT',
        description: 'Hai bên Growth và B2C thống nhất chốt duyệt khóa SKU cho chu kỳ Tháng 10.'
      }
    ]
  },
  {
    id: 'push-kuti-lip-oct',
    sku: 'KUTIE-LIP-5G',
    productName: 'Sáp Dưỡng Môi & Má Thảo Dược Trẻ Em Kutieskin 5g',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/kutieskin-official',
    imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'TikTok Shop Mega 10.10 & Payday',
    startDate: '2026-10-08',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 85000,
    promotionalPrice: 69000,
    discountPercent: 19,
    affiliateRate: 22,
    availableStock: 10000,
    monthlySampleQuota: 200,
    allocatedSampleCount: 0,
    usp: '',
    keyMessage: '',
    viralAngle: '',
    targetKocNiche: ['Mẹ Bỉm Sữa', 'Hot Mom & Bé', 'Reviewer'],
    pdpUrl: 'https://shop.tiktok.com/view/product/kutieskin-sap-duong-5g',
    briefUrl: '',
    doAndDonts: '',
    sampleNotes: '',
    feasibilityScore: 'HIGH_VIRAL',
    b2cBriefStatus: 'PENDING_BRIEF',
    b2cPic: 'Khánh Vy',
    status: 'PROPOSED',
    proposedAt: '2026-10-08T09:00:00Z',
    comments: [
      {
        id: 'comm-kuti-lip-1',
        authorName: 'Hoàng Long (Growth Lead)',
        authorRole: 'GROWTH',
        content: 'Growth đã chốt deal độc quyền giá 69k và hoa hồng 22% cho sáp dưỡng môi mới. Nhờ B2C nghiên cứu tệp Creator và bổ sung thông tin Brief KOC (USP, Key Message, góc quay)!',
        type: 'COMMENT',
        createdAt: '2026-10-08T09:15:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-lip-1',
        timestamp: '2026-10-08 09:00',
        action: 'Khởi Tạo Sản Phẩm Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Growth khởi tạo SKU [KUTIE-LIP-5G], chờ B2C tiếp nhận và bổ sung Brief Creator.'
      }
    ]
  },
  {
    id: 'push-kuti-2',
    sku: 'KUTIE-MOSQ-20ML',
    productName: 'Tinh Chất Bôi Muỗi Đốt & Côn Trùng Cắn Kutieskin 20ml',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-sp',
    storeName: 'Shopee Mall Kutieskin Chính Hãng',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/kutieskin_official',
    imageUrl: 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Chiến Dịch Mùa Mưa Muỗi Đốt (Shopee)',
    startDate: '2026-10-05',
    endDate: '2026-10-25',
    cycleType: 'MEGA_CAMPAIGN',
    originalPrice: 75000,
    promotionalPrice: 62000,
    discountPercent: 17,
    affiliateRate: 18,
    availableStock: 8000,
    monthlySampleQuota: 180,
    allocatedSampleCount: 95,
    usp: 'Tinh dầu tràm trà & Cúc La Mã, xẹp vết muỗi đốt sau 2h, không để lại vết thâm sẹo trên da em bé.',
    keyMessage: 'Bảo vệ bé yêu khỏi muỗi đốt mùa mưa - Xẹp sưng ngứa tức thì không để lại thâm.',
    viralAngle: 'Mẹo bỏ túi cho mẹ khi dắt bé đi công viên / về quê mùa mưa ẩm.',
    targetKocNiche: ['Mẹ Bỉm', 'Gia Đình Trẻ', 'Reviewer Đồ Dùng Trẻ Em'],
    pdpUrl: 'https://shopee.vn/kutieskin-tinh-chat-muoi-20ml',
    briefUrl: 'https://drive.google.com/kutieskin-muoi-brief-2026',
    doAndDonts: 'NÊN: Làm nổi bật kích thước nhỏ gọn dễ mang theo trong túi bỉm sữa. KHÔNG: Quảng cáo tác dụng xua đuổi muỗi như thuốc xịt hóa chất.',
    sampleNotes: 'Cấp 01 chai 20ml cho KOC có tệp mẹ bỉm tương tác tốt.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Mùa thu mưa nhiều muỗi đốt, sản phẩm này chuyển đổi cực kỳ nhạy trên live và video ngắn.',
    b2cPic: 'Khánh Vy',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-28T10:00:00Z',
    lockedAt: '2026-10-02T11:00:00Z',
    lockedBy: {
      b2cPic: 'Khánh Vy (Booking Lead)'
    },
    comments: [
      {
        id: 'comm-kuti-2-1',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Mùa mưa muỗi bùng phát, đề xuất chạy đợt cao điểm từ 05/10 đến 25/10 để đón đầu nhu cầu phòng dịch sốt xuất huyết.',
        type: 'COMMENT',
        createdAt: '2026-09-28T10:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-2-1',
        timestamp: '2026-09-28 10:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Tạo sản phẩm thúc đẩy tinh chất muỗi đốt Kutieskin trên Shopee Mall.'
      }
    ]
  },
  // Gian hàng 2: Kutieskin Official Store (TikTok Shop - store-kutieskin-tts)
  {
    id: 'push-kuti-3',
    sku: 'KUTIE-BATH-250ML',
    productName: 'Nước Tắm Gội Thảo Dược Kutieskin 250ml',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/kutieskin-official',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'TikTok Shop Mega 10.10 & Payday',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 135000,
    promotionalPrice: 112000,
    discountPercent: 17,
    affiliateRate: 18,
    availableStock: 6000,
    monthlySampleQuota: 120,
    allocatedSampleCount: 88,
    usp: 'Công thức 2 trong 1 tắm gội thảo dược không cay mắt, chiết xuất sài đất, kim ngân hoa kháng khuẩn tự nhiên.',
    keyMessage: 'Tắm mát dịu da - Ngăn ngừa rôm sảy mẩn ngứa suốt cả ngày cho con yêu.',
    viralAngle: 'Cảnh tắm bé cưng xỉu với bọt thảo mộc tự nhiên thơm ngát, em bé cười tít mắt trong bồn tắm.',
    targetKocNiche: ['Mẹ Bỉm Sữa', 'KOL Gia Đình', 'TikTok Creator Mẹ & Bé'],
    pdpUrl: 'https://shop.tiktok.com/view/product/kutieskin-nuoc-tam-250ml',
    briefUrl: 'https://drive.google.com/kutieskin-tam-goi-brief-2026',
    doAndDonts: 'NÊN: Khung hình ấm cúng, nhạc nền vui vẻ nhẹ nhàng. KHÔNG: Để nước dính thẳng vào mắt bé trong cảnh quay.',
    sampleNotes: 'Cấp 01 chai 250ml fullsize cho KOC quay video tương tác thực.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Bao bì chai vòi nhấn tiện dụng, các mẹ quay video tắm bé rất dễ viral trên TikTok.',
    b2cPic: 'Khánh Vy',
    status: 'IN_DISCUSSION',
    proposedAt: '2026-09-30T10:00:00Z',
    comments: [
      {
        id: 'comm-kuti-3-1',
        authorName: 'Khánh Vy',
        authorRole: 'B2C',
        content: 'Đề xuất tăng hoa hồng từ 16% lên 18% để kích thích các KOC Live gắn link giỏ hàng TikTok Shop.',
        type: 'PRICE_DEAL',
        createdAt: '2026-10-01T09:00:00Z'
      },
      {
        id: 'comm-kuti-3-2',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Đồng ý nâng hoa hồng lên 18%. Growth đang chuẩn bị thêm combo kèm khăn tắm sợi tre làm quà tặng.',
        type: 'COMMENT',
        createdAt: '2026-10-02T14:00:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-3-1',
        timestamp: '2026-09-30 10:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Tạo sản phẩm thúc đẩy nước tắm gội trên TikTok Shop.'
      }
    ]
  },
  // Tương lai Tháng 11/2026:
  {
    id: 'push-kuti-future-1',
    sku: 'KUTIE-COMBO-WINTER',
    productName: 'Combo Chống Nẻ & Dưỡng Ẩm Mùa Đông Kutieskin (Kem Dưỡng + Dịu Da)',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-tts',
    storeName: 'Kutieskin Official Store (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/kutieskin-official',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/11',
    campaignName: 'Chiến Dịch Đông Ấm Cho Bé (Mega 11.11)',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    cycleType: 'MONTHLY',
    originalPrice: 195000,
    promotionalPrice: 159000,
    discountPercent: 18,
    affiliateRate: 22,
    availableStock: 15000,
    monthlySampleQuota: 300,
    allocatedSampleCount: 0,
    usp: 'Combo chuyên biệt dưỡng ẩm sâu chống nẻ má đào, khô nứt nẻ da mùa đông hanh khô ở miền Bắc.',
    keyMessage: 'Bảo vệ làn da mỏng manh của bé qua mùa đông hanh nứt - Dưỡng ẩm 24h mềm mịn như nhung.',
    viralAngle: 'Mẹ bỉm miền Bắc chuẩn bị hành trang giữ ấm và dưỡng da cho con đón gió mùa đông bắc.',
    targetKocNiche: ['Mẹ Bỉm Miền Bắc', 'KOL Gia Đình', 'Bác Sĩ Da Liễu Nhi'],
    pdpUrl: 'https://shop.tiktok.com/view/product/kutieskin-combo-winter',
    briefUrl: 'https://drive.google.com/kutieskin-combo-winter-brief',
    doAndDonts: 'NÊN: Nhấn mạnh thời tiết hanh khô mùa đông. KHÔNG: Nói quá về việc trị dứt điểm mọi bệnh viêm da cơ địa.',
    sampleNotes: 'Cấp trọn bộ hộp quà mùa đông gồm 2 tuýp + tất len em bé cho KOC quay unboxing.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Combo này đón đúng mùa hanh heo tháng 11, tiềm năng bùng nổ doanh số rất mạnh.',
    b2cPic: 'Khánh Vy',
    status: 'PROPOSED',
    proposedAt: '2026-10-06T15:00:00Z',
    comments: [
      {
        id: 'comm-kuti-f-1',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Growth đã lên kế hoạch sản xuất 15,000 hộp quà mùa đông. B2C xem xét danh sách KOC miền Bắc để gửi mẫu trước ngày 25/10 nhé.',
        type: 'COMMENT',
        createdAt: '2026-10-06T15:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-f-1',
        timestamp: '2026-10-06 15:00',
        action: 'Khởi tạo SP Thúc Đẩy Tháng Sau',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Tạo kế hoạch SKU Thúc Đẩy cho chu kỳ Tháng 11/2026.'
      }
    ]
  },
  // Lịch sử Tháng 09/2026:
  {
    id: 'push-kuti-past-1',
    sku: 'KUTIE-BABY-CREAM',
    productName: 'Kem Dưỡng Ẩm Trẻ Em Kutieskin 30g',
    brandId: 'brand-kutieskin',
    brandName: 'Kutieskin Mama & Baby',
    brandCategory: 'Mẹ & Bé / Chăm Sóc Da Trẻ Em',
    storeId: 'store-kutieskin-sp',
    storeName: 'Shopee Mall Kutieskin Chính Hãng',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/kutieskin_official',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/09',
    campaignName: 'Chiến Dịch Khai Giảng & Thu Sang (Tháng 9)',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    cycleType: 'MONTHLY',
    originalPrice: 96000,
    promotionalPrice: 82000,
    discountPercent: 15,
    affiliateRate: 18,
    availableStock: 500,
    monthlySampleQuota: 200,
    allocatedSampleCount: 195,
    usp: 'Dầu hạnh nhân & Bơ hạt mỡ hữu cơ, dưỡng ẩm phục hồi hàng rào biểu bì da trẻ em.',
    keyMessage: 'Dưỡng ẩm dịu lành mỗi ngày - Bé da khỏe, mẹ an lòng.',
    viralAngle: 'Quy trình bôi kem dưỡng ẩm cho con trước khi đi mẫu giáo.',
    targetKocNiche: ['Mẹ Bỉm Sữa', 'Reviewer Da Liễu'],
    pdpUrl: 'https://shopee.vn/kutieskin-kem-duong-am-30g',
    briefUrl: 'https://drive.google.com/kutieskin-kem-duong-sep2026',
    feasibilityScore: 'HIGH_VIRAL',
    b2cPic: 'Khánh Vy',
    status: 'ARCHIVED',
    proposedAt: '2026-08-25T08:00:00Z',
    lockedAt: '2026-08-28T10:00:00Z',
    lockedBy: {
      b2cPic: 'Khánh Vy'
    },
    comments: [
      {
        id: 'comm-kuti-p-1',
        authorName: 'Khánh Vy',
        authorRole: 'B2C',
        content: 'Đã hoàn thành chiến dịch tháng 9, cấp 195/200 mẫu, chuyển đổi video đạt 88%. Đóng chu kỳ lưu trữ.',
        type: 'LOCK_AGREEMENT',
        createdAt: '2026-09-30T17:00:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-kuti-p-1',
        timestamp: '2026-09-30 17:00',
        action: 'Đóng Chu Kỳ & Lưu Trữ (ARCHIVED)',
        actorName: 'Khánh Vy',
        actorRole: 'B2C',
        description: 'Kết thúc chu kỳ Tháng 9, chuyển SKU sang kho lưu trữ lịch sử.'
      }
    ]
  },

  // ==========================================
  // BRAND 2: BYE BYE BLEMISH
  // ==========================================
  // Gian hàng 1: Bye Bye Blemish Vietnam (TikTok Shop - store-bbb-tts)
  {
    id: 'push-bbb-1',
    sku: 'BBB-DRYING-30ML',
    productName: 'Chấm Mụn Tràm Trà Tea Tree Drying Lotion 30ml',
    brandId: 'brand-bye-bye-blemish',
    brandName: 'Bye Bye Blemish',
    brandCategory: 'Trị Mụn & Skincare Chuyên Sâu',
    storeId: 'store-bbb-tts',
    storeName: 'Bye Bye Blemish Vietnam (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/byebyeblemish-official',
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Mega 10.10 & Đại Chiến Trị Mụn HSSV',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 245000,
    promotionalPrice: 199000,
    discountPercent: 19,
    affiliateRate: 20,
    availableStock: 8500,
    monthlySampleQuota: 200,
    allocatedSampleCount: 140,
    usp: 'Lưu huỳnh tự nhiên & Tràm trà tinh khiết Mỹ, gom cồi mụn bọc sưng đỏ sau 1 đêm, không để lại thâm sẹo.',
    keyMessage: 'Chấm 1 nốt - Xẹp 1 đêm: Vũ khí tối thượng xóa sổ mụn bọc cấp tốc.',
    viralAngle: 'Review thực tế chấm mụn trước khi ngủ và zoom cận cảnh vết mụn xẹp phẳng sáng hôm sau.',
    targetKocNiche: ['Beauty Reviewer Da Mụn', 'Học Sinh Sinh Viên', 'Gen Z Skincare', 'KOC Make-up'],
    pdpUrl: 'https://shop.tiktok.com/view/product/bbb-drying-lotion-30ml',
    briefUrl: 'https://drive.google.com/bbb-drying-lotion-brief-2026',
    doAndDonts: 'NÊN: Để lọ dung dịch tách 2 lớp rõ ràng khi quay, dùng tăm bông chấm lớp bột hồng dưới đáy. TUYỆT ĐỐI KHÔNG: Lắc đều lọ dung dịch khi quay.',
    sampleNotes: 'Cấp 01 chai 30ml + hộp tăm bông y tế chuyên dụng.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Sản phẩm hit TikTok Shop, KOC nào có da mụn thật quay lên view rất cao.',
    b2cPic: 'Khánh Vy',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-26T09:00:00Z',
    lockedAt: '2026-09-29T14:00:00Z',
    lockedBy: {
      b2cPic: 'Khánh Vy (Booking Lead)'
    },
    comments: [
      {
        id: 'comm-bbb-1-1',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Chốt giá 199k tặng kèm hộp tăm bông. Hoa hồng 20% cạnh tranh trực diện với các brand cùng phân khúc.',
        type: 'PRICE_DEAL',
        createdAt: '2026-09-26T09:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-bbb-1-1',
        timestamp: '2026-09-26 09:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Tạo sản phẩm thúc đẩy Chấm Mụn Tràm Trà trên TikTok Shop.'
      }
    ]
  },
  // Gian hàng 2: Bye Bye Blemish Official Store (Shopee Mall - store-bbb-sp)
  {
    id: 'push-bbb-2',
    sku: 'BBB-PATCH-9PCS',
    productName: 'Miếng Dán Mụn Vi Kim Tinh Chất Tràm Trà (9 miếng)',
    brandId: 'brand-bye-bye-blemish',
    brandName: 'Bye Bye Blemish',
    brandCategory: 'Trị Mụn & Skincare Chuyên Sâu',
    storeId: 'store-bbb-sp',
    storeName: 'Bye Bye Blemish Official Store (Shopee)',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/byebyeblemish_vn',
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Flash Sale Shopee 10.10 & Payday',
    startDate: '2026-10-05',
    endDate: '2026-10-25',
    cycleType: 'MEGA_CAMPAIGN',
    originalPrice: 95000,
    promotionalPrice: 79000,
    discountPercent: 17,
    affiliateRate: 18,
    availableStock: 10000,
    monthlySampleQuota: 180,
    allocatedSampleCount: 110,
    usp: 'Đầu vi kim tự tan đưa trực tiếp tinh chất BHA và Tràm trà sâu vào nhân mụn viêm ẩn dưới da.',
    keyMessage: 'Triệt tiêu mụn viêm từ gốc rễ với công nghệ vi kim hòa tan tân tiến từ Mỹ.',
    viralAngle: 'Cảm giác ấn vi kim chạm nhẹ vào mụn bọc không đau rát mà cực kỳ êm ái, bóc miếng dán sau 8 tiếng hút sạch nhân mủ.',
    targetKocNiche: ['Beauty Reviewer', 'Da Mụn Nội Tiết', 'Sinh Viên'],
    pdpUrl: 'https://shopee.vn/byebyeblemish-mieng-dan-vi-kim',
    briefUrl: 'https://drive.google.com/bbb-patch-brief-2026',
    doAndDonts: 'NÊN: Cảnh bóc miếng dán thấy mủ trắng được hút ra. KHÔNG: Dán lên vết thương hở đang chảy máu.',
    sampleNotes: 'Cấp 02 hộp 9 miếng cho KOC test lên da.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Giá deal 79k rất dễ chốt đơn trên sàn Shopee trong các khung giờ Flash Sale.',
    b2cPic: 'Khánh Vy',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-27T11:00:00Z',
    lockedAt: '2026-09-30T10:00:00Z',
    lockedBy: {
      b2cPic: 'Khánh Vy'
    },
    comments: [],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-bbb-2-1',
        timestamp: '2026-09-27 11:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Tạo sản phẩm thúc đẩy Miếng Dán Mụn Vi Kim trên Shopee Mall.'
      }
    ]
  },
  // Tương lai Tháng 11:
  {
    id: 'push-bbb-future-1',
    sku: 'BBB-SERUM-SALICYLIC',
    productName: 'Serum Giảm Mụn Đầu Đen & Thu Nhỏ Lỗ Chân Lông BBB 30ml',
    brandId: 'brand-bye-bye-blemish',
    brandName: 'Bye Bye Blemish',
    brandCategory: 'Trị Mụn & Skincare Chuyên Sâu',
    storeId: 'store-bbb-tts',
    storeName: 'Bye Bye Blemish Vietnam (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/byebyeblemish-official',
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/11',
    campaignName: 'Mega 11.11 Lễ Hội Độc Thân (TikTok Shop)',
    startDate: '2026-11-05',
    endDate: '2026-11-20',
    cycleType: 'MEGA_CAMPAIGN',
    originalPrice: 285000,
    promotionalPrice: 219000,
    discountPercent: 23,
    affiliateRate: 20,
    availableStock: 5000,
    monthlySampleQuota: 150,
    allocatedSampleCount: 0,
    usp: '2% Salicylic Acid + Niacinamide 4%, kiểm soát bã nhờn chữ T, mờ thâm mụn sau 14 ngày.',
    keyMessage: 'Tạm biệt mụn đầu đen và lỗ chân lông to cùng Serum Salicylic Mỹ.',
    viralAngle: 'Thử thách 14 ngày bôi serum vùng mũi và soi da bằng kính phóng đại.',
    targetKocNiche: ['Beauty KOC Chuyên Nghiệp', 'Skincare Khoa Học'],
    pdpUrl: 'https://shop.tiktok.com/view/product/bbb-serum-salicylic',
    briefUrl: 'https://drive.google.com/bbb-serum-brief-nov2026',
    feasibilityScore: 'MEDIUM',
    b2cPic: 'Khánh Vy',
    status: 'PROPOSED',
    proposedAt: '2026-10-07T14:00:00Z',
    comments: [
      {
        id: 'comm-bbb-f-1',
        authorName: 'Hoàng Long',
        authorRole: 'GROWTH',
        content: 'Hàng nhập khẩu Mỹ vừa thông quan 5,000 chai. Lên kế hoạch thúc đẩy cho chiến dịch Mega 11.11 tới.',
        type: 'COMMENT',
        createdAt: '2026-10-07T14:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-bbb-f-1',
        timestamp: '2026-10-07 14:00',
        action: 'Khởi tạo SP Thúc Đẩy Tháng Sau',
        actorName: 'Hoàng Long',
        actorRole: 'GROWTH',
        description: 'Đề xuất Serum Salicylic cho chu kỳ Mega 11.11 Tháng 11/2026.'
      }
    ]
  },

  // ==========================================
  // BRAND 3: ROYAL AUSNZ (SỮA HOÀNG GIA ÚC)
  // ==========================================
  // Gian hàng 1: Royal Ausnz Flagship Store (Shopee Mall - store-royal-sp)
  {
    id: 'push-royal-1',
    sku: 'ROYAL-TODDLER-900G',
    productName: 'Sữa Hoàng Gia Úc Premium Toddler Số 3 900g (1-3 tuổi)',
    brandId: 'brand-royal-ausnz',
    brandName: 'Royal Ausnz (Sữa Hoàng Gia Úc)',
    brandCategory: 'Sữa & Dinh Dưỡng Cao Cấp',
    storeId: 'store-royal-sp',
    storeName: 'Royal Ausnz Flagship Store (Shopee)',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/royalausnz_official',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Tháng Vàng Tiêu Hóa Khỏe - Bé Tăng Cân Vượt Trội',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 680000,
    promotionalPrice: 610000,
    discountPercent: 10,
    affiliateRate: 14,
    availableStock: 4200,
    monthlySampleQuota: 80,
    allocatedSampleCount: 52,
    usp: '160 năm di sản sữa Úc, công nghệ trộn ướt sấy thăng hoa 20 phút giữ trọn kháng thể tự nhiên, hệ tiêu hóa êm không táo bón.',
    keyMessage: 'Nguồn dinh dưỡng tinh khiết từ nước Úc cho con tiêu hóa khỏe, tăng cân đều đặn.',
    viralAngle: 'Mẹ thông thái phân tích tem truy xuất nguồn gốc xuất xứ chính hãng tại Úc và trải nghiệm bé uống ngon miệng.',
    targetKocNiche: ['Hot Mom Dinh Dưỡng', 'Bác Sĩ Nhi Khoa', 'Mẹ Bỉm Nuôi Con Khoa Học'],
    pdpUrl: 'https://shopee.vn/royalausnz-premium-toddler-so-3-900g',
    briefUrl: 'https://drive.google.com/royal-ausnz-toddler-brief-2026',
    doAndDonts: 'NÊN: Nhấn mạnh sữa sạch từ đồng cỏ tự nhiên nước Úc. TUYỆT ĐỐI TUÂN THỦ: Không vi phạm luật quảng cáo sữa thay thế sữa mẹ, chỉ review cho trẻ trên 12 tháng.',
    sampleNotes: 'Cấp 01 lon 900g nguyên seal có tem chống giả điện tử của Bộ Công An.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Dòng sữa cao cấp uy tín, giá trị đơn cao nên hoa hồng 14% mang lại thu nhập rất tốt cho Creator.',
    b2cPic: 'Đinh Thị Bích Liên',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-24T10:00:00Z',
    lockedAt: '2026-09-27T15:00:00Z',
    lockedBy: {
      b2cPic: 'Đinh Thị Bích Liên (Booking PIC)'
    },
    comments: [
      {
        id: 'comm-ro-1-1',
        authorName: 'Lê Thanh Hải',
        authorRole: 'GROWTH',
        content: 'Chốt gói quà tặng bình lắc sữa cao cấp cho mỗi đơn Shopee Mall. Quota mẫu 80 lon gửi các bác sĩ và hot mom uy tín.',
        type: 'PRICE_DEAL',
        createdAt: '2026-09-24T10:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ro-1-1',
        timestamp: '2026-09-24 10:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Lê Thanh Hải',
        actorRole: 'GROWTH',
        description: 'Khởi tạo SP thúc đẩy Premium Toddler Số 3 trên Shopee Flagship Store.'
      }
    ]
  },
  // Gian hàng 2: Royal Ausnz Vietnam Official (TikTok Shop - store-royal-tts)
  {
    id: 'push-royal-2',
    sku: 'ROYAL-GOAT-800G',
    productName: 'Sữa Dê Hoàng Gia Úc Goat Toddler 800g (1-3 tuổi)',
    brandId: 'brand-royal-ausnz',
    brandName: 'Royal Ausnz (Sữa Hoàng Gia Úc)',
    brandCategory: 'Sữa & Dinh Dưỡng Cao Cấp',
    storeId: 'store-royal-tts',
    storeName: 'Royal Ausnz Vietnam Official (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/royal-ausnz-official',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Giải Pháp Cho Bé Dị Ứng Đạm Sữa Bò (TikTok Shop)',
    startDate: '2026-10-05',
    endDate: '2026-10-28',
    cycleType: 'PAYDAY',
    originalPrice: 920000,
    promotionalPrice: 840000,
    discountPercent: 9,
    affiliateRate: 15,
    availableStock: 2500,
    monthlySampleQuota: 50,
    allocatedSampleCount: 30,
    usp: 'Đạm quý A2 tự nhiên từ sữa dê Úc, kích thước hạt cầu béo siêu nhỏ giúp bé hấp thu trọn vẹn, giải pháp vàng cho bé bất dung nạp lactose.',
    keyMessage: 'Sữa Dê Hoàng Gia Úc - Dịu lành đường tiêu hóa, con êm bụng lớn khôn.',
    viralAngle: 'Tâm sự của mẹ có con từng trớ nghẹn, dị ứng sữa bò đổi sang sữa dê và kết quả bất ngờ sau 3 tuần.',
    targetKocNiche: ['Mẹ Bé Chuyên Sâu', 'Bác Sĩ Tiêu Hóa Nhi'],
    pdpUrl: 'https://shop.tiktok.com/view/product/royal-goat-800g',
    briefUrl: 'https://drive.google.com/royal-ausnz-goat-brief-2026',
    doAndDonts: 'NÊN: Tập trung vào đạm A2 tự nhiên và sự êm ái của đường tiêu hóa. KHÔNG: Tuyên bố thay thế phác đồ điều trị của bác sĩ.',
    sampleNotes: 'Cấp 01 lon 800g cho KOC có bé thực sự gặp vấn đề nhạy cảm tiêu hóa.',
    feasibilityScore: 'MEDIUM',
    b2cEvaluationNote: 'Phân khúc ngách giá cao nhưng khách hàng trung thành cực cao, chốt đơn trên livestream rất đều.',
    b2cPic: 'Đinh Thị Bích Liên',
    status: 'IN_DISCUSSION',
    proposedAt: '2026-09-29T14:00:00Z',
    comments: [
      {
        id: 'comm-ro-2-1',
        authorName: 'Đinh Thị Bích Liên',
        authorRole: 'B2C',
        content: 'B2C đang đàm phán với 10 KOC là Bác sĩ Nhi để livestream chia sẻ chuyên đề bất dung nạp đạm sữa bò. Xin cấp mẫu bổ sung 15 lon.',
        type: 'SAMPLE_REQUEST',
        createdAt: '2026-10-01T11:00:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ro-2-1',
        timestamp: '2026-09-29 14:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Lê Thanh Hải',
        actorRole: 'GROWTH',
        description: 'Tạo sản phẩm thúc đẩy Sữa Dê Hoàng Gia Úc trên TikTok Shop.'
      }
    ]
  },
  // Lịch sử Tháng 09/2026:
  {
    id: 'push-royal-past-1',
    sku: 'ROYAL-LACTOFERRIN-100G',
    productName: 'Sữa Bột Bổ Sung Kháng Thể Lactoferrin Hoàng Gia Úc 100g',
    brandId: 'brand-royal-ausnz',
    brandName: 'Royal Ausnz (Sữa Hoàng Gia Úc)',
    brandCategory: 'Sữa & Dinh Dưỡng Cao Cấp',
    storeId: 'store-royal-sp',
    storeName: 'Royal Ausnz Flagship Store (Shopee)',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/royalausnz_official',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/09',
    campaignName: 'Chiến Dịch Tăng Đề Kháng Mùa Tựu Trường (Tháng 9)',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    cycleType: 'MONTHLY',
    originalPrice: 590000,
    promotionalPrice: 510000,
    discountPercent: 14,
    affiliateRate: 15,
    availableStock: 200,
    monthlySampleQuota: 60,
    allocatedSampleCount: 58,
    usp: 'Hàm lượng Lactoferrin tinh khiết 100mg/100g, nâng cao hệ miễn dịch tự nhiên cho bé mùa đi học.',
    keyMessage: 'Lá chắn đề kháng tự nhiên cho con vững vàng đến trường.',
    viralAngle: 'Mẹ chuẩn bị hành trang tăng đề kháng trước ngày tựu trường khai giảng lớp 1.',
    targetKocNiche: ['Hot Mom', 'Reviewer Dinh Dưỡng'],
    pdpUrl: 'https://shopee.vn/royal-lactoferrin-100g',
    briefUrl: 'https://drive.google.com/royal-lactoferrin-sep2026',
    feasibilityScore: 'HIGH_VIRAL',
    b2cPic: 'Đinh Thị Bích Liên',
    status: 'ARCHIVED',
    proposedAt: '2026-08-25T09:00:00Z',
    lockedAt: '2026-08-28T14:00:00Z',
    lockedBy: {
      b2cPic: 'Đinh Thị Bích Liên'
    },
    comments: [],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ro-p-1',
        timestamp: '2026-09-30 18:00',
        action: 'Đóng Chu Kỳ & Lưu Trữ (ARCHIVED)',
        actorName: 'Đinh Thị Bích Liên',
        actorRole: 'B2C',
        description: 'Hoàn thành chiến dịch Tháng 9, chuyển SKU sang kho lưu trữ.'
      }
    ]
  },

  // ==========================================
  // BRAND 4: PHCARE JAPAN
  // ==========================================
  // Gian hàng 1: pHCare Japan Official (TikTok Shop - store-phcare-tts)
  {
    id: 'push-phcare-1',
    sku: 'PHCARE-FRESH-150ML',
    productName: 'Dung Dịch Vệ Sinh Phụ Nữ pHCare Shower Fresh 150ml',
    brandId: 'brand-phcare',
    brandName: 'pHCare Japan',
    brandCategory: 'Chăm Sóc Cá Nhân & Phụ Khoa Nữ',
    storeId: 'store-phcare-tts',
    storeName: 'pHCare Japan Official (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/phcare-official',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Mega Sale 10.10 & Payday Cuối Tháng (TikTok)',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    cycleType: 'MONTHLY',
    originalPrice: 165000,
    promotionalPrice: 139000,
    discountPercent: 16,
    affiliateRate: 18,
    availableStock: 9200,
    monthlySampleQuota: 200,
    allocatedSampleCount: 145,
    usp: 'Chuẩn công nghệ Nhật Bản, độ pH 5.0 cân bằng hoàn hảo vùng nhạy cảm, tinh chất hoa cúc Chamomile thơm mát 24h.',
    keyMessage: 'Thơm tho dịu êm chuẩn Nhật - Tự tin tỏa sáng suốt cả ngày dài năng động.',
    viralAngle: 'Góc tự chăm sóc bản thân tinh tế của con gái hiện đại, bí quyết thơm tho tự tin ngày dâu rụng.',
    targetKocNiche: ['Beauty Reviewer Gen Z', 'Lifestyle Nữ', 'Sinh Viên & Công Sở'],
    pdpUrl: 'https://shop.tiktok.com/view/product/phcare-shower-fresh-150ml',
    briefUrl: 'https://drive.google.com/phcare-fresh-brief-2026',
    doAndDonts: 'NÊN: Phong cách thanh lịch, chia sẻ văn minh khoa học. TUYỆT ĐỐI KHÔNG: Dùng hình ảnh phản cảm hoặc ngôn từ thô tục vi phạm chính sách cộng đồng.',
    sampleNotes: 'Cấp 01 chai 150ml + túi zip lụa thời trang đi kèm.',
    feasibilityScore: 'HIGH_VIRAL',
    b2cEvaluationNote: 'Sản phẩm giá mềm, bao bì xinh xắn chuẩn Nhật, các bạn KOC Gen Z quay video rất tự nhiên và tương tác cao.',
    b2cPic: 'Thu Thảo',
    status: 'LOCKED_APPROVED',
    proposedAt: '2026-09-25T14:00:00Z',
    lockedAt: '2026-09-28T10:00:00Z',
    lockedBy: {
      b2cPic: 'Thu Thảo (Booking Lead)'
    },
    comments: [
      {
        id: 'comm-ph-1-1',
        authorName: 'Vũ Hoài Lâm',
        authorRole: 'GROWTH',
        content: 'Chốt giá deal 139k tặng kèm túi zip thời trang. Growth đẩy mạnh kho 9,200 chai sẵn sàng phục vụ Mega 10.10.',
        type: 'PRICE_DEAL',
        createdAt: '2026-09-25T14:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ph-1-1',
        timestamp: '2026-09-25 14:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Vũ Hoài Lâm',
        actorRole: 'GROWTH',
        description: 'Đề xuất pHCare Shower Fresh 150ml làm SP Thúc Đẩy số 1 của brand.'
      }
    ]
  },
  // Gian hàng 2: pHCare Official Store VN (Shopee Mall - store-phcare-sp)
  {
    id: 'push-phcare-2',
    sku: 'PHCARE-FOAM-120ML',
    productName: 'Bọt Vệ Sinh Dịu Nhẹ pHCare Daily Moisture Foam 120ml',
    brandId: 'brand-phcare',
    brandName: 'pHCare Japan',
    brandCategory: 'Chăm Sóc Cá Nhân & Phụ Khoa Nữ',
    storeId: 'store-phcare-sp',
    storeName: 'pHCare Official Store VN (Shopee)',
    platform: 'SHOPEE_MALL',
    storeUrl: 'https://shopee.vn/phcare_japan',
    imageUrl: 'https://images.unsplash.com/photo-1556228722-d0b5de70b774?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/10',
    campaignName: 'Đại Tiệc Shopee Mall 10.10 & Payday',
    startDate: '2026-10-10',
    endDate: '2026-10-28',
    cycleType: 'PAYDAY',
    originalPrice: 195000,
    promotionalPrice: 169000,
    discountPercent: 13,
    affiliateRate: 17,
    availableStock: 4500,
    monthlySampleQuota: 120,
    allocatedSampleCount: 30,
    usp: 'Đầu tạo bọt tuyết siêu mịn tức thì không cần ma sát, bổ sung Ceramide & Hyaluronic Acid dưỡng ẩm dịu êm.',
    keyMessage: 'Bọt tuyết dịu êm như mây - Nâng niu vùng nhạy cảm cùng pHCare công nghệ Nhật.',
    viralAngle: 'Trải nghiệm nhấn đầu tạo bọt mây mịn như bông lan, cảm giác êm ái thư giãn chuẩn spa Nhật.',
    targetKocNiche: ['Beauty Nữ', 'Skincare Body', 'Lifestyle Gen Z'],
    pdpUrl: 'https://shopee.vn/phcare-bot-ve-sinh-120ml',
    briefUrl: 'https://drive.google.com/phcare-foam-brief-2026',
    doAndDonts: 'NÊN: Cảnh quay nhấn vòi tạo bọt ASMR bồng bềnh thị giác. KHÔNG: So sánh dìm hàng các thương hiệu trong nước.',
    sampleNotes: 'Cấp 01 chai 120ml cho KOC quay video trải nghiệm ASMR.',
    feasibilityScore: 'MEDIUM',
    b2cEvaluationNote: 'Bao bì tạo bọt là điểm cộng thị giác lớn khi quay video ASMR. Đang thương lượng thêm 30 suất mẫu cho KOC Live.',
    b2cPic: 'Thu Thảo',
    status: 'IN_DISCUSSION',
    proposedAt: '2026-09-30T15:00:00Z',
    comments: [
      {
        id: 'comm-ph-2-1',
        authorName: 'Vũ Hoài Lâm',
        authorRole: 'GROWTH',
        content: 'Dòng bọt tuyết này giá cao hơn chai nước thông thường, Growth đề xuất quota mẫu 120 chai cho các KOC có thế mạnh quay video thẩm mỹ cao.',
        type: 'COMMENT',
        createdAt: '2026-09-30T15:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ph-2-1',
        timestamp: '2026-09-30 15:00',
        action: 'Khởi tạo SP Thúc Đẩy',
        actorName: 'Vũ Hoài Lâm',
        actorRole: 'GROWTH',
        description: 'Tạo đề xuất Bọt vệ sinh pHCare Foam làm SP Thúc Đẩy số 2 của brand trên Shopee Mall.'
      }
    ]
  },
  // Tương lai Tháng 11:
  {
    id: 'push-phcare-future-1',
    sku: 'PHCARE-TRAVEL-DUO',
    productName: 'Combo 2 Chai Bỏ Túi pHCare Mini Pocket 50ml x 2 (Du Lịch & Thể Thao)',
    brandId: 'brand-phcare',
    brandName: 'pHCare Japan',
    brandCategory: 'Chăm Sóc Cá Nhân & Phụ Khoa Nữ',
    storeId: 'store-phcare-tts',
    storeName: 'pHCare Japan Official (TikTok)',
    platform: 'TIKTOK_SHOP',
    storeUrl: 'https://shop.tiktok.com/view/product/phcare-official',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80',
    cycleMonth: '2026/11',
    campaignName: 'Mùa Du Lịch & Dã Ngoại Cuối Năm (Mega 11.11)',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    cycleType: 'MONTHLY',
    originalPrice: 150000,
    promotionalPrice: 119000,
    discountPercent: 21,
    affiliateRate: 20,
    availableStock: 7000,
    monthlySampleQuota: 160,
    allocatedSampleCount: 0,
    usp: 'Thiết kế mini pocket 50ml tiện lợi bỏ gọn túi xách hay balo tập gym, có nắp khóa chống tràn khi di chuyển.',
    keyMessage: 'Bí kíp bỏ túi của cô nàng năng động - Thơm tho sạch thoáng mọi chuyến đi xa.',
    viralAngle: 'What in my gym bag / travel bag - Món đồ bất ly thân của các bạn nữ mê thể thao.',
    targetKocNiche: ['Lifestyle Nữ', 'Gym & Fitness', 'Travel Creator'],
    pdpUrl: 'https://shop.tiktok.com/view/product/phcare-mini-duo',
    briefUrl: 'https://drive.google.com/phcare-mini-brief-nov2026',
    feasibilityScore: 'HIGH_VIRAL',
    b2cPic: 'Thu Thảo',
    status: 'PROPOSED',
    proposedAt: '2026-10-07T16:00:00Z',
    comments: [
      {
        id: 'comm-ph-f-1',
        authorName: 'Vũ Hoài Lâm',
        authorRole: 'GROWTH',
        content: 'Dòng mini 50ml bán theo cặp này giá deal 119k rất hút tệp học sinh sinh viên và dân công sở đi du lịch cuối năm.',
        type: 'COMMENT',
        createdAt: '2026-10-07T16:30:00Z'
      }
    ],
    changeRequests: [],
    auditLogs: [
      {
        id: 'log-ph-f-1',
        timestamp: '2026-10-07 16:00',
        action: 'Khởi tạo SP Thúc Đẩy Tháng Sau',
        actorName: 'Vũ Hoài Lâm',
        actorRole: 'GROWTH',
        description: 'Tạo đề xuất Combo Mini Pocket cho chu kỳ Tháng 11/2026.'
      }
    ]
  }
];

// =========================================================================
// BRD MOCK DATA: KOC LISTING THEO ĐỢT (10, 20, 30) & AIR VIDEO TRACKER
// =========================================================================

export const INITIAL_LISTING_BATCHES: KocListingBatchHeader[] = [];

export const INITIAL_KOC_LISTINGS: KocListingItem[] = [];
