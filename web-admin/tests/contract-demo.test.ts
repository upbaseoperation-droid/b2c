import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createContract, submitContract, decideContract, editContract } from '../src/lib/contracts/domain';
import { simulateSigning } from '../src/lib/contracts/demo';
import type { ContractActor } from '../src/lib/contracts/types';
const owner: ContractActor = { id: 'owner', name: 'Người tạo', roles: ['CREATOR'], brands: ['Brand Test'] };
const legal: ContractActor = { ...owner, id: 'legal', roles: ['LEGAL'] };
const finance: ContractActor = { ...owner, id: 'finance', roles: ['FINANCE'] };
const signer: ContractActor = { ...owner, id: 'signer', roles: ['SIGN_COORDINATOR'] };
const input = { title: 'Giả lập', brand: 'Brand Test', partner: 'Đối tác giả lập', templateId: 'IND-HD', templateHash: 'test', values: {} };
const approved = () => decideContract(decideContract(submitContract(createContract(input, owner), owner, [legal, finance]), legal, 'APPROVED', ''), finance, 'APPROVED', '');
test('Giả lập chỉ mở sau duyệt và theo đúng người ký', () => {
  assert.throws(() => simulateSigning(createContract(input, owner), signer, 'DEMO_SIGN_START'));
  assert.throws(() => simulateSigning(approved(), owner, 'DEMO_SIGN_START'));
  const waiting = simulateSigning(approved(), signer, 'DEMO_SIGN_START');
  assert.equal(waiting.signing[0].provider, 'DEMO'); assert.equal(waiting.signing[0].status, 'WAITING');
  assert.throws(() => editContract(waiting, owner, input));
  const partial = simulateSigning(waiting, signer, 'DEMO_SIGN_NEXT');
  assert.equal(partial.signing[0].status, 'PARTIAL'); assert.deepEqual(partial.signing[0].people.map(p => p.action), [2, 1]);
  const complete = simulateSigning(partial, signer, 'DEMO_SIGN_NEXT');
  assert.equal(complete.signing[0].status, 'COMPLETED');
  assert.throws(() => simulateSigning(complete, signer, 'DEMO_SIGN_START'));
});
test('Giả lập từ chối có thể mở lượt mới, giữ lịch sử', () => {
  const rejected = simulateSigning(simulateSigning(approved(), signer, 'DEMO_SIGN_START'), signer, 'DEMO_SIGN_REJECT');
  assert.equal(rejected.signing[0].status, 'REJECTED');
  const retry = simulateSigning(rejected, signer, 'DEMO_SIGN_START');
  assert.equal(retry.signing.length, 2); assert.notEqual(retry.signing[0].documentId, retry.signing[1].documentId);
});
test('Giả lập bị chặn hoàn toàn trên production', () => {
  const previous = process.env.NODE_ENV; Object.assign(process.env, { NODE_ENV: 'production' });
  try { assert.throws(() => simulateSigning(approved(), signer, 'DEMO_SIGN_START'), /môi trường phát triển/); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else Object.assign(process.env, { NODE_ENV: previous }); }
});
