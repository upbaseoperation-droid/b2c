import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDetail, wesignDetail } from '../src/lib/contracts/wesign';
const id = '00000000-0000-4000-8000-000000000001';
test('Hiển thị đúng người đang chờ ký; không suy ra hoàn tất từ mã chưa xác nhận', () => {
  const detail = normalizeDetail({ document: { id, name: 'Kiểm thử', status: 777 }, listDocumentParticipant: [{ participantName: 'Bên A', participantEmail: 'a@example.invalid', role: 0, action: 2 }, { participantName: 'Bên B', participantEmail: 'b@example.invalid', role: 0, action: 1 }] }, id);
  assert.equal(detail.status, 'UNKNOWN'); assert.equal(detail.people[1].status, 'Chờ ký');
});
test('Không nhận nhầm tài liệu weSign và không chấp nhận ID thành URL', async () => {
  assert.throws(() => normalizeDetail({ document: { id: 'other', name: '', status: 1 }, listDocumentParticipant: [] }, id));
  await assert.rejects(wesignDetail('https://internal.example/secret'));
});
test('Adapter dùng POST detail và loại bỏ dữ liệu OTP/sign link khỏi bản đồng bộ', async () => {
  const oldFetch = globalThis.fetch; const oldToken = process.env.WESIGN_ACCESS_TOKEN;
  process.env.WESIGN_ACCESS_TOKEN = 'test-token-not-real';
  globalThis.fetch = async (url, options) => { assert.equal(String(url), 'https://amisapp.misa.vn/wesign/api/public/Documents/detail'); assert.equal(options?.body, JSON.stringify([id])); return Response.json([{ document: { id, name: 'Kiểm thử', status: 1 }, listDocumentParticipant: [{ participantName: 'Bên B', participantEmail: 'b@example.invalid', role: 0, action: 1, password: 'must-not-return', signLink: 'must-not-return' }] }]); };
  try { const result = await wesignDetail(id); assert.equal(JSON.stringify(result).includes('must-not-return'), false); }
  finally { globalThis.fetch = oldFetch; if (oldToken === undefined) delete process.env.WESIGN_ACCESS_TOKEN; else process.env.WESIGN_ACCESS_TOKEN = oldToken; }
});
