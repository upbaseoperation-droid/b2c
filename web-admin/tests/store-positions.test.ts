import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStaffIndex, isSamePerson, resolveStaffCode, isPersonInField } from '../src/lib/staffIdentity';
import { storePositionsOf, storeCoBookings, isBackupEffective } from '../src/lib/storePositions';
import { normalizeAssignments, assignmentChanges } from '../src/lib/assignmentNormalize';
import { ledgerByDealCode } from '../src/lib/server/paymentSlipStore';
import type { BrandDetail, StorePortfolioItem } from '../src/lib/types';

const user = (name: string, staffCode?: string) => ({ id: staffCode ? `staff-${staffCode}` : 'u1', name, staffCode });
const store = (over: Partial<StorePortfolioItem>): StorePortfolioItem =>
  ({ id: 's1', storeName: 'Cocoon_TikTok', brandName: 'Cocoon', platform: 'TikTok Shop', accountOwnerName: '', b2cOwnerName: '', ...over }) as StorePortfolioItem;
const brand = (over: Partial<BrandDetail>): BrandDetail => ({ id: 'b1', name: 'Cocoon', code: 'COC', ...over }) as BrandDetail;

const index = buildStaffIndex(
  [{ id: 'HN001', name: 'Lê Phương Thảo' }, { id: 'HN002', name: 'Trần An' }],
  [{ id: 'HN001', name: 'Lê Phương Thảo' }, { id: 'HCM9', name: 'Lê Phương Thảo' }, { id: 'HN003', name: 'Nguyễn Bình' }, { id: 'HN004', name: 'Nguyễn Bình' }]
);

test('Nhận người theo mã khi có mã: trùng tên khác mã không được tính là cùng người', () => {
  assert.equal(isSamePerson(user('Lê Phương Thảo', 'HN001'), 'HN001', 'Lê Phương Thảo'), true);
  assert.equal(isSamePerson(user('Lê Phương Thảo', 'HCM9'), 'HN001', 'Lê Phương Thảo'), false);
  // Đổi tên hiển thị nhưng cùng mã vẫn là cùng người
  assert.equal(isSamePerson(user('Lê P. Thảo', 'HN001'), 'HN001', 'Lê Phương Thảo'), true);
  // Ô chưa có mã thì so tên như cũ
  assert.equal(isPersonInField(user('Trần An', 'HN002'), 'Trần An, Nguyễn Bình', {}), true);
});

test('Đổi tên sang mã: ưu tiên người được đăng nhập, trùng tên thì không tự chọn', () => {
  assert.deepEqual(resolveStaffCode('Lê Phương Thảo', index), { status: 'OK', code: 'HN001' });
  assert.equal(resolveStaffCode('Nguyễn Bình', index).status, 'AMBIGUOUS');
  assert.equal(resolveStaffCode('Không Có', index).status, 'NOT_FOUND');
});

test('Vị trí trên gian: Booking chính, cùng làm, Leader, Kênh tự sở hữu cộng dồn', () => {
  const s = store({
    primaryPic: 'Trần An', b2cOwners: ['Trần An', 'Lê Phương Thảo'], bookingLeader: 'Nguyễn Bình', hasBookingLeader: true,
    contentPic: 'Lê Phương Thảo', staffCodes: { 'trần an': 'HN002', 'lê phương thảo': 'HN001', 'nguyễn bình': 'HN003' },
  });
  assert.deepEqual([...storePositionsOf(user('Trần An', 'HN002'), s)], ['BOOKING_MAIN']);
  assert.deepEqual([...storePositionsOf(user('Lê Phương Thảo', 'HN001'), s)].sort(), ['BOOKING_CO', 'SELF_CHANNEL']);
  assert.deepEqual([...storePositionsOf(user('Nguyễn Bình', 'HN003'), s)], ['LEADER']);
  // Người trùng tên Leader nhưng khác mã không được làm Leader
  assert.equal(storePositionsOf(user('Nguyễn Bình', 'HN004'), s).size, 0);
  // Không có Leader thì không ai là Leader
  assert.equal(storePositionsOf(user('Nguyễn Bình', 'HN003'), { ...s, hasBookingLeader: false }).has('LEADER'), false);
});

test('Dự phòng chỉ có quyền trong thời gian hiệu lực và không bị tính là Booking cùng làm', () => {
  const s = store({ primaryPic: 'Trần An', b2cOwners: ['Trần An'], backupOwnerName: 'Nguyễn Bình', isBackupActive: true, backupFrom: '2026-10-20', backupTo: '2026-10-31' });
  assert.equal(isBackupEffective(s, new Date(2026, 9, 25)), true);
  assert.equal(isBackupEffective(s, new Date(2026, 10, 2)), false);
  assert.equal(isBackupEffective({ ...s, isBackupActive: false }, new Date(2026, 9, 25)), false);
  assert.deepEqual(storeCoBookings({ ...s, assignedMembers: ['Nguyễn Bình'] }), []);
  assert.equal(storePositionsOf(user('Nguyễn Bình'), s, null, new Date(2026, 9, 25)).has('BACKUP'), true);
  assert.equal(storePositionsOf(user('Nguyễn Bình'), s, null, new Date(2026, 10, 2)).size, 0);
});

test('PIC Plan / KV lấy theo nhãn, nhãn chưa đặt mới dùng giá trị cũ trên gian', () => {
  const s = store({ planStrategyPic: 'Trần An' });
  assert.equal(storePositionsOf(user('Trần An'), s, brand({})).has('PLAN_STRATEGY'), true);
  assert.equal(storePositionsOf(user('Trần An'), s, brand({ planStrategyPic: 'Nguyễn Bình' })).has('PLAN_STRATEGY'), false);
  assert.equal(storePositionsOf(user('Nguyễn Bình'), s, brand({ keyVisualSisPic: 'Nguyễn Bình' })).has('KEY_VISUAL'), true);
});

test('Chuẩn hóa Dữ liệu gốc: điền mã, đưa Plan/KV lên nhãn, báo trùng tên và xung đột', () => {
  const catalog = {
    brands: [brand({}), brand({ id: 'b2', name: 'Bioderma', code: 'BIO' })],
    stores: [
      store({ id: 's1', primaryPic: 'Trần An', planStrategyPic: 'Lê Phương Thảo', keyVisualSisPic: 'Trần An' }),
      store({ id: 's2', storeName: 'Cocoon_Shopee', primaryPic: 'Nguyễn Bình', planStrategyPic: 'Lê Phương Thảo', keyVisualSisPic: 'Lê Phương Thảo' }),
    ],
  };
  const { catalog: out, issues } = normalizeAssignments(catalog, index);
  assert.equal(out.stores[0].staffCodes?.['trần an'], 'HN002');
  assert.equal(out.brands[0].planStrategyPic, 'Lê Phương Thảo');
  assert.equal(out.brands[0].staffCodes?.['lê phương thảo'], 'HN001');
  assert.equal(out.brands[0].keyVisualSisPic, undefined);
  assert.ok(issues.some(i => i.kind === 'BRAND_POSITION_CONFLICT' && i.field === 'keyVisualSisPic'));
  assert.ok(issues.some(i => i.kind === 'AMBIGUOUS_NAME' && i.name === 'Nguyễn Bình'));
  // Mã đã chọn tay được giữ, không bị thay bằng kết quả tra tên
  const manual = normalizeAssignments({ brands: [], stores: [store({ primaryPic: 'Nguyễn Bình', staffCodes: { 'nguyễn bình': 'HN004' } })] }, index);
  assert.equal(manual.catalog.stores[0].staffCodes?.['nguyễn bình'], 'HN004');
  assert.equal(manual.issues.length, 0);
});

test('Nhật ký phân công ghi đúng ô đổi người', () => {
  const prev = { brands: [brand({})], stores: [store({ primaryPic: 'Trần An' })] };
  const next = { brands: [brand({ selfAirAllowed: true })], stores: [store({ primaryPic: 'Nguyễn Bình', bookingLeader: 'Lê Phương Thảo' })] };
  const log = assignmentChanges(prev, next, { name: 'Giám đốc', code: 'HN000' }, '2026-10-25T00:00:00.000Z');
  const fields = log.map(e => `${e.entity}:${e.field}:${e.from}->${e.to}`).sort();
  assert.deepEqual(fields, [
    'BRAND:selfAirAllowed:->Bật',
    'STORE:bookingLeader:->Lê Phương Thảo',
    'STORE:primaryPic:Trần An->Nguyễn Bình',
  ]);
});

test('Sổ phiếu Lark: cộng tạm ứng và đánh dấu đã lập tất toán theo mã đơn', () => {
  const slip = (requestType: 'ADVANCE' | 'SETTLEMENT', dealCode: string, amount: number) =>
    ({ requestType, lineItems: [{ dealCode, requestBaseNetAmount: amount }] }) as never;
  const ledger = ledgerByDealCode([slip('ADVANCE', 'BO-1', 1_000_000), slip('ADVANCE', 'BO-1', 500_000), slip('SETTLEMENT', 'BO-2', 3_000_000)]);
  assert.deepEqual(ledger['BO-1'], { advanceRequestedAmount: 1_500_000, settlementRequested: false });
  assert.equal(ledger['BO-2'].settlementRequested, true);
});
