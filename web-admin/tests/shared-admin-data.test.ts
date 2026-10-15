import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { DEFAULT_MASTER_CATALOG } from '../src/lib/masterCatalog';
import { readRecord, updateRecord } from '../src/lib/server/sharedRecords';
import { defaultPolicy, effectiveUser } from '../src/lib/server/accessPolicy';
import { validateCatalog } from '../src/lib/server/masterCatalogStore';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import { GET as getCatalog, PUT as saveCatalog } from '../src/app/api/master-data/route';
import { GET as getProfiles, POST as saveSection } from '../src/app/api/brands/profiles/route';
import { PUT as savePolicy } from '../src/app/api/admin/access-policy/route';
import { emptyProfile, brandKey } from '../src/lib/brands/types';
import { saveProfile, listProfiles } from '../src/lib/brands/store';

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test', AUTH_SECRET: 'isolated-shared-data-tests',
    SHARED_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'shared-admin-')),
    BRAND_DATA_DIR: await mkdtemp(path.join(os.tmpdir(), 'shared-brands-')),
  });
  delete process.env.DATABASE_URL;
  delete process.env.SHARED_STORAGE;
});
const admin = USERS.find(u => u.role === 'ADMIN')!;
const member = { ...admin, id: 'isolated-member', email: 'member@example.test', name: 'Member Test', role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: [], linkedEntityName: undefined };
function req(url: string, user = admin, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${url}`, { method, headers: { origin: 'http://localhost', cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(user)}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
test('Lưu chung giữ dữ liệu và từ chối revision cũ', async () => {
  const first = await updateRecord('test-record', { amount: 1 }, 0, () => ({ amount: 0 }));
  assert.equal(first.revision, 1);
  assert.equal((await readRecord('test-record', { amount: 1 })).data.amount, 0);
  await assert.rejects(updateRecord('test-record', { amount: 1 }, 0, () => ({ amount: 2 })), /Tải lại/);
});
test('Danh mục mặc định hợp lệ và giữ hoa hồng/chi phí bằng 0', async () => {
  const data = structuredClone(DEFAULT_MASTER_CATALOG);
  data.products[0].commissionRate = 0;
  data.pillars[0].benchmarkUnitCost = 0;
  await validateCatalog(data, DEFAULT_MASTER_CATALOG);
  const response = await saveCatalog(req('/api/master-data', admin, 'PUT', { revision: 0, data }));
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const reloaded = await (await getCatalog(req('/api/master-data'))).json();
  assert.equal(reloaded.data.products[0].commissionRate, 0);
  assert.equal(reloaded.data.pillars[0].benchmarkUnitCost, 0);
});
test('Nhân viên chưa phân công nhận danh mục rỗng và không được ghi', async () => {
  const response = await getCatalog(req('/api/master-data', member));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.brands.length, 0);
  assert.equal(body.data.stores.length, 0);
  assert.equal(body.data.products.length, 0);
  assert.equal(body.canEdit, false);
  assert.equal((await saveCatalog(req('/api/master-data', member, 'PUT', { revision: 0, data: DEFAULT_MASTER_CATALOG }))).status, 403);
});
test('Đối tác chỉ đọc brand được giao, không nhận ratecard và lưu được WORKFLOW_RULES', async () => {
  const name = DEFAULT_MASTER_CATALOG.brands[0].name;
  const otherName = DEFAULT_MASTER_CATALOG.brands[1].name;
  const partner = { ...member, id: 'partner-scope', role: 'BRAND_PARTNER' as const, partnerType: 'BRAND' as const, assignedBrands: [name] };
  const profiles = await listProfiles();
  let own = profiles.find(p => p.key === brandKey(name)) || emptyProfile(name);
  own.ratecard = [{ grade: 'KL1', maxBudget: 999999 }];
  own = await saveProfile(own, own.revision);
  if (!profiles.some(p => p.key === brandKey(otherName))) await saveProfile(emptyProfile(otherName), 0);
  const response = await getProfiles(req('/api/brands/profiles', partner));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.profiles.length, 1);
  assert.equal(body.profiles[0].key, brandKey(name));
  assert.deepEqual(body.profiles[0].ratecard, []);
  const saved = await saveSection(req('/api/brands/profiles', partner, 'POST', { brandName: name, revision: own.revision, section: 'WORKFLOW_RULES', data: { operatingModel: 'FULLSTACK_CONTENT_BOOKING', projectTier: 'TIER_B_GROWTH' } }));
  assert.equal(saved.status, 200, JSON.stringify(await saved.clone().json()));
  const denied = await saveSection(req('/api/brands/profiles', partner, 'POST', { brandName: otherName, revision: 1, section: 'FAQS', data: { faqs: [] } }));
  assert.equal(denied.status, 403);
});
test('Lưu quyền ghi audit máy chủ và tài khoản bị tạm khóa mất quyền ở request tiếp theo', async () => {
  const data = structuredClone(defaultPolicy);
  data.internalStaff.push({ ...data.internalStaff[0], id: member.id, email: member.email, name: member.name, role: member.role, picBrands: [], status: 'SUSPENDED', canLogin: false });
  const response = await savePolicy(req('/api/admin/access-policy', admin, 'PUT', { revision: 0, data }));
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  const body = await response.json();
  assert.equal(body.data.audit.length, 1);
  assert.equal(body.data.audit[0].actorEmail, admin.email);
  assert.equal(await effectiveUser(member), null);
});
