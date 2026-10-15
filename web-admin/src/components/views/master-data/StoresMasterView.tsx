'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  ExternalLink, 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Trash2, 
  Archive, 
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Edit3,
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import { 
  ActionMenu,
  Button,
  ChannelTag, 
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  PageActions,
  Pagination,
  Panel,
  Person,
  Presence,
  Select,
  Status
} from '../../ui';
import type { Column } from '../../ui';
import { StorePortfolioItem, BrandDetail, BookingDealItem } from '../../../lib/types';
import { StaffSearchSelect } from './StaffSearchSelect';
import { StoreDetailModal } from './StoreDetailModal';
import { StoreHandoverModal } from './StoreHandoverModal';
import { formatVndShort } from '../../../lib/format';
import { INITIAL_DEALS } from '../../../lib/mockData';

interface StoresMasterViewProps {
  initialStores: StorePortfolioItem[];
  onStoresChange?: (items: StorePortfolioItem[]) => void;
  canEdit?: boolean;
  brandNames: string[];
  brands?: BrandDetail[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateToStoreManagement?: (storeName: string) => void;
}

const PAGE_SIZE = 25;

export const StoresMasterView: React.FC<StoresMasterViewProps> = ({
  initialStores,
  onStoresChange,
  canEdit = true,
  brandNames,
  brands = [],
  deals = INITIAL_DEALS,
  onNotify,
  onUpdateStore,
  onNavigateToBrandProfile,
  onNavigateToStoreManagement
}) => {
  const [localStores, setLocalStores] = useState(initialStores);
  const stores = onStoresChange ? initialStores : localStores;
  const setStores = (update: React.SetStateAction<StorePortfolioItem[]>) => {
    if (!canEdit) { onNotify?.('Bạn không có quyền sửa danh mục.', 'warning'); return; }
    const next = typeof update === 'function' ? update(stores) : update;
    if (onStoresChange) onStoresChange(next); else setLocalStores(next);
  };

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [selectedPackage, setSelectedPackage] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedB2cPlan, setSelectedB2cPlan] = useState<'ALL' | 'B2C_MANAGED' | 'REQUIRES_PLAN'>('ALL');
  const [selectedTeamStructure, setSelectedTeamStructure] = useState<'ALL' | 'WITH_LEADER' | 'DIRECT_TO_LEAD'>('ALL');
  const [selectedBudgetStatus, setSelectedBudgetStatus] = useState<'ALL' | 'HAS_BUDGET' | 'ZERO_BUDGET' | 'OVERBUDGET'>('ALL');
  const [page, setPage] = useState(1);

  // Detail Modal & Handover Modal State
  const [selectedStoreForDetail, setSelectedStoreForDetail] = useState<StorePortfolioItem | null>(null);
  const [handoverStore, setHandoverStore] = useState<StorePortfolioItem | null>(null);

  // Extract unique sorted brand list
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.brandName) set.add(s.brandName.trim());
    });
    brandNames.forEach(b => {
      if (b) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [stores, brandNames]);

  // Extract unique account owners & PICs
  const accountOwners = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.accountOwnerName) set.add(s.accountOwnerName.trim());
      if (s.b2cOwnerName) set.add(s.b2cOwnerName.trim());
      if (s.growthPic) set.add(s.growthPic.trim());
      if (s.contentPic) set.add(s.contentPic.trim());
      if (s.mediaPic) set.add(s.mediaPic.trim());
      if (s.backupOwnerName) set.add(s.backupOwnerName.trim());
    });
    return Array.from(set).sort();
  }, [stores]);

  // Quick Add Store State (Quy chuẩn Master Data: chỉ khai báo Tên gian hàng, Brand, Sàn)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickStoreName, setQuickStoreName] = useState('');
  const [quickBrandName, setQuickBrandName] = useState('');
  const [quickPlatform, setQuickPlatform] = useState<'TikTok Shop' | 'Shopee Mall' | 'Lazada'>('TikTok Shop');

  // Modal State for Edit Store Parameters
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);
  const [form, setForm] = useState({
    storeName: '',
    storeOperationId: '',
    brandName: brandNames[0] || '',
    platform: 'Shopee Mall' as 'Shopee Mall' | 'TikTok Shop' | 'Lazada',
    servicePackage: 'E2E-S',
    accountOwnerName: '',
    growthPic: '',
    b2cOwnerName: '',
    bookingLeader: '',
    hasBookingLeader: false,
    contentPic: '',
    mediaPic: '',
    backupOwnerName: '',
    isBackupActive: false,
    backupReason: '',
    isB2cManaged: true,
    requiresB2cPlan: true,
    storeUrl: '',
    operationStatus: 'Live' as 'Live' | 'Off' | 'Kênh nội bộ',
    platformStoreId: '',
    affiliateRate: 15,
    requiresSparkAds: false,
    monthlyBudget: 0,
    monthlyTargetGmv: 0,
    targetAffiliateContents: 0,
    targetSelfChannelContents: 0,
    targetFocVideos: 0,
    assignmentNotes: ''
  });
  const [deletingStore, setDeletingStore] = useState<StorePortfolioItem | null>(null);

  // Compute spend for each store from deals
  const storeSpendMap = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach(d => {
      const sName = (d.storeName || '').toLowerCase().trim();
      const bName = (d.brandName || '').toLowerCase().trim();
      const cost = d.totalValue || 0;
      if (sName) {
        map.set(sName, (map.get(sName) || 0) + cost);
      } else if (bName) {
        map.set(`brand_${bName}`, (map.get(`brand_${bName}`) || 0) + cost);
      }
    });
    return map;
  }, [deals]);

  const getStoreActualSpent = useCallback((s: StorePortfolioItem): number => {
    if (s.actualSpentNet !== undefined) return s.actualSpentNet;
    const byName = storeSpendMap.get(s.storeName.toLowerCase().trim());
    if (byName !== undefined) return byName;
    return 0;
  }, [storeSpendMap]);

  // Filtered stores with multi-dimensions
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      if (selectedBrand !== 'ALL' && s.brandName !== selectedBrand) return false;
      if (selectedPlatform !== 'ALL' && s.platform !== selectedPlatform) return false;
      if (selectedPackage !== 'ALL' && s.servicePackage !== selectedPackage) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'Live' && s.operationStatus !== 'Live' && s.accountStatus !== 'ACTIVE') return false;
        if (selectedStatus === 'Off' && s.operationStatus !== 'Off' && s.accountStatus !== 'OFFBOARDED') return false;
        if (selectedStatus === 'Kênh nội bộ' && s.operationStatus !== 'Kênh nội bộ' && s.accountStatus !== 'MAINTENANCE') return false;
      }
      if (selectedB2cPlan === 'B2C_MANAGED' && !s.isB2cManaged) return false;
      if (selectedB2cPlan === 'REQUIRES_PLAN' && !s.requiresB2cPlan) return false;

      // Filter by Team structure (With Leader vs Direct)
      if (selectedTeamStructure === 'WITH_LEADER' && (!s.hasBookingLeader || !s.bookingLeader)) return false;
      if (selectedTeamStructure === 'DIRECT_TO_LEAD' && (s.hasBookingLeader && s.bookingLeader)) return false;

      // Filter by Budget Status
      const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
      const spent = getStoreActualSpent(s);
      if (selectedBudgetStatus === 'HAS_BUDGET' && bNet <= 0) return false;
      if (selectedBudgetStatus === 'ZERO_BUDGET' && bNet > 0) return false;
      if (selectedBudgetStatus === 'OVERBUDGET' && (bNet <= 0 || spent <= bNet)) return false;

      // Filter by PIC / Owner
      if (selectedOwner !== 'ALL') {
        const matchOwner = (s.b2cOwnerName && s.b2cOwnerName.includes(selectedOwner)) ||
                           (s.accountOwnerName && s.accountOwnerName.includes(selectedOwner)) ||
                           (s.growthPic && s.growthPic.includes(selectedOwner)) ||
                           (s.contentPic && s.contentPic.includes(selectedOwner)) ||
                           (s.mediaPic && s.mediaPic.includes(selectedOwner)) ||
                           (s.backupOwnerName && s.backupOwnerName.includes(selectedOwner)) ||
                           (s.bookingLeader && s.bookingLeader.includes(selectedOwner));
        if (!matchOwner) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.storeName.toLowerCase().includes(q) ||
          (s.storeOperationId && s.storeOperationId.toLowerCase().includes(q)) ||
          (s.storeOperation && s.storeOperation.toLowerCase().includes(q)) ||
          s.brandName.toLowerCase().includes(q) ||
          (s.b2cOwnerName && s.b2cOwnerName.toLowerCase().includes(q)) ||
          (s.bookingLeader && s.bookingLeader.toLowerCase().includes(q)) ||
          (s.accountOwnerName && s.accountOwnerName.toLowerCase().includes(q)) ||
          (s.growthPic && s.growthPic.toLowerCase().includes(q)) ||
          (s.contentPic && s.contentPic.toLowerCase().includes(q)) ||
          (s.mediaPic && s.mediaPic.toLowerCase().includes(q)) ||
          (s.platformStoreId && s.platformStoreId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [stores, selectedBrand, selectedPlatform, selectedPackage, selectedStatus, selectedOwner, selectedB2cPlan, selectedTeamStructure, selectedBudgetStatus, search, getStoreActualSpent]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBrand('ALL');
    setSelectedPlatform('ALL');
    setSelectedPackage('ALL');
    setSelectedStatus('ALL');
    setSelectedOwner('ALL');
    setSelectedB2cPlan('ALL');
    setSelectedTeamStructure('ALL');
    setSelectedBudgetStatus('ALL');
    setPage(1);
  };

  const handleToggleB2cManaged = (store: StorePortfolioItem) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    const updated: StorePortfolioItem = {
      ...store,
      isB2cManaged: !store.isB2cManaged,
      requiresB2cPlan: !store.isB2cManaged ? (store.requiresB2cPlan ?? true) : false,
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(updated);
    if (onNotify) {
      onNotify(`Đã ${updated.isB2cManaged ? 'bật' : 'tắt'} Marketing B2C phụ trách cho [${store.storeName}]`);
    }
  };

  const handleToggleRequiresPlan = (store: StorePortfolioItem) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    const updated: StorePortfolioItem = {
      ...store,
      requiresB2cPlan: !store.requiresB2cPlan,
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(updated);
    if (onNotify) {
      onNotify(`Đã ${updated.requiresB2cPlan ? 'yêu cầu' : 'bỏ yêu cầu'} làm Plan cho [${store.storeName}]`);
    }
  };

  // Pagination slice
  const totalPages = Math.ceil(filteredStores.length / PAGE_SIZE) || 1;
  const currentStores = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStores.slice(start, start + PAGE_SIZE);
  }, [filteredStores, page]);

  // Overall KPI stats
  const totalStoresCount = stores.length;
  const shopeeCount = stores.filter(s => s.platform === 'Shopee Mall').length;
  const tiktokCount = stores.filter(s => s.platform === 'TikTok Shop').length;
  const lazadaCount = stores.filter(s => s.platform === 'Lazada').length;
  const liveCount = stores.filter(s => s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE').length;
  const offCount = stores.filter(s => s.operationStatus === 'Off' || s.accountStatus === 'OFFBOARDED').length;
  
  // 2-tier team stats
  const withLeaderCount = stores.filter(s => s.hasBookingLeader && s.bookingLeader).length;
  const directLeadCount = totalStoresCount - withLeaderCount;


  // Overbudget detection
  const overbudgetStores = useMemo(() => {
    return stores.filter(s => {
      const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
      const spent = getStoreActualSpent(s);
      return bNet > 0 && spent > bNet;
    });
  }, [stores, getStoreActualSpent]);

  // Open Handover Modal
  const handleOpenHandover = (s: StorePortfolioItem) => {
    setHandoverStore(s);
  };

  const handleConfirmHandover = (updatedStore: StorePortfolioItem, logEntry: {
    fromPic: string;
    toPic: string;
    effectiveDate: string;
    reason: string;
  }) => {
    setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(updatedStore);
    if (onNotify) {
      onNotify(`Đã lập Lệnh bàn giao [${updatedStore.storeName}] từ [${logEntry.fromPic}] sang [${logEntry.toPic}] (Hiệu lực: ${logEntry.effectiveDate})`, 'success');
    }
  };

  // Open Quick Add Store Modal (Master Data standard: chỉ hỏi Tên, Brand, Sàn)
  const handleOpenAdd = () => {
    setQuickStoreName('');
    setQuickBrandName(uniqueBrands[0] || brandNames[0] || '');
    setQuickPlatform('TikTok Shop');
    setIsQuickAddModalOpen(true);
  };

  const handleQuickAddStore = (e: React.FormEvent) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    e.preventDefault();
    const cleanStoreName = quickStoreName.trim();
    const cleanBrandName = quickBrandName.trim();
    if (!cleanStoreName || !cleanBrandName) return;

    if (stores.some(s => s.storeName.toLowerCase() === cleanStoreName.toLowerCase())) {
      if (onNotify) onNotify(`Tên gian hàng "${cleanStoreName}" đã tồn tại trong Master Data!`, 'error');
      return;
    }

    const newId = `store-b2c-${Date.now()}`;
    const autoOpId = `SO-B2C-${String(stores.length + 1).padStart(3, '0')}`;
    const brandObj = brands.find(b => b.name.toLowerCase() === cleanBrandName.toLowerCase());

    const newStore: StorePortfolioItem = {
      id: newId,
      storeOperationId: autoOpId,
      storeName: cleanStoreName,
      storeOperation: cleanStoreName,
      brandName: cleanBrandName,
      platform: quickPlatform,
      servicePackage: 'E2E-S',
      serviceModel: 'FULL_SERVICE',
      difficultyTier: 'Tiêu chuẩn',
      difficultyMultiplier: 1.0,
      accountStatus: 'ACTIVE',
      operationStatus: 'Live',
      category: brandObj?.category || 'Tiêu dùng & Bán lẻ',
      monthlyTargetGmv: 0,
      monthlyBudget: 0,
      budgetNet: 0,
      accountOwnerName: brandObj?.accountPic || 'Chưa phân công',
      b2cOwnerName: brandObj?.bookingPicLead || 'Chưa phân công',
      bookingLeader: undefined,
      hasBookingLeader: false,
      growthPic: brandObj?.growthPic || 'Chưa phân công',
      contentPic: 'Media Team',
      mediaPic: 'Media Team',
      isB2cManaged: true,
      requiresB2cPlan: true,
      targetAffiliateContents: 0,
      targetSelfChannelContents: 0,
      targetFocVideos: 0,
      assignmentNotes: '',
      updatedAt: new Date().toISOString()
    };

    setStores(prev => [newStore, ...prev]);
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(newStore);
    if (onNotify) {
      onNotify(`Đã thêm vào bản nháp gian hàng [${cleanStoreName}] thuộc thương hiệu [${cleanBrandName}] vào Master Data!`, 'success');
    }
    setIsQuickAddModalOpen(false);
    setQuickStoreName('');
  };

  const handleOpenEdit = (s: StorePortfolioItem) => {
    setEditingStore(s);
    setForm({
      storeName: s.storeName,
      storeOperationId: s.storeOperationId || s.id,
      brandName: s.brandName,
      platform: s.platform,
      servicePackage: s.servicePackage || 'E2E-S',
      accountOwnerName: s.accountOwnerName || '',
      growthPic: s.growthPic || '',
      b2cOwnerName: s.b2cOwnerName || (s.b2cOwners ? s.b2cOwners.join(', ') : ''),
      bookingLeader: s.bookingLeader || '',
      hasBookingLeader: !!(s.hasBookingLeader && s.bookingLeader),
      contentPic: s.contentPic || '',
      mediaPic: s.mediaPic || '',
      backupOwnerName: s.backupOwnerName || '',
      isBackupActive: s.isBackupActive || false,
      backupReason: s.backupReason || '',
      isB2cManaged: s.isB2cManaged !== false,
      requiresB2cPlan: s.requiresB2cPlan !== false,
      storeUrl: s.storeUrl || '',
      operationStatus: s.operationStatus || (s.accountStatus === 'ACTIVE' ? 'Live' : 'Off'),
      platformStoreId: s.platformStoreId || '',
      affiliateRate: s.affiliateRate || 15,
      requiresSparkAds: s.requiresSparkAds || false,
      monthlyBudget: s.budgetNet ?? s.monthlyBudget ?? 0,
      monthlyTargetGmv: s.monthlyTargetGmv ?? 0,
      targetAffiliateContents: s.targetAffiliateContents ?? 0,
      targetSelfChannelContents: s.targetSelfChannelContents ?? 0,
      targetFocVideos: s.targetFocVideos ?? 0,
      assignmentNotes: s.assignmentNotes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    e.preventDefault();
    if (!editingStore || !form.storeName.trim()) return;

    const opStatus = form.operationStatus;
    const accStatus = opStatus === 'Live' ? 'ACTIVE' : (opStatus === 'Off' ? 'OFFBOARDED' : 'MAINTENANCE');
    const isLeaderSet = !!(form.bookingLeader && form.bookingLeader.trim() !== '');

    const updatedStore: StorePortfolioItem = {
      ...editingStore,
      storeName: form.storeName.trim(),
      storeOperationId: form.storeOperationId.trim() || editingStore.storeOperationId,
      brandName: form.brandName,
      platform: form.platform,
      servicePackage: form.servicePackage,
      accountOwnerName: form.accountOwnerName.trim() || editingStore.accountOwnerName,
      growthPic: form.growthPic.trim() || editingStore.growthPic,
      b2cOwnerName: form.b2cOwnerName.trim() || editingStore.b2cOwnerName,
      bookingLeader: isLeaderSet ? form.bookingLeader.trim() : undefined,
      hasBookingLeader: isLeaderSet,
      contentPic: form.contentPic.trim() || editingStore.contentPic,
      mediaPic: form.mediaPic.trim() || editingStore.mediaPic,
      backupOwnerName: form.backupOwnerName.trim() || undefined,
      isBackupActive: form.isBackupActive,
      backupReason: form.backupReason.trim() || undefined,
      isB2cManaged: form.isB2cManaged,
      requiresB2cPlan: form.requiresB2cPlan,
      storeUrl: form.storeUrl.trim() || editingStore.storeUrl,
      operationStatus: opStatus,
      accountStatus: accStatus,
      platformStoreId: form.platformStoreId.trim() || undefined,
      affiliateRate: Number(form.affiliateRate) || undefined,
      requiresSparkAds: form.requiresSparkAds,
      monthlyBudget: Number(form.monthlyBudget) || 0,
      budgetNet: Number(form.monthlyBudget) || 0,
      monthlyTargetGmv: Number(form.monthlyTargetGmv) || 0,
      targetAffiliateContents: Number(form.targetAffiliateContents) || 0,
      targetSelfChannelContents: Number(form.targetSelfChannelContents) || 0,
      targetFocVideos: Number(form.targetFocVideos) || 0,
      assignmentNotes: form.assignmentNotes.trim() || editingStore.assignmentNotes,
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === editingStore.id ? updatedStore : s));
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(updatedStore);
    if (onNotify) onNotify(`Đã sửa bản nháp: gian hàng [${form.storeName}]`, 'success');
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleOffboardStore = (store: StorePortfolioItem) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    const updated: StorePortfolioItem = {
      ...store,
      operationStatus: 'Off',
      accountStatus: 'OFFBOARDED',
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (canEdit && !onStoresChange && onUpdateStore) onUpdateStore(updated);
    if (onNotify) onNotify(`Đã chuyển gian hàng [${store.storeName}] sang trạng thái Offboarded (Lưu trữ an toàn)`, 'info');
    setDeletingStore(null);
  };

  const handleHardDeleteStore = (store: StorePortfolioItem) => {
    if (!canEdit) { onNotify?.("Bạn không có quyền sửa danh mục.", "warning"); return; }
    setStores(prev => prev.filter(s => s.id !== store.id));
    if (onNotify) onNotify(`Đã đánh dấu xóa: vĩnh viễn gian hàng [${store.storeName}] khỏi danh mục`, 'warning');
    setDeletingStore(null);
  };

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const moreFilterCount =
    Number(selectedBudgetStatus !== 'ALL') +
    Number(selectedTeamStructure !== 'ALL') +
    Number(selectedStatus !== 'ALL') +
    Number(selectedPackage !== 'ALL') +
    Number(selectedB2cPlan !== 'ALL');

  const isFiltered =
    Boolean(search.trim()) ||
    selectedBrand !== 'ALL' ||
    selectedPlatform !== 'ALL' ||
    selectedOwner !== 'ALL' ||
    moreFilterCount > 0;

  const platformChips = (['ALL', 'TikTok Shop', 'Shopee Mall', 'Lazada'] as const).map((p) => ({
    key: p,
    label: p === 'ALL' ? 'Tất cả sàn' : p,
    count: stores.filter((s) => p === 'ALL' || s.platform === p).length,
  }));

  const issueChips = [
    { key: 'OVERBUDGET' as const, label: 'Bội chi', count: overbudgetStores.length },
    { key: 'WITH_LEADER' as const, label: 'Có Leader', count: withLeaderCount },
    { key: 'DIRECT_TO_LEAD' as const, label: 'Trực tiếp Lead', count: directLeadCount },
    { key: 'OFF' as const, label: 'Offboard', count: offCount },
  ];

  const columns: Column<StorePortfolioItem>[] = [
    {
      key: 'store',
      header: 'Gian hàng & Mã',
      width: 220,
      render: (s) => (
        <div className="leading-tight min-w-0">
          <span className="font-medium text-ink block truncate group-hover:text-primary transition-colors">
            {s.storeName}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-2xs font-mono text-ink-3">
            <span className="font-semibold text-ink-2">{s.storeOperationId || s.id}</span>
            <span>•</span>
            <span>{s.servicePackage || 'E2E-S'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'platform',
      header: 'Nền tảng',
      width: 130,
      render: (s) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ChannelTag channel={s.platform} />
          {s.storeUrl && (
            <a
              href={s.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-ink-3 hover:text-ink transition-colors"
              title="Mở link gian hàng sàn"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Thương hiệu',
      width: 160,
      render: (s) => (
        <div className="leading-tight min-w-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              if (onNavigateToBrandProfile) onNavigateToBrandProfile(s.brandName);
            }}
            className="font-medium text-ink hover:text-primary hover:underline flex items-center gap-1 text-xs cursor-pointer truncate"
            title="Xem hồ sơ thương hiệu"
          >
            <Building2 className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span className="truncate">{s.brandName}</span>
          </button>
          <div className="text-2xs text-ink-3 mt-0.5 truncate">{s.category || 'Tiêu dùng'}</div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Hạn mức Net',
      align: 'right',
      width: 140,
      render: (s) => {
        const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
        const spent = getStoreActualSpent(s);
        const isStoreOverbudget = bNet > 0 && spent > bNet;
        const burnPct = bNet > 0 ? (spent / bNet) * 100 : 0;
        return (
          <div className="leading-tight tabular-nums">
            <span className="font-medium text-ink block">{formatVndShort(bNet)}</span>
            {bNet > 0 ? (
              <div className="mt-1">
                <div className="w-full bg-sunken rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isStoreOverbudget ? 'bg-critical' : burnPct > 80 ? 'bg-warning' : 'bg-positive'
                    }`}
                    style={{ width: `${Math.min(100, burnPct)}%` }}
                  />
                </div>
                <div className="text-2xs text-ink-3 mt-0.5 font-mono">
                  Đã duyệt: {formatVndShort(spent)} ({burnPct.toFixed(0)}%)
                </div>
              </div>
            ) : (
              <span className="text-2xs text-ink-3">FOC (0đ)</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'video',
      header: 'Chỉ tiêu Video',
      align: 'center',
      width: 115,
      render: (s) => (
        <div className="leading-tight font-mono">
          <span className="font-medium text-ink block">
            {(s.targetAffiliateContents || 0) + (s.targetSelfChannelContents || 0)}
          </span>
          <span className="text-2xs text-ink-3 block">
            {s.targetAffiliateContents || 0} Aff • {s.targetSelfChannelContents || 0} Self
          </span>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Đội ngũ phụ trách',
      width: 175,
      render: (s) => {
        const hasLeaderTeam = s.hasBookingLeader && !!s.bookingLeader;
        return (
          <div className="space-y-0.5 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-2xs text-ink-3">PIC:</span>
              <span className="font-medium text-ink text-xs">{s.b2cOwnerName || s.primaryPic || 'Chưa gán'}</span>
            </div>
            <span className="block text-2xs text-ink-3">
              {hasLeaderTeam ? `Leader: ${s.bookingLeader}` : 'Trực tiếp Lead B2C'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'financialAlert',
      header: 'Tài chính',
      align: 'center',
      width: 110,
      render: (s) => {
        const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
        const spent = getStoreActualSpent(s);
        const isStoreOverbudget = bNet > 0 && spent > bNet;
        const isStoreUnbudgeted = bNet === 0 && spent > 0;
        if (isStoreOverbudget) return <span className="text-xs font-medium text-critical">Bội chi</span>;
        if (isStoreUnbudgeted) return <span className="text-xs font-medium text-warning">Chi ngoài KH</span>;
        if (bNet === 0) return <span className="text-xs text-ink-3">Chỉ gửi mẫu</span>;
        return <span className="text-xs text-ink-3">Đúng hạn mức</span>;
      },
    },
    {
      key: 'b2cPlan',
      header: 'B2C & Plan',
      align: 'center',
      width: 105,
      render: (s) => (
        <div className="flex flex-col items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleToggleB2cManaged(s)}
            className={`text-2xs transition cursor-pointer ${
              s.isB2cManaged !== false
                ? 'font-medium text-accent hover:underline'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {s.isB2cManaged !== false ? 'B2C Quản lý' : 'Bỏ qua'}
          </button>
          <button
            type="button"
            onClick={() => handleToggleRequiresPlan(s)}
            className={`text-2xs transition cursor-pointer ${
              s.requiresB2cPlan !== false
                ? 'font-medium text-ink-2 hover:underline'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            {s.requiresB2cPlan !== false ? 'Cần Plan' : 'Miễn Plan'}
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      width: 80,
      render: (s) => (
        <Status tone={s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE' ? 'positive' : 'neutral'}>
          {s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE' ? 'Live' : 'Off'}
        </Status>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 48,
      render: (s) => (
        <ActionMenu
          items={[
            {
              label: 'Hồ sơ gian hàng',
              icon: Store,
              onSelect: () => {
                if (onNavigateToStoreManagement) onNavigateToStoreManagement(s.storeName);
                else setSelectedStoreForDetail(s);
              },
            },
            {
              label: 'Chi tiết gian hàng',
              icon: Eye,
              onSelect: () => setSelectedStoreForDetail(s),
            },
            {
              label: 'Bàn giao PIC',
              icon: UserCheck,
              onSelect: () => handleOpenHandover(s),
            },
            {
              label: 'Sửa thông số',
              icon: Edit3,
              onSelect: () => handleOpenEdit(s),
            },
            {
              label: 'Offboard gian hàng',
              icon: Archive,
              onSelect: () => handleOffboardStore(s),
            },
            {
              label: 'Xóa vĩnh viễn',
              icon: Trash2,
              onSelect: () => setDeletingStore(s),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageActions>
        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Thêm gian hàng
        </Button>
      </PageActions>

      <Panel flush>
        <div className="p-4 border-b border-line grid gap-2.5">
          <FilterBar
            search={{
              value: search,
              onChange: (v) => {
                setSearch(v);
                setPage(1);
              },
              placeholder: 'Tìm gian hàng, mã SO-B2C-xxx, brand, PIC...',
            }}
            filters={
              <>
                <Select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Nhãn hàng"
                  className="w-auto"
                >
                  <option value="ALL">Mọi nhãn hàng ({uniqueBrands.length})</option>
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>

                <Select
                  value={selectedPlatform}
                  onChange={(e) => {
                    setSelectedPlatform(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Sàn"
                  className="w-auto"
                >
                  <option value="ALL">Mọi sàn ({stores.length})</option>
                  <option value="TikTok Shop">TikTok Shop ({tiktokCount})</option>
                  <option value="Shopee Mall">Shopee Mall ({shopeeCount})</option>
                  <option value="Lazada">Lazada ({lazadaCount})</option>
                </Select>

                <Select
                  value={selectedOwner}
                  onChange={(e) => {
                    setSelectedOwner(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Chuyên viên"
                  className="w-auto"
                >
                  <option value="ALL">Mọi chuyên viên ({accountOwners.length})</option>
                  {accountOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </Select>

                <Button
                  variant={showMoreFilters || moreFilterCount > 0 ? 'secondary' : 'ghost'}
                  icon={SlidersHorizontal}
                  aria-expanded={showMoreFilters}
                  onClick={() => setShowMoreFilters((v) => !v)}
                >
                  Lọc khác{moreFilterCount > 0 ? ` (${moreFilterCount})` : ''}
                </Button>

                {isFiltered && (
                  <Button variant="ghost" onClick={handleResetFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </>
            }
            resultCount={isFiltered ? filteredStores.length : undefined}
          />

          {showMoreFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedBudgetStatus}
                onChange={(e) => {
                  setSelectedBudgetStatus(e.target.value as 'ALL' | 'HAS_BUDGET' | 'ZERO_BUDGET' | 'OVERBUDGET');
                  setPage(1);
                }}
                aria-label="Ngân sách"
                className="w-auto"
              >
                <option value="ALL">Mọi ngân sách</option>
                <option value="HAS_BUDGET">Có ngân sách &gt; 0đ</option>
                <option value="ZERO_BUDGET">Hạn mức 0đ</option>
                <option value="OVERBUDGET">Bội chi ({overbudgetStores.length})</option>
              </Select>

              <Select
                value={selectedTeamStructure}
                onChange={(e) => {
                  setSelectedTeamStructure(e.target.value as 'ALL' | 'WITH_LEADER' | 'DIRECT_TO_LEAD');
                  setPage(1);
                }}
                aria-label="Cơ cấu"
                className="w-auto"
              >
                <option value="ALL">Mọi cơ cấu</option>
                <option value="WITH_LEADER">Có Leader sơ duyệt ({withLeaderCount})</option>
                <option value="DIRECT_TO_LEAD">Trực tiếp Trưởng phòng ({directLeadCount})</option>
              </Select>

              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                aria-label="Trạng thái"
                className="w-auto"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="Live">Live ({liveCount})</option>
                <option value="Off">Off ({offCount})</option>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Chips
              label="Sàn"
              items={platformChips}
              value={selectedPlatform}
              onChange={(val) => {
                setSelectedPlatform(val);
                setPage(1);
              }}
            />
            <Chips
              label="Cần xử lý"
              items={issueChips}
              value={
                selectedBudgetStatus === 'OVERBUDGET'
                  ? 'OVERBUDGET'
                  : selectedTeamStructure === 'WITH_LEADER'
                    ? 'WITH_LEADER'
                    : selectedTeamStructure === 'DIRECT_TO_LEAD'
                      ? 'DIRECT_TO_LEAD'
                      : selectedStatus === 'Off'
                        ? 'OFF'
                        : ''
              }
              onChange={(k) => {
                if (k === 'OVERBUDGET') setSelectedBudgetStatus(selectedBudgetStatus === 'OVERBUDGET' ? 'ALL' : 'OVERBUDGET');
                else if (k === 'WITH_LEADER') setSelectedTeamStructure(selectedTeamStructure === 'WITH_LEADER' ? 'ALL' : 'WITH_LEADER');
                else if (k === 'DIRECT_TO_LEAD') setSelectedTeamStructure(selectedTeamStructure === 'DIRECT_TO_LEAD' ? 'ALL' : 'DIRECT_TO_LEAD');
                else if (k === 'OFF') setSelectedStatus(selectedStatus === 'Off' ? 'ALL' : 'Off');
                setPage(1);
              }}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={currentStores}
          rowKey={(s) => s.id}
          onRowClick={(s) => setSelectedStoreForDetail(s)}
          stickyLast
          empty={
            <EmptyState
              title={stores.length === 0 ? 'Chưa có gian hàng nào' : 'Không có gian hàng khớp bộ lọc'}
              description={
                stores.length === 0
                  ? 'Khai báo gian hàng đầu tiên để quản lý danh mục và phân bổ chỉ tiêu.'
                  : 'Bỏ bớt điều kiện lọc hoặc tìm kiếm theo từ khóa khác.'
              }
              action={
                stores.length === 0 ? (
                  <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
                    Thêm gian hàng
                  </Button>
                ) : (
                  <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>
                )
              }
            />
          }
        />

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filteredStores.length}
          onPageChange={setPage}
        />
      </Panel>

      {/* 4. MODAL: CHI TIẾT CHUYÊN SÂU GIAN HÀNG (STORE DETAIL MODAL) */}
      <Presence show={!!selectedStoreForDetail}>
      {selectedStoreForDetail && (
        <StoreDetailModal
          store={selectedStoreForDetail}
          isOpen={!!selectedStoreForDetail}
          onClose={() => setSelectedStoreForDetail(null)}
          brand={brands.find(b => b.name.toLowerCase() === selectedStoreForDetail.brandName.toLowerCase())}
          deals={deals}
          onNavigateToBrandProfile={onNavigateToBrandProfile}
          onNavigateToStoreManagement={onNavigateToStoreManagement}
          onOpenEdit={handleOpenEdit}
          onOpenHandover={handleOpenHandover}
        />
      )}
      </Presence>

      {/* 5. MODAL: LẬP LỆNH BÀN GIAO GIỮA KỲ */}
      <Presence show={!!handoverStore}>
      {handoverStore && (
        <StoreHandoverModal
          store={handoverStore}
          isOpen={!!handoverStore}
          onClose={() => setHandoverStore(null)}
          onConfirmHandover={handleConfirmHandover}
        />
      )}
      </Presence>

      {/* 6. MODAL: TẠO GIAN HÀNG MASTER DATA (CHỈ KHAI BÁO THUỘC BRAND NÀO & SÀN) */}
      <Presence show={!!isQuickAddModalOpen}>
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-xl border border-line max-w-lg w-full p-5 space-y-4 my-auto animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sunken text-ink flex items-center justify-center font-semibold">
                  <Store className="w-5 h-5 text-ink-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-ink">
                    Thêm Gian Hàng Mới (Dữ Liệu Gốc)
                  </h3>
                  
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="text-ink-3 hover:text-ink-2 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStore} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-ink-2 font-semibold mb-1">
                  Tên gian hàng vận hành *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: ClubClio TikTok Shop, Kutieskin Shopee Mall..."
                  value={quickStoreName}
                  onChange={(e) => setQuickStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:border-line-strong text-xs bg-canvas"
                  autoFocus
                />
                <p className="text-2xs text-ink-3 mt-1">
                  Định danh chính xác gian hàng trên sàn để liên kết đối soát hợp đồng và booking.
                </p>
              </div>

              <div>
                <label className="block text-ink-2 font-semibold mb-1">
                  Thuộc Thương hiệu (Brand chủ quản) *
                </label>
                <select
                  value={quickBrandName}
                  onChange={(e) => setQuickBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-xl bg-white focus:outline-none focus:border-line-strong font-medium text-xs text-ink"
                >
                  {uniqueBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <p className="text-2xs text-ink-3 mt-1">
                  Gian hàng sẽ được gắn vào nhãn hàng để quản lý hạn mức ngân sách và quy chuẩn nội dung.
                </p>
              </div>

              <div>
                <label className="block text-ink-2 font-semibold mb-1">
                  Sàn / Nền tảng vận hành *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TikTok Shop', 'Shopee Mall', 'Lazada'] as const).map(p => {
                    const isSelected = quickPlatform === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setQuickPlatform(p)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-ink text-white border-line-strong shadow-xs'
                            : 'bg-white text-ink-2 border-line hover:bg-canvas'
                        }`}
                      >
                        <ChannelTag channel={p} />
                      </button>
                    );
                  })}
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="px-4 py-2 border border-line rounded-xl text-ink-2 hover:bg-canvas transition text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!quickStoreName.trim()}
                  className="px-4 py-2 bg-ink hover:bg-ink disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo gian hàng vào Master Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* 7. MODAL: SỬA THÔNG SỐ GIAN HÀNG */}
      <Presence show={!!(isModalOpen && editingStore)}>
      {isModalOpen && editingStore && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-xl border border-line max-w-2xl w-full p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="font-semibold text-sm text-ink">
                  Cập nhật Gian hàng [{editingStore.storeName}]
                </h3>
                
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStore(null);
                }}
                className="text-ink-3 hover:text-ink-2 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Group 1: Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Tên gian hàng vận hành *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Brand_Platform_Service"
                    value={form.storeName}
                    onChange={(e) => setForm(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:border-line-strong"
                  />
                </div>

                <div>
                  <label className="block text-ink-2 font-medium mb-1">Mã vận hành Upbase (SO ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SO-B2C-001"
                    value={form.storeOperationId}
                    onChange={(e) => setForm(prev => ({ ...prev, storeOperationId: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                  />
                </div>
              </div>

              {/* Group 2: Brand & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Thuộc Thương hiệu</label>
                  <select
                    value={form.brandName}
                    onChange={(e) => setForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:border-line-strong font-medium"
                  >
                    {uniqueBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ink-2 font-medium mb-1">Nền tảng sàn</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm(prev => ({ ...prev, platform: e.target.value as StorePortfolioItem['platform'] }))}
                    className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:border-line-strong"
                  >
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-2 font-medium mb-1">Trạng thái vận hành</label>
                  <select
                    value={form.operationStatus}
                    onChange={(e) => setForm(prev => ({ ...prev, operationStatus: e.target.value as NonNullable<StorePortfolioItem['operationStatus']> }))}
                    className="w-full px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:border-line-strong font-medium"
                  >
                    <option value="Live">Live (Đang chạy)</option>
                    <option value="Off">Off (Dừng hợp tác)</option>
                    <option value="Kênh nội bộ">Kênh nội bộ</option>
                  </select>
                </div>
              </div>

              {/* Group 3: Technical parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-ink-2 font-medium mb-1">Gói dịch vụ</label>
                  <input
                    type="text"
                    placeholder="VD: E2E-S, Live-S..."
                    value={form.servicePackage}
                    onChange={(e) => setForm(prev => ({ ...prev, servicePackage: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:border-line-strong"
                  />
                </div>

                <div>
                  <label className="block text-ink-2 font-medium mb-1">Shop ID sàn kỹ thuật</label>
                  <input
                    type="text"
                    placeholder="VD: TTS_VN_839219"
                    value={form.platformStoreId}
                    onChange={(e) => setForm(prev => ({ ...prev, platformStoreId: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                  />
                </div>

                <div>
                  <label className="block text-ink-2 font-medium mb-1">Hoa hồng Affiliate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.affiliateRate}
                    onChange={(e) => setForm(prev => ({ ...prev, affiliateRate: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                  />
                </div>
              </div>

              {/* Spark Ads check & Store URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-ink-2 font-medium mb-1">Link gian hàng sàn (URL)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.storeUrl}
                    onChange={(e) => setForm(prev => ({ ...prev, storeUrl: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:border-line-strong"
                  />
                </div>

                <div className="pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresSparkAds}
                      onChange={(e) => setForm(prev => ({ ...prev, requiresSparkAds: e.target.checked }))}
                      className="rounded border-line-strong text-accent focus:ring-accent/20"
                    />
                    <span className="text-2xs text-ink-2 font-medium">Bắt buộc ủy quyền mã Ads</span>
                  </label>
                </div>
              </div>

              {/* Group 4: Order Budget & Targets */}
              <div className="pt-2 border-t border-line space-y-2">
                <span className="text-xs font-semibold text-ink block">
                  Hạn mức Kế hoạch Tháng
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-ink-2 text-2xs font-semibold mb-1">
                      Hạn mức Net Kế toán duyệt (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      value={form.monthlyBudget}
                      onChange={(e) => setForm(prev => ({ ...prev, monthlyBudget: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-2 text-2xs font-semibold mb-1">
                      Mục tiêu Doanh số NMV (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      value={form.monthlyTargetGmv}
                      onChange={(e) => setForm(prev => ({ ...prev, monthlyTargetGmv: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-2 text-2xs font-semibold mb-1">
                      Target Video Affiliate
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.targetAffiliateContents}
                      onChange={(e) => setForm(prev => ({ ...prev, targetAffiliateContents: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                    />
                  </div>

                  <div>
                    <label className="block text-ink-2 text-2xs font-semibold mb-1">
                      Target Video Kênh Brand
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.targetSelfChannelContents}
                      onChange={(e) => setForm(prev => ({ ...prev, targetSelfChannelContents: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-line rounded-lg font-mono focus:outline-none focus:border-line-strong"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Team Organization */}
              <div className="pt-2 border-t border-line space-y-2.5">
                <div className="text-xs font-semibold text-ink flex items-center justify-between">
                  <span>Cơ cấu Nhân sự Phụ trách (2 Tầng)</span>
                  <span className="text-2xs text-ink-3 font-normal">Trưởng phòng: Đặng Thị Yến Nhi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StaffSearchSelect
                    label="Chuyên viên Booking chính (Specialist PIC) *"
                    sublabel="(Trực tiếp chạy deal và chịu trách nhiệm nghiệm thu)"
                    badgeColorClass="text-accent"
                    placeholder="Chọn chuyên viên B2C..."
                    value={form.b2cOwnerName}
                    departmentHint="BOOKING"
                    onChange={(name) => setForm(prev => ({ ...prev, b2cOwnerName: name }))}
                  />

                  <div>
                    <label className="block text-ink-2 font-medium mb-1 text-2xs">
                      Trưởng nhóm Booking (Leader phụ trách)
                    </label>
                    <select
                      value={form.bookingLeader}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          bookingLeader: val,
                          hasBookingLeader: val !== ''
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-line rounded-lg text-xs bg-white focus:outline-none focus:border-line-strong"
                    >
                      <option value="">Không có leader (Chuyên viên làm việc trực tiếp Trưởng phòng)</option>
                      <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Trưởng nhóm 8 gian)</option>
                    </select>
                    <p className="text-2xs text-ink-3 mt-0.5">
                      Theo quy chuẩn B2C: Chỉ có 8 gian hàng có Trưởng nhóm sơ duyệt, các gian còn lại làm việc trực tiếp Trưởng phòng.
                    </p>
                  </div>

                  <StaffSearchSelect
                    label="Growth PIC (Bộ phận Tăng trưởng sàn)"
                    sublabel="(Giao chỉ tiêu và đối soát NMV)"
                    badgeColorClass="text-positive"
                    placeholder="Chọn Growth PIC..."
                    value={form.growthPic}
                    departmentHint="GROWTH"
                    onChange={(name) => setForm(prev => ({ ...prev, growthPic: name }))}
                  />

                  <StaffSearchSelect
                    label="Account PIC (Quan hệ Brand)"
                    sublabel="(Quản lý hợp đồng tổng thể)"
                    badgeColorClass="text-accent"
                    placeholder="Chọn Account PIC..."
                    value={form.accountOwnerName}
                    departmentHint="ACCOUNT"
                    onChange={(name) => setForm(prev => ({ ...prev, accountOwnerName: name }))}
                  />
                </div>
              </div>

              {/* Group 6: Scope */}
              <div className="pt-2 border-t border-line">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-canvas p-2.5 rounded-lg border border-line text-2xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isB2cManaged}
                      onChange={(e) => setForm(prev => ({ ...prev, isB2cManaged: e.target.checked }))}
                      className="mt-0.5 rounded border-line-strong text-accent focus:ring-accent/20"
                    />
                    <div>
                      <span className="font-semibold text-ink">Marketing B2C phụ trách</span>
                      <p className="text-ink-3 text-2xs">Tính vào danh mục đối soát của phòng B2C</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresB2cPlan}
                      onChange={(e) => setForm(prev => ({ ...prev, requiresB2cPlan: e.target.checked }))}
                      className="mt-0.5 rounded border-line-strong text-positive focus:ring-positive/20"
                    />
                    <div>
                      <span className="font-semibold text-ink">Yêu cầu lập Kế hoạch tháng</span>
                      <p className="text-ink-3 text-2xs">Phải có bản phân rã Input plan hàng tuần</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-line rounded-xl text-ink-2 hover:bg-canvas transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-ink hover:bg-ink text-white font-semibold rounded-xl transition shadow-xs"
                >
                  Lưu thông tin gian hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Presence>

      {/* 7. MODAL: XÓA / OFFBOARD GIAN HÀNG */}
      <Presence show={!!deletingStore}>
      {deletingStore && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-2xl border border-line max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-critical-soft text-critical flex items-center justify-center shrink-0 border border-critical/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-ink">Xác nhận xử lý gian hàng</h3>
                <p className="text-2xs text-ink-3 mt-0.5">
                  Mã gian hàng: <span className="font-mono font-semibold text-ink">{deletingStore.storeOperationId || deletingStore.id}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-canvas rounded-xl border border-line space-y-1.5 text-xs">
              <div className="font-semibold text-ink">{deletingStore.storeName}</div>
              <div className="text-ink-3 text-2xs flex items-center gap-2">
                <span>{deletingStore.brandName}</span>
                <span>•</span>
                <span>{deletingStore.platform}</span>
                <span>•</span>
                <span className="font-medium text-ink-2">{deletingStore.servicePackage || 'E2E-S'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-ink-2">
              <p>Khuyến nghị an toàn từ hệ thống Upbase:</p>
              <button
                type="button"
                onClick={() => handleOffboardStore(deletingStore)}
                className="w-full py-2.5 px-3 rounded-xl border border-accent/20 bg-accent-soft hover:bg-accent-soft text-accent font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-accent" />
                <span>Chuyển sang &quot;Off / Dừng hợp tác&quot; (Khuyên dùng)</span>
              </button>
              <p className="text-2xs text-ink-3">
                Lưu trữ gian hàng giữ toàn bộ dữ liệu báo cáo GMV và lịch sử booking của nhãn hàng.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setDeletingStore(null)}
                className="px-3.5 py-1.5 border border-line rounded-xl text-ink-2 hover:bg-canvas transition text-xs font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleHardDeleteStore(deletingStore)}
                className="px-4 py-1.5 bg-critical hover:bg-critical text-white font-semibold rounded-xl transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
      </Presence>
    </div>
  );
};
