import test from 'node:test';
import assert from 'node:assert/strict';
import { computeBrandSlaMetrics, getItemSlaBadge } from '../src/lib/listingBoardRules';
import { computeAirBookingComparisonReport, type StoreAirPlan } from '../src/lib/storeAirPlanData';
import {
  computeUnifiedB2cStaffWorkloads,
  DEFAULT_SOW_POINT_POLICIES,
  normalizeStoreCoefficient,
} from '../src/lib/taskDelegationData';
import {
  buildInitialWeeklyHistoryStore,
  registerNewSystemVideo,
  ingestWeeklyRowsBySystemVideoId,
  aggregateKocHistoryFromVideoSnapshots,
  getKocVideoWeeklyHistoryForKoc,
} from '../src/lib/kocVideoWeeklyHistory';
import {
  getKocLegalProfiles,
  syncKocWithLegalProfiles,
  isCooperatedKoc,
  canRevealSensitive,
  mask,
} from '../src/components/koc/kocUtils';
import { computeNextScheduledSyncAt } from '../src/lib/upaffiliateKocSyncService';
import { INITIAL_CONTRIBUTORS, INITIAL_SELF_CHANNEL_TASKS, MULTI_BRAND_ALLOCATIONS } from '../src/lib/selfChannelData';
import { INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS, INITIAL_TASKS } from '../src/lib/mockData';
import type { ApprovedBookingListItem } from '../src/lib/approvedBookingList';
import type { KocItem, KocLegalProfile, KocListingItem } from '../src/lib/types';

test('TC-017 (FR-001, FR-002): Đo lường SLA Brand duyệt 48h và phân loại việc chờ xử lý / quá hạn', () => {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

  const items: KocListingItem[] = [
    {
      id: 'sla-1',
      kocHandle: 'koc.ontime.pending',
      kocName: 'KOC Pending 12h',
      proposedFee: 2000000,
      salaryGrade: 'KL2',
      overallStatus: 'SUBMITTED',
      brandApprovalStatus: 'BRAND_PENDING',
      kocNegotiationStatus: 'NOT_CONTACTED',
      sentToBrandAt: hoursAgo(12),
    },
    {
      id: 'sla-2',
      kocHandle: 'koc.overdue.pending',
      kocName: 'KOC Overdue 60h',
      proposedFee: 3000000,
      salaryGrade: 'KL3',
      overallStatus: 'SUBMITTED',
      brandApprovalStatus: 'BRAND_PENDING',
      kocNegotiationStatus: 'NOT_CONTACTED',
      sentToBrandAt: hoursAgo(60),
    },
    {
      id: 'sla-3',
      kocHandle: 'koc.decided.fast',
      kocName: 'KOC Decided 20h',
      proposedFee: 2500000,
      salaryGrade: 'KL3',
      overallStatus: 'SUBMITTED',
      brandApprovalStatus: 'BRAND_APPROVED',
      kocNegotiationStatus: 'CONTACTING',
      sentToBrandAt: hoursAgo(30),
      brandDecidedAt: hoursAgo(10), // 20h
    },
    {
      id: 'sla-4',
      kocHandle: 'koc.decided.late',
      kocName: 'KOC Decided 72h',
      proposedFee: 4000000,
      salaryGrade: 'KL4',
      overallStatus: 'SUBMITTED',
      brandApprovalStatus: 'BRAND_REJECTED',
      kocNegotiationStatus: 'NOT_CONTACTED',
      sentToBrandAt: hoursAgo(80),
      brandDecidedAt: hoursAgo(8), // 72h
    },
  ];

  const summary = computeBrandSlaMetrics(items, 48);
  assert.equal(summary.totalPending, 2);
  assert.equal(summary.pendingOnTime, 1);
  assert.equal(summary.pendingOverdue, 1);
  assert.deepEqual(summary.overdueHandles, ['koc.overdue.pending']);
  assert.equal(summary.totalDecided, 2);
  assert.equal(summary.decidedOnTime, 1);
  assert.equal(summary.decidedOverdue, 1);
  assert.equal(summary.onTimeRatePct, 50);

  const badgePendingOverdue = getItemSlaBadge(items[1], 48);
  assert.equal(badgePendingOverdue?.isOverdue, true);
  assert.equal(badgePendingOverdue?.variant, 'critical');

  const badgeDecidedFast = getItemSlaBadge(items[2], 48);
  assert.equal(badgeDecidedFast?.isOverdue, false);
  assert.equal(badgeDecidedFast?.variant, 'success');
});

test('TC-018 (FR-006): Đối soát Kế hoạch vs Thực tế Air Video (computeAirBookingComparisonReport) không cộng trùng đơn hàng 14d/30d và cảnh báo đúng trạng thái', () => {
  const plans: StoreAirPlan[] = [
    {
      id: 'plan-clio',
      storeId: 'store-clio',
      storeName: 'ClubClio_TikTok_E2E-S',
      brandName: 'ClubClio',
      picName: 'Lê Phương Thảo',
      leaderName: 'Nguyễn Thị Ngọc Tâm',
      monthKey: '2026/10',
      targetNmv: 100000000,
      targetBudget: 10000000,
      targetVideos: 2,
      klDetails: [
        { kl: 'KL3', targetVideos: 2, expectedUnitCost: 5000000, allocatedBudget: 10000000, targetNmv: 100000000 },
      ],
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const approvedBookings: ApprovedBookingListItem[] = [
    {
      id: 'bo-1',
      dealCode: 'BO2610-101',
      thangPlan: '2026/10',
      brandName: 'ClubClio',
      storeName: 'ClubClio_TikTok_E2E-S',
      nguoiPhuTrach: 'Lê Phương Thảo',
      leaderName: 'Nguyễn Thị Ngọc Tâm',
      klGrade: 'KL3',
      chiPhiBookingNetCuoi: 6000000,
      chiPhiGrossKemThue: 6666667,
      trangThaiPhieuThanhToan: 'Đã thanh toán',
      soTienDaThanhToan: 6000000,
      actualAirDate: '2026-10-08',
      linkAir: 'https://www.tiktok.com/@koc1/video/7400000000000000001',
      acceptanceStatus: 'DA_NGHIEM_THU',
      gmv14d: 30000000,
      gmv30d: 50000000,
      orders14d: 120,
      orders30d: 200,
      views14d: 15000,
      views30d: 25000,
    } as unknown as ApprovedBookingListItem,
    {
      id: 'bo-2',
      dealCode: 'BO2610-102',
      thangPlan: '2026/10',
      brandName: 'ClubClio',
      storeName: 'ClubClio_TikTok_E2E-S',
      nguoiPhuTrach: 'Lê Phương Thảo',
      leaderName: 'Nguyễn Thị Ngọc Tâm',
      klGrade: 'KL3',
      chiPhiBookingNetCuoi: 6000000,
      chiPhiGrossKemThue: 6666667,
      trangThaiPhieuThanhToan: 'Chờ duyệt thanh toán',
      soTienCanThanhToan: 6000000,
      gmv14d: 10000000,
      gmv30d: 15000000,
      orders14d: 40,
      orders30d: 60,
      views14d: 5000,
      views30d: 8000,
    } as unknown as ApprovedBookingListItem,
  ];

  const report = computeAirBookingComparisonReport({
    plans,
    approvedBookings,
    selectedMonth: '2026/10',
  });

  assert.equal(report.totalStoresCount, 1);
  assert.equal(report.overbudgetStoresCount, 1);
  const storeRow = report.storeReports[0];
  assert.equal(storeRow.spendStatus, 'VƯỢT_NGÂN_SÁCH');
  // Không cộng trùng 14d + 30d: lấy Math.max(120, 200) + Math.max(40, 60) = 260 đơn
  assert.equal(storeRow.actualOrders, 260);
  assert.equal(storeRow.actualViews, 33000);
  assert.equal(storeRow.actualNmv, 65000000);

  const kl3Row = report.klBreakdown.find((r) => r.kl === 'KL3');
  assert.ok(kl3Row);
  assert.equal(kl3Row?.actualOrders, 260);
  assert.equal(kl3Row?.actualViews, 33000);
  assert.equal(kl3Row?.burnWarning, 'BỘI_CHI');
});

test('TC-019 (FR-014, FR-015, FR-050): Chuẩn hóa Hệ số gian hàng Bảng 2 và tính điểm tải Workload theo 33 đầu việc SOW', () => {
  assert.equal(normalizeStoreCoefficient('Cơ bản').multiplier, 0.8);
  assert.equal(normalizeStoreCoefficient('Tiêu chuẩn').multiplier, 1.0);
  assert.equal(normalizeStoreCoefficient('Vừa').multiplier, 1.25);
  assert.equal(normalizeStoreCoefficient('Khó').multiplier, 1.5);

  assert.equal(DEFAULT_SOW_POINT_POLICIES.length, 33);

  const rows = computeUnifiedB2cStaffWorkloads({
    tasks: INITIAL_TASKS,
    brands: INITIAL_BRANDS,
    storePortfolios: INITIAL_STORE_PORTFOLIOS,
  });

  assert.ok(rows.length >= 28);
  const sampleStaff = rows.find((r) => r.name.includes('Lê Phương Thảo'));
  assert.ok(sampleStaff, 'Phải tìm thấy hồ sơ tải công việc của chuyên viên Lê Phương Thảo');
  assert.ok(sampleStaff.targetCapacityPts > 0);
  assert.ok(sampleStaff.finalMonthlyWorkloadPts > 0);
  assert.ok(['UNDERLOAD', 'OPTIMAL', 'OVERLOAD'].includes(sampleStaff.loadStatus));
});

test('TC-020 (FR-080): Phân hệ Video Kênh Brand & Điều phối CTV / VJ — kiểm tra tồn kho SKU tại nhà, pháp lý CCCD/Hợp đồng và khấu trừ thuế TNCN 10%', () => {
  assert.ok(MULTI_BRAND_ALLOCATIONS.length >= 4);
  assert.ok(INITIAL_CONTRIBUTORS.length >= 6);
  assert.ok(INITIAL_SELF_CHANNEL_TASKS.length >= 10);

  // Kiểm tra hàm chuẩn pháp lý CTV trước khi lập ĐNTT: CCCD >= 9 ký tự và contractStatus === 'ACTIVE'
  const isCtvLegalReady = (c: (typeof INITIAL_CONTRIBUTORS)[number]) =>
    Boolean(c.cccd && c.cccd.replace(/\D/g, '').length >= 9 && c.contractStatus === 'ACTIVE');

  const pendingSignCtv = INITIAL_CONTRIBUTORS.find((c) => c.contractStatus === 'PENDING_SIGN');
  const activeCtv = INITIAL_CONTRIBUTORS.find((c) => c.id === 'ctv-6');
  assert.ok(pendingSignCtv);
  assert.ok(activeCtv);
  assert.equal(isCtvLegalReady(pendingSignCtv!), false);
  assert.equal(isCtvLegalReady(activeCtv!), true);

  // Kiểm tra tồn kho hàng mẫu cầm sẵn tại nhà VJ (onHandProducts) cho đơn gấp < 5 ngày
  assert.equal(activeCtv?.onHandProducts?.includes('MU-SYRUP-120ML'), true);
  assert.equal(activeCtv?.onHandProducts?.includes('SKU-CHUA-CO'), false);

  // Tổng hợp quyết toán các video đã nghiệm thu hoàn tất (ACCEPTED_COMPLETED) nhưng chưa tạo ĐNTT
  const readyTasksForCtv6 = INITIAL_SELF_CHANNEL_TASKS.filter(
    (t) => t.contributorId === 'ctv-6' && t.status === 'ACCEPTED_COMPLETED' && t.dnttStatus === 'NOT_CREATED'
  );
  assert.ok(readyTasksForCtv6.length >= 1);
  const grossRemuneration = readyTasksForCtv6.reduce((s, t) => s + t.remuneration, 0);
  const pitTax10 = Math.round(grossRemuneration * 0.1);
  const netPayout = grossRemuneration - pitTax10;
  assert.equal(grossRemuneration, 1500000);
  assert.equal(pitTax10, 150000);
  assert.equal(netPayout, 1350000);
});

test('TC-021 (FR-081): Kho lịch sử Tuần KOC & Video Ads theo videoId hệ thống — đăng ký video mới, nạp dữ liệu tuần và cộng dồn KOC', () => {
  const initialStore = buildInitialWeeklyHistoryStore([], []);
  const regResult = registerNewSystemVideo(initialStore, {
    videoId: '7429998887776665551',
    dealCode: 'BO2610-991',
    kocId: 'koc-ru-01',
    kocChannelId: '@goc.cua.ru',
    kocStageName: 'Góc Của Rư',
    brandName: 'ClubClio',
    storeName: 'ClubClio_TikTok_E2E-S',
    bookingCostNet: 5000000,
    weekKey: '2026-W41',
    initialAdsSpend: 2000000,
    initialGmv: 28000000,
    initialOrders: 95,
    initialViews: 45000,
  });

  assert.equal(regResult.registeredVideo.videoId, '7429998887776665551');
  assert.equal(regResult.registeredVideo.kocChannelId, 'goc.cua.ru');
  assert.ok(regResult.initialSnapshot);
  assert.equal(regResult.initialSnapshot?.roas, 14);
  // ROI tổng = 28tr / (5tr cát-xê + 2tr ads) = 4.0
  assert.equal(regResult.initialSnapshot?.totalRoi, 4);

  // Nạp tiếp dữ liệu Tuần 42 cho cùng videoId + 1 videoId mới phát sinh
  const ingestResult = ingestWeeklyRowsBySystemVideoId(regResult.nextStore, {
    weekKey: '2026-W42',
    fileName: 'ads-w42.xlsx',
    sourceType: 'API_INGEST',
    importedBy: 'Lê Phương Thảo',
    rows: [
      {
        videoId: '7429998887776665551',
        tiktokAccount: 'goc.cua.ru',
        adsSpend: 3000000,
        gmv: 42000000,
        orders: 140,
        views: 68000,
      },
      {
        videoId: '7429998887776665552',
        tiktokAccount: 'koc.new.w42',
        brandName: 'Senka',
        storeName: 'Senka_TikTok_E2E-S',
        adsSpend: 1000000,
        gmv: 6000000,
        orders: 25,
        views: 12000,
      },
    ],
  });

  assert.equal(ingestResult.matchedCount, 1);
  assert.equal(ingestResult.newlyRegisteredVideosCount, 1);

  const aggregated = aggregateKocHistoryFromVideoSnapshots(ingestResult.nextStore);
  const ruSummary = aggregated.find((k) => k.kocChannelId === 'goc.cua.ru');
  assert.ok(ruSummary);
  assert.equal(ruSummary?.totalBookingCostNet, 5000000); // Cát-xê 1 video không bị cộng nhân đôi qua 2 tuần
  assert.equal(ruSummary?.cumulativeAdsSpend, 5000000);
  assert.equal(ruSummary?.cumulativeGmv, 70000000);
  assert.equal(ruSummary?.cumulativeOrders, 235);
  assert.equal(ruSummary?.weeksTracked.length, 2);

  const kocLookup = getKocVideoWeeklyHistoryForKoc(ingestResult.nextStore, {
    id: 'koc-ru-01',
    channelId: '@goc.cua.ru',
    stageName: 'Góc Của Rư',
  });
  assert.equal(kocLookup.registeredVideos.length, 1);
  assert.equal(kocLookup.weeklySnapshots.length, 2);
});

test('TC-022 (FR-082): Danh bạ KOC 2 bảng (COOPERATED vs NEW) và đồng bộ 1 KOC — N Hồ sơ pháp lý (RULE-SYNC-01)', () => {
  const newKoc: KocItem = {
    id: 'koc-new-101',
    stageName: 'Creator Tiềm Năng 101',
    channelId: '@creator.new.101',
    platform: 'TIKTOK',
    followers: 45000,
    tier: 'TIER_4_NANO',
    salaryGrade: 'KL1',
    category: 'Beauty',
    datasetType: 'NEW',
    totalPastDeals: 0,
  };

  assert.equal(isCooperatedKoc(newKoc, []), false);

  const profiles: KocLegalProfile[] = [
    {
      id: 'lp-ind',
      profileCode: 'HSPL-01',
      legalType: 'INDIVIDUAL',
      isDefault: false,
      status: 'ACTIVE',
      taxAccountType: '(Thuế TNCN 10%) Tài khoản cá nhân',
      holderName: 'Nguyễn Thị A',
      cccd: '001199001122',
      bankName: 'Vietcombank',
      bankAccount: '001100998877',
      frameworkContractStatus: 'ĐÃ_KÝ',
    },
    {
      id: 'lp-com',
      profileCode: 'HSPL-02',
      legalType: 'COMPANY',
      isDefault: true,
      status: 'ACTIVE',
      taxAccountType: '(VAT 8%) Tài khoản doanh nghiệp',
      holderName: 'CÔNG TY TNHH TALENT HUB',
      representativeName: 'Nguyễn Thị A',
      taxCode: '0108889991',
      bankName: 'ACB',
      bankAccount: '8899001122',
      frameworkContractCode: 'HĐNT-2026-0101-2',
      frameworkContractStatus: 'ĐÃ_KÝ',
      frameworkContractDriveUrl: 'https://drive.google.com/file/d/hdnt-talent-hub',
    },
  ];

  const syncedKoc = syncKocWithLegalProfiles(newKoc, profiles);
  assert.equal(syncedKoc.companyName, 'CÔNG TY TNHH TALENT HUB');
  assert.equal(syncedKoc.taxCode, '0108889991');
  assert.equal(syncedKoc.bankName, 'ACB');
  assert.equal(syncedKoc.bankAccount, '8899001122');
  assert.equal(syncedKoc.ocrDocumentType, 'BUSINESS_LICENSE');
  assert.equal(getKocLegalProfiles(syncedKoc).length, 2);

  // Kiểm tra che số nhạy cảm và phân quyền xem số đầy đủ (NFR-04)
  assert.equal(mask('8899001122'), '****1122');
  assert.equal(
    canRevealSensitive(
      { id: 'u-fin', name: 'Kế toán', email: 'fin@upbase.vn', role: 'FINANCE', avatar: 'KT', assignedBrands: [] },
      syncedKoc
    ),
    true
  );
  assert.equal(
    canRevealSensitive(
      { id: 'u-mem', name: 'Nhân viên khác', email: 'mem@upbase.vn', role: 'BOOKING_MEMBER', avatar: 'NV', assignedBrands: [] },
      syncedKoc
    ),
    false
  );

  // Kiểm tra tính mốc đồng bộ định kỳ UpAffiliate
  assert.equal(
    computeNextScheduledSyncAt('EVERY_6H', '2026-10-24T00:00:00.000Z'),
    '2026-10-24T06:00:00.000Z'
  );
});
