'use client';

/**
 * Hồ sơ thương hiệu:
 * - Tách bạch hồ sơ định danh tĩnh (Pháp nhân, Định vị, SKU, Từ cấm, Kho tệp R2)
 *   với Hồ sơ Tháng (Plan & Report theo từng kỳ tháng: Doanh số NMV, Ngân sách Net, Sản lượng Video, 3 vị trí gắn theo Brand).
 * - Từ danh sách hoặc từ chi tiết thương hiệu có thể drill-down trực tiếp sang Kế hoạch tháng (Plan), Đề xuất KOC, Quản lý Booking hoặc Hồ sơ gian hàng.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Cloud, FileSpreadsheet, HardDrive, Layers, Loader2, Video } from 'lucide-react';
import type { BookingDealItem, BrandDetail, InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../../lib/types';
import type { BrandProfile, BrandSection } from '../../lib/brands/types';
import { brandKey } from '../../lib/brands/types';
import { UPBASE_BRANDS_MASTER, UPBASE_STORES_MASTER } from '../../lib/importedMasterData';
import { formatNumber, formatVndShort } from '../../lib/format';
import {
  PROFILE_MONTH_OPTIONS,
  buildBrandMonthlyPlanReport,
  type BrandMonthlyPlanReport,
} from '../../lib/monthlyProfileMetrics';
import {
  BrandAvatar,
  Button,
  ChannelTag,
  Chips,
  DataTable,
  EmptyState,
  FilterBar,
  PageActions,
  PageHeaderNav,
  Pagination,
  Panel,
  Stat,
  StatRow,
  Skeleton,
  channelOf,
  closeShared,
  openShared,
  sharedFrom,
} from '../ui';
import type { Column } from '../ui';
import { BrandProfileDetail, type BrandDetailTab } from '../brands/BrandProfileDetail';
import { CloudflareR2SetupModal } from '../brands/CloudflareR2SetupPanel';
import { buildRows, isExpired, permissionsOf, real, type BrandAccess, type BrandRow } from '../brands/brandUi';
import { getSharedProfilesSnapshot, subscribeSharedProfiles, updateSharedProfilesCache } from '../../lib/brands/useBrandProfiles';
import { isBrandManagedByUser } from '../../lib/rbacScope';

type Filter = 'ALL' | 'MINE' | 'KEY_BUDGET' | 'COMPLETE' | 'EXPIRED_LEGAL';

class LoadError extends Error { constructor(message: string, public status: number) { super(message); } }

// Bộ nhớ tạm phía client giúp chuyển tab tức thì không cần tải lại
let brandProfilesClientCache: { profiles: BrandProfile[]; access: BrandAccess } | null = null;

async function request<T>(body?: unknown): Promise<T> {
  const res = await fetch('/api/brands/profiles', {
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LoadError(data.error || 'Không tải được hồ sơ thương hiệu.', res.status);
  return data as T;
}

export function BrandProfilesView({
  currentUser,
  selectedBrand = 'ALL',
  brands,
  stores,
  deals = [],
  monthlyPlans,
  onNotify,
  onOpenBooking,
  onNavigateToStoreProfile,
  onUpdateStore,
  onDrilldownToPlan,
  onDrilldownToListing,
  onDrilldownToBooking,
  onSelectDealForContract,
  initialDetailTab,
}: {
  currentUser?: UserProfile | null;
  selectedBrand?: string;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  monthlyPlans?: InputPlanBreakdownState[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenBooking?: () => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
  onUpdateStore?: (store: StorePortfolioItem) => void;
  onDrilldownToPlan?: (params: { planId?: string; storeId?: string; storeName?: string; brandName?: string; month: string }) => void;
  onDrilldownToListing?: (params: { storeName?: string; brandName?: string; month: string }) => void;
  onDrilldownToBooking?: (params: { storeName?: string; brandName?: string; dealCode?: string; month: string }) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  initialDetailTab?: BrandDetailTab;
}) {
  const [profiles, setProfiles] = useState<BrandProfile[] | null>(() => getSharedProfilesSnapshot()?.profiles || brandProfilesClientCache?.profiles || null);
  const [access, setAccess] = useState<BrandAccess | undefined>(() => getSharedProfilesSnapshot()?.access || brandProfilesClientCache?.access);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(selectedBrand !== 'ALL' ? brandKey(selectedBrand) : null);
  const [detailTab, setDetailTab] = useState<BrandDetailTab | undefined>(initialDetailTab);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026/10');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [r2SetupOpen, setR2SetupOpen] = useState(false);

  const load = useCallback(
    () => request<{ profiles: BrandProfile[]; access: BrandAccess }>().then(r => {
      brandProfilesClientCache = r;
      updateSharedProfilesCache(r.profiles, r.access);
      setProfiles(r.profiles);
      setAccess(r.access);
      setLoadError(null);
    }),
    [],
  );

  // Tải lần đầu hoặc đồng bộ ngầm khi đổi người dùng, đồng thời nhận cập nhật từ các màn khác
  useEffect(() => {
    let isCancelled = false;
    const unsubscribe = subscribeSharedProfiles(next => {
      if (!isCancelled) {
        setProfiles(next.profiles);
        if (next.access) setAccess(next.access);
      }
    });
    request<{ profiles: BrandProfile[]; access: BrandAccess }>()
      .then(r => {
        if (!isCancelled) {
          brandProfilesClientCache = r;
          updateSharedProfilesCache(r.profiles, r.access);
          setProfiles(r.profiles);
          setAccess(r.access);
          setLoadError(null);
        }
      })
      .catch(e => {
        if (!isCancelled && !brandProfilesClientCache) {
          setLoadError(e instanceof LoadError ? e : new LoadError((e as Error).message, 503));
        }
      });
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Bộ chọn Nhãn trên thanh trên quyết định nhãn đang mở.
  const [syncedBrand, setSyncedBrand] = useState(selectedBrand);
  if (selectedBrand !== syncedBrand) {
    setSyncedBrand(selectedBrand);
    setOpenKey(selectedBrand !== 'ALL' ? brandKey(selectedBrand) : null);
  }

  const allStores = stores !== undefined ? stores : UPBASE_STORES_MASTER;
  const baseBrands = brands !== undefined ? brands : UPBASE_BRANDS_MASTER;
  const rows = useMemo(() => buildRows(baseBrands, profiles || []), [baseBrands, profiles]);

  // Gom nhóm gian hàng theo brandKey và tổng hợp báo cáo Plan vs Report theo kỳ tháng đang chọn (selectedMonth)
  const monthlyReportByBrand = useMemo(() => {
    const storesByKey = new Map<string, StorePortfolioItem[]>();
    for (const s of allStores) {
      const bName = s.brandName || s.storeName?.split('_')[0] || '';
      if (!bName) continue;
      const k = brandKey(bName);
      const list = storesByKey.get(k) || [];
      list.push(s);
      storesByKey.set(k, list);
    }

    const reportMap = new Map<string, BrandMonthlyPlanReport>();
    for (const r of rows) {
      const bStores = storesByKey.get(r.key) || [];
      reportMap.set(
        r.key,
        buildBrandMonthlyPlanReport(r.name, bStores, selectedMonth, {
          monthlyPlans,
          deals,
        }),
      );
    }
    return reportMap;
  }, [allStores, rows, selectedMonth, monthlyPlans, deals]);

  const matches: Record<Filter, (r: BrandRow) => boolean> = useMemo(() => ({
    ALL: () => true,
    MINE: r => {
      if (!currentUser) return false;
      return isBrandManagedByUser(r.name, currentUser, allStores);
    },
    KEY_BUDGET: r => {
      const rep = monthlyReportByBrand.get(r.key);
      return (rep?.planBudgetNet || 0) >= 20_000_000;
    },
    COMPLETE: r => r.done === r.total,
    EXPIRED_LEGAL: r => r.profile.legal.length === 0 || r.profile.legal.some(l => Boolean(l.validUntil && isExpired(l.validUntil))),
  }), [currentUser, allStores, monthlyReportByBrand]);

  const searched = useMemo(() => rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${r.name} ${real(r.master?.code)} ${real(r.master?.category)} ${real(r.master?.accountPic)} ${real(r.master?.brandPicName)}`.toLowerCase().includes(q);
  }), [rows, search]);

  const visible = useMemo(() => searched.filter(matches[filter]), [searched, matches, filter]);
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

  // Chỉ số KPI tổng hợp toàn bộ thương hiệu B2C trong kỳ tháng đang chọn
  const kpiSummary = useMemo(() => {
    let totalStores = 0;
    let totalPlanNmv = 0;
    let totalReportNmv = 0;
    let totalPlanBudgetNet = 0;
    let totalReportSpentNet = 0;
    let totalPlanVideos = 0;
    let totalAiredVideos = 0;
    let totalBookedDeals = 0;
    let completeCount = 0;
    let totalDocs = 0;
    let totalLegal = 0;
    let uploadedFiles = 0;

    for (const r of rows) {
      const rep = monthlyReportByBrand.get(r.key);
      totalStores += rep?.storeCount || r.master?.storeCount || 0;
      totalPlanNmv += rep?.planNmv || 0;
      totalReportNmv += rep?.reportNmv || 0;
      totalPlanBudgetNet += rep?.planBudgetNet || 0;
      totalReportSpentNet += rep?.reportSpentNet || 0;
      totalPlanVideos += rep?.planTotalVideos || 0;
      totalAiredVideos += rep?.reportAiredCount || 0;
      totalBookedDeals += rep?.reportBookedCount || 0;
      if (r.done === r.total) completeCount += 1;
      totalDocs += r.profile.documents.length;
      totalLegal += r.profile.legal.length;
      uploadedFiles += r.profile.documents.filter(d => d.storage === 'R2' || d.storage === 'LOCAL').length
        + r.profile.legal.filter(l => l.storage === 'R2' || l.storage === 'LOCAL').length;
    }

    return {
      totalStores,
      totalPlanNmv,
      totalReportNmv,
      totalPlanBudgetNet,
      totalReportSpentNet,
      totalPlanVideos,
      totalAiredVideos,
      totalBookedDeals,
      completeCount,
      totalDocs,
      totalLegal,
      uploadedFiles,
    };
  }, [rows, monthlyReportByBrand]);

  const save = async (row: BrandRow, section: BrandSection, data: unknown, summary?: string) => {
    setBusy(true);
    try {
      const r = await request<{ profile: BrandProfile }>({ brandName: row.name, revision: row.profile.revision, section, data, summary });
      const nextProfiles = [...(profiles || []).filter(p => p.key !== r.profile.key), r.profile];
      setProfiles(nextProfiles);
      if (brandProfilesClientCache) brandProfilesClientCache.profiles = nextProfiles;
      updateSharedProfilesCache(nextProfiles, access);
      onNotify?.(summary ? `Đã lưu: ${summary.charAt(0).toLowerCase()}${summary.slice(1)}` : 'Đã lưu hồ sơ', 'success');
      return true;
    } catch (e) {
      onNotify?.((e as Error).message, 'error');
      if (e instanceof LoadError && e.status === 409) await load().catch(() => undefined);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const [prevInitialDetailTab, setPrevInitialDetailTab] = useState<BrandDetailTab | undefined>(initialDetailTab);
  if (initialDetailTab !== prevInitialDetailTab) {
    setPrevInitialDetailTab(initialDetailTab);
    if (initialDetailTab) {
      setDetailTab(initialDetailTab);
      if (!openKey && visible.length > 0) {
        setOpenKey(visible[0].key);
      }
    }
  }

  if (loadError && !profiles) {
    return (
      <Panel>
        <EmptyState
          title={loadError.status === 401 ? 'Cần đăng nhập để xem hồ sơ thương hiệu' : 'Chưa tải được hồ sơ thương hiệu'}
          description={loadError.message}
          action={<Button onClick={() => load().catch(() => undefined)}>Thử lại</Button>}
        />
      </Panel>
    );
  }

  // Danh sách ↔ hồ sơ: ảnh và tên thương hiệu bay giữa hàng bảng và đầu hồ sơ (DESIGN_SYSTEM.md §9).
  const openBrand = (key: string, tab?: BrandDetailTab) => {
    setDetailTab(tab);
    openShared(key, () => setOpenKey(key));
  };
  const closeBrand = (key: string) => closeShared(key, () => setOpenKey(null));

  const open = openKey ? rows.find(r => r.key === openKey) : undefined;
  if (open) {
    const idx = visible.findIndex(r => r.key === open.key);
    return (
      <BrandProfileDetail
        key={open.key}
        row={open}
        can={permissionsOf(access, real(open.master?.accountPic), open.name)}
        deals={deals}
        stores={allStores}
        monthlyPlans={monthlyPlans}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        busy={busy}
        onBack={() => closeBrand(open.key)}
        nav={{
          onPrev: idx > 0 ? () => setOpenKey(visible[idx - 1].key) : undefined,
          onNext: idx >= 0 && idx < visible.length - 1 ? () => setOpenKey(visible[idx + 1].key) : undefined,
          position: idx >= 0 ? idx + 1 : undefined,
          total: visible.length,
        }}
        onSave={(section, data, summary) => save(open, section, data, summary)}
        onOpenBooking={onOpenBooking}
        onNavigateToStoreProfile={onNavigateToStoreProfile}
        onUpdateStore={onUpdateStore}
        onDrilldownToPlan={onDrilldownToPlan}
        onDrilldownToListing={onDrilldownToListing}
        onDrilldownToBooking={onDrilldownToBooking}
        onSelectDealForContract={onSelectDealForContract}
        onNotify={onNotify}
        initialTab={detailTab}
        currentUser={currentUser}
      />
    );
  }

  const isSyncing = !profiles;

  const chips = (['ALL', 'MINE', 'KEY_BUDGET', 'COMPLETE', 'EXPIRED_LEGAL'] as Filter[]).map(key => ({
    key,
    label: {
      ALL: 'Tất cả nhãn',
      MINE: 'Tôi phụ trách',
      KEY_BUDGET: `Plan Net ≥ 20tr (${selectedMonth})`,
      COMPLETE: 'Đủ 8/8 mục tĩnh',
      EXPIRED_LEGAL: 'Cần rà soát pháp lý',
    }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<BrandRow>[] = [
    {
      key: 'name',
      header: 'Thương hiệu & Sàn',
      width: 200,
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const platforms = rep?.platforms.length ? rep.platforms : (r.master?.platforms || []);
        const count = rep?.storeCount || r.master?.storeCount || 0;
        const category = real(r.master?.category);
        return (
          <div className="min-w-0 leading-tight flex items-start gap-2.5">
            <span {...sharedFrom('brand-avatar', r.key)} className="shrink-0 mt-0.5">
              <BrandAvatar name={r.name} id={r.master?.id} code={r.master?.code} size={32} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span {...sharedFrom('brand-title', r.key)} className="truncate font-semibold text-ink text-xs" title={r.name}>
                  {r.name}
                </span>
                <span className="text-2xs font-mono text-ink-3 shrink-0">
                  ({count} gian)
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {category && (
                  <span className="truncate text-2xs text-ink-3 max-w-[130px]" title={category}>
                    {category}
                  </span>
                )}
                {platforms.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {platforms.map(p => (
                      <ChannelTag key={p} channel={channelOf(p)} iconOnly />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'pic',
      header: 'PIC Brand & Account',
      width: 170,
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const acc = real(r.master?.accountPic);
        const contentMain = rep?.brandPlan?.contentBrandMainPic || real(r.master?.contentBrandMainPic) || real(r.master?.contentPic);
        const planStrat = rep?.brandPlan?.planStrategyPic || real(r.master?.planStrategyPic) || real(r.master?.brandPicName);
        const kvSis = rep?.brandPlan?.keyVisualSisPic || real(r.master?.keyVisualSisPic);

        const subInfo = [
          contentMain && contentMain !== planStrat ? contentMain : null,
          acc && acc !== planStrat && acc !== contentMain ? acc : null,
        ].filter(Boolean).join(' · ');

        const tooltip = [
          planStrat ? `Plan/Lead: ${planStrat}` : null,
          contentMain ? `Content: ${contentMain}` : null,
          kvSis ? `KV/SIS: ${kvSis}` : null,
          acc ? `Account: ${acc}` : null,
        ].filter(Boolean).join('\n');

        return (
          <div className="leading-tight text-xs space-y-0.5" title={tooltip}>
            <div className="font-medium text-ink truncate max-w-[160px]">
              {planStrat || acc || 'Chưa gán'}
            </div>
            {(subInfo || kvSis) && (
              <div className="text-2xs text-ink-3 truncate max-w-[160px]">
                {subInfo || kvSis}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'nmv',
      header: `NMV (${selectedMonth})`,
      width: 125,
      align: 'right',
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const planNmv = rep?.planNmv || 0;
        const reportNmv = rep?.reportNmv || 0;
        const pct = planNmv > 0 ? Math.round((reportNmv / planNmv) * 100) : 0;
        return (
          <div className="leading-tight tabular-nums text-right">
            <span className="block font-mono font-semibold text-ink text-xs">
              {planNmv > 0 ? formatVndShort(planNmv) : 'Theo sàn'}
            </span>
            <div className="text-2xs font-mono mt-0.5">
              {reportNmv > 0 ? (
                <span className="text-accent font-medium">
                  Đạt {formatVndShort(reportNmv)}
                  {planNmv > 0 && <span className="text-ink-3 font-normal"> ({pct}%)</span>}
                </span>
              ) : (
                <span className="text-ink-3">Chưa có số</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'budget',
      header: `Ngân sách Net (${selectedMonth})`,
      width: 130,
      align: 'right',
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const budget = rep?.planBudgetNet || 0;
        const spent = rep?.reportSpentNet || 0;
        const isOver = (rep?.overbudgetStoresCount || 0) > 0 || (budget > 0 && spent > budget);
        const isUnbudgeted = (rep?.unbudgetedStoresCount || 0) > 0 || (budget === 0 && spent > 0);
        const burnPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        return (
          <div className="leading-tight tabular-nums text-right">
            <span className="block font-mono font-semibold text-ink text-xs">
              {budget > 0 ? formatVndShort(budget) : '0 đ'}
            </span>
            <div className="flex items-center justify-end gap-1 mt-0.5 text-2xs font-mono">
              <span className={isOver || isUnbudgeted ? 'text-critical font-medium' : 'text-ink-3'}>
                Chi: {formatVndShort(spent)}
              </span>
              {isUnbudgeted ? (
                <span className="px-1 py-0.5 rounded bg-critical-soft text-critical text-2xs font-semibold leading-none">
                  Ngoài KH
                </span>
              ) : isOver ? (
                <span className="px-1 py-0.5 rounded bg-critical-soft text-critical text-2xs font-semibold leading-none">
                  Vượt NS
                </span>
              ) : budget > 0 ? (
                <span className="text-ink-3">({burnPct}%)</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'videos',
      header: `Video (${selectedMonth})`,
      width: 115,
      align: 'right',
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const aired = rep?.reportAiredCount || 0;
        const plan = rep?.planTotalVideos || 0;
        const dealsCount = rep?.reportBookedCount || 0;
        return (
          <div className="leading-tight tabular-nums text-right">
            <div className="text-xs font-mono">
              <strong className="text-positive font-semibold">{aired}</strong>
              <span className="text-ink-3 font-normal"> / {plan > 0 ? plan : '—'}</span>
            </div>
            <div className="text-2xs text-ink-3 mt-0.5">
              {dealsCount} booking
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'SKU & Tài liệu',
      width: 110,
      render: r => {
        if (isSyncing) return <Skeleton className="w-20" />;
        const isComplete = r.done === r.total;
        return (
          <div className="leading-tight">
            <div className="text-xs font-medium text-ink flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-ink-3/70" />
              <span>{r.profile.products.length} SKU · {r.profile.documents.length} tệp</span>
            </div>
            {!isComplete && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-warning-soft text-warning mt-0.5">
                {r.done}/{r.total} mục
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'drilldown',
      header: 'Thao tác',
      width: 175,
      align: 'right',
      render: r => (
        <div className="inline-flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-2xs font-medium text-ink bg-surface hover:bg-sunken border border-line-strong transition-colors shadow-2xs"
            title={`Mở Sản phẩm & Góc nội dung của ${r.name}`}
            onClick={() => openBrand(r.key, 'PRODUCTS')}
          >
            <Layers className="w-3 h-3 text-accent" />
            <span>Góc SP</span>
          </button>
          {onDrilldownToPlan && (
            <button
              type="button"
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-2xs font-medium text-ink bg-surface hover:bg-sunken border border-line-strong transition-colors shadow-2xs"
              title={`Mở Kế hoạch tháng của ${r.name}`}
              onClick={() => onDrilldownToPlan({ brandName: r.name, month: selectedMonth })}
            >
              <FileSpreadsheet className="w-3 h-3 text-accent" />
              <span>Plan</span>
            </button>
          )}
          {(onDrilldownToBooking || onOpenBooking) && (
            <button
              type="button"
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-2xs font-medium text-ink bg-surface hover:bg-sunken border border-line-strong transition-colors shadow-2xs"
              title={`Mở Booking của ${r.name}`}
              onClick={() => {
                if (onDrilldownToBooking) {
                  onDrilldownToBooking({ brandName: r.name, month: selectedMonth });
                } else {
                  onOpenBooking?.();
                }
              }}
            >
              <Video className="w-3 h-3 text-positive" />
              <span>Booking</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const activeMonthLabel = PROFILE_MONTH_OPTIONS.find(m => m.value === selectedMonth)?.shortLabel || `Tháng ${selectedMonth}`;

  return (
    <div className="space-y-3">
      <PageHeaderNav>
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-accent" />
          <span className="text-ink-3">Kỳ hồ sơ:</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent font-semibold text-ink focus:outline-none cursor-pointer"
            aria-label="Chọn kỳ hồ sơ tháng của thương hiệu"
          >
            {PROFILE_MONTH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </PageHeaderNav>

      <PageActions>
        <Button
          size="sm"
          variant="secondary"
          icon={Cloud}
          onClick={() => setR2SetupOpen(true)}
        >
          Cấu hình Cloudflare R2
        </Button>
      </PageActions>

      <StatRow size="sm">
        <Stat
          label={`Doanh số NMV (${activeMonthLabel})`}
          value={kpiSummary.totalReportNmv > 0 ? formatVndShort(kpiSummary.totalReportNmv) : '0 đ'}
          progress={
            kpiSummary.totalPlanNmv > 0
              ? { value: kpiSummary.totalReportNmv, max: kpiSummary.totalPlanNmv }
              : undefined
          }
          note={`Plan NMV: ${formatVndShort(kpiSummary.totalPlanNmv)} · ${rows.length} nhãn (${kpiSummary.totalStores} gian)`}
          tone="positive"
        />
        <Stat
          label={`Ngân sách Net (${activeMonthLabel})`}
          value={formatVndShort(kpiSummary.totalReportSpentNet)}
          progress={{
            value: kpiSummary.totalReportSpentNet,
            max: kpiSummary.totalPlanBudgetNet || 1,
            invert: kpiSummary.totalReportSpentNet > kpiSummary.totalPlanBudgetNet,
          }}
          note={`Plan Net: ${formatVndShort(kpiSummary.totalPlanBudgetNet)} · Đã chốt ${kpiSummary.totalBookedDeals} deal`}
          tone={kpiSummary.totalReportSpentNet > kpiSummary.totalPlanBudgetNet ? 'critical' : 'positive'}
        />
        <Stat
          label={`Sản lượng Video (${activeMonthLabel})`}
          value={`${formatNumber(kpiSummary.totalAiredVideos)} / ${formatNumber(kpiSummary.totalPlanVideos)} video`}
          progress={
            kpiSummary.totalPlanVideos > 0
              ? { value: kpiSummary.totalAiredVideos, max: kpiSummary.totalPlanVideos }
              : undefined
          }
          note={`Đã chốt ${kpiSummary.totalBookedDeals} deal KOC trong kỳ ${selectedMonth}`}
        />
        <Stat
          label="Hồ sơ tĩnh & Tài liệu R2"
          value={`${kpiSummary.completeCount}/${rows.length} nhãn đủ 8/8 mục`}
          note={`${kpiSummary.totalDocs} tài liệu · ${kpiSummary.totalLegal} giấy phép pháp lý`}
          tone="positive"
        />
      </StatRow>

      <Panel flush>
        <div className="px-3.5 py-2.5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex-1">
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: 'Tìm tên nhãn, mã brand, ngành hàng, Account/Booking PIC…' }}
              chips={<Chips items={chips} value={filter} onChange={setFilter} />}
              resultCount={search.trim() ? visible.length : undefined}
            />
          </div>
          {isSyncing && (
            <div className="flex items-center gap-1.5 text-xs text-ink-3 shrink-0 self-end sm:self-auto py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-3" />
              <span>Đang đồng bộ hồ sơ…</span>
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={visible.slice((page - 1) * 20, page * 20)}
          rowKey={r => r.key}
          onRowClick={r => openBrand(r.key)}
          empty={<EmptyState title="Không có nhãn hàng khớp" />}
        />
        <Pagination page={page} pageSize={20} total={visible.length} onPageChange={setPage} />
      </Panel>

      <CloudflareR2SetupModal
        open={r2SetupOpen}
        onClose={() => setR2SetupOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
}

