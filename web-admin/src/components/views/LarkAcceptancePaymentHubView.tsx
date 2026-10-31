'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  QrCode,
  RefreshCw,
  Send,
} from 'lucide-react';
import type {
  BookingDealItem,
  Contributor,
  InputPlanBreakdownState,
  KocItem,
  StorePortfolioItem,
  UserProfile,
  UserRole,
} from '../../lib/types';
import type { ContractRecord } from '../../lib/contracts/types';
import { contractApi, type ContractBootstrap } from '../contracts/api';
import { FinanceAdvancePaymentReportView } from '../contracts/FinanceAdvancePaymentReportView';
import { LarkPaymentRequestModal } from '../booking/LarkPaymentRequestModal';
import {
  buildBookingDealFromApprovedItem,
  hydrateApprovedBookingListFromServer,
  isLivestreamBookingItem,
  loadApprovedBookingList,
  saveApprovedBookingList,
  type ApprovedBookingListItem,
} from '../../lib/approvedBookingList';
import {
  buildBookingDealFromMultiPlatformItem,
  loadMultiPlatformListingItems,
  MULTI_PLATFORM_CONFIGS,
  saveMultiPlatformListingItems,
  type MultiPlatformListingItem,
} from '../../lib/multiPlatformListing';
import {
  buildLarkPaymentRequestSlip,
  loadLarkPaymentSlipsFromStorage,
  saveLarkPaymentSlipsToStorage,
  type LarkPaymentRequestSlip,
  type PaymentRequestType,
} from '../../lib/larkPaymentRequestEngine';
import {
  evaluateSelfJobForPaymentSlip,
  SELF_PAYMENT_CATEGORY,
  selfSlipDealCode,
} from '../../lib/selfChannelPaymentSlip';
import { SELF_FORMAT_LABEL } from '../../lib/selfChannelBoardRules';
import type { HubJob } from './self-channel/SelfChannelMonthPanels';
import { formatDate, formatVnd, maskSensitivePii } from '../../lib/format';
import { filterScopedStores, isStaffGlobalAdminOrManager } from '../../lib/rbacScope';
import {
  Button,
  Chips,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Modal,
  PageActions,
  Pagination,
  Panel,
  Segmented,
  Select,
  Stat,
  StatRow,
  Status,
  Tabs,
  type Column,
  type StatusTone,
} from '../ui';

export type BookingSourceSubsystem =
  | 'ALL'
  | 'TIKTOK_KOC_32'
  | 'MULTI_PLATFORM'
  | 'SELF_CHANNEL_CTV'
  | 'LIVESTREAM_DEAL';

export type BookingServiceFilterKey =
  | 'ALL'
  | 'TIKTOK_VIDEO_ONLY'
  | 'COMBO_VIDEO_ADDONS'
  | 'ADS_CODE'
  | 'IMAGE_USAGE'
  | 'EXCLUSIVITY'
  | 'LINK_BIO_CART'
  | 'MULTI_PLATFORM_POST'
  | 'LIVESTREAM_SESSION'
  | 'SELF_CHANNEL_VIDEO';

export type PaymentModeFilterKey =
  | 'ALL'
  | 'SETTLEMENT'
  | 'ADVANCE'
  | 'ADVANCE_PENDING'
  | 'SETTLEMENT_WITH_ADVANCE';

export const BOOKING_SERVICE_FILTER_OPTIONS: Array<{
  key: BookingServiceFilterKey;
  label: string;
}> = [
  { key: 'ALL', label: 'Tất cả dịch vụ' },
  { key: 'TIKTOK_VIDEO_ONLY', label: 'Video TikTok' },
  { key: 'COMBO_VIDEO_ADDONS', label: 'Combo Video + Quyền phụ' },
  { key: 'ADS_CODE', label: 'Mã Spark Ads' },
  { key: 'IMAGE_USAGE', label: 'Bản quyền hình ảnh / video' },
  { key: 'EXCLUSIVITY', label: 'Độc quyền ngành hàng' },
  { key: 'LINK_BIO_CART', label: 'Gắn Link Bio / Giỏ hàng' },
  { key: 'MULTI_PLATFORM_POST', label: 'Đăng bài đa sàn' },
  { key: 'LIVESTREAM_SESSION', label: 'Phiên Livestream' },
  { key: 'SELF_CHANNEL_VIDEO', label: 'Video Kênh Brand' },
];

type HubMainTab = 'UNIFIED_QUEUE' | 'LARK_SLIPS' | 'FINANCE_RECON';

type QueueStageFilter =
  | 'ALL'
  | 'READY_TO_PUSH'
  | 'PENDING_ACCEPTANCE'
  | 'HARD_BLOCKED'
  | 'IN_LARK_FLOW'
  | 'PAID_DONE';

type SlipStatusFilter =
  | 'ALL'
  | 'PENDING_APPROVAL'
  | 'APPROVED_WAIT_PAY'
  | 'PAID_UNC'
  | 'REJECTED';

export interface UnifiedAcceptancePaymentItem {
  id: string;
  code: string;
  jobCode: string;
  subsystem: Exclude<BookingSourceSubsystem, 'ALL'>;
  subsystemLabel: string;
  platformLabel: string;
  serviceKeys: Exclude<BookingServiceFilterKey, 'ALL'>[];
  serviceTags: string[];
  hasAdvanceOption: boolean;
  paymentScheduleLabel: string;
  month: string;
  brandName: string;
  storeName: string;
  productName: string;
  picName: string;
  leaderName?: string;
  partnerId?: string;
  partnerName: string;
  partnerHandle: string;
  subjectLabel: string;
  legalId: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  airLink: string;
  airedAt: string;
  sparkAdsOrAffLink: string;
  contractSummary: string;
  bbntSummary: string;
  isAcceptedTech: boolean;
  isDataLocked: boolean;
  agreedNetAmount: number;
  grossAmount: number;
  taxAmount: number;
  advancePaidAmount: number;
  netTransferAmount: number;
  canPushLarkSlip: boolean;
  blockingIssues: string[];
  lark32Synced: boolean;
  lark32RecordId?: string;
  advanceSlip?: LarkPaymentRequestSlip;
  settlementSlip?: LarkPaymentRequestSlip;
  paymentState: 'PENDING_ACCEPTANCE' | 'HARD_BLOCKED' | 'READY_TO_PUSH' | 'IN_LARK_FLOW' | 'PAID_DONE';
  paymentStateLabel: string;
  paymentStateTone: StatusTone;
  rawDeal?: BookingDealItem;
  rawApprovedItem?: ApprovedBookingListItem;
  rawMultiPlatformItem?: MultiPlatformListingItem;
  rawSelfJob?: HubJob;
}

interface LarkIntegrationStatusConfig {
  domain: string;
  appToken: string;
  paymentTableId: string;
  approvalDefCode: string;
  hasLiveApprovalDef: boolean;
  hasAnycrossWebhook: boolean;
}

const APPROVAL_STATUS_META: Record<
  LarkPaymentRequestSlip['larkSync']['approvalStatus'],
  { label: string; tone: StatusTone }
> = {
  PENDING_LEADER: { label: 'Chờ Trưởng nhóm duyệt', tone: 'info' },
  PENDING_DIRECTOR: { label: 'Chờ Giám đốc MKT duyệt', tone: 'info' },
  PENDING_FINANCE: { label: 'Chờ Kế toán duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt · Chờ đi tiền', tone: 'warning' },
  PAID: { label: 'Đã đi tiền UNC', tone: 'positive' },
  REJECTED: { label: 'Từ chối / Cần sửa', tone: 'critical' },
};

const SUBSYSTEM_BADGE_META: Record<
  Exclude<BookingSourceSubsystem, 'ALL'>,
  { label: string; tone: StatusTone }
> = {
  TIKTOK_KOC_32: { label: 'Booking KOC TikTok (3.2)', tone: 'info' },
  MULTI_PLATFORM: { label: 'Đa nền tảng (Shopee/FB/IG/THR)', tone: 'neutral' },
  SELF_CHANNEL_CTV: { label: 'Video Kênh Brand & CTV', tone: 'positive' },
  LIVESTREAM_DEAL: { label: 'Booking Livestream / Kế hoạch', tone: 'warning' },
};

function extractApprovedItemServices(
  it: ApprovedBookingListItem,
  linkedDeal: BookingDealItem,
  isLivestream: boolean
): {
  serviceKeys: Exclude<BookingServiceFilterKey, 'ALL'>[];
  serviceTags: string[];
} {
  const keys = new Set<Exclude<BookingServiceFilterKey, 'ALL'>>();
  const tags: string[] = [];

  if (isLivestream) {
    keys.add('LIVESTREAM_SESSION');
    tags.push('Phiên Livestream');
  }

  const allAddons = [
    ...(it.addonServices || []),
    ...(linkedDeal.rightsTerms || []),
    ...(it.dealJobs || []).flatMap(j => j.addonServices || []),
    ...(linkedDeal.dealJobs || []).flatMap(j => j.addonServices || []),
  ].filter(a => a && a.acceptanceStatus !== 'DROPPED');

  const hasSparkAds =
    Boolean((it.sparkAdsCode || linkedDeal.sparkAdsCode || '').trim()) ||
    allAddons.some(a => a.termType === 'ADS_CODE');
  const hasImageUsage = allAddons.some(a => a.termType === 'IMAGE_USAGE');
  const hasExclusivity = allAddons.some(a => a.termType === 'EXCLUSIVITY');
  const hasLinkBioCart = allAddons.some(a => a.termType === 'LINK_BIO_CART');
  const hasCrossPost = allAddons.some(a => a.termType === 'CROSS_POST_REUP');

  if (!isLivestream) {
    tags.push('Video TikTok');
  }
  if (hasSparkAds) {
    keys.add('ADS_CODE');
    tags.push('Mã Spark Ads');
  }
  if (hasImageUsage) {
    keys.add('IMAGE_USAGE');
    tags.push('Bản quyền ảnh/video');
  }
  if (hasExclusivity) {
    keys.add('EXCLUSIVITY');
    tags.push('Độc quyền');
  }
  if (hasLinkBioCart) {
    keys.add('LINK_BIO_CART');
    tags.push('Gắn Link / Giỏ hàng');
  }
  if (hasCrossPost) {
    keys.add('MULTI_PLATFORM_POST');
    tags.push('Đăng chéo đa sàn');
  }

  const hasAnyAddons =
    allAddons.length > 0 ||
    it.dealStructureType === 'VIDEO_AND_ADDONS' ||
    (it.addonServicesNetCost || 0) > 0 ||
    hasImageUsage ||
    hasExclusivity ||
    hasLinkBioCart ||
    hasCrossPost;

  if (!isLivestream) {
    if (hasAnyAddons) {
      keys.add('COMBO_VIDEO_ADDONS');
    } else {
      keys.add('TIKTOK_VIDEO_ONLY');
    }
  }

  return {
    serviceKeys: Array.from(keys),
    serviceTags: tags,
  };
}

function inferSlipSubsystem(slip: LarkPaymentRequestSlip): Exclude<BookingSourceSubsystem, 'ALL'> {
  if (slip.larkPaymentCategory === SELF_PAYMENT_CATEGORY || (slip.selfJobRefs && slip.selfJobRefs.length > 0)) {
    return 'SELF_CHANNEL_CTV';
  }
  if (slip.larkPaymentCategory?.includes('Livestream')) {
    return 'LIVESTREAM_DEAL';
  }
  const firstCode = (slip.lineItems[0]?.dealCode || '').toUpperCase();
  if (/^BO\d{4}-(THR|FB|SHP|IG)-/.test(firstCode) || firstCode.startsWith('MP-DEAL-')) {
    return 'MULTI_PLATFORM';
  }
  return 'TIKTOK_KOC_32';
}

function formatPartnerHandle(val: string, allowFull: boolean): string {
  const trimmed = (val || '').trim();
  if (!trimmed || trimmed === '—') return '—';
  if (allowFull) return trimmed;
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!trimmed.startsWith('@') && !trimmed.startsWith('http') && digitsOnly.length >= 8) {
    return maskSensitivePii(trimmed);
  }
  return trimmed;
}

function canUserActOnSlipStep(
  slip: LarkPaymentRequestSlip,
  role?: UserRole,
  user?: UserProfile | null,
  userName?: string
): boolean {
  if (isStaffGlobalAdminOrManager(user)) return true;
  if (role === 'ADMIN') return true;
  const st = slip.larkSync.approvalStatus;
  if (st === 'PENDING_LEADER') {
    if (role === 'MANAGER') return true;
    if (role === 'LEADER') {
      const expectedLeader = (slip.approvalRoute.bookingLeaderName || '').trim().toLowerCase();
      const actorName = (user?.name || userName || '').trim().toLowerCase();
      return (
        !expectedLeader ||
        !actorName ||
        actorName.includes(expectedLeader) ||
        expectedLeader.includes(actorName)
      );
    }
    return false;
  }
  if (st === 'PENDING_DIRECTOR') {
    return role === 'MANAGER';
  }
  if (st === 'PENDING_FINANCE' || st === 'APPROVED') {
    return role === 'FINANCE' || Boolean(user?.permissions?.includes('canApprovePayment'));
  }
  return false;
}

export interface LarkAcceptancePaymentHubViewProps {
  currentUser?: UserProfile | null;
  currentRole?: UserRole;
  currentUserName: string;
  deals: BookingDealItem[];
  kocs: KocItem[];
  stores: StorePortfolioItem[];
  monthlyPlans: InputPlanBreakdownState[];
  contributors?: Contributor[];
  onCreateOrUpdateDeals?: (updatedDeals: BookingDealItem[]) => void;
  onOpenContractForDeal?: (deal: BookingDealItem, doc?: 'HDNT' | 'SOW' | 'BBNT') => void;
  onNavigateSourceModule?: (
    subsystem: Exclude<BookingSourceSubsystem, 'ALL'>,
    context?: { storeName?: string; monthKey?: string; dealCode?: string; planId?: string }
  ) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const LarkAcceptancePaymentHubView: React.FC<LarkAcceptancePaymentHubViewProps> = ({
  currentUser,
  currentRole,
  currentUserName,
  deals,
  kocs,
  stores,
  monthlyPlans,
  contributors = [],
  onCreateOrUpdateDeals,
  onOpenContractForDeal,
  onNavigateSourceModule,
  onNotify,
}) => {
  const [mainTab, setMainTab] = useState<HubMainTab>('UNIFIED_QUEUE');
  const [subsystemFilter, setSubsystemFilter] = useState<BookingSourceSubsystem>('ALL');
  const [bookingServiceFilter, setBookingServiceFilter] = useState<BookingServiceFilterKey>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentModeFilterKey>('ALL');
  const [queueFilter, setQueueFilter] = useState<QueueStageFilter>('ALL');
  const [slipFilter, setSlipFilter] = useState<SlipStatusFilter>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [queuePage, setQueuePage] = useState<number>(1);
  const [slipPage, setSlipPage] = useState<number>(1);
  const pageSize = 20;

  const canRevealPii = useMemo(
    () =>
      isStaffGlobalAdminOrManager(currentUser) ||
      Boolean(currentRole && ['FINANCE', 'LEGAL', 'ADMIN', 'MANAGER'].includes(currentRole)) ||
      Boolean(currentUser?.permissions?.includes('canApprovePayment')),
    [currentRole, currentUser]
  );
  const [revealPii, setRevealPii] = useState<boolean>(false);

  useEffect(() => {
    const onSubView = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: string; subView?: string }>).detail;
      if (detail?.tab !== 'lark-settlement') return;
      if (
        detail.subView === 'UNIFIED_QUEUE' ||
        detail.subView === 'LARK_SLIPS' ||
        detail.subView === 'FINANCE_RECON'
      ) {
        setMainTab(detail.subView);
        setQueuePage(1);
        setSlipPage(1);
      }
    };
    window.addEventListener('upbase-sidebar-subview', onSubView);
    return () => window.removeEventListener('upbase-sidebar-subview', onSubView);
  }, []);

  const [approvedItems, setApprovedItems] = useState<ApprovedBookingListItem[]>(() =>
    loadApprovedBookingList(kocs, stores, deals, currentUserName)
  );
  const [multiPlatformItems, setMultiPlatformItems] = useState<MultiPlatformListingItem[]>(() =>
    loadMultiPlatformListingItems(monthlyPlans, kocs)
  );
  const [selfJobs, setSelfJobs] = useState<HubJob[]>([]);
  const [slips, setSlips] = useState<LarkPaymentRequestSlip[]>([]);
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);
  const [larkConfig, setLarkConfig] = useState<LarkIntegrationStatusConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [larkModalState, setLarkModalState] = useState<{
    open: boolean;
    initialDeals: BookingDealItem[];
    requestType?: PaymentRequestType;
  }>({ open: false, initialDeals: [] });

  const [detailQueueItem, setDetailQueueItem] =
    useState<UnifiedAcceptancePaymentItem | null>(null);
  const [detailSlip, setDetailSlip] = useState<LarkPaymentRequestSlip | null>(null);
  const [uncInputs, setUncInputs] = useState<Record<string, string>>({});
  const [rejectSlipTarget, setRejectSlipTarget] = useState<LarkPaymentRequestSlip | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>(
    'Cần bổ sung chứng từ nghiệm thu hoặc kiểm tra lại thông tin tài khoản thụ hưởng'
  );

  const handleNavigateToBookingDetail = useCallback(
    (item: UnifiedAcceptancePaymentItem) => {
      if (!onNavigateSourceModule) return;
      onNavigateSourceModule(item.subsystem, {
        storeName: item.storeName,
        monthKey: item.month,
        dealCode: item.code,
        planId: item.rawSelfJob?.planId,
      });
    },
    [onNavigateSourceModule]
  );

  const scopedStores = useMemo(() => {
    const base = stores.filter(s => s.isB2cManaged !== false && s.storeName);
    if (currentUser) {
      const scoped = filterScopedStores(base, currentUser);
      if (
        scoped.length > 0 ||
        (currentRole && !['ADMIN', 'MANAGER', 'FINANCE', 'LEGAL'].includes(currentRole))
      ) {
        return scoped;
      }
    }
    return base;
  }, [stores, currentUser, currentRole]);

  const scopedStoreNameSet = useMemo(
    () => new Set(scopedStores.map(s => s.storeName.trim().toLowerCase())),
    [scopedStores]
  );

  const reloadAllSources = useCallback(async () => {
    setLoading(true);
    try {
      const localApproved = loadApprovedBookingList(kocs, stores, deals, currentUserName);
      setApprovedItems(localApproved);
      const localMp = loadMultiPlatformListingItems(monthlyPlans, kocs);
      setMultiPlatformItems(localMp);
      const localSlips = loadLarkPaymentSlipsFromStorage();
      if (localSlips.length > 0) setSlips(localSlips);

      const [serverApproved, paymentRes, selfRes, contractsRes] = await Promise.all([
        hydrateApprovedBookingListFromServer(kocs, stores, deals).catch(() => null),
        fetch('/api/integrations/larkbase/payment-requests', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/self-channel-board?all=1', { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null),
        contractApi<ContractBootstrap>('/api/contracts').catch(() => null),
      ]);

      if (Array.isArray(serverApproved) && serverApproved.length > 0) {
        setApprovedItems(serverApproved);
      }
      if (paymentRes) {
        if (paymentRes.config) setLarkConfig(paymentRes.config);
        if (Array.isArray(paymentRes.slips)) {
          const mergedMap = new Map<string, LarkPaymentRequestSlip>();
          localSlips.forEach(s => mergedMap.set(s.slipCode.toUpperCase(), s));
          paymentRes.slips.forEach((s: LarkPaymentRequestSlip) =>
            mergedMap.set(s.slipCode.toUpperCase(), s)
          );
          const mergedSlips = Array.from(mergedMap.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
          );
          setSlips(mergedSlips);
          saveLarkPaymentSlipsToStorage(mergedSlips);
        }
      }
      if (selfRes && Array.isArray(selfRes.jobs)) {
        setSelfJobs(selfRes.jobs);
      }
      if (contractsRes && Array.isArray(contractsRes.records)) {
        setContractRecords(contractsRes.records);
      }
    } finally {
      setLoading(false);
    }
  }, [kocs, stores, deals, currentUserName, monthlyPlans]);

  useEffect(() => {
    void reloadAllSources();
  }, [reloadAllSources]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onApprovedUpdated = () => {
      setApprovedItems(loadApprovedBookingList(kocs, stores, deals, currentUserName));
    };
    const onMpUpdated = () => {
      setMultiPlatformItems(loadMultiPlatformListingItems(monthlyPlans, kocs));
    };
    window.addEventListener('upbase:approved-booking-list-updated', onApprovedUpdated);
    window.addEventListener('upbase:multi-platform-listings-updated', onMpUpdated);
    return () => {
      window.removeEventListener('upbase:approved-booking-list-updated', onApprovedUpdated);
      window.removeEventListener('upbase:multi-platform-listings-updated', onMpUpdated);
    };
  }, [kocs, stores, deals, currentUserName, monthlyPlans]);

  // Index O(1) cho Phiếu Lark theo mã Deal/Job và mã Phiếu (RULE-PERF-01)
  const slipsIndex = useMemo(() => {
    const advanceByCode = new Map<string, LarkPaymentRequestSlip>();
    const settlementByCode = new Map<string, LarkPaymentRequestSlip>();
    const slipBySlipCode = new Map<string, LarkPaymentRequestSlip>();
    for (const s of slips) {
      if (s.slipCode) {
        slipBySlipCode.set(s.slipCode.trim().toUpperCase(), s);
      }
      for (const li of s.lineItems || []) {
        const key = (li.dealCode || '').trim().toUpperCase();
        if (!key) continue;
        if (s.requestType === 'ADVANCE') {
          if (!advanceByCode.has(key)) advanceByCode.set(key, s);
        } else {
          if (!settlementByCode.has(key)) settlementByCode.set(key, s);
        }
      }
    }
    return { advanceByCode, settlementByCode, slipBySlipCode };
  }, [slips]);

  const contributorById = useMemo(() => {
    const map = new Map<string, Contributor>();
    for (const c of contributors) {
      map.set(c.id, c);
    }
    return map;
  }, [contributors]);

  const dealByCodeMap = useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of deals) {
      if (d.dealCode) map.set(d.dealCode.trim().toUpperCase(), d);
    }
    return map;
  }, [deals]);

  // Index O(1) cho KOC theo ID và handle để tránh quét O(N * M) trong unifiedItems (RULE-PERF-01)
  const kocLookup = useMemo(() => {
    const byId = new Map<string, KocItem>();
    const byHandle = new Map<string, KocItem>();
    for (const k of kocs) {
      if (k.id) byId.set(k.id, k);
      if (k.channelId) {
        byHandle.set(k.channelId.replace(/^@/, '').trim().toLowerCase(), k);
      }
    }
    return { byId, byHandle };
  }, [kocs]);

  // Hợp nhất dữ liệu 4 phân hệ Booking vào 1 danh sách chuẩn duy nhất (RULE-SYNC-01 & RULE-PERF-01)
  const unifiedItems = useMemo<UnifiedAcceptancePaymentItem[]>(() => {
    const list: UnifiedAcceptancePaymentItem[] = [];
    const seenDealCodes = new Set<string>();

    // 1. Phân hệ Booking KOC TikTok - Bảng 3.2 (ApprovedBookingListItem)
    for (const it of approvedItems) {
      if (!it.bookingOrderCreated || !it.maBooking) continue;
      if (
        scopedStoreNameSet.size > 0 &&
        it.storeName &&
        !scopedStoreNameSet.has(it.storeName.trim().toLowerCase())
      ) {
        continue;
      }
      const code = it.maBooking.trim();
      const upper = code.toUpperCase();
      seenDealCodes.add(upper);

      const linkedDeal =
        dealByCodeMap.get(upper) || buildBookingDealFromApprovedItem(it);
      const cleanHandle = (linkedDeal.kocChannelId || it.idKenh || '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase();
      const matchedKoc =
        (linkedDeal.kocId && kocLookup.byId.get(linkedDeal.kocId)) ||
        (it.kocId && kocLookup.byId.get(it.kocId)) ||
        (cleanHandle ? kocLookup.byHandle.get(cleanHandle) : undefined);
      const evalResult = buildLarkPaymentRequestSlip({
        requestType: 'SETTLEMENT',
        deals: [linkedDeal],
        kocs: matchedKoc ? [matchedKoc] : [],
        createdBy: currentUserName,
        month: it.thangNghiemThuChot || it.thangPlan || '2026/10',
      });
      const line = evalResult.lineItems[0];
      const advSlip = slipsIndex.advanceByCode.get(upper);
      const setSlip = slipsIndex.settlementByCode.get(upper);

      const isPaid = Boolean(
        it.daDiTien ||
          setSlip?.larkSync.daDiTien ||
          setSlip?.larkSync.approvalStatus === 'PAID' ||
          it.trangThaiPhieuThanhToan === 'Đã thanh toán'
      );
      const isAdvancePendingInLark = Boolean(
        advSlip &&
          advSlip.larkSync.approvalStatus !== 'REJECTED' &&
          advSlip.larkSync.approvalStatus !== 'PAID' &&
          !advSlip.larkSync.daDiTien
      );
      const inLarkFlow = Boolean(
        !isPaid &&
          ((setSlip && setSlip.larkSync.approvalStatus !== 'REJECTED') ||
            isAdvancePendingInLark ||
            (!advSlip &&
              (it.trangThaiPhieuThanhToan === 'Đang duyệt Lark' ||
                it.trangThaiPhieuThanhToan === 'Đã duyệt chờ chi')))
      );
      const isAcceptedTech = Boolean((it.linkAir || '').trim() && (it.actualAirDate || '').trim());
      const blockingIssues = evalResult.allIssues.map(i => i.issue.message);
      const canPush = evalResult.canSubmit && !isPaid;

      let paymentState: UnifiedAcceptancePaymentItem['paymentState'] = 'PENDING_ACCEPTANCE';
      let paymentStateLabel = 'Chờ nghiệm thu';
      let paymentStateTone: StatusTone = 'neutral';

      if (isPaid) {
        paymentState = 'PAID_DONE';
        paymentStateLabel = 'Đã đi tiền UNC';
        paymentStateTone = 'positive';
      } else if (inLarkFlow) {
        paymentState = 'IN_LARK_FLOW';
        const st = setSlip?.larkSync.approvalStatus || advSlip?.larkSync.approvalStatus;
        paymentStateLabel = st ? APPROVAL_STATUS_META[st].label : 'Đang trình duyệt Lark';
        paymentStateTone = st ? APPROVAL_STATUS_META[st].tone : 'info';
      } else if (canPush) {
        paymentState = 'READY_TO_PUSH';
        paymentStateLabel = 'Đủ hồ sơ đẩy Lark';
        paymentStateTone = 'positive';
      } else if (isAcceptedTech && blockingIssues.length > 0) {
        paymentState = 'HARD_BLOCKED';
        paymentStateLabel = `Thiếu ${blockingIssues.length} điều kiện`;
        paymentStateTone = 'critical';
      }

      const isLivestream = isLivestreamBookingItem(it);
      const extractedServices = extractApprovedItemServices(it, linkedDeal, isLivestream);
      const hasAdvanceOption =
        it.paymentScheduleOption === 'TWO_TIMES' ||
        linkedDeal.paymentScheduleOption === 'TWO_TIMES' ||
        (it.soTienTamUngTruoc || 0) > 0 ||
        (line?.advancePaidAmount || 0) > 0 ||
        Boolean(advSlip);
      const paymentScheduleLabel = hasAdvanceOption
        ? advSlip
          ? `2 đợt · Phiếu TU: ${advSlip.slipCode}`
          : '2 đợt · Có tạm ứng đợt 1'
        : 'Thanh toán 1 lần (ĐNTT)';

      list.push({
        id: `32-${it.id}`,
        code,
        jobCode: line?.jobId || `${code}-J01`,
        subsystem: isLivestream ? 'LIVESTREAM_DEAL' : 'TIKTOK_KOC_32',
        subsystemLabel: isLivestream ? 'Booking Livestream' : 'Booking KOC TikTok (3.2)',
        platformLabel: 'TikTok',
        serviceKeys: extractedServices.serviceKeys,
        serviceTags: extractedServices.serviceTags,
        hasAdvanceOption,
        paymentScheduleLabel,
        month: it.thangNghiemThuChot || it.thangPlan || '2026/10',
        brandName: it.brandName || linkedDeal.brandName,
        storeName: it.storeName || linkedDeal.storeName || it.brandName,
        productName: it.sanPham || linkedDeal.productName || '—',
        picName: it.nguoiPhuTrach || linkedDeal.bookingPic || '—',
        leaderName: it.leaderName || evalResult.approvalRoute.bookingLeaderName,
        partnerId: it.kocId || linkedDeal.kocId,
        partnerName: it.tenKenh || linkedDeal.kocStageName,
        partnerHandle: it.idKenh || linkedDeal.kocChannelId || '—',
        subjectLabel: evalResult.payee.subjectLabel,
        legalId: evalResult.payee.legalId || it.soCccd || '',
        bankName: evalResult.payee.bankName || it.nganHang || '',
        bankAccount: evalResult.payee.bankAccount || it.soTaiKhoan || '',
        bankHolder: evalResult.payee.bankHolder || it.tenTaiKhoanNganHang || '',
        airLink: it.linkAir || linkedDeal.videoUrl || '',
        airedAt: it.actualAirDate || linkedDeal.postedDate || '',
        sparkAdsOrAffLink: it.sparkAdsCode || linkedDeal.sparkAdsCode || '',
        contractSummary: `${it.masterContractCode || 'HĐNT'} · ${it.contractAppendixCode || 'SOW'} (${it.contractAppendixStatus || 'CHƯA_LẬP'})`,
        bbntSummary: it.bbntCode
          ? `${it.bbntCode} (${it.bbntStatus || 'CHƯA_LẬP'})`
          : line?.isBbntMandatory
          ? 'Bắt buộc ký BBNT'
          : 'Miễn BBNT (<20tr)',
        isAcceptedTech,
        isDataLocked: Boolean(it.chotData),
        agreedNetAmount: line?.agreedNetAmount ?? it.chiPhiBookingNetCuoi ?? 0,
        grossAmount: line?.grossContractAmount ?? it.chiPhiGrossKemThue ?? 0,
        taxAmount: (line?.pitDeductionAmount || 0) + (line?.vatAmount || 0),
        advancePaidAmount: line?.advancePaidAmount ?? it.soTienTamUngTruoc ?? 0,
        netTransferAmount: line?.netTransferAmount ?? it.soTienCanThanhToan ?? 0,
        canPushLarkSlip: canPush,
        blockingIssues,
        lark32Synced: Boolean(it.larkSyncedAt || setSlip?.larkSync.larkbaseRecordId),
        lark32RecordId: setSlip?.larkSync.larkbaseRecordId,
        advanceSlip: advSlip,
        settlementSlip: setSlip,
        paymentState,
        paymentStateLabel,
        paymentStateTone,
        rawDeal: linkedDeal,
        rawApprovedItem: it,
      });
    }

    // 2. Phân hệ Đa nền tảng (Shopee Video / Threads / Facebook / Instagram)
    for (const mp of multiPlatformItems) {
      if (mp.brandDecision !== 'Yes' || mp.stage === 'LISTING') continue;
      if (
        scopedStoreNameSet.size > 0 &&
        mp.storeName &&
        !scopedStoreNameSet.has(mp.storeName.trim().toLowerCase())
      ) {
        continue;
      }
      const code = (mp.boCode || `MP-DEAL-${mp.id}`).trim();
      const upper = code.toUpperCase();
      if (seenDealCodes.has(upper)) continue;
      seenDealCodes.add(upper);

      const mpDeal = buildBookingDealFromMultiPlatformItem(mp, stores, kocs);
      const mpCleanHandle = (mpDeal.kocChannelId || mp.kocTiktokHandle || mp.channelHandle || '')
        .replace(/^@/, '')
        .trim()
        .toLowerCase();
      const matchedMpKoc =
        (mpDeal.kocId && kocLookup.byId.get(mpDeal.kocId)) ||
        (mp.kocId && kocLookup.byId.get(mp.kocId)) ||
        (mpCleanHandle ? kocLookup.byHandle.get(mpCleanHandle) : undefined);
      const evalResult = buildLarkPaymentRequestSlip({
        requestType: 'SETTLEMENT',
        deals: [mpDeal],
        kocs: matchedMpKoc ? [matchedMpKoc] : [],
        overridesByDealId: {
          [mpDeal.id]: {
            linkAir: mp.postUrl || '',
            postedDate: mp.actualPostDate || mp.plannedPostDate || '',
            adsCodeStatus: 'KHÔNG_DÙNG',
          },
        },
        createdBy: currentUserName,
        month: mp.monthKey || '2026/10',
      });
      const line = evalResult.lineItems[0];
      const setSlip = slipsIndex.settlementByCode.get(upper);
      const advSlip = slipsIndex.advanceByCode.get(upper);

      const isPaid =
        mp.paymentStatus === 'Đã thanh toán' ||
        mp.stage === 'PAID' ||
        setSlip?.larkSync.approvalStatus === 'PAID' ||
        Boolean(setSlip?.larkSync.daDiTien);
      const inLarkFlow =
        !isPaid &&
        (mp.paymentStatus === 'Đã lập ĐNTT' ||
          Boolean(setSlip && setSlip.larkSync.approvalStatus !== 'REJECTED'));
      const isAcceptedTech = Boolean((mp.postUrl || '').trim());
      const blockingIssues = evalResult.allIssues.map(i => i.issue.message);
      const canPush = evalResult.canSubmit && !isPaid;

      let paymentState: UnifiedAcceptancePaymentItem['paymentState'] = 'PENDING_ACCEPTANCE';
      let paymentStateLabel = 'Chờ đăng / nghiệm thu';
      let paymentStateTone: StatusTone = 'neutral';

      if (isPaid) {
        paymentState = 'PAID_DONE';
        paymentStateLabel = 'Đã đi tiền UNC';
        paymentStateTone = 'positive';
      } else if (inLarkFlow) {
        paymentState = 'IN_LARK_FLOW';
        const st = setSlip?.larkSync.approvalStatus;
        paymentStateLabel = st ? APPROVAL_STATUS_META[st].label : 'Đã lập ĐNTT Lark';
        paymentStateTone = st ? APPROVAL_STATUS_META[st].tone : 'info';
      } else if (canPush) {
        paymentState = 'READY_TO_PUSH';
        paymentStateLabel = 'Đủ hồ sơ đẩy Lark';
        paymentStateTone = 'positive';
      } else if (isAcceptedTech && blockingIssues.length > 0) {
        paymentState = 'HARD_BLOCKED';
        paymentStateLabel = `Thiếu ${blockingIssues.length} điều kiện`;
        paymentStateTone = 'critical';
      }

      const cfg = MULTI_PLATFORM_CONFIGS[mp.platform];
      const mpServiceKeys: Exclude<BookingServiceFilterKey, 'ALL'>[] = [
        'MULTI_PLATFORM_POST',
        ...(mp.affiliateTargetUrl || mp.linkPlacement ? (['LINK_BIO_CART'] as const) : []),
      ];
      const mpServiceTags = [
        `Đa sàn (${cfg.shortLabel})`,
        ...(mp.affiliateTargetUrl || mp.linkPlacement ? ['Gắn Link / Giỏ hàng'] : []),
      ];
      list.push({
        id: `MP-${mp.id}`,
        code,
        jobCode: mpDeal.jobId || `${code}-J01`,
        subsystem: 'MULTI_PLATFORM',
        subsystemLabel: `Đa nền tảng (${cfg.shortLabel})`,
        platformLabel: cfg.shortLabel,
        serviceKeys: mpServiceKeys,
        serviceTags: mpServiceTags,
        hasAdvanceOption: Boolean(advSlip),
        paymentScheduleLabel: advSlip
          ? `2 đợt · Phiếu TU: ${advSlip.slipCode}`
          : 'Thanh toán 1 lần (ĐNTT)',
        month: mp.monthKey || '2026/10',
        brandName: mp.brandName || mpDeal.brandName,
        storeName: mp.storeName,
        productName: mp.productName,
        picName: mp.staffName || mpDeal.bookingPic || '—',
        leaderName: evalResult.approvalRoute.bookingLeaderName,
        partnerId: mpDeal.kocId,
        partnerName:
          mpDeal.kocStageName && mpDeal.kocStageName !== mp.kocDisplayName
            ? `${mpDeal.kocStageName} (${mp.kocDisplayName || mp.channelHandle})`
            : mpDeal.kocStageName || mp.kocDisplayName || mp.channelHandle,
        partnerHandle:
          mpDeal.kocChannelId &&
          mpDeal.kocChannelId.toLowerCase() !== mp.channelHandle.toLowerCase()
            ? `${mp.channelHandle} · TikTok: ${mpDeal.kocChannelId}`
            : mp.channelHandle,
        subjectLabel: evalResult.payee.subjectLabel,
        legalId: evalResult.payee.legalId,
        bankName: evalResult.payee.bankName,
        bankAccount: evalResult.payee.bankAccount,
        bankHolder: evalResult.payee.bankHolder,
        airLink: mp.postUrl || '',
        airedAt: mp.actualPostDate || mp.plannedPostDate || '',
        sparkAdsOrAffLink: mp.affiliateTargetUrl || mp.linkPlacement || '',
        contractSummary: line?.isContractMandatory ? 'Bắt buộc HĐ + SOW' : 'Miễn HĐ (<10tr)',
        bbntSummary: line?.isBbntMandatory ? 'Bắt buộc BBNT' : 'Miễn BBNT (<20tr)',
        isAcceptedTech,
        isDataLocked: isPaid || inLarkFlow,
        agreedNetAmount: mp.unitNetFee || 0,
        grossAmount: line?.grossContractAmount ?? mp.grossFeeWithTax ?? 0,
        taxAmount: (line?.pitDeductionAmount || 0) + (line?.vatAmount || 0),
        advancePaidAmount: 0,
        netTransferAmount: line?.netTransferAmount ?? mp.unitNetFee ?? 0,
        canPushLarkSlip: canPush,
        blockingIssues,
        lark32Synced: Boolean(setSlip?.larkSync.larkbaseRecordId),
        lark32RecordId: setSlip?.larkSync.larkbaseRecordId,
        advanceSlip: advSlip,
        settlementSlip: setSlip,
        paymentState,
        paymentStateLabel,
        paymentStateTone,
        rawDeal: mpDeal,
        rawMultiPlatformItem: mp,
      });
    }

    // 3. Phân hệ Video Kênh Brand & CTV Self-channel (/api/self-channel-board?all=1)
    for (const sj of selfJobs) {
      if (sj.lifecycleStatus === 'CANCELLED' || sj.productionMode !== 'CTV_OUTSOURCE') continue;
      if ((sj.feeGross || 0) <= 0) continue;
      if (
        scopedStoreNameSet.size > 0 &&
        sj.storeName &&
        !scopedStoreNameSet.has(sj.storeName.trim().toLowerCase())
      ) {
        continue;
      }
      const planInfo = {
        id: sj.planId,
        storeName: sj.storeName,
        brandName: sj.brandName,
        month: sj.month,
      };
      const code = selfSlipDealCode(planInfo, sj);
      const upper = code.toUpperCase();
      if (seenDealCodes.has(upper)) continue;
      seenDealCodes.add(upper);

      const ctv = sj.contributorId ? contributorById.get(sj.contributorId) : undefined;
      const line = evaluateSelfJobForPaymentSlip(sj, planInfo, ctv);
      const setSlip =
        slipsIndex.settlementByCode.get(upper) ||
        (sj.dnttSlipCode
          ? slipsIndex.slipBySlipCode.get(sj.dnttSlipCode.trim().toUpperCase())
          : undefined);

      const isPaid =
        sj.paymentStatus === 'PAID' ||
        setSlip?.larkSync.approvalStatus === 'PAID' ||
        Boolean(setSlip?.larkSync.daDiTien);
      const inLarkFlow =
        !isPaid &&
        (sj.paymentStatus === 'REQUESTED' ||
          Boolean(setSlip && setSlip.larkSync.approvalStatus !== 'REJECTED'));
      const isAcceptedTech = sj.acceptanceStatus === 'PASSED' && Boolean((sj.airLink || '').trim());
      const blockingIssues = line.issues.map(i => i.message);
      const canPush = line.isEligible && !isPaid && !inLarkFlow;

      let paymentState: UnifiedAcceptancePaymentItem['paymentState'] = 'PENDING_ACCEPTANCE';
      let paymentStateLabel = 'Chờ nghiệm thu video';
      let paymentStateTone: StatusTone = 'neutral';

      if (isPaid) {
        paymentState = 'PAID_DONE';
        paymentStateLabel = 'Đã đi tiền UNC';
        paymentStateTone = 'positive';
      } else if (inLarkFlow) {
        paymentState = 'IN_LARK_FLOW';
        const st = setSlip?.larkSync.approvalStatus;
        paymentStateLabel = st ? APPROVAL_STATUS_META[st].label : 'Đã lập ĐNTT Lark';
        paymentStateTone = st ? APPROVAL_STATUS_META[st].tone : 'info';
      } else if (canPush) {
        paymentState = 'READY_TO_PUSH';
        paymentStateLabel = 'Đủ hồ sơ đẩy Lark';
        paymentStateTone = 'positive';
      } else if (sj.acceptanceStatus === 'PASSED' && blockingIssues.length > 0) {
        paymentState = 'HARD_BLOCKED';
        paymentStateLabel = `Thiếu ${blockingIssues.length} điều kiện`;
        paymentStateTone = 'critical';
      }

      list.push({
        id: `SC-${sj.planId}-${sj.id}`,
        code: sj.code,
        jobCode: sj.code,
        subsystem: 'SELF_CHANNEL_CTV',
        subsystemLabel: 'Video Kênh Brand & CTV',
        platformLabel: 'Kênh Brand',
        serviceKeys: ['SELF_CHANNEL_VIDEO'],
        serviceTags: [`Video CTV (${SELF_FORMAT_LABEL[sj.formatKey] || sj.formatKey})`],
        hasAdvanceOption: false,
        paymentScheduleLabel: 'Thanh toán 1 lần (ĐNTT)',
        month: sj.month || '2026/10',
        brandName: sj.brandName,
        storeName: sj.storeName,
        productName: `${SELF_FORMAT_LABEL[sj.formatKey] || sj.formatKey}${sj.productName ? ` · ${sj.productName}` : ''}`,
        picName: sj.requestedBy || 'PIC Content Kênh',
        leaderName: line.bookingLeader,
        partnerId: sj.contributorId,
        partnerName: sj.contributorName || ctv?.name || 'CTV chưa gán',
        partnerHandle: sj.channelOrPhone || ctv?.phone || '—',
        subjectLabel: 'CTV Kênh Brand (Khấu trừ 10% TNCN ≥ 2tr)',
        legalId: (ctv ? ctv.cccd || ctv.taxCode : '') || sj.legalId || '',
        bankName: (ctv ? ctv.bankName : '') || sj.bankName || '',
        bankAccount: (ctv ? ctv.bankAccount : '') || sj.bankAccount || '',
        bankHolder: (ctv ? ctv.bankAccountName : '') || sj.bankHolder || '',
        airLink: sj.airLink || '',
        airedAt: sj.airedAt || '',
        sparkAdsOrAffLink: 'Video Kênh Brand',
        contractSummary:
          (ctv?.contractCode || sj.contractNo)
            ? `HĐ CTV: ${ctv?.contractCode || sj.contractNo}`
            : line.isContractMandatory
            ? 'Thiếu HĐ CTV'
            : 'Miễn HĐ (<10tr)',
        bbntSummary:
          (sj.bbntCode || sj.bbntUrl)
            ? `BBNT: ${sj.bbntCode || 'Đã đính kèm'}`
            : line.isBbntMandatory
            ? 'Thiếu BBNT'
            : 'Tự động nghiệm thu',
        isAcceptedTech,
        isDataLocked: isPaid || inLarkFlow,
        agreedNetAmount: line.netTransferAmount,
        grossAmount: line.grossContractAmount,
        taxAmount: line.pitDeductionAmount,
        advancePaidAmount: 0,
        netTransferAmount: line.netTransferAmount,
        canPushLarkSlip: canPush,
        blockingIssues,
        lark32Synced: Boolean(setSlip?.larkSync.larkbaseRecordId),
        lark32RecordId: setSlip?.larkSync.larkbaseRecordId,
        settlementSlip: setSlip,
        paymentState,
        paymentStateLabel,
        paymentStateTone,
        rawSelfJob: sj,
      });
    }

    return list;
  }, [
    approvedItems,
    multiPlatformItems,
    selfJobs,
    scopedStoreNameSet,
    dealByCodeMap,
    kocLookup,
    stores,
    kocs,
    currentUserName,
    slipsIndex,
    contributorById,
    slips,
  ]);

  const unifiedByCodeMap = useMemo(() => {
    const map = new Map<string, UnifiedAcceptancePaymentItem>();
    for (const item of unifiedItems) {
      map.set(item.code.trim().toUpperCase(), item);
      if (item.rawSelfJob) {
        if (item.storeName) {
          map.set(`${item.code}@${item.storeName}`.toUpperCase(), item);
        }
        if (item.brandName) {
          map.set(`${item.code}@${item.brandName}`.toUpperCase(), item);
        }
        map.set(`${item.code}@GIAN`.toUpperCase(), item);
      }
    }
    return map;
  }, [unifiedItems]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>(['2026/11', '2026/10', '2026/09']);
    unifiedItems.forEach(i => {
      if (i.month) set.add(i.month);
    });
    slips.forEach(s => {
      if (s.month) set.add(s.month);
    });
    return Array.from(set).sort().reverse();
  }, [unifiedItems, slips]);

  const availableStores = useMemo(() => {
    const set = new Set<string>();
    unifiedItems.forEach(i => {
      if (i.storeName) set.add(i.storeName);
    });
    return Array.from(set).sort();
  }, [unifiedItems]);

  const matchesItemPaymentMode = useCallback(
    (it: UnifiedAcceptancePaymentItem, mode: PaymentModeFilterKey): boolean => {
      if (mode === 'ALL') return true;
      if (mode === 'ADVANCE') {
        return it.hasAdvanceOption || it.advancePaidAmount > 0 || Boolean(it.advanceSlip);
      }
      if (mode === 'ADVANCE_PENDING') {
        return (
          (it.hasAdvanceOption || Boolean(it.advanceSlip)) &&
          it.advanceSlip?.larkSync.approvalStatus !== 'PAID' &&
          !it.advanceSlip?.larkSync.daDiTien
        );
      }
      if (mode === 'SETTLEMENT_WITH_ADVANCE') {
        return it.advancePaidAmount > 0 || Boolean(it.advanceSlip);
      }
      if (mode === 'SETTLEMENT') {
        return !it.hasAdvanceOption || Boolean(it.settlementSlip) || it.isAcceptedTech;
      }
      return true;
    },
    []
  );

  const matchesSlipPaymentMode = useCallback(
    (s: LarkPaymentRequestSlip, mode: PaymentModeFilterKey): boolean => {
      if (mode === 'ALL') return true;
      if (mode === 'ADVANCE') return s.requestType === 'ADVANCE';
      if (mode === 'ADVANCE_PENDING') {
        return (
          s.requestType === 'ADVANCE' &&
          s.larkSync.approvalStatus !== 'PAID' &&
          s.larkSync.approvalStatus !== 'REJECTED' &&
          !s.larkSync.daDiTien
        );
      }
      if (mode === 'SETTLEMENT') return s.requestType === 'SETTLEMENT';
      if (mode === 'SETTLEMENT_WITH_ADVANCE') {
        return s.requestType === 'SETTLEMENT' && (s.totals.advancePaidTotal || 0) > 0;
      }
      return true;
    },
    []
  );

  const inferSlipServiceKeys = useCallback(
    (s: LarkPaymentRequestSlip): Exclude<BookingServiceFilterKey, 'ALL'>[] => {
      const keys = new Set<Exclude<BookingServiceFilterKey, 'ALL'>>();
      const sub = inferSlipSubsystem(s);
      if (sub === 'SELF_CHANNEL_CTV') keys.add('SELF_CHANNEL_VIDEO');
      if (sub === 'LIVESTREAM_DEAL') keys.add('LIVESTREAM_SESSION');
      if (sub === 'MULTI_PLATFORM') keys.add('MULTI_PLATFORM_POST');
      for (const li of s.lineItems || []) {
        const matched = unifiedByCodeMap.get((li.dealCode || '').trim().toUpperCase());
        if (matched) {
          matched.serviceKeys.forEach(k => keys.add(k));
        } else if ((li.addonServicesNetAmount || 0) > 0) {
          keys.add('COMBO_VIDEO_ADDONS');
        } else if (sub === 'TIKTOK_KOC_32') {
          keys.add('TIKTOK_VIDEO_ONLY');
        }
      }
      return Array.from(keys);
    },
    [unifiedByCodeMap]
  );

  // Lọc danh sách Hàng chờ Nghiệm thu & ĐNTT theo bộ lọc chung
  const baseFilteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedItems.filter(it => {
      if (subsystemFilter !== 'ALL' && it.subsystem !== subsystemFilter) return false;
      if (bookingServiceFilter !== 'ALL' && !it.serviceKeys.includes(bookingServiceFilter)) return false;
      if (!matchesItemPaymentMode(it, paymentModeFilter)) return false;
      if (monthFilter !== 'ALL' && it.month !== monthFilter) return false;
      if (storeFilter !== 'ALL' && it.storeName !== storeFilter) return false;
      if (!q) return true;
      return `${it.code} ${it.jobCode} ${it.brandName} ${it.storeName} ${it.productName} ${it.partnerName} ${it.partnerHandle} ${it.picName} ${it.serviceTags.join(' ')} ${it.settlementSlip?.slipCode || ''} ${it.advanceSlip?.slipCode || ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [
    unifiedItems,
    subsystemFilter,
    bookingServiceFilter,
    paymentModeFilter,
    matchesItemPaymentMode,
    monthFilter,
    storeFilter,
    searchQuery,
  ]);

  const filteredQueueRows = useMemo(() => {
    if (queueFilter === 'ALL') return baseFilteredQueue;
    return baseFilteredQueue.filter(it => it.paymentState === queueFilter);
  }, [baseFilteredQueue, queueFilter]);

  // Lọc danh sách Phiếu ĐNTT & Tạm ứng trên Lark
  const baseFilteredSlips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return slips.filter(s => {
      const sub = inferSlipSubsystem(s);
      if (subsystemFilter !== 'ALL' && sub !== subsystemFilter) return false;
      if (bookingServiceFilter !== 'ALL') {
        const slipServices = inferSlipServiceKeys(s);
        if (!slipServices.includes(bookingServiceFilter)) return false;
      }
      if (!matchesSlipPaymentMode(s, paymentModeFilter)) return false;
      if (monthFilter !== 'ALL' && s.month !== monthFilter) return false;
      if (
        storeFilter !== 'ALL' &&
        !(s.lineItems || []).some(li => li.storeName === storeFilter || li.brandName === storeFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const dealCodes = (s.lineItems || []).map(l => `${l.dealCode} ${l.brandName} ${l.storeName}`).join(' ');
      return `${s.slipCode} ${s.larkSync.approvalInstanceCode} ${s.payee.kocStageName} ${s.payee.bankHolder} ${s.createdBy} ${dealCodes}`
        .toLowerCase()
        .includes(q);
    });
  }, [
    slips,
    subsystemFilter,
    bookingServiceFilter,
    inferSlipServiceKeys,
    paymentModeFilter,
    matchesSlipPaymentMode,
    monthFilter,
    storeFilter,
    searchQuery,
  ]);

  const filteredSlips = useMemo(() => {
    return baseFilteredSlips.filter(s => {
      const st = s.larkSync.approvalStatus;
      if (slipFilter === 'ALL') return true;
      if (slipFilter === 'PENDING_APPROVAL') {
        return st === 'PENDING_LEADER' || st === 'PENDING_DIRECTOR' || st === 'PENDING_FINANCE';
      }
      if (slipFilter === 'APPROVED_WAIT_PAY') return st === 'APPROVED';
      if (slipFilter === 'PAID_UNC') return st === 'PAID' || Boolean(s.larkSync.daDiTien);
      if (slipFilter === 'REJECTED') return st === 'REJECTED';
      return true;
    });
  }, [baseFilteredSlips, slipFilter]);

  // 4 Chỉ số KPI đầu trang (StatRow tối đa 4 Stat theo DESIGN_SYSTEM.md)
  const kpiStats = useMemo(() => {
    const readyItems = baseFilteredQueue.filter(i => i.paymentState === 'READY_TO_PUSH');
    const readyNet = readyItems.reduce((sum, i) => sum + i.netTransferAmount, 0);

    const activeSlips = baseFilteredSlips.filter(
      s => s.larkSync.approvalStatus !== 'PAID' && s.larkSync.approvalStatus !== 'REJECTED'
    );
    const activeSlipsNet = activeSlips.reduce((sum, s) => sum + s.totals.netTransferTotal, 0);

    const paidSlips = baseFilteredSlips.filter(
      s => s.larkSync.approvalStatus === 'PAID' || Boolean(s.larkSync.daDiTien)
    );
    const paidSlipsNet = paidSlips.reduce((sum, s) => sum + s.totals.netTransferTotal, 0);

    const blockedCount = baseFilteredQueue.filter(i => i.paymentState === 'HARD_BLOCKED').length;
    const rejectedSlipsCount = baseFilteredSlips.filter(
      s => s.larkSync.approvalStatus === 'REJECTED'
    ).length;

    return {
      readyCount: readyItems.length,
      readyNet,
      activeSlipsCount: activeSlips.length,
      activeSlipsNet,
      paidSlipsCount: paidSlips.length,
      paidSlipsNet,
      blockedCount,
      rejectedSlipsCount,
    };
  }, [baseFilteredQueue, baseFilteredSlips]);

  // Đồng bộ nghiệm thu kỹ thuật sang Bảng 3.2 Larkbase (1 hoặc nhiều dòng)
  const handleSyncLark32 = async (itemsToSync: UnifiedAcceptancePaymentItem[]) => {
    if (itemsToSync.length === 0) {
      onNotify?.('Chọn ít nhất 1 hạng mục để đồng bộ sang Bảng 3.2 Larkbase.', 'warning');
      return;
    }
    setBusyKey('SYNC_32');
    try {
      const jobsPayload = itemsToSync.map(it => ({
        jobId: it.id,
        jobCode: it.jobCode,
        dealCode: it.code,
        brandName: it.brandName,
        storeName: it.storeName,
        month: it.month,
        kocName: it.partnerName,
        kocHandle: it.partnerHandle,
        grade: it.rawDeal?.salaryGrade || 'KL3',
        fee: it.agreedNetAmount,
        airLink: it.airLink,
        airedAt: it.airedAt,
        sparkAdsCode: it.sparkAdsOrAffLink,
        acceptanceStatus: it.isAcceptedTech ? 'ĐÃ_NGHIỆM_THU' : 'CHỜ_NGHIỆM_THU',
        existingRecordId: it.lark32RecordId,
      }));
      const res = await fetch('/api/integrations/larkbase/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'SYNC_LARK_32_BOOKING_LIST', jobs: jobsPayload }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        syncedCount?: number;
        simulated?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.success) {
        onNotify?.(json.message || json.error || 'Chưa đồng bộ được sang Bảng 3.2 Larkbase.', 'warning');
        return;
      }
      const syncedCodes = new Set(itemsToSync.map(x => x.code.toUpperCase()));
      const nowIso = new Date().toISOString();
      const updatedApproved = approvedItems.map(row => {
        if (!syncedCodes.has((row.maBooking || '').trim().toUpperCase())) return row;
        return {
          ...row,
          larkSyncedAt: nowIso,
        };
      });
      setApprovedItems(updatedApproved);
      saveApprovedBookingList(updatedApproved);
      setSelectedQueueIds([]);
      onNotify?.(
        `Đã đẩy nghiệm thu ${json.syncedCount || itemsToSync.length} hạng mục sang Bảng 3.2 Larkbase.`,
        'success'
      );
    } catch {
      onNotify?.('Lỗi kết nối khi đẩy dữ liệu sang Bảng 3.2 Larkbase.', 'error');
    } finally {
      setBusyKey(null);
    }
  };

  // Đồng bộ trực tiếp state Modal chi tiết phiếu với danh sách nền sau mọi lần reload / cập nhật (RULE-SYNC-01)
  useEffect(() => {
    if (!detailSlip) return;
    const latest = slips.find(s => s.id === detailSlip.id || s.slipCode === detailSlip.slipCode);
    if (latest && latest !== detailSlip) {
      setDetailSlip(latest);
    }
  }, [slips, detailSlip]);

  // Đẩy phiếu ĐNTT cho việc CTV Kênh Brand (SELF_CHANNEL)
  const handleCreateSelfChannelSlip = useCallback(
    async (item: UnifiedAcceptancePaymentItem, silent = false): Promise<boolean> => {
      const sj = item.rawSelfJob;
      if (!sj) return false;
      setBusyKey(`self-${item.id}`);
      try {
        const res = await fetch('/api/integrations/larkbase/payment-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'SELF_CHANNEL', planId: sj.planId, jobId: sj.id }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          slip?: LarkPaymentRequestSlip;
        };
        if (!res.ok) {
          if (!silent) {
            onNotify?.(
              `${sj.code}: ${body.message || body.error || 'Không lập được phiếu ĐNTT.'}`,
              'error'
            );
          }
          return false;
        }
        if (body.slip) {
          const nextSlips = [body.slip, ...slips.filter(x => x.id !== body.slip!.id)];
          setSlips(nextSlips);
          saveLarkPaymentSlipsToStorage(nextSlips);
        }
        if (!silent) {
          onNotify?.(
            body.message || `Đã đẩy phiếu ĐNTT cho ${sj.code} lên Lark Approval.`,
            'success'
          );
        }
        return true;
      } catch {
        if (!silent) onNotify?.('Lỗi mạng khi đẩy phiếu ĐNTT CTV sang Lark.', 'error');
        return false;
      } finally {
        setBusyKey(null);
      }
    },
    [onNotify, slips]
  );

  // Mở hộp thoại lập phiếu Tạm ứng / ĐNTT cho 1 hoặc nhiều hạng mục đã chọn
  const handleOpenCreateSlipForItems = useCallback(
    async (
      items: UnifiedAcceptancePaymentItem[],
      requestType: PaymentRequestType = 'SETTLEMENT'
    ) => {
      if (items.length === 0) return;
      const selfItems = items.filter(i => i.subsystem === 'SELF_CHANNEL_CTV');
      const dealItems = items.filter(i => i.subsystem !== 'SELF_CHANNEL_CTV' && i.rawDeal);

      if (selfItems.length > 0) {
        if (requestType === 'ADVANCE' && dealItems.length === 0) {
          onNotify?.(
            'Việc CTV Kênh Brand áp dụng thanh toán 1 lần (ĐNTT), không tách đợt tạm ứng.',
            'warning'
          );
          return;
        }
        if (requestType === 'SETTLEMENT') {
          let createdCount = 0;
          for (const sItem of selfItems) {
            if (
              await handleCreateSelfChannelSlip(
                sItem,
                selfItems.length > 1 || dealItems.length > 0
              )
            ) {
              createdCount += 1;
            }
          }
          if (createdCount > 0) {
            if (selfItems.length > 1 || dealItems.length > 0) {
              onNotify?.(
                `Đã đẩy ${createdCount}/${selfItems.length} phiếu ĐNTT CTV lên Lark Approval.`,
                'success'
              );
            }
            await reloadAllSources();
          }
        }
      }

      if (dealItems.length > 0) {
        setLarkModalState({
          open: true,
          initialDeals: dealItems.map(i => i.rawDeal!),
          requestType,
        });
      }
    },
    [handleCreateSelfChannelSlip, onNotify, reloadAllSources]
  );

  // Đồng bộ trạng thái 1 phiếu hoặc toàn bộ phiếu đang chờ từ Lark Approval
  const handleSyncSlipStatusFromLark = useCallback(
    async (targetSlips: LarkPaymentRequestSlip[]) => {
      if (targetSlips.length === 0) return;
      setBusyKey(targetSlips.length === 1 ? `sync-${targetSlips[0].id}` : 'SYNC_ALL_SLIPS');
      try {
        let updatedCount = 0;
        for (const s of targetSlips) {
          const res = await fetch('/api/integrations/larkbase/payment-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'SYNC_LARK_STATUS', slipCode: s.slipCode }),
          });
          if (res.ok) updatedCount += 1;
        }
        await reloadAllSources();
        onNotify?.(
          `Đã đồng bộ trạng thái ${updatedCount}/${targetSlips.length} phiếu từ Lark Approval về các phân hệ Booking.`,
          'success'
        );
      } catch {
        onNotify?.('Lỗi mạng khi đồng bộ trạng thái phiếu từ Lark.', 'error');
      } finally {
        setBusyKey(null);
      }
    },
    [onNotify, reloadAllSources]
  );

  // Duyệt bước kế tiếp hoặc Từ chối phiếu trên Lark Approval -> đồng bộ ngược về cả 4 phân hệ (RULE-SYNC-01)
  const handleAdvanceOrRejectSlip = useCallback(
    async (
      slip: LarkPaymentRequestSlip,
      action: 'ADVANCE_STEP' | 'REJECT_SLIP',
      extra?: { uncBillCode?: string; rejectedReason?: string }
    ) => {
      setBusyKey(`act-${slip.id}`);
      try {
        const res = await fetch('/api/integrations/larkbase/payment-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slipId: slip.id,
            approvalInstanceCode: slip.larkSync.approvalInstanceCode,
            action,
            uncBillCode: extra?.uncBillCode,
            rejectedReason: extra?.rejectedReason,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          slip?: LarkPaymentRequestSlip;
          message?: string;
          error?: string;
        };
        if (!res.ok || !body.slip) {
          onNotify?.(
            body.message || body.error || 'Không thể cập nhật trạng thái phiếu.',
            'warning'
          );
          return;
        }
        const updatedSlip = body.slip;
        const dealCodesInSlip = new Set(
          (updatedSlip.lineItems || []).map(l => l.dealCode.trim().toUpperCase())
        );
        const st = updatedSlip.larkSync.approvalStatus;
        const isPaid = Boolean(updatedSlip.larkSync.daDiTien || st === 'PAID');
        const isRejected = st === 'REJECTED';
        const isApproved = st === 'APPROVED' || isPaid;

        // 1. Cập nhật sổ phiếu local
        const nextSlips = slips.map(x => (x.id === updatedSlip.id ? updatedSlip : x));
        setSlips(nextSlips);
        saveLarkPaymentSlipsToStorage(nextSlips);
        setDetailSlip(prev => (prev && prev.id === updatedSlip.id ? updatedSlip : prev));

        // 2. Đồng bộ ngược sang Bảng 3.2 (ApprovedBookingList) và state deals toàn cục
        const touchedApproved: ApprovedBookingListItem[] = [];
        const nextApproved = approvedItems.map(row => {
          if (!dealCodesInSlip.has((row.maBooking || '').trim().toUpperCase())) return row;
          if (updatedSlip.requestType === 'ADVANCE') {
            const updatedRow: ApprovedBookingListItem = {
              ...row,
              larkAdvanceSlipCode: updatedSlip.slipCode,
              larkAdvanceInstanceCode: updatedSlip.larkSync.approvalInstanceCode,
              larkAdvanceStatus: (isRejected
                ? 'TỪ_CHỐI_TẠM_ỨNG'
                : isPaid
                ? 'ĐÃ_CHI_TẠM_ỨNG'
                : isApproved
                ? 'ĐÃ_DUYỆT_TẠM_ỨNG'
                : 'CHỜ_DUYỆT_TẠM_ỨNG') as ApprovedBookingListItem['larkAdvanceStatus'],
              larkApprovalStatus: st,
              trangThaiPhieuThanhToan: (isRejected
                ? 'Từ chối duyệt'
                : isPaid || isApproved
                ? 'Đã tạm ứng'
                : 'Đang duyệt Lark') as ApprovedBookingListItem['trangThaiPhieuThanhToan'],
            };
            touchedApproved.push(updatedRow);
            return updatedRow;
          }
          const updatedRow: ApprovedBookingListItem = {
            ...row,
            larkSlipCode: updatedSlip.slipCode,
            larkApprovalInstanceCode: updatedSlip.larkSync.approvalInstanceCode,
            larkApprovalStatus: st,
            trangThaiPhieuThanhToan: (isRejected
              ? 'Từ chối duyệt'
              : isPaid
              ? 'Đã thanh toán'
              : isApproved
              ? 'Đã duyệt chờ chi'
              : 'Đang duyệt Lark') as ApprovedBookingListItem['trangThaiPhieuThanhToan'],
            daDiTien: isPaid ? true : isRejected ? false : row.daDiTien,
            uncBillCode: updatedSlip.larkSync.uncBillCode || row.uncBillCode,
            uncSentToKocAt: updatedSlip.larkSync.uncSentToKocAt || row.uncSentToKocAt,
          };
          touchedApproved.push(updatedRow);
          return updatedRow;
        });
        setApprovedItems(nextApproved);
        saveApprovedBookingList(nextApproved);
        if (touchedApproved.length > 0 && onCreateOrUpdateDeals) {
          onCreateOrUpdateDeals(touchedApproved.map(it => buildBookingDealFromApprovedItem(it)));
        }

        // 3. Đồng bộ ngược sang Đa nền tảng (MultiPlatformListingItems)
        let mpChanged = false;
        const nextMp = multiPlatformItems.map(mp => {
          const code = (mp.boCode || `MP-DEAL-${mp.id}`).trim().toUpperCase();
          const fallbackMpCode = `MP-DEAL-${mp.id}`.trim().toUpperCase();
          if (!dealCodesInSlip.has(code) && !dealCodesInSlip.has(fallbackMpCode)) return mp;
          mpChanged = true;
          return {
            ...mp,
            paymentStatus: (isRejected
              ? 'Đủ điều kiện ĐNTT'
              : isPaid
              ? 'Đã thanh toán'
              : 'Đã lập ĐNTT') as MultiPlatformListingItem['paymentStatus'],
            stage: (isRejected
              ? 'ACCEPTED'
              : isPaid
              ? 'PAID'
              : 'PAYMENT_READY') as MultiPlatformListingItem['stage'],
            updatedAt: new Date().toISOString(),
          };
        });
        setMultiPlatformItems(nextMp);
        if (mpChanged) saveMultiPlatformListingItems(nextMp);

        // 4. Đồng bộ lạc quan cho Việc CTV Kênh Brand (Self-channel)
        setSelfJobs(prev =>
          prev.map(job => {
            const jobKey = job.code.trim().toUpperCase();
            const jobStoreKey = `${job.code}@${job.storeName || ''}`.trim().toUpperCase();
            const jobBrandKey = `${job.code}@${job.brandName || ''}`.trim().toUpperCase();
            if (
              !dealCodesInSlip.has(jobKey) &&
              !dealCodesInSlip.has(jobStoreKey) &&
              !dealCodesInSlip.has(jobBrandKey)
            ) {
              return job;
            }
            return {
              ...job,
              paymentStatus: isPaid ? 'PAID' : isRejected ? 'NONE' : 'REQUESTED',
            };
          })
        );

        setRejectSlipTarget(null);
        await reloadAllSources();
        onNotify?.(body.message || `Đã cập nhật phiếu ${updatedSlip.slipCode}.`, 'success');
      } catch {
        onNotify?.('Lỗi mạng khi cập nhật bước duyệt phiếu trên Lark.', 'error');
      } finally {
        setBusyKey(null);
      }
    },
    [
      approvedItems,
      multiPlatformItems,
      onCreateOrUpdateDeals,
      onNotify,
      reloadAllSources,
      slips,
    ]
  );

  const allModalDeals = useMemo(() => {
    const map = new Map<string, BookingDealItem>();
    for (const d of deals) map.set(d.id, d);
    for (const it of unifiedItems) {
      if (it.rawDeal) map.set(it.rawDeal.id, it.rawDeal);
    }
    return Array.from(map.values());
  }, [deals, unifiedItems]);

  const queueChips = useMemo(
    () => [
      { key: 'ALL' as const, label: 'Tất cả hạng mục', count: baseFilteredQueue.length },
      {
        key: 'READY_TO_PUSH' as const,
        label: 'Đủ điều kiện đẩy ĐNTT',
        count: baseFilteredQueue.filter(i => i.paymentState === 'READY_TO_PUSH').length,
      },
      {
        key: 'PENDING_ACCEPTANCE' as const,
        label: 'Chờ nghiệm thu bài đăng',
        count: baseFilteredQueue.filter(i => i.paymentState === 'PENDING_ACCEPTANCE').length,
      },
      {
        key: 'HARD_BLOCKED' as const,
        label: 'Chưa đủ hồ sơ',
        count: baseFilteredQueue.filter(i => i.paymentState === 'HARD_BLOCKED').length,
      },
      {
        key: 'IN_LARK_FLOW' as const,
        label: 'Đang duyệt trên Lark',
        count: baseFilteredQueue.filter(i => i.paymentState === 'IN_LARK_FLOW').length,
      },
      {
        key: 'PAID_DONE' as const,
        label: 'Đã đi tiền UNC',
        count: baseFilteredQueue.filter(i => i.paymentState === 'PAID_DONE').length,
      },
    ],
    [baseFilteredQueue]
  );

  const slipChips = useMemo(
    () => [
      { key: 'ALL' as const, label: 'Tất cả phiếu Lark', count: baseFilteredSlips.length },
      {
        key: 'PENDING_APPROVAL' as const,
        label: 'Đang chờ duyệt (Leader / GĐ / KT)',
        count: baseFilteredSlips.filter(s =>
          ['PENDING_LEADER', 'PENDING_DIRECTOR', 'PENDING_FINANCE'].includes(
            s.larkSync.approvalStatus
          )
        ).length,
      },
      {
        key: 'APPROVED_WAIT_PAY' as const,
        label: 'Đã duyệt · Chờ đi tiền',
        count: baseFilteredSlips.filter(s => s.larkSync.approvalStatus === 'APPROVED').length,
      },
      {
        key: 'PAID_UNC' as const,
        label: 'Đã đi tiền UNC',
        count: baseFilteredSlips.filter(
          s => s.larkSync.approvalStatus === 'PAID' || Boolean(s.larkSync.daDiTien)
        ).length,
      },
      {
        key: 'REJECTED' as const,
        label: 'Từ chối / Cần sửa',
        count: baseFilteredSlips.filter(s => s.larkSync.approvalStatus === 'REJECTED').length,
      },
    ],
    [baseFilteredSlips]
  );

  const paginatedQueueRows = useMemo(
    () => filteredQueueRows.slice((queuePage - 1) * pageSize, queuePage * pageSize),
    [filteredQueueRows, queuePage, pageSize]
  );

  const selectedQueueIdSet = useMemo(() => new Set(selectedQueueIds), [selectedQueueIds]);

  const selectedQueueItems = useMemo(
    () => filteredQueueRows.filter(i => selectedQueueIdSet.has(i.id)),
    [filteredQueueRows, selectedQueueIdSet]
  );

  const allCurrentPageSelected = useMemo(
    () =>
      paginatedQueueRows.length > 0 &&
      paginatedQueueRows.every(r => selectedQueueIdSet.has(r.id)),
    [paginatedQueueRows, selectedQueueIdSet]
  );

  const queueColumns = useMemo<Column<UnifiedAcceptancePaymentItem>[]>(
    () => [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            aria-label="Chọn tất cả hạng mục trên trang hiện tại"
            checked={allCurrentPageSelected}
            onChange={e => {
              const pageIds = paginatedQueueRows.map(r => r.id);
              if (e.target.checked) {
                setSelectedQueueIds(prev => Array.from(new Set([...prev, ...pageIds])));
              } else {
                const pageIdSet = new Set(pageIds);
                setSelectedQueueIds(prev => prev.filter(id => !pageIdSet.has(id)));
              }
            }}
            className="rounded border-line"
          />
        ),
        width: 36,
        render: r => (
          <input
            type="checkbox"
            aria-label={`Chọn ${r.code}`}
            checked={selectedQueueIdSet.has(r.id)}
            onChange={e => {
              e.stopPropagation();
              setSelectedQueueIds(prev =>
                e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id)
              );
            }}
            onClick={e => e.stopPropagation()}
            className="rounded border-line"
          />
        ),
      },
      {
        key: 'code',
        header: 'Mã BO / Việc & Gian hàng',
        width: 215,
        render: r => {
          const badge = SUBSYSTEM_BADGE_META[r.subsystem];
          return (
            <div className="space-y-1 leading-snug">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-semibold text-accent hover:underline">
                  {r.code}
                </span>
                <Status tone={badge.tone}>{r.platformLabel}</Status>
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[205px]" title={r.storeName}>
                {r.storeName} · {r.month}
              </div>
            </div>
          );
        },
      },
      {
        key: 'service',
        header: 'Dịch vụ & Đợt chi',
        width: 195,
        render: r => {
          const visibleTags = r.serviceTags.slice(0, 2);
          const extraCount = r.serviceTags.length - visibleTags.length;
          return (
            <div className="space-y-1 leading-snug">
              <div className="flex items-center gap-1 flex-wrap">
                {visibleTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded border border-line bg-sunken px-1.5 py-0.5 text-2xs font-medium text-ink-2"
                  >
                    {tag}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span
                    className="inline-flex items-center rounded border border-line bg-sunken px-1 py-0.5 text-2xs text-ink-3"
                    title={r.serviceTags.join(' · ')}
                  >
                    +{extraCount}
                  </span>
                )}
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[185px]">
                {r.paymentScheduleLabel}
              </div>
            </div>
          );
        },
      },
      {
        key: 'partner',
        header: 'KOC / CTV & Ngân hàng',
        width: 195,
        render: r => {
          const allowFull = revealPii && canRevealPii;
          const displayBank = allowFull ? r.bankAccount || '—' : maskSensitivePii(r.bankAccount);
          const displayHandle = formatPartnerHandle(r.partnerHandle, allowFull);
          return (
            <div className="space-y-1 leading-snug">
              <div className="font-medium text-ink text-xs truncate max-w-[185px]">
                {r.partnerName}{' '}
                <span className="font-normal text-ink-3 font-mono">({displayHandle})</span>
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[185px]">
                {r.bankName ? `${r.bankName} · ${displayBank}` : 'Chưa có STK ngân hàng'}
              </div>
            </div>
          );
        },
      },
      {
        key: 'acceptance',
        header: 'Nghiệm thu & Hồ sơ',
        width: 210,
        render: r => (
          <div className="space-y-1 leading-snug" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Status tone={r.isAcceptedTech ? 'positive' : 'warning'}>
                {r.isAcceptedTech ? 'Đã nghiệm thu' : 'Chờ link air'}
              </Status>
              {r.airLink && (
                <a
                  href={r.airLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-2xs font-medium text-accent hover:underline"
                >
                  Bài đăng <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div
              className="text-2xs text-ink-3 truncate max-w-[200px]"
              title={`${r.contractSummary} · ${r.bbntSummary}`}
            >
              {r.contractSummary} · {r.bbntSummary}
            </div>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Thực chuyển Net',
        width: 150,
        align: 'right',
        render: r => (
          <div className="space-y-1 leading-snug text-right tabular-nums">
            <div className="text-xs font-semibold text-ink">{formatVnd(r.netTransferAmount)}</div>
            <div className="text-2xs text-ink-3">
              {r.advancePaidAmount > 0
                ? `Đã trừ TU: ${formatVnd(r.advancePaidAmount)}`
                : `Gross: ${formatVnd(r.grossAmount)}`}
            </div>
          </div>
        ),
      },
      {
        key: 'larkState',
        header: 'Trạng thái Lark',
        width: 200,
        render: r => (
          <div className="space-y-1 leading-snug">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Status tone={r.paymentStateTone}>{r.paymentStateLabel}</Status>
              {r.lark32Synced && <Status tone="info">3.2</Status>}
            </div>
            {r.settlementSlip ? (
              <div className="text-2xs font-mono text-ink-3 truncate max-w-[190px]">
                {r.settlementSlip.slipCode}
              </div>
            ) : r.advanceSlip ? (
              <div className="text-2xs font-mono text-ink-3 truncate max-w-[190px]">
                TU: {r.advanceSlip.slipCode}
              </div>
            ) : r.blockingIssues.length > 0 ? (
              <div
                className="text-2xs text-critical truncate max-w-[190px]"
                title={r.blockingIssues.join(' | ')}
              >
                {r.blockingIssues[0]}
              </div>
            ) : (
              <div className="text-2xs text-positive">Đủ hồ sơ lập phiếu</div>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        width: 215,
        align: 'right',
        render: r => {
          const activeSettlementSlip =
            r.settlementSlip && r.settlementSlip.larkSync.approvalStatus !== 'REJECTED'
              ? r.settlementSlip
              : undefined;
          const isRejectedSettlement =
            r.settlementSlip && r.settlementSlip.larkSync.approvalStatus === 'REJECTED';
          return (
            <div
              className="flex items-center justify-end gap-1.5 flex-wrap"
              onClick={e => e.stopPropagation()}
            >
              {activeSettlementSlip ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDetailSlip(activeSettlementSlip)}
                >
                  Xem phiếu
                </Button>
              ) : (
                <>
                  {r.hasAdvanceOption && !r.advanceSlip && r.paymentState !== 'PAID_DONE' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyKey !== null}
                      onClick={() => void handleOpenCreateSlipForItems([r], 'ADVANCE')}
                    >
                      Tạm ứng
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      busyKey !== null ||
                      (r.subsystem === 'SELF_CHANNEL_CTV' && !r.canPushLarkSlip)
                    }
                    onClick={() => void handleOpenCreateSlipForItems([r], 'SETTLEMENT')}
                  >
                    {busyKey === `self-${r.id}`
                      ? 'Đang đẩy…'
                      : isRejectedSettlement
                      ? 'Lập lại ĐNTT'
                      : 'Đẩy ĐNTT'}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleNavigateToBookingDetail(r)}
              >
                Mở deal
              </Button>
            </div>
          );
        },
      },
    ],
    [
      allCurrentPageSelected,
      paginatedQueueRows,
      selectedQueueIdSet,
      revealPii,
      canRevealPii,
      busyKey,
      handleOpenCreateSlipForItems,
      handleNavigateToBookingDetail,
    ]
  );

  const slipColumns = useMemo<Column<LarkPaymentRequestSlip>[]>(
    () => [
      {
        key: 'slipCode',
        header: 'Mã phiếu & Luồng Lark',
        width: 210,
        render: s => {
          const sub = inferSlipSubsystem(s);
          const subBadge = SUBSYSTEM_BADGE_META[sub];
          return (
            <div className="space-y-1 leading-snug">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-semibold text-ink">{s.slipCode}</span>
                <Status tone={s.requestType === 'ADVANCE' ? 'warning' : 'info'}>
                  {s.requestType === 'ADVANCE' ? 'Tạm ứng' : 'Thanh toán'}
                </Status>
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[200px]">
                {subBadge.label} · {s.larkSync.approvalInstanceCode}
              </div>
            </div>
          );
        },
      },
      {
        key: 'deals',
        header: 'Mã BO / Việc & Dịch vụ',
        width: 220,
        render: s => {
          const codes = (s.lineItems || []).map(l => l.dealCode).join(', ');
          const storesText = Array.from(new Set((s.lineItems || []).map(l => l.storeName))).join(
            ', '
          );
          const linkedItems = (s.lineItems || [])
            .map(l => unifiedByCodeMap.get((l.dealCode || '').trim().toUpperCase()))
            .filter((x): x is UnifiedAcceptancePaymentItem => Boolean(x));
          const slipTags = Array.from(new Set(linkedItems.flatMap(x => x.serviceTags))).slice(0, 2);
          return (
            <div className="space-y-1 leading-snug">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-mono text-xs font-medium text-ink truncate max-w-[130px]"
                  title={codes}
                >
                  {codes || '—'}
                </span>
                {slipTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded border border-line bg-sunken px-1.5 py-0.5 text-2xs font-medium text-ink-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-2xs text-ink-3 truncate max-w-[210px]" title={storesText}>
                {storesText} · {s.month}
              </div>
            </div>
          );
        },
      },
      {
        key: 'payee',
        header: 'Người thụ hưởng',
        width: 195,
        render: s => {
          const allowFull = revealPii && canRevealPii;
          const maskedAcc = allowFull
            ? s.payee.bankAccount
            : maskSensitivePii(s.payee.bankAccount);
          return (
            <div className="space-y-1 leading-snug">
              <div className="text-xs font-medium text-ink truncate max-w-[185px]">
                {s.payee.kocStageName}
              </div>
              <div className="text-2xs text-ink-3 font-mono truncate max-w-[185px]">
                {s.payee.bankName} · {maskedAcc}
              </div>
            </div>
          );
        },
      },
      {
        key: 'amounts',
        header: 'Thực chuyển Net',
        width: 155,
        align: 'right',
        render: s => (
          <div className="space-y-1 leading-snug text-right tabular-nums">
            <div className="text-xs font-semibold text-ink">
              {formatVnd(s.totals.netTransferTotal)}
            </div>
            <div className="text-2xs text-ink-3">Gross: {formatVnd(s.totals.grossTotal)}</div>
          </div>
        ),
      },
      {
        key: 'approval',
        header: 'Tuyến duyệt & Trạng thái',
        width: 225,
        render: s => {
          const meta = APPROVAL_STATUS_META[s.larkSync.approvalStatus];
          return (
            <div className="space-y-1 leading-snug">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Status tone={meta.tone}>{meta.label}</Status>
                {s.larkSync.uncBillCode && (
                  <span className="font-mono text-2xs text-positive font-medium">
                    {s.larkSync.uncBillCode}
                  </span>
                )}
              </div>
              <div
                className="text-2xs text-ink-3 truncate max-w-[215px]"
                title={s.larkSync.rejectedReason || s.approvalRoute.routeSummary}
              >
                {s.larkSync.rejectedReason
                  ? `Từ chối: ${s.larkSync.rejectedReason}`
                  : s.approvalRoute.routeSummary}
              </div>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Xử lý luồng Lark',
        width: 240,
        align: 'right',
        render: s => {
          const st = s.larkSync.approvalStatus;
          const isClosed = st === 'PAID' || st === 'REJECTED';
          const canAct = canUserActOnSlipStep(s, currentRole, currentUser, currentUserName);
          const nextBtnLabel =
            st === 'PENDING_LEADER'
              ? 'Leader duyệt'
              : st === 'PENDING_DIRECTOR'
              ? 'GĐ MKT duyệt'
              : st === 'PENDING_FINANCE'
              ? 'Kế toán duyệt'
              : st === 'APPROVED'
              ? 'Xác nhận UNC'
              : '';

          return (
            <div
              className="flex items-center justify-end gap-1.5 flex-wrap"
              onClick={e => e.stopPropagation()}
            >
              {!isClosed && nextBtnLabel && canAct && st !== 'APPROVED' && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyKey !== null}
                  onClick={() => void handleAdvanceOrRejectSlip(s, 'ADVANCE_STEP')}
                >
                  {busyKey === `act-${s.id}` ? 'Đang xử lý…' : nextBtnLabel}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busyKey !== null}
                onClick={() => void handleSyncSlipStatusFromLark([s])}
              >
                Đồng bộ
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDetailSlip(s)}>
                {st === 'APPROVED' && canAct ? 'Xác nhận UNC' : 'Chi tiết'}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      unifiedByCodeMap,
      revealPii,
      canRevealPii,
      currentRole,
      currentUser,
      currentUserName,
      busyKey,
      handleAdvanceOrRejectSlip,
      handleSyncSlipStatusFromLark,
    ]
  );

  return (
    <div className="space-y-4">
      <PageActions>
        {canRevealPii && (
          <Button
            size="sm"
            variant="ghost"
            icon={revealPii ? EyeOff : Eye}
            onClick={() => setRevealPii(v => !v)}
          >
            {revealPii ? 'Ẩn CCCD/STK' : 'Hiện CCCD/STK'}
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          disabled={loading || busyKey !== null}
          onClick={() => void reloadAllSources()}
        >
          Làm mới
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={RefreshCw}
          disabled={busyKey !== null || slips.length === 0}
          onClick={() =>
            void handleSyncSlipStatusFromLark(
              slips.filter(
                s =>
                  s.larkSync.approvalStatus !== 'PAID' &&
                  s.larkSync.approvalStatus !== 'REJECTED'
              )
            )
          }
        >
          Đồng bộ Lark ({kpiStats.activeSlipsCount})
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={Send}
          onClick={() =>
            setLarkModalState({
              open: true,
              initialDeals: [],
              requestType: 'SETTLEMENT',
            })
          }
        >
          Lập phiếu chi
        </Button>
      </PageActions>

      <StatRow>
        <Stat
          label="Đủ điều kiện chờ đẩy ĐNTT"
          value={`${kpiStats.readyCount} hạng mục`}
          note={`Thực chuyển: ${formatVnd(kpiStats.readyNet)}`}
          tone={kpiStats.readyCount > 0 ? 'warning' : undefined}
        />
        <Stat
          label="Phiếu đang trình duyệt trên Lark"
          value={`${kpiStats.activeSlipsCount} phiếu`}
          note={`Đang trình: ${formatVnd(kpiStats.activeSlipsNet)}`}
        />
        <Stat
          label="Đã giải ngân (Đi tiền UNC)"
          value={`${kpiStats.paidSlipsCount} phiếu`}
          note={`Đã chi: ${formatVnd(kpiStats.paidSlipsNet)}`}
          tone="positive"
        />
        <Stat
          label="Thiếu hồ sơ / Lark từ chối"
          value={`${kpiStats.blockedCount + kpiStats.rejectedSlipsCount} cảnh báo`}
          note={`${kpiStats.blockedCount} thiếu chứng từ · ${kpiStats.rejectedSlipsCount} phiếu từ chối`}
          tone={kpiStats.blockedCount + kpiStats.rejectedSlipsCount > 0 ? 'critical' : undefined}
        />
      </StatRow>

      <Tabs
        value={mainTab}
        onChange={v => {
          setMainTab(v);
          setQueuePage(1);
          setSlipPage(1);
        }}
        items={[
          {
            key: 'UNIFIED_QUEUE',
            label: 'Sổ nghiệm thu & đẩy ĐNTT',
            count: baseFilteredQueue.length,
          },
          {
            key: 'LARK_SLIPS',
            label: 'Phiếu ĐNTT & luồng duyệt Lark',
            count: baseFilteredSlips.length,
            tone: kpiStats.rejectedSlipsCount > 0 ? 'critical' : 'default',
          },
          {
            key: 'FINANCE_RECON',
            label: 'Khóa sổ S40 & đối soát nhãn hàng',
          },
        ]}
        actions={
          larkConfig ? (
            <div className="flex items-center gap-2 text-2xs text-ink-3">
              <Status tone={larkConfig.hasLiveApprovalDef ? 'positive' : 'info'}>
                {larkConfig.hasLiveApprovalDef ? 'Lark Approval Live' : 'Lark Sandbox'}
              </Status>
              <span className="font-mono">
                Base: {larkConfig.appToken.slice(0, 12)}… · Table: {larkConfig.paymentTableId}
              </span>
            </div>
          ) : null
        }
      />

      {mainTab !== 'FINANCE_RECON' && (
        <Panel flush>
          <div className="p-4 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-ink-2">Hình thức chi:</span>
                <Segmented<PaymentModeFilterKey>
                  value={paymentModeFilter}
                  onChange={v => {
                    setPaymentModeFilter(v);
                    setSelectedQueueIds([]);
                    setQueuePage(1);
                    setSlipPage(1);
                  }}
                  items={[
                    { key: 'ALL', label: 'Tất cả' },
                    { key: 'SETTLEMENT', label: 'Thanh toán / ĐNTT' },
                    { key: 'ADVANCE', label: 'Tạm ứng' },
                    { key: 'ADVANCE_PENDING', label: 'Chờ duyệt tạm ứng' },
                    { key: 'SETTLEMENT_WITH_ADVANCE', label: 'Tất toán sau tạm ứng' },
                  ]}
                />
              </div>

              {(subsystemFilter !== 'ALL' ||
                bookingServiceFilter !== 'ALL' ||
                paymentModeFilter !== 'ALL' ||
                monthFilter !== 'ALL' ||
                storeFilter !== 'ALL') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSubsystemFilter('ALL');
                    setBookingServiceFilter('ALL');
                    setPaymentModeFilter('ALL');
                    setMonthFilter('ALL');
                    setStoreFilter('ALL');
                    setQueueFilter('ALL');
                    setSlipFilter('ALL');
                    setSelectedQueueIds([]);
                    setQueuePage(1);
                    setSlipPage(1);
                  }}
                >
                  Đặt lại
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={subsystemFilter}
                onChange={e => {
                  setSubsystemFilter(e.target.value as BookingSourceSubsystem);
                  setSelectedQueueIds([]);
                  setQueuePage(1);
                  setSlipPage(1);
                }}
                className="w-56"
              >
                <option value="ALL">Tất cả phân hệ</option>
                <option value="TIKTOK_KOC_32">Booking TikTok</option>
                <option value="MULTI_PLATFORM">Booking đa sàn</option>
                <option value="SELF_CHANNEL_CTV">Video Self-channel &amp; CTV</option>
                <option value="LIVESTREAM_DEAL">Livestream Affiliate</option>
              </Select>

              <Select
                value={bookingServiceFilter}
                onChange={e => {
                  setBookingServiceFilter(e.target.value as BookingServiceFilterKey);
                  setSelectedQueueIds([]);
                  setQueuePage(1);
                  setSlipPage(1);
                }}
                className="w-64"
              >
                {BOOKING_SERVICE_FILTER_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Select
                value={monthFilter}
                onChange={e => {
                  setMonthFilter(e.target.value);
                  setSelectedQueueIds([]);
                  setQueuePage(1);
                  setSlipPage(1);
                }}
                className="w-36"
              >
                <option value="ALL">Tất cả kỳ tháng</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    Kỳ {m}
                  </option>
                ))}
              </Select>

              <Select
                value={storeFilter}
                onChange={e => {
                  setStoreFilter(e.target.value);
                  setSelectedQueueIds([]);
                  setQueuePage(1);
                  setSlipPage(1);
                }}
                className="w-52"
              >
                <option value="ALL">Tất cả gian hàng ({availableStores.length})</option>
                {availableStores.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </div>

            {mainTab === 'UNIFIED_QUEUE' ? (
              <FilterBar
                search={{
                  value: searchQuery,
                  onChange: v => {
                    setSearchQuery(v);
                    setQueuePage(1);
                  },
                  placeholder: 'Tìm mã BO, mã việc, tên KOC/CTV, dịch vụ, gian hàng, mã phiếu Lark...',
                }}
                chips={
                  <Chips
                    items={queueChips}
                    value={queueFilter}
                    onChange={v => {
                      setQueueFilter(v);
                      setQueuePage(1);
                    }}
                  />
                }
                resultCount={searchQuery.trim() ? filteredQueueRows.length : undefined}
              />
            ) : (
              <FilterBar
                search={{
                  value: searchQuery,
                  onChange: v => {
                    setSearchQuery(v);
                    setSlipPage(1);
                  },
                  placeholder: 'Tìm mã phiếu DNTT/TU, mã luồng Lark Approval, mã BO, tên KOC/CTV...',
                }}
                chips={
                  <Chips
                    items={slipChips}
                    value={slipFilter}
                    onChange={v => {
                      setSlipFilter(v);
                      setSlipPage(1);
                    }}
                  />
                }
                resultCount={searchQuery.trim() ? filteredSlips.length : undefined}
              />
            )}

            {mainTab === 'UNIFIED_QUEUE' && selectedQueueItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-3 py-2">
                <div className="text-xs font-medium text-ink">
                  Đã chọn {selectedQueueItems.length} hạng mục · Tổng thực chuyển:{' '}
                  <span className="font-semibold tabular-nums">
                    {formatVnd(selectedQueueItems.reduce((s, i) => s + i.netTransferAmount, 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyKey !== null}
                    onClick={() => void handleSyncLark32(selectedQueueItems)}
                  >
                    Đồng bộ Bảng 3.2 ({selectedQueueItems.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyKey !== null}
                    onClick={() =>
                      void handleOpenCreateSlipForItems(selectedQueueItems, 'ADVANCE')
                    }
                  >
                    Lập phiếu tạm ứng ({selectedQueueItems.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busyKey !== null}
                    onClick={() =>
                      void handleOpenCreateSlipForItems(selectedQueueItems, 'SETTLEMENT')
                    }
                  >
                    Lập phiếu ĐNTT ({selectedQueueItems.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedQueueIds([])}
                  >
                    Bỏ chọn
                  </Button>
                </div>
              </div>
            )}
          </div>

          {mainTab === 'UNIFIED_QUEUE' ? (
            <>
              <DataTable
                columns={queueColumns}
                rows={paginatedQueueRows}
                rowKey={r => r.id}
                onRowClick={r => handleNavigateToBookingDetail(r)}
                empty={
                  <EmptyState
                    title="Không có hạng mục nghiệm thu hoặc ĐNTT khớp bộ lọc"
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSubsystemFilter('ALL');
                          setBookingServiceFilter('ALL');
                          setPaymentModeFilter('ALL');
                          setQueueFilter('ALL');
                          setMonthFilter('ALL');
                          setStoreFilter('ALL');
                          setSearchQuery('');
                          setSelectedQueueIds([]);
                          setQueuePage(1);
                          setSlipPage(1);
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    }
                  />
                }
              />
              <Pagination
                page={queuePage}
                pageSize={pageSize}
                total={filteredQueueRows.length}
                onPageChange={setQueuePage}
              />
            </>
          ) : (
            <>
              <DataTable
                columns={slipColumns}
                rows={filteredSlips.slice(
                  (slipPage - 1) * pageSize,
                  slipPage * pageSize
                )}
                rowKey={s => s.id}
                onRowClick={s => setDetailSlip(s)}
                empty={
                  <EmptyState
                    title="Chưa có phiếu ĐNTT hoặc Tạm ứng nào khớp bộ lọc"
                    action={
                      <Button
                        variant="primary"
                        icon={Send}
                        onClick={() =>
                          setLarkModalState({
                            open: true,
                            initialDeals: [],
                            requestType: 'SETTLEMENT',
                          })
                        }
                      >
                        Lập phiếu chi
                      </Button>
                    }
                  />
                }
              />
              <Pagination
                page={slipPage}
                pageSize={pageSize}
                total={filteredSlips.length}
                onPageChange={setSlipPage}
              />
            </>
          )}
        </Panel>
      )}

      {mainTab === 'FINANCE_RECON' && (
        <FinanceAdvancePaymentReportView
          deals={allModalDeals}
          kocs={kocs}
          contractRecords={contractRecords}
          isFinanceActor={
            Boolean(currentRole && ['ADMIN', 'MANAGER', 'FINANCE'].includes(currentRole)) ||
            Boolean(currentUser?.permissions?.includes('canApprovePayment'))
          }
          initialSubTab="DEAL_LEDGER"
          onNotify={onNotify}
        />
      )}

      {/* Modal tạo & đẩy phiếu ĐNTT / Tạm ứng sang Lark */}
      <LarkPaymentRequestModal
        open={larkModalState.open}
        onClose={() => setLarkModalState(prev => ({ ...prev, open: false }))}
        initialDeal={larkModalState.initialDeals[0] || null}
        initialDeals={larkModalState.initialDeals}
        initialRequestType={larkModalState.requestType}
        allDeals={allModalDeals}
        kocs={kocs}
        currentUserName={currentUserName}
        currentRole={currentRole}
        onSuccessUpdateDeals={(updatedDeals, createdSlip) => {
          if (onCreateOrUpdateDeals && updatedDeals.length > 0) {
            onCreateOrUpdateDeals(updatedDeals);
          }
          const codesInSlip = new Set(
            (createdSlip.lineItems || []).map(l => l.dealCode.trim().toUpperCase())
          );
          const isPaid = Boolean(
            createdSlip.larkSync.daDiTien || createdSlip.larkSync.approvalStatus === 'PAID'
          );
          setMultiPlatformItems(prev => {
            let changed = false;
            const next = prev.map(mp => {
              const code = (mp.boCode || `MP-DEAL-${mp.id}`).trim().toUpperCase();
              if (!codesInSlip.has(code)) return mp;
              changed = true;
              return {
                ...mp,
                paymentStatus: (isPaid
                  ? 'Đã thanh toán'
                  : 'Đã lập ĐNTT') as MultiPlatformListingItem['paymentStatus'],
                stage: (isPaid ? 'PAID' : 'PAYMENT_READY') as MultiPlatformListingItem['stage'],
                updatedAt: new Date().toISOString(),
              };
            });
            if (changed) saveMultiPlatformListingItems(next);
            return next;
          });
          setSelectedQueueIds([]);
          void reloadAllSources();
          onNotify?.(
            `Đã đẩy phiếu ${createdSlip.slipCode} (${createdSlip.larkSync.approvalInstanceCode}) lên Lark Approval & Larkbase.`,
            'success'
          );
        }}
      />

      {/* Modal xem chi tiết Phiếu ĐNTT / Tạm ứng Lark & Mã VietQR */}
      <Modal
        open={Boolean(detailSlip)}
        onClose={() => setDetailSlip(null)}
        title={
          detailSlip
            ? `Chi tiết Phiếu ${detailSlip.slipCode} · Luồng Lark ${detailSlip.larkSync.approvalInstanceCode}`
            : 'Chi tiết phiếu Lark'
        }
        size="lg"
        footer={
          detailSlip && (
            <div className="flex items-center justify-between w-full gap-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                disabled={busyKey !== null}
                onClick={() => void handleSyncSlipStatusFromLark([detailSlip])}
              >
                Làm mới trạng thái
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setDetailSlip(null)}>
                  Đóng
                </Button>
                {detailSlip.larkSync.approvalStatus !== 'PAID' &&
                  detailSlip.larkSync.approvalStatus !== 'REJECTED' &&
                  canUserActOnSlipStep(detailSlip, currentRole, currentUser, currentUserName) && (
                    <Button
                      variant="primary"
                      disabled={busyKey !== null}
                      onClick={() =>
                        void handleAdvanceOrRejectSlip(detailSlip, 'ADVANCE_STEP', {
                          uncBillCode: uncInputs[detailSlip.id]?.trim() || undefined,
                        })
                      }
                    >
                      {detailSlip.larkSync.approvalStatus === 'APPROVED'
                        ? 'Xác nhận UNC'
                        : 'Duyệt bước tiếp'}
                    </Button>
                  )}
              </div>
            </div>
          )
        }
      >
        {detailSlip && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-line bg-sunken p-3 space-y-1.5">
                <div className="font-semibold text-ink">Thông tin Luồng Lark Approval &amp; Larkbase</div>
                <div>Mã phiếu nội bộ: <span className="font-mono font-semibold">{detailSlip.slipCode}</span> ({detailSlip.requestTypeLabel})</div>
                <div>Mã luồng Lark Approval: <span className="font-mono font-semibold">{detailSlip.larkSync.approvalInstanceCode}</span></div>
                <div>Bản ghi Larkbase 3.2: <span className="font-mono">{detailSlip.larkSync.larkbaseRecordId || '—'}</span></div>
                <div>Tuyến phê duyệt: <span>{detailSlip.approvalRoute.routeSummary}</span></div>
                <div className="flex items-center gap-2 pt-1">
                  <span>Trạng thái hiện tại:</span>
                  <Status tone={APPROVAL_STATUS_META[detailSlip.larkSync.approvalStatus].tone}>
                    {APPROVAL_STATUS_META[detailSlip.larkSync.approvalStatus].label}
                  </Status>
                </div>
                {detailSlip.larkSync.uncBillCode && (
                  <div>Mã chứng từ UNC: <span className="font-mono font-semibold text-positive">{detailSlip.larkSync.uncBillCode}</span></div>
                )}
              </div>

              <div className="rounded-lg border border-line bg-sunken p-3 space-y-1.5">
                <div className="font-semibold text-ink">Thông tin Thụ hưởng &amp; Tổng tiền</div>
                <div>Thụ hưởng: <span className="font-medium">{detailSlip.payee.kocStageName}</span> ({detailSlip.payee.subjectLabel})</div>
                <div>CCCD / MST: <span className="font-mono">{revealPii && canRevealPii ? detailSlip.payee.legalId || '—' : maskSensitivePii(detailSlip.payee.legalId)}</span></div>
                <div>Chủ tài khoản: <span className="font-mono font-semibold">{detailSlip.payee.bankHolder}</span></div>
                <div>Ngân hàng: <span className="font-mono">{detailSlip.payee.bankName} · {revealPii && canRevealPii ? detailSlip.payee.bankAccount : maskSensitivePii(detailSlip.payee.bankAccount)}</span></div>
                <div>Tổng Gross: <span className="font-mono">{formatVnd(detailSlip.totals.grossTotal)}</span> · Thuế: <span className="font-mono">{formatVnd(detailSlip.totals.pitTax10PctTotal + detailSlip.totals.vatTotal)}</span></div>
                <div>Thực chuyển Net: <span className="font-mono font-semibold text-ink">{formatVnd(detailSlip.totals.netTransferTotal)}</span> ({detailSlip.totals.amountInWords})</div>
                {detailSlip.payee.vietQrUrl && (
                  <div className="pt-1">
                    {revealPii && canRevealPii ? (
                      <a
                        href={detailSlip.payee.vietQrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent font-medium hover:underline"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Mở ảnh mã QR chuyển khoản VietQR
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink-3">
                        <QrCode className="w-3.5 h-3.5" /> Bật &quot;Hiện CCCD/STK&quot; để mở mã QR chuyển khoản
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-line overflow-hidden">
              <div className="bg-sunken px-3 py-2 font-semibold text-ink border-b border-line">
                Danh sách mã BO / Việc trong phiếu ({detailSlip.lineItems.length})
              </div>
              <div className="divide-y divide-line">
                {detailSlip.lineItems.map(li => {
                  const linkedItem = unifiedByCodeMap.get((li.dealCode || '').trim().toUpperCase());
                  return (
                    <div key={`${li.dealCode}-${li.jobId || ''}`} className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-mono font-semibold text-ink">
                          {li.dealCode} {li.jobId ? `· ${li.jobId}` : ''} · {li.brandName} ({li.storeName})
                        </div>
                        <div className="text-2xs text-ink-3">
                          Sản phẩm: {li.productName} · PIC: {li.bookingPic}
                          {li.linkAir ? ` · Air: ${li.postedDate ? formatDate(li.postedDate) : '—'}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right tabular-nums">
                          <div className="font-mono font-semibold text-ink">{formatVnd(li.netTransferAmount)}</div>
                          <div className="text-2xs text-ink-3">Gross: {formatVnd(li.grossContractAmount)}</div>
                        </div>
                        {linkedItem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDetailSlip(null);
                              handleNavigateToBookingDetail(linkedItem);
                            }}
                          >
                            Mở deal
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hộp thoại xác nhận từ chối / thu hồi phiếu trên Lark Approval */}
      <ConfirmDialog
        open={Boolean(rejectSlipTarget)}
        title={rejectSlipTarget ? `Từ chối / Thu hồi phiếu ${rejectSlipTarget.slipCode}` : 'Từ chối phiếu'}
        description={
          <div className="space-y-3">
            <p className="text-xs text-ink-2">
              Khi từ chối phiếu, trạng thái sẽ tự động đồng bộ ngược về phân hệ Booking gốc để mở khóa cho chuyên viên sửa lại hồ sơ và lập phiếu mới.
            </p>
            <Field label="Lý do từ chối / yêu cầu bổ sung">
              <Input
                value={rejectReasonInput}
                onChange={e => setRejectReasonInput(e.target.value)}
                placeholder="Nhập lý do từ chối..."
              />
            </Field>
          </div>
        }
        confirmLabel="Xác nhận từ chối"
        tone="critical"
        onCancel={() => setRejectSlipTarget(null)}
        onConfirm={() => {
          if (!rejectSlipTarget) return;
          void handleAdvanceOrRejectSlip(rejectSlipTarget, 'REJECT_SLIP', {
            rejectedReason: rejectReasonInput.trim() || 'Cần bổ sung chứng từ nghiệm thu',
          });
        }}
      />
    </div>
  );
};
