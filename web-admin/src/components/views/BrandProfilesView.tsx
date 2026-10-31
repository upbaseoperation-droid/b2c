'use client';

/**
 * Hồ sơ thương hiệu:
 * - Tách bạch hồ sơ định danh tĩnh (Pháp nhân, Định vị, SKU, Từ cấm, Kho tệp R2)
 *   với Hồ sơ Tháng (Plan & Report theo từng kỳ tháng: Doanh số NMV, Ngân sách Net, Sản lượng Video, 3 vị trí gắn theo Brand).
 * - Từ danh sách hoặc từ chi tiết thương hiệu có thể drill-down trực tiếp sang Kế hoạch tháng (Plan), Đề xuất KOC, Quản lý Booking hoặc Hồ sơ gian hàng.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, HardDrive, Layers, Loader2 } from 'lucide-react';
import type { BookingDealItem, BrandDetail, InputPlanBreakdownState, StorePortfolioItem, UserProfile } from '../../lib/types';
import type { BrandProfile, BrandSection } from '../../lib/brands/types';
import { brandKey } from '../../lib/brands/types';
import { UPBASE_BRANDS_MASTER, UPBASE_STORES_MASTER } from '../../lib/importedMasterData';
import {
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
  Pagination,
  Panel,
  Skeleton,
  channelOf,
  closeShared,
  openShared,
  sharedFrom,
} from '../ui';
import type { Column } from '../ui';
import { BrandProfileDetail, type BrandDetailTab } from '../brands/BrandProfileDetail';
import { buildRows, permissionsOf, real, type BrandAccess, type BrandRow } from '../brands/brandUi';
import { getSharedProfilesSnapshot, subscribeSharedProfiles, updateSharedProfilesCache } from '../../lib/brands/useBrandProfiles';
import { isBrandManagedByUser } from '../../lib/rbacScope';
import { isStorePicOfBrand } from '../../lib/storePositions';

type Filter = 'ALL' | 'MINE' | 'HAS_PRODUCTS' | 'HAS_DOCS';

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

  // Account theo gian hàng trong Dữ liệu gốc, không theo accountPic của thương hiệu (quyết định 30/10/2026).
  const accountsByKey = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of allStores) {
      const name = real(s.accountOwnerName);
      if (!name || /^chưa/i.test(name)) continue;
      const k = brandKey(s.brandName || s.storeName?.split('_')[0] || '');
      const list = map.get(k) || [];
      if (!list.includes(name)) list.push(name);
      map.set(k, list);
    }
    return map;
  }, [allStores]);

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
    HAS_PRODUCTS: r => r.profile.products.length > 0,
    HAS_DOCS: r => r.profile.documents.length > 0 || r.profile.legal.length > 0,
  }), [currentUser, allStores]);

  const searched = useMemo(() => rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${r.name} ${real(r.master?.code)} ${real(r.master?.category)} ${(accountsByKey.get(r.key) || []).join(' ')} ${real(r.master?.brandPicName)}`.toLowerCase().includes(q);
  }), [rows, search, accountsByKey]);

  const visible = useMemo(() => searched.filter(matches[filter]), [searched, matches, filter]);
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

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

  useEffect(() => {
    const onSubView = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab !== 'brand-knowledge') return;
      if (detail.subView === 'PRODUCTS') {
        setDetailTab('PRODUCTS');
        if (!openKey && visible.length > 0) {
          setOpenKey(visible[0].key);
        }
      } else if (detail.subView === 'OVERVIEW') {
        setDetailTab('OVERVIEW');
        setOpenKey(null);
      }
    };
    window.addEventListener('upbase-sidebar-subview', onSubView);
    return () => window.removeEventListener('upbase-sidebar-subview', onSubView);
  }, [openKey, visible]);

  if (loadError && !profiles) {
    return (
      <Panel>
        <EmptyState
          title={loadError.status === 401 ? 'Cần đăng nhập để xem hồ sơ thương hiệu' : 'Chưa tải được hồ sơ thương hiệu'}

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
        can={permissionsOf(access, (accountsByKey.get(open.key) || [])[0], open.name, isStorePicOfBrand(currentUser, open.name, allStores))}
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

  const chips = (['ALL', 'MINE', 'HAS_PRODUCTS', 'HAS_DOCS'] as Filter[]).map(key => ({
    key,
    label: {
      ALL: 'Tất cả nhãn',
      MINE: 'Tôi phụ trách',
      HAS_PRODUCTS: 'Đã có sản phẩm',
      HAS_DOCS: 'Đã có tài liệu',
    }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<BrandRow>[] = [
    {
      key: 'name',
      header: 'Thương hiệu & Sàn',
      width: 240,
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const platforms = rep?.platforms.length ? rep.platforms : (r.master?.platforms || []);
        const count = rep?.storeCount || r.master?.storeCount || 0;
        const category = real(r.master?.category);
        return (
          <div className="min-w-0 leading-tight flex items-start gap-3">
            <span {...sharedFrom('brand-avatar', r.key)} className="shrink-0 mt-0.5">
              <BrandAvatar name={r.name} id={r.master?.id} code={r.master?.code} size={32} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span {...sharedFrom('brand-title', r.key)} className="truncate font-semibold text-ink text-xs" title={r.name}>
                  {r.name}
                </span>
                <span className="text-2xs font-mono text-ink-3 shrink-0">
                  ({count} gian)
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {category && (
                  <span className="truncate text-2xs text-ink-3 max-w-[160px]" title={category}>
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
      width: 200,
      render: r => {
        const rep = monthlyReportByBrand.get(r.key);
        const acc = (accountsByKey.get(r.key) || []).join(', ');
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
            <div className="font-medium text-ink truncate max-w-[180px]">
              {planStrat || acc || 'Chưa gán'}
            </div>
            {(subInfo || kvSis) && (
              <div className="text-2xs text-ink-3 truncate max-w-[180px]">
                {subInfo || kvSis}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Sản phẩm & Tài liệu',
      width: 150,
      render: r => {
        if (isSyncing) return <Skeleton className="w-20" />;
        return (
          <div className="leading-tight">
            <div className="text-xs font-medium text-ink flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-ink-3/70" />
              <span>{r.profile.products.length} sản phẩm · {r.profile.documents.length} tệp</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'drilldown',
      header: 'Thao tác',
      width: 150,
      align: 'right',
      render: r => (
        <div className="inline-flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-2xs font-medium text-ink bg-surface hover:bg-sunken border border-line-strong transition-colors shadow-2xs"
            title={`Mở Sản phẩm & Góc nội dung của ${r.name}`}
            onClick={() => openBrand(r.key, 'PRODUCTS')}
          >
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>Sản phẩm</span>
          </button>
          {onDrilldownToPlan && (
            <button
              type="button"
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-2xs font-medium text-ink bg-surface hover:bg-sunken border border-line-strong transition-colors shadow-2xs"
              title={`Mở Kế hoạch tháng của ${r.name}`}
              onClick={() => onDrilldownToPlan({ brandName: r.name, month: selectedMonth })}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-accent" />
              <span>Kế hoạch</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Panel flush>
        <div className="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <FilterBar
              search={{ value: search, onChange: setSearch, placeholder: 'Tìm tên nhãn, mã brand, ngành hàng, Account/Booking PIC…' }}
              chips={<Chips items={chips} value={filter} onChange={setFilter} />}
              resultCount={search.trim() ? visible.length : undefined}
            />
          </div>
          {isSyncing && (
            <div className="flex items-center gap-2 text-xs text-ink-3 shrink-0 self-end sm:self-auto py-1">
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
    </div>
  );
}

