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
  if (!revision) return user.canLogin === false ? null : user;
  const staff = policy.internalStaff.find(s => s.id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
  const master = UPBASE_STAFF_MASTER.find(s => `staff-${s.id}` === user.id || s.email.toLowerCase() === user.email.toLowerCase());
  let result = { ...user };
  if (staff) result = { ...result, role: staff.role, roleTitle: staff.roleTitle, assignedBrands: staff.picBrands, permissions: Object.entries(staff.permissions).filter(([, v]) => v).map(([k]) => k) };
  if (master && user.role !== 'ADMIN') {
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
  if (action === 'approve') return level === 'APPROVE' || level === 'ALL';
  return ['ALL', 'APPROVE', 'SCOPED', 'EDIT'].includes(level);
}
