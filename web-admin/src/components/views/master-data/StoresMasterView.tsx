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
  Building2
} from 'lucide-react';
import { ChannelTag, Presence } from '../../ui';
import { StorePortfolioItem, BrandDetail, BookingDealItem } from '../../../lib/types';
import { StaffSearchSelect } from './StaffSearchSelect';
import { StoreDetailModal } from './StoreDetailModal';
import { StoreHandoverModal } from './StoreHandoverModal';
import { formatVndShort } from '../../../lib/format';
import { INITIAL_DEALS } from '../../../lib/mockData';

interface StoresMasterViewProps {
  initialStores: StorePortfolioItem[];
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
  brandNames,
  brands = [],
  deals = INITIAL_DEALS,
  onNotify,
  onUpdateStore,
  onNavigateToBrandProfile,
  onNavigateToStoreManagement
}) => {
  const [stores, setStores] = useState<StorePortfolioItem[]>(initialStores);
  const [prevInitialStores, setPrevInitialStores] = useState<StorePortfolioItem[]>(initialStores);
  if (initialStores !== prevInitialStores) {
    setPrevInitialStores(initialStores);
    setStores(initialStores);
  }

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

  const isFiltered = search.trim() !== '' || 
    selectedBrand !== 'ALL' || 
    selectedPlatform !== 'ALL' || 
    selectedPackage !== 'ALL' || 
    selectedStatus !== 'ALL' || 
    selectedOwner !== 'ALL' || 
    selectedB2cPlan !== 'ALL' ||
    selectedTeamStructure !== 'ALL' ||
    selectedBudgetStatus !== 'ALL';

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
    const updated: StorePortfolioItem = {
      ...store,
      isB2cManaged: !store.isB2cManaged,
      requiresB2cPlan: !store.isB2cManaged ? (store.requiresB2cPlan ?? true) : false,
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (onUpdateStore) onUpdateStore(updated);
    if (onNotify) {
      onNotify(`Đã ${updated.isB2cManaged ? 'bật' : 'tắt'} Marketing B2C phụ trách cho [${store.storeName}]`);
    }
  };

  const handleToggleRequiresPlan = (store: StorePortfolioItem) => {
    const updated: StorePortfolioItem = {
      ...store,
      requiresB2cPlan: !store.requiresB2cPlan,
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (onUpdateStore) onUpdateStore(updated);
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
    if (onUpdateStore) onUpdateStore(updatedStore);
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
    if (onUpdateStore) onUpdateStore(newStore);
    if (onNotify) {
      onNotify(`Đã thêm gian hàng [${cleanStoreName}] thuộc thương hiệu [${cleanBrandName}] vào Master Data!`, 'success');
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
    if (onUpdateStore) onUpdateStore(updatedStore);
    if (onNotify) onNotify(`Đã cập nhật gian hàng [${form.storeName}]`, 'success');
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleOffboardStore = (store: StorePortfolioItem) => {
    const updated: StorePortfolioItem = {
      ...store,
      operationStatus: 'Off',
      accountStatus: 'OFFBOARDED',
      updatedAt: new Date().toISOString()
    };
    setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    if (onUpdateStore) onUpdateStore(updated);
    if (onNotify) onNotify(`Đã chuyển gian hàng [${store.storeName}] sang trạng thái Offboarded (Lưu trữ an toàn)`, 'info');
    setDeletingStore(null);
  };

  const handleHardDeleteStore = (store: StorePortfolioItem) => {
    setStores(prev => prev.filter(s => s.id !== store.id));
    if (onNotify) onNotify(`Đã xóa vĩnh viễn gian hàng [${store.storeName}] khỏi danh mục`, 'warning');
    setDeletingStore(null);
  };

  return (
    <div className="space-y-3">
      {/* Filter and Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm gian hàng, mã SO-B2C-xxx, brand, PIC..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-slate-800 bg-white"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi nhãn hàng ({uniqueBrands.length})</option>
            {uniqueBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={selectedPlatform}
            onChange={(e) => {
              setSelectedPlatform(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi sàn ({stores.length})</option>
            <option value="TikTok Shop">TikTok Shop ({tiktokCount})</option>
            <option value="Shopee Mall">Shopee Mall ({shopeeCount})</option>
            <option value="Lazada">Lazada ({lazadaCount})</option>
          </select>

          <select
            value={selectedOwner}
            onChange={(e) => {
              setSelectedOwner(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi chuyên viên ({accountOwners.length})</option>
            {accountOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>

          <select
            value={selectedBudgetStatus}
            onChange={(e) => {
              setSelectedBudgetStatus(e.target.value as 'ALL' | 'HAS_BUDGET' | 'ZERO_BUDGET' | 'OVERBUDGET');
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi ngân sách</option>
            <option value="HAS_BUDGET">Có ngân sách &gt; 0đ</option>
            <option value="ZERO_BUDGET">Hạn mức 0đ</option>
            <option value="OVERBUDGET">Bội chi ({overbudgetStores.length})</option>
          </select>

          <select
            value={selectedTeamStructure}
            onChange={(e) => {
              setSelectedTeamStructure(e.target.value as 'ALL' | 'WITH_LEADER' | 'DIRECT_TO_LEAD');
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi cơ cấu</option>
            <option value="WITH_LEADER">Có Leader sơ duyệt ({withLeaderCount})</option>
            <option value="DIRECT_TO_LEAD">Trực tiếp Trưởng phòng ({directLeadCount})</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="Live">Live ({liveCount})</option>
            <option value="Off">Off ({offCount})</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-1 px-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm gian hàng
        </button>
      </div>

      {/* 3. STORES MASTER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
              <tr>
                <th className="py-3 px-4 min-w-[210px]">Gian hàng & Mã vận hành</th>
                <th className="py-3 px-3 w-[110px]">Nền tảng</th>
                <th className="py-3 px-4 w-[160px]">Thuộc Thương hiệu</th>
                <th className="py-3 px-4 text-right w-[150px]">Hạn mức Order Net</th>
                <th className="py-3 px-3 text-center w-[110px]">Chỉ tiêu Video</th>
                <th className="py-3 px-4 min-w-[210px]">Đội ngũ phụ trách</th>
                <th className="py-3 px-3 text-center w-[120px]">Cảnh báo Tài chính</th>
                <th className="py-3 px-3 text-center w-[110px]">B2C & Plan</th>
                <th className="py-3 px-3 text-center w-[80px]">Trạng thái</th>
                <th className="py-3 px-4 text-right w-[140px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentStores.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy gian hàng phù hợp với điều kiện lọc
                  </td>
                </tr>
              ) : (
                currentStores.map(s => {
                  const bNet = s.budgetNet ?? s.monthlyBudget ?? 0;
                  const spent = getStoreActualSpent(s);
                  const isStoreOverbudget = bNet > 0 && spent > bNet;
                  const isStoreUnbudgeted = bNet === 0 && spent > 0;
                  const burnPct = bNet > 0 ? (spent / bNet) * 100 : 0;
                  const hasLeaderTeam = s.hasBookingLeader && !!s.bookingLeader;

                  return (
                    <tr 
                      key={s.id} 
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedStoreForDetail(s)}
                    >
                      {/* Gian hàng & Mã SO */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs group-hover:text-blue-700 transition">
                          {s.storeName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-2xs font-mono text-slate-400">
                          <span className="font-semibold text-slate-600">{s.storeOperationId || s.id}</span>
                          <span>•</span>
                          <span className="text-slate-500">{s.servicePackage || 'E2E-S'}</span>
                        </div>
                      </td>

                      {/* Nền tảng */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <ChannelTag channel={s.platform} />
                          {s.storeUrl && (
                            <a
                              href={s.storeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700"
                              title="Mở link gian hàng sàn"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Thuộc Thương hiệu */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToBrandProfile) {
                                onNavigateToBrandProfile(s.brandName);
                              }
                            }}
                            className="font-semibold text-slate-800 hover:text-blue-700 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                            title="Xem hồ sơ thương hiệu"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.brandName}</span>
                          </button>
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5">{s.category || 'Tiêu dùng'}</div>
                      </td>

                      {/* Hạn mức Order Net */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-semibold text-xs text-slate-900">
                          {formatVndShort(bNet)}
                        </div>
                        {bNet > 0 ? (
                          <div className="mt-1">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`data-bar h-full rounded-full ${
                                  isStoreOverbudget ? 'bg-rose-500' : burnPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, burnPct)}%` }}
                              />
                            </div>
                            <div className="text-2xs text-slate-500 mt-0.5 font-mono">
                              Đã duyệt: {formatVndShort(spent)} ({burnPct.toFixed(0)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-2xs font-mono text-blue-600">FOC (0đ)</span>
                        )}
                      </td>

                      {/* Chỉ tiêu Video */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono font-semibold text-xs text-blue-900">
                          {(s.targetAffiliateContents || 0) + (s.targetSelfChannelContents || 0)}
                        </div>
                        <div className="text-2xs text-slate-400 font-mono">
                          {s.targetAffiliateContents || 0} Aff • {s.targetSelfChannelContents || 0} Self
                        </div>
                      </td>

                      {/* Đội ngũ Phụ trách */}
                      <td className="py-3 px-4 text-2xs space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <span className="text-blue-600 font-semibold">PIC:</span>
                          <span className="font-semibold">{s.b2cOwnerName || s.primaryPic || 'Chưa gán'}</span>
                        </div>
                        
                        {hasLeaderTeam ? (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Leader: {s.bookingLeader}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Trực tiếp Lead B2C
                            </span>
                          </div>
                        )}

                        {s.growthPic && (
                          <div className="text-2xs text-slate-500">
                            Growth: {s.growthPic}
                          </div>
                        )}
                      </td>

                      {/* Cảnh báo Tài chính */}
                      <td className="py-3 px-3 text-center">
                        {isStoreOverbudget ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            Bội chi
                          </span>
                        ) : isStoreUnbudgeted ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Chi ngoài KH
                          </span>
                        ) : bNet === 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Chỉ gửi mẫu
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            An toàn
                          </span>
                        )}
                      </td>

                      {/* B2C Quản lý & Plan */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleB2cManaged(s)}
                            title="Bật/tắt Marketing B2C phụ trách"
                            className={`w-20 px-1.5 py-0.5 rounded-full text-2xs font-semibold border transition cursor-pointer ${
                              s.isB2cManaged !== false
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {s.isB2cManaged !== false ? 'B2C Quản lý' : 'Bỏ qua'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleRequiresPlan(s)}
                            title="Bật/tắt yêu cầu lập Plan tháng"
                            className={`w-20 px-1.5 py-0.5 rounded-full text-2xs font-semibold border transition cursor-pointer ${
                              s.requiresB2cPlan !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {s.requiresB2cPlan !== false ? 'Cần Plan' : 'Miễn Plan'}
                          </button>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center">
                        {s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Live
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Off
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToStoreManagement) {
                                onNavigateToStoreManagement(s.storeName);
                              } else {
                                setSelectedStoreForDetail(s);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-2xs font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
                            title="Mở màn hình Hồ sơ gian hàng chuyên sâu"
                          >
                            <Store className="w-3 h-3" />
                            <span>Hồ sơ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedStoreForDetail(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            title="Xem chi tiết chuyên sâu gian hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenHandover(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            title="Lập Lệnh bàn giao giữa kỳ"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Chỉnh sửa thông số gian hàng"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingStore(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Xóa hoặc offboard gian hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Hiển thị <span className="font-semibold text-slate-900">{Math.min(filteredStores.length, (page - 1) * PAGE_SIZE + 1)}</span> - <span className="font-semibold text-slate-900">{Math.min(filteredStores.length, page * PAGE_SIZE)}</span> trên tổng số <span className="font-semibold text-slate-900">{filteredStores.length}</span> gian hàng B2C
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-800">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4 my-auto animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-semibold">
                  <Store className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    Thêm Gian Hàng Mới (Dữ Liệu Gốc)
                  </h3>
                  <p className="text-2xs text-slate-500">
                    Khai báo định danh gian hàng theo quy chuẩn Master Data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStore} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên gian hàng vận hành *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: ClubClio TikTok Shop, Kutieskin Shopee Mall..."
                  value={quickStoreName}
                  onChange={(e) => setQuickStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs bg-slate-50/50"
                  autoFocus
                />
                <p className="text-2xs text-slate-400 mt-1">
                  Định danh chính xác gian hàng trên sàn để liên kết đối soát hợp đồng và booking.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Thuộc Thương hiệu (Brand chủ quản) *
                </label>
                <select
                  value={quickBrandName}
                  onChange={(e) => setQuickBrandName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-800 font-medium text-xs text-slate-800"
                >
                  {uniqueBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <p className="text-2xs text-slate-400 mt-1">
                  Gian hàng sẽ được gắn vào nhãn hàng để quản lý hạn mức ngân sách và quy chuẩn nội dung.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
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
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ChannelTag channel={p} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative notice */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-2xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-blue-950">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Quy trình quản trị B2C Upbase:</span>
                </div>
                <p className="text-blue-800 text-2xs leading-relaxed">
                  Tại Master Data, chỉ cần khai báo Tên gian hàng và thuộc Brand nào. Sau khi lưu, bấm nút <strong>&quot;Hồ sơ&quot;</strong> để sang màn hình Quản lý gian hàng riêng biệt, cấu hình hạn mức Net (File 4.1), cơ cấu 2 tầng (Trưởng phòng / Leader / Specialist) và chỉ tiêu Order.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!quickStoreName.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Cập nhật Gian hàng [{editingStore.storeName}]
                </h3>
                <p className="text-2xs text-slate-500">
                  Cấu hình các thông số vận hành sàn, phân cấp quản lý và hạn mức Order
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStore(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Group 1: Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Tên gian hàng vận hành *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Brand_Platform_Service"
                    value={form.storeName}
                    onChange={(e) => setForm(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mã vận hành Upbase (SO ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SO-B2C-001"
                    value={form.storeOperationId}
                    onChange={(e) => setForm(prev => ({ ...prev, storeOperationId: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Group 2: Brand & Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Thuộc Thương hiệu</label>
                  <select
                    value={form.brandName}
                    onChange={(e) => setForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-800 font-medium"
                  >
                    {uniqueBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nền tảng sàn</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm(prev => ({ ...prev, platform: e.target.value as StorePortfolioItem['platform'] }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-800"
                  >
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Trạng thái vận hành</label>
                  <select
                    value={form.operationStatus}
                    onChange={(e) => setForm(prev => ({ ...prev, operationStatus: e.target.value as NonNullable<StorePortfolioItem['operationStatus']> }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-800 font-medium"
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
                  <label className="block text-slate-700 font-medium mb-1">Gói dịch vụ</label>
                  <input
                    type="text"
                    placeholder="VD: E2E-S, Live-S..."
                    value={form.servicePackage}
                    onChange={(e) => setForm(prev => ({ ...prev, servicePackage: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Shop ID sàn kỹ thuật</label>
                  <input
                    type="text"
                    placeholder="VD: TTS_VN_839219"
                    value={form.platformStoreId}
                    onChange={(e) => setForm(prev => ({ ...prev, platformStoreId: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Hoa hồng Affiliate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.affiliateRate}
                    onChange={(e) => setForm(prev => ({ ...prev, affiliateRate: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Spark Ads check & Store URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Link gian hàng sàn (URL)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.storeUrl}
                    onChange={(e) => setForm(prev => ({ ...prev, storeUrl: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                  />
                </div>

                <div className="pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresSparkAds}
                      onChange={(e) => setForm(prev => ({ ...prev, requiresSparkAds: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-2xs text-slate-700 font-medium">Bắt buộc ủy quyền mã Ads</span>
                  </label>
                </div>
              </div>

              {/* Group 4: Order Budget & Targets */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-900 block">
                  Hạn mức Kế hoạch Tháng (File 4.1 Plan Order)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-slate-600 text-2xs font-semibold mb-1">
                      Hạn mức Net Kế toán duyệt (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      value={form.monthlyBudget}
                      onChange={(e) => setForm(prev => ({ ...prev, monthlyBudget: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-2xs font-semibold mb-1">
                      Mục tiêu Doanh số NMV (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      value={form.monthlyTargetGmv}
                      onChange={(e) => setForm(prev => ({ ...prev, monthlyTargetGmv: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-2xs font-semibold mb-1">
                      Target Video Affiliate
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.targetAffiliateContents}
                      onChange={(e) => setForm(prev => ({ ...prev, targetAffiliateContents: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 text-2xs font-semibold mb-1">
                      Target Video Kênh Brand
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.targetSelfChannelContents}
                      onChange={(e) => setForm(prev => ({ ...prev, targetSelfChannelContents: Number(e.target.value) }))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Group 5: Team Organization */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                  <span>Cơ cấu Nhân sự Phụ trách (2 Tầng)</span>
                  <span className="text-2xs text-slate-400 font-normal">Trưởng phòng: Đặng Thị Yến Nhi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StaffSearchSelect
                    label="Chuyên viên Booking chính (Specialist PIC) *"
                    sublabel="(Trực tiếp chạy deal và chịu trách nhiệm nghiệm thu)"
                    badgeColorClass="text-blue-600"
                    placeholder="Chọn chuyên viên B2C..."
                    value={form.b2cOwnerName}
                    departmentHint="BOOKING"
                    onChange={(name) => setForm(prev => ({ ...prev, b2cOwnerName: name }))}
                  />

                  <div>
                    <label className="block text-slate-700 font-medium mb-1 text-2xs">
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
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-slate-800"
                    >
                      <option value="">Không có leader (Chuyên viên làm việc trực tiếp Trưởng phòng)</option>
                      <option value="Nguyễn Thị Ngọc Tâm">Nguyễn Thị Ngọc Tâm (Trưởng nhóm 8 gian)</option>
                    </select>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Theo quy chuẩn B2C: Chỉ có 8 gian hàng có Trưởng nhóm sơ duyệt, các gian còn lại làm việc trực tiếp Trưởng phòng.
                    </p>
                  </div>

                  <StaffSearchSelect
                    label="Growth PIC (Bộ phận Tăng trưởng sàn)"
                    sublabel="(Giao chỉ tiêu và đối soát NMV)"
                    badgeColorClass="text-emerald-600"
                    placeholder="Chọn Growth PIC..."
                    value={form.growthPic}
                    departmentHint="GROWTH"
                    onChange={(name) => setForm(prev => ({ ...prev, growthPic: name }))}
                  />

                  <StaffSearchSelect
                    label="Account PIC (Quan hệ Brand)"
                    sublabel="(Quản lý hợp đồng tổng thể)"
                    badgeColorClass="text-blue-600"
                    placeholder="Chọn Account PIC..."
                    value={form.accountOwnerName}
                    departmentHint="ACCOUNT"
                    onChange={(name) => setForm(prev => ({ ...prev, accountOwnerName: name }))}
                  />
                </div>
              </div>

              {/* Group 6: Scope */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-2xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isB2cManaged}
                      onChange={(e) => setForm(prev => ({ ...prev, isB2cManaged: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Marketing B2C phụ trách</span>
                      <p className="text-slate-500 text-2xs">Tính vào danh mục đối soát của phòng B2C</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiresB2cPlan}
                      onChange={(e) => setForm(prev => ({ ...prev, requiresB2cPlan: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Yêu cầu lập Kế hoạch tháng</span>
                      <p className="text-slate-500 text-2xs">Phải có bản phân rã Input plan hàng tuần</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in duration-(--motion-base)">
          <div data-motion-panel className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-[0.97] slide-in-from-bottom-1 duration-(--motion-base) ease-enter">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">Xác nhận xử lý gian hàng</h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Mã gian hàng: <span className="font-mono font-semibold text-slate-800">{deletingStore.storeOperationId || deletingStore.id}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900">{deletingStore.storeName}</div>
              <div className="text-slate-500 text-2xs flex items-center gap-2">
                <span>{deletingStore.brandName}</span>
                <span>•</span>
                <span>{deletingStore.platform}</span>
                <span>•</span>
                <span className="font-medium text-slate-700">{deletingStore.servicePackage || 'E2E-S'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>Khuyến nghị an toàn từ hệ thống Upbase:</p>
              <button
                type="button"
                onClick={() => handleOffboardStore(deletingStore)}
                className="w-full py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-blue-700" />
                <span>Chuyển sang &quot;Off / Dừng hợp tác&quot; (Khuyên dùng)</span>
              </button>
              <p className="text-2xs text-slate-400">
                Lưu trữ gian hàng giữ toàn bộ dữ liệu báo cáo GMV và lịch sử booking của nhãn hàng.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStore(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition text-xs font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleHardDeleteStore(deletingStore)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
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
