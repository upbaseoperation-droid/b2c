// Luồng Deal / Job, Hợp đồng nguyên tắc – Phụ lục SOW – BBNT, nghiệm thu, thanh toán, chuyển Job sang tháng sau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST as dealPost } from '../src/app/api/deal-board/route';
import {
  api, approvedPlan, approveAndSign, assertBlocked, assertOk, booking, brandPartner, call, coBooking, createContract, finance,
  handleOf, itemsByHandle, leader, outsider, req, saveJob, seedDeals, sheetUrl, storeById, STORE_TIKTOK, takeKocs,
} from './helpers/fullFlowHarness';
import { columnOf, moveItem } from '../src/lib/listingBoardRules';
import { jobPaymentBlocker, type DealBoardData, type DealJob, type PlanDeal } from '../src/lib/dealBoardRules';
import type { ContractRecord } from '../src/lib/contracts/types';
import type { InputPlanBreakdownState, KocItem } from '../src/lib/types';

let monthSeq = 0;
const nextMonth = () => `2030/${String(++monthSeq).padStart(2, '0')}`;
let sheetSeq = 0;
const newSheet = () => {
  const id = `1FakeSheetDealE2E${String(++sheetSeq).padStart(4, '0')}abcdefghijk`;
  sheetUrl(id);
  return id;
};

async function withDeals(n = 1, month = nextMonth()): Promise<{ plan: InputPlanBreakdownState; kocs: KocItem[]; deals: PlanDeal[] }> {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, month);
  const kocs = takeKocs(n);
  const { board } = await seedDeals(plan, kocs, newSheet());
  return { plan, kocs, deals: board.deals };
}
const jobOf = async (planId: string, dealId: string): Promise<DealJob> => {
  const b = await api.deals(booking, planId);
  return (b.body.data as DealBoardData).deals.find(d => d.id === dealId)!.jobs[0];
};

// ───────────── Bảng Deal: phân quyền ─────────────
test('DL-01 Người ngoài gian và tài khoản Brand không xem được bảng Deal', async () => {
  const { plan } = await withDeals();
  const store = await storeById(STORE_TIKTOK);
  assertBlocked(await api.deals(await outsider(store), plan.id), 'Người ngoài gian xem Deal', undefined, 403);
  assertBlocked(await api.deals(brandPartner, plan.id), 'Brand xem Deal nội bộ', undefined, 401);
});

test('DL-02 Booking cùng làm không sửa Deal của Booking chính, không đổi người phụ trách', async () => {
  const { plan, deals } = await withDeals();
  assertBlocked(await saveJob(coBooking, plan.id, deals[0].id, j => ({ ...j, deadline: '2030-12-31' })), 'Sửa Job của người khác', /phụ trách/, 403);
  assertBlocked(await saveJob(coBooking, plan.id, deals[0].id, j => ({ ...j, pic: coBooking.name })), 'Nhận Job của người khác', undefined, 403);
});

test('DL-03 Không xóa KOC đã có Deal khỏi Listing, không kéo KOC đó khỏi cột Đã chốt', async () => {
  const { plan, kocs } = await withDeals();
  const cur = await itemsByHandle(booking, plan.id);
  const h = handleOf(kocs[0]);
  assertBlocked(await api.putListing(booking, plan.id, cur.revision, cur.items.filter(i => !i.kocHandle.toLowerCase().includes(h))), 'Xóa KOC đã có Deal', /đã có Deal/, 409);
  const dropped = cur.items.map(i => (i.kocHandle.toLowerCase().includes(h) ? moveItem(i, 'DROPPED', booking.name, 'Thử rớt').item || i : i));
  assert.notEqual(columnOf(dropped.find(i => i.kocHandle.toLowerCase().includes(h))!), 'CONFIRMED');
  assertBlocked(await api.putListing(booking, plan.id, cur.revision, dropped), 'Rớt KOC đã có Deal trên Listing', /đã có Deal/, 409);
});

// ───────────── Job: các bước duyệt nhạy cảm ─────────────
test('DL-04 Booking không tự duyệt Pháp chế / Tài chính trên Job; Kế toán duyệt được Tài chính', async () => {
  const { plan, deals } = await withDeals();
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, legalReviewStatus: 'APPROVED' })), 'Booking duyệt Pháp chế', /Pháp chế/, 403);
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, financeReviewStatus: 'APPROVED' })), 'Booking duyệt Tài chính', /Kế toán/, 403);
  const r = await saveJob(finance, plan.id, deals[0].id, j => ({ ...j, financeReviewStatus: 'APPROVED' }));
  assertOk(r, 'Kế toán duyệt Tài chính');
});

test('DL-05 Đề nghị thanh toán Job có phí khi chưa có HĐNT / Phụ lục SOW bị chặn; Booking không tự xác nhận Đã thanh toán', async () => {
  const { plan, deals } = await withDeals();
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, payment: { ...j.payment, status: 'REQUESTED' } })), 'Đề nghị thanh toán khi chưa có phụ lục', /HĐNT|Phụ lục/, 400);
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, appendixNo: 'PL-TAY-01', payment: { ...j.payment, status: 'PAID' } })), 'Booking xác nhận Đã thanh toán', /Kế toán/, 403);
});

test('DL-06 Có số phụ lục gõ tay nhưng chưa ký / chưa nghiệm thu: vẫn chưa thanh toán được', async () => {
  const { plan, deals } = await withDeals();
  const r = await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, appendixNo: 'PL-TAY-02', payment: { ...j.payment, status: 'REQUESTED' } }));
  assertBlocked(r, 'Đề nghị thanh toán khi phụ lục chưa ký', /chưa thanh toán được/, 400);
});

test('DL-07 Gửi kịch bản cho Brand khi chưa duyệt nội bộ vòng 1 bị chặn; đã duyệt nội bộ thì được', async () => {
  const { plan, deals } = await withDeals();
  const url = 'https://docs.google.com/document/d/kich-ban-dl07';
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, script: { ...j.script, scriptUrl: url, status: 'SUBMITTED' } })), 'Gửi Brand khi chưa duyệt nội bộ', /vòng 1/, 400);
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, script: { ...j.script, scriptUrl: url, internalScriptAuditStatus: 'PASSED', status: 'SUBMITTED' } })), 'Gửi Brand sau khi duyệt nội bộ');
});

test('DL-08 Brand duyệt kịch bản trên Sheet chỉ được nhận khi B2C đã duyệt nội bộ vòng 1', async () => {
  const store = await storeById(STORE_TIKTOK);
  const { plan } = await approvedPlan(store, nextMonth());
  const kocs = takeKocs(1);
  const sheetId = newSheet();
  const { board } = await seedDeals(plan, kocs, sheetId, 'Listing');
  const { brandFill } = await import('./helpers/fullFlowHarness');
  brandFill(sheetId, 'Listing', handleOf(kocs[0]), 'Link kịch bản', 'https://docs.google.com/document/d/script-tu-sheet');
  brandFill(sheetId, 'Listing', handleOf(kocs[0]), 'Brand duyệt kịch bản', 'Yes');
  assertOk(await api.pull(booking, { planId: plan.id, sheetUrl: sheetUrl(sheetId), tab: 'Listing' }), 'Kéo Sheet');
  const job = await jobOf(plan.id, board.deals[0].id);
  assert.equal(job.script.scriptUrl, 'https://docs.google.com/document/d/script-tu-sheet');
  assert.notEqual(job.script.status, 'APPROVED', 'Kịch bản chưa qua duyệt nội bộ vòng 1 đã thành "Brand duyệt"');
});

test('DL-09 Nghiệm thu: "Đạt" phải có kết quả soát video; xác nhận khi chưa đạt phải ghi lý do; người xác nhận do máy chủ ghi', async () => {
  const { plan, deals } = await withDeals();
  const air = 'https://www.tiktok.com/@koc/video/7400000000000000001';
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, airLink: air, airedAt: '2030-01-10' })), 'Gắn link Air');
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, acceptance: { ...j.acceptance, status: 'PASSED' } })), 'Đạt khi chưa soát video', /soát video/, 400);
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, acceptance: { ...j.acceptance, status: 'REVIEW', confirmedBy: 'x' } })), 'Xác nhận khi chưa đạt, không lý do', /lý do/, 400);
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, acceptance: { ...j.acceptance, status: 'REVIEW', confirmedBy: 'Giám đốc giả mạo', confirmNote: 'Brand chấp nhận bản thiếu hook' } })), 'Xác nhận có lý do');
  assert.equal((await jobOf(plan.id, deals[0].id)).acceptance.confirmedBy, booking.name, 'Tên người xác nhận phải là người thao tác thật');
});

test('DL-10 Đổi link Air sau khi đã nghiệm thu: bắt buộc nghiệm thu lại', async () => {
  const { plan, deals } = await withDeals();
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, airLink: 'https://www.tiktok.com/@koc/video/1', airedAt: '2030-01-10' })), 'Gắn link Air');
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, acceptance: { ...j.acceptance, status: 'REVIEW', confirmedBy: 'x', confirmNote: 'OK' } })), 'Xác nhận nghiệm thu');
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, airLink: 'https://www.tiktok.com/@koc/video/2' })), 'Đổi link Air');
  const job = await jobOf(plan.id, deals[0].id);
  assert.equal(job.acceptance.status, 'PENDING');
  assert.equal(job.acceptance.confirmedBy, '');
});

test('DL-11 Booking không mở / khóa sổ nghiệm thu tháng', async () => {
  const { plan } = await withDeals();
  const b = await api.deals(booking, plan.id);
  const closingState = { mode: 'LOCKED', round1ErrorLog: '', round2ErrorLog: '', updatedBy: booking.name, updatedAt: new Date().toISOString() };
  assertBlocked(await api.putDeals(booking, plan.id, b.body.revision, { ...b.body.data, closingState }), 'Booking khóa sổ', /Kế toán/, 403);
});

test('DL-12 Deal đã có đề nghị tạm ứng thì không xóa được', async () => {
  const { plan, deals } = await withDeals();
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, advancePayment: { status: 'REQUESTED', amount: 1_000_000 } })), 'Đề nghị tạm ứng');
  const b = await api.deals(booking, plan.id);
  assertBlocked(await api.putDeals(booking, plan.id, b.body.revision, { ...b.body.data, deals: [] }), 'Xóa Deal có tạm ứng', /tạm ứng/, 400);
});

test('DL-13 Đề xuất tự Air khi Brand chưa đồng ý cơ chế tự Air bị chặn', async () => {
  const { plan, deals } = await withDeals();
  assertBlocked(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, selfAirProposed: true })), 'Đề xuất tự Air', /tự Air/, 400);
});

// ───────────── Chuyển Job sang tháng sau, bàn giao ─────────────
test('DL-14 Chuyển Job chưa lên sóng sang tháng sau: tháng cũ đánh dấu, tháng mới có bản sao; không chuyển 2 lần', async () => {
  const { plan: from, deals } = await withDeals(1, '2032/01');
  const store = await storeById(STORE_TIKTOK);
  const { plan: to } = await approvedPlan(store, '2032/02');
  const body = { action: 'PULL_HANGING_JOBS', targetPlanId: to.id, items: [{ sourcePlanId: from.id, dealId: deals[0].id, jobId: deals[0].jobs[0].id }] };
  const r = await call(dealPost(req('/api/deal-board', 'POST', booking, body)));
  assertOk(r, 'Chuyển Job');
  assert.equal(r.body.pulledCount, 1);
  const copy = (r.body.data as DealBoardData).deals.flatMap(d => d.jobs).find(j => j.carriedFromJobCode === deals[0].jobs[0].code);
  assert.ok(copy, 'Tháng mới không có bản sao Job');
  assert.equal((await jobOf(from.id, deals[0].id)).lifecycleStatus, 'ROLLED_OVER_NEXT_MONTH');
  assertBlocked(await call(dealPost(req('/api/deal-board', 'POST', booking, body))), 'Chuyển lại lần 2', /đã chuyển/, 409);
  assertBlocked(await call(dealPost(req('/api/deal-board', 'POST', booking, { ...body, targetPlanId: from.id, items: [{ sourcePlanId: to.id, dealId: 'x', jobId: copy!.id }] }))), 'Chuyển ngược về tháng trước', /tháng trước sang tháng sau/, 400);
});

test('DL-15 Job đã lên sóng không chuyển tháng được; người ngoài gian không chuyển được', async () => {
  const { plan: from, deals } = await withDeals(1, '2032/03');
  const store = await storeById(STORE_TIKTOK);
  const { plan: to } = await approvedPlan(store, '2032/04');
  const body = { action: 'PULL_HANGING_JOBS', targetPlanId: to.id, items: [{ sourcePlanId: from.id, dealId: deals[0].id, jobId: deals[0].jobs[0].id }] };
  assertBlocked(await call(dealPost(req('/api/deal-board', 'POST', await outsider(store), body))), 'Người ngoài gian chuyển Job');
  assertOk(await saveJob(booking, from.id, deals[0].id, j => ({ ...j, airLink: 'https://www.tiktok.com/@koc/video/9', airedAt: '2032-03-20' })), 'Lên sóng');
  assertBlocked(await call(dealPost(req('/api/deal-board', 'POST', booking, body))), 'Chuyển Job đã lên sóng', /lên sóng/, 400);
});

test('DL-16 Bàn giao deal khi đổi người: chỉ Leader / Giám đốc', async () => {
  const { plan } = await withDeals(1, '2032/05');
  const body = { action: 'TRANSFER_OWNER', storeId: plan.storeId, fromPic: booking.name, toPic: coBooking.name, fromMonth: plan.month };
  assertBlocked(await call(dealPost(req('/api/deal-board', 'POST', coBooking, body))), 'Booking cùng làm tự bàn giao', /Leader/, 403);
  const r = await call(dealPost(req('/api/deal-board', 'POST', leader, body)));
  assertOk(r, 'Leader bàn giao');
  assert.ok(Number(r.body.transferred) >= 1 || (typeof r.body.transferred === 'object' && r.body.transferred), JSON.stringify(r.body));
});

// ───────────── Hợp đồng / Phụ lục / BBNT ─────────────
async function signedHdnt(kocId: string): Promise<ContractRecord> {
  const c = await createContract('IND-HDNT', { kocId });
  assertOk(c, 'Tạo HĐNT');
  return approveAndSign(c.body.record);
}

test('HD-01 Phụ lục SOW phải gắn với Hợp đồng nguyên tắc (không gắn với hợp đồng đơn lẻ)', async () => {
  const hd = await createContract('IND-HD', { kocId: 'koc-hd01' });
  assertOk(hd, 'Tạo HĐ đơn lẻ');
  assertBlocked(await createContract('IND-SOW', { parentId: hd.body.record.id, kocId: 'koc-hd01', dealCode: 'X' }), 'SOW gắn HĐ đơn lẻ', /HĐNT/, 400);
});

test('HD-02 Phụ lục SOW phải cùng KOC với HĐNT gốc', async () => {
  const hdnt = await signedHdnt('koc-hd02');
  assertBlocked(await createContract('IND-SOW', { parentId: hdnt.id, kocId: 'koc-khac', dealCode: 'X' }), 'SOW khác KOC', /cùng KOC/, 400);
});

test('HD-03 Người lập không tự duyệt; người không được giao duyệt không duyệt được; lưu bằng revision cũ báo xung đột', async () => {
  const c = await createContract('IND-HDNT', { kocId: 'koc-hd03' });
  let rec: ContractRecord = c.body.record;
  const sub = await api.contract('contract-demo-owner', { id: rec.id, revision: rec.revision, action: 'SUBMIT', reviewers: ['contract-demo-finance'], requireLegal: false });
  assertOk(sub, 'Gửi duyệt');
  rec = sub.body.record;
  assertBlocked(await api.contract('contract-demo-owner', { id: rec.id, revision: rec.revision, action: 'DECIDE', decision: 'APPROVED', note: 'tự duyệt' }), 'Người lập tự duyệt');
  assertBlocked(await api.contract('contract-demo-legal', { id: rec.id, revision: rec.revision, action: 'DECIDE', decision: 'APPROVED', note: 'không được giao' }), 'Pháp chế không được giao vẫn duyệt');
  assertBlocked(await api.contract('contract-demo-finance', { id: rec.id, revision: rec.revision - 1, action: 'DECIDE', decision: 'APPROVED', note: 'bản cũ' }), 'Duyệt trên bản cũ', undefined, 409);
});

test('HD-04 Hợp đồng sửa điều khoản riêng bắt buộc qua Pháp chế dù người lập bỏ chọn', async () => {
  const c = await createContract('IND-HDNT', { kocId: 'koc-hd04', hasCustomTerms: true });
  assertOk(c, 'Tạo HĐNT sửa điều khoản');
  const r = await api.contract('contract-demo-owner', { id: c.body.record.id, revision: c.body.record.revision, action: 'SUBMIT', reviewers: ['contract-demo-finance'], requireLegal: false });
  if (r.status === 200) assert.ok((r.body.record as ContractRecord).steps.some(s => s.role === 'LEGAL'), 'Thiếu bước Pháp chế cho hợp đồng sửa điều khoản');
  else assertBlocked(r, 'Gửi duyệt thiếu Pháp chế', /Pháp chế|pháp chế/);
});

test('HD-05 Phụ lục SOW: tạo → Job nhận số phụ lục; Kế toán yêu cầu sửa → Job hiện "Cần sửa"; duyệt & ký → Job đủ phụ lục đã ký', async () => {
  const { plan, kocs, deals } = await withDeals();
  const job = deals[0].jobs[0];
  const hdnt = await signedHdnt(kocs[0].id);
  const created = await createContract('IND-SOW', { parentId: hdnt.id, kocId: kocs[0].id, dealCode: job.code, dealId: `PJ-${job.id}` });
  assertOk(created, 'Tạo SOW');
  let sow: ContractRecord = created.body.record;
  let j = await jobOf(plan.id, deals[0].id);
  assert.equal(j.sowContractId, sow.id);
  assert.ok(j.appendixNo, 'Job chưa nhận số phụ lục');
  assert.match(jobPaymentBlocker(j), /SOW/, 'Phụ lục chưa ký mà Job đã qua chặn thanh toán');

  const sub = await api.contract('contract-demo-owner', { id: sow.id, revision: sow.revision, action: 'SUBMIT', reviewers: ['contract-demo-finance'], requireLegal: false });
  assertOk(sub, 'Gửi duyệt SOW');
  sow = sub.body.record;
  const changes = await api.contract('contract-demo-finance', { id: sow.id, revision: sow.revision, action: 'DECIDE', decision: 'CHANGES', note: 'Sai số tiền thuế' });
  assertOk(changes, 'Kế toán yêu cầu sửa');
  assert.equal((await jobOf(plan.id, deals[0].id)).financeReviewStatus, 'CHANGES');

  const fresh = await createContract('IND-SOW', { parentId: hdnt.id, kocId: kocs[0].id, dealCode: job.code, dealId: `PJ-${job.id}` });
  assertOk(fresh, 'Lập lại SOW');
  sow = await approveAndSign(fresh.body.record);
  j = await jobOf(plan.id, deals[0].id);
  assert.equal(j.sowContractId, sow.id, 'Job phải trỏ sang SOW mới');
  assert.equal(j.sowSigned, true);
  assert.equal(j.financeReviewStatus, 'APPROVED');
  assert.ok(j.appendixDate && j.appendixUrl);
  assert.doesNotMatch(jobPaymentBlocker(j), /SOW/, 'Đã ký SOW nhưng vẫn bị chặn vì SOW');
});

test('HD-06 Biên bản nghiệm thu (mẫu IND-VID-BBNT) gắn về Job; ký xong Job có link BBNT', async () => {
  const { plan, kocs, deals } = await withDeals();
  const job = deals[0].jobs[0];
  const hdnt = await signedHdnt(kocs[0].id);
  const created = await createContract('IND-VID-BBNT', { parentId: hdnt.id, kocId: kocs[0].id, dealCode: job.code, dealId: `PJ-${job.id}` });
  assertOk(created, 'Tạo BBNT');
  let j = await jobOf(plan.id, deals[0].id);
  assert.equal(j.bbntContractId, created.body.record.id);
  await approveAndSign(created.body.record);
  j = await jobOf(plan.id, deals[0].id);
  assert.equal(j.bbntSigned, true);
  assert.ok(j.bbntUrl, 'Job chưa có link BBNT đã ký');
  assert.ok(j.bbntNo && j.bbntDate, `Job mất số / ngày BBNT sau khi lưu (bbntNo=${j.bbntNo}, bbntDate=${j.bbntDate})`);
});

test('HD-07 Hợp đồng không gắn được với Job của gian / tháng khác (mã Job không tồn tại) thì không ghi nhầm Job nào', async () => {
  const { plan, deals } = await withDeals();
  const hdnt = await signedHdnt('koc-hd07');
  assertOk(await createContract('IND-SOW', { parentId: hdnt.id, kocId: 'koc-hd07', dealCode: 'DL9999-999-J9' }), 'Tạo SOW mã lạ');
  assert.equal((await jobOf(plan.id, deals[0].id)).sowContractId, undefined, 'SOW mã lạ bị gắn nhầm Job');
});

test('HD-08 BBNT lập theo mẫu được bộ gợi ý đề xuất (IND-BBNT) cũng phải gắn về Job', async () => {
  const { evaluateContractRules } = await import('../src/lib/contracts/contractRules');
  const recommended = evaluateContractRules({ kind: 'ACCEPTANCE', totalValue: 5_000_000 } as never).recommendedTemplateId;
  const { plan, kocs, deals } = await withDeals();
  const job = deals[0].jobs[0];
  const hdnt = await signedHdnt(kocs[0].id);
  const created = await createContract(recommended, { parentId: hdnt.id, kocId: kocs[0].id, dealCode: job.code, dealId: `PJ-${job.id}` });
  assertOk(created, `Tạo BBNT theo mẫu gợi ý ${recommended}`);
  assert.equal((await jobOf(plan.id, deals[0].id)).bbntContractId, created.body.record.id, `BBNT mẫu ${recommended} không gắn về Job`);
});

test('HD-09 Trạng thái "đã duyệt nội bộ kịch bản vòng 1" phải được lưu lại trên Job', async () => {
  const { plan, deals } = await withDeals();
  assertOk(await saveJob(booking, plan.id, deals[0].id, j => ({ ...j, script: { ...j.script, scriptUrl: 'https://docs.google.com/document/d/hd09', internalScriptAuditStatus: 'PASSED' } })), 'Lưu duyệt nội bộ');
  assert.equal((await jobOf(plan.id, deals[0].id)).script.internalScriptAuditStatus, 'PASSED', 'Máy chủ bỏ mất kết quả duyệt nội bộ vòng 1');
});
