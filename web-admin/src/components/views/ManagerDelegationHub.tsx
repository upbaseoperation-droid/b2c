'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Check,
  AlertTriangle,
  Search,
  Database,
  ArrowRight,
  History,
} from 'lucide-react';
import {
  UserProfile,
  BrandDetail,
  StorePortfolioItem,
  StaffMasterMember,
  SlaTask,
  STORE_COEFFICIENT_TABLE_2,
  StoreDifficultyTier,
  getStoreCoefficientByTier,
  normalizeStoreCoefficient,
} from '../../lib/types';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { Avatar, Button, Modal, PageActions, Status, ChannelTag, Tabs } from '../ui';
import { B2C_28_STAFF_WORKLOAD_ROSTER } from './TaskDelegationView';
import {
  computeUnifiedB2cStaffWorkloads,
  loadSavedManagerExceptions,
  UnifiedStaffWorkloadRow,
} from '../../lib/taskDelegationData';
import {
  INITIAL_STORE_ASSIGNMENT_HISTORY,
  INITIAL_BACKUP_ASSIGNMENTS,
} from '../../lib/enterpriseMasterConfig';

interface ManagerDelegationHubProps {
  currentUser: UserProfile;
  brands: BrandDetail[];
  onUpdateBrand: (updated: BrandDetail) => void;
  onAddBrand?: (newBrand: BrandDetail) => void;
  storePortfolios: StorePortfolioItem[];
  onUpdateStore: (updated: StorePortfolioItem) => void;
  staffList: StaffMasterMember[];
  tasks: SlaTask[];
  onAddTask: (task: SlaTask) => void;
  onPingStaff?: (staffName: string, message: string) => void;
  onNotify?: (msg: string) => void;
  onNavigateToDashboard?: (tabKey: string) => void;
}

const ACTION_LABEL_MAP: Record<string, { label: string; className: string }> = {
  ASSIGNED: {
    label: 'Bổ nhiệm mới',
    className: 'bg-positive-soft text-positive border border-line',
  },
  REASSIGNED: {
    label: 'Bàn giao PIC',
    className: 'bg-accent-soft text-accent border border-line',
  },
  BACKUP_ACTIVATED: {
    label: 'Ủy quyền dự phòng',
    className: 'bg-warning-soft text-warning border border-line',
  },
};

export const ManagerDelegationHub: React.FC<ManagerDelegationHubProps> = ({
  currentUser,
  brands,
  onUpdateBrand,
  onAddBrand,
  storePortfolios,
  onUpdateStore,
  staffList,
  tasks,
  onNotify,
}) => {
  const [activeSection, setActiveSection] = useState<'STORES' | 'BRANDS' | 'ASSIGNMENT_HISTORY'>('STORES');
  const [selectedLeaderTeam, setSelectedLeaderTeam] = useState<'ALL' | 'TEAM_1' | 'TEAM_2'>('ALL');

  // Lịch sử bàn giao PIC
  const [assignmentHistory, setAssignmentHistory] = useState(() => INITIAL_STORE_ASSIGNMENT_HISTORY);
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<
    'ALL' | 'ASSIGNED' | 'REASSIGNED' | 'BACKUP_ACTIVATED'
  >('ALL');

  // Bộ lọc Brand & Gian hàng
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('ALL');
  const [storePlatformFilter, setStorePlatformFilter] = useState<
    'ALL' | 'TikTok Shop' | 'Shopee Mall' | 'Lazada'
  >('ALL');
  const [storeSearchTerm, setStoreSearchTerm] = useState('');

  const [managerExceptions] = useState<Record<string, boolean>>(() => loadSavedManagerExceptions());

  const unifiedStaffWorkloads = useMemo(() => {
    return computeUnifiedB2cStaffWorkloads({
      tasks,
      brands,
      storePortfolios,
      managerExceptions,
    });
  }, [tasks, brands, storePortfolios, managerExceptions]);

  const staffWorkloadMap = useMemo(() => {
    const map = new Map<string, UnifiedStaffWorkloadRow>();
    unifiedStaffWorkloads.forEach((w) => map.set(w.name, w));
    return map;
  }, [unifiedStaffWorkloads]);

  // Danh sách nhân sự B2C chuẩn
  const b2cStorePicOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; roleTitle: string }>();
    B2C_28_STAFF_WORKLOAD_ROSTER.forEach((r) => {
      map.set(r.name, {
        id: r.staffCode,
        name: r.name,
        roleTitle: `${r.roleGroup} (${r.level})`,
      });
    });
    staffList
      .filter((s) => s.role === 'BOOKING' || s.role === 'CONTENT')
      .forEach((s) => {
        if (!map.has(s.name)) {
          map.set(s.name, { id: s.id, name: s.name, roleTitle: s.roleTitle });
        }
      });
    return Array.from(map.values());
  }, [staffList]);

  const brandPositionCandidateNames = useMemo(() => {
    const base = B2C_28_STAFF_WORKLOAD_ROSTER.map((r) => r.name);
    if (!base.includes('Đặng Thị Yến Nhi')) base.unshift('Đặng Thị Yến Nhi');
    staffList.forEach((s) => {
      if (s.name && !base.includes(s.name)) base.push(s.name);
    });
    brands.forEach((b) => {
      if (b.contentBrandMainPic && !base.includes(b.contentBrandMainPic)) base.push(b.contentBrandMainPic);
      if (b.planStrategyPic && !base.includes(b.planStrategyPic)) base.push(b.planStrategyPic);
      if (b.keyVisualSisPic && !base.includes(b.keyVisualSisPic)) base.push(b.keyVisualSisPic);
    });
    return base;
  }, [staffList, brands]);

  const displayedBrands = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return brands.filter((b) => {
      const contentMain = b.contentBrandMainPic || b.contentPic || 'Quỳnh Như';
      const planStrat = b.planStrategyPic || b.brandPicName || 'Nguyễn Thị Ngọc Tâm';
      const kvSis = b.keyVisualSisPic || 'Vũ Hoài Lâm';

      if (
        selectedBrandFilter !== 'ALL' &&
        contentMain !== selectedBrandFilter &&
        planStrat !== selectedBrandFilter &&
        kvSis !== selectedBrandFilter &&
        (b.bookingPicLead || 'Đặng Thị Yến Nhi') !== selectedBrandFilter
      ) {
        return false;
      }
      if (q) {
        const matchName = b.name.toLowerCase().includes(q);
        const matchCompany = (b.companyName || '').toLowerCase().includes(q);
        const matchCat = (b.category || '').toLowerCase().includes(q);
        const matchPic =
          contentMain.toLowerCase().includes(q) ||
          planStrat.toLowerCase().includes(q) ||
          kvSis.toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchCat && !matchPic) return false;
      }
      return true;
    });
  }, [brands, searchTerm, selectedBrandFilter]);

  // 69 gian hàng B2C
  const b2cPlanStores = useMemo(() => {
    return storePortfolios.filter((s) => Boolean(s.requiresB2cPlan || s.isB2cManaged));
  }, [storePortfolios]);

  const displayedStores = useMemo(() => {
    return b2cPlanStores.filter((store) => {
      if (selectedLeaderTeam !== 'ALL') {
        const isAssignedLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
        if (selectedLeaderTeam === 'TEAM_1' && !isAssignedLeader) return false;
        if (selectedLeaderTeam === 'TEAM_2' && isAssignedLeader) return false;
      }

      if (selectedStaffFilter !== 'ALL') {
        const matchStaff =
          (store.b2cOwners && store.b2cOwners.includes(selectedStaffFilter)) ||
          (store.b2cOwnerName && store.b2cOwnerName.includes(selectedStaffFilter));
        if (!matchStaff) return false;
      }

      if (storePlatformFilter !== 'ALL' && store.platform !== storePlatformFilter) {
        return false;
      }

      if (storeSearchTerm.trim()) {
        const q = storeSearchTerm.toLowerCase().trim();
        const matchName = store.storeName.toLowerCase().includes(q);
        const matchBrand = (store.brandName || '').toLowerCase().includes(q);
        const matchPic =
          (store.b2cOwnerName || '').toLowerCase().includes(q) ||
          (store.b2cOwners && store.b2cOwners.some((bo) => bo.toLowerCase().includes(q)));
        if (!matchName && !matchBrand && !matchPic) return false;
      }

      return true;
    });
  }, [b2cPlanStores, selectedLeaderTeam, selectedStaffFilter, storePlatformFilter, storeSearchTerm]);

  // Modals
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandDetail | null>(null);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);

  const [brandAddMode, setBrandAddMode] = useState<'FROM_MASTER' | 'CUSTOM'>('FROM_MASTER');
  const [selectedMasterBrandId, setSelectedMasterBrandId] = useState<string>('');
  const [masterBrandSearch, setMasterBrandSearch] = useState<string>('');
  const [masterBrandCategoryFilter, setMasterBrandCategoryFilter] = useState<string>('ALL');
  const [hideAllocatedMasterBrands, setHideAllocatedMasterBrands] = useState<boolean>(true);

  const [brandFormState, setBrandFormState] = useState<{
    name: string;
    companyName: string;
    category: string;
    bookingPicLead: string;
    accountPic: string;
    growthPic: string;
    contentBrandMainPic: string;
    planStrategyPic: string;
    keyVisualSisPic: string;
  }>({
    name: '',
    companyName: '',
    category: 'Mỹ phẩm & Chăm sóc da',
    bookingPicLead: 'Đặng Thị Yến Nhi',
    accountPic: 'Phạm Thị Nhài',
    growthPic: 'Hoàng Long',
    contentBrandMainPic: 'Quỳnh Như',
    planStrategyPic: 'Nguyễn Thị Ngọc Tâm',
    keyVisualSisPic: 'Vũ Hoài Lâm',
  });

  const masterCategories = useMemo(() => {
    const set = new Set<string>();
    UPBASE_BRANDS_MASTER.forEach((b) => {
      if (b.category) set.add(b.category.trim());
    });
    return Array.from(set).sort();
  }, []);

  const filteredMasterBrands = useMemo(() => {
    const q = masterBrandSearch.trim().toLowerCase();
    return UPBASE_BRANDS_MASTER.filter((b) => {
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.companyName && b.companyName.toLowerCase().includes(q));

      const matchesCat = masterBrandCategoryFilter === 'ALL' || b.category === masterBrandCategoryFilter;

      const isAlreadyAllocated = brands.some(
        (ab) => ab.id === b.id || ab.name.trim().toLowerCase() === b.name.trim().toLowerCase()
      );

      if (hideAllocatedMasterBrands && isAlreadyAllocated) {
        return false;
      }

      return matchesSearch && matchesCat;
    });
  }, [masterBrandSearch, masterBrandCategoryFilter, hideAllocatedMasterBrands, brands]);

  const selectedMasterBrand = useMemo(() => {
    if (!selectedMasterBrandId) return null;
    return UPBASE_BRANDS_MASTER.find((b) => b.id === selectedMasterBrandId) || null;
  }, [selectedMasterBrandId]);

  const handleSelectMasterBrand = (master: BrandDetail) => {
    setSelectedMasterBrandId(master.id);
    setBrandFormState({
      name: master.name,
      companyName: master.companyName || '',
      category: master.category || 'Mỹ phẩm & Chăm sóc da',
      bookingPicLead: master.bookingPicLead || staffList[0]?.name || 'Đặng Thị Yến Nhi',
      accountPic: master.accountPic || 'Phạm Thị Nhài',
      growthPic: master.growthPic || 'Hoàng Long',
      contentBrandMainPic: master.contentBrandMainPic || master.contentPic || 'Quỳnh Như',
      planStrategyPic: master.planStrategyPic || master.brandPicName || 'Nguyễn Thị Ngọc Tâm',
      keyVisualSisPic: master.keyVisualSisPic || 'Vũ Hoài Lâm',
    });
  };

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormState.name.trim()) return;

    if (editingBrand) {
      const updated: BrandDetail = {
        ...editingBrand,
        name: brandFormState.name,
        companyName: brandFormState.companyName,
        category: brandFormState.category,
        bookingPicLead: brandFormState.bookingPicLead,
        accountPic: brandFormState.accountPic,
        growthPic: brandFormState.growthPic,
        contentBrandMainPic: brandFormState.contentBrandMainPic,
        planStrategyPic: brandFormState.planStrategyPic,
        keyVisualSisPic: brandFormState.keyVisualSisPic,
      };
      onUpdateBrand(updated);
      notify(`Đã cập nhật nhân sự phụ trách thương hiệu ${updated.name}`);
    } else if (onAddBrand) {
      const baseMaster = selectedMasterBrandId
        ? UPBASE_BRANDS_MASTER.find((b) => b.id === selectedMasterBrandId)
        : UPBASE_BRANDS_MASTER.find(
            (b) => b.name.trim().toLowerCase() === brandFormState.name.trim().toLowerCase()
          );

      const newBrand: BrandDetail = {
        ...(baseMaster || {}),
        id: baseMaster ? baseMaster.id : `brand-${Date.now()}`,
        code: baseMaster ? baseMaster.code : `BRAND_${brandFormState.name.toUpperCase().replace(/\s+/g, '_')}`,
        name: brandFormState.name,
        companyName: brandFormState.companyName || baseMaster?.companyName || 'Công ty Đối tác',
        category: brandFormState.category || baseMaster?.category || 'Mỹ phẩm & Chăm sóc da',
        color: baseMaster?.color || 'bg-accent',
        status: 'ACTIVE',
        planBudget: baseMaster?.planBudget || 150000000,
        spentBudget: 0,
        targetGmv: baseMaster?.targetGmv || 450000000,
        currentGmv: 0,
        targetVideos: baseMaster?.targetVideos || 100,
        airedVideos: 0,
        bookingPicLead: brandFormState.bookingPicLead,
        accountPic: brandFormState.accountPic,
        growthPic: brandFormState.growthPic,
        contentBrandMainPic: brandFormState.contentBrandMainPic,
        planStrategyPic: brandFormState.planStrategyPic,
        keyVisualSisPic: brandFormState.keyVisualSisPic,
        brandGuideline: baseMaster?.brandGuideline || '',
        kocCriteria: baseMaster?.kocCriteria || '',
        stores: baseMaster?.stores || [],
        heroProducts: baseMaster?.heroProducts || [],
      };
      onAddBrand(newBrand);
      notify(`Đã thêm nhãn hàng ${newBrand.name} và phân công nhân sự phụ trách`);
    }

    setIsBrandModalOpen(false);
    setEditingBrand(null);
    setSelectedMasterBrandId('');
  };

  const handleOpenEditBrand = (brand: BrandDetail) => {
    setEditingBrand(brand);
    setSelectedMasterBrandId(brand.id);
    setBrandAddMode('FROM_MASTER');
    setBrandFormState({
      name: brand.name,
      companyName: brand.companyName,
      category: brand.category,
      bookingPicLead: brand.bookingPicLead || staffList[0]?.name || 'Đặng Thị Yến Nhi',
      accountPic: brand.accountPic || 'Phạm Thị Nhài',
      growthPic: brand.growthPic || 'Hoàng Long',
      contentBrandMainPic: brand.contentBrandMainPic || brand.contentPic || 'Quỳnh Như',
      planStrategyPic: brand.planStrategyPic || brand.brandPicName || 'Nguyễn Thị Ngọc Tâm',
      keyVisualSisPic: brand.keyVisualSisPic || 'Vũ Hoài Lâm',
    });
    setIsBrandModalOpen(true);
  };

  const handleSaveStoreAssignment = (storeId: string, b2cOwners: string[], notes: string) => {
    const targetStore = storePortfolios.find((s) => s.id === storeId);
    if (!targetStore) return;

    const prevOwner = (targetStore.b2cOwners && targetStore.b2cOwners[0]) || targetStore.b2cOwnerName || '';
    const nextOwner = b2cOwners[0] || '';
    const isPicChanged = Boolean(prevOwner && nextOwner && prevOwner !== nextOwner);
    const today = new Date().toISOString().slice(0, 10);

    const updated: StorePortfolioItem = {
      ...targetStore,
      ...(isPicChanged
        ? {
            previousPic: prevOwner,
            handoverEffectiveDate: today,
          }
        : {}),
      b2cOwners,
      b2cOwnerName: b2cOwners.join(', '),
      primaryPic: nextOwner || targetStore.primaryPic,
      assignedStaff: nextOwner || targetStore.assignedStaff,
      assignmentNotes: notes,
      updatedAt: new Date().toISOString(),
    };

    onUpdateStore(updated);

    if (isPicChanged) {
      const matchedRoster = B2C_28_STAFF_WORKLOAD_ROSTER.find((r) => r.name === nextOwner);
      setAssignmentHistory((prev) => [
        {
          id: `hist-${Date.now()}`,
          storeId: updated.storeOperationId || updated.id,
          storeName: updated.storeName,
          brandName: updated.brandName,
          staffId: matchedRoster?.staffCode || `NV-${Date.now()}`,
          staffName: nextOwner,
          roleType: 'PRIMARY_B2C',
          action: 'REASSIGNED',
          effectiveDate: today,
          assignedBy: currentUser.id,
          assignedByName: currentUser.name,
          reason: notes || `Điều chuyển gian hàng từ ${prevOwner} sang ${nextOwner}`,
          handoverNotes: `Bàn giao trực tiếp từ ${prevOwner} sang ${nextOwner}`,
        },
        ...prev,
      ]);
    }

    notify(
      isPicChanged
        ? `Đã bàn giao gian "${updated.storeName}" từ ${prevOwner} sang ${b2cOwners.join(' & ')}`
        : `Đã cập nhật phân công gian hàng "${updated.storeName}"`
    );
    setEditingStore(null);
  };

  const uniqueBrandPics = useMemo(() => {
    const set = new Set<string>();
    brands.forEach((b) => {
      if (b.contentBrandMainPic) set.add(b.contentBrandMainPic);
      if (b.planStrategyPic) set.add(b.planStrategyPic);
      if (b.keyVisualSisPic) set.add(b.keyVisualSisPic);
      if (b.bookingPicLead) set.add(b.bookingPicLead);
    });
    return Array.from(set).sort();
  }, [brands]);

  return (
    <div className="space-y-4">
      <Tabs
        value={activeSection}
        onChange={(k) => setActiveSection(k as typeof activeSection)}
        items={[
          {
            key: 'STORES',
            label: 'Phân công Gian hàng',
            count: b2cPlanStores.length,
          },
          { key: 'BRANDS', label: 'Phân công theo Brand', count: brands.length },
          { key: 'ASSIGNMENT_HISTORY', label: 'Lịch sử bàn giao', count: assignmentHistory.length },
        ]}
        actions={
          <PageActions>
            {activeSection === 'BRANDS' && (
              <Button
                size="sm"
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingBrand(null);
                  setBrandAddMode('FROM_MASTER');
                  setSelectedMasterBrandId('');
                  setMasterBrandSearch('');
                  setMasterBrandCategoryFilter('ALL');
                  setHideAllocatedMasterBrands(true);
                  setBrandFormState({
                    name: '',
                    companyName: '',
                    category: 'Mỹ phẩm & Chăm sóc da',
                    bookingPicLead: staffList[0]?.name || 'Đặng Thị Yến Nhi',
                    accountPic: 'Phạm Thị Nhài',
                    growthPic: 'Hoàng Long',
                    contentBrandMainPic: 'Quỳnh Như',
                    planStrategyPic: 'Nguyễn Thị Ngọc Tâm',
                    keyVisualSisPic: 'Vũ Hoài Lâm',
                  });
                  setIsBrandModalOpen(true);
                }}
              >
                Thêm nhãn hàng
              </Button>
            )}
          </PageActions>
        }
      />

      {/* ========================================================================= */}
      {/* 1. PHÂN CÔNG GIAN HÀNG (TRỰC TIẾP HỆ SỐ + LEADER + PIC)                   */}
      {/* ========================================================================= */}
      {activeSection === 'STORES' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  placeholder="Tìm tên gian hàng, Brand, PIC..."
                  value={storeSearchTerm}
                  onChange={(e) => setStoreSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-surface border border-line-strong rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
                />
              </div>

              <select
                value={storePlatformFilter}
                onChange={(e) => setStorePlatformFilter(e.target.value as typeof storePlatformFilter)}
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL">Tất cả sàn</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Shopee Mall">Shopee Mall</option>
                <option value="Lazada">Lazada</option>
              </select>

              <select
                value={selectedLeaderTeam}
                onChange={(e) => setSelectedLeaderTeam(e.target.value as typeof selectedLeaderTeam)}
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL">Tất cả luồng duyệt</option>
                <option value="TEAM_1">Qua Trưởng nhóm Nguyễn Thị Ngọc Tâm (8 gian)</option>
                <option value="TEAM_2">Duyệt thẳng Trưởng phòng Đặng Thị Yến Nhi (61 gian)</option>
              </select>

              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL">Tất cả chuyên viên</option>
                {b2cStorePicOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              {(storeSearchTerm ||
                storePlatformFilter !== 'ALL' ||
                selectedLeaderTeam !== 'ALL' ||
                selectedStaffFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setStoreSearchTerm('');
                    setStorePlatformFilter('ALL');
                    setSelectedLeaderTeam('ALL');
                    setSelectedStaffFilter('ALL');
                  }}
                  className="text-2xs text-ink-3 hover:text-ink px-2 py-1 rounded bg-sunken transition"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="text-2xs text-ink-3">
              Hiển thị <strong className="text-ink font-semibold">{displayedStores.length}</strong> /{' '}
              {b2cPlanStores.length} gian hàng B2C
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                  <th className="py-2.5 px-4 min-w-[200px]">Gian hàng & sàn</th>
                  <th className="py-2.5 px-3">Nhãn hàng</th>
                  <th className="py-2.5 px-3 w-44">Hệ số gian hàng</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Cấp sơ duyệt (Leader)</th>
                  <th className="py-2.5 px-3 min-w-[210px]">Chuyên viên B2C (PIC)</th>
                  <th className="py-2.5 px-3 text-right w-28">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {displayedStores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-ink-3 text-xs">
                      Không có gian hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedStores.map((store) => {
                    const owners =
                      store.b2cOwners ||
                      (store.b2cOwnerName
                        ? store.b2cOwnerName.split(',').map((s) => s.trim())
                        : ['Nguyễn Thị Ngọc Tâm']);
                    const hasLeader = Boolean(store.hasBookingLeader && store.bookingLeader);
                    const currentLeaderVal = hasLeader ? store.bookingLeader || 'Nguyễn Thị Ngọc Tâm' : 'NONE';
                    const coef = normalizeStoreCoefficient(store.difficultyTier, store.difficultyMultiplier);

                    return (
                      <tr key={store.id} className="hover:bg-canvas transition-colors group">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-ink text-xs">{store.storeName}</div>
                          <div className="mt-0.5">
                            <ChannelTag channel={store.platform} />
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-medium text-ink-2">{store.brandName}</td>

                        {/* Chọn trực tiếp Hệ số gian hàng */}
                        <td className="py-2.5 px-3">
                          <select
                            value={coef.tier}
                            onChange={(e) => {
                              const nextTier = e.target.value as StoreDifficultyTier;
                              const nextMultiplier = getStoreCoefficientByTier(nextTier);
                              onUpdateStore({
                                ...store,
                                difficultyTier: nextTier,
                                difficultyMultiplier: nextMultiplier,
                                updatedAt: new Date().toISOString(),
                              });
                              notify(
                                `Đã cập nhật hệ số gian "${store.storeName}" sang ${nextTier} (×${nextMultiplier
                                  .toFixed(2)
                                  .replace('.', ',')})`
                              );
                            }}
                            className="w-full text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                          >
                            {STORE_COEFFICIENT_TABLE_2.rows.map((rule) => (
                              <option key={rule.tier} value={rule.tier}>
                                {rule.tier} (×{rule.multiplierLabel})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Chọn Cấp sơ duyệt (Leader) */}
                        <td className="py-2.5 px-3">
                          <select
                            value={currentLeaderVal}
                            onChange={(e) => {
                              const isNone = e.target.value === 'NONE';
                              const newLeader = isNone ? undefined : 'Nguyễn Thị Ngọc Tâm';
                              onUpdateStore({
                                ...store,
                                bookingLeader: newLeader,
                                hasBookingLeader: !isNone,
                              });
                              notify(
                                isNone
                                  ? `Gian "${store.storeName}" chuyển sang: Duyệt thẳng Trưởng phòng Đặng Thị Yến Nhi`
                                  : `Đã gán Trưởng nhóm Nguyễn Thị Ngọc Tâm sơ duyệt gian "${store.storeName}"`
                              );
                            }}
                            className="w-full text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                          >
                            <option value="NONE">Duyệt thẳng Trưởng phòng</option>
                            <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Leader)</option>
                          </select>
                        </td>

                        {/* Chọn Chuyên viên B2C (PIC) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={owners[0] || 'Nguyễn Thị Ngọc Tâm'} size={22} />
                            <select
                              value={owners[0] || 'Nguyễn Thị Ngọc Tâm'}
                              onChange={(e) => {
                                handleSaveStoreAssignment(store.id, [e.target.value], store.assignmentNotes || '');
                              }}
                              className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {b2cStorePicOptions.map((s) => {
                                const w = staffWorkloadMap.get(s.name);
                                return (
                                  <option key={s.id} value={s.name}>
                                    {s.name}
                                    {w ? ` (${w.liveAssignedStoresCount} gian)` : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => setEditingStore(store)}>
                            Bàn giao
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHÂN CÔNG THEO BRAND (3 VỊ TRÍ CẤP BRAND)                              */}
      {/* ========================================================================= */}
      {activeSection === 'BRANDS' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative min-w-[230px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  placeholder="Tìm nhãn hàng, nhân sự phụ trách..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-md text-ink placeholder-ink-3 focus:outline-none focus:border-focus"
                />
              </div>

              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-surface border border-line-strong rounded-md text-ink focus:outline-none focus:border-focus"
              >
                <option value="ALL">Tất cả nhân sự phụ trách Brand</option>
                {uniqueBrandPics.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </select>

              {(searchTerm || selectedBrandFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBrandFilter('ALL');
                  }}
                  className="text-2xs text-ink-3 hover:text-ink px-2 py-1 rounded bg-sunken transition"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="text-2xs text-ink-3">
              Hiển thị <strong className="text-ink font-semibold">{displayedBrands.length}</strong> / {brands.length}{' '}
              nhãn hàng
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-canvas text-ink-3 font-medium border-b border-line text-2xs">
                  <th className="py-2.5 px-4 min-w-[190px]">Nhãn hàng</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Content / Brand main</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Plan / Strategy</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Key Visual / SIS</th>
                  <th className="py-2.5 px-3 text-center w-28">Số gian B2C</th>
                  <th className="py-2.5 px-3 text-right w-28">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {displayedBrands.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-ink-3 text-xs">
                      Không tìm thấy nhãn hàng phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  displayedBrands.map((brand) => {
                    const brandStoresCount = b2cPlanStores.filter((s) =>
                      s.brandName.toLowerCase().includes(brand.name.toLowerCase())
                    ).length;

                    const contentMainVal = brand.contentBrandMainPic || brand.contentPic || 'Quỳnh Như';
                    const planStrategyVal = brand.planStrategyPic || brand.brandPicName || 'Nguyễn Thị Ngọc Tâm';
                    const kvSisVal = brand.keyVisualSisPic || 'Vũ Hoài Lâm';

                    return (
                      <tr key={brand.id} className="hover:bg-canvas transition-colors group">
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-ink text-xs block truncate">{brand.name}</span>
                          <span className="text-2xs text-ink-3 block truncate max-w-[180px]">
                            {brand.category || brand.companyName}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={contentMainVal} size={22} />
                            <select
                              value={contentMainVal}
                              onChange={(e) => {
                                onUpdateBrand({
                                  ...brand,
                                  contentBrandMainPic: e.target.value,
                                  contentPic: e.target.value,
                                });
                                notify(`Đã gán Content / Brand main của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {brandPositionCandidateNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={planStrategyVal} size={22} />
                            <select
                              value={planStrategyVal}
                              onChange={(e) => {
                                onUpdateBrand({
                                  ...brand,
                                  planStrategyPic: e.target.value,
                                  brandPicName: e.target.value,
                                });
                                notify(`Đã gán Plan / Strategy của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {brandPositionCandidateNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={kvSisVal} size={22} />
                            <select
                              value={kvSisVal}
                              onChange={(e) => {
                                onUpdateBrand({
                                  ...brand,
                                  keyVisualSisPic: e.target.value,
                                });
                                notify(`Đã gán Key Visual / SIS của ${brand.name} cho ${e.target.value}`);
                              }}
                              className="w-full min-w-0 text-xs font-medium px-2 py-1.5 bg-surface hover:bg-canvas border border-line rounded-md text-ink focus:outline-none focus:border-focus transition-colors"
                            >
                              {brandPositionCandidateNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {brandStoresCount > 0 ? (
                            <span className="tabular-nums font-medium text-ink-2">{brandStoresCount} gian</span>
                          ) : (
                            <Status tone="warning">Chưa gán</Status>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => handleOpenEditBrand(brand)}>
                            Cấu hình
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LỊCH SỬ BÀN GIAO & NHÂN SỰ DỰ PHÒNG (BACKUP PIC)                       */}
      {/* ========================================================================= */}
      {activeSection === 'ASSIGNMENT_HISTORY' && (
        <div className="space-y-5">
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-canvas flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="font-semibold text-xs text-ink flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-brand" />
                <span>Lịch sử bàn giao & phân công gian hàng ({assignmentHistory.length})</span>
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm gian hàng, nhân sự..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                  />
                </div>
                <select
                  value={historyActionFilter}
                  onChange={(e) => setHistoryActionFilter(e.target.value as typeof historyActionFilter)}
                  className="px-2.5 py-1 text-xs bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                >
                  <option value="ALL">Mọi loại bàn giao</option>
                  <option value="ASSIGNED">Bổ nhiệm mới</option>
                  <option value="REASSIGNED">Bàn giao PIC</option>
                  <option value="BACKUP_ACTIVATED">Ủy quyền dự phòng</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 min-w-[200px]">Gian hàng</th>
                    <th className="py-2.5 px-4 w-[140px]">Loại thay đổi</th>
                    <th className="py-2.5 px-4 min-w-[170px]">Nhân sự tiếp nhận</th>
                    <th className="py-2.5 px-4 min-w-[260px]">Nội dung bàn giao</th>
                    <th className="py-2.5 px-4 w-[150px]">Người duyệt</th>
                    <th className="py-2.5 px-4 text-right w-[110px]">Ngày hiệu lực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {assignmentHistory
                    .filter((h) => {
                      if (historyActionFilter !== 'ALL' && h.action !== historyActionFilter) return false;
                      if (historySearch.trim()) {
                        const q = historySearch.toLowerCase();
                        return (
                          h.storeName.toLowerCase().includes(q) ||
                          h.staffName.toLowerCase().includes(q) ||
                          (h.assignedByName && h.assignedByName.toLowerCase().includes(q)) ||
                          (h.reason && h.reason.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((h) => {
                      const act = ACTION_LABEL_MAP[h.action] || {
                        label: h.action,
                        className: 'bg-sunken text-ink-2 border border-line',
                      };
                      return (
                        <tr key={h.id} className="hover:bg-sunken/40 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-ink">
                            {h.storeName}
                            <div className="text-2xs text-ink-3 font-normal">{h.brandName}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-2xs font-semibold ${act.className}`}>
                              {act.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-ink">{h.staffName}</td>
                          <td className="py-2.5 px-4 text-xs text-ink-2">
                            {h.reason || h.handoverNotes || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-ink-2">{h.assignedByName}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-2xs text-ink-3">
                            {h.effectiveDate}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-canvas flex items-center justify-between">
              <h3 className="font-semibold text-xs text-ink flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-warning" />
                <span>Nhân sự dự phòng (Backup PIC · {INITIAL_BACKUP_ASSIGNMENTS.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas text-ink-3 border-b border-line font-medium text-2xs">
                  <tr>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự chính</th>
                    <th className="py-2.5 px-4 min-w-[160px]">Nhân sự dự phòng</th>
                    <th className="py-2.5 px-4 min-w-[260px]">Phạm vi ủy quyền</th>
                    <th className="py-2.5 px-4 text-center w-[130px]">Trạng thái</th>
                    <th className="py-2.5 px-4 text-right w-[180px]">Thời hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {INITIAL_BACKUP_ASSIGNMENTS.map((b) => (
                    <tr key={b.id} className="hover:bg-sunken/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-ink">{b.primaryStaffName}</td>
                      <td className="py-2.5 px-4 font-semibold text-warning">{b.backupStaffName}</td>
                      <td className="py-2.5 px-4 text-xs text-ink-2">{b.reason}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                            b.isActive
                              ? 'bg-positive-soft text-positive border border-line'
                              : 'bg-sunken text-ink-3 border border-line'
                          }`}
                        >
                          {b.isActive ? 'Đang kích hoạt' : 'Sẵn sàng'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-2xs text-ink-3">
                        {b.startDate} → {b.endDate || 'Vô thời hạn'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CẤU HÌNH NHÂN SỰ PHỤ TRÁCH BRAND                                 */}
      {/* ========================================================================= */}
      <Modal
        open={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={
          editingBrand
            ? `Cấu hình nhân sự Brand · ${editingBrand.name}`
            : 'Thêm nhãn hàng vào danh sách phân công'
        }
        size="md"
      >
        <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
          {!editingBrand && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-1 bg-sunken rounded-xl">
                <button
                  type="button"
                  onClick={() => setBrandAddMode('FROM_MASTER')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    brandAddMode === 'FROM_MASTER'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Chọn từ Master Data ({UPBASE_BRANDS_MASTER.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrandAddMode('CUSTOM')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    brandAddMode === 'CUSTOM'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nhập nhãn hàng mới</span>
                </button>
              </div>

              {brandAddMode === 'FROM_MASTER' && (
                <div className="space-y-2.5 bg-canvas p-3 rounded-xl border border-line">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 relative">
                      <Search className="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm tên nhãn hàng, mã brand..."
                        value={masterBrandSearch}
                        onChange={(e) => setMasterBrandSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-line rounded-lg text-xs text-ink placeholder:text-ink-3 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <select
                        value={masterBrandCategoryFilter}
                        onChange={(e) => setMasterBrandCategoryFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs text-ink-2 focus:outline-none"
                      >
                        <option value="ALL">Tất cả ngành hàng</option>
                        {masterCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-ink-3 px-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideAllocatedMasterBrands}
                        onChange={(e) => setHideAllocatedMasterBrands(e.target.checked)}
                        className="rounded border-line-strong text-accent focus:ring-0"
                      />
                      <span>Ẩn nhãn hàng đã phân công</span>
                    </label>
                    <span>{filteredMasterBrands.length} thương hiệu</span>
                  </div>

                  {selectedMasterBrand ? (
                    <div className="p-2.5 bg-white border border-accent/30 rounded-lg flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-ink text-xs">{selectedMasterBrand.name}</span>
                        <span className="ml-2 text-2xs font-mono text-ink-3">{selectedMasterBrand.code}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMasterBrandId('');
                          setBrandFormState((prev) => ({
                            ...prev,
                            name: '',
                            companyName: '',
                          }));
                        }}
                        className="text-2xs font-semibold text-accent px-2 py-1 rounded border border-accent/20 hover:bg-accent-soft transition"
                      >
                        Đổi nhãn hàng
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto divide-y divide-line border border-line rounded-lg bg-white">
                      {filteredMasterBrands.slice(0, 40).map((master) => (
                        <button
                          key={master.id}
                          type="button"
                          onClick={() => handleSelectMasterBrand(master)}
                          className="w-full p-2 text-left flex items-center justify-between gap-2 hover:bg-accent-soft transition"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-ink">{master.name}</span>
                            <span className="ml-1.5 text-2xs font-mono text-ink-3">{master.code}</span>
                          </div>
                          <span className="text-2xs font-semibold text-accent flex items-center gap-1 shrink-0">
                            <span>Chọn</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {brandAddMode === 'CUSTOM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-ink-2 block mb-1">Tên thương hiệu *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Clio Cosmetics..."
                      value={brandFormState.name}
                      onChange={(e) => setBrandFormState((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-ink-2 block mb-1">Công ty đối tác</label>
                    <input
                      type="text"
                      placeholder="Tên pháp nhân..."
                      value={brandFormState.companyName}
                      onChange={(e) => setBrandFormState((prev) => ({ ...prev, companyName: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="font-semibold text-ink-2 block mb-1">1. Content / Brand main</label>
                <select
                  value={brandFormState.contentBrandMainPic}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, contentBrandMainPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {brandPositionCandidateNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">2. Plan / Strategy</label>
                <select
                  value={brandFormState.planStrategyPic}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, planStrategyPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {brandPositionCandidateNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">3. Key Visual / SIS</label>
                <select
                  value={brandFormState.keyVisualSisPic}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, keyVisualSisPic: e.target.value }))}
                  className="w-full text-xs font-medium px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {brandPositionCandidateNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-line">
              <div>
                <label className="font-semibold text-ink-2 block mb-1">Cấp duyệt B2C</label>
                <select
                  value={brandFormState.bookingPicLead}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, bookingPicLead: e.target.value }))}
                  className="w-full text-xs px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  <option value="Đặng Thị Yến Nhi">Đặng Thị Yến Nhi (GĐ MKT B2C)</option>
                  {b2cStorePicOptions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">Account PIC</label>
                <select
                  value={brandFormState.accountPic}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, accountPic: e.target.value }))}
                  className="w-full text-xs px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {staffList
                    .filter((s) => s.role === 'ACCOUNT' || s.role === 'GROWTH' || s.role === 'MANAGER')
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink-2 block mb-1">Growth PIC</label>
                <select
                  value={brandFormState.growthPic}
                  onChange={(e) => setBrandFormState((prev) => ({ ...prev, growthPic: e.target.value }))}
                  className="w-full text-xs px-2.5 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
                >
                  {staffList
                    .filter((s) => s.role === 'GROWTH' || s.role === 'MANAGER')
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsBrandModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={Check} disabled={!brandFormState.name.trim()}>
              {editingBrand ? 'Lưu phân công' : 'Xác nhận thêm'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: BÀN GIAO GIAN HÀNG                                               */}
      {/* ========================================================================= */}
      <Modal
        open={!!editingStore}
        onClose={() => setEditingStore(null)}
        title={editingStore ? `Bàn giao gian hàng · ${editingStore.storeName}` : 'Bàn giao gian hàng'}
        size="md"
      >
        {editingStore && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-ink-2 block mb-1">Chuyên viên B2C tiếp nhận</label>
              <select
                value={
                  (editingStore.b2cOwners && editingStore.b2cOwners[0]) ||
                  editingStore.b2cOwnerName ||
                  'Nguyễn Thị Ngọc Tâm'
                }
                onChange={(e) => {
                  setEditingStore({
                    ...editingStore,
                    b2cOwners: [e.target.value],
                    b2cOwnerName: e.target.value,
                  });
                }}
                className="w-full text-xs font-medium px-3 py-2 bg-canvas border border-line rounded-lg text-ink focus:outline-none"
              >
                {b2cStorePicOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.roleTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-ink-2 block mb-1">Lý do & ghi chú bàn giao</label>
              <textarea
                rows={3}
                defaultValue={editingStore.assignmentNotes || ''}
                id="store-notes-input"
                placeholder="Ghi chú nội dung bàn giao gian hàng..."
                className="w-full text-xs px-3 py-2 bg-white border border-line rounded-lg text-ink placeholder-ink-3 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingStore(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Check}
                onClick={() => {
                  const notes = (document.getElementById('store-notes-input') as HTMLTextAreaElement)?.value || '';
                  const owners = editingStore.b2cOwners || [editingStore.b2cOwnerName];
                  handleSaveStoreAssignment(editingStore.id, owners, notes);
                }}
              >
                Xác nhận bàn giao
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
