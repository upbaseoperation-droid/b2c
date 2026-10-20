import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterScopedBrands, filterScopedStores, isBrandManagedByUser, isPlanManagedByUser } from '../src/lib/rbacScope';
import { isBrandPartnerForBrand } from '../src/lib/brands/domain';
import { USERS, INITIAL_BRANDS, INITIAL_STORE_PORTFOLIOS } from '../src/lib/mockData';
import { resolveUserProfile } from '../src/lib/larkAuth';

test('Thiếu danh tính không nhận toàn bộ danh mục', () => {
  assert.deepEqual(filterScopedBrands(INITIAL_BRANDS, null), []);
  assert.deepEqual(filterScopedStores(INITIAL_STORE_PORTFOLIOS, null), []);
});
test('Tên brand bao hàm nhau không được dùng để mở rộng quyền', () => {
  const user = { ...USERS[0], role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: ['Clio'], linkedEntityName: undefined };
  assert.equal(isBrandManagedByUser('ClubClio', user), false);
  assert.equal(isBrandManagedByUser('Clio', user), true);
  assert.equal(isBrandPartnerForBrand({ ...user, role: 'BRAND_PARTNER' }, 'ClubClio'), false);
});
test('Tên PIC rỗng không khớp mọi kế hoạch', () => {
  const user = { ...USERS[0], name: '', role: 'BOOKING_MEMBER' as const, permissions: [], assignedBrands: [], linkedEntityName: undefined };
  assert.equal(isPlanManagedByUser({ pic: 'Một người khác' } as never, user), false);
});
test('SSO không lấy vai trò quản trị chỉ vì trùng tên', () => {
  assert.throws(() => resolveUserProfile({ open_id: 'unknown', name: USERS[0].name, email: 'unknown@example.test' }));
});
test('Đăng nhập Lark tài khoản Trần Hữu Chiến trả về đúng hồ sơ Business Operation Leader, không bị gán nhầm Giám đốc', () => {
  const byName = resolveUserProfile({ open_id: 'ou_chien_lark', name: 'Trần Hữu Chiến' });
  assert.equal(byName.id, 'user-huu-chien');
  assert.equal(byName.name, 'Trần Hữu Chiến');
  assert.equal(byName.roleTitle, 'Business Operation Leader (Operation)');

  const byEmail = resolveUserProfile({ open_id: 'ou_chien_lark_2', name: 'Tran Huu Chien', email: 'chienth@upbase.vn' });
  assert.equal(byEmail.id, 'user-huu-chien');
  assert.equal(byEmail.name, 'Trần Hữu Chiến');
});
