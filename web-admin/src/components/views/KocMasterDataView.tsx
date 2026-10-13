'use client';

/**
 * Danh bạ KOC: danh sách + hồ sơ chi tiết của từng KOC.
 * Bấm một hàng để mở hồ sơ; hồ sơ thay chỗ danh sách, nút “Danh bạ KOC” quay lại và giữ nguyên bộ lọc.
 */

import React, { useMemo, useRef, useState } from 'react';
import { FileScan, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrLegalExtractionResult, UserProfile } from '../../lib/types';
import { INITIAL_KOCS } from '../../lib/mockData';
import { formatVndShort } from '../../lib/format';
import { LegalOcrModal } from '../LegalOcrModal';
import { CreateKocModal } from '../CreateKocModal';
import { KalodataSyncModal } from '../kalodata/KalodataSyncModal';
import { KocProfile } from '../koc/KocProfile';
import {
  LEGAL_TYPE_LABEL,
  findDuplicates,
  formatFollowers,
  hasLegalId,
  legalTypeOf,
  type LegalType,
} from '../koc/kocUtils';
import { ActionMenu, Avatar, Button, Chips, DataTable, EmptyState, FilterBar, PageActions, Pagination, Panel, Person, Select, Status, closeShared, openShared, sharedFrom } from '../ui';
import type { Column } from '../ui';

interface KocMasterDataViewProps {
  kocs?: KocItem[];
  allDeals?: BookingDealItem[];
  currentUser?: UserProfile;
  /** Nhãn hàng đang chọn ở thanh trên (‘ALL’ = tất cả). Danh bạ lọc theo nhãn này, không có bộ lọc nhãn riêng. */
  selectedBrand?: string;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onKocUpdated?: (updatedKoc: KocItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type LegalFilter = 'ALL' | LegalType;
type IssueFilter = '' | 'MISSING' | 'DUPLICATE';

const ALL = 'ALL';
/** Loại hồ sơ chỉ xác định khi đã có giấy tờ. */
const typeOf = (k: KocItem): LegalType | null => (hasLegalId(k) ? legalTypeOf(k) : null);
const uniqSorted = (values: Array<string | undefined>) =>
  [...new Set(values.filter((v): v is string => !!v && !!v.trim()).map((v) => v.trim()))].sort((a, b) =>
    a.localeCompare(b, 'vi', { numeric: true }),
  );

export const KocMasterDataView: React.FC<KocMasterDataViewProps> = ({
  kocs = INITIAL_KOCS,
  allDeals,
  currentUser,
  selectedBrand = ALL,
  onOpenQuickBookWithKoc,
  onKocUpdated,
  onKocCreated,
  onNotify,
}) => {
  const [localKocs, setLocalKocs] = useState<KocItem[]>(kocs);
  // Đồng bộ khi danh sách từ ngoài đổi (điều chỉnh state ngay khi render, không dùng effect)
  const [syncedKocs, setSyncedKocs] = useState(kocs);
  if (kocs !== syncedKocs) {
    setSyncedKocs(kocs);
    setLocalKocs(kocs);
  }

  // Hồ sơ đang mở (null = đang ở danh sách)
  const [openKocId, setOpenKocId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Modal
  const [ocrTarget, setOcrTarget] = useState<KocItem | null>(null);
  const [metricsTarget, setMetricsTarget] = useState<KocItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [legal, setLegal] = useState<LegalFilter>(ALL);
  const [issue, setIssue] = useState<IssueFilter>('');
  const [salaryGrade, setSalaryGrade] = useState(ALL);
  const [tepKenh, setTepKenh] = useState(ALL);
  const [pic, setPic] = useState(ALL);
  const [segment, setSegment] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const duplicates = useMemo(() => findDuplicates(localKocs), [localKocs]);

  // Phạm vi theo nhãn hàng ở thanh trên
  const scoped = useMemo(
    () => (selectedBrand && selectedBrand !== ALL ? localKocs.filter((k) => k.brandName === selectedBrand) : localKocs),
    [localKocs, selectedBrand],
  );

  const options = useMemo(
    () => ({
      salaryGrade: uniqSorted(scoped.map((k) => k.salaryGrade)),
      tepKenh: uniqSorted(scoped.map((k) => k.tepKenh || k.creatorCategory)),
      pic: uniqSorted(scoped.map((k) => k.bookingPic)),
      segment: uniqSorted(scoped.map((k) => k.segment)),
      category: uniqSorted(scoped.map((k) => k.kocCategory)),
    }),
    [scoped],
  );

  // Lọc theo mọi thứ trừ chip, để số đếm trên chip đúng với bộ lọc đang chọn
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return scoped.filter((k) => {
      if (q) {
        const hit =
          k.stageName.toLowerCase().includes(q) ||
          (k.realName || '').toLowerCase().includes(q) ||
          k.channelId.toLowerCase().includes(q) ||
          (qDigits.length >= 4 && [k.phone, k.cccd, k.taxCode].some((v) => (v || '').replace(/\D/g, '').includes(qDigits)));
        if (!hit) return false;
      }
      if (salaryGrade !== ALL && k.salaryGrade !== salaryGrade) return false;
      if (tepKenh !== ALL && (k.tepKenh || k.creatorCategory) !== tepKenh) return false;
      if (pic !== ALL && k.bookingPic !== pic) return false;
      if (segment !== ALL && k.segment !== segment) return false;
      if (category !== ALL && k.kocCategory !== category) return false;
      return true;
    });
  }, [scoped, search, salaryGrade, tepKenh, pic, segment, category]);

  const matchesIssue = (k: KocItem, f: IssueFilter) =>
    f === '' || (f === 'MISSING' ? !hasLegalId(k) : duplicates.has(k.id));

  const filtered = useMemo(
    () => baseFiltered.filter((k) => (legal === ALL || typeOf(k) === legal) && matchesIssue(k, issue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFiltered, legal, issue, duplicates],
  );

  const legalChips = (['ALL', 'INDIVIDUAL', 'HOUSEHOLD', 'COMPANY'] as const).map((key) => ({
    key,
    label: key === ALL ? 'Tất cả' : LEGAL_TYPE_LABEL[key],
    count: baseFiltered.filter((k) => matchesIssue(k, issue) && (key === ALL || typeOf(k) === key)).length,
  }));
  const issueBase = baseFiltered.filter((k) => legal === ALL || typeOf(k) === legal);
  const issueChips = [
    { key: 'MISSING' as const, label: 'Thiếu giấy tờ', count: issueBase.filter((k) => !hasLegalId(k)).length },
    { key: 'DUPLICATE' as const, label: 'Nghi trùng', count: issueBase.filter((k) => duplicates.has(k.id)).length },
  ];

  const moreFilterCount = Number(segment !== ALL) + Number(category !== ALL);
  const isFiltered = !!search.trim() || legal !== ALL || issue !== '' || salaryGrade !== ALL || tepKenh !== ALL || pic !== ALL || moreFilterCount > 0;

  const resetFilters = () => {
    setSearch('');
    setLegal(ALL);
    setIssue('');
    setSalaryGrade(ALL);
    setTepKenh(ALL);
    setPic(ALL);
    setSegment(ALL);
    setCategory(ALL);
  };

  // Đổi bộ lọc thì về trang 1
  const filterKey = [search, legal, issue, salaryGrade, tepKenh, pic, segment, category, pageSize, selectedBrand].join('|');
  const [pagedKey, setPagedKey] = useState(filterKey);
  if (filterKey !== pagedKey) {
    setPagedKey(filterKey);
    setPage(1);
  }
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ------------------------------------------------------- Cập nhật hồ sơ */

  const applyUpdate = (updated: KocItem, message: string) => {
    setLocalKocs((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    onKocUpdated?.(updated);
    onNotify?.(message, 'success');
  };

  const handleApplyOcr = (r: OcrLegalExtractionResult) => {
    if (!ocrTarget) return;
    const f = r.fields;
    applyUpdate(
      {
        ...ocrTarget,
        realName: f.fullName || ocrTarget.realName,
        cccd: f.idNumber || ocrTarget.cccd,
        taxCode: f.taxCode || ocrTarget.taxCode,
        companyName: f.companyName || ocrTarget.companyName,
        permanentAddress: f.permanentAddress || f.headquartersAddress || ocrTarget.permanentAddress,
        dob: f.dob || ocrTarget.dob,
        issueDate: f.issueDate || ocrTarget.issueDate,
        issuePlace: f.issuePlace || ocrTarget.issuePlace,
        legalRepresentative: f.legalRepresentative || ocrTarget.legalRepresentative,
        isOcrVerified: true,
        ocrDocumentType: r.documentType,
        ocrVerifiedAt: new Date().toISOString(),
      },
      `Đã cập nhật giấy tờ cho ${ocrTarget.stageName}`,
    );
    setOcrTarget(null);
  };

  const handleApplyMetrics = (kocId: string, updates: Partial<KocItem>) => {
    const target = localKocs.find((k) => k.id === kocId);
    if (!target) return;
    applyUpdate({ ...target, ...updates, metricsUpdatedAt: new Date().toISOString() }, `Đã cập nhật chỉ số của ${target.stageName}`);
  };

  /* ---------------------------------------------------------- Điều hướng */

  const openProfile = (id: string) => {
    setOpenKocId(id);
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  // Danh sách ↔ hồ sơ: ảnh và tên KOC bay giữa hàng bảng và đầu hồ sơ (DESIGN_SYSTEM.md §9).
  const openFromList = (id: string) => openShared(id, () => openProfile(id));
  const backToList = (id: string) => closeShared(id, () => setOpenKocId(null));

  const rowActions = (k: KocItem) => [
    { label: 'Tạo booking', icon: Plus, onSelect: () => onOpenQuickBookWithKoc(k) },
    { label: 'Cập nhật chỉ số', icon: RefreshCw, onSelect: () => setMetricsTarget(k) },
    { label: hasLegalId(k) ? 'Đọc lại giấy tờ' : 'Đọc ảnh giấy tờ', icon: FileScan, onSelect: () => setOcrTarget(k) },
  ];

  /* --------------------------------------------------------------- Bảng */

  const columns: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'KOC',
      width: 210,
      render: (k) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[280px]">
          <span {...sharedFrom('koc-avatar', k.id)} className="shrink-0 inline-flex"><Avatar name={k.stageName} src={k.avatarUrl} size={32} /></span>
          <div className="min-w-0 leading-tight">
            <span {...sharedFrom('koc-title', k.id)} className="block truncate font-medium text-ink">{k.stageName}</span>
            <span className="block truncate text-2xs text-ink-3">
              @{k.channelId.replace(/^@/, '')}
              {k.realName && k.realName !== k.stageName ? ` · ${k.realName}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Phân loại',
      width: 125,
      render: (k) => (
        <div className="leading-tight">
          <span className="block text-ink">{k.salaryGrade}</span>
          <span className="block text-2xs text-ink-3 whitespace-nowrap">{k.segment}</span>
        </div>
      ),
    },
    {
      key: 'tep',
      header: 'Tệp kênh',
      width: 130,
      render: (k) => (
        <div className="leading-tight min-w-0">
          <span className="block truncate text-ink">{k.tepKenh || k.creatorCategory || '—'}</span>
          <span className="block truncate text-2xs text-ink-3">{k.kocCategory}</span>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Nhãn hàng · PIC',
      width: 150,
      render: (k) => (
        <div className="grid gap-1 min-w-0">
          <span className="truncate text-ink">{k.brandName || <span className="text-ink-3">Chưa gán</span>}</span>
          {k.bookingPic ? <Person name={k.bookingPic} size={18} /> : <span className="text-2xs text-ink-3">Chưa có PIC</span>}
        </div>
      ),
    },
    {
      key: 'docs',
      header: 'Hồ sơ',
      width: 120,
      render: (k) => {
        const dup = duplicates.get(k.id);
        return (
          <div className="grid gap-1 justify-items-start">
            {!hasLegalId(k) ? (
              <Status tone="warning">Thiếu giấy tờ</Status>
            ) : dup ? (
              <span title={`Trùng ${dup.map((d) => `${d.stageName} (${d.fields.join(', ')})`).join('; ')}`}>
                <Status tone="warning">Nghi trùng</Status>
              </span>
            ) : (
              <Status tone="positive">Đủ giấy tờ</Status>
            )}
            {typeOf(k) && <span className="text-2xs text-ink-3">{LEGAL_TYPE_LABEL[typeOf(k)!]}</span>}
          </div>
        );
      },
    },
    { key: 'followers', header: 'Followers', align: 'right', width: 80, render: (k) => formatFollowers(k.followers) },
    { key: 'rate', header: 'Giá/video', align: 'right', width: 80, render: (k) => (k.rateCardVideo ? formatVndShort(k.rateCardVideo) : '—') },
    { key: 'actions', header: '', align: 'right', width: 48, render: (k) => <ActionMenu items={rowActions(k)} /> },
  ];

  /* ------------------------------------------------------------- Render */

  const openKoc = openKocId ? localKocs.find((k) => k.id === openKocId) : undefined;
  const navList = openKoc && filtered.some((k) => k.id === openKoc.id) ? filtered : localKocs;
  const navIndex = openKoc ? navList.findIndex((k) => k.id === openKoc.id) : -1;

  return (
    <div ref={rootRef} className="space-y-6 scroll-mt-4">
      {openKoc ? (
        <KocProfile
          key={openKoc.id}
          koc={openKoc}
          deals={allDeals}
          currentUser={currentUser}
          duplicates={duplicates.get(openKoc.id)}
          nav={{
            onBack: () => backToList(openKoc.id),
            onPrev: navIndex > 0 ? () => openProfile(navList[navIndex - 1].id) : undefined,
            onNext: navIndex >= 0 && navIndex < navList.length - 1 ? () => openProfile(navList[navIndex + 1].id) : undefined,
            position: navIndex + 1,
            total: navList.length,
          }}
          onOpenKoc={openProfile}
          onCreateBooking={onOpenQuickBookWithKoc}
          onUpdateMetrics={setMetricsTarget}
          onScanDocs={setOcrTarget}
        />
      ) : (
        <>
          <PageActions>
            <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Thêm KOC
            </Button>
          </PageActions>

          <Panel flush>
            <div className="p-4 border-b border-line grid gap-2.5">
              <FilterBar
                search={{ value: search, onChange: setSearch, placeholder: 'Tên kênh, tên thật, SĐT, CCCD' }}
                filters={
                  <>
                    <Select value={salaryGrade} onChange={(e) => setSalaryGrade(e.target.value)} aria-label="Khung lương" className="w-auto">
                      <option value={ALL}>Khung lương</option>
                      {options.salaryGrade.map((v) => <option key={v} value={v}>{v}</option>)}
                    </Select>
                    <Select value={tepKenh} onChange={(e) => setTepKenh(e.target.value)} aria-label="Tệp kênh" className="w-auto">
                      <option value={ALL}>Tệp kênh</option>
                      {options.tepKenh.map((v) => <option key={v} value={v}>{v}</option>)}
                    </Select>
                    <Select value={pic} onChange={(e) => setPic(e.target.value)} aria-label="PIC" className="w-auto">
                      <option value={ALL}>PIC</option>
                      {options.pic.map((v) => <option key={v} value={v}>{v}</option>)}
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
                      <Button variant="ghost" onClick={resetFilters}>
                        Xóa bộ lọc
                      </Button>
                    )}
                  </>
                }
                resultCount={isFiltered ? filtered.length : undefined}
              />
              {showMoreFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={segment} onChange={(e) => setSegment(e.target.value)} aria-label="Segment" className="w-auto">
                    <option value={ALL}>Segment</option>
                    {options.segment.map((v) => <option key={v} value={v}>{v}</option>)}
                  </Select>
                  <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Ngành hàng" className="w-auto">
                    <option value={ALL}>Ngành hàng</option>
                    {options.category.map((v) => <option key={v} value={v}>{v}</option>)}
                  </Select>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <Chips label="Loại hồ sơ" items={legalChips} value={legal} onChange={setLegal} />
                <Chips<IssueFilter>
                  label="Cần xử lý"
                  items={issueChips}
                  value={issue}
                  onChange={(k) => setIssue((cur) => (cur === k ? '' : k))}
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(k) => k.id}
              onRowClick={(k) => openFromList(k.id)}
              stickyLast
              empty={
                <EmptyState
                  title={scoped.length === 0 ? 'Chưa có KOC nào' : 'Không có KOC khớp bộ lọc'}
                  description={scoped.length === 0 ? 'Thêm KOC đầu tiên để bắt đầu lập booking.' : 'Bỏ bớt điều kiện lọc hoặc tìm bằng tên khác.'}
                  action={
                    scoped.length === 0 ? (
                      <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>Thêm KOC</Button>
                    ) : (
                      <Button onClick={resetFilters}>Xóa bộ lọc</Button>
                    )
                  }
                />
              }
            />
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </Panel>
        </>
      )}

      <LegalOcrModal
        isOpen={!!ocrTarget}
        onClose={() => setOcrTarget(null)}
        onApplyToContract={handleApplyOcr}
        initialPreset="CCCD_INDIVIDUAL"
      />

      <KalodataSyncModal
        isOpen={!!metricsTarget}
        onClose={() => setMetricsTarget(null)}
        targetKoc={metricsTarget}
        onApplyUpdates={handleApplyMetrics}
        onNotify={onNotify}
      />

      <CreateKocModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        existingKocs={localKocs}
        onKocCreated={(k) => {
          setLocalKocs((prev) => [k, ...prev]);
          onKocCreated?.(k);
          onNotify?.(`Đã thêm ${k.stageName} vào danh bạ`, 'success');
          setIsCreateOpen(false);
        }}
      />
    </div>
  );
};
