import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/contracts/route';
import { GET as documentGET } from '../src/app/api/contracts/[id]/document/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { loadTemplate } from '../src/lib/contracts/templates';
import type { ContractRecord } from '../src/lib/contracts/types';
const origin = 'http://localhost:3011';
function request(id?: string, body?: unknown, pathname = '/api/contracts') {
  const headers: Record<string, string> = { origin };
  if (id) headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken({ id, name: id, email: `${id}@example.invalid`, avatar: 'KT', role: 'BOOKING_MEMBER', roleTitle: 'Kiểm thử', loginProvider: 'SANDBOX' })}`;
  return new NextRequest(origin + pathname, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
}
test('API toàn luồng: quyền, lưu bền vững, xung đột, duyệt và chặn ký', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'contract-hub-test-'));
  const oldDirectory = process.env.CONTRACT_DATA_DIR; process.env.CONTRACT_DATA_DIR = directory;
  try {
    assert.equal((await GET(request())).status, 401);
    const { template } = await loadTemplate('IND-HD');
    const values = Object.fromEntries(template.fields.filter(f => f.required).map(f => [f.key, 'Dữ liệu kiểm thử']));
    let response = await POST(request('contract-demo-owner', { action: 'CREATE', title: 'Hợp đồng thử', brand: 'Brand Test', partner: 'Đối tác giả lập', templateId: template.id, values }));
    assert.equal(response.status, 200); let record: ContractRecord = (await response.json()).record;
    const initialRevision = record.revision;
    assert.equal((await documentGET(request('contract-demo-legal'), { params: Promise.resolve({ id: record.id }) })).status, 403);
    const mutate = async (actor: string, action: string, rest = {}) => {
      const result = await POST(request(actor, { id: record.id, revision: record.revision, action, ...rest }));
      const data = await result.json(); if (result.ok) record = data.record; return result;
    };
    assert.equal((await mutate('contract-demo-sign', 'LINK_WESIGN', { documentId: '00000000-0000-4000-8000-000000000001', confirmed: true })).status, 400);
    assert.equal((await mutate('contract-demo-owner', 'SUBMIT', { reviewers: ['contract-demo-legal', 'contract-demo-finance'] })).status, 200);
    assert.equal((await mutate('contract-demo-owner', 'DECIDE', { decision: 'APPROVED', note: '' })).status, 403);
    assert.equal((await mutate('contract-demo-legal', 'DECIDE', { decision: 'APPROVED', note: 'Đạt' })).status, 200);
    assert.equal(record.approval, 'IN_REVIEW');
    assert.equal((await mutate('contract-demo-sign', 'LINK_WESIGN', { documentId: '00000000-0000-4000-8000-000000000001', confirmed: true })).status, 400);
    assert.equal((await mutate('contract-demo-finance', 'DECIDE', { decision: 'APPROVED', note: 'Đạt' })).status, 200);
    assert.equal(record.approval, 'APPROVED');
    assert.equal((await POST(request('contract-demo-owner', { id: record.id, revision: initialRevision, action: 'WITHDRAW', note: 'Sửa' }))).status, 409);
    const downloaded = await documentGET(request('contract-demo-owner'), { params: Promise.resolve({ id: record.id }) });
    assert.equal(downloaded.status, 200); assert.ok((await downloaded.arrayBuffer()).byteLength > 1000);
    const records = (await (await GET(request('contract-demo-owner'))).json()).records;
    assert.equal(records[0].approval, 'APPROVED');
    assert.equal((await mutate('contract-demo-owner', 'WITHDRAW', { note: 'Cần sửa thông tin' })).status, 200);
    assert.equal((await mutate('contract-demo-owner', 'EDIT', { title: 'Hợp đồng thử sửa', brand: 'Brand Test', partner: 'Đối tác giả lập', templateId: template.id, values })).status, 200);
    assert.equal(record.version, 2); assert.equal(record.approval, 'DRAFT');
  } finally {
    if (oldDirectory === undefined) delete process.env.CONTRACT_DATA_DIR; else process.env.CONTRACT_DATA_DIR = oldDirectory;
    for (const file of await readdir(path.join(directory, 'sources'))) await unlink(path.join(directory, 'sources', file)); await rmdir(path.join(directory, 'sources'));
    for (const file of await readdir(directory)) await unlink(path.join(directory, file)); await rmdir(directory);
  }
});
test('Chặn yêu cầu thay đổi từ website khác', async () => {
  const req = new NextRequest(origin + '/api/contracts', { method: 'POST', headers: { origin: 'https://external.invalid' }, body: '{}' });
  assert.equal((await POST(req)).status, 403);
});
