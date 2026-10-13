import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as me } from '../src/app/api/auth/me/route';
import { GET as sandboxGet, POST as sandboxPost } from '../src/app/api/auth/lark/sandbox/route';
import { actorFromRequest } from '../src/lib/contracts/access';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { USERS } from '../src/lib/mockData';

test('Production không tự cấp quản trị hoặc cho đăng nhập giả lập', async () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: 'production' });
  try {
    const req = new NextRequest('http://localhost/api/auth/me');
    const result = await me(req);
    assert.equal(result.status, 401);
    assert.equal(result.cookies.get(SESSION_COOKIE_NAME), undefined);
    assert.equal((await sandboxGet(req)).status, 403);
    assert.equal((await sandboxPost(req)).status, 403);
  } finally { Object.assign(process.env, { NODE_ENV: previous }); }
});

test('Phiên Lark thực giữ danh tính và quyền hợp đồng từ máy chủ', async () => {
  const keys = ['NODE_ENV', 'AUTH_SECRET', 'LARK_TENANT_KEY', 'CONTRACT_ACCESS_JSON'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { NODE_ENV: 'production', AUTH_SECRET: 'test-only-secret', LARK_TENANT_KEY: 'tenant-test', CONTRACT_ACCESS_JSON: JSON.stringify([{ id: 'ou_test', name: 'Người thử', roles: ['LEGAL'], brands: ['Brand Test'] }]) });
  try {
    const user = { ...USERS[0], loginProvider: 'LARK' as const, larkOpenId: 'ou_test', larkTenantKey: 'tenant-test' };
    const req = new NextRequest('http://localhost/api/contracts', { headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(user)}` } });
    assert.equal((await (await me(req)).json()).user.larkOpenId, 'ou_test');
    assert.deepEqual(actorFromRequest(req).roles, ['LEGAL']);
    assert.equal(actorFromRequest(req).id, 'ou_test');
    const foreign = new NextRequest('http://localhost/api/contracts', { headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken({ ...user, larkTenantKey: 'foreign' })}` } });
    assert.throws(() => actorFromRequest(foreign), /tổ chức Lark/);
  } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
});
