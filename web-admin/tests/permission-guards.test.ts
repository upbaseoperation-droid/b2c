import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardDealBoardSave, DealGuardError, type DealGuardContext } from '../src/lib/dealBoardGuard';
import { guardListingSave } from '../src/lib/listingBoardGuard';
import { guardContentPlanSave } from '../src/lib/contentPlanGuard';
import { createDealJob, jobPaymentBlocker, type DealBoardData, type DealJob, type PlanDeal } from '../src/lib/dealBoardRules';
import type { StorePosition } from '../src/lib/storePositions';
import type { KocListingItem, UserRole } from '../src/lib/types';
import type { ContentSlot } from '../src/lib/contentPlanRules';

const NOW = new Date(2026, 9, 20, 10, 0, 0); // 20/10/2026, tháng 10 chưa khóa sổ
const ctx = (name: string, positions: StorePosition[], over: Partial<DealGuardContext> = {}, role: UserRole = 'BOOKING_MEMBER'): DealGuardContext => ({
  actor: { id: name, name, role },
  global: false,
  positions: new Set(positions),
  isAccountPic: false,
  planMonth: '2026/10',
  selfAirAllowed: false,
  now: NOW,
  ...over,
});
const MAIN = ctx('An', ['BOOKING_MAIN']);
const CO = ctx('Bình', ['BOOKING_CO']);
const LEADER = ctx('Tâm', ['LEADER']);
const DIRECTOR = ctx('Nhi', [], { global: true }, 'MANAGER');

const job = (code: string, pic: string, over: Partial<DealJob> = {}): DealJob => ({ ...createDealJob({ dealCode: 'DL1', existingJobs: [], pic }), id: code, code, videoFee: 2_000_000, ...over });
const deal = (id: string, pic: string, jobs: DealJob[], over: Partial<PlanDeal> = {}): PlanDeal =>
  ({ id, code: id, listingItemId: `li-${id}`, slotId: '', kocHandle: `koc_${id}`, kocName: id, grade: 'KL3', week: 'W1', pic, fee: 2_000_000, jobs, createdAt: '', createdBy: pic, history: [], ...over }) as unknown as PlanDeal;
const board = (...deals: PlanDeal[]): DealBoardData => ({ deals });
const editJob = (b: DealBoardData, dealId: string, f: (j: DealJob) => DealJob): DealBoardData =>
  ({ ...b, deals: b.deals.map(d => (d.id === dealId ? { ...d, jobs: d.jobs.map(f) } : d)) });
const blocked = (fn: () => unknown, status?: number) =>
  assert.throws(fn, (e: unknown) => e instanceof DealGuardError && (status === undefined || e.status === status));

const base = board(deal('D1', 'An', [job('J1', 'An')]), deal('D2', 'Bình', [job('J2', 'Bình')]));

test('Booking cùng làm: tạo deal của mình, chỉ sửa / xóa deal của mình, không đổi người phụ trách', () => {
  const created = guardDealBoardSave(base, board(...base.deals, deal('D3', '', [job('J3', '')])), CO);
  assert.equal(created.deals[2].pic, 'Bình');
  assert.equal(created.deals[2].jobs[0].pic, 'Bình');
  blocked(() => guardDealBoardSave(base, board(...base.deals, deal('D4', 'An', [job('J4', 'An')])), CO));
  guardDealBoardSave(base, editJob(base, 'D2', j => ({ ...j, deadline: '2026-10-30' })), CO);
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, deadline: '2026-10-30' })), CO));
  blocked(() => guardDealBoardSave(base, board(base.deals[1]), CO));
  blocked(() => guardDealBoardSave(base, board(base.deals[0], { ...base.deals[1], pic: 'An' }), CO));
  // Booking chính sửa / đổi người phụ trách mọi deal
  guardDealBoardSave(base, board(base.deals[0], { ...base.deals[1], pic: 'An' }), MAIN);
  // Người không thuộc nhóm Booking không sửa được gì
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, deadline: '2026-10-30' })), ctx('Khách', ['PLAN_STRATEGY'])));
});

test('Không xóa deal / Job đã có tạm ứng hoặc đề nghị thanh toán; không tạo 2 Deal cho cùng KOC', () => {
  const paid = editJob(base, 'D1', j => ({ ...j, advancePayment: { status: 'PAID', amount: 500_000 } }));
  blocked(() => guardDealBoardSave(paid, board(paid.deals[1]), MAIN), 400);
  blocked(() => guardDealBoardSave(paid, board(...paid.deals, deal('D9', 'An', [job('J9', 'An')], { listingItemId: 'li-D1' })), MAIN), 409);
});

test('Bước duyệt theo vai trò: Pháp chế, Kế toán, Account PIC, Leader', () => {
  const legal = ctx('Quân', [], {}, 'LEGAL');
  const finance = ctx('Hà', [], {}, 'FINANCE');
  const account = ctx('Linh', [], { isAccountPic: true });
  // Pháp chế duyệt được trên deal không phải của mình, nhưng không sửa phí
  guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, legalReviewStatus: 'APPROVED' })), legal);
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, videoFee: 9_000_000 })), legal));
  // Booking chính không tự duyệt Pháp chế / Tài chính / Đã thanh toán / Hóa đơn nháp
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, legalReviewStatus: 'APPROVED' })), MAIN));
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, payment: { ...j.payment, status: 'PAID' } })), MAIN));
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, invoiceCheck: { draftInvoiceStatus: 'APPROVED' } })), MAIN));
  guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, payment: { ...j.payment, status: 'PAID' } })), finance);
  guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, payment: { ...j.payment, status: 'PAID' } })), DIRECTOR);
  // Đối soát: Account PIC phần số liệu Brand, Kế toán phần chứng từ
  guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, closingAudit: { accountStatus: 'PASSED', financeStatus: 'PENDING' } })), account);
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, closingAudit: { accountStatus: 'PENDING', financeStatus: 'PASSED' } })), account));
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, closingAudit: { accountStatus: 'PASSED', financeStatus: 'PENDING' } })), MAIN));
  // Giải trình ký muộn: Leader của gian
  const late = (j: DealJob): DealJob => ({ ...j, lateSigningExplanation: { leadConfirmed: true } as DealJob['lateSigningExplanation'] });
  guardDealBoardSave(base, editJob(base, 'D1', late), LEADER);
  blocked(() => guardDealBoardSave(base, editJob(base, 'D2', late), CO));
});

test('Kịch bản 2 vòng và tự Air chỉ với Brand đã đồng ý, quá 72 giờ', () => {
  const sent = (j: DealJob, audit: 'NONE' | 'PASSED'): DealJob => ({ ...j, script: { ...j.script, scriptUrl: 'https://kb', internalScriptAuditStatus: audit, status: 'SUBMITTED', at: '2026-10-16T09:00:00' } });
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => sent(j, 'NONE')), MAIN), 400);
  const submitted = editJob(base, 'D1', j => sent(j, 'PASSED'));
  guardDealBoardSave(base, submitted, MAIN);
  const selfAir = editJob(submitted, 'D1', j => ({ ...j, selfAirProposed: true }));
  blocked(() => guardDealBoardSave(submitted, selfAir, MAIN), 400);
  guardDealBoardSave(submitted, selfAir, { ...MAIN, selfAirAllowed: true });
  const fresh = editJob(base, 'D1', j => ({ ...sent(j, 'PASSED'), script: { ...sent(j, 'PASSED').script, at: '2026-10-19T09:00:00' } }));
  blocked(() => guardDealBoardSave(fresh, editJob(fresh, 'D1', j => ({ ...j, selfAirProposed: true })), { ...MAIN, selfAirAllowed: true }), 400);
});

test('Khóa sổ tháng: Job chưa lên sóng chỉ xem; Job đã lên sóng vẫn làm nốt; Kế toán mở / khóa sổ', () => {
  const after = new Date(2026, 10, 5);
  const aired = editJob(base, 'D2', j => ({ ...j, airLink: 'https://www.tiktok.com/@b/video/1', airedAt: '2026-10-28' }));
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, deadline: '2026-11-03' })), { ...MAIN, now: after }), 423);
  guardDealBoardSave(aired, editJob(aired, 'D2', j => ({ ...j, acceptance: { ...j.acceptance, confirmedBy: 'Bình', confirmNote: 'Brand đã OK qua Zalo' } })), { ...CO, now: after });
  blocked(() => guardDealBoardSave(base, board(...base.deals, deal('D5', 'An', [job('J5', 'An')])), { ...MAIN, now: after }), 423);
  blocked(() => guardDealBoardSave(base, { ...base, closingState: { mode: 'OPEN_ROUND_1', round1ErrorLog: '', round2ErrorLog: '', updatedBy: 'An', updatedAt: '' } }, MAIN));
});

test('Nghiệm thu: xác nhận khi video chưa đạt phải ghi lý do; Đạt phải có kết quả soát video', () => {
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, acceptance: { ...j.acceptance, status: 'FAILED', confirmedBy: 'An', confirmNote: '' } })), MAIN), 400);
  blocked(() => guardDealBoardSave(base, editJob(base, 'D1', j => ({ ...j, acceptance: { ...j.acceptance, status: 'PASSED', checks: [] } })), MAIN), 400);
});

test('Thanh toán Job có phí cần đối soát Account + Kế toán Đạt và BBNT đã ký', () => {
  const ready = job('J1', 'An', {
    appendixNo: 'PL-01', appendixDate: '2026-10-01', airLink: 'https://www.tiktok.com/@a/video/1', airedAt: '2026-10-10',
    acceptance: { ...createDealJob({ dealCode: 'DL1', existingJobs: [] }).acceptance, status: 'PASSED', checks: [{ key: 'x' } as never] },
  });
  assert.match(jobPaymentBlocker(ready), /Account PIC chưa đối soát/);
  const audited = { ...ready, closingAudit: { accountStatus: 'PASSED' as const, financeStatus: 'PASSED' as const } };
  assert.match(jobPaymentBlocker(audited), /BBNT/);
  assert.equal(jobPaymentBlocker({ ...audited, bbntUrl: 'https://drive/bbnt' }), '');
});

const item = (id: string, pic: string, over: Partial<KocListingItem> = {}): KocListingItem =>
  ({ id, kocHandle: id, kocName: id, salaryGrade: 'KL3', proposedFee: 2_000_000, overallStatus: 'DRAFT', brandApprovalStatus: 'BRAND_PENDING', kocNegotiationStatus: 'NOT_CONTACTED', assignedStaffName: pic, ...over }) as KocListingItem;
const lctx = (positions: StorePosition[], name: string, withDeal: string[] = []) => ({ actor: { id: name, name }, global: false, positions: new Set(positions), itemsWithDeal: new Set(withDeal) });

test('Listing: người cùng làm chỉ sửa KOC của mình; Brand duyệt phải có căn cứ; KOC có Deal giữ nguyên', () => {
  const prev = [item('a', 'An'), item('b', 'Bình')];
  const added = guardListingSave(prev, [...prev, item('c', '')], lctx(['BOOKING_CO'], 'Bình'));
  assert.equal(added[2].assignedStaffName, 'Bình');
  blocked(() => guardListingSave(prev, [{ ...prev[0], proposedFee: 3_000_000 }, prev[1]], lctx(['BOOKING_CO'], 'Bình')));
  // Tự đánh Brand duyệt khi không có kết quả Sheet / bằng chứng
  const approved = (i: KocListingItem, over: Partial<KocListingItem> = {}) => ({ ...i, overallStatus: 'SUBMITTED' as const, brandApprovalStatus: 'BRAND_APPROVED' as const, ...over });
  blocked(() => guardListingSave(prev, [approved(prev[0]), prev[1]], lctx(['BOOKING_MAIN'], 'An')), 400);
  // Trình duyệt tự gửi "Sheet đã duyệt" cũng không được tính
  blocked(() => guardListingSave(prev, [approved(prev[0], { lastSheetDecision: 'APPROVED' }), prev[1]], lctx(['BOOKING_MAIN'], 'An')), 400);
  guardListingSave(prev, [approved(prev[0], { brandApprovalEvidence: 'https://zalo/brand-ok' }), prev[1]], lctx(['BOOKING_MAIN'], 'An'));
  // Ghi chú "Brand chỉ định" không thay được bằng chứng
  blocked(() => guardListingSave(prev, [approved(prev[0], { negotiationNote: 'KOL Brand chỉ định' }), prev[1]], lctx(['BOOKING_MAIN'], 'An')), 400);
  // KOC đã có Deal: không xóa, không kéo khỏi cột Đã chốt
  const confirmed = [item('a', 'An', { overallStatus: 'FINAL_APPROVED', brandApprovalStatus: 'BRAND_APPROVED', brandApprovedAt: '2026-10-01', kocNegotiationStatus: 'TERMS_AGREED' }), prev[1]];
  blocked(() => guardListingSave(confirmed, [confirmed[1]], lctx(['BOOKING_MAIN'], 'An', ['a'])), 409);
  blocked(() => guardListingSave(confirmed, [{ ...confirmed[0], overallStatus: 'DROPPED' }, confirmed[1]], lctx(['BOOKING_MAIN'], 'An', ['a'])), 409);
});

const slot = (id: string, row: ContentSlot['row'], over: Partial<ContentSlot> = {}): ContentSlot => ({ id, briefCode: id, targetQty: 1, pillar: 'P01', angle: 'a', row, ...over }) as ContentSlot;

test('Kế hoạch content: Booking chính quyết định nội dung; PIC Kênh tự sở hữu chỉ dòng SELF; Plan/KV chỉ góp ý', () => {
  const prev = [slot('s1', 'KL1'), slot('s2', 'SELF')];
  const p = (positions: StorePosition[]) => ({ global: false, positions: new Set(positions) });
  guardContentPlanSave(prev, [{ ...prev[0], pillar: 'P02' }, prev[1]], p(['BOOKING_MAIN']));
  guardContentPlanSave(prev, [prev[0], { ...prev[1], angle: 'mới' }, slot('s3', 'SELF')], p(['SELF_CHANNEL']));
  blocked(() => guardContentPlanSave(prev, [{ ...prev[0], angle: 'mới' }, prev[1]], p(['SELF_CHANNEL'])));
  guardContentPlanSave(prev, [{ ...prev[0], kocHandle: 'koc1' }, prev[1]], p(['BOOKING_CO']));
  blocked(() => guardContentPlanSave(prev, [{ ...prev[0], pillar: 'P03' }, prev[1]], p(['BOOKING_CO'])));
  guardContentPlanSave(prev, [{ ...prev[0], note: 'Nên nhấn USP chống nắng' }, prev[1]], p(['PLAN_STRATEGY']));
  blocked(() => guardContentPlanSave(prev, [{ ...prev[0], briefStatus: 'APPROVED' as never }, prev[1]], p(['KEY_VISUAL'])));
});
