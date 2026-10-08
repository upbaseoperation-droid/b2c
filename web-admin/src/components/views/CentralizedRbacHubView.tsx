'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Users,
  Building,
  Video,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Mail,
  UserCheck,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  X,
  Store,
  Check,
  Layers,
  BarChart3,
  FileCheck,
  Coins,
  Database,
  RefreshCw,
  Download,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import {
  UserProfile,
  UserRole,
  BrandDetail,
  KocItem,
  PermissionAccessLevel,
  PermissionMatrixItem,
  InternalStaffRbacMember,
  RbacAuditLogItem
} from '../../lib/types';
import {
  RBAC_ROLE_DEFINITIONS,
  INITIAL_PERMISSION_MATRIX,
  INITIAL_INTERNAL_STAFF_RBAC,
  INITIAL_RBAC_AUDIT_LOGS,
  PERMISSION_BADGE_CONFIG,
  RoleDefinition
} from '../../lib/rbacData';
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

type MainTab = 'matrix' | 'internal' | 'third-party' | 'audit';

export const CentralizedRbacHubView: React.FC<CentralizedRbacHubViewProps> = ({
  currentUser,
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onImpersonateUser,
  onImpersonatePartner
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('matrix');

  // --- STATE TAB 1: MA TRẬN PHÂN QUYỀN ---
  const [matrixItems, setMatrixItems] = useState<PermissionMatrixItem[]>(INITIAL_PERMISSION_MATRIX);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchMatrix, setSearchMatrix] = useState<string>('');
  const [roleColumnFilter, setRoleColumnFilter] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; role: string; currentLevel: PermissionAccessLevel } | null>(null);

  // --- STATE TAB 2: NHÂN SỰ NỘI BỘ ---
  const [internalStaff, setInternalStaff] = useState<InternalStaffRbacMember[]>(INITIAL_INTERNAL_STAFF_RBAC);
  const [searchStaff, setSearchStaff] = useState<string>('');
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

  // Lọc Ma trận phân quyền
  const filteredMatrix = useMemo(() => {
    return matrixItems.filter(item => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchMatrix.trim()) {
        const q = searchMatrix.toLowerCase();
        const matchName = item.featureName.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchCat = item.categoryTitle.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [matrixItems, categoryFilter, searchMatrix]);

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
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Vân Ngọc',
      actorEmail: currentUser?.email || 'vanngoc@upbase.vn',
      actorRole: currentUser?.role || 'MANAGER',
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
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ Ma trận phân quyền về cấu hình mặc định chuẩn UpBase B2C?')) {
      setMatrixItems(INITIAL_PERMISSION_MATRIX);
      if (onNotify) onNotify('Đã khôi phục Ma trận phân quyền chuẩn UpBase B2C thành công!', 'info');
    }
  };

  // Áp dụng Template Ma trận
  const handleApplyTemplate = (type: 'STRICT' | 'AGILE' | 'DEFAULT') => {
    if (type === 'DEFAULT') {
      setMatrixItems(INITIAL_PERMISSION_MATRIX);
      if (onNotify) onNotify('Đã áp dụng Template "Chuẩn Vận Hành UpBase B2C"!', 'success');
      return;
    }

    if (type === 'STRICT') {
      setMatrixItems(prev => prev.map(item => {
        const copy = { ...item.permissions };
        // Siết chặt: Member chuyển sang VIEW thay vì SCOPED ở một số mục tài chính
        if (item.category === 'CONTRACTS_FINANCE' && copy.MEMBER === 'SCOPED') {
          copy.MEMBER = 'VIEW';
        }
        return { ...item, permissions: copy };
      }));
      if (onNotify) onNotify('Đã áp dụng Template "Bảo Mật Nghiêm Ngặt (Strict Least-Privilege)"!', 'success');
    } else if (type === 'AGILE') {
      setMatrixItems(prev => prev.map(item => {
        const copy = { ...item.permissions };
        // Linh hoạt: Leader được duyệt chi tiền nhỏ
        if (item.id === 'payment_approval_disbursement') {
          copy.LEADER = 'APPROVE';
        }
        return { ...item, permissions: copy };
      }));
      if (onNotify) onNotify('Đã áp dụng Template "Vận Hành Tốc Độ (Agile High-Velocity)"!', 'success');
    }
  };

  // Lọc Nhân sự nội bộ
  const filteredStaff = useMemo(() => {
    return internalStaff.filter(staff => {
      if (staffRoleFilter !== 'ALL' && staff.role !== staffRoleFilter) return false;
      if (searchStaff.trim()) {
        const q = searchStaff.toLowerCase();
        return (
          staff.name.toLowerCase().includes(q) ||
          staff.email.toLowerCase().includes(q) ||
          staff.position.toLowerCase().includes(q) ||
          staff.picBrands.some(b => b.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [internalStaff, staffRoleFilter, searchStaff]);

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

    setInternalStaff(prev => prev.map(s => {
      if (s.id === editingStaff.id) {
        return {
          ...s,
          role: staffFormRole,
          roleTitle: staffFormRoleTitle || s.roleTitle,
          picBrands: staffFormPicBrands,
          permissions: { ...staffFormPerms }
        };
      }
      return s;
    }));

    const newLog: RbacAuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Vân Ngọc',
      actorEmail: currentUser?.email || 'vanngoc@upbase.vn',
      actorRole: currentUser?.role || 'MANAGER',
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
      loginProvider: 'LARK',
      linkedEntityName: staff.picBrands.join(', ')
    };

    const newLog: RbacAuditLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().substring(0, 19).replace('T', ' '),
      actorName: currentUser?.name || 'Vân Ngọc',
      actorEmail: currentUser?.email || 'vanngoc@upbase.vn',
      actorRole: currentUser?.role || 'MANAGER',
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
      if (searchAudit.trim()) {
        const q = searchAudit.toLowerCase();
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.targetUserOrEntity.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.ipAddress.includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditFilterType, searchAudit]);

  // Các vai trò hiển thị trên cột ma trận
  const matrixRolesToRender = useMemo(() => {
    if (roleColumnFilter === 'ALL') return RBAC_ROLE_DEFINITIONS;
    return RBAC_ROLE_DEFINITIONS.filter(r => r.id === roleColumnFilter);
  }, [roleColumnFilter]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-purple-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              <span>Trung Tâm Quản Lý Phân Quyền Tập Trung (Centralized RBAC Hub)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              Ma Trận & Phân Quyền Vận Hành B2C
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              Thiết lập chính sách bảo mật đa tầng từ Ban Giám Đốc, Trưởng phòng, Trưởng nhóm tới Chuyên viên và các Bên thứ 3 (Brand, KOC, CTV).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleResetMatrix}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition flex items-center gap-2 shadow-xs"
              title="Khôi phục ma trận chuẩn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>
            <div className="relative group">
              <button
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-purple-900/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mẫu Phân Quyền</span>
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 hidden group-hover:block z-50 animate-in fade-in">
                <button
                  onClick={() => handleApplyTemplate('DEFAULT')}
                  className="w-full text-left px-3.5 py-2 hover:bg-purple-50 text-xs text-slate-800 flex flex-col"
                >
                  <span className="font-bold text-purple-900">1. Chuẩn Vận Hành UpBase (Khuyên dùng)</span>
                  <span className="text-3xs text-slate-500">Cân bằng giữa bảo mật và tốc độ chốt deal</span>
                </button>
                <button
                  onClick={() => handleApplyTemplate('STRICT')}
                  className="w-full text-left px-3.5 py-2 hover:bg-purple-50 text-xs text-slate-800 flex flex-col"
                >
                  <span className="font-bold text-slate-900">2. Bảo Mật Nghiêm Ngặt</span>
                  <span className="text-3xs text-slate-500">Giới hạn xem biên lợi nhuận, duyệt 2 lớp bắt buộc</span>
                </button>
                <button
                  onClick={() => handleApplyTemplate('AGILE')}
                  className="w-full text-left px-3.5 py-2 hover:bg-purple-50 text-xs text-slate-800 flex flex-col"
                >
                  <span className="font-bold text-slate-900">3. Vận Hành Tốc Độ (Agile)</span>
                  <span className="text-3xs text-slate-500">Trao quyền duyệt chi nhanh cho Trưởng nhóm</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Navigation Subtabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-purple-800/50 pt-4">
          <button
            onClick={() => setActiveMainTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeMainTab === 'matrix'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/15'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>1. Ma Trận Phân Quyền (Role Matrix)</span>
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono bg-purple-100 text-purple-900">
              {matrixItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('internal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeMainTab === 'internal'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/15'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>2. Nhân Sự Nội Bộ (Lark SSO)</span>
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono bg-blue-100 text-blue-900">
              {internalStaff.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('third-party')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeMainTab === 'third-party'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/15'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-600" />
            <span>3. Đối Tác Bên Thứ 3 (Gmail SSO)</span>
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono bg-emerald-100 text-emerald-900">
              Brand / KOC / CTV
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeMainTab === 'audit'
                ? 'bg-white text-purple-950 shadow-md'
                : 'bg-white/10 text-purple-200 hover:bg-white/15'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>4. Kiểm Toán & Nhật Ký Phiên (Audit Logs)</span>
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-mono bg-amber-100 text-amber-900">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MA TRẬN PHÂN QUYỀN (INTERACTIVE RBAC MATRIX)                   */}
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
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 bg-slate-50/50"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
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
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Hiển thị cả 7 Vai trò (Grid Matrix)</option>
                {RBAC_ROLE_DEFINITIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Badge Legend */}
            <div className="flex items-center gap-2 text-2xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-700">Chú giải:</span>
              <span className="inline-flex items-center text-emerald-700 font-bold">🟢 ALL</span>
              <span className="inline-flex items-center text-blue-700 font-bold">🔵 SCOPED</span>
              <span className="inline-flex items-center text-amber-700 font-bold">🟡 VIEW</span>
              <span className="inline-flex items-center text-purple-700 font-bold">🟣 APPROVE</span>
              <span className="inline-flex items-center text-slate-400 font-medium">⛔ DENIED</span>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-xs font-bold">
                    <th className="py-3 px-4 w-[280px]">Tính Năng & Nghiệp Vụ</th>
                    {matrixRolesToRender.map(role => (
                      <th key={role.id} className="py-3 px-3 text-center min-w-[110px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-3xs font-bold border ${role.badgeColor}`}>
                            {role.name.split(' (')[0]}
                          </span>
                          <span className="text-3xs text-slate-400 font-normal">
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
                          <tr className="bg-purple-50/40 border-y border-purple-100/80">
                            <td
                              colSpan={matrixRolesToRender.length + 1}
                              className="py-2 px-4 text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2"
                            >
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              <span>{item.categoryTitle}</span>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/70 transition">
                          {/* Feature Column */}
                          <td className="py-3 px-4 align-top">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 block leading-snug">
                                {item.featureName}
                              </span>
                              <span className="text-3xs text-slate-500 block leading-relaxed">
                                {item.description}
                              </span>
                              {item.securityNote && (
                                <div className="inline-flex items-center gap-1 text-3xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
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
                                  className={`w-full py-1.5 px-1.5 rounded-lg border text-2xs transition flex items-center justify-center gap-1 shadow-2xs hover:scale-105 ${badge.bg} ${badge.border} ${badge.text}`}
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
                  Ma trận đang kiểm soát <strong>{matrixItems.length} quyền hạn</strong> trên <strong>7 vai trò</strong>. Bấm vào ô bất kỳ để đổi cấp độ quyền.
                </span>
              </div>
              <span className="text-slate-400">
                Chính sách áp dụng theo thời gian thực (Zero-restart security)
              </span>
            </div>
          </div>

          {/* Quick Edit Permission Modal Popup */}
          {selectedCell && (
            <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Thiết Lập Cấp Độ Quyền</h3>
                      <span className="text-2xs text-slate-500">
                        Vai trò: <strong className="text-purple-700">{selectedCell.role}</strong>
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

                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900">
                  <span className="font-semibold block mb-0.5">Tính năng:</span>
                  <span>{matrixItems.find(i => i.id === selectedCell.itemId)?.featureName}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider block">
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
                            ? `${cfg.bg} ${cfg.border} ring-2 ring-purple-500/20 shadow-xs`
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-xs block ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-3xs text-slate-500 block">{cfg.description}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: NHÂN SỰ NỘI BỘ (LARK SSO RBAC)                                */}
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
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 bg-slate-50/50"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Tất cả vai trò nội bộ</option>
                <option value="ADMIN">Ban Giám Đốc (ADMIN)</option>
                <option value="MANAGER">Trưởng Phòng (MANAGER)</option>
                <option value="LEADER">Trưởng Nhóm (LEADER)</option>
                <option value="MEMBER">Chuyên Viên (MEMBER)</option>
                <option value="BRAND_MEMBER">Brand PIC</option>
                <option value="BOOKING_MEMBER">Booking Specialist</option>
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
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-2xs font-bold uppercase tracking-wider">
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
                          <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {staff.avatar}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{staff.name}</span>
                            <span className="text-3xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{staff.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* System Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold border ${
                          staff.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                          staff.role === 'MANAGER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          staff.role === 'LEADER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {staff.role}
                        </span>
                        <span className="text-3xs text-slate-500 block mt-1">{staff.roleTitle}</span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 block">{staff.department}</span>
                        <span className="text-3xs text-slate-500">{staff.position}</span>
                      </td>

                      {/* PIC Brands */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.picBrands.includes('ALL_BRANDS') ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-bold">
                              🌟 Tất cả nhãn hàng
                            </span>
                          ) : staff.picBrands.length > 0 ? (
                            staff.picBrands.map((b, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-3xs font-medium">
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-3xs text-slate-400 italic">Chưa gán nhãn</span>
                          )}
                        </div>
                      </td>

                      {/* Special Permissions Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-3xs">
                          {staff.permissions.canApproveBudget && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold" title="Duyệt ngân sách">
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
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-2xs font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Xem trước giao diện nhân sự này"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
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
          {editingStaff && (
            <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Phân Vai Trò & Phụ Trách Nhãn</h3>
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
                    <label className="font-bold text-slate-700">Vai trò hệ thống *</label>
                    <select
                      value={staffFormRole}
                      onChange={(e) => setStaffFormRole(e.target.value as UserRole)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-semibold focus:outline-none focus:border-purple-500"
                    >
                      <option value="ADMIN">Ban Giám Đốc (ADMIN) - Toàn quyền</option>
                      <option value="MANAGER">Trưởng Phòng Vận Hành (MANAGER) - Duyệt Plan & Hạn mức</option>
                      <option value="LEADER">Trưởng Nhóm / PIC Lead (LEADER) - Duyệt Deal & Kịch bản</option>
                      <option value="MEMBER">Chuyên Viên Vận Hành (MEMBER) - Tác nghiệp trực tiếp</option>
                      <option value="BRAND_MEMBER">Senior Brand PIC Lead</option>
                      <option value="BOOKING_MEMBER">Chuyên Viên Booking KOC</option>
                      <option value="CONTENT_MEMBER">Chuyên Viên Sáng Tạo Kịch Bản</option>
                    </select>
                  </div>

                  {/* Brand PIC assignment */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Nhãn hàng phụ trách (PIC Brands):</label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {brands.map(b => {
                        const isChecked = staffFormPicBrands.includes(b.name);
                        return (
                          <label
                            key={b.id}
                            className={`px-2.5 py-1 rounded-lg border text-2xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                              isChecked ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold' : 'bg-white text-slate-600 border-slate-200'
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
                              className="rounded text-purple-600 focus:ring-0"
                            />
                            <span>{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Special Permission Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Quyền phê duyệt đặc thù:</label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-purple-50/40 rounded-xl border border-purple-100">
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveBudget}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveBudget: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span>Duyệt Ngân Sách Tháng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApproveP3}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApproveP3: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span>Đánh giá & Duyệt P3</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canApprovePayment}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canApprovePayment: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span>Duyệt Chi Thanh Toán</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-2xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={staffFormPerms.canExportRawData}
                          onChange={(e) => setStaffFormPerms(p => ({ ...p, canExportRawData: e.target.checked }))}
                          className="rounded text-purple-600"
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
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-600/30"
                    >
                      Lưu Thay Đổi
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ĐỐI TÁC BÊN THỨ 3 (GMAIL SSO SETUP VIEW)                       */}
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
      {/* SUB-TAB 4: KIỂM TOÁN & NHẬT KÝ PHIÊN (AUDIT LOGS)                        */}
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
                  className="w-full pl-9 pr-3 text-xs h-9 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 bg-slate-50/50"
                />
              </div>

              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Tất cả hành động bảo mật</option>
                <option value="LOGIN">Đăng nhập hệ thống (LOGIN)</option>
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
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-2xs font-bold uppercase tracking-wider">
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
                        <span className="font-bold text-slate-900 block leading-tight">{log.actorName}</span>
                        <span className="text-3xs text-purple-700 font-semibold">{log.actorRole}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold border ${
                          log.actionType === 'IMPERSONATE' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          log.actionType === 'LOGIN' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          log.actionType === 'INVITE_PARTNER' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          'bg-purple-50 text-purple-800 border-purple-200'
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
                      <td className="py-3 px-4 text-3xs text-slate-400 font-mono">
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
    </div>
  );
};
