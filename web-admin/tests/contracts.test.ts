import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRead, createContract, editContract, submitContract, decideContract, assertCanSign } from '../src/lib/contracts/domain';
import type { ContractActor } from '../src/lib/contracts/types';
const owner: ContractActor = { id: 'owner', name: 'Người tạo', roles: ['CREATOR'], brands: ['Brand A'] };
const legal: ContractActor = { id: 'legal', name: 'Pháp chế', roles: ['LEGAL'], brands: ['Brand A'] };
const finance: ContractActor = { id: 'finance', name: 'Kế toán', roles: ['FINANCE'], brands: ['Brand A'] };
const signer: ContractActor = { id: 'signer', name: 'Trình ký', roles: ['SIGN_COORDINATOR'], brands: ['Brand A'] };
const input = { title: 'Hợp đồng kiểm thử', brand: 'Brand A', partner: 'Đối tác giả lập', templateId: 'IND-HĐ', templateHash: 'abc', values: { name: 'Đối tác' } };
function pending() { return submitContract(createContract(input, owner), owner, [legal, finance]); }
test('Chặn trình ký trước khi duyệt và khi mới duyệt một phần', () => {
  assert.throws(() => assertCanSign(createContract(input, owner), signer));
  assert.throws(() => assertCanSign(pending(), signer));
  const partial = decideContract(pending(), legal, 'APPROVED', 'Đạt');
  assert.throws(() => assertCanSign(partial, signer));
  const done = decideContract(partial, finance, 'APPROVED', 'Đạt');
  assert.doesNotThrow(() => assertCanSign(done, signer));
});
test('Người tạo không được tự duyệt hoặc dùng vai trò chưa được giao', () => {
  assert.throws(() => submitContract(createContract(input, owner), owner, [{ ...owner, roles: ['LEGAL'] }, finance]));
  assert.throws(() => decideContract(pending(), signer, 'APPROVED', 'Đạt'));
});
test('Sửa sau duyệt tạo phiên bản và làm mất điều kiện trình ký', () => {
  const approved = decideContract(decideContract(pending(), legal, 'APPROVED', ''), finance, 'APPROVED', '');
  const next = editContract(approved, owner, { ...input, values: { name: 'Thông tin mới' } });
  assert.equal(next.version, 2); assert.equal(next.approval, 'DRAFT');
  assert.equal(next.versions[0].values.name, 'Đối tác'); assert.throws(() => assertCanSign(next, signer));
});
test('Không đọc hồ sơ ngoài phạm vi và không tự cấp quyền bằng brand', () => {
  const record = pending();
  assert.equal(canRead(record, { ...finance, brands: ['Brand B'] }), false);
  assert.equal(canRead(record, { ...owner, id: 'stranger' }), false);
  assert.equal(canRead(record, legal), true);
});
test('Từ chối/yêu cầu bổ sung cần lý do và không mở trình ký', () => {
  assert.throws(() => decideContract(pending(), legal, 'CHANGES', ''));
  const revised = decideContract(pending(), legal, 'CHANGES', 'Thiếu chứng từ');
  assert.equal(revised.approval, 'CHANGES'); assert.throws(() => assertCanSign(revised, signer));
});
test('Không cho sửa tài liệu đang có lượt ký hoạt động', () => {
  const record = pending(); record.signing.push({ documentId: 'flow', version: 1, status: 'WAITING', sourceStatus: 1, people: [], syncedAt: '', linkedBy: signer.id, linkedAt: '', evidenceConfirmedBy: signer.id, evidenceHash: 'hash' });
  assert.throws(() => editContract(record, owner, input));
});
