// QA: kiểm thử luồng Content kênh Brand từ đầu đến cuối bằng cách gọi các API thật của app
// (kế hoạch → giao việc → CTV nhận việc → nộp bài → nghiệm thu → phiếu thanh toán → duyệt → báo cáo).
// Dữ liệu ghi vào thư mục tạm, mạng ngoài bị chặn (xem helpers/fullFlowHarness.ts).
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  api, assertBlocked, assertOk, booking, call, director, draftPlan, finance, leader, outsider, req, storeById, STORE_TIKTOK, withBreakdown,
} from './helpers/fullFlowHarness';
import { GET as boardGet, PUT as boardPut } from '../src/app/api/self-channel-board/route';
import { POST as contentCheckPost } from '../src/app/api/self-channel-board/content-check/route';
import { POST as airCheckPost } from '../src/app/api/self-channel-board/air-check/route';
import { GET as airReportGet } from '../src/app/api/self-channel-board/air-report/route';
import { GET as portalGet, POST as portalPost } from '../src/app/api/self-channel-portal/route';
import { GET as slipGet, PATCH as slipPatch, POST as slipPost } from '../src/app/api/integrations/larkbase/payment-requests/route';
import { POST as settlementPost } from '../src/app/api/self-channel-settlement/route';
import { GET as planActualGet } from '../src/app/api/plan-actual-report/route';
import { handleCtvZaloMessage } from '../src/lib/server/zaloCtvCommands';
import { readRecord, updateRecord } from '../src/lib/server/sharedRecords';
import { selfChannelBoardKey } from '../src/lib/server/boardKeys';
import {
  EMPTY_SELF_CHANNEL_BOARD, createSelfChannelJob, sanitizeSelfChannelBoard,
  type SelfChannelBoardData, type SelfChannelJob,
} from '../src/lib/selfChannelBoardRules';
import { EMPTY_CTV_DIRECTORY, type CtvDirectoryData } from '../src/lib/ctvDirectory';
import { buildSelfChannelPaymentSlip } from '../src/lib/selfChannelPaymentSlip';
import { computeSelfAirPlanSummary } from '../src/lib/selfChannelAirPlanReport';
import { computeSelfWorkProgress } from '../src/lib/selfChannelWorkProgress';
import type { Contributor, InputPlanBreakdownState, UserProfile } from '../src/lib/types';

const MONTH = '2026/12';
// Cổng CTV chỉ hiện việc của tháng này và tháng trước: giả lập "hôm nay" là giữa tháng 12 để việc của kế hoạch 2026/12 hiện ra
const realNow = Date.now;
let clock = Date.parse('2026-12-15T05:00:00Z');
Date.now = () => (clock += 1); // tiến từng mili giây để mã sinh theo thời gian không trùng
after(() => {
  Date.now = realNow;
});
const AIR_1 = 'https://www.tiktok.com/@rejuran.vn/video/7300000000000000001';
const AIR_2 = 'https://www.tiktok.com/@rejuran.vn/video/7300000000000000002';

const ctvUser = (linkedEntityId: string): UserProfile =>
  ({ ...booking, id: `partner-${linkedEntityId}`, name: `CTV ${linkedEntityId}`, role: 'CTV_PARTNER', partnerType: 'CTV', linkedEntityId } as UserProfile);
const CTV_A = ctvUser('ctv-qa-1');
const CTV_B = ctvUser('ctv-qa-2');

const state = {
  plan: null as unknown as InputPlanBreakdownState,
  jobs: {} as Record<'j1' | 'j2' | 'j3', SelfChannelJob>,
};

const ctvRecord = (over: Partial<Contributor> = {}): Contributor =>
  ({
    id: 'ctv-qa-1', code: 'CTVQA1', name: 'CTV QA Một', phone: '0900000001', zaloUserId: 'zalo-qa-1',
    cccd: '001199012345', bankName: 'Techcombank', bankAccount: '19036829104018', bankAccountName: 'NGUYEN VAN QA',
    ...over,
  }) as Contributor;

const ctv2 = () => ctvRecord({ id: 'ctv-qa-2', code: 'CTVQA2', name: 'CTV QA Hai', zaloUserId: 'zalo-qa-2' });
async function setDirectory(contributors: Contributor[]) {
  const rec = await readRecord<CtvDirectoryData>('ctv-directory-v1', EMPTY_CTV_DIRECTORY);
  await updateRecord<CtvDirectoryData>('ctv-directory-v1', EMPTY_CTV_DIRECTORY, rec.revision, prev => ({ ...EMPTY_CTV_DIRECTORY, ...prev, contributors }));
}
async function readBoard(): Promise<{ data: SelfChannelBoardData; revision: number }> {
  const r = await call(boardGet(req(`/api/self-channel-board?planId=${encodeURIComponent(state.plan.id)}`, 'GET', booking)));
  assertOk(r, 'Đọc bảng Content kênh');
  return { data: sanitizeSelfChannelBoard(r.body.data), revision: r.body.revision };
}
async function putBoard(actor: UserProfile, mutate: (jobs: SelfChannelJob[]) => SelfChannelJob[], revision?: number) {
  const cur = await readBoard();
  return call(boardPut(req('/api/self-channel-board', 'PUT', actor, { planId: state.plan.id, revision: revision ?? cur.revision, data: { jobs: mutate(cur.data.jobs), settlementBatches: cur.data.settlementBatches } })));
}
/** Ghi thẳng vào máy chủ những trường chỉ máy chủ được ghi (mô phỏng kết quả kiểm link đăng). */
async function serverPatch(code: string, patch: Partial<SelfChannelJob>) {
  const rec = await readRecord<SelfChannelBoardData>(selfChannelBoardKey(state.plan.id), EMPTY_SELF_CHANNEL_BOARD);
  await updateRecord<SelfChannelBoardData>(selfChannelBoardKey(state.plan.id), EMPTY_SELF_CHANNEL_BOARD, rec.revision, prev => {
    const b = sanitizeSelfChannelBoard(prev);
    return { ...b, jobs: b.jobs.map(j => (j.code === code ? { ...j, ...patch } : j)) };
  });
}
const jobOf = async (code: string) => (await readBoard()).data.jobs.find(j => j.code === code)!;
const passCheck = (link: string): SelfChannelJob['airCheck'] => ({ verdict: 'PASS', checkedAt: new Date().toISOString(), checkedBy: 'QA', checkedLink: link, platform: 'tiktok', authorHandle: 'rejuran.vn', expectedHandle: 'rejuran.vn', publishedAt: null, views: 1200, coverUrl: null, issues: [] });
const portal = (actor: UserProfile | null, body?: unknown) =>
  call(body === undefined ? portalGet(req('/api/self-channel-portal', 'GET', actor)) : portalPost(req('/api/self-channel-portal', 'POST', actor, body)));
/** Cổng CTV từ chối bằng mã 400 và trường `message`. */
const blockedMsg = (r: { status: number; body: { message?: string; error?: string } }, why: string, re?: RegExp) => {
  assert.equal(r.status, 400, `${why} — phải 400, nhận ${r.status}: ${JSON.stringify(r.body)}`);
  if (re) assert.match(String(r.body.message ?? r.body.error), re, why);
};
const slipPost$ = (actor: UserProfile, body: unknown) => call(slipPost(req('/api/integrations/larkbase/payment-requests', 'POST', actor, body)));
const slipPatch$ = (actor: UserProfile, body: unknown) => call(slipPatch(req('/api/integrations/larkbase/payment-requests', 'PATCH', actor, body)));
const slipsOf = async (actor: UserProfile) => {
  const r = await call(slipGet(req('/api/integrations/larkbase/payment-requests', 'GET', actor)));
  assertOk(r, 'Đọc sổ phiếu');
  return r.body.slips as Array<{ slipCode: string; id: string; larkPaymentCategory?: string; selfJobRefs?: Array<{ planId: string; jobId: string }>; totals: { grossTotal: number; pitTax10PctTotal: number; netTransferTotal: number }; larkSync: { approvalStatus: string; uncBillCode?: string } }>;
};

test('QA-00 Chuẩn bị: kế hoạch đã duyệt có chỉ tiêu Content kênh, danh bạ CTV', async () => {
  const store = await storeById(STORE_TIKTOK);
  const draft = draftPlan(store, MONTH);
  draft.reference41 = { ...draft.reference41!, selfVideos: 8, selfCostNet: 6_400_000, selfCostGross: 7_111_111 };
  const created = await api.createPlan(director, draft);
  assertOk(created, 'Tạo kế hoạch');
  let ctx = { plan: created.body.plan as InputPlanBreakdownState, revision: created.body.revision as number };
  const step = async (actor: UserProfile, patch: Partial<InputPlanBreakdownState>, why: string) => {
    const r = await api.putPlan(actor, { ...ctx.plan, ...patch }, ctx.revision);
    assertOk(r, why);
    ctx = { plan: r.body.plan, revision: r.body.revision };
  };
  await step(booking, withBreakdown(ctx.plan), 'Lưu phân rã');
  await step(booking, { status: 'PENDING_PRE_APPROVAL' }, 'Gửi duyệt');
  await step(leader, { status: 'PENDING_APPROVAL', leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' }, 'Leader sơ duyệt');
  await step(director, { status: 'IN_EXECUTION', isVersionLocked: true }, 'Giám đốc duyệt');
  state.plan = ctx.plan;
  await setDirectory([ctvRecord(), ctvRecord({ id: 'ctv-qa-2', code: 'CTVQA2', name: 'CTV QA Hai', zaloUserId: 'zalo-qa-2' })]);
  const all = await call(boardGet(req('/api/self-channel-board?all=1', 'GET', booking)));
  assertOk(all, 'Gom việc mọi kế hoạch');
  const planRow = (all.body.plans as Array<{ planId: string; targetQty: number }>).find(p => p.planId === state.plan.id);
  assert.ok(planRow, 'Kế hoạch có chỉ tiêu Content kênh phải hiện ở tổng quan');
  assert.equal(planRow!.targetQty, 8, 'Chỉ tiêu video Content kênh lấy từ kế hoạch');
});

test('QA-01 PIC tạo việc: CTV từ danh bạ chờ nhận việc; tên gõ tay thì không có cổng nhận việc', async () => {
  const mk = (code: string, over: Partial<SelfChannelJob>) =>
    createSelfChannelJob({ code, productName: 'Kem phục hồi', angle: 'Nỗi đau', pillar: 'Nỗi đau - Giải pháp', week: 'W1', sampleStatus: 'NOT_NEEDED', scriptStatus: 'NOT_NEEDED', contentPic: booking.name, deadline: '2026-12-25', publishPlatform: 'TIKTOK_BRAND', ...over }, []);
  const jobs = [
    mk('SC-01', { contributorId: 'ctv-qa-1', contributorName: 'CTV QA Một', feeGross: 3_000_000 }),
    mk('SC-02', { contributorId: 'ctv-qa-1', contributorName: 'CTV QA Một', feeGross: 12_000_000 }),
    mk('SC-03', { contributorName: 'Gõ tay', feeGross: 800_000 }),
  ];
  const r = await putBoard(booking, () => jobs);
  assertOk(r, 'PIC lưu bảng việc');
  const b = await readBoard();
  assert.equal(b.data.jobs.length, 3);
  assert.equal(b.data.jobs.find(j => j.code === 'SC-01')!.ctvConfirmStatus, 'ASSIGNED');
  assert.equal(b.data.jobs.find(j => j.code === 'SC-03')!.ctvConfirmStatus, undefined);
  state.jobs = { j1: b.data.jobs[0], j2: b.data.jobs[1], j3: b.data.jobs[2] };
});

test('QA-02 Phân quyền và chống sửa sai: PIC không tự đánh dấu CTV đã nhận; sai phiên bản bị từ chối', async () => {
  const forged = await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-01' ? { ...j, ctvConfirmStatus: 'CONFIRMED' as const } : j)));
  assertOk(forged, 'Lưu');
  assert.equal((await jobOf('SC-01')).ctvConfirmStatus, 'ASSIGNED', 'PIC không được tự đặt trạng thái CTV đã nhận');
  const stale = await putBoard(booking, jobs => jobs, 1);
  assertBlocked(stale, 'Lưu với phiên bản cũ', undefined, 409);
  // Môi trường thử tự đăng nhập tài khoản mẫu; môi trường thật (production) phải chặn người chưa đăng nhập
  const envBefore = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = 'production';
  try {
    const anon = await call(boardGet(req(`/api/self-channel-board?planId=${state.plan.id}`, 'GET', null)));
    assertBlocked(anon, 'Không đăng nhập (production)');
  } finally {
    (process.env as Record<string, string>).NODE_ENV = envBefore as string;
  }
});

test('QA-03 Cổng CTV: chỉ thấy việc của mình, hồ sơ được che, tài khoản nội bộ bị từ chối', async () => {
  const a = await portal(CTV_A);
  assertOk(a, 'CTV A xem việc');
  const codes = (a.body.jobs as Array<{ code: string }>).map(j => j.code).sort();
  assert.deepEqual(codes, ['SC-01', 'SC-02'], 'Việc gõ tay tên không có mã danh bạ không hiện trên cổng (đã cảnh báo cho PIC)');
  assert.ok((a.body.jobs as Array<{ nextStep: string }>).every(j => j.nextStep === 'Xác nhận nhận việc'));
  assert.match(a.body.profile.legalMasked, /^\*{4}\d{4}$/, 'CCCD phải che, chỉ hiện 4 số cuối');
  assert.match(a.body.profile.bankMasked, /^\*{4}\d{4}$/);
  const b = await portal(CTV_B);
  assertOk(b, 'CTV B xem việc');
  assert.equal(b.body.jobs.length, 0, 'CTV B không thấy việc của CTV A');
  assertBlocked(await portal(booking), 'Tài khoản nội bộ dùng cổng CTV', undefined, 403);
  const envBefore = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = 'production';
  try {
    assertBlocked(await portal(null), 'Chưa đăng nhập (production)');
  } finally {
    (process.env as Record<string, string>).NODE_ENV = envBefore as string;
  }
});

test('QA-04 CTV chưa nhận việc thì không nộp được bài; nhận / từ chối đúng quy tắc', async () => {
  const early = await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'DRAFT', link: 'https://drive.google.com/file/d/abc' });
  blockedMsg(early, 'Nộp video khi chưa nhận việc', /xác nhận nhận việc/i);
  const noReason = await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-02', kind: 'DECLINE' });
  blockedMsg(noReason, 'Từ chối không ghi lý do', /lý do/i);
  const other = await portal(CTV_B, { planId: state.plan.id, jobCode: 'SC-01', kind: 'CONFIRM' });
  blockedMsg(other, 'CTV B nhận việc của CTV A');
  const ok = await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'CONFIRM' });
  assertOk(ok, 'CTV A nhận SC-01');
  assert.equal((await jobOf('SC-01')).ctvConfirmStatus, 'CONFIRMED');
  blockedMsg(await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'DECLINE', reason: 'Đổi ý' }), 'Đổi ý sau khi đã nhận', /đã được phản hồi/i);
});

test('QA-05 Zalo: CTV nhận việc bằng lệnh /nhan và xem việc bằng /viec', async () => {
  const list = await handleCtvZaloMessage({ senderId: 'zalo-qa-1', senderName: 'CTV', text: '/viec' });
  assert.ok(list && list.includes('SC-02') && list.includes('SC-01'));
  assert.ok(!list!.includes('SC-03'), 'Việc gõ tay không hiện cho CTV');
  const accept = await handleCtvZaloMessage({ senderId: 'zalo-qa-1', senderName: 'CTV', text: '/nhan SC-02' });
  assert.match(accept!, /Đã nhận việc SC-02/);
  assert.equal((await jobOf('SC-02')).ctvConfirmStatus, 'CONFIRMED');
  const wrong = await handleCtvZaloMessage({ senderId: 'zalo-qa-2', senderName: 'CTV2', text: '/nhan SC-01' });
  assert.match(wrong!, /Không thấy việc/);
  assert.equal(await handleCtvZaloMessage({ senderId: 'zalo-lạ', senderName: 'Lạ', text: '/viec' }), null, 'Người lạ không phải CTV: bot không trả lời');
});

test('QA-06 CTV nộp video nháp, PIC duyệt QA, CTV gửi link đăng (kiểm link lỗi mạng không làm sập)', async () => {
  const draft = await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'DRAFT', link: 'https://drive.google.com/file/d/qa1' });
  assertOk(draft, 'CTV nộp video nháp');
  assert.equal((await jobOf('SC-01')).videoQaStatus, 'DRAFT_SUBMITTED');
  blockedMsg(await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'AIR', link: AIR_1 }), 'Gửi link đăng khi video chưa qua QA', /chưa qua QA/i);
  assertOk(await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-01' ? { ...j, videoQaStatus: 'INTERNAL_QA_PASSED' as const, qaReviewedBy: booking.name } : j))), 'PIC duyệt QA');
  const air = await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'AIR', link: AIR_1 });
  assertOk(air, 'CTV gửi link đăng');
  assert.equal((await jobOf('SC-01')).airLink, AIR_1);
  blockedMsg(await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-01', kind: 'AIR', link: 'khong-phai-link' }), 'Link không hợp lệ', /không hợp lệ/i);
});

test('QA-07 Nghiệm thu: không giả được kết quả kiểm link; nội dung không đạt thì phải ghi lý do', async () => {
  const noCheck = await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-01' ? { ...j, airedAt: '2026-12-10', acceptanceStatus: 'PASSED' as const, airCheck: passCheck(AIR_1) } : j)));
  assertBlocked(noCheck, 'Nghiệm thu khi máy chủ chưa kiểm link (airCheck do client gửi phải bị bỏ qua)', /Không thể nghiệm thu/);
  await serverPatch('SC-01', { airCheck: passCheck(AIR_1), contentCheck: { verdict: 'FAIL', checkedAt: new Date().toISOString(), checkedBy: 'QA', checkedLink: AIR_1, source: 'RULES', items: [{ key: 'forbidden', label: 'Từ cấm', status: 'FAIL', detail: 'Có từ cấm' }] } });
  const failBlocked = await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-01' ? { ...j, airedAt: '2026-12-10', acceptanceStatus: 'PASSED' as const } : j)));
  assertBlocked(failBlocked, 'Đối chiếu nội dung FAIL mà không ghi lý do', /Đối chiếu nội dung/);
  const okWithNote = await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-01' ? { ...j, airedAt: '2026-12-10', acceptanceStatus: 'PASSED' as const, acceptanceNote: 'Brand đồng ý bản này' } : j)));
  assertOk(okWithNote, 'Nghiệm thu có ghi chú');
  const j1 = await jobOf('SC-01');
  assert.equal(j1.acceptanceStatus, 'PASSED');
  assert.ok(j1.contentCheck, 'Kết quả đối chiếu do máy chủ ghi phải được giữ nguyên');
});

test('QA-08 Đối chiếu nội dung và kiểm link: lỗi mạng trả lỗi rõ ràng, không sập (500)', async () => {
  const cc = await call(contentCheckPost(req('/api/self-channel-board/content-check', 'POST', booking, { planId: state.plan.id, jobId: state.jobs.j1.id })));
  assert.ok(cc.status >= 400 && cc.status < 500, `content-check khi không đọc được bài phải 4xx, nhận ${cc.status}: ${JSON.stringify(cc.body).slice(0, 200)}`);
  const ac = await call(airCheckPost(req('/api/self-channel-board/air-check', 'POST', booking, { planId: state.plan.id, jobId: state.jobs.j1.id })));
  assert.ok(ac.status < 500 || ac.status === 502, `air-check lỗi mạng phải được xử lý, nhận ${ac.status}`);
  assertBlocked(await call(contentCheckPost(req('/api/self-channel-board/content-check', 'POST', booking, { planId: state.plan.id }))), 'Thiếu mã việc', undefined, 400);
  assertBlocked(await call(contentCheckPost(req('/api/self-channel-board/content-check', 'POST', CTV_A, { planId: state.plan.id, jobId: state.jobs.j1.id }))), 'CTV gọi đối chiếu nội dung');
});

test('QA-09 Phiếu thanh toán một video: tính thuế, ghi sổ chung, đồng bộ về việc', async () => {
  const r = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j1.id });
  assert.equal(r.status, 201, `Lập phiếu: ${JSON.stringify(r.body).slice(0, 400)}`);
  const slip = r.body.slip;
  assert.equal(slip.larkPaymentCategory, 'Thanh toán CTV Content kênh');
  assert.equal(slip.totals.grossTotal, 3_000_000);
  assert.equal(slip.totals.pitTax10PctTotal, 300_000, 'Thuế TNCN 10% với video 3.000.000đ');
  assert.equal(slip.totals.netTransferTotal, 2_700_000);
  assert.deepEqual(slip.selfJobRefs, [{ planId: state.plan.id, jobId: state.jobs.j1.id }]);
  const j1 = await jobOf('SC-01');
  assert.equal(j1.paymentStatus, 'REQUESTED');
  assert.equal(j1.dnttSlipCode, slip.slipCode);
  assert.equal(j1.netPayout, 2_700_000);
  assertBlocked(await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j1.id }), 'Lập phiếu lần hai cho cùng video', undefined, 409);
  assertBlocked(await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id }), 'Thiếu mã việc', undefined, 400);
  assertBlocked(await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: 'khong-ton-tai' }), 'Việc không tồn tại', undefined, 404);
  assertBlocked(await slipPost$(CTV_A, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j2.id }), 'CTV tự lập phiếu cho mình');
});

test('QA-10 Hợp đồng theo từng video: từ 10tr phải có hợp đồng CTV còn hiệu lực trong danh bạ', async () => {
  await serverPatch('SC-02', { acceptanceStatus: 'PASSED', airLink: AIR_2, airedAt: '2026-12-12', airCheck: passCheck(AIR_2), videoQaStatus: 'INTERNAL_QA_PASSED' });
  const noContract = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j2.id });
  assertBlocked(noContract, 'Video 12tr chưa có hợp đồng', undefined, 422);
  assert.ok((noContract.body.issues as Array<{ issue: { code: string } }>).some(i => i.issue.code === 'MISSING_SIGNED_CONTRACT'));
  await setDirectory([ctvRecord({ contractCode: 'HDCTV-01', contractStatus: 'ACTIVE', contractExpiryDate: '2020-01-01' }), ctv2()]);
  const expired = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j2.id });
  assert.ok((expired.body.issues as Array<{ issue: { code: string } }> | undefined)?.some(i => i.issue.code === 'CONTRACT_NOT_ACTIVE'), 'Hợp đồng hết hạn phải bị chặn');
  // Danh bạ là nguồn gốc: đổi ngân hàng trong danh bạ thì phiếu lấy số mới, không dùng bản chép cũ trên việc
  await setDirectory([ctvRecord({ contractCode: 'HDCTV-01', contractStatus: 'ACTIVE', contractExpiryDate: '2099-01-01', bankAccount: '99998888777766' }), ctv2()]);
  const ok = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j2.id });
  assert.equal(ok.status, 201, JSON.stringify(ok.body).slice(0, 300));
  assert.equal(ok.body.slip.payee.bankAccount, '99998888777766', 'Phiếu phải dùng tài khoản trong danh bạ CTV');
  assert.equal(ok.body.slip.totals.pitTax10PctTotal, 1_200_000);
});

test('QA-11 Luồng duyệt dùng chung với Booking: đúng người đúng bước, đi tiền kèm UNC, trạng thái về việc', async () => {
  const slips = await slipsOf(director);
  const s1 = slips.find(s => s.selfJobRefs?.[0]?.jobId === state.jobs.j1.id)!;
  assert.ok(s1, 'Phiếu Content kênh phải nằm trong sổ phiếu chung');
  assert.equal(s1.larkSync.approvalStatus, 'PENDING_LEADER', 'Gian Rejuran có Trưởng nhóm sơ duyệt');
  assertBlocked(await slipPatch$(booking, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Chuyên viên tự duyệt bước Trưởng nhóm', undefined, 403);
  assertOk(await slipPatch$(leader, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Leader duyệt');
  assertBlocked(await slipPatch$(finance, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Kế toán duyệt bước Giám đốc', undefined, 403);
  assertOk(await slipPatch$(director, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Giám đốc duyệt');
  assertOk(await slipPatch$(finance, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Kế toán duyệt');
  assert.equal((await jobOf('SC-01')).paymentStatus, 'REQUESTED', 'Chưa đi tiền thì việc chưa Đã thanh toán');
  assertOk(await slipPatch$(finance, { slipId: s1.id, action: 'ADVANCE_STEP', uncBillCode: 'UNC-QA-0001' }), 'Kế toán xác nhận đã đi tiền');
  const j1 = await jobOf('SC-01');
  assert.equal(j1.paymentStatus, 'PAID');
  assert.equal(j1.uncRef, 'UNC-QA-0001');
  assert.ok(j1.paidAt);
  assertBlocked(await slipPatch$(finance, { slipId: s1.id, action: 'ADVANCE_STEP' }), 'Duyệt tiếp phiếu đã đi tiền', undefined, 409);
});

test('QA-12 Lark từ chối phiếu: việc được mở khóa và lập lại được', async () => {
  const slips = await slipsOf(director);
  const s2 = slips.find(s => s.selfJobRefs?.[0]?.jobId === state.jobs.j2.id)!;
  assertOk(await slipPatch$(finance, { slipId: s2.id, action: 'REJECT_SLIP', rejectedReason: 'Sai tài khoản' }), 'Từ chối phiếu');
  const j2 = await jobOf('SC-02');
  assert.equal(j2.paymentStatus, 'NONE', 'Phiếu bị từ chối: việc trở lại chưa thanh toán');
  assert.equal(j2.dnttSlipCode, undefined);
  const again = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j2.id });
  assert.equal(again.status, 201, `Lập lại sau khi bị từ chối: ${JSON.stringify(again.body).slice(0, 300)}`);
});

test('QA-13 Sổ phiếu: tài khoản đối tác không xem được; phiếu Content kênh lọc được theo loại', async () => {
  assertBlocked(await call(slipGet(req('/api/integrations/larkbase/payment-requests', 'GET', CTV_A))), 'CTV xem sổ phiếu nội bộ', undefined, 403);
  const slips = await slipsOf(finance);
  const selfSlips = slips.filter(s => s.larkPaymentCategory === 'Thanh toán CTV Content kênh');
  assert.ok(selfSlips.length >= 3, `Cần thấy đủ phiếu Content kênh trong sổ chung, thấy ${selfSlips.length}`);
});

test('QA-14 Thanh toán tháng cũ đã đóng: không lập đợt quyết toán tháng mới', async () => {
  const r = await call(settlementPost(req('/api/self-channel-settlement', 'POST', director, { op: 'create', month: MONTH, contributorId: 'ctv-qa-1' })));
  assert.equal(r.status, 410, JSON.stringify(r.body));
});

test('QA-15 Báo cáo: kế hoạch so thực tế, báo cáo air, tiến độ khớp với dữ liệu việc thật', async () => {
  const all = await call(boardGet(req('/api/self-channel-board?all=1', 'GET', booking)));
  assertOk(all, 'Gom việc');
  const plans = all.body.plans, jobs = all.body.jobs;
  const mine = (jobs as Array<{ planId: string }>).filter(j => j.planId === state.plan.id);
  assert.equal(mine.length, 3);
  // Kế hoạch so thực tế (báo cáo có sẵn)
  const pa = await call(planActualGet(req(`/api/plan-actual-report?month=${encodeURIComponent(MONTH)}`, 'GET', director)));
  assertOk(pa, 'Báo cáo kế hoạch so thực tế');
  const report = (pa.body.reports as Array<{ planId?: string; tiers?: Array<{ key: string; planQty: number; jobs: number; aired: number; accepted: number }> }>).find(r => r.planId === state.plan.id);
  assert.ok(report, 'Kế hoạch phải có trong báo cáo');
  const selfRow = report!.tiers!.find(t => t.key === 'SELF');
  assert.ok(selfRow, 'Báo cáo phải có dòng Self-channel');
  assert.equal(selfRow!.planQty, 8);
  assert.equal(selfRow!.jobs, 3);
  assert.equal(selfRow!.aired, 2, 'SC-01 và SC-02 đã có link đăng');
  assert.equal(selfRow!.accepted, 2);
  // Báo cáo kế hoạch so đã air (khối mới) phải ra cùng con số
  const sum = computeSelfAirPlanSummary({ plans, jobs, month: MONTH, today: '2026-12-30' });
  const row = sum.rows.find(r => r.planId === state.plan.id)!;
  assert.equal(row.planQty, 8);
  assert.equal(row.aired, selfRow!.aired, 'Hai báo cáo phải khớp số video đã air (RULE-SYNC-01)');
  assert.equal(row.accepted, selfRow!.accepted);
  assert.equal(row.gapQty, 6);
  assert.equal(row.airRate, 25);
  // Tiến độ làm việc
  const prog = computeSelfWorkProgress({ plans, jobs, month: MONTH, today: '2026-12-30', nowMs: Date.now() });
  const st = prog.stores.find(s => s.planId === state.plan.id)!;
  assert.equal(st.jobs, 3);
  assert.equal(st.notAssigned, 5);
  assert.equal(st.aired, 2);
  assert.equal(st.paid, 1);
  assert.equal(prog.totals.airRate, 25);
  // Báo cáo air theo tháng
  const ar = await call(airReportGet(req(`/api/self-channel-board/air-report?month=${encodeURIComponent(MONTH)}`, 'GET', director)));
  assertOk(ar, 'Báo cáo air');
  assert.equal(ar.body.dw.configured, false, 'Chưa cấu hình Data Warehouse thì phải báo rõ, không điền số giả');
  const rows = (ar.body.rows as Array<{ code: string; videoId: string | null; dw: unknown }>).filter(r => ['SC-01', 'SC-02'].includes(r.code));
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.dw === null), 'Không có số Data Warehouse thì để trống');
  assert.deepEqual(rows.map(r => r.videoId).sort(), ['7300000000000000001', '7300000000000000002']);
});


// ───────────────────────── Kiểm thử thăm dò: tìm lỗi ngoài đường đi đúng ─────────────────────────
const AIR = (n: number) => `https://www.tiktok.com/@rejuran.vn/video/73000000000000001${String(n).padStart(2, '0')}`;
const ctvUserOf = (id: string) => (id === 'ctv-qa-2' ? CTV_B : CTV_A);

/** Dựng một video đủ điều kiện lập phiếu: CTV nhận việc, đã đăng, nghiệm thu Đạt (máy chủ ghi kết quả kiểm link). */
async function eligibleJob(code: string, ctvId: string, fee: number, n: number) {
  const job = createSelfChannelJob({
    code, productName: 'Kem phục hồi', angle: 'Nỗi đau', pillar: 'Nỗi đau - Giải pháp', week: 'W2', sampleStatus: 'NOT_NEEDED', scriptStatus: 'NOT_NEEDED',
    contentPic: booking.name, deadline: '2026-12-26', contributorId: ctvId, contributorName: ctvId === 'ctv-qa-2' ? 'CTV QA Hai' : 'CTV QA Một',
    feeGross: fee, videoQaStatus: 'INTERNAL_QA_PASSED', airLink: AIR(n), airedAt: '2026-12-11',
  }, []);
  assertOk(await putBoard(booking, jobs => [...jobs, job]), `Thêm việc ${code}`);
  assertOk(await portal(ctvUserOf(ctvId), { planId: state.plan.id, jobCode: code, kind: 'CONFIRM' }), `CTV nhận ${code}`);
  await serverPatch(code, { acceptanceStatus: 'PASSED', airCheck: passCheck(AIR(n)) });
  return jobOf(code);
}

test('QA-16 Bảo mật: CTV và người ngoài gian không xem được dữ liệu gian khác, không lập phiếu, không sửa bảng', async () => {
  const store = await storeById(STORE_TIKTOK);
  const stranger = await outsider(store);
  const leaks: string[] = [];
  for (const [why, r] of [
    ['CTV xem gom việc mọi gian', await call(boardGet(req('/api/self-channel-board?all=1', 'GET', CTV_A)))],
    ['CTV xem báo cáo air', await call(airReportGet(req(`/api/self-channel-board/air-report?month=${encodeURIComponent(MONTH)}`, 'GET', CTV_A)))],
    ['CTV xem kế hoạch so thực tế', await call(planActualGet(req(`/api/plan-actual-report?month=${encodeURIComponent(MONTH)}`, 'GET', CTV_A)))],
    ['CTV đọc bảng việc của gian', await call(boardGet(req(`/api/self-channel-board?planId=${state.plan.id}`, 'GET', CTV_A)))],
  ] as Array<[string, { status: number; body: any }]>) {
    const empty = r.status >= 400 || (Array.isArray(r.body.jobs) && r.body.jobs.length === 0) || (Array.isArray(r.body.rows) && r.body.rows.length === 0) || (Array.isArray(r.body.reports) && r.body.reports.length === 0) || (r.body.data && Array.isArray(r.body.data.jobs) && r.body.data.jobs.length === 0);
    if (!empty) leaks.push(`${why}: trả ${r.status} có dữ liệu`);
  }
  assert.deepEqual(leaks, [], 'Tài khoản CTV không được thấy dữ liệu nội bộ của gian');
  assertBlocked(await putBoard(stranger, jobs => jobs), 'Người ngoài gian sửa bảng việc', undefined, 403);
  assertBlocked(await slipPost$(stranger, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: state.jobs.j1.id }), 'Người ngoài gian lập phiếu');
  assertBlocked(await call(contentCheckPost(req('/api/self-channel-board/content-check', 'POST', stranger, { planId: state.plan.id, jobId: state.jobs.j1.id }))), 'Người ngoài gian đối chiếu nội dung');
});

test('QA-17 Môi trường thật chưa cấu hình Lark: không giả lập thành công, việc không bị đánh dấu đã lập phiếu', async () => {
  await eligibleJob('SC-05', 'ctv-qa-1', 3_000_000, 5);
  const envBefore = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = 'production';
  let r;
  try {
    r = await slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: (await jobOf('SC-05')).id });
  } finally {
    (process.env as Record<string, string>).NODE_ENV = envBefore as string;
  }
  assert.ok(r.status === 503 || r.status === 401, `Production thiếu cấu hình Lark phải 503, nhận ${r.status}: ${JSON.stringify(r.body).slice(0, 200)}`);
  assert.equal((await jobOf('SC-05')).paymentStatus, 'NONE', 'Phiếu chưa gửi được thì việc phải giữ nguyên');
});

test('QA-18 Hai người bấm lập phiếu cùng lúc: chỉ một phiếu được tạo', async () => {
  const id = (await jobOf('SC-05')).id;
  const results = await Promise.all([
    slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: id }),
    slipPost$(booking, { source: 'SELF_CHANNEL', planId: state.plan.id, jobId: id }),
  ]);
  const created = results.filter(r => r.status === 201).length;
  const slips = (await slipsOf(finance)).filter(x => x.selfJobRefs?.[0]?.jobId === id && x.larkSync.approvalStatus !== 'REJECTED');
  assert.equal(slips.length, 1, `Chỉ được có 1 phiếu cho một video, thấy ${slips.length} (201: ${created}, mã: ${results.map(r => r.status).join(',')})`);
});

test('QA-19 CTV từ chối: không lập phiếu được; PIC giao lại thì CTV mới phải nhận lại', async () => {
  const job = createSelfChannelJob({
    code: 'SC-06', productName: 'Kem', angle: 'a', sampleStatus: 'NOT_NEEDED', scriptStatus: 'NOT_NEEDED', contentPic: booking.name,
    contributorId: 'ctv-qa-1', contributorName: 'CTV QA Một', feeGross: 900_000, deadline: '2026-12-27',
  }, []);
  assertOk(await putBoard(booking, jobs => [...jobs, job]), 'Thêm SC-06');
  assertOk(await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-06', kind: 'DECLINE', reason: 'Bận lịch quay' }), 'CTV từ chối');
  const declined = await jobOf('SC-06');
  assert.equal(declined.ctvConfirmStatus, 'DECLINED');
  assert.equal(declined.ctvDeclineReason, 'Bận lịch quay');
  assertBlocked(await portal(CTV_A, { planId: state.plan.id, jobCode: 'SC-06', kind: 'DRAFT', link: 'https://drive.google.com/file/d/x' }).then(r => ({ ...r, body: { error: r.body.message } })), 'CTV nộp bài việc đã từ chối', /từ chối/i);
  // PIC giao lại cho CTV khác
  assertOk(await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-06' ? { ...j, contributorId: 'ctv-qa-2', contributorName: 'CTV QA Hai' } : j))), 'PIC giao lại');
  const reassigned = await jobOf('SC-06');
  assert.equal(reassigned.ctvConfirmStatus, 'ASSIGNED', 'Giao lại thì CTV mới phải nhận việc');
  assert.equal(reassigned.ctvDeclineReason, undefined);
  assert.ok(!(await portal(CTV_A)).body.jobs.some((j: { code: string }) => j.code === 'SC-06'), 'CTV cũ không còn thấy việc');
  assert.ok((await portal(CTV_B)).body.jobs.some((j: { code: string }) => j.code === 'SC-06'), 'CTV mới thấy việc');
  // Đổi CTV trên việc đã nhận cũng phải chờ nhận lại
  const sc05 = await jobOf('SC-05');
  assert.equal(sc05.ctvConfirmStatus, 'CONFIRMED');
  assertOk(await putBoard(booking, jobs => jobs.map(j => (j.code === 'SC-05' && j.paymentStatus === 'NONE' ? { ...j, contributorId: 'ctv-qa-2', contributorName: 'CTV QA Hai' } : j))), 'Đổi CTV việc đã lập phiếu');
});

test('QA-20 Việc đã có phiếu không xóa được khỏi bảng', async () => {
  const r = await putBoard(booking, jobs => jobs.filter(j => j.code !== 'SC-01'));
  assertBlocked(r, 'Xóa việc đã thanh toán', undefined, 409);
});

test('QA-21 Từ chối phiếu: chỉ người có quyền duyệt (Booking thường không được tự từ chối phiếu của người khác)', async () => {
  const slips = (await slipsOf(finance)).filter(x => x.larkSync.approvalStatus === 'PENDING_LEADER' || x.larkSync.approvalStatus === 'PENDING_DIRECTOR');
  assert.ok(slips.length > 0, 'Cần một phiếu đang chờ duyệt để thử');
  const stranger = await outsider(await storeById(STORE_TIKTOK));
  const r = await slipPatch$(stranger, { slipId: slips[0].id, action: 'REJECT_SLIP', rejectedReason: 'thử quyền' });
  assertBlocked(r, 'Chuyên viên không liên quan từ chối phiếu của người khác', undefined, 403);
  // Phiếu đã đi tiền không được từ chối lại (sẽ mở khóa việc đã thanh toán)
  const paid = (await slipsOf(finance)).find(x => x.larkSync.approvalStatus === 'PAID')!;
  assert.ok(paid, 'Cần một phiếu đã đi tiền');
  assertBlocked(await slipPatch$(finance, { slipId: paid.id, action: 'REJECT_SLIP', rejectedReason: 'thử' }), 'Từ chối phiếu đã đi tiền', undefined, 409);
  assert.equal((await jobOf('SC-01')).paymentStatus, 'PAID', 'Việc đã thanh toán phải giữ nguyên');
  // Người lập phiếu được thu hồi phiếu của mình khi chưa đi tiền
  assertOk(await slipPatch$(booking, { slipId: slips[0].id, action: 'REJECT_SLIP', rejectedReason: 'Người lập thu hồi' }), 'Người lập thu hồi phiếu');
});

test('QA-22 Ranh giới tiền: thuế từ 2.000.000đ, hợp đồng từ 10.000.000đ, BBNT từ 20.000.000đ, làm tròn', () => {
  const plan = { id: 'p', storeName: 'S_TikTok', brandName: 'B', month: MONTH };
  const ctv = ctvRecord();
  const slip = (fee: number) => buildSelfChannelPaymentSlip({
    plan, ctv,
    job: createSelfChannelJob({ code: 'SC-99', productName: 'x', contributorId: ctv.id, contributorName: ctv.name, ctvConfirmStatus: 'CONFIRMED', airLink: AIR_1, airedAt: '2026-12-10', acceptanceStatus: 'PASSED', feeGross: fee }, []),
  });
  assert.equal(slip(1_999_999).totals.pitTax10PctTotal, 0);
  assert.equal(slip(2_000_000).totals.pitTax10PctTotal, 200_000);
  const odd = slip(2_000_001);
  assert.equal(odd.totals.pitTax10PctTotal, 200_000);
  assert.equal(odd.totals.netTransferTotal, 1_800_001);
  assert.equal(odd.totals.grossTotal, odd.totals.pitTax10PctTotal + odd.totals.netTransferTotal, 'Gross = thuế + thực chuyển, không lệch 1đ');
  const has = (b: ReturnType<typeof slip>, code: string) => b.allIssues.some(i => i.issue.code === code);
  assert.equal(has(slip(9_999_999), 'MISSING_SIGNED_CONTRACT'), false);
  assert.equal(has(slip(10_000_000), 'MISSING_SIGNED_CONTRACT'), true);
  assert.equal(has(slip(19_999_999), 'MISSING_SIGNED_BBNT'), false);
  assert.equal(has(slip(20_000_000), 'MISSING_SIGNED_BBNT'), true);
  assert.equal(has(slip(0), 'FOC_ZERO_COST'), true);
  assert.equal(slip(Number.NaN).totals.grossTotal, 0, 'Thù lao NaN không được làm hỏng phiếu');
});

test('QA-23 Số liệu Data Warehouse: khớp theo video_id; lỗi hoặc chưa cấu hình thì báo rõ, không điền giả', async () => {
  const prevFetch = globalThis.fetch;
  const prevEnv = { b: process.env.DW_API_BASE_URL, t: process.env.DW_API_TOKEN };
  process.env.DW_API_BASE_URL = 'https://dw.qa.local/api';
  process.env.DW_API_TOKEN = 'qa-token';
  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://dw.qa.local/')) {
        return new Response(JSON.stringify({ rows: [{ video_id: '7300000000000000001', views_30d: 5400, orders_30d: 12, gmv_30d: 3600000, roi_30d: 2.4, likes: 300, synced_at: '2026-12-14T01:00:00Z' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return prevFetch(input, init);
    }) as typeof fetch;
    const ok = await call(airReportGet(req(`/api/self-channel-board/air-report?month=${encodeURIComponent(MONTH)}`, 'GET', director)));
    assertOk(ok, 'Báo cáo air có DW');
    assert.equal(ok.body.dw.configured, true);
    assert.equal(ok.body.dw.ok, true);
    assert.equal(ok.body.dw.matched, 1);
    const r1 = (ok.body.rows as Array<{ code: string; dw: { views30d: number; gmv30d: number; views14d: number | null } | null }>).find(r => r.code === 'SC-01')!;
    assert.equal(r1.dw!.views30d, 5400);
    assert.equal(r1.dw!.gmv30d, 3_600_000);
    assert.equal(r1.dw!.views14d, null, 'Cột DW không có thì để trống, không điền 0');
    assert.equal((ok.body.rows as Array<{ code: string; dw: unknown }>).find(r => r.code === 'SC-02')!.dw, null);

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://dw.qa.local/')) return new Response('boom', { status: 500 });
      return prevFetch(input, init);
    }) as typeof fetch;
    const bad = await call(airReportGet(req(`/api/self-channel-board/air-report?month=${encodeURIComponent(MONTH)}`, 'GET', director)));
    assertOk(bad, 'Báo cáo vẫn trả khi DW lỗi');
    assert.equal(bad.body.dw.ok, false);
    assert.match(String(bad.body.dw.error), /500/);
    assert.ok((bad.body.rows as Array<{ dw: unknown }>).every(r => r.dw === null));
  } finally {
    globalThis.fetch = prevFetch;
    if (prevEnv.b === undefined) delete process.env.DW_API_BASE_URL; else process.env.DW_API_BASE_URL = prevEnv.b;
    if (prevEnv.t === undefined) delete process.env.DW_API_TOKEN; else process.env.DW_API_TOKEN = prevEnv.t;
  }
});

test('QA-24 Zalo: lệnh thiếu thông tin, nhận hai lần, từ chối không lý do', async () => {
  assert.match((await handleCtvZaloMessage({ senderId: 'zalo-qa-1', senderName: 'C', text: '/nhan' }))!, /Cú pháp/);
  assert.match((await handleCtvZaloMessage({ senderId: 'zalo-qa-1', senderName: 'C', text: '/nhan SC-01' }))!, /đã được phản hồi/);
  assert.match((await handleCtvZaloMessage({ senderId: 'zalo-qa-2', senderName: 'C2', text: '/tuchoi SC-06' }))!, /lý do/i);
  assert.match((await handleCtvZaloMessage({ senderId: 'zalo-qa-2', senderName: 'C2', text: '/tuchoi SC-06 Không phù hợp tệp' }))!, /Đã từ chối/);
  assert.equal((await jobOf('SC-06')).ctvConfirmStatus, 'DECLINED');
});
