import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/contracts/route';
import { GET as documentGET } from '../src/app/api/contracts/[id]/document/route';
import { POST as webhookPOST } from '../src/app/api/contracts/integrations/contract-system/webhook/route';
import { encodeSessionToken, SESSION_COOKIE_NAME } from '../src/lib/larkAuth';
import { loadTemplate } from '../src/lib/contracts/templates';
import type { ContractRecord } from '../src/lib/contracts/types';

const origin = 'http://localhost:3011';

function request(id?: string, body?: unknown, pathname = '/api/contracts') {
  const headers: Record<string, string> = { origin };
  if (id) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${encodeSessionToken({
      id,
      name: id,
      email: `${id}@example.invalid`,
      avatar: 'KT',
      role: 'BOOKING_MEMBER',
      roleTitle: 'Kiểm thử',
      loginProvider: 'SANDBOX',
    })}`;
  }
  return new NextRequest(origin + pathname, {
    headers,
    ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
  });
}

test('API toàn luồng: quyền, lưu bền vững, xung đột, duyệt và chặn ký', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'contract-hub-test-'));
  const oldDirectory = process.env.CONTRACT_DATA_DIR;
  process.env.CONTRACT_DATA_DIR = directory;
  try {
    assert.equal((await GET(request())).status, 401);
    const { template } = await loadTemplate('IND-HD');
    const values = Object.fromEntries(template.fields.filter(f => f.required).map(f => [f.key, 'Dữ liệu kiểm thử']));
    let response = await POST(
      request('contract-demo-owner', {
        action: 'CREATE',
        title: 'Hợp đồng thử',
        brand: 'Brand Test',
        partner: 'Đối tác giả lập',
        templateId: template.id,
        values,
      }),
    );
    assert.equal(response.status, 200);
    let record: ContractRecord = (await response.json()).record;
    assert.ok(record.contractSystem?.contractCode, 'Tự động sinh contractCode chống trùng khi tạo hồ sơ');
    assert.equal(record.contractSystem?.templateSnapshot?.version, template.version);

    const initialRevision = record.revision;
    assert.equal(
      (await documentGET(request('contract-demo-legal'), { params: Promise.resolve({ id: record.id }) })).status,
      403,
    );
    const mutate = async (actor: string, action: string, rest = {}) => {
      const result = await POST(request(actor, { id: record.id, revision: record.revision, action, ...rest }));
      const data = await result.json();
      if (result.ok) record = data.record;
      return result;
    };
    assert.equal(
      (await mutate('contract-demo-sign', 'LINK_WESIGN', {
        documentId: '00000000-0000-4000-8000-000000000001',
        confirmed: true,
      })).status,
      400,
    );
    assert.equal(
      (await mutate('contract-demo-owner', 'SUBMIT', { reviewers: ['contract-demo-legal', 'contract-demo-finance'] }))
        .status,
      200,
    );
    assert.equal((await mutate('contract-demo-owner', 'DECIDE', { decision: 'APPROVED', note: '' })).status, 403);
    assert.equal((await mutate('contract-demo-legal', 'DECIDE', { decision: 'APPROVED', note: 'Đạt' })).status, 200);
    assert.equal(record.approval, 'IN_REVIEW');
    assert.equal(
      (await mutate('contract-demo-sign', 'LINK_WESIGN', {
        documentId: '00000000-0000-4000-8000-000000000001',
        confirmed: true,
      })).status,
      400,
    );
    assert.equal((await mutate('contract-demo-finance', 'DECIDE', { decision: 'APPROVED', note: 'Đạt' })).status, 200);
    assert.equal(record.approval, 'APPROVED');
    assert.equal(
      (
        await POST(
          request('contract-demo-owner', { id: record.id, revision: initialRevision, action: 'WITHDRAW', note: 'Sửa' }),
        )
      ).status,
      409,
    );
    const downloaded = await documentGET(request('contract-demo-owner'), {
      params: Promise.resolve({ id: record.id }),
    });
    assert.equal(downloaded.status, 200);
    assert.ok((await downloaded.arrayBuffer()).byteLength > 1000);
    const records = (await (await GET(request('contract-demo-owner'))).json()).records;
    assert.equal(records[0].approval, 'APPROVED');
    assert.equal((await mutate('contract-demo-owner', 'WITHDRAW', { note: 'Cần sửa thông tin' })).status, 200);
    assert.equal(
      (
        await mutate('contract-demo-owner', 'EDIT', {
          title: 'Hợp đồng thử sửa',
          brand: 'Brand Test',
          partner: 'Đối tác giả lập',
          templateId: template.id,
          values,
        })
      ).status,
      200,
    );
    assert.equal(record.version, 2);
    assert.equal(record.approval, 'DRAFT');
    assert.equal((await mutate('contract-demo-sign', 'DEMO_SIGN_START')).status, 400);
    assert.equal(
      (await mutate('contract-demo-owner', 'SUBMIT', { reviewers: ['contract-demo-legal', 'contract-demo-finance'] }))
        .status,
      200,
    );
    assert.equal((await mutate('contract-demo-legal', 'DECIDE', { decision: 'APPROVED', note: '' })).status, 200);
    assert.equal((await mutate('contract-demo-finance', 'DECIDE', { decision: 'APPROVED', note: '' })).status, 200);
    assert.equal((await mutate('contract-demo-sign', 'DEMO_SIGN_START')).status, 200);
    assert.equal(record.signing.at(-1)?.provider, 'DEMO');
    assert.equal((await mutate('contract-demo-sign', 'SYNC_WESIGN')).status, 400);
    assert.equal((await mutate('contract-demo-sign', 'DEMO_SIGN_NEXT')).status, 200);
    assert.equal(record.signing.at(-1)?.status, 'PARTIAL');
    assert.equal((await mutate('contract-demo-sign', 'DEMO_SIGN_NEXT')).status, 200);
    assert.equal(record.signing.at(-1)?.status, 'COMPLETED');
    assert.equal(
      (
        await documentGET(
          request('contract-demo-sign', undefined, `/api/contracts/${record.id}/document?signed=1`),
          { params: Promise.resolve({ id: record.id }) },
        )
      ).status,
      400,
    );
  } finally {
    if (oldDirectory === undefined) delete process.env.CONTRACT_DATA_DIR;
    else process.env.CONTRACT_DATA_DIR = oldDirectory;
    for (const file of await readdir(path.join(directory, 'sources'))) await unlink(path.join(directory, 'sources', file));
    await rmdir(path.join(directory, 'sources'));
    for (const file of await readdir(directory)) await unlink(path.join(directory, file));
    await rmdir(directory);
  }
});

test('Luồng 13 bước contract-system: generateContract, requestSign chống trùng, và Webhook Bước 13 chặn ghi đè lùi', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'contract-system-test-'));
  const oldDirectory = process.env.CONTRACT_DATA_DIR;
  const oldSecret = process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET;
  process.env.CONTRACT_DATA_DIR = directory;
  process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET = 'test-webhook-secret-step13';

  try {
    const { template } = await loadTemplate('IND-HDNT');
    const values = Object.fromEntries(template.fields.filter(f => f.required).map(f => [f.key, 'Dữ liệu kiểm thử']));
    let res = await POST(
      request('contract-demo-owner', {
        action: 'CREATE',
        title: 'HĐNT kiểm thử contract-system',
        brand: 'ClubClio',
        partner: 'KOC Kiểm Thử',
        templateId: template.id,
        values,
      }),
    );
    assert.equal(res.status, 200);
    let record: ContractRecord = (await res.json()).record;

    const mutate = async (actor: string, action: string, rest = {}) => {
      const result = await POST(request(actor, { id: record.id, revision: record.revision, action, ...rest }));
      const data = await result.json();
      if (result.ok) record = data.record;
      return result;
    };

    // Bước 5: generateContract & đồng bộ Google Docs
    assert.equal((await mutate('contract-demo-owner', 'GENERATE_CONTRACT_SYSTEM')).status, 200);
    assert.ok(record.contractSystem?.googleDocsUrl);
    assert.ok(record.contractSystem?.exportedDocxUrl);

    assert.equal((await mutate('contract-demo-owner', 'SYNC_GOOGLE_DOCS')).status, 200);
    assert.ok(record.contractSystem?.googleDocsSyncedAt);

    // Chặn requestSign khi chưa APPROVED
    assert.equal((await mutate('contract-demo-sign', 'REQUEST_SIGN')).status, 400);

    // Duyệt nội bộ
    assert.equal(
      (await mutate('contract-demo-owner', 'SUBMIT', { reviewers: ['contract-demo-legal', 'contract-demo-finance'] }))
        .status,
      200,
    );
    assert.equal((await mutate('contract-demo-legal', 'DECIDE', { decision: 'APPROVED', note: 'OK' })).status, 200);
    assert.equal((await mutate('contract-demo-finance', 'DECIDE', { decision: 'APPROVED', note: 'OK' })).status, 200);
    assert.equal(record.approval, 'APPROVED');

    // Bước 5-8: requestSign lần 1 và kiểm tra chống trùng (Idempotency) khi bấm lần 2
    assert.equal(
      (
        await mutate('contract-demo-sign', 'REQUEST_SIGN', {
          partyAEmail: 'hopdong@upbase.vn',
          partyBEmail: 'koc@example.com',
        })
      ).status,
      200,
    );
    const firstSignDocId = record.signing.at(-1)?.documentId;
    const contractCode = record.contractSystem?.contractCode;
    assert.ok(firstSignDocId);
    assert.ok(contractCode);
    assert.equal(record.signing.length, 1);
    assert.equal(record.signing[0].provider, 'CONTRACT_SYSTEM');
    assert.equal(record.signing[0].status, 'WAITING');

    // Bấm requestSign lần 2 trên cùng phiên bản -> giữ nguyên 1 lượt ký (Idempotent)
    assert.equal(
      (
        await mutate('contract-demo-sign', 'REQUEST_SIGN', {
          partyAEmail: 'hopdong@upbase.vn',
          partyBEmail: 'koc@example.com',
        })
      ).status,
      200,
    );
    assert.equal(record.signing.length, 1);
    assert.equal(record.signing[0].documentId, firstSignDocId);

    // Bước 13 Webhook: Từ chối khi không có chữ ký xác thực (401)
    const callWebhook = async (payload: unknown, withValidSignature = true) => {
      const rawBody = JSON.stringify(payload);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (withValidSignature) {
        const sig = crypto.createHmac('sha256', 'test-webhook-secret-step13').update(rawBody, 'utf8').digest('hex');
        headers['x-contract-system-signature'] = `sha256=${sig}`;
      }
      return webhookPOST(new NextRequest(origin + '/api/contracts/integrations/contract-system/webhook', {
        method: 'POST',
        headers,
        body: rawBody,
      }));
    };

    const unauthRes = await callWebhook({ contractCode, status: 'PARTIAL' }, false);
    assert.equal(unauthRes.status, 401);

    // Webhook hợp lệ: WAITING -> PARTIAL (KOC đã ký)
    const partialRes = await callWebhook({
      contractCode,
      status: 'PARTIAL',
      timestamp: '2026-10-29T10:00:00.000Z',
      signers: [
        { name: 'Đại diện UpBase (Bên A)', email: 'hopdong@upbase.vn', action: 2, signedAt: '2026-10-29T10:00:00.000Z' },
        { name: 'KOC Kiểm Thử', email: 'koc@example.com', action: 1 },
      ],
    });
    assert.equal(partialRes.status, 200);
    assert.equal((await partialRes.json()).updated, true);

    // Webhook hợp lệ: PARTIAL -> COMPLETED
    const completedRes = await callWebhook({
      contractCode,
      status: 'COMPLETED',
      timestamp: '2026-10-29T10:05:00.000Z',
      signedFileStatus: 'QUEUED',
    });
    assert.equal(completedRes.status, 200);

    // Webhook đến trễ (Out-of-order: COMPLETED -> WAITING) bị chặn ghi đè lùi
    const staleRes = await callWebhook({
      contractCode,
      status: 'WAITING',
      timestamp: '2026-10-29T09:59:00.000Z',
    });
    assert.equal(staleRes.status, 200);
    const staleJson = await staleRes.json();
    assert.equal(staleJson.updated, false);
    assert.equal(staleJson.ignored, true);
    assert.equal(staleJson.status, 'COMPLETED');

    // Worker Bước 12 tải xong file ký hoàn tất (idempotent update signedFileUrl ở trạng thái COMPLETED)
    const workerRes = await callWebhook({
      contractCode,
      status: 'COMPLETED',
      timestamp: '2026-10-29T10:06:00.000Z',
      signedFileStatus: 'DOWNLOADED',
      signedFileUrl: `/api/contracts/${record.id}/document?version=${record.version}`,
    });
    assert.equal(workerRes.status, 200);
    const workerJson = await workerRes.json();
    assert.equal(workerJson.updated, true);
    assert.equal(workerJson.signedFileStatus, 'DOWNLOADED');

    // Chặng 2: Phụ lục SOW (IND-SOW) kế thừa mã HĐNT từ Chặng 1 qua contract-system
    const { template: sowTemplate } = await loadTemplate('IND-SOW');
    const sowValues = {
      ...Object.fromEntries(sowTemplate.fields.filter(f => f.required).map(f => [f.key, 'Dữ liệu SOW kiểm thử'])),
      '__meta:sowTasksJson': JSON.stringify({
        videoFeeNet: 15000000,
        items: [{ id: 't1', label: '01 Video TikTok Review', amount: 15000000 }],
      }),
    };
    const sowCreateRes = await POST(
      request('contract-demo-owner', {
        action: 'CREATE',
        title: 'Phụ lục SOW 01 — ClubClio',
        brand: 'ClubClio',
        partner: 'KOC Kiểm Thử',
        templateId: sowTemplate.id,
        parentId: record.id,
        values: sowValues,
      }),
    );
    assert.equal(sowCreateRes.status, 200);
    let sowRecord: ContractRecord = (await sowCreateRes.json()).record;
    assert.equal(sowRecord.contractSystem?.documentStage, 'SOW');
    assert.equal(sowRecord.contractSystem?.parentContractCode, contractCode);
    assert.ok(sowRecord.contractSystem?.googleDocsUrl);

    // Ký nhanh Phụ lục SOW & kiểm tra trạng thái COMPLETED
    const sowSignRes = await POST(
      request('contract-demo-owner', {
        id: sowRecord.id,
        revision: sowRecord.revision,
        action: 'DEMO_FAST_SIGN',
      }),
    );
    assert.equal(sowSignRes.status, 200);
    sowRecord = (await sowSignRes.json()).record;
    assert.equal(sowRecord.signing.at(-1)?.status, 'COMPLETED');
    const sowContractCode = sowRecord.contractSystem?.contractCode;
    assert.ok(sowContractCode);

    // Chặng 3: Biên bản nghiệm thu BBNT (IND-VID-BBNT) kế thừa mã SOW và chạy qua 13 bước contract-system
    const { template: bbntTemplate } = await loadTemplate('IND-VID-BBNT');
    const bbntValues = Object.fromEntries(
      bbntTemplate.fields.filter(f => f.required).map(f => [f.key, 'Dữ liệu BBNT kiểm thử']),
    );
    const bbntCreateRes = await POST(
      request('contract-demo-owner', {
        action: 'CREATE',
        title: 'BBNT 01 — ClubClio',
        brand: 'ClubClio',
        partner: 'KOC Kiểm Thử',
        templateId: bbntTemplate.id,
        parentId: sowRecord.id,
        values: bbntValues,
      }),
    );
    assert.equal(bbntCreateRes.status, 200);
    let bbntRecord: ContractRecord = (await bbntCreateRes.json()).record;
    assert.equal(bbntRecord.contractSystem?.documentStage, 'BBNT');
    assert.equal(bbntRecord.contractSystem?.parentContractCode, sowContractCode);
    assert.ok(bbntRecord.contractSystem?.googleDocsUrl);

    // Duyệt BBNT và gửi ký WeSign qua contract-system (REQUEST_SIGN)
    const mutateBbnt = async (actor: string, action: string, rest = {}) => {
      const result = await POST(
        request(actor, { id: bbntRecord.id, revision: bbntRecord.revision, action, ...rest }),
      );
      const data = await result.json();
      if (result.ok) bbntRecord = data.record;
      return result;
    };
    assert.equal(
      (await mutateBbnt('contract-demo-owner', 'SUBMIT', { reviewers: ['contract-demo-legal', 'contract-demo-finance'] })).status,
      200,
    );
    assert.equal(
      (await mutateBbnt('contract-demo-legal', 'DECIDE', { decision: 'APPROVED', note: 'OK BBNT' })).status,
      200,
    );
    assert.equal(
      (await mutateBbnt('contract-demo-finance', 'DECIDE', { decision: 'APPROVED', note: 'OK BBNT' })).status,
      200,
    );
    assert.equal(
      (
        await mutateBbnt('contract-demo-sign', 'REQUEST_SIGN', {
          partyAEmail: 'hopdong@upbase.vn',
          partyBEmail: 'koc@example.com',
        })
      ).status,
      200,
    );
    const bbntContractCode = bbntRecord.contractSystem?.contractCode;
    assert.ok(bbntContractCode);
    assert.equal(bbntRecord.signing.at(-1)?.status, 'WAITING');

    // Webhook Bước 13 hoàn tất ký BBNT & tải file đã ký
    const bbntWebhookRes = await callWebhook({
      contractCode: bbntContractCode,
      status: 'COMPLETED',
      timestamp: '2026-10-29T11:00:00.000Z',
      signedFileStatus: 'DOWNLOADED',
      signedFileUrl: `/api/contracts/${bbntRecord.id}/document?version=${bbntRecord.version}`,
    });
    assert.equal(bbntWebhookRes.status, 200);
    const bbntWebhookJson = await bbntWebhookRes.json();
    assert.equal(bbntWebhookJson.updated, true);
    assert.equal(bbntWebhookJson.status, 'COMPLETED');
    assert.equal(bbntWebhookJson.signedFileStatus, 'DOWNLOADED');
  } finally {
    if (oldDirectory === undefined) delete process.env.CONTRACT_DATA_DIR;
    else process.env.CONTRACT_DATA_DIR = oldDirectory;
    if (oldSecret === undefined) delete process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET;
    else process.env.CONTRACT_SYSTEM_WEBHOOK_SECRET = oldSecret;
    for (const file of await readdir(path.join(directory, 'sources'))) await unlink(path.join(directory, 'sources', file));
    await rmdir(path.join(directory, 'sources'));
    for (const file of await readdir(directory)) await unlink(path.join(directory, file));
    await rmdir(directory);
  }
});

test('Chặn yêu cầu thay đổi từ website khác', async () => {
  const req = new NextRequest(origin + '/api/contracts', {
    method: 'POST',
    headers: { origin: 'https://external.invalid' },
    body: '{}',
  });
  assert.equal((await POST(req)).status, 403);
});
