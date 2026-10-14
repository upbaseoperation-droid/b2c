'use client';

/**
 * Hồ sơ thương hiệu: danh sách nhãn (từ Dữ liệu gốc) → hồ sơ từng nhãn.
 * Hồ sơ lưu trên máy chủ (/api/brands/profiles); kho tệp lưu trữ trên Cloudflare R2 (/api/brands/files).
 * Chọn một nhãn ở bộ chọn “Nhãn” trên thanh trên sẽ mở thẳng hồ sơ nhãn đó.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import type { BookingDealItem, BrandDetail, StorePortfolioItem, UserProfile } from '../../lib/types';
import type { BrandProfile, BrandSection } from '../../lib/brands/types';
import { brandKey } from '../../lib/brands/types';
import { UPBASE_BRANDS_MASTER, UPBASE_STORES_MASTER } from '../../lib/importedMasterData';
import { formatDate, formatVndShort } from '../../lib/format';
import { Avatar, Button, ChannelTag, Chips, DataTable, EmptyState, FilterBar, Pagination, Panel, Person, Stat, StatRow, Skeleton, Status, channelOf, closeShared, openShared, sharedFrom } from '../ui';
import type { Column } from '../ui';
import { BrandProfileDetail } from '../brands/BrandProfileDetail';
import { buildRows, isExpired, permissionsOf, real, type BrandAccess, type BrandRow } from '../brands/brandUi';
import { getSharedProfilesSnapshot, subscribeSharedProfiles, updateSharedProfilesCache } from '../../lib/brands/useBrandProfiles';

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
  onNotify,
  onOpenBooking,
  onNavigateToStoreProfile,
}: {
  currentUser?: UserProfile | null;
  selectedBrand?: string;
  brands?: BrandDetail[];
  stores?: StorePortfolioItem[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenBooking?: () => void;
  onNavigateToStoreProfile?: (storeName: string) => void;
}) {
  const [profiles, setProfiles] = useState<BrandProfile[] | null>(() => getSharedProfilesSnapshot()?.profiles || brandProfilesClientCache?.profiles || null);
  const [access, setAccess] = useState<BrandAccess | undefined>(() => getSharedProfilesSnapshot()?.access || brandProfilesClientCache?.access);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(selectedBrand !== 'ALL' ? brandKey(selectedBrand) : null);
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

  const allStores = stores?.length ? stores : UPBASE_STORES_MASTER;
  const rows = useMemo(() => buildRows(brands?.length ? brands : UPBASE_BRANDS_MASTER, profiles || []), [brands, profiles]);

  // Map gian hàng theo brandKey để tính toán số gian, hạn mức và thực chi
  const storeStatsByBrand = useMemo(() => {
    const map = new Map<string, { count: number; platforms: string[]; budgetNet: number; spentNet: number }>();
    for (const s of allStores) {
      const bName = s.brandName || s.storeName?.split('_')[0] || '';
      if (!bName) continue;
      const k = brandKey(bName);
      const cur = map.get(k) || { count: 0, platforms: [], budgetNet: 0, spentNet: 0 };
      cur.count += 1;
      if (s.platform && !cur.platforms.includes(s.platform)) cur.platforms.push(s.platform);
      cur.budgetNet += s.budgetNet ?? s.monthlyBudget ?? 0;
      cur.spentNet += s.actualSpentNet ?? 0;
      map.set(k, cur);
    }
    return map;
  }, [allStores]);

  const me = access?.name.trim().toLowerCase();
  const matches: Record<Filter, (r: BrandRow) => boolean> = useMemo(() => ({
    ALL: () => true,
    MINE: r => {
      if (!me) return false;
      return real(r.master?.accountPic).toLowerCase() === me || real(r.master?.brandPicName).toLowerCase() === me;
    },
    KEY_BUDGET: r => {
      const st = storeStatsByBrand.get(r.key);
      return (st?.budgetNet || r.master?.planBudget || r.master?.monthlyBudget || 0) >= 50_000_000;
    },
    COMPLETE: r => r.done === r.total,
    EXPIRED_LEGAL: r => r.profile.legal.length === 0 || r.profile.legal.some(l => Boolean(l.validUntil && isExpired(l.validUntil))),
  }), [me, storeStatsByBrand]);

  const searched = useMemo(() => rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${r.name} ${real(r.master?.code)} ${real(r.master?.category)} ${real(r.master?.accountPic)} ${real(r.master?.brandPicName)}`.toLowerCase().includes(q);
  }), [rows, search]);

  const visible = useMemo(() => searched.filter(matches[filter]), [searched, matches, filter]);
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

  // Chỉ số KPI tổng hợp toàn bộ thương hiệu B2C
  const kpiSummary = useMemo(() => {
    let totalStores = 0;
    let totalBudgetNet = 0;
    let totalSpentNet = 0;
    let completeCount = 0;
    let totalDocs = 0;
    let totalLegal = 0;
    let uploadedFiles = 0;

    for (const r of rows) {
      const st = storeStatsByBrand.get(r.key);
      totalStores += st?.count || r.master?.storeCount || 0;
      totalBudgetNet += st?.budgetNet || r.master?.planBudget || r.master?.monthlyBudget || 0;
      totalSpentNet += st?.spentNet || r.master?.spentBudget || 0;
      if (r.done === r.total) completeCount += 1;
      totalDocs += r.profile.documents.length;
      totalLegal += r.profile.legal.length;
      uploadedFiles += r.profile.documents.filter(d => d.storage === 'R2' || d.storage === 'LOCAL').length
        + r.profile.legal.filter(l => l.storage === 'R2' || l.storage === 'LOCAL').length;
    }

    return { totalStores, totalBudgetNet, totalSpentNet, completeCount, totalDocs, totalLegal, uploadedFiles };
  }, [rows, storeStatsByBrand]);

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
  const openBrand = (key: string) => openShared(key, () => setOpenKey(key));
  const closeBrand = (key: string) => closeShared(key, () => setOpenKey(null));

  const open = openKey ? rows.find(r => r.key === openKey) : undefined;
  if (open) {
    const idx = visible.findIndex(r => r.key === open.key);
    return (
      <BrandProfileDetail
        key={open.key}
        row={open}
        can={permissionsOf(access, real(open.master?.accountPic))}
        deals={deals}
        stores={allStores}
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
        onNotify={onNotify}
      />
    );
  }

  const isSyncing = !profiles;

  const chips = (['ALL', 'MINE', 'KEY_BUDGET', 'COMPLETE', 'EXPIRED_LEGAL'] as Filter[]).map(key => ({
    key,
    label: {
      ALL: 'Tất cả nhãn',
      MINE: 'Tôi phụ trách',
      KEY_BUDGET: 'Ngân sách ≥ 50tr',
      COMPLETE: 'Đủ 7/7 mục',
      EXPIRED_LEGAL: 'Cần rà soát pháp lý',
    }[key],
    count: searched.filter(matches[key]).length,
  }));

  const columns: Column<BrandRow>[] = [
    {
      key: 'name',
      header: 'Thương hiệu & Sàn',
      width: 250,
      render: r => {
        const st = storeStatsByBrand.get(r.key);
        const platforms = st?.platforms.length ? st.platforms : (r.master?.platforms || []);
        return (
          <div className="min-w-0 max-w-[270px] leading-tight flex items-start gap-2.5">
            <span {...sharedFrom('brand-avatar', r.key)} className="shrink-0 inline-flex"><Avatar name={r.name} size={28} /></span>
            <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span {...sharedFrom('brand-title', r.key)} className="truncate font-semibold text-ink">{r.name}</span>
              {real(r.master?.code) && (
                <span className="text-2xs font-mono text-ink-3 bg-surface-2 px-1 py-0.5 rounded border border-line shrink-0">
                  {real(r.master?.code)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="truncate text-2xs text-ink-3 max-w-[140px]">{real(r.master?.category) || '—'}</span>
              {platforms.map(p => <ChannelTag key={p} channel={channelOf(p)} />)}
            </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'stores',
      header: 'Gian hàng',
      width: 90,
      align: 'right',
      render: r => {
        const count = storeStatsByBrand.get(r.key)?.count || r.master?.storeCount || 0;
        return <span className="font-mono font-medium text-ink">{count} gian</span>;
      },
    },
    {
      key: 'pic',
      header: 'Account & Booking PIC',
      width: 190,
      render: r => {
        const acc = real(r.master?.accountPic);
        const book = real(r.master?.brandPicName);
        return (
          <div className="grid gap-0.5 leading-tight">
            {acc ? <Person name={acc} size={18} /> : <span className="text-ink-3 text-xs">—</span>}
            {book && book !== acc && (
              <span className="text-2xs text-ink-3 truncate">Booking: {book}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'budget',
      header: 'Hạn mức Order Net',
      width: 145,
      align: 'right',
      render: r => {
        const st = storeStatsByBrand.get(r.key);
        const budget = st?.budgetNet || r.master?.planBudget || r.master?.monthlyBudget || 0;
        const spent = st?.spentNet || r.master?.spentBudget || 0;
        return (
          <div className="leading-tight tabular-nums">
            <span className="block font-mono font-medium text-ink">{budget > 0 ? formatVndShort(budget) : '0 đ'}</span>
            {spent > 0 && (
              <span className={`block text-2xs font-mono ${budget > 0 && spent > budget ? 'text-danger font-medium' : 'text-ink-3'}`}>
                Chi: {formatVndShort(spent)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Độ đầy đủ hồ sơ',
      width: 145,
      render: r => (
        <div className="grid gap-1 justify-items-start">
          {isSyncing ? (
            <Skeleton className="w-20" />
          ) : r.done === r.total ? (
            <Status tone="positive">Đủ {r.done}/{r.total} mục</Status>
          ) : r.done >= 5 ? (
            <Status tone="info">{r.done}/{r.total} mục</Status>
          ) : (
            <Status tone="warning">{r.done}/{r.total} mục</Status>
          )}
        </div>
      ),
    },
    {
      key: 'assets',
      header: 'SKU · Từ cấm',
      width: 115,
      align: 'right',
      render: r => isSyncing ? <Skeleton className="w-16 ml-auto" /> : (
        <div className="leading-tight tabular-nums text-xs">
          <span className="text-ink font-medium">{r.profile.products.length}</span>
          <span className="text-ink-3"> SKU · </span>
          <span className="text-danger font-medium">{r.profile.contentRules?.banned.length || 0}</span>
          <span className="text-ink-3"> cấm</span>
        </div>
      ),
    },
    {
      key: 'files',
      header: 'Kho tệp & Pháp lý',
      width: 135,
      align: 'right',
      render: r => {
        if (isSyncing) return <span className="text-ink-3">—</span>;
        const r2Count = r.profile.documents.filter(d => d.storage === 'R2' || d.storage === 'LOCAL').length
          + r.profile.legal.filter(l => l.storage === 'R2' || l.storage === 'LOCAL').length;
        return (
          <div className="leading-tight tabular-nums text-xs">
            <span className="inline-flex items-center gap-1 text-ink font-medium">
              <HardDrive className="w-3 h-3 text-accent" />
              {r.profile.documents.length} tệp · {r.profile.legal.length} giấy
            </span>
            {r2Count > 0 && (
              <span className="block text-2xs text-accent font-medium">{r2Count} tệp đã tải lên</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'updated',
      header: 'Cập nhật',
      width: 130,
      align: 'right',
      render: r => (r.saved && r.profile.updatedAt ? (
        <div className="leading-tight">
          <span className="block tabular-nums text-ink-2 text-xs">{formatDate(r.profile.updatedAt)}</span>
          <span className="block text-2xs text-ink-3 truncate max-w-[130px] ml-auto">{r.profile.updatedBy}</span>
        </div>
      ) : <span className="text-ink-3">—</span>),
    },
  ];

  return (
    <div className="space-y-4">
      <StatRow>
        <Stat
          label="Thương hiệu & Gian hàng B2C"
          value={`${rows.length} nhãn · ${kpiSummary.totalStores} gian`}
          note="Phạm vi B2C phụ trách = 1 (TikTok, Shopee, Lazada)"
        />
        <Stat
          label="Tổng hạn mức Order Net tháng"
          value={formatVndShort(kpiSummary.totalBudgetNet)}
          note={`Thực tế đã duyệt chi: ${formatVndShort(kpiSummary.totalSpentNet)}`}
          tone={kpiSummary.totalSpentNet > kpiSummary.totalBudgetNet ? 'critical' : 'positive'}
        />
        <Stat
          label="Độ phủ hồ sơ thương hiệu"
          value={`${kpiSummary.completeCount}/${rows.length} nhãn`}
          note="Đủ 7/7 hạng mục (USP, SKU, Từ cấm, Ratecard, Pháp lý, FAQ)"
          tone="positive"
        />
        <Stat
          label="Tài liệu & Giấy tờ pháp lý"
          value={`${kpiSummary.totalDocs} tài liệu · ${kpiSummary.totalLegal} giấy phép`}
          note={kpiSummary.uploadedFiles > 0 ? `${kpiSummary.uploadedFiles} tệp đính kèm trực tiếp` : 'Hỗ trợ tải tệp PDF, PPTX, Ảnh, DOCX, XLSX'}
        />
      </StatRow>

      <Panel flush>
        <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          empty={<EmptyState title="Không có nhãn hàng khớp" description="Đổi bộ lọc hoặc tìm bằng tên khác." />}
        />
        <Pagination page={page} pageSize={20} total={visible.length} onPageChange={setPage} />
      </Panel>
    </div>
  );
}
