'use client';

/**
 * Danh bạ KOC — Tổ chức chuẩn theo 2 Bảng dữ liệu KOC & Mô hình 1 KOC -> N Hồ sơ pháp lý (ERD kol-connector):
 * 1. Bảng 1: KOC Cũ kèm lịch sử (COOPERATED) — Master KOC đã từng hợp tác, lưu lịch sử BO/Deal, biên độ giá, GMV/ROI tích lũy và danh sách 1–N Hồ sơ pháp lý & Tài khoản thụ hưởng.
 * 2. Bảng 2: KOC Mới / Tiềm năng (NEW) — KOC chưa từng hợp tác (từ Sheet KOC_Tiem_Nang, TikTok Seller, Kalodata, Scraper), tập trung chỉ số kênh, độ sẵn sàng booking, gian hàng đề xuất và lịch sử liên hệ tiếp cận.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Building2,
  Check,
  CheckCircle2,
  CloudDownload,
  FileScan,
  FileSpreadsheet,
  FileText,
  History,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  BookingDealItem,
  KocBookingReadiness,
  KocContactLogItem,
  KocItem,
  OcrLegalExtractionResult,
  StorePortfolioItem,
  UserProfile,
} from '../../lib/types';
import { INITIAL_DEALS, INITIAL_KOCS, INITIAL_STORE_PORTFOLIOS } from '../../lib/mockData';
import { formatNumber, formatVndShort } from '../../lib/format';
import {
  KOC_MASTER_CONTACT_SYNCED_EVENT,
  syncKocContactToStaffSheets,
} from '../../lib/staffBrandListingSheet';
import { AddToBrandListingSheetModal } from '../shortlist/AddToBrandListingSheetModal';
import { LegalOcrModal } from '../LegalOcrModal';
import { CreateKocModal } from '../CreateKocModal';
import { KalodataSyncModal } from '../kalodata/KalodataSyncModal';
import { KocProfile } from '../koc/KocProfile';
import { KocHistoryEvaluationModal } from '../koc/KocHistoryEvaluationModal';
import { KocVideoHistoryRegistryModal } from '../koc/KocVideoHistoryRegistryModal';
import { KocSocialChannelsModal } from '../koc/KocSocialChannelsModal';
import { TikTokKocScraperModal } from '../koc/TikTokKocScraperModal';
import { UpaffiliateSyncModal } from '../koc/UpaffiliateSyncModal';
import { PendingKocStagingModal } from '../koc/PendingKocStagingModal';
import { UpaffiliateDataManagementPanel } from '../koc/UpaffiliateDataManagementPanel';
import { fetchStagingKocs, type StagingKocItem } from '../../lib/kocStagingService';
import {
  formatSyncDateTime,
  getUpaffiliateCreatorId,
  getUpaffiliateSyncStatus,
  SCHEDULE_MODE_LABELS,
  useUpaffiliatePeriodicSync,
} from '../../lib/upaffiliateKocSyncService';
import {
  KocChannelReviewModal,
  type KocChannelReviewTarget,
} from '../koc/KocChannelReviewModal';
import { useKocChannelReviews } from '../../lib/kocChannelReviewService';
import {
  LEGAL_TYPE_LABEL,
  READINESS_LABEL,
  evaluateLegalProfileContractReadiness,
  findDuplicates,
  formatFollowers,
  getKocLegalProfiles,
  hasLegalId,
  isCooperatedKoc,
  legalTypeOf,
  syncKocWithLegalProfiles,
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
  Field,
  FilterBar,
  Input,
  InstagramLogo,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Select,
  ShopeeLogo,
  Stat,
  StatRow,
  Status,
  Textarea,
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
  onCreateContractForKoc?: (koc: KocItem, legalProfileId?: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

type DatasetTab = 'COOPERATED' | 'NEW' | 'UPAFFILIATE_HUB';
type LegalFilter = 'ALL' | LegalType | 'MULTI_LEGAL';
type IssueFilter = '' | 'MISSING' | 'NO_CONTACT' | 'DUPLICATE' | 'SUITABLE' | 'NOT_SUITABLE';
type ReadinessFilter = 'ALL' | KocBookingReadiness;
type NewIssueFilter = '' | 'CONTACTED' | 'NOT_CONTACTED' | 'HAS_PHONE' | 'SUITABLE' | 'NOT_SUITABLE';
type PlatformFilter = 'ALL' | 'tiktok' | 'shopee' | 'facebook' | 'instagram' | 'threads';

const ALL = 'ALL';
const typeOf = (k: KocItem): LegalType | null => (hasLegalId(k) ? legalTypeOf(k) : null);
const uniqSorted = (values: Array<string | undefined>) =>
  [...new Set(values.filter((v): v is string => !!v && !!v.trim()).map((v) => v.trim()))].sort(
    (a, b) => a.localeCompare(b, 'vi', { numeric: true }),
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
  onCreateContractForKoc,
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

  // Chuyển đổi giữa 2 bảng dữ liệu KOC:
  // - COOPERATED: Bảng 1 — KOC Cũ kèm lịch sử hợp tác & 1–N Hồ sơ pháp lý
  // - NEW: Bảng 2 — KOC Mới / Tiềm năng chưa hợp tác
  const [datasetTab, setDatasetTab] = useState<DatasetTab>('COOPERATED');

  // Modals
  const [ocrTarget, setOcrTarget] = useState<KocItem | null>(null);
  const [metricsTarget, setMetricsTarget] = useState<KocItem | null>(null);
  const [socialTarget, setSocialTarget] = useState<KocItem | null>(null);
  const [historyEvalTarget, setHistoryEvalTarget] = useState<KocItem | null>(null);
  const [outreachTarget, setOutreachTarget] = useState<KocItem | null>(null);
  const [sheetTargetKocs, setSheetTargetKocs] = useState<KocItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [videoRegistryOpen, setVideoRegistryOpen] = useState(false);
  const [scraperOpen, setScraperOpen] = useState(false);
  const [scraperInitialHandle, setScraperInitialHandle] = useState('');
  const [upaffiliateSyncOpen, setUpaffiliateSyncOpen] = useState(false);
  const [stagingModalOpen, setStagingModalOpen] = useState(false);
  const [stagingItems, setStagingItems] = useState<StagingKocItem[]>([]);

  const {
    config: upaffiliateConfig,
    logs: upaffiliateLogs,
    stagingPendingCount,
    isSyncing: isUpaffiliateSyncing,
    reloadState: reloadUpaffiliateState,
    triggerSync: triggerUpaffiliateSync,
    updateConfig: updateUpaffiliateConfig,
  } = useUpaffiliatePeriodicSync({
    kocs: localKocs,
    onSyncCompleted: ({ syncedAt, log }) => {
      setLocalKocs((prev) =>
        prev.map((k) => {
          if (
            k.upaffiliateSyncStatus === 'LOCAL_MODIFIED' ||
            k.upaffiliateSyncStatus === 'PENDING_PUSH'
          ) {
            return {
              ...k,
              upaffiliateSyncStatus: 'SYNCED',
              upaffiliateSyncedAt: syncedAt,
            };
          }
          return k;
        }),
      );
      if (log) {
        onNotify?.(
          `Đồng bộ UpAffiliate hoàn tất (${formatNumber(log.summary.pulledCooperatedCount)} KOC Cũ · ${formatNumber(log.summary.pulledNewCount)} KOC Mới · ${formatNumber(log.summary.syncedLegalProfilesCount)} Hồ sơ pháp lý)`,
          'success',
        );
      }
    },
  });

  const openStagingQueueModal = async () => {
    const list = await fetchStagingKocs();
    setStagingItems(list);
    setStagingModalOpen(true);
  };
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

  // Bộ lọc dùng chung và riêng cho 2 bảng
  const [search, setSearch] = useState('');
  const [legal, setLegal] = useState<LegalFilter>(ALL);
  const [issue, setIssue] = useState<IssueFilter>('');
  const [readiness, setReadiness] = useState<ReadinessFilter>(ALL);
  const [newIssue, setNewIssue] = useState<NewIssueFilter>('');
  const [category, setCategory] = useState(ALL);
  const [tepKenh, setTepKenh] = useState(ALL);
  const [salaryGrade, setSalaryGrade] = useState(ALL);
  const [picFilter, setPicFilter] = useState(ALL);
  const [platform, setPlatform] = useState<PlatformFilter>(ALL);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const duplicates = useMemo(() => findDuplicates(localKocs), [localKocs]);

  // Phân tách 2 tập dữ liệu gốc: Bảng 1 (KOC Cũ kèm lịch sử) & Bảng 2 (KOC Mới / Tiềm năng)
  const { cooperatedKocs, newKocs } = useMemo(() => {
    const coop: KocItem[] = [];
    const fresh: KocItem[] = [];
    for (const k of localKocs) {
      if (isCooperatedKoc(k, allDeals)) {
        coop.push(k);
      } else {
        fresh.push(k);
      }
    }
    return { cooperatedKocs: coop, newKocs: fresh };
  }, [localKocs, allDeals]);

  const activeDataset = datasetTab === 'COOPERATED' ? cooperatedKocs : newKocs;

  // Chỉ số KPI cho Bảng 1 (KOC Cũ kèm lịch sử) và Bảng 2 (KOC Mới / Tiềm năng)
  const datasetStats = useMemo(() => {
    const coopWithDocs = cooperatedKocs.filter((k) => hasLegalId(k) && Boolean(k.bankAccount)).length;
    const coopMultiLegal = cooperatedKocs.filter((k) => getKocLegalProfiles(k).length > 1).length;
    const coopTotalGmv = cooperatedKocs.reduce((s, k) => s + (k.totalPastGmv || 0), 0);
    const coopTotalCost = cooperatedKocs.reduce((s, k) => s + (k.totalPastCost || 0), 0);

    const newReady = newKocs.filter((k) => k.bookingReadiness === 'SẴN_SÀNG_BOOKING').length;
    const newWithContact = newKocs.filter((k) => Boolean(k.phone?.trim() || k.email?.trim())).length;
    const newContacted = newKocs.filter((k) => k.contactStatus === 'ĐÃ_LIÊN_HỆ' || k.contactStatus === 'ĐANG_THƯƠNG_LƯỢNG').length;
    const newHighTraffic = newKocs.filter((k) => (k.avgViews || 0) >= 15000 || (k.followers || 0) >= 100000).length;

    return {
      coopWithDocs,
      coopMultiLegal,
      coopTotalGmv,
      coopTotalCost,
      newReady,
      newWithContact,
      newContacted,
      newHighTraffic,
    };
  }, [cooperatedKocs, newKocs]);

  const options = useMemo(
    () => ({
      category: uniqSorted(activeDataset.map((k) => k.kocCategory)),
      tepKenh: uniqSorted(activeDataset.map((k) => k.tepKenh || k.creatorCategory)),
      salaryGrade: uniqSorted(activeDataset.map((k) => k.salaryGrade)),
      pic: uniqSorted(activeDataset.map((k) => k.bookingPic?.split('\n')[0])),
    }),
    [activeDataset],
  );

  // Lọc theo điều kiện tìm kiếm và dropdowns
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return activeDataset.filter((k) => {
      if (q) {
        const profiles = getKocLegalProfiles(k);
        const matchLegalHolder = profiles.some(
          (p) =>
            p.holderName.toLowerCase().includes(q) ||
            (p.cccd || '').toLowerCase().includes(q) ||
            (p.taxCode || '').toLowerCase().includes(q) ||
            (p.bankAccount || '').toLowerCase().includes(q),
        );
        const hit =
          k.stageName.toLowerCase().includes(q) ||
          (k.realName || '').toLowerCase().includes(q) ||
          k.channelId.toLowerCase().includes(q) ||
          (k.email || '').toLowerCase().includes(q) ||
          (k.brandName || '').toLowerCase().includes(q) ||
          (k.latestBoCode || '').toLowerCase().includes(q) ||
          (k.proposedStores || '').toLowerCase().includes(q) ||
          (k.shopeeChannel || '').toLowerCase().includes(q) ||
          (k.facebookChannel || '').toLowerCase().includes(q) ||
          (k.instagramChannel || '').toLowerCase().includes(q) ||
          (k.threadsChannel || '').toLowerCase().includes(q) ||
          matchLegalHolder ||
          (qDigits.length >= 4 &&
            [k.phone, k.cccd, k.taxCode, k.bankAccount].some((v) =>
              (v || '').replace(/\D/g, '').includes(qDigits),
            ));
        if (!hit) return false;
      }
      if (category !== ALL && k.kocCategory !== category) return false;
      if (tepKenh !== ALL && (k.tepKenh || k.creatorCategory) !== tepKenh) return false;
      if (salaryGrade !== ALL && k.salaryGrade !== salaryGrade) return false;
      if (picFilter !== ALL && !(k.bookingPic || '').includes(picFilter)) return false;
      if (platform !== ALL && !hasKocPlatform(k, platform)) return false;
      return true;
    });
  }, [activeDataset, search, category, tepKenh, salaryGrade, picFilter, platform]);

  const isKocMarkedSuitable = (k: KocItem): boolean => {
    const sum = getChannelSummary(k.channelId || k.channelLink);
    return Boolean(sum && (sum.latestReview.verdict === 'SUITABLE' || sum.suitableCount > 0));
  };

  const isKocMarkedNotSuitable = (k: KocItem): boolean => {
    const sum = getChannelSummary(k.channelId || k.channelLink);
    return Boolean(sum && (sum.latestReview.verdict === 'NOT_SUITABLE' || sum.notSuitableCount > 0));
  };

  const hasContactInfo = (k: KocItem): boolean => Boolean(k.email?.trim() || k.phone?.trim());

  const matchesLegalFilter = (k: KocItem, l: LegalFilter) => {
    if (l === ALL) return true;
    const profiles = getKocLegalProfiles(k);
    if (l === 'MULTI_LEGAL') return profiles.length > 1;
    if (profiles.length > 0) return profiles.some((p) => p.legalType === l);
    return typeOf(k) === l;
  };

  const matchesIssue = (k: KocItem, f: IssueFilter) => {
    if (f === '') return true;
    if (f === 'MISSING') return !hasLegalId(k);
    if (f === 'NO_CONTACT') return !hasContactInfo(k);
    if (f === 'DUPLICATE') return duplicates.has(k.id);
    if (f === 'SUITABLE') return isKocMarkedSuitable(k);
    if (f === 'NOT_SUITABLE') return isKocMarkedNotSuitable(k);
    return true;
  };

  const matchesNewIssue = (k: KocItem, f: NewIssueFilter) => {
    if (f === '') return true;
    if (f === 'CONTACTED') return k.contactStatus === 'ĐÃ_LIÊN_HỆ' || k.contactStatus === 'ĐANG_THƯƠNG_LƯỢNG';
    if (f === 'NOT_CONTACTED') return !k.contactStatus || k.contactStatus === 'CHƯA_LIÊN_HỆ';
    if (f === 'HAS_PHONE') return hasContactInfo(k);
    if (f === 'SUITABLE') return isKocMarkedSuitable(k);
    if (f === 'NOT_SUITABLE') return isKocMarkedNotSuitable(k);
    return true;
  };

  const filtered = useMemo(() => {
    if (datasetTab === 'COOPERATED') {
      return baseFiltered.filter((k) => matchesLegalFilter(k, legal) && matchesIssue(k, issue));
    }
    return baseFiltered.filter(
      (k) =>
        (readiness === ALL || (k.bookingReadiness || 'CHỜ_TIẾP_CẬN') === readiness) &&
        matchesNewIssue(k, newIssue),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetTab, baseFiltered, legal, issue, readiness, newIssue, duplicates, channelReviews]);

  // Chips cho Bảng 1 (COOPERATED)
  const legalChips = (
    [
      { key: 'ALL', label: 'Tất cả' },
      { key: 'INDIVIDUAL', label: 'Cá nhân' },
      { key: 'HOUSEHOLD', label: 'Hộ kinh doanh' },
      { key: 'COMPANY', label: 'Công ty / MCN' },
      { key: 'MULTI_LEGAL', label: 'Đa pháp nhân (≥2 hồ sơ)' },
    ] as const
  ).map((item) => ({
    key: item.key,
    label: item.label,
    count: baseFiltered.filter((k) => matchesIssue(k, issue) && matchesLegalFilter(k, item.key)).length,
  }));

  const issueBase = baseFiltered.filter((k) => matchesLegalFilter(k, legal));
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

  // Chips cho Bảng 2 (NEW)
  const readinessChips = (
    [
      { key: 'ALL', label: 'Tất cả' },
      { key: 'SẴN_SÀNG_BOOKING', label: 'Sẵn sàng booking' },
      { key: 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ', label: 'Có liên hệ · Bổ sung pháp lý' },
      { key: 'CẦN_XIN_LIÊN_HỆ', label: 'Cần xin SĐT/Zalo' },
      { key: 'CHỜ_TIẾP_CẬN', label: 'Chờ tiếp cận' },
    ] as const
  ).map((item) => ({
    key: item.key,
    label: item.label,
    count: baseFiltered.filter(
      (k) =>
        matchesNewIssue(k, newIssue) &&
        (item.key === ALL || (k.bookingReadiness || 'CHỜ_TIẾP_CẬN') === item.key),
    ).length,
  }));

  const newIssueBase = baseFiltered.filter(
    (k) => readiness === ALL || (k.bookingReadiness || 'CHỜ_TIẾP_CẬN') === readiness,
  );
  const newIssueChips = [
    {
      key: 'CONTACTED' as const,
      label: 'Đã liên hệ',
      count: newIssueBase.filter((k) => matchesNewIssue(k, 'CONTACTED')).length,
    },
    {
      key: 'NOT_CONTACTED' as const,
      label: 'Chưa liên hệ',
      count: newIssueBase.filter((k) => matchesNewIssue(k, 'NOT_CONTACTED')).length,
    },
    {
      key: 'HAS_PHONE' as const,
      label: 'Có SĐT/Email',
      count: newIssueBase.filter((k) => hasContactInfo(k)).length,
    },
    {
      key: 'SUITABLE' as const,
      label: 'Phù hợp',
      count: newIssueBase.filter((k) => isKocMarkedSuitable(k)).length,
    },
    {
      key: 'NOT_SUITABLE' as const,
      label: 'Không phù hợp',
      count: newIssueBase.filter((k) => isKocMarkedNotSuitable(k)).length,
    },
  ];

  const isFiltered =
    !!search.trim() ||
    legal !== ALL ||
    issue !== '' ||
    readiness !== ALL ||
    newIssue !== '' ||
    category !== ALL ||
    tepKenh !== ALL ||
    salaryGrade !== ALL ||
    picFilter !== ALL ||
    platform !== ALL;

  const resetFilters = () => {
    setSearch('');
    setLegal(ALL);
    setIssue('');
    setReadiness(ALL);
    setNewIssue('');
    setCategory(ALL);
    setTepKenh(ALL);
    setSalaryGrade(ALL);
    setPicFilter(ALL);
    setPlatform(ALL);
  };

  const filterKey = [
    datasetTab,
    search,
    legal,
    issue,
    readiness,
    newIssue,
    category,
    tepKenh,
    salaryGrade,
    picFilter,
    platform,
    pageSize,
  ].join('|');
  const [pagedKey, setPagedKey] = useState(filterKey);
  if (filterKey !== pagedKey) {
    setPagedKey(filterKey);
    setPage(1);
  }
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ------------------------------------------------------- Cập nhật hồ sơ */

  const applyUpdate = (updated: KocItem, message: string) => {
    const marked: KocItem = {
      ...updated,
      upaffiliateCreatorId: getUpaffiliateCreatorId(updated),
      upaffiliateSyncStatus: 'LOCAL_MODIFIED',
    };
    setLocalKocs((prev) => prev.map((k) => (k.id === marked.id ? marked : k)));
    onKocUpdated?.(marked);
    onNotify?.(message, 'success');
  };

  const handleApplyOcr = (r: OcrLegalExtractionResult) => {
    if (!ocrTarget) return;
    const f = r.fields;
    const existingProfiles = getKocLegalProfiles(ocrTarget);
    const lType: LegalType =
      r.documentType === 'BUSINESS_LICENSE'
        ? 'COMPANY'
        : r.documentType === 'BUSINESS_HOUSEHOLD'
          ? 'HOUSEHOLD'
          : 'INDIVIDUAL';
    const holder =
      f.companyName || f.householdBusinessName || f.fullName || ocrTarget.realName || ocrTarget.stageName;
    const scannedCccd = (f.idNumber || '').trim();
    const scannedTax = (f.taxCode || '').trim();

    // Kiểm tra xem hồ sơ quét OCR trùng khớp với hồ sơ đã có hoặc cập nhật hồ sơ chưa có CCCD/MST cùng loại
    const matchIdx = existingProfiles.findIndex(
      (p) =>
        (scannedCccd && p.cccd && p.cccd.trim() === scannedCccd) ||
        (scannedTax && p.taxCode && p.taxCode.trim() === scannedTax) ||
        (existingProfiles.length === 1 && p.legalType === lType && !p.cccd && !p.taxCode),
    );

    const buildExtractedProfile = (baseId: string, code: string, prev?: (typeof existingProfiles)[number]) => ({
      ...(prev || {}),
      id: baseId,
      profileCode: code,
      legalType: lType,
      isDefault: true,
      status: 'ACTIVE' as const,
      taxAccountType:
        prev?.taxAccountType ||
        (lType === 'COMPANY'
          ? '(VAT 8%) Tài khoản doanh nghiệp'
          : lType === 'HOUSEHOLD'
            ? 'HKD xuất hóa đơn'
            : '(Thuế TNCN 10%) Tài khoản cá nhân'),
      vatRatePercent:
        prev?.vatRatePercent ?? (lType === 'COMPANY' ? 8 : lType === 'HOUSEHOLD' ? 5 : 0),
      holderName: holder,
      representativeName:
        f.legalRepresentative ||
        prev?.representativeName ||
        (lType !== 'INDIVIDUAL' ? ocrTarget.legalRepresentative || ocrTarget.realName : undefined),
      representativeTitle:
        prev?.representativeTitle ||
        (lType === 'COMPANY' ? 'Giám đốc' : lType === 'HOUSEHOLD' ? 'Chủ hộ kinh doanh' : undefined),
      relationshipNote:
        prev?.relationshipNote ||
        (lType === 'COMPANY'
          ? 'Pháp nhân Công ty / MCN đại diện'
          : lType === 'HOUSEHOLD'
            ? 'Hộ kinh doanh cá thể'
            : 'Chính chủ KOC'),
      cccd: scannedCccd || prev?.cccd || ocrTarget.cccd,
      cccdIssueDate: f.issueDate || prev?.cccdIssueDate || ocrTarget.issueDate,
      cccdIssuePlace: f.issuePlace || prev?.cccdIssuePlace || ocrTarget.issuePlace,
      taxCode: scannedTax || prev?.taxCode || ocrTarget.taxCode,
      registeredAddress:
        f.permanentAddress ||
        f.headquartersAddress ||
        prev?.registeredAddress ||
        ocrTarget.permanentAddress,
      contactPhone: prev?.contactPhone || ocrTarget.phone,
      contactEmail: prev?.contactEmail || ocrTarget.email,
      bankName: prev?.bankName || ocrTarget.bankName,
      bankAccount: prev?.bankAccount || ocrTarget.bankAccount,
      bankAccountNumber: prev?.bankAccountNumber || prev?.bankAccount || ocrTarget.bankAccount,
      bankHolderName: prev?.bankHolderName || holder,
      isOcrVerified: true,
    });

    const nextProfiles =
      matchIdx >= 0
        ? existingProfiles.map((p, idx) =>
            idx === matchIdx
              ? buildExtractedProfile(p.id, p.profileCode || `HSPL-0${idx + 1}`, p)
              : { ...p, isDefault: false },
          )
        : [
            ...existingProfiles.map((p) => ({ ...p, isDefault: false })),
            buildExtractedProfile(
              `${ocrTarget.id}-lp-ocr-${Date.now()}`,
              `HSPL-0${existingProfiles.length + 1}`,
            ),
          ];

    const synced = syncKocWithLegalProfiles(
      {
        ...ocrTarget,
        dob: f.dob || ocrTarget.dob,
        ocrVerifiedAt: new Date().toISOString(),
      },
      nextProfiles,
    );
    applyUpdate(
      synced,
      matchIdx >= 0
        ? `Đã cập nhật giấy tờ pháp lý (${holder}) cho ${ocrTarget.stageName}`
        : `Đã đọc giấy tờ & thêm hồ sơ pháp lý mới (HSPL-0${nextProfiles.length}) cho ${ocrTarget.stageName}`,
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
    const isCoop = isCooperatedKoc(k, allDeals);
    return [
      {
        label: 'Thêm vào Sheet Listing Brand',
        icon: FileSpreadsheet,
        onSelect: () => setSheetTargetKocs([k]),
      },
      ...(!isCoop
        ? [
            {
              label: 'Ghi lịch sử liên hệ / Chốt hợp tác',
              icon: PhoneCall,
              onSelect: () => setOutreachTarget(k),
            },
          ]
        : []),
      {
        label: reviewSummary
          ? `Đánh giá KOC (${reviewSummary.latestReview.verdict === 'SUITABLE' ? 'Phù hợp' : reviewSummary.latestReview.verdict === 'NOT_SUITABLE' ? 'Không phù hợp' : 'Cần cân nhắc'})`
          : 'Đánh giá KOC theo Brand',
        icon: Award,
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
      ...(onCreateContractForKoc
        ? [
            {
              label: 'Ký hợp đồng (1 KOC – N Pháp nhân)',
              icon: FileText,
              onSelect: () => onCreateContractForKoc(k),
            },
          ]
        : []),
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
      { label: hasLegalId(k) ? 'Đọc thêm giấy tờ pháp lý' : 'Đọc ảnh giấy tờ', icon: FileScan, onSelect: () => setOcrTarget(k) },
    ];
  };


  /* --------------------------------------------------------------- BẢNG 1: KOC CŨ KÈM LỊCH SỬ (COOPERATED) */

  const columnsCooperated: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'KOC & Liên hệ',
      width: 225,
      render: (k) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[235px]">
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
      key: 'history',
      header: 'Lịch sử hợp tác & PIC',
      width: 215,
      render: (k) => {
        const totalDeals = k.totalPastDeals || 1;
        const paid = k.totalPaidVideos ?? totalDeals;
        const foc = k.totalFocVideos ?? 0;
        const pic = (k.bookingPic || '').split('\n')[0];
        return (
          <div className="leading-tight min-w-0 max-w-[215px] space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-ink text-xs tabular-nums">
                {totalDeals} đợt book
              </span>
              <span className="text-2xs text-ink-3 tabular-nums">
                ({paid} Paid{foc > 0 ? ` · ${foc} FOC` : ''})
              </span>
            </div>
            <div className="text-2xs text-ink-2 truncate">
              {k.brandName ? <b className="text-ink">{k.brandName}</b> : 'Đa nhãn hàng'}
              {k.latestBookMonth ? ` · ${k.latestBookMonth}` : ''}
              {k.latestBoCode ? ` · ${k.latestBoCode}` : ''}
            </div>
            <div className="text-2xs text-ink-3 truncate" title={k.workedPicsList}>
              PIC: <span className="text-ink-2 font-medium">{pic || 'Chưa gán'}</span>
              {k.workedPicsCount && k.workedPicsCount > 1 ? ` (+${k.workedPicsCount - 1} PIC)` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'rateAndGmv',
      header: 'Đơn giá & Hiệu quả',
      align: 'right',
      width: 155,
      render: (k) => {
        const gmv = k.totalPastGmv || k.gmvBestCase || 0;
        const roi =
          k.historicalRoi ||
          (k.totalPastCost && k.totalPastCost > 0 ? gmv / k.totalPastCost : 0);
        const hasRange =
          k.minRate && k.maxRate && k.minRate > 0 && k.maxRate > k.minRate;
        const tooltip = hasRange
          ? `Biên độ giá: ${formatVndShort(k.minRate!)} – ${formatVndShort(k.maxRate!)}`
          : undefined;

        return (
          <div className="leading-tight text-right space-y-0.5" title={tooltip}>
            <div className="text-xs font-semibold text-ink tabular-nums">
              {k.rateCardVideo > 1 ? formatVndShort(k.rateCardVideo) : 'FOC / Hoa hồng'}
            </div>
            <div className="text-2xs tabular-nums">
              {gmv > 0 ? (
                <span className="text-positive font-medium">
                  GMV {formatVndShort(gmv)}
                  {roi > 0 ? ` · ROI ${roi.toFixed(1)}x` : ''}
                </span>
              ) : (
                <span className="text-ink-3">—</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'legalProfiles',
      header: 'Hồ sơ pháp lý',
      width: 175,
      render: (k) => {
        const profiles = getKocLegalProfiles(k);
        const dup = duplicates.get(k.id);
        const def = profiles.find((p) => p.isDefault) || profiles[0];
        const readiness = def ? evaluateLegalProfileContractReadiness(def, k) : null;
        const isSigned = def?.frameworkContractStatus === 'ĐÃ_KÝ';

        return (
          <div className="leading-tight space-y-0.5 min-w-0 max-w-[175px]">
            <div>
              {profiles.length === 0 ? (
                <Status tone="warning">Chưa có hồ sơ</Status>
              ) : dup ? (
                <span title={`Trùng: ${dup.map((d) => `${d.stageName} (${d.fields.join(', ')})`).join('; ')}`}>
                  <Status tone="warning">Nghi trùng</Status>
                </span>
              ) : isSigned ? (
                <Status tone="positive">Đã ký HĐNT</Status>
              ) : readiness && !readiness.ready ? (
                <span title={`Thiếu trường ký HĐ: ${readiness.missingFields.join(', ')}`}>
                  <Status tone="warning">Chưa đủ hồ sơ</Status>
                </span>
              ) : (
                <Status tone="positive">Đủ hồ sơ</Status>
              )}
            </div>
            {profiles.length > 0 && (
              <div
                className="text-2xs text-ink-2 truncate"
                title={profiles.map((p) => `${p.profileCode}: ${p.holderName} (${p.taxAccountType})`).join(' | ')}
              >
                <span>{def?.holderName || '—'}</span>
                {profiles.length > 1 && (
                  <span className="text-ink-3 ml-1">+{profiles.length - 1} HS</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'classification',
      header: 'Phân loại & MXH',
      width: 165,
      render: (k) => (
        <div className="leading-tight min-w-0 space-y-1">
          <div>
            <span className="block truncate font-medium text-ink text-xs">
              {k.kocCategory || 'Chưa phân ngành'}
            </span>
            <span className="block truncate text-2xs text-ink-3">
              {k.tepKenh || k.creatorCategory || ''}
              {k.salaryGrade ? ` · ${k.salaryGrade}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <span title="TikTok" className={hasKocPlatform(k, 'tiktok') ? 'opacity-100' : 'opacity-25'}>
              <TikTokLogo className="w-3.5 h-3.5" />
            </span>
            <button
              type="button"
              onClick={() => setSocialTarget(k)}
              title={k.shopeeChannel ? `Shopee: ${k.shopeeChannel}` : 'Tìm kênh MXH'}
              className={hasKocPlatform(k, 'shopee') ? 'opacity-100 cursor-pointer' : 'opacity-25 hover:opacity-60 cursor-pointer'}
            >
              <ShopeeLogo className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSocialTarget(k)}
              title={k.facebookChannel ? `Facebook: ${k.facebookChannel}` : 'Tìm kênh MXH'}
              className={hasKocPlatform(k, 'facebook') ? 'opacity-100 cursor-pointer' : 'opacity-25 hover:opacity-60 cursor-pointer'}
            >
              <FacebookLogo className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSocialTarget(k)}
              title={k.instagramChannel ? `Instagram: ${k.instagramChannel}` : 'Tìm kênh MXH'}
              className={hasKocPlatform(k, 'instagram') ? 'opacity-100 cursor-pointer' : 'opacity-25 hover:opacity-60 cursor-pointer'}
            >
              <InstagramLogo className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSocialTarget(k)}
              title={k.threadsChannel ? `Threads: ${k.threadsChannel}` : 'Tìm kênh MXH'}
              className={hasKocPlatform(k, 'threads') ? 'opacity-100 cursor-pointer' : 'opacity-25 hover:opacity-60 cursor-pointer'}
            >
              <ThreadsLogo className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 165,
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

  /* --------------------------------------------------------------- BẢNG 2: KOC MỚI / TIỀM NĂNG (NEW) */

  const columnsNew: Column<KocItem>[] = [
    {
      key: 'koc',
      header: 'Kênh KOC Mới & Nguồn',
      width: 225,
      render: (k) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-[235px]">
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
            <span className="block truncate text-2xs text-accent">
              {k.sourceSheet || 'KOC Tiềm năng ERD'}
              {k.appearancesCount && k.appearancesCount > 1 ? ` · Đề xuất ${k.appearancesCount} lần` : ''}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'channelMetrics',
      header: 'Chỉ số Kênh',
      align: 'right',
      width: 170,
      render: (k) => (
        <div className="leading-tight text-right space-y-0.5">
          <div className="text-xs font-semibold text-ink tabular-nums">
            {formatFollowers(k.followers)} flw · {formatFollowers(k.avgViews)} view TB
          </div>
          <div className="text-2xs text-positive font-medium tabular-nums">
            GMV 30d: {k.recentRevenue ? formatVndShort(k.recentRevenue) : '—'}
            {k.gpm ? ` · GPM ${formatVndShort(k.gpm)}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'classificationAndQuote',
      header: 'Phân loại & Báo giá dự kiến',
      width: 175,
      render: (k) => (
        <div className="leading-tight min-w-0 space-y-0.5">
          <span className="block truncate font-medium text-ink text-xs">
            {k.kocCategory || 'Chưa phân ngành'} · {k.tepKenh || 'Review Nữ'}
          </span>
          <span className="block truncate text-2xs text-ink-2">
            Khung dự kiến: <b>{k.salaryGrade}</b>
          </span>
          <span className="block truncate text-2xs font-semibold text-ink tabular-nums">
            {k.rateCardVideo > 0 ? `Báo giá: ${formatVndShort(k.rateCardVideo)}` : 'Chưa có báo giá'}
          </span>
        </div>
      ),
    },
    {
      key: 'proposedStores',
      header: 'Gian hàng đề xuất & PIC',
      width: 205,
      render: (k) => (
        <div className="leading-tight min-w-0 max-w-[205px] space-y-0.5">
          <span
            className="block truncate text-xs font-medium text-ink"
            title={k.proposedStores || k.brandName}
          >
            {k.proposedStores || k.brandName || 'Chưa gán gian hàng'}
          </span>
          <span className="block truncate text-2xs text-ink-3">
            PIC đề xuất: <b className="text-ink-2">{k.bookingPic || 'Chưa phân công'}</b>
          </span>
          {k.contentNote && (
            <span className="block truncate text-2xs text-ink-3" title={k.contentNote}>
              {k.contentNote}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'readinessAndContact',
      header: 'Độ sẵn sàng & Liên hệ',
      width: 200,
      render: (k) => {
        const rKey = k.bookingReadiness || 'CHỜ_TIẾP_CẬN';
        const rInfo = READINESS_LABEL[rKey];
        const isContacted =
          k.contactStatus === 'ĐÃ_LIÊN_HỆ' || k.contactStatus === 'ĐANG_THƯƠNG_LƯỢNG';
        return (
          <div className="grid gap-1 justify-items-start min-w-0 max-w-[200px]">
            <div className="flex flex-wrap items-center gap-1">
              <Status tone={rInfo.tone}>{rInfo.label}</Status>
              <span
                className={`px-1.5 py-0.5 rounded text-3xs font-semibold border ${
                  isContacted
                    ? 'bg-positive-soft text-positive border-positive/30'
                    : 'bg-sunken text-ink-3 border-line'
                }`}
              >
                {k.contactStatus === 'ĐANG_THƯƠNG_LƯỢNG'
                  ? 'Đang thương lượng'
                  : isContacted
                    ? 'Đã liên hệ'
                    : 'Chưa liên hệ'}
              </span>
            </div>
            {k.phone || k.email ? (
              <span className="text-2xs text-ink-2 truncate w-full font-mono">
                {[k.phone, k.email].filter(Boolean).join(' · ')}
              </span>
            ) : (
              <span className="text-2xs text-ink-3 truncate w-full">
                {k.missingFieldsDetail ? `Thiếu: ${k.missingFieldsDetail}` : 'Chưa có SĐT / Email'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 195,
      render: (k) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={PhoneCall}
            onClick={() => setOutreachTarget(k)}
          >
            Liên hệ
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => setSheetTargetKocs([k])}
          >
            Sheet
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
  const navList = openKoc && filtered.some((k) => k.id === openKoc.id) ? filtered : activeDataset;
  const navIndex = openKoc ? navList.findIndex((k) => k.id === openKoc.id) : -1;

  return (
    <div ref={rootRef} className="space-y-5 scroll-mt-4">
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
          onCreateContractForKoc={onCreateContractForKoc}
        />
      ) : (
        <>
          <PageActions>
            {onReturnToSource && returnToSourceLabel && (
              <Button size="sm" variant="secondary" icon={ArrowLeft} onClick={onReturnToSource}>
                {returnToSourceLabel}
              </Button>
            )}
            <ActionMenu
              label="Tiện ích danh bạ KOC"
              items={[
                {
                  label: 'Đồng bộ & Cấu hình UpAffiliate',
                  icon: RefreshCw,
                  onSelect: () => {
                    void reloadUpaffiliateState();
                    setUpaffiliateSyncOpen(true);
                  },
                },
                {
                  label: `Lịch sử đánh giá KOC (${channelReviews.length})`,
                  icon: History,
                  onSelect: () => openChannelReview(null, 'ALL_HISTORY'),
                },
                {
                  label: 'Video ID & API Tuần',
                  icon: FileSpreadsheet,
                  onSelect: () => setVideoRegistryOpen(true),
                },
              ]}
            />
            <Button
              size="sm"
              variant="secondary"
              icon={CloudDownload}
              onClick={() => {
                setScraperInitialHandle('');
                setScraperOpen(true);
              }}
            >
              Lấy dữ liệu TikTok
            </Button>
            <Button size="sm" variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Thêm KOC
            </Button>
          </PageActions>

          {/* Thanh chuyển đổi 2 Bảng dữ liệu KOC + Trạng thái kết nối UpAffiliate trên cùng 1 hàng */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="inline-flex items-center p-0.5 rounded-lg bg-sunken border border-line gap-1">
              <button
                type="button"
                onClick={() => {
                  setDatasetTab('COOPERATED');
                  resetFilters();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  datasetTab === 'COOPERATED'
                    ? 'bg-surface text-ink shadow-2xs border border-line'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>1. Bảng KOC Cũ kèm lịch sử</span>
                <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-2xs font-semibold tabular-nums">
                  {formatNumber(cooperatedKocs.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDatasetTab('NEW');
                  resetFilters();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  datasetTab === 'NEW'
                    ? 'bg-surface text-ink shadow-2xs border border-line'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-positive" />
                <span>2. Bảng KOC Mới / Tiềm năng</span>
                <span className="px-1.5 py-0.5 rounded bg-positive-soft text-positive text-2xs font-semibold tabular-nums">
                  {formatNumber(newKocs.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDatasetTab('UPAFFILIATE_HUB');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  datasetTab === 'UPAFFILIATE_HUB'
                    ? 'bg-surface text-ink shadow-2xs border border-line'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-accent" />
                <span>3. Quản lý Dữ liệu & Đồng bộ UpAffiliate</span>
                {stagingPendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-warning-soft text-warning text-2xs font-semibold tabular-nums">
                    {formatNumber(stagingPendingCount)}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Status tone={upaffiliateConfig.enabled ? 'positive' : 'neutral'}>
                {upaffiliateConfig.enabled ? 'UpAffiliate: Đã kết nối' : 'UpAffiliate: Tạm dừng'}
              </Status>
              <span className="text-ink-3 hidden xl:inline">
                Gần nhất: <span className="font-code text-ink-2">{formatSyncDateTime(upaffiliateConfig.lastSyncedAt)}</span>
              </span>
              {stagingPendingCount > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void openStagingQueueModal()}
                >
                  Bảng tạm ({stagingPendingCount})
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={RefreshCw}
                disabled={isUpaffiliateSyncing}
                onClick={() => void triggerUpaffiliateSync('INCREMENTAL', 'MANUAL_TRIGGER')}
              >
                {isUpaffiliateSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void reloadUpaffiliateState();
                  setUpaffiliateSyncOpen(true);
                }}
              >
                Cấu hình
              </Button>
            </div>
          </div>

          {datasetTab === 'UPAFFILIATE_HUB' ? (
            <UpaffiliateDataManagementPanel
              kocs={localKocs}
              syncConfig={upaffiliateConfig}
              syncLogs={upaffiliateLogs}
              isSyncing={isUpaffiliateSyncing}
              currentUserName={currentUser?.name}
              onRunSync={async (mode, triggerType) => {
                await triggerUpaffiliateSync(mode, triggerType || 'MANUAL_TRIGGER');
              }}
              onOpenSyncConfigModal={() => {
                void reloadUpaffiliateState();
                setUpaffiliateSyncOpen(true);
              }}
              onOpenVideoRegistryModal={() => setVideoRegistryOpen(true)}
              onOpenKocProfile={(kocId) => openFromList(kocId)}
              onNotify={onNotify}
            />
          ) : (
            <>
              {/* Thanh KPI chuyên biệt theo từng Bảng dữ liệu KOC */}
              {datasetTab === 'COOPERATED' ? (
                <StatRow>
                  <Stat
                    label="Tổng KOC Đã hợp tác (Master)"
                    value={`${formatNumber(cooperatedKocs.length)} KOC`}
                    note="Có lịch sử BO / Nghiệm thu thực tế tại Upbase"
                    tone="positive"
                  />
                  <Stat
                    label="Đủ hồ sơ pháp lý & Tài khoản"
                    value={`${formatNumber(datasetStats.coopWithDocs)} KOC`}
                    note="Đủ CCCD/MST & STK để ký HĐNT và thanh toán"
                  />
                  <Stat
                    label="KOC có >1 Hồ sơ pháp lý"
                    value={`${formatNumber(datasetStats.coopMultiLegal)} KOC`}
                    note="Chuyển đổi Cá nhân ↔ HKD ↔ Công ty/MCN"
                    tone="warning"
                  />
                  <Stat
                    label="Tổng GMV lịch sử tích lũy"
                    value={formatVndShort(datasetStats.coopTotalGmv)}
                    note={`Tổng chi phí Cast: ${formatVndShort(datasetStats.coopTotalCost)}`}
                    tone="positive"
                  />
                </StatRow>
              ) : (
                <StatRow>
                  <Stat
                    label="Tổng KOC Mới / Tiềm năng"
                    value={`${formatNumber(newKocs.length)} KOC`}
                    note="KOC chưa từng hợp tác (0 job hoàn thành)"
                    tone="positive"
                  />
                  <Stat
                    label="Sẵn sàng Booking ngay"
                    value={`${formatNumber(datasetStats.newReady)} KOC`}
                    note="Đã có sẵn định danh pháp lý & báo giá đề xuất"
                    tone="positive"
                  />
                  <Stat
                    label="Đã có SĐT / Zalo / Email"
                    value={`${formatNumber(datasetStats.newWithContact)} KOC`}
                    note={`Đã liên hệ tiếp cận: ${formatNumber(datasetStats.newContacted)} KOC`}
                  />
                  <Stat
                    label="Kênh tiềm năng traffic tốt"
                    value={`${formatNumber(datasetStats.newHighTraffic)} KOC`}
                    note="View TB ≥ 15.000 hoặc Follower ≥ 100K"
                  />
                </StatRow>
              )}

              <Panel flush>
                <div className="p-4 border-b border-line grid gap-2.5">
                  <FilterBar
                    search={{
                      value: search,
                      onChange: setSearch,
                      placeholder:
                        datasetTab === 'COOPERATED'
                          ? 'Tên kênh, @handle, Chủ TK, CCCD, MST, Mã BO, Brand...'
                          : 'Tên kênh mới, @handle, Gian hàng đề xuất, SĐT, Email...',
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
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          aria-label="PIC phụ trách"
                          className="w-auto"
                        >
                          <option value={ALL}>Mọi PIC phụ trách</option>
                          {options.pic.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </Select>
                        {datasetTab === 'COOPERATED' && (
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
                        )}
                        {isFiltered && (
                          <Button variant="ghost" onClick={resetFilters}>
                            Xóa bộ lọc
                          </Button>
                        )}
                      </>
                    }
                    resultCount={isFiltered ? filtered.length : undefined}
                    chips={
                      datasetTab === 'COOPERATED' ? (
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                          <Chips
                            label="Hồ sơ pháp lý (1–N)"
                            items={legalChips}
                            value={legal}
                            onChange={setLegal}
                          />
                          <Chips<IssueFilter>
                            label="Cần xử lý"
                            items={issueChips}
                            value={issue}
                            onChange={(k) => setIssue((cur) => (cur === k ? '' : k))}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                          <Chips
                            label="Độ sẵn sàng Booking"
                            items={readinessChips}
                            value={readiness}
                            onChange={setReadiness}
                          />
                          <Chips<NewIssueFilter>
                            label="Tiếp cận & Đánh giá"
                            items={newIssueChips}
                            value={newIssue}
                            onChange={(k) => setNewIssue((cur) => (cur === k ? '' : k))}
                          />
                        </div>
                      )
                    }
                  />
                </div>

                <DataTable
                  columns={datasetTab === 'COOPERATED' ? columnsCooperated : columnsNew}
                  rows={rows}
                  rowKey={(k) => k.id}
                  onRowClick={(k) => openFromList(k.id)}
                  compact
                  stickyLast
                  empty={
                    <EmptyState
                      title={
                        activeDataset.length === 0
                          ? 'Chưa có KOC nào trong bảng này'
                          : 'Không có KOC khớp bộ lọc'
                      }
                      description={
                        activeDataset.length === 0
                          ? 'Thêm KOC mới hoặc lấy dữ liệu từ TikTok để bắt đầu.'
                          : 'Bỏ bớt điều kiện lọc hoặc tìm bằng từ khóa khác.'
                      }
                      action={
                        activeDataset.length === 0 ? (
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
        </>
      )}

      {/* Hộp thoại Ghi nhận liên hệ & Chuyển trạng thái cho KOC Mới */}
      {outreachTarget && (
        <KocOutreachModal
          koc={outreachTarget}
          currentUserName={currentUser?.name || 'Chuyên viên Booking'}
          onClose={() => setOutreachTarget(null)}
          onSave={(updated, msg) => {
            applyUpdate(updated, msg);
            setOutreachTarget(null);
          }}
        />
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
          const tagged: KocItem = {
            ...newKoc,
            datasetType: newKoc.totalPastDeals && newKoc.totalPastDeals > 0 ? 'COOPERATED' : 'NEW',
            bookingReadiness:
              newKoc.cccd && newKoc.bankAccount
                ? 'SẴN_SÀNG_BOOKING'
                : newKoc.phone || newKoc.email
                  ? 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ'
                  : 'CHỜ_TIẾP_CẬN',
          };
          setLocalKocs((prev) => [tagged, ...prev]);
          onKocCreated?.(tagged);
          onNotify?.(`Đã thêm KOC ${tagged.stageName} vào danh bạ`, 'success');
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
          const taggedCreated = created.map((c) => ({
            ...c,
            datasetType: 'NEW' as const,
            bookingReadiness: (c.phone || c.email ? 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ' : 'CHỜ_TIẾP_CẬN') as KocBookingReadiness,
            sourceSheet: 'TikTok Scraper',
          }));
          setLocalKocs((prev) => {
            const updatedMap = new Map(updated.map((u) => [u.id, u]));
            const next = prev.map((k) => updatedMap.get(k.id) || k);
            return [...taggedCreated, ...next];
          });
          taggedCreated.forEach((c) => onKocCreated?.(c));
          updated.forEach((u) => onKocUpdated?.(u));

          if (taggedCreated.length > 0 && updated.length > 0) {
            onNotify?.(
              `Đã thêm ${taggedCreated.length} KOC mới (Bảng KOC Mới) và cập nhật ${updated.length} hồ sơ KOC từ TikTok`,
              'success',
            );
          } else if (taggedCreated.length > 0) {
            setDatasetTab('NEW');
            onNotify?.(`Đã thêm ${taggedCreated.length} KOC mới từ TikTok vào Bảng KOC Mới / Tiềm năng`, 'success');
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

      <KocVideoHistoryRegistryModal
        open={videoRegistryOpen}
        onClose={() => setVideoRegistryOpen(false)}
        initialTab="NEW_VIDEO"
        onSuccess={(res) => {
          if (res.newKoc) {
            setLocalKocs((prev) => [res.newKoc!, ...prev]);
            onKocCreated?.(res.newKoc);
          }
          onNotify?.(res.message, 'success');
        }}
      />

      <UpaffiliateSyncModal
        open={upaffiliateSyncOpen}
        onClose={() => setUpaffiliateSyncOpen(false)}
        kocs={localKocs}
        config={upaffiliateConfig}
        logs={upaffiliateLogs}
        stagingPendingCount={stagingPendingCount}
        isSyncing={isUpaffiliateSyncing}
        onRunSync={async (mode) => {
          await triggerUpaffiliateSync(mode, 'MANUAL_TRIGGER');
        }}
        onSaveConfig={async (patch) => {
          await updateUpaffiliateConfig(patch);
          onNotify?.('Đã lưu cấu hình lịch đồng bộ định kỳ UpAffiliate', 'success');
        }}
        onOpenStagingModal={() => {
          setUpaffiliateSyncOpen(false);
          void openStagingQueueModal();
        }}
      />

      <PendingKocStagingModal
        open={stagingModalOpen}
        onClose={() => setStagingModalOpen(false)}
        stagingItems={stagingItems}
        onRemoveItem={async (channelId) => {
          await fetch(
            `/api/integrations/upaffiliate/staging?channelId=${encodeURIComponent(channelId)}`,
            { method: 'DELETE' },
          );
          const refreshed = await fetchStagingKocs();
          setStagingItems(refreshed);
          await reloadUpaffiliateState();
        }}
        onExportToUpaffiliate={async () => {
          await triggerUpaffiliateSync('PUSH_PENDING', 'STAGING_PUSH');
          const refreshed = await fetchStagingKocs();
          setStagingItems(refreshed);
          setStagingModalOpen(false);
        }}
        onNotify={onNotify}
      />
    </div>
  );
};

/* =========================================================================
   MODAL GHI LỊCH SỬ LIÊN HỆ & CHUYỂN TRẠNG THÁI KOC MỚI (THEO ĐẶC TẢ QUẢN LÝ KOC)
   ========================================================================= */

function KocOutreachModal({
  koc,
  currentUserName,
  onClose,
  onSave,
}: {
  koc: KocItem;
  currentUserName: string;
  onClose: () => void;
  onSave: (updated: KocItem, message: string) => void;
}) {
  const [contactStatus, setContactStatus] = useState<
    'ĐÃ_LIÊN_HỆ' | 'CHƯA_LIÊN_HỆ' | 'ĐANG_THƯƠNG_LƯỢNG' | 'TỪ_CHỐI'
  >(koc.contactStatus || 'ĐÃ_LIÊN_HỆ');
  const [bookingReadiness, setBookingReadiness] = useState<KocBookingReadiness>(
    koc.bookingReadiness || 'TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ',
  );
  const [phone, setPhone] = useState(koc.phone || '');
  const [email, setEmail] = useState(koc.email || '');
  const [rateCardVideo, setRateCardVideo] = useState<number>(koc.rateCardVideo || 0);
  const [shippingAddress, setShippingAddress] = useState(koc.shippingAddress || '');
  const [channel, setChannel] = useState<'Zalo' | 'TikTok DM' | 'Email' | 'Điện thoại' | 'Lark'>('Zalo');
  const [summary, setSummary] = useState('');
  const [promoteToCooperated, setPromoteToCooperated] = useState(false);

  const history = koc.contactHistory || [];

  const handleConfirm = () => {
    const nowStr = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const nextHistory: KocContactLogItem[] = summary.trim()
      ? [
          {
            id: `cl-${Date.now()}`,
            contactedAt: nowStr,
            picName: currentUserName,
            channel,
            summary: summary.trim(),
            outcome:
              contactStatus === 'ĐANG_THƯƠNG_LƯỢNG'
                ? 'ĐỒNG_Ý_BÁO_GIÁ'
                : contactStatus === 'TỪ_CHỐI'
                  ? 'TỪ_CHỐI'
                  : 'ĐÃ_PHẢN_HỒI',
          },
          ...history,
        ]
      : history;

    const updated: KocItem = {
      ...koc,
      phone: phone.trim() || undefined,
      zalo: phone.trim() || koc.zalo,
      email: email.trim() || undefined,
      rateCardVideo: Number(rateCardVideo) || 0,
      shippingAddress: shippingAddress.trim() || undefined,
      contactStatus,
      bookingReadiness,
      contactHistory: nextHistory,
      datasetType: promoteToCooperated ? 'COOPERATED' : koc.datasetType,
      totalPastDeals: promoteToCooperated ? Math.max(1, koc.totalPastDeals || 0) : koc.totalPastDeals,
    };
    syncKocContactToStaffSheets(updated);
    onSave(
      updated,
      promoteToCooperated
        ? `Đã chuyển KOC ${koc.stageName} sang Bảng 1 (KOC Đã hợp tác)`
        : `Đã lưu thông tin liên hệ cho KOC ${koc.stageName}`,
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ghi lịch sử liên hệ & Tiếp cận KOC mới — @${koc.channelId.replace(/^@/, '')}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={promoteToCooperated}
              onChange={(e) => setPromoteToCooperated(e.target.checked)}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <span className="font-medium">
              Chốt hợp tác — Chuyển sang Bảng 1 (KOC Cũ kèm lịch sử)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" icon={Check} onClick={handleConfirm}>
              Lưu thông tin tiếp cận
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Trạng thái liên hệ">
            <Select
              value={contactStatus}
              onChange={(e) =>
                setContactStatus(
                  e.target.value as 'ĐÃ_LIÊN_HỆ' | 'CHƯA_LIÊN_HỆ' | 'ĐANG_THƯƠNG_LƯỢNG' | 'TỪ_CHỐI',
                )
              }
              className="w-full"
            >
              <option value="CHƯA_LIÊN_HỆ">Chưa liên hệ</option>
              <option value="ĐÃ_LIÊN_HỆ">Đã liên hệ</option>
              <option value="ĐANG_THƯƠNG_LƯỢNG">Đang thương lượng báo giá</option>
              <option value="TỪ_CHỐI">KOC từ chối</option>
            </Select>
          </Field>

          <Field label="Độ sẵn sàng Booking">
            <Select
              value={bookingReadiness}
              onChange={(e) => setBookingReadiness(e.target.value as KocBookingReadiness)}
              className="w-full"
            >
              <option value="SẴN_SÀNG_BOOKING">Sẵn sàng booking ngay</option>
              <option value="TIẾP_CẬN_BỔ_SUNG_PHÁP_LÝ">Có liên hệ · Bổ sung pháp lý</option>
              <option value="CẦN_XIN_LIÊN_HỆ">Cần xin SĐT/Zalo</option>
              <option value="CHỜ_TIẾP_CẬN">Chờ tiếp cận</option>
            </Select>
          </Field>

          <Field label="Kênh liên hệ">
            <Select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as 'Zalo' | 'TikTok DM' | 'Email' | 'Điện thoại' | 'Lark')
              }
              className="w-full"
            >
              <option value="Zalo">Zalo</option>
              <option value="TikTok DM">TikTok DM</option>
              <option value="Email">Email</option>
              <option value="Điện thoại">Điện thoại</option>
              <option value="Lark">Lark</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="SĐT / Zalo thu thập được">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09..."
            />
          </Field>

          <Field label="Email làm việc">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenkoc@gmail.com"
            />
          </Field>

          <Field label="Báo giá 1 Video KOC phản hồi (VNĐ)">
            <Input
              type="number"
              value={rateCardVideo}
              onChange={(e) => setRateCardVideo(Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        <Field label="Địa chỉ nhận mẫu sản phẩm (nếu đã xin được)">
          <Input
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
          />
        </Field>

        <Field label="Nội dung ghi chú lần liên hệ này">
          <Textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="VD: Đã nhắn Zalo gửi brief Kutieskin, KOC báo giá 2.5tr/video, nhận hàng mẫu tại Hà Nội..."
          />
        </Field>

        {history.length > 0 && (
          <div className="pt-2 border-t border-line space-y-2">
            <div className="font-semibold text-ink">Lịch sử liên hệ trước đó ({history.length})</div>
            <div className="max-h-36 overflow-y-auto space-y-1.5">
              {history.map((h) => (
                <div key={h.id} className="p-2 rounded-lg border border-line bg-sunken/40 text-2xs space-y-0.5">
                  <div className="flex items-center justify-between font-medium text-ink">
                    <span>
                      {h.picName} · qua {h.channel}
                    </span>
                    <span className="text-ink-3 tabular-nums">{h.contactedAt}</span>
                  </div>
                  <div className="text-ink-2">{h.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
