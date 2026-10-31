export type SystemDepartmentScope =
  | 'MARKETING_B2C'
  | 'OTHER_BLOCKED';

/**
 * Phạm vi dữ liệu của vai trò: trong một màn hình, người dùng thấy dữ liệu của ai.
 * ALL: toàn bộ · DEPARTMENT: cả khối (B2C / Growth / Media) · TEAM: bản thân + nhân sự mình quản lý · OWN: chỉ việc được giao.
 */
export type DataScope = 'ALL' | 'DEPARTMENT' | 'TEAM' | 'OWN';

export type UserRole =
  | 'ADMIN' 
  | 'MANAGER'        // Giám đốc Marketing B2C
  | 'LEADER'         // Trưởng nhóm B2C
  | 'BRAND_MEMBER' 
  | 'CONTENT_MEMBER' 
  | 'BOOKING_MEMBER' 
  | 'MEMBER'
  | 'LEGAL'          // Pháp chế — Duyệt hợp đồng & Quản lý danh mục biểu mẫu
  | 'FINANCE'        // Kế toán — Duyệt hợp đồng & Đối soát thanh toán
  | 'SIGN_ADMIN'     // Điều phối ký điện tử (weSign)
  | 'BRAND_PARTNER' // Đại diện đối tác Brand đăng nhập Gmail
  | 'KOC_PARTNER'   // Creator / KOC đăng nhập Gmail
  | 'CTV_PARTNER';  // Cộng tác viên kênh nội bộ đăng nhập Gmail

export type TabKey =
  | 'cockpit'
  | 'overview'
  | 'dashboard-bi'
  | 'dashboard-brand'
  | 'dashboard-air-sync'
  | 'dashboard-store'
  | 'dashboard-video'
  | 'dashboard-team-sla'
  | 'dashboard-staff'
  | 'dashboard-finance'
  | 'input-plan'
  | 'koc-listing' | 'multi-platform-booking' | 'livestream-booking'
  | 'approved-booking-list'
  | 'self-channel-hub' | 'lark-settlement'
  | 'master-data'
  | 'push-products'
  | 'stores'
  | 'campaigns'
  | 'brand-knowledge'
  | 'content'
  | 'content-angles'
  | 'partner-access'
  | 'booking'
  | 'koc-master'
  | 'ctv-master'
  | 'contracts'
  | 'manager'
  | 'task-delegation'
  | 'workload-3d'
  | 'sample-tracker'
  | 'performance-p3'
  | 'leaderboard'
  | 'brand-hub'
  | 'koc-hub'
  | 'ads-report'
  | 'api-settings'
  | 'cloudflare-admin'
  | 'knowledge-qa'
  | 'audit-trail'
  | 'tiktok-crawler'
  | 'market-research'
  | 'store-air-plan-report'
  | 'zalo-bot';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatar: string;
  staffCode?: string;
  departmentScope?: SystemDepartmentScope;
  departmentName?: string;
  teamName?: string;
  canLogin?: boolean;
  managerId?: string;
  managerName?: string;
  larkOpenId?: string;
  larkTenantKey?: string;
  larkAvatarUrl?: string;
  loginProvider?: 'LARK' | 'GMAIL' | 'SANDBOX';
  partnerType?: 'BRAND' | 'KOC' | 'CTV';
  linkedEntityId?: string; // ID của Brand / KOC / CTV
  linkedEntityName?: string; // Tên của Brand / KOC / CTV
  allowedStoreNames?: string[]; // Danh sách gian hàng được xem (đối với Brand)
  assignedBrands?: string[]; // Danh sách các nhãn hàng nhân viên được phân công phụ trách (dành cho Specialist/Leader làm việc với 2-3 brand)
  permissions?: string[];
  /** Số điện thoại liên hệ cá nhân */
  phone?: string;
  /** Màn hình mặc định hạ cánh khi đăng nhập */
  customLandingTab?: TabKey;
  /** Phạm vi dữ liệu hiệu lực, máy chủ gắn theo cấu hình phân quyền đã lưu. */
  dataScope?: DataScope;
  /** Tên nhân sự trong phạm vi (bản thân + team / khối), máy chủ tính sẵn cho TEAM và DEPARTMENT. */
  scopeMemberNames?: string[];
}

export interface DepartmentAccessRule {
  id: string;
  departmentOrTeamName: string;
  mappedScope: SystemDepartmentScope;
  defaultRole: UserRole;
  defaultManagerName: string;
  autoAllowLogin: boolean;
  staffCount: number;
  allowedCount: number;
  description: string;
}

// =========================================================================
// THIRD-PARTY GMAIL ACCESS & RBAC (PHÂN QUYỀN ĐỐI TÁC BÊN THỨ 3)
// =========================================================================
export interface ThirdPartyAccessAccount {
  id: string;
  gmail: string; // Email Gmail của đối tác
  displayName: string; // Tên hiển thị người dùng
  avatarUrl?: string;
  partnerType: 'BRAND' | 'KOC' | 'CTV';
  linkedEntityId: string; // ID Brand / KOC / CTV
  linkedEntityName: string; // Tên Brand (Kutieskin) hoặc KOC (Chloe Nguyễn)
  linkedStoreNames?: string[]; // Gian hàng được xem
  permissions: {
    canApproveDeals?: boolean; // Duyệt KOC / Job
    canReviewScripts?: boolean; // Duyệt kịch bản
    canViewGmvAndRoas?: boolean; // Xem GMV và ROAS
    canViewFinancials?: boolean; // Xem chi phí giá net
    canSubmitVideos?: boolean; // Nộp video
    canProvideSparkAds?: boolean; // Cung cấp mã Ads
    canClaimSamples?: boolean; // Nhận mẫu
  };
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  lastLoginAt?: string;
  loginCount: number;
  invitedAt?: string;
  invitedBy?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export type PermissionAccessLevel = 'ALL' | 'SCOPED' | 'VIEW' | 'APPROVE' | 'DENIED';

export interface PermissionMatrixItem {
  id: string;
  category: 'PLANNING' | 'BOOKING_CONTENT' | 'CONTRACTS_FINANCE' | 'PERFORMANCE_ADS' | 'SYSTEM_MASTER';
  categoryTitle: string;
  featureName: string;
  description: string;
  permissions: Record<string, PermissionAccessLevel>;
  securityNote?: string;
}

export interface InternalStaffRbacMember {
  id: string;
  staffCode?: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  team?: string;
  location?: string;
  employmentType?: string;
  departmentScope?: SystemDepartmentScope;
  canLogin?: boolean;
  accessSource?: 'ADMIN_EXPLICIT' | 'DEPT_RULE' | 'BLOCKED_DEPT' | 'REVOKED';
  managerId?: string;
  managerName?: string;
  position: string;
  picBrands: string[];
  permissions: {
    canApproveBudget: boolean;
    canApproveP3: boolean;
    canApprovePayment: boolean;
    canViewAllBrands: boolean;
    canExportRawData: boolean;
    canManageMasterData: boolean;
  };
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive: string;
  authMethod: 'LARK_SSO';
}

export interface RbacAuditLogItem {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  actionType: 'LOGIN' | 'LOGIN_BLOCKED' | 'ROLE_CHANGE' | 'PERMISSION_TOGGLE' | 'IMPERSONATE' | 'INVITE_PARTNER' | 'SUSPEND_USER' | 'ACCESS_GRANT' | 'ACCESS_REVOKE' | 'DEPT_RULE_UPDATE';
  targetUserOrEntity: string;
  description: string;
  ipAddress: string;
  deviceInfo: string;
  status: 'SUCCESS' | 'WARNING';
}


export type KocTier = 'TIER_1_CELEB' | 'TIER_2_MACRO' | 'TIER_3_MICRO' | 'TIER_4_AFFILIATE';

// 1. KHUNG LƯƠNG (KL) - Chuẩn hóa Sheet 3.1 & 5.6
export type SalaryGrade = 
  | 'TAP UpAffiliate'
  | 'KL1'
  | 'KL2'
  | 'KL3'
  | 'KL4'
  | 'KL5'
  | 'KL6'
  | 'KL7'
  | 'TAP đối tác ngoài';

// 2. SEGMENT - Phân nhóm Creator theo vai trò chiến lược (Sheet 3.2 Col 81 & 5.6)
export type CreatorSegment = 
  | 'Massive Creator'
  | 'Mid Creator'
  | 'Key Creator'
  | 'Top Creator';

// 3. KOC CATEGORY - Ngành hàng / Lĩnh vực KOC (Sheet 3.2 Col 87 & 5.4)
export type KocCategory = 
  | 'Personal care'
  | 'Mom and baby'
  | 'Reviewer'
  | 'Lifestyle'
  | 'Fashion'
  | 'ELHA'
  | 'F&B'
  | 'Social / Comedian'
  | 'Travel/Hospitality';

// 4. TỆP KÊNH - 25 tệp chuẩn hóa trong vận hành Upbase (Sheet 3.1 Col 23 & 5.4)
export type TepKenh = 
  | 'Review Nữ'
  | 'Review Nam'
  | 'Unboxing'
  | 'Seller'
  | 'Mẹ bé (bầu)'
  | 'Mẹ bé (bé)'
  | 'Gia đình'
  | 'Couple'
  | 'Beauty'
  | 'Health'
  | 'Makeup Artist'
  | 'Tóc'
  | 'Bác sỹ/chuyên gia'
  | 'Gym'
  | 'Eat Clean'
  | 'Thời trang (review)'
  | 'Thời trang (có kiến thức)'
  | 'Lifestyle'
  | 'Nhà cửa đời sống'
  | 'Cooking'
  | 'Thú cưng'
  | 'POV'
  | 'Dance'
  | 'Cosplay'
  | 'Tin tức'
  | 'LGBT'
  | 'KOL'
  | 'Nữ xinh'
  | 'Chưa phân loại';

// Alias backward compatibility
export type CreatorNiche = TepKenh;

// Hàm hỗ trợ tự động xác định KL từ đơn giá video net
export function getSalaryGradeFromRate(rate: number): SalaryGrade {
  if (rate <= 0) return 'TAP UpAffiliate';
  if (rate <= 500000) return 'KL1';
  if (rate <= 1500000) return 'KL2';
  if (rate <= 3000000) return 'KL3';
  if (rate <= 5000000) return 'KL4';
  if (rate <= 10000000) return 'KL5';
  if (rate <= 30000000) return 'KL6';
  return 'KL7';
}

// Hàm hỗ trợ tự động xác định Segment từ Khung Lương (KL)
export function getSegmentFromSalaryGrade(kl: SalaryGrade): CreatorSegment {
  switch (kl) {
    case 'TAP UpAffiliate':
    case 'KL1':
    case 'KL2':
    case 'KL3':
      return 'Massive Creator';
    case 'KL4':
    case 'KL5':
      return 'Mid Creator';
    case 'KL6':
      return 'Key Creator';
    case 'KL7':
      return 'Top Creator';
    case 'TAP đối tác ngoài':
      return 'Key Creator';
    default:
      return 'Massive Creator';
  }
}

export type ContentPillarType =
  | 'Review trực tiếp'
  | 'Nỗi đau - Giải pháp'
  | 'Unboxing'
  | 'FOMO'
  | 'Daily Vlog'
  | 'Educate'
  | 'Chưa phân loại';

// =========================================================================
// AI OCR LEGAL DOCUMENT EXTRACTION (CCCD & ĐĂNG KÝ KINH DOANH)
// =========================================================================

export type LegalDocumentType = 'CCCD' | 'BUSINESS_LICENSE' | 'BUSINESS_HOUSEHOLD' | 'UNKNOWN';

export interface OcrExtractedFields {
  // Cá nhân (CCCD)
  idNumber?: string;            // Số CCCD / Số định danh (12 số)
  fullName?: string;            // Họ và tên
  dob?: string;                 // Ngày sinh
  gender?: string;              // Giới tính
  nationality?: string;         // Quốc tịch
  originAddress?: string;       // Quê quán
  permanentAddress?: string;    // Nơi thường trú
  issueDate?: string;           // Ngày cấp
  issuePlace?: string;          // Nơi cấp
  expiryDate?: string;          // Có giá trị đến

  // Doanh nghiệp / Hộ kinh doanh
  companyName?: string;         // Tên công ty / Tên hộ kinh doanh
  householdBusinessName?: string; // Tên hộ kinh doanh
  taxCode?: string;             // Mã số thuế / Mã số doanh nghiệp
  headquartersAddress?: string; // Địa chỉ trụ sở chính
  legalRepresentative?: string; // Người đại diện theo pháp luật / Chủ hộ
  legalRepTitle?: string;       // Chức danh (Giám đốc, Người đại diện...)
  registrationDate?: string;    // Ngày cấp đăng ký kinh doanh
  charterCapital?: string;      // Vốn điều lệ (nếu có)
  businessLines?: string[];     // Ngành nghề kinh doanh chính
}

export interface RecommendedContractTemplate {
  templateCode: string;
  templateName: string;
  formType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  sampleFileName: string;
  requiresContract: boolean;
  legalRules: string[];
}

// 4 MẪU HỢP ĐỒNG CHUẨN HOÁ CHO PHÉP CHỌN & ĐIỀN THỦ CÔNG
export type ContractTemplateType = 
  | 'KOC_INDIVIDUAL'       // HĐ Dịch Vụ Quảng Bá KOC Cá Nhân (Thuế TNCN 10%)
  | 'BUSINESS_ENTERPRISE'  // HĐ Dịch Vụ Quảng Bá Pháp Nhân Doanh Nghiệp / Hộ Kinh Doanh (VAT)
  | 'AFFILIATE_LIVESTREAM' // HĐ Tiếp Thị Liên Kết & Livestream (Hoa Hồng GMV)
  | 'ANNEX_SETTLEMENT';    // Phụ Lục Hợp Đồng & Biên Bản Nghiệm Thu Quyết Toán

export interface ManualContractFormData {
  templateType: ContractTemplateType;
  contractCode: string;
  signDate: string;
  effectiveDate: string;

  // Bên A (Upbase)
  partyAName: string;
  partyARepresentative: string;
  partyAPosition: string;
  partyAAddress: string;
  partyAPhone: string;
  partyATaxCode: string;

  // Bên B (KOC / Đối tác cung cấp dịch vụ)
  partyBType: 'INDIVIDUAL' | 'BUSINESS';
  partyBName: string;
  partyBStageName: string;
  partyBIdNumber: string; // CCCD (12 số) hoặc Mã số thuế
  partyBIssueDate: string;
  partyBIssuePlace: string;
  partyBAddress: string;
  partyBPhone: string;
  partyBEmail: string;
  partyBRepresentative?: string;
  partyBRepTitle?: string;

  // Ngân hàng Bên B
  bankAccount: string;
  bankName: string;
  bankAccountName: string;

  // Điều 1: Phạm vi dịch vụ & Cam kết
  campaignTitle: string;
  brandName: string;
  productName: string;
  deliverablesText: string;
  videoCount: number;
  sparkAdsDays: number;
  deadlinePost: string;
  scriptSlaHours: number;
  customClauses: string;

  // Điều 2: Giá trị dịch vụ & Lịch thanh toán
  totalValue: number;
  advanceRatePercent: number;
  advanceAmount: number;
  advanceCondition: string;
  finalAmount: number;
  finalCondition: string;
  taxPolicyNote: string;
}

export interface OcrLegalExtractionResult {
  documentType: LegalDocumentType;
  documentTypeLabel: string;
  confidence: number;           // 0.0 - 1.0 (ví dụ 0.96)
  extractedAt: string;
  fileName?: string;
  filePreviewUrl?: string;
  fields: OcrExtractedFields;
  recommendedTemplate: RecommendedContractTemplate;
  validationNotes: string[];
  rawTextPreview?: string;
}

export interface KocItem {
  id: string;
  channelId: string; // ID kênh (vd: megauriviu, chanhbeauty)
  channelLink?: string; // Link kênh (https://www.tiktok.com/@...)
  stageName: string;
  realName: string;
  tier: KocTier;
  tierLabel: string;

  // 4 TRƯỜNG PHÂN LOẠI CỐT LÕI (Sheet 3.1 & 3.2 & 5.4 & 5.6):
  salaryGrade: SalaryGrade; // 1. Khung lương (TAP, KL1 → KL7, TAP đối tác ngoài)
  segment: CreatorSegment; // 2. Phân nhóm Creator (Massive, Mid, Key, Top)
  tepKenh: TepKenh; // 3. Tệp kênh (25 tệp chuẩn: Review Nữ, Mẹ bé (bầu), Beauty, ELHA...)
  creatorCategory?: CreatorNiche; // Alias backward-compatibility cho tepKenh
  kocCategory: KocCategory; // 4. KOC category (9 nhóm ngành: Personal care, Mom and baby, Reviewer...)
  field?: string;
  workedBrands?: string[];
  lastCoopDate?: string;

  niche: string;
  followers: number; // Follower
  avgViews: number; // View trung bình
  rateCardVideo: number; // Giá net video
  bookingFormat?: 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần' | 'Phiên Livestream'; // Định dạng booking

  // Nền tảng mạng xã hội hoạt động (TikTok, Shopee, Facebook, Instagram, Threads)
  platforms?: ('TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS')[];
  tiktokChannel?: string;
  tiktokChannels?: string[];
  connectedChannels?: KocConnectedChannel[];
  shopeeChannel?: string;
  facebookChannel?: string;
  instagramChannel?: string;
  threadsChannel?: string;
  
  // Thông tin liên hệ & Hậu cần nhận hàng gửi mẫu (Sample Shipping - Rất quan trọng cho Booking)
  phone?: string;
  zalo?: string;
  email?: string;
  shippingAddress?: string; // Thông tin nhận hàng (Địa chỉ, người nhận, SĐT)
  location?: string; // Khu vực (Hà Nội, TP.HCM, Miền Bắc, Miền Nam...)
  otherContactMethod?: string;

  // Pháp lý & Thanh toán (Hợp đồng & VietQR)
  cccd?: string;
  bankName?: string;
  bankAccount?: string;
  avatarUrl?: string;

  // Pháp lý & Xác thực OCR CCCD / ĐKKD
  isOcrVerified?: boolean;
  ocrDocumentType?: LegalDocumentType;
  ocrVerifiedAt?: string;
  taxCode?: string;
  companyName?: string;
  permanentAddress?: string;
  dob?: string;
  issueDate?: string;
  issuePlace?: string;
  legalRepresentative?: string;

  // Chỉ số E-Commerce & Bán hàng (TikTok Shop / Shopee Analytics)
  gmvBestCase?: number; // GMV best case
  recentRevenue?: number; // Doanh số (nếu có)
  itemsSold?: number; // Số món bán ra
  gpm?: number; // GPM (Doanh thu/1000 lượt hiển thị)
  aov?: number; // AOV (Giá trị trung bình đơn hàng)
  gmvShareVideo?: number; // Tỉ trọng GMV từ video (%)
  gmvShareLive?: number; // Tỉ trọng GMV từ livestream (%)
  gmvShareProductCard?: number; // Tỉ trọng GMV từ thẻ sản phẩm (%)
  metricsUpdatedAt?: string; // ISO — lần cập nhật chỉ số bán hàng / khán giả gần nhất

  // ==========================================
  // BỘ CHỈ SỐ TÍCH HỢP TỪ TIKTOK SELLER
  // ==========================================
  tiktokSellerSyncedAt?: string; // Thời điểm đồng bộ từ TikTok Seller Center
  tiktokShopRating?: number; // Điểm uy tín nhà sáng tạo TikTok Shop (VD: 4.8 / 5.0)
  tiktokCancellationRate?: number; // Tỷ lệ hủy/hoàn đơn hàng liên kết (VD: 1.8%)
  tiktokAccountHealth?: 'TỐT' | 'CẢNH_BÁO' | 'VI_PHẠM'; // Tình trạng rủi ro tài khoản TikTok Shop
  tiktokFollowerGrowth30d?: number; // Tăng trưởng follower 30 ngày (+12,400)
  tiktokTotal30dViews?: number; // Tổng lượt xem video 30 ngày qua
  tiktokAvgCtr?: number; // Tỷ lệ nhấp giỏ hàng / showcase (%)
  tiktokAvgCvr?: number; // Tỷ lệ chốt đơn trên lượt nhấp (%)
  tiktokAvgCommissionRate?: number; // Tỷ lệ hoa hồng trung bình (%)
  tiktokTopCategories?: string[]; // Ngành hàng bán chạy trên kênh (Mỹ phẩm, Mẹ & Bé...)
  tiktokAudienceLocations?: { city: string; ratio: number }[]; // Top tỉnh thành khán giả

  // ==========================================
  // HẬU CẦN GỬI HÀNG MẪU (SAMPLE SHIPPING)
  // ==========================================
  shippingRecipientName?: string; // Người nhận hàng (nếu khác tên KOC)
  shippingPhone?: string; // Số điện thoại nhận hàng
  shippingNotes?: string; // Ghi chú giao hàng (gửi lễ tân, giờ hành chính...)
  samplePreferences?: {
    skinType?: string; // Tình trạng da (Dược mỹ phẩm: da dầu mụn, nhạy cảm...)
    clothingSize?: string; // Size quần áo (Fashion: S, M, L...)
    shoeSize?: string; // Size giày
    babyAgeMonths?: number; // Độ tuổi con (Mẹ & Bé: số tháng tuổi)
    babyWeightKg?: number; // Cân nặng con
    specialNotes?: string; // Lưu ý dị ứng/thành phần
  };

  // Nhân khẩu học Follower (Audience Demographics)
  femaleRatio?: number; // Tỉ trọng follower Nữ (%)
  maleRatio?: number; // Tỉ trọng follower Nam (%)
  age18_24?: number; // Tỉ trọng follower 18 - 24 tuổi (%)
  age25_34?: number; // Tỉ trọng follower 25 - 34 tuổi (%)
  age35Plus?: number; // Tỉ trọng follower > 35 tuổi (%)

  // Vận hành & Phê duyệt Brand
  brandName?: string; // Brand / Store phù hợp hoặc đề xuất
  brandApprovalStatus?: 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI'; // Brand duyệt
  brandRejectReason?: string; // Lý do Brand từ chối
  statusKoc?: 'SẴN_SÀNG' | 'ĐANG_LIÊN_HỆ' | 'TỪ_CHỐI' | 'ĐÃ_KÝ'; // Trạng thái KOC
  currentPipeline?: string; // Pipeline (Đã duyệt, Đã tạo BO, Gửi hàng, Đã air...)
  bookingPic?: string; // Booking PIC (Nhân sự phụ trách)
  contentNote?: string; // Content note / Đề xuất từ UpBase
  accountComment?: string; // Leader/Growth/Account comment

  // Lịch sử booking tại Upbase (Chuẩn hóa từ Danh bạ Master KOC & File 3.2)
  reliabilityScore: number;
  totalPastDeals?: number;
  totalPaidVideos?: number; // Tổng Video Paid lịch sử
  totalFocVideos?: number; // Tổng Video FOC lịch sử
  totalPastGmv?: number;
  totalPastCost?: number;
  historicalRoi?: number;
  isWinnerTop20?: boolean;
  minRate?: number; // Đơn giá thấp nhất lịch sử (VNĐ)
  maxRate?: number; // Đơn giá cao nhất lịch sử (VNĐ)
  taxAccountType?: string; // Loại tài khoản thuế: (VAT 8%) Tài khoản doanh nghiệp / (Thuế TNCN 10%) Tài khoản cá nhân
  collabGroupLabel?: string; // Nhóm hợp tác: Paid + FOC / KOC Trả phí (Paid) / KOC Miễn phí (FOC)
  latestBookMonth?: string; // Tháng / Ngày book gần nhất (VD: 2026/10)
  latestBoCode?: string; // Mã BO gần nhất (VD: BO260961606)
  workedPicsCount?: number; // Số PIC từng làm việc
  workedPicsList?: string; // Danh sách các PIC từng làm việc
  sharedMcnInfo?: string; // MCN / Danh sách các kênh dùng chung CCCD-MST
  contractDriveUrl?: string; // Link thư mục Hợp đồng Google Drive
  alternatePayees?: KocPayeeProfile[]; // Danh sách các hồ sơ CCCD/MST & TK thụ hưởng từng dùng qua các đợt nghiệm thu

  // Mở rộng chỉ số kênh & nhân khẩu học cho KocKolHubView
  rateCardLive?: number;
  followerGrowth30dPct?: number;
  tiktokGmv30d?: number;
  avgOrderValue?: number;
  ctrPct?: number;
  cvrPct?: number;
  avgCommissionPct?: number;
  shopRatingScore?: number;
  cancellationRatePct?: number;
  revenueShareByFormat?: { videoPct: number; livePct: number; showcasePct: number };
  audienceGender?: { femalePct: number; malePct: number };
  audienceTopAge?: { age18_24Pct: number; age25_34Pct: number; age35PlusPct?: number };
  audienceTopLocations?: string[];

  // Dữ liệu thu thập từ kênh TikTok & TikTok Shop Creator Marketplace
  bio?: string; // Tiểu sử kênh TikTok (chứa thông tin giới thiệu, SĐT/Email liên hệ)
  totalLikes?: number; // Tổng lượt thích trên toàn kênh TikTok
  videoCount?: number; // Tổng số video đã đăng trên kênh
  medianViews?: number; // Lượt xem trung vị trên các video gần nhất (chống lệch do bài xu hướng đột biến)
  avgLikes?: number; // Lượt tim trung bình trên các video gần nhất
  avgComments?: number; // Lượt bình luận trung bình trên các video gần nhất
  avgShares?: number; // Lượt chia sẻ trung bình trên các video gần nhất
  engagementRate?: number; // Tỷ lệ tương tác trung bình ER% ((Tim + Bình luận + Chia sẻ) / View * 100)
  recentVideos?: TikTokVideoItem[]; // Danh sách video & nội dung gần nhất trên kênh

  // ==========================================
  // TỔ CHỨC 2 BẢNG DỮ LIỆU KOC & QUAN HỆ 1 KOC -> N HỒ SƠ PHÁP LÝ (ERD kol-connector)
  // ==========================================
  datasetType?: 'COOPERATED' | 'NEW'; // Bảng 1: KOC Cũ kèm lịch sử (COOPERATED) | Bảng 2: KOC Mới / Tiềm năng (NEW)
  legalProfiles?: KocLegalProfile[]; // Quan hệ 1:N từ creator -> creator_legal_profile + creator_payment_account
  bookingReadiness?: KocBookingReadiness; // Độ sẵn sàng booking (dành cho KOC Mới / Tiềm năng)
  missingInfoCategory?: string; // Phân loại tình trạng thiếu thông tin (ERD Col 13/17)
  missingFieldsDetail?: string; // Chi tiết các trường còn thiếu (CCCD, STK, SĐT/Zalo, Địa chỉ...)
  cccdAuditFlag?: string; // Cờ đối soát CCCD (1 CCCD duy nhất / Có >1 CCCD / Dùng chung CCCD)
  proposedStores?: string; // Danh sách các gian hàng đã đề xuất KOC này (Sheet 3.1 / 3.4)
  sourceSheet?: string; // Nguồn phát hiện KOC (3.4 List KOCs tổng hợp, 3.1 List KOC chưa duyệt, TikTok Scraper...)
  appearancesCount?: number; // Số lần xuất hiện trong các đợt đề xuất
  contactStatus?: 'ĐÃ_LIÊN_HỆ' | 'CHƯA_LIÊN_HỆ' | 'ĐANG_THƯƠNG_LƯỢNG' | 'TỪ_CHỐI'; // Trạng thái tiếp cận KOC mới
  contactHistory?: KocContactLogItem[]; // Lịch sử liên hệ với KOC (theo đặc tả Quản lý thông tin KOC)
  upaffiliateCreatorId?: string; // Mã định danh Creator trên UpAffiliate (VD: UPA-CR-0001)
  upaffiliateSyncStatus?: 'SYNCED' | 'LOCAL_MODIFIED' | 'PENDING_PUSH' | 'CONFLICT';
  upaffiliateSyncedAt?: string; // Thời điểm đồng bộ gần nhất với UpAffiliate
  upaffiliateRevision?: number; // Phiên bản bản ghi trên UpAffiliate
}

export type KocPlatformType = 'TIKTOK' | 'SHOPEE' | 'FACEBOOK' | 'INSTAGRAM' | 'THREADS' | 'YOUTUBE';

export interface KocConnectedChannel {
  id: string;
  platform: KocPlatformType;
  handle: string; // @handle hoặc tên tài khoản/trang
  channelName?: string; // Tên hiển thị kênh
  url?: string; // Link đầy đủ tới kênh
  isPrimary?: boolean; // Kênh chính trên nền tảng
  roleLabel?: string; // VD: 'Kênh TikTok chính', 'Kênh TikTok phụ / Vlog', 'Kênh Review', 'Kênh Livestream'
  followers?: number;
  avgViews?: number;
  linkedKocId?: string; // Nếu được gom từ 1 bản ghi KOC khác thuộc cùng 1 cá nhân chủ sở hữu
}

export type KocBookingReadiness =
  | 'SẴN_SÀNG_BOOKING'
  | 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ'
  | 'CẦN_XIN_LIÊN_HỆ'
  | 'CHỜ_TIẾP_CẬN';

export interface KocContactLogItem {
  id: string;
  contactedAt: string; // Thời gian liên hệ (VD: 2026-10-20 14:30)
  picName: string; // Nhân sự liên hệ
  channel: 'Zalo' | 'TikTok DM' | 'Email' | 'Điện thoại' | 'Lark';
  summary: string; // Nội dung trao đổi / phản hồi báo giá
  outcome?: 'ĐÃ_PHẢN_HỒI' | 'CHƯA_PHẢN_HỒI' | 'ĐỒNG_Ý_BÁO_GIÁ' | 'TỪ_CHỐI';
}

export type LegalDocCategory =
  | 'CCCD_FRONT'      // CCCD mặt trước
  | 'CCCD_BACK'       // CCCD mặt sau
  | 'CCCD_SCAN'       // Bản scan CCCD 2 mặt (PDF / Ảnh)
  | 'DKKD'            // Giấy phép Đăng ký kinh doanh / Hộ kinh doanh
  | 'AUTHORIZATION'   // Giấy ủy quyền ký hợp đồng / Nhận thanh toán
  | 'TAX_COMMITMENT'; // Cam kết thuế / Hồ sơ pháp lý khác

export interface LegalDocAttachment {
  id: string;
  docType: LegalDocCategory;
  label: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storage: 'R2' | 'LOCAL';
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

/**
 * Thực thể Hồ sơ pháp lý & Tài khoản thụ hưởng của KOC (1 KOC -> N KocLegalProfile).
 * Giải quyết bài toán thực tế:
 * - KOC chuyển đổi từ Cá nhân (TNCN 10%) -> Hộ kinh doanh (HKD) -> Công ty/MCN (VAT 8%) hoặc ngược lại.
 * - KOC dùng CCCD/Tài khoản ngân hàng của người thân (có ủy quyền) hoặc đổi số CCCD 9 số -> 12 số.
 * - Mỗi hồ sơ pháp lý gắn với tài khoản ngân hàng thụ hưởng và Hợp đồng nguyên tắc (HĐNT) tương ứng.
 */
export interface KocLegalProfile {
  id: string;
  profileCode: string; // VD: HSPL-01, HSPL-02
  legalType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  isDefault: boolean; // Hồ sơ mặc định dùng để tự động điền khi tạo Booking Deal / Hợp đồng mới
  status: 'ACTIVE' | 'ARCHIVED' | 'PENDING_VERIFY';
  taxAccountType: string; // VD: (Thuế TNCN 10%) Tài khoản cá nhân | Hộ kinh doanh xuất hóa đơn | (VAT 8%) Tài khoản doanh nghiệp
  holderName: string; // Họ tên cá nhân đứng tên hợp đồng / Tên Hộ kinh doanh / Tên Công ty MCN
  representativeName?: string; // Người đại diện pháp luật (nếu là Công ty/HKD) hoặc Người ủy quyền
  representativeTitle?: string; // Chức vụ người đại diện (VD: Giám đốc, Tổng Giám Đốc)
  authorizationNumber?: string; // Số văn bản ủy quyền (nếu ký theo ủy quyền)
  authorizationDate?: string; // Ngày văn bản ủy quyền
  bankHolderName?: string; // Tên chủ tài khoản ngân hàng (nếu khác holderName)
  relationshipNote?: string; // Chính chủ KOC | Người thân nhận ủy quyền | Công ty MCN quản lý | Hộ kinh doanh cá thể
  cccd?: string; // Số CCCD/CMND (9 hoặc 12 số)
  cccdIssueDate?: string;
  cccdIssuePlace?: string;
  taxCode?: string; // Mã số thuế cá nhân / HKD / Doanh nghiệp
  businessLicenseNo?: string; // Số ĐKKD
  registeredAddress?: string; // Địa chỉ thường trú hoặc địa chỉ ĐKKD trên hợp đồng
  bankName?: string; // Ngân hàng thụ hưởng gắn với pháp nhân này
  bankAccount?: string; // Số tài khoản ngân hàng thụ hưởng
  bankBranch?: string;
  bankAccountNumber?: string;
  taxRateLabel?: string;
  vatRatePercent?: number;
  pitRatePercent?: number;
  contactPhone?: string;
  contactEmail?: string;
  relationshipToKoc?: string;
  isOcrVerified?: boolean;
  /** Danh sách tệp đính kèm CCCD (mặt trước/mặt sau/scan), Giấy phép ĐKKD, Ủy quyền lưu trên Cloudflare R2 */
  legalAttachments?: LegalDocAttachment[];
  // Hợp đồng nguyên tắc (HĐNT) gắn liền với pháp nhân này
  frameworkContractCode?: string; // VD: HDNT-2026-0028
  frameworkContractStatus?: 'CHƯA_KÝ' | 'ĐANG_TRÌNH_KÝ' | 'ĐÃ_KÝ' | 'HẾT_HẠN';
  frameworkContractSignedAt?: string;
  frameworkContractDriveUrl?: string;
  // Thống kê lịch sử sử dụng pháp nhân này trong các đợt nghiệm thu
  dealsUsedCount?: number;
  latestBrandUsed?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  upaffiliateLegalProfileId?: string;
  upaffiliateSyncedAt?: string;
  notes?: string;
}

export interface TikTokVideoItem {
  videoId: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  musicTitle: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number; // ER%
  isAffiliate: boolean;
  isViralOutlier?: boolean;
  isPinnedOldVideo?: boolean;
  productId?: string;
  productUrl?: string;
  cartProducts?: {
    productId?: string;
    title: string;
    productUrl: string;
    source?: string;
  }[];
  productName?: string;
  estimatedGmv?: number;
  itemsSold?: number;
  commissionRate?: number;
}

export interface KocPayeeProfile {
  legalId: string; // Số CCCD (12 số) hoặc MST (10/13 số)
  holderName: string; // Họ tên chủ tài khoản / Tên công ty MCN
  bankName?: string;
  bankAccount?: string;
  taxAccountType?: string;
  dealsCount?: number;
  latestBrand?: string;
}

export type KocMasterItem = KocItem;

export type DealStatus = 
  | 'DRAFT'
  | 'CONTACTING'
  | 'TERMS_AGREED'
  | 'SCRIPT_PENDING'
  | 'SCRIPT_APPROVED'
  | 'CONTRACT_GENERATED'
  | 'ADVANCE_PAID'
  | 'SAMPLE_SHIPPED'
  | 'SAMPLE_RECEIVED'
  | 'VIDEO_SUBMITTED'
  | 'VIDEO_VERIFIED'
  | 'FINAL_PAID'
  | 'COMPLETED'
  | 'CANCELLED';

export type BrandApprovalStatus = 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI';
export type KocJobResponseStatus = 'ĐỒNG_Ý' | 'TỪ_CHỐI' | 'ĐANG_THƯƠNG_LƯỢNG';

export type MediaChannelPlatform = 'TikTok' | 'Facebook' | 'Instagram' | 'Shopee Video' | 'YouTube' | 'Threads';
export type AffiliateChannelPlatform = 'TikTok Shop' | 'Shopee' | 'Lazada' | 'Không gắn giỏ';
export type BookingDealType = 'SINGLE_CONTENT' | 'MULTI_PLATFORM_CONTENT' | 'SERVICE_ONLY';
export type KocPricingDisplayMode = 'PACKAGE_TOTAL' | 'ITEMIZED_SOW';

export interface DealDeliverableItem {
  id: string;
  title: string;
  mediaChannel: MediaChannelPlatform; // Nơi KOC đăng tải nội dung
  affiliateChannel: AffiliateChannelPlatform; // Sàn gắn link nhận hoa hồng & chịu P&L
  productionType: 'ORIGINAL' | 'CROSS_POST' | 'REUP';
  wave: 0 | 1; // Wave 0: Bài gốc sản xuất trước | Wave 1: Bài phụ thuộc chờ nghiệm thu Wave 0
  dependsOnDeliverableId?: string;
  lockStatus: 'UNLOCKED' | 'LOCKED_BY_WAVE_0' | 'VERIFIED' | 'DROPPED';
  assignedChannelPic: string; // Hỗ trợ Multi-PIC (mỗi sàn/kênh có thể do chuyên viên khác nhau phụ trách)
  allocatedWeightPct: number; // Tỷ trọng phân bổ P&L định mức chuẩn (VD: 70% bài gốc, 15% reup)
  allocatedCostVnd: number; // Chi phí P&L phân bổ cho hạng mục này
  airDate?: string;
  publishedUrl?: string;
}

export interface DealRightsTermItem {
  id: string;
  termType: 'ADS_CODE' | 'IMAGE_USAGE' | 'EXCLUSIVITY' | 'LINK_BIO_CART' | 'CROSS_POST_REUP';
  termLabel: string;
  scopeType: 'ASSET' | 'MEDIA_CHANNEL' | 'DEAL'; // 3 tầng phạm vi: Bài lẻ | Kênh | Toàn Deal
  targetDeliverableId?: string;
  targetMediaChannel?: MediaChannelPlatform;
  anchorType: 'AIR_DATE' | 'ACCEPTANCE_DATE'; // Mốc tính hạn: Ngày lên bài (Độc quyền) | Ngày nghiệm thu (Mã Ads/Hình ảnh)
  durationDays: number;
  expiresAt?: string;
  allocatedWeightPct?: number;
  allocatedCostVnd?: number;
  status: 'ACTIVE' | 'PENDING_ANCHOR' | 'EXPIRING_SOON' | 'EXPIRED';
  acceptanceStatus?: 'LOCKED_BY_VIDEO' | 'PENDING_ACCEPTANCE' | 'VERIFIED' | 'DROPPED';
  evidenceCodeOrUrl?: string; // Mã Spark Ads, link bài đăng chéo Wave 1, hoặc link bàn giao file raw/hình ảnh
  verifiedAt?: string;
}

export type DealContractAppendixStatus = 'CHƯA_LẬP' | 'CHỜ_KÝ' | 'ĐÃ_KÝ';

/**
 * 1 Job trong Deal = 1 Bảng công việc độc lập trong Phụ lục SOW (1 Deal -> N Jobs -> N Bảng công việc).
 * Mỗi Job có sản phẩm, kênh đăng, ngày air, đơn giá Video chính và danh sách dịch vụ đi kèm riêng.
 */
export interface DealSowJobItem {
  id: string;
  jobCode: string; // VD: BO261035101-J01, BO261035101-J02
  jobTitle: string; // VD: Bảng công việc #1 — Video TikTok Review Kem dưỡng
  productName: string; // Sản phẩm / Chiến dịch của Job này
  sanPham?: string; // Tương thích ngược với mã nghiệp vụ dùng sanPham
  mediaChannel?: MediaChannelPlatform; // Kênh đăng tải (TikTok, Facebook, Instagram, Shopee Video...)
  affiliateChannel?: AffiliateChannelPlatform; // Sàn gắn giỏ hàng
  plannedAirDate: string; // Ngày dự kiến đăng tải (YYYY-MM-DD)
  actualAirDate?: string; // Ngày đăng tải thực tế
  linkAir?: string; // Link bài đăng nghiệm thu của Job này
  sparkAdsCode?: string; // Mã ủy quyền Spark Ads của Job này
  videoAssetNetCost: number; // Chi phí Net của Hạng mục 1 (Sản xuất & đăng tải Video) trong Bảng công việc này
  addonServicesNetCost?: number; // Chi phí Net các hạng mục phụ đi kèm
  quantity?: number; // Số lượng đầu ra của Job (mặc định 1)
  addonServices: DealRightsTermItem[]; // Các hạng mục công việc đi kèm trong Bảng công việc của Job này
  acceptanceStatus?: 'CHUA_NGHIEM_THU' | 'DA_NGHIEM_THU';
  notes?: string;
}
export type DealSequentialAcceptanceStage =
  | '1_CHO_NGHIEM_THU_VIDEO'
  | '2_DA_NGHIEM_THU_VIDEO_CHO_PHAN_KHAC'
  | '3_DA_NGHIEM_THU_TOAN_DEAL';

export interface DealRevisionItem {
  version: number;
  updatedAt: string;
  updatedBy: string;
  summary: string;
  changedFields: {
    fieldLabel: string;
    oldValue: string;
    newValue: string;
  }[];
}

export interface BookingDealItem {
  id: string;
  dealCode: string; // Mã BO (ví dụ: BO260757834, BO26_CHANH_1010)
  jobId?: string; // Mã ID Job tác nghiệp (ví dụ: ID260952684, ID260747077)
  campaignId?: string; // Khóa ngoại trỏ tới Campaign chuẩn (e.g. camp-1, camp-2)
  campaignCode: string;
  campaignTitle: string;
  
  // Brand & Store & Sản phẩm của Job này (Cốt lõi theo Job)
  brandName: string; // Brand (Kutieskin Mama, Royal Ausnz, Nature's Way, Bye Bye Blemish, pHCare, Babe...)
  storeId?: string; // Khóa ngoại trỏ tới Store chuẩn (e.g. ST-SO0001, ST-SO1000)
  storeName?: string; // Store (Kutieskin Mama_TikTok_E2E-S, Fresh_TikTok_E2E-C...)
  productName?: string; // Sản phẩm (Mặt nạ rau má Premium, Nước tắm/kem tuti, Quạt tuần hoàn...)
  bookingBatch?: string; // Đợt (Đợt 1, Đợt 2, Đợt 3)
  bookingFormat?: 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần' | 'Phiên Livestream';
  assignedStaffId?: string; // Khóa ngoại nhân sự phụ trách trực tiếp deal (e.g. st-1, st-2)
  
  // KOC Reference & 4 Phân loại cốt lõi (Sheet 3.1 & 3.2)
  kocId: string;
  kocStageName: string;
  kocChannelId?: string;
  targetChannels?: string[];
  kocTier: KocTier;
  salaryGrade: SalaryGrade; // 1. Khung lương
  segment: CreatorSegment; // 2. Phân nhóm Creator
  tepKenh: TepKenh; // 3. Tệp kênh
  creatorCategory?: CreatorNiche; // Alias backward-compatibility
  kocCategory: KocCategory; // 4. KOC category
  contentPillar: ContentPillarType;
  contentAngleId?: string; // ID góc nội dung (Content Angle) cụ thể của sản phẩm
  contentAngleName?: string; // Tên góc tiếp cận (VD: Cứu nguy da bé chàm sữa nửa đêm)
  contentHook?: string; // Hook 3 giây đầu gợi ý cho KOC
  
  // Phê duyệt của Brand (THEO TỪNG JOB CỤ THỂ)
  brandApprovalStatus: BrandApprovalStatus; // Brand duyệt (ĐÃ_DUYỆT, CHỜ_DUYỆT, TỪ_CHỐI)
  brandApprovalDate?: string; // Ngày Brand duyệt
  brandRejectReason?: string; // Lý do Brand từ chối (nếu có)
  
  // Trạng thái KOC nhận Job này
  kocResponseStatus?: KocJobResponseStatus; // Trạng thái KOC (ĐỒNG_Ý, TỪ_CHỐI, ĐANG_THƯƠNG_LƯỢNG)
  
  // Pipeline vận hành theo từng Job
  pipelineText?: string; // Pipeline_text (Gửi hàng, Tạm ứng, Done...)
  status: DealStatus;
  statusLabel: string;
  currentStage?: '1_PLAN_SOURCING' | '2_DEAL_CONTRACT' | '3_CONTENT_SCRIPT' | '4_AIR_GROWTH' | '5_SETTLEMENT';
  holdingTeam?: 'BOOKING' | 'CONTENT' | 'BRAND' | 'FINANCE';
  holdingReason?: string;
  slaDeadline?: string;
  slaRemainingText?: string;
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  growthHandoffStatus?: 'CHƯA_BÀN_GIAO' | 'ĐÃ_GIAO_MÃ_ADS' | 'GROWTH_ĐANG_CHẠY' | 'HOÀN_TẤT';
  sparkAdsCode?: string;
  sampleStatus?: 'CHƯA_GỬI' | 'ĐANG_GIAO' | 'ĐÃ_NHẬN';
  sampleCarrier?: 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress';
  sampleTrackingCode?: string;
  sampleSentDate?: string;
  sampleDeliveredDate?: string;
  sampleRecipientPhone?: string;
  sampleShippingAddress?: string;
  sparkAdsExpiryDays?: number;
  adsCodeStatus?: 'CHƯA_CẤP' | 'ĐÃ_NGHIỆM_THU' | 'KHÔNG_DÙNG';
  tiktokVideoUrl?: string;
  
  // Nhân sự phối hợp trên Job (3 bên)
  assignedStaff: string; // Booking PIC
  bookingPic?: string; // Booking PIC
  accountPic?: string; // Account PIC (Phạm Thị Nhài, Hà Thị Thương...)
  leadBooking?: string; // Lead Booking
  contentNote?: string; // Content note / Đề xuất từ UpBase cho Job này
  accountComment?: string; // Comment từ Leader / Account
  
  // Tài chính & Doanh thu Job
  totalValue: number; // Giá net video thỏa thuận cho Job này
  soTienTamUngTruoc?: number;
  advanceAmount: number;
  finalAmount: number;
  deadlinePost: string;
  videoUrl?: string;
  viewsCount: number;
  affiliateGmv: number;
  gmv30: number;
  roi: number;
  publishedDays: number;
  isWinnerTop20?: boolean;
  hasGmv?: boolean;
  isBreakEven?: boolean;
  remainingSlaHours: number;
  isSlaWarning: boolean;

  // ==========================================
  // HIỆU QUẢ HỢP TÁC CHI TIẾT (COLLABORATION PERFORMANCE)
  // ==========================================
  ordersCount?: number; // Số đơn hàng phát sinh từ video
  cpo?: number; // Chi phí trên mỗi đơn hàng (totalValue / ordersCount)
  ctr?: number; // Tỷ lệ click vào giỏ hàng (%)
  cvr?: number; // Tỷ lệ chuyển đổi đơn hàng (%)
  focSampleCost?: number; // Chi phí gửi mẫu sản phẩm FOC (nếu có)
  sparkAdsBudget?: number; // Ngân sách Growth đã đổ vào chạy Spark Ads
  organicGmv?: number; // GMV từ lượt xem tự nhiên
  adsGmv?: number; // GMV phát sinh từ chạy quảng cáo
  postedDate?: string; // Ngày video lên sóng thực tế
  isScriptOnTime?: boolean; // Đúng hạn kịch bản
  isPostOnTime?: boolean; // Đúng hạn lên video
  daysDelayed?: number; // Số ngày trễ (nếu có)
  ratingScore?: number; // Điểm đánh giá chất lượng hợp tác (1 - 5 sao)
  performanceRating?: 'XUẤT_SẮC' | 'ĐẠT_MỤC_TIÊU' | 'CẦN_CẢI_THIỆN' | 'KHÔNG_HIỆU_QUẢ';
  brandFeedback?: string; // Đánh giá của Brand về chất lượng hình ảnh/thông điệp
  picCollabReview?: string; // Đánh giá của Chuyên viên Booking về thái độ/độ phối hợp

  // Tách rời thực thể & Quy trình duyệt Lark
  committedOutputsCount?: number; // Số output cam kết (1 booking -> N content items)
  larkAdvanceApprovalCode?: string; // Mã phiếu tạm ứng 2tr trên Lark
  larkFinalApprovalCode?: string; // Mã phiếu quyết toán 8tr trên Lark
  contentItems?: ContentItemModel[];

  // BỘ TRIGGER SLA B2C MỚI (CHUẨN HOÁ THEO TÀI LIỆU CÁC SLA B2C.PDF)
  // 1. Pháp chế & Hợp đồng KOC
  contractScanUrl?: string; // Link scan hợp đồng (Bắt buộc với deal > 9.000.000 VNĐ)
  invoiceNumber?: string; // Số hóa đơn VAT / Hóa đơn bán hàng của Deal
  draftInvoiceCode?: string; // Số / Link hóa đơn nháp đợt 1 (bắt buộc với HKD/Công ty khi tạm ứng)
  contractCreatedAt?: string; // Ngày ký HĐ (phải trước ngày DNTT >= 2 ngày với deal > 9M)
  contractSignDaysPrior?: number; // Số ngày ký HĐ trước DNTT
  hasIdCardScan?: boolean; // Đã có ảnh CCCD / Hộ chiếu / MST hợp lệ
  kocIdCardNumber?: string; // Số CCCD / Hộ chiếu
  kocBankName?: string; // Ngân hàng nhận thanh toán
  kocBankAccount?: string; // Số tài khoản chính chủ
  kocBankHolder?: string; // Tên chủ tài khoản
  legalProfileId?: string; // Khóa ngoại trỏ tới Hồ sơ pháp lý (KocLegalProfile) được chọn cho Job này
  legalProfileSnapshot?: {
    profileCode?: string;
    legalType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
    holderName: string;
    legalId?: string;
    taxCode?: string;
    cccd?: string;
    taxRateLabel?: string;
    vatRatePercent?: number;
    bankAccountNumber?: string;
    taxAccountType?: string;
    bankName?: string;
    bankAccount?: string;
    bankHolderName?: string;
    representativeName?: string;
    representativeTitle?: string;
    registeredAddress?: string;
    cccdIssueDate?: string;
    cccdIssuePlace?: string;
    frameworkContractCode?: string;
    legalAttachments?: LegalDocAttachment[];
  }; // Snapshot bất biến (job_creator_*) tại thời điểm chốt Deal & duyệt chi
  organicCommissionPct?: number; // % Hoa hồng affiliate organic trên Phụ lục SOW
  adsCommissionPct?: number; // % Hoa hồng affiliate chạy quảng cáo trên Phụ lục SOW

  // 2. Gửi mẫu & Cảnh báo leo thang
  shippingOrderCreatedAt?: string; // Thời điểm Content nộp đủ thông tin gửi mẫu
  shippingPendingDays?: number; // Số ngày kho/brand chưa gửi hàng (>2 ngày -> Raise Growth/Account)
  trackingCodePendingDays?: number; // Số ngày chưa có mã vận đơn (>3 ngày -> Raise Leader B2C)
  deliveryPendingDays?: number; // Số ngày vận chuyển chưa tới KOC (>5 ngày -> Cho phép đổi KOC/lùi lịch)
  brandOrientationPendingDays?: number; // Số ngày Brand chưa duyệt định hướng (>2d -> Alert Account, >3d -> Auto Air)
  isAutoAirProposed?: boolean; // Đã kích hoạt Đề xuất Tự Air (khi Brand ngâm quá 3 ngày)
  autoAirProposalDate?: string;

  // 3. Nghiệm thu, DNTT & Điền data
  dnttSubmittedAt?: string; // Ngày giờ làm Đề nghị thanh toán (DNTT)
  isDnttOverdue10Am?: boolean; // Quá 10h sáng ngày làm việc tiếp theo chưa làm DNTT
  isLocked7WorkingDays?: boolean; // Tự động khóa sau 7 ngày làm việc thiếu link air
  daysSinceAirWorkingDays?: number; // Đếm số ngày làm việc từ khi lên sóng
  billSentToKocDate?: string; // Ngày gửi bill thanh toán cho KOC
  isBillSentWithin7Days?: boolean; // Đã gửi bill trong vòng 7 ngày sau on air
  isEmergencyUnder5Days?: boolean; // Đơn gấp < 5 ngày trước ngày air (cảnh báo vi phạm chính sách)

  // 4. Báo cáo Ads TikTok thực tế (đối soát từ TikTok Seller Center)
  adCost?: number; // Chi phí Ads đã chạy (VNĐ)
  adGmv?: number; // Doanh thu gộp từ Ads (VNĐ)
  adRoas?: number; // ROAS Ads thực tế
  adOrders?: number; // Số đơn hàng phát sinh
  adCpa?: number; // Chi phí / đơn hàng (CPA)
  adHookRate2s?: number; // Tỷ lệ giữ chân 2s (%)
  adCompletionRate?: number; // Tỷ lệ xem hết 100% (%)
  adAuthorizationType?: string; // Loại ủy quyền (Video code, Affiliate...)
  adExplorationStatus?: string; // Trạng thái phân phối ads (Performing, Authorization needed...)
  adReportPeriod?: string; // Chu kỳ báo cáo (ví dụ: 2026-10-01 ~ 2026-10-08)

  // Các trường tương thích mở rộng cho Cổng Đối Tác KOC (KocKolHubView)
  picName?: string;
  isFreeSample?: boolean;
  sampleCost?: number;
  paymentStatus?: string;
  orderDate?: string;
  postDate?: string;
  advanceLarkCode?: string;
  orders30?: number;
  views30?: number;
  isOnTimePost?: boolean;
  contentFormat?: string;
  signedContractUrl?: string;

  // ==========================================
  // MỞ RỘNG QUẢN LÝ BOOKING ĐA NỀN TẢNG (MULTI-PLATFORM BOOKING & P&L ALLOCATION)
  // ==========================================
  dealType?: BookingDealType; // Phân loại Deal: Đơn kênh | Đa nền tảng | Mua lẻ dịch vụ (Service-Only)
  sourceDealCode?: string; // Mã Deal gốc tham chiếu (khi mua thêm mã Ads / bản quyền từ video cũ)
  pricingDisplayMode?: KocPricingDisplayMode; // Chế độ hiển thị giá với KOC: Trọn gói (ẩn giá lẻ cho KL1-KL3) | Bóc tách từng hạng mục (KL4-KL7)
  deliverables?: DealDeliverableItem[]; // Danh sách các bài đăng đa kênh (Tách Media Channel vs Affiliate Channel & Khóa Wave 0 -> Wave 1)
  rightsTerms?: DealRightsTermItem[]; // Các điều khoản bản quyền, mã Ads, độc quyền theo 3 tầng (Asset / Media Channel / Deal)
  revisions?: DealRevisionItem[]; // Lịch sử vòng đàm phán & đánh dấu trường thay đổi
  contractAppendixCode?: string; // Mã Phụ lục hợp đồng theo từng Deal (1 HĐNT/KOC + 1 Phụ lục/Deal)
  masterContractCode?: string; // Mã Hợp đồng nguyên tắc (HĐNT) của KOC
  contractAppendixStatus?: DealContractAppendixStatus; // Trạng thái ký Phụ lục của Deal
  paymentScheduleOption?: 'ONE_TIME' | 'TWO_TIMES'; // Phương thức thanh toán trên Phụ lục SOW: 1 lần (100% sau nghiệm thu) | 2 đợt (Có tạm ứng)
  dealJobs?: DealSowJobItem[]; // Danh sách N Job trong Deal (Mỗi Job = 1 Bảng công việc trong Phụ lục SOW)
  masterContractStatus?: DealContractAppendixStatus; // Trạng thái ký HĐNT của KOC
  masterContractGoogleDocsUrl?: string; // Đường link Google Docs của HĐNT
  masterContractSignedUrl?: string; // Đường link bản HĐNT đã ký hoàn tất (.pdf/.docx)
  contractAppendixGoogleDocsUrl?: string; // Đường link Google Docs của Phụ lục SOW
  contractAppendixSignedUrl?: string; // Đường link bản Phụ lục SOW đã ký hoàn tất (.pdf/.docx)
  bbntCode?: string; // Mã Biên bản nghiệm thu (BBNT) của Deal
  bbntStatus?: DealContractAppendixStatus; // Trạng thái ký BBNT của Deal
  bbntGoogleDocsUrl?: string; // Đường link Google Docs của BBNT
  bbntSignedUrl?: string; // Đường link bản BBNT đã ký hoàn tất (.pdf/.docx)
  videoAssetCostVnd?: number; // Chi phí Net của Asset (Video chính) trong Deal
  addonsCostVnd?: number; // Tổng chi phí Net các Dịch vụ gia tăng trong Deal
  droppedCostVnd?: number; // Khấu trừ hạng mục Dịch vụ gia tăng không thực hiện khi quyết toán Deal
  vatRatePercent?: number; // % VAT của chủ thể Công ty; totalValue luôn là giá chưa VAT
  sequentialAcceptanceStage?: DealSequentialAcceptanceStage; // Nghiệm thu 2 tầng: (1) Video -> (2) Dịch vụ gia tăng & Quyền lợi
  stage1VideoVerifiedAt?: string; // Thời điểm hoàn tất nghiệm thu Asset Video (Tầng 1)
  stage2AddonsVerifiedAt?: string; // Thời điểm hoàn tất nghiệm thu Dịch vụ gia tăng / các phần khác (Tầng 2)
}

export interface MasterTierQuota {
  tierId: 'TIER_1_CELEB' | 'TIER_2_MACRO' | 'TIER_3_MICRO' | 'TIER_4_AFFILIATE';
  tierName: string;
  klRange: string;
  targetVideos: number;
  totalBudget: number;
  avgCostPerVideo: number;
  description: string;
}

export interface MonthlyMasterQuotaPlan {
  month: string; // e.g. '2026/08', '2026/09', '2026/10'
  monthLabel: string; // e.g. 'Tháng 8/2026', 'Tháng 9/2026', 'Tháng 10/2026 (Dự thảo)'
  status: 'COMPLETED' | 'ACTIVE' | 'DRAFT';
  totalCeilingBudget: number;
  totalTargetVideos: number;
  totalTargetGmv: number;
  tierQuotas: MasterTierQuota[];
}

export interface MonthlyStaffAllocation {
  id: string;
  month: string;
  staffName: string;
  roleTitle: string;
  assignedBrands: string[];
  planVideos: number;
  reportVideos: number;
  airProgress: number; // %
  planBudget: number;
  reportBudget: number;
  budgetProgress: number; // %
  targetGmv: number;
  actualGmv: number;
  targetNewKocs: number;
  actualNewKocs: number;
  isLagging: boolean;
  managerNote?: string;
  
  // Phân rã chỉ tiêu theo 4 Tier KOC / KOL
  tier1Videos?: number; // Celebrity / Mega (KL7 >25M)
  tier2Videos?: number; // Macro (KL6 10-25M)
  tier3Videos?: number; // Micro (KL4-KL5 2.5-10M)
  tier4Videos?: number; // Nano & Affiliate (KL1-KL3 <2.5M)
}

export interface MonthlyPlanItem {
  id: string;
  workstream: string;
  metric: string;
  planT8: string;
  reviseT8: string;
  actualT8: string;
  pctAchieved: string;
  status: 'ACHIEVED' | 'MISSED' | 'IN_PROGRESS';
}

export interface BookingStaffProgressItem {
  id: string;
  month: string;
  staffName: string;
  planVideos: number;
  reportVideos: number;
  airProgress: number; // %
  planEfficiency: number;
  reportEfficiency: number;
  errorRate: number;
  planBudget: number;
  reportBudget: number;
  budgetProgress: number; // %
  isLagging: boolean;
}

export interface BookingStaffRevenueItem {
  id: string;
  staffName: string;
  budgetProgress: number; // %
  newKocsBooked: number;
  gmvThisMonth: number;
  gmvLastMonth: number;
  growthRate: number; // %
  roi14Days: number;
}

export interface PlanGapItem {
  id: string;
  causeGroup: string;
  brandCluster: string;
  gapAmount: number;
  note?: string;
}

export interface StaffPerformanceItem {
  id: string;
  name: string;
  role: string;
  targetVideos: number;
  actualVideos: number;
  allocatedBudget: number;
  spentBudget: number;
  gmvGenerated: number;
  avgRoi: number;
  slaScore: number;
  overallScore: number;
  ratingLabel: string;
  currentLoad: number;
}



export type SlaTaskType = 
  | 'CAMPAIGN_BRIEF' 
  | 'SCRIPT_REVIEW' 
  | 'CONTRACT_APPROVAL' 
  | 'SAMPLE_SHIP' 
  | 'VIDEO_VERIFY'
  | 'SAMPLE_ESCALATION_2D'
  | 'NO_TRACKING_3D'
  | 'BRAND_ORIENTATION_3D'
  | 'DNTT_DEADLINE_10AM'
  | 'CONTRACT_9M_CHECK'
  | 'DATA_LOCK_7D'
  | 'E2E_RECONCILIATION'
  | 'GENERAL_TASK'
  | 'RESEARCH_TASK'
  | 'SAMPLE_DELIVERY'
  | 'ADS_CODE_RETRIEVAL';

export type TaskDifficultyCategoryKey =
  | 'RESEARCH'
  | 'BOOKING'
  | 'CONTENT'
  | 'KEY_VISUAL'
  | 'CAMPAIGN'
  | 'LIVESTREAM';

export type TaskAssignmentRoleKey =
  | 'PIC_OWNER'
  | 'CO_PIC'
  | 'EXECUTION'
  | 'SUPPORT';

export interface TaskDifficultyLevelConfig {
  id: string;
  levelCode: string;        // VD: "Level 1 – Cơ bản" hoặc "Cơ bản"
  multiplier: number;       // VD: 0.80, 1.00, 1.20, 1.40, 1.60
  scopeDescription: string; // VD: "1 sàn, 1 line sản phẩm"
  expectedDeliverable: string; // Cột "Đầu ra"
  defaultSlaHours: number;  // Hạn định SLA gợi ý (giờ)
}

export interface TaskCategoryDifficultyConfig {
  categoryKey: TaskDifficultyCategoryKey;
  categoryName: string;     // VD: "Nghiên cứu (Research)"
  tableTitle: string;       // VD: "Bảng 2b. Hệ số cấp độ research (chỉ dùng cho nhóm Nghiên cứu)"
  unitLabel: string;        // VD: "Hồ sơ Research", "Video booking", "Video content"...
  baseWorkloadPoints: number; // Điểm tải gốc của 1 case tiêu chuẩn (VD: 1.0)
  levels: TaskDifficultyLevelConfig[];
}

export interface TaskRoleWeightRule {
  roleKey: TaskAssignmentRoleKey;
  roleLabel: string;        // VD: "PIC/Owner", "Co-PIC", "Execution", "Support"
  definition: string;
  responsibilities: string;
  suggestedWeightRange: string; // VD: "50–70%"
  defaultWeightPct: number;     // VD: 70
}

export interface SlaTask {
  id: string;
  title: string;
  type: SlaTaskType;
  team: string;
  pic: string;
  targetRole: UserRole;
  deadline: string;
  remainingText: string;
  urgency: 'critical' | 'warning' | 'normal' | 'done';
  dealCode?: string;
  escalatedTo?: string; // Growth Lead, Leader B2C
  actionLabel?: string; // Nhãn nút xử lý nhanh
  description?: string;
  brand?: string;
  storeName?: string;
  deadlineHours?: number;
  createdAt?: string;
  // Mở rộng cho Phân hệ Giao việc & Định mức độ khó Task (Bảng 2b Research & 4P Workload)
  taskCategory?: TaskDifficultyCategoryKey;
  difficultyLevelId?: string;
  difficultyLabel?: string;
  difficultyMultiplier?: number;
  scopeDescription?: string;
  expectedDeliverable?: string;
  deliverableUrl?: string;
  assignmentRole?: TaskAssignmentRoleKey;
  contributionWeightPct?: number; // Tỷ trọng đóng góp (%) — Tổng cùng case = 100%
  baseWorkloadPoints?: number;
  calculatedWorkloadPoints?: number; // Workload cá nhân = Workload case × Hệ số độ khó × Tỷ trọng đóng góp
  platformsCount?: number; // Số sàn thực hiện (1 sàn, 2 sàn, đa sàn)
  productLinesCount?: number; // Số line sản phẩm
  assignedBy?: string;
  groupAssignmentId?: string; // Mã gom nhóm khi 1 task chia cho nhiều nhân sự (PIC + Execution...)
  // Mở rộng cho Hệ thống Đo lường Workload Nhân sự (Bảng 1 -> Bảng 7 file test claude workload nhân sự)
  taskSource?: 'WORKFLOW_SYSTEM' | 'DIRECTOR_ASSIGNED'; // Nguồn task: Luồng quy trình hệ thống vs Task GĐ/Quản lý giao
  workflowStageLabel?: string; // Tên bước quy trình hệ thống phát sinh task (VD: "Luồng Booking KOC · Nghiệm thu Air", "Luồng Content Kênh · Sản xuất")
  sowStt?: number; // STT 1..33 trong Bảng 1
  sowGroup?: string; // Phân nhóm Bảng 1 (Content Affiliate, Content kênh, Livestream Affiliate, Key Visual, SIS, Brief, Nghiên cứu gian hàng mới, Nghiên cứu & lập kế hoạch campaign, JBP Plan & Report)
  sowName?: string; // Chi tiết loại công việc Bảng 1
  acceptedQuantity?: number; // SL nghiệm thu
  standardPoint?: number; // Point chuẩn (Bảng 1)
  scopeCoef?: number; // HS phạm vi: HS gian hàng (Bảng 2: 0.80/1.00/1.25/1.50) hoặc HS cấp độ research (Bảng 2b: 0.80..1.60)
  taskDifficultyTier?: 'EASY' | 'STANDARD' | 'HARD'; // Độ khó từng lần làm (Bảng 3: Dễ 0.80 / Tiêu chuẩn 1.00 / Khó 1.20)
  taskDifficultyCoef?: number; // HS công việc Bảng 3 (0.80 | 1.00 | 1.20)
  timelineStatus?: 'ON_TIME' | 'LATE_1' | 'LATE_2' | 'FAILED'; // Bảng 5: Đúng hạn (1.0), Chậm mức 1 (0.7), Chậm mức 2 (0.4), Không hoàn thành (0)
  timelineCoef?: number; // HS timeline Bảng 5
  multiPlatformCoef?: number; // HS đa sàn Bảng 6 (1.0 | 1.3 | 1.6)
  // Bảng 7: Cột bắt buộc khi ghi nhận đầu việc
  platformScope?: string; // Sàn (Shopee / TikTok / Lazada)
  channelPlatform?: string; // Nền tảng (TikTok / FB / IG / YT / Shopee Video)
  originalAssetRef?: string; // Asset gốc / Reup từ (bắt buộc với đầu việc Reup/Adapt)
  kocStatusType?: 'NEW_KOC' | 'REBOOK' | 'FRAMEWORK_CONTRACT'; // Trạng thái KOC (KOC mới / Book lại / HĐ nguyên tắc)
  difficultyOverrideReason?: string; // Lý do đổi độ khó (bắt buộc khi khác mặc định Bảng 1)
}

// PHÂN LOẠI VI PHẠM SLA B2C (THEO QUY ĐỊNH MỚI)
export type SlaBreachCategory =
  | 'SAMPLE_NOT_SHIPPED_2D'       // Quá 2 ngày kho/brand chưa gửi hàng
  | 'NO_TRACKING_CODE_3D'          // Quá 3 ngày chưa có mã vận đơn
  | 'SAMPLE_NOT_DELIVERED_5D'      // Quá 5 ngày chưa nhận được hàng
  | 'BRAND_ORIENTATION_PENDING_2D' // Brand quá 2 ngày chưa duyệt định hướng
  | 'BRAND_ORIENTATION_AUTO_AIR'   // Brand quá 3 ngày chưa duyệt định hướng (Auto-Air)
  | 'CONTRACT_OVER_9M_INVALID'     // Deal >9M thiếu scan HĐ hoặc ký trễ (<2 ngày trước DNTT)
  | 'DNTT_OVERDUE_10AM'            // Quá 10h sáng ngày hôm sau chưa làm DNTT
  | 'DATA_LOCKED_7_WORKING_DAYS'   // Khóa tự động sau 7 ngày làm việc thiếu link air
  | 'BILL_NOT_SENT_7D'             // Quá 7 ngày on air chưa gửi bill thanh toán cho KOC
  | 'EMERGENCY_UNDER_5D';          // Nhận làm video kênh mới dưới 5 ngày trước ngày air

export interface SlaBreachItem {
  id: string;
  dealCode: string;
  kocName: string;
  brandName: string;
  category: SlaBreachCategory;
  categoryLabel: string;
  severity: 'CRITICAL' | 'WARNING' | 'HIGH';
  picName: string;
  picRole: 'Booking' | 'Content' | 'Brand/Account' | 'Warehouse';
  detectedAt: string;
  slaDeadline: string;
  hoursOverdue: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXEMPTED';
  escalatedTo?: string;
  resolutionNotes?: string;
}

// BÁO CÁO QUẢN LÝ TUÂN THỦ SLA CỦA NHÂN VIÊN
export interface StaffSlaReportItem {
  id: string;
  staffName: string;
  avatar: string;
  role: 'Booking' | 'Content' | 'Brand/Account';
  team: string;
  assignedBrands: string[];
  totalJobs: number;
  onTimeJobs: number;
  breachedJobs: number;
  onTimeRate: number; // e.g. 94.5%
  penaltyPoints: number; // e.g. -15
  currentScore: number; // 100 - penaltyPoints
  activeViolationsCount: number;
  violations: SlaBreachItem[];
  rating: 'Xuất sắc' | 'Đạt chuẩn' | 'Cần cải thiện' | 'Cảnh báo vi phạm';
}

// LỊCH CỬA SỔ NGHIỆM THU E2E KẾ TOÁN (WD05 & WD11)
export interface E2EReconciliationWindow {
  currentPhase: 'FREEZE_MUNG_2' | 'REPORT_ERROR_WD04' | 'OPEN_WINDOW_WD05' | 'LOCKED_WD05' | 'REPORT_ERROR_WD10' | 'OPEN_WINDOW_WD11' | 'PERMANENT_LOCK';
  phaseLabel: string;
  windowOpenTime: string;
  windowCloseTime: string;
  isOpenForEdit: boolean;
  totalErrorsReportedRound1: number;
  totalErrorsReportedRound2: number;
  resolvedErrorsCount: number;
  pendingErrorsCount: number;
}

export interface CampaignMonthlyPhase {
  month: string; // Chu kỳ tháng 'YYYY/MM' (VD: '2026/09', '2026/10', '2026/11')
  phaseName: string; // Vai trò giai đoạn trong tháng (VD: 'Giai đoạn 1: Teasing & Seeding', 'Giai đoạn 2: Booming Mega Sale')
  allocatedBudget: number; // Ngân sách phân bổ cho tháng này (VNĐ)
  spentBudget?: number; // Ngân sách đã giải ngân trong tháng này (VNĐ)
  targetGmv: number; // Mục tiêu GMV trong tháng này (VNĐ)
  actualGmv?: number; // GMV thực đạt trong tháng này (VNĐ)
  targetKocCount: number; // Số lượng KOC / Video mục tiêu trong tháng
  saleMilestones?: string; // Các mốc sale trong tháng (VD: 'W1: 10.10 Mega Sale | W2: Giữa tháng 15.10 | W4: Payday 25.10')
  kvAdaptNotes?: string; // Ghi chú adapt Key Visual / Frame / Banner cho tháng này
}

export type KeyVisualAssetCategory = 'MASTER_KV' | 'SIS_BANNER' | 'PDP_FRAME' | 'MOODBOARD';

export interface KeyVisualAssetItem {
  id: string;
  url: string;
  fileName: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  storage?: 'R2' | 'LOCAL' | 'INLINE';
  category?: KeyVisualAssetCategory;
  note?: string;
  uploadedAt: string;
}

export interface KeyVisualScheduleRow {
  id: string;
  phaseName: string;       // Phiên bản / Đợt ảnh KV (VD: 'Master KV đầu tháng', 'Adapt Sale Đôi 10.10', 'Adapt Cuối tháng & Payday')
  deliverables: string;    // Hạng mục thiết kế (VD: 'Master KV + Bộ Banner SIS + Khung PDP', 'Banner Campaign + Khung giá Sale Đôi')
  refDate: string;         // Ngày cần lên Ref (YYYY-MM-DD)
  orderDate: string;       // Ngày order thiết kế (YYYY-MM-DD)
  draftDate: string;       // Ngày nộp bản Draft (YYYY-MM-DD)
  approveDate: string;     // Ngày duyệt Final (YYYY-MM-DD)
  hangDate: string;        // Ngày treo KV lên gian hàng (YYYY-MM-DD)
  pic?: string;            // Nhân sự phụ trách
  note?: string;           // Ghi chú (packshot, CTKM, lưu ý...)
}

export interface CampaignKeyVisualSpec {
  theme: string; // Chủ đề Key Visual (VD: 'Bọt mịn dịu nhẹ - Dịu êm ngày nhạy cảm')
  fonts?: string; // Font chữ chủ đạo (VD: 'Montserrat Bold / Nunito Sans Regular')
  moodboard?: string; // Mô tả Moodboard / Tone màu chủ đạo
  proposalUrl?: string; // Link file Proposal / KV Deck
  promoTextOnKv?: string; // Thông điệp CTKM hiển thị trên KV (VD: 'Mua 2 giảm 25% + Tặng túi vải')
  refDate?: string; // Ngày cần lên Ref (YYYY-MM-DD)
  orderDate?: string; // Ngày order thiết kế (YYYY-MM-DD)
  hangDate?: string; // Ngày treo KV lên gian hàng (YYYY-MM-DD)
  kvPic?: string; // Nhân sự Key Visual / SIS phụ trách
  kvImages?: KeyVisualAssetItem[]; // Danh sách ảnh Key Visual / Moodboard / SIS / PDP tải lên
  kvScheduleRows?: KeyVisualScheduleRow[]; // Bảng kế hoạch & mốc thời gian lên các đợt ảnh Key Visual trong tháng
}

export interface CampaignItem {
  id: string;
  code: string;
  title: string;
  brand: string;
  targetAudience: string;
  bigIdea: string;
  budget: number;
  spentBudget: number;
  targetGmv: number;
  currentGmv: number;
  targetKocCount: number;
  bookedKocCount: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  briefStatus: 'DRAFT' | 'HANDED_OFF_TO_CONTENT' | 'IN_PRODUCTION' | 'COMPLETED';
  startDate: string;
  endDate: string;
  // Quản lý thực thể Chiến dịch độc lập kéo dài 1 hoặc nhiều tháng
  coveredMonths?: string[]; // Danh sách các tháng chiến dịch đi qua (VD: ['2026/09', '2026/10'])
  durationMonthsCount?: number; // Số tháng kéo dài (1, 2, 3...)
  targetStores?: string[]; // Danh sách gian hàng áp dụng chiến dịch
  platforms?: string[]; // Các sàn triển khai ('TikTok Shop', 'Shopee', 'Lazada')
  // Định hướng chiến lược & CTKM (Section 01 Template 1 Sheet)
  roleInYearPlan?: string; // Vai trò chiến dịch trong kế hoạch năm
  objectivesAndBarriers?: string; // Mục tiêu & rào cản cần xử lý
  seasonalOpportunity?: string; // Cơ hội mùa vụ (Seasonal opportunity)
  comboPromoOffer?: string; // Combo / Deal / Quà tặng (CTKM trọng tâm)
  saleMilestones?: string; // Các mốc sale chính trong chiến dịch (W1..W5)
  brandStrategyPic?: string; // Nhân sự Plan / Strategy phụ trách chiến dịch
  kvPic?: string; // Nhân sự Key Visual / SIS phụ trách
  keyVisualSpec?: CampaignKeyVisualSpec; // Quy chuẩn Key Visual của chiến dịch (Section 03 Template 1 Sheet)
  monthlyPhases?: CampaignMonthlyPhase[]; // Phân kỳ ngân sách, KPI & vai trò theo từng tháng
  guidelineUrl?: string;
  keyMessage?: string;
  heroSkus?: string[];
  targetCir?: number; // e.g. 20.0 (%)
  contentPic?: string; // Content Leader nhận handoff
  handoffAt?: string; // Thời điểm handoff
  handoffSlaHours?: number; // Mặc định 24h
  isSlaBreached?: boolean;
}

/**
 * Tự động tính danh sách các tháng ('YYYY/MM') mà một chiến dịch kéo dài qua dựa trên startDate và endDate ('YYYY-MM-DD')
 */
export function getCoveredMonthsFromRange(startDate?: string, endDate?: string): string[] {
  if (!startDate || !endDate) return [];
  const startParts = startDate.split('-');
  const endParts = endDate.split('-');
  if (startParts.length < 2 || endParts.length < 2) return [];
  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10);
  const endYear = parseInt(endParts[0], 10);
  const endMonth = parseInt(endParts[1], 10);
  if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) return [];

  const result: string[] = [];
  let y = startYear;
  let m = startMonth;
  let safety = 0;
  while ((y < endYear || (y === endYear && m <= endMonth)) && safety < 24) {
    result.push(`${y}/${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    safety++;
  }
  return result;
}

/**
 * Kiểm tra xem một chiến dịch có đang hoạt động trong tháng 'YYYY/MM' hay không
 */
export function isCampaignActiveInMonth(campaign: CampaignItem, month: string): boolean {
  if (!month || month === 'ALL') return true;
  const covered = campaign.coveredMonths && campaign.coveredMonths.length > 0
    ? campaign.coveredMonths
    : getCoveredMonthsFromRange(campaign.startDate, campaign.endDate);
  return covered.includes(month);
}

/**
 * Lấy thông tin phân kỳ tháng (CampaignMonthlyPhase) của chiến dịch cho một tháng cụ thể
 */
export function getCampaignPhaseForMonth(campaign: CampaignItem, month: string): CampaignMonthlyPhase | undefined {
  if (!campaign.monthlyPhases || campaign.monthlyPhases.length === 0) return undefined;
  return campaign.monthlyPhases.find(p => p.month === month);
}


// ==========================================
// BRAND TEAM WORKSPACE TYPES
// ==========================================
export type BlacklistSeverity = 'CRITICAL_BANNED' | 'COMPETITOR_WARNING' | 'SENSITIVE_CLAIM' | 'SENSITIVE_POLICY';

export interface BlacklistKeyword {
  id: string;
  keyword: string;
  category: 'LEGAL_MEDICAL' | 'COMPETITOR' | 'SENSITIVE_POLICY';
  severity: BlacklistSeverity;
  rationale: string;
  alternativeSuggestion?: string;
  addedBy?: string;
  addedAt?: string;
}

export interface HeroSkuItem {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  uspBulletPoints: string[];
  clinicalClaims?: string;
  pdpUrl: string;
  sampleStockCount: number;
  priceVnd: number;
}

export interface BrandGuidelineAsset {
  id: string;
  brandName: string;
  category: string;
  colorTheme: string;
  toneOfVoice: string;
  toneTag: 'BÁC_SĨ_CHUYÊN_GIA' | 'MẸ_BỈM_CHÂN_THỰC' | 'GEN_Z_TRENDING' | 'SANG_TRỌNG_CAO_CẤP';
  logoRules: string;
  visualDoList: string[];
  visualDontList: string[];
  blacklistKeywords: BlacklistKeyword[];
  heroSkus: HeroSkuItem[];
}

export interface BrandApprovalQueueItem {
  id: string;
  dealCode: string;
  brandName: string;
  kocName: string;
  kocChannel: string;
  avatarUrl: string;
  salaryGrade: SalaryGrade;
  quoteNet: number;
  tepKenh: TepKenh;
  submissionRound: 'ROUND_1_KOC' | 'ROUND_2_SCRIPT';
  submittedBy: string;
  submittedAt: string;
  remainingSlaHours: number;
  scriptContent?: {
    hook: string;
    pain: string;
    usp: string;
    cta: string;
    durationSeconds: number;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
}

export interface BrandRetainerHealth {
  id: string;
  brandName: string;
  accountLead: string;
  growthLead: string;
  allocatedBudget: number;
  spentBudget: number;
  targetGmv: number;
  actualGmv: number;
  roi: number;
  activeKocsCount: number;
  rejectedKocsCount: number;
  rejectionRate: number; // e.g. 8.5%
  healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  statusNotes: string;
}

// ==========================================
// BRAND KNOWLEDGE BASE & GUIDELINE SYSTEM TYPES
// ==========================================

export interface BrandColorToken {
  name: string; // e.g. "Primary Blue", "Deep Navy", "Silk White"
  hex: string;  // e.g. "#1e40af"
  role: 'PRIMARY' | 'SECONDARY' | 'ACCENT' | 'BACKGROUND';
}

export interface BrandLegalCertification {
  id: string;
  docTitle: string; // e.g. "Giấy tiếp nhận bản công bố sản phẩm số 4920/2023/ĐKSP"
  issuingAuthority: string; // Cục An Toàn Thực Phẩm - Bộ Y Tế, Sở Y Tế TP.HCM
  docNumber: string;
  issueDate: string;
  validUntil?: string;
  verificationUrl?: string;
  docType: 'CÔNG_BỐ_MỸ_PHẨM' | 'CÔNG_BỐ_ATTP' | 'XÁC_NHẬN_QUẢNG_CÁO' | 'KIỂM_NGHIỆM_LÂM_SÀNG' | 'CHỨNG_CHỈ_QUỐC_TẾ';
  mandatoryDisclaimerText?: string; // Câu cảnh báo bắt buộc khi truyền thông
  summaryKeyFindings: string; // Tóm tắt kết luận lâm sàng / phê duyệt
}

export interface DetailedHeroSku {
  id: string;
  skuCode: string;
  name: string;
  volumeOrWeight: string; // e.g. "120g", "500ml", "60 viên"
  category: string;
  priceVnd: number;
  pdpUrl: string;
  sampleStockCount: number;
  scientificMechanism: string; // Cơ chế tác động khoa học
  keyActiveIngredients: {
    name: string;
    percentage?: string;
    origin?: string;
    benefit: string;
  }[];
  uniqueSellingPoints: string[]; // 3-5 USPs độc quyền
  clinicalTrials: string; // Số liệu lâm sàng chứng minh
  usageInstructions: string; // Cách dùng & liều lượng
  targetSkinOrUser: string; // Chỉ định (Ai nên dùng)
  contraindications: string; // Chống chỉ định (Ai không được dùng)
}

export interface WhitelistKeyword {
  id: string;
  phrase: string;
  category: 'HOOK_WINNER' | 'USP_CLAIM' | 'TRUST_BUILDER' | 'CONVERSION_TRIGGER';
  exampleUsage: string;
  benefitNotes: string;
}

export interface ObjectionFaqItem {
  id: string;
  question: string; // Câu hỏi thắc mắc / vặn vẹo từ người xem
  targetConcern: 'GIÁ_CẢ' | 'HIỆU_QUẢ_CHẬM' | 'KÍCH_ỨNG_MẨN_ĐỎ' | 'NGUỒN_GỐC_XUẤT_XỨ' | 'SO_SÁNH_ĐỐI_THỦ';
  recommendedAnswerForKoc: string; // Câu trả lời mẫu chuẩn đã được Brand duyệt
  doMentionPoints: string[]; // Những điểm KOC NÊN nhấn mạnh
  dontSayWords: string[]; // Những từ KOC TUYỆT ĐỐI KHÔNG được lỡ miệng nói
}

export interface CrisisProtocol {
  stepNumber: number;
  actionTitle: string;
  guidelineDescription: string;
  contactPic: string;
  slaResponseMinutes: number;
}

export interface BrandKnowledgeBase {
  id: string;
  brandName: string;
  slogan: string;
  brandStory: string;
  category: string;
  originCountry: string; // Nhật Bản, Úc, Tây Ban Nha, Việt Nam
  foundedYear: number;
  toneOfVoice: string;
  toneTag: 'BÁC_SĨ_CHUYÊN_GIA' | 'MẸ_BỈM_CHÂN_THỰC' | 'GEN_Z_TRENDING' | 'SANG_TRỌNG_CAO_CẤP';
  targetPersonaSummary: string;
  colors: BrandColorToken[];
  logoAssetRules: string;
  logoDownloadUrls: {
    format: string; // "PNG High-Res (Trong suốt)", "SVG Vector", "Logo Âm Bản Trắng"
    url: string;
  }[];
  visualDoList: string[];
  visualDontList: string[];
  certifications: BrandLegalCertification[];
  skus: DetailedHeroSku[];
  blacklistKeywords: BlacklistKeyword[];
  whitelistKeywords: WhitelistKeyword[];
  objectionFaqs: ObjectionFaqItem[];
  crisisProtocols: CrisisProtocol[];
  lastUpdated: string;
  updatedBy: string;
  publicShareSlug: string; // e.g. "senka-japan-official"
  shareAccessPin?: string;
  documents?: BrandDocumentFile[];
  isConfigured?: boolean;
  companyName?: string;
  taxCode?: string;
  contactPerson?: string;
  accountPic?: string;
  bookingPicLead?: string;
  monthlyBudget?: number;
  targetGmv?: number;
  platforms?: ('Shopee Mall' | 'TikTok Shop' | 'Lazada')[];
  ratecardCeiling?: {
    grade: SalaryGrade;
    maxBudget: number;
    description: string;
  }[];
}

// ==========================================
// BRAND DOCUMENT STORAGE & EXTRACTION TYPES
// ==========================================

export type BrandFileCategory = 
  | 'BRAND_GUIDELINE'     // Bộ quy chuẩn thương hiệu & Tone of Voice
  | 'LEGAL_CERTIFICATE'   // Giấy phép quảng cáo & Phiếu công bố BYT
  | 'CLINICAL_TRIAL'      // Báo cáo thử nghiệm lâm sàng & Viện da liễu
  | 'PRODUCT_CATALOG'     // Hồ sơ sản phẩm & Danh mục Hero SKU
  | 'CAMPAIGN_BRIEF'      // Tài liệu chiến dịch & Yêu cầu nội dung
  | 'ASSET_MEDIA';        // Bộ nhận diện, File thiết kế, Logo

export type BrandFileStatus = 'CHƯA_ĐỌC' | 'ĐANG_ĐỌC' | 'ĐÃ_TRÍCH_XUẤT' | 'ĐÃ_ĐỒNG_BỘ' | 'LỖI';

export interface ExtractedBrandInfo {
  documentType: BrandFileCategory;
  brandName?: string;
  slogan?: string;
  toneOfVoice?: string;
  targetAudience?: string;
  productName?: string;
  skuCode?: string;
  priceVnd?: number;
  certNumber?: string;
  issuingAuthority?: string;
  mandatoryDisclaimer?: string;
  clinicalClaims?: string;
  scientificMechanism?: string;
  ingredients?: { name: string; percentage?: string; benefit?: string }[];
  keyUsps?: string[];
  blacklistKeywords?: { keyword: string; rationale: string; alternativeSuggestion?: string }[];
  whitelistKeywords?: { phrase: string; exampleUsage?: string }[];
  visualDos?: string[];
  visualDonts?: string[];
  rawTextPreview?: string;
  extractedAt?: string;
  confidenceScore?: number;
}

export interface BrandDocumentFile {
  id: string;
  brandId: string;
  brandName: string;
  fileName: string;
  fileSizeFormatted: string;
  fileType: 'pdf' | 'docx' | 'image' | 'xlsx';
  category: BrandFileCategory;
  uploadDate: string;
  uploadedBy: string;
  status: BrandFileStatus;
  fileUrl?: string;
  extractedData?: ExtractedBrandInfo;
  notes?: string;
}

// ==========================================
// AI SCRIPT COMPLIANCE & ANALYSIS TYPES
// ==========================================

export interface AiAnalysisDimension {
  name: string;
  score: number;
  maxScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  feedback: string;
}

export interface AiDetectedIssue {
  id: string;
  type: 'BLACKLIST_WORD' | 'MISSING_DISCLAIMER' | 'WEAK_HOOK' | 'TONE_MISMATCH' | 'MISSING_USP' | 'FUNNEL_MISMATCH' | 'HOOK_BODY_DISCONNECT' | 'COMPETITOR_ATTACK' | 'VAGUE_CLAIM';
  title: string;
  detectedText?: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  rationale: string;
  replacementSuggestion?: string;
}

export interface AiScriptAnalysisResult {
  overallScore: number; // 0 - 100
  complianceStatus: 'PASS' | 'WARNING' | 'FAIL';
  summaryVerdict: string;
  dimensions: AiAnalysisDimension[];
  issues: AiDetectedIssue[];
  matchedUspsCount: number;
  totalUspsCount: number;
  toneAlignmentScore: number; // %
  hasMandatoryDisclaimer: boolean;
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  sevenStageAudit?: {
    stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    stageName: string;
    status: 'PASS' | 'WARNING' | 'FAIL';
    ruleApplied: string;
    finding: string;
    actionableFix?: string;
  }[];
  hookStarTAnalysis?: {
    detectedHookType: string;
    starTDrivers: {
      driver: 'S_DREAM' | 'T_CURIOSITY' | 'A_FAMILIAR' | 'R_COMFORT' | 'T_CONTRAST';
      label: string;
      matched: boolean;
      evidence: string;
    }[];
    hasLongGreetingIssue: boolean;
    hasPrematureSaleIssue: boolean;
  };
  rewrittenScript: {
    hook: string;
    painPoint: string;
    solutionAndUsp: string;
    callToAction: string;
    fullText: string;
  };
}



export interface ScriptReviewItem {
  id: string;
  dealCode: string;
  kocId: string;
  kocName: string;
  kocTier: KocTier;
  campaignTitle: string;
  pillar: string;
  videoDuration: string;
  hook: string;
  painPoint: string;
  solutionAndUsp: string;
  callToAction: string;
  status: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  remainingHours: number;
  submittedBy: string;
  submittedAt: string;
  feedbackNotes?: string;
  draftVideoUrl?: string;
  reviewMode?: 'DIRECTIVE' | 'VETTING_GUARDRAILS';
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  klCode?: string;
  mandatoryShots?: string;
  forbiddenClaims?: string;
  rightsGuardrails?: string;
}

export interface LeaderboardItem {
  rank: number;
  name: string;
  team: string;
  role: UserRole;
  slaScore: number; // 30%
  videoCount: number; // 40%
  gmv: number; // 30%
  totalScore: number;
  badge: string;
  isTop3: boolean;
}

export interface EcomStore {
  id: string;
  brandId: string;
  platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA';
  storeName: string;
  storeId: string;
  storeUrl: string;
  affiliateRate: number; // e.g. 15%
  requiresSparkAds: boolean;
  status: 'ACTIVE' | 'PAUSED';
  rating?: number;
  totalProductsCount?: number;
}

export interface HeroProduct {
  id: string;
  brandId: string;
  productName: string;
  sku: string;
  price: number;
  commissionRate: number;
  sampleAvailable: boolean;
  sampleStock: number;
  category: string;
  pdpUrl: string;
  imageUrl?: string;
  keySellingPoints?: string[];
  restrictedClaims?: string[];
}

// ==========================================
// PUSH PRODUCTS (SẢN PHẨM THÚC ĐẨY) TYPES
// ==========================================

export type PushProductStatus = 
  | 'PROPOSED'          // Mới đề xuất (Chờ B2C/Growth phản hồi)
  | 'IN_DISCUSSION'     // Đang trao đổi & thương lượng điều kiện
  | 'CHANGE_REQUESTED'  // Có yêu cầu thay đổi (Chờ bên kia review)
  | 'LOCKED_APPROVED'   // Đã đồng thuận chốt (Khóa cho chiến dịch)
  | 'ARCHIVED';         // Đã kết thúc chu kỳ / Lưu trữ

export type PushProductFeasibility = 
  | 'HIGH_VIRAL'        // Tiềm năng viral cao, KOC rất thích
  | 'MEDIUM'            // Trung bình, cần kịch bản sáng tạo
  | 'CHALLENGING'       // Khó bán, cần deal sâu hoặc hỗ trợ ads
  | 'REJECTED_BY_B2C';  // B2C đánh giá không khả thi, đề xuất đổi

/** GROWTH: phía Brand / Quản lý đề xuất (giữ tên khoá cho dữ liệu cũ, khối Growth đã bỏ khỏi hệ thống). */
export type PushProductRole = 'GROWTH' | 'B2C' | 'MANAGEMENT';

export interface PushProductComment {
  id: string;
  authorName: string;
  authorRole: PushProductRole;
  authorAvatar?: string;
  content: string;
  type: 'COMMENT' | 'PRICE_DEAL' | 'SAMPLE_REQUEST' | 'FEASIBILITY_FEEDBACK' | 'LOCK_AGREEMENT';
  createdAt: string;
}

export type ChangeRequestType = 
  | 'CHANGE_PRICE' 
  | 'CHANGE_COMMISSION' 
  | 'CHANGE_SAMPLE_QUOTA' 
  | 'CHANGE_STOCK'
  | 'CHANGE_CYCLE_DATES'
  | 'REPLACE_SKU' 
  | 'CANCEL_PRODUCT';

export interface PushProductChangeRequest {
  id: string;
  type: ChangeRequestType;
  requestedBy: string;
  requesterRole: PushProductRole;
  requestedAt: string;
  reason: string;
  field: string;
  fieldLabel: string;
  oldValue: string | number;
  newValue: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface PushProductAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: PushProductRole;
  description: string;
}

export interface PushProductItem {
  id: string;
  sku: string;
  productName: string;
  
  // Chiều phân cấp: Brand => Gian hàng (Store) => Sản phẩm thúc đẩy
  brandId: string;
  brandName: string;
  brandCategory: string;
  storeId: string; // ID gian hàng
  storeName: string; // Tên gian hàng (VD: Kutieskin Official Store)
  platform: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA'; // Sàn thương mại
  storeUrl?: string; // Link gian hàng

  imageUrl?: string;
  cycleMonth: string; // e.g. "2026/10"
  campaignName: string; // e.g. "Chiến dịch Thúc Đẩy Tháng 10"
  startDate: string; // Ngày bắt đầu chu kỳ (YYYY-MM-DD)
  endDate: string; // Ngày kết thúc chu kỳ (YYYY-MM-DD)
  cycleType?: 'MONTHLY' | 'MEGA_CAMPAIGN' | 'PAYDAY' | 'FLASH_SALE' | 'CUSTOM';
  
  // Thông tin thương mại & hàng hóa cốt lõi (Growth thiết lập & thỏa thuận với B2C)
  originalPrice: number; // Giá niêm yết
  promotionalPrice: number; // Giá deal / giá bán chiến dịch thúc đẩy
  discountPercent: number; // % Giảm giá
  affiliateRate: number; // % Hoa hồng KOC / Affiliate
  availableStock: number; // Tồn kho khả dụng / cam kết giữ cho chiến dịch
  monthlySampleQuota: number; // Số lượng mẫu tối đa có thể cấp trong chu kỳ
  allocatedSampleCount: number; // Số lượng mẫu B2C đã cấp / booking thực tế
  
  // Không có target GMV tổng từ đầu (giữ optional nếu cần tham chiếu sau)
  targetGmv?: number;
  targetOrders?: number;

  // Thông tin sản phẩm & Brief KOC / KOL (Dùng trực tiếp để brief Creator)
  usp: string; // Điểm bán hàng độc nhất (USP / Key Selling Points)
  keyMessage?: string; // Thông điệp truyền thông chính cần KOC nhấn mạnh
  viralAngle: string; // Góc quay video / Content hook gợi ý
  targetKocNiche: string[]; // Tệp KOC phù hợp (Beauty, Mẹ bỉm, Học sinh sinh viên...)
  pdpUrl?: string; // Link sản phẩm trên sàn (Shopee / TikTok Shop) để KOC gắn giỏ hàng
  briefUrl?: string; // Link tài liệu Brief / Guideline chi tiết (Google Drive / Lark Docs)
  doAndDonts?: string; // Quy tắc NÊN làm & KHÔNG ĐƯỢC NÓI khi review
  sampleNotes?: string; // Điều kiện / chính sách cấp mẫu cho KOC
  feasibilityScore: PushProductFeasibility; // Đánh giá khả thi của B2C
  b2cEvaluationNote?: string; // Nhận xét / phản hồi từ B2C
  
  // Trạng thái B2C Input Brief KOC
  b2cBriefStatus?: 'PENDING_BRIEF' | 'BRIEF_COMPLETED'; // PENDING_BRIEF (chờ B2C nhập) hoặc BRIEF_COMPLETED
  briefUpdatedBy?: string; // Người B2C cập nhật brief
  briefUpdatedAt?: string; // Thời gian B2C cập nhật brief
  
  // Links phụ
  pdpUrlTikTok?: string;
  pdpUrlShopee?: string;

  // PICs
  b2cPic: string; // PIC B2C Booking phụ trách kết nối KOC
  
  // Workflow Status
  status: PushProductStatus;
  proposedAt: string;
  lockedAt?: string;
  lockedBy?: {
    b2cPic: string;
  };
  
  // Collaboration & Change Audit
  comments: PushProductComment[];
  changeRequests: PushProductChangeRequest[];
  auditLogs: PushProductAuditLog[];
}

export interface MasterBrandSummary {
  id: string;
  code: string;
  name: string;
  companyName: string;
  category: string;
  storeCount: number;
  platforms: string[];
  servicePackages: string[];
  status: 'ACTIVE' | 'PAUSED' | 'UPCOMING';
  accountPic?: string;
  monthlyBudget?: number;
  contractEndDate?: string;
}

export interface BrandDetail {
  id: string;
  code: string;
  name: string;
  companyName: string;
  category: string;
  color: string;
  status: 'ACTIVE' | 'PAUSED' | 'UPCOMING';
  logoUrl?: string;
  
  // Ngân sách & Mục tiêu
  planBudget: number;
  spentBudget: number;
  targetGmv: number;
  currentGmv: number;
  targetVideos: number;
  airedVideos: number;

  // Đội ngũ phụ trách 3 bên (PIC) & 3 vị trí gắn theo Brand (B2C Brand-level Positions)
  accountPic: string; // Account Manager làm việc với Brand
  bookingPicLead: string; // Trưởng nhóm Booking phụ trách KOC
  brandPicName?: string; // Brand PIC Lead (alias)
  contentBrandMainPic?: string; // Content / Brand main [theo brand]
  planStrategyPic?: string;     // Plan / Strategy [theo brand]
  keyVisualSisPic?: string;     // Key Visual / SIS [theo brand]
  staffCodes?: Record<string, string>; // Tên (viết thường) → mã nhân sự của các PIC cấp nhãn
  selfAirAllowed?: boolean; // Brand đã đồng ý: kịch bản gửi quá 72h chưa duyệt thì được đề xuất KOC tự Air

  // Tiêu chí & Guidelines
  brandGuideline: string;
  kocCriteria: string;
  forbiddenNotes?: string; // Điều cấm kỵ (VD: Không nhắc đối thủ, không dùng từ tuyệt đối...)

  // Gian hàng & Sản phẩm
  stores: EcomStore[];
  heroProducts: HeroProduct[];

  // Master Data helper attributes
  contactPerson?: string;
  contractEndDate?: string;
  monthlyBudget?: number;
  storeCount?: number;
  liveStoreCount?: number;
  offStoreCount?: number;
  internalStoreCount?: number;
  platforms?: string[];
  servicePackages?: string[];
  contentPic?: string;
  profileStatus?: 'CONFIGURED' | 'NOT_CONFIGURED';
}

export type GrowthDemandStatus = 
  | 'PENDING_BREAKDOWN' // Chờ Booking lập Plan
  | 'PLANNED'           // Booking đã lập xong, chờ duyệt
  | 'LEAD_APPROVED'     // Growth / Quản lý đã duyệt
  | 'IN_EXECUTION'      // Đang triển khai booking
  | 'REJECTED';         // Yêu cầu điều chỉnh lại

export interface GrowthDemandBreakdownTier {
  tier: KocTier;
  tierLabel: string;
  salaryGradeLabel: string; // e.g. KL7, KL6, KL4-KL5, KL1-KL3
  targetCount: number; // Số lượng KOC/KOL cần book
  estimatedAvgCost: number; // Chi phí dự kiến trung bình / KOC (VNĐ)
  allocatedBudget: number; // = targetCount * estimatedAvgCost
  estimatedGmvPerKoc: number; // GMV kỳ vọng trung bình / KOC
  totalExpectedGmv: number; // = targetCount * estimatedGmvPerKoc
  historicalRoiBenchmark: number; // e.g. 3.5x, 5.0x, 6.5x, 8.5x
  notes?: string;
}

export interface SelfChannelPlan {
  plannedVideos: number;
  approvedVideos: number;
  reportedVideos: number;
  productionBudget: number;
  reportedCost: number;
  reupTargets: {
    tiktok: number;
    shopee: number;
    facebook: number;
    threads: number;
  };
}

export interface LivestreamPlan {
  inhouseSessionsHn: number;
  inhouseSessionsHcm: number;
  ctvSessions: number;
  totalHours: number;
  affiliateLiveSessions: number;
  plannedBudget: number;
  reportedBudget: number;
  plannedGmv: number;
  reportedGmv: number;
}

export interface PlanFourStageTracking {
  planBudget: number;
  approvedBudget: number;
  adjustedBudget: number;
  reportedBudgetMtd: number;
  budgetGapMtd: number;
  planNmv: number;
  approvedNmv: number;
  adjustedNmv: number;
  reportedNmvMtd: number;
  nmvGapMtd: number;
  cancellationRate: number; // e.g. 0.08 = 8%
}

export interface GrowthDemandItem {
  id: string;
  code: string; // e.g. GD-2026-10-01
  title: string; // e.g. "Chiến dịch Mega Sale 10.10 - Gian hàng TikTok Senka"
  brandName: string;
  brandCategory: string;
  month: string; // "2026/10"
  totalAssignedBudget: number; // Ngân sách Growth giao (e.g. 150,000,000 đ)
  targetGmv: number; // Target GMV Growth giao (e.g. 750,000,000 đ)
  cancellationRate?: number; // Tỉ lệ hủy đơn dự kiến (e.g. 0.08)
  targetNmv?: number; // Target NMV thuần = GMV * (1 - Tỉ lệ hủy)
  targetCir: number; // CIR trần kỳ vọng = Budget / Target GMV (e.g. 20.0%)
  bookingPic: string; // Booking PIC chịu trách nhiệm lập plan
  deadlineBreakdown: string; // Hạn chót lập plan (SLA 24h)
  growthNotes: string; // Định hướng sản phẩm chủ lực, SKU, Hook mong muốn từ Growth
  status: GrowthDemandStatus;
  quarter?: string; // e.g. "2026-Q4" (Hỗ trợ Planning cấp Quý)
  workstream?: WorkstreamType; // Phân luồng công việc
  targetOutputsCount?: number; // Số lượng video / phiên live cam kết
  breakdown: GrowthDemandBreakdownTier[];
  selfChannelPlan?: SelfChannelPlan;
  livestreamPlan?: LivestreamPlan;
  fourStageTracking?: PlanFourStageTracking;
  bookingStrategyNotes?: string;
  exceptionExplanation?: string;
  createdAt: string;
  approvedAt?: string;
}

// ==========================================
// BRAND CLIENT HUB TYPES (4-STAGE PIPELINE)
// ==========================================
export type BrandPlanApprovalStatus = 
  | 'PENDING_BRAND_PLAN' 
  | 'BRAND_PLAN_APPROVED' 
  | 'BRAND_PLAN_REVISION_REQUESTED';

export type BrandRejectReasonType = 
  | 'Lệch định vị thương hiệu'
  | 'Từng booking đối thủ cạnh tranh'
  | 'Rủi ro hình ảnh / Scandal'
  | 'Chất giọng / Phong cách chưa phù hợp'
  | 'Yêu cầu Creator chuyên môn cao hơn (Bác sĩ/Dược sĩ)'
  | 'Lý do khác';

export interface BrandKocCandidate {
  id: string;
  stageName: string;
  channelId: string;
  channelUrl: string;
  tier: KocTier;
  tierLabel: string;
  followers: number;
  avgViews: number;
  engagementRate: number; // e.g. 4.8%
  niche: string;
  avatarUrl?: string;
  formatDescription: string; // e.g. "Video ngắn 60s TikTok Shop + Gắn giỏ hàng + Quyền Spark Ads 30 ngày"
  sampleVideoUrls: { title: string; url: string }[];
  brandApprovalStatus: 'CHỜ_DUYỆT' | 'ĐÃ_DUYỆT' | 'TỪ_CHỐI';
  rejectReason?: string;
}

export interface BrandScriptItem {
  id: string;
  dealCode: string;
  kocStageName: string;
  channelId: string;
  tier: KocTier;
  productName: string;
  videoDuration: string;
  hook: string;
  painPoint: string;
  solutionAndUsp: string;
  callToAction: string;
  status: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  revisionCount: number; // Max 2 revisions
  remainingHours: number; // SLA countdown
  brandFeedback?: string;
  draftVideoUrl?: string;
  reviewMode?: 'DIRECTIVE' | 'VETTING_GUARDRAILS';
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  klCode?: string;
  mandatoryShots?: string;
  forbiddenClaims?: string;
  rightsGuardrails?: string; // Watermarked draft video
  publishedVideoUrl?: string;
  views?: number;
  gmv?: number;
}

export interface BrandCampaignPortalData {
  id: string;
  brandId: string;
  brandName: string;
  brandLogoText: string;
  campaignCode: string;
  campaignTitle: string;
  month: string;
  totalBudget: number;
  targetGmv: number;
  targetCir: number; // e.g. 20.0%
  focusSkus: string[];
  bigIdea: string;
  planApprovalStatus: BrandPlanApprovalStatus;
  planApprovalDate?: string;
  planFeedbackNotes?: string;
  breakdownTiers: GrowthDemandBreakdownTier[];
  kocCandidates: BrandKocCandidate[];
  scripts: BrandScriptItem[];
  liveAiredVideosCount: number;
  totalTargetVideos: number;
  totalAiredViews: number;
  totalAffiliateGmv: number;
  accountPic: string;
  bookingPic: string;
}

// Quản lý Vận đơn gửi mẫu & Chống bùng mẫu (KOC Sample Delivery & Anti-Ghosting)
export interface SampleShipment {
  id: string;
  dealId?: string; // Khóa ngoại trỏ trực tiếp đến BookingDealItem.id
  dealCode: string;
  kocName: string;
  kocPhone: string;
  shippingAddress: string;
  brandName: string;
  productName: string;
  carrier: 'GHN' | 'ViettelPost' | 'J&T' | 'ShopeeExpress';
  trackingCode: string;
  sentDate: string;
  deliveredDate?: string;
  status: 'DELIVERING' | 'DELIVERED' | 'DEMO_SUBMITTED' | 'AIRED' | 'GHOST_WARNING' | 'BLACKLISTED';
  daysSinceDelivered: number; // Đếm ngày từ khi KOC nhận hàng
  demoDeadlineDays: number; // Mặc định 5 ngày theo quy chuẩn
  sparkAdsCode?: string;
  sparkAdsExpiryDays?: number; // 30 ngày, 60 ngày
  isMediaHandedOff?: boolean; // Đã bàn giao cho team media chạy ads chưa
  bookingPic: string;
  notes?: string;
}

// Bảng 2. Hệ số gian hàng (HS phạm vi cho việc cấp Sàn và cấp Brand)
export type StoreDifficultyTier = 'Cơ bản' | 'Tiêu chuẩn' | 'Vừa' | 'Khó';
export type StoreCoefficientApprovalStatus =
  | 'APPROVED_START_OF_MONTH'     // Đã được quản lý duyệt đầu tháng
  | 'PENDING_MANAGER_APPROVAL'    // Chờ quản lý duyệt đầu tháng
  | 'ADJUSTED_BY_APPROVED_PLAN';  // Điều chỉnh trong tháng theo Plan điều chỉnh được duyệt

export interface StoreCoefficientRuleItem {
  tier: StoreDifficultyTier;
  multiplier: number; // 0.80 | 1.00 | 1.25 | 1.50
  multiplierLabel: string; // '0,80' | '1,00' | '1,25' | '1,50'
  definition: string;
  example: string;
}

export const STORE_COEFFICIENT_TABLE_2: {
  title: string;
  rows: StoreCoefficientRuleItem[];
  principle: string;
  applicationScope: string;
} = {
  title: 'Bảng 2. Hệ số gian hàng (HS phạm vi cho việc cấp Sàn và cấp Brand)',
  rows: [
    {
      tier: 'Cơ bản',
      multiplier: 0.8,
      multiplierLabel: '0,80',
      definition: 'Store ổn định, quy trình rõ, ít thay đổi, nguồn lực sẵn có',
      example: 'Chủ yếu vận hành lặp lại',
    },
    {
      tier: 'Tiêu chuẩn',
      multiplier: 1.0,
      multiplierLabel: '1,00',
      definition: 'Khối lượng và yêu cầu đúng benchmark thông thường',
      example: 'Phối hợp cơ bản, deadline tiêu chuẩn',
    },
    {
      tier: 'Vừa',
      multiplier: 1.25,
      multiplierLabel: '1,25',
      definition: 'Nhiều bên phối hợp, nhiều vòng duyệt hoặc deadline gấp; các case có ngành hàng mới, cần nhân sự mở rộng scope, ngành hàng',
      example: 'Brief thay đổi, talent khó vừa',
    },
    {
      tier: 'Khó',
      multiplier: 1.5,
      multiplierLabel: '1,50',
      definition: 'Talent hiếm, nhiều ràng buộc, yêu cầu đặc biệt hoặc rủi ro cao',
      example: 'Campaign chiến lược, độc quyền',
    },
  ],
  principle:
    'Hệ số gian hàng được quản lý duyệt đầu tháng. Một store chỉ áp dụng một hệ số trong cùng kỳ. Nếu thay đổi scope lớn trong tháng, phải có Plan điều chỉnh được duyệt. Không tự nâng hệ số sau khi đã có kết quả.',
  applicationScope: 'Áp dụng theo store, không theo brand',
};

export function getStoreCoefficientByTier(tier?: StoreDifficultyTier | string): number {
  switch (tier) {
    case 'Cơ bản':
      return 0.8;
    case 'Tiêu chuẩn':
      return 1.0;
    case 'Vừa':
      return 1.25;
    case 'Khó':
      return 1.5;
    default:
      return 1.0;
  }
}

export function getStoreTierByCoefficient(multiplier?: number): StoreDifficultyTier {
  if (multiplier === undefined || multiplier === null) return 'Tiêu chuẩn';
  if (multiplier <= 0.85) return 'Cơ bản';
  if (multiplier <= 1.1) return 'Tiêu chuẩn';
  if (multiplier <= 1.35) return 'Vừa';
  return 'Khó';
}

/**
 * Chuẩn hóa hệ số gian hàng về đúng 4 mức Bảng 2 (0.80, 1.00, 1.25, 1.50).
 * Nếu truyền vào dữ liệu cũ (1.2, 1.4, 1.6), ưu tiên lấy theo difficultyTier chuẩn Bảng 2.
 */
export function normalizeStoreCoefficient(tier?: StoreDifficultyTier | string, rawMultiplier?: number): {
  tier: StoreDifficultyTier;
  multiplier: number;
  label: string;
  rule: StoreCoefficientRuleItem;
} {
  let resolvedTier: StoreDifficultyTier = 'Tiêu chuẩn';
  if (tier === 'Cơ bản' || tier === 'Tiêu chuẩn' || tier === 'Vừa' || tier === 'Khó') {
    resolvedTier = tier;
  } else if (rawMultiplier !== undefined) {
    resolvedTier = getStoreTierByCoefficient(rawMultiplier);
  }
  const rule =
    STORE_COEFFICIENT_TABLE_2.rows.find(r => r.tier === resolvedTier) ||
    STORE_COEFFICIENT_TABLE_2.rows[1];
  return {
    tier: rule.tier,
    multiplier: rule.multiplier,
    label: rule.multiplierLabel,
    rule,
  };
}

export function formatStoreCoefficient(multiplier?: number, tier?: StoreDifficultyTier | string): string {
  if (multiplier === 0.8 || multiplier === 1.0 || multiplier === 1.25 || multiplier === 1.5) {
    return multiplier.toFixed(2).replace('.', ',');
  }
  return normalizeStoreCoefficient(tier, multiplier).label;
}

export interface StoreDifficultyConfig {
  id: string;
  storeName: string;
  platform: 'TikTok Shop' | 'Shopee' | 'Lazada';
  brandName?: string;
  difficultyTier: StoreDifficultyTier;
  multiplier: number; // 0.80 | 1.00 | 1.25 | 1.50 (Bảng 2)
  category: string; // Mỹ phẩm, Thời trang, Mẹ & Bé, Gia dụng
  monthlyTargetGmv: number;
  assignedPic: string;
  accountOwner?: string;
  b2cOwner?: string;
  activeKocsCount?: number;
  notes?: string;
  coefficientApprovalStatus?: StoreCoefficientApprovalStatus;
  coefficientApprovedBy?: string;
  coefficientApprovedAt?: string;
  coefficientPeriodMonth?: string;
  coefficientAdjustedPlanCode?: string;
  coefficientAdjustmentReason?: string;
  hasCompletedPeriodResult?: boolean;
}

// Đánh giá hiệu suất 4P & Tính thưởng P3
export interface StaffP3Record {
  id: string;
  staffName: string;
  role: 'Booking' | 'Content' | 'Brand';
  level: 'Intern' | 'Junior' | 'Senior' | 'Lead';
  assignedStore: string;
  storeMultiplier: number; // 0.80 | 1.00 | 1.25 | 1.50 (Bảng 2)
  completedCases: number; // Số ca/job hoàn thành trong tháng
  qualityMultiplier: number; // 0.9 - 1.15
  slaMultiplier: number; // 0.8 - 1.2
  calculatedWorkloadPoints: number; // Workload = Cases * StoreMulti * Quality * SLA
  baseP3UnitRate: number; // Đơn giá 1 điểm workload (VD: 35.000đ/điểm)
  estimatedBonusVnd: number;
  approvalStatus: 'CHỜ_DUYỆT' | 'ĐÃ_DUYỆT' | 'YÊU_CẦU_ĐIỀU_CHỈNH';
  reviewNotes?: string;
}

// Dữ liệu kế hoạch chi tiết từ 4.1.1 Input Plan (Bậc KL1 - KL7)
export interface WeeklyStorePlan411 {
  id: string;
  month: string; // 2026/09
  week: string; // W37 [04.09-10.09], W38...
  pic: string;
  storeName: string;
  tiktokAffiliateQty: number;
  tapAffiliateQty: number;
  kocTiersCount: {
    kl1: number;
    kl2: number;
    kl3: number;
    kl4: number;
    kl5: number;
    kl6: number;
    kl7: number;
  };
  totalAffiliateBudget: number;
  tierBudgets: {
    kl1: number;
    kl2: number;
    kl3: number;
    kl4: number;
    kl5: number;
    kl6: number;
    kl7: number;
  };
  actualBookedQty: number;
  actualSpentBudget: number;
  targetGmv?: number;
  notes?: string;
  quarter?: string;
  workstream?: WorkstreamType;
}

// =========================================================================
// 6 CANONICAL MODULES EXTENSIONS
// =========================================================================

// --- MODULE 1: PORTFOLIO / STORE MANAGEMENT ---
export type ServiceModel = 'FULL_SERVICE' | 'AFFILIATE_ONLY' | 'LIVESTREAM_DEDICATED';
export type AccountStatus = 'ONBOARDING' | 'ACTIVE' | 'MAINTENANCE' | 'OFFBOARDED';

export interface StorePortfolioItem {
  id: string;
  brandName: string;
  storeName: string;
  platform: 'TikTok Shop' | 'Shopee Mall' | 'Lazada';
  storeUrl?: string;
  bookingSheetUrl?: string; // Link Google Sheet chung của gian hàng
  planSheetTab?: string; // Tên tab Sheet 1: Plan tháng trên Google Sheet
  defaultSheetTab?: string; // Tên tab Sheet 2: Listing KOC trên Google Sheet
  reportSheetTab?: string; // Tên tab Sheet 3: Kết quả / Report trên Google Sheet
  /** Kênh của Brand để đăng video Self-channel (handle hoặc link kênh) theo nền tảng; dùng kiểm link đăng đúng kênh */
  selfChannelHandles?: Partial<Record<'tiktok' | 'shopee' | 'facebook' | 'instagram' | 'youtube', string>>;
  serviceModel: ServiceModel;
  difficultyTier: StoreDifficultyTier;
  difficultyMultiplier: number; // 0.80, 1.00, 1.25, 1.50 (Bảng 2. Hệ số gian hàng)
  coefficientApprovalStatus?: StoreCoefficientApprovalStatus; // Trạng thái quản lý duyệt hệ số đầu tháng / điều chỉnh theo Plan
  coefficientApprovedBy?: string; // Quản lý phê duyệt đầu tháng (VD: Đặng Thị Yến Nhi)
  coefficientApprovedAt?: string; // Ngày duyệt đầu tháng (VD: 2026-10-01)
  coefficientPeriodMonth?: string; // Kỳ áp dụng (VD: 2026/10 - Một store chỉ áp dụng 1 hệ số trong cùng kỳ)
  coefficientAdjustedPlanCode?: string; // Mã Plan điều chỉnh được duyệt nếu thay đổi scope lớn trong tháng
  coefficientAdjustmentReason?: string; // Lý do / căn cứ áp dụng hoặc điều chỉnh scope trong tháng
  hasCompletedPeriodResult?: boolean; // Đã có kết quả kỳ (không được tự nâng hệ số sau khi đã có kết quả)
  accountStatus: AccountStatus;
  category: string;
  monthlyTargetGmv: number;
  monthlyBudget: number;
  accountOwnerName: string; // Account/Growth Owner phụ trách doanh số & quan hệ khách hàng
  b2cOwnerName: string; // B2C Ops Owner phụ trách vận hành nội dung & booking
  assignedStaff?: string; // Alias for primary B2C Ops assignee
  assignedPic?: string; // Alias cho nhân sự phụ trách chính
  mainProducts?: string[]; // Danh sách sản phẩm chủ lực gợi ý của gian hàng
  hasBookingLeader?: boolean; // Trưởng phòng chọn theo tháng: true = có Lead sơ duyệt, false = duyệt trực tiếp
  bookingLeader?: string; // Trưởng nhóm Booking phụ trách nhóm (nếu có)
  primaryPic?: string; // Chuyên viên chính chủ trì gian hàng (ví dụ: 'Khánh Vy')
  assignedMembers?: string[]; // Danh sách các chuyên viên trong nhóm cùng thực thi
  b2cOwners?: string[]; // Danh sách các nhân sự B2C Ops cùng làm 1 shop (hỗ trợ trường hợp 2+ nhân viên làm cùng 1 shop)
  assignmentNotes?: string; // Ghi chú phân chia công việc (ví dụ: chia theo Tier KOC, chia ca, chia đầu việc)
  activeCandidatesCount?: number;
  activeBookingsCount?: number;
  activeContentsCount?: number;
  createdAt?: string;

  // Tùy chọn B2C Quản trị Kế hoạch
  isB2cManaged?: boolean; // Marketing B2C có phụ trách gian hàng này không (mặc định true)
  requiresB2cPlan?: boolean; // Gian hàng này có cần làm kế hoạch B2C tháng không (mặc định true)
  budgetAffiliate?: number; // Ngân sách Affiliate dự toán
  budgetSelfChannel?: number; // Ngân sách Self Channel dự toán
  targetAffiliateContents?: number; // Chỉ tiêu số video Affiliate
  targetSelfChannelContents?: number; // Chỉ tiêu số video Self Channel
  budgetGross?: number; // Ngân sách Gross tổng
  budgetNet?: number; // Ngân sách Net tổng (sau thuế Kế toán kiểm soát)
  budgetAffiliateGross?: number; // Ngân sách Affiliate Gross
  budgetAffiliateNet?: number; // Ngân sách Affiliate Net
  budgetSelfChannelGross?: number; // Ngân sách Kênh Brand Gross
  budgetSelfChannelNet?: number; // Ngân sách Kênh Brand Net
  budgetLive?: number; // Ngân sách Livestream
  targetPaidVideos?: number; // Chỉ tiêu video trả phí
  targetFocVideos?: number; // Chỉ tiêu suất gửi mẫu miễn phí (FOC 0đ)
  targetLiveSessions?: number; // Chỉ tiêu số phiên livestream
  actualSpentNet?: number; // Thực chi lũy kế File 3.2
  actualAiredVideos?: number; // Số video đã air thực tế
  financialRiskStatus?: 'NORMAL' | 'OVERBUDGET' | 'UNBUDGETED' | 'SLOW_BURN'; // Đánh giá rủi ro tài chính
  financialRiskNotes?: string; // Ghi chú rủi ro tài chính
  handoverEffectiveDate?: string; // Ngày hiệu lực chuyển giao PIC giữa kỳ
  previousPic?: string; // PIC tiền nhiệm trước khi bàn giao

  // Upbase Master Data (5.1 Stores)
  storeOperationId?: string; // Mã vận hành chuẩn SOxxxx (SO0001, SO1000...)
  storeOperation?: string; // Tên nhận diện vận hành: Brand_Platform_Service
  servicePackage?: string; // E2E-S, Live-S, MCN-S, Standard...
  servicePackageName?: string; // E2E - Service, Live - Service...
  contentPic?: string; // PIC phụ trách Content
  /** Giám đốc gán theo gian: chỉ nhập phần Định hướng của Plan tháng của Brand */
  planStrategyPic?: string;
  /** Giám đốc gán theo gian: chỉ nhập phần Key Visual của Plan tháng của Brand */
  keyVisualSisPic?: string;
  csListingPic?: string; // PIC CS Listing
  csDesignPic?: string; // PIC CS Design
  livestreamPic?: string; // PIC Livestream inhouse
  teamGrowth?: string; // Team Growth phụ trách
  liveDate?: string; // Ngày bắt đầu Live
  offDate?: string; // Ngày kết thúc hợp đồng / Off
  brandId?: string; // Mã Brand ID (BRAND001...)
  cmsRate?: number | string; // % CMS thu Brand
  fixFeeLivePerHour?: number; // Fix fee / giờ livestream
  operationStatus?: 'Live' | 'Off' | 'Kênh nội bộ';
  platformStoreId?: string; // ID kỹ thuật gian hàng trên sàn (TTS shop_id, Shopee shopid)
  affiliateRate?: number; // Tỷ lệ hoa hồng liên kết sàn (%)
  requiresSparkAds?: boolean; // Yêu cầu ủy quyền mã QC Spark Ads / Ads Shopee

  // Quản trị vai trò dự phòng (Backup PIC) theo BRD
  backupOwnerId?: string; // ID nhân sự dự phòng khi PIC chính vắng mặt/nghỉ phép/quá tải
  backupOwnerName?: string; // Tên nhân sự dự phòng
  isBackupActive?: boolean; // Trạng thái kích hoạt chuyển quyền backup
  backupReason?: string; // Lý do chuyển giao: Nghỉ phép, Đi công tác, Quá tải
  backupFrom?: string; // Ngày bắt đầu hiệu lực dự phòng (YYYY-MM-DD)
  backupTo?: string; // Ngày kết thúc hiệu lực dự phòng (YYYY-MM-DD)
  staffCodes?: Record<string, string>; // Tên (viết thường) → mã nhân sự của mọi người ghi trên gian; nhận người theo mã khi tên trùng / đổi tên

  // Trường kiểm toán (Audit Fields) theo BRD
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Chuẩn hóa việc đọc Nhân viên chính (Primary PIC) và danh sách Nhân viên hỗ trợ (Supporting Staff)
 * từ một bản ghi Gian hàng (Single Source of Truth theo RULE-SYNC-01).
 */
export function resolveStoreStaffAssignment(
  store: Pick<
    StorePortfolioItem,
    'primaryPic' | 'b2cOwnerName' | 'b2cOwners' | 'assignedMembers' | 'assignedStaff' | 'assignedPic' | 'backupOwnerName'
  >,
  fallbackPrimary = 'Lê Phương Thảo'
): {
  primaryPic: string;
  supportStaff: string[];
  allOwners: string[];
} {
  const isValidName = (n?: string) => {
    const t = (n || '').trim();
    return Boolean(t && t !== 'Chưa phân công' && t !== 'Chưa giao' && t !== 'Chưa gán' && t !== '—');
  };

  const splitNames = (raw?: string) =>
    (raw || '')
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(isValidName);

  const ownerTokens = [
    ...(store.b2cOwners || []).flatMap(splitNames),
    ...splitNames(store.primaryPic),
    ...splitNames(store.b2cOwnerName),
    ...splitNames(store.assignedStaff),
    ...splitNames(store.assignedPic),
  ];

  const primaryPic = ownerTokens[0] || fallbackPrimary;

  const supportSet = new Set<string>();
  const addSupport = (n?: string) => {
    for (const part of splitNames(n)) {
      if (part.toLowerCase() !== primaryPic.toLowerCase()) {
        supportSet.add(part);
      }
    }
  };

  (store.b2cOwners || []).slice(1).forEach(addSupport);
  splitNames(store.b2cOwnerName).slice(1).forEach(addSupport);
  (store.assignedMembers || []).forEach(addSupport);
  if (store.backupOwnerName) addSupport(store.backupOwnerName);

  const supportStaff = Array.from(supportSet);
  return {
    primaryPic,
    supportStaff,
    allOwners: [primaryPic, ...supportStaff],
  };
}

// MASTER DATA NHÂN VIÊN & PHÂN CÔNG GIAN HÀNG
export interface StaffMasterMember {
  id: string;
  name: string;
  role: 'BOOKING' | 'CONTENT' | 'ACCOUNT' | 'GROWTH' | 'MANAGER';
  team: string;
  roleTitle: string;
  avatar: string;
  email: string;
  phone?: string;
  maxStoresCapacity: number;

  // Upbase Master Data (6.2 Nhân sự Booking)
  staffCode?: string; // ID nhân sự (HN782, HCM105...)
  gender?: string; // Nam / Nữ
  location?: 'HN' | 'HCM' | string; // Khu vực làm việc
  employmentType?: 'Chính thức' | 'Cộng tác viên' | 'Thực tập sinh' | string; // Loại hình nhân sự
  department?: string; // Phòng ban (Growth 1-6, Booking, Livestream, MCN...)
  position?: string; // Vị trí chức danh
  startDate?: string; // Ngày bắt đầu làm việc
}

// --- MODULE 2: PLANNING ---
export type WorkstreamType = 'KOC_AFFILIATE' | 'INHOUSE_VIRAL' | 'LIVESTREAM_OPS' | 'SPARK_ADS_BOOST';

// --- MODULE 3: EXECUTION (DECOUPLED PIPELINE) ---
export type CandidateStatus = 
  | 'PROSPECTING' 
  | 'CONTACTED' 
  | 'PITCHED' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'CONVERTED_TO_BOOKING';

export interface KocCandidateItem {
  id: string;
  candidateCode: string; // CAN-26-001
  stageName: string;
  channelId: string;
  channelUrl: string;
  platform: 'TIKTOK' | 'SHOPEE' | 'INSTAGRAM' | 'FACEBOOK';
  tier: KocTier;
  tierLabel: string;
  // 4 Phân loại cốt lõi (Sheet 3.1 & 3.2)
  salaryGrade?: SalaryGrade;
  segment?: CreatorSegment;
  tepKenh?: TepKenh;
  creatorCategory?: CreatorNiche;
  kocCategory?: KocCategory;
  followers: number;
  avgViews: number;
  rateCardExpected: number;
  outreachStatus: CandidateStatus;
  brandName: string;
  storeName?: string;
  assignedPic: string; // Booking PIC tiếp cận
  pitchBatch?: string; // Đợt 1, Đợt 2...
  rejectionReason?: string;
  contactedAt?: string;
  convertedBookingId?: string;
}

// --- MODULE 4: CONTENT ---
export type ContentFormatType = 
  | 'VIDEO_SHORT_60S' 
  | 'VIDEO_HOOK_30S' 
  | 'LIVESTREAM_SESSION' 
  | 'CAROUSEL_PHOTO';

export type QcStatusType = 'PENDING' | 'PASS' | 'REVISION_REQUIRED';

export interface ContentItemModel {
  id: string;
  contentCode: string; // CNT-26-001
  bookingDealId: string;
  dealCode: string;
  campaignTitle: string;
  creatorName: string;
  pillar: ContentPillarType | string;
  angle: string;
  format: ContentFormatType;
  channel: 'TIKTOK' | 'SHOPEE' | 'REELS' | 'THREADS';
  scriptHook: string;
  scriptPainPoint: string;
  scriptUsp: string;
  scriptCta: string;
  scriptStatus: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  revisionCount: number; // Max 2
  demoVideoUrl?: string;
  demoStatus: 'NOT_SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  qcStatus: QcStatusType;
  qcChecklistNotes?: string;
  approvedAt?: string;
  publicationsCount?: number;
  publications?: PublicationItemModel[];
  reviewMode?: 'DIRECTIVE' | 'VETTING_GUARDRAILS';
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  klCode?: string;
  mandatoryShots?: string;
  forbiddenClaims?: string;
  rightsGuardrails?: string;
}

export interface PublicationItemModel {
  id: string;
  publicationCode: string; // PUB-26-001
  contentItemId: string;
  contentCode: string;
  dealCode: string;
  creatorName: string;
  platform: 'TIKTOK' | 'SHOPEE' | 'REELS' | 'THREADS';
  platformPostUrl: string;
  platformPostId?: string;
  sparkAdsCode?: string;
  sparkAdsExpiryDays?: number;
  isMediaHandedOff: boolean;
  publishedAt: string;
  viewsCount: number;
  likesCount: number;
  affiliateGmv: number;
  itemsSold: number;
  costAttributed: number;
  roi: number;
  verificationStatus: 'PENDING_AUDIT' | 'VERIFIED' | 'REJECTED';
}

// --- MODULE 6: CONTROL TOWER METRICS ---
export interface ControlTowerSummary {
  planGmv: number;
  actualGmv: number;
  gmvAchievementRate: number; // %
  planBudget: number;
  actualSpentBudget: number;
  budgetBurnRate: number; // %
  cirCurrent: number; // %
  slaOnTimeRate: number; // %
  pendingBacklogCases: number;
  bottleneckTeam: string;
  firstTimePassRate: number; // % kịch bản pass ngay vòng 1
  ghostSampleWarnings: number;
  overloadStaffCount: number;
}

// =========================================================================
// STAFF DETAILED PLAN & MATRIX ALLOCATION TYPES
// =========================================================================
export type StaffPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED' | 'CONVERTED';

export interface StaffDetailedPlanItem {
  id: string;
  staffName: string;
  month: string; // e.g. '2026/09'
  brandName: string;
  tier: KocTier; // TIER_1_CELEB, TIER_2_MACRO, TIER_3_MICRO, TIER_4_AFFILIATE
  salaryGrade: SalaryGrade; // KL1 - KL7
  targetWeek: 'W1' | 'W2' | 'W3' | 'W4';
  kocStageName: string; // Tên KOC cụ thể hoặc "[Slot trống] Cần tìm KOC"
  channelId?: string;
  channelUrl?: string;
  tepKenh?: TepKenh;
  contentPillar?: string; // Review trực tiếp, Nỗi đau - Giải pháp, Unboxing, FOMO, Daily Vlog...
  storeName?: string; // Tên gian hàng phụ trách
  productId?: string; // ID Sản phẩm đẩy
  productName?: string; // Tên Sản phẩm đẩy
  contentAngleId?: string; // ID Content Angle cụ thể
  contentAngleName?: string; // Tên Angle
  contentHook?: string; // Hook 3s gợi ý cho KOC
  budgetEstimated: number; // VNĐ
  targetGmv: number; // VNĐ
  status: StaffPlanStatus;
  dealCode?: string;
  leadNotes?: string;
  updatedAt: string;
}

export interface StaffPlanOverview {
  staffName: string;
  month: string;
  assignedQuota: {
    tier1Videos: number;
    tier2Videos: number;
    tier3Videos: number;
    tier4Videos: number;
    totalVideos: number;
    planBudget: number;
    targetGmv: number;
    assignedBrands: string[];
  };
  plannedCount: number; // Số slot đã lên plan
  plannedBudget: number; // Tổng ngân sách đã phân vào slot
  plannedGmv: number; // Tổng GMV dự kiến
  fillRateVideos: number; // % = plannedCount / totalVideos
  fillRateBudget: number; // % = plannedBudget / planBudget
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED';
  managerFeedback?: string;
}

// ==========================================
// AI EMPLOYEE PROGRESS & PERFORMANCE REVIEW TYPES
// ==========================================
export type AiReviewType = 
  | 'COMPREHENSIVE' 
  | 'PROGRESS_PACING' 
  | 'SLA_QUALITY' 
  | 'P3_WORKLOAD' 
  | 'COACHING_ONE_ON_ONE';

export interface AiEmployeeReviewRequest {
  staffName: string;
  role: string;
  team?: string;
  month?: string;
  reviewType: AiReviewType;
  allocationData?: {
    totalPlannedVideos: number;
    targetVideos: number;
    totalPlannedBudget: number;
    targetBudget: number;
    totalPlannedGmv: number;
    targetGmv: number;
    fillRateVideos: number;
    fillRateBudget: number;
    assignedBrands?: string[];
  };
  slaData?: {
    onTimeRate: number;
    totalJobs: number;
    breachedJobs: number;
    penaltyPoints: number;
    currentScore: number;
    rating: string;
    violationsCount: number;
  };
  workloadP3Data?: {
    completedCases: number;
    storeMultiplier: number;
    qualityMultiplier: number;
    slaMultiplier: number;
    calculatedWorkloadPoints: number;
    estimatedBonusVnd: number;
  };
  recentDealOrPlanContext?: string;
  apiKey?: string;
  apiProvider?: 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'AUTO';
  customPrompt?: string;
}

export interface AiEmployeeReviewResponse {
  staffName: string;
  overallGrade: 'Xuất sắc' | 'Đạt chuẩn' | 'Cần cải thiện' | 'Cảnh báo vi phạm';
  performanceScore: number; // 0 - 100
  pacingStatus: 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'CRITICAL_DELAY';
  executiveSummary: string;
  strengths: string[];
  bottlenecksAndRisks: string[];
  burnoutOrCapacityAlert?: string;
  actionableCoaching: string[];
  suggestedManagerNote: string;
  suggestedLarkPingMessage: string;
  evaluatedAt: string;
  providerUsed: string;
}

// =========================================================================
// 7. INPUT PLAN BREAKDOWN STUDIO TYPES (PHÂN RÃ KẾ HOẠCH B2C ĐA KÊNH & ĐA BẬC)
// =========================================================================

export type InputPlanChannelType = 
  | 'TIKTOK' 
  | 'SHOPEE' 
  | 'SHOPEE_VIDEO'
  | 'FACEBOOK' 
  | 'INSTAGRAM' 
  | 'THREADS' 
  | 'SELF_CHANNEL' 
  | 'LIVESTREAM';

export interface InputPlanRowItem {
  id: string;
  channel: InputPlanChannelType;
  platform: string;
  category: 'KOC_TIER' | 'PLATFORM_FORMAT' | 'SELF_CHANNEL' | 'LIVESTREAM';
  tierCode: SalaryGrade | 'Reup' | 'Affiliate' | 'Review voice' | 'Nhạc text' | 'Video remix' | 'Video AI' | 'Video giọng máy' | 'POV' | 'Độc quyền' | 'Add in' | 'Daily';
  tierLabel: string;
  salaryGrade?: SalaryGrade;
  contentFormat: string; // Loại nội dung (Review trực tiếp, Nỗi đau - Giải pháp, Unboxing, POV, v.v.)
  qty: number; // Số lượng nội dung / video
  unitCost: number; // Đơn giá VNĐ
  benchmarkCost: number; // Đơn giá tham chiếu Upbase
  totalBudget: number; // qty * unitCost
  expectedRoiMultiplier: number; // ROI ước tính
  targetGmv: number; // Doanh thu dự phóng
  productFocus?: string;
  notes?: string;
  isCustomFormat?: boolean;
  assignedStaff?: string; // Nhân sự trong team Booking được bạn PIC phân bổ
  staffNotes?: string; // Ghi chú/yêu cầu riêng của PIC cho nhân sự nhận slot
}

export type MonthlyPlanStatus = 
  | 'DRAFT'                  // Bản nháp đang phân rã
  | 'PENDING_PRE_APPROVAL'   // Chờ Booking Leader sơ duyệt (gian có Leader)
  | 'PRE_APPROVED'           // Leader sơ duyệt đạt (chỉ còn trong dữ liệu cũ)
  | 'REVISION_REQUESTED'     // Yêu cầu hiệu chỉnh (Leader / Trưởng phòng yêu cầu sửa)
  | 'PENDING_APPROVAL'       // Chờ Trưởng phòng phê duyệt chính thức
  | 'LEAD_APPROVED'          // Trưởng phòng đã duyệt
  | 'BRAND_APPROVED'         // Brand đã thông qua
  | 'APPROVED'               // Đã phê duyệt chính thức
  | 'LOCKED'                 // Đã đóng băng phiên bản chốt
  | 'IN_EXECUTION'           // Đang triển khai booking
  | 'COMPLETED'              // Đã nghiệm thu & đóng số tháng
  | 'ARCHIVED';              // Đã lưu trữ

/** GROWTH / MEDIA chỉ còn trong biên bản trao đổi cũ (đã bỏ 2 khối khỏi hệ thống), không đăng mới được. */
export type PlanDiscussionRole = 'BOOKING' | 'LEAD' | 'SYSTEM' | 'GROWTH' | 'MEDIA';

export type PlanDiscussionType = 
  | 'COMMENT' 
  | 'REVISION_REQUEST' 
  | 'PRE_APPROVAL_PASS' 
  | 'FINAL_APPROVAL_PASS' 
  | 'STATUS_CHANGE'
  | 'BUDGET_ADJUST'
  | 'VERSION_CREATED'
  | 'VERSION_LOCKED';

export interface PlanDiscussionMessage {
  id: string;
  authorName: string;
  authorRole: PlanDiscussionRole;
  authorTitle: string; // "Growth PIC", "Booking Specialist", "Media Specialist", "Trưởng Phòng B2C", "Hệ Thống"
  content: string;
  type: PlanDiscussionType;
  timestamp: string;
  tags?: string[];
  budgetDiff?: {
    oldBudget?: number;
    newBudget?: number;
    oldGmv?: number;
    newGmv?: number;
  };
}

export interface PlanApprovalStep {
  id: string;
  stage: 'DRAFT' | 'PRE_APPROVAL' | 'FINAL_APPROVAL' | 'EXECUTION';
  stageName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS';
  actorName?: string;
  actorRole?: PlanDiscussionRole;
  timestamp?: string;
  feedback?: string;
}

// Trạng thái ký duyệt đồng thuận 3 bên: Growth, Booking B2C, Media (+ Trưởng phòng)
export interface MultiPartySignOff {
  growth?: {
    confirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
    note?: string;
    targetNmv?: number;
    totalBudget?: number;
    adsBudget?: number;
  };
  booking: {
    confirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
    note?: string;
    totalContents?: number;
    allocatedBudget?: number;
  };
  media?: {
    confirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
    note?: string;
    targetRoas?: number;
    acceptedAdsBudget?: number;
  };
  leadB2c: {
    confirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
    note?: string;
  };
}

// Layer 1: Khung Chỉ Số Cốt Lõi (Các bên cùng điền, chỉnh sửa & bấm Chốt trước khi sang Layer 2 phân rã chi tiết)
export interface CorePlanMetricsLayer1 {
  isLocked?: boolean; // Đã nhấn Chốt khung Layer 1 để sang Layer 2 (vẫn mở khóa sửa lại được ở bản nháp/bản điều chỉnh)
  lockedBy?: string;
  lockedAt?: string;
  alignmentNote?: string;
  // 1. Mục tiêu doanh số
  targetNmvTotal: number;
  targetGmvAffiliate: number;
  targetGmvSelfChannel: number;
  targetGmvLivestream: number;
  // 2. Trần ngân sách chi phí (Net)
  pnlTotalBudgetNet: number; // Số tổng PnL ban đầu Growth đưa vào
  budgetAffiliateNet: number;
  budgetSelfChannelNet: number;
  budgetMultiPlatformNet: number;
  budgetLivestreamNet: number;
  budgetAdsNet: number;
  targetAdsRoas: number;
  // 3. Định mức sản lượng nội dung cần đạt
  qtyAffiliatePaid: number;
  qtyFocSample: number;
  qtySelfChannel: number;
  qtyMultiPlatform: number;
  qtyLivestreamSessions: number;
}

// Bản chụp bất biến của Phiên Bản Kế Hoạch đã chốt (Immutable Version Snapshot)
export interface PlanVersionSnapshot {
  id: string;
  versionCode: string; // 'v1.0', 'v1.1', 'v2.0'
  versionName: string; // 'Bản chốt đầu tháng (Baseline)', 'Điều chỉnh Đợt 2 (Top-up)'
  status: 'LOCKED' | 'SUPERSEDED';
  createdAt: string;
  createdBy: string;
  creatorRole: PlanDiscussionRole;
  changeReason?: string;
  totalTargetBudget: number;
  totalTargetContents: number;
  targetGmv: number;
  budgetAdsTotal: number; // Gói tổng Ads không phân tách kênh
  budgetAffiliate: number;
  budgetSelfChannel: number;
  coreMetricsLayer1?: CorePlanMetricsLayer1;
  items: InputPlanRowItem[];
  signOffRecord: MultiPartySignOff;
}

// =========================================================================
// BIÊN BẢN LÀM VIỆC & THỐNG NHẤT KẾ HOẠCH (PLANNING ALIGNMENT PROTOCOLS)
// =========================================================================
export interface PlanAlignmentProtocol {
  id: string; // VD: "BB-202610-KUTI-01"
  protocolNumber: string; // "BB-01/MKT-GROWTH/2026-10"
  planId: string;
  type: 'INITIAL_ALIGNMENT' | 'REVISION_REQUEST' | 'FINAL_SETTLEMENT';
  typeName: string; // 'Biên bản Thống nhất Đầu kỳ', 'Biên bản Điều chỉnh Giữa kỳ', 'Biên bản Nghiệm thu'
  title: string;
  targetVersionCode: string; // 'v1.0', 'v1.1'
  status: 'DRAFTING' | 'IN_DISCUSSION' | 'SIGNED_LOCKED';
  createdAt: string;
  createdBy: string;
  creatorRole: PlanDiscussionRole;
  summary: {
    totalBudget: number;
    adsBudgetTotal: number;
    targetGmv: number;
    totalContents: number;
    changeReason?: string;
  };
  messages: PlanDiscussionMessage[];
  signatures: {
    growth?: { signed: boolean; signedBy?: string; signedAt?: string; note?: string };
    booking?: { signed: boolean; signedBy?: string; signedAt?: string; note?: string };
    media?: { signed: boolean; signedBy?: string; signedAt?: string; note?: string };
    leadB2c?: { signed: boolean; signedBy?: string; signedAt?: string; note?: string };
  };
}

export type PlanTierKey = 'KL1' | 'KL2' | 'KL3' | 'KL4' | 'KL5' | 'KL6' | 'KL7';
export type PlanMultiPlatformKey = 'shopee' | 'threads' | 'facebook' | 'instagram';

export interface PlanMultiPlatformMetrics {
  affQty: number;
  budgetNet: number;
  reupQty: number;
}

export interface PlanLiveSelfMetrics {
  inhouse3h: number;
  ctv2h: number;
  brand2h?: number;
  budgetNet: number;
}

/** Một tuần trong bảng phân rã (tương ứng một dòng bảng 4.1.1 Input plan). Ngân sách luôn là Net. */
export interface PlanWeekRow {
  week: string; // 'W43 [19.10 - 25.10]'
  tiers: Partial<Record<PlanTierKey, { qty: number; budgetNet: number }>>;
  foc: { tapBrand: number; tap: number; tapUp: number };
  self: { reviewVoice: number; videoAi: number; videoRemix: number; videoToLive: number; nhacText: number; budgetNet: number };
  live: { sessions: number; budgetNet: number };
  multiPlatform?: Partial<Record<PlanMultiPlatformKey, PlanMultiPlatformMetrics>>;
  liveSelf?: PlanLiveSelfMetrics;
}

/** Lát cắt tiến độ nhập phân rã tuần (4.1.1) theo từng chuyên viên phụ trách trong cùng một gian hàng. */
export interface PlanStaffWeeklySlice {
  staffName: string;
  roleLabel?: string;
  rowCount: number;
  weeklyBreakdown: PlanWeekRow[];
  isCompleted?: boolean;
  completedAt?: string;
}

/** Số của bảng 4.1 Plan order tổng dùng để đối chiếu với bảng phân rã. Chi phí Net = Gross ÷ 1,08 ÷ 1,10. */
export interface PlanReference41 {
  month: string;
  importedAt: string;
  importedBy: string;
  /** true = Cột "Chốt plan" trên bảng 4.1 đã chốt; false = Cột "Chốt plan" đang trống / chưa chốt (số tạm tính). */
  isGrowthLocked?: boolean;
  /** Nhãn hiển thị trạng thái cột "Chốt plan" từ file 4.1 (VD: 'Đã chốt', 'Chưa chốt'). */
  growthLockLabel?: string;
  videoAff: number;
  foc: number;
  cast: number;
  affCostGross: number;
  affCostNet: number;
  selfVideos: number;
  selfCostGross: number;
  selfCostNet: number;
  liveSessions: number;
  liveCostGross: number;
  liveCostNet: number;
  tiers?: Partial<Record<PlanTierKey, number>>;
  kl4PlusTarget?: number;
  focBreakdown?: { tapBrand: number; tap: number; tapUp: number };
  tiktokReup?: number;
  multiPlatform?: Partial<Record<PlanMultiPlatformKey, { affQty: number; costGross: number; costNet: number; reupQty: number }>>;
  liveSelf?: {
    inhouse3h: number;
    inhouseCostGross: number;
    inhouseGmv: number;
    ctv2h: number;
    ctvCostGross: number;
    ctvGmv: number;
    brand2h: number;
    totalCostGross: number;
    totalCostNet: number;
  };
  gmvTargets?: {
    nmvPlan: number;
    videoAff: number;
    videoSelf: number;
    liveInhouse: number;
    liveCtv: number;
    lastMonth30d: number;
    thisMonth30d: number;
  };
  rolePics?: {
    growthPics: string[];
    growthSupports: string[];
    accountPics: string[];
    bookingPics: string[];
    contentPics: string[];
    focPics: string[];
    livePics: string[];
    b2cPics: string[];
  };
  growthPic?: string;
  accountPic?: string;
  bookingPic?: string;
  bookingLeader?: string;
  focPic?: string;
  contentPic?: string;
  livePic?: string;
}

export interface InputPlanBreakdownState {
  id: string;
  title: string;
  brandName: string;
  parentBrand?: string;
  storeId?: string; // ID gian hàng gắn với kế hoạch
  storeName?: string; // Tên gian hàng gắn với kế hoạch
  month: string; // Chu kỳ tháng (e.g. '2026/10', '2026/09', '2026/08', '2026/11')
  week: string;
  pic: string;
  growthAlignmentStatus?: 'CHƯA_TRAO_ĐỔI' | 'ĐANG_TRAO_ĐỔI' | 'ĐÃ_THỐNG_NHẤT'; // Trạng thái trao đổi với Growth
  growthAlignmentNotes?: string;
  submittedAt?: string;
  submittedBy?: string;
  totalTargetBudget: number; // Ngân sách tổng ban đầu (VNĐ)
  totalTargetContents: number; // Số lượng nội dung tổng ban đầu
  targetGmv: number; // GMV mục tiêu
  cancellationRate: number; // Tỷ lệ hủy định mức (default 8%)
  strategyPreset?: 'CUSTOM' | 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';
  notes?: string;
  status?: MonthlyPlanStatus;
  statusLabel?: string;
  deliveredContents?: number;
  spentBudget?: number;
  actualGmv?: number;
  createdAt?: string;
  updatedAt?: string;
  items: InputPlanRowItem[];
  // Phân rã theo tuần (nguồn của items có id bắt đầu bằng 'WB-') và số 4.1 để đối chiếu
  weeklyBreakdown?: PlanWeekRow[];
  staffWeeklySlices?: PlanStaffWeeklySlice[];
  reference41?: PlanReference41;
  /** Số bảng 4.1 mới tải lên bị lệch so với kế hoạch đã gửi duyệt/đã duyệt; giữ nguyên bản đã duyệt và gắn cờ chờ Quản lý mở khóa cập nhật. */
  pendingReference41?: PlanReference41;
  breakdownNote?: string; // Giải trình khi tổng phân rã lệch số 4.1
  // Layer 1: Khung chỉ số cốt lõi thống nhất giữa các bên trước khi phân rã Layer 2
  coreMetricsLayer1?: CorePlanMetricsLayer1;
  // Phân bổ 2 kênh độc lập: Affiliate vs Self Channel (Kênh thương hiệu)
  budgetAffiliate?: number; // Ngân sách Affiliate (VD: 150,000,000 VNĐ)
  budgetSelfChannel?: number; // Ngân sách Self Channel (VD: 50,000,000 VNĐ)
  budgetAdsTotal?: number; // Gói Tổng ngân sách Ads do Growth giao cho Media (không tách theo kênh)
  targetAffiliateContents?: number; // Target số video KOC ngoại sàn
  targetSelfChannelContents?: number; // Target số video kênh thương hiệu
  selfChannelPillars?: SelfChannelContentPillar[]; // Phân rã theo Content Pillar
  // Quản lý phiên bản & Biên bản làm việc 3 bên
  currentVersionCode?: string; // 'v1.0', 'v1.1 Draft', v.v.
  isVersionLocked?: boolean; // Khóa chỉ đọc khi đã chốt phiên bản
  versionSnapshots?: PlanVersionSnapshot[]; // Danh sách các phiên bản đã chốt
  protocols?: PlanAlignmentProtocol[]; // Danh sách các Biên bản làm việc & thống nhất
  multiPartySignOff?: MultiPartySignOff; // Dữ liệu ký duyệt 3 bên: Growth, Booking, Media, Lead
  // Luồng duyệt & Lịch sử trao đổi
  approvalSteps?: PlanApprovalStep[];
  discussions?: PlanDiscussionMessage[];
  // Phân tầng quản lý 2 cấp: Trưởng nhóm (Leader) & Chuyên viên chính
  hasBookingLeader?: boolean; // Trưởng phòng cấu hình theo tháng: true = gian có Lead sơ duyệt, false = duyệt trực tiếp
  bookingLeader?: string; // Trưởng nhóm Booking phụ trách (nếu có)
  primaryPic?: string; // Chuyên viên chính chủ trì kế hoạch (ví dụ: 'Khánh Vy')
  assignedMembers?: string[]; // Các chuyên viên trong nhóm cùng chạy phân rã
  leaderApprovalStatus?: 'CHƯA_DUYỆT' | 'ĐÃ_SƠ_DUYỆT' | 'YÊU_CẦU_SỬA' | 'KHÔNG_ÁP_DỤNG'; // Trạng thái sơ duyệt nội bộ của Leader
  leaderApprovedBy?: string; // Trưởng nhóm đã sơ duyệt nội bộ
  leaderApprovedAt?: string; // Thời gian sơ duyệt
  leaderNotes?: string; // Ghi chú nghiệp vụ / chỉ đạo của Trưởng nhóm
  preApprovedBy?: string;
  preApprovedAt?: string;
  preApprovalNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  revisionNotes?: string;
  // Nguồn đồng bộ Larkbase (khi kéo kế hoạch B2C Booking đã duyệt từ Larkbase về hệ thống)
  sourceSystem?: 'WEB_ADMIN' | 'LARKBASE';
  larkRecordId?: string;
  larkAppToken?: string;
  larkTableId?: string;
  larkApprovalCode?: string;
  larkSyncedAt?: string;
  // Liên kết với thực thể Chiến dịch (Campaign) của Brand trong tháng (tháng đó có thể Có hoặc Không có Campaign)
  hasCampaign?: boolean; // true = Tháng có chạy Chiến dịch, false = Tháng duy trì (Always-on / Không có Campaign)
  campaignId?: string; // ID Chiến dịch liên kết (nếu có)
  campaignCode?: string; // Mã Chiến dịch (VD: 'CMP-CLIO-Q4-01')
  campaignTitle?: string; // Tên Chiến dịch
  campaignPhaseName?: string; // Vai trò giai đoạn của chiến dịch trong tháng này (nếu chiến dịch kéo dài nhiều tháng)
  oneSheetPlanData?: BrandOneSheetPlanData; // Dữ liệu 1-Sheet Monthly Content & Key Visual Plan trình Brand
}

// Bản ghi trong Bảng hứng Kế hoạch B2C Booking từ Larkbase (Bitable API / Webhook)
export interface LarkbaseBookingPlanRecordItem {
  id: string;
  larkRecordId: string;
  larkAppToken: string;
  larkTableId: string;
  planId: string;
  month: string;
  week?: string;
  versionCode: string;
  versionName: string;
  storeId?: string;
  storeName: string;
  brandName: string;
  platform: string;
  isB2cManaged: boolean;
  b2cPic: string;
  bookingLeader?: string;
  approvalStatus: 'APPROVED' | 'LEAD_APPROVED' | 'LOCKED' | 'PENDING';
  larkApprovalInstanceId?: string;
  approvedBy: string;
  approvedAt: string;
  // Hạn mức Gross / Net (Kế toán kiểm soát theo Net)
  budgetGross: number;
  budgetNet: number;
  budgetAdsTotal: number;
  targetGmv: number;
  totalTargetVideos: number;
  // 4 đầu việc cốt lõi của B2C Booking (File 4.1 & 4.1.1)
  affiliatePaidVideos: number;
  affiliatePaidBudgetNet: number;
  kocTierBreakdown: {
    kl1: number;
    kl2: number;
    kl3: number;
    kl4: number;
    kl5: number;
    kl6: number;
    kl7: number;
  };
  focFreeVideos: number;
  focPic?: string;
  selfChannelVideos: number;
  selfChannelBudgetNet: number;
  multiPlatformVideos: number;
  multiPlatformBudgetNet: number;
  liveSessions: number;
  liveBudgetNet: number;
  changeReason?: string;
  syncSource: 'API_PULL' | 'WEBHOOK' | 'SANDBOX_FALLBACK';
  syncedBy: string;
  syncedAt: string;
}


// =========================================================================
// CƠ CẤU ĐỘI NGŨ BOOKING (LEADER & TEAM MEMBERS HIERARCHY)
// =========================================================================
export interface BookingTeamMemberInfo {
  id: string;
  name: string;
  roleTitle: string; // 'Senior Booking Specialist', 'Junior Booking Specialist', 'Booking Intern'
  avatar: string;
  team: string; // 'Booking Team 1', 'Booking Team 2', 'Team Đa Sàn & Live'
  expertise: string; // Thế mạnh chuyên môn
  maxCapacityClips: number; // Định mức năng lực tối đa (clip/tháng)
  assignedStoresCount?: number;
  assignedClips?: number;
  assignedBudget?: number;
}

export interface BookingTeamGroup {
  id: string;
  teamCode: string; // 'TEAM_1', 'TEAM_2', 'TEAM_MULTI'
  name: string; // 'Booking Team 1 (Beauty & Mom Baby)'
  leaderName: string; // 'Nguyễn Thị Ngọc Tâm'
  leaderTitle: string; // 'Trưởng Nhóm Booking (Booking Lead)'
  leaderAvatar: string;
  leaderEmail: string;
  members: BookingTeamMemberInfo[];
  managedStoresCount: number;
  totalMonthlyTargetBudget: number;
  totalMonthlyTargetClips: number;
}

// =========================================================================
// 8. MASTER CONTENT PILLAR & SELF CHANNEL CTV TYPES (TRỤ CỘT NỘI DUNG & KÊNH NỘI BỘ)
// =========================================================================

// Master Data: Danh mục gốc Trụ cột nội dung (Dùng chung toàn hệ thống B2C)
export interface MasterContentPillar {
  id: string;
  code: string; // VD: 'EDUCATIONAL', 'PRODUCT_SHOWCASE', 'STORYTELLING', 'TREND_JACKING', 'TESTIMONIAL', 'PROBLEM_SOLUTION', 'BEHIND_SCENES', 'UNBOXING_ASMR'
  name: string; // Tên trụ cột nội dung
  description: string; // Định hướng nội dung & quy chuẩn sáng tạo
  tagPillar?: string; // Tag Pillar chuẩn Upbase (Review trực tiếp, Nỗi đau - Giải pháp, Unboxing...)
  applicableNiches: string[]; // Ngành hàng phù hợp (VD: 'Mẹ & Bé', 'Chăm Sóc Da', 'Sức Khỏe', 'F&B', 'Gia Dụng', 'Toàn ngành')
  suggestedFormats: string[]; // Định dạng video gợi ý
  benchmarkUnitCost: number; // Đơn giá thù lao định mức tham chiếu / video (VNĐ)
  targetAudience: string; // Tệp khán giả hướng tới
  keyObjectives: string; // Mục tiêu truyền thông cốt lõi
  status: 'ACTIVE' | 'INACTIVE';
  colorTag?: string; // Tag màu nhận diện
  activeBrandsCount?: number; // Số brand đang áp dụng
  createdAt: string;
  lastUpdate?: string;
}

// =========================================================================
// 8.1 CONTENT ANGLE BY PRODUCT (GÓC TIẾP CẬN NỘI DUNG THEO TỪNG SẢN PHẨM)
// =========================================================================
export interface ContentAngleItem {
  id: string;
  code: string; // VD: ANG-KUTI-01, ANG-LRP-02
  name: string; // Tên hướng tiếp cận / Angle Title

  // Liên kết Trụ cột nội dung (Content Pillar)
  pillarId: string; // ID Pillar gốc (PIL-01, PIL-02...)
  pillarName: string; // Tên Pillar (Review trực tiếp, Nỗi đau - Giải pháp, Unboxing...)
  pillarCode?: string;

  // Liên kết Sản phẩm & Gian hàng (Angle đi theo từng sản phẩm cụ thể)
  productId: string; // ID sản phẩm (SKU)
  productName: string; // Tên sản phẩm cụ thể
  productSku?: string;
  productImageUrl?: string;
  brandId?: string;
  brandName: string; // Tên Brand (Kutieskin, La Roche-Posay, Anessa...)
  storeId?: string;
  storeName: string; // Tên Gian hàng
  platform?: 'TIKTOK_SHOP' | 'SHOPEE_MALL' | 'LAZADA';

  // Cấu trúc kịch bản nội dung chuẩn hóa
  hookIdea: string; // Câu Hook 3 giây đầu (Gây tò mò / giật gân / đánh trúng insight)
  painPoint: string; // Nỗi đau khách hàng / Insight cốt lõi
  solutionApproach: string; // Cách lồng ghép sản phẩm vào để giải quyết nỗi đau
  keySellingPoints: string[]; // USP / Key messages bắt buộc nói
  targetAudience: string; // Tệp khán giả mục tiêu (Gen Z, Mẹ bỉm, Dân văn phòng...)
  callToAction: string; // CTA gợi ý (Gắn giỏ hàng vàng, Săn deal 1k, Flash sale...)
  suggestedFormat?: string; // Định dạng video đề xuất (Voiceover B-roll, Talking Head, POV/Drama...)

  // Quy chuẩn kiểm duyệt (Do's & Don'ts)
  doList?: string[];
  dontList?: string[];

  // Thống kê & Trạng thái
  status: 'WINNING' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  usageCount: number; // Số lượt booking KOC đã áp dụng
  avgViewsEstimate?: number; // Lượt xem ước tính
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Master Data: Bậc cast & Phân nhóm KOC (5.6 Tệp cast)
export interface MasterCastTier {
  id: string;
  tierCode: string; // VD: 'TAP UpAffiliate', 'KL1', 'KL2' ... 'KL7', 'TAP đối tác ngoài'
  priceRange: string; // VD: '0', '0 - 500k', '500k - 1.5M', '1.5M - 3M' ...
  minCast: number; // VNĐ
  maxCast: number; // VNĐ
  baseAverage: number; // VNĐ
  creatorGroup: 'Massive Creator' | 'Mid Creator' | 'Key Creator' | 'Top Creator' | string;
  note: string; // Ghi chú chiến lược sử dụng
  adsCost: string; // 'Không mất', 'Thương lượng', '+20-30%' ...
  usageImageCost: string; // 'Không mất', 'Thương lượng', '+30-50%' ...
  lastUpdate?: string;
}

// Master Data: Phân loại định dạng video (5.3 Phân loại video)
export interface MasterVideoFormat {
  id: string;
  name: string; // VD: 'Unbox Voice', 'Review Voice', 'Nhạc text', 'Ảnh lướt', 'Video remix', 'Video AI', 'TAP đối tác ngoài'
  option: string;
  lastUpdate?: string;
}

// Master Data: Tệp kênh & Chuyên mục KOC (5.4 Tệp KOCs)
export interface MasterKocNiche {
  id: string;
  nicheName: string; // VD: 'Review Nữ', 'Review Nam', 'Mẹ bé (bầu)', 'Makeup Artist', 'Bác sỹ/chuyên gia' ...
  definition?: string;
  category?: string; // 'Beauty & Personal Care', 'Mom & Baby', 'Food & Beverage' ...
  properties?: string; // 'Lifestyle', 'Expert', 'Creator' ...
  pillarMatch?: string; // Trụ cột nội dung liên kết gợi ý
  lastUpdate?: string;
}

// Trụ cột nội dung phân bổ cho Self Channel trong kế hoạch Brand
export interface SelfChannelContentPillar {
  id: string;
  masterPillarId?: string; // Liên kết tới Master Data Content Pillar gốc
  name: string; // VD: 'Giáo Dục / Chuyên Gia', 'Demo & Review Thực Tế', 'Tình Huống / Drama', 'Bắt Trend / Âm Thanh Hot'
  code: 'EDUCATIONAL' | 'PRODUCT_SHOWCASE' | 'STORYTELLING' | 'TREND_JACKING' | 'BEHIND_SCENES' | 'TESTIMONIAL' | 'CUSTOM' | string;
  description: string; // Định hướng nội dung & quy chuẩn
  targetVideos: number; // Số lượng video mục tiêu
  completedVideos?: number; // Số lượng video đã nghiệm thu
  allocatedBudget: number; // Ngân sách phân bổ cho pillar này (VNĐ)
  unitCostPerVideo: number; // Đơn giá thù lao định mức / video (VNĐ)
  targetViews?: number; // Lượt view mục tiêu
  coreSkuIds?: string[]; // Các SKU trọng tâm gắn vào Pillar này
  color?: string; // Mã màu hiển thị
}

// Cấu trúc phân bổ ngân sách 2 luồng độc lập: Affiliate vs Self Channel
export interface BrandChannelAllocation {
  brandId: string;
  brandName: string;
  totalBudget: number; // VD: 200,000,000 VNĐ
  
  // Luồng 1: Affiliate (KOC/KOL)
  budgetAffiliate: number; // VD: 150,000,000 VNĐ
  targetAffiliateVideos: number;
  targetAffiliateGmv: number;
  affiliateNotes?: string;
  
  // Luồng 2: Self Channel (Kênh thương hiệu)
  budgetSelfChannel: number; // VD: 50,000,000 VNĐ
  targetSelfChannelVideos: number; // VD: 40 video
  selfChannelNotes?: string;
  pillars: SelfChannelContentPillar[]; // Danh sách phân bổ theo Content Pillar
}

// Phân loại vai trò của Cộng Tác Viên
export type ContributorRole = 
  | 'ALL_IN_ONE'      // Tự lên kịch bản, quay, diễn và edit hoàn thiện
  | 'VIDEO_EDITOR'    // Chuyên dựng / edit hậu kỳ video (Brand cung cấp raw footage)
  | 'CREATIVE_ACTOR'  // Diễn xuất & quay trải nghiệm thực tế
  | 'SCRIPTWRITER';   // Biên kịch / biên tập nội dung

export type ContributorStatus = 'ACTIVE' | 'ON_HOLD' | 'PROBATION' | 'TERMINATED';

export interface Contributor {
  id: string;
  code?: string; // Mã CTV chuẩn Master Data (VD: CTV-B2C-001)
  name: string;
  realName?: string; // Họ tên pháp lý trên CCCD
  avatar?: string;
  phone: string;
  email?: string;
  channelLink?: string; // TikTok / Portfolio link
  tiktokChannel?: string;
  tiktokChannels?: string[];
  connectedChannels?: KocConnectedChannel[];
  driveFolderUrl?: string; // Link Drive tổng gian hàng / Drive nộp video của VJ
  nicheSpecialty: string[]; // Tệp thế mạnh (VD: Mẹ & Bé, Chăm da, Diễn hài...)
  role: ContributorRole;
  status: ContributorStatus;
  contentPic?: string; // Nhân sự Content phụ trách trực tiếp
  partnershipPic?: string; // Nhân sự Partnership phụ trách hợp đồng (VD: Việt Hoàng)

  // Pháp lý & Hợp đồng Partnership
  cccd?: string;
  dob?: string;
  issueDate?: string;
  issuePlace?: string;
  permanentAddress?: string;
  taxCode?: string;
  isOcrVerified?: boolean;
  ocrVerifiedAt?: string;
  contractCode?: string; // Mã hợp đồng khung CTV/VJ
  contractStatus?: 'ACTIVE' | 'EXPIRED' | 'PENDING_SIGN' | 'NONE';
  contractExpiryDate?: string;

  // Tài chính & Thanh toán
  bankName: string;
  bankAccount: string;
  bankAccountName: string;

  // Định mức đơn giá (Rate Card) & Công suất
  unitRateAllInOne?: number; // Giá quay dựng trọn gói / video
  unitRateShootingOnly?: number; // Giá chỉ quay thô / diễn xuất
  unitRateEditOnly?: number; // Giá dựng hậu kỳ lẻ
  unitRateScriptOnly?: number; // Giá viết kịch bản lẻ
  /** Giá chuẩn (Gross) theo 5 loại video Self-channel của 4.1.1; Partnership sửa được theo từng job */
  formatRates?: Partial<Record<Exclude<keyof PlanWeekRow['self'], 'budgetNet'>, number>>;
  monthlyCapacityVideos?: number; // Công suất nhận việc tối đa (video/tháng)
  zaloUserId?: string; // Zalo ID để bot nhận diện CTV trong nhóm

  // Hậu cần gửi hàng mẫu (SLA 48h) & Đặc điểm bối cảnh VJ
  shippingRecipientName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingNotes?: string;
  studioBackdrops?: string[]; // Bối cảnh sẵn có (VD: Phòng ngủ mẹ & bé, Quầy thuốc, Phòng tắm sáng...)
  personalTraits?: string; // Đặc điểm cá nhân (VD: Da hỗn hợp thiên dầu, có bé 14 tháng tuổi...)
  onHandProducts?: string[]; // Sản phẩm Brand đang cầm sẵn tại nhà (nhận job gấp < 5 ngày)

  // Hiệu suất & Lũy kế
  ratingScore: number; // 1-5 sao
  firstPassRate?: number; // Tỷ lệ duyệt ngay lần 1 (%)
  onTimeRate?: number; // Tỷ lệ đúng hạn SLA (%)
  assignedTaskCount: number;
  completedTaskCount: number;
  totalPaidAmount: number; // Tổng thù lao đã thanh toán (VNĐ)
  pendingPaymentAmount?: number; // Thù lao đã nghiệm thu chờ chi (VNĐ)
  joinedDate: string;
  notes?: string;
}

// Trạng thái vòng đời của một Task sản xuất Video Self Channel
export type VideoTaskStatus = 
  | 'OPEN_TASK'                 // Task mới tạo, mở cho CTV nhận hoặc chờ phân bổ VJ
  | 'BRAND_ORIENTATION_PENDING' // Đã chọn VJ & góc kịch bản, chờ Brand duyệt định hướng (SLA 48h, quá 72h Auto-Pass)
  | 'SCRIPT_PENDING_REVIEW'     // CTV đã nộp kịch bản chi tiết, chờ duyệt kịch bản (SLA 24h)
  | 'SCRIPT_REVISION'           // Yêu cầu sửa kịch bản
  | 'SCRIPT_APPROVED'           // Kịch bản đã duyệt & gửi hàng mẫu, CTV tiến hành quay & edit
  | 'DRAFT_VIDEO_SUBMITTED'     // CTV đã nộp video nháp (v1, v2) vào Drive, chờ Content B2C QA nội bộ
  | 'INTERNAL_QA_PASSED'        // Đã đạt QA nội bộ, chờ Brand nghiệm thu hoặc đăng lên kênh Brand
  | 'VIDEO_REVISION'            // Yêu cầu chỉnh sửa video nháp
  | 'ACCEPTED_COMPLETED'        // Đã nghiệm thu & đăng kênh Brand (chờ lập DNTT quyết toán)
  | 'PAID';                     // Đã thanh toán nhuận bút (có mã DNTT & UNC)

export type SampleShippingStatus =
  | 'ON_HAND_AT_HOME' // VJ đã có sẵn sản phẩm mẫu tại nhà (nhận job gấp < 5 ngày được ngay)
  | 'PENDING_SHIP'    // Chờ kho/Brand gửi hàng mẫu (SLA 48h)
  | 'SHIPPING'        // Đang vận chuyển (đã có mã vận đơn)
  | 'DELIVERED';      // VJ đã nhận được hàng mẫu

export type BrandApprovalMode =
  | 'BRAND_REVIEW_REQUIRED' // Phải gửi Brand duyệt VJ & định hướng kịch bản (SLA 48h)
  | 'UPBASE_DELEGATED';     // Brand ủy quyền hoàn toàn cho Upbase B2C chủ động duyệt

export interface VideoRevisionFeedback {
  id: string;
  version: number;
  reviewedBy: string; // Tên nhân sự Content B2C hoặc Brand duyệt
  reviewedAt: string;
  type: 'ORIENTATION' | 'SCRIPT' | 'VIDEO' | 'BRAND_ACCEPTANCE';
  verdict: 'APPROVED' | 'REVISE';
  comment: string;
  checklist?: {
    hookCompliant: boolean;      // Đúng hook 3s đầu
    productAppearance: boolean;  // Rõ sản phẩm & góc quay chuẩn
    audioClear: boolean;         // Giọng đọc / nhạc nền rõ ràng
    guidelinesFollowed: boolean; // Đúng Do & Don'ts của Brand
  };
}

export interface SelfChannelVideoTask {
  id: string;
  taskCode: string; // VD: "SC-KUTI-202610-01"
  title: string; // VD: "Review hướng dẫn bôi dịu chàm sữa cho bé sau 72h"
  brandId: string;
  brandName: string;
  storeId?: string;
  storeName?: string;
  planMonth?: string; // Chu kỳ kế hoạch tháng (VD: "2026/10")
  videoFormat?: string; // Định dạng video từ kế hoạch (VD: "Review voice", "Unbox Voice", "POV", "Nhạc text")
  contentPic?: string; // Chuyên viên Content B2C phụ trách (VD: "Quỳnh Như", "Nguyễn Thị Mai Anh", "Vũ Hoài Lâm", "Phan Diệu Ánh")
  partnershipPic?: string; // Trưởng nhóm Partnership quản lý team Content & chuyên liên hệ CTV (Mặc định: "Việt Hoàng")
  partnershipStatus?: 'WAITING_PARTNERSHIP' | 'CONTACTING_CTV' | 'CTV_ASSIGNED'; // Trạng thái Partnership liên hệ & chốt CTV
  
  // Thuộc Pillar nào
  pillarId: string;
  pillarName: string;
  pillarCode?: SelfChannelContentPillar['code'];
  
  // Sản phẩm liên kết (SKU thúc đẩy)
  linkedSku?: string;
  productName?: string;
  
  // Thù lao & Thời hạn
  remuneration: number; // Thù lao Gross chi trả cho CTV (VNĐ) - VD: 1,500,000 đ
  deadline: string; // Ngày hoàn tất dự kiến (YYYY-MM-DD)
  isUrgentUnder5Days?: boolean; // Cờ cảnh báo đơn gấp < 5 ngày trước ngày đăng
  
  // CTV / VJ được giao
  contributorId?: string;
  contributorName?: string;
  contributorAvatar?: string;
  
  // Bước 2 SOP: Trình Brand duyệt VJ & Định hướng (hoặc Ủy quyền Upbase tự duyệt)
  brandApprovalMode?: BrandApprovalMode;
  brandOrientationStatus?: 'PENDING' | 'APPROVED' | 'AUTO_PASSED_72H' | 'DELEGATED';
  brandOrientationSubmittedAt?: string;
  brandOrientationSlaHoursRemaining?: number;
  
  // Bước 3 SOP: Hậu cần gửi hàng mẫu (SLA 48h) & Sản phẩm cầm sẵn
  sampleShippingStatus?: SampleShippingStatus;
  sampleTrackingCode?: string;
  sampleShippedAt?: string;
  sampleDeliveredAt?: string;
  
  // Trạng thái vòng đời
  status: VideoTaskStatus;
  
  // Kịch bản (Script submission)
  scriptContent?: {
    hook: string; // 3 giây đầu
    body: string; // Diễn giải & Demo giải pháp
    cta: string; // Kêu gọi hành động / gắn giỏ
    submittedAt?: string;
  };
  
  // Bước 4 SOP: Video Deliverables, Drive tổng gian hàng & Link đăng kênh Brand
  videoDeliverables?: {
    currentVersion: number;
    draftVideoUrl?: string;
  reviewMode?: 'DIRECTIVE' | 'VETTING_GUARDRAILS';
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'LOYALTY';
  klCode?: string;
  mandatoryShots?: string;
  forbiddenClaims?: string;
  rightsGuardrails?: string; // Link Drive / Capcut / Video preview
    finalVideoUrl?: string; // Link video chính thức đạt nghiệm thu (file sạch không logo)
    storeDriveFolderUrl?: string; // Link thư mục Drive tổng của Gian hàng bàn giao cho Brand/Media
    publishedChannelUrl?: string; // Link bài đăng thực tế trên kênh TikTok / Shopee Video của Brand
    publishedAt?: string;
    captionSuggested?: string; // Gợi ý caption đăng bài
    submittedAt?: string;
    durationSeconds?: number;
    internalQaApprovedBy?: string;
    internalQaApprovedAt?: string;
    brandAcceptedBy?: string;
    brandAcceptedAt?: string;
  };
  
  // Feedback & Lịch sử duyệt
  feedbackLogs: VideoRevisionFeedback[];
  
  // Bước 5 SOP: Đề nghị thanh toán (DNTT), Thuế TNCN 10% & Quyết toán Kế toán
  acceptedAt?: string;
  acceptedBy?: string;
  dnttCode?: string; // Mã phiếu Đề nghị thanh toán (VD: "DNTT-CTV-202610-01")
  dnttStatus?: 'NOT_CREATED' | 'PENDING_ACCOUNTING' | 'DISBURSED';
  pitTaxDeducted?: number; // Khấu trừ thuế TNCN 10%
  netPayoutAmount?: number; // Thực nhận Net của CTV
  paidAt?: string;
  paymentRef?: string;
  
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// HỆ THỐNG BÁO CÁO ADS TIKTOK SHOP SELLER & ENGINE MAPPING TUẦN
// ============================================================================

export interface WeeklyAdsReportMeta {
  id: string;
  fileName: string;
  reportWeek: string; // e.g. "Tuần 40 (01/10 - 08/10/2026)"
  dateRange: string; // "2026-10-01 ~ 2026-10-08"
  uploadDate: string;
  fileSizeBytes: number;
  totalRows: number;
  totalSpend: number;
  totalGmv: number;
  totalOrders: number;
  overallRoas: number;
  avgHookRate2s?: number;
  status: 'READY' | 'MAPPED' | 'PROCESSING';
  formatType: 'TIKTOK_SELLER_PGM_EN' | 'TIKTOK_SELLER_CREATIVE_VN';
}

export interface AdsCampaignPerformance {
  campaignName: string;
  campaignId?: string;
  productName?: string;
  cost: number;
  gmv: number;
  orders: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cvr: number;
  hookRate2s: number;
  completionRate100: number;
  videoCount: number;
  creatorCount: number;
  topCreatorName?: string;
}

export interface AdsCreatorPerformance {
  accountName: string; // Tên kênh trên TikTok
  mappedKocId?: string; // ID KOC khớp trong Master Data
  mappedStageName?: string; // Tên KOC khớp trong Master Data
  mappedTier?: string; // Tier (Celeb, Macro, Micro, Nano)
  isMatched: boolean;
  isWinnerTop20: boolean;
  cost: number;
  gmv: number;
  orders: number;
  roas: number;
  cpa: number;
  videoCount: number;
  avgHookRate2s: number;
  avgCtr: number;
  authorizationType: string;
  explorationStatus: string;
  topVideoTitle?: string;
  topVideoId?: string;
}

export interface AdsCreativeDetailItem {
  id: string;
  campaignName: string;
  productId: string;
  videoTitle: string;
  videoId: string;
  tiktokAccount: string;
  timePosted?: string;
  status: string;
  explorationSecondaryStatus: string; // 'Performing' | 'Authorization needed' | 'Exploring' | 'Ineligible'
  authorizationType: string; // 'Video code' | 'Affiliate mass authorization' | 'TikTok Shop official account' | 'Product card'
  cost: number;
  orders: number;
  cpa: number;
  gmv: number;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cvr: number;
  hookRate2s: number;
  viewRate6s: number;
  completionRate100: number;
  isSparkAds: boolean;
  mappedDealId?: string;
  mappedKocId?: string;
}

export interface AdsReportParseResult {
  meta: WeeklyAdsReportMeta;
  campaigns: AdsCampaignPerformance[];
  creators: AdsCreatorPerformance[];
  topCreatives: AdsCreativeDetailItem[];
  authorizationSummary: Record<string, { count: number; cost: number; gmv: number }>;
  statusSummary: Record<string, { count: number; cost: number; gmv: number }>;
  matchedKocCount: number;
  totalCreatorCount: number;
  matchRatePercent: number;
}

// =========================================================================
// BRD ENTERPRISE EXTENSIONS: VAI TRÒ BACKUP, LỊCH SỬ PHÂN CÔNG, SLA/KPI, AUDIT
// =========================================================================

// 1. VAI TRÒ DỰ PHÒNG / BACKUP PIC KHI NHÂN SỰ CHÍNH VẮNG MẶT
export interface BackupStaffAssignment {
  id: string;
  primaryStaffId: string;
  primaryStaffName: string;
  backupStaffId: string;
  backupStaffName: string;
  role: UserRole;
  storeIds: string[];
  isActive: boolean;
  reason: 'NGHỈ_PHÉP' | 'CÔNG_TÁC' | 'QUÁ_TẢI' | 'ĐỘT_XUẤT' | 'ĐÀO_TẠO';
  startDate: string;
  endDate?: string;
  assignedBy: string;
  assignedByName: string;
  notes?: string;
  createdAt: string;
}

// 2. LỊCH SỬ PHÂN CÔNG GIAN HÀNG & NHÂN SỰ (ASSIGNMENT HISTORY)
export interface StoreAssignmentHistoryRecord {
  id: string;
  storeId: string;
  storeName: string;
  brandName: string;
  staffId: string;
  staffName: string;
  roleType: 'PRIMARY_B2C' | 'CO_OWNER' | 'GROWTH_LEAD' | 'CONTENT_PIC' | 'BACKUP_PIC';
  action: 'ASSIGNED' | 'REASSIGNED' | 'REVOKED' | 'BACKUP_ACTIVATED' | 'BACKUP_DEACTIVATED';
  assignedBy: string;
  assignedByName: string;
  effectiveDate: string;
  endDate?: string;
  reason?: string;
  handoverNotes?: string;
}

// 3. BẢNG ĐỊNH NGHĨA SLA CHUẨN DOANH NGHIỆP
export interface MasterSlaMilestoneConfig {
  id: string;
  milestoneCode: string;
  milestoneName: string;
  description: string;
  standardSlaHours: number;
  warningThresholdHours: number;
  escalateToRole: UserRole;
  responsibleRole: UserRole;
  slaType: 'WORKING_HOURS' | 'CALENDAR_HOURS';
  penaltyWeight: number; // Điểm trừ SLA nếu vi phạm
}

// 4. BẢNG ĐỊNH NGHĨA KPI CHUẨN DOANH NGHIỆP
export interface MasterKpiDefinition {
  id: string;
  role: UserRole;
  kpiCode: string;
  kpiName: string;
  targetValue: number;
  unit: string; // 'video', '%', 'VNĐ', 'ROAS'
  cycle: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY';
  weightPct: number;
  benchmarkCriteria: string;
}

// 5. TRƯỜNG VÀ NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL)
export interface AuditLogEntry {
  id: string;
  entityType: 'STORE' | 'PLAN' | 'DEAL' | 'CAMPAIGN' | 'STAFF' | 'CONTRACT' | 'BACKUP';
  entityId: string;
  entityName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REASSIGN' | 'SUBMIT' | 'ACTIVATE_BACKUP';
  changedFields?: Record<string, { oldValue: unknown; newValue: unknown }>;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  ipAddress?: string;
  timestamp: string;
  note?: string;
}

// =========================================================================
// BRD MODULE: LISTING KOC HÀNG THÁNG THEO ĐỢT (10, 20, 30) & AIR VIDEO TRACKER
// =========================================================================

export type ListingBatchCycle = 'BATCH_10' | 'BATCH_20' | 'BATCH_30';

export type BrandListingStatus = 'BRAND_PENDING' | 'BRAND_APPROVED' | 'BRAND_REJECTED';

export type KocNegotiationStatus = 'NOT_CONTACTED' | 'CONTACTING' | 'PRICE_NEGOTIATING' | 'TERMS_AGREED' | 'NEGOTIATION_FAILED';

export type ListingItemStatus = 
  | 'DRAFT'            // Đang lập danh sách nháp
  | 'SUBMITTED'        // Đã gửi Brand theo đợt
  | 'FINAL_APPROVED'   // Cả Brand duyệt & KOC chốt (Listing thành công)
  | 'DROPPED';         // Thất bại (Brand từ chối hoặc KOC không nhận deal)

export type AirVideoStage = 
  | 'SAMPLE_DISPATCHED'  // Đã xuất hàng mẫu
  | 'SAMPLE_DELIVERED'   // KOC đã nhận mẫu
  | 'SCRIPT_PENDING'     // Chờ nộp kịch bản
  | 'SCRIPT_APPROVED'    // Kịch bản đã duyệt
  | 'VIDEO_DRAFT_REVIEW' // Kiểm duyệt bản dựng nháp
  | 'AIRED'              // Đã lên sóng chính thức
  | 'ANCHOR_VERIFIED'    // Đã kiểm tra gắn giỏ hàng & Spark Ads
  | 'COMPLETED';         // Nghiệm thu hoàn tất

export interface KocListingDiscussionItem {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  actionType?: 'SUBMIT_BRAND' | 'BRAND_FEEDBACK' | 'FEE_ADJUST' | 'KOC_NEGOTIATION' | 'FINAL_APPROVE' | 'REJECT';
}

export interface KocListingItem {
  id: string;
  batchId: string;
  batchCycle: ListingBatchCycle;
  monthKey: string;
  storeId: string;
  storeName: string;
  brandName: string;
  planSlotId?: string;
  sourcePlanId?: string;
  sourcePlanVersion?: string;
  planRowId?: string;
  salaryGrade?: SalaryGrade;
  
  // Thông tin KOC
  kocId: string;
  kocName: string;
  kocHandle: string;
  channel: 'TikTok Shop' | 'Shopee Mall' | 'Lazada' | 'Instagram' | 'Facebook';
  followersCount: number;
  tier: 'CELEB' | 'MEGA' | 'MACRO' | 'MICRO' | 'NANO';
  niche: string;
  
  // Định hướng nội dung & Dự toán thù lao
  videoFormat: string;
  pillarName: string;
  proposedFee: number;
  finalFee?: number;
  
  // Tiến trình song song 1: Brand Review
  brandApprovalStatus: BrandListingStatus;
  brandFeedbackNote?: string;
  brandFeedback?: string;
  channelCharacteristic?: string;
  staffComment?: string;
  brandApprovedAt?: string;
  brandApprovedBy?: string;
  brandApprovedFee?: number; // Giá net tại thời điểm Brand duyệt
  brandRepricedAt?: string; // Lúc tăng giá sau khi Brand đã duyệt: chữ "Yes" trên Sheet ghi trước mốc này không còn giá trị
  brandApprovalEvidence?: string; // Bằng chứng Brand duyệt khi không lấy từ Sheet (link tin nhắn / email / ảnh chụp)
  
  // Tiến trình song song 2: KOC Negotiation
  kocNegotiationStatus: KocNegotiationStatus;
  negotiationNote?: string;
  negotiatedAt?: string;
  
  // Luồng trao đổi chi tiết (Nội bộ Booking / Account / Brand / KOC)
  discussions?: KocListingDiscussionItem[];
  
  // Trạng thái tổng hợp
  overallStatus: ListingItemStatus;
  dropReason?: string;
  // Mốc thời gian gửi và Brand duyệt để tính SLA
  sentToBrandAt?: string;
  brandDecidedAt?: string;
  // Kết quả Brand duyệt đọc lần gần nhất từ Google Sheet (chỉ áp dụng khi giá trị trên sheet đổi so với lần đọc trước)
  lastSheetDecision?: 'APPROVED' | 'REJECTED' | 'CONSIDER' | 'NONE';
  lastSheetDecisionAt?: string;
  
  // Theo dõi Air Video
  generatedDealId?: string;
  expectedAirDate?: string;
  actualAirDate?: string;
  airVideoStage?: AirVideoStage;
  publishedVideoUrl?: string;
  isCartAnchored?: boolean;
  sparkAdsCode?: string;
  
  assignedStaffId: string;
  assignedStaffName: string;
  createdAt: string;
  updatedAt: string;
}

export interface KocListingBatchHeader {
  id: string;
  storeId: string;
  storeName: string;
  brandName: string;
  monthKey: string;
  batchCycle: ListingBatchCycle;
  cutoffDate: string;
  totalKocs: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  finalApprovedCount: number;
  droppedCount: number;
  totalEstimatedBudget: number;
  totalActualBudget: number;
  status: 'OPEN_DRAFT' | 'SUBMITTED_TO_BRAND' | 'REVIEWED_PARTIAL' | 'BATCH_CLOSED';
  submittedAt?: string;
  closedAt?: string;
}

// =========================================================================
// VỊ TRÍ GẮN THEO BRAND (BRAND-LEVEL POSITIONS) & KẾ HOẠCH BRAND HÀNG THÁNG
// =========================================================================

export type BrandPositionType = 'CONTENT_BRAND_MAIN' | 'PLAN_STRATEGY' | 'KEY_VISUAL_SIS';

export interface BrandMonthlyPlanItem {
  id: string;
  brandId: string;
  brandCode: string;
  brandName: string;
  category: string;
  month: string; // e.g., '2026/10'
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_EXECUTION' | 'COMPLETED';

  // Phân bổ 3 vị trí gắn theo Brand [theo brand]
  contentBrandMainPic: string; // Content / Brand main [theo brand]
  planStrategyPic: string;     // Plan / Strategy [theo brand]
  keyVisualSisPic: string;     // Key Visual / SIS [theo brand]

  // Phối hợp 3 bên (Account / Growth / Booking Lead)
  accountPic: string;
  bookingPicLead: string;

  // 1. Kế hoạch tháng vị trí Content / Brand main [theo brand]
  contentBrandMainPlan: {
    masterContentPlanCount: number; // Số bản Master Content Plan tháng
    contentPillarsCount: number;    // Số tuyến nội dung (Content Pillar / Angle)
    heroScriptsTarget: number;      // Số kịch bản Hero / KOL / KOC định hướng
    deliveredCount: number;         // Đã nghiệm thu trong tháng
    focusPillars: string;           // Định hướng góc tiếp cận chủ đạo
    notes: string;
  };

  // 2. Kế hoạch tháng vị trí Plan / Strategy [theo brand]
  planStrategyPlan: {
    campaignStrategyCount: number;  // Số bản kế hoạch chiến dịch / Mega Sale / Brand Plan
    bigIdeaAndKeyMessage: string;   // Big Idea & Thông điệp trọng tâm tháng
    brandAuditCount: number;        // Số báo cáo đối soát / nghiên cứu thị trường & đối thủ
    deliveredCount: number;         // Đã nghiệm thu trong tháng
    targetBrandBudget: number;      // Ngân sách tổng cấp Brand định hướng
    targetBrandGmv: number;         // Mục tiêu GMV tổng cấp Brand
    notes: string;
  };

  // 3. Kế hoạch tháng vị trí Key Visual / SIS [theo brand]
  keyVisualSisPlan: {
    kvDirectionCount: number;       // Số bộ định hướng Key Visual chiến dịch
    sisBannerPackageCount: number;  // Số bộ trang trí gian hàng SIS / Banner đa sàn
    pdpSeoProductCount: number;     // Số bộ PDP / khung ảnh sản phẩm chuẩn SEO
    deliveredCount: number;         // Đã nghiệm thu trong tháng
    designTheme: string;            // Chủ đề hình ảnh & SIS tháng
    notes: string;
    kvImages?: KeyVisualAssetItem[]; // Danh sách ảnh Key Visual / SIS / PDP đã tải lên
  };

  // Liên kết với thực thể Chiến dịch (Campaign) của Brand trong tháng
  hasCampaign?: boolean;
  campaignId?: string;
  campaignCode?: string;
  campaignTitle?: string;
  campaignPhaseName?: string;
  linkedCampaignIds?: string[];

  // Dữ liệu mở rộng cho Biểu mẫu 1-Sheet Trình Brand (Monthly Content & Key Visual Plan)
  oneSheetPlanData?: BrandOneSheetPlanData;

  updatedAt: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

// =========================================================================
// BIỂU MẪU 1-SHEET TRÌNH BRAND (MONTHLY CONTENT & KEY VISUAL PLAN — 5 SECTIONS)
// =========================================================================

/** Section 01: Định hướng Tháng (Plan / Strategy + Campaign) */
export interface BrandOneSheetOrientation {
  roleInYearPlan: string;          // Vai trò trong plan năm
  objectivesAndBarriers: string;   // Mục tiêu & rào cản cần xử lý
  heroSkusUspRtb: string;          // Hero SKU / USP / RTB
  seasonalOpportunity: string;     // Seasonal opportunity
  bigIdeaMonthlyTheme: string;     // Big idea / monthly theme
  previousMonthReview: string;     // Review / bài học tháng trước
  targetAudienceInsight: string;   // Tệp khách hàng & insight
  comboPromoOffer: string;         // Combo / deal / quà tặng
  campaignSaleMilestones: string;  // Campaign / mốc sale (W1–W5)
  keyMessageAndCta: string;        // Key message & CTA
}

/** Section 02: Cột chỉ số KPI theo từng Sàn (Shopee / TikTok Shop) */
export interface BrandOneSheetPlatformKpi {
  gmvSeller: number;               // GMV nhà bán
  nmvSeller: number;               // NMV nhà bán
  orders: number;                  // Đơn hàng
  traffic: number;                 // Lượt truy cập
  conversionRate: number;          // Tỷ lệ chuyển đổi (CR, VD: 0.05 = 5%)
  aov: number;                     // Giá trung bình/đơn hàng (AOV)
  cancellationRate: number;        // Tỷ lệ hủy (VD: 0.05 = 5%, 0.10 = 10%)
  // Doanh thu các hoạt động
  gmvVideo: number;                // GMV video
  gmvLivestream: number;           // GMV Livestream
  gmvProductCard: number;          // GMV Thẻ sản phẩm (= GMV nhà bán - GMV video - GMV live)
  // Chi phí Marketing thúc đẩy (-VAT)
  costBookingVideoAff: number;     // Chi phí booking video affiliate
  costVideoSelfChannel: number;    // Chi phí video self channel
  costAds: number;                 // Chi phí ads
  costBookingLiveAff: number;      // Chi phí booking livestream affiliate
  costLiveSelfChannel: number;     // Chi phí livestream self channel
  costDisplayPackage: number;      // Chi phí gói dịch vụ hiển thị
  costOtherNet: number;            // Chi phí khác (net)
  // Chi phí khác (Ghi nhận chung với phí sàn)
  costAffiliateCommission: number;     // Chi phí tiếp thị liên kết
  costAffiliateAdsCommission: number;  // Chi phí tiếp thị liên kết (có chạy ads)
}

/** Section 04: Dòng kế hoạch tuần KOC / Booking trên TikTok Shop */
export interface BrandOneSheetTikTokWeeklyRow {
  week: 'W1' | 'W2' | 'W3' | 'W4' | 'W5';
  dateRange: string; // VD: '01–07/11'
  tapCount: number;
  kl1Count: number;
  kl2Count: number;
  kl3Count: number;
  kl4Count: number;
  kl5Count: number;
  kl6Count: number;
  kl7Count: number;
  tapBudget: number;
  kl1Budget: number;
  kl2Budget: number;
  kl3Budget: number;
  kl4Budget: number;
  kl5Budget: number;
  kl6Budget: number;
  kl7Budget: number;
  targetBookingGmv: number;
  ownerActionNote: string;
}

/** Section 04: Dòng chi tiết Content TikTok Shop (Video affiliate & Video self/Ảnh trượt) */
export interface BrandOneSheetTikTokContentRow {
  id: string;
  weekAndAirDate: string;          // VD: 'W1 | 01–07/11'
  skuOrCombo: string;              // VD: 'Natural / combo 2 Natural'
  touchpointSource: 'Video affiliate' | 'Video self' | 'Livestream'; // Nguồn / điểm chạm
  klGroup: string;                 // VD: 'Mix KL / TAP' hoặc 'Không áp dụng'
  kocCriteria: string;             // Tệp KOC / tiêu chí chọn
  pillar: string;                  // Pillar (VD: 'Product education: hiểu SKU/RTB')
  angleAndBrief: string;           // Angle / nhiệm vụ nội dung / brief
  contentType: 'Video' | 'Ảnh trượt' | 'Livestream'; // Type
  qty: number;                     // Số lượng
  budgetVnd: number;               // Ngân sách VNĐ
  pic: string;                     // PIC phụ trách
}

/** Section 05: Chiến lược Pillar (P01 -> P05) */
export interface BrandOneSheetPillarRow {
  pillarId: string;                // VD: 'P01', 'P02', 'P03', 'P04', 'P05'
  pillarName: string;              // Tên pillar (Problem / tình huống, Product education, Social proof, Promotion, Usage / mua lại)
  behaviorObjective: string;       // Mục tiêu / hành vi
  insightAndBarrier: string;       // Insight / rào cản
  messageAndRtb: string;           // Thông điệp / RTB
  priorityAngle: string;           // Angle ưu tiên
  suitableFormat: string;          // Format phù hợp (FAQ / POV, Demo / tutorial, Review / unbox, Deal explainer, Routine / checklist)
  videoWeightRatio: number;        // Tỷ trọng video (VD: 0.2 = 20%)
  monthlyVideoCount: number;       // Số video tháng
}

/** Section 05: Target tuần Content Shopee */
export interface BrandOneSheetShopeeWeeklyTarget {
  week: 'W1' | 'W2' | 'W3' | 'W4' | 'W5';
  airDateRange: string;            // VD: '01–07/11'
  plannedVideos: number;           // Số video plan
  contentBudget: number;           // Ngân sách content
  targetViews: number;             // View video target
  targetVideoGmv: number;          // GMV video target
  ownerAction: string;             // Owner / action
}

/** Section 05: Lịch sản xuất & air Content Shopee */
export interface BrandOneSheetShopeeContentRow {
  id: string;
  week: 'W1' | 'W2' | 'W3' | 'W4' | 'W5';
  skuOrCombo: string;              // SKU / combo
  touchpointSource: string;        // Nguồn / điểm chạm ('Video self', 'Shopee Video Aff'...)
  airOrHandoverDate: string;       // Ngày air / bàn giao (VD: '03/11/2026')
  behaviorObjective: 'Awareness' | 'Consideration' | 'Conversion' | 'Loyalty' | string; // Mục tiêu / hành vi
  pillarId: string;                // Pillar ID ('P01'..'P05')
  angleAndBrief: string;           // Angle / nội dung / brief
  format: string;                  // Format ('FAQ', 'Demo', 'Review / unbox', 'Deal explainer', 'Routine')
  productionMethod: 'VJ' | 'Remix' | 'Inhouse' | 'KOC Reup' | string; // Phương thức sản xuất
  qty: number;                     // Số lượng
  budgetVnd: number;               // Ngân sách VNĐ
  ownerDeadlineKvNote: string;     // Owner / deadline / KV / final
}

/** Toàn bộ cấu trúc 1-Sheet Monthly Content & Key Visual Plan trình Brand */
export interface BrandOneSheetPlanData {
  brandName: string;
  month: string;                   // VD: '2026/11' hoặc '2026/10'
  preparedBy: string;              // Người lập / duyệt
  statusAndCutoffNote: string;     // Ngày chốt / trạng thái
  hasCampaign: boolean;
  campaignId?: string;
  campaignCode?: string;
  campaignTitle?: string;
  campaignPhaseName?: string;
  // 01. Định hướng tháng
  orientation: BrandOneSheetOrientation;
  // 02. Kế hoạch KPI tháng (Shopee | TikTok Shop | Total)
  shopeeKpi: BrandOneSheetPlatformKpi;
  tiktokKpi: BrandOneSheetPlatformKpi;
  kpiBalanceNote: string;
  // 03. Key Visual chung của tháng
  keyVisual: CampaignKeyVisualSpec;
  // 04. TikTok Shop • Content, KOC & Booking
  tiktokOverviewExtra: {
    selfRevenueTarget: number;
    selfContentCount: number;
    selfCostNet: number;
    affRevenueTarget: number;
    awarenessVideoTagCount: number; // Nhãn mục tiêu Awareness + Engagement trong tổng AFF
    brandingVideoTagCount: number;  // Nhãn mục tiêu Branding trong tổng AFF
    liveSelfOrders: number;
    liveSelfSessions2h: number;
    liveAffOrders: number;
    liveAffSessions: number;
  };
  tiktokWeeklyRows: BrandOneSheetTikTokWeeklyRow[];
  tiktokContentRows: BrandOneSheetTikTokContentRow[];
  // 05. Shopee • Chiến lược Pillar, Content & Target Tuần
  contentPillars: BrandOneSheetPillarRow[];
  shopeeWeeklyTargets: BrandOneSheetShopeeWeeklyTarget[];
  shopeeContentRows: BrandOneSheetShopeeContentRow[];
}




