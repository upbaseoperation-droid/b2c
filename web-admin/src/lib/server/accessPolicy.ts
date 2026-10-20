import type { UserProfile, UserRole, TabKey, PermissionMatrixItem, InternalStaffRbacMember, DepartmentAccessRule, RbacAuditLogItem, DataScope } from '../types';
import {
  ALL_SYSTEM_SCREENS,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_INTERNAL_STAFF_RBAC,
  INITIAL_DEPARTMENT_ACCESS_RULES,
  ROLE_ALLOWED_TABS,
  ROLE_DEFAULT_LANDING,
  ROLE_DEFAULT_DATA_SCOPE,
  classifyMasterStaffMember,
  type StaffAccessOverrideItem,
} from '../rbacData';
import { UPBASE_STAFF_MASTER } from '../importedMasterData';
import { readRecord } from './sharedRecords';

export interface AccessPolicy {
  staffOverrides: Record<string, StaffAccessOverrideItem>;
  deptRules: DepartmentAccessRule[];
  roleAllowedTabs: typeof ROLE_ALLOWED_TABS;
  roleDefaultLanding: typeof ROLE_DEFAULT_LANDING;
  roleDataScope?: Partial<Record<UserRole, DataScope>>;
  internalStaff: InternalStaffRbacMember[];
  matrix: PermissionMatrixItem[];
  audit: RbacAuditLogItem[];
  knownScreenKeys?: TabKey[];
}

export const defaultPolicy: AccessPolicy = {
  staffOverrides: {},
  deptRules: INITIAL_DEPARTMENT_ACCESS_RULES,
  roleAllowedTabs: ROLE_ALLOWED_TABS,
  roleDefaultLanding: ROLE_DEFAULT_LANDING,
  roleDataScope: ROLE_DEFAULT_DATA_SCOPE,
  internalStaff: INITIAL_INTERNAL_STAFF_RBAC,
  matrix: INITIAL_PERMISSION_MATRIX,
  audit: [],
  knownScreenKeys: ALL_SYSTEM_SCREENS.map((s) => s.key),
};

const SPECIALIST_MEMBER_ROLES: UserRole[] = [
  'BOOKING_MEMBER',
  'CONTENT_MEMBER',
  'BRAND_MEMBER',
  'GROWTH_MEMBER',
  'MEDIA_MEMBER',
];

/**
 * Tự động đồng bộ cấu hình quyền đã lưu trên đĩa với mã nguồn mới nhất khi hệ thống thêm/sửa tính năng,
 * thêm màn hình mới, cập nhật tiêu đề hoặc bổ sung nhân sự/phòng ban mặc định.
 */
export function reconcileAccessPolicy(saved: Partial<AccessPolicy> | null | undefined): AccessPolicy {
  const raw = saved || {};
  const catalogKeys = ALL_SYSTEM_SCREENS.map((s) => s.key);
  const catalogKeySet = new Set<TabKey>(catalogKeys);
  // Nếu bản ghi cũ trong DB chưa từng lưu knownScreenKeys, tập màn hình đã biết chỉ tính các màn hình
  // thực sự xuất hiện trong raw.roleAllowedTabs để tự động bổ sung các màn mới (tiktok-crawler, market-research...)
  const legacySavedKeys = Object.values(raw.roleAllowedTabs || {}).flat() as TabKey[];
  const previousKnownSet = raw.knownScreenKeys?.length
    ? new Set<TabKey>(raw.knownScreenKeys)
    : new Set<TabKey>(legacySavedKeys);
  const newlyAddedScreenKeys = catalogKeys.filter((k) => !previousKnownSet.has(k));

  // Các màn hình nghiệp vụ cốt lõi mới mở rộng cho nhân sự & quản lý cần luôn đồng bộ theo ROLE_ALLOWED_TABS
  // nếu bản ghi cũ chưa cập nhật
  const CORE_ROLE_SYNCED_SCREENS: TabKey[] = [
    'tiktok-crawler',
    'market-research',
    'task-delegation',
    'contracts',
    'cloudflare-admin',
  ];

  // 1. Đồng bộ danh sách màn hình theo từng vai trò (roleAllowedTabs & roleDefaultLanding)
  const reconciledTabs = { ...ROLE_ALLOWED_TABS };
  const reconciledLanding = { ...ROLE_DEFAULT_LANDING };
  const roles = Object.keys(ROLE_ALLOWED_TABS) as UserRole[];

  for (const role of roles) {
    const savedTabs = Array.isArray(raw.roleAllowedTabs?.[role])
      ? raw.roleAllowedTabs![role].filter((k) => catalogKeySet.has(k))
      : ROLE_ALLOWED_TABS[role].filter((k) => catalogKeySet.has(k));

    const mergedSet = new Set<TabKey>(savedTabs);
    // Nếu có màn hình mới được thêm trong code, tự động bật cho ADMIN và các Role có màn hình đó trong mặc định
    for (const newKey of newlyAddedScreenKeys) {
      if (role === 'ADMIN' || ROLE_ALLOWED_TABS[role]?.includes(newKey)) {
        mergedSet.add(newKey);
      }
    }
    for (const coreKey of CORE_ROLE_SYNCED_SCREENS) {
      if (ROLE_ALLOWED_TABS[role]?.includes(coreKey)) {
        mergedSet.add(coreKey);
      }
    }
    if (role === 'ADMIN') {
      mergedSet.add('partner-access');
    }
    const finalTabs = Array.from(mergedSet);
    reconciledTabs[role] = finalTabs.length > 0 ? finalTabs : [ROLE_DEFAULT_LANDING[role] || 'cockpit'];

    const candidateLanding = raw.roleDefaultLanding?.[role] || ROLE_DEFAULT_LANDING[role];
    reconciledLanding[role] = reconciledTabs[role].includes(candidateLanding)
      ? candidateLanding
      : reconciledTabs[role][0];
  }

  // 2. Đồng bộ Ma trận chức năng (matrix): lấy danh mục & mô tả mới nhất từ code, giữ nguyên quyền đã lưu
  const savedMatrixById = new Map<string, PermissionMatrixItem>(
    (Array.isArray(raw.matrix) ? raw.matrix : []).map((item) => [item.id, item])
  );
  const reconciledMatrix: PermissionMatrixItem[] = INITIAL_PERMISSION_MATRIX.map((defItem) => {
    const savedItem = savedMatrixById.get(defItem.id);
    const mergedPerms: Record<string, PermissionMatrixItem['permissions'][string]> = {
      ...defItem.permissions,
      ...(savedItem?.permissions || {}),
    };
    const baseMemberLevel = mergedPerms.MEMBER ?? defItem.permissions.MEMBER ?? 'SCOPED';
    for (const specRole of SPECIALIST_MEMBER_ROLES) {
      if (!mergedPerms[specRole]) {
        mergedPerms[specRole] = baseMemberLevel;
      }
    }
    return {
      ...defItem,
      permissions: mergedPerms,
    };
  });

  // 3. Đồng bộ Quy tắc mở cổng phòng ban (deptRules)
  const savedRulesById = new Map<string, DepartmentAccessRule>(
    (Array.isArray(raw.deptRules) ? raw.deptRules : []).map((r) => [r.id, r])
  );
  const reconciledDeptRules: DepartmentAccessRule[] = INITIAL_DEPARTMENT_ACCESS_RULES.map((defRule) => {
    const savedRule = savedRulesById.get(defRule.id);
    if (!savedRule) return defRule;
    return {
      ...defRule,
      autoAllowLogin:
        typeof savedRule.autoAllowLogin === 'boolean' ? savedRule.autoAllowLogin : defRule.autoAllowLogin,
      defaultRole: savedRule.defaultRole || defRule.defaultRole,
      defaultManagerName: savedRule.defaultManagerName || defRule.defaultManagerName,
    };
  });

  // 4. Đồng bộ Nhân sự nội bộ (internalStaff): giữ cấu hình đã lưu và bổ sung nhân sự mới phát sinh trong code
  const savedStaffList = Array.isArray(raw.internalStaff) && raw.internalStaff.length > 0
    ? [...raw.internalStaff]
    : [...INITIAL_INTERNAL_STAFF_RBAC];
  const existingIds = new Set(savedStaffList.map((s) => s.id));
  const existingEmails = new Set(savedStaffList.map((s) => s.email.toLowerCase()));
  for (const defStaff of INITIAL_INTERNAL_STAFF_RBAC) {
    if (!existingIds.has(defStaff.id) && !existingEmails.has(defStaff.email.toLowerCase())) {
      savedStaffList.push(defStaff);
    }
  }

  return {
    staffOverrides: raw.staffOverrides || {},
    deptRules: reconciledDeptRules,
    roleAllowedTabs: reconciledTabs,
    roleDefaultLanding: reconciledLanding,
    roleDataScope: raw.roleDataScope || ROLE_DEFAULT_DATA_SCOPE,
    internalStaff: savedStaffList,
    matrix: reconciledMatrix,
    audit: Array.isArray(raw.audit) ? raw.audit : [],
    knownScreenKeys: catalogKeys,
  };
}

let cachedReconciledPolicy: { revision: number; data: AccessPolicy } | null = null;

export async function readPolicy() {
  const record = await readRecord('access-policy', defaultPolicy);
  if (cachedReconciledPolicy && cachedReconciledPolicy.revision === record.revision && record.revision > 0) {
    return {
      revision: record.revision,
      data: cachedReconciledPolicy.data,
    };
  }
  const reconciled = reconcileAccessPolicy(record.data);
  cachedReconciledPolicy = { revision: record.revision, data: reconciled };
  return {
    ...record,
    data: reconciled,
  };
}

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

export async function actionAllowed(
  user: UserProfile,
  feature: string,
  action: 'read' | 'write' | 'create' | 'update' | 'delete' | 'approve' | 'export' = 'read'
) {
  if (user.role === 'ADMIN') return true;
  const { data } = await readPolicy();
  const item = data.matrix.find(p => p.id === feature);
  const level = item?.permissions[user.role] ?? (SPECIALIST_MEMBER_ROLES.includes(user.role) ? item?.permissions.MEMBER : undefined) ?? 'DENIED';
  // Kiểm tra quyền đặc thù cá nhân (Special Staff Permissions) được Admin/Manager cấp riêng
  const perms = user.permissions || [];
  if (
    (feature === 'payment_approval_disbursement' || feature === 'payment_request_submission' || feature === 'finance_payment_request') &&
    perms.includes('canApprovePayment')
  ) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (feature === 'plan_target_month' && perms.includes('canApproveBudget')) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (
    (feature === 'p3_performance_evaluation' || feature === 'performance_p3_scoring') &&
    perms.includes('canApproveP3')
  ) {
    if (action === 'read' || action === 'approve') return true;
  }
  if (
    feature === 'master_data_brand_stores' &&
    perms.includes('canManageMasterData')
  ) {
    return true;
  }
  if (
    feature === 'raw_data_export' &&
    perms.includes('canExportRawData')
  ) {
    if (action === 'read' || action === 'export' || action === 'write') return true;
  }

  if (action === 'read') return level !== 'DENIED';
  if (action === 'approve') return level === 'APPROVE' || level === 'ALL';
  if (action === 'delete') return level === 'ALL';
  return ['ALL', 'APPROVE', 'SCOPED'].includes(level);
}
