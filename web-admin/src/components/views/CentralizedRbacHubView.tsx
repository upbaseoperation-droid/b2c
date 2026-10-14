'use client';

import React, { useState, useMemo, useRef, useDeferredValue } from 'react';
import { ConfirmDialog, Tabs, Presence } from '../ui';
import {
  ShieldCheck,
  ShieldAlert,
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
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    managerLabel: 'Đặng Thị Yến Nhi (Trưởng phòng B2C)'
  },
  GROWTH: {
    label: 'Khối Growth Ecom',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    managerLabel: 'Trần Thị Đỗ Quyên (Trưởng phòng Growth)'
  },
  MEDIA: {
    label: 'Khối Media & Ads',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    managerLabel: 'Nguyễn Đức Quảng (Trưởng phòng Media)'
  },
  OTHER_BLOCKED: {
    label: 'Phòng ban khác (Ngoài hệ thống)',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
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

  const isAdmin = !currentUser || currentUser.role === 'ADMIN';
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

  // Trình mô phỏng kiểm tra cổng đăng nhập (Login Gatekeeper Simulator)
  const [simSelectedStaffId, setSimSelectedStaffId] = useState<string>('HN782'); // Mặc định thử 1 nhân sự Livestream bị chặn

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
    saveDeptAccessRules(updated);

    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'DEPT_RULE_UPDATE',
      targetUserOrEntity: targetRule.departmentOrTeamName,
      description: `${nextAllow ? 'Mở cổng cho phép đăng nhập' : 'Khóa cổng chặn đăng nhập'} đối với toàn bộ nhân sự thuộc cụm phòng ban "${targetRule.departmentOrTeamName}".`,
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: nextAllow ? 'SUCCESS' : 'WARNING'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    onNotify?.(
      `${nextAllow ? 'Đã mở quyền đăng nhập' : 'Đã khóa quyền đăng nhập'} cho cụm phòng ban: ${targetRule.departmentOrTeamName}`,
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
    saveStaffAccessOverrides(nextMap);

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
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: nextCanLogin ? 'SUCCESS' : 'WARNING'
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
    saveStaffAccessOverrides(nextMap);

    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${target.name} (${target.staffCode || target.id})`,
      description: `Cấu hình nhân sự: Trạng thái Login=${dirEditCanLogin ? 'CHO PHÉP' : 'CHẶN'}, Khối=${SCOPE_LABELS[dirEditScope].label}, Vai trò=${ROLE_DISPLAY_NAME[dirEditRole]}, Quản lý=${dirEditManager}.`,
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setEditingDirectoryStaffId(null);
    onNotify?.(`Đã lưu phân quyền cho ${target.name} (${ROLE_DISPLAY_NAME[dirEditRole]})`, 'success');
  };

  // Đóng vai bất kỳ nhân sự nào từ danh bạ (nếu nhân sự đó được phép login)
  const handleImpersonateDirectoryStaff = (staff: typeof classifiedDirectory[0]) => {
    if (!staff.canLogin) {
      onNotify?.(`Nhân sự ${staff.name} đang bị chặn cổng Login. Hãy cấp quyền trước khi đóng vai!`, 'error');
      return;
    }
    const initials = staff.name.trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
    const impersonatedProfile: UserProfile = {
      id: `staff_${staff.id}`,
      name: staff.name,
      email: staff.email,
      role: staff.mappedRole,
      roleTitle: `${staff.mappedRoleTitle} (${SCOPE_LABELS[staff.classifiedScope].label})`,
      avatar: initials || 'NV',
      staffCode: staff.staffCode,
      departmentScope: staff.classifiedScope,
      departmentName: staff.department || staff.team,
      managerName: staff.managerName,
      canLogin: true,
      loginProvider: 'SANDBOX',
      assignedBrands: ['MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'ADMIN'].includes(staff.mappedRole)
        ? ['Tất cả nhãn hàng', 'Kutieskin', 'ClubClio', 'Fresh', 'Cocoon', 'Senka']
        : ['Kutieskin', 'ClubClio', 'Fresh']
    };
    onImpersonateUser?.(impersonatedProfile);
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
  const [auditLogs, setAuditLogs] = useState<RbacAuditLogItem[]>(INITIAL_RBAC_AUDIT_LOGS);
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
    saveRoleAllowedTabs(nextMap);

    const currentLanding = roleDefaultLandingMap[role] || ROLE_DEFAULT_LANDING[role];
    if (!nextTabs.includes(currentLanding) && nextTabs.length > 0) {
      const nextLandingMap = { ...roleDefaultLandingMap, [role]: nextTabs[0] };
      setRoleDefaultLandingMap(nextLandingMap);
      saveRoleDefaultLanding(nextLandingMap);
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
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    onNotify?.(
      `${exists ? 'Đã ẩn màn hình' : 'Đã mở màn hình'} "${screenLabel}" cho vai trò ${ROLE_DISPLAY_NAME[role]}`,
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
    saveRoleAllowedTabs(nextMap);
    onNotify?.(`Đã cập nhật cụm màn hình cho vai trò ${ROLE_DISPLAY_NAME[role]}`, 'success');
  };

  const handleChangeRoleDefaultLanding = (role: UserRole, nextLanding: TabKey) => {
    if (!isAdmin) {
      onNotify?.('Chỉ Quản trị hệ thống (Admin) mới được phép đổi màn hình mặc định của Role.', 'warning');
      return;
    }
    const nextLandingMap = { ...roleDefaultLandingMap, [role]: nextLanding };
    setRoleDefaultLandingMap(nextLandingMap);
    saveRoleDefaultLanding(nextLandingMap);
    const screenLabel = ALL_SYSTEM_SCREENS.find(s => s.key === nextLanding)?.label || nextLanding;
    onNotify?.(`Đã đặt màn hình mặc định khi đăng nhập của ${ROLE_DISPLAY_NAME[role]} là "${screenLabel}"`, 'success');
  };

  const handleResetSingleRoleScreens = (role: UserRole) => {
    const defaultTabs = [...ROLE_ALLOWED_TABS[role]];
    const defaultLanding = ROLE_DEFAULT_LANDING[role];
    const nextMap = { ...roleAllowedTabsMap, [role]: defaultTabs };
    const nextLandingMap = { ...roleDefaultLandingMap, [role]: defaultLanding };
    setRoleAllowedTabsMap(nextMap);
    setRoleDefaultLandingMap(nextLandingMap);
    saveRoleAllowedTabs(nextMap);
    saveRoleDefaultLanding(nextLandingMap);
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
    saveInternalStaffList(updatedList);

    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${targetStaff.name} (${targetStaff.email})`,
      description: `Admin gán vai trò ${ROLE_DISPLAY_NAME[targetRole]} (${targetRole}) cho nhân sự ${targetStaff.name}.`,
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setAssignStaffToRoleId('');
    onNotify?.(`Đã gán vai trò ${ROLE_DISPLAY_NAME[targetRole]} cho nhân sự ${targetStaff.name}`, 'success');
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
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setSelectedCell(null);
    if (onNotify) onNotify(`Đã cập nhật quyền "${targetFeature}" cho vai trò ${role} thành ${newLevel}`, 'success');
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
    saveInternalStaffList(updatedList);

    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'ROLE_CHANGE',
      targetUserOrEntity: `${editingStaff.name} (${editingStaff.email})`,
      description: `Cập nhật phân vai trò thành ${staffFormRole}, phụ trách các brand: ${staffFormPicBrands.join(', ') || 'Chưa gán'}.`,
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setEditingStaff(null);
    if (onNotify) onNotify(`Đã cập nhật phân quyền và nhãn phụ trách cho ${editingStaff.name}!`, 'success');
  };

  // Đóng vai nhân sự nội bộ (Impersonate Internal Staff)
  const handleImpersonateInternal = (staff: InternalStaffRbacMember) => {
    const impersonatedProfile: UserProfile = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      roleTitle: `${staff.roleTitle} (Xem thử)`,
      avatar: staff.avatar,
      departmentScope: staff.departmentScope,
      departmentName: staff.department,
      managerName: staff.managerName,
      canLogin: staff.canLogin ?? true,
      loginProvider: 'LARK',
      linkedEntityName: staff.picBrands.join(', '),
      assignedBrands: staff.picBrands.includes('ALL_BRANDS')
        ? ['Tất cả nhãn hàng', 'ClubClio', 'Kutieskin', 'Fresh', 'Cocoon', 'Senka']
        : staff.picBrands
    };

    const newLog: RbacAuditLogItem = {
      id: `log-${++logCounterRef.current}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Đỗ Văn Giang',
      actorEmail: currentUser?.email || 'giangdv@upbase.vn',
      actorRole: currentUser?.role || 'ADMIN',
      actionType: 'IMPERSONATE',
      targetUserOrEntity: `${staff.name} (${staff.role})`,
      description: `Đóng vai nhân sự ${staff.name} để kiểm tra giao diện phân quyền.`,
      ipAddress: '118.70.182.44',
      deviceInfo: 'Chrome 128 / Windows',
      status: 'SUCCESS'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    if (onImpersonateUser) {
      onImpersonateUser(impersonatedProfile);
    } else if (onImpersonatePartner) {
      onImpersonatePartner(impersonatedProfile);
    }
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

  const simTargetStaff = useMemo(() => {
    return classifiedDirectory.find(s => s.id === simSelectedStaffId) || classifiedDirectory[0];
  }, [classifiedDirectory, simSelectedStaffId]);

  const editingDirStaffObj = useMemo(() => {
    if (!editingDirectoryStaffId) return null;
    return classifiedDirectory.find(s => s.id === editingDirectoryStaffId) || null;
  }, [classifiedDirectory, editingDirectoryStaffId]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Banner: Vai trò đang đăng nhập & Cơ chế Kiểm soát 3 Khối */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-accent-soft text-accent border border-line">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isAdmin
                  ? 'Quyền Admin: Kiểm soát cổng đăng nhập 1.011 nhân sự & 3 Khối (MKT B2C · Growth · Media)'
                  : isGrowthManager
                  ? 'Quyền Trưởng Phòng Growth: Quản lý đội ngũ & phân công nhân sự Khối Growth'
                  : isMediaManager
                  ? 'Quyền Trưởng Phòng Media: Quản lý đội ngũ & phân công nhân sự Khối Media'
                  : 'Quyền Giám Đốc Marketing B2C: Quản lý đội ngũ Booking, Content & Brand'}
              </span>
            </span>
            <span className="text-2xs text-ink-3">
              Đang mở cổng: <strong className="text-positive">{directoryStats.totalAllowed} nhân sự</strong> · Đang chặn: <strong className="text-critical">{directoryStats.totalBlocked} nhân sự ngoài phạm vi</strong>
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Không phải toàn bộ 1.011 nhân viên công ty đều đăng nhập được vào hệ thống. Chỉ nhân sự thuộc <strong>Marketing B2C</strong>, <strong>Growth</strong>, <strong>Media</strong> được Admin mở cổng mới có quyền truy cập và chịu sự quản lý của Trưởng phòng tương ứng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleResetMatrix}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-muted text-ink text-xs font-medium border border-line transition flex items-center gap-1.5"
            title="Khôi phục ma trận chuẩn"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted" />
            <span>Khôi phục mặc định</span>
          </button>
        </div>
      </div>

      <Tabs
        items={[
          { key: 'roles', label: '1. Quản trị Role & Màn hình', count: `${ALL_ROLE_DEFINITIONS.length} Role` },
          { key: 'gatekeeper', label: '2. Cổng truy cập & Phân khối (1.011 NV)', count: `${directoryStats.totalAllowed}/${directoryStats.totalStaff}` },
          { key: 'internal', label: '3. Gán Role nhân sự nội bộ', count: filteredStaff.length },
          { key: 'matrix', label: '4. Ma trận quyền chức năng', count: matrixItems.length },
          { key: 'third-party', label: '5. Tài khoản đối tác ngoài', count: 'Brand / KOC / CTV' },
          { key: 'audit', label: '6. Nhật ký bảo mật', count: auditLogs.length },
        ]}
        value={activeMainTab}
        onChange={(k) => setActiveMainTab(k as MainTab)}
      />

      {/* ========================================================================= */}
      {/* SUB-TAB ROLES: QUẢN TRỊ LỚP ROLE & PHÂN QUYỀN MÀN HÌNH (16 VAI TRÒ)        */}
      {/* ========================================================================= */}
      {activeMainTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-200">
          {/* Cột trái: Danh sách 16 Role hệ thống chia theo 4 nhóm */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Danh mục 16 Lớp Role Hệ Thống
                  </h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Chọn 1 Role để cấu hình các màn hình được phép truy cập và gán nhân sự
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {ALL_ROLE_DEFINITIONS.length} Role
                </span>
              </div>

              {[
                {
                  groupTitle: 'Khối Pháp chế · Kế toán · Ký số',
                  roleIds: ['LEGAL', 'FINANCE', 'SIGN_ADMIN'] as UserRole[],
                },
                {
                  groupTitle: 'Cấp Quản trị & Trưởng phòng (3 Khối)',
                  roleIds: ['ADMIN', 'MANAGER', 'GROWTH_MANAGER', 'MEDIA_MANAGER', 'LEADER'] as UserRole[],
                },
                {
                  groupTitle: 'Cấp Chuyên viên Thực thi',
                  roleIds: ['BOOKING_MEMBER', 'CONTENT_MEMBER', 'BRAND_MEMBER', 'GROWTH_MEMBER', 'MEDIA_MEMBER'] as UserRole[],
                },
                {
                  groupTitle: 'Tài khoản Đối tác ngoài (Portal)',
                  roleIds: ['BRAND_PARTNER', 'KOC_PARTNER', 'CTV_PARTNER'] as UserRole[],
                },
              ].map((group) => (
                <div key={group.groupTitle} className="space-y-1.5">
                  <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider px-1">
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
                          className={`w-full text-left p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/15 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-slate-900">
                                {rDef.name}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {rDef.id}
                              </span>
                            </div>
                            <p className="text-2xs text-slate-500 line-clamp-1">
                              {rDef.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              allowedCount <= 2
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {allowedCount}/{ALL_SYSTEM_SCREENS.length} màn
                            </span>
                            {rDef.scopeType === 'INTERNAL' && (
                              <span className="text-[10px] text-slate-400">
                                {staffCount} nhân sự
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedRoleDef.badgeColor}`}>
                      {selectedRoleDef.name}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      Mã Role: {selectedRoleDef.id}
                    </span>
                    <span className="text-2xs px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                      {selectedRoleDef.scopeType === 'INTERNAL' ? 'Nhân sự nội bộ (Lark SSO)' : 'Đối tác bên ngoài'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedRoleDef.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleResetSingleRoleScreens(selectedRoleKey)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                    title="Đặt lại danh sách màn hình mặc định cho Role này"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đặt lại mặc định Role</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sampleStaff = internalStaff.find((s) => s.role === selectedRoleKey);
                      if (sampleStaff) {
                        handleImpersonateInternal(sampleStaff);
                      } else {
                        const syntheticProfile: UserProfile = {
                          id: `role_preview_${selectedRoleKey.toLowerCase()}`,
                          name: `Tài khoản kiểm thử (${selectedRoleDef.name})`,
                          email: `${selectedRoleKey.toLowerCase()}@upbase.vn`,
                          role: selectedRoleKey,
                          roleTitle: `${selectedRoleDef.name} (Kiểm thử Role)`,
                          avatar: selectedRoleKey.slice(0, 2),
                          departmentScope: 'MARKETING_B2C',
                          canLogin: true,
                          loginProvider: 'SANDBOX',
                          assignedBrands: ['Kutieskin', 'ClubClio'],
                        };
                        onImpersonateUser?.(syntheticProfile);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Đóng vai kiểm thử Role này</span>
                  </button>
                </div>
              </div>

              {/* Cấu hình Màn hình mở mặc định & Thống kê số màn hình được phép */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider block">
                    Màn hình mở mặc định sau khi đăng nhập
                  </label>
                  <select
                    value={selectedRoleDefaultLanding}
                    onChange={(e) => handleChangeRoleDefaultLanding(selectedRoleKey, e.target.value as TabKey)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {ALL_SYSTEM_SCREENS.filter((s) => selectedRoleAllowedTabs.includes(s.key)).map((scr) => (
                      <option key={scr.key} value={scr.key}>
                        {scr.label} ({scr.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-between">
                  <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                    Phạm vi màn hình Sidebar đang cấp cho {selectedRoleDef.name}
                  </span>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-600">
                      Được phép truy cập: <strong className="text-blue-700">{selectedRoleAllowedTabs.length}</strong> / {ALL_SYSTEM_SCREENS.length} màn hình
                    </span>
                    <span className="text-2xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Áp dụng tức thì
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách 28 màn hình hệ thống chia theo 6 nhóm để bật/tắt cho Role */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      1. Phân quyền Màn hình được phép nhìn thấy & truy cập ({selectedRoleAllowedTabs.length}/{ALL_SYSTEM_SCREENS.length})
                    </h4>
                    <p className="text-2xs text-slate-500">
                      Tích chọn hoặc bỏ tích để cấp/thu hồi màn hình trên thanh menu trái (Sidebar) và khóa đường dẫn trực tiếp đối với vai trò <strong>{selectedRoleDef.name}</strong>.
                    </p>
                  </div>
                  <div className="relative w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roleSearchScreen}
                      onChange={(e) => setRoleSearchScreen(e.target.value)}
                      placeholder="Tìm tên màn hình..."
                      className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-slate-50/60 focus:outline-none focus:border-blue-500"
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
                      <div key={catName} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-800">{catName}</span>
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold">
                              {enabledInCatCount}/{catKeys.length} màn hình
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleRoleCategoryScreens(selectedRoleKey, catKeys, !allCatEnabled)}
                            className="text-2xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 transition"
                          >
                            {allCatEnabled ? 'Bỏ chọn nhóm này' : 'Bật toàn bộ nhóm này'}
                          </button>
                        </div>

                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                          {screensInCat.map((scr) => {
                            const isAllowed = selectedRoleAllowedTabs.includes(scr.key);
                            const isDefaultLanding = selectedRoleDefaultLanding === scr.key;

                            return (
                              <label
                                key={scr.key}
                                className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                                  isAllowed
                                    ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                                    : 'bg-white border-slate-200 opacity-70 hover:opacity-100 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={() => handleToggleRoleScreen(selectedRoleKey, scr.key)}
                                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-0 shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className={`text-xs font-semibold leading-snug ${isAllowed ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {scr.label}
                                    </span>
                                    {isDefaultLanding && isAllowed && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                        Mặc định
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-2xs text-slate-500 leading-relaxed">
                                    {scr.description}
                                  </p>
                                  <span className="font-mono text-[10px] text-slate-400 block">
                                    tab: {scr.key}
                                  </span>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>
                      2. Nhân sự được gán vào Role &ldquo;{selectedRoleDef.name}&rdquo; ({internalStaff.filter((s) => s.role === selectedRoleKey).length} nhân sự)
                    </span>
                  </h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Gán nhân sự nội bộ vào lớp Role này để nhân sự kế thừa đúng danh sách {selectedRoleAllowedTabs.length} màn hình bên trên.
                  </p>
                </div>

                {/* Gán nhanh nhân sự vào Role đang chọn */}
                <div className="flex items-center gap-2">
                  <select
                    value={assignStaffToRoleId}
                    onChange={(e) => setAssignStaffToRoleId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">+ Chọn nhân sự để gán vào Role này...</option>
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
                    className="px-3 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition shrink-0"
                  >
                    Gán vào Role
                  </button>
                </div>
              </div>

              {internalStaff.filter((s) => s.role === selectedRoleKey).length === 0 ? (
                <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  Hiện chưa có nhân sự nội bộ nào được gán vào Role <strong>{selectedRoleDef.name}</strong>. Chọn nhân sự ở ô phía trên để gán ngay.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {internalStaff
                    .filter((s) => s.role === selectedRoleKey)
                    .map((staff) => (
                      <div key={staff.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0">
                            {staff.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900">{staff.name}</span>
                              <span className="text-2xs text-slate-500">({staff.email})</span>
                            </div>
                            <span className="text-2xs text-slate-500 block">
                              {staff.department} · {staff.position}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleImpersonateInternal(staff)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold transition flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Đóng vai</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-semibold transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Đổi Role / Nhãn</span>
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
          {/* 4 Cards: 3 Khối Được Vào Hệ Thống + 1 Khối Phòng Ban Khác Bị Chặn */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Card 1: Marketing B2C */}
            <div
              onClick={() => { setDirScopeFilter('MARKETING_B2C'); setDirPage(1); }}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                dirScopeFilter === 'MARKETING_B2C'
                  ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  1. Khối Marketing B2C
                </span>
                <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Được phép Login
                </span>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {directoryStats.mktAllowed} <span className="text-xs font-normal text-slate-500">/ {directoryStats.mktTotal} nhân sự</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-2xs text-slate-600 space-y-0.5">
                <div>Trưởng phòng: <strong className="text-slate-900">Đặng Thị Yến Nhi</strong></div>
                <div>Trưởng nhóm: <strong className="text-slate-800">Nguyễn Thị Ngọc Tâm</strong></div>
                <div className="text-slate-400">Team: Booking, Sub-Booking, Content, Brand</div>
              </div>
            </div>

            {/* Card 2: Khối Growth */}
            <div
              onClick={() => { setDirScopeFilter('GROWTH'); setDirPage(1); }}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                dirScopeFilter === 'GROWTH'
                  ? 'bg-emerald-50/70 border-emerald-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  2. Khối Growth Ecom
                </span>
                <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Được phép Login
                </span>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {directoryStats.growthAllowed} <span className="text-xs font-normal text-slate-500">/ {directoryStats.growthTotal} nhân sự</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-2xs text-slate-600 space-y-0.5">
                <div>Trưởng phòng: <strong className="text-slate-900">Trần Thị Đỗ Quyên</strong></div>
                <div>Lead cụm: <strong className="text-slate-800">Hoài Linh (HCM), Phạm Nhung</strong></div>
                <div className="text-slate-400">Team: Growth 1, Growth 2, Growth 3, Growth 6, HCM</div>
              </div>
            </div>

            {/* Card 3: Khối Media */}
            <div
              onClick={() => { setDirScopeFilter('MEDIA'); setDirPage(1); }}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                dirScopeFilter === 'MEDIA'
                  ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  3. Khối Media & Ads
                </span>
                <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Được phép Login
                </span>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {directoryStats.mediaAllowed} <span className="text-xs font-normal text-slate-500">/ {directoryStats.mediaTotal} nhân sự</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-2xs text-slate-600 space-y-0.5">
                <div>Trưởng phòng: <strong className="text-slate-900">Nguyễn Đức Quảng</strong></div>
                <div>Lead TikTok: <strong className="text-slate-800">Nguyễn Đình Long</strong></div>
                <div className="text-slate-400">Team: Media Omni, Media TikTok</div>
              </div>
            </div>

            {/* Card 4: Các Phòng Ban Khác (Bị Chặn Mặc Định) */}
            <div
              onClick={() => { if (isAdmin) { setDirScopeFilter('OTHER_BLOCKED'); setDirPage(1); } }}
              className={`p-4 rounded-xl border transition ${
                isAdmin ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'
              } ${
                dirScopeFilter === 'OTHER_BLOCKED'
                  ? 'bg-red-50/70 border-red-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  4. Phòng Ban Khác (Ngoài B2C)
                </span>
                <span className="text-2xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Chặn Login
                </span>
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {directoryStats.otherTotal - directoryStats.otherAllowed} <span className="text-xs font-normal text-slate-500">bị chặn / {directoryStats.otherTotal} NV</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-2xs text-slate-600 space-y-0.5">
                <div>Ngoại lệ Admin cấp: <strong className="text-emerald-700">{directoryStats.otherAllowed} người</strong></div>
                <div>Trạng thái cổng: <strong className="text-red-600">Từ chối đăng nhập (403)</strong></div>
                <div className="text-slate-400">Fulfillment, Livestream, Kế toán, HCNS, Tech...</div>
              </div>
            </div>
          </div>

          {/* Bảng Quy Tắc Cấp Quyền Tự Động Theo Phòng Ban (Admin Gatekeeper Rules) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-semibold text-slate-900">
                    Quy Tắc Mở Cổng Đăng Nhập Theo Phòng Ban (Admin Department Rules)
                  </h3>
                </div>
                <span className="text-2xs text-slate-500">
                  Admin xác định cụm phòng ban nào được tự động vào hệ thống và gán về Trưởng phòng quản lý
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-2xs text-slate-500 bg-slate-50/50 font-semibold">
                      <th className="py-2.5 px-4">Cụm Phòng Ban / Team (Đồng bộ từ HR Lark)</th>
                      <th className="py-2.5 px-3">Khối Hệ Thống</th>
                      <th className="py-2.5 px-3">Trưởng Phòng Quản Lý Trực Tiếp</th>
                      <th className="py-2.5 px-3">Role Mặc Định Khi Vào</th>
                      <th className="py-2.5 px-3 text-center">Quân Số</th>
                      <th className="py-2.5 px-4 text-center">Cổng Đăng Nhập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptRules.map(rule => {
                      const scopeMeta = SCOPE_LABELS[rule.mappedScope];
                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-slate-900">{rule.departmentOrTeamName}</div>
                            <div className="text-2xs text-slate-500">{rule.description}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}>
                              {scopeMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 text-2xs">
                            {rule.defaultManagerName}
                          </td>
                          <td className="py-2.5 px-3 text-2xs text-slate-600 font-mono">
                            {rule.autoAllowLogin ? ROLE_DISPLAY_NAME[rule.defaultRole] : 'Không cấp Role'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                            {rule.staffCount} NV
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDeptRule(rule.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-2xs font-semibold border transition cursor-pointer ${
                                rule.autoAllowLogin
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
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

          {/* Thanh Mô Phỏng Kiểm Tra Cổng Đăng Nhập (Login Gatekeeper Simulator) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="text-xs font-semibold flex items-center gap-2 text-amber-300">
                <ShieldAlert className="w-4 h-4" />
                <span>Kiểm Tra Thử Cổng Đăng Nhập Nhân Sự (Login Gatekeeper Test)</span>
              </div>
              <p className="text-2xs text-slate-300">
                Chọn bất kỳ nhân viên nào trong danh bạ 1.011 người để kiểm tra xem khi họ bấm đăng nhập Lark SSO, hệ thống sẽ cho vào hay chặn lại.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
              <select
                value={simSelectedStaffId}
                onChange={(e) => setSimSelectedStaffId(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-blue-400 max-w-xs w-full"
              >
                <optgroup label="Nhân sự thuộc Phòng ban bị chặn (Test Chặn Login)">
                  <option value="HN782">HN782 - Dương Quỳnh Anh (Team Livestream - CTV)</option>
                  <option value="HN223">HN223 - Nhân sự Fulfillment / Kho vận</option>
                  {classifiedDirectory.filter(s => !s.canLogin).slice(0, 6).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode || s.id} - {s.name} ({s.department || s.team || 'Phòng khác'})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Nhân sự thuộc 3 Khối MKT B2C / Growth / Media (Test Cho Phép)">
                  {classifiedDirectory.filter(s => s.canLogin).slice(0, 10).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode || s.id} - {s.name} ({SCOPE_LABELS[s.classifiedScope].label})
                    </option>
                  ))}
                </optgroup>
              </select>

              {simTargetStaff && (
                <div className={`px-3.5 py-2 rounded-lg border text-2xs flex items-center gap-2.5 ${
                  simTargetStaff.canLogin
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/90 border-red-500/50 text-red-200'
                }`}>
                  {simTargetStaff.canLogin ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {simTargetStaff.canLogin
                        ? `CHO PHÉP ĐĂNG NHẬP → ${ROLE_DISPLAY_NAME[simTargetStaff.mappedRole]}`
                        : `CHẶN ĐĂNG NHẬP (403 ACCESS DENIED)`}
                    </div>
                    <div className="opacity-80">
                      {simTargetStaff.accessReason} · Quản lý: <strong>{simTargetStaff.managerName}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bộ Lọc Danh Bạ 1.011 Nhân Sự & Quản Lý Theo Trưởng Phòng */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>
                    {isGrowthManager
                      ? `Danh Sách Nhân Viên Khối Growth Của Bạn (${filteredDirectory.length} nhân sự)`
                      : isMediaManager
                      ? `Danh Sách Nhân Viên Khối Media Của Bạn (${filteredDirectory.length} nhân sự)`
                      : isB2cManager
                      ? `Danh Sách Nhân Viên Khối Marketing B2C (${filteredDirectory.length} nhân sự)`
                      : `Danh Bạ Nhân Sự Toàn Công Ty & Phân Quyền Đăng Nhập (${filteredDirectory.length} / ${directoryStats.totalStaff} nhân sự)`}
                  </span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  {isAdmin
                    ? 'Admin có thể bật/tắt quyền đăng nhập cho từng cá nhân, chuyển khối (Marketing / Growth / Media) hoặc bổ nhiệm Trưởng phòng.'
                    : 'Trưởng phòng quản lý trực tiếp danh sách nhân viên trong khối của mình và có thể đóng vai kiểm tra công việc.'}
                </p>
              </div>

              {isAdmin && Object.keys(staffOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffOverrides({});
                    saveStaffAccessOverrides({});
                    onNotify?.('Đã xóa các thiết lập ngoại lệ cá nhân, quay về quy tắc phòng ban chuẩn.', 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-2xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Đặt lại {Object.keys(staffOverrides).length} ngoại lệ cá nhân
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên, mã NV (HN222), email, phòng ban..."
                  value={dirSearch}
                  onChange={(e) => { setDirSearch(e.target.value); setDirPage(1); }}
                  className="w-full pl-8.5 pr-3 h-9 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              {isAdmin && (
                <select
                  value={dirScopeFilter}
                  onChange={(e) => { setDirScopeFilter(e.target.value); setDirPage(1); }}
                  className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium"
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
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium"
              >
                <option value="ALL">Mọi trạng thái Login</option>
                <option value="ALLOWED">Được phép Login ({directoryStats.totalAllowed})</option>
                <option value="BLOCKED">Bị chặn Login ({directoryStats.totalBlocked})</option>
                <option value="OVERRIDDEN">Admin phân quyền đích danh ({Object.keys(staffOverrides).length})</option>
              </select>

              <select
                value={dirDeptFilter}
                onChange={(e) => { setDirDeptFilter(e.target.value); setDirPage(1); }}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium max-w-[200px]"
              >
                <option value="ALL">Mọi Team / Phòng ban ({directoryDepartments.length})</option>
                {directoryDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Bảng Danh Bạ 1.011 Nhân Sự */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-2xs font-semibold text-slate-600">
                      <th className="py-2.5 px-3 w-[90px]">Mã NV</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nhân Viên & Email</th>
                      <th className="py-2.5 px-3">Phòng Ban / Team Gốc</th>
                      <th className="py-2.5 px-3">Khối Hệ Thống</th>
                      <th className="py-2.5 px-3">Vai Trò & Trưởng Phòng Quản Lý</th>
                      <th className="py-2.5 px-3 text-center">Quyền Đăng Nhập</th>
                      <th className="py-2.5 px-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedDirectory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Không tìm thấy nhân viên nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      pagedDirectory.map(staff => {
                        const scopeMeta = SCOPE_LABELS[staff.classifiedScope];
                        return (
                          <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-2xs">
                                {staff.staffCode || staff.id}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{staff.name}</div>
                              <div className="text-2xs text-slate-500 font-mono">{staff.email}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800">{staff.department || staff.team || 'Chưa phân phòng'}</div>
                              <div className="text-2xs text-slate-500">
                                {staff.position || staff.roleTitle} · {staff.location || 'HN'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-2xs font-semibold border ${scopeMeta.badgeClass}`}>
                                {scopeMeta.label}
                              </span>
                              {staff.accessSource === 'ADMIN_EXPLICIT' && (
                                <span className="block text-2xs text-blue-600 font-semibold mt-0.5">
                                  Admin cấp đích danh
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {staff.canLogin ? (
                                <>
                                  <span className="font-semibold text-slate-900 block">
                                    {ROLE_DISPLAY_NAME[staff.mappedRole]}
                                  </span>
                                  <span className="text-2xs text-slate-500">
                                    Quản lý: <strong className="text-slate-700">{staff.managerName}</strong>
                                  </span>
                                </>
                              ) : (
                                <span className="text-2xs text-slate-400 italic">
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
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                {staff.canLogin ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Được vào</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3 text-red-500" />
                                    <span>Chặn Login</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {staff.canLogin && (
                                  <button
                                    type="button"
                                    onClick={() => handleImpersonateDirectoryStaff(staff)}
                                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold flex items-center gap-1"
                                    title="Đóng vai nhân viên này để kiểm tra giao diện"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Đóng vai</span>
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditDirectoryStaff(staff)}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
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
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-600">
                <div>
                  Hiển thị <strong>{Math.min(filteredDirectory.length, (dirPage - 1) * DIR_PAGE_SIZE + 1)} - {Math.min(filteredDirectory.length, dirPage * DIR_PAGE_SIZE)}</strong> / <strong>{filteredDirectory.length}</strong> nhân sự
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={dirPage <= 1}
                    onClick={() => setDirPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono font-semibold">
                    Trang {dirPage} / {totalDirPages}
                  </span>
                  <button
                    type="button"
                    disabled={dirPage >= totalDirPages}
                    onClick={() => setDirPage(p => Math.min(totalDirPages, p + 1))}
                    className="p-1 rounded border border-slate-200 bg-white disabled:opacity-40"
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
            <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      Cấu Hình Cổng Đăng Nhập & Phân Khối Nhân Sự
                    </h3>
                    <p className="text-2xs text-slate-500">
                      {editingDirStaffObj.name} ({editingDirStaffObj.staffCode} · Phòng gốc: {editingDirStaffObj.department || editingDirStaffObj.team || 'Khác'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDirectoryStaffId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveDirectoryStaff} className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">Cho phép đăng nhập hệ thống B2C</div>
                      <div className="text-2xs text-slate-500">Nếu tắt, nhân viên này sẽ bị chặn ở màn hình Login.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dirEditCanLogin}
                      onChange={(e) => setDirEditCanLogin(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  {dirEditCanLogin && (
                    <>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700 block">
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
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
                        >
                          <option value="MARKETING_B2C">Khối Marketing B2C (Booking / Content / Brand)</option>
                          <option value="GROWTH">Khối Growth Ecom (Growth 1 - 6 & HCM)</option>
                          <option value="MEDIA">Khối Media & Ads (Media Omni & TikTok)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700 block">
                          2. Vai trò (Role) trong hệ thống *
                        </label>
                        <select
                          value={dirEditRole}
                          onChange={(e) => setDirEditRole(e.target.value as UserRole)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold"
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
                        <label className="font-semibold text-slate-700 block">
                          3. Trưởng phòng / Quản lý trực tiếp
                        </label>
                        <input
                          type="text"
                          value={dirEditManager}
                          onChange={(e) => setDirEditManager(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
                          placeholder="Tên Trưởng phòng quản lý..."
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingDirectoryStaffId(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tính năng, quyền hạn..."
                  value={searchMatrix}
                  onChange={(e) => setSearchMatrix(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
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
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Hiển thị cả 9 Vai trò (Grid Matrix)</option>
                {RBAC_ROLE_DEFINITIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Badge Legend */}
            <div className="flex items-center gap-2 text-2xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700">Chú giải:</span>
              <span className="inline-flex items-center text-emerald-700 font-semibold">ALL</span>
              <span className="inline-flex items-center text-blue-700 font-semibold">SCOPED</span>
              <span className="inline-flex items-center text-amber-700 font-semibold">VIEW</span>
              <span className="inline-flex items-center text-blue-700 font-semibold">APPROVE</span>
              <span className="inline-flex items-center text-slate-400 font-medium">DENIED</span>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-semibold">
                    <th className="py-3 px-4 w-[280px]">Tính Năng & Nghiệp Vụ</th>
                    {matrixRolesToRender.map(role => (
                      <th key={role.id} className="py-3 px-3 text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold border ${role.badgeColor}`}>
                            {role.name.split(' (')[0]}
                          </span>
                          <span className="text-2xs text-slate-400 font-normal">
                            {role.scopeType === 'INTERNAL' ? 'Nội bộ' : 'Gmail'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMatrix.map((item, idx) => {
                    const isNewCategory = idx === 0 || filteredMatrix[idx - 1].category !== item.category;

                    return (
                      <React.Fragment key={item.id}>
                        {isNewCategory && (
                          <tr className="bg-blue-50/40 border-y border-blue-100/80">
                            <td
                              colSpan={matrixRolesToRender.length + 1}
                              className="py-2 px-4 text-xs font-semibold text-blue-900 flex items-center gap-2"
                            >
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              <span>{item.categoryTitle}</span>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/70 transition">
                          {/* Feature Column */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-900 block leading-snug">
                                {item.featureName}
                              </span>
                              <span className="text-2xs text-slate-500 block leading-relaxed">
                                {item.description}
                              </span>
                              {item.securityNote && (
                                <div className="inline-flex items-center gap-1 text-2xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
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
            <div className="p-4 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between text-2xs text-slate-500 gap-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Ma trận đang kiểm soát <strong>{matrixItems.length} quyền hạn</strong> trên <strong>9 vai trò</strong> (bao gồm Trưởng phòng Growth & Trưởng phòng Media).
                </span>
              </div>
              <span className="text-slate-400">
                Chính sách áp dụng theo thời gian thực
              </span>
            </div>
          </div>

          {/* Quick Edit Permission Modal Popup */}
          <Presence show={!!selectedCell}>
          {selectedCell && (
            <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">Thiết Lập Cấp Độ Quyền</h3>
                      <span className="text-2xs text-slate-500">
                        Vai trò: <strong className="text-blue-700">{selectedCell.role}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCell(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900">
                  <span className="font-semibold block mb-0.5">Tính năng:</span>
                  <span>{matrixItems.find(i => i.id === selectedCell.itemId)?.featureName}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-2xs font-semibold text-slate-700 block">
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
                            ? `${cfg.bg} ${cfg.border} ring-2 ring-blue-500/20 shadow-xs`
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-xs block ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-2xs text-slate-500 block">{cfg.description}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm nhân sự, email, nhãn phụ trách..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
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

            <div className="text-2xs text-slate-500">
              Đồng bộ tự động từ <strong>Lark Base Nhân sự</strong>
            </div>
          </div>

          {/* Internal Staff Grid Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-2xs font-semibold ">
                    <th className="py-3 px-4">Nhân Sự & Email Lark</th>
                    <th className="py-3 px-4">Vai Trò Hệ Thống</th>
                    <th className="py-3 px-4">Phòng Ban & Vị Trí</th>
                    <th className="py-3 px-4">Cụm Nhãn Phụ Trách (PIC)</th>
                    <th className="py-3 px-4">Quyền Phê Duyệt Đặc Thù</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {staff.avatar}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">{staff.name}</span>
                            <span className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{staff.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${
                          staff.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                          staff.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          staff.role === 'GROWTH_MANAGER' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          staff.role === 'MEDIA_MANAGER' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                          staff.role === 'LEADER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          staff.role === 'LEGAL' || staff.role === 'FINANCE' || staff.role === 'SIGN_ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {ROLE_DISPLAY_NAME[staff.role] || staff.role}
                        </span>
                        <span className="text-2xs text-slate-500 block mt-1">{staff.roleTitle}</span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 block">{staff.department}</span>
                        <span className="text-2xs text-slate-500">{staff.position}</span>
                      </td>

                      {/* PIC Brands */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.picBrands.includes('ALL_BRANDS') ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold">
                              Tất cả nhãn hàng
                            </span>
                          ) : staff.picBrands.length > 0 ? (
                            staff.picBrands.map((b, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-2xs font-medium">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-2xs text-slate-400 italic">Chưa gán nhãn</span>
                          )}
                        </div>
                      </td>

                      {/* Special Permissions Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-2xs">
                          {staff.permissions.canApproveBudget && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold" title="Duyệt ngân sách">
                              Duyệt Ngân Sách
                            </span>
                          )}
                          {staff.permissions.canApproveP3 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold" title="Duyệt thưởng 4P">
                              Duyệt P3
                            </span>
                          )}
                          {staff.permissions.canApprovePayment && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Duyệt thanh toán">
                              Duyệt Chi
                            </span>
                          )}
                          {staff.permissions.canExportRawData && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Xuất dữ liệu">
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
                            onClick={() => handleImpersonateInternal(staff)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-2xs font-semibold transition flex items-center gap-1 shadow-2xs"
                            title="Xem trước giao diện nhân sự này"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Đóng vai</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            title="Chỉnh sửa phân vai & quyền"
                          >
                            <Edit3 className="w-4 h-4 text-slate-500" />
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
            <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
              <div data-motion-panel className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">Phân Vai Trò & Phụ Trách Nhãn</h3>
                      <span className="text-2xs text-slate-500">{editingStaff.name} ({editingStaff.email})</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
                  {/* Role select */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Vai trò hệ thống *</label>
                    <select
                      value={staffFormRole}
                      onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold focus:outline-none focus:border-blue-500"
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
                    <label className="font-semibold text-slate-700">Nhãn hàng phụ trách (PIC Brands):</label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {brands.map(b => {
                        const isChecked = staffFormPicBrands.includes(b.name);
                        return (
                          <label
                            key={b.id}
                            className={`px-2.5 py-1 rounded-lg border text-2xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                              isChecked ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold' : 'bg-white text-slate-600 border-slate-200'
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
                              className="rounded text-blue-600 focus:ring-0"
                            />
                            <span>{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Permission Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Quyền phê duyệt đặc thù:</label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveBudget}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveBudget: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>Duyệt Ngân Sách Tháng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveP3}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveP3: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>Đánh giá & Duyệt P3</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApprovePayment}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApprovePayment: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>Duyệt Chi Thanh Toán</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canExportRawData}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canExportRawData: e.target.checked }))}
                          className="rounded text-blue-600"
                        />
                        <span>Xuất File Báo Cáo Excel</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingStaff(null)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-md shadow-blue-600/30"
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo người thực hiện, đối tượng, IP..."
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-blue-500"
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

            <div className="text-2xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Ghi nhận bất biến (Immutable Security Log)</span>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-2xs font-semibold ">
                    <th className="py-3 px-4 w-[170px]">Thời Gian</th>
                    <th className="py-3 px-4 w-[200px]">Người Thực Hiện (Actor)</th>
                    <th className="py-3 px-4 w-[160px]">Loại Hành Động</th>
                    <th className="py-3 px-4 w-[220px]">Đối Tượng Tác Động</th>
                    <th className="py-3 px-4">Chi Tiết Sự Kiện</th>
                    <th className="py-3 px-4 w-[160px]">IP & Thiết Bị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-sans">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-2xs text-slate-500 font-mono">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block leading-tight">{log.actorName}</span>
                        <span className="text-2xs text-blue-700 font-semibold">{log.actorRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold border ${
                          log.actionType === 'LOGIN_BLOCKED' || log.actionType === 'ACCESS_REVOKE' ? 'bg-red-50 text-red-700 border-red-200' :
                          log.actionType === 'ACCESS_GRANT' || log.actionType === 'INVITE_PARTNER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          log.actionType === 'IMPERSONATE' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-blue-50 text-blue-800 border-blue-200'
                        }`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-2xs">{log.targetUserOrEntity}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-2xs leading-relaxed">
                        {log.description}
                      </td>
                      <td className="py-3 px-4 text-2xs text-slate-400 font-mono">
                        <div>{log.ipAddress}</div>
                        <div className="text-slate-500 truncate max-w-[140px]">{log.deviceInfo}</div>
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
          resetAllRoleScreenPermissions();
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
