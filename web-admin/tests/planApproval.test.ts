import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalApproval, canFinalApprovePlan, deriveSignOff } from '../src/lib/planApproval';
import type { InputPlanBreakdownState } from '../src/lib/types';

// Dữ liệu tổng hợp, chỉ đủ các trường mà logic duyệt chốt đọc.
const plan = (over: Partial<InputPlanBreakdownState>): InputPlanBreakdownState =>
  ({
    id: 'PLAN-TEST-1',
    storeName: 'Gian thu nghiem_Shopee_E2E',
    brandName: 'Brand thu nghiem',
    status: 'PENDING_APPROVAL',
    totalTargetBudget: 100_000_000,
    totalTargetContents: 50,
    targetGmv: 400_000_000,
    items: [],
    ...over,
  }) as InputPlanBreakdownState;

test('gian Shopee không qua Trưởng nhóm: đã gửi duyệt thì duyệt chốt được', () => {
  assert.deepEqual(canFinalApprovePlan(plan({})), { ok: true });
});

test('bản nháp chưa gửi duyệt thì chưa duyệt chốt được', () => {
  const r = canFinalApprovePlan(plan({ status: 'DRAFT' }));
  assert.equal(r.ok, false);
  assert.match(r.reason || '', /Booking/);
});

test('gian có Trưởng nhóm: chờ sơ duyệt thì chưa duyệt chốt, sơ duyệt xong thì được', () => {
  const base = { storeName: 'Gian co leader', bookingLeader: 'Nguyễn Thị Ngọc Tâm', status: 'PENDING_PRE_APPROVAL' as const };
  const waiting = canFinalApprovePlan(plan(base));
  assert.equal(waiting.ok, false);
  assert.match(waiting.reason || '', /Trưởng nhóm/);
  assert.deepEqual(canFinalApprovePlan(plan({ ...base, leaderApprovalStatus: 'ĐÃ_SƠ_DUYỆT' })), { ok: true });
});

test('kế hoạch đã khóa hoặc đang thực thi không duyệt chốt lại', () => {
  assert.equal(canFinalApprovePlan(plan({ status: 'IN_EXECUTION' })).ok, false);
  assert.equal(canFinalApprovePlan(plan({ isVersionLocked: true })).ok, false);
});

test('duyệt chốt: IN_EXECUTION, khóa phiên bản, thêm bản lưu, ghi chữ ký người duyệt', () => {
  const existing = { id: 'SNAP-OLD', versionCode: 'v0.9' } as unknown as NonNullable<InputPlanBreakdownState['versionSnapshots']>[number];
  const p = plan({ currentVersionCode: 'v1.2', versionSnapshots: [existing] });
  const now = '2026-10-31T10:00:00.000Z';
  const { patch, log } = buildFinalApproval({ plan: p, author: 'Người duyệt thử', note: 'Đạt', now });

  assert.equal(patch.status, 'IN_EXECUTION');
  assert.equal(patch.isVersionLocked, true);
  assert.equal(patch.approvedBy, 'Người duyệt thử');
  assert.equal(patch.approvedAt, now);
  assert.equal(patch.multiPartySignOff?.leadB2c.confirmed, true);
  assert.equal(patch.multiPartySignOff?.leadB2c.confirmedBy, 'Người duyệt thử');
  assert.equal(patch.multiPartySignOff?.leadB2c.note, 'Đạt');
  // Giữ bản lưu cũ, thêm đúng một bản mới ở cuối.
  assert.equal(patch.versionSnapshots?.length, 2);
  assert.equal(patch.versionSnapshots?.[0], existing);
  const snap = patch.versionSnapshots?.[1];
  assert.equal(snap?.versionCode, 'v1.2');
  assert.equal(snap?.status, 'LOCKED');
  assert.equal(snap?.totalTargetBudget, 100_000_000);
  assert.match(log, /khóa phiên bản v1\.2/);
});

test('deriveSignOff giữ chữ ký đã có, không suy lại', () => {
  const signed = { booking: { confirmed: true, confirmedBy: 'A' }, leadB2c: { confirmed: false, confirmedBy: 'B' } };
  const p = plan({ multiPartySignOff: signed as unknown as InputPlanBreakdownState['multiPartySignOff'] });
  assert.equal(deriveSignOff(p), p.multiPartySignOff);
});
