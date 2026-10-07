export type UserRole = 'ADMIN' | 'BRAND_MEMBER' | 'CONTENT_MEMBER' | 'BOOKING_MEMBER' | 'MANAGER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatar: string;
}

export type KocTier = 'TIER_1_CELEB' | 'TIER_2_MACRO' | 'TIER_3_MICRO' | 'TIER_4_AFFILIATE';

// 🌟 1. KHUNG LƯƠNG (KL) - Chuẩn hóa Sheet 3.1 & 5.6
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

// 🌟 2. SEGMENT - Phân nhóm Creator theo vai trò chiến lược (Sheet 3.2 Col 81 & 5.6)
export type CreatorSegment = 
  | 'Massive Creator'
  | 'Mid Creator'
  | 'Key Creator'
  | 'Top Creator';

// 🌟 3. KOC CATEGORY - Ngành hàng / Lĩnh vực KOC (Sheet 3.2 Col 87 & 5.4)
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

// 🌟 4. TỆP KÊNH - 25 tệp chuẩn hóa trong vận hành Upbase (Sheet 3.1 Col 23 & 5.4)
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

export interface KocItem {
  id: string;
  channelId: string; // 🎃 ID kênh (vd: megauriviu, chanhbeauty)
  channelLink?: string; // Link kênh (https://www.tiktok.com/@...)
  stageName: string;
  realName: string;
  tier: KocTier;
  tierLabel: string;

  // 🌟 4 TRƯỜNG PHÂN LOẠI CỐT LÕI (Sheet 3.1 & 3.2 & 5.4 & 5.6):
  salaryGrade: SalaryGrade; // 1. Khung lương (TAP, KL1 ➔ KL7, TAP đối tác ngoài)
  segment: CreatorSegment; // 2. Phân nhóm Creator (Massive, Mid, Key, Top)
  tepKenh: TepKenh; // 3. 🌟Tệp kênh (25 tệp chuẩn: Review Nữ, Mẹ bé (bầu), Beauty, ELHA...)
  creatorCategory?: CreatorNiche; // Alias backward-compatibility cho tepKenh
  kocCategory: KocCategory; // 4. KOC category (9 nhóm ngành: Personal care, Mom and baby, Reviewer...)

  niche: string;
  followers: number; // Follower
  avgViews: number; // View trung bình
  rateCardVideo: number; // 🎃 Giá net video
  bookingFormat?: 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần'; // Định dạng booking
  
  // Thông tin liên hệ & Hậu cần nhận hàng gửi mẫu (Sample Shipping - Rất quan trọng cho Booking)
  phone: string;
  zalo: string;
  email?: string;
  shippingAddress?: string; // Thông tin nhận hàng (Địa chỉ, người nhận, SĐT)
  location?: string; // Khu vực (Hà Nội, TP.HCM, Miền Bắc, Miền Nam...)
  otherContactMethod?: string;

  // Pháp lý & Thanh toán (Hợp đồng & VietQR)
  cccd: string;
  bankName: string;
  bankAccount: string;
  avatarUrl?: string;

  // Chỉ số E-Commerce & Bán hàng (TikTok Shop / Shopee Analytics)
  gmvBestCase?: number; // GMV best case
  recentRevenue?: number; // Doanh số (nếu có)
  itemsSold?: number; // Số món bán ra
  gpm?: number; // GPM (Doanh thu/1000 lượt hiển thị)
  aov?: number; // AOV (Giá trị trung bình đơn hàng)
  gmvShareVideo?: number; // Tỉ trọng GMV từ video (%)
  gmvShareLive?: number; // Tỉ trọng GMV từ livestream (%)
  gmvShareProductCard?: number; // Tỉ trọng GMV từ thẻ sản phẩm (%)

  // Nhân khẩu học Follower (Audience Demographics)
  femaleRatio?: number; // Tỉ trọng follower Nữ (%)
  maleRatio?: number; // Tỉ trọng follower Nam (%)
  age18_24?: number; // Tỉ trọng follower 18 - 24 tuổi (%)
  age25_34?: number; // Tỉ trọng follower 25 - 34 tuổi (%)
  age35Plus?: number; // Tỉ trọng follower > 35 tuổi (%)

  // Vận hành & Phê duyệt Brand
  brandName?: string; // Brand / Store phù hợp hoặc đề xuất
  brandApprovalStatus?: 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI'; // 🎃 Brand duyệt
  brandRejectReason?: string; // Lý do Brand từ chối
  statusKoc?: 'SẴN_SÀNG' | 'ĐANG_LIÊN_HỆ' | 'TỪ_CHỐI' | 'ĐÃ_KÝ'; // 🎃 Trạng thái KOC
  currentPipeline?: string; // Pipeline (Đã duyệt, Đã tạo BO, Gửi hàng, Đã air...)
  bookingPic?: string; // Booking PIC (Nhân sự phụ trách)
  contentNote?: string; // Content note / Đề xuất từ UpBase
  accountComment?: string; // Leader/Growth/Account comment

  // Lịch sử booking tại Upbase
  reliabilityScore: number;
  totalPastDeals?: number;
  totalPastGmv?: number;
  totalPastCost?: number;
  historicalRoi?: number;
  isWinnerTop20?: boolean;
}

export type DealStatus = 
  | 'CONTACTING'
  | 'SCRIPT_PENDING'
  | 'SCRIPT_APPROVED'
  | 'CONTRACT_GENERATED'
  | 'ADVANCE_PAID'
  | 'SAMPLE_SHIPPED'
  | 'SAMPLE_RECEIVED'
  | 'VIDEO_SUBMITTED'
  | 'VIDEO_VERIFIED'
  | 'FINAL_PAID'
  | 'CANCELLED';

export type BrandApprovalStatus = 'ĐÃ_DUYỆT' | 'CHỜ_DUYỆT' | 'TỪ_CHỐI';
export type KocJobResponseStatus = 'ĐỒNG_Ý' | 'TỪ_CHỐI' | 'ĐANG_THƯƠNG_LƯỢNG';

export interface BookingDealItem {
  id: string;
  dealCode: string; // Mã BO (ví dụ: BO260757834, BO26_CHANH_1010)
  jobId?: string; // Mã ID Job tác nghiệp (ví dụ: ID260952684, ID260747077)
  campaignCode: string;
  campaignTitle: string;
  
  // Brand & Store & Sản phẩm của Job này (Cốt lõi theo Job)
  brandName: string; // Brand (Kutieskin Mama, Royal Ausnz, Nature's Way, Bye Bye Blemish, pHCare, Babe...)
  storeName?: string; // Store (Kutieskin Mama_TikTok_E2E-S, Fresh_TikTok_E2E-C...)
  productName?: string; // 🌟Sản phẩm (Mặt nạ rau má Premium, Nước tắm/kem tuti, Quạt tuần hoàn...)
  bookingBatch?: string; // 🎃 Đợt (Đợt 1, Đợt 2, Đợt 3)
  bookingFormat?: 'Booking Video KOC' | 'Booking Livestream KOC' | 'Affiliate Thuần';
  
  // KOC Reference & 4 Phân loại cốt lõi (Sheet 3.1 & 3.2)
  kocId: string;
  kocStageName: string;
  kocChannelId?: string;
  kocTier: KocTier;
  salaryGrade: SalaryGrade; // 1. Khung lương
  segment: CreatorSegment; // 2. Phân nhóm Creator
  tepKenh: TepKenh; // 3. Tệp kênh
  creatorCategory?: CreatorNiche; // Alias backward-compatibility
  kocCategory: KocCategory; // 4. KOC category
  contentPillar: ContentPillarType;
  
  // Phê duyệt của Brand (THEO TỪNG JOB CỤ THỂ)
  brandApprovalStatus: BrandApprovalStatus; // 🎃 Brand duyệt (ĐÃ_DUYỆT, CHỜ_DUYỆT, TỪ_CHỐI)
  brandApprovalDate?: string; // Ngày Brand duyệt
  brandRejectReason?: string; // Lý do Brand từ chối (nếu có)
  
  // Trạng thái KOC nhận Job này
  kocResponseStatus?: KocJobResponseStatus; // 🎃 Trạng thái KOC (ĐỒNG_Ý, TỪ_CHỐI, ĐANG_THƯƠNG_LƯỢNG)
  
  // Pipeline vận hành theo từng Job
  pipelineText?: string; // Pipeline_text (Gửi hàng, Tạm ứng, Done...)
  status: DealStatus;
  statusLabel: string;
  currentStage?: '1_PLAN_SOURCING' | '2_DEAL_CONTRACT' | '3_CONTENT_SCRIPT' | '4_AIR_GROWTH' | '5_SETTLEMENT';
  holdingTeam?: 'BOOKING' | 'CONTENT' | 'BRAND' | 'GROWTH' | 'FINANCE';
  holdingReason?: string;
  slaDeadline?: string;
  slaRemainingText?: string;
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  growthHandoffStatus?: 'CHƯA_BÀN_GIAO' | 'ĐÃ_GIAO_MÃ_ADS' | 'GROWTH_ĐANG_CHẠY' | 'HOÀN_TẤT';
  sparkAdsCode?: string;
  sampleStatus?: 'CHƯA_GỬI' | 'ĐANG_GIAO' | 'ĐÃ_NHẬN';
  adsCodeStatus?: 'CHƯA_CẤP' | 'ĐÃ_NGHIỆM_THU' | 'KHÔNG_DÙNG';
  tiktokVideoUrl?: string;
  
  // Nhân sự phối hợp trên Job (3 bên)
  assignedStaff: string; // Booking PIC
  bookingPic?: string; // Booking PIC
  growthPic?: string; // Growth PIC (Phạm Thị Hồng Yến, Nguyễn Anh Tú...)
  accountPic?: string; // Account PIC (Phạm Thị Nhài, Hà Thị Thương...)
  leadBooking?: string; // Lead Booking
  contentNote?: string; // Content note / Đề xuất từ UpBase cho Job này
  accountComment?: string; // Comment từ Leader / Account
  
  // Tài chính & Doanh thu Job
  totalValue: number; // Giá net video thỏa thuận cho Job này
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

  // Tách rời thực thể & Quy trình duyệt Lark
  committedOutputsCount?: number; // Số output cam kết (1 booking -> N content items)
  larkAdvanceApprovalCode?: string; // Mã phiếu tạm ứng 2tr trên Lark
  larkFinalApprovalCode?: string; // Mã phiếu quyết toán 8tr trên Lark
  contentItems?: ContentItemModel[];

  // 🌟 BỘ TRIGGER SLA B2C MỚI (CHUẨN HOÁ THEO TÀI LIỆU CÁC SLA B2C.PDF)
  // 1. Pháp chế & Hợp đồng KOC
  contractScanUrl?: string; // Link scan hợp đồng (Bắt buộc với deal > 9.000.000 VNĐ)
  contractCreatedAt?: string; // Ngày ký HĐ (phải trước ngày DNTT >= 2 ngày với deal > 9M)
  contractSignDaysPrior?: number; // Số ngày ký HĐ trước DNTT
  hasIdCardScan?: boolean; // Đã có ảnh CCCD / Hộ chiếu / MST hợp lệ
  kocIdCardNumber?: string; // Số CCCD / Hộ chiếu
  kocBankName?: string; // Ngân hàng nhận thanh toán
  kocBankAccount?: string; // Số tài khoản chính chủ
  kocBankHolder?: string; // Tên chủ tài khoản

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
  | 'E2E_RECONCILIATION';

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
}

// 🌟 PHÂN LOẠI VI PHẠM SLA B2C (THEO QUY ĐỊNH MỚI)
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

// 🌟 BÁO CÁO QUẢN LÝ TUÂN THỦ SLA CỦA NHÂN VIÊN
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

// 🌟 LỊCH CỬA SỔ NGHIỆM THU E2E KẾ TOÁN (WD05 & WD11)
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
  guidelineUrl?: string;
  keyMessage?: string;
  heroSkus?: string[];
  targetCir?: number; // e.g. 20.0 (%)
  contentPic?: string; // Content Leader nhận handoff
  handoffAt?: string; // Thời điểm handoff
  handoffSlaHours?: number; // Mặc định 24h
  isSlaBreached?: boolean;
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
  shareAccessPin?: string; // Mã PIN xem tài liệu (nếu có)
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
  type: 'BLACKLIST_WORD' | 'MISSING_DISCLAIMER' | 'WEAK_HOOK' | 'TONE_MISMATCH' | 'MISSING_USP';
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
}

export interface BrandDetail {
  id: string;
  code: string;
  name: string;
  companyName: string;
  category: string;
  color: string;
  status: 'ACTIVE' | 'PAUSED' | 'UPCOMING';
  
  // Ngân sách & Mục tiêu
  planBudget: number;
  spentBudget: number;
  targetGmv: number;
  currentGmv: number;
  targetVideos: number;
  airedVideos: number;

  // Đội ngũ phụ trách 3 bên (PIC)
  accountPic: string; // Account Manager làm việc với Brand
  growthPic: string; // Growth Lead chạy Ads & GMV
  bookingPicLead: string; // Trưởng nhóm Booking phụ trách KOC
  
  // Tiêu chí & Guidelines
  brandGuideline: string;
  kocCriteria: string;
  forbiddenNotes?: string; // Điều cấm kỵ (VD: Không nhắc đối thủ, không dùng từ tuyệt đối...)

  // Gian hàng & Sản phẩm
  stores: EcomStore[];
  heroProducts: HeroProduct[];
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
  growthPic: string; // Growth Lead gửi yêu cầu
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
  draftVideoUrl?: string; // Watermarked draft video
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

// 📦 Quản lý Vận đơn gửi mẫu & Chống bùng mẫu (KOC Sample Delivery & Anti-Ghosting)
export interface SampleShipment {
  id: string;
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

// 🎯 Hệ số độ khó Store theo chuẩn 4P Marketing B2C
export interface StoreDifficultyConfig {
  id: string;
  storeName: string;
  platform: 'TikTok Shop' | 'Shopee' | 'Lazada';
  difficultyTier: 'Cơ bản' | 'Tiêu chuẩn' | 'Vừa' | 'Khó';
  multiplier: number; // 1.0 | 1.2 | 1.4 | 1.6
  category: string; // Mỹ phẩm, Thời trang, Mẹ & Bé, Gia dụng
  monthlyTargetGmv: number;
  assignedPic: string;
}

// 🏆 Đánh giá hiệu suất 4P & Tính thưởng P3
export interface StaffP3Record {
  id: string;
  staffName: string;
  role: 'Booking' | 'Content' | 'Brand';
  level: 'Intern' | 'Junior' | 'Senior' | 'Lead';
  assignedStore: string;
  storeMultiplier: number; // 1.0 - 1.6
  completedCases: number; // Số ca/job hoàn thành trong tháng
  qualityMultiplier: number; // 0.9 - 1.15
  slaMultiplier: number; // 0.8 - 1.2
  calculatedWorkloadPoints: number; // Workload = Cases * StoreMulti * Quality * SLA
  baseP3UnitRate: number; // Đơn giá 1 điểm workload (VD: 35.000đ/điểm)
  estimatedBonusVnd: number;
  approvalStatus: 'CHỜ_DUYỆT' | 'ĐÃ_DUYỆT' | 'YÊU_CẦU_ĐIỀU_CHỈNH';
  reviewNotes?: string;
}

// 📊 Dữ liệu kế hoạch chi tiết từ 4.1.1 Input Plan (Bậc KL1 - KL7)
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
export type StoreDifficultyTier = 'Cơ bản' | 'Tiêu chuẩn' | 'Vừa' | 'Khó';

export interface StorePortfolioItem {
  id: string;
  brandName: string;
  storeName: string;
  platform: 'TikTok Shop' | 'Shopee Mall' | 'Lazada';
  storeUrl?: string;
  serviceModel: ServiceModel;
  difficultyTier: StoreDifficultyTier;
  difficultyMultiplier: number; // 1.0, 1.2, 1.4, 1.6
  accountStatus: AccountStatus;
  category: string;
  monthlyTargetGmv: number;
  monthlyBudget: number;
  accountOwnerName: string; // Account/Growth Owner phụ trách doanh số & quan hệ khách hàng
  b2cOwnerName: string; // B2C Ops Owner phụ trách vận hành nội dung & booking
  b2cOwners?: string[]; // 🌟 Danh sách các nhân sự B2C Ops cùng làm 1 shop (hỗ trợ trường hợp 2+ nhân viên làm cùng 1 shop)
  assignmentNotes?: string; // 🌟 Ghi chú phân chia công việc (ví dụ: chia theo Tier KOC, chia ca, chia đầu việc)
  activeCandidatesCount?: number;
  activeBookingsCount?: number;
  activeContentsCount?: number;
  createdAt?: string;
}

// 🌟 MASTER DATA NHÂN VIÊN & PHÂN CÔNG GIAN HÀNG
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
  // 🌟 4 Phân loại cốt lõi (Sheet 3.1 & 3.2)
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
  apiProvider?: 'GEMINI' | 'OPENAI' | 'AUTO';
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
// 🌟 7. INPUT PLAN BREAKDOWN STUDIO TYPES (PHÂN RÃ KẾ HOẠCH B2C ĐA KÊNH & ĐA BẬC)
// =========================================================================

export type InputPlanChannelType = 
  | 'TIKTOK' 
  | 'SHOPEE' 
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
  tierCode: SalaryGrade | 'Reup' | 'Affiliate' | 'Review voice' | 'Nhạc text' | 'Video remix' | 'Video AI' | 'POV' | 'Độc quyền' | 'Add in' | 'Daily';
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

export interface InputPlanBreakdownState {
  id: string;
  title: string;
  brandName: string;
  month: string;
  week: string;
  pic: string;
  totalTargetBudget: number; // Ngân sách tổng ban đầu (VNĐ)
  totalTargetContents: number; // Số lượng nội dung tổng ban đầu
  targetGmv: number; // GMV mục tiêu
  cancellationRate: number; // Tỷ lệ hủy định mức (default 8%)
  strategyPreset?: 'CUSTOM' | 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE';
  notes?: string;
  items: InputPlanRowItem[];
}
