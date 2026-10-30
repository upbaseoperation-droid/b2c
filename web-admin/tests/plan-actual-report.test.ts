import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchDueDate, buildPlanActualReport, jobPaidAmount, weekRange } from '../src/lib/planActualReport';
import { sanitizeDealBoard } from '../src/lib/dealBoardRules';
import type { InputPlanBreakdownState, KocListingItem } from '../src/lib/types';

const plan = {
  id: 'PLAN-T',
  title: 'Gian thử',
  storeName: 'Gian_TikTok',
  brandName: 'Brand A',
  pic: 'PIC A',
  month: '2026/10',
  status: 'LEAD_APPROVED',
  items: [
    { id: 'r1', category: 'KOC_TIER', tierCode: 'KL3', qty: 10, totalBudget: 20_000_000 },
    { id: 'r2', category: 'KOC_TIER', tierCode: 'KL5', qty: 2, totalBudget: 16_000_000 },
  ],
  weeklyBreakdown: [
    { week: 'W41 [05.10 - 11.10]', tiers: { KL3: { qty: 4, budgetNet: 8_000_000 } }, foc: { tapBrand: 0, tap: 0, tapUp: 0 }, self: {}, live: {} },
    { week: 'W42 [12.10 - 18.10]', tiers: { KL3: { qty: 3, budgetNet: 6_000_000 }, KL5: { qty: 2, budgetNet: 16_000_000 } }, foc: { tapBrand: 0, tap: 0, tapUp: 0 }, self: {}, live: {} },
    { week: 'W43 [19.10 - 25.10]', tiers: { KL3: { qty: 3, budgetNet: 6_000_000 } }, foc: { tapBrand: 0, tap: 0, tapUp: 0 }, self: {}, live: {} },
  ],
} as unknown as InputPlanBreakdownState;

const item = (id: string, grade: string, fee: number, status: 'DRAFT' | 'FINAL_APPROVED' | 'DROPPED', batch = 'BATCH_10'): KocListingItem =>
  ({
    id,
    kocHandle: `@${id}`,
    salaryGrade: grade,
    proposedFee: fee,
    finalFee: fee,
    overallStatus: status,
    brandApprovalStatus: status === 'FINAL_APPROVED' ? 'BRAND_APPROVED' : 'BRAND_PENDING',
    batchCycle: batch,
  }) as unknown as KocListingItem;

const job = (over: Record<string, unknown>) => ({ id: String(over.id), videoFee: 2_000_000, deadline: '', airLink: '', airedAt: '', ...over });

const board = sanitizeDealBoard({
  deals: [
    {
      id: 'd1',
      kocHandle: 'a',
      grade: 'KL3',
      jobs: [
        job({ id: 'j1', deadline: '2026-10-08', airedAt: '2026-10-09', airLink: 'x', acceptance: { status: 'PASSED' }, payment: { status: 'PAID', amount: 2_000_000 } }),
        job({ id: 'j2', deadline: '2026-10-10', airedAt: '2026-10-14', airLink: 'x', advancePayment: { status: 'PAID', amount: 1_000_000 } }),
        job({ id: 'j3', deadline: '2026-10-15', lifecycleStatus: 'CANCELLED' }), // hủy: không tính
      ],
    },
    { id: 'd2', kocHandle: 'b', grade: 'KL5', jobs: [job({ id: 'j4', videoFee: 9_000_000, deadline: '2026-10-16' })] },
  ],
} as never);

const listing = [
  item('a', 'KL3', 2_000_000, 'FINAL_APPROVED'),
  item('b', 'KL5', 9_000_000, 'FINAL_APPROVED'),
  item('c', 'KL3', 2_000_000, 'DRAFT', 'BATCH_20'),
  item('d', 'KL3', 2_000_000, 'DROPPED'),
];

test('Tách ngày của nhãn tuần, kể cả tuần vắt năm', () => {
  assert.deepEqual(weekRange('W43 [19.10 - 25.10]', '2026/10'), { start: '2026-10-19', end: '2026-10-25' });
  assert.deepEqual(weekRange('W44 [26.10 - 01.11]', '2026/10'), { start: '2026-10-26', end: '2026-11-01' });
  assert.deepEqual(weekRange('W53 [28.12 - 03.01]', '2026/12'), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(weekRange('W1 [29.12 - 04.01]', '2027/01'), { start: '2026-12-29', end: '2027-01-04' });
  assert.equal(batchDueDate('2026/02', 30), '2026-02-28');
});

test('Theo KL: kế hoạch, list, chốt, job, air, nghiệm thu, cam kết, đã chi', () => {
  const r = buildPlanActualReport(plan, listing, board, '2026-10-20');
  const kl3 = r.tiers.find(t => t.key === 'KL3')!;
  assert.equal(kl3.planQty, 10);
  assert.equal(kl3.listed, 2); // a + c, không tính rớt
  assert.equal(kl3.confirmed, 1);
  assert.equal(kl3.jobs, 2); // job hủy không tính
  assert.equal(kl3.aired, 2);
  assert.equal(kl3.accepted, 1);
  assert.equal(kl3.committed, 4_000_000);
  assert.equal(kl3.paid, 3_000_000); // 2tr tất toán + 1tr tạm ứng
  assert.equal(r.total.committed, 13_000_000);
  assert.equal(r.budget.plan, 36_000_000);
  assert.equal(r.budget.isOver, false);
});

test('Theo tuần: đếm theo hạn air và ngày air; tuần đã qua mà thiếu là quá hạn', () => {
  const r = buildPlanActualReport(plan, listing, board, '2026-10-20');
  // Tuần của tháng chưa nhập phân rã vẫn hiện (W40, W44) với kế hoạch 0
  assert.deepEqual(r.weeks.map(w => w.week.slice(0, 3)), ['W40', 'W41', 'W42', 'W43', 'W44']);
  const [w40, w41, w42, w43] = r.weeks;
  assert.deepEqual([w40.planQty, w40.state], [0, 'none']);
  assert.equal(r.hasWeeklyPlan, true);
  assert.deepEqual([w41.planQty, w41.scheduled, w41.aired, w41.state], [4, 2, 1, 'overdue']);
  assert.deepEqual([w42.planQty, w42.scheduled, w42.aired, w42.state], [5, 1, 1, 'overdue']);
  assert.equal(w43.state, 'running');
  assert.deepEqual(r.dueToDate, { planQty: 9, aired: 2, lastEndedWeekEnd: '2026-10-18' });
  assert.equal(r.state, 'overdue');
});

test('Theo đợt: hạn ngày 10/20/30 của tháng kế hoạch, chỉ tiêu 60/30/10%', () => {
  const r = buildPlanActualReport(plan, listing, board, '2026-10-15');
  const [b1, b2, b3] = r.batches;
  assert.equal(b1.dueDate, '2026-10-10');
  assert.equal(b1.targetQty, 8); // làm tròn lên 60% của 12
  assert.equal(b1.listed, 2);
  assert.equal(b1.state, 'overdue');
  assert.equal(b2.state, 'running');
  assert.equal(b3.dueDate, '2026-10-30');
});

test('Đã chi không vượt phí khi phiếu tất toán ghi cả phần đã ứng', () => {
  const [j] = sanitizeDealBoard({
    deals: [{ id: 'x', kocHandle: 'x', jobs: [job({ id: 'j', advancePayment: { status: 'PAID', amount: 1_000_000 }, payment: { status: 'PAID', amount: 2_000_000 } })] }],
  } as never).deals[0].jobs;
  assert.equal(jobPaidAmount(j), 2_000_000);
});

test('Chi phí phát sinh khi kế hoạch 0đ là ngoài kế hoạch', () => {
  const empty = { ...plan, items: [], weeklyBreakdown: [] } as unknown as InputPlanBreakdownState;
  const r = buildPlanActualReport(empty, [], board, '2026-10-20');
  assert.equal(r.budget.isUnbudgeted, true);
  assert.equal(r.total.committed, 13_000_000);
});

test('Theo Kênh × Tuần & Bậc KL × Tuần + tích hợp airSyncRecord từ File 3.2', () => {
  const r = buildPlanActualReport(
    plan,
    listing,
    { deals: [] } as never,
    '2026-10-20',
    undefined,
    {
      storeName: 'Gian_TikTok',
      brandName: 'Brand A',
      platform: 'TikTok Shop',
      primaryPic: 'PIC A',
      bookingLeader: '',
      hasBookingLeader: false,
      targetPaidVideos: 12,
      targetFocVideos: 0,
      targetSelfVideos: 0,
      targetBudgetNet: 36_000_000,
      totalBookedDeals: 2,
      totalAiredDeals: 1,
      totalPendingAirDeals: 1,
      onTimeCount: 1,
      earlyCount: 0,
      lateCount: 0,
      unscheduledPlanCount: 0,
      onTimeRatePct: 100,
      peakAirDate: '08/10/2026',
      peakAirCount: 1,
      syncDiagnosis: 'IN_PROGRESS_BOTTLENECK',
      syncVerdictText: 'Đang thực thi',
      weeklyMatrix: [],
      deals: [
        {
          code: 'BO26_TEST_01',
          kocHandle: '@a',
          product: 'Combo A',
          kl: 'KL3',
          format: 'Booking Video KOC',
          cost: 2_000_000,
          plannedAirDate: '2026-10-08',
          plannedWeek: 'W41 (05/10-11/10)',
          actualAirDate: '2026-10-08',
          actualWeek: 'W41 (05/10-11/10)',
          dayLag: 0,
          syncTimingStatus: 'ON_TIME',
          pipeline: 'Làm ĐNTT',
          linkAir: 'https://www.tiktok.com/@a/video/1',
          pic: 'PIC A',
        },
        {
          code: 'BO26_TEST_02',
          kocHandle: '@b',
          product: 'Combo B',
          kl: 'KL5',
          format: 'Booking Video KOC',
          cost: 8_000_000,
          plannedAirDate: '2026-10-15',
          plannedWeek: 'W42 (12/10-18/10)',
          actualAirDate: '',
          actualWeek: '',
          dayLag: null,
          syncTimingStatus: 'NOT_AIRED',
          pipeline: 'Đã nhận hàng',
          linkAir: '',
          pic: 'PIC A',
        },
      ],
    },
  );
  const castChannel = r.channels.find(c => c.key === 'CAST_PAID')!;
  assert.equal(castChannel.planQty, 12);
  assert.equal(castChannel.jobs, 2);
  assert.equal(castChannel.aired, 1);
  assert.equal(castChannel.accepted, 1);
  const w41 = r.weeks.find(w => w.weekCode === 'W41')!;
  assert.equal(w41.byChannel.CAST_PAID.planQty, 4);
  assert.equal(w41.byChannel.CAST_PAID.aired, 1);
  assert.equal(w41.byTier.KL3.planQty, 4);
  assert.equal(w41.byTier.KL3.aired, 1);
  assert.equal(r.deals.length, 2);
});
