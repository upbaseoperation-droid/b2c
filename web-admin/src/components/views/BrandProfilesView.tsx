'use client';

/**
 * Hồ sơ thương hiệu: danh sách nhãn (từ Dữ liệu gốc) → hồ sơ từng nhãn.
 * Hồ sơ lưu trên máy chủ (/api/brands/profiles); quyền sửa theo từng mục do máy chủ kiểm tra.
 * Chọn một nhãn ở bộ chọn “Nhãn” trên thanh trên sẽ mở thẳng hồ sơ nhãn đó.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { BookingDealItem, BrandDetail, UserProfile } from '../../lib/types';
import type { BrandProfile, BrandSection } from '../../lib/brands/types';
import { brandKey } from '../../lib/brands/types';
import { UPBASE_BRANDS_MASTER } from '../../lib/importedMasterData';
import { formatDate } from '../../lib/format';
import { Button, Chips, DataTable, EmptyState, FilterBar, Pagination, Panel, Person, Status } from '../ui';
import type { Column } from '../ui';
import { BrandProfileDetail } from '../brands/BrandProfileDetail';
import { buildRows, permissionsOf, real, type BrandAccess, type BrandRow } from '../brands/brandUi';

type Filter = 'ALL' | 'MINE' | 'EMPTY' | 'NO_LEGAL';

class LoadError extends Error { constructor(message: string, public status: number) { super(message); } }

async function request<T>(body?: unknown): Promise<T> {
  const res = await fetch('/api/brands/profiles', {
    cache: 'no-store',
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
  deals = [],
  onNotify,
  onOpenBooking,
}: {
  currentUser?: UserProfile | null;
  selectedBrand?: string;
  brands?: BrandDetail[];
  deals?: BookingDealItem[];
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  onOpenBooking?: () => void;
}) {
  const [profiles, setProfiles] = useState<BrandProfile[] | null>(null);
  const [access, setAccess] = useState<BrandAccess>();
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [busy, setBusy] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(selectedBrand !== 'ALL' ? brandKey(selectedBrand) : null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(
    () => request<{ profiles: BrandProfile[]; access: BrandAccess }>().then(r => { setProfiles(r.profiles); setAccess(r.access); setLoadError(null); }),
    [],
  );
  // Tải lần đầu và mỗi khi đổi người dùng (đổi vai trò ở bản phát triển) để lấy lại quyền.
  useEffect(() => {
    request<{ profiles: BrandProfile[]; access: BrandAccess }>()
      .then(r => { setProfiles(r.profiles); setAccess(r.access); setLoadError(null); })
      .catch(e => setLoadError(e instanceof LoadError ? e : new LoadError((e as Error).message, 503)));
  }, [currentUser?.id]);

  // Bộ chọn Nhãn trên thanh trên quyết định nhãn đang mở.
  const [syncedBrand, setSyncedBrand] = useState(selectedBrand);
  if (selectedBrand !== syncedBrand) {
    setSyncedBrand(selectedBrand);
    setOpenKey(selectedBrand !== 'ALL' ? brandKey(selectedBrand) : null);
  }

  const rows = useMemo(() => buildRows(brands?.length ? brands : UPBASE_BRANDS_MASTER, profiles || []), [brands, profiles]);
  const me = access?.name.trim().toLowerCase();
  const matches: Record<Filter, (r: BrandRow) => boolean> = {
    ALL: () => true,
    MINE: r => !!me && real(r.master?.accountPic).toLowerCase() === me,
    EMPTY: r => !r.saved,
    NO_LEGAL: r => r.profile.legal.length === 0,
  };
  const searched = rows.filter(r => !search.trim() || `${r.name} ${real(r.master?.category)} ${real(r.master?.accountPic)}`.toLowerCase().includes(search.trim().toLowerCase()));
  const visible = searched.filter(matches[filter]);
  const [pagedKey, setPagedKey] = useState('');
  if (`${search}|${filter}` !== pagedKey) { setPagedKey(`${search}|${filter}`); setPage(1); }

  const save = async (row: BrandRow, section: BrandSection, data: unknown, summary?: string) => {
    setBusy(true);
    try {
      const r = await request<{ profile: BrandProfile }>({ brandName: row.name, revision: row.profile.revision, section, data, summary });
      setProfiles(prev => [...(prev || []).filter(p => p.key !== r.profile.key), r.profile]);
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
  if (!profiles) return <p className="text-[13px] text-ink-3 px-1">Đang tải hồ sơ thương hiệu…</p>;

  const open = openKey ? rows.find(r => r.key === openKey) : undefined;
  if (open) {
    const idx = visible.findIndex(r => r.key === open.key);
    return (
      <BrandProfileDetail
        key={open.key}
        row={open}
        can={permissionsOf(access, real(open.master?.accountPic))}
        deals={deals}
        busy={busy}
        onBack={() => setOpenKey(null)}
        nav={{
          onPrev: idx > 0 ? () => setOpenKey(visible[idx - 1].key) : undefined,
          onNext: idx >= 0 && idx < visible.length - 1 ? () => setOpenKey(visible[idx + 1].key) : undefined,
          position: idx >= 0 ? idx + 1 : undefined,
          total: visible.length,
        }}
        onSave={(section, data, summary) => save(open, section, data, summary)}
        onOpenBooking={onOpenBooking}
      />
    );
  }

  const chips = (['ALL', 'MINE', 'EMPTY', 'NO_LEGAL'] as Filter[]).map(key => ({
    key, label: { ALL: 'Tất cả', MINE: 'Tôi phụ trách', EMPTY: 'Chưa có hồ sơ', NO_LEGAL: 'Thiếu pháp lý' }[key], count: searched.filter(matches[key]).length,
  }));

  const columns: Column<BrandRow>[] = [
    {
      key: 'name', header: 'Nhãn hàng', width: 220,
      render: r => (
        <div className="min-w-0 max-w-[280px] leading-tight">
          <span className="block truncate font-medium text-ink">{r.name}</span>
          <span className="block truncate text-2xs text-ink-3">{real(r.master?.category) || '—'}</span>
        </div>
      ),
    },
    { key: 'pic', header: 'Account PIC', width: 160, render: r => (real(r.master?.accountPic) ? <Person name={real(r.master?.accountPic)} size={20} /> : <span className="text-ink-3">—</span>) },
    {
      key: 'status', header: 'Hồ sơ', width: 150,
      render: r => (
        <div className="grid gap-1 justify-items-start">
          {!r.saved ? <Status tone="neutral">Nháp</Status> : r.done === r.total ? <Status tone="positive">Hoàn tất</Status> : <Status tone="info">Đang chạy</Status>}
          <span className="text-2xs text-ink-3 tabular-nums">{r.done}/{r.total} mục</span>
        </div>
      ),
    },
    { key: 'products', header: 'Sản phẩm', width: 80, align: 'right', render: r => r.profile.products.length || <span className="text-ink-3">—</span> },
    { key: 'banned', header: 'Từ cấm', width: 80, align: 'right', render: r => r.profile.contentRules?.banned.length || <span className="text-ink-3">—</span> },
    { key: 'legal', header: 'Pháp lý', width: 80, align: 'right', render: r => r.profile.legal.length || <span className="text-ink-3">—</span> },
    {
      key: 'updated', header: 'Cập nhật', width: 140, align: 'right',
      render: r => (r.saved && r.profile.updatedAt ? (
        <div className="leading-tight"><span className="block tabular-nums text-ink-2">{formatDate(r.profile.updatedAt)}</span><span className="block text-2xs text-ink-3 truncate max-w-[160px] ml-auto">{r.profile.updatedBy}</span></div>
      ) : <span className="text-ink-3">—</span>),
    },
  ];

  return (
    <Panel flush>
      <div className="p-4 border-b border-line">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Tên nhãn, ngành hàng, Account PIC' }}
          chips={<Chips items={chips} value={filter} onChange={setFilter} />}
          resultCount={search.trim() ? visible.length : undefined}
        />
      </div>
      <DataTable
        columns={columns}
        rows={visible.slice((page - 1) * 20, page * 20)}
        rowKey={r => r.key}
        onRowClick={r => setOpenKey(r.key)}
        empty={<EmptyState title="Không có nhãn hàng khớp" description="Đổi bộ lọc hoặc tìm bằng tên khác." />}
      />
      <Pagination page={page} pageSize={20} total={visible.length} onPageChange={setPage} />
    </Panel>
  );
}
