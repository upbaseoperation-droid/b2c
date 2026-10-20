import type { UserProfile, PermissionMatrixItem, InternalStaffRbacMember, DepartmentAccessRule, RbacAuditLogItem } from '../types';
import { INITIAL_PERMISSION_MATRIX, INITIAL_INTERNAL_STAFF_RBAC, INITIAL_DEPARTMENT_ACCESS_RULES, ROLE_ALLOWED_TABS, ROLE_DEFAULT_LANDING, classifyMasterStaffMember, type StaffAccessOverrideItem } from '../rbacData';
import { UPBASE_STAFF_MASTER } from '../importedMasterData';
import { readRecord } from './sharedRecords';

export interface AccessPolicy {
  staffOverrides: Record<string, StaffAccessOverrideItem>;
  deptRules: DepartmentAccessRule[];
  roleAllowedTabs: typeof ROLE_ALLOWED_TABS;
  roleDefaultLanding: typeof ROLE_DEFAULT_LANDING;
  internalStaff: InternalStaffRbacMember[];
  matrix: PermissionMatrixItem[];
  audit: RbacAuditLogItem[];
}
export const defaultPolicy: AccessPolicy = {
  staffOverrides: {}, deptRules: INITIAL_DEPARTMENT_ACCESS_RULES,
  roleAllowedTabs: ROLE_ALLOWED_TABS, roleDefaultLanding: ROLE_DEFAULT_LANDING,
  internalStaff: INITIAL_INTERNAL_STAFF_RBAC, matrix: INITIAL_PERMISSION_MATRIX, audit: [],
};
export const readPolicy = () => readRecord('access-policy', defaultPolicy);
export async function effectiveUser(user: UserProfile | null): Promise<UserProfile | null> {
  if (!user) return null;
  const { data: policy, revision } = await readPolicy();
  return userWithPolicy(user, policy, revision);
}
export function userWithPolicy(user: UserProfile, policy: AccessPolicy, revision = 1): UserProfile | null {
  if (!revision) return user.canLogin === false ? null : user;
  const sameEmail = (email: string) => !!user.email && email.toLowerCase() === user.email.toLowerCase();
  const staff = policy.internalStaff.find(s => s.id === user.id || sameEmail(s.email));
  const master = UPBASE_STAFF_MASTER.find(s => `staff-${s.id}` === user.id || sameEmail(s.email));
  let result = { ...user };
  if (staff?.status === 'SUSPENDED' || staff?.canLogin === false) return null;
  if (staff) result = { ...result, role: staff.role, roleTitle: staff.roleTitle, permissions: Object.entries(staff.permissions).filter(([, v]) => v).map(([k]) => k) };
  if (master && (result.role !== 'ADMIN' || policy.staffOverrides[master.id])) {
    const classified = classifyMasterStaffMember(master, policy.deptRules, policy.staffOverrides);
    if (!classified.canLogin) return null;
    if (policy.staffOverrides[master.id]) result = { ...result, role: classified.role, departmentScope: classified.departmentScope };
  }
  return result.canLogin === false ? null : result;
}
export async function actionAllowed(user: UserProfile, feature: string, action: 'read' | 'write' | 'approve' = 'read') {
  if (user.role === 'ADMIN') return true;
  const { data } = await readPolicy();
  const item = data.matrix.find(p => p.id === feature);
  const memberRoles = ['BOOKING_MEMBER', 'CONTENT_MEMBER', 'BRAND_MEMBER', 'GROWTH_MEMBER', 'MEDIA_MEMBER'];
  const level = item?.permissions[user.role] ?? (memberRoles.includes(user.role) ? item?.permissions.MEMBER : undefined) ?? 'DENIED';
  if (action === 'read') return level !== 'DENIED';
  if (level !== 'DENIED' && feature === 'plan_target_month' && action === 'approve' && user.permissions?.includes('canApproveBudget')) return true;
  if (action === 'approve') return level === 'APPROVE' || level === 'ALL';
  return ['ALL', 'APPROVE', 'SCOPED'].includes(level);
}
