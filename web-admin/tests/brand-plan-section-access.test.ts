import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brandPlanSectionsOf, fieldsChangedOutside, mergeSections } from '../src/lib/brandPlanAccess';
import { EMPTY_BRAND_PLAN, type BrandPlanData } from '../src/lib/brandPlanRules';
import type { StorePortfolioItem } from '../src/lib/types';

const store = { id: 's1', storeName: 'Gian A', planStrategyPic: 'Lê Văn A', keyVisualSisPic: 'Trần Thị B; Lê Văn A' } as StorePortfolioItem;

test('Vị trí lấy từ 2 ô PIC của gian ở Dữ liệu gốc, khớp đúng tên', () => {
  assert.deepEqual(brandPlanSectionsOf(store, 'Lê Văn A'), ['STRATEGY', 'KEY_VISUAL']);
  assert.deepEqual(brandPlanSectionsOf(store, 'trần thị b'), ['KEY_VISUAL']);
  assert.deepEqual(brandPlanSectionsOf(store, 'Trần Thị'), []); // không khớp một phần tên
  assert.deepEqual(brandPlanSectionsOf(undefined, 'Lê Văn A'), []);
});

const base: BrandPlanData = { ...EMPTY_BRAND_PLAN, direction: { goal: 'cũ' }, keyVisual: { theme: 'cũ' } };

test('PIC Key Visual sửa Định hướng hoặc dòng content bị phát hiện', () => {
  const next: BrandPlanData = { ...base, direction: { goal: 'mới' }, keyVisual: { theme: 'mới' } };
  assert.deepEqual(fieldsChangedOutside(base, next, ['KEY_VISUAL']), ['direction']);
  assert.deepEqual(fieldsChangedOutside(base, next, ['STRATEGY', 'KEY_VISUAL']), []);
  const rows = { ...base, rows: [{ id: 'r' }] } as unknown as BrandPlanData;
  assert.deepEqual(fieldsChangedOutside(base, rows, ['STRATEGY']), ['rows']);
});

test('Chỉ ghép phần được giao từ bản gửi lên, phần khác giữ bản đang lưu', () => {
  const next: BrandPlanData = { ...base, direction: { goal: 'mới' }, keyVisual: { theme: 'mới' }, kpiNote: 'đổi lén' };
  const merged = mergeSections(base, next, ['KEY_VISUAL']);
  assert.deepEqual(merged.keyVisual, { theme: 'mới' });
  assert.deepEqual(merged.direction, { goal: 'cũ' });
  assert.equal(merged.kpiNote, base.kpiNote);
});
