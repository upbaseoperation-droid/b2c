import type { DataScope, InternalStaffRbacMember, StorePortfolioItem, SystemDepartmentScope, UserProfile, UserRole } from './types';
import { ROLE_DEFAULT_DATA_SCOPE, getSavedInternalStaffList, getSavedRoleDataScope } from './rbacData';

/**
 * Phạm vi dữ liệu (Data Scope) — quyết định trong một màn hình người dùng thấy dữ liệu của ai.
 * Dùng chung cho giao diện và máy chủ; mọi màn hình lọc "việc của ai" phải đi qua đây thay vì so tên vai trò.
 */

const GLOBAL_BRAND_FLAGS = new Set(['ALL_BRANDS', 'TẤT CẢ NHÃN HÀNG', 'ALL', '*']);

const norm = (s?: string) => (s || '').trim().toLowerCase();

export function isPartnerUser(user: Pick<UserProfile, 'role' | 'partnerType'>): boolean {
  return !!user.partnerType || user.role.endsWith('_PARTNER');
}

/** Khối của người dùng; thiếu dữ liệu thì suy ra từ vai trò. */
export function departmentOf(user: { role: UserRole; departmentScope?: SystemDepartmentScope }): SystemDepartmentScope {
  if (user.departmentScope) return user.departmentScope;
  if (user.role === 'GROWTH_MANAGER' || user.role === 'GROWTH_MEMBER') return 'GROWTH';
  if (user.role === 'MEDIA_MANAGER' || user.role === 'MEDIA_MEMBER') return 'MEDIA';
  return 'MARKETING_B2C';
}

/**
 * Phạm vi hiệu lực: đối tác luôn chỉ thấy của mình; quyền riêng "Xem mọi nhãn" hoặc gán ALL_BRANDS nâng lên toàn bộ;
 * còn lại theo cấu hình vai trò (máy chủ đã gắn sẵn vào hồ sơ, giao diện xem thử thì đọc cấu hình đang nạp).
 */
export function resolveDataScope(user: UserProfile | null | undefined, roleScopes?: Record<UserRole, DataScope>): DataScope {
  if (!user) return 'OWN';
  if (isPartnerUser(user)) return 'OWN';
  if (user.role === 'ADMIN') return 'ALL';
  const perms = user.permissions || [];
  if (perms.includes('ALL_PERMISSIONS') || perms.includes('canViewAllBrands')) return 'ALL';
  if ((user.assignedBrands || []).some((b) => GLOBAL_BRAND_FLAGS.has(b.trim().toUpperCase()))) return 'ALL';
  if (!roleScopes && user.dataScope) return user.dataScope;
  const map = roleScopes || getSavedRoleDataScope();
  return map[user.role] || ROLE_DEFAULT_DATA_SCOPE[user.role] || 'OWN';
}

/**
 * Danh sách tên nhân sự nằm trong phạm vi. TEAM: bản thân + nhân sự báo cáo trực tiếp (+ PIC các gian hàng mình làm Leader
 * khi có danh mục gian hàng). DEPARTMENT: toàn bộ nhân sự cùng khối. OWN: bản thân. ALL: không giới hạn (trả về null).
 */
export function computeScopeMemberNames(
  user: UserProfile,
  scope: DataScope,
  staff: InternalStaffRbacMember[],
  stores?: StorePortfolioItem[]
): string[] | null {
  if (scope === 'ALL') return null;
  const names = new Set<string>();
  if (user.name?.trim()) names.add(user.name.trim());
  if (scope === 'OWN') return Array.from(names);

  const me = staff.find((s) => s.id === user.id || (!!user.email && norm(s.email) === norm(user.email)));
  const myIds = new Set([user.id, me?.id].filter(Boolean) as string[]);
  const myName = norm(user.name);

  if (scope === 'TEAM') {
    for (const s of staff) {
      if (s.status === 'SUSPENDED') continue;
      if ((s.managerId && myIds.has(s.managerId)) || (myName && norm(s.managerName) === myName)) names.add(s.name.trim());
    }
    for (const store of stores || []) {
      if (!myName || !splitPics(store.bookingLeader).some((n) => norm(n) === myName)) continue;
      for (const pic of storeExecutionPics(store)) names.add(pic);
    }
    return Array.from(names);
  }

  const dept = departmentOf(me ? { role: me.role, departmentScope: me.departmentScope } : user);
  for (const s of staff) {
    if (s.status === 'SUSPENDED') continue;
    if (departmentOf(s) === dept) names.add(s.name.trim());
  }
  return Array.from(names);
}

function splitPics(value?: string): string[] {
  return (value || '').split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

function storeExecutionPics(store: StorePortfolioItem): string[] {
  return [
    store.b2cOwnerName,
    store.primaryPic,
    store.assignedStaff,
    store.contentPic,
    store.mediaPic,
    store.backupOwnerName,
    ...(store.b2cOwners || []),
  ].flatMap((v) => splitPics(v));
}

const memberCache = new WeakMap<UserProfile, { key: string; set: Set<string> | null }>();

/**
 * Tập tên (chữ thường) trong phạm vi của người dùng; null = không giới hạn.
 * Ưu tiên danh sách máy chủ đã tính (đúng cả với Leader không được tải danh bạ nhân sự).
 */
export function getScopeMemberNameSet(user: UserProfile | null | undefined, stores?: StorePortfolioItem[]): Set<string> | null {
  if (!user) return new Set();
  const scope = resolveDataScope(user);
  if (scope === 'ALL') return null;
  const key = `${scope}|${stores?.length ?? 0}`;
  const cached = memberCache.get(user);
  if (cached && cached.key === key) return cached.set;

  const names = new Set<string>();
  const add = (n?: string) => { const v = norm(n); if (v) names.add(v); };
  add(user.name);
  if (scope !== 'OWN') {
    const staff = getSavedInternalStaffList();
    if (user.dataScope === scope && user.scopeMemberNames?.length) user.scopeMemberNames.forEach(add);
    else (computeScopeMemberNames(user, scope, staff) || []).forEach(add);
    if (scope === 'TEAM' && stores?.length) (computeScopeMemberNames(user, 'TEAM', [], stores) || []).forEach(add);
  }
  memberCache.set(user, { key, set: names });
  return names;
}

/** Một ô PIC (có thể chứa nhiều tên cách nhau bởi , ; |) có người nào thuộc phạm vi không. */
export function isPicInScope(pic: string | undefined, scopeNames: Set<string> | null): boolean {
  if (scopeNames === null) return true;
  if (!pic) return false;
  return splitPics(pic).some((n) => scopeNames.has(norm(n)));
}

/** Người dùng có quyền thấy dữ liệu của cả nhóm (không chỉ việc của mình) hay không — dùng để chọn bố cục quản lý / thực thi. */
export function hasTeamOversight(user: UserProfile | null | undefined): boolean {
  return resolveDataScope(user) !== 'OWN';
}
