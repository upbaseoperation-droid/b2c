'use client';

/**
 * Màn hình Quản lý Danh bạ & Hồ sơ Gian hàng B2C theo kỳ tháng.
 * Thiết kế chuẩn Upbase Ops Design System (DESIGN_SYSTEM.md):
 * - Tách bạch thông số định danh cố định của gian hàng (Mã SO, Sàn, Gói dịch vụ, Đội ngũ PIC)
 *   với Hồ sơ Kế hoạch (Plan) & Báo cáo (Report) theo từng chu kỳ tháng (NMV, Ngân sách Net, Sản lượng Video, ROAS).
 * - Từ danh sách hoặc từ hồ sơ chi tiết gian hàng có thể drill-down trực tiếp xuống từng Plan tháng, Đề xuất KOC, Booking và Hợp đồng.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, FileSpreadsheet, Sliders, Video } from 'lucide-react';
import {
  type BookingDealItem,
  type BrandDetail,
  type InputPlanBreakdownState,
  type SalaryGrade,
  type StorePortfolioItem,
  type UserProfile,
  normalizeStoreCoefficient,
  resolveStoreStaffAssignment,
} from '../../lib/types';
import {
  Button,
  ChannelTag,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  Pagination,
  Panel,
  Person,
  Select,
  Stat,
  StatRow,
  Status,
  closeShared,
  openShared,
  sharedFrom,
  BrandAvatar,
} from '../ui';
import type { Column } from '../ui';
import { formatNumber, formatPercent, formatVndShort } from '../../lib/format';
import { INITIAL_DEALS, INITIAL_STORE_PORTFOLIOS, INITIAL_BRANDS } from '../../lib/mockData';
import { INITIAL_MONTHLY_PLANS } from '../../lib/monthlyPlanData';
import {
  PROFILE_MONTH_OPTIONS,
  buildStoreMonthlyPlanReport,
  type StoreMonthlyPlanReport,
} from '../../lib/monthlyProfileMetrics';
import { StoreProfile } from '../stores/StoreProfile';
import { StoreHandoverDialog } from '../stores/StoreHandoverDialog';
import { StoreEditDialog } from '../stores/StoreEditDialog';
import { StoreCoefficientHubSection } from '../stores/StoreCoefficientHubSection';
import { isStoreManagedByUser, isStaffGlobalAdminOrManager } from '../../lib/rbacScope';

type StoreFilter = 'ALL' | 'MINE' | 'OVERBUDGET' | 'ZERO_BUDGET' | 'WITH_LEADER' | 'DIRECT_LEAD';
type StoreViewSubTab = 'DIRECTORY' | 'MONTHLY_COEFF_SETUP';

export interface StoreManagementViewProps {
  currentUser?: UserProfile | null;
  selectedStore?: string;
  stores?: StorePortfolioItem[];
  brands?: BrandDetail[];
  deals?: BookingDealItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onNavigateToBrandProfile?: (brandName: string) => void;
  onNavigateBackToMaster?: () => void;
  onDrilldownToPlan?: (params: {
    planId?: string;
    storeId?: string;
    storeName: string;
    brandName: string;
    month: string;
  }) => void;
  onDrilldownToListing?: (params: {
    planId?: string;
    storeName: string;
    brandName: string;
    month: string;
    salaryGrade?: SalaryGrade;
  }) => void;
  onDrilldownToBooking?: (params: {
    storeName: string;
    brandName: string;
    month: string;
    dealCode?: string;
  }) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
}

export function StoreManagementView({
  currentUser,
  selectedStore: propSelectedStore,
  stores = INITIAL_STORE_PORTFOLIOS,
  brands = INITIAL_BRANDS,
  deals = INITIAL_DEALS,
  monthlyPlans = INITIAL_MONTHLY_PLANS,
  onNotify,
  onUpdateStore,
  onNavigateToBrandProfile,
  onDrilldownToPlan,
  onDrilldownToListing,
  onDrilldownToBooking,
  onSelectDealForContract,
}: StoreManagementViewProps) {
  // Local modifications during the session
  const [storeOverrides, setStoreOverrides] = useState<Record<string, StorePortfolioItem>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [activeSubTab, setActiveSubTab] = useState<StoreViewSubTab>('DIRECTORY');

  const storeList = useMemo(() => {
    if (onUpdateStore) return stores;
    return stores.map(s => storeOverrides[s.id] || s);
  }, [stores, storeOverrides, onUpdateStore]);

  // Selected store key for detailed profile mode
  const [openStoreKey, setOpenStoreKey] = useState<string | null>(() => {
    if (propSelectedStore) {
      const found = stores.find(
        s =>
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
      const found = storeList.find(
        s =>
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

  // Map StoreId -> StoreMonthlyPlanReport cho kỳ tháng đang chọn
  const monthlyReportsByStoreId = useMemo(() => {
    const map = new Map<string, StoreMonthlyPlanReport>();
    for (const s of storeList) {
      map.set(
        s.id,
        buildStoreMonthlyPlanReport(s, selectedMonth, {
          plans: monthlyPlans,
          deals,
        })
      );
    }
    return map;
  }, [storeList, selectedMonth, monthlyPlans, deals]);

  const getStoreReport = useCallback(
    (s: StorePortfolioItem): StoreMonthlyPlanReport => {
      return (
        monthlyReportsByStoreId.get(s.id) ||
        buildStoreMonthlyPlanReport(s, selectedMonth, {
          plans: monthlyPlans,
          deals,
        })
      );
    },
    [monthlyReportsByStoreId, selectedMonth, monthlyPlans, deals]
  );

  // Filtered & searched rows
  const searchedStores = useMemo(() => {
    if (!search.trim()) return storeList;
    const q = search.trim().toLowerCase();
    return storeList.filter(s => {
      const assign = resolveStoreStaffAssignment(s, '');
      return (
        s.storeName.toLowerCase().includes(q) ||
        s.brandName.toLowerCase().includes(q) ||
        (s.storeOperationId && s.storeOperationId.toLowerCase().includes(q)) ||
        assign.allOwners.some(o => o.toLowerCase().includes(q)) ||
        (s.bookingLeader && s.bookingLeader.toLowerCase().includes(q))
      );
    });
  }, [storeList, search]);

  const matchesFilter = useCallback(
    (s: StorePortfolioItem, f: StoreFilter) => {
      if (f === 'ALL') return true;
      const rep = getStoreReport(s);
      if (f === 'MINE') {
        if (!currentUser) return true;
        return isStoreManagedByUser(s, currentUser);
      }
      if (f === 'OVERBUDGET') {
        return rep.isOverbudget || rep.isUnbudgetedSpend;
      }
      if (f === 'ZERO_BUDGET') {
        return rep.planBudgetNet === 0;
      }
      if (f === 'WITH_LEADER') {
        return Boolean(s.hasBookingLeader && s.bookingLeader);
      }
      if (f === 'DIRECT_LEAD') {
        return !s.hasBookingLeader || !s.bookingLeader;
      }
      return true;
    },
    [currentUser, getStoreReport]
  );

  const visibleStores = useMemo(() => {
    return searchedStores.filter(s => matchesFilter(s, filter));
  }, [searchedStores, filter, matchesFilter]);

  // Reset page when search or filter changes
  const [lastFilterQuery, setLastFilterQuery] = useState('');
  if (`${search}|${filter}|${selectedMonth}` !== lastFilterQuery) {
    setLastFilterQuery(`${search}|${filter}|${selectedMonth}`);
    setPage(1);
  }

  // Tổng hợp KPI Plan vs Report của kỳ tháng đang chọn trên toàn bộ gian hàng
  const monthlyKpiSummary = useMemo(() => {
    let planNmv = 0;
    let reportNmv = 0;
    let planBudgetNet = 0;
    let reportSpentNet = 0;
    let planVideos = 0;
    let reportAired = 0;
    let reportBooked = 0;
    let overbudgetCount = 0;

    for (const s of storeList) {
      const rep = getStoreReport(s);
      planNmv += rep.planNmv;
      reportNmv += rep.reportNmv;
      planBudgetNet += rep.planBudgetNet;
      reportSpentNet += rep.reportSpentNet;
      planVideos += rep.planTotalVideos;
      reportAired += rep.reportAiredVideos;
      reportBooked += rep.reportBookedVideos;
      if (rep.isOverbudget || rep.isUnbudgetedSpend) overbudgetCount += 1;
    }

    return {
      planNmv,
      reportNmv,
      planBudgetNet,
      reportSpentNet,
      planVideos,
      reportAired,
      reportBooked,
      overbudgetCount,
    };
  }, [storeList, getStoreReport]);

  // Handle store updates
  const canManageStores = Boolean(
    currentUser && (
      isStaffGlobalAdminOrManager(currentUser) ||
      currentUser.permissions?.includes('canManageMasterData')
    )
  );

  const handleSaveStore = (updated: StorePortfolioItem) => {
    if (!canManageStores) {
      onNotify?.('Bạn không có quyền chỉnh sửa thông số gian hàng.', 'warning');
      return;
    }
    setStoreOverrides(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateStore?.(updated);
    onNotify?.(`Đã cập nhật thông số định danh gian hàng ${updated.storeName}`, 'success');
  };

  const handleSilentUpdateStore = (updated: StorePortfolioItem) => {
    if (!canManageStores) return;
    setStoreOverrides(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateStore?.(updated);
  };

  const handleBulkUpdateStores = (updatedStores: StorePortfolioItem[]) => {
    if (!canManageStores) return;
    setStoreOverrides(prev => {
      const next = { ...prev };
      updatedStores.forEach(st => {
        next[st.id] = st;
      });
      return next;
    });
    updatedStores.forEach(st => onUpdateStore?.(st));
  };

  const handleConfirmHandover = (
    updated: StorePortfolioItem,
    logEntry: { fromPic: string; toPic: string; effectiveDate: string; reason: string }
  ) => {
    if (!canManageStores) {
      onNotify?.('Bạn không có quyền bàn giao PIC gian hàng.', 'warning');
      return;
    }
    setStoreOverrides(prev => ({ ...prev, [updated.id]: updated }));
    onUpdateStore?.(updated);
    // Đổi Booking chính: chỉ chuyển deal / Job chưa đề nghị thanh toán của người bị thay (máy chủ xử lý)
    if (logEntry.fromPic && logEntry.toPic && logEntry.fromPic.toLowerCase() !== logEntry.toPic.toLowerCase()) {
      void fetch('/api/deal-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TRANSFER_OWNER', storeId: updated.id, storeName: updated.storeName, fromPic: logEntry.fromPic, toPic: logEntry.toPic }),
      })
        .then(async res => {
          const body = await res.json().catch(() => null);
          if (res.ok && body?.transferred) onNotify?.(`Đã chuyển ${body.transferred} Job chưa thanh toán của ${logEntry.fromPic} sang ${logEntry.toPic}.`, 'success');
          else if (!res.ok) onNotify?.(`Chưa chuyển được deal: ${body?.error || res.status}`, 'warning');
        })
        .catch(() => undefined);
    }
    const assign = resolveStoreStaffAssignment(updated);
    const supportText =
      assign.supportStaff.length > 0 ? ` · Hỗ trợ: ${assign.supportStaff.join(', ')}` : '';
    onNotify?.(
      logEntry.fromPic.toLowerCase() !== logEntry.toPic.toLowerCase()
        ? `Đã bàn giao gian hàng ${updated.storeName} từ ${logEntry.fromPic} sang ${logEntry.toPic}${supportText}`
        : `Đã cập nhật phân công gian hàng ${updated.storeName}: Chính ${assign.primaryPic}${supportText}`,
      'success'
    );
  };

  // Currently open store for detail profile
  const openStore = useMemo(() => {
    if (!openStoreKey) return null;
    return storeList.find(s => s.id === openStoreKey) || null;
  }, [storeList, openStoreKey]);

  // Navigation within filtered stores for profile mode
  const currentStoreIndex = openStore
    ? visibleStores.findIndex(s => s.id === openStore.id)
    : -1;
  const prevStore =
    currentStoreIndex > 0 ? visibleStores[currentStoreIndex - 1] : undefined;
  const nextStore =
    currentStoreIndex >= 0 && currentStoreIndex < visibleStores.length - 1
      ? visibleStores[currentStoreIndex + 1]
      : undefined;

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
          monthlyPlans={monthlyPlans}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
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
          onOpenHandover={canManageStores ? s => setHandoverTarget(s) : undefined}
          onOpenEdit={canManageStores ? s => setEditTarget(s) : undefined}
          onUpdateStore={canManageStores ? handleSaveStore : undefined}
          onDrilldownToPlan={onDrilldownToPlan}
          onDrilldownToListing={onDrilldownToListing}
          onDrilldownToBooking={onDrilldownToBooking}
          onSelectDealForContract={onSelectDealForContract}
        />

        {canManageStores && handoverTarget && (
          <StoreHandoverDialog
            open={Boolean(handoverTarget)}
            onClose={() => setHandoverTarget(null)}
            store={handoverTarget}
            onConfirmHandover={handleConfirmHandover}
          />
        )}

        {canManageStores && editTarget && (
          <StoreEditDialog
            open={Boolean(editTarget)}
            onClose={() => setEditTarget(null)}
            store={editTarget}
            onSave={handleSaveStore}
            onOpenMonthlyPlan={
              onDrilldownToPlan
                ? st =>
                    onDrilldownToPlan({
                      storeId: st.id,
                      storeName: st.storeName,
                      brandName: st.brandName,
                      month: selectedMonth,
                    })
                : undefined
            }
          />
        )}
      </div>
    );
  }

  // Chips configuration
  const chips = (
    [
      { key: 'ALL', label: 'Tất cả' },
      { key: 'MINE', label: 'Tôi phụ trách' },
      { key: 'OVERBUDGET', label: `Cảnh báo chi (${selectedMonth})` },
      { key: 'ZERO_BUDGET', label: `Plan 0 đ (${selectedMonth})` },
      { key: 'WITH_LEADER', label: 'Có trưởng nhóm' },
      { key: 'DIRECT_LEAD', label: 'Trực tiếp trưởng phòng' },
    ] as { key: StoreFilter; label: string }[]
  ).map(item => ({
    key: item.key,
    label: item.label,
    count: searchedStores.filter(s => matchesFilter(s, item.key)).length,
  }));

  // DataTable columns
  const columns: Column<StorePortfolioItem>[] = [
    {
      key: 'storeName',
      header: 'Gian hàng sàn & ID',
      width: 175,
      render: s => (
        <div className="min-w-0 max-w-[190px] leading-tight">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              {...sharedFrom('store-title', s.id)}
              className="truncate font-medium text-ink text-xs"
            >
              {s.storeName}
            </span>
            <ChannelTag channel={s.platform} />
          </div>
          <span className="block truncate text-2xs text-ink-3 font-mono mt-0.5">
            {s.storeOperationId || s.id}
            {s.servicePackage && s.servicePackage !== 'E2E-S' ? ` · ${s.servicePackage}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'brandName',
      header: 'Thương hiệu',
      width: 140,
      render: s => (
        <div className="flex items-center gap-1.5 min-w-0">
          <BrandAvatar brandName={s.brandName} brandId={s.brandId} size={20} />
          <span className="truncate font-medium text-ink-2 text-xs">{s.brandName}</span>
        </div>
      ),
    },
    {
      key: 'pic',
      header: 'Nhân sự phụ trách',
      width: 155,
      render: s => {
        const assign = resolveStoreStaffAssignment(s, 'Chưa giao');
        return (
          <div
            className={`leading-tight ${canManageStores ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={
              canManageStores
                ? e => {
                    e.stopPropagation();
                    setHandoverTarget(s);
                  }
                : undefined
            }
            title={
              canManageStores
                ? 'Bấm để phân công Nhân viên chính & Nhân viên hỗ trợ'
                : undefined
            }
          >
            <div className="flex items-center gap-1 flex-wrap">
              <Person name={assign.primaryPic} size={18} />
              {assign.supportStaff.length > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded bg-accent-soft text-accent text-2xs font-semibold"
                  title={`Nhân viên hỗ trợ: ${assign.supportStaff.join(', ')}`}
                >
                  +{assign.supportStaff.length} hỗ trợ
                </span>
              )}
            </div>
            {assign.supportStaff.length > 0 && (
              <span
                className="block text-2xs text-ink-3 truncate max-w-[145px] mt-0.5"
                title={`Nhân viên hỗ trợ: ${assign.supportStaff.join(', ')}`}
              >
                Hỗ trợ: {assign.supportStaff.join(', ')}
              </span>
            )}
            {s.hasBookingLeader && s.bookingLeader && (
              <span className="block text-2xs text-accent font-medium mt-0.5 truncate max-w-[145px]">
                TN: {s.bookingLeader}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'storeCoefficient',
      header: 'Hệ số gian hàng',
      width: 110,
      align: 'center',
      render: s => {
        const norm = normalizeStoreCoefficient(s.difficultyTier, s.difficultyMultiplier);
        return (
          <div
            className={`inline-flex flex-col items-center gap-0.5 ${canManageStores ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={canManageStores ? e => {
              e.stopPropagation();
              setEditTarget(s);
            } : undefined}
            title={canManageStores ? 'Bấm để chỉnh sửa thông số gian hàng' : undefined}
          >
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink">
              <span>{norm.tier}</span>
              <span className="font-mono font-semibold text-ink-2">· {norm.label}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'nmvMonthly',
      header: `NMV Thực / KH (${selectedMonth})`,
      width: 130,
      align: 'right',
      render: s => {
        const rep = getStoreReport(s);
        return (
          <div className="leading-tight tabular-nums text-right font-mono">
            <span className="block font-medium text-ink text-xs">
              {rep.reportNmv > 0 ? formatVndShort(rep.reportNmv) : '0 đ'}
            </span>
            <span className="block text-2xs text-ink-3">
              / {rep.planNmv > 0 ? formatVndShort(rep.planNmv) : '0 đ'}
              {rep.planNmv > 0 && ` (${Math.round(rep.nmvAchievementPct)}%)`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'budgetMonthly',
      header: `Chi / Trần Net (${selectedMonth})`,
      width: 130,
      align: 'right',
      render: s => {
        const rep = getStoreReport(s);
        return (
          <div className="leading-tight tabular-nums text-right font-mono">
            <span
              className={`block font-medium text-xs ${
                rep.isOverbudget || rep.isUnbudgetedSpend ? 'text-critical' : 'text-ink'
              }`}
            >
              {rep.reportSpentNet > 0 ? formatVndShort(rep.reportSpentNet) : '0 đ'}
            </span>
            <span className="block text-2xs text-ink-3">
              / {rep.planBudgetNet > 0 ? formatVndShort(rep.planBudgetNet) : '0 đ'}
              {rep.planBudgetNet > 0 && ` (${Math.round(rep.budgetBurnPct)}%)`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'videosMonthly',
      header: `Video Air / KH (${selectedMonth})`,
      width: 120,
      align: 'right',
      render: s => {
        const rep = getStoreReport(s);
        return (
          <div className="leading-tight text-right tabular-nums font-mono">
            <span className="block font-medium text-ink text-xs">
              {formatNumber(rep.reportAiredVideos)} / {formatNumber(rep.planTotalVideos)}
            </span>
            <span className="block text-2xs text-ink-3 truncate max-w-[110px]" title="Affiliate / Kênh Brand">
              {rep.planAffVideos} Aff · {rep.planSelfVideos} Brand
            </span>
          </div>
        );
      },
    },
    {
      key: 'drilldown',
      header: 'Chi tiết',
      width: 115,
      align: 'right',
      render: s => {
        const rep = getStoreReport(s);
        return (
          <div
            className="inline-flex items-center justify-end gap-1"
            onClick={e => e.stopPropagation()}
          >
            {onDrilldownToPlan && (
              <Button
                size="sm"
                variant="secondary"
                icon={FileSpreadsheet}
                onClick={() =>
                  onDrilldownToPlan({
                    planId: rep.plan?.id,
                    storeId: s.id,
                    storeName: s.storeName,
                    brandName: s.brandName,
                    month: selectedMonth,
                  })
                }
              >
                Plan
              </Button>
            )}
            {onDrilldownToBooking && (
              <Button
                size="sm"
                variant="ghost"
                icon={Video}
                onClick={() =>
                  onDrilldownToBooking({
                    storeName: s.storeName,
                    brandName: s.brandName,
                    month: selectedMonth,
                  })
                }
              >
                Booking
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Thanh chuyển đổi giữa Danh bạ Gian hàng & Màn hình Setup Hệ số Gian hàng Hàng loạt theo Tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-line rounded-xl p-2.5 shadow-2xs">
        <div className="inline-flex items-center gap-1 p-1 bg-sunken rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setActiveSubTab('DIRECTORY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'DIRECTORY'
                ? 'bg-surface text-ink shadow-2xs border border-line-strong'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Danh bạ &amp; Chỉ số Gian hàng ({storeList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('MONTHLY_COEFF_SETUP')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'MONTHLY_COEFF_SETUP'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Hệ số Gian hàng</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'MONTHLY_COEFF_SETUP' ? (
        <StoreCoefficientHubSection
          stores={storeList}
          brands={brands}
          plans={monthlyPlans}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          currentUser={currentUser}
          onUpdateStore={handleSilentUpdateStore}
          onBulkUpdateStores={handleBulkUpdateStores}
          onNotify={onNotify}
        />
      ) : (
        <>
          <StatRow>
            <Stat
              label={`Doanh số NMV (${selectedMonth})`}
              value={formatVndShort(monthlyKpiSummary.reportNmv)}
              progress={
                monthlyKpiSummary.planNmv > 0
                  ? { value: monthlyKpiSummary.reportNmv, max: monthlyKpiSummary.planNmv }
                  : undefined
              }
              note={`Plan giao kỳ ${selectedMonth}: ${formatVndShort(monthlyKpiSummary.planNmv)} (${
                monthlyKpiSummary.planNmv > 0
                  ? formatPercent(monthlyKpiSummary.reportNmv / monthlyKpiSummary.planNmv, 0)
                  : '0%'
              })`}
              tone="positive"
            />
            <Stat
              label={`Ngân sách Net (${selectedMonth})`}
              value={formatVndShort(monthlyKpiSummary.reportSpentNet)}
              progress={{
                value: monthlyKpiSummary.reportSpentNet,
                max: monthlyKpiSummary.planBudgetNet || 1,
                invert: monthlyKpiSummary.reportSpentNet > monthlyKpiSummary.planBudgetNet,
              }}
              note={`Hạn mức Plan Net kỳ ${selectedMonth}: ${formatVndShort(monthlyKpiSummary.planBudgetNet)}`}
              tone={
                monthlyKpiSummary.reportSpentNet > monthlyKpiSummary.planBudgetNet
                  ? 'critical'
                  : 'positive'
              }
            />
            <Stat
              label={`Sản lượng Video & Booking (${selectedMonth})`}
              value={`${formatNumber(monthlyKpiSummary.reportAired)} / ${formatNumber(
                monthlyKpiSummary.planVideos
              )} video`}
              progress={
                monthlyKpiSummary.planVideos > 0
                  ? { value: monthlyKpiSummary.reportAired, max: monthlyKpiSummary.planVideos }
                  : undefined
              }
              note={`Đã tạo ${formatNumber(monthlyKpiSummary.reportBooked)} deal booking trong kỳ`}
            />
            <Stat
              label="Danh mục Gian hàng B2C"
              value={`${storeList.length} gian hàng`}
              note={
                monthlyKpiSummary.overbudgetCount > 0
                  ? `${monthlyKpiSummary.overbudgetCount} gian hàng có cảnh báo chi kỳ ${selectedMonth}`
                  : `Toàn bộ gian hàng nằm trong trần kỳ ${selectedMonth}`
              }
              tone={monthlyKpiSummary.overbudgetCount > 0 ? 'warning' : 'positive'}
            />
          </StatRow>

          <Panel flush>
            <div className="p-4 border-b border-line flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex-1">
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

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                <div className="flex items-center gap-1.5 text-xs text-ink-2 bg-canvas border border-line rounded-md px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-2xs font-medium text-ink-3">Kỳ tháng:</span>
                  <Select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-48 border-0 bg-transparent h-6 text-xs font-semibold text-ink focus:ring-0 px-1"
                  >
                    {PROFILE_MONTH_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
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

            {canManageStores && handoverTarget && (
              <StoreHandoverDialog
                open={Boolean(handoverTarget)}
                onClose={() => setHandoverTarget(null)}
                store={handoverTarget}
                onConfirmHandover={handleConfirmHandover}
              />
            )}

            {canManageStores && editTarget && (
              <StoreEditDialog
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                store={editTarget}
                onSave={handleSaveStore}
                onOpenMonthlyPlan={
                  onDrilldownToPlan
                    ? st =>
                        onDrilldownToPlan({
                          storeId: st.id,
                          storeName: st.storeName,
                          brandName: st.brandName,
                          month: selectedMonth,
                        })
                    : undefined
                }
              />
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
