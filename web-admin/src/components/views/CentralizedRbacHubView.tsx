'use client';

import React, { useState, useMemo, useRef, useDeferredValue, useEffect } from 'react';
import { ConfirmDialog, Tabs, Presence } from '../ui';
import {
  ShieldCheck,
  KeyRound,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Mail,
  UserCheck,
  X,
  Layers,
  RefreshCw,
  Users,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight
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
  RbacAuditLogItem
} from '../../lib/types';
import {
  RBAC_ROLE_DEFINITIONS,
  ALL_ROLE_DEFINITIONS,
  ALL_SYSTEM_SCREENS,
  ROLE_ALLOWED_TABS,
  ROLE_DEFAULT_LANDING,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_INTERNAL_STAFF_RBAC,
  INITIAL_RBAC_AUDIT_LOGS,
  PERMISSION_BADGE_CONFIG,
  classifyMasterStaffMember,
  getSavedStaffAccessOverrides,
  saveStaffAccessOverrides,
  getSavedDeptAccessRules,
  saveDeptAccessRules,
  getSavedRoleAllowedTabs,
  saveRoleAllowedTabs,
  getSavedRoleDefaultLanding,
  saveRoleDefaultLanding,
  resetAllRoleScreenPermissions,
  getSavedInternalStaffList,
  saveInternalStaffList,
  StaffAccessOverrideItem
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

type MainTab = 'roles' | 'gatekeeper' | 'internal' | 'matrix' | 'third-party' | 'audit';

const SCOPE_LABELS: Record<SystemDepartmentScope, { label: string; badgeClass: string; managerLabel: string }> = {
  MARKETING_B2C: {
    label: 'Khối Marketing B2C',
    badgeClass: 'bg-accent-soft text-accent border-accent/20',
    managerLabel: 'Đặng Thị Yến Nhi (Trưởng phòng B2C)'
  },
  GROWTH: {
    label: 'Khối Growth Ecom',
    badgeClass: 'bg-positive-soft text-positive border-positive/20',
    managerLabel: 'Trần Thị Đỗ Quyên (Trưởng phòng Growth)'
  },
  MEDIA: {
    label: 'Khối Media & Ads',
    badgeClass: 'bg-warning-soft text-warning border-warning/20',
    managerLabel: 'Nguyễn Đức Quảng (Trưởng phòng Media)'
  },
  OTHER_BLOCKED: {
    label: 'Phòng ban khác (Ngoài hệ thống)',
    badgeClass: 'bg-sunken text-ink-2 border-line',
    managerLabel: 'Không thuộc phạm vi B2C'
  }
};

const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  ADMIN: 'Quản trị hệ thống (Admin)',
  MANAGER: 'Giám đốc Marketing B2C',
  GROWTH_MANAGER: 'Trưởng phòng Growth',
  MEDIA_MANAGER: 'Trưởng phòng Media',
  LEADER: 'Trưởng nhóm B2C',
  BOOKING_MEMBER: 'Chuyên viên Booking B2C',
  CONTENT_MEMBER: 'Chuyên viên Content B2C',
  BRAND_MEMBER: 'Chuyên viên Brand PIC',
  GROWTH_MEMBER: 'Chuyên viên Growth',
  MEDIA_MEMBER: 'Chuyên viên Media',
  MEMBER: 'Chuyên viên vận hành',
  BRAND_PARTNER: 'Đối tác Brand',
  KOC_PARTNER: 'KOC / KOL',
  CTV_PARTNER: 'Cộng tác viên',
  LEGAL: 'Pháp chế',
  FINANCE: 'Kế toán',
  SIGN_ADMIN: 'Điều phối ký điện tử'
};

export const CentralizedRbacHubView: React.FC<CentralizedRbacHubViewProps> = ({
  currentUser,
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onImpersonateUser,
  onImpersonatePartner
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('roles');
  const logCounterRef = useRef(100);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isGrowthManager = currentUser?.role === 'GROWTH_MANAGER';
  const isMediaManager = currentUser?.role === 'MEDIA_MANAGER';
  const isB2cManager = currentUser?.role === 'MANAGER';

  // --- STATE TAB ROLES: QUẢN TRỊ LỚP ROLE & PHÂN QUYỀN MÀN HÌNH (16 VAI TRÒ) ---
  const [roleAllowedTabsMap, setRoleAllowedTabsMap] = useState<Record<UserRole, TabKey[]>>(() => getSavedRoleAllowedTabs());
  const [roleDefaultLandingMap, setRoleDefaultLandingMap] = useState<Record<UserRole, TabKey>>(() => getSavedRoleDefaultLanding());
  const [selectedRoleKey, setSelectedRoleKey] = useState<UserRole>('LEGAL');
  const [roleSearchScreen, setRoleSearchScreen] = useState<string>('');
  const [assignStaffToRoleId, setAssignStaffToRoleId] = useState<string>('');

  // --- STATE TAB 0: CỔNG KIỂM SOÁT TRUY CẬP 1.011 NHÂN SỰ & PHÒNG BAN ---
  const [deptRules, setDeptRules] = useState<DepartmentAccessRule[]>(() => getSavedDeptAccessRules());
  const [staffOverrides, setStaffOverrides] = useState<Record<string, StaffAccessOverrideItem>>(() => getSavedStaffAccessOverrides());
  const [dirSearch, setDirSearch] = useState('');
  const deferredDirSearch = useDeferredValue(dirSearch);
  const [dirScopeFilter, setDirScopeFilter] = useState<string>(() => {
    if (isGrowthManager) return 'GROWTH';
    if (isMediaManager) return 'MEDIA';
    if (isB2cManager) return 'MARKETING_B2C';
    return 'ALLOWED_3_SCOPES';
  });
  const [dirLoginFilter, setDirLoginFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED' | 'OVERRIDDEN'>('ALL');
  const [dirDeptFilter, setDirDeptFilter] = useState<string>('ALL');
  const [dirPage, setDirPage] = useState(1);
  const DIR_PAGE_SIZE = 20;

  // Modal cấu hình quyền truy cập & phân khối cho 1 nhân viên trong danh bạ 1.011 người
  const [editingDirectoryStaffId, setEditingDirectoryStaffId] = useState<string | null>(null);
  const [dirEditCanLogin, setDirEditCanLogin] = useState<boolean>(true);
  const [dirEditScope, setDirEditScope] = useState<SystemDepartmentScope>('MARKETING_B2C');
  const [dirEditRole, setDirEditRole] = useState<UserRole>('BOOKING_MEMBER');
  const [dirEditManager, setDirEditManager] = useState<string>('Đặng Thị Yến Nhi');

  // Tự động đồng bộ bộ lọc theo vai trò Trưởng phòng khi đổi tài khoản
  const [prevUserRole, setPrevUserRole] = useState<UserRole | undefined>(currentUser?.role);
  if (currentUser?.role !== prevUserRole) {
    setPrevUserRole(currentUser?.role);
    if (currentUser?.role === 'GROWTH_MANAGER') {
      setDirScopeFilter('GROWTH');
      setDirPage(1);
    } else if (currentUser?.role === 'MEDIA_MANAGER') {
      setDirScopeFilter('MEDIA');
      setDirPage(1);
    } else if (currentUser?.role === 'MANAGER') {
      setDirScopeFilter('MARKETING_B2C');
      setDirPage(1);
    } else if (currentUser?.role === 'ADMIN') {
      setDirScopeFilter('ALL');
      setDirPage(1);
    }
  }

  // Phân loại toàn bộ 1.011 nhân sự từ UPBASE_STAFF_MASTER
  const classifiedDirectory = useMemo(() => {
    return UPBASE_STAFF_MASTER.map(member => {
      const result = classifyMasterStaffMember(member, deptRules, staffOverrides);
      return {
        ...member,
        classifiedScope: result.departmentScope,
        canLogin: result.canLogin,
        mappedRole: result.role,
        mappedRoleTitle: result.roleTitle,
        managerName: result.managerName,
        accessSource: result.accessSource,
        accessReason: result.reason
      };
    });
  }, [deptRules, staffOverrides]);

  // Thống kê tổng quan 4 nhóm
  const directoryStats = useMemo(() => {
    let mktTotal = 0, mktAllowed = 0;
    let growthTotal = 0, growthAllowed = 0;
    let mediaTotal = 0, mediaAllowed = 0;
    let otherTotal = 0, otherAllowed = 0;

    classifiedDirectory.forEach(s => {
      if (s.classifiedScope === 'MARKETING_B2C') {
        mktTotal++;
        if (s.canLogin) mktAllowed++;
      } else if (s.classifiedScope === 'GROWTH') {
        growthTotal++;
        if (s.canLogin) growthAllowed++;
      } else if (s.classifiedScope === 'MEDIA') {
        mediaTotal++;
        if (s.canLogin) mediaAllowed++;
      } else {
        otherTotal++;
        if (s.canLogin) otherAllowed++;
      }
    });

    return {
      totalStaff: classifiedDirectory.length,
      totalAllowed: mktAllowed + growthAllowed + mediaAllowed + otherAllowed,
      totalBlocked: classifiedDirectory.length - (mktAllowed + growthAllowed + mediaAllowed + otherAllowed),
      mktTotal, mktAllowed,
      growthTotal, growthAllowed,
      mediaTotal, mediaAllowed,
      otherTotal, otherAllowed
    };
  }, [classifiedDirectory]);

  // Danh sách phòng ban/team duy nhất để lọc
  const directoryDepartments = useMemo(() => {
    const set = new Set<string>();
    classifiedDirectory.forEach(s => {
      const label = (s.department || s.team || '').trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort();
  }, [classifiedDirectory]);

  // Lọc danh sách nhân viên trong Danh bạ 1.011 người
  const filteredDirectory = useMemo(() => {
    return classifiedDirectory.filter(s => {
      // Nếu là Trưởng phòng Growth / Media / B2C thì khóa phạm vi trong khối của mình (trừ Admin xem được hết)
      if (isGrowthManager && s.classifiedScope !== 'GROWTH') return false;
      if (isMediaManager && s.classifiedScope !== 'MEDIA') return false;

      if (dirScopeFilter === 'ALLOWED_3_SCOPES') {
        if (!['MARKETING_B2C', 'GROWTH', 'MEDIA'].includes(s.classifiedScope) && !s.canLogin) return false;
      } else if (dirScopeFilter !== 'ALL') {
        if (s.classifiedScope !== dirScopeFilter) return false;
      }

      if (dirLoginFilter === 'ALLOWED' && !s.canLogin) return false;
      if (dirLoginFilter === 'BLOCKED' && s.canLogin) return false;
      if (dirLoginFilter === 'OVERRIDDEN' && !['ADMIN_EXPLICIT', 'REVOKED'].includes(s.accessSource)) return false;

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
  }, [classifiedDirectory, isGrowthManager, isMediaManager, dirScopeFilter, dirLoginFilter, dirDeptFilter, deferredDirSearch]);

  const totalDirPages = Math.ceil(filteredDirectory.length / DIR_PAGE_SIZE) || 1;
  const pagedDirectory = useMemo(() => {
    const start = (dirPage - 1) * DIR_PAGE_SIZE;
    return filteredDirectory.slice(start, start + DIR_PAGE_SIZE);
  }, [filteredDirectory, dirPage]);

  // Bật/Tắt Quy tắc cấp quyền theo Phòng ban (Chỉ Admin)
  const handleToggleDeptRule = (ruleId: string) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị viên (Admin) mới có quyền thay đổi quy tắc mở cổng phòng ban.', 'warning');
      return;
    }
    const targetRule = deptRules.find(r => r.id === ruleId);
    if (!targetRule) return;
    const nextAllow = !targetRule.autoAllowLogin;
    const updated = deptRules.map(r => r.id === ruleId ? { ...r, autoAllowLogin: nextAllow } : r);
    setDeptRules(updated);


    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'DEPT_RULE_UPDATE',
      targetUserOrEntity: targetRule.departmentOrTeamName,
      description: `${nextAllow ? 'Mở cổng cho phép đăng nhập' : 'Khóa cổng chặn đăng nhập'} đối với toàn bộ nhân sự thuộc cụm phòng ban "${targetRule.departmentOrTeamName}".`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: nextAllow ? 'SUCCESS' : 'WARNING'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.
    onNotify?.(
      `${nextAllow ? 'Bản nháp mở quyền đăng nhập' : 'Bản nháp khóa quyền đăng nhập'} cho cụm phòng ban: ${targetRule.departmentOrTeamName}`,
      nextAllow ? 'success' : 'warning'
    );
  };

  // Bật/tắt nhanh quyền Login của 1 nhân viên trong danh bạ 1.011 người
  const handleQuickToggleStaffLogin = (staff: typeof classifiedDirectory[0]) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Role Admin mới được phép cấp hoặc thu hồi quyền đăng nhập hệ thống của nhân viên.', 'warning');
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
      managerName:
        nextScope === 'GROWTH' ? 'Trần Thị Đỗ Quyên' :
        nextScope === 'MEDIA' ? 'Nguyễn Đức Quảng' : 'Đặng Thị Yến Nhi',
      updatedBy: currentUser?.name || 'Admin',
      updatedAt: new Date().toISOString()
    };

    const nextMap = { ...staffOverrides, [staff.id]: newOverride };
    setStaffOverrides(nextMap);


    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: nextCanLogin ? 'ACCESS_GRANT' : 'ACCESS_REVOKE',
      targetUserOrEntity: `${staff.name} (${staff.staffCode || staff.id} - ${staff.department || staff.team})`,
      description: nextCanLogin
        ? `Admin cấp quyền đăng nhập hệ thống cho ${staff.name} vào ${SCOPE_LABELS[nextScope].label} (${ROLE_DISPLAY_NAME[nextRole]}).`
        : `Admin thu hồi quyền đăng nhập hệ thống của ${staff.name}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: nextCanLogin ? 'SUCCESS' : 'WARNING'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.
    onNotify?.(
      nextCanLogin
        ? `Đã cấp quyền đăng nhập cho ${staff.name} (${SCOPE_LABELS[nextScope].label})`
        : `Đã chặn quyền đăng nhập của ${staff.name}`,
      nextCanLogin ? 'success' : 'info'
    );
  };

  // Mở modal chỉnh sửa phân khối / vai trò / người quản lý cho nhân sự trong danh bạ
  const handleOpenEditDirectoryStaff = (staff: typeof classifiedDirectory[0]) => {
    setEditingDirectoryStaffId(staff.id);
    setDirEditCanLogin(staff.canLogin);
    setDirEditScope(staff.classifiedScope === 'OTHER_BLOCKED' ? 'MARKETING_B2C' : staff.classifiedScope);
    setDirEditRole(staff.mappedRole);
    setDirEditManager(staff.managerName === 'Ngoài phạm vi B2C' ? 'Đặng Thị Yến Nhi' : staff.managerName);
  };

  const handleSaveDirectoryStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDirectoryStaffId) return;
    const target = classifiedDirectory.find(s => s.id === editingDirectoryStaffId);
    if (!target) return;

    const newOverride: StaffAccessOverrideItem = {
      staffId: target.id,
      canLogin: dirEditCanLogin,
      departmentScope: dirEditCanLogin ? dirEditScope : target.classifiedScope,
      role: dirEditRole,
      managerName: dirEditManager,
      updatedBy: currentUser?.name || 'Admin',
      updatedAt: new Date().toISOString()
    };

    const nextMap = { ...staffOverrides, [target.id]: newOverride };
    setStaffOverrides(nextMap);


    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${target.name} (${target.staffCode || target.id})`,
      description: `Cấu hình nhân sự: Trạng thái Login=${dirEditCanLogin ? 'CHO PHÉP' : 'CHẶN'}, Khối=${SCOPE_LABELS[dirEditScope].label}, Vai trò=${ROLE_DISPLAY_NAME[dirEditRole]}, Quản lý=${dirEditManager}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: 'SUCCESS'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.
    setEditingDirectoryStaffId(null);
    onNotify?.(`Đã sửa bản nháp quyền của ${target.name} (${ROLE_DISPLAY_NAME[dirEditRole]})`, 'info');
  };

  // --- STATE TAB 1: MA TRẬN PHÂN QUYỀN ---
  const [matrixItems, setMatrixItems] = useState<PermissionMatrixItem[]>(INITIAL_PERMISSION_MATRIX);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchMatrix, setSearchMatrix] = useState<string>('');
  const deferredSearchMatrix = useDeferredValue(searchMatrix);
  const [roleColumnFilter, setRoleColumnFilter] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; role: string; currentLevel: PermissionAccessLevel } | null>(null);
  const [isConfirmingResetMatrix, setIsConfirmingResetMatrix] = useState(false);

  // --- STATE TAB 2: NHÂN SỰ NỘI BỘ ---
  const [internalStaff, setInternalStaff] = useState<InternalStaffRbacMember[]>(() => getSavedInternalStaffList());
  const [searchStaff, setSearchStaff] = useState<string>('');
  const deferredSearchStaff = useDeferredValue(searchStaff);
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('ALL');
  const [editingStaff, setEditingStaff] = useState<InternalStaffRbacMember | null>(null);
  const [staffFormRole, setStaffFormRole] = useState<UserRole>('MEMBER');
  const [staffFormRoleTitle, setStaffFormRoleTitle] = useState<string>('');
  const [staffFormPicBrands, setStaffFormPicBrands] = useState<string[]>([]);
  const [staffFormPerms, setStaffFormPerms] = useState({
    canApproveBudget: false,
    canApproveP3: false,
    canApprovePayment: false,
    canViewAllBrands: false,
    canExportRawData: false,
    canManageMasterData: false
  });

  // --- STATE TAB 4: AUDIT LOGS ---
  const [auditLogs, setAuditLogs] = useState<RbacAuditLogItem[]>([]);
  const [policyRevision, setPolicyRevision] = useState<number | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [savedDraft, setSavedDraft] = useState('');
  const draftPolicy = { staffOverrides, deptRules, roleAllowedTabs: roleAllowedTabsMap, roleDefaultLanding: roleDefaultLandingMap, internalStaff, matrix: matrixItems, audit: auditLogs };
  const draftText = JSON.stringify({ ...draftPolicy, audit: [] });
  const policyDirty = savedDraft !== '' && draftText !== savedDraft;
  const applyPolicy = (record: Awaited<ReturnType<typeof loadAccessPolicy>>) => {
    const p = record.data;
    setStaffOverrides(p.staffOverrides); setDeptRules(p.deptRules);
    setRoleAllowedTabsMap(p.roleAllowedTabs); setRoleDefaultLandingMap(p.roleDefaultLanding);
    setInternalStaff(p.internalStaff); setMatrixItems(p.matrix); setAuditLogs(p.audit);
    setPolicyRevision(record.revision); setSavedDraft(JSON.stringify({ ...p, audit: [] }));
  };
  useEffect(() => {
    let cancelled = false;
    setPolicyRevision(null);
    loadAccessPolicy().then(record => { if (!cancelled) applyPolicy(record); }).catch(e => { if (!cancelled) setPolicyError(e.message); });
    return () => { cancelled = true; };
  }, [currentUser?.id]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (policyDirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [policyDirty]);
  const commitPolicy = async () => {
    if (policyRevision === null || !isAdmin || policyBusy) return;
    setPolicyBusy(true); setPolicyError('');
    try {
      const record = await saveAccessPolicy(policyRevision, draftPolicy);
      applyPolicy({ ...record, user: currentUser! });
      onNotify?.('Đã lưu quyền dùng chung. Quyền mới được kiểm tra ở yêu cầu tiếp theo.', 'info');
    } catch (e) { setPolicyError((e as Error).message); }
    finally { setPolicyBusy(false); }
  };

  const [auditFilterType, setAuditFilterType] = useState<string>('ALL');
  const [searchAudit, setSearchAudit] = useState<string>('');
  const deferredSearchAudit = useDeferredValue(searchAudit);

  // --- HANDLERS CHO TAB QUẢN TRỊ LỚP ROLE & PHÂN QUYỀN MÀN HÌNH ---
  const selectedRoleDef = useMemo(() => {
    return ALL_ROLE_DEFINITIONS.find(r => r.id === selectedRoleKey) || ALL_ROLE_DEFINITIONS[0];
  }, [selectedRoleKey]);

  const selectedRoleAllowedTabs = useMemo(() => {
    return roleAllowedTabsMap[selectedRoleKey] || ROLE_ALLOWED_TABS[selectedRoleKey] || [];
  }, [roleAllowedTabsMap, selectedRoleKey]);

  const selectedRoleDefaultLanding = useMemo(() => {
    const landing = roleDefaultLandingMap[selectedRoleKey] || ROLE_DEFAULT_LANDING[selectedRoleKey];
    if (selectedRoleAllowedTabs.includes(landing)) return landing;
    return selectedRoleAllowedTabs[0] || landing;
  }, [roleDefaultLandingMap, selectedRoleKey, selectedRoleAllowedTabs]);

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
    const nextTabs = exists
      ? currentTabs.filter(t => t !== screenKey)
      : [...currentTabs, screenKey];

    const nextMap = { ...roleAllowedTabsMap, [role]: nextTabs };
    setRoleAllowedTabsMap(nextMap);


    const currentLanding = roleDefaultLandingMap[role] || ROLE_DEFAULT_LANDING[role];
    if (!nextTabs.includes(currentLanding) && nextTabs.length > 0) {
      const nextLandingMap = { ...roleDefaultLandingMap, [role]: nextTabs[0] };
      setRoleDefaultLandingMap(nextLandingMap);

    }

    const screenLabel = ALL_SYSTEM_SCREENS.find(s => s.key === screenKey)?.label || screenKey;
    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'PERMISSION_TOGGLE',
      targetUserOrEntity: `Role ${role} -> Màn hình "${screenLabel}"`,
      description: `${exists ? 'Thu hồi quyền xem màn hình' : 'Cấp quyền xem màn hình'} "${screenLabel}" (${screenKey}) đối với vai trò ${ROLE_DISPLAY_NAME[role]}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: 'SUCCESS'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.
    onNotify?.(
      `${exists ? 'Bản nháp ẩn màn hình' : 'Bản nháp mở màn hình'} "${screenLabel}" cho vai trò ${ROLE_DISPLAY_NAME[role]}`,
      'success'
    );
  };

  const handleToggleRoleCategoryScreens = (role: UserRole, categoryScreens: TabKey[], enableAll: boolean) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép thay đổi phân quyền màn hình của Role.', 'warning');
      return;
    }
    const currentTabs = roleAllowedTabsMap[role] || ROLE_ALLOWED_TABS[role] || [];
    let nextTabs: TabKey[];
    if (enableAll) {
      const set = new Set<TabKey>([...currentTabs, ...categoryScreens]);
      nextTabs = Array.from(set);
    } else {
      nextTabs = currentTabs.filter(t => !categoryScreens.includes(t));
      if (nextTabs.length === 0) {
        const fallback = ROLE_DEFAULT_LANDING[role] || 'cockpit';
        nextTabs = [fallback];
      }
    }
    const nextMap = { ...roleAllowedTabsMap, [role]: nextTabs };
    setRoleAllowedTabsMap(nextMap);

    onNotify?.(`Đã sửa bản nháp: cụm màn hình cho vai trò ${ROLE_DISPLAY_NAME[role]}`, 'info');
  };

  const handleChangeRoleDefaultLanding = (role: UserRole, nextLanding: TabKey) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép đổi màn hình mặc định của Role.', 'warning');
      return;
    }
    const nextLandingMap = { ...roleDefaultLandingMap, [role]: nextLanding };
    setRoleDefaultLandingMap(nextLandingMap);

    const screenLabel = ALL_SYSTEM_SCREENS.find(s => s.key === nextLanding)?.label || nextLanding;
    onNotify?.(`Đã đặt màn hình mặc định khi đăng nhập của ${ROLE_DISPLAY_NAME[role]} là "${screenLabel}"`, 'info');
  };

  const handleResetSingleRoleScreens = (role: UserRole) => {
    const defaultTabs = [...ROLE_ALLOWED_TABS[role]];
    const defaultLanding = ROLE_DEFAULT_LANDING[role];
    const nextMap = { ...roleAllowedTabsMap, [role]: defaultTabs };
    const nextLandingMap = { ...roleDefaultLandingMap, [role]: defaultLanding };
    setRoleAllowedTabsMap(nextMap);
    setRoleDefaultLandingMap(nextLandingMap);


    onNotify?.(`Đã khôi phục danh sách màn hình mặc định cho vai trò ${ROLE_DISPLAY_NAME[role]}`, 'info');
  };

  const handleAssignStaffToSelectedRole = (staffId: string, targetRole: UserRole) => {
    if (!staffId) return;
    const targetStaff = internalStaff.find(s => s.id === staffId);
    if (!targetStaff) return;

    const updatedList = internalStaff.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          role: targetRole,
          roleTitle: ROLE_DISPLAY_NAME[targetRole] || s.roleTitle,
        };
      }
      return s;
    });
    setInternalStaff(updatedList);


    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${targetStaff.name} (${targetStaff.email})`,
      description: `Admin gán vai trò ${ROLE_DISPLAY_NAME[targetRole]} (${targetRole}) cho nhân sự ${targetStaff.name}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: 'SUCCESS'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.
    setAssignStaffToRoleId('');
    onNotify?.(`Đã gán vai trò ${ROLE_DISPLAY_NAME[targetRole]} cho nhân sự ${targetStaff.name}`, 'info');
  };

  // Lọc Ma trận phân quyền
  const filteredMatrix = useMemo(() => {
    return matrixItems.filter(item => {
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

  // Đổi quyền trên ma trận
  const handleUpdatePermission = (itemId: string, role: string, newLevel: PermissionAccessLevel) => {
    setMatrixItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          permissions: {
            ...item.permissions,
            [role]: newLevel
          }
        };
      }
      return item;
    }));

    // Ghi nhận Audit Log
    const targetFeature = matrixItems.find(i => i.id === itemId)?.featureName || itemId;
    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'PERMISSION_TOGGLE',
      targetUserOrEntity: `${role} -> ${targetFeature}`,
      description: `Đổi cấp độ quyền của vai trò ${role} tại tính năng "${targetFeature}" thành ${newLevel}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: 'SUCCESS'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.

    setSelectedCell(null);
    if (onNotify) onNotify(`Đã sửa bản nháp: quyền "${targetFeature}" cho vai trò ${role} thành ${newLevel}`, 'info');
  };

  // Khôi phục ma trận về mặc định
  const handleResetMatrix = () => {
    setIsConfirmingResetMatrix(true);
  };

  // Lọc Nhân sự nội bộ cốt lõi (theo phạm vi của Trưởng phòng nếu không phải Admin)
  const filteredStaff = useMemo(() => {
    return internalStaff.filter(staff => {
      if (isGrowthManager && staff.departmentScope !== 'GROWTH') return false;
      if (isMediaManager && staff.departmentScope !== 'MEDIA') return false;
      if (staffRoleFilter !== 'ALL' && staff.role !== staffRoleFilter) return false;
      if (deferredSearchStaff.trim()) {
        const q = deferredSearchStaff.toLowerCase();
        return (
          staff.name.toLowerCase().includes(q) ||
          staff.email.toLowerCase().includes(q) ||
          staff.position.toLowerCase().includes(q) ||
          staff.picBrands.some(b => b.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [internalStaff, isGrowthManager, isMediaManager, staffRoleFilter, deferredSearchStaff]);

  // Mở modal sửa nhân sự
  const handleOpenEditStaff = (staff: InternalStaffRbacMember) => {
    setEditingStaff(staff);
    setStaffFormRole(staff.role);
    setStaffFormRoleTitle(staff.roleTitle);
    setStaffFormPicBrands([...staff.picBrands]);
    setStaffFormPerms({ ...staff.permissions });
  };

  // Lưu cấu hình nhân sự
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const updatedList = internalStaff.map(s => {
      if (s.id === editingStaff.id) {
        return {
          ...s,
          role: staffFormRole,
          roleTitle: staffFormRoleTitle || ROLE_DISPLAY_NAME[staffFormRole] || s.roleTitle,
          picBrands: staffFormPicBrands,
          permissions: { ...staffFormPerms }
        };
      }
      return s;
    });
    setInternalStaff(updatedList);


    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${editingStaff.name} (${editingStaff.email})`,
      description: `Cập nhật phân vai trò thành ${staffFormRole}, phụ trách các brand: ${staffFormPicBrands.join(', ') || 'Chưa gán'}.`,
      ipAddress: 'Bản nháp',
      deviceInfo: 'Chưa áp dụng',
      status: 'SUCCESS'
    };
    void newLog; // Nhật ký chính thức được ghi bởi server khi lưu.

    setEditingStaff(null);
    if (onNotify) onNotify(`Đã sửa bản nháp: phân quyền và nhãn phụ trách cho ${editingStaff.name}!`, 'info');
  };

  // Lọc Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditFilterType !== 'ALL' && log.actionType !== auditFilterType) return false;
      if (deferredSearchAudit.trim()) {
        const q = deferredSearchAudit.toLowerCase();
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.targetUserOrEntity.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.ipAddress.includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditFilterType, deferredSearchAudit]);

  // Các vai trò hiển thị trên cột ma trận
  const matrixRolesToRender = useMemo(() => {
    if (roleColumnFilter === 'ALL') return RBAC_ROLE_DEFINITIONS;
    return RBAC_ROLE_DEFINITIONS.filter(r => r.id === roleColumnFilter);
  }, [roleColumnFilter]);

  const editingDirStaffObj = useMemo(() => {
    if (!editingDirectoryStaffId) return null;
    return classifiedDirectory.find(s => s.id === editingDirectoryStaffId) || null;
  }, [classifiedDirectory, editingDirectoryStaffId]);

  return (
    <div className="space-y-5 pb-12">
      {(policyDirty || policyError) && (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning-soft/50 p-3 text-xs flex items-center justify-between gap-3">
          <div>
            <strong className="text-ink">{policyDirty ? 'Có thay đổi chưa áp dụng' : 'Cấu hình quyền'}</strong>
            {policyError && <p role="alert" className="text-critical text-2xs mt-0.5">{policyError}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent text-white hover:opacity-90 disabled:opacity-50"
              disabled={!isAdmin || policyRevision === null || policyBusy || !policyDirty}
              onClick={commitPolicy}
            >
              {policyBusy ? 'Đang lưu…' : 'Lưu quyền'}
            </button>
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-line text-ink-2 hover:bg-sunken"
              disabled={policyBusy}
              onClick={() => {
                if (policyDirty && !window.confirm('Bỏ bản nháp và tải cấu hình mới nhất?')) return;
                loadAccessPolicy().then(applyPolicy).catch(e => setPolicyError(e.message));
              }}
            >
              Hủy thay đổi
            </button>
          </div>
        </div>
      )}

      <Tabs
        items={[
          { key: 'roles', label: 'Vai trò & Màn hình', count: ALL_ROLE_DEFINITIONS.length },
          { key: 'gatekeeper', label: 'Cổng truy cập Lark', count: `${directoryStats.totalAllowed}/${directoryStats.totalStaff}` },
          { key: 'internal', label: 'Nhân sự nội bộ', count: filteredStaff.length },
          { key: 'matrix', label: 'Ma trận chức năng', count: matrixItems.length },
          { key: 'third-party', label: 'Đối tác ngoài' },
          { key: 'audit', label: 'Nhật ký', count: auditLogs.length },
        ]}
        value={activeMainTab}
        onChange={(k) => setActiveMainTab(k as MainTab)}
      />

      {/* ========================================================================= */}
      {/* SUB-TAB ROLES: QUẢN TRỊ LỚP ROLE & PHÂN QUYỀN MÀN HÌNH                    */}
      {/* ========================================================================= */}
      {activeMainTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-200">
          {/* Cột trái: Danh mục Role hệ thống */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-xl border border-line p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Danh mục vai trò
                </h3>
                <span className="text-2xs font-semibold text-accent -accent/20">
                  {ALL_ROLE_DEFINITIONS.length} Role
                </span>
              </div>

              {[
                {
                  groupTitle: 'Pháp chế · Kế toán · Ký số',
                  roleIds: ['LEGAL', 'FINANCE', 'SIGN_ADMIN'] as UserRole[],
                },
                {
                  groupTitle: 'Quản trị & Trưởng phòng',
                  roleIds: ['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'LEADER'] as UserRole[],
                },
                {
                  groupTitle: 'Chuyên viên thực thi',
                  roleIds: ['BOOKING_MEMBER', 'CONTENT_MEMBER', 'BRAND_MEMBER', 'GROWTH_MEMBER', 'MEDIA_MEMBER'] as UserRole[],
                },
                {
                  groupTitle: 'Đối tác bên ngoài (Portal)',
                  roleIds: ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'] as UserRole[],
                },
              ].map((group) => (
                <div key={group.groupTitle} className="space-y-1">
                  <div className="text-2xs font-semibold text-ink-3 uppercase tracking-wider px-1 pt-1">
                    {group.groupTitle}
                  </div>
                  <div className="space-y-1">
                    {group.roleIds.map((rId) => {
                      const rDef = ALL_ROLE_DEFINITIONS.find((x) => x.id === rId);
                      if (!rDef) return null;
                      const isSelected = selectedRoleKey === rDef.id;
                      const allowedCount = (roleAllowedTabsMap[rDef.id] || ROLE_ALLOWED_TABS[rDef.id] || []).length;
                      const staffCount = internalStaff.filter((s) => s.role === rDef.id).length;

                      return (
                        <button
                          key={rDef.id}
                          type="button"
                          onClick={() => setSelectedRoleKey(rDef.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-accent-soft border-accent/20 ring-1 ring-accent/20 text-accent font-medium shadow-2xs'
                              : 'bg-white border-line text-ink-2 hover:bg-canvas hover:border-line-strong'
                          }`}
                        >
                          <span className="text-xs truncate">{rDef.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.2 rounded text-2xs font-semibold border ${
                              allowedCount <= 2
                                ? 'bg-warning-soft text-warning border-warning/20'
                                : 'bg-positive-soft text-positive border-positive/20'
                            }`}>
                              {allowedCount} màn
                            </span>
                            {rDef.scopeType === 'INTERNAL' && staffCount > 0 && (
                              <span className="text-2xs text-ink-3">
                                {staffCount} NV
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Chi tiết phân quyền màn hình & gán nhân sự cho Role đang chọn */}
          <div className="lg:col-span-8 space-y-4">
            {/* Card Header của Role đang chọn */}
            <div className="bg-white rounded-xl border border-line p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedRoleDef.badgeColor}`}>
                      {selectedRoleDef.name}
                    </span>
                    <span className="font-mono text-2xs .5 text-ink-2 -line">
                      {selectedRoleDef.id}
                    </span>
                    <span className="text-2xs text-ink-3">
                      ({selectedRoleDef.scopeType === 'INTERNAL' ? 'Nhân sự nội bộ' : 'Đối tác ngoài'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResetSingleRoleScreens(selectedRoleKey)}
                    className="px-2.5 py-1.5 rounded-lg bg-sunken hover:bg-sunken text-ink-2 text-xs font-medium transition flex items-center gap-1.5"
                    title="Đặt lại danh sách màn hình mặc định cho Role này"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-ink-3" />
                    <span>Đặt lại mặc định</span>
                  </button>
                </div>
              </div>

              {/* Cấu hình Màn hình mở mặc định & Thống kê số màn hình được phép */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-canvas rounded-xl border border-line">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-2 font-medium">Màn hình mở mặc định:</span>
                  <select
                    value={selectedRoleDefaultLanding}
                    onChange={(e) => handleChangeRoleDefaultLanding(selectedRoleKey, e.target.value as TabKey)}
                    className="h-8 px-2.5 rounded-lg border border-line bg-white text-xs font-semibold text-ink focus:outline-none focus:border-accent/20"
                  >
                    {ALL_SYSTEM_SCREENS.filter((s) => selectedRoleAllowedTabs.includes(s.key)).map((scr) => (
                      <option key={scr.key} value={scr.key}>
                        {scr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-ink-2">
                  Được phép truy cập: <strong className="text-accent font-semibold">{selectedRoleAllowedTabs.length}</strong>/{ALL_SYSTEM_SCREENS.length} màn hình
                </div>
              </div>

              {/* Danh sách màn hình hệ thống chia theo nhóm để bật/tắt cho Role */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-ink">
                    Phân quyền màn hình truy cập ({selectedRoleAllowedTabs.length}/{ALL_SYSTEM_SCREENS.length})
                  </h4>
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roleSearchScreen}
                      onChange={(e) => setRoleSearchScreen(e.target.value)}
                      placeholder="Tìm màn hình..."
                      className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-line bg-canvas focus:outline-none focus:border-accent/20"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {Array.from(new Set(ALL_SYSTEM_SCREENS.map((s) => s.groupTitle))).map((catName) => {
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
                    const enabledInCatCount = catKeys.filter((k) => selectedRoleAllowedTabs.includes(k)).length;
                    const allCatEnabled = enabledInCatCount === catKeys.length;

                    return (
                      <div key={catName} className="rounded-xl border border-line overflow-hidden">
                        <div className="bg-canvas px-3.5 py-2 border-b border-line flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs font-semibold text-ink">{catName}</span>
                            <span className="text-2xs bg-white -line text-ink-2 font-semibold">
                              {enabledInCatCount}/{catKeys.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleRoleCategoryScreens(selectedRoleKey, catKeys, !allCatEnabled)}
                            className="text-2xs font-semibold text-accent hover:text-accent px-2 py-0.5 rounded hover:bg-accent-soft transition"
                          >
                            {allCatEnabled ? 'Bỏ chọn cả nhóm' : 'Bật cả nhóm'}
                          </button>
                        </div>

                        <div className="p-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                          {screensInCat.map((scr) => {
                            const isAllowed = selectedRoleAllowedTabs.includes(scr.key);
                            const isDefaultLanding = selectedRoleDefaultLanding === scr.key;

                            return (
                              <label
                                key={scr.key}
                                className={`p-2 rounded-lg border cursor-pointer transition flex items-center gap-2.5 ${
                                  isAllowed
                                    ? 'bg-accent-soft border-accent/20 shadow-2xs'
                                    : 'bg-white border-line opacity-60 hover:opacity-100 hover:bg-canvas'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() => handleToggleRoleScreen(selectedRoleKey, scr.key)}
                                  className="w-4 h-4 rounded text-accent focus:ring-0 shrink-0"
                                />
                                <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                                  <span className={`text-xs font-medium leading-snug ${isAllowed ? 'text-ink font-semibold' : 'text-ink-2'}`}>
                                    {scr.label}
                                  </span>
                                  {isDefaultLanding && isAllowed && (
                                    <span className="px-1.5 py-0.5 rounded text-2xs font-semibold text-positive border border-positive/20 shrink-0">
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
              </div>
            </div>

            {/* Khu vực 2: Danh sách nhân sự đang giữ Role này & Gán nhanh nhân sự vào Role */}
            <div className="bg-white rounded-xl border border-line p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent" />
                  <span>
                    Nhân sự giữ vai trò &ldquo;{selectedRoleDef.name}&rdquo; ({internalStaff.filter((s) => s.role === selectedRoleKey).length})
                  </span>
                </h4>

                {/* Gán nhanh nhân sự vào Role đang chọn */}
                <div className="flex items-center gap-2">
                  <select
                    value={assignStaffToRoleId}
                    onChange={(e) => setAssignStaffToRoleId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-line bg-canvas text-xs text-ink focus:outline-none focus:border-accent/20"
                  >
                    <option value="">+ Gán thêm nhân sự vào Role này...</option>
                    {internalStaff
                      .filter((s) => s.role !== selectedRoleKey)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email}) — đang là {ROLE_DISPLAY_NAME[s.role] || s.role}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!assignStaffToRoleId}
                    onClick={() => handleAssignStaffToSelectedRole(assignStaffToRoleId, selectedRoleKey)}
                    className="px-3 h-8 rounded-lg bg-accent hover:bg-accent disabled:bg-sunken disabled:text-ink-3 text-white text-xs font-semibold transition shrink-0"
                  >
                    Gán vào Role
                  </button>
                </div>
              </div>

              {internalStaff.filter((s) => s.role === selectedRoleKey).length === 0 ? (
                <div className="p-4 text-center bg-canvas rounded-lg text-xs text-ink-3">
                  Chưa có nhân sự nào được gán vai trò <strong>{selectedRoleDef.name}</strong>.
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {internalStaff
                    .filter((s) => s.role === selectedRoleKey)
                    .map((staff) => (
                      <div key={staff.id} className="py-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-accent-soft border border-accent/20 text-accent font-semibold flex items-center justify-center text-xs shrink-0">
                            {staff.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-ink">{staff.name}</span>
                              <span className="text-2xs text-ink-3">({staff.email})</span>
                            </div>
                            <span className="text-2xs text-ink-3 block">
                              {staff.department} · {staff.position}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="px-2.5 py-1 rounded-md bg-sunken hover:bg-sunken text-ink-2 text-2xs font-medium transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Đổi Role</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 0: CỔNG TRUY CẬP & PHÂN KHỐI 1.011 NHÂN VIÊN TOÀN CÔNG TY          */}
      {/* ========================================================================= */}
      {activeMainTab === 'gatekeeper' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Bảng Quy Tắc Cấp Quyền Tự Động Theo Phòng Ban (Admin Gatekeeper Rules) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-line shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-semibold text-ink">
                    Quy tắc mở cổng đăng nhập theo phòng ban
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line text-2xs text-ink-3 bg-canvas font-semibold">
                      <th className="py-2.5 px-4">Cụm Phòng Ban / Team (Đồng bộ từ HR Lark)</th>
                      <th className="py-2.5 px-3">Khối Hệ Thống</th>
                      <th className="py-2.5 px-3">Trưởng Phòng Quản Lý Trực Tiếp</th>
                      <th className="py-2.5 px-3">Role Mặc Định Khi Vào</th>
                      <th className="py-2.5 px-3 text-center">Quân Số</th>
                      <th className="py-2.5 px-4 text-center">Cổng Đăng Nhập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {deptRules.map(rule => {
                      const scopeMeta = SCOPE_LABELS[rule.mappedScope];
                      return (
                        <tr key={rule.id} className="hover:bg-canvas">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-ink">{rule.departmentOrTeamName}</div>
                            <div className="text-2xs text-ink-3">{rule.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}>
                              {scopeMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-ink text-2xs">
                            {rule.defaultManagerName}
                          </td>
                          <td className="py-2.5 px-3 text-2xs text-ink-2 font-mono">
                            {rule.autoAllowLogin ? ROLE_DISPLAY_NAME[rule.defaultRole] : 'Không cấp Role'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-ink-2">
                            {rule.staffCount} NV
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDeptRule(rule.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-2xs font-semibold border transition cursor-pointer ${
                                rule.autoAllowLogin
                                  ? 'bg-positive-soft text-positive border-positive/20 hover:bg-positive-soft'
                                  : 'bg-critical-soft text-critical border-critical/20 hover:bg-critical-soft'
                              }`}
                            >
                              {rule.autoAllowLogin ? (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Cho phép Login</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Đang chặn Login</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bộ Lọc Danh Bạ 1.011 Nhân Sự & Quản Lý Theo Trưởng Phòng */}
          <div className="bg-white p-3.5 rounded-xl border border-line shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span>
                  {isGrowthManager
                    ? `Danh sách nhân viên Khối Growth (${filteredDirectory.length} NV)`
                    : isMediaManager
                    ? `Danh sách nhân viên Khối Media (${filteredDirectory.length} NV)`
                    : isB2cManager
                    ? `Danh sách nhân viên Khối Marketing B2C (${filteredDirectory.length} NV)`
                    : `Danh bạ nhân sự (${filteredDirectory.length} / ${directoryStats.totalStaff} NV)`}
                </span>
              </h3>

              {isAdmin && Object.keys(staffOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffOverrides({});

                    onNotify?.('Đã xóa các thiết lập ngoại lệ cá nhân, quay về quy tắc phòng ban chuẩn.', 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-line text-2xs font-medium text-ink-2 hover:bg-canvas"
                >
                  Đặt lại {Object.keys(staffOverrides).length} ngoại lệ cá nhân
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên, mã NV (HN222), email, phòng ban..."
                  value={dirSearch}
                  onChange={(e) => { setDirSearch(e.target.value); setDirPage(1); }}
                  className="w-full pl-8.5 pr-3 h-9 text-xs rounded-lg border border-line focus:outline-none focus:border-accent/20 bg-canvas"
                />
              </div>

              {isAdmin && (
                <select
                  value={dirScopeFilter}
                  onChange={(e) => { setDirScopeFilter(e.target.value); setDirPage(1); }}
                  className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium"
                >
                  <option value="ALLOWED_3_SCOPES">3 Khối được vào (MKT B2C + Growth + Media)</option>
                  <option value="ALL">Toàn bộ công ty ({directoryStats.totalStaff} nhân sự)</option>
                  <option value="MARKETING_B2C">1. Khối Marketing B2C ({directoryStats.mktTotal})</option>
                  <option value="GROWTH">2. Khối Growth Ecom ({directoryStats.growthTotal})</option>
                  <option value="MEDIA">3. Khối Media & Ads ({directoryStats.mediaTotal})</option>
                  <option value="OTHER_BLOCKED">4. Phòng ban khác - Đang chặn ({directoryStats.otherTotal})</option>
                </select>
              )}

              <select
                value={dirLoginFilter}
                onChange={(e) => { setDirLoginFilter(e.target.value as 'ALL' | 'ALLOWED' | 'BLOCKED' | 'OVERRIDDEN'); setDirPage(1); }}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium"
              >
                <option value="ALL">Mọi trạng thái Login</option>
                <option value="ALLOWED">Được phép Login ({directoryStats.totalAllowed})</option>
                <option value="BLOCKED">Bị chặn Login ({directoryStats.totalBlocked})</option>
                <option value="OVERRIDDEN">Admin phân quyền đích danh ({Object.keys(staffOverrides).length})</option>
              </select>

              <select
                value={dirDeptFilter}
                onChange={(e) => { setDirDeptFilter(e.target.value); setDirPage(1); }}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium max-w-[200px]"
              >
                <option value="ALL">Mọi Team / Phòng ban ({directoryDepartments.length})</option>
                {directoryDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Bảng Danh Bạ 1.011 Nhân Sự */}
            <div className="border border-line rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-canvas border-b border-line text-2xs font-semibold text-ink-2">
                      <th className="py-2.5 px-3 w-[90px]">Mã NV</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nhân Viên & Email</th>
                      <th className="py-2.5 px-3">Phòng Ban / Team Gốc</th>
                      <th className="py-2.5 px-3">Khối Hệ Thống</th>
                      <th className="py-2.5 px-3">Vai Trò & Trưởng Phòng Quản Lý</th>
                      <th className="py-2.5 px-3 text-center">Quyền Đăng Nhập</th>
                      <th className="py-2.5 px-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {pagedDirectory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-ink-3">
                          Không tìm thấy nhân viên nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      pagedDirectory.map(staff => {
                        const scopeMeta = SCOPE_LABELS[staff.classifiedScope];
                        return (
                          <tr key={staff.id} className="hover:bg-canvas transition">
                            <td className="py-2.5 px-3 font-mono font-semibold text-ink">
                              <span className=".5 -line text-2xs">
                                {staff.staffCode || staff.id}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-ink">{staff.name}</div>
                              <div className="text-2xs text-ink-3 font-mono">{staff.email}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-ink">{staff.department || staff.team || 'Chưa phân phòng'}</div>
                              <div className="text-2xs text-ink-3">
                                {staff.position || staff.roleTitle} · {staff.location || 'HN'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}>
                                {scopeMeta.label}
                              </span>
                              {staff.accessSource === 'ADMIN_EXPLICIT' && (
                                <span className="block text-2xs text-accent font-semibold mt-0.5">
                                  Admin cấp đích danh
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
                                    Quản lý: <strong className="text-ink-2">{staff.managerName}</strong>
                                  </span>
                                </>
                              ) : (
                                <span className="text-2xs text-ink-3 italic">
                                  Không có quyền truy cập B2C
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleQuickToggleStaffLogin(staff)}
                                disabled={!isAdmin}
                                title={isAdmin ? 'Bấm để Bật / Tắt quyền đăng nhập hệ thống của nhân viên này' : 'Chỉ Admin mới được đóng/mở quyền đăng nhập'}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-semibold border transition ${
                                  isAdmin ? 'cursor-pointer' : 'cursor-default'
                                } ${
                                  staff.canLogin
                                    ? 'bg-positive-soft text-positive border-positive/20 hover:bg-positive-soft'
                                    : 'bg-critical-soft text-critical border-critical/20 hover:bg-critical-soft'
                                }`}
                              >
                                {staff.canLogin ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-positive" />
                                    <span>Được vào</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-critical" />
                                    <span>Chặn Login</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDirectoryStaff(staff)}
                                    className="p-1.5 rounded-lg border border-line hover:bg-sunken text-ink-2"
                                    title="Phân khối Marketing / Growth / Media & bổ nhiệm Vai trò"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-2.5 bg-canvas border-t border-line flex flex-wrap items-center justify-between gap-2 text-2xs text-ink-2">
                <div>
                  Hiển thị <strong>{Math.min(filteredDirectory.length, (dirPage - 1) * DIR_PAGE_SIZE + 1)} - {Math.min(filteredDirectory.length, dirPage * DIR_PAGE_SIZE)}</strong> / <strong>{filteredDirectory.length}</strong> nhân sự
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={dirPage <= 1}
                    onClick={() => setDirPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded border border-line bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-semibold">
                    Trang {dirPage} / {totalDirPages}
                  </span>
                  <button
                    type="button"
                    disabled={dirPage >= totalDirPages}
                    onClick={() => setDirPage(p => Math.min(totalDirPages, p + 1))}
                    className="p-1 rounded border border-line bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Admin Phân Khối & Cấp Quyền Truy Cập Cho Nhân Sự */}
          <Presence show={!!editingDirStaffObj}>
          {editingDirStaffObj && (
            <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-ink">
                      Cấu Hình Cổng Đăng Nhập & Phân Khối Nhân Sự
                    </h3>
                    <p className="text-2xs text-ink-3">
                      {editingDirStaffObj.name} ({editingDirStaffObj.staffCode} · Phòng gốc: {editingDirStaffObj.department || editingDirStaffObj.team || 'Khác'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDirectoryStaffId(null)}
                    className="p-1 rounded-lg text-ink-3 hover:text-ink-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveDirectoryStaff} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-canvas border border-line flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink">Cho phép đăng nhập hệ thống B2C</div>
                      <div className="text-2xs text-ink-3">Nếu tắt, nhân viên này sẽ bị chặn ở màn hình Login.</div>
                    </div>
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
                          1. Thuộc Khối chức năng nào trong hệ thống? *
                        </label>
                        <select
                          value={dirEditScope}
                          onChange={(e) => {
                            const nextScope = e.target.value as SystemDepartmentScope;
                            setDirEditScope(nextScope);
                            if (nextScope === 'GROWTH') {
                              setDirEditRole('GROWTH_MEMBER');
                              setDirEditManager('Trần Thị Đỗ Quyên');
                            } else if (nextScope === 'MEDIA') {
                              setDirEditRole('MEDIA_MEMBER');
                              setDirEditManager('Nguyễn Đức Quảng');
                            } else {
                              setDirEditRole('BOOKING_MEMBER');
                              setDirEditManager('Đặng Thị Yến Nhi');
                            }
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-line bg-white font-semibold"
                        >
                          <option value="MARKETING_B2C">Khối Marketing B2C (Booking / Content / Brand)</option>
                          <option value="GROWTH">Khối Growth Ecom (Growth 1 - 6 & HCM)</option>
                          <option value="MEDIA">Khối Media & Ads (Media Omni & TikTok)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-ink-2 block">
                          2. Vai trò (Role) trong hệ thống *
                        </label>
                        <select
                          value={dirEditRole}
                          onChange={(e) => setDirEditRole(e.target.value as UserRole)}
                          className="w-full h-9 px-3 rounded-lg border border-line bg-white font-semibold"
                        >
                          <optgroup label="Cấp Quản Trị & Trưởng Phòng 3 Khối">
                            <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
                            <option value="MANAGER">Giám Đốc Marketing B2C (MANAGER)</option>
                            <option value="GROWTH_MANAGER">Trưởng Phòng Growth (GROWTH_MANAGER)</option>
                            <option value="MEDIA_MANAGER">Trưởng Phòng Media (MEDIA_MANAGER)</option>
                            <option value="LEADER">Trưởng Nhóm Booking B2C (LEADER)</option>
                          </optgroup>
                          <optgroup label="Cấp Chuyên Viên Thực Thi">
                            <option value="BOOKING_MEMBER">Chuyên Viên Booking B2C (BOOKING_MEMBER)</option>
                            <option value="CONTENT_MEMBER">Chuyên Viên Content B2C (CONTENT_MEMBER)</option>
                            <option value="BRAND_MEMBER">Chuyên Viên Brand PIC (BRAND_MEMBER)</option>
                            <option value="GROWTH_MEMBER">Chuyên Viên Growth (GROWTH_MEMBER)</option>
                            <option value="MEDIA_MEMBER">Chuyên Viên Media & Ads (MEDIA_MEMBER)</option>
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
                          className="w-full h-9 px-3 rounded-lg border border-line bg-white"
                          placeholder="Tên Trưởng phòng quản lý..."
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setEditingDirectoryStaffId(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-accent hover:bg-accent text-white text-xs font-semibold"
                    >
                      Lưu Phân Quyền
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </Presence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MA TRẬN PHÂN QUYỀN (INTERACTIVE RBAC MATRIX) */}
      {/* ========================================================================= */}
      {activeMainTab === 'matrix' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Quick Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tính năng, quyền hạn..."
                  value={searchMatrix}
                  onChange={(e) => setSearchMatrix(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-line focus:outline-none focus:border-accent/20 bg-canvas"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium focus:outline-none focus:border-accent/20"
              >
                <option value="ALL">Tất cả 5 Phân hệ</option>
                <option value="PLANNING">1. Lập Kế Hoạch & Phân Bổ Tải</option>
                <option value="BOOKING_CONTENT">2. Vận Hành Booking KOC & Kịch Bản</option>
                <option value="CONTRACTS_FINANCE">3. Hợp Đồng, Pháp Lý & Thanh Toán</option>
                <option value="PERFORMANCE_ADS">4. Hiệu Suất, Thưởng 4P & Báo Cáo Ads</option>
                <option value="SYSTEM_MASTER">5. Quản Trị Hệ Thống & Master Data</option>
              </select>

              {/* Filter By Role Column */}
              <select
                value={roleColumnFilter}
                onChange={(e) => setRoleColumnFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium focus:outline-none focus:border-accent/20"
              >
                <option value="ALL">Hiển thị cả 9 Vai trò (Grid Matrix)</option>
                {RBAC_ROLE_DEFINITIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Badge Legend & Reset */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-2xs text-ink-2 bg-canvas px-3 py-1.5 rounded-lg border border-line">
                <span className="font-semibold text-ink-2">Chú giải:</span>
                <span className="inline-flex items-center text-positive font-semibold">ALL</span>
                <span className="inline-flex items-center text-accent font-semibold">SCOPED</span>
                <span className="inline-flex items-center text-warning font-semibold">VIEW</span>
                <span className="inline-flex items-center text-accent font-semibold">APPROVE</span>
                <span className="inline-flex items-center text-ink-3 font-medium">DENIED</span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetMatrix}
                  className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-sunken text-ink-2 text-2xs font-medium border border-line transition flex items-center gap-1.5"
                  title="Khôi phục ma trận phân quyền về mặc định"
                >
                  <RefreshCw className="w-3 h-3 text-ink-3" />
                  <span>Khôi phục mặc định</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-canvas border-b border-line text-ink-2 text-xs font-semibold">
                    <th className="py-3 px-4 w-[280px]">Tính Năng & Nghiệp Vụ</th>
                    {matrixRolesToRender.map(role => (
                      <th key={role.id} className="py-3 px-3 text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${role.badgeColor}`}>
                            {role.name.split(' (')[0]}
                          </span>
                          <span className="text-2xs text-ink-3 font-normal">
                            {role.scopeType === 'INTERNAL' ? 'Nội bộ' : 'Gmail'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {filteredMatrix.map((item, idx) => {
                    const isNewCategory = idx === 0 || filteredMatrix[idx - 1].category !== item.category;

                    return (
                      <React.Fragment key={item.id}>
                        {isNewCategory && (
                          <tr className="bg-accent-soft border-y border-accent/20/80">
                            <td
                              colSpan={matrixRolesToRender.length + 1}
                              className="py-2 px-4 text-xs font-semibold text-accent flex items-center gap-2"
                            >
                              <Layers className="w-3.5 h-3.5 text-accent" />
                              <span>{item.categoryTitle}</span>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-canvas transition">
                          {/* Feature Column */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <span className="font-semibold text-ink block leading-snug">
                                {item.featureName}
                              </span>
                              <span className="text-2xs text-ink-3 block leading-relaxed">
                                {item.description}
                              </span>
                              {item.securityNote && (
                                <div className="inline-flex items-center gap-1 text-2xs text-warning bg-warning-soft px-2 py-0.5 rounded border border-warning/20/80">
                                  <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                                  <span>{item.securityNote}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role Permission Cells */}
                          {matrixRolesToRender.map(role => {
                            const level: PermissionAccessLevel = item.permissions[role.id] || 'DENIED';
                            const badge = PERMISSION_BADGE_CONFIG[level];

                            return (
                              <td key={role.id} className="py-2.5 px-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCell({
                                    itemId: item.id,
                                    role: role.id,
                                    currentLevel: level
                                  })}
                                  title={`${badge.description} - Bấm để thay đổi quyền`}
                                  className={`w-full py-1.5 px-1.5 rounded-lg border text-2xs transition flex items-center justify-center gap-1 shadow-2xs ${badge.bg} ${badge.border} ${badge.text}`}
                                >
                                  <span>{badge.shortLabel}</span>
                                </button>
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

            {/* Matrix Footer Info */}
            <div className="p-4 bg-canvas border-t border-line flex flex-wrap items-center justify-between text-2xs text-ink-3 gap-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-positive" />
                <span>
                  Ma trận đang kiểm soát <strong>{matrixItems.length} quyền hạn</strong> trên <strong>9 vai trò</strong> (bao gồm Trưởng phòng Growth & Trưởng phòng Media).
                </span>
              </div>
              <span className="text-ink-3">
                Chính sách áp dụng theo thời gian thực
              </span>
            </div>
          </div>

          {/* Quick Edit Permission Modal Popup */}
          <Presence show={!!selectedCell}>
          {selectedCell && (
            <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-semibold text-sm text-ink">Thiết Lập Cấp Độ Quyền</h3>
                      <span className="text-2xs text-ink-3">
                        Vai trò: <strong className="text-accent">{selectedCell.role}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-sunken transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-accent-soft rounded-xl border border-accent/20 text-xs text-accent">
                  <span className="font-semibold block mb-0.5">Tính năng:</span>
                  <span>{matrixItems.find(i => i.id === selectedCell.itemId)?.featureName}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-2xs font-semibold text-ink-2 block">
                    Chọn cấp độ phân quyền mới:
                  </span>
                  {(['ALL', 'SCOPED', 'VIEW', 'APPROVE', 'DENIED'] as PermissionAccessLevel[]).map(lvl => {
                    const cfg = PERMISSION_BADGE_CONFIG[lvl];
                    const isSelected = selectedCell.currentLevel === lvl;

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleUpdatePermission(selectedCell.itemId, selectedCell.role, lvl)}
                        className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition ${
                          isSelected
                            ? `${cfg.bg} ${cfg.border} ring-2 ring-accent/20 shadow-xs`
                            : 'bg-white border-line hover:bg-canvas'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-xs block ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-2xs text-ink-3 block">{cfg.description}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken transition"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </div>
          )}
          </Presence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: NHÂN SỰ NỘI BỘ (LARK SSO RBAC) */}
      {/* ========================================================================= */}
      {activeMainTab === 'internal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhân sự, email, nhãn phụ trách..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-line focus:outline-none focus:border-accent/20 bg-canvas"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium focus:outline-none focus:border-accent/20"
              >
                <option value="ALL">Tất cả vai trò nội bộ</option>
                <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
                <option value="MANAGER">Giám Đốc Marketing B2C (MANAGER)</option>
                <option value="GROWTH_MANAGER">Trưởng Phòng Growth (GROWTH_MANAGER)</option>
                <option value="MEDIA_MANAGER">Trưởng Phòng Media (MEDIA_MANAGER)</option>
                <option value="LEADER">Trưởng Nhóm Booking (LEADER)</option>
                <option value="BOOKING_MEMBER">Chuyên Viên Booking B2C</option>
                <option value="GROWTH_MEMBER">Chuyên Viên Growth</option>
                <option value="MEDIA_MEMBER">Chuyên Viên Media & Ads</option>
                <option value="CONTENT_MEMBER">Chuyên Viên Content</option>
                <option value="BRAND_MEMBER">Brand PIC</option>
                <option value="LEGAL">Pháp Chế (LEGAL)</option>
                <option value="FINANCE">Kế Toán (FINANCE)</option>
                <option value="SIGN_ADMIN">Điều Phối Ký Điện Tử (SIGN_ADMIN)</option>
              </select>
            </div>

            <div className="text-2xs text-ink-3">
              Đồng bộ tự động từ <strong>Lark Base Nhân sự</strong>
            </div>
          </div>

          {/* Internal Staff Grid Table */}
          <div className="bg-white rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-ink-2 text-2xs font-semibold ">
                    <th className="py-3 px-4">Nhân Sự & Email Lark</th>
                    <th className="py-3 px-4">Vai Trò Hệ Thống</th>
                    <th className="py-3 px-4">Phòng Ban & Vị Trí</th>
                    <th className="py-3 px-4">Cụm Nhãn Phụ Trách (PIC)</th>
                    <th className="py-3 px-4">Quyền Phê Duyệt Đặc Thù</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-canvas transition">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent-soft border border-accent/20 text-accent font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {staff.avatar}
                          </div>
                          <div>
                            <span className="font-semibold text-ink block leading-tight">{staff.name}</span>
                            <span className="text-2xs text-ink-3 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-ink-3" />
                              <span>{staff.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${
                          staff.role === 'ADMIN' ? 'bg-critical-soft text-critical border-critical/20' :
                          staff.role === 'MANAGER' ? 'bg-accent-soft text-accent border-accent/20' :
                          staff.role === 'GROWTH_MANAGER' ? 'bg-warning-soft text-warning border-warning/20' :
                          staff.role === 'MEDIA_MANAGER' ? 'bg-accent-soft text-accent border-accent/20' :
                          staff.role === 'LEADER' ? 'bg-accent-soft text-accent border-accent/20' :
                          staff.role === 'LEGAL' || staff.role === 'FINANCE' || staff.role === 'SIGN_ADMIN' ? 'bg-warning-soft text-warning border-warning/20' :
                          'bg-positive-soft text-positive border-positive/20'
                        }`}>
                          {ROLE_DISPLAY_NAME[staff.role] || staff.role}
                        </span>
                        <span className="text-2xs text-ink-3 block mt-1">{staff.roleTitle}</span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-ink-2 block">{staff.department}</span>
                        <span className="text-2xs text-ink-3">{staff.position}</span>
                      </td>

                      {/* PIC Brands */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.picBrands.includes('ALL_BRANDS') ? (
                            <span className="text-positive -positive/20 text-2xs font-semibold">
                              Tất cả nhãn hàng
                            </span>
                          ) : staff.picBrands.length > 0 ? (
                            staff.picBrands.map((b, i) => (
                              <span key={i} className="text-accent -accent/20 text-2xs font-medium">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-2xs text-ink-3 italic">Chưa gán nhãn</span>
                          )}
                        </div>
                      </td>

                      {/* Special Permissions Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-2xs">
                          {staff.permissions.canApproveBudget && (
                            <span className=".5 text-accent -accent/20 font-semibold" title="Duyệt ngân sách">
                              Duyệt Ngân Sách
                            </span>
                          )}
                          {staff.permissions.canApproveP3 && (
                            <span className=".5 text-accent -accent/20 font-semibold" title="Duyệt thưởng 4P">
                              Duyệt P3
                            </span>
                          )}
                          {staff.permissions.canApprovePayment && (
                            <span className=".5 text-positive -positive/20 font-semibold" title="Duyệt thanh toán">
                              Duyệt Chi
                            </span>
                          )}
                          {staff.permissions.canExportRawData && (
                            <span className=".5 text-ink-2 -line" title="Xuất dữ liệu">
                              Export
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1.5 rounded-lg hover:bg-sunken text-ink-2 transition"
                            title="Chỉnh sửa phân vai & quyền"
                          >
                            <Edit3 className="w-4 h-4 text-ink-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Internal Staff Modal */}
          <Presence show={!!editingStaff}>
          {editingStaff && (
            <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-accent" />
                    <div>
                      <h3 className="font-semibold text-sm text-ink">Phân Vai Trò & Phụ Trách Nhãn</h3>
                      <span className="text-2xs text-ink-3">{editingStaff.name} ({editingStaff.email})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="p-1 rounded-lg text-ink-3 hover:text-ink-2 hover:bg-sunken transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
                  {/* Role select */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink-2">Vai trò hệ thống *</label>
                    <select
                      value={staffFormRole}
                      onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                      className="w-full h-9 px-3 rounded-lg border border-line bg-white font-semibold focus:outline-none focus:border-accent/20"
                    >
                      <option value="ADMIN">Quản Trị Hệ Thống (ADMIN) - Toàn quyền</option>
                      <option value="MANAGER">Giám Đốc Marketing B2C (MANAGER)</option>
                      <option value="GROWTH_MANAGER">Trưởng Phòng Growth (GROWTH_MANAGER)</option>
                      <option value="MEDIA_MANAGER">Trưởng Phòng Media (MEDIA_MANAGER)</option>
                      <option value="LEADER">Trưởng Nhóm Booking B2C (LEADER)</option>
                      <option value="BOOKING_MEMBER">Chuyên Viên Booking KOC (BOOKING_MEMBER)</option>
                      <option value="GROWTH_MEMBER">Chuyên Viên Growth (GROWTH_MEMBER)</option>
                      <option value="MEDIA_MEMBER">Chuyên Viên Media & Ads (MEDIA_MEMBER)</option>
                      <option value="CONTENT_MEMBER">Chuyên Viên Sáng Tạo Kịch Bản (CONTENT_MEMBER)</option>
                      <option value="BRAND_MEMBER">Chuyên Viên Brand PIC (BRAND_MEMBER)</option>
                      <option value="LEGAL">Pháp Chế (LEGAL)</option>
                      <option value="FINANCE">Kế Toán (FINANCE)</option>
                      <option value="SIGN_ADMIN">Điều Phối Ký Điện Tử (SIGN_ADMIN)</option>
                    </select>
                  </div>

                  {/* Brand PIC assignment */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink-2">Nhãn hàng phụ trách (PIC Brands):</label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-canvas rounded-xl border border-line">
                      {brands.map(b => {
                        const isChecked = staffFormPicBrands.includes(b.name);
                        return (
                          <label
                            key={b.id}
                            className={`px-2.5 py-1 rounded-lg border text-2xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                              isChecked ? 'bg-accent-soft text-accent border-accent/20 font-semibold' : 'bg-white text-ink-2 border-line'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStaffFormPicBrands(prev => [...prev, b.name]);
                                } else {
                                  setStaffFormPicBrands(prev => prev.filter(x => x !== b.name));
                                }
                              }}
                              className="rounded text-accent focus:ring-0"
                            />
                            <span>{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Permission Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink-2">Quyền phê duyệt đặc thù:</label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-accent-soft rounded-xl border border-accent/20">
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-ink-2">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveBudget}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveBudget: e.target.checked }))}
                          className="rounded text-accent"
                        />
                        <span>Duyệt Ngân Sách Tháng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-ink-2">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveP3}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveP3: e.target.checked }))}
                          className="rounded text-accent"
                        />
                        <span>Đánh giá & Duyệt P3</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-ink-2">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApprovePayment}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApprovePayment: e.target.checked }))}
                          className="rounded text-accent"
                        />
                        <span>Duyệt Chi Thanh Toán</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-ink-2">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canExportRawData}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canExportRawData: e.target.checked }))}
                          className="rounded text-accent"
                        />
                        <span>Xuất File Báo Cáo Excel</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={() => setEditingStaff(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-accent hover:bg-accent text-white text-xs font-semibold transition shadow-md shadow-xs"
                    >
                      Lưu Thay Đổi
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </Presence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ĐỐI TÁC BÊN THỨ 3 (GMAIL SSO SETUP VIEW) */}
      {/* ========================================================================= */}
      {activeMainTab === 'third-party' && (
        <div className="animate-in fade-in duration-200">
          <ThirdPartyAccessSetupView
            currentUser={currentUser}
            brands={brands}
            kocs={kocs}
            onNotify={onNotify}
            onImpersonatePartner={onImpersonatePartner}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: KIỂM TOÁN & NHẬT KÝ PHIÊN (AUDIT LOGS) */}
      {/* ========================================================================= */}
      {activeMainTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo người thực hiện, đối tượng, IP..."
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-line focus:outline-none focus:border-accent/20 bg-canvas"
                />
              </div>

              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-line bg-white font-medium focus:outline-none focus:border-accent/20"
              >
                <option value="ALL">Tất cả hành động bảo mật</option>
                <option value="LOGIN">Đăng nhập hệ thống (LOGIN)</option>
                <option value="LOGIN_BLOCKED">Chặn đăng nhập sai phòng ban (LOGIN_BLOCKED)</option>
                <option value="ACCESS_GRANT">Cấp quyền đăng nhập (ACCESS_GRANT)</option>
                <option value="ACCESS_REVOKE">Thu hồi quyền đăng nhập (ACCESS_REVOKE)</option>
                <option value="DEPT_RULE_UPDATE">Cập nhật rule phòng ban (DEPT_RULE_UPDATE)</option>
                <option value="IMPERSONATE">Xem thử giao diện (IMPERSONATE)</option>
                <option value="ROLE_CHANGE">Cập nhật phân vai (ROLE_CHANGE)</option>
                <option value="PERMISSION_TOGGLE">Đổi cấp độ quyền (PERMISSION_TOGGLE)</option>
                <option value="INVITE_PARTNER">Cấp quyền Gmail mới (INVITE_PARTNER)</option>
              </select>
            </div>

            <div className="text-2xs text-ink-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-positive" />
              <span>Ghi nhận bất biến (Immutable Security Log)</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-ink-2 text-2xs font-semibold ">
                    <th className="py-3 px-4 w-[170px]">Thời Gian</th>
                    <th className="py-3 px-4 w-[200px]">Người Thực Hiện (Actor)</th>
                    <th className="py-3 px-4 w-[160px]">Loại Hành Động</th>
                    <th className="py-3 px-4 w-[220px]">Đối Tượng Tác Động</th>
                    <th className="py-3 px-4">Chi Tiết Sự Kiện</th>
                    <th className="py-3 px-4 w-[160px]">IP & Thiết Bị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs font-sans">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas transition">
                      <td className="py-3 px-4 text-2xs text-ink-3 font-mono">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink block leading-tight">{log.actorName}</span>
                        <span className="text-2xs text-accent font-semibold">{log.actorRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border ${
                          log.actionType === 'LOGIN_BLOCKED' || log.actionType === 'ACCESS_REVOKE' ? 'bg-critical-soft text-critical border-critical/20' :
                          log.actionType === 'ACCESS_GRANT' || log.actionType === 'INVITE_PARTNER' ? 'bg-positive-soft text-positive border-positive/20' :
                          log.actionType === 'IMPERSONATE' ? 'bg-warning-soft text-warning border-warning/20' :
                          'bg-accent-soft text-accent border-accent/20'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink block text-2xs">{log.targetUserOrEntity}</span>
                      </td>
                      <td className="py-3 px-4 text-ink-2 text-2xs leading-relaxed">
                        {log.description}
                      </td>
                      <td className="py-3 px-4 text-2xs text-ink-3 font-mono">
                        <div>{log.ipAddress}</div>
                        <div className="text-ink-3 truncate max-w-[140px]">{log.deviceInfo}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset RBAC Matrix Dialog */}
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
          if (onNotify) onNotify('Đã khôi phục Phân quyền Role & Ma trận chuẩn UpBase B2C thành công!', 'info');
          setIsConfirmingResetMatrix(false);
        }}
      />
    </div>
  );
};
