import { 
  MasterSlaMilestoneConfig, 
  MasterKpiDefinition, 
  BackupStaffAssignment, 
  StoreAssignmentHistoryRecord, 
  AuditLogEntry 
} from './types';

// =========================================================================
// 1. BẢNG ĐỊNH NGHĨA SLA CHUẨN DOANH NGHIỆP (UPBASE OPERATIONAL SLA)
// =========================================================================
export const UPBASE_MASTER_SLA_CONFIG: MasterSlaMilestoneConfig[] = [
  {
    id: 'SLA-01',
    milestoneCode: 'SCRIPT_APPROVAL',
    milestoneName: 'Phê duyệt kịch bản (Brand Review)',
    description: 'Thời gian tối đa để Brand phê duyệt hoặc yêu cầu chỉnh sửa kịch bản KOC',
    standardSlaHours: 24,
    warningThresholdHours: 18,
    responsibleRole: 'BRAND_MEMBER',
    escalateToRole: 'MANAGER',
    slaType: 'WORKING_HOURS',
    penaltyWeight: 5
  },
  {
    id: 'SLA-02',
    milestoneCode: 'SAMPLE_DISPATCH',
    milestoneName: 'Xuất kho & gửi mẫu cho KOC',
    description: 'Từ khi kịch bản được duyệt đến khi kho đóng gói và nhập mã vận đơn',
    standardSlaHours: 24,
    warningThresholdHours: 16,
    responsibleRole: 'BOOKING_MEMBER',
    escalateToRole: 'LEADER',
    slaType: 'WORKING_HOURS',
    penaltyWeight: 3
  },
  {
    id: 'SLA-03',
    milestoneCode: 'SAMPLE_DELIVERY',
    milestoneName: 'Vận chuyển & giao mẫu tới KOC',
    description: 'Thời gian bưu điện phát hàng thành công cho KOC kể từ lúc gửi',
    standardSlaHours: 72,
    warningThresholdHours: 48,
    responsibleRole: 'BOOKING_MEMBER',
    escalateToRole: 'LEADER',
    slaType: 'CALENDAR_HOURS',
    penaltyWeight: 2
  },
  {
    id: 'SLA-04',
    milestoneCode: 'VIDEO_DRAFT_SUBMISSION',
    milestoneName: 'KOC nộp video quay nháp',
    description: 'Thời gian KOC hoàn thiện và nộp bản video nháp sau khi nhận được mẫu',
    standardSlaHours: 120, // 5 ngày
    warningThresholdHours: 96,
    responsibleRole: 'BOOKING_MEMBER',
    escalateToRole: 'LEADER',
    slaType: 'CALENDAR_HOURS',
    penaltyWeight: 5
  },
  {
    id: 'SLA-05',
    milestoneCode: 'VIDEO_QC_VERIFICATION',
    milestoneName: 'Nghiệm thu chất lượng video (QC & Air)',
    description: 'Team Content & Brand thẩm định video, kiểm tra link air và duyệt mã Spark Ads',
    standardSlaHours: 24,
    warningThresholdHours: 18,
    responsibleRole: 'CONTENT_MEMBER',
    escalateToRole: 'LEADER',
    slaType: 'WORKING_HOURS',
    penaltyWeight: 4
  },
  {
    id: 'SLA-06',
    milestoneCode: 'ADVANCE_PAYMENT',
    milestoneName: 'Thanh toán tạm ứng hợp đồng',
    description: 'Kế toán giải ngân tạm ứng sau khi hợp đồng điện tử được ký',
    standardSlaHours: 24,
    warningThresholdHours: 16,
    responsibleRole: 'MANAGER',
    escalateToRole: 'ADMIN',
    slaType: 'WORKING_HOURS',
    penaltyWeight: 3
  },
  {
    id: 'SLA-07',
    milestoneCode: 'FINAL_SETTLEMENT',
    milestoneName: 'Quyết toán & đối soát video',
    description: 'Quyết toán thù lao cho KOC sau khi video lên sóng hợp lệ và xuất hóa đơn',
    standardSlaHours: 48,
    warningThresholdHours: 36,
    responsibleRole: 'MANAGER',
    escalateToRole: 'ADMIN',
    slaType: 'WORKING_HOURS',
    penaltyWeight: 4
  }
];

// =========================================================================
// 2. BẢNG ĐỊNH NGHĨA KPI CHUẨN THEO VAI TRÒ (UPBASE KPI MATRIX)
// =========================================================================
export const UPBASE_MASTER_KPI_DEFINITIONS: MasterKpiDefinition[] = [
  // Booking Specialist
  {
    id: 'KPI-BK-01',
    role: 'BOOKING_MEMBER',
    kpiCode: 'BOOKING_VIDEO_VOLUME',
    kpiName: 'Số lượng Video KOC lên sóng / tháng',
    targetValue: 30,
    unit: 'video',
    cycle: 'MONTHLY',
    weightPct: 35,
    benchmarkCriteria: 'Tối thiểu 25 clips/tháng đối với Junior, 35 clips/tháng đối với Senior'
  },
  {
    id: 'KPI-BK-02',
    role: 'BOOKING_MEMBER',
    kpiCode: 'BOOKING_CIR',
    kpiName: 'Tỷ lệ chi phí trên doanh thu (CIR booking)',
    targetValue: 15,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 25,
    benchmarkCriteria: 'CIR toàn shop không vượt quá trần 15-18% ngân sách chiến dịch'
  },
  {
    id: 'KPI-BK-03',
    role: 'BOOKING_MEMBER',
    kpiCode: 'SLA_COMPLIANCE_RATE',
    kpiName: 'Tỷ lệ tuân thủ hạn mốc SLA vận hành',
    targetValue: 95,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 20,
    benchmarkCriteria: 'Không có deal bị trễ giao mẫu >3 ngày hoặc nợ link air >7 ngày'
  },
  {
    id: 'KPI-BK-04',
    role: 'BOOKING_MEMBER',
    kpiCode: 'SPARK_ADS_CODE_RATE',
    kpiName: 'Tỷ lệ thu thập mã Spark Ads hợp lệ',
    targetValue: 90,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 20,
    benchmarkCriteria: 'Mã Ads có thời hạn tối thiểu 60 ngày để Media team scale ngân sách'
  },

  // Content Creator
  {
    id: 'KPI-CT-01',
    role: 'CONTENT_MEMBER',
    kpiCode: 'CONTENT_SCRIPT_VOLUME',
    kpiName: 'Số kịch bản sáng tạo chuẩn hóa / tháng',
    targetValue: 20,
    unit: 'kịch bản',
    cycle: 'MONTHLY',
    weightPct: 40,
    benchmarkCriteria: 'Tối thiểu 15-20 kịch bản đạt tiêu chuẩn Brand Guideline không vi phạm từ cấm'
  },
  {
    id: 'KPI-CT-02',
    role: 'CONTENT_MEMBER',
    kpiCode: 'CONTENT_HOOK_2S_RATE',
    kpiName: 'Tỷ lệ giữ chân 2s trung bình các video on-air',
    targetValue: 32,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 30,
    benchmarkCriteria: 'Đạt chuẩn benchmark 28-35% theo báo cáo TikTok Seller Center'
  },
  {
    id: 'KPI-CT-03',
    role: 'CONTENT_MEMBER',
    kpiCode: 'CONTENT_SCRIPT_PASS_RATE',
    kpiName: 'Tỷ lệ duyệt kịch bản vòng 1 (First-pass Rate)',
    targetValue: 85,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 30,
    benchmarkCriteria: 'Hạn chế tối đa việc Brand yêu cầu sửa lại kịch bản quá 2 lần'
  },

  // Growth Lead / Manager
  {
    id: 'KPI-MN-01',
    role: 'MANAGER',
    kpiCode: 'TOTAL_TARGET_GMV',
    kpiName: 'Tổng doanh thu GMV các gian hàng phụ trách',
    targetValue: 2500000000,
    unit: 'VNĐ',
    cycle: 'MONTHLY',
    weightPct: 40,
    benchmarkCriteria: 'Hoàn thành 100% chỉ tiêu GMV phân bổ đầu tháng từ Giám đốc khối'
  },
  {
    id: 'KPI-MN-02',
    role: 'MANAGER',
    kpiCode: 'AVERAGE_CAMPAIGN_ROAS',
    kpiName: 'ROAS trung bình toàn bộ chiến dịch',
    targetValue: 5.5,
    unit: 'x',
    cycle: 'MONTHLY',
    weightPct: 30,
    benchmarkCriteria: 'Tối thiểu 4.5x cho dòng mỹ phẩm, 6.0x cho dòng mẹ & bé'
  },
  {
    id: 'KPI-MN-03',
    role: 'MANAGER',
    kpiCode: 'PLAN_GOVERNANCE_COVERAGE',
    kpiName: 'Tỷ lệ phủ và duyệt kế hoạch đúng hạn',
    targetValue: 100,
    unit: '%',
    cycle: 'MONTHLY',
    weightPct: 30,
    benchmarkCriteria: '100% gian hàng B2C active phải có kế hoạch được duyệt trước ngày 01 hàng tháng'
  }
];

// =========================================================================
// 3. VAI TRÒ DỰ PHÒNG / BACKUP PIC (ENTERPRISE BACKUP ROLES)
// =========================================================================
export const INITIAL_BACKUP_ASSIGNMENTS: BackupStaffAssignment[] = [
  {
    id: 'BA-001',
    primaryStaffId: 'st-1',
    primaryStaffName: 'Khánh Vy',
    backupStaffId: 'st-2',
    backupStaffName: 'Trần Minh Đức',
    role: 'BOOKING_MEMBER',
    storeIds: ['ST-SO1000', 'ST-SO0001'],
    isActive: true,
    reason: 'NGHỈ_PHÉP',
    startDate: '2026-10-08',
    endDate: '2026-10-14',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long (Trưởng Phòng B2C)',
    notes: 'Trần Minh Đức tiếp nhận duyệt deal, đôn đốc nộp video và phối hợp gửi mẫu trong thời gian Khánh Vy nghỉ phép.',
    createdAt: '2026-10-07T14:30:00Z'
  },
  {
    id: 'BA-002',
    primaryStaffId: 'st-3',
    primaryStaffName: 'Đặng Mai Hà Linh',
    backupStaffId: 'st-4',
    backupStaffName: 'Nguyễn Ngọc Huyền',
    role: 'BOOKING_MEMBER',
    storeIds: ['ST-SO0002'],
    isActive: false,
    reason: 'CÔNG_TÁC',
    startDate: '2026-09-20',
    endDate: '2026-09-24',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long',
    notes: 'Đã hoàn thành bàn giao sau khi kết thúc đợt công tác tại TP.HCM.',
    createdAt: '2026-09-19T10:00:00Z'
  }
];

// =========================================================================
// 4. LỊCH SỬ PHÂN CÔNG GIAN HÀNG & NHÂN SỰ (STORE ASSIGNMENT AUDIT LOG)
// =========================================================================
export const INITIAL_STORE_ASSIGNMENT_HISTORY: StoreAssignmentHistoryRecord[] = [
  {
    id: 'AH-001',
    storeId: 'ST-SO1000',
    storeName: 'Kutieskin Mama_TikTok_E2E-S',
    brandName: 'Kutieskin',
    staffId: 'st-1',
    staffName: 'Khánh Vy',
    roleType: 'PRIMARY_B2C',
    action: 'ASSIGNED',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long',
    effectiveDate: '2026-01-15',
    reason: 'Phân công nhân sự chính phụ trách chiến dịch TikTok Shop E2E',
    handoverNotes: 'Bàn giao tài khoản TikTok Seller Center, danh sách KOC đối tác cũ và ngân sách quý'
  },
  {
    id: 'AH-002',
    storeId: 'ST-SO1000',
    storeName: 'Kutieskin Mama_TikTok_E2E-S',
    brandName: 'Kutieskin',
    staffId: 'st-2',
    staffName: 'Trần Minh Đức',
    roleType: 'CO_OWNER',
    action: 'ASSIGNED',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long',
    effectiveDate: '2026-03-01',
    reason: 'Bổ sung nhân sự đồng phụ trách do quy mô ngân sách mở rộng lên 150M/tháng',
    handoverNotes: 'Phụ trách riêng mảng KOC Tier 3 và Seeding Affiliate diện rộng'
  },
  {
    id: 'AH-003',
    storeId: 'ST-SO1000',
    storeName: 'Kutieskin Mama_TikTok_E2E-S',
    brandName: 'Kutieskin',
    staffId: 'st-2',
    staffName: 'Trần Minh Đức',
    roleType: 'BACKUP_PIC',
    action: 'BACKUP_ACTIVATED',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long',
    effectiveDate: '2026-10-08',
    endDate: '2026-10-14',
    reason: 'Kích hoạt quyền Backup xử lý công việc thay Khánh Vy trong thời gian nghỉ phép',
    handoverNotes: 'Ủy quyền toàn bộ thẩm quyền ký duyệt hợp đồng KOC và điều phối gửi mẫu'
  },
  {
    id: 'AH-004',
    storeId: 'ST-SO0001',
    storeName: '30Shine_Shopee_E2E-S',
    brandName: '30Shine',
    staffId: 'st-5',
    staffName: 'Nguyễn Quỳnh Trang',
    roleType: 'PRIMARY_B2C',
    action: 'ASSIGNED',
    assignedBy: 'user-02',
    assignedByName: 'Nguyễn Hoàng Long',
    effectiveDate: '2026-02-01',
    reason: 'Phân công quản lý vận hành kênh Shopee Mall'
  }
];

// =========================================================================
// 5. NHẬT KÝ KIỂM TOÁN HỆ THỐNG (SYSTEM AUDIT TRAIL)
// =========================================================================
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    entityType: 'PLAN',
    entityId: 'PLAN-2026-10-KUTI',
    entityName: 'Kế Hoạch B2C Tháng 10/2026 - Kutieskin',
    action: 'SUBMIT',
    actorId: 'st-1',
    actorName: 'Khánh Vy',
    actorRole: 'BOOKING_MEMBER',
    timestamp: '2026-10-07T16:20:00Z',
    note: 'Đã phân rã kế hoạch 4 kênh và thống nhất chỉ tiêu với Growth Lead, gửi duyệt Quản lý.'
  },
  {
    id: 'AUD-002',
    entityType: 'PLAN',
    entityId: 'PLAN-2026-10-KUTI',
    entityName: 'Kế Hoạch B2C Tháng 10/2026 - Kutieskin',
    action: 'APPROVE',
    actorId: 'user-02',
    actorName: 'Nguyễn Hoàng Long',
    actorRole: 'MANAGER',
    timestamp: '2026-10-08T09:15:00Z',
    note: 'Phê duyệt chính thức kế hoạch tháng 10. Đủ điều kiện giải ngân ngân sách 150.000.000 đ.'
  },
  {
    id: 'AUD-003',
    entityType: 'STORE',
    entityId: 'ST-SO1000',
    entityName: 'Kutieskin Mama_TikTok_E2E-S',
    action: 'ACTIVATE_BACKUP',
    actorId: 'user-02',
    actorName: 'Nguyễn Hoàng Long',
    actorRole: 'MANAGER',
    timestamp: '2026-10-08T09:30:00Z',
    note: 'Kích hoạt nhân sự dự phòng Trần Minh Đức thay thế Khánh Vy (Nghỉ phép từ 08/10 đến 14/10).'
  },
  {
    id: 'AUD-004',
    entityType: 'DEAL',
    entityId: 'deal-1',
    entityName: 'Deal BO260757625 (KOC Chanh Beauty)',
    action: 'APPROVE',
    actorId: 'user-07',
    actorName: 'Đại diện Brand Kutieskin',
    actorRole: 'BRAND_PARTNER',
    timestamp: '2026-09-20T14:30:00Z',
    note: 'Brand đối tác đã duyệt kịch bản và đồng ý gửi mẫu sản phẩm.'
  }
];
