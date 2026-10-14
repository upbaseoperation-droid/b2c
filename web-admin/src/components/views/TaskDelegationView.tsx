'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Sliders,
  Send,
  CheckCircle2,
  Search,
  Edit3,
  RotateCcw,
  Trash2,
  ExternalLink,
  Layers,
  Check,
  X,
  BarChart3,
  GitBranch,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  SlaTask,
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  TaskDifficultyCategoryKey,
  TaskAssignmentRoleKey,
  TaskCategoryDifficultyConfig,
  TaskDifficultyLevelConfig,
  TaskRoleWeightRule,
  UserRole,
} from '../../lib/types';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';
import { STAFF_MASTER_DIRECTORY } from '../../lib/mockData';
import {
  classifyMasterStaffMember,
  getSavedDeptAccessRules,
  getSavedStaffAccessOverrides,
  INITIAL_DEPARTMENT_ACCESS_RULES,
} from '../../lib/rbacData';
import { Avatar, Button, Presence, Stat, StatRow, Status } from '../ui';

const TASK_DIFFICULTY_STORAGE_KEY = 'upbase_b2c_task_difficulty_configs_v1';
const SOW_POINT_POLICY_STORAGE_KEY = 'upbase_b2c_sow_point_policy_v1';
const STAFF_WORKLOAD_EXCEPTIONS_KEY = 'upbase_b2c_staff_workload_exceptions_v1';

// ============================================================================
// BẢNG 1. CHÍNH SÁCH POINT THEO SCOPE OF WORK (33 LOẠI CÔNG VIỆC — SHEET 2 EXCEL)
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
    name: 'Video Voice/AI',
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
    name: 'Audit chỉnh sửa cơ bản',
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
    name: 'JBP năm (Joint Business Plan) + report năm',
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
    name: 'Strategy quý / review quý với brand',
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
    name: 'Plan tháng của brand + report tháng',
    basePoint: 10.0,
    defaultDifficultyTier: 'HARD',
    scopeUnit: 'Brand',
    ruleNote: 'Mỗi tháng 1 lần; nhân HS đa sàn',
    defaultSource: 'WORKFLOW_SYSTEM',
    supportsMultiPlatform: true,
  },
];

// ============================================================================
// BẢNG 2, 3, 4, 5, 6 (CÁC BẢNG HỆ SỐ TỪ SHEET 2 EXCEL)
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
    criteria: 'Đầu việc chuẩn theo scope thông thường, có brief rõ, chỉnh sửa trong mức bình thường',
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
  { status: 'ON_TIME', label: 'Hoàn thành đúng hạn', condition: 'Đúng deadline đã chốt', coef: 1.0 },
  { status: 'LATE_1', label: 'Chậm mức 1', condition: 'Trễ 1 ngày (việc ngày/tuần) hoặc 1–2 ngày (việc lớn)', coef: 0.7 },
  { status: 'LATE_2', label: 'Chậm mức 2', condition: 'Trễ >1 ngày (việc ngày/tuần) hoặc 3–5 ngày (việc lớn)', coef: 0.4 },
  { status: 'FAILED', label: 'Không hoàn thành', condition: 'Quá mốc trên, hủy việc hoặc phải chuyển người', coef: 0.0 },
];

export const MULTI_PLATFORM_TABLE_6: {
  stores: number;
  label: string;
  coef: number;
}[] = [
  { stores: 1, label: '1 store (1 sàn)', coef: 1.0 },
  { stores: 2, label: '2 store (2 sàn)', coef: 1.3 },
  { stores: 3, label: '3 store (3 sàn)', coef: 1.6 },
  { stores: 4, label: '≥4 store (Trần tối đa)', coef: 1.6 },
];

// ============================================================================
// DANH SÁCH 28 NHÂN SỰ THỰC TẾ TỪ SHEET 4 (DANH SÁCH NHÂN SỰ) & SHEET 1 (STORE T10)
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
    roleGroup: 'Trưởng Nhóm Booking & Plan Strategy',
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
    baselineWorkflowHardPts: 22.0, // Minh hoạ trường hợp tỷ lệ việc khó ~21.5% < 25% chuẩn L1.5 để quản lý xem xét
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
    roleGroup: 'Điều phối FOC & Sample KOC',
    assignedStoresCount: 14,
    keyStoresSample: 'Toàn bộ gian hàng FOC & Gửi mẫu KOC',
    baselineWorkflowTotalPts: 88.0,
    baselineWorkflowHardPts: 18.0, // Minh hoạ trường hợp chuyên viên FOC ít việc khó -> Quản lý xác nhận ngoại lệ 1,00
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
    keyStoresSample: 'Supporting Content Kênh',
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
    tableTitle: 'Bảng 2b. Hệ số cấp độ research (chỉ dùng cho nhóm Nghiên cứu)',
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
        expectedDeliverable: 'Hồ sơ Research + Kế hoạch Content + Plan Booking KOC',
        defaultSlaHours: 48,
      },
      {
        id: 'RES-L4',
        levelCode: 'Level 4 – Chiến lược thương hiệu',
        multiplier: 1.4,
        scopeDescription: 'Nghiên cứu kèm Brand Strategy',
        expectedDeliverable: 'Hồ sơ Research + Brand Strategy (Target, Insight, Positioning, Message)',
        defaultSlaHours: 72,
      },
      {
        id: 'RES-L5',
        levelCode: 'Level 5 – Định vị tổng thể',
        multiplier: 1.6,
        scopeDescription: 'Đa sàn, đa line; xây mới hoặc tái định vị',
        expectedDeliverable: 'Deck Định vị tổng thể đa sàn + Brand Strategy & Master Plan',
        defaultSlaHours: 96,
      },
    ],
  },
  {
    categoryKey: 'BOOKING',
    categoryName: 'Content Affiliate (Booking KOC)',
    tableTitle: 'Bảng 2a-1. Hệ số độ khó — Nhóm Booking Video KOC',
    unitLabel: 'Video KOC nghiệm thu',
    baseWorkloadPoints: 2.0,
    levels: [
      {
        id: 'BK-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Gian hàng ổn định, pool KOC sẵn có, yêu cầu cơ bản, duyệt đơn giản',
        expectedDeliverable: 'Danh sách KOC chốt deal + Hợp đồng & link nghiệm thu đúng SLA',
        defaultSlaHours: 24,
      },
      {
        id: 'BK-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: '≤100M/tháng hoặc ≤15 booking; 1 đợt air; ngân sách và tiến độ ổn định',
        expectedDeliverable: 'Hoàn thành 100% slot KOC theo kế hoạch tuần + Mã Spark Ads',
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
    tableTitle: 'Bảng 2a-2. Hệ số độ khó — Nhóm Content Kênh & Kịch bản',
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
        expectedDeliverable: 'Content plan, script chi tiết, link video đã QC/approval',
        defaultSlaHours: 24,
      },
      {
        id: 'CT-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: 'Phát triển angle/pillar mới; nhiều format/SKU; yêu cầu hình ảnh khá; cần test và tối ưu',
        expectedDeliverable: 'Bộ Content Angle mới + Kịch bản thử nghiệm A/B Hook 3s',
        defaultSlaHours: 48,
      },
      {
        id: 'CT-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: 'Yêu cầu visual/storytelling cao; concept mới; quay phức tạp/talent; guideline pháp lý nghiêm',
        expectedDeliverable: 'Master Concept + Video Hero Viral đạt chuẩn Brand & Pháp lý',
        defaultSlaHours: 72,
      },
    ],
  },
  {
    categoryKey: 'KEY_VISUAL',
    categoryName: 'Key Visual & SIS',
    tableTitle: 'Bảng 2a-3. Hệ số độ khó — Nhóm Key Visual / SIS',
    unitLabel: 'Bộ Key Visual / SIS',
    baseWorkloadPoints: 10.0,
    levels: [
      {
        id: 'KV-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Adapt KV/template có sẵn; thay text/SKU/size; gần như không sửa concept',
        expectedDeliverable: 'Bộ khung frame/banner adapt đúng kích thước sàn',
        defaultSlaHours: 24,
      },
      {
        id: 'KV-L2',
        levelCode: 'Tiêu chuẩn',
        multiplier: 1.0,
        scopeDescription: 'Thiết kế KV định kỳ cho gian hàng ổn định (mốc chuẩn 17,5 bộ KV hoặc 4 store)',
        expectedDeliverable: 'KV brief + File thiết kế nghiệm thu treo gian hàng',
        defaultSlaHours: 36,
      },
      {
        id: 'KV-L3',
        levelCode: 'Vừa',
        multiplier: 1.25,
        scopeDescription: 'Phát triển KV mới mức vừa; 1–2 concept; nhiều size/SKU; phối hợp design 1–2 vòng duyệt',
        expectedDeliverable: '1–2 Concept KV mới + Trọn bộ ấn phẩm chiến dịch đa SKU',
        defaultSlaHours: 48,
      },
      {
        id: 'KV-L4',
        levelCode: 'Khó',
        multiplier: 1.5,
        scopeDescription: 'KV hero/launch; tiêu chuẩn hình ảnh cao; concept mới; shooting/3D/talent; nhiều vòng duyệt',
        expectedDeliverable: 'Master Key Visual Launch + Guideline triển khai đa kênh',
        defaultSlaHours: 72,
      },
    ],
  },
  {
    categoryKey: 'CAMPAIGN',
    categoryName: 'Brief & JBP Plan / Report',
    tableTitle: 'Bảng 2a-4. Hệ số độ khó — Nhóm Chiến dịch, Brief & JBP Plan',
    unitLabel: 'Bộ Kế hoạch / Brief',
    baseWorkloadPoints: 10.0,
    levels: [
      {
        id: 'CP-L1',
        levelCode: 'Size S – Nhỏ',
        multiplier: 0.8,
        scopeDescription: '1 store/1 line; 1–2 kênh; ≤4 tuần; Ngân sách <300M hoặc NMV <1B',
        expectedDeliverable: 'Brief chiến dịch + Báo cáo nghiệm thu ≥90%',
        defaultSlaHours: 48,
      },
      {
        id: 'CP-L2',
        levelCode: 'Size M – Vừa',
        multiplier: 1.0,
        scopeDescription: '1–3 store/line; 2–3 kênh; 1–2 tháng; Ngân sách 300M–1B hoặc NMV 1–5B',
        expectedDeliverable: 'Master Plan đa kênh + Kiểm soát phương sai ngân sách ≤10%',
        defaultSlaHours: 72,
      },
      {
        id: 'CP-L3',
        levelCode: 'Size L – Lớn',
        multiplier: 1.5,
        scopeDescription: 'Đa store/category; đa kênh; ≥2 tháng; Ngân sách >1B hoặc NMV >5B; ≥5 stakeholder',
        expectedDeliverable: 'Chiến lược GTM/IMC End-to-End + Case Study cấp thương hiệu',
        defaultSlaHours: 96,
      },
    ],
  },
  {
    categoryKey: 'LIVESTREAM',
    categoryName: 'Livestream Affiliate',
    tableTitle: 'Bảng 2a-5. Hệ số độ khó — Nhóm Livestream Affiliate',
    unitLabel: 'Phiên Livestream',
    baseWorkloadPoints: 5.0,
    levels: [
      {
        id: 'LV-L1',
        levelCode: 'Cơ bản',
        multiplier: 0.8,
        scopeDescription: 'Phiên live Daily định kỳ, kịch bản và rổ hàng có sẵn',
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
        scopeDescription: 'Livestream Mega / Độc quyền 50–100M+/tháng, yêu cầu standby trong phiên live & follow KV',
        expectedDeliverable: 'Biên bản standby trực tiếp + Báo cáo Mega Live & đối soát chi phí',
        defaultSlaHours: 72,
      },
    ],
  },
];

export const TASK_ROLE_WEIGHT_RULES: TaskRoleWeightRule[] = [
  {
    roleKey: 'PIC_OWNER',
    roleLabel: 'PIC / Owner',
    definition: 'Người sở hữu chính và chịu trách nhiệm cuối cùng về kết quả của scope',
    responsibilities: 'Chốt mục tiêu & kế hoạch, phân bổ nguồn lực, làm việc với Brand, kiểm soát tiến độ/chất lượng, nghiệm thu và báo cáo.',
    suggestedWeightRange: '50–70% (hoặc 100% nếu độc lập)',
    defaultWeightPct: 70,
  },
  {
    roleKey: 'CO_PIC',
    roleLabel: 'Co-PIC',
    definition: 'Người đồng quản trị một phần quan trọng của scope và có quyền quyết định trong phạm vi được giao',
    responsibilities: 'Đồng xây dựng kế hoạch, phụ trách một nhóm kênh/SKU/giai đoạn, chủ động điều phối và chịu trách nhiệm đầu ra cấu phần.',
    suggestedWeightRange: '25–40%',
    defaultWeightPct: 40,
  },
  {
    roleKey: 'EXECUTION',
    roleLabel: 'Execution',
    definition: 'Người trực tiếp triển khai khối lượng công việc theo kế hoạch đã được thống nhất',
    responsibilities: 'Thu thập dữ liệu, tìm & liên hệ KOC, gửi brief, theo dõi sample/kịch bản/lịch air, cập nhật tracker, nghiệm thu.',
    suggestedWeightRange: '15–30%',
    defaultWeightPct: 30,
  },
  {
    roleKey: 'SUPPORT',
    roleLabel: 'Support',
    definition: 'Người hỗ trợ một số đầu việc nhỏ hoặc trong thời gian ngắn, không sở hữu đầu ra chung',
    responsibilities: 'Bổ sung danh sách KOC, hỗ trợ follow-up, cập nhật dữ liệu, tổng hợp chứng từ khi quá tải.',
    suggestedWeightRange: '5–15%',
    defaultWeightPct: 10,
  },
];

export const ROLE_SPLIT_PRESETS: {
  id: string;
  label: string;
  description: string;
  slots: { role: TaskAssignmentRoleKey; weightPct: number }[];
}[] = [
  {
    id: 'SOLO_100',
    label: '1 PIC độc lập (100%)',
    description: '1 nhân sự tự chủ thực hiện toàn bộ đầu việc từ đầu đến cuối',
    slots: [{ role: 'PIC_OWNER', weightPct: 100 }],
  },
  {
    id: 'PIC_EXEC_70_30',
    label: '1 PIC + 1 Execution (70% – 30%)',
    description: 'Cơ cấu chuẩn: 1 người chủ trì kế hoạch & 1 người triển khai thực thi',
    slots: [
      { role: 'PIC_OWNER', weightPct: 70 },
      { role: 'EXECUTION', weightPct: 30 },
    ],
  },
  {
    id: 'PIC_COPIC_60_40',
    label: '1 PIC + 1 Co-PIC (60% – 40%)',
    description: 'Đồng phụ trách theo sàn hoặc nhóm line sản phẩm',
    slots: [
      { role: 'PIC_OWNER', weightPct: 60 },
      { role: 'CO_PIC', weightPct: 40 },
    ],
  },
  {
    id: 'PIC_2EXEC_60_25_15',
    label: '1 PIC + 2 Execution (60% – 25% – 15%)',
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

export const DIFFICULTY_TIER_BADGE: Record<'EASY' | 'STANDARD' | 'HARD', { label: string; cls: string; coef: number }> = {
  EASY: { label: 'Dễ (0,80)', cls: 'bg-sunken text-ink-2 border-line', coef: 0.8 },
  STANDARD: { label: 'Tiêu chuẩn (1,00)', cls: 'bg-accent-soft text-accent border-accent/20', coef: 1.0 },
  HARD: { label: 'Khó (1,20)', cls: 'bg-critical-soft text-critical border-critical/20', coef: 1.2 },
};

interface TaskDelegationViewProps {
  currentUser: UserProfile;
  tasks: SlaTask[];
  brands: BrandDetail[];
  storePortfolios: StorePortfolioItem[];
  onAddTask: (task: SlaTask) => void;
  onCompleteTask: (taskId: string) => void;
  onUpdateTask?: (updated: SlaTask) => void;
  onPingStaff?: (staffName: string, taskTitle: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

interface AssigneeSlotState {
  staffName: string;
  role: TaskAssignmentRoleKey;
  weightPct: number;
}

export const TaskDelegationView: React.FC<TaskDelegationViewProps> = ({
  currentUser,
  tasks,
  brands,
  storePortfolios,
  onAddTask,
  onCompleteTask,
  onUpdateTask,
  onPingStaff,
  onNotify,
}) => {
  const canManageSetup = ['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'LEADER'].includes(currentUser.role);

  const [activeSubTab, setActiveSubTab] = useState<
    'ASSIGNMENTS' | 'WORKLOAD_MEASUREMENT' | 'DIFFICULTY_SETUP'
  >('ASSIGNMENTS');

  // Load & persist Task Difficulty Configs (Bảng 2b & 2a)
  const [difficultyConfigs, setDifficultyConfigs] = useState<TaskCategoryDifficultyConfig[]>(() => {
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
  });

  const saveDifficultyConfigs = (next: TaskCategoryDifficultyConfig[]) => {
    setDifficultyConfigs(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TASK_DIFFICULTY_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save task difficulty configs:', e);
      }
    }
  };

  // Load & persist Bảng 1 SOW Point Policies (33 loại công việc)
  const [sowPolicies, setSowPolicies] = useState<SowPointPolicyItem[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_SOW_POINT_POLICIES;
    try {
      const saved = localStorage.getItem(SOW_POINT_POLICY_STORAGE_KEY);
      if (!saved) return DEFAULT_SOW_POINT_POLICIES;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return DEFAULT_SOW_POINT_POLICIES;
    } catch {
      return DEFAULT_SOW_POINT_POLICIES;
    }
  });

  const saveSowPolicies = (next: SowPointPolicyItem[]) => {
    setSowPolicies(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOW_POINT_POLICY_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save SOW policies:', e);
      }
    }
  };

  // Load & persist Bảng 4 Manager Exceptions (giữ hệ số 1,00 khi công ty không phân bổ đủ việc khó)
  const [managerExceptions, setManagerExceptions] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { HN880: true };
    try {
      const saved = localStorage.getItem(STAFF_WORKLOAD_EXCEPTIONS_KEY);
      if (!saved) return { HN880: true };
      return JSON.parse(saved);
    } catch {
      return { HN880: true };
    }
  });

  const toggleManagerException = (staffCode: string, staffName: string) => {
    const next = { ...managerExceptions, [staffCode]: !managerExceptions[staffCode] };
    setManagerExceptions(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STAFF_WORKLOAD_EXCEPTIONS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
    }
    onNotify?.(
      next[staffCode]
        ? `Đã xác nhận ngoại lệ Bảng 4 cho ${staffName}: Giữ nguyên HS cơ cấu x1,00 (do công ty phân bổ đặc thù)`
        : `Đã gỡ ngoại lệ Bảng 4 của ${staffName}: Áp dụng HS cơ cấu theo tỷ lệ thực tế`,
      'info'
    );
  };

  // Staff list for assignment (prioritizing the 28 B2C staff from Sheet 4)
  const allAssignableStaff = useMemo(() => {
    const rules = getSavedDeptAccessRules(INITIAL_DEPARTMENT_ACCESS_RULES);
    const overrides = getSavedStaffAccessOverrides();
    const map = new Map<string, { name: string; roleTitle: string; team: string; sysRole: UserRole; level?: string; staffCode?: string }>();

    B2C_28_STAFF_WORKLOAD_ROSTER.forEach(r => {
      map.set(r.name, {
        name: r.name,
        roleTitle: `${r.roleGroup} (${r.level})`,
        team: 'Marketing B2C',
        sysRole: r.level === 'L3' ? 'LEADER' : 'BOOKING_MEMBER',
        level: r.level,
        staffCode: r.staffCode,
      });
    });

    STAFF_MASTER_DIRECTORY.forEach(s => {
      if (!map.has(s.name)) {
        const sysRole: UserRole =
          s.role === 'BOOKING'
            ? 'BOOKING_MEMBER'
            : s.role === 'CONTENT'
            ? 'CONTENT_MEMBER'
            : s.role === 'MANAGER'
            ? 'MANAGER'
            : 'BRAND_MEMBER';
        map.set(s.name, {
          name: s.name,
          roleTitle: s.roleTitle,
          team: s.team,
          sysRole,
        });
      }
    });

    UPBASE_STAFF_MASTER.forEach(s => {
      const c = classifyMasterStaffMember(s, rules, overrides);
      if (c.canLogin && !map.has(s.name)) {
        map.set(s.name, {
          name: s.name,
          roleTitle: s.position || 'Chuyên viên',
          team: s.department || s.team || 'Marketing B2C',
          sysRole: c.role,
        });
      }
    });

    return Array.from(map.values());
  }, []);

  // Filters for Tab 1 (Task List)
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TaskDifficultyCategoryKey>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | TaskAssignmentRoleKey>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'OPEN' | 'CRITICAL' | 'DONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters & State for Tab 2 (Đo lường Workload Nhân sự)
  const [workloadLevelFilter, setWorkloadLevelFilter] = useState<string>('ALL');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL_07' | 'EXCEPTION'>('ALL');
  const [workloadSearch, setWorkloadSearch] = useState<string>('');
  const [inspectingStaffMember, setInspectingStaffMember] = useState<string | null>(null);

  // Deliverable submission modal state
  const [editingDeliverableTask, setEditingDeliverableTask] = useState<SlaTask | null>(null);
  const [deliverableInputUrl, setDeliverableInputUrl] = useState<string>('');

  // Setup Tab state
  const [setupSection, setSetupSection] = useState<'TABLE_1_SOW' | 'TABLE_2B_LEVELS' | 'TABLE_2_TO_7_RULES'>('TABLE_1_SOW');
  const [sowGroupFilter, setSowGroupFilter] = useState<string>('ALL');
  const [editingSowStt, setEditingSowStt] = useState<number | null>(null);
  const [editSowDraft, setEditSowDraft] = useState<SowPointPolicyItem | null>(null);

  const [selectedSetupCategory, setSelectedSetupCategory] = useState<TaskDifficultyCategoryKey>('RESEARCH');
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editLevelDraft, setEditLevelDraft] = useState<TaskDifficultyLevelConfig | null>(null);
  const [isAddingNewLevel, setIsAddingNewLevel] = useState<boolean>(false);
  const [newLevelDraft, setNewLevelDraft] = useState<{
    levelCode: string;
    multiplier: number;
    scopeDescription: string;
    expectedDeliverable: string;
    defaultSlaHours: number;
  }>({
    levelCode: '',
    multiplier: 1.0,
    scopeDescription: '',
    expectedDeliverable: '',
    defaultSlaHours: 48,
  });

  // New Task Assignment Modal State (supports full Bảng 1 -> Bảng 7 calculation)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [formTaskSource, setFormTaskSource] = useState<'DIRECTOR_ASSIGNED' | 'WORKFLOW_SYSTEM'>('DIRECTOR_ASSIGNED');
  const [formSowStt, setFormSowStt] = useState<number>(26); // Default STT 26: Nghiên cứu gian hàng mới 50-100 tỷ
  const [formCategory, setFormCategory] = useState<TaskDifficultyCategoryKey>('RESEARCH');
  const [formLevelId, setFormLevelId] = useState<string>('RES-L3');
  const [formAcceptedQty, setFormAcceptedQty] = useState<number>(1);
  const [formTaskDiffTier, setFormTaskDiffTier] = useState<'EASY' | 'STANDARD' | 'HARD'>('HARD');
  const [formTimelineStatus, setFormTimelineStatus] = useState<'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED'>('ON_TIME');
  const [formMultiStoreCount, setFormMultiStoreCount] = useState<number>(1);
  const [formBrand, setFormBrand] = useState<string>(brands[0]?.name || 'ClubClio');
  const [formStore, setFormStore] = useState<string>('');
  const [formPlatformsCount, setFormPlatformsCount] = useState<number>(2);
  const [formProductLinesCount, setFormProductLinesCount] = useState<number>(2);
  const [formIncludeContentBookingPlan, setFormIncludeContentBookingPlan] = useState<boolean>(true);
  const [formIncludeBrandStrategy, setFormIncludeBrandStrategy] = useState<boolean>(false);
  // Bảng 7 Mandatory Fields
  const [formPlatformScope, setFormPlatformScope] = useState<string>('TikTok, Shopee');
  const [formChannelPlatform, setFormChannelPlatform] = useState<string>('TikTok / Shopee Video');
  const [formOriginalAssetRef, setFormOriginalAssetRef] = useState<string>('');
  const [formKocStatusType, setFormKocStatusType] = useState<'NEW_KOC' | 'REBOOK' | 'FRAMEWORK_CONTRACT'>('NEW_KOC');
  const [formDiffOverrideReason, setFormDiffOverrideReason] = useState<string>('');

  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDeliverable, setFormDeliverable] = useState<string>('');
  const [formDeadlineHours, setFormDeadlineHours] = useState<number>(48);
  const [formUrgency, setFormUrgency] = useState<'critical' | 'warning' | 'normal'>('warning');
  const [assignees, setAssignees] = useState<AssigneeSlotState[]>([
    { staffName: 'Nguyễn Thị Ngọc Tâm', role: 'PIC_OWNER', weightPct: 70 },
    { staffName: 'Lê Phương Thảo', role: 'EXECUTION', weightPct: 30 },
  ]);

  const selectedSowPolicy = useMemo(() => {
    return sowPolicies.find(s => s.stt === formSowStt) || sowPolicies[0];
  }, [sowPolicies, formSowStt]);

  const activeCategoryConfig = useMemo(() => {
    return (
      difficultyConfigs.find(c => c.categoryKey === formCategory) ||
      difficultyConfigs[0]
    );
  }, [difficultyConfigs, formCategory]);

  const activeLevelConfig = useMemo(() => {
    return (
      activeCategoryConfig.levels.find(l => l.id === formLevelId) ||
      activeCategoryConfig.levels[0]
    );
  }, [activeCategoryConfig, formLevelId]);

  // Synchronize when SOW item changes
  const handleSelectSowPolicy = (sow: SowPointPolicyItem) => {
    setFormSowStt(sow.stt);
    setFormCategory(sow.categoryKey);
    setFormTaskDiffTier(sow.defaultDifficultyTier);
    setFormTaskSource(sow.defaultSource);
    const catCfg = difficultyConfigs.find(c => c.categoryKey === sow.categoryKey) || difficultyConfigs[0];
    if (catCfg && catCfg.levels[1]) {
      setFormLevelId(catCfg.levels[1].id);
      setFormDeliverable(catCfg.levels[1].expectedDeliverable);
      setFormDeadlineHours(catCfg.levels[1].defaultSlaHours);
    }
  };

  useEffect(() => {
    const firstLevel = activeCategoryConfig.levels[0];
    if (firstLevel && !activeCategoryConfig.levels.some(l => l.id === formLevelId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormLevelId(firstLevel.id);
      setFormDeliverable(firstLevel.expectedDeliverable);
      setFormDeadlineHours(firstLevel.defaultSlaHours);
    }
  }, [activeCategoryConfig, formLevelId]);

  const handleSelectFormLevel = (lvl: TaskDifficultyLevelConfig) => {
    setFormLevelId(lvl.id);
    setFormDeliverable(lvl.expectedDeliverable);
    setFormDeadlineHours(lvl.defaultSlaHours);
  };

  // Auto-suggest Research Level (Bảng 2b) based on scope parameters
  const handleAutoSuggestResearchLevel = (
    platforms: number,
    lines: number,
    withContentBooking: boolean,
    withBrandStrat: boolean
  ) => {
    setFormPlatformsCount(platforms);
    setFormProductLinesCount(lines);
    setFormIncludeContentBookingPlan(withContentBooking);
    setFormIncludeBrandStrategy(withBrandStrat);

    if (formCategory !== 'RESEARCH') return;
    const researchLevels = activeCategoryConfig.levels;
    let targetIdx = 0;
    if (platforms >= 3 && lines >= 2) {
      targetIdx = 4; // Level 5 – Định vị tổng thể (1,60)
    } else if (withBrandStrat) {
      targetIdx = 3; // Level 4 – Chiến lược thương hiệu (1,40)
    } else if (withContentBooking) {
      targetIdx = 2; // Level 3 – Nâng cao (1,20)
    } else if ((platforms === 1 && lines >= 2) || (platforms === 2 && lines === 1)) {
      targetIdx = 1; // Level 2 – Tiêu chuẩn (1,00)
    } else {
      targetIdx = 0; // Level 1 – Cơ bản (0,80)
    }
    const matched = researchLevels[Math.min(targetIdx, researchLevels.length - 1)];
    if (matched) {
      handleSelectFormLevel(matched);
    }
  };

  const brandStores = useMemo(() => {
    return storePortfolios.filter(
      s => s.brandName.toLowerCase() === formBrand.toLowerCase()
    );
  }, [storePortfolios, formBrand]);

  const totalContributionWeight = useMemo(() => {
    return assignees.reduce((sum, a) => sum + (Number(a.weightPct) || 0), 0);
  }, [assignees]);

  const isWeightValid = Math.abs(totalContributionWeight - 100) < 0.01;

  // Exact formula calculation for the modal
  const modalFormulaPreview = useMemo(() => {
    const qty = Math.max(1, Number(formAcceptedQty) || 1);
    const stdPoint = selectedSowPolicy?.basePoint || 1.0;
    const scopeCoef = activeLevelConfig?.multiplier || 1.0; // Bảng 2 / 2b
    const taskDiffCoef = DIFFICULTY_TIER_BADGE[formTaskDiffTier].coef; // Bảng 3: 0.80 / 1.00 / 1.20
    const timelineCoef = TIMELINE_TABLE_5.find(t => t.status === formTimelineStatus)?.coef ?? 1.0; // Bảng 5
    const multiPlatformCoef = selectedSowPolicy?.supportsMultiPlatform
      ? MULTI_PLATFORM_TABLE_6.find(m => m.stores === Math.min(4, Math.max(1, formMultiStoreCount)))?.coef ?? 1.0
      : 1.0; // Bảng 6
    const totalCasePoints = Number(
      (qty * stdPoint * scopeCoef * taskDiffCoef * timelineCoef * multiPlatformCoef).toFixed(2)
    );
    return {
      qty,
      stdPoint,
      scopeCoef,
      taskDiffCoef,
      timelineCoef,
      multiPlatformCoef,
      totalCasePoints,
    };
  }, [
    formAcceptedQty,
    selectedSowPolicy,
    activeLevelConfig,
    formTaskDiffTier,
    formTimelineStatus,
    formMultiStoreCount,
  ]);

  const applySplitPreset = (presetId: string) => {
    const preset = ROLE_SPLIT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const defaultStaffNames = [
      'Nguyễn Thị Ngọc Tâm',
      'Lê Phương Thảo',
      'Lương Thị Như Quỳnh',
      'Bùi Ngọc Ánh',
      'Phạm Thị Thu Hằng',
    ];
    setAssignees(
      preset.slots.map((slot, idx) => ({
        staffName:
          assignees[idx]?.staffName ||
          defaultStaffNames[idx % defaultStaffNames.length],
        role: slot.role,
        weightPct: slot.weightPct,
      }))
    );
  };

  const handleSubmitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      onNotify?.('Vui lòng nhập tiêu đề công việc cần giao!', 'warning');
      return;
    }
    if (!isWeightValid) {
      onNotify?.(
        `Tổng tỷ trọng đóng góp của các nhân sự trong cùng task phải bằng 100% (hiện tại: ${totalContributionWeight}%).`,
        'warning'
      );
      return;
    }
    if (selectedSowPolicy.requiresOriginalAsset && !formOriginalAssetRef.trim()) {
      onNotify?.('Theo Bảng 7: Đầu việc Reup/Adapt bắt buộc phải ghi Mã Asset gốc / Link video gốc!', 'warning');
      return;
    }
    if (
      formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier &&
      !formDiffOverrideReason.trim()
    ) {
      onNotify?.(
        'Theo Bảng 7: Khi chọn Độ khó từng lần làm (Bảng 3) khác mức mặc định của Bảng 1, bắt buộc phải ghi Lý do đổi độ khó!',
        'warning'
      );
      return;
    }

    const groupId = `grp-task-${Date.now()}`;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    assignees.forEach((slot, idx) => {
      const staffObj = allAssignableStaff.find(s => s.name === slot.staffName);
      const personalWorkload = Number(
        (modalFormulaPreview.totalCasePoints * (slot.weightPct / 100)).toFixed(2)
      );

      const newTask: SlaTask = {
        id: `task-del-${Date.now()}-${idx}`,
        title:
          assignees.length > 1 && idx > 0
            ? `${formTitle.trim()} (${ROLE_LABEL_MAP[slot.role]})`
            : formTitle.trim(),
        description:
          formDescription.trim() ||
          `${formTaskSource === 'DIRECTOR_ASSIGNED' ? 'Task GĐ / Quản lý giao' : 'Task Luồng Quy Trình'} · ${selectedSowPolicy.group}: ${selectedSowPolicy.name}`,
        type: formCategory === 'RESEARCH' ? 'RESEARCH_TASK' : 'GENERAL_TASK',
        taskSource: formTaskSource,
        workflowStageLabel:
          formTaskSource === 'WORKFLOW_SYSTEM'
            ? `Luồng ${selectedSowPolicy.group} · Nghiệm thu đầu ra`
            : undefined,
        sowStt: selectedSowPolicy.stt,
        sowGroup: selectedSowPolicy.group,
        sowName: selectedSowPolicy.name,
        acceptedQuantity: modalFormulaPreview.qty,
        standardPoint: modalFormulaPreview.stdPoint,
        scopeCoef: modalFormulaPreview.scopeCoef,
        taskDifficultyTier: formTaskDiffTier,
        taskDifficultyCoef: modalFormulaPreview.taskDiffCoef,
        timelineStatus: formTimelineStatus,
        timelineCoef: modalFormulaPreview.timelineCoef,
        multiPlatformCoef: modalFormulaPreview.multiPlatformCoef,
        platformScope: formPlatformScope.trim() || 'TikTok',
        channelPlatform: formChannelPlatform.trim() || 'TikTok',
        originalAssetRef: formOriginalAssetRef.trim() || undefined,
        kocStatusType: selectedSowPolicy.requiresKocStatus ? formKocStatusType : undefined,
        difficultyOverrideReason: formDiffOverrideReason.trim() || undefined,
        taskCategory: formCategory,
        difficultyLevelId: activeLevelConfig?.id,
        difficultyLabel: activeLevelConfig?.levelCode,
        difficultyMultiplier: modalFormulaPreview.scopeCoef,
        scopeDescription: activeLevelConfig?.scopeDescription,
        expectedDeliverable:
          formDeliverable.trim() || activeLevelConfig?.expectedDeliverable,
        assignmentRole: slot.role,
        contributionWeightPct: slot.weightPct,
        baseWorkloadPoints: Number((modalFormulaPreview.qty * modalFormulaPreview.stdPoint).toFixed(2)),
        calculatedWorkloadPoints: personalWorkload,
        platformsCount: formCategory === 'RESEARCH' ? formPlatformsCount : formMultiStoreCount,
        productLinesCount: formCategory === 'RESEARCH' ? formProductLinesCount : undefined,
        brand: formBrand,
        storeName: formStore || undefined,
        team: staffObj?.team || 'Marketing B2C',
        pic: slot.staffName,
        targetRole: staffObj?.sysRole || 'MEMBER',
        deadline: `Trong vòng ${formDeadlineHours}h`,
        remainingText: `Còn ${formDeadlineHours} giờ`,
        deadlineHours: formDeadlineHours,
        urgency: formUrgency,
        assignedBy: currentUser.name,
        createdAt: nowStr,
        groupAssignmentId: groupId,
        actionLabel:
          formCategory === 'RESEARCH' ? 'Nộp kết quả Research' : 'Nghiệm thu đầu ra',
      };

      onAddTask(newTask);
    });

    onNotify?.(
      `Đã ghi nhận "${formTitle.trim()}" (${modalFormulaPreview.totalCasePoints} pts) cho ${assignees.map(a => `${a.staffName} (${a.weightPct}%)`).join(', ')}`,
      'success'
    );
    setFormTitle('');
    setFormDescription('');
    setFormOriginalAssetRef('');
    setFormDiffOverrideReason('');
    setIsAssignModalOpen(false);
  };

  // Helper to infer taskSource for legacy tasks in mockData
  const getTaskSource = (t: SlaTask): 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED' => {
    if (t.taskSource) return t.taskSource;
    if (t.type === 'RESEARCH_TASK' || t.taskCategory === 'RESEARCH' || t.assignedBy === 'Đặng Thị Yến Nhi') {
      return 'DIRECTOR_ASSIGNED';
    }
    return 'WORKFLOW_SYSTEM';
  };

  // Filtered tasks for Tab 1 table
  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter(t => {
      const tSource = getTaskSource(t);
      if (sourceFilter !== 'ALL' && tSource !== sourceFilter) return false;

      if (categoryFilter !== 'ALL') {
        const inferredCat: TaskDifficultyCategoryKey =
          t.taskCategory ||
          (t.type === 'RESEARCH_TASK'
            ? 'RESEARCH'
            : t.type === 'SCRIPT_REVIEW'
            ? 'CONTENT'
            : t.type === 'CAMPAIGN_BRIEF'
            ? 'CAMPAIGN'
            : 'BOOKING');
        if (inferredCat !== categoryFilter) return false;
      }
      if (roleFilter !== 'ALL' && t.assignmentRole !== roleFilter) {
        return false;
      }
      if (staffFilter !== 'ALL' && t.pic !== staffFilter) {
        return false;
      }
      if (urgencyFilter === 'OPEN' && t.urgency === 'done') return false;
      if (urgencyFilter === 'CRITICAL' && t.urgency !== 'critical') return false;
      if (urgencyFilter === 'DONE' && t.urgency !== 'done') return false;

      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchPic = t.pic.toLowerCase().includes(q);
        const matchBrand = (t.brand || '').toLowerCase().includes(q);
        const matchSow = (t.sowName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchPic && !matchBrand && !matchSow) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, sourceFilter, categoryFilter, roleFilter, staffFilter, urgencyFilter, searchQuery]);

  // ==========================================================================
  // ĐO LƯỜNG WORKLOAD 28 NHÂN SỰ (KẾT HỢP DỮ LIỆU THÁNG + LIVE TASKS TRÊN HỆ THỐNG)
  // ==========================================================================
  const computedStaffWorkloads = useMemo(() => {
    return B2C_28_STAFF_WORKLOAD_ROSTER.map(member => {
      // Find all live tasks assigned to this staff member
      const staffTasks = tasks.filter(
        t =>
          t.pic.toLowerCase() === member.name.toLowerCase() ||
          (member.name === 'Lê Phương Thảo' && t.pic === 'Lê Phương Thảo')
      );

      let liveWorkflowPts = 0;
      let liveWorkflowHardPts = 0;
      let liveDirectorPts = 0;
      let liveDirectorHardPts = 0;

      staffTasks.forEach(t => {
        const pts = t.calculatedWorkloadPoints ?? 2.0;
        const isHard =
          t.taskDifficultyTier === 'HARD' ||
          (t.difficultyMultiplier && t.difficultyMultiplier >= 1.2) ||
          t.urgency === 'critical';
        const src = getTaskSource(t);
        if (src === 'DIRECTOR_ASSIGNED') {
          liveDirectorPts += pts;
          if (isHard) liveDirectorHardPts += pts;
        } else {
          liveWorkflowPts += pts;
          if (isHard) liveWorkflowHardPts += pts;
        }
      });

      const workflowPts = Number((member.baselineWorkflowTotalPts + liveWorkflowPts).toFixed(2));
      const directorPts = Number((member.baselineDirectorTotalPts + liveDirectorPts).toFixed(2));
      const rawTotalPts = Number((workflowPts + directorPts).toFixed(2));
      const hardPts = Number(
        (member.baselineWorkflowHardPts + member.baselineDirectorHardPts + liveWorkflowHardPts + liveDirectorHardPts).toFixed(2)
      );

      const levelRule =
        STAFF_LEVEL_TABLE_4.find(l => l.level === member.level) || STAFF_LEVEL_TABLE_4[3];
      const actualHardRatioPct = rawTotalPts > 0 ? Number(((hardPts / rawTotalPts) * 100).toFixed(1)) : 0;
      const meetsHardRatio = actualHardRatioPct >= levelRule.minHardRatioPct;
      const hasException = !!managerExceptions[member.staffCode];
      const structureCoef = meetsHardRatio || hasException ? 1.0 : 0.7;
      const finalMonthlyWorkloadPts = Number((rawTotalPts * structureCoef).toFixed(2));

      return {
        ...member,
        staffTasks,
        workflowPts,
        directorPts,
        rawTotalPts,
        hardPts,
        requiredHardRatioPct: levelRule.minHardRatioPct,
        actualHardRatioPct,
        meetsHardRatio,
        hasException,
        structureCoef,
        finalMonthlyWorkloadPts,
      };
    });
  }, [tasks, managerExceptions]);

  const filteredStaffWorkloads = useMemo(() => {
    const q = workloadSearch.trim().toLowerCase();
    return computedStaffWorkloads.filter(row => {
      if (workloadLevelFilter !== 'ALL' && row.level !== workloadLevelFilter) return false;
      if (workloadStatusFilter === 'PASS' && !row.meetsHardRatio) return false;
      if (workloadStatusFilter === 'FAIL_07' && (row.meetsHardRatio || row.hasException)) return false;
      if (workloadStatusFilter === 'EXCEPTION' && !row.hasException) return false;
      if (q) {
        const matchName = row.name.toLowerCase().includes(q);
        const matchCode = row.staffCode.toLowerCase().includes(q);
        const matchRole = row.roleGroup.toLowerCase().includes(q);
        const matchStores = row.keyStoresSample.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole && !matchStores) return false;
      }
      return true;
    });
  }, [computedStaffWorkloads, workloadLevelFilter, workloadStatusFilter, workloadSearch]);

  // Summary metrics
  const metrics = useMemo(() => {
    const workflowTasksCount = tasks.filter(t => getTaskSource(t) === 'WORKFLOW_SYSTEM').length;
    const directorTasksCount = tasks.filter(t => getTaskSource(t) === 'DIRECTOR_ASSIGNED').length;
    const totalStaffFinalPts = computedStaffWorkloads.reduce(
      (s, r) => s + r.finalMonthlyWorkloadPts,
      0
    );
    const passCount = computedStaffWorkloads.filter(r => r.structureCoef === 1.0).length;
    return {
      totalCount: tasks.length,
      workflowTasksCount,
      directorTasksCount,
      totalStaffFinalPts: Number(totalStaffFinalPts.toFixed(1)),
      passCount,
      totalStaffCount: computedStaffWorkloads.length,
    };
  }, [tasks, computedStaffWorkloads]);

  // Setup Category Currently Selected
  const currentSetupCategoryObj = useMemo(() => {
    return (
      difficultyConfigs.find(c => c.categoryKey === selectedSetupCategory) ||
      difficultyConfigs[0]
    );
  }, [difficultyConfigs, selectedSetupCategory]);

  const handleSaveEditedSow = () => {
    if (!editSowDraft || editingSowStt === null) return;
    const next = sowPolicies.map(item =>
      item.stt === editingSowStt ? { ...editSowDraft } : item
    );
    saveSowPolicies(next);
    setEditingSowStt(null);
    setEditSowDraft(null);
    onNotify?.(
      `Đã cập nhật Bảng 1 — STT #${editSowDraft.stt} "${editSowDraft.name}" (${editSowDraft.basePoint.toFixed(1).replace('.', ',')} điểm)`,
      'success'
    );
  };

  const handleSaveEditedLevel = () => {
    if (!editLevelDraft || !editingLevelId) return;
    const next = difficultyConfigs.map(cat => {
      if (cat.categoryKey !== selectedSetupCategory) return cat;
      return {
        ...cat,
        levels: cat.levels.map(l =>
          l.id === editingLevelId ? { ...editLevelDraft } : l
        ),
      };
    });
    saveDifficultyConfigs(next);
    setEditingLevelId(null);
    setEditLevelDraft(null);
    onNotify?.(
      `Đã cập nhật cấu hình độ khó "${editLevelDraft.levelCode}" (hệ số ${editLevelDraft.multiplier.toFixed(2).replace('.', ',')})`,
      'success'
    );
  };

  const handleAddLevelToCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelDraft.levelCode.trim()) {
      onNotify?.('Vui lòng nhập tên cấp độ!', 'warning');
      return;
    }
    const createdLevel: TaskDifficultyLevelConfig = {
      id: `${selectedSetupCategory}-L${Date.now().toString().slice(-4)}`,
      levelCode: newLevelDraft.levelCode.trim(),
      multiplier: Number(newLevelDraft.multiplier) || 1.0,
      scopeDescription: newLevelDraft.scopeDescription.trim() || 'Phạm vi tùy chỉnh',
      expectedDeliverable: newLevelDraft.expectedDeliverable.trim() || 'Báo cáo / File nghiệm thu',
      defaultSlaHours: Number(newLevelDraft.defaultSlaHours) || 48,
    };
    const next = difficultyConfigs.map(cat => {
      if (cat.categoryKey !== selectedSetupCategory) return cat;
      return {
        ...cat,
        levels: [...cat.levels, createdLevel],
      };
    });
    saveDifficultyConfigs(next);
    setIsAddingNewLevel(false);
    setNewLevelDraft({
      levelCode: '',
      multiplier: 1.0,
      scopeDescription: '',
      expectedDeliverable: '',
      defaultSlaHours: 48,
    });
    onNotify?.(`Đã thêm cấp độ "${createdLevel.levelCode}" vào ${currentSetupCategoryObj.categoryName}`, 'success');
  };

  const handleDeleteLevel = (levelId: string) => {
    if (currentSetupCategoryObj.levels.length <= 1) {
      onNotify?.('Mỗi nhóm công việc cần giữ tối thiểu 1 cấp độ độ khó!', 'warning');
      return;
    }
    const next = difficultyConfigs.map(cat => {
      if (cat.categoryKey !== selectedSetupCategory) return cat;
      return {
        ...cat,
        levels: cat.levels.filter(l => l.id !== levelId),
      };
    });
    saveDifficultyConfigs(next);
    onNotify?.('Đã xóa cấp độ độ khó khỏi bảng cấu hình', 'info');
  };

  const handleResetDefaultConfigs = () => {
    saveDifficultyConfigs(DEFAULT_TASK_DIFFICULTY_CONFIGS);
    saveSowPolicies(DEFAULT_SOW_POINT_POLICIES);
    setEditingLevelId(null);
    setEditLevelDraft(null);
    setEditingSowStt(null);
    setEditSowDraft(null);
    onNotify?.('Đã khôi phục toàn bộ Bảng 1 (33 loại công việc) & Bảng 2b về chuẩn gốc!', 'info');
  };

  const inspectedStaffRow = useMemo(() => {
    if (!inspectingStaffMember) return null;
    return computedStaffWorkloads.find(r => r.name === inspectingStaffMember) || null;
  }, [inspectingStaffMember, computedStaffWorkloads]);

  return (
    <div className="space-y-6">
      {/* Header Banner & 3-Tab Switcher */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-soft border border-accent/20 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-ink">
                Giao việc &amp; Đo lường Workload Nhân sự B2C
              </h2>
              <span className="text-2xs font-semibold text-accent -accent/20">
                Bảng 1 → Bảng 7 · 33 Đầu việc SOW &amp; 28 Nhân sự
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-0.5">
              Tổng hợp đồng thời <strong>Task thuộc luồng quy trình hệ thống</strong> (Booking, Content kênh, Livestream, KV/SIS, Plan tháng) và <strong>Task Giám đốc giao</strong> (Nghiên cứu gian hàng mới, Chiến lược campaign) để tính điểm Workload cá nhân cuối kỳ.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex p-1 rounded-lg bg-canvas border border-line flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('ASSIGNMENTS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeSubTab === 'ASSIGNMENTS'
                  ? 'bg-surface text-ink shadow-2xs border border-line'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-accent" />
              <span>1. Nhật ký Task: Quy trình &amp; GĐ giao ({tasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('WORKLOAD_MEASUREMENT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeSubTab === 'WORKLOAD_MEASUREMENT'
                  ? 'bg-surface text-ink shadow-2xs border border-line'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-positive" />
              <span>2. Đo lường Workload Nhân sự (28 NS)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('DIFFICULTY_SETUP')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                activeSubTab === 'DIFFICULTY_SETUP'
                  ? 'bg-surface text-ink shadow-2xs border border-line'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>3. Setup Độ khó &amp; Bảng 1–7 (33 SOW)</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setFormTaskSource('DIRECTOR_ASSIGNED');
              setIsAssignModalOpen(true);
            }}
          >
            Giao việc / Ghi nhận Task
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <StatRow>
        <Stat
          label="Task Luồng Quy Trình Hệ Thống"
          value={metrics.workflowTasksCount}
          note="Tự động từ Booking, Content, Live, KV/SIS"
        />
        <Stat
          label="Task Giám Đốc / Quản Lý Giao"
          value={metrics.directorTasksCount}
          tone="positive"
          note="Research gian hàng mới, Chiến lược Campaign, JBP"
        />
        <Stat
          label="Nhân sự đạt chuẩn Việc Khó (Bảng 4)"
          value={`${metrics.passCount}/${metrics.totalStaffCount}`}
          tone="positive"
          note="Đạt tỷ lệ việc Khó theo Level L0.5 → L3 (HS x1,00)"
        />
        <Stat
          label="Tổng điểm Workload toàn khối"
          value={`${metrics.totalStaffFinalPts} pts`}
          tone="positive"
          note="Đã nhân HS phạm vi, Độ khó, Đa sàn & Cơ cấu Bảng 4"
        />
      </StatRow>

      {/* ===================================================================== */}
      {/* TAB 1: NHẬT KÝ TASK (LUỒNG QUY TRÌNH HỆ THỐNG & TASK GIÁM ĐỐC GIAO)    */}
      {/* ===================================================================== */}
      {activeSubTab === 'ASSIGNMENTS' && (
        <div className="space-y-4">
          {/* Two Task Sources Explanation + Quick Action Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div
              onClick={() =>
                setSourceFilter(prev =>
                  prev === 'WORKFLOW_SYSTEM' ? 'ALL' : 'WORKFLOW_SYSTEM'
                )
              }
              className={`cursor-pointer p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                sourceFilter === 'WORKFLOW_SYSTEM'
                  ? 'bg-accent-soft border-accent/20 shadow-2xs'
                  : 'bg-surface border-line hover:border-accent/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">
                      Nguồn 1: Task thuộc Luồng Quy Trình Hệ Thống
                    </span>
                    <span className="text-2xs font-mono font-semibold text-accent">
                      {metrics.workflowTasksCount} task
                    </span>
                  </div>
                  <p className="text-2xs text-ink-2 mt-1">
                    Phát sinh từ quy trình vận hành chuẩn: <strong>Booking KOC (KL1–KL7, Reup)</strong>, <strong>Content Kênh (Voice/AI, POV/Remix)</strong>, <strong>Livestream (Độc quyền/Mix/Daily)</strong>, <strong>Key Visual &amp; SIS</strong>, <strong>Plan tháng</strong>.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  const bkSow = sowPolicies.find(s => s.stt === 2) || sowPolicies[0];
                  handleSelectSowPolicy(bkSow);
                  setFormTaskSource('WORKFLOW_SYSTEM');
                  setIsAssignModalOpen(true);
                }}
              >
                + Ghi nhận từ Quy trình
              </Button>
            </div>

            <div
              onClick={() =>
                setSourceFilter(prev =>
                  prev === 'DIRECTOR_ASSIGNED' ? 'ALL' : 'DIRECTOR_ASSIGNED'
                )
              }
              className={`cursor-pointer p-4 rounded-xl border transition flex items-start justify-between gap-3 ${
                sourceFilter === 'DIRECTOR_ASSIGNED'
                  ? 'bg-accent-soft border-accent/20 shadow-2xs'
                  : 'bg-surface border-line hover:border-accent/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">
                      Nguồn 2: Task Giám Đốc / Quản Lý Giao Trực Tiếp
                    </span>
                    <span className="text-2xs font-mono font-semibold text-accent">
                      {metrics.directorTasksCount} task
                    </span>
                  </div>
                  <p className="text-2xs text-ink-2 mt-1">
                    Các đề bài chiến lược do Giám Đốc Marketing / Leader giao: <strong>Nghiên cứu gian hàng mới (&lt;15 tỷ đến &gt;100 tỷ)</strong>, <strong>Nghiên cứu &amp; lập kế hoạch Campaign</strong>, <strong>Xây mới Brand Guideline</strong>, <strong>JBP Năm / Quý</strong>.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  const resSow = sowPolicies.find(s => s.stt === 26) || sowPolicies[0];
                  handleSelectSowPolicy(resSow);
                  setFormTaskSource('DIRECTOR_ASSIGNED');
                  setIsAssignModalOpen(true);
                }}
              >
                + GĐ Giao việc mới
              </Button>
            </div>
          </div>

          {/* Quick Reference Card for Bảng 2b Research */}
          <div className="bg-surface border border-line rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>Tra cứu nhanh: {difficultyConfigs[0].tableTitle}</span>
                </h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Nhấn vào một cấp độ bên dưới để giao nhanh đầu việc Nghiên cứu (STT 24–30 Bảng 1) theo đúng hệ số Bảng 2b
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('WORKLOAD_MEASUREMENT')}
                  className="text-2xs font-semibold text-positive hover:text-positive inline-flex items-center gap-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Xem Bảng đo lường Workload 28 nhân sự</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSetupCategory('RESEARCH');
                    setSetupSection('TABLE_2B_LEVELS');
                    setActiveSubTab('DIFFICULTY_SETUP');
                  }}
                  className="text-2xs font-semibold text-accent hover:text-accent inline-flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Chỉnh sửa hệ số &amp; Bảng 1</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {(difficultyConfigs.find(c => c.categoryKey === 'RESEARCH')?.levels || []).map(lvl => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    const resSow = sowPolicies.find(s => s.stt === 26) || sowPolicies[0];
                    handleSelectSowPolicy(resSow);
                    setFormCategory('RESEARCH');
                    setFormTaskSource('DIRECTOR_ASSIGNED');
                    handleSelectFormLevel(lvl);
                    setIsAssignModalOpen(true);
                  }}
                  className="text-left p-3 rounded-xl border border-line bg-canvas hover:bg-accent-soft hover:border-accent/20 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink group-hover:text-accent">
                        {lvl.levelCode}
                      </span>
                      <span className="font-mono text-xs font-semibold text-accent">
                        {lvl.multiplier.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <p className="text-2xs text-ink-2 mt-1.5 line-clamp-2">
                      {lvl.scopeDescription}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-2xs text-ink-3">
                    <span className="truncate">Đầu ra: {lvl.expectedDeliverable || 'Chưa cấu hình'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-surface border border-line rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSourceFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  sourceFilter === 'ALL'
                    ? 'bg-ink text-white border-ink font-semibold'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Mọi nguồn ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('WORKFLOW_SYSTEM')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  sourceFilter === 'WORKFLOW_SYSTEM'
                    ? 'bg-accent text-white border-accent/20 font-semibold'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Luồng quy trình ({metrics.workflowTasksCount})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('DIRECTOR_ASSIGNED')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  sourceFilter === 'DIRECTOR_ASSIGNED'
                    ? 'bg-accent text-white border-accent/20 font-semibold'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Task GĐ giao ({metrics.directorTasksCount})
              </button>

              <span className="text-line mx-1">|</span>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as 'ALL' | TaskDifficultyCategoryKey)}
                className="px-2.5 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
              >
                <option value="ALL">Tất cả nhóm SOW (Bảng 1)</option>
                {difficultyConfigs.map(cat => (
                  <option key={cat.categoryKey} value={cat.categoryKey}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm task, nhân viên, SOW..."
                  className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/20"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as 'ALL' | TaskAssignmentRoleKey)}
                className="px-2.5 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
              >
                <option value="ALL">Mọi vai trò (PIC/Co-PIC/Exec)</option>
                <option value="PIC_OWNER">PIC / Owner (50–100%)</option>
                <option value="CO_PIC">Co-PIC (25–40%)</option>
                <option value="EXECUTION">Execution (15–30%)</option>
                <option value="SUPPORT">Support (5–15%)</option>
              </select>

              <select
                value={staffFilter}
                onChange={e => setStaffFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
              >
                <option value="ALL">Tất cả nhân viên</option>
                {Array.from(new Set(tasks.map(t => t.pic))).map(picName => (
                  <option key={picName} value={picName}>
                    {picName}
                  </option>
                ))}
              </select>

              <select
                value={urgencyFilter}
                onChange={e => setUrgencyFilter(e.target.value as 'ALL' | 'OPEN' | 'CRITICAL' | 'DONE')}
                className="px-2.5 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
              >
                <option value="ALL">Mọi trạng thái SLA</option>
                <option value="OPEN">Đang thực hiện</option>
                <option value="CRITICAL">Khẩn cấp (Critical)</option>
                <option value="DONE">Đã hoàn thành</option>
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-2">
                    <th className="py-3 px-4 min-w-[270px]">Đầu việc &amp; Nguồn phát sinh</th>
                    <th className="py-3 px-3 min-w-[180px]">Loại SOW (Bảng 1) &amp; Hệ số</th>
                    <th className="py-3 px-3 min-w-[150px]">Sàn / Store &amp; Bảng 7</th>
                    <th className="py-3 px-3 min-w-[155px]">Nhân sự &amp; Vai trò</th>
                    <th className="py-3 px-3 text-center min-w-[150px]">Công thức Điểm Workload</th>
                    <th className="py-3 px-3 min-w-[165px]">Đầu ra (Deliverable)</th>
                    <th className="py-3 px-3 text-center min-w-[105px]">Timeline (Bảng 5)</th>
                    <th className="py-3 px-3 text-right min-w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-ink-3">
                        Không có công việc nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(task => {
                      const tSource = getTaskSource(task);
                      const catKey: TaskDifficultyCategoryKey =
                        task.taskCategory ||
                        (task.type === 'RESEARCH_TASK'
                          ? 'RESEARCH'
                          : task.type === 'SCRIPT_REVIEW'
                          ? 'CONTENT'
                          : task.type === 'CAMPAIGN_BRIEF'
                          ? 'CAMPAIGN'
                          : 'BOOKING');
                      const catConfig = difficultyConfigs.find(
                        c => c.categoryKey === catKey
                      );

                      const qty = task.acceptedQuantity ?? 1;
                      const stdPt = task.standardPoint ?? task.baseWorkloadPoints ?? 1.0;
                      const scopeC = task.scopeCoef ?? task.difficultyMultiplier ?? 1.0;
                      const diffC = task.taskDifficultyCoef ?? 1.0;
                      const timeC = task.timelineCoef ?? 1.0;
                      const multiC = task.multiPlatformCoef ?? 1.0;
                      const weightPct = task.contributionWeightPct ?? 100;

                      return (
                        <tr
                          key={task.id}
                          className={`hover:bg-canvas transition ${
                            task.urgency === 'done' ? 'opacity-75 bg-canvas/40' : ''
                          }`}
                        >
                          {/* 1. Title, Source & Description */}
                          <td className="py-3 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => onCompleteTask(task.id)}
                                title="Đánh dấu hoàn thành"
                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                  task.urgency === 'done'
                                    ? 'bg-positive border-positive text-white'
                                    : 'border-line-strong hover:border-accent/20 bg-surface'
                                }`}
                              >
                                {task.urgency === 'done' && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  {tSource === 'DIRECTOR_ASSIGNED' ? (
                                    <span className="text-2xs font-semibold text-accent -accent/20">
                                      Task GĐ giao ({task.assignedBy || 'Đặng Thị Yến Nhi'})
                                    </span>
                                  ) : (
                                    <span className="text-2xs font-semibold text-accent -accent/20">
                                      Luồng quy trình hệ thống
                                    </span>
                                  )}
                                  {task.workflowStageLabel && (
                                    <span className="text-2xs text-ink-3 truncate">
                                      {task.workflowStageLabel}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`font-semibold text-xs ${
                                    task.urgency === 'done'
                                      ? 'line-through text-ink-3'
                                      : 'text-ink'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                {task.description && (
                                  <p className="text-2xs text-ink-3 mt-0.5 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. SOW (Bảng 1) & Difficulty (Bảng 2/2b & Bảng 3) */}
                          <td className="py-3 px-3 align-top">
                            <span
                              className={`inline-flex text-2xs font-semibold border ${CATEGORY_BADGE_STYLE[catKey]}`}
                            >
                              {task.sowGroup || catConfig?.categoryName || catKey}
                            </span>
                            <div className="mt-1 font-semibold text-ink text-xs">
                              {task.sowStt ? `#${task.sowStt} · ` : ''}
                              {task.sowName || task.difficultyLabel || 'Đầu việc vận hành'}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span className="font-mono text-2xs text-ink -line">
                                HS phạm vi: x{scopeC.toFixed(2).replace('.', ',')}
                              </span>
                              {task.taskDifficultyTier && (
                                <span
                                  className={`text-2xs font-semibold border ${
                                    DIFFICULTY_TIER_BADGE[task.taskDifficultyTier].cls
                                  }`}
                                >
                                  {DIFFICULTY_TIER_BADGE[task.taskDifficultyTier].label}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Brand / Store & Bảng 7 Mandatory Tracking */}
                          <td className="py-3 px-3 align-top">
                            <div className="font-semibold text-ink">
                              {task.brand || 'UpBase B2C'}
                            </div>
                            {task.storeName && (
                              <div className="text-2xs text-ink-2 mt-0.5 truncate max-w-[160px]">
                                {task.storeName}
                              </div>
                            )}
                            <div className="mt-1 space-y-0.5 text-2xs text-ink-3">
                              {task.platformScope && (
                                <div>Sàn: <strong>{task.platformScope}</strong></div>
                              )}
                              {task.kocStatusType && (
                                <div>
                                  KOC:{' '}
                                  <strong className="text-accent">
                                    {task.kocStatusType === 'NEW_KOC'
                                      ? 'KOC mới (Lần đầu)'
                                      : task.kocStatusType === 'REBOOK'
                                      ? 'Book lại'
                                      : 'HĐ nguyên tắc'}
                                  </strong>
                                </div>
                              )}
                              {task.originalAssetRef && (
                                <div className="text-warning font-mono">
                                  Asset gốc: {task.originalAssetRef}
                                </div>
                              )}
                              {task.difficultyOverrideReason && (
                                <div
                                  className="text-critical italic line-clamp-2"
                                  title={task.difficultyOverrideReason}
                                >
                                  Lý do độ khó: {task.difficultyOverrideReason}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Staff & Role */}
                          <td className="py-3 px-3 align-top">
                            <div className="flex items-center gap-2">
                              <Avatar name={task.pic} size={22} />
                              <div>
                                <div className="font-semibold text-ink text-xs">
                                  {task.pic}
                                </div>
                                <div className="text-2xs text-ink-3">{task.team}</div>
                              </div>
                            </div>
                            {task.assignmentRole && (
                              <div className="mt-1.5 flex items-center gap-1">
                                <span
                                  className={`text-2xs font-semibold border ${
                                    ROLE_BADGE_STYLE[task.assignmentRole]
                                  }`}
                                >
                                  {ROLE_LABEL_MAP[task.assignmentRole]}
                                </span>
                                <span className="font-mono text-2xs font-semibold text-ink-2">
                                  {weightPct}%
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 5. Calculated Workload Points & Exact Formula Breakdown */}
                          <td className="py-3 px-3 align-top text-center">
                            {typeof task.calculatedWorkloadPoints === 'number' ? (
                              <div>
                                <span className="font-mono text-sm font-semibold text-accent">
                                  {task.calculatedWorkloadPoints.toFixed(2)} pts
                                </span>
                                <span className="text-2xs text-ink-3 block font-mono mt-0.5">
                                  SL:{qty} × {stdPt}đ × phạm vi {scopeC.toFixed(2)} × việc {diffC.toFixed(2)}
                                  {multiC > 1 ? ` × đa sàn ${multiC.toFixed(1)}` : ''}
                                  {weightPct < 100 ? ` × ${weightPct}%` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-ink-3">2.00 pts</span>
                            )}
                          </td>

                          {/* 6. Expected Deliverable & Link */}
                          <td className="py-3 px-3 align-top">
                            <div className="text-2xs text-ink-2 line-clamp-2">
                              {task.expectedDeliverable || 'Báo cáo nghiệm thu theo SLA'}
                            </div>
                            {task.deliverableUrl ? (
                              <a
                                href={task.deliverableUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold text-accent hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Xem file nghiệm thu</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDeliverableTask(task);
                                  setDeliverableInputUrl(task.deliverableUrl || '');
                                }}
                                className="mt-1 text-2xs font-medium text-ink-3 hover:text-accent underline"
                              >
                                + Đính kèm link đầu ra
                              </button>
                            )}
                          </td>

                          {/* 7. Timeline Status (Bảng 5) */}
                          <td className="py-3 px-3 align-top text-center">
                            <Status
                              tone={
                                task.urgency === 'critical'
                                  ? 'critical'
                                  : task.urgency === 'warning'
                                  ? 'warning'
                                  : task.urgency === 'done'
                                  ? 'positive'
                                  : 'neutral'
                              }
                            >
                              {task.remainingText}
                            </Status>
                            <div className="text-2xs font-mono text-ink-3 mt-1">
                              HS Timeline: x{timeC.toFixed(1).replace('.', ',')}
                            </div>
                          </td>

                          {/* 8. Actions */}
                          <td className="py-3 px-3 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              {task.urgency !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() => onCompleteTask(task.id)}
                                  className="px-2 py-1 rounded bg-positive-soft hover:bg-positive-soft text-positive border border-positive/20 text-2xs font-semibold transition"
                                >
                                  Nghiệm thu
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onPingStaff?.(task.pic, task.title);
                                  onNotify?.(
                                    `Đã gửi nhắc việc SLA cho ${task.pic}!`,
                                    'info'
                                  );
                                }}
                                className="px-2 py-1 rounded bg-canvas hover:bg-sunken text-ink-2 border border-line text-2xs font-medium transition"
                                title="Nhắc việc nhân viên"
                              >
                                Nhắc
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ĐO LƯỜNG WORKLOAD NHÂN SỰ (28 NHÂN SỰ · BẢNG 4 HS CƠ CẤU)      */}
      {/* ===================================================================== */}
      {activeSubTab === 'WORKLOAD_MEASUREMENT' && (
        <div className="space-y-5">
          {/* Formula Banner from Sheet 2 Excel */}
          <div className="bg-ink text-white rounded-xl p-4 border border-accent/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xs font-mono font-semibold bg-accent/30 text-accent -accent/20/30">
                  CÔNG THỨC CHUẨN (SHEET WORKLOAD)
                </span>
                <span className="text-xs font-semibold text-accent">
                  Tổng hợp tự động từ Task Luồng Quy Trình + Task Giám Đốc Giao
                </span>
              </div>
              <div className="font-mono text-xs sm:text-sm font-semibold text-warning">
                Điểm workload = SL nghiệm thu × Point chuẩn (Bảng 1) × HS phạm vi (Bảng 2/2b) × HS công việc (Bảng 3) × HS timeline (Bảng 5) × HS đa sàn (Bảng 6) × HS cơ cấu (Bảng 4)
              </div>
              <p className="text-2xs text-accent">
                <strong>Bảng 4 (Yêu cầu tỷ trọng công việc khó theo Level nhân sự):</strong> L0 (15%) · L0.5 (17,5%) · L1 (20%) · L1.5 (25%) · L2 (30%) · L2.5 (35%) · L3 (40%) · L4 (50%) · L5 (60%). Đạt chuẩn: <strong>×1,00</strong> | Không đạt: <strong>×0,70</strong> (Ngoại lệ: công ty không phân bổ đủ việc khó và được quản lý xác nhận thì giữ <strong>×1,00</strong>).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setFormTaskSource('DIRECTOR_ASSIGNED');
                  setIsAssignModalOpen(true);
                }}
              >
                Giao thêm việc cho nhân sự
              </Button>
            </div>
          </div>

          {/* Filter Bar for Staff Workload Table */}
          <div className="bg-surface border border-line rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'L3', 'L2.5', 'L2', 'L1.5', 'L1', 'L0.5'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setWorkloadLevelFilter(lvl)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    workloadLevelFilter === lvl
                      ? 'bg-accent text-white border-accent/20'
                      : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                  }`}
                >
                  {lvl === 'ALL' ? `Tất cả Level (${B2C_28_STAFF_WORKLOAD_ROSTER.length})` : `Level ${lvl}`}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={workloadSearch}
                  onChange={e => setWorkloadSearch(e.target.value)}
                  placeholder="Tìm tên nhân sự, mã HNxxx, store..."
                  className="w-full pl-8 pr-3 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent/20"
                />
              </div>

              <select
                value={workloadStatusFilter}
                onChange={e =>
                  setWorkloadStatusFilter(
                    e.target.value as 'ALL' | 'PASS' | 'FAIL_07' | 'EXCEPTION'
                  )
                }
                className="px-2.5 py-1.5 bg-canvas border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
              >
                <option value="ALL">Mọi trạng thái HS cơ cấu (Bảng 4)</option>
                <option value="PASS">Đạt chuẩn tỷ lệ việc Khó (×1,00)</option>
                <option value="FAIL_07">Chưa đạt chuẩn — Bị nhân ×0,70</option>
                <option value="EXCEPTION">Được Quản lý xác nhận ngoại lệ (×1,00)</option>
              </select>
            </div>
          </div>

          {/* 28 Staff Workload Measurement Table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-2">
                    <th className="py-3 px-4 min-w-[210px]">Nhân sự &amp; Mã NV (Sheet 4)</th>
                    <th className="py-3 px-3 text-center w-[95px]">Level &amp; Chuẩn Khó</th>
                    <th className="py-3 px-3 min-w-[180px]">Phạm vi Store phụ trách (T10)</th>
                    <th className="py-3 px-3 text-right w-[125px]">Điểm Luồng Quy Trình</th>
                    <th className="py-3 px-3 text-right w-[115px]">Điểm Task GĐ Giao</th>
                    <th className="py-3 px-3 text-right w-[120px]">Tổng điểm Trước Bảng 4</th>
                    <th className="py-3 px-3 min-w-[185px]">Tỷ lệ điểm Khó thực tế (Bảng 4)</th>
                    <th className="py-3 px-3 text-center w-[135px]">HS Cơ Cấu (Bảng 4)</th>
                    <th className="py-3 px-3 text-right w-[135px]">Tổng Workload Cuối Kỳ</th>
                    <th className="py-3 px-3 text-right w-[130px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredStaffWorkloads.map(row => {
                    const isShortHard = !row.meetsHardRatio;
                    return (
                      <tr key={row.staffCode} className="hover:bg-canvas/70 transition">
                        {/* 1. Staff Name & Code */}
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.name} size={26} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink text-xs">
                                  {row.name}
                                </span>
                                <span className=".5 py-0.2 font-mono text-2xs font-semibold text-ink-2 -line">
                                  {row.staffCode}
                                </span>
                              </div>
                              <div className="text-2xs text-ink-3 mt-0.5">
                                {row.roleGroup}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Level & Required Hard % */}
                        <td className="py-3 px-3 align-top text-center">
                          <span className="inline-flex font-mono text-xs font-semibold text-accent -accent/20">
                            {row.level}
                          </span>
                          <div className="text-2xs text-ink-3 mt-1 font-mono">
                            YC Khó ≥ {row.requiredHardRatioPct}%
                          </div>
                        </td>

                        {/* 3. Stores */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-semibold text-ink text-xs">
                            {row.assignedStoresCount} gian hàng B2C
                          </div>
                          <div className="text-2xs text-ink-3 line-clamp-1 mt-0.5" title={row.keyStoresSample}>
                            {row.keyStoresSample}
                          </div>
                        </td>

                        {/* 4. Workflow System Points */}
                        <td className="py-3 px-3 align-top text-right font-mono">
                          <div className="font-semibold text-accent">
                            {row.workflowPts.toFixed(2)}
                          </div>
                          <div className="text-2xs text-ink-3">Luồng hệ thống</div>
                        </td>

                        {/* 5. Director Assigned Points */}
                        <td className="py-3 px-3 align-top text-right font-mono">
                          <div className="font-semibold text-accent">
                            {row.directorPts.toFixed(2)}
                          </div>
                          <div className="text-2xs text-ink-3">Task GĐ giao</div>
                        </td>

                        {/* 6. Raw Total Points */}
                        <td className="py-3 px-3 align-top text-right font-mono">
                          <div className="font-semibold text-ink">
                            {row.rawTotalPts.toFixed(2)}
                          </div>
                          <div className="text-2xs text-critical">
                            Khó: {row.hardPts.toFixed(1)} pt
                          </div>
                        </td>

                        {/* 7. Hard Ratio Progress Bar vs Level Requirement */}
                        <td className="py-3 px-3 align-top">
                          <div className="flex items-center justify-between text-2xs mb-1">
                            <span
                              className={`font-mono font-semibold ${
                                row.meetsHardRatio ? 'text-positive' : 'text-warning'
                              }`}
                            >
                              Thực đạt: {row.actualHardRatioPct}%
                            </span>
                            <span className="text-ink-3 font-mono">
                              Chuẩn {row.level}: {row.requiredHardRatioPct}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-sunken overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.meetsHardRatio
                                  ? 'bg-positive'
                                  : row.hasException
                                  ? 'bg-accent'
                                  : 'bg-warning'
                              }`}
                              style={{
                                width: `${Math.min(100, (row.actualHardRatioPct / Math.max(1, row.requiredHardRatioPct)) * 100)}%`,
                              }}
                            />
                          </div>
                          {isShortHard && (
                            <div className="text-2xs text-warning mt-1">
                              Thiếu {(row.requiredHardRatioPct - row.actualHardRatioPct).toFixed(1)}% điểm việc Khó
                            </div>
                          )}
                        </td>

                        {/* 8. Bảng 4 Structure Coefficient */}
                        <td className="py-3 px-3 align-top text-center">
                          <Status tone={row.meetsHardRatio ? "positive" : row.hasException ? "warning" : "critical"}>{row.meetsHardRatio ? "×1,00 (Đạt)" : row.hasException ? "×1,00 (Ngoại lệ)" : "×0,70 (Hạ bậc)"}</Status>
                          {isShortHard && canManageSetup && (
                            <button
                              type="button"
                              onClick={() => toggleManagerException(row.staffCode, row.name)}
                              className="block mx-auto mt-1 text-2xs font-semibold text-accent hover:underline"
                            >
                              {row.hasException ? 'Gỡ ngoại lệ' : 'Duyệt ngoại lệ x1,00'}
                            </button>
                          )}
                        </td>

                        {/* 9. Final Monthly Workload Points */}
                        <td className="py-3 px-3 align-top text-right font-mono">
                          <div className="text-sm font-semibold text-positive">
                            {row.finalMonthlyWorkloadPts.toFixed(2)} pts
                          </div>
                          <div className="text-2xs text-ink-3">
                            {row.rawTotalPts.toFixed(1)} × {row.structureCoef.toFixed(2).replace('.', ',')}
                          </div>
                        </td>

                        {/* 10. Actions */}
                        <td className="py-3 px-3 align-top text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInspectingStaffMember(row.name)}
                              className="px-2 py-1 rounded bg-canvas hover:bg-sunken text-ink-2 border border-line text-2xs font-semibold inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Chi tiết</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssignees([
                                  { staffName: row.name, role: 'PIC_OWNER', weightPct: 100 },
                                ]);
                                setFormTaskDiffTier('HARD');
                                setFormTaskSource('DIRECTOR_ASSIGNED');
                                setIsAssignModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-accent-soft hover:bg-accent-soft text-accent border border-accent/20 text-2xs font-semibold"
                              title="Giao thêm việc cho nhân sự này"
                            >
                              + Giao việc
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drawer / Panel inspecting a specific staff member's tasks */}
          {inspectedStaffRow && (
            <div className="bg-surface border-2 border-accent/20 rounded-xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Hồ sơ đo lường Workload chi tiết: {inspectedStaffRow.name} ({inspectedStaffRow.staffCode} · Level {inspectedStaffRow.level})
                  </h3>
                  <p className="text-2xs text-ink-3">
                    Điểm Luồng quy trình: <strong>{inspectedStaffRow.workflowPts.toFixed(2)} pts</strong> · Điểm Task GĐ giao: <strong>{inspectedStaffRow.directorPts.toFixed(2)} pts</strong> · Tỷ lệ việc Khó: <strong>{inspectedStaffRow.actualHardRatioPct}%</strong> (Yêu cầu {inspectedStaffRow.level}: ≥{inspectedStaffRow.requiredHardRatioPct}%) → Tổng điểm sau nhân Bảng 4: <strong className="text-positive">{inspectedStaffRow.finalMonthlyWorkloadPts.toFixed(2)} pts</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingStaffMember(null)}
                  className="px-2.5 py-1 rounded-lg bg-canvas hover:bg-sunken text-xs font-semibold text-ink-2"
                >
                  Đóng
                </button>
              </div>

              {inspectedStaffRow.staffTasks.length === 0 ? (
                <div className="p-4 rounded-lg bg-canvas text-xs text-ink-3">
                  Hiện tại điểm của <strong>{inspectedStaffRow.name}</strong> được tổng hợp từ khối lượng vận hành gian hàng tháng 10 ({inspectedStaffRow.keyStoresSample}). Nhấn <strong>&ldquo;+ Giao việc&rdquo;</strong> để giao thêm Task cụ thể trên hệ thống.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {inspectedStaffRow.staffTasks.map(t => (
                    <div key={t.id} className="p-3 rounded-lg bg-canvas border border-line flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className=".5 py-0.2 text-2xs font-semibold text-accent -accent/20 mr-1.5">
                          {getTaskSource(t) === 'DIRECTOR_ASSIGNED' ? 'Task GĐ giao' : 'Luồng quy trình'}
                        </span>
                        <span className="font-semibold text-ink">{t.title}</span>
                        <div className="text-2xs text-ink-3 mt-1">
                          SOW: {t.sowName || t.taskCategory} · Vai trò: {t.assignmentRole ? ROLE_LABEL_MAP[t.assignmentRole] : 'PIC'} ({t.contributionWeightPct || 100}%)
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-accent shrink-0">
                        +{(t.calculatedWorkloadPoints || 2).toFixed(2)} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SETUP ĐỘ KHÓ & CHÍNH SÁCH POINT (BẢNG 1 → BẢNG 7)               */}
      {/* ===================================================================== */}
      {activeSubTab === 'DIFFICULTY_SETUP' && (
        <div className="space-y-6">
          {/* Sub-navigation for Bảng 1 vs Bảng 2b vs Bảng 2-7 */}
          <div className="bg-surface border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSetupSection('TABLE_1_SOW')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                  setupSection === 'TABLE_1_SOW'
                    ? 'bg-accent text-white border-accent/20'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Bảng 1. Chính sách Point 33 Đầu việc SOW
              </button>
              <button
                type="button"
                onClick={() => setSetupSection('TABLE_2B_LEVELS')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                  setupSection === 'TABLE_2B_LEVELS'
                    ? 'bg-accent text-white border-accent/20'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Bảng 2b &amp; 2a. Hệ số Cấp độ Research &amp; Nhóm việc
              </button>
              <button
                type="button"
                onClick={() => setSetupSection('TABLE_2_TO_7_RULES')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                  setupSection === 'TABLE_2_TO_7_RULES'
                    ? 'bg-accent text-white border-accent/20'
                    : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                }`}
              >
                Bảng 2, 3, 4, 5, 6, 7. Hệ số Gian hàng, Cơ cấu Level &amp; Timeline
              </button>
            </div>

            {canManageSetup && (
              <button
                type="button"
                onClick={handleResetDefaultConfigs}
                className="px-3 py-1.5 rounded-lg border border-line bg-canvas hover:bg-sunken text-ink-2 text-xs font-medium inline-flex items-center gap-1.5 transition shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục chuẩn gốc Excel</span>
              </button>
            )}
          </div>

          {/* SECTION A: BẢNG 1 (33 LOẠI CÔNG VIỆC SOW) */}
          {setupSection === 'TABLE_1_SOW' && (
            <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 bg-accent-soft border-b border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Bảng 1. Chính sách Point theo Scope of Work (33 đầu việc chuẩn B2C)
                  </h3>
                  <p className="text-2xs text-ink-2 mt-0.5">
                    Bấm <strong>&ldquo;Sửa&rdquo;</strong> ở bất kỳ dòng nào để điều chỉnh Point chuẩn hoặc Độ khó mặc định (Dễ / Tiêu chuẩn / Khó)
                  </p>
                </div>
                <select
                  value={sowGroupFilter}
                  onChange={e => setSowGroupFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-accent/20 rounded-lg text-xs font-semibold text-ink"
                >
                  <option value="ALL">Tất cả 9 phân nhóm (33 đầu việc)</option>
                  {Array.from(new Set(sowPolicies.map(s => s.group))).map(grp => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-sunken border-b border-line-strong text-ink font-semibold">
                      <th className="py-2.5 px-3 border-r border-line w-[50px] text-center">STT</th>
                      <th className="py-2.5 px-3 border-r border-line w-[160px]">Phân nhóm</th>
                      <th className="py-2.5 px-3 border-r border-line min-w-[230px]">Chi tiết loại công việc</th>
                      <th className="py-2.5 px-3 border-r border-line w-[95px] text-center">Point chuẩn</th>
                      <th className="py-2.5 px-3 border-r border-line w-[135px] text-center">Độ khó mặc định</th>
                      <th className="py-2.5 px-3 border-r border-line w-[100px] text-center">Cấp tính điểm</th>
                      <th className="py-2.5 px-3 border-r border-line w-[130px] text-center">Nguồn mặc định</th>
                      <th className="py-2.5 px-3 border-r border-line min-w-[240px]">Quy tắc áp dụng</th>
                      <th className="py-2.5 px-3 w-[120px] text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sowPolicies
                      .filter(s => sowGroupFilter === 'ALL' || s.group === sowGroupFilter)
                      .map(item => {
                        const isEdit = editingSowStt === item.stt && editSowDraft;
                        return (
                          <tr key={item.stt} className="hover:bg-canvas">
                            <td className="py-2.5 px-3 border-r border-line text-center font-mono font-semibold text-ink-2">
                              {item.stt}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line font-semibold text-ink">
                              {item.group}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line font-semibold text-ink">
                              {isEdit ? (
                                <input
                                  type="text"
                                  value={editSowDraft.name}
                                  onChange={e =>
                                    setEditSowDraft({ ...editSowDraft, name: e.target.value })
                                  }
                                  className="w-full px-2 py-1 border border-accent/20 rounded text-xs"
                                />
                              ) : (
                                item.name
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line text-center font-mono font-semibold text-accent">
                              {isEdit ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editSowDraft.basePoint}
                                  onChange={e =>
                                    setEditSowDraft({
                                      ...editSowDraft,
                                      basePoint: Number(e.target.value) || 1.0,
                                    })
                                  }
                                  className="w-16 px-2 py-1 border border-accent/20 rounded text-center font-mono text-xs"
                                />
                              ) : (
                                item.basePoint.toFixed(1).replace('.', ',')
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line text-center">
                              {isEdit ? (
                                <select
                                  value={editSowDraft.defaultDifficultyTier}
                                  onChange={e =>
                                    setEditSowDraft({
                                      ...editSowDraft,
                                      defaultDifficultyTier: e.target.value as 'EASY' | 'STANDARD' | 'HARD',
                                    })
                                  }
                                  className="px-2 py-1 border border-accent/20 rounded text-xs"
                                >
                                  <option value="EASY">Dễ (0,80)</option>
                                  <option value="STANDARD">Tiêu chuẩn (1,00)</option>
                                  <option value="HARD">Khó (1,20)</option>
                                </select>
                              ) : (
                                <span
                                  className={`text-2xs font-semibold border ${
                                    DIFFICULTY_TIER_BADGE[item.defaultDifficultyTier].cls
                                  }`}
                                >
                                  {DIFFICULTY_TIER_BADGE[item.defaultDifficultyTier].label}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line text-center font-medium text-ink-2">
                              {item.scopeUnit}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line text-center">
                              {item.defaultSource === 'DIRECTOR_ASSIGNED' ? (
                                <span className="text-2xs font-semibold text-accent -accent/20">
                                  Task GĐ giao
                                </span>
                              ) : (
                                <span className="text-2xs font-semibold text-accent -accent/20">
                                  Luồng quy trình
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-line text-ink-2 text-2xs">
                              {isEdit ? (
                                <input
                                  type="text"
                                  value={editSowDraft.ruleNote}
                                  onChange={e =>
                                    setEditSowDraft({ ...editSowDraft, ruleNote: e.target.value })
                                  }
                                  className="w-full px-2 py-1 border border-accent/20 rounded text-xs"
                                />
                              ) : (
                                item.ruleNote
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isEdit ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedSow}
                                    className="px-2 py-1 rounded bg-accent text-white text-2xs font-semibold"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSowStt(null);
                                      setEditSowDraft(null);
                                    }}
                                    className="px-2 py-1 rounded bg-sunken text-ink-2 text-2xs"
                                  >
                                    Huỷ
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSowStt(item.stt);
                                      setEditSowDraft({ ...item });
                                    }}
                                    className="px-2 py-1 rounded border border-line bg-white hover:bg-sunken text-ink-2 text-2xs font-semibold"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSelectSowPolicy(item);
                                      setIsAssignModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded bg-accent-soft hover:bg-accent-soft text-accent text-2xs font-semibold"
                                  >
                                    Giao
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION B: BẢNG 2B & 2A (SETUP CẤP ĐỘ RESEARCH & NHÓM CÔNG VIỆC) */}
          {setupSection === 'TABLE_2B_LEVELS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {difficultyConfigs.map(cat => (
                    <button
                      key={cat.categoryKey}
                      type="button"
                      onClick={() => {
                        setSelectedSetupCategory(cat.categoryKey);
                        setEditingLevelId(null);
                        setIsAddingNewLevel(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-2 ${
                        selectedSetupCategory === cat.categoryKey
                          ? 'bg-accent text-white border-accent/20 shadow-2xs'
                          : 'bg-canvas text-ink-2 border-line hover:bg-sunken'
                      }`}
                    >
                      <span>{cat.categoryName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-2xs font-mono ${
                          selectedSetupCategory === cat.categoryKey
                            ? 'bg-accent text-white'
                            : 'bg-surface text-ink-3'
                        }`}
                      >
                        {cat.levels.length} mức
                      </span>
                    </button>
                  ))}
                </div>
                {canManageSetup && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setIsAddingNewLevel(true)}
                  >
                    Thêm cấp độ mới
                  </Button>
                )}
              </div>

              <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-3.5 bg-accent-soft border-b border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {currentSetupCategoryObj.tableTitle}
                    </h3>
                    <p className="text-2xs text-ink-2 mt-0.5">
                      Đơn vị chuẩn: <strong>{currentSetupCategoryObj.unitLabel}</strong> · Dùng làm Hệ số phạm vi (Bảng 2 / 2b) trong công thức tính điểm Workload
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-sunken border-b border-line-strong text-ink font-semibold">
                        <th className="py-3 px-4 border-r border-line w-[210px]">Cấp độ</th>
                        <th className="py-3 px-4 border-r border-line w-[110px] text-center">Hệ số</th>
                        <th className="py-3 px-4 border-r border-line min-w-[260px]">Phạm vi thực hiện</th>
                        <th className="py-3 px-4 border-r border-line min-w-[260px]">Đầu ra (Deliverables)</th>
                        <th className="py-3 px-3 border-r border-line w-[110px] text-center">SLA chuẩn</th>
                        <th className="py-3 px-4 w-[130px] text-center">Thiết lập</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {currentSetupCategoryObj.levels.map(lvl => {
                        const isEditing = editingLevelId === lvl.id && editLevelDraft;
                        return (
                          <tr key={lvl.id} className="hover:bg-canvas transition">
                            <td className="py-3 px-4 border-r border-line font-semibold text-ink align-top">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editLevelDraft.levelCode}
                                  onChange={e =>
                                    setEditLevelDraft({ ...editLevelDraft, levelCode: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 bg-white border border-accent/20 rounded text-xs font-semibold"
                                />
                              ) : (
                                lvl.levelCode
                              )}
                            </td>
                            <td className="py-3 px-4 border-r border-line text-center font-mono font-semibold text-accent align-top">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.1"
                                  max="5.0"
                                  value={editLevelDraft.multiplier}
                                  onChange={e =>
                                    setEditLevelDraft({
                                      ...editLevelDraft,
                                      multiplier: Number(e.target.value) || 1.0,
                                    })
                                  }
                                  className="w-20 px-2 py-1.5 bg-white border border-accent/20 rounded text-xs font-mono text-center"
                                />
                              ) : (
                                lvl.multiplier.toFixed(2).replace('.', ',')
                              )}
                            </td>
                            <td className="py-3 px-4 border-r border-line text-ink align-top">
                              {isEditing ? (
                                <textarea
                                  rows={2}
                                  value={editLevelDraft.scopeDescription}
                                  onChange={e =>
                                    setEditLevelDraft({
                                      ...editLevelDraft,
                                      scopeDescription: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 bg-white border border-accent/20 rounded text-xs"
                                />
                              ) : (
                                lvl.scopeDescription
                              )}
                            </td>
                            <td className="py-3 px-4 border-r border-line text-ink-2 align-top">
                              {isEditing ? (
                                <textarea
                                  rows={2}
                                  value={editLevelDraft.expectedDeliverable}
                                  onChange={e =>
                                    setEditLevelDraft({
                                      ...editLevelDraft,
                                      expectedDeliverable: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 bg-white border border-accent/20 rounded text-xs"
                                />
                              ) : (
                                lvl.expectedDeliverable
                              )}
                            </td>
                            <td className="py-3 px-3 border-r border-line text-center font-mono text-ink-2 align-top">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="4"
                                  value={editLevelDraft.defaultSlaHours}
                                  onChange={e =>
                                    setEditLevelDraft({
                                      ...editLevelDraft,
                                      defaultSlaHours: Number(e.target.value) || 24,
                                    })
                                  }
                                  className="w-16 px-2 py-1.5 bg-white border border-accent/20 rounded text-xs font-mono text-center"
                                />
                              ) : (
                                `${lvl.defaultSlaHours}h`
                              )}
                            </td>
                            <td className="py-3 px-4 text-center align-top">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedLevel}
                                    className="px-2.5 py-1 rounded bg-accent text-white text-2xs font-semibold inline-flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Lưu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLevelId(null);
                                      setEditLevelDraft(null);
                                    }}
                                    className="px-2 py-1 rounded bg-sunken text-ink-2 text-2xs"
                                  >
                                    Huỷ
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLevelId(lvl.id);
                                      setEditLevelDraft({ ...lvl });
                                    }}
                                    className="px-2.5 py-1 rounded border border-line bg-white hover:bg-sunken text-ink-2 text-2xs font-semibold inline-flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Sửa</span>
                                  </button>
                                  {currentSetupCategoryObj.levels.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLevel(lvl.id)}
                                      className="p-1 rounded border border-line bg-white hover:bg-critical-soft text-ink-3 hover:text-critical transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isAddingNewLevel && (
                  <form
                    onSubmit={handleAddLevelToCategory}
                    className="p-4 bg-accent-soft border-t border-accent/20 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Tên cấp độ *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Level 6 – Đa quốc gia"
                          value={newLevelDraft.levelCode}
                          onChange={e =>
                            setNewLevelDraft(p => ({ ...p, levelCode: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-line-strong rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Hệ số nhân *
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          required
                          value={newLevelDraft.multiplier}
                          onChange={e =>
                            setNewLevelDraft(p => ({
                              ...p,
                              multiplier: Number(e.target.value) || 1.0,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-line-strong rounded-lg font-mono"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Phạm vi thực hiện
                        </label>
                        <input
                          type="text"
                          value={newLevelDraft.scopeDescription}
                          onChange={e =>
                            setNewLevelDraft(p => ({ ...p, scopeDescription: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-line-strong rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Đầu ra (Deliverables)
                        </label>
                        <input
                          type="text"
                          value={newLevelDraft.expectedDeliverable}
                          onChange={e =>
                            setNewLevelDraft(p => ({
                              ...p,
                              expectedDeliverable: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-line-strong rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          SLA (h)
                        </label>
                        <input
                          type="number"
                          value={newLevelDraft.defaultSlaHours}
                          onChange={e =>
                            setNewLevelDraft(p => ({
                              ...p,
                              defaultSlaHours: Number(e.target.value) || 48,
                            }))
                          }
                          className="w-full px-2 py-1.5 bg-white border border-line-strong rounded-lg font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setIsAddingNewLevel(false)}>
                        Huỷ
                      </Button>
                      <Button variant="primary" size="sm" type="submit">
                        Lưu cấp độ mới
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* SECTION C: BẢNG 2, 3, 4, 5, 6, 7 */}
          {setupSection === 'TABLE_2_TO_7_RULES' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bảng 2 & Bảng 3 */}
              <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-ink">
                    Bảng 2. Hệ số gian hàng (Dùng cho các nhóm việc vận hành thường xuyên)
                  </h4>
                  <p className="text-2xs text-ink-3 mt-0.5">
                    Việc cấp Brand dùng HS của store khó nhất trong Brand.
                  </p>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {STORE_SCOPE_TABLE_2.map(s => (
                      <div key={s.code} className="p-2.5 rounded-lg bg-canvas border border-line text-center">
                        <div className="text-xs font-semibold text-ink">{s.label}</div>
                        <div className="font-mono text-sm font-semibold text-accent mt-0.5">
                          {s.coef.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-line">
                  <h4 className="text-xs font-semibold text-ink">
                    Bảng 3. Hệ số công việc (Độ khó từng lần làm)
                  </h4>
                  <div className="space-y-2 mt-2">
                    {TASK_DIFFICULTY_TABLE_3.map(d => (
                      <div key={d.tier} className="p-2.5 rounded-lg bg-canvas border border-line flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-semibold text-ink">{d.label}</span>
                          <p className="text-2xs text-ink-3">{d.criteria}</p>
                        </div>
                        <span className="font-mono font-semibold text-accent shrink-0">
                          ×{d.coef.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bảng 4 */}
              <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-ink">
                  Bảng 4. Yêu cầu tỷ trọng công việc khó theo Level nhân sự (HS cơ cấu)
                </h4>
                <p className="text-2xs text-ink-3">
                  Tỷ lệ điểm khó thực tế = Tổng điểm các việc có Độ khó = Khó / Tổng điểm workload trong kỳ (trước HS cơ cấu). Đạt: <strong>×1,00</strong> | Không đạt: <strong>×0,70</strong>.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {STAFF_LEVEL_TABLE_4.map(l => (
                    <div key={l.level} className="p-2 rounded-lg bg-canvas border border-line flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-accent">{l.level}</span>
                      <span className="font-mono text-ink-2">≥ {l.minHardRatioPct}% Khó</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bảng 5 & Bảng 6 */}
              <div className="bg-surface border border-line rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-ink">Bảng 5. Hệ số Timeline</h4>
                  <div className="space-y-1.5 mt-2">
                    {TIMELINE_TABLE_5.map(t => (
                      <div key={t.status} className="p-2 rounded-lg bg-canvas border border-line flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-ink">{t.label}</span>
                          <span className="text-2xs text-ink-3 ml-2">({t.condition})</span>
                        </div>
                        <span className="font-mono font-semibold text-accent">×{t.coef.toFixed(1).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-line">
                  <h4 className="text-xs font-semibold text-ink">
                    Bảng 6. Hệ số đa sàn (Chỉ áp dụng cho việc cấp Brand)
                  </h4>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {MULTI_PLATFORM_TABLE_6.map(m => (
                      <div key={m.stores} className="p-2 rounded-lg bg-canvas border border-line text-center text-xs">
                        <div className="font-semibold text-ink">{m.label}</div>
                        <div className="font-mono font-semibold text-accent mt-0.5">
                          ×{m.coef.toFixed(1).replace('.', ',')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bảng 7 & Vai trò */}
              <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-ink">
                  Bảng 7. Cột bắt buộc khi ghi nhận đầu việc &amp; Tỷ trọng Vai trò
                </h4>
                <ul className="space-y-1.5 text-2xs text-ink-2 list-disc pl-4">
                  <li><strong>Sàn:</strong> Shopee / TikTok / Lazada</li>
                  <li><strong>Nền tảng:</strong> TikTok / FB / IG / YT / Shopee Video...</li>
                  <li><strong>Asset gốc / Reup từ:</strong> Bắt buộc với mọi đầu việc Reup/Adapt (STT 6, 7, 10, 11)</li>
                  <li><strong>Trạng thái KOC:</strong> KOC mới / Book lại / HĐ nguyên tắc (bắt buộc với KL6, KL7)</li>
                  <li><strong>Lý do đổi độ khó:</strong> Bắt buộc khi chọn độ khó khác mức mặc định ở Bảng 1</li>
                </ul>
                <div className="pt-2 border-t border-line grid grid-cols-2 gap-2">
                  {TASK_ROLE_WEIGHT_RULES.map(r => (
                    <div key={r.roleKey} className="p-2 rounded bg-canvas border border-line text-2xs">
                      <div className="font-semibold text-ink">{r.roleLabel}: {r.suggestedWeightRange}</div>
                      <div className="text-ink-3 line-clamp-1">{r.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: PHIẾU GIAO VIỆC & GHI NHẬN WORKLOAD (CHUẨN BẢNG 1 -> BẢNG 7)   */}
      {/* ===================================================================== */}
      <Presence show={isAssignModalOpen}>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 animate-in fade-in duration-(--motion-base)">
            <div
              data-motion-panel
              className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Giao việc &amp; Ghi nhận Điểm Workload (Chuẩn Bảng 1 → Bảng 7)
                    </h3>
                    <p className="text-2xs text-ink-3">
                      Hỗ trợ cả <strong>Task Giám đốc giao</strong> và <strong>Task thuộc luồng quy trình hệ thống</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-sunken hover:bg-sunken text-ink-2 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSubmitNewTask}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1 min-h-0">
                  {/* Bước 1: Chọn Nguồn Task & Đầu việc chuẩn Bảng 1 (33 SOW) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block font-semibold text-ink mb-1">
                        1. Nguồn phát sinh Task *
                      </label>
                      <select
                        value={formTaskSource}
                        onChange={e =>
                          setFormTaskSource(
                            e.target.value as 'DIRECTOR_ASSIGNED' | 'WORKFLOW_SYSTEM'
                          )
                        }
                        className="w-full px-3 py-2 bg-accent-soft border border-accent/20 rounded-lg font-semibold text-accent"
                      >
                        <option value="DIRECTOR_ASSIGNED">
                          Task Giám đốc / Quản lý giao
                        </option>
                        <option value="WORKFLOW_SYSTEM">
                          Task thuộc luồng quy trình hệ thống
                        </option>
                      </select>
                    </div>

                    <div className="sm:col-span-8">
                      <label className="block font-semibold text-ink mb-1">
                        2. Chọn Loại công việc theo Bảng 1 (33 SOW chuẩn) *
                      </label>
                      <select
                        value={formSowStt}
                        onChange={e => {
                          const stt = Number(e.target.value);
                          const found = sowPolicies.find(s => s.stt === stt);
                          if (found) handleSelectSowPolicy(found);
                        }}
                        className="w-full px-3 py-2 bg-white border border-line-strong rounded-lg font-semibold text-ink"
                      >
                        {sowPolicies.map(s => (
                          <option key={s.stt} value={s.stt}>
                            #{s.stt} [{s.group}] {s.name} — Point chuẩn: {s.basePoint.toFixed(1).replace('.', ',')} ({DIFFICULTY_TIER_BADGE[s.defaultDifficultyTier].label})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bước 2: Nhãn hàng, Gian hàng, SL nghiệm thu & Độ khó từng lần làm (Bảng 3, 5, 6) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        3. Nhãn hàng (Brand) *
                      </label>
                      <select
                        value={formBrand}
                        onChange={e => {
                          setFormBrand(e.target.value);
                          setFormStore('');
                        }}
                        className="w-full px-3 py-2 bg-white border border-line rounded-lg font-medium text-ink"
                      >
                        {brands.map(b => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        4. Gian hàng (Store)
                      </label>
                      <select
                        value={formStore}
                        onChange={e => setFormStore(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-line rounded-lg font-medium text-ink"
                      >
                        <option value="">Toàn nhãn hàng / Cấp Brand</option>
                        {brandStores.map(st => (
                          <option key={st.id} value={st.storeName}>
                            {st.storeName} ({st.platform})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        5. SL nghiệm thu *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={formAcceptedQty}
                        onChange={e => setFormAcceptedQty(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-line rounded-lg font-mono font-semibold text-accent"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        6. Độ khó lần làm (Bảng 3)
                      </label>
                      <select
                        value={formTaskDiffTier}
                        onChange={e =>
                          setFormTaskDiffTier(e.target.value as 'EASY' | 'STANDARD' | 'HARD')
                        }
                        className="w-full px-3 py-2 bg-white border border-line rounded-lg font-semibold text-ink"
                      >
                        <option value="EASY">Dễ (×0,80)</option>
                        <option value="STANDARD">Tiêu chuẩn (×1,00)</option>
                        <option value="HARD">Khó (×1,20)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bước 3: Chọn Hệ số phạm vi (Bảng 2b cho Research hoặc Bảng 2 cho Gian hàng) */}
                  <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink text-xs">
                          7. Hệ số phạm vi ({activeCategoryConfig.tableTitle})
                        </span>
                        <p className="text-2xs text-ink-3 mt-0.5">
                          {selectedSowPolicy.ruleNote}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold text-accent">
                        HS phạm vi: ×{modalFormulaPreview.scopeCoef.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {formCategory === 'RESEARCH' && (
                      <div className="p-3 rounded-lg bg-white border border-accent/20 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-2xs font-semibold text-ink-2 mb-1">
                            Số sàn nghiên cứu
                          </label>
                          <select
                            value={formPlatformsCount}
                            onChange={e =>
                              handleAutoSuggestResearchLevel(
                                Number(e.target.value),
                                formProductLinesCount,
                                formIncludeContentBookingPlan,
                                formIncludeBrandStrategy
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-canvas border border-line rounded text-xs font-medium"
                          >
                            <option value={1}>1 sàn</option>
                            <option value={2}>2 sàn</option>
                            <option value={3}>Đa sàn (≥3 sàn)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-2xs font-semibold text-ink-2 mb-1">
                            Số line sản phẩm
                          </label>
                          <select
                            value={formProductLinesCount}
                            onChange={e =>
                              handleAutoSuggestResearchLevel(
                                formPlatformsCount,
                                Number(e.target.value),
                                formIncludeContentBookingPlan,
                                formIncludeBrandStrategy
                              )
                            }
                            className="w-full px-2.5 py-1.5 bg-canvas border border-line rounded text-xs font-medium"
                          >
                            <option value={1}>1 line sản phẩm</option>
                            <option value={2}>2 line sản phẩm</option>
                            <option value={3}>Đa line (≥3 line)</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer pt-4">
                          <input
                            type="checkbox"
                            checked={formIncludeContentBookingPlan}
                            onChange={e =>
                              handleAutoSuggestResearchLevel(
                                formPlatformsCount,
                                formProductLinesCount,
                                e.target.checked,
                                formIncludeBrandStrategy
                              )
                            }
                            className="rounded text-accent"
                          />
                          <span className="text-2xs font-medium text-ink">
                            Kèm KH Content &amp; Booking (L3)
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer pt-4">
                          <input
                            type="checkbox"
                            checked={formIncludeBrandStrategy}
                            onChange={e =>
                              handleAutoSuggestResearchLevel(
                                formPlatformsCount,
                                formProductLinesCount,
                                formIncludeContentBookingPlan,
                                e.target.checked
                              )
                            }
                            className="rounded text-accent"
                          />
                          <span className="text-2xs font-medium text-ink">
                            Kèm Brand Strategy (L4)
                          </span>
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      {activeCategoryConfig.levels.map(lvl => {
                        const isSelected = lvl.id === activeLevelConfig?.id;
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => handleSelectFormLevel(lvl)}
                            className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'bg-accent text-white border-accent/20 shadow-xs'
                                : 'bg-white text-ink border-line hover:border-accent/20'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-semibold text-xs">
                                  {lvl.levelCode}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-mono text-2xs font-semibold ${
                                    isSelected
                                      ? 'bg-white text-accent'
                                      : 'bg-accent-soft text-accent'
                                  }`}
                                >
                                  {lvl.multiplier.toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <p
                                className={`text-2xs mt-1 line-clamp-2 ${
                                  isSelected ? 'text-accent' : 'text-ink-3'
                                }`}
                              >
                                {lvl.scopeDescription}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bước 4: Bảng 7 (Các trường bắt buộc khi ghi nhận đầu việc) & Bảng 5, 6 */}
                  <div className="p-4 rounded-xl bg-warning-soft border border-warning/20 space-y-3">
                    <span className="font-semibold text-ink text-xs block">
                      8. Thông tin bắt buộc theo Bảng 7, Bảng 5 (Timeline) &amp; Bảng 6 (Đa sàn)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Sàn áp dụng (Bảng 7) *
                        </label>
                        <input
                          type="text"
                          value={formPlatformScope}
                          onChange={e => setFormPlatformScope(e.target.value)}
                          placeholder="TikTok / Shopee / Lazada"
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          Nền tảng đăng (Bảng 7) *
                        </label>
                        <input
                          type="text"
                          value={formChannelPlatform}
                          onChange={e => setFormChannelPlatform(e.target.value)}
                          placeholder="TikTok / FB / IG / Shopee Video"
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          HS Timeline (Bảng 5)
                        </label>
                        <select
                          value={formTimelineStatus}
                          onChange={e =>
                            setFormTimelineStatus(
                              e.target.value as 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED'
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded text-xs font-semibold"
                        >
                          {TIMELINE_TABLE_5.map(t => (
                            <option key={t.status} value={t.status}>
                              {t.label} (×{t.coef.toFixed(1)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-2xs font-semibold text-ink-2 mb-1">
                          HS Đa sàn (Bảng 6 - Cấp Brand)
                        </label>
                        <select
                          value={formMultiStoreCount}
                          disabled={!selectedSowPolicy.supportsMultiPlatform}
                          onChange={e => setFormMultiStoreCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-line rounded text-xs font-semibold disabled:opacity-50"
                        >
                          {MULTI_PLATFORM_TABLE_6.map(m => (
                            <option key={m.stores} value={m.stores}>
                              {m.label} (×{m.coef.toFixed(1)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedSowPolicy.requiresKocStatus && (
                        <div>
                          <label className="block text-2xs font-semibold text-ink-2 mb-1">
                            Trạng thái KOC (Bảng 7) *
                          </label>
                          <select
                            value={formKocStatusType}
                            onChange={e => {
                              const val = e.target.value as 'NEW_KOC' | 'REBOOK' | 'FRAMEWORK_CONTRACT';
                              setFormKocStatusType(val);
                              if (val !== 'NEW_KOC' && (formSowStt === 1 || formSowStt === 2)) {
                                setFormTaskDiffTier('STANDARD');
                              } else if (val === 'NEW_KOC' && (formSowStt === 1 || formSowStt === 2)) {
                                setFormTaskDiffTier('HARD');
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-line rounded text-xs font-semibold"
                          >
                            <option value="NEW_KOC">KOC mới, book lần đầu (Độ khó: Khó)</option>
                            <option value="REBOOK">Book lại (Chuyển về Tiêu chuẩn)</option>
                            <option value="FRAMEWORK_CONTRACT">HĐ nguyên tắc (Chuyển về Tiêu chuẩn)</option>
                          </select>
                        </div>
                      )}

                      {selectedSowPolicy.requiresOriginalAsset && (
                        <div>
                          <label className="block text-2xs font-semibold text-critical mb-1">
                            Asset gốc / Reup từ (Bắt buộc Bảng 7) *
                          </label>
                          <input
                            type="text"
                            required
                            value={formOriginalAssetRef}
                            onChange={e => setFormOriginalAssetRef(e.target.value)}
                            placeholder="Nhập mã video gốc / link asset gốc..."
                            className="w-full px-2.5 py-1.5 bg-white border border-critical/20 rounded text-xs"
                          />
                        </div>
                      )}

                      {formTaskDiffTier !== selectedSowPolicy.defaultDifficultyTier && (
                        <div className="sm:col-span-2">
                          <label className="block text-2xs font-semibold text-critical mb-1">
                            Lý do đổi độ khó khác mặc định Bảng 1 (Bắt buộc Bảng 7) *
                          </label>
                          <input
                            type="text"
                            required
                            value={formDiffOverrideReason}
                            onChange={e => setFormDiffOverrideReason(e.target.value)}
                            placeholder="VD: Yêu cầu xây kênh theo nhận diện mới / kiểm duyệt pháp lý nghiêm..."
                            className="w-full px-2.5 py-1.5 bg-white border border-critical/20 rounded text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bước 5: Phân công Nhân sự, Vai trò & Tỷ trọng đóng góp (%) */}
                  <div className="p-4 rounded-xl bg-canvas border border-line space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink text-xs">
                          9. Phân vai trò nhận việc &amp; Tỷ trọng đóng góp (Tổng = 100%)
                        </span>
                      </div>
                      <span
                        className={`font-mono text-2xs font-semibold ${
                          isWeightValid
                            ? 'bg-positive-soft text-positive'
                            : 'bg-critical-soft text-critical'
                        }`}
                      >
                        Tổng tỷ trọng: {totalContributionWeight}%{' '}
                        {isWeightValid ? '(Hợp lệ)' : '(Phải bằng 100%)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {ROLE_SPLIT_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applySplitPreset(preset.id)}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-accent-soft text-ink-2 hover:text-accent border border-line text-2xs font-medium transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      {assignees.map((slot, idx) => {
                        const pts = (
                          modalFormulaPreview.totalCasePoints *
                          (slot.weightPct / 100)
                        ).toFixed(2);
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-line"
                          >
                            <div className="sm:col-span-5">
                              <label className="block text-2xs text-ink-3 mb-0.5">
                                Nhân sự nhận việc #{idx + 1}
                              </label>
                              <select
                                value={slot.staffName}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAssignees(prev =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, staffName: val } : item
                                    )
                                  );
                                }}
                                className="w-full px-2.5 py-1.5 bg-canvas border border-line rounded text-xs font-medium"
                              >
                                {allAssignableStaff.map(s => (
                                  <option key={s.name} value={s.name}>
                                    {s.name} ({s.roleTitle})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-2xs text-ink-3 mb-0.5">
                                Vai trò trong Case
                              </label>
                              <select
                                value={slot.role}
                                onChange={e => {
                                  const role = e.target.value as TaskAssignmentRoleKey;
                                  setAssignees(prev =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, role } : item
                                    )
                                  );
                                }}
                                className="w-full px-2.5 py-1.5 bg-canvas border border-line rounded text-xs font-semibold"
                              >
                                <option value="PIC_OWNER">PIC / Owner (50–70%)</option>
                                <option value="CO_PIC">Co-PIC (25–40%)</option>
                                <option value="EXECUTION">Execution (15–30%)</option>
                                <option value="SUPPORT">Support (5–15%)</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-2xs text-ink-3 mb-0.5">
                                Tỷ trọng (%)
                              </label>
                              <input
                                type="number"
                                min={5}
                                max={100}
                                step={5}
                                value={slot.weightPct}
                                onChange={e => {
                                  const w = Number(e.target.value) || 0;
                                  setAssignees(prev =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, weightPct: w } : item
                                    )
                                  );
                                }}
                                className="w-full px-2.5 py-1.5 bg-canvas border border-line rounded text-xs font-mono font-semibold text-center"
                              />
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                              <div className="text-right">
                                <span className="text-2xs text-ink-3 block">
                                  Điểm cá nhân
                                </span>
                                <span className="font-mono text-xs font-semibold text-accent">
                                  {pts} pts
                                </span>
                              </div>
                              {assignees.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAssignees(prev =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="p-1.5 rounded hover:bg-critical-soft text-ink-3 hover:text-critical"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAssignees(prev => [
                          ...prev,
                          {
                            staffName: allAssignableStaff[0]?.name || 'Lê Phương Thảo',
                            role: 'EXECUTION',
                            weightPct: 0,
                          },
                        ])
                      }
                      className="text-2xs font-semibold text-accent hover:text-accent inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm nhân sự cùng tham gia task này</span>
                    </button>
                  </div>

                  {/* Bước 6: Tiêu đề, Đầu ra & Hạn SLA */}
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-ink mb-1">
                        10. Tiêu đề công việc / Nhiệm vụ *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={`VD: ${selectedSowPolicy.name} cho ${formBrand}...`}
                        value={formTitle}
                        onChange={e => setFormTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:border-accent/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-ink mb-1">
                          11. Đầu ra yêu cầu (Deliverables)
                        </label>
                        <input
                          type="text"
                          value={formDeliverable}
                          onChange={e => setFormDeliverable(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-line rounded-lg text-ink"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-ink mb-1">
                            12. Hạn SLA (Giờ)
                          </label>
                          <select
                            value={formDeadlineHours}
                            onChange={e => setFormDeadlineHours(Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-white border border-line rounded-lg font-mono font-semibold"
                          >
                            <option value={12}>12h</option>
                            <option value={24}>24h (1 ngày)</option>
                            <option value={36}>36h (1,5 ngày)</option>
                            <option value={48}>48h (2 ngày)</option>
                            <option value={72}>72h (3 ngày)</option>
                            <option value={96}>96h (4 ngày)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-ink mb-1">
                            13. Mức độ ưu tiên
                          </label>
                          <select
                            value={formUrgency}
                            onChange={e =>
                              setFormUrgency(
                                e.target.value as 'critical' | 'warning' | 'normal'
                              )
                            }
                            className="w-full px-2.5 py-2 bg-white border border-line rounded-lg font-medium"
                          >
                            <option value="critical">Khẩn cấp (SLA gấp)</option>
                            <option value="warning">Cảnh báo (Quan trọng)</option>
                            <option value="normal">Bình thường</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer with Live Formula Preview */}
                <div className="px-6 py-3.5 border-t border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="text-2xs text-ink-2 font-mono">
                    Công thức: SL({modalFormulaPreview.qty}) × Point({modalFormulaPreview.stdPoint}) × Phạm vi({modalFormulaPreview.scopeCoef.toFixed(2)}) × Việc({modalFormulaPreview.taskDiffCoef.toFixed(2)}) × Timeline({modalFormulaPreview.timelineCoef.toFixed(1)}) × Đa sàn({modalFormulaPreview.multiPlatformCoef.toFixed(1)}) ={' '}
                    <strong className="text-sm text-accent">
                      {modalFormulaPreview.totalCasePoints.toFixed(2)} pts
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsAssignModalOpen(false)}
                    >
                      Huỷ
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      icon={Send}
                    >
                      Xác nhận Giao &amp; Tính Workload
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </Presence>

      {/* ===================================================================== */}
      {/* MODAL 2: CẬP NHẬT LINK FILE ĐẦU RA (DELIVERABLE)                       */}
      {/* ===================================================================== */}
      <Presence show={!!editingDeliverableTask}>
        {editingDeliverableTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-line overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">
                  Nộp link kết quả đầu ra (Deliverable)
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDeliverableTask(null)}
                  className="text-ink-3 hover:text-ink-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <div className="p-2.5 rounded-lg bg-canvas border border-line">
                  <div className="font-semibold text-ink">
                    {editingDeliverableTask.title}
                  </div>
                  <div className="text-2xs text-ink-3 mt-0.5">
                    Yêu cầu đầu ra:{' '}
                    {editingDeliverableTask.expectedDeliverable ||
                      'File báo cáo / kế hoạch nghiệm thu'}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    Đường dẫn tài liệu (Google Sheet / Docs / Lark Base)
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={deliverableInputUrl}
                    onChange={e => setDeliverableInputUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-line-strong rounded-lg text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingDeliverableTask(null)}
                  >
                    Đóng
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (onUpdateTask && editingDeliverableTask) {
                        onUpdateTask({
                          ...editingDeliverableTask,
                          deliverableUrl: deliverableInputUrl.trim() || undefined,
                        });
                      }
                      onNotify?.('Đã cập nhật link tài liệu đầu ra cho công việc!', 'success');
                      setEditingDeliverableTask(null);
                    }}
                  >
                    Lưu link đầu ra
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Presence>
    </div>
  );
};

export default TaskDelegationView;
