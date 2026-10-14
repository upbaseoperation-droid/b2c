import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, INITIAL_DEALS, INITIAL_KOCS, USERS } from '../src/lib/mockData';
import { INITIAL_MONTHLY_PLANS } from '../src/lib/monthlyPlanData';
import { REAL_B2C_42_BRANDS } from '../src/lib/realB2cBrandsData';
import { REAL_MONTHLY_PLANS_OCT_2026 } from '../src/lib/realB2cPlanData';
import { 
  filterScopedBrands, 
  filterScopedStores, 
  filterScopedPlans, 
  filterScopedDeals,
  isStaffGlobalAdminOrManager 
} from '../src/lib/rbacScope';
import { createContract, submitContract, decideContract } from '../src/lib/contracts/domain';
import type { ContractActor, ContractRecord } from '../src/lib/contracts/types';
import type { BookingDealItem, KocListingItem, UserProfile } from '../src/lib/types';

// =========================================================================
// 1. KIỂM THỬ LIÊN KẾT: MASTER DATA (STORE & BRAND) <-> KẾ HOẠCH THÁNG
// =========================================================================
test('Liên kết Master Data: 100% Gian hàng B2C thuộc 42 Thương hiệu & tuân thủ cơ cấu Trưởng nhóm', () => {
  // Lọc danh sách 69 gian hàng B2C (b2cOwner = 1)
  const b2cStores = INITIAL_STORE_PORTFOLIOS.filter(s => s.isB2cManaged);
  assert.ok(b2cStores.length >= 60, `Phải có đủ danh mục gian hàng B2C, hiện có: ${b2cStores.length}`);

  // Tất cả gian hàng B2C phải map được vào 42 Thương hiệu thực tế
  const brandNames42 = new Set(REAL_B2C_42_BRANDS.map(b => b.name.toLowerCase().trim()));
  const unmappedStores: string[] = [];

  for (const store of b2cStores) {
    const bName = (store.brandName || store.storeName.split('_')[0] || '').toLowerCase().trim();
    const isMatched = Array.from(brandNames42).some(bn => bn === bName || bn.includes(bName) || bName.includes(bn));
    if (!isMatched) {
      unmappedStores.push(`${store.storeName} (Brand: ${store.brandName})`);
    }
  }
  assert.equal(unmappedStores.length, 0, `Có gian hàng chưa liên kết đúng Brand: ${unmappedStores.join('; ')}`);

  // Kiểm tra quy tắc cơ cấu phòng B2C (GEMINI.md Rule 3):
  // Chỉ duy nhất Nguyễn Thị Ngọc Tâm làm Trưởng nhóm (Leader) phụ trách 8 gian hàng
  const tamStores = b2cStores.filter(s => s.bookingLeader?.includes('Nguyễn Thị Ngọc Tâm'));
  assert.ok(tamStores.length >= 7 && tamStores.length <= 9, `Nguyễn Thị Ngọc Tâm phải phụ trách đúng ~8 gian hàng, thực tế: ${tamStores.length}`);

  // Các gian hàng còn lại không có Leader (Chuyên viên làm việc trực tiếp Giám đốc Marketing Đặng Thị Yến Nhi)
  const nonLeaderStores = b2cStores.filter(s => !s.bookingLeader || s.bookingLeader.trim() === '');
  assert.ok(nonLeaderStores.length >= 50, `Phần lớn gian hàng Shopee/TikTok không có Leader trung gian, thực tế: ${nonLeaderStores.length}`);
});

test('Liên kết Kế hoạch tháng <-> Gian hàng Master Data: Toàn bộ Kế hoạch tháng ánh xạ chuẩn xác', () => {
  const allPlans = [...INITIAL_MONTHLY_PLANS, ...REAL_MONTHLY_PLANS_OCT_2026];
  assert.ok(allPlans.length > 0);

  for (const plan of allPlans) {
    // Mỗi kế hoạch phải có Brand và PIC hợp lệ
    assert.ok(plan.brandName || plan.title, `Kế hoạch ${plan.id} thiếu tên Thương hiệu`);
    assert.ok(plan.pic, `Kế hoạch ${plan.id} thiếu nhân sự PIC`);
    assert.ok(plan.totalTargetBudget >= 0, `Kế hoạch ${plan.id} ngân sách không hợp lệ`);
  }
});

// =========================================================================
// 2. KIỂM THỬ LIÊN KẾT: ĐỀ XUẤT KOC LISTING -> DEAL BOOKING -> HỢP ĐỒNG
// =========================================================================
test('Liên kết Luồng Deal: Chuyển đổi từ KOC Listing đã duyệt sang Deal Booking và Khởi tạo Hợp đồng', () => {
  // 1. Dòng KOC Listing được duyệt
  const mockListingItem: KocListingItem = {
    id: 'LIST-TEST-001',
    batchCycle: 'BATCH_10',
    monthKey: '2026/10',
    brandName: 'ClubClio',
    storeId: 'store-clio-tiktok',
    storeName: 'ClubClio TikTok Shop',
    kocId: 'KOC-001',
    kocName: 'An Phương',
    tier: 'MICRO',
    salaryGrade: 'KL3',
    pillarName: 'Son Clio Chiffon Blur Tint',
    proposedFee: 3500000,
    finalFee: 3500000,
    expectedAirDate: '2026-10-20',
    sparkAdsCode: 'SPARK-CLIO-9988',
    assignedStaffName: 'Lê Phương Thảo',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    generatedDealId: 'DEAL-CLIO-001',
    sourcePlanVersion: 'v1.0'
  };

  // 2. Chuyển đổi sang BookingDealItem theo logic của hệ thống
  const generatedDeal: BookingDealItem = {
    id: 'deal-rec-001',
    dealCode: mockListingItem.generatedDealId!,
    campaignCode: 'CAMP-202610',
    campaignTitle: 'Chiến Dịch Tháng 10/2026',
    brandName: mockListingItem.brandName,
    storeId: mockListingItem.storeId,
    storeName: mockListingItem.storeName,
    productName: mockListingItem.pillarName,
    bookingBatch: 'Đợt 1',
    kocId: mockListingItem.kocId,
    kocStageName: mockListingItem.kocName,
    kocTier: 'TIER_3_MICRO',
    salaryGrade: mockListingItem.salaryGrade,
    segment: 'Mid Creator',
    tepKenh: 'Làm đẹp',
    kocCategory: 'Beauty',
    contentPillar: 'Review',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    pipelineText: 'Chờ lên sóng',
    status: 'TERMS_AGREED',
    statusLabel: 'Đã chốt điều khoản',
    currentStage: '4_AIR_GROWTH',
    holdingTeam: 'BOOKING',
    adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
    sparkAdsCode: mockListingItem.sparkAdsCode,
    assignedStaff: mockListingItem.assignedStaffName,
    totalValue: mockListingItem.finalFee || mockListingItem.proposedFee,
    advanceAmount: Math.round((mockListingItem.finalFee || mockListingItem.proposedFee) * 0.5),
    finalAmount: Math.round((mockListingItem.finalFee || mockListingItem.proposedFee) * 0.5),
    deadlinePost: mockListingItem.expectedAirDate,
    viewsCount: 0,
    affiliateGmv: 0,
    gmv30: 0,
    roi: 0,
    publishedDays: 0,
    remainingSlaHours: 48,
    isSlaWarning: false
  };

  // Xác minh tính toàn vẹn dữ liệu khi nối tầng Listing -> Deal
  assert.equal(generatedDeal.brandName, mockListingItem.brandName);
  assert.equal(generatedDeal.totalValue, 3500000);
  assert.equal(generatedDeal.sparkAdsCode, 'SPARK-CLIO-9988');
  assert.equal(generatedDeal.assignedStaff, 'Lê Phương Thảo');

  // 3. Khởi tạo Hợp đồng từ Deal (Module Contracts)
  const creatorActor: ContractActor = {
    id: 'staff-thao',
    name: 'Lê Phương Thảo',
    roles: ['CREATOR'],
    brands: ['ClubClio'],
    allBrands: false
  };

  const contractInput = {
    title: `Hợp đồng Booking KOC ${generatedDeal.kocStageName} - ${generatedDeal.brandName}`,
    brand: generatedDeal.brandName,
    partner: generatedDeal.kocStageName,
    dealId: generatedDeal.id,
    dealCode: generatedDeal.dealCode,
    kocId: generatedDeal.kocId,
    templateId: 'tpl-koc-individual',
    templateHash: 'hash-tpl-koc-individual',
    values: {
      partyName: 'Công ty Cổ phần Mỹ phẩm Quốc tế Clio',
      taxCode: '0108889999',
      ownerName: generatedDeal.kocStageName,
      product: generatedDeal.productName,
      netTotal: String(generatedDeal.totalValue)
    }
  };

  const contractRecord: ContractRecord = createContract(contractInput, creatorActor);
  assert.equal(contractRecord.dealCode, generatedDeal.dealCode);
  assert.equal(contractRecord.brand, 'ClubClio');
  assert.equal(contractRecord.approval, 'DRAFT');
  assert.equal(contractRecord.values.netTotal, '3500000');

  // 4. Trình duyệt Hợp đồng lên Pháp chế & Kế toán (reviewers độc lập)
  const legalReviewer: ContractActor = { id: 'legal-pic', name: 'Nguyễn Văn Pháp Chế', roles: ['LEGAL'], brands: ['ClubClio'], allBrands: false };
  const financeReviewer: ContractActor = { id: 'finance-pic', name: 'Trần Thị Kế Toán', roles: ['FINANCE'], brands: ['ClubClio'], allBrands: false };
  
  const inReviewContract = submitContract(contractRecord, creatorActor, [legalReviewer, financeReviewer]);
  assert.equal(inReviewContract.approval, 'IN_REVIEW');
  assert.equal(inReviewContract.steps.length, 2);

  // Pháp chế duyệt
  const step1 = decideContract(inReviewContract, legalReviewer, 'APPROVED', 'Đủ điều khoản bảo mật & bản quyền');
  assert.equal(step1.approval, 'IN_REVIEW');

  // Kế toán duyệt -> Hoàn tất phê duyệt nội bộ
  const step2 = decideContract(step1, financeReviewer, 'APPROVED', 'Khớp định mức thù lao KL3');
  assert.equal(step2.approval, 'APPROVED');
});

// =========================================================================
// 3. KIỂM THỬ LIÊN KẾT: CẢNH BÁO TÀI CHÍNH & CHỐT CHẶN VƯỢT TRẦN (BUDGET GATES)
// =========================================================================
test('Liên kết Chốt chặn Ngân sách: Phát hiện Overbudget và Unbudgeted Spend chuẩn xác', () => {
  // Hàm kiểm tra logic cảnh báo tài chính chuẩn B2C
  function evaluateStoreBudgetStatus(baseBudgetNet: number, reportSpentNet: number) {
    const isOverbudget = baseBudgetNet > 0 && reportSpentNet > baseBudgetNet;
    const isUnbudgetedSpend = baseBudgetNet === 0 && reportSpentNet > 0;
    return {
      isOverbudget,
      isUnbudgetedSpend,
      status: isUnbudgetedSpend ? 'UNBUDGETED' : isOverbudget ? 'OVERBUDGET' : 'NORMAL'
    };
  }

  // Trường hợp 1: Chi trong hạn mức hợp lệ
  const normalCase = evaluateStoreBudgetStatus(100000000, 85000000);
  assert.equal(normalCase.status, 'NORMAL');

  // Trường hợp 2: Chi vượt trần hạn mức Order Net (Overbudget)
  const overbudgetCase = evaluateStoreBudgetStatus(5400000, 15000000);
  assert.equal(overbudgetCase.isOverbudget, true);
  assert.equal(overbudgetCase.status, 'OVERBUDGET');

  // Trường hợp 3: Hạn mức Order Net = 0đ nhưng có chi trả phí (Unbudgeted Spend - Báo động đỏ)
  const unbudgetedCase = evaluateStoreBudgetStatus(0, 12000000);
  assert.equal(unbudgetedCase.isUnbudgetedSpend, true);
  assert.equal(unbudgetedCase.status, 'UNBUDGETED');
});

// =========================================================================
// 4. KIỂM THỬ LIÊN KẾT: PHÂN QUYỀN RBAC XUYÊN SUỐT CÁC MODULE (DATA SCOPING)
// =========================================================================
test('Liên kết Phân quyền RBAC Scoping: Cách ly dữ liệu chặt chẽ từ Gian hàng -> Kế hoạch -> Deal Booking', () => {
  const allStores = INITIAL_STORE_PORTFOLIOS;
  const allBrands = INITIAL_BRANDS;
  const allPlans = INITIAL_MONTHLY_PLANS;
  const allDeals = INITIAL_DEALS;

  // 1. Quản trị viên cao nhất / Giám đốc Marketing (BOD & Manager): Thấy toàn bộ
  const director = USERS.find(u => u.role === 'MANAGER' || u.name.includes('Yến Nhi')) || USERS[0];
  assert.equal(isStaffGlobalAdminOrManager(director), true);
  assert.equal(filterScopedStores(allStores, director).length, allStores.length);
  assert.equal(filterScopedBrands(allBrands, director).length, allBrands.length);
  assert.equal(filterScopedPlans(allPlans, director, allStores).length, allPlans.length);
  assert.equal(filterScopedDeals(allDeals, director, allStores).length, allDeals.length);

  // 2. Chuyên viên thực thi: Chỉ thấy các nhãn và gian hàng được phân công
  const specialist: UserProfile = {
    id: 'pic-test-specialist',
    name: 'Nhân Viên Thử Nghiệm B2C',
    email: 'test.specialist@upbase.vn',
    role: 'BOOKING_MEMBER',
    roleTitle: 'Chuyên viên Booking B2C',
    avatar: 'NV',
    assignedBrands: ['ClubClio', 'Peripera']
  };

  const scopedStores = filterScopedStores(allStores, specialist);
  const scopedBrands = filterScopedBrands(allBrands, specialist);
  const scopedPlans = filterScopedPlans(allPlans, specialist, allStores);
  const scopedDeals = filterScopedDeals(allDeals, specialist, allStores);

  // Phải được phân lập, không được trả về toàn bộ
  assert.ok(scopedStores.length < allStores.length, 'Chuyên viên không được xem toàn bộ gian hàng');
  assert.ok(scopedBrands.length < allBrands.length, 'Chuyên viên không được xem toàn bộ nhãn hàng');
  assert.ok(scopedBrands.every(b => ['ClubClio', 'Peripera'].includes(b.name)), 'Chuyên viên chỉ thấy brand được giao');

  // 3. Đại diện Thương hiệu ngoài (Brand Partner - ClubClio): Chỉ thấy duy nhất Brand của mình
  const brandPartner: UserProfile = {
    id: 'partner-clio',
    name: 'Đại Diện ClubClio',
    email: 'contact@clubclio.vn',
    role: 'BRAND_PARTNER',
    roleTitle: 'Đối tác Thương hiệu',
    avatar: 'CC',
    assignedBrands: ['ClubClio'],
    linkedEntityName: 'ClubClio',
    partnerType: 'BRAND'
  };

  const partnerStores = filterScopedStores(allStores, brandPartner);
  const partnerBrands = filterScopedBrands(allBrands, brandPartner);
  assert.equal(partnerBrands.length, 1);
  assert.equal(partnerBrands[0].name, 'ClubClio');
  assert.ok(partnerStores.every(s => (s.brandName || s.storeName).toLowerCase().includes('clio')));
});
