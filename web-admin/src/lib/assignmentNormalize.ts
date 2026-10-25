import type { BrandDetail, StorePortfolioItem } from './types';
import { brandKey } from './brands/types';
import { resolveStaffCode, splitPeople, type StaffCodeMap, type buildStaffIndex } from './staffIdentity';

type Index = ReturnType<typeof buildStaffIndex>;
type CatalogLike = { brands: BrandDetail[]; stores: StorePortfolioItem[] };

/** Các ô người phụ trách trên gian và trên nhãn được quy về mã nhân sự. */
export const STORE_PERSON_FIELDS = [
  'b2cOwnerName', 'primaryPic', 'assignedStaff', 'assignedPic', 'bookingLeader',
  'contentPic', 'backupOwnerName', 'accountOwnerName', 'planStrategyPic', 'keyVisualSisPic',
] as const;
export const STORE_PERSON_LIST_FIELDS = ['b2cOwners', 'assignedMembers'] as const;
export const BRAND_PERSON_FIELDS = [
  'planStrategyPic', 'keyVisualSisPic', 'contentBrandMainPic', 'accountPic', 'bookingPicLead', 'brandPicName',
] as const;

export interface AssignmentIssue {
  kind: 'AMBIGUOUS_NAME' | 'UNKNOWN_NAME' | 'BRAND_POSITION_CONFLICT';
  entity: 'STORE' | 'BRAND';
  entityId: string;
  entityName: string;
  field: string;
  name?: string;
  candidates?: string[];
  /** Với xung đột Plan/KV: các giá trị khác nhau đang gán ở các gian cùng nhãn */
  values?: { value: string; stores: string[] }[];
}

function peopleOfStore(s: StorePortfolioItem): { field: string; name: string }[] {
  const out: { field: string; name: string }[] = [];
  for (const f of STORE_PERSON_FIELDS) for (const n of splitPeople(s[f] as string | undefined)) out.push({ field: f, name: n });
  for (const f of STORE_PERSON_LIST_FIELDS) for (const raw of (s[f] as string[] | undefined) || []) for (const n of splitPeople(raw)) out.push({ field: f, name: n });
  return out;
}

function peopleOfBrand(b: BrandDetail): { field: string; name: string }[] {
  const out: { field: string; name: string }[] = [];
  for (const f of BRAND_PERSON_FIELDS) for (const n of splitPeople(b[f] as string | undefined)) out.push({ field: f, name: n });
  return out;
}

/** Điền bảng tên → mã cho một bản ghi; giữ mã đã chọn tay, bỏ mã của người không còn được ghi. */
function fillCodes(
  existing: StaffCodeMap | undefined,
  people: { field: string; name: string }[],
  index: Index,
  onIssue: (p: { field: string; name: string }, r: ReturnType<typeof resolveStaffCode>) => void
): StaffCodeMap | undefined {
  const next: StaffCodeMap = {};
  const reported = new Set<string>();
  for (const p of people) {
    const key = p.name.trim().toLowerCase();
    if (next[key] || reported.has(key)) continue;
    if (existing?.[key]) { next[key] = existing[key]; continue; }
    const r = resolveStaffCode(p.name, index);
    if (r.status === 'OK') next[key] = r.code;
    else { reported.add(key); onIssue(p, r); }
  }
  return Object.keys(next).length ? next : undefined;
}

/**
 * Chuẩn hóa phân công trong Dữ liệu gốc:
 * 1. Mỗi gian / nhãn có bảng tên → mã nhân sự (tên trùng hoặc không có trong danh bạ thì báo, không tự chọn).
 * 2. PIC Plan / Strategy và Key Visual / SIS chuyển lên cấp nhãn: nhãn chưa có người mà các gian cùng ghi 1 người thì lấy người đó;
 *    các gian ghi khác nhau thì báo xung đột để người dùng chọn, không tự gộp.
 */
export function normalizeAssignments<T extends CatalogLike>(catalog: T, index: Index): { catalog: T; issues: AssignmentIssue[] } {
  const issues: AssignmentIssue[] = [];
  const storesByBrand = new Map<string, StorePortfolioItem[]>();
  for (const s of catalog.stores) {
    const k = brandKey(s.brandName || s.storeName.split('_')[0] || '');
    if (!k) continue;
    storesByBrand.set(k, [...(storesByBrand.get(k) || []), s]);
  }

  const brands = catalog.brands.map(b => {
    const stores = storesByBrand.get(brandKey(b.name)) || [];
    let next: BrandDetail = b;
    for (const field of ['planStrategyPic', 'keyVisualSisPic'] as const) {
      const groups = new Map<string, { value: string; stores: string[] }>();
      for (const s of stores) {
        const v = (s[field] || '').trim();
        if (!v) continue;
        const g = groups.get(v.toLowerCase()) || { value: v, stores: [] };
        g.stores.push(s.storeName);
        groups.set(v.toLowerCase(), g);
      }
      const brandValue = (next[field] || '').trim();
      if (!brandValue && groups.size === 1) {
        const only = [...groups.values()][0];
        const fromStore = stores.find(s => (s[field] || '').trim().toLowerCase() === only.value.toLowerCase());
        const code = fromStore?.staffCodes?.[only.value.toLowerCase()];
        next = { ...next, [field]: only.value, ...(code ? { staffCodes: { ...(next.staffCodes || {}), [only.value.toLowerCase()]: code } } : {}) };
      } else if (!brandValue && groups.size > 1) {
        issues.push({ kind: 'BRAND_POSITION_CONFLICT', entity: 'BRAND', entityId: b.id, entityName: b.name, field, values: [...groups.values()] });
      }
    }
    const staffCodes = fillCodes(next.staffCodes, peopleOfBrand(next), index, (p, r) =>
      issues.push({
        kind: r.status === 'AMBIGUOUS' ? 'AMBIGUOUS_NAME' : 'UNKNOWN_NAME',
        entity: 'BRAND', entityId: b.id, entityName: b.name, field: p.field, name: p.name,
        candidates: r.status === 'AMBIGUOUS' ? r.candidates : undefined,
      })
    );
    return staffCodes === next.staffCodes ? next : { ...next, staffCodes };
  });

  const stores = catalog.stores.map(s => {
    const staffCodes = fillCodes(s.staffCodes, peopleOfStore(s), index, (p, r) =>
      issues.push({
        kind: r.status === 'AMBIGUOUS' ? 'AMBIGUOUS_NAME' : 'UNKNOWN_NAME',
        entity: 'STORE', entityId: s.id, entityName: s.storeName, field: p.field, name: p.name,
        candidates: r.status === 'AMBIGUOUS' ? r.candidates : undefined,
      })
    );
    return { ...s, staffCodes };
  });

  return { catalog: { ...catalog, brands, stores }, issues };
}

export interface AssignmentLogEntry {
  at: string;
  actor: string;
  actorCode?: string;
  entity: 'STORE' | 'BRAND';
  entityId: string;
  entityName: string;
  field: string;
  from: string;
  to: string;
}

const show = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : typeof v === 'boolean' ? (v ? 'Bật' : 'Tắt') : String(v ?? '')).trim();

/** So hai bản Dữ liệu gốc, trả các thay đổi người phụ trách để ghi nhật ký phân công. */
export function assignmentChanges(
  prev: CatalogLike,
  next: CatalogLike,
  actor: { name: string; code?: string },
  at = new Date().toISOString()
): AssignmentLogEntry[] {
  const out: AssignmentLogEntry[] = [];
  const storeFields = [...STORE_PERSON_FIELDS, ...STORE_PERSON_LIST_FIELDS, 'hasBookingLeader', 'isBackupActive', 'backupFrom', 'backupTo'] as const;
  const prevStores = new Map(prev.stores.map(s => [s.id, s]));
  for (const s of next.stores) {
    const old = prevStores.get(s.id);
    for (const f of storeFields) {
      const a = show(old?.[f as keyof StorePortfolioItem]);
      const b = show(s[f as keyof StorePortfolioItem]);
      if (a !== b) out.push({ at, actor: actor.name, actorCode: actor.code, entity: 'STORE', entityId: s.id, entityName: s.storeName, field: f, from: a, to: b });
    }
  }
  const prevBrands = new Map(prev.brands.map(b => [b.id, b]));
  for (const b of next.brands) {
    const old = prevBrands.get(b.id);
    for (const f of [...BRAND_PERSON_FIELDS, 'selfAirAllowed'] as const) {
      const a = show(old?.[f as keyof BrandDetail]);
      const c = show(b[f as keyof BrandDetail]);
      if (a !== c) out.push({ at, actor: actor.name, actorCode: actor.code, entity: 'BRAND', entityId: b.id, entityName: b.name, field: f, from: a, to: c });
    }
  }
  return out;
}
