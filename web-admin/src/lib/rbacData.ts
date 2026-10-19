import type { AccessPolicy } from './server/accessPolicy';
let serverPolicy: AccessPolicy | null = null;
export function hydrateRbacPolicy(policy: AccessPolicy, user?: UserProfile) {
  serverPolicy = policy;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upbase-rbac-updated', { detail: user }));
}
import { 
  UserRole, 
  UserProfile,
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
    name: 'Giám Đốc Marketing B2C',
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
    id: 'LEGAL',
    code: 'LEGAL_REVIEW',
    name: 'Pháp Chế (Duyệt Hợp Đồng & Biểu Mẫu)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Kiểm tra pháp lý hợp đồng & biên bản nghiệm thu, quản lý danh mục và cập nhật biểu mẫu hợp đồng chuẩn (.docx).',
    defaultLandingTab: 'contracts',
    userCount: 2
  },
  {
    id: 'FINANCE',
    code: 'FINANCE_ACC',
    name: 'Kế Toán (Duyệt Hợp Đồng & Đối Soát Chi)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Duyệt điều khoản thanh toán hợp đồng, kiểm soát thuế TNCN 10% / hóa đơn VAT và đối soát hạn mức chi Order Net.',
    defaultLandingTab: 'contracts',
    userCount: 3
  },
  {
    id: 'SIGN_ADMIN',
    code: 'SIGN_COORD',
    name: 'Điều Phối Ký Điện Tử (weSign)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Điều phối trình ký hợp đồng đã được Pháp chế & Kế toán duyệt lên hệ thống ký số điện tử weSign.',
    defaultLandingTab: 'contracts',
    userCount: 1
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
    description: 'Đăng nhập Gmail, quản lý thông tin cá nhân & pháp lý, xem & ký xác nhận hợp đồng, theo dõi lịch sử hợp tác, nhận hàng mẫu, nộp video/mã Spark Ads và đối soát hiệu quả.',
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
    roleTitle: 'Giám Đốc Marketing B2C (Lead B2C)',
    department: 'Khối Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'Giám Đốc Marketing B2C',
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
  },
  {
    id: 'contract-demo-legal',
    staffCode: 'HN201',
    name: 'Pháp chế (kiểm thử)',
    email: 'phapche@upbase.vn',
    avatar: 'PC',
    role: 'LEGAL',
    roleTitle: 'Pháp Chế — Duyệt Hợp Đồng & Biểu Mẫu (Legal)',
    department: 'Phòng Pháp Chế',
    team: 'Pháp chế',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    managerName: 'Đỗ Văn Giang',
    position: 'Chuyên Viên Pháp Chế',
    picBrands: ['ALL_BRANDS'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: true,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 10:15',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'contract-demo-finance',
    staffCode: 'HN202',
    name: 'Kế toán (kiểm thử)',
    email: 'ketoan@upbase.vn',
    avatar: 'KT',
    role: 'FINANCE',
    roleTitle: 'Kế Toán — Duyệt Hợp Đồng & Hạn Mức Thanh Toán (Finance)',
    department: 'Phòng Tài Chính Kế Toán',
    team: 'Kế toán',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    managerName: 'Đỗ Văn Giang',
    position: 'Kế Toán Thanh Toán',
    picBrands: ['ALL_BRANDS'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: true,
      canViewAllBrands: true,
      canExportRawData: true,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 10:05',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'contract-demo-sign',
    staffCode: 'HN203',
    name: 'Điều phối ký (kiểm thử)',
    email: 'dieuphoiky@upbase.vn',
    avatar: 'ĐK',
    role: 'SIGN_ADMIN',
    roleTitle: 'Điều Phối Ký Điện Tử — Trình Ký Hợp Đồng (weSign)',
    department: 'Phòng Hành Chính - Pháp Chế',
    team: 'Điều phối ký',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    managerName: 'Đỗ Văn Giang',
    position: 'Điều Phối Ký Số',
    picBrands: ['ALL_BRANDS'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: true,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Hôm nay 09:50',
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
  return serverPolicy?.staffOverrides || {};
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
  return serverPolicy?.deptRules || INITIAL_DEPARTMENT_ACCESS_RULES;
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
    'dashboard-air-sync',
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
    'task-delegation',
    'workload-3d',
    'sample-tracker',
    'performance-p3',
    'leaderboard',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'knowledge-qa',
    'audit-trail',
    'tiktok-crawler',
    'market-research'
  ],
  MANAGER: [
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
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
    'task-delegation',
    'workload-3d',
    'sample-tracker',
    'performance-p3',
    'leaderboard',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'knowledge-qa',
    'audit-trail',
    'tiktok-crawler',
    'market-research'
  ],
  GROWTH_MANAGER: [
    'cockpit',
    'manager',
    'task-delegation',
    'workload-3d',
    'input-plan',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'audit-trail',
    'tiktok-crawler',
    'market-research'
  ],
  MEDIA_MANAGER: [
    'cockpit',
    'manager',
    'task-delegation',
    'workload-3d',
    'input-plan',
    'ads-report',
    'sample-tracker',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'audit-trail',
    'tiktok-crawler',
    'market-research'
  ],
  LEADER: [
    'cockpit',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
    'dashboard-team-sla',
    'dashboard-staff',
    'dashboard-finance',
    'ads-report',
    'performance-p3',
    'manager',
    'task-delegation',
    'workload-3d',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  BOOKING_MEMBER: [
    'cockpit',
    'task-delegation',
    'workload-3d',
    'dashboard-bi',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  CONTENT_MEMBER: [
    'cockpit',
    'task-delegation',
    'workload-3d',
    'dashboard-bi',
    'dashboard-video',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  BRAND_MEMBER: [
    'cockpit',
    'task-delegation',
    'workload-3d',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  MEMBER: [
    'cockpit',
    'task-delegation',
    'workload-3d',
    'dashboard-bi',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  GROWTH_MEMBER: [
    'input-plan',
    'cockpit',
    'task-delegation',
    'workload-3d',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
    'dashboard-team-sla',
    'dashboard-staff',
    'stores',
    'campaigns',
    'performance-p3',
    'ads-report',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  MEDIA_MEMBER: [
    'input-plan',
    'ads-report',
    'cockpit',
    'task-delegation',
    'workload-3d',
    'overview',
    'dashboard-bi',
    'dashboard-brand',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
    'dashboard-team-sla',
    'dashboard-staff',
    'campaigns',
    'performance-p3',
    'brand-knowledge',
    'api-settings',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research'
  ],
  LEGAL: [
    'contracts',
    'audit-trail'
  ],
  FINANCE: [
    'contracts',
    'dashboard-finance',
    'audit-trail'
  ],
  SIGN_ADMIN: [
    'contracts',
    'audit-trail'
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
  LEGAL: 'contracts',
  FINANCE: 'contracts',
  SIGN_ADMIN: 'contracts',
  BRAND_PARTNER: 'brand-hub',
  KOC_PARTNER: 'koc-hub',
  CTV_PARTNER: 'self-channel-hub'
};

export function isTabAllowedForRole(role: UserRole, tab: TabKey): boolean {
  if (
    (tab === 'task-delegation' ||
      tab === 'workload-3d' ||
      tab === 'tiktok-crawler' ||
      tab === 'market-research') &&
    ROLE_ALLOWED_TABS[role]?.includes(tab)
  ) {
    return true;
  }
  const map = getSavedRoleAllowedTabs();
  const allowed = map[role] || ROLE_ALLOWED_TABS[role];
  if (!allowed) return false;
  return allowed.includes(tab);
}

export function getAllowedTabsForRole(role: UserRole): TabKey[] {
  const map = getSavedRoleAllowedTabs();
  const list = [...(map[role] || ROLE_ALLOWED_TABS[role] || ['cockpit'])];
  if (ROLE_ALLOWED_TABS[role]?.includes('workload-3d') && !list.includes('workload-3d')) {
    list.push('workload-3d');
  }
  if (ROLE_ALLOWED_TABS[role]?.includes('tiktok-crawler') && !list.includes('tiktok-crawler')) {
    list.push('tiktok-crawler');
  }
  if (ROLE_ALLOWED_TABS[role]?.includes('market-research') && !list.includes('market-research')) {
    list.push('market-research');
  }
  return list;
}

export function getDefaultLandingTabForRole(role: UserRole): TabKey {
  const landingMap = getSavedRoleDefaultLanding();
  const allowed = getAllowedTabsForRole(role);
  const candidate = landingMap[role] || ROLE_DEFAULT_LANDING[role] || 'cockpit';
  if (allowed.includes(candidate)) return candidate;
  return allowed[0] || candidate;
}

export interface SystemScreenCatalogItem {
  key: TabKey;
  label: string;
  group: 'DASHBOARD' | 'PLANNING_BRAND' | 'BOOKING_CONTENT' | 'CONTRACTS_FINANCE' | 'SYSTEM_ADMIN' | 'PARTNER_PORTAL';
  groupTitle: string;
  description: string;
}

export const ALL_SYSTEM_SCREENS: SystemScreenCatalogItem[] = [
  { key: 'cockpit', label: 'Việc của tôi (Cockpit)', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Không gian làm việc cá nhân, việc cần xử lý trong ngày.' },
  { key: 'dashboard-brand', label: 'Dashboard Thương hiệu & Ngân sách', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi ngân sách 42 thương hiệu B2C.' },
  { key: 'dashboard-air-sync', label: 'Dashboard Lịch Air Tuần & Độ Đồng Loạt', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Đối chiếu lịch air kế hoạch theo tuần (W40–W45) và kiểm soát độ đồng loạt lên sóng thực tế.' },
  { key: 'dashboard-store', label: 'Dashboard Gian hàng & TikTok Seller', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi 69 gian hàng B2C và chỉ số sàn.' },
  { key: 'dashboard-video', label: 'Dashboard Video Booking & Ads', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi tiến độ sản xuất & air video KOC.' },
  { key: 'dashboard-team-sla', label: 'Dashboard Tiến độ & SLA Vận hành', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Kiểm soát SLA duyệt deal, kịch bản, gửi mẫu, lên bài.' },
  { key: 'dashboard-staff', label: 'Dashboard Hiệu suất Nhân viên', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Đánh giá năng suất & hiệu quả chi phí theo PIC.' },
  { key: 'dashboard-finance', label: 'Đối soát Kế toán & Xuất file (.xlsx)', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng, Tài Chính & Hàng Mẫu', description: 'Đối soát chi phí Order Net/Gross, cảnh báo vượt trần và xuất báo cáo Kế toán.' },
  { key: 'input-plan', label: 'Kế hoạch tháng (Input Plan 4.1)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Lập & duyệt kế hoạch tháng theo gian hàng và khung lương.' },
  { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu (Brand Profile)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Định vị nhãn hàng, pháp nhân, ratecard và quy tắc duyệt.' },
  { key: 'market-research', label: 'Nghiên cứu Brand & Đối thủ', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Bóc tách định vị 4P, lập ma trận đối thủ trực diện, đào bình luận khách hàng và quét trang đích.' },
  { key: 'stores', label: 'Hồ sơ gian hàng (Store Portfolio)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Quản lý danh mục gian hàng TikTok Shop, Shopee Mall.' },
  { key: 'manager', label: 'Điều phối & Quản lý nhân sự', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Phân bổ tải, giao việc PIC và duyệt kế hoạch cấp phòng.' },
  { key: 'task-delegation', label: 'Giao việc & Định mức Task', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Giao việc theo vai trò (PIC/Co-PIC/Execution/Support), cấu hình độ khó Task và Bảng 2b Research.' },
  { key: 'workload-3d', label: 'Bản đồ 3D & Workload', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Trực quan hóa không gian 3D phân bổ Nhân sự, Thương hiệu, Gian hàng và Cột tải trọng công việc (Workload Point).' },
  { key: 'campaigns', label: 'Chiến dịch Brand', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Quản lý chiến dịch, mục tiêu GMV và bàn giao đề bài.' },
  { key: 'push-products', label: 'Sản phẩm đẩy (Hero SKU)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch & Thương Hiệu', description: 'Danh mục sản phẩm chủ lực, USP và tồn kho hàng mẫu.' },
  { key: 'booking', label: 'Quản lý Booking KOC', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Tạo deal, chốt đơn giá, duyệt KOC và theo dõi tiến độ air.' },
  { key: 'tiktok-crawler', label: 'Crawler KOC & Đối thủ TikTok', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Quét KOC đang làm cho đối thủ, tìm KOC theo #Hashtag và nghiệm thu link video KOC gửi.' },
  { key: 'koc-listing', label: 'Listing & Air Video', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Đề xuất danh sách KOC theo lô và cập nhật link video.' },
  { key: 'content', label: 'Kịch bản & Video', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Soạn thảo và duyệt kịch bản video KOC / Self-channel.' },
  { key: 'content-angles', label: 'Góc nội dung (Content Angles)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Ma trận trụ cột nội dung & Hook 3s đầu.' },
  { key: 'koc-master', label: 'Danh bạ KOC', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Hồ sơ KOC/KOL, thông tin pháp lý CCCD/MST và lịch sử hợp tác.' },
  { key: 'ctv-master', label: 'Danh bạ CTV / VJ', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Hồ sơ cộng tác viên sản xuất video kênh nội bộ.' },
  { key: 'self-channel-hub', label: 'Video kênh Brand (Self-channel)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Giao việc & nghiệm thu video kênh tự xây.' },
  { key: 'contracts', label: 'Hợp đồng & Biểu mẫu', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng, Tài Chính & Hàng Mẫu', description: 'Soạn hợp đồng, duyệt Pháp chế / Kế toán, trình ký điện tử và quản lý mẫu .docx.' },
  { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng, Tài Chính & Hàng Mẫu', description: 'Theo dõi vận đơn gửi mẫu và thu thập mã quảng cáo Spark Ads.' },
  { key: 'ads-report', label: 'Báo cáo Ads TikTok', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng, Tài Chính & Hàng Mẫu', description: 'Báo cáo hiệu quả chạy quảng cáo GMV, ROAS, CPA.' },
  { key: 'performance-p3', label: 'Đánh giá 4P & thưởng', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng, Tài Chính & Hàng Mẫu', description: 'Tính điểm hiệu suất P3 và quỹ thưởng nhân sự.' },
  { key: 'master-data', label: 'Dữ liệu gốc (Master Data)', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Quản trị dữ liệu gốc Brand, Store, KOC, Nhân sự.' },
  { key: 'partner-access', label: 'Phân quyền & Tài khoản (RBAC)', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Quản trị Role, gán quyền nhân sự và kiểm soát cổng đăng nhập.' },
  { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp B2C', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Cẩm nang quy trình SLA, khung lương và tính thuế.' },
  { key: 'api-settings', label: 'Cấu hình API & Công cụ', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Cấu hình kết nối Kalodata, Lark Base, TikTok Seller.' },
  { key: 'brand-hub', label: 'Cổng đối tác Brand', group: 'PARTNER_PORTAL', groupTitle: '6. Cổng Đối Tác Ngoài', description: 'Giao diện dành riêng cho đại diện thương hiệu duyệt KOC & kịch bản.' },
  { key: 'koc-hub', label: 'Cổng đối tác KOC / KOL', group: 'PARTNER_PORTAL', groupTitle: '6. Cổng Đối Tác Ngoài', description: 'Giao diện dành riêng cho Creator cập nhật hồ sơ, ký hợp đồng và nộp bài.' },
];

export const ALL_ROLE_DEFINITIONS: RoleDefinition[] = [
  ...RBAC_ROLE_DEFINITIONS.slice(0, 5),
  {
    id: 'BOOKING_MEMBER',
    code: 'BOOKING_PIC',
    name: 'Chuyên Viên Booking B2C',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Tìm kiếm KOC, tạo deal booking, soạn hợp đồng và theo dõi video lên bài cho các gian hàng được giao.',
    defaultLandingTab: 'booking',
    userCount: 118
  },
  {
    id: 'CONTENT_MEMBER',
    code: 'CONTENT_PIC',
    name: 'Chuyên Viên Content B2C',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Xây dựng góc nội dung, viết kịch bản video KOC & kênh tự xây (Self-channel), điều phối CTV quay dựng.',
    defaultLandingTab: 'content',
    userCount: 10
  },
  {
    id: 'BRAND_MEMBER',
    code: 'BRAND_PIC',
    name: 'Chuyên Viên Quản Lý Nhãn (Brand PIC)',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Làm việc trực tiếp với nhãn hàng, quản lý chiến dịch Brand, sản phẩm đẩy và trình duyệt kịch bản.',
    defaultLandingTab: 'campaigns',
    userCount: 6
  },
  {
    id: 'GROWTH_MEMBER',
    code: 'GROWTH_PIC',
    name: 'Chuyên Viên Growth Ecom',
    scopeType: 'INTERNAL',
    departmentScope: 'GROWTH',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Lập kế hoạch tháng (Input Plan 4.1), quản lý PnL gian hàng và giao hạn mức Order Net/Gross.',
    defaultLandingTab: 'input-plan',
    userCount: 136
  },
  {
    id: 'MEDIA_MEMBER',
    code: 'MEDIA_PIC',
    name: 'Chuyên Viên Media & Ads',
    scopeType: 'INTERNAL',
    departmentScope: 'MEDIA',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Nhận mã Spark Ads, vận hành chiến dịch quảng cáo TikTok và cập nhật báo cáo Ads hàng tuần.',
    defaultLandingTab: 'input-plan',
    userCount: 30
  },
  ...RBAC_ROLE_DEFINITIONS.slice(5),
];

export const ROLE_SCREEN_PERMS_STORAGE_KEY = 'upbase_b2c_role_screen_perms_v1';
export const ROLE_LANDING_TAB_STORAGE_KEY = 'upbase_b2c_role_landing_tab_v1';
export const INTERNAL_STAFF_ROLES_STORAGE_KEY = 'upbase_b2c_internal_staff_roles_v1';

export function getSavedRoleAllowedTabs(): Record<UserRole, TabKey[]> {
  return serverPolicy?.roleAllowedTabs || ROLE_ALLOWED_TABS;
}

export function saveRoleAllowedTabs(map: Record<UserRole, TabKey[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROLE_SCREEN_PERMS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event('upbase-rbac-updated'));
  } catch (e) {
    console.warn('Failed to save role screen permissions:', e);
  }
}

export function getSavedRoleDefaultLanding(): Record<UserRole, TabKey> {
  return serverPolicy?.roleDefaultLanding || ROLE_DEFAULT_LANDING;
}

export function saveRoleDefaultLanding(map: Record<UserRole, TabKey>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROLE_LANDING_TAB_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event('upbase-rbac-updated'));
  } catch (e) {
    console.warn('Failed to save role landing tabs:', e);
  }
}

export function resetAllRoleScreenPermissions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_SCREEN_PERMS_STORAGE_KEY);
  localStorage.removeItem(ROLE_LANDING_TAB_STORAGE_KEY);
  window.dispatchEvent(new Event('upbase-rbac-updated'));
}

export function getSavedInternalStaffList(): InternalStaffRbacMember[] {
  return serverPolicy?.internalStaff || INITIAL_INTERNAL_STAFF_RBAC;
}

export function saveInternalStaffList(list: InternalStaffRbacMember[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTERNAL_STAFF_ROLES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('upbase-rbac-updated'));
  } catch (e) {
    console.warn('Failed to save internal staff list:', e);
  }
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
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  SIGN_ADMIN: 'Điều phối ký điện tử',
  BRAND_PARTNER: 'Đại diện thương hiệu',
  KOC_PARTNER: 'Đối tác KOC / Creator',
  CTV_PARTNER: 'Cộng tác viên Self-channel',
};
