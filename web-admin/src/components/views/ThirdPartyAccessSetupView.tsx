'use client';

import React, { useState, useMemo } from 'react';
import { ConfirmDialog } from '../ui';
import {
  ShieldCheck,
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
  ShieldAlert
} from 'lucide-react';
import { ThirdPartyAccessAccount, UserProfile, BrandDetail, KocItem } from '../../lib/types';
import { INITIAL_THIRD_PARTY_ACCOUNTS, convertPartnerAccountToUserProfile } from '../../lib/thirdPartyAccessData';
import { INITIAL_BRANDS, INITIAL_KOCS } from '../../lib/mockData';

interface ThirdPartyAccessSetupViewProps {
  currentUser?: UserProfile;
  brands?: BrandDetail[];
  kocs?: KocItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onImpersonatePartner?: (partnerUser: UserProfile) => void;
}

export const ThirdPartyAccessSetupView: React.FC<ThirdPartyAccessSetupViewProps> = ({
  currentUser,
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onImpersonatePartner
}) => {
  const [accounts, setAccounts] = useState<ThirdPartyAccessAccount[]>(INITIAL_THIRD_PARTY_ACCOUNTS);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ThirdPartyAccessAccount[] | ThirdPartyAccessAccount | null>(null);

  // Form State
  const [formGmail, setFormGmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formPartnerType, setFormPartnerType] = useState<'BRAND' | 'KOC' | 'CTV'>('BRAND');
  const [formLinkedEntityId, setFormLinkedEntityId] = useState('');
  const [formLinkedEntityName, setFormLinkedEntityName] = useState('');
  const [formSelectedStores, setFormSelectedStores] = useState<string[]>([]);
  const [formPermissions, setFormPermissions] = useState({
    canApproveDeals: true,
    canReviewScripts: true,
    canViewGmvAndRoas: true,
    canViewFinancials: true,
    canSubmitVideos: false,
    canProvideSparkAds: false,
    canClaimSamples: false
  });
  const [formNotes, setFormNotes] = useState('');
  const [deletingAccount, setDeletingAccount] = useState<ThirdPartyAccessAccount | null>(null);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.gmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.linkedEntityName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (filterType !== 'ALL' && acc.partnerType !== filterType) return false;
      if (filterStatus !== 'ALL' && acc.status !== filterStatus) return false;
      return true;
    });
  }, [accounts, searchTerm, filterType, filterStatus]);

  // Metrics
  const brandCount = useMemo(() => accounts.filter(a => a.partnerType === 'BRAND').length, [accounts]);
  const kocCount = useMemo(() => accounts.filter(a => a.partnerType === 'KOC').length, [accounts]);
  const ctvCount = useMemo(() => accounts.filter(a => a.partnerType === 'CTV').length, [accounts]);
  const activeCount = useMemo(() => accounts.filter(a => a.status === 'ACTIVE').length, [accounts]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormGmail('');
    setFormDisplayName('');
    setFormPartnerType('BRAND');
    const firstBrand = brands[0] || { id: 'brand-kutieskin', name: 'Kutieskin Mama & Baby', stores: [] };
    setFormLinkedEntityId(firstBrand.id);
    setFormLinkedEntityName(firstBrand.name);
    setFormSelectedStores(firstBrand.stores ? firstBrand.stores.map(s => s.storeName) : []);
    setFormPermissions({
      canApproveDeals: true,
      canReviewScripts: true,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: false,
      canProvideSparkAds: false,
      canClaimSamples: false
    });
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (acc: ThirdPartyAccessAccount) => {
    setEditingAccount(acc);
    setFormGmail(acc.gmail);
    setFormDisplayName(acc.displayName);
    setFormPartnerType(acc.partnerType);
    setFormLinkedEntityId(acc.linkedEntityId);
    setFormLinkedEntityName(acc.linkedEntityName);
    setFormSelectedStores(acc.linkedStoreNames || []);
    setFormPermissions({
      canApproveDeals: !!acc.permissions.canApproveDeals,
      canReviewScripts: !!acc.permissions.canReviewScripts,
      canViewGmvAndRoas: !!acc.permissions.canViewGmvAndRoas,
      canViewFinancials: !!acc.permissions.canViewFinancials,
      canSubmitVideos: !!acc.permissions.canSubmitVideos,
      canProvideSparkAds: !!acc.permissions.canProvideSparkAds,
      canClaimSamples: !!acc.permissions.canClaimSamples,
    });
    setFormNotes(acc.notes || '');
    setIsModalOpen(true);
  };

  // Save Account
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGmail.trim() || !formGmail.includes('@')) {
      if (onNotify) onNotify('Vui lòng nhập địa chỉ Gmail hợp lệ!', 'warning');
      return;
    }

    if (editingAccount && !Array.isArray(editingAccount)) {
      // Update
      const updated: ThirdPartyAccessAccount = {
        ...editingAccount,
        gmail: formGmail.trim().toLowerCase(),
        displayName: formDisplayName.trim() || formGmail.split('@')[0],
        partnerType: formPartnerType,
        linkedEntityId: formLinkedEntityId,
        linkedEntityName: formLinkedEntityName,
        linkedStoreNames: formPartnerType === 'BRAND' ? formSelectedStores : undefined,
        permissions: { ...formPermissions },
        notes: formNotes.trim()
      };

      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      if (onNotify) onNotify(`Đã cập nhật phân quyền cho tài khoản ${updated.gmail}!`, 'success');
    } else {
      // Create new
      const newAcc: ThirdPartyAccessAccount = {
        id: `tpa-${Date.now()}`,
        gmail: formGmail.trim().toLowerCase(),
        displayName: formDisplayName.trim() || formGmail.split('@')[0],
        partnerType: formPartnerType,
        linkedEntityId: formLinkedEntityId,
        linkedEntityName: formLinkedEntityName,
        linkedStoreNames: formPartnerType === 'BRAND' ? formSelectedStores : undefined,
        permissions: { ...formPermissions },
        status: 'ACTIVE',
        loginCount: 0,
        createdAt: new Date().toISOString().substring(0, 10),
        createdBy: currentUser?.name || 'Vân Ngọc (Operations Head)',
        notes: formNotes.trim()
      };

      setAccounts(prev => [newAcc, ...prev]);
      if (onNotify) onNotify(`Đã cấp quyền truy cập Gmail thành công cho ${newAcc.gmail}!`, 'success');
    }

    setIsModalOpen(false);
  };

  // Toggle Suspend / Active
  const handleToggleStatus = (acc: ThirdPartyAccessAccount) => {
    const nextStatus = acc.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, status: nextStatus } : a));
    if (onNotify) {
      onNotify(
        nextStatus === 'ACTIVE' 
          ? `Đã kích hoạt lại tài khoản ${acc.gmail}` 
          : `Đã tạm khóa quyền truy cập của ${acc.gmail}`,
        nextStatus === 'ACTIVE' ? 'success' : 'warning'
      );
    }
  };

  // Delete Account
  const handleDeleteAccount = (acc: ThirdPartyAccessAccount) => {
    setDeletingAccount(acc);
  };

  // Impersonate / Test View
  const handleImpersonate = (acc: ThirdPartyAccessAccount) => {
    if (acc.status === 'SUSPENDED') {
      if (onNotify) onNotify('Tài khoản này đang bị tạm khóa, không thể đăng nhập thử!', 'warning');
      return;
    }
    const partnerUserProfile = convertPartnerAccountToUserProfile(acc);
    if (onImpersonatePartner) {
      onImpersonatePartner(partnerUserProfile);
      if (onNotify) onNotify(`Đang chuyển sang giao diện của ${acc.displayName} (${acc.partnerType})...`, 'info');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. HEADER & HERO OVERVIEW                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-50 via-purple-50 to-transparent -mr-16 -mt-16 rounded-full blur-3xl opacity-70 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Phân Quyền & Cấp Tài Khoản Bên Thứ 3 (Gmail SSO)</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Trị Phân Quyền & Cấp Quyền Đăng Nhập Gmail Đối Tác
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cung cấp cổng đăng nhập độc lập bằng Gmail cho <strong>Brand (Nhãn hàng)</strong>, <strong>KOC / KOL</strong> và <strong>Cộng tác viên (CTV)</strong>. Hệ thống tự động phân luồng: đối tác đăng nhập Gmail sẽ vào thẳng Hub của mình và <strong>chỉ xem được dữ liệu được phân quyền</strong>, bảo mật 100% dữ liệu nội bộ UpBase.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cấp Quyền Gmail Mới</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60">
            <div className="text-2xs text-slate-500 font-medium">Tổng tài khoản Gmail cấp</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-baseline gap-1.5">
              <span>{accounts.length}</span>
              <span className="text-2xs font-semibold text-emerald-600">({activeCount} Hoạt động)</span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60">
            <div className="text-2xs text-purple-700 font-medium flex items-center gap-1">
              <Building className="w-3 h-3" />
              <span>Đối tác Brand (Nhãn hàng)</span>
            </div>
            <div className="text-lg font-bold text-purple-800 mt-0.5">
              {brandCount} <span className="text-2xs font-normal text-purple-600">tài khoản</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
            <div className="text-2xs text-blue-700 font-medium flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Đối tác KOC / KOL</span>
            </div>
            <div className="text-lg font-bold text-blue-800 mt-0.5">
              {kocCount} <span className="text-2xs font-normal text-blue-600">tài khoản</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
            <div className="text-2xs text-emerald-700 font-medium flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span>Cộng tác viên (CTV)</span>
            </div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5">
              {ctvCount} <span className="text-2xs font-normal text-emerald-600">tài khoản</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH TOOLBAR                                                */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Gmail, tên đối tác, tên nhãn hàng, KOC..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Partner Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Tất cả loại đối tác ({accounts.length})</option>
            <option value="BRAND">Đối tác Brand ({brandCount})</option>
            <option value="KOC">KOC / KOL ({kocCount})</option>
            <option value="CTV">Cộng tác viên CTV ({ctvCount})</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt ({activeCount})</option>
            <option value="SUSPENDED">Đang tạm khóa ({accounts.length - activeCount})</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PARTNERS ACCOUNTS TABLE                                                */}
      {/* ========================================================================= */}
      <div className="card-enterprise overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-2xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5 pl-6 w-[260px]">Tài Khoản Gmail & Đối Tác</th>
                <th className="p-3.5 w-[130px]">Phân Loại</th>
                <th className="p-3.5 w-[220px]">Phạm Vi Dữ Liệu (Brand / KOC)</th>
                <th className="p-3.5 min-w-[260px]">Quyền Hạn Được Cấp</th>
                <th className="p-3.5 w-[140px]">Đăng Nhập Gần Nhất</th>
                <th className="p-3.5 w-[110px] text-center">Trạng Thái</th>
                <th className="p-3.5 pr-6 text-right w-[170px] sticky right-0 bg-slate-50 border-l border-slate-200">
                  Thao Tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredAccounts.map((acc) => {
                const isBrand = acc.partnerType === 'BRAND';
                const isKoc = acc.partnerType === 'KOC';
                const isCtv = acc.partnerType === 'CTV';

                return (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                    {/* Gmail & User Info */}
                    <td className="p-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        {acc.avatarUrl ? (
                          <img
                            src={acc.avatarUrl}
                            alt={acc.displayName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isBrand ? 'bg-purple-100 text-purple-700' :
                            isKoc ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {acc.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                            <span>{acc.displayName}</span>
                          </div>
                          <div className="text-2xs text-slate-600 font-mono flex items-center gap-1 truncate mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{acc.gmail}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Partner Type Badge */}
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-2xs font-bold border inline-flex items-center gap-1 ${
                        isBrand ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        isKoc ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isBrand && <Building className="w-3 h-3" />}
                        {isKoc && <Users className="w-3 h-3" />}
                        {isCtv && <Video className="w-3 h-3" />}
                        <span>{isBrand ? 'Brand Partner' : isKoc ? 'KOC Partner' : 'CTV Partner'}</span>
                      </span>
                    </td>

                    {/* Linked Entity & Store Scope */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 text-xs">
                        {acc.linkedEntityName}
                      </div>
                      {isBrand && acc.linkedStoreNames && acc.linkedStoreNames.length > 0 && (
                        <div className="text-3xs text-slate-500 mt-1 space-y-0.5">
                          {acc.linkedStoreNames.map((st, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1 truncate text-slate-600">
                              <Store className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{st}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isKoc && (
                        <div className="text-3xs text-blue-600 font-mono mt-0.5">
                          Liên kết danh bạ KOC #{acc.linkedEntityId}
                        </div>
                      )}
                    </td>

                    {/* Permissions Chips */}
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {acc.permissions.canApproveDeals && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-3xs font-semibold border border-purple-200">
                            Duyệt KOC
                          </span>
                        )}
                        {acc.permissions.canReviewScripts && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-3xs font-semibold border border-blue-200">
                            Duyệt Kịch Bản
                          </span>
                        )}
                        {acc.permissions.canViewGmvAndRoas && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-3xs font-semibold border border-emerald-200">
                            Xem GMV & ROI
                          </span>
                        )}
                        {acc.permissions.canSubmitVideos && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-3xs font-semibold border border-indigo-200">
                            Nộp Link Video
                          </span>
                        )}
                        {acc.permissions.canProvideSparkAds && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-3xs font-semibold border border-amber-200">
                            Cung Cấp Mã Ads
                          </span>
                        )}
                        {acc.permissions.canClaimSamples && (
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-3xs font-semibold border border-teal-200">
                            Nhận Mẫu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Last Login & Count */}
                    <td className="p-3.5 text-2xs text-slate-500">
                      <div className="font-medium text-slate-800">{acc.lastLoginAt || 'Chưa đăng nhập'}</div>
                      <div className="text-3xs text-slate-400 mt-0.5">
                        {acc.loginCount} lần truy cập Gmail
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border inline-block ${
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {acc.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>

                    {/* Actions & Impersonate */}
                    <td className="p-3.5 pr-6 text-right sticky right-0 bg-white/95 border-l border-slate-200 shadow-[-3px_0_6px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleImpersonate(acc)}
                          className="px-2.5 py-1 rounded-lg text-2xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Đăng nhập thử với tư cách đối tác này để kiểm tra view"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Xem Thử</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Chỉnh sửa phân quyền"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(acc)}
                          className={`p-1 rounded ${
                            acc.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={acc.status === 'ACTIVE' ? 'Tạm khóa tài khoản này' : 'Mở khóa tài khoản'}
                        >
                          {acc.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: CREATE / EDIT THIRD-PARTY GMAIL ACCESS                          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {editingAccount ? 'Chỉnh Sửa Phân Quyền Gmail Đối Tác' : 'Cấp Quyền Truy Cập Gmail Cho Bên Thứ 3'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAccount} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Row 1: Gmail & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Địa chỉ Gmail đăng nhập *</span>
                  </label>
                  <input
                    type="email"
                    value={formGmail}
                    onChange={(e) => setFormGmail(e.target.value)}
                    placeholder="ví dụ: brand.kutieskin@gmail.com"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="text-3xs text-slate-400 block">
                    Đối tác sẽ dùng email Gmail này để đăng nhập trực tiếp vào hệ thống.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Tên hiển thị người dùng *</label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="ví dụ: Minh Tuấn (Brand Lead)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Partner Type */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Loại bên thứ 3 (Partner Type) *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormPartnerType('BRAND');
                      const firstBrand = brands[0];
                      if (firstBrand) {
                        setFormLinkedEntityId(firstBrand.id);
                        setFormLinkedEntityName(firstBrand.name);
                        setFormSelectedStores(firstBrand.stores ? firstBrand.stores.map(s => s.storeName) : []);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      formPartnerType === 'BRAND'
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Building className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-xs">1. Đối Tác Brand</span>
                    <span className="text-3xs text-slate-500">Xem Cổng Brand Hub, duyệt KOC & video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormPartnerType('KOC');
                      const firstKoc = kocs[0];
                      if (firstKoc) {
                        setFormLinkedEntityId(firstKoc.id);
                        setFormLinkedEntityName(firstKoc.stageName);
                      }
                      setFormPermissions(prev => ({
                        ...prev,
                        canSubmitVideos: true,
                        canProvideSparkAds: true,
                        canClaimSamples: true,
                        canApproveDeals: false,
                        canReviewScripts: false
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      formPartnerType === 'KOC'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs">2. Creator / KOC</span>
                    <span className="text-3xs text-slate-500">Xem Hub KOC, nhận mẫu & nộp link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormPartnerType('CTV');
                      setFormLinkedEntityId('ctv-hamy');
                      setFormLinkedEntityName('Hà My Content');
                      setFormPermissions(prev => ({
                        ...prev,
                        canSubmitVideos: true,
                        canClaimSamples: true,
                        canProvideSparkAds: false,
                        canApproveDeals: false,
                        canReviewScripts: false
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                      formPartnerType === 'CTV'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs">3. Cộng Tác Viên (CTV)</span>
                    <span className="text-3xs text-slate-500">Xem Hub CTV kênh nội bộ</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Entity Association */}
              {formPartnerType === 'BRAND' && (
                <div className="space-y-3 p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/70">
                  <div className="space-y-1.5">
                    <label className="font-bold text-purple-900">Chọn Nhãn hàng (Brand) liên kết *</label>
                    <select
                      value={formLinkedEntityId}
                      onChange={(e) => {
                        const sel = brands.find(b => b.id === e.target.value);
                        if (sel) {
                          setFormLinkedEntityId(sel.id);
                          setFormLinkedEntityName(sel.name);
                          setFormSelectedStores(sel.stores ? sel.stores.map(s => s.storeName) : []);
                        }
                      }}
                      className="w-full text-xs h-9 px-3 rounded-lg border border-purple-200 bg-white font-semibold focus:outline-none focus:border-purple-500"
                    >
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.category || 'Mỹ phẩm / Mẹ bé'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Store Scope Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-2xs font-semibold text-slate-600">
                      Gian hàng được phép xem số liệu:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const activeBrand = brands.find(b => b.id === formLinkedEntityId);
                        const storeList: string[] = activeBrand?.stores?.map(s => s.storeName) || [
                          `${formLinkedEntityName} Official Store`,
                          `Shopee Mall ${formLinkedEntityName}`
                        ];
                        return storeList.map((stName, idx) => {
                          const isChecked = formSelectedStores.includes(stName);
                          return (
                            <label
                              key={idx}
                              className={`px-2.5 py-1 rounded-lg border text-2xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
                                isChecked ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormSelectedStores(prev => [...prev, stName]);
                                  } else {
                                    setFormSelectedStores(prev => prev.filter(s => s !== stName));
                                  }
                                }}
                                className="rounded text-purple-600 focus:ring-0"
                              />
                              <span>{stName}</span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {formPartnerType === 'KOC' && (
                <div className="space-y-1.5 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/70">
                  <label className="font-bold text-blue-900">Chọn Hồ sơ KOC liên kết *</label>
                  <select
                    value={formLinkedEntityId}
                    onChange={(e) => {
                      const sel = kocs.find(k => k.id === e.target.value);
                      if (sel) {
                        setFormLinkedEntityId(sel.id);
                        setFormLinkedEntityName(sel.stageName);
                      }
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-blue-200 bg-white font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {kocs.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.stageName} ({k.channelId}) — {k.salaryGrade} ({k.niche})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formPartnerType === 'CTV' && (
                <div className="space-y-1.5 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/70">
                  <label className="font-bold text-emerald-900">Chọn Cộng Tác Viên (CTV) *</label>
                  <select
                    value={formLinkedEntityId}
                    onChange={(e) => {
                      setFormLinkedEntityId(e.target.value);
                      setFormLinkedEntityName(e.target.value === 'ctv-hamy' ? 'Hà My Content' : 'Tuấn Kiệt Video');
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-emerald-200 bg-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ctv-hamy">Hà My Content (Kênh TikTok Mẹ Bé)</option>
                    <option value="ctv-tuankiet">Tuấn Kiệt Video (Video Editor & ASMR)</option>
                  </select>
                </div>
              )}

              {/* Row 4: Detailed Permissions Checklist */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">
                  Phân quyền chức năng chi tiết (Permissions):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canApproveDeals}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canApproveDeals: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Duyệt & Từ chối KOC</span>
                      <span className="text-3xs text-slate-500">Cho phép Brand phê duyệt danh sách KOC dự kiến</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canReviewScripts}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canReviewScripts: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Thẩm định Kịch bản Video</span>
                      <span className="text-3xs text-slate-500">Phản hồi & duyệt kịch bản trước khi quay</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canViewGmvAndRoas}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canViewGmvAndRoas: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Xem Doanh Thu GMV & ROI</span>
                      <span className="text-3xs text-slate-500">Hiển thị số liệu GMV 30 ngày và tỷ lệ ROI</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSubmitVideos}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canSubmitVideos: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Nộp Link Video & Bài Đăng</span>
                      <span className="text-3xs text-slate-500">Dành cho KOC/CTV nộp sản phẩm nghiệm thu</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canProvideSparkAds}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canProvideSparkAds: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Cung Cấp Mã Spark Ads</span>
                      <span className="text-3xs text-slate-500">Dành cho KOC cung cấp mã ủy quyền quảng cáo</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canClaimSamples}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canClaimSamples: e.target.checked }))}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 block">Xác Nhận Nhận Hàng Mẫu</span>
                      <span className="text-3xs text-slate-500">Theo dõi vận đơn và xác nhận đã nhận hàng</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Ghi chú quản trị</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú người phụ trách, điều khoản riêng..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                  {editingAccount ? 'Lưu Thay Đổi' : 'Cấp Quyền Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Revoke Partner Access Dialog */}
      <ConfirmDialog
        open={Boolean(deletingAccount)}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        title="Xác nhận thu hồi quyền truy cập đối tác"
        description={`Bạn có chắc chắn muốn thu hồi và xóa tài khoản truy cập đối tác "${deletingAccount?.gmail}" (${deletingAccount?.displayName})? Đối tác sẽ không thể đăng nhập vào cổng thông tin nữa.`}
        confirmLabel="Thu hồi & Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={() => {
          if (deletingAccount) {
            setAccounts(prev => prev.filter(a => a.id !== deletingAccount.id));
            if (onNotify) onNotify(`Đã xóa tài khoản đối tác ${deletingAccount.gmail}`, 'info');
            setDeletingAccount(null);
          }
        }}
      />
    </div>
  );
};
