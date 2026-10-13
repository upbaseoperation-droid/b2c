import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserDemoRequest, disableBrowserDemo } from '../src/components/contracts/browserDemo';
import { contractApi, type ContractBootstrap } from '../src/components/contracts/api';
import type { ContractRecord } from '../src/lib/contracts/types';

test('Thiếu khóa phiên chỉ mở kho thử trình duyệt, không đổi quyền máy chủ', async () => {
  disableBrowserDemo(); const previous = globalThis.fetch; let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ error: 'Chưa cấu hình khóa bảo vệ phiên.' }, { status: 503 }); };
  try {
    const data = await contractApi<ContractBootstrap>('/api/contracts');
    assert.equal(data.config.storage, 'BROWSER_DEMO'); assert.equal(data.templates.length, 8);
    assert.equal(data.config.wesign, false); assert.equal(data.config.ai, false);
    await contractApi('/api/contracts/demo', { id: 'demo-legal' });
    assert.equal((await contractApi<ContractBootstrap>('/api/contracts')).actor.id, 'demo-legal');
    assert.equal(requests, 1);
    assert.ok(data.templates.every(t => t.version === 'Giả lập' && t.paragraphs[0].includes('KHÔNG DÙNG ĐỂ KÝ')));
  } finally { globalThis.fetch = previous; disableBrowserDemo(); }
});
test('Kho thử tạo, duyệt độc lập, ký từng người, chặn gọi MISA/tải chữ ký', () => {
  browserDemoRequest('/api/contracts/demo', { id: 'demo-owner' });
  const values = { number: 'TEST-001', party: 'Đối tác thử', date: '13/10/2026', scope: 'Video thử', money: '1000' };
  let record = browserDemoRequest<{ record: ContractRecord }>('/api/contracts', { action: 'CREATE', templateId: 'IND-HD', title: 'Hồ sơ thử', brand: 'Brand thử', partner: 'Đối tác thử', values }).record;
  const act = (action: string, payload = {}) => { const result = browserDemoRequest<{ record: ContractRecord }>('/api/contracts', { id: record.id, revision: record.revision, action, ...payload }); record = result.record; };
  assert.throws(() => act('DEMO_SIGN_START'));
  act('SUBMIT', { reviewers: ['demo-legal', 'demo-finance'] });
  assert.throws(() => act('DECIDE', { decision: 'APPROVED' }));
  browserDemoRequest('/api/contracts/demo', { id: 'demo-legal' }); act('DECIDE', { decision: 'APPROVED' });
  browserDemoRequest('/api/contracts/demo', { id: 'demo-sign' }); assert.throws(() => act('DEMO_SIGN_START'));
  browserDemoRequest('/api/contracts/demo', { id: 'demo-finance' }); act('DECIDE', { decision: 'APPROVED' });
  browserDemoRequest('/api/contracts/demo', { id: 'demo-sign' }); act('DEMO_SIGN_START'); act('DEMO_SIGN_NEXT');
  assert.equal(record.signing[0].status, 'PARTIAL'); act('DEMO_SIGN_NEXT'); assert.equal(record.signing[0].status, 'COMPLETED');
  assert.throws(() => act('SYNC_WESIGN')); assert.throws(() => act('LINK_WESIGN'));
  assert.throws(() => browserDemoRequest(`/api/contracts/${record.id}/document?signed=1`));
  assert.ok(browserDemoRequest<{ paragraphs: string[] }>(`/api/contracts/${record.id}/document?preview=1`).paragraphs.includes('Hồ sơ thử'));
});
