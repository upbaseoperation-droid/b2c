import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as listingBoardGet } from '../src/app/api/listing-board/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import { buildStaffListingRowFromListingItem } from '../src/lib/staffBrandListingSheet';
import { computeAirBookingComparisonReport } from '../src/lib/storeAirPlanData';
import type { UserProfile, KocListingItem } from '../src/lib/types';

function createReq(url: string, actor: UserProfile = USERS[0]) {
  const headers: Record<string, string> = {
    origin: 'http://localhost:3000',
    cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}`,
  };
  return new NextRequest(url, { method: 'GET', headers });
}

test('E2E Dashboard & Listing: GET /api/listing-board?all=true trả về đầy đủ 2561+ KOC', async () => {
  const req = createReq('http://localhost:3000/api/listing-board?all=true');
  const res = await listingBoardGet(req);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.ok(Array.isArray(body.items), 'body.items phải là mảng');
  assert.ok(body.items.length >= 2561, `Kỳ vọng ít nhất 2561 KOC, thực tế: ${body.items.length}`);

  // Kiểm tra phân bổ tháng 10 và tháng 11
  const octItems = body.items.filter((i: KocListingItem) => i.monthKey === '2026/10');
  const novItems = body.items.filter((i: KocListingItem) => i.monthKey === '2026/11');

  assert.ok(octItems.length >= 2360, `Tháng 10 phải có >= 2360 KOC, thực tế: ${octItems.length}`);
  assert.ok(novItems.length >= 190, `Tháng 11 phải có >= 190 KOC, thực tế: ${novItems.length}`);

  // Kiểm tra tính toàn vẹn của dữ liệu KOC
  const sample = body.items[0];
  assert.ok(sample.id, 'Phải có id');
  assert.ok(sample.kocHandle, 'Phải có kocHandle');
  assert.ok(sample.storeName, 'Phải có storeName');
  assert.ok(typeof sample.proposedFee === 'number', 'proposedFee phải là số');
  assert.ok(sample.brandApprovalStatus, 'Phải có brandApprovalStatus');
  assert.ok(sample.kocNegotiationStatus, 'Phải có kocNegotiationStatus');
});

test('E2E Dashboard & Listing: GET /api/listing-board?summary=true trả về danh sách 50+ gian hàng có dữ liệu', async () => {
  const req = createReq('http://localhost:3000/api/listing-board?summary=true');
  const res = await listingBoardGet(req);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.ok(body.summary && typeof body.summary === 'object', 'Phải có body.summary');

  const summaryKeys = Object.keys(body.summary);
  assert.ok(summaryKeys.length >= 50, `Kỳ vọng ít nhất 50 gian hàng có dữ liệu, thực tế: ${summaryKeys.length}`);

  // Kiểm tra các gian hàng trọng điểm
  assert.ok(body.summary['2026/10__BaBe_TikTok_E2E-O'], 'Phải có BaBe_TikTok_E2E-O T10');
  assert.equal(body.summary['2026/10__BaBe_TikTok_E2E-O'].count, 60);

  assert.ok(body.summary['2026/10__Baniphar_TikTok_E2E-S'], 'Phải có Baniphar_TikTok_E2E-S T10');
  assert.equal(body.summary['2026/10__Baniphar_TikTok_E2E-S'].count, 98);

  assert.ok(body.summary['2026/11__ORGALIFE_TikTok_E2E-C'], 'Phải có ORGALIFE_TikTok_E2E-C T11');
  assert.equal(body.summary['2026/11__ORGALIFE_TikTok_E2E-C'].count, 22);

  assert.ok(body.summary['2026/11__Kutieskin Mama_TikTok_E2E-S'], 'Phải có Kutieskin Mama_TikTok_E2E-S T11');
  assert.equal(body.summary['2026/11__Kutieskin Mama_TikTok_E2E-S'].count, 48);
});

test('E2E Dashboard & Listing: Truy vấn theo storeName và month nạp đúng KOC cho từng gian', async () => {
  // Test Tháng 10: BaBe TikTok
  const reqBabe = createReq('http://localhost:3000/api/listing-board?storeName=BaBe_TikTok_E2E-O&month=2026/10');
  const resBabe = await listingBoardGet(reqBabe);
  assert.equal(resBabe.status, 200);
  const dataBabe = await resBabe.json();
  assert.equal(dataBabe.items.length, 60);

  // Test Tháng 11: Orgalife TikTok
  const reqOrgalife = createReq('http://localhost:3000/api/listing-board?storeName=ORGALIFE_TikTok_E2E-C&month=2026/11');
  const resOrgalife = await listingBoardGet(reqOrgalife);
  assert.equal(resOrgalife.status, 200);
  const dataOrgalife = await resOrgalife.json();
  assert.equal(dataOrgalife.items.length, 22);

  // Test gian hàng có khoảng trắng: Bye Bye Blemish
  const reqBlemish = createReq('http://localhost:3000/api/listing-board?storeName=Bye%20Bye%20Blemish_TikTok_E2E-S&month=2026/10');
  const resBlemish = await listingBoardGet(reqBlemish);
  assert.equal(resBlemish.status, 200);
  const dataBlemish = await resBlemish.json();
  assert.equal(dataBlemish.items.length, 68);
});

test('E2E Data Transformation: buildStaffListingRowFromListingItem chuyển đổi chuẩn 57 cột & tính thuế TNCN', () => {
  const mockItem: KocListingItem = {
    id: 'LI-test-01',
    batchId: 'BATCH-2026/10-BATCH_10',
    batchCycle: 'BATCH_10',
    monthKey: '2026/10',
    storeId: 'store-test',
    storeName: 'BaBe_TikTok_E2E-O',
    brandName: 'BaBe',
    kocId: 'KOC-phuongthao',
    kocName: 'Phương Thảo Review',
    kocHandle: '@phuongthao.beauty',
    channel: 'TikTok Shop',
    followersCount: 120000,
    tier: 'MACRO',
    niche: 'Chăm sóc da',
    videoFormat: 'Review trực tiếp',
    pillarName: 'Trải nghiệm sản phẩm',
    proposedFee: 4500000,
    finalFee: 4500000,
    brandApprovalStatus: 'BRAND_APPROVED',
    brandApprovedAt: '2026-10-15T09:00:00.000Z',
    kocNegotiationStatus: 'TERMS_AGREED',
    overallStatus: 'FINAL_APPROVED',
    assignedStaffName: 'Lê Phương Thảo',
    createdAt: '2026-10-10T08:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
  };

  const sheetRow = buildStaffListingRowFromListingItem(mockItem);

  assert.equal(sheetRow.id, 'SSR-test-01');
  assert.equal(sheetRow.idKenh, 'phuongthao.beauty');
  assert.equal(sheetRow.linkKenh, 'https://www.tiktok.com/@phuongthao.beauty');
  assert.equal(sheetRow.giaNetVideo, 4500000);
  // Công thức thuế TNCN: gross = Math.round(4500000 / 0.9) = 5000000
  assert.equal(sheetRow.phiBookingKemThue, 5000000);
  assert.equal(sheetRow.brandChon, 'Yes');
  assert.equal(sheetRow.trangThai, 'Đã đồng ý giá');
  assert.equal(sheetRow.nhanSuDien, 'Lê Phương Thảo');
  assert.equal(sheetRow.store, 'BaBe_TikTok_E2E-O');
  assert.equal(sheetRow.thang, '2026/10');
  assert.equal(sheetRow.follower, 120000);
});

test('E2E Dashboard Aggregation: computeAirBookingComparisonReport tổng hợp số liệu KOC chính xác', async () => {
  // Lấy dữ liệu thực từ API
  const req = createReq('http://localhost:3000/api/listing-board?all=true');
  const res = await listingBoardGet(req);
  const { items: kocListings } = await res.json();

  const report = computeAirBookingComparisonReport({
    plans: [],
    approvedBookings: [],
    kocListings,
    selectedMonth: '2026/10',
  });

  assert.ok(report, 'Report phải được tạo thành công');
  assert.ok(report.storeReports.length > 0, 'Phải có báo cáo theo gian hàng');

  // Kiểm tra gian BaBe_TikTok_E2E-O trong báo cáo
  const babeReport = report.storeReports.find(r => r.storeName === 'BaBe_TikTok_E2E-O');
  assert.ok(babeReport, 'Phải tìm thấy BaBe_TikTok_E2E-O trong báo cáo');
  assert.equal(babeReport.actualBookedVideos, 60, 'BaBe phải có 60 video đã book từ listing');
  assert.ok(babeReport.actualNetSpend > 0, 'Chi phí Net phải > 0');
  assert.ok(babeReport.actualGrossSpend >= babeReport.actualNetSpend, 'Chi phí Gross phải >= Net');

  // Kiểm tra không có NaN hoặc Infinity
  assert.ok(!isNaN(report.totalPlanBudget));
  assert.ok(!isNaN(report.totalBookedNetSpend));
  assert.ok(report.totalBookedNetSpend > 0, 'Tổng chi phí Net phải > 0');
  assert.ok(!isNaN(report.budgetBurnRate));
  assert.ok(isFinite(report.budgetBurnRate));
});
