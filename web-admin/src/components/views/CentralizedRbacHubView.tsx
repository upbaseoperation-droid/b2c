'use client';

import React, { useState, useMemo, useRef, useDeferredValue, useEffect } from 'react';
import {
  Avatar,
  Button,
  Chips,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  Modal,
  Pagination,
  Panel,
  Select,
  Status,
  Tabs,
} from '../ui';
import type { ChipOption } from '../ui';
import {
  Search,
  CheckCircle2,
  Eye,
  Edit3,
  Mail,
  Layers,
  RefreshCw,
  Users,
  Lock,
  Unlock,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  SystemDepartmentScope,
  DepartmentAccessRule,
  BrandDetail,
  KocItem,
  PermissionAccessLevel,
  PermissionMatrixItem,
  InternalStaffRbacMember,
  RbacAuditLogItem,
} from '../../lib/types';
import {
  ALL_ROLE_DEFINITIONS,
  ALL_SYSTEM_SCREENS,
  ROLE_ALLOWED_TABS,
  ROLE_DEFAULT_LANDING,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_DEPARTMENT_ACCESS_RULES,
  INITIAL_INTERNAL_STAFF_RBAC,
  PERMISSION_BADGE_CONFIG,
  classifyMasterStaffMember,
  getSavedStaffAccessOverrides,
  getSavedDeptAccessRules,
  getSavedRoleAllowedTabs,
  getSavedRoleDefaultLanding,
  getSavedInternalStaffList,
  hydrateRbacPolicy,
  StaffAccessOverrideItem,
} from '../../lib/rbacData';
import { loadAccessPolicy, saveAccessPolicy } from '../../lib/policyClient';
import type { TabKey } from '../Sidebar';
import { UPBASE_STAFF_MASTER } from '../../lib/importedMasterData';
import { ThirdPartyAccessSetupView } from './ThirdPartyAccessSetupView';
import { INITIAL_BRANDS, INITIAL_KOCS } from '../../lib/mockData';

interface CentralizedRbacHubViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  kocs?: KocItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onImpersonateUser?: (user: UserProfile) => void;
  onImpersonatePartner?: (partnerUser: UserProfile) => void;
}

type MainTab = 'roles' | 'matrix' | 'internal' | 'gatekeeper' | 'third-party';
type MatrixRoleGroupFilter = 'ALL' | 'MANAGERS' | 'INTERNAL_OPS' | 'EXTERNAL';
type InternalRoleGroupFilter = 'ALL' | 'LEADERSHIP' | 'EXECUTION' | 'BACKOFFICE';
type GatekeeperScopeChip = 'ALLOWED_3_SCOPES' | 'ALL' | 'MARKETING_B2C' | 'OTHER_BLOCKED' | 'OVERRIDDEN';

const SCOPE_LABELS: Record<
  SystemDepartmentScope,
  { label: string; shortLabel: string; badgeClass: string; managerLabel: string }
> = {
  MARKETING_B2C: {
    label: 'Khối Marketing B2C',
    shortLabel: 'Marketing B2C',
    badgeClass: 'bg-accent-soft text-accent border-accent/20',
    managerLabel: 'Đặng Thị Yến Nhi',
  },
  OTHER_BLOCKED: {
    label: 'Phòng ban khác',
    shortLabel: 'Ngoài B2C',
    badgeClass: 'bg-sunken text-ink-2 border-line',
    managerLabel: 'Ngoài phạm vi B2C',
  },
};

const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  ADMIN: 'Quản trị hệ thống (Admin)',
  MANAGER: 'Giám đốc Marketing B2C',
  LEADER: 'Trưởng nhóm B2C',
  BOOKING_MEMBER: 'Chuyên viên Booking B2C',
  CONTENT_MEMBER: 'Chuyên viên Content B2C',
  BRAND_MEMBER: 'Chuyên viên Brand PIC',
  MEMBER: 'Chuyên viên vận hành',
  BRAND_PARTNER: 'Đối tác Brand',
  KOC_PARTNER: 'KOC / KOL',
  CTV_PARTNER: 'Cộng tác viên',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  SIGN_ADMIN: 'Điều phối ký điện tử',
};

const ROLE_SHORT_HEADER: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'GĐ MKT B2C',
  LEADER: 'Leader B2C',
  BOOKING_MEMBER: 'CV Booking',
  CONTENT_MEMBER: 'CV Content',
  BRAND_MEMBER: 'CV Brand',
  MEMBER: 'Chuyên viên',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  SIGN_ADMIN: 'Ký số weSign',
  BRAND_PARTNER: 'Đối tác Brand',
  KOC_PARTNER: 'KOC / KOL',
  CTV_PARTNER: 'CTV nội bộ',
};

function serializePolicyDraft(p: {
  staffOverrides: unknown;
  deptRules: unknown;
  roleAllowedTabs: unknown;
  roleDefaultLanding: unknown;
  internalStaff: unknown;
  matrix: unknown;
}): string {
  return JSON.stringify({
    staffOverrides: p.staffOverrides,
    deptRules: p.deptRules,
    roleAllowedTabs: p.roleAllowedTabs,
    roleDefaultLanding: p.roleDefaultLanding,
    internalStaff: p.internalStaff,
    matrix: p.matrix,
  });
}

export const CentralizedRbacHubView: React.FC<CentralizedRbacHubViewProps> = ({
  currentUser,
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onImpersonateUser,
  onImpersonatePartner,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('roles');
  const logCounterRef = useRef(100);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isB2cManager = currentUser?.role === 'MANAGER';

  // --- STATE TAB ROLES: QUẢN TRỊ LỚP ROLE & PHÂN QUYỀN MÀN HÌNH ---
  const [roleAllowedTabsMap, setRoleAllowedTabsMap] = useState<Record<UserRole, TabKey[]>>(() =>
    getSavedRoleAllowedTabs()
  );
  const [roleDefaultLandingMap, setRoleDefaultLandingMap] = useState<Record<UserRole, TabKey>>(() =>
    getSavedRoleDefaultLanding()
  );
  const [selectedRoleKey, setSelectedRoleKey] = useState<UserRole>('MANAGER');
  const [roleListSearch, setRoleListSearch] = useState<string>('');
  const [roleSearchScreen, setRoleSearchScreen] = useState<string>('');
  const [selectedScreenCat, setSelectedScreenCat] = useState<string>('ALL');
  const [assignStaffToRoleId, setAssignStaffToRoleId] = useState<string>('');

  // --- STATE TAB GATEKEEPER: CỔNG KIỂM SOÁT TRUY CẬP 1.011 NHÂN SỰ ---
  const [deptRules, setDeptRules] = useState<DepartmentAccessRule[]>(() => getSavedDeptAccessRules());
  const [staffOverrides, setStaffOverrides] = useState<Record<string, StaffAccessOverrideItem>>(() =>
    getSavedStaffAccessOverrides()
  );
  const [dirSearch, setDirSearch] = useState('');
  const deferredDirSearch = useDeferredValue(dirSearch);
  const [dirScopeFilter, setDirScopeFilter] = useState<GatekeeperScopeChip>(() => {
    if (isB2cManager) return 'MARKETING_B2C';
    return 'ALLOWED_3_SCOPES';
  });
  const [dirLoginFilter, setDirLoginFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED'>('ALL');
  const [dirDeptFilter, setDirDeptFilter] = useState<string>('ALL');
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = useState(20);

  // Modal cấu hình nhân sự trong danh bạ 1.011 người
  const [editingDirectoryStaffId, setEditingDirectoryStaffId] = useState<string | null>(null);
  const [dirEditCanLogin, setDirEditCanLogin] = useState<boolean>(true);
  const [dirEditScope, setDirEditScope] = useState<SystemDepartmentScope>('MARKETING_B2C');
  const [dirEditRole, setDirEditRole] = useState<UserRole>('BOOKING_MEMBER');
  const [dirEditManager, setDirEditManager] = useState<string>('Đặng Thị Yến Nhi');

  // Tự động đồng bộ bộ lọc theo vai trò Trưởng phòng khi đổi tài khoản
  const [prevUserRole, setPrevUserRole] = useState<UserRole | undefined>(currentUser?.role);
  if (currentUser?.role !== prevUserRole) {
    setPrevUserRole(currentUser?.role);
    if (currentUser?.role === 'MANAGER') {
      setDirScopeFilter('MARKETING_B2C');
      setDirPage(1);
    } else if (currentUser?.role === 'ADMIN') {
      setDirScopeFilter('ALLOWED_3_SCOPES');
      setDirPage(1);
    }
  }

  // --- STATE TAB MATRIX: MA TRẬN CHỨC NĂNG ---
  const [matrixItems, setMatrixItems] = useState<PermissionMatrixItem[]>(INITIAL_PERMISSION_MATRIX);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchMatrix, setSearchMatrix] = useState<string>('');
  const deferredSearchMatrix = useDeferredValue(searchMatrix);
  const [matrixRoleGroup, setMatrixRoleGroup] = useState<MatrixRoleGroupFilter>('ALL');
  const [isConfirmingResetMatrix, setIsConfirmingResetMatrix] = useState(false);

  // --- STATE TAB INTERNAL: NHÂN SỰ NỘI BỘ ---
  const [internalStaff, setInternalStaff] = useState<InternalStaffRbacMember[]>(() =>
    getSavedInternalStaffList()
  );
  const [searchStaff, setSearchStaff] = useState<string>('');
  const deferredSearchStaff = useDeferredValue(searchStaff);
  const [staffGroupFilter, setStaffGroupFilter] = useState<InternalRoleGroupFilter>('ALL');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('ALL');
  const [editingStaff, setEditingStaff] = useState<InternalStaffRbacMember | null>(null);
  const [staffFormRole, setStaffFormRole] = useState<UserRole>('MEMBER');
  const [staffFormRoleTitle, setStaffFormRoleTitle] = useState<string>('');
  const [staffFormPerms, setStaffFormPerms] = useState({
    canApproveBudget: false,
    canApproveP3: false,
    canApprovePayment: false,
    canViewAllBrands: false,
    canExportRawData: false,
    canManageMasterData: false,
  });

  // --- STATE POLICY SYNC ---
  const [auditLogs, setAuditLogs] = useState<RbacAuditLogItem[]>([]);
  const [policyRevision, setPolicyRevision] = useState<number | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [savedDraft, setSavedDraft] = useState('');

  const draftPolicy = useMemo(
    () => ({
      staffOverrides,
      deptRules,
      roleAllowedTabs: roleAllowedTabsMap,
      roleDefaultLanding: roleDefaultLandingMap,
      internalStaff,
      matrix: matrixItems,
      audit: auditLogs,
    }),
    [
      staffOverrides,
      deptRules,
      roleAllowedTabsMap,
      roleDefaultLandingMap,
      internalStaff,
      matrixItems,
      auditLogs,
    ]
  );
  const draftText = useMemo(
    () =>
      serializePolicyDraft({
        staffOverrides,
        deptRules,
        roleAllowedTabs: roleAllowedTabsMap,
        roleDefaultLanding: roleDefaultLandingMap,
        internalStaff,
        matrix: matrixItems,
      }),
    [staffOverrides, deptRules, roleAllowedTabsMap, roleDefaultLandingMap, internalStaff, matrixItems]
  );
  const policyDirty = savedDraft !== '' && draftText !== savedDraft;

  const applyPolicy = (record: Awaited<ReturnType<typeof loadAccessPolicy>>) => {
    const p = record.data;
    const nextDeptRules = p.deptRules?.length ? p.deptRules : INITIAL_DEPARTMENT_ACCESS_RULES;
    const nextInternalStaff = p.internalStaff?.length ? p.internalStaff : INITIAL_INTERNAL_STAFF_RBAC;
    setStaffOverrides(p.staffOverrides);
    setDeptRules(nextDeptRules);
    setRoleAllowedTabsMap(p.roleAllowedTabs);
    setRoleDefaultLandingMap(p.roleDefaultLanding);
    setInternalStaff(nextInternalStaff);
    setMatrixItems(p.matrix);
    setAuditLogs(p.audit);
    setPolicyRevision(record.revision);
    setSavedDraft(
      serializePolicyDraft({
        ...p,
        deptRules: nextDeptRules,
        internalStaff: nextInternalStaff,
      })
    );
  };

  useEffect(() => {
    if (policyRevision === null) return;
    hydrateRbacPolicy(draftPolicy, currentUser);
  }, [policyRevision, draftPolicy, currentUser]);

  const [prevUserId, setPrevUserId] = useState(currentUser?.id);
  if (currentUser?.id !== prevUserId) {
    setPrevUserId(currentUser?.id);
    setPolicyRevision(null);
  }

  useEffect(() => {
    let cancelled = false;
    loadAccessPolicy()
      .then((record) => {
        if (!cancelled) applyPolicy(record);
      })
      .catch((e) => {
        if (!cancelled) setPolicyError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (policyDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [policyDirty]);

  const commitPolicy = async () => {
    if (policyRevision === null || !isAdmin || policyBusy) return;
    setPolicyBusy(true);
    setPolicyError('');
    try {
      const record = await saveAccessPolicy(policyRevision, draftPolicy);
      applyPolicy({ ...record, user: currentUser! });
      onNotify?.('Đã lưu cấu hình phân quyền hệ thống.', 'success');
    } catch (e) {
      setPolicyError((e as Error).message);
    } finally {
      setPolicyBusy(false);
    }
  };

  // --- PHÂN LOẠI 1.011 NHÂN SỰ ---
  const classifiedDirectory = useMemo(() => {
    return UPBASE_STAFF_MASTER.map((member) => {
      const result = classifyMasterStaffMember(member, deptRules, staffOverrides);
      return {
        ...member,
        classifiedScope: result.departmentScope,
        canLogin: result.canLogin,
        mappedRole: result.role,
        mappedRoleTitle: result.roleTitle,
        managerName: result.managerName,
        accessSource: result.accessSource,
        accessReason: result.reason,
      };
    });
  }, [deptRules, staffOverrides]);

  const directoryStats = useMemo(() => {
    let mktTotal = 0,
      mktAllowed = 0;
    let otherTotal = 0,
      otherAllowed = 0;

    classifiedDirectory.forEach((s) => {
      if (s.classifiedScope === 'MARKETING_B2C') {
        mktTotal++;
        if (s.canLogin) mktAllowed++;
      } else {
        otherTotal++;
        if (s.canLogin) otherAllowed++;
      }
    });

    const totalAllowed = mktAllowed + otherAllowed;
    return {
      totalStaff: classifiedDirectory.length,
      totalAllowed,
      totalBlocked: classifiedDirectory.length - totalAllowed,
      mktTotal,
      mktAllowed,
      otherTotal,
      otherAllowed,
    };
  }, [classifiedDirectory]);

  const directoryDepartments = useMemo(() => {
    const set = new Set<string>();
    classifiedDirectory.forEach((s) => {
      const label = (s.department || s.team || '').trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort();
  }, [classifiedDirectory]);

  const filteredDirectory = useMemo(() => {
    return classifiedDirectory.filter((s) => {
      if (dirScopeFilter === 'ALLOWED_3_SCOPES') {
        if (s.classifiedScope !== 'MARKETING_B2C' && !s.canLogin) return false;
      } else if (dirScopeFilter === 'OVERRIDDEN') {
        if (!['ADMIN_EXPLICIT', 'REVOKED'].includes(s.accessSource)) return false;
      } else if (dirScopeFilter !== 'ALL') {
        if (s.classifiedScope !== dirScopeFilter) return false;
      }

      if (dirLoginFilter === 'ALLOWED' && !s.canLogin) return false;
      if (dirLoginFilter === 'BLOCKED' && s.canLogin) return false;

      if (dirDeptFilter !== 'ALL') {
        const label = (s.department || s.team || '').trim();
        if (label !== dirDeptFilter && s.team !== dirDeptFilter && s.department !== dirDeptFilter) return false;
      }

      if (deferredDirSearch.trim()) {
        const q = deferredDirSearch.toLowerCase().trim();
        const match =
          s.name.toLowerCase().includes(q) ||
          (s.staffCode && s.staffCode.toLowerCase().includes(q)) ||
          s.email.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.team && s.team.toLowerCase().includes(q)) ||
          (s.position && s.position.toLowerCase().includes(q)) ||
          s.managerName.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    classifiedDirectory,
    dirScopeFilter,
    dirLoginFilter,
    dirDeptFilter,
    deferredDirSearch,
  ]);

  const pagedDirectory = useMemo(() => {
    const start = (dirPage - 1) * dirPageSize;
    return filteredDirectory.slice(start, start + dirPageSize);
  }, [filteredDirectory, dirPage, dirPageSize]);

  // --- HANDLERS GATEKEEPER ---
  const handleToggleDeptRule = (ruleId: string) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị viên (Admin) mới có quyền thay đổi quy tắc mở cổng phòng ban.', 'warning');
      return;
    }
    const targetRule = deptRules.find((r) => r.id === ruleId);
    if (!targetRule) return;
    const nextAllow = !targetRule.autoAllowLogin;
    setDeptRules(deptRules.map((r) => (r.id === ruleId ? { ...r, autoAllowLogin: nextAllow } : r)));
    onNotify?.(
      `${nextAllow ? 'Đã mở cổng đăng nhập' : 'Đã khóa cổng đăng nhập'} cho cụm: ${targetRule.departmentOrTeamName}`,
      nextAllow ? 'success' : 'warning'
    );
  };

  const handleQuickToggleStaffLogin = (staff: (typeof classifiedDirectory)[0]) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Role Admin mới được phép cấp hoặc thu hồi quyền đăng nhập hệ thống.', 'warning');
      return;
    }
    const nextCanLogin = !staff.canLogin;
    const nextScope: SystemDepartmentScope =
      nextCanLogin && staff.classifiedScope === 'OTHER_BLOCKED'
        ? 'MARKETING_B2C'
        : staff.classifiedScope;
    const nextRole: UserRole =
      nextCanLogin && staff.classifiedScope === 'OTHER_BLOCKED'
        ? 'BOOKING_MEMBER'
        : staff.mappedRole;

    const newOverride: StaffAccessOverrideItem = {
      staffId: staff.id,
      canLogin: nextCanLogin,
      departmentScope: nextScope,
      role: nextRole,
      managerName: 'Đặng Thị Yến Nhi',
      updatedBy: currentUser?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    setStaffOverrides({ ...staffOverrides, [staff.id]: newOverride });
    // Đồng bộ sang danh sách Nhân sự nội bộ nếu nhân sự này nằm trong bảng internalStaff
    setInternalStaff((prev) =>
      prev.map((s) =>
        s.email.toLowerCase() === staff.email.toLowerCase()
          ? {
              ...s,
              canLogin: nextCanLogin,
              status: nextCanLogin ? 'ACTIVE' : 'SUSPENDED',
              role: nextRole,
              roleTitle: ROLE_DISPLAY_NAME[nextRole] || s.roleTitle,
              departmentScope: nextScope === 'OTHER_BLOCKED' ? s.departmentScope : nextScope,
            }
          : s
      )
    );
    onNotify?.(
      nextCanLogin
        ? `Đã mở quyền đăng nhập cho ${staff.name} (${SCOPE_LABELS[nextScope].shortLabel})`
        : `Đã chặn quyền đăng nhập của ${staff.name}`,
      nextCanLogin ? 'success' : 'info'
    );
  };

  const handleOpenEditDirectoryStaff = (staff: (typeof classifiedDirectory)[0]) => {
    setEditingDirectoryStaffId(staff.id);
    setDirEditCanLogin(staff.canLogin);
    setDirEditScope(staff.classifiedScope === 'OTHER_BLOCKED' ? 'MARKETING_B2C' : staff.classifiedScope);
    setDirEditRole(staff.mappedRole);
    setDirEditManager(staff.managerName === 'Ngoài phạm vi B2C' ? 'Đặng Thị Yến Nhi' : staff.managerName);
  };

  const handleSaveDirectoryStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDirectoryStaffId) return;
    const target = classifiedDirectory.find((s) => s.id === editingDirectoryStaffId);
    if (!target) return;

    const newOverride: StaffAccessOverrideItem = {
      staffId: target.id,
      canLogin: dirEditCanLogin,
      departmentScope: dirEditCanLogin ? dirEditScope : target.classifiedScope,
      role: dirEditRole,
      managerName: dirEditManager,
      updatedBy: currentUser?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };

    setStaffOverrides({ ...staffOverrides, [target.id]: newOverride });
    // Đồng bộ ngược sang danh sách Nhân sự nội bộ
    setInternalStaff((prev) =>
      prev.map((s) =>
        s.email.toLowerCase() === target.email.toLowerCase()
          ? {
              ...s,
              canLogin: dirEditCanLogin,
              status: dirEditCanLogin ? 'ACTIVE' : 'SUSPENDED',
              role: dirEditRole,
              roleTitle: ROLE_DISPLAY_NAME[dirEditRole] || s.roleTitle,
              departmentScope: dirEditCanLogin ? dirEditScope : s.departmentScope,
            }
          : s
      )
    );
    setEditingDirectoryStaffId(null);
    onNotify?.(`Đã cập nhật phân quyền cho ${target.name} (${ROLE_DISPLAY_NAME[dirEditRole]})`, 'info');
  };

  // --- HANDLERS TAB ROLES ---
  const selectedRoleDef = useMemo(() => {
    return ALL_ROLE_DEFINITIONS.find((r) => r.id === selectedRoleKey) || ALL_ROLE_DEFINITIONS[0];
  }, [selectedRoleKey]);

  const catalogScreenKeySet = useMemo(
    () => new Set<TabKey>(ALL_SYSTEM_SCREENS.map((s) => s.key)),
    []
  );

  const selectedRoleAllowedTabs = useMemo(() => {
    const raw = roleAllowedTabsMap[selectedRoleKey] || ROLE_ALLOWED_TABS[selectedRoleKey] || [];
    return raw.filter((k) => catalogScreenKeySet.has(k));
  }, [roleAllowedTabsMap, selectedRoleKey, catalogScreenKeySet]);

  const selectedRoleDefaultLanding = useMemo(() => {
    const landing = roleDefaultLandingMap[selectedRoleKey] || ROLE_DEFAULT_LANDING[selectedRoleKey];
    if (selectedRoleAllowedTabs.includes(landing)) return landing;
    return selectedRoleAllowedTabs[0] || landing;
  }, [roleDefaultLandingMap, selectedRoleKey, selectedRoleAllowedTabs]);

  const allScreenCategories = useMemo(
    () => Array.from(new Set(ALL_SYSTEM_SCREENS.map((s) => s.groupTitle))),
    []
  );

  const handleToggleRoleScreen = (role: UserRole, screenKey: TabKey) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép thay đổi phân quyền màn hình của Role.', 'warning');
      return;
    }
    const currentTabs = roleAllowedTabsMap[role] || ROLE_ALLOWED_TABS[role] || [];
    const exists = currentTabs.includes(screenKey);
    if (exists && currentTabs.length <= 1) {
      onNotify?.('Mỗi vai trò phải có tối thiểu 1 màn hình được phép truy cập.', 'warning');
      return;
    }
    const nextTabs = exists ? currentTabs.filter((t) => t !== screenKey) : [...currentTabs, screenKey];
    setRoleAllowedTabsMap({ ...roleAllowedTabsMap, [role]: nextTabs });

    const currentLanding = roleDefaultLandingMap[role] || ROLE_DEFAULT_LANDING[role];
    if (!nextTabs.includes(currentLanding) && nextTabs.length > 0) {
      setRoleDefaultLandingMap({ ...roleDefaultLandingMap, [role]: nextTabs[0] });
    }
  };

  const handleToggleRoleCategoryScreens = (role: UserRole, categoryScreens: TabKey[], enableAll: boolean) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép thay đổi phân quyền màn hình của Role.', 'warning');
      return;
    }
    const currentTabs = roleAllowedTabsMap[role] || ROLE_ALLOWED_TABS[role] || [];
    let nextTabs: TabKey[];
    if (enableAll) {
      nextTabs = Array.from(new Set<TabKey>([...currentTabs, ...categoryScreens]));
    } else {
      nextTabs = currentTabs.filter((t) => !categoryScreens.includes(t));
      if (nextTabs.length === 0) {
        nextTabs = [ROLE_DEFAULT_LANDING[role] || 'cockpit'];
      }
    }
    setRoleAllowedTabsMap({ ...roleAllowedTabsMap, [role]: nextTabs });
  };

  const handleChangeRoleDefaultLanding = (role: UserRole, nextLanding: TabKey) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép đổi màn hình mặc định của Role.', 'warning');
      return;
    }
    setRoleDefaultLandingMap({ ...roleDefaultLandingMap, [role]: nextLanding });
    const screenLabel = ALL_SYSTEM_SCREENS.find((s) => s.key === nextLanding)?.label || nextLanding;
    onNotify?.(`Đã đặt màn hình mặc định của ${ROLE_DISPLAY_NAME[role]} là "${screenLabel}"`, 'info');
  };

  const handleResetSingleRoleScreens = (role: UserRole) => {
    if (!isAdmin) return;
    setRoleAllowedTabsMap({ ...roleAllowedTabsMap, [role]: [...ROLE_ALLOWED_TABS[role]] });
    setRoleDefaultLandingMap({ ...roleDefaultLandingMap, [role]: ROLE_DEFAULT_LANDING[role] });
    onNotify?.(`Đã đặt lại danh sách màn hình mặc định cho ${ROLE_DISPLAY_NAME[role]}`, 'info');
  };

  const syncStaffRoleToDirectoryOverride = (staffEmail: string, nextRole: UserRole) => {
    const masterMatch = UPBASE_STAFF_MASTER.find(
      (m) => m.email.toLowerCase() === staffEmail.toLowerCase()
    );
    if (!masterMatch) return;
    const classified = classifyMasterStaffMember(masterMatch, deptRules, staffOverrides);
    const nextScope: SystemDepartmentScope =
      classified.departmentScope === 'OTHER_BLOCKED'
        ? 'MARKETING_B2C'
        : classified.departmentScope;
    setStaffOverrides((prev) => ({
      ...prev,
      [masterMatch.id]: {
        staffId: masterMatch.id,
        canLogin: true,
        departmentScope: nextScope,
        role: nextRole,
        managerName: classified.managerName,
        updatedBy: currentUser?.name || 'Admin',
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleAssignStaffToSelectedRole = (staffId: string, targetRole: UserRole) => {
    if (!staffId) return;
    const targetStaff = internalStaff.find((s) => s.id === staffId);
    if (!targetStaff) return;

    setInternalStaff(
      internalStaff.map((s) =>
        s.id === staffId
          ? {
              ...s,
              role: targetRole,
              roleTitle: ROLE_DISPLAY_NAME[targetRole] || s.roleTitle,
            }
          : s
      )
    );
    syncStaffRoleToDirectoryOverride(targetStaff.email, targetRole);
    setAssignStaffToRoleId('');
    onNotify?.(`Đã gán vai trò ${ROLE_DISPLAY_NAME[targetRole]} cho ${targetStaff.name}`, 'info');
  };

  // --- HANDLERS TAB MATRIX ---
  const filteredMatrix = useMemo(() => {
    return matrixItems.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (deferredSearchMatrix.trim()) {
        const q = deferredSearchMatrix.toLowerCase();
        const matchName = item.featureName.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = item.categoryTitle.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [matrixItems, categoryFilter, deferredSearchMatrix]);

  const matrixRolesToRender = useMemo(() => {
    if (matrixRoleGroup === 'MANAGERS') {
      return ALL_ROLE_DEFINITIONS.filter((r) =>
        ['ADMIN', 'MANAGER', 'LEADER'].includes(r.id)
      );
    }
    if (matrixRoleGroup === 'INTERNAL_OPS') {
      return ALL_ROLE_DEFINITIONS.filter((r) =>
        [
          'BOOKING_MEMBER',
          'CONTENT_MEMBER',
          'BRAND_MEMBER',
          'LEGAL',
          'FINANCE',
          'SIGN_ADMIN',
        ].includes(r.id)
      );
    }
    if (matrixRoleGroup === 'EXTERNAL') {
      return ALL_ROLE_DEFINITIONS.filter((r) => r.scopeType === 'EXTERNAL');
    }
    return ALL_ROLE_DEFINITIONS;
  }, [matrixRoleGroup]);

  const handleUpdatePermission = (itemId: string, role: string, newLevel: PermissionAccessLevel) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép thay đổi ma trận chức năng.', 'warning');
      return;
    }
    setMatrixItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              permissions: {
                ...item.permissions,
                [role]: newLevel,
              },
            }
          : item
      )
    );
    void logCounterRef.current++;
  };

  // --- HANDLERS TAB INTERNAL STAFF ---
  const filteredStaff = useMemo(() => {
    return internalStaff.filter((staff) => {
      if (staffGroupFilter === 'LEADERSHIP') {
        if (!['ADMIN', 'MANAGER'].includes(staff.role)) return false;
      } else if (staffGroupFilter === 'EXECUTION') {
        if (
          ![
            'LEADER',
            'BOOKING_MEMBER',
            'CONTENT_MEMBER',
            'BRAND_MEMBER',
            'MEMBER',
          ].includes(staff.role)
        )
          return false;
      } else if (staffGroupFilter === 'BACKOFFICE') {
        if (!['LEGAL', 'FINANCE', 'SIGN_ADMIN'].includes(staff.role)) return false;
      }

      if (staffRoleFilter !== 'ALL' && staff.role !== staffRoleFilter) return false;
      if (deferredSearchStaff.trim()) {
        const q = deferredSearchStaff.toLowerCase();
        return (
          staff.name.toLowerCase().includes(q) ||
          staff.email.toLowerCase().includes(q) ||
          staff.department.toLowerCase().includes(q) ||
          staff.position.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [internalStaff, staffGroupFilter, staffRoleFilter, deferredSearchStaff]);

  const handleInlineRoleChange = (staffId: string, nextRole: UserRole) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép thay đổi vai trò nhân sự.', 'warning');
      return;
    }
    const target = internalStaff.find((s) => s.id === staffId);
    setInternalStaff((prev) =>
      prev.map((s) =>
        s.id === staffId
          ? {
              ...s,
              role: nextRole,
              roleTitle: ROLE_DISPLAY_NAME[nextRole] || s.roleTitle,
            }
          : s
      )
    );
    if (target) {
      syncStaffRoleToDirectoryOverride(target.email, nextRole);
    }
  };

  const handleInlineToggleStaffPerm = (
    staffId: string,
    permKey:
      | 'canApproveBudget'
      | 'canApproveP3'
      | 'canApprovePayment'
      | 'canExportRawData'
      | 'canViewAllBrands'
      | 'canManageMasterData'
  ) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép cấp quyền phê duyệt.', 'warning');
      return;
    }
    setInternalStaff((prev) =>
      prev.map((s) =>
        s.id === staffId
          ? {
              ...s,
              permissions: {
                ...s.permissions,
                [permKey]: !s.permissions[permKey],
              },
            }
          : s
      )
    );
  };

  const handleOpenEditStaff = (staff: InternalStaffRbacMember) => {
    setEditingStaff(staff);
    setStaffFormRole(staff.role);
    setStaffFormRoleTitle(staff.roleTitle);
    setStaffFormPerms({ ...staff.permissions });
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setInternalStaff(
      internalStaff.map((s) =>
        s.id === editingStaff.id
          ? {
              ...s,
              role: staffFormRole,
              roleTitle: staffFormRoleTitle || ROLE_DISPLAY_NAME[staffFormRole] || s.roleTitle,
              permissions: { ...staffFormPerms },
            }
          : s
      )
    );
    syncStaffRoleToDirectoryOverride(editingStaff.email, staffFormRole);
    setEditingStaff(null);
    onNotify?.(`Đã cập nhật phân quyền cho ${editingStaff.name}`, 'info');
  };

  const editingDirStaffObj = useMemo(() => {
    if (!editingDirectoryStaffId) return null;
    return classifiedDirectory.find((s) => s.id === editingDirectoryStaffId) || null;
  }, [classifiedDirectory, editingDirectoryStaffId]);

  const matrixRoleGroupChips: ChipOption<MatrixRoleGroupFilter>[] = [
    { key: 'ALL', label: 'Tất cả vai trò', count: ALL_ROLE_DEFINITIONS.length },
    { key: 'MANAGERS', label: 'Quản trị & Trưởng phòng', count: 5 },
    { key: 'INTERNAL_OPS', label: 'Chuyên viên & Nội bộ', count: 8 },
    { key: 'EXTERNAL', label: 'Đối tác ngoài', count: 3 },
  ];

  const internalStaffGroupChips: ChipOption<InternalRoleGroupFilter>[] = [
    { key: 'ALL', label: 'Tất cả', count: internalStaff.length },
    {
      key: 'LEADERSHIP',
      label: 'BGĐ & Trưởng phòng',
      count: internalStaff.filter((s) =>
        ['ADMIN', 'MANAGER'].includes(s.role)
      ).length,
    },
    {
      key: 'EXECUTION',
      label: 'Leader & Chuyên viên',
      count: internalStaff.filter((s) =>
        [
          'LEADER',
          'BOOKING_MEMBER',
          'CONTENT_MEMBER',
          'BRAND_MEMBER',
          'MEMBER',
        ].includes(s.role)
      ).length,
    },
    {
      key: 'BACKOFFICE',
      label: 'Pháp chế · Kế toán · Ký số',
      count: internalStaff.filter((s) => ['LEGAL', 'FINANCE', 'SIGN_ADMIN'].includes(s.role)).length,
    },
  ];

  const gatekeeperChips: ChipOption<GatekeeperScopeChip>[] = [
    { key: 'ALLOWED_3_SCOPES', label: 'Được vào', count: directoryStats.totalAllowed },
    { key: 'ALL', label: 'Toàn công ty', count: directoryStats.totalStaff },
    { key: 'MARKETING_B2C', label: 'Marketing B2C', count: directoryStats.mktTotal },
    { key: 'OTHER_BLOCKED', label: 'Phòng ban khác', count: directoryStats.otherTotal },
    { key: 'OVERRIDDEN', label: 'Ngoại lệ cá nhân', count: Object.keys(staffOverrides).length },
  ];

  const roleAssignedStaff = useMemo(
    () => internalStaff.filter((s) => s.role === selectedRoleKey),
    [internalStaff, selectedRoleKey]
  );

  return (
    <div className="space-y-4 pb-10">
      {policyError && (
        <div
          role="alert"
          className="rounded-lg border border-critical/30 bg-critical-soft px-3.5 py-2.5 text-xs text-critical flex items-center justify-between gap-3"
        >
          <span>{policyError}</span>
          <Button variant="secondary" size="sm" onClick={() => setPolicyError('')}>
            Đóng
          </Button>
        </div>
      )}

      <Tabs
        items={[
          { key: 'roles', label: 'Vai trò & Màn hình', count: ALL_ROLE_DEFINITIONS.length },
          { key: 'matrix', label: 'Ma trận chức năng', count: matrixItems.length },
          { key: 'internal', label: 'Nhân sự nội bộ', count: filteredStaff.length },
          {
            key: 'gatekeeper',
            label: 'Cổng truy cập Lark',
            count: `${directoryStats.totalAllowed}/${directoryStats.totalStaff}`,
          },
          { key: 'third-party', label: 'Đối tác ngoài' },
        ]}
        value={activeMainTab}
        onChange={(k) => setActiveMainTab(k as MainTab)}
        actions={
          policyDirty ? (
            <div className="flex items-center gap-2">
              <Status tone="warning">Chưa lưu thay đổi</Status>
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                disabled={policyBusy}
                onClick={() => {
                  loadAccessPolicy()
                    .then(applyPolicy)
                    .catch((e) => setPolicyError(e.message));
                }}
              >
                Hoàn tác
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                disabled={!isAdmin || policyRevision === null || policyBusy}
                onClick={commitPolicy}
              >
                {policyBusy ? 'Đang lưu…' : 'Lưu quyền'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* ========================================================================= */}
      {/* TAB 1: VAI TRÒ & PHÂN QUYỀN MÀN HÌNH                                       */}
      {/* ========================================================================= */}
      {activeMainTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Cột trái: Danh mục Role hệ thống */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Panel flush>
              <div className="p-3 border-b border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Danh mục vai trò</span>
                  <span className="text-2xs font-medium text-ink-3">
                    {ALL_ROLE_DEFINITIONS.length} vai trò
                  </span>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={roleListSearch}
                    onChange={(e) => setRoleListSearch(e.target.value)}
                    placeholder="Tìm vai trò..."
                    className="w-full pl-8 pr-2.5 h-8 text-xs rounded-md border border-line bg-canvas text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-surface"
                  />
                </div>
              </div>

              <div className="p-2 space-y-3 max-h-[calc(100dvh-220px)] overflow-y-auto">
                {[
                  {
                    groupTitle: 'Quản trị & Trưởng phòng',
                    roleIds: ['ADMIN', 'MANAGER', 'LEADER'] as UserRole[],
                  },
                  {
                    groupTitle: 'Chuyên viên thực thi',
                    roleIds: [
                      'BOOKING_MEMBER',
                      'CONTENT_MEMBER',
                      'BRAND_MEMBER',
                    ] as UserRole[],
                  },
                  {
                    groupTitle: 'Pháp chế · Kế toán · Ký số',
                    roleIds: ['LEGAL', 'FINANCE', 'SIGN_ADMIN'] as UserRole[],
                  },
                  {
                    groupTitle: 'Đối tác ngoài (Portal)',
                    roleIds: ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'] as UserRole[],
                  },
                ].map((group) => {
                  const visibleRoles = group.roleIds
                    .map((rId) => ALL_ROLE_DEFINITIONS.find((x) => x.id === rId))
                    .filter((rDef): rDef is NonNullable<typeof rDef> => {
                      if (!rDef) return false;
                      if (!roleListSearch.trim()) return true;
                      const q = roleListSearch.toLowerCase();
                      return (
                        rDef.name.toLowerCase().includes(q) ||
                        rDef.id.toLowerCase().includes(q)
                      );
                    });

                  if (visibleRoles.length === 0) return null;

                  return (
                    <div key={group.groupTitle} className="space-y-1">
                      <div className="text-3xs font-semibold text-ink-3 uppercase tracking-wider px-2 pt-1">
                        {group.groupTitle}
                      </div>
                      <div className="space-y-0.5">
                        {visibleRoles.map((rDef) => {
                          const isSelected = selectedRoleKey === rDef.id;
                          const allowedCount = (
                            roleAllowedTabsMap[rDef.id] ||
                            ROLE_ALLOWED_TABS[rDef.id] ||
                            []
                          ).filter((k) => catalogScreenKeySet.has(k)).length;
                          const staffCount = internalStaff.filter((s) => s.role === rDef.id).length;

                          return (
                            <button
                              key={rDef.id}
                              type="button"
                              onClick={() => setSelectedRoleKey(rDef.id)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg transition flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-accent-soft text-accent font-semibold ring-1 ring-accent/30'
                                  : 'text-ink-2 hover:bg-canvas hover:text-ink'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs truncate">{rDef.name}</div>
                                <div className="text-3xs font-mono text-ink-3 truncate mt-0.5">
                                  {rDef.id}
                                  {rDef.scopeType === 'INTERNAL' && staffCount > 0
                                    ? ` · ${staffCount} nhân sự`
                                    : ''}
                                </div>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-2xs font-semibold tabular-nums shrink-0 ${
                                  isSelected
                                    ? 'bg-surface text-accent border border-accent/20'
                                    : 'bg-sunken text-ink-2'
                                }`}
                              >
                                {allowedCount} màn
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          {/* Cột phải: Chi tiết phân quyền màn hình & nhân sự giữ Role */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <Panel flush>
              {/* Header cấu hình Role đang chọn */}
              <div className="p-4 border-b border-line bg-canvas/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-semibold text-ink">{selectedRoleDef.name}</span>
                  <span className="px-2 py-0.5 rounded bg-sunken text-ink-2 font-mono text-2xs">
                    {selectedRoleDef.id}
                  </span>
                  <Status tone={selectedRoleDef.scopeType === 'INTERNAL' ? 'info' : 'positive'}>
                    {selectedRoleDef.scopeType === 'INTERNAL' ? 'Nội bộ' : 'Đối tác ngoài'}
                  </Status>
                  <span className="text-xs text-ink-3">
                    · Mở <strong className="text-ink">{selectedRoleAllowedTabs.length}</strong>/
                    {ALL_SYSTEM_SCREENS.length} màn hình
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-ink-3">Màn hình mặc định:</span>
                    <Select
                      value={selectedRoleDefaultLanding}
                      onChange={(e) =>
                        handleChangeRoleDefaultLanding(selectedRoleKey, e.target.value as TabKey)
                      }
                      className="w-auto font-medium"
                    >
                      {ALL_SYSTEM_SCREENS.filter((s) =>
                        selectedRoleAllowedTabs.includes(s.key)
                      ).map((scr) => (
                        <option key={scr.key} value={scr.key}>
                          {scr.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {onImpersonatePartner && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        const sampleStaff = roleAssignedStaff[0];
                        onImpersonatePartner({
                          id: sampleStaff?.id || `preview-role-${selectedRoleKey.toLowerCase()}`,
                          name: sampleStaff?.name || `Xem thử: ${selectedRoleDef.name}`,
                          email: sampleStaff?.email || `${selectedRoleKey.toLowerCase()}@upbase.vn`,
                          role: selectedRoleKey,
                          roleTitle: selectedRoleDef.name,
                          avatar: sampleStaff?.avatar || selectedRoleKey.slice(0, 2),
                          departmentScope: selectedRoleDef.departmentScope || 'MARKETING_B2C',
                          teamName: sampleStaff?.department || 'Khối B2C',
                          canLogin: true,
                        });
                      }}
                    >
                      Xem thử Role
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => handleResetSingleRoleScreens(selectedRoleKey)}
                  >
                    Mặc định
                  </Button>
                </div>
              </div>

              {/* Thanh lọc màn hình */}
              <div className="p-3.5 border-b border-line">
                <FilterBar
                  search={{
                    value: roleSearchScreen,
                    onChange: setRoleSearchScreen,
                    placeholder: 'Tìm tên màn hình hoặc mã tab...',
                  }}
                  chips={
                    <Chips<string>
                      items={[
                        { key: 'ALL', label: 'Tất cả nhóm', count: ALL_SYSTEM_SCREENS.length },
                        ...allScreenCategories.map((cat) => ({
                          key: cat,
                          label: cat.replace(/^\d+\.\s*/, ''),
                          count: ALL_SYSTEM_SCREENS.filter((s) => s.groupTitle === cat).length,
                        })),
                      ]}
                      value={selectedScreenCat}
                      onChange={setSelectedScreenCat}
                    />
                  }
                />
              </div>

              {/* Danh sách màn hình theo nhóm */}
              <div className="p-4 space-y-4">
                {allScreenCategories
                  .filter((catName) => selectedScreenCat === 'ALL' || catName === selectedScreenCat)
                  .map((catName) => {
                    const screensInCat = ALL_SYSTEM_SCREENS.filter((s) => {
                      if (s.groupTitle !== catName) return false;
                      if (roleSearchScreen.trim()) {
                        const q = roleSearchScreen.toLowerCase();
                        return (
                          s.label.toLowerCase().includes(q) ||
                          s.key.toLowerCase().includes(q) ||
                          s.description.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    });
                    if (screensInCat.length === 0) return null;

                    const catKeys = screensInCat.map((s) => s.key);
                    const enabledInCatCount = catKeys.filter((k) =>
                      selectedRoleAllowedTabs.includes(k)
                    ).length;
                    const allCatEnabled = enabledInCatCount === catKeys.length;

                    return (
                      <div key={catName} className="rounded-xl border border-line overflow-hidden">
                        <div className="bg-canvas px-3.5 py-2 border-b border-line flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs font-semibold text-ink">{catName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-2xs text-ink-2 font-semibold tabular-nums">
                              {enabledInCatCount}/{catKeys.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleRoleCategoryScreens(
                                selectedRoleKey,
                                catKeys,
                                !allCatEnabled
                              )
                            }
                            className="text-2xs font-semibold text-accent hover:bg-accent-soft px-2 py-0.5 rounded transition"
                          >
                            {allCatEnabled ? 'Bỏ chọn nhóm' : 'Bật cả nhóm'}
                          </button>
                        </div>

                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 bg-surface">
                          {screensInCat.map((scr) => {
                            const isAllowed = selectedRoleAllowedTabs.includes(scr.key);
                            const isDefaultLanding = selectedRoleDefaultLanding === scr.key;

                            return (
                              <label
                                key={scr.key}
                                className={`px-3 py-2 rounded-lg border cursor-pointer transition flex items-center gap-2.5 ${
                                  isAllowed
                                    ? 'bg-accent-soft/60 border-accent/30 text-ink'
                                    : 'bg-surface border-line text-ink-3 hover:bg-canvas hover:text-ink-2'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() => handleToggleRoleScreen(selectedRoleKey, scr.key)}
                                  className="w-4 h-4 rounded text-accent focus:ring-0 shrink-0"
                                />
                                <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                                  <span
                                    className={`text-xs truncate ${
                                      isAllowed ? 'font-semibold text-ink' : 'font-medium'
                                    }`}
                                    title={scr.label}
                                  >
                                    {scr.label}
                                  </span>
                                  {isDefaultLanding && isAllowed && (
                                    <span className="px-1.5 py-0.5 rounded bg-positive-soft text-positive text-3xs font-semibold shrink-0">
                                      Mặc định
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Panel>

            {/* Khu vực nhân sự giữ vai trò này (chỉ hiện với vai trò nội bộ) */}
            {selectedRoleDef.scopeType === 'INTERNAL' && (
              <Panel flush>
                <div className="p-3.5 border-b border-line flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-ink">
                      Nhân sự giữ vai trò &ldquo;{selectedRoleDef.name}&rdquo; ({roleAssignedStaff.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={assignStaffToRoleId}
                      onChange={(e) => setAssignStaffToRoleId(e.target.value)}
                      className="w-auto max-w-xs"
                    >
                      <option value="">+ Gán nhân sự vào vai trò này...</option>
                      {internalStaff
                        .filter((s) => s.role !== selectedRoleKey)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email}) — {ROLE_DISPLAY_NAME[s.role] || s.role}
                          </option>
                        ))}
                    </Select>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!assignStaffToRoleId}
                      onClick={() =>
                        handleAssignStaffToSelectedRole(assignStaffToRoleId, selectedRoleKey)
                      }
                    >
                      Gán vào Role
                    </Button>
                  </div>
                </div>

                {roleAssignedStaff.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3">
                    Chưa có nhân sự nội bộ nào được gán vai trò{' '}
                    <strong className="text-ink-2">{selectedRoleDef.name}</strong>.
                  </div>
                ) : (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {roleAssignedStaff.map((staff) => (
                      <div
                        key={staff.id}
                        className="p-2.5 rounded-lg border border-line bg-canvas/40 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={staff.name} size={28} />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-ink truncate">
                              {staff.name}
                            </div>
                            <div className="text-2xs text-ink-3 truncate">
                              {staff.department} · {staff.position}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditStaff(staff)}
                        >
                          Đổi Role
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MA TRẬN CHỨC NĂNG (INTERACTIVE RBAC MATRIX)                        */}
      {/* ========================================================================= */}
      {activeMainTab === 'matrix' && (
        <Panel flush>
          <div className="p-4 border-b border-line space-y-3">
            <FilterBar
              search={{
                value: searchMatrix,
                onChange: setSearchMatrix,
                placeholder: 'Tìm tính năng, nghiệp vụ...',
              }}
              filters={
                <>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-auto"
                  >
                    <option value="ALL">Tất cả 5 Phân hệ ({matrixItems.length})</option>
                    <option value="PLANNING">1. Lập Kế Hoạch & Phân Bổ Tải</option>
                    <option value="BOOKING_CONTENT">2. Vận Hành Booking KOC & Kịch Bản</option>
                    <option value="CONTRACTS_FINANCE">3. Hợp Đồng, Pháp Lý & Thanh Toán</option>
                    <option value="PERFORMANCE_ADS">4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads</option>
                    <option value="SYSTEM_MASTER">5. Quản Trị Hệ Thống & Master Data</option>
                  </Select>

                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RefreshCw}
                        onClick={() => setIsConfirmingResetMatrix(true)}
                      >
                        Khôi phục mặc định
                      </Button>
                    )}
                  </div>
                </>
              }
              chips={
                <Chips<MatrixRoleGroupFilter>
                  items={matrixRoleGroupChips}
                  value={matrixRoleGroup}
                  onChange={setMatrixRoleGroup}
                />
              }
            />
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sunken/60 border-b border-line text-ink-2 text-2xs font-semibold">
                  <th className="py-2 px-3 min-w-[240px] max-w-[280px] sticky left-0 z-20 bg-sunken border-r border-line text-ink font-semibold">
                    Tính năng &amp; Nghiệp vụ
                  </th>
                  {matrixRolesToRender.map((role) => (
                    <th
                      key={role.id}
                      className="py-2 px-1 text-center min-w-[90px] whitespace-nowrap"
                    >
                      <span className="font-semibold text-ink text-2xs">
                        {ROLE_SHORT_HEADER[role.id] || role.name.split(' (')[0]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredMatrix.map((item, idx) => {
                  const isNewCategory =
                    idx === 0 || filteredMatrix[idx - 1].category !== item.category;

                  return (
                    <React.Fragment key={item.id}>
                      {isNewCategory && (
                        <tr className="bg-sunken/60 border-y border-line">
                          <td
                            colSpan={matrixRolesToRender.length + 1}
                            className="py-1 px-3 text-xs font-semibold text-ink"
                          >
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{item.categoryTitle}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="group hover:bg-canvas transition-colors">
                        <td className="py-1 px-3 align-middle sticky left-0 z-10 bg-surface group-hover:bg-canvas border-r border-line max-w-[280px]">
                          <div
                            className="font-medium text-xs text-ink truncate flex items-center justify-between gap-1.5"
                            title={`${item.featureName}${item.description ? `\n• ${item.description}` : ''}${item.securityNote ? `\nLưu ý bảo mật: ${item.securityNote}` : ''}`}
                          >
                            <span className="truncate">{item.featureName.replace(/\s*\([^)]*\)$/, '')}</span>
                            {item.securityNote && (
                              <span title={item.securityNote} className="inline-flex shrink-0">
                                <Lock className="w-3 h-3 text-warning" />
                              </span>
                            )}
                          </div>
                        </td>

                        {matrixRolesToRender.map((role) => {
                          const isSpecMember = [
                            'BOOKING_MEMBER',
                            'CONTENT_MEMBER',
                            'BRAND_MEMBER',
                          ].includes(role.id);
                          const level: PermissionAccessLevel =
                            item.permissions[role.id] ||
                            (isSpecMember ? item.permissions.MEMBER : undefined) ||
                            'DENIED';
                          const badge = PERMISSION_BADGE_CONFIG[level];

                          const toneClasses =
                            level === 'ALL'
                              ? 'bg-positive-soft text-positive border-positive/30 font-semibold'
                              : level === 'APPROVE'
                              ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                              : level === 'SCOPED'
                              ? 'bg-accent-soft/60 text-accent border-accent/20 font-semibold'
                              : level === 'VIEW'
                              ? 'bg-warning-soft text-warning border-warning/30 font-semibold'
                              : 'bg-sunken text-ink-3 border-line font-medium';

                          return (
                            <td key={role.id} className="py-1 px-1 text-center align-middle">
                              {isAdmin ? (
                                <select
                                  value={level}
                                  onChange={(e) =>
                                    handleUpdatePermission(
                                      item.id,
                                      role.id,
                                      e.target.value as PermissionAccessLevel
                                    )
                                  }
                                  title={`${ROLE_DISPLAY_NAME[role.id]}: ${badge.description}`}
                                  aria-label={`${item.featureName} - ${role.name}`}
                                  className={`w-full h-6 px-1 rounded border text-3xs text-center font-semibold cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-accent ${toneClasses}`}
                                >
                                  <option value="ALL">ALL</option>
                                  <option value="APPROVE">APPROVE</option>
                                  <option value="SCOPED">SCOPED</option>
                                  <option value="VIEW">VIEW</option>
                                  <option value="DENIED">DENIED</option>
                                </select>
                              ) : (
                                <span
                                  title={`${ROLE_DISPLAY_NAME[role.id]}: ${badge.description}`}
                                  className={`inline-block w-full py-0.5 px-1 rounded border text-3xs text-center font-semibold ${toneClasses}`}
                                >
                                  {level}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NHÂN SỰ NỘI BỘ (VAI TRÒ & QUYỀN PHÊ DUYỆT ĐẶC THÙ)                 */}
      {/* ========================================================================= */}
      {activeMainTab === 'internal' && (
        <Panel flush>
          <div className="p-4 border-b border-line">
            <FilterBar
              search={{
                value: searchStaff,
                onChange: setSearchStaff,
                placeholder: 'Tìm nhân sự, email, phòng ban, chức danh...',
              }}
              filters={
                <>
                  <Select
                    value={staffRoleFilter}
                    onChange={(e) => setStaffRoleFilter(e.target.value)}
                    className="w-auto"
                  >
                    <option value="ALL">Mọi vai trò cụ thể</option>
                    <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
                    <option value="MANAGER">Giám Đốc Marketing B2C</option>
                    <option value="LEADER">Trưởng Nhóm Booking B2C</option>
                    <option value="BOOKING_MEMBER">Chuyên Viên Booking B2C</option>
                    <option value="CONTENT_MEMBER">Chuyên Viên Content</option>
                    <option value="BRAND_MEMBER">Chuyên Viên Brand PIC</option>
                    <option value="LEGAL">Pháp Chế</option>
                    <option value="FINANCE">Kế Toán</option>
                    <option value="SIGN_ADMIN">Điều Phối Ký Điện Tử</option>
                  </Select>

                  {(searchStaff.trim() !== '' ||
                    staffGroupFilter !== 'ALL' ||
                    staffRoleFilter !== 'ALL') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchStaff('');
                        setStaffGroupFilter('ALL');
                        setStaffRoleFilter('ALL');
                      }}
                    >
                      Xóa lọc
                    </Button>
                  )}
                </>
              }
              chips={
                <Chips<InternalRoleGroupFilter>
                  items={internalStaffGroupChips}
                  value={staffGroupFilter}
                  onChange={setStaffGroupFilter}
                />
              }
              resultCount={
                searchStaff.trim() !== '' ||
                staffGroupFilter !== 'ALL' ||
                staffRoleFilter !== 'ALL'
                  ? filteredStaff.length
                  : undefined
              }
            />
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sunken/40 border-b border-line text-ink-3 text-2xs font-semibold">
                  <th className="py-2.5 px-4 min-w-[220px]">Nhân sự &amp; Email Lark</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Phòng ban &amp; Vị trí</th>
                  <th className="py-2.5 px-3 min-w-[210px]">Vai trò hệ thống (Đổi nhanh)</th>
                  <th className="py-2.5 px-3 min-w-[300px]">
                    Quyền phê duyệt đặc thù (Bấm để Bật / Tắt)
                  </th>
                  <th className="py-2.5 px-4 text-right w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4">
                      <EmptyState
                        title="Không tìm thấy nhân sự nội bộ"
                        description="Không có nhân sự nào khớp với điều kiện lọc hiện tại."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const permButtons: {
                      key:
                        | 'canApproveBudget'
                        | 'canApproveP3'
                        | 'canApprovePayment'
                        | 'canExportRawData'
                        | 'canViewAllBrands'
                        | 'canManageMasterData';
                      label: string;
                    }[] = [
                      { key: 'canApproveBudget', label: 'Duyệt Ngân sách' },
                      { key: 'canApproveP3', label: 'Duyệt P3' },
                      { key: 'canApprovePayment', label: 'Duyệt Chi' },
                      { key: 'canExportRawData', label: 'Xuất Excel' },
                      { key: 'canViewAllBrands', label: 'Toàn bộ Brand' },
                      { key: 'canManageMasterData', label: 'Sửa Master Data' },
                    ];

                    return (
                      <tr key={staff.id} className="hover:bg-canvas transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={staff.name} size={30} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-ink truncate">
                                  {staff.name}
                                </span>
                                {staff.staffCode && (
                                  <span className="px-1.5 py-0.2 rounded bg-sunken text-ink-3 font-mono text-3xs">
                                    {staff.staffCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-2xs text-ink-3 font-mono flex items-center gap-1 mt-0.5 truncate">
                                <Mail className="w-3 h-3 text-ink-3 shrink-0" />
                                <span>{staff.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-ink">{staff.department}</div>
                          <div className="text-2xs text-ink-3 mt-0.5">{staff.position}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <select
                            value={staff.role}
                            disabled={!isAdmin}
                            onChange={(e) =>
                              handleInlineRoleChange(staff.id, e.target.value as UserRole)
                            }
                            aria-label={`Vai trò của ${staff.name}`}
                            className="h-8 px-2.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink focus:outline-none focus:border-accent disabled:opacity-70"
                          >
                            <option value="ADMIN">Quản trị hệ thống (Admin)</option>
                            <option value="MANAGER">Giám đốc Marketing B2C</option>
                            <option value="LEADER">Trưởng nhóm B2C</option>
                            <option value="BOOKING_MEMBER">Chuyên viên Booking B2C</option>
                            <option value="CONTENT_MEMBER">Chuyên viên Content B2C</option>
                            <option value="BRAND_MEMBER">Chuyên viên Brand PIC</option>
                            <option value="LEGAL">Pháp chế</option>
                            <option value="FINANCE">Kế toán</option>
                            <option value="SIGN_ADMIN">Điều phối ký điện tử</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {permButtons.map((pb) => {
                              const active = staff.permissions[pb.key];
                              return (
                                <button
                                  key={pb.key}
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={() => handleInlineToggleStaffPerm(staff.id, pb.key)}
                                  className={`px-2 py-1 rounded-md text-2xs font-medium border transition inline-flex items-center gap-1 ${
                                    active
                                      ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                                      : 'bg-surface text-ink-3 border-line hover:text-ink-2 hover:bg-sunken/50'
                                  }`}
                                >
                                  {active && <Check className="w-3 h-3 shrink-0" />}
                                  <span>{pb.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onImpersonateUser && (
                              <button
                                type="button"
                                onClick={() =>
                                  onImpersonateUser({
                                    id: staff.id,
                                    name: staff.name,
                                    email: staff.email,
                                    role: staff.role,
                                    roleTitle: staff.roleTitle,
                                    avatar: staff.avatar,
                                    staffCode: staff.staffCode,
                                    departmentScope: staff.departmentScope,
                                    departmentName: staff.department,
                                    teamName: staff.team,
                                    canLogin: true,
                                  })
                                }
                                className="p-1.5 rounded-md text-ink-3 hover:text-accent hover:bg-accent-soft transition"
                                title="Xem thử giao diện của nhân sự này"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(staff)}
                              className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition"
                              title="Mở hộp thoại cấu hình chi tiết"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CỔNG TRUY CẬP LARK (1.011 NHÂN SỰ TOÀN CÔNG TY)                     */}
      {/* ========================================================================= */}
      {activeMainTab === 'gatekeeper' && (
        <div className="space-y-4">
          {/* 4 Thẻ Quy tắc mở cổng tự động theo Khối */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {deptRules.map((rule) => {
                const scopeMeta = SCOPE_LABELS[rule.mappedScope];
                return (
                  <div
                    key={rule.id}
                    className="bg-surface rounded-xl border border-line p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}
                        >
                          {scopeMeta.shortLabel}
                        </span>
                        <span className="text-xs font-mono font-semibold text-ink tabular-nums">
                          {rule.staffCount} NV
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-ink leading-snug">
                        {rule.departmentOrTeamName}
                      </div>
                      <div className="text-2xs text-ink-3">
                        Quản lý: <strong className="text-ink-2">{rule.defaultManagerName}</strong>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-line flex items-center justify-between gap-2">
                      <span className="text-2xs text-ink-3 truncate">
                        {rule.autoAllowLogin
                          ? ROLE_DISPLAY_NAME[rule.defaultRole]
                          : 'Chặn đăng nhập'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleDeptRule(rule.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-semibold border transition shrink-0 cursor-pointer ${
                          rule.autoAllowLogin
                            ? 'bg-positive-soft text-positive border-positive/30'
                            : 'bg-critical-soft text-critical border-critical/30'
                        }`}
                      >
                        {rule.autoAllowLogin ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Cho phép</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Đang chặn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Danh bạ 1.011 nhân sự */}
          <Panel flush>
            <div className="p-4 border-b border-line">
              <FilterBar
                search={{
                  value: dirSearch,
                  onChange: (v) => {
                    setDirSearch(v);
                    setDirPage(1);
                  },
                  placeholder: 'Tìm tên, mã NV (HN222), email, phòng ban...',
                }}
                filters={
                  <>
                    <Select
                      value={dirLoginFilter}
                      onChange={(e) => {
                        setDirLoginFilter(e.target.value as 'ALL' | 'ALLOWED' | 'BLOCKED');
                        setDirPage(1);
                      }}
                      className="w-auto"
                    >
                      <option value="ALL">Mọi trạng thái Login</option>
                      <option value="ALLOWED">Được phép Login ({directoryStats.totalAllowed})</option>
                      <option value="BLOCKED">Bị chặn Login ({directoryStats.totalBlocked})</option>
                    </Select>

                    <Select
                      value={dirDeptFilter}
                      onChange={(e) => {
                        setDirDeptFilter(e.target.value);
                        setDirPage(1);
                      }}
                      className="w-auto max-w-[200px]"
                    >
                      <option value="ALL">Mọi Phòng ban ({directoryDepartments.length})</option>
                      {directoryDepartments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>

                    {isAdmin && Object.keys(staffOverrides).length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setStaffOverrides({});
                          onNotify?.(
                            'Đã xóa các thiết lập ngoại lệ cá nhân, quay về quy tắc phòng ban chuẩn.',
                            'info'
                          );
                        }}
                      >
                        Đặt lại {Object.keys(staffOverrides).length} ngoại lệ
                      </Button>
                    )}
                  </>
                }
                chips={
                  isAdmin ? (
                    <Chips<GatekeeperScopeChip>
                      items={gatekeeperChips}
                      value={dirScopeFilter}
                      onChange={(k) => {
                        setDirScopeFilter(k);
                        setDirPage(1);
                      }}
                    />
                  ) : undefined
                }
                resultCount={filteredDirectory.length}
              />
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-sunken/40 border-b border-line text-2xs font-semibold text-ink-3">
                    <th className="py-2.5 px-3 w-[90px]">Mã NV</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Nhân viên &amp; Email</th>
                    <th className="py-2.5 px-3">Phòng ban / Team</th>
                    <th className="py-2.5 px-3">Khối hệ thống</th>
                    <th className="py-2.5 px-3">Vai trò &amp; Quản lý</th>
                    <th className="py-2.5 px-3 text-center">Cổng đăng nhập</th>
                    <th className="py-2.5 px-3 text-right w-[80px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagedDirectory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4">
                        <EmptyState
                          title="Không tìm thấy nhân sự"
                          description="Không có nhân sự nào khớp với điều kiện lọc hiện tại."
                        />
                      </td>
                    </tr>
                  ) : (
                    pagedDirectory.map((staff) => {
                      const scopeMeta = SCOPE_LABELS[staff.classifiedScope];
                      return (
                        <tr key={staff.id} className="hover:bg-canvas transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-ink text-xs">
                            {staff.staffCode || staff.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-ink">{staff.name}</div>
                            <div className="text-2xs text-ink-3 font-mono">{staff.email}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-ink">
                              {staff.department || staff.team || 'Chưa phân phòng'}
                            </div>
                            <div className="text-2xs text-ink-3">
                              {staff.position || staff.roleTitle} · {staff.location || 'HN'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}
                            >
                              {scopeMeta.shortLabel}
                            </span>
                            {staff.accessSource === 'ADMIN_EXPLICIT' && (
                              <span className="block text-3xs text-accent font-semibold mt-0.5">
                                Cấp đích danh
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {staff.canLogin ? (
                              <>
                                <span className="font-semibold text-ink block">
                                  {ROLE_DISPLAY_NAME[staff.mappedRole]}
                                </span>
                                <span className="text-2xs text-ink-3">
                                  QL: <strong className="text-ink-2">{staff.managerName}</strong>
                                </span>
                              </>
                            ) : (
                              <span className="text-2xs text-ink-3">Ngoài phạm vi B2C</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleQuickToggleStaffLogin(staff)}
                              disabled={!isAdmin}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold border transition ${
                                isAdmin ? 'cursor-pointer' : 'cursor-default'
                              } ${
                                staff.canLogin
                                  ? 'bg-positive-soft text-positive border-positive/20'
                                  : 'bg-sunken text-ink-3 border-line'
                              }`}
                            >
                              {staff.canLogin ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-positive" />
                                  <span>Được vào</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-ink-3" />
                                  <span>Đang chặn</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditDirectoryStaff(staff)}
                                className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition"
                                title="Phân khối & bổ nhiệm vai trò"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={dirPage}
              pageSize={dirPageSize}
              total={filteredDirectory.length}
              onPageChange={setDirPage}
              onPageSizeChange={(sz) => {
                setDirPageSize(sz);
                setDirPage(1);
              }}
              pageSizes={[20, 50, 100]}
            />
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ĐỐI TÁC NGOÀI (GMAIL PORTAL)                                       */}
      {/* ========================================================================= */}
      {activeMainTab === 'third-party' && (
        <ThirdPartyAccessSetupView
          currentUser={currentUser}
          brands={brands}
          kocs={kocs}
          onNotify={onNotify}
          onImpersonatePartner={onImpersonatePartner}
        />
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      <Modal
        open={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title={
          editingStaff
            ? `Phân vai trò & quyền phê duyệt — ${editingStaff.name}`
            : 'Phân vai trò & quyền phê duyệt'
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingStaff(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" form="edit-internal-staff-rbac-form">
              Lưu thay đổi
            </Button>
          </>
        }
      >
        {editingStaff && (
          <form id="edit-internal-staff-rbac-form" onSubmit={handleSaveStaff} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-ink-2 block">Vai trò hệ thống *</label>
              <select
                value={staffFormRole}
                onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface font-semibold text-ink focus:outline-none focus:border-accent"
              >
                <option value="ADMIN">Quản Trị Hệ Thống (ADMIN) - Toàn quyền</option>
                <option value="MANAGER">Giám Đốc Marketing B2C (MANAGER)</option>
                <option value="LEADER">Trưởng Nhóm Booking B2C (LEADER)</option>
                <option value="BOOKING_MEMBER">Chuyên Viên Booking KOC (BOOKING_MEMBER)</option>
                <option value="CONTENT_MEMBER">Chuyên Viên Sáng Tạo Kịch Bản (CONTENT_MEMBER)</option>
                <option value="BRAND_MEMBER">Chuyên Viên Brand PIC (BRAND_MEMBER)</option>
                <option value="LEGAL">Pháp Chế (LEGAL)</option>
                <option value="FINANCE">Kế Toán (FINANCE)</option>
                <option value="SIGN_ADMIN">Điều Phối Ký Điện Tử (SIGN_ADMIN)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-ink-2 block">Quyền phê duyệt đặc thù:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-canvas rounded-xl border border-line">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canApproveBudget}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canApproveBudget: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Duyệt Ngân sách tháng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canApproveP3}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canApproveP3: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Đánh giá &amp; Duyệt P3</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canApprovePayment}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canApprovePayment: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Duyệt chi thanh toán</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canExportRawData}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canExportRawData: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Xuất báo cáo Excel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canViewAllBrands}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canViewAllBrands: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Xem toàn bộ 42 Brand</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={staffFormPerms.canManageMasterData}
                    onChange={(e) =>
                      setStaffFormPerms((p) => ({ ...p, canManageMasterData: e.target.checked }))
                    }
                    className="rounded text-accent"
                  />
                  <span>Quản trị Master Data</span>
                </label>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editingDirStaffObj}
        onClose={() => setEditingDirectoryStaffId(null)}
        title={
          editingDirStaffObj
            ? `Cấu hình cổng đăng nhập — ${editingDirStaffObj.name}`
            : 'Cấu hình cổng đăng nhập'
        }
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingDirectoryStaffId(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" form="edit-dir-staff-form">
              Lưu phân quyền
            </Button>
          </>
        }
      >
        {editingDirStaffObj && (
          <form id="edit-dir-staff-form" onSubmit={handleSaveDirectoryStaff} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-canvas border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Cho phép đăng nhập hệ thống B2C</span>
              <input
                type="checkbox"
                checked={dirEditCanLogin}
                onChange={(e) => setDirEditCanLogin(e.target.checked)}
                className="w-4 h-4 rounded text-accent"
              />
            </div>

            {dirEditCanLogin && (
              <>
                <div className="space-y-1.5">
                  <label className="font-semibold text-ink-2 block">
                    1. Khối chức năng trong hệ thống *
                  </label>
                  <select
                    value={dirEditScope}
                    onChange={(e) => {
                      const nextScope = e.target.value as SystemDepartmentScope;
                      setDirEditScope(nextScope);
                      {
                        setDirEditRole('BOOKING_MEMBER');
                        setDirEditManager('Đặng Thị Yến Nhi');
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface font-semibold text-ink"
                  >
                    <option value="MARKETING_B2C">Khối Marketing B2C (Booking / Content / Brand)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-ink-2 block">
                    2. Vai trò (Role) trong hệ thống *
                  </label>
                  <select
                    value={dirEditRole}
                    onChange={(e) => setDirEditRole(e.target.value as UserRole)}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface font-semibold text-ink"
                  >
                    <optgroup label="Cấp Quản Trị & Trưởng Phòng">
                      <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
                      <option value="MANAGER">Giám Đốc Marketing B2C (MANAGER)</option>
                      <option value="LEADER">Trưởng Nhóm Booking B2C (LEADER)</option>
                    </optgroup>
                    <optgroup label="Cấp Chuyên Viên Thực Thi">
                      <option value="BOOKING_MEMBER">Chuyên Viên Booking B2C (BOOKING_MEMBER)</option>
                      <option value="CONTENT_MEMBER">Chuyên Viên Content B2C (CONTENT_MEMBER)</option>
                      <option value="BRAND_MEMBER">Chuyên Viên Brand PIC (BRAND_MEMBER)</option>
                    </optgroup>
                    <optgroup label="Khối Pháp Chế · Kế Toán · Ký Số">
                      <option value="LEGAL">Pháp Chế (LEGAL)</option>
                      <option value="FINANCE">Kế Toán (FINANCE)</option>
                      <option value="SIGN_ADMIN">Điều Phối Ký Điện Tử (SIGN_ADMIN)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-ink-2 block">
                    3. Trưởng phòng / Quản lý trực tiếp
                  </label>
                  <input
                    type="text"
                    value={dirEditManager}
                    onChange={(e) => setDirEditManager(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink"
                    placeholder="Tên Trưởng phòng quản lý..."
                  />
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={isConfirmingResetMatrix}
        onOpenChange={setIsConfirmingResetMatrix}
        title="Xác nhận khôi phục phân quyền Role & Ma trận"
        description="Bạn có chắc chắn muốn khôi phục toàn bộ Phân quyền màn hình của 16 Role và Ma trận chức năng về cấu hình mặc định chuẩn UpBase B2C?"
        confirmLabel="Khôi phục mặc định"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          setRoleAllowedTabsMap({ ...ROLE_ALLOWED_TABS });
          setRoleDefaultLandingMap({ ...ROLE_DEFAULT_LANDING });
          setMatrixItems(INITIAL_PERMISSION_MATRIX);
          onNotify?.('Đã khôi phục Phân quyền Role & Ma trận về mặc định.', 'info');
          setIsConfirmingResetMatrix(false);
        }}
      />
    </div>
  );
};
