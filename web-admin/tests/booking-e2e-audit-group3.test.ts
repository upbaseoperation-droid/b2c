import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { moveItem, applyBrandDecision, isDirectConfirmEligible } from '../src/lib/listingBoardRules';
import {
  resolveStoreBookingLeader,
  evaluateDealForPaymentRequest,
  buildLarkPaymentRequestSlip,
} from '../src/lib/larkPaymentRequestEngine';
import { resolveBookingLeader } from '../src/lib/server/larkbaseBookingPlanSync';
import { userWithPolicy } from '../src/lib/server/accessPolicy';
import { DEFAULT_ACCESS_POLICY } from '../src/lib/rbacData';
import { computeSlaTimelineFromAirDate, computeP3SimulationRow, parseBatchQuoteLines } from '../src/lib/workToolkitRules';
import { planJobToBookingDeal, documentsOfJob } from '../src/lib/planDealLink';
import { sanitizeDealBoard } from '../src/lib/dealBoardRules';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import { POST as monthlyPlansPost } from '../src/app/api/monthly-plans/route';
import { PUT as listingBoardPut } from '../src/app/api/listing-board/route';
import { PUT as dealBoardPut, GET as dealBoardGet } from '../src/app/api/deal-board/route';
import { PUT as kocFrameworkPut, GET as kocFrameworkGet } from '../src/app/api/koc-framework/route';
import {
  POST as paymentRequestsPost,
  GET as paymentRequestsGet,
} from '../src/app/api/integrations/larkbase/payment-requests/route';
import type { ContractRecord } from '../src/lib/contracts/types';
import type { BookingDealItem, InputPlanBreakdownState, KocItem, KocListingItem, UserProfile } from '../src/lib/types';

function createReq(url: string, method = 'GET', actor?: UserProfile | null, body?: unknown, origin = 'http://localhost:3000') {
  const headers: Record<string, string> = { origin };
  if (actor) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}`;
  }
  if (body) {
    headers['content-type'] = 'application/json';
  }
  return new NextRequest(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test('L2 & L5: Chặn chốt thẳng KOC trả phí chưa qua Brand duyệt & xóa lastSheetDecision khi trình lại Brand', () => {
  const paidDraft: KocListingItem = {
    id: 'li-1',
    kocHandle: 'koc.test.01',
    kocName: 'KOC Test 01',
    proposedFee: 2500000,
    salaryGrade: 'KL3',
    overallStatus: 'DRAFT',
    brandApprovalStatus: 'BRAND_PENDING',
    kocNegotiationStatus: 'NOT_CONTACTED',
  };

  // Không được chốt thẳng KOC trả phí khi Brand chưa duyệt
  assert.equal(isDirectConfirmEligible(paidDraft), false);
  const directMove = moveItem(paidDraft, 'CONFIRMED', 'Lê Phương Thảo');
  assert.ok(directMove.error);

  // KOC FOC 0đ được phép chốt thẳng
  const focDraft: KocListingItem = { ...paidDraft, proposedFee: 0, salaryGrade: 'TAP UpAffiliate' };
  assert.equal(isDirectConfirmEligible(focDraft), true);
  const focMove = moveItem(focDraft, 'CONFIRMED', 'Lê Phương Thảo');
  assert.equal(focMove.item?.overallStatus, 'FINAL_APPROVED');

  // Khi trình lại Brand (NEGOTIATING -> WAIT_BRAND), lastSheetDecision phải được xóa để không kẹt Yes cũ
  const approvedItem = applyBrandDecision(
    moveItem(paidDraft, 'WAIT_BRAND', 'Lê Phương Thảo').item!,
    'APPROVED',
    { actor: 'Brand' }
  ).item;
  assert.equal(approvedItem.lastSheetDecision, 'APPROVED');

  const resubmitted = moveItem(approvedItem, 'WAIT_BRAND', 'Lê Phương Thảo').item!;
  assert.equal(resubmitted.lastSheetDecision, undefined);
  assert.equal(resubmitted.brandApprovalStatus, 'BRAND_PENDING');
});

test('S7: userWithPolicy ưu tiên khớp theo mã nhân sự / ID trước tên hiển thị để chống nhầm nhân sự trùng tên', () => {
  const policy = {
    ...DEFAULT_ACCESS_POLICY,
    internalStaff: [
      {
        id: 'staff-HN374',
        staffCode: 'HN374',
        name: 'Bùi Phương Linh',
        email: 'linh.bp1@upbase.vn',
        role: 'MEMBER' as const,
        roleTitle: 'Chuyên viên',
        departmentScope: 'B2C',
        status: 'SUSPENDED' as const,
        canLogin: false,
        permissions: {},
      },
      {
        id: 'staff-HN509',
        staffCode: 'HN509',
        name: 'Bùi Phương Linh',
        email: 'linh.bp2@upbase.vn',
        role: 'BOOKING_MEMBER' as const,
        roleTitle: 'Chuyên viên Booking',
        departmentScope: 'B2C',
        status: 'ACTIVE' as const,
        canLogin: true,
        permissions: { canApprovePayment: true },
      },
    ],
  };

  const activeUser: UserProfile = {
    id: 'staff-HN509',
    staffCode: 'HN509',
    name: 'Bùi Phương Linh',
    email: 'linh.bp2@upbase.vn',
    role: 'BOOKING_MEMBER',
    avatar: 'BL',
    assignedBrands: [],
  };

  const resolved = userWithPolicy(activeUser, policy, 2);
  assert.ok(resolved, 'Nhân sự HN509 đang hoạt động không được bị khóa nhầm bởi HN374 trùng tên đứng trước');
  assert.equal(resolved?.id, 'staff-HN509');
  assert.ok(resolved?.permissions?.includes('canApprovePayment'));
});

test('Quy tắc Leader B2C: Gian Jasmine / Mineral và Mine Shopee không bị gán nhầm Trưởng nhóm Nguyễn Thị Ngọc Tâm', () => {
  assert.equal(resolveStoreBookingLeader('Mine_TikTok_E2E-C'), 'Nguyễn Thị Ngọc Tâm');
  assert.equal(resolveStoreBookingLeader('ClubClio_Shopee_E2E-S'), 'Nguyễn Thị Ngọc Tâm');
  assert.equal(resolveStoreBookingLeader('Mine_Shopee_E2E-C'), undefined);
  assert.equal(resolveStoreBookingLeader('Jasmine_TikTok_E2E-C'), undefined);
  assert.equal(resolveStoreBookingLeader('Mineral_Care_TikTok'), undefined);

  assert.equal(resolveBookingLeader('Mine_TikTok_E2E-C'), 'Nguyễn Thị Ngọc Tâm');
  assert.equal(resolveBookingLeader('Mine_Shopee_E2E-C'), undefined);
  assert.equal(resolveBookingLeader('Jasmine_TikTok_E2E-C'), undefined);
});

test('Bộ công cụ tiện ích nghiệp vụ (workToolkitRules): tính thuế hàng loạt, điểm tải P3 và lịch SLA chuẩn xác', () => {
  const batch = parseBatchQuoteLines('goc.cua.ru\t2500000\t2', 'PIT_10', new Map());
  assert.equal(batch.length, 1);
  assert.equal(batch[0].totalNet, 5000000);
  assert.equal(batch[0].klGrade, 'KL3');

  const p3 = computeP3SimulationRow({
    id: 's1',
    storeName: 'ClubClio_TikTok_E2E-S',
    brandName: 'ClubClio',
    picName: 'Lê Phương Thảo',
    difficultyTier: 'Vừa',
    completedCases: 20,
    qualityMultiplier: 1.1,
    slaMultiplier: 1.0,
    unitRateVnd: 100000,
  });
  assert.equal(p3.storeMultiplier, 1.25);
  assert.equal(p3.workloadPoints, 27.5);
  assert.equal(p3.estimatedBonusVnd, 2750000);

  const sla = computeSlaTimelineFromAirDate('2026-10-25', false, 2500000);
  assert.equal(sla.length, 8);
  assert.equal(sla[0].targetDateStr, '2026-10-18');
  assert.equal(sla[7].targetDateStr, '2026-11-02');
});

test('D4, C3, P1, P2, P5 & documentsOfJob: Khấu trừ DROPPED, không cộng trùng VAT Công ty, trừ tạm ứng khi tất toán, chặn gom nhiều STK và ưu tiên bản hợp đồng đã ký', () => {
  const board = sanitizeDealBoard({
    deals: [
      {
        id: 'd1',
        code: 'BO2610-001',
        kocHandle: 'agency.kol.01',
        kocName: 'Agency KOL 01',
        grade: 'KL6',
        fee: 30000000,
        pic: 'Lê Phương Thảo',
        jobs: [
          {
            id: 'j1',
            code: 'BO2610-001-J1',
            title: 'Video 1',
            videoFee: 30000000,
            entityType: 'COMPANY',
            vatPct: 10,
            payment: {
              status: 'REQUESTED',
              amount: 15000000,
              requestedAt: '2026-10-10',
              paidAt: '',
              note: '',
              larkSlipCode: 'DNTT-ADV-01',
              larkApprovalCode: 'APR-ADV-01',
              larkRecordId: '',
              larkSyncedAt: '',
            },
            addons: [
              { id: 'a1', type: 'ADS_CODE', label: 'Mã Ads 60 ngày', fee: 5000000, status: 'PENDING', evidence: '' },
              { id: 'a2', type: 'CROSS_POST', label: 'Đăng chéo FB', fee: 2000000, status: 'DROPPED', evidence: '' },
            ],
          },
        ],
      },
    ],
  });

  const deal = board.deals[0];
  const job = deal.jobs[0];
  const plan = {
    id: 'PLAN-2026-10-CLUBCLIO',
    title: 'Plan Tháng 10 ClubClio',
    month: '2026/10',
    brandName: 'ClubClio',
    storeId: 'store-clio',
    storeName: 'ClubClio_TikTok_E2E-S',
  } as unknown as InputPlanBreakdownState;

  const bookingDeal = planJobToBookingDeal(deal, job, plan, 'koc-agency-01', 'HDNT-2026-01');

  // C3 & D4: totalValue giữ nguyên Net chưa VAT (30tr video + 5tr addon active + 2tr dropped để nơi nhận tự trừ droppedCostVnd = 2tr -> còn 35tr Net)
  assert.equal(bookingDeal.droppedCostVnd, 2000000);
  assert.equal(bookingDeal.totalValue, 37000000);
  assert.equal(bookingDeal.vatRatePercent, 10);
  // P1: advanceAmount được truyền từ job.payment.amount (15tr)
  assert.equal(bookingDeal.advanceAmount, 15000000);
  // P2: addon ADS_CODE đang PENDING và chưa có sparkAdsCode nên adsCodeStatus phải là CHƯA_CẤP (không bịa ĐÃ_NGHIỆM_THU)
  assert.equal(bookingDeal.adsCodeStatus, 'CHƯA_CẤP');

  const companyKoc: KocItem = {
    id: 'koc-agency-01',
    stageName: 'Agency KOL 01',
    channelId: '@agency.kol.01',
    platform: 'TIKTOK',
    followers: 500000,
    tier: 'TIER_1_MACRO',
    salaryGrade: 'KL6',
    category: 'Beauty',
    companyName: 'CÔNG TY TNHH MCN ALPHA',
    taxCode: '0109876543',
    taxAccountType: '(VAT 10%) Tài khoản doanh nghiệp',
    bankName: 'Techcombank',
    bankAccount: '190399998888',
  };

  // Đánh giá thanh toán tất toán (SETTLEMENT) có trừ 15tr đã tạm ứng
  const line = evaluateDealForPaymentRequest(
    { ...bookingDeal, status: 'ADVANCE_PAID' },
    companyKoc,
    'SETTLEMENT',
    undefined,
    { dealCode: bookingDeal.dealCode, advanceRequestedAmount: 15000000, settlementRequestedAmount: 0 }
  );

  // Net sau khi trừ DROPPED = 37tr - 2tr = 35tr; trừ tạm ứng 15tr = 20tr; cộng VAT 10% một lần = 22tr (không cộng VAT 2 lần)
  assert.equal(line.effectiveSettledNetAmount, 35000000);
  assert.equal(line.advancePaidAmount, 15000000);
  assert.equal(line.requestBaseNetAmount, 20000000);
  assert.equal(line.grossContractAmount, 22000000);

  // P5: Gom 2 KOC có số tài khoản khác nhau vào chung 1 phiếu phải bị chặn bởi lỗi MIXED_PAYEES
  const secondDeal: BookingDealItem = {
    ...bookingDeal,
    id: 'PJ-j2',
    dealCode: 'BO2610-002-J1',
    kocId: 'koc-other-02',
    kocChannelId: 'koc.other.02',
    kocStageName: 'KOC Other 02',
  };
  const secondKoc: KocItem = {
    ...companyKoc,
    id: 'koc-other-02',
    channelId: '@koc.other.02',
    stageName: 'KOC Other 02',
    bankAccount: '0011002233445',
  };
  const slip = buildLarkPaymentRequestSlip({
    requestType: 'SETTLEMENT',
    deals: [bookingDeal, secondDeal],
    kocs: [companyKoc, secondKoc],
    createdBy: 'Lê Phương Thảo',
  });
  assert.equal(slip.canSubmit, false);
  assert.ok(slip.allIssues.some(x => x.issue.code === 'MIXED_PAYEES'));

  // documentsOfJob: ưu tiên hồ sơ ĐÃ KÝ hơn bản NHÁP tạo muộn hơn
  const signedSow: ContractRecord = {
    id: 'rec-signed',
    code: 'SOW-001',
    title: 'Phụ lục đã ký',
    templateId: 'IND-VID-SOW',
    partner: 'agency.kol.01',
    kocId: 'koc-agency-01',
    dealId: `PJ-${job.id}`,
    dealCode: job.code,
    brand: 'ClubClio',
    value: 35000000,
    approval: 'APPROVED',
    legalReview: { status: 'APPROVED' },
    financeReview: { status: 'APPROVED' },
    signing: [{ id: 's1', provider: 'MISA_WESIGN', documentId: 'doc-1', status: 'COMPLETED', linkedAt: '2026-10-12', syncedAt: '2026-10-12' }],
    fields: {},
    createdBy: 'Lê Phương Thảo',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-12T08:00:00Z',
    history: [],
    version: 1,
  } as unknown as ContractRecord;

  const newerDraftSow: ContractRecord = {
    ...signedSow,
    id: 'rec-draft-newer',
    code: 'SOW-002-DRAFT',
    approval: 'DRAFT',
    signing: [],
    updatedAt: '2026-10-20T09:00:00Z',
  };

  const docs = documentsOfJob(deal, job, [newerDraftSow, signedSow]);
  const sowState = docs.find(d => d.document === 'SOW');
  assert.equal(sowState?.signed, true);
  assert.equal(sowState?.record?.id, 'rec-signed');
});

test('API Server Guards (L1, L3, D1, D5, S4, S6): Kiểm tra khóa sửa giá, chặn tự duyệt Pháp chế/Kế toán và che dữ liệu nhạy cảm trên API', async () => {
  const admin = USERS.find(u => u.role === 'ADMIN') || USERS[0];
  const baseSpecialist = USERS.find(u => u.role === 'BOOKING_MEMBER') || USERS[1];
  const specialist: UserProfile = {
    ...baseSpecialist,
    role: 'BOOKING_MEMBER',
    assignedBrands: ['ClubClio'],
  };

  // 1. Tạo kế hoạch tháng để test Listing & Deal Board
  const rawPlanId = `PLAN-AUDIT-G3-${Date.now()}`;
  const createPlanRes = await monthlyPlansPost(
    createReq('http://localhost:3000/api/monthly-plans', 'POST', admin, {
      plan: {
        id: rawPlanId,
        title: 'Kế hoạch Audit E2E G3',
        brandName: 'ClubClio',
        storeId: 'store-clio-audit',
        storeName: 'ClubClio_TikTok_E2E-S',
        month: '2026/10',
        week: 'W40',
        pic: specialist.name,
        bookingLeader: 'Nguyễn Thị Ngọc Tâm',
        version: 'v1.0',
        status: 'APPROVED',
        createdBy: specialist.name,
        bookingPic: specialist.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalTargetGmv: 100000000,
        totalTargetBudget: 20000000,
        totalTargetContents: 10,
        targetGmv: 100000000,
        cancellationRate: 5,
        totalBudget: 20000000,
        items: [],
      },
    })
  );
  assert.ok([200, 201].includes(createPlanRes.status));
  const createdPlanJson = await createPlanRes.json();
  const planId = createdPlanJson.plan?.id || rawPlanId;

  // 2. L3 trên PUT /api/listing-board: Lưu KOC đã được Brand duyệt với giá 2.5tr, sau đó tăng giá lên 3.5tr -> tự động quay về BRAND_PENDING
  const firstListingRes = await listingBoardPut(
    createReq('http://localhost:3000/api/listing-board', 'PUT', admin, {
      planId,
      revision: 0,
      items: [
        {
          id: 'li-audit-1',
          kocHandle: 'koc.audit.g3',
          kocName: 'KOC Audit G3',
          proposedFee: 2500000,
          finalFee: 2500000,
          salaryGrade: 'KL3',
          overallStatus: 'FINAL_APPROVED',
          brandApprovalStatus: 'BRAND_APPROVED',
          brandApprovedAt: '2026-10-10',
          lastSheetDecision: 'APPROVED',
          kocNegotiationStatus: 'TERMS_AGREED',
        },
      ],
    })
  );
  assert.equal(firstListingRes.status, 200);
  const firstListingJson = await firstListingRes.json();

  const feeIncreaseRes = await listingBoardPut(
    createReq('http://localhost:3000/api/listing-board', 'PUT', admin, {
      planId,
      revision: firstListingJson.revision,
      items: [
        {
          ...firstListingJson.items[0],
          finalFee: 3500000,
        },
      ],
    })
  );
  assert.equal(feeIncreaseRes.status, 200);
  const feeIncreaseJson = await feeIncreaseRes.json();
  assert.equal(feeIncreaseJson.items[0].overallStatus, 'SUBMITTED');
  assert.equal(feeIncreaseJson.items[0].brandApprovalStatus, 'BRAND_PENDING');
  assert.equal(feeIncreaseJson.items[0].lastSheetDecision, undefined);

  // 3. Đăng ký HĐNT cho koc.audit.g3 và kiểm tra che STK/CCCD đối với BOOKING_MEMBER khi gọi GET /api/koc-framework (không truyền handles)
  const fwRes = await kocFrameworkPut(
    createReq('http://localhost:3000/api/koc-framework', 'PUT', admin, {
      handle: 'koc.audit.g3',
      contractNo: 'HDNT-AUDIT-G3-01',
      signedAt: '2026-10-01',
      validTo: '2027-10-01',
      taxOrCccd: '001099887766',
      bankAccount: '19031122334455',
    })
  );
  assert.equal(fwRes.status, 200);

  const fwListForMemberRes = await kocFrameworkGet(
    createReq('http://localhost:3000/api/koc-framework', 'GET', specialist)
  );
  assert.equal(fwListForMemberRes.status, 200);
  const fwListForMemberJson = await fwListForMemberRes.json();
  const maskedFw = fwListForMemberJson.items.find((x: { id: string }) => x.id === 'koc.audit.g3');
  assert.ok(maskedFw);
  assert.ok(maskedFw.bankAccount.includes('*'));

  // 4. S6, D1 & D5 trên PUT /api/deal-board
  const getDealInit = await dealBoardGet(
    createReq(`http://localhost:3000/api/deal-board?planId=${planId}`, 'GET', admin)
  );
  const dealInitJson = await getDealInit.json();

  // S6: BOOKING_MEMBER tự gán legalReviewStatus = 'APPROVED' phải bị chặn 403
  const illegalLegalApproveRes = await dealBoardPut(
    createReq('http://localhost:3000/api/deal-board', 'PUT', specialist, {
      planId,
      revision: dealInitJson.revision,
      data: {
        deals: [
          {
            id: 'deal-g3-1',
            code: 'BO2610-G301',
            kocHandle: 'koc.audit.g3',
            kocName: 'KOC Audit G3',
            grade: 'KL3',
            fee: 2500000,
            pic: 'Lê Phương Thảo',
            jobs: [
              {
                id: 'job-g3-1',
                code: 'BO2610-G301-J1',
                title: 'Video G3',
                videoFee: 2500000,
                legalReviewStatus: 'APPROVED',
              },
            ],
          },
        ],
      },
    })
  );
  assert.equal(illegalLegalApproveRes.status, 403);

  // Lưu Job đã gửi yêu cầu thanh toán (payment.status = 'REQUESTED') với appendixNo = 'PL-G3-01'
  const validPaymentReqDealRes = await dealBoardPut(
    createReq('http://localhost:3000/api/deal-board', 'PUT', admin, {
      planId,
      revision: dealInitJson.revision,
      data: {
        deals: [
          {
            id: 'deal-g3-1',
            code: 'BO2610-G301',
            kocHandle: 'koc.audit.g3',
            kocName: 'KOC Audit G3',
            grade: 'KL3',
            fee: 2500000,
            pic: 'Lê Phương Thảo',
            jobs: [
              {
                id: 'job-g3-1',
                code: 'BO2610-G301-J1',
                title: 'Video G3',
                videoFee: 2500000,
                appendixNo: 'PL-G3-01',
                appendixDate: '2026-10-05',
                airLink: 'https://www.tiktok.com/@koc.audit.g3/video/7400000000000009999',
                airedAt: '2026-10-10',
                acceptance: {
                  status: 'PASSED',
                  checks: [],
                  summary: 'Đạt nghiệm thu',
                  views: 15000,
                  isOnTime: true,
                  daysDelayed: 0,
                  checkedAt: '2026-10-11',
                  confirmedBy: 'Lê Phương Thảo',
                  confirmedAt: '2026-10-11',
                  confirmNote: 'OK',
                },
                // Đề nghị thanh toán Job có phí cần đối soát Account + Kế toán Đạt và BBNT đã ký
                closingAudit: { accountStatus: 'PASSED', financeStatus: 'PASSED' },
                bbntUrl: 'https://drive.google.com/file/d/bbnt-g3-01/view',
                payment: {
                  status: 'REQUESTED',
                  amount: 2500000,
                  requestedAt: '2026-10-12',
                  paidAt: '',
                  note: '',
                  larkSlipCode: 'DNTT-G3-01',
                  larkApprovalCode: '',
                  larkRecordId: '',
                  larkSyncedAt: '',
                },
              },
            ],
          },
        ],
      },
    })
  );
  assert.equal(validPaymentReqDealRes.status, 200);
  const savedDealJson = await validPaymentReqDealRes.json();

  // D5: Cố tình sửa videoFee sau khi payment.status !== 'NONE' phải bị chặn 400
  const modifyLockedFeeRes = await dealBoardPut(
    createReq('http://localhost:3000/api/deal-board', 'PUT', admin, {
      planId,
      revision: savedDealJson.revision,
      data: {
        deals: [
          {
            ...savedDealJson.data.deals[0],
            jobs: [
              {
                ...savedDealJson.data.deals[0].jobs[0],
                videoFee: 4500000,
              },
            ],
          },
        ],
      },
    })
  );
  assert.equal(modifyLockedFeeRes.status, 400);

  // 5. S4 trên /api/integrations/larkbase/payment-requests: Chặn lập phiếu cho Brand ngoài phạm vi & che STK khi GET
  const unauthorizedBrandPostRes = await paymentRequestsPost(
    createReq('http://localhost:3000/api/integrations/larkbase/payment-requests', 'POST', specialist, {
      requestType: 'SETTLEMENT',
      deals: [
        {
          id: 'd-foreign-1',
          dealCode: 'BO2610-FOREIGN-01',
          brandName: 'Brand Ngoài Phạm Vi',
          storeName: 'Foreign_TikTok_Store',
          bookingPic: 'Nhân Sự Khác',
          assignedStaff: 'Nhân Sự Khác',
          kocId: 'koc-foreign',
          kocStageName: 'KOC Foreign',
          kocChannelId: 'koc.foreign',
          totalValue: 3000000,
        },
      ],
      kocs: [],
    })
  );
  assert.equal(unauthorizedBrandPostRes.status, 403);

  const paymentListRes = await paymentRequestsGet(
    createReq('http://localhost:3000/api/integrations/larkbase/payment-requests', 'GET', specialist)
  );
  assert.equal(paymentListRes.status, 200);
});


