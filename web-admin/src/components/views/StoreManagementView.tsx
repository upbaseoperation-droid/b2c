'use client';

/**
 * Màn hình Quản lý Danh bạ & Hồ sơ Gian hàng B2C.
 * Thiết kế chuẩn Upbase Ops Design System (DESIGN_SYSTEM.md):
 * - Khi chưa chọn gian: Hiển thị Danh bạ gian hàng sàn (Panel flush, FilterBar, Chips, DataTable, Pagination).
 * - Khi chọn gian: Mở hồ sơ chi tiết 2 cột (StoreProfile layout="page"), nút ← Danh bạ gian hàng kèm bộ chuyển ‹ › bản ghi.
 * - Hỗ trợ Bàn giao PIC giữa kỳ (StoreHandoverDialog) và Chỉnh sửa thông số (StoreEditDialog).
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { BookingDealItem, BrandDetail, StorePortfolioItem, UserProfile } from '../../lib/types';
import { ChannelTag, Chips, DataTable, EmptyState, FilterBar, Pagination, Panel, Person, Status, closeShared, openShared, sharedFrom } from '../ui';
import type { Column } from '../ui';
import { formatNumber, formatVnd } from '../../lib/format';
import { INITIAL_DEALS, INITIAL_STORE_PORTFOLIOS, INITIAL_BRANDS } from '../../lib/mockData';
import { StoreProfile } from '../stores/StoreProfile';
import { StoreHandoverDialog } from '../stores/StoreHandoverDialog';
import { StoreEditDialog } from '../stores/StoreEditDialog';

type StoreFilter = 'ALL' | 'MINE' | 'OVERBUDGET' | 'ZERO_BUDGET' | 'WITH_LEADER' | 'DIRECT_LEAD';

export interface StoreManagementViewProps {
  currentUser?: UserProfile | null;
  selectedStore?: string;
  stores?: StorePortfolioItem[];
  brands?: BrandDetail[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateBackToMaster?: () => void;
}

export function StoreManagementView({
  currentUser,
  selectedStore: propSelectedStore,
  stores = INITIAL_STORE_PORTFOLIOS,
  brands = INITIAL_BRANDS,
  deals = INITIAL_DEALS,
  onNotify,
  onUpdateStore,
  onNavigateToBrandProfile,
}: StoreManagementViewProps) {
  // Local modifications during the session
  const [storeOverrides, setStoreOverrides] = useState<Record<string, StorePortfolioItem>>({});

  const storeList = useMemo(() => {
    return stores.map(s => storeOverrides[s.id] || s);
  }, [stores, storeOverrides]);

  // Selected store key for detailed profile mode
  const [openStoreKey, setOpenStoreKey] = useState<string | null>(() => {
    if (propSelectedStore) {
      const found = stores.find(s => 
        s.id === propSelectedStore || 
        s.storeName.toLowerCase() === propSelectedStore.toLowerCase()
      );
      return found ? found.id : null;
    }
    return null;
  });

  // Sync when propSelectedStore changes from parent without cascading effect
  const [syncedSelectedStore, setSyncedSelectedStore] = useState(propSelectedStore);
  if (propSelectedStore !== syncedSelectedStore) {
    setSyncedSelectedStore(propSelectedStore);
    if (propSelectedStore) {
      const found = storeList.find(s => 
        s.id === propSelectedStore || 
        s.storeName.toLowerCase() === propSelectedStore.toLowerCase()
      );
      setOpenStoreKey(found ? found.id : null);
    }
  }

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StoreFilter>('ALL');
  const [page, setPage] = useState(1);

  // Dialog states
  const [handoverTarget, setHandoverTarget] = useState<StorePortfolioItem | null>(null);
  const [editTarget, setEditTarget] = useState<StorePortfolioItem | null>(null);

  // Current user PIC name matching
  const myName = currentUser?.name?.trim().toLowerCase() || '';

  // Helpers to calculate spent and budget
  const getStoreFinancials = useCallback((s: StorePortfolioItem) => {
    const budgetNet = s.budgetNet ?? s.monthlyBudget ?? 0;
    const sName = s.storeName.toLowerCase();
    const bName = s.brandName.toLowerCase();
    const relatedDeals = deals.filter(d =>
      (d.storeName && d.storeName.toLowerCase() === sName) ||
      (d.storeId && (d.storeId === s.id || d.storeId === s.storeOperationId)) ||
      (!d.storeName && d.brandName && d.brandName.toLowerCase() === bName)
    );
    const dealSpent = relatedDeals.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const spent = s.actualSpentNet ?? (dealSpent > 0 ? dealSpent : 0);
    const isOverbudget = budgetNet > 0 && spent > budgetNet;
    const isUnbudgetedSpend = budgetNet === 0 && spent > 0;
    return { budgetNet, spent, isOverbudget, isUnbudgetedSpend };
  }, [deals]);

  // Filtered & searched rows
  const searchedStores = useMemo(() => {
    if (!search.trim()) return storeList;
    const q = search.trim().toLowerCase();
    return storeList.filter(s =>
      s.storeName.toLowerCase().includes(q) ||
      s.brandName.toLowerCase().includes(q) ||
      (s.storeOperationId && s.storeOperationId.toLowerCase().includes(q)) ||
      (s.b2cOwnerName && s.b2cOwnerName.toLowerCase().includes(q)) ||
      (s.bookingLeader && s.bookingLeader.toLowerCase().includes(q))
    );
  }, [storeList, search]);

  const matchesFilter = useCallback((s: StorePortfolioItem, f: StoreFilter) => {
    if (f === 'ALL') return true;
    if (f === 'MINE') {
      if (!myName) return true;
      const pic = (s.b2cOwnerName || s.primaryPic || (s.b2cOwners && s.b2cOwners[0]) || '').toLowerCase();
      const leader = (s.bookingLeader || '').toLowerCase();
      return pic.includes(myName) || leader.includes(myName);
    }
    if (f === 'OVERBUDGET') {
      const { isOverbudget } = getStoreFinancials(s);
      return isOverbudget;
    }
    if (f === 'ZERO_BUDGET') {
      const { budgetNet } = getStoreFinancials(s);
      return budgetNet === 0;
    }
    if (f === 'WITH_LEADER') {
      return Boolean(s.hasBookingLeader && s.bookingLeader);
    }
    if (f === 'DIRECT_LEAD') {
      return !s.hasBookingLeader || !s.bookingLeader;
    }
    return true;
  }, [myName, getStoreFinancials]);

  const visibleStores = useMemo(() => {
    return searchedStores.filter(s => matchesFilter(s, filter));
  }, [searchedStores, filter, matchesFilter]);

  // Reset page when search or filter changes
  const [lastFilterQuery, setLastFilterQuery] = useState('');
  if (`${search}|${filter}` !== lastFilterQuery) {
    setLastFilterQuery(`${search}|${filter}`);
    setPage(1);
  }

  // Handle store updates
  const handleSaveStore = (updated: StorePortfolioItem) => {
    setStoreOverrides(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateStore?.(updated);
    onNotify?.(`Đã cập nhật thông số gian hàng ${updated.storeName}`, 'success');
  };

  const handleConfirmHandover = (
    updated: StorePortfolioItem,
    logEntry: { fromPic: string; toPic: string; effectiveDate: string; reason: string }
  ) => {
    setStoreOverrides(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateStore?.(updated);
    onNotify?.(`Đã bàn giao gian hàng ${updated.storeName} từ ${logEntry.fromPic} sang ${logEntry.toPic}`, 'success');
  };

  // Currently open store for detail profile
  const openStore = useMemo(() => {
    if (!openStoreKey) return null;
    return storeList.find(s => s.id === openStoreKey) || null;
  }, [storeList, openStoreKey]);

  // Navigation within filtered stores for profile mode
  const currentStoreIndex = openStore ? visibleStores.findIndex(s => s.id === openStore.id) : -1;
  const prevStore = currentStoreIndex > 0 ? visibleStores[currentStoreIndex - 1] : undefined;
  const nextStore = currentStoreIndex >= 0 && currentStoreIndex < visibleStores.length - 1 ? visibleStores[currentStoreIndex + 1] : undefined;

  // Associated brand for the currently open store
  const openBrand = useMemo(() => {
    if (!openStore) return undefined;
    const bName = openStore.brandName.toLowerCase();
    return brands.find(b => b.name.toLowerCase() === bName);
  }, [openStore, brands]);

  // If a store profile is active, render StoreProfile
  if (openStore) {
    return (
      <div className="space-y-4">
        <StoreProfile
          store={openStore}
          brand={openBrand}
          deals={deals}
          currentUser={currentUser}
          layout="page"
          nav={{
            onBack: () => closeShared(openStore.id, () => setOpenStoreKey(null)),
            onPrev: prevStore ? () => setOpenStoreKey(prevStore.id) : undefined,
            onNext: nextStore ? () => setOpenStoreKey(nextStore.id) : undefined,
            position: currentStoreIndex >= 0 ? currentStoreIndex + 1 : undefined,
            total: visibleStores.length,
          }}
          onNavigateToBrandProfile={onNavigateToBrandProfile}
          onOpenHandover={s => setHandoverTarget(s)}
          onOpenEdit={s => setEditTarget(s)}
          onUpdateStore={handleSaveStore}
        />

        {handoverTarget && (
          <StoreHandoverDialog
            open={Boolean(handoverTarget)}
            onClose={() => setHandoverTarget(null)}
            store={handoverTarget}
            onConfirmHandover={handleConfirmHandover}
          />
        )}

        {editTarget && (
          <StoreEditDialog
            open={Boolean(editTarget)}
            onClose={() => setEditTarget(null)}
            store={editTarget}
            onSave={handleSaveStore}
          />
        )}
      </div>
    );
  }

  // Chips configuration
  const chips = ([
    { key: 'ALL', label: 'Tất cả' },
    { key: 'MINE', label: 'Tôi phụ trách' },
    { key: 'OVERBUDGET', label: 'Bội chi' },
    { key: 'ZERO_BUDGET', label: 'Hạn mức 0 đ' },
    { key: 'WITH_LEADER', label: 'Có trưởng nhóm' },
    { key: 'DIRECT_LEAD', label: 'Trực tiếp trưởng phòng' },
  ] as { key: StoreFilter; label: string }[]).map(item => ({
    key: item.key,
    label: item.label,
    count: searchedStores.filter(s => matchesFilter(s, item.key)).length,
  }));

  // DataTable columns
  const columns: Column<StorePortfolioItem>[] = [
    {
      key: 'storeName',
      header: 'Gian hàng sàn',
      width: 260,
      render: s => (
        <div className="min-w-0 max-w-[280px] leading-tight">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span {...sharedFrom('store-title', s.id)} className="truncate font-medium text-ink">{s.storeName}</span>
            <ChannelTag channel={s.platform} />
          </div>
          <span className="block truncate text-2xs text-ink-3 mt-0.5">
            {s.storeOperationId || s.id}
          </span>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'Thương hiệu',
      width: 160,
      render: s => (
        <span className="truncate font-medium text-ink-2">{s.brandName}</span>
      ),
    },
    {
      key: 'pic',
      header: 'Chuyên viên PIC',
      width: 170,
      render: s => {
        const pic = s.b2cOwnerName || s.primaryPic || (s.b2cOwners && s.b2cOwners[0]) || 'Chưa giao';
        return <Person name={pic} size={20} />;
      },
    },
    {
      key: 'management',
      header: 'Tầng quản lý',
      width: 160,
      render: s => {
        if (s.hasBookingLeader && s.bookingLeader) {
          return (
            <div className="leading-tight">
              <span className="block text-2xs text-ink-2 font-medium">{s.bookingLeader}</span>
              <span className="block text-2xs text-ink-3">Trưởng nhóm</span>
            </div>
          );
        }
        return (
          <span className="text-2xs text-ink-3">Trực tiếp Trưởng phòng</span>
        );
      },
    },
    {
      key: 'budgetNet',
      header: 'Hạn mức Net',
      width: 130,
      align: 'right',
      render: s => {
        const { budgetNet } = getStoreFinancials(s);
        return (
          <span className="tabular-nums text-ink font-medium">
            {budgetNet > 0 ? formatVnd(budgetNet) : '0 đ'}
          </span>
        );
      },
    },
    {
      key: 'spent',
      header: 'Đã duyệt chi',
      width: 130,
      align: 'right',
      render: s => {
        const { spent, isOverbudget, isUnbudgetedSpend } = getStoreFinancials(s);
        if (isOverbudget || isUnbudgetedSpend) {
          return (
            <span className="tabular-nums text-critical font-medium">
              {formatVnd(spent)}
            </span>
          );
        }
        return (
          <span className="tabular-nums text-ink">
            {formatVnd(spent)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: 130,
      render: s => {
        const { budgetNet, spent, isOverbudget, isUnbudgetedSpend } = getStoreFinancials(s);
        if (isOverbudget) {
          return <Status tone="critical">Bội chi</Status>;
        }
        if (isUnbudgetedSpend) {
          return <Status tone="critical">Chưa có trần</Status>;
        }
        if (spent > 0) {
          return <Status tone="positive">Trong trần</Status>;
        }
        if (budgetNet > 0) {
          return <Status tone="neutral">Chưa chi</Status>;
        }
        return <Status>Chưa giao trần</Status>;
      },
    },
    {
      key: 'contents',
      header: 'Chỉ tiêu video',
      width: 110,
      align: 'right',
      render: s => {
        const totalVideos = (s.targetAffiliateContents || 0) + (s.targetSelfChannelContents || 0) + (s.targetFocVideos || 0);
        return (
          <div className="leading-tight text-right">
            <span className="block tabular-nums font-medium text-ink">{formatNumber(totalVideos)}</span>
            <span className="block text-2xs text-ink-3">
              Aff {s.targetAffiliateContents || 0} · Kênh {s.targetSelfChannelContents || 0}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <Panel flush>
      <div className="p-4 border-b border-line">
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Tên gian hàng, thương hiệu, mã vận hành, chuyên viên PIC...',
          }}
          chips={<Chips items={chips} value={filter} onChange={setFilter} />}
          resultCount={search.trim() ? visibleStores.length : undefined}
        />
      </div>

      <DataTable
        columns={columns}
        rows={visibleStores.slice((page - 1) * 20, page * 20)}
        rowKey={s => s.id}
        onRowClick={s => openShared(s.id, () => setOpenStoreKey(s.id))}
        empty={
          <EmptyState
            title="Không tìm thấy gian hàng nào"
            description="Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm."
          />
        }
      />

      <Pagination
        page={page}
        pageSize={20}
        total={visibleStores.length}
        onPageChange={setPage}
      />

      {handoverTarget && (
        <StoreHandoverDialog
          open={Boolean(handoverTarget)}
          onClose={() => setHandoverTarget(null)}
          store={handoverTarget}
          onConfirmHandover={handleConfirmHandover}
        />
      )}

      {editTarget && (
        <StoreEditDialog
          open={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          store={editTarget}
          onSave={handleSaveStore}
        />
      )}
    </Panel>
  );
}
