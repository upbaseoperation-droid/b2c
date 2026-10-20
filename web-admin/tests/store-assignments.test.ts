import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  EMPTY_STORE_ASSIGNMENTS,
  addDays,
  decideStoreAccess,
  handover,
  lockMonth,
  monthOfDate,
  monthRange,
  saveMonthDraft,
  todayVN,
  type StoreAssignmentData,
} from '../src/lib/storeAssignments';
import { canWriteStoreData, isPlanManagedByUser, isStoreManagedByUser } from '../src/lib/rbacScope';
import { DEFAULT_MASTER_CATALOG } from '../src/lib/masterCatalog';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import { GET as getAssignments, POST as postAssignments } from '../src/app/api/store-assignments/route';
import { GET as getCatalog } from '../src/app/api/master-data/route';
import type { InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../src/lib/types';

const NOW = new Date('2026-10-20T03:00:00Z'); // 20/10/2026 10:00 giờ VN
const manager = { email: 'lead@upbase.vn', name: 'Trưởng phòng' };
const stores = new Set(['S1', 'S2']);
const A = 'a@upbase.vn';
const B = 'b@upbase.vn';

function lockedNovember(): StoreAssignmentData {
  let data = saveMonthDraft(EMPTY_STORE_ASSIGNMENTS, '2026/11', [
    { storeId: 'S1', role: 'B2C_OWNER', staffEmail: 'A@upbase.vn', staffName: 'A' },
    { storeId: 'S2', role: 'B2C_OWNER', staffEmail: B, staffName: 'B' },
  ], manager, stores, NOW);
  data = lockMonth(data, '2026/11', manager, NOW);
  return data;
}

test('Khoảng ngày của tháng và quy đổi tháng', () => {
  assert.deepEqual(monthRange('2026/02'), { start: '2026-02-01', end: '2026-02-28' });
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(monthOfDate('2026-11-15'), '2026/11');
  assert.equal(todayVN(new Date('2026-10-31T18:30:00Z')), '2026-11-01');
});

test('Chốt tháng chỉ trước ngày 01 và sinh dòng hiệu lực từ ngày 01', () => {
  const data = lockedNovember();
  assert.equal(data.months['2026/11'].status, 'LOCKED');
  const s1 = data.assignments.find(a => a.storeId === 'S1')!;
  assert.equal(s1.staffEmail, A, 'email được chuẩn hóa chữ thường');
  assert.equal(s1.validFrom, '2026-11-01');
  assert.equal(s1.validTo, null);

  const late = new Date('2026-11-02T03:00:00Z');
  assert.throws(() => saveMonthDraft(EMPTY_STORE_ASSIGNMENTS, '2026/11', [], manager, stores, late), /đã bắt đầu/);
  assert.throws(() => lockMonth(data, '2026/11', manager, NOW), /đã chốt/);
  assert.throws(() => saveMonthDraft(data, '2026/11', [], manager, stores, NOW), /đã chốt/);
});

test('Chốt tháng sau: giữ người cũ thì nối tiếp, đổi người thì đóng dòng cũ ở ngày cuối tháng trước', () => {
  let data = lockedNovember();
  data = saveMonthDraft(data, '2026/12', [
    { storeId: 'S1', role: 'B2C_OWNER', staffEmail: A, staffName: 'A' },
    { storeId: 'S2', role: 'B2C_OWNER', staffEmail: A, staffName: 'A' },
  ], manager, stores, NOW);
  data = lockMonth(data, '2026/12', manager, NOW);
  const s1 = data.assignments.filter(a => a.storeId === 'S1');
  assert.equal(s1.length, 1, 'A giữ S1 nên không sinh dòng mới');
  const s2b = data.assignments.find(a => a.storeId === 'S2' && a.staffEmail === B)!;
  assert.equal(s2b.validTo, '2026-11-30');
  const s2a = data.assignments.find(a => a.storeId === 'S2' && a.staffEmail === A)!;
  assert.equal(s2a.validFrom, '2026-12-01');
  // Không chốt ngược tháng trước khi tháng sau đã chốt
  const draftOct = { ...data, months: { ...data.months, '2026/10': { month: '2026/10', status: 'DRAFT' as const, rows: [], updatedBy: 'x', updatedAt: '' } } };
  assert.throws(() => lockMonth(draftOct, '2026/10', manager, new Date('2026-09-01T00:00:00Z')), /không chốt ngược/);
});

test('Bàn giao giữa tháng: không lùi ngày, đóng dòng cũ trước ngày hiệu lực', () => {
  const data = lockedNovember();
  const mid = new Date('2026-11-10T03:00:00Z');
  assert.throws(() => handover(data, { storeId: 'S1', role: 'B2C_OWNER', fromEmail: A, toEmail: B, effectiveDate: '2026-11-05' }, manager, stores, mid), /lùi ngày/);
  const next = handover(data, { storeId: 'S1', role: 'B2C_OWNER', fromEmail: A, toEmail: B, toName: 'B', effectiveDate: '2026-11-15' }, manager, stores, mid);
  const rows = next.assignments.filter(a => a.storeId === 'S1');
  assert.equal(rows.find(a => a.staffEmail === A)!.validTo, '2026-11-14');
  assert.equal(rows.find(a => a.staffEmail === B)!.validFrom, '2026-11-15');
  assert.throws(() => handover(next, { storeId: 'S1', role: 'B2C_OWNER', fromEmail: A, toEmail: B, effectiveDate: '2026-11-20' }, manager, stores, mid), /Không tìm thấy/);
});

test('PIC cũ chỉ xem tháng mình phụ trách, mất quyền ghi; PIC mới xem toàn bộ và ghi được', () => {
  const data = handover(lockedNovember(), { storeId: 'S1', role: 'B2C_OWNER', fromEmail: A, toEmail: B, effectiveDate: '2026-11-15' }, manager, stores, new Date('2026-11-10T03:00:00Z'));
  const rows = data.assignments.filter(a => a.storeId === 'S1');
  const dec = '2026-12-05';
  assert.deepEqual(decideStoreAccess(rows, A, { month: '2026/11', today: dec }), { managed: true, read: true, write: false });
  assert.deepEqual(decideStoreAccess(rows, A, { month: '2026/12', today: dec }), { managed: true, read: false, write: false });
  assert.deepEqual(decideStoreAccess(rows, A, { today: dec }), { managed: true, read: true, write: false }, 'vẫn thấy gian để mở dữ liệu cũ');
  assert.deepEqual(decideStoreAccess(rows, B, { month: '2026/10', today: dec }), { managed: true, read: true, write: false }, 'PIC hiện tại xem lịch sử, không sửa tháng không phụ trách');
  assert.deepEqual(decideStoreAccess(rows, B, { month: '2026/12', today: dec }), { managed: true, read: true, write: true });
  assert.deepEqual(decideStoreAccess(rows, 'other@upbase.vn', { today: dec }), { managed: true, read: false, write: false });
  // Trước khi tháng bắt đầu, PIC sắp nhận đã được chuẩn bị kế hoạch tháng mới
  assert.equal(decideStoreAccess(lockedNovember().assignments, A, { month: '2026/11', today: '2026-10-25' }).write, true);
});

test('rbacScope: gian đã có phân công bỏ qua so khớp tên PIC cũ', () => {
  const rows = lockedNovember().assignments.filter(a => a.storeId === 'S1');
  const store = { id: 'S1', storeName: 'S1_TTS', brandName: 'BrandX', b2cOwnerName: 'Người Cũ', accountOwnerName: '', assignments: rows } as unknown as StorePortfolioItem;
  const legacy = { id: 'u-old', name: 'Người Cũ', email: 'old@upbase.vn', role: 'BOOKING_MEMBER' } as UserProfile;
  const pic = { id: 'u-a', name: 'A', email: A, role: 'BOOKING_MEMBER' } as UserProfile;
  assert.equal(isStoreManagedByUser(store, legacy), false);
  assert.equal(isStoreManagedByUser({ ...store, assignments: undefined }, legacy), true, 'gian chưa chuyển đổi giữ cách xét cũ');
  assert.equal(isStoreManagedByUser(store, pic), true);
  assert.equal(canWriteStoreData(store, pic, '2026/11'), true);
  const plan = { id: 'p', storeId: 'S1', storeName: 'S1_TTS', month: '2026/09', pic: 'Người Cũ' } as unknown as InputPlanBreakdownState;
  assert.equal(isPlanManagedByUser(plan, legacy, [store]), false, 'tên trong plan.pic không cấp quyền khi gian đã phân công');
});

// ---------- API ----------
before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test', AUTH_SECRET: 'isolated-store-assignment-tests',
    SHARED_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'store-assign-')),
    BRAND_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'store-assign-brands-')),
  });
  delete process.env.DATABASE_URL;
  delete process.env.SHARED_STORAGE;
});
const lead = USERS.find(u => u.role === 'MANAGER')!;
const member = { ...lead, id: 'asg-member', email: 'member@example.test', name: 'Member Test', role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: [], linkedEntityName: undefined, allowedStoreNames: [] };
function req(user: typeof lead, method = 'GET', body?: unknown, url = '/api/store-assignments') {
  return new NextRequest(`http://localhost${url}`, { method, headers: { origin: 'http://localhost', cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(user)}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}

test('API: Trưởng phòng lập nháp, chốt tháng sau; nhân viên chỉ thấy gian được phân công', async () => {
  const store = DEFAULT_MASTER_CATALOG.stores[0];
  const today = todayVN();
  const nextMonth = monthOfDate(addDays(monthRange(monthOfDate(today)).end, 1));

  assert.equal((await postAssignments(req(member, 'POST', { revision: 0, command: { action: 'lock', month: nextMonth } }))).status, 403);

  let res = await postAssignments(req(lead, 'POST', { revision: 0, command: { action: 'saveDraft', month: nextMonth, rows: [{ storeId: store.id, role: 'B2C_OWNER', staffEmail: member.email, staffName: member.name }] } }));
  assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
  res = await postAssignments(req(lead, 'POST', { revision: 1, command: { action: 'lock', month: nextMonth } }));
  assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
  assert.equal((await postAssignments(req(lead, 'POST', { revision: 1, command: { action: 'lock', month: nextMonth } }))).status, 409, 'revision cũ bị từ chối');
  assert.equal((await postAssignments(req(lead, 'POST', { revision: 2, command: { action: 'lock', month: nextMonth } }))).status, 422, 'chốt lần hai bị từ chối');

  const mine = await (await getAssignments(req(member))).json();
  assert.equal(mine.canManage, false);
  assert.equal(mine.data.assignments.length, 1);
  assert.deepEqual(mine.data.months, {});

  const catalog = await (await getCatalog(req(member, 'GET', undefined, '/api/master-data'))).json();
  assert.deepEqual(catalog.data.stores.map((s: StorePortfolioItem) => s.id), [store.id], 'nhân viên thấy đúng gian vừa được phân công');
});
