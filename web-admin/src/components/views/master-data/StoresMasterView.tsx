'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, X, ExternalLink, Store, ShoppingBag, ChevronLeft, ChevronRight, Users, Filter, RotateCcw, Shield } from 'lucide-react';
import { ChannelTag } from '../../ui';
import { StorePortfolioItem } from '../../../lib/types';
import { StaffSearchSelect } from './StaffSearchSelect';

interface StoresMasterViewProps {
  initialStores: StorePortfolioItem[];
  brandNames: string[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
}

const PAGE_SIZE = 25;

export const StoresMasterView: React.FC<StoresMasterViewProps> = ({
  initialStores,
  brandNames,
  onNotify,
  onUpdateStore
}) => {
  const [stores, setStores] = useState<StorePortfolioItem[]>(initialStores);

  React.useEffect(() => {
    setStores(initialStores);
  }, [initialStores]);

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [selectedPackage, setSelectedPackage] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedB2cPlan, setSelectedB2cPlan] = useState<'ALL' | 'B2C_MANAGED' | 'REQUIRES_PLAN'>('ALL');
  const [page, setPage] = useState(1);

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
      if (s.growthPic) set.add(s.growthPic.trim());
      if (s.contentPic) set.add(s.contentPic.trim());
      if (s.mediaPic) set.add(s.mediaPic.trim());
      if (s.backupOwnerName) set.add(s.backupOwnerName.trim());
    });
    return Array.from(set).sort();
  }, [stores]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StorePortfolioItem | null>(null);
  const [form, setForm] = useState({
    storeName: '',
    brandName: brandNames[0] || '',
    platform: 'Shopee Mall' as 'Shopee Mall' | 'TikTok Shop' | 'Lazada',
    servicePackage: 'E2E-S',
    accountOwnerName: '',
    growthPic: '',
    b2cOwnerName: '',
    contentPic: '',
    mediaPic: '',
    backupOwnerName: '',
    isBackupActive: false,
    backupReason: '',
    isB2cManaged: true,
    requiresB2cPlan: true,
    storeUrl: '',
    operationStatus: 'Live' as 'Live' | 'Off' | 'Kênh nội bộ'
  });

  // Extract unique packages
  const packages = useMemo(() => {
    const set = new Set<string>();
    stores.forEach(s => {
      if (s.servicePackage) set.add(s.servicePackage);
    });
    return Array.from(set).sort();
  }, [stores]);

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
      if (selectedOwner !== 'ALL') {
        const matchOwner = (s.accountOwnerName && s.accountOwnerName.includes(selectedOwner)) ||
                           (s.growthPic && s.growthPic.includes(selectedOwner)) ||
                           (s.contentPic && s.contentPic.includes(selectedOwner)) ||
                           (s.mediaPic && s.mediaPic.includes(selectedOwner)) ||
                           (s.backupOwnerName && s.backupOwnerName.includes(selectedOwner));
        if (!matchOwner) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.storeName.toLowerCase().includes(q) ||
          (s.storeOperation && s.storeOperation.toLowerCase().includes(q)) ||
          s.brandName.toLowerCase().includes(q) ||
          (s.accountOwnerName && s.accountOwnerName.toLowerCase().includes(q)) ||
          (s.growthPic && s.growthPic.toLowerCase().includes(q)) ||
          (s.contentPic && s.contentPic.toLowerCase().includes(q)) ||
          (s.mediaPic && s.mediaPic.toLowerCase().includes(q)) ||
          (s.backupOwnerName && s.backupOwnerName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [stores, selectedBrand, selectedPlatform, selectedPackage, selectedStatus, selectedOwner, selectedB2cPlan, search]);

  const isFiltered = search.trim() !== '' || selectedBrand !== 'ALL' || selectedPlatform !== 'ALL' || selectedPackage !== 'ALL' || selectedStatus !== 'ALL' || selectedOwner !== 'ALL' || selectedB2cPlan !== 'ALL';

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBrand('ALL');
    setSelectedPlatform('ALL');
    setSelectedPackage('ALL');
    setSelectedStatus('ALL');
    setSelectedOwner('ALL');
    setSelectedB2cPlan('ALL');
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

  // KPI stats
  const shopeeCount = stores.filter(s => s.platform === 'Shopee Mall').length;
  const tiktokCount = stores.filter(s => s.platform === 'TikTok Shop').length;
  const lazadaCount = stores.filter(s => s.platform === 'Lazada').length;
  const liveCount = stores.filter(s => s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE').length;
  const offCount = stores.filter(s => s.operationStatus === 'Off' || s.accountStatus === 'OFFBOARDED').length;
  const internalCount = stores.filter(s => s.operationStatus === 'Kênh nội bộ' || s.accountStatus === 'MAINTENANCE').length;
  const b2cManagedCount = stores.filter(s => s.isB2cManaged).length;
  const requiresPlanCount = stores.filter(s => s.requiresB2cPlan).length;

  const handleOpenAdd = () => {
    setEditingStore(null);
    setForm({
      storeName: '',
      brandName: brandNames[0] || '',
      platform: 'Shopee Mall',
      servicePackage: 'E2E - Service',
      accountOwnerName: '',
      growthPic: '',
      b2cOwnerName: '',
      contentPic: '',
      mediaPic: '',
      backupOwnerName: '',
      isBackupActive: false,
      backupReason: '',
      isB2cManaged: true,
      requiresB2cPlan: true,
      storeUrl: '',
      operationStatus: 'Live'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: StorePortfolioItem) => {
    setEditingStore(s);
    setForm({
      storeName: s.storeName,
      brandName: s.brandName,
      platform: s.platform,
      servicePackage: s.servicePackage || 'E2E - Service',
      accountOwnerName: s.accountOwnerName || '',
      growthPic: s.growthPic || '',
      b2cOwnerName: s.b2cOwnerName || (s.b2cOwners ? s.b2cOwners.join(', ') : ''),
      contentPic: s.contentPic || '',
      mediaPic: s.mediaPic || '',
      backupOwnerName: s.backupOwnerName || '',
      isBackupActive: s.isBackupActive || false,
      backupReason: s.backupReason || '',
      isB2cManaged: s.isB2cManaged !== false,
      requiresB2cPlan: s.requiresB2cPlan !== false,
      storeUrl: s.storeUrl || '',
      operationStatus: s.operationStatus || (s.accountStatus === 'ACTIVE' ? 'Live' : 'Off')
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim()) return;

    const opStatus = form.operationStatus;
    const accStatus = opStatus === 'Live' ? 'ACTIVE' : (opStatus === 'Off' ? 'OFFBOARDED' : 'MAINTENANCE');

    if (editingStore) {
      const updatedStore: StorePortfolioItem = {
        ...editingStore,
        storeName: form.storeName.trim(),
        brandName: form.brandName,
        platform: form.platform,
        servicePackage: form.servicePackage,
        accountOwnerName: form.accountOwnerName.trim() || editingStore.accountOwnerName,
        growthPic: form.growthPic.trim() || editingStore.growthPic,
        b2cOwnerName: form.b2cOwnerName.trim() || editingStore.b2cOwnerName,
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
        updatedAt: new Date().toISOString()
      };
      setStores(prev => prev.map(s => s.id === editingStore.id ? updatedStore : s));
      if (onUpdateStore) onUpdateStore(updatedStore);
      if (onNotify) onNotify(`Đã cập nhật gian hàng [${form.storeName}]`);
    } else {
      const newStore: StorePortfolioItem = {
        id: `ST-${String(stores.length + 1).padStart(4, '0')}`,
        storeName: form.storeName.trim(),
        storeOperation: form.storeName.trim(),
        brandName: form.brandName,
        platform: form.platform,
        servicePackage: form.servicePackage,
        serviceModel: 'FULL_SERVICE',
        difficultyTier: 'Tiêu chuẩn',
        difficultyMultiplier: 1.0,
        accountStatus: accStatus,
        operationStatus: opStatus,
        category: 'Tiêu dùng & Bán lẻ',
        monthlyTargetGmv: 150000000,
        monthlyBudget: 25000000,
        accountOwnerName: form.accountOwnerName.trim() || 'Nguyễn Thu Trang',
        b2cOwnerName: form.b2cOwnerName.trim() || 'Đặng Thị Linh',
        growthPic: form.growthPic.trim(),
        contentPic: form.contentPic.trim(),
        mediaPic: form.mediaPic.trim(),
        backupOwnerName: form.backupOwnerName.trim() || undefined,
        isBackupActive: form.isBackupActive,
        backupReason: form.backupReason.trim() || undefined,
        isB2cManaged: form.isB2cManaged,
        requiresB2cPlan: form.requiresB2cPlan,
        storeUrl: form.storeUrl.trim() || '',
        updatedAt: new Date().toISOString()
      };
      setStores(prev => [newStore, ...prev]);
      if (onUpdateStore) onUpdateStore(newStore);
      if (onNotify) onNotify(`Đã thêm gian hàng mới [${newStore.storeName}]`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Tổng số gian hàng</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stores.length}</span>
            <span className="text-2xs text-slate-500">stores</span>
          </div>
          <div className="text-2xs text-emerald-600 mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
            <span>{liveCount} Live</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{offCount} Off</span>
            {internalCount > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-600">{internalCount} Nội bộ</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Shopee Mall</span>
            <ShoppingBag className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-orange-600">{shopeeCount}</span>
            <span className="text-2xs text-slate-500">gian hàng</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chiếm {Math.round((shopeeCount / (stores.length || 1)) * 100)}% danh mục
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">TikTok Shop</span>
            <ShoppingBag className="w-4 h-4 text-slate-800" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{tiktokCount}</span>
            <span className="text-2xs text-slate-500">gian hàng</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chiếm {Math.round((tiktokCount / (stores.length || 1)) * 100)}% danh mục
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Lazada</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-blue-600">{lazadaCount}</span>
            <span className="text-2xs text-slate-500">gian hàng</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            Chiếm {Math.round((lazadaCount / (stores.length || 1)) * 100)}% danh mục
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Top Row: Search & Add button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo gian hàng, thương hiệu, mã gian, PIC vận hành..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm gian hàng
          </button>
        </div>

        {/* Bottom Row: Multi-dimensional Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              1. Thương hiệu:
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi thương hiệu ({uniqueBrands.length})</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              2. Sàn / Nền tảng:
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi sàn ({stores.length})</option>
              <option value="Shopee Mall">Shopee Mall ({shopeeCount})</option>
              <option value="TikTok Shop">TikTok Shop ({tiktokCount})</option>
              <option value="Lazada">Lazada ({lazadaCount})</option>
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              3. Gói dịch vụ:
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => {
                setSelectedPackage(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi gói ({packages.length})</option>
              {packages.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              4. Trạng thái vận hành:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi trạng thái ({stores.length})</option>
              <option value="Live">Đang Live ({liveCount})</option>
              <option value="Off">Đã Off ({offCount})</option>
              {internalCount > 0 && (
                <option value="Kênh nội bộ">Kênh nội bộ ({internalCount})</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              5. Quản lý / PIC phụ trách:
            </label>
            <select
              value={selectedOwner}
              onChange={(e) => {
                setSelectedOwner(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Mọi nhân sự ({accountOwners.length})</option>
              {accountOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-3xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              6. Phụ trách & Kế hoạch:
            </label>
            <select
              value={selectedB2cPlan}
              onChange={(e) => {
                setSelectedB2cPlan(e.target.value as any);
                setPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">Tất cả ({stores.length})</option>
              <option value="B2C_MANAGED">B2C phụ trách ({b2cManagedCount})</option>
              <option value="REQUIRES_PLAN">Cần làm Plan ({requiresPlanCount})</option>
            </select>
          </div>

          <div className="flex items-end col-span-2 sm:col-span-3 lg:col-span-6 justify-end pt-1">
            {isFiltered ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-1.5 px-3 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            ) : (
              <div className="text-2xs text-slate-400 px-2 py-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Đang hiển thị toàn bộ {stores.length} gian hàng</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Results Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Tìm thấy <strong className="text-slate-900 font-bold">{filteredStores.length}</strong> / {stores.length} gian hàng
            </span>
            {isFiltered && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-3xs">
                Đang lọc kết quả
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <span>Trang {page} / {totalPages}</span>
          )}
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-2xs">
            <tr>
              <th className="py-3 px-4 min-w-[200px]">Gian hàng & Mã</th>
              <th className="py-3 px-4 w-[120px]">Nền tảng</th>
              <th className="py-3 px-4 w-[150px]">Thương hiệu</th>
              <th className="py-3 px-4 w-[110px]">Gói dịch vụ</th>
              <th className="py-3 px-4 min-w-[220px]">Đội ngũ phụ trách (PICs)</th>
              <th className="py-3 px-3 text-center w-[130px]">B2C & Plan</th>
              <th className="py-3 px-4 w-[130px]">Thời hạn HĐ</th>
              <th className="py-3 px-4 text-center w-[90px]">Trạng thái</th>
              <th className="py-3 px-4 text-right w-[90px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentStores.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Không tìm thấy gian hàng phù hợp với điều kiện lọc
                </td>
              </tr>
            ) : (
              currentStores.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Gian hàng */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 text-xs">
                      {s.storeName}
                    </div>
                    <div className="text-2xs font-mono text-slate-400 mt-0.5">
                      {s.id} {s.storeOperation && s.storeOperation !== s.storeName ? `• ${s.storeOperation}` : ''}
                    </div>
                  </td>

                  {/* Nền tảng */}
                  <td className="py-3 px-4">
                    <ChannelTag channel={s.platform} />
                  </td>

                  {/* Thương hiệu */}
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{s.brandName}</span>
                    {s.brandId && (
                      <div className="text-2xs font-mono text-slate-400">{s.brandId}</div>
                    )}
                  </td>

                  {/* Gói dịch vụ */}
                  <td className="py-3 px-4">
                    {s.servicePackage ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.servicePackage}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs">—</span>
                    )}
                  </td>

                  {/* PICs */}
                  <td className="py-3 px-4 text-2xs space-y-0.5">
                    {s.accountOwnerName && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Account:</span>
                        <span className="font-medium">{s.accountOwnerName}</span>
                      </div>
                    )}
                    {s.growthPic && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-slate-400">Growth:</span>
                        <span>{s.growthPic}</span>
                      </div>
                    )}
                    {(s.b2cOwnerName || (s.b2cOwners && s.b2cOwners.length > 0)) && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-purple-600 font-medium">Booking:</span>
                        <span>{s.b2cOwnerName || s.b2cOwners?.join(', ')}</span>
                      </div>
                    )}
                    {s.contentPic && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="text-slate-400">Content:</span>
                        <span>{s.contentPic}</span>
                      </div>
                    )}
                    {s.mediaPic && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="text-slate-400">Media:</span>
                        <span>{s.mediaPic}</span>
                      </div>
                    )}
                    {s.backupOwnerName && (
                      <div className="flex items-center gap-1 text-amber-700 font-medium pt-0.5">
                        <span className="text-amber-500">Backup:</span>
                        <span>{s.backupOwnerName}</span>
                        <span className={`text-3xs px-1 rounded font-mono ${s.isBackupActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                          {s.isBackupActive ? 'Đang trực' : 'Dự phòng'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* B2C Phụ trách & Yêu cầu Plan */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleB2cManaged(s)}
                        title="Bật/tắt Marketing B2C phụ trách"
                        className={`w-24 px-2 py-0.5 rounded-full text-3xs font-semibold border transition ${
                          s.isB2cManaged !== false
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.isB2cManaged !== false ? 'B2C Quản lý' : 'Không phụ trách'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRequiresPlan(s)}
                        title="Bật/tắt yêu cầu lập Plan tháng"
                        className={`w-24 px-2 py-0.5 rounded-full text-3xs font-semibold border transition ${
                          s.requiresB2cPlan !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.requiresB2cPlan !== false ? 'Cần làm Plan' : 'Miễn Plan'}
                      </button>
                    </div>
                  </td>

                  {/* Thời hạn HĐ */}
                  <td className="py-3 px-4 text-2xs text-slate-600 font-mono">
                    {s.liveDate ? (
                      <div>
                        <div>Live: {s.liveDate}</div>
                        {s.offDate && <div className="text-slate-400">Off: {s.offDate}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400">Chưa đặt ngày</span>
                    )}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3 px-4 text-center">
                    {s.operationStatus === 'Live' || s.accountStatus === 'ACTIVE' ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Live
                      </span>
                    ) : s.operationStatus === 'Kênh nội bộ' || s.accountStatus === 'MAINTENANCE' ? (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Kênh nội bộ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Off
                      </span>
                    )}
                  </td>

                  {/* Thao tác */}
                  <td className="py-3 px-4 text-right space-x-1">
                    {s.storeUrl && (
                      <a
                        href={s.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-800 p-1 inline-block"
                        title="Mở link gian hàng sàn"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="text-slate-600 hover:text-slate-900 font-medium text-xs px-2 py-1 rounded hover:bg-slate-100 transition inline-block"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Hiển thị <span className="font-semibold text-slate-900">{Math.min(filteredStores.length, (page - 1) * PAGE_SIZE + 1)}</span> - <span className="font-semibold text-slate-900">{Math.min(filteredStores.length, page * PAGE_SIZE)}</span> trên tổng số <span className="font-semibold text-slate-900">{filteredStores.length}</span> gian hàng
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Store */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-900">
                {editingStore ? `Cập nhật gian hàng [${editingStore.storeName}]` : 'Thêm gian hàng mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tên gian hàng vận hành *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Brand_Platform_Service"
                  value={form.storeName}
                  onChange={(e) => setForm(prev => ({ ...prev, storeName: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Thuộc thương hiệu</label>
                  <input
                    type="text"
                    required
                    placeholder="Tên nhãn hàng"
                    value={form.brandName}
                    onChange={(e) => setForm(prev => ({ ...prev, brandName: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nền tảng sàn</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm(prev => ({ ...prev, platform: e.target.value as any }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="Shopee Mall">Shopee Mall</option>
                    <option value="TikTok Shop">TikTok Shop</option>
                    <option value="Lazada">Lazada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Trạng thái vận hành</label>
                  <select
                    value={form.operationStatus}
                    onChange={(e) => setForm(prev => ({ ...prev, operationStatus: e.target.value as any }))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium"
                  >
                    <option value="Live">Live (Đang chạy)</option>
                    <option value="Off">Off (Đã kết thúc HĐ)</option>
                    <option value="Kênh nội bộ">Kênh nội bộ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Gói dịch vụ</label>
                <input
                  type="text"
                  placeholder="VD: E2E-S, Live-S, SoCom..."
                  value={form.servicePackage}
                  onChange={(e) => setForm(prev => ({ ...prev, servicePackage: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Section: Phân công PIC các bộ phận */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Đội ngũ nhân sự phụ trách các bộ phận (PICs)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <StaffSearchSelect
                    label="1. Account PIC"
                    sublabel="(Quan hệ Brand & HĐ)"
                    badgeColorClass="text-blue-600"
                    placeholder="Gõ tìm Account PIC..."
                    value={form.accountOwnerName}
                    departmentHint="ACCOUNT"
                    onChange={(name) => setForm(prev => ({ ...prev, accountOwnerName: name }))}
                  />

                  <StaffSearchSelect
                    label="2. Growth PIC"
                    sublabel="(Tăng trưởng & Sàn)"
                    badgeColorClass="text-emerald-600"
                    placeholder="Gõ tìm Growth PIC..."
                    value={form.growthPic}
                    departmentHint="GROWTH"
                    onChange={(name) => setForm(prev => ({ ...prev, growthPic: name }))}
                  />

                  <StaffSearchSelect
                    label="3. Booking PIC"
                    sublabel="(KOC/KOL & Booking)"
                    badgeColorClass="text-purple-600"
                    placeholder="Gõ tìm Booking PIC..."
                    value={form.b2cOwnerName}
                    departmentHint="BOOKING"
                    onChange={(name) => setForm(prev => ({ ...prev, b2cOwnerName: name }))}
                  />

                  <StaffSearchSelect
                    label="4. Content PIC"
                    sublabel="(Kịch bản & Clip)"
                    badgeColorClass="text-amber-600"
                    placeholder="Gõ tìm Content PIC..."
                    value={form.contentPic}
                    departmentHint="CONTENT"
                    onChange={(name) => setForm(prev => ({ ...prev, contentPic: name }))}
                  />

                  <div className="sm:col-span-2">
                    <StaffSearchSelect
                      label="5. Media / Ads PIC"
                      sublabel="(Spark Ads & Chạy ads sàn)"
                      badgeColorClass="text-indigo-600"
                      placeholder="Gõ tìm Media / Ads PIC..."
                      value={form.mediaPic}
                      departmentHint="MEDIA"
                      onChange={(name) => setForm(prev => ({ ...prev, mediaPic: name }))}
                    />
                  </div>
                </div>
              </div>

              {/* Section: BRD Phân công dự phòng (Backup PIC) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Cơ chế nhân sự dự phòng (Backup PIC - BRD SLA)</span>
                </div>
                <div className="space-y-2 bg-amber-50/40 p-3 rounded-lg border border-amber-200/60">
                  <StaffSearchSelect
                    label="Nhân sự Backup được ủy quyền"
                    sublabel="(Tiếp quản duyệt deal, duyệt kịch bản khi PIC chính vắng mặt)"
                    badgeColorClass="text-amber-700"
                    placeholder="Chọn nhân sự backup..."
                    value={form.backupOwnerName}
                    departmentHint="ALL"
                    onChange={(name) => setForm(prev => ({ ...prev, backupOwnerName: name }))}
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isBackupActive"
                      checked={form.isBackupActive}
                      onChange={(e) => setForm(prev => ({ ...prev, isBackupActive: e.target.checked }))}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="isBackupActive" className="text-2xs font-medium text-slate-700">
                      Kích hoạt bàn giao quyền hạn tạm thời ngay bây giờ
                    </label>
                  </div>

                  {form.isBackupActive && (
                    <div>
                      <input
                        type="text"
                        placeholder="Lý do bàn giao (VD: Nghỉ phép, công tác, bàn giao chuyển tiếp)..."
                        value={form.backupReason}
                        onChange={(e) => setForm(prev => ({ ...prev, backupReason: e.target.value }))}
                        className="w-full px-2.5 py-1 text-2xs border border-amber-300 rounded bg-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Phân công B2C & Plan Requirement */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-900">
                  Phạm vi nghiệp vụ Marketing B2C
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-2xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isB2cManaged}
                      onChange={(e) => setForm(prev => ({ ...prev, isB2cManaged: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Marketing B2C phụ trách</span>
                      <p className="text-slate-500 text-3xs">Nhân sự B2C chịu trách nhiệm booking và video</p>
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
                      <p className="text-slate-500 text-3xs">Phải có bản phân rã Plan gửi Quản lý duyệt</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Link gian hàng sàn (URL)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.storeUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, storeUrl: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
                >
                  Lưu gian hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
