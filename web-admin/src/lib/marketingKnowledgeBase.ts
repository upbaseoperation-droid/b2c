// ============================================================================
// HỆ THỐNG TRI THỨC & SỔ TAY NGHIỆP VỤ PHÒNG MARKETING B2C (UPBASE)
// Tổng hợp toàn bộ SOP, SLA, Biểu mẫu Hợp đồng, Thuế, Khung lương KL1-KL7,
// 15 Trụ cột nội dung, 14 Định dạng video, Kịch bản đàm phán & Đánh giá 4P/P3.
// ============================================================================

import { BrandDetail, KocItem, StorePortfolioItem, TabKey } from './types';
import { formatVnd } from './format';

export type KnowledgeCategoryId =
  | 'ALL'
  | 'SOP_BOOKING'
  | 'PLANNING_BUDGET'
  | 'CONTRACTS_TAX_LEGAL'
  | 'KOC_SALARY_MASTER'
  | 'CONTENT_CREATIVE'
  | 'SLA_PLAYBOOK'
  | 'TEAM_ORG_4P'
  | 'BRAND_STORE_GUIDELINES';

export interface KnowledgeCategoryMeta {
  id: Exclude<KnowledgeCategoryId, 'ALL'>;
  label: string;
  shortLabel: string;
  description: string;
  articleCount?: number;
}

export interface KnowledgeArticleSection {
  heading: string;
  body: string[];
  bullets?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
  formula?: string;
  callout?: {
    tone: 'info' | 'warning' | 'critical' | 'positive';
    title: string;
    text: string;
  };
}

export interface KnowledgeArticle {
  id: string;
  code: string;
  title: string;
  category: Exclude<KnowledgeCategoryId, 'ALL'>;
  summary: string;
  sourceDoc: string;
  updatedAt: string;
  applicableRoles: string[];
  tags: string[];
  relatedTab?: TabKey;
  relatedTabLabel?: string;
  keyFacts: { label: string; value: string }[];
  sections: KnowledgeArticleSection[];
  sampleQuestions: string[];
}

export interface KnowledgeFaqItem {
  id: string;
  category: Exclude<KnowledgeCategoryId, 'ALL'>;
  question: string;
  shortAnswer: string;
  detailedSteps?: string[];
  formulaOrRule?: string;
  sourceDoc: string;
  relatedArticleId: string;
  relatedTab?: TabKey;
  relatedTabLabel?: string;
  tags: string[];
}

export interface SlaQuickLookupItem {
  code: string;
  stage: string;
  activity: string;
  deadline: string;
  pic: string;
  escalationRule: string;
  relatedTab: TabKey;
}

export interface SalaryGradeLookupItem {
  grade: string;
  code: string;
  netRange: string;
  benchmarkVnd: number;
  segment: string;
  description: string;
  budgetRule: string;
}

export interface ContractTemplateLookupItem {
  code: string;
  systemCode: string;
  name: string;
  entityType: 'Cá nhân' | 'Hộ kinh doanh' | 'Doanh nghiệp' | 'Cộng tác viên';
  docType: 'Hợp đồng' | 'Biên bản nghiệm thu';
  taxRule: string;
  signingRule: string;
  fileName: string;
}

export interface ObjectionScriptItem {
  id: string;
  situation: string;
  group: 'Đàm phán KOC' | 'Thuyết phục Brand' | 'Vận hành & Sự cố';
  rootCause: string;
  responseStrategy: string;
  sampleMessage: string;
  escalationOrFallback: string;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategoryMeta[] = [
  {
    id: 'SOP_BOOKING',
    label: 'Quy trình Booking & Livestream',
    shortLabel: 'Booking & Live',
    description: 'Quy trình 42 bước Video Booking, 28 bước Livestream Affiliate, 19 trạng thái Pipeline và cấu trúc Job đa sàn.',
  },
  {
    id: 'PLANNING_BUDGET',
    label: 'Kế hoạch tháng & Ngân sách',
    shortLabel: 'Kế hoạch & Ngân sách',
    description: 'Phối hợp 3 bên Growth - B2C - Media, đối soát File 4.1 / 4.1.1 / 3.2, Gross vs Net và 5 chốt chặn ngân sách.',
  },
  {
    id: 'CONTRACTS_TAX_LEGAL',
    label: 'Hợp đồng, Pháp chế & Thuế',
    shortLabel: 'Hợp đồng & Thuế',
    description: 'Bộ 8 biểu mẫu hợp đồng chuẩn, quy định thuế TNCN 10% / HKD 7% / VAT 8-10%, ký số weSign và lịch khóa sổ kế toán.',
  },
  {
    id: 'KOC_SALARY_MASTER',
    label: 'Khung lương KOC & Danh bạ',
    shortLabel: 'Khung lương & KOC',
    description: '9 bậc khung lương KL1–KL7 & TAP, quy tắc trần 45%, tiêu chuẩn Danh bạ KOC Master và chỉ số Kalodata.',
  },
  {
    id: 'CONTENT_CREATIVE',
    label: 'Kịch bản, Pillar & Kênh Brand',
    shortLabel: 'Kịch bản & Content',
    description: '15 trụ cột nội dung, 14 định dạng video, bố cục kịch bản 4 phần, từ khóa cấm và quy trình 12 bước kênh tự xây.',
  },
  {
    id: 'SLA_PLAYBOOK',
    label: 'Mốc SLA & Kịch bản đàm phán',
    shortLabel: 'SLA & Đàm phán',
    description: '21 mốc SLA cam kết, chu kỳ Listing 10-20-30, 20 kịch bản xử lý từ chối KOC và 6 kịch bản thuyết phục Brand.',
  },
  {
    id: 'TEAM_ORG_4P',
    label: 'Cơ cấu tổ chức & Đánh giá 4P',
    shortLabel: 'Tổ chức & 4P',
    description: 'Phân cấp nhân sự phòng B2C, quy tắc gian hàng không có Leader, mô hình Strategy Owner và công thức điểm P3.',
  },
  {
    id: 'BRAND_STORE_GUIDELINES',
    label: 'Hồ sơ Nhãn hàng & Gian hàng',
    shortLabel: 'Nhãn hàng & Gian hàng',
    description: 'Phân cấp quản trị 42 Thương hiệu → 69 Gian hàng B2C, quy tắc bàn giao PIC giữa kỳ và từ cấm theo ngành hàng.',
  },
];

// ============================================================================
// 1. BẢNG TRA CỨU NHANH 21 MỐC SLA TOÀN DIỆN
// ============================================================================
export const SLA_QUICK_REFERENCE: SlaQuickLookupItem[] = [
  {
    code: 'SLA-PLAN-01',
    stage: 'Lập kế hoạch',
    activity: 'Growth giao mục tiêu NMV & hạn mức Order tổng tháng T (File 4.1)',
    deadline: 'Chậm nhất ngày 20 tháng T-1',
    pic: 'Chuyên viên Growth',
    escalationRule: 'Quá hạn ngày 20 báo cáo Trưởng phòng Growth để mở biên bản BB-01',
    relatedTab: 'input-plan',
  },
  {
    code: 'SLA-PLAN-02',
    stage: 'Lập kế hoạch',
    activity: 'Phân rã kế hoạch tác nghiệp 4 chiều (File 4.1.1)',
    deadline: 'Chậm nhất ngày 23 tháng T-1',
    pic: 'Chuyên viên Booking / Trưởng nhóm B2C',
    escalationRule: 'Gian hàng không có Leader trình trực tiếp Trưởng phòng Đặng Thị Yến Nhi',
    relatedTab: 'input-plan',
  },
  {
    code: 'SLA-PLAN-03',
    stage: 'Lập kế hoạch',
    activity: 'Đóng băng kế hoạch gốc (Baseline v1.0) & sinh mã Booking Order',
    deadline: 'Ngày 25 tháng T-1',
    pic: 'Trưởng phòng B2C & Trưởng phòng Growth',
    escalationRule: 'Sau ngày 25 mọi thay đổi ngân sách phải lập Biên bản điều chỉnh BB-02 (v1.1)',
    relatedTab: 'input-plan',
  },
  {
    code: 'SLA-LIST-01',
    stage: 'Đề xuất KOC',
    activity: 'Gửi danh sách KOC Đợt 1 (Phục vụ chiến dịch Mega Double Day)',
    deadline: 'Ngày 10 tháng T-1',
    pic: 'Chuyên viên Booking',
    escalationRule: 'Trễ quá 24h cảnh báo trên Việc của tôi và báo Trưởng nhóm/Trưởng phòng',
    relatedTab: 'koc-listing',
  },
  {
    code: 'SLA-LIST-02',
    stage: 'Đề xuất KOC',
    activity: 'Gửi danh sách KOC Đợt 2 (Phục vụ giai đoạn giữa tháng)',
    deadline: 'Ngày 20 tháng T-1',
    pic: 'Chuyên viên Booking',
    escalationRule: 'Kiểm tra tỷ lệ lấp đầy tối thiểu 70% số lượng video cam kết tháng',
    relatedTab: 'koc-listing',
  },
  {
    code: 'SLA-LIST-03',
    stage: 'Đề xuất KOC',
    activity: 'Gửi danh sách KOC Đợt 3 (Bổ sung bù tỷ lệ từ chối/hủy)',
    deadline: 'Ngày 30 tháng T-1 đến 05 tháng T',
    pic: 'Chuyên viên Booking',
    escalationRule: 'Kích hoạt danh sách KOC dự phòng nếu tỷ lệ duyệt dưới 85%',
    relatedTab: 'koc-listing',
  },
  {
    code: 'SLA-BRAND-01',
    stage: 'Duyệt với nhãn hàng',
    activity: 'Nhãn hàng (Brand) phản hồi duyệt danh sách KOC đề xuất',
    deadline: 'Tối đa 24 – 48 giờ làm việc',
    pic: 'Đại diện thương hiệu / Chuyên viên Brand',
    escalationRule: 'Quá 48h chưa duyệt: Chuyên viên Brand đôn đốc trực tiếp để tránh trễ lịch gửi mẫu',
    relatedTab: 'brand-hub',
  },
  {
    code: 'SLA-KOC-01',
    stage: 'Vận hành Booking',
    activity: 'Tạo nhóm Zalo làm việc chính thức với KOC',
    deadline: 'Trong 24h từ khi nhận job (tối đa 1 ngày sau khi Brand duyệt)',
    pic: 'Chuyên viên Booking',
    escalationRule: 'Đặt tên nhóm chuẩn cú pháp, ghim Brief, timeline và thông tin xuất hóa đơn',
    relatedTab: 'booking',
  },
  {
    code: 'SLA-SAMPLE-01',
    stage: 'Hàng mẫu',
    activity: 'Kho đóng gói & phát hành mã vận đơn gửi hàng mẫu cho KOC',
    deadline: 'Tối đa 24 – 48 giờ từ khi đủ địa chỉ & SĐT',
    pic: 'Bộ phận Kho / Chuyên viên Booking',
    escalationRule: 'Quá 2 ngày chưa gửi báo Growth; quá 3 ngày chưa có mã vận đơn báo Trưởng phòng B2C',
    relatedTab: 'sample-tracker',
  },
  {
    code: 'SLA-SAMPLE-02',
    stage: 'Hàng mẫu',
    activity: 'Thời gian vận chuyển hàng mẫu tới tay KOC',
    deadline: 'Tối đa 5 ngày vận chuyển',
    pic: 'Đơn vị vận chuyển / Chuyên viên Booking',
    escalationRule: 'Quá 5 ngày chưa giao thành công: gửi bù hỏa tốc hoặc đổi sang KOC dự phòng',
    relatedTab: 'sample-tracker',
  },
  {
    code: 'SLA-KOC-02',
    stage: 'Sản xuất nội dung',
    activity: 'KOC nộp kịch bản & video quay nháp (Demo) sau khi nhận hàng mẫu',
    deadline: 'Tối đa 5 ngày (120 giờ) kể từ ngày签 nhận mẫu',
    pic: 'Đối tác KOC / Chuyên viên Booking',
    escalationRule: 'Đếm ngược tự động; ngày thứ 3 nhắc tiến độ; quá 5 ngày cảnh báo vi phạm & thu hồi mẫu',
    relatedTab: 'content',
  },
  {
    code: 'SLA-CONTENT-01',
    stage: 'Duyệt nội dung',
    activity: 'Nội bộ (Booking & Content) rà soát từ cấm & phản hồi kịch bản vòng 1',
    deadline: 'Trong 12 – 24 giờ từ khi KOC gửi bài',
    pic: 'Chuyên viên Content & Booking',
    escalationRule: 'Phải gộp toàn bộ góp ý thành 1 bản duy nhất, không nhắn lẻ tẻ nhiều lần cho KOC',
    relatedTab: 'content',
  },
  {
    code: 'SLA-BRAND-02',
    stage: 'Duyệt nội dung',
    activity: 'Nhãn hàng (Brand) duyệt kịch bản chi tiết',
    deadline: 'Tối đa 24 giờ làm việc',
    pic: 'Đại diện thương hiệu',
    escalationRule: 'Quá 2 ngày báo Account/Brand PIC; quá 3 ngày đề xuất cho KOC quay theo bản nội bộ đã duyệt',
    relatedTab: 'content',
  },
  {
    code: 'SLA-BRAND-03',
    stage: 'Duyệt nội dung',
    activity: 'Nhãn hàng (Brand) duyệt video nháp (Demo)',
    deadline: 'Tối thiểu 02 ngày trước ngày lên sóng (Air date)',
    pic: 'Đại diện thương hiệu',
    escalationRule: 'Nếu Brand phản hồi trễ hơn 2 ngày trước ngày air, phải dời lịch air tương ứng',
    relatedTab: 'content',
  },
  {
    code: 'SLA-LEGAL-01',
    stage: 'Hợp đồng & Pháp chế',
    activity: 'Pháp chế thẩm định điều khoản hợp đồng (khi có chỉnh sửa mẫu chuẩn)',
    deadline: 'Tối đa 24 giờ làm việc',
    pic: 'Bộ phận Pháp chế',
    escalationRule: 'Hợp đồng dùng nguyên mẫu chuẩn (<50 triệu) chuyển thẳng bước Kế toán kiểm tra thuế',
    relatedTab: 'contracts',
  },
  {
    code: 'SLA-FIN-01',
    stage: 'Hợp đồng & Kế toán',
    activity: 'Kế toán rà soát thuế, thông tin STK/MST & khởi tạo luồng ký weSign',
    deadline: 'Tối đa 48 giờ làm việc (Trình ký trước ngày air tối thiểu 01 ngày)',
    pic: 'Kế toán thanh toán',
    escalationRule: 'Nghiêm cấm tuyệt đối ký hợp đồng hồi tố sau khi video đã lên sóng',
    relatedTab: 'contracts',
  },
  {
    code: 'SLA-FIN-02',
    stage: 'Thanh toán',
    activity: 'Giải ngân khoản tạm ứng hoặc thanh toán quyết toán hợp đồng',
    deadline: 'Tối đa 07 ngày làm việc sau khi đủ chữ ký 2 bên & chứng từ',
    pic: 'Kế toán thanh toán',
    escalationRule: 'Sau khi chuyển khoản phải gửi ảnh ủy nhiệm chi vào nhóm Zalo để đóng deal',
    relatedTab: 'contracts',
  },
  {
    code: 'SLA-KOC-03',
    stage: 'Sau lên sóng',
    activity: 'KOC bàn giao link bài đăng & mã ủy quyền quảng cáo Spark Ads',
    deadline: 'Trong cùng ngày video lên sóng (Hiệu lực mã Ads 30 – 60 ngày)',
    pic: 'Đối tác KOC / Chuyên viên Booking',
    escalationRule: 'Thiếu mã Spark Ads không đủ điều kiện ký Biên bản nghiệm thu (BBNT)',
    relatedTab: 'sample-tracker',
  },
  {
    code: 'SLA-DATA-01',
    stage: 'Dữ liệu & Báo cáo',
    activity: 'Cập nhật link video air ngày T-1 lên danh sách theo dõi (File 3.2)',
    deadline: 'Trước 10h00 sáng ngày hôm sau',
    pic: 'Chuyên viên Booking',
    escalationRule: 'Sau 7 ngày kể từ ngày air hệ thống tự động khóa dòng dữ liệu',
    relatedTab: 'booking',
  },
  {
    code: 'SLA-REC-01',
    stage: 'Nghiệm thu tháng',
    activity: 'Khóa danh sách nghiệm thu tháng định kỳ trên File 3.2',
    deadline: 'Ngày mùng 02 hàng tháng',
    pic: 'Toàn bộ Chuyên viên Booking',
    escalationRule: 'Cố định số lượng video đã air của tháng trước để đối soát với Kế toán & Brand',
    relatedTab: 'dashboard-finance',
  },
  {
    code: 'SLA-REC-02',
    stage: 'Nghiệm thu tháng',
    activity: 'Mở cổng chỉnh sửa số liệu nghiệm thu với Kế toán (2 đợt/tháng)',
    deadline: '09h00 – 17h00 Ngày làm việc thứ 5 (Đợt 1) & thứ 11 (Đợt 2)',
    pic: 'Kế toán & Chuyên viên Booking',
    escalationRule: 'Đúng 17h30 hệ thống khóa sổ hoàn toàn, các ca thiếu chứng từ chuyển sang kỳ sau',
    relatedTab: 'dashboard-finance',
  },
];

// ============================================================================
// 2. BẢNG TRA CỨU NHANH 9 KHUNG LƯƠNG CREATOR (KL1 - KL7 & TAP)
// ============================================================================
export const SALARY_GRADE_QUICK_REFERENCE: SalaryGradeLookupItem[] = [
  {
    grade: 'TAP UpAffiliate',
    code: 'TAP',
    netRange: '0 đ (Hoa hồng sàn)',
    benchmarkVnd: 0,
    segment: 'Massive Creator',
    description: 'Mạng lưới nhà sáng tạo tự do nhận hoa hồng tiếp thị liên kết (Affiliate Commission), không tốn phí cứng.',
    budgetRule: 'Không tính vào trần chi phí cứng (Paid Cast), chỉ theo dõi chi phí hàng mẫu nếu có.',
  },
  {
    grade: 'Khung lương 1',
    code: 'KL1',
    netRange: '≤ 500.000 đ',
    benchmarkVnd: 250000,
    segment: 'Massive Creator',
    description: 'Suất gửi mẫu miễn phí (FOC 0đ) hoặc hỗ trợ chi phí quay dựng nhỏ cho Nano KOC.',
    budgetRule: 'Tách bạch rõ suất FOC (0đ, do chuyên viên riêng như Trần Thị Hảo phụ trách) và suất có trả phí.',
  },
  {
    grade: 'Khung lương 2',
    code: 'KL2',
    netRange: '500.001 – 1.500.000 đ',
    benchmarkVnd: 1000000,
    segment: 'Massive Creator',
    description: 'Micro KOC mới nổi, tệp người xem ngách, phù hợp phủ số lượng bài đánh giá thực tế và tạo nguyên liệu chạy Ads.',
    budgetRule: 'Nhóm chủ lực để lấp đầy số lượng video cam kết trong tháng với chi phí thấp.',
  },
  {
    grade: 'Khung lương 3',
    code: 'KL3',
    netRange: '1.500.001 – 3.000.000 đ',
    benchmarkVnd: 2500000,
    segment: 'Massive Creator',
    description: 'Micro KOC có tương tác ổn định, kỹ năng quay dựng và nói chuyện tự nhiên, tỷ lệ chuyển đổi đơn hàng tốt.',
    budgetRule: 'Khấu trừ 10% thuế TNCN tại nguồn nếu tổng giá trị thanh toán từ 2.000.000 đ trở lên.',
  },
  {
    grade: 'Khung lương 4',
    code: 'KL4',
    netRange: '3.000.001 – 5.000.000 đ',
    benchmarkVnd: 4500000,
    segment: 'Mid Creator',
    description: 'Mid-tier KOC có định hình phong cách rõ rệt, hình ảnh chỉn chu, phù hợp làm video Hero SKU.',
    budgetRule: 'Bắt đầu tính vào nhóm KOC lớn (≥ KL4). Tổng chi phí nhóm ≥ KL4 không vượt quá 45% ngân sách.',
  },
  {
    grade: 'Khung lương 5',
    code: 'KL5',
    netRange: '5.000.001 – 10.000.000 đ',
    benchmarkVnd: 8500000,
    segment: 'Mid Creator',
    description: 'Macro KOC có độ phủ rộng trong ngành Làm đẹp / Mẹ & Bé / Đời sống, giữ vai trò dẫn dắt xu hướng.',
    budgetRule: 'Bắt buộc kiểm tra kỹ chỉ số GPM và lịch sử GMV 30 ngày trên Kalodata trước khi trình duyệt.',
  },
  {
    grade: 'Khung lương 6',
    code: 'KL6',
    netRange: '10.000.001 – 30.000.000 đ',
    benchmarkVnd: 22000000,
    segment: 'Key Creator',
    description: 'Chuyên gia, Bác sĩ, Dược sĩ, KOL uy tín cao tạo bảo chứng thương hiệu (Key Opinion Leader).',
    budgetRule: 'Trưởng phòng B2C và Nhãn hàng duyệt trực tiếp; kiểm soát chặt điều khoản độc quyền và thời hạn sử dụng hình ảnh.',
  },
  {
    grade: 'Khung lương 7',
    code: 'KL7',
    netRange: '> 30.000.000 đ',
    benchmarkVnd: 55000000,
    segment: 'Top Creator',
    description: 'Người nổi tiếng (Celebrity), Đại sứ thương hiệu hoặc Mega Livestreamer.',
    budgetRule: 'Hợp đồng từ 50 triệu đồng trở lên được phép xem xét mẫu hợp đồng của đối tác nhưng bắt buộc Pháp chế & Kế toán thẩm định.',
  },
  {
    grade: 'TAP Đối tác ngoài',
    code: 'TAP_EXT',
    netRange: 'Thỏa thuận hoa hồng cao',
    benchmarkVnd: 0,
    segment: 'Key Creator',
    description: 'Đối tác MCN hoặc KOL bên ngoài hợp tác theo mô hình chia sẻ doanh thu / hoa hồng đặc biệt.',
    budgetRule: 'Theo dõi riêng theo điều khoản đối soát hoa hồng trên TikTok Shop Seller Center.',
  },
];

// ============================================================================
// 3. BẢNG TRA CỨU NHANH 8 BIỂU MẪU HỢP ĐỒNG & CHÍNH SÁCH THUẾ
// ============================================================================
export const CONTRACT_TAX_QUICK_REFERENCE: ContractTemplateLookupItem[] = [
  {
    code: '1.1.1',
    systemCode: 'IND-HD',
    name: 'Hợp đồng dịch vụ video · Cá nhân',
    entityType: 'Cá nhân',
    docType: 'Hợp đồng',
    taxRule: 'Khấu trừ 10% thuế TNCN tại nguồn nếu tổng chi trả ≥ 2.000.000 đ (Gross = Net / 0,9)',
    signingRule: 'Bắt buộc dùng mẫu chuẩn Upbase cho HĐ < 50 triệu; ký trước ngày air tối thiểu 01 ngày',
    fileName: '1.1.1. BM.HĐ.VID.IND.Ver052026 booking Video.docx',
  },
  {
    code: '1.1.2',
    systemCode: 'IND-BBNT',
    name: 'Biên bản nghiệm thu video · Cá nhân',
    entityType: 'Cá nhân',
    docType: 'Biên bản nghiệm thu',
    taxRule: 'Đối chiếu đúng số tiền Gross, thuế TNCN 10% khấu trừ và số thực nhận Net trên hợp đồng 1.1.1',
    signingRule: 'Ký sau khi video đã lên sóng, đủ link bài đăng và mã ủy quyền Spark Ads',
    fileName: '1.1.2. BM.BBNT.VID.IND.Ver052026 booking Video.docx',
  },
  {
    code: '2.1.1',
    systemCode: 'HKD-HD',
    name: 'Hợp đồng dịch vụ video · Hộ kinh doanh',
    entityType: 'Hộ kinh doanh',
    docType: 'Hợp đồng',
    taxRule: 'Thuế khoán HKD 7% (5% GTGT + 2% TNCN theo TT 40/2021/TT-BTC). HKD xuất hóa đơn bán hàng',
    signingRule: 'Cần bản chụp ĐKKD Hộ kinh doanh và giấy tờ tùy thân người đại diện',
    fileName: '2.1.1. BM.HĐ.VID.HKD.Ver052026 booking Video.docx',
  },
  {
    code: '2.1.2',
    systemCode: 'HKD-BBNT',
    name: 'Biên bản nghiệm thu video · Hộ kinh doanh',
    entityType: 'Hộ kinh doanh',
    docType: 'Biên bản nghiệm thu',
    taxRule: 'Ngày xuất hóa đơn của HKD phải trùng khớp với ngày ký Biên bản nghiệm thu 2.1.2',
    signingRule: 'Kế toán kiểm tra hóa đơn nháp trước khi đối tác phát hành hóa đơn chính thức',
    fileName: '2.1.2. BM.BBNT.VID.HKD.Ver052026 booking Video.docx',
  },
  {
    code: '3.1.1',
    systemCode: 'COM-HD',
    name: 'Hợp đồng dịch vụ video · Doanh nghiệp',
    entityType: 'Doanh nghiệp',
    docType: 'Hợp đồng',
    taxRule: 'Xuất hóa đơn GTGT (VAT 8% hoặc 10% tùy ngành dịch vụ). Kế toán kiểm soát hạn mức theo giá Net chưa VAT',
    signingRule: 'Ký số qua MISA AMIS weSign bởi người đại diện pháp luật hoặc người được ủy quyền hợp lệ',
    fileName: '3.1.1. BM.HĐ.VID.COM.Ver052026 booking video.docx',
  },
  {
    code: '3.1.2',
    systemCode: 'COM-BBNT',
    name: 'Biên bản nghiệm thu video · Doanh nghiệp',
    entityType: 'Doanh nghiệp',
    docType: 'Biên bản nghiệm thu',
    taxRule: 'Kiểm tra khớp Tên công ty, Mã số thuế, Địa chỉ, Ngày hóa đơn trùng ngày BBNT và tổng tiền thanh toán',
    signingRule: 'KOC/MCN ký BBNT → Trưởng phòng B2C & Giám đốc ký → Phát hành hóa đơn điện tử → Lập ĐNTT',
    fileName: '3.1.2. BM.BBNT.VID.COM.Ver052026 boooking video.docx',
  },
  {
    code: '4.1',
    systemCode: 'CTV-HD',
    name: 'Hợp đồng nguyên tắc sản xuất video tháng · CTV',
    entityType: 'Cộng tác viên',
    docType: 'Hợp đồng',
    taxRule: 'Khấu trừ 10% thuế TNCN nếu tổng thù lao nghiệm thu trong tháng từ 2.000.000 đ trở lên',
    signingRule: 'Ký 1 lần làm khung pháp lý cho cộng tác viên / VJ sản xuất video kênh thương hiệu (Self-channel)',
    fileName: '4.1. BM.HĐVID.CTV.Ver052026 Upbase HĐNT booking CTV Video tháng.docx',
  },
  {
    code: '4.2',
    systemCode: 'CTV-BBNT',
    name: 'Biên bản nghiệm thu sản lượng video tháng · CTV',
    entityType: 'Cộng tác viên',
    docType: 'Biên bản nghiệm thu',
    taxRule: 'Chốt tổng số lượng clip đạt chuẩn nghiệm thu trong tháng × đơn giá định mức CTV',
    signingRule: 'Chốt định kỳ cuối tháng để thanh toán thù lao sản xuất kênh tự xây',
    fileName: '4.2. BM.BBNTVID.CTV.Ver052026 Upbase BBNT booking Video tháng.docx',
  },
];

// ============================================================================
// 4. BỘ KỊCH BẢN XỬ LÝ TỪ CHỐI KOC & THUYẾT PHỤC BRAND THỰC CHIẾN
// ============================================================================
export const OBJECTION_SCRIPTS_REFERENCE: ObjectionScriptItem[] = [
  {
    id: 'obj-01',
    situation: 'KOC báo giá cao hơn ngân sách khung lương của gian hàng',
    group: 'Đàm phán KOC',
    rootCause: 'KOC報 giá lẻ 1 video hoặc cộng sẵn phí giữ độc quyền / phí chạy Ads dài hạn.',
    responseStrategy: 'Đề xuất gói hợp tác nhiều video (Combo 2-3 clip) hoặc cam kết booking định kỳ hàng tháng; kết hợp nâng mức hoa hồng Affiliate (Commission) để giảm phí cứng (Fixed Cast).',
    sampleMessage: 'Dạ ngân sách phí cứng đợt này của nhãn đang khóa ở mức [X] đ cho khung Micro/Mid, nhưng bên em có thể mở mức hoa hồng giỏ hàng riêng cho kênh mình lên [Y]% (cao hơn mức sàn 5%) và cam kết đẩy ngân sách Spark Ads ngay khi bài lên sóng để kéo GMV cho kênh ạ.',
    escalationOrFallback: 'Nếu KOC chỉ giảm nhẹ 10-15%: giảm phạm vi mua quyền sử dụng hình ảnh xuống 30 ngày thay vì 60 ngày.',
  },
  {
    id: 'obj-02',
    situation: 'KOC ngại nhận vì sản phẩm mới lên sàn, chưa có lượt bán và đánh giá',
    group: 'Đàm phán KOC',
    rootCause: 'KOC sợ gắn giỏ hàng sản phẩm mới khó ra đơn, ảnh hưởng tỷ lệ chuyển đổi của kênh.',
    responseStrategy: 'Cung cấp bộ giấy tờ công bố chất lượng, kế hoạch phủ 30-50 video đồng loạt của nhãn trong tháng và mã giảm giá độc quyền cho người xem của KOC.',
    sampleMessage: 'Dạ dòng này là SKU chiến lược tháng 10 của nhãn, bên em đang đồng loạt lên 40 video cùng đợt Mega Day và đội Media đã chuẩn bị gói ngân sách Ads riêng để bơm lưu lượng cho các video đầu tiên. Em gửi mình xem trước giấy công bố và bộ deal độc quyền cho kênh nhé ạ.',
    escalationOrFallback: 'Ưu tiên trả phí cứng (Paid Cast) hợp lý thay vì ép KOC nhận thuần hoa hồng cho SKU mới.',
  },
  {
    id: 'obj-03',
    situation: 'KOC từ chối cấp mã ủy quyền quảng cáo (Spark Ads Code)',
    group: 'Đàm phán KOC',
    rootCause: 'KOC sợ chạy Ads làm hỏng tệp người xem tự nhiên của kênh hoặc sợ nhãn hàng chạy quá hạn.',
    responseStrategy: 'Giải thích rõ cơ chế Spark Ads chỉ phân phối tới đúng tệp khách hàng mục tiêu mua hàng, tăng lượt xem và hoa hồng giỏ hàng cho chính KOC; ghi rõ thời hạn hiệu lực mã 30–60 ngày trong hợp đồng.',
    sampleMessage: 'Dạ mã Spark Ads bên em chỉ dùng để đẩy thêm lượt hiển thị cho chính video trên kênh của mình tới tệp khách đang tìm mua sản phẩm, giúp tăng đơn trong giỏ hàng của mình chứ không can thiệp chỉnh sửa nội dung. Trong hợp đồng mục 3.2 bên em cũng khóa rõ hạn mã đúng 30 ngày thôi ạ.',
    escalationOrFallback: 'Nếu KOC vẫn từ chối cấp mã Ads mà gian hàng bắt buộc cần nguyên liệu chạy Ads: chuyển sang phương án mua file gốc (Production-only) hoặc đổi KOC.',
  },
  {
    id: 'obj-04',
    situation: 'KOC đang vướng cam kết độc quyền với nhãn hàng đối thủ',
    group: 'Đàm phán KOC',
    rootCause: 'KOC vừa lên bài cho đối thủ cùng phân khúc trong vòng 7–30 ngày.',
    responseStrategy: 'Hỏi rõ phạm vi độc quyền (độc quyền toàn bộ thương hiệu hay chỉ độc quyền 1 dòng sản phẩm như kem chống nắng/sữa rửa mặt) và ngày hết hạn độc quyền.',
    sampleMessage: 'Dạ bên mình đang khóa độc quyền cho dòng sản phẩm nào và tới ngày mấy hết hạn vậy ạ? Nếu chỉ khóa dòng chống nắng thì đợt này bên em chuyển sang gửi mẫu dòng kem dưỡng phục hồi B5 hoặc xếp lịch air cho mình vào Đợt 3 cuối tháng sau khi hết hạn độc quyền nhé ạ.',
    escalationOrFallback: 'Ghi chú ngày hết hạn độc quyền vào Danh bạ KOC Master để đặt lịch mời lại vào tháng T+1.',
  },
  {
    id: 'obj-05',
    situation: 'KOC từ chối nhận hàng mẫu miễn phí (FOC 0đ) vì chỉ nhận job có cast',
    group: 'Đàm phán KOC',
    rootCause: 'Kênh KOC đã tăng trưởng lên nhóm KL2/KL3 nhưng vẫn được mời theo danh sách FOC.',
    responseStrategy: 'Kiểm tra lại chỉ số GMV 30 ngày và GPM trên Kalodata. Nếu kênh thực sự đạt chuẩn KL2/KL3 thì chuyển hồ sơ sang danh sách đề xuất Paid KOC; nếu chỉ số thấp thì giữ nguyên phương án hoa hồng cao.',
    sampleMessage: 'Dạ em vừa kiểm tra lại chỉ số kênh mình tháng này tăng trưởng rất tốt. Để em đề xuất đưa kênh mình vào danh sách có chi phí sản xuất Đợt 2 của nhãn vào ngày 20 tới, còn nếu tuần này mình tiện ghép đơn livestream thì bên em gửi tặng bộ sản phẩm trải nghiệm trước ạ.',
    escalationOrFallback: 'Cập nhật lại đúng Khung lương (KL2/KL3) của KOC trong Danh bạ KOC để chuyên viên FOC không mời nhầm.',
  },
  {
    id: 'obj-06',
    situation: 'KOC đã nhận hàng mẫu quá 3 ngày nhưng im lặng, chưa gửi kịch bản/video nháp',
    group: 'Vận hành & Sự cố',
    rootCause: 'KOC quên lịch, quá tải job hoặc có dấu hiệu trễ SLA 5 ngày (120h).',
    responseStrategy: 'Nhắc lịch theo mốc: Ngày thứ 2 hỏi thăm trải nghiệm sản phẩm; Ngày thứ 3 nhắc hạn nộp kịch bản; Ngày thứ 4 gọi điện trực tiếp; Quá 5 ngày kích hoạt cảnh báo vi phạm SLA.',
    sampleMessage: 'Dạ [Tên KOC] ơi, đơn hàng mẫu [Tên SP] bên mình đã nhận từ hôm [Ngày]. Theo cam kết trong hợp đồng, hạn gửi bản quay nháp (Demo) là trước 17h ngày mai để kịp trình nhãn hàng duyệt trước ngày air 2 ngày. Mình gửi bản nháp vào nhóm giúp em nhé ạ!',
    escalationOrFallback: 'Quá 5 ngày (120h) không phản hồi: Tạm khóa giải ngân, yêu cầu hoàn trả hàng mẫu và gắn cờ cảnh báo trên Danh bạ KOC.',
  },
  {
    id: 'obj-07',
    situation: 'Nhãn hàng (Brand) chê KOC trong danh sách đề xuất "ít người theo dõi" hoặc "kênh nhỏ"',
    group: 'Thuyết phục Brand',
    rootCause: 'Brand nhìn vào tổng lượng Follower thay vì nhìn vào chỉ số chuyển đổi đơn hàng (GPM, GMV 30 ngày, tỷ lệ xem thật).',
    responseStrategy: 'Trình bày số liệu thực tế từ Kalodata: GPM (doanh thu trên 1.000 lượt xem), tỷ lệ tương tác trên mỗi video và chiến thuật kết hợp nhóm Micro KOC (KL2-KL3) để tối ưu CIR ≤ 15-18%.',
    sampleMessage: 'Dạ kênh này tuy lượng theo dõi ở mức 25.000 nhưng chỉ số GPM trên Kalodata đạt 480.000đ/1.000 view và 30 ngày qua tạo ra hơn 120 triệu GMV cho ngành hàng chăm sóc da. Nhóm KL2-KL3 này có tệp người xem mua hàng thật và giúp giữ tỷ lệ chi phí CIR của gian hàng dưới ngưỡng 15% ạ.',
    escalationOrFallback: 'Đính kèm 2 link video bán hàng hiệu quả nhất của KOC đó trong 30 ngày gần nhất vào cột Ghi chú đề xuất.',
  },
  {
    id: 'obj-08',
    situation: 'Nhãn hàng (Brand) yêu cầu nhồi nhét quá nhiều thông tin công dụng vào 1 video 60 giây',
    group: 'Thuyết phục Brand',
    rootCause: 'Brand muốn nói hết 5-6 thành phần và công dụng trong cùng 1 clip, làm mất tính tự nhiên và giảm tỷ lệ giữ chân 3 giây đầu.',
    responseStrategy: 'Áp dụng quy tắc "Mỗi video 1 Góc tiếp cận (Content Angle) và 1 Nỗi đau chính"; chia các thông điệp còn lại sang các KOC khác trong cùng đợt chạy.',
    sampleMessage: 'Dạ trên TikTok thời lượng giữ chân người xem quyết định ở 3 giây đầu. Nếu đưa cả 5 công dụng vào 1 clip sẽ giống video đọc quảng cáo, người xem dễ lướt qua. Bên em đã phân bổ 5 công dụng này thành 5 Góc tiếp cận riêng cho 10 KOC trong đợt này để mỗi video đánh sâu vào đúng 1 nỗi đau khách hàng ạ.',
    escalationOrFallback: 'Mở màn hình Góc tiếp cận để cho Brand thấy ma trận phân bổ thông điệp trên tổng thể các video trong tháng.',
  },
];

// ============================================================================
// 5. KHO TÀI LIỆU & QUY TRÌNH CHI TIẾT (KNOWLEDGE ARTICLES)
// ============================================================================
export const MARKETING_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb-sop-booking-42',
    code: 'QT-B2C-BOOK-01',
    title: 'Quy trình Booking Video KOC 42 bước & 19 trạng thái Pipeline',
    category: 'SOP_BOOKING',
    summary: 'Quy trình tác nghiệp chuẩn từ lúc nhận đề bài, lên danh sách KOC, đàm phán, ký hợp đồng weSign, gửi mẫu 48h, duyệt kịch bản/video nháp đến khi air bài, lấy mã Spark Ads và nghiệm thu thanh toán.',
    sourceDoc: 'Quy trình Booking - Tech.md & Quy trinh Van hanh va Quan ly KOC B2C (To-Be).md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Trưởng phòng B2C', 'Trưởng nhóm B2C', 'Chuyên viên Booking', 'Chuyên viên Content', 'Kế toán'],
    tags: ['booking', '42 bước', 'pipeline', 'zalo', 'spark ads', 'video nháp', 'demo', 'bo', 'nghiệm thu'],
    relatedTab: 'booking',
    relatedTabLabel: 'Mở màn Booking',
    keyFacts: [
      { label: 'Chu kỳ đề xuất KOC', value: 'Ngày 10 - 20 - 30' },
      { label: 'Hạn tạo nhóm Zalo', value: '≤ 24h sau khi nhận job' },
      { label: 'Hạn gửi mẫu & nộp nháp', value: '48h xuất kho · 5 ngày nộp demo' },
      { label: 'Khóa sổ nghiệm thu', value: 'Ngày 02 hàng tháng' },
    ],
    sections: [
      {
        heading: '1. Năm chặng vận hành cốt lõi trong quy trình 42 bước',
        body: [
          'Toàn bộ vòng đời của một đơn Booking Video tại phòng Marketing B2C được chia thành 5 chặng liên hoàn có kiểm soát SLA tại từng điểm bàn giao:',
        ],
        bullets: [
          'Chặng 1 — Tiếp nhận kỳ vọng & Lập danh sách (Bước 1–13): Nhận hạn mức từ Growth, Content soạn Brief & chân dung KOC (SLA 1–2 ngày), Booking lọc danh sách từ Danh bạ KOC Master & Kalodata, nội bộ rà soát trước khi trình Brand duyệt (SLA 24–48h).',
          'Chặng 2 — Liên hệ, Đàm phán & Chốt Deal (Bước 14–19): Liên hệ KOC, đàm phán thù lao Net/Gross, quyền sử dụng hình ảnh, thời hạn mã Spark Ads và chốt lịch lên sóng.',
          'Chặng 3 — Lập nhóm Zalo, Gửi mẫu & Ký hợp đồng (Bước 20–33): Tạo nhóm Zalo trong 24h, khởi tạo mã Booking Order (BO), xuất kho gửi mẫu trong 48h, soạn hợp đồng theo 8 mẫu chuẩn và hoàn tất ký số trước ngày air tối thiểu 01 ngày.',
          'Chặng 4 — Sản xuất nội dung, Duyệt Demo & Lên sóng (Bước 34–45): KOC nộp kịch bản & video nháp trong 5 ngày (120h) từ khi nhận mẫu; Nội bộ & Brand duyệt (tối thiểu 2 ngày trước ngày air); KOC đăng bài và cấp mã Spark Ads ngay trong ngày air.',
          'Chặng 5 — Hoàn thiện chứng từ, Nghiệm thu & Giải ngân (Bước 46–66): Ký Biên bản nghiệm thu (BBNT), đối tác HKD/Công ty xuất hóa đơn trùng ngày BBNT, lập Đề nghị thanh toán (ĐNTT), khóa sổ ngày mùng 2 hàng tháng và giải ngân trong 7 ngày làm việc.',
        ],
      },
      {
        heading: '2. Quy tắc chuẩn hóa nhóm Zalo làm việc với KOC',
        body: [
          'Mỗi KOC khi chốt hợp tác phải có nhóm Zalo làm việc riêng để lưu vết thỏa thuận, gửi mẫu và nhận chứng từ thanh toán:',
        ],
        bullets: [
          'Thời hạn tạo nhóm: Tối đa 24 giờ kể từ khi nhận job hoặc tối đa 01 ngày sau khi Brand duyệt danh sách.',
          'Thành phần bắt buộc trong nhóm: Đối tác KOC (hoặc quản lý), Chuyên viên Booking phụ trách, Chuyên viên Content kiểm duyệt (và tài khoản vận hành Upbase).',
          'Thông tin bắt buộc ghim đầu nhóm: Bản Brief sản phẩm, các từ khóa cấm của nhãn hàng, mốc thời gian nộp kịch bản/video nháp, ngày lên sóng cam kết và hướng dẫn cung cấp thông tin ký hợp đồng.',
        ],
      },
      {
        heading: '3. Mười chín (19) trạng thái Pipeline chuẩn trên hệ thống',
        body: [
          'Chuyên viên Booking cập nhật đúng trạng thái thực tế của từng deal để hệ thống tính toán tiến độ và cảnh báo SLA:',
        ],
        table: {
          headers: ['Nhóm chặng', 'Các trạng thái Pipeline chuẩn', 'Điều kiện chuyển bước'],
          rows: [
            ['Tiếp cận & Thương lượng (1–6)', '1. Chưa liên hệ → 2. Đã liên hệ → 3. Đã phản hồi → 4. Đang thương lượng → 5. Chờ duyệt → 6. Chốt hợp tác', 'Brand đã duyệt & KOC xác nhận đơn giá, timeline'],
            ['Pháp lý & Hàng mẫu (7–9)', '7. Hoàn thiện hồ sơ hợp tác → 8. Tạm ứng → 9. Gửi / nhận sản phẩm', 'Đủ CCCD/MST, ký HĐ trước air ≥1 ngày, có mã vận đơn trong 48h'],
            ['Sản xuất & Lên sóng (10–14)', '10. Đang sản xuất nội dung → 11. Duyệt nội dung → 12. Chờ Air → 13. Đã Air → 14. Quyền Ads / Usage', 'KOC nộp demo ≤5 ngày nhận mẫu, cấp mã Spark Ads ngay ngày air'],
            ['Nghiệm thu & Tất toán (15–19)', '15. Chờ nghiệm thu → 16. Hồ sơ thanh toán → 17. Thanh toán → 18. Hoàn tất (hoặc 19. Tạm dừng / Hủy)', 'Ký BBNT, khớp hóa đơn điện tử, kế toán chuyển khoản & gửi UNC'],
          ],
        },
      },
    ],
    sampleQuestions: [
      'Quy trình booking 1 KOC từ lúc lên danh sách đến lúc thanh toán gồm mấy chặng?',
      'Khi nào phải tạo nhóm Zalo với KOC và cần ghim thông tin gì?',
      'Hạn nộp video nháp sau khi KOC nhận hàng mẫu là bao nhiêu ngày?',
    ],
  },
  {
    id: 'kb-sop-livestream-28',
    code: 'QT-B2C-LIVE-02',
    title: 'Quy trình Booking Livestream Affiliate 28 bước (T-3 đến T+3)',
    category: 'SOP_BOOKING',
    summary: 'Quy trình phối hợp giữa Growth, Booking, Content và Media để chuẩn bị giỏ hàng, cài đặt voucher, thống nhất kịch bản Key Live / Daily Live, trực phiên live và nghiệm thu doanh số sau phiên.',
    sourceDoc: 'Quy trình Booking - Tech.md (Mục Livestream Affiliate)',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Booking', 'Chuyên viên Growth', 'Chuyên viên Content', 'Chuyên viên Media'],
    tags: ['livestream', 'live', 'affiliate', 'key live', 'daily live', 'add-in', 'dedicated live', 'voucher', 'giỏ hàng'],
    relatedTab: 'booking',
    relatedTabLabel: 'Mở màn Booking',
    keyFacts: [
      { label: 'Mốc chuẩn bị Live Sheet', value: 'T-3 trước ngày lên sóng' },
      { label: 'Mốc chốt Deal sàn & Ads', value: 'T-2 đến T-1' },
      { label: 'Định dạng phiên Live', value: 'Dedicated · Add-in · Daily' },
      { label: 'Mốc nghiệm thu phiên Live', value: 'T+1 đến T+3 sau phiên' },
    ],
    sections: [
      {
        heading: '1. Phân loại 3 hình thức Livestream B2C',
        body: [
          'Tùy theo mục tiêu chiến dịch và ngân sách của gian hàng, hoạt động Livestream được chia thành 3 định dạng:',
        ],
        bullets: [
          'Livestream Độc quyền (Dedicated Live): Phiên live dành riêng 100% thời lượng cho 1 nhãn hàng, thường áp dụng trong ngày Mega Sale với Key KOL/KOC.',
          'Livestream Ghép giỏ (Add-in Live): Gắn sản phẩm chủ lực (Hero SKU) của nhãn hàng vào phiên live tổng hợp nhiều thương hiệu của Creator lớn (sử dụng từ 5–15 phút giới thiệu mỗi SKU).',
          'Livestream Thường nhật (Daily Live): Phiên live duy trì đều đặn trên kênh gian hàng thương hiệu do CTV / VJ nội bộ đảm nhận.',
        ],
      },
      {
        heading: '2. Lịch trình tác nghiệp theo mốc T-3 đến T+3',
        body: [
          'Mọi phiên Livestream có trả phí (Paid Live) hoặc cam kết GMV phải tuân thủ chặt chẽ lịch kiểm tra trước, trong và sau phiên:',
        ],
        table: {
          headers: ['Mốc thời gian', 'Hạng mục công việc bắt buộc', 'Bộ phận chịu trách nhiệm'],
          rows: [
            ['T-3 (Trước 3 ngày)', 'Lập nhóm điều phối phiên Live; hoàn thiện bảng Live Sheet (danh sách SKU, giá gốc, giá tung deal, tỷ lệ hoa hồng CMS, mã voucher, quà tặng kèm).', 'Booking & Growth'],
            ['T-2 (Trước 2 ngày)', 'Thống nhất kịch bản chi tiết từng khung giờ (đối với Key Live) hoặc khung sườn nội dung (đối với Daily Live); kiểm tra hàng mẫu trưng bày tại phòng live.', 'Content & KOC'],
            ['T-1 (Trước 1 ngày)', 'Cài đặt liên kết hoa hồng (Target Plan) trên Seller Center, kiểm tra tồn kho khóa riêng cho phiên live, nạp ngân sách quảng cáo Live Ads.', 'Growth, Booking & Media'],
            ['Giờ G (Trực phiên)', 'Giám sát trực tiếp: kiểm tra ghim sản phẩm, tung voucher đúng giờ, kiểm soát lời nói của Host không vi phạm từ cấm sàn, ghi nhật ký sự cố.', 'Booking & Media'],
            ['T+1 đến T+3', 'Thu thập video ghi hình (Replay), xuất báo cáo GMV thực tế, số đơn hàng, lượt nhấp giỏ hàng và làm biên bản nghiệm thu thanh toán.', 'Booking & Kế toán'],
          ],
        },
      },
    ],
    sampleQuestions: [
      'Quy trình chuẩn bị trước phiên Livestream T-3, T-2, T-1 cần làm những gì?',
      'Sự khác nhau giữa Dedicated Live, Add-in Live và Daily Live là gì?',
    ],
  },
  {
    id: 'kb-plan-breakdown-3party',
    code: 'QT-UPB-B2C-PLAN-01',
    title: 'Quy trình Phân rã Kế hoạch tháng B2C & Phối hợp 3 bên (Growth – B2C – Media)',
    category: 'PLANNING_BUDGET',
    summary: 'Chuẩn hóa cơ chế giao nhận chỉ tiêu từ Growth sang Marketing B2C và Media, phân rã 4 chiều, đóng băng Baseline v1.0 vào ngày 25/T-1 và quản lý điều chỉnh qua biên bản điện tử BB-01, BB-02.',
    sourceDoc: 'docs/QUY_TRINH_PHAN_RA_KE_HOACH_B2C.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Trưởng phòng B2C', 'Trưởng phòng Growth', 'Trưởng phòng Media', 'Trưởng nhóm B2C', 'Chuyên viên Booking'],
    tags: ['kế hoạch tháng', '4.1', '4.1.1', 'phân rã', 'baseline', 'v1.0', 'bb-01', 'bb-02', 'growth', 'media', 'ngân sách ads'],
    relatedTab: 'input-plan',
    relatedTabLabel: 'Mở Kế hoạch tháng',
    keyFacts: [
      { label: 'Phạm vi gian hàng B2C', value: '69 gian hàng (B2C phụ trách = 1)' },
      { label: 'Mốc khóa Baseline v1.0', value: 'Ngày 25 tháng T-1' },
      { label: 'Ngân sách Ads cho Media', value: 'Giao trọn gói theo gian hàng' },
      { label: 'Biên bản điều chỉnh', value: 'BB-01 (Gốc) · BB-02 (Điều chỉnh)' },
    ],
    sections: [
      {
        heading: '1. Phân định trách nhiệm 3 bên: Growth – Marketing B2C – Media',
        body: [
          'Để chấm dứt tình trạng lệch số giữa bảng giao việc tổng và bảng chạy thực tế, quy trình phân định rõ phạm vi của từng khối:',
        ],
        bullets: [
          'Khối Growth: Giao mục tiêu doanh số NMV, giao trần ngân sách sản xuất nội dung (tách rõ Gross và Net) cho B2C, đồng thời giao trọn gói một con số Tổng ngân sách Ads duy nhất theo từng gian hàng cho Media (không chia nhỏ ngân sách Ads theo từng video lẻ).',
          'Khối Marketing B2C: Nhận trần ngân sách Net từ Growth, thực hiện phân rã chi tiết 4 chiều (Theo Kênh/Loại nội dung, Theo Khung lương KL1–KL7, Theo 3 đợt chạy trong tháng, Theo Chuyên viên PIC) và cam kết lịch bàn giao mã Spark Ads.',
          'Khối Media: Nhận trọn gói Tổng ngân sách Ads của gian hàng, chủ động phân bổ ngân sách đẩy vào các video KOC có tỷ lệ chuyển đổi tốt nhất và cam kết chỉ số ROAS / CIR toàn gói.',
        ],
      },
      {
        heading: '2. Năm bước lập, phản biện và đóng băng kế hoạch tháng (T-1)',
        body: [
          'Chu kỳ lập kế hoạch cho tháng T luôn được thực hiện và khóa sổ ngay trong tháng T-1:',
        ],
        table: {
          headers: ['Bước', 'Thời gian (Tháng T-1)', 'Nội dung thực hiện', 'Đầu ra hệ thống'],
          rows: [
            ['Bước 1', 'Ngày 01 – 05', 'Growth khởi tạo nhu cầu dự kiến (mục tiêu GMV, trần ngân sách, sản phẩm đẩy Hero SKU).', 'Bản nháp Draft v0.1'],
            ['Bước 2', 'Ngày 05 – 10', 'B2C phân rã thử nghiệm và gửi danh sách KOC Đợt 1 để kịp gửi mẫu cho chiến dịch Mega Double Day đầu tháng sau.', 'Danh sách KOC Đợt 1'],
            ['Bước 3', 'Ngày 10 – 20', 'Growth chốt số Order chính thức; B2C và Media phản biện trực tiếp trong luồng thảo luận của từng gian hàng.', 'Biên bản điện tử BB-01'],
            ['Bước 4', 'Ngày 20 – 23', 'Chuyên viên Booking hoàn tất phân rã 4 chiều; Trưởng nhóm (nếu có) sơ duyệt và trình Trưởng phòng B2C.', 'Bản trình duyệt hoàn chỉnh'],
            ['Bước 5', 'Ngày 25', 'Đại diện Growth, Media và Trưởng phòng B2C (Đặng Thị Yến Nhi) ký xác nhận đồng thuận; hệ thống khóa sổ.', 'Đóng băng Baseline v1.0 & sinh mã BO'],
          ],
        },
        callout: {
          tone: 'warning',
          title: 'Quy tắc bất biến đối với Baseline v1.0',
          text: 'Sau khi đóng băng Baseline v1.0 vào ngày 25/T-1, không ai được sửa đè lên số gốc. Khi nhãn hàng tăng/giảm ngân sách giữa tháng, Growth phải tạo yêu cầu điều chỉnh để lập Biên bản BB-02 và lưu thành phiên bản mới v1.1, v1.2.',
        },
      },
    ],
    sampleQuestions: [
      'Quy trình phối hợp 3 bên Growth, Marketing B2C và Media khi lập kế hoạch tháng như thế nào?',
      'Khi nào kế hoạch tháng bị đóng băng Baseline v1.0 và muốn sửa ngân sách giữa kỳ thì làm sao?',
      'Ngân sách Ads bàn giao cho đội Media được chia theo từng video hay giao trọn gói?',
    ],
  },
  {
    id: 'kb-reconciliation-5gates',
    code: 'QT-B2C-FIN-03',
    title: 'Đối soát Kế hoạch Booking (File 4.1 – 4.1.1 – 3.2) & 5 Chốt chặn ngân sách',
    category: 'PLANNING_BUDGET',
    summary: 'Nguyên tắc đối soát 3 nguồn dữ liệu vận hành, tách bạch chi phí Gross và Net, tách biệt Paid KOC và suất gửi mẫu FOC 0đ, cùng 5 chốt chặn tự động ngăn vượt trần ngân sách.',
    sourceDoc: 'docs/GIAI_PHAP_HE_THONG_DOI_SOAT_BOOKING_B2C.md & GEMINI.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Trưởng phòng B2C', 'Kế toán', 'Trưởng phòng Growth', 'Trưởng nhóm B2C', 'Chuyên viên Booking'],
    tags: ['đối soát', '4.1', '4.1.1', '3.2', 'gross', 'net', 'foc', 'paid', 'overbudget', 'unbudgeted', 'vượt trần', 'chốt chặn'],
    relatedTab: 'dashboard-finance',
    relatedTabLabel: 'Mở Đối soát Kế toán',
    keyFacts: [
      { label: 'Chuẩn kiểm soát Kế toán', value: 'Kiểm soát theo hạn mức Net' },
      { label: 'Suất gửi mẫu FOC', value: 'Chi phí 0đ · Tách khỏi Paid KOC' },
      { label: 'Chốt chặn tự động', value: '5 chốt chặn (Hard/Zero Budget...)' },
      { label: 'Phạm vi đối soát', value: 'Chỉ tính gian B2C phụ trách = 1' },
    ],
    sections: [
      {
        heading: '1. Ba nguyên tắc vàng khi bóc tách số liệu Order & Thực chi',
        body: [
          'Mọi báo cáo đối soát giữa Kế hoạch tổng (File 4.1), Phân rã tuần (File 4.1.1) và Thực chi duyệt book (File 3.2) phải tuân thủ 3 nguyên tắc:',
        ],
        bullets: [
          'Chỉ tính phạm vi B2C phụ trách: Chỉ tổng hợp các gian hàng có cột "B2C phụ trách = 1" (69 gian hàng thuộc 42 thương hiệu). Không gộp gian hàng thuộc bộ phận Social Commerce hoặc Outright.',
          'Tách bạch Chi phí Gross và Chi phí Net: Kế toán kiểm soát trần giải ngân theo hạn mức Net. Các khoản thuế TNCN 10% (cá nhân) hoặc VAT 8–10% (doanh nghiệp) phải được bóc tách riêng để không báo sai vượt trần.',
          'Tách bạch Video trả phí (Paid) và Suất gửi mẫu miễn phí (FOC 0đ): Các đơn gửi mẫu miễn phí (0đ, thường do chuyên viên riêng như Trần Thị Hảo phụ trách) phải tách khỏi chỉ tiêu Video KOC trả phí để không làm sai lệch đơn giá trung bình mỗi video.',
        ],
      },
      {
        heading: '2. Năm (05) chốt chặn kiểm soát ngân sách trên hệ thống',
        body: [
          'Hệ thống áp dụng 5 cơ chế kiểm soát tự động để ngăn chặn rủi ro tài chính trước khi phát sinh nghĩa vụ thanh toán:',
        ],
        table: {
          headers: ['Tên chốt chặn', 'Quy tắc kiểm tra tự động', 'Hành động xử lý của hệ thống'],
          rows: [
            ['1. Khóa vượt trần (Hard Budget Gate)', 'Tổng chi phí thực tế đề nghị duyệt trên File 3.2 chạm hoặc vượt 100% hạn mức Order Net của gian hàng.', 'Cảnh báo vượt trần (Overbudget) và khóa nút duyệt deal trả phí mới cho đến khi có biên bản bổ sung ngân sách.'],
            ['2. Khóa chi ngoài kế hoạch (Zero-Budget Gate)', 'Gian hàng có hạn mức Order Net ghi nhận 0đ nhưng chuyên viên tạo deal có chi phí trả tiền.', 'Báo động đỏ (Unbudgeted Spend), chỉ cho phép tạo đơn FOC 0đ trừ khi Trưởng phòng & Growth ký duyệt bổ sung.'],
            ['3. Kiểm tra toàn vẹn dữ liệu (Data Integrity Gate)', 'Kiểm tra công thức quy đổi Gross/Net theo loại chủ thể và bắt buộc điền đủ kênh, định dạng, khung lương.', 'Chặn lưu bản ghi thiếu trường bắt buộc hoặc lệch công thức thuế.'],
            ['4. Cảnh báo tiến độ & dòng tiền (SLA & Cash-flow Gate)', 'Theo dõi thời gian từ ngày KOC nhận hàng mẫu đến ngày nộp video nháp (hạn 5 ngày / 120h).', 'Gửi cảnh báo nhắc việc tự động; tạm dừng đề nghị tạm ứng nếu KOC quá hạn nộp bài.'],
            ['5. Chốt chặn pháp lý (Contract & Legal Gate)', 'Kiểm tra deal trả phí đã có hợp đồng theo 8 mẫu chuẩn và chữ ký trước ngày air tối thiểu 01 ngày chưa.', 'Không cho phép lập phiếu Đề nghị thanh toán (ĐNTT) nếu thiếu hợp đồng hoặc thiếu Biên bản nghiệm thu.'],
          ],
        },
      },
    ],
    sampleQuestions: [
      'Năm chốt chặn kiểm soát ngân sách (Budget Gates) của phòng B2C gồm những gì?',
      'Kế toán kiểm soát ngân sách gian hàng theo số Gross hay số Net?',
      'Xử lý thế nào khi gian hàng có hạn mức Order bằng 0đ nhưng phát sinh chi phí booking?',
    ],
  },
  {
    id: 'kb-contracts-tax-wesign',
    code: 'QT-B2C-LEGAL-04',
    title: 'Bộ 8 Biểu mẫu Hợp đồng, Chính sách Thuế (10% / 7% / VAT) & Ký số weSign',
    category: 'CONTRACTS_TAX_LEGAL',
    summary: 'Quy định chọn đúng 8 mẫu hợp đồng & biên bản nghiệm thu theo 4 nhóm chủ thể (Cá nhân, HKD, Doanh nghiệp, CTV), cách tính thuế TNCN 10%, thuế HKD 7%, VAT 8-10% và luồng ký điện tử MISA AMIS weSign.',
    sourceDoc: 'Quy trình Quản lý hợp đồng Booking.md & docs/CONTRACT_HUB_IMPLEMENTATION.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Booking', 'Pháp chế', 'Kế toán', 'Trưởng phòng B2C'],
    tags: ['hợp đồng', 'biên bản nghiệm thu', 'bbnt', 'thuế', 'tncn', '10%', 'hộ kinh doanh', '7%', 'vat', 'wesign', 'cccd', '50 triệu'],
    relatedTab: 'contracts',
    relatedTabLabel: 'Mở Hợp đồng & thanh toán',
    keyFacts: [
      { label: 'Số biểu mẫu chuẩn', value: '8 biểu mẫu (4 HĐ + 4 BBNT)' },
      { label: 'Thuế TNCN Cá nhân', value: '10% cho khoản chi ≥ 2.000.000 đ' },
      { label: 'Thuế khoán Hộ kinh doanh', value: '7% (5% GTGT + 2% TNCN)' },
      { label: 'Hạn hoàn tất trình ký', value: 'Trước ngày air tối thiểu 01 ngày' },
    ],
    sections: [
      {
        heading: '1. Chính sách thuế và công thức quy đổi Gross ↔ Net theo chủ thể',
        body: [
          'Khi đàm phán với KOC/Agency, chuyên viên Booking thường chốt số tiền KOC thực nhận về tài khoản (Net), nhưng trên hợp đồng và chứng từ kế toán phải thể hiện đầy đủ giá trị bao gồm thuế (Gross):',
        ],
        bullets: [
          'Đối tác Cá nhân (Mẫu 1.1.1 & 1.1.2): Nếu tổng giá trị chi trả từ 2.000.000 VNĐ trở lên, Upbase bắt buộc khấu trừ 10% thuế TNCN tại nguồn để nộp thay cho KOC. Công thức: Gross = Net / 0,90; Thuế TNCN = Gross × 10%. (Ví dụ: KOC muốn thực nhận Net 4.500.000đ → Giá trị hợp đồng Gross ghi 5.000.000đ, khấu trừ thuế 500.000đ). Khoản chi dưới 2.000.000đ không khấu trừ 10%.',
          'Đối tác Hộ kinh doanh (Mẫu 2.1.1 & 2.1.2): Áp dụng mức thuế khoán 7% (gồm 5% thuế GTGT + 2% thuế TNCN theo Thông tư 40/2021/TT-BTC đối với dịch vụ quảng cáo). Hộ kinh doanh tự kê khai và xuất hóa đơn bán hàng cho Upbase.',
          'Đối tác Doanh nghiệp / MCN (Mẫu 3.1.1 & 3.1.2): Xuất hóa đơn GTGT (VAT) với thuế suất 8% hoặc 10%. Kế toán kiểm soát hạn mức ngân sách của gian hàng theo giá trị Net (chưa gồm VAT). Công thức: Giá trị thanh toán (Gross) = Giá Net × (1 + Thuế suất VAT).',
          'Cộng tác viên kênh thương hiệu (Mẫu 4.1 & 4.2): Ký Hợp đồng nguyên tắc đầu kỳ và chốt Biên bản nghiệm thu sản lượng vào cuối tháng; khấu trừ 10% thuế TNCN nếu tổng thu nhập trong tháng từ 2.000.000 VNĐ trở lên.',
        ],
        formula: 'Cá nhân (≥ 2 triệu): Gross = Net / 0,9  |  Doanh nghiệp: Thanh toán = Net × (1 + VAT)',
      },
      {
        heading: '2. Quy trình phê duyệt 2 cấp và ký số từ xa qua MISA AMIS weSign',
        body: [
          'Tất cả hợp đồng được khởi tạo trực tiếp trên phân hệ Hợp đồng & thanh toán (hỗ trợ đọc ảnh CCCD/ĐKKD tự động điền thông tin và kiểm tra mã băm SHA-256 của mẫu chuẩn):',
        ],
        bullets: [
          'Ngưỡng chọn mẫu hợp đồng: Hợp đồng có giá trị dưới 50.000.000 VNĐ bắt buộc sử dụng 100% mẫu chuẩn của Pháp chế Upbase. Hợp đồng từ 50.000.000 VNĐ trở lên mới được xem xét mẫu của đối tác nhưng phải qua Pháp chế thẩm định.',
          'Phê duyệt nội bộ 2 cấp: (1) Pháp chế duyệt điều khoản quyền và nghĩa vụ trong vòng 24 giờ làm việc; (2) Kế toán duyệt thông tin mã số thuế, số tài khoản và cách tính thuế trong vòng 48 giờ làm việc.',
          'Thứ tự ký số trên MISA AMIS weSign: KOC / Đối tác ký trước (qua đường dẫn gửi về Email/Zalo kèm mã OTP xác thực) → Trưởng phòng B2C kiểm tra → Giám đốc (Đỗ Văn Giang) ký số hoàn tất.',
          'Quy định đối với hóa đơn điện tử (HKD, Công ty): Đối tác phải gửi bản hóa đơn nháp để Kế toán kiểm tra trước (khớp tên công ty, MST, địa chỉ, nội dung và đặc biệt Ngày xuất hóa đơn phải trùng với Ngày ký Biên bản nghiệm thu) rồi mới phát hành chính thức.',
        ],
      },
    ],
    sampleQuestions: [
      'Cách tính thuế TNCN 10%, thuế Hộ kinh doanh 7% và công thức đổi từ Net sang Gross như thế nào?',
      'Khi nào dùng mẫu hợp đồng 1.1.1, 2.1.1, 3.1.1 và 4.1?',
      'Quy định về ngày xuất hóa đơn điện tử so với ngày ký Biên bản nghiệm thu là gì?',
    ],
  },
  {
    id: 'kb-koc-salary-kalodata',
    code: 'QT-B2C-KOC-05',
    title: 'Khung lương Creator (KL1 – KL7, TAP), Danh bạ KOC Master & Chỉ số Kalodata',
    category: 'KOC_SALARY_MASTER',
    summary: 'Định mức thù lao Net cho 9 bậc khung lương, quy tắc giới hạn 45% ngân sách cho KOC lớn, tiêu chuẩn dữ liệu sạch Zero Mock, quét nghi trùng 4 chiều và cách đọc 8 chỉ số Kalodata.',
    sourceDoc: 'docs/QUY_TRINH_QUAN_LY_DANH_BA_KOC_MASTER.md & docs/KALODATA_INTEGRATION.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Booking', 'Trưởng nhóm B2C', 'Trưởng phòng B2C', 'Chuyên viên Brand'],
    tags: ['khung lương', 'kl1', 'kl2', 'kl3', 'kl4', 'kl5', 'kl6', 'kl7', 'tap', 'kalodata', 'gpm', 'danh bạ koc', 'nghi trùng'],
    relatedTab: 'koc-master',
    relatedTabLabel: 'Mở Danh bạ KOC',
    keyFacts: [
      { label: 'Số bậc khung lương', value: '9 bậc (TAP, KL1→KL7, TAP ngoài)' },
      { label: 'Trần ngân sách nhóm ≥ KL4', value: 'Tối đa 45% tổng ngân sách' },
      { label: 'Quét nghi trùng hồ sơ', value: '4 tiêu chí (Kênh, CCCD, STK, SĐT)' },
      { label: 'Chỉ số Kalodata tích hợp', value: '8 chỉ số thương mại TikTok Shop' },
    ],
    sections: [
      {
        heading: '1. Quy tắc phân bổ ngân sách theo Khung lương (KL1 – KL7)',
        body: [
          'Khi phân rã kế hoạch tháng trên File 4.1.1, chuyên viên phải cân đối tỷ trọng giữa nhóm KOC phủ số lượng (Massive Creator) và nhóm KOC tạo điểm nhấn thương hiệu (Mid/Key/Top Creator):',
        ],
        bullets: [
          'Nhóm Massive Creator (TAP, KL1 ≤500k, KL2 500k–1.5M, KL3 1.5M–3M): Chiếm 70%–80% tổng số lượng video trong tháng để đảm bảo độ phủ hiển thị, tạo nguồn video dồi dào cho đội Media test quảng cáo Spark Ads.',
          'Nhóm Mid & Key Creator (KL4 3M–5M, KL5 5M–10M, KL6 10M–30M, KL7 >30M): Đóng vai trò bảo chứng uy tín (Bác sĩ, Chuyên gia, Beauty Blogger lớn) và kéo doanh số trong ngày sale lớn. Tổng ngân sách chi cho nhóm từ KL4 trở lên không được vượt quá 45% tổng ngân sách booking của gian hàng.',
        ],
      },
      {
        heading: '2. Tiêu chuẩn quản trị Danh bạ KOC Master & Quét nghi trùng 4 chiều',
        body: [
          'Danh bạ KOC là tài sản dữ liệu tập trung của phòng B2C, vận hành theo nguyên tắc "Không dữ liệu giả định" (Zero Mock Policy):',
        ],
        bullets: [
          'Không điền số điện thoại, số CCCD, mã số thuế hoặc số tài khoản ngân hàng tạm thời. Trường nào chưa thu thập được phải để trống để hệ thống gắn nhãn "Thiếu giấy tờ" và nhắc bổ sung trước khi tạo hợp đồng.',
          'Hệ thống tự động quét và cảnh báo hồ sơ nghi trùng theo 4 chiều: (1) Trùng đường dẫn/ID kênh TikTok, (2) Trùng số CCCD 12 số hoặc Mã số thuế, (3) Trùng số tài khoản ngân hàng nhận tiền, (4) Trùng số điện thoại liên hệ.',
          'Dữ liệu nhạy cảm (số CCCD, MST, STK ngân hàng) mặc định được che một phần (•••• 2194) trên màn hình; chỉ Quản trị viên, Trưởng phòng, Trưởng nhóm và chính Chuyên viên PIC của KOC đó mới có quyền bấm "Hiện số".',
        ],
      },
      {
        heading: '3. Tám (08) chỉ số Kalodata cần thẩm định trước khi chốt giá KOC',
        body: [
          'Trước khi đưa KOC vào danh sách đề xuất (đặc biệt từ khung KL3 trở lên), chuyên viên sử dụng tính năng đồng bộ Kalodata để đánh giá sức bán thực tế trên TikTok Shop:',
        ],
        bullets: [
          '1. Doanh số GMV (7 ngày / 30 ngày / 90 ngày): Tổng giá trị hàng hóa bán ra qua giỏ hàng của KOC.',
          '2. Số lượng sản phẩm bán ra (Units Sold) & 3. Số đơn hàng (Orders): Phản ánh sức mua thực tế.',
          '4. Chỉ số GPM (Gross Merchandise Value per Mille): Doanh thu tạo ra trên mỗi 1.000 lượt xem video — chỉ số quan trọng nhất để đo khả năng chốt đơn của nội dung.',
          '5. Giá trị đơn hàng trung bình (AOV): Kiểm tra tệp người xem của KOC quen mua hàng giá rẻ hay phân khúc trung/cao cấp của Brand.',
          '6. Cơ cấu doanh thu Video vs Livestream: Tránh thuê một KOC mạnh về Livestream nhưng lại đặt hàng quay Video ngắn (hoặc ngược lại).',
          '7. Nhân khẩu học người xem (Giới tính, Độ tuổi) & 8. Top sản phẩm bán chạy nhất của kênh.',
        ],
      },
    ],
    sampleQuestions: [
      'Chi tiết mức giá của từng khung lương từ KL1 đến KL7 và quy tắc 45% ngân sách là gì?',
      'Làm sao để kiểm tra KOC bị trùng hồ sơ trong Danh bạ KOC?',
      'Chỉ số GPM trên Kalodata là gì và dùng để đánh giá KOC như thế nào?',
    ],
  },
  {
    id: 'kb-content-pillars-tactics',
    code: 'QT-B2C-CONT-06',
    title: 'Hệ thống 15 Trụ cột nội dung (Content Pillars), 14 Định dạng & Chiến thuật kịch bản',
    category: 'CONTENT_CREATIVE',
    summary: 'Danh mục 15 trụ cột nội dung chuẩn hóa (PIL-01 đến PIL-15), 14 định dạng sản xuất video, công thức nhân bản ý tưởng kịch bản, kỹ thuật Twist, bố cục 4 phần và quy trình 12 bước làm video kênh Brand.',
    sourceDoc: 'Knowledge - MD/[Hướng dẫn] Content Tactics Template Version 1.0.0.md & Quy trình - MD/Quy trình làm Content kênh.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Content', 'Chuyên viên Brand', 'Chuyên viên Booking', 'Cộng tác viên / VJ'],
    tags: ['pillar', 'trụ cột nội dung', 'định dạng video', 'kịch bản', 'hook 3s', 'twist', 'self-channel', 'kênh brand', 'ctv', 'vj'],
    relatedTab: 'content-angles',
    relatedTabLabel: 'Mở Góc tiếp cận',
    keyFacts: [
      { label: 'Số trụ cột nội dung', value: '15 Trụ cột (PIL-01 → PIL-15)' },
      { label: 'Số định dạng video', value: '14 Định dạng (Video & Live)' },
      { label: 'Cấu trúc kịch bản chuẩn', value: '4 phần (Hook 3s · Nỗi đau · Giải pháp · CTA)' },
      { label: 'Quy trình kênh tự xây', value: '12 bước sản xuất Self-channel' },
    ],
    sections: [
      {
        heading: '1. Danh mục 15 Trụ cột nội dung (Content Pillars) chuẩn hóa',
        body: [
          'Mọi kịch bản video KOC và video kênh thương hiệu đều phải gắn với 1 trong 15 trụ cột nội dung để đo lường hiệu quả chuyển đổi:',
        ],
        table: {
          headers: ['Mã', 'Tên trụ cột nội dung', 'Trọng tâm triển khai & Tỷ lệ xuất hiện sản phẩm'],
          rows: [
            ['PIL-01', 'Review trực tiếp (DIRECT_REVIEW)', 'Quay trải nghiệm trực diện, thử chất kem/sản phẩm cận cảnh (>70% thời lượng).'],
            ['PIL-02', 'Nỗi đau - Giải pháp (PROBLEM_SOLUTION)', 'Nêu vấn đề cấp bách của người xem và đưa sản phẩm làm lời giải (>60% thời lượng).'],
            ['PIL-03', 'Unboxing (UNBOXING)', 'Đập hộp thực tế góc nhìn thứ nhất, kiểm tra bao bì và quà tặng kèm.'],
            ['PIL-04', 'FOMO / Bắt xu hướng (FOMO_TREND)', 'Bắt nhịp trào lưu nóng, nhạc xu hướng, tạo tâm lý sợ bỏ lỡ ưu đãi.'],
            ['PIL-05', 'Nội dung thảo luận (CONTROVERSIAL)', 'Đặt góc nhìn đa chiều thu hút bình luận tự nhiên, lồng ghép sản phẩm khéo léo.'],
            ['PIL-06', 'Daily Vlog – Kể chuyện (PILLAR_6)', 'Lồng ghép sản phẩm tự nhiên vào lịch trình sinh hoạt hàng ngày (<50% thời lượng).'],
            ['PIL-07', 'Nội dung doanh nghiệp (CORPORATE_BRAND)', 'Câu chuyện thương hiệu, nhà máy, phòng thí nghiệm và công nghệ sản xuất.'],
            ['PIL-08', 'PR báo chí (PRESS_PR)', 'Trích dẫn phóng sự truyền hình, chứng nhận quốc tế, giải thưởng uy tín.'],
            ['PIL-09', 'Kiến thức chuyên môn (EDUCATIONAL)', 'Bác sĩ/Dược sĩ/Chuyên gia giải thích cơ chế khoa học, bảng thành phần.'],
            ['PIL-10', 'Hỏi đáp (Q_AND_A)', 'Trả lời trực tiếp bình luận thắc mắc của khách hàng trên kênh.'],
            ['PIL-11', 'Phản hồi khách hàng (CUSTOMER_FEEDBACK)', 'Tổng hợp đánh giá thực tế từ người mua trước, kiểm chứng hiệu quả.'],
            ['PIL-12', 'Thông báo ưu đãi (PROMOTION_TEASING)', 'Đếm ngược giờ vàng, tung mã giảm giá sâu, kéo người xem vào phiên Livestream.'],
            ['PIL-13', 'Giải trí / Tình huống hài (ENTERTAINMENT)', 'Tiểu phẩm ngắn hài hước, tình huống đời thường gài cắm sản phẩm.'],
            ['PIL-14', 'Dẫn luồng ngoại sàn (OFF_PLATFORM_PR)', 'Nội dung lan tỏa từ Facebook, Threads, Instagram kéo lưu lượng về giỏ hàng sàn.'],
            ['PIL-15', 'Khoảnh khắc Livestream (LIVESTREAM_HIGHLIGHT)', 'Cắt dựng đoạn cao trào chốt đơn từ phiên Mega Live thành video ngắn chạy Ads.'],
          ],
        },
      },
      {
        heading: '2. Bố cục kịch bản 4 phần, Công thức nhân bản ý tưởng & Kỹ thuật Twist',
        body: [
          'Khi thẩm định kịch bản tại màn Kịch bản & video, chuyên viên Content chấm điểm dựa trên bố cục 4 phần và 3 tư duy kể chuyện:',
        ],
        bullets: [
          'Phần 1 — Mở đầu (Hook 3 giây đầu): Phải gọi trúng tên tệp khách hàng hoặc đánh thẳng vào nỗi đau/sự tò mò bằng cả hình ảnh cận cảnh và câu nói đầu tiên.',
          'Phần 2 — Bối cảnh & Nỗi đau (Pain Point): Mô tả tình huống đời thực khiến khách hàng đồng cảm trước khi nhắc đến tên sản phẩm.',
          'Phần 3 — Giải pháp & Bằng chứng (Solution & Proof): Đưa sản phẩm xuất hiện giải quyết vấn đề, nêu bật điểm khác biệt (USP) kèm cảnh quay kiểm chứng thực tế và câu khuyến cáo pháp lý bắt buộc.',
          'Phần 4 — Kêu gọi hành động (CTA): Hướng dẫn rõ thao tác bấm vào giỏ hàng góc trái kèm lý do phải mua ngay hôm nay (quà tặng giới hạn, voucher phiên live).',
          'Kỹ thuật Twist (Cú lật): Tạo tình huống bất ngờ ở giây thứ 3–5 để giữ chân người xem nhưng bắt buộc phải bẻ lái hợp lý về công dụng cốt lõi của sản phẩm.',
        ],
        formula: 'Số ý tưởng kịch bản = Sản phẩm × Tệp khách × Bối cảnh × Nỗi đau × Góc nhìn × Định dạng × Twist × CTA',
      },
    ],
    sampleQuestions: [
      '15 trụ cột nội dung (Content Pillars) của phòng Marketing B2C gồm những gì?',
      'Cấu trúc kịch bản video chuẩn 4 phần và công thức tạo ý tưởng kịch bản như thế nào?',
      'Sự khác nhau giữa trụ cột Review trực tiếp, Nỗi đau - Giải pháp và Daily Vlog là gì?',
    ],
  },
  {
    id: 'kb-team-org-4p-p3',
    code: 'QT-B2C-ORG-07',
    title: 'Cơ cấu Tổ chức Phòng B2C, Phân bổ Gian hàng & Công thức Đánh giá 4P/P3',
    category: 'TEAM_ORG_4P',
    summary: 'Sơ đồ phân cấp nhân sự phòng B2C (CEO, Trưởng phòng, Trưởng nhóm 8 gian hàng, Chuyên viên 61 gian hàng trực tiếp), mô hình Strategy Owner Tier A/B/C và công thức tính điểm thưởng hiệu suất P3.',
    sourceDoc: 'GEMINI.md & Quy trình - MD/Định hướng Marketing B2C _ Cơ cấu team.md',
    updatedAt: '14/10/2026',
    applicableRoles: ['Trưởng phòng B2C', 'Trưởng nhóm B2C', 'Chuyên viên Booking', 'Chuyên viên Content', 'Chuyên viên Brand'],
    tags: ['cơ cấu tổ chức', 'nhân sự', 'đỗ văn giang', 'đặng thị yến nhi', 'nguyễn thị ngọc tâm', 'trần thị hảo', 'leader', '4p', 'p3', 'hệ số độ khó'],
    relatedTab: 'performance-p3',
    relatedTabLabel: 'Mở Đánh giá 4P',
    keyFacts: [
      { label: 'Tổng Giám Đốc (CEO)', value: 'Đỗ Văn Giang' },
      { label: 'Trưởng phòng B2C', value: 'Đặng Thị Yến Nhi (69 gian hàng)' },
      { label: 'Trưởng nhóm B2C', value: 'Nguyễn Thị Ngọc Tâm (8 gian hàng)' },
      { label: 'Gian không có Leader', value: '61 gian hàng (Trình thẳng Trưởng phòng)' },
    ],
    sections: [
      {
        heading: '1. Phân tầng quản trị nhân sự và quy tắc gian hàng không có Leader',
        body: [
          'Hệ thống phân quyền và luồng trình duyệt kế hoạch của phòng Marketing B2C tuân thủ đúng sơ đồ nhân sự thực tế:',
        ],
        bullets: [
          'Cấp Ban Giám Đốc (CEO): Ông Đỗ Văn Giang — Phê duyệt chiến lược toàn hệ thống, bảo trợ nguồn lực và ký đại diện pháp luật trên hợp đồng/BBNT.',
          'Cấp Trưởng phòng Marketing B2C: Bà Đặng Thị Yến Nhi — Quản lý trần P&L và ngân sách toàn bộ 69 gian hàng B2C, ký duyệt kế hoạch tháng (Baseline v1.0) và duyệt thưởng P3.',
          'Cấp Trưởng nhóm (Leader): Bà Nguyễn Thị Ngọc Tâm — Phụ trách quản lý nhóm và sơ duyệt bước 1 cho đúng 8 gian hàng: ClubClio TikTok, ClubClio Shopee, Cindy Bloom, Mine, EUPC, L\'Occitane, Bye Bye Blemish, Rejuran.',
          'Cấp Chuyên viên thực thi (Specialist / PIC): Lê Phương Thảo, Lương Thị Như Quỳnh, Lê Thanh Hải, Phạm Thị Thu Hằng, Hoàng Hải Long, Trần Hải Phượng, Phan Diệu Ánh, Vũ Hoài Lâm, Nguyễn Thị Mai Anh... trực tiếp lập kế hoạch phân rã và vận hành booking.',
          'Chuyên viên chuyên trách gửi mẫu FOC: Trần Thị Hảo phụ trách luồng gửi mẫu miễn phí (0đ), tách biệt với luồng đàm phán hợp đồng trả phí.',
          'Quy tắc 61 gian hàng không có Leader: Đối với toàn bộ các gian hàng Shopee và các gian TikTok không thuộc 8 gian của nhóm Nguyễn Thị Ngọc Tâm, gian hàng ghi nhận Không có Leader — Chuyên viên chủ động lập phân rã và trình duyệt trực tiếp lên Trưởng phòng Đặng Thị Yến Nhi.',
        ],
      },
      {
        heading: '2. Nguyên tắc 1 Strategy Owner (Tier A / Tier B / Tier C)',
        body: [
          'Để không chồng chéo giữa Brand Team và Content Team, mỗi nhãn hàng được phân loại rõ một đầu mối chịu trách nhiệm chiến lược nội dung (Strategy Owner):',
        ],
        bullets: [
          'Tier A (Nhãn hàng lớn, yêu cầu tái định vị hoặc kiểm soát thương hiệu khắt khe): Brand Team là Strategy Owner nắm cả chiến lược thương hiệu và chiến lược nội dung; Content Team tập trung thực thi.',
          'Tier B (Nhãn hàng tăng trưởng bằng nội dung chuyển đổi): Content Team là Strategy Owner, trực tiếp lập Master Plan Content và điều phối góc kịch bản cho đội Booking.',
          'Tier C (Nhãn hàng quy mô gọn): Content Team đảm nhiệm trọn gói từ lập kế hoạch nội dung đến kiểm duyệt thực thi.',
        ],
      },
      {
        heading: '3. Công thức tính Khối lượng việc (Workload) và Điểm hiệu suất P3',
        body: [
          'Đánh giá 4P & thưởng quý (P3) của nhân sự dựa trên số liệu thực tế, có nhân hệ số độ khó của gian hàng phụ trách:',
        ],
        bullets: [
          'Hệ số độ khó gian hàng (Store Multiplier): Gian hàng thông thường = 1,0x; Gian hàng tiêu chuẩn B2C = 1,2x; Gian hàng trọng điểm khắt khe (ClubClio, Rejuran, Olay...) = 1,4x (cộng thêm 5 điểm thưởng độ khó).',
          'Xếp loại nhân sự theo tổng điểm P3: Xuất sắc (≥ 90 điểm, SLA ≥ 95%); Đạt chuẩn (75 – 89 điểm); Cần cải thiện (60 – 74 điểm); Cảnh báo vi phạm (< 60 điểm).',
        ],
        formula: 'Điểm P3 = (Tỷ lệ lấp đầy video × 0,4) + (Tỷ lệ đúng hạn SLA × 0,4) − (Điểm phạt vi phạm × 0,8) + Điểm thưởng gian hàng khó',
      },
    ],
    sampleQuestions: [
      'Cơ cấu nhân sự phòng B2C gồm những ai và 8 gian hàng nào có Trưởng nhóm phụ trách?',
      'Các gian hàng không có Leader thì chuyên viên trình duyệt kế hoạch cho ai?',
      'Công thức tính điểm đánh giá hiệu suất 4P / P3 và hệ số độ khó gian hàng tính như thế nào?',
    ],
  },
  {
    id: 'kb-multi-platform-job-sow',
    code: 'QT-B2C-JOB-08',
    title: 'Quản lý Job Đa sàn (TikTok, Shopee, Facebook) & 6 Hình thức SOW Sản xuất',
    category: 'SOP_BOOKING',
    summary: 'Quy tắc định danh Booking Order (1 BO = 1 Nền tảng - 1 Loại nội dung - 1 Định dạng - 1 Mô hình), 6 hình thức sản xuất nội dung (New, Adapt, Cross-post, Post-only, Production-only, Cut-down) và cách phân bổ chi phí đa kênh.',
    sourceDoc: 'Quy trình - MD/Booking đa sàn.md & Luồng quản lý job/extracted_content.txt',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Booking', 'Chuyên viên Content', 'Kế toán', 'Trưởng nhóm B2C'],
    tags: ['đa sàn', 'sow', 'adapt', 'cross-post', 'post-only', 'production-only', 'cut-down', 'shopee video', 'booking order'],
    relatedTab: 'booking',
    relatedTabLabel: 'Mở màn Booking',
    keyFacts: [
      { label: 'Quy tắc định danh BO', value: '1 BO = 1 Sàn · 1 Định dạng · 1 Mô hình' },
      { label: 'Số hình thức SOW', value: '6 hình thức sản xuất & tái sử dụng' },
      { label: 'SOW dịch vụ đi kèm', value: 'Giỏ hàng · Affiliate · Spark Ads · Độc quyền' },
      { label: 'Nghiệm thu đa kênh', value: 'Bóc tách chi phí theo từng gian hàng' },
    ],
    sections: [
      {
        heading: '1. Sáu (06) hình thức sản xuất và khai thác nội dung (Content Production SOW)',
        body: [
          'Để tối ưu ngân sách khi một KOC có thể sản xuất nội dung cho cả TikTok Shop, Shopee Video và Facebook, hệ thống chuẩn hóa 6 loại SOW:',
        ],
        table: {
          headers: ['Hình thức SOW', 'Định nghĩa nghiệp vụ', 'Cách tính đơn giá & nghiệm thu'],
          rows: [
            ['1. Sản xuất mới (New)', 'KOC quay dựng hoàn toàn mới từ kịch bản riêng cho nhãn hàng.', 'Tính 100% đơn giá khung lương; nghiệm thu đủ kịch bản + demo + bài đăng.'],
            ['2. Chuyển đổi định dạng (Adapt)', 'Giữ concept gốc nhưng biên tập lại tỷ lệ khung hình, lời dẫn, CTA cho sàn khác (VD: TikTok sang Shopee Video).', 'Chi phí bằng 20% – 35% giá sản xuất mới; hạch toán vào ngân sách gian hàng nhận bản Adapt.'],
            ['3. Đăng lại đa kênh (Cross-post)', 'Đăng nguyên bản video đã duyệt lên nền tảng thứ hai của KOC kèm gắn link tiếp thị.', 'Phí hỗ trợ đăng bài hoặc tính gộp trong gói combo khi đàm phán ban đầu.'],
            ['4. Chỉ đăng bài (Post-only)', 'Nhãn hàng/Upbase cung cấp sẵn video thành phẩm, KOC chỉ đăng lên kênh cá nhân và gắn giỏ hàng.', 'Chỉ trả phí thuê kênh hiển thị & hoa hồng Affiliate.'],
            ['5. Chỉ quay dựng (Production-only)', 'KOC/VJ quay dựng chất lượng cao và bàn giao file gốc cho Brand chạy Ads hoặc đăng kênh tự xây, không đăng kênh KOC.', 'Nghiệm thu theo biên bản bàn giao file gốc độ phân giải cao và quyền sử dụng hình ảnh.'],
            ['6. Cắt dựng lại (Cut-down / Re-edit)', 'Cắt trích đoạn đắt giá từ phiên Livestream dài hoặc video gốc thành các clip ngắn 15–30s.', 'Phục vụ chạy quảng cáo chuyển đổi hoặc đăng kênh vệ tinh.'],
          ],
        },
      },
    ],
    sampleQuestions: [
      'Sáu hình thức SOW sản xuất nội dung (New, Adapt, Cross-post, Post-only, Production-only, Cut-down) khác nhau thế nào?',
      'Khi thuê KOC quay TikTok rồi đăng thêm sang Shopee Video thì hạch toán chi phí ra sao?',
    ],
  },
  {
    id: 'kb-brand-forbidden-words-handover',
    code: 'QT-B2C-BRAND-09',
    title: 'Quy chuẩn Từ khóa cấm theo Ngành hàng & Quy tắc Bàn giao Gian hàng (PIC Handover)',
    category: 'BRAND_STORE_GUIDELINES',
    summary: 'Danh mục từ ngữ cấm tuyệt đối trên TikTok Shop (tránh bị khóa giỏ hàng hoặc hạn chế phân phối), câu khuyến cáo pháp lý bắt buộc và quy trình bàn giao gian hàng đầu kỳ / giữa kỳ.',
    sourceDoc: 'docs/QUY_TRINH_MARKETING_B2C_BAN_LAM_VIEC.md & Hồ sơ thương hiệu',
    updatedAt: '14/10/2026',
    applicableRoles: ['Chuyên viên Content', 'Chuyên viên Booking', 'Chuyên viên Brand', 'Trưởng phòng B2C'],
    tags: ['từ cấm', 'từ khóa cấm', 'vi phạm', 'tiktok shop', 'bàn giao', 'handover', 'pic', 'backup', 'khuyến cáo pháp lý'],
    relatedTab: 'brand-knowledge',
    relatedTabLabel: 'Mở Hồ sơ thương hiệu',
    keyFacts: [
      { label: 'Từ cấm tuyệt đối', value: 'Trị dứt điểm · Cam kết 100% · Thuốc đặc trị' },
      { label: 'Phân công đầu kỳ', value: 'Ghi nhận trước khi khóa Baseline v1.0' },
      { label: 'Bàn giao giữa kỳ', value: 'Có ngày hiệu lực · Không hồi tố quá khứ' },
      { label: 'Cấu trúc quản trị', value: '42 Thương hiệu → 69 Gian hàng B2C' },
    ],
    sections: [
      {
        heading: '1. Nhóm từ khóa cấm trên TikTok Shop & Cách thay thế an toàn',
        body: [
          'Bộ phận Content và Booking bắt buộc kiểm tra kịch bản và phụ đề trên video nháp để loại bỏ các cụm từ khiến TikTok Shop quét vi phạm y tế/quảng cáo tuyệt đối:',
        ],
        table: {
          headers: ['Nhóm lỗi vi phạm', 'Từ ngữ bị cấm dùng', 'Cách diễn đạt thay thế đúng quy chuẩn'],
          rows: [
            ['Cam kết tuyệt đối', '"Cam kết 100%", "Chữa khỏi hoàn toàn", "Hiệu quả tức thì sau 1 đêm", "Vĩnh viễn không tái phát"', '"Hỗ trợ cải thiện rõ rệt", "Cảm nhận làn da dịu hơn sau lần đầu thoa", "Hiệu quả tùy thuộc cơ địa"'],
            ['Mạo danh thuốc điều trị (Mỹ phẩm)', '"Thuốc đặc trị", "Trị dứt điểm chàm sữa/mụn/nám", "Thay thế thuốc kê đơn", "Kháng viêm tiệt trùng"', '"Kem dưỡng làm dịu da", "Hỗ trợ giảm tình trạng khô đỏ, ngứa rát", "Chăm sóc chuyên biệt cho da nhạy cảm"'],
            ['So sánh hạ bệ đối thủ', 'Nhắc trực tiếp tên thương hiệu đối thủ hoặc khẳng định "Tốt nhất Việt Nam", "Số 1 thị trường" (khi không có giấy chứng nhận)', '"Một trong những dòng được các mẹ bỉm/chuyên gia tin dùng", tập trung nêu thông số kiểm nghiệm của chính sản phẩm'],
            ['Điều hướng giao dịch ngoài sàn', 'Đọc số điện thoại, nhắn "Inbox Zalo/Facebook để mua giá rẻ hơn", gắn mã QR cá nhân', '"Bấm ngay vào biểu tượng giỏ hàng màu vàng góc trái màn hình để áp mã giảm giá chính hãng"'],
          ],
        },
      },
      {
        heading: '2. Quy tắc Phân công đầu kỳ và Lệnh bàn giao gian hàng giữa kỳ',
        body: [
          'Để bảo vệ tính minh bạch khi tính KPI và thưởng P3 cho nhân sự khi có biến động nhân sự giữa tháng:',
        ],
        bullets: [
          'Phân công đầu kỳ: Trưởng phòng B2C chốt danh sách Chuyên viên phụ trách chính (PIC) và Người hỗ trợ (Backup) cho từng gian hàng trước ngày 25/T-1.',
          'Lệnh bàn giao giữa kỳ (Mid-month Handover): Khi chuyển giao gian hàng cho nhân sự mới giữa tháng, hệ thống ghi nhận Ngày hiệu lực bàn giao. Toàn bộ số lượng video đã air và ngân sách đã giải ngân trước ngày hiệu lực vẫn được bảo lưu thành tích cho PIC cũ; PIC mới chỉ chịu trách nhiệm phần chỉ tiêu và SLA từ ngày nhận bàn giao trở đi.',
        ],
      },
    ],
    sampleQuestions: [
      'Những từ khóa nào bị cấm tuyệt đối khi duyệt kịch bản mỹ phẩm và mẹ bé trên TikTok Shop?',
      'Khi bàn giao gian hàng cho nhân sự mới giữa tháng thì KPI và ngân sách được tính như thế nào?',
    ],
  },
];

// ============================================================================
// 6. NGÂN HÀNG CÂU HỎI THƯỜNG GẶP (CURATED FAQs)
// ============================================================================
export const MARKETING_KNOWLEDGE_FAQS: KnowledgeFaqItem[] = [
  {
    id: 'faq-01',
    category: 'CONTRACTS_TAX_LEGAL',
    question: 'KOC cá nhân chốt giá thực nhận (Net) là 4.500.000 đ thì trên hợp đồng ghi giá Gross bao nhiêu và khấu trừ thuế thế nào?',
    shortAnswer: 'Khoản chi từ 2.000.000 đ trở lên cho cá nhân bắt buộc khấu trừ 10% thuế TNCN tại nguồn. Với mức thực nhận Net 4.500.000 đ, giá trị hợp đồng Gross ghi 5.000.000 đ (khấu trừ thuế TNCN 500.000 đ).',
    detailedSteps: [
      'Áp dụng công thức quy đổi cá nhân: Gross = Net / 0,90 = 4.500.000 / 0,90 = 5.000.000 VNĐ.',
      'Thuế TNCN khấu trừ tại nguồn (10% × Gross): 5.000.000 × 10% = 500.000 VNĐ.',
      'Chọn mẫu hợp đồng số hiệu 1.1.1 (Hợp đồng dịch vụ video · Cá nhân) và mẫu nghiệm thu 1.1.2.',
      'Lưu ý: Kế toán kiểm soát hạn mức ngân sách của gian hàng theo mức Net (4.500.000 đ), nhưng trên hợp đồng phải tách rõ 3 dòng: Tổng giá trị dịch vụ (Gross), Thuế TNCN khấu trừ (10%) và Số tiền thực nhận (Net).',
    ],
    formulaOrRule: 'Gross = Net / 0,90  |  Thuế TNCN = Gross × 10%  |  Áp dụng khi tổng chi trả ≥ 2.000.000 VNĐ',
    sourceDoc: 'Quy trình Quản lý hợp đồng Booking.md',
    relatedArticleId: 'kb-contracts-tax-wesign',
    relatedTab: 'contracts',
    relatedTabLabel: 'Mở Hợp đồng & thanh toán',
    tags: ['thuế tncn', '10%', 'gross', 'net', 'cá nhân', '1.1.1', '2 triệu'],
  },
  {
    id: 'faq-02',
    category: 'CONTRACTS_TAX_LEGAL',
    question: 'Hộ kinh doanh (HKD) xuất hóa đơn cho Upbase thì tính thuế bao nhiêu % và dùng mẫu hợp đồng nào?',
    shortAnswer: 'Hộ kinh doanh chịu mức thuế khoán 7% (gồm 5% thuế GTGT + 2% thuế TNCN theo Thông tư 40/2021/TT-BTC), sử dụng mẫu Hợp đồng 2.1.1 và Biên bản nghiệm thu 2.1.2.',
    detailedSteps: [
      'Thu thập bản chụp Giấy đăng ký Hộ kinh doanh, Mã số thuế HKD và CCCD của chủ hộ.',
      'Khởi tạo hợp đồng theo mẫu 2.1.1 (HKD-HD) và hoàn tất ký trước ngày air tối thiểu 01 ngày.',
      'Sau khi video lên sóng và cấp đủ mã Spark Ads, ký Biên bản nghiệm thu mẫu 2.1.2 (HKD-BBNT).',
      'Yêu cầu HKD gửi bản hóa đơn bán hàng nháp để Kế toán kiểm tra: Ngày xuất hóa đơn bắt buộc phải trùng với ngày ký Biên bản nghiệm thu 2.1.2.',
    ],
    formulaOrRule: 'Thuế HKD = 7% (5% GTGT + 2% TNCN) · Mẫu 2.1.1 (HĐ) & 2.1.2 (BBNT)',
    sourceDoc: 'Quy trình Quản lý hợp đồng Booking.md',
    relatedArticleId: 'kb-contracts-tax-wesign',
    relatedTab: 'contracts',
    relatedTabLabel: 'Mở Hợp đồng & thanh toán',
    tags: ['hộ kinh doanh', 'hkd', '7%', '2.1.1', '2.1.2', 'hóa đơn'],
  },
  {
    id: 'faq-03',
    category: 'TEAM_ORG_4P',
    question: 'Gian hàng mình phụ trách không có Trưởng nhóm (Leader) thì trình duyệt kế hoạch tháng cho ai?',
    shortAnswer: 'Trình duyệt trực tiếp lên Trưởng phòng Marketing B2C (Đặng Thị Yến Nhi), không cần qua bước sơ duyệt trung gian.',
    detailedSteps: [
      'Trong 69 gian hàng B2C, chỉ có 8 gian hàng thuộc cụm của Trưởng nhóm Nguyễn Thị Ngọc Tâm (ClubClio TikTok, ClubClio Shopee, Cindy Bloom, Mine, EUPC, L\'Occitane, Bye Bye Blemish, Rejuran) mới qua bước Leader sơ duyệt.',
      'Toàn bộ 61 gian hàng còn lại (tất cả gian Shopee và các gian TikTok khác) ghi nhận Không có Leader.',
      'Chuyên viên phụ trách (PIC) chủ động lập bảng phân rã kế hoạch tuần trên màn Kế hoạch tháng trước ngày 23/T-1 và bấm gửi duyệt thẳng lên Trưởng phòng Đặng Thị Yến Nhi.',
    ],
    formulaOrRule: '8 gian hàng qua Leader Nguyễn Thị Ngọc Tâm · 61 gian hàng trình thẳng Trưởng phòng Đặng Thị Yến Nhi',
    sourceDoc: 'GEMINI.md & docs/GIAI_PHAP_HE_THONG_DOI_SOAT_BOOKING_B2C.md',
    relatedArticleId: 'kb-team-org-4p-p3',
    relatedTab: 'input-plan',
    relatedTabLabel: 'Mở Kế hoạch tháng',
    tags: ['leader', 'trưởng nhóm', 'trưởng phòng', 'đặng thị yến nhi', 'nguyễn thị ngọc tâm', 'trình duyệt'],
  },
  {
    id: 'faq-04',
    category: 'SLA_PLAYBOOK',
    question: 'KOC đã nhận hàng mẫu nhưng quá 5 ngày vẫn chưa gửi kịch bản/video nháp thì xử lý theo bước nào?',
    shortAnswer: 'Quá 5 ngày (120 giờ) kể từ lúc nhận hàng mẫu là vi phạm SLA-KOC-02. Chuyên viên phải tạm dừng mọi thủ tục tạm ứng, yêu cầu chốt hạn cuối trong 24h hoặc thu hồi hàng mẫu và kích hoạt KOC dự phòng.',
    detailedSteps: [
      'Kiểm tra trạng thái vận đơn trên màn Hàng mẫu để xác nhận chính xác thời điểm KOC đã ký nhận hàng.',
      'Gửi thông báo nhắc hạn chuẩn vào nhóm Zalo làm việc và gọi điện trực tiếp cho KOC/Quản lý.',
      'Nếu sau 24h nhắc nhở KOC vẫn không nộp bản quay nháp (Demo): Chuyển trạng thái deal sang "Tạm dừng / Hủy - Không hoàn thành nội dung", yêu cầu KOC hoàn trả sản phẩm mẫu.',
      'Bật cảnh báo lịch sử trễ hạn trên hồ sơ Danh bạ KOC Master của KOC đó để các chuyên viên khác trong phòng nắm thông tin.',
    ],
    formulaOrRule: 'SLA nộp video nháp (Demo) ≤ 5 ngày (120 giờ) kể từ ngày nhận hàng mẫu',
    sourceDoc: 'Quy trình - MD/Các SLA B2C.md',
    relatedArticleId: 'kb-sop-booking-42',
    relatedTab: 'sample-tracker',
    relatedTabLabel: 'Mở Hàng mẫu',
    tags: ['trễ hạn', '5 ngày', '120h', 'hàng mẫu', 'bùng mẫu', 'demo', 'sla'],
  },
  {
    id: 'faq-05',
    category: 'PLANNING_BUDGET',
    question: 'Tại sao hệ thống báo động đỏ (Unbudgeted Spend) hoặc khóa duyệt chi (Overbudget) trên gian hàng?',
    shortAnswer: 'Hệ thống kích hoạt chốt chặn tài chính khi Tổng thực chi duyệt book (File 3.2) vượt hạn mức Order Net trên File 4.1 (Overbudget), hoặc khi gian hàng có hạn mức Order Net = 0đ nhưng lại phát sinh đơn trả phí (Unbudgeted Spend).',
    detailedSteps: [
      'Kiểm tra xem các đơn mới nhập trên File 3.2 có phải là suất gửi mẫu miễn phí (FOC 0đ) bị nhập nhầm đơn giá trả phí hay không.',
      'Kiểm tra xem đơn giá đang nhập là Gross hay Net (Kế toán đối soát theo trần Net).',
      'Nếu thực sự nhãn hàng yêu cầu book thêm KOC vượt trần ban đầu: Yêu cầu chuyên viên Growth khởi tạo Biên bản điều chỉnh ngân sách (BB-02) và được Trưởng phòng B2C phê duyệt nâng trần (phiên bản v1.1) trước khi trình Kế toán duyệt chi.',
    ],
    formulaOrRule: 'Thực chi Net (File 3.2) ≤ Hạn mức Order Net (File 4.1) · Hạn mức 0đ chỉ được chạy FOC 0đ',
    sourceDoc: 'docs/GIAI_PHAP_HE_THONG_DOI_SOAT_BOOKING_B2C.md',
    relatedArticleId: 'kb-reconciliation-5gates',
    relatedTab: 'dashboard-finance',
    relatedTabLabel: 'Mở Đối soát Kế toán',
    tags: ['overbudget', 'unbudgeted', 'vượt trần', '0đ', 'báo động đỏ', 'khóa duyệt chi'],
  },
  {
    id: 'faq-06',
    category: 'SLA_PLAYBOOK',
    question: 'Lịch khóa sổ nghiệm thu tháng và 2 đợt mở cổng chỉnh sửa với Kế toán diễn ra vào ngày nào?',
    shortAnswer: 'Danh sách nghiệm thu trên File 3.2 khóa định kỳ vào ngày mùng 02 hàng tháng. Kế toán mở cổng cho phép chỉnh sửa/bổ sung chứng từ đúng 2 đợt: Ngày làm việc thứ 5 (Đợt 1) và Ngày làm việc thứ 11 (Đợt 2) từ 09h00 đến 17h00.',
    detailedSteps: [
      'Trước ngày mùng 02 hàng tháng: Chuyên viên Booking rà soát toàn bộ link video đã air trong tháng trước, mã Spark Ads và trạng thái biên bản nghiệm thu.',
      'Ngày mùng 02: Hệ thống khóa danh sách nghiệm thu tháng để Account/Brand đối chiếu sản lượng với nhãn hàng.',
      'Ngày làm việc thứ 5 (09h00 – 17h00): Mở cổng Đợt 1 để xử lý các hồ sơ sai lệch thông tin tài khoản, CCCD hoặc hóa đơn.',
      'Ngày làm việc thứ 11 (09h00 – 17h00): Mở cổng Đợt 2 lần cuối; đúng 17h30 khóa sổ hoàn toàn để Kế toán tất toán kỳ lương/chi phí.',
    ],
    formulaOrRule: 'Khóa sổ: Ngày 02 hàng tháng · Mở cổng chỉnh sửa: Ngày làm việc thứ 5 & thứ 11 (09h00–17h00)',
    sourceDoc: 'Quy trình - MD/Các SLA B2C.md',
    relatedArticleId: 'kb-sop-booking-42',
    relatedTab: 'dashboard-finance',
    relatedTabLabel: 'Mở Đối soát Kế toán',
    tags: ['nghiệm thu', 'ngày 2', 'mở cổng kế toán', 'ngày làm việc thứ 5', 'ngày làm việc thứ 11', 'khóa sổ'],
  },
  {
    id: 'faq-07',
    category: 'KOC_SALARY_MASTER',
    question: 'Làm sao phân biệt KOC thuộc Khung lương KL1, KL2, KL3, KL4, KL5, KL6, KL7 và giới hạn ngân sách nhóm KL4+ là bao nhiêu?',
    shortAnswer: 'Khung lương phân theo mức thù lao Net mỗi video: TAP (0đ), KL1 (≤500k), KL2 (500k–1.5M), KL3 (1.5M–3M), KL4 (3M–5M), KL5 (5M–10M), KL6 (10M–30M), KL7 (>30M). Tổng chi phí cho nhóm từ KL4 trở lên không được vượt quá 45% tổng ngân sách booking.',
    detailedSteps: [
      'Nhóm Massive Creator (TAP, KL1, KL2, KL3): Dùng để phủ số lượng bài đánh giá và tạo nguồn video chạy quảng cáo Spark Ads.',
      'Nhóm Mid Creator (KL4: 3M–5M, KL5: 5M–10M): Dùng cho sản phẩm chủ lực (Hero SKU) cần hình ảnh quay dựng chuyên nghiệp.',
      'Nhóm Key & Top Creator (KL6: 10M–30M, KL7: >30M): Chuyên gia, Bác sĩ, Dược sĩ, Celebrity tạo bảo chứng uy tín cho nhãn hàng.',
      'Khi lập kế hoạch tháng, hệ thống tự động kiểm tra tỷ trọng tiền dành cho nhóm ≥ KL4; nếu vượt 45% tổng ngân sách sẽ cảnh báo yêu cầu cân đối lại.',
    ],
    formulaOrRule: 'Tổng chi phí nhóm (KL4 + KL5 + KL6 + KL7) ≤ 45% Tổng ngân sách Booking Net của gian hàng',
    sourceDoc: 'Master data/5.6 Tệp cast.xlsx & docs/QUY_TRINH_PHAN_RA_KE_HOACH_B2C.md',
    relatedArticleId: 'kb-koc-salary-kalodata',
    relatedTab: 'koc-master',
    relatedTabLabel: 'Mở Danh bạ KOC',
    tags: ['kl1', 'kl2', 'kl3', 'kl4', 'kl5', 'kl6', 'kl7', '45%', 'khung lương'],
  },
  {
    id: 'faq-08',
    category: 'CONTENT_CREATIVE',
    question: 'Khi KOC gửi kịch bản hoặc video nháp, chuyên viên cần kiểm tra những yếu tố nào trước khi gửi Brand?',
    shortAnswer: 'Phải kiểm tra 4 yếu tố: (1) Không chứa từ khóa cấm của TikTok Shop & nhãn hàng, (2) Đủ bố cục 4 phần (Mở đầu 3s - Nỗi đau - Giải pháp - Kêu gọi mua hàng), (3) Đúng điểm khác biệt sản phẩm (USP) & câu khuyến cáo pháp lý, (4) Gộp toàn bộ chỉnh sửa thành 1 bản phản hồi duy nhất.',
    detailedSteps: [
      'Đưa kịch bản vào công cụ Kiểm tra kịch bản tại màn Kịch bản & video để quét tự động danh sách từ cấm theo nhãn hàng (VD: cấm từ "thuốc đặc trị", "trị dứt điểm 100%").',
      'Kiểm tra 3 giây đầu (Hook) đã nêu đúng vấn đề của tệp khách hàng mục tiêu chưa.',
      'Kiểm tra cảnh quay sản phẩm có rõ bao bì, kết cấu và đúng tỷ lệ thời lượng yêu cầu của Trụ cột nội dung (VD: Review trực tiếp cần >70% thời lượng có mặt sản phẩm).',
      'Tổng hợp ý kiến của cả Booking, Content và Brand thành 1 danh sách duy nhất gửi KOC sửa, không nhắn rải rác nhiều lần.',
    ],
    formulaOrRule: 'SLA phản hồi nội bộ ≤ 24h · Brand duyệt kịch bản ≤ 24h · Duyệt video nháp trước ngày air ≥ 02 ngày',
    sourceDoc: 'Quy trình Booking - Tech.md & Quy trình làm Content kênh.md',
    relatedArticleId: 'kb-content-pillars-tactics',
    relatedTab: 'content',
    relatedTabLabel: 'Mở Kịch bản & video',
    tags: ['duyệt kịch bản', 'video nháp', 'từ cấm', 'hook 3s', 'usp', 'content'],
  },
];

// ============================================================================
// 7. BỘ MÁY TÌM KIẾM & TỔNG HỢP CÂU TRẢ LỜI NGHIỆP VỤ (HYBRID RAG ENGINE)
// ============================================================================

export interface QaCitation {
  id: string;
  code: string;
  title: string;
  sourceDoc: string;
  category: Exclude<KnowledgeCategoryId, 'ALL'>;
  relatedTab?: TabKey;
  relatedTabLabel?: string;
}

export interface QaSynthesizedResponse {
  answerMarkdown: string;
  citations: QaCitation[];
  matchedFaqs: KnowledgeFaqItem[];
  suggestedFollowUps: string[];
  detectedCalculation?: {
    title: string;
    entityType: string;
    grossVnd: number;
    taxVnd: number;
    netVnd: number;
    taxRateLabel: string;
    recommendedTemplate: string;
  };
  detectedLiveEntity?: {
    type: 'BRAND' | 'STORE';
    name: string;
    summary: string;
    details: { label: string; value: string }[];
    navigateTab: TabKey;
    navigateLabel: string;
  };
}

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s.%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phát hiện câu hỏi tính thuế / quy đổi Gross - Net tự động từ con số người dùng nhập
 */
export function detectTaxCalculationFromQuery(query: string): QaSynthesizedResponse['detectedCalculation'] | undefined {
  const norm = normalizeVietnamese(query);
  const isTaxOrContractQuery =
    norm.includes('thue') ||
    norm.includes('gross') ||
    norm.includes('net') ||
    norm.includes('thuc nhan') ||
    norm.includes('khau tru') ||
    norm.includes('tncn') ||
    norm.includes('hkd') ||
    norm.includes('ho kinh doanh') ||
    norm.includes('vat');

  if (!isTaxOrContractQuery) return undefined;

  // Tìm con số tiền trong câu hỏi (VD: "5 triệu", "4.5tr", "4500000", "15 củ", "1.8 triệu")
  let amountVnd = 0;
  const millionMatch = query.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr|m|củ)\b/i);
  const kMatch = query.match(/(\d+(?:[.,]\d+)?)\s*(?:nghìn|nghin|ngàn|k)\b/i);
  const rawNumMatch = query.match(/\b(\d{1,3}(?:[.,]\d{3}){2,}|\d{6,9})\b/);

  if (millionMatch) {
    amountVnd = Math.round(parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000);
  } else if (kMatch) {
    amountVnd = Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1_000);
  } else if (rawNumMatch) {
    amountVnd = parseInt(rawNumMatch[1].replace(/[.,]/g, ''), 10);
  }

  if (!amountVnd || amountVnd <= 0) return undefined;

  const isHkd = norm.includes('hkd') || norm.includes('ho kinh doanh');
  const isCompany = norm.includes('cong ty') || norm.includes('doanh nghiep') || norm.includes('vat') || norm.includes('mcn');
  const isInputGross = norm.includes('gross la') || norm.includes('gross ') && !norm.includes('tinh gross') && !norm.includes('ra gross') && !norm.includes('gross bao nhieu');

  if (isHkd) {
    // Hộ kinh doanh thuế 7%
    const gross = isInputGross ? amountVnd : Math.round(amountVnd / 0.93);
    const tax = Math.round(gross * 0.07);
    const net = gross - tax;
    return {
      title: 'Bảng tính thuế Hộ kinh doanh (7% theo TT 40/2021/TT-BTC)',
      entityType: 'Hộ kinh doanh (HKD)',
      grossVnd: gross,
      taxVnd: tax,
      netVnd: net,
      taxRateLabel: '7% (5% GTGT + 2% TNCN)',
      recommendedTemplate: 'Mẫu 2.1.1 (HĐ dịch vụ HKD) & Mẫu 2.1.2 (BBNT HKD)',
    };
  }

  if (isCompany) {
    const vatRate = norm.includes('10%') ? 0.1 : 0.08;
    const net = isInputGross ? Math.round(amountVnd / (1 + vatRate)) : amountVnd;
    const tax = Math.round(net * vatRate);
    const gross = net + tax;
    return {
      title: `Bảng tính hóa đơn GTGT Doanh nghiệp (VAT ${vatRate * 100}%)`,
      entityType: 'Doanh nghiệp / Công ty',
      grossVnd: gross,
      taxVnd: tax,
      netVnd: net,
      taxRateLabel: `VAT ${vatRate * 100}% (Kế toán kiểm soát trần theo giá Net)`,
      recommendedTemplate: 'Mẫu 3.1.1 (HĐ Doanh nghiệp) & Mẫu 3.1.2 (BBNT Doanh nghiệp)',
    };
  }

  // Mặc định: Cá nhân (Khấu trừ 10% nếu Gross >= 2.000.000đ hoặc Net >= 1.800.000đ)
  if (isInputGross) {
    const gross = amountVnd;
    const isTaxable = gross >= 2_000_000;
    const tax = isTaxable ? Math.round(gross * 0.1) : 0;
    const net = gross - tax;
    return {
      title: 'Bảng tính thù lao & khấu trừ thuế TNCN Cá nhân',
      entityType: 'KOC Cá nhân',
      grossVnd: gross,
      taxVnd: tax,
      netVnd: net,
      taxRateLabel: isTaxable ? 'Khấu trừ 10% TNCN tại nguồn (≥ 2.000.000 đ)' : '0% (Dưới 2.000.000 đ không khấu trừ 10% TNCN)',
      recommendedTemplate: 'Mẫu 1.1.1 (HĐ Cá nhân) & Mẫu 1.1.2 (BBNT Cá nhân)',
    };
  } else {
    const net = amountVnd;
    const isTaxable = net >= 1_800_000;
    const gross = isTaxable ? Math.round(net / 0.9) : net;
    const tax = gross - net;
    return {
      title: 'Bảng quy đổi từ Thực nhận (Net) sang Giá trị hợp đồng (Gross) · Cá nhân',
      entityType: 'KOC Cá nhân',
      grossVnd: gross,
      taxVnd: tax,
      netVnd: net,
      taxRateLabel: isTaxable ? 'Khấu trừ 10% TNCN (Gross = Net / 0,9)' : '0% (Dưới ngưỡng 2.000.000 đ)',
      recommendedTemplate: 'Mẫu 1.1.1 (HĐ Cá nhân) & Mẫu 1.1.2 (BBNT Cá nhân)',
    };
  }
}

/**
 * Tra cứu trực tiếp dữ liệu Thương hiệu / Gian hàng thực tế trong hệ thống nếu câu hỏi nhắc tên
 */
function detectLiveBrandOrStore(
  query: string,
  brands: BrandDetail[] = [],
  stores: StorePortfolioItem[] = []
): QaSynthesizedResponse['detectedLiveEntity'] | undefined {
  const normQuery = normalizeVietnamese(query);
  if (normQuery.length < 3) return undefined;

  // Kiểm tra khớp tên Gian hàng trước
  for (const store of stores) {
    const normStore = normalizeVietnamese(store.storeName);
    if (normStore.length >= 4 && normQuery.includes(normStore)) {
      return {
        type: 'STORE',
        name: store.storeName,
        summary: `Gian hàng thuộc thương hiệu ${store.brandName} (${store.platform}) · Hạn mức tháng: ${formatVnd(store.monthlyBudget || store.budgetNet || 0)}`,
        details: [
          { label: 'Chuyên viên PIC', value: store.primaryPic || store.b2cOwnerName || 'Chưa phân công' },
          { label: 'Trưởng nhóm duyệt', value: store.bookingLeader || 'Không có Leader (Trình thẳng Trưởng phòng Yến Nhi)' },
          { label: 'Ngân sách tháng', value: formatVnd(store.monthlyBudget || store.budgetNet || 0) },
          { label: 'Chỉ tiêu Video', value: `${store.targetAffiliateContents || store.targetPaidVideos || 0} video (Đã air: ${store.actualAiredVideos || 0})` },
        ],
        navigateTab: 'stores',
        navigateLabel: `Xem hồ sơ gian hàng ${store.storeName}`,
      };
    }
  }

  // Kiểm tra khớp tên Thương hiệu
  for (const brand of brands) {
    const normBrand = normalizeVietnamese(brand.name);
    if (normBrand.length >= 3 && normQuery.includes(normBrand)) {
      const forbiddenPreview = brand.forbiddenNotes || 'Theo quy chuẩn ngành hàng';
      return {
        type: 'BRAND',
        name: brand.name,
        summary: `Thương hiệu ngành ${brand.category || 'Tiêu dùng & Làm đẹp'} · Định vị: ${brand.brandGuideline || 'Chính hãng'}`,
        details: [
          { label: 'Ngân sách tổng', value: formatVnd(brand.planBudget || brand.monthlyBudget || 0) },
          { label: 'Tiêu chí KOC', value: brand.kocCriteria || 'Tự nhiên, chia sẻ thực tế' },
          { label: 'Lưu ý từ cấm chính', value: forbiddenPreview },
          { label: 'Sản phẩm chủ lực', value: (brand.heroProducts || []).slice(0, 3).map(p => p.productName).join(', ') || 'Xem trong Hồ sơ thương hiệu' },
        ],
        navigateTab: 'brand-knowledge',
        navigateLabel: `Mở Hồ sơ thương hiệu ${brand.name}`,
      };
    }
  }

  return undefined;
}

/**
 * Tìm kiếm và tổng hợp câu trả lời chuẩn xác từ Kho tri thức phòng Marketing B2C
 */
export function synthesizeMarketingKnowledgeAnswer(params: {
  question: string;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  kocs?: KocItem[];
}): QaSynthesizedResponse {
  const { question, brands = [], stores = [] } = params;
  const normQ = normalizeVietnamese(question);
  const tokens = normQ.split(' ').filter(t => t.length >= 2);

  // 1. Tính điểm khớp cho từng FAQ
  const scoredFaqs = MARKETING_KNOWLEDGE_FAQS.map(faq => {
    const hay = normalizeVietnamese(`${faq.question} ${faq.shortAnswer} ${faq.tags.join(' ')} ${(faq.detailedSteps || []).join(' ')}`);
    let score = 0;
    for (const tk of tokens) {
      if (hay.includes(tk)) score += 2;
      if (normalizeVietnamese(faq.question).includes(tk)) score += 3;
      if (faq.tags.some(tag => normalizeVietnamese(tag).includes(tk))) score += 4;
    }
    return { faq, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // 2. Tính điểm khớp cho từng Tài liệu quy trình (Article)
  const scoredArticles = MARKETING_KNOWLEDGE_ARTICLES.map(art => {
    const sectionText = art.sections
      .map(s => `${s.heading} ${s.body.join(' ')} ${(s.bullets || []).join(' ')} ${s.formula || ''}`)
      .join(' ');
    const hay = normalizeVietnamese(`${art.title} ${art.summary} ${art.tags.join(' ')} ${sectionText}`);
    let score = 0;
    for (const tk of tokens) {
      if (hay.includes(tk)) score += 2;
      if (normalizeVietnamese(art.title).includes(tk)) score += 4;
      if (art.tags.some(tag => normalizeVietnamese(tag).includes(tk))) score += 5;
    }
    return { art, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // 3. Kiểm tra kịch bản xử lý từ chối
  const matchedObjections = OBJECTION_SCRIPTS_REFERENCE.filter(obj => {
    const hay = normalizeVietnamese(`${obj.situation} ${obj.responseStrategy} ${obj.sampleMessage}`);
    return tokens.some(tk => tk.length >= 3 && hay.includes(tk));
  });

  // 4. Phát hiện tính thuế tự động & tra cứu Brand/Store sống
  const detectedCalculation = detectTaxCalculationFromQuery(question);
  const detectedLiveEntity = detectLiveBrandOrStore(question, brands, stores);

  const topArticles = scoredArticles.slice(0, 3).map(x => x.art);
  const topFaqs = scoredFaqs.slice(0, 2).map(x => x.faq);

  // Nếu câu hỏi quá chung chung hoặc không khớp từ khóa nào, lấy bộ tài liệu nền tảng
  const effectiveArticles =
    topArticles.length > 0
      ? topArticles
      : [MARKETING_KNOWLEDGE_ARTICLES[0], MARKETING_KNOWLEDGE_ARTICLES[2], MARKETING_KNOWLEDGE_ARTICLES[3]];

  const lines: string[] = [];

  // Nếu có thông tin Brand / Gian hàng thực tế trong hệ thống
  if (detectedLiveEntity) {
    lines.push(`### Thông tin tra cứu trực tiếp: ${detectedLiveEntity.name}`);
    lines.push(detectedLiveEntity.summary);
    for (const d of detectedLiveEntity.details) {
      lines.push(`- **${d.label}:** ${d.value}`);
    }
    lines.push('');
  }

  // Nếu có phép tính thuế / Gross-Net tự động
  if (detectedCalculation) {
    lines.push(`### ${detectedCalculation.title}`);
    lines.push(`- **Đối tượng áp dụng:** ${detectedCalculation.entityType}`);
    lines.push(`- **Giá trị hợp đồng (Gross):** ${formatVnd(detectedCalculation.grossVnd)}`);
    lines.push(`- **Thuế khấu trừ / Kê khai (${detectedCalculation.taxRateLabel}):** ${formatVnd(detectedCalculation.taxVnd)}`);
    lines.push(`- **Số tiền thực nhận / Giá trị Net kế toán:** ${formatVnd(detectedCalculation.netVnd)}`);
    lines.push(`- **Biểu mẫu sử dụng:** ${detectedCalculation.recommendedTemplate}`);
    lines.push('');
  }

  // Nếu khớp sát với một câu hỏi thường gặp (FAQ)
  if (topFaqs.length > 0 && scoredFaqs[0].score >= 8) {
    const bestFaq = topFaqs[0];
    lines.push(`### Trả lời trọng tâm`);
    lines.push(bestFaq.shortAnswer);
    if (bestFaq.formulaOrRule) {
      lines.push(`\n**Quy tắc / Công thức áp dụng:** \`${bestFaq.formulaOrRule}\``);
    }
    if (bestFaq.detailedSteps && bestFaq.detailedSteps.length > 0) {
      lines.push('\n### Các bước thực hiện chuẩn');
      bestFaq.detailedSteps.forEach((step, idx) => {
        lines.push(`${idx + 1}. ${step}`);
      });
    }
    lines.push('');
  } else {
    // Tổng hợp từ tài liệu quy trình khớp nhất
    const primaryArt = effectiveArticles[0];
    lines.push(`### Hướng dẫn theo quy định: ${primaryArt.title} (${primaryArt.code})`);
    lines.push(primaryArt.summary);
    lines.push('');

    // Chọn 1-2 mục con (section) khớp nhất trong bài viết
    const bestSections = primaryArt.sections.slice(0, 2);
    for (const sec of bestSections) {
      lines.push(`#### ${sec.heading}`);
      for (const p of sec.body) {
        lines.push(p);
      }
      if (sec.bullets && sec.bullets.length > 0) {
        for (const b of sec.bullets) {
          lines.push(`- ${b}`);
        }
      }
      if (sec.formula) {
        lines.push(`\n**Công thức chuẩn:** \`${sec.formula}\``);
      }
      if (sec.table && sec.table.rows.length > 0) {
        lines.push('');
        for (const r of sec.table.rows.slice(0, 6)) {
          lines.push(`- **${r[0]}:** ${r.slice(1).join(' — ')}`);
        }
      }
      lines.push('');
    }
  }

  // Nếu câu hỏi liên quan đến đàm phán / xử lý từ chối KOC
  if (
    matchedObjections.length > 0 &&
    (normQ.includes('tu choi') ||
      normQ.includes('dam phan') ||
      normQ.includes('gia cao') ||
      normQ.includes('im lang') ||
      normQ.includes('khong phan hoi') ||
      normQ.includes('spark ads') ||
      normQ.includes('doc quyen') ||
      normQ.includes('thuyet phuc'))
  ) {
    const obj = matchedObjections[0];
    lines.push(`### Kịch bản xử lý tình huống: ${obj.situation}`);
    lines.push(`- **Nguyên nhân gốc:** ${obj.rootCause}`);
    lines.push(`- **Hướng xử lý:** ${obj.responseStrategy}`);
    lines.push(`- **Mẫu tin nhắn gợi ý gửi đối tác:** "${obj.sampleMessage}"`);
    lines.push(`- **Phương án dự phòng:** ${obj.escalationOrFallback}`);
    lines.push('');
  }

  const citations: QaCitation[] = effectiveArticles.map(art => ({
    id: art.id,
    code: art.code,
    title: art.title,
    sourceDoc: art.sourceDoc,
    category: art.category,
    relatedTab: art.relatedTab,
    relatedTabLabel: art.relatedTabLabel,
  }));

  const suggestedFollowUps = Array.from(
    new Set(
      effectiveArticles
        .flatMap(a => a.sampleQuestions)
        .filter(q => normalizeVietnamese(q) !== normQ)
    )
  ).slice(0, 4);

  return {
    answerMarkdown: lines.join('\n').trim(),
    citations,
    matchedFaqs: topFaqs,
    suggestedFollowUps,
    detectedCalculation,
    detectedLiveEntity,
  };
}

/**
 * Xây dựng ngữ cảnh tri thức (RAG Context) gửi kèm vào LLM (Gemini / OpenAI / Claude)
 * để đảm bảo câu trả lời bám sát 100% quy định thực tế của Upbase B2C.
 */
export function buildRagPromptForMarketingQa(params: {
  question: string;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
}): {
  systemInstruction: string;
  contextPrompt: string;
  localFallback: QaSynthesizedResponse;
} {
  const localFallback = synthesizeMarketingKnowledgeAnswer(params);

  const systemInstruction = [
    'Bạn là Cố vấn Nghiệp vụ & Sổ tay Quy trình Phòng Marketing B2C tại Upbase.',
    'Nguyên tắc trả lời bắt buộc:',
    '1. Trả lời ngắn gọn, thẳng thắn, đúng thuật ngữ vận hành thực tế của phòng Marketing B2C, Kế toán và Pháp chế Upbase.',
    '2. Tuyệt đối KHÔNG dùng từ ngữ quảng cáo sáo rỗng, KHÔNG tự xưng là "AI", "Trí tuệ nhân tạo", "Siêu tốc", "Đột phá", "Toàn diện".',
    '3. Bám sát 100% số liệu, mốc SLA, mã biểu mẫu hợp đồng (1.1.1, 1.1.2, 2.1.1, 2.1.2, 3.1.1, 3.1.2, 4.1, 4.2), khung lương (TAP, KL1-KL7), chính sách thuế (TNCN 10% từ 2 triệu đồng, HKD 7%, VAT 8%/10%) và cơ cấu nhân sự (CEO Đỗ Văn Giang, Trưởng phòng B2C Đặng Thị Yến Nhi, Trưởng nhóm Nguyễn Thị Ngọc Tâm phụ trách 8 gian hàng, 61 gian hàng trình trực tiếp Trưởng phòng) trong tài liệu nguồn dưới đây.',
    '4. Trình bày rõ ràng bằng gạch đầu dòng, nêu rõ mã quy trình / biểu mẫu và bước tiếp theo chuyên viên cần làm.',
  ].join('\n');

  const contextBlocks = localFallback.citations.map(cit => {
    const art = MARKETING_KNOWLEDGE_ARTICLES.find(a => a.id === cit.id);
    if (!art) return '';
    const secDump = art.sections
      .map(
        s =>
          `[${s.heading}]\n${s.body.join('\n')}\n${(s.bullets || []).map(b => `- ${b}`).join('\n')}${
            s.formula ? `\nCông thức: ${s.formula}` : ''
          }`
      )
      .join('\n\n');
    return `=== TÀI LIỆU NGUỒN: ${art.code} - ${art.title} (${art.sourceDoc}) ===\n${art.summary}\n${secDump}`;
  });

  const contextPrompt = [
    'DỮ LIỆU TRI THỨC NỘI BỘ PHÒNG MARKETING B2C UPBASE:',
    ...contextBlocks,
    localFallback.detectedCalculation
      ? `=== KẾT QUẢ TÍNH THUẾ TỰ ĐỘNG ===\n${JSON.stringify(localFallback.detectedCalculation, null, 2)}`
      : '',
    localFallback.detectedLiveEntity
      ? `=== DỮ LIỆU GIAN HÀNG / NHÃN HÀNG TRỰC TIẾP ===\n${JSON.stringify(localFallback.detectedLiveEntity, null, 2)}`
      : '',
    '──────────────────────────────────────────────────',
    `CÂU HỎI CỦA NHÂN SỰ: ${params.question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    systemInstruction,
    contextPrompt,
    localFallback,
  };
}
