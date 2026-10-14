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
