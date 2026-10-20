import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as meRoute } from '../src/app/api/auth/me/route';
import { POST as sandboxPost } from '../src/app/api/auth/lark/sandbox/route';
import { POST as logoutPost } from '../src/app/api/auth/logout/route';
import { GET as accessPolicyGet, PUT as accessPolicyPut } from '../src/app/api/admin/access-policy/route';
import { GET as masterDataGet } from '../src/app/api/master-data/route';
import { GET as monthlyPlansGet, POST as monthlyPlansPost } from '../src/app/api/monthly-plans/route';
import { PUT as monthlyPlanPut } from '../src/app/api/monthly-plans/[id]/route';
import { GET as planMessagesGet, POST as planMessagesPost } from '../src/app/api/monthly-plans/[id]/messages/route';
import { GET as kalodataStatusGet } from '../src/app/api/integrations/kalodata/status/route';
import { GET as larkbasePlansGet } from '../src/app/api/integrations/larkbase/booking-plans/route';
import { GET as adsReportsGet } from '../src/app/api/ads-reports/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';
import type { UserProfile, InputPlanBreakdownState } from '../src/lib/types';

function createReq(url: string, method = 'GET', actor?: UserProfile | null, body?: unknown, origin = 'http://localhost:3000') {
  const headers: Record<string, string> = { origin };
  if (actor) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}`;
  }
  if (body) {
    headers['content-type'] = 'application/json';
  }
  return new NextRequest(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

test('E2E Auth Flow: Xác thực phiên, đăng nhập Sandbox và Đăng xuất', async () => {
  // 1. Unauthenticated in development -> Auto login default BOD user
  const reqUnauth = createReq('http://localhost:3000/api/auth/me');
  const resUnauth = await meRoute(reqUnauth);
  assert.equal(resUnauth.status, 200);
  const dataUnauth = await resUnauth.json();
  assert.equal(dataUnauth.authenticated, true);
  assert.equal(dataUnauth.user.id, USERS[0].id);

  // 2. Login via Sandbox as Specialist (Lê Phương Thảo)
  const specialist = USERS.find(u => u.name.includes('Lê Phương Thảo')) || USERS[1];
  const reqSandbox = createReq('http://localhost:3000/api/auth/lark/sandbox', 'POST', null, {
    userId: specialist.id
  });
  const resSandbox = await sandboxPost(reqSandbox);
  assert.equal(resSandbox.status, 200);
  const dataSandbox = await resSandbox.json();
  assert.equal(dataSandbox.success, true);
  assert.equal(dataSandbox.user.id, specialist.id);

  // 3. Authenticated session check
  const reqAuth = createReq('http://localhost:3000/api/auth/me', 'GET', specialist);
  const resAuth = await meRoute(reqAuth);
  assert.equal(resAuth.status, 200);
  const dataAuth = await resAuth.json();
  assert.equal(dataAuth.authenticated, true);
  assert.equal(dataAuth.user.id, specialist.id);

  // 4. Logout
  const reqLogout = createReq('http://localhost:3000/api/auth/logout', 'POST', specialist);
  const resLogout = await logoutPost(reqLogout);
  assert.equal(resLogout.status, 200);
});

test('E2E RBAC & Access Policy: Chuyên viên bị chặn vào cấu hình quyền, Quản trị viên truy cập hợp lệ', async () => {
  const admin = USERS.find(u => u.role === 'ADMIN') || USERS[0];
  const specialist = USERS.find(u => u.role === 'BOOKING_MEMBER') || USERS[1];

  // Specialist tries to access access-policy (should receive stripped/masked policy data)
  const reqSpec = createReq('http://localhost:3000/api/admin/access-policy', 'GET', specialist);
  const resSpec = await accessPolicyGet(reqSpec);
  assert.equal(resSpec.status, 200);
  const dataSpec = await resSpec.json();
  // For non-admin, internalStaff and deptRules are stripped
  assert.deepEqual(dataSpec.data.internalStaff, []);
  assert.deepEqual(dataSpec.data.deptRules, []);

  // Specialist attempts PUT (should be 403 Forbidden)
  const reqSpecPut = createReq('http://localhost:3000/api/admin/access-policy', 'PUT', specialist, {
    revision: dataSpec.revision,
    data: dataSpec.data
  });
  const resSpecPut = await accessPolicyPut(reqSpecPut);
  assert.equal(resSpecPut.status, 403);

  // Admin GET access-policy (has full details)
  const reqAdmin = createReq('http://localhost:3000/api/admin/access-policy', 'GET', admin);
  const resAdmin = await accessPolicyGet(reqAdmin);
  assert.equal(resAdmin.status, 200);
  const dataAdmin = await resAdmin.json();
  assert.ok(dataAdmin.data.internalStaff.length > 0);
  assert.ok(dataAdmin.data.matrix.length > 0);
});

test('E2E Master Data Catalog: Tải danh mục 69 gian hàng B2C và cấu hình Master', async () => {
  const admin = USERS.find(u => u.role === 'ADMIN') || USERS[0];
  const req = createReq('http://localhost:3000/api/master-data', 'GET', admin);
  const res = await masterDataGet(req);
  assert.equal(res.status, 200);
  const catalog = await res.json();
  assert.ok(catalog.data.brands.length >= 40);
  assert.ok(catalog.data.stores.length >= 60);
  assert.ok(catalog.data.castTiers.length >= 5);
  assert.equal(catalog.canEdit, true);
});

test('E2E Monthly Planning Lifecycle: Tạo kế hoạch, cập nhật chỉ tiêu và thảo luận đối soát', async () => {
  const admin = USERS.find(u => u.role === 'ADMIN') || USERS[0];
  const specialist = USERS.find(u => u.role === 'BOOKING_MEMBER') || USERS[1];
  
  // 1. List plans as specialist (should be allowed to view scoped plans)
  const reqList = createReq('http://localhost:3000/api/monthly-plans', 'GET', specialist);
  const resList = await monthlyPlansGet(reqList);
  assert.equal(resList.status, 200);
  const { plans } = await resList.json();
  assert.ok(Array.isArray(plans));

  // 2. Member cannot create target plans directly (RBAC check: 403 Forbidden)
  const testPlanState: InputPlanBreakdownState = {
    id: `TEST-PLAN-${Date.now()}`,
    title: 'Kế hoạch mẫu E2E Test',
    brandName: 'ClubClio',
    month: '2026/10',
    week: 'W40',
    pic: specialist.name,
    bookingLeader: 'Nguyễn Thị Ngọc Tâm',
    totalTargetBudget: 100000000,
    totalTargetContents: 40,
    targetGmv: 500000000,
    cancellationRate: 8,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const reqCreateDenied = createReq('http://localhost:3000/api/monthly-plans', 'POST', specialist, {
    plan: testPlanState
  });
  const resCreateDenied = await monthlyPlansPost(reqCreateDenied);
  assert.equal(resCreateDenied.status, 403);

  // 3. Admin creates plan successfully (201 Created)
  const reqCreate = createReq('http://localhost:3000/api/monthly-plans', 'POST', admin, {
    plan: testPlanState
  });
  const resCreate = await monthlyPlansPost(reqCreate);
  assert.ok([200, 201].includes(resCreate.status));
  const createdRecord = await resCreate.json();
  const createdId = createdRecord.plan?.id || testPlanState.id;
  const updatedState: InputPlanBreakdownState = {
    ...testPlanState,
    id: createdId,
    totalTargetBudget: 105000000
  };
  const updateBody = {
    plan: updatedState,
    expectedRevision: createdRecord.revision
  };
  const reqUpdate = createReq(`http://localhost:3000/api/monthly-plans/${encodeURIComponent(createdId)}`, 'PUT', admin, updateBody);
  const resUpdate = await monthlyPlanPut(reqUpdate, { params: Promise.resolve({ id: createdId }) });
  if (resUpdate.status !== 200) {
    assert.fail(`Update failed with status ${resUpdate.status}: ${await resUpdate.text()}`);
  }
  assert.equal(resUpdate.status, 200);

  // 5. Send discussion message / audit comment
  const reqMsgPost = createReq(`http://localhost:3000/api/monthly-plans/${encodeURIComponent(createdId)}/messages`, 'POST', admin, {
    clientId: `msg-${Date.now()}`,
    content: 'Đã phân bổ hạn mức chi tiết cho gian hàng ClubClio tháng 10/2026.',
    type: 'COMMENT'
  });
  const resMsgPost = await planMessagesPost(reqMsgPost, { params: Promise.resolve({ id: createdId }) });
  assert.ok([200, 201].includes(resMsgPost.status));

  // 6. Read discussion messages
  const reqMsgGet = createReq(`http://localhost:3000/api/monthly-plans/${encodeURIComponent(createdId)}/messages`, 'GET', admin);
  const resMsgGet = await planMessagesGet(reqMsgGet, { params: Promise.resolve({ id: createdId }) });
  assert.equal(resMsgGet.status, 200);
  const msgData = await resMsgGet.json();
  assert.ok(msgData.messages.length >= 1);
  assert.equal(msgData.messages[msgData.messages.length - 1].content.includes('Đã phân bổ'), true);
});

test('E2E Integrations: Kalodata, Larkbase và Ads Reports API', async () => {
  const admin = USERS.find(u => u.role === 'ADMIN') || USERS[0];

  // 1. Kalodata connection status
  const reqKalodata = createReq('http://localhost:3000/api/integrations/kalodata/status', 'GET', admin);
  const resKalodata = await kalodataStatusGet(reqKalodata);
  assert.equal(resKalodata.status, 200);
  const kaloData = await resKalodata.json();
  assert.equal(kaloData.success, true);
  assert.ok('connected' in kaloData.data || 'status' in kaloData.data);

  // 2. Larkbase sync records list
  const reqLarkbase = createReq('http://localhost:3000/api/integrations/larkbase/booking-plans', 'GET', admin);
  const resLarkbase = await larkbasePlansGet(reqLarkbase);
  assert.equal(resLarkbase.status, 200);

  // 3. Ads reports endpoint
  const reqAds = createReq('http://localhost:3000/api/ads-reports', 'GET', admin);
  const resAds = await adsReportsGet(reqAds);
  assert.equal(resAds.status, 200);
});
