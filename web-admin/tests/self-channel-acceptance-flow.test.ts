import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSelfContentRuleItems,
  combineContentVerdict,
  parseSelfContentModelOutput,
  type SelfContentEvidence,
} from '../src/lib/selfChannelContentCheck';
import {
  createSelfChannelJob,
  sanitizeSelfChannelBoard,
  selfCtvConfirmBlocker,
  selfJobAcceptanceBlocker,
  selfJobHandoverPassed,
} from '../src/lib/selfChannelBoardRules';
import { buildSelfAirReportCsv, extractVideoId, safeRatio, summarizeByPillar, type SelfAirReportRow } from '../src/lib/selfChannelAirReport';
import { mapDwRow } from '../src/lib/server/dataWarehouseClient';
import { computeSelfAirPlanSummary, type SelfAirJobInput } from '../src/lib/selfChannelAirPlanReport';
import { computeSelfWorkProgress, type SelfProgressJob } from '../src/lib/selfChannelWorkProgress';

const evidence = (over: Partial<SelfContentEvidence> = {}): SelfContentEvidence => ({
  caption: '',
  hashtags: [],
  transcript: '',
  hasProductLink: null,
  productMentions: 0,
  policyViolations: [],
  durationSeconds: null,
  ...over,
});

const brief = {
  productName: 'Kem mẩn ngứa Kutieskin',
  hook: 'Mẹ nào con gãi sồn sột cả đêm vì rôm sảy',
  usp: 'nghệ trắng Nano không corticoid',
  cta: 'bấm giỏ hàng',
  forbiddenClaims: 'trị dứt điểm, thuốc đặc trị',
  cartUrl: 'https://shop.tiktok.com/p/1',
};

test('đối chiếu nội dung: bài khớp brief thì đạt', () => {
  const items = buildSelfContentRuleItems(brief, evidence({
    caption: 'Kem mẩn ngứa Kutieskin cho bé',
    transcript: 'Mẹ nào con gãi sồn sột cả đêm vì rôm sảy thì xem ngay, kem có nghệ trắng Nano không corticoid',
    hasProductLink: true,
  }));
  assert.equal(combineContentVerdict(items), 'PASS');
});

test('đối chiếu nội dung: có từ cấm thì không đạt kèm trích dẫn', () => {
  const items = buildSelfContentRuleItems(brief, evidence({
    caption: 'Kem này trị dứt điểm rôm sảy',
    transcript: 'Mẹ nào con gãi sồn sột cả đêm vì rôm sảy',
    hasProductLink: true,
  }));
  const forbidden = items.find(i => i.key === 'forbidden');
  assert.equal(forbidden?.status, 'FAIL');
  assert.ok(forbidden?.evidence?.includes('trị dứt điểm'));
  assert.equal(combineContentVerdict(items), 'FAIL');
});

test('đối chiếu nội dung: thiếu giỏ hàng khi brief yêu cầu thì không đạt', () => {
  const items = buildSelfContentRuleItems(brief, evidence({ caption: 'Kem mẩn ngứa Kutieskin', hasProductLink: false }));
  assert.equal(items.find(i => i.key === 'cta')?.status, 'FAIL');
});

test('đối chiếu nội dung: không đọc được chữ thì chỉ cần xem lại, không báo đạt giả', () => {
  const items = buildSelfContentRuleItems(brief, evidence());
  assert.equal(combineContentVerdict(items), 'REVIEW');
  assert.ok(items.every(i => i.status !== 'PASS'));
});

test('kết quả mô hình sai định dạng bị bỏ qua, đúng định dạng được giới hạn', () => {
  assert.equal(parseSelfContentModelOutput('không phải json'), null);
  const ok = parseSelfContentModelOutput('{"items":[{"label":"Hook","status":"WARN","detail":"x","evidence":"y"},{"label":"Sai","status":"LOL"}],"suggestion":"sửa"}');
  assert.equal(ok?.items.length, 1);
  assert.ok(ok?.items[0].key.startsWith('model-'));
});

test('nghiệm thu bị chặn khi đối chiếu nội dung không đạt và chưa có ghi chú', () => {
  const job = createSelfChannelJob({
    productName: 'A', angle: 'b', contributorName: 'CTV', videoQaStatus: 'INTERNAL_QA_PASSED',
    airLink: 'https://www.tiktok.com/@brand/video/7300000000000000001', airedAt: '2026-10-10',
  }, []);
  job.airCheck = { verdict: 'PASS', checkedAt: '', checkedBy: '', checkedLink: job.airLink, platform: 'tiktok', authorHandle: null, expectedHandle: null, publishedAt: null, views: null, coverUrl: null, issues: [] };
  job.contentCheck = { verdict: 'FAIL', checkedAt: '', checkedBy: '', checkedLink: job.airLink, source: 'RULES', items: [] };
  assert.ok(selfJobAcceptanceBlocker(job)?.includes('Đối chiếu nội dung'));
  job.acceptanceNote = 'Brand đã đồng ý bản này';
  assert.equal(selfJobAcceptanceBlocker(job), null);
});

test('đạt bàn giao: đã đạt QA nhưng chưa có link đăng', () => {
  const job = createSelfChannelJob({ videoQaStatus: 'INTERNAL_QA_PASSED' }, []);
  assert.equal(selfJobHandoverPassed(job), true);
  job.airLink = 'https://x.y/video/123456789';
  assert.equal(selfJobHandoverPassed(job), false);
});

test('CTV phải xác nhận nhận việc trước khi nộp bài; việc cũ không bị chặn', () => {
  const created = createSelfChannelJob({ contributorId: 'ctv-1', contributorName: 'CTV A' }, []);
  assert.equal(created.ctvConfirmStatus, 'ASSIGNED');
  // Tên gõ tay không có mã danh bạ: không có cổng nhận việc, không bị chặn vì chờ xác nhận
  assert.equal(createSelfChannelJob({ contributorName: 'Gõ tay' }, []).ctvConfirmStatus, undefined);
  assert.ok(selfCtvConfirmBlocker(created)?.includes('xác nhận'));
  assert.equal(selfCtvConfirmBlocker({ code: 'SC-01', ctvConfirmStatus: undefined }), null);
  assert.ok(selfCtvConfirmBlocker({ code: 'SC-01', ctvConfirmStatus: 'DECLINED' }));
  const board = sanitizeSelfChannelBoard({ jobs: [{ ...created, ctvConfirmStatus: 'CONFIRMED' }] as never });
  assert.equal(board.jobs[0].ctvConfirmStatus, 'CONFIRMED');
});

test('video_id từ link đăng', () => {
  assert.equal(extractVideoId('https://www.tiktok.com/@brand/video/7300000000000000001?x=1'), '7300000000000000001');
  assert.equal(extractVideoId('https://www.youtube.com/shorts/AbCdEf12345'), 'AbCdEf12345');
  assert.equal(extractVideoId(''), null);
});

test('ánh xạ cột Data Warehouse và tổng hợp pillar không điền số giả', () => {
  const m = mapDwRow({ video_id: '7300000000000000001', views_30d: '1200', gmv_30d: 5000000, orders_30d: 10, roi_30d: 2.5 });
  assert.equal(m?.views30d, 1200);
  assert.equal(m?.views14d, null);
  assert.equal(mapDwRow({ views_30d: 1 }), null);
  const base: Omit<SelfAirReportRow, 'pillar' | 'dw'> = {
    planId: 'p', storeName: 's', brandName: 'b', month: '2026/10', code: 'SC-01', angle: '', formatKey: 'reviewVoice', platform: 'TIKTOK_BRAND',
    contributorName: 'c', productName: 'x', airedAt: '2026-10-10', airLink: 'https://x/video/123456789', videoId: '123456789', viewsFromLink: null, acceptanceStatus: 'PASSED',
  };
  const rows: SelfAirReportRow[] = [
    { ...base, pillar: 'Nỗi đau', dw: m },
    { ...base, code: 'SC-02', pillar: 'Nỗi đau', dw: null },
    { ...base, code: 'SC-03', pillar: '', dw: null },
  ];
  const sum = summarizeByPillar(rows);
  const pain = sum.find(s => s.pillar === 'Nỗi đau');
  assert.equal(pain?.videos, 2);
  assert.equal(pain?.withDw, 1);
  assert.equal(pain?.gmv30d, 5000000);
  assert.equal(sum.find(s => s.pillar === 'Chưa gắn pillar')?.gmv30d, 0);
  assert.equal(safeRatio(5, 0), 0);
  const csv = buildSelfAirReportCsv(rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv.split('\n').length, 4);
});

test('báo cáo kế hoạch so với đã air: đếm đúng chỉ tiêu, đã air, trễ hạn, quá hạn chưa air', () => {
  const plans = [
    { planId: 'p1', storeName: 'ClubClio_TikTok', brandName: 'ClubClio', month: '2026/10', pic: 'Nguyễn Văn A', targetQty: 10, targetBudgetNet: 5_000_000 },
    { planId: 'p2', storeName: 'Abc_Shopee', brandName: 'Abc', month: '2026/10', pic: 'Trần B', targetQty: 0, targetBudgetNet: 0 },
    { planId: 'p3', storeName: 'Khác', brandName: 'K', month: '2026/09', pic: 'C', targetQty: 5, targetBudgetNet: 1 },
  ];
  const base = { planId: 'p1', storeName: 'ClubClio_TikTok', month: '2026/10', contentPic: 'Nguyễn Văn A', feeGross: 800_000, paymentStatus: 'NONE' as const, lifecycleStatus: 'ACTIVE' as const, acceptanceStatus: 'PENDING' as const };
  const jobs: SelfAirJobInput[] = [
    { ...base, id: '1', code: 'SC-01', airLink: 'https://www.tiktok.com/@a/video/1234567890', airedAt: '2026-10-10', deadline: '2026-10-12', acceptanceStatus: 'PASSED', paymentStatus: 'PAID' },
    { ...base, id: '2', code: 'SC-02', airLink: 'https://www.tiktok.com/@a/video/1234567891', airedAt: '2026-10-20', deadline: '2026-10-15' },
    { ...base, id: '3', code: 'SC-03', airLink: '', airedAt: '', deadline: '2026-10-18' },
    { ...base, id: '4', code: 'SC-04', airLink: '', airedAt: '', deadline: '2026-11-30' },
    { ...base, id: '5', code: 'SC-05', airLink: 'https://x/video/1', airedAt: '2026-10-05', deadline: '2026-10-30', lifecycleStatus: 'CANCELLED' as const },
  ];
  const s = computeSelfAirPlanSummary({ plans, jobs, month: '2026/10', today: '2026-10-30' });
  assert.equal(s.rows.length, 1); // gian không có chỉ tiêu, không có việc và tháng khác bị loại
  const r = s.rows[0];
  assert.equal(r.planQty, 10);
  assert.equal(r.jobs, 4); // việc hủy không tính
  assert.equal(r.aired, 2);
  assert.equal(r.airedLate, 1);
  assert.equal(r.airedOntime, 1);
  assert.equal(r.waitingAir, 2);
  assert.equal(r.overdueNotAired, 1);
  assert.equal(r.accepted, 1);
  assert.equal(r.gapQty, 8);
  assert.equal(r.airRate, 20);
  assert.equal(r.paid, 800_000);
  // lọc theo gian / nhân sự
  assert.equal(computeSelfAirPlanSummary({ plans, jobs, month: '2026/10', store: 'khác', today: '2026-10-30' }).rows.length, 0);
  assert.equal(computeSelfAirPlanSummary({ plans, jobs, month: '2026/10', pic: 'Nguyễn Văn A', today: '2026-10-30' }).rows.length, 1);
  // chỉ tiêu 0 thì tỷ lệ 0, không NaN
  const zero = computeSelfAirPlanSummary({ plans: [{ ...plans[0], targetQty: 0 }], jobs, month: '2026/10', today: '2026-10-30' });
  assert.equal(zero.airRate, 0);
});

test('tiến độ làm việc: đếm đúng video ở từng bước và việc đang kẹt', () => {
  const plans = [{ planId: 'p1', storeName: 'ClubClio_TikTok', brandName: 'ClubClio', month: '2026/10', pic: 'Nguyễn Văn A', targetQty: 8, targetBudgetNet: 1 }];
  const mk = (code: string, over: Record<string, unknown>): SelfProgressJob => ({
    ...createSelfChannelJob({ code, productName: 'SP', angle: 'góc', contributorId: 'ctv-1', contributorName: 'CTV Một', contentPic: 'Nguyễn Văn A', sampleStatus: 'NOT_NEEDED', scriptStatus: 'NOT_NEEDED', ...over }, []),
    planId: 'p1',
    storeName: 'ClubClio_TikTok',
    month: '2026/10',
  });
  const link = 'https://www.tiktok.com/@a/video/1234567890';
  const jobs: SelfProgressJob[] = [
    mk('SC-01', { productName: '', angle: '', ctvConfirmStatus: 'CONFIRMED' }), // Brief
    mk('SC-02', { scriptStatus: 'DRAFT', ctvConfirmStatus: 'ASSIGNED' }), // Kịch bản, CTV chưa nhận
    mk('SC-03', { videoQaStatus: 'DRAFT_SUBMITTED', ctvConfirmStatus: 'CONFIRMED' }), // Quay, QA, chờ QA
    mk('SC-04', { videoQaStatus: 'INTERNAL_QA_PASSED', deadline: '2026-10-20', ctvConfirmStatus: 'CONFIRMED' }), // Duyệt, đăng, quá hạn
    mk('SC-05', { videoQaStatus: 'INTERNAL_QA_PASSED', airLink: link, airedAt: '2026-10-10', ctvConfirmStatus: 'CONFIRMED' }), // Nghiệm thu
    mk('SC-06', { videoQaStatus: 'INTERNAL_QA_PASSED', airLink: link, airedAt: '2026-10-10', acceptanceStatus: 'PASSED', paymentStatus: 'PAID', ctvConfirmStatus: 'CONFIRMED' }), // Chờ thanh toán / đã chi
    mk('SC-07', { lifecycleStatus: 'CANCELLED' }),
  ];
  const p = computeSelfWorkProgress({ plans, jobs, month: '2026/10', today: '2026-10-30', nowMs: Date.parse('2026-10-30T00:00:00Z') });
  assert.equal(p.stores.length, 1);
  const s = p.stores[0];
  assert.equal(s.jobs, 6); // việc hủy không tính
  assert.equal(s.notAssigned, 2); // chỉ tiêu 8, đã giao 6
  assert.deepEqual(s.byStage, { BRIEF: 1, SCRIPT: 1, PRODUCTION: 1, BRAND_AIR: 1, ACCEPTANCE: 1, SETTLEMENT: 1 });
  assert.equal(s.aired, 2);
  assert.equal(s.accepted, 1);
  assert.equal(s.paid, 1);
  assert.equal(s.overdue, 1);
  assert.equal(s.qaWaiting, 1);
  assert.equal(s.ctvPending, 1);
  assert.equal(s.airRate, 25); // 2/8
  assert.equal(p.totals.planQty, 8);
  assert.equal(p.ctvs.length, 1);
  assert.equal(p.ctvs[0].jobs, 6);
  assert.equal(p.pics[0].name, 'Nguyễn Văn A');
  // chỉ tiêu 0 và không có việc thì không hiện; lọc nhân sự không khớp thì rỗng
  assert.equal(computeSelfWorkProgress({ plans: [{ ...plans[0], targetQty: 0 }], jobs: [], month: '2026/10', today: '2026-10-30', nowMs: 0 }).stores.length, 0);
  assert.equal(computeSelfWorkProgress({ plans, jobs, month: '2026/10', pic: 'Người khác', today: '2026-10-30', nowMs: 0 }).stores.length, 0);
});
