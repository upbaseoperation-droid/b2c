'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Avatar,
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  Modal,
  Panel,
  Select,
  Stat,
  StatRow,
  Status,
} from '../ui';
import type { ChipOption, Column } from '../ui';
import {
  Building,
  Users,
  Video,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  Mail,
  Store,
  Eye,
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

type PartnerTypeFilter = 'ALL' | 'BRAND' | 'KOC' | 'CTV';

const THIRD_PARTY_ACCOUNTS_STORAGE_KEY = 'upbase_b2c_third_party_accounts_v1';

export const ThirdPartyAccessSetupView: React.FC<ThirdPartyAccessSetupViewProps> = ({
  currentUser,
  brands = INITIAL_BRANDS,
  kocs = INITIAL_KOCS,
  onNotify,
  onImpersonatePartner,
}) => {
  const [accounts, setAccounts] = useState<ThirdPartyAccessAccount[]>(() => {
    if (typeof window === 'undefined') return INITIAL_THIRD_PARTY_ACCOUNTS;
    try {
      const saved = window.localStorage.getItem(THIRD_PARTY_ACCOUNTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial accounts
    }
    return INITIAL_THIRD_PARTY_ACCOUNTS;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(THIRD_PARTY_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Ignore storage quota errors
    }
  }, [accounts]);
  const [filterType, setFilterType] = useState<PartnerTypeFilter>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ThirdPartyAccessAccount | null>(null);

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
    canClaimSamples: false,
  });
  const [formNotes, setFormNotes] = useState('');
  const [deletingAccount, setDeletingAccount] = useState<ThirdPartyAccessAccount | null>(null);

  // Metrics
  const brandCount = useMemo(() => accounts.filter((a) => a.partnerType === 'BRAND').length, [accounts]);
  const kocCount = useMemo(() => accounts.filter((a) => a.partnerType === 'KOC').length, [accounts]);
  const ctvCount = useMemo(() => accounts.filter((a) => a.partnerType === 'CTV').length, [accounts]);
  const activeCount = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE').length, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        acc.gmail.toLowerCase().includes(q) ||
        acc.displayName.toLowerCase().includes(q) ||
        acc.linkedEntityName.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (filterType !== 'ALL' && acc.partnerType !== filterType) return false;
      if (filterStatus !== 'ALL' && acc.status !== filterStatus) return false;
      return true;
    });
  }, [accounts, searchTerm, filterType, filterStatus]);

  const isFiltered = searchTerm.trim() !== '' || filterType !== 'ALL' || filterStatus !== 'ALL';

  const typeChips: ChipOption<PartnerTypeFilter>[] = [
    { key: 'ALL', label: 'Tất cả đối tác', count: accounts.length },
    { key: 'BRAND', label: 'Nhãn hàng (Brand)', count: brandCount },
    { key: 'KOC', label: 'KOC / KOL', count: kocCount },
    { key: 'CTV', label: 'Cộng tác viên', count: ctvCount },
  ];

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormGmail('');
    setFormDisplayName('');
    setFormPartnerType('BRAND');
    const firstBrand = brands[0] || { id: 'brand-kutieskin', name: 'Kutieskin Mama & Baby', stores: [] };
    setFormLinkedEntityId(firstBrand.id);
    setFormLinkedEntityName(firstBrand.name);
    setFormSelectedStores(firstBrand.stores ? firstBrand.stores.map((s) => s.storeName) : []);
    setFormPermissions({
      canApproveDeals: true,
      canReviewScripts: true,
      canViewGmvAndRoas: true,
      canViewFinancials: true,
      canSubmitVideos: false,
      canProvideSparkAds: false,
      canClaimSamples: false,
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
      onNotify?.('Vui lòng nhập địa chỉ Gmail hợp lệ!', 'warning');
      return;
    }

    if (editingAccount) {
      const updated: ThirdPartyAccessAccount = {
        ...editingAccount,
        gmail: formGmail.trim().toLowerCase(),
        displayName: formDisplayName.trim() || formGmail.split('@')[0],
        partnerType: formPartnerType,
        linkedEntityId: formLinkedEntityId,
        linkedEntityName: formLinkedEntityName,
        linkedStoreNames: formPartnerType === 'BRAND' ? formSelectedStores : undefined,
        permissions: { ...formPermissions },
        notes: formNotes.trim(),
      };

      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      onNotify?.(`Đã cập nhật phân quyền cho tài khoản ${updated.gmail}!`, 'success');
    } else {
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
        createdBy: currentUser?.name || 'Admin',
        notes: formNotes.trim(),
      };

      setAccounts((prev) => [newAcc, ...prev]);
      onNotify?.(`Đã cấp quyền truy cập Gmail cho ${newAcc.gmail}!`, 'success');
    }

    setIsModalOpen(false);
  };

  // Toggle Suspend / Active
  const handleToggleStatus = (acc: ThirdPartyAccessAccount) => {
    const nextStatus = acc.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, status: nextStatus } : a)));
    onNotify?.(
      nextStatus === 'ACTIVE'
        ? `Đã kích hoạt lại tài khoản ${acc.gmail}`
        : `Đã tạm khóa quyền truy cập của ${acc.gmail}`,
      nextStatus === 'ACTIVE' ? 'success' : 'warning'
    );
  };

  // Impersonate / Test View
  const handleImpersonate = (acc: ThirdPartyAccessAccount) => {
    if (acc.status === 'SUSPENDED') {
      onNotify?.('Tài khoản này đang bị tạm khóa, không thể đăng nhập thử!', 'warning');
      return;
    }
    const partnerUserProfile = convertPartnerAccountToUserProfile(acc);
    if (onImpersonatePartner) {
      onImpersonatePartner(partnerUserProfile);
      onNotify?.(`Đang chuyển sang giao diện của ${acc.displayName} (${acc.partnerType})...`, 'info');
    }
  };

  const columns: Column<ThirdPartyAccessAccount>[] = [
    {
      key: 'account',
      header: 'Tài khoản & Đối tác',
      width: 220,
      render: (acc) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={acc.displayName} size={28} />
          <div className="min-w-0">
            <div className="font-semibold text-ink text-xs truncate">{acc.displayName}</div>
            <div className="text-2xs text-ink-3 font-mono flex items-center gap-1 truncate mt-0.5">
              <Mail className="w-3 h-3 text-ink-3 shrink-0" />
              <span className="truncate">{acc.gmail}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'partnerType',
      header: 'Phân loại',
      width: 110,
      render: (acc) => {
        const isBrand = acc.partnerType === 'BRAND';
        const isKoc = acc.partnerType === 'KOC';
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sunken text-ink-2 text-2xs font-medium">
            {isBrand ? (
              <Building className="w-3 h-3 text-accent" />
            ) : isKoc ? (
              <Users className="w-3 h-3 text-accent" />
            ) : (
              <Video className="w-3 h-3 text-positive" />
            )}
            <span>{isBrand ? 'Brand' : isKoc ? 'KOC / KOL' : 'CTV'}</span>
          </span>
        );
      },
    },
    {
      key: 'scope',
      header: 'Phạm vi dữ liệu',
      width: 200,
      render: (acc) => (
        <div className="min-w-0">
          <div className="font-semibold text-ink text-xs truncate">{acc.linkedEntityName}</div>
          {acc.partnerType === 'BRAND' && acc.linkedStoreNames && acc.linkedStoreNames.length > 0 && (
            <div className="text-2xs text-ink-3 mt-0.5 space-y-0.5">
              {acc.linkedStoreNames.map((st, sIdx) => (
                <div key={sIdx} className="flex items-center gap-1 truncate text-ink-2">
                  <Store className="w-2.5 h-2.5 text-ink-3 shrink-0" />
                  <span className="truncate">{st}</span>
                </div>
              ))}
            </div>
          )}
          {acc.partnerType === 'KOC' && (
            <div className="text-2xs text-ink-3 font-mono mt-0.5">#{acc.linkedEntityId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Quyền hạn được cấp',
      width: 230,
      render: (acc) => {
        const labels = [
          acc.permissions.canApproveDeals && 'Duyệt KOC',
          acc.permissions.canReviewScripts && 'Duyệt kịch bản',
          acc.permissions.canViewGmvAndRoas && 'Xem GMV & ROI',
          acc.permissions.canViewFinancials && 'Xem tài chính',
          acc.permissions.canSubmitVideos && 'Nộp link video',
          acc.permissions.canProvideSparkAds && 'Mã Spark Ads',
          acc.permissions.canClaimSamples && 'Nhận mẫu',
        ].filter(Boolean) as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {labels.length > 0 ? (
              labels.map((lb) => (
                <span
                  key={lb}
                  className="px-1.5 py-0.5 rounded bg-canvas border border-line text-2xs text-ink-2 font-medium"
                >
                  {lb}
                </span>
              ))
            ) : (
              <span className="text-2xs text-ink-3">—</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'login',
      header: 'Đăng nhập',
      width: 120,
      render: (acc) => (
        <div className="text-2xs">
          <div className="font-medium text-ink">{acc.lastLoginAt || 'Chưa đăng nhập'}</div>
          <div className="text-ink-3 mt-0.5 tabular-nums">{acc.loginCount} lượt</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 100,
      align: 'center',
      render: (acc) => (
        <Status tone={acc.status === 'ACTIVE' ? 'positive' : 'critical'}>
          {acc.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
        </Status>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: 110,
      align: 'right',
      render: (acc) => (
        <div className="flex items-center justify-end gap-1">
          {onImpersonatePartner && (
            <button
              type="button"
              onClick={() => handleImpersonate(acc)}
              className="p-1.5 rounded-md text-ink-3 hover:text-accent hover:bg-accent-soft transition"
              title="Xem thử giao diện đối tác"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenEditModal(acc)}
            className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-sunken transition"
            title="Chỉnh sửa phân quyền"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(acc)}
            className={`p-1.5 rounded-md transition ${
              acc.status === 'ACTIVE'
                ? 'text-warning hover:bg-warning-soft'
                : 'text-positive hover:bg-positive-soft'
            }`}
            title={acc.status === 'ACTIVE' ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
          >
            {acc.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setDeletingAccount(acc)}
            className="p-1.5 rounded-md text-ink-3 hover:text-critical hover:bg-critical-soft transition"
            title="Xóa tài khoản"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow size="sm">
        <Stat
          label="Tổng tài khoản Gmail cấp"
          value={accounts.length}
          note={`${activeCount} tài khoản đang hoạt động`}
          tone="positive"
        />
        <Stat
          label="Đối tác Nhãn hàng"
          value={brandCount}
          note="Cổng duyệt KOC & kịch bản"
          icon={Building}
        />
        <Stat
          label="Đối tác KOC / KOL"
          value={kocCount}
          note="Nhận mẫu & nộp link video"
          icon={Users}
        />
        <Stat
          label="Cộng tác viên"
          value={ctvCount}
          note="Sản xuất kênh nội bộ"
          icon={Video}
        />
      </StatRow>

      <Panel flush>
        <div className="p-4 border-b border-line">
          <FilterBar
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: 'Tìm theo Gmail, tên đối tác, nhãn hàng, KOC...',
            }}
            filters={
              <>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-auto"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
                  <option value="SUSPENDED">Đang tạm khóa ({accounts.length - activeCount})</option>
                </Select>
                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('ALL');
                      setFilterStatus('ALL');
                    }}
                  >
                    Xóa lọc
                  </Button>
                )}
                <div className="ml-auto">
                  <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreateModal}>
                    Cấp quyền Gmail
                  </Button>
                </div>
              </>
            }
            chips={
              <Chips<PartnerTypeFilter>
                items={typeChips}
                value={filterType}
                onChange={setFilterType}
              />
            }
            resultCount={isFiltered ? filteredAccounts.length : undefined}
          />
        </div>

        <DataTable
          columns={columns}
          rows={filteredAccounts}
          rowKey={(acc) => acc.id}
          compact
          empty={
            <EmptyState
              title="Không tìm thấy tài khoản đối tác"
              description="Chưa có tài khoản bên thứ 3 nào khớp với bộ lọc hiện tại."
            />
          }
        />
      </Panel>

      {/* Modal cấp / sửa quyền Gmail đối tác */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Chỉnh sửa phân quyền Gmail đối tác' : 'Cấp quyền truy cập Gmail cho đối tác'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" form="partner-gmail-access-form">
              {editingAccount ? 'Lưu cập nhật' : 'Cấp quyền truy cập'}
            </Button>
          </>
        }
      >
        <form id="partner-gmail-access-form" onSubmit={handleSaveAccount} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-semibold text-ink-2 block">Địa chỉ Gmail đăng nhập *</label>
              <input
                type="email"
                value={formGmail}
                onChange={(e) => setFormGmail(e.target.value)}
                placeholder="ví dụ: brand.kutieskin@gmail.com"
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-ink-2 block">Tên hiển thị người dùng *</label>
              <input
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="ví dụ: Minh Tuấn (Brand Lead)"
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink font-medium focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-ink-2 block">Loại đối tác *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFormPartnerType('BRAND');
                  const firstBrand = brands[0];
                  if (firstBrand) {
                    setFormLinkedEntityId(firstBrand.id);
                    setFormLinkedEntityName(firstBrand.name);
                    setFormSelectedStores(firstBrand.stores ? firstBrand.stores.map((s) => s.storeName) : []);
                  }
                }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formPartnerType === 'BRAND'
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line bg-surface hover:bg-canvas text-ink-2'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Building className="w-4 h-4 text-accent" />
                  <span>Đối tác Brand</span>
                </div>
                <span className="text-2xs text-ink-3">Duyệt KOC, kịch bản & xem GMV</span>
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
                  setFormPermissions((prev) => ({
                    ...prev,
                    canSubmitVideos: true,
                    canProvideSparkAds: true,
                    canClaimSamples: true,
                    canApproveDeals: false,
                    canReviewScripts: false,
                  }));
                }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formPartnerType === 'KOC'
                    ? 'border-accent bg-accent-soft text-ink'
                    : 'border-line bg-surface hover:bg-canvas text-ink-2'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Users className="w-4 h-4 text-accent" />
                  <span>Creator / KOC</span>
                </div>
                <span className="text-2xs text-ink-3">Nhận mẫu, ký HĐ & nộp link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormPartnerType('CTV');
                  setFormLinkedEntityId('ctv-hamy');
                  setFormLinkedEntityName('Hà My Content');
                  setFormPermissions((prev) => ({
                    ...prev,
                    canSubmitVideos: true,
                    canClaimSamples: true,
                    canProvideSparkAds: false,
                    canApproveDeals: false,
                    canReviewScripts: false,
                  }));
                }}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition ${
                  formPartnerType === 'CTV'
                    ? 'border-positive bg-positive-soft text-ink'
                    : 'border-line bg-surface hover:bg-canvas text-ink-2'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Video className="w-4 h-4 text-positive" />
                  <span>Cộng tác viên</span>
                </div>
                <span className="text-2xs text-ink-3">Sản xuất video kênh nội bộ</span>
              </button>
            </div>
          </div>

          {formPartnerType === 'BRAND' && (
            <div className="space-y-3 p-3.5 bg-canvas rounded-xl border border-line">
              <div className="space-y-1">
                <label className="font-semibold text-ink block">Nhãn hàng (Brand) liên kết *</label>
                <select
                  value={formLinkedEntityId}
                  onChange={(e) => {
                    const sel = brands.find((b) => b.id === e.target.value);
                    if (sel) {
                      setFormLinkedEntityId(sel.id);
                      setFormLinkedEntityName(sel.name);
                      setFormSelectedStores(sel.stores ? sel.stores.map((s) => s.storeName) : []);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-accent"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category || 'Thương hiệu'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-2xs font-semibold text-ink-2 block">Gian hàng được phép xem số liệu:</label>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const activeBrand = brands.find((b) => b.id === formLinkedEntityId);
                    const storeList: string[] = activeBrand?.stores?.map((s) => s.storeName) || [
                      `${formLinkedEntityName} Official Store`,
                      `Shopee Mall ${formLinkedEntityName}`,
                    ];
                    return storeList.map((stName, idx) => {
                      const isChecked = formSelectedStores.includes(stName);
                      return (
                        <label
                          key={idx}
                          className={`px-2.5 py-1 rounded-lg border text-2xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
                            isChecked
                              ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                              : 'bg-surface text-ink-2 border-line'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSelectedStores((prev) => [...prev, stName]);
                              } else {
                                setFormSelectedStores((prev) => prev.filter((s) => s !== stName));
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
            <div className="space-y-1 p-3.5 bg-canvas rounded-xl border border-line">
              <label className="font-semibold text-ink block">Hồ sơ KOC liên kết *</label>
              <select
                value={formLinkedEntityId}
                onChange={(e) => {
                  const sel = kocs.find((k) => k.id === e.target.value);
                  if (sel) {
                    setFormLinkedEntityId(sel.id);
                    setFormLinkedEntityName(sel.stageName);
                  }
                }}
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-accent"
              >
                {kocs.slice(0, 200).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.stageName} ({k.channelId}) — {k.salaryGrade} ({k.niche})
                  </option>
                ))}
              </select>
            </div>
          )}

          {formPartnerType === 'CTV' && (
            <div className="space-y-1 p-3.5 bg-canvas rounded-xl border border-line">
              <label className="font-semibold text-ink block">Cộng tác viên (CTV) *</label>
              <select
                value={formLinkedEntityId}
                onChange={(e) => {
                  setFormLinkedEntityId(e.target.value);
                  setFormLinkedEntityName(
                    e.target.value === 'ctv-hamy' ? 'Hà My Content' : 'Tuấn Kiệt Video'
                  );
                }}
                className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink font-semibold focus:outline-none focus:border-positive"
              >
                <option value="ctv-hamy">Hà My Content (Kênh TikTok Mẹ Bé)</option>
                <option value="ctv-tuankiet">Tuấn Kiệt Video (Video Editor & ASMR)</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-semibold text-ink-2 block">Quyền hạn chi tiết:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  key: 'canApproveDeals' as const,
                  title: 'Duyệt & Từ chối KOC',
                  desc: 'Phê duyệt danh sách KOC đề xuất',
                },
                {
                  key: 'canReviewScripts' as const,
                  title: 'Thẩm định Kịch bản Video',
                  desc: 'Phản hồi & duyệt kịch bản trước khi quay',
                },
                {
                  key: 'canViewGmvAndRoas' as const,
                  title: 'Xem Doanh thu GMV & ROI',
                  desc: 'Theo dõi GMV 30 ngày và tỷ lệ ROI',
                },
                {
                  key: 'canViewFinancials' as const,
                  title: 'Xem Chi phí & Đối soát Tài chính',
                  desc: 'Xem ngân sách, chi phí hợp đồng & đối soát',
                },
                {
                  key: 'canSubmitVideos' as const,
                  title: 'Nộp Link Video & Bài đăng',
                  desc: 'Nộp sản phẩm nghiệm thu',
                },
                {
                  key: 'canProvideSparkAds' as const,
                  title: 'Cung cấp Mã Spark Ads',
                  desc: 'Cập nhật mã ủy quyền quảng cáo',
                },
                {
                  key: 'canClaimSamples' as const,
                  title: 'Xác nhận Nhận hàng mẫu',
                  desc: 'Theo dõi vận đơn & xác nhận nhận mẫu',
                },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="p-2.5 rounded-lg border border-line hover:bg-canvas flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formPermissions[perm.key]}
                    onChange={(e) =>
                      setFormPermissions((prev) => ({ ...prev, [perm.key]: e.target.checked }))
                    }
                    className="mt-0.5 rounded text-accent focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-ink block">{perm.title}</span>
                    <span className="text-2xs text-ink-3">{perm.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-ink-2 block">Ghi chú quản trị</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ghi chú phạm vi hợp tác hoặc người phụ trách..."
              className="w-full h-9 px-3 rounded-lg border border-line bg-surface text-ink focus:outline-none focus:border-accent"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingAccount}
        onOpenChange={(open) => {
          if (!open) setDeletingAccount(null);
        }}
        title="Xác nhận thu hồi quyền truy cập Gmail"
        description={
          deletingAccount
            ? `Bạn có chắc chắn muốn xóa quyền truy cập của tài khoản ${deletingAccount.gmail} (${deletingAccount.displayName})?`
            : ''
        }
        confirmLabel="Xóa tài khoản"
        variant="danger"
        onConfirm={() => {
          if (!deletingAccount) return;
          setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
          onNotify?.(`Đã thu hồi quyền truy cập Gmail của ${deletingAccount.gmail}`, 'info');
          setDeletingAccount(null);
        }}
      />
    </div>
  );
};
