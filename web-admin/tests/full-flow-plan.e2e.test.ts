// Luồng Kế hoạch: Plan tổng 4.1 → Phân rã tuần / nhân sự → Gửi duyệt → Leader sơ duyệt → Giám đốc duyệt & khóa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET as monthlyPlansGet } from '../src/app/api/monthly-plans/route';
import {
  api, approvedPlan, assertBlocked, assertOk, booking, brandPartner, call, coBooking, director, draftPlan, leader, outsider, req,
  storeById, STORE_TIKTOK, withBreakdown, type PlanCtx,
} from './helpers/fullFlowHarness';
import { checkBreakdownForSubmit } from '../src/lib/planBreakdownRules';
import type { InputPlanBreakdownState, UserProfile } from '../src/lib/types';

async function created(month: string, over: Partial<InputPlanBreakdownState> = {}): Promise<PlanCtx> {
  const store = await storeById(STORE_TIKTOK);
  const r = await api.createPlan(director, draftPlan(store, month, over));
  assertOk(r, 'Tạo kế hoạch');
  return { plan: r.body.plan, revision: r.body.revision };
}
async function put(ctx: PlanCtx, actor: UserProfile, patch: Partial<InputPlanBreakdownState>) {
  const r = await api.putPlan(actor, { ...ctx.plan, ...patch }, ctx.revision);
  if (r.status === 200) Object.assign(ctx, { plan: r.body.plan, revision: r.body.revision });
  return r;
}

test('KH-01 Tạo plan: Giám đốc / Booking chính tạo được; nhân sự ngoài gian bị chặn', async () => {
  const store = await storeById(STORE_TIKTOK);
  assertBlocked(await api.createPlan(await outsider(store), draftPlan(store, '2027/01')), 'Nhân sự ngoài gian tạo kế hoạch', undefined, 403);
  assertOk(await api.createPlan(booking, draftPlan(store, '2027/01')), 'Booking chính tạo kế hoạch gian mình');
});

test('KH-02 Một gian chỉ có một kế hoạch mỗi tháng', async () => {
  const store = await storeById(STORE_TIKTOK);
  await created('2027/02');
  assertBlocked(await api.createPlan(director, draftPlan(store, '2027/02')), 'Tạo kế hoạch thứ hai cùng gian, cùng tháng', /đã có kế hoạch/, 409);
});

test('KH-03 Booking cùng làm không được khởi tạo kế hoạch', async () => {
  const store = await storeById(STORE_TIKTOK);
  assertBlocked(await api.createPlan(coBooking, draftPlan(store, '2027/03')), 'Booking cùng làm tạo kế hoạch', undefined, 403);
});

test('KH-04 Tài khoản đối tác (Brand) không xem được danh sách kế hoạch', async () => {
  const r = await call(monthlyPlansGet(req('/api/monthly-plans', 'GET', brandPartner)));
  assert.equal(r.status, 401);
});

test('KH-05 Người ngoài gian không thấy kế hoạch của gian trong danh sách', async () => {
  const ctx = await created('2027/04');
  const store = await storeById(STORE_TIKTOK);
  const r = await call(monthlyPlansGet(req('/api/monthly-plans', 'GET', await outsider(store))));
  assertOk(r, 'Danh sách kế hoạch');
  assert.ok(!r.body.plans.some((p: { plan: InputPlanBreakdownState }) => p.plan.id === ctx.plan.id), 'Kế hoạch gian khác bị lộ cho người ngoài');
});

test('KH-06 Phân rã: tổng theo tuần khớp 4.1 theo từng bậc KL', async () => {
  const store = await storeById(STORE_TIKTOK);
  const p = withBreakdown(draftPlan(store, '2027/05'));
  const sumTier = (k: string) => p.weeklyBreakdown!.reduce((s, w) => s + ((w.tiers as Record<string, { qty: number }>)[k]?.qty || 0), 0);
  for (const [k, v] of Object.entries(p.reference41!.tiers!)) assert.equal(sumTier(k), v, `Bậc ${k} lệch 4.1`);
  assert.ok(checkBreakdownForSubmit(p).canSubmit);
});

test('KH-07 Gửi duyệt khi 4.1 chưa "Chốt plan" bị chặn ở máy chủ', async () => {
  const ctx = await created('2027/06');
  const base = withBreakdown(ctx.plan);
  assertBlocked(await put(ctx, booking, { ...base, reference41: { ...base.reference41!, isGrowthLocked: false }, status: 'PENDING_PRE_APPROVAL' }), 'Gửi duyệt khi 4.1 chưa chốt', /Chốt plan/, 400);
});

test('KH-08 Có 4.1 nhưng chưa phân rã tuần thì không gửi duyệt được', async () => {
  const ctx = await created('2027/07');
  assertBlocked(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL', weeklyBreakdown: [] }), 'Gửi duyệt khi chưa phân rã', /phân rã/i, 400);
});

test('KH-09 Phân rã lệch 4.1: phải ghi giải trình mới gửi duyệt được', async () => {
  const ctx = await created('2027/08');
  const base = withBreakdown(ctx.plan);
  const skewed = { ...base, weeklyBreakdown: base.weeklyBreakdown!.map((w, i) => (i === 0 ? { ...w, tiers: { ...w.tiers, KL1: { qty: (w.tiers.KL1?.qty || 0) + 5, budgetNet: (w.tiers.KL1?.budgetNet || 0) + 5_000_000 } } } : w)) };
  const gate = checkBreakdownForSubmit(skewed);
  assert.equal(gate.canSubmit, false, 'Phân rã lệch 4.1 mà vẫn gửi được');
  assertBlocked(await put(ctx, booking, { ...skewed, status: 'PENDING_PRE_APPROVAL' }), 'Gửi duyệt khi lệch 4.1 chưa giải trình', undefined, 400);
  if (/giải trình/.test(gate.reason || '')) {
    assertOk(await put(ctx, booking, { ...skewed, breakdownNote: 'Brand dồn KL1 vào tuần đầu chạy sale', status: 'PENDING_PRE_APPROVAL' }), 'Gửi duyệt khi đã giải trình');
  }
});

test('KH-10 Booking cùng làm không bấm gửi duyệt và không sửa chỉ tiêu gốc', async () => {
  const ctx = await created('2027/09');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Booking lưu phân rã');
  assertBlocked(await put(ctx, coBooking, { status: 'PENDING_PRE_APPROVAL' }), 'Booking cùng làm gửi duyệt', undefined, 403);
  assertBlocked(await put(ctx, coBooking, { totalTargetBudget: 999_000_000 }), 'Booking cùng làm sửa ngân sách gốc', undefined, 403);
});

test('KH-11 Gian có Leader: không gửi thẳng lên Giám đốc; Booking không tự sơ duyệt', async () => {
  const ctx = await created('2027/10');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Lưu phân rã');
  assertBlocked(await put(ctx, booking, { status: 'PENDING_APPROVAL' }), 'Gửi vượt cấp Leader', /sơ duyệt/);
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Gửi Leader');
  assertBlocked(await put(ctx, booking, { status: 'PENDING_APPROVAL' }), 'Booking tự sơ duyệt', undefined, 403);
});

test('KH-12 Leader chỉ sơ duyệt, không được sửa số liệu và không được duyệt thay Giám đốc', async () => {
  const ctx = await created('2027/11');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Lưu phân rã');
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Gửi Leader');
  assertBlocked(await put(ctx, leader, { status: 'PENDING_APPROVAL', totalTargetBudget: 200_000_000 }), 'Leader sửa ngân sách khi sơ duyệt', undefined, 403);
  assertOk(await put(ctx, leader, { status: 'PENDING_APPROVAL', leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' }), 'Leader sơ duyệt');
  assertBlocked(await put(ctx, leader, { status: 'IN_EXECUTION', isVersionLocked: true }), 'Leader duyệt cấp Giám đốc', undefined, 403);
});

test('KH-13 Leader yêu cầu sửa → Booking sửa và gửi lại → được duyệt', async () => {
  const ctx = await created('2027/12');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Lưu phân rã');
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Gửi Leader');
  assertOk(await put(ctx, leader, { status: 'REVISION_REQUESTED', leaderApprovalStatus: 'YÊU_CẦU_SỬA' }), 'Leader trả về');
  assertOk(await put(ctx, booking, { notes: 'Đã sửa theo góp ý Leader' }), 'Booking sửa khi bị trả về');
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Booking gửi lại');
  assertOk(await put(ctx, leader, { status: 'PENDING_APPROVAL', leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' }), 'Leader sơ duyệt lại');
  assertOk(await put(ctx, director, { status: 'IN_EXECUTION', isVersionLocked: true }), 'Giám đốc duyệt');
});

test('KH-14 Giám đốc trả về kế hoạch đang chờ duyệt', async () => {
  const ctx = await created('2028/01');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Lưu phân rã');
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Gửi Leader');
  assertOk(await put(ctx, leader, { status: 'PENDING_APPROVAL' }), 'Leader sơ duyệt');
  assertOk(await put(ctx, director, { status: 'REVISION_REQUESTED' }), 'Giám đốc trả về');
  assert.equal(ctx.plan.status, 'REVISION_REQUESTED');
});

test('KH-15 Đã duyệt & khóa phiên bản: Booking không sửa được chỉ tiêu, không tự mở khóa', async () => {
  const store = await storeById(STORE_TIKTOK);
  const ctx = await approvedPlan(store, '2028/02');
  assertBlocked(await put(ctx, booking, { totalTargetBudget: 150_000_000 }), 'Sửa ngân sách sau khi khóa', /đã chốt/, 423);
  assertBlocked(await put(ctx, booking, { isVersionLocked: false }), 'Booking tự mở khóa phiên bản');
});

test('KH-16 Đã duyệt nhưng không khóa phiên bản (duyệt qua API): Booking vẫn không được đổi ngân sách đã duyệt', async () => {
  const ctx = await created('2028/03');
  assertOk(await put(ctx, booking, withBreakdown(ctx.plan)), 'Lưu phân rã');
  assertOk(await put(ctx, booking, { status: 'PENDING_PRE_APPROVAL' }), 'Gửi Leader');
  assertOk(await put(ctx, leader, { status: 'PENDING_APPROVAL' }), 'Leader sơ duyệt');
  assertOk(await put(ctx, director, { status: 'APPROVED' }), 'Giám đốc duyệt');
  assertBlocked(await put(ctx, booking, { totalTargetBudget: 500_000_000 }), 'Booking đổi ngân sách sau khi Giám đốc duyệt (máy chủ không tự khóa khi duyệt)');
});

test('KH-17 Hai người sửa cùng lúc: bản lưu sau bằng revision cũ báo xung đột', async () => {
  const ctx = await created('2028/04');
  const stale = ctx.revision;
  assertOk(await put(ctx, booking, { notes: 'Bản 1' }), 'Lưu bản 1');
  assertBlocked(await api.putPlan(booking, { ...ctx.plan, notes: 'Bản cũ' }, stale), 'Lưu bằng revision cũ', undefined, 409);
});
