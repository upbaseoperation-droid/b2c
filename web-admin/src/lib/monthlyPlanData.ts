import { InputPlanBreakdownState, InputPlanRowItem, SalaryGrade } from './types';
import { 
  INITIAL_INPUT_PLAN_ITEMS, 
  autoBalancePlanItems, 
  MOCK_PLAN_SCENARIOS 
} from './inputPlanDefaults';

// 🌟 HÀM TẠO ITEMS TỰ ĐỘNG THEO CHIẾN LƯỢC CHO KẾ HOẠCH THÁNG
export function createPlanItemsForScenario(
  budget: number, 
  qty: number, 
  preset: 'BALANCED' | 'GMV_MAX' | 'BRAND_PUSH' | 'COST_SAVER' | 'MEGA_SALE' = 'BALANCED',
  picName: string = 'Đặng Mai Hà Linh'
): InputPlanRowItem[] {
  const balanced = autoBalancePlanItems(INITIAL_INPUT_PLAN_ITEMS, budget, qty, preset);
  
  // Gán phân bổ mẫu cho nhân sự trong team Booking
  const teamMembers = ['Khánh Vy', 'Nguyễn Thu Trang', 'Trần Minh Đức', 'Phạm Thị Thu Hằng'];
  return balanced.map((item, idx) => ({
    ...item,
    assignedStaff: item.assignedStaff || teamMembers[idx % teamMembers.length],
    staffNotes: item.staffNotes || `Chỉ đạo từ PIC ${picName}: Ưu tiên chốt creator uy tín, đảm bảo tỷ lệ hoàn 8%`
  }));
}

// 🌟 DANH MỤC MASTER 11 KẾ HOẠCH THEO THÁNG (MONTHLY PLAN REPOSITORY)
export const INITIAL_MONTHLY_PLANS: InputPlanBreakdownState[] = [
  // =========================================================================
  // 📅 THÁNG 10/2026 (THÁNG HIỆN TẠI - CÁC KẾ HOẠCH THEO CÁC GIAI ĐOẠN DUYỆT)
  // =========================================================================
  {
    id: 'PLAN-2026-10-FRESH',
    title: 'Kế Hoạch B2C Tháng 10 - Fresh E2E Campaign W41',
    brandName: 'Fresh_TikTok_E2E-C',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
    totalTargetBudget: 150000000,
    totalTargetContents: 76,
    targetGmv: 920000000,
    cancellationRate: 0.08,
    strategyPreset: 'GMV_MAX',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 98000000,
    deliveredContents: 48,
    actualGmv: 610000000,
    preApprovedBy: 'Hoàng Quốc Bảo',
    preApprovedAt: '2026-10-01T10:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long (Trưởng Phòng)',
    approvedAt: '2026-10-02T09:00:00Z',
    notes: 'Trọng tâm đẩy dòng Sữa Rửa Mặt Đậu Nành & Nước Hoa Hồng qua mạng lưới Creator KL1-KL4 kết hợp Shopee Video Reup.',
    createdAt: '2026-09-28T09:00:00Z',
    updatedAt: '2026-10-06T14:30:00Z',
    items: MOCK_PLAN_SCENARIOS[0].state.items,
    discussions: [
      {
        id: 'DISC-FRESH-1',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Chào Hà Linh, ngân sách tháng 10 nhãn Fresh chốt trần 150M. Nhãn yêu cầu đẩy mạnh combo Sữa Rửa Mặt Đậu Nành và Nước Hoa Hồng. Kỳ vọng GMV tối thiểu 920M để đạt ROI trên 6.0x.',
        type: 'COMMENT',
        timestamp: '2026-09-29T10:15:00Z',
        tags: ['Ngân Sách', 'HeroSKU', 'Chỉ Số KPI']
      },
      {
        id: 'DISC-FRESH-2',
        authorName: 'Đặng Mai Hà Linh',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist PIC',
        content: 'Dạ anh Bảo, em đã phân rã xong 76 video cho W41. Trong đó TikTok Shop chiếm 45 video (58M), Shopee Video 25 video (30M) và 2 ca Livestream độc quyền (35M). Dự phòng định mức hủy đúng 8%. Nhờ anh xem qua.',
        type: 'COMMENT',
        timestamp: '2026-09-30T14:30:00Z',
        tags: ['TikTok Shop', 'Shopee Video', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-FRESH-3',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Anh đã kiểm tra cơ cấu phân rã: Tỷ lệ phân bổ kênh hợp lý, CIR dự kiến 16.3% nằm trong biên độ an toàn của nhãn. Xác nhận SƠ DUYỆT ĐẠT để trình Trưởng phòng duyệt chính thức.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T10:00:00Z',
        tags: ['Sơ Duyệt Đạt', 'CIR']
      },
      {
        id: 'DISC-FRESH-4',
        authorName: 'Nguyễn Hoàng Long',
        authorRole: 'LEAD',
        authorTitle: 'Trưởng Phòng B2C',
        content: 'Trưởng phòng phê duyệt chính thức kế hoạch tháng 10 của Fresh. Team Booking tiến hành ký cam kết creator và bắt đầu giải ngân tạm ứng.',
        type: 'FINAL_APPROVAL_PASS',
        timestamp: '2026-10-02T09:00:00Z',
        tags: ['Phê Duyệt Chính Thức']
      },
      {
        id: 'DISC-FRESH-5',
        authorName: 'Hệ Thống',
        authorRole: 'SYSTEM',
        authorTitle: 'B2C Operations Bot',
        content: 'Kế hoạch đã chuyển sang trạng thái Đang Thực Thi. Đã đồng bộ phân công công việc cho 4 nhân sự Booking phụ trách.',
        type: 'STATUS_CHANGE',
        timestamp: '2026-10-02T09:05:00Z',
        tags: ['Trạng Thái']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-COCOON',
    title: 'Kế Hoạch B2C Tháng 10 - Cocoon Cà Phê Đắk Lắk & Bưởi',
    brandName: 'Cocoon',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Phương Thảo',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 180000000,
    totalTargetContents: 85,
    targetGmv: 1100000000,
    cancellationRate: 0.08,
    strategyPreset: 'BRAND_PUSH',
    status: 'PENDING_PRE_APPROVAL',
    statusLabel: 'Chờ Growth Sơ Duyệt',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Chiến dịch mùa hanh khô, đẩy mạnh Tẩy da chết Body Cà Phê và Nước dưỡng tóc Tinh dầu Bưởi. Cần book 1 KOL KL6.',
    createdAt: '2026-10-04T08:30:00Z',
    updatedAt: '2026-10-07T11:00:00Z',
    items: createPlanItemsForScenario(180000000, 85, 'BRAND_PUSH', 'Phương Thảo'),
    discussions: [
      {
        id: 'DISC-COCOON-1',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Chào chị Ánh, em gửi phân rã dự thảo W42 cho Cocoon: Ngân sách trần 180M, chỉ tiêu 85 video, target GMV 1.1 Tỷ. Em đã cơ cấu 1 KOL KL6 (40M) và 35 video Shopee Video Reup 0đ để kéo CIR.',
        type: 'COMMENT',
        timestamp: '2026-10-05T14:15:00Z',
        tags: ['Ngân Sách', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-COCOON-2',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Thảo ơi, dòng Tẩy da chết Cà Phê Đắk Lắk đang là hero SKU mùa này. Chị thấy tỷ trọng ngân sách TikTok Shop đang hơi thấp (42%), trong khi tuần Mega 10.10 TikTok đang trợ giá voucher 18%. Em cân nhắc tăng slot KL3-KL4 TikTok Shop lên khoảng 55-60% ngân sách được không?',
        type: 'COMMENT',
        timestamp: '2026-10-06T09:30:00Z',
        tags: ['TikTok Shop', 'HeroSKU', 'Ngân Sách']
      },
      {
        id: 'DISC-COCOON-3',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Dạ em đã cập nhật lại cơ cấu: Tăng thêm 6 creator KL3 bên TikTok Shop và giảm bớt 2 ca live phụ để giữ đúng trần 180M. GMV dự kiến tăng lên 1.18 Tỷ. Em đã gửi sơ duyệt, nhờ chị Ánh thẩm định và bấm Sơ Duyệt Thông Qua giúp em nhé!',
        type: 'COMMENT',
        timestamp: '2026-10-07T10:45:00Z',
        tags: ['TikTok Shop', 'Chỉ Số KPI']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-FACEREPUBLIC',
    title: 'Kế Hoạch Tối Ưu Chi Phí & Doanh Số - Face Republic W41',
    brandName: 'Face Republic_TikTok_E2E-O',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Khánh Vy',
    growthPic: 'Vũ Thùy Linh (Growth Lead)',
    totalTargetBudget: 70000000,
    totalTargetContents: 54,
    targetGmv: 480000000,
    cancellationRate: 0.08,
    strategyPreset: 'COST_SAVER',
    status: 'PRE_APPROVED',
    statusLabel: 'Sơ Duyệt Đạt (Chờ Phê Duyệt)',
    spentBudget: 42000000,
    deliveredContents: 32,
    actualGmv: 310000000,
    preApprovedBy: 'Vũ Thùy Linh',
    preApprovedAt: '2026-10-06T15:30:00Z',
    preApprovalNotes: 'Đồng ý cơ cấu ngân sách 70M tối ưu, CIR 14.5%, GMV mục tiêu 480M khả thi.',
    notes: 'Ngân sách tối ưu 70M, tập trung KOC KL1-KL3 review chân thực kết hợp Shopee Video Reup.',
    createdAt: '2026-10-01T11:20:00Z',
    updatedAt: '2026-10-06T09:45:00Z',
    items: MOCK_PLAN_SCENARIOS[1]?.state?.items || createPlanItemsForScenario(70000000, 54, 'COST_SAVER', 'Khánh Vy'),
    discussions: [
      {
        id: 'DISC-FACE-1',
        authorName: 'Khánh Vy',
        authorRole: 'BOOKING',
        authorTitle: 'Senior Booking Specialist',
        content: 'Gửi chị Linh phương án Cost Saver 70M cho Face Republic, tập trung phủ KOC KL1-KL3 review chân thực, chi phí trung bình 1.2M/video.',
        type: 'COMMENT',
        timestamp: '2026-10-05T10:00:00Z',
        tags: ['Ngân Sách', 'Cơ Cấu Creator']
      },
      {
        id: 'DISC-FACE-2',
        authorName: 'Vũ Thùy Linh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Lead',
        content: 'Chị đồng ý với cơ cấu này. CIR đạt 14.5% rất đẹp, tỷ lệ hoàn 8% được kiểm soát tốt. Chị đã bấm [Sơ Duyệt Đạt], Vy trình Trưởng phòng Long duyệt chính thức nhé.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-06T15:30:00Z',
        tags: ['Sơ Duyệt Đạt', 'CIR']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-COMEM',
    title: 'Chiến Dịch Tháng 10 - Cỏ Mềm Mỹ Phẩm Lành & Thật',
    brandName: 'Cỏ Mềm',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 220000000,
    totalTargetContents: 95,
    targetGmv: 1350000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 145000000,
    deliveredContents: 62,
    actualGmv: 890000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-10-01T16:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-10-02T10:00:00Z',
    notes: 'Đẩy mạnh Son dưỡng Gạo, Bọt rửa mặt Tơ Tằm. Phủ mạnh tệp Mẹ Bỉm sữa và Gen Z văn phòng.',
    createdAt: '2026-09-29T10:15:00Z',
    updatedAt: '2026-10-05T16:00:00Z',
    items: createPlanItemsForScenario(220000000, 95, 'BALANCED', 'Đặng Mai Hà Linh'),
    discussions: [
      {
        id: 'DISC-COMEM-1',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Cỏ Mềm đợt này chốt ngân sách 220M, push mạnh son dưỡng Gạo đón đợt không khí lạnh.',
        type: 'COMMENT',
        timestamp: '2026-09-30T10:00:00Z',
        tags: ['Ngân Sách', 'HeroSKU']
      },
      {
        id: 'DISC-COMEM-2',
        authorName: 'Đặng Mai Hà Linh',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Đã hoàn thành phân rã 95 nội dung, tỷ trọng KOC mẹ bỉm chiếm 60%.',
        type: 'COMMENT',
        timestamp: '2026-10-01T14:00:00Z',
        tags: ['Cơ Cấu Creator']
      },
      {
        id: 'DISC-COMEM-3',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Sơ duyệt đạt. Cơ cấu đẹp, đủ điều kiện trình duyệt.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T16:00:00Z',
        tags: ['Sơ Duyệt Đạt']
      }
    ]
  },
  {
    id: 'PLAN-2026-10-SENKA',
    title: 'Mega Campaign Chống Nắng & Làm Sạch - Senka W42',
    brandName: 'Senka_TikTok_E2E-C',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Nguyễn Thu Trang',
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
    totalTargetBudget: 250000000,
    totalTargetContents: 115,
    targetGmv: 1450000000,
    cancellationRate: 0.08,
    strategyPreset: 'MEGA_SALE',
    status: 'IN_EXECUTION',
    statusLabel: 'Đang Thực Thi (Đã Duyệt)',
    spentBudget: 175000000,
    deliveredContents: 78,
    actualGmv: 1020000000,
    preApprovedBy: 'Hoàng Quốc Bảo',
    preApprovedAt: '2026-10-01T11:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-10-01T17:00:00Z',
    notes: 'Chiến dịch ra mắt Kem Chống Nắng Senka Thế Hệ Mới. Phối hợp 1 Đại sứ KL7 và 2 Ca live độc quyền.',
    createdAt: '2026-09-30T14:00:00Z',
    updatedAt: '2026-10-07T10:15:00Z',
    items: MOCK_PLAN_SCENARIOS[2]?.state?.items || createPlanItemsForScenario(250000000, 115, 'MEGA_SALE', 'Nguyễn Thu Trang'),
    discussions: [
      {
        id: 'DISC-SENKA-1',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Senka đẩy 250M cho đợt ra mắt KCN mới, cần kiểm tra kỹ năng lực ca live độc quyền.',
        type: 'COMMENT',
        timestamp: '2026-10-01T09:00:00Z',
        tags: ['Ngân Sách', 'Livestream']
      },
      {
        id: 'DISC-SENKA-2',
        authorName: 'Hoàng Quốc Bảo',
        authorRole: 'GROWTH',
        authorTitle: 'Senior Growth Specialist',
        content: 'Đã thẩm định xong. Sơ duyệt đạt.',
        type: 'PRE_APPROVAL_PASS',
        timestamp: '2026-10-01T11:00:00Z',
        tags: ['Sơ Duyệt Đạt']
      }
    ]
  },

  // =========================================================================
  // 📅 THÁNG 11/2026 (KẾ HOẠCH SẮP TỚI - CÓ KẾ HOẠCH BỊ YÊU CẦU HIỆU CHỈNH)
  // =========================================================================
  {
    id: 'PLAN-2026-11-SUNPLAY',
    title: 'Chiến Dịch Mega Sale 11.11 - Sunplay Chống Nắng Da Dầu',
    brandName: 'Sunplay',
    month: '2026/11',
    week: 'W45 [02.11 - 08.11]',
    pic: 'Trần Minh Đức',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 160000000,
    totalTargetContents: 75,
    targetGmv: 950000000,
    cancellationRate: 0.08,
    strategyPreset: 'MEGA_SALE',
    status: 'REVISION_REQUESTED',
    statusLabel: 'Yêu Cầu Hiệu Chỉnh',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    revisionNotes: 'Tỷ trọng Shopee Video đang để 0đ trong khi tháng 11 Shopee có hỗ trợ traffic mạnh cho hashtag #ChongNang. Đức phân rã lại tối thiểu 15 video Shopee và điều chỉnh ngân sách.',
    notes: 'Chuẩn bị giỏ hàng và danh sách KOC sớm trước 3 tuần để đón đầu lượng traffic Mega Sale 11.11.',
    createdAt: '2026-10-06T15:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
    items: createPlanItemsForScenario(160000000, 75, 'MEGA_SALE', 'Trần Minh Đức'),
    discussions: [
      {
        id: 'DISC-SUNPLAY-1',
        authorName: 'Trần Minh Đức',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Em gửi bản phân rã dự thảo 160M cho Sunplay chiến dịch 11.11, dồn toàn lực vào TikTok Shop 75 video.',
        type: 'COMMENT',
        timestamp: '2026-10-06T16:00:00Z',
        tags: ['Ngân Sách', 'TikTok Shop']
      },
      {
        id: 'DISC-SUNPLAY-2',
        authorName: 'Trần Thị Ánh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Manager',
        content: 'Chị review thấy kênh Shopee Video đang để 0đ là chưa tối ưu, tháng 11 Shopee có hỗ trợ traffic mạnh cho hashtag #ChongNang. Đức phân rã lại tối thiểu 15 video Shopee và điều chỉnh ngân sách sang đa sàn nhé.',
        type: 'REVISION_REQUEST',
        timestamp: '2026-10-07T09:30:00Z',
        tags: ['Yêu Cầu Hiệu Chỉnh', 'Shopee Video']
      }
    ]
  },
  {
    id: 'PLAN-2026-11-COCOON',
    title: 'Chiến Dịch Chăm Sóc Da Mùa Đông 11.11 - Cocoon',
    brandName: 'Cocoon',
    month: '2026/11',
    week: 'W46 [09.11 - 15.11]',
    pic: 'Phương Thảo',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 140000000,
    totalTargetContents: 70,
    targetGmv: 880000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'DRAFT',
    statusLabel: 'Bản Nháp (Đang Lập)',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Kế hoạch dự thảo cho tuần siêu sale 11.11. Dự kiến đẩy Combo Dưỡng Ẩm Chuyên Sâu.',
    createdAt: '2026-10-07T09:30:00Z',
    updatedAt: '2026-10-07T09:30:00Z',
    items: createPlanItemsForScenario(140000000, 70, 'BALANCED', 'Phương Thảo'),
    discussions: [
      {
        id: 'DISC-COCOON11-1',
        authorName: 'Phương Thảo',
        authorRole: 'BOOKING',
        authorTitle: 'Booking Specialist',
        content: 'Em đang lên khung phân rã 140M cho tuần 46, dự kiến đẩy mạnh Combo dưỡng ẩm chuyên sâu Cocoon.',
        type: 'COMMENT',
        timestamp: '2026-10-07T09:35:00Z',
        tags: ['Ngân Sách']
      }
    ]
  },

  // =========================================================================
  // 📅 THÁNG 09/2026 (THÁNG TRƯỚC - ĐÃ HOÀN THÀNH NGHIỆM THU)
  // =========================================================================
  {
    id: 'PLAN-2026-09-CLIO',
    title: 'Chiến Dịch Tháng 9 - Clio Cosmetics Make-up Chuẩn Hàn',
    brandName: 'Clio_TikTok_E2E-C',
    month: '2026/09',
    week: 'W38 [15.09 - 21.09]',
    pic: 'Nguyễn Thu Trang',
    growthPic: 'Vũ Thùy Linh (Growth Lead)',
    totalTargetBudget: 190000000,
    totalTargetContents: 85,
    targetGmv: 1150000000,
    cancellationRate: 0.08,
    strategyPreset: 'BRAND_PUSH',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 188000000,
    deliveredContents: 85,
    actualGmv: 1220000000,
    preApprovedBy: 'Vũ Thùy Linh',
    preApprovedAt: '2026-08-30T10:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-09-01T09:00:00Z',
    notes: 'Ra mắt Cushion thế hệ mới và Son kem lì. Đạt 106% KPI GMV đề ra.',
    createdAt: '2026-08-25T08:00:00Z',
    updatedAt: '2026-10-02T17:00:00Z',
    items: createPlanItemsForScenario(190000000, 85, 'BRAND_PUSH', 'Nguyễn Thu Trang'),
    discussions: [
      {
        id: 'DISC-CLIO-1',
        authorName: 'Vũ Thùy Linh',
        authorRole: 'GROWTH',
        authorTitle: 'Growth Lead',
        content: 'Clio đã nghiệm thu tháng 9 đạt 106% GMV kế hoạch. Khen ngợi team Booking đã kiểm soát tỷ lệ hoàn hủy dưới 6.5%.',
        type: 'COMMENT',
        timestamp: '2026-10-02T17:00:00Z',
        tags: ['Chỉ Số KPI', 'Nghiệm Thu']
      }
    ]
  },
  {
    id: 'PLAN-2026-09-LEMONADE',
    title: 'Chiến Dịch Tháng 9 - Lemonade Siêu Tiệc Son Tint & Má Kem',
    brandName: 'Lemonade',
    month: '2026/09',
    week: 'W37 [08.09 - 14.09]',
    pic: 'Khánh Vy',
    growthPic: 'Trần Thị Ánh (Growth Manager)',
    totalTargetBudget: 130000000,
    totalTargetContents: 60,
    targetGmv: 780000000,
    cancellationRate: 0.08,
    strategyPreset: 'GMV_MAX',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 129000000,
    deliveredContents: 60,
    actualGmv: 815000000,
    preApprovedBy: 'Trần Thị Ánh',
    preApprovedAt: '2026-08-29T11:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-08-31T15:00:00Z',
    notes: 'Chiến dịch Son Tint nước và Má hồng kem. Tệp Gen Z tương tác cực mạnh.',
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-09-30T16:30:00Z',
    items: createPlanItemsForScenario(130000000, 60, 'GMV_MAX', 'Khánh Vy')
  },
  {
    id: 'PLAN-2026-09-SENKA',
    title: 'Chiến Dịch Tháng 9 - Senka Bọt Rửa Mặt & Sạch Sâu',
    brandName: 'Senka_TikTok_E2E-C',
    month: '2026/09',
    week: 'W39 [22.09 - 28.09]',
    pic: 'Phạm Thị Thu Hằng',
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
    totalTargetBudget: 210000000,
    totalTargetContents: 95,
    targetGmv: 1300000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 208000000,
    deliveredContents: 95,
    actualGmv: 1340000000,
    preApprovedBy: 'Hoàng Quốc Bảo',
    preApprovedAt: '2026-08-31T09:00:00Z',
    approvedBy: 'Nguyễn Hoàng Long',
    approvedAt: '2026-09-01T14:00:00Z',
    notes: 'Chiến dịch bứt phá doanh số cuối quý 3. Đạt 103% chỉ tiêu.',
    createdAt: '2026-08-30T09:00:00Z',
    updatedAt: '2026-10-02T10:00:00Z',
    items: createPlanItemsForScenario(210000000, 95, 'BALANCED', 'Phạm Thị Thu Hằng')
  },

  // =========================================================================
  // 📅 THÁNG 08/2026 (LỊCH SỬ THÁNG 8)
  // =========================================================================
  {
    id: 'PLAN-2026-08-TMCLEAN',
    title: 'Kế Hoạch Tẩy Rửa Đa Năng - TM Clean Mùa Mưa Tháng 8',
    brandName: 'TM Clean_TikTok_E2E-C',
    month: '2026/08',
    week: 'W32 [04.08 - 10.08]',
    pic: 'Trần Minh Đức',
    growthPic: 'Vũ Thùy Linh (Growth Lead)',
    totalTargetBudget: 50000000,
    totalTargetContents: 48,
    targetGmv: 350000000,
    cancellationRate: 0.08,
    strategyPreset: 'COST_SAVER',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 49500000,
    deliveredContents: 48,
    actualGmv: 362000000,
    notes: 'Ngành hàng gia dụng, tận dụng video chuyển đổi trước/sau (Before-After).',
    createdAt: '2026-07-28T09:00:00Z',
    updatedAt: '2026-08-31T17:00:00Z',
    items: MOCK_PLAN_SCENARIOS[3]?.state?.items || createPlanItemsForScenario(50000000, 48, 'COST_SAVER', 'Trần Minh Đức')
  },
  {
    id: 'PLAN-2026-08-FRESH',
    title: 'Chiến Dịch Tháng 8 - Fresh Back To School Sinh Viên',
    brandName: 'Fresh_TikTok_E2E-C',
    month: '2026/08',
    week: 'W34 [18.08 - 24.08]',
    pic: 'Đặng Mai Hà Linh',
    growthPic: 'Hoàng Quốc Bảo (Senior Growth)',
    totalTargetBudget: 120000000,
    totalTargetContents: 65,
    targetGmv: 720000000,
    cancellationRate: 0.08,
    strategyPreset: 'BALANCED',
    status: 'COMPLETED',
    statusLabel: 'Đã Hoàn Thành (Nghiệm Thu)',
    spentBudget: 119000000,
    deliveredContents: 65,
    actualGmv: 755000000,
    notes: 'Tập trung bộ dưỡng da sinh viên tựu trường. Đạt 105% GMV.',
    createdAt: '2026-07-30T10:00:00Z',
    updatedAt: '2026-08-31T18:00:00Z',
    items: createPlanItemsForScenario(120000000, 65, 'BALANCED', 'Đặng Mai Hà Linh')
  }
];

// Danh sách các chu kỳ tháng hỗ trợ
export const AVAILABLE_MONTHS = [
  { value: 'ALL', label: 'Tất Cả Các Tháng', badge: '11 Plans' },
  { value: '2026/10', label: 'Tháng 10/2026 (Hiện tại)', badge: '5 Plans', isCurrent: true },
  { value: '2026/11', label: 'Tháng 11/2026 (Sắp tới)', badge: '2 Plans' },
  { value: '2026/09', label: 'Tháng 09/2026', badge: '3 Plans' },
  { value: '2026/08', label: 'Tháng 08/2026', badge: '2 Plans' }
];
