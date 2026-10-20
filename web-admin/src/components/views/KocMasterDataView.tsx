'use client';

/**
 * Danh bạ KOC (Dữ liệu gốc).
 * Thiết kế chuẩn hóa theo Design System:
 * - Bỏ phân loại segment (Key Creator, Mid Creator...) khỏi hiển thị và bộ lọc.
 * - Bỏ cột Nhãn hàng & PIC khỏi danh bạ chung (1 KOC có thể hợp tác với nhiều nhãn).
 * - Tách riêng 2 cột "Phân loại" và "Hồ sơ". Bỏ các thông tin Followers và Đơn giá (rate).
 * - Hiển thị 5 cột kênh mạng xã hội với Logo không chữ (TikTok, Shopee, Facebook, Instagram, Threads) theo dạng tích có hay không.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CloudDownload, FileScan, FileSpreadsheet, FileText, History, Plus, RefreshCw, Search, UserCheck, XCircle } from 'lucide-react';
import type { BookingDealItem, KocItem, OcrLegalExtractionResult, StorePortfolioItem, UserProfile } from '../../lib/types';
import { INITIAL_DEALS, INITIAL_KOCS, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { KOC_MASTER_CONTACT_SYNCED_EVENT } from '../../lib/staffBrandListingSheet';
import { AddToBrandListingSheetModal } from '../shortlist/AddToBrandListingSheetModal';
import { LegalOcrModal } from '../LegalOcrModal';
import { CreateKocModal } from '../CreateKocModal';
import { KalodataSyncModal } from '../kalodata/KalodataSyncModal';
import { KocProfile } from '../koc/KocProfile';
import { KocHistoryEvaluationModal } from '../koc/KocHistoryEvaluationModal';
import { KocSocialChannelsModal } from '../koc/KocSocialChannelsModal';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import {
  KocChannelReviewBadge,
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from '../koc/KocChannelReviewModal';
import { useKocChannelReviews } from '../../lib/kocChannelReviewService';
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
  stores?: StorePortfolioItem[];
  currentUser?: UserProfile;
  /** Nhãn hàng đang chọn ở thanh trên (‘ALL’ = tất cả) */
  selectedBrand?: string;
  selectedKocId?: string | null;
  externalOpenTrigger?: number;
  returnToSourceLabel?: string;
  onReturnToSource?: () => void;
  onSelectKocId?: (kocId: string | null) => void;
  onOpenQuickBookWithKoc: (koc: KocItem) => void;
  onOpenStaffBrandSheet?: (params: { monthKey: string; storeName: string }) => void;
  onKocUpdated?: (updatedKoc: KocItem) => void;
  onKocCreated?: (newKoc: KocItem) => void;
  onOpenKocPortal?: (kocId: string) => void;
  onSelectDealForContract?: (deal: BookingDealItem) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type LegalFilter = 'ALL' | LegalType;
type IssueFilter = '' | 'MISSING' | 'NO_CONTACT' | 'DUPLICATE' | 'SUITABLE' | 'NOT_SUITABLE';
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
  switch (platform) {
    case 'tiktok':
      return Boolean(k.channelId?.trim() || k.channelLink?.trim() || k.tiktokChannel?.trim());
    case 'shopee':
      return Boolean(k.shopeeChannel?.trim());
    case 'facebook':
      return Boolean(k.facebookChannel?.trim());
    case 'instagram':
      return Boolean(k.instagramChannel?.trim());
    case 'threads':
      return Boolean(k.threadsChannel?.trim());
    default:
      return false;
  }
};

export const KocMasterDataView: React.FC<KocMasterDataViewProps> = ({
  kocs = INITIAL_KOCS,
  allDeals = INITIAL_DEALS,
  stores = INITIAL_STORE_PORTFOLIOS,
  currentUser,
  selectedBrand,
  selectedKocId = null,
  externalOpenTrigger = 0,
  returnToSourceLabel,
  onReturnToSource,
  onSelectKocId,
  onOpenQuickBookWithKoc,
  onOpenStaffBrandSheet,
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

  useEffect(() => {
    const onContactSynced = (e: Event) => {
      const detail = (e as CustomEvent<KocItem>).detail;
      if (!detail) return;
      setLocalKocs((prev) =>
        prev.map((k) => {
          const cleanH = (k.channelId || '').trim().toLowerCase().replace(/^@+/, '');
          const targetH = (detail.channelId || '').trim().toLowerCase().replace(/^@+/, '');
          if (k.id === detail.id || (cleanH && cleanH === targetH)) {
            return { ...k, ...detail };
          }
          return k;
        }),
      );
      onKocUpdated?.(detail);
    };
    window.addEventListener(KOC_MASTER_CONTACT_SYNCED_EVENT, onContactSynced);
    return () => window.removeEventListener(KOC_MASTER_CONTACT_SYNCED_EVENT, onContactSynced);
  }, [onKocUpdated]);

  const [openKocId, setOpenKocId] = useState<string | null>(selectedKocId);
  const [syncedSelectedId, setSyncedSelectedId] = useState<string | null>(selectedKocId);
  const [syncedTrigger, setSyncedTrigger] = useState<number>(externalOpenTrigger);
  if (selectedKocId !== syncedSelectedId || externalOpenTrigger !== syncedTrigger) {
    setSyncedSelectedId(selectedKocId);
    setSyncedTrigger(externalOpenTrigger);
    setOpenKocId(selectedKocId);
  }
  const rootRef = useRef<HTMLDivElement>(null);

  // Modal
  const [ocrTarget, setOcrTarget] = useState<KocItem | null>(null);
  const [metricsTarget, setMetricsTarget] = useState<KocItem | null>(null);
  const [socialTarget, setSocialTarget] = useState<KocItem | null>(null);
  const [historyEvalTarget, setHistoryEvalTarget] = useState<KocItem | null>(null);
  const [sheetTargetKocs, setSheetTargetKocs] = useState<KocItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scraperOpen, setScraperOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');
  const [channelReviewModalOpen, setChannelReviewModalOpen] = useState(false);
  const [channelReviewTarget, setChannelReviewTarget] = useState<KocChannelReviewTarget | null>(null);
  const [channelReviewMode, setChannelReviewMode] = useState<'CHANNEL_DETAIL' | 'ALL_HISTORY'>('CHANNEL_DETAIL');
  const { reviews: channelReviews, getChannelSummary } = useKocChannelReviews();

  const openChannelReview = (
    target: KocChannelReviewTarget | null,
    mode: 'CHANNEL_DETAIL' | 'ALL_HISTORY' = 'CHANNEL_DETAIL',
  ) => {
    setChannelReviewTarget(target);
    setChannelReviewMode(mode);
    setChannelReviewModalOpen(true);
  };

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
          (k.email || '').toLowerCase().includes(q) ||
          (k.shopeeChannel || '').toLowerCase().includes(q) ||
          (k.facebookChannel || '').toLowerCase().includes(q) ||
          (k.instagramChannel || '').toLowerCase().includes(q) ||
          (k.threadsChannel || '').toLowerCase().includes(q) ||
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

  const isKocMarkedSuitable = (k: KocItem): boolean => {
    const sum = getChannelSummary(k.channelId || k.channelLink);
    return Boolean(sum && (sum.latestReview.verdict === 'SUITABLE' || sum.suitableCount > 0));
  };

  const isKocMarkedNotSuitable = (k: KocItem): boolean => {
    const sum = getChannelSummary(k.channelId || k.channelLink);
    return Boolean(sum && (sum.latestReview.verdict === 'NOT_SUITABLE' || sum.notSuitableCount > 0));
  };

  const hasContactInfo = (k: KocItem): boolean => Boolean(k.email?.trim() || k.phone?.trim());

  const matchesIssue = (k: KocItem, f: IssueFilter) => {
    if (f === '') return true;
    if (f === 'MISSING') return !hasLegalId(k);
    if (f === 'NO_CONTACT') return !hasContactInfo(k);
    if (f === 'DUPLICATE') return duplicates.has(k.id);
    if (f === 'SUITABLE') return isKocMarkedSuitable(k);
    if (f === 'NOT_SUITABLE') return isKocMarkedNotSuitable(k);
    return true;
  };

  const filtered = useMemo(
    () => baseFiltered.filter((k) => (legal === ALL || typeOf(k) === legal) && matchesIssue(k, issue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseFiltered, legal, issue, duplicates, channelReviews],
  );

  const legalChips = (['ALL', 'INDIVIDUAL', 'HOUSEHOLD', 'COMPANY'] as const).map((key) => ({
    key,
    label: key === ALL ? 'Tất cả' : LEGAL_TYPE_LABEL[key],
    count: baseFiltered.filter((k) => matchesIssue(k, issue) && (key === ALL || typeOf(k) === key)).length,
  }));
  const issueBase = baseFiltered.filter((k) => legal === ALL || typeOf(k) === legal);
  const issueChips = [
    { key: 'MISSING' as const, label: 'Thiếu giấy tờ', count: issueBase.filter((k) => !hasLegalId(k)).length },
    { key: 'NO_CONTACT' as const, label: 'Thiếu Email/SĐT', count: issueBase.filter((k) => !hasContactInfo(k)).length },
    { key: 'DUPLICATE' as const, label: 'Nghi trùng', count: issueBase.filter((k) => duplicates.has(k.id)).length },
    {
      key: 'SUITABLE' as const,
      label: 'Phù hợp',
      count: issueBase.filter((k) => isKocMarkedSuitable(k)).length,
    },
    {
      key: 'NOT_SUITABLE' as const,
      label: 'Không phù hợp',
      count: issueBase.filter((k) => isKocMarkedNotSuitable(k)).length,
    },
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
    onSelectKocId?.(id);
    requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: 'start' }));
  };

  const openFromList = (id: string) => openShared(id, () => openProfile(id));
  const backToList = (id: string) =>
    closeShared(id, () => {
      setOpenKocId(null);
      onSelectKocId?.(null);
    });

  const rowActions = (k: KocItem) => {
    const reviewSummary = getChannelSummary(k.channelId || k.channelLink);
    const defaultBrand = selectedBrand && selectedBrand !== ALL ? selectedBrand : undefined;
    return [
      {
        label: 'Thêm vào Sheet Listing Brand',
        icon: FileSpreadsheet,
        onSelect: () => setSheetTargetKocs([k]),
      },
      {
        label: 'Đánh giá Phù hợp (theo Brand)',
        icon: Check,
        onSelect: () =>
          openChannelReview({
            handle: k.channelId,
            channelName: k.stageName,
            channelUrl: k.channelLink || `https://www.tiktok.com/@${k.channelId.replace(/^@+/, '')}`,
            avatarUrl: k.avatarUrl,
            defaultBrandScope: defaultBrand,
            initialVerdict: 'SUITABLE',
            sourceScreen: 'Danh bạ KOC',
          }),
      },
      {
        label: 'Đánh giá Không phù hợp (theo Brand)',
        icon: XCircle,
        onSelect: () =>
          openChannelReview({
            handle: k.channelId,
            channelName: k.stageName,
            channelUrl: k.channelLink || `https://www.tiktok.com/@${k.channelId.replace(/^@+/, '')}`,
            avatarUrl: k.avatarUrl,
            defaultBrandScope: defaultBrand,
            initialVerdict: 'NOT_SUITABLE',
            sourceScreen: 'Danh bạ KOC',
          }),
      },
      ...(reviewSummary
        ? [
            {
              label: `Lịch sử đánh giá kênh (${reviewSummary.totalReviews})`,
              icon: History,
              onSelect: () =>
                openChannelReview({
                  handle: k.channelId,
                  channelName: k.stageName,
                  channelUrl: k.channelLink || `https://www.tiktok.com/@${k.channelId.replace(/^@+/, '')}`,
                  avatarUrl: k.avatarUrl,
                  defaultBrandScope: defaultBrand,
                  sourceScreen: 'Danh bạ KOC',
                }),
            },
          ]
        : []),
      { label: 'Đánh giá lịch sử & rủi ro', icon: FileText, onSelect: () => setHistoryEvalTarget(k) },
      ...(onOpenKocPortal ? [{ label: 'Mở Cổng KOC', icon: UserCheck, onSelect: () => onOpenKocPortal(k.id) }] : []),
      { label: 'Tạo booking', icon: Plus, onSelect: () => onOpenQuickBookWithKoc(k) },
      { label: 'Tìm kênh MXH', icon: Search, onSelect: () => setSocialTarget(k) },
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
  };

  /* --------------------------------------------------------------- Bảng */

  const columns: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'KOC & Liên hệ',
      width: 240,
      render: (k) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[260px]">
          <span {...sharedFrom('koc-avatar', k.id)} className="shrink-0 inline-flex">
            <Avatar name={k.stageName} src={k.avatarUrl} size={32} />
          </span>
          <div className="min-w-0 leading-tight space-y-0.5">
            <span {...sharedFrom('koc-title', k.id)} className="block truncate font-semibold text-ink text-xs">
              {k.stageName}
            </span>
            <span className="block truncate text-2xs text-ink-3">
              @{k.channelId.replace(/^@/, '')}
              {k.realName && k.realName !== k.stageName ? ` · ${k.realName}` : ''}
            </span>
            {k.email || k.phone ? (
              <span className="block truncate text-2xs text-ink-2" title={[k.email, k.phone].filter(Boolean).join(' · ')}>
                {[k.email, k.phone].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <span className="block truncate text-2xs text-ink-3/70">Chưa có Email / SĐT</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'brandReview',
      header: 'Đánh giá & Brand',
      width: 245,
      render: (k) => {
        const reviewSummary = getChannelSummary(k.channelId || k.channelLink);
        const defaultBrand = selectedBrand && selectedBrand !== ALL ? selectedBrand : undefined;
        const openForVerdict = (verdict?: 'SUITABLE' | 'CAUTION' | 'NOT_SUITABLE') => {
          openChannelReview({
            handle: k.channelId,
            channelName: k.stageName,
            channelUrl: k.channelLink || `https://www.tiktok.com/@${k.channelId.replace(/^@+/, '')}`,
            avatarUrl: k.avatarUrl,
            defaultBrandScope: defaultBrand,
            initialVerdict: verdict,
            sourceScreen: 'Danh bạ KOC',
          });
        };

        if (!reviewSummary) {
          return (
            <div className="grid gap-1 min-w-0 max-w-[240px]" onClick={(e) => e.stopPropagation()}>
              <span className="text-2xs text-ink-3">Chưa có đánh giá theo Brand</span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openForVerdict('SUITABLE')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-positive/30 bg-positive-soft text-positive text-2xs font-semibold hover:bg-positive-soft/80 transition cursor-pointer"
                >
                  <Check className="w-3 h-3 shrink-0" />
                  <span>Phù hợp</span>
                </button>
                <button
                  type="button"
                  onClick={() => openForVerdict('NOT_SUITABLE')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-critical/30 bg-critical-soft text-critical text-2xs font-semibold hover:bg-critical-soft/80 transition cursor-pointer"
                >
                  <XCircle className="w-3 h-3 shrink-0" />
                  <span>Không phù hợp</span>
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="grid gap-1 min-w-0 max-w-[245px]" onClick={(e) => e.stopPropagation()}>
            <KocChannelReviewBadge
              summary={reviewSummary}
              onClick={() => openForVerdict()}
            />
            <button
              type="button"
              onClick={() => openForVerdict()}
              className="text-left text-2xs leading-snug grid gap-0.5 hover:underline cursor-pointer"
              title={`Ý kiến: ${reviewSummary.latestReview.note || reviewSummary.latestReview.reasonTags.join(', ')}`}
            >
              <span className="truncate font-medium text-ink-2">
                {reviewSummary.latestReview.reviewerName} · {reviewSummary.latestReview.timeLabel}{' '}
                {reviewSummary.latestReview.dateLabel}
              </span>
              {reviewSummary.latestReview.note && (
                <span className="truncate text-ink">
                  Ý kiến: &ldquo;{reviewSummary.latestReview.note}&rdquo;
                </span>
              )}
            </button>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => openForVerdict('SUITABLE')}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-positive/30 bg-positive-soft/60 text-positive text-2xs font-semibold hover:bg-positive-soft transition cursor-pointer"
              >
                <Check className="w-2.5 h-2.5" />
                <span>+ Phù hợp</span>
              </button>
              <button
                type="button"
                onClick={() => openForVerdict('NOT_SUITABLE')}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-critical/30 bg-critical-soft/60 text-critical text-2xs font-semibold hover:bg-critical-soft transition cursor-pointer"
              >
                <XCircle className="w-2.5 h-2.5" />
                <span>+ K.Phù hợp</span>
              </button>
            </div>
          </div>
        );
      },
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
      render: (k) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSocialTarget(k);
          }}
          title={k.shopeeChannel ? `Shopee: ${k.shopeeChannel}` : 'Tìm & xác nhận kênh Shopee'}
          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-sunken mx-auto"
        >
          {hasKocPlatform(k, 'shopee') ? (
            <Check className="w-4 h-4 text-positive stroke-[2.5]" />
          ) : (
            <span className="text-ink-3/40 text-xs">—</span>
          )}
        </button>
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
      render: (k) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSocialTarget(k);
          }}
          title={k.facebookChannel ? `Facebook: ${k.facebookChannel}` : 'Tìm & xác nhận kênh Facebook'}
          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-sunken mx-auto"
        >
          {hasKocPlatform(k, 'facebook') ? (
            <Check className="w-4 h-4 text-positive stroke-[2.5]" />
          ) : (
            <span className="text-ink-3/40 text-xs">—</span>
          )}
        </button>
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
      render: (k) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSocialTarget(k);
          }}
          title={k.instagramChannel ? `Instagram: ${k.instagramChannel}` : 'Tìm & xác nhận kênh Instagram'}
          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-sunken mx-auto"
        >
          {hasKocPlatform(k, 'instagram') ? (
            <Check className="w-4 h-4 text-positive stroke-[2.5]" />
          ) : (
            <span className="text-ink-3/40 text-xs">—</span>
          )}
        </button>
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
      render: (k) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSocialTarget(k);
          }}
          title={k.threadsChannel ? `Threads: ${k.threadsChannel}` : 'Tìm & xác nhận kênh Threads'}
          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-sunken mx-auto"
        >
          {hasKocPlatform(k, 'threads') ? (
            <Check className="w-4 h-4 text-positive stroke-[2.5]" />
          ) : (
            <span className="text-ink-3/40 text-xs">—</span>
          )}
        </button>
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
      width: 170,
      render: (k) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => setSheetTargetKocs([k])}
          >
            Thêm vào Sheet
          </Button>
          <ActionMenu items={rowActions(k)} />
        </div>
      ),
    },
  ];

  /* ------------------------------------------------------------- Render */

  const openKoc = useMemo(() => {
    if (!openKocId) return undefined;
    const cleanTarget = openKocId.trim().toLowerCase().replace(/^@+/, '');
    return localKocs.find(
      (k) =>
        k.id === openKocId ||
        (k.channelId || '').trim().toLowerCase().replace(/^@+/, '') === cleanTarget,
    );
  }, [localKocs, openKocId]);
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
            onReturnToSource,
            returnToSourceLabel,
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
          onSearchSocialChannels={setSocialTarget}
          onUpdateKoc={(updated, msg) =>
            applyUpdate(updated, msg || `Đã cập nhật hồ sơ của ${updated.stageName}`)
          }
          onOpenKocPortal={onOpenKocPortal}
          onSelectDealForContract={onSelectDealForContract}
        />
      ) : (
        <>
          <PageActions>
            {onReturnToSource && returnToSourceLabel && (
              <Button variant="secondary" icon={ArrowLeft} onClick={onReturnToSource}>
                {returnToSourceLabel}
              </Button>
            )}
            <Button
              variant="secondary"
              icon={History}
              onClick={() => openChannelReview(null, 'ALL_HISTORY')}
            >
              Lịch sử đánh giá KOC ({channelReviews.length})
            </Button>
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
                  placeholder: 'Tên kênh, nick Shopee/FB/IG/Threads, Email, SĐT, CCCD...',
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

      <KocHistoryEvaluationModal
        open={!!historyEvalTarget}
        onClose={() => setHistoryEvalTarget(null)}
        koc={historyEvalTarget}
        deals={allDeals}
        duplicates={historyEvalTarget ? duplicates.get(historyEvalTarget.id) : undefined}
        onCreateBooking={onOpenQuickBookWithKoc}
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

      <KocSocialChannelsModal
        open={!!socialTarget}
        onClose={() => setSocialTarget(null)}
        koc={socialTarget}
        onConfirmSave={(kocId, updates) => {
          const target = localKocs.find((k) => k.id === kocId);
          if (target) {
            applyUpdate(
              {
                ...target,
                shopeeChannel: updates.shopeeChannel,
                facebookChannel: updates.facebookChannel,
                instagramChannel: updates.instagramChannel,
                threadsChannel: updates.threadsChannel,
                platforms: updates.platforms,
              },
              `Đã xác nhận và lưu các kênh mạng xã hội cho ${target.stageName}`,
            );
          }
          setSocialTarget(null);
        }}
      />

      <TikTokKocScraperModal
        open={scraperOpen}
        onClose={() => setScraperOpen(false)}
        existingKocs={localKocs}
        initialHandle={scraperInitialHandle}
        currentUser={currentUser}
        onOpenKocInMaster={(koc) => {
          setScraperOpen(false);
          openProfile(koc.id);
        }}
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

      <KocChannelReviewModal
        open={channelReviewModalOpen}
        onClose={() => setChannelReviewModalOpen(false)}
        target={channelReviewTarget}
        initialMode={channelReviewMode}
        currentUserName={currentUser?.name}
        currentUserRole={currentUser?.roleTitle}
        currentUserEmail={currentUser?.email}
        reviews={channelReviews}
        onNotify={onNotify}
      />

      <AddToBrandListingSheetModal
        open={sheetTargetKocs.length > 0}
        onClose={() => setSheetTargetKocs([])}
        targetKocs={sheetTargetKocs}
        allKocs={localKocs}
        stores={stores}
        deals={allDeals}
        currentUserName={currentUser?.name || 'Chuyên viên Listing'}
        onAddedSuccess={({ monthKey, storeName, openSheet }) => {
          if (openSheet && onOpenStaffBrandSheet) {
            onOpenStaffBrandSheet({ monthKey, storeName });
          }
        }}
        onNotify={onNotify}
      />
    </div>
  );
};
