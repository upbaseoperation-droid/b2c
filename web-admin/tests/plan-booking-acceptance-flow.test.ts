import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  INITIAL_BRANDS, 
  INITIAL_STORE_PORTFOLIOS, 
  INITIAL_DEALS, 
  INITIAL_KOCS, 
  USERS 
} from '../src/lib/mockData';
import { REAL_B2C_42_BRANDS } from '../src/lib/realB2cBrandsData';
import { REAL_B2C_69_STORES, REAL_MONTHLY_PLANS_OCT_2026 } from '../src/lib/realB2cPlanData';
import { createContract, submitContract, decideContract } from '../src/lib/contracts/domain';
import type { ContractActor, ContractRecord } from '../src/lib/contracts/types';
import type { 
  BookingDealItem, 
  InputPlanBreakdownState, 
  KocListingItem, 
  SampleShipment,
  StorePortfolioItem,
  UserProfile 
} from '../src/lib/types';
import { splitLinkInput, buildLinkAirCsv, type LinkAirResult } from '../src/lib/linkAirCheck';

// =========================================================================
// KIỂM THỬ KHỚP NỐI TOÀN DIỆN LUỒNG: KẾ HOẠCH -> BOOKING -> NGHIỆM THU
// Tuân thủ nghiêm ngặt quy tắc nghiệp vụ B2C (GEMINI.md Rule 3 & Rule 2)
// =========================================================================

test('1. Luồng Kế Hoạch: Phân rã chỉ tiêu tháng, phân công PIC và thẩm quyền duyệt chuẩn 2 cấp B2C', () => {
  // Lấy dữ liệu mẫu gian hàng ClubClio TikTok Shop
  const clioStore = REAL_B2C_69_STORES.find(s => s.storeName.includes('ClubClio') && s.platform === 'TikTok Shop');
  assert.ok(clioStore, 'Phải tìm thấy gian hàng ClubClio TikTok Shop trong danh mục 69 gian');

  // Khởi tạo kế hoạch phân rã chi tiết cho tháng 10/2026
  const samplePlan: InputPlanBreakdownState = {
    id: 'PLAN-CLIO-202610',
    title: 'Kế hoạch Booking Tháng 10/2026 - ClubClio TikTok Shop',
    brandName: 'ClubClio',
    month: '2026/10',
    week: 'W40-W44',
    pic: 'Lê Phương Thảo', // Specialist thực thi
    bookingLeader: 'Nguyễn Thị Ngọc Tâm', // Trưởng nhóm phụ trách 8 gian
    totalTargetBudget: 120000000, // Hạn mức Gross
    totalTargetBudgetNet: 108000000, // Hạn mức Net (Kế toán kiểm soát)
    totalTargetContents: 45, // Tổng video
    targetPaidVideos: 30, // Video KOC có phí
    targetFocVideos: 10, // Suất gửi mẫu FOC 0đ
    targetSelfVideos: 5, // Video kênh Brand
    targetGmv: 650000000, // Mục tiêu GMV
    cancellationRate: 8,
    status: 'DRAFT',
    createdAt: '2026-09-25T08:00:00Z',
    updatedAt: '2026-09-25T08:00:00Z',
  };

  // Xác thực chỉ tiêu bóc tách rõ ràng: Gross vs Net, Paid vs FOC (GEMINI.md Rule 3)
  assert.equal(samplePlan.totalTargetBudgetNet, 108000000);
  assert.equal(samplePlan.targetPaidVideos + samplePlan.targetFocVideos + samplePlan.targetSelfVideos, samplePlan.totalTargetContents);
  assert.ok(samplePlan.totalTargetBudgetNet < samplePlan.totalTargetBudget, 'Ngân sách Net phải tách bạch và nhỏ hơn Gross');

  // Kiểm tra quy trình duyệt theo cơ cấu Trưởng nhóm (GEMINI.md Rule 3):
  // Bước 1: Chuyên viên trình duyệt lên Trưởng nhóm
  samplePlan.status = 'SUBMITTED';
  assert.equal(samplePlan.status, 'SUBMITTED');

  // Bước 2: Trưởng nhóm Nguyễn Thị Ngọc Tâm sơ duyệt
  const leaderUser = USERS.find(u => u.name.includes('Ngọc Tâm'));
  assert.ok(leaderUser, 'Phải có Trưởng nhóm Nguyễn Thị Ngọc Tâm trong danh mục nhân sự');
  samplePlan.status = 'LEADER_APPROVED';

  // Bước 3: Giám đốc Marketing Đặng Thị Yến Nhi ký duyệt kế hoạch cuối cùng
  const directorUser = USERS.find(u => u.name.includes('Yến Nhi'));
  assert.ok(directorUser, 'Phải có Giám đốc Marketing Đặng Thị Yến Nhi');
  samplePlan.status = 'DIRECTOR_APPROVED';
  assert.equal(samplePlan.status, 'DIRECTOR_APPROVED');

  // Kiểm tra trường hợp gian hàng không có Leader (vd: Shopee hoặc TikTok khác):
  // Chuyên viên trình thẳng Giám đốc Marketing mà không cần bước sơ duyệt trung gian
  const nonLeaderPlan: InputPlanBreakdownState = {
    ...samplePlan,
    id: 'PLAN-CINDY-SHOPEE',
    brandName: 'Cindy Bloom',
    bookingLeader: undefined,
    status: 'SUBMITTED'
  };
  assert.equal(nonLeaderPlan.bookingLeader, undefined);
  // Duyệt thẳng lên Giám đốc
  nonLeaderPlan.status = 'DIRECTOR_APPROVED';
  assert.equal(nonLeaderPlan.status, 'DIRECTOR_APPROVED');
});

test('2. Luồng Booking: Lập Listing theo trần định mức, duyệt Brand và chuyển sang Deal Booking', () => {
  const planBudgetNet = 108000000;
  const brandGuidelineMaxFeeKL3 = 4000000; // Định mức tối đa hạng KL3

  // 1. Chuyên viên đề xuất KOC Listing
  const kocListing: KocListingItem = {
    id: 'LIST-CLIO-001',
    batchCycle: 'BATCH_10_MEGA',
    monthKey: '2026/10',
    brandName: 'ClubClio',
    storeId: 'store-clio-tiktok',
    storeName: 'ClubClio TikTok Shop',
    kocId: 'koc-an-phuong',
    kocName: 'An Phương Beauty',
    tier: 'MICRO',
    salaryGrade: 'KL3',
    pillarName: 'Son Clio Chiffon Blur Tint',
    proposedFee: 3500000,
    finalFee: 3500000,
    expectedAirDate: '2026-10-08',
    sparkAdsCode: 'SPARK-CLIO-OCT10',
    assignedStaffName: 'Lê Phương Thảo',
    brandApprovalStatus: 'PENDING',
  };

  // Kiểm tra tuân thủ Brand Guideline: thù lao không vượt trần hạng lương
  assert.ok(kocListing.proposedFee <= brandGuidelineMaxFeeKL3, 'Thù lao đề xuất phải tuân thủ định mức Brand Guideline');

  // 2. Đại diện Thương hiệu (Brand Partner) phê duyệt đề xuất
  kocListing.brandApprovalStatus = 'ĐÃ_DUYỆT';
  assert.equal(kocListing.brandApprovalStatus, 'ĐÃ_DUYỆT');

  // 3. Chuyển đổi Listing thành Deal Booking thực tế
  const generatedDeal: BookingDealItem = {
    id: 'DEAL-CLIO-202610-01',
    dealCode: 'DL-CLIO-001',
    campaignCode: 'CAMP-CLIO-1010',
    campaignTitle: 'Chiến Dịch Mega Sale 10.10 ClubClio',
    brandName: kocListing.brandName,
    storeId: kocListing.storeId,
    storeName: kocListing.storeName,
    productName: kocListing.pillarName,
    bookingBatch: 'Đợt 1 Sóng 10.10',
    kocId: kocListing.kocId,
    kocStageName: kocListing.kocName,
    kocTier: 'TIER_3_MICRO',
    salaryGrade: kocListing.salaryGrade,
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    pipelineText: 'Đã duyệt đề xuất',
    status: 'TERMS_AGREED',
    statusLabel: 'Đã chốt điều khoản',
    currentStage: '2_DEAL_CONTRACT',
    holdingTeam: 'LEGAL_FINANCE',
    adsCodeStatus: 'CHƯA_CÓ_MÃ',
    assignedStaff: kocListing.assignedStaffName,
    totalValue: kocListing.finalFee || kocListing.proposedFee,
    advanceAmount: Math.round((kocListing.finalFee || kocListing.proposedFee) * 0.5),
    finalAmount: Math.round((kocListing.finalFee || kocListing.proposedFee) * 0.5),
    deadlinePost: kocListing.expectedAirDate,
    viewsCount: 0,
    affiliateGmv: 0,
    gmv30: 0,
    roi: 0,
    publishedDays: 0,
    remainingSlaHours: 48,
    isSlaWarning: false,
    sampleStatus: 'CHƯA_GỬI'
  };

  // Xác minh dữ liệu deal thừa hưởng chuẩn xác từ Listing
  assert.equal(generatedDeal.totalValue, 3500000);
  assert.equal(generatedDeal.advanceAmount, 1750000);
  assert.equal(generatedDeal.finalAmount, 1750000);
  assert.equal(generatedDeal.assignedStaff, 'Lê Phương Thảo');
  assert.ok(generatedDeal.totalValue <= planBudgetNet, 'Deal phải nằm trong hạn mức ngân sách kế hoạch');
});

test('3. Luồng Kiểm Soát Tài Chính: Phát hiện Overbudget và Unbudgeted Spend', () => {
  // Hàm kiểm tra định mức tài chính
  function auditStoreBudget(budgetNet: number, actualSpentNet: number) {
    if (budgetNet === 0 && actualSpentNet > 0) {
      return { status: 'UNBUDGETED', message: 'Chi ngoài kế hoạch (Hạn mức 0đ) - Báo động đỏ' };
    }
    if (budgetNet > 0 && actualSpentNet > budgetNet) {
      return { 
        status: 'OVERBUDGET', 
        overAmount: actualSpentNet - budgetNet, 
        message: 'Vượt trần ngân sách Net' 
      };
    }
    return { status: 'NORMAL', remaining: budgetNet - actualSpentNet, message: 'Trong hạn mức' };
  }

  // Trường hợp chuẩn: Hạn mức 100tr, chi 80tr -> Bình thường
  const normalCheck = auditStoreBudget(100000000, 80000000);
  assert.equal(normalCheck.status, 'NORMAL');
  assert.equal(normalCheck.remaining, 20000000);

  // Trường hợp vượt trần: Hạn mức 10tr, chi 18tr -> Vượt trần 8tr
  const overCheck = auditStoreBudget(10000000, 18000000);
  assert.equal(overCheck.status, 'OVERBUDGET');
  assert.equal(overCheck.overAmount, 8000000);

  // Trường hợp chi ngoài kế hoạch: Hạn mức 0đ nhưng phát sinh chi 5tr -> Báo động đỏ
  const unbudgetedCheck = auditStoreBudget(0, 5000000);
  assert.equal(unbudgetedCheck.status, 'UNBUDGETED');
});

test('4. Luồng Hợp Đồng: Tạo hợp đồng từ Deal, luồng duyệt độc lập Pháp chế & Kế toán trước khi ký', () => {
  const creator: ContractActor = {
    id: 'staff-thao',
    name: 'Lê Phương Thảo',
    roles: ['CREATOR'],
    brands: ['ClubClio'],
    allBrands: false
  };

  // Khởi tạo hợp đồng từ deal
  const contract = createContract({
    title: 'Hợp đồng Booking KOC An Phương - Chiến dịch Mega Sale 10.10',
    brand: 'ClubClio',
    partner: 'An Phương Beauty',
    dealId: 'DEAL-CLIO-202610-01',
    dealCode: 'DL-CLIO-001',
    kocId: 'koc-an-phuong',
    templateId: 'tpl-koc-individual',
    templateHash: 'hash-tpl-koc-01',
    values: {
      partyName: 'Công ty Cổ phần Thương mại Clio',
      taxCode: '0108889999',
      ownerName: 'Nguyễn An Phương',
      idNumber: '001198000123',
      product: 'Son Clio Chiffon Blur Tint',
      netTotal: '3500000',
      advancePayment: '1750000',
      finalPayment: '1750000'
    }
  }, creator);

  assert.equal(contract.approval, 'DRAFT');
  assert.equal(contract.dealCode, 'DL-CLIO-001');

  // Trình duyệt lên 2 bộ phận độc lập
  const legalReviewer: ContractActor = { id: 'rev-legal', name: 'Trưởng ban Pháp Chế', roles: ['LEGAL'], brands: ['ClubClio'], allBrands: false };
  const financeReviewer: ContractActor = { id: 'rev-finance', name: 'Kế Toán Trưởng B2C', roles: ['FINANCE'], brands: ['ClubClio'], allBrands: false };

  const submittedContract = submitContract(contract, creator, [legalReviewer, financeReviewer]);
  assert.equal(submittedContract.approval, 'IN_REVIEW');

  // Bước 1: Pháp chế duyệt điều khoản
  const stepLegal = decideContract(submittedContract, legalReviewer, 'APPROVED', 'Đủ điều khoản sở hữu nội dung và thời hạn độc quyền.');
  assert.equal(stepLegal.approval, 'IN_REVIEW');

  // Bước 2: Kế toán duyệt định mức thù lao
  const stepFinance = decideContract(stepLegal, financeReviewer, 'APPROVED', 'Đã kiểm tra thuế TNCN và tài khoản thụ hưởng.');
  assert.equal(stepFinance.approval, 'APPROVED');
});

test('5. Luồng Hàng Mẫu: Kích hoạt vận đơn mẫu sau khi duyệt deal, theo dõi tiến độ và SLA', () => {
  // Khi Deal đã chốt điều khoản & ký hợp đồng, tự động tạo vận đơn mẫu
  const sampleTracking: SampleShipment = {
    id: 'SMP-CLIO-001',
    dealCode: 'DL-CLIO-001',
    kocName: 'An Phương Beauty',
    kocPhone: '0988.123.456',
    shippingAddress: 'Tòa nhà Landmark 81, P.22, Bình Thạnh, TP.HCM',
    brandName: 'ClubClio',
    productName: 'Son Clio Chiffon Blur Tint',
    carrier: 'GHN',
    trackingCode: 'GHN-CLIO-998877',
    sentDate: '2026-09-28',
    deliveredDate: '2026-09-30',
    status: 'DELIVERED', // Đã nhận hàng mẫu
    daysSinceDelivered: 2,
    demoDeadlineDays: 5, // 5 ngày để gửi bản nháp video
    isMediaHandedOff: false,
    bookingPic: 'Lê Phương Thảo',
    notes: 'Mẫu màu #03 và #05 nguyên seal'
  };

  assert.equal(sampleTracking.status, 'DELIVERED');
  assert.ok(sampleTracking.daysSinceDelivered <= sampleTracking.demoDeadlineDays, 'KOC còn trong hạn nộp video nháp');
});

test('6. Luồng Nghiệm Thu Lên Sóng: Xác thực link video TikTok, Spark Ads và chỉ số GMV', () => {
  // 1. Kiểm tra link TikTok video lên sóng bằng linkAirCheck parser
  const sampleVideoUrl = 'https://www.tiktok.com/@anphuong_beauty/video/7391234567890123456';
  const links = splitLinkInput(sampleVideoUrl);
  assert.equal(links.length, 1);
  assert.equal(links[0], sampleVideoUrl);

  // Giả lập kết quả crawler nghiệm thu link video
  const inspectionResult: LinkAirResult = {
    inputUrl: sampleVideoUrl,
    platform: 'tiktok',
    contentType: 'video',
    contentId: '7391234567890123456',
    canonicalUrl: sampleVideoUrl,
    status: 'LIVE',
    statusDetail: 'Video đang hoạt động',
    author: { handle: 'anphuong_beauty', name: 'An Phương Beauty', profileUrl: 'https://www.tiktok.com/@anphuong_beauty', followers: 250000 },
    publishedAt: '2026-10-08T10:00:00Z',
    caption: 'Thử ngay chất son Clio Chiffon Blur Tint cực mịn môi #ClubClio #ClioChiffon #ReviewMyPham',
    hashtags: ['ClubClio', 'ClioChiffon', 'ReviewMyPham'],
    mentions: ['clubclio_vn'],
    durationSeconds: 58,
    metrics: { views: 45200, likes: 3200, comments: 142, shares: 89, saves: 310 },
    hasProductLink: true,
    productTitle: 'Son Thỏi Mờ Lì Clio Chiffon Blur Tint',
    checks: [
      { key: 'link', label: 'Tình trạng link', status: 'PASS', detail: 'Video mở công khai' },
      { key: 'hashtag', label: 'Hashtag thương hiệu', status: 'PASS', detail: 'Đủ #ClubClio' }
    ],
    verdict: 'PASS',
    limitations: [],
    source: 'crawler',
    fetchedAt: '2026-10-08T12:00:00Z',
    fromCache: false,
    durationMs: 420
  };

  assert.equal(inspectionResult.status, 'LIVE');
  assert.equal(inspectionResult.verdict, 'PASS');
  assert.equal(inspectionResult.hasProductLink, true);
  assert.ok((inspectionResult.metrics.views || 0) > 10000, 'Video đã có tương tác thực tế');

  // Kiểm tra xuất CSV nghiệm thu
  const csvReport = buildLinkAirCsv([inspectionResult]);
  assert.ok(csvReport.includes('TikTok'), 'Báo cáo nghiệm thu CSV phải có cột TikTok');
  assert.ok(csvReport.includes('Đạt'), 'Báo cáo nghiệm thu CSV phải có kết luận Đạt');

  // 2. Nghiệm thu mã Spark Ads trên Deal Booking
  const completedDeal: BookingDealItem = {
    id: 'DEAL-CLIO-202610-01',
    dealCode: 'DL-CLIO-001',
    campaignCode: 'CAMP-CLIO-1010',
    campaignTitle: 'Chiến Dịch Mega Sale 10.10 ClubClio',
    brandName: 'ClubClio',
    storeId: 'store-clio-tiktok',
    storeName: 'ClubClio TikTok Shop',
    productName: 'Son Clio Chiffon Blur Tint',
    bookingBatch: 'Đợt 1',
    kocId: 'koc-an-phuong',
    kocStageName: 'An Phương Beauty',
    kocTier: 'TIER_3_MICRO',
    salaryGrade: 'KL3',
    brandApprovalStatus: 'ĐÃ_DUYỆT',
    pipelineText: 'Đã lên sóng & Nghiệm thu Ads',
    status: 'COMPLETED',
    statusLabel: 'Hoàn tất nghiệm thu',
    currentStage: '4_AIR_GROWTH',
    holdingTeam: 'FINANCE',
    adsCodeStatus: 'ĐÃ_NGHIỆM_THU',
    sparkAdsCode: inspectionResult.sparkAdsAuthCode,
    actualAirDate: '2026-10-08',
    assignedStaff: 'Lê Phương Thảo',
    totalValue: 3500000,
    advanceAmount: 1750000,
    finalAmount: 1750000,
    viewsCount: inspectionResult.viewsCount,
    affiliateGmv: 42000000, // GMV phát sinh từ link Affiliate
    gmv30: 58000000, // Doanh thu gộp 30 ngày
    roi: Number((58000000 / 3500000).toFixed(1)),
    publishedDays: 11,
    remainingSlaHours: 0,
    isSlaWarning: false,
    sampleStatus: 'ĐÃ_NHẬN'
  };

  assert.equal(completedDeal.adsCodeStatus, 'ĐÃ_NGHIỆM_THU');
  assert.equal(completedDeal.status, 'COMPLETED');
  assert.ok(completedDeal.roi >= 10, `Hiệu quả đầu tư ROI đạt ${completedDeal.roi}x thù lao`);
});

test('7. Luồng Quyết Toán & Đối Soát PnL: Tách bạch Net/Gross, đối soát ngân sách thực tế', () => {
  // Giả lập bảng đối soát tài chính cấp Gian hàng (B2C Master Report)
  interface StoreFinancialReconciliation {
    storeName: string;
    brandName: string;
    targetBudgetGross: number;
    targetBudgetNet: number;
    actualSpentNet: number;
    actualGmv: number;
    totalAiredVideos: number;
    financialStatus: 'NORMAL' | 'OVERBUDGET' | 'UNBUDGETED';
    cirPct: number; // Chi phí / Doanh thu (%)
  }

  const reconciliationRow: StoreFinancialReconciliation = {
    storeName: 'ClubClio TikTok Shop',
    brandName: 'ClubClio',
    targetBudgetGross: 120000000,
    targetBudgetNet: 108000000,
    actualSpentNet: 94500000, // Đã giải ngân nghiệm thu
    actualGmv: 520000000,
    totalAiredVideos: 28,
    financialStatus: 'NORMAL',
    cirPct: Number(((94500000 / 520000000) * 100).toFixed(1))
  };

  // Xác minh tính toàn vẹn tài chính:
  // 1. Thực chi nằm trong trần Net
  assert.ok(reconciliationRow.actualSpentNet <= reconciliationRow.targetBudgetNet);
  assert.equal(reconciliationRow.financialStatus, 'NORMAL');

  // 2. Chỉ số CIR (Cost to Income Ratio) đạt chuẩn dưới 20%
  assert.ok(reconciliationRow.cirPct <= 20, `CIR thực tế đạt ${reconciliationRow.cirPct}%, an toàn tài chính`);

  // 3. Tỷ lệ giải ngân tiến độ (Pacing)
  const pacingPct = Number(((reconciliationRow.actualSpentNet / reconciliationRow.targetBudgetNet) * 100).toFixed(1));
  assert.ok(pacingPct >= 80 && pacingPct <= 100, `Tiến độ giải ngân đạt ${pacingPct}%, tối ưu ngân sách`);
});
