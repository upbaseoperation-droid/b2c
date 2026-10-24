// Quyền theo phần của Plan tháng của Brand cho 2 vị trí Giám đốc gán theo gian (Dữ liệu gốc → Gian hàng):
// PIC Plan / Strategy chỉ nhập phần Định hướng, PIC Key Visual / SIS chỉ nhập phần Key Visual.
import type { StorePortfolioItem } from './types';
import type { BrandPlanData } from './brandPlanRules';

export type BrandPlanSection = 'STRATEGY' | 'KEY_VISUAL';

/** full: PIC gian / quản lý sửa được cả plan · sections: phần được sửa khi chỉ giữ vị trí */
export interface BrandPlanAccess {
  full: boolean;
  sections: BrandPlanSection[];
}

export const FULL_BRAND_PLAN_ACCESS: BrandPlanAccess = { full: true, sections: ['STRATEGY', 'KEY_VISUAL'] };

export const SECTION_FIELDS: Record<BrandPlanSection, (keyof BrandPlanData)[]> = {
  STRATEGY: ['strategyOwnerMode', 'planner', 'statusNote', 'direction'],
  KEY_VISUAL: ['keyVisual', 'milestones'],
};

export const SECTION_LABEL: Record<BrandPlanSection, string> = {
  STRATEGY: 'Định hướng',
  KEY_VISUAL: 'Key Visual',
};

// Khớp tên như các ô PIC khác của gian (một ô có thể ghi nhiều người, ngăn bằng , ; |)
const holds = (field: string | undefined, userName: string) => {
  const me = userName.trim().toLowerCase();
  return Boolean(me && field && field.toLowerCase().split(/[,;|]/).some(n => n.trim() === me));
};

/** Phần của Plan tháng của Brand mà người dùng được giao ở gian này. */
export function brandPlanSectionsOf(store: StorePortfolioItem | undefined, userName: string): BrandPlanSection[] {
  if (!store) return [];
  const out: BrandPlanSection[] = [];
  if (holds(store.planStrategyPic, userName)) out.push('STRATEGY');
  if (holds(store.keyVisualSisPic, userName)) out.push('KEY_VISUAL');
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Các trường bị đổi nằm ngoài phần được giao (bỏ qua trạng thái duyệt, xử lý riêng). */
export function fieldsChangedOutside(before: BrandPlanData, next: BrandPlanData, sections: BrandPlanSection[]): (keyof BrandPlanData)[] {
  const allowed = new Set<keyof BrandPlanData>(['approval', ...sections.flatMap(s => SECTION_FIELDS[s])]);
  const keys = new Set([...Object.keys(before), ...Object.keys(next)] as (keyof BrandPlanData)[]);
  return [...keys].filter(k => !allowed.has(k) && !same(before[k], next[k]));
}

/** Chỉ lấy các trường thuộc phần được giao từ bản gửi lên, còn lại giữ bản đang lưu. */
export function mergeSections(before: BrandPlanData, next: BrandPlanData, sections: BrandPlanSection[]): BrandPlanData {
  const merged = { ...before } as Record<keyof BrandPlanData, unknown>;
  for (const s of sections) for (const f of SECTION_FIELDS[s]) merged[f] = next[f];
  return merged as unknown as BrandPlanData;
}
