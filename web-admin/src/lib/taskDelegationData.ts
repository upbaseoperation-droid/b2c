import {
  TaskDifficultyCategoryKey,
  TaskAssignmentRoleKey,
  TaskCategoryDifficultyConfig,
  TaskRoleWeightRule,
  SlaTask,
  BrandDetail,
  StorePortfolioItem,
  normalizeStoreCoefficient,
} from './types';
import { pushSharedStateToDb } from './sharedStateClient';

export { normalizeStoreCoefficient };

export const TASK_DIFFICULTY_STORAGE_KEY = 'upbase_b2c_task_difficulty_configs_v1';
export const SOW_POINT_POLICY_STORAGE_KEY = 'upbase_b2c_sow_point_policy_v1';
export const STAFF_WORKLOAD_EXCEPTIONS_KEY = 'upbase_b2c_staff_workload_exceptions_v1';

// ============================================================================
// BẢNG 1. CHÍNH SÁCH ĐIỂM THEO DANH MỤC CÔNG VIỆC (33 ĐẦU VIỆC SOW)
// ============================================================================
export interface SowPointPolicyItem {
  stt: number;
  group: string;
  categoryKey: TaskDifficultyCategoryKey;
  name: string;
  basePoint: number;
  defaultDifficultyTier: 'EASY' | 'STANDARD' | 'HARD';
  scopeUnit: 'Nền tảng' | 'Store' | 'Sàn' | 'Brand';
  ruleNote: string;
  defaultSource: 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED';
  usesResearchTable2b?: boolean;
  requiresOriginalAsset?: boolean;
  requiresKocStatus?: boolean;
  supportsMultiPlatform?: boolean;
}

export const DEFAULT_SOW_POINT_POLICIES: SowPointPolicyItem[] = [
  // 1. Content Affiliate (STT 1-7)
  {
    stt: 1,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Booking KOC KL7',
    basePoint: 5.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Khó khi KOC mới, book lần đầu; Book lại/HĐ nguyên tắc → Tiêu chuẩn',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresKocStatus: true,
  },
  {
    stt: 2,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Booking KOC KL6',
    basePoint: 3.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Khó khi KOC mới, book lần đầu; Book lại/HĐ nguyên tắc → Tiêu chuẩn',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresKocStatus: true,
  },
  {
    stt: 3,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Booking KOC KL4–KL5',
    basePoint: 2.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Tính ở nền tảng air đầu tiên',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresKocStatus: true,
  },
  {
    stt: 4,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Booking KOC KL2–KL3',
    basePoint: 1.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Tính ở nền tảng air đầu tiên',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresKocStatus: true,
  },
  {
    stt: 5,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Booking KOC KL1',
    basePoint: 0.6,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Tính ở nền tảng air đầu tiên',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresKocStatus: true,
  },
  {
    stt: 6,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Reup mất phí',
    basePoint: 0.6,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Áp dụng cho nền tảng thứ 2 trở đi; bắt buộc ghi Asset gốc',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresOriginalAsset: true,
  },
  {
    stt: 7,
    group: 'Content Affiliate',
    categoryKey: 'BOOKING',
    name: 'Reup no cast',
    basePoint: 0.3,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Áp dụng cho nền tảng thứ 2 trở đi; bắt buộc ghi Asset gốc',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresOriginalAsset: true,
  },
  // 2. Content kênh (STT 8-11)
  {
    stt: 8,
    group: 'Content kênh',
    categoryKey: 'CONTENT',
    name: 'Videogiọng đọc / Kịch bản dựng kênh',
    basePoint: 1.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Khó khi yêu cầu xây kênh theo nhận diện & đảm bảo mặt hình ảnh; phải được quản lý duyệt',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  {
    stt: 9,
    group: 'Content kênh',
    categoryKey: 'CONTENT',
    name: 'Video nhạc text/POV/Remix',
    basePoint: 0.6,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Tính ở nền tảng đăng đầu tiên',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  {
    stt: 10,
    group: 'Content kênh',
    categoryKey: 'CONTENT',
    name: 'Reup có adapt/fix',
    basePoint: 0.6,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Có sửa hook, text, tỷ lệ khung, CTA...; bắt buộc ghi Asset gốc',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresOriginalAsset: true,
  },
  {
    stt: 11,
    group: 'Content kênh',
    categoryKey: 'CONTENT',
    name: 'Reup đơn giản, không chỉnh sửa',
    basePoint: 0.3,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Nền tảng',
    ruleNote: 'Đăng chéo nguyên bản; bắt buộc ghi Asset gốc',
    defaultSource: 'WORKFLOW_SYSTEM',
    requiresOriginalAsset: true,
  },
  // 3. Livestream Affiliate (STT 12-14)
  {
    stt: 12,
    group: 'Livestream Affiliate',
    categoryKey: 'LIVESTREAM',
    name: 'Độc quyền',
    basePoint: 10.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Store',
    ruleNote: 'Phiên live độc quyền theo gian hàng, yêu cầu standby trong phiên live & follow KV',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  {
    stt: 13,
    group: 'Livestream Affiliate',
    categoryKey: 'LIVESTREAM',
    name: 'Mix/ Add in',
    basePoint: 5.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Store',
    ruleNote: 'Ghép rổ hàng / Add-in phiên live KOC/KOL',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  {
    stt: 14,
    group: 'Livestream Affiliate',
    categoryKey: 'LIVESTREAM',
    name: 'Daily',
    basePoint: 1.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Store',
    ruleNote: 'Phiên live Daily định kỳ của gian hàng',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  // 4. Key Visual (STT 15-18)
  {
    stt: 15,
    group: 'Key Visual',
    categoryKey: 'KEY_VISUAL',
    name: 'Landing dài, 1 bộ',
    basePoint: 10.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Adapt sang sàn khác không tính lại; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 16,
    group: 'Key Visual',
    categoryKey: 'KEY_VISUAL',
    name: 'Landing ngắn',
    basePoint: 5.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Brand',
    ruleNote: 'Adapt sang sàn khác không tính lại; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 17,
    group: 'Key Visual',
    categoryKey: 'KEY_VISUAL',
    name: 'Adapt Brand Guideline',
    basePoint: 15.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: 'Adapt sang sàn khác không tính lại; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 18,
    group: 'Key Visual',
    categoryKey: 'KEY_VISUAL',
    name: 'Xây mới logo, thông điệp, Brand Guideline',
    basePoint: 25.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Xây dựng bộ nhận diện mới cấp Brand; nhân HS đa sàn',
    defaultSource: 'DIRECTOR_ASSIGNED',
    supportsMultiPlatform: true,
  },
  // 5. SIS (STT 19-20)
  {
    stt: 19,
    group: 'SIS',
    categoryKey: 'KEY_VISUAL',
    name: 'Chỉnh sửa toàn gian theo hành trình khách hàng',
    basePoint: 25.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Adapt sang sàn khác không tính lại; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 20,
    group: 'SIS',
    categoryKey: 'KEY_VISUAL',
    name: 'Kiểm tra & chỉnh sửa gian hàng cơ bản',
    basePoint: 5.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Sàn',
    ruleNote: 'Tính theo từng sàn có thực hiện',
    defaultSource: 'DIRECTOR_ASSIGNED',
  },
  // 6. Brief (STT 21-23)
  {
    stt: 21,
    group: 'Brief',
    categoryKey: 'CAMPAIGN',
    name: 'Brief Launching',
    basePoint: 5.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: '1 bộ cho toàn chiến dịch; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 22,
    group: 'Brief',
    categoryKey: 'CAMPAIGN',
    name: 'Brief Campaign',
    basePoint: 5.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: '1 bộ cho toàn chiến dịch; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
  {
    stt: 23,
    group: 'Brief',
    categoryKey: 'CAMPAIGN',
    name: 'Brief riêng theo KOL/KOC/Campaign',
    basePoint: 3.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Sàn',
    ruleNote: 'Tính khi có brief riêng được duyệt',
    defaultSource: 'WORKFLOW_SYSTEM',
  },
  // 7. Nghiên cứu gian hàng mới (STT 24-27)
  {
    stt: 24,
    group: 'Nghiên cứu gian hàng mới',
    categoryKey: 'RESEARCH',
    name: 'Brand size dưới 15 tỷ/năm',
    basePoint: 15.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  {
    stt: 25,
    group: 'Nghiên cứu gian hàng mới',
    categoryKey: 'RESEARCH',
    name: 'Brand size từ 15–50 tỷ/năm',
    basePoint: 20.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  {
    stt: 26,
    group: 'Nghiên cứu gian hàng mới',
    categoryKey: 'RESEARCH',
    name: 'Brand size từ 50–100 tỷ/năm',
    basePoint: 25.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  {
    stt: 27,
    group: 'Nghiên cứu gian hàng mới',
    categoryKey: 'RESEARCH',
    name: 'Brand size trên 100 tỷ/năm',
    basePoint: 30.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  // 8. Nghiên cứu & lập kế hoạch campaign (STT 28-30)
  {
    stt: 28,
    group: 'Nghiên cứu & lập kế hoạch campaign',
    categoryKey: 'RESEARCH',
    name: 'Campaign 1 sàn, Chi tiêu campaign <300 triệu',
    basePoint: 15.0,
    defaultDifficultyTier: 'EASY',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  {
    stt: 29,
    group: 'Nghiên cứu & lập kế hoạch campaign',
    categoryKey: 'RESEARCH',
    name: 'Campaign 2 sàn, Chi tiêu campaign <1 tỷ',
    basePoint: 25.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  {
    stt: 30,
    group: 'Nghiên cứu & lập kế hoạch campaign',
    categoryKey: 'RESEARCH',
    name: 'Campaign >= 2 sàn & 3 kênh social, Chi tiêu campaign > 1 tỷ',
    basePoint: 35.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Dùng HS cấp độ research (Bảng 2b); không nhân HS gian hàng',
    defaultSource: 'DIRECTOR_ASSIGNED',
    usesResearchTable2b: true,
  },
  // 9. JBP Plan & Report (STT 31-33)
  {
    stt: 31,
    group: 'JBP Plan & Report',
    categoryKey: 'CAMPAIGN',
    name: 'Kế hoạch năm (JBP) + Báo cáo năm',
    basePoint: 30.0,
    defaultDifficultyTier: 'STANDARD',
    scopeUnit: 'Brand',
    ruleNote: 'Mỗi năm 1 lần; nhân HS đa sàn',
    defaultSource: 'DIRECTOR_ASSIGNED',
    supportsMultiPlatform: true,
  },
  {
    stt: 32,
    group: 'JBP Plan & Report',
    categoryKey: 'CAMPAIGN',
    name: 'Chiến lược quý / Đánh giá quý với Brand',
    basePoint: 20.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Mỗi quý 1 lần; nhân HS đa sàn',
    defaultSource: 'DIRECTOR_ASSIGNED',
    supportsMultiPlatform: true,
  },
  {
    stt: 33,
    group: 'JBP Plan & Report',
    categoryKey: 'CAMPAIGN',
    name: 'Kế hoạch tháng của Brand + Báo cáo tháng',
    basePoint: 10.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Mỗi tháng 1 lần; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
];

// ============================================================================
// BẢNG 2, 3, 4, 5, 6 (CÁC BẢNG HỆ SỐ ĐỊNH MỨC)
// ============================================================================
export const STORE_SCOPE_TABLE_2 = [
  { code: 'BASIC', label: 'Cơ bản', coef: 0.8, note: 'Gian hàng ổn định, ít SKU, duyệt nhanh' },
  { code: 'STANDARD', label: 'Tiêu chuẩn', coef: 1.0, note: 'Gian hàng tiêu chuẩn' },
  { code: 'MEDIUM', label: 'Vừa', coef: 1.25, note: 'Nhiều đợt campaign, đa line sản phẩm' },
  { code: 'HARD', label: 'Khó', coef: 1.5, note: 'Gian hàng quy mô lớn / yêu cầu pháp lý & hình ảnh khắt khe' },
];

export const TASK_DIFFICULTY_TABLE_3: {
  tier: 'EASY' | 'STANDARD' | 'HARD';
  label: string;
  coef: number;
  criteria: string;
}[] = [
  {
    tier: 'EASY',
    label: 'Dễ',
    coef: 0.8,
    criteria: 'Làm theo mẫu có sẵn, reup/adapt, chỉnh sửa nhẹ, ít phối hợp, ít vòng sửa',
  },
  {
    tier: 'STANDARD',
    label: 'Tiêu chuẩn',
    coef: 1.0,
    criteria: 'Đầu việc chuẩn theo phạm vi thông thường, có brief rõ, chỉnh sửa trong mức bình thường',
  },
  {
    tier: 'HARD',
    label: 'Khó',
    coef: 1.2,
    criteria: 'Làm mới từ đầu, nhiều bên duyệt, yêu cầu sáng tạo/chuyên môn cao, xử lý gấp hoặc phát sinh lớn',
  },
];

export const STAFF_LEVEL_TABLE_4: {
  level: string;
  minHardRatioPct: number;
  passCoef: number;
  failCoef: number;
}[] = [
  { level: 'L0', minHardRatioPct: 15, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L0.5', minHardRatioPct: 17.5, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L1', minHardRatioPct: 20, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L1.5', minHardRatioPct: 25, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L2', minHardRatioPct: 30, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L2.5', minHardRatioPct: 35, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L3', minHardRatioPct: 40, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L4', minHardRatioPct: 50, passCoef: 1.0, failCoef: 0.7 },
  { level: 'L5', minHardRatioPct: 60, passCoef: 1.0, failCoef: 0.7 },
];

export const TIMELINE_TABLE_5: {
  status: 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED';
  label: string;
  condition: string;
  coef: number;
}[] = [
  { status: 'ON_TIME', label: 'Đúng hạn', condition: 'Đúng hạn chót đã chốt', coef: 1.0 },
  { status: 'LATE_1', label: 'Chậm mức 1', condition: 'Trễ 1 ngày (việc ngày/tuần) hoặc 1–2 ngày (việc lớn)', coef: 0.7 },
  { status: 'LATE_2', label: 'Chậm mức 2', condition: 'Trễ >1 ngày (việc ngày/tuần) hoặc 3–5 ngày (việc lớn)', coef: 0.4 },
  { status: 'FAILED', label: 'Không hoàn thành', condition: 'Quá mốc trên, hủy việc hoặc phải chuyển người', coef: 0.0 },
];

export const MULTI_PLATFORM_TABLE_6: {
  stores: number;
  label: string;
  coef: number;
}[] = [
  { stores: 1, label: '1 gian (1 sàn)', coef: 1.0 },
  { stores: 2, label: '2 gian (2 sàn)', coef: 1.3 },
  { stores: 3, label: '3 gian (3 sàn)', coef: 1.6 },
  { stores: 4, label: '≥4 gian (Trần tối đa)', coef: 1.6 },
];

// ============================================================================
// DANH SÁCH 28 NHÂN SỰ THỰC TẾ KHỐI B2C
// ============================================================================
export interface StaffWorkloadRosterMember {
  staffCode: string;
  name: string;
  level: string;
  roleGroup: string;
  assignedStoresCount: number;
  keyStoresSample: string;
  baselineWorkflowTotalPts: number;
  baselineWorkflowHardPts: number;
  baselineDirectorTotalPts: number;
  baselineDirectorHardPts: number;
}

export const B2C_28_STAFF_WORKLOAD_ROSTER: StaffWorkloadRosterMember[] = [
  {
    staffCode: 'HN206',
    name: 'Hoàng Diệu Thùy',
    level: 'L3',
    roleGroup: 'Key Visual / SIS Lead',
    assignedStoresCount: 16,
    keyStoresSample: 'ClubClio, Baniphar, Meracine, Nucos, Blossomy',
    baselineWorkflowTotalPts: 145.0,
    baselineWorkflowHardPts: 68.0,
    baselineDirectorTotalPts: 35.0,
    baselineDirectorHardPts: 25.0,
  },
  {
    staffCode: 'HN-NT',
    name: 'Nguyễn Thị Ngọc Tâm',
    level: 'L3',
    roleGroup: 'Trưởng nhóm Booking & Plan Strategy',
    assignedStoresCount: 11,
    keyStoresSample: 'ClubClio, Cindy Bloom, EUPC, Mine, L’Occitane, Rejuran',
    baselineWorkflowTotalPts: 132.0,
    baselineWorkflowHardPts: 58.0,
    baselineDirectorTotalPts: 48.0,
    baselineDirectorHardPts: 32.0,
  },
  {
    staffCode: 'HN240',
    name: 'Bùi Ngọc Ánh',
    level: 'L2.5',
    roleGroup: 'Content / Brand Main & Plan Strategy',
    assignedStoresCount: 7,
    keyStoresSample: 'Baniphar, Herbal Care, Venus, Blossomy',
    baselineWorkflowTotalPts: 118.0,
    baselineWorkflowHardPts: 44.0,
    baselineDirectorTotalPts: 30.0,
    baselineDirectorHardPts: 20.0,
  },
  {
    staffCode: 'HN372',
    name: 'Trần Thảo Linh',
    level: 'L2.5',
    roleGroup: 'Plan / Strategy & Key Visual',
    assignedStoresCount: 9,
    keyStoresSample: 'Baniphar, Meracine, Nabizam, ORGALIFE, pHCare',
    baselineWorkflowTotalPts: 124.0,
    baselineWorkflowHardPts: 48.0,
    baselineDirectorTotalPts: 36.0,
    baselineDirectorHardPts: 22.0,
  },
  {
    staffCode: 'HN266',
    name: 'Dương Thị Hồng Nhung',
    level: 'L2.5',
    roleGroup: 'Key Visual / SIS Specialist',
    assignedStoresCount: 11,
    keyStoresSample: 'BELLA, EUPC, Kutieskin Mama, ORGALIFE, pHCare',
    baselineWorkflowTotalPts: 128.0,
    baselineWorkflowHardPts: 52.0,
    baselineDirectorTotalPts: 20.0,
    baselineDirectorHardPts: 12.0,
  },
  {
    staffCode: 'HN-NQ',
    name: 'Lương Thị Như Quỳnh',
    level: 'L2.5',
    roleGroup: 'Booking Video/Post & Plan Strategy',
    assignedStoresCount: 8,
    keyStoresSample: 'Baniphar, Kutieskin, Nabizam, Docilee, Ziaja',
    baselineWorkflowTotalPts: 136.0,
    baselineWorkflowHardPts: 50.0,
    baselineDirectorTotalPts: 28.0,
    baselineDirectorHardPts: 18.0,
  },
  {
    staffCode: 'HN273',
    name: 'Phạm Thị Thu Hằng',
    level: 'L2',
    roleGroup: 'Booking Video/Post & Content Kênh',
    assignedStoresCount: 7,
    keyStoresSample: 'ClubClio, Fresh, Lipit, Royal Canin, L’Occitane',
    baselineWorkflowTotalPts: 112.0,
    baselineWorkflowHardPts: 38.0,
    baselineDirectorTotalPts: 18.0,
    baselineDirectorHardPts: 10.0,
  },
  {
    staffCode: 'HN387',
    name: 'Nguyễn Thị Hồng Ngát',
    level: 'L2',
    roleGroup: 'Content / Brand Main & Plan Strategy',
    assignedStoresCount: 4,
    keyStoresSample: 'Cindy Bloom, Mine, Rejuran',
    baselineWorkflowTotalPts: 98.0,
    baselineWorkflowHardPts: 32.0,
    baselineDirectorTotalPts: 22.0,
    baselineDirectorHardPts: 12.0,
  },
  {
    staffCode: 'HN478',
    name: 'Nguyễn Quỳnh Trang',
    level: 'L2',
    roleGroup: 'Content / Brand Main & Plan Strategy',
    assignedStoresCount: 6,
    keyStoresSample: 'Bye Bye Blemish, Chulala, FeelCleans, L’Occitane',
    baselineWorkflowTotalPts: 104.0,
    baselineWorkflowHardPts: 34.0,
    baselineDirectorTotalPts: 16.0,
    baselineDirectorHardPts: 8.0,
  },
  {
    staffCode: 'HN702',
    name: 'Nguyễn Thị Quỳnh Nhi',
    level: 'L2',
    roleGroup: 'Content Kênh & Plan Strategy',
    assignedStoresCount: 6,
    keyStoresSample: 'Kutieskin Mama, Nabizam, Similac',
    baselineWorkflowTotalPts: 115.0,
    baselineWorkflowHardPts: 42.0,
    baselineDirectorTotalPts: 15.0,
    baselineDirectorHardPts: 9.0,
  },
  {
    staffCode: 'HN601',
    name: 'Đinh Thị Bích Liên',
    level: 'L2',
    roleGroup: 'Booking Livestream Affiliate',
    assignedStoresCount: 15,
    keyStoresSample: 'Baniphar, ClubClio, EUPC, Fresh, Kutieskin, Meracine',
    baselineWorkflowTotalPts: 142.0,
    baselineWorkflowHardPts: 54.0,
    baselineDirectorTotalPts: 12.0,
    baselineDirectorHardPts: 6.0,
  },
  {
    staffCode: 'HN241',
    name: 'Lê Thanh Hải',
    level: 'L1.5',
    roleGroup: 'Booking Video/Post - Paid Media',
    assignedStoresCount: 9,
    keyStoresSample: 'Bye Bye Blemish, Fresh, HDT, Herbal Care, Nucos, pHCare',
    baselineWorkflowTotalPts: 108.0,
    baselineWorkflowHardPts: 32.0,
    baselineDirectorTotalPts: 14.0,
    baselineDirectorHardPts: 8.0,
  },
  {
    staffCode: 'HN557',
    name: 'Lê Phương Thảo',
    level: 'L1.5',
    roleGroup: 'Booking Video/Post & Content Kênh (TMU)',
    assignedStoresCount: 8,
    keyStoresSample: 'BELLA, Meracine, Miss Saigon, Ekseption, 4PM',
    baselineWorkflowTotalPts: 116.0,
    baselineWorkflowHardPts: 36.0,
    baselineDirectorTotalPts: 18.0,
    baselineDirectorHardPts: 10.0,
  },
  {
    staffCode: 'HN579',
    name: 'Hà Thị Thủy',
    level: 'L1.5',
    roleGroup: 'Content / Brand Main & Video Kênh',
    assignedStoresCount: 6,
    keyStoresSample: 'BELLA, Badlab, Dynik, Natural Care',
    baselineWorkflowTotalPts: 94.0,
    baselineWorkflowHardPts: 26.0,
    baselineDirectorTotalPts: 12.0,
    baselineDirectorHardPts: 6.0,
  },
  {
    staffCode: 'HN602',
    name: 'Lương Nguyễn Trang Nhung',
    level: 'L1.5',
    roleGroup: 'Booking Livestream Affiliate',
    assignedStoresCount: 12,
    keyStoresSample: 'BELLA, Bye Bye Blemish, Cindy Bloom, Mine, Nucos, pHCare',
    baselineWorkflowTotalPts: 102.0,
    baselineWorkflowHardPts: 22.0,
    baselineDirectorTotalPts: 10.0,
    baselineDirectorHardPts: 2.0,
  },
  {
    staffCode: 'HN189',
    name: 'Bùi Thu Hằng',
    level: 'L1.5',
    roleGroup: 'Content / Brand Main',
    assignedStoresCount: 4,
    keyStoresSample: 'HDT, Miss Saigon',
    baselineWorkflowTotalPts: 86.0,
    baselineWorkflowHardPts: 24.0,
    baselineDirectorTotalPts: 12.0,
    baselineDirectorHardPts: 6.0,
  },
  {
    staffCode: 'HN252',
    name: 'Nguyễn Thị Mai Anh',
    level: 'L1.5',
    roleGroup: 'Content / Brand Main & Video Kênh',
    assignedStoresCount: 4,
    keyStoresSample: 'Fresh, Nucos',
    baselineWorkflowTotalPts: 96.0,
    baselineWorkflowHardPts: 28.0,
    baselineDirectorTotalPts: 14.0,
    baselineDirectorHardPts: 6.0,
  },
  {
    staffCode: 'HN636',
    name: 'Vũ Hoài Lâm',
    level: 'L1.5',
    roleGroup: 'Booking Video/Post & Plan Strategy',
    assignedStoresCount: 5,
    keyStoresSample: 'Chulala, Cindy Bloom, FeelCleans, L’Occitane',
    baselineWorkflowTotalPts: 92.0,
    baselineWorkflowHardPts: 25.0,
    baselineDirectorTotalPts: 15.0,
    baselineDirectorHardPts: 6.0,
  },
  {
    staffCode: 'HN637',
    name: 'Trần Hải Phượng',
    level: 'L1.5',
    roleGroup: 'Booking Video/Post & Content',
    assignedStoresCount: 4,
    keyStoresSample: 'CM24, Cathy Doll, Lipit, Mine',
    baselineWorkflowTotalPts: 90.0,
    baselineWorkflowHardPts: 26.0,
    baselineDirectorTotalPts: 10.0,
    baselineDirectorHardPts: 4.0,
  },
  {
    staffCode: 'HN631',
    name: 'Đặng Mai Hà Linh',
    level: 'L1.5',
    roleGroup: 'Content / Brand Main',
    assignedStoresCount: 3,
    keyStoresSample: 'Royal Canin, Elise',
    baselineWorkflowTotalPts: 82.0,
    baselineWorkflowHardPts: 22.0,
    baselineDirectorTotalPts: 10.0,
    baselineDirectorHardPts: 4.0,
  },
  {
    staffCode: 'HN880',
    name: 'Trần Thị Hảo',
    level: 'L1.5',
    roleGroup: 'Điều phối FOC & Hàng mẫu KOC',
    assignedStoresCount: 14,
    keyStoresSample: 'Toàn bộ gian hàng FOC & Gửi mẫu KOC',
    baselineWorkflowTotalPts: 88.0,
    baselineWorkflowHardPts: 18.0,
    baselineDirectorTotalPts: 8.0,
    baselineDirectorHardPts: 2.0,
  },
  {
    staffCode: 'HN220',
    name: 'Hoàng Hải Long',
    level: 'L1',
    roleGroup: 'Booking Video/Post & Plan Strategy',
    assignedStoresCount: 6,
    keyStoresSample: 'Badlab, Dynik, Natural Care',
    baselineWorkflowTotalPts: 84.0,
    baselineWorkflowHardPts: 20.0,
    baselineDirectorTotalPts: 12.0,
    baselineDirectorHardPts: 4.0,
  },
  {
    staffCode: 'HN900',
    name: 'Nguyễn Ngọc Huyền',
    level: 'L1',
    roleGroup: 'Key Visual / SIS Specialist',
    assignedStoresCount: 9,
    keyStoresSample: 'Badlab, CM24, Cathy Doll, Chulala, Docilee, Lipit',
    baselineWorkflowTotalPts: 86.0,
    baselineWorkflowHardPts: 21.0,
    baselineDirectorTotalPts: 8.0,
    baselineDirectorHardPts: 3.0,
  },
  {
    staffCode: 'HN-NL',
    name: 'Nguyễn Ngọc Linh',
    level: 'L1',
    roleGroup: 'Content / Brand Main & Video Kênh',
    assignedStoresCount: 5,
    keyStoresSample: 'Docilee, Ziaja',
    baselineWorkflowTotalPts: 78.0,
    baselineWorkflowHardPts: 18.0,
    baselineDirectorTotalPts: 10.0,
    baselineDirectorHardPts: 4.0,
  },
  {
    staffCode: 'HN-DA',
    name: 'Phan Diệu Ánh',
    level: 'L1',
    roleGroup: 'Booking Video/Post & Content Kênh',
    assignedStoresCount: 4,
    keyStoresSample: 'EUPC, TM Clean',
    baselineWorkflowTotalPts: 82.0,
    baselineWorkflowHardPts: 19.0,
    baselineDirectorTotalPts: 10.0,
    baselineDirectorHardPts: 4.0,
  },
  {
    staffCode: 'HN762',
    name: 'Lê Phương Thảo - NEU',
    level: 'L0.5',
    roleGroup: 'Content & Video Kênh',
    assignedStoresCount: 3,
    keyStoresSample: 'Hỗ trợ sản xuất Content Kênh',
    baselineWorkflowTotalPts: 64.0,
    baselineWorkflowHardPts: 14.0,
    baselineDirectorTotalPts: 6.0,
    baselineDirectorHardPts: 2.0,
  },
  {
    staffCode: 'HN823',
    name: 'Lại Ngọc Huyền',
    level: 'L0.5',
    roleGroup: 'Content / Brand Main & Video Kênh',
    assignedStoresCount: 4,
    keyStoresSample: 'ClubClio, EUPC, Mine, UpBeauty',
    baselineWorkflowTotalPts: 72.0,
    baselineWorkflowHardPts: 15.0,
    baselineDirectorTotalPts: 8.0,
    baselineDirectorHardPts: 3.0,
  },
  {
    staffCode: 'HN838',
    name: 'Trần Phương Thảo',
    level: 'L0.5',
    roleGroup: 'Content / Brand Main & Video Kênh',
    assignedStoresCount: 2,
    keyStoresSample: 'pHCare_TikTok_E2E-C, pHCare_Shopee',
    baselineWorkflowTotalPts: 68.0,
    baselineWorkflowHardPts: 14.0,
    baselineDirectorTotalPts: 6.0,
    baselineDirectorHardPts: 2.0,
  },
];

export const DEFAULT_TASK_DIFFICULTY_CONFIGS: TaskCategoryDifficultyConfig[] = [
  {
    categoryKey: 'RESEARCH',
    categoryName: 'Nghiên cứu (Research)',
    tableTitle: 'Hệ số cấp độ nghiên cứu',
    unitLabel: 'Hồ sơ Research',
    baseWorkloadPoints: 20.0,
    levels: [
      {
        id: 'RES-L1',
        levelCode: 'Level 1 – Cơ bản',
        multiplier: 0.8,
        scopeDescription: '1 sàn, 1 line sản phẩm',
        expectedDeliverable: 'Báo cáo nghiên cứu 1 sàn / 1 line + Danh sách Hook tham khảo',
        defaultSlaHours: 24,
      },
      {
        id: 'RES-L2',
        levelCode: 'Level 2 – Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: '1 sàn, nhiều line sản phẩm hoặc 2 sàn, 1 line',
        expectedDeliverable: 'Hồ sơ Research đa line / 2 sàn + Phân tích đối thủ & giá bán',
        defaultSlaHours: 36,
      },
      {
        id: 'RES-L3',
        levelCode: 'Level 3 – Nâng cao',
        multiplier: 1.2,
        scopeDescription: 'Nghiên cứu kèm kế hoạch Content và Booking',
        expectedDeliverable: 'Hồ sơ Research + Kế hoạch Content + Kế hoạch Booking KOC',
        defaultSlaHours: 48,
      },
      {
        id: 'RES-L4',
        levelCode: 'Level 4 – Chiến lược thương hiệu',
        multiplier: 1.4,
        scopeDescription: 'Nghiên cứu kèm Brand Strategy',
        expectedDeliverable: 'Hồ sơ Research + Định hướng thương hiệu (Khách hàng, Thông điệp)',
        defaultSlaHours: 72,
      },
      {
        id: 'RES-L5',
        levelCode: 'Level 5 – Định vị tổng thể',
        multiplier: 1.6,
        scopeDescription: 'Đa sàn, đa line; xây mới hoặc tái định vị',
        expectedDeliverable: 'Tài liệu định vị tổng thể đa sàn + Kế hoạch tổng thể',
        defaultSlaHours: 96,
      },
    ],
  },
  {
    categoryKey: 'BOOKING',
    categoryName: 'Content Affiliate (Booking KOC)',
    tableTitle: 'Hệ số độ khó — Booking KOC',
    unitLabel: 'Video KOC nghiệm thu',
    baseWorkloadPoints: 2.0,
    levels: [
      {
        id: 'BK-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Gian hàng ổn định, tệp KOC sẵn có, yêu cầu cơ bản, duyệt đơn giản',
        expectedDeliverable: 'Danh sách KOC chốt deal + Hợp đồng & link nghiệm thu đúng SLA',
        defaultSlaHours: 24,
      },
      {
        id: 'BK-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: '≤100M/tháng hoặc ≤15 booking; 1 đợt air; ngân sách và tiến độ ổn định',
        expectedDeliverable: 'Hoàn thành đủ slot KOC theo kế hoạch tuần + Mã Spark Ads',
        defaultSlaHours: 36,
      },
      {
        id: 'BK-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: '>100–300M/tháng hoặc 16–40 booking; tệp KOC hẹp theo ngành/GMV; nhiều đợt air',
        expectedDeliverable: 'Báo cáo tiến độ đa đợt air + Kiểm soát chi phí Net & tỷ lệ hoàn thành',
        defaultSlaHours: 48,
      },
      {
        id: 'BK-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: '>300M/tháng hoặc KOC hiếm (bác sĩ/chuyên gia/celeb); yêu cầu độc quyền, pháp lý nghiêm',
        expectedDeliverable: 'Hồ sơ đàm phán KOC Key/Top + Hợp đồng độc quyền & nghiệm thu đa sàn',
        defaultSlaHours: 72,
      },
    ],
  },
  {
    categoryKey: 'CONTENT',
    categoryName: 'Content Kênh & Kịch bản',
    tableTitle: 'Hệ số độ khó — Content Kênh & Kịch bản',
    unitLabel: 'Video / Kịch bản kênh',
    baseWorkloadPoints: 1.0,
    levels: [
      {
        id: 'CT-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Kênh ổn định; format/pillar sẵn; chủ yếu adapt; quay dựng cơ bản; ít vòng sửa',
        expectedDeliverable: 'Kịch bản adapt + Video hoàn thiện duyệt vòng 1',
        defaultSlaHours: 24,
      },
      {
        id: 'CT-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: 'Triển khai kịch bản 4 phần và thẩm định video KOC đúng guideline nhãn hàng',
        expectedDeliverable: 'Kế hoạch nội dung, kịch bản chi tiết, link video đã duyệt',
        defaultSlaHours: 24,
      },
      {
        id: 'CT-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: 'Phát triển góc tiếp cận mới; nhiều format/SKU; yêu cầu hình ảnh khá; cần thử nghiệm',
        expectedDeliverable: 'Bộ góc nội dung mới + Kịch bản thử nghiệm Hook 3s',
        defaultSlaHours: 48,
      },
      {
        id: 'CT-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: 'Yêu cầu hình ảnh/kể chuyện cao; ý tưởng mới; quay phức tạp; pháp lý nghiêm',
        expectedDeliverable: 'Ý tưởng chủ đạo + Video kênh đạt chuẩn thương hiệu & pháp lý',
        defaultSlaHours: 72,
      },
    ],
  },
  {
    categoryKey: 'KEY_VISUAL',
    categoryName: 'Key Visual & SIS',
    tableTitle: 'Hệ số độ khó — Key Visual / SIS',
    unitLabel: 'Bộ Key Visual / SIS',
    baseWorkloadPoints: 10.0,
    levels: [
      {
        id: 'KV-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Adapt KV/mẫu có sẵn; thay chữ/SKU/kích thước; gần như không sửa ý tưởng',
        expectedDeliverable: 'Bộ khung frame/banner adapt đúng kích thước sàn',
        defaultSlaHours: 24,
      },
      {
        id: 'KV-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: 'Thiết kế KV định kỳ cho gian hàng ổn định (mốc chuẩn 17,5 bộ KV hoặc 4 gian)',
        expectedDeliverable: 'KV brief + File thiết kế nghiệm thu treo gian hàng',
        defaultSlaHours: 36,
      },
      {
        id: 'KV-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: 'Phát triển KV mới mức vừa; 1–2 ý tưởng; nhiều kích thước/SKU; 1–2 vòng duyệt',
        expectedDeliverable: '1–2 Ý tưởng KV mới + Trọn bộ ấn phẩm chiến dịch đa SKU',
        defaultSlaHours: 48,
      },
      {
        id: 'KV-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: 'KV ra mắt chiến dịch lớn; tiêu chuẩn hình ảnh cao; chụp hình/3D; nhiều vòng duyệt',
        expectedDeliverable: 'Bộ Key Visual chủ đạo + Hướng dẫn triển khai đa kênh',
        defaultSlaHours: 72,
      },
    ],
  },
  {
    categoryKey: 'CAMPAIGN',
    categoryName: 'Brief & Kế hoạch / Báo cáo',
    tableTitle: 'Hệ số độ khó — Chiến dịch & Kế hoạch',
    unitLabel: 'Bộ Kế hoạch / Brief',
    baseWorkloadPoints: 10.0,
    levels: [
      {
        id: 'CP-L1',
        levelCode: 'Cỡ S – Nhỏ',
        multiplier: 0.8,
        scopeDescription: '1 gian/1 line; 1–2 kênh; ≤4 tuần; Ngân sách <300M hoặc NMV <1B',
        expectedDeliverable: 'Brief chiến dịch + Báo cáo nghiệm thu',
        defaultSlaHours: 48,
      },
      {
        id: 'CP-L2',
        levelCode: 'Cỡ M – Vừa',
        multiplier: 1.0,
        scopeDescription: '1–3 gian/line; 2–3 kênh; 1–2 tháng; Ngân sách 300M–1B hoặc NMV 1–5B',
        expectedDeliverable: 'Kế hoạch đa kênh + Kiểm soát lệch ngân sách ≤10%',
        defaultSlaHours: 72,
      },
      {
        id: 'CP-L3',
        levelCode: 'Cỡ L – Lớn',
        multiplier: 1.5,
        scopeDescription: 'Đa gian/ngành hàng; đa kênh; ≥2 tháng; Ngân sách >1B hoặc NMV >5B',
        expectedDeliverable: 'Kế hoạch triển khai tổng thể + Báo cáo đánh giá cấp thương hiệu',
        defaultSlaHours: 96,
      },
    ],
  },
  {
    categoryKey: 'LIVESTREAM',
    categoryName: 'Livestream Affiliate',
    tableTitle: 'Hệ số độ khó — Livestream Affiliate',
    unitLabel: 'Phiên Livestream',
    baseWorkloadPoints: 5.0,
    levels: [
      {
        id: 'LV-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Phiên live hàng ngày định kỳ, kịch bản và rổ hàng có sẵn',
        expectedDeliverable: 'Checklist phiên live + Báo cáo GMV sau phiên',
        defaultSlaHours: 24,
      },
      {
        id: 'LV-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: 'Booking ngân sách livestream ≤50M/tháng hoặc ≤15 phiên live, tiến độ ổn định',
        expectedDeliverable: 'Lịch live + Kịch bản deal/voucher & nghiệm thu phiên live',
        defaultSlaHours: 36,
      },
      {
        id: 'LV-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: 'Booking ngân sách livestream 50–100M/tháng, điều phối mẫu nhiều SKU',
        expectedDeliverable: 'Kế hoạch rổ hàng + Điều phối KOC/Host & đối soát doanh thu',
        defaultSlaHours: 48,
      },
      {
        id: 'LV-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: 'Livestream lớn / Độc quyền 50–100M+/tháng, yêu cầu trực phiên live & bám sát KV',
        expectedDeliverable: 'Biên bản trực phiên live + Báo cáo kết quả & đối soát chi phí',
        defaultSlaHours: 72,
      },
    ],
  },
];

export const TASK_ROLE_WEIGHT_RULES: TaskRoleWeightRule[] = [
  {
    roleKey: 'PIC_OWNER',
    roleLabel: 'PIC / Owner',
    definition: 'Người sở hữu chính và chịu trách nhiệm cuối cùng về kết quả của đầu việc',
    responsibilities: 'Chốt mục tiêu & kế hoạch, phân bổ nguồn lực, làm việc với Brand, kiểm soát tiến độ/chất lượng, nghiệm thu và báo cáo.',
    suggestedWeightRange: '50–70% (hoặc 100% nếu độc lập)',
    defaultWeightPct: 70,
  },
  {
    roleKey: 'CO_PIC',
    roleLabel: 'Co-PIC',
    definition: 'Người đồng quản trị một phần quan trọng của phạm vi và có quyền quyết định trong phần được giao',
    responsibilities: 'Đồng xây dựng kế hoạch, phụ trách một nhóm kênh/SKU/giai đoạn, chủ động điều phối và chịu trách nhiệm đầu ra cấu phần.',
    suggestedWeightRange: '25–40%',
    defaultWeightPct: 40,
  },
  {
    roleKey: 'EXECUTION',
    roleLabel: 'Execution',
    definition: 'Người trực tiếp triển khai khối lượng công việc theo kế hoạch đã được thống nhất',
    responsibilities: 'Thu thập dữ liệu, tìm & liên hệ KOC, gửi brief, theo dõi hàng mẫu/kịch bản/lịch air, cập nhật bảng theo dõi, nghiệm thu.',
    suggestedWeightRange: '15–30%',
    defaultWeightPct: 30,
  },
  {
    roleKey: 'SUPPORT',
    roleLabel: 'Support',
    definition: 'Người hỗ trợ một số đầu việc nhỏ hoặc trong thời gian ngắn, không sở hữu đầu ra chung',
    responsibilities: 'Bổ sung danh sách KOC, hỗ trợ nhắc lịch, cập nhật dữ liệu, tổng hợp chứng từ khi quá tải.',
    suggestedWeightRange: '5–15%',
    defaultWeightPct: 10,
  },
];

export const ROLE_SPLIT_PRESETS: {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  slots: { role: TaskAssignmentRoleKey; weightPct: number }[];
}[] = [
  {
    id: 'SOLO_100',
    label: '1 PIC độc lập (100%)',
    shortLabel: '1 PIC (100%)',
    description: '1 nhân sự tự chủ thực hiện toàn bộ đầu việc từ đầu đến cuối',
    slots: [{ role: 'PIC_OWNER', weightPct: 100 }],
  },
  {
    id: 'PIC_EXEC_70_30',
    label: '1 PIC + 1 Execution (70% – 30%)',
    shortLabel: 'PIC 70% · Exec 30%',
    description: 'Cơ cấu chuẩn: 1 người chủ trì kế hoạch & 1 người triển khai thực thi',
    slots: [
      { role: 'PIC_OWNER', weightPct: 70 },
      { role: 'EXECUTION', weightPct: 30 },
    ],
  },
  {
    id: 'PIC_COPIC_60_40',
    label: '1 PIC + 1 Co-PIC (60% – 40%)',
    shortLabel: 'PIC 60% · Co-PIC 40%',
    description: 'Đồng phụ trách theo sàn hoặc nhóm line sản phẩm',
    slots: [
      { role: 'PIC_OWNER', weightPct: 60 },
      { role: 'CO_PIC', weightPct: 40 },
    ],
  },
  {
    id: 'PIC_2EXEC_60_25_15',
    label: '1 PIC + 2 Execution (60% – 25% – 15%)',
    shortLabel: 'PIC 60% · 2 Exec (25/15%)',
    description: '1 người chủ trì và 2 chuyên viên chia nhau thực thi',
    slots: [
      { role: 'PIC_OWNER', weightPct: 60 },
      { role: 'EXECUTION', weightPct: 25 },
      { role: 'EXECUTION', weightPct: 15 },
    ],
  },
  {
    id: 'PIC_COPIC_SUP_55_35_10',
    label: '1 PIC + 1 Co-PIC + 1 Support (55% – 35% – 10%)',
    shortLabel: 'PIC 55% · Co 35% · Sup 10%',
    description: 'Tổ hợp chiến dịch lớn đa sàn cần thêm nhân sự hỗ trợ dữ liệu',
    slots: [
      { role: 'PIC_OWNER', weightPct: 55 },
      { role: 'CO_PIC', weightPct: 35 },
      { role: 'SUPPORT', weightPct: 10 },
    ],
  },
  {
    id: 'EQUAL_50_50',
    label: '2 người ngang nhau (50% – 50%)',
    shortLabel: '2 PIC (50% – 50%)',
    description: '2 nhân sự cùng chịu trách nhiệm ngang nhau trên toàn bộ đầu ra',
    slots: [
      { role: 'PIC_OWNER', weightPct: 50 },
      { role: 'CO_PIC', weightPct: 50 },
    ],
  },
];

export const CATEGORY_BADGE_STYLE: Record<TaskDifficultyCategoryKey, string> = {
  RESEARCH: 'bg-accent-soft text-accent border-accent/20',
  BOOKING: 'bg-accent-soft text-accent border-accent/20',
  CONTENT: 'bg-positive-soft text-positive border-positive/20',
  KEY_VISUAL: 'bg-accent-soft text-accent border-accent/20',
  CAMPAIGN: 'bg-warning-soft text-warning border-warning/20',
  LIVESTREAM: 'bg-critical-soft text-critical border-critical/20',
};

export const ROLE_BADGE_STYLE: Record<TaskAssignmentRoleKey, string> = {
  PIC_OWNER: 'bg-accent-soft text-accent border-accent/20',
  CO_PIC: 'bg-accent-soft text-accent border-accent/20',
  EXECUTION: 'bg-positive-soft text-positive border-positive/20',
  SUPPORT: 'bg-sunken text-ink-2 border-line',
};

export const ROLE_LABEL_MAP: Record<TaskAssignmentRoleKey, string> = {
  PIC_OWNER: 'PIC / Owner',
  CO_PIC: 'Co-PIC',
  EXECUTION: 'Execution',
  SUPPORT: 'Support',
};

export const DIFFICULTY_TIER_BADGE: Record<'EASY' | 'STANDARD' | 'HARD', { label: string; shortLabel: string; cls: string; coef: number }> = {
  EASY: { label: 'Dễ (0,80)', shortLabel: 'Dễ', cls: 'bg-sunken text-ink-2 border-line', coef: 0.8 },
  STANDARD: { label: 'Tiêu chuẩn (1,00)', shortLabel: 'Tiêu chuẩn', cls: 'bg-accent-soft text-accent border-accent/20', coef: 1.0 },
  HARD: { label: 'Khó (1,20)', shortLabel: 'Khó', cls: 'bg-critical-soft text-critical border-critical/20', coef: 1.2 },
};

export function loadSavedDifficultyConfigs(): TaskCategoryDifficultyConfig[] {
  if (typeof window === 'undefined') return DEFAULT_TASK_DIFFICULTY_CONFIGS;
  try {
    const saved = localStorage.getItem(TASK_DIFFICULTY_STORAGE_KEY);
    if (!saved) return DEFAULT_TASK_DIFFICULTY_CONFIGS;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_TASK_DIFFICULTY_CONFIGS;
  } catch {
    return DEFAULT_TASK_DIFFICULTY_CONFIGS;
  }
}

export function persistDifficultyConfigs(next: TaskCategoryDifficultyConfig[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TASK_DIFFICULTY_STORAGE_KEY, JSON.stringify(next));
      pushSharedStateToDb('task-difficulty-configs-v1', next);
      window.dispatchEvent(new CustomEvent('upbase-task-difficulty-updated', { detail: next }));
    } catch (e) {
      console.warn('Failed to save task difficulty configs:', e);
    }
  }
}

export function loadSavedSowPolicies(): SowPointPolicyItem[] {
  if (typeof window === 'undefined') return DEFAULT_SOW_POINT_POLICIES;
  try {
    const saved = localStorage.getItem('upbase_b2c_sow_point_policies_v1') || localStorage.getItem(SOW_POINT_POLICY_STORAGE_KEY);
    if (!saved) return DEFAULT_SOW_POINT_POLICIES;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_SOW_POINT_POLICIES;
  } catch {
    return DEFAULT_SOW_POINT_POLICIES;
  }
}

export function persistSowPolicies(next: SowPointPolicyItem[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOW_POINT_POLICY_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem('upbase_b2c_sow_point_policies_v1', JSON.stringify(next));
      pushSharedStateToDb('sow-point-policies-v1', next);
      window.dispatchEvent(new CustomEvent('upbase-sow-policies-updated', { detail: next }));
    } catch (e) {
      console.warn('Failed to save SOW policies:', e);
    }
  }
}

export function loadSavedManagerExceptions(): Record<string, boolean> {
  if (typeof window === 'undefined') return { HN880: true };
  try {
    const saved = localStorage.getItem(STAFF_WORKLOAD_EXCEPTIONS_KEY);
    if (!saved) return { HN880: true };
    return JSON.parse(saved);
  } catch {
    return { HN880: true };
  }
}

export function persistManagerExceptions(next: Record<string, boolean>): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STAFF_WORKLOAD_EXCEPTIONS_KEY, JSON.stringify(next));
      pushSharedStateToDb('staff-workload-exceptions-v1', next);
      window.dispatchEvent(new CustomEvent('upbase-workload-exceptions-updated', { detail: next }));
    } catch (e) {
      console.warn('Failed to save workload exceptions:', e);
    }
  }
}

export function getTargetCapacityByStaffLevel(level: string): number {
  switch (level) {
    case 'L3':
      return 145;
    case 'L2.5':
      return 132;
    case 'L2':
      return 118;
    case 'L1.5':
      return 104;
    case 'L1':
      return 92;
    case 'L0.5':
      return 78;
    default:
      return 105;
  }
}

export function getShortVietnameseStaffName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
}

export function resolveTaskSource(t: SlaTask): 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED' {
  if (t.taskSource) return t.taskSource;
  if (
    t.type === 'RESEARCH_TASK' ||
    t.taskCategory === 'RESEARCH' ||
    t.assignedBy === 'Đặng Thị Yến Nhi'
  ) {
    return 'DIRECTOR_ASSIGNED';
  }
  return 'WORKFLOW_SYSTEM';
}

export type UnifiedWorkloadLoadStatus = 'OVERLOAD' | 'OPTIMAL' | 'UNDERLOAD';
export type UnifiedRoleFilterGroup =
  | 'ALL'
  | 'LEADER'
  | 'BOOKING'
  | 'CONTENT_BRAND'
  | 'PLAN_STRATEGY'
  | 'KEY_VISUAL'
  | 'FOC_SAMPLE';

export function classifyB2cStaffRoleCategory(roleGroup: string): UnifiedRoleFilterGroup {
  const lower = roleGroup.toLowerCase();
  if (lower.includes('trưởng nhóm') || lower.includes('lead')) return 'LEADER';
  if (lower.includes('foc') || lower.includes('sample')) return 'FOC_SAMPLE';
  if (lower.includes('key visual') || lower.includes('sis')) return 'KEY_VISUAL';
  if (lower.includes('booking')) return 'BOOKING';
  if (lower.includes('content') || lower.includes('brand main')) return 'CONTENT_BRAND';
  if (lower.includes('plan') || lower.includes('strategy')) return 'PLAN_STRATEGY';
  return 'BOOKING';
}

export interface UnifiedStaffWorkloadRow extends StaffWorkloadRosterMember {
  id: string;
  shortName: string;
  roleFilterCategory: UnifiedRoleFilterGroup;
  staffTasks: SlaTask[];
  activeTasks: SlaTask[];
  workflowPts: number;
  directorPts: number;
  dynamicTaskPts: number;
  rawTotalPts: number;
  totalPts: number;
  hardPts: number;
  requiredHardRatioPct: number;
  actualHardRatioPct: number;
  hardRatioPct: number;
  minHardRatioReqPct: number;
  meetsHardRatio: boolean;
  isHardRatioPass: boolean;
  hasException: boolean;
  structureCoef: number;
  finalMonthlyWorkloadPts: number;
  targetCapacityPts: number;
  loadPct: number;
  loadStatus: UnifiedWorkloadLoadStatus;
  assignedBrands: {
    brandId: string;
    brandName: string;
    roles: string[];
  }[];
  assignedStores: {
    storeId: string;
    storeName: string;
    brandName: string;
    platform: string;
    coef: number;
    budgetNet: number;
    roleLabel: string;
  }[];
  liveAssignedStoresCount: number;
  liveStoresSummaryText: string;
}

export function computeUnifiedB2cStaffWorkloads(params: {
  tasks: SlaTask[];
  brands: BrandDetail[];
  storePortfolios: StorePortfolioItem[];
  managerExceptions?: Record<string, boolean>;
}): UnifiedStaffWorkloadRow[] {
  const { tasks, brands, storePortfolios, managerExceptions = { HN880: true } } = params;

  const b2cStores = (() => {
    const filtered = storePortfolios.filter(s => Boolean(s.requiresB2cPlan || s.isB2cManaged));
    return filtered.length > 0 ? filtered : storePortfolios.slice(0, 69);
  })();

  return B2C_28_STAFF_WORKLOAD_ROSTER.map((member, rosterIdx) => {
    // 1. Live Brand Assignments
    const assignedBrands: UnifiedStaffWorkloadRow['assignedBrands'] = [];
    brands.forEach(b => {
      const roles: string[] = [];
      const contentMain = b.contentBrandMainPic || b.contentPic || '';
      const planStrat = b.planStrategyPic || b.brandPicName || '';
      const kvSis = b.keyVisualSisPic || '';
      const bookingLead = b.bookingPicLead || '';

      if (contentMain.toLowerCase() === member.name.toLowerCase()) roles.push('Content / Brand');
      if (planStrat.toLowerCase() === member.name.toLowerCase()) roles.push('Plan / Strategy');
      if (kvSis.toLowerCase() === member.name.toLowerCase()) roles.push('Key Visual');
      if (bookingLead.toLowerCase() === member.name.toLowerCase()) roles.push('Booking Lead');

      if (roles.length > 0) {
        assignedBrands.push({
          brandId: b.id,
          brandName: b.name,
          roles,
        });
      }
    });

    // 2. Live Store Assignments
    const assignedStores: UnifiedStaffWorkloadRow['assignedStores'] = [];
    b2cStores.forEach(s => {
      const matchOwner =
        (s.b2cOwnerName && s.b2cOwnerName.toLowerCase().includes(member.name.toLowerCase())) ||
        (s.assignedStaff && s.assignedStaff.toLowerCase().includes(member.name.toLowerCase())) ||
        (s.b2cOwners && s.b2cOwners.some(o => o.toLowerCase().includes(member.name.toLowerCase())));
      const matchLeader =
        s.hasBookingLeader &&
        s.bookingLeader &&
        s.bookingLeader.toLowerCase().includes(member.name.toLowerCase());
      const matchContent =
        s.contentPic && s.contentPic.toLowerCase().includes(member.name.toLowerCase());
      const matchLive =
        s.livestreamPic && s.livestreamPic.toLowerCase().includes(member.name.toLowerCase());

      if (matchOwner || matchLeader || matchContent || matchLive) {
        const roleLabels: string[] = [];
        if (matchOwner) roleLabels.push('PIC Gian');
        if (matchLeader) roleLabels.push('Leader');
        if (matchContent) roleLabels.push('Content');
        if (matchLive) roleLabels.push('Live');

        assignedStores.push({
          storeId: s.id,
          storeName: s.storeName,
          brandName: s.brandName,
          platform: s.platform,
          coef: normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier).multiplier,
          budgetNet: s.budgetNet || s.monthlyBudget || 0,
          roleLabel: roleLabels.join(' · '),
        });
      }
    });

    // Fallback from roster sample tokens if not yet explicitly linked
    if (member.keyStoresSample) {
      const sampleTokens = member.keyStoresSample
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      sampleTokens.forEach(token => {
        const matchedStore = b2cStores.find(
          st =>
            st.storeName.toLowerCase().includes(token.toLowerCase()) ||
            st.brandName.toLowerCase().includes(token.toLowerCase())
        );
        if (matchedStore && !assignedStores.some(as => as.storeId === matchedStore.id)) {
          assignedStores.push({
            storeId: matchedStore.id,
            storeName: matchedStore.storeName,
            brandName: matchedStore.brandName,
            platform: matchedStore.platform,
            coef: normalizeStoreCoefficient(
              matchedStore.difficultyTier,
              matchedStore.difficultyMultiplier
            ).multiplier,
            budgetNet: matchedStore.budgetNet || matchedStore.monthlyBudget || 0,
            roleLabel: 'PIC Phối hợp',
          });
        }
        const matchedBrand = brands.find(br =>
          br.name.toLowerCase().includes(token.toLowerCase())
        );
        if (matchedBrand && !assignedBrands.some(ab => ab.brandId === matchedBrand.id)) {
          assignedBrands.push({
            brandId: matchedBrand.id,
            brandName: matchedBrand.name,
            roles: [member.roleGroup.split('&')[0].trim()],
          });
        }
      });
    }

    // 3. Tasks & Workload Points (Bảng 1 -> Bảng 6) + Đồng bộ trực tiếp Hệ số gian hàng & Bàn giao PIC
    const staffTasks = tasks.filter(
      t => t.pic && t.pic.toLowerCase() === member.name.toLowerCase()
    );
    const activeTasks = staffTasks.filter(t => t.urgency !== 'done');

    let liveWorkflowPts = 0;
    let liveWorkflowHardPts = 0;
    let liveDirectorPts = 0;
    let liveDirectorHardPts = 0;

    staffTasks.forEach(t => {
      const pts = t.calculatedWorkloadPoints ?? t.standardPoint ?? 2.0;
      const isHard =
        t.taskDifficultyTier === 'HARD' ||
        (t.difficultyMultiplier && t.difficultyMultiplier >= 1.2) ||
        t.urgency === 'critical';
      const src = resolveTaskSource(t);
      if (src === 'DIRECTOR_ASSIGNED') {
        liveDirectorPts += pts;
        if (isHard) liveDirectorHardPts += pts;
      } else {
        liveWorkflowPts += pts;
        if (isHard) liveWorkflowHardPts += pts;
      }
    });

    // Tác động trực tiếp từ Hệ số gian hàng (0,80 / 1,00 / 1,25 / 1,50) của các gian hàng đang phụ trách
    const storeCoeffDeltaPts = assignedStores.reduce(
      (sum, st) => sum + (st.coef - 1.0) * 14.0,
      0
    );
    const storeHardDeltaPts = assignedStores.reduce(
      (sum, st) => (st.coef >= 1.25 ? sum + (st.coef - 1.0) * 14.0 : sum),
      0
    );

    const workflowPts = Number(
      Math.max(0, member.baselineWorkflowTotalPts + liveWorkflowPts + storeCoeffDeltaPts).toFixed(2)
    );
    const directorPts = Number((member.baselineDirectorTotalPts + liveDirectorPts).toFixed(2));
    const dynamicTaskPts = Number((liveWorkflowPts + liveDirectorPts + storeCoeffDeltaPts).toFixed(2));
    const rawTotalPts = Number((workflowPts + directorPts).toFixed(2));
    const hardPts = Number(
      Math.max(
        0,
        member.baselineWorkflowHardPts +
          member.baselineDirectorHardPts +
          liveWorkflowHardPts +
          liveDirectorHardPts +
          storeHardDeltaPts
      ).toFixed(2)
    );

    const levelRule =
      STAFF_LEVEL_TABLE_4.find(l => l.level === member.level) || STAFF_LEVEL_TABLE_4[3];
    const actualHardRatioPct =
      rawTotalPts > 0 ? Number(((hardPts / rawTotalPts) * 100).toFixed(1)) : 0;
    const meetsHardRatio = actualHardRatioPct >= levelRule.minHardRatioPct;
    const hasException = !!managerExceptions[member.staffCode];
    const structureCoef = meetsHardRatio || hasException ? 1.0 : 0.7;
    const finalMonthlyWorkloadPts = Number((rawTotalPts * structureCoef).toFixed(2));

    const targetCapacityPts = getTargetCapacityByStaffLevel(member.level);
    const loadPct = Math.round((rawTotalPts / targetCapacityPts) * 100);

    let loadStatus: UnifiedWorkloadLoadStatus = 'OPTIMAL';
    if (loadPct >= 115) {
      loadStatus = 'OVERLOAD';
    } else if (loadPct < 96) {
      loadStatus = 'UNDERLOAD';
    }

    const liveAssignedStoresCount =
      member.staffCode === 'HN880'
        ? Math.max(member.assignedStoresCount, assignedStores.length)
        : assignedStores.length > 0
        ? assignedStores.length
        : member.assignedStoresCount;
    const liveStoresSummaryText =
      assignedStores.length > 0
        ? assignedStores
            .map(s => s.storeName.replace(/_TikTok.*|_Shopee.*| Official| Store/gi, ''))
            .slice(0, 6)
            .join(', ')
        : member.keyStoresSample;

    return {
      ...member,
      id: `staff-${member.staffCode}`,
      shortName: getShortVietnameseStaffName(member.name),
      roleFilterCategory: classifyB2cStaffRoleCategory(member.roleGroup),
      staffTasks,
      activeTasks,
      workflowPts,
      directorPts,
      dynamicTaskPts,
      rawTotalPts,
      totalPts: rawTotalPts,
      hardPts,
      requiredHardRatioPct: levelRule.minHardRatioPct,
      minHardRatioReqPct: levelRule.minHardRatioPct,
      actualHardRatioPct,
      hardRatioPct: actualHardRatioPct,
      meetsHardRatio,
      isHardRatioPass: meetsHardRatio,
      hasException,
      structureCoef,
      finalMonthlyWorkloadPts,
      targetCapacityPts,
      loadPct,
      loadStatus,
      assignedBrands,
      assignedStores,
      liveAssignedStoresCount,
      liveStoresSummaryText,
    };
  });
}
