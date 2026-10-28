import type { AccessPolicy } from './server/accessPolicy';
let serverPolicy: AccessPolicy | null = null;
let lastRbacSignature = '';
export function hydrateRbacPolicy(policy: AccessPolicy, user?: UserProfile) {
  serverPolicy = policy;
  if (typeof window !== 'undefined') {
    const nextSignature = JSON.stringify({ policy, user });
    if (nextSignature !== lastRbacSignature) {
      lastRbacSignature = nextSignature;
      window.dispatchEvent(new CustomEvent('upbase-rbac-updated', { detail: user }));
    }
  }
}
import {
  DataScope,
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
import { TAB_LABELS, TAB_ALIASES } from './navGroups';

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
    code: 'ADMIN',
    name: 'Quản Trị Hệ Thống (Admin)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    description: 'Xác định phòng ban và nhân sự thuộc Marketing B2C được phép đăng nhập hệ thống; phân quyền hệ thống.',
    defaultLandingTab: 'cockpit',
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
    id: 'LEADER',
    code: 'PIC_LEAD',
    name: 'Trưởng Nhóm B2C (Leader)',
    scopeType: 'INTERNAL',
    departmentScope: 'MARKETING_B2C',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Phụ trách cụm Brand/Store có nhóm, duyệt ứng viên KOC/Deal bước 1, duyệt kịch bản sơ bộ, theo dõi tiến độ lên bài của nhóm.',
    defaultLandingTab: 'cockpit',
    userCount: 4
  },
  {
    id: 'MEMBER',
    code: 'SPECIALIST',
    name: 'Chuyên Viên (MKT / Growth / Media)',
    scopeType: 'INTERNAL',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Tác nghiệp trực tiếp trên Brand/Gian hàng được Trưởng phòng phân công (Booking, Content, Brand).',
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
      // Booking chính sửa / gửi duyệt kế hoạch gian mình (máy chủ còn kiểm vị trí Booking chính)
      BOOKING_MEMBER: 'SCOPED',
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
    description: 'Đọc ảnh CCCD/ĐKKD để điền thông tin lập hồ sơ pháp lý.',
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
  },

  // --- QUYỀN THAO TÁC TRƯỚC ĐÂY GẮN CỨNG THEO TÊN VAI TRÒ TRONG MÀN HÌNH, NAY CẤU HÌNH ĐƯỢC ---
  {
    id: 'plan_leader_signoff',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Ký xác nhận bước Leader trong luồng duyệt kế hoạch',
    description: 'Xác nhận sơ duyệt kế hoạch gian hàng có Leader trước khi trình Giám đốc Marketing.',
    permissions: withDeniedDefaults({ ADMIN: 'ALL', MANAGER: 'APPROVE', LEADER: 'APPROVE' }),
  },
  {
    id: 'plan_approval_route_config',
    category: 'PLANNING',
    categoryTitle: '1. Lập Kế Hoạch & Phân Bổ Tải',
    featureName: 'Bật / tắt bước Leader trong tuyến duyệt kế hoạch gian hàng',
    description: 'Chọn gian hàng nào phải qua Leader sơ duyệt, gian hàng nào trình thẳng Giám đốc Marketing.',
    permissions: withDeniedDefaults({ ADMIN: 'ALL', MANAGER: 'ALL', LEADER: 'VIEW' }),
  },
  {
    id: 'koc_sensitive_identity',
    category: 'BOOKING_CONTENT',
    categoryTitle: '2. Vận Hành Booking KOC & Kịch Bản',
    featureName: 'Xem đầy đủ CCCD / MST / số tài khoản của KOC',
    description: 'Toàn bộ: xem mọi KOC. Theo phạm vi: chỉ KOC do mình hoặc nhân sự trong phạm vi phụ trách. Còn lại chỉ thấy số đã che.',
    permissions: withDeniedDefaults({
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
      MEMBER: 'SCOPED',
      LEGAL: 'ALL',
      FINANCE: 'ALL',
    }),
    securityNote: 'Đối tác ngoài không bao giờ thấy giấy tờ của KOC khác.',
  },
  {
    id: 'brand_profile_full_edit',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Sửa toàn bộ hồ sơ thương hiệu & trần thù lao nội bộ',
    description: 'Sửa mọi mục hồ sơ thương hiệu của mọi nhãn và xem / sửa trần thù lao nội bộ (Ratecard).',
    permissions: withDeniedDefaults({ ADMIN: 'ALL', MANAGER: 'ALL' }),
    securityNote: 'Account PIC của nhãn và đại diện nhãn hàng vẫn sửa được các mục của chính nhãn mình.',
  },
  {
    id: 'store_difficulty_coefficient',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Chỉnh hệ số độ khó gian hàng',
    description: 'Đổi nhóm độ khó và hệ số quy đổi định mức của gian hàng.',
    permissions: withDeniedDefaults({
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'VIEW',
      MEMBER: 'VIEW',
    }),
  },
  {
    id: 'data_sync_trigger',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Kích hoạt đồng bộ dữ liệu (Lark Base kế hoạch, TikTok Seller)',
    description: 'Chạy đồng bộ kế hoạch tháng từ Lark Base và số liệu gian hàng từ TikTok Seller vào hệ thống.',
    permissions: withDeniedDefaults({
      ADMIN: 'ALL',
      MANAGER: 'ALL',
      LEADER: 'SCOPED',
    }),
  },
  {
    id: 'integration_destructive_admin',
    category: 'SYSTEM_MASTER',
    categoryTitle: '5. Quản Trị Hệ Thống & Master Data',
    featureName: 'Đổi cấu hình lưu trữ, xóa tệp & xóa toàn bộ lịch sử quét',
    description: 'Lưu / xóa cấu hình Cloudflare R2, xóa tệp lưu trữ, chuyển tệp cục bộ và xóa toàn bộ lịch sử quét TikTok.',
    permissions: withDeniedDefaults({ ADMIN: 'ALL', MANAGER: 'ALL' }),
    securityNote: 'Thao tác không hoàn tác được; chỉ cấp mức Toàn quyền cho người chịu trách nhiệm hệ thống.',
  },
];

/** Quyền mới khai báo đủ mọi vai trò, vai trò không nêu tên mặc định bị chặn. */
function withDeniedDefaults(levels: Partial<Record<UserRole, PermissionAccessLevel>>): Record<string, PermissionAccessLevel> {
  const roles: UserRole[] = [
    'ADMIN', 'MANAGER', 'LEADER', 'MEMBER',
    'LEGAL', 'FINANCE', 'SIGN_ADMIN', 'BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER',
  ];
  return Object.fromEntries(roles.map((r) => [r, levels[r] ?? 'DENIED']));
}

export const INITIAL_PERMISSION_MATRIX: PermissionMatrixItem[] = RAW_PERMISSION_MATRIX.map(item => {
  let legalPerm: PermissionAccessLevel = 'DENIED';
  let financePerm: PermissionAccessLevel = 'DENIED';
  let signAdminPerm: PermissionAccessLevel = 'DENIED';

  if (item.category === 'CONTRACTS_FINANCE') {
    if (item.id === 'legal_ocr_extraction') {
      legalPerm = 'ALL';
      financePerm = 'VIEW';
      signAdminPerm = 'VIEW';
    } else if (item.id === 'contract_creation') {
      legalPerm = 'APPROVE';
      financePerm = 'APPROVE';
      signAdminPerm = 'ALL';
    } else if (item.id === 'payment_request_submission') {
      legalPerm = 'VIEW';
      financePerm = 'ALL';
      signAdminPerm = 'VIEW';
    } else if (item.id === 'payment_approval_disbursement') {
      legalPerm = 'VIEW';
      financePerm = 'APPROVE';
      signAdminPerm = 'DENIED';
    } else if (item.id === 'agency_financial_margins') {
      legalPerm = 'VIEW';
      financePerm = 'ALL';
      signAdminPerm = 'DENIED';
    }
  } else if (item.category === 'PERFORMANCE_ADS') {
    if (item.id === 'raw_data_export') {
      legalPerm = 'VIEW';
      financePerm = 'ALL';
      signAdminPerm = 'VIEW';
    }
  } else if (item.category === 'SYSTEM_MASTER') {
    if (item.id === 'security_audit_log_access') {
      legalPerm = 'VIEW';
      financePerm = 'VIEW';
      signAdminPerm = 'VIEW';
    }
  }

  return {
    ...item,
    permissions: {
      ...item.permissions,
      LEGAL: item.permissions.LEGAL || legalPerm,
      FINANCE: item.permissions.FINANCE || financePerm,
      SIGN_ADMIN: item.permissions.SIGN_ADMIN || signAdminPerm,
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
    roleTitle: 'Tổng Giám Đốc (CEO / Quản trị)',
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
    id: 'user-huu-chien',
    staffCode: 'HN979',
    name: 'Trần Hữu Chiến',
    email: 'chienth@upbase.vn',
    avatar: 'HC',
    role: 'ADMIN',
    roleTitle: 'Business Operation Leader (Operation)',
    department: 'Operation',
    team: 'Operation',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'ADMIN_EXPLICIT',
    position: 'Business Operation Leader',
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
    staffCode: 'HN241',
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
    id: 'user-hai-long',
    staffCode: 'HN220',
    name: 'Hoàng Hải Long',
    email: 'hailong@upbase.vn',
    avatar: 'HL',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking (Booking Specialist)',
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
    picBrands: ['Dynik', 'Badlab', 'Natural Care'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '15 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-bich-lien',
    staffCode: 'HN601',
    name: 'Đinh Thị Bích Liên',
    email: 'bichlien@upbase.vn',
    avatar: 'BL',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking & Điều Phối Affiliate (Partnership)',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Partnership Executive',
    picBrands: ['Baniphar', 'ClubClio', 'EUPC', 'Fresh', 'Kutieskin', 'Meracine', 'Docilee'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Vừa xong',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-dieu-anh',
    staffCode: 'HN889',
    name: 'Phan Diệu Ánh',
    email: 'dieuanh@upbase.vn',
    avatar: 'DA',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên Viên Booking (Booking Specialist)',
    department: 'Phòng Marketing B2C',
    team: 'Booking',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Booking Executive',
    picBrands: ['EUPC', 'TM Clean', 'FeelCleans'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '10 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-ngoc-anh',
    staffCode: 'HN240',
    name: 'Bùi Ngọc Ánh',
    email: 'ngocanh@upbase.vn',
    avatar: 'NA',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content & Kế Hoạch Chiến Lược (Content Executive)',
    department: 'Phòng Marketing B2C',
    team: 'Content Self-Channel',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Content Executive',
    picBrands: ['Baniphar', 'Herbal Care', 'Venus', 'Blossomy'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: '8 phút trước',
    authMethod: 'LARK_SSO'
  },
  {
    id: 'user-dieu-thuy',
    staffCode: 'HN206',
    name: 'Hoàng Diệu Thùy',
    email: 'dieuthuy@upbase.vn',
    avatar: 'DT',
    role: 'CONTENT_MEMBER',
    roleTitle: 'Chuyên Viên Content & Key Visual Lead (SIS / Content Executive)',
    department: 'Phòng Marketing B2C',
    team: 'Key Visual / SIS',
    location: 'HN',
    employmentType: 'Chính thức',
    departmentScope: 'MARKETING_B2C',
    canLogin: true,
    accessSource: 'DEPT_RULE',
    managerId: 'user-yen-nhi',
    managerName: 'Đặng Thị Yến Nhi',
    position: 'Content Executive',
    picBrands: ['ClubClio', 'Baniphar', 'Meracine', 'Nucos', 'Blossomy', 'Revision', 'pHCare'],
    permissions: {
      canApproveBudget: false,
      canApproveP3: false,
      canApprovePayment: false,
      canViewAllBrands: false,
      canExportRawData: false,
      canManageMasterData: false
    },
    status: 'ACTIVE',
    lastActive: 'Vừa xong',
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
    description: 'Các phòng ban ngoài Marketing B2C (gồm Growth, Media) — Mặc định khóa cổng đăng nhập.'
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
  return serverPolicy?.deptRules || fallback;
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
  const isLeaderOrHead = /giám đốc|trưởng phòng|head|manager|leader|lead/i.test(pos);

  // 2. Khối Growth và Media không dùng hệ thống Marketing B2C: rơi xuống nhóm bị chặn bên dưới
  const isGrowthOrMedia =
    combined.includes('growth') || combined.includes('media omni') || combined.includes('media tiktok') || /\bmedia\b/i.test(`${dept} ${team}`);

  // 3. Nhận diện Khối MARKETING B2C (Booking, Sub-Booking, Marketing B2C, Content, Brand - loại trừ Livestream & B2B)
  const isLivestreamOnly = /livestream/i.test(team) || /livestream/i.test(dept) || /ctv livestream|host livestream/i.test(pos);
  const isMarketingB2B = /marketing b2b/i.test(combined);

  if (!isLivestreamOnly && !isMarketingB2B && !isGrowthOrMedia) {
    if (
      /booking|sub-booking|marketing b2c/i.test(dept) ||
      /booking|sub-booking|marketing b2c/i.test(team)
    ) {
      const rule = deptRules.find(r => r.id === 'rule-mkt-booking');
      const autoAllow = rule ? rule.autoAllowLogin : true;
      const role: UserRole = /trưởng phòng|giám đốc/i.test(pos) ? 'MANAGER' : isLeaderOrHead ? 'LEADER' : 'BOOKING_MEMBER';
      return {
        ...staff,
        departmentScope: 'MARKETING_B2C',
        classifiedScope: 'MARKETING_B2C',
        canLogin: autoAllow,
        role,
        mappedRole: role,
        roleTitle: pos || 'Chuyên Viên Booking B2C',
        managerName: role === 'MANAGER' ? 'Ban Giám Đốc' : (rule?.defaultManagerName || 'Đặng Thị Yến Nhi'),
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

  // 5. Nhận diện Quản trị / Admin & Business Operation
  if (
    /\bbod\b/i.test(dept) ||
    /\bbod\b/i.test(team) ||
    (!isLivestreamOnly && (/business operation/i.test(pos) || /^operation$/i.test(team) || /^operation$/i.test(dept)))
  ) {
    const isBizOp = /operation/i.test(`${dept} ${team} ${pos}`);
    return {
      ...staff,
      departmentScope: 'MARKETING_B2C',
      classifiedScope: 'MARKETING_B2C',
      canLogin: true,
      role: isLeaderOrHead || !isBizOp ? 'ADMIN' : 'LEADER',
      mappedRole: isLeaderOrHead || !isBizOp ? 'ADMIN' : 'LEADER',
      roleTitle: pos || (isBizOp ? 'Business Operation Leader' : 'Ban Giám Đốc'),
      managerName: isBizOp ? 'Ban Giám Đốc' : 'Hội đồng Quản trị',
      ruleId: 'rule-bod',
      accessSource: 'ADMIN_EXPLICIT',
      reason: isBizOp
        ? 'Thuộc bộ phận Business Operation — Được cấp quyền vận hành hệ thống'
        : 'Thành viên Ban Giám Đốc — Toàn quyền truy cập'
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
    reason: `Thuộc phòng ban "${dept || team || 'Khác'}" ngoài Marketing B2C — Chặn đăng nhập mặc định`
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
    description: 'Chặn đăng nhập tự động: Nhân sự thuộc bộ phận Livestream, không thuộc Marketing B2C được Admin cấp quyền.',
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
    targetUserOrEntity: 'Khối Growth (Nguyễn Thị Thu Thủy) & Khối Media (Nguyễn Đức Quảng)',
    description: 'Kích hoạt cổng đăng nhập cho khối Marketing B2C và bổ nhiệm Trưởng phòng quản lý quân số.',
    ipAddress: '118.70.182.44',
    deviceInfo: 'Chrome 128 / macOS',
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
    'store-air-plan-report',
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
    'approved-booking-list',
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
    'sample-tracker',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'cloudflare-admin',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  MANAGER: [
    'store-air-plan-report',
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
    'approved-booking-list',
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
    'sample-tracker',
    'brand-hub',
    'koc-hub',
    'ads-report',
    'api-settings',
    'cloudflare-admin',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  LEADER: [
    'store-air-plan-report',
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
    'manager',
    'task-delegation',
    'input-plan',
    'koc-listing',
    'approved-booking-list',
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
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  BOOKING_MEMBER: [
    'store-air-plan-report',
    'store-air-plan-report',
    'cockpit',
    'task-delegation',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
    'booking',
    'koc-listing',
    'approved-booking-list',
    'koc-master',
    'ctv-master',
    'self-channel-hub',
    'input-plan',
    'stores',
    'contracts',
    'sample-tracker',
    'push-products',
    'brand-knowledge',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  CONTENT_MEMBER: [
    'cockpit',
    'task-delegation',
    'dashboard-video',
    'dashboard-air-sync',
    'content',
    'content-angles',
    'self-channel-hub',
    'ctv-master',
    'campaigns',
    'brand-knowledge',
    'sample-tracker',
    'push-products',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  BRAND_MEMBER: [
    'cockpit',
    'task-delegation',
    'dashboard-brand',
    'dashboard-air-sync',
    'dashboard-store',
    'dashboard-video',
    'campaigns',
    'push-products',
    'brand-knowledge',
    'koc-listing',
    'approved-booking-list',
    'content',
    'input-plan',
    'ads-report',
    'overview',
    'sample-tracker',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  MEMBER: [
    'cockpit',
    'task-delegation',
    'dashboard-store',
    'dashboard-video',
    'dashboard-air-sync',
    'booking',
    'koc-listing',
    'approved-booking-list',
    'koc-master',
    'ctv-master',
    'self-channel-hub',
    'stores',
    'content',
    'contracts',
    'input-plan',
    'sample-tracker',
    'push-products',
    'brand-knowledge',
    'knowledge-qa',
    'tiktok-crawler',
    'market-research',
    'work-toolkit',
    'zalo-bot'
  ],
  LEGAL: [
    'contracts',
    'work-toolkit',
    'zalo-bot'
  ],
  FINANCE: [
    'self-channel-hub',
    'store-air-plan-report',
    'contracts',
    'dashboard-finance',
    'work-toolkit',
    'zalo-bot'
  ],
  SIGN_ADMIN: [
    'contracts',
    'work-toolkit',
    'zalo-bot'
  ],
  BRAND_PARTNER: [
    'brand-hub',
    'koc-listing',
    'approved-booking-list',
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
  ADMIN: 'cockpit',
  MANAGER: 'cockpit',
  LEADER: 'cockpit',
  BOOKING_MEMBER: 'cockpit',
  CONTENT_MEMBER: 'cockpit',
  BRAND_MEMBER: 'cockpit',
  MEMBER: 'cockpit',
  LEGAL: 'contracts',
  FINANCE: 'contracts',
  SIGN_ADMIN: 'contracts',
  BRAND_PARTNER: 'brand-hub',
  KOC_PARTNER: 'koc-hub',
  CTV_PARTNER: 'self-channel-hub'
};

/**
 * Màn hình điều hành dành cho cấp quản lý: so sánh năng suất giữa nhân sự, tải việc toàn đội, SLA team, BI toàn khối.
 * Chuyên viên thực thi không được mở mặc định; Admin vẫn có thể bật lại cho từng vai trò tại màn Phân quyền.
 */
export const HIDDEN_SYSTEM_SCREENS: TabKey[] = [
  'booking',
  'approved-booking-list',
  'sample-tracker',
  'store-air-plan-report',
  'push-products',
  'stores',
  'ctv-master',
  'workload-3d',
  'performance-p3',
  'audit-trail',
];

export const LEADERSHIP_ONLY_SCREENS: TabKey[] = ['dashboard-bi', 'dashboard-team-sla', 'dashboard-staff'];

export const SPECIALIST_MEMBER_ROLE_IDS: UserRole[] = [
  'BOOKING_MEMBER',
  'CONTENT_MEMBER',
  'BRAND_MEMBER',
  'MEMBER',
];

/** Phạm vi dữ liệu mặc định của từng vai trò. Admin đổi được tại màn Phân quyền → Vai trò. */
export const ROLE_DEFAULT_DATA_SCOPE: Record<UserRole, DataScope> = {
  ADMIN: 'ALL',
  MANAGER: 'ALL',
  LEADER: 'TEAM',
  BOOKING_MEMBER: 'OWN',
  CONTENT_MEMBER: 'OWN',
  BRAND_MEMBER: 'OWN',
  MEMBER: 'OWN',
  LEGAL: 'ALL',
  FINANCE: 'ALL',
  SIGN_ADMIN: 'ALL',
  BRAND_PARTNER: 'OWN',
  KOC_PARTNER: 'OWN',
  CTV_PARTNER: 'OWN',
};

export const DATA_SCOPE_OPTIONS: Array<{ key: DataScope; label: string; shortLabel: string }> = [
  { key: 'ALL', label: 'Toàn bộ dữ liệu', shortLabel: 'Toàn bộ' },
  { key: 'DEPARTMENT', label: 'Cả khối phụ trách', shortLabel: 'Cả khối' },
  { key: 'TEAM', label: 'Bản thân và nhân sự trực thuộc', shortLabel: 'Team' },
  { key: 'OWN', label: 'Chỉ việc được giao', shortLabel: 'Của tôi' },
];

export const DATA_SCOPE_LABEL: Record<DataScope, string> = Object.fromEntries(
  DATA_SCOPE_OPTIONS.map((o) => [o.key, o.shortLabel])
) as Record<DataScope, string>;

export function getSavedRoleDataScope(): Record<UserRole, DataScope> {
  const policyWithScope = serverPolicy as (AccessPolicy & { roleDataScope?: Partial<Record<UserRole, DataScope>> }) | null;
  return { ...ROLE_DEFAULT_DATA_SCOPE, ...(policyWithScope?.roleDataScope || {}) };
}

const CORE_SYNCED_ROLE_TABS: TabKey[] = [
  'tiktok-crawler',
  'market-research',
  'task-delegation',
  'contracts',
  'cloudflare-admin',
  'work-toolkit',
  'api-settings',
  'zalo-bot',
];

export function isTabAllowedForRole(role: UserRole, tab: TabKey): boolean {
  if (HIDDEN_SYSTEM_SCREENS.includes(tab)) return false;
  if (CORE_SYNCED_ROLE_TABS.includes(tab) && ROLE_ALLOWED_TABS[role]?.includes(tab)) {
    return true;
  }
  const map = getSavedRoleAllowedTabs();
  const allowed = map[role] || ROLE_ALLOWED_TABS[role];
  if (!allowed) return false;
  if (allowed.includes(tab)) return true;
  const canonical = TAB_ALIASES[tab];
  return canonical ? allowed.includes(canonical) : false;
}

export function getAllowedTabsForRole(role: UserRole): TabKey[] {
  const map = getSavedRoleAllowedTabs();
  const base = [...(map[role] || ROLE_ALLOWED_TABS[role] || ['cockpit'])].filter(
    (t) => !HIDDEN_SYSTEM_SCREENS.includes(t)
  );
  for (const coreTab of CORE_SYNCED_ROLE_TABS) {
    if (ROLE_ALLOWED_TABS[role]?.includes(coreTab) && !base.includes(coreTab)) {
      base.push(coreTab);
    }
  }
  for (const [aliasKey, canonicalKey] of Object.entries(TAB_ALIASES) as Array<[TabKey, TabKey]>) {
    if (canonicalKey && base.includes(canonicalKey) && !base.includes(aliasKey)) {
      base.push(aliasKey);
    }
  }
  return base;
}

export function getDefaultLandingTabForRole(role: UserRole): TabKey {
  const allowed = getAllowedTabsForRole(role);
  const landingMap = getSavedRoleDefaultLanding();
  const candidate = landingMap[role] || ROLE_DEFAULT_LANDING[role] || 'cockpit';
  if (allowed.includes(candidate)) return candidate;
  if (allowed.includes('cockpit')) return 'cockpit';
  return allowed[0] || candidate;
}

export interface SystemScreenCatalogItem {
  key: TabKey;
  label: string;
  group: 'DASHBOARD' | 'PLANNING_BRAND' | 'BOOKING_CONTENT' | 'CONTRACTS_FINANCE' | 'SYSTEM_ADMIN' | 'PARTNER_PORTAL';
  groupTitle: string;
  description: string;
}

const BASE_SYSTEM_SCREENS: SystemScreenCatalogItem[] = [
  { key: 'cockpit', label: 'Việc của tôi (Cockpit)', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Không gian làm việc cá nhân, việc cần xử lý trong ngày.' },
  { key: 'dashboard-brand', label: 'Dashboard Thương hiệu & Ngân sách', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi ngân sách 42 thương hiệu B2C.' },
  { key: 'dashboard-air-sync', label: 'Dashboard Lịch Air Tuần & Độ Đồng Loạt', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Đối chiếu lịch air kế hoạch theo tuần (W40–W45) và kiểm soát độ đồng loạt lên sóng thực tế.' },
  { key: 'dashboard-store', label: 'Dashboard Gian hàng & TikTok Seller', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi 69 gian hàng B2C và chỉ số sàn.' },
  { key: 'dashboard-video', label: 'Dashboard Video Booking & Ads', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Theo dõi tiến độ sản xuất & air video KOC.' },
  { key: 'dashboard-team-sla', label: 'Dashboard Tiến độ & SLA Vận hành', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Kiểm soát SLA duyệt deal, kịch bản, gửi mẫu, lên bài.' },
  { key: 'dashboard-staff', label: 'Dashboard Hiệu suất Nhân viên', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Đánh giá năng suất & hiệu quả chi phí theo PIC.' },
  { key: 'dashboard-finance', label: 'Đối soát Kế toán & Xuất file (.xlsx)', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng & Tài Chính', description: 'Đối soát chi phí Order Net/Gross, cảnh báo vượt trần và xuất báo cáo Kế toán.' },
  { key: 'input-plan', label: 'Kế hoạch tháng (Input Plan 4.1)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Lập & duyệt kế hoạch tháng theo gian hàng và khung lương.' },
  { key: 'brand-knowledge', label: 'Hồ sơ thương hiệu (Brand Profile)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Định vị nhãn hàng, pháp nhân, ratecard và quy tắc duyệt.' },
  { key: 'market-research', label: 'Nghiên cứu Brand & Đối thủ', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Bóc tách định vị 4P, lập ma trận đối thủ trực diện, đào bình luận khách hàng và quét trang đích.' },
  { key: 'stores', label: 'Hồ sơ gian hàng (Store Portfolio)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Quản lý danh mục gian hàng TikTok Shop, Shopee Mall.' },
  { key: 'manager', label: 'Điều phối & Quản lý nhân sự', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Phân bổ tải, giao việc PIC và duyệt kế hoạch cấp phòng.' },
  { key: 'task-delegation', label: 'Giao việc & Định mức Task', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Giao việc theo vai trò (PIC/Co-PIC/Execution/Support), cấu hình độ khó Task và Bảng 2b Research.' },
  { key: 'campaigns', label: 'Chiến dịch Brand', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Quản lý chiến dịch, mục tiêu GMV và bàn giao đề bài.' },
  { key: 'push-products', label: 'Sản phẩm trọng tâm (Hero SKU)', group: 'PLANNING_BRAND', groupTitle: '2. Kế Hoạch, Điều Phối & Thương Hiệu', description: 'Danh mục sản phẩm chủ lực theo Brand & Gian hàng, USP, tồn kho và hạn mức hàng mẫu.' },
  { key: 'booking', label: 'Quản lý Booking KOC (Pipeline 5 Bước · Mẫu & Mã Ads)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Tạo deal, duyệt KOC, vận đơn gửi mẫu (Bước 3), thu thập & bàn giao mã Spark Ads (Bước 4) và quyết toán.' },
  { key: 'sample-tracker', label: 'Hàng mẫu & Spark Ads (Đối tác / Trực tiếp)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Theo dõi vận đơn gửi mẫu và thu thập mã quảng cáo Spark Ads trong quy trình Booking.' },
  { key: 'tiktok-crawler', label: 'Crawler KOC & Đối thủ TikTok', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Quét KOC đang làm cho đối thủ, tìm KOC theo #Hashtag và nghiệm thu link video KOC gửi.' },
  { key: 'koc-listing', label: 'Quản lý Deal & Booking', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Đề xuất danh sách KOC theo lô và cập nhật link video.' },
  { key: 'approved-booking-list', label: 'List duyệt book (Chốt ngày air, giá cuối & Tạo BO)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Nhận dòng KOC Brand đã duyệt từ Sheet Listing, điền ngày air dự kiến, chốt giá cuối cùng, tạo Booking Order (BO...) và tự động khớp kênh KOC khi nghiệm thu video.' },
  { key: 'content', label: 'Kịch bản & Video', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Soạn thảo và duyệt kịch bản video KOC / Self-channel.' },
  { key: 'content-angles', label: 'Góc nội dung (Content Angles)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Ma trận trụ cột nội dung & Hook 3s đầu.' },
  { key: 'koc-master', label: 'Danh bạ KOC', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Hồ sơ KOC/KOL, thông tin pháp lý CCCD/MST và lịch sử hợp tác.' },
  { key: 'ctv-master', label: 'Danh bạ CTV / VJ', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Hồ sơ cộng tác viên sản xuất video kênh nội bộ.' },
  { key: 'self-channel-hub', label: 'Video kênh Brand (Self-channel)', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Giao việc & nghiệm thu video kênh tự xây.' },
  { key: 'contracts', label: 'Hợp đồng & Biểu mẫu', group: 'CONTRACTS_FINANCE', groupTitle: '4. Hợp Đồng & Tài Chính', description: 'Soạn hợp đồng, duyệt Pháp chế / Kế toán, trình ký điện tử và quản lý mẫu .docx.' },
  { key: 'ads-report', label: 'Báo cáo Ads TikTok', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Báo cáo hiệu quả chạy quảng cáo GMV, ROAS, CPA.' },
  { key: 'store-air-plan-report', label: 'Báo cáo Kế hoạch & Air Video', group: 'DASHBOARD', groupTitle: '1. Dashboard & Điều Hành', description: 'Báo cáo đối soát thực tế vs kế hoạch gian hàng theo KL, kiểm tra tiến độ air video và quản lý ngân sách chi tiêu.' },
  { key: 'master-data', label: 'Dữ liệu gốc (Master Data)', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Quản trị dữ liệu gốc Brand, Store, KOC, Nhân sự.' },
  { key: 'partner-access', label: 'Phân quyền & Nhân sự (RBAC)', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Quản trị Role, gán quyền nhân sự và kiểm soát cổng đăng nhập.' },
  { key: 'knowledge-qa', label: 'Sổ tay & Hỏi đáp B2C', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Cẩm nang quy trình SLA, khung lương và tính thuế.' },
  { key: 'work-toolkit', label: 'Bộ công cụ tiện ích', group: 'BOOKING_CONTENT', groupTitle: '3. Vận Hành Booking & KOC/CTV', description: 'Kho công cụ tính thuế Gross/Net, ROAS hòa vốn, bóc tách link TikTok/Shopee, tạo VietQR, kiểm tra từ hạn chế TikTok Shop và đếm thời lượng kịch bản.' },
  { key: 'api-settings', label: 'Cấu hình API & Công cụ', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Cấu hình kết nối Kalodata, Lark Base, TikTok Seller.' },
  { key: 'cloudflare-admin', label: 'Quản lý Cloudflare R2', group: 'SYSTEM_ADMIN', groupTitle: '5. Hệ Thống & Quản Trị', description: 'Quản lý kết nối Cloudflare R2 và tệp đính kèm của 42 thương hiệu B2C.' },
  { key: 'brand-hub', label: 'Cổng đối tác Brand', group: 'PARTNER_PORTAL', groupTitle: '6. Cổng Đối Tác Ngoài', description: 'Giao diện dành riêng cho đại diện thương hiệu duyệt KOC & kịch bản.' },
  { key: 'koc-hub', label: 'Cổng đối tác KOC / KOL', group: 'PARTNER_PORTAL', groupTitle: '6. Cổng Đối Tác Ngoài', description: 'Giao diện dành riêng cho Creator cập nhật hồ sơ, ký hợp đồng và nộp bài.' },
];

// Tự động phát hiện bất kỳ màn hình mới nào được khai báo thêm trong TAB_LABELS (src/lib/navGroups.ts)
// để màn hình Phân quyền luôn tự động cập nhật khi hệ thống mở rộng tính năng.
export const ALL_SYSTEM_SCREENS: SystemScreenCatalogItem[] = (() => {
  const knownKeys = new Set<TabKey>(BASE_SYSTEM_SCREENS.map((s) => s.key));
  const hiddenSet = new Set<TabKey>(HIDDEN_SYSTEM_SCREENS);
  const autoDiscovered: SystemScreenCatalogItem[] = [];
  for (const [rawKey, label] of Object.entries(TAB_LABELS) as Array<[TabKey, string]>) {
    if (knownKeys.has(rawKey)) continue;
    if (hiddenSet.has(rawKey)) continue;
    if (rawKey in TAB_ALIASES) continue;
    autoDiscovered.push({
      key: rawKey,
      label,
      group: 'SYSTEM_ADMIN',
      groupTitle: '5. Hệ Thống & Quản Trị',
      description: `Màn hình chức năng ${label}.`,
    });
  }
  return [...BASE_SYSTEM_SCREENS, ...autoDiscovered];
})();

export function getSavedPermissionMatrix(): PermissionMatrixItem[] {
  return serverPolicy?.matrix || INITIAL_PERMISSION_MATRIX;
}

export type RbacAction = 'read' | 'write' | 'create' | 'update' | 'delete' | 'approve' | 'export';

export function canUserPerformAction(
  user: UserProfile | null | undefined,
  featureId: string,
  action: RbacAction = 'read'
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const matrix = getSavedPermissionMatrix();
  const item = matrix.find((p) => p.id === featureId);
  const memberRoles: UserRole[] = [
    'BOOKING_MEMBER',
    'CONTENT_MEMBER',
    'BRAND_MEMBER',
  ];
  const level: PermissionAccessLevel =
    item?.permissions[user.role] ??
    (memberRoles.includes(user.role) ? item?.permissions.MEMBER : undefined) ??
    'DENIED';

  // Kiểm tra quyền đặc thù cá nhân (Special Staff Permissions) được Admin/Manager cấp riêng
  const perms = user.permissions || [];
  if (
    (featureId === 'payment_approval_disbursement' || featureId === 'payment_request_submission' || featureId === 'finance_payment_request') &&
    perms.includes('canApprovePayment')
  ) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (featureId === 'plan_target_month' && perms.includes('canApproveBudget')) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (featureId === 'data_sync_trigger' && perms.includes('canApproveBudget')) {
    if (action === 'read' || action === 'update' || action === 'write') return true;
  }
  if (
    (featureId === 'p3_performance_evaluation' || featureId === 'performance_p3_scoring') &&
    perms.includes('canApproveP3')
  ) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (
    featureId === 'master_data_brand_stores' &&
    perms.includes('canManageMasterData')
  ) {
    return true;
  }
  if (
    featureId === 'raw_data_export' &&
    perms.includes('canExportRawData')
  ) {
    if (action === 'read' || action === 'export' || action === 'write') return true;
  }

  if (action === 'read') return level !== 'DENIED';
  if (action === 'approve') return level === 'APPROVE' || level === 'ALL';
  if (action === 'delete') {
    return level === 'ALL';
  }
  return ['ALL', 'APPROVE', 'SCOPED'].includes(level);
}

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
    defaultLandingTab: 'cockpit',
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
    defaultLandingTab: 'cockpit',
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
    defaultLandingTab: 'cockpit',
    userCount: 6
  },
  ...RBAC_ROLE_DEFINITIONS.slice(6),
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
  LEADER: 'Trưởng nhóm B2C',
  BOOKING_MEMBER: 'Chuyên viên Booking',
  CONTENT_MEMBER: 'Chuyên viên Content',
  BRAND_MEMBER: 'Chuyên viên Brand',
  MEMBER: 'Chuyên viên thực thi',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  SIGN_ADMIN: 'Điều phối ký điện tử',
  BRAND_PARTNER: 'Đại diện thương hiệu',
  KOC_PARTNER: 'Đối tác KOC / Creator',
  CTV_PARTNER: 'Cộng tác viên Self-channel',
};
