import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { EMPTY_STORE_PICS, isStorePic, setStorePics, suggestPicsFromLegacy } from '../src/lib/storePics';
import { isPlanManagedByUser, isStoreManagedByUser } from '../src/lib/rbacScope';
import { DEFAULT_MASTER_CATALOG } from '../src/lib/masterCatalog';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import { GET as getStorePics, PUT as putStorePics } from '../src/app/api/store-pics/route';
import { GET as getCatalog } from '../src/app/api/master-data/route';
import type { InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../src/lib/types';

const stores = new Set(['S1']);

test('Danh sách PIC: chuẩn hóa email, bỏ trùng, từ chối gian lạ hoặc thiếu email', () => {
  const data = setStorePics(EMPTY_STORE_PICS, 'S1', [{ email: ' A@Upbase.vn ', name: 'A' }, { email: 'a@upbase.vn', name: 'A trùng' }], { name: 'TP' }, stores);
  assert.deepEqual(data.S1.pics, [{ email: 'a@upbase.vn', name: 'A' }]);
  assert.equal(isStorePic(data.S1.pics, 'A@UPBASE.VN'), true);
  assert.throws(() => setStorePics(EMPTY_STORE_PICS, 'S9', [], { name: 'TP' }, stores), /không tồn tại/);
  assert.throws(() => setStorePics(EMPTY_STORE_PICS, 'S1', [{ email: '', name: 'X' }], { name: 'TP' }, stores), /Thiếu email/);
});

test('Gợi ý PIC từ các trường tên cũ trên hồ sơ gian', () => {
  const directory = [{ name: 'Khánh Vy', email: 'vy@upbase.vn' }, { name: 'Ngọc Tâm', email: 'tam@upbase.vn' }];
  const pics = suggestPicsFromLegacy({ b2cOwnerName: 'Khánh Vy, Người Lạ', bookingLeader: 'Ngọc Tâm', primaryPic: 'Khánh Vy' }, n => directory.find(d => d.name === n));
  assert.deepEqual(pics.map(p => p.email), ['vy@upbase.vn', 'tam@upbase.vn']);
});

test('rbacScope: gian có danh sách PIC thì chỉ danh sách quyết định; PIC cũ vẫn xem kế hoạch có tên mình', () => {
  const store = { id: 'S1', storeName: 'S1_TTS', brandName: 'BrandX', b2cOwnerName: 'Người Cũ', accountOwnerName: '', pics: [{ email: 'a@upbase.vn', name: 'A' }] } as unknown as StorePortfolioItem;
  const oldPic = { id: 'u-old', name: 'Người Cũ', email: 'old@upbase.vn', role: 'BOOKING_MEMBER' } as UserProfile;
  const pic = { id: 'u-a', name: 'A', email: 'a@upbase.vn', role: 'BOOKING_MEMBER' } as UserProfile;
  assert.equal(isStoreManagedByUser(store, oldPic), false);
  assert.equal(isStoreManagedByUser({ ...store, pics: undefined }, oldPic), true, 'gian chưa có danh sách giữ cách xét cũ');
  assert.equal(isStoreManagedByUser({ ...store, pics: [] }, pic), false, 'gỡ hết PIC thì không ai còn quyền theo gian');
  assert.equal(isStoreManagedByUser(store, pic), true);

  const oldPlan = { id: 'p9', storeId: 'S1', storeName: 'S1_TTS', month: '2026/09', pic: 'Người Cũ' } as unknown as InputPlanBreakdownState;
  const newPlan = { id: 'p11', storeId: 'S1', storeName: 'S1_TTS', month: '2026/11', pic: 'A' } as unknown as InputPlanBreakdownState;
  assert.equal(isPlanManagedByUser(oldPlan, oldPic, [store]), true, 'PIC cũ xem lại kế hoạch tháng mình làm');
  assert.equal(isPlanManagedByUser(newPlan, oldPic, [store]), false);
  assert.equal(isPlanManagedByUser(oldPlan, pic, [store]), true, 'PIC hiện tại xem toàn bộ kế hoạch của gian');
});

// ---------- API ----------
before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test', AUTH_SECRET: 'isolated-store-pic-tests',
    SHARED_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'store-pics-')),
    BRAND_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'store-pics-brands-')),
  });
  delete process.env.DATABASE_URL;
  delete process.env.SHARED_STORAGE;
});
const lead = USERS.find(u => u.role === 'MANAGER')!;
const member = { ...lead, id: 'pic-member', email: 'member@example.test', name: 'Member Test', role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: [], linkedEntityName: undefined, allowedStoreNames: [] };
function req(user: typeof lead, method = 'GET', body?: unknown, url = '/api/store-pics') {
  return new NextRequest(`http://localhost${url}`, { method, headers: { origin: 'http://localhost', cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(user)}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}

test('API: Trưởng phòng gắn PIC cho gian; nhân viên được gắn thấy đúng gian đó', async () => {
  const store = DEFAULT_MASTER_CATALOG.stores[0];
  const pics = [{ email: member.email, name: member.name }];

  assert.equal((await putStorePics(req(member, 'PUT', { revision: 0, storeId: store.id, pics }))).status, 403);
  const res = await putStorePics(req(lead, 'PUT', { revision: 0, storeId: store.id, pics }));
  assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
  assert.equal((await putStorePics(req(lead, 'PUT', { revision: 0, storeId: store.id, pics }))).status, 409, 'revision cũ bị từ chối');
  assert.equal((await putStorePics(req(lead, 'PUT', { revision: 1, storeId: 'khong-ton-tai', pics }))).status, 422);

  const mine = await (await getStorePics(req(member))).json();
  assert.equal(mine.canManage, false);
  assert.deepEqual(Object.keys(mine.data), [store.id]);

  const catalog = await (await getCatalog(req(member, 'GET', undefined, '/api/master-data'))).json();
  assert.deepEqual(catalog.data.stores.map((s: StorePortfolioItem) => s.id), [store.id]);

  // Gỡ khỏi gian thì mất quyền ngay ở lần đọc sau
  assert.equal((await putStorePics(req(lead, 'PUT', { revision: 1, storeId: store.id, pics: [] }))).status, 200);
  const after = await (await getCatalog(req(member, 'GET', undefined, '/api/master-data'))).json();
  assert.equal(after.data.stores.length, 0);
});
