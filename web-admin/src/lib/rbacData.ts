import { 
  UserRole, 
  TabKey,
  SystemDepartmentScope,
  DepartmentAccessRule,
  StaffMasterMember,
  PermissionAccessLevel, 
  PermissionMatrixItem, 
  InternalStaffRbacMember, 
  RbacAuditLogItem 
} from './types';

// =========================================================================
// 1. ROLE DEFINITIONS (ĐỊNH NGHĨA VAI TRÒ HỆ THỐNG THEO 3 KHỐI: MARKETING - GROWTH - MEDIA)
// =========================================================================
export interface RoleDefinition {
  id: UserRole;
  code: string;
  name: string;
  scopeType: 'INTERNAL' | 'EXTERNAL';
  departmentScope?: SystemDepartmentScope;
  badgeColor: string;
  description: string;
  defaultLandingTab: string;
  userCount: number;
}

export const RBAC_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'ADMIN',
    code: 'BOD_ADMIN',
    name: 'Quản Trị Hệ Thống (Admin)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Xác định phòng ban và nhân sự thuộc Marketing B2C, Growth, Media được phép đăng nhập hệ thống; phân quyền toàn cục.',
    defaultLandingTab: 'partner-access',
    userCount: 2
  },
  {
    id: 'MANAGER',
    code: 'MKT_B2C_HEAD',
    name: 'Trưởng Phòng Marketing B2C',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Quản lý nhân sự khối Marketing B2C (Booking, Content, Brand), phân bổ gian hàng, duyệt kế hoạch tháng B2C, duyệt chi & thưởng P3.',
    defaultLandingTab: 'cockpit',
    userCount: 1
  },
  {
    id: 'GROWTH_MANAGER',
    code: 'GROWTH_HEAD',
    name: 'Trưởng Phòng Growth',
    scopeType: 'INTERNAL',
    departmentScope: 'GROWTH',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Quản lý đội ngũ chuyên viên Growth (Growth 1-6, HCM), phân công gian hàng, giao & duyệt chỉ tiêu Input Plan tháng (GMV, Ngân sách Order Net/Gross).',
    defaultLandingTab: 'manager',
    userCount: 3
  },
  {
    id: 'MEDIA_MANAGER',
    code: 'MEDIA_HEAD',
    name: 'Trưởng Phòng Media',
    scopeType: 'INTERNAL',
    departmentScope: 'MEDIA',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Quản lý đội ngũ chuyên viên Media (Media Omni, Media TikTok), phân công nhận mã Spark Ads, duyệt phân bổ ngân sách quảng cáo & kiểm soát ROAS/CPA.',
    defaultLandingTab: 'manager',
    userCount: 2
  },
  {
    id: 'LEADER',
    code: 'PIC_LEAD',
    name: 'Trưởng Nhóm B2C (Leader)',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Phụ trách cụm Brand/Store có nhóm, duyệt ứng viên KOC/Deal bước 1, duyệt kịch bản sơ bộ, theo dõi tiến độ lên bài của nhóm.',
    defaultLandingTab: 'booking',
    userCount: 4
  },
  {
    id: 'MEMBER',
    code: 'SPECIALIST',
    name: 'Chuyên Viên (MKT / Growth / Media)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Tác nghiệp trực tiếp trên Brand/Gian hàng được Trưởng phòng phân công (Booking, Content, Brand, Growth, Media).',
    defaultLandingTab: 'cockpit',
    userCount: 260
  },
  {
    id: 'BRAND_PARTNER',
    code: 'BRAND_GMAIL',
    name: 'Đại Diện Thương Hiệu (Brand)',
    scopeType: 'EXTERNAL',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Đăng nhập Gmail, chỉ xem nhãn hàng và gian hàng của mình. Duyệt danh sách KOC, duyệt kịch bản và theo dõi GMV/ROAS.',
    defaultLandingTab: 'brand-hub',
    userCount: 8
  },
  {
    id: 'KOC_PARTNER',
    code: 'CREATOR_GMAIL',
    name: 'KOC / KOL / Creator',
    scopeType: 'EXTERNAL',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Đăng nhập Gmail, chỉ xem Job/Deal của bản thân. Đăng ký nhận hàng mẫu, nộp link video và cấp mã TikTok Spark Ads.',
    defaultLandingTab: 'koc-hub',
    userCount: 42
  },
  {
    id: 'CTV_PARTNER',
    code: 'CTV_GMAIL',
    name: 'Cộng Tác Viên (CTV Nội Bộ)',
    scopeType: 'EXTERNAL',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Đăng nhập Gmail, nhận yêu cầu sản xuất video kênh nội bộ UpBase, nộp sản phẩm và theo dõi thù lao hoa hồng.',
    defaultLandingTab: 'self-channel-hub',
    userCount: 15
  }
];

// =========================================================================
// 2. MA TRẬN PHÂN QUYỀN CHI TIẾT (26 TÍNH NĂNG x 5 PHÂN HỆ x 7 VAI TRÒ)
// =========================================================================
const RAW_PERMISSION_MATRIX: PermissionMatrixItem[] = [
  // --- PHÂN HỆ 1: LẬP KẾ HOẠCH & PHÂN BỔ TẢI ---
  {
    id: 'plan_target_month',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Kế hoạch tháng (Input Plan & Target)',
    description: 'Lập mục tiêu GMV, số video, hạn mức ngân sách tháng của các nhãn hàng.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'APPROVE',
      LEADER: 'SCOPED',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'VIEW',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Brand chỉ xem được Target của chính nhãn mình, không thấy nhãn khác.'
  },
  {
    id: 'plan_budget_salary_grade',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Phân bổ ngân sách theo Khung Lương (KL1 - KL4, TAP)',
    description: 'Cấu hình tỷ trọng số lượng video và ngân sách phân chia theo khung lương KOC.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'APPROVE',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Bảo mật tuyệt đối chính sách khung lương nội bộ với bên thứ 3.'
  },
  {
    id: 'delegation_pic_assignment',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Phân bổ tải & Giao việc PIC (Manager Delegation)',
    description: 'Giao nhãn hàng, gian hàng và chỉ tiêu booking cho Leader và Chuyên viên.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Member chỉ xem được phần việc được giao trong Cockpit của mình.'
  },
  {
    id: 'push_products_catalog',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Sản phẩm đẩy của nhãn (Push Products Catalog)',
    description: 'Quản lý danh sách sản phẩm chủ lực, USP, quà tặng và tồn kho booking.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'SCOPED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'content_angles_setup',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Góc nội dung (Content Angles & Hook 3s)',
    description: 'Thiết lập ma trận góc tiếp cận theo Trụ cột nội dung (Pillars) và Sản phẩm.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'APPROVE',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'VIEW',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },

  // --- PHÂN HỆ 2: VẬN HÀNH BOOKING KOC & SẢN XUẤT NỘI DUNG ---
  {
    id: 'koc_master_database',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Tìm kiếm & Đánh giá Creator (KOC Master Data)',
    description: 'Tra cứu hồ sơ hơn 10.000 Creator, xem điểm uy tín, kênh TikTok, tỷ lệ ra đơn.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'ALL',
      MEMBER: 'ALL',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Dữ liệu tài sản độc quyền của UpBase, ẩn hoàn toàn với bên ngoài.'
  },
  {
    id: 'deal_create_management',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Tạo & Chốt Booking Deal (Gắn KOC, Khung Lương, SP)',
    description: 'Khởi tạo deal hợp tác, chốt thù lao, hoa hồng affiliate và deadline lên bài.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'deal_approval_two_tier',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Phê duyệt Deal KOC (Cấp 1 & Cấp 2)',
    description: 'Quy trình ký duyệt danh sách KOC: Leader duyệt chuyên môn, Brand duyệt thương hiệu.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'APPROVE',
      LEADER: 'APPROVE',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'APPROVE',
      KOC_PARTNER: 'SCOPED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Brand chỉ duyệt các Deal thuộc nhãn mình; KOC bấm xác nhận nhận Job.'
  },
  {
    id: 'script_drafting',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Soạn thảo & Quản lý Kịch bản video (Script Writing)',
    description: 'Xây dựng kịch bản chi tiết: Hook 3s đầu, Body giải pháp, CTA kêu gọi mua hàng.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'SCOPED',
      CTV_PARTNER: 'SCOPED'
    }
  },
  {
    id: 'script_approval',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Phê duyệt Kịch bản video (Script Approval)',
    description: 'Duyệt nội dung kịch bản trước khi quay: Leader duyệt guideline, Brand chốt bài.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'APPROVE',
      LEADER: 'APPROVE',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'APPROVE',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'sample_shipping_tracker',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Theo dõi Hàng mẫu (Sample Tracker & Bưu tá)',
    description: 'Quản lý gửi mẫu, mã vận đơn, cảnh báo giao trễ và xác nhận nhận mẫu.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'VIEW',
      KOC_PARTNER: 'SCOPED',
      CTV_PARTNER: 'SCOPED'
    }
  },
  {
    id: 'video_link_spark_ads',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Nghiệm thu Video & Mã TikTok Spark Ads',
    description: 'Cung cấp link video TikTok đã đăng và mã ủy quyền quảng cáo Spark Ads.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'VIEW',
      KOC_PARTNER: 'SCOPED',
      CTV_PARTNER: 'SCOPED'
    }
  },

  // --- PHÂN HỆ 3: HỢP ĐỒNG, PHÁP LÝ & THANH TOÁN ---
  {
    id: 'legal_ocr_extraction',
    category: 'CONTRACTS_FINANCE',
    categoryTitle: '3. Hợp Đồng, Pháp Lý & Thanh Toán',
    featureName: 'Quét OCR giấy tờ KOC (CCCD, Mã số thuế, Ngân hàng)',
    description: 'Trích xuất tự động thông tin định danh bằng AI/OCR để lập hồ sơ pháp lý.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'SCOPED',
      CTV_PARTNER: 'SCOPED'
    }
  },
  {
    id: 'contract_creation',
    category: 'CONTRACTS_FINANCE',
    categoryTitle: '3. Hợp Đồng, Pháp Lý & Thanh Toán',
    featureName: 'Tạo Hợp đồng Booking & Phụ lục nghiệm thu',
    description: 'Sinh hợp đồng điện tử theo mẫu pháp chế chuẩn UpBase, gửi KOC ký duyệt.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'VIEW',
      CTV_PARTNER: 'VIEW'
    }
  },
  {
    id: 'payment_request_submission',
    category: 'CONTRACTS_FINANCE',
    categoryTitle: '3. Hợp Đồng, Pháp Lý & Thanh Toán',
    featureName: 'Lập Yêu cầu thanh toán (Payment Request)',
    description: 'Lập bảng kê thù lao KOC kèm bằng chứng nghiệm thu video đạt yêu cầu.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'payment_approval_disbursement',
    category: 'CONTRACTS_FINANCE',
    categoryTitle: '3. Hợp Đồng, Pháp Lý & Thanh Toán',
    featureName: 'Phê duyệt Thanh toán & Chuyển khoản',
    description: 'Ký duyệt chứng từ chi tiền cho KOC và CTV theo từng đợt đối soát.',
    permissions: {
      ADMIN: 'APPROVE',
      MANAGER: 'APPROVE',
      LEADER: 'DENIED',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'VIEW',
      CTV_PARTNER: 'VIEW'
    },
    securityNote: 'KOC và CTV chỉ xem trạng thái thanh toán (Đang xử lý / Đã chuyển khoản).'
  },
  {
    id: 'agency_financial_margins',
    category: 'CONTRACTS_FINANCE',
    categoryTitle: '3. Hợp Đồng, Pháp Lý & Thanh Toán',
    featureName: 'Xem Chi phí Net & Biên lợi nhuận Agency',
    description: 'Chênh lệch giữa giá Brand thanh toán và chi phí thực trả cho KOC.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'VIEW',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Tuyệt đối ẩn với Brand và Creator để bảo vệ bí mật kinh doanh.'
  },

  // --- PHÂN HỆ 4: HIỆU SUẤT, THƯỞNG 4P & BÁO CÁO ADS ---
  {
    id: 'ads_report_bi',
    category: 'PERFORMANCE_ADS',
    categoryTitle: '4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads',
    featureName: 'Báo cáo Ads TikTok (GMV, ROAS, CPA, Hook Rate)',
    description: 'Phân tích hiệu quả chạy ads video của từng creator và chiến dịch đẩy số.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'SCOPED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Brand Partner chỉ xem được số liệu các gian hàng được phân quyền.'
  },
  {
    id: 'p3_performance_evaluation',
    category: 'PERFORMANCE_ADS',
    categoryTitle: '4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads',
    featureName: 'Đánh giá 4P & Quỹ Thưởng (P3 Performance)',
    description: 'Hệ thống tính điểm 4P nhân sự và duyệt quỹ thưởng hoa hồng hàng tháng.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'APPROVE',
      LEADER: 'SCOPED',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    },
    securityNote: 'Member chỉ xem điểm P3 của chính bản thân; ẩn hoàn toàn với đối tác ngoài.'
  },
  {
    id: 'executive_bi_cockpit',
    category: 'PERFORMANCE_ADS',
    categoryTitle: '4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads',
    featureName: 'Dashboard Điều Hành BI Tổng Hợp Toàn Khối',
    description: 'Tổng quan GMV, doanh thu, tốc độ tăng trưởng, tỷ lệ hủy đơn toàn sàn.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'raw_data_export',
    category: 'PERFORMANCE_ADS',
    categoryTitle: '4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads',
    featureName: 'Xuất dữ liệu báo cáo (Export Excel / CSV)',
    description: 'Tải dữ liệu danh sách booking, nghiệm thu và báo cáo tài chính về máy.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      BRAND_PARTNER: 'SCOPED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },

  // --- PHÂN HỆ 5: QUẢN TRỊ HỆ THỐNG & DỮ LIỆU GỐC ---
  {
    id: 'master_data_brand_stores',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Quản trị Dữ liệu gốc (Brand, Store, Hero SKU)',
    description: 'Thêm mới, sửa thông tin nhãn hàng, gian hàng TikTok Shop/Shopee, danh mục.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'VIEW',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'staff_master_lark_sync',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Quản lý Nhân sự & Phân vai nội bộ (Staff Master)',
    description: 'Danh bạ nhân viên Lark, phân vai trò Admin/Manager/Leader/Member.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'VIEW',
      MEMBER: 'VIEW',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'third_party_gmail_sso',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Cấp quyền & Khóa tài khoản Gmail Đối Tác',
    description: 'Thêm tài khoản Gmail bên thứ 3, phân quyền gian hàng và tính năng được xem.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'impersonate_preview_mode',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Chế độ Xem thử (Impersonate / Test View)',
    description: 'Đóng vai đối tác Brand/KOC hoặc nhân sự khác để kiểm tra giao diện phân quyền.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  },
  {
    id: 'security_audit_log_access',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Xem Nhật ký kiểm toán & Audit Logs',
    description: 'Lịch sử truy cập, thay đổi quyền, đăng nhập và xuất dữ liệu nhạy cảm.',
    permissions: {
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'DENIED',
      MEMBER: 'DENIED',
      BRAND_PARTNER: 'DENIED',
      KOC_PARTNER: 'DENIED',
      CTV_PARTNER: 'DENIED'
    }
  }
];

export const INITIAL_PERMISSION_MATRIX: PermissionMatrixItem[] = RAW_PERMISSION_MATRIX.map(item => {
  let growthManagerPerm: PermissionAccessLevel = 'VIEW';
  let mediaManagerPerm: PermissionAccessLevel = 'VIEW';

  if (item.category === 'PLANNING') {
    growthManagerPerm = item.id === 'plan_target_month' ? 'APPROVE' : item.id === 'delegation_pic_assignment' ? 'ALL' : 'SCOPED';
    mediaManagerPerm = item.id === 'plan_target_month' ? 'APPROVE' : item.id === 'delegation_pic_assignment' ? 'ALL' : 'VIEW';
  } else if (item.category === 'BOOKING_CONTENT') {
    growthManagerPerm = 'VIEW';
    mediaManagerPerm = item.id === 'video_link_spark_ads' ? 'ALL' : 'VIEW';
  } else if (item.category === 'CONTRACTS_FINANCE') {
    growthManagerPerm = item.id === 'agency_financial_margins' ? 'ALL' : 'VIEW';
    mediaManagerPerm = item.id === 'agency_financial_margins' ? 'VIEW' : 'DENIED';
  } else if (item.category === 'PERFORMANCE_ADS') {
    growthManagerPerm = item.id === 'p3_performance_evaluation' ? 'APPROVE' : 'ALL';
    mediaManagerPerm = item.id === 'p3_performance_evaluation' ? 'APPROVE' : 'ALL';
  } else if (item.category === 'SYSTEM_MASTER') {
    growthManagerPerm = ['master_data_brand_stores', 'staff_master_lark_sync', 'impersonate_preview_mode'].includes(item.id) ? 'SCOPED' : 'VIEW';
    mediaManagerPerm = ['master_data_brand_stores', 'staff_master_lark_sync', 'impersonate_preview_mode'].includes(item.id) ? 'SCOPED' : 'VIEW';
  }

  return {
    ...item,
    permissions: {
      ...item.permissions,
      GROWTH_MANAGER: item.permissions.GROWTH_MANAGER || growthManagerPerm,
      MEDIA_MANAGER: item.permissions.MEDIA_MANAGER || mediaManagerPerm,
    }
  };
});

// =========================================================================
// 3. DANH SÁCH NHÂN SỰ NỘI BỘ UPBASE CỐT LÕI (3 KHỐI: MARKETING B2C - GROWTH - MEDIA)
// =========================================================================
export const INITIAL_INTERNAL_STAFF_RBAC: InternalStaffRbacMember[] = [
  {
    id: 'user-do-van-giang',
    staffCode: 'HN001',
    name: 'Đỗ Văn Giang',
    email: 'giangdv@upbase.vn',
    avatar: 'DG',
    role: 'ADMIN',
    roleTitle: 'Tổng Giám Đốc (CEO / BOD Admin)',
    department: 'Ban Giám Đốc',
    team: 'BOD',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'CEO',
    picBrands: ['ALL_BRANDS'],
    permissions: {
      canApproveBudget: true,
      canApproveP3: true,
      canApprovePayment: true,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: true
    },
    status: 'ACTIVE',
    lastActive: 'Vừa xong',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-yen-nhi',
    staffCode: 'HN012',
    name: 'Đặng Thị Yến Nhi',
    email: 'yennhi@upbase.vn',
    avatar: 'YN',
    role: 'MANAGER',
    roleTitle: 'Trưởng Phòng Marketing B2C (Lead B2C)',
    department: 'Khối Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'Trưởng Phòng Vận Hành B2C',
    picBrands: ['ALL_BRANDS', 'ClubClio', 'Cindy Bloom', 'L\'Occitane Việt Nam', 'Rejuran', 'Ziaja Intimate', '4PM'],
    permissions: {
      canApproveBudget: true,
      canApproveP3: true,
      canApprovePayment: true,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: true
    },
    status: 'ACTIVE',
    lastActive: '5 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-growth-manager-quyen',
    staffCode: 'HN018',
    name: 'Trần Thị Đỗ Quyên',
    email: 'quyenttd@upbase.vn',
    avatar: 'ĐQ',
    role: 'GROWTH_MANAGER',
    roleTitle: 'Trưởng Phòng Growth (Head of Growth)',
    department: 'Khối Growth Ecom',
    team: 'Growth 1',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'GROWTH',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'Trưởng phòng vận hành Ecom',
    picBrands: ['ALL_BRANDS', 'ClubClio', 'Kutieskin', 'Fresh', 'Cocoon', 'Senka', 'La Roche-Posay'],
    permissions: {
      canApproveBudget: true,
      canApproveP3: true,
      canApprovePayment: false,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '8 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-media-manager-quang',
    staffCode: 'HN045',
    name: 'Nguyễn Đức Quảng',
    email: 'quangnd@upbase.vn',
    avatar: 'ĐQ',
    role: 'MEDIA_MANAGER',
    roleTitle: 'Trưởng Phòng Media (Head of Media)',
    department: 'Khối Media & Ads',
    team: 'Media Omni',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MEDIA',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'Media Leader / Head of Media',
    picBrands: ['ALL_BRANDS', 'ClubClio', 'Kutieskin', 'Fresh', 'Cocoon', 'Senka', 'La Roche-Posay'],
    permissions: {
      canApproveBudget: true,
      canApproveP3: true,
      canApprovePayment: false,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '15 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-ngoc-tam',
    staffCode: 'HN088',
    name: 'Nguyễn Thị Ngọc Tâm',
    email: 'ngoctam@upbase.vn',
    avatar: 'NT',
    role: 'LEADER',
    roleTitle: 'Trưởng Nhóm Booking (Cluster PIC)',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Trưởng Nhóm Booking',
    picBrands: ['ClubClio', 'Cindy Bloom', 'Mine', 'EUPC', 'L\'Occitane Việt Nam', 'Bye Bye Blemish', 'Rejuran'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: true,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '12 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-phuong-thao',
    staffCode: 'HN102',
    name: 'Lê Phương Thảo',
    email: 'phuongthao@upbase.vn',
    avatar: 'PT',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Chuyên Viên Booking',
    picBrands: ['BELLA', 'Dynik', 'Miss Saigon', 'Ekseption', '4PM'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '20 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-nhu-quynh',
    staffCode: 'HN105',
    name: 'Lương Thị Như Quỳnh',
    email: 'nhuquynh@upbase.vn',
    avatar: 'NQ',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Chuyên Viên Booking',
    picBrands: ['Kutieskin', 'Baniphar', 'Nabizam', 'Docilee', 'Nature\'s Way', 'Ziaja'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '25 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-thanh-hai',
    staffCode: 'HN112',
    name: 'Lê Thanh Hải',
    email: 'thanhhai@upbase.vn',
    avatar: 'TH',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking Chính',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Chuyên Viên Booking',
    picBrands: ['Bye Bye Blemish', 'Herbal Care', 'Fresh', 'HDT', 'pHCare', 'Nucos'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '30 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-growth-anh',
    staffCode: 'HN210',
    name: 'Trần Thị Ánh',
    email: 'anhtt@upbase.vn',
    avatar: 'TÁ',
    role: 'GROWTH_MEMBER',
    roleTitle: 'Chuyên Viên Chiến Lược & PnL (Growth PIC)',
    department: 'Growth 1',
    team: 'Growth 1',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'GROWTH',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-growth-manager-quyen',
    managerName: 'Trần Thị Đỗ Quyên',
    position: 'Growth Executive',
    picBrands: ['Cocoon', 'Kutieskin', 'Senka', 'Lemonade', 'Fresh'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '18 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-media-dat',
    staffCode: 'HN305',
    name: 'Phan Thành Đạt',
    email: 'datpt@upbase.vn',
    avatar: 'PĐ',
    role: 'MEDIA_MEMBER',
    roleTitle: 'Chuyên Viên Quảng Cáo & Ads (Media PIC)',
    department: 'Media TikTok',
    team: 'Media TikTok',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MEDIA',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-media-manager-quang',
    managerName: 'Nguyễn Đức Quảng',
    position: 'Media Specialist',
    picBrands: ['Cocoon', 'Kutieskin', 'Senka', 'Lemonade', 'Fresh'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '22 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-ha-linh',
    staffCode: 'HN140',
    name: 'Đặng Mai Hà Linh',
    email: 'halinh@upbase.vn',
    avatar: 'HL',
    role: 'BRAND_MEMBER',
    roleTitle: 'Brand Strategy & Campaign PIC',
    department: 'Phòng Marketing B2C',
    team: 'Brand',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Senior Brand PIC',
    picBrands: ['Kutieskin', 'Royal Ausnz'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '1 giờ trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-viet-hoang',
    staffCode: 'HN148',
    name: 'Việt Hoàng',
    email: 'viethoang@upbase.vn',
    avatar: 'VH',
    role: 'LEADER',
    roleTitle: 'Trưởng Nhóm Partnership & Self-Channel (Quản lý CTV & Team Content)',
    department: 'Phòng Marketing B2C',
    team: 'Partnership & Self-Channel',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Partnership & Self-Channel Leader',
    picBrands: ['Kutieskin', 'pHCare', 'Royal Ausnz', 'Mega Uri', 'Senka'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: true,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: true
    },
    status: 'ACTIVE',
    lastActive: '5 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-quynh-nhu',
    staffCode: 'HN152',
    name: 'Quỳnh Như',
    email: 'quynhnhu@upbase.vn',
    avatar: 'QN',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Mẹ & Bé, Sức Khỏe)',
    department: 'Phòng Marketing B2C',
    team: 'Content Self-Channel',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    position: 'Content Specialist',
    picBrands: ['Kutieskin', 'Royal Ausnz', 'Mega Uri'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 11:20',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-mai-anh-content',
    staffCode: 'HN156',
    name: 'Nguyễn Thị Mai Anh',
    email: 'maianhnt@upbase.vn',
    avatar: 'MA',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Skincare & Chăm Sóc Cá Nhân)',
    department: 'Phòng Marketing B2C',
    team: 'Content Self-Channel',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    position: 'Content Specialist',
    picBrands: ['pHCare', 'Senka'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 10:45',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-hoai-lam-content',
    staffCode: 'HN160',
    name: 'Vũ Hoài Lâm',
    email: 'hoailam@upbase.vn',
    avatar: 'HL',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content Self-Channel (Kịch Bản & Hậu Kỳ)',
    department: 'Phòng Marketing B2C',
    team: 'Content Self-Channel',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-viet-hoang',
    managerName: 'Việt Hoàng',
    position: 'Content Specialist',
    picBrands: ['Kutieskin', 'Senka', 'Royal Ausnz'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 09:30',
    authMethod: 'LARK_SSO'
  }
];

// =========================================================================
// 3B. QUY TẮC CẤP QUYỀN TRUY CẬP THEO PHÒNG BAN & LỌC DANH BẠ 1.011 NHÂN SỰ
// =========================================================================
export const INITIAL_DEPARTMENT_ACCESS_RULES: DepartmentAccessRule[] = [
  {
    id: 'rule-mkt-booking',
    departmentOrTeamName: 'Booking / Sub-Booking / Marketing B2C',
    mappedScope: 'MARKETING_B2C',
    defaultRole: 'BOOKING_MEMBER',
    defaultManagerName: 'Đặng Thị Yến Nhi',
    autoAllowLogin: true,
    staffCount: 118,
    allowedCount: 118,
    description: 'Nhân sự phòng Booking KOC, Sub-Booking và Marketing B2C (HN & HCM) trực tiếp vận hành chiến dịch.'
  },
  {
    id: 'rule-mkt-content-brand',
    departmentOrTeamName: 'Content / Brand / Branding',
    mappedScope: 'MARKETING_B2C',
    defaultRole: 'CONTENT_MEMBER',
    defaultManagerName: 'Đặng Thị Yến Nhi',
    autoAllowLogin: true,
    staffCount: 12,
    allowedCount: 12,
    description: 'Nhân sự kịch bản sáng tạo (Content) và quản trị nhãn hàng (Brand PIC) phối hợp cùng Booking.'
  },
  {
    id: 'rule-growth-all',
    departmentOrTeamName: 'Growth 1, Growth 2, Growth 3, Growth 6, Growth (HCM)',
    mappedScope: 'GROWTH',
    defaultRole: 'GROWTH_MEMBER',
    defaultManagerName: 'Trần Thị Đỗ Quyên',
    autoAllowLogin: true,
    staffCount: 136,
    allowedCount: 136,
    description: 'Nhân sự khối Growth Ecom lập Input Plan tháng (File 4.1), giao chỉ tiêu GMV & ngân sách Order Net/Gross.'
  },
  {
    id: 'rule-media-all',
    departmentOrTeamName: 'Media Omni / Media TikTok',
    mappedScope: 'MEDIA',
    defaultRole: 'MEDIA_MEMBER',
    defaultManagerName: 'Nguyễn Đức Quảng',
    autoAllowLogin: true,
    staffCount: 30,
    allowedCount: 30,
    description: 'Nhân sự khối Media & Ads nhận mã Spark Ads, phân bổ ngân sách quảng cáo và cập nhật báo cáo ROAS tuần.'
  },
  {
    id: 'rule-blocked-fulfillment',
    departmentOrTeamName: 'Fulfillment / Kho vận (HN & HCM)',
    mappedScope: 'OTHER_BLOCKED',
    defaultRole: 'MEMBER',
    defaultManagerName: 'Không thuộc phạm vi B2C',
    autoAllowLogin: false,
    staffCount: 207,
    allowedCount: 0,
    description: 'Nhân sự đóng gói & vận hành kho Fulfillment — Chặn đăng nhập hệ thống B2C mặc định.'
  },
  {
    id: 'rule-blocked-livestream',
    departmentOrTeamName: 'Livestream / Host CTV (HN & HCM)',
    mappedScope: 'OTHER_BLOCKED',
    defaultRole: 'MEMBER',
    defaultManagerName: 'Không thuộc phạm vi B2C',
    autoAllowLogin: false,
    staffCount: 235,
    allowedCount: 0,
    description: 'Host livestream và ekip phòng live độc lập — Chặn đăng nhập hệ thống Booking B2C trừ khi Admin cấp quyền lẻ.'
  },
  {
    id: 'rule-blocked-backoffice',
    departmentOrTeamName: 'Kế toán / Tài chính / HCNS / Tuyển dụng / L&D / C&B',
    mappedScope: 'OTHER_BLOCKED',
    defaultRole: 'MEMBER',
    defaultManagerName: 'Không thuộc phạm vi B2C',
    autoAllowLogin: false,
    staffCount: 52,
    allowedCount: 0,
    description: 'Khối Hành chính - Nhân sự - Kế toán nội bộ — Không truy cập hệ thống tác nghiệp Marketing/Growth/Media.'
  },
  {
    id: 'rule-blocked-other-units',
    departmentOrTeamName: 'Account B2B / Marketing B2B / Tech / Design / MCN / CX / UT',
    mappedScope: 'OTHER_BLOCKED',
    defaultRole: 'MEMBER',
    defaultManagerName: 'Không thuộc phạm vi B2C',
    autoAllowLogin: false,
    staffCount: 221,
    allowedCount: 2,
    description: 'Các phòng ban dự án khác ngoài 3 khối Marketing B2C, Growth, Media — Mặc định khóa cổng đăng nhập.'
  }
];

export interface StaffAccessOverrideItem {
  staffId: string;
  canLogin: boolean;
  departmentScope: SystemDepartmentScope;
  role: UserRole;
  managerName: string;
  updatedBy?: string;
  updatedAt?: string;
}

export const STAFF_ACCESS_OVERRIDES_STORAGE_KEY = 'upbase_b2c_staff_access_overrides_v1';
export const DEPT_ACCESS_RULES_STORAGE_KEY = 'upbase_b2c_dept_access_rules_v1';

export function getSavedStaffAccessOverrides(): Record<string, StaffAccessOverrideItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STAFF_ACCESS_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStaffAccessOverrides(overrides: Record<string, StaffAccessOverrideItem>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STAFF_ACCESS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Failed to save staff access overrides:', e);
  }
}

export function getSavedDeptAccessRules(
  fallback: DepartmentAccessRule[] = INITIAL_DEPARTMENT_ACCESS_RULES
): DepartmentAccessRule[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(DEPT_ACCESS_RULES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveDeptAccessRules(rules: DepartmentAccessRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEPT_ACCESS_RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to save dept access rules:', e);
  }
}

export type ClassifiedStaffMasterMember = Omit<StaffMasterMember, 'role'> & {
  departmentScope: SystemDepartmentScope;
  classifiedScope: SystemDepartmentScope;
  canLogin: boolean;
  role: UserRole;
  mappedRole: UserRole;
  roleTitle: string;
  managerName: string;
  ruleId: string;
  accessSource: 'ADMIN_EXPLICIT' | 'DEPT_RULE' | 'BLOCKED_DEPT' | 'REVOKED';
  reason: string;
};

/**
 * Thuật toán phân loại nhân viên từ Danh bạ tổng 1.011 nhân sự (UPBASE_STAFF_MASTER)
 * Xác định nhân viên thuộc khối nào (MARKETING_B2C | GROWTH | MEDIA | OTHER_BLOCKED),
 * có được phép đăng nhập (canLogin) hay không, giữ Role nào và thuộc quyền Trưởng phòng nào.
 */
export function classifyMasterStaffMember(
  staff: StaffMasterMember,
  deptRules: DepartmentAccessRule[] = INITIAL_DEPARTMENT_ACCESS_RULES,
  overrides: Record<string, StaffAccessOverrideItem> = {}
): ClassifiedStaffMasterMember {
  // 1. Kiểm tra nếu Admin đã cấu hình trực tiếp (Override) cho nhân viên này
  const override = overrides[staff.id] || (staff.staffCode ? overrides[staff.staffCode] : undefined) || overrides[staff.email.toLowerCase()];
  if (override) {
    return {
      ...staff,
      departmentScope: override.departmentScope,
      classifiedScope: override.departmentScope,
      canLogin: override.canLogin,
      role: override.role,
      mappedRole: override.role,
      roleTitle: staff.position || staff.roleTitle || 'Nhân sự được Admin phân quyền',
      managerName: override.managerName || (
        override.departmentScope === 'GROWTH' ? 'Trần Thị Đỗ Quyên' :
        override.departmentScope === 'MEDIA' ? 'Nguyễn Đức Quảng' :
        override.departmentScope === 'MARKETING_B2C' ? 'Đặng Thị Yến Nhi' : 'Chưa gán'
      ),
      ruleId: 'explicit-override',
      accessSource: override.canLogin ? 'ADMIN_EXPLICIT' : 'REVOKED',
      reason: override.canLogin
        ? `Được Admin cấp quyền trực tiếp vào khối ${override.departmentScope}`
        : `Đã bị Admin thu hồi / khóa quyền đăng nhập hệ thống`
    };
  }

  const dept = (staff.department || '').trim();
  const team = (staff.team || '').trim();
  const pos = (staff.position || staff.roleTitle || '').trim();
  const combined = `${dept} ${team} ${pos}`.toLowerCase();
  const isLeaderOrHead = /trưởng phòng|head|manager|leader|lead/i.test(pos);

  // 2. Nhận diện Khối MEDIA (Media Omni, Media TikTok...)
  if (
    combined.includes('media omni') ||
    combined.includes('media tiktok') ||
    /\bmedia\b/i.test(dept) ||
    /\bmedia\b/i.test(team)
  ) {
    const rule = deptRules.find(r => r.id === 'rule-media-all');
    const autoAllow = rule ? rule.autoAllowLogin : true;
    const role: UserRole = isLeaderOrHead ? 'MEDIA_MANAGER' : 'MEDIA_MEMBER';
    return {
      ...staff,
      departmentScope: 'MEDIA',
      classifiedScope: 'MEDIA',
      canLogin: autoAllow,
      role,
      mappedRole: role,
      roleTitle: pos || (role === 'MEDIA_MANAGER' ? 'Trưởng Phòng Media' : 'Chuyên Viên Media'),
      managerName: role === 'MEDIA_MANAGER' ? 'Ban Giám Đốc (BOD)' : (rule?.defaultManagerName || 'Nguyễn Đức Quảng'),
      ruleId: 'rule-media-all',
      accessSource: autoAllow ? 'DEPT_RULE' : 'BLOCKED_DEPT',
      reason: autoAllow
        ? 'Thuộc khối Media (Media Omni / TikTok) — Được phép đăng nhập'
        : 'Khối Media đang tạm khóa đăng nhập theo quy tắc phòng ban'
    };
  }

  // 3. Nhận diện Khối GROWTH (Growth 1, 2, 3, 6, Growth HCM, Sub-Growth...)
  if (
    combined.includes('growth') ||
    staff.role === 'GROWTH'
  ) {
    const rule = deptRules.find(r => r.id === 'rule-growth-all');
    const autoAllow = rule ? rule.autoAllowLogin : true;
    const role: UserRole = isLeaderOrHead ? 'GROWTH_MANAGER' : 'GROWTH_MEMBER';
    return {
      ...staff,
      departmentScope: 'GROWTH',
      classifiedScope: 'GROWTH',
      canLogin: autoAllow,
      role,
      mappedRole: role,
      roleTitle: pos || (role === 'GROWTH_MANAGER' ? 'Trưởng Phòng Growth' : 'Chuyên Viên Growth'),
      managerName: role === 'GROWTH_MANAGER' ? 'Ban Giám Đốc (BOD)' : (rule?.defaultManagerName || 'Trần Thị Đỗ Quyên'),
      ruleId: 'rule-growth-all',
      accessSource: autoAllow ? 'DEPT_RULE' : 'BLOCKED_DEPT',
      reason: autoAllow
        ? 'Thuộc khối Growth Ecom — Được phép đăng nhập'
        : 'Khối Growth đang tạm khóa đăng nhập theo quy tắc phòng ban'
    };
  }

  // 4. Nhận diện Khối MARKETING B2C (Booking, Sub-Booking, Marketing B2C, Content, Brand - loại trừ Livestream & B2B)
  const isLivestreamOnly = /livestream/i.test(team) || /livestream/i.test(dept) || /ctv livestream|host livestream/i.test(pos);
  const isMarketingB2B = /marketing b2b/i.test(combined);

  if (!isLivestreamOnly && !isMarketingB2B) {
    if (
      /booking|sub-booking|marketing b2c/i.test(dept) ||
      /booking|sub-booking|marketing b2c/i.test(team)
    ) {
      const rule = deptRules.find(r => r.id === 'rule-mkt-booking');
      const autoAllow = rule ? rule.autoAllowLogin : true;
      const role: UserRole = /trưởng phòng/i.test(pos) ? 'MANAGER' : isLeaderOrHead ? 'LEADER' : 'BOOKING_MEMBER';
      return {
        ...staff,
        departmentScope: 'MARKETING_B2C',
        classifiedScope: 'MARKETING_B2C',
        canLogin: autoAllow,
        role,
        mappedRole: role,
        roleTitle: pos || 'Chuyên Viên Booking B2C',
        managerName: role === 'MANAGER' ? 'Ban Giám Đốc (BOD)' : (rule?.defaultManagerName || 'Đặng Thị Yến Nhi'),
        ruleId: 'rule-mkt-booking',
        accessSource: autoAllow ? 'DEPT_RULE' : 'BLOCKED_DEPT',
        reason: autoAllow
          ? 'Thuộc phòng Booking / Marketing B2C — Được phép đăng nhập'
          : 'Phòng Booking B2C đang tạm khóa đăng nhập'
      };
    }

    if (
      /\b(content|brand|branding)\b/i.test(dept) ||
      /\b(content|brand|branding)\b/i.test(team)
    ) {
      const rule = deptRules.find(r => r.id === 'rule-mkt-content-brand');
      const autoAllow = rule ? rule.autoAllowLogin : true;
      const isBrand = /\b(brand|branding)\b/i.test(`${dept} ${team}`);
      const role: UserRole = isLeaderOrHead ? 'LEADER' : isBrand ? 'BRAND_MEMBER' : 'CONTENT_MEMBER';
      return {
        ...staff,
        departmentScope: 'MARKETING_B2C',
        classifiedScope: 'MARKETING_B2C',
        canLogin: autoAllow,
        role,
        mappedRole: role,
        roleTitle: pos || (isBrand ? 'Chuyên Viên Brand' : 'Chuyên Viên Content'),
        managerName: rule?.defaultManagerName || 'Đặng Thị Yến Nhi',
        ruleId: 'rule-mkt-content-brand',
        accessSource: autoAllow ? 'DEPT_RULE' : 'BLOCKED_DEPT',
        reason: autoAllow
          ? 'Thuộc bộ phận Content / Brand B2C — Được phép đăng nhập'
          : 'Bộ phận Content / Brand đang tạm khóa đăng nhập'
      };
    }
  }

  // 5. Nhận diện BOD / Admin
  if (/\bbod\b/i.test(dept) || /\bbod\b/i.test(team)) {
    return {
      ...staff,
      departmentScope: 'MARKETING_B2C',
      classifiedScope: 'MARKETING_B2C',
      canLogin: true,
      role: 'ADMIN',
      mappedRole: 'ADMIN',
      roleTitle: pos || 'Ban Giám Đốc (BOD)',
      managerName: 'Hội đồng Quản trị',
      ruleId: 'rule-bod',
      accessSource: 'ADMIN_EXPLICIT',
      reason: 'Thành viên Ban Giám Đốc (BOD) — Toàn quyền truy cập'
    };
  }

  // 6. Toàn bộ các phòng ban khác (Fulfillment, Livestream, Kế toán, HCNS, Tech, Account B2B, MCN...) -> CHẶN MẶC ĐỊNH
  let ruleId = 'rule-blocked-other-units';
  if (/fulfillment/i.test(combined)) ruleId = 'rule-blocked-fulfillment';
  else if (isLivestreamOnly) ruleId = 'rule-blocked-livestream';
  else if (/kế toán|tài chính|hcns|tuyển dụng|l&d|c&b/i.test(combined)) ruleId = 'rule-blocked-backoffice';

  const matchedBlockedRule = deptRules.find(r => r.id === ruleId);
  const allowFromBlockedRule = matchedBlockedRule ? matchedBlockedRule.autoAllowLogin : false;

  return {
    ...staff,
    departmentScope: 'OTHER_BLOCKED',
    classifiedScope: 'OTHER_BLOCKED',
    canLogin: allowFromBlockedRule,
    role: 'MEMBER',
    mappedRole: 'MEMBER',
    roleTitle: pos || 'Nhân sự phòng ban khác',
    managerName: 'Ngoài phạm vi B2C',
    ruleId,
    accessSource: allowFromBlockedRule ? 'DEPT_RULE' : 'BLOCKED_DEPT',
    reason: `Thuộc phòng ban "${dept || team || 'Khác'}" ngoài 3 khối Marketing B2C, Growth, Media — Chặn đăng nhập mặc định`
  };
}

// =========================================================================
// 4. LỊCH SỬ KIỂM TOÁN BẢO MẬT & NHẬT KÝ PHIÊN (AUDIT LOGS)
// =========================================================================
export const INITIAL_RBAC_AUDIT_LOGS: RbacAuditLogItem[] = [
  {
    id: 'log-000',
    timestamp: '2026-10-14 00:15:10',
    actorName: 'Hệ Thống Cổng Bảo Mật (Access Gatekeeper)',
    actorEmail: 'security@upbase.vn',
    actorRole: 'ADMIN',
    actionType: 'LOGIN_BLOCKED',
    targetUserOrEntity: 'staff_hn782@upbase.vn (Dương Quỳnh Anh - Team Livestream)',
    description: 'Chặn đăng nhập tự động: Nhân sự thuộc bộ phận Livestream, không nằm trong 3 khối Marketing B2C, Growth, Media được Admin cấp quyền.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'WARNING'
  },
  {
    id: 'log-001',
    timestamp: '2026-10-08 23:48:12',
    actorName: 'Đặng Thị Yến Nhi',
    actorEmail: 'yennhi@upbase.vn',
    actorRole: 'MANAGER',
    actionType: 'IMPERSONATE',
    targetUserOrEntity: 'brand.kutieskin@gmail.com (Kutieskin)',
    description: 'Kích hoạt chế độ Xem thử (Impersonate) góc nhìn đối tác Brand Kutieskin để kiểm tra phân quyền gian hàng.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  },
  {
    id: 'log-002',
    timestamp: '2026-10-08 23:40:05',
    actorName: 'Đỗ Văn Giang',
    actorEmail: 'giangdv@upbase.vn',
    actorRole: 'ADMIN',
    actionType: 'DEPT_RULE_UPDATE',
    targetUserOrEntity: 'Khối Growth (Trần Thị Đỗ Quyên) & Khối Media (Nguyễn Đức Quảng)',
    description: 'Kích hoạt cổng đăng nhập cho 3 khối Marketing B2C, Growth, Media và bổ nhiệm Trưởng phòng quản lý quân số từng khối.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / macOS',
    status: 'SUCCESS'
  },
  {
    id: 'log-003',
    timestamp: '2026-10-08 22:15:30',
    actorName: 'Trần Thị Đỗ Quyên',
    actorEmail: 'quyenttd@upbase.vn',
    actorRole: 'GROWTH_MANAGER',
    actionType: 'ROLE_CHANGE',
    targetUserOrEntity: 'Trần Thị Ánh (anhtt@upbase.vn - Growth 1)',
    description: 'Trưởng phòng Growth phân công phụ trách lập Input Plan tháng cho cụm nhãn Kutieskin, Cocoon, Senka.',
    ipAddress: '14.162.24.11',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  },
  {
    id: 'log-004',
    timestamp: '2026-10-08 21:04:19',
    actorName: 'Nguyễn Đức Quảng',
    actorEmail: 'quangnd@upbase.vn',
    actorRole: 'MEDIA_MANAGER',
    actionType: 'ROLE_CHANGE',
    targetUserOrEntity: 'Phan Thành Đạt (datpt@upbase.vn - Media TikTok)',
    description: 'Trưởng phòng Media phân công tiếp nhận mã Spark Ads và quản lý ngân sách Ads tuần cho 5 gian hàng trọng điểm.',
    ipAddress: '171.244.38.102',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  },
  {
    id: 'log-005',
    timestamp: '2026-10-08 19:30:45',
    actorName: 'Nguyễn Thị Ngọc Tâm',
    actorEmail: 'ngoctam@upbase.vn',
    actorRole: 'LEADER',
    actionType: 'PERMISSION_TOGGLE',
    targetUserOrEntity: 'Kịch bản Video Deal #BK-8820',
    description: 'Phê duyệt kịch bản video sơ bộ góc Problem-Solution cho KOC Rejuran Review.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  }
];

// =========================================================================
// 5. HELPER FORMATTERS CHO UI
// =========================================================================
export const PERMISSION_BADGE_CONFIG: Record<PermissionAccessLevel, { label: string; shortLabel: string; bg: string; text: string; border: string; description: string }> = {
  ALL: {
    label: 'ALL (Toàn quyền)',
    shortLabel: 'ALL',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700 font-bold',
    border: 'border-emerald-200',
    description: 'Toàn quyền tạo, sửa, xóa, duyệt không giới hạn phạm vi.'
  },
  SCOPED: {
    label: 'SCOPED (Theo phân công)',
    shortLabel: 'SCOPED',
    bg: 'bg-blue-50',
    text: 'text-blue-700 font-bold',
    border: 'border-blue-200',
    description: 'Chỉ được thao tác trên Phòng ban / Brand / Store được giao phụ trách.'
  },
  VIEW: {
    label: 'VIEW (Chỉ xem)',
    shortLabel: 'VIEW',
    bg: 'bg-amber-50',
    text: 'text-amber-700 font-bold',
    border: 'border-amber-200',
    description: 'Chỉ có quyền xem thông tin, không được tạo, sửa hoặc xóa.'
  },
  APPROVE: {
    label: 'APPROVE (Phê duyệt)',
    shortLabel: 'APPROVE',
    bg: 'bg-purple-50',
    text: 'text-purple-700 font-bold',
    border: 'border-purple-200',
    description: 'Có thẩm quyền ký duyệt chính sách, duyệt deal, duyệt tiền, duyệt kịch bản.'
  },
  DENIED: {
    label: 'DENIED (Cấm truy cập)',
    shortLabel: 'DENIED',
    bg: 'bg-slate-50',
    text: 'text-slate-400 font-medium',
    border: 'border-slate-200',
    description: 'Bị ẩn hoàn toàn, không có quyền truy cập tính năng này.'
  }
};

// =========================================================================
// 6. PHÂN QUYỀN MÀN HÌNH & ĐIỀU HƯỚNG THEO VAI TRÒ (SCREEN RBAC PERMISSIONS)
// =========================================================================

export const ROLE_ALLOWED_TABS: Record<UserRole, TabKey[]> = {
  ADMIN: [
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'input-plan',
    'koc-listing',
    'self-channel-hub',
    'master-data',
    'push-products',
    'stores',
    'campaigns',
    'brand-knowledge',
    'content',
    'content-angles',
    'partner-access',
    'booking',
    'koc-master',
    'ctv-master',
    'contracts',
    'manager',
    'sample-tracker',
    'performance-p3',
    'leaderboard',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'knowledge-qa'
  ],
  MANAGER: [
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'input-plan',
    'koc-listing',
    'self-channel-hub',
    'master-data',
    'push-products',
    'stores',
    'campaigns',
    'brand-knowledge',
    'content',
    'content-angles',
    'partner-access',
    'booking',
    'koc-master',
    'ctv-master',
    'contracts',
    'manager',
    'sample-tracker',
    'performance-p3',
    'leaderboard',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'knowledge-qa'
  ],
  GROWTH_MANAGER: [
    'cockpit',
    'manager',
    'input-plan',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'stores',
    'campaigns',
    'brand-knowledge',
    'push-products',
    'ads-report',
    'performance-p3',
    'master-data',
    'partner-access',
    'api-settings',
    'knowledge-qa'
  ],
  MEDIA_MANAGER: [
    'cockpit',
    'manager',
    'input-plan',
    'ads-report',
    'sample-tracker',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'stores',
    'campaigns',
    'brand-knowledge',
    'performance-p3',
    'master-data',
    'partner-access',
    'api-settings',
    'knowledge-qa'
  ],
  LEADER: [
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'ads-report',
    'performance-p3',
    'manager',
    'input-plan',
    'koc-listing',
    'self-channel-hub',
    'push-products',
    'stores',
    'booking',
    'koc-master',
    'ctv-master',
    'content',
    'content-angles',
    'campaigns',
    'contracts',
    'sample-tracker',
    'master-data',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa'
  ],
  BOOKING_MEMBER: [
    'cockpit',
    'dashboard-bi',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'booking',
    'koc-listing',
    'koc-master',
    'ctv-master',
    'input-plan',
    'stores',
    'contracts',
    'sample-tracker',
    'push-products',
    'performance-p3',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa'
  ],
  CONTENT_MEMBER: [
    'cockpit',
    'dashboard-bi',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'content',
    'content-angles',
    'self-channel-hub',
    'ctv-master',
    'campaigns',
    'brand-knowledge',
    'sample-tracker',
    'push-products',
    'performance-p3',
    'api-settings',
    'knowledge-qa'
  ],
  BRAND_MEMBER: [
    'cockpit',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'campaigns',
    'push-products',
    'brand-knowledge',
    'koc-listing',
    'content',
    'input-plan',
    'ads-report',
    'overview',
    'sample-tracker',
    'performance-p3',
    'api-settings',
    'knowledge-qa'
  ],
  MEMBER: [
    'cockpit',
    'dashboard-bi',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'booking',
    'koc-listing',
    'koc-master',
    'ctv-master',
    'stores',
    'content',
    'input-plan',
    'sample-tracker',
    'push-products',
    'performance-p3',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa'
  ],
  GROWTH_MEMBER: [
    'input-plan',
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'stores',
    'campaigns',
    'performance-p3',
    'ads-report',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa'
  ],
  MEDIA_MEMBER: [
    'input-plan',
    'ads-report',
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-team-sla',
    'dashboard-staff',
    'campaigns',
    'performance-p3',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa'
  ],
  BRAND_PARTNER: [
    'brand-hub',
    'koc-listing',
    'push-products',
    'content'
  ],
  KOC_PARTNER: [
    'koc-hub'
  ],
  CTV_PARTNER: [
    'self-channel-hub'
  ]
};

export const ROLE_DEFAULT_LANDING: Record<UserRole, TabKey> = {
  ADMIN: 'partner-access',
  MANAGER: 'cockpit',
  GROWTH_MANAGER: 'manager',
  MEDIA_MANAGER: 'manager',
  LEADER: 'cockpit',
  BOOKING_MEMBER: 'booking',
  CONTENT_MEMBER: 'content',
  BRAND_MEMBER: 'campaigns',
  GROWTH_MEMBER: 'input-plan',
  MEDIA_MEMBER: 'input-plan',
  MEMBER: 'cockpit',
  BRAND_PARTNER: 'brand-hub',
  KOC_PARTNER: 'koc-hub',
  CTV_PARTNER: 'self-channel-hub'
};

export function isTabAllowedForRole(role: UserRole, tab: TabKey): boolean {
  const allowed = ROLE_ALLOWED_TABS[role];
  if (!allowed) return false;
  return allowed.includes(tab);
}

export function getAllowedTabsForRole(role: UserRole): TabKey[] {
  return ROLE_ALLOWED_TABS[role] || ['cockpit'];
}

export function getDefaultLandingTabForRole(role: UserRole): TabKey {
  return ROLE_DEFAULT_LANDING[role] || 'cockpit';
}

export const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  ADMIN: 'Quản trị hệ thống',
  MANAGER: 'Trưởng phòng MKT B2C',
  GROWTH_MANAGER: 'Trưởng phòng Growth',
  MEDIA_MANAGER: 'Trưởng phòng Media',
  LEADER: 'Trưởng nhóm B2C',
  BOOKING_MEMBER: 'Chuyên viên Booking',
  CONTENT_MEMBER: 'Chuyên viên Content',
  BRAND_MEMBER: 'Chuyên viên Brand',
  GROWTH_MEMBER: 'Chuyên viên Growth',
  MEDIA_MEMBER: 'Chuyên viên Media',
  MEMBER: 'Chuyên viên thực thi',
  BRAND_PARTNER: 'Đại diện thương hiệu',
  KOC_PARTNER: 'Đối tác KOC / Creator',
  CTV_PARTNER: 'Cộng tác viên Self-channel',
};
