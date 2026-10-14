import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/partner-hub/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { hubScopes } from '../src/lib/partnerHub/scopes';
import { INITIAL_THIRD_PARTY_ACCOUNTS, convertPartnerAccountToUserProfile } from '../src/lib/thirdPartyAccessData';
import type { UserProfile } from '../src/lib/types';

const admin: UserProfile = { id: 'integration-admin', name: 'QA synthetic', email: '', role: 'ADMIN', roleTitle: 'Admin test', avatar: '' };
function request(actor: UserProfile | null, query = '', body?: unknown, origin = 'http://localhost:3000') {
  return new NextRequest(`http://localhost:3000/api/partner-hub${query}`, {
    method: body ? 'POST' : 'GET', headers: { ...(actor ? { cookie: `${SESSION_COOKIE_NAME}=${encodeSessionToken(actor)}` } : {}), origin, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
test('API: phiên, quyền, comment, link, quyết định, gửi lại, phân trang và đọc lại', async () => {
  process.env.PARTNER_HUB_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'partner-api-'));
  assert.equal((await GET(request(null))).status, 401);
  const scope = hubScopes().find(s => s.proposalVersion)!;
  const key = scope.key;
  const body = { key, clientId: 'integration-001', kind: 'COMMENT', content: 'QA synthetic note', expectedRevision: 0, linkUrl: 'https://drive.google.com/file/d/example/view', linkTitle: 'QA v1' };
  assert.equal((await POST(request(admin, '', body, 'https://untrusted.example'))).status, 403);
  const saved = await POST(request(admin, '', body));
  assert.equal(saved.status, 200);
  const data = await saved.json();
  assert.equal(data.thread.entries[0].authorId, admin.id);
  assert.equal(data.thread.entries[0].linkTitle, 'QA v1');
  const repeated = await (await POST(request(admin, '', body))).json();
  assert.equal(repeated.thread.entries.length, 1);
  const decision = { ...body, clientId: 'integration-002', kind: 'REJECT', expectedRevision: 1, proposalVersion: scope.proposalVersion };
  assert.equal((await POST(request(admin, '', decision))).status, 200);
  assert.equal((await POST(request(admin, '', { ...decision, clientId: 'integration-stale' }))).status, 409);
  const reread = await (await GET(request(admin, `?key=${encodeURIComponent(key)}`))).json();
  assert.equal(reread.thread.decision, 'REJECTED');
  for (let i = 0; i < 51; i++) assert.equal((await POST(request(admin, '', { ...body, clientId: `page-message-${i}` }))).status, 200);
  const latest = await (await GET(request(admin, `?key=${encodeURIComponent(key)}`))).json();
  assert.equal(latest.thread.entries.length, 50);
  assert.equal(latest.hasMore, true);
  const older = await (await GET(request(admin, `?key=${encodeURIComponent(key)}&before=${latest.thread.entries[0].clientId}`))).json();
  assert.equal(older.thread.entries.length, 3);
  assert.equal(older.hasMore, false);
  const partner = convertPartnerAccountToUserProfile(INITIAL_THIRD_PARTY_ACCOUNTS.find(a => a.partnerType === 'KOC')!);
  assert.equal((await GET(request(partner, `?key=${encodeURIComponent(key)}`))).status, 403);
  assert.equal((await POST(request(partner, '', body))).status, 403);
  const accessible = await (await GET(request(partner, '?family=BRAND'))).json();
  assert.deepEqual(accessible.rooms, []);
});

test('API: thành viên Brand được duyệt đúng brand; thu hồi quyền được kiểm tra lại', async () => {
  process.env.PARTNER_HUB_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'partner-brand-api-'));
  const scopes = hubScopes();
  // Keep the existing demo accounts intact; the catalog currently has no
  // brand account assigned to its Senka/Bio-Essence sample campaigns.
  const target = scopes.find(s => s.proposalVersion)!;
  const account = { ...INITIAL_THIRD_PARTY_ACCOUNTS[0], id: 'qa-brand-synthetic', gmail: 'qa@example.invalid', displayName: 'QA Brand synthetic', linkedEntityId: target.partnerId };
  INITIAL_THIRD_PARTY_ACCOUNTS.push(account);
  const actor = convertPartnerAccountToUserProfile(account);
  const scope = scopes.find(s => s.partnerId === account.linkedEntityId && s.proposalVersion)!;
  const own = await GET(request(actor, `?key=${encodeURIComponent(scope.key)}`));
  assert.equal(own.status, 200);
  assert.equal((await own.json()).canDecide, true);
  const different = scopes.find(s => s.partnerType === 'BRAND' && s.partnerId !== actor.linkedEntityId)!;
  assert.equal((await GET(request(actor, `?key=${encodeURIComponent(different.key)}`))).status, 403);
  const before = account.status;
  try {
    account.status = 'SUSPENDED';
    assert.equal((await GET(request(actor, `?key=${encodeURIComponent(scope.key)}`))).status, 403);
  } finally { account.status = before; INITIAL_THIRD_PARTY_ACCOUNTS.splice(INITIAL_THIRD_PARTY_ACCOUNTS.indexOf(account), 1); }
});
