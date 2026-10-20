import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlanManagedByUser, isStoreManagedByUser } from '../src/lib/rbacScope';
import type { InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../src/lib/types';

const store = { id: 'S1', storeName: 'S1_TTS', brandName: 'BrandX', b2cOwnerName: 'PIC Hiện Tại', accountOwnerName: '' } as unknown as StorePortfolioItem;
const person = (name: string) => ({ id: 'u-' + name, name, email: '', role: 'BOOKING_MEMBER' }) as UserProfile;

test('PIC gian (Dữ liệu gốc) thao tác được gian; người ngoài thì không', () => {
  assert.equal(isStoreManagedByUser(store, person('PIC Hiện Tại')), true);
  assert.equal(isStoreManagedByUser(store, person('Người Ngoài')), false);
});

test('Người được phân việc trong kế hoạch tháng xem được kế hoạch đó, kể cả khi đã rời gian', () => {
  const oldPlan = {
    id: 'p-2026-08', storeId: 'S1', storeName: 'S1_TTS', month: '2026/08',
    pic: 'PIC Cũ', primaryPic: 'Chủ Trì', assignedMembers: ['Thành Viên'], items: [{ assignedStaff: 'Người Nhận Slot' }],
  } as unknown as InputPlanBreakdownState;
  for (const name of ['PIC Cũ', 'Chủ Trì', 'Thành Viên', 'Người Nhận Slot']) {
    assert.equal(isStoreManagedByUser(store, person(name)), false, `${name} không còn là PIC gian`);
    assert.equal(isPlanManagedByUser(oldPlan, person(name), [store]), true, `${name} vẫn xem được kế hoạch mình đã làm`);
  }
  assert.equal(isPlanManagedByUser(oldPlan, person('Người Ngoài'), [store]), false);
  assert.equal(isPlanManagedByUser(oldPlan, person('PIC Hiện Tại'), [store]), true, 'PIC hiện tại xem toàn bộ kế hoạch của gian');
});
