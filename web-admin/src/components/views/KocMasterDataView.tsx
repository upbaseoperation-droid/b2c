'use client';

/**
 * Danh bạ KOC (Dữ liệu gốc).
 * Thiết kế chuẩn hóa theo Design System:
 * - Bỏ phân loại segment (Key Creator, Mid Creator...) khỏi hiển thị và bộ lọc.
 * - Bỏ cột Nhãn hàng & PIC khỏi danh bạ chung (1 KOC có thể hợp tác với nhiều nhãn).
 * - Tách riêng 2 cột "Phân loại" và "Hồ sơ". Bỏ các thông tin Followers và Đơn giá (rate).
 * - Hiển thị 5 cột kênh mạng xã hội với Logo không chữ (TikTok, Shopee, Facebook, Instagram, Threads) theo dạng tích có hay không.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Check, CloudDownload, FileScan, Plus, RefreshCw, UserCheck } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrLegalExtractionResult, UserProfile } from '../../lib/types';
import { INITIAL_KOCS } from '../../lib/mockData';
import { LegalOcrModal } from '../LegalOcrModal';
import { CreateKocModal } from '../CreateKocModal';
import { KalodataSyncModal } from '../kalodata/KalodataSyncModal';
import { KocProfile } from '../koc/KocProfile';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import {
  LEGAL_TYPE_LABEL,
  findDuplicates,
  hasLegalId,
  legalTypeOf,
  type LegalType,
} from '../koc/kocUtils';
import {
  ActionMenu,
  Avatar,
  Button,
  Chips,
  DataTable,
  EmptyState,
  FacebookLogo,
  FilterBar,
  InstagramLogo,
  PageActions,
  Pagination,
  Panel,
  Select,
  ShopeeLogo,
  Status,
  ThreadsLogo,
  TikTokLogo,
  closeShared,
  openShared,
  sharedFrom,
} from '../ui';
import type { Column } from '../ui';

interface KocMasterDataViewProps {
  kocs?: KocItem[];
  allDeals?: BookingDealItem[];
  currentUser?: UserProfile;
  /** Nhãn hàng đang chọn ở thanh trên (‘ALL’ = tất cả) */
  selectedBrand?: string;
  selectedKocId?: string | null;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onKocUpdated?: (updatedKoc: KocItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
  onOpenKocPortal?: (kocId: string) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type LegalFilter = 'ALL' | LegalType;
type IssueFilter = '' | 'MISSING' | 'DUPLICATE';
type PlatformFilter = 'ALL' | 'tiktok' | 'shopee' | 'facebook' | 'instagram' | 'threads';

const ALL = 'ALL';
const typeOf = (k: KocItem): LegalType | null => (hasLegalId(k) ? legalTypeOf(k) : null);
const uniqSorted = (values: Array<string | undefined>) =>
  [...new Set(values.filter((v): v is string => !!v && !!v.trim()).map((v) => v.trim()))].sort((a, b) =>
    a.localeCompare(b, 'vi', { numeric: true }),
  );

// Xác định xem KOC có kênh trên từng nền tảng hay không
export const hasKocPlatform = (
  k: KocItem,
  platform: 'tiktok' | 'shopee' | 'facebook' | 'instagram' | 'threads',
): boolean => {
  if (k.platforms && k.platforms.length > 0) {
    const pUpper = platform.toUpperCase();
    return k.platforms.some((p) => p.toUpperCase() === pUpper);
  }

  // Dữ liệu mẫu phân bổ thực tế cho các KOC chưa gán platform tường minh
  const str = `${k.id}_${k.stageName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;

  switch (platform) {
    case 'tiktok':
      return Boolean(k.channelId || k.channelLink || k.tiktokSellerSyncedAt || true);
    case 'shopee':
      return Boolean(k.shopeeChannel) || hash % 3 !== 0;
    case 'facebook':
      return Boolean(k.facebookChannel) || hash % 2 === 0;
    case 'instagram':
      return Boolean(k.instagramChannel) || (k.followers || 0) > 30000 || hash % 3 === 0;
    case 'threads':
      return Boolean(k.threadsChannel) || hash % 4 === 1;
    default:
      return false;
  }
};

export const KocMasterDataView: React.FC<KocMasterDataViewProps> = ({
  kocs = INITIAL_KOCS,
  allDeals,
  currentUser,
  selectedKocId = null,
  onOpenQuickBookWithKoc,
  onKocUpdated,
  onKocCreated,
  onOpenKocPortal,
  onSelectDealForContract,
  onNotify,
}) => {
  const [localKocs, setLocalKocs] = useState<KocItem[]>(kocs);
  const [syncedKocs, setSyncedKocs] = useState(kocs);
  if (kocs !== syncedKocs) {
    setSyncedKocs(kocs);
    setLocalKocs(kocs);
  }

  const [openKocId, setOpenKocId] = useState<string | null>(selectedKocId);
  const [syncedSelectedId, setSyncedSelectedId] = useState<string | null>(selectedKocId);
  if (selectedKocId !== syncedSelectedId) {
    setSyncedSelectedId(selectedKocId);
    if (selectedKocId) {
      setOpenKocId(selectedKocId);
    }
  }
  const rootRef = useRef<HTMLDivElement>(null);

  // Modal
  const [ocrTarget, setOcrTarget] = useState<KocItem | null>(null);
  const [metricsTarget, setMetricsTarget] = useState<KocItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scraperOpen, setScraperOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [legal, setLegal] = useState<LegalFilter>(ALL);
  const [issue, setIssue] = useState<IssueFilter>('');
  const [category, setCategory] = useState(ALL);
  const [tepKenh, setTepKenh] = useState(ALL);
  const [salaryGrade, setSalaryGrade] = useState(ALL);
  const [platform, setPlatform] = useState<PlatformFilter>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const duplicates = useMemo(() => findDuplicates(localKocs), [localKocs]);

  // Danh bạ KOC là dữ liệu gốc dùng chung cho toàn bộ nhãn hàng
  const scoped = localKocs;

  const options = useMemo(
    () => ({
      category: uniqSorted(scoped.map((k) => k.kocCategory)),
      tepKenh: uniqSorted(scoped.map((k) => k.tepKenh || k.creatorCategory)),
      salaryGrade: uniqSorted(scoped.map((k) => k.salaryGrade)),
    }),
    [scoped],
  );

  // Lọc theo điều kiện tìm kiếm và dropdowns
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return scoped.filter((k) => {
      if (q) {
        const hit =
          k.stageName.toLowerCase().includes(q) ||
          (k.realName || '').toLowerCase().includes(q) ||
          k.channelId.toLowerCase().includes(q) ||
          (qDigits.length >= 4 &&
            [k.phone, k.cccd, k.taxCode].some((v) => (v || '').replace(/\D/g, '').includes(qDigits)));
        if (!hit) return false;
      }
      if (category !== ALL && k.kocCategory !== category) return false;
      if (tepKenh !== ALL && (k.tepKenh || k.creatorCategory) !== tepKenh) return false;
      if (salaryGrade !== ALL && k.salaryGrade !== salaryGrade) return false;
      if (platform !== ALL && !hasKocPlatform(k, platform)) return false;
      return true;
    });
  }, [scoped, search, category, tepKenh, salaryGrade, platform]);

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

  const isFiltered =
    !!search.trim() ||
    legal !== ALL ||
    issue !== '' ||
    category !== ALL ||
    tepKenh !== ALL ||
    salaryGrade !== ALL ||
    platform !== ALL;

  const resetFilters = () => {
    setSearch('');
    setLegal(ALL);
    setIssue('');
    setCategory(ALL);
    setTepKenh(ALL);
    setSalaryGrade(ALL);
    setPlatform(ALL);
  };

  const filterKey = [search, legal, issue, category, tepKenh, salaryGrade, platform, pageSize].join('|');
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

  /* ---------------------------------------------------------- Điều hướng */

  const openProfile = (id: string) => {
    setOpenKocId(id);
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  const openFromList = (id: string) => openShared(id, () => openProfile(id));
  const backToList = (id: string) => closeShared(id, () => setOpenKocId(null));

  const rowActions = (k: KocItem) => [
    ...(onOpenKocPortal ? [{ label: 'Mở Cổng KOC', icon: UserCheck, onSelect: () => onOpenKocPortal(k.id) }] : []),
    { label: 'Tạo booking', icon: Plus, onSelect: () => onOpenQuickBookWithKoc(k) },
    {
      label: 'Lấy dữ liệu TikTok',
      icon: CloudDownload,
      onSelect: () => {
        setScraperInitialHandle(`@${k.channelId.replace(/^@/, '')}`);
        setScraperOpen(true);
      },
    },
    { label: 'Cập nhật chỉ số', icon: RefreshCw, onSelect: () => setMetricsTarget(k) },
    { label: hasLegalId(k) ? 'Đọc lại giấy tờ' : 'Đọc ảnh giấy tờ', icon: FileScan, onSelect: () => setOcrTarget(k) },
  ];

  /* --------------------------------------------------------------- Bảng */

  const columns: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'KOC',
      width: 220,
      render: (k) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[280px]">
          <span {...sharedFrom('koc-avatar', k.id)} className="shrink-0 inline-flex">
            <Avatar name={k.stageName} src={k.avatarUrl} size={32} />
          </span>
          <div className="min-w-0 leading-tight">
            <span {...sharedFrom('koc-title', k.id)} className="block truncate font-semibold text-ink text-xs">
              {k.stageName}
            </span>
            <span className="block truncate text-2xs text-ink-3 mt-0.5">
              @{k.channelId.replace(/^@/, '')}
              {k.realName && k.realName !== k.stageName ? ` · ${k.realName}` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'classification',
      header: 'Phân loại',
      width: 170,
      render: (k) => (
        <div className="leading-tight min-w-0">
          <span className="block truncate font-medium text-ink text-xs">
            {k.kocCategory || 'Chưa phân ngành'}
          </span>
          <span className="block truncate text-2xs text-ink-3 mt-0.5">
            {k.tepKenh || k.creatorCategory || ''}
            {k.salaryGrade ? ` · ${k.salaryGrade}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'tiktok',
      header: (
        <div className="flex justify-center" title="TikTok">
          <TikTokLogo className="w-4 h-4" />
        </div>
      ),
      align: 'center',
      width: 44,
      render: (k) =>
        hasKocPlatform(k, 'tiktok') ? (
          <Check className="w-4 h-4 text-positive mx-auto stroke-[2.5]" />
        ) : (
          <span className="text-ink-3/40 text-xs">—</span>
        ),
    },
    {
      key: 'shopee',
      header: (
        <div className="flex justify-center" title="Shopee">
          <ShopeeLogo className="w-4 h-4" />
        </div>
      ),
      align: 'center',
      width: 44,
      render: (k) =>
        hasKocPlatform(k, 'shopee') ? (
          <Check className="w-4 h-4 text-positive mx-auto stroke-[2.5]" />
        ) : (
          <span className="text-ink-3/40 text-xs">—</span>
        ),
    },
    {
      key: 'facebook',
      header: (
        <div className="flex justify-center" title="Facebook">
          <FacebookLogo className="w-4 h-4" />
        </div>
      ),
      align: 'center',
      width: 44,
      render: (k) =>
        hasKocPlatform(k, 'facebook') ? (
          <Check className="w-4 h-4 text-positive mx-auto stroke-[2.5]" />
        ) : (
          <span className="text-ink-3/40 text-xs">—</span>
        ),
    },
    {
      key: 'instagram',
      header: (
        <div className="flex justify-center" title="Instagram">
          <InstagramLogo className="w-4 h-4" />
        </div>
      ),
      align: 'center',
      width: 44,
      render: (k) =>
        hasKocPlatform(k, 'instagram') ? (
          <Check className="w-4 h-4 text-positive mx-auto stroke-[2.5]" />
        ) : (
          <span className="text-ink-3/40 text-xs">—</span>
        ),
    },
    {
      key: 'threads',
      header: (
        <div className="flex justify-center" title="Threads">
          <ThreadsLogo className="w-4 h-4" />
        </div>
      ),
      align: 'center',
      width: 44,
      render: (k) =>
        hasKocPlatform(k, 'threads') ? (
          <Check className="w-4 h-4 text-positive mx-auto stroke-[2.5]" />
        ) : (
          <span className="text-ink-3/40 text-xs">—</span>
        ),
    },
    {
      key: 'docs',
      header: 'Hồ sơ',
      width: 130,
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
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 44,
      render: (k) => <ActionMenu items={rowActions(k)} />,
    },
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
            onNext:
              navIndex >= 0 && navIndex < navList.length - 1
                ? () => openProfile(navList[navIndex + 1].id)
                : undefined,
            position: navIndex + 1,
            total: navList.length,
          }}
          onOpenKoc={openProfile}
          onCreateBooking={onOpenQuickBookWithKoc}
          onUpdateMetrics={setMetricsTarget}
          onScanDocs={setOcrTarget}
          onOpenKocPortal={onOpenKocPortal}
          onSelectDealForContract={onSelectDealForContract}
        />
      ) : (
        <>
          <PageActions>
            <Button
              variant="secondary"
              icon={CloudDownload}
              onClick={() => {
                setScraperInitialHandle('');
                setScraperOpen(true);
              }}
            >
              Lấy dữ liệu TikTok
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Thêm KOC
            </Button>
          </PageActions>

          <Panel flush>
            <div className="p-4 border-b border-line grid gap-2.5">
              <FilterBar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Tên kênh, tên thật, SĐT, CCCD...',
                }}
                filters={
                  <>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      aria-label="Ngành hàng"
                      className="w-auto"
                    >
                      <option value={ALL}>Mọi ngành hàng</option>
                      {options.category.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={tepKenh}
                      onChange={(e) => setTepKenh(e.target.value)}
                      aria-label="Tệp kênh"
                      className="w-auto"
                    >
                      <option value={ALL}>Mọi tệp kênh</option>
                      {options.tepKenh.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={salaryGrade}
                      onChange={(e) => setSalaryGrade(e.target.value)}
                      aria-label="Khung lương"
                      className="w-auto"
                    >
                      <option value={ALL}>Mọi khung lương</option>
                      {options.salaryGrade.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as PlatformFilter)}
                      aria-label="Nền tảng"
                      className="w-auto"
                    >
                      <option value={ALL}>Mọi nền tảng</option>
                      <option value="tiktok">Có TikTok</option>
                      <option value="shopee">Có Shopee</option>
                      <option value="facebook">Có Facebook</option>
                      <option value="instagram">Có Instagram</option>
                      <option value="threads">Có Threads</option>
                    </Select>
                    {isFiltered && (
                      <Button variant="ghost" onClick={resetFilters}>
                        Xóa bộ lọc
                      </Button>
                    )}
                  </>
                }
                resultCount={isFiltered ? filtered.length : undefined}
                chips={
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <Chips label="Loại hồ sơ" items={legalChips} value={legal} onChange={setLegal} />
                    <Chips<IssueFilter>
                      label="Cần xử lý"
                      items={issueChips}
                      value={issue}
                      onChange={(k) => setIssue((cur) => (cur === k ? '' : k))}
                    />
                  </div>
                }
              />
            </div>

            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(k) => k.id}
              onRowClick={(k) => openFromList(k.id)}
              compact
              stickyLast
              empty={
                <EmptyState
                  title={scoped.length === 0 ? 'Chưa có KOC nào' : 'Không có KOC khớp bộ lọc'}
                  description={
                    scoped.length === 0
                      ? 'Thêm KOC đầu tiên để bắt đầu lưu trữ danh bạ.'
                      : 'Bỏ bớt điều kiện lọc hoặc tìm bằng tên khác.'
                  }
                  action={
                    scoped.length === 0 ? (
                      <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
                        Thêm KOC
                      </Button>
                    ) : (
                      <Button onClick={resetFilters}>Xóa bộ lọc</Button>
                    )
                  }
                />
              }
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </Panel>
        </>
      )}

      <LegalOcrModal
        isOpen={!!ocrTarget}
        onClose={() => setOcrTarget(null)}
        onApplyToContract={handleApplyOcr}
        initialPreset="CCCD_INDIVIDUAL"
      />

      <CreateKocModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onKocCreated={(newKoc) => {
          setLocalKocs((prev) => [newKoc, ...prev]);
          onKocCreated?.(newKoc);
          onNotify?.(`Đã thêm KOC ${newKoc.stageName} vào danh bạ`, 'success');
        }}
        existingKocs={localKocs}
      />

      {metricsTarget && (
        <KalodataSyncModal
          isOpen={true}
          onClose={() => setMetricsTarget(null)}
          targetKoc={metricsTarget}
          onApplyUpdates={(kocId, updates) => {
            const target = localKocs.find((k) => k.id === kocId);
            if (target) {
              applyUpdate(
                { ...target, ...updates, metricsUpdatedAt: new Date().toISOString() },
                `Đã cập nhật chỉ số cho ${target.stageName}`,
              );
            }
            setMetricsTarget(null);
          }}
          onNotify={onNotify}
        />
      )}

      <TikTokKocScraperModal
        open={scraperOpen}
        onClose={() => setScraperOpen(false)}
        existingKocs={localKocs}
        initialHandle={scraperInitialHandle}
        onApplyResults={({ created, updated }) => {
          setLocalKocs((prev) => {
            const updatedMap = new Map(updated.map((u) => [u.id, u]));
            const next = prev.map((k) => updatedMap.get(k.id) || k);
            return [...created, ...next];
          });
          created.forEach((c) => onKocCreated?.(c));
          updated.forEach((u) => onKocUpdated?.(u));

          if (created.length > 0 && updated.length > 0) {
            onNotify?.(
              `Đã thêm ${created.length} KOC mới và cập nhật ${updated.length} hồ sơ KOC từ TikTok`,
              'success',
            );
          } else if (created.length > 0) {
            onNotify?.(`Đã thêm ${created.length} KOC từ dữ liệu TikTok vào danh bạ`, 'success');
          } else if (updated.length > 0) {
            onNotify?.(`Đã cập nhật dữ liệu TikTok cho ${updated.length} hồ sơ KOC`, 'success');
          }
        }}
        onNotify={onNotify}
      />
    </div>
  );
};
