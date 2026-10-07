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
  // 📅 THÁNG 10/2026 (THÁNG HIỆN TẠI - 4 KẾ HOẠCH ĐANG TRIỂN KHAI)
  // =========================================================================
  {
    id: 'PLAN-2026-10-FRESH',
    title: 'Kế Hoạch B2C Tháng 10 - Fresh E2E Campaign W41',
    brandName: 'Fresh_TikTok_E2E-C',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
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
    notes: 'Trọng tâm đẩy dòng Sữa Rửa Mặt Đậu Nành & Nước Hoa Hồng qua mạng lưới Creator KL1-KL4 kết hợp Shopee Video Reup.',
    createdAt: '2026-09-28T09:00:00Z',
    updatedAt: '2026-10-06T14:30:00Z',
    items: MOCK_PLAN_SCENARIOS[0].state.items
  },
  {
    id: 'PLAN-2026-10-COMEM',
    title: 'Chiến Dịch Tháng 10 - Cỏ Mềm Mỹ Phẩm Lành & Thật',
    brandName: 'Cỏ Mềm',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Đặng Mai Hà Linh',
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
    notes: 'Đẩy mạnh Son dưỡng Gạo, Bọt rửa mặt Tơ Tằm. Phủ mạnh tệp Mẹ Bỉm sữa và Gen Z văn phòng.',
    createdAt: '2026-09-29T10:15:00Z',
    updatedAt: '2026-10-05T16:00:00Z',
    items: createPlanItemsForScenario(220000000, 95, 'BALANCED', 'Đặng Mai Hà Linh')
  },
  {
    id: 'PLAN-2026-10-COCOON',
    title: 'Kế Hoạch B2C Tháng 10 - Cocoon Cà Phê Đắk Lắk & Bưởi',
    brandName: 'Cocoon',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Phương Thảo',
    totalTargetBudget: 180000000,
    totalTargetContents: 85,
    targetGmv: 1100000000,
    cancellationRate: 0.08,
    strategyPreset: 'BRAND_PUSH',
    status: 'PENDING_APPROVAL',
    statusLabel: 'Chờ Trưởng Phòng Duyệt',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Chiến dịch mùa hanh khô, đẩy mạnh Tẩy da chết Body Cà Phê và Nước dưỡng tóc Tinh dầu Bưởi. Cần book 1 KOL KL6.',
    createdAt: '2026-10-04T08:30:00Z',
    updatedAt: '2026-10-07T11:00:00Z',
    items: createPlanItemsForScenario(180000000, 85, 'BRAND_PUSH', 'Phương Thảo')
  },
  {
    id: 'PLAN-2026-10-FACEREPUBLIC',
    title: 'Kế Hoạch Tối Ưu Chi Phí & Doanh Số - Face Republic W41',
    brandName: 'Face Republic_TikTok_E2E-O',
    month: '2026/10',
    week: 'W41 [05.10 - 11.10]',
    pic: 'Khánh Vy',
    totalTargetBudget: 70000000,
    totalTargetContents: 54,
    targetGmv: 480000000,
    cancellationRate: 0.08,
    strategyPreset: 'COST_SAVER',
    status: 'LEAD_APPROVED',
    statusLabel: 'Trưởng Phòng Đã Duyệt',
    spentBudget: 42000000,
    deliveredContents: 32,
    actualGmv: 310000000,
    notes: 'Ngân sách tối ưu 70M, tập trung KOC KL1-KL3 review chân thực kết hợp Shopee Video Reup.',
    createdAt: '2026-10-01T11:20:00Z',
    updatedAt: '2026-10-06T09:45:00Z',
    items: MOCK_PLAN_SCENARIOS[1]?.state?.items || createPlanItemsForScenario(70000000, 54, 'COST_SAVER', 'Khánh Vy')
  },
  {
    id: 'PLAN-2026-10-SENKA',
    title: 'Mega Campaign Chống Nắng & Làm Sạch - Senka W42',
    brandName: 'Senka_TikTok_E2E-C',
    month: '2026/10',
    week: 'W42 [12.10 - 18.10]',
    pic: 'Nguyễn Thu Trang',
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
    notes: 'Chiến dịch ra mắt Kem Chống Nắng Senka Thế Hệ Mới. Phối hợp 1 Đại sứ KL7 và 2 Ca live độc quyền.',
    createdAt: '2026-09-30T14:00:00Z',
    updatedAt: '2026-10-07T10:15:00Z',
    items: MOCK_PLAN_SCENARIOS[2]?.state?.items || createPlanItemsForScenario(250000000, 115, 'MEGA_SALE', 'Nguyễn Thu Trang')
  },

  // =========================================================================
  // 📅 THÁNG 11/2026 (KẾ HOẠCH SẮP TỚI - DỰ THẢO MEGA SALE 11.11)
  // =========================================================================
  {
    id: 'PLAN-2026-11-SUNPLAY',
    title: 'Chiến Dịch Mega Sale 11.11 - Sunplay Chống Nắng Da Dầu',
    brandName: 'Sunplay',
    month: '2026/11',
    week: 'W45 [02.11 - 08.11]',
    pic: 'Trần Minh Đức',
    totalTargetBudget: 160000000,
    totalTargetContents: 75,
    targetGmv: 950000000,
    cancellationRate: 0.08,
    strategyPreset: 'MEGA_SALE',
    status: 'DRAFT',
    statusLabel: 'Bản Nháp (Đang Lập)',
    spentBudget: 0,
    deliveredContents: 0,
    actualGmv: 0,
    notes: 'Chuẩn bị giỏ hàng và danh sách KOC sớm trước 3 tuần để đón đầu lượng traffic Mega Sale 11.11.',
    createdAt: '2026-10-06T15:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
    items: createPlanItemsForScenario(160000000, 75, 'MEGA_SALE', 'Trần Minh Đức')
  },
  {
    id: 'PLAN-2026-11-COCOON',
    title: 'Chiến Dịch Chăm Sóc Da Mùa Đông 11.11 - Cocoon',
    brandName: 'Cocoon',
    month: '2026/11',
    week: 'W46 [09.11 - 15.11]',
    pic: 'Phương Thảo',
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
    items: createPlanItemsForScenario(140000000, 70, 'BALANCED', 'Phương Thảo')
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
    notes: 'Ra mắt Cushion thế hệ mới và Son kem lì. Đạt 106% KPI GMV đề ra.',
    createdAt: '2026-08-25T08:00:00Z',
    updatedAt: '2026-10-02T17:00:00Z',
    items: createPlanItemsForScenario(190000000, 85, 'BRAND_PUSH', 'Nguyễn Thu Trang')
  },
  {
    id: 'PLAN-2026-09-LEMONADE',
    title: 'Chiến Dịch Tháng 9 - Lemonade Siêu Tiệc Son Tint & Má Kem',
    brandName: 'Lemonade',
    month: '2026/09',
    week: 'W37 [08.09 - 14.09]',
    pic: 'Khánh Vy',
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
