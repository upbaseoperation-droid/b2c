import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyEntry, canAccess, canDecide, emptyThread, parseEntry } from '../src/lib/partnerHub/domain';
import type { HubScope } from '../src/lib/partnerHub/types';
import type { UserProfile } from '../src/lib/types';
import { mergeLatest } from '../src/lib/partnerHub/client';
import type { ThreadResponse } from '../src/lib/partnerHub/types';

const brand: UserProfile = { id: 'brand-user', name: 'Brand test', email: '', role: 'BRAND_PARTNER', roleTitle: '', avatar: '', partnerType: 'BRAND', linkedEntityId: 'brand-a', permissions: ['CAN_APPROVE_DEALS'] };
const scope: HubScope = { key: 'candidate:campaign-a:koc-a', title: 'KOC test', partnerType: 'BRAND', partnerId: 'brand-a', brandIds: ['brand-a'], staffNames: ['PIC test'], proposalVersion: 'v1', initialDecision: 'PENDING' };
const input = (kind = 'COMMENT', content = 'Ý kiến') => ({ clientId: 'message-0001', kind, content, proposalVersion: 'v1', expectedRevision: 0 });

test('Đúng đối tác và phân công; KOC và brand khác không đọc luồng duyệt', () => {
  assert.equal(canAccess(brand, scope), true);
  assert.equal(canAccess({ ...brand, linkedEntityId: 'brand-b' }, scope), false);
  assert.equal(canAccess({ ...brand, role: 'KOC_PARTNER', partnerType: 'KOC' }, scope), false);
  assert.equal(canAccess({ ...brand, canLogin: false }, scope), false);
  const staff = { ...brand, role: 'BOOKING_MEMBER' as const, partnerType: undefined, name: 'PIC test' };
  assert.equal(canAccess(staff, scope), true);
  assert.equal(canAccess({ ...staff, name: 'PIC' }, scope), false);
  assert.equal(canDecide(staff, scope), false);
  assert.equal(canDecide({ ...brand, permissions: [] }, scope), false);
});

test('Comment và ghi nhận bên ngoài không duyệt; lý do từ chối/bổ sung bắt buộc', () => {
  const thread = emptyThread(scope);
  const comment = applyEntry(thread, parseEntry(input()), brand, scope);
  assert.equal(comment.decision, 'PENDING');
  assert.equal(comment.entries[0].authorId, brand.id);
  const external = applyEntry(thread, parseEntry({ ...input('EXTERNAL'), externalChannel: 'Zalo' }), brand, scope);
  assert.equal(external.decision, 'PENDING');
  assert.throws(() => parseEntry(input('REJECT', '')));
  assert.throws(() => parseEntry(input('REQUEST_INFO', '')));
  assert.throws(() => parseEntry(input('EXTERNAL')));
  assert.equal(applyEntry(thread, parseEntry(input('APPROVE', '')), brand, scope).decision, 'APPROVED');
});

test('Link chỉ https; không lấy danh tính do client khai; kiểm tra trả lời cùng phòng', () => {
  assert.throws(() => parseEntry({ ...input(), linkUrl: 'javascript:alert(1)', linkTitle: 'File' }));
  const entry = parseEntry({ ...input(), linkUrl: 'https://drive.google.com/file/d/test/view', linkTitle: 'Video v2', authorId: 'someone-else' });
  const result = applyEntry(emptyThread(scope), entry, brand, scope);
  assert.equal(result.entries[0].authorId, brand.id);
  assert.equal(result.entries[0].linkTitle, 'Video v2');
  assert.throws(() => applyEntry(emptyThread(scope), parseEntry({ ...input(), replyTo: 'other-room-message' }), brand, scope));
});

test('Gửi lại không trùng; quyết định cũ không ghi đè; lịch sử quyết định được giữ', () => {
  const first = applyEntry(emptyThread(scope), parseEntry(input('APPROVE')), brand, scope);
  assert.equal(applyEntry(first, parseEntry(input('APPROVE')), brand, scope).entries.length, 1);
  assert.throws(() => applyEntry(first, parseEntry({ ...input('REJECT'), clientId: 'message-0002' }), brand, scope));
  assert.throws(() => applyEntry(first, parseEntry({ ...input('REJECT'), clientId: 'message-0002', expectedRevision: 1, proposalVersion: 'old' }), brand, scope));
  const second = applyEntry(first, parseEntry({ ...input('REJECT'), clientId: 'message-0002', expectedRevision: 1 }), brand, scope);
  assert.equal(second.decision, 'REJECTED');
  assert.equal(second.entries.length, 2);
  assert.throws(() => applyEntry(first, parseEntry(input('APPROVE')), { ...brand, id: 'other-user' }, scope));
});

test('Kho lưu giữ qua lần đọc mới; ghi đồng thời không mất comment', async () => {
  process.env.PARTNER_HUB_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'partner-hub-test-'));
  const { readThread, appendEntry } = await import('../src/lib/partnerHub/store');
  await appendEntry(scope, brand, parseEntry(input()));
  await appendEntry(scope, brand, parseEntry(input()));
  const results = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => appendEntry(scope, brand, parseEntry({ ...input(), clientId: `parallel-${i}` }))));
  for (let i = 0; i < results.length; i++) if (results[i].status === 'rejected') await appendEntry(scope, brand, parseEntry({ ...input(), clientId: `parallel-${i}` }));
  const persisted = await readThread(scope);
  assert.equal(persisted.entries.length, 5);
  assert.equal(persisted.decision, 'PENDING');
});

test('Nối trang lịch sử: không lẫn phòng, không ghi đè phản hồi mới, không bỏ qua tin sau mất mạng', () => {
  const first = applyEntry(emptyThread(scope), parseEntry(input()), brand, scope);
  const initial: ThreadResponse = { thread: first, title: 'Test', canDecide: true, hasMore: false };
  const second = applyEntry(first, parseEntry({ ...input(), clientId: 'message-0002' }), brand, scope);
  const latest = { ...initial, thread: second };
  assert.equal(mergeLatest(initial, latest).thread.entries.length, 2);
  assert.equal(mergeLatest(latest, initial).thread.revision, 2);
  const afterGap = { ...latest, hasMore: true, thread: { ...second, entries: [second.entries[1]] } };
  assert.equal(mergeLatest(initial, afterGap).hasMore, true);
  assert.equal(mergeLatest(initial, afterGap).thread.entries.length, 1);
  assert.equal(mergeLatest(initial, { ...initial, thread: { ...first, key: 'other-room', entries: [] } }).thread.entries.length, 0);
});
