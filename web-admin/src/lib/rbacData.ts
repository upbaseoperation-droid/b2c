import { 
  UserRole, 
  PermissionAccessLevel, 
  PermissionMatrixItem, 
  InternalStaffRbacMember, 
  RbacAuditLogItem 
} from './types';

// =========================================================================
// 1. ROLE DEFINITIONS (ĐỊNH NGHĨA 7 VAI TRÒ HỆ THỐNG)
// =========================================================================
export interface RoleDefinition {
  id: UserRole;
  code: string;
  name: string;
  scopeType: 'INTERNAL' | 'EXTERNAL';
  badgeColor: string;
  description: string;
  defaultLandingTab: string;
  userCount: number;
}

export const RBAC_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'ADMIN',
    code: 'BOD_ADMIN',
    name: 'Ban Giám Đốc (BOD / Admin)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Toàn quyền điều hành toàn hệ thống, phê duyệt ngân sách tổng, xem P&L và Master Data.',
    defaultLandingTab: 'dashboard-bi',
    userCount: 2
  },
  {
    id: 'MANAGER',
    code: 'OPERATIONS_HEAD',
    name: 'Trưởng Phòng Vận Hành (Manager)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Quản lý toàn bộ chiến dịch các nhãn, phân bổ tải PIC, duyệt kế hoạch tháng, duyệt hạn mức Khung Lương & P3.',
    defaultLandingTab: 'cockpit',
    userCount: 3
  },
  {
    id: 'LEADER',
    code: 'PIC_LEAD',
    name: 'Trưởng Nhóm / PIC Lead (Leader)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Phụ trách cụm Brand/Store, duyệt ứng viên KOC/Deal bước 1, duyệt kịch bản sơ bộ, theo dõi tiến độ lên bài.',
    defaultLandingTab: 'booking',
    userCount: 6
  },
  {
    id: 'MEMBER',
    code: 'SPECIALIST',
    name: 'Chuyên Viên Vận Hành (Member)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Tác nghiệp trực tiếp trên Brand được giao (Scoping): tạo deal, liên hệ KOC, soạn kịch bản, đôn đốc gửi mẫu & nghiệm thu.',
    defaultLandingTab: 'cockpit',
    userCount: 18
  },
  {
    id: 'BRAND_PARTNER',
    code: 'BRAND_GMAIL',
    name: 'Đại Diện Thương Hiệu (Brand Partner)',
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
export const INITIAL_PERMISSION_MATRIX: PermissionMatrixItem[] = [
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

// =========================================================================
// 3. DANH SÁCH NHÂN SỰ NỘI BỘ UPBASE (LARK SSO RBAC)
// =========================================================================
export const INITIAL_INTERNAL_STAFF_RBAC: InternalStaffRbacMember[] = [
  {
    id: 'user-van-ngoc',
    name: 'Vân Ngọc',
    email: 'vanngoc@upbase.vn',
    avatar: 'VN',
    role: 'MANAGER',
    roleTitle: 'Operations & Division Head',
    department: 'Khối Vận Hành B2C',
    position: 'Trưởng Phòng Vận Hành',
    picBrands: ['Kutieskin', 'La Roche-Posay', 'Royal Ausnz', 'Mega Uri', 'CeraVe'],
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
    id: 'user-tuan-anh',
    name: 'Nguyễn Tuấn Anh',
    email: 'tuananh@upbase.vn',
    avatar: 'TA',
    role: 'LEADER',
    roleTitle: 'Booking Lead & Cluster PIC',
    department: 'Phòng Vận Hành B2C',
    position: 'Trưởng Nhóm Booking',
    picBrands: ['Kutieskin', 'Mega Uri', 'Royal Ausnz'],
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
    id: 'user-ngoc-diep',
    name: 'Lê Ngọc Diệp',
    email: 'ngocdiep@upbase.vn',
    avatar: 'ND',
    role: 'LEADER',
    roleTitle: 'Creative & Content Script Lead',
    department: 'Phòng Sáng Tạo Nội Dung',
    position: 'Trưởng Nhóm Content',
    picBrands: ['Kutieskin', 'La Roche-Posay'],
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
    id: 'user-ha-linh',
    name: 'Đặng Mai Hà Linh',
    email: 'halinh@upbase.vn',
    avatar: 'HL',
    role: 'BRAND_MEMBER',
    roleTitle: 'Brand Strategy & Campaign Lead',
    department: 'Phòng Chiến Dịch Thương Hiệu',
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
    id: 'user-khanh-vy',
    name: 'Hoàng Khánh Vy',
    email: 'khanhvy@upbase.vn',
    avatar: 'KV',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Senior Booking Specialist',
    department: 'Phòng Vận Hành B2C',
    position: 'Chuyên Viên Booking',
    picBrands: ['Kutieskin'],
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
    id: 'user-thu-trang',
    name: 'Nguyễn Thu Trang',
    email: 'thutrang@upbase.vn',
    avatar: 'TT',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Booking Specialist (Micro/Sàn)',
    department: 'Phòng Vận Hành B2C',
    position: 'Chuyên Viên Booking',
    picBrands: ['La Roche-Posay'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 09:45',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-minh-duc',
    name: 'Trần Minh Đức',
    email: 'minhduc@upbase.vn',
    avatar: 'MD',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Live & Creator Specialist',
    department: 'Phòng Vận Hành B2C',
    position: 'Chuyên Viên Booking',
    picBrands: ['Mega Uri'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm qua',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-trong-chinh',
    name: 'Nguyễn Trọng Chỉnh',
    email: 'chinhnt@upbase.vn',
    avatar: 'NC',
    role: 'ADMIN',
    roleTitle: 'Board of Directors (BOD / Quản trị)',
    department: 'Ban Giám Đốc',
    position: 'Super Admin',
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
  }
];

// =========================================================================
// 4. LỊCH SỬ KIỂM TOÁN BẢO MẬT & NHẬT KÝ PHIÊN (AUDIT LOGS)
// =========================================================================
export const INITIAL_RBAC_AUDIT_LOGS: RbacAuditLogItem[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-08 23:48:12',
    actorName: 'Vân Ngọc',
    actorEmail: 'vanngoc@upbase.vn',
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
    actorName: 'Nguyễn Trọng Chỉnh',
    actorEmail: 'chinhnt@upbase.vn',
    actorRole: 'ADMIN',
    actionType: 'INVITE_PARTNER',
    targetUserOrEntity: 'chloe.creator.vn@gmail.com',
    description: 'Cấp quyền truy cập Gmail SSO mới cho KOC Chloe Nguyễn (Tier 1 Celeb) với quyền nhận mẫu và nộp Spark Ads.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / macOS',
    status: 'SUCCESS'
  },
  {
    id: 'log-003',
    timestamp: '2026-10-08 22:15:30',
    actorName: 'Vân Ngọc',
    actorEmail: 'vanngoc@upbase.vn',
    actorRole: 'MANAGER',
    actionType: 'ROLE_CHANGE',
    targetUserOrEntity: 'Hoàng Khánh Vy (khanhvy@upbase.vn)',
    description: 'Cập nhật phân công phụ trách (PIC) nhãn Kutieskin Mama & Baby cho chuyên viên Khánh Vy.',
    ipAddress: '14.162.24.11',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  },
  {
    id: 'log-004',
    timestamp: '2026-10-08 21:04:19',
    actorName: 'Chloe Nguyễn',
    actorEmail: 'chloe.creator.vn@gmail.com',
    actorRole: 'KOC_PARTNER',
    actionType: 'LOGIN',
    targetUserOrEntity: 'KOC Hub (Job #BK-8821)',
    description: 'Đăng nhập thành công qua Google OAuth SSO. Điều hướng vào KOC Hub.',
    ipAddress: '171.244.38.102',
    deviceInfo: 'Safari 17 / iOS 17.5',
    status: 'SUCCESS'
  },
  {
    id: 'log-005',
    timestamp: '2026-10-08 19:30:45',
    actorName: 'Nguyễn Tuấn Anh',
    actorEmail: 'tuananh@upbase.vn',
    actorRole: 'LEADER',
    actionType: 'PERMISSION_TOGGLE',
    targetUserOrEntity: 'Kịch bản Video Deal #BK-8820',
    description: 'Phê duyệt kịch bản video sơ bộ góc Problem-Solution cho KOC Mega Uri Review.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / Windows 11',
    status: 'SUCCESS'
  },
  {
    id: 'log-006',
    timestamp: '2026-10-08 17:12:00',
    actorName: 'brand.kutieskin@gmail.com',
    actorEmail: 'brand.kutieskin@gmail.com',
    actorRole: 'BRAND_PARTNER',
    actionType: 'LOGIN',
    targetUserOrEntity: 'Brand Hub (Kutieskin Mama & Baby)',
    description: 'Đăng nhập thành công qua Gmail SSO. Hệ thống tự động giới hạn chỉ hiển thị 2 gian hàng được cấp quyền.',
    ipAddress: '113.190.23.88',
    deviceInfo: 'Edge 126 / Windows 10',
    status: 'SUCCESS'
  },
  {
    id: 'log-007',
    timestamp: '2026-10-08 14:05:22',
    actorName: 'Vân Ngọc',
    actorEmail: 'vanngoc@upbase.vn',
    actorRole: 'MANAGER',
    actionType: 'PERMISSION_TOGGLE',
    targetUserOrEntity: 'Bảng Phân Bổ Ngân Sách KL1-KL4 Tháng 10',
    description: 'Khóa và phê duyệt hạn mức ngân sách phân chia theo Khung Lương KOC cho 5 nhãn hàng trọng điểm.',
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
    label: '🟢 ALL (Toàn quyền)',
    shortLabel: 'ALL',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700 font-bold',
    border: 'border-emerald-200',
    description: 'Toàn quyền tạo, sửa, xóa, duyệt không giới hạn phạm vi.'
  },
  SCOPED: {
    label: '🔵 SCOPED (Theo phân công)',
    shortLabel: 'SCOPED',
    bg: 'bg-blue-50',
    text: 'text-blue-700 font-bold',
    border: 'border-blue-200',
    description: 'Chỉ được thao tác trên Brand/Store/Job được giao phụ trách trực tiếp.'
  },
  VIEW: {
    label: '🟡 VIEW (Chỉ xem)',
    shortLabel: 'VIEW',
    bg: 'bg-amber-50',
    text: 'text-amber-700 font-bold',
    border: 'border-amber-200',
    description: 'Chỉ có quyền xem thông tin, không được tạo, sửa hoặc xóa.'
  },
  APPROVE: {
    label: '🟣 APPROVE (Phê duyệt)',
    shortLabel: 'APPROVE',
    bg: 'bg-purple-50',
    text: 'text-purple-700 font-bold',
    border: 'border-purple-200',
    description: 'Có thẩm quyền ký duyệt chính sách, duyệt deal, duyệt tiền, duyệt kịch bản.'
  },
  DENIED: {
    label: '⛔ DENIED (Cấm truy cập)',
    shortLabel: 'DENIED',
    bg: 'bg-slate-50',
    text: 'text-slate-400 font-medium',
    border: 'border-slate-200',
    description: 'Bị ẩn hoàn toàn, không có quyền truy cập tính năng này.'
  }
};
