import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { UserProfile } from '../src/lib/types';
import { applySection, parseSection, permissionsFor } from '../src/lib/brands/domain';
import { brandKey, emptyProfile } from '../src/lib/brands/types';

const user = (role: UserProfile['role'], name = 'Người dùng'): UserProfile => ({ id: name, name, email: '', role, roleTitle: '', avatar: '' });

test('Phân quyền theo mục: trưởng phòng sửa tất cả, Account PIC sửa nội dung, không ai khác sửa trần thù lao', () => {
  const lead = permissionsFor(user('MANAGER'));
  assert.ok(Object.values(lead).every(Boolean));
  const pic = permissionsFor(user('BOOKING_MEMBER', 'Phương Thảo'), 'phương thảo');
  assert.equal(pic.POSITIONING, true); assert.equal(pic.PRODUCTS, true); assert.equal(pic.DOCUMENTS, true);
  assert.equal(pic.RATECARD, false); assert.equal(pic.LEGAL, false);
  const other = permissionsFor(user('BOOKING_MEMBER', 'Khánh Vy'), 'Phương Thảo');
  assert.ok(Object.values(other).every(v => v === false));
  assert.ok(Object.values(permissionsFor(null)).every(v => v === false));
});

test('Làm sạch dữ liệu gửi lên: bỏ dòng trống, kiểm tra MST, chỉ nhận link http(s), giữ đủ 7 khung lương', () => {
  const p = emptyProfile('Senka');
  const products = parseSection('PRODUCTS', { products: [{ name: 'Perfect Whip', priceVnd: '115.000', pdpUrl: 'javascript:alert(1)', usps: 'Bọt mịn\n\nLàm sạch sâu' }, { name: '' }] }, 'A', p).products!;
  assert.equal(products.length, 1);
  assert.equal(products[0].priceVnd, 115000);
  assert.equal(products[0].pdpUrl, '');
  assert.deepEqual(products[0].usps, ['Bọt mịn', 'Làm sạch sâu']);
  assert.throws(() => parseSection('ENTITY', { taxCode: '12ab' }, 'A', p));
  assert.equal(parseSection('ENTITY', { taxCode: '0101234567-001' }, 'A', p).entity!.taxCode, '0101234567-001');
  const ratecard = parseSection('RATECARD', { ratecard: [{ grade: 'KL3', maxBudget: 3500000 }, { grade: 'KL9', maxBudget: 1 }] }, 'A', p).ratecard!;
  assert.equal(ratecard.length, 7);
  assert.equal(ratecard.find(r => r.grade === 'KL3')!.maxBudget, 3500000);
  assert.equal(ratecard.find(r => r.grade === 'KL1')!.maxBudget, undefined);
});

test('Lưu ghi lịch sử và từ chối ghi đè khi revision cũ', async () => {
  process.env.BRAND_DATA_DIR = await mkdtemp(path.join(os.tmpdir(), 'brand-'));
  const { saveProfile, listProfiles } = await import('../src/lib/brands/store');
  const base = emptyProfile('Nhãn Kiểm Thử');
  const first = await saveProfile(applySection(base, 'POSITIONING', parseSection('POSITIONING', { slogan: 'Sạch sâu' }, 'Thảo', base), 'Thảo'), 0);
  assert.equal(first.revision, 1);
  assert.equal(first.history[0].actorName, 'Thảo');
  await assert.rejects(saveProfile(applySection(base, 'POSITIONING', {}, 'Vy'), 0));
  const second = await saveProfile(applySection(first, 'FAQS', parseSection('FAQS', { faqs: [{ question: 'Có kích ứng không?', answer: 'Đã kiểm nghiệm da liễu' }] }, 'Vy', first), 'Vy'), 1);
  assert.equal(second.revision, 2);
  const stored = (await listProfiles()).find(x => x.key === brandKey('Nhãn Kiểm Thử'))!;
  assert.equal(stored.faqs.length, 1);
  assert.equal(stored.positioning!.slogan, 'Sạch sâu');
});
