'use client';

import React, { useState, useMemo } from 'react';
import { ConfirmDialog, Avatar, Presence, Status } from '../ui';
import {
  KeyRound,
  Users,
  Building,
  Video,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Mail,
  X,
  Store
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
      {/* 1. HEADER & METRICS */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-xs text-muted">
            Quản trị phân quyền truy cập Gmail theo từng vai trò đối tác.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cấp quyền Gmail mới</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-line">
          <div className="p-3 bg-surface-subtle rounded-xl border border-line">
            <div className="text-2xs text-muted font-medium">Tổng tài khoản Gmail cấp</div>
            <div className="text-lg font-semibold text-ink mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span>{accounts.length}</span>
              <span className="text-2xs font-semibold text-positive">({activeCount} hoạt động)</span>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle rounded-xl border border-line">
            <div className="text-2xs text-ink-2 font-medium flex items-center gap-1">
              <Building className="w-3 h-3 text-accent" />
              <span>Đối tác Nhãn hàng</span>
            </div>
            <div className="text-lg font-semibold text-ink mt-0.5 tabular-nums">
              {brandCount} <span className="text-2xs font-normal text-muted">tài khoản</span>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle rounded-xl border border-line">
            <div className="text-2xs text-ink-2 font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-accent" />
              <span>Đối tác KOC / KOL</span>
            </div>
            <div className="text-lg font-semibold text-ink mt-0.5 tabular-nums">
              {kocCount} <span className="text-2xs font-normal text-muted">tài khoản</span>
            </div>
          </div>

          <div className="p-3 bg-surface-subtle rounded-xl border border-line">
            <div className="text-2xs text-ink-2 font-medium flex items-center gap-1">
              <Video className="w-3 h-3 text-positive" />
              <span>Cộng tác viên</span>
            </div>
            <div className="text-lg font-semibold text-ink mt-0.5 tabular-nums">
              {ctvCount} <span className="text-2xs font-normal text-muted">tài khoản</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Gmail, tên đối tác, tên nhãn hàng, KOC..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-line bg-canvas text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:bg-surface"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Partner Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
          >
            <option value="ALL">Tất cả loại đối tác ({accounts.length})</option>
            <option value="BRAND">Đối tác Nhãn hàng ({brandCount})</option>
            <option value="KOC">KOC / KOL ({kocCount})</option>
            <option value="CTV">Cộng tác viên ({ctvCount})</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt ({activeCount})</option>
            <option value="SUSPENDED">Đang tạm khóa ({accounts.length - activeCount})</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PARTNERS ACCOUNTS TABLE */}
      {/* ========================================================================= */}
      <div className="card-enterprise overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-canvas text-ink-3 border-b border-line text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-3 pl-4 w-[22%]">Tài khoản &amp; Đối tác</th>
                <th className="py-2.5 px-2 w-[11%]">Phân loại</th>
                <th className="py-2.5 px-2 w-[18%]">Phạm vi dữ liệu</th>
                <th className="py-2.5 px-2 w-[23%]">Quyền hạn được cấp</th>
                <th className="py-2.5 px-2 w-[11%]">Đăng nhập</th>
                <th className="py-2.5 px-1.5 w-[8%] text-center">Trạng thái</th>
                <th className="py-2.5 px-3 pr-4 text-right w-[7%]">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {filteredAccounts.map((acc) => {
                const isBrand = acc.partnerType === 'BRAND';
                const isKoc = acc.partnerType === 'KOC';
                const isCtv = acc.partnerType === 'CTV';

                const permissionLabels = [
                  acc.permissions.canApproveDeals && 'Duyệt KOC',
                  acc.permissions.canReviewScripts && 'Duyệt kịch bản',
                  acc.permissions.canViewGmvAndRoas && 'Xem GMV & ROI',
                  acc.permissions.canSubmitVideos && 'Nộp link video',
                  acc.permissions.canProvideSparkAds && 'Cung cấp mã Ads',
                  acc.permissions.canClaimSamples && 'Nhận mẫu',
                ].filter(Boolean) as string[];

                return (
                  <tr key={acc.id} className="hover:bg-canvas transition">
                    {/* Gmail & User Info */}
                    <td className="py-2.5 px-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={acc.displayName} size={28} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink text-xs flex items-center gap-1.5 truncate">
                            <span>{acc.displayName}</span>
                          </div>
                          <div className="text-2xs text-ink-2 font-code flex items-center gap-1 truncate mt-0.5">
                            <Mail className="w-3 h-3 text-ink-3 shrink-0" />
                            <span className="font-medium text-ink-2 truncate max-w-[130px]">{acc.gmail}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Partner Type */}
                    <td className="py-2.5 px-2">
                      <span className="text-xs font-medium text-ink-2 inline-flex items-center gap-1.5">
                        {isBrand && <Building className="w-3.5 h-3.5 text-ink-3" />}
                        {isKoc && <Users className="w-3.5 h-3.5 text-ink-3" />}
                        {isCtv && <Video className="w-3.5 h-3.5 text-ink-3" />}
                        <span>{isBrand ? 'Brand' : isKoc ? 'KOC' : 'CTV'}</span>
                      </span>
                    </td>

                    {/* Linked Entity & Store Scope */}
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-ink text-xs">
                        {acc.linkedEntityName}
                      </div>
                      {isBrand && acc.linkedStoreNames && acc.linkedStoreNames.length > 0 && (
                        <div className="text-2xs text-ink-3 mt-0.5 space-y-0.5">
                          {acc.linkedStoreNames.map((st, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1 truncate text-ink-2">
                              <Store className="w-2.5 h-2.5 text-ink-3 shrink-0" />
                              <span className="truncate">{st}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isKoc && (
                        <div className="text-2xs text-accent font-code mt-0.5">
                          #{acc.linkedEntityId}
                        </div>
                      )}
                    </td>

                    {/* Permissions Text */}
                    <td className="py-2.5 px-2">
                      <div className="text-xs text-ink-2 leading-relaxed">
                        {permissionLabels.length > 0 ? permissionLabels.join(' · ') : '—'}
                      </div>
                    </td>

                    {/* Last Login & Count */}
                    <td className="py-2.5 px-2 text-2xs text-ink-3">
                      <div className="font-medium text-ink">{acc.lastLoginAt || 'Chưa đăng nhập'}</div>
                      <div className="text-2xs text-ink-3 mt-0.5 tabular-nums">
                        {acc.loginCount} lần
                      </div>
                    </td>

                    {/* Status (Single Status per row) */}
                    <td className="py-2.5 px-1.5 text-center">
                      <Status tone={acc.status === 'ACTIVE' ? 'positive' : 'critical'}>
                        {acc.status === 'ACTIVE' ? 'Hoạt động' : 'Khóa'}
                      </Status>
                    </td>

                    {/* Actions & Impersonate */}
                    <td className="py-2.5 px-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleImpersonate(acc)}
                          className="px-2.5 py-1 rounded-lg text-2xs font-semibold bg-primary text-white hover:bg-primary-hover transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Đăng nhập thử với tư cách đối tác này để kiểm tra view"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem Thử</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-sunken"
                          title="Chỉnh sửa phân quyền"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(acc)}
                          className={`p-1 rounded ${
                            acc.status === 'ACTIVE' ? 'text-warning hover:bg-warning-soft' : 'text-positive hover:bg-positive-soft'
                          }`}
                          title={acc.status === 'ACTIVE' ? 'Tạm khóa tài khoản này' : 'Mở khóa tài khoản'}
                        >
                          {acc.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="p-1 rounded text-ink-3 hover:text-critical hover:bg-critical-soft"
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
      {/* 4. MODAL: CREATE / EDIT THIRD-PARTY GMAIL ACCESS */}
      {/* ========================================================================= */}
      <Presence show={isModalOpen}>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-surface rounded-2xl border border-line shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-positive" />
                <h2 className="text-base font-semibold text-ink">
                  {editingAccount ? 'Chỉnh Sửa Phân Quyền Gmail Đối Tác' : 'Cấp Quyền Truy Cập Gmail Cho Bên Thứ 3'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-sunken"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAccount} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Row 1: Gmail & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-ink-2 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-ink-3" />
                    <span>Địa chỉ Gmail đăng nhập *</span>
                  </label>
                  <input
                    type="email"
                    value={formGmail}
                    onChange={(e) => setFormGmail(e.target.value)}
                    placeholder="ví dụ: brand.kutieskin@gmail.com"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
                    required
                  />
                  <span className="text-2xs text-ink-3 block">
                    Đối tác sẽ dùng email Gmail này để đăng nhập trực tiếp vào hệ thống.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-ink-2">Tên hiển thị người dùng *</label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="ví dụ: Minh Tuấn (Brand Lead)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Partner Type */}
              <div className="space-y-1.5">
                <label className="font-semibold text-ink-2">Loại bên thứ 3 (Partner Type) *</label>
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
                        ? 'border-accent bg-accent-soft text-ink shadow-xs'
                        : 'border-line bg-surface hover:bg-canvas text-ink-2'
                    }`}
                  >
                    <Building className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-xs">1. Đối Tác Brand</span>
                    <span className="text-2xs text-ink-3">Xem Cổng Brand Hub, duyệt KOC & video</span>
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
                        ? 'border-accent bg-accent-soft text-ink shadow-xs'
                        : 'border-line bg-surface hover:bg-canvas text-ink-2'
                    }`}
                  >
                    <Users className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-xs">2. Creator / KOC</span>
                    <span className="text-2xs text-ink-3">Xem Hub KOC, nhận mẫu & nộp link</span>
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
                        ? 'border-positive bg-positive-soft text-ink shadow-xs'
                        : 'border-line bg-surface hover:bg-canvas text-ink-2'
                    }`}
                  >
                    <Video className="w-4 h-4 text-positive" />
                    <span className="font-semibold text-xs">3. Cộng Tác Viên (CTV)</span>
                    <span className="text-2xs text-ink-3">Xem Hub CTV kênh nội bộ</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Entity Association */}
              {formPartnerType === 'BRAND' && (
                <div className="space-y-3 p-3.5 bg-accent-soft/50 rounded-xl border border-line">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink">Chọn Nhãn hàng (Brand) liên kết *</label>
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
                      className="w-full text-xs h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-accent"
                    >
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.category || 'Mỹ phẩm / Mẹ bé'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Store Scope Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-2xs font-semibold text-ink-2">
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
                                isChecked ? 'bg-accent-soft text-ink border-accent' : 'bg-surface text-ink-2 border-line'
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
                                className="rounded text-accent focus:ring-0"
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
                <div className="space-y-1.5 p-3.5 bg-accent-soft/50 rounded-xl border border-line">
                  <label className="font-semibold text-ink">Chọn Hồ sơ KOC liên kết *</label>
                  <select
                    value={formLinkedEntityId}
                    onChange={(e) => {
                      const sel = kocs.find(k => k.id === e.target.value);
                      if (sel) {
                        setFormLinkedEntityId(sel.id);
                        setFormLinkedEntityName(sel.stageName);
                      }
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-accent"
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
                <div className="space-y-1.5 p-3.5 bg-positive-soft/50 rounded-xl border border-line">
                  <label className="font-semibold text-ink">Chọn Cộng Tác Viên (CTV) *</label>
                  <select
                    value={formLinkedEntityId}
                    onChange={(e) => {
                      setFormLinkedEntityId(e.target.value);
                      setFormLinkedEntityName(e.target.value === 'ctv-hamy' ? 'Hà My Content' : 'Tuấn Kiệt Video');
                    }}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-positive"
                  >
                    <option value="ctv-hamy">Hà My Content (Kênh TikTok Mẹ Bé)</option>
                    <option value="ctv-tuankiet">Tuấn Kiệt Video (Video Editor & ASMR)</option>
                  </select>
                </div>
              )}

              {/* Row 4: Detailed Permissions Checklist */}
              <div className="space-y-2">
                <label className="font-semibold text-ink-2 block">
                  Phân quyền chức năng chi tiết (Permissions):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canApproveDeals}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canApproveDeals: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Duyệt & Từ chối KOC</span>
                      <span className="text-2xs text-ink-3">Cho phép Brand phê duyệt danh sách KOC dự kiến</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canReviewScripts}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canReviewScripts: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Thẩm định Kịch bản Video</span>
                      <span className="text-2xs text-ink-3">Phản hồi & duyệt kịch bản trước khi quay</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canViewGmvAndRoas}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canViewGmvAndRoas: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Xem Doanh Thu GMV & ROI</span>
                      <span className="text-2xs text-ink-3">Hiển thị số liệu GMV 30 ngày và tỷ lệ ROI</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canSubmitVideos}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canSubmitVideos: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Nộp Link Video & Bài Đăng</span>
                      <span className="text-2xs text-ink-3">Dành cho KOC/CTV nộp sản phẩm nghiệm thu</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canProvideSparkAds}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canProvideSparkAds: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Cung Cấp Mã Spark Ads</span>
                      <span className="text-2xs text-ink-3">Dành cho KOC cung cấp mã ủy quyền quảng cáo</span>
                    </div>
                  </label>

                  <label className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canClaimSamples}
                      onChange={(e) => setFormPermissions(prev => ({ ...prev, canClaimSamples: e.target.checked }))}
                      className="mt-0.5 rounded text-positive focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-ink block">Xác Nhận Nhận Hàng Mẫu</span>
                      <span className="text-2xs text-ink-3">Theo dõi vận đơn và xác nhận đã nhận hàng</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="font-semibold text-ink-2">Ghi chú quản trị</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú người phụ trách, điều khoản riêng..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-line bg-surface text-ink focus:outline-none focus:border-accent"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-line text-ink-2 hover:bg-canvas transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs transition"
                >
                  {editingAccount ? 'Lưu Thay Đổi' : 'Cấp Quyền Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

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
